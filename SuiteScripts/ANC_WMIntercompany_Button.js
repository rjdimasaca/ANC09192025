/* User Event Script on Before Record Load for Invoice Records

This script will add a button to trigger manual run of Intercompany Script
*/

function BeforeLoadInvoice(type, form) {
	try {
		form.setScript('customscript_wmintercompany');
		
		//RecordID = nlapiGetRecordId();
		//InvoiceRec = nlapiLoadRecord('invoice',RecordID);
		//RecordState = AssetRec.getFieldValue('custrecord_syncwminterco_syncstatus');		
		
		currContext = nlapiGetContext();
		//UserRole = currContext.getRole();
		//UserDept = nlapiLookupField('employee',currContext.getUser(),'department');
		
		form.addButton('custpage_custbotton_triggerinterco','Trigger Interco','ScheduledSearchInvoices()');
		
		nlapiLogExecution('debug','Intercompany Button has been added','Pending user input');
	} catch (err) {
		nlapiLogExecution('error','BeforeLoadInvoice',err);
	}
}