/**
 * TRAQ RESTlet – Unified Load Update Endpoint (safeUpper + success flag + strict map)
 * @NApiVersion 2.1
 * @NScriptType Restlet
 * @NModuleScope Public
 */
define(['N/record', 'N/search', 'N/log', 'N/format', 'N/runtime', 'SuiteScripts/ANC_lib'],
(record, search, log, format, runtime, ANC_lib) => {
  function post(requestBody) {
    let integrationLogId = null;
    try { integrationLogId = ANC_lib.submitIntegrationLog(integrationLogId, { request: JSON.stringify(requestBody) }); }
    catch (e) { log.error('submitIntegrationLog(request) failed', toErr(e)); }

    let respMsg, respMsgStr;

    try {
      let api_message = 'This endpoint is under development';
      let overallSuccess = true; // will flip to false if any row fails

      if (Array.isArray(requestBody)) {
        if (requestBody.length && has(requestBody[0], 'loadMesTransportationStatus')) {
          const out = loadReadyState(requestBody); // bulk map + submitFields
          const failures = (out && out.results) ? out.results.filter(r => r && r.ok === false).length : 0;
          overallSuccess = failures === 0;
          api_message = `loadReadyState: updated ${out.updated} of ${requestBody.length}; matched ${out.matched}; failed ${failures}`;
        } else {
          api_message = 'Unsupported array payload; expected node "loadMesTransportationStatus" in first element';
          overallSuccess = false;
        }
      } else if (isObject(requestBody)) {
        if (has(requestBody, 'dateAdjusted')) {
          const out = loadAdjustment(requestBody); // TODO stub
          api_message = `loadAdjustment: ${out.message}`;
          overallSuccess = false; // TODO endpoints treated as not complete
        } else if (has(requestBody, 'dateShipped')) {
          const out = loadShipped(requestBody); // TODO stub
          api_message = `loadShipped: ${out.message}`;
          overallSuccess = false; // TODO endpoints treated as not complete
        } else {
          api_message = 'Unsupported object payload; expected one of: dateAdjusted | dateShipped';
          overallSuccess = false;
        }
      } else {
        api_message = 'Unsupported payload type; must be JSON object or array';
        overallSuccess = false;
      }

      respMsg = {
        success: overallSuccess,
        message: `Hello, you connected to ANC NETSUITE ${runtime.accountId} : ${runtime.envType} : TRAQ LOAD API`,
        api_message,
        requestBody: requestBody
      };
    } catch (e) {
      log.error('ERROR in TRAQ Load RESTlet post', toErr(e));
      respMsg = { success: false, message: 'ERROR caught: ' + JSON.stringify(toErr(e)), requestBody };
    }

    respMsg.integrationLogId = integrationLogId;
    respMsgStr = JSON.stringify(respMsg);
    try { ANC_lib.submitIntegrationLog(integrationLogId, { response: respMsgStr }); }
    catch (e) { log.error('submitIntegrationLog(response) failed', toErr(e)); }

    return respMsgStr;
  }

  // ──────────────────────────────────────────────────────────────────────────
  // Case 1: Ready/State feed (array) – SINGLE SEARCH + submitFields
  // ──────────────────────────────────────────────────────────────────────────
  function loadReadyState(list) {
    const results = [];

    // Collect unique requested tranids
    const wanted = [];
    const seen = new Set();
    for (let i = 0; i < list.length; i++) {
      const ln = (list[i] && list[i].loadNumber) ? String(list[i].loadNumber).trim() : '';
      if (!ln) continue;
      const key = norm(ln);
      if (!seen.has(key)) { seen.add(key); wanted.push(ln); }
    }

    // Build single search map, restricted strictly to the wanted set
    const idMap = singleSearchShipmentMap(wanted);
    const matched = Object.keys(idMap).length;

    // Update with submitFields
    let updated = 0;
    for (let i = 0; i < list.length; i++) {
      const row = list[i] || {};
      try {
        const loadNumber = String(row.loadNumber || '').trim();
        const recId = idMap[norm(loadNumber)];
        if (!recId) throw new Error(`Shipment not found for tranid ${loadNumber}`);

        const values = {};

        const statusTxt = safeUpper(row.loadMesStatus);
        const statusId  = SHIP_STATUS_MAP[statusTxt] || null;
        if (statusId != null) values['custbody_anc_shipstatus'] = statusId;

        if (has(row, 'loadMesTransportationStatus')) {
          const t = String(row.loadMesTransportationStatus || '').trim();
          if (t) values['custbody_anc_shipment_loadmestransport'] = t;
        }

        if (has(row, 'readyDate')) { const d = parseIsoDate(row.readyDate); if (d) values['custbody_anc_shipment_readydate'] = d; }
        if (has(row, 'isReady')) values['custbody_anc_shipment_isready'] = !!row.isReady;
        if (has(row, 'estimatedWeight')) values['custbody_anc_shipment_estimatedweight'] = toNum(row.estimatedWeight, null)/1000;
        if (has(row, 'loadedWeight')) values['custbody_anc_shipment_loadedweight'] = toNum(row.loadedWeight, null)/1000;
        if (has(row, 'preload')) values['custbody_anc_shipment_preload'] = !!row.preload;

        if (Object.keys(values).length) {
          record.submitFields({ type: 'customsale_anc_shipment', id: recId, values, options: { enableSourcing: true, ignoreMandatoryFields: true } });
          updated++;
        }

        results.push({ loadNumber, recordId: recId, ok: true });
      } catch (e) {
        log.error('loadReadyState row failed', { idx: i, err: toErr(e), row });
        results.push({ ok: false, idx: i, error: e && e.message ? e.message : String(e) });
      }
    }

    return { ok: true, type: 'loadReadyState', matched, updated, results };
  }

  // ──────────────────────────────────────────────────────────────────────────
  // Placeholders
  function loadAdjustment(obj) { return { ok: true, type: 'loadAdjustment', message: 'TODO: not implemented yet' }; }
  function loadShipped(obj) { return { ok: true, type: 'loadShipped', message: 'TODO: not implemented yet' }; }

  // ──────────────────────────────────────────────────────────────────────────
  // Helpers
  const SHIP_STATUS_MAP = {
    'PLANNED': 1,
    'PLANNING EXCEPTION': 7,
    'AWAITING STOCK': 2,
    'READY TO SHIP': 3,
    'LOADED': 4,
    'SHIPPED': 5,
    'DELIVERED': 6,
    'OPEN': 8,
    'LOADING': 9,
    'SUSPENDED': 10,
    'CANCELLED': 11
  };

  function singleSearchShipmentMap(tranids) {
    const map = {};
    if (!tranids || !tranids.length) return map;

    const vals = (tranids || []).filter(v => v != null && String(v).trim() !== '');
    if (!vals.length) return map;

    const wantedSet = new Set(vals.map(v => norm(v)));
    const filters = buildOrFilters('tranid', 'is', vals);

    const s = search.create({ type: 'customsale_anc_shipment', filters, columns: ['internalid', 'tranid'] });
    const paged = s.runPaged({ pageSize: 1000 });
    paged.pageRanges.forEach(pr => {
      const page = paged.fetch(pr);
      page.data.forEach(r => {
        const t = r.getValue({ name: 'tranid' });
        const id = r.getValue({ name: 'internalid' });
        const key = norm(t);
        if (t && id && wantedSet.has(key)) map[key] = id; // strictly limit to requested keys
      });
    });

    return map;
  }

  function buildOrFilters(fieldId, operator, values) {
    const vals = (values || []).filter(v => v != null && String(v).trim() !== '');
    if (!vals.length) return [];
    const arr = [[fieldId, operator, vals[0]]];
    for (let i = 1; i < vals.length; i++) arr.push('OR', [fieldId, operator, vals[i]]);
    return arr;
  }

  function norm(s) { return String(s).trim().toUpperCase(); }
  function safeUpper(v) { return String(v == null ? '' : v).trim().toUpperCase(); }
  function has(o, k) { return o != null && Object.prototype.hasOwnProperty.call(o, k); }
  function isObject(v) { return v && typeof v === 'object' && !Array.isArray(v); }
  function toNum(v, def = null) { const n = Number(v); return Number.isFinite(n) ? n : def; }
  function toErr(e) { return (e && e.message) ? { message: e.message, stack: e.stack } : { message: String(e) }; }
  function parseIsoDate(str) { if (!str) return null; const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(String(str).trim()); if (!m) return null; return new Date(Number(m[1]), Number(m[2]) - 1, Number(m[3])); }

  return { post };
});