/* @Scheduled Script on Manual Deployment

Processes SyncLIMSFile Records
*/


//07302021 Rodmar - now set MEMO
var context = nlapiGetContext();
SyncLIMSID = context.getSetting('SCRIPT', 'custscript_synclimsid');
var script_id = 452;

function ScheduledSyncLIMS(params) {
	nlapiLogExecution('DEBUG', 'CALLSCHEDULEDSYNCLIMS', 'SyncLIMS Processing Started on Record ' + SyncLIMSID);
	try {
		nlapiSubmitField('customrecord_synclims', SyncLIMSID, 'custrecord_syncwmorderhead_syncstatus', '2');
		SyncRecord = nlapiLoadRecord('customrecord_synclims', SyncLIMSID);
		//Load all records

		var batchType = SyncRecord.getFieldValue('custrecord_synclims_batchtype');
		var fileType = SyncRecord.getFieldValue('custrecord_synclims_filetype');
		//AP creates vendor bill
		//AR creates invoice
		//GL or JV creates journal entry

		//if(fileType == 'AP' || fileType == '' || fileType == null){ //Create Vendor Bill (AP Testing)
		if (batchType != 'ACCRUAL' && fileType == 'AP') { //Create Vendor Bill (AP Testing)

			/** NEED TO CHECK FOR DUPLICATES **/

			var filters = [
				['custrecord_synclims_invoicenumber', 'is', SyncRecord.getFieldValue('custrecord_synclims_invoicenumber')], 'AND',
				['custrecord_synclims_filetype', 'is', 'AP'], 'AND',
				['custrecord_synclims_syncstatus', 'noneof', '4']
			];
			var columns = [];
			columns[0] = new nlobjSearchColumn('internalid');
			columns[1] = new nlobjSearchColumn('custrecord_synclims_grosstotal');
			APResults = nlapiSearchRecord('customrecord_synclims', null, filters, columns);

			if (APResults) {
				cleanTotal = (APResults[0].getValue('custrecord_synclims_grosstotal')).replace(/,/g, "");
				if (parseFloat(cleanTotal) >= 0) {
					//Create Vendor Bill
					for (j = 0; j < APResults.length; j++) {
						nlapiSubmitField('customrecord_synclims', APResults[j].getValue('internalid'), 'custrecord_synclims_syncstatus', 2); //Set to Processing to prevent multiple executions
					}

					var dateParts = SyncRecord.getFieldValue('custrecord_synclims_invoicedate');
					if (dateParts != null && dateParts != '') {
						dateParts = dateParts.substring(0, 10).split('/');
						tempDate = new Date(dateParts[2], dateParts[0] - 1, dateParts[1]);
					} else {
						throw nlapiCreateError('error', 'Invoice Date is blank - unable to process LIMS File');
					}

					newBillRec = nlapiCreateRecord('vendorbill');
					newBillRec.setFieldValue('customform', '144');
					newBillRec.setFieldValue('tranid', SyncRecord.getFieldValue('custrecord_synclims_invoicenumber'));
					tempVendor = validateVendor(SyncRecord.getFieldValue('custrecord_synclims_vendorid')); //Vendor Lookup based on 'LIMS ID' field on Vendor Record
					newBillRec.setFieldValue('entity', tempVendor);
					//newBillRec.setFieldValue('usertotal') = ; //SHOULD AUTOCALCULATE Gross_Total + Tax
					newBillRec.setFieldValue('taxtotal', SyncRecord.getFieldValue('custrecord_synclims_tax1')); //GST
					newBillRec.setFieldValue('tax2total', SyncRecord.getFieldValue('	custrecord_synclims_tax2')); //PST
					newBillRec.setFieldValue('trandate', nlapiDateToString(tempDate, 'date')); //Invoice_Date
					//tempTerms = legacyValidateTerms(SyncRecord.getFieldValue('custrecord_synclims_paymentterms')); //validate by Match to Import Transaction
					tempTerms = validateTerms(SyncRecord.getFieldValue('custrecord_synclims_paymentterms'), tempVendor); //validate by Pull from Vendor
					newBillRec.setFieldValue('terms', tempTerms);
					/**newBillRec.setFieldValue('postingperiod') = ; //Current period based on current month, not transaction date**/
					newBillRec.setFieldValue('approvalstatus', '2'); //Always APPROVED so posting period can be changed
					newBillRec.setFieldValue('memo', 'LIMS Import'); //Hardcode to LIMS IMPORT
					tempSubsidiary = (SyncRecord.getFieldValue('custrecord_synclims_subsidiary') == '27' || SyncRecord.getFieldValue('custrecord_synclims_subsidiary') == 27) ? '2' : '1'; //27 is Timber (2), 28 is ANC (1)
					newBillRec.setFieldValue('subsidiary', tempSubsidiary);
					newBillRec.setFieldValue('custbody_limsid', '' + SyncRecord.getFieldValue('custrecord_synclims_invoicenumber')); //LIMS ID could be sync record ID or 'Type + Invoice No'
					newBillRec.setFieldValue('custbody_paymentid', SyncRecord.getFieldValue('custrecord_synclims_paymentid'));

					newBillRec.setFieldValue('custbody_lims_invoicedate', SyncRecord.getFieldValue('custrecord_synclims_invoicedate'));
					newBillRec.setFieldValue('custbody_lims_grosstotal', SyncRecord.getFieldValue('custrecord_synclims_grosstotal'));
					newBillRec.setFieldValue('custbody_lims_reference', SyncRecord.getFieldValue('custrecord_synclims_reference'));

					newBillRec.setFieldValue('department', SyncRecord.getFieldValue('custrecord_synclims_dept'));
					setDueDate(newBillRec, SyncRecord)

					nlapiLogExecution('AUDIT', '1', SyncRecord.getFieldValue('custrecord_synclims_batchid') + ' : ' + SyncRecord.getFieldValue('custrecord_synclims_batchtype'));
					nlapiLogExecution('AUDIT', '2', SyncRecord.getFieldValue('custrecord_synclims_filetype') + ' : ' + SyncRecord.getFieldValue('custrecord_synclims_reference'));

					//n=0; n<APResults.length; n++
					//n=0; n<loopLimit; n++
					//var loopLimit = Math.min(APResults.length,3);
					var DeptCheck = {
						xyz: 'a'
					};
					var addedLines = [];
					nlapiLogExecution('AUDIT', 'APResults', JSON.stringify(APResults));

                    var limsReference = "LIMS Import";
                    
					for (n = 0; n < APResults.length; n++) {
						/** SOURCE OF ERRORS - SOMETIMES LINES OTHER THAN CORRECT LINE PERSIST AND ARE REPROCESSED. TO INVESTIGATE **/
						LineRec = nlapiLoadRecord('customrecord_synclims', APResults[n].getValue('internalid'));

						if (addedLines.indexOf(LineRec.getFieldValue('id')) == -1) {
							//LineRec.getFieldValue('custrecord_synclims_amount') >= 0 &&
							nlapiLogExecution('AUDIT', 'LineRec', JSON.stringify(LineRec));
							if (LineRec.getFieldValue('custrecord_synclims_account') != '3100' &&
								LineRec.getFieldValue('custrecord_synclims_account') != 3100 &&
								LineRec.getFieldValue('custrecord_synclims_account') != '1300' &&
								LineRec.getFieldValue('custrecord_synclims_account') != 1300) {
								nlapiLogExecution('audit', 'Processing Line Start', 'LineRec: ' + LineRec.getFieldValue('id') + ' APResults.length: ' + APResults.length + ' counter: ' + n + ' Account: ' + LineRec.getFieldValue('custrecord_synclims_account') + ' Amount: ' + LineRec.getFieldValue('custrecord_synclims_amount'));
								newBillRec.selectNewLineItem('item');
								tempItem = validateItem(LineRec.getFieldValue('custrecord_synclims_account'), LineRec.getFieldValue('custrecord_synclims_phase') + '---' + LineRec.getFieldValue('custrecord_synclims_subphase'), fileType);
								//if (tempItem == '-1') {throw nlapiCreateError('error','Unable to find Matching LIMS ID '+LineRec.getFieldValue('custrecord_synclims_phase')+'---'+LineRec.getFieldValue('custrecord_synclims_subphase')+'---'+LineRec.getFieldValue('custrecord_synclims_account')); }
								nlapiLogExecution('debug', 'Item Values ' + n + ': test lookupVal', 'tempItem: ' + tempItem + ' lookupVal: ' + LineRec.getFieldValue('custrecord_synclims_phase') + '---' + LineRec.getFieldValue('custrecord_synclims_subphase'));
								newBillRec.setCurrentLineItemValue('item', 'item', tempItem); //Validate Item by searching phase+'---'+subphase on item 'LIMS ID'
								nlapiLogExecution('AUDIT', 'validateDept Input', 'Dim1: ' + LineRec.getFieldValue('custrecord_synclims_dim1') + ' Dim2: ' + LineRec.getFieldValue('custrecord_synclims_dim2') + ' Account: ' + LineRec.getFieldValue('custrecord_synclims_account'));
								var tempDept = validateDepartment(LineRec.getFieldValue('custrecord_synclims_dim1'), LineRec.getFieldValue('custrecord_synclims_dim2'), LineRec.getFieldValue('custrecord_synclims_account'), DeptCheck);
								nlapiLogExecution('AUDIT', 'validateDept Output', JSON.stringify(tempDept) + " " + LineRec.getFieldValue('custrecord_synclims_reference'));
								DeptCheck = tempDept[0];
								newBillRec.setCurrentLineItemValue('item', 'department', tempDept[1]);
								newBillRec.setCurrentLineItemValue('item', 'description', 'LIMS Inter BatchID ' + LineRec.getFieldValue('custrecord_synclims_interbatchid') + ' APResults ID: ' + APResults[n].getValue('internalid') + ' LineRec: ' + LineRec.getFieldValue('id') + ' Reference: ' + LineRec.getFieldValue('custrecord_synclims_reference'));
								newBillRec.setCurrentLineItemValue('item', 'quantity', LineRec.getFieldValue('custrecord_synclims_quantity')); //Quantity
								//newBillRec.setCurrentLineItemValue('units') = ; //pulled from item
								var tempAmount = LineRec.getFieldValue('custrecord_synclims_amount');
								var tempRate = (tempAmount / LineRec.getFieldValue('custrecord_synclims_quantity')).toFixed(2);
								nlapiLogExecution('AUDIT', 'rate and Amount', tempRate + " : " + tempAmount);
								newBillRec.setCurrentLineItemValue('item', 'rate', tempRate); //Amount/Quantity
								newBillRec.setCurrentLineItemValue('item', 'amount', tempAmount); //Amount
								newBillRec.setCurrentLineItemValue('item', 'taxcode', '82'); //Hardcoded to Nontaxable
								newBillRec.setCurrentLineItemValue('item', 'location', '227'); //Hardcoded to ANC Timber for Sub 2, 113 for Sub 1
								newBillRec.setCurrentLineItemValue('item', 'custcol_blockref', LineRec.getFieldValue('custrecord_synclims_sourceid')); //Dim5 or custrecord_synclims_sourceid
								newBillRec.setCurrentLineItemValue('item', 'custcol_costallocadmin', LineRec.getFieldValue('custrecord_synclims_costallocadmin'));
								newBillRec.setCurrentLineItemValue('item', 'custcol_costallocgenlogging', LineRec.getFieldValue('custrecord_synclims_costallocgenlog'));
								testStatQuantity = LineRec.getFieldValue('custrecord_synclims_statquantity');
								statQuantity = (testStatQuantity != null && testStatQuantity != '') ? parseFloat(testStatQuantity.replace(/,/g, "")).toFixed(2) : '';
								newBillRec.setCurrentLineItemValue('item', 'custcol_statquantity', statQuantity);

								newBillRec.setCurrentLineItemValue('item', 'custcol_contractid', LineRec.getFieldValue('custrecord_synclims_contractid'));
								newBillRec.setCurrentLineItemValue('item', 'custcol_muid', LineRec.getFieldValue('custrecord_synclims_muid'));
								newBillRec.setCurrentLineItemValue('item', 'custcol_dispositionid', LineRec.getFieldValue('custrecord_synclims_dispositionid'));
								newBillRec.setCurrentLineItemValue('item', 'custcol_subsettingid', LineRec.getFieldValue('custrecord_synclims_subsettingid'));
								newBillRec.setCurrentLineItemValue('item', 'custcol_stratumid', LineRec.getFieldValue('custrecord_synclims_stratumid'));
								newBillRec.setCurrentLineItemValue('item', 'custcol_formid', LineRec.getFieldValue('custrecord_synclims_formid'));
								newBillRec.setCurrentLineItemValue('item', 'custcol_speciesid', LineRec.getFieldValue('custrecord_synclims_speciesid'));
								newBillRec.setCurrentLineItemValue('item', 'custcol_interbatchid', LineRec.getFieldValue('custrecord_synclims_interbatchid'));

								nlapiLogExecution('AUDIT', 'LINE VALUES', APResults[n].getValue('internalid') + " : " + LineRec.getFieldValue('custrecord_synclims_ratemethod') + " : " + LineRec.getFieldValue('custrecord_synclims_rate') + " : " + LineRec.getFieldValue('custrecord_synclims_dim1'));

								newBillRec.setCurrentLineItemValue('item', 'custcol_lims_ratemethod', LineRec.getFieldValue('custrecord_synclims_ratemethod'));
								newBillRec.setCurrentLineItemValue('item', 'custcol_lims_rate', LineRec.getFieldValue('custrecord_synclims_rate'));
								newBillRec.setCurrentLineItemValue('item', 'custcol_lims_dim1', LineRec.getFieldValue('custrecord_synclims_dim1'));
								newBillRec.setCurrentLineItemValue('item', 'custcol_lims_dim2', LineRec.getFieldValue('custrecord_synclims_dim2'));
								newBillRec.setCurrentLineItemValue('item', 'custcol_lims_dim3', LineRec.getFieldValue('custrecord_synclims_dim3'));
								newBillRec.setCurrentLineItemValue('item', 'custcol_lims_dim4', LineRec.getFieldValue('custrecord_synclims_dim4'));
								newBillRec.setCurrentLineItemValue('item', 'custcol_lims_dim5', LineRec.getFieldValue('custrecord_synclims_dim5'));
								newBillRec.setCurrentLineItemValue('item', 'custcol_lims_dim6', LineRec.getFieldValue('custrecord_synclims_dim6'));
								newBillRec.setCurrentLineItemValue('item', 'custcol_lims_dim7', LineRec.getFieldValue('custrecord_synclims_dim7'));

								newBillRec.setCurrentLineItemValue('item', 'custcol_lims_statuom', LineRec.getFieldValue('custrecord_synclims_statuom'));
								newBillRec.setCurrentLineItemValue('item', 'custcol_lims_sourceid', LineRec.getFieldValue('custrecord_synclims_sourceid'));

								newBillRec.commitLineItem('item');
								addedLines.push(LineRec.getFieldValue('id'));
								/** Look into Purchase Price? harvest blk rd **/
								//Test withJordash - anc timber
								
								limsReference = LineRec.getFieldValue('custrecord_synclims_reference')
							}
						}
						
						newBillRec.setFieldValue('memo', limsReference); //07302021 Rodmar c/o Katherine
						newBillRec.setFieldValue('custbody_lims_reference', limsReference); //07302021 Rodmar c/o Katherine //09212021 used to be 2 lines setting memo, now the second line is setting lims reference field.
					}
					nlapiLogExecution("DEBUG", "addedLines", JSON.stringify(addedLines));
					//Add GST Line
					newBillRec.selectNewLineItem('item');
					newBillRec.setCurrentLineItemValue('item', 'item', '12296'); //Hardcoded 'GST Adjustment' Item
					newBillRec.setCurrentLineItemValue('item', 'department', '2'); //Hardcoded to Department 0000
					newBillRec.setCurrentLineItemValue('item', 'description', 'LIMS Inter BatchID ' + LineRec.getFieldValue('custrecord_synclims_interbatchid'));
					newBillRec.setCurrentLineItemValue('item', 'quantity', 1);
					//newBillRec.setCurrentLineItemValue('units') = ; //pulled from item
					cleanTax = (SyncRecord.getFieldValue('custrecord_synclims_tax2')).replace(/,/g, "");
					taxAmount = Math.abs(parseFloat(cleanTax));
					newBillRec.setCurrentLineItemValue('item', 'rate', taxAmount); //Amount/Quantity
					newBillRec.setCurrentLineItemValue('item', 'amount', taxAmount); //Amount
					newBillRec.setCurrentLineItemValue('item', 'taxcode', '82'); //Hardcoded to Nontaxable
					newBillRec.setCurrentLineItemValue('item', 'location', '227'); //Hardcoded to ANC Timber for Sub 2, 113 for Sub 1);
					newBillRec.commitLineItem('item');

					nlapiLogExecution("DEBUG", "addedLines", JSON.stringify(addedLines));
					// newBillRec.setFieldValue('custbody_lims_filetype', SyncRecord.getFieldValue('custrecord_synclims_filetype'));
					// newBillRec.setFieldValue('custbody_lims_batchtype', SyncRecord.getFieldValue('custrecord_synclims_batchtype'));
					// newBillRec.setFieldValue('custbody_lims_batchid', SyncRecord.getFieldValue('custrecord_synclims_batchid'));
					newBillID = nlapiSubmitRecord(newBillRec);
					nlapiLogExecution("DEBUG", "newBillID", newBillID);
					for (k = 0; k < APResults.length; k++) {
						nlapiSubmitField('vendorbill', newBillID, 'custbody_lims_filetype', SyncRecord.getFieldValue('custrecord_synclims_filetype'));
						nlapiSubmitField('vendorbill', newBillID, 'custbody_lims_batchtype', SyncRecord.getFieldValue('custrecord_synclims_batchtype'));
						nlapiSubmitField('vendorbill', newBillID, 'custbody_lims_batchid', SyncRecord.getFieldValue('custrecord_synclims_batchid'));

						nlapiSubmitField('customrecord_synclims', APResults[k].getValue('internalid'), 'custrecord_synclims_syncstatus', 4);
						nlapiSubmitField('customrecord_synclims', APResults[k].getValue('internalid'), 'custrecord_synclims_errmsg', 'Created Vendor Bill record with Internal ID ' + newBillID);
						nlapiSubmitField('customrecord_synclims', APResults[k].getValue('internalid'), 'custrecord_synclims_nsid', newBillID);
						nlapiSubmitField('customrecord_synclims', APResults[k].getValue('internalid'), 'custrecord_trans_ref', newBillID);
					}
					nlapiLogExecution('AUDIT', 'CALLSCHEDULEDSYNCLIMS', 'Vendor Bill with Internal ID ' + newBillID + ' has been created.');
				} else {
					//AP Credit

					for (k = 0; k < APResults.length; k++) {
						nlapiSubmitField('customrecord_synclims', APResults[k].getValue('internalid'), 'custrecord_synclims_syncstatus', 2); //Set to Processing to prevent multiple executions
					}

					var dateParts = SyncRecord.getFieldValue('custrecord_synclims_invoicedate');
					if (dateParts != null && dateParts != '') {
						dateParts = dateParts.substring(0, 10).split('/');
						tempDate = new Date(dateParts[2], dateParts[0] - 1, dateParts[1]);
					} else {
						throw nlapiCreateError('error', 'Vendor Credit Date is blank - unable to process LIMS File');
					}

					newVendCreditRec = nlapiCreateRecord('vendorcredit');
					newVendCreditRec.setFieldValue('customform', '155');
					newVendCreditRec.setFieldValue('tranid', SyncRecord.getFieldValue('custrecord_synclims_invoicenumber'));
					tempVendor = validateVendor(SyncRecord.getFieldValue('custrecord_synclims_vendorid')); //Vendor Lookup based on 'LIMS ID' field on Vendor Record
					newVendCreditRec.setFieldValue('entity', tempVendor);
					//newVendCreditRec.setFieldValue('taxtotal',SyncRecord.getFieldValue('custrecord_synclims_tax1')); //GST
					//newVendCreditRec.setFieldValue('tax2total',SyncRecord.getFieldValue('	custrecord_synclims_tax2')); //PST
					newVendCreditRec.setFieldValue('trandate', nlapiDateToString(tempDate, 'date')); //Invoice_Date
					//tempTerms = legacyValidateTerms(SyncRecord.getFieldValue('custrecord_synclims_paymentterms')); //validate by Match to Import Transaction
					//tempTerms = validateCustomerTerms(SyncRecord.getFieldValue('custrecord_synclims_paymentterms'),tempCustomer); //validate by Pull from Vendor
					//newVendCreditRec.setFieldValue('terms',tempTerms);
					//newVendCreditRec.setFieldValue('postingperiod') = ; //Current period based on current month, not transaction date
					//newVendCreditRec.setFieldValue('approvalstatus','2'); //Always APPROVED so posting period can be changed
					newVendCreditRec.setFieldValue('memo', 'LIMS Import'); //Hardcode to LIMS IMPORT
					tempSubsidiary = (SyncRecord.getFieldValue('custrecord_synclims_subsidiary') == '27' || SyncRecord.getFieldValue('custrecord_synclims_subsidiary') == 27) ? '2' : '1'; //27 is Timber (2), 28 is ANC (1)
					newVendCreditRec.setFieldValue('subsidiary', tempSubsidiary);
					tempLocation = (tempSubsidiary == '2' || tempSubsidiary == 2) ? '227' : '228'; //227 is ANC Timber Ltd., 228 is Alberta Newsprint Company
					newVendCreditRec.setFieldValue('location', tempLocation);
					newVendCreditRec.setFieldValue('custbody_limsid', '' + SyncRecord.getFieldValue('custrecord_synclims_invoicenumber')); //LIMS ID could be sync record ID or 'Type + Invoice No'
					newVendCreditRec.setFieldValue('custbody_paymentid', SyncRecord.getFieldValue('custrecord_synclims_paymentid'));

					newVendCreditRec.setFieldValue('custbody_lims_invoicedate', SyncRecord.getFieldValue('custrecord_synclims_invoicedate'));
					newVendCreditRec.setFieldValue('custbody_lims_grosstotal', SyncRecord.getFieldValue('custrecord_synclims_grosstotal'));
					newVendCreditRec.setFieldValue('custbody_lims_reference', SyncRecord.getFieldValue('custrecord_synclims_reference'));
					newVendCreditRec.setFieldValue('custbody_lims_filetype', SyncRecord.getFieldValue('custrecord_synclims_filetype'));
					newVendCreditRec.setFieldValue('custbody_lims_batchtype', SyncRecord.getFieldValue('custrecord_synclims_batchtype'));
					newVendCreditRec.setFieldValue('custbody_lims_batchid', SyncRecord.getFieldValue('custrecord_synclims_batchid'));
					newVendCreditRec.setFieldValue('department', SyncRecord.getFieldValue('custrecord_synclims_dept'));
					setDueDate(newVendCreditRec, SyncRecord)

					//n=0; n<APResults.length; n++
					var loopLimit = Math.min(APResults.length, 3);
					var DeptCheck = {
						xyz: 0
					};
					var addedLines = [];
					
					var limsReference = "LIMS Import";
					
					for (n = 0; n < APResults.length; n++) {
						LineRec = nlapiLoadRecord('customrecord_synclims', APResults[n].getValue('internalid'));

						if (addedLines.indexOf(LineRec.getFieldValue('id')) == -1) {

							//var DeptCheck = {xyz:'a'};
							//testAmount = parseInt(LineRec.getFieldValue('custrecord_synclims_amount'));
							testAccount = LineRec.getFieldValue('custrecord_synclims_account');
							//testAmount >= 0 &&
							if (testAccount != '3100' && testAccount != 3100 &&
								testAccount != '1300' && testAccount != 1300 &&
								testAccount != '3700' && testAccount != 3700 &&
								testAccount != '1240' && testAccount != 1240 &&
								testAccount != '1241' && testAccount != 1241) {

								tempItem = validateItem(LineRec.getFieldValue('custrecord_synclims_account'), LineRec.getFieldValue('custrecord_synclims_phase') + '---' + LineRec.getFieldValue('custrecord_synclims_subphase'), fileType);
								if (tempItem != 'SKIPITEM') {
									if (tempItem == '-1') {
										throw nlapiCreateError('error', 'Unable to find Matching LIMS ID ' + LineRec.getFieldValue('custrecord_synclims_phase') + '---' + LineRec.getFieldValue('custrecord_synclims_subphase') + '---' + LineRec.getFieldValue('custrecord_synclims_account'));
									}
									nlapiLogExecution('debug', 'Item Values ' + n + ': test lookupVal', 'tempItem: ' + tempItem + ' lookupVal: ' + LineRec.getFieldValue('custrecord_synclims_phase') + '---' + LineRec.getFieldValue('custrecord_synclims_subphase'));


									newVendCreditRec.selectNewLineItem('item');
									newVendCreditRec.setCurrentLineItemValue('item', 'item', tempItem); //Validate Item by searching phase+'---'+subphase on item 'LIMS ID'
									nlapiLogExecution('AUDIT', 'validateDept Input', 'Dim1: ' + LineRec.getFieldValue('custrecord_synclims_dim1') + ' Dim2: ' + LineRec.getFieldValue('custrecord_synclims_dim2') + ' Dim3: ' + LineRec.getFieldValue('custrecord_synclims_account'));
									var tempDept = validateDepartment(LineRec.getFieldValue('custrecord_synclims_dim1'), LineRec.getFieldValue('custrecord_synclims_dim2'), LineRec.getFieldValue('custrecord_synclims_account'), DeptCheck);
									nlapiLogExecution('AUDIT', 'validateDept Output', tempDept[1]);
									DeptCheck = tempDept[0];
									newVendCreditRec.setCurrentLineItemValue('item', 'department', tempDept[1]);
									newVendCreditRec.setCurrentLineItemValue('item', 'description', 'LIMS Inter BatchID ' + LineRec.getFieldValue('custrecord_synclims_interbatchid') + ' Reference: ' + LineRec.getFieldValue('custrecord_synclims_reference'));
									newVendCreditRec.setCurrentLineItemValue('item', 'quantity', LineRec.getFieldValue('custrecord_synclims_quantity')); //Quantity
									//newVendCreditRec.setCurrentLineItemValue('units') = ; //pulled from item
									cleanAmount = (LineRec.getFieldValue('custrecord_synclims_amount')).replace(/,/g, "");
									var tempAmount = 0 - parseFloat(cleanAmount);
									var tempRate = (tempAmount / LineRec.getFieldValue('custrecord_synclims_quantity')).toFixed(2);
									newVendCreditRec.setCurrentLineItemValue('item', 'rate', tempRate); //Amount/Quantity
									newVendCreditRec.setCurrentLineItemValue('item', 'amount', tempAmount); //Amount
									newVendCreditRec.setCurrentLineItemValue('item', 'taxcode', '82'); //Hardcoded to Nontaxable
									newVendCreditRec.setCurrentLineItemValue('item', 'location', '227'); //Hardcoded to ANC Timber for Sub 2, 113 for Sub 1
									newVendCreditRec.setCurrentLineItemValue('item', 'custcol_blockref', LineRec.getFieldValue('custrecord_synclims_dim4'));
									newVendCreditRec.setCurrentLineItemValue('item', 'custcol_costallocadmin', LineRec.getFieldValue('custrecord_synclims_costallocadmin'));
									newVendCreditRec.setCurrentLineItemValue('item', 'custcol_costallocgenlogging', LineRec.getFieldValue('custrecord_synclims_costallocgenlog'));
									testStatQuantity = LineRec.getFieldValue('custrecord_synclims_statquantity');
									statQuantity = (testStatQuantity != null && testStatQuantity != '') ? parseFloat(testStatQuantity.replace(/,/g, "")).toFixed(2) : '';
									//statQuantity = parseFloat(LineRec.getFieldValue('custrecord_synclims_statquantity').replace(/,/g,"")).toFixed(2);
									newVendCreditRec.setCurrentLineItemValue('item', 'custcol_statquantity', statQuantity);

									nlapiLogExecution('AUDIT', 'LINE VALUES', APResults[n].getValue('internalid') + " : " + LineRec.getFieldValue('custrecord_synclims_ratemethod') + " : " + LineRec.getFieldValue('custrecord_synclims_rate') + " : " + LineRec.getFieldValue('custrecord_synclims_dim1'));

									newVendCreditRec.setCurrentLineItemValue('item', 'custcol_contractid', LineRec.getFieldValue('custrecord_synclims_contractid'));
									newVendCreditRec.setCurrentLineItemValue('item', 'custcol_muid', LineRec.getFieldValue('custrecord_synclims_muid'));
									newVendCreditRec.setCurrentLineItemValue('item', 'custcol_dispositionid', LineRec.getFieldValue('custrecord_synclims_dispositionid'));
									newVendCreditRec.setCurrentLineItemValue('item', 'custcol_subsettingid', LineRec.getFieldValue('custrecord_synclims_subsettingid'));
									newVendCreditRec.setCurrentLineItemValue('item', 'custcol_stratumid', LineRec.getFieldValue('custrecord_synclims_stratumid'));
									newVendCreditRec.setCurrentLineItemValue('item', 'custcol_formid', LineRec.getFieldValue('custrecord_synclims_formid'));
									newVendCreditRec.setCurrentLineItemValue('item', 'custcol_speciesid', LineRec.getFieldValue('custrecord_synclims_speciesid'));
									newVendCreditRec.setCurrentLineItemValue('item', 'custcol_interbatchid', LineRec.getFieldValue('custrecord_synclims_interbatchid'));

									newVendCreditRec.setCurrentLineItemValue('item', 'custcol_lims_ratemethod', LineRec.getFieldValue('custrecord_synclims_ratemethod'));
									newVendCreditRec.setCurrentLineItemValue('item', 'custcol_lims_rate', LineRec.getFieldValue('custrecord_synclims_rate'));
									newVendCreditRec.setCurrentLineItemValue('item', 'custcol_lims_dim1', LineRec.getFieldValue('custrecord_synclims_dim1'));
									newVendCreditRec.setCurrentLineItemValue('item', 'custcol_lims_dim2', LineRec.getFieldValue('custrecord_synclims_dim2'));
									newVendCreditRec.setCurrentLineItemValue('item', 'custcol_lims_dim3', LineRec.getFieldValue('custrecord_synclims_dim3'));
									newVendCreditRec.setCurrentLineItemValue('item', 'custcol_lims_dim4', LineRec.getFieldValue('custrecord_synclims_dim4'));
									newVendCreditRec.setCurrentLineItemValue('item', 'custcol_lims_dim5', LineRec.getFieldValue('custrecord_synclims_dim5'));
									newVendCreditRec.setCurrentLineItemValue('item', 'custcol_lims_dim6', LineRec.getFieldValue('custrecord_synclims_dim6'));
									newVendCreditRec.setCurrentLineItemValue('item', 'custcol_lims_dim7', LineRec.getFieldValue('custrecord_synclims_dim7'));

									newVendCreditRec.setCurrentLineItemValue('item', 'custcol_lims_statuom', LineRec.getFieldValue('custrecord_synclims_statuom'));
									newVendCreditRec.setCurrentLineItemValue('item', 'custcol_lims_sourceid', LineRec.getFieldValue('custrecord_synclims_sourceid'));

									newVendCreditRec.commitLineItem('item');
									addedLines.push(LineRec.getFieldValue('id'));
									/** Look into Purchase Price? harvest blk rd **/
									
									limsReference = LineRec.getFieldValue('custrecord_synclims_reference')
								}
							}
						}
					}
					
					newVendCreditRec.setFieldValue('memo', limsReference); //07302021 Rodmar c/o Katherine
                  	newVendCreditRec.setFieldValue('custbody_lims_reference', limsReference); //07312021 make sure lims reference is set as well, this one is used for global searching Rodmar c/o Katherine

					//Add GST Line
					newVendCreditRec.selectNewLineItem('item');
					newVendCreditRec.setCurrentLineItemValue('item', 'item', '12296'); //Hardcoded 'GST Adjustment' Item
					newVendCreditRec.setCurrentLineItemValue('item', 'department', '2'); //Hardcoded to Department 0000
					newVendCreditRec.setCurrentLineItemValue('item', 'description', 'LIMS Inter BatchID ' + LineRec.getFieldValue('custrecord_synclims_interbatchid'));
					newVendCreditRec.setCurrentLineItemValue('item', 'quantity', 1);
					//newVendCreditRec.setCurrentLineItemValue('units') = ; //pulled from item
					cleanTax = (SyncRecord.getFieldValue('custrecord_synclims_tax2')).replace(/,/g, "");
					taxAmount = Math.abs(parseFloat(cleanTax));
					newVendCreditRec.setCurrentLineItemValue('item', 'rate', taxAmount); //Amount/Quantity
					newVendCreditRec.setCurrentLineItemValue('item', 'amount', taxAmount); //Amount
					newVendCreditRec.setCurrentLineItemValue('item', 'taxcode', '82'); //Hardcoded to Nontaxable
					newVendCreditRec.setCurrentLineItemValue('item', 'location', '227'); //Hardcoded to ANC Timber for Sub 2, 113 for Sub 1);
					newVendCreditRec.commitLineItem('item');

					newVendCreditID = nlapiSubmitRecord(newVendCreditRec);

					for (k = 0; k < APResults.length; k++) {
						nlapiSubmitField('vendorcredit', newVendCreditID, 'custbody_lims_filetype', SyncRecord.getFieldValue('custrecord_synclims_filetype'));
						nlapiSubmitField('vendorcredit', newVendCreditID, 'custbody_lims_batchtype', SyncRecord.getFieldValue('custrecord_synclims_batchtype'));
						nlapiSubmitField('vendorcredit', newVendCreditID, 'custbody_lims_batchid', SyncRecord.getFieldValue('custrecord_synclims_batchid'));


						nlapiSubmitField('customrecord_synclims', APResults[k].getValue('internalid'), 'custrecord_synclims_syncstatus', 4);
						nlapiSubmitField('customrecord_synclims', APResults[k].getValue('internalid'), 'custrecord_synclims_errmsg', 'Created Vendor Credit record with Internal ID ' + newVendCreditID);
						nlapiSubmitField('customrecord_synclims', APResults[k].getValue('internalid'), 'custrecord_synclims_nsid', newVendCreditID);
						nlapiSubmitField('customrecord_synclims', APResults[k].getValue('internalid'), 'custrecord_trans_ref', newVendCreditID);
					}
					nlapiLogExecution('AUDIT', 'CALLSCHEDULEDSYNCLIMS', 'Vendor Credit with Internal ID ' + newVendCreditID + ' has been created.');
				}
			} else {
				throw nlapiCreateError('error', 'No Rows were found for LIMS AP Credit - Invoice Number ' + SyncRecord.getFieldValue('custrecord_synclims_invoicenumber'));
			}
		} else if (batchType != 'ACCRUAL' && fileType == 'AR') { //Create Invoice
			//Create Invoice
			//throw nlapiCreateError('error','Not ready to create AR records.');



			/** NEED TO CHECK FOR DUPLICATES **/

			var filters = [
				['custrecord_synclims_invoicenumber', 'is', SyncRecord.getFieldValue('custrecord_synclims_invoicenumber')], 'AND',
				['custrecord_synclims_filetype', 'is', 'AR'], 'AND',
				['custrecord_synclims_syncstatus', 'noneof', '4']
			];
			var columns = [];
			columns[0] = new nlobjSearchColumn('internalid');
			columns[1] = new nlobjSearchColumn('custrecord_synclims_grosstotal');
			ARResults = nlapiSearchRecord('customrecord_synclims', null, filters, columns);

			if (ARResults) {
				//Check if Invoice or Credit
				cleanTotal = (ARResults[0].getValue('custrecord_synclims_grosstotal')).replace(/,/g, "");
				if (parseFloat(cleanTotal) >= 0) {
					throw nlapiCreateError('ERROR', 'LIMS AR Transaction has a positive Gross_Total but only credits are supposed to be created. Please review this transaction.');
					/*
					//Process as Invoice
					for(k=0; k < ARResults.length; k++) {
						nlapiSubmitField('customrecord_synclims',ARResults[k].getValue('internalid'),'custrecord_synclims_syncstatus',2); //Set to Processing to prevent multiple executions
					}
					
					var dateParts = SyncRecord.getFieldValue('custrecord_synclims_invoicedate');
					if(dateParts != null && dateParts != '') {
						dateParts = dateParts.substring(0,10).split('/');
						tempDate = new Date(dateParts[2],dateParts[0]-1,dateParts[1]);
					} else {
						throw nlapiCreateError('error','Invoice Date is blank - unable to process LIMS File');
					}
					
					newInvRec = nlapiCreateRecord('invoice');
					newInvRec.setFieldValue('tranid',SyncRecord.getFieldValue('custrecord_synclims_invoicenumber'));
					tempCustomer = validateCustomer(SyncRecord.getFieldValue('custrecord_synclims_vendorid')); //Client Lookup based on 'LIMS ID' field on Client Record
					newInvRec.setFieldValue('entity',tempCustomer);
					//newInvRec.setFieldValue('usertotal') = ; //SHOULD AUTOCALCULATE Gross_Total + Tax
					newInvRec.setFieldValue('taxtotal',SyncRecord.getFieldValue('custrecord_synclims_tax1')); //GST
					newInvRec.setFieldValue('tax2total',SyncRecord.getFieldValue('	custrecord_synclims_tax2')); //PST
					newInvRec.setFieldValue('trandate',nlapiDateToString(tempDate,'date')); //Invoice_Date
					//tempTerms = legacyValidateTerms(SyncRecord.getFieldValue('custrecord_synclims_paymentterms')); //validate by Match to Import Transaction
					tempTerms = validateCustomerTerms(SyncRecord.getFieldValue('custrecord_synclims_paymentterms'),tempCustomer); //validate by Pull from Vendor
					newInvRec.setFieldValue('terms',tempTerms);
					//newInvRec.setFieldValue('postingperiod') = ; //Current period based on current month, not transaction date
					//newInvRec.setFieldValue('approvalstatus','2'); //Always APPROVED so posting period can be changed
					newInvRec.setFieldValue('memo','LIMS Import'); //Hardcode to LIMS IMPORT
					tempSubsidiary = (SyncRecord.getFieldValue('custrecord_synclims_subsidiary') == '27' || SyncRecord.getFieldValue('custrecord_synclims_subsidiary') == 27) ? '2' : '1';//27 is Timber (2), 28 is ANC (1)
					newInvRec.setFieldValue('subsidiary',tempSubsidiary);
					tempLocation = (tempSubsidiary == '2' || tempSubsidiary == 2) ? '227' : '228'; //227 is ANC Timber Ltd., 228 is Alberta Newsprint Company
					newInvRec.setFieldValue('location',tempLocation);
					newInvRec.setFieldValue('custbody_limsid',''+SyncRecord.getFieldValue('custrecord_synclims_invoicenumber')); //LIMS ID could be sync record ID or 'Type + Invoice No'
					newInvRec.setFieldValue('custbody_paymentid',SyncRecord.getFieldValue('custrecord_synclims_paymentid'));
					
					//n=0; n<ARResults.length; n++
					var loopLimit = Math.min(ARResults.length,3);
					var DeptCheck = {xyz:0};
					for(n=0; n<ARResults.length; n++) {
						LineRec = nlapiLoadRecord('customrecord_synclims',ARResults[n].getValue('internalid'));
						
						//var DeptCheck = {xyz:'a'};
						//testAmount = parseInt(LineRec.getFieldValue('custrecord_synclims_amount'));
						testAccount = LineRec.getFieldValue('custrecord_synclims_account');
						//testAmount >= 0 &&
						if(testAccount != '3100' && testAccount != 3100 && 
							testAccount != '1300' && testAccount != 1300 && 
							testAccount != '3700' && testAccount != 3700 &&
							testAccount != '1240' && testAccount != 1240 &&
							testAccount != '1241' && testAccount != 1241) {
							
							tempItem = validateItem(LineRec.getFieldValue('custrecord_synclims_account'),LineRec.getFieldValue('custrecord_synclims_phase')+'---'+LineRec.getFieldValue('custrecord_synclims_subphase'),fileType);
							if (tempItem != 'SKIPITEM') {
								if (tempItem == '-1') {throw nlapiCreateError('error','Unable to find Matching LIMS ID '+LineRec.getFieldValue('custrecord_synclims_phase')+'---'+LineRec.getFieldValue('custrecord_synclims_subphase')+'---'+LineRec.getFieldValue('custrecord_synclims_account')); }
								nlapiLogExecution('debug','Item Values '+n+': test lookupVal','tempItem: '+tempItem+' lookupVal: '+LineRec.getFieldValue('custrecord_synclims_phase')+'---'+LineRec.getFieldValue('custrecord_synclims_subphase'));
								
								
								newInvRec.selectNewLineItem('item');
								newInvRec.setCurrentLineItemValue('item','item',tempItem); //Validate Item by searching phase+'---'+subphase on item 'LIMS ID'
								nlapiLogExecution('AUDIT','validateDept Input','Dim1: '+LineRec.getFieldValue('custrecord_synclims_dim1')+' Dim2: '+LineRec.getFieldValue('custrecord_synclims_dim2')+' Dim3: '+LineRec.getFieldValue('custrecord_synclims_account'));
								var tempDept = validateDepartment(LineRec.getFieldValue('custrecord_synclims_dim1'),LineRec.getFieldValue('custrecord_synclims_dim2'),LineRec.getFieldValue('custrecord_synclims_account'),DeptCheck);
								nlapiLogExecution('AUDIT','validateDept Output',tempDept[1]);
								DeptCheck = tempDept[0];
								newInvRec.setCurrentLineItemValue('item','department',tempDept[1]);
								newInvRec.setCurrentLineItemValue('item','description','LIMS Inter BatchID '+LineRec.getFieldValue('custrecord_synclims_interbatchid'));
								newInvRec.setCurrentLineItemValue('item','quantity',LineRec.getFieldValue('custrecord_synclims_quantity')); //Quantity
								//newInvRec.setCurrentLineItemValue('units') = ; //pulled from item
								newInvRec.setCurrentLineItemValue('item','rate',LineRec.getFieldValue('custrecord_synclims_rate')); //Amount/Quantity
								newInvRec.setCurrentLineItemValue('item','amount',LineRec.getFieldValue('custrecord_synclims_amount')); //Amount
								newInvRec.setCurrentLineItemValue('item','taxcode','11'); //Hardcoded to Alberta Tax
								newInvRec.setCurrentLineItemValue('item','location','227'); //Hardcoded to ANC Timber for Sub 2, 113 for Sub 1
								newInvRec.setCurrentLineItemValue('item','custcol_blockref',LineRec.getFieldValue('custrecord_synclims_dim4'));
								newInvRec.setCurrentLineItemValue('item','custcol_costallocadmin',LineRec.getFieldValue('custrecord_synclims_costallocadmin'));
								newInvRec.setCurrentLineItemValue('item','custcol_costallocgenlogging',LineRec.getFieldValue('custrecord_synclims_costallocgenlog'));
								testStatQuantity = LineRec.getFieldValue('custrecord_synclims_statquantity');
								statQuantity = (testStatQuantity != null && testStatQuantity != '') ? parseFloat(testStatQuantity.replace(/,/g,"")).toFixed(2) : '';
								newInvRec.setCurrentLineItemValue('item','custcol_statquantity',statQuantity);
								
								newInvRec.setCurrentLineItemValue('item','custcol_contractid',LineRec.getFieldValue('custrecord_synclims_contractid'));
								newInvRec.setCurrentLineItemValue('item','custcol_muid',LineRec.getFieldValue('custrecord_synclims_muid'));
								newInvRec.setCurrentLineItemValue('item','custcol_dispositionid',LineRec.getFieldValue('custrecord_synclims_dispositionid'));
								newInvRec.setCurrentLineItemValue('item','custcol_subsettingid',LineRec.getFieldValue('custrecord_synclims_subsettingid'));
								newInvRec.setCurrentLineItemValue('item','custcol_stratumid',LineRec.getFieldValue('custrecord_synclims_stratumid'));
								newInvRec.setCurrentLineItemValue('item','custcol_formid',LineRec.getFieldValue('custrecord_synclims_formid'));
								newInvRec.setCurrentLineItemValue('item','custcol_speciesid',LineRec.getFieldValue('custrecord_synclims_speciesid'));
								newInvRec.setCurrentLineItemValue('item','custcol_interbatchid',LineRec.getFieldValue('custrecord_synclims_interbatchid'));
								
								newInvRec.commitLineItem('item');
								//Look into Purchase Price? harvest blk rd
								//Test withJordash - anc timber
							}
						}
					}
					
					newInvRec = nlapiSubmitRecord(newInvRec);
					
					for(k=0; k<ARResults.length; k++) {
						nlapiSubmitField('customrecord_synclims',ARResults[k].getValue('internalid'),'custrecord_synclims_syncstatus',4);
						nlapiSubmitField('customrecord_synclims',ARResults[k].getValue('internalid'),'custrecord_synclims_errmsg','Created Invoice record with Internal ID '+newInvRec);
						nlapiSubmitField('customrecord_synclims',ARResults[k].getValue('internalid'),'custrecord_synclims_nsid',newInvRec);
					}
					nlapiLogExecution('AUDIT','CALLSCHEDULEDSYNCLIMS','Invoice with Internal ID '+newInvRec+' has been created.');
					
					*/
				} else {
					//Process as AR Credit Memo
					for (k = 0; k < ARResults.length; k++) {
						nlapiSubmitField('customrecord_synclims', ARResults[k].getValue('internalid'), 'custrecord_synclims_syncstatus', 2); //Set to Processing to prevent multiple executions
					}

					var dateParts = SyncRecord.getFieldValue('custrecord_synclims_invoicedate');
					if (dateParts != null && dateParts != '') {
						dateParts = dateParts.substring(0, 10).split('/');
						tempDate = new Date(dateParts[2], dateParts[0] - 1, dateParts[1]);
					} else {
						throw nlapiCreateError('error', 'Credit Memo Date is blank - unable to process LIMS File');
					}

					newCredMemoRec = nlapiCreateRecord('creditmemo');
					newCredMemoRec.setFieldValue('customform', '160');
					nlapiLogExecution('AUDIT', 'tranid', SyncRecord.getFieldValue('custrecord_synclims_invoicenumber'))
					newCredMemoRec.setFieldValue('tranid', SyncRecord.getFieldValue('custrecord_synclims_invoicenumber'));
					tempCustomer = validateCustomer(SyncRecord.getFieldValue('custrecord_synclims_vendorid')); //Client Lookup based on 'LIMS ID' field on Client Record
					newCredMemoRec.setFieldValue('entity', tempCustomer);
					//newCredMemoRec.setFieldValue('taxtotal',SyncRecord.getFieldValue('custrecord_synclims_tax1')); //GST
					//newCredMemoRec.setFieldValue('tax2total',SyncRecord.getFieldValue('	custrecord_synclims_tax2')); //PST
					newCredMemoRec.setFieldValue('trandate', nlapiDateToString(tempDate, 'date')); //Invoice_Date
					//tempTerms = legacyValidateTerms(SyncRecord.getFieldValue('custrecord_synclims_paymentterms')); //validate by Match to Import Transaction
					//tempTerms = validateCustomerTerms(SyncRecord.getFieldValue('custrecord_synclims_paymentterms'),tempCustomer); //validate by Pull from Vendor
					//newCredMemoRec.setFieldValue('terms',tempTerms);
					//newCredMemoRec.setFieldValue('postingperiod') = ; //Current period based on current month, not transaction date
					//newCredMemoRec.setFieldValue('approvalstatus','2'); //Always APPROVED so posting period can be changed
					// newCredMemoRec.setFieldValue('memo', SyncRecord.getFieldValue('custrecord_synclims_invoicenumber'));
					newCredMemoRec.setFieldValue('memo', 'LIMS Import');

					tempSubsidiary = (SyncRecord.getFieldValue('custrecord_synclims_subsidiary') == '27' || SyncRecord.getFieldValue('custrecord_synclims_subsidiary') == 27) ? '2' : '1'; //27 is Timber (2), 28 is ANC (1)
					newCredMemoRec.setFieldValue('subsidiary', tempSubsidiary);
					tempLocation = (tempSubsidiary == '2' || tempSubsidiary == 2) ? '227' : '228'; //227 is ANC Timber Ltd., 228 is Alberta Newsprint Company
					newCredMemoRec.setFieldValue('location', tempLocation);
					newCredMemoRec.setFieldValue('custbody_limsid', '' + SyncRecord.getFieldValue('custrecord_synclims_invoicenumber')); //LIMS ID could be sync record ID or 'Type + Invoice No'
					newCredMemoRec.setFieldValue('custbody_paymentid', SyncRecord.getFieldValue('custrecord_synclims_paymentid'));

					newCredMemoRec.setFieldValue('custbody_lims_invoicedate', SyncRecord.getFieldValue('custrecord_synclims_invoicedate'));
					newCredMemoRec.setFieldValue('custbody_lims_grosstotal', SyncRecord.getFieldValue('custrecord_synclims_grosstotal'));
					newCredMemoRec.setFieldValue('custbody_lims_reference', SyncRecord.getFieldValue('custrecord_synclims_reference'));
					newCredMemoRec.setFieldValue('custbody_lims_filetype', SyncRecord.getFieldValue('custrecord_synclims_filetype'));
					newCredMemoRec.setFieldValue('custbody_lims_batchtype', SyncRecord.getFieldValue('custrecord_synclims_batchtype'));
					newCredMemoRec.setFieldValue('custbody_lims_batchid', SyncRecord.getFieldValue('custrecord_synclims_batchid'));
					newCredMemoRec.setFieldValue('department', SyncRecord.getFieldValue('custrecord_synclims_dept'));
					setDueDate(newCredMemoRec, SyncRecord)

					//n=0; n<ARResults.length; n++
					var loopLimit = Math.min(ARResults.length, 3);
					var DeptCheck = {
						xyz: 0
					};
					var addedLines = [];
					var limsReference = "LIMS Import";
					for (n = 0; n < ARResults.length; n++) {
						LineRec = nlapiLoadRecord('customrecord_synclims', ARResults[n].getValue('internalid'));

						if (addedLines.indexOf(LineRec.getFieldValue('id')) == -1) {
							//var DeptCheck = {xyz:'a'};
							//testAmount = parseInt(LineRec.getFieldValue('custrecord_synclims_amount'));
							testAccount = LineRec.getFieldValue('custrecord_synclims_account');
							//testAmount >= 0 &&
							if (testAccount != '3100' && testAccount != 3100 &&
								testAccount != '1300' && testAccount != 1300 &&
								testAccount != '3700' && testAccount != 3700 &&
								testAccount != '1240' && testAccount != 1240 &&
								testAccount != '1241' && testAccount != 1241) {

								tempItem = validateItem(LineRec.getFieldValue('custrecord_synclims_account'), LineRec.getFieldValue('custrecord_synclims_phase') + '---' + LineRec.getFieldValue('custrecord_synclims_subphase'), fileType);
								if (tempItem != 'SKIPITEM') {
									if (tempItem == '-1') {
										throw nlapiCreateError('error', 'Unable to find Matching LIMS ID ' + LineRec.getFieldValue('custrecord_synclims_phase') + '---' + LineRec.getFieldValue('custrecord_synclims_subphase') + '---' + LineRec.getFieldValue('custrecord_synclims_account'));
									}
									nlapiLogExecution('debug', 'Item Values ' + n + ': test lookupVal', 'tempItem: ' + tempItem + ' lookupVal: ' + LineRec.getFieldValue('custrecord_synclims_phase') + '---' + LineRec.getFieldValue('custrecord_synclims_subphase'));


									newCredMemoRec.selectNewLineItem('item');
									newCredMemoRec.setCurrentLineItemValue('item', 'item', tempItem); //Validate Item by searching phase+'---'+subphase on item 'LIMS ID'
									nlapiLogExecution('AUDIT', 'validateDept Input', 'Dim1: ' + LineRec.getFieldValue('custrecord_synclims_dim1') + ' Dim2: ' + LineRec.getFieldValue('custrecord_synclims_dim2') + ' Dim3: ' + LineRec.getFieldValue('custrecord_synclims_account'));
									var tempDept = validateDepartment(LineRec.getFieldValue('custrecord_synclims_dim1'), LineRec.getFieldValue('custrecord_synclims_dim2'), LineRec.getFieldValue('custrecord_synclims_account'), DeptCheck);
									nlapiLogExecution('AUDIT', 'validateDept Output', tempDept[1]);
									DeptCheck = tempDept[0];

									tempVendor = validateCustomer(SyncRecord.getFieldValue('custrecord_synclims_vendorid')); //Vendor Lookup based on 'LIMS ID' field on Vendor Record
									newCredMemoRec.setCurrentLineItemValue('item', 'entity', tempVendor);

									newCredMemoRec.setCurrentLineItemValue('item', 'department', tempDept[1]);
									newCredMemoRec.setCurrentLineItemValue('item', 'description', 'LIMS Inter BatchID ' + LineRec.getFieldValue('custrecord_synclims_interbatchid') + ' Reference: ' + LineRec.getFieldValue('custrecord_synclims_reference'));
									newCredMemoRec.setCurrentLineItemValue('item', 'quantity', LineRec.getFieldValue('custrecord_synclims_quantity')); //Quantity
									//newCredMemoRec.setCurrentLineItemValue('units') = ; //pulled from item
									cleanAmount = (LineRec.getFieldValue('custrecord_synclims_amount')).replace(/,/g, "");
									var tempAmount = parseFloat(cleanAmount);
									var tempRate = (tempAmount / LineRec.getFieldValue('custrecord_synclims_quantity')).toFixed(2);
									newCredMemoRec.setCurrentLineItemValue('item', 'rate', tempRate); //Amount/Quantity
									newCredMemoRec.setCurrentLineItemValue('item', 'amount', tempAmount); //Amount
									newCredMemoRec.setCurrentLineItemValue('item', 'taxcode', '82'); //Hardcoded to Nontaxable
									newCredMemoRec.setCurrentLineItemValue('item', 'location', '227'); //Hardcoded to ANC Timber for Sub 2, 113 for Sub 1
									newCredMemoRec.setCurrentLineItemValue('item', 'custcol_blockref', LineRec.getFieldValue('custrecord_synclims_dim4'));
									newCredMemoRec.setCurrentLineItemValue('item', 'custcol_costallocadmin', LineRec.getFieldValue('custrecord_synclims_costallocadmin'));
									newCredMemoRec.setCurrentLineItemValue('item', 'custcol_costallocgenlogging', LineRec.getFieldValue('custrecord_synclims_costallocgenlog'));
									testStatQuantity = LineRec.getFieldValue('custrecord_synclims_statquantity');
									statQuantity = (testStatQuantity != null && testStatQuantity != '') ? parseFloat(testStatQuantity.replace(/,/g, "")).toFixed(2) : '';
									newCredMemoRec.setCurrentLineItemValue('item', 'custcol_statquantity', statQuantity);

									newCredMemoRec.setCurrentLineItemValue('item', 'custcol_contractid', LineRec.getFieldValue('custrecord_synclims_contractid'));
									newCredMemoRec.setCurrentLineItemValue('item', 'custcol_muid', LineRec.getFieldValue('custrecord_synclims_muid'));
									newCredMemoRec.setCurrentLineItemValue('item', 'custcol_dispositionid', LineRec.getFieldValue('custrecord_synclims_dispositionid'));
									newCredMemoRec.setCurrentLineItemValue('item', 'custcol_subsettingid', LineRec.getFieldValue('custrecord_synclims_subsettingid'));
									newCredMemoRec.setCurrentLineItemValue('item', 'custcol_stratumid', LineRec.getFieldValue('custrecord_synclims_stratumid'));
									newCredMemoRec.setCurrentLineItemValue('item', 'custcol_formid', LineRec.getFieldValue('custrecord_synclims_formid'));
									newCredMemoRec.setCurrentLineItemValue('item', 'custcol_speciesid', LineRec.getFieldValue('custrecord_synclims_speciesid'));
									newCredMemoRec.setCurrentLineItemValue('item', 'custcol_interbatchid', LineRec.getFieldValue('custrecord_synclims_interbatchid'));


									newCredMemoRec.setCurrentLineItemValue('item', 'custcol_lims_ratemethod', LineRec.getFieldValue('custrecord_synclims_ratemethod'));
									newCredMemoRec.setCurrentLineItemValue('item', 'custcol_lims_rate', LineRec.getFieldValue('custrecord_synclims_rate'));
									newCredMemoRec.setCurrentLineItemValue('item', 'custcol_lims_dim1', LineRec.getFieldValue('custrecord_synclims_dim1'));
									newCredMemoRec.setCurrentLineItemValue('item', 'custcol_lims_dim2', LineRec.getFieldValue('custrecord_synclims_dim2'));
									newCredMemoRec.setCurrentLineItemValue('item', 'custcol_lims_dim3', LineRec.getFieldValue('custrecord_synclims_dim3'));
									newCredMemoRec.setCurrentLineItemValue('item', 'custcol_lims_dim4', LineRec.getFieldValue('custrecord_synclims_dim4'));
									newCredMemoRec.setCurrentLineItemValue('item', 'custcol_lims_dim5', LineRec.getFieldValue('custrecord_synclims_dim5'));
									newCredMemoRec.setCurrentLineItemValue('item', 'custcol_lims_dim6', LineRec.getFieldValue('custrecord_synclims_dim6'));
									newCredMemoRec.setCurrentLineItemValue('item', 'custcol_lims_dim7', LineRec.getFieldValue('custrecord_synclims_dim7'));

									newCredMemoRec.setCurrentLineItemValue('item', 'custcol_lims_statuom', LineRec.getFieldValue('custrecord_synclims_statuom'));
									newCredMemoRec.setCurrentLineItemValue('item', 'custcol_lims_sourceid', LineRec.getFieldValue('custrecord_synclims_sourceid'));

									newCredMemoRec.commitLineItem('item');
									addedLines.push(LineRec.getFieldValue('id'));
									/** Look into Purchase Price? harvest blk rd **/
									//Test withJordash - anc timber
									
				                    limsReference = LineRec.getFieldValue('custrecord_synclims_reference')
								}
							}
						}
					}
					
                    newCredMemoRec.setFieldValue('memo', limsReference); //07302021 Rodmar c/o Katherine
                    newCredMemoRec.setFieldValue('custbody_lims_reference', limsReference); //07312021 make sure lims reference is set as well, this one is used for global searching Rodmar c/o Katherine

					//Add GST Line
					newCredMemoRec.selectNewLineItem('item');
					newCredMemoRec.setCurrentLineItemValue('item', 'item', '12296'); //Hardcoded 'GST Adjustment' Item
					newCredMemoRec.setCurrentLineItemValue('item', 'department', '2'); //Hardcoded to Department 0000
					newCredMemoRec.setCurrentLineItemValue('item', 'description', 'LIMS Inter BatchID ' + LineRec.getFieldValue('custrecord_synclims_interbatchid'));
					newCredMemoRec.setCurrentLineItemValue('item', 'quantity', 1);
					//newCredMemoRec.setCurrentLineItemValue('units') = ; //pulled from item
					cleanTax = (SyncRecord.getFieldValue('custrecord_synclims_tax2')).replace(/,/g, "");
					taxAmount = Math.abs(parseFloat(cleanTax));
					newCredMemoRec.setCurrentLineItemValue('item', 'rate', taxAmount); //Amount/Quantity
					newCredMemoRec.setCurrentLineItemValue('item', 'amount', taxAmount); //Amount
					newCredMemoRec.setCurrentLineItemValue('item', 'taxcode', '82'); //Hardcoded to Nontaxable
					newCredMemoRec.setCurrentLineItemValue('item', 'location', '227'); //Hardcoded to ANC Timber for Sub 2, 113 for Sub 1);
					newCredMemoRec.commitLineItem('item');

					newCredMemoID = nlapiSubmitRecord(newCredMemoRec);

					for (k = 0; k < ARResults.length; k++) {
						nlapiSubmitField('creditmemo', newCredMemoID, 'tranid', SyncRecord.getFieldValue('custrecord_synclims_invoicenumber'));
						nlapiSubmitField('creditmemo', newCredMemoID, 'memo', 'LIMS Import');
						nlapiSubmitField('creditmemo', newCredMemoID, 'custbody_lims_filetype', SyncRecord.getFieldValue('custrecord_synclims_filetype'));
						nlapiSubmitField('creditmemo', newCredMemoID, 'custbody_lims_batchtype', SyncRecord.getFieldValue('custrecord_synclims_batchtype'));
						nlapiSubmitField('creditmemo', newCredMemoID, 'custbody_lims_batchid', SyncRecord.getFieldValue('custrecord_synclims_batchid'));


						nlapiSubmitField('customrecord_synclims', ARResults[k].getValue('internalid'), 'custrecord_synclims_syncstatus', 4);
						nlapiSubmitField('customrecord_synclims', ARResults[k].getValue('internalid'), 'custrecord_synclims_errmsg', 'Created Credit Memo record with Internal ID ' + newCredMemoID);
						nlapiSubmitField('customrecord_synclims', ARResults[k].getValue('internalid'), 'custrecord_synclims_nsid', newCredMemoID);
						nlapiSubmitField('customrecord_synclims', ARResults[k].getValue('internalid'), 'custrecord_trans_ref', newCredMemoID);
					}
					nlapiLogExecution('AUDIT', 'CALLSCHEDULEDSYNCLIMS', 'Credit memo with Internal ID ' + newCredMemoID + ' has been created.');
				}
			} else {
				throw nlapiCreateError('error', 'No Rows were found for LIMS AR Invoice Number ' + SyncRecord.getFieldValue('custrecord_synclims_invoicenumber'));
			}
		} else if (batchType != 'ACCRUAL' && (fileType == 'GL' || fileType == 'JV')) { //Create Intercompany Journal Entry
			//Create Intercompany Journal Entry
			//throw nlapiCreateError('error','Not ready to create GL/JV records.');

			/** NEED TO CHECK FOR DUPLICATES **/

			var filters = [
				['custrecord_synclims_invoicenumber', 'is', SyncRecord.getFieldValue('custrecord_synclims_invoicenumber')], 'AND',
				[
					['custrecord_synclims_filetype', 'is', 'GL'], 'OR', ['custrecord_synclims_filetype', 'is', 'JV']
				], 'AND',
				['custrecord_synclims_syncstatus', 'noneof', '4']
			];
			var columns = [];
			columns[0] = new nlobjSearchColumn('internalid');
			GLResults = nlapiSearchRecord('customrecord_synclims', null, filters, columns);

			if (GLResults) {

				for (j = 0; j < GLResults.length; j++) {
					nlapiSubmitField('customrecord_synclims', GLResults[j].getValue('internalid'), 'custrecord_synclims_syncstatus', 2); //Set to Processing to prevent multiple executions
				}

				var dateParts = SyncRecord.getFieldValue('custrecord_synclims_invoicedate');
				if (dateParts != null && dateParts != '') {
					dateParts = dateParts.substring(0, 10).split('/');
					tempDate = new Date(dateParts[2], dateParts[0] - 1, dateParts[1]);
				} else {
					throw nlapiCreateError('error', 'Invoice Date is blank - unable to process LIMS File');
				}

				newJournalRec = nlapiCreateRecord('journalentry');
				newJournalRec.setFieldValue('customform', 152);
				nlapiLogExecution('audit', 'CUSTOMFORM', newJournalRec.getFieldValue('customform'));
				newJournalRec.setFieldValue('tranid', SyncRecord.getFieldValue('custrecord_synclims_invoicenumber'));
				//tempVendor = validateVendor(SyncRecord.getFieldValue('custrecord_synclims_vendorid')); //Vendor Lookup based on 'LIMS ID' field on Vendor Record
				//newJournalRec.setFieldValue('entity',tempVendor);
				//newJournalRec.setFieldValue('usertotal') = ; //SHOULD AUTOCALCULATE Gross_Total + Tax
				//newJournalRec.setFieldValue('taxtotal',SyncRecord.getFieldValue('custrecord_synclims_tax1')); //GST
				//newJournalRec.setFieldValue('tax2total',SyncRecord.getFieldValue('	custrecord_synclims_tax2')); //PST
				newJournalRec.setFieldValue('trandate', nlapiDateToString(tempDate, 'date')); //Invoice_Date
				//tempTerms = legacyValidateTerms(SyncRecord.getFieldValue('custrecord_synclims_paymentterms')); //validate by Match to Import Transaction
				//tempTerms = validateTerms(SyncRecord.getFieldValue('custrecord_synclims_paymentterms'),tempVendor); //validate by Pull from Vendor
				//newJournalRec.setFieldValue('terms',tempTerms);
				/**newJournalRec.setFieldValue('postingperiod') = ; //Current period based on current month, not transaction date**/
				//newJournalRec.setFieldValue('approvalstatus','2'); //Always APPROVED so posting period can be changed
				// newJournalRec.setFieldValue('memo','LIMS Import'); //Hardcode to LIMS IMPORT
				newJournalRec.setFieldValue('memo', 'LIMS Import');
				tempSubsidiary = (SyncRecord.getFieldValue('custrecord_synclims_subsidiary') == '27' || SyncRecord.getFieldValue('custrecord_synclims_subsidiary') == 27) ? '2' : '1'; //27 is Timber (2), 28 is ANC (1)
				newJournalRec.setFieldValue('subsidiary', tempSubsidiary);
				newJournalRec.setFieldValue('custbody_limsid', '' + SyncRecord.getFieldValue('custrecord_synclims_invoicenumber')); //LIMS ID could be sync record ID or 'Type + Invoice No'
				newJournalRec.setFieldValue('custbody_paymentid', SyncRecord.getFieldValue('custrecord_synclims_paymentid'));

				newJournalRec.setFieldValue('custbody_lims_invoicedate', SyncRecord.getFieldValue('custrecord_synclims_invoicedate'));
				newJournalRec.setFieldValue('custbody_lims_grosstotal', SyncRecord.getFieldValue('custrecord_synclims_grosstotal'));
				newJournalRec.setFieldValue('custbody_lims_reference', SyncRecord.getFieldValue('custrecord_synclims_reference'));
				newJournalRec.setFieldValue('custbody_lims_filetype', SyncRecord.getFieldValue('custrecord_synclims_filetype'));
				newJournalRec.setFieldValue('custbody_lims_batchtype', SyncRecord.getFieldValue('custrecord_synclims_batchtype'));
				newJournalRec.setFieldValue('custbody_lims_batchid', SyncRecord.getFieldValue('custrecord_synclims_batchid'));
				newJournalRec.setFieldValue('department', SyncRecord.getFieldValue('custrecord_synclims_dept'));
				setDueDate(newJournalRec, SyncRecord)

				var DeptCheck = {
					xyz: 'a'
				};
				var addedLines = [];

                var limsReference = "LIMS Import";
                
				for (n = 0; n < GLResults.length; n++) {
					/** SOURCE OF ERRORS - SOMETIMES LINES OTHER THAN CORRECT LINE PERSIST AND ARE REPROCESSED. TO INVESTIGATE **/
					LineRec = nlapiLoadRecord('customrecord_synclims', GLResults[n].getValue('internalid'));

					if (addedLines.indexOf(LineRec.getFieldValue('id')) == -1) {
						//LineRec.getFieldValue('custrecord_synclims_amount') >= 0 &&
						if (LineRec.getFieldValue('custrecord_synclims_account') != '3100' &&
							LineRec.getFieldValue('custrecord_synclims_account') != 3100 &&
							LineRec.getFieldValue('custrecord_synclims_account') != '1300' &&
							LineRec.getFieldValue('custrecord_synclims_account') != 1300) {
							nlapiLogExecution('audit', 'Processing Line Start', 'LineRec: ' + LineRec.getFieldValue('id') + ' GLResults.length: ' + GLResults.length + ' counter: ' + n + ' Account: ' + LineRec.getFieldValue('custrecord_synclims_account') + ' Amount: ' + LineRec.getFieldValue('custrecord_synclims_amount'));
							newJournalRec.selectNewLineItem('line');
							tempItem = validateItem(LineRec.getFieldValue('custrecord_synclims_account'), LineRec.getFieldValue('custrecord_synclims_phase') + '---' + LineRec.getFieldValue('custrecord_synclims_subphase'), fileType);
							tempAccount = nlapiLookupField('serviceitem', tempItem, 'expenseaccount');
							//if (tempItem == '-1') {throw nlapiCreateError('error','Unable to find Matching LIMS ID '+LineRec.getFieldValue('custrecord_synclims_phase')+'---'+LineRec.getFieldValue('custrecord_synclims_subphase')+'---'+LineRec.getFieldValue('custrecord_synclims_account')); }
							//nlapiLogExecution('debug','line Values '+n+': test lookupVal','tempItem: '+tempItem+' lookupVal: '+LineRec.getFieldValue('custrecord_synclims_phase')+'---'+LineRec.getFieldValue('custrecord_synclims_subphase'));
							//newJournalRec.setCurrentLineItemValue('line','item',tempItem); //Validate Item by searching phase+'---'+subphase on item 'LIMS ID'
							newJournalRec.setCurrentLineItemValue('line', 'account', tempAccount);

							// tempVendor = validateVendor(SyncRecord.getFieldValue('custrecord_synclims_vendorid')); //Vendor Lookup based on 'LIMS ID' field on Vendor Record
							// newJournalRec.setCurrentLineItemValue('item', 'entity', tempVendor);

							nlapiLogExecution('AUDIT', 'validateDept Input', 'Dim1: ' + LineRec.getFieldValue('custrecord_synclims_dim1') + ' Dim2: ' + LineRec.getFieldValue('custrecord_synclims_dim2') + ' Account: ' + LineRec.getFieldValue('custrecord_synclims_account'));
							var tempDept = validateDepartment(LineRec.getFieldValue('custrecord_synclims_dim1'), LineRec.getFieldValue('custrecord_synclims_dim2'), LineRec.getFieldValue('custrecord_synclims_account'), DeptCheck);
							nlapiLogExecution('AUDIT', 'validateDept Output', JSON.stringify(tempDept));
							DeptCheck = tempDept[0];
							newJournalRec.setCurrentLineItemValue('line', 'department', tempDept[1]);
							newJournalRec.setCurrentLineItemValue('line', 'description', 'LIMS Inter BatchID ' + LineRec.getFieldValue('custrecord_synclims_interbatchid') + ' GLResults ID: ' + GLResults[n].getValue('internalid') + ' LineRec: ' + LineRec.getFieldValue('id') + ' Reference: ' + LineRec.getFieldValue('custrecord_synclims_reference'));
							newJournalRec.setCurrentLineItemValue('line', 'memo', 'LIMS Inter BatchID ' + LineRec.getFieldValue('custrecord_synclims_interbatchid') + ' GLResults ID: ' + GLResults[n].getValue('internalid') + ' LineRec: ' + LineRec.getFieldValue('id') + ' Reference: ' + LineRec.getFieldValue('custrecord_synclims_reference'));
							//newJournalRec.setCurrentLineItemValue('line','quantity',LineRec.getFieldValue('custrecord_synclims_quantity')); //Quantity
							//newJournalRec.setCurrentLineItemValue('units') = ; //pulled from item
							//newJournalRec.setCurrentLineItemValue('line','rate',LineRec.getFieldValue('custrecord_synclims_rate')); //Amount/Quantity
							newJournalRec.setCurrentLineItemValue('line', 'debit', LineRec.getFieldValue('custrecord_synclims_amount')); //Amount
							//newJournalRec.setCurrentLineItemValue('line','taxcode','82'); //Hardcoded to Nontaxable
							newJournalRec.setCurrentLineItemValue('line', 'location', '227'); //Hardcoded to ANC Timber for Sub 2, 113 for Sub 1
							newJournalRec.setCurrentLineItemValue('line', 'custcol_blockref', LineRec.getFieldValue('custrecord_synclims_sourceid')); //Dim5 or custrecord_synclims_sourceid
							newJournalRec.setCurrentLineItemValue('line', 'custcol_costallocadmin', LineRec.getFieldValue('custrecord_synclims_costallocadmin'));
							newJournalRec.setCurrentLineItemValue('line', 'custcol_costallocgenlogging', LineRec.getFieldValue('custrecord_synclims_costallocgenlog'));
							testStatQuantity = LineRec.getFieldValue('custrecord_synclims_statquantity');
							statQuantity = (testStatQuantity != null && testStatQuantity != '') ? parseFloat(testStatQuantity.replace(/,/g, "")).toFixed(2) : '';
							newJournalRec.setCurrentLineItemValue('line', 'custcol_statquantity', statQuantity);

							newJournalRec.setCurrentLineItemValue('line', 'custcol_contractid', LineRec.getFieldValue('custrecord_synclims_contractid'));
							newJournalRec.setCurrentLineItemValue('line', 'custcol_muid', LineRec.getFieldValue('custrecord_synclims_muid'));
							newJournalRec.setCurrentLineItemValue('line', 'custcol_dispositionid', LineRec.getFieldValue('custrecord_synclims_dispositionid'));
							newJournalRec.setCurrentLineItemValue('line', 'custcol_subsettingid', LineRec.getFieldValue('custrecord_synclims_subsettingid'));
							newJournalRec.setCurrentLineItemValue('line', 'custcol_stratumid', LineRec.getFieldValue('custrecord_synclims_stratumid'));
							newJournalRec.setCurrentLineItemValue('line', 'custcol_formid', LineRec.getFieldValue('custrecord_synclims_formid'));
							newJournalRec.setCurrentLineItemValue('line', 'custcol_speciesid', LineRec.getFieldValue('custrecord_synclims_speciesid'));
							newJournalRec.setCurrentLineItemValue('line', 'custcol_interbatchid', LineRec.getFieldValue('custrecord_synclims_interbatchid'));


							nlapiLogExecution('audit', 'DIM VALUES', LineRec.getFieldValue('custrecord_synclims_dim1') + " : " + LineRec.getFieldValue('custrecord_synclims_dim2'));
							newJournalRec.setCurrentLineItemValue('line', 'custcol_lims_ratemethod', LineRec.getFieldValue('custrecord_synclims_ratemethod'));
							newJournalRec.setCurrentLineItemValue('line', 'custcol_lims_rate', LineRec.getFieldValue('custrecord_synclims_rate'));
							newJournalRec.setCurrentLineItemValue('line', 'custcol_lims_dim1', LineRec.getFieldValue('custrecord_synclims_dim1'));
							newJournalRec.setCurrentLineItemValue('line', 'custcol_lims_dim2', LineRec.getFieldValue('custrecord_synclims_dim2'));
							newJournalRec.setCurrentLineItemValue('line', 'custcol_lims_dim3', LineRec.getFieldValue('custrecord_synclims_dim3'));
							newJournalRec.setCurrentLineItemValue('line', 'custcol_lims_dim4', LineRec.getFieldValue('custrecord_synclims_dim4'));
							newJournalRec.setCurrentLineItemValue('line', 'custcol_lims_dim5', LineRec.getFieldValue('custrecord_synclims_dim5'));
							newJournalRec.setCurrentLineItemValue('line', 'custcol_lims_dim6', LineRec.getFieldValue('custrecord_synclims_dim6'));
							newJournalRec.setCurrentLineItemValue('line', 'custcol_lims_dim7', LineRec.getFieldValue('custrecord_synclims_dim7'));

							newJournalRec.setCurrentLineItemValue('line', 'custcol_lims_statuom', LineRec.getFieldValue('custrecord_synclims_statuom'));
							newJournalRec.setCurrentLineItemValue('line', 'custcol_lims_sourceid', LineRec.getFieldValue('custrecord_synclims_sourceid'));

							newJournalRec.commitLineItem('line');
							addedLines.push(LineRec.getFieldValue('id'));
							
			                limsReference = LineRec.getFieldValue('custrecord_synclims_reference')
						}
					}
				}
				
                newJournalRec.setFieldValue('memo', limsReference); //07302021 Rodmar c/o Katherine
              	newJournalRec.setFieldValue('custbody_lims_reference', limsReference); //07312021 make sure lims reference is set as well, this one is used for global searching Rodmar c/o Katherine

				newJournalID = nlapiSubmitRecord(newJournalRec);

				for (k = 0; k < GLResults.length; k++) {
					nlapiSubmitField('journalentry', newJournalID, 'custbody_lims_filetype', SyncRecord.getFieldValue('custrecord_synclims_filetype'));
					nlapiSubmitField('journalentry', newJournalID, 'custbody_lims_batchtype', SyncRecord.getFieldValue('custrecord_synclims_batchtype'));
					nlapiSubmitField('journalentry', newJournalID, 'custbody_lims_batchid', SyncRecord.getFieldValue('custrecord_synclims_batchid'));

					nlapiSubmitField('customrecord_synclims', GLResults[k].getValue('internalid'), 'custrecord_synclims_syncstatus', 4);
					nlapiSubmitField('customrecord_synclims', GLResults[k].getValue('internalid'), 'custrecord_synclims_errmsg', 'Created Journal Entry record with Internal ID ' + newJournalID);
					nlapiSubmitField('customrecord_synclims', GLResults[k].getValue('internalid'), 'custrecord_synclims_nsid', newJournalID);
					nlapiSubmitField('customrecord_synclims', GLResults[k].getValue('internalid'), 'custrecord_trans_ref', newJournalID);
				}
				nlapiLogExecution('AUDIT', 'CALLSCHEDULEDSYNCLIMS', 'Journal Entry with Internal ID ' + newJournalID + ' has been created.');
			} else {
				throw nlapiCreateError('error', 'No Rows were found for LIMS GL/JV Invoice Number ' + SyncRecord.getFieldValue('custrecord_synclims_invoicenumber'));
			}
		} else if (batchType == 'ACCRUAL') { //Create Journal Entry
			//Create Intercompany Journal Entry
			//throw nlapiCreateError('error','Not ready to create GL/JV records.');

			/** NEED TO CHECK FOR DUPLICATES **/

			var filters = [
				['custrecord_synclims_interbatchid', 'is', SyncRecord.getFieldValue('custrecord_synclims_interbatchid')], 'AND',
				['custrecord_synclims_filetype', 'is', SyncRecord.getFieldValue('custrecord_synclims_filetype')], 'AND',
				['custrecord_synclims_batchtype', 'is', 'ACCRUAL'], 'AND',
				['custrecord_synclims_syncstatus', 'noneof', '4']
			];
			var columns = [];
			columns[0] = new nlobjSearchColumn('internalid');
			GLResults = nlapiSearchRecord('customrecord_synclims', null, filters, columns);

			if (GLResults) {

				for (j = 0; j < GLResults.length; j++) {
					nlapiSubmitField('customrecord_synclims', GLResults[j].getValue('internalid'), 'custrecord_synclims_syncstatus', 2); //Set to Processing to prevent multiple executions
				}

				var dateParts = SyncRecord.getFieldValue('custrecord_synclims_invoicedate');
				var tempDateReverse = new Date();
				if (dateParts != null && dateParts != '') {
					dateParts = dateParts.substring(0, 10).split('/');
					tempDate = new Date(dateParts[2], dateParts[0] - 1, dateParts[1]);
					nlapiLogExecution('audit', 'dateparts', dateParts[2] + " : " + dateParts[0] + " : " + dateParts[1]);
					nlapiLogExecution('audit', 'tempdate', tempDate.getDate() + " : " + (tempDate.getMonth() + 1) + " : " + tempDate.getFullYear());
					tempDateReverse = new Date(tempDate.getFullYear(), (tempDate.getMonth() + 1), 01)
					nlapiLogExecution('audit', 'tempDateReverse', tempDateReverse);
				} else {
					throw nlapiCreateError('error', 'Invoice Date is blank - unable to process LIMS File');
				}

				newJournalRec = nlapiCreateRecord('journalentry');
				newJournalRec.setFieldValue('customform', 152);
				nlapiLogExecution('audit', 'CUSTOMFORM', newJournalRec.getFieldValue('customform'));
				newJournalRec.setFieldValue('tranid', SyncRecord.getFieldValue('custrecord_synclims_invoicenumber'));
				//tempVendor = validateVendor(SyncRecord.getFieldValue('custrecord_synclims_vendorid')); //Vendor Lookup based on 'LIMS ID' field on Vendor Record
				//newJournalRec.setFieldValue('entity',tempVendor);
				//newJournalRec.setFieldValue('usertotal') = ; //SHOULD AUTOCALCULATE Gross_Total + Tax
				//newJournalRec.setFieldValue('taxtotal',SyncRecord.getFieldValue('custrecord_synclims_tax1')); //GST
				//newJournalRec.setFieldValue('tax2total',SyncRecord.getFieldValue('	custrecord_synclims_tax2')); //PST
				newJournalRec.setFieldValue('trandate', nlapiDateToString(tempDate, 'date')); //Invoice_Date
				//tempTerms = legacyValidateTerms(SyncRecord.getFieldValue('custrecord_synclims_paymentterms')); //validate by Match to Import Transaction
				//tempTerms = validateTerms(SyncRecord.getFieldValue('custrecord_synclims_paymentterms'),tempVendor); //validate by Pull from Vendor
				//newJournalRec.setFieldValue('terms',tempTerms);
				/**newJournalRec.setFieldValue('postingperiod') = ; //Current period based on current month, not transaction date**/
				//newJournalRec.setFieldValue('approvalstatus','2'); //Always APPROVED so posting period can be changed
				// newJournalRec.setFieldValue('memo','LIMS Import ACCRUAL--'+SyncRecord.getFieldValue('custrecord_synclims_filetype')+'--'+SyncRecord.getFieldValue('custrecord_synclims_interbatchid')); //Hardcode to LIMS IMPORT
				newJournalRec.setFieldValue('memo', 'LIMS Import');
				tempSubsidiary = (SyncRecord.getFieldValue('custrecord_synclims_subsidiary') == '27' || SyncRecord.getFieldValue('custrecord_synclims_subsidiary') == 27) ? '2' : '1'; //27 is Timber (2), 28 is ANC (1)
				newJournalRec.setFieldValue('subsidiary', tempSubsidiary);
				newJournalRec.setFieldValue('custbody_limsid', 'ACCRUAL--' + SyncRecord.getFieldValue('custrecord_synclims_filetype') + '--' + SyncRecord.getFieldValue('custrecord_synclims_interbatchid')); //LIMS ID could be sync record ID or 'Type + Invoice No'
				newJournalRec.setFieldValue('custbody_paymentid', SyncRecord.getFieldValue('custrecord_synclims_paymentid'));

				newJournalRec.setFieldValue('custbody_lims_invoicedate', SyncRecord.getFieldValue('custrecord_synclims_invoicedate'));
				newJournalRec.setFieldValue('custbody_lims_grosstotal', SyncRecord.getFieldValue('custrecord_synclims_grosstotal'));
				newJournalRec.setFieldValue('custbody_lims_reference', SyncRecord.getFieldValue('custrecord_synclims_reference'));
				newJournalRec.setFieldValue('custbody_lims_filetype', SyncRecord.getFieldValue('custrecord_synclims_filetype'));
				newJournalRec.setFieldValue('custbody_lims_batchtype', SyncRecord.getFieldValue('custrecord_synclims_batchtype'));
				newJournalRec.setFieldValue('custbody_lims_batchid', SyncRecord.getFieldValue('custrecord_synclims_batchid'));
				newJournalRec.setFieldValue('department', SyncRecord.getFieldValue('custrecord_synclims_dept'));
				setDueDate(newJournalRec, SyncRecord)

				if (fileType == 'JV') {
					newJournalRec.setFieldValue('reversaldate', nlapiDateToString(tempDateReverse, 'date'));
					newJournalRec.setFieldValue('reversaldefer', 'T');
				}


				var DeptCheck = {
					xyz: 'a'
				};
				var addedLines = [];
				var difference = 0;
				for (n = 0; n < GLResults.length; n++) {
					/** SOURCE OF ERRORS - SOMETIMES LINES OTHER THAN CORRECT LINE PERSIST AND ARE REPROCESSED. TO INVESTIGATE **/
					LineRec = nlapiLoadRecord('customrecord_synclims', GLResults[n].getValue('internalid'));

					if (addedLines.indexOf(LineRec.getFieldValue('id')) == -1) {
						//Account 3100 should be account 3112
						nlapiLogExecution('audit', 'name', LineRec.getFieldValue('name'));
						nlapiLogExecution('audit', 'Processing Line Start', 'LineRec: ' + LineRec.getFieldValue('id') + ' GLResults.length: ' + GLResults.length + ' counter: ' + n + ' Account: ' + LineRec.getFieldValue('custrecord_synclims_account') + ' Amount: ' + LineRec.getFieldValue('custrecord_synclims_amount'));
						newJournalRec.selectNewLineItem('line');
						//Map Account 3100 to Account 3112 (Internal ID 907)
						nlapiLogExecution('audit', 'account', LineRec.getFieldValue('custrecord_synclims_account'));
						if (LineRec.getFieldValue('custrecord_synclims_account') == 1241 || LineRec.getFieldValue('custrecord_synclims_account') == 3100 || LineRec.getFieldValue('custrecord_synclims_account') == 1300) {
							tempAccount = '907';
						} else {
							tempItem = validateItem(LineRec.getFieldValue('custrecord_synclims_account'), LineRec.getFieldValue('custrecord_synclims_phase') + '---' + LineRec.getFieldValue('custrecord_synclims_subphase'), fileType);
							nlapiLogExecution('audit', 'tempItem', tempItem);
							if (tempItem == "SKIPITEM") {
								tempAccount = LineRec.getFieldValue('custrecord_synclims_account');
							} else {
								tempAccount = nlapiLookupField('serviceitem', tempItem, 'expenseaccount');
							}

							nlapiLogExecution('audit', 'tempAccount', tempAccount);
						}
						//if (tempItem == '-1') {throw nlapiCreateError('error','Unable to find Matching LIMS ID '+LineRec.getFieldValue('custrecord_synclims_phase')+'---'+LineRec.getFieldValue('custrecord_synclims_subphase')+'---'+LineRec.getFieldValue('custrecord_synclims_account')); }
						//nlapiLogExecution('debug','line Values '+n+': test lookupVal','tempItem: '+tempItem+' lookupVal: '+LineRec.getFieldValue('custrecord_synclims_phase')+'---'+LineRec.getFieldValue('custrecord_synclims_subphase'));
						//newJournalRec.setCurrentLineItemValue('line','item',tempItem); //Validate Item by searching phase+'---'+subphase on item 'LIMS ID'
						newJournalRec.setCurrentLineItemValue('line', 'account', tempAccount);
						nlapiLogExecution('AUDIT', 'validateDept Input', 'Dim1: ' + LineRec.getFieldValue('custrecord_synclims_dim1') + ' Dim2: ' + LineRec.getFieldValue('custrecord_synclims_dim2') + ' Account: ' + LineRec.getFieldValue('custrecord_synclims_account'));
						var tempDept = validateDepartment(LineRec.getFieldValue('custrecord_synclims_dim1'), LineRec.getFieldValue('custrecord_synclims_dim2'), LineRec.getFieldValue('custrecord_synclims_account'), DeptCheck);
						nlapiLogExecution('AUDIT', 'validateDept Output', JSON.stringify(tempDept));
						DeptCheck = tempDept[0];
						newJournalRec.setCurrentLineItemValue('line', 'department', tempDept[1]);
						newJournalRec.setCurrentLineItemValue('line', 'description', 'LIMS Inter BatchID ' + LineRec.getFieldValue('custrecord_synclims_interbatchid') + ' GLResults ID: ' + GLResults[n].getValue('internalid') + ' LineRec: ' + LineRec.getFieldValue('id') + ' Reference: ' + LineRec.getFieldValue('custrecord_synclims_reference'));
						newJournalRec.setCurrentLineItemValue('line', 'memo', 'LIMS Inter BatchID ' + LineRec.getFieldValue('custrecord_synclims_interbatchid') + ' GLResults ID: ' + GLResults[n].getValue('internalid') + ' LineRec: ' + LineRec.getFieldValue('id') + ' Reference: ' + LineRec.getFieldValue('custrecord_synclims_reference'));
						//newJournalRec.setCurrentLineItemValue('line','quantity',LineRec.getFieldValue('custrecord_synclims_quantity')); //Quantity
						//newJournalRec.setCurrentLineItemValue('units') = ; //pulled from item
						//newJournalRec.setCurrentLineItemValue('line','rate',LineRec.getFieldValue('custrecord_synclims_rate')); //Amount/Quantity
						//amountPreTax = ((0 - LineRec.getFieldValue('custrecord_synclims_rate')) * LineRec.getFieldValue('custrecord_synclims_quantity')).toFixed(2);
						amountRaw = parseFloat(LineRec.getFieldValue('custrecord_synclims_amount')).toFixed(2);
						newJournalRec.setCurrentLineItemValue('line', 'debit', amountRaw); //Amount
						//newJournalRec.setCurrentLineItemValue('line','debit',amountPreTax); //Amount
						//difference = 0 + difference + parseFloat(amountPreTax);
						difference = 0 + difference + parseFloat(amountRaw);
						//newJournalRec.setCurrentLineItemValue('line','taxcode','82'); //Hardcoded to Nontaxable
						newJournalRec.setCurrentLineItemValue('line', 'location', '227'); //Hardcoded to ANC Timber for Sub 2, 113 for Sub 1
						newJournalRec.setCurrentLineItemValue('line', 'custcol_blockref', LineRec.getFieldValue('custrecord_synclims_sourceid')); //Dim5 or custrecord_synclims_sourceid
						newJournalRec.setCurrentLineItemValue('line', 'custcol_costallocadmin', LineRec.getFieldValue('custrecord_synclims_costallocadmin'));
						newJournalRec.setCurrentLineItemValue('line', 'custcol_costallocgenlogging', LineRec.getFieldValue('custrecord_synclims_costallocgenlog'));
						testStatQuantity = LineRec.getFieldValue('custrecord_synclims_statquantity');
						statQuantity = (testStatQuantity != null && testStatQuantity != '') ? parseFloat(testStatQuantity.replace(/,/g, "")).toFixed(2) : '';
						newJournalRec.setCurrentLineItemValue('line', 'custcol_statquantity', statQuantity);

						newJournalRec.setCurrentLineItemValue('line', 'custcol_contractid', LineRec.getFieldValue('custrecord_synclims_contractid'));
						newJournalRec.setCurrentLineItemValue('line', 'custcol_muid', LineRec.getFieldValue('custrecord_synclims_muid'));
						newJournalRec.setCurrentLineItemValue('line', 'custcol_dispositionid', LineRec.getFieldValue('custrecord_synclims_dispositionid'));
						newJournalRec.setCurrentLineItemValue('line', 'custcol_subsettingid', LineRec.getFieldValue('custrecord_synclims_subsettingid'));
						newJournalRec.setCurrentLineItemValue('line', 'custcol_stratumid', LineRec.getFieldValue('custrecord_synclims_stratumid'));
						newJournalRec.setCurrentLineItemValue('line', 'custcol_formid', LineRec.getFieldValue('custrecord_synclims_formid'));
						newJournalRec.setCurrentLineItemValue('line', 'custcol_speciesid', LineRec.getFieldValue('custrecord_synclims_speciesid'));
						newJournalRec.setCurrentLineItemValue('line', 'custcol_interbatchid', LineRec.getFieldValue('custrecord_synclims_interbatchid'));

						nlapiLogExecution('audit', 'DIM VALUES', LineRec.getFieldValue('custrecord_synclims_dim1') + " : " + LineRec.getFieldValue('custrecord_synclims_dim2'));
						newJournalRec.setCurrentLineItemValue('line', 'custcol_lims_ratemethod', LineRec.getFieldValue('custrecord_synclims_ratemethod'));
						newJournalRec.setCurrentLineItemValue('line', 'custcol_lims_rate', LineRec.getFieldValue('custrecord_synclims_rate'));
						newJournalRec.setCurrentLineItemValue('line', 'custcol_lims_dim1', LineRec.getFieldValue('custrecord_synclims_dim1'));
						newJournalRec.setCurrentLineItemValue('line', 'custcol_lims_dim2', LineRec.getFieldValue('custrecord_synclims_dim2'));
						newJournalRec.setCurrentLineItemValue('line', 'custcol_lims_dim3', LineRec.getFieldValue('custrecord_synclims_dim3'));
						newJournalRec.setCurrentLineItemValue('line', 'custcol_lims_dim4', LineRec.getFieldValue('custrecord_synclims_dim4'));
						newJournalRec.setCurrentLineItemValue('line', 'custcol_lims_dim5', LineRec.getFieldValue('custrecord_synclims_dim5'));
						newJournalRec.setCurrentLineItemValue('line', 'custcol_lims_dim6', LineRec.getFieldValue('custrecord_synclims_dim6'));
						newJournalRec.setCurrentLineItemValue('line', 'custcol_lims_dim7', LineRec.getFieldValue('custrecord_synclims_dim7'));

						newJournalRec.setCurrentLineItemValue('line', 'custcol_lims_statuom', LineRec.getFieldValue('custrecord_synclims_statuom'));
						newJournalRec.setCurrentLineItemValue('line', 'custcol_lims_sourceid', LineRec.getFieldValue('custrecord_synclims_sourceid'));

						newJournalRec.commitLineItem('line');
						addedLines.push(LineRec.getFieldValue('id'));
					}
				}

				//Add adjustment line
				difference = parseFloat(0 - difference).toFixed(2);
				if (difference != '0.00' && parseFloat(difference) != 0) {
					newJournalRec.selectNewLineItem('line');
					newJournalRec.setCurrentLineItemValue('line', 'account', '3208'); //Hardcoded to Account 9490
					newJournalRec.setCurrentLineItemValue('line', 'department', '43'); //Hardcoded to Department 1110
					newJournalRec.setCurrentLineItemValue('line', 'description', 'LIMS Inter BatchID ' + LineRec.getFieldValue('custrecord_synclims_interbatchid') + ' ADJUSTMENT LINE ' + difference);
					newJournalRec.setCurrentLineItemValue('line', 'debit', difference); //Amount
					newJournalRec.setCurrentLineItemValue('line', 'location', '227'); //Hardcoded to ANC Timber for Sub 2, 113 for Sub 1
					newJournalRec.setCurrentLineItemValue('line', 'custcol_interbatchid', LineRec.getFieldValue('custrecord_synclims_interbatchid'));
					newJournalRec.setCurrentLineItemValue('line', 'custcol_lims_ratemethod', LineRec.getFieldValue('custrecord_synclims_ratemethod'));
					newJournalRec.setCurrentLineItemValue('line', 'custcol_lims_rate', LineRec.getFieldValue('custrecord_synclims_rate'));
					// newJournalRec.setCurrentLineItemValue('line', 'custcol_lims_dim1', LineRec.getFieldValue('custrecord_synclims_dim1'));
					// newJournalRec.setCurrentLineItemValue('line', 'custcol_lims_dim2', LineRec.getFieldValue('custrecord_synclims_dim2'));
					// newJournalRec.setCurrentLineItemValue('line', 'custcol_lims_dim3', LineRec.getFieldValue('custrecord_synclims_dim3'));
					// newJournalRec.setCurrentLineItemValue('line', 'custcol_lims_dim4', LineRec.getFieldValue('custrecord_synclims_dim4'));
					// newJournalRec.setCurrentLineItemValue('line', 'custcol_lims_dim5', LineRec.getFieldValue('custrecord_synclims_dim5'));
					// newJournalRec.setCurrentLineItemValue('line', 'custcol_lims_dim6', LineRec.getFieldValue('custrecord_synclims_dim6'));
					// newJournalRec.setCurrentLineItemValue('line', 'custcol_lims_dim7', LineRec.getFieldValue('custrecord_synclims_dim7'));

					newJournalRec.commitLineItem('line');
				}

				//Submit Record
				newJournalID = nlapiSubmitRecord(newJournalRec);

				for (k = 0; k < GLResults.length; k++) {
					nlapiSubmitField('journalentry', newJournalID, 'custbody_lims_filetype', SyncRecord.getFieldValue('custrecord_synclims_filetype'));
					nlapiSubmitField('journalentry', newJournalID, 'custbody_lims_batchtype', SyncRecord.getFieldValue('custrecord_synclims_batchtype'));
					nlapiSubmitField('journalentry', newJournalID, 'custbody_lims_batchid', SyncRecord.getFieldValue('custrecord_synclims_batchid'));

					nlapiSubmitField('customrecord_synclims', GLResults[k].getValue('internalid'), 'custrecord_synclims_syncstatus', 4);
					nlapiSubmitField('customrecord_synclims', GLResults[k].getValue('internalid'), 'custrecord_synclims_errmsg', 'Created Journal Entry record with Internal ID ' + newJournalID);
					nlapiSubmitField('customrecord_synclims', GLResults[k].getValue('internalid'), 'custrecord_synclims_nsid', newJournalID);
					nlapiSubmitField('customrecord_synclims', GLResults[k].getValue('internalid'), 'custrecord_trans_ref', newJournalID);
				}
				nlapiLogExecution('AUDIT', 'CALLSCHEDULEDSYNCLIMS', 'Journal Entry with Internal ID ' + newJournalID + ' has been created.');
			} else {
				throw nlapiCreateError('error', 'No Rows were found for LIMS Accrual Invoice Number ' + SyncRecord.getFieldValue('custrecord_synclims_invoicenumber'));
			}
		} else {
			throw nlapiCreateError('error', 'File Type of ' + fileType + ' not recognized. This file cannot be processed.');
		}
	} catch (e) {
		nlapiLogExecution('error', 'ScheduledSyncLIMS() has encountered an error.', errText(e));
		nlapiSubmitField('customrecord_synclims', SyncLIMSID, 'custrecord_synclims_syncstatus', '3'); //Set SyncStatus = Error
		nlapiSubmitField('customrecord_synclims', SyncLIMSID, 'custrecord_synclims_errmsg', 'Error Details: ' + errText(e));
		tempRetries = nlapiLookupField('customrecord_synclims', SyncLIMSID, 'custrecord_synclims_retries');
		nlapiSubmitField('customrecord_synclims', SyncLIMSID, 'custrecord_synclims_retries', (tempRetries - 1));
		nlapiLogExecution('debug', 'CALLSCHEDULESYNCLIMS', 'ScheduledSyncLIMS has been updated with ' + (tempRetries - 1) + ' retries.');
	}
	findNextRecord();
}

