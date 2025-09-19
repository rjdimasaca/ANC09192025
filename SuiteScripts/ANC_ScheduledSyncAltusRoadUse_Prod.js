/* @Scheduled Script on Manual Deployment

Processes SyncRoadUseRecord

Custom Record: https://system.na2.netsuite.com/app/common/custom/custrecordentrylist.nl?rectype=321
Production: https://system.na2.netsuite.com/app/common/scripting/script.nl?id=493&id=493&whence=

1.0.1 - TC10ROD 03182020 just initialize roadUseItem so u can uppercase it, raised by katherine, previous batch would have gotten that error cause they dont have value as well

*/

var TIMBER_ROAD_USE_INVOICE = '146';
var TIMBER_ROAD_USE_CREDIT_MEMO = '158';
var ACCOUNT_ROAD_USE = '296'; //1241 : A/R Sub - Road Use
var TAX_RATE = '5';

var ALTUS_ROAD_USE = 'customrecord_syncaltusru';
var FIELD_SYNC_STATUS = 'custrecord_syncaltusru_syncstatus';
var FIELD_ERROR_MESSAGE = 'custrecord_syncaltusru_errmsg';
var FIELD_RETRIES = 'custrecord_syncaltusru_retries';
var FIELD_NSID = 'custrecord_syncaltusru_nsid';
var FIELD_NSLINK = 'custrecord_syncaltusru_nslink';

var context = nlapiGetContext();
var SyncMSID = context.getSetting('SCRIPT','custscript_syncaltusroaduseid');

