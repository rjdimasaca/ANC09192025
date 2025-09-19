/**
 * @NApiVersion 2.x
 * @NScriptType UserEventScript
 * @NModuleScope SameAccount
 */

/**
 * Script Name          : ANC_requisitionHelper.js
 * Script               : ANC Requisition Helper / customscript_anc_requisition_helper
 * Deployment           : Requisition / customdeploy_anc_requisition_helper
 * Author               : RD
 * 1.0.0                - assist in requisitions, sets column values that was claimed to be inaccessible by integration/jitterbit
 *                      - fires on before submit, rest of the entry point are disabled
 *                      - based on custbody_anc_column_values
 * 
 * Requirement          : script acting on the submission of these records,
 *                          that parses a JSON list of those item level custom fields from the header custom records
 *                          and fills in the custom columns with the supplied values
 *                          - mark sullivan
 * 
 * dependencies         : custbody_anc_column_values
 * 
 */
define(['N/record'],
/**
 * @param {record} record
 */
function(record) {
   
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
    function beforeSubmit(scriptContext)
    {
        try
        {
            //06212021 do not fire for edit mode - Mark Sullival
            if(scriptContext.type == "create" /*|| scriptContext.type == "edit" */|| scriptContext.type == "copy")
            {
                updateColumns(scriptContext.newRecord);
            }
        }
        catch(e)
        {
            log.error("ERROR in function beforeSubmit", e);
        }
        log.debug("scriptContext", scriptContext)
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
            //06212021 do not fire for edit mode - Mark Sullival
            if(scriptContext.type == "create" /*|| scriptContext.type == "edit"*/ || scriptContext.type == "copy")
            {
                var recObj = record.load({
                    type : scriptContext.newRecord.type,
                    id : scriptContext.newRecord.id
                })
                recObj = updateColumns(recObj);
                var recId = recObj.save({
                    ignoreMandatoryFields : true,
                    allowSourcing : true
                })
                log.debug("recId", recId);
            }
        }
        catch(e)
        {
            log.error("ERROR in function beforeSubmit", e);
        }
        log.debug("scriptContext", scriptContext)
    }
    
    function updateColumns(recObj)
    {
        try
        {
            log.debug("recObj", recObj)
            var column_vals_str = recObj.getValue({
                fieldId : "custbody_anc_column_values"
            });

            log.debug("column_vals_str", column_vals_str)
            try
            {
                var column_vals_obj = column_vals_str ? JSON.parse(column_vals_str) : [];
                
                log.debug("column_vals_obj", column_vals_obj);
                
                for(var a = 0 ; a < column_vals_obj.length ; a++)
                {
                    var obj = column_vals_obj[a];
                    log.debug("obj", obj)
                    if(obj)
                    {
                        for(var columnFieldId in obj)
                        {
                            try
                            {
                                //only proceed if its an actual line, with item, bec item in mandatory
                                var line_item = recObj.getSublistValue({
                                    sublistId : "item",
                                    fieldId : "item",
                                    line : a,
                                });
                                
                                if(line_item)
                                {
                                    recObj.setSublistValue({
                                        sublistId : "item",
                                        fieldId : columnFieldId,
                                        line : a,
                                        value : obj[columnFieldId]
                                    })                                    
                                }
                                else
                                {
                                    log.debug("skipped", "not an actual line, because item is missing");
                                    break;
                                }
                                
                                log.debug("successfully set", {columnFieldId:columnFieldId, value:obj[columnFieldId]})
                            }
                            catch(e)
                            {
                                log.error("Acceptable ERROR in setting column", {columnFieldId:columnFieldId, value:obj[columnFieldId], msg : e.message})
                            }
                        }
                    }
                }
            }
            catch(e)
            {
                log.error("Acceptable ERROR parsing column_vals_str", column_vals_str);
            }
        }
        catch(e)
        {
            log.error("ERROR in function updateColumns", e);
        }
        return recObj
    }

    return {
        //beforeLoad: beforeLoad,
        beforeSubmit: beforeSubmit,
        //afterSubmit: afterSubmit
    };
    
});
