/* User Event Script on Before Record Load for Invoice Records

This script will add a button to trigger manual run of Intercompany Script
*/

function BeforeLoadBatch(type, form) {
	try {
		form.setScript('customscript_syncwmintercoprocess');
		
		//RecordID = nlapiGetRecordId();
		//InvoiceRec = nlapiLoadRecord('invoice',RecordID);
		//RecordState = AssetRec.getFieldValue('custrecord_syncwminterco_syncstatus');		
		
		currContext = nlapiGetContext();
		//UserRole = currContext.getRole();
		//UserDept = nlapiLookupField('employee',currContext.getUser(),'department');
		
		form.addButton('custpage_custbotton_triggerintercoprocess','Trigger Interco Process','ScheduledSearchBatches()');
		
		nlapiLogExecution('debug','Intercompany Process Button has been added','Pending user input');
	} catch (err) {
		nlapiLogExecution('error','BeforeLoadBatch',err);
	}
}