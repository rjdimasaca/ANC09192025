/* @Scheduled Script on Periodic Deployment

Checks saved searches daily at 8am to get counts of error records
and returns results in a notification email
1.0.1 - TC10ROD 10202020 - removed kath from the list as requested by her, request date 1016202 - TCC10ROD
*/

var context = nlapiGetContext();

function CheckSyncStatus(params){
	try{
		SyncResults = {"WM-Inventory":-1,
			"WM-Orders":-1,
			"WM-Loads":-1,
			"WM-Credits":-1,
			"WM-FreightInvoices":-1,
			"WM-Customers":-1,
			"WM-Contacts":-1,
			"WM-Consignees":-1,
			"WM-Carriers":-1,
			"WM-CustomerConsignee":-1,
			"LIMS-AP":-1,
			"LIMS-AR":-1,
			"LIMS-GL":-1,
			"Altus-LandUse":-1,
			"Altus-RoadUse":-1,
			"MS-PartMaster":-1,
			"MS-PurchaseOrder":-1,
			"MS-InventoryTransaction":-1,
			"MS-InventoryReconciliation":-1,
			"MS-Supplier":-1
		};
		
		SyncResults["WM-Inventory"] = checkSavedErrorSearch('customrecord_syncwminventory','customsearch_pendingsyncwminventory');
		SyncResults["WM-Orders"] = checkSavedErrorSearch('customrecord_syncwmorderheader','customsearch_pendingsyncwmorders');
		SyncResults["WM-Loads"] = checkSavedErrorSearch('customrecord_syncwmloadheader','customsearch_pendingsyncwmload');
		SyncResults["WM-Credits"] = checkSavedErrorSearch('customrecord_syncwmcreditmemo','customsearch_pendingsyncwmcredit');
		SyncResults["WM-FreightInvoices"] = checkSavedErrorSearch('customrecord_syncwmfreightinvoice','customsearch_pendingsyncwmfreight');
		SyncResults["WM-Customers"] = checkSavedErrorSearch('customrecord_syncwmcustomer','customsearch_pendingsyncwmcustomer');
		SyncResults["WM-Contacts"] = checkSavedErrorSearch('customrecord_syncwmcontact','customsearch_pendingsyncwmcontact');
		SyncResults["WM-Consignees"] = checkSavedErrorSearch('customrecord_syncwmconsignee','customsearch_pendingsyncwmconsignee');
		SyncResults["WM-Carriers"] = checkSavedErrorSearch('customrecord_syncwmcarrier','customsearch_pendingsyncwmcarrier');
		SyncResults["WM-CustomerConsignee"] = checkSavedErrorSearch('customrecord_syncwmcustomerconsignee','customsearch_pending_syncwmcustcons');
		
		SyncResults["MS-PartMaster"] = checkSavedErrorSearch('customrecord_syncmspartmaster','customsearch_pendingsyncmspartmaster');
		SyncResults["MS-PurchaseOrder"] = checkSavedErrorSearch('customrecord_syncmspurchaseorder','customsearch_pendingsyncmspurchaseorder');
		SyncResults["MS-InventoryTransaction"] = checkSavedErrorSearch('customrecord_syncmsinvtrans','customsearch_pendingsyncmsinvtxn');
		SyncResults["MS-InventoryReconciliation"] = checkSavedErrorSearch('customrecord_syncmsinventory','customsearch_pendingsyncmsinventory');
		
		SyncResults["LIMS-AP"] = checkSavedErrorSearch('customrecord_synclims','customsearch_pending_synclimsap');
		SyncResults["LIMS-AR"] = checkSavedErrorSearch('customrecord_synclims','customsearch_pending_synclimsar');
		SyncResults["LIMS-GL"] = checkSavedErrorSearch('customrecord_synclims','customsearch_pending_synclimsgl');
		
		SyncResults["Altus-LandUse"] = checkSavedErrorSearch('customrecord_syncaltuslu','customsearch_pending_altuslanduse');
		SyncResults["Altus-RoadUse"] = checkSavedErrorSearch('customrecord_syncaltusru','customsearch_pending_altusroaduse');
		
		//SyncResults["MS-PartMaster"] = checkSavedErrorSearch('customrecord_syncmspartmaster','');
		//SyncResults["MS-PurchaseOrder"] = checkSavedErrorSearch('customrecord_syncmspurchaseorder','');
		
		//7 is Lisa, 9 is Katherine, 11 is Tara-Lynn, 836 is Matt
		emailFrom = "7";
		emailUser = "7";
		emailSubject = "NetSuite Integration Sync Error Report";
      	//1.0.1 - TC10ROD 10202020 - removed kath from the list as requested by her, request date 1016202 - TCC10ROD
      	//emailCC = ["9","11","836"]; //Should be array of strings - User IDs
		emailCC = ["11","836"]; //Should be array of strings - User IDs
		emailMessage = "Please see below for the daily Integration Sync Error Report.\n\n"+
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
						getEmailText("MS-InventoryTransaction",SyncResults["MS-InventoryTransaction"])+"\n"+
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

function checkSavedErrorSearch(RecType,SearchID) {
	var searchResults = nlapiSearchRecord(RecType,SearchID);
	if (searchResults) {
		return searchResults.length;
	} else {
		return 0;
	}
	throw nlapiCreateError('error','Error occured during checkSavedErrorSearch for RecType '+RecType+' and SearchID '+SearchID);
}

function getEmailText(RecordName,NumRecords){
	switch(NumRecords) {
			case -1: return RecordName+" had an error retrieving the number of pending records.";
			case 0: return RecordName+" is fully synced.";
			case 1000: return RecordName+": 1000+ records pending";
	}
	return RecordName+": "+NumRecords+" records pending";
}