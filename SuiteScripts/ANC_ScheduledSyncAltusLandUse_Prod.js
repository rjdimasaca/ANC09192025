/* @Scheduled Script on Manual Deployment

Processes SyncLandUseRecord

Custom Record: https://system.na2.netsuite.com/app/common/custom/custrecordentrylist.nl?rectype=322
Production: https://system.na2.netsuite.com/app/common/scripting/script.nl?id=491
2018.11.24 - removed Grand Total Validation
2018.11.30 - removed attention_to in billing address
2019.08.28 - set reforestaion amount to body field custbody_reforestationcharges, as requested by Laura c/o Tin - TC10ROD

*/

/**
 * @dev_version : 1.0.1 - TC10ROD updated try catch block to successfully handle errors, store error message, update status
 * 				  1.0.2 - TC10ROD get rid of setting internalid 09172019
 * 				  1.0.3 - TC10ROD fix error in address search involving blank values 12232020PH
 * 
 * 
 */

var TIMBER_LAND_USE_INVOICE = '147';
var TIMBER_LAND_USE_CREDIT_MEMO = '159';
var ACCOUNT_LAND_USE = '296'; //1241 : A/R Sub - Land Use
var TAX_RATE = '5';

var ALTUS_LAND_USE = 'customrecord_syncaltuslu';
var FIELD_SYNC_STATUS = 'custrecord_syncaltuslu_syncstatus';
var FIELD_ERROR_MESSAGE = 'custrecord_syncaltuslu_errmsg';
var FIELD_RETRIES = 'custrecord_syncaltuslu_retries';
var FIELD_NSID = 'custrecord_syncaltuslu_nsid';
var FIELD_NSLINK = 'custrecord_syncaltuslu_nslink';

var context = nlapiGetContext();
var SyncMSID = context.getSetting('SCRIPT','custscript_syncaltuslanduseid');

function getAltusData(altusId)
{
	var altusData = {};
	altusData[FIELD_RETRIES] = 0;
	try
	{
		if(altusId)
		{
			var altusRec = nlapiLoadRecord(ALTUS_LAND_USE, altusId);
			var retriesCount = altusRec.getFieldValue(FIELD_RETRIES);
			altusData[FIELD_RETRIES] = retriesCount
//			if(Number(retriesCount) <= 0)
//			{
//				var fields = ['custrecord_syncwmloadhead_errormessage','custrecord_syncwmloadhead_syncstatus'];
//				var values = ['Error Details: Header record has processed 3 times. Number of retries has been exceeded','3'];
//				nlapiSubmitField('customrecord_syncwmloadheader',SyncWMID,fields,values);
//				return false;
//			}
		}
	}
	catch(e)
	{
		nlapiLogExecution("ERROR", "ERROR in function getAltusData", e.message);
	}
	return altusData;
}

