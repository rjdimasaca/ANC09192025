/* @Scheduled Script on Manual Deployment

Processes SyncWMOrderHeader and SyncWMOrderDetail Records

*/

/**
 * DEV VERSION		: v1.1.0 - change how locationToConsignee is mapped 10122019 - TC10ROD
 * 					  1.1.1 - re enable function call that creates inventory transfer 10122019 - TC10ROD
 *					  1.1.2 - ADDED wm invoice number, merged with sandbox
 *					  1.1.3 - set unit of measure text, to be used for xml invoice - TC10ROD 10182019
 *					  1.1.3 - wm line description, to be used for xml invoice - TC10ROD 10242019
 *					  1.1.4 - mapped item for prodgrade 52 - TC10ROD 11202019
 *					  1.1.5 - 11212019 - DO NOT TERMINATE, proceed with the next order or allocation
 *					  1.1.6 - 02282020 - mapped PH code as kath gave go signal - TC10ROD
 *					  1.2.0 - 03122020 - incorrect item, roll was multiquality(mark), manual adjustments, going forward lookup base on current onhand - TC10ROD
 *					  1.2.1 - updated grade52(existing but looks off) and grade53(new), based on case51
 *                    1.2.2 - allow shipper other than 214
 */

var context = nlapiGetContext();
SyncWMID = context.getSetting('SCRIPT', 'custscript_syncwmloadid');
var script_id = 464;
var cutoffDate = new Date(2018, 5, 2); //June 2, 2018
var dontProcessBeforeDate = new Date(2019, 6, 1); //July 1, 2019 - process nothing before this day
//var rollCost = 435.69;

//US INTERCOMPANY PRICE - 432.66 USD
//Units Ordered is volume in MT

