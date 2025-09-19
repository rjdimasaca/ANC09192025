/*
* @Scheduled Script on Manual Deployment
*
* Processing Monthly Inventory Recon, to convserve Governace limit, records will not
* go Processing but straight from the following
* New to Duplicate
* New to Error
* New to Complete
*/
var context = nlapiGetContext();
var env = context.getEnvironment();
var scriptId = context.getScriptId();

var CUSTOM_RECORD = 'customrecord_syncmsinventory';
var STND_RECORD = 'inventoryadjustment';
var FLD = {
    ID: 'internalid',
    NAME: 'name',
    DATE_CREATED: 'created',
    SYNC_STATUS: 'custrecord_syncmsinventory_syncstatus',
    ERROR_MSG: 'custrecord_syncmsinventory_errmsg',
    RETRIES: 'custrecord_syncmsinventory_retries',
    MS_ID: 'custrecord_syncmsinventory_msid',
    NS_ID: 'custrecord_syncmsinventory_nsid',
    SIMTINTF_REF_ID: 'custrecord_syncmsinvrec_simtintfrefid',
    STOCKNO: 'custrecord_syncmsinvrec_stockno',
    TTL_OH: 'custrecord_syncmsinvrec_ttloh',
    STK_LOCN: 'custrecord_syncmsinvrec_stklocn',
    MSTR_LOCN_CD: 'custrecord_syncmsinvrec_mstrlocncd',
    AREA_LOCN_CD: 'custrecord_syncmsinvrec_arealocncd',
    BIN_ID: 'custrecord_syncmsinvrec_binid',
    LOCN_OH_QTY: 'custrecord_syncmsinvrec_locnohqty',
};

var statusList = {
    'NEW': '1',
    'PROCESSING': '2',
    'ERROR': '3',
    'COMPLETE': '4',
    'TO_REPROCESS': '5',
    'QUEUED': '6',
    'DUPLICATE': '7'
};

