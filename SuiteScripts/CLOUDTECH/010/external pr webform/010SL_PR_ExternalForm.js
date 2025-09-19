/**
 * @NApiVersion 2.x
 * @NScriptType Suitelet
 * @NModuleScope SameAccount
 */
define(['N/task', 'N/config', 'N/email', 'N/file', 'N/https', 'N/record', 'N/redirect', 'N/runtime', 'N/search', 'N/ui/message', 'N/ui/serverWidget', 'N/url', './prExternal.config.js'],
/**
 * @param {config} config
 * @param {email} email
 * @param {file} file
 * @param {https} https
 * @param {record} record
 * @param {redirect} redirect
 * @param {runtime} runtime
 * @param {search} search
 * @param {message} message
 * @param {serverWidget} serverWidget
 * @param {url} url
 */
function(task, config, email, file, https, record, redirect, runtime, search, message, serverWidget, url, customConfig) {
   
	var MASTERSETUP = {};
	var GLOBAL_VARIABLES = {};
	var bodyFieldObjs = [
		{
			id: "custpage_body_inlinehtml",
			type : "inlinehtml",
			label : "inline html",
			//defaultValue : "<script>console.log('123456');" + addListeners + "</script>"
//			defaultValue : "<script>console.log('1');" + "console.log('element', jQuery('#custpage_sl_rqstdqty_formattedValue'));jQuery(document).ready(function(){jQuery('#custpage_sl_rqstdqty_formattedValue').on( 'change', function(e){console.log('rate changed to : TODO')})});console.log('2');" + "</script>"
//			defaultValue : "<script src='https://1116623-sb1.app.netsuite.com/core/media/media.nl?id=204581&c=1116623_SB1&h=ff7cb612eaf0f27f3b94&_xt=.js'>" +
//					"addListeners()" +
//					"" +
//					"</script>"
			valueByFunction : getExternalScriptElement
		},
		{
			id: "custpage_body_subsidiary",
			type : "select",
			label : "Subsidiary",
			source : "subsidiary",
			displayType : serverWidget.FieldDisplayType.INLINE,
		},
		{
			id: "custpage_body_employee",
			type : "select",
			label : "Requestor",
			source : "employee",
			isMandatory : true
		},
		{
			id: "custpage_body_validatedemployee",
			type : "textarea",
			label : "Validated Employees",
			valueByFunction : getValidatedEmployees,
			displayType : serverWidget.FieldDisplayType.HIDDEN,
		},
		{
			id: "custpage_body_date",
			type : "date",
			label : "Date",
			defaultValue : new Date()
		},
		{
			id: "custpage_body_rqddate",
			type : "date",
			label : "Date Required",
		},
		{
			id: "custpage_body_memo",
			type : "textarea",
			label : "MEMO",
			//help text is not working on external forms
//			helpText : {
//				help : "Please enter up to 999 characters only."
//			}
		},
		{
			id: "custpage_sl_externaldata",
			type : "textarea",
			label : "externaldata",
			defaultValue : "{}",
			displayType : serverWidget.FieldDisplayType.HIDDEN,
		},
        {
            id: "custpage_sl_attachment",
            type : "file",
            label : "File",
        },
		
	];
	
	var sublistFieldObjs = [
		{
			id: "custpage_sl_item",
			type : "text",
			label : "Account Code",
			isMandatory : true
		},
		{
			id: "custpage_sl_department",
			type : "select",
			label : "Department",
			isMandatory : true,
			selectOptionSource : "department"
		},
		//02212020 Item should be freeform, these are almost always new items
//		{
//			id: "custpage_sl_item",
//			type : "select",
//			label : "Item",
//			source : "item",
//			isMandatory : true
//		},
		{
			id: "custpage_sl_vendor",
			type : "select",
			label : "Vendor",
			source : "vendor"
		},
		{
			id: "custpage_sl_rqstdqty",
			type : "float",
			label : "Requested Quantity",
			displayType : serverWidget.FieldDisplayType.ENTRY,
			isMandatory : true
		},
		{
			id: "custpage_sl_customunits_text",
			type : "text",
			label : "Units",
		},
//		{
//			id: "custpage_sl_units_text",
//			type : "text",
//			label : "Purchase Unit",
//			displayType : serverWidget.FieldDisplayType.DISABLED,
//		},
//		{
//			id: "custpage_sl_units",
//			type : "integer",
//			label : "Purchase Unit",
//			displayType : serverWidget.FieldDisplayType.HIDDEN,
//		},
		{
			id: "custpage_sl_itemdescription",
			type : "textarea",
			label : "Item Description",
		},
		{
			id: "custpage_sl_estimatedrate",
			type : "currency",
			label : "Estimated Rate",
		},
		{
			id: "custpage_sl_estimatedamount",
			type : serverWidget.FieldType.CURRENCY,
			label : "Estimated Amount",
			displayType : serverWidget.FieldDisplayType.DISABLED,
		},
		{
			id: "custpage_sl_memo",
			type : "textarea",
			label : "Memo",
            isMandatory : true,
		},
	];
	
	
	function getDepartmentSelectOptions(subsidiaryId)
	{
		var getDepartmentSelectOptions_result = [];
		try
		{
			var depertmentSearchObj = search.create({
				type : "department",
				filters : [
					["subsidiary", "anyof", subsidiaryId]
				],
				columns : [
					search.createColumn({
						name : "name",
						sort : search.Sort.ASC,
						label : "Name"
					}),
					search.createColumn({
						name : "subsidiary",
						label : "Subsidiary"
					})
				]
			});
			
			var departmentSearchResults = getResults(depertmentSearchObj.run());
			departmentSearchResults = departmentSearchResults.map(function(res){
				var resval = res.id;
				var restext = res.getValue({
					name : "name",
				})
				return {value : resval, text : restext};
			})
			
			getDepartmentSelectOptions_result = departmentSearchResults;
		}
		catch(e)
		{
			log.error("ERROR in function getDepartmentSelectOptions", e.message);
		}
		
		log.debug("getDepartmentSelectOptions_result.length", getDepartmentSelectOptions_result.length);
		log.debug("subsidiaryId", subsidiaryId);
		
		return getDepartmentSelectOptions_result;
	}
	
	function getExternalScriptElement()
	{
		var externalScriptElement = "";
		
		var externalScriptSeach = search.create({
			type : "file",
			filters : [
				["name", "is", MASTERSETUP.htmlScriptName]
			],
			columns : [
				search.createColumn({
					name : "url"
				})
			]
		})
		
		var externalScriptSeachSr = getResults(externalScriptSeach.run());
		
		if(externalScriptSeachSr && externalScriptSeachSr.length > 0)
		{
			var targetResult = externalScriptSeachSr[0].getValue({
				name : "url"
			})
			externalScriptElement =
				"<script src='" + targetResult + "'>" +
				"addListeners()" +
				"" +
				"</script>"
		}
		
		return externalScriptElement
	}
	
	function getValidatedEmployees()
	{
		var getValidatedEmployees_result = [];
		var employeeSearchObj = search.create({
			type : "employee",
			filters : [
				["subsidiary", "anyof", GLOBAL_VARIABLES.subsidiaryId]
			],
			columns : [
				search.createColumn({
					name : "internalid",
					label : "Internal Id",
					sort : search.Sort.ASC,
				}),
				search.createColumn({
					name : "subsidiary",
					label : "Subsidiary"
				})
			]
		});
		
		var employeeSearchResults = getResults(employeeSearchObj.run());
		employeeSearchResults = employeeSearchResults.map(function(res){
			var resval = res.id;
			return resval;
		})
		
		getValidatedEmployees_result = employeeSearchResults;
		return JSON.stringify(getValidatedEmployees_result);
	}
	
    /**
     * Definition of the Suitelet script trigger point.
     *
     * @param {Object} context
     * @param {ServerRequest} context.request - Encapsulation of the incoming request
     * @param {ServerResponse} context.response - Encapsulation of the Suitelet response
     * @Since 2015.2
     */
    function onRequest(context)
    {
    	MASTERSETUP = customConfig.masterSetup;
    	try
    	{
    		if(context.request.method == "GET")
    		{
    		    log.debug("context.request.parameters", context.request.parameters);
    		    log.debug("context.request.parameters.accesscode", context.request.parameters.accesscode);
    		    if(!context.request.parameters.accesscode)
    		    {
                    log.debug("write access denied. accesscode missing")
    		        context.response.write({output : "Access denied. Please contact your administrator."});
                    return;
    		    }
    		    else
    		    {
    		        var recSearch = search.create({
    	                type : "customrecord_anc_customauth",
    	                columns : [
    	                           search.createColumn({name : "custrecord_anc_customauth"})
    	                           ]
    	            });
    	            var recId = "";
    	            var ns_accesscode = "";
    	            var sr = recSearch.run().each(function(res){
    	                log.debug("res", res);
    	                recId = res.id;
    	                ns_accesscode = res.getValue({name : "custrecord_anc_customauth"})
    	                return false;
    	            })
    	            
    	            if(ns_accesscode != context.request.parameters.accesscode)
    	            {
    	                log.debug("write access denied. accesscode does not match")
                        context.response.write({output : "Access denied. Please contact your administrator."});
                        return;
    	            }
    		    }
    		    
    		    
    		    
    			//if already have subsidiary
    			if(context.request.parameters.subsidiary)
    			{
    				GLOBAL_VARIABLES.subsidiaryId = context.request.parameters.subsidiary
    				var form = listingForm(context);
        			
        			context.response.writePage({
        				pageObject : form
        			})
    			}
    			else
    			{
    				var form = subsidiarySelectionForm(context);
    				
    				var accessCodeField = form.addField({
                        id : "custpage_accesscode",
                        label : "access code",
                        type : "textarea"
                    });
                    accessCodeField.defaultValue = context.request.parameters.accesscode;
                    accessCodeField.updateDisplayType({
                        displayType : "hidden"
                    })
    				
    				context.response.writePage({
        				pageObject : form
        			})
    			}
    		}
    		else if(context.request.method == "POST")
    		{
    			if(context.request.parameters.custpage_subsel_subsidiary)
    			{
    				redirect.toSuitelet({
        			    scriptId: "customscript_010sl_pr_external_form" ,
        			    deploymentId: "customdeploy_010sl_pr_external_form",
        			    isExternal : true,
        			    parameters: {"subsidiary" : context.request.parameters.custpage_subsel_subsidiary, "accesscode" : context.request.parameters.custpage_accesscode} 
        			});
        			log.debug("context.request.parameters", context.request.parameters);
    			}
    			else
    			{
    				createPr(context);
    			}
    		}
    	}
    	catch(e)
    	{
    		log.error("ERROR in function onRequest", e.message);
    	}
    }
    
    function createPr(context)
    {
    	try
    	{
    		var sublistFieldIds = [];
			var linesToProcess = [];
			log.debug("context.request1", context.request);
			
			var requestorId = context.request.parameters.custpage_body_employee
			var sublistCount = context.request.getLineCount({
			    group: "custpage_itemsublist"
			});
			
			log.debug("sublistCount2 group", sublistCount)
			var lineToProcessSummaryHtml = "";
			for(var z = 0 ; z < sublistCount ; z++)
			{
				var sublistData_include = context.request.getSublistValue({
    			    group: "custpage_itemsublist",
    			    name: 'custpage_princlude',
    			    line: z
    			});
    			log.debug("sublistData index0 include?", sublistData_include);
    			

				var sourceRow  = {};
				var sourceRow_value = {};
				for(var a = 0 ; a < sublistFieldObjs.length ; a++)
				{
					sourceRow.line = z;
					sourceRow.group = "custpage_itemsublist";
					sourceRow.name = sublistFieldObjs[a].id;
					
					sourceRow_value[sourceRow.name] = {name : sourceRow.name, value : context.request.getSublistValue(sourceRow) || ""};
				}
				linesToProcess.push(sourceRow_value)
				
				log.debug("sourceRow_value", sourceRow_value)
//				lineToProcessSummaryHtml += "<a target='_blank' href='/app/accounting/transactions/purchreq.nl?id=";
//				lineToProcessSummaryHtml += sourceRow_value["custpage_prnumber"].value;
//				lineToProcessSummaryHtml += "'>";
//				
//				lineToProcessSummaryHtml += "<p style='font-size:16px'>";
//				
//				lineToProcessSummaryHtml +=  sourceRow_value["custpage_prtext"].value;
//				lineToProcessSummaryHtml +=  " / ";
//				lineToProcessSummaryHtml +=  "Account Code " + sourceRow_value["custpage_prnumbertext"].value;
//				lineToProcessSummaryHtml +=  " : ";
//				lineToProcessSummaryHtml +=  sourceRow_value["custpage_pritemtext"].value;
//
//				lineToProcessSummaryHtml +=  "</p>";
//				
//				lineToProcessSummaryHtml +=  "</a>";
//				lineToProcessSummaryHtml +=  "<br/>";
				
				log.debug("linesToProcess progress value", linesToProcess)
			
			}
			
			var linesToProcess_json = JSON.stringify(linesToProcess)
    		var fileData = createFile(linesToProcess_json, requestorId, context);
			
			if(fileData.fileId)
			{
	    		log.debug("SUBMITTED!", "SHOULD PROCESS SELECTED ENTRIES")
	    		var runnableTask = task.create({
	    	        taskType: task.TaskType.MAP_REDUCE,
	    	        scriptId: 'customscript_010mr_prexternalform',
	    	        params: {
	    	        	custscript_010mr_extpr_payloadfileid: fileData,
	    	        }
	    	      });
	    		
	    		log.debug("runnableTask", runnableTask);
	    		
	    		var mrStatus = runnableTask.submit();
				log.debug("mrStatus1", mrStatus);
				if(mrStatus)
				{
					log.debug("mrStatus2", mrStatus);
					//context.response.write(linesToProcess_json);
					createSubmissionSummaryForm(context, lineToProcessSummaryHtml, linesToProcess);
					return;
				}
				else
				{
					log.debug("mrStatus3", mrStatus);
					var fail_asResponse = {status : "fail", errormsg : "Previous Submission may still be processing"};
					fail_asResponse = JSON.stringify(fail_asResponse);
					context.response.write(fail_asResponse)
				}
			}
    	}
    	catch(e)
    	{
    		log.error("ERROR in function createPr", e.message);
    	}
    }
    
    function createSubmissionSummaryForm(context, lineToProcessSummaryHtml, linesToProcess_obj)
    {
    	try
    	{
    		
//    		var form = serverWidget.createForm({
//    			title : "Your request for reorder has been submitted." +
//				"<br/>" +
//				"An email message will be sent to your email address " +
//				"<i>" + 
//				runtime.getCurrentUser().email +
//				"</i>" +
//				" when the request is completed."
//    		})
    		
    		var form = serverWidget.createForm({
    			title : "Your request for reorder has been submitted."
    		})
    		var prList_summary_msg = form.addField({
    			id : "custpage_summary_msg",
    			type : "inlinehtml",
    			label : "Purchase Requisition LIST"
    		})
    		prList_summary_msg.defaultValue = "" +
    		"<br/>" +
			"An email message will be sent to the requestor's email address " +
//			"<i>" + 
//			runtime.getCurrentUser().email +
//			"</i>" +
			" when the request is completed."
			
    		var prList_summary = form.addField({
    			id : "custpage_summary_prlist",
    			type : "inlinehtml",
    			label : "Purchase Requisition LIST"
    		})
    		
    		var additionalScriptsField = form.addField({
    			id : "custpage_additionalscripts",
    			type : "inlinehtml",
    			label : "additional scripts"
    		})
    		
    		prList_summary.defaultValue = lineToProcessSummaryHtml;
    		context.response.writePage({pageObject : form});
    	}
    	catch(e)
    	{
    		log.error("ERROR in function createSubmissionSummaryForm", e.message);
    	}
    	return;
    }
    
    function createFile(linesToProcess_json, requestorId, context)
    {
  	  var fileData = {};
  	  try
  	  {
          var timeStamp = new Date().getTime();
          
  	      //06202021
          var attachmentFile = context.request.files['custpage_sl_attachment'];
          attachmentFile.name = timeStamp + "_" + attachmentFile.name;
          attachmentFile.folder = 34167; //SuiteScripts > CLOUDTECH > 010 external pr webform
//        MASTERSETUP.directories.externalPrWebform.path + fileObj.name;
          var attachmentFileId = attachmentFile.save();

		var fileObj = file.create({
		    name: "payload_extpr_" + timeStamp + '.txt',
		    fileType: file.Type.PLAINTEXT,
		    contents: linesToProcess_json
		});
		
//		fileObj.folder = 11457; //SuiteScripts > CLOUDTECH > 010
		fileObj.folder = 34167; //SuiteScripts > CLOUDTECH > 010 external pr webform
		var fileId = fileObj.save();
		log.debug("createFile fileId", fileId)
		var fileData = {};
		fileData["fileId"] = fileId;
		fileData["filePath"] = MASTERSETUP.directories.externalPrWebform.path + fileObj.name;
		fileData["requestorId"] = requestorId
		fileData["subsidiaryId"] = context.request.parameters.custpage_body_subsidiary
		fileData["tranDate"] = context.request.parameters.custpage_body_date
		fileData["dueDate"] = context.request.parameters.custpage_body_rqddate
		fileData["memo"] = context.request.parameters.custpage_body_memo
		fileData["externaldata"] = context.request.parameters.custpage_sl_externaldata
		fileData["attachmentFileId"] = attachmentFileId
  	  }
	  catch(e)
	  {
		  log.error("ERROR in function createFile", e.message);
	  }
	  
	  log.debug("fileData", fileData);
	  return fileData;
  }
    
//    var getExternalPrUrl(context)
//    {
//    	var baseUrl = "";
//    	baseUrl = url.resolveScript({
//    		scriptId : "customscript_010sl_pr_external_form",
//    		deploymentId : "customdeploy_010sl_pr_external_form"
//    	})
//    	
//    	return baseUrl
//    }
    
    function subsidiarySelectionForm(context)
    {
    	form = serverWidget.createForm({
    		title : "ANC External Purchase Requisition : Select Subsidiary"
    	});
    	
		form.addSubmitButton({
			label : "Submit"
		});
		
		var subsidiaryField = form.addField({
			id : "custpage_subsel_subsidiary",
			type : "select",
			source : "subsidiary",
			label : "Subsidiary",
		})
		subsidiaryField.isMandatory = true;
		return form
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
    
    function createUiElements(form, context)
    {
    	try
    	{
    		for(var a = 0 ; a < bodyFieldObjs.length ; a++)
    		{
    			var bodyFieldObj = form.addField(bodyFieldObjs[a]);
    			if(bodyFieldObjs[a].displayType)
    			{
    				bodyFieldObj.updateDisplayType({
    	    		    displayType: bodyFieldObjs[a].displayType
    	    		});
    			}
    			if(bodyFieldObjs[a].updateDisplaySize)
    			{
    				bodyFieldObj.updateDisplaySize(bodyFieldObjs[a].updateDisplaySize);
    			}
    			if(bodyFieldObjs[a].helpText)
    			{
    				bodyFieldObj.setHelpText(bodyFieldObjs[a].helpText);
    			}
    			if(bodyFieldObjs[a].isMandatory)
    			{
    				bodyFieldObj.isMandatory = bodyFieldObjs[a].isMandatory;
    			}
    			if(bodyFieldObjs[a].defaultValue)
    			{
    				bodyFieldObj.defaultValue = bodyFieldObjs[a].defaultValue;
    			}
    			if(bodyFieldObjs[a].selectOptionSource)
    			{
    				fillSelectOptions(bodyFieldObj, bodyFieldObjs[a].selectOptionSource, context);
    			}
    			
    			if(bodyFieldObjs[a].id == "custpage_body_subsidiary")
    			{
    				bodyFieldObj.defaultValue = context.request.parameters.subsidiary
    			}
    			
    			if(bodyFieldObjs[a].valueByFunction)
    			{
    				bodyFieldObj.defaultValue = bodyFieldObjs[a].valueByFunction()
    			}
    			
    		}
    		
    		function fillSelectOptions(fieldObj, type, context)
    		{
    			var selectOptionsList = [];
    			if(type == "department")
    			{
    				selectOptionsList = getDepartmentSelectOptions(context.request.parameters.subsidiary)
    			}
    			
//    			selectOptionsList = [{value : "abc", text : "abctext"}];
    			
    			for(var a = 0 ; a < selectOptionsList.length ; a++)
    			{
    				fieldObj.addSelectOption({
        				value : selectOptionsList[a].value,
        				text : selectOptionsList[a].text
        			})
    			}
    		}

        	var depletedItemsSublist = form.addSublist({
    			id : "custpage_itemsublist",
    			label : "Items",
//    			type : "list"
//    			type : "editor",
//    			type : "staticlist"
    			type : "inlineeditor"
    		});
        	
        	for(var a = 0 ; a < sublistFieldObjs.length ; a++)
    		{
    			var sublistFieldObj = depletedItemsSublist.addField(sublistFieldObjs[a]);
    			if(sublistFieldObjs[a].displayType)
    			{
    				sublistFieldObj.updateDisplayType({
    	    		    displayType: sublistFieldObjs[a].displayType
    	    		});
    			}
    			if(sublistFieldObjs[a].updateDisplaySize)
    			{
    				sublistFieldObj.updateDisplaySize(sublistFieldObjs[a].updateDisplaySize);
    			}
    			if(sublistFieldObjs[a].helpText)
    			{
    				sublistFieldObj.setHelpText(sublistFieldObjs[a].helpText);
    			}
    			if(sublistFieldObjs[a].isMandatory)
    			{
    				sublistFieldObj.isMandatory = sublistFieldObjs[a].isMandatory;
    			}
    			if(sublistFieldObjs[a].selectOptionSource)
    			{
    				fillSelectOptions(sublistFieldObj, sublistFieldObjs[a].selectOptionSource, context);
    			}
    		}
        	
        	depletedItemsSublist.updateTotallingFieldId({id: 'custpage_sl_estimatedamount'});
    	}
    	catch(e)
    	{
    		log.error("ERROR in function createUiElements", e.message);
    	}
    	return form;
    }
    
    function listingForm(context)
    {
    	form = serverWidget.createForm({
    		title : "ANC External Purchase Requisition"
    	});
    	
		form.addSubmitButton({
			label : "Submit"
		});
		
		//TODO cant make it work on external forms
//    	var clientScriptInternalId = 204481;//TODO file id of 010CS_PR_ExternalForm.js
//		form.clientScriptFileId = clientScriptInternalId;
		
		form = createUiElements(form, context);
    	return form
    }

    return {
        onRequest: onRequest,
//        addListeners : addListeners
    };
    
});