function ScheduledSyncWMLoad(params) {
	nlapiLogExecution('DEBUG', 'CALLSCHEDULEDSYNCWMLOAD', 'SyncWMLoad Processing Started on Record ' + SyncWMID);
  
  //temporarilly allow manual invocation - TC10ROD 10092019
  if(!SyncWMID)
    {
      findNextRecord();
      return;
    }
	try {
		nlapiSubmitField('customrecord_syncwmloadheader', SyncWMID, 'custrecord_syncwmloadhead_syncstatus', '2');

		var SyncWMRecord = nlapiLoadRecord('customrecord_syncwmloadheader', SyncWMID);

		/** Changed filter from WMID to LoadHeadKey, no longer checks for duplicates **/

		var filters = [
			['internalid', 'noneof', [SyncWMID]], 'AND',
			['custrecord_syncwmloadhead_loadheadkey', 'contains', SyncWMRecord.getFieldValue('custrecord_syncwmloadhead_loadheadkey')], 'AND',
			['custrecord_syncwmloadhead_syncstatus', 'noneof', [7]]
		];

		var columns = [];
		columns[0] = new nlobjSearchColumn('internalid');
		columns[1] = new nlobjSearchColumn('custrecord_syncwmloadhead_exchtxkey');

		var searchResults = nlapiSearchRecord('customrecord_syncwmloadheader', null, filters, columns);

		if (searchResults) {
			currentExchangeKey = SyncWMRecord.getFieldValue('custrecord_syncwmloadhead_exchtxkey');
			for (n = 0; n < searchResults.length; n++) {
				if (parseInt(searchResults[n].getValue('custrecord_syncwmloadhead_exchtxkey')) > parseInt(currentExchangeKey)) {
					currentExchangeKey = searchResults[n].getValue('custrecord_syncwmloadhead_exchtxkey');
					//nlapiSubmitField('customrecord_syncwmloadheader',searchResults[n].getValue('internalid'),'custrecord_syncwmloadhead_syncstatus',4);
					//nlapiSubmitField('customrecord_syncwmloadheader',searchResults[n].getValue('internalid'),'custrecord_syncwmloadhead_errormessage','Later Exchange Key of '+currentExchangeKey+' was found. Header does not need to be processed.');

					SyncWMRecord.setFieldValue('custrecord_syncwmloadhead_syncstatus', 4);
					SyncWMRecord.setFieldValue('custrecord_syncwmloadhead_errormessage', 'Later Exchange Key of ' + currentExchangeKey + ' was found. Header does not need to be processed.');
					nlapiSubmitRecord(SyncWMRecord);

					SyncWMRecord = nlapiLoadRecord('customrecord_syncwmloadheader', searchResults[n].getValue('internalid'));
					SyncWMID = searchResults[n].getValue('internalid');
				}
			}
		}

		//TC10ROD 10112019 set wminvoicenumber
		var syncWMRecord_wminvoicenumber = SyncWMRecord.getFieldValue('custrecord_syncwmloadhead_invoiceno') || "";
		checkStatus = SyncWMRecord.getFieldValue('custrecord_syncwmloadhead_syncstatus');
		checkDate = SyncWMRecord.getFieldValue('custrecord_syncwmloadhead_dateshipped');
		if (checkStatus == 4 || checkStatus == 7) {
			//Do nothing - record has already been processed
			nlapiLogExecution('error', 'Record already processed', 'Previous record attempted to sync but later version was already synced.');
		} else if (checkDate == '' || checkDate == null) {
			//Load is not yet shipped - unable to process
			nlapiLogExecution('audit', 'Record not shipped', 'Record ' + SyncWMID + ' has not been shipped. Load is not ready for processing.');
			SyncWMRecord.setFieldValue('custrecord_syncwmloadhead_syncstatus', 4);
			SyncWMRecord.setFieldValue('custrecord_syncwmloadhead_errormessage', 'Load has not been shipped - not ready for processing.');
			nlapiSubmitRecord(SyncWMRecord);
		} else {

			//Find all unprocessed header lines for current order
			var filters = [
				['custrecord_syncwmloadhead_loadheadkey', 'is', SyncWMRecord.getFieldValue('custrecord_syncwmloadhead_loadheadkey')], 'AND',
				['custrecord_syncwmloadhead_syncstatus', 'anyof', [1, 2, 3, 5, 6]], 'AND', //added 6
				['custrecord_syncwmloadhead_retries', 'greaterthan', 0]
			];

			var columns = [];
			columns[0] = new nlobjSearchColumn('internalid');
			columns[1] = new nlobjSearchColumn('custrecord_syncwmloadhead_customerkey');
			columns[2] = new nlobjSearchColumn('custrecord_syncwmloadhead_loadno');
			columns[3] = new nlobjSearchColumn('custrecord_syncwmloadhead_loadheadkey');
			columns[4] = new nlobjSearchColumn('custrecord_syncwmloadhead_customerkey');
			columns[5] = new nlobjSearchColumn('custrecord_syncwmloadhead_consigneekey');
			columns[6] = new nlobjSearchColumn('custrecord_syncwmloadhead_exchtxkey');
			columns[7] = new nlobjSearchColumn('custrecord_syncwmloadhead_country');
			columns[8] = new nlobjSearchColumn('custrecord_syncwmloadhead_consaddrname');
			columns[9] = new nlobjSearchColumn('custrecord_syncwmloadhead_address');
			columns[10] = new nlobjSearchColumn('custrecord_syncwmloadhead_city');
			columns[11] = new nlobjSearchColumn('custrecord_syncwmloadhead_stateprovince');
			columns[12] = new nlobjSearchColumn('custrecord_syncwmloadhead_postalcode');
			columns[13] = new nlobjSearchColumn('custrecord_syncwmloadhead_vehicleno');
			columns[14] = new nlobjSearchColumn('custrecord_syncwmloadhead_transmodekey');
			columns[15] = new nlobjSearchColumn('custrecord_syncwmloadhead_carrierkey');
			//1.2.2 include shipper key in results
			columns[16] = new nlobjSearchColumn('custrecord_syncwmloadhead_shipperkey');
			


			var searchResults = nlapiSearchRecord('customrecord_syncwmloadheader', null, filters, columns);

			//Find all detail lines for current order
			var filters = [
				['custrecord_syncwmloaddet_loadheaderkey', 'is', SyncWMRecord.getFieldValue('custrecord_syncwmloadhead_loadheadkey')]
			];

			var columns = [];
			columns[0] = new nlobjSearchColumn('internalid');
			columns[1] = new nlobjSearchColumn('custrecord_syncwmloaddet_loaddetailkey');
			columns[2] = new nlobjSearchColumn('custrecord_syncwmloaddet_exchtxkey');
			columns[3] = new nlobjSearchColumn('custrecord_syncwmloaddet_orderitemkey');
			columns[4] = new nlobjSearchColumn('custrecord_syncwmloaddet_orderheaderkey');

			var searchLineResults = nlapiSearchRecord('customrecord_syncwmloaddetail', null, filters, columns);

			/** NEED TO PROCESS ONLY LAST EXCHTXKEY OF HEADER AND LAST EXCHTXKEY PER ORDERITEMKEY **/

			nlapiLogExecution("DEBUG", "ZZZZZ 11/1/2019 searchLineResults", JSON.stringify(searchLineResults))
			nlapiLogExecution("DEBUG", "ZZZZZ 11/1/2019 searchResults", JSON.stringify(searchResults))
			
			if (searchLineResults && searchResults) {
				nlapiLogExecution('debug', 'Head and Line Results', 'Head: ' + searchResults.length + ' Line: ' + searchLineResults.length);
				//Detail lines found, create/update order using only LAST header line and LAST of each detail line
				var HeadMax = -1;
				var HeadIndex = -1;
				var LineObj = {}; //TODO: WILL BE DEPRECATED
				var LineIdObj = {}; //TODO: WILL BE DEPRECATED
				var LineDetails = {};

				for (ho = 0; ho < searchResults.length; ho++) {
					ExTxKey = parseInt(searchResults[ho].getValue('custrecord_syncwmloadhead_exchtxkey'));
					if (parseInt(ExTxKey) > parseInt(HeadMax)) {
						HeadMax = parseInt(ExTxKey);
						HeadIndex = ho;
					}
				}

				for (Lo = 0; Lo < searchLineResults.length; Lo++) {
					LineKey = parseInt(searchLineResults[Lo].getValue('custrecord_syncwmloaddet_loaddetailkey'));
					ExLineKey = parseInt(searchLineResults[Lo].getValue('custrecord_syncwmloaddet_exchtxkey'));
					LineOrderItem = parseInt(searchLineResults[Lo].getValue('custrecord_syncwmloaddet_orderitemkey'));
					OrderHeaderVal = searchLineResults[Lo].getValue('custrecord_syncwmloaddet_orderheaderkey');
					OrderHeaderClean = (OrderHeaderVal == null) ? "" : OrderHeaderVal;
					InternalID = searchLineResults[Lo].getValue('internalid');
					tempID = 'id' + LineKey;
					if (LineKey in LineObj) {
						if (parseInt(ExLineKey) > parseInt(LineObj[LineKey])) { //LineObj.LineKey
							LineObj[LineKey] = parseInt(ExLineKey);
							LineIdObj[tempID] = Lo;
						} //Else line definition is old and should be ignored
					} else {
						LineObj[LineKey] = parseInt(ExLineKey);
						LineIdObj[tempID] = Lo;
					}
					//NEW VERSION
					if (LineDetails.hasOwnProperty(LineKey)) {
						if (parseInt(ExLineKey) > parseInt(LineDetails[LineKey]["ExLineKey"])) {
							LineDetails[LineKey] = {
								"ExLineKey": ExLineKey,
								"tempID": tempID,
								"LineKey": LineKey,
								"LineResultIndex": Lo,
								"OrderItem": LineOrderItem,
								"OrderHeader": OrderHeaderClean,
								"InternalID": InternalID
							};
						}
					} else {
						LineDetails[LineKey] = {
							"ExLineKey": ExLineKey,
							"tempID": tempID,
							"LineKey": LineKey,
							"LineResultIndex": Lo,
							"OrderItem": LineOrderItem,
							"OrderHeader": OrderHeaderClean,
							"InternalID": InternalID
						};
					}
				}

				/**        Logic for Multi-Order Loads will work as follows:
				 - Load Lines will be grouped by orders, identified using unique OrderHeaderKeys
				 --- For transactions existing prior to a change made in April 2019 this will need to be lookup up from other sync records which may not exist
				 ----- The lookup path is Load Header -> Load Line -> Order Item (Line) -> Order Header
				 --- For transactions existing at/after the change, this will be stored on the Load Lines and always exist
				 - In the case where the OrderHeaderKey cannot be found, this will be set as "0"
				 - Loads will ONLY be split if there are CONFIRMED different keys, which mean lines set as '0' will be set to another OrderHeaderKey if possible
				 --- This is to prevent creating excessive amounts of invoices that then need to be managed
				 - If some lines have OrderHeaderKey '12345' and others were unable to link and are set as '0', all will be combined in one order for '12345'
				 - Lines with '0' will always be merged to the lowest OrderHeaderKey found
				 - If no OrderHeaderKeys can be linked, all lines will be created on one transaction with the OrderHeaderKey '0'

				 - In update operations, if an invoice exists with OrderHeaderKey '0' it will be updated to be the lowest OrderHeaderKey that does not have an invoice.
				 **/

				nlapiLogExecution('DEBUG', 'CHECK ORDER HEADERS', JSON.stringify(LineDetails));

				var uniqueOrderHeaderKeys = [];
				var completedInvoices = [];
				for (var lineKey in LineDetails) {
					if (LineDetails.hasOwnProperty(lineKey)) {
						if (LineDetails[lineKey]["OrderHeader"] == "") {
							//Find Order Header Key
							OrderItemKey = LineDetails[lineKey]["OrderItem"];
							nlapiLogExecution('DEBUG', 'OHKTest Input', 'OrderItemKey: ' + OrderItemKey);
							var filters = [['custrecord_syncwmorditem_orderitemkey', 'is', OrderItemKey]];
							var columns = [];
							columns[0] = new nlobjSearchColumn('internalid');
							columns[1] = new nlobjSearchColumn('custrecord_syncwmorditem_orderheaderkey');
							columns[2] = new nlobjSearchColumn('custrecord_syncwmorditem_exchtxkey').setSort(true);
							var searchForOHK = nlapiSearchRecord('customrecord_syncwmorderdetail', null, filters, columns) || [];
							nlapiLogExecution('DEBUG', 'OHK Test Length', searchForOHK.length);
							if (searchForOHK.length > 0) {
								var currHeadKey = searchForOHK[0].getValue('custrecord_syncwmorditem_orderheaderkey');
								LineDetails[lineKey]["OrderHeader"] = currHeadKey;
								if (uniqueOrderHeaderKeys.indexOf(currHeadKey) == -1) {
									uniqueOrderHeaderKeys.push(currHeadKey);
									nlapiLogExecution('DEBUG', 'OHKTest', 'PATH A, length: ' + searchForOHK.length + ' currHeadKey: ' + currHeadKey);
								} //TODO: Add Handling later if uniqueOrderHeaderKeys is empty
								else {
									nlapiLogExecution('DEBUG', 'OHKTest', 'PATH B, length: ' + searchForOHK.length + ' currHeadKey: ' + currHeadKey);
								}
							} else {
								LineDetails[lineKey]["OrderHeader"] = "0";
								if (uniqueOrderHeaderKeys.indexOf("0") == -1) {
									uniqueOrderHeaderKeys.push("0");
									nlapiLogExecution('DEBUG', 'OHKTest', 'PATH C, length: ' + searchForOHK.length);
								} else {
									nlapiLogExecution('DEBUG', 'OHKTest', 'PATH D, length: ' + searchForOHK.length);
								}
							}
						} else {
							//Keep Order Header Key from Load Detail Line
							var currHeadKey = LineDetails[lineKey]["OrderHeader"];
							if (uniqueOrderHeaderKeys.indexOf(currHeadKey) == -1) {
								uniqueOrderHeaderKeys.push(currHeadKey);
								nlapiLogExecution('DEBUG', 'OHKTest', 'PATH E, currHeadKey: ' + currHeadKey);
							} //TODO: Add Handling later if uniqueOrderHeaderKeys is empty
							else {
								nlapiLogExecution('DEBUG', 'OHKTest', 'PATH F, currHeadKey: ' + currHeadKey);
							}
						}
					}
				}

				nlapiLogExecution('DEBUG', 'CHECK ORDER HEADERS AFTER', JSON.stringify(LineDetails));

				//Resolve cases where some order header keys were not found and are '0'
				//Error if no keys as invoice loop below will not run, no action taken if only one key (must remain as '0' or as it's value)
				var overrideKey = "0";
				if (uniqueOrderHeaderKeys.length < 1) {
					throw nlapiCreateError('error', 'List of Valid Order Header Keys is empty, script cannot run - please investigate.');
				} else if (uniqueOrderHeaderKeys.length > 1 && uniqueOrderHeaderKeys.indexOf("0") != -1) {
					uniqueOrderHeaderKeys.sort(function (a, b) {
						return a - b;
					});
					uniqueOrderHeaderKeys.splice(testArr.indexOf("0"), 1);
					overrideKey = uniqueOrderHeaderKeys[0];
					for (var lineKey in LineDetails) {
						if (LineDetails.hasOwnProperty(lineKey)) {
							if (LineDetails[lineKey]["OrderHeader"] == "0") {
								LineDetails[lineKey]["OrderHeader"] = overrideKey;
							}
						}
					}
				}

				//Continue here

				/** Invoice in Sub5 **/

				/** PLACEHOLDER - ADD INV TRANSFER HERE **/
				//TC10ROD 10122019 - deprecated as of 10122019, locationToConsigneeMap will now be define locations with value in the consignee key field
				/*var locationToConsigneeMap = [
					{
						locationInternalId: '231', //ANS Active Warehousing 5 Edm
						consigneeKey: '6678'
					},
					{
						locationInternalId: '211', //ANS Intact Warehouse-In Transit
						consigneeKey: '6582'
					},
					{
						locationInternalId: '232', //ANS MTE Logistix Calgary #2
						consigneeKey: '6673'
					},
					{
						locationInternalId: '230', //ANS MTE Logistix Calgary Inc.
						consigneeKey: '6421'
					}
				];*/
				
				var locationToConsigneeMap = get_locationToConsigneeMap()
				
				/** START OF DIFFERENCES **/
				
				var locationConsigneeObj = _.find(locationToConsigneeMap, {consigneeKey: searchResults[HeadIndex].getValue('custrecord_syncwmloadhead_consigneekey')});
				//1.2.2 - TC10ROD && Mark Sullivan, a way to find location id based on shipping key
				
				//TC10ROD 04282020 - 1.2.2 quick fix as agreed with mark
				var SHIPPER_CONSIGNEE_KEY_FOR_LOCATION = {
					'3' : { conskey : '6170'},
					'4' : { conskey : '6357'},
					'5' : { conskey : '6358'},
					'6' : { conskey : '6356'},
					'7' : { conskey : '6359'},
					'8' : { conskey : '6386'},
					'10' : { conskey : '6421'},
					'13' : { conskey : '6422', hardcodedval : '231'}, //231 is ANC Active Warehousing 5 Edm
					'15' : { conskey : '6423'},
					'16' : { conskey : '6514'},
					'20' : { conskey : '6582'},
					'29' : { conskey : '6616'},
					'33' : { conskey : '6667'},
					'34' : { conskey : '6667'},
					'35' : { conskey : '6673'},
					'37' : { conskey : '6675'},
					'38' : { conskey : '6678'},
					'39' : { conskey : '5917'},
					'39' : { conskey : '5917'},
					'40' : { conskey : '5917'},
					'40' : { conskey : '5917'},
					'41' : { conskey : '6694'},
					'43' : { conskey : '6719'},
				}
				
				var shipperConsigneeKey = SHIPPER_CONSIGNEE_KEY_FOR_LOCATION['' + searchResults[HeadIndex].getValue('custrecord_syncwmloadhead_shipperkey')].conskey;
				shipperConsigneeKey = shipperConsigneeKey ? shipperConsigneeKey : SHIPPER_CONSIGNEE_KEY_FOR_LOCATION['' + searchResults[HeadIndex].getValue('custrecord_syncwmloadhead_shipperkey')].hardcodedval;
				shipperConsigneeKey = shipperConsigneeKey ? shipperConsigneeKey : "";
				var locationShipperObj = _.find(locationToConsigneeMap, {consigneeKey: shipperConsigneeKey});
                if (locationConsigneeObj) {
                    tempShippedDate = SyncWMRecord.getFieldValue('custrecord_syncwmloadhead_dateshipped');
                    adjDate = validateShipDate(tempShippedDate, SyncWMID);
                    /**transferInventory(adjDate, cutoffDate, "", SyncWMRecord, LineIdObj, searchLineResults, locationConsigneeObj);**/
//					throw nlapiCreateError('ERROR','INTENTIONAL ERROR: Warehouse Consignee');
					
                    //1.1.1 - TC10ROD 10122019 - re enable transfer inventory function call, comment out throwing error.
                    //LineIdObj should  be LineDetails 
                    //transferInventory(adjDate, cutoffDate, "", SyncWMRecord, LineIdObj, searchLineResults, locationConsigneeObj);
                    
                  //1.2.2 - TC10ROD && Mark Sullivan, a way to find location id based on shipping key, added locationShipperObj to arguments
                    transferInventory(adjDate, cutoffDate, "", SyncWMRecord, LineIdObj, searchLineResults, locationConsigneeObj, locationShipperObj);
                    
                    // nlapiLogExecution('ERROR', 'Error in creating Inventory transfer', e.message);
                } else {
					if(searchResults[HeadIndex].getValue('custrecord_syncwmloadhead_customerkey') != '5786' && searchResults[HeadIndex].getValue('custrecord_syncwmloadhead_consigneekey') != '6582') {
						
						//Start of Logic Section for MOL
						//Get All Existing Invoices in Sub5
						var filters = [
							['custbody_wmid','is',SyncWMRecord.getFieldValue('custrecord_syncwmloadhead_loadheadkey')], 'AND',
							['subsidiary','is','5']
						];
						var columns = [];
						columns[0] = new nlobjSearchColumn('internalid');
						columns[1] = new nlobjSearchColumn('custbody_wmorderheaderkey');
						columns[2] = new nlobjSearchColumn('custbody_lockfromintegrationchanges');
						var searchInvoice5 = nlapiSearchRecord('invoice',null,filters,columns);
						
						var checkInvKeys = [];
						var checkLoadKeys = (uniqueOrderHeaderKeys.indexOf("0") > -1) ? uniqueOrderHeaderKeys : uniqueOrderHeaderKeys.concat(["0"]);
						if(searchInvoice5) {
							for(k=0; k<searchInvoice5.length; k++){
								var currInvKey = searchInvoice5[k].getValue('custbody_wmorderheaderkey');
								if((currInvKey == "" || currInvKey == "0" || currInvKey == null) && true) { currInvKey == "0"; }
								if(checkInvKeys.indexOf(currInvKey) == -1) {checkInvKeys.push(currInvKey);}
							}

						}
						
						//Run Once per OrderHeaderKey
						var successText = 'Error updating SuccessText - please verify in script. ---';
						var currOHKey = [];
						nlapiLogExecution('DEBUG','BEFORE OHK LOOP','uniqueOrderHeaderKeys: '+uniqueOrderHeaderKeys+' overrideKey: '+overrideKey);
						for(ordKey = 0; ordKey < uniqueOrderHeaderKeys.length; ordKey++) {
							currOHKeys = (uniqueOrderHeaderKeys[ordKey] == overrideKey) ? [overrideKey, "0"] : [uniqueOrderHeaderKeys[ordKey]];
							
							nlapiLogExecution('DEBUG','EACH OHK LOOP','currOHKeys: '+currOHKeys);
							
							//var successText = 'Error updating SuccessText - please verify in script. ---';
							var ValidCustomer = 0;
							if (checkInvKeys.indexOf(uniqueOrderHeaderKeys[ordKey]) > -1) {
								//Update Invoice in Subsidiary 5
								currInvID = -1;
								for(k=0; k<searchInvoice5.length; k++){
									if(searchInvoice5[k].getValue('custbody_wmorderheaderkey') == uniqueOrderHeaderKeys[ordKey]) {currInvID = searchInvoice5[k].getValue('internalid'); }
								}
								Record5 = nlapiLoadRecord('invoice',currInvID);
								Record5.setFieldValue('customform','148'); //Set Form to Invoice - ANS
								//if (Record5.getFieldValue('custbody_lockfromintegrationchanges') == 'T') {throw nlapiCreateError('error','Invoice with Internal ID '+searchInvoice5[0].getValue('internalid')+' has been locked from integration changes but an update was receieved. Please investigate to see if the update is valid and resolve with the finance team.'); }
								if (Record5.getFieldValue('custbody_lockfromintegrationchanges') == 'T') {
									nlapiSubmitField('customrecord_syncwmloadheader',SyncWMID,['custrecord_syncwmloadhead_syncstatus',
										"custrecord_syncwmloadhead_errormessage"],
										[4, 'Invoice with Internal ID '+searchInvoice5[0].getValue('internalid')+' has been locked from integration changes but an update was receieved. Please investigate to see if the update is valid and resolve with the finance team.']);
									//findNextRecord(); //TC10ROD continue to next record
									//return;
									//11212019 - DO NOT TERMINATE, proceed with the next order or allocation
									continue;
									}
								ValidCustomer = validateCustomer(searchResults[HeadIndex].getValue('custrecord_syncwmloadhead_customerkey'));
								totalLines = Record5.getLineItemCount('item');
								if(totalLines > 0){
									for (n=totalLines; n>0; n--) { Record5.removeLineItem('item',n); }
								} else {
									throw nlapiCreateError('error','Invoice Record exists but unable to get number of lines to remove lines - update cancelled');
								}
								successText = successText + 'Updated Invoice record with Internal ID ';
							} else {
								//Create Invoice in Subsidiary 5
								Record5 = nlapiCreateRecord('invoice');
								Record5.setFieldValue('customform','148'); //Set Form to Invoice - ANS
								ValidCustomer = validateCustomer(searchResults[HeadIndex].getValue('custrecord_syncwmloadhead_customerkey'));
								Record5.setFieldValue('entity',ValidCustomer);
								Record5.setFieldValue('subsidiary','5');
								successText = successText + 'Created Invoice record with Internal ID ';
							}
							
							//TC10ROD 10112019 set wminvoicenumber
							Record5.setFieldValue('custbody_wminvoicenumber', syncWMRecord_wminvoicenumber)
							
							// Transaction Date, Ship Date, Allocation Date are all stored on Invoice. Logic determines which is used as Pricing Date.
							shipDate = validateShipDate(SyncWMRecord.getFieldValue('custrecord_syncwmloadhead_dateshipped'),SyncWMRecord.getFieldValue('internalid'));
							nlapiLogExecution('debug','Initial Ship Date',shipDate);
							
							ValidConsignee = validateConsignee(searchResults[HeadIndex].getValue('custrecord_syncwmloadhead_consigneekey'),ValidCustomer);
							Record5.setFieldValue('custbody_consignee',ValidConsignee);
							Record5.setFieldValue('custbody_wmorderheaderkey',uniqueOrderHeaderKeys[ordKey]);
							Record5.setFieldValue('trandate',nlapiDateToString(shipDate,'date')); //Set to DateShipped
							Record5.setFieldValue('custbody_pefctransaction',nlapiLookupField('customer',ValidCustomer,'custentity_pefc'));
							Record5.setFieldValue('custbody_wmpricingdate',nlapiDateToString(shipDate,'date')); //Default Pricing Date to DateShipped, may be overwritten by Allocation Date later
							Record5.setFieldValue('custbody_wmdateshipped',nlapiDateToString(shipDate,'date'));
							Record5.setFieldValue('memo','Created from WM Load No '+searchResults[HeadIndex].getValue('custrecord_syncwmloadhead_loadno'));
							Record5.setFieldValue('location','9'); //Hardcode to ANC Whitecourt Warehouse**/
							Record5.setFieldValue('custbody_wmid',searchResults[HeadIndex].getValue('custrecord_syncwmloadhead_loadheadkey'));
							Record5.setFieldValue('custbody4',searchResults[HeadIndex].getValue('custrecord_syncwmloadhead_loadno')); //Load Number
							Record5.setFieldValue('custbody_wmcountry',searchResults[HeadIndex].getValue('custrecord_syncwmloadhead_country'));
							Record5.setFieldValue('custbody_wmstateprovince',searchResults[HeadIndex].getValue('custrecord_syncwmloadhead_stateprovince'));
							Record5.setFieldValue('custbody_wmcity',searchResults[HeadIndex].getValue('custrecord_syncwmloadhead_city'));
							Record5.setFieldValue('custbody_wmpostalcode',searchResults[HeadIndex].getValue('custrecord_syncwmloadhead_postalcode'));
							
							//Set Shipping Address to Consignee
							Record5.setFieldValue('shipaddresslist',-2);
							//Record5.setFieldValue('shipoverride','T');
							validCountry = validateCountry(searchResults[HeadIndex].getValue('custrecord_syncwmloadhead_country'));
							Record5.setFieldValue('shipcountry',validCountry);
							Record5.setFieldValue('shipattention','');
							Record5.setFieldValue('shipaddressee',searchResults[HeadIndex].getValue('custrecord_syncwmloadhead_consaddrname'));
							Record5.setFieldValue('shipaddrphone','');
							Record5.setFieldValue('shipaddr1',searchResults[HeadIndex].getValue('custrecord_syncwmloadhead_address'));
							Record5.setFieldValue('shipaddr2','');
							Record5.setFieldValue('shipcity',searchResults[HeadIndex].getValue('custrecord_syncwmloadhead_city'));
							Record5.setFieldValue('shipstate',searchResults[HeadIndex].getValue('custrecord_syncwmloadhead_stateprovince'));
							Record5.setFieldValue('shipzip',searchResults[HeadIndex].getValue('custrecord_syncwmloadhead_postalcode'));
							fullAddress = searchResults[HeadIndex].getValue('custrecord_syncwmloadhead_consaddrname')+'\n'+
										searchResults[HeadIndex].getValue('custrecord_syncwmloadhead_address')+'\n'+
										searchResults[HeadIndex].getValue('custrecord_syncwmloadhead_city')+' '+
										searchResults[HeadIndex].getValue('custrecord_syncwmloadhead_stateprovince')+' '+
										searchResults[HeadIndex].getValue('custrecord_syncwmloadhead_postalcode')+'\n'+
										searchResults[HeadIndex].getValue('custrecord_syncwmloadhead_country');
							Record5.setFieldValue('shipaddress',fullAddress); //Use to set full address if necessary
							
							//Get Values from Vendor Bill
							/*var headKey = searchResults[HeadIndex].getValue('custrecord_syncwmloadhead_loadheadkey');
							var filters = [
								['custrecord_syncwmfrtinvline_loadheadkey','is',headKey]
							];
							var columns = [];
							columns[0] = new nlobjSearchColumn('custrecord_syncwmfrtinvline_frtinvheadky');
							columns[1] = new nlobjSearchColumn('custrecord_syncwmfrtinvline_exchtxkey').setSort(true);
							var searchFreightLine = nlapiSearchRecord('customrecord_syncwmfrinvline',null,filters,columns);
							if(searchFreightLine) {
								var FreightHeadKey = searchFreightLine[0].getValue('custrecord_syncwmfrtinvline_frtinvheadky');

								var filters2 = [
									['custrecord_syncwmfrtinv_carrinvheaderkey','is',FreightHeadKey]
								];
								var columns2 = [];
								columns2[0] = new nlobjSearchColumn('custrecord_syncwmfrtinv_carrierkey');
								columns2[1] = new nlobjSearchColumn('custrecord_syncwmfrtinv_exchtxkey').setSort(true);
								var searchFreight = nlapiSearchRecord('customrecord_syncwmfreightinvoice',null,filters2,columns2);
								if(searchFreight) {
									var CarrierKey = searchFreight[0].getValue('custrecord_syncwmfrtinv_carrierkey');

									var filters3 = [
										['custentity_wmid','is',CarrierKey]
									];
									var columns3 = [];
									columns3[0] = new nlobjSearchColumn('companyname');
									columns3[1] = new nlobjSearchColumn('internalid').setSort(true);
									var searchCarrier = nlapiSearchRecord('vendor',null,filters3,columns3);
									
									if(searchCarrier) {
										Record5.setFieldValue('custbody_wm_carriername',searchCarrier[0].getValue('companyname'));
									}
								}
							}*/
							var CarrierKey = searchResults[HeadIndex].getValue('custrecord_syncwmloadhead_carrierkey');

							var filters3 = [
								['custentity_wmid','is',CarrierKey]
							];
							var columns3 = [];
							columns3[0] = new nlobjSearchColumn('companyname');
							columns3[1] = new nlobjSearchColumn('internalid').setSort(true);
							var searchCarrier = nlapiSearchRecord('vendor',null,filters3,columns3);
							
							if(searchCarrier) {
								Record5.setFieldValue('custbody_wm_carriername',searchCarrier[0].getValue('companyname'));
							}
							
							Record5.setFieldValue('custbody_wm_carrierunitnumber',searchResults[HeadIndex].getValue('custrecord_syncwmloadhead_vehicleno'));
							
							//Translate Shipping Method
							Record5.setFieldValue('shipmethod',translateShippingMethod(searchResults[HeadIndex].getValue('custrecord_syncwmloadhead_transmodekey')));
							
							//End of Field Values from Vendor Bill
							
							nlapiLogExecution('debug','Check Line Obj',JSON.stringify(LineObj));
							nlapiLogExecution('debug','Check Line Id Obj',JSON.stringify(LineIdObj));
							
							var ctLines = 0;
							var waitingForRecords = true;
							var foundAllocationMonthOnOrder = false;
							//var uniqueOrderHeaderKeys = []; //TODO: Make sure this is not reset/modified in the line creation loop
							
							//LineDetails[LineKey] = {"ExLineKey":ExLineKey, "tempID":tempID, "LineKey":LineKey, "LineResultIndex":Lo, "OrderItem":LineOrderItem, "OrderHeader":""};
							
							for(var lineKey in LineDetails) {
								if(LineDetails.hasOwnProperty(lineKey)) {
									if(currOHKeys.indexOf(LineDetails[lineKey]["OrderHeader"]) > -1){
										var lineItem = '';
										var lastIndex = -1;
										LineRec = nlapiLoadRecord('customrecord_syncwmloaddetail',LineDetails[lineKey]["InternalID"]);
										
										//Check if Line is invalid and needs to be skipped
										//LOAD DETAIL LINES WITH Shipped 0, To Ship 0 and Inventory Listy Empty can be ignored
										testQtyToShip = LineRec.getFieldValue('custrecord_syncwmloaddet_rollstoship');
										testQtyShipped = LineRec.getFieldValue('custrecord_syncwmloaddet_rollsshipped');
										testInvList = LineRec.getFieldValue('custrecord_syncwmloaddet_inventorylist');
										if ((testQtyToShip == '0' || testQtyToShip == 0) && (testQtyShipped == '0' || testQtyShipped == 0) && testInvList == '') {
											//Ignore Line - line was deleted in WM and is invalid for processing
										} else {
											//Only process item if positive shipped quantity
											if(LineRec.getFieldValue('custrecord_syncwmloaddet_rollsshipped') > 0) {
										
												//Load OrderItem Record
												var filters = [['custrecord_syncwmorditem_orderitemkey','is',LineRec.getFieldValue('custrecord_syncwmloaddet_orderitemkey')]];
												var columns = [];
												columns[0] = new nlobjSearchColumn('internalid');
												columns[1] = new nlobjSearchColumn('custrecord_syncwmorditem_orderheaderkey');
												columns[2] = new nlobjSearchColumn('custrecord_syncwmorditem_gradekey');
												columns[3] = new nlobjSearchColumn('custrecord_syncwmorditem_width');
												columns[4] = new nlobjSearchColumn('custrecord_syncwmorditem_diameter');
												columns[5] = new nlobjSearchColumn('custrecord_syncwmorditem_rollsperpack');
												columns[6] = new nlobjSearchColumn('custrecord_syncwmorditem_exchtxkey').setSort(true);
												columns[7] = new nlobjSearchColumn('custrecord_syncwmorderitem_spotprice');
												//columns[8] = new nlobjSearchColumn('custrecord_syncwmorditem_orderunittype');
												searchOrderItem = nlapiSearchRecord('customrecord_syncwmorderdetail',null,filters,columns);
												
												tempNumbers = LineRec.getFieldValue('custrecord_syncwmloaddet_inventorylist');
												tempSerialNumberArray = tempNumbers.split(',') || [];
												
												if(searchOrderItem) {
													lineItem = getSalesItem('ZZZZ'+searchOrderItem[0].getValue('custrecord_syncwmorditem_gradekey'));
													
													/** Current Working Zone for Multi-Load Orders **/
													/**
													//Check for Unique Order Header Keys to split in 2 Order, 1 Load scenario. Create Error until logic added.
													//Should Identify Unique Keys from Order Details even if Order Header cannot be loaded.
													currentOrderHeaderKey = searchOrderItem[0].getValue('custrecord_syncwmorditem_orderheaderkey');
													if(uniqueOrderHeaderKeys.indexOf(currentOrderHeaderKey) == -1) { uniqueOrderHeaderKeys.push(currentOrderHeaderKey); }
													if(uniqueOrderHeaderKeys.length > 1) { throw nlapiCreateError('error','Multi-Order Load, Currently Erroring Until Fixed for Order Header Keys '+uniqueOrderHeaderKeys); }
													**/
													
													//Update Invoice Date to check Allocation Month if Order is linked - source of Allocation Month
													var filters = [['custrecord_syncwmorderhead_orderheadkey','is',searchOrderItem[0].getValue('custrecord_syncwmorditem_orderheaderkey')]];
													var columns = [];
													columns[0] = new nlobjSearchColumn('internalid');
													columns[1] = new nlobjSearchColumn('custrecord_syncwmorderhead_orderheadkey');
													columns[2] = new nlobjSearchColumn('custrecord_syncwmorderhead_dateallocmnth');
													columns[3] = new nlobjSearchColumn('custrecord_syncwmorderhead_exchtxkey');
													columns[4] = new nlobjSearchColumn('custrecord_syncwmorderhead_pono');
													columns[5] = new nlobjSearchColumn('custrecord_syncwmorderhead_orderno');
													searchOrderHead = nlapiSearchRecord('customrecord_syncwmorderheader',null,filters,columns);
													
													if(searchOrderHead && foundAllocationMonthOnOrder == false) {
														maxkey = 0;
														TxKey = 0;
														for(n=0; n<searchOrderHead.length; n++) {
															if(parseInt(searchOrderHead[n].getValue('custrecord_syncwmorderhead_exchtxkey')) > parseInt(TxKey)) {
																	maxkey = n;
																	TxKey = searchOrderHead[n].getValue('custrecord_syncwmorderhead_exchtxkey');
															}

														}
														
														Record5.setFieldValue('otherrefnum',searchOrderHead[maxkey].getValue('custrecord_syncwmorderhead_pono')); //PO NUMBER
														Record5.setFieldValue('custbody_wm_millordernumber',searchOrderHead[maxkey].getValue('custrecord_syncwmorderhead_orderno')); //Order Number
														customerBilledByShipDate = nlapiLookupField('customer',ValidCustomer,'custentity_billedbyshipdate');
														allocationMonth = searchOrderHead[maxkey].getValue('custrecord_syncwmorderhead_dateallocmnth');
														Record5.setFieldValue('custbody14',allocationMonth);
														dateAllocParts = allocationMonth.substring(0,10).split('-');
														cleanAllocDate = new Date(dateAllocParts[0],dateAllocParts[1]-1,dateAllocParts[2]);
														Record5.setFieldValue('custbody_wmallocationdate',nlapiDateToString(cleanAllocDate,'date'));
														tempDate = validateDate(null,SyncWMRecord.getFieldValue('custrecord_syncwmloadhead_dateshipped'),allocationMonth,customerBilledByShipDate,SyncWMRecord.getFieldValue('internalid'));
														Record5.setFieldValue('custbody_wmpricingdate',nlapiDateToString(tempDate,'date')); //Initially set to DateShipped - Updated to Allocation Month after rows if order match found (Allocation Month is only on Order)
														nlapiLogExecution('debug','Order Dates','allocationMonth: '+allocationMonth+' tempDate: '+tempDate+' OrderHeaderInternalID: '+searchOrderHead[maxkey].getValue('internalid'));
														foundAllocationMonthOnOrder = true;
														waitingForRecords = false;
													} else {
														//Unable to find Order for Allocation Month - do nothing
													}
												} else {
													nlapiLogExecution('audit','No Order Item Record Found','Unable to look up Order Item record for Order Item Key '+LineRec.getFieldValue('custrecord_syncwmloaddet_orderitemkey'));
													
													//Unable to connect OrderItem - get Item from Serial Number instead
													/** UNABLE TO SPLIT ERROR **/
													//tempNumbers = LineRec.getFieldValue('custrecord_syncwmloaddet_inventorylist');
													lineItem = translateItem(findInvItemFromSerialNumbers(tempNumbers,SyncWMID)); //ADDED TRANSLATE ITEM TO CONVERT INV TO NONINV
												}
																					
												//Add item
												nlapiLogExecution('audit', 'Item Value', 'Current Item Value is ' + lineItem);
												var lineItemsArray = [];
												var tempQuantity = LineRec.getFieldValue('custrecord_syncwmloaddet_weightshipped');
												/**LOCATION OF SERIAL NUMBER ERROR **/
												tempSerialNumberArray.forEach(function (sN) {
												//for(n=0; n<1; n++) {
													sN = tempSerialNumberArray[0];
													var _serialNumberLookup = serialNumberLookup(sN, SyncWMID);
													if(_serialNumberLookup['type'] == "InventoryItem"){
														_serialNumberLookup['translateItem'] = translateItem(_serialNumberLookup['itemInternalId']);
														_serialNumberLookup['translateLoc'] = translateLocation(_serialNumberLookup['locationInternalId']);
														lineItemsArray.push(_serialNumberLookup);
													} else {
														_serialNumberLookup['translateItem'] = translateItem(validateItem('SALE'+_serialNumberLookup['GradeKey']));
														_serialNumberLookup['translateLoc'] = '9'
														lineItemsArray.push(_serialNumberLookup);
													}
												//}
												});
												nlapiLogExecution('DEBUG', 'tempSerialNumberArray', JSON.stringify(tempSerialNumberArray));
												var lineItemsArrayGrouped = _.groupBy(lineItemsArray, function (e) {
													return e.translateItem;
												});
												for (var itemInternalId in lineItemsArrayGrouped) {
													lineItemsArrayGrouped[itemInternalId] = _.groupBy(lineItemsArrayGrouped[itemInternalId], function (e) {
														return e.translateLoc;
													});
												}

												for (var itemInternalId in lineItemsArrayGrouped) {
													for (var locInternalId in lineItemsArrayGrouped[itemInternalId]) {
														var totalQty = parseFloat(LineRec.getFieldValue('custrecord_syncwmloaddet_weightshipped'));
														var totalRolls = parseFloat(LineRec.getFieldValue('custrecord_syncwmloaddet_rollsshipped'));

														var thisGroupRolls = lineItemsArrayGrouped[itemInternalId][locInternalId].length;
														//var percentageWeight = thisGroupRolls / totalRolls;
														//tempQuantity = totalQty * percentageWeight;

														Record5.selectNewLineItem('item');
														Record5.setCurrentLineItemValue('item', 'item', itemInternalId);
														Record5.setCurrentLineItemValue('item', 'location', locInternalId);
														Record5.setCurrentLineItemValue('item', 'department', '211');
														tempQuantity = LineRec.getFieldValue('custrecord_syncwmloaddet_weightshipped') / 1000;
														Record5.setCurrentLineItemValue('item', 'quantity', tempQuantity);
														//1.1.3
														var orderDetail_unitOfMeasureText = "";
														
														// ***---***
														nlapiLogExecution('DEBUG','STARTING SPOT PRICING','');
														//if(!headerNonZero){//check that the header price is a valid price
															var spotPricing = null;
															if(searchOrderItem) {
																nlapiLogExecution('DEBUG','SPOT PRICE - ORDER EXISTS','');
																nlapiLogExecution('DEBUG','10252019 orderdetail internalid',searchOrderItem[0].getId());
																nlapiLogExecution('DEBUG','10252019 searchOrderItem[0]',searchOrderItem[0]);
																nlapiLogExecution('DEBUG','10252019 JSON.stringify(searchOrderItem[0])',JSON.stringify(searchOrderItem[0]));
																spotPricing = searchOrderItem[0].getValue('custrecord_syncwmorderitem_spotprice');//check for detail spot price
																nlapiLogExecution('DEBUG','10252019 spotPricing1', spotPricing);
																//1.1.3
																orderDetail_unitOfMeasureText = searchOrderItem[0].getValue('custrecord_syncwmorditem_orderunittype') || "";
															}
															nlapiLogExecution('DEBUG','10252019 spotPricing',spotPricing);
															var nonZero = isNonZero(spotPricing);//check that detail spot pricing is not zero
															nlapiLogExecution('DEBUG','10252019 nonZero',nonZero);
															if(nonZero){
																itemPrice = spotPricing;//override pricing with detail
																nlapiLogExecution('DEBUG','SPOT PRICING EXISTS',itemPrice);
																Record5.setFieldValue('custbody_spot_price_flag','T');//turn on spot price flag
																Record5.setFieldValue('custbody_elev_approval','T'); //turn on elevated approval flag
															}else{
																nlapiLogExecution('DEBUG','lineItem: '+lineItem+' validCustomer: '+ValidCustomer+' validConsignee '+ValidConsignee+' tempDate: '+tempDate);
																itemPrice = validateConsigneePrice(lineItem, ValidCustomer, ValidConsignee, tempDate);//default to original pricing method
																nlapiLogExecution('DEBUG','SPOT PRICING DOES NOT EXIST',itemPrice);
															}
														nlapiLogExecution('DEBUG','ENDING SPOT PRICING','');
														//}
														//else{
															//itemPrice = headerSpotPricing;//override pricing with header
															//Record5.setFieldValue('custbody_spot_price_flag','T');//turn on spot price flag
															//Record5.setFieldValue('custbody_elev_approval','T'); //turn on eleveated approval flag
														//}

														
														nlapiLogExecution('DEBUG','SPOT PRICING RATE USED',itemPrice);
														//for UnitOfMeasure text //1.1.3
														Record5.setCurrentLineItemValue('item', 'custcol_wm_inv_unitofmeasure', orderDetail_unitOfMeasureText);
														Record5.setCurrentLineItemValue('item', 'rate', itemPrice);
														Record5.setCurrentLineItemValue('item', 'amount', itemPrice * tempQuantity);
														// Record5.setCurrentLineItemValue('item', 'custcol_wm_numberofrolls', LineRec.getFieldValue('custrecord_syncwmloaddet_rollsshipped'));
														Record5.setCurrentLineItemValue('item', 'custcol_wm_numberofrolls', thisGroupRolls);

														if (searchOrderItem) {
															var baseDescription = "Width: " + searchOrderItem[0].getValue('custrecord_syncwmorditem_width') + ", Grade: " + searchOrderItem[0].getValue('custrecord_syncwmorditem_gradekey')
															Record5.setCurrentLineItemValue('item', 'custcol_wm_rollwidth', searchOrderItem[0].getValue('custrecord_syncwmorditem_width'));
															Record5.setCurrentLineItemValue('item', 'custcol_wm_linedescription', baseDescription);
															Record5.setCurrentLineItemValue('item', 'custcol_wm_rolldiameter', searchOrderItem[0].getValue('custrecord_syncwmorditem_diameter'));
															Record5.setCurrentLineItemValue('item', 'custcol_wm_rollsperpack', searchOrderItem[0].getValue('custrecord_syncwmorditem_rollsperpack'));
														}
														Record5.commitLineItem('item');
														ctLines++;
													}
												}
											}
										}
									}
								}
							}
							
							var nDate = Record5.getFieldValue('trandate').split('/');
							var tDate = new Date(nDate[2],nDate[0]-1,nDate[1]);
							if( tDate >= dontProcessBeforeDate ) {
							
								if(ctLines > 0) {
									if (waitingForRecords === true) {
										Record5.setFieldValue('custbody14','Unable to Link Order'); //ORDER ALLOCATION MONTH
										Record5.setFieldValue('otherrefnum','Unable to Link Order'); //PO NUMBER
										Record5.setFieldValue('custbody_wm_millordernumber','Unable to Link Order'); //MILL ORDER NUMBER
									}
									Record5ID = nlapiSubmitRecord(Record5);
									successText = successText + "" + Record5ID + ".";
									//completedInvoices.push(Record5ID);
									
									/*
									//Currently assuming all header lines succeed - need to improve this logic per-item
									for (n = 0; n<searchResults.length; n++) {
										//When doing Multi-Records, Comment Out Status=Complete Line until final record
										nlapiSubmitField('customrecord_syncwmloadheader',searchResults[n].getValue('internalid'),'custrecord_syncwmloadhead_syncstatus',4);
										errorNotes = (waitingForRecords === true) ? ' Unable to find matching Order for Invoice Record.' : '';
										nlapiSubmitField('customrecord_syncwmloadheader',searchResults[n].getValue('internalid'),'custrecord_syncwmloadhead_errormessage','' + successText + Record5ID + ' in Subsidiary 5.' + errorNotes);
										nlapiSubmitField('customrecord_syncwmloadheader',searchResults[n].getValue('internalid'),'custrecord_syncwmloadhead_nsid','Sub5-INV: '+Record5ID);
									}
									*/
									
									nlapiLogExecution('AUDIT','CALLSCHEDULEDSYNCWMLOAD','Invoice record with Internal ID '+Record5ID+' has been created in subsidiary 5.');
								} else {
									throw nlapiCreateError('error','No valid invoice lines were added - invoice creation has been cancelled');
								}
								
							} else {
								//throw nlapiCreateError('ERROR','Record is before July 1, 2019');
							}
							/** End of Invoice in Sub5 **/
						}
						
						//Currently assuming all header lines succeed - need to improve this logic per-item
								for (n = 0; n<searchResults.length; n++) {
									//When doing Multi-Records, Comment Out Status=Complete Line until final record
//									nlapiSubmitField('customrecord_syncwmloadheader',searchResults[n].getValue('internalid'),'custrecord_syncwmloadhead_syncstatus',4);
									//TC10ROD 09062019 CLEAR PRICING UPDATE CHECKBOX?
									//nlapiSubmitField('customrecord_syncwmloadheader',searchResults[n].getValue('internalid'),['custrecord_syncwmloadhead_syncstatus', "custrecord_syncwmloadhead_pricingupdate"],[4, 'F']);
									nlapiSubmitField('customrecord_syncwmloadheader',searchResults[n].getValue('internalid'),'custrecord_syncwmloadhead_syncstatus',4);
									errorNotes = (waitingForRecords === true) ? ' Unable to find matching Order for Invoice Record.' : '';
									nlapiSubmitField('customrecord_syncwmloadheader',searchResults[n].getValue('internalid'),'custrecord_syncwmloadhead_errormessage','' + successText + ' in Subsidiary 5.' + errorNotes);
									nlapiSubmitField('customrecord_syncwmloadheader',searchResults[n].getValue('internalid'),'custrecord_syncwmloadhead_nsid','Sub5-INV: '+completedInvoices);
								}
						
						//End of Logic Section for MOL
						
					} else if (searchResults[HeadIndex].getValue('custrecord_syncwmloadhead_customerkey') == '5786') {
						//Need to Remove Inventory
						//Customer is FP Innovations
						//throw nlapiCreateError('error','SKIPPED: This shipment is for FP Innovations and is not being processed.');
						
						tempShippedDate = SyncWMRecord.getFieldValue('custrecord_syncwmloadhead_dateshipped');
						adjDate = validateShipDate(tempShippedDate,SyncWMID);
						
						//11/14/2019 ANC TIME, commented out as kath is expecting inventory adjustments - start1 - TC10ROD
						removeInventory(adjDate,cutoffDate,"FP Innovations",SyncWMRecord,LineIdObj,searchLineResults);
						//11/14/2019 ANC TIME, commented out as kath is expecting inventory adjustments - start1 - TC10ROD
						
						/**removeInventory(adjDate,cutoffDate,"FP Innovations",SyncWMRecord,LineIdObj,searchLineResults); **/
						//11/14/2019 ANC TIME, commented out as kath is expecting inventory adjustments - start2 - TC10ROD
						//throw nlapiCreateError('ERROR','INTENTIONAL ERROR: FP Innovations');
						//11/14/2019 ANC TIME, commented out as kath is expecting inventory adjustments - start2 - TC10ROD
					} else if (searchResults[HeadIndex].getValue('custrecord_syncwmloadhead_consigneekey') == '6582') {
						//Need to Remove Inventory
						//Consignee is Intact Logistics
						//throw nlapiCreateError('error','SKIPPED: This shipment is for Intact Logistics and is not being processed.');
						
						try {
							tempShippedDate = SyncWMRecord.getFieldValue('custrecord_syncwmloadhead_dateshipped');
							adjDate = validateShipDate(tempShippedDate, SyncWMID);
							/**removeInventory(adjDate, cutoffDate, "FP Innovations", SyncWMRecord, LineIdObj, searchLineResults); **/
							throw nlapiCreateError('ERROR','INTENTIONAL ERROR: Intact Logistics');
						}
						catch(e) {
							nlapiSubmitField('customrecord_syncwmloadheader',SyncWMID,'custrecord_syncwmloadhead_errormessage','Failed to remove Inventory for Intact Logistics Load.');
						}
//						nlapiSubmitField('customrecord_syncwmloadheader',SyncWMID,'custrecord_syncwmloadhead_syncstatus',4);
						//TC10ROD 09062019 CLEAR PRICING UPDATE CHECKBOX?
						//nlapiSubmitField('customrecord_syncwmloadheader',searchResults[n].getValue('internalid'),['custrecord_syncwmloadhead_syncstatus', "custrecord_syncwmloadhead_pricingupdate"],[4, 'F']);
						nlapiSubmitField('customrecord_syncwmloadheader',SyncWMID,'custrecord_syncwmloadhead_syncstatus',4);
						nlapiSubmitField('customrecord_syncwmloadheader',SyncWMID,'custrecord_syncwmloadhead_errormessage','SKIPPED: Intact Logistics Load');
						nlapiSubmitField('customrecord_syncwmloadheader',SyncWMID,'custrecord_syncwmloadhead_retries',0);
					}
				}
				
				/** PLACEHOLDER - ADD INV TRANSFER HERE **/
				
				/** ****** **/
				
			} else if (searchResults) {
				nlapiLogExecution('debug', 'Head but no Line Results', 'Head: ' + searchResults);
				//No detail lines found, mark header lines as error - previously skipped but caused missed records
				for (x = 0; x < searchResults.length; x++) {
					nlapiSubmitField('customrecord_syncwmloadheader', searchResults[x].getValue('internalid'), 'custrecord_syncwmloadhead_syncstatus', 3); //Marking as error as load will be resent when lines are added
					nlapiSubmitField('customrecord_syncwmloadheader', searchResults[x].getValue('internalid'), 'custrecord_syncwmloadhead_errormessage', 'ERROR: No Detail Lines exist (often a timing issue) for LoadHeaderKey: ' + SyncWMRecord.getFieldValue('custrecord_syncwmloadhead_loadheadkey') + ' LoadNo: ' + SyncWMRecord.getFieldValue('custrecord_syncwmloadhead_loadno'));
					nlapiSubmitField('customrecord_syncwmloadheader', searchResults[x].getValue('internalid'), 'custrecord_syncwmloadhead_retries', 0);
					nlapiLogExecution('AUDIT', 'CALLSCHEDULEDSYNCWMLOAD', 'SyncWMLoad with Internal ID ' + searchResults[x].getValue('internalid') + ' has no detail lines.');
				}
			} else {
				nlapiLogExecution('debug', 'No Head or Line Results', 'No Head or Line Results');
				throw nlapiCreateError('error', 'No header lines found - issue with search parameters');
			}
		}
	} catch (e) {
		nlapiLogExecution('error', 'ScheduledSyncWMLoad() has encountered an error.', errText(e));
		nlapiSubmitField('customrecord_syncwmloadheader', SyncWMID, 'custrecord_syncwmloadhead_syncstatus', '3'); //Set SyncStatus = Error
		nlapiSubmitField('customrecord_syncwmloadheader', SyncWMID, 'custrecord_syncwmloadhead_errormessage', 'Error Details: ' + errText(e));
		tempRetries = nlapiLookupField('customrecord_syncwmloadheader', SyncWMID, 'custrecord_syncwmloadhead_retries');
		nlapiSubmitField('customrecord_syncwmloadheader', SyncWMID, 'custrecord_syncwmloadhead_retries', (tempRetries - 1));
		nlapiLogExecution('debug', 'CALLSCHEDULESYNCWMLOAD', 'ScheduledSyncWMLoadHeader has been updated with ' + (tempRetries - 1) + ' retries.');
	}
	findNextRecord(); //TC10ROD TODO temporarily disable
}

