/**
 * Inventory Adjustment RESTlet — item-scoped serial prefetch, auto-create, per-SKU batching
 *
 * Fixes:
 *  - Prefetch of serials is now scoped by ITEM to avoid false matches across items.
 *  - Update-only (e.g., audit 401) will auto-create missing serial for the *same item*.
 *  - Response rows include the final serial text so you can search it directly.
 *  - Chunked searches and per-SKU batching preserved.
 *
 * @NApiVersion 2.1
 * @NScriptType Restlet
 * @NModuleScope SameAccount
 */

define([
  "/SuiteScripts/ANC_lib.js",
  "N/record",
  "N/search",
  "N/log",
  "N/runtime",
  "N/error",
], (ANC_lib, record, search, log, runtime, error) => {
  // --------------------- CONFIG ---------------------
  const SUBSIDIARY_ID = 5; // Alberta Newsprint Sales
  const ADJUSTMENT_ACCOUNT_ID = 2175; // Must belong to subsidiary 5
  const DEFAULT_LOCATION_ID = null; // Optional fallback when no shipper
  const KG_PER_FMT = 1000;

  // governance-friendly chunk sizes
  const CHUNK_SKU = 400; // max OR terms per item search
  const CHUNK_SERIAL = 250; // max OR terms per inventorynumber search (paired with item anyof)
  const CHUNK_ITEM = 250; // max items per inventorynumber search
  const MAX_LINES_PER_ADJ = 450; // safety split for very large receipts/issues

  const QUALITY_MAP = {
    PRIME: 1,
    SALE: 1,
    "OFF GRADE": 2,
    CULL: 2,
    HELD: 4,
    BEAT: 3,
    null: 1,
  };

  // inventorynumber custom fields
  const FIELDS = {
    quality: "custitemnumber_010_lotnum_quality",
    grade: "custitemnumber_anc_grade",
    width: "custitemnumber_anc_width",
    diameter: "custitemnumber_anc_diameter",
    fmt: "custitemnumber_anc_fmt",
    reservedCustomer: "custitemnumber_anc_reservedforcustomer",
    core: "custitemnumber_roll_core",
    rollStatus: "custitemnumber_roll_status",
    memo: "memo",
    rollBundle: "custitemnumber_rollbundle",
    salesOrder: "custitemnumber_salesorder",
    salesOrderLine: "custitemnumber_salesorderline",
    latestAuditText: "custitemnumber_latestauditactivity",
    loadNumber: "custitemnumber_loadnumber",
    loadStatus: "custitemnumber_loadstatus",
    dateProduced: "custitemnumber_dateproduced",
    dateWrapped: "custitemnumber_datewrapped",
    latestActivityDate: "custitemnumber_latest_activity_date",
    rollIdField: "custitemnumber_rollid",
    downgradeReason: "custitemnumber_downgradereason",
    rewrapCount: "custitemnumber_rewrapcount",
    basisWeight: "custitemnumber_basisweight",
    length: "custitemnumber_length",
    density: "custitemnumber_density",
  };

  // --------------------- ENTRY ---------------------
  function post(request) {
    let body = request;
    if (typeof body === "string") body = JSON.parse(body);
    if (!Array.isArray(body)) body = [body];

    // integration log lifecycle
    let integrationLogId = null;
    try {
      integrationLogId = ANC_lib.submitIntegrationLog(integrationLogId, {
        request: JSON.stringify(body),
      });
    } catch (e) {}

    const greeting = `Hello, you connected to ANC NETSUITE ${runtime.accountId} : ${runtime.envType} : INVENTORY ADJUSTMENT`;

    try {
      // ── 0) Normalize + dedupe incoming rows by final serial text (per SKU)
      const rows = normalizeRows(body);

      // ── 1) Prefetch items (by SKU) → itemId map
      const skuToItemId = prefetchItems(Object.keys(rows.bySku));
      const itemIds = Object.values(skuToItemId).filter(Boolean);

      // ── 2) Prefetch serials scoped by item → (itemId|serial) → invNumId
      const allSerials = Object.keys(rows.bySerial);
      let invMap = prefetchSerialsByItem(itemIds, allSerials);

      // ── 3) Group by SKU for batching
      const batchesBySku = {};
      for (const serial in rows.bySerial) {
        const r = rows.bySerial[serial];
        const sku = r.sku;
        const itemId = skuToItemId[sku];
        if (!itemId) {
          r.result = fail(r, `Item not found (itemid = ${sku})`);
          continue;
        }
        const locationId = toInt(r.locationId) || DEFAULT_LOCATION_ID;
        if (!locationId) {
          r.result = fail(r, "Location internal ID missing");
          continue;
        }
        const locSubId = getLocationSubsidiary(locationId);
        if (locSubId && +locSubId !== SUBSIDIARY_ID) {
          r.result = fail(
            r,
            `Location subsidiary mismatch. Location ${locationId} is in sub ${locSubId}, expected ${SUBSIDIARY_ID}`
          );
          continue;
        }

        const existsInvId = invMap[invKey(itemId, serial)] || null;
        const qualityId = resolveQuality(r.quality);
        const weightFmt = kgToFmt(r.grossKg);
        const memoText = r.memoText;
        const customerId = toInt(r.customerId);
        if (!customerId) {
          r.result = fail(r, "Customer internal ID missing");
          continue;
        }

        // decide action
        let action = null; // 'increase' | 'decrease' | 'update-only'
        if (r.auditCode === 300 || r.auditCode === 320 || r.auditCode === 330)
          action = "increase";
        else if (r.auditCode === 800 || r.auditCode === 810)
          action = "decrease";
        else action = "update-only";

        const needCreateFirst =
          !existsInvId && (action === "decrease" || action === "update-only");

        const bucket = (batchesBySku[sku] ||= {
          itemId,
          locationId,
          increases: [],
          decreases: [],
          updates: [],
          createdSerials: new Set(),
        });

        if (needCreateFirst) {
          bucket.increases.push({
            serial,
            qty: 1,
            memo: `Auto-create for missing serial prior to ${r.auditCode}`,
            context: r,
          });
        }

        if (action === "increase") {
          bucket.increases.push({
            serial,
            qty: 1,
            memo: `Adj (+1) ${labelForAudit(r.auditCode)} | ${memoText}`,
            context: r,
          });
        } else if (action === "decrease") {
          bucket.decreases.push({
            serial,
            qty: -1,
            memo: `Adj (-1) ${labelForAudit(r.auditCode)} | ${memoText}`,
            context: r,
          });
        }

        // Always stage an update of custom fields
        bucket.updates.push({
          serial,
          context: r,
          updates: buildInvUpdates(
            r,
            customerId,
            qualityId,
            weightFmt,
            memoText
          ),
        });
      }

      // ── 4) Execute per-SKU adjustments with line splitting
      const rowResults = [];

      for (const sku in batchesBySku) {
        const b = batchesBySku[sku];
        const itemId = b.itemId;
        const locationId = b.locationId;

        // Receipts first (create missing + any 300/320/330)
        let incLines = dedupeBySerial(b.increases);
        while (incLines.length) {
          const chunk = incLines.splice(0, MAX_LINES_PER_ADJ);
          if (chunk.length) {
            const adjId = createInventoryAdjustmentMulti({
              itemId,
              locationId,
              receiptLines: chunk,
              issueLines: [],
            });
            // After save, refresh only the serials we just receipted for this item
            const createdSerials = chunk.map((c) => c.serial);
            const add = prefetchSerialsByItem([itemId], createdSerials);
            Object.assign(invMap, add);
          }
        }

        // Issues next (now we have invIds)
        let decLines = dedupeBySerial(b.decreases).map((d) => ({
          ...d,
          invId: invMap[invKey(itemId, d.serial)] || null,
        }));
        decLines = decLines.filter((d) => d.invId);
        while (decLines.length) {
          const chunk = decLines.splice(0, MAX_LINES_PER_ADJ);
          if (chunk.length)
            createInventoryAdjustmentMulti({
              itemId,
              locationId,
              receiptLines: [],
              issueLines: chunk,
            });
        }

        // Submit field updates
        for (const up of dedupeBySerial(b.updates)) {
          const invId = invMap[invKey(itemId, up.serial)];
          if (invId) updateInventoryNumber(invId, up.updates);
          const res = makePublicResult(
            up.context,
            skuToItemId[sku],
            invId,
            null,
            up.context.auditCode,
            up.context.auditDescription,
            "update-only"
          );
          rowResults.push(res);
        }
      }

      const updated = rowResults.filter((r) => r.status === "updated").length;
      const notFound = rowResults.filter(
        (r) => r.status === "not_found"
      ).length;
      const errored = rowResults.filter((r) => r.status === "error").length;

      const api_message = `Processed ${rowResults.length} rows: ${updated} updated, ${notFound} not found, ${errored} errors.`;
      const overallStatus =
        errored > 0 ? (updated > 0 ? "partial" : "error") : "success";

      const resp = {
        success: errored === 0,
        overallStatus,
        message: greeting,
        api_message,
        rows: rowResults,
      };
      try {
        ANC_lib.submitIntegrationLog(integrationLogId, {
          response: JSON.stringify(resp),
        });
      } catch (e) {}
      return resp;
    } catch (e) {
      return throwBadRequest(e, greeting, body);
    }
  }

  // --------------------- PUBLIC RESULT BUILDER ---------------------
  function makePublicResult(
    r,
    itemId,
    serialInternalId,
    adjustmentId,
    auditCode,
    auditDescription,
    action
  ) {
    return {
      rollId: r.rollId,
      finalSerial: r.serial, // this is the inventorynumber text to search
      status: "updated",
      message:
        action === "update-only"
          ? "Update only (no quantity movement for this audit code)"
          : action,
      auditCode,
      auditDescription,
      sku: r.sku,
      itemId: String(itemId || ""),
      customerId: toInt(r.customerId),
      locationId: toInt(r.locationId),
      subsidiaryId: SUBSIDIARY_ID,
      qualityId: resolveQuality(r.quality),
      weightFmt: kgToFmt(r.grossKg),
      serialInternalId: serialInternalId ? String(serialInternalId) : null,
      adjustmentId: adjustmentId || null,
      action,
    };
  }

  // --------------------- BUILD UPDATE FIELDS ---------------------
  function buildInvUpdates(r, customerId, qualityId, fmt, memo) {
    return {
      qualityId,
      grade: r.grade,
      width: r.actualWidth || r.width,
      diameter: r.actualDiameter || r.diameter,
      fmt,
      reservedCustomerId: customerId,
      core: r.core,
      rollStatus: r.processStatus,
      memo,
      rollBundle: r.bundledRollId || "",
      salesOrder: r.millOrderNumber || "",
      salesOrderLine: r.millOrderLineNumber ?? null,
      latestAuditText: r.auditText,
      loadNumber: r.loadNumber || "",
      loadStatus: r.loadMesStatus || "",
      dateProduced: toDateOrNull(r.dateProduced),
      dateWrapped: toDateOrNull(r.dateWrapped),
      latestActivityDate: toDateOrNull(r.dateModified),
      rollIdField: r.rollId, // store the raw roll id
      downgradeReason: r.downgradeReason,
      rewrapCount: r.rewrapCount ?? null,
      basisWeight: r.basisWeightActual || r.basisWeightOrdered,
      length: r.length ?? null,
      density: r.density ?? null,
    };
  }

  // --------------------- MULTI-LINE ADJUSTMENT CREATION ---------------------
  function createInventoryAdjustmentMulti({
    itemId,
    locationId,
    receiptLines = [],
    issueLines = [],
  }) {
    if (
      (!receiptLines || !receiptLines.length) &&
      (!issueLines || !issueLines.length)
    )
      return null;
    const adj = record.create({
      type: record.Type.INVENTORY_ADJUSTMENT,
      isDynamic: true,
    });
    adj.setValue({ fieldId: "subsidiary", value: SUBSIDIARY_ID });
    adj.setValue({ fieldId: "account", value: ADJUSTMENT_ACCOUNT_ID });

    // Receipts
    for (const r of receiptLines) {
      adj.selectNewLine({ sublistId: "inventory" });
      adj.setCurrentSublistValue({
        sublistId: "inventory",
        fieldId: "item",
        value: itemId,
      });
      adj.setCurrentSublistValue({
        sublistId: "inventory",
        fieldId: "location",
        value: locationId,
      });
      adj.setCurrentSublistValue({
        sublistId: "inventory",
        fieldId: "adjustqtyby",
        value: Math.abs(r.qty || 1),
      });
      const invDetail = adj.getCurrentSublistSubrecord({
        sublistId: "inventory",
        fieldId: "inventorydetail",
      });
      invDetail.selectNewLine({ sublistId: "inventoryassignment" });
      invDetail.setCurrentSublistValue({
        sublistId: "inventoryassignment",
        fieldId: "receiptinventorynumber",
        value: r.serial,
      });
      invDetail.setCurrentSublistValue({
        sublistId: "inventoryassignment",
        fieldId: "quantity",
        value: Math.abs(r.qty || 1),
      });
      invDetail.commitLine({ sublistId: "inventoryassignment" });
      adj.commitLine({ sublistId: "inventory" });
    }

    // Issues
    for (const d of issueLines) {
      adj.selectNewLine({ sublistId: "inventory" });
      adj.setCurrentSublistValue({
        sublistId: "inventory",
        fieldId: "item",
        value: itemId,
      });
      adj.setCurrentSublistValue({
        sublistId: "inventory",
        fieldId: "location",
        value: locationId,
      });
      adj.setCurrentSublistValue({
        sublistId: "inventory",
        fieldId: "adjustqtyby",
        value: -Math.abs(d.qty || -1),
      });
      const invDetail = adj.getCurrentSublistSubrecord({
        sublistId: "inventory",
        fieldId: "inventorydetail",
      });
      invDetail.selectNewLine({ sublistId: "inventoryassignment" });
      invDetail.setCurrentSublistValue({
        sublistId: "inventoryassignment",
        fieldId: "issueinventorynumber",
        value: d.invId,
      });
      invDetail.setCurrentSublistValue({
        sublistId: "inventoryassignment",
        fieldId: "quantity",
        value: -Math.abs(d.qty || -1),
      });
      invDetail.commitLine({ sublistId: "inventoryassignment" });
      adj.commitLine({ sublistId: "inventory" });
    }

    return adj.save({ enableSourcing: true, ignoreMandatoryFields: true });
  }

  // --------------------- SINGLE-SEARCH HELPERS (ITEM-SCOPED) ---------------------
  function prefetchItems(skus) {
    const map = {};
    const vals = (skus || []).filter(
      (v) => v != null && String(v).trim() !== ""
    );
    for (let i = 0; i < vals.length; i += CHUNK_SKU) {
      const chunk = vals.slice(i, i + CHUNK_SKU);
      const filters = buildOrFilters("itemid", "is", chunk);
      if (!filters.length) continue;
      const s = search.create({
        type: "inventoryitem",
        filters,
        columns: ["internalid", "itemid"],
      });
      const paged = s.runPaged({ pageSize: 1000 });
      paged.pageRanges.forEach((pr) => {
        const page = paged.fetch(pr);
        page.data.forEach((r) => {
          const id = r.getValue("internalid");
          const sku = r.getValue("itemid");
          if (id && sku) map[String(sku).trim()] = id;
        });
      });
    }
    return map;
  }

  function prefetchSerialsByItem(itemIds, serials) {
    const map = {}; // key: itemId|serial → invNumId
    const items = (itemIds || []).filter(Boolean);
    const ser = (serials || []).filter(
      (v) => v != null && String(v).trim() !== ""
    );
    if (!items.length || !ser.length) return map;

    for (let ii = 0; ii < items.length; ii += CHUNK_ITEM) {
      const itemChunk = items.slice(ii, ii + CHUNK_ITEM);
      // (item anyof chunk) AND (inventorynumber OR-list in sub-chunks to cap OR size)
      for (let si = 0; si < ser.length; si += CHUNK_SERIAL) {
        const serChunk = ser.slice(si, si + CHUNK_SERIAL);
        const itemFilter = [["item", "anyof", itemChunk[0]]];
        for (let i = 1; i < itemChunk.length; i++)
          itemFilter.push("OR", ["item", "anyof", itemChunk[i]]);
        const serialFilter = buildOrFilters("inventorynumber", "is", serChunk);
        const filters = [].concat(itemFilter, ["AND"], serialFilter);

        const s = search.create({
          type: "inventorynumber",
          filters,
          columns: ["internalid", "inventorynumber", "item"],
        });
        const paged = s.runPaged({ pageSize: 1000 });
        paged.pageRanges.forEach((pr) => {
          const page = paged.fetch(pr);
          page.data.forEach((r) => {
            const id = r.getValue("internalid");
            const sn = String(r.getValue("inventorynumber") || "").trim();
            const it = r.getValue("item");
            if (id && sn && it) map[invKey(it, sn)] = id;
          });
        });
      }
    }
    return map;
  }

  function invKey(itemId, serial) {
    return `${itemId}|${String(serial).trim()}`;
  }
  function buildOrFilters(fieldId, operator, values) {
    const vals = (values || []).filter(
      (v) => v != null && String(v).trim() !== ""
    );
    if (!vals.length) return [];
    const arr = [[fieldId, operator, vals[0]]];
    for (let i = 1; i < vals.length; i++)
      arr.push("OR", [fieldId, operator, vals[i]]);
    return arr;
  }
  function dedupeBySerial(list) {
    const out = [],
      seen = new Set();
    for (const x of list || []) {
      const s = String(x.serial);
      if (!seen.has(s)) {
        seen.add(s);
        out.push(x);
      }
    }
    return out;
  }

  // --------------------- UPDATE INVENTORYNUMBER ---------------------
  function updateInventoryNumber(invNumId, data) {
    const values = {};
    ifDefined(values, FIELDS.quality, data.qualityId);
    ifDefined(values, FIELDS.grade, data.grade);
    ifDefined(values, FIELDS.width, data.width);
    ifDefined(values, FIELDS.diameter, data.diameter);
    ifDefined(values, FIELDS.fmt, data.fmt);
    ifDefined(values, FIELDS.reservedCustomer, data.reservedCustomerId);
    ifDefined(values, FIELDS.core, data.core);
    ifDefined(values, FIELDS.rollStatus, data.rollStatus);
    ifDefined(values, FIELDS.memo, data.memo);
    ifDefined(values, FIELDS.rollBundle, data.rollBundle);
    ifDefined(values, FIELDS.salesOrder, data.salesOrder);
    ifDefined(values, FIELDS.salesOrderLine, data.salesOrderLine);
    ifDefined(values, FIELDS.latestAuditText, data.latestAuditText);
    ifDefined(values, FIELDS.loadNumber, data.loadNumber);
    ifDefined(values, FIELDS.loadStatus, data.loadStatus);
    ifDefined(values, FIELDS.dateProduced, data.dateProduced);
    ifDefined(values, FIELDS.dateWrapped, data.dateWrapped);
    ifDefined(values, FIELDS.latestActivityDate, data.latestActivityDate);
    ifDefined(values, FIELDS.rollIdField, data.rollIdField);
    ifDefined(values, FIELDS.downgradeReason, data.downgradeReason);
    ifDefined(values, FIELDS.rewrapCount, data.rewrapCount);
    ifDefined(values, FIELDS.basisWeight, data.basisWeight);
    ifDefined(values, FIELDS.length, data.length);
    ifDefined(values, FIELDS.density, data.density);
    if (!Object.keys(values).length) return;
    record.submitFields({
      type: "inventorynumber",
      id: invNumId,
      values,
      options: { ignoreMandatoryFields: true },
    });
  }

  // --------------------- NORMALIZATION ---------------------
  function normalizeRows(list) {
    const bySku = {};
    const bySerial = {};
    for (const row of list) {
      if (!row) continue;
      const sku = String(row?.product?.sku || "").trim();
      if (!sku) continue;
      const produced = toDateOrNull(row?.dates?.produced);
      const year = produced
        ? produced.getUTCFullYear()
        : toDateOrNull(row?.dateProduced)?.getUTCFullYear() || "";

      const rawSerial = String(row?.rollId || "").trim();
      const serial = formatSerial(rawSerial, year); // no hyphen, append YYYY

      const auditCode = toInt(row.auditCode) || null;
      const auditText = formatAuditText(auditCode, row.auditDescription);
      const qualityTxt = safeUpper(row.qualityStatus);
      const memoText = auditText || row?.lastRollEvent || "no memo";

      const r = {
        sku,
        serial,
        auditCode,
        auditDescription: row.auditDescription,
        auditText,
        qualityTxt,
        quality: row.qualityStatus,
        grossKg: toNum(row?.weights?.gross),
        customerId: toInt(row?.customer?.customerId),
        locationId: toInt(row?.shipper?.shipperId),
        processStatus: row?.processStatus,
        grade: row?.product?.grade,
        width: toNum(row?.product?.width),
        diameter: toNum(row?.product?.diameter),
        actualWidth: toNum(row?.actualDimensions?.width),
        actualDiameter: toNum(row?.actualDimensions?.diameter),
        core: row?.product?.core,
        bundledRollId: row?.bundledRollId || "",
        millOrderNumber: row?.orderLink?.millOrderNumber || "",
        millOrderLineNumber: row?.orderLink?.millOrderLineNumber ?? null,
        loadNumber: row?.loadLink?.loadNumber || "",
        loadMesStatus: row?.loadLink?.loadMesStatus || "",
        dateProduced: row?.dates?.produced,
        dateWrapped: row?.dates?.wrapped,
        dateModified: row?.dates?.modified,
        rollId: row?.rollId || "",
        downgradeReason:
          row?.downgradeReasonDescription || row?.downgradeReasonCode,
        rewrapCount: row?.rewrapCount,
        basisWeightActual: toNum(row?.basisWeight?.actual),
        basisWeightOrdered: toNum(row?.basisWeight?.ordered),
        length: toNum(row?.length),
        density: toNum(row?.density),
        memoText,
      };

      bySku[sku] = true;
      // last occurrence wins for same (SKU, final serial)
      bySerial[serial] = r;
    }
    return { bySku, bySerial };
  }

  function formatSerial(rollId, year) {
    const base = String(rollId || "")
      .replace(/-/g, "")
      .trim();
    const y = year == null ? "" : String(year);
    return base + y;
  }

  // --------------------- HELPERS ---------------------
  function getLocationSubsidiary(locationId) {
    const f = search.lookupFields({
      type: "location",
      id: locationId,
      columns: ["subsidiary"],
    });
    return f && f.subsidiary && f.subsidiary.length
      ? f.subsidiary[0].value
      : null;
  }
  function resolveQuality(val) {
    if (!val) return QUALITY_MAP[null];
    const key = String(val).trim().toUpperCase();
    return QUALITY_MAP[key] || QUALITY_MAP[null];
  }
  function kgToFmt(kg) {
    if (!kg) return 0;
    return +(kg / KG_PER_FMT).toFixed(3);
  }
  function toNum(v, def = null) {
    const n = Number(v);
    return Number.isFinite(n) ? n : def;
  }
  function toInt(val) {
    if (val === null || val === undefined || val === "") return null;
    const n = Number(val);
    return Number.isFinite(n) ? n : null;
  }
  function toDateOrNull(s) {
    if (!s) return null;
    const d = new Date(s);
    return isNaN(d.getTime()) ? null : d;
  }
  function formatAuditText(auditCode, auditDescription) {
    if (auditCode && auditDescription)
      return `${auditCode} - ${auditDescription}`;
    return auditDescription || (auditCode ? String(auditCode) : "");
  }
  function labelForAudit(c) {
    return (
      {
        300: "Roll wrapped (sale)",
        320: "Roll wrapped (cull)",
        330: "Roll wrapped (beater)",
        800: "Roll consumed",
        810: "Beater roll consumed",
      }[c] || "Update only"
    );
  }
  function safeUpper(v) {
    return String(v == null ? "" : v)
      .trim()
      .toUpperCase();
  }
  function ifDefined(obj, key, val) {
    if (val !== undefined && val !== null && val !== "") obj[key] = val;
  }

  function fail(r, msg) {
    return { status: "not_found", message: msg, action: "n/a" };
  }
  function toErr(e) {
    return e && e.message
      ? { message: e.message, stack: e.stack }
      : { message: String(e) };
  }
  function throwBadRequest(e, greeting, originalBody) {
    const payload = {
      success: false,
      overallStatus: "error",
      message: greeting,
      api_message: "Internal error occurred.",
      requestBody: originalBody,
      error: {
        name: e.name || "ERROR",
        message: e.message || String(e),
        stack: e.stack,
      },
    };
    const err = error.create({
      name: "BAD_REQUEST",
      message: JSON.stringify(payload),
      notifyOff: true,
    });
    err.status = 400;
    throw err;
  }

  return { post };
});
