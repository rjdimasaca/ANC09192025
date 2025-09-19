/* @Scheduled Script on Manual Deployment

Processes SyncWMFreightInvoice, SyncWMFreightInvoiceDetail and SyncWMFreightInvoiceLine Records
//1.0.1 - TC10ROD specify sorting because u wanted to work with index 0 and/or the highest exchtxkey only, or just fix the logic
//added a way to manually fix entries because its urgent, the details supposedly gotten from load headers now can be stored on the freightinvoice synctable instead, on production only
//TODO since loadheader synctables are enow removed, the details should be lookedup from the item fulfillments, do this when there are no more pending freightinvoice synctable entries that doesnt have a matching I.F. because as adviced, there may still be some I.F. missing - marc
1.0.2 - now gets validation from IF, not tested yet as developed directly in LIVE
1.0.3 - TC10ROD always execute regardless if existingRecord == 2, discovered for missing freight invoices, raised by NAV from mmddyyyy-06202020PH
1.0.4 - TC10ROD use specific form as requested by Nav-06252020PH ,CUSTOMFORM_ID_FOR_FREIGHT_INVOICE, form name : freight invoice
1.0.5 now target correct objkey loadno instead of custbody4 - TC10ROD
1.0.6 changed how invoisceable is determined - TC10ROD
1.0.8 completely removed syncloadtable
1.0.9 - parse T or F to 1 or 0
1.0.10 - TC10ROD force throw error if invalid invoice no
1.0.11 - TC10ROD fill market segment, dependency : cseg_anc_mrkt_sgmt application to synctable
*/

var CUSTOMFORM_ID_FOR_FREIGHT_INVOICE = 185; //1.0.4 form name : freight invoice
var context = nlapiGetContext();
SyncWMID = context.getSetting('SCRIPT', 'custscript_syncwmfreightid');
var script_id = 473;
//var cutoffDate = new Date(2018,6,1); //July 1st, 2018 - Cutoff date for new Credit Memos, earlier records should not be processed
var cutoffDate = new Date(2018, 10, 1); //November 1st, 2018 - Cutoff date for new Credit Memos, earlier records should not be processed
//var rollCost = 435.69;

//US INTERCOMPANY PRICE - 432.66 USD
//Units Ordered is volume in MT

