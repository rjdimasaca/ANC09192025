/**
User Event Script on Check Record
Trigger: After Submit

Script will set field values required for Cheque PDF generator
2 functions are included - one for Cheques and one for Vendor Bill Payments
**/

function AfterSubmitCheque() {
	//Get Record ID
	ChequeID = nlapiGetRecordId();
	
	//Load Cheque
	ChequeRecord = nlapiLoadRecord('check',ChequeID);
	
	//Get Raw Values
	ChequeDate = nlapiStringToDate(ChequeRecord.getFieldValue('trandate'));
	
	//Format Cheque Values
	PDFYear = ChequeDate.getFullYear().toString();
	PDFMonth = (ChequeDate.getMonth() + 1).toString();
	PDFDay = ChequeDate.getDate().toString();
	PDFFullDate = [PDFYear[0], PDFYear[1], PDFYear[2], PDFYear[3], (PDFMonth>9 ? '1' : '0'), (PDFMonth>9 ? PDFMonth[1] : PDFMonth[0]), (PDFDay>9 ? PDFDay[0] : '0'), (PDFDay>9 ? PDFDay[1] : PDFDay[0])].join(' ');
	
	PDFRouteNumber = ("00000" + nlapiLookupField('account',ChequeRecord.getFieldValue('account'),'custrecord_transit_number')).slice(-5);
	
	PDFBankNumber = ("000" + nlapiLookupField('account',ChequeRecord.getFieldValue('account'),'custrecord_institution_number')).slice(-3);
	
	TempAccountNumber = ("0000000" + nlapiLookupField('account',ChequeRecord.getFieldValue('account'),'custrecord_acct_bank_account_number')).slice(-7);
	PDFAccountNumber = TempAccountNumber.slice(0,3)+"D"+TempAccountNumber.slice(3,6)+"D"+TempAccountNumber.slice(-1)+"C";
	
	//Set Values and Submit Record
	ChequeRecord.setFieldValue('custbody_pdfdate',PDFFullDate);
	ChequeRecord.setFieldValue('custbody_pdfchequenumber',PDFChequeNumber);
	ChequeRecord.setFieldValue('custbody_pdfroutenumber',PDFRouteNumber);
	ChequeRecord.setFieldValue('custbody_pdfbanknumber',PDFBankNumber);
	ChequeRecord.setFieldValue('custbody_pdfaccountnumber',PDFAccountNumber);
	ChequeRecord.setFieldValue('custbody_pdftransactionnumber',ChequeRecord.getFieldValue('transactionnumber'));
	ChequeRecordSuccess = nlapiSubmitRecord(ChequeRecord,true);
	if (ChequeRecordSuccess) {
		nlapiLogExecution('debug','Cheque Details Updated','Cheque Details have been updated for Cheque Number '+ChequeRecord.getFieldValue('transactionnumber'));
	} else {
		nlapiLogExecution('error','After Submit Cheque Script','An error has occured updating Cheque Number '+ChequeRecord.getFieldValue('transactionnumber')+'. Please try again or contact support for assistance.');
	}
}

