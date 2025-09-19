/**
 * @NApiVersion 2.1
 * @NScriptType ClientScript
 */
define([], () => {
  // ===== Config =============================================================
  const MM_PER_INCH = 25.4;

  // Subsidiary
  const SUBSIDIARY_ID   = 5;
  const SUBSIDIARY_TEXT = 'Alberta Newsprint Company : Alberta Newsprint Sales';

  // Units
  const UNIT_TYPE_TEXT = 'Each';
  const UNIT_TEXT      = 'Each';

  // Accounts
  const ACCOUNTS = {
    assetaccount:         591,
    cogsaccount:          2175,
    gainlossaccount:      3925,
    incomeaccount:        323,
    intercocogsaccount:   369,
    intercoincomeaccount: 2121
  };

  // Costing: your UI shows "Specific" but hidden value = LIFO
  const COSTING_VALUE_CANDIDATES = ['LIFO', 'SPECIFIC']; // try in this order
  const COSTING_TEXT = 'Specific';

  // Tax schedule
  const TAXSCHEDULE_ID   = 2;
  const TAXSCHEDULE_TEXT = 'Taxable all Provinces';

  // ===== State ==============================================================
  let IS_CREATE = false;
  let UNITS_APPLIED = false;

  // ===== Helpers ============================================================
  const getTxt = (rec, fieldId) => (rec.getText(fieldId) || '').toString().trim();
  const getVal = (rec, fieldId) => {
    const v = rec.getValue(fieldId);
    return (v === null || v === undefined) ? '' : (typeof v === 'number' ? v : v.toString().trim());
  };
  const toNum = (v) => (v === '' || v === null || v === undefined) ? null : (Number.isFinite(Number(v)) ? Number(v) : null);
  const roundTo = (n, dp) => Math.round((n + Number.EPSILON) * Math.pow(10, dp)) / Math.pow(10, dp);
  const allPresent = (...vals) => vals.every(v => v !== '' && v !== null && v !== undefined);

  const logFieldState = (rec, fid, label = fid) => {
    try {
      const f = rec.getField({ fieldId: fid });
      console.log(`[debug] ${label}: value=`, rec.getValue(fid), ' text=', rec.getText(fid), ' disabled=', f ? f.isDisabled : '(no field)');
    } catch (e) {
      console.warn(`[debug] could not inspect ${label}`, e);
    }
  };

  // ===== SKU ================================================================
  const buildSku = (rec) => {
    const grade    = getTxt(rec, 'custitem_anc_grade');
    const core     = getTxt(rec, 'custitem_anc_core');
    const wrapType = getTxt(rec, 'custitem_anc_wraptype');
    const diam     = getVal(rec, 'custitem_roll_diameter_metric');
    const width    = getVal(rec, 'custitem_roll_width_metric');
    const rpp      = getVal(rec, 'custitem_roll_rpp');

    if (allPresent(grade, core, wrapType, diam, width, rpp)) {
      const fmt = (v) => {
        const s = (typeof v === 'number') ? String(v) : String(v || '').trim();
        if (!s) return s;
        return s.includes('.') ? s : `${s}.0`;
      };
      const sku = `${grade}-${core}-D${fmt(diam)}-W${fmt(width)}-RP${rpp}-${wrapType}`;
      rec.setValue({ fieldId: 'itemid', value: sku, ignoreFieldChange: true });
      console.log('[sku] itemid =', sku);
      return sku;
    } else {
      rec.setValue({ fieldId: 'itemid', value: '', ignoreFieldChange: true });
      console.log('[sku] itemid cleared (incomplete)');
      return '';
    }
  };

  // ===== Metrics (2dp) + Imperial (3dp) ====================================
  const normalizeMetricAndUpdateImperial = (rec) => {
    let d = toNum(getVal(rec, 'custitem_roll_diameter_metric'));
    let w = toNum(getVal(rec, 'custitem_roll_width_metric'));

    if (d !== null) {
      d = roundTo(d, 2);
      rec.setValue({ fieldId: 'custitem_roll_diameter_metric', value: d, ignoreFieldChange: true });
      rec.setValue({ fieldId: 'custitem_item_diameter_imperial', value: roundTo(d / MM_PER_INCH, 3), ignoreFieldChange: true });
      console.log('[metric] diameter 2dp =', d);
    }
    if (w !== null) {
      w = roundTo(w, 2);
      rec.setValue({ fieldId: 'custitem_roll_width_metric', value: w, ignoreFieldChange: true });
      rec.setValue({ fieldId: 'custitem_roll_width_imperial', value: roundTo(w / MM_PER_INCH, 3), ignoreFieldChange: true });
      console.log('[metric] width 2dp =', w);
    }
  };

  // ===== Subsidiary & Units =================================================
  const ensureSubsidiary = (rec) => {
    try {
      rec.setValue({ fieldId: 'subsidiary', value: SUBSIDIARY_ID, ignoreFieldChange: false });
      console.log('[subsidiary] set by value:', SUBSIDIARY_ID, ' → ', rec.getText('subsidiary'));
      return true;
    } catch (e1) {
      console.warn('[subsidiary] set by value failed; trying text…', e1);
      try {
        try {
          rec.setText({ fieldId: 'subsidiary', text: [SUBSIDIARY_TEXT], ignoreFieldChange: false });
        } catch (eArr) {
          rec.setText({ fieldId: 'subsidiary', text: SUBSIDIARY_TEXT, ignoreFieldChange: false });
        }
        console.log('[subsidiary] set by text:', rec.getText('subsidiary'));
        return true;
      } catch (e2) {
        console.error('[subsidiary] set by text failed', e2);
        return false;
      }
    }
  };

  const setUnitsPipeline = (rec) => {
    if (UNITS_APPLIED) return;
    UNITS_APPLIED = true;

    try {
      rec.setText({ fieldId: 'unitstype', text: UNIT_TYPE_TEXT, ignoreFieldChange: false });
      console.log('[units] unitstype =', rec.getText('unitstype'));
    } catch (e) {
      console.warn('[units] failed to set unitstype by text', e);
    }

    window.setTimeout(() => {
      ['stockunit', 'purchaseunit', 'saleunit'].forEach(fid => {
        try {
          rec.setText({ fieldId: fid, text: UNIT_TEXT, ignoreFieldChange: true });
          console.log(`[units] ${fid} =`, rec.getText(fid));
        } catch (e) {
          console.warn(`[units] failed setting ${fid} to "${UNIT_TEXT}"`, e);
        }
      });
      logFieldState(rec, 'unitstype');
      logFieldState(rec, 'stockunit');
      logFieldState(rec, 'purchaseunit');
      logFieldState(rec, 'saleunit');
    }, 150);
  };

  // ===== Costing ============================================================
  const setCostingToSpecific = (rec) => {
    let ok = false;
    // 1) Try by internal values (LIFO first, then SPECIFIC just in case)
    for (const v of COSTING_VALUE_CANDIDATES) {
      try {
        rec.setValue({ fieldId: 'costingmethod', value: v, ignoreFieldChange: false });
        console.log('[costing] set by value:', v);
        ok = true;
        break;
      } catch (e) {
        console.warn('[costing] set by value failed for', v, e);
      }
    }
    // 2) Try by text label
    if (!ok) {
      try {
        rec.setText({ fieldId: 'costingmethod', text: COSTING_TEXT, ignoreFieldChange: false });
        console.log('[costing] set by text:', COSTING_TEXT);
        ok = true;
      } catch (e) {
        console.warn('[costing] set by text failed:', COSTING_TEXT, e);
      }
    }
    // 3) DOM fallback – force hidden input and fire change
    window.setTimeout(() => {
      const after1 = rec.getValue('costingmethod');
      if (after1 && (after1 === 'LIFO' || after1 === 'SPECIFIC')) {
        logFieldState(rec, 'costingmethod', 'costingmethod');
        return;
      }
      try {
        const el = document.querySelector('input[name="costingmethod"].nldropdown') ||
                   document.querySelector('input[id^="hddn_costingmethod_"]');
        if (el) {
          el.value = 'LIFO';
          if (typeof el.onchange === 'function') el.onchange();
          console.log('[costing] DOM fallback → LIFO + onchange()');
        } else {
          console.warn('[costing] DOM fallback element not found');
        }
      } catch (e) {
        console.warn('[costing] DOM fallback failed', e);
      }
      logFieldState(rec, 'costingmethod', 'costingmethod');
    }, 50);
  };

  // ===== Tax Schedule =======================================================
  const setTaxSchedule = (rec) => {
    let ok = false;
    try {
      rec.setValue({ fieldId: 'taxschedule', value: TAXSCHEDULE_ID, ignoreFieldChange: true });
      console.log('[tax] taxschedule set by value:', TAXSCHEDULE_ID);
      ok = true;
    } catch (e) {
      console.warn('[tax] set by value failed; trying text…', e);
    }
    if (!ok) {
      try {
        rec.setText({ fieldId: 'taxschedule', text: TAXSCHEDULE_TEXT, ignoreFieldChange: true });
        console.log('[tax] taxschedule set by text:', TAXSCHEDULE_TEXT);
      } catch (e2) {
        console.warn('[tax] set by text failed', e2);
      }
    }
    logFieldState(rec, 'taxschedule', 'taxschedule');
  };

  // ===== Accounts ===========================================================
  const setAccounts = (rec) => {
    Object.entries(ACCOUNTS).forEach(([fid, id]) => {
      try {
        rec.setValue({ fieldId: fid, value: id, ignoreFieldChange: true });
        console.log(`[accounts] ${fid} = ${id}`);
      } catch (e) {
        console.warn(`[accounts] failed to set ${fid}=${id}`, e);
      }
    });
  };

  // ===== Events =============================================================
  function pageInit(context) {
    const rec = context.currentRecord;
    IS_CREATE = (context.mode && context.mode.toLowerCase() === 'create');
    console.log('[init] mode=', context.mode);

    // Keep itemid read-only
    try {
      const f = rec.getField({ fieldId: 'itemid' });
      if (f) f.isDisabled = true;
    } catch (_) {}

    if (!IS_CREATE) {
      console.log('[init] not create → skipping defaults');
      return;
    }

    ensureSubsidiary(rec);
    setUnitsPipeline(rec);

    // After sourcing settles, apply costing, tax schedule, accounts, metrics, SKU
    window.setTimeout(() => {
      setCostingToSpecific(rec);
      setTaxSchedule(rec);
      setAccounts(rec);
      normalizeMetricAndUpdateImperial(rec);
      buildSku(rec);
    }, 400);
  }

  function fieldChanged(context) {
    if (!IS_CREATE) return;
    const rec = context.currentRecord;

    if (context.fieldId === 'subsidiary') {
      UNITS_APPLIED = false;
      setUnitsPipeline(rec);
      window.setTimeout(() => setCostingToSpecific(rec), 250);
      window.setTimeout(() => setTaxSchedule(rec), 300);
    }

    if (context.fieldId === 'unitstype') {
      UNITS_APPLIED = false;
      setUnitsPipeline(rec);
    }

    if (['custitem_roll_diameter_metric', 'custitem_roll_width_metric'].includes(context.fieldId)) {
      normalizeMetricAndUpdateImperial(rec);
    }

    const watched = [
      'custitem_anc_grade','custitem_anc_core','custitem_anc_wraptype',
      'custitem_roll_diameter_metric','custitem_roll_width_metric','custitem_roll_rpp'
    ];
    if (watched.includes(context.fieldId)) buildSku(rec);
  }

  function saveRecord(context) {
    if (!IS_CREATE) return true;

    const rec = context.currentRecord;

    // Guard for stock unit
    if (!getTxt(rec, 'stockunit')) {
      alert(`Stock Unit is required. Ensure Units Type = "${UNIT_TYPE_TEXT}" and Stock/Purchase/Sale Unit = "${UNIT_TEXT}".`);
      return false;
    }

    // Final passes
    setCostingToSpecific(rec);
    setTaxSchedule(rec);
    setAccounts(rec);
    normalizeMetricAndUpdateImperial(rec);

    const sku = buildSku(rec);
    if (!sku) {
      alert('Complete Grade, Core, Wrap Type, Diameter, Width, and RPP to generate the Item Name/Number.');
      return false;
    }

    const d = toNum(getVal(rec, 'custitem_roll_diameter_metric'));
    const w = toNum(getVal(rec, 'custitem_roll_width_metric'));
    if (d === null || w === null) {
      alert('Diameter and Width (metric) must be numeric values.');
      return false;
    }

    console.log('[save] OK (create)');
    return true;
  }

  return { pageInit, fieldChanged, saveRecord };
});