function ScheduledSyncAltusLandUse(params){

    var statusArr = [];
    statusArr[0] = syncStatus.NEW;
    statusArr[1] = syncStatus.ERROR;
    statusArr[2] = syncStatus.TO_REPROCESS;
    statusArr[3] = syncStatus.QUEUED;

    nlapiLogExecution('DEBUG', '000 Sync Start', 'Altus Land Use ID: ' + SyncMSID);

    var altusRecordsArr = getAltusRecords(statusArr, SyncMSID);

    if(!isBlank(altusRecordsArr)){
        for(var i in altusRecordsArr){
        	
        	try
        	{
        		var altusId = altusRecordsArr[i];
                var SyncAltusLandUseRecord = '';
                var IS_ERROR = false;

                if(!isBlank(altusId)){

                    nlapiLogExecution('DEBUG', '001 Sync Process', 'Altus Land Use ID: ' + altusId);

                    nlapiSubmitField(ALTUS_LAND_USE, altusId, FIELD_SYNC_STATUS, syncStatus.PROCESSING);
                    nlapiSubmitField(ALTUS_LAND_USE, altusId, FIELD_ERROR_MESSAGE,'');

                    SyncAltusLandUseRecord = nlapiLoadRecord(ALTUS_LAND_USE, altusId);
                    var altusLandUseObj = ALTUS_LAND_USE_OBJ(SyncAltusLandUseRecord);

                    if(!isBlank(altusLandUseObj)){
                        altusLandUseObj = removeEmpty(altusLandUseObj);
                        var companynum = altusLandUseObj.id_company;

                        //Mapping
                        if(!isBlank(companynum)){
                            var _entity = getCustomerIDByAltusID(companynum);
                            if(isBlank(_entity)){
                                //Error
                                nlapiSubmitField(ALTUS_LAND_USE, altusId, FIELD_SYNC_STATUS, syncStatus.ERROR);
                                nlapiSubmitField(ALTUS_LAND_USE, altusId, FIELD_ERROR_MESSAGE,'Altus ID: ' + companynum +', not found in Customer Record');
                                
                              //TC10ROD apply retry logic
                                var altusData = getAltusData(altusId)
                                nlapiSubmitField(ALTUS_LAND_USE, altusId, FIELD_RETRIES, (Number(altusData[FIELD_RETRIES]) - 1));
//                                nlapiSubmitField(ALTUS_LAND_USE, altusId, FIELD_RETRIES,0);
                                IS_ERROR = true;

                                nlapiLogExecution('DEBUG', '001-666 Sync ERROR', 'Altus ID: ' + companynum +', not found in Customer Record');

                            }
                            else{
                                altusLandUseObj.entity = _entity;
                            }
                        }
                        else{
                            nlapiSubmitField(ALTUS_LAND_USE, altusId, FIELD_SYNC_STATUS, syncStatus.ERROR);
                            nlapiSubmitField(ALTUS_LAND_USE, altusId, FIELD_ERROR_MESSAGE, 'Altus ID: is null');
                          //TC10ROD apply retry logic
                            var altusData = getAltusData(altusId)
                            nlapiSubmitField(ALTUS_LAND_USE, altusId, FIELD_RETRIES, (Number(altusData[FIELD_RETRIES]) - 1));
//                            nlapiSubmitField(ALTUS_LAND_USE, altusId, FIELD_RETRIES,0);
                            IS_ERROR = true;
                            nlapiLogExecution('DEBUG', '001-666 Sync ERROR', 'altusId with Internal ID ' + altusId + ' Altus ID: is null');
                        }

                        if(!IS_ERROR) {

                            //region ITEM CHARGES
                            var items = [];
                            //Get All Items
                            if (!isBlank(altusLandUseObj.conif_total)) {
                                var item = getItemIDByFieldName('conif_total');
                                var amount = altusLandUseObj.conif_total;
                                if (isNaN(parseFloat(amount))) {
                                    amount = '0.00';
                                }
                                items.push({
                                    'item': item,
                                    'amount': amount
                                });
                            }
                            if (!isBlank(altusLandUseObj.decid_total)) {
                                var item = getItemIDByFieldName('decid_total');
                                var amount = altusLandUseObj.decid_total;
                                if (isNaN(parseFloat(amount))) {
                                    amount = '0.00';
                                }
                                items.push({
                                    'item': item,
                                    'amount': amount
                                });
                            }
                            if (!isBlank(altusLandUseObj.gis_inventory)) {
                                var item = getItemIDByFieldName('gis_inventory');
                                var amount = altusLandUseObj.gis_inventory;
                                if (isNaN(parseFloat(amount))) {
                                    amount = '0.00';
                                }
                                items.push({
                                    'item': item,
                                    'amount': amount
                                });
                            }
                            //TC10ROD remove this logic as requested by LAURA c/o Tin 08282019
                            /*if (!isBlank(altusLandUseObj.reforestation_cha)) {
                                var item = getItemIDByFieldName('reforestation_cha');
                                var amount = altusLandUseObj.reforestation_cha;
                                if (isNaN(parseFloat(amount))) {
                                    amount = '0.00';
                                }
                                items.push({
                                    'item': item,
                                    'amount': amount
                                });
                            }*/
                            if (!isBlank(altusLandUseObj.other_fee)) {
                                var item = getItemIDByFieldName('other_fee');
                                var amount = altusLandUseObj.other_fee;
                                if (isNaN(parseFloat(amount))) {
                                    amount = '0.00';
                                }
                                items.push({
                                    'item': item,
                                    'amount': amount
                                });
                            }
                            if (!isBlank(altusLandUseObj.other_fee2)) {
                                var item = getItemIDByFieldName('other_fee2');
                                var amount = altusLandUseObj.other_fee2;
                                if (isNaN(parseFloat(amount))) {
                                    amount = '0.00';
                                }
                                items.push({
                                    'item': item,
                                    'amount': amount
                                });
                            }
                            if (!isBlank(altusLandUseObj.specified_damages)) {
                                var item = getItemIDByFieldName('specified_damages');
                                var amount = altusLandUseObj.specified_damages;
                                if (isNaN(parseFloat(amount))) {
                                    amount = '0.00';
                                }
                                items.push({
                                    'item': item,
                                    'amount': amount
                                });
                            }
                            if (!isBlank(altusLandUseObj.crown_conif)) {
                                var item = getItemIDByFieldName('crown_conif');
                                var amount = altusLandUseObj.crown_conif;
                                if (isNaN(parseFloat(amount))) {
                                    amount = '0.00';
                                }
                                items.push({
                                    'item': item,
                                    'amount': amount
                                });
                            }
                            if (!isBlank(altusLandUseObj.crown_decid)) {
                                var item = getItemIDByFieldName('crown_decid');
                                var amount = altusLandUseObj.crown_decid;
                                if (isNaN(parseFloat(amount))) {
                                    amount = '0.00';
                                }
                                items.push({
                                    'item': item,
                                    'amount': amount
                                });
                            }
                            if (!isBlank(altusLandUseObj.cancel_fee)) {
                                var item = getItemIDByFieldName('cancel_fee');
                                var amount = altusLandUseObj.cancel_fee;
                                if (isNaN(parseFloat(amount))) {
                                    amount = '0.00';
                                }
                                items.push({
                                    'item': item,
                                    'amount': amount
                                });
                            }
                            //endregion ITEM CHARGES

                            nlapiLogExecution('DEBUG', '002 Sync Items JSON Altus ID: ' + altusId, JSON.stringify(items));

                            var cancellation = altusLandUseObj.cancellation;

                            if (isBlank(cancellation)||(!isBlank(cancellation)&&(cancellation.toUpperCase()=='NO'))){//check if empty or if this is NO

                                //nlapiLogExecution('AUDIT', 'JSON', JSON.stringify(altusLandUseObj));
                                //Create Invoice

                                var invoiceRecord = nlapiCreateRecord('invoice');

                                //region DEFAULTS
                                invoiceRecord.setFieldValue('customform', TIMBER_LAND_USE_INVOICE);
                                invoiceRecord.setFieldValue('account', ACCOUNT_LAND_USE);
                                //endregion DEFAULTS

                                //region DETAILS INVOICE
                                for (var key in mappingInvoice) {
                                    if (!isBlank(altusLandUseObj[key])) {
                                        invoiceRecord.setFieldValue(mappingInvoice[key], altusLandUseObj[key]);
                                    }
                                    nlapiLogExecution('DEBUG', '003 Sync Mapping Altus ID: ' + altusId, 'Field: ' + mappingInvoice[key] + ' | Value: ' + altusLandUseObj[key]);
                                }

                                if(!isBlank(altusLandUseObj.altkey)){
                                    invoiceRecord.setFieldValue('custbody1', altusLandUseObj.altkey);
                                }

                                if (!isBlank(altusLandUseObj.invoice_num)) {
                                	//TC10ROD get rid of externalid so it wouldnt be treated as duplicate as externalid doesnt have any dependencies
//                                    invoiceRecord.setFieldValue('externalid', altusLandUseObj.invoice_num + '_ALTUSLU_INV');
                                    invoiceRecord.setFieldValue('memo', altusLandUseObj.invoice_num);
                                    invoiceRecord.setFieldValue('custbody_altus_id_search', altusLandUseObj.invoice_num);
                                }
                                var comments = '';
                                if (!isBlank(altusLandUseObj.comments)) {
                                    comments += altusLandUseObj.comments;
                                }
                                comments += ' ';
                                if (!isBlank(altusLandUseObj.previous_ownershi)) {
                                    comments += altusLandUseObj.previous_ownershi;
                                }
                                if (!isBlank(altusLandUseObj.comments)) {
                                    invoiceRecord.setFieldValue('custbody_syncaltuslu_comments', comments);
                                }
                                if(!isBlank(altusLandUseObj.batch_id)){
                                    invoiceRecord.setFieldValue('custbody_altus_batch_id', altusLandUseObj.batch_id);
                                }
                                //endregion DETAILS INVOICE

                                //region ADDRESS INVOICE

                                //Search for existing Address
                                var addressInternalId = getCustomerAddress(altusLandUseObj.entity, altusLandUseObj.province, 'CA', altusLandUseObj.postalcode, altusLandUseObj.city, altusLandUseObj.address);

                                if (isBlank(addressInternalId)) {

                                    var billAddr1 = '';
                                    if (!isBlank(altusLandUseObj.suite)) {
                                        billAddr1 += altusLandUseObj.suite;
                                    }
                                    if (!isBlank(altusLandUseObj.address)) {
                                        if (billAddr1) {
                                            billAddr1 += ' ';
                                        }
                                        billAddr1 += altusLandUseObj.address;
                                    }
                                    if (!isBlank(altusLandUseObj.attention_to)) {
                                        invoiceRecord.setFieldValue('custbody_syncaltuslu_attn_to', altusLandUseObj.attention_to);
                                    }
                                    invoiceRecord.setFieldValue('billaddr1', billAddr1);
                                    invoiceRecord.setFieldValue('billcity', altusLandUseObj.city);
                                    invoiceRecord.setFieldValue('billstate', altusLandUseObj.province);
                                    invoiceRecord.setFieldValue('billcountry', 'CA');
                                    invoiceRecord.setFieldValue('billzip', altusLandUseObj.postalcode);
                                }
                                else {
                                    invoiceRecord.setFieldValue('billaddresslist', addressInternalId);
                                }
                                //endregion ADDRESS INVOICE

                                //region ITEM LINES INVOICE
                                var totalValidator = [];
                                for (var i in items) {

                                    var taxAmt = parseFloat(items[i].amount) * .05;
                                    totalValidator.push({
                                        'amount': items[i].amount,
                                        'tax': taxAmt
                                    });

                                    var line = 1 + parseInt(i);

                                    nlapiLogExecution('DEBUG', '004 Sync Set Line Item Altus ID: ' + altusId, 'Line: ' + line + ' | Amount: ' + items[i].amount + ' | Item: ' + items[i].item);

                                    invoiceRecord.setLineItemValue('item', 'item', line, items[i].item);
                                    invoiceRecord.setLineItemValue('item', 'price', line, '-1');
                                    invoiceRecord.setLineItemValue('item', 'quantity', line, '1');
                                    invoiceRecord.setLineItemValue('item', 'rate', line, items[i].amount);
                                    invoiceRecord.setLineItemValue('item', 'amount', line, items[i].amount);


                                    //nlapiLogExecution('DEBUG', 'TC10LOGS ATTEMPT : taxid lookup attempt', JSON.stringify(items[i]));
                                    var taxId = nlapiLookupField('item', items[i].item, 'taxschedule');
                                    //nlapiLogExecution('DEBUG', 'TC10LOGS SUCCESS : taxid lookup success', JSON.stringify(items[i]));

                                    if(taxId == '1'){
                                        //Non Taxable
                                        invoiceRecord.setLineItemValue('item', 'taxcode', line, '82');
                                    }

                                    /**
                                     if (!isBlank(altusLandUseObj.gst) && !isBlank(altusLandUseObj.province)) {

                                        var state = altusLandUseObj.province;
                                        var taxId = getTaxGroupGST(state, TAX_RATE);

                                        nlapiLogExecution('DEBUG', '005 Sync Tax Calculation Altus ID: ' + altusId, 'STATE: ' + state + ' | TAX ID: ' + taxId);

                                        if (!isBlank(taxId)) {
                                            invoiceRecord.setLineItemValue('item', 'taxcode', line, taxId);
                                        }
                                    }
                                     **/
                                }
                                //endregion ITEM LINES INVOICE

                                //region VALIDATE TOTAL AMOUNT INVOICE
                                var invoiceAmount = parseFloat(0.00);
                                for (var z in totalValidator) {
                                    invoiceAmount += parseFloat(totalValidator[z].amount) + parseFloat(totalValidator[z].tax);
                                }

                                nlapiLogExecution('DEBUG', '006 Sync Compare Amounts: ' + altusId, 'Invoice Amount: ' + invoiceAmount + ' | Grand Total: ' + altusLandUseObj.grand_total);
                                nlapiLogExecution('DEBUG', '007 Sync Invoice record', JSON.stringify(invoiceRecord));

                                //endregion VALIDATE TOTAL AMOUNT INVOICE

                                try {

                                    //if (invoiceAmount.toFixed(2) === altusLandUseObj.grand_total) {

                                	//TC10ROD 08282019 - set reforestaion amount to body field custbody_reforestationcharges, as requested by Laura c/o Tin
                                	if (!isBlank(altusLandUseObj.reforestation_cha)) {
                                        var amount = altusLandUseObj.reforestation_cha;
                                        if (isNaN(parseFloat(amount))) {
                                            amount = '0.00';
                                        }
                                        invoiceRecord.setFieldValue("custbody_reforestationcharges", amount);
                                        nlapiLogExecution("DEBUG", "custbody_reforestationcharges successfully set", JSON.stringify({amount : amount}))
                                    }
                                	
                                  var RecordID = "";
                                  nlapiLogExecution("DEBUG", "TC10 logs : attempt saving", JSON.stringify(invoiceRecord));
                                  try
                                    {
                                    RecordID = nlapiSubmitRecord(invoiceRecord);
                                    }
                                  catch(e)
                                    {
//                                	  nlapiSubmitField(ALTUS_LAND_USE, altusId, FIELD_SYNC_STATUS, syncStatus.PROCESSING);
//                                      nlapiSubmitField(ALTUS_LAND_USE, altusId, FIELD_ERROR_MESSAGE,'');
                                	  
                                	  nlapiSubmitField(ALTUS_LAND_USE,altusId,[FIELD_SYNC_STATUS, FIELD_ERROR_MESSAGE],[syncStatus.ERROR, "DUPLICATE RECORD, " + e.message]);
                                      nlapiLogExecution("ERROR", "ERROR in submitting invoiceRecord", e.message);
                                      continue;
                                    }
                                  nlapiLogExecution("DEBUG", "RecordID", RecordID)
                                    nlapiSubmitField('invoice', RecordID, 'custbody_syncaltuslu_link', altusId);
                                    var subsidiary = nlapiLookupField('invoice', RecordID, 'subsidiary');

                                    nlapiLogExecution('DEBUG', '008 Sync Contact Record', 'Contact Details | Entity:' + altusLandUseObj.entity + ' | Subsidiary: ' + subsidiary + ' | Attention: ' + altusLandUseObj.attention_to + ' | Email: ' + altusLandUseObj.email + ' | Record ID: ' + RecordID);

                                    try {
                                        createAttachContact(altusLandUseObj.entity, subsidiary, altusLandUseObj.attention_to, altusLandUseObj.email, RecordID);
                                    }
                                    catch(ex){
                                    	/*
                                    	//TODO why do nothing when caught error? - TC10ROD
                                    	//shall we keep it this way? is there any reason why script should proceed assigning INV:
                                    	//continue block added 09172019
                                    	*/
                                    	//continue;
                                    }
                                    
                                    //TC10ROD - consider success only if there is a valid RecordID
                                    if(RecordID)
                                    {
                                    	nlapiSubmitField(ALTUS_LAND_USE, altusId, FIELD_ERROR_MESSAGE, '');
                                        nlapiSubmitField(ALTUS_LAND_USE, altusId, FIELD_SYNC_STATUS, syncStatus.COMPLETE);
                                        nlapiSubmitField(ALTUS_LAND_USE, altusId, FIELD_NSID, 'INV: ' + RecordID);
                                        nlapiSubmitField(ALTUS_LAND_USE, altusId, FIELD_NSLINK, RecordID);
                                    }
                                    //}
                                    //else {
                                    /**
                                     nlapiSubmitField(ALTUS_LAND_USE, altusId, FIELD_SYNC_STATUS, syncStatus.ERROR);
                                     nlapiSubmitField(ALTUS_LAND_USE, altusId, FIELD_ERROR_MESSAGE, 'Total Invoice Amount: ' + invoiceAmount.toFixed(2) + ' does not match with Grand Total: ' + altusLandUseObj.grand_total);
                                     nlapiSubmitField(ALTUS_LAND_USE, altusId, FIELD_RETRIES, 0);
                                     IS_ERROR = true;
                                     **/
                                    //}
                                }
                                catch (ex) {
                                    nlapiSubmitField(ALTUS_LAND_USE, altusId, FIELD_SYNC_STATUS, syncStatus.ERROR);
                                    nlapiSubmitField(ALTUS_LAND_USE, altusId, FIELD_ERROR_MESSAGE, ex.getDetails());
                                  //TC10ROD apply retry logic
                                    var altusData = getAltusData(altusId)
                                    nlapiSubmitField(ALTUS_LAND_USE, altusId, FIELD_RETRIES, (Number(altusData[FIELD_RETRIES]) - 1));
//                                    nlapiSubmitField(ALTUS_LAND_USE, altusId, FIELD_RETRIES, 0);
                                    IS_ERROR = true;
                                    nlapiLogExecution('DEBUG', '007-666 Sync ERROR', ex instanceof nlobjError ? ex.getCode() : 'CUSTOM_ERROR_CODE', ex instanceof nlobjError ? ex.getDetails() : 'JavaScript Error: ' + (ex.message !== null ? ex.message : ex));
                                }
                            }
                            //!!!***!!! originally else 
                            else if(!isBlank(cancellation)&&(cancellation.toUpperCase()=='YES')) {//!!!***!!!This was a catch all, refactored to only accept Yes values
                                //Credit Memo
                                var creditMemoRecord = nlapiCreateRecord('creditmemo');
                                creditMemoRecord.setFieldValue('customform', TIMBER_LAND_USE_CREDIT_MEMO);
                                creditMemoRecord.setFieldValue('entity', altusLandUseObj.entity);
                              //TC10ROD get rid of externalid so it wouldnt be treated as duplicate as externalid doesnt have any dependencies
//                                creditMemoRecord.setFieldValue('externalid', altusLandUseObj.invoice_number + '_ALTUSLU_CM');
                                creditMemoRecord.setFieldValue('account', ACCOUNT_LAND_USE);

                                if(!isBlank(altusLandUseObj.altkey)){
                                    creditMemoRecord.setFieldValue('custbody1', altusLandUseObj.altkey);
                                }

                                //region DETAILS CREDIT MEMO
                                for (var key in mappingCreditMemo) {
                                    if (!isBlank(altusLandUseObj[key])) {
                                        creditMemoRecord.setFieldValue(mappingCreditMemo[key], altusLandUseObj[key]);
                                    }
                                    nlapiLogExecution('AUDIT', 'MAPPING', 'Field: ' + mappingCreditMemo[key] + ' | Value: ' + altusLandUseObj[key]);
                                }

                                if (!isBlank(altusLandUseObj.invoice_num)) {
                                	//TC10ROD get rid of externalid so it wouldnt be treated as duplicate as externalid doesnt have any dependencies
//                                    creditMemoRecord.setFieldValue('externalid', altusLandUseObj.invoice_num);
                                    creditMemoRecord.setFieldValue('memo', altusLandUseObj.invoice_num);
                                    creditMemoRecord.setFieldValue('custbody_altus_id_search', altusLandUseObj.invoice_num);
                                }
                                var comments = '';
                                if (!isBlank(altusLandUseObj.comments)) {
                                    comments += altusLandUseObj.comments;
                                }
                                comments += ' ';
                                if (!isBlank(altusLandUseObj.previous_ownershi)) {
                                    comments += altusLandUseObj.previous_ownershi;
                                }
                                if (!isBlank(altusLandUseObj.comments)) {
                                    creditMemoRecord.setFieldValue('custbody_syncaltuslu_comments', comments);
                                }
                                if(!isBlank(altusLandUseObj.batch_id)){
                                    creditMemoRecord.setFieldValue('custbody_altus_batch_id', altusLandUseObj.batch_id);
                                }
                                //endregion DETAILS CREDIT MEMO

                                //region ADDRESS INVOICE

                                //Search for existing Address
                                var addressInternalId = getCustomerAddress(altusLandUseObj.entity, altusLandUseObj.province, 'CA', altusLandUseObj.postalcode, altusLandUseObj.city, altusLandUseObj.address);

                                if (isBlank(addressInternalId)) {

                                    var billAddr1 = '';
                                    if (!isBlank(altusLandUseObj.suite)) {
                                        billAddr1 += altusLandUseObj.suite;
                                    }
                                    if (!isBlank(altusLandUseObj.address)) {
                                        if (billAddr1) {
                                            billAddr1 += ' ';
                                        }
                                        billAddr1 += altusLandUseObj.address;
                                    }
                                    if (!isBlank(altusLandUseObj.attention_to)) {
                                        creditMemoRecord.setFieldValue('custbody_syncaltuslu_attn_to', altusLandUseObj.attention_to);
                                    }
                                    creditMemoRecord.setFieldValue('billaddr1', billAddr1);
                                    creditMemoRecord.setFieldValue('billcity', altusLandUseObj.city);
                                    creditMemoRecord.setFieldValue('billstate', altusLandUseObj.province);
                                    creditMemoRecord.setFieldValue('billcountry', 'CA');
                                    creditMemoRecord.setFieldValue('billzip', altusLandUseObj.postalcode);
                                }
                                else {
                                    creditMemoRecord.setFieldValue('billaddresslist', addressInternalId);
                                }
                                //endregion ADDRESS INVOICE

                                //region ITEM LINES CREDIT MEMO
                                var totalValidator = [];
                                for (var i in items) {
                                  

                                    var taxAmt = parseFloat(items[i].amount) * .05;
                                    totalValidator.push({
                                        'amount': items[i].amount,
                                        'tax': taxAmt
                                    });

                                    var line = 1 + parseInt(i);
                                    nlapiLogExecution('AUDIT', 'SET LINE ITEMS', 'Line: ' + line + ' | Amount: ' + items[i].amount + ' | Item: ' + items[i].item);

                                    creditMemoRecord.setLineItemValue('item', 'item', line, items[i].item);
                                  	//TC10ROD record with id 10610 yieelds , Invalid price reference key -1., comment out temporarily
                                  	//commenting price leevel yields : Please choose an item to add, so return it to original, it seems that thee issue is in the item column... SyncAltusRoadUseID with Internal ID 10610 Altus ID: not found in Item Record
                                    creditMemoRecord.setLineItemValue('item', 'price', line, '-1');
                                    creditMemoRecord.setLineItemValue('item', 'quantity', line, '1');
                                    creditMemoRecord.setLineItemValue('item', 'rate', line, items[i].amount);
                                    creditMemoRecord.setLineItemValue('item', 'amount', line, items[i].amount);

                                  	//TC10ROD 10162020 - originally: yields error : An nlobjSearchFilter contains an invalid operator, or is not in proper syntax: internalid... so add condition
                                  	//var taxId = items[i].item ? nlapiLookupField('item', items[i].item, 'taxschedule') || "";
                                    var taxId = items[i].item ? nlapiLookupField('item', items[i].item, 'taxschedule') : "";
                                    if(taxId == '1'){
                                        //Non Taxable
                                        creditMemoRecord.setLineItemValue('item', 'taxcode', line, '82');
                                    }

                                    /**
                                     if (!isBlank(altusLandUseObj.gst) && !isBlank(altusLandUseObj.province)) {

                                        var state = altusLandUseObj.province;
                                        var taxId = getTaxGroupGST(state, TAX_RATE);
                                        nlapiLogExecution('AUDIT', 'Tax Calculation', 'STATE: ' + state + ' | TAX ID: ' + taxId);
                                        if (!isBlank(taxId)) {
                                            creditMemoRecord.setLineItemValue('item', 'taxcode', line, taxId);
                                        }
                                    }
                                     **/
                                  nlapiLogExecution('AUDIT', 'TC10ROD 10162020 tracing error', 1);
                                }
                                //endregion ITEM LINES CREDIT MEMO
								nlapiLogExecution('AUDIT', 'TC10ROD 10162020 tracing error', 2);
                                //region VALIDATE TOTAL AMOUNT CREDIT MEMO
                                var creditMemoAmount = parseFloat(0.00);
                                for (var z in totalValidator) {
                                    creditMemoAmount += parseFloat(totalValidator[z].amount) + parseFloat(totalValidator[z].tax);
                                }
                                nlapiLogExecution('AUDIT', 'COMPARE AMOUNTS', 'Credit Memo Amount: ' + creditMemoAmount + ' | Grand Total: ' + altusLandUseObj.grand_total);
                                nlapiLogExecution('AUDIT', 'creditMemoRecord', JSON.stringify(creditMemoRecord));
                                //endregion VALIDATE TOTAL AMOUNT CREDIT MEMO

                                try {

                                        var RecordID = nlapiSubmitRecord(creditMemoRecord);
                                        nlapiSubmitField('creditmemo', RecordID, 'custbody_syncaltuslu_link', altusId);
                                        var subsidiary = nlapiLookupField('creditmemo', RecordID, 'subsidiary');
                                        createAttachContact(altusLandUseObj.entity, subsidiary, altusLandUseObj.attention_to, altusLandUseObj.email, RecordID);

                                        nlapiSubmitField(ALTUS_LAND_USE, altusId, FIELD_ERROR_MESSAGE, '');
                                        nlapiSubmitField(ALTUS_LAND_USE, altusId, FIELD_SYNC_STATUS, syncStatus.COMPLETE);
                                        nlapiSubmitField(ALTUS_LAND_USE, altusId, FIELD_NSID, 'INV: ' + RecordID);
                                        nlapiSubmitField(ALTUS_LAND_USE, altusId, FIELD_NSLINK, RecordID);
                                }
                                catch (ex) {
                                    nlapiLogExecution('ERROR', ex instanceof nlobjError ? ex.getCode() : 'CUSTOM_ERROR_CODE', ex instanceof nlobjError ? ex.getDetails() : 'JavaScript Error: ' + (ex.message !== null ? ex.message : ex));
                                    nlapiSubmitField(ALTUS_LAND_USE, altusId, FIELD_SYNC_STATUS, syncStatus.ERROR);
                                    nlapiSubmitField(ALTUS_LAND_USE, altusId, FIELD_ERROR_MESSAGE, ex.getDetails());
                                  //TC10ROD apply retry logic
                                    var altusData = getAltusData(altusId)
                                    nlapiSubmitField(ALTUS_LAND_USE, altusId, FIELD_RETRIES, (Number(altusData[FIELD_RETRIES]) - 1));
//                                    nlapiSubmitField(ALTUS_LAND_USE, altusId, FIELD_RETRIES, 0);
                                    IS_ERROR = true;
                                    nlapiLogExecution('AUDIT', 'CALLSCHEDULEDSYNCALTUSROADUSE', 'SyncAltusRoadUseID  with Internal ID ' + altusId + ' Altus ID: not found in Item Record');
                                }

                            }
                            else{//!!!***!!!THIS IS ADDITIONAL IF THE FIELD IS INVALID 
                                nlapiSubmitField(ALTUS_LAND_USE, altusId, FIELD_SYNC_STATUS, syncStatus.ERROR);
                                nlapiSubmitField(ALTUS_LAND_USE, altusId, FIELD_ERROR_MESSAGE, "The cancellation status of this record was not one of Yes, No, or Blank");
                              //TC10ROD apply retry logic
                                var altusData = getAltusData(altusId)
                                nlapiSubmitField(ALTUS_LAND_USE, altusId, FIELD_RETRIES, (Number(altusData[FIELD_RETRIES]) - 1));
//                                nlapiSubmitField(ALTUS_LAND_USE, altusId, FIELD_RETRIES, 0);
                                IS_ERROR = true;
                                nlapiLogExecution('DEBUG', '007-666 Sync ERROR', ex instanceof nlobjError ? ex.getCode() : 'CUSTOM_ERROR_CODE', ex instanceof nlobjError ? ex.getDetails() : 'JavaScript Error: ' + (ex.message !== null ? ex.message : ex));
                            }
                        }
                    }

                }
        	}
        	catch(e)
        	{
        		nlapiSubmitField(ALTUS_LAND_USE,altusId,[FIELD_SYNC_STATUS, FIELD_ERROR_MESSAGE],[syncStatus.ERROR, + e.message]);
        		nlapiLogExecution("ERROR", "ERROR in function ScheduledSyncAltusLandUse", e.message);
        	}
        }
    }
    findNextRecord();
}

