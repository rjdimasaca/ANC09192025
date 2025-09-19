/**
 * @NApiVersion 2.x
 * @NScriptType UserEventScript
 * @NModuleScope SameAccount
 * 
 * @dev_version 1.0.0 - initial version
 * @dev_version 1.0.1 - added filtering by bin details as requested by Audrey Lisa on skype - TC10ROD patch with 010CS_InventoryCount.js v1.0.1
 */
define(['N/email', 'N/https', 'N/record', 'N/redirect', 'N/ui/serverWidget', 'N/url', 'N/task', 'N/runtime', 'N/search'],
/**
 * @param {email} email
 * @param {https} https
 * @param {record} record
 * @param {redirect} redirect
 * @param {serverWidget} serverWidget
 * @param {url} url
 */
function(email, https, record, redirect, serverWidget, url, task, runtime, search) {
   
	
	

	function removeLines_ss1(sublistId)
	{
		//item as default sublistid
		var sublistId = sublistId ? sublistId : "item";
		var sublistCount = window.nlapiGetLineItemCount(sublistId);
		//ss1 lineitems starts at 1
		console.log("sublistCount", sublistCount);
		for(var a = 0 ; a < sublistCount ; a++)
		{
			console.log("a", a);
			console.log("sublistCount - a", sublistCount - a);
			window.nlapiRemoveLineItem(sublistId, sublistCount - a)
		}
	}
	
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
    		customizeInventoryCount_anc(scriptContext)
    		
    		if(scriptContext.type == "create")
    		{
    		    //was avoiding suitescript 2.0 at time of writting because SS2.0 clientscript attachment are buggy, also avoiding deployments because there are lots of scripts - TC10ROD
    			var additionalScript = "<script>jQuery(document).ready(function(){";
    			additionalScript += removeLines_ss1;

    	    	additionalScript += "window.removeLines_ss1 =" + removeLines_ss1;
    	    	
				var itemSublist = scriptContext.form.getSublist({
				    id : 'item'
				});
				
				//TODO use path based method instead //NOT WORKING! TODO
//				scriptContext.form.clientScriptInternalId = 215825; //SB 010CS_InventoryCount.js
				
				//1.0.1 - written a ss2 client script function for the new bin filtering, you must make it work using 2.0
				//client took a while to get back and request this
				//it being triggered by a button instead of a fieldchange has been realized after writting the function code, and it is already working, it just needs to be invoked by a button click instead of a fieldchange
				//it might be because clientScriptInternalId was used instead of clientScriptFileId
				/*scriptContext.form.clientScriptFileId = 215825;*/ //SB 010CS_InventoryCount.js
				
				scriptContext.form.clientScriptModulePath = "./010CS_InventoryCount.js";

                //1.0.1
                itemSublist.addButton({
                    label : "Add Items Based on Bin Filters",
                    id : "custpage_010filterbybin",
                    functionName : "filterByBinsDetails()"
                });
                
				itemSublist.addButton({
    				label : "Remove All",
    				id : "custpage_010removeall",
    				//1.0.1 this got broken after attaching a ss2.0 client nscript
    				//since you were doing this because 2.0 was previously failing, 2.0 is now working properly so you can use 2.0 approach
    				//functionName : "removeLines_ss1()"
    				functionName : "removeLines('item')"
    			});
				
				var additionalScriptField = scriptContext.form.addField({
    				type : "inlinehtml",
    				label : "010 UE IC ADDITIONAL SCRIPT",
    				id : "custpage_010ue_ic_additional_script"
    			});
    			
        		//close document ready command
        		additionalScript += "});";
        		additionalScript += "</script>";
    			additionalScriptField.defaultValue = additionalScript;
				
			}
    		
    		if(scriptContext.type == "view")
    		{
    			var additionalScript = "<script>jQuery(document).ready(function(){";
    			
    			additionalScript += openAsPopup;
    	    	//make function available generally on view mode, because a button will be deployed to manually do this
    	    	additionalScript += printCountSheet;
    	    	additionalScript += "window.printCountSheet =" + printCountSheet;
    	    	
    	    	additionalScript += printReconVarianceReport;
    	    	additionalScript += "window.printReconVarianceReport =" + printReconVarianceReport;
    	    	
    	    	additionalScript += printMaterialReconReport;
    	    	additionalScript += "window.printMaterialReconReport =" + printMaterialReconReport;
    	    	
    	    	//FOR RECLASSIFICATION, approval does not trigger aftersubmit and beforesubmit user event so this have to be triggered
    	    	additionalScript += reclassAdjustments;
    	    	additionalScript += "window.reclassAdjustments =" + reclassAdjustments;
    	    	
    	    	additionalScript += "window.openAsPopup =" + openAsPopup;
    	    	
    			log.debug("scriptContext.request.parameters", scriptContext.request.parameters);
    			
    			var countSheet_suiteletUrl = url.resolveScript({
    	    		scriptId : "customscript_010sl_countsheet",
    	    		deploymentId : "customdeploy_010sl_countsheet"
    	    	});
    			var reconVarianceReport_suiteletUrl = url.resolveScript({
    	    		scriptId : "customscript_010sl_reconvariancereport",
    	    		deploymentId : "customdeploy_010sl_reconvariancereport"
    	    	});
    			var materialReconReport_suiteletUrl = url.resolveScript({
    	    		scriptId : "customscript_010sl_materialreconreport",
    	    		deploymentId : "customdeploy_010sl_materialreconreport"
    	    	});
    			
    			countSheet_suiteletUrl = "'" + countSheet_suiteletUrl + "'";
    			reconVarianceReport_suiteletUrl = "'" + reconVarianceReport_suiteletUrl + "'";
    			materialReconReport_suiteletUrl = "'" + materialReconReport_suiteletUrl + "'";
    			
    			if(scriptContext.request.parameters.printgoodsreceipt)
        		{
        			//make function available generally on view mode, because a button will be deployed to manually do this
        			/*var openPrintGoodsReceiptCommand = printGoodsReceipt +
        					"printGoodsReceipt(" + scriptContext.newRecord.id + ");";*/
        			
        			var openPrintGoodsReceiptCommand = "printGoodsReceipt(" + scriptContext.newRecord.id + ", '" + scriptContext.newRecord.type + "' ," + goodsReceipt_suiteletUrl + ");"
			
        			additionalScript += openPrintGoodsReceiptCommand;
        		}
        		if(scriptContext.request.parameters.printitemlabels)
        		{
        			//make function available generally on view mode, because a button will be deployed to manually do this
        			/*var openItemLabelsCommand = printItemLabels +
    					"printItemLabels(" + scriptContext.newRecord.id + ");";*/
        			var openItemLabelsCommand = "printItemLabels(" + scriptContext.newRecord.id + ");";
        			
        			additionalScript += openItemLabelsCommand;
        		}
        		var additionalScriptField = scriptContext.form.addField({
    				type : "inlinehtml",
    				label : "010 UE IC ADDITIONAL SCRIPT",
    				id : "custpage_010ue_ic_additional_script"
    			});
    			
        		//close document ready command
        		additionalScript += "});";
        		additionalScript += "</script>";
    			additionalScriptField.defaultValue = additionalScript;
    			
    			var statusValue = scriptContext.newRecord.getValue({
    				fieldId : "status"
    			})
    			statusValue = statusValue ? statusValue.toUpperCase() : "";
    			
    			log.debug("statusValue", statusValue);
    			
    			if(statusValue!="COMPLETED/PENDING APPROVAL" && statusValue!="APPROVED")
    			{
    				scriptContext.form.addButton({
        				label : "Print Count Sheet",
        				id : "custpage_010print_countsheet",
        				functionName : "printCountSheet(" + scriptContext.newRecord.id + ", '" + scriptContext.newRecord.type + "' ," + countSheet_suiteletUrl + ")"
        			});
    			}

    			if(statusValue=="COMPLETED/PENDING APPROVAL")
    			{
    				scriptContext.form.addButton({
        				label : "Reconciliation Variance Report",
        				id : "custpage_010print_reconvariancereport",
        				functionName : "printReconVarianceReport(" + scriptContext.newRecord.id + ", '" + scriptContext.newRecord.type + "' ," + reconVarianceReport_suiteletUrl + ")"
        			});
    			}
    			
    			if(statusValue=="APPROVED")
    			{
    				scriptContext.form.addButton({
        				label : "Material Reconciliation Report",
        				id : "custpage_010print_materialreconreport",
        				functionName : "printMaterialReconReport(" + scriptContext.newRecord.id + ", '" + scriptContext.newRecord.type + "' ," + materialReconReport_suiteletUrl + ")"
        			});
    				
    				scriptContext.form.addButton({
        				label : "Re-Class Adjustments",
        				id : "custpage_010reclass_adjustments",
        				functionName : "reclassAdjustments(" + scriptContext.newRecord.id + ", '" + scriptContext.newRecord.type + "' ," + ")"
        			});
    			}
    			
    			
        	
    		}
    	}
    	catch(e)
    	{
    		log.error("ERROR in function beforeLoad", {stack : e.stack, message : e.message});
    	}
    }
    
    function reclassAdjustments(recId, recType)
    {
    	var currentId = window.nlapiSubmitRecord(window.nlapiLoadRecord(recType, recId));
    	console.log("resubmitted self to trigger reclassification, id : ", currentId);
    	window.location.reload();
    }
    
    function customizeInventoryCount_anc(scriptContext)
    {
    	var proceed = true;
    	try
    	{
    		if(scriptContext.type == "create" || scriptContext.type == "edit")
    		{
    			var currentStatus = scriptContext.newRecord.getValue({
    	    		fieldId : "status"
    	    	})
    	    	log.debug("currentStatus", currentStatus);
    	    	if(!currentStatus)
    	    	{
    	    	    scriptContext.form.addTab({
                        id : "custpage_binfilterstab",
                        label : "Bin Filters",
                    });
    	    	    scriptContext.form.addFieldGroup({
                        id : "binfiltersfieldgroup",
                        label : "Bin Filters",
                        tab: "items"
                    });
        			scriptContext.form.addField({
                		id : "custpage_010_bin",
            			type : "select",
            			label : "Preferred Bin",
            			source : "bin",
            			container : "binfiltersfieldgroup"
                	})
                	
                	scriptContext.form.addField({
                        id : "custpage_010_binstockroom",
                        type : "text",
                        label : "Stock Room",
                        //source : "bin"
                        container : "binfiltersfieldgroup"
                    })
                	scriptContext.form.addField({
                        id : "custpage_010_binaisle",
                        type : "text",
                        label : "Bin Aisle",
                        //source : "bin"
                        container : "binfiltersfieldgroup"
                    })
                	scriptContext.form.addField({
                        id : "custpage_010_binsection",
                        type : "text",
                        label : "Bin Section",
                        //source : "bin"
                        container : "binfiltersfieldgroup"
                    })
                	scriptContext.form.addField({
                        id : "custpage_010_binshelfposition",
                        type : "text",
                        label : "Bin Shelf Position",
                        //source : "bin"
                        container : "binfiltersfieldgroup"
                    })
    	    	}
    		}
    	}
    	catch(e)
    	{
    		log.error("ERROR in function customizePurchaseRequisition_anc", {stack : e.stack, message : e.message});
    		return false;
    	}
    	return proceed;
    }

    

    function printCountSheet(targetId, targetRecType, baseUrl)
    {
//    	var goodsReceiptWindow = window.open('/app/accounting/print/barcodeprinter.nl?trantype=ItemRcpt&tranid=' + targetId);
    	
    	openAsPopup(baseUrl + "&recId=" + targetId + "&recType=" + targetRecType,
    			"countSheet_" + targetId,
    			jQuery(window).width() * .5,
    			jQuery(window).height() * .5,
    			2,
    			2)
    }
    
    function printReconVarianceReport(targetId, targetRecType, baseUrl)
    {
//    	var goodsReceiptWindow = window.open('/app/accounting/print/barcodeprinter.nl?trantype=ItemRcpt&tranid=' + targetId);
    	
    	openAsPopup(baseUrl + "&recId=" + targetId + "&recType=" + targetRecType,
    			"reconVarianceReport" + targetId,
    			jQuery(window).width() * .5,
    			jQuery(window).height() * .5,
    			2,
    			2)
    }
    
    function printMaterialReconReport(targetId, targetRecType, baseUrl)
    {
//    	var goodsReceiptWindow = window.open('/app/accounting/print/barcodeprinter.nl?trantype=ItemRcpt&tranid=' + targetId);
    	
    	openAsPopup(baseUrl + "&recId=" + targetId + "&recType=" + targetRecType,
    			"materialReconReport" + targetId,
    			jQuery(window).width() * .5,
    			jQuery(window).height() * .5,
    			2,
    			2)
    }

    function openAsPopup(url, title, w, h, divisor_width, divisor_height){
    	
		childWindow = window.open(url, title,
				"width=" + w + ",height=" + h + "toolbar=no," +
			    "scrollbars=no," +
			    "location=no," +
			    "statusbar=no,");
		
		childWindow.resizeTo(w, h);
		childWindow.moveTo(((screen.width - w) / divisor_width), ((screen.height - h) / divisor_height));
		childWindow.focus();
		childWindow.document.title = title;
		
		/*//deprecated, dont wanna block the , move this to when the child page is actually loaded.
		loadModalDiv();*/
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
    	try
    	{

    		log.debug("scriptContext", scriptContext)
    		log.debug("runtime.executionContext", runtime.executionContext)
    	}
    	catch(e)
    	{
    		log.error("ERROR in function beforeSubimt", {stack : e.stack, message : e.message});
    	}
    }
    
    function afterSubmit(scriptContext)
    {
    	try
    	{
    		log.debug("aftersubmit scriptContext", scriptContext);
    		if(scriptContext.type == "delete")
    		{
    			log.debug("ending function", "due to delete mode");
    			return;
    		}
    		
    		var approvalStatus = scriptContext.newRecord.getValue({
    			fieldId : "status"
    		})
    		
    		log.debug("after submit : approvalStatus", approvalStatus)
    		approvalStatus = approvalStatus ? approvalStatus.toUpperCase() : "";

    		log.debug("after submit : approvalStatus uppercase", approvalStatus)
    		
    		if(approvalStatus != "APPROVED")
    		{
    			log.debug("ending function", "due to unapproved");
    			return;
    		}
    		log.debug("afterSubmit scriptContext before searching", scriptContext);
    		var transactionSearchObj = search.create({
    			   type: "transaction",
    			   filters:
    			   [
    				   ["type","anyof","InvCount"], 
    				      "AND", 
    				      ["status","anyof","InvCount:D"], 
    				      "AND", 
    				      ["internalid","anyof",scriptContext.newRecord.id],
    				      "AND", 
    				      ["applyingtransaction","noneof","@NONE@"]
    			   ],
    			   columns : ["applyingtransaction", {name : "custbody_010_createdfrom_transaction", join : "applyingtransaction"}]
    			});
    		
    		transactionSearchObj_results = getResults(transactionSearchObj.run());
    		log.debug("transactionSearchObj_results", transactionSearchObj_results);
    		transToUpdate = [];
    		for(var a = 0 ; a < transactionSearchObj_results.length ; a++)
    		{
    			//do this via mapreduce = may have more delay
    			//do this via restlet for more governance
    			//do this via public suitelet = no authentication, because this have to be instant, cannot have the stock usedup or changed, because this may cause issues, specially on lot/serialized
    			//do this via public suitelet first just to see if we can pull it off
    			//nevermind, just do it via mapreduce, there is a low chance for conflict, do it at the end, just collect the transaction for now
    			//split it with mapreduce then!
    			var ia_id = transactionSearchObj_results[a].getValue({
    				name : "applyingtransaction"
    			});
    			transToUpdate.push({type : "inventoryadjustment", id : ia_id, ic_id : scriptContext.newRecord.id});
    		}
    		log.debug("transToUpdate", transToUpdate);
    		
    		var runnableTask = task.create({
				taskType: task.TaskType.MAP_REDUCE,
				scriptId: 'customscript_010process_ic_ia',
				params: {
					custscript_010mr_proc_ic_ia: JSON.stringify(transToUpdate),
				}
			});
		  
			var mrStatus = runnableTask.submit();
			log.debug("mrStatus1", mrStatus);
    		
//    		if(transactionSearchObj_results && transactionSearchObj_results.length > 0 && transactionSearchObj_results[0])
//    		{
//    			var applyingtransactionId = transactionSearchObj_results[0].getValue({name : "applyingtransaction"});
//    			var createdFromTransactionId = transactionSearchObj_results[0].getValue({name : "custbody_010_createdfrom_transaction", join : "applyingtransaction"});
//    			
//    			var targetCreatedFrom = appliedtotransactionId ? appliedtotransactionId : createdFromTransactionId;
//    			controlGlImpact(scriptContext, targetCreatedFrom);
//    		}
    	}
    	catch(e)
    	{
    		log.error("ERROR in function afterSubmit", {stack : e.stack, message : e.message});
    	}
    }
    
