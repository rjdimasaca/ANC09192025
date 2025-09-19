/**
 * @NApiVersion 2.x
 * @NScriptType Suitelet
 * @NModuleScope SameAccount
 */
define(['N/config', 'N/email', 'N/file', 'N/https', 'N/record', 'N/redirect', 'N/runtime', 'N/search', 'N/ui/message', 'N/ui/serverWidget', 'N/url', 'N/task', './customReordering.config.js'],
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
function(config, email, file, https, record, redirect, runtime, search, message, serverWidget, url, task, customConfig) {
   
	//THIS IS JUST A TEMPLATE TO MAKE IT EASY TO SEE THE MASTER SETUP, THE ACTUAL VALUES ARE IN customReordering.config.js
	//MASTERSETUP is replaced by what customReordering.config.js provides
	var MASTERSETUP = {}
	
	var sublistFieldObjs = [
		{
			id: "custpage_sl_depleteditem",
			type : "select",
			label : "Depleted Item",
			source : "customrecord_010_depleteditem",
			displayType : serverWidget.FieldDisplayType.HIDDEN,
		},
		{
			id: "custpage_sl_include",
			type : "checkbox",
			label : "INCLUDE?",
		},
		{
			id: "custpage_sl_item",
			type : "select",
			label : "Item",
			source : "item"
		},
		{
			id: "custpage_sl_minstock",
			type : "float",
			label : "Minimum Stock",
		},
		{
			id: "custpage_sl_maxstock",
			type : "float",
			label : "Maximum Stock",
		},
		{
			id: "custpage_sl_qtysnapshot",
			type : "float",
			label : "Last Quantity Snapshot",
		},
		{
			id: "custpage_sl_rqstdqty",
			type : "float",
			label : "Requested Quantity",
			displayType : serverWidget.FieldDisplayType.ENTRY,
		},
		{
			id: "custpage_sl_units_text",
			type : "text",
			label : "Purchase Unit",
			displayType : serverWidget.FieldDisplayType.INLINE,
		},
		{
			id: "custpage_sl_vendor",
			type : "select",
			label : "Vendor",
			displayType : serverWidget.FieldDisplayType.INLINE,
			source : "vendor"
		},
//		{
//			id: "custpage_sl_vendor_text",
//			type : "text",
//			label : "Vendor",
//			displayType : serverWidget.FieldDisplayType.INLINE,
//		},
		{
			id: "custpage_sl_lastpurchaseprice",
			type : "currency",
			label : "Last Purchase Price",
			displayType : serverWidget.FieldDisplayType.INLINE,
		},
		{
			id: "custpage_sl_prfrrdlctn",
			type : "select",
			label : "Preferred Location",
			source : "location",
			displayType : serverWidget.FieldDisplayType.HIDDEN,
		},
		{
			id: "custpage_sl_status",
			type : "select",
			label : "Status",
			source : "customlist_010_depleteditemstatus",
			displayType : serverWidget.FieldDisplayType.HIDDEN,
		},
//		{
//			id: "custpage_sl_batch",
//			type : "select",
//			label : "Item?",
//			source : "item"
//		},
	];
	
	
	var groupBy = function(xs, key) {
		  return xs.reduce(function(rv, x) {
		    (rv[x[key]] = rv[x[key]] || []).push(x);
		    return rv;
		  }, {});
		};
	
	
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
    			var dataForSublist = getDataForSublist(context);
    			var form = listingForm(context, dataForSublist);
    			
    			context.response.writePage({
    				pageObject : form
    			})
    		}
    		else if(context.request.method == "POST")
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
    	    		case "submitReorder":
    	    			responseObj = submitReorder(context, requestBody); 
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
        			submitReorder(context, requestBody)
        			
        		}
        		form = summaryForm(context);
        		
        		context.response.writePage({
    				pageObject : form
    			})
    		}
    	}
    	catch(e)
    	{
    		log.error("ERROR in function onRequest", e.message);
    	}
    }
    
    function summaryForm(context)
    {
    	var form = serverWidget.createForm({
    		title : "Your request for reorder has been submitted." +
    				"<br/>" +
    				"An email message will be sent to your email address " +
    				"<i>" + 
    				runtime.getCurrentUser().email +
    				"</i>" +
    				" when the request is completed."
    	});
    	
    	return form;
    }
    
    function submitReorder(context, requestBody)
    {
		var sublistFieldIds = [];
		var linesToProcess = [];
		log.debug("context.request1", context.request);

		var sublistCount = context.request.getLineCount({
		    group: MASTERSETUP.sublistId
		});
		
		log.debug("sublistCount2 group", sublistCount)
		for(var z = 0 ; z < sublistCount ; z++)
		{
			var sublistData_include = context.request.getSublistValue({
			    group: MASTERSETUP.sublistId,
			    name: MASTERSETUP.sublist_include_id,
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
					sourceRow.group = MASTERSETUP.sublistId;
					sourceRow.name = sublistFieldObjs[a].id;
					
					sourceRow_value[sourceRow.name] = {name : sourceRow.name, value : context.request.getSublistValue(sourceRow) || ""};
				}
				linesToProcess.push(sourceRow_value)
				
				log.debug("sourceRow_value", sourceRow_value)
				
				log.debug("linesToProcess progress value", linesToProcess)
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
				scriptId: 'customscript_010mr_customreordering',
				params: {
					custscript_010mr_reord_payloadfileid: fileData,
				}
			});
		  
			var mrStatus = runnableTask.submit();
			log.debug("mrStatus1", mrStatus);
			if(mrStatus)
			{
				log.debug("mrStatus2", mrStatus);
				//context.response.write(linesToProcess_json);
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
    
    function createFile(linesToProcess_json)
    {
  	  var fileData = {};
  	  try
  	  {
		var timeStamp = new Date().getTime();

		var fileObj = file.create({
		    name: "payload_reorder_" + timeStamp + '.txt',
		    fileType: file.Type.PLAINTEXT,
		    contents: linesToProcess_json
		});
		
//		fileObj.folder = 11457; //SuiteScripts > CLOUDTECH > 010
		fileObj.folder = 34166; //SuiteScripts > CLOUDTECH > 010 > reordering payload
		var fileId = fileObj.save();
		log.debug("createFile fileId", fileId)
		var fileData = {};
		fileData.fileId = fileId;
		fileData.filePath = 'SuiteScripts/CLOUDTECH/010/Reordering Payload/' + fileObj.name;

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
    
    function getLatestBatch()
    {
    	var latestBatchResult = {};
    	
    	try
    	{
    		var latestBatchSearch = search.load({
        		id : "customsearch_010latestdepleteditembatch"
        	})
        	var latestBatchIdSr = latestBatchSearch.run().getRange({
        		start : 0,
        		end : 1
        	}) || [];
        	
        	if(latestBatchIdSr.length > 0)
        	{
        		latestBatchId = latestBatchIdSr[0].id
        		latestBatchResult.latestBatchId = latestBatchId;
        	}
    	}
    	catch(e)
    	{
    		log.error("ERROR in function getLatestBatch", e.message);
    	}
    	
    	return latestBatchResult;
    }
    
    function getDataForSublist(context)
    {
    	var dataForSublist = {};
    	var dataForSublist_list = [];
    	try
    	{
    		//hardcode for now TODO
//    		dataForSublist_list = [{
//    			custpage_prnumber : 1,
//    			custpage_pritem : 2286, //26-110-364 FILTER
//    			custpage_pritem : 124697, //rod's test company
//    			custpage_prquantity : 123.45678, //rod's test company
//    			custpage_prunitstext : "PC", //rod's test company
//    		}]
    		
    		var latestBatchResult = getLatestBatch();
        	var latestBatchId = latestBatchResult.latestBatchId;
        	
        	log.debug("latestBatchId", latestBatchId)
        	
        	if(latestBatchId)
        	{
        		var latestDepletedItemsSearch = search.load({
            		id : "customsearch_010_btchdpltditemstoreorder",
            	})
            	var batchFilterObj = search.createFilter({
            			name : "custrecord_010_dpltditem_batch",
            			operator : "anyof",
            			values : latestBatchId
            		})
            	
            	latestDepletedItemsSearch.filters.push(batchFilterObj);
        		
        		//filter by repairable
                var repairableFilterObj = search.createFilter({
                    name : "custitem_010repairable",
                    join : "custrecord_010dpltditem_item",
                    operator : "is",
                    values : false
                })
                
                latestDepletedItemsSearch.filters.push(repairableFilterObj);
        		
        		var latestDepletedItemsSearchResults = getResults(latestDepletedItemsSearch.run());
        		
        		dataForSublist_list = latestDepletedItemsSearchResults.map(function(res){
        			return {
        				custpage_sl_depleteditem : {value : res.id, ignore : false},
        				custpage_sl_item : {value : res.getValue(latestDepletedItemsSearch.columns[1]), ignore : false},
        				custpage_sl_item_text : {value : res.getText(latestDepletedItemsSearch.columns[1]), ignore : false},
        				custpage_sl_qtysnapshot : {value : res.getValue(latestDepletedItemsSearch.columns[2]), ignore : false},
        				custpage_sl_minstock : {value : res.getValue(latestDepletedItemsSearch.columns[4]), ignore : false},
        				custpage_sl_maxstock : {value : res.getValue(latestDepletedItemsSearch.columns[3]), ignore : false},
        				custpage_sl_prfrrdlctn : {value : res.getValue(latestDepletedItemsSearch.columns[5]), ignore : false},
        				custpage_sl_prfrrdlctn_text : {value : res.getValue(latestDepletedItemsSearch.columns[5]), ignore : false},
        				custpage_sl_status : {value : res.getValue(latestDepletedItemsSearch.columns[6]), ignore : false},
        				custpage_sl_units : {value : res.getValue(latestDepletedItemsSearch.columns[6]), ignore : false},
        				custpage_sl_units_text : {value : res.getText(latestDepletedItemsSearch.columns[7]), ignore : false},
        				custpage_sl_item_dispname : {value : res.getValue(latestDepletedItemsSearch.columns[7]), ignore : false},
        				custpage_sl_vendor : {value : res.getValue(latestDepletedItemsSearch.columns[9]), ignore : false},
        				custpage_sl_vendor_text : {value : res.getText(latestDepletedItemsSearch.columns[9]), ignore : false},
        				custpage_sl_lastpurchaseprice : {value : res.getValue(latestDepletedItemsSearch.columns[10]), ignore : false},
        				custpage_sl_rqstdqty : {
        					value : Number(res.getValue(latestDepletedItemsSearch.columns[3]) || 0) - Number(res.getValue(latestDepletedItemsSearch.columns[2]) || 0),
        					ignore : false
        					},
        			}
        		})
        	}
        	
        	log.debug("dataForSublist_list", dataForSublist_list)
        	
        	dataForSublist.list = dataForSublist_list;
    	}
    	catch(e)
    	{
    		log.error("ERROR in function getDataForSublist", e.message);
    	}
    	
    	log.debug("dataForSublist", dataForSublist)
    	
    	return dataForSublist;
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

        	var depletedItemsSublist = form.addSublist({
    			id : "custpage_depleteditems",
    			label : "Depleted Items",
    			type : "list"
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
    		}
    	}
    	catch(e)
    	{
    		log.error("ERROR in function createUiElements", e.message);
    	}
    	return form;
    }
    
    function fillSublist(form, context, dataForSublist)
    {
    	try
    	{
    		
    		log.debug("fillSublist dataForSublist : ", dataForSublist)
    		var sublistObj = form.getSublist({
    			id : "custpage_depleteditems"
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
    						sublistObj.setSublistValue({
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
    
    function listingForm(context, dataForSublist)
    {
    	form = serverWidget.createForm({
    		title : "Reordering"
    	});
    	
    	/*var clientScriptInternalId = 204681;//TODO file id of 010CS_customReordering.js
		form.clientScriptFileId = clientScriptInternalId;*/
		
		form.clientScriptModulePath = "./010CS_customReordering.js";
		
		form.addSubmitButton({
			label : "Submit"
		});
		
//    	var clientScriptInternalId = 196000;//TODO file id of 010CS_PR.js
//		form.clientScriptFileId = clientScriptInternalId;
		
		form = createUiElements(form, context);
		//var dataForSublist = getDataForSublist(context);
		log.debug("dataForSublist", dataForSublist)
		form = fillSublist(form, context, dataForSublist);
		
		

		form = createPendingSublist(form, context, dataForSublist);
		
    	return form
    }
    
    function createPendingSublist(form, context)
    {
    	log.debug("createPendingSublist", createPendingSublist);
    	var sublistFields = [
    		{
        		id : "custpage_psl_depleteditemmmm",
        		label : "Source",
        		type : "select",
        		source : "customrecord_010_depleteditem",
        	},
    		{
        		id : "custpage_psl_transaction",
        		label : "Transaction",
        		type : "select",
        		source : "transaction",
        	},
    		{
        		id : "custpage_psl_item",
        		label : "Item",
        		type : "select",
        		source : "item",
        	},
        	{
        		id : "custpage_psl_minstock",
        		label : "Min Stock",
        		type : "float",
        	},
        	{
        		id : "custpage_psl_maxstock",
        		label : "Max Stock",
        		type : "float",
        	},
        	{
        		id : "custpage_psl_qtysnapshot",
        		label : "Quantity Snapshot",
        		type : "float",
        	},
        	{
        		id : "custpage_psl_rqstdqty",
        		label : "Transaction Qty",
        		type : "float",
        	},
        	{
        		id : "custpage_psl_units_text",
        		label : "Units",
        		type : "text",
        	},
        	{
        		id : "custpage_psl_status",
        		label : "Depletion Status",
        		type : "select",
        		source : "customlist_010_depleteditemstatus"
        	},
        	
        	
    	]
    	
    	var pendingSublist = form.addSublist({
			id : "custpage_pendingitems",
			label : "In Progress",
			type : "list"
    	});
    	for(var a = 0 ; a < sublistFields.length ; a++)
    	{
    		var sublistFieldObj = pendingSublist.addField(sublistFields[a]);
    		if(sublistFieldObjs[a].displayType)
			{
				sublistFieldObj.updateDisplayType({
	    		    displayType: sublistFieldObjs[a].displayType
	    		});
			}
//			if(sublistFieldObjs[a].updateDisplaySize)
//			{
//				sublistFieldObj.updateDisplaySize(sublistFieldObjs[a].updateDisplaySize);
//			}
    	}
    	
    	var searchObj = search.load({
    		id : "customsearch_010getdepleteditems_ordreq1"
    	});
    	var searchObjResults = getResults(searchObj.run());
    	
    	searchObjResults = searchObjResults.map(function(res){
			return {
				custpage_psl_transaction : {value : res.getValue(searchObj.columns[0]), ignore : false},
				custpage_psl_depleteditem : {value : res.getValue(searchObj.columns[1]), ignore : false},
				custpage_psl_item : {value : res.getValue(searchObj.columns[2]), ignore : false},
				custpage_psl_item_text : {value : res.getText(searchObj.columns[2]), ignore : false},
				custpage_psl_qty : {value : res.getValue(searchObj.columns[3]), ignore : false},
				custpage_psl_qtysnapshot : {value : res.getValue(searchObj.columns[7]), ignore : false},
				custpage_psl_minstock : {value : res.getValue(searchObj.columns[6]), ignore : false},
				custpage_psl_maxstock : {value : res.getValue(searchObj.columns[5]), ignore : false},
//				custpage_psl_prfrrdlctn : {value : res.getValue(searchObj.columns[5]), ignore : false},
//				custpage_psl_prfrrdlctn_text : {value : res.getValue(searchObj.columns[5]), ignore : false},
				custpage_psl_status : {value : res.getValue(searchObj.columns[4]), ignore : false},
				custpage_psl_units : {value : res.getValue(searchObj.columns[8]), ignore : false},
				custpage_psl_units_text : {value : res.getText(searchObj.columns[8]), ignore : false},
				custpage_psl_item_dispname : {value : res.getValue(searchObj.columns[5]), ignore : false},
				custpage_psl_vendor : {value : res.getValue(searchObj.columns[9]), ignore : false},
				custpage_psl_vendor_text : {value : res.getText(searchObj.columns[9]), ignore : false},
				custpage_psl_rqstdqty : {
					value : Number(res.getValue(searchObj.columns[5]) || 0) - Number(res.getValue(searchObj.columns[7]) || 0),
					ignore : false
					},
					
			}
		})
		
		log.debug("searchObjResults", searchObjResults);
    	
    	
    	for(var a = 0 ; a < searchObjResults.length ; a++)
    	{
    		for(var fieldId in searchObjResults[a])
			{
    			log.debug("fieldId", fieldId);
				//TC10ROD cannot call setSublistValue with inacceptable value, add condition
				if(searchObjResults[a][fieldId].value)
				{
					pendingSublist.setSublistValue({
    				    id : fieldId,
    				    line : a,
    				    value : searchObjResults[a][fieldId].value
    				});
				}
			}
    	}
    	
    	
    	return form
    }

    return {
        onRequest: onRequest
    };
    
});
