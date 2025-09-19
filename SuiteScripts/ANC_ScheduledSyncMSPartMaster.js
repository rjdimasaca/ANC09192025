/* @Scheduled Script on Manual Deployment

Processes SyncMSPartMaster Records
11232021 - handle transload c/o lisa, mark, mike, rod
*/

var context = nlapiGetContext();
SyncMSID = context.getSetting('SCRIPT','custscript_syncmspartmasterid');
var script_id = context.getScriptId();

function ScheduledSyncMSPartMaster(params){
	nlapiLogExecution('DEBUG','CALLSCHEDULEDSYNCMSPARTMASTER','SyncMSPartMaster Processing Started on Record '+SyncMSID);
	try{
		nlapiSubmitField('customrecord_syncmspartmaster',SyncMSID,'custrecord_syncmspartmaster_syncstatus','2');
		SyncMSRecord = nlapiLoadRecord('customrecord_syncmspartmaster',SyncMSID);
		var tempRecType = (SyncMSRecord.getFieldValue('custrecord_syncmspart_nonstkflg') == 'N') ? 'inventoryitem' : 'noninventoryitem';

		/**
		 * Search customrecord_syncmspartmaster with the same stock no
		 * as this record
		 */
		nlapiLogExecution('AUDIT', 'STARTCHECKDUPLICATES', 'Check duplicates of Stock No.: ' + SyncMSRecord.getFieldValue('custrecord_syncmspart_stockno'));
		var filters = [];
		var columns = [];
		filters = [
			['custrecord_syncmspart_stockno', 'is', SyncMSRecord.getFieldValue('custrecord_syncmspart_stockno')],
			'AND',
			['isinactive', 'is', false]
		];
		columns = [
			new nlobjSearchColumn('internalid').setSort('DESC'),
			new nlobjSearchColumn('name')
		];

		var duplicateSearch = nlapiSearchRecord('customrecord_syncmspartmaster', null, filters, columns) || [];
		var duplicateSearchLength = duplicateSearch.length;

        /**
         * Duplicates exists if result is greater than 1. Because if length is 1, it is the record itself
         */
		if(duplicateSearchLength > 1) {
			nlapiLogExecution('DEBUG', 'Duplicate/s found', (duplicateSearchLength-1) + ' duplicate/s found');
			var firstInternalId = duplicateSearch[0].getValue('internalid');
			firstInternalId = parseInt(firstInternalId);
			SyncMSID = parseInt(SyncMSID);
			if(firstInternalId > SyncMSID) {
				nlapiLogExecution('DEBUG', 'This record is older', 'This record with internal id: ' + SyncMSID + ' is older than: ' + firstInternalId);
				var url = nlapiResolveURL('RECORD', 'customrecord_syncmspartmaster', firstInternalId);
				var recName = duplicateSearch[0].getValue('name');
				var recUrl = '<a href="' + url + '">' + recName + '</a>';
				for(var ctr = 1; ctr < duplicateSearchLength; ctr++) {
					nlapiSubmitField('customrecord_syncmspartmaster', duplicateSearch[ctr].getValue('internalid'), 'custrecord_syncmspartmaster_syncstatus', statusList.DUPLICATE); //Duplicate
					nlapiSubmitField('customrecord_syncmspartmaster', duplicateSearch[ctr].getValue('internalid'), 'custrecord_syncmspart_retries', 0);
					nlapiSubmitField('customrecord_syncmspartmaster', duplicateSearch[ctr].getValue('internalid'), 'custrecord_syncmspartmaster_errmsg', 'SKIPPED: Duplicate of: ' + recUrl );
				}
				findNextRecord();
				return;
			}
		}
		nlapiLogExecution('AUDIT', 'ENDCHECKDUPLICATES', 'End check duplicates of Stock No.: ' + SyncMSRecord.getFieldValue('custrecord_syncmspart_stockno'));


		/**
		 * START Handler for Non-inventory item
		 */
		if(SyncMSRecord.getFieldValue('custrecord_syncmspart_nonstkflg') != 'N') {
		    //Create Non-Inventory Item
		    //throw nlapiCreateError('error','Not Yet Ready to Create Non-Inventory Item');
		    nlapiSubmitField('customrecord_syncmspartmaster',SyncMSID,'custrecord_syncmspartmaster_syncstatus', statusList.COMPLETE); //Complete
		    nlapiSubmitField('customrecord_syncmspartmaster',SyncMSID,'custrecord_syncmspartmaster_errmsg','SKIPPED: Non-Inventory Items are not being created.');
		    nlapiSubmitField('customrecord_syncmspartmaster',SyncMSID,'custrecord_syncmspart_retries',0);
		    findNextRecord();
		    return;
		}
		/**
		 * END Handler for Non-inventory item
		 */
		
		if(SyncMSRecord.getFieldValue('custrecord_syncmspart_xntype') == '100' ||
			SyncMSRecord.getFieldValue('custrecord_syncmspart_xntype') == '200' ||
			SyncMSRecord.getFieldValue('custrecord_syncmspart_xntype') == '201') {

			// PART MASTER CREATE/UPDATE
			var binNumber = SyncMSRecord.getFieldValue('custrecord_syncmspart_mstrlocncd') +
							SyncMSRecord.getFieldValue('custrecord_syncmspart_arealocncd');

			var tempLocation = '-1';
			if (binNumber.substring(0,3) == 'PG-') {
			    //Power Gen
			    tempLocation = '214';
			} else if (binNumber.substring(0,7) == 'NS-CHEM') {
			    //Chemicals
			    tempLocation = '213';
			} else if (binNumber.substring(0,7) == 'NS-FINI') {
			    //Finishing
			    tempLocation = '220';
			} else {
			    //General Stores Inventory
			    tempLocation = '110';
			}

			// LEGACY: Location of tempUOM initializing (Moved to Create/Update Logic)
			
			/**
			 * START Run a search for the item based on binNumber
			 * If already exists, load item record. If not create item record.
			 */
            var itemLookup = '';
            if(binNumber.substr(0, 3) == 'NS-' && binNumber.substr(0,7) != 'NS-CHEM') {
                //itemLookup = 'NS-' + SyncMSRecord.getFieldValue('custrecord_syncmspart_account');
				itemLookup = SyncMSRecord.getFieldValue('custrecord_syncmspart_stockno');
            } else if (binNumber.substr(0, 3) == 'FI-') {
                //itemLookup = SyncMSRecord.getFieldValue('custrecord_syncmspart_account');
				itemLookup = SyncMSRecord.getFieldValue('custrecord_syncmspart_stockno');
            } else {
                itemLookup = SyncMSRecord.getFieldValue('custrecord_syncmspart_stockno');
            }
			var filters = [
			    ['custitem_msid','is', itemLookup], 'OR',
                ['itemid','is',SyncMSRecord.getFieldValue('custrecord_syncmspart_stockno')]
			];
			var columns = [];
			columns[0] = new nlobjSearchColumn('internalid');
			columns[1] = new nlobjSearchColumn('isinactive');
			var searchResults = nlapiSearchRecord(tempRecType,null,filters,columns) || [];
			var itemRecord = -1;
			var newItemFlag = false;
			var tempUOM = [];
			if(searchResults.length < 1) { //Item Record doesn't exist
			    newItemFlag = true;
			    itemRecord = nlapiCreateRecord(tempRecType);
				tempUOM = validateUOM(SyncMSRecord.getFieldValue('custrecord_syncmspart_issueuom'),"-1");
				itemRecord.setFieldValue('unitstype',tempUOM[0]);
			} else { //Item record already exists
				startingUnitType = nlapiLookupField('inventoryitem',searchResults[0].getValue('internalid'),'unitstype');
				tempUOM = validateUOM(SyncMSRecord.getFieldValue('custrecord_syncmspart_issueuom'),startingUnitType);
				//Force Unit Type Before Load if blank Unit Type
				if((startingUnitType == "" || startingUnitType == null) && tempUOM[0] != '-1' && tempUOM[0] != -1 && tempUOM[0] != "" && tempUOM[0] != null){nlapiSubmitField('inventoryitem',searchResults[0].getValue('internalid'),'unitstype',tempUOM[0]);}
				itemRecord = nlapiLoadRecord(tempRecType, searchResults[0].getValue('internalid'));
				//tempUOM = validateUOM(SyncMSRecord.getFieldValue('custrecord_syncmspart_issueuom'),itemRecord.getFieldValue('unitstype'));
			}
			
			if (tempUOM[1] == '-1' || tempUOM[1] == -1) {
				if (tempUOM[0] == '-1' || tempUOM[0] == -1) {
					throw nlapiCreateError('error','Unable to find matching Unit of Measure in any Unit Type, Part Master Record not Created');
				} else {
					throw nlapiCreateError('error','Unable to find matching Unit of Measure within Unit Type '+tempUOM[0]+', Part Master Record not Created');
				}
			}
			
			/**
			 * END Run a search for the item based on stockno
			 */

			/**
			 * START Bin number checck if already exists.
			 * If not, create a new bin record
			 */
			if(binNumber != '') {
				var binNumberInternalId = -1;
				var binSearchFilters = [];
				binSearchFilters.push(new nlobjSearchFilter('location', null, 'is', tempLocation));
				binSearchFilters.push(new nlobjSearchFilter('binnumber', null, 'is', binNumber));
				var binSearchResults = nlapiSearchRecord('bin', null, binSearchFilters) || [];
				if(binSearchResults.length < 1) { //binNumber doesn't exist
				    var newBinRec = nlapiCreateRecord('bin');
				    newBinRec.setFieldValue('location', tempLocation);
				    newBinRec.setFieldValue('binnumber', binNumber);
				    binNumberInternalId = nlapiSubmitRecord(newBinRec);
				} else {
					binNumberInternalId = binSearchResults[0].getId();
				}
				itemRecord.setFieldValue('usebins', 'T');
				itemRecord.selectNewLineItem('binnumber');
				itemRecord.setCurrentLineItemValue('binnumber','location', tempLocation);
				itemRecord.setCurrentLineItemValue('binnumber','binnumber', binNumberInternalId);
				itemRecord.commitLineItem('binnumber');
			} else {
				nlapiLogExecution('DEBUG', 'No bin number found in SyncMSRecord', 'Skipping creating bins');
			}
			/**
			 * END Bin number check
			 */

			//11202021 - Rod, Mike, Lisa, Preet if TL-Transload
			var master_loc = SyncMSRecord.getFieldValue('custrecord_syncmspart_mstrlocncd');
			
			nlapiLogExecution("DEBUG", "master_loc", master_loc);
			if(master_loc == "TL" || master_loc == "TL-")
			{
			    itemRecord.setFieldValue('subsidiary','7'); //Alberta Newsprint Company : ANC Transloading Inc.
			    
			    tempLocation = '6'; //ANC Transloading - Millsite
			}
			else
			{
			    itemRecord.setFieldValue('subsidiary','1');
			}
			itemRecord.setFieldValue('location',tempLocation);

			nlapiLogExecution('DEBUG', 'tempUOM', JSON.stringify(tempUOM))
			
			itemRecord.setFieldValue('stockunit',tempUOM[1]);
			itemRecord.setFieldValue('purchaseunit',tempUOM[1]);
			itemRecord.setFieldValue('saleunit',tempUOM[1]);

			tempShelfID = SyncMSRecord.getFieldValue('custrecord_syncmspart_binid')+'';
			itemRecord.setFieldValue('custitem_shelfposition',(tempShelfID.substring(0,1) == '-') ? tempShelfID.substring(1) : tempShelfID);
			itemRecord.setFieldValue('itemid',SyncMSRecord.getFieldValue('custrecord_syncmspart_stockno'));
			itemRecord.setFieldValue('isinactive',SyncMSRecord.getFieldValue('custrecord_syncmspart_partdeacstatus') == 'ACT' ? 'F' : 'T');
			itemRecord.setFieldValue('costingmethod',SyncMSRecord.getFieldValue('custrecord_syncmspart_crcode') == 'AVERAGE' ? 'AVG' : 'AVG'); //No alternative pricing currently accepted
			itemRecord.setFieldValue('cost',SyncMSRecord.getFieldValue('custrecord_syncmspart_itemcost'));
			itemRecord.setFieldValue('reorderpoint',SyncMSRecord.getFieldValue('custrecord_syncmspart_orderpt'));
			itemRecord.setFieldValue('autoreorderpoint','F');
			itemRecord.setFieldValue('custitem_msid', itemLookup);
			itemRecord.setFieldValue('safetystocklevel',SyncMSRecord.getFieldValue('custrecord_syncmspart_minimum'));
			itemRecord.setFieldValue('taxschedule',SyncMSRecord.getFieldValue('custrecord_syncmspart_taxable') == 'N' ? '1' : '2');
			itemRecord.setFieldValue('purchasedescription',SyncMSRecord.getFieldValue('custrecord_syncmspart_description'));
			itemRecord.setFieldValue('stockdescription',SyncMSRecord.getFieldValue('custrecord_syncmspart_description').substring(0,20));
			itemRecord.setFieldValue('custitem_msid',SyncMSRecord.getFieldValue('custrecord_syncmspart_stockno'));

			MSAccounts = validateAccount(binNumber,SyncMSRecord.getFieldValue('custrecord_syncmspart_accttype'),SyncMSRecord.getFieldValue('custrecord_syncmspart_account'));
			nlapiLogExecution('DEBUG', 'MSAccounts', JSON.stringify(MSAccounts));
			newItemFlag ? itemRecord.setFieldValue('cogsaccount',MSAccounts[0]) : ''; //COGS
			newItemFlag ? itemRecord.setFieldValue('assetaccount',MSAccounts[1]) : ''; //Asset
			itemRecord.setFieldValue('incomeaccount',MSAccounts[2]); //Income
			itemRecord.setFieldValue('intercocogsaccount',''); //IntercoCOGS
			itemRecord.setFieldValue('intercoincomeaccount',''); //IntercoIncome

			newItemID = nlapiSubmitRecord(itemRecord);
			nlapiSubmitField('customrecord_syncmspartmaster',SyncMSID,'custrecord_syncmspartmaster_syncstatus', statusList.COMPLETE); //Complete

			/**
			 * SET ERROR MESSAGE
			 */
			if(newItemFlag) { //Create
			    nlapiSubmitField('customrecord_syncmspartmaster',SyncMSID,'custrecord_syncmspartmaster_errmsg','New Inventory Item has been created with Internal ID '+newItemID);
			    nlapiSubmitField('customrecord_syncmspartmaster',SyncMSID,'custrecord_syncmspart_retries',0);
			    nlapiLogExecution('AUDIT','CALLSCHEDULEDSYNCMSPARTMASTER','SyncMSPartMaster with Internal ID '+SyncMSID+' has created a new Inventory Item with Internal ID '+newItemID);
			} else { //Update
			    nlapiSubmitField('customrecord_syncmspartmaster',SyncMSID,'custrecord_syncmspartmaster_errmsg','Inventory Item has been updated with Internal ID '+newItemID);
			    nlapiSubmitField('customrecord_syncmspartmaster',SyncMSID,'custrecord_syncmspart_retries',0);
			    nlapiLogExecution('AUDIT','CALLSCHEDULEDSYNCMSPARTMASTER','SyncMSPartMaster with Internal ID '+SyncMSID+' has updated an Inventory Item with Internal ID '+newItemID);
			}
		} else if (SyncMSRecord.getFieldValue('custrecord_syncmspart_xntype') == '300') {
			// Part Master Delete - Inactivate Item
			var filters = [
				['custitem_msid','is',SyncMSRecord.getFieldValue('custrecord_syncmspart_stockno')]
			];
			
			var columns = [];
			columns[0] = new nlobjSearchColumn('internalid');
			columns[1] = new nlobjSearchColumn('isinactive');
			
			var searchResults = nlapiSearchRecord(tempRecType,null,filters,columns);
			
			if(searchResults) {
				nlapiSubmitField(tempRecType,searchResults[0].getValue('internalid'),'isinactive','T');
				nlapiSubmitField('customrecord_syncmspartmaster',SyncMSID,'custrecord_syncmspart_retries',0);
				nlapiSubmitField('customrecord_syncmspartmaster',SyncMSID,'custrecord_syncmspartmaster_errmsg','Item Record with Internal ID '+searchResults[0].getValue('internalid')+' has been inactivated.');
				nlapiLogExecution('debug','Item Record Inactivated','Item Record with Internal ID '+searchResults[0].getValue('internalid')+' has been inactivated.');
			} else {
				//confirm to Matt how to handle retries and status of items to be updated that cannot be found?
				nlapiSubmitField('customrecord_syncmspartmaster',SyncMSID,'custrecord_syncmspartmaster_errmsg','Item that could not be found was to be deactivated - no action taken');
				nlapiLogExecution('debug','Unable to inactivate unrecognized item','Item that could not be found was to be deactivated - no action taken');
			}
			nlapiSubmitField('customrecord_syncmspartmaster',SyncMSID,'custrecord_syncmspartmaster_syncstatus', statusList.COMPLETE); //Complete
		} else { throw nlapiCreateError('error','Invalid Part Master xn_type - unable to process record'); }
	}
	catch(e){
        nlapiLogExecution('error','ScheduledSyncMSPartMaster() has encountered an error.',errText(e));
		nlapiSubmitField('customrecord_syncmspartmaster',SyncMSID,'custrecord_syncmspartmaster_syncstatus', statusList.ERROR); //Set SyncStatus = Error
		nlapiSubmitField('customrecord_syncmspartmaster',SyncMSID,'custrecord_syncmspartmaster_errmsg','Error Details: '+errText(e));
		tempRetries = nlapiLookupField('customrecord_syncmspartmaster',SyncMSID,'custrecord_syncmspart_retries');
		nlapiSubmitField('customrecord_syncmspartmaster',SyncMSID,'custrecord_syncmspart_retries',(tempRetries - 1));
		nlapiLogExecution('debug','CALLSCHEDULESYNCMSPARTMASTER','ScheduledSyncMSPartMaster has been updated with '+(tempRetries - 1)+' retries.');
    }
	findNextRecord();
}