function findNextRecord() {
	//Check for additional records to add to processing queue
	var filters = [
		['custrecord_synclims_syncstatus', 'anyof', [1, 3, 5]], 'AND',
		['custrecord_synclims_retries', 'greaterthan', 0]
	];

	var columns = [];
	columns[0] = new nlobjSearchColumn('internalid');

	var searchResults = nlapiSearchRecord('customrecord_synclims', null, filters, columns);

	if (searchResults) {
		var nextSyncWMID = searchResults[0].getValue('internalid');
		nlapiLogExecution('AUDIT', 'CALLSCHEDULEDSYNCLIMS', 'Additional records to sync found. Queueing ' + nextSyncWMID);
		var newParams = {
			'custscript_synclimsid': nextSyncWMID
		};
		var ScheduleStatus = nlapiScheduleScript(script_id, null, newParams); //Deployment is empty so that script selects first available deployment
		if (ScheduleStatus == 'QUEUED') {
			nlapiSubmitField('customrecord_synclims', nextSyncWMID, '	custrecord_synclims_syncstatus', '6');
		} //Else no available deployments - remaining records will be caught by periodic retry script
	} else {
		nlapiLogExecution('AUDIT', 'CALLSCHEDULEDSYNCLIMS', 'No records to sync found.');
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
		txt = 'NLAPI Error: Record ID :: ' + _internalId + ' :: ' + _e.getCode() + ' :: ' + _e.getDetails() + ' :: ' + _e.getStackTrace().join(', ');
	} else {
		//this is generic javascript error
		txt = 'JavaScript/Other Error: Record ID :: ' + _internalId + ' :: ' + _e.toString() + ' : ' + _e.stack;
	}
	return txt;
}