function findNextRecord() {
	//Check for additional records to add to processing queue
	var filters = [
		['custrecord_syncwmloadhead_syncstatus', 'anyof', [1, 3, 5]], 'AND',
		['custrecord_syncwmloadhead_retries', 'greaterthan', 0]
	];

	var columns = [];
	columns[0] = new nlobjSearchColumn('internalid');

	var searchResults = nlapiSearchRecord('customrecord_syncwmloadheader', null, filters, columns);

	if (searchResults) {
		var nextSyncWMID = searchResults[0].getValue('internalid');
		nlapiLogExecution('AUDIT', 'CALLSCHEDULEDSYNCWMLOAD', 'Additional records to sync found. Queueing ' + nextSyncWMID);
		var newParams = {'custscript_syncwmloadid': nextSyncWMID};
		var ScheduleStatus = nlapiScheduleScript(script_id, null, newParams); //Deployment is empty so that script selects first available deployment
		if (ScheduleStatus == 'QUEUED') {
			nlapiSubmitField('customrecord_syncwmloadheader', nextSyncWMID, 'custrecord_syncwmloadhead_syncstatus', '6');
		} //Else no available deployments - remaining records will be caught by periodic retry script
	} else {
		nlapiLogExecution('AUDIT', 'CALLSCHEDULEDSYNCWMLOAD', 'No records to sync found.');
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

function validateCustomer(customerKey) {
	if (customerKey == '' || customerKey == null) {
		throw nlapiCreateError('error', 'validateCustomer unable to find Customer for blank customerKey value');
	} else {
		var filters = [['custentity_wmid', 'is', customerKey]];
		var columns = [];
		columns[0] = new nlobjSearchColumn('internalid');
		var searchCustomers = nlapiSearchRecord('customer', null, filters, columns);
		if (searchCustomers) {
			return searchCustomers[0].getValue('internalid');
		} else {
			throw nlapiCreateError('error', 'validateCustomer unable to find matching Customer for customerKey ' + customerKey);
		}
	}
}

function validateConsignee(consigneeKey, CustKey) {
	//Check if Consignee Exists for current Customer
	//['custrecord_alberta_ns_consigneekey','is',consigneeKey], 'AND', ['custrecord_alberta_ns_customer','is',CustKey]
	var filters = [
		['custrecord_alberta_ns_consigneekey', 'is', consigneeKey], 'AND',
		['isinactive', 'is', 'F']
	];
	var columns = [];
	columns[0] = new nlobjSearchColumn('internalid');
	columns[1] = new nlobjSearchColumn('custrecord_alberta_ns_customer');
	var searchConsignees = nlapiSearchRecord('customrecord_alberta_ns_consignee_record', null, filters, columns);
	if (searchConsignees) {
		//ConsKey = searchConsignees[0].getValue('internalid');

		//Check if Consignee already connected to Customer
		var CustConsID = 99999999;
		//n=searchConsignees.length-1; n>-1; n--
		for (n = 0; n < searchConsignees.length; n++) {
			if (searchConsignees[n].getValue('custrecord_alberta_ns_customer') == CustKey && parseInt(searchConsignees[n].getValue('internalid')) < parseInt(CustConsID)) {
				CustConsID = searchConsignees[n].getValue('internalid');
			}
		}

		var CurrentRec = nlapiLoadRecord('customrecord_alberta_ns_consignee_record', searchConsignees[0].getValue('internalid'));
		if (CustConsID == 99999999) {
			//Consignee/Customer combination must be created
			NewRec = nlapiCreateRecord('customrecord_alberta_ns_consignee_record');
			NewRec.setFieldValue('custrecord_alberta_ns_ship_address', CurrentRec.getFieldValue('custrecord_alberta_ns_ship_address'));
			NewRec.setFieldValue('custrecord_alberta_ns_consigneekey', CurrentRec.getFieldValue('custrecord_alberta_ns_consigneekey'));
			NewRec.setFieldValue('custrecord_alberta_ns_ship_addrprovince', CurrentRec.getFieldValue('custrecord_alberta_ns_ship_addrprovince'));
			NewRec.setFieldValue('custrecord_alberta_ns_contact', CurrentRec.getFieldValue('custrecord_alberta_ns_contact'));
			NewRec.setFieldValue('custrecord_alberta_ns_consigneeno', CurrentRec.getFieldValue('custrecord_alberta_ns_consigneeno'));
			NewRec.setFieldValue('name', CurrentRec.getFieldValue('name'));
			NewRec.setFieldValue('custrecord_alberta_ns_customer', CustKey);

			throw nlapiCreateError('error', 'Attempting to create new Consignee for ConsigneeKey: ' + consigneeKey);

			NewRecID = nlapiSubmitRecord(NewRec);

			//7 is Lisa, 9 is Katherine, 836 is Matt
			emailFrom = "7";
			emailUser = "7";
			emailSubject = "NetSuite Integration - Wrapmation Consignee Created";
			emailCC = ["9", "836"]; //Should be array of strings - User IDs
			emailMessage = "While creating or updating a Wrapmation Load the validateConsignee function was unable to find a matching consignee for consigneeKey '" + consigneeKey + "' and customerKey '" + CustKey + "'.\n \n" +
				"New consignees are created when the integration script cannot find a matching consignee and the new consignee named '" + CurrentRec.getFieldValue('name') + "' is internalID '" + NewRecID + "'.";
			nlapiSendEmail(emailFrom, emailUser, emailSubject, emailMessage, emailCC);

			nlapiLogExecution('AUDIT', 'CALLSCHEDULEDSYNCWMORDER', 'Consignee record with Internal ID ' + NewRecID + ' has been created.');
			return NewRecID;
		} else {
			//Consignee/Customer combination exists
			nlapiLogExecution('AUDIT', 'CALLSCHEDULEDSYNCWMORDER', 'Consignee record with Internal ID ' + CustConsID + ' already exists.');
			return CustConsID;
		}
	} else {
		throw nlapiCreateError('error', 'No Consignee Found with matching WM ID (Consignee Key) for ' + consigneeKey + ' and Customer Key (IID)' + CustKey);
	}
}

/*
function validateConsigneePrice(salesItem,ValidCustomer,ValidConsignee,tranDate) {
	//var externalItemID = nlapiLookupField('noninventoryitem',tempExternalItem,'custitem_wmsalesitem');
	var filterType = '';
	var lookupMonths = ['jan','feb','march','april','may','june','july','august','sep','oct','nov','dec'];
	var tranYear = tranDate.getFullYear();
	var tranMonth = lookupMonths[tranDate.getMonth()];
	var monthField = 'custrecord_alberta_ns_month_'+tranMonth;
	if (salesItem == '' || salesItem == null) { throw nlapiCreateError('error','WM Sales Item value is missing on non-inventory item '+salesItem+', unable to get line pricing.'); }
	var priceFilters = [];
	
	if(ValidConsignee == '' || ValidConsignee == null) {
		if (ValidCustomer == '' || ValidConsignee == null) { throw nlapiCreateError('error','Customer and Consignee Key are both missing, unable to get line pricing'); }
		//Search on just Customer
		priceFilters = [
			['custrecord_albert_ns_item_price_customer','is',ValidCustomer], 'AND',
			['custrecord_alberta_ns_item','is',salesItem]
		];
		
		//priceFilters = [
		//	['custrecord_alberta_ns_item_pricing_year','is',tranYear], 'AND',
		//	['custrecord_albert_ns_item_price_customer','is',ValidCustomer], 'AND',
		//	['custrecord_alberta_ns_item','is',salesItem]
		//];
		
		filterType = 'Customer Only';
	} else if (ValidCustomer == '' || ValidConsignee == null) {
		//Unable to search on Just Consignee
		throw nlapiCreateError('error','Customer Key is missing, unable to get line item pricing');
	} else {
		//Search on Customer and Consignee
		priceFilters = [
			['custrecord_albert_ns_item_price_customer','is',ValidCustomer], 'AND',
			['custrecord_albert_ns_item_price_consigne','is',ValidConsignee], 'AND',
			['custrecord_alberta_ns_item','is',salesItem]
		];
		
		//var priceFilters = [
		//	['custrecord_alberta_ns_item_pricing_year','is',tranYear], 'AND',
		//	['custrecord_albert_ns_item_price_customer','is',ValidCustomer], 'AND',
		//	['custrecord_albert_ns_item_price_consigne','is',ValidConsignee], 'AND',
		//	['custrecord_alberta_ns_item','is',salesItem]
		//];
		filterType = 'Customer and Consignee';
	}
	var priceColumns = [];
	priceColumns[0] = new nlobjSearchColumn('internalid');
	priceColumns[1] = new nlobjSearchColumn(monthField);
	var searchPrices = nlapiSearchRecord('customrecord_alberta_ns_pricing_list',null,priceFilters,priceColumns);
	//nlapiLogExecution('error','searchFilterCheck','priceFilters: '+priceFilters);
	//nlapiLogExecution('error','searchPricesCheck','TranYear: '+tranYear+' ValidCustomer: '+ValidCustomer+' ValidConsignee: '+ValidConsignee+' salesItem: '+salesItem+' FilterType: '+filterType+' month: '+monthField);
	//nlapiLogExecution('error','searchPricesResult','length: '+searchPrices.length+' value: '+searchPrices);
	
	if(searchPrices) {
		return searchPrices[0].getValue(monthField);
	} else {
		throw nlapiCreateError('error','Price Search unable to find line item pricing for Item: '+salesItem+' Customer: '+ValidCustomer+' Consignee: '+ValidConsignee);
	}
}
*/

function validateConsigneePrice(salesItem, ValidCustomer, ValidConsignee, tranDate) {
	//var externalItemID = nlapiLookupField('noninventoryitem',tempExternalItem,'custitem_wmsalesitem');
	var filterType = '';
	var lookupMonths = ['jan', 'feb', 'march', 'april', 'may', 'june', 'july', 'august', 'sep', 'oct', 'nov', 'dec'];
	var tranYear = tranDate.getFullYear();
	var tranMonth = lookupMonths[tranDate.getMonth()];
	var monthField = 'custrecord_alberta_ns_month_' + tranMonth;
	if (salesItem == '' || salesItem == null) {
		throw nlapiCreateError('error', 'WM Sales Item value is missing on non-inventory item ' + salesItem + ', unable to get line pricing.');
	}
	var priceFilters = [];

	if (ValidConsignee == '' || ValidConsignee == null) {
		if (ValidCustomer == '' || ValidCustomer == null) {
			throw nlapiCreateError('error', 'Customer and Consignee Key are both missing, unable to get line pricing');
		}
		//Search on just Customer
		priceFilters = [
			['custrecord_albert_ns_item_price_customer', 'is', ValidCustomer], 'AND',
			['custrecord_alberta_ns_item', 'is', salesItem]
		];
		filterType = 'Customer Only';
	} else if (ValidCustomer == '' || ValidCustomer == null) {
		//Unable to search on Just Consignee
		throw nlapiCreateError('error', 'Customer Key is missing, unable to get line item pricing');
	} else {
		//Search on Customer and Consignee
		priceFilters = [
			['custrecord_albert_ns_item_price_customer', 'is', ValidCustomer], 'AND',
			['custrecord_albert_ns_item_price_consigne', 'is', ValidConsignee], 'AND',
			['custrecord_alberta_ns_item', 'is', salesItem]
		];
		filterType = 'Customer and Consignee';
	}
	var priceColumns = [];
	priceColumns[0] = new nlobjSearchColumn('internalid');
	priceColumns[1] = new nlobjSearchColumn(monthField);
	priceColumns[2] = new nlobjSearchColumn('custrecord_alberta_ns_item_pricing_year');
	var searchPrices = nlapiSearchRecord('customrecord_alberta_ns_pricing_list', null, priceFilters, priceColumns);
	//nlapiLogExecution('error','searchFilterCheck','priceFilters: '+priceFilters);
	//nlapiLogExecution('error','searchPricesCheck','TranYear: '+tranYear+' ValidCustomer: '+ValidCustomer+' ValidConsignee: '+ValidConsignee+' salesItem: '+salesItem+' FilterType: '+filterType+' month: '+monthField);
	//if(searchPrices) {nlapiLogExecution('error','searchPricesResult','length: '+searchPrices.length+' value: '+searchPrices)};

	if (filterType == 'Customer and Consignee' && !searchPrices) {
		//No results with Consignee, attempt with Customer
		priceFilters = [
			['custrecord_albert_ns_item_price_customer', 'is', ValidCustomer], 'AND',
			['custrecord_alberta_ns_item', 'is', salesItem]
		];
		filterType = 'Customer Fallback';
		searchPrices = nlapiSearchRecord('customrecord_alberta_ns_pricing_list', null, priceFilters, priceColumns);
	}

	if (searchPrices) {
		for (n = 0; n < searchPrices.length; n++) {
			if (searchPrices[n].getValue('custrecord_alberta_ns_item_pricing_year') == tranYear) {
				return searchPrices[n].getValue(monthField);
			}
		}
		throw nlapiCreateError('error', 'Price records were found with ' + searchPrices.length + ' results but none match year value of ' + tranYear);
	} else {
		throw nlapiCreateError('error', 'Price Search unable to find line item pricing for Item: ' + salesItem + ' Customer(InternalID): ' + ValidCustomer + ' Consignee: ' + ValidConsignee + ' Year: ' + tranYear + ' Search Type: ' + filterType);
	}
}

//Gets NonInventory Items for Sub5 from Wrapmation production grade code
function getSalesItem(aggKey) {
	var quality = aggKey.substring(0, 4);
	var prodGrade = aggKey.substring(4);
	if (prodGrade == null || prodGrade == '') {
		throw nlapiCreateError('error', 'function getSalesItem has encountered an error trying to find an item for aggKey: ' + aggKey + ' prodGrade: ' + prodGrade);
	} else { //Always use PRIME quality items
		switch (prodGrade) {
			case '17':
				return '142'; //'NPO59ST'
			case '19':
				return '144'; //'NPT59ST'
			case '23':
				return '141'; //'NPL59ST'
			case '28':
				return '140'; //'NPA59ST'
			case '30':
				return '137'; //'HBT65ST'
			case '31':
				return '136'; //'HBT65RO'
			case '34':
				return '139'; //'HBT70ST'
			case '35':
				return '138'; //'HBT70RO'
			case '36':
				return '135'; //'HBO65ST'
			case '37':
				return '17497'; //'HBO65RO'
			case '38':
				return '143'; //'NPT59RO'
			case '40':
				return '12309'; //'NPL59RO'
			case '41':
				return '12307'; //'HBL63ST'
			case '42':
				return '12311'; //'HBL63RO'
			case '46':
				return '17499'; //'HBK63ST' //SWAPPED
			case '45':
				return '17501'; //'HBK63RO' //SWAPPED
			case '47':
				return '45330'; //'LNX57ST'
			case '48':
				return '58562'; //LNY56ST
			case '49':
				return '58565'; //LNY56RO
			case '50':
				return '58557'; //LNZ56ST
			case '51':
				return '68395'; //LNZ56RO
			case '52':
		        return '78961'; //DYW56ST Prime - MFG (avg cost) 1.1.4 - 11202019
			case '53':
		        return '95233'; //NPT59CH - Prime - based on LNZ56RO, prime non inventory item should be used, this contradicts item52 which may have not been properly setup 1.2.1 - 04232020
		}
	}
	throw nlapiCreateError('error', 'function getSalesItem has encountered an error trying to find an item for aggKey: ' + aggKey + ' prodGrade: ' + prodGrade);
}

//Translates Inventory Items from Sub1 to NonInventory Items for Sub5
function translateItem(itemID) {
	switch (itemID) {
		case '12137':
		case '12146':
		case '12157':
			return '142'; //'NPO59ST'
		case '12139':
		case '12148':
		case '12159':
			return '144'; //'NPT59ST'
		case '12136':
		case '12145':
		case '12156':
			return '141'; //'NPL59ST'
		case '12135':
		case '12144':
		case '12155':
			return '140'; //'NPA59ST'
		case '12132':
		case '12141':
		case '12152':
			return '137'; //'HBT65ST'
		case '12131':
		case '12140':
		case '12151':
			return '136'; //'HBT65RO'
		case '12134':
		case '12143':
		case '12154':
			return '139'; //'HBT70ST'
		case '12133':
		case '12142':
		case '12153':
			return '138'; //'HBT70RO'
		case '12130':
		case '12149':
		case '12150':
			return '135'; //'HBO65ST'
		case '17485':
		case '17486':
		case '17487':
		case '37':
			return '17497'; //'HBO65RO'
		case '12138':
		case '12147':
		case '12158':
			return '143'; //'NPT59RO'
		case '17488':
		case '17489':
		case '17490':
		case '40':
			return '12309'; //'NPL59RO'
		case '17491':
		case '17492':
		case '17493':
		case '41':
			return '12307'; //'HBL63ST'
		case '17494':
		case '17495':
		case '17496':
		case '12312':
			return '12311'; //'HBL63RO'
		case '17482':
		case '17483':
		case '17484':
			return '17501'; //'HBK63RO'
		case '17479':
		case '17480':
		case '17481':
			return '17499'; //'HBK63ST'
		case '45327':
		case '45328':
		case '45329':
		case '47':
			return '45330'; //'LNX57ST'
		case '58554':
		case '58553':
		case '58549':
		case '48':
			return '58562'; //LNY56ST
		case '58556':
		case '58555':
		case '58550':
		case '49':
			return '58565'; //LNY56RO
		case '58552':
		case '58551':
		case '58548':
		case '50':
			return '58557'; //LNZ56ST
		case '68397':
		case '68398':
		case '68399':
		case '51':
			return '68395'; //LNZ56RO
		case '52':
			return '78656'; //DYW56ST Prime non inventory 1.2.1, patterned from case51 above
		case '53':
			return '95233'; //NPT59CH Prime non inventory 1.2.1, patterned from case51 above
		case '95238':
			return '95233'; //NPT59CH Prime non inventory 1.2.1, patterned from case51 above
		case '78961': //DYW56ST Prime - MFG (avg cost) 1.1.4 - 11202019
	        return '78656'; //DYW56ST Prime 1.1.4 - 11202019
        case '95239': //NPT59CH Off-Grade - MFG (avg cost) 1.2.2 - 11202019
	        return '95237'; //NPT59CH - Off-Grade, Non Inventory 1.2.2
	}
	throw nlapiCreateError('error', 'function translateItem has encountered an error trying to find an item for itemID: ' + itemID);
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
			case '52':
		        return '78961'; //DYW56ST Prime - MFG (avg cost) 1.1.4 - 11202019
			case '53':
		        return '95238'; //NPT59CH Prime - MFG (avg cost) 1.2.1 - 04232020
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
			case '52':
		        //return '78961'; //DYW56ST Prime - MFG (avg cost) 1.1.4 - 11202019
		        return '78962'; //DYW56ST Off-Grade- MFG (avg cost) 1.1.4 - 11202019 1.2.1 this should be offgrade serializedcase '52':
			case '53':
		        return '95239'; //NPT59CH Off-Grade - MFG (avg cost) 1.2.1 - 04232020
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
			case '52':
		        //return '78961'; //DYW56ST Prime - MFG (avg cost) 1.1.4 - 11202019, 1.2.1 this should be beater serializedcase '52':
		        return '78963'; //DYW56ST Beater - MFG (avg cost) this should be beater serialized
			case '53':
		        return '95240'; //NPT59CH Beater - MFG (avg cost) 1.2.1 - 04232020
		}
	} else if (quality == 'HELD') {
		return '12285';
	} //Held Inventory
	throw nlapiCreateError('error', 'Something went wrong in Item Validation for item ' + aggKey);
}

