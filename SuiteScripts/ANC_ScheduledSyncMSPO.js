  /* @Scheduled Script on Manual Deployment
  * Processes SyncMSPO Records
  * Link: https://system.na2.netsuite.com/app/common/scripting/script.nl?id=477
  * SB: https://system.netsuite.com/app/common/scripting/script.nl?id=477
  * Custom Record: https://system.na2.netsuite.com/app/common/custom/custrecordentrylist.nl?rectype=277
  * SB Custom Record: https://system.netsuite.com/app/common/custom/custrecordentrylist.nl?rectype=277
  *
  * 2018.11.20 - added LINE_CHG_COSTCENTER = map this field to the Department field in NetSuite
  * 2018.11.20 - added LINE_WO = map this field to a custom field, preserve this information.
  * 2020.05.21 - added function isPartOfClothingBreakdown, added handling for charge account 1426, 1427, 1428 & 1429, they should be treated the same way as 1480, this was requested by Lisa - TC10ROD
  * 2020.05.28 - modified mapping of account codes in isPartOfClothingBreakdown, they should refer to actual account codes 1426 to 1429 - TC10ROD
  * 2020.06.01 - TC10ROD investigating why item 9999 is used for PO PO14785, requested by LISA
  * 2020.06.01 - 1.0.1 - 02012020/02022020 GMT+8 TC10ROD commented out setting it to 9999 as requested by LISA
  * 2020.11.21PH - 1.0.2 - allow no tax codes to get an error, its a better practice to have the master/item records properly setup - TC10ROD
  * 2021.11.24PH - c/o mark, rod new rules
                  1) LINE_CHG_ACCOUNT is 3987:  Set department to 0000, account to 3987, subsidiary to ANC Transloading.
                  2)LINE_CHG_ACCOUNT is 3989:  Set department to 0000, account to 3989, subsidiary to ANC Transloading.
                  3)LINE_CHG_COSTCENTER is 0910: Set department to 0910, subsidiary to ANC Transloading
                  4)LINE_CHG_COSTCENTER is 0911: Set department to 0911, subsidiary to ANC Transloading
                  5)LINE_CHG_COSTCENTER is 0915: Set department to 0915, subsidiary to ANC Transloading

  */

var context = nlapiGetContext();
SyncMSID = context.getSetting('SCRIPT', 'custscript_syncmspoid');
var script_id = context.getScriptId();
var CUSTOM_RECORD = 'customrecord_syncmspurchaseorder';

/*
* "items that are coded to accounts 1426, 1427, 1428 & 1429. 
* I would like them to be treated like we have things flowing for 1480.  These are serialized clothing items." - LISA 05202020
* Determines if the charge account is part of clothing breakdown
*/
function isPartOfClothingBreakdown(chargeAcct)
{
    var partOfClothingBreakdown = false;
    chargeAcct = Number(chargeAcct);
    if(chargeAcct)
    {
        switch(chargeAcct)
        {
            //2020.05.28 - TC10ROD
            /*case 1411:
            case 1412:
            case 1421:
            case 1422:
            case 1423:
            case 1424:
            
            case 1430:
            
            case 1441:
            case 1442:
            case 1443:
            case 1444:
            case 1445:
            case 1446:
            case 1447:
            case 1448:*/
            case 1426:
            case 1427:
            case 1428:
            case 1429:
                partOfClothingBreakdown = true;
        }
    }
    return partOfClothingBreakdown;
}

