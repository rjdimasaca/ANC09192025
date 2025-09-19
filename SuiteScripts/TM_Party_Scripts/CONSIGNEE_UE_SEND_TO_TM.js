/**
 *  SEND-TO-TM  – final version
 *  @NApiVersion 2.1
 *  @NScriptType UserEventScript
 */
define(['N/url', 'N/log'], (url, log) => {

  // use either numeric INTERNAL IDs …
  const SL_SCRIPT_ID      = '5725';   // ← internal Script ID as string
  const SL_DEPLOYMENT_ID  = '1';      // ← internal Deployment ID as string

  /* …or the string IDs; both work as long as you keep the
     property names `scriptId` / `deploymentId`: 
     const SL_SCRIPT_ID     = 'customscript_send_to_tm_sl';
     const SL_DEPLOYMENT_ID = 'customdeploy_send_to_tm_sl';
  */

  const beforeLoad = ctx => {
    if (ctx.type !== ctx.UserEventType.VIEW) return;

    let handler;                      // will become an IIFE string

    try {
      const suiteletUrl = url.resolveScript({
        scriptId     : SL_SCRIPT_ID,
        deploymentId : SL_DEPLOYMENT_ID,
        params       : { id: ctx.newRecord.id }
      });
      log.audit('Suitelet URL', suiteletUrl);

      handler = `(function(){window.location.href='${suiteletUrl.replace(/'/g,"\\'")}';})`;

    } catch (e) {
      log.error({ title: 'resolveScript failed', details: e });
      handler = `(function(){alert('Send To TM not available');})`;
    }

    try {
      ctx.form.addButton({
        id          : 'custpage_send_to_tm',
        label       : 'Send To TM',
        functionName: handler       // NetSuite will append “()”
      });
    } catch (e) {
      log.error({ title: 'addButton failed', details: e });
    }
  };

  return { beforeLoad };
});
