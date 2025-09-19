/* @Scheduled Script on Manual Deployment

Processes SyncWMOrderHeader and SyncWMOrderDetail Records
*/

var context = nlapiGetContext();
SyncWMID = context.getSetting('SCRIPT','custscript_syncwmorderid');
var script_id = 450;
var rollCost = 435.69;

//US INTERCOMPANY PRICE - 432.66 USD
//Units Ordered is volume in MT

function ScheduledSyncWMOrder(params){
	nlapiLogExecution('DEBUG','CALLSCHEDULEDSYNCWMORDER','SyncWMOrder Processing Started on Record '+SyncWMID);
	try{
		nlapiLogExecution('AUDIT','SYNCWMORDER TEST5','');
		nlapiSubmitField('customrecord_syncwmorderheader',SyncWMID,'custrecord_syncwmorderhead_syncstatus','2');
		nlapiSubmitField('customrecord_syncwmorderheader',SyncWMID,'custrecord_syncwmorderhead_errmsg','');
		
		SyncWMRecord = nlapiLoadRecord('customrecord_syncwmorderheader',SyncWMID);
		/** Date used should be SHIP DATE until Sept. 1, ALLOCATION DATE on/after Sept. 1 **/
		var dateParts = SyncWMRecord.getFieldValue('custrecord_syncwmorderhead_dateallocmnth').substring(0,10).split('-');
		var tempDate = new Date(dateParts[0],dateParts[1]-1,dateParts[2]);
		
		if(SyncWMRecord.getFieldValue('custrecord_syncwmorderhead_orderprodtype') == 'CUSTOMER_STOCK') {
			nlapiLogExecution('AUDIT','SYNCWMORDER TEST6','');
			//Customer Stock Orders are being ignored.
			nlapiSubmitField('customrecord_syncwmorderheader',SyncWMID,'custrecord_syncwmorderhead_syncstatus',4); //Complete
			nlapiSubmitField('customrecord_syncwmorderheader',SyncWMID,'custrecord_syncwmorderhead_errmsg','Order Production Type is CUSTOMER_STOCK, these are being intentionally ignored as all quantities are 0');
			nlapiSubmitField('customrecord_syncwmorderheader',SyncWMID,'custrecord_syncwmorderhead_retries',0);
			nlapiLogExecution('AUDIT','CALLSCHEDULEDSYNCWMORDER','SyncWMOrder with Internal ID '+SyncWMID+' Production Type is CUSTOMER_STOCK, these are being intentionally ignored as all quantities are 0');
		} else {
			nlapiLogExecution('AUDIT','SYNCWMORDER TEST7','');
			nlapiLogExecution('debug','SYNCWMORDER TEST1',SyncWMRecord.getFieldValue('custrecord_syncwmorderhead_orderprodtype'));
			var filters = [
				['internalid','noneof',[SyncWMID]], 'AND',
				['custrecord_syncwmorderhead_wmid','contains',SyncWMRecord.getFieldValue('custrecord_syncwmorderhead_wmid')], 'AND',
				['custrecord_syncwmorderhead_syncstatus','noneof',[7]]
			];
			
			var columns = [];
			columns[0] = new nlobjSearchColumn('internalid');
			columns[1] = new nlobjSearchColumn('custrecord_syncwmorderhead_orderheadkey');
			columns[2] = new nlobjSearchColumn('custrecord_syncwmorderhead_orderno');
			
			var searchResults = nlapiSearchRecord('customrecord_syncwmorderheader',null,filters,columns);
			var RecordID = 0;
			
			if(searchResults) {
				nlapiLogExecution('AUDIT','SYNCWMORDER TEST8','');
				//Matching sync records - record is a duplicate
				SyncWMRecord.setFieldValue('custrecord_syncwmorderhead_syncstatus',7); //Set SyncStatus = Duplicate
				SyncWMRecord.setFieldValue('custrecord_syncwmorderhead_errmsg','Duplicate Sync Record - Not Processed');
				SyncWMRecord.setFieldValue('isinactive','T');
				nlapiSubmitRecord(SyncWMRecord);
				nlapiLogExecution('AUDIT','CALLSCHEDULEDSYNCWMORDER','Record identified as Duplicate, processing cancelled');
			} else {
				nlapiLogExecution('AUDIT','SYNCWMORDER TEST9','');
				//No matching sync records - not a duplicate. Continue Processing.
				
				//Find all unprocessed header lines for current order
				var filters = [
					['custrecord_syncwmorderhead_orderheadkey','is',SyncWMRecord.getFieldValue('custrecord_syncwmorderhead_orderheadkey')], 'AND',
					['custrecord_syncwmorderhead_syncstatus','anyof',[1,2,3,5]], 'AND',
					['custrecord_syncwmorderhead_retries','greaterthan',0]
				]; //Needed to add 2 to syncstatus to include current record in processing state

				var columns = [];
				columns[0] = new nlobjSearchColumn('internalid');
				columns[1] = new nlobjSearchColumn('custrecord_syncwmorderhead_orderno');
				columns[2] = new nlobjSearchColumn('custrecord_syncwmorderhead_orderheadkey');
				columns[3] = new nlobjSearchColumn('custrecord_syncwmorderhead_exchtxkey').setSort(true);
				columns[4] = new nlobjSearchColumn('custrecord_syncwmorderhead_retries');
				columns[5] = new nlobjSearchColumn('custrecord_syncwmorderhead_customerkey');
				columns[6] = new nlobjSearchColumn('custrecord_syncwmorderhead_pono');

				var searchResults = nlapiSearchRecord('customrecord_syncwmorderheader',null,filters,columns);
				
				//Find all detail lines for current order
				var filters = [
					['custrecord_syncwmorditem_orderheaderkey','is',SyncWMRecord.getFieldValue('custrecord_syncwmorderhead_orderheadkey')]
				];
				
				var columns = [];
				columns[0] = new nlobjSearchColumn('internalid');
				columns[1] = new nlobjSearchColumn('custrecord_syncwmorditem_orderitemkey');
				columns[2] = new nlobjSearchColumn('custrecord_syncwmorditem_exchtxkey');
				
				var searchLineResults = nlapiSearchRecord('customrecord_syncwmorderdetail',null,filters,columns);
				
				/** NEED TO PROCESS ONLY LAST EXCHTXKEY OF HEADER AND LAST EXCHTXKEY PER ORDERITEMKEY **/
				
				if(searchLineResults && searchResults) {
					//Detail lines found, create/update order using only LAST header line and LAST of each detail line
					nlapiLogExecution('AUDIT','SYNCWMORDER TEST10','');
					var HeadMax = -1;
					var HeadIndex = -1;
					var LineObj = {};
					var LineIdObj = {};
					
					for(ho=0; ho<searchResults.length; ho++) {
						ExTxKey = searchResults[ho].getValue('custrecord_syncwmorderhead_exchtxkey');
						if (ExTxKey > HeadMax) {
							HeadMax = ExTxKey;
							HeadIndex = ho;
						}
					}
					nlapiLogExecution('AUDIT','SYNCWMORDER TEST11','');
					for(Lo=0; Lo<searchLineResults.length; Lo++) {
						LineKey = searchLineResults[Lo].getValue('custrecord_syncwmorditem_orderitemkey');
						ExLineKey = searchLineResults[Lo].getValue('custrecord_syncwmorditem_exchtxkey');
						tempID = 'id' + LineKey;
						if (LineKey in LineObj) {
							if (ExLineKey > LineObj.LineKey) {
								LineObj.LineKey = ExLineKey;
								LineIdObj[tempID] = Lo;
							} //Else line definition is old and should be ignored
						} else {
							LineObj.LineKey = ExLineKey;
							LineIdObj[tempID] = Lo;
						}
					}
					nlapiLogExecution('AUDIT','SYNCWMORDER TEST12','');
					//Check if Order Exists
					var filters = [
						['custbody_wmid','is',SyncWMRecord.getFieldValue('custrecord_syncwmorderhead_orderheadkey')], 'AND',
						['subsidiary','is','1']
					];
					var columns = [];
					columns[0] = new nlobjSearchColumn('internalid');
					var searchOrder = nlapiSearchRecord('salesorder',null,filters,columns);
					
					if (searchOrder) {
						//Update Order
						
						//Currently Does Nothing - should not occur during testing
						nlapiSubmitField('customrecord_syncwmorderheader',SyncWMID,'custrecord_syncwmorderhead_errmsg','Sales Order record with Internal ID '+'PLACEHOLDER'+' already exists in Subsidiary 1.'); //searchOrder[0].getValue('internalid')
					} else {
						nlapiLogExecution('AUDIT','SYNCWMORDER TEST14','');
						/**Create New Order in Subsidiary 1**/
						//nlapiLogExecution('debug','Preflight check on validateCustomer','Customer ID: '+searchResults[HeadIndex].getValue('custrecord_syncwmorderhead_customerkey')+' RecordID: '+SyncWMID+' HeadIndex: '+HeadIndex);
						//ValidCustomer = validateCustomer(searchResults[HeadIndex].getValue('custrecord_syncwmorderhead_customerkey'));
						
						Record = nlapiCreateRecord('salesorder');
						Record.setFieldValue('subsidiary','1');
						//if(ValidCustomer != '' && ValidCustomer != null) {Record.setFieldValue('entity',ValidCustomer); } else {throw nlapiCreateError('Error', 'Customer '+ValidCustomer+' is not valid.');}
						Record.setFieldValue('entity','9622'); //Hardcode to ANC Sales for Subsidiary 1
						Record.setFieldValue('trandate',nlapiDateToString(tempDate,'date'));
						Record.setFieldValue('memo','Created from WM Order No '+searchResults[HeadIndex].getValue('custrecord_syncwmorderhead_orderno'));
						Record.setFieldValue('otherrefnum',searchResults[HeadIndex].getValue('custrecord_syncwmorderhead_pono')); //PO Number
						//Record.setFieldValue('custbody_consignee','');
						Record.setFieldValue('custbody_wmid',searchResults[HeadIndex].getValue('custrecord_syncwmorderhead_orderheadkey'));
						
						var ctLines = 0;
						for (var LineId in LineIdObj) {
							if(LineIdObj[LineId] != "undefined") {
								nlapiLogExecution('AUDIT','SYNCWMORDER TEST15','');
								//nlapiLogExecution('debug','LineId Value','LineId: '+LineId+' LineIdObj[LineId]: '+LineIdObj[LineId]+' InternalID: '+searchLineResults[LineIdObj[LineId]].getValue('internalid'));
								LineRec = nlapiLoadRecord('customrecord_syncwmorderdetail',searchLineResults[LineIdObj[LineId]].getValue('internalid'));
								
								//nlapiLogExecution('debug','Did Line Load?',LineRec.getFieldValue('custrecord_syncwmorditem_gradekey'));
								//Set Consignee on First Line
								//if (Record.getFieldValue('custbody_consignee') == '' || Record.getFieldValue('custbody_consignee') == null) {}
								//	Record.setFieldValue('custbody_consignee',validateConsignee(LineRec.getFieldValue('custrecord_syncwmorditem_consigneekey')));
							
								nlapiLogExecution('debug','Check Line Item Values','Grade Key: '+LineRec.getFieldValue('custrecord_syncwmorditem_gradekey')+' validated item: '+getSalesItem('ZZZZ'+LineRec.getFieldValue('custrecord_syncwmorditem_gradekey'))+' Quantity: '+LineRec.getFieldValue('custrecord_syncwmorditem_unitsordered'));
								
								//Add item if positive quantity
								if(LineRec.getFieldValue('custrecord_syncwmorditem_weightordered') > 0) {
									Record.selectNewLineItem('item');
									tempSalesItem = getSalesItem('ZZZZ'+LineRec.getFieldValue('custrecord_syncwmorditem_gradekey'));
									Record.setCurrentLineItemValue('item','item',tempSalesItem);
									Record.setCurrentLineItemValue('item','quantity',(LineRec.getFieldValue('custrecord_syncwmorditem_weightordered')/1000));
									tempIntercoPrice = nlapiLookupField('noninventoryitem',tempSalesItem,'costestimate');
									Record.setCurrentLineItemValue('item','rate',tempIntercoPrice);
									Record.setCurrentLineItemValue('item','amount',(LineRec.getFieldValue('custrecord_syncwmorditem_weightordered')/1000)*tempIntercoPrice);
									Record.setCurrentLineItemValue('item','taxcode','82'); //Hardcoded to Non-Taxable for Intercompany
									Record.setCurrentLineItemValue('item','custcol_rollwidth',LineRec.getFieldValue('custrecord_syncwmorditem_width'));
									Record.setCurrentLineItemValue('item','custcol_rolldiameter',LineRec.getFieldValue('custrecord_syncwmorditem_diameter'));
									Record.commitLineItem('item');
									ctLines++;
								}
							}
						}
						
						if(ctLines > 0) {
							nlapiLogExecution('AUDIT','SYNCWMORDER TEST16','');
							RecordID = nlapiSubmitRecord(Record);
							
							/**
							Currently assuming all header lines succeed - need to improve this logic per-item
							**/
							for (n = 0; n<searchResults.length; n++) {
								//nlapiSubmitField('customrecord_syncwmorderheader',searchResults[n].getValue('internalid'),'custrecord_syncwmorderhead_syncstatus',4);
								nlapiSubmitField('customrecord_syncwmorderheader',searchResults[n].getValue('internalid'),'custrecord_syncwmorderhead_errmsg','Created Sales Order record with Internal ID '+RecordID+' in Subsidiary 1. ');
								nlapiSubmitField('customrecord_syncwmorderheader',searchResults[n].getValue('internalid'),'custrecord_syncwmorderhead_nsid','Sub1-SO: '+RecordID);
							}
							
							nlapiLogExecution('AUDIT','CALLSCHEDULEDSYNCWMORDER','Sales Order record with Internal ID '+RecordID+' has been created in subsidiary 1.');
						} else {
							nlapiSubmitField('customrecord_syncwmorderheader',searchResults[0].getValue('internalid'),'custrecord_syncwmorderhead_syncstatus',4); //Was Error '3' but now Complete '4'
							nlapiSubmitField('customrecord_syncwmorderheader',searchResults[0].getValue('internalid'),'custrecord_syncwmorderhead_errmsg','SKIPPED: No valid order lines were added for Order Number '+searchResults[0].getValue('custrecord_syncwmorderhead_orderno')+' - order creation has been cancelled');
							nlapiSubmitField('customrecord_syncwmorderheader',searchResults[0].getValue('internalid'),'custrecord_syncwmorderhead_retries',0);
							nlapiLogExecution('AUDIT','CALLSCHEDULEDSYNCWMORDER','SyncWMOrder with Internal ID '+searchResults[0].getValue('internalid')+' has no valid order lines and has been skipped.');
						}
					}
					
					/**Create New PO in Subsidiary 5**/
					//Check if PO Exists
					var filters = [
						['custbody_wmid','is',SyncWMRecord.getFieldValue('custrecord_syncwmorderhead_orderheadkey')], 'AND',
						['subsidiary','is','5']
					];
					var columns = [];
					columns[0] = new nlobjSearchColumn('internalid');
					var searchOrder = nlapiSearchRecord('purchaseorder',null,filters,columns);
					
					if (searchOrder) {
						//Update Order
						
						nlapiSubmitField('customrecord_syncwmorderheader',SyncWMID,'custrecord_syncwmorderhead_errmsg',nlapiLookupField('customrecord_syncwmorderheader',SyncWMID,'custrecord_syncwmorderhead_errmsg')+' Purchase Order record with Internal ID '+searchOrder[0].getValue('internalid')+' already exists in Subsidiary 5.');
						//Currently Does Nothing - should not occur during testing
					} else {
						RecordPO = nlapiCreateRecord('purchaseorder');
						RecordPO.setFieldValue('subsidiary','5');
						//if(ValidCustomer != '' && ValidCustomer != null) {RecordPO.setFieldValue('entity',ValidCustomer); } else {throw nlapiCreateError('Error', 'Customer '+ValidCustomer+' is not valid.');}
						RecordPO.setFieldValue('entity','9625'); //Hardcode to ANC for Subsidiary 5
						RecordPO.setFieldValue('trandate',nlapiDateToString(tempDate,'date'));
						RecordPO.setFieldValue('memo','Created from WM Order No '+searchResults[HeadIndex].getValue('custrecord_syncwmorderhead_orderno'));
						RecordPO.setFieldValue('otherrefnum',searchResults[HeadIndex].getValue('custrecord_syncwmorderhead_pono')); //PO Number
						//RecordPO.setFieldValue('custbody_consignee','');
						RecordPO.setFieldValue('custbody_wmid',searchResults[HeadIndex].getValue('custrecord_syncwmorderhead_orderheadkey'));
						if (RecordID != 0 && RecordID != '0') { RecordPO.setFieldValue('intercotransaction',RecordID); }
						
						
						var ctLines = 0;
						for (var LineId in LineIdObj) {
							if(LineIdObj[LineId] != "undefined") {
								nlapiLogExecution('AUDIT','SYNCWMORDER TEST15B','');
								//nlapiLogExecution('debug','LineId Value','LineId: '+LineId+' LineIdObj[LineId]: '+LineIdObj[LineId]+' InternalID: '+searchLineResults[LineIdObj[LineId]].getValue('internalid'));
								LineRec = nlapiLoadRecord('customrecord_syncwmorderdetail',searchLineResults[LineIdObj[LineId]].getValue('internalid'));
								
								//nlapiLogExecution('debug','Did Line Load?',LineRec.getFieldValue('custrecord_syncwmorditem_gradekey'));
								//Set Consignee on First Line
								//if (RecordPO.getFieldValue('custbody_consignee') == '' || RecordPO.getFieldValue('custbody_consignee') == null) {}
								//	RecordPO.setFieldValue('custbody_consignee',validateConsignee(LineRec.getFieldValue('custrecord_syncwmorditem_consigneekey')));
							
								nlapiLogExecution('debug','Check Line Item Values','Grade Key: '+LineRec.getFieldValue('custrecord_syncwmorditem_gradekey')+' validated item: '+getSalesItem('ZZZZ'+LineRec.getFieldValue('custrecord_syncwmorditem_gradekey'))+' Quantity: '+LineRec.getFieldValue('custrecord_syncwmorditem_unitsordered'));
								
								//Add item if positive quantity
								if(LineRec.getFieldValue('custrecord_syncwmorditem_weightordered') > 0) {
									RecordPO.selectNewLineItem('item');
									tempSalesItem = getSalesItem('ZZZZ'+LineRec.getFieldValue('custrecord_syncwmorditem_gradekey'));
									RecordPO.setCurrentLineItemValue('item','item',tempSalesItem);
									RecordPO.setCurrentLineItemValue('item','quantity',(LineRec.getFieldValue('custrecord_syncwmorditem_weightordered')/1000));
									tempIntercoPrice = parseFloat(nlapiLookupField('noninventoryitem',tempSalesItem,'costestimate')).toFixed(2);
									RecordPO.setCurrentLineItemValue('item','rate',tempIntercoPrice);
									tempAmount = parseFloat((LineRec.getFieldValue('custrecord_syncwmorditem_weightordered')/1000)*tempIntercoPrice).toFixed(2);
									RecordPO.setCurrentLineItemValue('item','amount',tempAmount);
									RecordPO.setCurrentLineItemValue('item','taxcode','82'); //Hardcoded to Non-Taxable for Intercompany
									RecordPO.setCurrentLineItemValue('item','custcol_rollwidth',LineRec.getFieldValue('custrecord_syncwmorditem_width'));
									RecordPO.setCurrentLineItemValue('item','custcol_rolldiameter',LineRec.getFieldValue('custrecord_syncwmorditem_diameter'));
									RecordPO.commitLineItem('item');
									ctLines++;
								}
							}
						}
						/*
						//Check if Interco Variance to prevent ERROR
						SOBalance = nlapiLookupField('salesorder',RecordID,'total');
						SOPODifference = SOBalance - RecordPO.getFieldValue('total');
						if (SOPODifference != 0) {
							RecordPO.selectNewLineItem('item');
							RecordPO.setCurrentLineItemValue('item','item','12497'); //Hardcoded to Intercompany Rounding Outage
							RecordPO.setCurrentLineItemValue('item','quantity',1);
							RecordPO.setCurrentLineItemValue('item','rate',SOPODifference);
							RecordPO.setCurrentLineItemValue('item','amount',SOPODifference);
							RecordPO.commitLineItem('item');
							ctLines++;
						}
						*/
						
						if(ctLines > 0) {
							nlapiLogExecution('AUDIT','SYNCWMORDER TEST16B','');
							RecordPOID = nlapiSubmitRecord(RecordPO);
							if (RecordID != 0 && RecordID != '0' ) { nlapiSubmitField('salesorder',RecordID,'intercotransaction',RecordPOID); }
							
							//Currently assuming all header lines succeed - need to improve this logic per-item
							for (n = 0; n<searchResults.length; n++) {
								//nlapiSubmitField('customrecord_syncwmorderheader',searchResults[n].getValue('internalid'),'custrecord_syncwmorderhead_syncstatus',4);
								nlapiSubmitField('customrecord_syncwmorderheader',searchResults[n].getValue('internalid'),'custrecord_syncwmorderhead_errmsg',nlapiLookupField('customrecord_syncwmorderheader',searchResults[n].getValue('internalid'),'custrecord_syncwmorderhead_errmsg')+'Created Purchase Order record with Internal ID '+RecordPOID+' in Subsidiary 5.');
								nlapiSubmitField('customrecord_syncwmorderheader',searchResults[n].getValue('internalid'),'custrecord_syncwmorderhead_nsid','Sub5-PO: '+RecordPOID);
							}
							
							nlapiLogExecution('AUDIT','CALLSCHEDULEDSYNCWMPO','Purchase Order record with Internal ID '+RecordPOID+' has been created in subsidiary 5.');
						} else {
							nlapiSubmitField('customrecord_syncwmorderheader',searchResults[0].getValue('internalid'),'custrecord_syncwmorderhead_syncstatus',4); //Was Error '3' but now Complete '4'
							nlapiSubmitField('customrecord_syncwmorderheader',searchResults[0].getValue('internalid'),'custrecord_syncwmorderhead_errmsg','SKIPPED: No valid order lines were added for Order Number '+searchResults[0].getValue('custrecord_syncwmorderhead_orderno')+' - order creation has been cancelled');
							nlapiSubmitField('customrecord_syncwmorderheader',searchResults[0].getValue('internalid'),'custrecord_syncwmorderhead_retries',0);
							nlapiLogExecution('AUDIT','CALLSCHEDULEDSYNCWMORDER','SyncWMOrder with Internal ID '+searchResults[0].getValue('internalid')+' has no valid order lines and has been skipped.');
						}
					}
					/** END OF PO **/
					
					//Check if SO Exists in Sub5
					var filters = [
						['custbody_wmid','is',SyncWMRecord.getFieldValue('custrecord_syncwmorderhead_orderheadkey')], 'AND',
						['subsidiary','is','5']
					];
					var columns = [];
					columns[0] = new nlobjSearchColumn('internalid');
					var searchOrder = nlapiSearchRecord('salesorder',null,filters,columns);
					
					if (searchOrder) {
						//Update SO in Subsidiary 5
						Record5 = nlapiLoadRecord('salesorder',searchOrder[0].getValue('internalid'));
						ValidCustomer = validateCustomer(searchResults[HeadIndex].getValue('custrecord_syncwmorderhead_customerkey'));
						totalLines = Record5.getLineItemCount('item');
						if(totalLines > 0){
							for (n=totalLines; n>0; n--) { Record5.removeLineItem('item',n); }
						} else {
							throw nlapiCreateError('error','Order Record exists but unable to get number of lines to remove lines - update cancelled');
						}
						//nlapiSubmitField('customrecord_syncwmorderheader',SyncWMID,'custrecord_syncwmorderhead_errmsg',nlapiLookupField('customrecord_syncwmorderheader',SyncWMID,'custrecord_syncwmorderhead_errmsg')+' Sales Order record with Internal ID '+searchOrder[0].getValue('internalid')+' already exists in Subsidiary 5.');
						//throw nlapiCreateError('error','Not yet ready to update orders - processing cancelled.');
					} else {
						//Use 'intercotransaction' to match with Sub 1 Order
						//Create New SO in Subisidary 5
						//nlapiLogExecution('debug','Preflight check on validateCustomer','Customer ID: '+searchResults[HeadIndex].getValue('custrecord_syncwmorderhead_customerkey')+' RecordID: '+SyncWMID+' HeadIndex: '+HeadIndex);
						ValidCustomer = validateCustomer(searchResults[HeadIndex].getValue('custrecord_syncwmorderhead_customerkey'));
						Record5 = nlapiCreateRecord('salesorder');
						Record5.setFieldValue('subsidiary','5');
						if(ValidCustomer != '' && ValidCustomer != null) {Record5.setFieldValue('entity',ValidCustomer); } else {throw nlapiCreateError('Error', 'Customer "'+ValidCustomer+'" is not valid.');}
					}
					Record5.setFieldValue('trandate',nlapiDateToString(tempDate,'date'));
					Record5.setFieldValue('custbody_pefctransaction',nlapiLookupField('customer',ValidCustomer,'custentity_pefc'));
					Record5.setFieldValue('memo','Created from WM Order No '+searchResults[HeadIndex].getValue('custrecord_syncwmorderhead_orderno'));
					Record5.setFieldValue('otherrefnum',searchResults[HeadIndex].getValue('custrecord_syncwmorderhead_pono')); //PO Number
					Record5.setFieldValue('custbody_wmid',searchResults[HeadIndex].getValue('custrecord_syncwmorderhead_orderheadkey'));
					
					var ctLines = 0;
					for (var LineId in LineIdObj) {
						if(LineIdObj[LineId] != "undefined") {
							nlapiLogExecution('AUDIT','SYNCWMORDER TEST19','');
							//nlapiLogExecution('debug','LineId Value','LineId: '+LineId+' LineIdObj[LineId]: '+LineIdObj[LineId]+' InternalID: '+searchLineResults[LineIdObj[LineId]].getValue('internalid'));
							LineRec = nlapiLoadRecord('customrecord_syncwmorderdetail',searchLineResults[LineIdObj[LineId]].getValue('internalid'));
							
							//nlapiLogExecution('debug','Did Line Load?',LineRec.getFieldValue('custrecord_syncwmorditem_gradekey'));
							//Set Consignee on First Line
							if (Record5.getFieldValue('custbody_consignee') == '' || Record5.getFieldValue('custbody_consignee') == null) {
								Record5.setFieldValue('custbody_consignee',validateConsignee(LineRec.getFieldValue('custrecord_syncwmorditem_consigneekey'),ValidCustomer));
							}
							
							//nlapiLogExecution('debug','Check Line Item Values','Grade Key: '+LineRec.getFieldValue('custrecord_syncwmorditem_gradekey')+' validated item: '+getSalesItem('ZZZZ'+LineRec.getFieldValue('custrecord_syncwmorditem_gradekey'))+' Quantity: '+LineRec.getFieldValue('custrecord_syncwmorditem_unitsordered'));
							
							//Add item if positive quantity
							if(LineRec.getFieldValue('custrecord_syncwmorditem_weightordered') > 0) {
								Record5.selectNewLineItem('item');
								tempExternalItem = getSalesItem('SALE'+LineRec.getFieldValue('custrecord_syncwmorditem_gradekey'));
								Record5.setCurrentLineItemValue('item','item',tempExternalItem);
								Record5.setCurrentLineItemValue('item','quantity',(LineRec.getFieldValue('custrecord_syncwmorditem_weightordered')/1000));
								Record5.setCurrentLineItemValue('item','rate',validateConsigneePrice(tempExternalItem,ValidCustomer,validateConsignee(LineRec.getFieldValue('custrecord_syncwmorditem_consigneekey'),ValidCustomer),tempDate));
								//Record5.setCurrentLineItemValue('item','amount',LineRec.getFieldValue('custrecord_syncwmorditem_weightordered')*rollCost);
								Record5.setCurrentLineItemValue('item','custcol_rollwidth',LineRec.getFieldValue('custrecord_syncwmorditem_width'));
								Record5.setCurrentLineItemValue('item','custcol_rolldiameter',LineRec.getFieldValue('custrecord_syncwmorditem_diameter'));
								Record5.commitLineItem('item');
								ctLines++;
							}
						}
					}
					
					if(ctLines > 0) {
						//nlapiLogExecution('AUDIT','SYNCWMORDER TEST20','');
						RecordID = nlapiSubmitRecord(Record5);
						
						//Currently assuming all header lines succeed - need to improve this logic per-item
						for (n = 0; n<searchResults.length; n++) {
							nlapiSubmitField('customrecord_syncwmorderheader',searchResults[n].getValue('internalid'),'custrecord_syncwmorderhead_syncstatus',4);
							if(searchOrder) {
								nlapiSubmitField('customrecord_syncwmorderheader',searchResults[n].getValue('internalid'),'custrecord_syncwmorderhead_errmsg',nlapiLookupField('customrecord_syncwmorderheader',searchResults[n].getValue('internalid'),'custrecord_syncwmorderhead_errmsg')+' Updated Sales Order record with Internal ID '+RecordID+' in Subsidiary 5.');
							} else {
								nlapiSubmitField('customrecord_syncwmorderheader',searchResults[n].getValue('internalid'),'custrecord_syncwmorderhead_errmsg',nlapiLookupField('customrecord_syncwmorderheader',searchResults[n].getValue('internalid'),'custrecord_syncwmorderhead_errmsg')+' Created Sales Order record with Internal ID '+RecordID+' in Subsidiary 5.');
							}
							nlapiSubmitField('customrecord_syncwmorderheader',searchResults[n].getValue('internalid'),'custrecord_syncwmorderhead_nsid',nlapiLookupField('customrecord_syncwmorderheader',searchResults[n].getValue('internalid'),'custrecord_syncwmorderhead_nsid')+' Sub5-SO: '+RecordID);
						}
						//nlapiLogExecution('AUDIT','CALLSCHEDULEDSYNCWMORDER','Sales Order record with Internal ID '+RecordID+' has been created in subsidiary 5.');
					} else {
						nlapiSubmitField('customrecord_syncwmorderheader',searchResults[0].getValue('internalid'),'custrecord_syncwmorderhead_syncstatus',4); //Was Error '3' but now Complete '4'
						nlapiSubmitField('customrecord_syncwmorderheader',searchResults[0].getValue('internalid'),'custrecord_syncwmorderhead_errmsg','SKIPPED: No valid order lines were added for Order Number '+searchResults[0].getValue('custrecord_syncwmorderhead_orderno')+' - order creation has been cancelled');
						nlapiSubmitField('customrecord_syncwmorderheader',searchResults[0].getValue('internalid'),'custrecord_syncwmorderhead_retries',0);
						nlapiLogExecution('AUDIT','CALLSCHEDULEDSYNCWMORDER','SyncWMOrder with Internal ID '+searchResults[0].getValue('internalid')+' has no valid order lines and has been skipped.');
					
					}
				} else if (searchResults) {
					//No detail lines found, mark header lines with error
					for(x=0; x<searchResults.length; x++) {
						nlapiSubmitField('customrecord_syncwmorderheader',searchResults[x].getValue('internalid'),'custrecord_syncwmorderhead_syncstatus',4); //Was Error '3' but now Complete '4'
						nlapiSubmitField('customrecord_syncwmorderheader',searchResults[x].getValue('internalid'),'custrecord_syncwmorderhead_errmsg','SKIPPED: No Detail Lines found for OrderHeaderKey '+searchResults[x].getValue('custrecord_syncwmorderhead_orderheadkey')+' OrderNo: '+searchResults[x].getValue('custrecord_syncwmorderhead_orderno'));
						nlapiSubmitField('customrecord_syncwmorderheader',searchResults[x].getValue('internalid'),'custrecord_syncwmorderhead_retries',0);
						nlapiLogExecution('AUDIT','CALLSCHEDULEDSYNCWMORDER','SyncWMOrder with Internal ID '+searchResults[x].getValue('internalid')+' has no detail lines and has been skipped.');
					}
				} else {
					nlapiLogExecution('AUDIT','SYNCWMORDER TEST23','');
					throw nlapiCreateError('error','No header lines found - issue with search parameters');
				}
			}
		}
	}
	catch(e){
		nlapiLogExecution('AUDIT','SYNCWMORDER TEST24','');
        nlapiLogExecution('error','ScheduledSyncWMOrder() has encountered an error.',errText(e));
		nlapiSubmitField('customrecord_syncwmorderheader',SyncWMID,'custrecord_syncwmorderhead_syncstatus','3'); //Set SyncStatus = Error
		nlapiSubmitField('customrecord_syncwmorderheader',SyncWMID,'custrecord_syncwmorderhead_errmsg','Error Details: '+errText(e));
		tempRetries = nlapiLookupField('customrecord_syncwmorderheader',SyncWMID,'custrecord_syncwmorderhead_retries');
		nlapiSubmitField('customrecord_syncwmorderheader',SyncWMID,'custrecord_syncwmorderhead_retries',(tempRetries - 1));
		nlapiLogExecution('debug','CALLSCHEDULESYNCWMORDER','ScheduledSyncWMOrderHeader has been updated with '+(tempRetries - 1)+' retries.');
    }
	nlapiLogExecution('AUDIT','SYNCWMORDER TEST3','');
	findNextRecord();
}

