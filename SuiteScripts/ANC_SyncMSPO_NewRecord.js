/* @User Event Script on User Event: Commit

Calls next available scheduled script deployment to process SyncMSPO Record
*/

function ScheduleSyncMSPO(type,form) {
	var script_id = 477;
	var SyncMSID = nlapiGetRecordId();
	var SyncMSRecord = nlapiLoadRecord('customrecord_syncmspurchaseorder',SyncMSID);
	var Status = SyncMSRecord.getFieldValue('custrecord_syncmspo_syncstatus');
	var Retries = -1;
	
	if (type == 'create' || (type == 'edit' && Status == 5)) { //Record is new or is for reprocessing
		Retries = SyncMSRecord.getFieldValue('custrecord_syncmspo_retries');
		if (Status == 1 || Status == 5 || (Status == 3 && Retries > 0)) {
			var params = {'custscript_syncmspoid':SyncMSID};
			nlapiLogExecution('DEBUG','Scheduling SyncMSPO','Schedule SyncMSPO is being called on record '+SyncMSID);
			var ScheduleStatus = nlapiScheduleScript(script_id,'customdeploy1',params); //Deployment is null so that script selects first available deployment
			nlapiLogExecution('DEBUG','Scheduling SyncMSPO','Schedule Status is '+ScheduleStatus);
			if(ScheduleStatus == 'QUEUED') {
				nlapiSubmitField('customrecord_syncmspurchaseorder',SyncMSID,'custrecord_syncmspo_syncstatus','6');
			} //else record will wait to be picked up at end of previously running scheduled script

		}
	} else {
		//else skip execution - record is not for processing
		nlapiLogExecution('DEBUG','Scheduling SyncMSPO','Not queued. Type is '+type+', Status is '+Status+', Retries is '+Retries);
	}
}