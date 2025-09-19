/* @Scheduled Script on Manual Deployment

Processes SyncWMCustomerConsignee Records
*/

var context = nlapiGetContext();
SyncWMID = context.getSetting('SCRIPT','custscript_syncwmcustconsid');
var script_id = 446;
var CustIsInactive = '????';
var CustIntID = 0;

function ScheduledSyncWMCustCons(params){
	nlapiLogExecution('DEBUG','CALLSCHEDULEDSYNCWMCUSTCONS','SyncWMCustCons Processing Started on Record '+SyncWMID);
	try{
		
		nlapiSubmitField('customrecord_syncwmcustomerconsignee',SyncWMID,'custrecord_syncwmcustcons_syncstatus','2');
		
		SyncWMRecord = nlapiLoadRecord('customrecord_syncwmcustomerconsignee',SyncWMID);
		CustKey = SyncWMRecord.getFieldValue('custrecord_syncwmcustcons_custkey');
		ConsKey = SyncWMRecord.getFieldValue('custrecord_syncwmcustcons_conskey');
		
		if(CustKey == '' || CustKey == null) { throw nlapiCreateError('ERROR','Customer Key is missing for SyncWMCustCons '+SyncWMID); }
		if(ConsKey == '' || ConsKey == null) { throw nlapiCreateError('ERROR','Consignee Key is missing for SyncWMCustCons '+SyncWMID); }
		
		var filters = [['custentity_wmid','is',CustKey]];
		var columns = [];
		columns[0] = new nlobjSearchColumn('internalid');
		columns[1] = new nlobjSearchColumn('companyname');
		var searchCustomers = nlapiSearchRecord('customer',null,filters,columns);
		
		if(searchCustomers) {
			CustIntID = searchCustomers[0].getValue('internalid');
			
			var filters = [
			['custrecord_alberta_ns_consigneekey','is',ConsKey], 'AND',
			['isinactive','is','F']
			];
			var columns = [];
			columns[0] = new nlobjSearchColumn('internalid');
			columns[1] = new nlobjSearchColumn('custrecord_alberta_ns_customer');
			var searchConsignees = nlapiSearchRecord('customrecord_alberta_ns_consignee_record',null,filters,columns);
			
			if(searchConsignees && searchCustomers.length == 1) {
				//Check if already linked.
				var CustConsID = -1;
				for(n=0; n<searchConsignees.length; n++) {
					if(searchConsignees[n].getValue('custrecord_alberta_ns_customer') == CustIntID) {CustConsID = searchConsignees[n].getValue('internalid');}
				}
				
				//Check if Customer Inactive (Link will fail)
				CustIsInactive = nlapiLookupField('customer',CustIntID,'isinactive');
				//if (CustIsInactive == 'T') { throw nlapiCreateError('error','Customer '+nlapiLookupField('customer',CustIntID,'entityid')+' with internal ID '+CustIntID+' and WMID '+CustKey+' is Inactive. Customer Link cannot be processed.'); }
				if (CustIsInactive == 'T') { nlapiSubmitField('customer',CustIntID,'isinactive','F'); }
				
				var CurrentRec = nlapiLoadRecord('customrecord_alberta_ns_consignee_record',searchConsignees[0].getValue('internalid'));
				var tempCompName = searchCustomers[0].getValue('companyname').replace(/ .*/,'');
				if(CustConsID == -1 && searchConsignees.length == 1 && (CurrentRec.getFieldValue('custrecord_alberta_ns_customer') == '' || CurrentRec.getFieldValue('custrecord_alberta_ns_customer') == null)) {
					/** Connect to first record with blank Customer (if exists) **/
					CurrentRec.setFieldValue('name',CurrentRec.getFieldValue('name')+' ('+tempCompName+')');
					CurrentRec.setFieldValue('custrecord_alberta_ns_invoicename',CurrentRec.getFieldValue('name'));
					CurrentRec.setFieldValue('custrecord_alberta_ns_customer',CustIntID);
					ExistRecID = nlapiSubmitRecord(CurrentRec);
					
					SyncWMRecord.setFieldValue('custrecord_syncwmcustcons_syncstatus',4);
					SyncWMRecord.setFieldValue('custrecord_syncwmcustcons_errormessage','Connected Consignee record with Internal ID '+ExistRecID);
					SyncWMRecord.setFieldValue('custrecord_syncwmcustcons_nsid',ExistRecID);
					nlapiSubmitRecord(SyncWMRecord);
					nlapiLogExecution('AUDIT','CALLSCHEDULEDSYNCWMCUSTCONS','Consignee record with Internal ID '+ExistRecID+' has been connected.');
				} else	if(CustConsID == -1) {
					/**Create New from Existing**/
					/**Improvement - Should join if first blank customer**/
					NewRec = nlapiCreateRecord('customrecord_alberta_ns_consignee_record');
					NewRec.setFieldValue('name',CurrentRec.getFieldValue('name')+' ('+tempCompName+')');
					NewRec.setFieldValue('custrecord_alberta_ns_ship_address',CurrentRec.getFieldValue('custrecord_alberta_ns_ship_address'));
					NewRec.setFieldValue('custrecord_alberta_ns_consigneekey',CurrentRec.getFieldValue('custrecord_alberta_ns_consigneekey'));
					NewRec.setFieldValue('custrecord_alberta_ns_country',CurrentRec.getFieldValue('custrecord_alberta_ns_country'));
					NewRec.setFieldValue('custrecord_alberta_ns_ship_addrprovince',CurrentRec.getFieldValue('custrecord_alberta_ns_ship_addrprovince'));
					NewRec.setFieldValue('custrecord_alberta_ns_city',CurrentRec.getFieldValue('custrecord_alberta_ns_city'));
					NewRec.setFieldValue('custrecord_alberta_ns_postal_code',CurrentRec.getFieldValue('custrecord_alberta_ns_postal_code'));
					NewRec.setFieldValue('custrecord_alberta_ns_contact',CurrentRec.getFieldValue('custrecord_alberta_ns_contact'));
					NewRec.setFieldValue('custrecord_alberta_ns_consigneeno',CurrentRec.getFieldValue('custrecord_alberta_ns_consigneeno'));
					NewRec.setFieldValue('name',CurrentRec.getFieldValue('name')+' ('+tempCompName+')');
					NewRec.setFieldValue('custrecord_alberta_ns_invoicename',CurrentRec.getFieldValue('name'));
					NewRec.setFieldValue('custrecord_alberta_ns_customer',CustIntID);
					NewRecID = nlapiSubmitRecord(NewRec);
					
					SyncWMRecord.setFieldValue('custrecord_syncwmcustcons_syncstatus',4);
					SyncWMRecord.setFieldValue('custrecord_syncwmcustcons_errormessage','Created Consignee record with Internal ID '+NewRecID);
					SyncWMRecord.setFieldValue('custrecord_syncwmcustcons_nsid',NewRecID);
					nlapiSubmitRecord(SyncWMRecord);
					nlapiLogExecution('AUDIT','CALLSCHEDULEDSYNCWMCUSTCONS','Consignee record with Internal ID '+NewRecID+' has been created.');
				} else {
					//Link Exists - nothing to update so no action required.
					SyncWMRecord.setFieldValue('custrecord_syncwmcustcons_syncstatus',4);
					SyncWMRecord.setFieldValue('custrecord_syncwmcustcons_errormessage','Consignee record already exists and is linked to Customer.');
					SyncWMRecord.setFieldValue('custrecord_syncwmcustcons_nsid',CurrentRec.getFieldValue('internalid'));
					nlapiSubmitRecord(SyncWMRecord);
					nlapiLogExecution('AUDIT','CALLSCHEDULEDSYNCWMCUSTCONS','Consignee record with Internal ID '+CurrentRec.getFieldValue('internalid')+' already exists.');
				}
			} else if (searchCustomers.length == 1) {
				throw nlapiCreateError('error','No Consignee Found with matching WM ID (Consignee Key) for '+ConsKey);
			} else {
				throw nlapiCreateError('error','More than one customer record found for WMID '+CustKey);
			}
		} else {
			throw nlapiCreateError('error','No Customer Found with matching WM ID (Customer Key) for '+CustKey);
		}
	if(CustIsInactive == 'T') { nlapiSubmitField('customer',CustIntID,'isinactive','T'); }
	}
	catch(e){
        nlapiLogExecution('error','ScheduledSyncWMCustCons() has encountered an error.',errText(e));
		nlapiSubmitField('customrecord_syncwmcustomerconsignee',SyncWMID,'custrecord_syncwmcustcons_syncstatus',3); //Set SyncStatus = Error
		nlapiSubmitField('customrecord_syncwmcustomerconsignee',SyncWMID,'custrecord_syncwmcustcons_errormessage','Error Details: '+errText(e));
		tempRetries = nlapiLookupField('customrecord_syncwmcustomerconsignee',SyncWMID,'custrecord_syncwmcustcons_retries');
		nlapiSubmitField('customrecord_syncwmcustomerconsignee',SyncWMID,'custrecord_syncwmcustcons_retries',(tempRetries - 1));
		nlapiLogExecution('debug','CALLSCHEDULESYNCWMCUSTCONS','ScheduledSyncWMCustCons has been updated with '+(tempRetries - 1)+' retries.');
		
    }
	findNextRecord();
}

