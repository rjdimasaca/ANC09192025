"use strict";

/**
 * @NApiVersion 2.x
 * @NScriptType UserEventScript
 * @NModuleScope SameAccount
 * @Author Antonio E. del Rosario Jr
 * @Email aedelrosariojr@gmail.com
 */
define(['N/record', 'N/search'], function (record, search) {
  return {
    afterSubmit: function afterSubmit(context) {
      var rec = context.newRecord;
      var recordId = rec.id;
      var form = context.form;

      try {
        var searchObj = search.create({
          type: 'customrecord_anc_paymentbatch',
          filters: [search.createFilter({
            name: 'custrecord_paymentfileadministration',
            operator: search.Operator.IS,
            values: [rec.id]
          })]
        });
        var searchResultSet = searchObj.run();
        var searchResults = searchResultSet.getRange({
          start: 0,
          end: 1
        }) || [];

        if (searchResults.length > 0) {
          log.audit({
            title: 'Payment Batch (ANC) already exists',
            details: 'Payment Batch (ANC) already exists for Payment File Administration internal id: ' + rec.id
          });
          return;
        }

        var newRec = record.create({
          type: 'customrecord_anc_paymentbatch'
        });
        newRec.setValue({
          fieldId: 'name',
          value: rec.getValue({
            fieldId: 'altname'
          })
        });
        newRec.setValue({
          fieldId: 'custrecord_paymentfileadministration',
          value: rec.id
        });
        newRec.save({
          enableSourcing: true,
          ignoreMandatoryFields: true
        });
      } catch (e) {
        log.error({
          title: 'Error in creating Payment Batch record',
          details: e.message
        });
      }
    }
  };
});

//# sourceMappingURL=004UE_createPaymentBatch.js.map