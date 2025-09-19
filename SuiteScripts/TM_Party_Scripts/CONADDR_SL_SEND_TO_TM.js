/**
 *  SEND-SHIP-ADDR-TO-TM (Suitelet)
 *  @NApiVersion 2.1
 *  @NScriptType  Suitelet
 */
define(['./TMIntegrationLib'], (tm) => ({
  onRequest (ctx) {
    const addrId = ctx.request.parameters.id;          // Alt-Address internal ID
    const res    = tm.push('CONSIGNEE_SHIP_ADDRESS', addrId);
    ctx.response.write(res);                           // same pattern as Carrier SL
  }
}));