function validateItem(acct, item, fileType) {
	if (acct == '1300' || acct == 1300 || acct == '3700' || acct == 3700) {
		return 'SKIPITEM'; //Tax Line - Skip Processing
	}

	if (acct == '1231' || acct == 1231) {
		if (fileType == 'AP') {
			return '17774';
		} else if (fileType == 'AR') {
			return '17361';
		} else {
			throw nlapiCreateError('error', 'Invalid fileType ' + fileType + ' for acct 1231. Correct item could not be determined by validateItem');
		}
	}
  
  	if (acct == '1232' || acct == 1232) {
		if (fileType == 'AP') {
			return '118900';
		} else if (fileType == 'AR') {
			return '17361';
		} else {
			throw nlapiCreateError('error', 'Invalid fileType ' + fileType + ' for acct 1232. Correct item could not be determined by validateItem');
		}
	}

	if (acct == '3440' || acct == 3440) {
		return '12418';
		//lookupVal = 'MISC---HOLDBACK---3440';
	} else {
		lookupVal = item + '---' + acct;
	}

	nlapiLogExecution('audit', 'lookupVal', JSON.stringify(lookupVal));
	var filters = [
		['custitem_limsrefid', 'is', lookupVal]
	];
	var columns = [];
	columns[0] = new nlobjSearchColumn('internalid');
	results = nlapiSearchRecord('serviceitem', null, filters, columns);
	nlapiLogExecution('audit', 'results', JSON.stringify(results));
	if (results) {
		return results[0].getValue('internalid');
	} else {
		throw nlapiCreateError('error', 'Unable to find Matching LIMS ID ' + item + '---' + acct);
	}
}

