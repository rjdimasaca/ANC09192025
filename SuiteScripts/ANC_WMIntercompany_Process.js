/* @Scheduled Script run Daily to find and prepare records

Will identify records for reprocessing, for new process orchestration, and queue initial record
*/

var context = nlapiGetContext();
var script_id = '561';
//var cutoffDate = new Date(2019,0,1); //January first - don't process earlier invoices

function ScheduledSearchBatches(type,form) {
	nlapiLogExecution('DEBUG', 'ScheduledSearchInvoices', 'SyncWMIntercompany Processing Started');
	var filters = [
		['custrecord_syncwminterco_syncstatus', 'anyof', [1, 3, 5]], 'AND',
		//['custrecord_syncwminterco_currency', 'is', '1'], 'AND',
		['custrecord_syncwminterco_retries', 'greaterthan', 0]
	];
	var columns = [];
	columns[0] = new nlobjSearchColumn('internalid');
	columns[1] = new nlobjSearchColumn('custrecord_syncwminterco_invoices');
	var searchBatchesToProcess = nlapiSearchRecord('customrecord_syncwmintercompanybatch',null,filters,columns);
	
	if(searchBatchesToProcess) {
		BatchID = searchBatchesToProcess[0].getValue('internalid');
		
		try {
			InvoiceList = JSON.parse(searchBatchesToProcess[0].getValue('custrecord_syncwminterco_invoices'));
			Currency = searchBatchesToProcess[0].getValue('custrecord_syncwminterco_currency');
			nlapiSubmitField('customrecord_syncwmintercompanybatch', BatchID, 'custrecord_syncwminterco_syncstatus', '2');
			createIntercoJournal(InvoiceList,BatchID,Currency);
		} catch (e) {
			nlapiSubmitField('customrecord_syncwmintercompanybatch', BatchID, 'custrecord_syncwminterco_syncstatus', '3'); //Set SyncStatus = Error
			nlapiSubmitField('customrecord_syncwmintercompanybatch', BatchID, 'custrecord_syncwminterco_errormessage', 'Error Details: ' + errText(e));
			tempRetries = nlapiLookupField('customrecord_syncwmintercompanybatch', BatchID, 'custrecord_syncwminterco_retries');
			nlapiSubmitField('customrecord_syncwmintercompanybatch', BatchID, 'custrecord_syncwminterco_retries', (tempRetries - 1));
		}
	} else {
		nlapiLogExecution('DEBUG','No Batches Found to Process','');
	}
	
	findNextRecord();

	nlapiLogExecution('DEBUG', 'ScheduledSearchInvoices', 'End of SyncWMIntercompany Processing');
}

function findNextRecord() {
	//Check for additional records to add to processing queue
	var filters = [
		['custrecord_syncwminterco_syncstatus', 'anyof', [1, 3, 5]], 'AND',
		['custrecord_syncwminterco_retries', 'greaterthan', 0]
	];

	var columns = [];
	columns[0] = new nlobjSearchColumn('internalid');

	var searchResults = nlapiSearchRecord('customrecord_syncwmintercompanybatch', null, filters, columns);

	if (searchResults) {
		//var nextSyncWMID = searchResults[0].getValue('internalid');
		nlapiLogExecution('AUDIT', 'CALLSCHEDULEDSYNCWMINTERCO', 'Additional records to sync found.');
		//var newParams = {'custscript_syncwmloadid': nextSyncWMID};
		//var ScheduleStatus = nlapiScheduleScript(script_id, null); //Deployment is empty so that script selects first available deployment
		var ScheduleStatus = nlapiScheduleScript(nlapiGetContext().getScriptId(), null);
		if (ScheduleStatus == 'QUEUED') {
			nlapiLogExecution('AUDIT','CALLSCHEDULEDSYNCWMINTERCO', 'Script Scheduled with Status '+ScheduleStatus);
		} else {
			nlapiLogExecution('AUDIT','CALLSCHEDULEDSYNCWMINTERCO', 'Script Not Scheduled with Status '+ScheduleStatus);
		}
	} else {
		nlapiLogExecution('AUDIT', 'CALLSCHEDULEDSYNCWMINTERCO', 'No records to sync found.');
	}
	nlapiLogExecution('AUDIT','CALLSCHEDULEDSYNCWMINTERCO','End of findNextRecord()');
}

