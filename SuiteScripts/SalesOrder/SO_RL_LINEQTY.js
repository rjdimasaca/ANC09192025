/**
 * @NApiVersion 2.1
 * @NScriptType Restlet
 */
define(['N/search', 'N/record', 'N/https', 'N/log'], (search, record, https, log) => {
  const ITEM_WEIGHT_FIELD = 'custitem_weight_of_sku'; // stored in KG
  const ITEM_RPP_FIELD    = 'custitem_roll_rpp';      // NEW: rolls per pack

  const ESTIMATOR = {
    url: 'https://netsuitetest.anchub.ca/netsuite/estimaterollweight',
    bearer: 'iryj8ibMLTLKOZa1HtOcSixzkmNjt16OPKhLNiIUDno',
    wrapType: 'AAA'
  };

  const rxSku = /^([^-\s]+)-([^-\s]+)-D([\d.]+)-W([\d.]+)(?:-(\d+))?$/;

  function fetchItemBasics(itemId) {
    const lf = search.lookupFields({
      type: record.Type.SERIALIZED_INVENTORY_ITEM,
      id: itemId,
      columns: ['itemid', ITEM_WEIGHT_FIELD, ITEM_RPP_FIELD] // add RPP
    });
    if (!lf) throw new Error('Item not found: ' + itemId);
    return {
      itemid: lf.itemid,
      kg: Number(lf[ITEM_WEIGHT_FIELD]) || null,
      rpp: Number(lf[ITEM_RPP_FIELD]) || null
    };
  }

  function parseSku(itemidText) {
    const m = rxSku.exec(itemidText || '');
    if (!m) throw new Error('SKU format not recognized: ' + itemidText);
    return {
      grade: m[1], core: m[2],
      diameter: parseFloat(m[3]),
      width: parseFloat(m[4]),
      rollPerPack: m[5] ? parseInt(m[5], 10) : 1
    };
  }

  function callEstimator(payload) {
    const resp = https.post({
      url: ESTIMATOR.url,
      headers: { 'Content-Type': 'application/json', 'Authorization': 'Bearer ' + ESTIMATOR.bearer },
      body: JSON.stringify(payload)
    });
    if (resp.code < 200 || resp.code >= 300) throw new Error(`Estimator HTTP ${resp.code}: ${resp.body}`);

    let data; try { data = JSON.parse(resp.body); } catch { data = resp.body; }
    let kg = (typeof data === 'number') ? data
      : [data?.estimatedRollWeight, data?.estimatedWeightKg, data?.weightKg, data?.kg, data?.estimatedWeight, data?.weight]
          .find(v => v != null);
    kg = Number(kg);
    if (!isFinite(kg) || kg <= 0) throw new Error('Estimator returned no usable kg value: ' + resp.body);
    return kg;
  }

  function ensureItemKg(itemId, itemidText) {
    const basics = fetchItemBasics(itemId);
    if (basics.kg) return basics.kg;

    const parts = parseSku(itemidText || basics.itemid);
    const kg = callEstimator({
      grade: parts.grade, core: parts.core,
      wrapType: ESTIMATOR.wrapType,
      width: parts.width, diameter: parts.diameter,
      rollPerPack: parts.rollPerPack
    });

    record.submitFields({
      type: record.Type.SERIALIZED_INVENTORY_ITEM,
      id: itemId,
      values: { [ITEM_WEIGHT_FIELD]: kg }
    });
    return kg;
  }

  // existing helper kept as-is
  function fetchUnitConvRate(unitId) {
    if (!unitId) return null;
    const u = record.load({ type: 'customrecord_anc_unitsofmeasure', id: unitId });
    const rate = Number(u.getValue('custrecord_anc_uom_conversionrate'));
    if (!isFinite(rate) || rate <= 0) throw new Error('Invalid conversion rate for unit ' + unitId);
    return rate; // kg per unit
  }

  // -------------------- Pricing Lookup --------------------
  const PRICING_REC_TYPE = 'customrecord_alberta_ns_pricing_list';
  const PRICE_FLD = {
    customer: 'custrecord_albert_ns_item_price_customer',
    consignee: 'custrecord_albert_ns_item_price_consigne',
    year: 'custrecord_alberta_ns_item_pricing_year',
    item: 'custrecord_alberta_ns_item',
    months: {
      1: 'custrecord_alberta_ns_month_jan',
      2: 'custrecord_alberta_ns_month_feb',
      3: 'custrecord_alberta_ns_month_march',
      4: 'custrecord_alberta_ns_month_april',
      5: 'custrecord_alberta_ns_month_may',
      6: 'custrecord_alberta_ns_month_june',
      7: 'custrecord_alberta_ns_month_july',
      8: 'custrecord_alberta_ns_month_august',
      9: 'custrecord_alberta_ns_month_sep',
      10: 'custrecord_alberta_ns_month_oct',
      11: 'custrecord_alberta_ns_month_nov',
      12: 'custrecord_alberta_ns_month_dec'
    }
  };

  function toIntOrNull(v) {
    const n = Number(v);
    return (isFinite(n) ? parseInt(String(n), 10) : null);
  }

  function parseTrandateToYearMonth(trandate) {
    try {
      if (!trandate) return { year: null, month: null };
      const d = new Date(trandate);
      if (isNaN(d.getTime())) return { year: null, month: null };
      return { year: d.getFullYear(), month: d.getMonth() + 1 };
    } catch (_) {
      return { year: null, month: null };
    }
  }

  function deriveGradeFromSku(itemidText) {
    try {
      const parts = parseSku(itemidText || '');
      return parts.grade || null;
    } catch (_) {
      return null;
    }
  }

  function lookupPricePerMt(params) {
    try {
      log.debug({ title: 'Pricing lookup - input', details: JSON.stringify({
        customerId: params && params.customerId,
        consigneeId: params && params.consigneeId,
        year: params && params.year,
        month: params && params.month,
        trandate: params && params.trandate,
        itemText: params && (params.itemidText || params.itemText),
        gradeFromParam: params && params.grade
      }) });
    } catch (_) {}
    const customerId = toIntOrNull(params.customerId);
    const consigneeId = toIntOrNull(params.consigneeId);
    let year = params.year != null ? toIntOrNull(params.year) : null;
    let month = params.month != null ? toIntOrNull(params.month) : null;
    const trandate = params.trandate;
    const itemText = params.itemidText || params.itemText || '';

    if ((!year || !month) && trandate) {
      const ym = parseTrandateToYearMonth(trandate);
      year = year || ym.year;
      month = month || ym.month;
    }

    if (!customerId || !consigneeId || !year || !month) {
      return { pricePerMt: null, pricingId: null, reason: 'missing-keys' };
    }

    const monthFld = PRICE_FLD.months[month];
    if (!monthFld) return { pricePerMt: null, pricingId: null, reason: 'bad-month' };

    const grade = (params.grade || deriveGradeFromSku(itemText) || '').toString().trim();
    const filters = [
      [PRICE_FLD.customer, 'anyof', customerId], 'AND',
      [PRICE_FLD.consignee, 'anyof', consigneeId], 'AND',
      [PRICE_FLD.year, 'is', String(year)], 'AND',
      ['isinactive', 'is', 'F']
    ];

    const columns = [
      search.createColumn({ name: 'internalid' }),
      search.createColumn({ name: PRICE_FLD.item }),
      search.createColumn({ name: monthFld })
    ];

    const s = search.create({ type: PRICING_REC_TYPE, filters, columns });
    try {
      log.debug({ title: 'Pricing search - derived params', details: JSON.stringify({
        customerId, consigneeId, year, month, monthFld, grade, filters
      }) });
    } catch (_) {}
    let found = null;
    s.run().each(res => {
      const itemTxt = (res.getText({ name: PRICE_FLD.item }) || '').toString();
      const hasGrade = grade ? (itemTxt.toLowerCase().indexOf(grade.toLowerCase()) !== -1) : true;
      if (hasGrade) {
        found = {
          id: res.getValue({ name: 'internalid' }),
          price: res.getValue({ name: monthFld })
        };
        return false; // stop at first match
      }
      return true;
    });

    if (!found) {
      try { log.debug({ title: 'Pricing result', details: 'no-match' }); } catch (_) {}
      return { pricePerMt: null, pricingId: null, reason: 'no-match' };
    }

    const priceNum = Number(found.price);
    if (!isFinite(priceNum) || priceNum <= 0) {
      try { log.debug({ title: 'Pricing result', details: JSON.stringify({ pricingId: found.id, pricePerMt: null, reason: 'no-price' }) }); } catch (_) {}
      return { pricePerMt: null, pricingId: found.id, reason: 'no-price' };
    }
    try { log.debug({ title: 'Pricing result', details: JSON.stringify({ pricingId: found.id, pricePerMt: priceNum }) }); } catch (_) {}
    return { pricePerMt: priceNum, pricingId: found.id };
  }

  function computeAmountFromPriceAndWeight(pricePerMt, weightDisplay, unitId) {
    const price = Number(pricePerMt);
    const w = Number(weightDisplay);
    if (!isFinite(price) || !isFinite(w) || price <= 0 || w <= 0) return null;
    let conv = 1;
    try { if (unitId) conv = fetchUnitConvRate(unitId) || 1; } catch (_) { conv = 1; }
    const mt = (w * conv) / 1000; // convert displayed units -> kg -> MT
    const amt = price * mt;
    return Math.round(amt * 100) / 100; // 2 decimals
  }

  function doHandle(params) {
    const itemId    = params.itemId || params.id;
    const itemidTxt = params.itemidText || params.sku || params.itemName;
    const unitId    = params.unitId || params.weightUnitId || params.unit; // optional

    const out = {};

    if (itemId) {
      out.weightKg = ensureItemKg(itemId, itemidTxt);
      // NEW: include RPP
      try {
        const basics = fetchItemBasics(itemId);
        out.rpp = basics.rpp ?? null;
      } catch (e) { out.rpp = null; }
    }

    if (unitId) {
      out.convRate = fetchUnitConvRate(unitId);
    }

    // Optional: pricing lookup when customer/consignee/year/month present
    if (params && (params.customerId || params.consigneeId || params.trandate || params.year || params.month)) {
      try {
        const priceArgs = {
          customerId: params.customerId,
          consigneeId: params.consigneeId,
          year: params.year,
          month: params.month,
          trandate: params.trandate,
          itemidText: itemidTxt,
          grade: params.grade
        };
        try { log.debug({ title: 'doHandle pricing - args', details: JSON.stringify(priceArgs) }); } catch (_) {}
        const priceRes = lookupPricePerMt(priceArgs);
        out.pricePerMt = priceRes.pricePerMt || null;
        out.pricingId = priceRes.pricingId || null;

        if (out.pricePerMt && (params.weightDisplay || params.weight) && unitId) {
          const weightDisplay = params.weightDisplay != null ? params.weightDisplay : params.weight;
          out.amount = computeAmountFromPriceAndWeight(out.pricePerMt, weightDisplay, unitId);
        }
        try { log.debug({ title: 'doHandle pricing - out', details: JSON.stringify({ pricePerMt: out.pricePerMt, pricingId: out.pricingId, amount: out.amount }) }); } catch (_) {}
      } catch (e) {
        out.priceError = e && e.message || String(e);
        try { log.error({ title: 'doHandle pricing - error', details: out.priceError }); } catch (_) {}
      }
    }

    return out;
  }

  return {
    get: (reqParams) => doHandle(reqParams || {}),
    post: (reqBody) => doHandle(reqBody || {})
  };
});