function ScheduledSyncWMFreightInv(params) {
    nlapiLogExecution('DEBUG', 'CALLSCHEDULEDSYNCWMFREIGHT', 'SyncWMFreightInv Processing Started on Record ' + SyncWMID);
    var ignoreErrorAndMarkComplete = false;
    try {
        nlapiSubmitField('customrecord_syncwmfreightinvoice', SyncWMID, 'custrecord_syncwmfreight_syncstatus', '2');

        SyncWMRecord = nlapiLoadRecord('customrecord_syncwmfreightinvoice', SyncWMID);

        //1.0.10 - validate invoice no. as requested by Nav
        var validationObj = {isValid : true};
        validationObj = getValidationObj(SyncWMRecord, SyncWMID);
        if(!validationObj.isValid)
        {
            ignoreErrorAndMarkComplete = true;
            //1.0.10 - TC10ROD force throw error if invalid
            throw nlapiCreateError('error', validationObj.errorMsg);
        }
        
        
        var dateParts = SyncWMRecord.getFieldValue('custrecord_syncwmfrtinv_dateinvoice');
        if (dateParts != null && dateParts != '') {
            dateParts = dateParts.substring(0, 10).split('-');
            tempDate = new Date(dateParts[0], dateParts[1] - 1, dateParts[2]);
        } else {
            throw nlapiCreateError('error', 'Date Invoice is blank - unable to process Carrier Invoice');
        }

        if (tempDate >= cutoffDate) {

            /** Start Checking Logic here **/
            var filters = [
                ['internalid', 'noneof', [SyncWMID]], 'AND',
                ['custrecord_syncwmfreight_wmid', 'contains', SyncWMRecord.getFieldValue('custrecord_syncwmfreight_wmid')], 'AND',
                ['custrecord_syncwmfreight_syncstatus', 'noneof', [7]]
            ];

            var columns = [];
            columns[0] = new nlobjSearchColumn('internalid');
            columns[1] = new nlobjSearchColumn('custrecord_syncwmfrtinv_voucherno');
            columns[2] = new nlobjSearchColumn('custrecord_syncwmfrtinv_exchtxkey');
            columns[3] = new nlobjSearchColumn('custrecord_syncwmfrtinv_carrierkey');
            columns[4] = new nlobjSearchColumn('custrecord_syncwmfrtinv_carrinvheaderkey');


            var searchResults = nlapiSearchRecord('customrecord_syncwmfreightinvoice', null, filters, columns);

            if (searchResults) {
                //Matching sync records - record is a duplicate
                SyncWMRecord.setFieldValue('custrecord_syncwmfreight_syncstatus', 7); //Set SyncStatus = Duplicate
                SyncWMRecord.setFieldValue('custrecord_syncwmfreight_errmsg', 'Duplicate Sync Record - Not Processed');
                SyncWMRecord.setFieldValue('isinactive', 'T');
                nlapiSubmitRecord(SyncWMRecord);
                nlapiLogExecution('AUDIT', 'CALLSCHEDULEDSYNCWMFREIGHT', 'Record identified as Duplicate, processing cancelled');
            } else {
                nlapiLogExecution('debug', 'Not a Duplicate', 'Not a Duplicate');
                //No matching sync records - not a duplicate. Continue Processing.
                //Find all unprocessed header lines for current order
                var headFilters = [
                    ['custrecord_syncwmfrtinv_carrinvheaderkey', 'is', SyncWMRecord.getFieldValue('custrecord_syncwmfrtinv_carrinvheaderkey')], 'AND',
                    ['custrecord_syncwmfreight_syncstatus', 'anyof', [1, 2, 3, 5]], 'AND',
                    ['custrecord_syncwmfrtinv_retries', 'greaterthan', 0]
                ];

                var headColumns = [];
                headColumns[0] = new nlobjSearchColumn('internalid');
                headColumns[1] = new nlobjSearchColumn('custrecord_syncwmfrtinv_voucherno');
                headColumns[2] = new nlobjSearchColumn('custrecord_syncwmfrtinv_exchtxkey');
                headColumns[3] = new nlobjSearchColumn('custrecord_syncwmfrtinv_carrierkey');
                headColumns[4] = new nlobjSearchColumn('custrecord_syncwmfrtinv_carrinvheaderkey');
                headColumns[5] = new nlobjSearchColumn('custrecord_syncwmfrtinv_invoiceno');
                headColumns[6] = new nlobjSearchColumn('custrecord_syncwmfrtinv_currency');

                var searchResults = nlapiSearchRecord('customrecord_syncwmfreightinvoice', null, headFilters, headColumns);

                //Find all lines for current order
                var lineFilters = [
                    ['custrecord_syncwmfrtinvline_frtinvheadky', 'is', SyncWMRecord.getFieldValue('custrecord_syncwmfrtinv_carrinvheaderkey')], 'AND',
                    ['custrecord_syncwmfrtinvline_active', 'is', '1']
                ];

                var lineColumns = [];
                lineColumns[0] = new nlobjSearchColumn('internalid');
                lineColumns[1] = new nlobjSearchColumn('custrecord_syncwmfrtinvline_frtinvlineky');
                lineColumns[2] = new nlobjSearchColumn('custrecord_syncwmfrtinvline_loadheadkey');

                var searchLineResults = nlapiSearchRecord('customrecord_syncwmfrinvline', null, lineFilters, lineColumns);

                //CAN COMMENT OUT IF ISSUE. ALSO COMMENT OUT ACTIVE LINE IN LINE FILTERS ABOVE
                if (!searchLineResults) {
                    throw nlapiCreateError('error', 'No Carrier Invoice Line Records found for CarrierInvHeaderKey ' + SyncWMRecord.getFieldValue('custrecord_syncwmfrtinv_carrinvheaderkey') + '. Unable to process record.');
                }

                /** CHECK FOR EXISTING TRANSACTION WITH SAME BOL NUMBER **/
                var existsFilters = [
                    ['custbody_wmloadheaderkey', 'is', searchLineResults[0].getValue('custrecord_syncwmfrtinvline_loadheadkey')], 'AND',
                    ['custbody_wmid', 'isnot', SyncWMRecord.getFieldValue('custrecord_syncwmfrtinv_carrinvheaderkey')]
                ];
                var existsColumns = [];
                existsColumns[0] = new nlobjSearchColumn('internalid');
                existsColumns[1] = new nlobjSearchColumn('custbody_wmid');

                var existsResults = nlapiSearchRecord('vendorbill', null, existsFilters, existsColumns);

                existingRecord = -1;
                if (existsResults) {
                    recHeaderKey = parseInt(existsResults[0].getValue('custbody_wmid'));
                    newHeaderKey = parseInt(SyncWMRecord.getFieldValue('custrecord_syncwmfrtinv_carrinvheaderkey'));
                    if (newHeaderKey > recHeaderKey) {
                        //Record should be updated with new record details
                        existingRecord = existsResults[0].getValue('internalid');

                    } else if (newHeaderKey < recHeaderKey) {
                        //Record should be skipped
                        existingRecord = -2; //Used to skip processing

                        nlapiSubmitField('customrecord_syncwmfreightinvoice', SyncWMID, 'custrecord_syncwmfreight_syncstatus', 4);
                        nlapiSubmitField('customrecord_syncwmfreightinvoice', SyncWMID, 'custrecord_syncwmfreight_errmsg', 'SKIPPED: Later HeaderKey ' + recHeaderKey + ' exists on Vendor Bill ' + existsResults[0].getValue('internalid') + 'and is greater than new HeaderKey ' + newHeaderKey + ' for BOL Number ' + searchLineResults[0].getValue('custrecord_syncwmfrtinvline_loadheadkey') + ' in Subsidiary 5.');
                        nlapiSubmitField('customrecord_syncwmfreightinvoice', SyncWMID, 'custrecord_syncwmfreight_nsid', 'Sub5-VendorBill: SKIPPED');
                    }//Else Same record - proceed without doing anything
                }
                /** END OF CHECK FOR EXISTING TRANSACTION WITH SAME VOUCHER NUMBER **/

                /** NEED TO PROCESS ONLY LAST EXCHTXKEY OF HEADER, LAST OF LINEKEY AND LAST OF DETAILKEY **/
                if (!searchLineResults) {
                    //throw nlapiCreateError('error','No Lines found for Freight Invoice Header Key '+SyncWMRecord.getFieldValue('custrecord_syncwmfrtinv_carrinvheaderkey'));

                    nlapiSubmitField('customrecord_syncwmfreightinvoice', SyncWMID, 'custrecord_syncwmfreight_syncstatus', 4);
                    nlapiSubmitField('customrecord_syncwmfreightinvoice', SyncWMID, 'custrecord_syncwmfreight_errmsg', 'SKIPPED: No Lines found for Freight Invoice Header Key ' + SyncWMRecord.getFieldValue('custrecord_syncwmfrtinv_carrinvheaderkey') + ' in Subsidiary 5.');
                    nlapiSubmitField('customrecord_syncwmfreightinvoice', SyncWMID, 'custrecord_syncwmfreight_nsid', 'Sub5-VendorBill: SKIPPED');
                } else {

                    //Find all detail records for current order
                    var detailFilters = [
                        ['custrecord_syncwmfrinvdet_carrinvlinekey', 'is', searchLineResults[0].getValue('custrecord_syncwmfrtinvline_frtinvlineky')]
                    ];
                    //detailFilters[0] = new nlobjSearchFilter('custrecord_syncwmfrtinvline_frtinvheadky','custrecord_syncwmfrinvdet_carrinvlinekey','is',SyncWMRecord.getFieldValue('custrecord_syncwmfrtinv_carrinvheaderkey'));

                    var detailColumns = [];
                    detailColumns[0] = new nlobjSearchColumn('internalid');
                    detailColumns[1] = new nlobjSearchColumn('custrecord_syncwmfrinvdet_carrinvlinekey');
                    detailColumns[2] = new nlobjSearchColumn('custrecord_syncwmfrinvdet_exchtxkey');
                    detailColumns[3] = new nlobjSearchColumn('custrecord_syncwmfrinvdet_carrinvdetkey');

                    var searchDetailResults = nlapiSearchRecord('customrecord_syncwmfrinvdetail', null, detailFilters, detailColumns);

                    if (searchLineResults && searchResults && searchDetailResults) {
                        nlapiLogExecution('debug', 'Head and Line Results', 'Head: ' + searchResults.length + ' Line: ' + searchLineResults.length);
                        /**
                         if (searchLineResults.length > 1) {
                            throw nlapiCreateError('error','Unable to process Freight Invoices with more than one line - functionality still under development');
                        }
                         **/
                        /** Resume Work Here **/
                        /** Current Plan - Use 'Header' and 'Detail' only, no critical information on Line **/
                            //Detail/Lines found, create/update order using only LAST header line and LAST of each detail/line
                        var HeadMax = -1;
                        var HeadIndex = -1;
                        var LineObj = {};
                        var LineIdObj = {};

                        for (ho = 0; ho < searchResults.length; ho++) {
                            ExTxKey = searchResults[ho].getValue('custrecord_syncwmfrtinv_exchtxkey');
                            if (ExTxKey > HeadMax) {
                                HeadMax = ExTxKey;
                                HeadIndex = ho;
                            }
                        }

                        for (Lo = 0; Lo < searchDetailResults.length; Lo++) {
                            LineKey = searchDetailResults[Lo].getValue('custrecord_syncwmfrinvdet_carrinvdetkey');
                            ExLineKey = searchDetailResults[Lo].getValue('custrecord_syncwmfrinvdet_exchtxkey');
                            tempID = 'id' + LineKey;
                            if (LineKey in LineObj) {
                                if (ExLineKey > LineObj[LineKey]) {
                                    LineObj[LineKey] = ExLineKey;
                                    LineIdObj[tempID] = Lo;
                                } //Else line definition is old and should be ignored
                            } else {
                                LineObj[LineKey] = ExLineKey;
                                LineIdObj[tempID] = Lo;
                            }
                        }

                        /** Vendor Bill in Sub5 **/
                            //Check if Invoice Exists in Sub5
                        var filters = [
                                ['custbody_wmid', 'is', SyncWMRecord.getFieldValue('custrecord_syncwmfrtinv_carrinvheaderkey')], 'AND',
                                ['subsidiary', 'is', '5']
                            ];
                        var columns = [];
                        columns[0] = new nlobjSearchColumn('internalid');
                        var searchBill5 = nlapiSearchRecord('vendorbill', null, filters, columns);

                        //1.0.3 - TC10ROD always execute regardless if existingRecord == 2, discovered for missing freight invoices, raised by NAV from mmddyyyy-06202020PH
                        if (true) {
                        //if (existingRecord != '-2' && existingRecord != -2) {
                            //Record Valid - Otherwise Skip Processing
                            if (searchBill5) {
                                //Update Vendor Bill in Subsidiary 5

                                //Currently Does Nothing - should not occur during testing
                                //nlapiLogExecution('debug','Vendor Bill Exists for Update','Vendor Bill Found - Updates not yet processing');

                                if (parseInt(existingRecord > 0)) {
                                    Record5 = nlapiLoadRecord('vendorbill', existingRecord);
                                } else {
                                    Record5 = nlapiLoadRecord('vendorbill', searchBill5[0].getValue('internalid'));
                                }
                                
                                //1.0.4
                                Record5.setFieldValue('customform', CUSTOMFORM_ID_FOR_FREIGHT_INVOICE);
                                ValidVendor = validateVendor(searchResults[HeadIndex].getValue('custrecord_syncwmfrtinv_carrierkey'));
                                totalLines = Record5.getLineItemCount('item');
                                if (totalLines > 0) {
                                    for (n = totalLines; n > 0; n--) {
                                        Record5.removeLineItem('item', n);
                                    }
                                } else {
                                    throw nlapiCreateError('error', 'Vendor Bill Record exists but unable to get number of lines to remove lines - update cancelled');
                                }
                                successText = 'Updated Vendor Bill record with Internal ID ';
                            } else {
                                //Create New Vendor Bill in Subsidiary
                                Record5 = nlapiCreateRecord('vendorbill');
                                //1.0.4
                                Record5.setFieldValue('customform', CUSTOMFORM_ID_FOR_FREIGHT_INVOICE);
                                
                                ValidVendor = validateVendor(searchResults[HeadIndex].getValue('custrecord_syncwmfrtinv_carrierkey'));
                                Record5.setFieldValue('entity', ValidVendor);
                                Record5.setFieldValue('subsidiary', '5');
                                successText = 'Created Vendor Bill record with Internal ID ';
                            }

                            //Check Currency
                            var currencyDict = {'CAD': '1', 'USD': '2'}; //'BRITISHPOUND':'3','EURO':'4'
                            var freightInvCurrency = currencyDict[searchResults[HeadIndex].getValue('custrecord_syncwmfrtinv_currency')];
                            Record5.setFieldValue('currency', freightInvCurrency);

                            Record5.setFieldValue('tranid', searchResults[HeadIndex].getValue('custrecord_syncwmfrtinv_invoiceno')); //custrecord_syncwmfrtinv_voucherno
                            Record5.setFieldValue('trandate', nlapiDateToString(tempDate, 'date'));
                            Record5.setFieldValue('memo', 'Created from WM Voucher No ' + searchResults[HeadIndex].getValue('custrecord_syncwmfrtinv_voucherno') + ' and Invoice No ' + searchResults[HeadIndex].getValue('custrecord_syncwmfrtinv_invoiceno'));
                            //Record5.setFieldValue('location','9'); //Hardcode to ANC Whitecourt Warehouse**/
                            Record5.setFieldValue('custbody_wmid', searchResults[HeadIndex].getValue('custrecord_syncwmfrtinv_carrinvheaderkey'));

                            //1.0.8 TC10ROD move the declaration here
                            //Check Tax Status
                            //Tax is calculated based on the currency of the Freight Invoice Header and the Destination Country of the Load Header
                            //The Load Header Record is linked based on the first Freight Invoice Line (which has a Load Header Key field for the link)
                            //The City, Province, and Country fields from the Load Header should be stored in Vendor Bill fields under 'Billing' Subtab
                            //IF Country Code is Canada, lookup Tax Code based on province
                            //IF Country Code is NOT Canada, no tax
                            //Currency does not affect taxation - Canadian customers could pay in USD, etc.
                            var TaxCode = '';
                            var ifLoadLookupKey = "";
                            var provinceDict = {
                                'BC': 'BC',
                                'AB': 'AB',
                                'SK': 'SK',
                                'MB': 'MB',
                                'ON': 'ON',
                                'PQ': 'QC',
                                'YT': 'YT',
                                'NW': 'NT',
                                //1.0.2 - full word mapping, because what we can get from IF is full state name, not acronym - TC10ROD, it will error out if it detected not to be mapped in this object
                                'British Columbia': 'BC',
                                'Alberta': 'AB',
                                'Saskatchewan': 'SK',
                                'Manitoba': 'MB',
                                'Ontario': 'ON',
                                'Quebec': 'QC',
                                'Yukon': 'YT',
                                'Northwest Territories': 'NT',
                            }; //Codes not found in WM - 'NB':'8','NF':'9','NV':'11','PEI':'14','NS','15'
                            var LoadCountry = 'Unable to link Load';
                            var LoadState = 'Unable to link Load';
                            var LoadCity = 'Unable to link Load';
                            var LoadIsInvoiceable = 1; // if value is 0, prepaid freight
                          var MarketSegment = '';
                            
                            var validLoadNumber = SyncWMRecord.getFieldValue('custrecord_syncwmfrtinv_loadno');
                            //1.0.8 TC10ROD if load number is present on the synctable get the following details from the synctable
                            if(validLoadNumber)
                            {
                                LoadCountry = SyncWMRecord.getFieldValue('custrecord_syncwmfrtinv_country');
                                LoadState = SyncWMRecord.getFieldValue('custrecord_syncwmfrtinv_stateprovince');
                                LoadCity = SyncWMRecord.getFieldValue('custrecord_syncwmfrtinv_city');
                                LoadIsInvoiceable = SyncWMRecord.getFieldValue('custrecord_syncwmfrtinv_isinvoiceable');
                                MarketSegment = SyncWMRecord.getFieldValue('cseg_anc_mrkt_sgmt');
                                
                                //1.0.9 change T or F to 1 or 0 for direct synctable values on isInvoiceable
                                //convert this to 1 or 0
                                if(LoadIsInvoiceable && LoadIsInvoiceable != "F") //if checkbox is checked change it to 1, 0 = PREPAID 1 = NON-PREPAID
                                {
                                    LoadIsInvoiceable = 1;
                                }
                                else //optional if it cant parse F it will change it to 0 thats why function name is parseFloatOrZero - TC10ROD
                                {
                                    LoadIsInvoiceable = 0;
                                }
                            }
                            //1.0.8 TC10ROD else look for an item fulfillment
                            else
                            {
                                var validLoadNumber_viaFulfillment = validateLoadNumber_viaFulfillment(searchLineResults[0].getValue('custrecord_syncwmfrtinvline_loadheadkey'));
                                if(validLoadNumber_viaFulfillment.error)
                                {
                                    //NO IF MATCHED - TC10ROD
                                    throw nlapiCreateError('error', 'VIA IF VALIDATION, Unable to Join Load for Tax Code - cannot process Freight Invoice record for LoadHeaderKey: ' + searchLineResults[0].getValue('custrecord_syncwmfrtinvline_loadheadkey'));
                                }
                                else
                                {
                                  //1.0.5 now target correct objkey loadno instead of custbody4
                                    validLoadNumber = validLoadNumber_viaFulfillment['loadno'] || "";
                                    LoadCountry = validLoadNumber_viaFulfillment['country'] || "";
                                    LoadState = validLoadNumber_viaFulfillment['state'] || "";
                                    LoadCity = validLoadNumber_viaFulfillment['city'] || "";
                                    LoadIsInvoiceable = validLoadNumber_viaFulfillment['isinvoiceable'] || "";
                                    //1.0.8
                                    ifLoadLookupKey = validLoadNumber_viaFulfillment['id'] || "";
                                    //1.0.11
                                  	MarketSegment = validLoadNumber_viaFulfillment['cseg_anc_mrkt_sgmt'] || "";
                                }
                            }
                            
                            Record5.setFieldValue('custbody4', validLoadNumber);
                            Record5.setFieldValue('custbody_wmloadheaderkey', searchLineResults[0].getValue('custrecord_syncwmfrtinvline_loadheadkey'));

                            //1.0.2 - OR LoadCountry == 'CA' OR LoadCountry == 'Canada' - TC10ROD, IF gives CA or Canada not CAN
                            if (LoadCountry == 'CAN' || LoadCountry == 'CA' || LoadCountry == 'Canada') {
                                if (provinceDict[LoadState] == undefined) {
                                    throw nlapiCreateError('error', 'Unable to lookup Freight Invoice Tax Code for Country: ' + LoadCountry + ' and State/Province: ' + LoadState);
                                } else {
                                    TaxProv = provinceDict[LoadState];
                                    var taxFilters = [['state', 'is', TaxProv], 'AND', ['isinactive', 'is', 'F']];
                                    var taxColumns = [];
                                    taxColumns[0] = new nlobjSearchColumn('internalid');
                                    taxColumns[1] = new nlobjSearchColumn('state');

                                    var taxResults = nlapiSearchRecord('taxgroup', null, taxFilters, taxColumns);

                                    if (taxResults) {
                                        for (n = 0; n < taxResults.length; n++) {
                                            if (taxResults[n].getValue('state') == TaxProv) {
                                                TaxCode = taxResults[n].getValue('internalid');
                                            }
                                        }
                                    } else {
                                        throw nlapiCreateError('error', 'No Valid Tax Groups found by search for TaxProv' + TaxProv + ' LoadState: ' + LoadState);
                                    }
                                }
                            } else {
                                TaxCode = '82'; //No Tax USA
                            }

                            //Set Country/StateProvince/City for reporting
                            Record5.setFieldValue('custbody_loadcountry', LoadCountry);
                            Record5.setFieldValue('custbody_loadstateprovince', LoadState);
                            Record5.setFieldValue('custbody_loadcity', LoadCity);
                          	//1.0.11
                            Record5.setFieldValue('cseg_anc_mrkt_sgmt', MarketSegment);

                            nlapiLogExecution('debug', 'Check Line Obj', JSON.stringify(LineObj));
                            nlapiLogExecution('debug', 'Check Line Id Obj', JSON.stringify(LineIdObj));

                            var ctLines = 0;
                            var sumAmt = 0;
                            var waitingForRecords = true;
                            nlapiLogExecution('audit', 'LineIdObj', JSON.stringify(LineIdObj));
                            

                            nlapiLogExecution("DEBUG", "LoadIsInvoiceable FINAL", LoadIsInvoiceable);
                            
                            for (var LineId in LineIdObj) {
                                if (LineIdObj[LineId] != "undefined") {
                                    LineRec = nlapiLoadRecord('customrecord_syncwmfrinvdetail', searchDetailResults[LineIdObj[LineId]].getValue('internalid'));

                                    nlapiLogExecution('audit', 'No Order Item Record Found', 'Unable to look up Order Item record for Order Item Key ' + LineRec.getFieldValue('custrecord_syncwmloaddet_orderitemkey'));

                                    validItem = validateItem(LineRec.getFieldValue('custrecord_syncwmfrinvdet_issurcharge'), LineRec.getFieldValue('custrecord_syncwmfrinvdet_surchargecode'), LoadIsInvoiceable);
                                    nlapiLogExecution('audit', 'LineIdObj Values', 'LineId: ' + LineId);
                                    nlapiLogExecution('audit', 'Check validateItem output', 'validItem: ' + validItem + ' Line IntID: ' + LineRec.getFieldValue('internalid') + ' isSurcharge: ' + LineRec.getFieldValue('custrecord_syncwmfrinvdet_issurcharge') + ' surchargeCode: ' + LineRec.getFieldValue('custrecord_syncwmfrinvdet_surchargecode'));


                                    Record5.selectNewLineItem('item');
                                    Record5.setCurrentLineItemValue('item', 'item', validItem);
                                    Record5.setCurrentLineItemValue('item', 'quantity', '1');
                                    Record5.setCurrentLineItemValue('item', 'rate', LineRec.getFieldValue('custrecord_syncwmfrinvdet_amount'));
                                    Record5.setCurrentLineItemValue('item', 'amount', LineRec.getFieldValue('custrecord_syncwmfrinvdet_amount'));
                                    Record5.setCurrentLineItemValue('item', 'memo', LineRec.getFieldValue('custrecord_syncwmfrinvdet_surchargedesc'));
                                    Record5.setCurrentLineItemValue('item', 'taxcode', TaxCode);
                                    Record5.setCurrentLineItemValue('item', 'custcol_svb_item_exp_account', '');
                                  	//1.0.11
                                    Record5.setCurrentLineItemValue('item', 'cseg_anc_mrkt_sgmt', MarketSegment);
                                    //Record5.setCurrentLineItemValue('item','custcol_rollwidth',LineRec.getFieldValue('custrecord_syncwmorditem_width'));
                                    //Record5.setCurrentLineItemValue('item','custcol_rolldiameter',LineRec.getFieldValue('custrecord_syncwmorditem_diameter'));

                                    Record5.commitLineItem('item');
                                    ctLines++;
                                    sumAmt += LineRec.getFieldValue('custrecord_syncwmfrinvdet_amount');
                                }
                            }
                            if (sumAmt == 0) {
                                throw nlapiCreateError('error', 'All lines have a $0 amount - unable to process Freight Invoice');
                            }

                            if (ctLines > 0) {
                                Record5ID = nlapiSubmitRecord(Record5);

                                //Currently assuming all header lines succeed - need to improve this logic per-item
                                for (n = 0; n < searchResults.length; n++) {
                                    //When doing Multi-Records, Comment Out Status=Complete Line until final record
                                    nlapiSubmitField('customrecord_syncwmfreightinvoice', searchResults[n].getValue('internalid'), 'custrecord_syncwmfreight_syncstatus', 4);
                                    nlapiSubmitField('customrecord_syncwmfreightinvoice', searchResults[n].getValue('internalid'), 'custrecord_syncwmfreight_errmsg', successText + Record5ID + ' in Subsidiary 5.');
                                    nlapiSubmitField('customrecord_syncwmfreightinvoice', searchResults[n].getValue('internalid'), 'custrecord_syncwmfreight_nsid', 'Sub5-VendorBill: ' + Record5ID);
                                }

                                nlapiLogExecution('AUDIT', 'CALLSCHEDULEDSYNCWMFREIGHT', 'Vendor Bill record with Internal ID ' + Record5ID + ' has been created in subsidiary 5.');
                            } else {
                                throw nlapiCreateError('error', 'No valid vendor bill lines were added - bill creation has been cancelled');
                            }
                        }
                        /** End of Vendor Bill in Sub5 **/
                    } else if (searchResults) {
                        nlapiLogExecution('debug', 'Head but no Line/Detail Results', 'Head: ' + searchResults);
                        //No detail lines found, mark header lines with error
                        for (x = 0; x < searchResults.length; x++) {
                            nlapiSubmitField('customrecord_syncwmfreightinvoice', searchResults[x].getValue('internalid'), 'custrecord_syncwmfreight_syncstatus', 3);
                            nlapiSubmitField('customrecord_syncwmfreightinvoice', searchResults[x].getValue('internalid'), 'custrecord_syncwmfreight_errmsg', 'ERROR: No Detail Lines found for LoadHeaderKey ' + searchResults[x].getValue(''));
                            nlapiSubmitField('customrecord_syncwmfreightinvoice', searchResults[x].getValue('internalid'), 'custrecord_syncwmfrtinv_retries', searchResults[x].getValue('retries') - 1);
                            nlapiLogExecution('AUDIT', 'CALLSCHEDULEDSYNCWMFREIGHT', 'SyncWMFreightInv with Internal ID ' + searchResults[x].getValue('internalid') + ' has no detail lines and has not been created.');
                        }
                    } else {
                        nlapiLogExecution('debug', 'No Head/Line/Detail Results', 'No Head/Line/Detail Results');
                        throw nlapiCreateError('error', 'No Head/Line/Detail lines found - issue with search parameters');
                    }
                }
            }
        } else {
            //Vendor Bill is before July 1st, 2018 and should be ignored
            nlapiSubmitField('customrecord_syncwmfreightinvoice', SyncWMID, 'custrecord_syncwmfreight_syncstatus', 4);
            nlapiSubmitField('customrecord_syncwmfreightinvoice', SyncWMID, 'custrecord_syncwmfreight_errmsg', 'Vendor Bill date is before November 1st, 2018. Record will not be processed.');
        }
    } catch (e) {
        nlapiLogExecution('error', 'ScheduledSyncWMFreightInv() has encountered an error.', errText(e));
        //1.0.10
        if(ignoreErrorAndMarkComplete)
        {
            nlapiSubmitField('customrecord_syncwmfreightinvoice', SyncWMID, 'custrecord_syncwmfreight_syncstatus', '4'); //Set SyncStatus = Complete
        }
        else
        {
            nlapiSubmitField('customrecord_syncwmfreightinvoice', SyncWMID, 'custrecord_syncwmfreight_syncstatus', '3'); //Set SyncStatus = Error           
        }
        
        nlapiSubmitField('customrecord_syncwmfreightinvoice', SyncWMID, 'custrecord_syncwmfreight_errmsg', 'Error Details: ' + errText(e));
        tempRetries = nlapiLookupField('customrecord_syncwmfreightinvoice', SyncWMID, 'custrecord_syncwmfrtinv_retries');
        nlapiSubmitField('customrecord_syncwmfreightinvoice', SyncWMID, 'custrecord_syncwmfrtinv_retries', (tempRetries - 1));
        nlapiLogExecution('debug', 'CALLSCHEDULESYNCWMFREIGHTINV', 'ScheduledSyncWMFreightInv has been updated with ' + (tempRetries - 1) + ' retries.');
    }
  //temp disable
    findNextRecord();
}

