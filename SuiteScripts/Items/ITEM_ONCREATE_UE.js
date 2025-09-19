/**
 * @NApiVersion 2.1
 * @NScriptType UserEventScript
 * @NModuleScope Public
 */

define(['N/https', 'N/record', 'N/log', 'N/runtime', 'N/search'],
  (https, record, log, runtime, search) => {

    const API_URL = 'https://netsuitetest.anchub.ca/netsuite/estimaterollweight';
    const BEARER = 'iryj8ibMLTLKOZa1HtOcSixzkmNjt16OPKhLNiIUDno';

    // --- Helpers ---
    const isFilled = (v) => v !== null && v !== '' && typeof v !== 'undefined'; // 0 is considered filled
    const toNumber = (v) => (v === '' || v === null || typeof v === 'undefined') ? null : Number(v);
    const round = (num, places) => {
        
      const p = Math.pow(10, places);
      return Math.round((num + Number.EPSILON) * p) / p;
    };

    /**
     * afterSubmit entry point
     * @param {UserEventContext} context
     */
    const afterSubmit = (context) => {
      try {
        // Only handle create/update-like events
        const allowedTypes = ['create', 'edit', 'xedit', 'copy', 'csvimport'];
        if (!allowedTypes.includes(context.type)) return;

        const rec = context.newRecord;
        const recId = rec.id;
        const recType = rec.type; // use dynamic record type for submitFields later

        // Pull field values (as stored on the item)
        const width = toNumber(rec.getValue({ fieldId: 'custitem_roll_width_metric' }));
        const diameter = toNumber(rec.getValue({ fieldId: 'custitem_roll_diameter_metric' }));
        const rpp = toNumber(rec.getValue({ fieldId: 'custitem_roll_rpp' }));
        // Resolve select field texts via item lookup (getText unreliable in UE)
        let core = null, grade = null, wrapType = null;
        try {
          const lookup = search.lookupFields({
            type: recType,
            id: recId,
            columns: ['custitem_anc_core', 'custitem_anc_grade', 'custitem_anc_wraptype']
          });
          const pickText = (obj, fieldId) => {
            const v = obj && obj[fieldId];
            if (Array.isArray(v) && v.length) return v[0].text || (isFilled(v[0].value) ? String(v[0].value) : null);
            if (v && typeof v === 'object') return v.text || (isFilled(v.value) ? String(v.value) : null);
            return null;
          };
          core = pickText(lookup, 'custitem_anc_core');
          grade = pickText(lookup, 'custitem_anc_grade');
          wrapType = pickText(lookup, 'custitem_anc_wraptype');
        } catch (e) {
          log.error({ title: 'lookupFields failed on item', details: e });
        }

        // If any required field missing, exit silently
        const required = [width, diameter, rpp, core, grade, wrapType];
        if (!required.every(isFilled)) {
          log.debug({ title: 'Estimator skipped', details: 'One or more required fields are empty.' });
          return;
        }

        // Prepare payload
        const payload = {
          grade: String(grade),
          core: String(core),
          wrapType: String(wrapType),
          width: Number(width),
          diameter: Number(diameter),
          rollPerPack: Number(rpp)
        };

        // Call external API
        const headers = {
          'Authorization': `Bearer ${BEARER}`,
          'Content-Type': 'application/json'
        };

        let response;
        try {
          response = https.post({ url: API_URL, headers, body: JSON.stringify(payload) });
        } catch (httpErr) {
          log.error({ title: 'HTTP POST failed', details: httpErr });
          return; // fail gracefully
        }

        if (!response || response.code < 200 || response.code >= 300) {
          log.error({ title: 'Bad response from estimator', details: `Status ${response && response.code}: ${response && response.body}` });
          return;
        }

        let bodyJSON;
        try {
          bodyJSON = JSON.parse(response.body || '{}');
        } catch (parseErr) {
          log.error({ title: 'Estimator JSON parse error', details: parseErr });
          return;
        }

        const kg = toNumber(bodyJSON.estimatedRollWeight);
        if (!isFilled(kg)) {
          log.error({ title: 'Estimator missing weight', details: response.body });
          return;
        }

        const lbs = kg * 2.20462262185;

        // Round for storage (adjust decimals as desired)
        const kgRounded = round(kg, 3);
        const lbsRounded = round(lbs, 3);

        // Save to the two custom fields
        try {
          record.submitFields({
            type: recType,
            id: recId,
            values: {
              custitem_weight_of_sku: kgRounded,
              custitemcustitem_weight_of_skuimperial: lbsRounded
            },
            options: { enableSourcing: false, ignoreMandatoryFields: true }
          });
          log.audit({ title: 'Estimator success', details: { itemId: recId, kg: kgRounded, lbs: lbsRounded } });
        } catch (sfErr) {
          log.error({ title: 'submitFields failed', details: sfErr });
        }
      } catch (e) {
        log.error({ title: 'afterSubmit top-level error', details: e });
      }
    };

    return { afterSubmit };
  }
);
