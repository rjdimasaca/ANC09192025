/**
 *  @NApiVersion 2.1
 *  @NScriptType Suitelet
 */
define(['./TMIntegrationLib'], tm => ({
  onRequest(ctx){
    const id  = ctx.request.parameters.id;     // Location internal ID
    const res = tm.push('SHIPPER', id);        // ONE CALL
    ctx.response.write(res);
  }
}));