function findNextRecord(){
		//Check for additional records to add to processing queue
		var filters = [
			['custrecord_syncwmorderhead_syncstatus','anyof',[1,3,5]], 'AND',
			['custrecord_syncwmorderhead_retries','greaterthan',0]
			];
		
		var columns = [];
		columns[0] = new nlobjSearchColumn('internalid');
		
		var searchResults = nlapiSearchRecord('customrecord_syncwmorderheader',null,filters,columns);
		
		if(searchResults) {
			var nextSyncWMID = searchResults[0].getValue('internalid');
			nlapiLogExecution('AUDIT','CALLSCHEDULEDSYNCWMORDER','Additional records to sync found. Queueing '+nextSyncWMID);
			var newParams = {'custscript_syncwmorderid':nextSyncWMID};
			var ScheduleStatus = nlapiScheduleScript(script_id,null,newParams); //Deployment is empty so that script selects first available deployment
			if(ScheduleStatus == 'QUEUED') {
				nlapiSubmitField('customrecord_syncwmorderheader',nextSyncWMID,'	custrecord_syncwmorderhead_syncstatus','6');
			} //Else no available deployments - remaining records will be caught by periodic retry script
		} else {
			nlapiLogExecution('AUDIT','CALLSCHEDULEDSYNCWMORDER','No records to sync found.');
			nlapiLogExecution('AUDIT','SYNCWMORDER TEST2','');
		}
}

