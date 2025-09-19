/**
 * @NApiVersion 2.x
 * @NScriptType UserEventScript
 * @NModuleScope SameAccount
 */
define(['N/search', 'N/email', 'N/https', 'N/record', 'N/redirect', 'N/ui/serverWidget', 'N/url', 'N/runtime'],
/**
 * @param {email} email
 * @param {https} https
 * @param {record} record
 * @param {redirect} redirect
 * @param {serverWidget} serverWidget
 * @param {url} url
 */
function(search, email, https, record, redirect, serverWidget, url, runtime) {
   
    /**
     * Function definition to be triggered before record is loaded.
     *
     * @param {Object} scriptContext
     * @param {Record} scriptContext.newRecord - New record
     * @param {string} scriptContext.type - Trigger type
     * @param {Form} scriptContext.form - Current form
     * @Since 2015.2
     */
    function beforeLoad(scriptContext)
    {
    	log.debug("1", 1);
    	var isValid = false;
    	try
    	{
            if(scriptContext.type == "create")
            {
                applyDefaulting(scriptContext);
            }
    	}
    	catch(e)
    	{
    		log.error("ERROR in function beforeLoad", {stack : e.stack, message : e.message});
    	}
    }
    
    //as of 10052021 - set default location, requested by Connie Y./Paul P./Mark S.
    function applyDefaulting(scriptContext)
    {
        try
        {
            log.debug("scriptContext", scriptContext);
            /*var targetRecord = scriptContext.newRecord;
            var itemsCount = targetRecord.getLineCount({
                sublistId : "item"
            });
            var itemIds = [];
            for(var a = 0 ; a < itemsCount ; a++)
            {
                var line_itemId = targetRecord.getSublistValue({
                    sublistId : "item",
                    fieldId : "item",
                    line : a
                });
                itemIds.push(line_itemId)
            }
            var itemSearch = search.create({
                type : "item",
                filters : ["internalid", "anyof", itemIds],
                columns : [
                               search.createColumn({
                                   name : "preferredlocation"
                               })
                           ]
            });
            
            var itemSearch_results = getResults(itemSearch.run());
            log.debug("itemSearch_results", itemSearch_results);
            
            itemMapping = {};
            itemSearch_results.map(function(res){
                
                var res_itemId = res.id;
                var res_preferredLocation = res.getValue({
                    name : "preferredlocation"
                })
                itemMapping[res_itemId] = {
                        preferredLocation : res_preferredLocation
                }
                
                return true;
            })
            log.debug("itemMapping", itemMapping);
            
            log.debug("APPLY DEFAULTING CALLED, scriptContext", scriptContext);
            
            
            for(var a = 0 ; a < itemsCount ; a++)
            {
                var line_itemId = targetRecord.getSublistValue({
                    sublistId : "item",
                    fieldId : "item",
                    line : a
                });
                
                if(itemMapping[line_itemId] && itemMapping[line_itemId].preferredLocation)
                {
                    targetRecord.setSublistValue({
                        sublistId : "item",
                        fieldId : "location",
                        value : itemMapping[line_itemId].preferredLocation,
                        line : a
                    })
                    
                    log.debug("successfully set line : " + a, itemMapping[line_itemId].preferredLocation)
                }
            }*/
            
        }
        catch(e)
        {
            log.error("ERROR in function defaulting", e.message);
        }
    }
    
    function afterSubmit(scriptContext)
    {
        
    }
    
    function beforeSubmit(scriptContext)
    {
    	try
    	{
    		if(scriptContext.type != "delete")
    		{
    			var bodyLocation = scriptContext.newRecord.getLine
    			
    			//TODO do you still want this?
//    			var lineCount = scriptContext.newRecord.getLineCount({
//        			sublistId : "item",
//        			fieldId : "location"
//        		});
//        		
//        		
//    			log.debug("BEFORE SUBMIT lineCount", lineCount);
//        		for(var a = 0 ; a < lineCount ; a++)
//        		{
//        			var currentLineLocation = scriptContext.newRecord.getSublistValue({
//        				sublistId : "item",
//        				fieldId : "location",
//        				line : a
//        			});
//        			
//        			log.debug("BEFORE SUBMIT currentLineLocation", currentLineLocation);
//        			scriptContext.newRecord.setSublistValue({
//        				sublistId : "item",
//        				fieldId : "custcol_010customlocation",
//        				line : a,
//        				value : currentLineLocation
//        			});
//        			
//        		}
    		}
    	}
    	catch(e)
    	{
    		log.error("ERROR in function beforeSubmit", e.message);
    	}
    }
    
    var getResults = function getResults(set) {
        var holder = [];
        var i = 0;
        while (true) {
            var result = set.getRange({
                start: i,
                end: i + 1000
            });
            if (!result) break;
            holder = holder.concat(result);
            if (result.length < 1000) break;
            i += 1000;
        }
        return holder;
    };

    return {
        beforeLoad: beforeLoad,
        beforeSubmit: beforeSubmit,
        afterSubmit: afterSubmit,
    };
    
});