function errText(_e) {

	_internalId = nlapiGetRecordId();
	if (!(typeof _internalId === 'number' && (_internalId % 1) === 0)) {
		_internalId = 0;
	}

	var txt = '';
	if (_e instanceof nlobjError) {
		//this is netsuite specific error
		txt = 'NLAPI Error: Record ID :: ' + _internalId + ' :: ' + _e.getCode() + ' :: ' + _e.getDetails() + ' :: '; //+ _e.getStackTrace().join(', ');
	} else {
		//this is generic javascript error
		txt = 'JavaScript/Other Error: Record ID :: ' + _internalId + ' :: ' + _e.toString() + ' : ' + _e.stack;
	}
	return txt;
}

function createIntercoJournal(IPresults,BatchID,Currency) {
	
	//return {'value':'TestSuccess'};
	
	if(IPresults) {
		journalLines = {};
		var InvoiceDate = '';
		for(var n=0; n<IPresults.length; n++) {
			var filters = [
				['internalid','is',IPresults[n]], 'AND',
				['taxline','is','F'], 'AND',
				['mainline','is','F']
			];
			var columns = [];
			columns[0] = new nlobjSearchColumn('internalid');
			columns[1] = new nlobjSearchColumn('trandate')
			columns[2] = new nlobjSearchColumn('item');
			columns[3] = new nlobjSearchColumn('grossamount');
			var searchInvoiceLines = nlapiSearchRecord('invoice',null,filters,columns);
			
			InvoiceRecord = searchInvoiceLines[0].getValue('internalid');
			InvoiceDate = searchInvoiceLines[0].getValue('trandate')
			
			for(var i=0; i<searchInvoiceLines.length; i++) {
				Item = searchInvoiceLines[i].getValue('item');
				Amount = searchInvoiceLines[i].getValue('grossamount')*1;
				
				//console.log('Invoice: '+InvoiceRecord+' Item: '+Item+' Amount: '+Amount);
				
				if( Item in journalLines ) {
					//Update Object Values
					currAmount = journalLines[Item]['amount'];
					journalLines[Item]['amount'] = 0 + currAmount*1 + Amount*1;
				} else {
					//Add Object Values
					Account = nlapiLookupField('noninventoryitem',Item,'intercoincomeaccount');
					ExpAccount = nlapiLookupField('noninventoryitem',Item,'intercoexpenseaccount');
					
					journalLines[Item] = {
						'itemID':Item,
						'amount':Amount,
						'account':Account,
						'expaccount':ExpAccount
					};
				}
			}
		}
		
		//return journalLines;
		
		nlapiLogExecution('DEBUG', 'ScheduledSearchInvoices', 'journalLines Object: ' + JSON.stringify(journalLines));
		
		//currency = nlapiLookupField('customrecord_syncwmintercompanybatch', BatchID,'custrecord_syncwminterco_currency');
		
		JERecord = nlapiCreateRecord('advintercompanyjournalentry');
		JERecord.setFieldValue('customform','157'); //ANC - Journal Entry
		JERecord.setFieldValue('subsidiary','1'); //Alberta Newsprint Company
		JERecord.setFieldValue('currency','1'); //CAD
		JERecord.setFieldValue('approved','F');
		JERecord.setFieldValue('trandate',InvoiceDate);
		JERecord.setFieldValue('memo','WM Intercompany Journal');
		
		//Create JE Item Cost Lines
		var costOffset = 0;
		for (var Item in journalLines) {
			nlapiLogExecution('DEBUG', 'Test Values', 'journalLines[Item]: '+JSON.stringify(journalLines[Item]));
			JERecord.selectNewLineItem('line');
			JERecord.setCurrentLineItemValue('line','linesubsidiary','1');
			JERecord.setCurrentLineItemValue('line','account',journalLines[Item]['account']);
			JERecord.setCurrentLineItemValue('line','credit',parseFloat(journalLines[Item]['amount']).toFixed(2));
			nlapiLogExecution('DEBUG','Audit Amounts - 1',parseFloat(journalLines[Item]['amount']).toFixed(2));
			JERecord.setCurrentLineItemValue('line','eliminate','F');
			JERecord.setCurrentLineItemValue('line','memo','WM Intercompany Journal');
			JERecord.commitLineItem('line');
			costOffset = costOffset*1 + journalLines[Item]['amount']*1;
		}
		
		nlapiLogExecution('DEBUG','AAAA','AAAA');
		
		//Offset Cost Lines
		JERecord.selectNewLineItem('line');
		JERecord.setCurrentLineItemValue('line','linesubsidiary','1');
		JERecord.setCurrentLineItemValue('line','account','1972');
		JERecord.setCurrentLineItemValue('line','debit',parseFloat(costOffset).toFixed(2));
		JERecord.setCurrentLineItemValue('line','duetofromsubsidiary','5');
		JERecord.setCurrentLineItemValue('line','entity','9622'); //ANS (Sales)
		JERecord.setCurrentLineItemValue('line','eliminate','T');
		JERecord.setCurrentLineItemValue('line','memo','WM Intercompany Journal');
		nlapiLogExecution('DEBUG','Audit Amounts - 2',parseFloat(costOffset).toFixed(2));
		JERecord.commitLineItem('line');
		
		//Add Commission Line
		nlapiLogExecution('DEBUG','costOffset','type: '+ typeof costOffset+' value: '+costOffset);
		commission = parseFloat(costOffset * 0.0225).toFixed(2);
		commissionGST = parseFloat(commission * 0.05).toFixed(2);
		nlapiLogExecution('DEBUG','commission','type: '+ typeof commission+' value: '+commission);
		nlapiLogExecution('DEBUG','commissionGST','type: '+ typeof commissionGST+' value: '+commissionGST);
		JERecord.selectNewLineItem('line');
		JERecord.setCurrentLineItemValue('line','linesubsidiary','1');
		JERecord.setCurrentLineItemValue('line','account','3860'); //Commission
		JERecord.setCurrentLineItemValue('line','debit',commission);
		nlapiLogExecution('DEBUG','Audit Amounts - 3',commission);
		JERecord.setCurrentLineItemValue('line','eliminate','F');
		JERecord.setCurrentLineItemValue('line','memo','WM Intercompany Journal');
		JERecord.commitLineItem('line');
		
		JERecord.selectNewLineItem('line');
		JERecord.setCurrentLineItemValue('line','linesubsidiary','1');
		JERecord.setCurrentLineItemValue('line','account','109'); //GST AB
		JERecord.setCurrentLineItemValue('line','debit',commissionGST);
		nlapiLogExecution('DEBUG','Audit Amounts - 4',commissionGST);
		JERecord.setCurrentLineItemValue('line','eliminate','F');
		JERecord.setCurrentLineItemValue('line','memo','WM Intercompany Journal');
		JERecord.commitLineItem('line');
		
		//Offset Commission Line
		commissionOffset = parseFloat(0 + commission*1 + commissionGST*1).toFixed(2);
		JERecord.selectNewLineItem('line');
		JERecord.setCurrentLineItemValue('line','linesubsidiary','1');
		JERecord.setCurrentLineItemValue('line','account','1972');
		JERecord.setCurrentLineItemValue('line','credit',commissionOffset);
		nlapiLogExecution('DEBUG','Audit Amounts - 5',commissionOffset);
		JERecord.setCurrentLineItemValue('line','duetofromsubsidiary','5');
		JERecord.setCurrentLineItemValue('line','entity','9622'); //ANS (Sales)
		JERecord.setCurrentLineItemValue('line','eliminate','T');
		JERecord.setCurrentLineItemValue('line','memo','WM Intercompany Journal');
		JERecord.commitLineItem('line');
		
		nlapiLogExecution('DEBUG','BBBB','BBBB');
		
		/** second half **/
		
		//Create JE Item Sale Lines
		var saleOffset = 0; 	
		for (var Item in journalLines) {
			JERecord.selectNewLineItem('line');
			JERecord.setCurrentLineItemValue('line','linesubsidiary','5');
			JERecord.setCurrentLineItemValue('line','account',journalLines[Item]['expaccount']);
			JERecord.setCurrentLineItemValue('line','debit',parseFloat(journalLines[Item]['amount']).toFixed(2));
			JERecord.setCurrentLineItemValue('line','eliminate','F');
			JERecord.setCurrentLineItemValue('line','memo','WM Intercompany Journal');
			nlapiLogExecution('DEBUG','Audit Amounts - 6',parseFloat(journalLines[Item]['amount']).toFixed(2));
			JERecord.commitLineItem('line');
			saleOffset = saleOffset*1 + journalLines[Item]['amount']*1;
		}
		
		//Offset Cost Lines
		JERecord.selectNewLineItem('line');
		JERecord.setCurrentLineItemValue('line','linesubsidiary','5');
		JERecord.setCurrentLineItemValue('line','account','1973');
		JERecord.setCurrentLineItemValue('line','credit',parseFloat(saleOffset).toFixed(2));
		JERecord.setCurrentLineItemValue('line','duetofromsubsidiary','1');
		JERecord.setCurrentLineItemValue('line','entity','9625'); //ANC
		JERecord.setCurrentLineItemValue('line','eliminate','T');
		JERecord.setCurrentLineItemValue('line','memo','WM Intercompany Journal');
		nlapiLogExecution('DEBUG','Audit Amounts - 7',parseFloat(saleOffset).toFixed(2));
		JERecord.commitLineItem('line');
		
		//Add Commission Line
		commission = parseFloat(saleOffset * 0.0225).toFixed(2);
		commissionGST = parseFloat(commission * 0.05).toFixed(2);
		JERecord.selectNewLineItem('line');
		JERecord.setCurrentLineItemValue('line','linesubsidiary','5');
		JERecord.setCurrentLineItemValue('line','account','3862'); //Commission Earned
		JERecord.setCurrentLineItemValue('line','credit',commission);
		JERecord.setCurrentLineItemValue('line','eliminate','F');
		JERecord.setCurrentLineItemValue('line','memo','WM Intercompany Journal');
		nlapiLogExecution('DEBUG','Audit Amounts - 8',commission);
		JERecord.commitLineItem('line');
		
		JERecord.selectNewLineItem('line');
		JERecord.setCurrentLineItemValue('line','linesubsidiary','5');
		JERecord.setCurrentLineItemValue('line','account','111'); //GST AB Payable
		JERecord.setCurrentLineItemValue('line','credit',commissionGST);
		JERecord.setCurrentLineItemValue('line','eliminate','F');
		JERecord.setCurrentLineItemValue('line','memo','WM Intercompany Journal');
		nlapiLogExecution('DEBUG','Audit Amounts - 9',commissionGST);
		JERecord.commitLineItem('line');
		
		//Offset Commission Line
		commissionOffset = parseFloat(0 + commission*1 + commissionGST*1).toFixed(2);
		JERecord.selectNewLineItem('line');
		JERecord.setCurrentLineItemValue('line','linesubsidiary','5');
		JERecord.setCurrentLineItemValue('line','account','1973');
		JERecord.setCurrentLineItemValue('line','debit',commissionOffset);
		JERecord.setCurrentLineItemValue('line','duetofromsubsidiary','1');
		JERecord.setCurrentLineItemValue('line','entity','9625'); //ANC
		JERecord.setCurrentLineItemValue('line','eliminate','T');
		JERecord.setCurrentLineItemValue('line','memo','WM Intercompany Journal');
		nlapiLogExecution('DEBUG','Audit Amounts - 10',commissionOffset);
		JERecord.commitLineItem('line');
		
		JEID = nlapiSubmitRecord(JERecord);
		
		for(var n=0; n<IPresults.length; n++) {
			nlapiSubmitField('invoice',IPresults[n],'custbody_wm_intercojournalentry',JEID);
		}
		
		nlapiSubmitField('customrecord_syncwmintercompanybatch', BatchID,'custrecord_syncwminterco_journalentry',JEID);
		nlapiSubmitField('customrecord_syncwmintercompanybatch', BatchID, 'custrecord_syncwminterco_syncstatus', '4'); //Set SyncStatus = Complete
		nlapiSubmitField('customrecord_syncwmintercompanybatch', BatchID, 'custrecord_syncwminterco_errormessage', 'Journal Entry created with Internal ID '+JEID);
		nlapiSubmitField('customrecord_syncwmintercompanybatch', BatchID, 'custrecord_syncwminterco_retries', 0);
		
	} else {
		throw nlapiCreateError('ERROR', 'createIntercoJournal called with invalid invoice array');
	}
}