function validateCountry(countryCode) {
	switch (countryCode) {
		case 'USA':
			return 'US';
		case 'CAN':
			return 'CA';
		case 'IND':
			return 'IN';
		case 'ROC':
			return 'CN';
		case 'SGP':
			return 'SG';
			//02272020 - TC10ROD
		case 'PH':
			return 'PH';
			//05222020 - TC10ROD
		case 'GT':
			return 'GT';
	}
	throw nlapiCreateError('error', 'Unable to convert country code of shipping address');
}

function translateLocation(locationInternalId) {
	switch (locationInternalId) {
		case '231':         //ANC Active Warehousing 5 Edm
			return '234';   //ANS Active Warehousing 5 Edm
		case '211':         //ANC Intact Warehouse-In Transit
			return '218';   //ANS Intact Warehouse-In Transit
		case '232':         //ANC MTE Logistix Calgary #2
			return '235';   //ANS MTE Logistix Calgary #2
		case '230':         //ANC MTE Logistix Calgary Inc.
			return '233';   //ANS MTE Logistix Calgary Inc.
		case '212':         //ANC Virtual Paper Warehouse
			return '217';   //ANS Virtual Paper Warehouse
		case '215':         //ANC Whitecourt Warehouse -Paper
			return  '9';    //ANS Whitecourt Warehouse -Paper
	}
	throw nlapiCreateError('ERROR', 'Unable to translate/map location');
}

