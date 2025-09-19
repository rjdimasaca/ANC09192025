/**
 * @NApiVersion 2.x
 * @NScriptType UserEventScript
 * @NModuleScope SameAccount
 */

/**
 * Script Name      : ANC_externalIdHelper.js
 * Script           : ANC External Id Helper / customscript_anc_externalidhelper
 * Deployment       : Vendor : customdeploy_anc_externalidhelper_vendor
 * Author           : RD
 * 1.0.0                - assist in requisitions, sets column values that was claimed to be inaccessible by integration/jitterbit
 *                      - runs on aftersubmit, because beforeSubmit .setValue on externalid doesnt work
 *       
 * requirement      :   check the value in the WMID custom field on the vendor record,
 *                      and if a number is provided there, confirm if the numberic portion of the exernal ID matches this. 
 *                      If they do not match, update the vendor external ID to CAR#### with this number
 *                      - Mark Sullivan
 * 
 * dependencies : 
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
            if(scriptContext.type == "create" || scriptContext.type == "edit" || scriptContext.type == "copy")
            {
                updateExternalId(scriptContext.newRecord);
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
            if(scriptContext.type == "create" || scriptContext.type == "edit" || scriptContext.type == "copy")
            {
                var recObj = record.load({
                    type : scriptContext.newRecord.type,
                    id : scriptContext.newRecord.id
                })
                recObj = updateExternalId(recObj);
                
                log.debug("recObj.flaggedAsChanged", recObj.flaggedAsChanged);
                
                if(recObj.flaggedAsChanged)
                {
                    var recId = recObj.save({
                        ignoreMandatoryFields : true,
                        allowSourcing : true
                    })
                    log.debug("recId", recId);
                }
                
            }
        }
        catch(e)
        {
            log.error("ERROR in function beforeSubmit", e);
        }
        log.debug("scriptContext", scriptContext)
    }
    
    function updateExternalId(recObj)
    {
        try
        {
            try
            {
                log.debug("recObj", recObj)
                var body_wmid = recObj.getValue({
                    fieldId : "custentity_wmid"
                });
                
                if(body_wmid)
                {
                    var body_wmid_numeric = body_wmid;
                    var body_wmid_first_3_chars = body_wmid.substring(0, 3);
                    if(body_wmid_first_3_chars == "CAR")
                    {
                        body_wmid_numeric = body_wmid.substring(3);
                    }
                    
                    log.debug("wmid vars", {body_wmid_numeric:body_wmid_numeric,body_wmid_first_3_chars:body_wmid_first_3_chars})
                    
                    if(body_wmid_numeric)
                    {
                        var body_externalid = recObj.getValue({
                            fieldId : "externalid"
                        });
                        var body_externalid_numeric = body_externalid;
                        
                        var body_externalid_first_3_chars = body_wmid.substring(0, 3);
                        if(body_externalid_first_3_chars == "CAR")
                        {
                            body_externalid_numeric = body_externalid.substring(3);
                        }
                        
                        log.debug("externalid vars", {body_externalid_numeric:body_externalid_numeric,body_externalid_first_3_chars:body_externalid_first_3_chars})
                        
                        
                        if(body_externalid_numeric != body_wmid_numeric)
                        {
                            var newExternalId = "CAR" + body_wmid_numeric;
                            //newExternalId += "rod"
                            
                            recObj.setValue({
                                fieldId : "externalid",
                                value : newExternalId
                            })
                            recObj.flaggedAsChanged = true;
                            
                            log.debug("successfully updated newExternalId to:", newExternalId)
                        }
                        else
                        {
                            log.debug("no need to update externalid", {body_externalid_numeric:body_externalid_numeric, body_wmid_numeric:body_wmid_numeric})
                        }
                    }
                    else
                    {
                        log.debug("no need to update externalid, body_wmid_numeric:", body_wmid_numeric)
                    }
                }
            }
            catch(e)
            {
                log.error("Acceptable ERROR setting externalid", e.message);
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
        //beforeSubmit: beforeSubmit,
        afterSubmit: afterSubmit
    };
    
});