function findNextRecord(){
    //Check for additional records to add to processing queue
    var filters = [
        [FIELD_SYNC_STATUS,'anyof',[1,3,5]], 'AND',
        [FIELD_RETRIES,'greaterthan',0]
    ];

    var columns = [];
    columns[0] = new nlobjSearchColumn('internalid');

    var searchResults = nlapiSearchRecord(ALTUS_LAND_USE,null,filters,columns);

    if(searchResults && searchResults.length > 0) {
        var nextSyncMSID = searchResults[0].getValue('internalid');
        nlapiLogExecution('AUDIT','CALLSCHEDULEDSYNC_ALTUS_LAND_USE','Additional records to sync found. Queueing '+nextSyncMSID);
        var newParams = {'custscript_syncaltuslanduseid':nextSyncMSID};
        var ScheduleStatus = nlapiScheduleScript("customscript_sched_syncaltusru",null,newParams); //Deployment is empty so that script selects first available deployment
        if(ScheduleStatus == 'QUEUED') {
            nlapiSubmitField(ALTUS_LAND_USE, nextSyncMSID, FIELD_SYNC_STATUS,'6');
        } //Else no available deployments - remaining records will be caught by periodic retry script
    } else {
        nlapiLogExecution('AUDIT','CALLSCHEDULEDSYNCMSPO','No records to sync found.');
    }
}

