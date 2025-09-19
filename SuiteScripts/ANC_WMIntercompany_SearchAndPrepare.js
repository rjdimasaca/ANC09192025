/* @Scheduled Script run Daily to find and prepare records

Will identify records for reprocessing, for new process orchestration, and queue initial record
*/

var context = nlapiGetContext();
var script_id = '559';
var cutoffDate = new Date(2019,0,1); //January first - don't process earlier invoices

function ScheduledSearchInvoices(type,form) {
	nlapiLogExecution('DEBUG', 'ScheduledSearchInvoices', 'SyncWMIntercompany Processing Started');
	try {
		/** Initial Processing **/
		var IPresults = 0; //must initialize with a non-null value
		var IPct = 0;
		while (IPresults != null && IPct < 1) { //force to only 10 runs in a row to prevent script overflow
			
			IPoutput = findInvoicesForInitialProcess();
			IPresults = IPoutput['invoices'];
			
			if (IPresults != null) {
				nlapiLogExecution('DEBUG','New Intercompany Invoices Found','Invoices: ' + IPresults);
				
				var BatchRecord = nlapiCreateRecord('customrecord_syncwmintercompanybatch');
				BatchRecord.setFieldValue('custrecord_syncwminterco_invoices',JSON.stringify(IPresults));
				BatchRecord.setFieldValue('custrecord_syncwminterco_syncstatus','1'); //New
				BatchRecord.setFieldValue('custrecord_syncwminterco_retries','3');
				BatchRecord.setFieldValue('custrecord_syncwminterco_trandate',IPoutput['trandate']);
				BatchRecord.setFieldValue('custrecord_syncwminterco_currency',IPoutput['currency']);
				BatchID = nlapiSubmitRecord(BatchRecord);
				
				for(var k = 0; k < IPresults.length; k++) {
					//nlapiSubmitField('invoice',IPresults[k],'custbody_wm_intercojournalentry',BatchID)
					nlapiSubmitField('invoice',IPresults[k],'custbody_wm_intercoprocesskey',BatchID);
					nlapiSubmitField('invoice',IPresults[k],'custbody_wm_intercoflagtoprocess','F');
				}
				
				
				//testJournalLines = createIntercoJournal(IPresults); //Journal Creation - Move to other script
				
			} else {
				nlapiLogExecution('DEBUG','No New Intercompany Invoices Found','');
			}
			IPct++;
		}
		
		/** Repeat Processing
		var RPresults = 0; //must initialize with a non-null value
		var RPct = 0;
		while (RPresults != null && RPct < 10) { //force to only 10 runs in a row to prevent script overflow
			
			findInvoicesForReprocess();
			
			/*if (x) {
				console.log('true');
			} else {
				console.log('false');
			}
			RPct++;
		}
		**/
		
		/** Launch Processing Script **/
		//Do Something
		
		
		//REQUEUE
		var filtersRequeue = [
			['custbody_wmid','notempty',''], 'AND',
			['custbody_wm_intercoprocesskey','is',''], 'AND',
			['custbody_wm_intercoflagtoprocess','is','T'], 'AND',
			['mainline','is','T'], 'AND',
			['subsidiary','is','5']
		];
		var columnsRequeue = [];
		columnsRequeue[0] = new nlobjSearchColumn('internalid');
		var searchInvoicesForRequeue = nlapiSearchRecord('invoice',null,filtersRequeue,columnsRequeue);
		
		if(searchInvoicesForRequeue) {
			findNextRecord();
		}
		//END REQUEUE
		nlapiLogExecution('DEBUG', 'ScheduledSearchInvoices', 'End of SyncWMIntercompany Processing');
	} catch (e) {
		nlapiLogExecution('error', 'ScheduledSearchInvoices() has encountered an error.', errText(e));
		//nlapiSubmitField('customrecord_syncwmloadheader', SyncWMID, 'custrecord_syncwmloadhead_syncstatus', '3'); //Set SyncStatus = Error
		//nlapiSubmitField('customrecord_syncwmloadheader', SyncWMID, 'custrecord_syncwmloadhead_errormessage', 'Error Details: ' + errText(e));
		//tempRetries = nlapiLookupField('customrecord_syncwmloadheader', SyncWMID, 'custrecord_syncwmloadhead_retries');
		//nlapiSubmitField('customrecord_syncwmloadheader', SyncWMID, 'custrecord_syncwmloadhead_retries', (tempRetries - 1));
		//nlapiLogExecution('debug', 'CALLSCHEDULESYNCWMLOAD', 'ScheduledSyncWMLoadHeader has been updated with ' + (tempRetries - 1) + ' retries.');
	}
}

