/* @Scheduled Script on Manual Deployment
 *
 * Processes SyncMSInventoryTransaction Records
 *
 *	Name                                        Environment     Script ID                  Link
 *	ANC_SyncMSInventoryTransaction_NewRecord    SB              customscript498            https://system.netsuite.com/app/common/scripting/script.nl?id=
 *
 *   Notes: Rename to chg_costcenter to ID 'custrecord_syncmsinvtxn_chgcostcenter'
 *			2020.05.21 - added function isPartOfClothingBreakdown, added handling for charge account 1426, 1427, 1428 & 1429, they should be treated the same way as 1480, this was requested by Lisa - TC10ROD
 */

var context = nlapiGetContext();
var SyncMSID = parseInt(context.getSetting('Script', 'custscript_newsyncmsinvtxn'));
var script_id = context.getScriptId();
var CUSTOM_RECORD = 'customrecord_syncmsinvtrans';
var logExecPrefix = 'DAILY INVENTORY TXN ';
var FLD = {
    'SYNC_STATUS': 'custrecord_syncmsinvtxn_syncstatus',
    'ERROR_MESSAGE': 'custrecord_syncmsinvtxn_errmsg',
    'MS_ID': 'custrecord_syncmsinvtxn_msid',
    'NETSUITE_ID': 'custrecord_syncmsinvtxn_nsid',
    'SIXNEXPORT_REF_ID': 'custrecord_syncmsinvtxn_exportrefid',
    'XN_TYPE': 'custrecord_syncmsinvtxn_xntype',
    'XN_CODE': 'custrecord_syncmsinvtxn_xncode', // Will be used to filter to identify what kind of transaction the record is MT41 is a Item Receipt against a PO
    'CURR_DATE': 'custrecord_syncmsinvtxn_currdate',
    'CURR_TIME': 'custrecord_syncmsinvtxn_currtime',
    'XN_DATE': 'custrecord_syncmsinvtxn_xndate', // Item Receipt date
    'ISU_EMPL_ID': 'custrecord_syncmsinvtxn_isuemplid',
    'RCV_EMPL_ID': 'custrecord_syncmsinvtxn_rcvemplid',
    'MKEY': 'custrecord_syncmsinvtxn_mkey',
    'STOCKNO': 'custrecord_syncmsinvtxn_stockno', // Item record, used as the lookup key for the item's MSID
    'DESCRIPTION': 'custrecord_syncmsinvtxn_description',
    'PARTNO': 'custrecord_syncmsinvtxn_partno',
    'COM_CODE': 'custrecord_syncmsinvtxn_comcode',
    'STATUS': 'custrecord_syncmsinvtxn_status',
    'TTL_OH': 'custrecord_syncmsinvtxn_ttloh',
    'OH_QTY': 'custrecord_syncmsinvtxn_ohqty',
    'ISU_QTY': 'custrecord_syncmsinvtxn_isuqty', // Issuance
    'RCV_QTY': 'custrecord_syncmsinvtxn_rcvqty', // Received QTY against a Purchase Order
    'ORD_QTY': 'custrecord_syncmsinvtxn_ordqty',
    'RTN_QTY': 'custrecord_syncmsinvtxn_rtnqty',
    'BO_QTY': 'custrecord_syncmsinvtxn_boqty',
    'CNX_QTY': 'custrecord_syncmsinvtxn_cnxqty',
    'CNV_QTY': 'custrecord_syncmsinvtxn_cnvqty',
    'UOM': 'custrecord_syncmsinvtxn_uom',
    'PKGUOM': 'custrecord_syncmsinvtxn_pkguom',
    'ITEM_COST': 'custrecord_syncmsinvtxn_itemcost',
    'EXT_COST': 'custrecord_syncmsinvtxn_extcost',
    'AVG_COST': 'custrecord_syncmsinvtxn_avgcost',
    'STD_COST': 'custrecord_syncmsinvtxn_stdcost',
    'LAST_COST': 'custrecord_syncmsinvtxn_lastcost',
    'INV_QTY': 'custrecord_syncmsinvtxn_invqty',
    'INV_UOM': 'custrecord_syncmsinvtxn_invuom',
    'RAW_COST': 'custrecord_syncmsinvtxn_rawcost',
    'RCV_COST': 'custrecord_syncmsinvtxn_rcvcost',
    'RCV_DATE': 'custrecord_syncmsinvtxn_rcvdate',
    'RCV_TIME': 'custrecord_syncmsinvtxn_rcvtime',
    'STK_LOCN': 'custrecord_syncmsinvtxn_stklocn', // Receiving location
    'TO_STK_LOCN': 'custrecord_syncmsinvtxn_tostklocn',
    'CHG_COSTCENTER': 'custrecord_syncmsinvtxn_chgcostcenter',
    'CHG_ACCOUNT': 'custrecord_syncmsinvtxn_chgaccount',
    'CRD_COSTCENTER': 'custrecord_syncmsinvtxn_crdcostcenter',
    'CRD_ACCOUNT': 'custrecord_syncmsinvtxn_crdaccount',
    'PROJECTID': 'custrecord_syncmsinvtxn_projectid',
    'WO': 'custrecord_syncmsinvtxn_wo',
    'ASSETNO': 'custrecord_syncmsinvtxn_assetno',
    'PORQNNUM': 'custrecord_syncmsinvtxn_porqnnum',
    'PORQN_LINENO': 'custrecord_syncmsinvtxn_porqnlineno',
    'APPROVER': 'custrecord_syncmsinvtxn_approver',
    'SUPPLIER': 'custrecord_syncmsinvtxn_supplier',
    'PONO': 'custrecord_syncmsinvtxn_pono', // MainSaver Purchase Order Number
    'PO_LINENO': 'custrecord_syncmsinvtxn_polineno', // MainSaver Purchase Order Line Number
    'MTLRQNNUM': 'custrecord_syncmsinvtxn_mtlrqnnum',
    'MTLRQN_LINENO': 'custrecord_syncmsinvtxn_mtlrqnlineno',
    'COMMENTS': 'custrecord_syncmsinvtxn_comments',
    'GRN_NO': 'custrecord_syncmsinvtxn_grnno',
    'GRN_ITM_NO': 'custrecord_syncmsinvtxn_grnitmno',
    'POSTED': 'custrecord_syncmsinvtxn_posted',
    'CONSIGNED': 'custrecord_syncmsinvtxn_consigned',
    'RECEIVE_DOC_NOTE': 'custrecord_syncmsinvtxn_receivedocnote',
    'LIABILITY_ACC': 'custrecord_syncmsinvtxn_liabilityacc',
    'PKG_SLIP_NO': 'custrecord_syncmsinvtxn_pkgslipno',
    'MT_SPECIAL_IDNO': 'custrecord_syncmsinvtxn_mtspecialidno',
    'COST_CAT_ID': 'custrecord_syncmsinvtxn_costcatid',
    'MTCS_REF_ID': 'custrecord_syncmsinvtxn_mtcsrefid',
    'RETURN_FEE': 'custrecord_syncmsinvtxn_returnfee',
    'MTRTNSUP_REF_ID': 'custrecord_syncmsinvtxn_mtrtnsuprefid',
    'MTRTNSUP_LINENO': 'custrecord_syncmsinvtxn_mtrtnsuplineno',
    'MTNS_REF_ID': 'custrecord_syncmsinvtxn_mtnsrefid',
    'INV_ID': 'custrecord_syncmsinvtxn_invid',
    'INV_LINENO': 'custrecord_syncmsinvtxn_invlineno',
    'REV_INV': 'custrecord_syncmsinvtxn_revinv',
    'RET_SUPP': 'custrecord_syncmsinvtxn_retsupp',
    'LOGIN_ID': 'custrecord_syncmsinvtxn_loginid',
    'ACCOUNTING_PNAME': 'custrecord_syncmsinvtxn_accountingpname',
    'XN_SOURCE': 'custrecord_syncmsinvtxn_xnsource',
    'XN_REF_ID': 'custrecord_syncmsinvtxn_xnrefid', // Will be used to identify duplicate records
    'XN_QTY': 'custrecord_syncmsinvtxn_xnqty',
    'PLANT_NO': 'custrecord_syncmsinvtxn_plantno',
    'RETRIES': 'custrecord_syncmsinvtxn_retries',
    'INTERNALID': 'internalid',
    'NAME': 'name'
};

