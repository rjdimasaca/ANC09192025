// Rudy Business Solutions - Matt Rudy

function delete_records(recordType,recordID) {
	if(nlapiLookupField(recordType,recordID,'custentity_wmid') == 'TODELETE20180717') {
		nlapiDeleteRecord(recordType,recordID);//Delete Record
	}
}