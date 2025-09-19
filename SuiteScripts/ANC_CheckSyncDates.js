/* @Scheduled Script on Periodic Deployment

Checks saved searches daily at 8:15am to get last sync date from each table
and returns results in a notification email
1.0.1 - TC10ROD 10202020 - removed kath from the list as requested by her, request date 1016202 - TCC10ROD
*/

var context = nlapiGetContext();

function CheckSyncDates(params){
	try{
		SyncResults = {"WM-Inventory":"Unknown",
			"WM-Orders":"Unknown",
			"WM-Loads":"Unknown",
			"WM-Credits":"Unknown",
			"WM-FreightInvoices":"Unknown",
			"WM-Customers":"Unknown",
			"WM-Contacts":"Unknown",
			"WM-Consignees":"Unknown",
			"WM-Carriers":"Unknown",
			"WM-CustomerConsignee":"Unknown",
			"LIMS-AP":"Unknown",
			"LIMS-AR":"Unknown",
			"LIMS-GL":"Unknown",
			"Altus-LandUse":"Unknown",
			"Altus-RoadUse":"Unknown",
			"MS-PartMaster":"Unknown",
			"MS-PurchaseOrder":"Unknown",
			"MS-InventoryTransaction":"Unknown",
			"MS-InventoryReconciliation":"Unknown",
			"MS-Supplier":"Unknown"
		};
		
		SyncResults["WM-Inventory"] = checkSearchDate('customrecord_syncwminventory');
		SyncResults["WM-Orders"] = checkSearchDate('customrecord_syncwmorderheader');
		SyncResults["WM-Loads"] = checkSearchDate('customrecord_syncwmloadheader');
		SyncResults["WM-Credits"] = checkSearchDate('customrecord_syncwmcreditmemo');
		SyncResults["WM-FreightInvoices"] = checkSearchDate('customrecord_syncwmfreightinvoice');
		SyncResults["WM-Customers"] = checkSearchDate('customrecord_syncwmcustomer');
		SyncResults["WM-Contacts"] = checkSearchDate('customrecord_syncwmcontact');
		SyncResults["WM-Consignees"] = checkSearchDate('customrecord_syncwmconsignee');
		SyncResults["WM-Carriers"] = checkSearchDate('customrecord_syncwmcarrier');
		SyncResults["WM-CustomerConsignee"] = checkSearchDate('customrecord_syncwmcustomerconsignee');
		
		SyncResults["MS-PartMaster"] = checkSearchDate('customrecord_syncmspartmaster');
		SyncResults["MS-PurchaseOrder"] = checkSearchDate('customrecord_syncmspurchaseorder');
		SyncResults["MS-InventoryTransaction"] = checkSearchDate('customrecord_syncmsinvtrans');
		SyncResults["MS-InventoryReconciliation"] = checkSearchDate('customrecord_syncmsinventory');
		
		SyncResults["LIMS-AP"] = checkSearchDate('customrecord_synclims');
		SyncResults["LIMS-AR"] = checkSearchDate('customrecord_synclims');
		SyncResults["LIMS-GL"] = checkSearchDate('customrecord_synclims');
		
		SyncResults["Altus-LandUse"] = checkSearchDate('customrecord_syncaltuslu');
		SyncResults["Altus-RoadUse"] = checkSearchDate('customrecord_syncaltusru');
				
		//7 is Lisa, 9 is Katherine, 11 is Tara-Lynn, 836 is Matt
		emailFrom = "7";
		emailUser = "7";
		emailSubject = "NetSuite Integration Sync Date Report";
      	//TC10ROD 10202020 - removed kath from the list as requested by her, request date 1016202 - TCC10ROD
		//emailCC = ["9","11","836"]; //Should be array of strings - User IDs
		emailCC = ["11","836"]; //Should be array of strings - User IDs
		emailMessage = "Please see below for the daily Integration Sync Date Report.\n\n"+
						"Wrapmation Records\n"+
						getEmailText("WM-Customers",SyncResults["WM-Customers"])+"\n"+
						getEmailText("WM-Contacts",SyncResults["WM-Contacts"])+"\n"+
						getEmailText("WM-Consignees",SyncResults["WM-Consignees"])+"\n"+
						getEmailText("WM-Carriers",SyncResults["WM-Carriers"])+"\n"+
						" \nWrapmation Secondary Tables\n"+
						getEmailText("WM-CustomerConsignee",SyncResults["WM-CustomerConsignee"])+"\n"+
						" \nWrapmation Transactions\n"+
						getEmailText("WM-Inventory",SyncResults["WM-Inventory"])+"\n"+
						getEmailText("WM-Orders",SyncResults["WM-Orders"])+"\n"+
						getEmailText("WM-Loads",SyncResults["WM-Loads"])+"\n"+
						getEmailText("WM-Credits",SyncResults["WM-Credits"])+"\n"+
						getEmailText("WM-FreightInvoices",SyncResults["WM-FreightInvoices"])+"\n"+
						" \nMainsaver Records\n"+
						getEmailText("MS-PartMaster",SyncResults["MS-PartMaster"])+"\n"+
						getEmailText("MS-PurchaseOrder",SyncResults["MS-PurchaseOrder"])+"\n"+
						getEmailText("MS-Inventory",SyncResults["MS-InventoryReconciliation"])+"\n"+
						getEmailText("MS-InventoryTransaction",SyncResults["MS-InventoryReconciliation"])+"\n"+
						"MS-Supplier: Not Yet Syncing, Pending Testing"+"\n"+
						" \nLIMS Records (Manual Imports)\n"+
						getEmailText("LIMS-AP",SyncResults["LIMS-AP"])+"\n"+
						getEmailText("LIMS-AR",SyncResults["LIMS-AR"])+"\n"+
						getEmailText("LIMS-GL",SyncResults["LIMS-GL"])+"\n"+
						"LIMS-Accruals - Still in Testing"+"\n"+
						" \nAltus Records (Manual Imports)\n"+
						getEmailText("Altus-LandUse",SyncResults["Altus-LandUse"])+"\n"+
						getEmailText("Altus-RoadUse",SyncResults["Altus-RoadUse"])+"\n";
		nlapiSendEmail(emailFrom,emailUser,emailSubject,emailMessage,emailCC);
	}
	catch(e){
        nlapiLogExecution('error','CheckSyncStatus() has encountered an error.',errText(e));
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

function checkSearchDate(RecType) {
	var columns = [];
	columns[0] = new nlobjSearchColumn('internalid').setSort(true);
	columns[1] = new nlobjSearchColumn('created');
	var searchResults = nlapiSearchRecord(RecType,null,null,columns);
	if (searchResults) {
		return searchResults[0].getValue('created');
	} else {
		return 'No Sync Records';
	}
	throw nlapiCreateError('error','Error occured during checkSearchDate for RecType '+RecType);
}

function getEmailText(RecordName,searchDate){
	return RecordName+": "+searchDate;
}