/**
 * @since 1.0.10
 * @1.0.11 - fixed variable invoiceNo being enclosed in quotes
 */
function getValidationObj(SyncWMRecord, SyncWMID)
{
    var validationObj = {isValid : true};
    var invoiceNo = SyncWMRecord.getFieldValue("custrecord_syncwmfrtinv_invoiceno");
    try
    {
        if(invoiceNo)
        {
            var vendorbillSearch = nlapiSearchRecord("vendorbill",null,
                    [
                       ["type","anyof","VendBill"], 
                       "AND", 
                       ["numbertext","is",invoiceNo],
                       "AND", 
                       ["mainline","is","T"]
                    ]
                    );
            
            if(vendorbillSearch && vendorbillSearch.length > 0)
            {
                validationObj.isValid = false;
                validationObj.errorMsg = "this invoice no/vendor bill has already been taken";
            }
        }
    }
    catch(e)
    {
        validationObj.isValid = false;
        validationObj.errorMsg = "error finding vendor bill for invoice no : " + invoiceNo;
    }
    
    return validationObj;
}

function findNextRecord() {
    //Check for additional records to add to processing queue
    var filters = [
        ['custrecord_syncwmfreight_syncstatus', 'anyof', [1, 3, 5]], 'AND',
        ['custrecord_syncwmfrtinv_retries', 'greaterthan', 0]
    ];

    var columns = [];
    columns[0] = new nlobjSearchColumn('internalid');

    var searchResults = nlapiSearchRecord('customrecord_syncwmfreightinvoice', null, filters, columns);

    if (searchResults) {
        var nextSyncWMID = searchResults[0].getValue('internalid');
        nlapiLogExecution('AUDIT', 'CALLSCHEDULEDSYNCWMFREIGHT', 'Additional records to sync found. Queueing ' + nextSyncWMID);
        var newParams = {'custscript_syncwmfreightid': nextSyncWMID};
        var ScheduleStatus = nlapiScheduleScript(script_id, null, newParams); //Deployment is empty so that script selects first available deployment
        if (ScheduleStatus == 'QUEUED') {
            nlapiSubmitField('customrecord_syncwmfreightinvoice', nextSyncWMID, 'custrecord_syncwmfreight_syncstatus', '6');
        } //Else no available deployments - remaining records will be caught by periodic retry script
    } else {
        nlapiLogExecution('AUDIT', 'CALLSCHEDULEDSYNCWMFREIGHT', 'No records to sync found.');
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

function validateVendor(vendorKey) {
    if (vendorKey == '' || vendorKey == null) {
        return '';
    } else {
        var filters = [['custentity_wmid', 'is', vendorKey]];
        var columns = [];
        columns[0] = new nlobjSearchColumn('internalid');
        var searchVendors = nlapiSearchRecord('vendor', null, filters, columns);
        if (searchVendors) {
            return searchVendors[0].getValue('internalid');
        } else {
            return '';
        }
    }
}

function validateItem(isSurcharge, surchargeCode, isInvoiceable) {

    nlapiLogExecution("DEBUG", "isInvoiceable BEFORE parseFloatOrZero", isInvoiceable)
    isInvoiceable = parseFloatOrZero(isInvoiceable);
    nlapiLogExecution("DEBUG", "isInvoiceable AFTER parseFloatOrZero", isInvoiceable)
    if (isInvoiceable == 0) { //prepaid freight items
        switch (surchargeCode) {
            case "FUEL":
                return '68407';
            case 'FUEL_RAIL':
                return '68406';
            case 'AB_CARBON_TAX':
                return '68404';
            case 'BORDER':
                return '68405';
            case 'US_AGRICULTURAL':
                return '68408';
            default:
                return '68403';
        }
    } else {
        switch (surchargeCode) {
            case "FUEL":
                return '12231';
            case 'FUEL_RAIL':
                return '12232';
            case 'AB_CARBON_TAX':
                return '17522';
            case 'BORDER':
                return '17523';
            case 'US_AGRICULTURAL':
                return '17524';
            default:
                return '12493';
        }
    }
}

function validateLoadNumber(loadHeaderKey) {
    returnString = ["Unable to link Load for LoadHeaderKey " + loadHeaderKey, ''];
    returnKey = 0;
    var filters = [['custrecord_syncwmloadhead_loadheadkey', 'is', loadHeaderKey]];
    var columns = [];
    columns[0] = new nlobjSearchColumn('internalid');
    columns[1] = new nlobjSearchColumn('custrecord_syncwmloadhead_exchtxkey');
    columns[2] = new nlobjSearchColumn('custrecord_syncwmloadhead_loadno');
    
    //1.0.1 - TC10ROD specify sorting because u wanted to work with index 0 and/or the highest exchtxkey only, or just fix the logic
    columns[3]= columns[1].setSort(); 
    
    var searchLoad = nlapiSearchRecord('customrecord_syncwmloadheader', null, filters, columns);
    if (searchLoad) {
        nlapiLogExecution("DEBUG", "searchLoad.length", searchLoad.length);
        for (x = 0; x < searchLoad.length; x++) {
            if (searchLoad[0].getValue('custrecord_syncwmloadhead_exchtxkey') > returnKey) {
                returnKey = searchLoad[0].getValue('custrecord_syncwmloadhead_exchtxkey');

                nlapiLogExecution("DEBUG", "returnKey", returnKey);
                returnString = [searchLoad[0].getValue('custrecord_syncwmloadhead_loadno'), searchLoad[0].getValue('internalid')];
            }
        }
    }
    
    nlapiLogExecution("DEBUG", "returnKey", JSON.stringify(returnString));
    
    return returnString;
}

function validateLoadNumber_viaFulfillment(loadHeaderKey) {
    var returnObj = {};
    returnObj.message = "Unable to link Load for LoadHeaderKey " + loadHeaderKey;
    returnObj.error = true;
    var filters = [['custbody_wmloadheaderkey', 'is', loadHeaderKey]];
    var columns = [];
    columns[0] = new nlobjSearchColumn('internalid');
    columns[1] = new nlobjSearchColumn('custbody_wmloadheaderkey');
    columns[2] = new nlobjSearchColumn('custbody4'); //BOL
    columns[3] = new nlobjSearchColumn("shipcountry"); //country
    columns[4] = new nlobjSearchColumn("shipstate"); //state
    columns[5] = new nlobjSearchColumn("shipcity"); //city
    //1.0.6 formula returns 1 or 0 to work well with parseFloatOrZero
    columns[6] = new nlobjSearchColumn("formulatext").setFormula("CASE WHEN {createdfrom.type} = 'Sales Order' THEN '1' ELSE '0' END"); //invoice type, if created from sales order or transfer order SO = T, TO = F
  
   //1.0.11
   columns[7] = new nlobjSearchColumn("cseg_anc_mrkt_sgmt"); //market segment
    
    var searchLoad = nlapiSearchRecord('itemfulfillment', null, filters, columns);
    if (searchLoad) {
        nlapiLogExecution("DEBUG", "searchLoad.length", searchLoad.length);
        for (x = 0; x < searchLoad.length; x++) {
            returnObj = {};
            returnObj.ifid = searchLoad[0].getId();
            returnObj.loadno = searchLoad[0].getValue('custbody4');
            returnObj.country = searchLoad[0].getValue('shipcountry');
            returnObj.state = searchLoad[0].getValue('shipstate');
            returnObj.city = searchLoad[0].getValue('shipcity');
            //1.0.6 returnObj.isinvoiceable = [searchLoad[0].getValue('custrecord_syncwmloadhead_loadno'), searchLoad[0].getValue('internalid')];
            //1.0.6 should return 1 or 0, 1 is invoiceable 0 is not invoiceable TC10ROD
            returnObj.isinvoiceable = searchLoad[0].getValue(searchLoad[0].getAllColumns()[6]);
          	//1.0.11 - market segment
          	returnObj.cseg_anc_mrkt_sgmt =  searchLoad[0].getValue('cseg_anc_mrkt_sgmt');
            returnObj.error = false;
            break;
        }
    }
    
    nlapiLogExecution("DEBUG", "returnObj", JSON.stringify(returnObj));
    
    return returnObj;
}


function parseFloatOrZero(a) {
    var b = parseFloat(a);
    return isNaN(b) ? 0 : b;
}