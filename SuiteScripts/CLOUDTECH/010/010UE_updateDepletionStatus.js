/**
 * @NApiVersion 2.x
 * @NScriptType UserEventScript
 * @NModuleScope SameAccount
 */
define(['N/task', 'N/record', 'N/runtime'],
/**
 * @param {record} record
 */
function(task, record, runtime) {

	function afterSubmit(scriptContext)
	{
		if(scriptContext.type == "create" || scriptContext.type == "edit") //TODO create mode only. deployed to edit for dev shortcuts
		{
			if(scriptContext.newRecord.type == "itemreceipt")
			{
				updateDepletedItemStatus(scriptContext,
				{
					custscript_010mr_reord_irid : {
						tranId : scriptContext.newRecord.id,
						depletedItemfieldsToUpdate : {
							custrecord_010dpltditem_status : 3
							}
					}
				});
			}
			if(scriptContext.newRecord.type == "purchaseorder")
			{
				//1 is pending approval
				//2 is approved
				//3 is rejected
				log.debug(1)
				if(scriptContext.type == "create" && newStatus == 2)
				{
					log.debug(2)
					updateDepletedItemStatus(scriptContext,
							{
								custscript_010mr_reord_poid : {
									tranId : scriptContext.newRecord.id,
									depletedItemfieldsToUpdate : {
										custrecord_010dpltditem_status : 2
										}
								}
							});
					log.debug(3)
				}
				else if (scriptContext.type == "edit" || scriptContext.type == "approve" && scriptContext.type == "reject")
				{
					log.debug(4)
					var oldStatus = scriptContext.oldRecord.getValue({
						fieldId : "approvalstatus"
					});
					var newStatus = scriptContext.oldRecord.getValue({
						fieldId : "approvalstatus"
					});
					
					log.debug("oldStatus", oldStatus);
					log.debug("newStatus", newStatus);
					
					log.debug(5)
					if(oldStatus == 1 && newStatus == 2)
					{
						log.debug(6)
						updateDepletedItemStatus(scriptContext,
								{
									custscript_010mr_reord_poid : {
										tranId : scriptContext.newRecord.id,
										depletedItemfieldsToUpdate : {
											custrecord_010dpltditem_status : 2
											}
									}
								});
					}
					if(oldStatus == 1 && newStatus == 3)
					{
						log.debug(7)
						updateDepletedItemStatus(scriptContext,
								{
									custscript_010mr_reord_poid : {
										tranId : scriptContext.newRecord.id,
										depletedItemfieldsToUpdate : {
											custrecord_010dpltditem_status : 3
											}
									}
								});
					}
					if(oldStatus == newStatus && newStatus == 3)
					{
						log.debug(7)
						updateDepletedItemStatus(scriptContext,
								{
									custscript_010mr_reord_poid : {
										tranId : scriptContext.newRecord.id,
										depletedItemfieldsToUpdate : {
											custrecord_010dpltditem_status : ""
											}
									}
								});
					}
					if(oldStatus == newStatus && newStatus == 2)
					{
						log.debug(7)
						updateDepletedItemStatus(scriptContext,
								{
									custscript_010mr_reord_poid : {
										tranId : scriptContext.newRecord.id,
										depletedItemfieldsToUpdate : {
											custrecord_010dpltditem_status : 2
											}
									}
								});
					}
				}
				log.debug(8)
			}
			if(scriptContext.newRecord.type == "purchaserequisition" && runtime.executionContext === runtime.Context.Type.WORKFLOW)
			{
				log.debug(9)
				//TODO only do this if you are on the APPROVED STATUS
				var submittedFrom = "";
				submittedFrom = scriptContext.newRecord.getValue({
					fieldId : "custbody_010submittedfrom"
				})
				if(submittedFrom == "Reordering")
				{
					log.debug(10)
					updateDepletedItemStatus(scriptContext,
							{
								custscript_010mr_reord_prid : {
									tranId : scriptContext.newRecord.id,
									depletedItemfieldsToUpdate : {
										custrecord_010dpltditem_status : ""
										}
								}
							});
				}
			}
		}
	}
	
	//TODO YOU COULD MAKE USE OF THE BATCH, UPDATE IT THROUGH SUBLIST SO YOU DONT EXCEED GOVERNANCE LIMIT
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
        afterSubmit : afterSubmit
    };
    
});