function validateDepartment(dim1, dim2, accountNum, DeptCheck) {
	if (accountNum == '3100' || accountNum == 3100) {
		return [DeptCheck, '2', 'Return1']; //Hardcode to Account 0000
	}
	//Use Dim2 as that is unique. Otherwise use Dim1 when Dim2 missing (Dim1 should be parent account, Dim2 is child account)
	lookupVal = getLookupValue(dim1, dim2);

	if (lookupVal == '0' || lookupVal == 0 || lookupVal == '0000' || lookupVal == 0 || lookupVal == '<>' || lookupVal == '<>-<>') {
		return [DeptCheck, '2', 'Return6'];
	}

	nlapiLogExecution('AUDIT', 'Final lookupVal', 'lookupVal: ' + lookupVal + ' Dim1: ' + dim1 + ' Dim2: ' + dim2);
	if (lookupVal in DeptCheck) {
		return [DeptCheck, DeptCheck[lookupVal], 'Return2'];
	} else {
		//['name','startswith',lookupVal]
		//Check using LIMS ID of Department
		var filters = [
			['custrecord138', 'is', lookupVal]
		];
		var columns = [];
		columns[0] = new nlobjSearchColumn('internalid');
		results = nlapiSearchRecord('department', null, filters, columns);
		if (results) {
			for (n = 0; n < results.length; n++) {
				DeptCheck[lookupVal] = results[n].getValue('internalid');
				return [DeptCheck, results[n].getValue('internalid'), 'Return3'];
			}
			return [DeptCheck, '2', 'Return4']; /** TEST VAL **/
			//throw nlapiCreateError('error','Departments found but no Department for Subsidiary 2 for Department Code '+lookupVal);
		} else {
			return [DeptCheck, '2', 'Return5'];
			//throw nlapiCreateError('error','No Matching Deparments for Department Code '+lookupVal);
		}
	}
}

