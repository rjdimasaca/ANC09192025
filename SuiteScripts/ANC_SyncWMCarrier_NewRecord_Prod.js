/* @User Event Script on User Event: Commit

Calls next available scheduled script deployment to process SyncWMCarrier Record
*/

function ScheduleSyncWMCarrier(type,form) {
	var script_id = 471;
	var syncWMID = nlapiGetRecordId();
	var syncWMRecord = nlapiLoadRecord('customrecord_syncwmcarrier',syncWMID);
	var Status = syncWMRecord.getFieldValue('custrecord_syncwmcarrier_syncstatus');
	
	if (type == 'create' || (type == 'edit' && Status == 5)) { //Record is new or is for reprocessing
		var Retries = syncWMRecord.getFieldValue('custrecord_syncwmcarrier_retries');
		if (Status == 1 || Status == 5 || (Status == 3 && Retries > 0)) {
			var params = {'custscript_syncwmcarrid':syncWMID};
			nlapiLogExecution('DEBUG','Scheduling SyncWMCarrier','Schedule SyncWMCarrier is being called on record '+syncWMID);
			var ScheduleStatus = nlapiScheduleScript(script_id,null,params); //Deployment is empty so that script selects first available deployment
			nlapiLogExecution('DEBUG','Scheduling SyncWMCarrier','Schedule Status is '+ScheduleStatus);
			if(ScheduleStatus == 'QUEUED') {
				nlapiSubmitField('customrecord_syncwmcarrier',syncWMID,'custrecord_syncwmcarrier_syncstatus','6');
			} //else record will wait to be picked up at end of previously running scheduled script

		}
	} //else skip execution - record is not for processing
}