/**
 *  SEND-TO-TM (Carrier)
 *  @NApiVersion 2.1
 *  @NScriptType UserEventScript
 */
define(['N/url','N/log'], (url, log) => {

  /* ⇩  UPDATE with your Suitelet IDs  ⇩ */
  const SL_SCRIPT_ID     = '5727';   // internal ID or scriptId string
  const SL_DEPLOYMENT_ID = '1';      // internal Deployment ID

  const beforeLoad = ctx => {
    if (ctx.type !== ctx.UserEventType.VIEW) return;
    /* show only on vendors flagged “Is Carrier” */
    if (!ctx.newRecord.getValue('custentity_anc_vendor_iscarrier')) return;

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
      fn = `(function(){alert('Send To TM (Carrier) not available');})`;
    }

    ctx.form.addButton({
      id          : 'custpage_send_to_tm_carrier',
      label       : 'Send To TM',
      functionName: fn               // NetSuite appends “()”
    });
  };

  return { beforeLoad };
});
