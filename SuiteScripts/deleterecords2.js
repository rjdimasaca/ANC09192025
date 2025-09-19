// Rudy Business Solutions - Matt Rudy

function delete_records(recordType,recordID) {
	nlapiSubmitField(recordType,recordID,'intercotransaction',''); //Clear Intercompany Link
	nlapiDeleteRecord(recordType,recordID);//Delete Record
}