function AfterSubmitVendorPayment() {
	//Get Record ID
	VendorPaymentID = nlapiGetRecordId();
	
	//Load Cheque
	PaymentRecord = nlapiLoadRecord('vendorpayment',VendorPaymentID);
	
	//Get Raw Values
	PaymentDate = nlapiStringToDate(PaymentRecord.getFieldValue('trandate'));
	
	//Format Cheque Values
	PDFYear = PaymentDate.getFullYear().toString();
	PDFMonth = (PaymentDate.getMonth() + 1).toString();
	PDFDay = PaymentDate.getDate().toString();
	PDFFullDate = [PDFYear[0], PDFYear[1], PDFYear[2], PDFYear[3], (PDFMonth>9 ? '1' : '0'), (PDFMonth>9 ? PDFMonth[1] : PDFMonth[0]), (PDFDay>9 ? PDFDay[0] : '0'), (PDFDay>9 ? PDFDay[1] : PDFDay[0])].join(' ');
	
	PDFRouteNumber = ("00000" + nlapiLookupField('account',PaymentRecord.getFieldValue('account'),'custrecord_transit_number')).slice(-5);
	
	PDFBankNumber = ("000" + nlapiLookupField('account',PaymentRecord.getFieldValue('account'),'custrecord_institution_number')).slice(-3);
	
	TempAccountNumber = ("0000000" + nlapiLookupField('account',PaymentRecord.getFieldValue('account'),'custrecord_acct_bank_account_number')).slice(-7);
	PDFAccountNumber = TempAccountNumber.slice(0,3)+"D"+TempAccountNumber.slice(3,6)+"D"+TempAccountNumber.slice(-1)+"C";
	
	//Set Values and Submit Record
	PaymentRecord.setFieldValue('custbody_pdfdate',PDFFullDate);
	PaymentRecord.setFieldValue('custbody_pdfroutenumber',PDFRouteNumber);
	PaymentRecord.setFieldValue('custbody_pdfbanknumber',PDFBankNumber);
	PaymentRecord.setFieldValue('custbody_pdfaccountnumber',PDFAccountNumber);
	PaymentRecord.setFieldValue('custbody_pdftransactionnumber',PaymentRecord.getFieldValue('transactionnumber'));
	PaymentRecordSuccess = nlapiSubmitRecord(PaymentRecord,true);
	if (PaymentRecordSuccess) {
		nlapiLogExecution('debug','Vendor Payment Details Updated','Vendor Payment Details have been updated for Vendor Payment Number '+PaymentRecord.getFieldValue('transactionnumber'));
	} else {
		nlapiLogExecution('error','After Submit Vendor Payment Script','An error has occured updating Vendor Payment Number '+PaymentRecord.getFieldValue('transactionnumber')+'. Please try again or contact support for assistance.');
	}
}


function AfterSubmitCustomerRefund() {
	//Get Record ID
	VendorPaymentID = nlapiGetRecordId();
	
	//Load Cheque
	PaymentRecord = nlapiLoadRecord('customerrefund',VendorPaymentID);
	
	//Get Raw Values
	PaymentDate = nlapiStringToDate(PaymentRecord.getFieldValue('trandate'));
	
	//Format Cheque Values
	PDFYear = PaymentDate.getFullYear().toString();
	PDFMonth = (PaymentDate.getMonth() + 1).toString();
	PDFDay = PaymentDate.getDate().toString();
	PDFFullDate = [PDFYear[0], PDFYear[1], PDFYear[2], PDFYear[3], (PDFMonth>9 ? '1' : '0'), (PDFMonth>9 ? PDFMonth[1] : PDFMonth[0]), (PDFDay>9 ? PDFDay[0] : '0'), (PDFDay>9 ? PDFDay[1] : PDFDay[0])].join(' ');
	
	PDFRouteNumber = ("00000" + nlapiLookupField('account',PaymentRecord.getFieldValue('account'),'custrecord_transit_number')).slice(-5);
	
	PDFBankNumber = ("000" + nlapiLookupField('account',PaymentRecord.getFieldValue('account'),'custrecord_institution_number')).slice(-3);
	
	TempAccountNumber = ("0000000" + nlapiLookupField('account',PaymentRecord.getFieldValue('account'),'custrecord_acct_bank_account_number')).slice(-7);
	PDFAccountNumber = TempAccountNumber.slice(0,3)+"D"+TempAccountNumber.slice(3,6)+"D"+TempAccountNumber.slice(-1)+"C";
	
	//Set Values and Submit Record
	PaymentRecord.setFieldValue('custbody_pdfdate',PDFFullDate);
	PaymentRecord.setFieldValue('custbody_pdfroutenumber',PDFRouteNumber);
	PaymentRecord.setFieldValue('custbody_pdfbanknumber',PDFBankNumber);
	PaymentRecord.setFieldValue('custbody_pdfaccountnumber',PDFAccountNumber);
	PaymentRecord.setFieldValue('custbody_pdftransactionnumber',PaymentRecord.getFieldValue('transactionnumber'));
	PaymentRecordSuccess = nlapiSubmitRecord(PaymentRecord,true);
	if (PaymentRecordSuccess) {
		nlapiLogExecution('debug','Vendor Payment Details Updated',' Customer Refund Details have been updated for  Customer Refund Number '+PaymentRecord.getFieldValue('transactionnumber'));
	} else {
		nlapiLogExecution('error','After Submit Customer Refund Script','An error has occured updating  Customer Refund Number '+PaymentRecord.getFieldValue('transactionnumber')+'. Please try again or contact support for assistance.');
	}
}