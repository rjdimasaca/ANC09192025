/* @User Event Script on User Event: Commit

Calls next available scheduled script deployment to process SyncWMCustomer Record
*/

function ScheduleSyncWMCustomer(type,form) {
	var script_id = 444;
	var syncWMCustID = nlapiGetRecordId();
    nlapiLogExecution("DEBUG", "07272023 syncWMCustID", syncWMCustID);
	var syncWMCustRecord = nlapiLoadRecord('customrecord_syncwmcustomer',syncWMCustID);
	var CustStatus = syncWMCustRecord.getFieldValue('custrecord_syncwmcust_syncstatus');
	
    nlapiLogExecution("DEBUG", "07272023 type", type);
	if (type == 'create' || ((type == 'edit' || type == 'xedit') && CustStatus == 5)) { //Record is new or is for reprocessing
		var CustRetries = syncWMCustRecord.getFieldValue('custrecord_syncwmcust_retries');
        nlapiLogExecution("DEBUG", "07272023 CustRetries", CustRetries);
		if (CustStatus == 1 || CustStatus == 5 || (CustStatus == 3 && CustRetries > 0)) {
			var params = {'custscript_syncwmcustid':syncWMCustID};
			nlapiLogExecution('DEBUG','Scheduling SyncWMCustomer','Schedule SyncWMCustomer is being called on record '+syncWMCustID);
			var ScheduleStatus = nlapiScheduleScript(script_id,null,params); //Deployment is empty so that script selects first available deployment
			nlapiLogExecution('DEBUG','Scheduling SyncWMCustomer','Schedule Status is '+ScheduleStatus);
			if(ScheduleStatus == 'QUEUED') {
				nlapiSubmitField('customrecord_syncwmcustomer',syncWMCustID,'custrecord_syncwmcust_syncstatus','6');
			} //else record will wait to be picked up at end of previously running scheduled script

		}
	} //else skip execution - record is not for processing
}