/**
 * @NApiVersion 2.x
 * @NScriptType UserEventScript
 * @NModuleScope SameAccount
 */

/***************************************************************************
 * Script Name      : Autobill PO UE
 * Script Id        : customscript_autobill_po_ue
 * Script Deploy Id : customdeploy_autobill_po_ue
 * Script File Name : autobill_po_ue.js
 * Script Type      : User Event
 * SuiteScript Ver  : 2.0
 * References       : 
 * Dependencies     : 
 * Libraries        : autobill.config.js
 * Author           : TC10ROD
 * Dev Version      : 1.0.0 - Initial Release - 03252020 - TC10ROD
 * TODO             : this module and other related objects were intently not following cloudtech standards as the developer originally wanted to take ownership of this module
 **************************************************************************
 */

define(['N/email', 'N/https', 'N/record', 'N/redirect', 'N/ui/serverWidget', 'N/url', 'N/task', 'N/runtime', 'N/search', './autobill.config.js'],
/**
 * @param {email} email
 * @param {https} https
 * @param {record} record
 * @param {redirect} redirect
 * @param {serverWidget} serverWidget
 * @param {url} url
 */
function(email, https, record, redirect, serverWidget, url, task, runtime, search, customConfig) {
   
	var MASTERSETUP = {};
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
    
    function beforeSubmit(scriptContext)
    {
    	MASTERSETUP = customConfig.masterSetup;
    	try
    	{
    		if(scriptContext.type == "delete")
    		{
    			return;
    		}
    		log.debug("before submit scriptContext", scriptContext)
    		log.debug("before submit runtime.executionContext", runtime.executionContext)
    	}
    	catch(e)
    	{
    		log.error("ERROR in function beforeSubimt", {stack : e.stack, message : e.message});
    	}
    }
    
    function afterSubmit(scriptContext)
    {
    	MASTERSETUP = customConfig.masterSetup;
    	try
    	{
    		var targetRecord = "";
    		if(scriptContext.type == "delete")
    		{
    			//do not end, you still need to recalculate remaining billable amount
//    			return;
    			targetRecord = scriptContext.newRecord;
        		
    		}
    		else
    		{
    			targetRecord = record.load({
        			type : scriptContext.newRecord.type,
        			id : scriptContext.newRecord.id
        		});
    		}
    		
    		var itemCount = targetRecord.getLineCount({
                sublistId : "item"
            });
    		
    		var unitPriceList = [];
    		for(var a = 0 ; a < itemCount ; a++)
    		{
    		    var unitprice = targetRecord.getSublistValue({
    		        sublistId : "item",
    		        fieldId : "rate",
    		        line : a
    		    });
    		    var unitpriceFormatted = MASTERSETUP.functions.unitpriceformat(unitprice);
    		    unitPriceList.push(unitpriceFormatted);
    		}
    		
    		var submittedPoId = record.submitFields({
                type : "purchaseorder",
                id : scriptContext.newRecord.id,
                values : {
                    custbody_autobill_unitpricelist : unitPriceList.join("")
                }
            });
    		log.debug("update unitpricelist field", submittedPoId);
    		
    		//reset reference
    		targetRecord = record.load({
                type : scriptContext.newRecord.type,
                id : scriptContext.newRecord.id
            });
    		

            var totalAmountBilled = 0;
            
            var poRecord = record.load({
                type : "purchaseorder",
                id : scriptContext.newRecord.id
            });
            
            var poTotalAmount = poRecord.getValue({
                fieldId : "total"
            });
            poTotalAmount = parseFloat(poTotalAmount);
            
            var linksSublistCount = poRecord.getLineCount({
                sublistId : "links",
            });
            log.debug("linksSublistCount", linksSublistCount);
            for(var a = 0 ; a < linksSublistCount ; a++)
            {
                var linksType = poRecord.getSublistValue({
                    sublistId : "links",
                    fieldId : "type",
                    line : a
                });
                log.debug("linksType index : " + a, linksType);
                if(linksType == "Vendor Bill")
                {
                    var linksTotal = poRecord.getSublistValue({
                        sublistId : "links",
                        fieldId : "total",
                        line : a
                    });
                    
                    totalAmountBilled += parseFloat(linksTotal)
                }
            }
            
            var submittedPoId = record.submitFields({
                type : "purchaseorder",
                id : scriptContext.newRecord.id,
                values : {
                    custbody_remainingbillableamount : poTotalAmount - totalAmountBilled
                }
            });
            
            log.debug("submittedPoId", submittedPoId);
        
    		
    		log.debug("after submit scriptContext", scriptContext)
    		log.debug("after submit runtime.executionContext", runtime.executionContext)
    	}
    	catch(e)
    	{
    		log.error("ERROR in function afterSubmit", {stack : e.stack, message : e.message});
    	}
    }
    
    return {
        beforeLoad: beforeLoad,
        beforeSubmit: beforeSubmit,
        afterSubmit: afterSubmit,
    };
    
});
