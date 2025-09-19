/* @User Event Script on User Event: Commit

Calls next available scheduled script deployment to process SyncLIMS Records
*/

function ScheduleSyncLIMS(type,form) {
	var script_id = 452;
	var syncLIMSID = nlapiGetRecordId();
	var syncLIMSRecord = nlapiLoadRecord('customrecord_synclims',syncLIMSID);
	var Status = syncLIMSRecord.getFieldValue('custrecord_synclims_syncstatus');
	//var Type = syncLIMSRecord.getFieldValue('');
	var Retries = -1;
	
	//if (type == 'create' || (type == 'edit' && Status == 5)) { //Record is new or is for reprocessing
	if (type == 'edit' && Status == 5) { //Record is for reprocessing
		Retries = syncLIMSRecord.getFieldValue('custrecord_synclims_retries');
		//(Status == 1 || Status == 5 || (Status == 3 && Retries > 0)) && Type != 'AR' && Type != 'GL'
		if (Status == 1 || Status == 5 || (Status == 3 && Retries > 0)) {
			var params = {'custscript_synclimsid':syncLIMSID};
			nlapiLogExecution('DEBUG','Scheduling SyncLIMS','Schedule SyncLIMS is being called on record '+syncLIMSID);
			var ScheduleStatus = nlapiScheduleScript(script_id,null,params); //Deployment is empty so that script selects first available deployment
			nlapiLogExecution('DEBUG','Scheduling SyncLIMS','Schedule Status is '+ScheduleStatus);
			if(ScheduleStatus == 'QUEUED') {
				nlapiSubmitField('customrecord_synclims',syncLIMSID,'custrecord_synclims_syncstatus','6');
			} //else record will wait to be picked up at end of previously running scheduled script

		}
	} else {
		//else skip execution - record is not for processing
		nlapiLogExecution('DEBUG','Scheduling SyncLIMS','Not queued. Type is '+type+', Status is '+Status+', Retries is '+Retries);
	}
}