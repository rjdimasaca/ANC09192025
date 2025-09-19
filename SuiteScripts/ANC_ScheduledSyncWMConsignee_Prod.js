/* @Scheduled Script on Manual Deployment

Processes SyncWMConsignee Record

TC10ROD 1.0.1 - update the name as well, discovered because of Valassis vs Hogg Printing Division
*/

var context = nlapiGetContext();
SyncWMConsID = context.getSetting('SCRIPT','custscript_syncwmconsid');
var script_id = 442;

function ScheduledSyncWMConsignee(params){
	nlapiLogExecution('DEBUG','CALLSCHEDULEDSYNCWMCONSIGNEE','SyncWMConsignee Processing Started on Record '+SyncWMConsID);
	try{
		
		nlapiSubmitField('customrecord_syncwmconsignee',SyncWMConsID,'	custrecord_syncwmconsignee_syncstatus','Processing');
		
		SyncWMConsRecord = nlapiLoadRecord('customrecord_syncwmconsignee',SyncWMConsID);
		var isActive = SyncWMConsRecord.getFieldValue('custrecord_syncwmconsignee_active');
		
		var filters = [
			['internalid','noneof',[SyncWMConsID]], 'AND',
			['custrecord_syncwmconsignee_wmid','contains',SyncWMConsRecord.getFieldValue('custrecord_syncwmconsignee_wmid')], 'AND',
			['custrecord_syncwmconsignee_syncstatus','noneof',[7]]
		];
		
		var columns = [];
		columns[0] = new nlobjSearchColumn('internalid');
		
		var searchResults = nlapiSearchRecord('customrecord_syncwmconsignee',null,filters,columns);
		
		if(searchResults) {
			//Matching consignee sync records - record is a duplicate
			SyncWMConsRecord.setFieldValue('custrecord_syncwmconsignee_syncstatus',7); //Set SyncStatus = Duplicate
			SyncWMConsRecord.setFieldValue('custrecord_syncwmconsignee_errormsg','Duplicate Sync Record - Not Processed');
			SyncWMConsRecord.setFieldValue('isinactive','T');
			nlapiSubmitRecord(SyncWMConsRecord);
			nlapiLogExecution('AUDIT','CALLSCHEDULEDSYNCWMCONSIGNEE','Record identified as Duplicate, processing cancelled');
		} else {
			//No matching consignee sync records - not a duplicate. Continue Processing.
			
			//Check if Record Exists
			//['externalid','is',SyncWMCustRecord.getFieldValue('custrecord_syncwmcust_accountno')], 'OR',
			var filters = [
			['custrecord_alberta_ns_consigneekey','is',SyncWMConsRecord.getFieldValue('custrecord_syncwmconsignee_consigneekey')]
			];
			
			var columns = [];
			columns[0] = new nlobjSearchColumn('internalid');
			
			var searchResults = nlapiSearchRecord('customrecord_alberta_ns_consignee_record',null,filters,columns);
			
			if(searchResults) {
				//Record already exists, perform update actions
				//Multiple Consignee records can exist due to denormalization with customers. Updates should be processed for every consignee.
				UpdatedConsignees = [];
				for(n=0;n<searchResults.length;n++){
					ConsRecord = nlapiLoadRecord('customrecord_alberta_ns_consignee_record',searchResults[n].getValue('internalid'));
					tempConsAddress = "" + SyncWMConsRecord.getFieldValue('custrecord_syncwmconsignee_address') + " "
						+ SyncWMConsRecord.getFieldValue('custrecord_syncwmconsignee_city') + ", "
						+ SyncWMConsRecord.getFieldValue('custrecord_syncwmconsignee_sta') + ", "
						+ SyncWMConsRecord.getFieldValue('custrecord_syncwmconsignee_country') + " "
						+ SyncWMConsRecord.getFieldValue('custrecord_syncwmconsignee_postalcode');
					ConsRecord.setFieldValue('custrecord_alberta_ns_ship_address',tempConsAddress.replace(/  +/g, ' '));
					ConsRecord.setFieldValue('custrecord_alberta_ns_ship_addrprovince',SyncWMConsRecord.getFieldValue('custrecord_syncwmconsignee_sta'));
					ConsRecord.setFieldValue('custrecord_alberta_ns_consigneeno',SyncWMConsRecord.getFieldValue('custrecord_syncwmconsignee_consigneeno'));
					
					//TC10ROD 1.0.1 - update the name as well, discovered because of Valassis vs Hogg Printing Division
					ConsRecord.setFieldValue('name',SyncWMConsRecord.getFieldValue('custrecord_syncwmconsignee_name'));
	                ConsRecord.setFieldValue('custrecord_alberta_ns_invoicename',SyncWMConsRecord.getFieldValue('custrecord_syncwmconsignee_name'));
					
					if (isActive == 0 || isActive == '0') {ConsRecord.setFieldValue('isinactive','T');}
					nlapiSubmitRecord(ConsRecord);
					UpdatedConsignees.push(searchResults[n].getValue('internalid'));
				}
				
				SyncWMConsRecord.setFieldValue('custrecord_syncwmconsignee_syncstatus',4);
				SyncWMConsRecord.setFieldValue('custrecord_syncwmconsignee_errormsg','Updated existing record with Internal IDS '+UpdatedConsignees);
				SyncWMConsRecord.setFieldValue('custrecord_syncwmconsignee_nsid',UpdatedConsignees);
				nlapiSubmitRecord(SyncWMConsRecord);
				nlapiLogExecution('AUDIT','CALLSCHEDULEDSYNCWMCONSIGNEE','Consignee Records with Internal IDs '+UpdatedConsignees+' already exist and have been updated.');
			} else {
				//Record does not exist, perform create actions
				ConsRecord = nlapiCreateRecord('customrecord_alberta_ns_consignee_record');
				ConsRecord.setFieldValue('name',SyncWMConsRecord.getFieldValue('custrecord_syncwmconsignee_name'));
				ConsRecord.setFieldValue('custrecord_alberta_ns_invoicename',SyncWMConsRecord.getFieldValue('custrecord_syncwmconsignee_name'));
				ConsRecord.setFieldValue('custrecord_alberta_ns_consigneekey',SyncWMConsRecord.getFieldValue('custrecord_syncwmconsignee_consigneekey'));
				tempConsAddress = "" + SyncWMConsRecord.getFieldValue('custrecord_syncwmconsignee_address') + " "
					+ SyncWMConsRecord.getFieldValue('custrecord_syncwmconsignee_city') + ", "
					+ SyncWMConsRecord.getFieldValue('custrecord_syncwmconsignee_sta') + ", "
					+ SyncWMConsRecord.getFieldValue('custrecord_syncwmconsignee_country') + " "
					+ SyncWMConsRecord.getFieldValue('custrecord_syncwmconsignee_postalcode');
				ConsRecord.setFieldValue('custrecord_alberta_ns_ship_address',tempConsAddress.replace(/  +/g, ' '));
				ConsRecord.setFieldValue('custrecord_alberta_ns_ship_addrprovince',SyncWMConsRecord.getFieldValue('custrecord_syncwmconsignee_sta'));
				ConsRecord.setFieldValue('custrecord_alberta_ns_consigneeno',SyncWMConsRecord.getFieldValue('custrecord_syncwmconsignee_consigneeno'));
				ConsRecordID = nlapiSubmitRecord(ConsRecord);
				
				SyncWMConsRecord.setFieldValue('custrecord_syncwmconsignee_syncstatus',4);
				SyncWMConsRecord.setFieldValue('custrecord_syncwmconsignee_errormsg','Created new record with Internal ID '+ConsRecordID);
				SyncWMConsRecord.setFieldValue('custrecord_syncwmconsignee_nsid',ConsRecordID);
				if (isActive == 0 || isActive == '0') {ConsRecord.setFieldValue('isinactive','T');}
				nlapiSubmitRecord(SyncWMConsRecord);
				nlapiLogExecution('AUDIT','CALLSCHEDULEDSYNCWMCONSIGNEE','New Consignee Record with Internal ID '+ConsRecordID+' has been created.');
			}
		}
	}
	catch(e){
        nlapiLogExecution('error','ScheduledSyncWMConsignee() has encountered an error.',errText(e));
		nlapiSubmitField('customrecord_syncwmconsignee',SyncWMConsID,'custrecord_syncwmconsignee_syncstatus',3); //Set SyncStatus = Error
		nlapiSubmitField('customrecord_syncwmconsignee',SyncWMConsID,'custrecord_syncwmconsignee_errormsg','Error Details: '+errText(e));
		tempRetries = nlapiLookupField('customrecord_syncwmconsignee',SyncWMConsID,'custrecord_syncwmconsignee_retries');
		nlapiSubmitField('customrecord_syncwmconsignee',SyncWMConsID,'custrecord_syncwmconsignee_retries',(tempRetries - 1));
    }
	findNextRecord();
}

