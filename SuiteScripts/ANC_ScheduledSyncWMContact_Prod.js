/* @Scheduled Script on Manual Deployment

Processes SyncWMContact Record
*/

var context = nlapiGetContext();
SyncWMID = context.getSetting('SCRIPT','custscript_syncwmcontactid');
var script_id = 469;

function ScheduledSyncWMContact(params){
	nlapiLogExecution('DEBUG','CALLSCHEDULEDSYNCWMCONTACT','SyncWMContact Processing Started on Record '+SyncWMID);
	try{
		
		nlapiSubmitField('customrecord_syncwmcontact',SyncWMID,'custrecord_syncwmcontact_syncstatus','2');
		
		SyncWMRecord = nlapiLoadRecord('customrecord_syncwmcontact',SyncWMID);
		
		var filters = [
			['internalid','noneof',[SyncWMID]], 'AND',
			['custrecord_syncwmcontact_wmid','contains',SyncWMRecord.getFieldValue('custrecord_syncwmcontact_wmid')], 'AND',
			['custrecord_syncwmcontact_syncstatus','noneof',[7]]
		];
		
		var columns = [];
		columns[0] = new nlobjSearchColumn('internalid');
		
		var searchResults = nlapiSearchRecord('customrecord_syncwmcontact',null,filters,columns);
		
		if(searchResults) {
			//Matching contact sync records - record is a duplicate
			SyncWMRecord.setFieldValue('custrecord_syncwmcontact_syncstatus',7); //Set SyncStatus = Duplicate
			SyncWMRecord.setFieldValue('custrecord_syncwmcontact_errmsg','Duplicate Sync Record - Not Processed');
			SyncWMRecord.setFieldValue('isinactive','T');
			nlapiSubmitRecord(SyncWMRecord);
			nlapiLogExecution('AUDIT','CALLSCHEDULEDSYNCWMCONTACT','Record identified as Duplicate, processing cancelled');
		} else {
			//No matching contact sync records - not a duplicate. Continue Processing.
			
			//Check if Record Exists
			var filters = [
			['custentity_wmid','is',SyncWMRecord.getFieldValue('custrecord_syncwmcontact_contactkey')]
			];
			
			tempFirstName = SyncWMRecord.getFieldValue('custrecord_syncwmcontact_firstname');
			tempLastName = SyncWMRecord.getFieldValue('custrecord_syncwmcontact_lastname');
			
			if (tempFirstName != null && tempFirstName != '' && tempLastName != null && tempLastName != '') {
				filters.push('or');
				filters.push([['firstname','is',SyncWMRecord.getFieldValue('custrecord_syncwmcontact_firstname')],'AND',
				['lastname','is',SyncWMRecord.getFieldValue('custrecord_syncwmcontact_lastname')]]);
			} else if (tempFirstName != null && tempFirstName != '') {
				filters.push('or');
				filters.push(['firstname','is',SyncWMRecord.getFieldValue('custrecord_syncwmcontact_firstname')]);
			} else if (tempLastName != null && tempLastName != '') {
				filters.push('or');
				filters.push(['lastname','is',SyncWMRecord.getFieldValue('custrecord_syncwmcontact_lastname')]);
			}
			
			var columns = [];
			columns[0] = new nlobjSearchColumn('internalid');
			
			var searchResults = nlapiSearchRecord('contact',null,filters,columns);
			
			if(searchResults) {
				//Record already exists, perform update actions
				Record = nlapiLoadRecord('contact',searchResults[0].getValue('internalid'));
				Record.setFieldValue('custentity_wmid',SyncWMRecord.getFieldValue('custrecord_syncwmcontact_contactkey'));
				Record.setFieldValue('category',validateContactType(SyncWMRecord.getFieldValue('custrecord_syncwmcontact_type')));
				Record.setFieldValue('title',SyncWMRecord.getFieldValue('custrecord_syncwmcontact_title'));
				tempFirstName = SyncWMRecord.getFieldValue('custrecord_syncwmcontact_firstname');
				if(tempFirstName != null && tempFirstName != '') {Record.setFieldValue('firstname',tempFirstName.substring(0,32));}
				tempLastName = SyncWMRecord.getFieldValue('custrecord_syncwmcontact_lastname');
				if(tempLastName != null && tempLastName != '') {Record.setFieldValue('lastname',tempLastName.substring(0,32));}
				//Record.setFieldValue('entityid',''+' '+'');
				tempPhone = validatePhoneNumber(SyncWMRecord.getFieldValue('custrecord_syncwmcontact_workphone'));
				if(tempPhone != null && tempPhone != '') {Record.setFieldValue('phone',tempPhone);}
				tempMobilePhone = validatePhoneNumber(SyncWMRecord.getFieldValue('custrecord_syncwmcontact_cellphone'));
				if(tempMobilePhone != null && tempMobilePhone != '') {Record.setFieldValue('mobilephone',tempMobilePhone);}
				tempEmail = String(SyncWMRecord.getFieldValue('custrecord_syncwmcontact_email'));
				invalidEmail = (tempEmail.indexOf(" ") > -1) ? true : false;
				if (invalidEmail) {
					Record.setFieldValue('comments','WM Email contains invalid characters, value is: '+tempEmail);
				} else { Record.setFieldValue('email',tempEmail); }
				tempFax = validatePhoneNumber(SyncWMRecord.getFieldValue('custrecord_syncwmcontact_fax'));
				if(tempFax != null && tempFax != '') {Record.setFieldValue('fax',tempFax);}
				tempAddress = SyncWMRecord.getFieldValue('custrecord_syncwmcontact_address');
				if(tempAddress == '' || tempAddress == null) {
					//Do nothing
				} else {
					countOfAddress = Record.getLineItemCount('addressbook');
					if (countOfAddress == 0) {
						Record.selectNewLineItem('addressbook');
					} else {
						Record.selectLineItem('addressbook',1);
					}
					Record.setCurrentLineItemValue('addressbook','address',tempAddress);
					Record.setCurrentLineItemValue('addressbook','addrtext',tempAddress);
					Record.commitLineItem('addressbook');
					Record.setFieldValue('address',tempAddress);
				}
				nlapiSubmitRecord(Record);			
				
				SyncWMRecord.setFieldValue('custrecord_syncwmcontact_syncstatus',4);
				SyncWMRecord.setFieldValue('custrecord_syncwmcontact_errmsg','Updated existing record with Internal ID '+searchResults[0].getValue('internalid'));
				SyncWMRecord.setFieldValue('custrecord_syncwmcontact_nsid',searchResults[0].getValue('internalid'));
				nlapiSubmitRecord(SyncWMRecord);
				nlapiLogExecution('AUDIT','CALLSCHEDULEDSYNCWMCONTACT','Contact Record with Internal ID '+searchResults[0].getValue('internalid')+' already exists and has been updated.');
			} else {
				//Record does not exist, perform create actions
				Record = nlapiCreateRecord('contact');
				Record.setFieldValue('subsidiary','5'); //Default to ANC Sales
				Record.setFieldValue('custentity_wmid',SyncWMRecord.getFieldValue('custrecord_syncwmcontact_contactkey'));
				Record.setFieldValue('category',validateContactType(SyncWMRecord.getFieldValue('custrecord_syncwmcontact_type')));
				Record.setFieldValue('title',SyncWMRecord.getFieldValue('custrecord_syncwmcontact_title'));
				tempFirstName = SyncWMRecord.getFieldValue('custrecord_syncwmcontact_firstname');
				if(tempFirstName != null && tempFirstName != '') {Record.setFieldValue('firstname',tempFirstName.substring(0,32));}
				tempLastName = SyncWMRecord.getFieldValue('custrecord_syncwmcontact_lastname');
				if(tempLastName != null && tempLastName != '') {Record.setFieldValue('lastname',tempLastName.substring(0,32));}
				//Record.setFieldValue('entityid',''+' '+'');
				tempPhone = validatePhoneNumber(SyncWMRecord.getFieldValue('custrecord_syncwmcontact_workphone'));
				if(tempPhone != null && tempPhone != '') {Record.setFieldValue('phone',tempPhone);}
				tempMobilePhone = validatePhoneNumber(SyncWMRecord.getFieldValue('custrecord_syncwmcontact_cellphone'));
				if(tempMobilePhone != null && tempMobilePhone != '') {Record.setFieldValue('mobilephone',tempMobilePhone);}
				Record.setFieldValue('email',SyncWMRecord.getFieldValue('custrecord_syncwmcontact_email'));
				tempFax = validatePhoneNumber(SyncWMRecord.getFieldValue('custrecord_syncwmcontact_fax'));
				if(tempFax != null && tempFax != '') {Record.setFieldValue('fax',tempFax);}
				tempAddress = SyncWMRecord.getFieldValue('custrecord_syncwmcontact_address');
				if(tempAddress == '' || tempAddress == null) {
					//Do nothing
				} else {
					countOfAddress = Record.getLineItemCount('addressbook');
					if (countOfAddress == 0) {
						Record.selectNewLineItem('addressbook');
					} else {
						Record.selectLineItem('addressbook',1);
					}
					Record.setCurrentLineItemValue('addressbook','address',tempAddress);
					Record.setCurrentLineItemValue('addressbook','addrtext',tempAddress);
					Record.commitLineItem('addressbook');
					Record.setFieldValue('address',tempAddress);
				}
				RecordID = nlapiSubmitRecord(Record);	
				
				SyncWMRecord.setFieldValue('custrecord_syncwmcontact_syncstatus',4);
				SyncWMRecord.setFieldValue('custrecord_syncwmcontact_errmsg','Created new record with Internal ID '+RecordID);
				SyncWMRecord.setFieldValue('custrecord_syncwmcontact_nsid',RecordID);
				nlapiSubmitRecord(SyncWMRecord);
				nlapiLogExecution('AUDIT','CALLSCHEDULEDSYNCWMCONTACT','New Contact Record with Internal ID '+RecordID);
			}
		}
	}
	catch(e){
        nlapiLogExecution('error','ScheduledSyncWMContact() has encountered an error.',errText(e));
		nlapiSubmitField('customrecord_syncwmcontact',SyncWMID,'custrecord_syncwmcontact_syncstatus',3); //Set SyncStatus = Error
		nlapiSubmitField('customrecord_syncwmcontact',SyncWMID,'custrecord_syncwmcontact_errmsg','Error Details: '+errText(e));
		tempRetries = nlapiLookupField('customrecord_syncwmcontact',SyncWMID,'custrecord_syncwmcontact_retries');
		nlapiSubmitField('customrecord_syncwmcontact',SyncWMID,'custrecord_syncwmcontact_retries',(tempRetries - 1));
		nlapiLogExecution('debug','CALLSCHEDULESYNCWMCONTACT','ScheduledSyncWMContact has been updated with '+(tempRetries - 1)+' retries.');
    }
	findNextRecord();
}

