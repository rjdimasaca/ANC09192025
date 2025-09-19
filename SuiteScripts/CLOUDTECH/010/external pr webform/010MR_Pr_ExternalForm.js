/**
 * @NApiVersion 2.x
 * @NScriptType MapReduceScript
 * @NModuleScope SameAccount
 */
define(['N/file', 'N/config', 'N/email', 'N/https', 'N/record', 'N/runtime', 'N/search', 'N/url',  './prExternal.config.js'],
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
	var externalDataObj = {};
	
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
		log.debug("1")
		MASTERSETUP = customConfig.masterSetup;
		log.debug("2")
		
		var script = runtime.getCurrentScript();
        var data = [];
        var fileObj = script.getParameter({ name: MASTERSETUP.scriptParamIds.payloadfile.id});
        log.debug("TC10RODfileObj", fileObj);
        fileObj = JSON.parse(fileObj)
        var fileId = fileObj.fileId;
        var filePath = fileObj.filePath;
        //log.debug("TC10RODfileId", fileId);
        
        log.debug("fileObj", fileObj);
        if(fileId)
        {
        	var fileObj = file.load({
            	id :fileId, 
//            	id :filePath 
            })
            var fileContents = fileObj.getContents();
        	//log.debug("TC10RODfileContents", fileContents);
            data = JSON.parse(fileContents)
            //log.debug("TC10RODdata1", data);
//            data = data.length ? JSON.parse(data) : [];
            //log.debug("TC10RODdata2", data);
            
            var deletedFileId = file.delete({
            	id: fileId
            });
            log.debug("TC10RODdeletedFileId", deletedFileId);
        }
        log.audit('getData INPUT_DATA', JSON.stringify(data));
//      data.linesToProcess = _.groupBy(data.linesToProcess, 'custpage_prvendor')
      
//        data.linesToProcess = splitVendors(data.linesToProcess);
//        log.debug("data.linesToProcess after splitVendors", data.linesToProcess);
        return data;
		
    }

    /**
     * Executes when the map entry point is triggered and applies to each key/value pair.
     *
     * @param {MapSummary} context - Data collection containing the key/value pairs to process through the map stage
     * @since 2015.1
     */
    function map(context)
    {
    	log.debug("map context", context);
    	var data = JSON.parse(context.value)
    	
    	context.write({
//    		key: (data["custpage_prvendorid"] ? data["custpage_prvendorid"].value : "") + '_' + (data["custpage_prnumber"] ? data["custpage_prnumber"].value : "")/* + '_' + (data.custpage_pritemid || "")*/,
    		key: (data["custpage_sl_vendor"] && data["custpage_sl_vendor"].value ? data["custpage_sl_vendor"].value : "-1"),
    	    value: data
    	});
    }
    
    /**
     * Executes when the reduce entry point is triggered and applies to each group.
     *
     * @param {ReduceSummary} context - Data collection containing the groups to process through the reduce stage
     * @since 2015.1
     */
    function reduce(context)
    {
    	var script = runtime.getCurrentScript();
    	var fileObj = script.getParameter({ name: 'custscript_010mr_extpr_payloadfileid'});
    	
    	//get the string venrsion
    	externalDataObj = fileObj;
    	
    	fileObj = JSON.parse(fileObj)
    	log.debug("REDUCE fileObj", fileObj);
    	MASTERSETUP = customConfig.masterSetup;
    	log.debug("REDUCE context", context);
    	var vendorId = "";
    	
    	createPrResult = createPr(context, fileObj)
    	
    	log.debug("REDUCE VENDORID", vendorId);
    }
    
    function findOrCreateItem(lineEntry, accountCode, subsidiaryId, departmentId)
    {
    	findOrCreateItemResults = {};
    	try
    	{
    		var accountCodeSearch = search.create({
    			type : "item",
    			filters : [
    				["itemid", "is", "NS ITEMS CREATED FROM MAINSAVER - " + accountCode + " (" + subsidiaryId + "_" + departmentId + ")"],
    				//should item be available for every subsidiary? - answered by lisa on 02242020 : YES DO IT PER SUBSIDIARY AND DEPT
    				"AND",
    				["subsidiary", "is", subsidiaryId],
    				"AND",
    				["department", "is", departmentId],
    				]
    		});
    		var accountCodeSearchResults = getResults(accountCodeSearch.run())
    		log.debug("accountCodeSearch", accountCodeSearch);
    		log.debug("accountCodeSearchResults", accountCodeSearchResults);
    		
    		if(accountCodeSearchResults.length > 0)
    		{
        		findOrCreateItemResults.itemId = accountCodeSearchResults[0].id;
        		
        		if(lineEntry.custpage_sl_vendor.value)
        		{
        			var itemRecordObj = record.load({
            			type : "noninventoryitem",
            			id : findOrCreateItemResults.itemId,
            			isDynamic : true
            		});
            		
            		itemRecordObj.setCurrentSublistValue({
            			sublistId : "itemvendor",
            			fieldId : "vendor",
            			value : lineEntry.custpage_sl_vendor.value,
            		})
            		
            		itemRecordObj.commitLine({
            			sublistId : "itemvendor"
            		})
            		
            		var submittedExistingItemId = itemRecordObj.save({enableSourcing : true, ignoreMandatoryFields : true});
            		log.debug("!!!submittedExistingItemId", submittedExistingItemId)
        		}
    		}
    		else
    		{
    			createItemResults = createItem(lineEntry, accountCode, subsidiaryId, departmentId);
    			log.debug("you must create item", {accountCode : accountCode});
    			findOrCreateItemResults.itemId = createItemResults.recId;
    		}
    		
    	}
    	catch(e)
    	{
    		log.error("ERROR in function findOrCreateItem", e.message);
    	}
    	return findOrCreateItemResults;
    }
    
    function createItem(lineEntry, accountCode, subsidiaryId, departmentId)
    {
    	var createItemResult = {};
    	try
    	{
    		var recordObj = record.create({
    			type : record.Type.NON_INVENTORY_ITEM
    		});
    		recordObj.setValue({
    			fieldId : "customform",
    			value : 101 //TODO put in config file Custom Non-Inventory Part Form
    		})
    		
    		recordObj.setValue({
    			fieldId : "subtype",
    			value : "purchase" //TODO put in config file Custom Non-Inventory Part Form
    		})
    		
    		recordObj.setValue({
    			fieldId : "itemid",
    			value : "NS ITEMS CREATED FROM MAINSAVER - " + accountCode  + " (" + subsidiaryId + "_" + departmentId + ")"
    			//ANC TODO put in config file get this from suitelet
    		})
    		recordObj.setValue({
    			fieldId : "subsidiary",
    			value : subsidiaryId //ANC TODO get this from suitelet
    		})
    		recordObj.setValue({
    			fieldId : "custitem_msid",
    			value : "NS-" + accountCode //TODO put in config file
    		})
    		recordObj.setValue({
    			fieldId : "purchasedescription",
    			value : lineEntry.custpage_sl_itemdescription.value //TAXABLE ALL PROVINCES
    		})
    		recordObj.setValue({
    			fieldId : "taxschedule",
    			value : 2 //TAXABLE ALL PROVINCES
    		})
    		recordObj.setValue({
    			fieldId : "unitstype",
    			value : MASTERSETUP.unitstypeid //48 //EXTERNAL UNITS TODO put this in config file, get this from a dedicated units type that only has EACH as uom 
    		})
    		recordObj.setValue({
    			fieldId : "department",
    			value : departmentId //get this from a dedicated units type that only has EACH as uom 
    		})
    		recordObj.setValue({
    			fieldId : "purchaseunits",
    			value : MASTERSETUP.purchaseunitid //161 //TODO allow default? get this from a dedicated units type that only has EACH as uom 
    		})
//    		recordObj.setValue({
//    			fieldId : "expenseaccount",
//    			value : "" //TODO  get this from config file
//    		})
    		
    		//TODO should you add vendors to existing items? consider attackers using the form, this might ruin the item master-vendor mapping
    		var vendorIndexInItem = recordObj.findSublistLineWithValue({
    			sublistId : "itemvendor",
    			fieldId : "vendor",
    			value : lineEntry.custpage_sl_vendor.value,
    		})
    		
    		if(lineEntry.custpage_sl_vendor.value)
    		{
    			recordObj.setSublistValue({
        			sublistId : "itemvendor",
        			fieldId : "vendor",
        			value : lineEntry.custpage_sl_vendor.value,
        			line : 0
        		})
        		recordObj.setSublistValue({
        			sublistId : "itemvendor",
        			fieldId : "preferredvendor",
        			value : true,
        			line : 0
        		})
    		}
    		
//    		var recId = recordObj.save();
    		var recId = recordObj.save({enableSourcing : true, ignoreMandatoryFields : true});
    		log.debug("createItem recId", recId)
    		createItemResult.recId = recId;
    	}
    	catch(e)
    	{
    		log.error("ERROR in function createItem", e.message);
    	}
    	return createItemResult;
    }
    
    function createPr(context, fileObj)
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
        		type : "purchaserequisition",
        		isDynamic : true
        	})
        	log.debug("createPr", 3)
        	
        	prRecordObj.setValue({
        		fieldId : "custbody_010submittedfrom",
        		value : "External Webform"
        	})
        	
        	
        	prRecordObj.setValue({
        		fieldId : "entity",
        		value : fileObj.requestorId
        	})
        	
        	var requestorLookup = search.lookupFields({
        		type : "employee",
        		id : fileObj.requestorId,
        		columns : ["department"]
        	})
        	
        	prRecordObj.setValue({
        		fieldId : "department",
        		value : requestorLookup.department && requestorLookup.department[0] ? requestorLookup.department[0].value || "" : ""
        	})
        	
        	prRecordObj.setValue({
        		fieldId : "custbody_010externaldata",
        		value : externalDataObj
        	})
        	
        	if(fileObj.dueDate)
        	{
        		prRecordObj.setValue({
            		fieldId : "trandate",
            		value : new Date(fileObj.tranDate)
            	})
        	}
        	
        	if(fileObj.dueDate)
        	{
        		prRecordObj.setValue({
            		fieldId : "duedate",
            		value : new Date(fileObj.dueDate)
            	})
        	}
        	
        	prRecordObj.setValue({
        		fieldId : "memo",
        		value : fileObj.memo
        	})
        	
        	log.debug("runtime.getCurrentUser().id", runtime.getCurrentUser().id);
        	log.debug("prRecordObj", prRecordObj)
        	log.debug("context.values.length", context.values.length);
        	for(var a = 0 ; a < context.values.length ; a++)
        	{
        		
        		prRecordObj.selectLine({
        			sublistId : "item",
        			line : a
        		})
        		
        		var lineEntry = context.values[a];

            	log.debug("lineEntry", lineEntry);
            	lineEntry = JSON.parse(lineEntry);
            	
            	var targetItem = findOrCreateItem(lineEntry, lineEntry.custpage_sl_item.value, fileObj.subsidiaryId, lineEntry.custpage_sl_department.value);
            	log.debug("targetItem", targetItem);
            	log.debug("targetItem.itemId", targetItem.itemId);
        		prRecordObj.setCurrentSublistValue({
        			sublistId : "item",
        			fieldId : "item",
        			line : a,
        			value : targetItem.itemId
        		})
//        		log.debug("targetItem", targetItem);
//        		log.debug("targetItem.id", targetItem.id);
        		
        		log.debug("after setting item col ", prRecordObj.getCurrentSublistValue({
        			sublistId : "item",
        			fieldId : "item",
        			line : a,
        		}))
        		prRecordObj.setCurrentSublistValue({
        			sublistId : "item",
        			fieldId : "quantity",
        			line : a,
        			value : lineEntry.custpage_sl_rqstdqty.value
        		})
        		prRecordObj.setCurrentSublistValue({
        			sublistId : "item",
        			fieldId : "description",
        			line : a,
        			value : lineEntry.custpage_sl_itemdescription.value
        		})
        		prRecordObj.setCurrentSublistValue({
        			sublistId : "item",
        			fieldId : "vendor",
        			line : a,
        			value : vendorId
        		})
        		prRecordObj.setCurrentSublistValue({
        			sublistId : "item",
        			fieldId : "estimatedrate",
        			line : a,
        			value : lineEntry.custpage_sl_estimatedrate.value
        		})
        		prRecordObj.setCurrentSublistValue({
        			sublistId : "item",
        			fieldId : "custcol_010linememoinstruction",
        			line : a,
        			value : lineEntry.custpage_sl_memo.value
        		})
        		prRecordObj.setCurrentSublistValue({
        			sublistId : "item",
        			fieldId : "custcol_010externalunits",
        			line : a,
        			value : lineEntry.custpage_sl_customunits_text.value
        		})
        		var estimatedAmount = 
            		prRecordObj.getCurrentSublistValue({
            			sublistId : "item",
            			fieldId : "estimatedamount",
            			line : a,
            		});
        		
        		log.debug("estimatedAmount before set", estimatedAmount);
        		if(!estimatedAmount)
        		{
        			prRecordObj.setCurrentSublistValue({
            			sublistId : "item",
            			fieldId : "estimatedamount",
            			line : a,
            			value : parseFloat(Number(lineEntry.custpage_sl_estimatedrate.value || 0) * Number(lineEntry.custpage_sl_rqstdqty.value || 0))
            		});
        			log.debug("no estimated amount found, override as : ", parseFloat(Number(lineEntry.custpage_sl_estimatedrate.value || 0) * Number(lineEntry.custpage_sl_rqstdqty.value || 0)))
        		}
        		
        		var estimatedAmount = 
            		prRecordObj.getCurrentSublistValue({
            			sublistId : "item",
            			fieldId : "estimatedamount",
            			line : a,
            		});
        		
        		log.debug("estamt after set", estimatedAmount)
        		
        		log.debug("prRecordObj.getLineCount({item}) after iteration : " + a, prRecordObj.getLineCount({sublistId : "item"}));
            	
        		
        		prRecordObj.commitLine({
        			sublistId : "item",
        		})
        	}
        	
        	log.debug("prRecordObj", prRecordObj);
        	log.debug("prRecordObj.getLineCount({item}) after fill", prRecordObj.getLineCount({sublistId : "item"}));
        	
        	var prRecord_id = prRecordObj.save();
        	var prLinkElement = getPrLink(prRecord_id);
        	
        	var emailBody = MASTERSETUP.emailDefaults_successfulsubmission.body;
        	
        	emailBody = emailBody.replace("{PRLINK}", prLinkElement)
        	email.send({
        		author : fileObj.requestorId,
        		recipients : fileObj.requestorId,
        		subject : MASTERSETUP.emailDefaults_successfulsubmission.subject,
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
    
    //deprecated, dynamic mode is better cause it allows 0.00 estimated amount
    /*function createPr_staticmode(context, fileObj)
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
        		value : fileObj.requestorId
        	})
        	
        	log.debug("runtime.getCurrentUser().id", runtime.getCurrentUser().id);
        	log.debug("prRecordObj", prRecordObj)
        	log.debug("context.values.length", context.values.length);
        	for(var a = 0 ; a < context.values.length ; a++)
        	{
        		var lineEntry = context.values[a];

            	log.debug("lineEntry", lineEntry);
            	lineEntry = JSON.parse(lineEntry);
            	
            	var targetItem = findOrCreateItem(lineEntry, lineEntry.custpage_sl_item.value, fileObj.subsidiaryId, lineEntry.custpage_sl_department.value);
            	log.debug("targetItem", targetItem);
            	log.debug("targetItem.itemId", targetItem.itemId);
        		prRecordObj.setSublistValue({
        			sublistId : "item",
        			fieldId : "item",
        			line : a,
        			value : targetItem.itemId
        		})
//        		log.debug("targetItem", targetItem);
//        		log.debug("targetItem.id", targetItem.id);
        		
        		log.debug("after setting item col ", prRecordObj.getSublistValue({
        			sublistId : "item",
        			fieldId : "item",
        			line : a,
        		}))
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
        			fieldId : "estimatedrate",
        			line : a,
        			value : lineEntry.custpage_sl_estimatedrate.value
        		})
        		prRecordObj.setSublistValue({
        			sublistId : "item",
        			fieldId : "custcol_010memo",
        			line : a,
        			value : lineEntry.custpage_sl_memo.value
        		})
        		var estimatedAmount = 
            		prRecordObj.getSublistValue({
            			sublistId : "item",
            			fieldId : "estimatedamount",
            			line : a,
            		});
        		
        		log.debug("estimatedAmount before set", estimatedAmount);
        		if(!estimatedAmount)
        		{
        			prRecordObj.setSublistValue({
            			sublistId : "item",
            			fieldId : "estimatedamount",
            			line : a,
            			value : parseFloat(Number(lineEntry.custpage_sl_estimatedrate.value || 0) * Number(lineEntry.custpage_sl_rqstdqty.value || 0))
            		});
        			log.debug("no estimated amount found, override as : ", parseFloat(Number(lineEntry.custpage_sl_estimatedrate.value || 0) * Number(lineEntry.custpage_sl_rqstdqty.value || 0)))
        		}
        		
        		var estimatedAmount = 
            		prRecordObj.getSublistValue({
            			sublistId : "item",
            			fieldId : "estimatedamount",
            			line : a,
            		});
        		
        		log.debug("estamt after set", estimatedAmount)
        		
        		log.debug("prRecordObj.getLineCount({item}) after iteration : " + a, prRecordObj.getLineCount({sublistId : "item"}));
            	
        	}
        	
        	log.debug("prRecordObj", prRecordObj);
        	log.debug("prRecordObj.getLineCount({item}) after fill", prRecordObj.getLineCount({sublistId : "item"}));
        	
        	var prRecord_id = prRecordObj.save();
        	var prLinkElement = getPrLink(prRecord_id);
        	
        	var emailBody = MASTERSETUP.emailDefaults_successfulreorder.body;
        	
        	emailBody = emailBody.replace("{PRLINK}", prLinkElement)
        	email.send({
        		author : fileObj.requestorId,
        		recipients : fileObj.requestorId,
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
    }*/

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
