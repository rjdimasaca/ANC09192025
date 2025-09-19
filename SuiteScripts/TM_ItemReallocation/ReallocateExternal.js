/**
 * @NApiVersion 2.1
 * @NScriptType Suitelet
 * @NModuleScope Public
 */

define(['N/ui/serverWidget', 'N/search', 'N/https', 'N/log'],
function (ui, search, https, log) {

  const BEARER_TOKEN = 'iryj8ibMLTLKOZa1HtOcSixzkmNjt16OPKhLNiIUDno';
  const PRODUCT_STATE_URL = 'https://netsuitetest.anchub.ca/netsuite/productinventorystate';
  const INVENTORY_TRANSFER_URL = 'https://netsuitetest.anchub.ca/netsuite/inventorytransfer';

  // ---------- utils ----------
  const toNumber = (v, d=0)=>{ const n = parseFloat(v); return isNaN(n)?d:n; };
  const distinct = arr => Array.from(new Set(arr));

  function getItemAttributes(itemId){
    const srch = search.create({
      type:'item',
      filters:[['internalid','anyof',itemId]],
      columns:[
        'isserialitem','itemid','displayname',
        'custitem_anc_grade','custitem_anc_core','custitem_anc_wraptype',
        'custitem_roll_width_metric','custitem_roll_diameter_metric','custitem_roll_rpp'
      ]
    });
    const rows = srch.run().getRange({start:0,end:1});
    if(!rows||!rows.length) return null;
    const r = rows[0];
    return {
      isSerial: r.getValue('isserialitem')===true||r.getValue('isserialitem')==='T',
      itemId: r.getValue('itemid'),
      displayName: r.getValue('displayname')||'',
      // list/record-type fields require getText
      grade: r.getText('custitem_anc_grade'),
      core: r.getText('custitem_anc_core'),
      wrapType: r.getText('custitem_anc_wraptype'),
      width: r.getValue('custitem_roll_width_metric'),
      diameter: r.getValue('custitem_roll_diameter_metric'),
      rpp: r.getValue('custitem_roll_rpp')
    };
  }
  function hasAllAttributes(a){
    if(!a) return false;
    for(const k of ['grade','core','wrapType','width','diameter','rpp']){
      const v=a[k]; if(v==null || (typeof v==='string' && !v.trim())) return false;
    }
    return true;
  }

  function postJson(url, body){
    const bodyStr = JSON.stringify(body);
    log.audit('HTTP POST → '+url, bodyStr);
    const resp = https.post({ url, headers:{ 'Content-Type':'application/json', 'Authorization':'Bearer '+BEARER_TOKEN }, body: bodyStr });
    log.audit('HTTP RESP ← '+url, 'code='+resp.code+' body='+resp.body);
    return resp;
  }

  // ---------- UI builders ----------
  function addClientScript(form){
    var html = form.addField({ id:'custpage_inline_js', type: ui.FieldType.INLINEHTML, label:' '});
    // Safe inline script without raw </script> or unescaped newlines
    html.defaultValue = '<scr'+'ipt type="text/javascript"'+'>'
      + 'function ancSetAction(a){try{document.getElementById("custpage_action").value=a;document.forms[0].submit();}catch(e){alert(e.message||e);}}'
      + '</scr'+'ipt>';
  }

  function buildBaseForm(title){
    const form = ui.createForm({ title: title||'Product Inventory State & Reallocation' });

    // hidden action: 'fetch' or 'transfer'
    const actionFld = form.addField({ id:'custpage_action', type: ui.FieldType.TEXT, label:'Action' });
    actionFld.updateDisplayType({ displayType: ui.FieldDisplayType.HIDDEN });

    // location (native selector)
    const loc = form.addField({ id:'custpage_location', type: ui.FieldType.SELECT, label:'Warehouse Location', source:'location' });
    loc.isMandatory = true;

    // item (native selector only)
    const item = form.addField({ id:'custpage_item', type: ui.FieldType.SELECT, label:'Item', source:'item' });
    item.isMandatory = true;

    const itemHelp = form.addField({ id:'custpage_item_help', type: ui.FieldType.INLINEHTML, label:' '});
    itemHelp.defaultValue = '<div style="color:#666;margin-top:4px">Use the magnifying glass to search items. Only <b>serialized</b> items where Grade/Core/Wrap Type/Width/Diameter/RPP are set will return inventory.</div>';

    // button row – two logical actions using client JS
    form.addButton({ id:'custpage_btn_fetch', label:'Fetch Inventory', functionName:'ancSetAction("fetch")' });
    form.addButton({ id:'custpage_btn_transfer', label:'Submit Transfer', functionName:'ancSetAction("transfer")' });

    addClientScript(form);
    return form;
  }

  function addResultsSublist(form, data){
    const sub = form.addSublist({ id:'custpage_results', type: ui.SublistType.LIST, label:'Inventory Records' });
    sub.addField({ id:'col_order', type: ui.FieldType.TEXT, label:'Mill Order #' });
    sub.addField({ id:'col_line', type: ui.FieldType.TEXT, label:'Line' });
    sub.addField({ id:'col_ordertype', type: ui.FieldType.TEXT, label:'Order Type' });
    sub.addField({ id:'col_quality', type: ui.FieldType.TEXT, label:'Quality Status' });
    sub.addField({ id:'col_rollsfinished', type: ui.FieldType.INTEGER, label:'Rolls Finished' });
    sub.addField({ id:'col_rollsloaded', type: ui.FieldType.INTEGER, label:'Rolls Loaded' });
    sub.addField({ id:'col_intransit', type: ui.FieldType.INTEGER, label:'Rolls In Transit' });
    sub.addField({ id:'col_weightfinished', type: ui.FieldType.FLOAT, label:'Weight Finished' });

    for(let i=0;i<(data||[]).length;i++){
      const rec=data[i]||{}; const q=(rec.quantities&&rec.quantities[0])||{};
      const lineNo = (rec.orderLink && (rec.orderLink.LINE || rec.orderLink.line || 0))+'';
      sub.setSublistValue({ id:'col_order', line:i, value:(rec.orderLink&&rec.orderLink.millOrderNumber)||'' });
      sub.setSublistValue({ id:'col_line', line:i, value: lineNo });
      sub.setSublistValue({ id:'col_ordertype', line:i, value:(rec.orderLink&&rec.orderLink.orderType)||'' });
      sub.setSublistValue({ id:'col_quality', line:i, value:q.qualityStatus?String(q.qualityStatus):'' });
      if(q.rollsFinished!=null) sub.setSublistValue({ id:'col_rollsfinished', line:i, value:String(q.rollsFinished) });
      if(q.rollsLoaded!=null) sub.setSublistValue({ id:'col_rollsloaded', line:i, value:String(q.rollsLoaded) });
      if(q.rollsIntransit!=null) sub.setSublistValue({ id:'col_intransit', line:i, value:String(q.rollsIntransit) });
      if(q.weightFinished!=null) sub.setSublistValue({ id:'col_weightfinished', line:i, value:String(q.weightFinished) });
    }
  }

  function addReallocationSection(form, data){
    form.addField({ id:'custpage_div', type: ui.FieldType.INLINEHTML, label:' ' }).defaultValue = '<hr style="margin:16px 0">';
    form.addFieldGroup({ id:'custpage_realloc_grp', label:'Reallocate Rolls (Finished/Reserved)' });

    const orders = distinct((data||[]).map(r=> (r.orderLink&&r.orderLink.millOrderNumber)||'').filter(Boolean));

    const srcO=form.addField({ id:'custpage_sourceorder', type: ui.FieldType.SELECT, label:'Source Order #', container:'custpage_realloc_grp' });
    srcO.addSelectOption({ value:'', text:'' }); orders.forEach(o=>srcO.addSelectOption({ value:o, text:o }));

    const tgtO=form.addField({ id:'custpage_targetorder', type: ui.FieldType.SELECT, label:'Target Order #', container:'custpage_realloc_grp' });
    tgtO.addSelectOption({ value:'', text:'' }); orders.forEach(o=>tgtO.addSelectOption({ value:o, text:o }));

    form.addField({ id:'custpage_sourceline', type: ui.FieldType.INTEGER, label:'Source Order Line #', container:'custpage_realloc_grp' });
    form.addField({ id:'custpage_targetline', type: ui.FieldType.INTEGER, label:'Target Order Line #', container:'custpage_realloc_grp' });
    form.addField({ id:'custpage_rolls', type: ui.FieldType.INTEGER, label:'Rolls To Transfer', container:'custpage_realloc_grp' });

    form.addField({ id:'custpage_note', type: ui.FieldType.INLINEHTML, label:' ', container:'custpage_realloc_grp' }).defaultValue=
      '<div style="color:#666;margin-top:6px">Pick source and target from the list above (derived from the results). Then click <b>Submit Transfer</b>.</div>';
  }

  // ---------- main ----------
  function onRequest(ctx){
    const req = ctx.request;

    if(req.method==='GET'){
      const form = buildBaseForm();
      ctx.response.writePage(form); return;
    }

    // POST
    const form = buildBaseForm('Inventory Results & Reallocation');

    // preserve selections
    const locationId = req.parameters.custpage_location; if(locationId) form.getField({id:'custpage_location'}).defaultValue = locationId;
    const itemId = req.parameters.custpage_item; if(itemId) form.getField({id:'custpage_item'}).defaultValue = itemId;

    const action = (req.parameters.custpage_action||'fetch').toLowerCase();

    let resultData = []; let bannerMsg=''; let bannerType='info';

    try{
      if(!locationId) throw new Error('Please select a Warehouse Location.');
      if(!itemId) throw new Error('Please select an Item.');

      const attrs = getItemAttributes(itemId);
      log.audit('Selected Item Attributes', JSON.stringify(attrs));
      if(!attrs) throw new Error('Item not found.');
      if(!attrs.isSerial) throw new Error('Selected item is not serialized.');
      if(!hasAllAttributes(attrs)) throw new Error('Selected item is missing one or more required attributes (grade, core, wrapType, width, diameter, rpp).');

      const stateBody = {
        shipperId: String(locationId),
        grade: String(attrs.grade),
        core: String(attrs.core),
        wrapType: String(attrs.wrapType),
        width: toNumber(attrs.width),
        diameter: toNumber(attrs.diameter),
        rollsPerPack: parseInt(attrs.rpp,10)||0
      };
      const stateResp = postJson(PRODUCT_STATE_URL, stateBody);
      try{ resultData = JSON.parse(stateResp.body||'[]')||[]; }catch(e){ log.error('Parse inventory response error', e); }
      log.audit('Parsed Inventory Records', 'count='+(resultData&&resultData.length||0));

      addResultsSublist(form, resultData);
      addReallocationSection(form, resultData);

      if(action==='transfer'){
        const rolls = parseInt(req.parameters.custpage_rolls,10)||0;
        const srcOrder = req.parameters.custpage_sourceorder; const tgtOrder = req.parameters.custpage_targetorder;
        const srcLine = parseInt(req.parameters.custpage_sourceline,10)||0; const tgtLine = parseInt(req.parameters.custpage_targetline,10)||0;

        if(!srcOrder||!tgtOrder) throw new Error('Please choose both Source and Target orders.');
        if(srcOrder===tgtOrder && srcLine===tgtLine) throw new Error('Source and Target cannot be identical.');
        if(rolls<=0) throw new Error('Rolls To Transfer must be > 0.');

        const tBody = {
          sourceMillOrderNumber: String(srcOrder),
          sourceMillOrderLineNumber: srcLine,
          targetMillOrderNumber: String(tgtOrder),
          targetMillOrderLineNumber: tgtLine,
          rollsToTransfer: rolls
        };
        const tResp = postJson(INVENTORY_TRANSFER_URL, tBody);
        bannerMsg = 'Transfer submitted. Response code: '+tResp.code; bannerType='success';
      }

      if(!resultData || resultData.length===0){
        bannerMsg = (bannerMsg? bannerMsg+' ' : '') + 'No inventory records returned for the selected item/location.';
        if(bannerType!=='success') bannerType='info';
      }

    }catch(e){
      bannerMsg = (e && e.message) ? e.message : 'Unexpected error'; bannerType='error';
      log.error('Suitelet Error', e);
    }

    if(bannerMsg){
      const f = form.addField({ id:'custpage_banner', type: ui.FieldType.INLINEHTML, label:' '});
      const styles = bannerType==='success'? 'background:#e6ffed;border:1px solid #b6f0c2' : (bannerType==='error'? 'background:#fff1f0;border:1px solid #ffa39e' : 'background:#fffbe6;border:1px solid #ffe58f');
      f.defaultValue = '<div style="'+styles+';padding:8px 10px;margin:10px 0;border-radius:6px">'+bannerMsg+'</div>';
    }

    ctx.response.writePage(form);
  }

  return { onRequest };
});