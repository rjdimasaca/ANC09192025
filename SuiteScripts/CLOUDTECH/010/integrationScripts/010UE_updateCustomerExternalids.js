/**
 * @NApiVersion 2.x
 * @NScriptType UserEventScript
 * @NModuleScope SameAccount
 */
define(['N/record', 'N/runtime', 'N/search'],
/**
 * @param {record} record
 * @param {runtime} runtime
 * @param {search} search
 */
function(record, runtime, search) {
   
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
            if(scriptContext.type != "delete")
            {
                log.debug("rectype, recid", {rectype : scriptContext.newRecord.type, recId : scriptContext.newRecord.id});
                var wmid = scriptContext.newRecord.getValue({
                    fieldId : "custentity_wmid"
                })
                if(wmid)
                {
                    var fieldsToUpdate = {externalid : "WM" + wmid}
                    var submittedRecordId = record.submitFields({
                        type: scriptContext.newRecord.type,
                        id: scriptContext.newRecord.id,
                        values : fieldsToUpdate
                    });
                    //you can actually just trigger a submission because there is a UE deployed that would take care of setting the externalids
                    log.debug("submittedRecordId", submittedRecordId);
                }
            }
        }
        catch(e)
        {
            log.error("ERROR in function afterSubmit", e.message);
        }
    }

    return {
        afterSubmit: afterSubmit
    };
    
});