var syncStatus = {
    'NEW' : '1',
    'PROCESSING' : '2',
    'ERROR' : '3',
    'COMPLETE' : '4',
    'TO_REPROCESS' : '5',
    'QUEUED' : '6',
    'DUPLICATE' : '7'
};

/**
 * Get Netsuite customer ID using Altus ID
 * @param altusID
 * @return {string}
 */
var getCustomerIDByAltusID = function (altusID) {
    var internalId = '';
    var customerSearch = nlapiSearchRecord('customer',null,
        [
            ['custentity_altusid','is', altusID]
        ],null);
    if(!isBlank(customerSearch)){
        internalId = customerSearch[0].getId();
    }
    return internalId;
};

var getItemIDByFieldName = function (fieldName) {
    var internalId = '';
    var itemSearch = nlapiSearchRecord('item',null,
        [
            ['custitem_altusid','is', fieldName]
        ],null);
    if(!isBlank(itemSearch)){
        internalId = itemSearch[0].getId();
    }
    return internalId;
};

var ALTUS_LAND_USE_OBJ = function (altusLandUseObj) {
    var arr = {};
    arr.applicant_company = setToEmptyIfNull(altusLandUseObj.getFieldValue('custrecord_syncaltuslu_applicant_company'));
    arr.attention_to = setToEmptyIfNull(altusLandUseObj.getFieldValue('custrecord_syncaltuslu_attention_to'));
    arr.email = setToEmptyIfNull(altusLandUseObj.getFieldValue('custrecord_syncaltuslu_email'));
    arr.suite = setToEmptyIfNull(altusLandUseObj.getFieldValue('custrecord_syncaltuslu_suite'));
    arr.address = setToEmptyIfNull(altusLandUseObj.getFieldValue('custrecord_syncaltuslu_address'));
    arr.city = setToEmptyIfNull(altusLandUseObj.getFieldValue('custrecord_syncaltuslu_city'));
    arr.province = setToEmptyIfNull(altusLandUseObj.getFieldValue('custrecord_syncaltuslu_province'));
    arr.postalcode = setToEmptyIfNull(altusLandUseObj.getFieldValue('custrecord_syncaltuslu_postalcode'));
    arr.invoice_num = setToEmptyIfNull(altusLandUseObj.getFieldValue('custrecord_syncaltuslu_invoice_num'));
    arr.altkey = setToEmptyIfNull(altusLandUseObj.getFieldValue('custrecord_syncaltuslu_altkey'));
    arr.approval_date = setToEmptyIfNullDate(altusLandUseObj.getFieldValue('custrecord_syncaltuslu_approval_date'));
    arr.invoice_date = setToEmptyIfNullDate(altusLandUseObj.getFieldValue('custrecord_syncaltuslu_invoice_date'));
    arr.disp_key = setToEmptyIfNull(altusLandUseObj.getFieldValue('custrecord_syncaltuslu_disp_key'));
    arr.fmu = setToEmptyIfNull(altusLandUseObj.getFieldValue('custrecord_syncaltuslu_fmu'));
    arr.total_area = setToEmptyIfNull(altusLandUseObj.getFieldValue('custrecord_syncaltuslu_total_area'));
    arr.area_eligible_cro = setToEmptyIfNull(altusLandUseObj.getFieldValue('custrecord_syncaltuslu_area_eligible_cro'));
    arr.tda_table = setToEmptyIfNull(altusLandUseObj.getFieldValue('custrecord_syncaltuslu_tda_table'));
    arr.location = setToEmptyIfNull(altusLandUseObj.getFieldValue('custrecord_syncaltuslu_location'));
    arr.conif_total = setToEmptyIfNullAmount(altusLandUseObj.getFieldValue('custrecord_syncaltuslu_conif_total'));
    arr.decid_total = setToEmptyIfNullAmount(altusLandUseObj.getFieldValue('custrecord_syncaltuslu_decid_total'));
    arr.gis_inventory = setToEmptyIfNullAmount(altusLandUseObj.getFieldValue('custrecord_syncaltuslu_gis_inventory'));
    arr.reforestation_cha = setToEmptyIfNullAmount(altusLandUseObj.getFieldValue('custrecord_syncaltuslu_reforestation_cha'));
    arr.other_fee = setToEmptyIfNullAmount(altusLandUseObj.getFieldValue('custrecord_syncaltuslu_other_fee'));
    arr.other_fee2 = setToEmptyIfNullAmount(altusLandUseObj.getFieldValue('custrecord_syncaltuslu_other_fee2'));
    arr.specified_damages = setToEmptyIfNullAmount(altusLandUseObj.getFieldValue('custrecord_syncaltuslu_specified_damages'));
    arr.comments = setToEmptyIfNull(altusLandUseObj.getFieldValue('custrecord_syncaltuslu_comments'));
    arr.gst = setToEmptyIfNull(altusLandUseObj.getFieldValue('custrecord_syncaltuslu_gst'));
    arr.crown_conif = setToEmptyIfNullAmount(altusLandUseObj.getFieldValue('custrecord_syncaltuslu_crown_conif'));
    arr.crown_decid = setToEmptyIfNullAmount(altusLandUseObj.getFieldValue('custrecord_syncaltuslu_crown_decid'));
    arr.cancel_fee = setToEmptyIfNullAmount(altusLandUseObj.getFieldValue('custrecord_syncaltuslu_cancel_fee'));
    arr.grand_total = setToEmptyIfNullAmount(altusLandUseObj.getFieldValue('custrecord_syncaltuslu_grand_total'));
    arr.cancelled = setToEmptyIfNull(altusLandUseObj.getFieldValue('custrecord_syncaltuslu_cancelled'));
    arr.cancellation = setToEmptyIfNull(altusLandUseObj.getFieldValue('custrecord_syncaltuslu_cancellation'));
    arr.cancelled_num = setToEmptyIfNull(altusLandUseObj.getFieldValue('custrecord_syncaltuslu_cancelled_num'));
    arr.cancelled_date = setToEmptyIfNullDate(altusLandUseObj.getFieldValue('custrecord_syncaltuslu_cancelled_date'));
    arr.invoice_type = setToEmptyIfNull(altusLandUseObj.getFieldValue('custrecord_syncaltuslu_invoice_type'));
    arr.id_company = setToEmptyIfNull(altusLandUseObj.getFieldValue('custrecord_syncaltuslu_id_company'));
    arr.previous_ownershi = setToEmptyIfNull(altusLandUseObj.getFieldValue('custrecord_syncaltuslu_previous_ownershi'));
    arr.batch_id = setToEmptyIfNull(altusLandUseObj.getFieldValue('custrecord_syncaltuslu_batchid'));
    return arr;
};

