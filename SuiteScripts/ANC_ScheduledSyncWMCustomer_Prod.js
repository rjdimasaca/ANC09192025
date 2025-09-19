/* @Scheduled Script on Manual Deployment

Processes SyncWMCustomer Record
1.0.1 - now sets the multi email fields
1.0.2 - TC10ROD mark S requests temporarily disabling this on edit mode
*/

/** NEED TO FIX DUPLICATE NAME ERROR WITH SUFFIX **/

var context = nlapiGetContext();
//var JSONParams = context.getSetting('SCRIPT','custscript_syncwmcustid');
SyncWMCustID = context.getSetting('SCRIPT','custscript_syncwmcustid');
//var jsonObj = JSON.parse(JSONParams);
//var SyncWMCustID = jsonObj.custscript_syncwmcustid;
var script_id = 444;
var customerEmailMapping = {
        "custrecord_syncmcust_email1" : {customerfieldid : "custentity_anc_inv_email1"},
        "custrecord_syncmcust_email2" : {customerfieldid : "custentity_anc_inv_email2"},
        "custrecord_syncmcust_email3" : {customerfieldid : "custentity_anc_inv_email3"},
        "custrecord_syncmcust_email4" : {customerfieldid : "custentity_anc_inv_email4"},
        "custrecord_syncmcust_email5" : {customerfieldid : "custentity_anc_inv_email5"},
        "custrecord_syncmcust_email6" : {customerfieldid : "custentity_anc_inv_email6"}

};
function ScheduledSyncWMCustomer(params){
    nlapiLogExecution('DEBUG','CALLSCHEDULEDSYNCWMCUSTOMER','SyncWMCustomer Processing Started on Record '+SyncWMCustID);
    try{
        
        nlapiSubmitField('customrecord_syncwmcustomer',SyncWMCustID,'   custrecord_syncwmcust_syncstatus','2');
        
        SyncWMCustRecord = nlapiLoadRecord('customrecord_syncwmcustomer',SyncWMCustID);
        
        var filters = [
            ['internalid','noneof',[SyncWMCustID]], 'AND',
            ['custrecord_syncwmcust_wmid','contains',SyncWMCustRecord.getFieldValue('custrecord_syncwmcust_wmid')], 'AND',
            ['custrecord_syncwmcust_syncstatus','noneof',[7]]
        ];
        
        var columns = [];
        columns[0] = new nlobjSearchColumn('internalid');
        
        var searchResults = nlapiSearchRecord('customrecord_syncwmcustomer',null,filters,columns);
        
        
        
        if(searchResults) {
            //Matching customer sync records - record is a duplicate
            SyncWMCustRecord.setFieldValue('custrecord_syncwmcust_syncstatus',7); //Set SyncStatus = Duplicate
            SyncWMCustRecord.setFieldValue('custrecord_syncwmcust_errormsg','Duplicate Sync Record - Not Processed');
            SyncWMCustRecord.setFieldValue('isinactive','T');
            nlapiSubmitRecord(SyncWMCustRecord, false, true);
            nlapiLogExecution('AUDIT','CALLSCHEDULEDSYNCWMCUSTOMER','Record identified as Duplicate, processing cancelled');
        /** DISABLING INACTIVE LOGIC - WILL NEED TO CORRECT LOGIC BEFORE ACTIVATING AND REPROCESSING **/
        } else if (true) {
        //} else if (SyncWMCustRecord.getFieldValue('custrecord_syncwmcust_active') == 1 || SyncWMCustRecord.getFieldValue('custrecord_syncwmcust_active') == '1'){
            //No matching customer sync records - not a duplicate. Continue Processing.
            
            //Check if Later Sync Record Exists
            var ExKeyFilters = [
                ['custrecord_syncwmcust_customerkey','is',SyncWMCustRecord.getFieldValue('custrecord_syncwmcust_customerkey')], 'AND',
                ['custrecord_syncwmcust_syncstatus','noneof',[7]]
            ];
            
            var ExKeyColumns = [];
            ExKeyColumns[0] = new nlobjSearchColumn('internalid');
            ExKeyColumns[1] = new nlobjSearchColumn('custrecord_syncwmcust_exchtxkey');
            
            var ExKeySearchResults = nlapiSearchRecord('customrecord_syncwmcustomer',null,ExKeyFilters,ExKeyColumns);
            
            if(ExKeySearchResults) {
                currentExchangeKey = SyncWMCustRecord.getFieldValue('custrecord_syncwmcust_exchtxkey');
                for(n=0; n<ExKeySearchResults.length; n++) {
                    if (parseInt(ExKeySearchResults[n].getValue('custrecord_syncwmcust_exchtxkey')) > parseInt(currentExchangeKey)) {
                        currentExchangeKey = ExKeySearchResults[n].getValue('custrecord_syncwmcust_exchtxkey');
                        
                        SyncWMCustRecord.setFieldValue('custrecord_syncwmcust_syncstatus',4);
                        SyncWMCustRecord.setFieldValue('custrecord_syncwmcust_errormsg','Later Exchange Key of '+currentExchangeKey+' was found. Customer does not need to be processed.');
                        nlapiSubmitRecord(SyncWMCustRecord, false, true);
                        
                        SyncWMCustRecord = nlapiLoadRecord('customrecord_syncwmcustomer',ExKeySearchResults[n].getValue('internalid'));
                        SyncWMCustID = ExKeySearchResults[n].getValue('internalid');
                    }
                }               
            }
            
            //Check if Record Exists
            //['externalid','is',SyncWMCustRecord.getFieldValue('custrecord_syncwmcust_accountno')], 'OR',
            if(SyncWMCustRecord.getFieldValue('custrecord_syncwmcust_accountno') != '' && SyncWMCustRecord.getFieldValue('custrecord_syncwmcust_accountno') != null){
                var filters = [
                ['custentity_wmid','is',SyncWMCustRecord.getFieldValue('custrecord_syncwmcust_customerkey')], 'OR',
                ['externalid','is',SyncWMCustRecord.getFieldValue('custrecord_syncwmcust_accountno')]   
                ];
            } else {
                var filters = [
                ['custentity_wmid','is',SyncWMCustRecord.getFieldValue('custrecord_syncwmcust_customerkey')]
                ];
            }
            
            var columns = [];
            columns[0] = new nlobjSearchColumn('internalid');
            columns[1] = new nlobjSearchColumn('custentity_wmid');
            columns[2] = new nlobjSearchColumn('externalid');
            columns[3] = new nlobjSearchColumn('companyname');
            
            var searchResults = nlapiSearchRecord('customer',null,filters,columns);
            
            var customerGroupID = getCustomerGroup(SyncWMCustRecord.getFieldValue('custrecord_syncwmcust_custgroupkey'), SyncWMCustRecord.getFieldValue('custrecord_syncwmcust_currency'));
            
            //1.0.1 - 08042020 - allow setting email address fields TC10ROD
            var CustRecord = null;
            if(searchResults) {
                //Record already exists, perform update actions
                /** Fields to add: Customer Group Key (Parent Customer), Internal Sales Rep, External Sales Rep**/
                /** Fields to improve: Address fields (Currently just add if empty, should check and update) **/
                /** Fields to clarify: Customer No **/
                CustRecord = nlapiLoadRecord('customer',searchResults[0].getValue('internalid'));
                var targetCategory = SyncWMCustRecord.getFieldValue('custrecord_syncmcust_category');
                nlapiLogExecution("DEBUG", "LOADRECORD targetCategory", targetCategory);
                if(targetCategory)
                {
                    CustRecord.setFieldValue('category',targetCategory);
                }
                if(customerGroupID > 0) {CustRecord.setFieldValue('parent',customerGroupID);}
                CustRecord.setFieldValue('custentity_wmid',SyncWMCustRecord.getFieldValue('custrecord_syncwmcust_customerkey'));
                //CustRecord.setFieldValue('externalid',SyncWMCustRecord.getFieldValue('custrecord_syncwmcust_accountno')); //CAUSES ERROR
                CustRecord.setFieldValue('companyname',SyncWMCustRecord.getFieldValue('custrecord_syncwmcust_name'));
                inputCurrency = SyncWMCustRecord.getFieldValue('custrecord_syncwmcust_currency');
                tempCurrency = (inputCurrency == "CAD" ? "1" : inputCurrency == "USD" ? "2" : inputCurrency == "GBP" ? "3" : inputCurrency == "EUR" ? "4" : "0");
                CustRecord.setFieldValue('currency',tempCurrency);
                defaultReceivablesAcct = (tempCurrency == '2') ? '782' : '785'; //USD Customers to A/R 1203 IID 782, CAD Customers to A/R 1205 IID 785
                CustRecord.setFieldValue('receivablesaccount',defaultReceivablesAcct);
                tempBillByShipDate = SyncWMCustRecord.getFieldValue('custrecord_syncmcust_billbyshipdate');
                CustRecord.setFieldValue('custentity_billedbyshipdate',(tempBillByShipDate == 1 || tempBillByShipDate == '1') ? 'T' : 'F');
                countOfAddress = CustRecord.getLineItemCount('addressbook');
                if (countOfAddress == 0) {
                    CustRecord.selectNewLineItem('addressbook');
                    CustRecord.setCurrentLineItemValue('addressbook','label',SyncWMCustRecord.getFieldValue('custrecord_syncwmcust_address'));
                    tempCountry = SyncWMCustRecord.getFieldValue('custrecord_syncwmcust_country') == "CAN" ? "CA" : "US";
                    CustRecord.setCurrentLineItemValue('addressbook','country',tempCountry);
                    CustRecord.setCurrentLineItemValue('addressbook','addr1',SyncWMCustRecord.getFieldValue('custrecord_syncwmcust_address'));
                    CustRecord.setCurrentLineItemValue('addressbook','city',SyncWMCustRecord.getFieldValue('custrecord_syncwmcust_city'));
                    CustRecord.setCurrentLineItemValue('addressbook','state',SyncWMCustRecord.getFieldValue('custrecord_syncwmcust_stateprovince'));
                    CustRecord.setCurrentLineItemValue('addressbook','zip',SyncWMCustRecord.getFieldValue('custrecord_syncwmcust_postalcode'));
                    CustRecord.commitLineItem('addressbook');
                }
                //CustRecord.setFieldValue('taxitem',''); //Change in Production - US Customers Only, CAN customers should retain tax codes
                
                
                //1.0.1 - TC10ROD
                //1.0.2 - TC10ROD mark S requests temporarily disabling this on edit mode because he is still testing to have these filled from integration
                //nlapiLogExecution("DEBUG", "EDIT MODE : BEFORE SETTING EMAIL FIELDS : customerEmailMapping" , customerEmailMapping)
                //doing so will allow him to directly test in production without overriding data
                /*
                for(synctable_fieldid in customerEmailMapping)
                {
                    SyncWMCustRecord_fieldValue = SyncWMCustRecord.getFieldValue(synctable_fieldid);
                    CustRecord.setFieldValue(customerEmailMapping[synctable_fieldid].customerfieldid, SyncWMCustRecord_fieldValue);
                }
                */
                
                nlapiSubmitRecord(CustRecord, false, true);
                
                SyncWMCustRecord.setFieldValue('custrecord_syncwmcust_syncstatus',4);
                SyncWMCustRecord.setFieldValue('custrecord_syncwmcust_errormsg','Updated existing record with Internal ID '+CustRecord.getFieldValue('id'));
                SyncWMCustRecord.setFieldValue('custrecord_syncwmcust_nsid',CustRecord.getFieldValue('internalid'));
                nlapiSubmitRecord(SyncWMCustRecord, false, true);
                nlapiLogExecution('AUDIT','CALLSCHEDULEDSYNCWMCUSTOMER','Customer Record with Internal ID '+CustRecord.getFieldValue('id')+' already exists and has been updated.');
            } else {
                //Record does not exist, perform create actions
                /** Fields to add: Customer Group Key, Internal Sales Rep, External Sales Rep, Address Fields **/
                /** Fields to clarify: Customer No **/
                CustRecord = nlapiCreateRecord('customer');
                
                var targetCategory = SyncWMCustRecord.getFieldValue('custrecord_syncmcust_category');
                nlapiLogExecution("DEBUG", "LOADRECORD targetCategory", targetCategory);
                if(targetCategory)
                {
                    CustRecord.setFieldValue('category',targetCategory);
                }
                
                if(customerGroupID > 0) {CustRecord.setFieldValue('parent',customerGroupID);}
                
                
                CustRecord.setFieldValue('custentity_wmid',SyncWMCustRecord.getFieldValue('custrecord_syncwmcust_customerkey'));
                CustRecord.setFieldValue('externalid',SyncWMCustRecord.getFieldValue('custrecord_syncwmcust_accountno'));
                CustRecord.setFieldValue('companyname',SyncWMCustRecord.getFieldValue('custrecord_syncwmcust_name'));
                inputCurrency = SyncWMCustRecord.getFieldValue('custrecord_syncwmcust_currency');
                tempCurrency = (inputCurrency == "CAD" ? "1" : inputCurrency == "USD" ? "2" : inputCurrency == "GBP" ? "3" : inputCurrency == "EUR" ? "4" : "0");
                CustRecord.setFieldValue('currency',tempCurrency);
                tempBillByShipDate = SyncWMCustRecord.getFieldValue('custrecord_syncmcust_billbyshipdate');
                CustRecord.setFieldValue('custentity_billedbyshipdate',(tempBillByShipDate == 1 || tempBillByShipDate == '1') ? 'T' : 'F');
                CustRecord.setFieldValue('subsidiary','5');
                defaultReceivablesAcct = (tempCurrency == '2') ? '782' : '785'; //USD Customers to A/R 1203 IID 782, CAD Customers to A/R 1205 IID 785
                CustRecord.setFieldValue('receivablesaccount',defaultReceivablesAcct);
                CustRecord.selectNewLineItem('addressbook');
                CustRecord.setCurrentLineItemValue('addressbook','label',SyncWMCustRecord.getFieldValue('custrecord_syncwmcust_address'));
                tempCountry = SyncWMCustRecord.getFieldValue('custrecord_syncwmcust_country') == "CAN" ? "CA" : "US";
                CustRecord.setCurrentLineItemValue('addressbook','country',tempCountry);
                CustRecord.setCurrentLineItemValue('addressbook','addr1',SyncWMCustRecord.getFieldValue('custrecord_syncwmcust_address'));
                CustRecord.setCurrentLineItemValue('addressbook','city',SyncWMCustRecord.getFieldValue('custrecord_syncwmcust_city'));
                CustRecord.setCurrentLineItemValue('addressbook','state',SyncWMCustRecord.getFieldValue('custrecord_syncwmcust_stateprovince'));
                CustRecord.setCurrentLineItemValue('addressbook','zip',SyncWMCustRecord.getFieldValue('custrecord_syncwmcust_postalcode'));
                CustRecord.commitLineItem('addressbook');
                
                CustRecord.setFieldValue('taxitem',''); //Remove in Production
                
                
                //1.0.1 - TC10ROD
                for(synctable_fieldid in customerEmailMapping)
                {
                    SyncWMCustRecord_fieldValue = SyncWMCustRecord.getFieldValue(synctable_fieldid);
                    CustRecord.setFieldValue(customerEmailMapping[synctable_fieldid].customerfieldid, SyncWMCustRecord_fieldValue);
                }
                
                
                
                
                
                CustRecordID = nlapiSubmitRecord(CustRecord, false, true);
                
                SyncWMCustRecord.setFieldValue('custrecord_syncwmcust_syncstatus',4);
                SyncWMCustRecord.setFieldValue('custrecord_syncwmcust_errormsg','Created new record with Internal ID '+CustRecordID);
                SyncWMCustRecord.setFieldValue('custrecord_syncwmcust_nsid',CustRecordID);
              	//TC10ROD 12092020 - dosourcing false, ignore mandatory true, so it can bypass the mandatory emailfield1
                nlapiSubmitRecord(SyncWMCustRecord, false, true);
                nlapiLogExecution('AUDIT','CALLSCHEDULEDSYNCWMCUSTOMER','New Customer Record with Internal ID '+CustRecordID+' has been created.');
            }
        } else {
            //Record is inactive - currently ignoring but should mark actives as inactive.
            nlapiLogExecution('error','Inactive Customer','Customer Record is inactive - not currently processing as inactive');
            throw nlapiLogExecution('error','Not yet ready to handle inactive customers - this error should not occur.');
        }
    }
    catch(e){
        nlapiLogExecution('error','ScheduledSyncWMCustomer() has encountered an error.',errText(e));
        nlapiSubmitField('customrecord_syncwmcustomer',SyncWMCustID,'custrecord_syncwmcust_syncstatus',3); //Set SyncStatus = Error
        nlapiSubmitField('customrecord_syncwmcustomer',SyncWMCustID,'custrecord_syncwmcust_errormsg','Error Details: '+errText(e));
        tempRetries = nlapiLookupField('customrecord_syncwmcustomer',SyncWMCustID,'custrecord_syncwmcust_retries');
        nlapiSubmitField('customrecord_syncwmcustomer',SyncWMCustID,'custrecord_syncwmcust_retries',(tempRetries - 1));
    }
    findNextRecord();
}