function validateDate(dateToShip, dateShipped, allocationMonth, BillByShipDate, SyncWMID) {
	//Date is decided based on DateShipped
	//If DateShipped before September 1, 2018 - use Date Shipped for all
	//If DateShipped On/After September 1, 2018 - Use Allocation as default, Customers with BillByShipDate use Date Shipped
	var checkDate = new Date(2018, 8, 1);

	//Currently Uses Date Shipped for all, throws error if empty
	if (dateShipped != null && dateShipped != '') {
		dateParts = dateShipped.substring(0, 10).split('-');
		cleanShipDate = new Date(dateParts[0], dateParts[1] - 1, dateParts[2]);

		if (cleanShipDate < checkDate || BillByShipDate == 'T') {
			//DateShipped before Sept. 1 - use DateShipped
			return cleanShipDate;
		} else if (BillByShipDate == 'T') {
			//BillByShipDate flag - use DateShipped
			return cleanShipDate;
		} else {
			//Otherwise use Allocation Date
			dateAllocParts = allocationMonth.substring(0, 10).split('-');
			cleanAllocDate = new Date(dateAllocParts[0], dateAllocParts[1] - 1, dateAllocParts[2]);
			return cleanAllocDate;
		}
	} else {
		throw nlapiCreateError('error', 'Date Shipped is blank - unable to process Load. SyncWMID: ' + SyncWMID + ' DateShipped: ' + dateShipped);
	}
	throw nlapiCreateError('error', 'Something went wrong in validateDate function. SyncWMID: ' + SyncWMID + ' DateShipped: ' + dateShipped + ' BillByShipDate: ' + BillByShipDate + ' Allocation Month: ' + allocationMonth);
}