function getAltusData(altusId)
{
	var altusData = {};
	altusData[FIELD_RETRIES] = 0;
	try
	{
		if(altusId)
		{
			var altusRec = nlapiLoadRecord(ALTUS_ROAD_USE, altusId);
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

function ScheduledSyncAltusRoadUse(params){

    var statusArr = [];
    statusArr[0] = syncStatus.NEW;
    statusArr[1] = syncStatus.ERROR;
    statusArr[2] = syncStatus.TO_REPROCESS;
    statusArr[3] = syncStatus.QUEUED;

    nlapiLogExecution('DEBUG', '000 Sync Start', 'Altus Road Use ID: ' + SyncMSID);

    var altusRecordsArr = getAltusRecords(statusArr, SyncMSID);

    if(!isBlank(altusRecordsArr)) {
        for(var i in altusRecordsArr) {

        	try
        	{

                var altusId = altusRecordsArr[i];
                var SyncAltusRoadUseRecord = '';
                var IS_ERROR = false;

                if(!isBlank(altusId)) {

                    nlapiLogExecution('DEBUG', '001 Sync Process', 'Altus Road Use ID: ' + altusId);

                    nlapiSubmitField(ALTUS_ROAD_USE, altusId, FIELD_SYNC_STATUS, syncStatus.PROCESSING);
                    nlapiSubmitField(ALTUS_ROAD_USE, altusId, FIELD_ERROR_MESSAGE,'');

                    SyncAltusRoadUseRecord = nlapiLoadRecord(ALTUS_ROAD_USE, altusId);
                    var altusRoadUseObj = ALTUS_ROAD_USE_OBJ(SyncAltusRoadUseRecord);

                    if(!isBlank(altusRoadUseObj)){
                        altusRoadUseObj = removeEmpty(altusRoadUseObj);
                        var companynum = altusRoadUseObj.companynum;
                        if(isBlank(companynum)){
                            companynum = altusRoadUseObj.companyname;
                        }
                        var item = altusRoadUseObj.invoice_type;

                        //Mapping
                        if(!isBlank(companynum)){
                            var _entity = getCustomerIDByAltusID(companynum);
                            if(isBlank(_entity)){
                                //Error
                                nlapiSubmitField(ALTUS_ROAD_USE, altusId, FIELD_SYNC_STATUS, syncStatus.ERROR);
                                nlapiSubmitField(ALTUS_ROAD_USE, altusId, FIELD_ERROR_MESSAGE, 'Altus ID: ' + companynum +', not found in Customer Record');
                                
                                //TC10ROD apply retry logic
                                var altusData = getAltusData(altusId)
                                nlapiSubmitField(ALTUS_ROAD_USE, altusId, FIELD_RETRIES, (Number(altusData[FIELD_RETRIES]) - 1));
                                //nlapiSubmitField(ALTUS_ROAD_USE, altusId, FIELD_RETRIES,0);
                                IS_ERROR = true;

                                nlapiLogExecution('DEBUG', '001-666 Sync ERROR', 'Altus ID: ' + companynum +', not found in Customer Record');
                            }
                            else{
                                altusRoadUseObj.entity = _entity;
                            }
                        }
                        else{
                            nlapiSubmitField(ALTUS_ROAD_USE, altusId, FIELD_SYNC_STATUS, syncStatus.ERROR);
                            nlapiSubmitField(ALTUS_ROAD_USE, altusId, FIELD_ERROR_MESSAGE, 'Altus ID: is null');
                            
                            //TC10ROD apply retry logic
                            var altusData = getAltusData(altusId)
                            nlapiSubmitField(ALTUS_ROAD_USE, altusId, FIELD_RETRIES, (Number(altusData[FIELD_RETRIES]) - 1));
//                            nlapiSubmitField(ALTUS_ROAD_USE, altusId, FIELD_RETRIES,0);
                            IS_ERROR = true;
                            nlapiLogExecution('DEBUG', '001-666 Sync ERROR', 'altusId with Internal ID ' + altusId + ' Altus ID: is null');
                        }

                        if(!IS_ERROR) {

                            //region ITEM CHARGES

                            if (!isBlank(item)) {
                                var _item = getItemIDByInvoiceType(item);
                                if (isBlank(_item)) {
                                    //Error
                                    nlapiSubmitField(ALTUS_ROAD_USE, altusId, FIELD_SYNC_STATUS, syncStatus.ERROR);
                                    nlapiSubmitField(ALTUS_ROAD_USE, altusId, FIELD_ERROR_MESSAGE, 'Altus ID: ' + item + ', not found in Item Record');
                                    //TC10ROD apply retry logic
                                    var altusData = getAltusData(altusId)
                                    nlapiSubmitField(ALTUS_ROAD_USE, altusId, FIELD_RETRIES, (Number(altusData[FIELD_RETRIES]) - 1));
//                                    nlapiSubmitField(ALTUS_ROAD_USE, altusId, FIELD_RETRIES, 0);
                                    IS_ERROR = true;
                                    nlapiLogExecution('AUDIT', 'CALLSCHEDULEDSYNCALTUSROADUSE', 'altusId  with Internal ID ' + altusId + ' Altus ID: ' + item + ', not found in Item Record');
                                    //1.0.2 - throw a more explicit message as requested by Kath on skype 06152020 - TC10ROD
                                    throw nlapiCreateError("NO_ITEM_FOR_INVOICE_TYPE", "No Item ALTUS ID matches the invoice type '" + item + "'");
                                    itemErrors.push({
                                        'message': "No Item ALTUS ID matches the invoice type '" + item + "'"
                                    });
                                }
                                else {
                                    altusRoadUseObj.item = _item;
                                }
                            }

                            var items = [];
                            var itemErrors = [];
                            //Get All Items
                            if (!isBlank(altusRoadUseObj.other_fee)) {
                                var item = getItemIDByFieldName('other_fee');
                                var amount = altusRoadUseObj.other_fee;
                                if (isNaN(parseFloat(amount))) {
                                    amount = '0.00';
                                }
                                if (isBlank(item)) {
                                    itemErrors.push({
                                        'message': 'Item with Altus ID "other_fee" not found.'
                                    });
                                }
                                else {
                                    items.push({
                                        'item': item,
                                        'amount': amount
                                    });
                                }
                            }

                            if (!isBlank(altusRoadUseObj.initial_consid)) {
                                var item = getItemIDByFieldName('initial_consid');
                                var amount = altusRoadUseObj.initial_consid;
                                if (isNaN(parseFloat(amount))) {
                                    amount = '0.00';
                                }
                                if (isBlank(item)) {
                                    itemErrors.push({
                                        'message': 'Item with Altus ID "initial_consid" not found.'
                                    });
                                }
                                else {
                                    items.push({
                                        'item': item,
                                        'amount': amount
                                    });
                                }
                            }

                            if (!isBlank(altusRoadUseObj.bridge_fee)) {
                                var item = getItemIDByFieldName('bridge_fee');
                                var amount = altusRoadUseObj.bridge_fee;
                                if (isNaN(parseFloat(amount))) {
                                    amount = '0.00';
                                }
                                if (isBlank(item)) {
                                    itemErrors.push({
                                        'message': 'Item with Altus ID "bridge_fee" not found.'
                                    });
                                }
                                else {
                                    items.push({
                                        'item': item,
                                        'amount': amount
                                    });
                                }
                            }

                            if (!isBlank(altusRoadUseObj.admin)) {
                                var item = getItemIDByFieldName('admin');
                                var amount = altusRoadUseObj.admin;
                                if (isNaN(parseFloat(amount))) {
                                    amount = '0.00';
                                }
                                if (isBlank(item)) {
                                    itemErrors.push({
                                        'message': 'Item with Altus ID "admin" not found.'
                                    });
                                }
                                else {
                                    items.push({
                                        'item': item,
                                        'amount': amount
                                    });
                                }
                            }


                            //endregion ITEM CHARGES

                            nlapiLogExecution('AUDIT', 'JSON', JSON.stringify(altusRoadUseObj));

                            var cancellation = altusRoadUseObj.cancellation;

                            if (isBlank(itemErrors)) {
                                if (isBlank(cancellation)||(!isBlank(cancellation)&&cancellation.toUpperCase()=='NO')) {//!!!***!!! This should prevent  values other than No from triggering this
                                    nlapiLogExecution('AUDIT', 'TRANSFORM TYPE', 'INVOICE');
                                    //Create Invoice
                                    var invoiceRecord = nlapiCreateRecord('invoice');

                                    //region DEFAULTS
                                    invoiceRecord.setFieldValue('customform', TIMBER_ROAD_USE_INVOICE);
                                    invoiceRecord.setFieldValue('account', ACCOUNT_ROAD_USE);
                                    invoiceRecord.setFieldValue('entity', altusRoadUseObj.entity);
                                    invoiceRecord.setFieldValue('trandate', altusRoadUseObj.invoice_date);
                                    if (!isBlank(altusRoadUseObj.invoice_number)) {
                                        invoiceRecord.setFieldValue('memo', altusRoadUseObj.invoice_number);
                                        invoiceRecord.setFieldValue('custbody_altus_id_search', altusRoadUseObj.invoice_number);
//                                        invoiceRecord.setFieldValue('externalid', altusRoadUseObj.invoice_number + '_ALTUSRU_INV');
                                    }
                                    if(!isBlank(altusRoadUseObj.altkey)){
                                        invoiceRecord.setFieldValue('custbody1', altusRoadUseObj.altkey);
                                    }
                                    if(!isBlank(altusRoadUseObj.batch_id)){
                                        invoiceRecord.setFieldValue('custbody_altus_batch_id', altusRoadUseObj.batch_id);
                                    }
                                    if(!isBlank(altusRoadUseObj.applicant_contact)){
                                        invoiceRecord.setFieldValue('custbody_syncaltusru_applicant_contact', altusRoadUseObj.applicant_contact);
                                    }

                                    //endregion DEFAULTS

                                    //region DETAILS INVOICE
                                    for (var key in mappingInvoice) {
                                        if (!isBlank(altusRoadUseObj[key])) {
                                            invoiceRecord.setFieldValue(mappingInvoice[key], altusRoadUseObj[key]);
                                        }
                                        nlapiLogExecution('AUDIT', 'MAPPING', 'Field: ' + mappingInvoice[key] + ' | Value: ' + altusRoadUseObj[key]);
                                    }
                                    //endregion DETAILS INVOICE

                                    //region ADDRESS INVOICE
                                    //Search for existing Address
                                    var addressInternalId = getCustomerAddress(altusRoadUseObj.entity, altusRoadUseObj.province, 'CA', altusRoadUseObj.postalcode, altusRoadUseObj.city, altusRoadUseObj.mailingaddress);

                                    //Address
                                    if (isBlank(addressInternalId)) {

                                        var billAddr1 = '';
                                        if (!isBlank(altusRoadUseObj.suite_floor)) {
                                            billAddr1 += altusRoadUseObj.suite_floor;
                                        }
                                        if (!isBlank(altusRoadUseObj.mailingaddress)) {
                                            if (billAddr1) {
                                                billAddr1 += ' ';
                                            }
                                            billAddr1 += altusRoadUseObj.mailingaddress;
                                        }
                                        invoiceRecord.setFieldValue('billaddr1', billAddr1);
                                        invoiceRecord.setFieldValue('billcity', altusRoadUseObj.city);
                                        invoiceRecord.setFieldValue('billstate', altusRoadUseObj.province);
                                        invoiceRecord.setFieldValue('billcountry', 'CA');
                                        invoiceRecord.setFieldValue('billzip', altusRoadUseObj.postalcode);
                                    }
                                    else {
                                        invoiceRecord.setFieldValue('billaddresslist', addressInternalId);
                                    }
                                    //endregion ADDRESS INVOICE

                                    //region ITEM LINES INVOICE (DLO)

                                    var json = altusRoadUseObj;
                                    var dloItems = [];

                                    for (key in json) {
                                        if (json.hasOwnProperty(key)) {
                                            if (key.indexOf('_stotal') > -1) {

                                                //1.0.1 - TC10ROD 03182020 just initialize roadUseItem so u can uppercase it, raised by katherine, previous batch would have gotten that error cause they dont have value as well
                                                var roadUseItem;
                                                var roadUseItemPrice;
                                                var roadUseItemQuantity;

                                                roadUseItemPrice = json[key];
                                              
                                              	//1.0.1 TC10ROD why you need to loop through this?
                                                for (var qKey in json) {
                                                    if (qKey == key.replace('_stotal', '')) {
                                                        roadUseItemQuantity = json[qKey];
                                                        roadUseItem = key.replace('_stotal', '');
                                                    }
                                                  	else if (qKey == key) {
                                                        roadUseItemQuantity = json[qKey];
                                                        roadUseItem = key.replace('_stotal', '');
                                                    }
                                                }
                                                dloItems.push({
                                                    'roadUseItemPrice': roadUseItemPrice,
                                                    'roadUseItem': roadUseItem.toUpperCase(),
                                                    'roadUseItemQuantity': roadUseItemQuantity
                                                });
                                            }
                                        }
                                    }

                                    nlapiLogExecution('AUDIT', 'DLO ITEMS', JSON.stringify(dloItems));
                                    var totalLines = 1;
                                    for (var i in dloItems) {
                                        var zLine = 1 + parseInt(i);
                                        invoiceRecord.setLineItemValue('item', 'item', zLine, altusRoadUseObj.item);
                                        invoiceRecord.setLineItemValue('item', 'price', zLine, '-1');
                                        //invoiceRecord.setLineItemValue('item', 'department', zLine, '');
                                        invoiceRecord.setLineItemValue('item', 'custcol_altus_roadname', zLine, dloItems[i].roadUseItem);
                                        invoiceRecord.setLineItemValue('item', 'quantity', zLine, '1');
                                        invoiceRecord.setLineItemValue('item', 'custcol_kms_used', zLine, dloItems[i].roadUseItemQuantity);
                                        invoiceRecord.setLineItemValue('item', 'rate', zLine, dloItems[i].roadUseItemPrice);
                                        invoiceRecord.setLineItemValue('item', 'amount', zLine, dloItems[i].roadUseItemPrice);

                                        var taxId = nlapiLookupField('item', altusRoadUseObj.item, 'taxschedule');
                                        if(taxId == '1'){
                                            //Non Taxable
//                                            invoiceRecord.setLineItemValue('item', 'taxcode', line, '82');
                                            invoiceRecord.setLineItemValue('item', 'taxcode', zLine, '82');
                                        }

                                        /**
                                        if (!isBlank(altusRoadUseObj.gst) && !isBlank(altusRoadUseObj.province)) {

                                            var state = altusRoadUseObj.province;
                                            var taxId = getTaxGroupGST(state, TAX_RATE);
                                            nlapiLogExecution('AUDIT', 'Tax Calculation', 'STATE: ' + state + ' | TAX ID: ' + taxId);
                                            if (!isBlank(taxId)) {
                                                invoiceRecord.setLineItemValue('item', 'taxcode', zLine, taxId);
                                            }
                                        }
                                         **/
                                        totalLines++;
                                    }

                                    //endregion ITEM LINES INVOICE (DLO)

                                    //region ITEM LINES INVOICE (other charges)
                                    for (var i in items) {

                                        var taxAmt = parseFloat(items[i].amount) * .05;
                                        var totalValidator = [];
                                        totalValidator.push({
                                            'amount': items[i].amount,
                                            'tax': taxAmt
                                        });

                                        var line = totalLines + parseInt(i);
                                        nlapiLogExecution('AUDIT', 'SET LINE ITEMS', 'Line: ' + line + ' | Amount: ' + items[i].amount + ' | Item: ' + items[i].item);

                                        invoiceRecord.setLineItemValue('item', 'item', line, items[i].item);
                                        invoiceRecord.setLineItemValue('item', 'price', line, '-1');
                                        //invoiceRecord.setLineItemValue('item', 'department', 1, '');
                                        invoiceRecord.setLineItemValue('item', 'quantity', line, '1');
                                        invoiceRecord.setLineItemValue('item', 'rate', line, items[i].amount);
                                        invoiceRecord.setLineItemValue('item', 'amount', line, items[i].amount);

                                        var taxId = nlapiLookupField('item', items[i].item, 'taxschedule');
                                        if(taxId == '1'){
                                            //Non Taxable
                                            invoiceRecord.setLineItemValue('item', 'taxcode', line, '82');
                                        }

                                        /**
                                        if (!isBlank(altusRoadUseObj.gst) && !isBlank(altusRoadUseObj.province)) {

                                            var state = altusRoadUseObj.province;
                                            var taxId = getTaxGroupGST(state, TAX_RATE);
                                            nlapiLogExecution('AUDIT', 'Tax Calculation', 'STATE: ' + state + ' | TAX ID: ' + taxId);
                                            if (!isBlank(taxId)) {
                                                invoiceRecord.setLineItemValue('item', 'taxcode', line, taxId);
                                            }
                                        }
                                         **/
                                    }
                                    //endregion ITEM LINES INVOICE (other charges)

                                    //region VALIDATE TOTAL AMOUNT INVOICE
                                    var invoiceAmount = parseFloat(0.00);
                                    for (var z in totalValidator) {
                                        invoiceAmount += parseFloat(totalValidator[z].amount) + parseFloat(totalValidator[z].tax);
                                        invoiceAmount += parseFloat(roadUseItemPrice).toFixed(2);
                                    }
                                    nlapiLogExecution('AUDIT', 'COMPARE AMOUNTS', 'Invoice Amount: ' + parseFloat(invoiceAmount).toFixed(2) + ' | Grand Total: ' + altusRoadUseObj.grandtotal);
                                    nlapiLogExecution('AUDIT', 'invoiceRecord', JSON.stringify(invoiceRecord));
                                    //endregion VALIDATE TOTAL AMOUNT INVOICE

                                    try {
                                        
                                        var RecordID = nlapiSubmitRecord(invoiceRecord);
                                        //nlapiLogExecution('Audit','Test',RecordID);
                                        nlapiSubmitField('invoice', RecordID, 'custbody_syncaltusru_link', altusId);
                                        var subsidiary = nlapiLookupField('invoice', RecordID, 'subsidiary');

                                        nlapiSubmitField(ALTUS_ROAD_USE, altusId, FIELD_ERROR_MESSAGE, '');
                                        nlapiSubmitField(ALTUS_ROAD_USE, altusId, FIELD_SYNC_STATUS, syncStatus.COMPLETE);
                                        nlapiSubmitField(ALTUS_ROAD_USE, altusId, FIELD_NSID, 'INV: ' + RecordID);
                                        nlapiSubmitField(ALTUS_ROAD_USE, altusId, FIELD_NSLINK, RecordID);

                                        nlapiLogExecution('DEBUG', '008 Sync Contact Record', 'Contact Details | Entity:' + altusRoadUseObj.entity + ' | Subsidiary: ' + subsidiary + ' | Attention: ' + altusRoadUseObj.attention_to + ' | Email: ' + altusRoadUseObj.email + ' | Record ID: ' + RecordID);

                                        try {
                                            createAttachContact(altusRoadUseObj.entity, subsidiary, altusRoadUseObj.applicant_contact, altusRoadUseObj.email, RecordID);
                                        }
                                        catch(ex){}


                                    }
                                    catch (ex) {
                                        nlapiLogExecution('ERROR', ex instanceof nlobjError ? ex.getCode() : 'CUSTOM_ERROR_CODE', ex instanceof nlobjError ? ex.getDetails() : 'JavaScript Error: ' + (ex.message !== null ? ex.message : ex));
                                        nlapiSubmitField(ALTUS_ROAD_USE, altusId, FIELD_SYNC_STATUS, syncStatus.ERROR);
                                        nlapiSubmitField(ALTUS_ROAD_USE, altusId, FIELD_ERROR_MESSAGE, ex.getDetails());
                                        //TC10ROD apply retry logic
                                        var altusData = getAltusData(altusId)
                                        nlapiSubmitField(ALTUS_ROAD_USE, altusId, FIELD_RETRIES, (Number(altusData[FIELD_RETRIES]) - 1));
//                                        nlapiSubmitField(ALTUS_ROAD_USE, altusId, FIELD_RETRIES, 0);
                                        IS_ERROR = true;
                                        //!!!***!!! This has been changed to provide a more informative error code instead of the duplicate of another message
                                        //nlapiLogExecution('AUDIT', 'CALLSCHEDULEDSYNCALTUSROADUSE', 'altusId  with Internal ID ' + altusId + ' Altus ID: ' + item + ', not found in Item Record');
                                        nlapiLogExecution('AUDIT', 'CALLSCHEDULEDSYNCALTUSROADUSE', 'Internal ID: ' + altusId + ' Altus ID: ' + item + ', an error has occured please check for other messages');
                                        
                                    }
                                }
                                //!!!***!!! originally just an else
                                else if(!isBlank(cancellation)&&(cancellation.toUpperCase()=='YES')){///!!!***!!!This was catch all, this will only work for yes
                                    //Create Credit Memo
                                    nlapiLogExecution('AUDIT', 'TRANSFORM TYPE', 'CREDIT MEMO');
                                    //Create Invoice
                                    var creditMemoRecord = nlapiCreateRecord('creditmemo');

                                    //region DEFAULTS CREDIT MEMO
                                    creditMemoRecord.setFieldValue('customform', TIMBER_ROAD_USE_CREDIT_MEMO);
                                    creditMemoRecord.setFieldValue('account', ACCOUNT_ROAD_USE);
                                    creditMemoRecord.setFieldValue('entity', altusRoadUseObj.entity);

                                    if(!isBlank(altusRoadUseObj.cancelled_date)) {
                                        creditMemoRecord.setFieldValue('trandate', altusRoadUseObj.cancelled_date);
                                    }
                                    else{
                                        nlapiSubmitField(ALTUS_ROAD_USE, altusId, FIELD_SYNC_STATUS, syncStatus.ERROR);
                                        nlapiSubmitField(ALTUS_ROAD_USE, altusId, FIELD_ERROR_MESSAGE, 'Invalid cancelled_date');
                                        //TC10ROD apply retry logic
                                        var altusData = getAltusData(altusId)
                                        nlapiSubmitField(ALTUS_ROAD_USE, altusId, FIELD_RETRIES, (Number(altusData[FIELD_RETRIES]) - 1));
//                                        nlapiSubmitField(ALTUS_ROAD_USE, altusId, FIELD_RETRIES, 0);
                                        //TC10ROD continue and skip this if there is an error
                                        continue;
                                    }

                                    if (!isBlank(altusRoadUseObj.invoice_number)) {
                                        creditMemoRecord.setFieldValue('memo', altusRoadUseObj.invoice_number);
                                        creditMemoRecord.setFieldValue('custbody_altus_id_search', altusRoadUseObj.invoice_number);
//                                        creditMemoRecord.setFieldValue('externalid', altusRoadUseObj.invoice_number + '_ALTUSRU_CM');
                                    }

                                    if(!isBlank(altusRoadUseObj.altkey)){
                                        creditMemoRecord.setFieldValue('custbody1', altusRoadUseObj.altkey);
                                    }
                                    if(!isBlank(altusRoadUseObj.batch_id)){
                                        creditMemoRecord.setFieldValue('custbody_altus_batch_id', altusRoadUseObj.batch_id);
                                    }

                                    if(!isBlank(altusRoadUseObj.applicant_contact)){
                                        creditMemoRecord.setFieldValue('custbody_syncaltusru_applicant_contact', altusRoadUseObj.applicant_contact);
                                    }
                                    //endregion DEFAULTS CREDIT MEMO

                                    //region DETAILS CREDIT MEMO
                                    for (var key in mappingCreditMemo) {
                                        if (!isBlank(altusRoadUseObj[key])) {
                                            creditMemoRecord.setFieldValue(mappingCreditMemo[key], altusRoadUseObj[key]);
                                        }
                                        nlapiLogExecution('AUDIT', 'MAPPING', 'Field: ' + mappingCreditMemo[key] + ' | Value: ' + altusRoadUseObj[key]);
                                    }
                                    //endregion DETAILS CREDIT MEMO

                                    //region ADDRESS CREDIT MEMO
                                    //Search for existing Address
                                    var addressInternalId = getCustomerAddress(altusRoadUseObj.entity, altusRoadUseObj.province, 'CA', altusRoadUseObj.postalcode, altusRoadUseObj.city, altusRoadUseObj.mailingaddress);

                                    //Address
                                    if (isBlank(addressInternalId)) {

                                        var billAddr1 = '';
                                        if (!isBlank(altusRoadUseObj.suite_floor)) {
                                            billAddr1 += altusRoadUseObj.suite_floor;
                                        }
                                        if (!isBlank(altusRoadUseObj.mailingaddress)) {
                                            if (billAddr1) {
                                                billAddr1 += ' ';
                                            }
                                            billAddr1 += altusRoadUseObj.mailingaddress;
                                        }
                                        creditMemoRecord.setFieldValue('billaddr1', billAddr1);
                                        creditMemoRecord.setFieldValue('billcity', altusRoadUseObj.city);
                                        creditMemoRecord.setFieldValue('billstate', altusRoadUseObj.province);
                                        creditMemoRecord.setFieldValue('billcountry', 'CA');
                                        creditMemoRecord.setFieldValue('billzip', altusRoadUseObj.postalcode);
                                    }
                                    else {
                                        creditMemoRecord.setFieldValue('billaddresslist', addressInternalId);
                                    }
                                    //endregion ADDRESS CREDIT MEMO

                                    //region ITEM LINES CREDIT MEMO (DLO)
                                    //1.0.1 - TC10ROD 03182020 just initialize roadUseItem so u can uppercase it, raised by katherine, previous batch would have gotten that error cause they dont have value as well
                                    var roadUseItem = "";
                                    var roadUseItemPrice;
                                    var roadUseItemQuantity;
                                    var totalLines = 1;

                                    var json = altusRoadUseObj;
                                    var dloItems = [];

                                    for (key in json) {
                                        if (json.hasOwnProperty(key)) {
/*                                            if (key.indexOf('dlo') > -1) {
                                                if (key.indexOf('_stotal') > -1) {
                                                    roadUseItemPrice = json[key].replace(/\$|,/g, '');
                                                }
                                                else {
                                                    roadUseItem = key.toUpperCase();
                                                    roadUseItemQuantity = json[key];
                                                }
                                                
                                                dloItems.push({
                                                    'roadUseItemPrice': roadUseItemPrice,
                                                    'roadUseItem': roadUseItem.toUpperCase(),
                                                    'roadUseItemQuantity': roadUseItemQuantity
                                                });
                                            }*/
                                        	//TC10ROD 01162020 copy exactly whats in invoice 
                                        	if (key.indexOf('_stotal') > -1) {

                                                var roadUseItem;
                                                var roadUseItemPrice;
                                                var roadUseItemQuantity;

                                                //1.0.1 TC10ROD why you need to loop through this?
                                                roadUseItemPrice = json[key];
                                              
                                                for (var qKey in json) {
                                                  //1.0.1 keep this original logic
                                                    if (qKey == key.replace('_stotal', '')) {
                                                        roadUseItemQuantity = json[qKey];
                                                        roadUseItem = key.replace('_stotal', '');
                                                    }
                                                    else if (qKey == key) {
                                                        roadUseItemQuantity = json[qKey];
                                                        roadUseItem = key.replace('_stotal', '');
                                                    }
                                                }
                                                dloItems.push({
                                                    'roadUseItemPrice': roadUseItemPrice,
                                                    'roadUseItem': roadUseItem.toUpperCase(),
                                                    'roadUseItemQuantity': roadUseItemQuantity
                                                });
                                            }
                                        }
                                    }
                                    
                                    nlapiLogExecution('AUDIT', 'DLO ITEMS', JSON.stringify(dloItems));
                                    var totalLines = 1;
                                    for (var i in dloItems) {
                                        var zLine = 1 + parseInt(i);
                                        creditMemoRecord.setLineItemValue('item', 'item', zLine, altusRoadUseObj.item);
                                        creditMemoRecord.setLineItemValue('item', 'price', zLine, '-1');
                                        //creditMemoRecord.setLineItemValue('item', 'department', zLine, '');
                                        creditMemoRecord.setLineItemValue('item', 'custcol_altus_roadname', zLine, dloItems[i].roadUseItem);
                                        creditMemoRecord.setLineItemValue('item', 'quantity', zLine, '1');
                                        creditMemoRecord.setLineItemValue('item', 'custcol_kms_used', zLine, dloItems[i].roadUseItemQuantity);
                                        creditMemoRecord.setLineItemValue('item', 'rate', zLine, dloItems[i].roadUseItemPrice);
                                        creditMemoRecord.setLineItemValue('item', 'amount', zLine, dloItems[i].roadUseItemPrice);

                                        var taxId = nlapiLookupField('item', altusRoadUseObj.item, 'taxschedule');
                                        //1.0.2 - commented out line above, uncommented line below - TC10ROD
                                        //reported issue traced back on this line, cannot lookup because there is no item, previous comment shows that this has been applied elsewhere 
                                        //it did not help so return to orig, this issue was resolve elsewhere, it was caused by no item being matched with invoice type
                                        //var taxId = altusRoadUseObj.item ? nlapiLookupField('item', altusRoadUseObj.item, 'taxschedule') : ""; //should you apply this to invoice as well? TC10ROD 03252020, wait for go signal for this
                                        if(taxId == '1'){
                                            //Non Taxable
//                                            creditMemoRecord.setLineItemValue('item', 'taxcode', line, '82');
                                            creditMemoRecord.setLineItemValue('item', 'taxcode', zLine, '82');
                                        }

                                        /**
                                        if (!isBlank(altusRoadUseObj.gst) && !isBlank(altusRoadUseObj.province)) {

                                            var state = altusRoadUseObj.province;
                                            var taxId = getTaxGroupGST(state, TAX_RATE);
                                            nlapiLogExecution('AUDIT', 'Tax Calculation', 'STATE: ' + state + ' | TAX ID: ' + taxId);
                                            if (!isBlank(taxId)) {
                                                invoiceRecord.setLineItemValue('item', 'taxcode', zLine, taxId);
                                            }
                                        }
                                         **/
                                        totalLines++;
                                    }
                                    //TC10ROD 01162020 , change to be able to create multiple DLO lines, just like in INVOICES, c/o marie hansen
//                                    creditMemoRecord.setLineItemValue('item', 'item', 1, altusRoadUseObj.item);
//                                    //creditMemoRecord.setLineItemValue('item', 'department', 1, '');
//                                    creditMemoRecord.setLineItemValue('item', 'price', 1, '-1');
//                                    creditMemoRecord.setLineItemValue('item', 'custcol_kms_used', 1, roadUseItemQuantity);
//                                    creditMemoRecord.setLineItemValue('item', 'custcol_altus_roadname', 1, roadUseItem);
//                                    creditMemoRecord.setLineItemValue('item', 'quantity', 1, '1');
//                                    creditMemoRecord.setLineItemValue('item', 'rate', 1, roadUseItemPrice);
//                                    creditMemoRecord.setLineItemValue('item', 'amount', 1, roadUseItemPrice);
//                                    
//                                    var taxId = nlapiLookupField('item', altusRoadUseObj.item, 'taxschedule');
//                                    if(taxId == '1'){
//                                        //Non Taxable
//                                    	//TC10ROD why use var line, use 1 instead cause 1 is the hardcoded value above
////                                        creditMemoRecord.setLineItemValue('item', 'taxcode', line, '82');
//                                        creditMemoRecord.setLineItemValue('item', 'taxcode', 1, '82');
//                                    }
//                                    totalLines += 1;

                                    /**

                                    if (!isBlank(altusRoadUseObj.gst) && !isBlank(altusRoadUseObj.province)) {

                                        var state = altusRoadUseObj.province;
                                        var taxId = getTaxGroupGST(state, TAX_RATE);
                                        nlapiLogExecution('AUDIT', 'Tax Calculation', 'STATE: ' + state + ' | TAX ID: ' + taxId);
                                        if (!isBlank(taxId)) {
                                            creditMemoRecord.setLineItemValue('item', 'taxcode', 1, taxId);
                                        }
                                    }
                                     **/

                                    //endregion ITEM LINES CREDIT MEMO (DLO)

                                    //region ITEM LINES CREDIT MEMO (other charges)
                                    for (var i in items) {

                                        var taxAmt = parseFloat(items[i].amount) * .05;
                                        var totalValidator = [];
                                        totalValidator.push({
                                            'amount': items[i].amount,
                                            'tax': taxAmt
                                        });

                                        //TC10ROD why use 2, use totalLines instead
                                        var line = totalLines + parseInt(i);
                                        nlapiLogExecution('AUDIT', 'SET LINE ITEMS', 'Line: ' + line + ' | Amount: ' + items[i].amount + ' | Item: ' + items[i].item);

                                        creditMemoRecord.setLineItemValue('item', 'item', line, items[i].item);
                                        creditMemoRecord.setLineItemValue('item', 'price', line, '-1');
                                        //creditMemoRecord.setLineItemValue('item', 'department', 1, '');
                                        creditMemoRecord.setLineItemValue('item', 'quantity', line, '1');
                                        creditMemoRecord.setLineItemValue('item', 'rate', line, items[i].amount);
                                        creditMemoRecord.setLineItemValue('item', 'amount', line, items[i].amount);

                                        var taxId = nlapiLookupField('item', items[i].item, 'taxschedule');
                                        if(taxId == '1'){
                                            //Non Taxable
                                            creditMemoRecord.setLineItemValue('item', 'taxcode', line, '82');
                                        }
                                        totalLines++;
                                        /**
                                        if (!isBlank(altusRoadUseObj.gst) && !isBlank(altusRoadUseObj.province)) {

                                            var state = altusRoadUseObj.province;
                                            var taxId = getTaxGroupGST(state, TAX_RATE);
                                            nlapiLogExecution('AUDIT', 'Tax Calculation', 'STATE: ' + state + ' | TAX ID: ' + taxId);
                                            if (!isBlank(taxId)) {
                                                creditMemoRecord.setLineItemValue('item', 'taxcode', line, taxId);
                                            }
                                        }
                                         **/
                                    }
                                    //endregion ITEM LINES CREDIT MEMO (other charges)

                                    //region VALIDATE TOTAL AMOUNT CREDIT MEMO
                                    var creditMemoAmount = parseFloat(0.00);
                                    for (var z in totalValidator) {
                                        creditMemoAmount += parseFloat(totalValidator[z].amount) + parseFloat(totalValidator[z].tax);
                                        creditMemoAmount += parseFloat(roadUseItemPrice).toFixed(2);
                                    }
                                    nlapiLogExecution('AUDIT', 'COMPARE AMOUNTS', 'Credit Memo Amount: ' + parseFloat(creditMemoAmount).toFixed(2) + ' | Grand Total: ' + altusRoadUseObj.grandtotal);
                                    nlapiLogExecution('AUDIT', 'creditMemoRecord', JSON.stringify(invoiceRecord));
                                    //endregion VALIDATE TOTAL AMOUNT CREDIT MEMO

                                    try {

                                        var RecordID = nlapiSubmitRecord(creditMemoRecord);
                                        nlapiSubmitField('creditmemo', RecordID, 'custbody_syncaltusru_link', altusId);
                                        var subsidiary = nlapiLookupField('creditmemo', RecordID, 'subsidiary');

                                        nlapiSubmitField(ALTUS_ROAD_USE, altusId, FIELD_ERROR_MESSAGE, '');
                                        nlapiSubmitField(ALTUS_ROAD_USE, altusId, FIELD_SYNC_STATUS, syncStatus.COMPLETE);
                                        nlapiSubmitField(ALTUS_ROAD_USE, altusId, FIELD_NSID, 'INV: ' + RecordID);
                                        nlapiSubmitField(ALTUS_ROAD_USE, altusId, FIELD_NSLINK, RecordID);

                                        nlapiLogExecution('DEBUG', '008 Sync Contact Record', 'Contact Details | Entity:' + altusRoadUseObj.entity + ' | Subsidiary: ' + subsidiary + ' | Attention: ' + altusRoadUseObj.applicant_contact + ' | Email: ' + altusRoadUseObj.email + ' | Record ID: ' + RecordID);
                                        try {
                                            createAttachContact(altusRoadUseObj.entity, subsidiary, altusRoadUseObj.applicant_contact, altusRoadUseObj.email, RecordID);
                                        }
                                        catch(ex){}

                                    }
                                    catch (ex) {
                                        nlapiLogExecution('ERROR', ex instanceof nlobjError ? ex.getCode() : 'CUSTOM_ERROR_CODE', ex instanceof nlobjError ? ex.getDetails() : 'JavaScript Error: ' + (ex.message !== null ? ex.message : ex));
                                        nlapiSubmitField(ALTUS_ROAD_USE, altusId, FIELD_SYNC_STATUS, syncStatus.ERROR);
                                        nlapiSubmitField(ALTUS_ROAD_USE, altusId, FIELD_ERROR_MESSAGE, ex.getDetails());
                                        //TC10ROD apply retry logic
                                        var altusData = getAltusData(altusId)
                                        nlapiSubmitField(ALTUS_ROAD_USE, altusId, FIELD_RETRIES, (Number(altusData[FIELD_RETRIES]) - 1));
//                                        nlapiSubmitField(ALTUS_ROAD_USE, altusId, FIELD_RETRIES, 0);
                                        IS_ERROR = true;
                                        nlapiLogExecution('AUDIT', 'ERROR', 'altusId  with Internal ID ' + altusId + ' Altus ID not found in Item Record');
                                      //TC10ROD continue and skip this if there is an error
                                        continue;
                                    }
                                }
                                else{//!!!***!!! This is a catch all if the cancellation is anything that should not be accepted
                                    nlapiSubmitField(ALTUS_ROAD_USE, altusId, FIELD_SYNC_STATUS, syncStatus.ERROR);
                                    nlapiSubmitField(ALTUS_ROAD_USE, altusId, FIELD_ERROR_MESSAGE, "The cancellation status of this record was not one of Yes, No, or Blank");
                                    //TC10ROD apply retry logic
                                    var altusData = getAltusData(altusId)
                                    nlapiSubmitField(ALTUS_ROAD_USE, altusId, FIELD_RETRIES, (Number(altusData[FIELD_RETRIES]) - 1));
                                    
                                    
                                    IS_ERROR = true;
                                    //!!!***!!! This has been changed to provide a more informative error code instead of the duplicate of another message
                                    //nlapiLogExecution('AUDIT', 'CALLSCHEDULEDSYNCALTUSROADUSE', 'altusId  with Internal ID ' + altusId + ' Altus ID: ' + item + ', not found in Item Record');
                                    nlapiLogExecution('AUDIT', 'CALLSCHEDULEDSYNCALTUSROADUSE', 'Internal ID: ' + altusId + ' Altus ID: ' + item + ', an error has occured please check for other messages');
                                 
                                }
                            }
                            else {
                                //Throw errors
                                var errorMsg = '';
                                for (var i in itemErrors) {
                                    errorMsg += itemErrors[i].message + ' ';
                                }
                                nlapiSubmitField(ALTUS_ROAD_USE, altusId, FIELD_SYNC_STATUS, syncStatus.ERROR);
                                nlapiSubmitField(ALTUS_ROAD_USE, altusId, FIELD_ERROR_MESSAGE, errorMsg);
                              //TC10ROD apply retry logic
                                var altusData = getAltusData(altusId)
                                nlapiSubmitField(ALTUS_ROAD_USE, altusId, FIELD_RETRIES, (Number(altusData[FIELD_RETRIES]) - 1));
                                
                                nlapiLogExecution('AUDIT', 'ERROR', errorMsg);
                            }
                        }
                    }
                }
        	}
        	catch(e)
        	{
        		nlapiLogExecution("ERROR", "ERROR in function ScheduledSyncAltusLandUse", JSON.stringify(e));
            	
        		nlapiSubmitField(ALTUS_ROAD_USE,altusId,[FIELD_SYNC_STATUS, FIELD_ERROR_MESSAGE],[syncStatus.ERROR, e.message]);
        		
        		//TC10ROD apply retry logic
                var altusData = getAltusData(altusId)
                nlapiSubmitField(ALTUS_ROAD_USE, altusId, FIELD_RETRIES, (Number(altusData[FIELD_RETRIES]) - 1));
                
        		nlapiLogExecution("ERROR", "ERROR in function ScheduledSyncAltusLandUse", e.message);
        	
        		nlapiLogExecution("DEBUG", "ERROR in function ScheduledSyncAltusRoadUse", e.message);
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

    var searchResults = nlapiSearchRecord(ALTUS_ROAD_USE,null,filters,columns);

    if(searchResults) {
        var nextSyncMSID = searchResults[0].getValue('internalid');
        nlapiLogExecution('AUDIT','CALLSCHEDULEDSYNC_ALTUS_ROAD_USE','Additional records to sync found. Queueing '+nextSyncMSID);
      //TC10ROD
      if(!nextSyncMSID)
        {
          return;
        }
        var newParams = {'custscript_syncaltusroaduseid':nextSyncMSID};
        var ScheduleStatus = nlapiScheduleScript("customscript_sched_syncaltusru",null,newParams); //Deployment is empty so that script selects first available deployment
        if(ScheduleStatus == 'QUEUED') {
            nlapiSubmitField(ALTUS_ROAD_USE, nextSyncMSID, FIELD_SYNC_STATUS,'6');
        } //Else no available deployments - remaining records will be caught by periodic retry script
    } else {
        nlapiLogExecution('AUDIT','CALLSCHEDULEDSYNCMSPO','No records to sync found.');
    }
}


/**
 * Sync Status List
 * @type {{NEW: string, PROCESSING: string, ERROR: string, COMPLETE: string, TO_REPROCESS: string, QUEUED: string, DUPLICATE: string}}
 */
var syncStatus = {
    'NEW' : '1',
    'PROCESSING' : '2',
    'ERROR' : '3',
    'COMPLETE' : '4',
    'TO_REPROCESS' : '5',
    'QUEUED' : '6',
    'DUPLICATE' : '7'
};

var setDefault = function (invoiceObj) {
    invoiceObj.setFieldValue('customform', TIMBER_LAND_USE_INVOICE);

}


//region FUNCTIONS

var getAltusRecords = function (statusArr, altusId) {

    var altusRecordsArr = [];

    if(!isBlank(altusId)) {

        var search = nlapiSearchRecord('customrecord_syncaltusru', null,
            [
                [FIELD_SYNC_STATUS, 'anyof', statusArr],
                'AND',
                ['internalid', 'anyof', altusId]
            ],
            [
                new nlobjSearchColumn('internalid')
            ]
        );
    }
    else{
        var search = nlapiSearchRecord('customrecord_syncaltusru', null,
            [
                [FIELD_SYNC_STATUS, 'anyof', statusArr]
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

var getItemIDByInvoiceType = function (invoiceType) {
    var internalId = '';
    var itemSearch = nlapiSearchRecord('item',null,
        [
            ['custitem_altusid','is', invoiceType]
        ],null);
    if(!isBlank(itemSearch)){
        internalId = itemSearch[0].getId();
    }
    return internalId;
};

//endregion FUNCTIONS

var ALTUS_ROAD_USE_OBJ = function (altusRoadUseObj) {
    var arr = {};
    arr.companynum = setToEmptyIfNull(altusRoadUseObj.getFieldValue('custrecord_syncaltusru_companynum'));
    arr.companyname = setToEmptyIfNull(altusRoadUseObj.getFieldValue('custrecord_syncaltusru_companyname'));
    arr.applicant_contact = setToEmptyIfNull(altusRoadUseObj.getFieldValue('custrecord_syncaltusru_applicant_contact'));
    arr.email = setToEmptyIfNull(altusRoadUseObj.getFieldValue('custrecord_syncaltusru_email'));
    arr.suite_floor = setToEmptyIfNull(altusRoadUseObj.getFieldValue('custrecord_syncaltusru_suite_floor'));
    arr.mailingaddress = setToEmptyIfNull(altusRoadUseObj.getFieldValue('custrecord_syncaltusru_mailingaddress'));
    arr.city = setToEmptyIfNull(altusRoadUseObj.getFieldValue('custrecord_syncaltusru_city'));
    arr.province = setToEmptyIfNull(altusRoadUseObj.getFieldValue('custrecord_syncaltusru_province'));
    arr.postalcode = setToEmptyIfNull(altusRoadUseObj.getFieldValue('custrecord_syncaltusru_postalcode'));
    arr.invoice_number = setToEmptyIfNull(altusRoadUseObj.getFieldValue('custrecord_syncaltusru_invoice_number'));
    arr.invoice_date = setToEmptyIfNull(altusRoadUseObj.getFieldValue('custrecord_syncaltusru_invoice_date'));
    arr.invoice_type = setToEmptyIfNull(altusRoadUseObj.getFieldValue('custrecord_syncaltusru_invoice_type'));
    arr.inv_desc = setToEmptyIfNull(altusRoadUseObj.getFieldValue('custrecord_syncaltusru_inv_desc'));
    arr.cancellation = setToEmptyIfNull(altusRoadUseObj.getFieldValue('custrecord_syncaltusru_cancellation'));
    arr.cancelled_inv_no = setToEmptyIfNull(altusRoadUseObj.getFieldValue('custrecord_syncaltusru_cancelled_inv_no'));
    arr.cancelled_date = setToEmptyIfNull(altusRoadUseObj.getFieldValue('custrecord_syncaltusru_cancelled_date'));
    arr.cancelled_reason = setToEmptyIfNull(altusRoadUseObj.getFieldValue('custrecord_syncaltusru_cancelled_reason'));
    arr.altkey = setToEmptyIfNull(altusRoadUseObj.getFieldValue('custrecord_syncaltusru_altkey'));
    arr.roaduse_id = setToEmptyIfNull(altusRoadUseObj.getFieldValue('custrecord_syncaltusru_roaduse_id'));
    arr.dlo930569 = setToEmptyIfNullAmount(altusRoadUseObj.getFieldValue('custrecord_syncaltusru_dlo930569'));
    arr.dlo021444 = setToEmptyIfNullAmount(altusRoadUseObj.getFieldValue('custrecord_syncaltusru_dlo021444'));
    arr.dlo121550 = setToEmptyIfNullAmount(altusRoadUseObj.getFieldValue('custrecord_syncaltusru_dlo121550'));
    arr.dlo131191 = setToEmptyIfNullAmount(altusRoadUseObj.getFieldValue('custrecord_syncaltusru_dlo131191'));
    arr.dlo150134 = setToEmptyIfNullAmount(altusRoadUseObj.getFieldValue('custrecord_syncaltusru_dlo150134'));
    arr.dlo801590 = setToEmptyIfNullAmount(altusRoadUseObj.getFieldValue('custrecord_syncaltusru_dlo801590'));
    arr.dlo810304 = setToEmptyIfNullAmount(altusRoadUseObj.getFieldValue('custrecord_syncaltusru_dlo810304'));
    arr.dlo861335 = setToEmptyIfNullAmount(altusRoadUseObj.getFieldValue('custrecord_syncaltusru_dlo861335'));
    arr.dlo870011 = setToEmptyIfNullAmount(altusRoadUseObj.getFieldValue('custrecord_syncaltusru_dlo870011'));
    arr.dlo870034 = setToEmptyIfNullAmount(altusRoadUseObj.getFieldValue('custrecord_syncaltusru_dlo870034'));
    arr.dlo890261 = setToEmptyIfNullAmount(altusRoadUseObj.getFieldValue('custrecord_syncaltusru_dlo890261'));
    arr.dlo900627 = setToEmptyIfNullAmount(altusRoadUseObj.getFieldValue('custrecord_syncaltusru_dlo900627'));
    arr.dlo910443 = setToEmptyIfNullAmount(altusRoadUseObj.getFieldValue('custrecord_syncaltusru_dlo910443'));
    arr.dlo920147 = setToEmptyIfNullAmount(altusRoadUseObj.getFieldValue('custrecord_syncaltusru_dlo920147'));
    arr.dlo920404 = setToEmptyIfNullAmount(altusRoadUseObj.getFieldValue('custrecord_syncaltusru_dlo920404'));
    arr.dlo920405 = setToEmptyIfNullAmount(altusRoadUseObj.getFieldValue('custrecord_syncaltusru_dlo920405'));
    arr.dlo941360 = setToEmptyIfNullAmount(altusRoadUseObj.getFieldValue('custrecord_syncaltusru_dlo941360'));
    arr.dlo980968 = setToEmptyIfNullAmount(altusRoadUseObj.getFieldValue('custrecord_syncaltusru_dlo980968'));
    arr.dlo981367 = setToEmptyIfNullAmount(altusRoadUseObj.getFieldValue('custrecord_syncaltusru_dlo981367'));
    arr.dlo062744 = setToEmptyIfNullAmount(altusRoadUseObj.getFieldValue('custrecord_syncaltusru_dlo062744'));
    arr.other_fee = setToEmptyIfNullAmount(altusRoadUseObj.getFieldValue('custrecord_syncaltusru_other_fee'));
    arr.initial_consid = setToEmptyIfNullAmount(altusRoadUseObj.getFieldValue('custrecord_syncaltusru_initial_consid'));
    arr.bridge_fee = setToEmptyIfNullAmount(altusRoadUseObj.getFieldValue('custrecord_syncaltusru_bridge_fee'));
    arr.admin = setToEmptyIfNullAmount(altusRoadUseObj.getFieldValue('custrecord_syncaltusru_admin'));
    arr.dlo930569_stotal = setToEmptyIfNullAmount(altusRoadUseObj.getFieldValue('custrecord_syncaltusru_dlo930569_stotal'));
    arr.dlo021444_stotal = setToEmptyIfNullAmount(altusRoadUseObj.getFieldValue('custrecord_syncaltusru_dlo021444_stotal'));
    arr.dlo121550_stotal = setToEmptyIfNullAmount(altusRoadUseObj.getFieldValue('custrecord_syncaltusru_dlo121550_stotal'));
    arr.dlo131191_stotal = setToEmptyIfNullAmount(altusRoadUseObj.getFieldValue('custrecord_syncaltusru_dlo131191_stotal'));
    arr.dlo150134_stotal = setToEmptyIfNullAmount(altusRoadUseObj.getFieldValue('custrecord_syncaltusru_dlo150134_stotal'));
    arr.dlo801590_stotal = setToEmptyIfNullAmount(altusRoadUseObj.getFieldValue('custrecord_syncaltusru_dlo801590_stotal'));
    arr.dlo810304_stotal = setToEmptyIfNullAmount(altusRoadUseObj.getFieldValue('custrecord_syncaltusru_dlo810304_stotal'));
    arr.dlo861335_stotal = setToEmptyIfNullAmount(altusRoadUseObj.getFieldValue('custrecord_syncaltusru_dlo861335_stotal'));
    arr.dlo870011_stotal = setToEmptyIfNullAmount(altusRoadUseObj.getFieldValue('custrecord_syncaltusru_dlo870011_stotal'));
    arr.dlo870034_stotal = setToEmptyIfNullAmount(altusRoadUseObj.getFieldValue('custrecord_syncaltusru_dlo870034_stotal'));
    arr.dlo890261_stotal = setToEmptyIfNullAmount(altusRoadUseObj.getFieldValue('custrecord_syncaltusru_dlo890261_stotal'));
    arr.dlo900627_stotal = setToEmptyIfNullAmount(altusRoadUseObj.getFieldValue('custrecord_syncaltusru_dlo900627_stotal'));
    arr.dlo910443_stotal = setToEmptyIfNullAmount(altusRoadUseObj.getFieldValue('custrecord_syncaltusru_dlo910443_stotal'));
    arr.dlo920147_stotal = setToEmptyIfNullAmount(altusRoadUseObj.getFieldValue('custrecord_syncaltusru_dlo920147_stotal'));
    arr.dlo920404_stotal = setToEmptyIfNullAmount(altusRoadUseObj.getFieldValue('custrecord_syncaltusru_dlo920404_stotal'));
    arr.dlo920405_stotal = setToEmptyIfNullAmount(altusRoadUseObj.getFieldValue('custrecord_syncaltusru_dlo920405_stotal'));
    arr.dlo941360_stotal = setToEmptyIfNullAmount(altusRoadUseObj.getFieldValue('custrecord_syncaltusru_dlo941360_stotal'));
    arr.dlo980968_stotal = setToEmptyIfNullAmount(altusRoadUseObj.getFieldValue('custrecord_syncaltusru_dlo980968_stotal'));
    arr.dlo981367_stotal = setToEmptyIfNullAmount(altusRoadUseObj.getFieldValue('custrecord_syncaltusru_dlo981367_stotal'));
    arr.dlo062744_stotal = setToEmptyIfNullAmount(altusRoadUseObj.getFieldValue('custrecord_syncaltusru_dlo062744_stotal'));
    arr.comments = setToEmptyIfNull(altusRoadUseObj.getFieldValue('custrecord_syncaltusru_comments'));
    arr.gst = setToEmptyIfNullAmount(altusRoadUseObj.getFieldValue('custrecord_syncaltusru_gst'));
    arr.grandtotal = setToEmptyIfNullAmount(altusRoadUseObj.getFieldValue('custrecord_syncaltusru_grandtotal'));
    arr.batch_id = setToEmptyIfNull(altusRoadUseObj.getFieldValue('custrecord_syncaltusru_batchid'));
    return arr;
};

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
};

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

var mappingInvoice = {
    'entity' : 'entity',
    'invoice_date' : 'trandate',
    'invoice_type' : 'custbody_syncaltuslu_invoice_type',
    'inv_desc' : 'custbody_syncaltusru_inv_desc',
    'cancellation' : 'custbody_syncaltusru_cancellation',
    'cancelled_inv_no' : 'custbody_syncaltusru_cancelled_inv_no',
    'cancelled_date' : 'custbody_syncaltusru_cancelled_date',
    'cancelled_reason' : 'custbody_syncaltusru_cancelled_reason',
    'roaduse_id' : 'custbody_syncaltusru_roaduse_id',
    'comments' : 'custbody_syncaltuslu_comments',
    'invoice_num' : 'custbody_altus_id_search'
};

var mappingCreditMemo = {
    'entity' : 'entity',
    'invoice_date' : 'trandate',
    'invoice_type' : 'custbody_syncaltuslu_invoice_type',
    'inv_desc' : 'custbody_syncaltusru_inv_desc',
    'cancellation' : 'custbody_syncaltusru_cancellation',
    'cancelled_inv_no' : 'custbody_syncaltusru_cancelled_inv_no',
    'cancelled_date' : 'custbody_syncaltusru_cancelled_date',
    'cancelled_reason' : 'custbody_syncaltusru_cancelled_reason',
    'roaduse_id' : 'custbody_syncaltusru_roaduse_id',
    'comments' : 'custbody_syncaltuslu_comments',
    'invoice_num' : 'custbody_altus_id_search'
};

var getCustomerAddress = function (customerId, state, country, zipcode, city, syncLandUseAddr) {

    var addrId = '';
    var addressArr = [];
    var addrStr = '';

    var customerSearch = nlapiSearchRecord('customer',null,
        [
            ['internalid','anyof',customerId],
            'AND',
            ['address.state','anyof',state],
            'AND',
            ['address.country','anyof',country],
            'AND',
            ['address.zipcode','is',zipcode],
            'AND',
            ['address.city','is',city]
        ],
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
    return addrId;
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
            var contactId = nlapiSubmitRecord(contact);
            nlapiAttachRecord('contact', contactId, 'invoice', invoiceId);
        }
    }
    else{
        nlapiAttachRecord('contact', getContactId, 'invoice', invoiceId);
    }
};

var getContactRecord = function (name, email, customerId) {
    var internalId = '';
    var contactSearch = nlapiSearchRecord('contact',null,
        [
            ['entityid','is',name],
            'AND',
            ['email','is',email],
            'AND',
            ['company','anyof',customerId]
        ], []
    );
    if(!isBlank(contactSearch)){
        internalId = contactSearch[0].getId();
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

var setToEmptyIfNullAmount = function (s) {
    var val = '';
    if(isBlank(s)){
        val = '';
    }
    else{
        val = s.replace(/\$|,/g, '');
        val = val.replace(/[{()}]/g, '');
        val = val.replace(/\-/g, '');
    }
    return val;
};