function findNextRecord(){
		//Check for additional records to add to processing queue
		var filters = [
			['custrecord_syncmspartmaster_syncstatus','anyof',[statusList.NEW, statusList.ERROR, statusList.TO_REPROCESS]], 'AND',
			['custrecord_syncmspart_retries','greaterthan',0]
        ];
		
		var columns = [];
		columns[0] = new nlobjSearchColumn('internalid');
		
		var searchResults = nlapiSearchRecord('customrecord_syncmspartmaster',null,filters,columns);
		
		if(searchResults) {
			var nextSyncMSID = searchResults[0].getValue('internalid');
			nlapiLogExecution('AUDIT','CALLSCHEDULEDSYNCMSPARTMASTER','Additional records to sync found. Queueing '+nextSyncMSID);
			var newParams = {'custscript_syncmspartmasterid':nextSyncMSID};
			var ScheduleStatus = nlapiScheduleScript(script_id,null,newParams); //Deployment is empty so that script selects first available deployment
			if(ScheduleStatus == 'QUEUED') {
				nlapiSubmitField('customrecord_syncmspartmaster',nextSyncMSID,'	custrecord_syncmspartmaster_syncstatus', statusList.QUEUED);
			} //Else no available deployments - remaining records will be caught by periodic retry script
		} else {
			nlapiLogExecution('AUDIT','CALLSCHEDULEDSYNCMSPARTMASTER','No records to sync found.');
		}
}