function validateShipDate(dateShipped, SyncWMID) {
	//Direct cleanup of Shipped Date
	if (dateShipped != null && dateShipped != '') {
		dateParts = dateShipped.substring(0, 10).split('-');
		tempDate = new Date(dateParts[0], dateParts[1] - 1, dateParts[2]);
	} else {
		throw nlapiCreateError('error', 'Date Shipped is blank - unable to process Load. SyncWMID: ' + SyncWMID + ' DateShipped: ' + dateShipped);
	}
	return tempDate;
}

function serialNumberLookup(serialNumber, SyncWMID, itemId) {
    if (serialNumber == '' || serialNumber == null) {
        throw nlapiCreateError('ERROR', 'Blank serial number');
    }

    var filterExpression = [
        //['inventorynumber.isonhand', 'is', 'T'], 'AND',
        ['inventorynumber.inventorynumber', 'is', serialNumber]
        
    ];
    //TC10ROD add itemId optional argument
    if(itemId)
    	{
    	filterExpression.push('AND');
    	filterExpression.push(['inventorynumber.item', 'is', itemId])
    	}

    var columns = [];
    columns.push(new nlobjSearchColumn('internalid').setSort('DESC')); //internalid of the inventory detail
    columns.push(new nlobjSearchColumn('inventorynumber'));
    columns.push(new nlobjSearchColumn('location'));
    columns.push(new nlobjSearchColumn('item', 'inventorynumber'));
    columns.push(new nlobjSearchColumn('isonhand', 'inventorynumber'));
    columns.push(new nlobjSearchColumn('datecreated', 'transaction').setSort('DESC'));
    columns.push(new nlobjSearchColumn('internalid', 'inventorynumber')); //internalid of the inventory number(serialnumber) record

    var results = nlapiSearchRecord('inventorydetail', null, filterExpression, columns);

    if (results) {
    	nlapiLogExecution("DEBUG", "ZZZZZZZZZZZZZ ROD why use 4055667", JSON.stringify(results));
        return {
			type: "InventoryItem",
            internalId: results[0].getValue('internalid'),
            serialNumber: results[0].getValue('inventorynumber'),
            locationInternalId: results[0].getValue('location'),
            itemInternalId: results[0].getValue('item', 'inventorynumber'),
            isOnHand: results[0].getValue('isonhand', 'inventorynumber'),
            dateCreated: results[0].getValue('datecreated', 'transaction'),
            serialNumberRecordInternalId: results[0].getValue('internalid', 'inventorynumber'),
			QualityKey: '',
			GradeKey: ''
        };
    } else {
		var filters = [
			['custrecord_syncwminv_inventoryno','is',serialNumber]
		];
		var columns = [];
		columns[0] = new nlobjSearchColumn('internalid');
		columns[1] = new nlobjSearchColumn('custrecord_syncwminv_qualitystatus');
		columns[2] = new nlobjSearchColumn('custrecord_syncwminv_prodgradekey');
		columns[3] = new nlobjSearchColumn('custrecord_syncwminv_exchtxkey').setSort(true);
		var search = nlapiSearchRecord('customrecord_syncwminventory',null,filters,columns);
		
		if( search ) {
			return {
				type: "SyncRecord",
				internalId: '',
				serialNumber: serialNumber,
				locationInternalId: '',
				itemInternalId: '',
				isOnHand: '',
				dateCreated: '',
				serialNumberRecordInternalId: '',
				QualityKey: search[0].getValue('custrecord_syncwminv_qualitystatus'),
				GradeKey: search[0].getValue('custrecord_syncwminv_prodgradekey')
			};
		} else {
			throw nlapiCreateError('ERROR', 'Serial number ' + serialNumber + ' not found for Load Number ' + nlapiLookupField('customrecord_syncwmloadheader', SyncWMID, 'custrecord_syncwmloadhead_loadno') + ' and Load IntID: ' + SyncWMID);
		}
	}
}

