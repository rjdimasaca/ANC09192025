/* @Scheduled Script on Manual Deployment

Processes SyncWMCreditMemo and SyncWMCreditMemoDetail Records
*/

var context = nlapiGetContext();
SyncWMID = context.getSetting('SCRIPT','custscript_syncwmcreditid');
var script_id = 466;
var cutoffDate = new Date(2018,6,1); //July 1st, 2018 - Cutoff date for new Credit Memos, earlier records should not be processed

//US INTERCOMPANY PRICE - 432.66 USD
//Units Ordered is volume in MT

function ScheduledSyncWMCredit(params){
	nlapiLogExecution('DEBUG','CALLSCHEDULEDSYNCWMCREDIT','SyncWMCredit Processing Started on Record '+SyncWMID);
	try{
		nlapiSubmitField('customrecord_syncwmcreditmemo',SyncWMID,'custrecord_syncwmcredit_syncstatus','2');
		
		SyncWMRecord = nlapiLoadRecord('customrecord_syncwmcreditmemo',SyncWMID);
		dateParts = SyncWMRecord.getFieldValue('custrecord_syncwmcreditmemo_dateinvoice').substring(0,10).split('-');
		tempDate = new Date(dateParts[0],dateParts[1]-1,dateParts[2]);
		
		if(tempDate >= cutoffDate) {
			//On or after July 1st, 2018 - process record
			
			var filters = [
				['internalid','noneof',[SyncWMID]], 'AND',
				['custrecord_syncwmcredit_wmid','contains',SyncWMRecord.getFieldValue('custrecord_syncwmcredit_wmid')], 'AND',
				['custrecord_syncwmcredit_syncstatus','noneof',[7]]
			];
			
			var columns = [];
			columns[0] = new nlobjSearchColumn('internalid');
			
			var searchResults = nlapiSearchRecord('customrecord_syncwmcreditmemo',null,filters,columns);
			
			if(searchResults) {
				//Matching sync records - record is a duplicate
				SyncWMRecord.setFieldValue('custrecord_syncwmcredit_syncstatus',7); //Set SyncStatus = Duplicate
				SyncWMRecord.setFieldValue('custrecord_syncwmcredit_errmsg','Duplicate Sync Record - Not Processed');
				SyncWMRecord.setFieldValue('isinactive','T');
				nlapiSubmitRecord(SyncWMRecord);
				nlapiLogExecution('AUDIT','CALLSCHEDULEDSYNCWMMEMO','Record identified as Duplicate, processing cancelled');
			} else {
				//No matching sync records - not a duplicate. Continue Processing.
				
				//Find all unprocessed header lines for current order
				var filters = [
					['custrecord_syncwmcreditmemo_headerkey','is',SyncWMRecord.getFieldValue('custrecord_syncwmcreditmemo_headerkey')], 'AND',
					['custrecord_syncwmcredit_syncstatus','anyof',[1,2,3,5]], 'AND',
					['custrecord_syncwmcreditmemo_retries','greaterthan',0]
				]; //Needed to add 2 to syncstatus to include current record in processing state

				var columns = [];
				columns[0] = new nlobjSearchColumn('internalid');
				columns[1] = new nlobjSearchColumn('custrecord_syncwmcreditmemo_exchtxkey');
				columns[2] = new nlobjSearchColumn('custrecord_syncwmcreditmemo_headerkey');
				//columns[3] = new nlobjSearchColumn('');
				//columns[4] = new nlobjSearchColumn('');
				//columns[5] = new nlobjSearchColumn('');
				//columns[6] = new nlobjSearchColumn('');

				var searchResults = nlapiSearchRecord('customrecord_syncwmcreditmemo',null,filters,columns);
				
				//Find all detail lines for current order
				var filters = [
					['custrecord_syncwmcrdmdet_memoheaderkey','is',SyncWMRecord.getFieldValue('custrecord_syncwmcreditmemo_headerkey')]
				];
				
				var columns = [];
				columns[0] = new nlobjSearchColumn('internalid');
				//columns[1] = new nlobjSearchColumn('');
				//columns[2] = new nlobjSearchColumn('');
				
				var searchLineResults = nlapiSearchRecord('customrecord_syncwmcrdmemodetail',null,filters,columns);
				
				/** NEED TO PROCESS ONLY LAST EXCHTXKEY OF HEADER AND LAST EXCHTXKEY PER ORDERITEMKEY **/
				
				if(searchLineResults && searchResults) {
					//Detail lines found, create/update order using only LAST header line and LAST of each detail line
					var HeadMax = -1;
					var HeadIndex = -1;
					var LineObj = {};
					var LineIdObj = {};
					
					for(ho=0; ho<searchResults.length; ho++) {
						ExTxKey = searchResults[ho].getValue('custrecord_syncwmcreditmemo_exchtxkey');
						if (ExTxKey > HeadMax) {
							HeadMax = ExTxKey;
							HeadIndex = ho;
						}
					}
					for(Lo=0; Lo<searchLineResults.length; Lo++) {
						LineKey = searchLineResults[Lo].getValue('custrecord_syncwmcrdmdet_memodetailkey');
						ExLineKey = searchLineResults[Lo].getValue('custrecord_syncwmcrdmdet_exchtxkey');
						tempID = 'id' + LineKey;
						if (LineKey in LineObj) {
							if (ExLineKey > LineObj.LineKey) {
								LineObj.LineKey = ExLineKey;
								LineIdObj[tempID] = Lo;
							} //Else line definition is old and should be ignored
						} else {
							LineObj.LineKey = ExLineKey;
							LineIdObj[tempID] = Lo;
						}
					}
					
					//Check if Credit Memo Exists
					var filters = [
						['custbody_wmid','is',SyncWMRecord.getFieldValue('custrecord_syncwmcreditmemo_headerkey')], 'AND',
						['subsidiary','is','5']
					];
					var columns = [];
					columns[0] = new nlobjSearchColumn('internalid');
					var searchMemo = nlapiSearchRecord('creditmemo',null,filters,columns);
					
					
					var successText = 'Error updating SuccessText - please verify in script. ---';
					var ValidCustomer = 0;
					if (searchMemo) {
						//Update Credit Memo
						Record = nlapiLoadRecord('creditmemo',searchMemo[0].getValue('internalid'));
						ValidCustomer = validateCustomer(SyncWMRecord.getFieldValue('custrecord_syncwmcreditmemo_customerkey'));
						totalLines = Record.getLineItemCount('item');
						if(totalLines > 0){
							for (n=totalLines; n>0; n--) { Record.removeLineItem('item',n); }
						} else {
							throw nlapiCreateError('error','Credit Memo Record exists but unable to get number of lines to remove lines - update cancelled');
						}
						successText = 'Updated Credit Memo record with Internal ID ';
					} else {
						//Create New Credit Memo in Subsidiary 5
						Record = nlapiCreateRecord('creditmemo');
						ValidCustomer = validateCustomer(SyncWMRecord.getFieldValue('custrecord_syncwmcreditmemo_customerkey'));
						Record.setFieldValue('entity',ValidCustomer);
						Record.setFieldValue('subsidiary','5');
						successText = 'Created Credit Memo record with Internal ID ';
					}
						
						
					Record.setFieldValue('location','9');
					//tempAccount = (SyncWMRecord.getFieldValue('custrecord_syncwmcreditmemo_currency') == 'USD' ? '282' : '283'); //USD = 1207, CAD = 1208
					tempAccount = (SyncWMRecord.getFieldValue('custrecord_syncwmcreditmemo_currency') == 'USD' ? '782' : '785'); //USD = 1203, CAD = 1205
					Record.setFieldValue('trandate',nlapiDateToString(tempDate,'date'));
					Record.setFieldValue('account',tempAccount);
					Record.setFieldValue('memo','Create from WM Credit Memo No '+SyncWMRecord.getFieldValue('custrecord_syncwmcreditmemo_memono'));
					//Record.setFieldValue('',SyncWMRecord.getFieldValue('custrecord_syncwmcreditmemo_currency'));
					Record.setFieldValue('otherrefnum',SyncWMRecord.getFieldValue('custrecord_syncwmcreditmemo_referenceno'));
					Record.setFieldValue('custbody_wmid',searchResults[HeadIndex].getValue('custrecord_syncwmcreditmemo_headerkey'));
					tempBOL = validateBOL(SyncWMRecord.getFieldValue('custrecord_syncwmcrdmemo_loadheaderkey'));
					Record.setFieldValue('custbody4',tempBOL);
					ValidConsignee = validateConsignee(SyncWMRecord.getFieldValue('custrecord_syncwmcreditmemo_consigneekey'),ValidCustomer);
					Record.setFieldValue('custbody_consignee',ValidConsignee);
					
					var ctLines = 0;
					for (var LineId in LineIdObj) {
						if(LineIdObj[LineId] != "undefined") {
							LineRec = nlapiLoadRecord('customrecord_syncwmcrdmemodetail',searchLineResults[LineIdObj[LineId]].getValue('internalid'));
							
							//nlapiLogExecution('debug','Check Line Item Values','Grade Key: '+LineRec.getFieldValue('custrecord_syncwmorditem_gradekey')+' validated item: '+getSalesItem('ZZZZ'+LineRec.getFieldValue('custrecord_syncwmorditem_gradekey'))+' Quantity: '+LineRec.getFieldValue('custrecord_syncwmorditem_unitsordered'));
							
							//Add item if non-zero amount
							if(LineRec.getFieldValue('custrecord_syncwmcrdmdet_amount') != 0) {
								Record.selectNewLineItem('item');
								//tempSalesItem = getSalesItem('ZZZZ'+LineRec.getFieldValue('custrecord_syncwmorditem_gradekey'));
								//Record.setCurrentLineItemValue('item','item',tempSalesItem);
								Record.setCurrentLineItemValue('item','item','12490'); //Currently Hardcoded to Claims - Paper
								Record.setCurrentLineItemValue('item','quantity',1);
								//tempIntercoPrice = nlapiLookupField('noninventoryitem',tempSalesItem,'costestimate');
								tempLineAmount = 0 - LineRec.getFieldValue('custrecord_syncwmcrdmdet_amount');
								Record.setCurrentLineItemValue('item','rate',tempLineAmount);
								Record.setCurrentLineItemValue('item','amount',tempLineAmount);
								Record.commitLineItem('item');
								ctLines++;
							}
						}
					}
						
					if(ctLines > 0) {
						RecordID = nlapiSubmitRecord(Record);
						
						//Currently assuming all header lines succeed - need to improve this logic per-item
						for (n = 0; n<searchResults.length; n++) {
							nlapiSubmitField('customrecord_syncwmcreditmemo',searchResults[n].getValue('internalid'),'custrecord_syncwmcredit_syncstatus',4);
							nlapiSubmitField('customrecord_syncwmcreditmemo',searchResults[n].getValue('internalid'),'custrecord_syncwmcredit_errmsg',successText+RecordID+' in Subsidiary 5. ');
							nlapiSubmitField('customrecord_syncwmcreditmemo',searchResults[n].getValue('internalid'),'custrecord_syncwmcredit_nsid','Sub1-SO: '+RecordID);
						}
						
						//nlapiLogExecution('AUDIT','CALLSCHEDULEDSYNCWMLOAD','Sales Order record with Internal ID '+RecordID+' has been created in subsidiary 1.');
					} else {
						//nlapiLogExecution('AUDIT','SYNCWMLOAD TEST17','');
						throw nlapiCreateError('error','No valid credit lines were added - credit memo creation has been cancelled');
					}
				} else if (searchResults) {
					//No detail lines found, mark header lines with error
					for(x=0; x<searchResults.length; x++) {
						nlapiSubmitField('customrecord_syncwmcreditmemo',searchResults[x].getValue('internalid'),'custrecord_syncwmcredit_syncstatus',3);
						nlapiSubmitField('customrecord_syncwmcreditmemo',searchResults[x].getValue('internalid'),'custrecord_syncwmcredit_errmsg','ERROR: No Detail Lines found for CreditMemoHeaderKey '+searchResults[x].getValue(''));
						nlapiSubmitField('customrecord_syncwmcreditmemo',searchResults[x].getValue('internalid'),'custrecord_syncwmcreditmemo_retries',searchResults[x].getValue('retries')-1);
						nlapiLogExecution('AUDIT','CALLSCHEDULEDSYNCWMCREDITMEMO','SyncWMCreditMemo with Internal ID '+searchResults[x].getValue('internalid')+' has no detail lines and has not been created.');
					}
				} else {
					throw nlapiCreateError('error','No header lines found - issue with search parameters');
				}
			}
		} else {
			//Credit Memo is before July 1st, 2018 and should be ignored
			nlapiSubmitField('customrecord_syncwmcreditmemo',SyncWMID,'custrecord_syncwmcredit_syncstatus',4);
			nlapiSubmitField('customrecord_syncwmcreditmemo',SyncWMID,'custrecord_syncwmcredit_errmsg','Credit Memo date is before July 1st, 2018. Record will not be processed.');
		}
	}
	catch(e){
		//nlapiLogExecution('AUDIT','SYNCWMLOAD TEST24','');
        nlapiLogExecution('error','ScheduledSyncWMCreditMemo() has encountered an error.',errText(e));
		nlapiSubmitField('customrecord_syncwmcreditmemo',SyncWMID,'custrecord_syncwmcredit_syncstatus','3'); //Set SyncStatus = Error
		nlapiSubmitField('customrecord_syncwmcreditmemo',SyncWMID,'custrecord_syncwmcredit_errmsg','Error Details: '+errText(e));
		tempRetries = nlapiLookupField('customrecord_syncwmcreditmemo',SyncWMID,'custrecord_syncwmcreditmemo_retries');
		nlapiSubmitField('customrecord_syncwmcreditmemo',SyncWMID,'custrecord_syncwmcreditmemo_retries',(tempRetries - 1));
		nlapiLogExecution('debug','CALLSCHEDULESYNCWMCREDITMEMO','ScheduledSyncWMOrderHeader has been updated with '+(tempRetries - 1)+' retries.');
    }
	//nlapiLogExecution('AUDIT','SYNCWMLOAD TEST3','');
	findNextRecord();
}