function findNextRecord(){
		//Check for additional records to add to processing queue
		var filters = [
			['custrecord_syncwmcontact_syncstatus','anyof',[1,3,5]], 'AND',
			['custrecord_syncwmcontact_retries','greaterthan',0]
			];
		
		var columns = [];
		columns[0] = new nlobjSearchColumn('internalid');
		
		var searchResults = nlapiSearchRecord('customrecord_syncwmcontact',null,filters,columns);
		
		if(searchResults) {
			var nextSyncWMID = searchResults[0].getValue('internalid');
			nlapiLogExecution('AUDIT','CALLSCHEDULEDSYNCWMCONTACT','Additional records to sync found. Queueing '+nextSyncWMID);
			var newParams = {'custscript_syncwmcontactid':nextSyncWMID};
			var ScheduleStatus = nlapiScheduleScript(script_id,null,newParams); //Deployment is empty so that script selects first available deployment
			if(ScheduleStatus == 'QUEUED') {
				nlapiSubmitField('customrecord_syncwmcontact',nextSyncWMID,'	custrecord_syncwmcontact_syncstatus','Queued');
			} //Else no available deployments - remaining records will be caught by periodic retry script
		} else {
			nlapiLogExecution('AUDIT','CALLSCHEDULEDSYNCWMCONTACT','No records to sync found.');
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

function validateContactType(typeCode){
	var columns = [];
	columns[0] = new nlobjSearchColumn('name');
	columns[1] = new nlobjSearchColumn('internalid');
	typeList = nlapiSearchRecord('contactcategory',null,null,columns);
	if(typeList) {
		for(n=0; n<typeList.length; n++){
			if (typeCode == typeList[0].getValue('name')) {
				return typeList[0].getValue('internalid');
			}
		}
	}
	return '6'; //Contact Type of 'Other'
}

function validatePhoneNumber(rawNumber) {
	if(rawNumber == null || rawNumber == '') {
		return '';
	} else {
		sanitizedNumber = rawNumber.replace(/[^a-zA-Z0-9]/g, '');
		if (sanitizedNumber) {
			sanitizedLength = sanitizedNumber.length;
			return sanitizedNumber.substring(0,16);
		}
	}
	return '';
}