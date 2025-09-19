/**
 *  SEND-SHIP-ADDR-TO-TM  (User Event)
 *  Adds “Send To TM” button on Consignee Alt-Address records.
 *
 *  @NApiVersion 2.1
 *  @NScriptType  UserEventScript
 */
define(['N/url', 'N/log'], (url, log) => {

  /* UPDATE with your own IDs or scriptId strings */
  const SL_SCRIPT_ID      = '5731';
  const SL_DEPLOYMENT_ID  = '1';

  const BUTTON_ID    = 'custpage_send_shipaddr_to_tm';
  const BUTTON_LABEL = 'Send To TM';

  function beforeLoad (ctx) {
    if (ctx.type !== ctx.UserEventType.VIEW) return;  // show only in VIEW mode

    let fn;                                           // client-side handler (IIFE)

    try {
      const suiteletUrl = url.resolveScript({
        scriptId    : SL_SCRIPT_ID,
        deploymentId: SL_DEPLOYMENT_ID,
        params      : { id: ctx.newRecord.id }
      });
      log.audit('Suitelet URL', suiteletUrl);

      fn = `(function(){ window.location.href='${suiteletUrl.replace(/'/g,"\\'")}'; })`;
    } catch (e) {
      log.error({ title:'resolveScript failed', details:e });
      fn = `(function(){ alert('Send To TM not available'); })`;
    }

    try {
      ctx.form.addButton({
        id          : BUTTON_ID,
        label       : BUTTON_LABEL,
        functionName: fn   // NetSuite appends “()” automatically
      });
    } catch (e) {
      log.error({ title:'addButton failed', details:e });
    }
  }

  return { beforeLoad };
});