function findInvItemFromSerialNumbers(inputNumbers,SyncWMID) {
	if (inputNumbers == '' || inputNumbers == null) {
		throw nlapiCreateError('error', 'Unable to split invalid value "' + inputNumbers + '" for Load Number: ' + nlapiLookupField('customrecord_syncwmloadheader', SyncWMID, 'custrecord_syncwmloadhead_loadno') + ' and Load IntID: ' + SyncWMID);
	} else {
		SerialNumbers = inputNumbers.split(',');
		LookupSerialNo = SerialNumbers[0];
	}

	var filters = [];
	filters[0] = new nlobjSearchFilter('inventorynumber', null, 'is', LookupSerialNo);
	//1.1.6
	filters[1] = new nlobjSearchFilter('quantityonhand', null, 'greaterthan', 0);
	var columns = [];
	columns[0] = new nlobjSearchColumn('internalid');
	//columns[1] = new nlobjSearchColumn('inventorynumber','inventorynumber');
	columns[1] = new nlobjSearchColumn('item');
	//columns[2] = new nlobjSearchColumn('internalid','inventorynumber');
	var itemResults = nlapiSearchRecord('inventorynumber', null, filters, columns);

	
	if (itemResults) {
		nlapiLogExecution("DEBUG", "TC10ROD 03122020 JSON.stringify(itemResults)", JSON.stringify(itemResults))
		InventoryItem = itemResults[0].getValue('item');
		//returnVal = translateItem(InventoryItem); //Used for Non-Inventory Item in Sub 5
		returnVal = InventoryItem; //Used for Inventory Item in Sub 1
	} else {
		//throw nlapiCreateError('error','No Order Item was found and unable to link to item via Serial Number. Cannot map correct item to this line for serial number "'+LookupSerialNo+'" for Load Number: '+nlapiLookupField('customrecord_syncwmloadheader',SyncWMID,'custrecord_syncwmloadhead_loadno')+' and Load IntID: '+SyncWMID);
		throw nlapiCreateError('error', 'No Order Item was found and unable to link to item via Serial Number. Cannot map correct item to this line for serial number "' + LookupSerialNo + '" and Load IntID: ' + SyncWMID);
	}

	return returnVal;
}

/** EXCEPTION FUNCTION - CREATE INVENTORY ADJUSTMENT **/
function removeInventory(adjDate, cutoffDate, customerName, SyncWMRecord, LineIdObj, searchLineResults) {
	//Called when inventory needs to be removed instead of shipped, such as when it is sent to a testing facility like FP Innovation
	TESTSTRING = 'Remove Inventory';

	Record = nlapiCreateRecord('inventoryadjustment');
	Record.setFieldValue('subsidiary', '1');
	Record.setFieldValue('adjlocation', '215');
	Record.setFieldValue('department', '1');
	Record.setFieldValue('account', '2175');
	Record.setFieldValue('trandate', nlapiDateToString((cutoffDate > adjDate) ? cutoffDate : adjDate, 'date'));
	Record.setFieldValue('memo', 'Paper Inventory being removed by Wrapmation Integration - Load for Testing or Holding Facility: ' + customerName);
	Record.setFieldValue('custbody_wmid', SyncWMRecord.getFieldValue('internalid')); //Set ID of record that started the process, identify as WM Record

	TESTSTRING = TESTSTRING + 'A';
	for (var LineId in LineIdObj) {
		TESTSTRING = TESTSTRING + 'B';
		if (LineIdObj[LineId] != "undefined") {
			LineRec = nlapiLoadRecord('customrecord_syncwmloaddetail', searchLineResults[LineIdObj[LineId]].getValue('internalid'));
			TESTSTRING = TESTSTRING + 'C';
			//Validate Line
			testQtyToShip = LineRec.getFieldValue('custrecord_syncwmloaddet_rollstoship');
			testQtyShipped = LineRec.getFieldValue('custrecord_syncwmloaddet_rollsshipped');
			testInvList = LineRec.getFieldValue('custrecord_syncwmloaddet_inventorylist');
			if ((testQtyToShip == '0' || testQtyToShip == 0) && (testQtyShipped == '0' || testQtyShipped == 0) && testInvList == '') {
				//Ignore Line - line was deleted in WM and is invalid for processing
			} else {
				TESTSTRING = TESTSTRING + 'D';
				tempNumbers = LineRec.getFieldValue('custrecord_syncwmloaddet_inventorylist');
				lineItem = findInvItemFromSerialNumbers(tempNumbers, SyncWMID);
				serialNumbers = tempNumbers.split(',');
				lineQty = serialNumbers.length;

				nlapiLogExecution('DEBUG', 'Check Item', 'Item: ' + lineItem + ' serialNumbers: ' + tempNumbers);

				if (LineRec.getFieldValue('custrecord_syncwmloaddet_rollsshipped') > 0) {
					TESTSTRING = TESTSTRING + 'E';

					Record.selectNewLineItem('inventory');
					Record.setCurrentLineItemValue('inventory', 'item', lineItem);
					Record.setCurrentLineItemValue('inventory', 'location', '215');
					Record.setCurrentLineItemValue('inventory', 'department', '2');
					Record.setCurrentLineItemValue('inventory', 'adjustqtyby', (0 - lineQty));
					tempLineCost = nlapiLookupField('inventoryitem', lineItem, 'costestimate');
					//Record.setCurrentLineItemValue('inventory','unitcost',tempLineCost);

					var subrec = Record.createCurrentLineItemSubrecord('inventory', 'inventorydetail');
					for (x = 0; x < lineQty; x++) {
						TESTSTRING = TESTSTRING + 'F';
						subrec.selectNewLineItem('inventoryassignment');
						nlapiLogExecution("DEBUG", "1582 serialNumbers[x]", serialNumbers[x]);
						subrec.setCurrentLineItemValue('inventoryassignment', 'issueinventorynumber', serialNumbers[x]);
						//subrec.setCurrentLineItemValue('inventoryassignment','quantity',1);
						subrec.commitLineItem('inventoryassignment');
					}
					subrec.commit();
					Record.commitLineItem('inventory');
				}
			}
		}
	}
	nlapiLogExecution('DEBUG', 'TESTSTRING Results', TESTSTRING);
	RecordID = nlapiSubmitRecord(Record);

	SyncWMRecord.setFieldValue('custrecord_syncwmloadhead_syncstatus', 4);
	//TC10ROD 09062019 CLEAR PRICING UPDATE CHECKBOX?
	SyncWMRecord.setFieldValue('custrecord_syncwmloadhead_pricingupdate', 'F');
	SyncWMRecord.setFieldValue('custrecord_syncwmloadhead_errormessage', 'Inventory Adjustment with IntID ' + RecordID + ' Created to Remove Inventory in Subsidiary 1');
	SyncWMRecord.setFieldValue('custrecord_syncwmloadhead_nsid', 'Sub1-INVADJ: ' + RecordID);
	nlapiSubmitRecord(SyncWMRecord);
}

/** Remove Intercompany Inventory before Intercompany Journal Entry **/
function removeIntercompanyInventory(adjDate, cutoffDate, customerName, SyncWMRecord, LineIdObj, searchLineResults) {
	//Called when inventory needs to be removed for intercompany sale
	//TESTSTRING = 'Remove Inventory';

	Record = nlapiCreateRecord('inventoryadjustment');
	Record.setFieldValue('subsidiary', '1');
	Record.setFieldValue('adjlocation', '215');
	Record.setFieldValue('department', '1');
	Record.setFieldValue('account', '2175');
	Record.setFieldValue('trandate', nlapiDateToString((cutoffDate > adjDate) ? cutoffDate : adjDate, 'date'));
	Record.setFieldValue('memo', 'Paper Inventory being removed by Wrapmation Integration - Intercompany Inventory Adjustment for Customer: ' + customerName);
	Record.setFieldValue('custbody_wmid', SyncWMRecord.getFieldValue('internalid')); //Set ID of record that started the process, identify as WM Record

	//TESTSTRING = TESTSTRING + 'A';
	for (var LineId in LineIdObj) {
		//TESTSTRING = TESTSTRING + 'B';
		if (LineIdObj[LineId] != "undefined") {
			LineRec = nlapiLoadRecord('customrecord_syncwmloaddetail', searchLineResults[LineIdObj[LineId]].getValue('internalid'));
			//TESTSTRING = TESTSTRING + 'C';
			//Validate Line
			testQtyToShip = LineRec.getFieldValue('custrecord_syncwmloaddet_rollstoship');
			testQtyShipped = LineRec.getFieldValue('custrecord_syncwmloaddet_rollsshipped');
			testInvList = LineRec.getFieldValue('custrecord_syncwmloaddet_inventorylist');
			if ((testQtyToShip == '0' || testQtyToShip == 0) && (testQtyShipped == '0' || testQtyShipped == 0) && testInvList == '') {
				//Ignore Line - line was deleted in WM and is invalid for processing
			} else {
				//TESTSTRING = TESTSTRING + 'D';
				tempNumbers = LineRec.getFieldValue('custrecord_syncwmloaddet_inventorylist');
				lineItem = findInvItemFromSerialNumbers(tempNumbers, SyncWMID);
				serialNumbers = tempNumbers.split(',');
				lineQty = serialNumbers.length;

				//nlapiLogExecution('DEBUG', 'Check Item', 'Item: ' + lineItem + ' serialNumbers: ' + tempNumbers);

				if (LineRec.getFieldValue('custrecord_syncwmloaddet_rollsshipped') > 0) {
					//TESTSTRING = TESTSTRING + 'E';

					Record.selectNewLineItem('inventory');
					Record.setCurrentLineItemValue('inventory', 'item', lineItem);
					Record.setCurrentLineItemValue('inventory', 'location', '215');
					Record.setCurrentLineItemValue('inventory', 'department', '2');
					Record.setCurrentLineItemValue('inventory', 'adjustqtyby', (0 - lineQty));
					tempLineCost = nlapiLookupField('inventoryitem', lineItem, 'costestimate');
					//Record.setCurrentLineItemValue('inventory','unitcost',tempLineCost);

					var subrec = Record.createCurrentLineItemSubrecord('inventory', 'inventorydetail');
					for (x = 0; x < lineQty; x++) {
						//TESTSTRING = TESTSTRING + 'F';
						subrec.selectNewLineItem('inventoryassignment');
						nlapiLogExecution("DEBUG", "1654 serialNumbers[x]", serialNumbers[x]);
						subrec.setCurrentLineItemValue('inventoryassignment', 'issueinventorynumber', serialNumbers[x]);
						//subrec.setCurrentLineItemValue('inventoryassignment','quantity',1);
						subrec.commitLineItem('inventoryassignment');
					}
					subrec.commit();
					Record.commitLineItem('inventory');
				}
			}
		}
	}
	//nlapiLogExecution('DEBUG', 'TESTSTRING Results', TESTSTRING);
	RecordID = nlapiSubmitRecord(Record);

	SyncWMRecord.setFieldValue('custrecord_syncwmloadhead_syncstatus', 4);
	SyncWMRecord.setFieldValue('custrecord_syncwmloadhead_errormessage', 'Inventory Adjustment with IntID ' + RecordID + ' Created to Remove Intercompany Inventory in Subsidiary 1');
	SyncWMRecord.setFieldValue('custrecord_syncwmloadhead_nsid', 'Sub1-INVADJ: ' + RecordID);
	nlapiSubmitRecord(SyncWMRecord);
	
	return RecordID;
}

