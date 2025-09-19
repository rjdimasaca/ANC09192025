/**
 * @NApiVersion 2.x
 * @NScriptType workflowactionscript
 */

/**
 * Script Record	 : 010 WA Get Purchase Limits
 * Deployments		 : Requisition - 
 * Script Parameters : custscript_010wf_pr_type
 * File				 : 010WFA_getPurchaseLimits.js
 * Dev Version 		 : 1.0.0 - initial release- TC10ROD 02062020
 * Description		 : gets purchase limits, execute update on the record
 * Dependencies		 : used by workflow 010 WF Purchase Requisition
 * Libraries		 :
 * TODO				 : try catch the functions
 * 
 */
define(['N/task', 'N/record', 'N/search', 'N/runtime'],
/**
 * @param {record} record
 * @param {search} search
 */
function(task, record, search, runtime) {
   
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
    	var requestor_purchaseReqLimit = 0.00;
    	try
    	{
    		log.debug("onAction triggered scriptContext : ", scriptContext);
    		
    		var targetRecord = scriptContext.newRecord;
    		log.debug("targetRecord", targetRecord);
    		var requestor = scriptContext.newRecord.getValue("entity");
    		var department = scriptContext.newRecord.getValue("department");
    		log.debug("targetRecord requestor", requestor);
    		
    		var currentScript = runtime.getCurrentScript();
    		var custParamType = currentScript.getParameter({name: 'custscript_010wf_pr_type'});
    		
    		log.debug("custParamType", custParamType);
    		
    		
    		if(["requestor", "supervisor", "superintendent", "requestor_closelines", "requestor_closelines_pendingapproval"].indexOf(custParamType) > -1)
    		{
    			var employeeId = "";
        		if(custParamType == "requestor")
        		{
        			employeeId = requestor;
        		}
        		else if(custParamType == "requestor_closelines")
        		{
        			employeeId = requestor;
        			closeLines(scriptContext);
        		}
        		else if(custParamType == "requestor_closelines_pendingapproval")
        		{
        			employeeId = requestor;
        			closelines_pendingapproval(scriptContext);
        		}
        		else if(custParamType == "supervisor")
        		{
        			employeeId = getSupervisor(requestor, department);
        		}
        		else if(custParamType == "superintendent")
        		{
        			employeeId = getSuperintendent(requestor, department);
        		}
        		else if(custParamType == "millmanager")
        		{
        			employeeId = getMillManager(requestor, department);
        		}
        		
        		log.debug("employeeId", employeeId)
        		
        		requestor_purchaseReqLimit = getPurchaseReqLimit(employeeId);
    		}
    		else if(custParamType == "approvelines")
    		{
    			approveLines(scriptContext);
    		}
    		else if(custParamType == "closelines_pendingapproval")
    		{
    			approveLines(scriptContext);
    		}
    		else if(custParamType == "closelines")
    		{
    			closeLines(scriptContext);
    		}
    		else if(custParamType == "linewithnovendor")
    		{
    			closeLines(scriptContext);
    		}
    		else if(custParamType == "resetrelatedreorders")
    		{
    			updateDepletedItemStatus(scriptContext,
						{
							custscript_010mr_reord_prid : {
								tranId : scriptContext.newRecord.id,
								depletedItemfieldsToUpdate : {
									custrecord_010dpltditem_status : 1
									}
							}
						});
    		}
    	}
    	catch(e)
    	{
    		log.error("ERROR in function onAction", e.message);
    	}
    	
    	return requestor_purchaseReqLimit;
    }
    
    function approveLines(scriptContext)
    {
    	try
    	{
    		log.debug("approveLines init", scriptContext);
    		var targetRecord = null;
    		if(scriptContext.newRecord.id)
    		{
    			targetRecord = record.load({
        			type : scriptContext.newRecord.type,
        			id : scriptContext.newRecord.id
        		});
    			
    			log.debug("approveLines targetRecord", targetRecord);
        		log.debug("approveLines targetRecord line count", targetRecord.getLineCount("item"));
        		var lineCount = targetRecord.getLineCount("item");
        		for(var a = 0 ; a < lineCount ; a++)
        		{
        			log.debug("iteration", {a : a, lineCount : lineCount})
        			targetRecord.setSublistValue({
        				sublistId : "item",
        				fieldId : "isclosed",
        				value : false,
        				line : a
        			})
        		}
    		}
    		else
    		{
    			targetRecord = scriptContext.newRecord
    			//dynamic mode if newRecord
    			log.debug("approveLines targetRecord", targetRecord);
        		log.debug("approveLines targetRecord line count", targetRecord.getLineCount("item"));
        		var lineCount = targetRecord.getLineCount("item");
        		for(var a = 0 ; a < lineCount ; a++)
        		{
        			targetRecord.selectLine({
        				sublistId : "item",
        				line : a
        			})
        			log.debug("iteration", {a : a, lineCount : lineCount})
        			targetRecord.setCurrentSublistValue({
        				sublistId : "item",
        				fieldId : "isclosed",
        				value : false,
        				line : a
        			})
        			targetRecord.commitLine({
        				sublistId : "item",
        			})
        		}
    		}
    		
    		targetRecord.setValue("custbody_010pr_status", 3); //3 is approved, 4 is rejected
    		log.debug("approveLines targetRecord", targetRecord);
    		var submittedRecId = targetRecord.save();
    		log.debug("approveLines submittedRecId", submittedRecId);
    	}
    	catch(e)
    	{
    		log.debug("ERROR in function approveLines", e.message);
    	}
    }
    
    function closeLines(scriptContext)
    {
    	try
    	{
    		log.debug("closelines init", scriptContext);
    		log.debug("scriptContext.newRecord", scriptContext.newRecord);
    		log.debug("scriptContext", scriptContext);
    		//TODO newRecord is dynamic mode, this causes an error to be caught
    		//for now handle defaulting to closed lines using userevent
    		
    		var targetRecord = null;
    		if(scriptContext.newRecord.id)
    		{
    			targetRecord = record.load({
        			type : scriptContext.newRecord.type,
        			id : scriptContext.newRecord.id
        		});
    			
    			log.debug("closeLines targetRecord", targetRecord);
        		log.debug("closeLines targetRecord line count", targetRecord.getLineCount("item"));
        		var lineCount = targetRecord.getLineCount("item");
        		for(var a = 0 ; a < lineCount ; a++)
        		{
        			log.debug("iteration", {a : a, lineCount : lineCount})
        			targetRecord.setSublistValue({
        				sublistId : "item",
        				fieldId : "isclosed",
        				value : true,
        				line : a
        			})
        		}
    		}
    		else
    		{
    			targetRecord = scriptContext.newRecord
    			//dynamic mode if newRecord
    			log.debug("closeLines targetRecord", targetRecord);
        		log.debug("closeLines targetRecord line count", targetRecord.getLineCount("item"));
        		var lineCount = targetRecord.getLineCount("item");
        		for(var a = 0 ; a < lineCount ; a++)
        		{
        			targetRecord.selectLine({
        				sublistId : "item",
        				line : a
        			})
        			log.debug("iteration", {a : a, lineCount : lineCount})
        			targetRecord.setCurrentSublistValue({
        				sublistId : "item",
        				fieldId : "isclosed",
        				value : true,
        				line : a
        			})
        			targetRecord.commitLine({
        				sublistId : "item",
        			})
        		}
    		}
    		
    		targetRecord.save();
    	}
    	catch(e)
    	{
    		log.debug("ERROR in function closelines", e.message);
    	}
    }
    
    function closelines_pendingapproval(scriptContext)
    {
    	try
    	{
    		log.debug("closelines_pendingapproval init", scriptContext);
    		log.debug("scriptContext.newRecord", scriptContext.newRecord);
    		log.debug("scriptContext", scriptContext);
    		//TODO newRecord is dynamic mode, this causes an error to be caught
    		//for now handle defaulting to closed lines using userevent
    		
    		var targetRecord = null;
    		if(scriptContext.newRecord.id)
    		{
    			targetRecord = record.load({
        			type : scriptContext.newRecord.type,
        			id : scriptContext.newRecord.id
        		});
    			
    			log.debug("closeLines targetRecord", targetRecord);
        		log.debug("closeLines targetRecord line count", targetRecord.getLineCount("item"));
        		var lineCount = targetRecord.getLineCount("item");
        		for(var a = 0 ; a < lineCount ; a++)
        		{
        			log.debug("iteration", {a : a, lineCount : lineCount})
        			targetRecord.setSublistValue({
        				sublistId : "item",
        				fieldId : "isclosed",
        				value : true,
        				line : a
        			})
        		}
    		}
    		else
    		{
    			targetRecord = scriptContext.newRecord
    			//dynamic mode if newRecord
    			log.debug("closeLines targetRecord", targetRecord);
        		log.debug("closeLines targetRecord line count", targetRecord.getLineCount("item"));
        		var lineCount = targetRecord.getLineCount("item");
        		for(var a = 0 ; a < lineCount ; a++)
        		{
        			targetRecord.selectLine({
        				sublistId : "item",
        				line : a
        			})
        			log.debug("iteration", {a : a, lineCount : lineCount})
        			targetRecord.setCurrentSublistValue({
        				sublistId : "item",
        				fieldId : "isclosed",
        				value : true,
        				line : a
        			})
        			targetRecord.commitLine({
        				sublistId : "item",
        			})
        		}
    		}
    		//pending approval
    		targetRecord.setValue({
    			fieldId : "custbody_010pr_status",
    			value : 2
    		})
    		
    		targetRecord.save();
    	}
    	catch(e)
    	{
    		log.debug("ERROR in function closelines_pendingapproval", e.message);
    	}
    }
    
    function getSupervisor(requestor, department)
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
    
    function getSuperintendent(requestor, department)
    {
    	var superintendentId = requestor;
    	var employeeLookup = search.lookupFields({
			type : "employee",
			id : requestor,
			columns : ["department"]
		})
		
		var departmentId_employee = employeeLookup.department[0] && employeeLookup.department[0].value ? employeeLookup.department[0].value : "";
		department_final = department ? department : departmentId_employee
				
		if(departmentId_employee)
		{
			var searchObj = search.create({
				type : "department",
				filters : ["internalid", "is", department_final],
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
    
    function getMillManager(requestor, department)
    {
    	var millManagerId = requestor;
    	var employeeLookup = search.lookupFields({
			type : "employee",
			id : requestor,
			columns : ["department"]
		})
		
		var departmentId_employee = employeeLookup.department[0] && employeeLookup.department[0].value ? employeeLookup.department[0].value : "";
    	
		department_final = department ? department : departmentId_employee
		
		if(departmentId_employee)
		{
			var searchObj = search.create({
				type : "department",
				filters : ["internalid", "is", department_final],
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
    
    
    
    
    function updateDepletedItemStatus(scriptContext, params)
    {
    	try
    	{
    		var runnableTask = task.create({
				taskType: task.TaskType.MAP_REDUCE,
				scriptId: 'customscript_010mr_customreordering',
				params: params
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
			}
    	}
    	catch(e)
    	{
    		log.error("ERROR in function updateDepletedItemStatus", e.message);
    	}
    }

    return {
        onAction : onAction
    };
    
});