function reconMonthlyInventory(params) {
    var errorsArr = [];
    var errorStr = [];
    var MAINSAVERDATEFORMAT = 'YYYY/MM/DD';
    var RAWCUTOFFDATE = '2019/1/1/';
    var PROCESS_ALL = false;
    var iaLinesToProcess = [];
    var uniqueIaLinesToProcess = [];
    var duplicateIaLinesToProcess = [];
    var uniqueIaLinesToProcessMap = [];
    var totalOnHandQuantityMap = [];
    var iaLinesToMarkComplete = [];
    var skippedItems = [];

    try {
        nlapiLogExecution('AUDIT', 'CALLSCHEDULEDSYNCMSInventory', 'START');

        var filters = [
            new nlobjSearchFilter(FLD.SYNC_STATUS, null, 'anyof', [statusList.NEW, statusList.ERROR, statusList.TO_REPROCESS]),
            new nlobjSearchFilter(FLD.RETRIES, null, 'greaterthan', 0)
        ];
        var columns = [];

        Object.keys(FLD).forEach(function (fld) {
            if (fld == 'MS_ID') {
                columns.push(new nlobjSearchColumn('formulanumeric').setFormula('TO_NUMBER({' + FLD[fld] + '})').setSort('ASC').setLabel(fld + '_2'));
                columns.push(new nlobjSearchColumn(FLD[fld]).setLabel(fld));
            } else
                columns.push(new nlobjSearchColumn(FLD[fld]).setLabel(fld));
        });
        columns.push(new nlobjSearchColumn('formulatext').setLabel('BIN_NUMBER').setFormula("CONCAT({custrecord_syncmsinvrec_mstrlocncd}, {custrecord_syncmsinvrec_arealocncd})"));

        var searchObj = nlapiCreateSearch(CUSTOM_RECORD, filters, columns);
        var searchResults = searchObj.runSearch().getResults(0, 100) || [];
        _.reverse(searchResults); //necessary because the MSIDs start from highest to lowest even when sorted
        nlapiLogExecution('DEBUG', 'searchResults', searchResults.length);
        if (searchResults.length == 0) {
            nlapiLogExecution('AUDIT', 'EXIT', 'NO RECORDS FOUND TO SYNC');
            return; //premature exit
        }
        /**
         * START Duplicate detection,
         */
        iaLinesToProcess = _.orderBy(searchResults, function (line) {
            return line.getValue(FLD.MS_ID);
        });
        // iaLinesToProcess = _.clone(searchResults);
        nlapiLogExecution('DEBUG', 'iaLinesToProcess', iaLinesToProcess.length);
        uniqueIaLinesToProcess = _.uniqBy(iaLinesToProcess, function (line) {
            return line.getValue(FLD.MS_ID);
        });
        nlapiLogExecution('DEBUG', 'uniqueIaLinesToProcess', uniqueIaLinesToProcess.length);
        duplicateIaLinesToProcess = _.xor(iaLinesToProcess, uniqueIaLinesToProcess);
        nlapiLogExecution('DEBUG', 'duplicateIaLinesToProcess', duplicateIaLinesToProcess.length);
        if (duplicateIaLinesToProcess.length > 0) {
            nlapiLogExecution('DEBUG', 'START PROCESSING OF duplicateIaLinesToProcess');
            var i = 0;
            for (; i < duplicateIaLinesToProcess.length && context.getRemainingUsage() > 50; i++) {
                var line = duplicateIaLinesToProcess[i];
                nlapiLogExecution('DEBUG', 'duplicateIaLine', JSON.stringify(line));
                nlapiSubmitField(CUSTOM_RECORD, line.getId(), [
                    FLD.SYNC_STATUS,
                    FLD.ERROR_MSG,
                    FLD.RETRIES
                ], [
                    statusList.DUPLICATE,
                    'SKIPPED: Duplicate IA line',
                    0
                ]);
            }
            nlapiLogExecution('AUDIT', 'SCHEDULESYNCMSINVENTORY FOR DUPLICATES', 'Remaining usage: ' + context.getRemainingUsage() + '//' + 'Remaining to Process: ' + (duplicateIaLinesToProcess.length - i));
        }
        /**
         * END Duplicate detection
         */

        /**
         * START Skip STK_LOCN with the following prefixes
         * PG-
         * NS-CHEM
         * NS-FINI
         */
        skippedItems = _.remove(uniqueIaLinesToProcess, function (line) {
            var binNumber = line.getValue(FLD.MSTR_LOCN_CD) + line.getValue(FLD.AREA_LOCN_CD);
            return binNumber.substring(0, 3) == 'PG-' || binNumber.substring(0, 7) == 'NS-CHEM' || binNumber.substring(0, 7) == 'NS-FINI';
        });

        skippedItems.forEach(function (line, i, a) {
            var binNumber = line.getValue(FLD.MSTR_LOCN_CD) + line.getValue(FLD.AREA_LOCN_CD);
            var x = 'SKIPPED: Not processed because Bin Number starts with: ' + binNumber;
            nlapiSubmitField(CUSTOM_RECORD, line.getId(), [
                FLD.SYNC_STATUS,
                FLD.ERROR_MSG,
                FLD.RETRIES
            ], [
                statusList.COMPLETE,
                x,
                0
            ]);
            nlapiLogExecution('DEBUG', 'SKIPPED - ' + CUSTOM_RECORD + ' :' + line.getId(), x);
        });
        /**
         * END Skip STK_LOCN
         */
        uniqueIaLinesToProcessMap = mapSearchResultObj_ss1(uniqueIaLinesToProcess); //This is placed in here to conserve processing times

        if (uniqueIaLinesToProcessMap.length > 0) {
            var i = 0;
            var maxLine = 500;
            var maxLineCtr = 0;
            var IARec = -1;
            for (; i < uniqueIaLinesToProcessMap.length && maxLineCtr <= maxLine && context.getRemainingUsage() > 100; i++) {
                var line = uniqueIaLinesToProcessMap[i];
                nlapiLogExecution('DEBUG', 'governance//line', context.getRemainingUsage() + '//' + JSON.stringify(line));

                /**
                 * START field checks
                 */
                var errorsArr = [];
                var errorsStr = [];
                var recordLink = nlapiResolveURL('RECORD', CUSTOM_RECORD, line['ID']);
                recordLink = '<a href="' + recordLink + '">' + line['NAME'] + '</a>';

                var TTL_OH = parseFloatOrZero(line['TTL_OH']);
                if (TTL_OH < 0) {
                    errorsArr.push('Invalid TTL_OH, please check ' + CUSTOM_RECORD + ' with internalid of: ' + line['ID'] + ' ' + recordLink);
                }

                var STOCKNO = line['STOCKNO'];
                var STOCKNOObj = -1;
                if (STOCKNO == '') {
                    errorsArr.push('Invalid STOCKNO, please check ' + CUSTOM_RECORD + ' with internalid of: ' + line['ID'] + ' ' + recordLink);
                } else {
                    var stockNosMap = getItemDetails(STOCKNO)
                    STOCKNOObj = _.find(stockNosMap, function (x) {
                        return x['custcol_msid'] == STOCKNO
                    }) || -1;
                    if (STOCKNOObj == -1)
                        errorsArr.push('STOCKNO not found, please check if inventoryitem with MSID: ' + STOCKNO + ' exists. ' + ' ' + recordLink);
                }
                nlapiLogExecution('DEBUG', 'STOCKNOObj: ' + i + ', for internalid: ' + line['ID'], JSON.stringify(STOCKNOObj));

                var STK_LOCN = line['STK_LOCN'];
                var STK_LOCNInternalId = -1;
                if (STK_LOCN == '') {
                    errorsArr.push('Invalid STK_LOCN, please check ' + CUSTOM_RECORD + ' with internalid of: ' + line['ID'] + ' ' + recordLink);
                } else {
                    STK_LOCNInternalId = getLocation(STK_LOCN);
                    if (STK_LOCN == -1)
                        errorsArr.push('Cannot find STK_LOCN mapping, please check ' + CUSTOM_RECORD + ' with internalid of: ' + line['ID'] + ' ' + recordLink);
                }

                var MSID = line['MS_ID'];
                if (MSID == '') {
                    errorsArr.push('Invalid MSID, please check ' + CUSTOM_RECORD + ' with internalid of: ' + line['ID'] + ' ' + recordLink);
                }

                var BINNUMBER = line['BIN_NUMBER'];
                var BINNUMBERObj = -1;
                var BINNUMBERInternalId = -1;
                var NEWBINFLAG = false;
                if (BINNUMBER == '') {
                    errorsArr.push('Invalid MSTR_LOCN_CD and AREA_LOCN_CD, please check ' + CUSTOM_RECORD + ' with internalid of: ' + line['ID'] + ' ' + recordLink);
                } else {
                    var binNumbersMap = getBinDetails(BINNUMBER);
                    BINNUMBERObj = _.find(binNumbersMap, function (x) {
                        return x['custcol_binnumber'] == BINNUMBER && x['custcol_location'].toString() == STK_LOCNInternalId.toString();
                    }) || -1;
                    if (BINNUMBERObj < 0) { //bin number doesn't exist for the STK_LOCN, needs to be created first
                        var newBinRec = nlapiCreateRecord('bin');
                        newBinRec.setFieldValue('location', STK_LOCNInternalId);
                        newBinRec.setFieldValue('binnumber', BINNUMBER);
                        BINNUMBERInternalId = nlapiSubmitRecord(newBinRec);
                        var binObj = {
                            'custcol_binnumber': BINNUMBER,
                            'custcol_location': STK_LOCNInternalId,
                            'custcol_internalid': BINNUMBERInternalId
                        };
                        nlapiLogExecution('DEBUG', 'NEW BIN CREATED', JSON.stringify(binObj));
                        binNumbersMap.push(binObj);
                        NEWBINFLAG = true; // no need to lookup in TTH and in the BINNUMBER
                    } else {
                        BINNUMBERInternalId = BINNUMBERObj['custcol_internalid'];
                    }
                }
                nlapiLogExecution('DEBUG', 'BINNUMBERObj: ' + i + ', for internalid: ' + line['ID'], JSON.stringify(BINNUMBERObj));
                /**
                 * END field check
                 */

                if (errorsArr.length > 0) {
                    for (var idx in errorsArr) {
                        var temp = parseInt(1) + parseInt(idx);
                        errorsStr += temp + '. ' + errorsArr[idx] + '<br />';
                    }
                    nlapiLogExecution('DEBUG', 'errorsStr', errorsStr);
                    var retries = parseFloatOrZero(line['RETRIES']);
                    --retries;
                    nlapiSubmitField(CUSTOM_RECORD, line['ID'],
                        [
                            FLD.SYNC_STATUS,
                            FLD.ERROR_MSG,
                            FLD.RETRIES
                        ], [
                            statusList.ERROR,
                            errorsStr,
                            retries
                        ]);
                } else {
                    // Start check if Serialized Inventory, skip
                    if (STOCKNOObj['custcol_isserialitem'] == 'T' || STOCKNOObj['custcol_isserialitem'] == true) {
                        var x = 'SKIPPED: Not processed because serialized inventory';
                        nlapiSubmitField(CUSTOM_RECORD, line['ID'],
                            [
                                FLD.SYNC_STATUS,
                                FLD.ERROR_MSG,
                                FLD.RETRIES
                            ],
                            [
                                statusList.COMPLETE,
                                x,
                                0
                            ]);
                        nlapiLogExecution('DEBUG', 'SKIPPED: ' + CUSTOM_RECORD + ': ' + line['ID'], x);
                        continue;
                    }
                    var SUBLIST_ID = 'inventory';
                    if (IARec == -1) {
                        IARec = nlapiCreateRecord(STND_RECORD);
                        IARec.setFieldValue('subsidiary', '1');
                        IARec.setFieldValue('memo', 'Monthly inventory reconciliation');
                        IARec.setFieldValue('account', '3613');
                        var customForm = env == 'PRODUCTION' ? 168 : 168;
                        IARec.setFieldValue('customform', customForm);
                    }

                    //region Search bins with quantities
                    var totalOnHandFilters = [
                        ['transaction.posting', 'is', true], 'AND',
                        ['item.isserialitem', 'is', false], 'AND',
                        [
                            ['item.custitem_msid', 'is', line['STOCKNO']], 'OR',
                            ['item.itemid', 'is', line['STOCKNO']]
                        ], 'AND',
                        ['item.isinactive', 'is', false]
                    ];
                    var totalOnHandColumns = [
                        new nlobjSearchColumn('location', null, 'GROUP').setLabel('custcol_locationinternalid'),
                        new nlobjSearchColumn('formulatext', null, 'GROUP').setLabel('custcol_locationname').setFormula('{location.name}'),
                        new nlobjSearchColumn('binnumber', null, 'GROUP').setLabel('custcol_binnumberinternalid'),
                        new nlobjSearchColumn('formulatext', null, 'GROUP').setLabel('custcol_binnumber').setFormula('{binnumber}'),
                        new nlobjSearchColumn('custitem_msid', 'item', 'GROUP').setLabel('custcol_item'),
                        new nlobjSearchColumn('item', null, 'GROUP').setLabel('custcol_iteminternalid'),
                        new nlobjSearchColumn('quantity', 'transaction', 'SUM').setLabel('custcol_binquantity'),
                        new nlobjSearchColumn('internalid', 'binnumber', 'GROUP').setLabel('custcol_binnumberinternalid_2').setSort('ASC')
                    ];
                    var totalOnHandSearchObj = nlapiCreateSearch('inventorydetail', totalOnHandFilters, totalOnHandColumns);
                    totalOnHandQuantityMap = mapSearchResultObj_ss1(getResults(totalOnHandSearchObj.runSearch()));
                    nlapiLogExecution('DEBUG', 'totalOnHandQuantityMap for internalid: ' + line['ID'], JSON.stringify(totalOnHandQuantityMap))
                    var NS_TTL_OH = 0;
                    NS_TTL_OH = totalOnHandQuantityMap.reduce(function (acc, obj) {
                        return acc + parseFloat(obj['custcol_binquantity']);
                    }, 0);
                    //endregion
                    var LINE_TTL_OH = TTL_OH;
                    var adjustBy = 0;
                    nlapiLogExecution('DEBUG', 'NS_TTL_OH//LINE_TTL_OH for internalid: ' + line['ID'], NS_TTL_OH + '//' + LINE_TTL_OH);
                    if (NS_TTL_OH == 0 && LINE_TTL_OH == 0) {
                        // no need to do adjustment
                        nlapiSubmitField(CUSTOM_RECORD, line['ID'],
                            [
                                FLD.SYNC_STATUS,
                                FLD.ERROR_MSG,
                                FLD.RETRIES
                            ],
                            [
                                statusList.COMPLETE,
                                'SKIPPED: No adjustment needed',
                                0
                            ]);
                        continue;
                    }
                    if (NS_TTL_OH >= LINE_TTL_OH) {
                        NS_TTL_OH -= LINE_TTL_OH;
                        if (totalOnHandQuantityMap.length > 0) {// Decrease the NetSuite inventory down up to LINE_TTL_OH per BIN
                            for (var j = 0; j < totalOnHandQuantityMap.length && NS_TTL_OH >= LINE_TTL_OH; j++) {
                                var TTL_OHObj = totalOnHandQuantityMap.shift();
                                nlapiLogExecution('DEBUG', 'TTL_OHObj for internalid: ' + line['ID'] + ', PATH: A', JSON.stringify(TTL_OHObj));
                                var binQuantity = parseFloatOrZero(TTL_OHObj['custcol_binquantity']);
                                if (binQuantity <= NS_TTL_OH) {
                                    adjustBy = parseFloatOrZero(TTL_OHObj['custcol_binquantity']) * -1;
                                } else {
                                    adjustBy = NS_TTL_OH * -1;
                                }
                                NS_TTL_OH -= binQuantity;
                                nlapiLogExecution('DEBUG', 'NS_TTL_OH//LINE_TTL_OH//binQuantity//adjustBy for internalid: ' + line['ID'] + ', PATH: A', NS_TTL_OH + '//' + LINE_TTL_OH + '//' + binQuantity + '//' + adjustBy)
                                IARec.selectNewLineItem(SUBLIST_ID);
                                IARec.setCurrentLineItemValue(SUBLIST_ID, 'item', TTL_OHObj['custcol_iteminternalid']);
                                IARec.setCurrentLineItemValue(SUBLIST_ID, 'location', TTL_OHObj['custcol_locationinternalid']);
                                IARec.setCurrentLineItemValue(SUBLIST_ID, 'adjustqtyby', adjustBy);
                                IARec.setCurrentLineItemValue(SUBLIST_ID, 'custcol_syncmsinvt_line_link', line['ID']);
                                var invtDetailSubrecord = IARec.createCurrentLineItemSubrecord(SUBLIST_ID, 'inventorydetail');
                                invtDetailSubrecord.selectNewLineItem('inventoryassignment');
                                invtDetailSubrecord.setCurrentLineItemValue('inventoryassignment', 'binnumber', TTL_OHObj['custcol_binnumberinternalid']);
                                invtDetailSubrecord.setCurrentLineItemValue('inventoryassignment', 'quantity', adjustBy);
                                invtDetailSubrecord.commitLineItem('inventoryassignment');
                                invtDetailSubrecord.commit();
                                IARec.commitLineItem(SUBLIST_ID);
                            }
                        } else { // Increase the NetSuite inventory up to LINE_TTL_OH
                            adjustBy = Math.abs(parseFloatOrZero(LINE_TTL_OH));
                            nlapiLogExecution('DEBUG', 'adjustBy for internalid: ' + line['ID'] + ', PATH: B', adjustBy);
                            IARec.selectNewLineItem(SUBLIST_ID);
                            IARec.setCurrentLineItemValue(SUBLIST_ID, 'item', STOCKNOObj['custcol_internalid']);
                            IARec.setCurrentLineItemValue(SUBLIST_ID, 'location', STK_LOCNInternalId);
                            IARec.setCurrentLineItemValue(SUBLIST_ID, 'adjustqtyby', adjustBy);
                            IARec.setCurrentLineItemValue(SUBLIST_ID, 'custcol_syncmsinvt_line_link', line['ID']);
                            var invtDetailSubrecord = IARec.createCurrentLineItemSubrecord(SUBLIST_ID, 'inventorydetail');
                            invtDetailSubrecord.selectNewLineItem('inventoryassignment');
                            invtDetailSubrecord.setCurrentLineItemValue('inventoryassignment', 'binnumber', BINNUMBERInternalId);
                            invtDetailSubrecord.setCurrentLineItemValue('inventoryassignment', 'quantity', adjustBy);
                            invtDetailSubrecord.commitLineItem('inventoryassignment');
                            invtDetailSubrecord.commit();
                            IARec.commitLineItem(SUBLIST_ID);
                        }
                    } else {
                        adjustBy = Math.abs(parseFloatOrZero(LINE_TTL_OH) - parseFloatOrZero(NS_TTL_OH));
                        if (totalOnHandQuantityMap.length > 0) { // Increase the NetSuite inventory using the latest bin
                            var TTL_OHObj = totalOnHandQuantityMap.pop();
                            IARec.selectNewLineItem(SUBLIST_ID);
                            IARec.setCurrentLineItemValue(SUBLIST_ID, 'item', TTL_OHObj['custcol_iteminternalid']);
                            IARec.setCurrentLineItemValue(SUBLIST_ID, 'location', TTL_OHObj['custcol_locationinternalid']);
                            IARec.setCurrentLineItemValue(SUBLIST_ID, 'adjustqtyby', adjustBy);
                            IARec.setCurrentLineItemValue(SUBLIST_ID, 'custcol_syncmsinvt_line_link', line['ID']);
                            var invtDetailSubrecord = IARec.createCurrentLineItemSubrecord(SUBLIST_ID, 'inventorydetail');
                            invtDetailSubrecord.selectNewLineItem('inventoryassignment');
                            invtDetailSubrecord.setCurrentLineItemValue('inventoryassignment', 'binnumber', TTL_OHObj['custcol_binnumberinternalid']);
                            invtDetailSubrecord.setCurrentLineItemValue('inventoryassignment', 'quantity', adjustBy);
                            invtDetailSubrecord.commitLineItem('inventoryassignment');
                            invtDetailSubrecord.commit();
                            IARec.commitLineItem(SUBLIST_ID);
                            nlapiLogExecution('DEBUG', 'adjustBy//totalOnHandQuantityMap for internalid: ' + line['ID'] + ', PATH: C', adjustBy + '//' + JSON.stringify(TTL_OHObj))
                        } else { // Increase the NetSuite inventory using the newly created bin
                            nlapiLogExecution('DEBUG', 'adjustBy for internalid: ' + line['ID'] + ', PATH: D', adjustBy);
                            IARec.selectNewLineItem(SUBLIST_ID);
                            IARec.setCurrentLineItemValue(SUBLIST_ID, 'item', STOCKNOObj['custcol_internalid']);
                            IARec.setCurrentLineItemValue(SUBLIST_ID, 'location', STK_LOCNInternalId);
                            IARec.setCurrentLineItemValue(SUBLIST_ID, 'adjustqtyby', adjustBy);
                            IARec.setCurrentLineItemValue(SUBLIST_ID, 'custcol_syncmsinvt_line_link', line['ID']);
                            var invtDetailSubrecord = IARec.createCurrentLineItemSubrecord(SUBLIST_ID, 'inventorydetail');
                            invtDetailSubrecord.selectNewLineItem('inventoryassignment');
                            invtDetailSubrecord.setCurrentLineItemValue('inventoryassignment', 'binnumber', BINNUMBERInternalId);
                            invtDetailSubrecord.setCurrentLineItemValue('inventoryassignment', 'quantity', adjustBy);
                            invtDetailSubrecord.commitLineItem('inventoryassignment');
                            invtDetailSubrecord.commit();
                            IARec.commitLineItem(SUBLIST_ID);
                        }
                    }
                    iaLinesToMarkComplete.push(line['ID']);
                }
            }
            if (IARec != -1) {
                nlapiLogExecution('DEBUG', 'SAVING IA')
                var IARecId = nlapiSubmitRecord(IARec);
                iaLinesToMarkComplete.forEach(function (internalId) {
                    nlapiSubmitField(CUSTOM_RECORD, internalId,
                        [
                            FLD.SYNC_STATUS,
                            FLD.ERROR_MSG,
                            FLD.RETRIES,
                            FLD.NS_ID
                        ], [
                            statusList.COMPLETE,
                            'Monthly inventory reconciliation has been created for ' + moment().format('L'),
                            0,
                            IARecId
                        ]);
                });
                nlapiLogExecution('AUDIT', 'IARecId', IARecId)
            }
        }
    } catch (e) {
        iaLinesToMarkComplete.forEach(function (internalid) {
            var retries = nlapiLookupField(CUSTOM_RECORD, internalid, FLD.RETRIES);
            retries = parseFloatOrZero(retries);
            nlapiSubmitField(CUSTOM_RECORD, internalid,
                [
                    FLD.SYNC_STATUS,
                    FLD.ERROR_MSG,
                    FLD.RETRIES
                ],
                [
                    statusList.ERROR,
                    e.message + ', for internalids: ' + JSON.stringify(iaLinesToMarkComplete),
                    --retries
                ]);
        });
        nlapiLogExecution('ERROR', 'ERROR', e.message);
    }
    var scheduleStatus = '';
    while (scheduleStatus == '') {
        scheduleStatus = nlapiScheduleScript(scriptId);
        nlapiLogExecution('AUDIT', 'RESCHEDULING: ' + scheduleStatus, 'ENDING GOVERNANCE: ' + context.getRemainingUsage());
    }
};

