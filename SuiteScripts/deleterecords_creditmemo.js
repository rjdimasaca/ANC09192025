// Rudy Business Solutions - Matt Rudy

function delete_records(recordType,recordID) {
  if(recordType == 'creditmemo'){
	if(nlapiLookupField(recordType,recordID,'memo').substring(0,29) == 'Create from WM Credit Memo No') {
		nlapiDeleteRecord('creditmemo',recordID);//Delete Record
	}
  } else if (recordType == 'vendorbill'){
    nlapiDeleteRecord('vendorbill',recordID);
    /*
    if(nlapiLookupField(recordType,recordID,'memo').substring(0,26) == 'Created from WM Voucher No') {
      nlapiDeleteRecord('vendorbill',recordID);
    }
    */
  } else if (recordType == 'customrecord_syncwmfreightinvoice') {
    if(nlapiLookupField(recordType,recordID,'custrecord_syncwmfreight_errmsg') == 'HISTORYTODELETE') {
      nlapiDeleteRecord('customrecord_syncwmfreightinvoice',recordID);
    }
  } else if (recordType == 'vendorpayment') {
    nlapiDeleteRecord('vendorpayment',recordID);
  } else if (recordType == 'expensereport') {
    nlapiDeleteRecord('expensereport',recordID);
  }
}