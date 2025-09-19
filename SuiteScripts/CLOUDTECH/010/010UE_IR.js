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
        	overrideDisplay(scriptContext);
        	executeSavingOptions(scriptContext);
        	
        	customizeGoodsReceipt(scriptContext);
        	
        	log.debug("scriptContext.type", scriptContext.type);
        	if(scriptContext.type == "print")
        	{
        		var submittedRecordId = record.submitFields({
					type : scriptContext.newRecord.type,
					id : scriptContext.newRecord.id,
					values : {custbody_010printed_ir : true}
				});
        		log.debug("updated submittedRecordId : " + submittedRecordId, "custbody_010printed_ir via print")
        	}
    	}
    	catch(e)
    	{
    		log.error("ERROR in function beforeLoad", {stack : e.stack, message : e.message});
    	}
    }
    
    function customizeGoodsReceipt(scriptContext)
    {
    	
    }
    
    function printGoodsReceipt(targetId, targetRecType, baseUrl)
    {
//    	var goodsReceiptWindow = window.open('/app/accounting/print/barcodeprinter.nl?trantype=ItemRcpt&tranid=' + targetId);
    	
    	openAsPopup(baseUrl + "&recId=" + targetId + "&recType=" + targetRecType,
    			"goodsReceiptWindow_" + targetId,
    			jQuery(window).width() * .5,
    			jQuery(window).height() * .5,
    			1.75,
    			2)
    }

    function printItemLabels(targetId)
    {
//    	var itemLabelWindow = window.open('/app/accounting/print/barcodeprinter.nl?trantype=ItemRcpt&tranid=' + targetId);
    	
    	openAsPopup('/app/accounting/print/barcodeprinter.nl?trantype=ItemRcpt&tranid=' + targetId,
    			"itemLabelWindow_" + targetId,
    			jQuery(window).width() * .5,
    			jQuery(window).height() * .5,
    			2.25,
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
    
    function testClientFunction()
    {
    	alert("test client function triggered via function testClientFunction");
    }
    
    
    //saving options and options when on view mode
    function executeSavingOptions(scriptContext)
    {
    	//open document ready command
    	var additionalScript = "<script>;jQuery(document).ready(function(){";
    	additionalScript += openAsPopup;
    	
    	//make function available generally on view mode, because a button will be deployed to manually do this
    	additionalScript += printGoodsReceipt;
    	additionalScript += printItemLabels;
    	additionalScript += "window.testClientFunction =" + testClientFunction;
    	additionalScript += "window.printItemLabels =" + printItemLabels;
    	additionalScript += "window.printGoodsReceipt =" + printGoodsReceipt;
    	
    	try
    	{
    		if(scriptContext.type == "view")
        	{
    			log.debug("scriptContext.request.parameters", scriptContext.request.parameters);
    			var goodsReceipt_suiteletUrl = url.resolveScript({
    	    		scriptId : "customscript_010sl_goodsreceipt",
    	    		deploymentId : "customdeploy_010sl_goodsreceipt"
    	    	});
    			
    			goodsReceipt_suiteletUrl = "'" + goodsReceipt_suiteletUrl + "'";
    			
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
    				label : "010 UE IR ADDITIONAL SCRIPT",
    				id : "custpage_010ue_ir_additional_script"
    			});
    			
        		//close document ready command
        		additionalScript += "});";
        		additionalScript += "</script>";
    			additionalScriptField.defaultValue = additionalScript;
    			
    			scriptContext.form.addButton({
    				label : "Print Goods Receipt",
    				id : "custpage_010print_goods_receipt",
    				functionName : "printGoodsReceipt(" + scriptContext.newRecord.id + ", '" + scriptContext.newRecord.type + "' ," + goodsReceipt_suiteletUrl + ")"
    			});
    			
        	}
    	}
    	catch(e)
    	{
    		log.error("ERROR in function executeSavingOptions", e.message);
    	}
    }
    
    function overrideDisplay(scriptContext)
    {
    	log.debug("overrideDisplay init")
    	var proceed = true;
    	try
    	{
    		uncheckReceiveColumn(scriptContext);
    		createAdhocFields(scriptContext);
    	}
    	catch(e)
    	{
    		log.error("ERROR in function overrideDisplay", {stack : e.stack, message : e.message});
    		proceed = false;
    	}
    	return proceed;
    }
    
    function createAdhocFields(scriptContext)
    {
    	try
    	{
    		if(scriptContext.type == "create" || scriptContext.type == "edit" || scriptContext.type == "transform")
    		{
    			var orderType = scriptContext.newRecord.getValue({
    				fieldId : "ordertype"
    			});
    			
    			//only if from purchase order order, not transfer orders
    			if(orderType == "PurchOrd")
    			{
    				scriptContext.form.addFieldGroup({
    					id : "automationoptions",
    					label : "Automation Option",
    					
    				})
    				var sendEmailFld = scriptContext.form.addField({
            			id : "custpage_sendemailtorequestor",
            			label : "Email Requestor",
            			type : "checkbox",
            			container : "automationoptions"
            		});
                  	//09112021
                  	sendEmailFld.defaultValue = 'T';
                  
            		scriptContext.form.addField({
            			id : "custpage_printgoodsreceipt",
            			label : "Print Goods Receipt",
            			type : "checkbox",
            			container : "automationoptions"
            		});
            		scriptContext.form.addField({
            			id : "custpage_printitemlabels",
            			label : "Print Item Labels",
            			type : "checkbox",
            			container : "automationoptions"
            		});
    			}
    		}
    	}
    	catch(e)
    	{
    		log.error("ERROR in function createAdhocFields", e.message);
    	}
    }
    
    function uncheckReceiveColumn(scriptContext)
    {
    	try
    	{
    		if(scriptContext.type == "create" || scriptContext.type == "transform") //TODO is transform even a thing? use it anyway just to be sure
    		{
    			var targetRecord = scriptContext.newRecord
        		
    			var orderType = scriptContext.newRecord.getValue({
    				fieldId : "ordertype"
    			});
    			
    			if(orderType == "PurchOrd")
    			{
    				var lineCount = targetRecord.getLineCount("item");
            		log.debug("lineCount", lineCount);
            		for(var a = 0 ; a < lineCount ; a++)
            		{
            			log.debug("a", a);
            			targetRecord.setSublistValue({
            				sublistId : "item",
            				fieldId : "itemreceive",
            				value : false,
            				line : a
            			})
            		}
    			}
    		}
    	}
    	catch(e)
    	{
    		log.error("ERROR in function uncheckReceiveColumn(scriptContext)", {stack : e.stack, message : e.message});
    	}
    }
    
    function afterSubmit(scriptContext)
    {
    	emailRequestor(scriptContext);
    	redirectAfterSubmit(scriptContext);
    }
    
    function redirectAfterSubmit(scriptContext)
    {
    	try
    	{
    		//03142020
			//param args seem to have issue. just append the url params
			var targetRedirectUrl = url.resolveRecord({
				recordType : "itemreceipt",
				recordId : scriptContext.newRecord.id,
			});
			
			log.debug("targetRedirectUrl", targetRedirectUrl);
			
			var sendEmailRequestorValue = scriptContext.newRecord.getValue({
				fieldId : "custpage_sendemailtorequestor"
			});
			var printGoodsReceiptValue = scriptContext.newRecord.getValue({
				fieldId : "custpage_printgoodsreceipt"
			});
			var printItemLabelsValue = scriptContext.newRecord.getValue({
				fieldId : "custpage_printitemlabels"
			});
			
			log.debug("printItemLabelsValue", printItemLabelsValue);
			
			if(sendEmailRequestorValue!= 'F' && sendEmailRequestorValue)
			{
				targetRedirectUrl += ("&sendemailtorequestor=" + "T");
			}

			if(printGoodsReceiptValue!= 'F' && printGoodsReceiptValue)
			{
				targetRedirectUrl += ("&printgoodsreceipt=" + "T");
			}

			if(printItemLabelsValue!= 'F' && printItemLabelsValue)
			{
				targetRedirectUrl += ("&printitemlabels=" + "T");
			}
			
//			targetRedirectUrl += ("&id=" + scriptContext.newRecord.id);
//			var baseBarcodeUrlPrintout = "/app/accounting/print/barcodeprinter.nl?trantype=ItemRcpt&tranid=";
//			baseBarcodeUrlPrintout += scriptContext.newRecord.id;
			
			log.debug("final targetRedirectUrl", targetRedirectUrl);
			redirect.redirect({
				url : targetRedirectUrl
			});
    	}
    	catch(e)
    	{
    		log.error("ERROR in function redirectAfterSubmit", e.message);
    	}
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
    
    function emailRequestor(scriptContext)
    {
    	var linkedTransactionColumn = "custcol_010lnkdtrnsctn_crtdfrm";
    	var employeesToEmailObj = {};
    	try
    	{
    		var sendEmailRequestorValue = scriptContext.newRecord.getValue({
				fieldId : "custpage_sendemailtorequestor"
			});
    		var printGoodsReceiptValue = scriptContext.newRecord.getValue({
				fieldId : "custpage_printgoodsreceipt"
			});
    		var printItemLabelsValue = scriptContext.newRecord.getValue({
				fieldId : "custpage_printitemlabels"
			});
    		
    		log.debug("sendEmailRequestorValue", sendEmailRequestorValue);
    		if(sendEmailRequestorValue == 'T' && (scriptContext.type == "create" || scriptContext.type == "receive" || scriptContext.type == "edit"))
    		{
    			var itemCount = scriptContext.newRecord.getLineCount({
    				sublistId : "item"
    			});
    			var linkedTransactions_list = [];

				var lineFilters = [];
    			for(var a = 0 ; a < itemCount ; a++)
    			{
    				var linkedTransactions = scriptContext.newRecord.getSublistValue({
    					sublistId : "item",
    					fieldId : linkedTransactionColumn,
    					line : a
    				});
    				
    				var targetItem = scriptContext.newRecord.getSublistValue({
    					sublistId : "item",
    					fieldId : "item",
    					line : a
    				});
    				
    				if(linkedTransactions)
    				{
    					var lineFilter = [];
    					try
    					{
    						linkedTransactions = JSON.parse(linkedTransactions);
    						if(a != 0)
    						{
        						lineFilters.push("OR");
    						}
    						lineFilter = [["internalid", "anyof", linkedTransactions], "AND", ["item", "anyof", targetItem]];
    						
    						lineFilters.push(lineFilter);
    					}
    					catch(e)
    					{
    						log.error("ERROR parsing linkedTransasctions", e.message);
    						linkedTransactions = [];
    					}
    					linkedTransactions_list = linkedTransactions_list.concat(linkedTransactions);
    				}
    			}
    			log.debug("linkedTransactions_list", linkedTransactions_list);
    			log.debug("lineFilters", lineFilters);
    			
    			if(lineFilters && lineFilters.length > 0)
    			{
    				var prSearch = search.create({
        				type : "purchaserequisition",
        				filters : [
        					lineFilters,
	        			    "AND", 
	        			    ["mainline","is","F"]
        					],
        				columns : [
        					search.createColumn({name: "item", label: "Item"}),
        				    search.createColumn({name: "quantity", label: "Quantity"}),
        				    search.createColumn({name: "tranid", label: "Document Number"}),
        				    search.createColumn({name: "transactionnumber", label: "Transaction Number"}),
        				    search.createColumn({name: "mainname", label: "Main Line Name"}),
        				    search.createColumn({
        				         name: "email",
        				         join: "employee",
        				         label: "Email"
        				      })
        				]
        			});
    				
    				log.debug("prSearch", prSearch);
    				
    				var prSearchResults = getResults(prSearch.run());
    				log.debug("prSearchResults", prSearchResults);
    				

					var itemReceiptDocNum = scriptContext.newRecord.getValue({
						fieldId : "tranid"
					})
    				
    				var baseEmailBody = "Your request for the following item has been received " + "(" +
    							"" + itemReceiptDocNum + 
    							")" + " : " + "<br/>";
    				
    				for(var b = 0 ; b < prSearchResults.length ; b++)
    				{
    					var itemText = prSearchResults[b].getText({name: "item", label: "Item"});
    					var prDocNum = prSearchResults[b].getValue({name: "tranid", label: "Document Number"});
    					var emailAddress = prSearchResults[b].getValue({
	   				         name: "email",
					         join: "employee",
					         label: "Email"
					      });
    					var employeeId = prSearchResults[b].getValue({name: "mainname", label: "Main Line Name"});
    					
    					var resultObj = {
    							itemText : itemText,
    							prDocNum : prDocNum,
    							emailAddress : emailAddress,
    							relatedRecords : {
        							transactionId : scriptContext.newRecord.id
        						}
    					}
    					
    					if(employeesToEmailObj[employeeId])
    					{
    						employeesToEmailObj[employeeId].list.push(resultObj);
    						employeesToEmailObj[employeeId].emailObj.body += "<b>Item : </b>" + itemText + " / " + 
							"<b>Requisition Reference : </b>" + prDocNum + "<br/>"
    					}
    					else
    					{
    						employeesToEmailObj[employeeId] = {};
    						employeesToEmailObj[employeeId].list = [resultObj];
    						employeesToEmailObj[employeeId].email = emailAddress;
    						employeesToEmailObj[employeeId].emailObj = {
    								author : runtime.getCurrentUser().id,
    								recipients : employeeId,
    								subject : "ANC : Requested Item Received",
    								body : baseEmailBody + "" +
    										"<b>Item : </b>" + itemText + " / " + 
    										"<b>Requisition Reference : </b>" + prDocNum + "<br/>",
    								relatedRecords : {
    			    							transactionId : scriptContext.newRecord.id
    			    						}
    								}
    					}
    					
    					
    				}
    				
    				log.debug("employeesToEmailObj", employeesToEmailObj);
    				
    				
    				for(var employee in employeesToEmailObj)
    				{
    					email.send(employeesToEmailObj[employee].emailObj);
    					log.debug("EMAIL SENT TO : " + employee, employeesToEmailObj[employee].emailObj);
    				}
    			}
    		}
    		
    		var valuesToSubmit = {values : {}};
    		if(sendEmailRequestorValue=="T")
			{
    			valuesToSubmit.values.custbody_010emailed_ir = true;
				valuesToSubmit.hasValues = true;
			};
			if(printGoodsReceiptValue == "T" || printItemLabelsValue == "T")
			{
				valuesToSubmit.values.custbody_010printed_ir = true;
				valuesToSubmit.hasValues = true;
			};
			
			log.debug("valuesToSubmit", valuesToSubmit);
			
			if(valuesToSubmit.hasValues)
			{
				record.submitFields({
					type : scriptContext.newRecord.type,
					id : scriptContext.newRecord.id,
					values : valuesToSubmit.values
				});
			}
    	}
    	catch(e)
    	{
    		log.debug("ERROR in function afterSubmit", e.message);
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