var IA_FLD = {
    'REFERENCE': 'tranid',
    'PURCHASE_ORDER': 'custbody_purchase_order',
    'ADJUSTMENT_ACCOUNT': 'account',
    'CUSTOMER': 'customer',
    'ESTIMATED_TOTAL_VALUE': 'estimatedtotalvalue',
    'DATE': 'trandate',
    'POSTING_PERIOD': 'postingperiod',
    'MEMO': 'memo',
    'SUBSIDIARY': 'subsidiary',
    'DEPARTMENT': 'department',
    'CLASS': 'class',
    'MS_ID': 'custbody_msid',
    'ITEM': 'item',
    'DESCRIPTION': 'description',
    'LOCATION': 'location',
    'UNITS': 'units',
    'QTY_ON_HAND': 'quantityonhand',
    'CURRENT_VALUE': 'currentvalue',
    'ADJUST_QTY_BY': 'adjustqtyby',
    'NEW_QUANTITY': 'newquantity',
    'UNITCOST': 'unitcost',
    'CREATED_FROM': 'custbody_createdfrom_txn',
    'XN_REF_ID': 'custcol_xnrefid',
    'WORKORDER': 'custcol_workorder',
    'SYNCMS_INVTTXN_LINK': 'custcol_syncmsinvtxn_line_link'
};

var IR_FLD = {
    'REFERENCE': 'tranid',
    'INTERNALID': 'internalid',
    'MS_ID': 'custbody_msid',
    'LOCATION': 'location',
    'CLASS': 'class',
    'DATE': 'trandate',
    'MEMO': 'memo',
    'XN_REF_ID': 'custcol_xnrefid',
    'CREATEDFROM': 'createdfrom',
    'PO_LINENO': 'custcol_syncmspo_lineno',
    'SYNCMS_INVTTXN_LINK': 'custcol_syncmsinvtxn_line_link',
    'ITEM_RECEIVE': 'itemreceive',
    'QUANTITY': 'quantity'
};

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