var setToEmptyIfNullDate = function (s) {
    var val = '';
    if(isBlank(s)){
        val = '';
    }
    else{
        val = convertDateFormat(s);
    }
    return val;
}

var setToEmptyIfNull = function (s) {
    var val = '';
    if(isBlank(s)){
        val = '';
    }
    else{
        val = s;
    }
    return val;
};

var setToEmptyIfNullAmount = function (s) {
    var val = '';
    if(isBlank(s)){
        val = '';
    }
    else{
        val = s.replace(/\$|,/g, '').replace(/\(|\)/g, "").replace(/\-/g, '');
    }
    return val;
};

/**
 * @param {string} test input the string to look for space characters
 * @return {boolean}
 */
function isBlank(test) {
    if ((test == '') || (test == null) || (test == undefined) ||
        (test.toString().charCodeAt() == 32)) {
        return true;
    } else {
        return false;
    }
}

function removeEmpty(obj) {
    Object.keys(obj).forEach(function(key) {
        (obj[key] && typeof obj[key] === 'object') && removeEmpty(obj[key]) ||
        (obj[key] === '' || obj[key] === null) && delete obj[key]
    });
    return obj;
}

var getTaxGroupGST = function (stateCode, taxRate) {

    var taxName = stateCode + ' ' + taxRate + '%';
    var taxCode = '';

    var taxgroupSearch = nlapiSearchRecord('taxgroup',null,
        [
            ['name','is', taxName]
        ],
        []
    );

    if(!isBlank(taxgroupSearch)){
        taxCode = taxgroupSearch[0].getId();
    }

    return taxCode;
};

