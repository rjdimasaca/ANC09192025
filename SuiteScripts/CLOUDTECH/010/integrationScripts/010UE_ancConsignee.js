/**
 * @NApiVersion 2.x
 * @NScriptType UserEventScript
 * @NModuleScope SameAccount
 * 
 * @dev_version            :   1.0.0 - 05272020
 *                                   - initial release
 *                                   - GENERAL UE SCRIPT FOR Alberta Newsprint Company Consignee
 *                                   - sets the external id to customerexternalid + consigneekey (requested by Mark Sullivan on 05262020 / skype) - TC10ROD
 *                                   
 * 
 * @dev_dependencies    :   custrecord_alberta_ns_customer, custrecord_alberta_ns_consigneekey
 * 
 * @dev_notes           :   Applies to all form, should not trigger on delete 
 * 
 */

/**
 * 
 */
define(['N/record', 'N/search'],
/**
 * @param {record} record
 * @param {search} search
 */
function(record, search) {
   
    /**
     * Function definition to be triggered before record is loaded.
     *
     * @param {Object} scriptContext
     * @param {Record} scriptContext.newRecord - New record
     * @param {string} scriptContext.type - Trigger type
     * @param {Form} scriptContext.form - Current form
     * @Since 2015.2
     */
    function beforeLoad(scriptContext) {

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
    function afterSubmit(scriptContext)
    {
        try
        {
            var isInactive = scriptContext.newRecord.getValue({
                fieldId : "isinactive"
            });
            //if inactive, then leave them alone
            if(scriptContext.type != "delete" && (!isInactive || isInactive == "F"))
            {
                var targetRecord = record.load({
                    type : scriptContext.newRecord.type,
                    id : scriptContext.newRecord.id
                });
                var targetRecord_customerId = targetRecord.getValue({
                    fieldId : "custrecord_alberta_ns_customer"
                })
                
                var targetRecord_customerId_record = targetRecord_customerId ? record.load({
                    type : "customer",
                    id : targetRecord_customerId,
                    columns : ["externalid"]
                }) : null;
                
                log.debug("targetRecord_customerId_record", targetRecord_customerId_record);
                var targetRecord_customerId_externalId = targetRecord_customerId_record ? targetRecord_customerId_record.getValue({
                    fieldId : "externalid"
                }) : "";
                
                log.debug("targetRecord_customerId_externalId", targetRecord_customerId_externalId)
                
                var targetRecord_consigneeKey = targetRecord.getValue({
                    fieldId : "custrecord_alberta_ns_consigneekey"
                });
                
                var finalExternalId = targetRecord_consigneeKey + "-" + targetRecord_customerId_externalId;
                
                var successful = false;
                var attemptCounter = 0;
                while(!successful)
                {
                    try
                    {
                        var suffix = (attemptCounter > 0) ? ("_DUP_" + attemptCounter) : "";
                        var submittedRecordId = record.submitFields({
                            type : scriptContext.newRecord.type,
                            id : scriptContext.newRecord.id,
                            values : {
                                externalid : finalExternalId + suffix
                            }
                        });
                        
                        log.debug("submittedRecordId", submittedRecordId);
                        successful = true;
                    }
                    catch(e)
                    {
                        log.debug("ERROR in trying to submit external id", e.message);
                        successful = false;
                        attemptCounter ++;
                    }
                }
            }
        }
        catch(e)
        {
            log.error("ERROR in function afterSubmit : message", e.message);
            log.error("ERROR in function afterSubmit : stacktrace", e.stack);
        }
    }

    return {
        beforeLoad: beforeLoad,
        beforeSubmit: beforeSubmit,
        afterSubmit: afterSubmit
    };
    
});