/** RESUME HERE **/

function findNextRecord(){
		//Check for additional records to add to processing queue
		var filters = [
			['custrecord_syncwmcredit_syncstatus','anyof',[1,3,5]], 'AND',
			['custrecord_syncwmcreditmemo_retries','greaterthan',0]
			];
		
		var columns = [];
		columns[0] = new nlobjSearchColumn('internalid');
		
		var searchResults = nlapiSearchRecord('customrecord_syncwmcreditmemo',null,filters,columns);
		
		if(searchResults) {
			var nextSyncWMID = searchResults[0].getValue('internalid');
			nlapiLogExecution('AUDIT','CALLSCHEDULEDSYNCWMCREDITMEMO','Additional records to sync found. Queueing '+nextSyncWMID);
			var newParams = {'custscript_syncwmcreditid':nextSyncWMID};
			var ScheduleStatus = nlapiScheduleScript(script_id,null,newParams); //Deployment is empty so that script selects first available deployment
			if(ScheduleStatus == 'QUEUED') {
				nlapiSubmitField('customrecord_syncwmcreditmemo',nextSyncWMID,'custrecord_syncwmcredit_syncstatus','6');
			} //Else no available deployments - remaining records will be caught by periodic retry script
		} else {
			nlapiLogExecution('AUDIT','CALLSCHEDULEDSYNCWMCREDITMEMO','No records to sync found.');
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

function validateItem(aggKey) {
	var quality = aggKey.substring(0,4);
	var prodGrade = aggKey.substring(4);
	if(prodGrade == null || prodGrade == '' || quality == null || quality == '') {
		return ''; /**Should return EMPTY**/
	} else if (quality == 'SALE'){ //PRIME quality items
		/** SHOULD SEARCH ITEMS AND BUILD UP A DICTIONARY **/
		switch(prodGrade) {
			case '17': return '12137'; //'NPO59ST';
			case '19': return '12139'; //'NPT59ST'
			case '23': return '12136'; //'NPL59ST';
			case '28': return '12135'; //'NPA59ST';
			case '30': return '12135'; //'HBT65ST';
			case '31': return '12131'; //'HBT65RO';
			case '34': return '12134'; //'HBT70ST';
			case '35': return '12133'; //'HBT70RO';
			case '36': return '12130'; //'HBO65ST';
			case '37': return 'error'; //'HBO65RO'; /**Should return ERROR**/
			case '38': return '12138'; //'NPT59RO';
			case '40': return 'error'; //'NPL59RO'; /**Should return ERROR**/
			case '41': return 'error'; //'HBL63ST'; /**Should return ERROR**/
			case '42': return '12311'; //'HBL63RO';
			case '48': return '58549'; //LNY56ST
			case '49': return '58550'; //LNY56RO
			case '50': return '58548'; //LNZ56ST
		}
	} else if (quality == 'CULL') { //OFFGRADE quality items
		/** SHOULD SEARCH ITEMS AND BUILD UP A DICTIONARY **/
		switch(prodGrade) {
			case '17': return '12146'; //'NPO59ST';
			case '19': return '12148'; //'NPT59ST'
			case '23': return '12145'; //'NPL59ST';
			case '28': return '12144'; //'NPA59ST';
			case '30': return '12141'; //'HBT65ST';
			case '31': return '12140'; //'HBT65RO';
			case '34': return '12143'; //'HBT70ST';
			case '35': return '12142'; //'HBT70RO';
			case '36': return '12149'; //'HBO65ST';
			case '37': return 'error'; //'HBO65RO'; /**Should return ERROR**/
			case '38': return '12147'; //'NPT59RO';
			case '40': return 'error'; //'NPL59RO'; /**Should return ERROR**/
			case '41': return 'error'; //'HBL63ST'; /**Should return ERROR**/
			case '42': return '12312'; //'HBL63RO';
			case '48': return '58553'; //LNY56ST
			case '49': return '58555'; //LNY56RO
			case '50': return '58551'; //LNZ56ST
		}
	} else if (quality == 'BEAT') { //BEATER quality items
		/** SHOULD SEARCH ITEMS AND BUILD UP A DICTIONARY **/
		switch(prodGrade) {
			case '17': return '12157'; //'NPO59ST';
			case '19': return '12159'; //'NPT59ST'
			case '23': return '12156'; //'NPL59ST';
			case '28': return '12155'; //'NPA59ST';
			case '30': return '12152'; //'HBT65ST';
			case '31': return '12151'; //'HBT65RO';
			case '34': return '12154'; //'HBT70ST';
			case '35': return '12153'; //'HBT70RO';
			case '36': return '12150'; //'HBO65ST';
			case '37': return 'error'; //'HBO65RO'; /**Should return ERROR**/
			case '38': return '12158'; //'NPT59RO';
			case '40': return 'error'; //'NPL59RO'; /**Should return ERROR**/
			case '41': return 'error'; //'HBL63ST'; /**Should return ERROR**/
			case '42': return 'error'; //'HBL63RO'; /**Should return ERROR**/
			case '48': return '58554'; //LNY56ST
			case '49': return '58556'; //LNY56RO
			case '50': return '58552'; //LNZ56ST
		}
	} else if (quality == 'HELD') { return '12285'; } //Held Inventory
	return 'error'; /**Should return ERROR**/
}

function getSalesItem(aggKey) {
	var quality = aggKey.substring(0,4);
	var prodGrade = aggKey.substring(4);
	if(prodGrade == null || prodGrade == '') {
		return ''; /**Should return EMPTY**/
	} else { //Always use PRIME quality items
		switch(prodGrade) {
			case '17': return '142'; //'NPO59ST';
			case '19': return '144'; //'NPT59ST';
			case '23': return '141'; //'NPL59ST';
			case '28': return '140'; //'NPA59ST';
			case '30': return '137'; //'HBT65ST';
			case '31': return '136'; //'HBT65RO';
			case '34': return '139'; //'HBT70ST';
			case '35': return '138'; //'HBT70RO';
			case '36': return '135'; //'HBO65ST';
			case '37': return 'error'; //'HBO65RO'; /**Should return ERROR**/
			case '38': return '143'; //'NPT59RO';
			case '40': return '12309'; //'NPL59RO';
			case '41': return '12307'; //'HBL63ST';
			case '42': return '12311'; //'HBL63RO';
			case '48': return '58562'; //LNY56ST
			case '49': return '58565'; //LNY56RO
			case '50': return '58557'; //LNZ56ST
		}
	}
	return 'error'; /**Should return ERROR**/
}

function validateCustomer(customerKey) {
	if (customerKey == '' || customerKey == null) {
		//return '';
		
	} else {
		var filters = [['custentity_wmid','is',customerKey]];
		var columns = [];
		columns[0] = new nlobjSearchColumn('internalid');
		var searchCustomers = nlapiSearchRecord('customer',null,filters,columns);
		if (searchCustomers) {
			return searchCustomers[0].getValue('internalid');
		} else {
			throw nlapiCreateError('error','Customer Key match not found in NetSuite. Unable to process record.');
		}
	}
}

function validateConsignee(consigneeKey,CustKey) {
	//Check if Consignee Exists
	var filters = [['custrecord_alberta_ns_consigneekey','is',consigneeKey]];
	var columns = [];
	columns[0] = new nlobjSearchColumn('internalid');
	var searchConsignees = nlapiSearchRecord('customrecord_alberta_ns_consignee_record',null,filters,columns);
	if (searchConsignees) {
		//ConsKey = searchConsignees[0].getValue('internalid');
		
		//Check if Consignee already connected to Customer
		var CustConsID = -1;
		for(n=0; n<searchConsignees.length; n++) {
			if(searchConsignees[n].getValue('custrecord_alberta_ns_customer') == CustKey) {CustConsID = searchConsignees[n].getValue('internalid');}
		}
		
		var CurrentRec = nlapiLoadRecord('customrecord_alberta_ns_consignee_record',searchConsignees[0].getValue('internalid'));
		if(CustConsID == -1) {
			//Consignee/Customet combination must be created
			NewRec = nlapiCreateRecord('customrecord_alberta_ns_consignee_record');
			NewRec.setFieldValue('custrecord_alberta_ns_ship_address',CurrentRec.getFieldValue('custrecord_alberta_ns_ship_address'));
			NewRec.setFieldValue('custrecord_alberta_ns_consigneekey',CurrentRec.getFieldValue('custrecord_alberta_ns_consigneekey'));
			NewRec.setFieldValue('custrecord_alberta_ns_ship_addrprovince',CurrentRec.getFieldValue('custrecord_alberta_ns_ship_addrprovince'));
			NewRec.setFieldValue('custrecord_alberta_ns_contact',CurrentRec.getFieldValue('custrecord_alberta_ns_contact'));
			NewRec.setFieldValue('custrecord_alberta_ns_consigneeno',CurrentRec.getFieldValue('custrecord_alberta_ns_consigneeno'));
			NewRec.setFieldValue('name',CurrentRec.getFieldValue('name'));
			NewRec.setFieldValue('custrecord_alberta_ns_customer',CustKey);
			NewRecID = nlapiSubmitRecord(NewRec);
			
			nlapiLogExecution('AUDIT','CALLSCHEDULEDSYNCWMLOAD','Consignee record with Internal ID '+NewRecID+' has been created.');
			return NewRecID;
		} else {
			//Consignee/Customer combination exists
			nlapiLogExecution('AUDIT','CALLSCHEDULEDSYNCWMLOAD','Consignee record with Internal ID '+CustConsID+' already exists.');
			return CustConsID;
		}
	} else { 
		throw nlapiCreateError('error','No Consignee Found with matching WM ID (Consignee Key) for '+consigneeKey);
	}
}

function validateConsigneePrice(salesItem,ValidCustomer,ValidConsignee,tranDate) {
	//var externalItemID = nlapiLookupField('noninventoryitem',tempExternalItem,'custitem_wmsalesitem');
	var lookupMonths = ['jan','feb','march','april','may','june','july','august','sep','oct','nov','dec'];
	var tranYear = tranDate.getFullYear();
	var tranMonth = lookupMonths[tranDate.getMonth()];
	var monthField = 'custrecord_alberta_ns_month_'+tranMonth;
	if (salesItem == '' || salesItem == null) { throw nlapiCreateError('error','WM Sales Item value is missing on non-inventory item '+salesItem+', unable to get line pricing.'); }
	var filters = [];
	if(ValidConsignee == '' || ValidConsignee == null) {
		if (ValidCustomer == '' || ValidConsignee == null) { throw nlapiCreateError('error','Customer and Consignee Key are both missing, unable to get line pricing'); }
		//Search on just Customer
		filters = [
			['custrecord_alberta_ns_item_pricing_year','is',tranYear], 'AND',
			['custrecord_albert_ns_item_price_customer','is',ValidCustomer], 'AND',
			['custrecord_alberta_ns_item','is',salesItem]
		];
	} else if (ValidCustomer == '' || ValidConsignee == null) {
		//Unable to search on Just Consignee
		throw nlapiCreateError('error','Customer Key is missing, unable to get line item pricing');
	} else {
		//Search on Customer and Consignee
		filters = [
			['custrecord_alberta_ns_item_pricing_year','is',tranYear], 'AND',
			['custrecord_albert_ns_item_price_customer','is',ValidCustomer], 'AND',
			['custrecord_albert_ns_item_price_consigne','is',ValidConsignee], 'AND',
			['custrecord_alberta_ns_item','is',salesItem]
		];
	}
	var columns = [];
	columns[0] = new nlobjSearchColumn('internalid');
	columns[1] = new nlobjSearchColumn(monthField);
	var searchPrices = nlapiSearchRecord('customrecord_alberta_ns_pricing_list',null,filters,columns);
	
	if(searchPrices) {
		return searchPrices[0].getValue(monthField);
	} else {
		throw nlapiCreateError('error','Price Search unable to find line item pricing for Item: '+salesItem+' Customer: '+ValidCustomer+' Consignee: '+ValidConsignee);
	}
}
 
function validateBOL(LoadHeaderKey) {
	var loadFilters = [['custrecord_syncwmloadhead_loadheadkey','is',LoadHeaderKey]];
	
	var loadColumns = [];
	loadColumns[0] = new nlobjSearchColumn('internalid');
	loadColumns[1] = new nlobjSearchColumn('custrecord_syncwmloadhead_loadno');

	var loadResults = nlapiSearchRecord('customrecord_syncwmloadheader',null,loadFilters,loadColumns);

	if(loadResults) {
		return loadResults[0].getValue('custrecord_syncwmloadhead_loadno');
	} else {
		return 'Unable to find Load Header or BOL Number';
	}
}
 
 
									