function ScheduledSyncMSPO(params) {

    var errorsArr = [];
    var errorStr = '';
    var uniquePoLinesToProcess = [];
    var serializedLinesToAddOrRemove = [];
    var removedLines = []; // line description will be used in PO MEMO
    var serializedLines = [];
    var skippedSerializedLines = [];
    var serializedLinesToBeReceived = [];
    var MAINSAVERDATEFORMAT = 'YYYY/MM/DD';
    var RAWCUTOFFDATE = '2019/1/1'; // YYYY/MM/DD, change the cut off date accordingly
    var PROCESS_ALL = false;
    var PO_MEMO = '';
    var irDate = '';
    nlapiLogExecution('DEBUG', 'CALLSCHEDULEDSYNCMSPO', 'SyncMSPO Processing Started on Record ' + SyncMSID);

    try {
        nlapiSubmitField(CUSTOM_RECORD, SyncMSID, 'custrecord_syncmspo_syncstatus', statusList.PROCESSING);
        SyncMSRecord = nlapiLoadRecord(CUSTOM_RECORD, SyncMSID);
        var dateParts = SyncMSRecord.getFieldValue('custrecord_syncmspo_podate');
        if (!isBlank(dateParts)) {
            tempDate = dateParts;
            tempDate = moment(tempDate).format(MAINSAVERDATEFORMAT); //date format from MS
            tempDate = moment(tempDate).format('L'); //system locale
            // if the PO date is any of below, use the end of the month as IR trandate else use the created date of the SyncMSPO record
            if (['January', 'February', 'March', 'April'].indexOf(moment(tempDate).format('MMMM')) >= 0) {
                irDate = moment(tempDate).endOf('month').format('L');
            } else {
                irDate = moment(SyncMSRecord.getFieldValue('created')).format('L');
            }
        }
        /**
         * Find all SyncMSPurchaseOrder records to sync
         * with the same PONO (custrecord_syncmspo_pono)
         */
        var purchaseOrderNum = SyncMSRecord.getFieldValue('custrecord_syncmspo_pono');
        if (isBlank(purchaseOrderNum)) {
            errorsArr.push('Missing PONO field');
        }

        var filters = [
            ['custrecord_syncmspo_pono', 'is', purchaseOrderNum], 'AND',
            ['custrecord_syncmspo_syncstatus', 'anyof', [statusList.NEW, statusList.PROCESSING, statusList.ERROR, statusList.TO_REPROCESS]]
        ];

        var columns = [];
        columns[0] = new nlobjSearchColumn('internalid'); //Internal Id
        columns[1] = new nlobjSearchColumn('custrecord_syncmspo_linestklocn');//LINE_STK_LOCN
        columns[2] = new nlobjSearchColumn('custrecord_syncmspo_linemkey'); //LINE_MKEY
        columns[3] = new nlobjSearchColumn('custrecord_syncmspo_linercvqty'); //LINE_RCV_QTY
        columns[4] = new nlobjSearchColumn('custrecord_syncmspo_linedescription'); //LINE_DESCRIPTION
        columns[5] = new nlobjSearchColumn('custrecord_syncmspo_linenetprice'); //LINE_NET_PRICE
        columns[6] = new nlobjSearchColumn('custrecord_syncmspo_linechgaccount'); //LINE_CHG_ACCOUNT
        columns[7] = new nlobjSearchColumn('custrecord_syncmspo_item_link'); //NETSUITE ITEM LINK
        columns[8] = new nlobjSearchColumn('custrecord_syncmspo_vendor_id'); //NETSUITE VENDOR LINK
        columns[9] = new nlobjSearchColumn('custrecord_syncmspo_podate');
        columns[10] = new nlobjSearchColumn('custrecord_syncmspo_supplier');
        columns[11] = new nlobjSearchColumn('name');
        columns[12] = new nlobjSearchColumn('custrecord_syncmspo_linewo');//LINE_WO
        columns[13] = new nlobjSearchColumn('custrecord_syncmspo_linechgcostcenter');//LINE_CHG_COSTCENTER
        columns[14] = new nlobjSearchColumn('custrecord_syncmspo_lineordqty'); //LINE_ORDQTY
        columns[15] = new nlobjSearchColumn('custrecord_syncmspo_polineno'); //PO_LINENO
        columns[16] = new nlobjSearchColumn('custrecord_syncmspo_linelastchangedate').setSort('ASC'); //LINE_LAST_CHANGE_DATE
        columns[17] = new nlobjSearchColumn('custrecord_syncmspo_linestockno'); //LINE_STOCKNO
        columns[18] = new nlobjSearchColumn('custrecord_syncmspo_retries'); //RETRIES
        columns[19] = new nlobjSearchColumn('custrecord_syncmspo_reqdate'); //REQ_DATE
        columns[20] = new nlobjSearchColumn('custrecord_syncmspo_billto'); //BILLTO
        var searchResults = nlapiSearchRecord(CUSTOM_RECORD, null, filters, columns) || [];

        /**
         * Filter only records that will be used as standard Purchase Order Lines
         * This has to be filtered manually, otherwise the other records will remain in 'New' state
         * that have the same PONO if it was filtered in search
         */
        var poLinesToProcess = [];

        searchResults.forEach(function (poLine) {
            var internalId = poLine.getValue('internalid');

            if (
                (!isBlank(poLine.getValue('custrecord_syncmspo_linestklocn')) ||
                    !isBlank(poLine.getValue('custrecord_syncmspo_linemkey')) ||
                    !isBlank(poLine.getValue('custrecord_syncmspo_linechgaccount')))
                &&
                !isBlank(poLine.getValue('custrecord_syncmspo_lineordqty'))
                &&
                !isBlank(poLine.getValue('custrecord_syncmspo_polineno'))
                &&
                !isBlank(poLine.getValue('custrecord_syncmspo_podate'))
                &&
                !isBlank(poLine.getValue('custrecord_syncmspo_linelastchangedate'))
                &&
                !isBlank(poLine.getValue('custrecord_syncmspo_reqdate'))
            ) {
                var lineObj = {
                    'internalid': parseFloatOrZero(poLine.getValue('internalid')),
                    'recordtype': poLine.getRecordType(),
                    'custrecord_syncmspo_linestklocn': poLine.getValue('custrecord_syncmspo_linestklocn'),
                    'custrecord_syncmspo_linemkey': poLine.getValue('custrecord_syncmspo_linemkey'),
                    'custrecord_syncmspo_linercvqty': parseFloatOrZero(poLine.getValue('custrecord_syncmspo_linercvqty')),
                    'custrecord_syncmspo_linestockno': poLine.getValue('custrecord_syncmspo_linestockno'),
                    'custrecord_syncmspo_linedescription': poLine.getValue('custrecord_syncmspo_linedescription'),
                    'custrecord_syncmspo_linenetprice': parseFloatOrZero(poLine.getValue('custrecord_syncmspo_linenetprice')),
                    'custrecord_syncmspo_linechgaccount': poLine.getValue('custrecord_syncmspo_linechgaccount'),
                    'custrecord_syncmspo_item_link': poLine.getValue('custrecord_syncmspo_item_link'),
                    'custrecord_syncmspo_vendor_id': poLine.getValue('custrecord_syncmspo_vendor_id'),
                    'custrecord_syncmspo_podate': poLine.getValue('custrecord_syncmspo_podate'),
                    'custrecord_syncmspo_supplier': poLine.getValue('custrecord_syncmspo_supplier'),
                    'name': poLine.getValue('name'),
                    'custrecord_syncmspo_linewo': poLine.getValue('custrecord_syncmspo_linewo'),
                    'custrecord_syncmspo_linechgcostcenter': poLine.getValue('custrecord_syncmspo_linechgcostcenter'),
                    'custrecord_syncmspo_lineordqty': parseFloatOrZero(poLine.getValue('custrecord_syncmspo_lineordqty')),
                    'custrecord_syncmspo_polineno': parseFloatOrZero(poLine.getValue('custrecord_syncmspo_polineno')),
                    'custrecord_syncmspo_linelastchangedate': poLine.getValue('custrecord_syncmspo_linelastchangedate'),
                    'custrecord_syncmspo_retries': parseFloatOrZero(poLine.getValue('custrecord_syncmspo_retries')),
                    'custrecord_syncmspo_reqdate': poLine.getValue('custrecord_syncmspo_reqdate'),
                    'custrecord_syncmspo_billto': poLine.getValue('custrecord_syncmspo_billto')
                };
                // Format dates and insert a standard date object
                var rawDate = lineObj['custrecord_syncmspo_podate'];
                var dateInMainSaverFormat = moment(rawDate).format(MAINSAVERDATEFORMAT);
                lineObj['custrecord_syncmspo_podate'] = moment(dateInMainSaverFormat).format('L');
                lineObj['date_injs'] = moment(dateInMainSaverFormat); //Standard Date Object, will be used in sorting
                lineObj['date_injslastchange'] = moment(moment(lineObj['custrecord_syncmspo_linelastchangedate']).format(MAINSAVERDATEFORMAT)); //Standard Date Object, will be used in sorting
                lineObj['date_injsreq_date'] = moment(moment(lineObj['custrecord_syncmsreq_podate']).format(MAINSAVERDATEFORMAT)); //Standard Date Object, will be used to determine whether to process or not
                lineObj['date_injspo_date'] = moment(moment(lineObj['custrecord_syncmspo_podate']).format(MAINSAVERDATEFORMAT));
                /**
                 * START, REMOVE POLINES BEFORE CUT-OFF
                 * if PROCESS_ALL flag is true, process all records else
                 * this will remove lines that are before the RAWCUTOFFDATE
                 */
                if (PROCESS_ALL) {
                    poLinesToProcess.push(lineObj);
                    nlapiSubmitField(CUSTOM_RECORD, internalId, 'custrecord_syncmspo_syncstatus', statusList.QUEUED);
                } else {
                    if (RAWCUTOFFDATE) {
                        var cutOffDate = moment(moment(RAWCUTOFFDATE).format(MAINSAVERDATEFORMAT));
                        if (lineObj['date_injsreq_date'].isSameOrAfter(cutOffDate) || line['date_injspo_date'].isSameOrAfter(cutOffDate)) {
                            poLinesToProcess.push(lineObj);
                            nlapiSubmitField(CUSTOM_RECORD, internalId, 'custrecord_syncmspo_syncstatus', statusList.QUEUED);
                        } else {
                            nlapiSubmitField(CUSTOM_RECORD, internalId, [
                                'custrecord_syncmspo_syncstatus',
                                'custrecord_syncmspo_errmsg',
                                'custrecord_syncmspo_retries'
                            ], [
                                statusList.COMPLETE,
                                'Transactions prior to (PO_DATE and REQ_DATE) ' + RAWCUTOFFDATE + ' are not being processed',
                                0
                            ]);
                        }
                    }
                }
                /**
                 * END, REMOVE POLINES BEFORE CUT-OFF
                 */
            } else {
                nlapiSubmitField(CUSTOM_RECORD, internalId, [
                    'custrecord_syncmspo_syncstatus',
                    'custrecord_syncmspo_errmsg',
                    'custrecord_syncmspo_retries'
                ], [
                    statusList.COMPLETE,
                    'SKIPPED: Not a PO line',
                    0
                ]);
            }
        });

        if (poLinesToProcess.length <= 0) {
            throw nlapiCreateError('error', 'No PO Lines found to process - unable to resolve error. (1)');
        }

        //region Special Handling for Suppliers
        // If supplier ID is 1136, mark as complete
        if (SyncMSRecord.getFieldValue('custrecord_syncmspo_supplier') == '1136') {
            poLinesToProcess.forEach(function (line, i, a) {
                var tempRetries = line.custrecord_syncmspo_linedescription;
                nlapiSubmitField(CUSTOM_RECORD, line.internalid, [
                    'custrecord_syncmspo_syncstatus',
                    'custrecord_syncmspo_errmsg',
                    'custrecord_syncmspo_retries'
                ], [
                    statusList.ERROR,
                    'ERROR: Inventory being manually adjusted by PO ' + SyncMSRecord.getFieldValue('custrecord_syncmspo_pono') + '. Please create this manually as an inventory adjustment and then mark these lines complete.',
                    0
                ]);
            });
            nlapiLogExecution('DEBUG', 'Supplier ID is 1136', 'Manual inventory adjustment');
            findNextRecord();
            return;
        }

        // If supplier ID is 3 or 1, skip
        if (SyncMSRecord.getFieldValue('custrecord_syncmspo_supplier') == '3' || SyncMSRecord.getFieldValue('custrecord_syncmspo_supplier') == '1') {
            poLinesToProcess.forEach(function (line, i, a) {
                var tempRetries = line.custrecord_syncmspo_retries;
                ErrorMsg = (SyncMSRecord.getFieldValue('custrecord_syncmspo_supplier') == '3') ? 'SKIPPED: Internal repair transaction, will not be processed' : 'SKIPPED: Internal transaction, will not be processed'
                nlapiSubmitField(CUSTOM_RECORD, line.internalid, [
                    'custrecord_syncmspo_syncstatus',
                    'custrecord_syncmspo_errmsg',
                    'custrecord_syncmspo_retries'
                ], [
                    statusList.COMPLETE,
                    ErrorMsg,
                    0
                ]);
            });
            nlapiLogExecution('DEBUG', 'Supplier ID is 3 or 1', 'SKIPPED: Internal transaction, will not be processed');
            findNextRecord();
            return;
        }

        // If supplier ID is 1, skip
        if (SyncMSRecord.getFieldValue('custrecord_syncmspo_supplier') == '3') {
            poLinesToProcess.forEach(function (line, i, a) {
                var tempRetries = line.custrecord_syncmspo_retries;
                nlapiSubmitField(CUSTOM_RECORD, line.internalid, [
                    'custrecord_syncmspo_syncstatus',
                    'custrecord_syncmspo_errmsg',
                    'custrecord_syncmspo_retries'
                ], [
                    statusList.COMPLETE,
                    'SKIPPED: Internal repair transaction, will not be processed',
                    0
                ]);
            });
            nlapiLogExecution('DEBUG', 'Supplier ID is 3', 'SKIPPED: Internal repair transaction, will not be processed');
            findNextRecord();
            return;
        }
		nlapiLogExecution("DEBUG","poLinesToProcess before reduce", JSON.stringify(poLinesToProcess))
        //Solenis Canada ULC, check if transaction total is 0, if yes, skip
        if (SyncMSRecord.getField('custrecord_syncmspo_supplier') == '48555') {
            var transactionTotal = poLinesToProcess.reduce(function (accu, line) {
                return accu + (line.custrecord_syncmspo_lineordqty * line.custrecord_syncmspo_linenetprice);
            }, 0);
            if (transactionTotal <= 0) {
                poLinesToProcess.forEach(function (line, i, a) {
                    var tempRetries = line.custrecord_syncmspo_retries;
                    nlapiSubmitField(CUSTOM_RECORD, line.internalid, [
                        'custrecord_syncmspo_syncstatus',
                        'custrecord_syncmspo_errmsg',
                        'custrecord_syncmspo_retries'
                    ], [
                        statusList.COMPLETE,
                        'SKIPPED: Not creating contract POs',
                        0
                    ]);
                });
                nlapiLogExecution('DEBUG', 'Supplier ID is 48555: Solenis Canada ULC', 'SKIPPED: Not creating contract POs');
                findNextRecord();
                return;
            }
        }
        //endregion

      	
      	nlapiLogExecution("DEBUG","poLinesToProcess before orderBy", JSON.stringify(poLinesToProcess))
      
        /**
         * Remove duplicates,
         * Duplicates must be removed first before validation to save
         * processing times. Duplicates are line items having the same PO_
         */
        //region Remove duplicates
        //Sort by internalid in descending
        poLinesToProcess = _.orderBy(poLinesToProcess, function (line) {
            return line.internalid;
        }, 'desc');

      	nlapiLogExecution("DEBUG","poLinesToProcess after orderBy", JSON.stringify(poLinesToProcess))
      
        //Filter by the uniq PO_LINENO
        uniquePoLinesToProcess = _.uniqBy(poLinesToProcess, function (line) {
            return line.custrecord_syncmspo_polineno;
        });
      
      	nlapiLogExecution("DEBUG","poLinesToProcess after uniqBy", JSON.stringify(uniquePoLinesToProcess))

        //Get the duplicatePoLines by comparing the original dataset with the uniquedataset
        var duplicatePoLines = _.xor(poLinesToProcess, uniquePoLinesToProcess);
        duplicatePoLines.forEach(function (line) {
            nlapiSubmitField(CUSTOM_RECORD, line.internalid, [
                'custrecord_syncmspo_syncstatus',
                'custrecord_syncmspo_errmsg',
                'custrecord_syncmspo_retries'
            ], [
                statusList.DUPLICATE,
                'Duplicate PO line - skipping',
                0
            ]);
        });
        //endregion

        /**
         * Validation of important fields
         * validate all lines first, if one is in error state, processing should not continue
         * and all records in the set should be in error state.
         */
            //region Validation of important fields
        var tempLocation = -1;

        serializedLines = _.remove(uniquePoLinesToProcess, function (line) {
            //TC10ROD 05212020 Lisa requested items under these chargeaccounts 1426, 1427, 1428, 1429 to be treated the same as 1480, thus this was patterned from 1480 below.
            return ((line.custrecord_syncmspo_linechgaccount == '1480' || line.custrecord_syncmspo_linechgaccount == '1700') ||
                (isPartOfClothingBreakdown(line.custrecord_syncmspo_linechgaccount))) &&
                (!
                        ((line.custrecord_syncmspo_linechgaccount == '1480' && line.custrecord_syncmspo_supplier == '48876') ||
                        
                        (isPartOfClothingBreakdown(line.custrecord_syncmspo_linechgaccount) && line.custrecord_syncmspo_supplier == '48876') ||
                        
                            (line.custrecord_syncmspo_linechgaccount == '1700' && line.custrecord_syncmspo_supplier == '50009'))
                );
        });
      
      nlapiLogExecution("DEBUG","poLinesToProcess after serializedLines.remove uniquePoLinesToProcess", JSON.stringify(uniquePoLinesToProcess))
      
      nlapiLogExecution("DEBUG","serializedLines after serializedLines.remove uniquePoLinesToProcess", JSON.stringify(serializedLines))
      
        serializedLines.forEach(function (line) {
            if (isBlank(line.custrecord_syncmspo_linedescription)) {
                skippedSerializedLines.push(line);
            } else {
                var serialNoObj = extractSerialNumber(line.custrecord_syncmspo_linechgaccount, line.custrecord_syncmspo_linedescription, false);
                // Check for serial numbers
                if (isBlank(serialNoObj.serialNumber)) {
                    skippedSerializedLines.push(line);
                } else {
                    /**
                     * This will be used to remove the serialized lines in the existing
                     * standard Purchase Order and be the basis for IR
                     * one serialized line is equivalent to 1 IR
                     */
                    serializedLinesToAddOrRemove.push(line);
                }
            }
        });
      
       nlapiLogExecution("DEBUG","serializedLines after extractSerialNumber", JSON.stringify(serializedLines))

      	nlapiLogExecution("DEBUG","poLinesToProcess before concat serializedLinesToAddOrRemove", JSON.stringify(uniquePoLinesToProcess))
      
        // Re-add back the serializedLinesToAddOrRemove to the dataset
        uniquePoLinesToProcess = uniquePoLinesToProcess.concat(serializedLinesToAddOrRemove);

      	
      	nlapiLogExecution("DEBUG","poLinesToProcess after concat serializedLinesToAddOrRemove", JSON.stringify(uniquePoLinesToProcess))
      
        if (uniquePoLinesToProcess.length <= 0) {
            throw nlapiCreateError('error', 'No PO Lines found to process - unable to resolve error. (2)');
        }

        // nlapiLogExecution('DEBUG', 'Verify if uniquePoLinesToProcess', 'uniquePoLinesToProcess count: ' + uniquePoLinesToProcess.length);
        uniquePoLinesToProcess.forEach(function (line, i, a) {
            var recordLink = nlapiResolveURL('RECORD', line.recordtype, line.internalid);
            recordLink = '<a href="' + recordLink + '">' + line.name + '</a>';

            // Check for locations, needed for Item Receipt
            var binNumber = line.custrecord_syncmspo_linestklocn;
            tempLocation = getLocation(binNumber, line.custrecord_syncmspo_billto, line.custrecord_syncmspo_linechgaccount, line.custrecord_syncmspo_linechgcostcenter);
            // nlapiLogExecution('DEBUG', 'Output of initial location check', 'binNumber: ' + binNumber + ' tempLocation: ' + tempLocation);
            var lineMkey = line.custrecord_syncmspo_linemkey;
            if (isBlank(lineMkey)) {
                lineMkey = line.custrecord_syncmspo_linestockno;
            }
            if (isBlank(line.custrecord_syncmspo_linestklocn) && isBlank(line.custrecord_syncmspo_linestockno)) {
                lineMkey = '';
            }
            var validateItemErrMsg = validateItem(
                line.custrecord_syncmspo_linestklocn,
                lineMkey,
                line.custrecord_syncmspo_linechgaccount,
                line.custrecord_syncmspo_supplier,
                line.custrecord_syncmspo_linenetprice,
                false
            );
            if (!isBlank(validateItemErrMsg)) {
                errorsArr.push(validateItemErrMsg + '. Please correct record: ' + recordLink);
            }

            if (isBlank(line.custrecord_syncmspo_podate)) {
                errorsArr.push('Missing PO_DATE field. Please correct record: ' + recordLink);
            }

            if (isBlank(line.custrecord_syncmspo_supplier)) {
                errorsArr.push('Missing SUPPLIER NetSuite match with MS ID: ' + line.custrecord_syncmspo_supplier + '. Please correct record: ' + recordLink);
            } else {
                var x = validateSupplier(line.custrecord_syncmspo_supplier, false);
                !isBlank(x) ? errorsArr.push(x) : '';
            }
        });
        if (!isBlank(errorsArr)) {
            for (var i in errorsArr) {
                var temp = parseInt(1) + parseInt(i);
                errorStr += temp + '. ' + errorsArr[i] + '<br />';
            }
            throw nlapiCreateError('ERROR', errorStr);
        }
        if (uniquePoLinesToProcess.length <= 0) {
            throw nlapiCreateError('error', 'No PO Lines found to process - unable to resolve error. (3)');
        }
        //endregion

        //region Handler Purchase Order
        //Group poLinesToProcess by PO_LINENO(custrecord_syncmspo_polineno)
        var poLinesToProcessGroupedByLineNo = _.groupBy(poLinesToProcess, function (line) {
            return line.custrecord_syncmspo_polineno
        });

        //Check for existing Standard Purchase Order
        var POfilters = [
            ['custbody_msid', 'is', SyncMSRecord.getFieldValue('custrecord_syncmspo_pono')], 'AND',
            ['mainline', 'is', 'T']
        ];
        var POcolumns = [];
        POcolumns[0] = new nlobjSearchColumn('internalid'); //Internal Id
        var POResults = nlapiSearchRecord('purchaseorder', null, POfilters, POcolumns) || [];
        var PORec = null;
        var isCreate = true;

        if (POResults.length > 0) { //Existing standard Purchase Order
            var purchaseOrderId = POResults[0].getId();
            PORec = nlapiLoadRecord('purchaseorder', purchaseOrderId);
            var NumOfLines = PORec.getLineItemCount('item');
            isCreate = false;
            //region Remove standard PO lines with empty custcol_syncmspo_line
            var filtersForPoLinesToRemove = [
                ['custcol_syncmspo_lineno', 'isempty', null], 'AND',
                ['internalid', 'is', purchaseOrderId], 'AND',
                ['mainline', 'is', false], 'AND',
                ['taxline', 'is', false]
            ];
            var columnsForPoLinesToRemove = [];
            columnsForPoLinesToRemove.push(new nlobjSearchColumn('internalid'));
            columnsForPoLinesToRemove.push(new nlobjSearchColumn('line'));
            columnsForPoLinesToRemove.push(new nlobjSearchColumn('custcol_syncmspo_lineno'));
            columnsForPoLinesToRemove.push(new nlobjSearchColumn('custcol_syncmspo_line_link'));
            var poLinesToRemove = nlapiSearchRecord('purchaseorder', null, filtersForPoLinesToRemove, columnsForPoLinesToRemove) || [];

            poLinesToRemove.forEach(function (line, i, a) {
                nlapiLogExecution('DEBUG', 'poLineToRemove', JSON.stringify(line));
                var poLineNumber = line.getValue('line');
                var x = PORec.findLineItemValue('item', 'line', poLineNumber);
                if (x == -1) {
                    nlapiLogExecution('DEBUG', 'poLineNumber does not exist');
                    return;
                }
                x = parseFloatOrZero(x);
                nlapiLogExecution('DEBUG', 'poLineNumber x: ', x);
                PORec.removeLineItem('item', x, false);
            });
            //endregion
        } else { //New standard Purchase Order
            PORec = nlapiCreateRecord('purchaseorder');
            validSupplier = validateSupplier(SyncMSRecord.getFieldValue('custrecord_syncmspo_supplier'), true);
            PORec.setFieldValue('entity', validSupplier);
          	var targetSubsidiary = getSubsidiary(SyncMSRecord.getFieldValue('custrecord_syncmspo_billto'), SyncMSRecord.getFieldValue('custrecord_syncmspo_linechgaccount'), SyncMSRecord.getFieldValue('custrecord_syncmspo_linechgcostcenter'));
            
            PORec.setFieldValue('subsidiary', targetSubsidiary);
            PORec.setFieldValue('trandate', tempDate);
            PORec.setFieldValue('tobeemailed', 'F');
            PORec.setFieldValue('location', tempLocation);
            validCurrency = getCurrency(SyncMSRecord.getFieldValue('custrecord_syncmspo_currcode'));
            if (isBlank(validCurrency)) {
                throw nlapiCreateError('ERROR', 'Transaction Currency is: ' + SyncMSRecord.getFieldValue('custrecord_syncmspo_currcode') + '. This is not a valid currency');
            }
            PORec.setFieldValue('currency', validCurrency);
        }
        PORec.setFieldValue('approvalstatus', '2'); //Auto approved, since this is coming from MainSaver
        PORec.setFieldValue('custbody_purchase_order', SyncMSRecord.getFieldValue('custrecord_syncmspo_pono'));
        PORec.setFieldValue('custbody_msid', SyncMSRecord.getFieldValue('custrecord_syncmspo_pono'));

        PO_MEMO = (isCreate ? 'Create' : 'Update') + ' from Mainsaver PO ' + SyncMSRecord.getFieldValue('custrecord_syncmspo_pono') + PO_MEMO;
        PO_MEMO = PO_MEMO.substr(0, 999); // maximum length of Memo field
        PORec.setFieldValue('memo', PO_MEMO);

        //region Create/Update standard Purchase Order Lines
        var poLinesToBeReceived = [];
        uniquePoLinesToProcess.forEach(function (line) {
            nlapiLogExecution('DEBUG', 'line', JSON.stringify(line));
            var existingPoLineId = PORec.findLineItemValue('item', 'custcol_syncmspo_lineno', line.custrecord_syncmspo_polineno.toString());
            nlapiLogExecution('DEBUG', 'existingPoLineId', existingPoLineId);
            var lineMkey = line.custrecord_syncmspo_linemkey;
            if (isBlank(lineMkey)) {
                lineMkey = line.custrecord_syncmspo_linestockno;
            }
            if (isBlank(line.custrecord_syncmspo_linestklocn) && isBlank(line.custrecord_syncmspo_linestockno)) {
                lineMkey = '';
            }
            //TC10ROD investigating why item 9999 is used for PO PO14785, requested by LISA
            if (line.custrecord_syncmspo_linercvqty == 0 && line.custrecord_syncmspo_linenetprice == 0) {
                line.custrecord_syncmspo_linestklocn = '';
                //1.0.1 commented out
                //line.custrecord_syncmspo_linechgaccount = '9999'
            }
            var validItem = validateItem(
                line.custrecord_syncmspo_linestklocn,
                lineMkey,
                line.custrecord_syncmspo_linechgaccount,
                line.custrecord_syncmspo_supplier,
                line.custrecord_syncmspo_linenetprice,
                true
            );
            nlapiLogExecution('DEBUG', 'validItem', JSON.stringify(validItem));
            validItem['locationInternalId'] = getLocation(line.custrecord_syncmspo_linestklocn, line.custrecord_syncmspo_billto, line.custrecord_syncmspo_linechgaccount, line.custrecord_syncmspo_linechgcostcenter);
            line['validItem'] = validItem;

            if (existingPoLineId > 0) {
                PORec.selectLineItem('item', existingPoLineId);
                var receivedQty = parseFloatOrZero(PORec.getCurrentLineItemValue('item', 'quantityreceived'));
                if (receivedQty == 0) { // handler if the line still doesn't have any received qty yet, it can still be changed
                    PORec.setCurrentLineItemValue('item', 'item', validItem.internalId);
                }
            } else {
                PORec.selectNewLineItem('item');
                PORec.setCurrentLineItemValue('item', 'item', validItem.internalId);
            }
            var departmentName = line.custrecord_syncmspo_linechgcostcenter;
            if (!isBlank(departmentName)) {
                var departmentId = getDepartmentId(departmentName);
                if (!isBlank(departmentId) || (line.custrecord_syncmspo_linechgaccount == '3987' || line.custrecord_syncmspo_linechgaccount == '3987') ) {
                  
                  	//11242021 - c/o mark, rod new rules
                    /*
                    1) LINE_CHG_ACCOUNT is 3987:  Set department to 0000, account to 3987, subsidiary to ANC Transloading.
                    2)LINE_CHG_ACCOUNT is 3989:  Set department to 0000, account to 3989, subsidiary to ANC Transloading.
                    3)LINE_CHG_COSTCENTER is 0910: Set department to 0910, subsidiary to ANC Transloading
                    4)LINE_CHG_COSTCENTER is 0911: Set department to 0911, subsidiary to ANC Transloading
                    5)LINE_CHG_COSTCENTER is 0915: Set department to 0915, subsidiary to ANC Transloading
                    */
                    if(line.custrecord_syncmspo_linechgaccount == '3987')
					{
                        departmentId = getDepartmentId('0000');
                    }
                  	else if(line.custrecord_syncmspo_linechgaccount == '3989')
					{
                        departmentId = getDepartmentId('0000');
                    }
                  	//the rest of the newly defined rule is already what the script is doing.
                  
                    PORec.setCurrentLineItemValue('item', 'department', departmentId);
                }
            }
            PORec.setCurrentLineItemValue('item', 'fulfillable', validItem.isFulfillable);
            PORec.setCurrentLineItemValue('item', 'custcol_syncmspo_lineno', line.custrecord_syncmspo_polineno);
            PORec.setCurrentLineItemValue('item', 'quantity', line.custrecord_syncmspo_lineordqty);
            PORec.setCurrentLineItemValue('item', 'description', line.custrecord_syncmspo_linedescription + ', WO: ' + line.custrecord_syncmspo_linewo);
            PORec.setCurrentLineItemValue('item', 'custcol_syncmspo_line_link', line.internalid);
            PORec.setCurrentLineItemValue('item', 'rate', line.custrecord_syncmspo_linenetprice);
            PORec.setCurrentLineItemValue('item', 'amount', nlapiFormatCurrency(line.custrecord_syncmspo_lineordqty * line.custrecord_syncmspo_linenetprice));
            PORec.setCurrentLineItemValue('item', 'custcol_workorder', line.custrecord_syncmspo_linewo);

          	/*
          	 * TC10ROD 11212020 - do not force  a tax code, or apply dynamic mode record mode.
          	 * allow no tax codes to get an error, its a better practice to have the master/item records properly setup
          	 * /
            
            /*
             var currentTaxCode = PORec.getCurrentLineItemValue('item', 'taxcode');
            nlapiLogExecution("DEBUG", "currentTaxCode", currentTaxCode);
            if(!currentTaxCode)
            {
                PORec.setCurrentLineItemValue('item', 'taxcode', '82'); //82 is NON TAXABLE
            }
             * */
            
            
            //classify if line is either serialized or not
            if ((line.custrecord_syncmspo_linechgaccount == '1480' || line.custrecord_syncmspo_linechgaccount == '1700') &&
                (!
                        ((line.custrecord_syncmspo_linechgaccount == '1480' && line.custrecord_syncmspo_supplier == '48876') ||
                            (line.custrecord_syncmspo_linechgaccount == '1700' && line.custrecord_syncmspo_supplier == '50009'))
                )) {
                serializedLinesToBeReceived.push(line);
            } else {
                poLinesToBeReceived.push(line);
            }
            PORec.commitLineItem('item');
            loggerJSON('ITEM FIELDS',
                'Quantity: ' + line.custrecord_syncmspo_lineordqty +
                ' | Rate: ' + line.custrecord_syncmspo_linenetprice +
                ' | Memo: ' + line.custrecord_syncmspo_linedescription
            );
        });
        var PORecID = nlapiSubmitRecord(PORec);
        //endregion
        //endregion

        /**
         * Update the group's Sync status to 0
         * and the retries to 0
         */
        var z = isCreate ? 'created' : 'updated';
        var completedLines = uniquePoLinesToProcess.concat(serializedLinesToAddOrRemove);
        completedLines.forEach(function (line) {
            nlapiSubmitField(CUSTOM_RECORD, line.internalid, [
                'custrecord_syncmspo_nsid',
                'custrecord_syncmspo_retries',
                'custrecord_syncmspo_syncstatus',
                'custrecord_syncmspo_errmsg'
            ], [
                PORecID,
                0,
                statusList.COMPLETE,
                'PO has been ' + z + ' with Internal ID ' + PORecID
            ]);
        });
        removedLines.forEach(function (line, i, a) {
            nlapiSubmitField(CUSTOM_RECORD, line.internalid, [
                'custrecord_syncmspo_syncstatus',
                'custrecord_syncmspo_errmsg',
                'custrecord_syncmspo_retries'
            ], [
                statusList.COMPLETE,
                'SKIPPED: Adding description to MEMO',
                0
            ]);
        });
        skippedSerializedLines.forEach(function (line, i, a) {
            nlapiSubmitField(CUSTOM_RECORD, line.internalid, [
                'custrecord_syncmspo_syncstatus',
                'custrecord_syncmspo_errmsg',
                'custrecord_syncmspo_retries'
            ], [
                statusList.COMPLETE,
                'SKIPPED: Missing serial number',
                0
            ]);
        });
        /**
         * Update the header PO error message and status
         * @type {[type]}
         */
        var headerPoId = nlapiLookupField(CUSTOM_RECORD, SyncMSID, ['custrecord_syncmspo_main_link'])['custrecord_syncmspo_main_link'];
        if (headerPoId) {
            nlapiSubmitField('customrecord_syncmspurchaseorder_main', headerPoId, [
                'custrecord_syncmspor_main_sync_status',
                'custrecord_syncmspor_main_polink',
                'custrecord_syncmspor_main_error'
            ], [
                statusList.COMPLETE,
                PORecID,
                'SyncMSPO with Internal ID ' + headerPoId + ' has ' + z + ' PO with Internal ID ' + PORecID
            ]);
        }
        nlapiLogExecution('AUDIT', 'CALLSCHEDULEDSYNCMSINVENTORY', 'SyncMSPO with Internal ID ' + SyncMSID + ' has ' + z + ' a PO with Internal ID ' + PORecID);

    } catch (e) {
        nlapiLogExecution('error', 'ScheduledSyncMSPO() has encountered an error.', errText(e));
        /**
         * Update the header PO error message and status
         */
        var headerPoId = nlapiLookupField(CUSTOM_RECORD, SyncMSID, ['custrecord_syncmspo_main_link'])['custrecord_syncmspo_main_link'];
        if (headerPoId) {
            nlapiSubmitField('customrecord_syncmspurchaseorder_main', headerPoId, [
                'custrecord_syncmspor_main_error',
                'custrecord_syncmspor_main_sync_status'
            ], [
                errorStr + ' :: ' + errText(e),
                statusList.ERROR
            ]);
        }
        /**
         * When the current PO line is in error state,
         * update the whole group's SyncStatus to error and decrease the retry count as well
         */
        var erroredLines = uniquePoLinesToProcess.concat(removedLines, skippedSerializedLines, serializedLinesToAddOrRemove);
        erroredLines.forEach(function (line) {
            var tempRetries = line.custrecord_syncmspo_retries;
            if (tempRetries > 0) {
                nlapiSubmitField(CUSTOM_RECORD, line.internalid, [
                    'custrecord_syncmspo_retries',
                    'custrecord_syncmspo_syncstatus',
                    'custrecord_syncmspo_errmsg'
                ], [
                    --tempRetries,
                    statusList.ERROR,
                    'Error Details: ' + errText(e)
                ]);
            }
        });
        var tempRetries = nlapiLookupField(CUSTOM_RECORD, SyncMSID, 'custrecord_syncmspo_retries');
        nlapiLogExecution('debug', 'CALLSCHEDULESYNCMSPO', 'ScheduledSyncMSPO has been updated with ' + (tempRetries) + ' retries.');
    }
    findNextRecord();
}

