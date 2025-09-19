/* @User Event Script on User Event: Commit

Calls next available scheduled script deployment to process SyncWMContact Record
*/

function ScheduleSyncWMContact(type,form) {
	var script_id = 469;
	var syncWMID = nlapiGetRecordId();
	var syncWMRecord = nlapiLoadRecord('customrecord_syncwmcontact',syncWMID);
	var Status = syncWMRecord.getFieldValue('custrecord_syncwmcontact_syncstatus');
	var Retries = -1;
	
	if (type == 'create' || (type == 'edit' && Status == 5)) { //Record is new or is for reprocessing
		Retries = syncWMRecord.getFieldValue('custrecord_syncwmcontact_retries');
		if (Status == 1 || Status == 5 || (Status == 3 && Retries > 0)) {
			var params = {'custscript_syncwmcontactid':syncWMID};
			nlapiLogExecution('DEBUG','Scheduling SyncWMContact','Schedule SyncWMContact is being called on record '+syncWMID);
			var ScheduleStatus = nlapiScheduleScript(script_id,null,params); //Deployment is empty so that script selects first available deployment
			nlapiLogExecution('DEBUG','Scheduling SyncWMContact','Schedule Status is '+ScheduleStatus);
			if(ScheduleStatus == 'QUEUED') {
				nlapiSubmitField('customrecord_syncwmcontact',syncWMID,'custrecord_syncwmcontact_syncstatus','6');
			} //else record will wait to be picked up at end of previously running scheduled script

		}
	} else {
		//else skip execution - record is not for processing
		nlapiLogExecution('DEBUG','Scheduling SyncWMContact','Not queued. Type is '+type+', Status is '+Status+', Retries is '+Retries);
	}
}