//    function controlGlImpact(scriptContext)
//    {
//    	var iaRec = record.load({
//    		type : scriptContext.type,
//    		id : scriptContext.id
//    	})
//    	
//    	var lineItem0_item = iaRec.getSublistValue({
//    		fieldId : "item",
//    		sublistId : "inventory",
//    		line : 0
//    	});
//    	log.debug("lineItem0_item", lineItem0_item)
//    	if(lineItem0_item)
//    	{
//    		var itemRecord = record.load({
//    			type : "item",
//    			id : lineItem0_item
//    		});
//    		
//    		if(itemRecord)
//    		{
//    			var lineItem0_item_cogsaccount = itemRecord.getValue({
//    				fieldId : "cogsaccount"
//    			});
//    			
//    			
//    			log.debug("lineItem0_item_cogsaccount", lineItem0_item_cogsaccount);
//    			if(lineItem0_item_cogsaccount)
//    			{
//    				var submittedRecId = iaRec.setValue({
//    					fieldId : "account",
//    					value : lineItem0_item_cogsaccount
//    				});
//    				
//    				log.debug("submittedRecId", submittedRecId);
//    			}
//    		}
//    	}
//    }
    
    return {
        beforeLoad: beforeLoad,
        beforeSubmit: beforeSubmit,
        afterSubmit: afterSubmit,
    };
    
});
