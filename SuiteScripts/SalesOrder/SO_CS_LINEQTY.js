/**
 * @NApiVersion 2.1
 * @NScriptType ClientScript
 */
define(['N/url', 'N/https', 'N/record'], (url, https, record) => {
  const SUB = 'item';
  const FLD = {
    item:          'item',
    qty:           'quantity',                    // ROLLS (user input)
    weight:        'custcol_anc_orderweight',     // DISPLAY: rounded weight (script overwrites)
    orderedWeight: 'custcol_anc_ordered_weight',  // ORIGINAL: user-entered or auto-seeded in rolls-first
    unit:          'custcol_anc_weight_unit',     // custom UOM selector
    rolls:         'custcol_anc_numofpacks',      // COMPUTED: PACKS = rolls / rpp (script overwrites; read-only)
    grade:         'custcol_anc_grade',           // line grade (text preferred for pricing)
    deliveryDate:  'custcol_anc_deliverydate'     // required: ensure before commit
  };

  const restlet = { scriptId: '5843', deployId: '1' };

  // caches
  const kgCache   = Object.create(null); // itemId -> kg per roll (from RL)
  const convCache = Object.create(null); // unitId -> kg per selected unit (as stored)
  const rppCache  = Object.create(null); // itemId -> rolls per pack (from RL or parsed)

  // transient state (reset on user edits)
  let guard = false;
  let expected = { qty: null, weight: null }; // expected rolls & adjusted weight (display)
  let owFollowQty = false;                    // rolls-first mode: ordered mirrors adjusted
  let lastConv = 1;                           // kg per unit of PREVIOUS unit (for ordered conversion on unit change)
  let lastUserSource = null;                  // 'qty' | 'orderedWeight' | null (last non-unit user input)
  let warnedMissingDelivery = false;          // avoid spamming alerts
  let reasserting = false;                    // prevent loops when bouncing values

  // === UI lock (makes computed columns look disabled) ========================
  function lockCalcUI(rec) {
    try {
      const curW = rec.getCurrentSublistField({ sublistId: SUB, fieldId: FLD.weight });
      if (curW && curW.isDisabled !== true) curW.isDisabled = true;
    } catch (_) {}
    try {
      const curR = rec.getCurrentSublistField({ sublistId: SUB, fieldId: FLD.rolls });
      if (curR && curR.isDisabled !== true) curR.isDisabled = true;
    } catch (_) {}

    const lineCount = rec.getLineCount({ sublistId: SUB }) || 0;
    for (let i = 0; i < lineCount; i++) {
      try {
        const fw = rec.getSublistField({ sublistId: SUB, fieldId: FLD.weight, line: i });
        if (fw && fw.isDisabled !== true) fw.isDisabled = true;
      } catch (_) {}
      try {
        const fr = rec.getSublistField({ sublistId: SUB, fieldId: FLD.rolls, line: i });
        if (fr && fr.isDisabled !== true) fr.isDisabled = true;
      } catch (_) {}
    }
  }

  // -------------------------- helpers --------------------------

  function restletUrl() {
    return url.resolveScript({
      scriptId: restlet.scriptId,
      deploymentId: restlet.deployId,
      returnExternalUrl: false
    });
  }

  // Post JSON to RL: prefer N/https if available; fallback to sync XHR
  function postJson(urlStr, payloadObj) {
    try {
      if (https && typeof https.post === 'function') {
        return https.post({ url: urlStr, headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payloadObj || {}) });
      }
    } catch (_) { /* fall back */ }

    try {
      var xhr = new XMLHttpRequest();
      xhr.open('POST', urlStr, false); // sync
      xhr.setRequestHeader('Content-Type', 'application/json');
      xhr.send(JSON.stringify(payloadObj || {}));
      return { code: xhr.status, body: xhr.responseText };
    } catch (e) {
      return { code: 0, body: String(e && e.message || e) };
    }
  }

  function getItemId(rec) {
    return rec.getCurrentSublistValue({ sublistId: SUB, fieldId: FLD.item });
  }

  function getItemText(rec) {
    return rec.getCurrentSublistText({ sublistId: SUB, fieldId: FLD.item }) || '';
  }

  function getGrade(rec) {
    // Prefer explicit line grade text
    try {
      const gtxt = rec.getCurrentSublistText({ sublistId: SUB, fieldId: FLD.grade });
      if (gtxt && String(gtxt).trim()) return String(gtxt).trim();
    } catch (_) {}
    // Fallback: parse from item display name (token before first dash)
    try {
      const txt = getItemText(rec);
      if (txt) {
        const m = String(txt).match(/^([^\-\s]+)/);
        if (m && m[1]) return m[1];
      }
    } catch (_) {}
    return '';
  }

  // Reset transient state whenever the USER makes a new edit
  function resetState(source /* 'qty' | 'orderedWeight' | 'unit' */) {
    expected = { qty: null, weight: null };
    // rolls-first only if the new source is qty
    owFollowQty = (source === 'qty');
    // lastUserSource tracks the most recent non-unit user input
    if (source === 'qty' || source === 'orderedWeight') lastUserSource = source;
  }

  // Get kg/roll from RL (capture rpp if returned)
  function getKgPerUnit(rec) {
    const itemId = getItemId(rec);
    if (!itemId) return null;
    if (kgCache[itemId] != null) return kgCache[itemId];

    const itemText = rec.getCurrentSublistText({ sublistId: SUB, fieldId: FLD.item }) || '';
    try {
      const resp = postJson(restletUrl(), { itemId, itemidText: itemText });
      if (resp.code >= 200 && resp.code < 300) {
        const data = JSON.parse(resp.body || '{}');
        const kg = Number(data.weightKg);
        if (isFinite(kg) && kg > 0) {
          kgCache[itemId] = kg; // kg per ROLL
          if (data.rpp != null && isFinite(Number(data.rpp))) rppCache[itemId] = Number(data.rpp);
          return kg;
        }
      }
      console.log('Weight lookup failed:', resp.code, resp.body);
    } catch (e) {
      console.log('Weight lookup error:', e && e.message);
    }
    return null;
  }

  // Get rolls-per-pack (prefer RL; fallback parse -<digits> at end of name)
  function getRpp(rec) {
    const itemId = getItemId(rec);
    if (!itemId) return null;
    if (rppCache[itemId] != null) return rppCache[itemId];

    try {
      const itemText = rec.getCurrentSublistText({ sublistId: SUB, fieldId: FLD.item }) || '';
      const resp = postJson(restletUrl(), { itemId, itemidText: itemText });
      if (resp.code >= 200 && resp.code < 300) {
        const data = JSON.parse(resp.body || '{}');
        const rpp = Number(data.rpp);
        if (isFinite(rpp) && rpp > 0) {
          rppCache[itemId] = rpp;
          return rpp;
        }
      }
      console.log('RPP lookup via RL returned none:', resp.code, resp.body);
    } catch (e) {
      console.log('RPP lookup error (RL):', e && e.message);
    }

    try {
      const txt = rec.getCurrentSublistText({ sublistId: SUB, fieldId: FLD.item }) || '';
      const m = txt.match(/-(\d+)\s*$/);
      if (m) {
        const rpp = Number(m[1]);
        if (isFinite(rpp) && rpp > 0) {
          rppCache[itemId] = rpp;
          return rpp;
        }
      }
    } catch (e) {
      console.log('RPP parse error:', e && e.message);
    }

    return null;
  }

  // Conversion rate (kg per selected unit) â€“ use whatever your table stores
  // If your table stores kg per unit, 'rate' is kg/unit (e.g., kg/lb=0.45359237)
  // If it stores units per kg, flip below to '1 / raw'.
  function getConvRate(rec) {
    const unitId = rec.getCurrentSublistValue({ sublistId: SUB, fieldId: FLD.unit });
    if (!unitId) return 1;
    if (convCache[unitId] != null) return convCache[unitId];
    try {
      const unitRec = record.load({ type: 'customrecord_anc_unitsofmeasure', id: unitId });
      const raw = Number(unitRec.getValue('custrecord_anc_uom_conversionrate')) || 1;
      const rate = raw; // assume kg per unit; change to (raw > 0 ? 1/raw : 1) if your table is units/kg
      convCache[unitId] = rate;
      return rate;
    } catch (e) {
      console.log('Unit load failed:', e && e.message);
      convCache[unitId] = 1;
      return 1;
    }
  }

  function setLineValue(rec, fieldId, value) {
    rec.setCurrentSublistValue({ sublistId: SUB, fieldId, value, ignoreFieldChange: true });
  }

  function getDesiredOrderedWeight(rec) {
    // Prefer the user's entered ordered weight if present; else use adjusted display weight
    const ow = Number(rec.getCurrentSublistValue({ sublistId: SUB, fieldId: FLD.orderedWeight })) || 0;
    if (lastUserSource === 'orderedWeight' && ow > 0) return Number(ow.toFixed(3));
    const adj = Number(rec.getCurrentSublistValue({ sublistId: SUB, fieldId: FLD.weight })) || 0;
    return Number(adj.toFixed(3));
  }

  function bounceOrderedWeight(rec) {
    if (reasserting) return;
    const desired = getDesiredOrderedWeight(rec);
    if (!(desired > 0)) return;
    try {
      reasserting = true;
      // trigger NS recompute cycle by toggling ordered weight to 0 then to desired
      rec.setCurrentSublistValue({ sublistId: SUB, fieldId: FLD.orderedWeight, value: 0, ignoreFieldChange: false });
      rec.setCurrentSublistValue({ sublistId: SUB, fieldId: FLD.orderedWeight, value: desired, ignoreFieldChange: false });
    } catch (_) {
    } finally {
      reasserting = false;
    }
  }

  // If Delivery Date is missing and another script drifted qty/weight, restore our expected values
  function enforceExpectedIfMissingDelivery(rec) {
    try {
      const dd = rec.getCurrentSublistValue({ sublistId: SUB, fieldId: FLD.deliveryDate });
      if (dd) return; // nothing to enforce when required is present

      const curQty = Number(rec.getCurrentSublistValue({ sublistId: SUB, fieldId: FLD.qty })) || 0;
      const curW   = Number(rec.getCurrentSublistValue({ sublistId: SUB, fieldId: FLD.weight })) || 0;
      const expQty = Number(expected.qty || 0);
      const expW   = Number(expected.weight || 0);

      const qtyDrift = (expQty > 0) && (curQty !== expQty);
      const wDrift   = (expW > 0) && (Math.abs(curW - expW) > 0.0005);

      if (qtyDrift || wDrift) {
        guard = true;
        try {
          if (qtyDrift) rec.setCurrentSublistValue({ sublistId: SUB, fieldId: FLD.qty, value: expQty, ignoreFieldChange: true });
          if (wDrift)   rec.setCurrentSublistValue({ sublistId: SUB, fieldId: FLD.weight, value: expW, ignoreFieldChange: true });
          updatePacks(rec);
          try { updateLinePricing(rec); } catch (_) {}
        } finally { guard = false; }

        // Over-correct by bouncing ordered weight (0 -> desired -> recompute) to win over other handlers
        defer(() => { try { bounceOrderedWeight(rec); } catch (_) {} });

        if (!warnedMissingDelivery) {
          try { alert('Please enter Delivery Date before adding the line. Your quantity and weight have been preserved.'); } catch (_) {}
          warnedMissingDelivery = true;
        }
      }
    } catch (_) {}
  }

  // Keep Packs (custcol_anc_numofpacks) computed from rolls / rpp
  function updatePacks(rec) {
    try {
      const rolls = Number(rec.getCurrentSublistValue({ sublistId: SUB, fieldId: FLD.qty })) || 0;
      const rpp = getRpp(rec);
      const packs = (rolls > 0 && rpp != null && rpp > 0) ? (rolls / rpp) : 0;
      setLineValue(rec, FLD.rolls, packs);
      lockCalcUI(rec);
    } catch (e) {
      console.log('updatePacks error:', e && e.message);
    }
  }

  // Compute and apply pricing from custom pricing record
  function updateLinePricing(rec) {
    try {
      if (guard) return; // avoid re-entrancy
      const itemId = getItemId(rec);
      if (!itemId) return;

      const weightDisplay = Number(rec.getCurrentSublistValue({ sublistId: SUB, fieldId: FLD.weight })) || 0;
      const qtyRolls = Number(rec.getCurrentSublistValue({ sublistId: SUB, fieldId: FLD.qty })) || 0;
      if (!(weightDisplay > 0) || !(qtyRolls > 0)) return;

      const body = {
        // Pricing args: use grade instead of item id/text for matching
        grade: getGrade(rec),
        customerId: rec.getValue('entity'),
        // Prefer header consignee; fallback to line consignee if present
        consigneeId: (rec.getValue('custbody_consignee')
                      || rec.getCurrentSublistValue({ sublistId: SUB, fieldId: 'custcol_consignee' })
                      || null),
        trandate: rec.getValue('trandate') || null,
        // Amount helper args
        unitId: rec.getCurrentSublistValue({ sublistId: SUB, fieldId: FLD.unit }) || null,
        weightDisplay
      };

      try { console.log('Pricing lookup request:', JSON.stringify(body)); } catch (_) {}

      const resp = postJson(restletUrl(), body);
      try { console.log('Pricing lookup response code:', resp && resp.code); } catch (_) {}
      if (!(resp.code >= 200 && resp.code < 300)) return;
      try { console.log('Pricing lookup raw body:', resp && resp.body); } catch (_) {}
      const data = JSON.parse(resp.body || '{}');
      try { console.log('Pricing lookup parsed:', data); } catch (_) {}
      const pricePerMt = Number(data.pricePerMt);
      if (!isFinite(pricePerMt) || pricePerMt <= 0) return;

      // Amount: use RL precomputed if present, otherwise compute client-side
      let amount = Number(data.amount);
      if (!isFinite(amount) || amount <= 0) {
        const conv = getConvRate(rec) || 1; // kg per selected unit
        const mt = (weightDisplay * conv) / 1000;
        amount = pricePerMt * mt;
      }
      if (!(amount > 0)) return;

      const ratePerRoll = qtyRolls > 0 ? (amount / qtyRolls) : amount;
      const safeRate = Number(ratePerRoll.toFixed(2));
      const safeAmount = Number(amount.toFixed(2));

      try { console.log('Pricing result -> pricePerMt:', pricePerMt, 'amount:', amount, 'ratePerRoll:', safeRate, 'pricingId:', data && data.pricingId); } catch (_) {}

      guard = true; // prevent our own re-entry
      try {
        // Force custom price, then set rate per roll so amount = rate * qty
        // Use ignoreFieldChange=false so NS UI recalculates and displays amount immediately
        rec.setCurrentSublistValue({ sublistId: SUB, fieldId: 'price', value: -1, ignoreFieldChange: false });
        rec.setCurrentSublistValue({ sublistId: SUB, fieldId: 'rate', value: safeRate, ignoreFieldChange: false });
        // Also set amount explicitly to ensure the UI reflects the final value
        try { rec.setCurrentSublistValue({ sublistId: SUB, fieldId: 'amount', value: safeAmount, ignoreFieldChange: false }); } catch (_) {}
      } finally {
        guard = false;
      }
      // As a final pass, defer one more application to win over other handlers in the same cycle
      defer(() => {
        try {
          guard = true;
          rec.setCurrentSublistValue({ sublistId: SUB, fieldId: 'price', value: -1, ignoreFieldChange: true });
          rec.setCurrentSublistValue({ sublistId: SUB, fieldId: 'rate', value: safeRate, ignoreFieldChange: true });
          try { rec.setCurrentSublistValue({ sublistId: SUB, fieldId: 'amount', value: safeAmount, ignoreFieldChange: true }); } catch (_) {}
        } finally { guard = false; }
      });
    } catch (e) {
      // swallow; do not break user flow
      try { console.log('updateLinePricing error:', e && e.message); } catch (_) {}
    }
  }

  function defer(fn) {
    try { return setTimeout(fn, 0); } catch (_) { try { fn(); } catch (_) {} }
  }

  // -------------------------- core math --------------------------

  // Rolls -> (round down to multiple of rpp) -> Packs -> Adjusted Weight
  function recomputeFromQty(rec, kgPerRoll) {
    if (!kgPerRoll) return;
    let rolls = Number(rec.getCurrentSublistValue({ sublistId: SUB, fieldId: FLD.qty })) || 0;

    if (rolls <= 0) {
      setLineValue(rec, FLD.weight, 0);
      setLineValue(rec, FLD.rolls, 0);
      expected = { qty: 0, weight: 0 };
      lockCalcUI(rec);
      return;
    }

    const rpp  = getRpp(rec) || 0;
    const conv = getConvRate(rec) || 1;
    lastConv = conv; // new "previous" for next unit change

    // Round DOWN to nearest multiple of rpp (when rpp > 1)
    if (rpp > 1) {
      const roundedRolls = Math.floor(rolls / rpp) * rpp;
      if (roundedRolls !== rolls) {
        rolls = roundedRolls;
        setLineValue(rec, FLD.qty, rolls);
      }
    }

    const kgPerPack = (rpp > 0) ? (kgPerRoll * rpp) : kgPerRoll;
    const packs = (rpp > 0) ? (rolls / rpp) : 0;
    const wDisplay = (packs * kgPerPack) / conv;

    expected = { qty: rolls, weight: Number(wDisplay.toFixed(3)) };
    setLineValue(rec, FLD.weight, expected.weight);
    updatePacks(rec);
    try { updateLinePricing(rec); } catch (_) {}
    defer(() => { try { updateLinePricing(rec); } catch (_) {} });

    // rolls-first => ordered mirrors adjusted
    if (owFollowQty) {
      setLineValue(rec, FLD.orderedWeight, expected.weight);
    }
  }

  // Ordered Weight -> Packs (floor) -> Rolls -> Adjusted Weight
  function recomputeFromOrderedWeight(rec, kgPerRoll) {
    if (!kgPerRoll) return;
    const wEntered = Number(rec.getCurrentSublistValue({ sublistId: SUB, fieldId: FLD.orderedWeight })) || 0;

    if (wEntered <= 0) {
      setLineValue(rec, FLD.qty, 0);
      setLineValue(rec, FLD.weight, 0);
      setLineValue(rec, FLD.rolls, 0);
      expected = { qty: 0, weight: 0 };
      lockCalcUI(rec);
      return;
    }

    const rpp  = getRpp(rec) || 0;
    const conv = getConvRate(rec) || 1;
    lastConv = conv; // new "previous" for next unit change
    const wKg  = wEntered * conv;

    if (rpp > 0) {
      const kgPerPack = kgPerRoll * rpp;
      const packs = Math.floor(wKg / kgPerPack); // always round down
      const rolls = packs * rpp; // multiple of rpp
      const wNorm = (packs * kgPerPack) / conv;

      expected = { qty: rolls, weight: Number(wNorm.toFixed(3)) };
      setLineValue(rec, FLD.qty, rolls);
      setLineValue(rec, FLD.weight, expected.weight);
    } else {
      const rolls = Math.floor(wKg / kgPerRoll); // always round down
      const wNorm = (rolls * kgPerRoll) / conv;

      expected = { qty: rolls, weight: Number(wNorm.toFixed(3)) };
      setLineValue(rec, FLD.qty, rolls);
      setLineValue(rec, FLD.weight, expected.weight);
    }

    updatePacks(rec);
    try { updateLinePricing(rec); } catch (_) {}
    defer(() => { try { updateLinePricing(rec); } catch (_) {} });
  }

  // Recompute using whichever source makes sense in this moment.
  function recomputeForCurrentLine(rec, source /* 'qty' | 'orderedWeight' | 'unit' */) {
    const kg = getKgPerUnit(rec);
    if (!kg) return;

    if (source === 'qty') {
      const r = recomputeFromQty(rec, kg);
      try { updateLinePricing(rec); } catch (_) {}
      return r;
    }
    if (source === 'orderedWeight') {
      const r = recomputeFromOrderedWeight(rec, kg);
      try { updateLinePricing(rec); } catch (_) {}
      return r;
    }

    // source === 'unit' (or null): decide based on last non-unit user input
    const rollsVal = Number(rec.getCurrentSublistValue({ sublistId: SUB, fieldId: FLD.qty })) || 0;
    const owVal    = Number(rec.getCurrentSublistValue({ sublistId: SUB, fieldId: FLD.orderedWeight })) || 0;

    if (lastUserSource === 'orderedWeight' && owVal > 0) {
      const r = recomputeFromOrderedWeight(rec, kg);
      try { updateLinePricing(rec); } catch (_) {}
      return r;
    }
    if (rollsVal > 0) {
      const r = recomputeFromQty(rec, kg);
      try { updateLinePricing(rec); } catch (_) {}
      return r;
    }
    if (owVal > 0) {
      const r = recomputeFromOrderedWeight(rec, kg);
      try { updateLinePricing(rec); } catch (_) {}
      return r;
    }
  }

  // -------------------------- events --------------------------

  function fieldChanged(ctx) {
    if (ctx.sublistId !== SUB) return;
    if (guard) return;

    guard = true;
    try {
      if (ctx.fieldId === FLD.qty) {
        // USER changed rolls
        resetState('qty');
        recomputeForCurrentLine(ctx.currentRecord, 'qty');

      } else if (ctx.fieldId === FLD.orderedWeight) {
        // USER changed ordered weight
        resetState('orderedWeight');
        recomputeForCurrentLine(ctx.currentRecord, 'orderedWeight');

      } else if (ctx.fieldId === FLD.unit) {
        // USER changed unit
        const prevConv = lastConv || 1;                  // previous unit (kg per unit)
        resetState('unit');                              // drop transient state
        const newConv = getConvRate(ctx.currentRecord) || 1;

        // If last "true" source was ordered weight, convert it numerically into the new unit,
        // then recompute everything from ordered weight.
        if (lastUserSource === 'orderedWeight') {
          const owVal = Number(ctx.currentRecord.getCurrentSublistValue({ sublistId: SUB, fieldId: FLD.orderedWeight })) || 0;
          if (owVal > 0 && prevConv > 0 && newConv > 0) {
            const converted = Number(((owVal * prevConv) / newConv).toFixed(3));
            setLineValue(ctx.currentRecord, FLD.orderedWeight, converted);
          }
          recomputeForCurrentLine(ctx.currentRecord, 'orderedWeight');

        } else {
          // Default to rolls-first (mirror ordered to adjusted if rolls exist)
          const kg = getKgPerUnit(ctx.currentRecord);
          if (kg) {
            const rollsVal = Number(ctx.currentRecord.getCurrentSublistValue({ sublistId: SUB, fieldId: FLD.qty })) || 0;
            if (rollsVal > 0) {
              // enable follow for this recalculation only
              owFollowQty = true;
              recomputeFromQty(ctx.currentRecord, kg);
              try { updateLinePricing(ctx.currentRecord); } catch (_) {}
              owFollowQty = false; // do not stick unless user edits qty again
            } else {
              // If no rolls but ordered exists, fallback
              const owVal = Number(ctx.currentRecord.getCurrentSublistValue({ sublistId: SUB, fieldId: FLD.orderedWeight })) || 0;
              if (owVal > 0 && prevConv > 0 && newConv > 0) {
                const converted = Number(((owVal * prevConv) / newConv).toFixed(3));
                setLineValue(ctx.currentRecord, FLD.orderedWeight, converted);
                recomputeFromOrderedWeight(ctx.currentRecord, kg);
                try { updateLinePricing(ctx.currentRecord); } catch (_) {}
              } else {
                recomputeForCurrentLine(ctx.currentRecord, null);
                try { updateLinePricing(ctx.currentRecord); } catch (_) {}
              }
            }
          }
        }

        // Update lastConv to the new unit after handling conversion
        lastConv = newConv;

      } else if (ctx.fieldId === FLD.weight) {
        // Display weight is read-only; if somehow edited, snap back to computed
        const kg = getKgPerUnit(ctx.currentRecord);
        if (kg) {
          const rollsVal = Number(ctx.currentRecord.getCurrentSublistValue({ sublistId: SUB, fieldId: FLD.qty })) || 0;
          if (rollsVal > 0) {
            recomputeFromQty(ctx.currentRecord, kg);
          } else {
            recomputeFromOrderedWeight(ctx.currentRecord, kg);
          }
        }
        try { updateLinePricing(ctx.currentRecord); } catch (_) {}
        // If DD is missing, prevent drift from other handlers
        enforceExpectedIfMissingDelivery(ctx.currentRecord);

      } else if (ctx.fieldId === FLD.rolls) {
        // Packs column is script-owned; just keep it in sync
        updatePacks(ctx.currentRecord);
        try { updateLinePricing(ctx.currentRecord); } catch (_) {}
        enforceExpectedIfMissingDelivery(ctx.currentRecord);
      } else if (ctx.fieldId === 'price' || ctx.fieldId === 'rate') {
        // If another script or system flip-flops the price level or rate, re-apply our computed pricing
        try { updateLinePricing(ctx.currentRecord); } catch (_) {}
        enforceExpectedIfMissingDelivery(ctx.currentRecord);
      }

      lockCalcUI(ctx.currentRecord);
    } finally {
      guard = false;
    }
  }

function validateField(ctx) {
  if (ctx.sublistId !== SUB) return true;

  // Snap Quantity to nearest lower multiple of RPP before NS commits the user value
  if (ctx.fieldId === FLD.qty) {
    try {
      const rec = ctx.currentRecord;
      const rpp = getRpp(rec) || 0;
      if (rpp > 1) {
        const entered = Number(rec.getCurrentSublistValue({ sublistId: SUB, fieldId: FLD.qty })) || 0;
        const rounded = Math.floor(entered / rpp) * rpp;

        if (rounded !== entered) {
          // prevent recursion + prevent NS from committing the original value
          guard = true;
          rec.setCurrentSublistValue({
            sublistId: SUB,
            fieldId: FLD.qty,
            value: rounded,
            ignoreFieldChange: true
          });
          guard = false;

          // Recompute everything from quantity (and mirror ordered weight if you're in rolls-first mode)
          const kg = getKgPerUnit(rec);
          if (kg) {
            // one-time mirror to keep ordered weight aligned with adjusted when user edited qty
            const prevFollow = owFollowQty;
            owFollowQty = true;
            recomputeFromQty(rec, kg);
            owFollowQty = prevFollow;
          }
          updatePacks(rec);
          try { updateLinePricing(rec); } catch (_) {}
          enforceExpectedIfMissingDelivery(rec);
          lockCalcUI(rec);

          return false; // cancel the user's original (5); keep our (4)
        }
      }
    } catch (e) {
      console.log('validateField qty rounding error:', e && e.message);
    }
    return true; // no change needed; allow commit
  }

  if (ctx.fieldId === FLD.weight) {
    lockCalcUI(ctx.currentRecord);
    return false; // keep display weight read-only
  }

  if (ctx.fieldId === FLD.rolls) {
    try { updatePacks(ctx.currentRecord); } catch (_) {}
    lockCalcUI(ctx.currentRecord);
    return false; // script-owned
  }

  return true;
}


  function postSourcing(ctx) {
    if (ctx.sublistId === SUB && ctx.fieldId === FLD.item) {
      // new item sourced => clear transient state
      lastUserSource = null;
      owFollowQty = false;
      expected = { qty: null, weight: null };
      recomputeForCurrentLine(ctx.currentRecord, null);
      try { updateLinePricing(ctx.currentRecord); } catch (_) {}
      updatePacks(ctx.currentRecord);
      lockCalcUI(ctx.currentRecord);
    }
  }

  function lineInit(ctx) {
    if (ctx.sublistId !== SUB) return;
    // entering a line: clear transient state for a fresh run
    lastUserSource = null;
    owFollowQty = false;
    expected = { qty: null, weight: null };
    recomputeForCurrentLine(ctx.currentRecord, null);
    try { updateLinePricing(ctx.currentRecord); } catch (_) {}
    updatePacks(ctx.currentRecord);
    lockCalcUI(ctx.currentRecord);
  }

  function validateLine(ctx) {
    if (ctx.sublistId !== SUB) return true;
    try {
      // Pre-validate required fields to avoid NetSuite popup (which can reset qty/weight)
      const missing = [];
      const dd = ctx.currentRecord.getCurrentSublistValue({ sublistId: SUB, fieldId: FLD.deliveryDate });
      if (!dd) missing.push('Delivery Date');
      if (missing.length) {
        try { alert('Please enter: ' + missing.join(', ')); } catch (_) {}
        // Keep user on the line; do NOT mutate values
        // Over-correct: bounce ordered weight to restore intended state
        defer(() => { try { bounceOrderedWeight(ctx.currentRecord); } catch (_) {} });
        return false;
      }

      // On commit, re-derive rolls, packs and adjusted weight from the ordered weight
      const kg = getKgPerUnit(ctx.currentRecord);
      if (kg) {
        recomputeFromOrderedWeight(ctx.currentRecord, kg);
      }

      updatePacks(ctx.currentRecord);
      try { updateLinePricing(ctx.currentRecord); } catch (_) {}
      lockCalcUI(ctx.currentRecord);
    } catch (e) {
      console.log('validateLine error', e && e.message);
    }
    return true;
  }

  function pageInit(ctx) {
    // first paint: clear transient state, capture current conv as "previous"
    lastUserSource = null;
    owFollowQty = false;
    expected = { qty: null, weight: null };
    try { lastConv = getConvRate(ctx.currentRecord) || 1; } catch (_) { lastConv = 1; }
    lockCalcUI(ctx.currentRecord);
  }

  // After a line is committed (other scripts may have modified values), re-apply pricing
  function sublistChanged(ctx) {
    try {
      if (ctx.sublistId !== SUB) return;
      // Run after other handlers to avoid being overwritten
      defer(() => {
        try {
          const rec = ctx.currentRecord;
          const dd = rec.getCurrentSublistValue({ sublistId: SUB, fieldId: FLD.deliveryDate });
          if (!dd) { try { bounceOrderedWeight(rec); } catch (_) {} }
          updateLinePricing(rec);
        } catch (_) {}
      });
      lockCalcUI(ctx.currentRecord);
    } catch (e) {
      try { console.log('sublistChanged error:', e && e.message); } catch (_) {}
    }
  }

  return { fieldChanged, validateField, postSourcing, lineInit, validateLine, pageInit, sublistChanged };
});