//1.2.2 - TC10ROD && Mark Sullivan, a way to find location id based on shipping key, added locationShipperObj to parameters
/** EXCEPTION FUNCTION - CREATE INVENTORY TRANSFER **/
function transferInventory(adjDate, cutoffDate, customerName, SyncWMRecord, LineIdObj, searchLineResults, locationConsigneeObject, locationShipperObj) {
	// throw nlapiCreateError('error', 'Not ready to call function transferInventory');
	//Called when inventory needs to be removed instead of shipped, such as when it is sent to a testing facility like FP Innovation
	TESTSTRING = 'Inventory Transfer ';

	var InvTfrRecord = nlapiCreateRecord('inventorytransfer');

	InvTfrRecord.setFieldValue('subsidiary', '1');
	InvTfrRecord.setFieldValue('location', locationShipperObj['locationInternalId']);
	InvTfrRecord.setFieldValue('transferlocation', locationConsigneeObject['locationInternalId']);
	// InvTfrRecord.setFieldValue('adjlocation', '215');
	// InvTfrRecord.setFieldValue('account', '2175');
	InvTfrRecord.setFieldValue('trandate', nlapiDateToString((cutoffDate > adjDate) ? cutoffDate : adjDate, 'date'));
	InvTfrRecord.setFieldValue('memo', 'Paper Inventory being transferred by Wrapmation Integration' + customerName);
	// InvTfrRecord.setFieldValue('custbody_wmid', SyncWMRecord.getId()); //Set ID of record that started the process, identify as WM Record
	InvTfrRecord.setFieldValue('custbody4', SyncWMRecord.getFieldValue('custrecord_syncwmloadhead_loadno'));
	InvTfrRecord.setFieldValue('custbody_wmid', SyncWMRecord.getFieldValue('custrecord_syncwmloadhead_wmid'));
	InvTfrRecord.setFieldValue('custbody_syncwmloadheader', SyncWMRecord.getId());

	/*{
		"ExLineKey": ExLineKey,
		"tempID": tempID,
		"LineKey": LineKey,
		"LineResultIndex": Lo,
		"OrderItem": LineOrderItem,
		"OrderHeader": OrderHeaderClean,
		"InternalID": InternalID
	};*/
	
	TESTSTRING = TESTSTRING + 'A';
	var RecordLines = 0;
	for (var LineId in LineIdObj) {
		TESTSTRING = TESTSTRING + 'B';
		if (LineIdObj[LineId] != "undefined") {
			LineRec = nlapiLoadRecord('customrecord_syncwmloaddetail', searchLineResults[LineIdObj[LineId]].getValue('internalid'));
			TESTSTRING = TESTSTRING + 'C';
			//Validate Line
			testQtyToShip = LineRec.getFieldValue('custrecord_syncwmloaddet_rollstoship');
			testQtyShipped = LineRec.getFieldValue('custrecord_syncwmloaddet_rollsshipped');
			testInvList = LineRec.getFieldValue('custrecord_syncwmloaddet_inventorylist');
			if ((testQtyToShip == '0' || testQtyToShip == 0) && (testQtyShipped == '0' || testQtyShipped == 0) && testInvList == '') {
				//Ignore Line - line was deleted in WM and is invalid for processing
			} else {
				TESTSTRING = TESTSTRING + 'D';
				tempNumbers = LineRec.getFieldValue('custrecord_syncwmloaddet_inventorylist');
				lineItem = findInvItemFromSerialNumbers(tempNumbers, SyncWMID);
				serialNumbers = tempNumbers.split(',');
				var lineQty = serialNumbers.length;

				nlapiLogExecution('DEBUG', 'Check Item', 'Item: ' + lineItem + ' serialNumbers: ' + tempNumbers);

				if (LineRec.getFieldValue('custrecord_syncwmloaddet_rollsshipped') > 0) {
					TESTSTRING = TESTSTRING + 'E';

					var unsuccesful = false;
					InvTfrRecord.selectNewLineItem('inventory');
					lineitemLoop:
					while(!unsuccesful)
					{
						if(lineQty < 1)
						{
							nlapiSubmitField('customrecord_syncwmloadheader',SyncWMID,['custrecord_syncwmloadhead_syncstatus',
								"custrecord_syncwmloadhead_errormessage"],
								[4, 'All serial numbers are already in the target location, location id : ' + serialNumberLookupObj['locationInternalId']]);
							findNextRecord(); //TC10ROD continue to next record
							return;
						}
						
						nlapiLogExecution("DEBUG", "unsuccessful lineQty", lineQty)
						InvTfrRecord.setCurrentLineItemValue('inventory', 'item', lineItem);
						InvTfrRecord.setCurrentLineItemValue('inventory', 'adjustqtyby', (lineQty));
						tempLineCost = nlapiLookupField('inventoryitem', lineItem, 'costestimate');
						//Record.setCurrentLineItemValue('inventory','unitcost',tempLineCost);

						var subrec = InvTfrRecord.createCurrentLineItemSubrecord('inventory', 'inventorydetail');
						serialLoop:
						for (x = 0; x < lineQty; x++) {
							var break_serialLoop = false;
							TESTSTRING = TESTSTRING + 'F';
							
							if(nlapiGetContext().getRemainingUsage() <= 50){
					          	nlapiYieldScript();
					          }
							
							serialNumberLookupObj = serialNumberLookup(serialNumbers[x], SyncWMID, lineItem);
							nlapiLogExecution("DEBUG", "zzz TC10ROD serialNumberLookupObj", JSON.stringify(serialNumberLookupObj))
							var nsSerialNumberId = serialNumberLookupObj['serialNumberRecordInternalId'];
							nlapiLogExecution("DEBUG", "nsSerialNumberId", nsSerialNumberId)
							if(!nsSerialNumberId)
							{
								nlapiLogExecution("DEBUG", "no nsSerialNumberId", "must break")
								lineQty = lineQty-1;
								serialNumbers.splice(x, 1);
								nlapiLogExecution("DEBUG", "serialNumbers after splice", serialNumbers)
								nlapiLogExecution("DEBUG", "lineQty after splice", lineQty)
								unsuccesful = false;
								//subrec.cancel()
								break_serialLoop = true;
								break serialLoop;
							}
							if( serialNumberLookupObj['locationInternalId'] != locationConsigneeObject['locationInternalId']){
								//NEED TO TRANSFER
								subrec.selectNewLineItem('inventoryassignment');
								subrec.setCurrentLineItemValue('inventoryassignment', 'issueinventorynumber', serialNumberLookupObj['serialNumberRecordInternalId']);
								//subrec.setCurrentLineItemValue('inventoryassignment','quantity',1);
								subrec.commitLineItem('inventoryassignment');
							} else {
								//ALREADY TRANSFERRED
								
								nlapiLogExecution("DEBUG", "already transfered to same location : ", serialNumberLookupObj['locationInternalId'])
								lineQty = lineQty-1;
								serialNumbers.splice(x, 1);
								nlapiLogExecution("DEBUG", "serialNumbers after splice", serialNumbers)
								nlapiLogExecution("DEBUG", "lineQty after splice", lineQty)
								unsuccesful = false;
								//subrec.cancel()
								break_serialLoop = true;
								break serialLoop;
								
								
//								lineQty = lineQty - 1;
//								InvTfrRecord.setCurrentLineItemValue('inventory', 'adjustqtyby', (lineQty));
							}
						}
						if(break_serialLoop)
						{
							subrec.cancel()
							unsuccesful = false;
							continue;
						}
						unsuccesful = true;
					}
					
					nlapiLogExecution('DEBUG','CHECKING QTY VALUES',lineQty);
					if(lineQty > 0) {
						nlapiLogExecution('DEBUG','CHECKING QTY VALUES - Creating Line',lineQty);
						subrec.commit();
						InvTfrRecord.commitLineItem('inventory');
						RecordLines = RecordLines + 1;	
					}
				}
			}
		}
	}
	nlapiLogExecution('DEBUG', 'TESTSTRING Results', TESTSTRING);
	nlapiLogExecution('DEBUG', 'CHECKING LINE VALUE',RecordLines);
	if(RecordLines > 0) {
		nlapiLogExecution('DEBUG', 'Lines Exist, Decided to Create',RecordLines);
		RecordID = nlapiSubmitRecord(InvTfrRecord);

		SyncWMRecord.setFieldValue('custrecord_syncwmloadhead_syncstatus', 4);
		SyncWMRecord.setFieldValue('custrecord_syncwmloadhead_errormessage', 'Inventory Transfer with IntID ' + RecordID);
		SyncWMRecord.setFieldValue('custrecord_syncwmloadhead_nsid', 'Sub1-Inventory Transfer: ' + RecordID);
		nlapiSubmitRecord(SyncWMRecord);
	}
}

function translateShippingMethod(WMTransportationKey) {
	switch (WMTransportationKey) {
		case '1':
		case 1:
			return '12288'; //Truck
		case '2':
		case 2:
			return '89'; //Rail
		case '3':
		case 3:
			return '12286'; //Intermodal
	}
	throw nlapiCreateError('error', 'Unable to convert country code of shipping address');
}

// ***---***
//Added to check for 0 and empty fields
function isNonZero(spotPrice) {
    if ((spotPrice == '') || (spotPrice == null) || (spotPrice == undefined) ||(spotPrice.toString().charCodeAt() == 32)||(spotPrice<=0)) {
        return false;
    }
    else{
        return true;
    }
}

var getResults = function getResults(set) {
    var holder = [];
    var i = 0;
    while (true) {
        var result = set.getRange({
            start: i,
            end: i + 1000
        });
        if (!result) break;
        holder = holder.concat(result);
        if (result.length < 1000) break;
        i += 1000;
    }
    return holder;
};

/**
 * @since 10122019 v1.1.0 - TC10ROD
 * @returns
 */
 function get_locationToConsigneeMap()
{
	var locationToConsigneeMap = [];
	try
	{
		var searchObj = nlapiLoadSearch(null, "customsearch_010_getlocswithconsignee");
//        var searchObj = nlapiSearchRecord("location",null,
//        [
//           ["custrecord_loc_consigneekey","isnotempty",""]
//        ], 
//        [
//           new nlobjSearchColumn("custrecord_loc_consigneekey")
//        ]
//        );

		searchObj.runSearch().forEachResult(function(result){
			nlapiLogExecution("DEBUG", "result consignee key", result.getValue("custrecord_loc_consigneekey"))
			var consigneeKeysValue = result.getValue("custrecord_loc_consigneekey") || "";
			
			var consigneeKeysArray = consigneeKeysValue.split(",")
			for(var a = 0 ; a < consigneeKeysArray.length ; a++)
			{
				locationConsigneeEntry = {
//						searchObj.forEach(function(result){locationConsigneeEntry = {
										locationInternalId: "" + result.getId(),
										consigneeKey: "" + consigneeKeysArray[a]
								}
								locationToConsigneeMap.push(locationConsigneeEntry)
			}
				return true;
		});
	}
	catch(e)
	{
		nlapiLogExecution("ERROR", "ERROR in function get_locationToConsigneeMap", e.message);
	}
	nlapiLogExecution("DEBUG", "JSON.stringify(locationToConsigneeMap)", JSON.stringify(locationToConsigneeMap));
	return locationToConsigneeMap;
}

/*function get_locationToConsigneeMap()
{
	var locationToConsigneeMap = [];
	try
	{
		var searchObj = nlapiLoadSearch(null, "customsearch_010_getlocswithconsignee");
		searchObj.runSearch().forEachResult(function(result){locationConsigneeEntry = {
						locationInternalId: "" + result.getId(),
						consigneeKey: "" + result.getValue(searchObj.getColumns()[0])
				}
				locationToConsigneeMap.push(locationConsigneeEntry)
				return true;
		});
	}
	catch(e)
	{
		nlapiLogExecution("ERROR", "ERROR in function get_locationToConsigneeMap", e.message);
	}
	nlapiLogExecution("DEBUG", "JSON.stringify(get_locationToConsigneeMap)", JSON.stringify(get_locationToConsigneeMap));
	return locationToConsigneeMap;
}*/