function findNextRecord(){
        //Check for additional records to add to processing queue
        var filters = [
            ['custrecord_syncwmcust_syncstatus','anyof',[1,3,5]], 'AND',
            ['custrecord_syncwmcust_retries','greaterthan',0]
            ];
        
        var columns = [];
        columns[0] = new nlobjSearchColumn('internalid');
        
        var searchResults = nlapiSearchRecord('customrecord_syncwmcustomer',null,filters,columns);
        
        if(searchResults) {
            var nextSyncWMCustID = searchResults[0].getValue('internalid');
            nlapiLogExecution('AUDIT','CALLSCHEDULEDSYNCWMCUSTOMER','Additional records to sync found. Queueing '+nextSyncWMCustID);
            var newParams = {'custscript_syncwmcustid':nextSyncWMCustID};
            var ScheduleStatus = nlapiScheduleScript(script_id,null,newParams); //Deployment is empty so that script selects first available deployment
            if(ScheduleStatus == 'QUEUED') {
                nlapiSubmitField('customrecord_syncwmcustomer',nextSyncWMCustID,'   custrecord_syncwmcust_syncstatus','Queued');
            } //Else no available deployments - remaining records will be caught by periodic retry script
        } else {
            nlapiLogExecution('AUDIT','CALLSCHEDULEDSYNCWMCUSTOMER','No records to sync found.');
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

function getCustomerGroup(CustGroupKey, currency){
    //Find Customer Group
    /*
    var CustGrpFilters = [
        ['custrecord_syncwmcustgrp_custgrpkey','is',CustGroupKey]
    ];
    
    var CustGrpColumns = [];
    CustGrpColumns[0] = new nlobjSearchColumn('internalid');
    CustGrpColumns[1] = new nlobjSearchColumn('custrecord_syncwmcustgrp_custgrpcode');
    CustGrpColumns[2] = new nlobjSearchColumn('custrecord_syncwmcustgrp_extrxkey');
    
    var CustGrpResults = nlapiSearchRecord('customrecord_syncwmcustgroup',null,CustGrpFilters,CustGrpColumns);
    
    var currentID = 0;
    if(CustGrpResults) {
        currentKey = parseInt(CustGrpResults[0].getValue('custrecord_syncwmcustgrp_extrxkey'));
        currentID = CustGrpResults[0].getValue('custrecord_syncwmcustgrp_custgrpcode');
        for (k=0; k<CustGrpResults.length; k++) {
            if(parseInt(CustGrpResults[k].getValue('custrecord_syncwmcustgrp_extrxkey')) > parseInt(currentKey)){
                currentKey = parseInt(CustGrpResults[k].getValue('custrecord_syncwmcustgrp_extrxkey'));
                currentID = CustGrpResults[k].getValue('custrecord_syncwmcustgrp_custgrpcode');
            }
        }
    } else {
        throw nlapiCreateError('error','Unable to find Customer Group record for CustGroupKey '+CustGroupKey);
    }   
    */
    //directly use the CG customer group key to find customer record instead of relying on customergroup synctable - rod/mark 07272023
    //Find Parent Customer

    var currencyMapping = {
      CAD : 1,
      USD : 2
    }
    
    var filters = [
        ['custentity_wmid','is', 'CG' + CustGroupKey], 'AND',
        ['isinactive','is','F']
    ];
    if(currency && currencyMapping[currency])
    {
       nlapiLogExecution("DEBUG", "currencycode provided", currency);
       filters.push("AND");
       filters.push(["currency","anyof",currencyMapping[currency]]);
    }
    
    var columns = [];
    columns[0] = new nlobjSearchColumn('internalid');
    
    var searchResults = nlapiSearchRecord('customer',null,filters,columns);
    
    if(searchResults){
        if(searchResults.length = 1){
            return searchResults[0].getValue('internalid');
        } else {
            throw nlapiCreateError('error','Multiple Customers found for CustomerGroupKey '+CustGroupKey+' in getCustomerGroup function. Unable to resolve.');
        }
    } else {
        return 0;
    }
    throw nlapiCreateError('error','Unknown Error - reached end of function getCustomerGroup without returning a value');
}