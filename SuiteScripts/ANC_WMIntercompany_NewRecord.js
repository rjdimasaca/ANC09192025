/* @User Event Script on User Event: Commit

Calls next available scheduled script deployment to process SyncWMIntercompany_Process Records
*/

function ScheduleSyncWMIntercoBatch(type,form) {
	var script_id = 561;
	var syncWMID = nlapiGetRecordId();
	var syncWMRecord = nlapiLoadRecord('customrecord_syncwmintercompanybatch',syncWMID);
	var Status = syncWMRecord.getFieldValue('custrecord_syncwminterco_syncstatus');
	var Retries = -1;
	
	if (type == 'create' || (type == 'edit' && Status == 5)) { //Record is new or is for reprocessing
		Retries = syncWMRecord.getFieldValue('custrecord_syncwminterco_retries');
		if (Status == 1 || Status == 5 || (Status == 3 && Retries > 0)) {
			var ScheduleStatus = nlapiScheduleScript(script_id,null); //Deployment is empty so that script selects first available deployment
			nlapiLogExecution('DEBUG','Scheduling SyncWMIntercompany','Schedule Status is '+ScheduleStatus);
			if(ScheduleStatus == 'QUEUED') {
				nlapiSubmitField('customrecord_syncwmintercompanybatch',syncWMID,'custrecord_syncwminterco_syncstatus','6');
			} //else record will wait to be picked up at end of previously running scheduled script

		}
	} else {
		//else skip execution - record is not for processing
		nlapiLogExecution('DEBUG','Scheduling SyncWMIntercompany','Not queued. Type is '+type+', Status is '+Status+', Retries is '+Retries);
	}
}