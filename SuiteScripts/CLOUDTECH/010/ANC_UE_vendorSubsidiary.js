/**
 * @NApiVersion 2.1
 * @NScriptType UserEventScript
 * @NModuleScope Public
 */

/**
 * Script Name          :   COS_UE_consumptionDemandReport
 * File Name            :   COS_UE_consumptionDemandReport.js
 * 
 * Description          :   
 * 
 * Dependencies         :   format--- <this File Name> <is used by/uses> <this Dependency>
 * Libraries            :   
 * 
 * Version              :   1.0.0 initial version
 * 
 * @Author Rodmar Dimasaca
 * @Email netrodsuite@gmail.com
 * @Project ANC
 * @Date Aug 17, 2023
 * @Filename ANC_UE_applyVendorSubsidiary.js
 * 
 * Notes                :   
 * 
 * TODOs                :   
 * 
 */
define(['N/record'],
/**
 * @param {record} record
 * 
 */
function(record) {
   
    /**
     * Function definition to be triggered before record is loaded.
     *
     * @param {Object} scriptContext
     * @param {Record} scriptContext.newRecord - New record
     * @param {string} scriptContext.type - Trigger type
     * @Since 2015.2
	 * @governance 0
     */
    function beforeSubmit(scriptContext)
    {
    	try
    	{
            // log.debug("scriptContext.type", scriptContext.type)
            if(scriptContext.type == "create" || scriptContext.type == "edit" || scriptContext.type == "xedit")
            {
                var subsidiaryList = [1,5,6,4,2,7];

                var representingsubsidiary = scriptContext.newRecord.getValue({
                    fieldId : "representingsubsidiary"
                })

                subsidiaryList = subsidiaryList.filter(elem => {
                    if(elem == representingsubsidiary)
                    {
                        return false;
                    }
                    else{
                        return true;
                    }
                })
                log.debug("representingsubsidiary", {representingsubsidiary, id : scriptContext.newRecord.id, subsidiaryList});

                var currentLineCount = scriptContext.newRecord.getLineCount({
                    sublistId : "submachine"
                });
                log.debug("currentLineCount", currentLineCount)
                for(var a = 0 ; a < subsidiaryList.length ; a++)
                {
                    if(representingsubsidiary == subsidiaryList[a])
                    {
                        continue;
                    }
                    var subsidiaryIndex = scriptContext.newRecord.findSublistLineWithValue({
                        sublistId : "submachine",
                        fieldId : "subsidiary",
                        value : subsidiaryList[a]
                    });
                    log.debug("subsidiaryIndex", subsidiaryIndex);
                    if(subsidiaryIndex == -1)
                    {
                        scriptContext.newRecord.setSublistValue({
                            sublistId : "submachine",
                            fieldId : "subsidiary",
                            value : subsidiaryList[a],
                            line : currentLineCount
                        })
                        // scriptContext.newRecord.setSublistValue({
                        //     sublistId : "submachine",
                        //     fieldId : "taxitem",
                        //     value : 11, //11 is AB5%
                        //     line : currentLineCount
                        // })
                        currentLineCount++;
                        //standard mode only, cant use selectNewLine
                        // scriptContext.newRecord.selectNewLine({
                        //     sublistId : "submachine",
                        //     subsidiary : subsidiaryList[a]
                        // })
                    }
                }
				
            }
    	}
    	catch(e)
    	{
    		log.error("ERROR in function beforeSubmit", {stack : e.stack, message : e.message});
    	}
    }
    
    return {
        beforeSubmit: beforeSubmit,
    };
    
});
