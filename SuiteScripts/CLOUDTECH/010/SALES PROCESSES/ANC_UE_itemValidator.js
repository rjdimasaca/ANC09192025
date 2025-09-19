/**
 * @NApiVersion 2.1
 * @NScriptType UserEventScript
 */
define(['N/record', 'N/search', 'N/ui/serverWidget', 'N/log', 'N/error'],
(record, search, serverWidget, log, error) => {

  /* ---------- helper -------------------------------------------------- */
  function getListText (listType, id) {
    if (!id) return '';
    const out = search.lookupFields({ type: listType, id, columns: ['name'] });
    return (out && out.name) || '';
  }

  /* ---------- beforeLoad ---------------------------------------------- */
  const beforeLoad = ctx => {
    const form = ctx.form;

    /* SKU lookup ------------------------------------------------------- */
    const skuLookup = form.addField({
      id   : 'custpage_anc_itemval_skulookup',
      label: 'SKU Lookup (Matrix Items Only)',
      type : serverWidget.FieldType.SELECT
    });
    skuLookup.addSelectOption({ value: '', text: '' });

    const itemSearch = search.create({
      type   : search.Type.SERIALIZED_INVENTORY_ITEM,
      filters: [
        ['custitem_anc_rollcore'   , 'isnotempty', ''],
        'AND', ['custitem_anc_rolldiameter', 'isnotempty', ''],
        'AND', ['custitem_anc_rollwidth'   , 'isnotempty', ''],
        'AND', ['custitem_anc_rpp'         , 'isnotempty', ''],
        'AND', ['custitem_anc_wraptype'    , 'isnotempty', ''],
        'AND', ['parent'                   , 'noneof', '@NONE@']
      ],
      columns: [
        search.createColumn({ name: 'itemid', sort: search.Sort.ASC }),
        'internalid'
      ]
    });

    const paged = itemSearch.runPaged({ pageSize: 1000 });
    paged.pageRanges.forEach(pr => {
      paged.fetch({ index: pr.index }).data.forEach(res => {
        skuLookup.addSelectOption({ value: res.id, text: res.getValue('itemid') });
      });
    });

    skuLookup.updateLayoutType({ layoutType: serverWidget.FieldLayoutType.OUTSIDEABOVE });
    skuLookup.updateBreakType ({ breakType : serverWidget.FieldBreakType.STARTCOL });

    if (ctx.type === ctx.UserEventType.CREATE) {
      const nameFld = form.getField({ id: 'name' });
      if (nameFld) {
        nameFld.defaultValue = 'Item Validator';
        nameFld.updateDisplayType({ displayType: serverWidget.FieldDisplayType.HIDDEN });
      }
    }

    /* dimension pick-lists -------------------------------------------- */
    function addSelect (id, label, listId) {
      const fld = form.addField({ id, label, type: serverWidget.FieldType.SELECT });
      fld.addSelectOption({ value: '', text: '' });
      fld.addSelectOption({ value: '_NEW_', text: '- New -' });
      search.create({ type: listId, columns: ['name'] }).run().each(r => {
        fld.addSelectOption({ value: r.id, text: r.getValue('name') });
        return true;
      });
    }
    addSelect('custpage_anc_itemval_width'   , 'Width'        , 'customlist_anc_skudim_rollwidth');
    addSelect('custpage_anc_itemval_diameter', 'Diameter'     , 'customlist_anc_skudim_rolldiameter');
    addSelect('custpage_anc_itemval_core'    , 'Core'         , 'customlist_anc_skudim_rollcore');
    addSelect('custpage_anc_itemval_rpp'     , 'Rolls Per Pack', 'customlist_anc_skudim_rpp');
    addSelect('custpage_anc_itemval_wraptype', 'Wrap Type'    , 'customlist_anc_skudim_wraptype');

    form.clientScriptModulePath = './ANC_CS_itemValidator.js';
  };

  /* ---------- beforeSubmit -------------------------------------------- */
  const beforeSubmit = ctx => {
    if (ctx.type === ctx.UserEventType.DELETE) return;

    const rec      = ctx.newRecord;
    const grade    = rec.getValue('custrecord_anc_itemval_grade');
    const diamId   = rec.getValue('custpage_anc_itemval_diameter');
    const widthId  = rec.getValue('custpage_anc_itemval_width');
    const coreId   = rec.getValue('custpage_anc_itemval_core');
    const rpp      = rec.getValue('custpage_anc_itemval_rpp');
    const wraptype = rec.getValue('custpage_anc_itemval_wraptype');

    if (!grade || !diamId || !widthId || !coreId || !rpp) {
      log.debug('beforeSubmit-ItemValidator', 'Option(s) missing – skipping SKU auto-build.');
      return;
    }

    /* grade text (parent itemid) --------------------------------------- */
    const gradeText = search.lookupFields({
      type: 'inventoryitem', id: grade, columns: ['itemid']
    }).itemid || '';

    /* 1 ▸ reuse existing matrix child if any --------------------------- */
    let skuId = '';
    search.create({
      type   : 'inventoryitem',
      filters: [
        ['type', 'anyof', 'InvtPart'],
        'AND', ['parent', 'anyof', grade],
        'AND', ['custitem_anc_rolldiameter', 'anyof', diamId],
        'AND', ['custitem_anc_rollcore'    , 'anyof', coreId],
        'AND', ['custitem_anc_rollwidth'   , 'anyof', widthId],
        'AND', ['custitem_anc_rpp'         , 'anyof', rpp],
        'AND', ['custitem_anc_wraptype'    , 'anyof', wraptype]
      ],
      columns: ['internalid']
    }).run().each(r => { skuId = r.id; return false; });

    /* 2 ▸ create child item if none ------------------------------------ */
    if (!skuId) {
      const diamTxt = getListText('customlist_anc_skudim_rolldiameter', diamId);
      const widthTxt= getListText('customlist_anc_skudim_rollwidth'   , widthId);
      const coreTxt = getListText('customlist_anc_skudim_rollcore'    , coreId);
      const rppTxt  = getListText('customlist_anc_skudim_rpp'         , rpp);
      const wrapTxt = getListText('customlist_anc_skudim_wraptype'    , wraptype);

      const child = record.create({ type: 'serializedinventoryitem', isDynamic: true });
      child.setValue({ fieldId: 'matrixtype', value: 'CHILD' });
      child.setValue({ fieldId: 'parent'    , value: grade   });
      child.setValue({
        fieldId: 'itemid',
        value  : `${gradeText}-${coreTxt}-W${widthTxt}-D${diamTxt}-RPP${rppTxt}-${wrapTxt}`
      });
      child.setValue({
        fieldId: 'matrixitemnametemplate',
        value  : '{itemid}-{custitem_anc_rollcore}-W{custitem_anc_rollwidth}-D{custitem_anc_rolldiameter}-{custitem_anc_rpp}-{custitem_anc_wraptype}'
      });
      child.setValue({ fieldId: 'matrixoptioncustitem_anc_rollwidth' , value: widthId  });
      child.setValue({ fieldId: 'matrixoptioncustitem_anc_rolldiameter', value: diamId });
      child.setValue({ fieldId: 'matrixoptioncustitem_anc_rollcore' , value: coreId  });
      child.setValue({ fieldId: 'matrixoptioncustitem_anc_rpp'      , value: rpp     });
      child.setValue({ fieldId: 'matrixoptioncustitem_anc_wraptype' , value: wraptype});
      child.setValue({ fieldId: 'taxschedule', value: 1 });
      child.setValue({ fieldId: 'assetaccount', value: 591 });
      child.setValue({ fieldId: 'cogsaccount' , value: 3613 });
      skuId = child.save({ ignoreMandatoryFields: true, enableSourcing: true });

      log.debug('beforeSubmit-ItemValidator', `Created new child item id ${skuId}`);
    }

    /* SKU text --------------------------------------------------------- */
    const skuText = search.lookupFields({
      type: 'serializedinventoryitem', id: skuId, columns: ['itemid']
    }).itemid;

    const fullName = `${skuText}`;

    /* 3 ▸ duplicate check (by NAME) ------------------------------------ */
    const dup = search.create({
      type   : 'customrecord_anc_itemvalidator',
      filters: [['name', 'is', fullName]],
      columns: ['internalid']
    }).run().getRange({ start: 0, end: 1 });

    if (dup.length) {
      throw new Error(`SKU "${fullName}" already exists. Please select it from the drop down in the salese order line.`);
    }

    /* 4 ▸ write to new record ----------------------------------------- */
    rec.setValue({ fieldId: 'custrecord_anc_itemval_sku', value: skuId });
    rec.setValue({ fieldId: 'name', value: fullName });
  };

  /* ---------- afterSubmit --------------------------------------------- */
  const afterSubmit = () => {};

  return { beforeLoad, beforeSubmit, afterSubmit };
});