function findNextRecord(){
		//Check for additional records to add to processing queue
		var filters = [
			['custrecord_syncwmconsignee_syncstatus','anyof',[1,3,5]], 'AND',
			['custrecord_syncwmconsignee_retries','greaterthan',0]
			];
		
		var columns = [];
		columns[0] = new nlobjSearchColumn('internalid');
		
		var searchResults = nlapiSearchRecord('customrecord_syncwmconsignee',null,filters,columns);
		
		if(searchResults) {
			var nextSyncWMConsID = searchResults[0].getValue('internalid');
			nlapiLogExecution('AUDIT','CALLSCHEDULEDSYNCWMCONSIGNEE','Additional records to sync found. Queueing '+nextSyncWMConsID);
			var newParams = {'custscript_syncwmconsid':nextSyncWMConsID};
			var ScheduleStatus = nlapiScheduleScript(script_id,null,newParams); //Deployment is empty so that script selects first available deployment
			if(ScheduleStatus == 'QUEUED') {
				nlapiSubmitField('customrecord_syncwmconsignee',nextSyncWMConsID,'	custrecord_syncwmconsignee_syncstatus','Queued');
			} //Else no available deployments - remaining records will be caught by periodic retry script
		} else {
			nlapiLogExecution('AUDIT','CALLSCHEDULEDSYNCWMCONSIGNEE','No records to sync found.');
		}
}

function errText(_e)
{
    
        _internalId = nlapiGetRecordId();
        if(!(typeof _internalId==='number' && (_internalId%1)===0)) {
            _internalId = 0;
        }
    
    var txt='';
    if (_e instanceof nlobjError) {
        //this is netsuite specific error
        txt = 'NLAPI Error: Record ID :: '+_internalId+' :: '+_e.getCode()+' :: '+_e.getDetails() + ' :: ' + _e.getStackTrace().join(', ');
    } else {
        //this is generic javascript error
        txt = 'JavaScript/Other Error: Record ID :: '+_internalId+' :: '+_e.toString()+' : '+_e.stack;
    }
    return txt;
}