function errText(_e) {
    _internalId = nlapiGetRecordId();
    _internalId = parseInt(SyncMSID);
    if(!(typeof _internalId==='number' && (_internalId%1)===0)) {
        _internalId = 0;
    }
    
    var txt='';
    if (_e instanceof nlobjError) {
        //this is netsuite specific error
        txt = 'NLAPI Error: Record ID :: '+_internalId+' :: '+_e.getCode()+' :: '+_e.getDetails() + ' :: ' + _e.getStackTrace().join(', ');
    } else {
        //this is generic javascript error
        txt = 'JavaScript/Other Error: Record ID :: '+_internalId+' :: '+_e.toString()+' : '+_e.stack;
    }
    return txt;
}

function validateAccount(stockNo,rawMSAccountType,rawMSAccount) {
	//[COGS,Asset,Income,IntercoCOGS,IntercoIncome]
	var Accts = ['-1','-1','-1','-1','-1'];
	
	Accts[0] = '3613'; 	//COGS account being hardcoded to '9999 Error Account' for manual adjustment as there is no reference in Mainsaver
	
	if (stockNo.substring(0,3) == 'PG-') {
		//Power Gen
		Accts[1] = '641'; //2000 Mill Stores Inventory
	} else if (stockNo.substring(0,7) == 'NS-CHEM' || stockNo.substring(0,7) == 'NS-FINI') {
		var filters = [['formulatext:LTRIM({name}, {number})','is',stockNo]]; //changed from acctname because it was throwing errors
		var columns = [];
		columns[0] = new nlobjSearchColumn('internalid');
		var searchResults = nlapiSearchRecord('account',null,filters,columns);
		if (searchResults) {
			Accts[1] = searchResults[0].getValue('internalid');
		} else if (stockNo.substring(0,7) == 'NS-CHEM') {
			//Chemicals
			Accts[1] = '243'; //Match to backup account of 1602 Chemical Inventory
		} else {
			//Finishing Goods
			Accts[1] = '244'; //Match to backup account of 1800 Finishing Supplies Wrap
		}
	} else {
		//General Stores Inventory
		Accts[1] = '641'; //2000 Mill Stores Inventory
	}
	Accts[2] = '54'; //Income hard-coded to '4000 Sales'
	Accts[3] = '1969'; //Intercompany COGS
	Accts[4] = '1970'; //Intercompany Income
	return Accts;
}