function scheduledSyncMSInventoryTransaction(params) {
    var SyncMSRecord = nlapiLoadRecord(CUSTOM_RECORD, SyncMSID);
    var MAINSAVERDATEFORMAT = 'YYYY/MM/DD';
    var RAWCUTOFFDATE = '2019/6/1'; // Change the cut-off date accordingly
    var CUTOFFDATE = moment(moment(RAWCUTOFFDATE).format(MAINSAVERDATEFORMAT));
    var PROCESS_ALL = true;
    var linesToProcess = [];
    var uniqueLinesToProcess = [];

    try {
        nlapiSubmitField(CUSTOM_RECORD, SyncMSID, FLD.SYNC_STATUS, statusList.PROCESSING);
        nlapiLogExecution('DEBUG', 'CALLSCHEDULEDSYNCMSINVTXN', 'SyncMSInventoryTransaction Processing Started on Record: ' + SyncMSID);

        //region Check if either XN_REF_ID or XN_DATE or PO_LINENO is blank because it will be used as search filters
        if (isBlank(SyncMSRecord.getFieldValue(FLD.XN_REF_ID)) ||
            isBlank(SyncMSRecord.getFieldValue(FLD.XN_DATE)) ||
            isBlank(SyncMSRecord.getFieldValue(FLD.XN_CODE))
        ) {
            var errorMessage = 'SKIPPED: Missing details either XN_REF_ID, XN_DATE, XN_CODE';
            var retries = parseFloatOrZero(SyncMSRecord.getFieldValue(FLD.RETRIES));
            nlapiLogExecution('ERROR', logExecPrefix, errorMessage + ': ' + SyncMSID);
            nlapiSubmitField(CUSTOM_RECORD, SyncMSID, [
                FLD.SYNC_STATUS,
                FLD.ERROR_MESSAGE,
                FLD.RETRIES
            ], [
                statusList.ERROR,
                errorMessage,
                --retries
            ]);
            findNextRecord();
            return;
        }
        //endregion

        var filters = [
            [FLD.SYNC_STATUS, 'anyof', [statusList.NEW, statusList.PROCESSING, statusList.ERROR, statusList.TO_REPROCESS]], 'AND',
            [FLD.RETRIES, 'greaterthan', 0], 'AND',
            [FLD.XN_REF_ID, 'is', SyncMSRecord.getFieldValue(FLD.XN_REF_ID)], 'AND',
            [FLD.XN_DATE, 'is', SyncMSRecord.getFieldValue(FLD.XN_DATE)], 'AND',
            [FLD.XN_CODE, 'is', SyncMSRecord.getFieldValue(FLD.XN_CODE)]
        ];

        if (!isBlank(SyncMSRecord.getFieldValue(FLD.PONO)))
            filters.push('AND', [FLD.PONO, 'is', SyncMSRecord.getFieldValue(FLD.PONO)]);
        else
            filters.push('AND', [FLD.PONO, 'isempty', '']);

        var columns = [];
        Object.keys(FLD).forEach(function (fld) {
            columns.push(new nlobjSearchColumn(FLD[fld]).setLabel(FLD[fld]));
        });

        var searchResults = nlapiSearchRecord(CUSTOM_RECORD, null, filters, columns) || [];

        //region Filter transactions prior to cut-off date
        searchResults.forEach(function (line) {
            var internalId = line.getValue(FLD.INTERNALID);
            var lineObj = mapSearchResultObj_ss1([line])[0];
            var rawDate = lineObj[FLD.XN_DATE];
            var dateInMainSaverFormat = moment(rawDate).format(MAINSAVERDATEFORMAT);
            lineObj[FLD.XN_DATE] = moment(dateInMainSaverFormat).format('L'); // System Locale format
            lineObj['date_injsxndate'] = moment(dateInMainSaverFormat);
            lineObj[FLD.INTERNALID] = parseFloatOrZero(lineObj[FLD.INTERNALID]);
            lineObj[FLD.XN_REF_ID] = parseFloatOrZero(lineObj[FLD.XN_REF_ID]); // This will convert the XN_REF_ID into integer that will be used in sorting
            lineObj[FLD.PO_LINENO] = parseFloatOrZero(lineObj[FLD.PO_LINENO]); // This will convert the PO_LINENO into integer that will be used in sorting
            lineObj[FLD.RETRIES] = parseFloatOrZero(lineObj[FLD.RETRIES]);
            if (PROCESS_ALL) {
                linesToProcess.push(lineObj);
                nlapiSubmitField(CUSTOM_RECORD, internalId, FLD.SYNC_STATUS, statusList.QUEUED);
            } else {
                if (CUTOFFDATE) {
                    if (lineObj['date_injsxndate'].isSameOrAfter(CUTOFFDATE)) {
                        linesToProcess.push(lineObj);
                        nlapiSubmitField(CUSTOM_RECORD, internalId, FLD.SYNC_STATUS, statusList.QUEUED);
                    } else {
                        nlapiSubmitField(CUSTOM_RECORD, internalId, [
                            FLD.SYNC_STATUS,
                            FLD.ERROR_MESSAGE,
                            FLD.RETRIES
                        ], [
                            statusList.COMPLETE,
                            'Transactions prior to ' + RAWCUTOFFDATE + ' are not being processed',
                            0
                        ]);
                    }
                } else {
                    linesToProcess.push(lineObj);
                    nlapiSubmitField(CUSTOM_RECORD, internalId, FLD.SYNC_STATUS, statusList.QUEUED);
                }
            }
        });
        // region Set "WHS", "NS-FINI" and "FI" to complete and retries 0 REX 07/08/2019
        var ignored = _.remove(linesToProcess, function (line) {
          	nlapiLogExecution("AUDIT", "rod line", JSON.stringify(line))
            var XN_CODE = new String(line[FLD.XN_CODE]).toString();
            var STK_LOCN = new String(line[FLD.STK_LOCN]).toString();
            return (XN_CODE == 'MT2' && (STK_LOCN.lastIndexOf("WHS") == 0 || STK_LOCN.lastIndexOf("NS-FINI") == 0 || STK_LOCN.lastIndexOf("FI") == 0));
        });
      
        nlapiLogExecution("AUDIT", "rod ignored", JSON.stringify(ignored))
      
        ignored.forEach(function (line) {
            var submittedRec = nlapiSubmitField(CUSTOM_RECORD, line[FLD.INTERNALID], [
                FLD.SYNC_STATUS,
                FLD.ERROR_MESSAGE,
                FLD.RETRIES
            ], [
                statusList.COMPLETE,
                'SKIPPED: Inventory adjustment for MT2, with STK_LOCN: ' + STK_LOCN,
                0
            ]);
          	
          	nlapiLogExecution("AUDIT", "rod submittedRec", submittedRec)
        });
        //endregion
        //endregion

        nlapiLogExecution('DEBUG', logExecPrefix + 'linesToProcess', JSON.stringify(linesToProcess));

        //region Sort dataset, latest is index 0
        linesToProcess = _.orderBy(linesToProcess, function (line) {
            return line[FLD.INTERNALID];
        }, 'desc');
        //endregion

        //remove the first element and push into new array
        var linesToProcess_shifted = linesToProcess.shift();
      	nlapiLogExecution("DEBUG", "linesToProcess_shifted", linesToProcess_shifted);
      	if(linesToProcess_shifted)
        {
            uniqueLinesToProcess.push(linesToProcess_shifted);
        }
      //12092021 - used to have no condition when to shift
        //uniqueLinesToProcess.push(linesToProcess.shift());

        //region Set Duplicate state in what remains of the array
        linesToProcess.forEach(function (line) {
            nlapiSubmitField(CUSTOM_RECORD, line[FLD.INTERNALID], [
                FLD.SYNC_STATUS,
                FLD.ERROR_MESSAGE,
                FLD.RETRIES
            ], [
                statusList.DUPLICATE,
                'SKIPPED: Duplicate line',
                0
            ]);
        });
        //endregion

        //this will always have one element
        nlapiLogExecution('DEBUG', logExecPrefix + 'uniqueLinesToProcess', JSON.stringify(uniqueLinesToProcess));
        uniqueLinesToProcess.forEach(function (line) {
          
          	//12142021PH TODO
            var XN_CODE = new String(line[FLD.XN_CODE]).toString();
            XN_CODE = XN_CODE.substring(0, 3).toUpperCase();
            nlapiLogExecution("DEBUG", "line[FLD.DESCRIPTION] is not blank -3", line[FLD.DESCRIPTION])
            if (XN_CODE == 'MT4') {  // Item Receipt
                //region Item Receipt Handler
                nlapiLogExecution("DEBUG", "line[FLD.DESCRIPTION] is not blank -2", line[FLD.DESCRIPTION])
                if (
                    line[FLD.RCV_QTY] != 0 &&
                    !isBlank(line[FLD.PO_LINENO]) &&
                    !isBlank(line[FLD.STK_LOCN]) &&
                    !isBlank(line[FLD.PONO])
                ) {
                    nlapiLogExecution("DEBUG", "line[FLD.DESCRIPTION] is not blank -1", line[FLD.DESCRIPTION])
                    //region Validation for serialized lines
					//TC10ROD 05212020 Lisa requested items under these chargeaccounts 1426, 1427, 1428, 1429 to be treated the same as 1480, thus this was patterned from 1480 below.
                    if (((line[FLD.CHG_ACCOUNT] == '1480' || line[FLD.CHG_ACCOUNT] == '1700') ||
						isPartOfClothingBreakdown(line[FLD.CHG_ACCOUNT])) &&
                        (!
                                ((line[FLD.CHG_ACCOUNT] == '1480' && line[FLD.SUPPLIER] == '48876') ||
								
								(isPartOfClothingBreakdown(line[FLD.CHG_ACCOUNT]) && line[FLD.SUPPLIER] == '48876') ||
								
                                    (line[FLD.CHG_ACCOUNT] == '1700' && line[FLD.SUPPLIER] == '50009'))
                        )
                    ) {
                        nlapiLogExecution("DEBUG", "line[FLD.DESCRIPTION] is not blank 0", line[FLD.DESCRIPTION])
                        if (isBlank(line[FLD.DESCRIPTION])) {
                            nlapiSubmitField(CUSTOM_RECORD, line[FLD.INTERNALID], [
                                FLD.SYNC_STATUS,
                                FLD.ERROR_MESSAGE,
                                FLD.RETRIES
                            ], [
                                statusList.ERROR,
                                'ERROR: Cannot find serial number, blank description',
                                --line[FLD.RETRIES]
                            ]);
                            return;
                        } else {
                          	nlapiLogExecution("DEBUG", "line[FLD.DESCRIPTION] is not blank 1", line[FLD.DESCRIPTION])
                            var serialNoObj = extractSerialNumber(line[FLD.CHG_ACCOUNT], line[FLD.DESCRIPTION], false);
                            if (isBlank(serialNoObj['serialNumber'])) {
                                nlapiSubmitField(CUSTOM_RECORD, line[FLD.INTERNALID], [
                                    FLD.SYNC_STATUS,
                                    FLD.ERROR_MESSAGE,
                                    FLD.RETRIES
                                ], [
                                    statusList.ERROR,
                                    'ERROR: Cannot find serial number, incorrect pattern',
                                    --line[FLD.RETRIES]
                                ]);
                                return;
                            } else
                                line['serialNoObj'] = serialNoObj;
                        }
                    }
                    //endregion
                    createItemReceipt(line);
                } else {
                    nlapiLogExecution("DEBUG", "line[FLD.DESCRIPTION] is not blank 2", line[FLD.DESCRIPTION])
                    if (isBlank(line[FLD.PONO]))
                        nlapiSubmitField(CUSTOM_RECORD, line[FLD.INTERNALID], [
                            FLD.SYNC_STATUS,
                            FLD.ERROR_MESSAGE,
                            FLD.RETRIES
                        ], [
                            statusList.ERROR,
                            'PONO is empty',
                            --line[FLD.RETRIES]
                        ]);
                    else
                        nlapiSubmitField(CUSTOM_RECORD, line[FLD.INTERNALID], [
                            FLD.SYNC_STATUS,
                            FLD.ERROR_MESSAGE,
                            FLD.RETRIES
                        ], [
                            statusList.ERROR,
                            'SKIPPED: Not an Item Receipt line, or missing details, please check the following: RCV_QTY, PO_LINENO, STK_LOCN',
                            --line[FLD.RETRIES]
                        ]);

                }
                //endregion
            } else if (XN_CODE == 'MT2' || XN_CODE == 'MT5') { // Inventory Adjustment, Issuance/Return
                //region Inventory Adjustment Handler
                if (
                    (line[FLD.RCV_QTY] != 0 || line[FLD.ISU_QTY] != 0) &&
                    !isBlank(line[FLD.STOCKNO]) &&
                    !isBlank(line[FLD.STK_LOCN]) &&
                    !isBlank(line[FLD.SUPPLIER]) &&
                    !isBlank(line[FLD.CHG_ACCOUNT])
                ) {
                    var errorsArr = validateImportantFields(line);
                    var errorsStr = logExecPrefix + '';
                    if (!isBlank(errorsArr)) {
                        for (var j in errorsArr) {
                            var temp = parseInt(1) + parseInt(j);
                            errorsStr += temp + '. ' + errorsArr[j] + '<br />';
                        }
                        nlapiSubmitField(CUSTOM_RECORD, line[FLD.INTERNALID], [
                            FLD.SYNC_STATUS,
                            FLD.ERROR_MESSAGE,
                            FLD.RETRIES
                        ], [
                            statusList.ERROR,
                            errorsStr,
                            --line[FLD.RETRIES]
                        ]);
                    } else if (line['validItem']['type'] == 'noninventoryitem')
                        nlapiSubmitField(CUSTOM_RECORD, line[FLD.INTERNALID], [
                            FLD.SYNC_STATUS,
                            FLD.ERROR_MESSAGE,
                            FLD.RETRIES
                        ], [
                            statusList.ERROR,
                            'Cannot create IA for noninventoryitem: ' + JSON.stringify(line['validItem']),
                            --line[FLD.RETRIES]
                        ]);
                    else
                        createInventoryAdjustment(line);
                } else {
                    nlapiSubmitField(CUSTOM_RECORD, line[FLD.INTERNALID], [
                        FLD.SYNC_STATUS,
                        FLD.ERROR_MESSAGE,
                        FLD.RETRIES
                    ], [
                        statusList.ERROR,
                        'SKIPPED: Not an Inventory Adjustment line, or missing details, please check the following, STOCKNO, STK_LOCN, SUPPLIER, CHG_ACCOUNT, RCV_QTY, ISU_QTY',
                        --line[FLD.RETRIES]
                    ]);
                }
                //endregion
            } else {
                //region Unknown XN_CODE handler
                nlapiSubmitField(CUSTOM_RECORD, line[FLD.INTERNALID], [
                    FLD.SYNC_STATUS,
                    FLD.ERROR_MESSAGE,
                    FLD.RETRIES
                ], [
                    statusList.COMPLETE,
                    'SKIPPED: XN_CODE is not an inventory transaction code (MT2X, MT4X, MT5X)',
                    0
                ]);
                //endregion
            }
        });
    } catch (e) {
        nlapiLogExecution('error', 'ScheduledSyncMSInventoryTransaction() has encountered an error.', errText(e));
        uniqueLinesToProcess.forEach(function (line) {
            nlapiSubmitField(CUSTOM_RECORD, line[FLD.INTERNALID], [
                FLD.SYNC_STATUS,
                FLD.ERROR_MESSAGE,
                FLD.RETRIES
            ], [
                statusList.ERROR,
                'Error Details: ' + errText(e),
                --line[FLD.RETRIES]
            ]);
        });
    }
    findNextRecord();
}

