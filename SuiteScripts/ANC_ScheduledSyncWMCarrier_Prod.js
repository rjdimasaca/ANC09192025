/* @Scheduled Script on Manual Deployment

Processes SyncWMCarrier Record
*/

var context = nlapiGetContext();
SyncWMID = context.getSetting('SCRIPT','custscript_syncwmcarrid');
var script_id = 471;

function ScheduledSyncWMCarrier(params){
	nlapiLogExecution('DEBUG','CALLSCHEDULEDSYNCWMCARRIER','SyncWMCarrier Processing Started on Record '+SyncWMID);
	try{
		
		nlapiSubmitField('customrecord_syncwmcarrier',SyncWMID,'custrecord_syncwmcarrier_syncstatus','2');
		
		SyncWMRecord = nlapiLoadRecord('customrecord_syncwmcarrier',SyncWMID);
		
		var filters = [
			['internalid','noneof',[SyncWMID]], 'AND',
			['custrecord_syncwmcarrier_wmid','contains',SyncWMRecord.getFieldValue('custrecord_syncwmcarrier_wmid')], 'AND',
			['custrecord_syncwmcarrier_syncstatus','noneof',[7]]
		];
		
		var columns = [];
		columns[0] = new nlobjSearchColumn('internalid');
		
		var searchResults = nlapiSearchRecord('customrecord_syncwmcarrier',null,filters,columns);
		
		if(searchResults) {
			//Matching carrier sync records - record is a duplicate
			SyncWMRecord.setFieldValue('custrecord_syncwmcarrier_syncstatus',7); //Set SyncStatus = Duplicate
			SyncWMRecord.setFieldValue('custrecord_syncwmcarrier_errmsg','Duplicate Sync Record - Not Processed');
			SyncWMRecord.setFieldValue('isinactive','T');
			nlapiSubmitRecord(SyncWMRecord);
			nlapiLogExecution('AUDIT','CALLSCHEDULEDSYNCWMCARRIER','Record identified as Duplicate, processing cancelled');
		} else {
			//No matching carrier sync records - not a duplicate. Continue Processing.
			
			//Check if Record Exists
			//['name','is',SyncWMRecord.getFieldValue('custrecord_syncwmcarrier_name')], 'OR',
			//['externalid','is',SyncWMRecord.getFieldValue('custrecord_syncwmcarrier_accountno')]
			var filters = [
			['custentity_wmid','is',SyncWMRecord.getFieldValue('custrecord_syncwmcarrier_carrierkey')]
			];
			
			var columns = [];
			columns[0] = new nlobjSearchColumn('internalid');
			
			var searchResults = nlapiSearchRecord('vendor',null,filters,columns);
			
			if(searchResults) {
				//Record already exists, perform update actions
				/** Fields to add: **/
				/** Fields to improve: **/
				/** Fields to clarify: **/
				Record = nlapiLoadRecord('vendor',searchResults[0].getValue('internalid'));
				Record.setFieldValue('custentity_wmid',SyncWMRecord.getFieldValue('custrecord_syncwmcarrier_carrierkey'));
				Record.setFieldValue('companyname',SyncWMRecord.getFieldValue('custrecord_syncwmcarrier_name'));
				inputCurrency = SyncWMRecord.getFieldValue('custrecord_syncwmcarrier_currency');
				tempCurrency = (inputCurrency == "CAD" ? "1" : inputCurrency == "USD" ? "2" : inputCurrency == "GBP" ? "3" : inputCurrency == "EUR" ? "4" : "0");
				Record.setFieldValue('currency',tempCurrency);
				countOfAddress = Record.getLineItemCount('addressbook');
				if (countOfAddress == 0) {
					Record.selectNewLineItem('addressbook');
					Record.setCurrentLineItemValue('addressbook','label',SyncWMRecord.getFieldValue('custrecord_syncwmcarrier_address'));
					tempCountry = SyncWMRecord.getFieldValue('custrecord_syncwmcarrier_country') == "CAN" ? "CA" : "US";
					Record.setCurrentLineItemValue('addressbook','country',tempCountry);
					Record.setCurrentLineItemValue('addressbook','addr1',SyncWMRecord.getFieldValue('custrecord_syncwmcarrier_address'));
					Record.setCurrentLineItemValue('addressbook','city',SyncWMRecord.getFieldValue('custrecord_syncwmcarrier_city'));
					Record.setCurrentLineItemValue('addressbook','state',SyncWMRecord.getFieldValue('custrecord_syncwmcarrier_stateprovince'));
					Record.setCurrentLineItemValue('addressbook','zip',SyncWMRecord.getFieldValue('custrecord_syncwmcarrier_postalcode'));
					Record.commitLineItem('addressbook');
				}
				nlapiSubmitRecord(Record);			
				
				SyncWMRecord.setFieldValue('custrecord_syncwmcarrier_syncstatus',4);
				SyncWMRecord.setFieldValue('custrecord_syncwmcarrier_errmsg','Updated existing record with Internal ID '+searchResults[0].getValue('internalid'));
				SyncWMRecord.setFieldValue('custrecord_syncwmcarrier_nsid',searchResults[0].getValue('internalid'));
				nlapiSubmitRecord(SyncWMRecord);
				nlapiLogExecution('AUDIT','CALLSCHEDULEDSYNCWMCARRIER','Carrier Record with Internal ID '+searchResults[0].getValue('internalid')+' already exists and has been updated.');
			} else {
				//Record does not exist, perform create actions
				/** Fields to add: **/
				/** Fields to improve: **/
				/** Fields to clarify: **/
				Record = nlapiCreateRecord('vendor');
				Record.setFieldValue('subsidiary','1'); //Default to master ccompany
				Record.setFieldValue('custentity_wmid',SyncWMRecord.getFieldValue('custrecord_syncwmcarrier_carrierkey'));
				Record.setFieldValue('companyname',SyncWMRecord.getFieldValue('custrecord_syncwmcarrier_name'));
				inputCurrency = SyncWMRecord.getFieldValue('custrecord_syncwmcarrier_currency');
				tempCurrency = (inputCurrency == "CAD" ? "1" : inputCurrency == "USD" ? "2" : inputCurrency == "GBP" ? "3" : inputCurrency == "EUR" ? "4" : "0");
				Record.setFieldValue('currency',tempCurrency);
				Record.selectNewLineItem('addressbook');
				Record.setCurrentLineItemValue('addressbook','label',SyncWMRecord.getFieldValue('custrecord_syncwmcarrier_address'));
				tempCountry = SyncWMRecord.getFieldValue('custrecord_syncwmcarrier_country') == "CAN" ? "CA" : "US";
				Record.setCurrentLineItemValue('addressbook','country',tempCountry);
				Record.setCurrentLineItemValue('addressbook','addr1',SyncWMRecord.getFieldValue('custrecord_syncwmcarrier_address'));
				Record.setCurrentLineItemValue('addressbook','city',SyncWMRecord.getFieldValue('custrecord_syncwmcarrier_city'));
				Record.setCurrentLineItemValue('addressbook','state',SyncWMRecord.getFieldValue('custrecord_syncwmcarrier_stateprovince'));
				Record.setCurrentLineItemValue('addressbook','zip',SyncWMRecord.getFieldValue('custrecord_syncwmcarrier_postalcode'));
				Record.commitLineItem('addressbook');
				RecordID = nlapiSubmitRecord(Record);			
				
				
				SyncWMRecord.setFieldValue('custrecord_syncwmcarrier_syncstatus',4);
				SyncWMRecord.setFieldValue('custrecord_syncwmcarrier_errmsg','Created new record with Internal ID '+RecordID);
				SyncWMRecord.setFieldValue('custrecord_syncwmcarrier_nsid',RecordID);
				nlapiSubmitRecord(SyncWMRecord);
				nlapiLogExecution('AUDIT','CALLSCHEDULEDSYNCWMCARRIER','New Carrier Record with Internal ID '+RecordID);
			}
		}
	}
	catch(e){
        nlapiLogExecution('error','ScheduledSyncWMCarrier() has encountered an error.',errText(e));
		nlapiSubmitField('customrecord_syncwmcarrier',SyncWMID,'custrecord_syncwmcarrier_syncstatus',3); //Set SyncStatus = Error
		nlapiSubmitField('customrecord_syncwmcarrier',SyncWMID,'custrecord_syncwmcarrier_errmsg','Error Details: '+errText(e));
		tempRetries = nlapiLookupField('customrecord_syncwmcarrier',SyncWMID,'custrecord_syncwmcarrier_retries');
		nlapiSubmitField('customrecord_syncwmcarrier',SyncWMID,'custrecord_syncwmcarrier_retries',(tempRetries - 1));
    }
	findNextRecord();
}

