/* @User Event Script on User Event: Commit

Calls next available scheduled script deployment to process SyncWMCustomerConsignee Records
*/

function ScheduleSyncWMCustCons(type,form) {
	var script_id = 446;
	var syncWMID = nlapiGetRecordId();
	var syncWMRecord = nlapiLoadRecord('customrecord_syncwmcustomerconsignee',syncWMID);
	var Status = syncWMRecord.getFieldValue('custrecord_syncwmcustcons_syncstatus');
	var Retries = -1;
	
	if (type == 'create' || (type == 'edit' && Status == 5)) { //Record is new or is for reprocessing
		Retries = syncWMRecord.getFieldValue('custrecord_syncwmcustcons_retries');
		if (Status == 1 || Status == 5 || (Status == 3 && Retries > 0)) {
			var params = {'custscript_syncwmcustconsid':syncWMID};
			nlapiLogExecution('DEBUG','Scheduling SyncWMCustCons','Schedule SyncWMCustCons is being called on record '+syncWMID);
			var ScheduleStatus = nlapiScheduleScript(script_id,null,params); //Deployment is empty so that script selects first available deployment
			nlapiLogExecution('DEBUG','Scheduling SyncWMCustCons','Schedule Status is '+ScheduleStatus);
			if(ScheduleStatus == 'QUEUED') {
				nlapiSubmitField('customrecord_syncwmcustomerconsignee',syncWMID,'custrecord_syncwmcustcons_syncstatus','6');
			} //else record will wait to be picked up at end of previously running scheduled script

		}
	} else {
		//else skip execution - record is not for processing
		nlapiLogExecution('DEBUG','Scheduling SyncWMCustCons','Not queued. Type is '+type+', Status is '+Status+', Retries is '+Retries);
	}
}