function getLookupValue(dim1, dim2) {
	if (dim1 != null) {
		clean1 = dim1.replace(/[^A-Za-z0-9]+/g, "");
	} else {
		clean1 = '';
	}
	if (dim2 != null) {
		partial2 = dim2.replace(/[^A-Za-z0-9]+/g, "");
		clean2 = partial2.replace(/(ltgt)+/g, "");
	} else {
		clean2 = '';
	}
	//nlapiLogExecution('DEBUG','LookupValCheck','dim1: '+dim1+' dim2: '+dim2+' clean1: '+clean1+' clean2: '+clean2);
	switch (clean2) {
		case '<>':
		case '<>-<>':
		case '':
		case null:
			return clean1;
	}

	if (clean2.search(/[A-Za-z0-9]/) > -1) {
		if (clean2 == 0 || clean2 == '000') {
			return clean1;
		} else {
			return clean1 + '---' + clean2;
		}
	}

	return clean1;
}

function validateVendor(LIMSVendorID) {
	var filters = [
		['custentity_limsid', 'is', LIMSVendorID]
	];
	var columns = [];
	columns[0] = new nlobjSearchColumn('internalid');
	results = nlapiSearchRecord('vendor', null, filters, columns);
	if (results) {
		return results[0].getValue('internalid');
	} else {
		throw nlapiCreateError('error', 'Unable to find matching Vendor for Vendor ID ' + LIMSVendorID);
	}
}

