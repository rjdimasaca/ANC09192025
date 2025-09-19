/* @User Event Script on User Event: Commit

Calls next available scheduled script deployment to process
SyncWMFreightInvoice, SyncWMFreightInvoiceDetail and SyncWMFreightInvoiceLine Records
*/

function ScheduleSyncWMFreightInv(type,form) {
	var script_id = 473;
	var syncWMID = nlapiGetRecordId();
	var syncWMRecord = nlapiLoadRecord('customrecord_syncwmfreightinvoice',syncWMID);
	var Status = syncWMRecord.getFieldValue('custrecord_syncwmfreight_syncstatus');
	var Retries = -1;
	
	if (type == 'create' || (type == 'edit' && Status == 5)) { //Record is new or is for reprocessing
		Retries = syncWMRecord.getFieldValue('custrecord_syncwmfrtinv_retries');
		if (Status == 1 || Status == 5 || (Status == 3 && Retries > 0)) {
			var params = {'custscript_syncwmfreightid':syncWMID};
			nlapiLogExecution('DEBUG','Scheduling SyncWMFreightInv','Schedule SyncWMFreightInv is being called on record '+syncWMID);
			var ScheduleStatus = nlapiScheduleScript(script_id,null,params); //Deployment is empty so that script selects first available deployment
			nlapiLogExecution('DEBUG','Scheduling SyncWMFreightInv','Schedule Status is '+ScheduleStatus);
			if(ScheduleStatus == 'QUEUED') {
				nlapiSubmitField('customrecord_syncwmfreightinvoice',syncWMID,'custrecord_syncwmfreight_syncstatus','6');
			} //else record will wait to be picked up at end of previously running scheduled script

		}
	} else {
		//else skip execution - record is not for processing
		nlapiLogExecution('DEBUG','Scheduling SyncWMFreightInv','Not queued. Type is '+type+', Status is '+Status+', Retries is '+Retries);
	}
}