"use strict";

/**
 * @NApiVersion 2.x
 * @NScriptType UserEventScript
 * @NModuleScope SameAccount
 * @Author Antonio E. del Rosario Jr
 * @Email aedelrosariojr@gmail.com
 */
define(['N/url', 'N/runtime'], function (url, runtime) {
  return {
    beforeLoad: function beforeLoad(context) {
      var rec = context.newRecord;
      var recordId = rec.id;
      var form = context.form;
      var url_ = url.resolveScript({
        scriptId: 'customscript_004sl_paymentregisterprint',
        deploymentId: 'customdeploy_004sl_paymentregisterprint',
        params: {
          'recId': rec.getValue({
            fieldId: 'custrecord_paymentfileadministration'
          })
        }
      });
      log.debug({
        title: 'url',
        details: url_
      });
      form.addButton({
        id: 'custpage_printpaymentregister',
        label: 'Print Payment Register',
        functionName: "window.open('" + url_ + "')"
      });
    }
  };
});

//# sourceMappingURL=004UE_printButtonPaymentFile.js.map