function findNextRecord(){
		//Check for additional records to add to processing queue
		var filters = [
			['custrecord_syncwmcustcons_syncstatus','anyof',[1,3,5]], 'AND',
			['custrecord_syncwmcustcons_retries','greaterthan',0]
			];
		
		var columns = [];
		columns[0] = new nlobjSearchColumn('internalid');
		
		var searchResults = nlapiSearchRecord('customrecord_syncwmcustomerconsignee',null,filters,columns);
		
		if(searchResults) {
			var nextSyncWMID = searchResults[0].getValue('internalid');
			nlapiLogExecution('AUDIT','CALLSCHEDULEDSYNCWMCUSTCONS','Additional records to sync found. Queueing '+nextSyncWMID);
			var newParams = {'custscript_syncwmcustconsid':nextSyncWMID};
			var ScheduleStatus = nlapiScheduleScript(script_id,null,newParams); //Deployment is empty so that script selects first available deployment
			if(ScheduleStatus == 'QUEUED') {
				nlapiSubmitField('customrecord_syncwmcustomerconsignee',nextSyncWMID,'	custrecord_syncwmcustcons_syncstatus','6');
			} //Else no available deployments - remaining records will be caught by periodic retry script
		} else {
			nlapiLogExecution('AUDIT','CALLSCHEDULEDSYNCWMCUSTCONS','No records to sync found.');
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