//region FUNCTIONS

var getAltusRecords = function (statusArr, altusId) {

    var altusRecordsArr = [];

    if(!isBlank(altusId)) {

        var search = nlapiSearchRecord('customrecord_syncaltuslu', null,
            [
                ['custrecord_syncaltuslu_syncstatus', 'anyof', statusArr],
                'AND',
                ['internalid', 'anyof', altusId]
            ],
            [
                new nlobjSearchColumn('internalid')
            ]
        );
    }
    else{

        var search = nlapiSearchRecord('customrecord_syncaltuslu', null,
            [
                ['custrecord_syncaltuslu_syncstatus', 'anyof', statusArr]
            ],
            [
                new nlobjSearchColumn('internalid')
            ]
        );

    }

    if(!isBlank(search)) {
        for (var i = 0; i < search.length; i++) {
            altusRecordsArr.push(search[i].getId());
        }
    }
    return altusRecordsArr;
};



var createAttachContact = function (customer, subsidiary, name, email, invoiceId) {

    var getContactId = getContactRecord(name, email, customer);

    if(isBlank(getContactId)) {
        var firstName = '';
        var lastName = '';

        if (!isBlank(name)) {
            if (!isBlank(name.split(' ')[0])) {
                firstName = name.split(' ')[0];
            }
            if (!isBlank(name.split(' ')[1])) {
                lastName = name.split(' ')[1];
            }
            var contact = nlapiCreateRecord('contact');
            contact.setFieldValue('company', customer);
            contact.setFieldValue('firstname', firstName);
            contact.setFieldValue('lastname', lastName);
            if (!isBlank(email)) {
                contact.setFieldValue('email', email);
            }
            contact.setFieldValue('subsidiary', subsidiary);
            try {
                var contactId = nlapiSubmitRecord(contact);
                nlapiAttachRecord('contact', contactId, 'invoice', invoiceId);
            }
            catch (ex) {

            }
        }
    }
    else{
        nlapiAttachRecord('contact', getContactId, 'invoice', invoiceId);
    }
};