function findNextRecord() {
	var ScheduleStatus = nlapiScheduleScript(script_id, null); //Deployment is empty so that script selects first available deployment
	if (ScheduleStatus == 'QUEUED') {
		nlapiLogExecution('AUDIT','CALLSCHEDULEDSYNCWMINTERCO', 'Script Scheduled with Status '+ScheduleStatus);
	} else {
		nlapiLogExecution('AUDIT','CALLSCHEDULEDSYNCWMINTERCO', 'Script Not Scheduled with Status '+ScheduleStatus);
	}
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

function findInvoicesForInitialProcess() {
	var filters = [
		['custbody_wmid','notempty',''], 'AND',
		['custbody_wm_intercoprocesskey','is',''], 'AND',
		['custbody_wm_intercoflagtoprocess','is','T'], 'AND',
		['mainline','is','T'], 'AND',
		['subsidiary','is','5']
	];
	var columns = [];
	columns[0] = new nlobjSearchColumn('internalid');
	columns[1] = new nlobjSearchColumn('trandate').setSort(true);
	columns[2] = new nlobjSearchColumn('custbody_lockfromintegrationchanges');
	columns[3] = new nlobjSearchColumn('currency');
	var searchInvoicesForIP = nlapiSearchRecord('invoice',null,filters,columns);
	
	if(searchInvoicesForIP) {
		//Batch in groups of 20, by day, and setup orchestration records
		batchDate = searchInvoicesForIP[0].getValue('trandate');
		currency = searchInvoicesForIP[0].getValue('currency');
		
		var filtersBatch = [
			['custbody_wmid','notempty',''], 'AND',
			['custbody_wm_intercojournalentry','isempty',''], 'AND',
			['custbody_wm_intercoflagtoprocess','is','T'], 'AND',
			['mainline','is','T'], 'AND',
			['subsidiary','is','5'], 'AND',
			['currency','is',currency]
		];
		var columnsBatch = [];
		columnsBatch[0] = new nlobjSearchColumn('internalid');
		columnsBatch[1] = new nlobjSearchColumn('trandate').setSort(true);
		columnsBatch[2] = new nlobjSearchColumn('custbody_lockfromintegrationchanges');
		columnsBatch[3] = new nlobjSearchColumn('currency');
		var searchInvoicesBatch = nlapiSearchRecord('invoice',null,filtersBatch,columnsBatch);
		
		invoices = [];
		runCount = Math.min(searchInvoicesBatch.length,20);
		
		for(var n=0; n<runCount; n++) {
			if(searchInvoicesBatch[n].getValue('trandate') == batchDate) {
				invoices.push(searchInvoicesBatch[n].getValue('internalid'));
			} else {
				return {'invoices':invoices,
				'trandate':batchDate,
				'currency':currency};
			}
		}
		return {'invoices':invoices,
		'trandate':batchDate,
		'currency':currency};	
	} else {
		return {'invoices':null,
		'trandate':null,
		'currency':null};
	}
}

function findInvoicesForReprocess() {
	var filters = [
		['custbody_wmid','notempty',''], 'AND',
		['custbody_wm_intercojournalentry','noneof', '@NONE@'], 'AND',
		['custbody_wm_intercoflagtoprocess','is','T'], 'AND',
		['mainline','is','T'], 'AND',
		['subsidiary','is','5']
	];
	var columns = [];
	columns[0] = new nlobjSearchColumn('internalid');
	columns[1] = new nlobjSearchColumn('trandate').setSort(true);
	columns[2] = new nlobjSearchColumn('custbody_lockfromintegrationchanges');
	
	var searchInvoicesForRP = nlapiSearchRecord('invoice',null,filters,columns);
	
	if(searchInvoicesForRP) {
		//Batch already created, flag for reprocessing
	} else {
		return false;
	}
}
