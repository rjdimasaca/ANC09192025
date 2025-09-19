/**
 * @NApiVersion 2.1
 * @NScriptType ClientScript
 * @NModuleScope SameAccount
 */
define(
  ['N/currentRecord', 'N/ui/dialog', 'N/https', 'N/url', 'N/search'],
  (currentRecord, dialog, https, url, search) => {

    /* ---------- pageInit ---------- */
    function pageInit () {
      console.log('[ItemValidator-CS] pageInit');
    }

    /* ---------- fieldChanged ---------- */
    function fieldChanged (context) {
      const rec   = context.currentRecord;
      const fldId = context.fieldId;

      /* ============================================================
       * WHEN THE USER PICKS A SKU (matrix child)…
       * → copy its parent into Grade
       * → copy all custom-dimension fields
       * ========================================================== */
      if (fldId === 'custpage_anc_itemval_skulookup') {

        const skuId = rec.getValue({ fieldId: fldId });
        if (!skuId) {
          // clear Grade if SKU is cleared
          rec.setValue({
            fieldId: 'custrecord_anc_itemval_grade',
            value:   '',
            ignoreFieldChange: true
          });
          return;
        }

        try {
          const itemData = search.lookupFields({
            type: search.Type.INVENTORY_ITEM,   // works for serialised, invt, lot
            id:   skuId,
            columns: [
              'parent',                         // ← Grade
              'custitem_anc_rollwidth',
              'custitem_anc_rolldiameter',
              'custitem_anc_rollcore',
              'custitem_anc_rpp',
              'custitem_anc_wraptype'
            ]
          });

          /* ---- Grade (parent) ---- */
          if (itemData.parent?.length) {
            const parent = itemData.parent[0];  // { value, text }
            rec.setValue({
              fieldId: 'custrecord_anc_itemval_grade',
              value:   parent.value,            // internal ID
              ignoreFieldChange: true
            });
            // If you’d like to *display* the name, create a read-only field
            // on the form and set it to parent.text here.
          }

          /* ---- custom dimensions ---- */
          const dimMap = {
            'custpage_anc_itemval_width'   : 'custitem_anc_rollwidth',
            'custpage_anc_itemval_diameter': 'custitem_anc_rolldiameter',
            'custpage_anc_itemval_core'    : 'custitem_anc_rollcore',
            'custpage_anc_itemval_rpp'     : 'custitem_anc_rpp',
            'custpage_anc_itemval_wraptype': 'custitem_anc_wraptype'
          };

          Object.keys(dimMap).forEach(uiFieldId => {
            const itmFieldId = dimMap[uiFieldId];
            const itmValArr  = itemData[itmFieldId] || [];
            if (itmValArr.length) {
              rec.setValue({
                fieldId: uiFieldId,
                value:   itmValArr[0].value,
                ignoreFieldChange: true
              });
            }
          });

        } catch (e) {
          console.error('[ItemValidator-CS] lookupFields failed', e);
          dialog.alert({
            title:   'Error',
            message: 'Could not retrieve details for the selected SKU.<br>' + e.message
          });
        }
      }


      /* ============================================================
       * “- New -” HANDLING FOR PICK-LISTS
       * (unchanged except for JSON.stringify fix)
       * ========================================================== */
      const cfg = {
        restletScriptId   : '5718',
        restletDeploymentId: '1',
        listMap: {
          'custpage_anc_itemval_width'   : 'customlist_anc_skudim_rollwidth',
          'custpage_anc_itemval_diameter': 'customlist_anc_skudim_rolldiameter',
          'custpage_anc_itemval_core'    : 'customlist_anc_skudim_rollcore',
          'custpage_anc_itemval_rpp'     : 'customlist_anc_skudim_rpp',
          'custpage_anc_itemval_wraptype': 'customlist_anc_skudim_wraptype'
        }
      };

      if (!cfg.listMap[fldId]) return;
      if (rec.getValue({ fieldId: fldId }) !== '_NEW_') return;

      const field     = rec.getField({ fieldId: fldId });
      const label     = field.label;
      const userInput = (window.prompt(`Enter new value for ${label}:`, '') || '').trim();

      if (!userInput) {
        rec.setValue({ fieldId: fldId, value: '', ignoreFieldChange: true });
        return;
      }

      if (
        fldId !== 'custpage_anc_itemval_core' &&
        fldId !== 'custpage_anc_itemval_wraptype' &&
        !/^\d+(\.\d{1,2})?$/.test(userInput)
      ) {
        dialog.alert({
          title  : 'Invalid Value',
          message: `The value for ${label} must be a positive number with up to two decimals.`
        });
        rec.setValue({ fieldId: fldId, value: '', ignoreFieldChange: true });
        return;
      }

      const dup = field.getSelectOptions().some(o => o.text === userInput);
      if (dup) {
        dialog.alert({
          title  : 'Duplicate Value',
          message: `The value "${userInput}" already exists.`
        });
        rec.setValue({ fieldId: fldId, value: '', ignoreFieldChange: true });
        return;
      }

      /* ---- call RESTlet to create a new list entry ---- */
      const restletUrl = url.resolveScript({
        scriptId        : cfg.restletScriptId,
        deploymentId    : cfg.restletDeploymentId,
        returnExternalUrl: false
      });

      const payload = {
        customlistId: cfg.listMap[fldId],
        valueName   : userInput
      };

      https.post.promise({
        url    : restletUrl,
        body   : JSON.stringify(payload),
        headers: { 'Content-Type': 'application/json' }
      })
      .then(res => {
        const result = JSON.parse(res.body || '{}');
        if (result.success) {
          field.insertSelectOption({ value: result.id, text: result.name });
          rec.setValue({ fieldId: fldId, value: result.id, ignoreFieldChange: true });
          dialog.alert({ title: 'Success', message: `Created "${result.name}".` });
        } else {
          dialog.alert({ title: 'Error', message: result.message || 'Unknown error.' });
          rec.setValue({ fieldId: fldId, value: '', ignoreFieldChange: true });
        }
      })
      .catch(err => {
        console.error('[ItemValidator-CS] RESTlet call failed', err);
        dialog.alert({
          title  : 'Script Error',
          message: 'Could not reach the server.<br>' + err.message
        });
        rec.setValue({ fieldId: fldId, value: '', ignoreFieldChange: true });
      });
    }

    /* ---------- public ---------- */
    return { pageInit, fieldChanged };
  }
);