function findNextRecord() {
    //Check for additional records to add to processing queue
    var filters = [
        ['custrecord_syncmspo_syncstatus', 'anyof', [statusList.NEW, statusList.ERROR, statusList.TO_REPROCESS]], 'AND',
        ['custrecord_syncmspo_retries', 'greaterthan', 0]
    ];
    var columns = [];
    columns[0] = new nlobjSearchColumn('internalid');

    var searchResults = nlapiSearchRecord(CUSTOM_RECORD, null, filters, columns);

    if (searchResults) {
        var nextSyncMSID = searchResults[0].getValue('internalid');
        nlapiLogExecution('AUDIT', 'CALLSCHEDULEDSYNCMSPO', 'Additional records to sync found. Queueing ' + nextSyncMSID);
        var newParams = {'custscript_syncmspoid': nextSyncMSID};
        var ScheduleStatus = '';
        while (ScheduleStatus == '') {
            ScheduleStatus = nlapiScheduleScript(script_id, context.getDeploymentId(), newParams); //Deployment is empty so that script selects first available deployment
            nlapiLogExecution('AUDIT', 'ScheduleStatus', ScheduleStatus);
        }
        if (ScheduleStatus == 'QUEUED') {
            nlapiSubmitField(CUSTOM_RECORD, nextSyncMSID, ' custrecord_syncmspo_syncstatus', '6');
        } //Else no available deployments - remaining records will be caught by periodic retry script
    } else {
        nlapiLogExecution('AUDIT', 'CALLSCHEDULEDSYNCMSPO', 'No records to sync found.');
    }
}