function errText(_e, _internalId) {
    var txt = '';
    if (_e instanceof nlobjError) {
        //this is netsuite specific error
        txt = 'NLAPI Error: Record ID :: ' + _internalId + ' :: ' + _e.getCode() + ' :: ' + _e.getDetails() + ' :: ' + _e.getStackTrace().join(', ');
    } else {
        //this is generic javascript error
        txt = 'JavaScript/Other Error: Record ID :: ' + _internalId + ' :: ' + _e.toString() + ' : ' + _e.stack;
    }
    return txt;
};

function getColIndex(cols, colInternalId) {
    var colIndex = cols.map(function (e) {
        var colLabel = e.label;
        colLabel = colLabel.substring(colLabel.lastIndexOf(' ') + 1);
        return colLabel;
    }).indexOf(colInternalId);
    return colIndex;
};

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
};

function getItemDetails(stockNo) {
    var filters = [
        [
            ['custitem_msid', 'is', stockNo], 'OR',
            ['itemid', 'is', stockNo]
        ], 'AND',
        ['isinactive', 'is', false]
    ];
    var columns = [
        new nlobjSearchColumn('internalid').setLabel('custcol_internalid'),
        new nlobjSearchColumn('formulatext').setLabel('custcol_msid').setFormula('NVL({itemid}, {custitem_msid})'),
        new nlobjSearchColumn('usebins').setLabel('custcol_usebins'),
        new nlobjSearchColumn('isserialitem').setLabel('custcol_iserialitem')
    ];
    var stockNoSearchObj = nlapiCreateSearch('item', filters, columns);
    var stockNosMap = mapSearchResultObj_ss1(getResults(stockNoSearchObj.runSearch()));
    return stockNosMap;
}

