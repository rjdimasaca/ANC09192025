/**
 * @NApiVersion 2.x
 * @NScriptType UserEventScript
 * @NModuleScope SameAccount
 */
define(['N/record', 'N/redirect', 'N/url'],

function(record, redirect, url) {
   
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
            //var targetRec = scriptContext.newRecord;
            var targetRec = scriptContext.oldRecord;
            var createdFromAllocation_text = targetRec.getText({
                fieldId : "parentexpensealloc"
            });
            var createdFromAllocation_id = targetRec.getValue({
                fieldId : "parentexpensealloc"
            });
  
            log.debug("createdFromAllocation_id", createdFromAllocation_id);
            log.debug("createdFromAllocation_text", createdFromAllocation_text);
            
            if(createdFromAllocation_text)
            {
                var lineSublistCount = targetRec.getLineCount({sublistId : "line"});
                log.debug("lineSublistCount", lineSublistCount);
                for(var a = 0 ; a < lineSublistCount ; a++)
                {
                    var targetRec_targetlinememo = targetRec.getSublistValue({sublistId : "line", fieldId : "memo", line : a});
                    log.debug("targetRec_targetlinememo", targetRec_targetlinememo);
                    targetRec.setSublistValue({sublistId : "line", fieldId : "memo", line : a, value : targetRec_targetlinememo + " : " + createdFromAllocation_text});
                }
            }
        }
        catch(e)
        {
            log.error("ERROR in function beforeSubmit", e.message);
        }
    }
    
    function afterSubmit(scriptContext)
    {
        try
        {
            if(scriptContext.type == "create")
            {
                var targetRecId = scriptContext.newRecord.id;
                var targetRecType = scriptContext.newRecord.type;
                
                var targetRec = record.load({
                    type : targetRecType,
                    id : targetRecId
                })
                
                var createdFromAllocation_text = targetRec.getText({
                    fieldId : "parentexpensealloc"
                });
                var createdFromAllocation_id = targetRec.getValue({
                    fieldId : "parentexpensealloc"
                });
      
                log.debug("createdFromAllocation_id", createdFromAllocation_id);
                log.debug("createdFromAllocation_text", createdFromAllocation_text);
                
                if(createdFromAllocation_text)
                {
                    var lineSublistCount = targetRec.getLineCount({sublistId : "line"});
                    log.debug("lineSublistCount", lineSublistCount);
                    for(var a = 0 ; a < lineSublistCount ; a++)
                    {
                        var targetRec_targetlinememo = targetRec.getSublistValue({sublistId : "line", fieldId : "memo", line : a});
                        log.debug("targetRec_targetlinememo", targetRec_targetlinememo);
                        targetRec.setSublistValue({sublistId : "line", fieldId : "memo", line : a, value : targetRec_targetlinememo + " : " + createdFromAllocation_text});
                    }
                }
                
                targetRec.save();
            }
        }
        catch(e)
        {
            log.error("ERROR in function beforeSubmit", e.message);
        }
    }
    
    function beforeLoad(scriptContext)
    {
        try
        {
            log.debug("beforeLoad triggered", scriptContext);
            if(scriptContext.type == "view")
            {
                var targetRecId = scriptContext.newRecord.id;
                var targetRecType = scriptContext.newRecord.type;
                var targetRec = record.load({
                    type : targetRecType,
                    id : targetRecId
                })
                var parentexpensealloc_val = targetRec.getValue({
                    fieldId : "parentexpensealloc_val"
                });
                log.debug("parentexpensealloc_val", parentexpensealloc_val);
                if(!parentexpensealloc_val)
                {
                    var custbody_allocmemocolumn_cmpltd_val = targetRec.getValue({
                        fieldId : "custbody_allocmemocolumn_cmpltd"
                    });
                    log.debug("custbody_allocmemocolumn_cmpltd_val", custbody_allocmemocolumn_cmpltd_val);
                    if(!custbody_allocmemocolumn_cmpltd_val || custbody_allocmemocolumn_cmpltd_val == 'F')
                    {
                        
                        
                        var createdFromAllocation_text = targetRec.getText({
                            fieldId : "parentexpensealloc"
                        });
                        var createdFromAllocation_id = targetRec.getValue({
                            fieldId : "parentexpensealloc"
                        });
              
                        log.debug("createdFromAllocation_id", createdFromAllocation_id);
                        log.debug("createdFromAllocation_text", createdFromAllocation_text);
                        
                        if(createdFromAllocation_text)
                        {
                            var lineSublistCount = targetRec.getLineCount({sublistId : "line"});
                            log.debug("lineSublistCount", lineSublistCount);
                            for(var a = 0 ; a < lineSublistCount ; a++)
                            {
                                var targetRec_targetlinememo = targetRec.getSublistValue({sublistId : "line", fieldId : "memo", line : a});
                                log.debug("targetRec_targetlinememo", targetRec_targetlinememo);
                                targetRec.setSublistValue({sublistId : "line", fieldId : "memo", line : a, value : targetRec_targetlinememo + " : " + createdFromAllocation_text});
                            }
                        }
                        
                        targetRec.setValue({
                            fieldId : "custbody_allocmemocolumn_cmpltd",
                            value : true
                        });
                        
                        var targetRec_id = targetRec.save();
                        log.debug("targetRec_id", targetRec_id);
                        redirect.toRecord({
                            type : targetRecType, 
                            id : targetRecId,
                        });
                    }
                }
            }
        }
        catch(e)
        {
            log.debug("ERROR in function beforeLoad", e.message);
        }
    }

    return {
        //beforeSubmit: beforeSubmit, //TC10ROD getText has a problem on create mode
        afterSubmit: afterSubmit,
        beforeLoad : beforeLoad
    };
    
});