function validateUOM(rawUOM,unitType) {
	rawUOM = rawUOM.toLowerCase();
	var returnUOM = ['-1','-1'];
	
	if(unitType == "-1" || unitType == "" || unitType == null) {
		//Item Create, search all UOM
	
		var columns = [];
		columns[0] = new nlobjSearchColumn('internalid');
		columns[1] = new nlobjSearchColumn('unitname');
		columns[2] = new nlobjSearchColumn('pluralname');
		columns[3] = new nlobjSearchColumn('abbreviation');
		var searchResults = nlapiSearchRecord('unitstype',null,null,columns);
		
		if (searchResults) {
			//Check for matches
			for (n = 0; n<searchResults.length; n++) {
				unitname = searchResults[n].getValue('unitname').toLowerCase();
				pluralname = searchResults[n].getValue('pluralname').toLowerCase();
				abbreviation = searchResults[n].getValue('abbreviation').toLowerCase();
				if (unitname == rawUOM || pluralname == rawUOM || abbreviation == rawUOM) {
					returnUOM[0] = parseInt(searchResults[n].getValue('internalid'));
					var UnitTypeRec = nlapiLoadRecord('unitstype',searchResults[n].getValue('internalid'));
					UnitCount = UnitTypeRec.getLineItemCount('uom');
					for (k = 1; k < (UnitCount+1); k++) {
						tempUnitName = UnitTypeRec.getLineItemValue('uom','unitname',k).toLowerCase();
						tempPluralName = UnitTypeRec.getLineItemValue('uom','pluralname',k).toLowerCase();
						tempAbbreviation = UnitTypeRec.getLineItemValue('uom','abbreviation',k).toLowerCase();
						if (tempUnitName == rawUOM || tempPluralName == rawUOM || tempAbbreviation == rawUOM) {
							returnUOM[1] = parseInt(UnitTypeRec.getLineItemValue('uom','internalid',k));
							return returnUOM;
						}
					}
				}
			}
		}
	} else {
		//Item Update, search only current unit type UOM
		
		nlapiLogExecution('AUDIT','UOM UPDATE IN validateUOM()','Unit Type Input is: '+unitType);
		
		returnUOM[0] = unitType;
		var UnitTypeRec = nlapiLoadRecord('unitstype',unitType);
		UnitCount = UnitTypeRec.getLineItemCount('uom');
		for (k = 1; k < (UnitCount+1); k++) {
			tempUnitName = UnitTypeRec.getLineItemValue('uom','unitname',k).toLowerCase();
			tempPluralName = UnitTypeRec.getLineItemValue('uom','pluralname',k).toLowerCase();
			tempAbbreviation = UnitTypeRec.getLineItemValue('uom','abbreviation',k).toLowerCase();
			if (tempUnitName == rawUOM || tempPluralName == rawUOM || tempAbbreviation == rawUOM) {
				returnUOM[1] = parseInt(UnitTypeRec.getLineItemValue('uom','internalid',k));
				//returnUOM[1] = UnitTypeRec.getLineItemValue('uom','unitname',k);
				return returnUOM;
			}
		}
	}
	return returnUOM;
}

//region LIST
var statusList = {
	'NEW' : '1',
	'PROCESSING' : '2',
	'ERROR' : '3',
	'COMPLETE' : '4',
	'TO_REPROCESS' : '5',
	'QUEUED' : '6',
	'DUPLICATE' : '7'
};
//endregion LIST