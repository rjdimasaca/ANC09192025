/**
 *  @NApiVersion 2.1
 *  @NScriptType Suitelet
 */
define(['./TMIntegrationLib'], tm => ({
  onRequest(ctx){
    const id  = ctx.request.parameters.id;
    const res = tm.push('LOAD', id);
    ctx.response.write(res);
  }
}));
