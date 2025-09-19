/* @Scheduled Script on Manual Deployment

Processes SyncWMInventory Record
*/

var context = nlapiGetContext();
SyncWMID = context.getSetting('SCRIPT', 'custscript_syncwminvid');
var script_id = 448;
var cutoffDate = new Date(2018, 5, 2); //June 2, 2018
var loopCount = 0;

function ScheduledSyncWMInventory(params) {
  nlapiLogExecution('AUDIT', 'CALLSCHEDULEDSYNCWMINVENTORY', 'SyncWMInventory Processing Started on Record ' + SyncWMID);
  try {

    nlapiSubmitField('customrecord_syncwminventory', SyncWMID, 'custrecord_syncwminv_syncstatus', '2');

    SyncWMRecord = nlapiLoadRecord('customrecord_syncwminventory', SyncWMID);

    var filters = [
      ['internalid', 'noneof', [SyncWMID]], 'AND',
      ['custrecord_syncwminv_wmid', 'contains', SyncWMRecord.getFieldValue('custrecord_syncwminv_wmid')], 'AND',
      ['custrecord_syncwminv_syncstatus', 'noneof', [7]]
    ];

    var columns = [];
    columns[0] = new nlobjSearchColumn('internalid');

    var searchDuplicates = nlapiSearchRecord('customrecord_syncwminventory', null, filters, columns);

    if (searchDuplicates) {
      //Matching contact sync records - record is a duplicate
      SyncWMRecord.setFieldValue('custrecord_syncwminv_syncstatus', 7); //Set SyncStatus = Duplicate
      SyncWMRecord.setFieldValue('custrecord_syncwminv_errmsg', 'Duplicate Sync Record - Not Processed');
      SyncWMRecord.setFieldValue('isinactive', 'T');
      nlapiSubmitRecord(SyncWMRecord);
      nlapiLogExecution('AUDIT', 'CALLSCHEDULEDSYNCWMINVENTORY', 'Record identified as Duplicate, processing cancelled');
    } else {
      //No matching inventory sync records - not a duplicate. Continue Processing.
      //Find all unprocessed lines for current day
      var filters = [
        ['custrecord_syncwminv_dateproduced', 'startswith', SyncWMRecord.getFieldValue('custrecord_syncwminv_dateproduced').substring(0, 10)], 'AND',
        ['custrecord_syncwminv_syncstatus', 'anyof', [1, 3, 5]], 'AND',
        ['custrecord_syncwminv_retries', 'greaterthan', 0]
      ];

      var columns = [];
      columns[0] = new nlobjSearchColumn('internalid');
      columns[1] = new nlobjSearchColumn('custrecord_syncwminv_prodgradekey');
      columns[2] = new nlobjSearchColumn('custrecord_syncwminv_inventoryno');
      columns[3] = new nlobjSearchColumn('custrecord_syncwminv_qualitystatus');

      var searchResults = nlapiSearchRecord('customrecord_syncwminventory', null, filters, columns);

      if (searchResults) {
        var cappedSearchLength = Math.min(searchResults.length, 200); //Testing with 200. Need to validate exact max requirements to set to valid length.
        nlapiLogExecution('DEBUG', 'cappedSearchLength Values', 'searchResults.length ' + searchResults.length + ' cappedSearchLength ' + cappedSearchLength);
        //Additional lines found, process for all lines
        Record = nlapiCreateRecord('inventoryadjustment');
        Record.setFieldValue('subsidiary', '1');
        Record.setFieldValue('department', '2');
        Record.setFieldValue('adjlocation', '215');
        Record.setFieldValue('account', '2175');
        dateParts = SyncWMRecord.getFieldValue('custrecord_syncwminv_dateproduced').substring(0, 10).split('-');
        tempDate = new Date(dateParts[0], dateParts[1] - 1, dateParts[2]);
        nlapiLogExecution('DEBUG', 'Check Dates', 'tempDate: ' + tempDate + ' cutoffDate: ' + cutoffDate);
        Record.setFieldValue('trandate', nlapiDateToString((cutoffDate > tempDate) ? cutoffDate : tempDate, 'date'));
        Record.setFieldValue('memo', 'New Paper Inventory created from Wrapmation Integration');
        Record.setFieldValue('custbody_wmid', SyncWMID); //Set ID of record that started the process, identify as WM Record

        //Pre-process items
        var itemIn = [];
        var itemOut = [];
        var itemIDs = [];

        itemIn.push(SyncWMRecord.getFieldValue('custrecord_syncwminv_qualitystatus') + SyncWMRecord.getFieldValue('custrecord_syncwminv_prodgradekey'));
        tempOut = validateItem(itemIn[0]);

        if (tempOut != '' && tempOut != 'error') {
          itemOut.push(tempOut);
          itemIDs.push([SyncWMRecord.getFieldValue('custrecord_syncwminv_inventoryno')]);
        } else {
          throw nlapiCreateError('error', 'First Item in Inventory Adjustment failed and transaction not created - ItemIn: ' + itemIn[0] + ' ItemOut: ' + tempOut);
        }

        var numberExistStatus = [];
        //for(n=0; n<itemOut.length; n++) {
        for (n = 0; n < cappedSearchLength; n++) {
          try {
            //pre-validate the Serial Number
            /** Logic could be cleaned up **/
            var numberExistsInNS = [];
            checkSerialNumItemOut = validateItem(searchResults[n].getValue('custrecord_syncwminv_qualitystatus') + searchResults[n].getValue('custrecord_syncwminv_prodgradekey'));
            nlapiLogExecution('DEBUG', 'Serial Number Precheck - Multiple', 'tempID: ' + searchResults[n].getValue('custrecord_syncwminv_inventoryno') + ' tempOut: ' + checkSerialNumItemOut);
            numberExistsInNS = checkNetSuiteSerialNumbers(searchResults[n].getValue('custrecord_syncwminv_inventoryno'), checkSerialNumItemOut);
            nlapiLogExecution('DEBUG', 'numberExistsInNS Values', JSON.stringify(numberExistsInNS));
            numberExistStatus.push(numberExistsInNS);

            nlapiLogExecution('DEBUG', 'ExecOrder', 'A');

            if (numberExistsInNS[0] == 'diffitem') {
              nlapiLogExecution('DEBUG', 'ExecOrder', 'B');
              throw nlapiCreateError('error', 'Serial Number ' + searchResults[n].getValue('custrecord_syncwminv_inventoryno') + ' already exists in NetSuite for a different item grade or quality');
            } else if (numberExistsInNS[0] == 'no') { //Excluding 'sameitem' lines from re-processing
              nlapiLogExecution('DEBUG', 'ExecOrder', 'C');
              //validation passed, Continue with parsing records
              tempIn = searchResults[n].getValue('custrecord_syncwminv_qualitystatus') + searchResults[n].getValue('custrecord_syncwminv_prodgradekey');
              checkExists = itemIn.indexOf(tempIn);
              //checkSerialNo = validateSerialNo(tempIn,itemIDs);
              if (checkExists > -1) { //if (checkExists > -1 && checkSerialNo == 'valid') {
                nlapiLogExecution('DEBUG', 'ExecOrder', 'D');
                //Item exists, add inventory number to list
                //nlapiLogExecution('DEBUG','Test of checkExists before add','intID: '+searchResults[n].getValue('internalid')+' tempIn: '+tempIn+' checkExists: '+checkExists+' itemIn: '+itemIn[n]+' itemOut: '+itemOut[n]);
                if (itemIDs.length > checkExists) {
                  nlapiLogExecution('DEBUG', 'ExecOrder', 'E');
                  //Add element to subarray, checking for duplicate in subarray
                  repeatedIDIndex = itemIDs[checkExists].indexOf(searchResults[n].getValue('custrecord_syncwminv_inventoryno'));
                  if (repeatedIDIndex == -1) {
                    nlapiLogExecution('DEBUG', 'ExecOrder', 'F');
                    itemIDs[checkExists].push(searchResults[n].getValue('custrecord_syncwminv_inventoryno'));
                  }
                } else {
                  nlapiLogExecution('DEBUG', 'ExecOrder', 'G');
                  //create new subarray
                  itemIDs.push([searchResults[n].getValue('custrecord_syncwminv_inventoryno')]);
                }
              } else { //} else if (checkSerialNo == 'valid') {
                nlapiLogExecution('DEBUG', 'ExecOrder', 'H');

                //New Item, perform lookup
                tempOut = validateItem(tempIn);
                if (tempOut != '' && tempOut != 'error') {
                  nlapiLogExecution('DEBUG', 'ExecOrder', 'I');
                  itemIn.push(tempIn);
                  itemOut.push(tempOut);
                  itemIDs.push([searchResults[n].getValue('custrecord_syncwminv_inventoryno')]);
                } else {
                  nlapiLogExecution('DEBUG', 'ExecOrder', 'J');
                  throw nlapiCreateError('error', 'Failed Item Validation', 'tempOut value: ' + tempOut);
                }
              }
            } //Skipped 'sameitem' lines from re-processing
            nlapiLogExecution('DEBUG', 'ExecOrder', 'K');
          } catch (e) {
            nlapiLogExecution('DEBUG', 'ExecOrder', 'L');
            nlapiLogExecution('ERROR', 'ScheduledSyncWMInventory() has encountered an error.', errText(e));
            nlapiSubmitField('customrecord_syncwminventory', searchResults[n].getValue('internalid'), 'custrecord_syncwminv_syncstatus', 3); //Set SyncStatus = Error for Serial Number already existing error
            nlapiSubmitField('customrecord_syncwminventory', searchResults[n].getValue('internalid'), 'custrecord_syncwminv_errmsg', 'Error Details: ' + errText(e));
            tempRetries = nlapiLookupField('customrecord_syncwminventory', searchResults[n].getValue('internalid'), 'custrecord_syncwminv_retries');
            nlapiSubmitField('customrecord_syncwminventory', searchResults[n].getValue('internalid'), 'custrecord_syncwminv_retries', (tempRetries - 1));
            nlapiLogExecution('AUDIT', 'CALLSCHEDULESYNCWMINVENTORY-testtest1', 'ScheduledSyncWMInventory has been updated with ' + (tempRetries - 1) + ' retries.');
          }
        }
        nlapiLogExecution('DEBUG', 'ExecOrder', 'M');

        //Remove Items that already exists
        var removeLineCount = 0;
        var removeCostLookup = {};
        var removeRec = nlapiCreateRecord('inventoryadjustment');
        removeRec.setFieldValue('subsidiary', '1');
        removeRec.setFieldValue('department', '2');
        removeRec.setFieldValue('adjlocation', '215');
        removeRec.setFieldValue('account', '2175');
        removeRec.setFieldValue('trandate', nlapiDateToString((cutoffDate > tempDate) ? cutoffDate : tempDate, 'date'));
        removeRec.setFieldValue('memo', 'Paper Inventory removed by Wrapmation Integration to recreate as different item');
        removeRec.setFieldValue('custbody_wmid', SyncWMID + "-Removal"); //Set ID of record that started the process, identify as WM Record
        for (z = 0; z < itemOut.length; z++) {
          if (numberExistStatus[z][0] == 'sameitem') {
            //Item has already been created and processing can be skipped
            nlapiSubmitField('customrecord_syncwminventory', searchResults[z].getValue('internalid'), 'custrecord_syncwminv_syncstatus', 4);
            nlapiSubmitField('customrecord_syncwminventory', searchResults[z].getValue('internalid'), 'custrecord_syncwminv_errmsg', 'Did not create a new Inventory Adjustment record for this item as the item already correctly exists.');
            nlapiSubmitField('customrecord_syncwminventory', searchResults[z].getValue('internalid'), 'custrecord_syncwminv_nsid', 'N/A');
            nlapiLogExecution('AUDIT', 'CALLSCHEDULEDSYNCWMINVENTORY', 'Did not create a new Inventory Adjustment record for this item as the item already correctly exists. InternalID: ' + searchResults[z].getValue('internalid') + ' Z: ' + z + ' loopCount: ' + loopCount);
            loopCount++;
          } else if (numberExistStatus[z][0] == 'diffitem') {
            //Create Transaction to remove all inventory for this serial number
            //throw nlapiCreateError('error','Different item has already been created but initial error check failed to catch the issue.');
            var serialResults = searchLotNumberSequence(numberExistStatus[z][1], '215');
            var serialsToRemove = [];
            if (serialResults) {
              for (s = 0; s < serialResults.length; s++) {
                if (serialResults[s].getText('inventorynumber', 'inventoryDetail') == itemOut[z]) {
                  serialsToRemove.push(serialResults[s].getValue('inventorynumber', 'inventoryDetail'));
                }
              }

              nlapiLogExecution('DEBUG', 'Values before processing removal transaction', 'serialResults count: ' + serialResults.length + ' serialsToRemove count: ' + serialsToRemove.length + ' serialResults: ' + numberExistStatus[z][1] + ' tempID: ' + itemOut[z]);

              removeRec.selectNewLineItem('inventory');
              removeRec.setCurrentLineItemValue('inventory', 'item', numberExistStatus[z][1]);
              removeRec.setCurrentLineItemValue('inventory', 'location', '215');
              removeQty = parseInt(0 - serialsToRemove.length);
              removeRec.setCurrentLineItemValue('inventory', 'adjustqtyby', removeQty);
              if (!(itemOut[z] in removeCostLookup)) {
                removeCostLookup = getItemCost(itemOut[z], removeCostLookup, "Source1 and z=" + z + "*");
              }
              removeRec.setCurrentLineItemValue('inventory', 'unitcost', removeCostLookup[itemOut[z]]);

              var subrecRemove = removeRec.createCurrentLineItemSubrecord('inventory', 'inventorydetail');
              subrecLineCount = 0;
              for (n = 0; n < serialsToRemove.length; n++) {
                subrecRemove.selectNewLineItem('inventoryassignment');
                subrecRemove.setCurrentLineItemValue('inventoryassignment', 'issueinventorynumber', serialsToRemove[n]);
                subrecRemove.setCurrentLineItemValue('inventoryassignment', 'quantity', -1);
                subrecRemove.commitLineItem('inventoryassignment');
                subrecLineCount++;
              }
              if (subrecLineCount > 0) {
                subrecRemove.commit();
                removeRec.commitLineItem('inventory');
                removeLineCount++;
              }

            }
          } //Else do nothing - item does not yet exist
          //throw nlapiCreateError('error','Different Item Exists but unable to create removal transaction.');
          /*if(nlapiGetContext().getRemainingUsage() <= 50){
          	nlapiYieldScript();
          }*/
        }
        if (removeLineCount > 0) {
          RemoveRecordID = nlapiSubmitRecord(removeRec);
          nlapiLogExecution('AUDIT', 'Removed Serial Numbers', 'Created removal inventory adjustment ' + RemoveRecordID + ' for multiple items.');
        }

        //var errorRecs = [];
        //var currentRec = '-1';
        //var serialNos = [];
        var costLookup = {};
        var addLineCount = 0;
        for (k = 0; k < itemIn.length; k++) {
          if (numberExistStatus[k][0] != 'sameitem') {
            //nlapiLogExecution('DEBUG','check itemIDs',itemIDs[k]);
            Record.selectNewLineItem('inventory');
            Record.setCurrentLineItemValue('inventory', 'item', itemOut[k]);
            Record.setCurrentLineItemValue('inventory', 'location', '215');
            Record.setCurrentLineItemValue('inventory', 'adjustqtyby', itemIDs[k].length);
            if (!(itemOut[k] in costLookup)) {
              costLookup = getItemCost(itemOut[k], costLookup, "Source2 and k=" + k + "*");
            }
            Record.setCurrentLineItemValue('inventory', 'unitcost', costLookup[itemOut[k]]);

            try {
              var subrec = Record.createCurrentLineItemSubrecord('inventory', 'inventorydetail');
              for (m = 0; m < itemIDs[k].length; m++) {
                //currentRec = itemIn[k]+'--'+itemIDs[k][m];
                /*
                for (p=0; p<itemIn.length; p++) {
                	if(itemIDs[p].indexOf(itemIDs[k][m]) >= 0 && p != k) {
                		serialNos.push(p+'--'+itemIDs[k][m]);
                	}
                }
                */
                //if(serialNos.indexOf(k+'--'+itemIDs[k][m] == -1) {
                subrec.selectNewLineItem('inventoryassignment');
                subrec.setCurrentLineItemValue('inventoryassignment', 'receiptinventorynumber', itemIDs[k][m]);
                subrec.setCurrentLineItemValue('inventoryassignment', 'quantity', 1);
                subrec.commitLineItem('inventoryassignment');
                //}
              }
              subrec.commit();
              Record.commitLineItem('inventory');
              addLineCount++;
            } catch (e) {
              throw nlapiCreateError('ERROR', 'Error Processing Inventory Line');
              //Decide what to do here
              //errorRecs.push(currentRec);
            }
          }
        }
        var RecordID = '**SKIPPED: No valid lines. No record created**';

        nlapiLogExecution('DEBUG', 'Output 1of5', 'itemIn: ' + JSON.stringify(itemIn));
        nlapiLogExecution('DEBUG', 'Output 2of5', 'itemOut: ' + JSON.stringify(itemOut));
        nlapiLogExecution('DEBUG', 'Output 3of5', 'itemIDs: ' + JSON.stringify(itemIDs));
        nlapiLogExecution('DEBUG', 'Output 4of5', 'removeLineCount: ' + JSON.stringify(removeLineCount));
        nlapiLogExecution('DEBUG', 'Output 5of5', 'addLineCount: ' + JSON.stringify(addLineCount));

        //throw nlapiCreateError('ERROR','HALT BEFORE SUBMIT - TESTING');

        if (addLineCount > 0) {
          RecordID = nlapiSubmitRecord(Record);
        } else {
          nlapiLogExecution('AUDIT', 'Record not created', 'Record not created - addLineCount value of ' + addLineCount);
        }

        /** Currently assuming all items succeed - need to improve this logic per-item **/
        for (x = 0; x < cappedSearchLength; x++) {
          if (numberExistStatus[x][0] != 'sameitem') {
            //aggErrKey = searchResults[x].getValue('custrecord_syncwminv_qualitystatus')+searchResults[x].getValue('custrecord_syncwminv_prodgradekey')+'--'+searchResults[x].getValue('custrecord_syncwminv_inventoryno');
            //if(errorRecs.indexOf(aggErrorKey) == '-1' || errorRecs.indexOf(aggErrorKey) == -1) {
            fieldArr = ['custrecord_syncwminv_syncstatus', 'custrecord_syncwminv_errmsg', 'custrecord_syncwminv_nsid'];
            valueArr = [4, 'Created Inventory Adjustment record with Internal ID ' + RecordID, RecordID];
            nlapiSubmitField('customrecord_syncwminventory', searchResults[x].getValue('internalid'), fieldArr, valueArr); //Complete
            /*} else {
            	nlapiSubmitField('customrecord_syncwminventory',searchResults[x].getValue('internalid'),'custrecord_syncwminv_syncstatus',3); //Error
            	nlapiSubmitField('customrecord_syncwminventory',searchResults[x].getValue('internalid'),'custrecord_syncwminv_errmsg','Error Encountered while adding line to Inventory Adjustment record.');
            	tempRetries = nlapiLookupField('customrecord_syncwminventory',searchResults[x].getValue('internalid'),'custrecord_syncwminv_retries');
            	nlapiSubmitField('customrecord_syncwminventory',searchResults[x].getValue('internalid'),'custrecord_syncwminv_retries',(tempRetries - 1));
            	nlapiLogExecution('AUDIT','CALLSCHEDULESYNCWMINVENTORY','ScheduledSyncWMInventory has been updated with '+(tempRetries - 1)+' retries.');
            }*/
          }
        }

        SyncWMRecord.setFieldValue('custrecord_syncwminv_syncstatus', 4);
        SyncWMRecord.setFieldValue('custrecord_syncwminv_errmsg', 'Created Inventory Adjustment record with Internal ID ' + RecordID);
        SyncWMRecord.setFieldValue('custrecord_syncwminv_nsid', RecordID);
        nlapiSubmitRecord(SyncWMRecord);
        nlapiLogExecution('AUDIT', 'CALLSCHEDULEDSYNCWMINVENTORY', 'Inventory Adjustment with Internal ID ' + RecordID + ' has been created.');
      } else {
        //throw nlapiCreateError('error','Single-line adjustment needs to be updated to match multi-line logic');
        //No additional lines, create inventory adjustment with single line
        Record = nlapiCreateRecord('inventoryadjustment');
        Record.setFieldValue('subsidiary', '1');
        Record.setFieldValue('department', '2');
        Record.setFieldValue('adjlocation', '215');
        Record.setFieldValue('account', '2175');
        dateParts = SyncWMRecord.getFieldValue('custrecord_syncwminv_dateproduced').substring(0, 10).split('-');
        tempDate = new Date(dateParts[0], dateParts[1] - 1, dateParts[2]);
        nlapiLogExecution('DEBUG', 'Check Dates', 'tempDate: ' + tempDate + ' cutoffDate: ' + cutoffDate);
        Record.setFieldValue('trandate', nlapiDateToString((cutoffDate > tempDate) ? cutoffDate : tempDate, 'date'));
        Record.setFieldValue('memo', 'New Paper Inventory created from Wrapmation Integration');
        Record.setFieldValue('custbody_wmid', SyncWMID); //Set ID of record that started the process, identify as WM Record

        tempIn = SyncWMRecord.getFieldValue('custrecord_syncwminv_qualitystatus') + SyncWMRecord.getFieldValue('custrecord_syncwminv_prodgradekey');
        tempOut = validateItem(tempIn);
        tempID = '';
        if (tempOut != '' && tempOut != 'error') {
          tempID = SyncWMRecord.getFieldValue('custrecord_syncwminv_inventoryno');
        } else {
          throw nlapiCreateError('error', 'First Item in Inventory Adjustment failed and transaction not created - ItemIn: ' + itemIn[0] + ' ItemOut: ' + tempOut);
        }

        var numberExistsInNS = [];
        try {
          //pre-validate the Serial Number
          //numberExistsInNS = checkNetSuiteSerialNumbers(tempID,SyncWMRecord.getFieldValue('custrecord_syncwminv_prodgradekey'),SyncWMRecord.getFieldValue('custrecord_syncwminv_qualitystatus'));
          nlapiLogExecution('DEBUG', 'Serial Number Precheck - Single', 'tempID: ' + tempID + ' tempOut: ' + tempOut);
          numberExistsInNS = checkNetSuiteSerialNumbers(tempID, tempOut);
          nlapiLogExecution('DEBUG', 'numberExistsInNS Values', JSON.stringify(numberExistsInNS));
          //if(numberExistsInNS[0] == 'diffitem' || numberExistsInNS[0] == 'sameitem') {
          //throw nlapiCreateError('error','Serial Number '+SyncWMRecord.getFieldValue('custrecord_syncwminv_inventoryno')+' already exists in NetSuite');
          //}
          //tempOut = validateItem(tempIn);
          itemID = SyncWMRecord.getFieldValue('custrecord_syncwminv_inventoryno');
        } catch (e) {
          nlapiLogExecution('ERROR', 'ScheduledSyncWMInventory() has encountered an error.', errText(e));
          nlapiSubmitField('customrecord_syncwminventory', SyncWMID, 'custrecord_syncwminv_syncstatus', 3); //Set SyncStatus = Error for Serial Number already existing error
          nlapiSubmitField('customrecord_syncwminventory', SyncWMID, 'custrecord_syncwminv_errmsg', 'Error Details: ' + errText(e));
          tempRetries = nlapiLookupField('customrecord_syncwminventory', SyncWMID, 'custrecord_syncwminv_retries');
          nlapiSubmitField('customrecord_syncwminventory', SyncWMID, 'custrecord_syncwminv_retries', (tempRetries - 1));
          nlapiLogExecution('AUDIT', 'CALLSCHEDULESYNCWMINVENTORY', 'ScheduledSyncWMInventory has been updated with ' + (tempRetries - 1) + ' retries.');
        }

        if (numberExistsInNS[0] == 'sameitem') {
          //Item has already been created and processing can be skipped
          SyncWMRecord.setFieldValue('custrecord_syncwminv_syncstatus', 4);
          SyncWMRecord.setFieldValue('custrecord_syncwminv_errmsg', 'Did not create a new Inventory Adjustment record for this single item as the item already correctly exists.');
          SyncWMRecord.setFieldValue('custrecord_syncwminv_nsid', 'N/A');
          nlapiSubmitRecord(SyncWMRecord);
          nlapiLogExecution('AUDIT', 'CALLSCHEDULEDSYNCWMINVENTORY', 'Did not create a new Inventory Adjustment record for this single item as the item already correctly exists.');
        } else if (numberExistsInNS[0] == 'diffitem') {
          //Create Transaction to remove all inventory for this serial number
          //throw nlapiCreateError('error','Different item has already been created but initial error check failed to catch the issue.');

          var serialResults = searchLotNumberSequence(numberExistsInNS[1], '215');
          var serialsToRemove = [];
          if (serialResults) {
            for (s = 0; s < serialResults.length; s++) {
              if (serialResults[s].getText('inventorynumber', 'inventoryDetail') == tempID) {
                serialsToRemove.push(serialResults[s].getValue('inventorynumber', 'inventoryDetail'));
              }
            }

            nlapiLogExecution('DEBUG', 'Values before processing removal transaction', 'serialResults count: ' + serialResults.length + ' serialsToRemove count: ' + serialsToRemove.length + ' serialResults: ' + numberExistsInNS[1] + ' tempID: ' + tempID);

            removeRec = nlapiCreateRecord('inventoryadjustment');
            removeRec.setFieldValue('subsidiary', '1');
            removeRec.setFieldValue('department', '2');
            removeRec.setFieldValue('adjlocation', '215');
            removeRec.setFieldValue('account', '2175');
            removeRec.setFieldValue('trandate', nlapiDateToString((cutoffDate > tempDate) ? cutoffDate : tempDate, 'date'));
            removeRec.setFieldValue('memo', 'Paper Inventory removed by Wrapmation Integration to recreate as different item');
            removeRec.setFieldValue('custbody_wmid', SyncWMID + "-Removal"); //Set ID of record that started the process, identify as WM Record

            removeRec.selectNewLineItem('inventory');
            removeRec.setCurrentLineItemValue('inventory', 'item', numberExistsInNS[1]);
            removeRec.setCurrentLineItemValue('inventory', 'location', '215');
            removeQty = parseInt(0 - serialsToRemove.length);
            removeRec.setCurrentLineItemValue('inventory', 'adjustqtyby', removeQty);
            removeRec.setCurrentLineItemValue('inventory', 'unitcost', getItemCost(tempOut, {}, "Source3")[tempOut]);

            var subrecRemove = removeRec.createCurrentLineItemSubrecord('inventory', 'inventorydetail');
            var removeLineCount = 0;
            for (n = 0; n < serialsToRemove.length; n++) {
              subrecRemove.selectNewLineItem('inventoryassignment');
              subrecRemove.setCurrentLineItemValue('inventoryassignment', 'issueinventorynumber', serialsToRemove[n]);
              subrecRemove.setCurrentLineItemValue('inventoryassignment', 'quantity', -1);
              subrecRemove.commitLineItem('inventoryassignment');
              removeLineCount++;
            }
            subrecRemove.commit();
            removeRec.commitLineItem('inventory');

            if (removeLineCount > 0) {
              RemoveRecordID = nlapiSubmitRecord(removeRec);
              nlapiLogExecution('AUDIT', 'Removed Serial Numbers', 'Created removal inventory adjustment ' + RemoveRecordID + ' for item ' + tempOut);
            } else {
              nlapiLogExecution('AUDIT', 'Removal of Serial Numbers Attempted But None Valid', 'Attempted to Remove Serial Numbers but no records were valid - continuing processing of Order');
            }
          } else {
            throw nlapiCreateError('error', 'Different Item Exists but unable to create removal transaction.');
          }
        }
        if (numberExistsInNS[0] != 'sameitem') {
          Record.selectNewLineItem('inventory');
          Record.setCurrentLineItemValue('inventory', 'item', tempOut);
          Record.setCurrentLineItemValue('inventory', 'location', '215');
          Record.setCurrentLineItemValue('inventory', 'adjustqtyby', 1);
          Record.setCurrentLineItemValue('inventory', 'unitcost', getItemCost(tempOut, {}, "Source4")[tempOut]);

          var subrec = Record.createCurrentLineItemSubrecord('inventory', 'inventorydetail');
          subrec.selectNewLineItem('inventoryassignment');
          subrec.setCurrentLineItemValue('inventoryassignment', 'receiptinventorynumber', tempID);
          subrec.setCurrentLineItemValue('inventoryassignment', 'quantity', 1);
          subrec.commitLineItem('inventoryassignment');
          subrec.commit();
          Record.commitLineItem('inventory');

          RecordID = nlapiSubmitRecord(Record);

          SyncWMRecord.setFieldValue('custrecord_syncwminv_syncstatus', 4);
          SyncWMRecord.setFieldValue('custrecord_syncwminv_errmsg', 'Created Inventory Adjustment record with Internal ID ' + RecordID);
          SyncWMRecord.setFieldValue('custrecord_syncwminv_nsid', RecordID);
          nlapiSubmitRecord(SyncWMRecord);
          nlapiLogExecution('AUDIT', 'CALLSCHEDULEDSYNCWMINVENTORY', 'Inventory Adjustment with Internal ID ' + RecordID + ' has been created.');
        }
      }
    }
  } catch (e) {
    nlapiLogExecution('ERROR', 'ScheduledSyncWMInventory() has encountered an error.', errText(e));
    nlapiSubmitField('customrecord_syncwminventory', SyncWMID, 'custrecord_syncwminv_syncstatus', 3); //Set SyncStatus = Error
    nlapiSubmitField('customrecord_syncwminventory', SyncWMID, 'custrecord_syncwminv_errmsg', 'Error Details: ' + errText(e));
    tempRetries = nlapiLookupField('customrecord_syncwminventory', SyncWMID, 'custrecord_syncwminv_retries');
    nlapiSubmitField('customrecord_syncwminventory', SyncWMID, 'custrecord_syncwminv_retries', (tempRetries - 1));
    nlapiLogExecution('AUDIT', 'CALLSCHEDULESYNCWMINVENTORY-testtest2', 'ScheduledSyncWMInventory has been updated with ' + (tempRetries - 1) + ' retries.');
  }
  findNextRecord();
}