function findNextRecord(){
		//Check for additional records to add to processing queue
		var filters = [
			['custrecord_syncwmcarrier_syncstatus','anyof',[1,3,5]], 'AND',
			['custrecord_syncwmcarrier_retries','greaterthan',0]
			];
		
		var columns = [];
		columns[0] = new nlobjSearchColumn('internalid');
		
		var searchResults = nlapiSearchRecord('customrecord_syncwmcarrier',null,filters,columns);
		
		if(searchResults) {
			var nextSyncWMID = searchResults[0].getValue('internalid');
			nlapiLogExecution('AUDIT','CALLSCHEDULEDSYNCWMCARRIER','Additional records to sync found. Queueing '+nextSyncWMID);
			var newParams = {'custscript_syncwmcarrid':nextSyncWMID};
			var ScheduleStatus = nlapiScheduleScript(script_id,null,newParams); //Deployment is empty so that script selects first available deployment
			if(ScheduleStatus == 'QUEUED') {
				nlapiSubmitField('customrecord_syncwmcarrier',nextSyncWMID,'	custrecord_syncwmcarrier_syncstatus','Queued');
			} //Else no available deployments - remaining records will be caught by periodic retry script
		} else {
			nlapiLogExecution('AUDIT','CALLSCHEDULEDSYNCWMCARRIER','No records to sync found.');
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