var getContactRecord = function (name, email, customerId) {
    var internalId = '';
  
  	//TC10ROD errors out if blank email. so fix it.
  	var filters = [
            ['entityid','is',name],
            'AND',
            ['company','anyof',customerId]
        ];
  	if(email){
    	filters = filters.concat(['AND', ['email','is',email] ] );
    }
  	else {
     nlapiLogExecution("DEBUG", "no email address")
  	}
  
    var contactSearch = nlapiSearchRecord('contact',null,
        filters, []
    );
    if(!isBlank(contactSearch)){
        internalId = contactSearch[0].getId();
    }
    return internalId;
};

//endregion FUNCTIONS

var mappingInvoice = {
    'entity' : 'entity',
    'invoice_date' : 'trandate',
    'approval_date' : 'custbody_syncaltuslu_approval_date',
    'area_eligible_cro' : 'custbody_syncaltuslu_area_eligible_cro',
    'altkey' : 'custbody_syncaltuslu_altkey',
    'comments' : 'custbody_syncaltuslu_comments',
    'attention_to' : 'custbody_syncaltuslu_attn_to',
    'disp_key' : 'custbody_syncaltuslu_disp_key',
    'fmu' : 'custbody_syncaltuslu_fmu',
    'invoice_type' : 'custbody_syncaltuslu_invoice_type',
    'invoice_num' : 'memo',
    'location' : 'custbody_syncaltuslu_location',
    'tda_table' : 'custbody_syncaltuslu_tda_table',
    'total_area' : 'custbody_syncaltuslu_total_area',
    'id' : 'custbody_syncaltuslu_link',
    'invoice_num' : 'custbody_altus_id_search'
};

