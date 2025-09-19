/**
 *  SEND-TO-TM (Shipper / Location)  +  SO auto-send on every submit (not Pending)
 *  @NApiVersion 2.1
 *  @NScriptType UserEventScript
 */
define([
  'N/url',
  'N/log',
  './TMIntegrationLib'          // ← adjust path if needed
], (url, log, TM) => {

  /* ⇩  your existing button (unchanged) ⇩ */
  const SL_SCRIPT_ID     = '5840';
  const SL_DEPLOYMENT_ID = '1';

  const beforeLoad = (ctx) => {
    if (ctx.type !== ctx.UserEventType.VIEW) return;

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
      functionName: fn
    });
  };

  // push on EVERY submit for Sales Orders when not Pending
  const PENDING_STATUS_INTERNAL_ID = '1';

  const afterSubmit = (ctx) => {
    try {
      const rec = ctx.newRecord;
      if (String(rec?.type).toLowerCase() !== 'salesorder') return; // only SO

      const soId = rec.id;
      const statusVal = rec.getValue({ fieldId: 'custbody_anc_sostatus' });

      if (String(statusVal) === PENDING_STATUS_INTERNAL_ID) {
        log.audit('SO auto-send skipped (Pending)', { soId, statusVal });
        return;
      }

      log.audit('SO auto-send: pushing (every submit rule)', { soId, evt: ctx.type, statusVal });
      TM.push('SO', soId);

    } catch (e) {
      log.error('SO auto-send error', { err: e?.message || e });
    }
  };

  return { beforeLoad, afterSubmit };
});
