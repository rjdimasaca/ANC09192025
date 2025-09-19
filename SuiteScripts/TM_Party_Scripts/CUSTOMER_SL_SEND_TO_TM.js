/**
 *  @NApiVersion 2.1
 *  @NScriptType Suitelet
 */
define(['./TMIntegrationLib'], (tm) => ({
  onRequest(ctx){
    const recId = ctx.request.parameters.id;              // passed from button
    const res   = tm.push('CUSTOMER', recId);             // ← ONE CALL
    ctx.response.write(res);
  }
}));