function validateCustomer(LIMSVendorID) {
	var filters = [
		['custentity_limsid', 'is', LIMSVendorID]
	];
	var columns = [];
	columns[0] = new nlobjSearchColumn('internalid');
	results = nlapiSearchRecord('customer', null, filters, columns);
	if (results) {
		return results[0].getValue('internalid');
	} else {
		throw nlapiCreateError('error', 'Unable to find Customer in function validateCustomer for LIMSVendorID ' + LIMSVendorID);
	}
}

//Validate Terms by Match on Import
function legacyValidateTerms(termCode) {
	var filters = [
		['name', 'is', termCode], 'OR',
		['name', 'is', termCode.replace("NET", "Net ")]
	];
	var columns = [];
	columns[0] = new nlobjSearchColumn('internalid');
	results = nlapiSearchRecord('term', null, filters, columns);
	if (results) {
		return results[0].getValue('internalid');
	} else {
		return '-1';
	}
}

//Validate Terms by Pull from Vendor
function validateTerms(termCode, vendorID) {
	vendorTerms = nlapiLookupField('vendor', vendorID, 'terms');
	if (vendorTerms != '' && vendorTerms != null) {
		return vendorTerms;
	} else {
		return '-1';
	}
}

function setDueDate(recObj, sourceRecObj)
{
	//added on 11/18/2024 per KL's request where duedate is made mandatory - rodmar
	var sourceDueDate = sourceRecObj.getFieldValue('custrecord_synclims_duedate');
	if(sourceDueDate)
	{
		recObj.setFieldValue('duedate', sourceDueDate);
	}
}

//Validate Terms by Pull from Customer
function validateCustomerTerms(termCode, customerID) {
	vendorTerms = nlapiLookupField('customer', customerID, 'terms');
	if (vendorTerms != '' && vendorTerms != null) {
		return vendorTerms;
	} else {
		return '-1';
	}
}