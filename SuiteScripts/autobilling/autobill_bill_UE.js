/**
 * @NApiVersion 2.x
 * @NScriptType UserEventScript
 * @NModuleScope SameAccount
 */

/***************************************************************************
 * Script Name      : Autobill Bill CS
 * Script Id        : customscript_autobill_bill_cs
 * Script Deploy Id : customdeploy_autobill_bill_cs
 * Script File Name : autobill_bill_cs.js
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

//    	log.debug("BEFORELOAD TRIGGERED, params", scriptContext.request.parameters)
    	if(scriptContext.request && scriptContext.request.parameeters && scriptContext.request.parameters.custbody_abd_createdfrom)
    	{
    		scriptContext.newRecord.setValue({
    			fieldId : "custbody_abd_createdfrom",
    			value : scriptContext.request.parameters.custbody_abd_createdfrom
    		});
    		scriptContext.newRecord.setValue({
    			fieldId : "approvalstatus",
    			value : 1
    		});
    		
    		var abdRecord = record.load({
    			type : "customrecord_autobilldata",
    			id : scriptContext.request.parameters.custbody_abd_createdfrom
    		});
    		var abdRequestData = abdRecord.getValue({
    			fieldId : "custrecord_autobilldata_requestdata"
    		});
    		if(abdRequestData)
    		{
    			abdRequestData = JSON.parse(abdRequestData);
        		var abdTotal = abdRequestData.amount;
        		
//        		abdTotal = "111"
        		if(abdTotal)
        		{
            		scriptContext.newRecord.setValue({
            			fieldId : "usertotal",
            			value : abdTotal
            		});
            		
        		}
    		}
    		
    		var updateAbdField = scriptContext.form.addField({
    			id : "custpage_update_abd",
    			type : "checkbox",
    			label : "Update ABD"
    		});
    		
    		updateAbdField.defaultValue = "T";
    		updateAbdField.updateDisplayType({
    			displayType : serverWidget.FieldDisplayType.DISABLED
    		})
    		
    		scriptContext.form.insertField({
    		    field : updateAbdField,
    		    nextfield : 'custbody_abd_createdfrom'
    		});
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
    		
    		
    		var createdFrom = "";
    		
    		var purchaseOrderCount = targetRecord.getLineCount({
    			sublistId : "purchaseorders"
    		});
    		
    		if(purchaseOrderCount && purchaseOrderCount > 0)
    		{
    			//there is no created from in bill. get the po from the sublist.
    			//TODO multiple PO will break the design
     			createdFrom = targetRecord.getSublistValue({
    				sublistId : "purchaseorders",
        			fieldId : "id",
        			line : 0
        		});
    		}
    		
    		
    		log.debug("createdFrom", createdFrom);
    		if(createdFrom)
    		{
    			var totalAmountBilled = 0;
    			
    			var createdFrom_record = record.load({
    				type : "purchaseorder",
    				id : createdFrom
    			});
    			
    			var poTotalAmount = createdFrom_record.getValue({
    				fieldId : "total"
    			});
    			poTotalAmount = parseFloat(poTotalAmount);
    			
    			var linksSublistCount = createdFrom_record.getLineCount({
    				sublistId : "links",
        		});
    			log.debug("linksSublistCount", linksSublistCount);
    			for(var a = 0 ; a < linksSublistCount ; a++)
    			{
    				var linksType = createdFrom_record.getSublistValue({
        				sublistId : "links",
            			fieldId : "type",
            			line : a
            		});
    				log.debug("linksType index : " + a, linksType);
    				if(linksType == "Vendor Bill")
    				{
    					var linksTotal = createdFrom_record.getSublistValue({
            				sublistId : "links",
                			fieldId : "total",
                			line : a
                		});
    					
    					totalAmountBilled += parseFloat(linksTotal)
    				}
    			}
    			
    			var submittedPoId = record.submitFields({
    				type : "purchaseorder",
    				id : createdFrom,
    				values : {
    					custbody_remainingbillableamount : poTotalAmount - totalAmountBilled
    				}
    			});
    			
    			log.debug("submittedPoId", submittedPoId);
    		}
    		
    		//UPDATE ABD UEs DONT CHAIN so THEY MUST BE EXPLICITLY DONE
    		var updateAbdCheckboxValue = scriptContext.newRecord.getValue({
    			fieldId : "custpage_update_abd"
    		});
    		if(updateAbdCheckboxValue && updateAbdCheckboxValue!= "F")
    		{
    			var targetAbdValue = scriptContext.newRecord.getValue({
        			fieldId : "custbody_abd_createdfrom"
        		});
        		if(targetAbdValue)
        		{
        			var submittedAbdRecordId = record.submitFields({
        				type : "customrecord_autobilldata",
        				id : targetAbdValue,
        				values : {
        					custrecord_abd_status : 4, //4 is completed,
        					custrecord_abd_relatedpo : createdFrom,
        					custrecord_abd_relatedbill : scriptContext.newRecord.id,
        					custrecord_abd_message : "Manually created Bill with internalid : " + scriptContext.newRecord.id
        				}
        			})
        			
        			log.debug("submittedAbdRecordId", submittedAbdRecordId);
        		}
        		
        		redirect.toRecord({
        			type : "customrecord_autobilldata",
        			id : submittedAbdRecordId,
        			params : {showManualUpdateMsg : true}
        		})
    		}
    		
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
