/**
 * @NApiVersion 2.x
 * @NScriptType MapReduceScript
 * @NModuleScope SameAccount
 */
define(['N/file', 'N/config', 'N/email', 'N/https', 'N/record', 'N/runtime', 'N/search', 'N/url',  './customReordering.config.js'],
/**
 * @param {config} config
 * @param {email} email
 * @param {https} https
 * @param {record} record
 * @param {runtime} runtime
 * @param {search} search
 * @param {url} url
 */
function(file, config, email, https, record, runtime, search, url, customConfig) {
   
	var MASTERSETUP = {}

	function depletedItems_setStatus(tranType, params, statusId)
	{
		log.debug("depletedItems_setStatus", {tranType : tranType, params : params, statusId : statusId})
		
		//TODO you can lookup the BATCH, and delete it from the batch sublist, so you can update multi child item in one go
		var depletedItemIds = [];
		try
		{
			var tranRecord = record.load({
				type : tranType,
				id : params.tranId
			});
			
			var sublistCount = tranRecord.getLineCount({
				sublistId : "item"
			});
			
			
			for(var a = 0; a < sublistCount; a++)
			{
				var line_depletedItemId = tranRecord.getSublistValue({
					sublistId : "item",
					fieldId :  MASTERSETUP.transactions.columns.reorderingsource,
					line : a,
					value : statusId
				});
				
				log.debug("MASTERSETUP.transactions.columns.reorderingsource", MASTERSETUP.transactions.columns.reorderingsource);
				log.debug("depletedItems_setStatus line_depletedItemId", line_depletedItemId);
				
				if(line_depletedItemId)
				{
					log.debug("depletedItems_setStatus params.depletedItemfieldsToUpdate", params.depletedItemfieldsToUpdate)
					depletedItemIds.push({
						type : MASTERSETUP.depletedItem.recordId,
						id : line_depletedItemId,
						values : params.depletedItemfieldsToUpdate
					})
				}
			}
//			custrecord_010dpltditem_status
		}
		catch(e)
		{
			log.error("ERROR in function depletedItems_setStatus", e.message);
		}
		
		return depletedItemIds;
	}
	
    /**
     * Marks the beginning of the Map/Reduce process and generates input data.
     *
     * @typedef {Object} ObjectRef
     * @property {number} id - Internal ID of the record instance
     * @property {string} type - Record type id
     *
     * @return {Array|Object|Search|RecordRef} inputSummary
     * @since 2015.1
     */
    function getInputData()
    {
		MASTERSETUP = customConfig.masterSetup;
		var param_fileObj = runtime.getCurrentScript().getParameter({ name: 'custscript_010mr_reord_payloadfileid'});
		var param_poId = runtime.getCurrentScript().getParameter({ name: 'custscript_010mr_reord_poid'});
		var param_irId = runtime.getCurrentScript().getParameter({ name: 'custscript_010mr_reord_irid'});
		var param_prId = runtime.getCurrentScript().getParameter({ name: 'custscript_010mr_reord_prid'});
		
		param_poId = param_poId ? JSON.parse(param_poId) : "";
		param_irId = param_irId ? JSON.parse(param_irId) : "";
		param_prId = param_prId ? JSON.parse(param_prId) : "";
		
		log.debug("param_prId", param_prId);
		
		if(param_poId)
		{
			var depletedItemIds = depletedItems_setStatus("purchaseorder", param_poId, 3);
			return {depletedItemIdsToUpdate : depletedItemIds}
		}
		else if(param_irId)
		{
			var depletedItemIds = depletedItems_setStatus("itemreceipt", param_irId, 4);
			return {depletedItemIdsToUpdate : depletedItemIds}
		}
		else if(param_prId)
		{
			var depletedItemIds = depletedItems_setStatus("purchaserequisition", param_prId, "");
			return {depletedItemIdsToUpdate : depletedItemIds}
		}
		else if(param_fileObj)
		{
			log.debug("param_fileObj", param_fileObj);
			var param_fileObj = JSON.parse(param_fileObj);
			log.debug("JSON PARSED param_fileObj", param_fileObj);
			
			var fileId = param_fileObj.fileId;
	        var filePath = param_fileObj.filePath;
	        //log.debug("TC10RODfileId", fileId);
	        if(fileId)
	        {
	        	var fileObj = file.load({
	            	id :fileId, 
//	            	id :filePath 
	            })
	            var fileContents = fileObj.getContents();
	        	//log.debug("TC10RODfileContents", fileContents);
	            data = JSON.parse(fileContents)
	            //log.debug("TC10RODdata1", data);
//	            data = data.length ? JSON.parse(data) : [];
	            //log.debug("TC10RODdata2", data);
	            
	            var deletedFileId = file.delete({
	            	id: fileId
	            });
	            log.debug("TC10RODdeletedFileId", deletedFileId);
	        }
	        log.audit('getData INPUT_DATA', JSON.stringify(data));
//	        data.linesToProcess = _.groupBy(data.linesToProcess, 'custpage_prvendor')
	        
//	        data.linesToProcess = splitVendors(data.linesToProcess); //TC10ROD not needed, only 1 vendor
	        log.debug("data.linesToProcess after splitVendors", data.linesToProcess);
	        return data.linesToProcess;
		}
		else
		{
	    	//do the creation of record in the input stage to minimize issues
	    	//if the map and reduce keys gets messed up, it could cause chaos.
	    	//the process off loaded to this entry point is fairly small, just a search, and 1 record to create.
	    	var executionObj = execute();
	    	log.debug("executionObj", executionObj);
	    	
	    	return executionObj;
		}
    }

    /**
     * Executes when the map entry point is triggered and applies to each key/value pair.
     *
     * @param {MapSummary} context - Data collection containing the key/value pairs to process through the map stage
     * @since 2015.1
     */
    function map(context)
    {
    	log.debug("context", context)
    	if(context.key == "emailObj")
    	{
    		log.debug("map context.value", context.value)
    		log.debug("map context.value.length", context.value.length)
    		log.debug("map context.value.jsonparse", JSON.parse(context.value));
    		sendEmails(context.value);
    	}
    	
    	//TODO you can offload this to REDUCE, but they need to have a unique key
    	//otherwise, only 1 processor is doing the updates
    	if(context.key == "depletedItemIdsToUpdate")
    	{
    		log.debug("DEPLETED ITEM IDS TO UPDATE", "AT THIS POINT YOU SHOULD BE UPDATING DEPLETED ITEM STATUS");
    		log.debug("AVAILABLE DATA from context.value", context.value);
    		log.debug("AVAILABLE DATA from context.value.length", context.value.length);
    		var depletedItemsToUpdateList = JSON.parse(context.value);
    		for(var a = 0 ; a < depletedItemsToUpdateList.length ; a++)
    		{
    			var depletedItemsToUpdateEntry = depletedItemsToUpdateList[a];
    			var submittedRecordId = record.submitFields(depletedItemsToUpdateEntry);
    			log.debug("submittedRecordId", submittedRecordId);
    		}
    	}
    	else
    	{

    		log.debug("map context", context);
    		    	
    		    	var data = JSON.parse(context['value']);
    		    	
    		    	log.debug('data', data);
    		    	log.debug('data.custpage_sl_vendor', data.custpage_sl_vendor);
    		    	log.debug('data.custpage_sl_vendor.value', data.custpage_sl_vendor.value);
    		    	var vendorId = data["custpage_sl_vendor"] && data["custpage_sl_vendor"].value ? data["custpage_sl_vendor"].value : "-1"
    		    	context.write({
//    		    		key: (data["custpage_sl_vendor"] ? data["custpage_sl_vendor"].value : "") + '_' + (data["custpage_prnumber"] ? data["custpage_prnumber"].value : "")/* + '_' + (data.custpage_pritemid || "")*/,
    		    		key: vendorId,
    		    	    value: data
    		    	});
    		    	
    	}
    }
    
    function sendEmails(emailObjStr)
    {
    	try
    	{
    		var emailObj = JSON.parse(emailObjStr);
    		for(var a = 0 ; a < emailObj.recipientChunks.length ; a++)
    		{
    			emailObj.recipients = emailObj.recipientChunks[a];
    			email.send(emailObj);
    			log.debug("EMAIL sent to chunk : ", emailObj.recipientChunks[a]);
    		}
    	}
    	catch(e)
    	{
    		log.error("ERROR in function sendEmails", e.message);
    	}
    }

    /**
     * Executes when the reduce entry point is triggered and applies to each group.
     *
     * @param {ReduceSummary} context - Data collection containing the groups to process through the reduce stage
     * @since 2015.1
     */
    function reduce(context)
    {
    	MASTERSETUP = customConfig.masterSetup;
    	log.debug("REDUCE context", context);
    	var vendorId = "";
    	
    	createPrResult = createPr(context)
    	
    	log.debug("REDUCE VENDORID", vendorId);
    }
    
    function createPr(context)
    {
    	try
    	{

        	log.debug("createPr", 1)
        	var createPrResult = {};
        	var vendorId = "";
        	if(context.key && Number(context.key) == -1)
        	{
        		vendorId = ""; //dont use vendor at all
        	}
        	else if(context.key && Number(context.key) > 0)
        	{
        		vendorId = Number(context.key);
        	}
        	log.debug("createPr", 2)
        	var prRecordObj = record.create({
        		type : "purchaserequisition"
        	})
        	log.debug("createPr", 3)
        	//TODO hardcoded send as parameter or get from session!
        	prRecordObj.setValue({
        		fieldId : "entity",
        		value : runtime.getCurrentUser().id
        	})
        	
        	//AS REQUESTED BY AUDREY, REORDERS ARE AUTO APPROVED
        	prRecordObj.setValue({
        		fieldId : "custbody_010pr_status",
        		value : 3 //3 is approved status
        	})
        	prRecordObj.setValue({
        		fieldId : "custbody_010submittedfrom",
        		value : 'Reordering'
        	})
        	
        	log.debug("runtime.getCurrentUser().id", runtime.getCurrentUser().id);
        	log.debug("prRecordObj", prRecordObj)
        	log.debug("context.values.length", context.values.length);
        	for(var a = 0 ; a < context.values.length ; a++)
        	{
        		var lineEntry = context.values[a];

            	log.debug("lineEntry", lineEntry);
            	lineEntry = JSON.parse(lineEntry);
            	log.debug("lineEntry.custpage_sl_item", lineEntry.custpage_sl_item);
            	
        		prRecordObj.setSublistValue({
        			sublistId : "item",
        			fieldId : "item",
        			line : a,
        			value : lineEntry.custpage_sl_item.value
        		})
        		prRecordObj.setSublistValue({
        			sublistId : "item",
        			fieldId : "quantity",
        			line : a,
        			value : lineEntry.custpage_sl_rqstdqty.value
        		})
        		prRecordObj.setSublistValue({
        			sublistId : "item",
        			fieldId : "vendor",
        			line : a,
        			value : vendorId
        		})
        		prRecordObj.setSublistValue({
        			sublistId : "item",
        			fieldId : "custcol_010reorderingsource",
        			line : a,
        			value : lineEntry.custpage_sl_depleteditem.value
        		})
        	}
        	
        	var prRecord_id = prRecordObj.save();
        	var prLinkElement = getPrLink(prRecord_id);
        	
        	var depletedItemRecordsToUpdate = context.values.map(function(lineEntry){
        		log.debug("lineEntry", lineEntry);
        		lineEntry = JSON.parse(lineEntry)
        		log.debug("elem.custpage_sl_depleteditem", lineEntry.custpage_sl_depleteditem);
        		log.debug("elem.custpage_sl_depleteditem.value", lineEntry.custpage_sl_depleteditem.value);
        		
        		record.submitFields({
        			type : MASTERSETUP.depletedItem.recordId,
        			id : lineEntry.custpage_sl_depleteditem.value,
        			values : {
        				custrecord_010dpltditem_status : MASTERSETUP.depletedItemStatus.requested
        			}
        		})
        		
        		return lineEntry.custpage_sl_depleteditem.value
        	})
        	
        	log.debug("depletedItemRecordsToUpdate", depletedItemRecordsToUpdate);
        	
        	var emailBody = MASTERSETUP.emailDefaults_successfulreorder.body;
        	
        	emailBody = emailBody.replace("{PRLINK}", prLinkElement)
        	email.send({
        		author : runtime.getCurrentUser().id,
        		recipients : runtime.getCurrentUser().id,
        		subject : MASTERSETUP.emailDefaults_successfulreorder.subject,
        		body : emailBody
        	})
        	log.debug("prRecord_id", prRecord_id);
        	
    	}
    	catch(e)
    	{
    		log.error("ERROR in function createPr", e.message);
    	}
    	
    	return createPrResult;
    }

    function getPrLink(prRecord_id)
    {
    	var prLink = "";
    	try
    	{
    		var prBaseUrl = url.resolveRecord({
        	    recordType: "purchaserequisition",
        	    recordId: prRecord_id,
        	    isEditMode: false
        	});
    		
    		var prRefLookup = search.lookupFields({
    			type : "purchaserequisition",
    			id : prRecord_id,
    			columns : ["tranid"]
    		})
    		
    		log.debug("prRefLookup", prRefLookup);
    		
    		prLink = "<a href='" + prBaseUrl + "'>" + "PURCHASE REQUISITION : " + prRefLookup.tranid + "</a>"
    	}
    	catch(e)
    	{
    		log.debug("ERROR in function getPrLink", e.message);
    	}
    	return prLink
    }
    /**
     * Executes when the summarize entry point is triggered and applies to the result set.
     *
     * @param {Summary} summary - Holds statistics regarding the execution of a map/reduce script
     * @since 2015.1
     */
    function summarize(summary)
    {
		log.debug("summary", summary);
    }
	
	
	
	
	
	function getItems_ordered_requested(scriptContext)
	{
		var items_ordered_requested = [];
		try
		{
    		log.debug("getItems_ordered_requested", 0)
			var targetItemsSearch = search.load({
    			id : MASTERSETUP.searches.getItemsReorderedRequested.id
    		});
    		log.debug("getItems_ordered_requested", 1)
    		var targetItemsSearch_results = getResults(targetItemsSearch.run());
    		log.debug("getItems_ordered_requested", 2)
    		targetItemsSearch_results = targetItemsSearch_results.map(function(res){
    			return res.getValue(MASTERSETUP.depletedItem.itemFieldId) //ITEM
    		})
    		log.debug("getItems_ordered_requested", 3)
    		items_ordered_requested = items_ordered_requested.concat(targetItemsSearch_results)
		}
		catch(e)
		{
			log.error("ERROR in function getItems_ordered_requested");
		}
		
		
		log.debug("final items_ordered_requested", items_ordered_requested);
		return items_ordered_requested;
	}
	
	
    /**
     * Definition of the Scheduled script trigger point.
     *
     * @param {Object} scriptContext
     * @param {string} scriptContext.type - The context in which the script is executed. It is one of the values from the scriptContext.InvocationType enum.
     * @Since 2015.2
     */
    function execute(scriptContext)
    {
		var executionResult = {};
		var batchRecord_submittedId = null;
    	try
    	{
//    		deleteAllDepletedItemCustomRecord() //TODO clear out the child records
    		deleteAllDepletedItemCustomRecord_viaLatestBatch() //TODO do it via parent record to check which is faster? note that this will not trigger child record user event scripts
    		var items_ordered_requested = getItems_ordered_requested(scriptContext);
    		
    		var targetItemsSearch = null;
    		if(items_ordered_requested && items_ordered_requested.length > 0)
    		{
    			targetItemsSearch = search.load({
        			id : MASTERSETUP.searches.getTargetItemForReordering.id,
//        			filters : ["internalid", "noneof", items_ordered_requested]
        		});
    			
    			targetItemsSearch.filters.push(
    				search.createFilter({
    					name : "internalid",
    					operator : "noneof",
    					values : items_ordered_requested
    				})
    			)
    			log.debug("execute", 1)
    		}
    		else
    		{
    			targetItemsSearch = search.load({
        			id : MASTERSETUP.searches.getTargetItemForReordering.id,
        		});
    			log.debug("execute", 2)
    		}
    		    		
    		var targetItemsSearch_results = getResults(targetItemsSearch.run());

			log.debug("targetItemsSearch_results1", targetItemsSearch_results)
    		targetItemsSearch_results = targetItemsSearch_results.map(map_targetItemsSearch_results)
    		
    		log.debug("targetItemsSearch_results2", targetItemsSearch_results)
    		
    		var batchRecord = record.create({
    			type : MASTERSETUP.depletedItemBatch.recordId
    		})
    		
    		var batchObj = getBatchObj();
    		
    		batchRecord.setValue({
    			fieldId : "name",
    			value : batchObj.name
    		})
    		
    		for(var a = 0 ; a < targetItemsSearch_results.length ; a++)
    		{
    			var resultEntry = targetItemsSearch_results[a];
    			
    			MASTERSETUP.depletedItemBatch.autopopulatedColumns.forEach(function(columnId){
    				batchRecord.setSublistValue({
        				sublistId : MASTERSETUP.depletedItemBatch.depletedItemSublistId,
        				fieldId : columnId,
        				value : resultEntry[columnId].value,
        				line : a
        			})
    			})
    		}
    		
    		if(targetItemsSearch_results && targetItemsSearch_results.length > 0)
    		{
    			var emailObj = {};
        		emailObj.author = MASTERSETUP.emailDefaults.author;
        		emailObj.recipients = MASTERSETUP.emailDefaults.recipients;
        		emailObj.subject = MASTERSETUP.emailDefaults.subject;
        		emailObj.body = MASTERSETUP.emailDefaults.body;
        		
        		var emailObjResult = getEmailObjResult(targetItemsSearch_results, batchObj.name);
        		emailObj.body += emailObjResult.body;
        		
        		var recipientChunks = chunkArray(emailObj.recipients, 9); //splice affects the target array
        		emailObj.recipientChunks = recipientChunks;
        		batchRecord_submittedId = batchRecord.save();
            	executionResult.emailObj = emailObj;
    		}
    		
    		log.debug("batchRecord_submittedId", batchRecord_submittedId);
    	}
    	catch(e)
    	{
    		log.error("ERROR in function execute", e.message);
    	}
    	
    	executionResult.batchRecord_submittedId = batchRecord_submittedId;
    	return executionResult
    }
	
	function getEmailObjResult(targetItemsSearch_results, batchObjName)
	{
		var emailObjResult = {};
		//emailObjResult.body = "\n test body";
		
		var emailBody = "";
		
		var baseTable = runtime.getCurrentScript().getParameter({ name: 'custscript_010reorder_emailbodytemplate'});
		
		log.debug("baseTable from script param", baseTable);
		for(var a = 0 ; a < targetItemsSearch_results.length ; a++)
		{
			var resultEntry = targetItemsSearch_results[a];
			emailBody += "<tr>" +
								"<td>" +
								resultEntry.custrecord_010dpltditem_displayname.value +
								"</td>" +
								"<td>" +
								resultEntry.custrecord_010dpltditem_qtysnapshot.value +
								"</td>" +
								"<td>" +
								resultEntry.custrecord_010dpltditem_maxstock.value +
								"</td>" +
								"<td>" +
								resultEntry.custrecord_010dpltditem_minstock.value +
								"</td>" +
								"<td>" +
								resultEntry.custrecord_010dpltditem_units.text +
								"</td>" +
//								"<td>" +
//								"<a href=''>" +
//								batchObjName +
//								"</a>" +
//								"</td>" +
							"</tr>";
		}
		
		baseTable = baseTable.replace("<tableContents></tableContents>", emailBody)
		
		emailObjResult.body = baseTable;

		return emailObjResult;
	}
    
    function getBatchObj()
    {
    	var batchObj = {};
    	try
    	{
    		var targetDate = new Date();
    		var timeStampValue = targetDate.getTime();
    		var datePrefix = formatDateYYYYMMDD(targetDate);
    		batchObj.name = datePrefix + "_" + timeStampValue;
    	}
    	catch(e)
    	{
    		log.error("ERROR in function getBatchObj", e.message);
    	}
    	
    	return batchObj;
    }
    
    function formatDateYYYYMMDD(targetDate)
    {
    	if(!targetDate)
    	{
    		targetDate = new Date();
    	}
    	
    	var targetDate_date_month = (Number(targetDate.getMonth()) + 1);
    	var targetDate_date_year = targetDate.getFullYear();
    	var targetDate_date_date = targetDate.getDate();
    	
    	if(targetDate_date_month < 10)
    	{
    		targetDate_date_month = "0" + targetDate_date_month
    	}
    	if(targetDate_date_date < 10)
    	{
    		targetDate_date_date = "0" + targetDate_date_date
    	}
    	
    	targetDate = targetDate_date_year + "_" + targetDate_date_month  + "_" + targetDate_date_date;
    	return targetDate
    }
    
    function map_targetItemsSearch_results(res)
    {
		var obj = {};
    	try
    	{
        	obj.custrecord_010dpltditem_item = {
        			value : res.getValue(res.columns[1]),
        			text : res.getText(res.columns[1])
        			};
        	obj.custrecord_010dpltditem_qtysnapshot = {
        			value : res.getValue(res.columns[4]),
        			text : res.getText(res.columns[4])
        			};
        	obj.custrecord_010dpltditem_maxstock = {
        			value : res.getValue(res.columns[3]),
        			text : res.getText(res.columns[3])
        			};
        	obj.custrecord_010dpltditem_minstock = {
        			value : res.getValue(res.columns[2]),
        			text : res.getText(res.columns[2])
        			};
        	obj.custrecord_010dpltditem_prfrrdlctn = {
        			value : res.getValue(res.columns[7]),
        			text : res.getText(res.columns[7])
        			};
        	obj.custrecord_010dpltditem_status = {
        			value : res.getValue(res.columns[8]),
        			text : res.getText(res.columns[8])
        			};
        	
        	obj.custrecord_010dpltditem_units = {
        			value : res.getValue(res.columns[5]),
        			text : res.getText(res.columns[5])
        			};

        	obj.custrecord_010dpltditem_displayname = {
        			value : res.getValue(res.columns[6]),
        			text : res.getText(res.columns[6])
        			};
        	obj.custrecord_010dpltditem_vendor = {
        			value : res.getValue(res.columns[9]),
        			text : res.getText(res.columns[9])
        			};
        	obj.custrecord_010dpltditem_lstprchprc = {
        			value : res.getValue(res.columns[10]),
        			text : res.getText(res.columns[10])
        			};
    	}
    	catch(e)
    	{
    		log.error("ERROR in function map_targetItemsSearch_results", e.message);
    	}

    	return obj;
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
    
    function deleteAllDepletedItemCustomRecord_viaLatestBatch()
    {
    	var latestBatchResult = getLatestBatch();
    	var latestBatchId = latestBatchResult.latestBatchId;
    	
    	var searchObj = search.create({
    		type : MASTERSETUP.depletedItem.recordId,
    		filters : ["custrecord_010_dpltditem_batch", "is", latestBatchId] //TODO move field id to CONFIG FILE
    	});
    	
    	searchObj_results = getResults(searchObj.run());
    	
    	var depletedItemBatchRecordObj = record.load({
    		type : MASTERSETUP.depletedItemBatch.recordId,
    		id : latestBatchId,
    		isDynamic : true
    	})
    	
    	
    	log.debug("searchObj_results", searchObj_results);
    	for(var a = 0 ; a < searchObj_results.length; a++)
    	{
    		var lineNumber = depletedItemBatchRecordObj.findSublistLineWithValue({
    			sublistId : MASTERSETUP.depletedItemBatch.depletedItemSublistId,
    			fieldId : "id",
    			value : searchObj_results[a].id
    		})
    		
    		log.debug("lineNumber", lineNumber);
    		
    		if(lineNumber > -1)
    		{
    			depletedItemBatchRecordObj.selectLine({
    				sublistId : MASTERSETUP.depletedItemBatch.depletedItemSublistId,
    				line : lineNumber
    			})
    		}
    		var currentLine_isExpired = depletedItemBatchRecordObj.getCurrentSublistValue({
				sublistId : MASTERSETUP.depletedItemBatch.depletedItemSublistId,
				fieldId : MASTERSETUP.depletedItem.expiredFieldId,
				value : true,
				line : lineNumber
			})
    		
    		log.debug("line is expired : before: ", currentLine_isExpired)
    		
    		depletedItemBatchRecordObj.setCurrentSublistValue({
				sublistId : MASTERSETUP.depletedItemBatch.depletedItemSublistId,
				fieldId : MASTERSETUP.depletedItem.expiredFieldId,
				value : true,
				line : lineNumber
			})
			
			var currentLine_isExpired = depletedItemBatchRecordObj.getCurrentSublistValue({
				sublistId : MASTERSETUP.depletedItemBatch.depletedItemSublistId,
				fieldId : MASTERSETUP.depletedItem.expiredFieldId,
				value : true,
				line : lineNumber
			})
			log.debug("line is expired : after: ", currentLine_isExpired)
			
			depletedItemBatchRecordObj.commitLine({
				sublistId : MASTERSETUP.depletedItemBatch.depletedItemSublistId,
				fieldId : "isinactive",
				value : true,
				line : lineNumber
			})
			
    		/*var currentLine_isInactive = depletedItemBatchRecordObj.getCurrentSublistValue({
				sublistId : MASTERSETUP.depletedItemBatch.depletedItemSublistId,
				fieldId : "isinactive",
				value : true,
				line : lineNumber
			})
    		
    		log.debug("line is inactive before: ", currentLine_isInactive)
    		
    		depletedItemBatchRecordObj.setCurrentSublistValue({
				sublistId : MASTERSETUP.depletedItemBatch.depletedItemSublistId,
				fieldId : "isinactive",
				value : true,
				line : lineNumber
			})
			
			var currentLine_isInactive = depletedItemBatchRecordObj.getCurrentSublistValue({
				sublistId : MASTERSETUP.depletedItemBatch.depletedItemSublistId,
				fieldId : "isinactive",
				value : true,
				line : lineNumber
			})*/
			
    		
//    		log.debug("line is inactive after: ", currentLine_isInactive)
			

//    		depletedItemBatchRecordObj.commitLine({
//				sublistId : MASTERSETUP.depletedItemBatch.depletedItemSublistId,
//				fieldId : "isinactive",
//				value : true,
//				line : lineNumber
//			})
    		
//    		depletedItemBatchRecordObj.removeLine({
//				sublistId : MASTERSETUP.depletedItemBatch.depletedItemSublistId,
//				line : lineNumber
//			})
    		
//    		record.submitFields({
//    			type : MASTERSETUP.depletedItem.recordId,
//    			id : searchObj_results[a].id,
//    			values : {isinactive : true}
//    		})
//    		record.delete({
//    			type : MASTERSETUP.depletedItem.recordId,
//    			id : searchObj_results[a].id
//    		})
    	}
    	
    	var submittedDepletedItemBatchRecordId = depletedItemBatchRecordObj.save();
    	log.debug("submittedDepletedItemBatchRecordId", submittedDepletedItemBatchRecordId);
    }
    
    /**
     * Returns an array with arrays of the given size.
     *
     * @param targetArray {Array} Array to split
     * @param chunkSize {Integer} Size of every group
     */
    function chunkArray(targetArray, chunkSize){
        var results = [];
        
        while (targetArray.length) {
            results.push(targetArray.splice(0, chunkSize));
        }
        
        return results;
    }

    return {
        getInputData: getInputData,
        map: map,
        reduce: reduce,
        summarize: summarize
    };
    
});