function errText(_e) {
    _internalId = nlapiGetRecordId(); //this is not working in the context of an 'open' record
    _internalId = _internalId || parseInt(SyncMSID);

    // nlapiLogExecution('DEBUG', '_internalId', _internalId)

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

function validateSupplier(supplierKey, throwError) {
    /**
     * Check if the supplierKey exists in the identicalSupplierIds
     * if true, use that set of keys as lookup value for the
     * MSID in the vendor record
     */
    var masterSupplierKey = supplierKey;
    var indexOf = _.findIndex(identicalSupplierIds, function (i) {
        return _.find(i, function (x) {
            return x.toString() == supplierKey
        });
    });
    if (indexOf > -1) {
        supplierKey = identicalSupplierIds[indexOf];
    }
    // Form the filter expression
    var filters = [];
    if (isArray(supplierKey)) {
        var holderArray = [];
        supplierKey.forEach(function (e) {
            holderArray.push([
                'custentity_msid',
                'is',
                e.toString()
            ]);
            holderArray.push('OR');
        });
        holderArray.pop(); //removes dangling 'OR'
        filters.push(holderArray)
    } else {
        filters.push([
            'custentity_msid',
            'is',
            supplierKey
        ]);
    }
    filters.push('AND');
    filters.push(['isinactive', 'is', false]);
    // nlapiLogExecution('DEBUG', 'filters', JSON.stringify(filters));

    var columns = [];
    columns[0] = new nlobjSearchColumn('internalid').setSort('DESC');
    columns[1] = new nlobjSearchColumn('custentity_msid');
    var searchResults = nlapiSearchRecord('vendor', null, filters, columns);

    if (throwError) {
        if (searchResults) {
            for (n = 0; n < searchResults.length; n++) {
                if (searchResults[n].getValue('custentity_msid') == masterSupplierKey) {
                    return searchResults[n].getValue('internalid');
                }
            }
            return searchResults[0].getValue('internalid');
        } else {
            throw nlapiCreateError('error', 'Unable to find Mainsaver Supplier for Supplier Key ' + JSON.stringify(supplierKey));
        }
    } else {
        if (searchResults) {
            return '';
        } else {
            return 'Unable to find Mainsaver Supplier for Supplier Key ' + JSON.stringify(supplierKey);
        }
    }
}


/**
 * Item validation,
 * if LINE_CHG_ACCT is 1480 or 1700, search for Serialized Inventory using the LINE_CHG_ACCT as lookup value for MSID
 * ELSE
 * if LINE_STK_LOCN has a prefix of NS- but not NS-CHEM, it is a Non-stock Non-Inventory item
 * if LINE_STK_LOCN has as prefix of FI, it is a Free Issue Non-Inventory item
 * if LINE_STK_LOCN does not fall on the categories above, it is an Inventory item
 * @param stockLocn - custrecord_syncmspo_linestklocn (LINE_STK_LOCN)
 * @param stockNo - custrecord_syncmspo_linemkey (LINE_MKEY)
 * @param chargeAcct - custrecord_syncmspo_linechgaccount (LINE_CHG_ACCOUNT)
 * @param throwError - boolean, if true, throw error else return error message
 * @returns {string}
 */
function validateItem(stockLocn, stockNo, chargeAcct, supplierId, lineNetPrice, throwError) {
    var type = '';
    var itemColumns = [];
    var item = '';
    var filters = [];

    itemColumns.push(new nlobjSearchColumn('internalid'));
    itemColumns.push(new nlobjSearchColumn('usebins'));
    itemColumns.push(new nlobjSearchColumn('isfulfillable'));

    if (chargeAcct == '1480' || chargeAcct == '1700') {
        if (chargeAcct == '1700' && supplierId == '48876') {
            type = 'inventoryitem';
            item = supplierId + '--' + chargeAcct
        } else if (chargeAcct == '1480' && supplierId == '50009') {
            type = 'inventoryitem';
            item = supplierId + '--' + chargeAcct
        } else {
            type = 'serializedinventoryitem';
            item = chargeAcct;
        }
    }
    //TC10ROD 05212020 Lisa requested items under these chargeaccounts 1426, 1427, 1428, 1429 to be treated the same as 1480, thus this was patterned from 1480 the above.
    else if (isPartOfClothingBreakdown(chargeAcct)) {
        if (supplierId == '50009') {
            type = 'inventoryitem';
            item = supplierId + '--' + chargeAcct
        } else {
            type = 'serializedinventoryitem';
            //item = chargeAcct;
            item = stockNo;
        }
    }
    else {
        if (stockLocn.substr(0, 3) == 'NS-' && stockLocn.substr(0, 7) != 'NS-CHEM' && stockLocn.substr(0, 7) != 'NS-FINI') {
            chargeAcct = chargeAcct == '9990' ? '9900' : chargeAcct;
            type = 'noninventoryitem';
            item = 'NS-' + chargeAcct;
        } else if (stockLocn.substr(0, 3) == 'FI-') {
            chargeAcct = chargeAcct == '9990' ? '9900' : chargeAcct;
            type = 'noninventoryitem';
            item = 'NS-' + chargeAcct;
            //item = chargeAcct; //Previous logic, testing replacement logic
        } else if (stockLocn.substr(0, 7) == 'NS-CHEM') {
            type = 'inventoryitem';
            item = chargeAcct;
        } else if ((stockLocn.substr(0, 7) == 'WHS-FINI') || (stockLocn.substr(0, 7) == 'WH-FINI') || (stockLocn.substr(0, 7) == 'NS-FINI')) {
            type = 'inventoryitem';
            item = stockNo;
        } else if (chargeAcct == '1647' || chargeAcct == '1648') {
            type = 'inventoryitem';
            item = chargeAcct;
        } else if (isBlank(stockLocn) && lineNetPrice <= 0) {
            
            //it goes here so it must return correct item
            //TC10ROD investigating why item 9999 is used for PO PO14785, requested by LISA
            chargeAcct = chargeAcct == '9990' ? '9900' : chargeAcct;
            type = 'noninventoryitem';
            item = 'NS-' + chargeAcct;
        } else if (isBlank(stockLocn) && isBlank(stockNo)) {
            type = 'noninventoryitem';
            item = 'NS-' + chargeAcct
        } else {
            //stockNo = chargeAcct == '1647' || chargeAcct == '1648' ? chargeAcct : stockNo; //Logic Moved before Stock Location
            type = 'inventoryitem';
            item = stockNo;
        }
    }

    filters = [
        ['custitem_msid', 'is', item],
        'AND',
        ['isinactive', 'is', false]
    ];
    var itemResults = nlapiSearchRecord(type, null, filters, itemColumns);

    
    nlapiLogExecution("DEBUG", "TC10ROD throwError results", JSON.stringify({throwError : throwError, itemResults : itemResults}));
    nlapiLogExecution("DEBUG", "TC10ROD {item : item, type : type}", JSON.stringify({item : item, type : type}));
    if (throwError) {
        if (itemResults) {
            return {
                internalId: itemResults[0].getValue('internalid'),
                useBins: itemResults[0].getValue('usebins'),
                type: type,
                isFulfillable: itemResults[0].getValue('isfulfillable')
            };
        } else {
            throw nlapiCreateError('error', 'Unable to find matching item record for item type ' + type + ' and MS ID: ' + item);
        }
    } else {
        if (itemResults) {
            return '';
        } else {
            return 'Unable to find matching item record for item type ' + type + ' and MS ID: ' + item;
        }
    }
}

function getLocation(binNumber, subsidiary, custrecord_syncmspo_linechgaccount, custrecord_syncmspo_linechgcostcenter) {
    var tempLocation = '-1';
    var _sub = getSubsidiary(subsidiary, custrecord_syncmspo_linechgaccount, custrecord_syncmspo_linechgcostcenter);
    if (_sub == 1) { // ANC
        if (binNumber.substring(0, 3) == 'PG-') {
            //Power Gen
            tempLocation = '214';
        } else if (binNumber.substring(0, 7) == 'NS-CHEM') {
            //Chemicals
            tempLocation = '213';
        } else if (binNumber.substring(0, 7) == 'NS-FINI' || binNumber.substring(0, 8) == 'WHS-FINI') {
            //Finishing
            tempLocation = '220';
        } else {
            //General Stores Inventory
            tempLocation = '110';
        }
    }
    if (_sub == 2) { // Timber
        //TODO logic for timber locations
        tempLocation = '227';
    }
  	if (_sub == 7) { // Transload
        if (binNumber.substring(0, 3) == 'PG-') {
            //Power Gen
            tempLocation = '214';
        } else if (binNumber.substring(0, 7) == 'NS-CHEM') {
            //Chemicals
            tempLocation = '213';
        } else if (binNumber.substring(0, 7) == 'NS-FINI' || binNumber.substring(0, 8) == 'WHS-FINI') {
            //Finishing
            tempLocation = '220';
        } else {
            //ANCTI - Stores
            tempLocation = '241';
        }
    }
    // nlapiLogExecution('DEBUG', 'Check output of getLocation()', 'Input binNumber: ' + binNumber + ' Output tempLocation: ' + tempLocation);
        return tempLocation;
}

/**
 *
 * @param chargeAcct custrecord_syncmspo_linechgaccount (LINE_CHG_ACCOUNT)
 * @param lineDescription custrecord_syncmspo_linedescription
 */
function extractSerialNumber(chargeAcct, lineDescription, throwError) {
    var returnObj = {
        'errorMsg': '',
        'serialNumber': ''
    }
    chargeAcct = chargeAcct.toString();
    // Check first if lineDescription is blank
    if (throwError) {
        if (isBlank(lineDescription)) {
            throw 'Line description is blank, abort extraction of Serial Number';
        }
    } else {
        if (isBlank(lineDescription)) {
            returnObj['errorMsg'] = 'Line description is blank, abort extraction of Serial Number';
            return returnObj;
        }
    }

    // Build a list of patterns to match against
    var patterns = [];
    if (chargeAcct == '1480') {
        patterns = [
            'Serial #',
            'Serial#',
            'Serial number',
            'Serialnumber',
            'Serial no',
            'Serial No',
            'Fabric #',
            'Fabric#'
        ];
    }
    //TC10ROD 05212020 Lisa requested items under these chargeaccounts 1426, 1427, 1428, 1429 to be treated the same as 1480, thus this was patterned from 1480 the above.
    else if (isPartOfClothingBreakdown(chargeAcct)) {
        patterns = [
            'Serial #',
            'Serial#',
            'Serial number',
            'Serialnumber',
            'Serial no',
            'Serial No',
            'Fabric #',
            'Fabric#'
        ];
    }
    else if (chargeAcct == '1700') { //1700
        patterns = [
            //'RY',
            //'SY',
            //'JC',
            'ring number', 'ringnumber',
            'Ring #', 'Ring#',
            'Ring No', 'Ringno',
            'Ring Num', 'Ringnum',
          	'CENTER PLATE', 'center plate'
          	//TODO 08262020PH TC10ROD preet's syncrecord was expecting this
        ];
    }

    // This will test if each of the pattern match in the lineDescription
    // if one is found, get the index of the pattern then premature exit
    var matchIndex = -1;
    for (var i = 0; i < patterns.length; i++) {
        var pattern = patterns[i];
        var index = lineDescription.toUpperCase().indexOf(pattern.toUpperCase());
        if (index > -1) {
            matchIndex = index + pattern.length;
            break;
        }
    }

    // If matchIndex is -1, it means that pattern was not found in the lineDescription
    if (throwError) {
        if (matchIndex == -1) {
            throw 'Serial number not found';
        }
    } else {
        if (matchIndex == -1) {
            returnObj['errorMsg'] = 'Serial number not found';
            return returnObj;
        }
    }

    var whitespace = -1;
    whitespace = lineDescription.indexOf(' ', matchIndex);

    var serialNumber = '';
    serialNumber = (whitespace > -1 ? lineDescription.substr(matchIndex, lineDescription.length - whitespace + 1) : lineDescription.substr(matchIndex)); //extract the serial number
    serialNumber = serialNumber.match(/([A-z0-9\-\_]*)\w+/g); //extract only alphanumeric characters and -
    if (throwError) {
        if (serialNumber == null) {
            throw 'Invalid serial number';
        }
    } else {
        if (serialNumber == null) {
            returnObj['errorMsg'] = 'Invalid serial number';
            return returnObj;
        }
    }

    serialNumber = serialNumber[0];
    if (throwError) {
        if (serialNumber == '') {
            throw 'Missing serial number';
        }
    } else {
        if (serialNumber == '') {
            returnObj['errorMsg'] = 'Missing serial number';
        }
    }
    returnObj['serialNumber'] = serialNumber;
    return returnObj;
}

function getCurrency(currency) {
    var currencyId = '';
    if (currency == 'CANADA') {
        currencyId = '1';
    } else if (currency == 'USA') {
        currencyId = '2';
    } else if (currency == 'GERMANY') {
        currencyId = '4';
    } else if (currency == 'SWITZERLAND') {
        //throw nlapiCreateError('error', 'Currency mapping is not yet setup for currency code ' + currency + '. Please check that the currency code has been created and update the script.');
        currencyId = '5';
    } else if (currency == 'SWEDEN') {
        currencyId = '6';
    }
    return currencyId;
}

//region NEW FUNCTIONS

var getPurchaseOrder = function (purchaseOrderNum) {
    var internalId = '';
    var purchaseorderSearch = nlapiSearchRecord('purchaseorder', null,
        [
            ['type', 'anyof', 'PurchOrd'],
            'AND',
            ['custbody_msid', 'is', purchaseOrderNum],
            'AND',
            ['mainline', 'is', 'T']
        ],
        []
    );
    if (!isBlank(purchaseorderSearch)) {
        internalId = purchaseorderSearch [0].getId();
    }
    return internalId;
};

function getDepartmentId(departmentName) {
    var departmentId = '';
    var departmentSearch = nlapiSearchRecord('department', null,
        [
            ['namenohierarchy', 'startswith', departmentName],
            'AND',
            ['isinactive', 'is', false]
        ],
        [
            new nlobjSearchColumn('name').setSort(true),
            new nlobjSearchColumn('internalid').setSort(false)
        ]
    );
    if (!isBlank(departmentSearch)) {
        departmentId = departmentSearch[0].getId();
    }
    if (departmentName == '0000')
    {
        departmentId = 2;
    }
        
    return departmentId;
}

function getBinDetails(binNumber, custrecord_syncmspo_linechgaccount, custrecord_syncmspo_linechgcostcenter) {
    var binNumberInternalId = -1;
    var tempLocation = -1;
    var binSearchFilters = [];

    tempLocation = getLocation(binNumber, custrecord_syncmspo_linechgaccount, custrecord_syncmspo_linechgcostcenter);

    binSearchFilters.push(new nlobjSearchFilter('location', null, 'is', tempLocation));
    binSearchFilters.push(new nlobjSearchFilter('binnumber', null, 'is', binNumber));

    var binSearchResults = nlapiSearchRecord('bin', null, binSearchFilters) || [];

    if (binSearchResults.length > 0) {
        binNumberInternalId = binSearchResults[0].getId();
    } else {
        var newBinRec = nlapiCreateRecord('bin');
        newBinRec.setFieldValue('location', tempLocation);
        newBinRec.setFieldValue('binnumber', binNumber);
        binNumberInternalId = nlapiSubmitRecord(newBinRec);
    }
    return {
        internalId: binNumberInternalId,
        locationInternalId: tempLocation
    }
}

//endregion NEW FUNCTIONS

//region COMMON FUNCTIONS
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

/**
 * @param {string} msg message title
 * @param {string} str debug message
 */
var loggerJSON = function (msg, str) {
    var d = nlapiDateToString(new Date(), 'datetimetz');
    var sequenceNum = '';
    if (!isBlank(str)) {
        if (str.length > 4000) {
            var arrStr = str.match(/.{1,4000}/g);
            for (var i in arrStr) {
                sequenceNum = 'Datetime: ' + d + ' | ' + (parseInt(i) + 1) + ' of ' +
                    arrStr.length;
                nlapiLogExecution('DEBUG', msg + ' | ' + sequenceNum, arrStr[i]);
            }
        } else {
            sequenceNum = 'Datetime: ' + d;
            nlapiLogExecution('DEBUG', msg + ' | ' + sequenceNum, str);
        }
    }
};

function parseFloatOrZero(a) {
    a = parseFloat(a);
    return isNaN(a) ? 0 : a;
}

//need to look at chg acc and cost center as of 02122021, if they are provided and match transload rules, then use transload as sub
function getSubsidiary(subsidiary, custrecord_syncmspo_linechgaccount, custrecord_syncmspo_linechgcostcenter) {
  		var sub = "";
  		var targetSubsidiary = "";
  		if(custrecord_syncmspo_linechgaccount || custrecord_syncmspo_linechgcostcenter)
        {
          //11242021 - c/o mark, rod new rules
            /*
				1) LINE_CHG_ACCOUNT is 3987:  Set department to 0000, account to 3987, subsidiary to ANC Transloading.
                2)LINE_CHG_ACCOUNT is 3989:  Set department to 0000, account to 3989, subsidiary to ANC Transloading.
                3)LINE_CHG_COSTCENTER is 0910: Set department to 0910, subsidiary to ANC Transloading
                4)LINE_CHG_COSTCENTER is 0911: Set department to 0911, subsidiary to ANC Transloading
                5)LINE_CHG_COSTCENTER is 0915: Set department to 0915, subsidiary to ANC Transloading
            */
            if(custrecord_syncmspo_linechgaccount == '3987')
            {
              targetSubsidiary = '7'; //ANC Transload
              sub = targetSubsidiary;
            }
            else if(custrecord_syncmspo_linechgaccount == '3989')
            {
              targetSubsidiary = '7'; //ANC Transload
              sub = targetSubsidiary;
            }
          	else if(custrecord_syncmspo_linechgaccount == '0910')
            {
              targetSubsidiary = '7'; //ANC Transload
              sub = targetSubsidiary;
            }
          	else if(custrecord_syncmspo_linechgaccount == '0911')
            {
              targetSubsidiary = '7'; //ANC Transload
              sub = targetSubsidiary;
            }
          	//preet additionally requested 0912 to be under transload subsidiary - email on 11272021
          	else if(custrecord_syncmspo_linechgcostcenter == '0912')
            {
              targetSubsidiary = '7'; //ANC Transload
              sub = targetSubsidiary;
            }
          	else if(custrecord_syncmspo_linechgcostcenter == '0915')
            {
              targetSubsidiary = '7'; //ANC Transload
              sub = targetSubsidiary;
            }
          	else
            {
                sub = subsidiaryList[subsidiary];
    			sub = sub == undefined ? 1 : sub;
            }
          	
        }
  		else
		{
            sub = subsidiaryList[subsidiary];
    		sub = sub == undefined ? 1 : sub;
        }
  
    return sub;
}

//endregion COMMON FUNCTIONS

//region LIST
var statusList = {
    'NEW': '1',
    'PROCESSING': '2',
    'ERROR': '3',
    'COMPLETE': '4',
    'TO_REPROCESS': '5',
    'QUEUED': '6',
    'DUPLICATE': '7'
};

var subsidiaryList = {
    'Alberta Newsprint Company': '1',
    'ANC TIMBER LTD': '2',
    'ANC TRANSLOADING INC': '7',
    'ANC FUNDING CORPORATION': '4'
}
//These are MSIDs from MainSaver
var identicalSupplierIds = [
    [5088, 45001, 12044, 1258, 1022, 7049], // ABB Inc.
    [19008, 48863, 22056, 47397, 45882, 45932], // Valmet
    [490188, 49018], //Caterpillar
    [8013, 2042, 46436], //Applied Industrial
    [44978, 1020, 46276, 1252], //Albany
    [23053, 47843, 47789, 5025], //EMCO limited
    [5014, 47000], //Edmonton Valve
    [2030, 19010], //Pentair Valve
    [7901, 7008], //Guillevin Automatic
    [23003, 20006], //Wajax Industrial
    [50087, 48606], //Calmont Truck Rentals
    [48709, 16013] //Petro-Canada Max Fuels
];
//endregion LIST