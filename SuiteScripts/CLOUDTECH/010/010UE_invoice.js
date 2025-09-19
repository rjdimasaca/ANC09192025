/**
 * @NApiVersion 2.x
 * @NScriptType UserEventScript
 * @NModuleScope SameAccount
 * @dev_version 1.0.0 - initial release, gets shipto address from relatted IF and store it in a custom field to be used by printout - TC10ROD 08252020
 */
define(['N/record', 'N/ui/serverWidget'],
/**
 * @param {record} record
 * @param {serverWidget} serverWidget
 */
function(record, serverWidget) {
   
    /**
     * Function definition to be triggered before record is loaded.
     *
     * @param {Object} context
     * @param {Record} scriptContext.newRecord - New record
     * @param {string} scriptContext.type - Trigger type
     * @param {Form} scriptContext.form - Current form
     * @Since 2015.2
     */
    function beforeLoad(context)
    {
        if (context.type === 'print') {

            var parentRecord = context.newRecord;

            var ifId = parentRecord.getValue({
                fieldId : "custbody_010invoice_fulfillment_pair"
            });
            log.debug("ifId", ifId)
            if(ifId)
            {
                var ifRecord = record.load({
                    type : "itemfulfillment",
                    id : ifId
                });
                
                var ifRecord_shipAddressValue = ifRecord.getValue({
                    fieldId : "shipaddress"
                });

                log.debug("ifRecord_shipAddressValue", ifRecord_shipAddressValue)
                
                if(ifRecord_shipAddressValue)
                {
                    var form = context.form;
                    var field = form.addField({
                        id: 'custpage_010_if_shipaddr', //should start with custpage_
                        type: 'TEXT', //or whatever the field type is
                        label: 'Hidden field for PDF template', //won't be displayed
                    });
                    field.updateDisplayType({
                        displayType: 'HIDDEN'
                    });
                    parentRecord.setValue({
                        fieldId : "custpage_010_if_shipaddr",
                        value : ifRecord_shipAddressValue
                    });
                }
            }
        }
    }

    /**
     * Function definition to be triggered before record is loaded.
     *
     * @param {Object} scriptContext
     * @param {Record} scriptContext.newRecord - New record
     * @param {Record} scriptContext.oldRecord - Old record
     * @param {string} scriptContext.type - Trigger type
     * @Since 2015.2
     */
    function beforeSubmit(scriptContext) {

    }

    /**
     * Function definition to be triggered before record is loaded.
     *
     * @param {Object} scriptContext
     * @param {Record} scriptContext.newRecord - New record
     * @param {Record} scriptContext.oldRecord - Old record
     * @param {string} scriptContext.type - Trigger type
     * @Since 2015.2
     */
    function afterSubmit(scriptContext) {

    }

    return {
        beforeLoad: beforeLoad,
    };
    
});