function errText(_e)
{
    
        _internalId = nlapiGetRecordId();
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

function validateItem(aggKey) {
	var quality = aggKey.substring(0,4);
	var prodGrade = aggKey.substring(4);
	if(prodGrade == null || prodGrade == '' || quality == null || quality == '') {
		throw nlapiCreateError('error','validateItem function unable to find item for aggKey '+aggKey);
	} else if (quality == 'SALE'){ //PRIME quality items
		/** SHOULD SEARCH ITEMS AND BUILD UP A DICTIONARY **/
		switch(prodGrade) {
			case '17': return '12137'; //'NPO59ST';
			case '19': return '12139'; //'NPT59ST'
			case '23': return '12136'; //'NPL59ST';
			case '28': return '12135'; //'NPA59ST';
			case '30': return '12132'; //'HBT65ST';
			case '31': return '12131'; //'HBT65RO';
			case '34': return '12134'; //'HBT70ST';
			case '35': return '12133'; //'HBT70RO';
			case '36': return '12130'; //'HBO65ST';
			case '37': return '17485'; //'HBO65RO';
			case '38': return '12138'; //'NPT59RO';
			case '40': return '17488'; //'NPL59RO';
			case '41': return '17491'; //'HBL63ST';
			case '42': return '17494'; //'HBL63RO';
			case '45': return '17482'; //'HBK63RO';
			case '46': return '17479'; //'HBK63ST';
			case '47': return '45327'; //'LNX57ST';
			case '48': return '58549'; //LNY56ST
			case '49': return '58550'; //LNY56RO
			case '50': return '58548'; //LNZ56ST
			case '51': return '68399'; //LNZ56RO
		}
	} else if (quality == 'CULL') { //OFFGRADE quality items
		/** SHOULD SEARCH ITEMS AND BUILD UP A DICTIONARY **/
		switch(prodGrade) {
			case '17': return '12146'; //'NPO59ST';
			case '19': return '12148'; //'NPT59ST'
			case '23': return '12145'; //'NPL59ST';
			case '28': return '12144'; //'NPA59ST';
			case '30': return '12141'; //'HBT65ST';
			case '31': return '12140'; //'HBT65RO';
			case '34': return '12143'; //'HBT70ST';
			case '35': return '12142'; //'HBT70RO';
			case '36': return '12149'; //'HBO65ST';
			case '37': return '17486'; //'HBO65RO';
			case '38': return '12147'; //'NPT59RO';
			case '40': return '17489'; //'NPL59RO';
			case '41': return '17492'; //'HBL63ST';
			case '42': return '17495'; //'HBL63RO';
			case '45': return '17483'; //'HBK63RO';
			case '46': return '17480'; //'HBK63ST';
			case '47': return '45328'; //'LNX57ST';
			case '48': return '58553'; //LNY56ST
			case '49': return '58555'; //LNY56RO
			case '50': return '58551'; //LNZ56ST
			case '51': return '68398'; //LNZ56RO
		}
	} else if (quality == 'BEAT') { //BEATER quality items
		/** SHOULD SEARCH ITEMS AND BUILD UP A DICTIONARY **/
		switch(prodGrade) {
			case '17': return '12157'; //'NPO59ST';
			case '19': return '12159'; //'NPT59ST'
			case '23': return '12156'; //'NPL59ST';
			case '28': return '12155'; //'NPA59ST';
			case '30': return '12152'; //'HBT65ST';
			case '31': return '12151'; //'HBT65RO';
			case '34': return '12154'; //'HBT70ST';
			case '35': return '12153'; //'HBT70RO';
			case '36': return '12150'; //'HBO65ST';
			case '37': return '17487'; //'HBO65RO';
			case '38': return '12158'; //'NPT59RO';
			case '40': return '17490'; //'NPL59RO';
			case '41': return '17493'; //'HBL63ST';
			case '42': return '17496'; //'HBL63RO';
			case '45': return '17484'; //'HBK63RO';
			case '46': return '17481'; //'HBK63ST';
			case '47': return '45329'; //'LNX57ST';
			case '48': return '58554'; //LNY56ST
			case '49': return '58556'; //LNY56RO
			case '50': return '58552'; //LNZ56ST
			case '51': return '68397'; //LNZ56RO
		}
	} else if (quality == 'HELD') { return '12285'; } //Held Inventory
	throw nlapiCreateError('error','validateItem function unable to find item for aggKey '+aggKey);
}

function getSalesItem(aggKey) {
	var quality = aggKey.substring(0,4);
	var prodGrade = aggKey.substring(4);
	if(prodGrade == null || prodGrade == '') {
		throw nlapiCreateError('error','getSalesItem function unable to find item for aggKey '+aggKey);
	} else { //Always use PRIME quality items
		switch(prodGrade) {
			case '17': return '142'; //'NPO59ST';
			case '19': return '144'; //'NPT59ST';
			case '23': return '141'; //'NPL59ST';
			case '28': return '140'; //'NPA59ST';
			case '30': return '137'; //'HBT65ST';
			case '31': return '136'; //'HBT65RO';
			case '34': return '139'; //'HBT70ST';
			case '35': return '138'; //'HBT70RO';
			case '36': return '135'; //'HBO65ST';
			case '37': return '17497'; //'HBO65RO'; /**Should return ERROR**/
			case '38': return '143'; //'NPT59RO';
			case '40': return '12309'; //'NPL59RO';
			case '41': return '12307'; //'HBL63ST';
			case '42': return '12311'; //'HBL63RO';
			case '45': return '17501'; //'HBK63RO'
			case '46': return '17499'; //'HBK63ST'
			case '47': return '45330'; //'LNX57ST'
			case '48': return '58562'; //LNY56ST
			case '49': return '58565'; //LNY56RO
			case '50': return '58557'; //LNZ56ST			
			case '51': return '68395'; //LNZ56RO
		}
	}
	throw nlapiCreateError('error','getSalesItem function unable to find item for aggKey '+aggKey);
}

function validateCustomer(customerKey) {
	if (customerKey == '' || customerKey == null) {
		throw nlapiCreateError('error','CustomerKey is null or empty, unable to validate Customer.');
	} else {
		var filters = [['custentity_wmid','is',customerKey]];
		var columns = [];
		columns[0] = new nlobjSearchColumn('internalid');
		var searchCustomers = nlapiSearchRecord('customer',null,filters,columns);
		if (searchCustomers) {
			return searchCustomers[0].getValue('internalid');
		} else {
			throw nlapiCreateError('error','No Customer Found with CustomerKey '+customerKey);
		}
	}
}

function validateConsignee(consigneeKey,CustKey) {
	//Check if Consignee Exists for current Customer
	var filters = [
		['custrecord_alberta_ns_consigneekey','is',consigneeKey], 'AND',
		['custrecord_alberta_ns_customer','is',CustKey], 'AND',
		['isinactive','is','F']
	];
	var columns = [];
	columns[0] = new nlobjSearchColumn('internalid');
	columns[1] = new nlobjSearchColumn('custrecord_alberta_ns_customer');
	var searchConsignees = nlapiSearchRecord('customrecord_alberta_ns_consignee_record',null,filters,columns);
	if (searchConsignees) {
		//ConsKey = searchConsignees[0].getValue('internalid');
		
		//Check if Consignee already connected to Customer
		var CustConsID = 99999999;
		for(n=searchConsignees.length-1; n>-1; n--) {
			if(searchConsignees[n].getValue('custrecord_alberta_ns_customer') == CustKey && parseInt(searchConsignees[n].getValue('internalid')) < parseInt(CustConsID)) {CustConsID = searchConsignees[n].getValue('internalid');}
		}
		
		var CurrentRec = nlapiLoadRecord('customrecord_alberta_ns_consignee_record',searchConsignees[0].getValue('internalid'));
		if(CustConsID == -1 || CustConsID == 99999999) {
			//Consignee/Customer combination must be created
			NewRec = nlapiCreateRecord('customrecord_alberta_ns_consignee_record');
			NewRec.setFieldValue('custrecord_alberta_ns_ship_address',CurrentRec.getFieldValue('custrecord_alberta_ns_ship_address'));
			NewRec.setFieldValue('custrecord_alberta_ns_consigneekey',CurrentRec.getFieldValue('custrecord_alberta_ns_consigneekey'));
			NewRec.setFieldValue('custrecord_alberta_ns_ship_addrprovince',CurrentRec.getFieldValue('custrecord_alberta_ns_ship_addrprovince'));
			NewRec.setFieldValue('custrecord_alberta_ns_contact',CurrentRec.getFieldValue('custrecord_alberta_ns_contact'));
			NewRec.setFieldValue('custrecord_alberta_ns_consigneeno',CurrentRec.getFieldValue('custrecord_alberta_ns_consigneeno'));
			NewRec.setFieldValue('name',CurrentRec.getFieldValue('name'));
			NewRec.setFieldValue('custrecord_alberta_ns_customer',CustKey);
			
			throw nlapiCreateError('error','Attempting to create new Consignee for ConsigneeKey: '+consigneeKey);
			
			NewRecID = nlapiSubmitRecord(NewRec);
			
			nlapiLogExecution('AUDIT','CALLSCHEDULEDSYNCWMORDER','Consignee record with Internal ID '+NewRecID+' has been created.');
			return NewRecID;
		} else {
			//Consignee/Customer combination exists
			nlapiLogExecution('AUDIT','CALLSCHEDULEDSYNCWMORDER','Consignee record with Internal ID '+CustConsID+' already exists.');
			return CustConsID;
		}
	} else { 
		throw nlapiCreateError('error','No Consignee Found with matching WM ID (Consignee Key) for '+consigneeKey+' and Customer Key '+CustKey);
	}
}

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
		if (ValidCustomer == '' || ValidCustomer == null) { throw nlapiCreateError('error','Customer and Consignee Key are both missing, unable to get line pricing'); }
		//Search on just Customer
		priceFilters = [
			['custrecord_albert_ns_item_price_customer','is',ValidCustomer], 'AND',
			['custrecord_alberta_ns_item','is',salesItem]
		];
		filterType = 'Customer Only';
	} else if (ValidCustomer == '' || ValidCustomer == null) {
		//Unable to search on Just Consignee
		throw nlapiCreateError('error','Customer Key is missing, unable to get line item pricing');
	} else {
		//Search on Customer and Consignee
		priceFilters = [
			['custrecord_albert_ns_item_price_customer','is',ValidCustomer], 'AND',
			['custrecord_albert_ns_item_price_consigne','is',ValidConsignee], 'AND',
			['custrecord_alberta_ns_item','is',salesItem]
		];
		filterType = 'Customer and Consignee';
	}
	var priceColumns = [];
	priceColumns[0] = new nlobjSearchColumn('internalid');
	priceColumns[1] = new nlobjSearchColumn(monthField);
	priceColumns[2] = new nlobjSearchColumn('custrecord_alberta_ns_item_pricing_year');
	var searchPrices = nlapiSearchRecord('customrecord_alberta_ns_pricing_list',null,priceFilters,priceColumns);
	//nlapiLogExecution('error','searchFilterCheck','priceFilters: '+priceFilters);
	//nlapiLogExecution('error','searchPricesCheck','TranYear: '+tranYear+' ValidCustomer: '+ValidCustomer+' ValidConsignee: '+ValidConsignee+' salesItem: '+salesItem+' FilterType: '+filterType+' month: '+monthField);
	//if(searchPrices) {nlapiLogExecution('error','searchPricesResult','length: '+searchPrices.length+' value: '+searchPrices)};
	
	if(filterType == 'Customer and Consignee' && !searchPrices) {
		//No results with Consignee, attempt with Customer
		priceFilters = [
			['custrecord_albert_ns_item_price_customer','is',ValidCustomer], 'AND',
			['custrecord_alberta_ns_item','is',salesItem]
		];
		filterType = 'Customer Fallback';
		searchPrices = nlapiSearchRecord('customrecord_alberta_ns_pricing_list',null,priceFilters,priceColumns);
	}
	
	if(searchPrices) {
		for (n=0; n<searchPrices.length; n++) {
			if(searchPrices[n].getValue('custrecord_alberta_ns_item_pricing_year') == tranYear) {
				return searchPrices[n].getValue(monthField);
			}
		}
		throw nlapiCreateError('error','Price records were found with '+searchPrices.length+' results but none match year value of '+tranYear);
	} else {
		throw nlapiCreateError('error','Price Search unable to find line item pricing for Item: '+salesItem+' Customer(InternalID): '+ValidCustomer+' Consignee: '+ValidConsignee+' Year: '+tranYear+' Search Type: '+filterType);
	}
}
 
 
 
 
									