function findNextRecord() {
  //Check for additional records to add to processing queue
  var filters = [
    ['custrecord_syncwminv_syncstatus', 'anyof', [1, 3, 5]], 'AND',
    ['custrecord_syncwminv_retries', 'greaterthan', 0]
  ];

  var columns = [];
  columns[0] = new nlobjSearchColumn('internalid');

  var searchResults = nlapiSearchRecord('customrecord_syncwminventory', null, filters, columns);

  if (searchResults) {
    var nextSyncWMID = searchResults[0].getValue('internalid');
    nlapiLogExecution('AUDIT', 'CALLSCHEDULEDSYNCWMINVENTORY', 'Additional records to sync found. Queueing ' + nextSyncWMID);
    var newParams = {
      'custscript_syncwminvid': nextSyncWMID
    };
    var ScheduleStatus = nlapiScheduleScript(script_id, null, newParams); //Deployment is empty so that script selects first available deployment
    if (ScheduleStatus == 'QUEUED') {
      nlapiSubmitField('customrecord_syncwminventory', nextSyncWMID, '	custrecord_syncwminv_syncstatus', '6');
    } //Else no available deployments - remaining records will be caught by periodic retry script
  } else {
    nlapiLogExecution('AUDIT', 'CALLSCHEDULEDSYNCWMINVENTORY', 'No records to sync found.');
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

function validateItem(aggKey) {
  var quality = aggKey.substring(0, 4);
  var prodGrade = aggKey.substring(4);
  if (prodGrade == null || prodGrade == '') {
    throw nlapiCreateError('error', 'Invalid ProdGrade Value "' + prodGrade + '" and key "' + aggKey + '", Unable to Validate Item');
  } else if (quality == null || quality == '') {
    throw nlapiCreateError('error', 'Invalid Quality Value "' + quality + '" and key "' + aggKey + '", Unable to Validate Item');
  } else if (quality == 'SALE') { //PRIME quality items
    /** SHOULD SEARCH ITEMS AND BUILD UP A DICTIONARY **/
    switch (prodGrade) {
      case '17':
        return '12137'; //'NPO59ST';
      case '19':
        return '12139'; //'NPT59ST'
      case '23':
        return '12136'; //'NPL59ST';
      case '28':
        return '12135'; //'NPA59ST';
      case '30':
        return '12132'; //'HBT65ST';
      case '31':
        return '12131'; //'HBT65RO';
      case '34':
        return '12134'; //'HBT70ST';
      case '35':
        return '12133'; //'HBT70RO';
      case '36':
        return '12130'; //'HBO65ST';
      case '37':
        return '17485'; //'HBO65RO';
      case '38':
        return '12138'; //'NPT59RO';
      case '40':
        return '17488'; //'NPL59RO';
      case '41':
        return '17491'; //'HBL63ST';
      case '42':
        return '17494'; //'HBL63RO';
      case '45':
        return '17482'; //'HBK63RO';
      case '46':
        return '17479'; //'HBK63ST';
      case '47':
        return '45327'; //'LNX57ST';
      case '48':
        return '58549'; //LNY56ST
      case '49':
        return '58550'; //LNY56RO
      case '50':
        return '58548'; //LNZ56ST
      case '51':
        return '68399'; //LNZ56RO
    }
  } else if (quality == 'CULL') { //OFFGRADE quality items
    /** SHOULD SEARCH ITEMS AND BUILD UP A DICTIONARY **/
    switch (prodGrade) {
      case '17':
        return '12146'; //'NPO59ST';
      case '19':
        return '12148'; //'NPT59ST'
      case '23':
        return '12145'; //'NPL59ST';
      case '28':
        return '12144'; //'NPA59ST';
      case '30':
        return '12141'; //'HBT65ST';
      case '31':
        return '12140'; //'HBT65RO';
      case '34':
        return '12143'; //'HBT70ST';
      case '35':
        return '12142'; //'HBT70RO';
      case '36':
        return '12149'; //'HBO65ST';
      case '37':
        return '17486'; //'HBO65RO';
      case '38':
        return '12147'; //'NPT59RO';
      case '40':
        return '17489'; //'NPL59RO';
      case '41':
        return '17492'; //'HBL63ST';
      case '42':
        return '17495'; //'HBL63RO';
      case '45':
        return '17483'; //'HBK63RO';
      case '46':
        return '17480'; //'HBK63ST';
      case '47':
        return '45328'; //'LNX57ST';
      case '48':
        return '58553'; //LNY56ST
      case '49':
        return '58555'; //LNY56RO
      case '50':
        return '58551'; //LNZ56ST			
      case '51':
        return '68398'; //LNZ56RO
    }
  } else if (quality == 'BEAT') { //BEATER quality items
    /** SHOULD SEARCH ITEMS AND BUILD UP A DICTIONARY **/
    switch (prodGrade) {
      case '17':
        return '12157'; //'NPO59ST';
      case '19':
        return '12159'; //'NPT59ST'
      case '23':
        return '12156'; //'NPL59ST';
      case '28':
        return '12155'; //'NPA59ST';
      case '30':
        return '12152'; //'HBT65ST';
      case '31':
        return '12151'; //'HBT65RO';
      case '34':
        return '12154'; //'HBT70ST';
      case '35':
        return '12153'; //'HBT70RO';
      case '36':
        return '12150'; //'HBO65ST';
      case '37':
        return '17487'; //'HBO65RO';
      case '38':
        return '12158'; //'NPT59RO';
      case '40':
        return '17490'; //'NPL59RO';
      case '41':
        return '17493'; //'HBL63ST';
      case '42':
        return '17496'; //'HBL63RO';
      case '45':
        return '17484'; //'HBK63RO';
      case '46':
        return '17481'; //'HBK63ST';
      case '47':
        return '45329'; //'LNX57ST';
      case '48':
        return '58554'; //LNY56ST
      case '49':
        return '58556'; //LNY56RO
      case '50':
        return '58552'; //LNZ56ST
      case '51':
        return '68397'; //LNZ56RO
    }
  } else if (quality == 'HELD') {
    return '12285';
  } //Held Inventory
  throw nlapiCreateError('error', 'Something went wrong in Item Validation for item ' + aggKey);
}

function validateSerialNo(newID, arrayIDs) {
  for (n = 0; n < arrayIDs.length; n++) {
    if (arrayIDs[n].indexOf(newID) > -1) {
      return 'invalid';
    }
  }
  return 'valid';
}

function checkNetSuiteSerialNumbers(testNumber, newItem) {
  var returnArray = ['', []];
  var filters = [
    ['serialnumber', 'is', testNumber]
  ];
  var columns = [];
  columns[0] = new nlobjSearchColumn('internalid');
  var searchResults = nlapiSearchRecord('inventoryitem', null, filters, columns);
  if (searchResults) {
    for (k = 0; k < searchResults.length; k++) {
      if (newItem == searchResults[k].getValue('internalid')) {
        returnArray[0] = 'sameitem';
        returnArray[1] = [newItem];
        return returnArray;
      } else {
        returnArray[0] = 'diffitem';
        returnArray[1].push(searchResults[k].getValue('internalid'));
      }
    }
    return returnArray;
  } else {
    returnArray[0] = 'no';
    returnArray[1] = [0];
    return returnArray;
  }
  throw nlapiCreateError('error', 'Error occured while processing checkNetSuiteSerialNumbers function for serialNumber ' + testNumber + ', ProdGrade ' + ProdGrade + ', Quality ' + Quality);
}

function getItemCost(itemID, costLookupObj, sourceID) {
  nlapiLogExecution('DEBUG', 'Debug getItemCost ID missing error', 'itemID: ' + itemID + ' source: ' + sourceID + ' costLookupObj: ' + JSON.stringify(costLookupObj));
  costLookupObj[itemID] = nlapiLookupField('inventoryitem', itemID, 'costestimate');
  nlapiLogExecution('DEBUG', 'Debug getItemCost ID Output', 'costLookupObj: ' + JSON.stringify(costLookupObj));
  return costLookupObj;
}

function searchLotNumberSequence(itemIDArray, locationID) {
  nlapiLogExecution('DEBUG', 'searchLotNumberSequence input', 'itemID: ' + JSON.stringify(itemIDArray) + ' locationID ' + locationID);
  //Search related transaction using Serial/Lot Number Internal IDs for LIFO approach
  returnArray = [];
  for (n = 0; n < itemIDArray.length; n++) {
    itemID = itemIDArray[n];
    var s = nlapiSearchRecord('transaction', null,
      [
        ['type', 'anyof', ['ItemRcpt', 'InvAdjst']], 'AND',
        ['mainline', 'is', 'F'], 'AND',
        ['quantity', 'greaterthan', 0], 'AND',
        ['itemnumber.location', 'anyof', locationID], 'AND',
        ['itemnumber.quantityavailable', 'greaterthan', 0], 'AND',
        ['item', 'anyof', itemID]
      ],
      [
        new nlobjSearchColumn('item'),
        new nlobjSearchColumn('trandate').setSort(true), //true for LIFO, false for FIFO
        new nlobjSearchColumn('internalid', 'inventoryDetail'),
        new nlobjSearchColumn('location', 'inventoryDetail'),
        new nlobjSearchColumn('inventorynumber', 'inventoryDetail'),
        new nlobjSearchColumn('quantity', 'inventoryDetail'),
        new nlobjSearchColumn('binnumber', 'inventoryDetail')
      ]
    );
    if (s) {
      returnArray.concat(s);
    }
  }
  return s;
}