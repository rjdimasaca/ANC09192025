/**
 * @NApiVersion 2.x
 * @NScriptType workflowactionscript
 */
define(['N/record', 'N/search', 'N/runtime'],
/**
 * @param {record} record
 * @param {search} search
 */
function(record, search, runtime) {
   
    /**
     * Definition of the Suitelet script trigger point.
     *
     * @param {Object} scriptContext
     * @param {Record} scriptContext.newRecord - New record
     * @param {Record} scriptContext.oldRecord - Old record
     * @Since 2016.1
     */
    function onAction(scriptContext)
    {
    	var requestor_approverId = null;
    	try
    	{
    		log.debug("onAction triggered scriptContext : ", scriptContext);
    		
    		var targetRecord = scriptContext.newRecord;
    		log.debug("targetRecord", targetRecord);
    		var requestor = scriptContext.newRecord.getValue("entity");
    		log.debug("targetRecord requestor", requestor);
    		
    		var currentScript = runtime.getCurrentScript();
    		var custParamValue = currentScript.getParameter({name: 'custscript_010wf_pr_getemply'});
    		var custParamGetType = currentScript.getParameter({name: 'custscript_010wf_pr_get_type'});
    		
    		log.debug("custParamValue", custParamValue);
    		log.debug("custParamGetType", custParamGetType);
    		
    		requestor_approverId = requestor;
    		
    		if(["requestor", "supervisor", "superintendent", "millmanager"].indexOf(custParamGetType) > -1)
    		{
    			var employeeId = "";
        		if(custParamValue == "requestor")
        		{
        			employeeId = requestor;
        		}
        		else if(custParamValue == "supervisor")
        		{
        			employeeId = getSupervisor(requestor);
        		}
        		else if(custParamValue == "superintendent")
        		{
        			employeeId = getSuperintendent(requestor);
        		}
        		else if(custParamValue == "millmanager")
        		{
        			employeeId = getMillManager(requestor);
        		}
        		
        		log.debug("employeeId", employeeId)
        		
        		requestor_approverId = employeeId;
        		
        		//requestor_purchaseReqLimit = getPurchaseReqLimit(employeeId);
    		}
    		else if(custParamValue == "approvelines")
    		{
    			approveLines(scriptContext);
    		}
    		else if(custParamValue == "closelines")
    		{
    			closeLines(scriptContext);
    		}
//    		else if(custParamValue == "resetrelatedreorders")
//    		{
//    			resetRelatedReorders(scriptContext);
//    		}
    	}
    	catch(e)
    	{
    		log.error("ERROR in function onAction", e.message);
    	}
    	
    	return requestor_approverId;
    }
    
    function approveLines(scriptContext)
    {
    	try
    	{
    		var targetRecord = record.load({
    			type : scriptContext.newRecord.type,
    			id : scriptContext.newRecord.id
    		});
    		
    		for(var a = 0 ; a <= targetRecord.getLineCount("item") ; a++)
    		{
    			targetRecord.setSublistValue({
    				sublistId : "item",
    				fieldId : "isclosed",
    				value : false,
    				line : a
    			})
    		}
    		
    		targetRecord.save();
    	}
    	catch(e)
    	{
    		log.debug("ERROR in function approveLines", e.message);
    	}
    }
    
//    function resetRelatedReorders(scriptContext)
//    {
//    	log.debug("resetRelatedReorders", resetRelatedReorders)
//    	try
//    	{
//    		var targetRecord = record.load({
//    			type : scriptContext.newRecord.type,
//    			id : scriptContext.newRecord.id
//    		});
//    		
//    		var lineCount = targetRecord.getLineCount("item")
////    		updateDepletedItemStatus(scriptContext, {custscript_010mr_reord_prid : scriptContext.newRecord.id});
////    		for(var a = 0 ; a <= lineCount ; a++)
////    		{	
////    			
////    			var reorderingSource = targetRecord.getSublistValue({
////    				fieldId : "custcol_010reorderingsource",
////    				sublistId : "item",
////    				line : a
////    			})
////    			
////    			
////    		}
//    		
//    		//targetRecord.save();
//    	}
//    	catch(e)
//    	{
//    		log.debug("ERROR in function resetRelatedReorders", e.message);
//    	}
//    }
    
    function closeLines(scriptContext)
    {
    	try
    	{
    		log.debug("scriptContext.newRecord", scriptContext.newRecord);
    		log.debug("scriptContext", scriptContext);
    		var targetRecord = record.load({
    			type : scriptContext.newRecord.type,
    			id : scriptContext.newRecord.id
    		});
    		
    		for(var a = 0 ; a <= targetRecord.getLineCount("item") ; a++)
    		{
    			targetRecord.setSublistValue({
    				sublistId : "item",
    				fieldId : "isclosed",
    				value : true,
    				line : a
    			})
    		}
    		
    		targetRecord.save();
    	}
    	catch(e)
    	{
    		log.debug("ERROR in function closelines", e.message);
    	}
    }
    
    function getSupervisor(requestor)
    {
    	var supervisorId = requestor;
    	var employeeLookup = search.lookupFields({
			type : "employee",
			id : requestor,
			columns : ["supervisor"]
		})
		
		supervisorId = employeeLookup.supervisor[0] && employeeLookup.supervisor[0].value ? employeeLookup.supervisor[0].value : requestor;
    	
		return supervisorId;
//    	return 90467; //christine mangabat
    }
    
    function getSuperintendent(requestor)
    {
    	var superintendentId = requestor;
    	var employeeLookup = search.lookupFields({
			type : "employee",
			id : requestor,
			columns : ["department"]
		})
		
		var departmentId = employeeLookup.department[0] && employeeLookup.department[0].value ? employeeLookup.department[0].value : "";
    	
		if(departmentId)
		{
			var searchObj = search.create({
				type : "department",
				filters : ["internalid", "is", departmentId],
				columns : ["custrecord_010_dept_superintendent"]
			})
			
			searchObj.run().each(function(result) {
				superintendentId = result.getValue({
		            name: 'custrecord_010_dept_superintendent'
		        }) || requestor;
		        return false;
		    });
		}
    	
		
		log.debug("final superintendentId", superintendentId);
    	return superintendentId; //michael ceniza
    }
    
    function getMillManager(requestor)
    {
    	var millManagerId = requestor;
    	var employeeLookup = search.lookupFields({
			type : "employee",
			id : requestor,
			columns : ["department"]
		})
		
		var departmentId = employeeLookup.department[0] && employeeLookup.department[0].value ? employeeLookup.department[0].value : "";
    	
		if(departmentId)
		{
			var searchObj = search.create({
				type : "department",
				filters : ["internalid", "is", departmentId],
				columns : ["custrecord_010_dept_millmanager"]
			})
			
			searchObj.run().each(function(result) {
				millManagerId = result.getValue({
		            name: 'custrecord_010_dept_millmanager'
		        }) || requestor;
		        return false;
		    });
		}
    	
		
		log.debug("final millManagerId", millManagerId);
    	return millManagerId; //michael ceniza
    }
    
    function getPurchaseReqLimit(employeeId)
    {
    	var purchaseReqLimit = 0.00;
    	try
    	{
    		var employeeRecord = record.load({
    			type : "employee",
    			id : employeeId
    		})
    		
    		log.debug("employeeRecord", employeeRecord);
    		
    		log.debug('employeeRecord.getValue({fieldId : "internalid"})', employeeRecord.getValue({fieldId : "internalid"}))
    		
    		var purchaseReqLimit = employeeRecord.getValue({fieldId : "custentity_purchreq_limit"}) || 0.00;
    		
    		var employeeLookup = search.lookupFields({
    			type : "employee",
    			id : employeeId,
    			columns : ["custentity_purchreq_limit"]
    		})
    		
    		log.debug("employeeLookup", employeeLookup);
    		
    		purchaseReqLimit = employeeLookup.custentity_purchreq_limit
    	}
    	catch(e)
    	{
    		log.error("ERROR in function getPurchaseLimit", e.message);
    	}
    	return purchaseReqLimit;
    }

    return {
        onAction : onAction
    };
    
});