function getBinDetails(binNumber) {
    var locationInternalId = getLocation(binNumber);
    var filters = [
        ['binnumber', 'is', binNumber], 'AND',
        ['location', 'is', locationInternalId]
    ];
    var columns = [
        new nlobjSearchColumn('binnumber').setLabel('custcol_binnumber'),
        new nlobjSearchColumn('location').setLabel('custcol_location'),
        new nlobjSearchColumn('internalid').setLabel('custcol_internalid')
    ];
    var binNumberSearchObj = nlapiCreateSearch('bin', filters, columns);
    var binNumbersMap = mapSearchResultObj_ss1(getResults(binNumberSearchObj.runSearch()));
    return binNumbersMap;
}

function getLocation(binNumber) {
    var tempLocation = '-1';
    if (binNumber.substring(0, 3) == 'PG-') {
        //Power Gen
        tempLocation = '214';
    } else if (binNumber.substring(0, 7) == 'NS-CHEM') {
        //Chemicals
        tempLocation = '213';
    } else if (binNumber.substring(0, 7) == 'NS-FINI') {
        //Finishing
        tempLocation = '220';
    } else {
        //General Stores Inventory
        tempLocation = '110';
    }
    return tempLocation;
};

function getResults(set) {
    var holder = [];
    var i = 0;
    while (true) {
        var result = set.getResults(i, i + 1000);
        if (!result) break;
        holder = holder.concat(result);
        if (result.length < 1000) break;
        i += 1000;
    }
    return holder;
};

function parseFloatOrZero(a) {
    var b = parseFloat(a);
    return isNaN(b) ? 0 : b;
}

var subsidiaryList = {
    'ALBERTA_NEWSPRINT_COMPANY': '1'
};