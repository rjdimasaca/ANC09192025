/**
 * @NApiVersion 2.x
 * @NScriptType UserEventScript
 * @NModuleScope SameAccount
 */

/**
 * 010UE_PR.js userevent on edit cannot fill the buyer field, so do it in client side instead
 */
define(['N/email', 'N/https', 'N/record', 'N/redirect', 'N/ui/serverWidget', 'N/url', 'N/runtime'],
/**
 * @param {email} email
 * @param {https} https
 * @param {record} record
 * @param {redirect} redirect
 * @param {serverWidget} serverWidget
 * @param {url} url
 */
function(email, https, record, redirect, serverWidget, url, runtime) {
   
    var APPROVED_PR_STATUS = 3;
    
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
    	var isValid = false;
    	try
    	{
        	isValid = overrideDisplay(scriptContext);
        	isValid = customizePurchaseRequisition_anc(scriptContext);
    	}
    	catch(e)
    	{
    		log.error("ERROR in function beforeLoad", {stack : e.stack, message : e.message});
    	}
    }
    
    function overrideDisplay(scriptContext)
    {
    	log.debug("overrideDisplay init")
    	var proceed = true;
    	try
    	{
    		overrideBuyerField(scriptContext);

    		overrideDocumentStatus(scriptContext);
    		overrideIsClosedColumn(scriptContext);
    	}
    	catch(e)
    	{
    		log.error("ERROR in function overrideDisplay", {stack : e.stack, message : e.message});
    		proceed = false;
    	}
    	return proceed;
    }
    
    function overrideBuyerField(scriptContext)
    {
    	try
    	{
    		log.debug("runtime.getCurrentUser().id", runtime.getCurrentUser().id);
    		
    		//010UE_PR.js userevent on edit cannot fill the buyer field, so do it in client side instead
    		
    		if(scriptContext.type == "create")//SUCCESSFULLY SETS BUYER
    		{
    			scriptContext.newRecord.setValue({
					fieldId : "custbody_010pr_buyer",
					value : runtime.getCurrentUser().id
				});
	    	}
    		else if(scriptContext.type == "edit")//WHY CANT I SET BUYER
    		{
    			scriptContext.newRecord.setValue({
					fieldId : "custbody_010pr_buyer",
					value : runtime.getCurrentUser().id
				});
    			
    			var buyerField = scriptContext.form.getField({
    				id : "custbody_010pr_buyer"
    			});
    			buyerField.defaultValue = runtime.getCurrentUser().id;
    			log.debug("buyerField.defaultValue", buyerField.defaultValue);
    		}
    		
    	}
    	catch(e)
    	{
    		log.error("ERROR in function overrideBuyerFields", e.message);
    	}
    }
    
    function overrideIsClosedColumn(scriptContext)
    {
    	try
    	{
    		if(scriptContext.type == "edit")
    		{
    			//TODO DISABLE is not working for isclosed neither on CLIENT SIDE, we can hide it though, using HIDDEN OR INLINE
        		var isClosedFieldObj = scriptContext.form.getSublist({id: 'item'}).getField({id: 'isclosed'});
        		log.debug("isClosedFieldObj", isClosedFieldObj);
        		isClosedFieldObj.isDisabled = true;
        		isClosedFieldObj.updateDisplayType({
        		    displayType : serverWidget.FieldDisplayType.INLINE
        		});
        		log.debug("disable isclose column!")
        		log.debug("isClosedFieldObj", isClosedFieldObj)
    		}
    	}
    	catch(e)
    	{
    		log.error("ERROR in function overrideIsClosedColumn", {stack : e.stack, message : e.message});
    	}
    }
    
    function overrideDocumentStatus(scriptContext)
    {
    	try
    	{
    		var targetRecord = null;
    		if(scriptContext.type == "create" || scriptContext.type == "copy")
    		{
    			prStatusText = "NEW"
    		}
    		else
    		{
    			targetRecord = scriptContext.newRecord;
    			prStatusText = scriptContext.newRecord.getText({
            		fieldId : "custbody_010pr_status"
            	}) || "";
    		}
        	var scriptContent = '<script>jQuery(".uir-record-status").html("' + prStatusText + '")</script>'
        	
        	var inlineHtmlField = scriptContext.form.addField({
        		label : "additionalscript",
        		id : "custpage_010pr_additionalscript",
        		type : "inlinehtml"
        	})
        	inlineHtmlField.defaultValue = scriptContent;
        	log.debug("scriptContent", scriptContent);
    	}
    	catch(e)
    	{
    		log.error("ERROR in function overrideDocumentStatus", {stack : e.stack, message : e.message});
    	}
    }
    
    function customizePurchaseRequisition_anc(scriptContext)
    {
//    	var clientScriptInternalId = 185019;//TODO file id of 010CS_PR.js, 02062020 was accidentally deleted, new id 196000
    	var clientScriptInternalId = 196000;//TODO file id of 010CS_PR.js
    	var proceed = true;
    	try
    	{
    		var targetRecord = scriptContext.newRecord;
    		log.debug("scriptContext", scriptContext);
    		log.debug("targetRecord", targetRecord);
    		var targetRecord_prStatus = targetRecord.getValue({
    			fieldId : "custbody_010pr_status"
    		})
    		var targetRecord_submittedFrom = targetRecord.getValue({
    			fieldId : "custbody_010submittedfrom"
    		})
    		log.debug("targetRecord_prStatus", targetRecord_prStatus);

    		/*scriptContext.form.clientScriptFileId = clientScriptInternalId;*/
    		
    		scriptContext.form.clientScriptModulePath = "./010CS_PR_UECLIENT.js";
    		
    		//1 is pending submission
    		if(!targetRecord_prStatus || targetRecord_prStatus == 1 || (targetRecord_prStatus == APPROVED_PR_STATUS && targetRecord_submittedFrom == "Reordering"))//01252020 if approved and from reordering
    		{
    			if(scriptContext.type == "view")
    			{
    				scriptContext.form.addButton({
            			id : "custpage_sendemailbtn",
            			label : "Send RFQs",
            			functionName : "showSendRfqUi"
            		})
//        			scriptContext.form.addButton({
//        				id : "custpage_010pr_approval_submit",
//        				label : "Submit For Approval",
//        				functionName : "submitForApproval(" + scriptContext.newRecord.id + ")"
//        			})
    			}
    		}
    		//TODO
    		if(scriptContext.type == "create" || scriptContext.type == "copy")
			{
    			var user_departmentId = runtime.getCurrentUser().department;
    			log.debug("user_departmentId", user_departmentId);
    			scriptContext.newRecord.setValue({
    				fieldId : "department",
    				value : user_departmentId
    			})
			}
    	}
    	catch(e)
    	{
    		log.error("ERROR in function customizePurchaseRequisition_anc", {stack : e.stack, message : e.message});
    		return false;
    	}
    	return proceed;
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
    
    function hasInventoryItem(targetRecord)
    {
        var hasInventoryItem_result = {hasInventoryItem : false};
        try
        {
            var lineCount = targetRecord.getLineCount("item");
            log.debug("lineCount", lineCount);
            for(var a = 0 ; a < lineCount ; a++)
            {
                var itemtype = targetRecord.getSublistValue({
                    sublistId : "item",
                    fieldId : "itemtype",
                    line : a
                });
                
                if(itemtype == "InvtPart")
                {
                    hasInventoryItem_result.hasInventoryItem = true;
                    break;
                }
            }
        }
        catch(e)
        {
            log.error("ERROR in function hasInventoryItem", e.message)
        }
        log.debug("hasInventoryItem_result", hasInventoryItem_result);
        return hasInventoryItem_result;
    }
    
    function beforeSubmit(scriptContext)
    {
    	try
    	{
    	    //terminate if delete mode 07012021
    	    if(scriptContext.type == "delete")
    	    {
    	        return;
    	    }
    		//dont set rate, just use the estimated total amount instead on the workflow, update: use custom rate column
//    		if(runtime.executionContext == "WORKFLOW")
    		log.debug("runtime.executionContext", runtime.executionContext)
    		setRate(scriptContext);
    		
    		var hasInventoryItem_result = hasInventoryItem(scriptContext.newRecord);
            
            if(hasInventoryItem_result.hasInventoryItem)
            {
                scriptContext.newRecord.setValue({
                    fieldId : "custbody_010pr_status",
                    value : APPROVED_PR_STATUS
                })
                //terminate you dont have to close lines
                return;
            }
    		
    		if(scriptContext.type == "create" || scriptContext.type == "copy")
    		{
    			closeLines(scriptContext)
    		}
    		else if(scriptContext.type == "edit" && scriptContext.newRecord.getValue({fieldId : "custbody_010pr_status"}) == 1)
    		{
    			closeLines(scriptContext)
    		}
    	}
    	catch(e)
    	{
    		log.error("ERROR in function beforeSubimt", {stack : e.stack, message : e.message});
    	}
    }
    

    //deprecated do it in beforesubmit
    function afterSubmit(scriptContext)
    {
    	try
    	{
    		if(scriptContext.type == "create" || scriptContext.type == "copy")
    		{
    			closeLines_as(scriptContext)
    		}
    	}
    	catch(e)
    	{
    		log.error("ERROR in function afterSubmit", {stack : e.stack, message : e.message});
    	}
    }
    
    function setRate(scriptContext)
    {
    	try
    	{
    		log.debug("setRate", setRate);
    		log.debug("setRate scriptContext.newRecord", scriptContext.newRecord);
    		log.debug("setRate scriptContext", scriptContext);
    		var targetRecord = scriptContext.newRecord
    		
    		var lineCount = targetRecord.getLineCount("item");
    		log.debug("lineCount", lineCount);
    		for(var a = 0 ; a < lineCount ; a++)
    		{
    			var estimatedRate = targetRecord.getSublistValue({
    				sublistId : "item",
    				fieldId : "estimatedrate",
    				line : a
    			}) || 0
    			log.debug("estimatedRate", estimatedRate);
    			targetRecord.setSublistValue({
    				sublistId : "item",
//    				fieldId : "rate",
    				fieldId : "custcol_010pr_cstmzd_prrate",
    				value : estimatedRate,
    				line : a
    			})
              
              	//09092021 additionally, set the searchable vendor column, this is because they want to expose this vendor in the rfq screen, where the standard povendor column is not accessible (from searches)
              	var povendor = targetRecord.getSublistValue({
    				sublistId : "item",
    				fieldId : "povendor",
    				line : a
    			}) || 0
              	log.debug("povendor", povendor);
              	targetRecord.setSublistValue({
    				sublistId : "item",
    				fieldId : "custcol_searchablelinevendor",
    				value : povendor,
    				line : a
    			})

    			log.debug("ab", a);
    		}
    		log.debug("almost done")
    	}
    	catch(e)
    	{
    		log.error("ERROR in function setRate", {stack : e.stack, message : e.message});
    	}
    	return true;
    }
    
    
    function closeLines(scriptContext)
    {
    	try
    	{
    		log.debug("closeLines scriptContext.newRecord", scriptContext.newRecord);
    		log.debug("closeLines scriptContext", scriptContext);
    		var targetRecord = scriptContext.newRecord
    		
    		var lineCount = targetRecord.getLineCount("item");
    		log.debug("lineCount", lineCount);
    		for(var a = 0 ; a < lineCount ; a++)
    		{
    			log.debug("a", a);
    			targetRecord.setSublistValue({
    				sublistId : "item",
    				fieldId : "isclosed",
    				value : true,
    				line : a
    			})
    			//just an additional layer to ensure rate = estimated rate, rate is disabled and users are only allowed to use estimated rate
    			/*var estimatedRate = targetRecord.getSublistValue({
    				sublistId : "item",
    				fieldId : "estimatedrate",
    				line : a
    			}) || 0
    			targetRecord.setSublistValue({
    				sublistId : "item",
    				fieldId : "rate",
    				value : estimatedRate,
    				line : a
    			})*/

    			log.debug("ab", a);
    		}
    		log.debug("almost done")
    	}
    	catch(e)
    	{
    		log.error("ERROR in function closelines", {stack : e.stack, message : e.message});
    	}
    	return true;
    }
    
    function closeLines_as(scriptContext)
    {
    	try
    	{
    		log.debug("closeLines_as scriptContext.newRecord 252020", scriptContext.newRecord);
    		log.debug("closeLines_as scriptContext", scriptContext);
//    		var targetRecord = scriptContext.newRecord
    		var targetRecord = record.load({
    			type : scriptContext.newRecord.type,
    			id : scriptContext.newRecord.id
    		})
    		
    		var lineCount = targetRecord.getLineCount("item");
    		log.debug("lineCount", lineCount);
    		for(var a = 0 ; a < lineCount ; a++)
    		{
    			log.debug("a", a);
    			targetRecord.setSublistValue({
    				sublistId : "item",
    				fieldId : "isclosed",
    				value : true,
    				line : a
    			})
    			//just an additional layer to ensure rate = estimated rate, rate is disabled and users are only allowed to use estimated rate
    			/*var estimatedRate = targetRecord.getSublistValue({
    				sublistId : "item",
    				fieldId : "estimatedrate",
    				line : a
    			}) || 0
    			targetRecord.setSublistValue({
    				sublistId : "item",
    				fieldId : "rate",
    				value : estimatedRate,
    				line : a
    			})*/

    			log.debug("ab", a);
    		}

    		log.debug("almost done")
    		var submittedRecordId = targetRecord.save();

    		log.debug("done", {submittedRecordId : submittedRecordId})
    	}
    	catch(e)
    	{
    		log.error("ERROR in function closelines_as", {stack : e.stack, message : e.message});
    	}
    	return true;
    }

    return {
        beforeLoad: beforeLoad,
        beforeSubmit: beforeSubmit,
//        afterSubmit: afterSubmit,
    };
    
});
