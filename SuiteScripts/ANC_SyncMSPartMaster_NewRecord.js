/* @User Event Script on User Event: Commit

Calls next available scheduled script deployment to process SyncMSPartMaster Record
*/

function ScheduleSyncMSPartMaster(type,form) {
	var script_id = 475;
	var SyncMSID = nlapiGetRecordId();
	var SyncMSRecord = nlapiLoadRecord('customrecord_syncmspartmaster',SyncMSID);
	var Status = SyncMSRecord.getFieldValue('custrecord_syncmspartmaster_syncstatus');
	var Retries = -1;
	
	if (type == 'create' || (type == 'edit' && Status == 5)) { //Record is new or is for reprocessing
		Retries = SyncMSRecord.getFieldValue('custrecord_syncmspart_retries');
		if (Status == 1 || Status == 5 || (Status == 3 && Retries > 0)) {
			var params = {'custscript_syncmspartmasterid':SyncMSID};
			nlapiLogExecution('DEBUG','Scheduling SyncMSPartMaster','Schedule SyncMSPartMaster is being called on record '+SyncMSID);
			var ScheduleStatus = nlapiScheduleScript(script_id,null,params); //Deployment is null so that script selects first available deployment
			nlapiLogExecution('DEBUG','Scheduling SyncMSPartMaster','Schedule Status is '+ScheduleStatus);
			if(ScheduleStatus == 'QUEUED') {
				nlapiSubmitField('customrecord_syncmspartmaster',SyncMSID,'custrecord_syncmspartmaster_syncstatus','6');
			} //else record will wait to be picked up at end of previously running scheduled script

		}
	} else {
		//else skip execution - record is not for processing
		nlapiLogExecution('DEBUG','Scheduling SyncMSPartMaster','Not queued. Type is '+type+', Status is '+Status+', Retries is '+Retries);
	}
}