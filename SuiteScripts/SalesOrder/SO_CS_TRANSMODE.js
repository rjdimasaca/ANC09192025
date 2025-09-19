/**
 * @NApiVersion 2.1
 * @NScriptType ClientScript
 */
define(['N/url', 'N/https', 'N/record'], (url, https, record) => {
  const SUB = 'item';
  const FLD = {
    item: 'item',
    qty: 'quantity',
    weight: 'custcol_anc_orderweight',
    unit: 'custcol_anc_weight_unit'
  };
  const restlet = { scriptId: '5843', deployId: '1' };

  const kgCache = Object.create(null);
  const convCache = Object.create(null);

  let guard = false;
  let expected = { qty: null, weight: null };

  // ---------- Debug snapshot ----------
  function dumpLine(rec, triggerLabel) {
    try {
      const snapshot = {
        trigger: triggerLabel,
        itemId: rec.getCurrentSublistValue({ sublistId: SUB, fieldId: FLD.item }),
        itemText: rec.getCurrentSublistText({ sublistId: SUB, fieldId: FLD.item }) || '',
        qty: Number(rec.getCurrentSublistValue({ sublistId: SUB, fieldId: FLD.qty }) || 0),
        weight: Number(rec.getCurrentSublistValue({ sublistId: SUB, fieldId: FLD.weight }) || 0),
        unitId: rec.getCurrentSublistValue({ sublistId: SUB, fieldId: FLD.unit }),
        unitText: rec.getCurrentSublistText({ sublistId: SUB, fieldId: FLD.unit }) || '',
        convRate_kgPerUnit: (function(){ try { return getConvRate(rec); } catch(_) { return null; }})(),
        kgPerRoll: (function(){ try { return getKgPerUnit(rec); } catch(_) { return null; }})(),
        expected
      };
      console.groupCollapsed(`[ANC DEBUG] Line snapshot - ${triggerLabel}`);
      console.table(snapshot);
      console.groupEnd();
    } catch (e) {
      console.log('[ANC DEBUG] dumpLine error:', e && e.message);
    }
  }

  // ---------- Helpers ----------
  function getKgPerUnit(rec) {
    const itemId = rec.getCurrentSublistValue({ sublistId: SUB, fieldId: FLD.item });
    if (!itemId) return null;
    if (kgCache[itemId] != null) return kgCache[itemId];

    const itemText = rec.getCurrentSublistText({ sublistId: SUB, fieldId: FLD.item }) || '';
    const restletUrl = url.resolveScript({
      scriptId: restlet.scriptId,
      deploymentId: restlet.deployId,
      returnExternalUrl: false
    });

    try {
      const resp = https.post({
        url: restletUrl,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ itemId, itemidText: itemText })
      });
      if (resp.code >= 200 && resp.code < 300) {
        const data = JSON.parse(resp.body || '{}');
        const kg = Number(data.weightKg);
        if (isFinite(kg) && kg > 0) {
          kgCache[itemId] = kg;
          return kg;
        }
      }
      console.log('Weight lookup failed:', resp.code, resp.body);
    } catch (e) {
      console.log('Weight lookup error:', e && e.message);
    }
    return null;
  }

  // Returns kg per selected unit
  function getConvRate(rec) {
    const unitId = rec.getCurrentSublistValue({ sublistId: SUB, fieldId: FLD.unit });
    if (!unitId) return 1;
    if (convCache[unitId] != null) return convCache[unitId];
    try {
      const unitRec = record.load({ type: 'customrecord_anc_unitsofmeasure', id: unitId });
      const rate = Number(unitRec.getValue('custrecord_anc_uom_conversionrate')) || 1;
      convCache[unitId] = rate;
      return rate;
    } catch (e) {
      console.log('Unit load failed:', e && e.message);
      convCache[unitId] = 1; // safe default; UI enforcement will still run
      return 1;
    }
  }

  function setLineValue(rec, fieldId, value) {
    rec.setCurrentSublistValue({
      sublistId: SUB,
      fieldId,
      value,
      ignoreFieldChange: true
    });
  }

  // Enforce expected values if something else overwrote them
  function enforceAfter(rec, attempts = 3, delayMs = 40) {
    const check = () => {
      const curQty = Number(rec.getCurrentSublistValue({ sublistId: SUB, fieldId: FLD.qty }) || 0);
      const curW   = Number(rec.getCurrentSublistValue({ sublistId: SUB, fieldId: FLD.weight }) || 0);
      let changed = false;

      if (expected.qty != null && curQty !== expected.qty) {
        console.log('[ANC DEBUG] qty drift detected -> fixing', { curQty, expectedQty: expected.qty });
        setLineValue(rec, FLD.qty, expected.qty);
        changed = true;
      }
      if (expected.weight != null && Number(curW.toFixed(3)) !== Number(expected.weight.toFixed(3))) {
        console.log('[ANC DEBUG] weight drift detected -> fixing', { curW, expectedWeight: expected.weight });
        setLineValue(rec, FLD.weight, Number(expected.weight.toFixed(3)));
        changed = true;
      }

      if (attempts > 1 && changed) {
        setTimeout(() => enforceAfter(rec, attempts - 1, delayMs), delayMs);
      }
    };

    // run twice: asap and slightly later
    setTimeout(check, 0);
    setTimeout(check, delayMs);
  }

  // ---------- Core math ----------
  function recomputeFromQty(rec, kg) {
    if (!kg) return;
    const qty = Number(rec.getCurrentSublistValue({ sublistId: SUB, fieldId: FLD.qty })) || 0;
    if (qty <= 0) return;
    const conv = getConvRate(rec) || 1;
    const wDisplay = (qty * kg) / conv;

    expected = { qty, weight: Number(wDisplay.toFixed(3)) };
    setLineValue(rec, FLD.weight, expected.weight);
    enforceAfter(rec);
  }

  function recomputeFromWeight(rec, kg) {
    if (!kg) return;
    const wEntered = Number(rec.getCurrentSublistValue({ sublistId: SUB, fieldId: FLD.weight })) || 0;
    if (wEntered <= 0) return;

    const conv = getConvRate(rec) || 1;
    const wKg = wEntered * conv;
    const qty = Math.ceil(wKg / kg);
    const wNormalized = (qty * kg) / conv;

    expected = { qty, weight: Number(wNormalized.toFixed(3)) };
    setLineValue(rec, FLD.qty, qty);
    setLineValue(rec, FLD.weight, expected.weight);
    enforceAfter(rec);
  }

  function recomputeForCurrentLine(rec, source /* 'qty' | 'weight' | 'unit' | null */) {
    const kg = getKgPerUnit(rec);
    if (!kg) return;
    getConvRate(rec); // read unit first

    if (source === 'qty') return recomputeFromQty(rec, kg);
    if (source === 'weight') return recomputeFromWeight(rec, kg);

    const qtyVal = Number(rec.getCurrentSublistValue({ sublistId: SUB, fieldId: FLD.qty })) || 0;
    if (qtyVal > 0) return recomputeFromQty(rec, kg);

    const wVal = Number(rec.getCurrentSublistValue({ sublistId: SUB, fieldId: FLD.weight })) || 0;
    if (wVal > 0) return recomputeFromWeight(rec, kg);
  }

  // ---------- Events ----------
  function fieldChanged(ctx) {
    if (ctx.sublistId !== SUB) return;
    if (guard) return;

    guard = true;
    try {
      if (ctx.fieldId === FLD.qty) {
        recomputeForCurrentLine(ctx.currentRecord, 'qty');
      } else if (ctx.fieldId === FLD.weight) {
        recomputeForCurrentLine(ctx.currentRecord, 'weight');
      } else if (ctx.fieldId === FLD.unit) {
        // Keep qty, re-display weight in the new unit
        recomputeForCurrentLine(ctx.currentRecord, 'unit');
      }
    } finally {
      //dumpLine(ctx.currentRecord, `fieldChanged:${ctx.fieldId}`); // uncomment for debugging
      guard = false;
    }
  }

  function postSourcing(ctx) {
    if (ctx.sublistId === SUB && ctx.fieldId === FLD.item) {
      // Recalc and then re-apply shortly after sourcing finishes
      recomputeForCurrentLine(ctx.currentRecord, null);
      enforceAfter(ctx.currentRecord, 3, 60);
      //dumpLine(ctx.currentRecord, 'postSourcing:item'); // uncomment for debugging
    }
  }

  function lineInit(ctx) {
    if (ctx.sublistId !== SUB) return;
    // When selecting a line (often after sourcing), normalize + enforce
    recomputeForCurrentLine(ctx.currentRecord, null);
    enforceAfter(ctx.currentRecord, 3, 60);
    //dumpLine(ctx.currentRecord, 'lineInit'); // uncomment for debugging
  }

  // Ensure the final committed line has our values
  function validateLine(ctx) {
    if (ctx.sublistId !== SUB) return true;
    try {
      enforceAfter(ctx.currentRecord, 2, 40);
      //dumpLine(ctx.currentRecord, 'validateLine'); // uncomment for debugging
    } catch (e) {
      console.log('validateLine error', e && e.message);
    }
    return true;
  }

  function pageInit(_ctx) {  }

  return { fieldChanged, postSourcing, lineInit, validateLine, pageInit };
});