function findNextRecord() {
    // return;
    //Check for additional records to add to processing queue
    var filters = [
        [FLD.SYNC_STATUS, 'anyof', [statusList.NEW, statusList.ERROR, statusList.TO_REPROCESS]], 'AND',
        [FLD.RETRIES, 'greaterthan', 0]
    ];

    var columns = [];
    columns[0] = new nlobjSearchColumn('internalid');

    var searchResults = nlapiSearchRecord(CUSTOM_RECORD, null, filters, columns) || [];
    nlapiLogExecution('DEBUG', 'searchResults', JSON.stringify(searchResults));

    if (searchResults.length > 0) {
        var nextSyncMSID = searchResults[0].getValue('internalid');
        nlapiLogExecution('AUDIT', 'CALLSCHEDULEDSYNCMSINVTXN', 'Additional records to sync found. Queueing ' + nextSyncMSID);
        var newParams = {'custscript_newsyncmsinvtxn': nextSyncMSID};
        var ScheduleStatus = '';
        while (ScheduleStatus != 'QUEUED') {
            ScheduleStatus = nlapiScheduleScript(nlapiGetContext().getScriptId(), null, newParams); //Deployment is empty so that script selects first available deployment
            nlapiLogExecution('AUDIT', 'ScheduleStatus', ScheduleStatus);
        }
        if (ScheduleStatus == 'QUEUED') {
            nlapiSubmitField(CUSTOM_RECORD, nextSyncMSID, FLD.SYNC_STATUS, statusList.QUEUED);
        } //Else no available deployments - remaining records will be caught by periodic retry script
    } else {
        nlapiLogExecution('AUDIT', 'CALLSCHEDULEDSYNCMSINVTXN', 'No records to sync found.');
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

var createItemReceipt = function createItemReceipt(line) {
    var poObj = getPurchaseOrder(line);
    if (poObj == -1) {
        nlapiSubmitField(CUSTOM_RECORD, line[FLD.INTERNALID], [
            FLD.SYNC_STATUS,
            FLD.ERROR_MESSAGE,
            FLD.RETRIES
        ], [
            statusList.COMPLETE,
            'SKIPPED: Standard Purchase Order record not found for: ' + line[FLD.PONO],
            0
        ]);
        return;
    }
    var poInternalId = poObj.internalId;
    var poDocumentStatus = nlapiLookupField('purchaseorder', poInternalId, 'statusref');
    var irInternalId = getItemReceipt(line);
    var irRec = null;
    var SUBLIST_ID = 'item';
    var isCreate = true;
    var submit = false;
    var poRecLink = nlapiResolveURL('RECORD', 'purchaseorder', poInternalId);
    poRecLink = '<a href="' + poRecLink + '">' + poInternalId + '</a>';

    //region Check if there is existing IR, if true load record, else
    //check if PO can still be received, if true transform record
    if (irInternalId == -1) {
        // check first if PO can still be transformed
        if (['partiallyReceived',
            'pendingBillPartReceived',
            'pendingReceipt'].indexOf(poDocumentStatus) >= 0) {
          	nlapiLogExecution("DEBUG", "TC10ROD 09142020 poInternalId", poInternalId);
          
          	nlapiLogExecution("DEBUG", "transforing to new IR REC because irInternalId = " + irInternalId, "poInternalId : " + poInternalId)
            irRec = nlapiTransformRecord('purchaseorder', poInternalId, 'itemreceipt');
        } else {
            nlapiSubmitField(CUSTOM_RECORD, line[FLD.INTERNALID], [
                FLD.SYNC_STATUS,
                FLD.ERROR_MESSAGE,
                FLD.RETRIES
            ], [
                statusList.COMPLETE,
                'SKIPPED: Either Standard Purchase Order is already Pending Billing, Fully Billed or Closed',
                0
            ]);
            return;
        }
    } else {
      	nlapiLogExecution("DEBUG", "loading IR REC because irInternalId = ", irInternalId)
        irRec = nlapiLoadRecord('itemreceipt', irInternalId);
        isCreate = false;
    }
    //endregion


    irRec.setFieldValue(IR_FLD.DATE, line[FLD.XN_DATE]);
    var lineCount = irRec.getLineItemCount(SUBLIST_ID);
    for (var h = 1; h <= lineCount; h++)
        irRec.setLineItemValue(SUBLIST_ID, 'itemreceive', h, 'F');

    var irLineIndex = irRec.findLineItemValue(SUBLIST_ID, IR_FLD.PO_LINENO, line[FLD.PO_LINENO].toString());

  	
    if (irLineIndex > 0) {
        var binNumberDetails = getBinDetails(line[FLD.STK_LOCN], poObj.subsidiary);
        nlapiLogExecution('DEBUG', 'binNumberDetails', JSON.stringify(binNumberDetails));
        nlapiLogExecution('DEBUG', 'TC10ROD 09142020 irLineIndex', irLineIndex);
        irRec.selectLineItem(SUBLIST_ID, irLineIndex);
        irRec.removeCurrentLineItemSubrecord(SUBLIST_ID, 'inventorydetail');

        var isBinItem = irRec.getCurrentLineItemValue(SUBLIST_ID, 'binitem');
        var isSerial = irRec.getCurrentLineItemValue(SUBLIST_ID, 'isserial');

        irRec.setCurrentLineItemValue(SUBLIST_ID, IR_FLD.ITEM_RECEIVE, 'T');
        irRec.setCurrentLineItemValue(SUBLIST_ID, IR_FLD.LOCATION, binNumberDetails['locationInternalId']);
      
      	//TC10ROD typecasted to number due to error, removed typecast as error persists
        irRec.setCurrentLineItemValue(SUBLIST_ID, IR_FLD.QUANTITY, line[FLD.RCV_QTY]);
        irRec.setCurrentLineItemValue(SUBLIST_ID, IR_FLD.SYNCMS_INVTTXN_LINK, line[FLD.INTERNALID]);
        irRec.setCurrentLineItemValue(SUBLIST_ID, IR_FLD.XN_REF_ID, line[FLD.XN_REF_ID]);

      	nlapiLogExecution("DEBUG", "line", JSON.stringify(line));
      	nlapiLogExecution("DEBUG", "line['serialNoObj']", JSON.stringify(line['serialNoObj']));
      
        if (isBinItem == 'T' || isSerial == 'T') {
            var invtDetailSubrecord = irRec.createCurrentLineItemSubrecord(SUBLIST_ID, 'inventorydetail');
          	//sometimes a line is already populated, selecting new line will cause overrage, solution always start on the first line
          	var invtDetailSubrecord_lineCount = invtDetailSubrecord.getLineItemCount('inventoryassignment');
          	nlapiLogExecution("DEBUG", "invtDetailSubrecord_lineCount", invtDetailSubrecord_lineCount)
          	//just remove all lines and clear everytthing to make sure ur on the first line
          	for(var invdet_ctr = invtDetailSubrecord_lineCount ; invdet_ctr > 0; invdet_ctr--)
              {
				  nlapiLogExecution("DEBUG", "03162021 invtDetailSubrecord_lineCount", invtDetailSubrecord_lineCount)
				  nlapiLogExecution("DEBUG", "03162021 invdet_ctr", invdet_ctr)
                invtDetailSubrecord.removeLineItem("inventoryassignment", 1)
              }
          
            invtDetailSubrecord.selectNewLineItem("inventoryassignment")
          	//invtDetailSubrecord.selectLineItem('inventoryassignment', 1);
          	//update: 72570 throwing error if selectLineItem is called above, make this a special case for nonSerialized.
          	//code can be refactored and simplified, for now stick with miniman modification of code as this has been working properly for a considerable duration already
          	/*just remove all lines and clear everytthing to make sure ur on the first line
          	if(isSerial != 'T')
          	{
          	  invtDetailSubrecord.selectLineItem('inventoryassignment', 1);
          	  //10232020PH - TC10ROD for error, please enter at least one line, this error is misleading
              //the issue lies on selection of line items
              //background: sometimes a line is autosuggested as well as qty
              //calling selectNewLineItem and setting the bin and qty will result in overage of invdetail quantity vs lineqty
              //hence, add a checking for this, you can do it by simple invdetail linecount, but for now let this be(check invdeetail currline's qty) as it works well
              //update: found from SyncMSInventoryTransaction 72570: for serial items it has a default quantity, so this will not work, stick with the lineCount checking now
              //update: 72570 throwing error if selectLineItem is called above, make this a special case for nonSerialized.
              var invtDetailSubrecord_qty = invtDetailSubrecord.getCurrentLineItemValue('inventoryassignment', 'quantity');
              nlapiLogExecution("DEBUG", "invtDetailSubrecord_qty", invtDetailSubrecord_qty)
              
              if(invtDetailSubrecord_lineCount > 0)
              {
                  invtDetailSubrecord.selectNewLineItem('inventoryassignment');
              }
          	}
          	else
          	{
          	  invtDetailSubrecord.selectNewLineItem('inventoryassignment');
          	}
            /*
            
            //"issueinventorynumber"
            //TC10ROD 05212020 Lisa requested items under these chargeaccounts 1426, 1427, 1428, 1429 to be treated the same as 1480, thus this was patterned from 1480 below.
            /*if ((line[FLD.CHG_ACCOUNT] == '1480' || line[FLD.CHG_ACCOUNT] == 1700)  ||
                    isPartOfClothingBreakdown(line[FLD.CHG_ACCOUNT]))*/ //original. but condition to check sserialnoobj is added because it was causing error 09172020PH - TC10ROD
            if (((line[FLD.CHG_ACCOUNT] == '1480' || line[FLD.CHG_ACCOUNT] == 1700)  ||
			isPartOfClothingBreakdown(line[FLD.CHG_ACCOUNT])) && line['serialNoObj'])
            {
                nlapiLogExecution("DEBUG", "TC10ROD 10222020 set receiptinventorynumber", line['serialNoObj']['serialNumber'])
                invtDetailSubrecord.setCurrentLineItemValue('inventoryassignment', 'receiptinventorynumber', line['serialNoObj']['serialNumber']);
            }
            else
            {
                invtDetailSubrecord.setCurrentLineItemValue('inventoryassignment', 'binnumber', binNumberDetails['internalId']);

                nlapiLogExecution("DEBUG", "TC10ROD 09142020 binNumberDetails['internalId']", binNumberDetails['internalId'])
                nlapiLogExecution("DEBUG", "TC10ROD 09142020 line[FLD.RCV_QTY]", line[FLD.RCV_QTY])
            }
          
          //TC10ROD typecasted to number due to error, removed typecast as error persists
            invtDetailSubrecord.setCurrentLineItemValue('inventoryassignment', IR_FLD.QUANTITY, line[FLD.RCV_QTY]);
          
          	var logs_invDetailQty = invtDetailSubrecord.getCurrentLineItemValue('inventoryassignment', IR_FLD.QUANTITY);
          
          	nlapiLogExecution("DEBUG", "TC10ROD 09142020 logs_invDetailQty", logs_invDetailQty)
          
            invtDetailSubrecord.commitLineItem('inventoryassignment');
            invtDetailSubrecord.commit();
        }
        irRec.commitLineItem(SUBLIST_ID);
        submit = true;
    } else {
        nlapiSubmitField(CUSTOM_RECORD, line[FLD.INTERNALID], [
            FLD.SYNC_STATUS,
            FLD.ERROR_MESSAGE,
            FLD.RETRIES
        ], [
            statusList.ERROR,
            'SKIPPED: Line not found in Standard Purchase order record',
            --line[FLD.RETRIES]
        ]);
    }

    if (submit) {
        try {
            
          //TC10ROD 10202020
            
            var irRec_lineCount = irRec.getLineItemCount('item');
            nlapiLogExecution("DEBUG", "stringified irRec", JSON.stringify(irRec));
            nlapiLogExecution("DEBUG", "irRec_lineCount", irRec_lineCount)
            for(var a = 0 ; a < irRec_lineCount; a++)
            {
                irRec.selectLineItem('item', a+1)
                var irRec_currentLine_itemreceive = irRec.getCurrentLineItemValue('item', 'itemreceive');
                nlapiLogExecution("DEBUG", "irRec_currentLine_itemreceive", irRec_currentLine_itemreceive)
                var irRec_currentLine_subrecord = irRec.viewCurrentLineItemSubrecord('item', 'inventorydetail');
                nlapiLogExecution("DEBUG", "irRec_currentLine_subrecordv", JSON.stringify(irRec_currentLine_subrecord))
            }
            
            
            irInternalId = nlapiSubmitRecord(irRec);
            var errorString = 'Item Receipt ' + (isCreate ? 'Created' : 'Updated') + ' for PO Internal Id: ' + poRecLink + ', IR Internal Id: ' + irInternalId + ', SyncMSInventoryTransaction: ' + line[FLD.INTERNALID];
            nlapiLogExecution('AUDIT', logExecPrefix, errorString);
            nlapiSubmitField(CUSTOM_RECORD, line[FLD.INTERNALID], [
                FLD.NETSUITE_ID,
                FLD.SYNC_STATUS,
                FLD.ERROR_MESSAGE,
                FLD.RETRIES
            ], [
                irInternalId,
                statusList.COMPLETE,
                errorString,
                0
            ]);
        } catch (e) {
            nlapiSubmitField(CUSTOM_RECORD, line[FLD.INTERNALID], [
                FLD.SYNC_STATUS,
                FLD.ERROR_MESSAGE,
                FLD.RETRIES
            ], [
                statusList.ERROR,
                'Error Details: ' + errText(e),
                --line[FLD.RETRIES]
            ]);
        }
    }
};

var createInventoryAdjustment = function createInventoryAdjustment(line) {
    var iaRec = null;
    var iaInternalId = getInventoryAdjustment(line);
    var poObj = getPurchaseOrder(line);
    var poInternalId = -1;
    var isCreate = true;
    var submit = true;
    var SUBLIST_ID = 'inventory';
    var adjustQty = 0;
    var unitCost = 0;

    if(poObj != -1)
        poInternalId = poObj.internalId;

    if (iaInternalId == -1) {
        iaRec = nlapiCreateRecord('inventoryadjustment');
        iaRec.setFieldValue(IA_FLD.PURCHASE_ORDER, line[FLD.PONO]);
        poInternalId != -1 ? iaRec.setFieldValue(IA_FLD.CREATED_FROM, poInternalId) : '';
    } else {
        iaRec = nlapiLoadRecord('inventoryadjustment', iaInternalId);
        isCreate = false;
    }

    iaRec.setFieldValue('customform', 10);
    iaRec.setFieldValue(IA_FLD.DATE, line[FLD.XN_DATE]);
    iaRec.setFieldValue(IA_FLD.MEMO, 'Daily Inventory Adjustment');
    iaRec.setFieldValue(IA_FLD.SUBSIDIARY, (line['validItem']['subsidiary'] ? line['validItem']['subsidiary'] : ''));
    iaRec.setFieldValue(IA_FLD.ADJUSTMENT_ACCOUNT, line['validItem']['expenseAccount']);
    iaRec.setFieldValue(IA_FLD.MS_ID, line[FLD.MS_ID]);
    if (!isBlank(line[FLD.CHG_COSTCENTER])) {
        var _departmentId = getDepartmentId(line[FLD.CHG_COSTCENTER]);
        if (!isBlank(_departmentId))
            iaRec.setFieldValue(IA_FLD.DEPARTMENT, _departmentId);
    }

    var lineCount = iaRec.getLineItemCount(SUBLIST_ID);

    if (lineCount)
        for (var x = lineCount; x > 0; x--)
            iaRec.removeLineItem(SUBLIST_ID, x);

    var XN_CODE = new String(line[FLD.XN_CODE]).toString();
    XN_CODE = XN_CODE.substring(0, 3).toUpperCase();
    if (XN_CODE == 'MT2')
        adjustQty = line[FLD.ISU_QTY] * -1;
    else if (XN_CODE == 'MT5') {
        adjustQty = line[FLD.RCV_QTY];
        unitCost = adjustQty * parseFloatOrZero(line[FLD.AVG_COST]);
    }

    if (adjustQty != 0) {
        iaRec.selectNewLineItem(SUBLIST_ID);
        iaRec.setCurrentLineItemValue(SUBLIST_ID, IA_FLD.ITEM, line['validItem']['internalId']);
        iaRec.setCurrentLineItemValue(SUBLIST_ID, IA_FLD.LOCATION, line['locationInternalId']);
        iaRec.setCurrentLineItemValue(SUBLIST_ID, IA_FLD.MEMO, line[FLD.DESCRIPTION]);
        iaRec.setCurrentLineItemValue(SUBLIST_ID, IA_FLD.ADJUST_QTY_BY, adjustQty);
        iaRec.setCurrentLineItemValue(SUBLIST_ID, IA_FLD.UNITCOST, unitCost);
        iaRec.setCurrentLineItemValue(SUBLIST_ID, IA_FLD.SYNCMS_INVTTXN_LINK, line[FLD.INTERNALID]);
        iaRec.setCurrentLineItemValue(SUBLIST_ID, IA_FLD.WORKORDER, line[FLD.WO]);
        iaRec.setCurrentLineItemValue(SUBLIST_ID, IA_FLD.XN_REF_ID, line[FLD.XN_REF_ID]);
        if (!isBlank(line[FLD.CRD_COSTCENTER])) {
            var _departmentId = getDepartmentId(line[FLD.CRD_COSTCENTER]);
            if (!isBlank(_departmentId))
                iaRec.setCurrentLineItemValue(SUBLIST_ID, IA_FLD.DEPARTMENT, _departmentId);
        }

        if (line['validItem']['useBins'] == 'T' || line['validItem']['useBins'] == true) {
            var invtDetailSubrecord = iaRec.createCurrentLineItemSubrecord(SUBLIST_ID, 'inventorydetail');
            invtDetailSubrecord.selectNewLineItem('inventoryassignment');
            invtDetailSubrecord.setCurrentLineItemValue('inventoryassignment', 'binnumber', line['binNumberInternalId']);
            invtDetailSubrecord.setCurrentLineItemValue('inventoryassignment', 'quantity', adjustQty);
            invtDetailSubrecord.commitLineItem('inventoryassignment');
            invtDetailSubrecord.commit();
        }
        iaRec.commitLineItem(SUBLIST_ID);
    } else
        submit = false;

    loggerJSON(
        'ITEM FIELDS',
        'Adjust Qty: ' + adjustQty + ' | Memo: ' + line[FLD.DESCRIPTION]
    );

    if (submit) {
        try {
            var iaRecId = nlapiSubmitRecord(iaRec);
            var errorString = 'Inventory Adjustment ' + (isCreate ? 'Created' : 'Updated') + ' for PO Internal Id: ' + poInternalId +
                ', IA Internal Id: ' + iaRecId + ', SyncMSInventoryTransaction: ' + line[FLD.INTERNALID];
            nlapiLogExecution('AUDIT', logExecPrefix, errorString);
            nlapiSubmitField(CUSTOM_RECORD, line[FLD.INTERNALID], [
                FLD.NETSUITE_ID,
                FLD.SYNC_STATUS,
                FLD.ERROR_MESSAGE,
                FLD.RETRIES
            ], [
                iaRecId,
                statusList.COMPLETE,
                errorString,
                0
            ]);
        } catch (e) {
            nlapiSubmitField(CUSTOM_RECORD, line[FLD.INTERNALID], [
                FLD.SYNC_STATUS,
                FLD.ERROR_MESSAGE,
                FLD.RETRIES
            ], [
                statusList.ERROR,
                'Error Details: ' + errText(e),
                --line[FLD.RETRIES]
            ]);
        }
    } else {
        nlapiSubmitField(CUSTOM_RECORD, line[FLD.INTERNALID], [
            FLD.SYNC_STATUS,
            FLD.ERROR_MESSAGE,
            FLD.RETRIES
        ], [
            statusList.ERROR,
            'Adjust Qty is 0/Invalid XN_CODE',
            --line[FLD.RETRIES]
        ]);
    }
};
//region NEW FUNCTIONS

var getItemReceipt = function getItemReceipt(line) {
    var irInternalId = -1;
    var irSearch = nlapiSearchRecord(
        'itemreceipt',
        null,
        [
            [IR_FLD.MS_ID, 'is', line[FLD.PONO]], 'AND',
            [IR_FLD.PO_LINENO, 'equalto', line[FLD.PO_LINENO]], 'AND',
            [IR_FLD.XN_REF_ID, 'equalto', line[FLD.XN_REF_ID]]
        ]
    ) || [];
    if (irSearch.length > 0)
        irInternalId = irSearch[0].getId();

    return irInternalId;
};

const getInventoryAdjustment = function getInventoryAdjustment(line) {
    var iaInternalId = -1;
    var iaSearch = nlapiSearchRecord(
        'inventoryadjustment',
        null,
        [
            [IA_FLD.XN_REF_ID, 'equalto', line[FLD.XN_REF_ID]]
        ]
    ) || [];
    if (iaSearch.length > 0)
        iaInternalId = iaSearch[0].getId();

    return iaInternalId;
};

var getPurchaseOrder = function getPurchaseOrder(line) {
    var poSearch = nlapiSearchRecord(
        'purchaseorder',
        null,
        [
            ['custbody_purchase_order', 'is', line[FLD.PONO]], 'AND',
            ['mainline', 'is', true]
        ],
        [
            new nlobjSearchColumn('status'),
            new nlobjSearchColumn('subsidiary')
        ]
    ) || [];
    if (poSearch.length > 0)
        return {
            internalId: poSearch[0].getId(),
            subsidiary: poSearch[0].getValue('subsidiary')
        }
    else
        return -1;
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
        departmentId = 2;
    return departmentId;
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
    var b = parseFloat(a);
    return isNaN(b) ? 0 : b;
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
function validateItem(stockLocn, stockNo, chargeAcct, supplierId, throwError) {
    var type = '';
    var itemColumns;
    var item = '';
    var filters;

    itemColumns = [
        new nlobjSearchColumn('internalid'),
        new nlobjSearchColumn('usebins'),
        new nlobjSearchColumn('isfulfillable'),
        new nlobjSearchColumn('subsidiarynohierarchy'),
        new nlobjSearchColumn('assetaccount'),
        new nlobjSearchColumn('intercoexpenseaccount'),
        new nlobjSearchColumn('expenseaccount'),
        new nlobjSearchColumn('incomeaccount'),
        new nlobjSearchColumn('intercoincomeaccount'),
        new nlobjSearchColumn('locationnohierarchy')
    ];

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
	//TC10ROD 05212020 Lisa requested items under these chargeaccounts 1426, 1427, 1428, 1429 to be treated the same as 1480, thus this was patterned from 1480 below.
	else if (isPartOfClothingBreakdown(chargeAcct)) {
        if (isPartOfClothingBreakdown(chargeAcct) && supplierId == '50009') {
            type = 'inventoryitem';
            item = supplierId + '--' + chargeAcct
        } else {
            type = 'serializedinventoryitem';
            item = chargeAcct;
        }
    } else {
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
        } else if (isBlank(stockLocn)) {
            chargeAcct = chargeAcct == '9990' ? '9900' : chargeAcct;
            type = 'noninventoryitem';
            item = 'NS-' + chargeAcct;
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

    if (throwError) {
        if (itemResults) {
            return {
                internalId: itemResults[0].getValue('internalid'),
                useBins: itemResults[0].getValue('usebins'),
                type: type,
                isFulfillable: itemResults[0].getValue('isfulfillable'),
                subsidiary: itemResults[0].getValue('subsidiarynohierarchy'),
                assetAccount: itemResults[0].getValue('assetaccount'),
                expenseAccount: itemResults[0].getValue('expenseaccount'),
                intercoExpenseAccount: itemResults[0].getValue('intercoexpenseaccount'),
                incomeAccount: itemResults[0].getValue('incomeaccount'),
                intercoIncomeAccount: itemResults[0].getValue('intercoincomeaccount'),
                location: itemResults[0].getValue('location')
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

function validateImportantFields(line) {
    var recordLink = nlapiResolveURL('record', CUSTOM_RECORD, line[FLD.INTERNALID]);
    var errorsArr = [];
    recordLink = '<a href="' + recordLink + '">' + line[FLD.NAME] + '</a>';

    var validItem = validateItem(
        line[FLD.STK_LOCN],
        line[FLD.STOCKNO],
        line[FLD.CHG_ACCOUNT],
        line[FLD.SUPPLIER],
        true
    );
    nlapiLogExecution('DEBUG', 'validItem', JSON.stringify(validItem));
    if (isBlank(validItem)) {
        var itemErrorMsg = 'Unable to find matching Item: ' + line[FLD.STOCKNO];
        errorsArr.push(itemErrorMsg + '. Please correct record: ' + recordLink);
    } else {
        if (validItem['useBins'] == 'T' || validItem['useBins'] == true) {
            if (!isBlank(line[FLD.STK_LOCN])) {
                var binNumber = line[FLD.STK_LOCN];
                if (binNumber.length) {
                    var binNumberDetails = getBinDetails(line[FLD.STK_LOCN], validItem['subsidiary']);
                    nlapiLogExecution('DEBUG', 'binNumber', JSON.stringify(binNumberDetails));
                    line['binNumberInternalId'] = binNumberDetails['internalId'];
                    line['locationInternalId'] = binNumberDetails['locationInternalId'];
                    nlapiLogExecution('DEBUG', 'validItem', JSON.stringify(validItem));
                } else {
                    errorsArr.push('Invalid Bin number. Please correct record: ' + recordLink);
                }
            } else {
                errorsArr.push('STK_LOCN is blank. Please correct record: ' + recordLink);
            }
        }
        line['validItem'] = validItem;
    }
    return errorsArr;
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
    };
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
        ];
    }
	//TC10ROD 05212020 Lisa requested items under these chargeaccounts 1426, 1427, 1428, 1429 to be treated the same as 1480, thus this was patterned from 1480 below.
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
    } else if (chargeAcct == '1700') { //1700
        patterns = [
            //'RY',
            //'SY',
            //'JC',
            'ring number', 'ringnumber',
            'Ring #', 'Ring#',
            'Ring No', 'Ringno',
            'Ring Num', 'Ringnum'
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

function getBinDetails(binNumber, subsidiary) {
    var binNumberInternalId = -1;
    var tempLocation = -1;
    var binSearchFilters = [];

  	nlapiLogExecution("debug", "subsidiary", subsidiary);
  
    tempLocation = getLocation(binNumber, subsidiary);

    binSearchFilters.push(new nlobjSearchFilter('location', null, 'is', tempLocation));
    binSearchFilters.push(new nlobjSearchFilter('binnumber', null, 'is', binNumber));

    var binSearchResults = nlapiSearchRecord('bin', null, binSearchFilters) || [];

    if (binSearchResults.length > 0) {
        binNumberInternalId = binSearchResults[0].getId();
    } else {
        var newBinRec = nlapiCreateRecord('bin');
      	if(tempLocation && tempLocation != -1)
        {
            newBinRec.setFieldValue('location', tempLocation); //12092021
        }
        
        newBinRec.setFieldValue('binnumber', binNumber);
        binNumberInternalId = nlapiSubmitRecord(newBinRec);
    }
    return {
        internalId: binNumberInternalId,
        locationInternalId: tempLocation
    }
}

function getLocation(binNumber, subsidiary) {
    var tempLocation = '-1';
    var _sub = subsidiary;
  
  	nlapiLogExecution("DEBUG", "getLocation _sub", _sub)
  
    if (_sub == 1) { //ANC
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
    if (_sub == 2) { // ANC Timber
        //TODO logic for timber locations
        tempLocation = '227';
    }
  	
    if (_sub == 7) {
      tempLocation = '6'; //ANC Transloading - Millsite as of 12142021PH preet said it should be millsite for transload
    }

    // nlapiLogExecution('DEBUG', 'Check output of getLocation()', 'Input binNumber: ' + binNumber + ' Output tempLocation: ' + tempLocation);
    return tempLocation;
}

function getColIndex(cols, colInternalId) {
    return cols.map(function (e) {
        var colLabel = e.label;
        colLabel = colLabel.substring(colLabel.lastIndexOf(' ') + 1);
        return colLabel;
    }).indexOf(colInternalId);
}

function mapSearchResultObj_ss1(searchResults) {
    if (searchResults.length < 1)
        return [];
    var columnsArray = searchResults[0].getAllColumns().map(function (col) { //array of column 'internalid' ['custpage_something']
        var colLabel = col.label;
        colLabel = colLabel.substring(colLabel.lastIndexOf(' ') + 1);
        return colLabel;
    });
    var columnsTypeArray = searchResults[0].getAllColumns().map(function (col) {
        return col.type
    });
    return searchResults.map(function (res) {
        var obj = {};
        columnsArray.forEach(function (x) {
            var i = getColIndex(searchResults[0].getAllColumns(), x);
            obj[x] = '';
            if (i > -1) {
                var val = res.getValue(searchResults[0].getAllColumns()[i]);

                if (columnsTypeArray[i] == 'currency')
                    val = nlapiFormatCurrency(val).toString();

                obj[x] = val;
            }
        });
        return obj;
    });
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
    'ALBERTA_NEWSPRINT_COMPANY': '1'
};
//endregion LIST