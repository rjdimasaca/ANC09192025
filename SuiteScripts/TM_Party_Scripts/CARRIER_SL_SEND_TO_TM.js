/**
 *  @NApiVersion 2.1
 *  @NScriptType Suitelet
 */
define(['./TMIntegrationLib'], tm => ({
  onRequest(ctx){
    const id  = ctx.request.parameters.id;     // Vendor internal ID
    const res = tm.push('CARRIER', id);        // <-- one-call
    ctx.response.write(res);
  }
}));
