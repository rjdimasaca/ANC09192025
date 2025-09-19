/**
 * @NApiVersion 2.x
 * @NScriptType Suitelet
 * @NModuleScope SameAccount
 */
define(['N/record', 'N/search', 'N/ui/serverWidget', 'N/file', 'N/task', 'N/render'],
/**
 * @param {record} record
 * @param {search} search
 */
function(record, search, serverWidget, file, task, render) {
   
	var sublistFieldObjs = [
		{
			id: "custpage_prmultiline",
			type : "checkbox",
			label : "MULTILINE?",
		},
		{
			id: "custpage_princlude",
			type : "checkbox",
			label : "INCLUDE?",
		},
		{
			id: "custpage_prnumber",
			type : "select",
			label : "Purchase Requisition #",
			source : "transaction"
		},
		{
			id: "custpage_prtext",
			type : "text",
			label : "Transaction #",
			displayType : serverWidget.FieldDisplayType.HIDDEN
		},
		{
			id: "custpage_prnumbertext",
			type : "text",
			label : "Transaction #",
			displayType : serverWidget.FieldDisplayType.HIDDEN
		},
		{
			id: "custpage_prvendor",
			type : serverWidget.FieldType.SELECT,
			label : "Preferred Vendor",
			source : "vendor",
			displayType : serverWidget.FieldDisplayType.HIDDEN,
		},
		{
			id: "custpage_prvendorid",
			type : "textarea",
			label : "Vendor ID",
//			displayType : serverWidget.FieldDisplayType.ENTRY,
			displayType : serverWidget.FieldDisplayType.HIDDEN,
		},
		{
			id: "custpage_prvendortext",
			type : "textarea",
			label : "Vendor",
			displayType : serverWidget.FieldDisplayType.ENTRY,
		},
		{
			id: "custpage_pritem",
			type : "select",
			label : "Item",
			source : "item",
			displayType : serverWidget.FieldDisplayType.INLINE
		},
		{
			id: "custpage_pritemid",
			type : "integer",
			label : "Item ID",
			displayType : serverWidget.FieldDisplayType.HIDDEN
		},
		{
			id: "custpage_pritemtext",
			type : "text",
			label : "Item Text",
			displayType : serverWidget.FieldDisplayType.HIDDEN
		},
		{
			id: "custpage_prquantity",
			type : "float",
			label : "Quantity",
			displayType : serverWidget.FieldDisplayType.ENTRY
		},
//		{
//			id: "custpage_prunits",
//			type : "select",
//			label : "Units",
//			source : "uom",
//			displayType : serverWidget.FieldDisplayType.ENTRY
//		},
		{
			id: "custpage_prunitstext",
			type : "text",
			label : "Units",
		},
		{
			id: "custpage_prexternalunits",
			type : "text",
			label : "External Units",
//			displayType : serverWidget.FieldDisplayType.ENTRY
		},
		{
			id: "custpage_pritemdescription",
			type : "textarea",
			label : "Item Description",
			displayType : serverWidget.FieldDisplayType.ENTRY
		},
//		{
//			id: "custpage_prvendor",
//			type : serverWidget.FieldType.MULTISELECT,
//			label : "Vendor",
////			source : "vendor"
//		},
//		{
//			id: "custpage_prvendorpopup",
//			type : "text",
//			label : "Select Vendors",
//			displayType : serverWidget.FieldDisplayType.INLINE,
//			updateDisplaySize : {
//    		    height : 60,
//    		    width : 1000
//    			}
//		},
//		{
//			id: "custpage_prrequestor",
//			type : "select",
//			label : "Requestor",
//			displayType : serverWidget.FieldDisplayType.ENTRY,
////			source: "entity"
//		},
		{
			id: "custpage_prrequestortext",
			type : "text",
			label : "Requestor Name",
			displayType : serverWidget.FieldDisplayType.INLINE,
		},
		{
			id: "custpage_prrequireddate",
			type : "date",
			label : "Required Date",
			displayType : serverWidget.FieldDisplayType.ENTRY,
		},
		{
			id: "custpage_instructions",
			type : "textarea",
			label : "instructions",
			displayType : serverWidget.FieldDisplayType.ENTRY,
		},
	];
	
	function sampleCreatePdf()
	{
		/*var fileObj = file.load({
			id : 165998
		})*/
		var fileObj = file.load({
			id : './010TMPLT_customerrefund.html'
		})
		var finalXmlStr = fileObj.getContents();
		
//		var finalXmlStr = '';
//    	finalXmlStr += '<?xml version="1.0"?>';
//    	finalXmlStr += '<!DOCTYPE pdf PUBLIC "-//big.faceless.org//report" "report-1.1.dtd">';
//    	finalXmlStr += '<pdf>';
//    	finalXmlStr += '<head><body><div>';
//    	finalXmlStr += 'RODMAR TEST PDF VIA MAPREDUCE';
//    	finalXmlStr += '</div></body></head>';
//    	finalXmlStr += '</pdf>';
    	
    	log.debug("finalXmlStr", finalXmlStr);
    	
    	var pdf = render.xmlToPdf({
    		xmlString: finalXmlStr
	    });
    	

    	log.debug("pdf", pdf);
    	
    	pdf.name = "RODMAR TEST PDF VIA MAPREDUCE " + new Date().getTime();
    	pdf.folder = 11457; //SuiteScripts > CLOUDTECH > 010
    	var fileId = pdf.save();
    	log.debug("fileId", fileId);
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
    	var responseObj = {};
    	if(context.request.method == "POST")
    	{
    		var requestBody = {};
    		log.debug("context.request.body", context.request.body)
    		requestBody = context.request.body;
    		try
    		{
        		requestBody = requestBody ? JSON.parse(context.request.body) : {};
    		}
    		catch(e)
    		{
    			log.debug("body cannot be converted to JSON", e.message);
    		}
		
    		if(requestBody.type)
    		{
    			
	    		log.debug("requestBody", requestBody);
	    		switch(requestBody.type)
	    		{
	    		case "getPrList":
	    			responseObj = getPrListObj(context, requestBody); 
	    			break;
	    		case "submitRfq":
	    			responseObj = submitRfq(context, requestBody); 
	    			break;
	    		}
	    		
	    		log.debug("responseObj", responseObj);
	    		var responseStr = JSON.stringify(responseObj) || "{}";
	    		
	    		context.response.write({output : responseStr})
	    		
	    		return responseObj;
	    		return;
    		}
    		else
    		{
    			var sublistFieldIds = [];
    			var linesToProcess = [];
    			log.debug("context.request1", context.request);

    			var sublistCount = context.request.getLineCount({
    			    group: "custpage_prsublist"
    			});
    			
    			log.debug("sublistCount2 group", sublistCount)
    			var lineToProcessSummaryHtml = "";
    			for(var z = 0 ; z < sublistCount ; z++)
    			{
    				var sublistData_include = context.request.getSublistValue({
        			    group: "custpage_prsublist",
        			    name: 'custpage_princlude',
        			    line: z
        			});
        			log.debug("sublistData index0 include?", sublistData_include);
        			
        			if(sublistData_include && sublistData_include != "F")
        			{
    					var sourceRow  = {};
        				var sourceRow_value = {};
        				for(var a = 0 ; a < sublistFieldObjs.length ; a++)
        				{
        					sourceRow.line = z;
        					sourceRow.group = "custpage_prsublist";
        					sourceRow.name = sublistFieldObjs[a].id;
        					
        					sourceRow_value[sourceRow.name] = {name : sourceRow.name, value : context.request.getSublistValue(sourceRow) || ""};
        				}
        				linesToProcess.push(sourceRow_value)
        				
        				log.debug("sourceRow_value", sourceRow_value)
        				lineToProcessSummaryHtml += "<a target='_blank' href='/app/accounting/transactions/purchreq.nl?id=";
        				lineToProcessSummaryHtml += sourceRow_value["custpage_prnumber"].value;
        				lineToProcessSummaryHtml += "'>";
        				
        				lineToProcessSummaryHtml += "<p style='font-size:16px'>";
        				
        				lineToProcessSummaryHtml +=  sourceRow_value["custpage_prtext"].value;
        				lineToProcessSummaryHtml +=  " / ";
        				lineToProcessSummaryHtml +=  "Requisition # " + sourceRow_value["custpage_prnumbertext"].value;
        				lineToProcessSummaryHtml +=  " : ";
        				lineToProcessSummaryHtml +=  sourceRow_value["custpage_pritemtext"].value;

        				lineToProcessSummaryHtml +=  "</p>";
        				
        				lineToProcessSummaryHtml +=  "</a>";
        				lineToProcessSummaryHtml +=  "<br/>";
        				
//        				log.debug("linesToProcess progress value", linesToProcess)
        			}
    			}
    			var linesToProcess_obj = ({linesToProcess : linesToProcess});
    			var linesToProcess_json = JSON.stringify(linesToProcess_obj);
    			log.debug("linesToProcess", linesToProcess)
    			log.debug("jsonLinesToProcess", linesToProcess_json)
    			var fileData = createFile(linesToProcess_json);
    			
    			if(fileData.fileId)
    			{
    				var runnableTask = task.create({
    					taskType: task.TaskType.MAP_REDUCE,
    					scriptId: 'customscript_010mr_rfq',
    					params: {
    						custscript_010mr_rfq_payloadfileid: fileData,
    					}
    				});
				  
    				var mrStatus = runnableTask.submit();
    				log.debug("mrStatus1", mrStatus);
    				if(mrStatus)
    				{
    					log.debug("mrStatus2", mrStatus);
    					//context.response.write(linesToProcess_json);
    					createSubmissionSummaryForm(context, lineToProcessSummaryHtml, linesToProcess_obj);
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
    	}
    	else if(context.request.method == "GET")
    	{
    		if(context.request.parameters.selectvendor)
    		{
    			var form = serverWidget.createForm({
    				title : "Send RFQ : Select Vendor",
    				hideNavBar : true
    			});
    			var sendRfq_selectVendor_vendorBodyField = form.addField({
        			id: "custpage_body_vendor_validated",
        			type : "multiselect",
        			label : "Validated Vendors",
//        			source : "vendor"
        		});
    			
    			sendRfq_selectVendor_vendorBodyField.updateLayoutType({
        		    layoutType: serverWidget.FieldLayoutType.OUTSIDEBELOW
        		});
    			
    			sendRfq_selectVendor_vendorBodyField.setHelpText({
    				help : "This list is limited to the vendors that are already <b>validated as active and has an email address.</b> <br/>" +
		    		"Please refer to the list above for the actual vendors that will be selected."
    			});
    			
    			sendRfq_selectVendor_vendorBodyField.updateDisplaySize({
    			    height : 10,
    			    width : 500
    			});
    			
    			var validVendorsSearch = search.create({
    				type : "vendor",
    				filters: [
    					      ["isinactive","is","F"], 
    					      "AND", 
    					      ["email","isnotempty",""]
    				],
    				columns : [
    					 search.createColumn({
    				         name: "entityid",
    				         sort: search.Sort.ASC,
    				         label: "Name"
    				      }),
    				]

    			})
    			
    			var validVendorsSearchResults = getResults(validVendorsSearch.run())
    			for(var a = 0 ; a < validVendorsSearchResults.length ; a++)
    			{
    				sendRfq_selectVendor_vendorBodyField.addSelectOption({
        				value : validVendorsSearchResults[a].id,
        				text : validVendorsSearchResults[a].getValue("entityid")
        			})
    			}
    			
    			var sendRfq_selectVendor_vendorBodyField_withlookup = form.addField({
        			id: "custpage_body_vendor",
        			type : "multiselect",
        			label : "Vendors(s)",
        			source : "vendor"
        		});
        		
        		sendRfq_selectVendor_vendorBodyField_withlookup.updateDisplaySize({
    			    height : 10,
    			    width : 450
    			});
    			
    			sendRfq_selectVendor_vendorBodyField_withlookup.setHelpText({
    				help : "" +
    				"The vendors you select here will be set as the vendor for the previous page."
    			});
    			
    			if(context.request.parameters.linecurrentvendorids)
    			{
    				log.debug("context.request.parameters.linecurrentvendorids", context.request.parameters.linecurrentvendorids)
    				
    				sendRfq_selectVendor_vendorBodyField.defaultValue = context.request.parameters.linecurrentvendorids;
    				sendRfq_selectVendor_vendorBodyField_withlookup.defaultValue = context.request.parameters.linecurrentvendorids;
    			}
    			if(context.request.parameters.preferredvendor)
    			{
    				log.debug("context.request.parameters.preferredvendor", context.request.parameters.preferredvendor)
    				
    				sendRfq_selectVendor_vendorBodyField.defaultValue = context.request.parameters.preferredvendor;
    				sendRfq_selectVendor_vendorBodyField_withlookup.defaultValue = context.request.parameters.preferredvendor;
    			}
    			
    			//currently not working for this multiselect
    			/*sendRfq_selectVendor_vendorBodyField.updateDisplayType({
    			    displayType: serverWidget.FieldDisplayType.ENTRY
    			});
    			
        		sendRfq_selectVendor_vendorBodyField.updateDisplaySize({
        		    height : 600,
        		    width : 1000
        		});*/
        		
//    			var clientScriptInternalId = 185019;//TODO file id of 010CS_PR.js, 02062020 was accidentally deleted, new id 196000
    	    	/*var clientScriptInternalId = 196000;//TODO file id of 010CS_PR.js
    			form.clientScriptFileId = clientScriptInternalId;*/
              	
              	form.clientScriptModulePath = "./010CS_PR_UECLIENT.js";
    		
        		form.addButton({
	    			id : "custpage_submit_selectvendor",
	    			label : "Submit",
	    			functionName : "submitSelectVendorForm"
	    		})
	    		
	    		context.response.writePage({pageObject : form});
    			return;
    		}
    		if(context.request.parameters.createfile)
    		{
    			//sampleCreatePdf();
    			return;
    		}
    		var form = serverWidget.createForm({
    			title : "Send RFQ"
    		})
    		
    		form.addSubmitButton({
    			label : "Submit"
    		});
    		
//    		var clientScriptInternalId = 185019;//TODO file id of 010CS_PR.js, 02062020 was accidentally deleted, new id 196000
	    	/*var clientScriptInternalId = 196000;//TODO file id of 010CS_PR.js
    		form.clientScriptFileId = clientScriptInternalId;*/
          
          	form.clientScriptModulePath = "./010CS_PR_UECLIENT.js";
    		
    		form = createUiElements(form, context);
    		var dataForSublist = getDataForSublist(context);
    		log.debug("dataForSublist", dataForSublist)
    		form = fillSublist(form, context, dataForSublist);
    		
    		context.response.writePage({pageObject : form});
    		return;
    	}
    }

    function submitRfq(context, requestBody)
    {
    	var submitRfq_response = {};
    	try
    	{
    		var submittedRecordId = record.submitFields({
    			type : "purchaserequisition",
    			id : requestBody.targetRecId,
    			values : {custbody_010pr_status : 2}
    		})
    		
    		submitRfq_response.submittedRecordId = submittedRecordId;
    		submitRfq_response.success = true;
    	}
    	catch(e)
    	{
    		submitRfq_response.success = false;
    		log.error("ERROR in function approveRfq", e.message);
    	}
    	return submitRfq_response
    }
    function approveRfq(context, requestBody)
    {
    	var submitRfqResponse = {}
    	try
    	{
    		record.submitFields({
    			type : "purchaserequisition",
    			id : requestBody.targetRecId,
    			values : {custbody_010pr_status : 3}
    		})
    		
    		submitRfq_response.submittedRecordId = submittedRecordId;
    		submitRfq_response.success = true;
    	}
    	catch(e)
    	{
    		submitRfq_response.success = false;
    		log.error("ERROR in function approveRfq", e.message);
    	}
    	return submitRfq_response
    }
    
    function createSubmissionSummaryForm(context, lineToProcessSummaryHtml, linesToProcess_obj)
    {
    	try
    	{
    		
    		var form = serverWidget.createForm({
    			title : "Your request has been submitted. <br/> The following items will be emailed to their respective selected vendors as a Request For Quote. <br/>"
    		})
    		
    		var prList_summary = form.addField({
    			id : "custpage_summary_prlist",
    			type : "inlinehtml",
    			label : "Purchase Request/Requisition LIST"
    		})
    		
    		var additionalScriptsField = form.addField({
    			id : "custpage_additionalscripts",
    			type : "inlinehtml",
    			label : "additional scripts"
    		})
    		
    		additionalScriptsField.defaultValue = "<script>window.opener ? window.opener.window.location.reload() : console.log('parent window missing');</script>"
    		
    		prList_summary.defaultValue = lineToProcessSummaryHtml;
    		context.response.writePage({pageObject : form});
    	}
    	catch(e)
    	{
    		log.error("ERROR in function createSubmissionSummaryForm", e.message);
    	}
    	return;
    }
    
    function createFile(linesToProcess_json)
    {
  	  var fileData = {};
  	  try
  	  {
		var timeStamp = new Date().getTime();

		var fileObj = file.create({
		    name: "payload_sendrfq_" + timeStamp + '.txt',
		    fileType: file.Type.PLAINTEXT,
		    contents: linesToProcess_json
		});
		
//		fileObj.folder = 11457; //SuiteScripts > CLOUDTECH > 010
		//fileObj.folder = 22463; //SuiteScripts > CLOUDTECH > 010 RFQ Payload //sb
		fileObj.folder = 157938; //SuiteScripts > CLOUDTECH > 010 RFQ Payload //prod
		var fileId = fileObj.save();
		log.debug("createFile fileId", fileId)
		var fileData = {};
		fileData.fileId = fileId;
		fileData.filePath = 'SuiteScripts/CLOUDTECH/010/RFQ Payload/' + fileObj.name;

		file.load({
		    id: fileData.filePath
		});
		
		log.debug("SUBMITTED!", "SHOULD PROCESS SELECTED ENTRIES")
//		var runnableTask = task.create({
//	        taskType: task.TaskType.MAP_REDUCE,
//	        scriptId: 'customscript_010mr_rfq',
//	        params: {
//	          custscript_010mr_rfq_payload: fileId,
//	        }
//	      });
  	  }
	  catch(e)
	  {
		  log.error("ERROR in function createFile", e.message);
	  }
	  return fileData;
  }
    
    function getDataForSublist(context)
    {
    	
    	multiselectOptionsValue = '<select multiple>' +
		  '<option value="volvo">Volvo</option>' +
		  '<option value="saab">Saab</option>' +
		  '<option value="opel">Opel</option>' +
		  '<option value="audi">Audi</option>' +
		'</select>'
    	
    	var dataForSublist = {};
    	var dataForSublist_list = [];
    	try
    	{
    		//hardcode for now TODO
    		dataForSublist_list = [{
    			custpage_prnumber : 1,
    			custpage_pritem : 2286, //26-110-364 FILTER
    			custpage_pritem : 124697, //rod's test company
    			custpage_prquantity : 123.45678, //rod's test company
    			custpage_prunitstext : "PC", //rod's test company
    		}]
    		
    		var prSearch = search.load({
    			id : "customsearch_010_getpr_for_rfq_ui"
    		})
    		
    		log.debug("context.request.parameters.requisitionids", context.request.parameters.requisitionids);
    		
    		if(context.request.parameters.requisitionids)
    		{
    			var targetRequisitionIdsCsv = context.request.parameters.requisitionids.trim();
    			var requisitionIds = targetRequisitionIdsCsv.split(",");
    			
    			var requisitionIdFilter = search.createFilter({
					name : "internalid",
					operator : "anyof",
					values : requisitionIds
				})
    			
    			prSearch.filters.push(requisitionIdFilter)
    		}
    		
    		log.debug("prSearch.filters", prSearch.filters);
    		
    		var hrefValue = "<a href='";
    		hrefValue += 'window.open("/app/site/hosting/scriptlet.nl?script=604&deploy=1&selectvendor=T", "Popup", "width=300,height=100")';
        	hrefValue += "'> Select Vendor(s) </a>";
        	
//        	<a href="#" onclick="window.open('some.html', 'yourWindowName', 'width=200,height=150');">Test</a>
        	
        	var hrefValue = "<a href='#' ";
        	hrefValue += "onclick='";
    		hrefValue += 'window.open("/app/site/hosting/scriptlet.nl?script=604&deploy=1&selectvendor=T", "Popup", "width=300,height=100")';
        	hrefValue += "'> Select Vendor(s) </a>";
    		
    		
    		prSearch_results = getResults(prSearch.run());
    		dataForSublist_list = prSearch_results.map(function(res){
    			return {
    				custpage_prid : {value : res.getValue(prSearch.columns[0]), ignore : false},
    				custpage_prtext : {value : res.getValue(prSearch.columns[0]), ignore : false},
//    				custpage_prnumber : {value : 34133772, ignore : false},
    				custpage_prnumbertext : {value : res.getValue(prSearch.columns[1]), ignore : false},
    				custpage_prnumber : {value : res.id, ignore : false},
        			custpage_pritem : {value : res.getValue(prSearch.columns[3]), ignore : false},//26-110-364 FILTER
        			custpage_pritemid : {value : res.getValue(prSearch.columns[3]), ignore : false},
        			custpage_pritemtext : {value : res.getText(prSearch.columns[3]) + " " + res.getValue(prSearch.columns[5]), ignore : false},
        			custpage_pritemdisplayname : {value : res.getValue(prSearch.columns[5]), ignore : false},
        			custpage_prvendoritemcode : {value : res.getValue(prSearch.columns[6]), ignore : false},
        			custpage_prquantity : {value : res.getValue(prSearch.columns[7]), ignore : false},
        			//custpage_prunits : {value : res.getValue(prSearch.columns[8]), ignore : true},
        			custpage_prunitstext : {value : res.getValue(prSearch.columns[8]), ignore : false},
        			custpage_prunitsid : {value : res.getValue(prSearch.columns[8]), ignore : false},
        			custpage_pritemdescription : {value : res.getValue(prSearch.columns[9]), ignore : false},
        			custpage_prvendorpopup : {value : hrefValue, ignore : false},
        			custpage_prline : {value : res.getValue(prSearch.columns[15]), ignore : false},
                  	/*
                  	 * as of 09092021 they want to see PR LINE VENDOR, not the ITEM RECORD PREFERRED VENDOR
        			custpage_pritemprefvendor : {value : res.getText(prSearch.columns[14]), ignore : false},
        			custpage_pritemprefvendorid : {value : res.getValue(prSearch.columns[14]), ignore : false},
        			custpage_prvendor : {value : res.getValue(prSearch.columns[14]), ignore : false},
                  	*/
                  
                  	custpage_prvendor : {value : res.getValue(prSearch.columns[21]), ignore : false},
                  	custpage_prvendorid : {value : res.getValue(prSearch.columns[21]), ignore : false},
                  	custpage_prvendortext : {value : res.getText(prSearch.columns[21]), ignore : false},
                  
                  	custpage_pritemprefvendor : {value : res.getText(prSearch.columns[21]), ignore : false},
        			custpage_pritemprefvendorid : {value : res.getValue(prSearch.columns[21]), ignore : false},
        			custpage_prvendor : {value : res.getValue(prSearch.columns[21]), ignore : false},
                  
        			custpage_prrequestor : {value : res.getValue(prSearch.columns[10]), ignore : false},
        			custpage_prrequestortext : {value : res.getText(prSearch.columns[11]), ignore : false},
        			custpage_prrequireddate : {value : res.getValue(prSearch.columns[18]), ignore : false},
        			custpage_instructions : {value : res.getValue(prSearch.columns[19]), ignore : false},
        			custpage_prexternalunits : {value : res.getValue(prSearch.columns[20]), ignore : false},
    			}
    		})
    		log.debug("prSearch_results", prSearch_results);
    		
    		dataForSublist.list = dataForSublist_list;
    	}
    	catch(e)
    	{
    		log.error("ERROR in functiion getDataForSublist", e.message);
    	}
    	return dataForSublist
    }
    
    function fillSublist(form, context, dataForSublist)
    {
    	try
    	{
    		var prSublist = form.getSublist({
    			id : "custpage_prsublist"
    		});
    		for(var a = 0 ; a < dataForSublist.list.length ; a++)
    		{
    			for(var fieldId in dataForSublist.list[a])
    			{
    				if(!dataForSublist.list[a][fieldId].ignore)
    				{
    					//TC10ROD cannot call setSublistValue with inacceptable value, add condition
    					if(dataForSublist.list[a][fieldId].value)
    					{
    						prSublist.setSublistValue({
            				    id : fieldId,
            				    line : a,
            				    value : dataForSublist.list[a][fieldId].value
            				});
    					}
    				}
    			}
    			
    		}
    	}
    	catch(e)
    	{
    		log.error("ERROR in function fillSublist", e.message);
    	}
    	return form;
    }
    
    function createUiElements(form, context)
    {
    	try
    	{
    		/*form.addButton({
    			id : "custpage_submit",
    			label : "Submit",
    			functionName : "submitRfqForm"
    		})*/
    		
    		form.addTab({
    	        id: 'custtab_filestab',
    	        label: 'Defaults'
    		})
    		
    		/*var inlineHtmlField = form.addField({
    			id: 'custpage_datatables',
		        type: 'inlinehtml',
		        label: 'Select RFQ',
		        container: 'custtab_filestab'
    		})
    		
    		var html = file.load({ id: 185120 }).getContents() || '';
    		
    		inlineHtmlField.defaultValue = html;*/
    		
    		var prSublist = form.addSublist({
    			id : "custpage_prsublist",
    			label : "Purchase Request/Requisition",
//    			tab : "staticlist",
//    			type : "staticlist",
    			type : "list"
    		})
    		
    		for(var a = 0 ; a < sublistFieldObjs.length ; a++)
    		{
    			var sublistFieldObj = prSublist.addField(sublistFieldObjs[a]);
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
    		}
    	}
    	catch(e)
    	{
    		log.error("ERROR in function createUiElements", e.message);
    	}
    	return form;
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
    
    function getPrListObj(context, requestBody)
    {
    	var prListObj = {};
    	var prList = [];
    	try
    	{
    		prListObj.prList = prList;
    	}
    	catch(e)
    	{
    		log.error("ERROR in function getPrListObj", e.message);
    	}
    	return prListObj;
    }

    return {
        onRequest: onRequest
    };
    
});
