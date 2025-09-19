/**
 *  SEND-TO-TM (Shipper / Location)
 *  @NApiVersion 2.1
 *  @NScriptType UserEventScript
 */
define(['N/url','N/log'], (url, log) => {

  /* ⇩  UPDATE with your Suitelet IDs ⇩ */
  const SL_SCRIPT_ID     = '5729';   // scriptId or internal ID string
  const SL_DEPLOYMENT_ID = '1';      // deployment internal ID

  const beforeLoad = ctx => {
    if (ctx.type !== ctx.UserEventType.VIEW) return;

    /* show button only when consignee key present */
    if (!ctx.newRecord.getValue('custrecord_loc_consigneekey')) return;

    let fn;
    try {
      const u = url.resolveScript({
        scriptId     : SL_SCRIPT_ID,
        deploymentId : SL_DEPLOYMENT_ID,
        params       : { id : ctx.newRecord.id }
      });
      fn = `(function(){window.location.href='${u.replace(/'/g,"\\'")}';})`;
    } catch (e) {
      log.error('resolveScript failed', e);
      fn = `(function(){alert('Send To TM (Shipper) not available');})`;
    }

    ctx.form.addButton({
      id          : 'custpage_send_to_tm_shipper',
      label       : 'Send To TM',
      functionName: fn                       // NetSuite appends “()”
    });
  };

  return { beforeLoad };
});
