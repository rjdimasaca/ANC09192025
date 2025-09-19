/* @User Event Script on User Event: Commit

Calls next available scheduled script deployment to process SyncWMLoadHeader and SyncWMLoadDetail Records
*/

function ScheduleSyncWMLoad(type,form) {
	var script_id = 464;
	var syncWMID = nlapiGetRecordId();
	var syncWMRecord = nlapiLoadRecord('customrecord_syncwmloadheader',syncWMID);
	var Status = syncWMRecord.getFieldValue('custrecord_syncwmloadhead_syncstatus');
	var Retries = -1;
	
	if (type == 'create' || (type == 'edit' && Status == 5)) { //Record is new or is for reprocessing
		Retries = syncWMRecord.getFieldValue('custrecord_syncwmloadhead_retries');
		if (Status == 1 || Status == 5 || (Status == 3 && Retries > 0)) {
			var params = {'custscript_syncwmloadid':syncWMID};
			nlapiLogExecution('DEBUG','Scheduling SyncWMLoad','Schedule SyncWMLoad is being called on record '+syncWMID);
			var ScheduleStatus = nlapiScheduleScript(script_id,null,params); //Deployment is empty so that script selects first available deployment
			nlapiLogExecution('DEBUG','Scheduling SyncWMLoad','Schedule Status is '+ScheduleStatus);
			if(ScheduleStatus == 'QUEUED') {
				nlapiSubmitField('customrecord_syncwmloadheader',syncWMID,'custrecord_syncwmloadhead_syncstatus','6');
			} //else record will wait to be picked up at end of previously running scheduled script

		}
	} else {
		//else skip execution - record is not for processing
		nlapiLogExecution('DEBUG','Scheduling SyncWMLoad','Not queued. Type is '+type+', Status is '+Status+', Retries is '+Retries);
	}
}