var mappingCreditMemo = {
    'entity' : 'entity',
    'cancelled_date' : 'trandate',
    'approval_date' : 'custbody_syncaltuslu_approval_date',
    'area_eligible_cro' : 'custbody_syncaltuslu_area_eligible_cro',
    'altkey' : 'custbody_syncaltuslu_altkey',
    'comments' : 'custbody_syncaltuslu_comments',
    'attention_to' : 'custbody_syncaltuslu_attn_to',
    'disp_key' : 'custbody_syncaltuslu_disp_key',
    'fmu' : 'custbody_syncaltuslu_fmu',
    'invoice_type' : 'custbody_syncaltuslu_invoice_type',
    'invoice_num' : 'memo',
    'location' : 'custbody_syncaltuslu_location',
    'tda_table' : 'custbody_syncaltuslu_tda_table',
    'total_area' : 'custbody_syncaltuslu_total_area',
    'id' : 'custbody_syncaltuslu_link',
    'invoice_num' : 'custbody_altus_id_search'
};


var getCustomerAddress = function (customerId, state, country, zipcode, city, syncLandUseAddr) {

    var addrId = '';
    var addressArr = [];
    var addrStr = '';

  	var filtersObj = [];
  	filtersObj = filtersObj.concat([['internalid','anyof',customerId]]);
  	//state ? filtersObj = filtersObj.concat(['AND', ['internalid','anyof',customerId]]) : ""; //03122021 - double internalid filter. must be state
  	//state ? filtersObj = filtersObj.concat(['AND', ['state','anyof',state]]) : "";
  	country ? filtersObj = filtersObj.concat(['AND', ['address.country','anyof',country]]) : "";
  	zipcode ? filtersObj = filtersObj.concat(['AND', ['address.zipcode','is',zipcode]]) : ""; //1.3.0 zip code must not use 'anyof'
  	city ? filtersObj = filtersObj.concat(['AND', ['address.city','is',city]]) : "";
  
  	nlapiLogExecution("DEBUG", "filtersObj", JSON.stringify(filtersObj));
  
    var customerSearch = nlapiSearchRecord('customer',null,
        filtersObj,
        [
            new nlobjSearchColumn('addressinternalid','Address',null),
            new nlobjSearchColumn('address1','Address',null),
            new nlobjSearchColumn('address2','Address',null),
            new nlobjSearchColumn('address3','Address',null),
            new nlobjSearchColumn('city','Address',null),
            new nlobjSearchColumn('countrycode','Address',null),
            new nlobjSearchColumn('country','Address',null),
            new nlobjSearchColumn('state','Address',null),
            new nlobjSearchColumn('zipcode','Address',null)
        ]
    );
	//nlapiLogExecution("DEBUG", "customerSearch", JSON.stringify(customerSearch));
  
  	
	nlapiLogExecution("DEBUG", "customerSearch passed", true);
    if (customerSearch != null) {
        for (var i = 0; i < customerSearch.length; i++) {
            var addressInternalId = customerSearch[i].getValue('addressinternalid', 'Address');
            var addr1 = customerSearch[i].getValue('address1', 'Address');
            var addr2 = customerSearch[i].getValue('address2', 'Address');
            var addr3 = customerSearch[i].getValue('address3', 'Address');
            if(!isBlank(addr1)){
                addrStr += addr1 + ' ';
            }
            if(!isBlank(addr2)){
                addrStr += addr2 + ' ';
            }
            if(!isBlank(addr3)){
                addrStr += addr3 + ' ';
            }
            addressArr.push({
                'address' : addrStr,
                'addressInternalId' : addressInternalId
            })
        }
    }

    if(!isBlank(addressArr)){
        for(var z in addressArr){
            var compareAddr = addressArr[z].address;
            var matchAddr = compareAddr.indexOf(syncLandUseAddr);
            if(matchAddr < 0){
                //No matching address
            }
            else{
                addrId = addressArr[z].addressInternalId;
            }
        }
    }
  	
	nlapiLogExecution("DEBUG", "addrId", addrId);
    return addrId;
};

var convertDateFormat = function(d) {
    var _date = '';
    if(!isBlank(d)){
        var arrDate = d.split('/');
        var year = arrDate[2];
        var month = '';
        var day = '';

        if(arrDate[0].length == 1){
            day = '0' + arrDate[0];
        }
        else{
            day = arrDate[0];
        }

        if(arrDate[1].length == 1){
            month = '0' + arrDate[1];
        }
        else{
            month = arrDate[1];
        }

        if(year.length == '2') {
            _date = day + '/' + month + '/20' + year;
        }
        else{
            _date = day + '/' + month + '/' + year;
        }
    }

    return _date;
};