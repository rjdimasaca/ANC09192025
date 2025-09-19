/* @User Event Script on User Event: Commit

Calls next available scheduled script deployment to process SyncWMConsignee Record
*/

function ScheduleSyncWMConsignee(type,form) {
	var script_id = 442;
	var syncWMConsID = nlapiGetRecordId();
	var syncWMConsRecord = nlapiLoadRecord('customrecord_syncwmconsignee',syncWMConsID);
	var ConsStatus = syncWMConsRecord.getFieldValue('custrecord_syncwmconsignee_syncstatus');
	
	if (type == 'create' || (type == 'edit' && ConsStatus == 5)) { //Record is new or is for reprocessing
		var ConsRetries = syncWMConsRecord.getFieldValue('custrecord_syncwmconsignee_retries');
		if (ConsStatus == 1 || ConsStatus == 5 || (ConsStatus == 3 && ConsRetries > 0)) {
			var params = {'custscript_syncwmconsid':syncWMConsID};
			nlapiLogExecution('DEBUG','Scheduling SyncWMConsignee','Schedule SyncWMConsignee is being called on record '+syncWMConsID);
			var ScheduleStatus = nlapiScheduleScript(script_id,null,params); //Deployment is empty so that script selects first available deployment
			nlapiLogExecution('DEBUG','Scheduling SyncWMConsignee','Schedule Status is '+ScheduleStatus);
			if(ScheduleStatus == 'QUEUED') {
				nlapiSubmitField('customrecord_syncwmconsignee',syncWMConsID,'custrecord_syncwmconsignee_syncstatus','6');
			} //else record will wait to be picked up at end of previously running scheduled script

		}
	} //else skip execution - record is not for processing
}