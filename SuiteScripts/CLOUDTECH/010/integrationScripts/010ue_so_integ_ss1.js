/**
 * Module Description
 * 
 * Version    Date            Author           Remarks
 * 1.00       26 Feb 2020     Roood
 * 1.0.1 - applied grouping - TC10ROD
 * 1.0.2 - finalized and removed beforeload trigger as this is to be deployed in production as requested by Mark Sullivan on 06072020MTZ - TC10ROD
 * 
 * notes : shipgroup seems to be a column that gets overriden by the system to reset to 1
 *
 */

/**
 * The recordType (internal id) corresponds to the "Applied To" record in your script deployment. 
 * @appliedtorecord recordType
 * 
 * @param {String} type Operation types: create, edit, delete, xedit,
 *                      approve, cancel, reject (SO, ER, Time Bill, PO & RMA only)
 *                      pack, ship (IF only)
 *                      dropship, specialorder, orderitems (PO only) 
 *                      paybills (vendor payments)
 * @returns {Void}
 */
function userEventAfterSubmit(type)
{
	nlapiLogExecution("DEBUG", "STARTED", "STARTED");
	try
	{
		var executionContext = nlapiGetContext().getExecutionContext();
		
		nlapiLogExecution("DEBUG", "TEMP nlapiGetContext().roleid", nlapiGetContext().roleid)
		
		var enableItemLineShipping = nlapiGetFieldValue("ismultishipto");
		
		nlapiLogExecution("DEBUG", "TEMP enableItemLineShipping", enableItemLineShipping)
		
		var unoriginalAddressLines = [];
		
		//1.0.2 - trigger if created via webservices only
		if((enableItemLineShipping == 'T' || enableItemLineShipping) && executionContext == "webservices" && (type == "create" || type == "edit"))
		{
		    
		    
		    
			//if you go dynamic mode, it will require you to specify item
			var targetRecord = nlapiLoadRecord(nlapiGetRecordType(), nlapiGetRecordId()/*, {recordmode : "dynamic"}*/);
			
			//TODO you may want to send a flag if you want to modify a line, otherwise it always will, regardless if there is no change
			var itemLineCount = targetRecord.getLineItemCount("item");
			nlapiLogExecution("DEBUG", "itemLineCount", itemLineCount);
			
			var shipgroup_address_mapping = {}
			
			//Custom address definition
			for(var a = 1 ; a <= itemLineCount ; a++)
			{
				targetRecord.selectLineItem("item", a)
				var subrecord = targetRecord.removeCurrentLineItemSubrecord("item", "shippingaddress");
				
				var addressStr = targetRecord.getCurrentLineItemValue("item", "custcol_consigneeaddressjson");
				nlapiLogExecution("DEBUG", "addressStr", addressStr)
				if(!addressStr)
				{
					continue;
				}
				var addressObj = JSON.parse(addressStr);
				
				//TODO let mark know, not to use 0 as a shipgroup, 0 represents ungrouped. ungrouped will be grouped together
				newAddress = addressObj.ConsigneeAddress.newAddress || 0;
				shipGroup = "" + addressObj.ConsigneeAddress.ShipGroup;
				
				nlapiLogExecution("DEBUG", "shipGroup", shipGroup)
				
				if(!shipgroup_address_mapping[shipGroup])
				{
				    var subrecord = targetRecord.createCurrentLineItemSubrecord("item", "shippingaddress");

	                if(addressObj.ConsigneeAddress.Addr1)
	                {
	                    subrecord.setFieldValue("country", addressObj.ConsigneeAddress.Country);
	                }
	                
	                if(addressObj.ConsigneeAddress.Addr1)
	                {
	                    subrecord.setFieldValue("addr1", addressObj.ConsigneeAddress.Addr1);
	                }
	                
	                //Custom address label is write-only. Address will be stored with this label, but when address is loaded again, it won"t be available for read using SuiteScript (it will be visible in UI as usual). This is because label is not a part of address and so it won"t be loaded on address subrecord load.
	                //When custom address is edited, new custom address is always created. When custom address is edited after transaction was saved and loaded again, label will be null as it wont be copied over to new custom address. In such case, user has to define address label again.

//	              if(addressObj.ConsigneeAddress.Name && type != "edit")
//	              {
	                
	                    subrecord.setFieldValue("label", addressObj.ConsigneeAddress.Name);

	                    nlapiLogExecution("DEBUG", "TEMP addressObj.ConsigneeAddress.Name", addressObj.ConsigneeAddress.Name)
//	              }
	                
	                if(addressObj.ConsigneeAddress.Zip)
	                {
	                    subrecord.setFieldValue("zip", addressObj.ConsigneeAddress.Zip);
	                }

	                if(addressObj.ConsigneeAddress.State)
	                {
	                    subrecord.setFieldValue("state", addressObj.ConsigneeAddress.State);
	                }
	                
	                if(addressObj.ConsigneeAddress.City)
	                {
	                    subrecord.setFieldValue("city", addressObj.ConsigneeAddress.City);
	                }

	                nlapiLogExecution("DEBUG", "beforeCommitSubrecord", 1);
	                subrecord.commit();
	                nlapiLogExecution("DEBUG", "afterCommitSubrecord", 1);
	                
	                var customLineAddressNewEntry = targetRecord.getCurrentLineItemValue("item", "shipaddress");
	                nlapiLogExecution("DEBUG", "customLineAddressNewEntry current", customLineAddressNewEntry);
	                shipgroup_address_mapping[shipGroup] = {addressid : customLineAddressNewEntry, line : a}
				}
				else /*if (shipgroup_address_mapping[shipGroup] && shipgroup_address_mapping[shipGroup].addressid)*/
				{
				    nlapiLogExecution("DEBUG", "ATTEMPTING REUSE : addressid", shipgroup_address_mapping[shipGroup].addressid)
				    targetRecord.setCurrentLineItemValue("item", "shipgroup", shipGroup);
				    targetRecord.setCurrentLineItemValue("item", "shipaddress", shipgroup_address_mapping[shipGroup].addressid);
//				    targetRecord.setCurrentLineItemValue("item", "shippingaddress", shipgroup_address_mapping[shipGroup].addressid);
                    targetRecord.setCurrentLineItemValue("item", "shipgroup", shipGroup);
                    nlapiLogExecution("DEBUG", "ATTEMPTING REUSE : index a : ", a)
                    
                    //collect these lines because at first cycle, the lines with unoriginal address cannot be set, because their source cannot be read until the record is saved.
                    unoriginalAddressLines.push({targetLine : a, copyFromLine : shipgroup_address_mapping[shipGroup].line, shipGroup : shipGroup});

                    nlapiLogExecution("DEBUG", "unoriginalAddressLines DURING ITERATION TO BUILD", JSON.stringify(unoriginalAddressLines));
				}
				
				targetRecord.commitLineItem("item");

				nlapiLogExecution("DEBUG", "beforeCommitLine", 1);
				targetRecord.commitLineItem("item");
				nlapiLogExecution("DEBUG", "afterCommitLine", 1);
				
				nlapiLogExecution("DEBUG", "after iteration shipgroup_address_mapping", JSON.stringify(shipgroup_address_mapping));
			}
			
			nlapiLogExecution("DEBUG", "targetRecord1", 1);
            nlapiLogExecution("DEBUG", "targetRecord", targetRecord);
            var submittedRecordId = nlapiSubmitRecord(targetRecord);
            nlapiLogExecution("DEBUG", "submittedRecordId", submittedRecordId);
			
			
            nlapiLogExecution("DEBUG", "unoriginalAddressLines BEFORE USING", JSON.stringify(unoriginalAddressLines));
            
			//not able to capture and get id until saved so this is a separate run to set the ones that are left unfinished
			var targetRecord = nlapiLoadRecord(nlapiGetRecordType(), nlapiGetRecordId()/*, {recordmode : "dynamic"}*/);
            
			for(var a = 0 ; a < unoriginalAddressLines.length ; a++)
			{
			    var copyFromLine = Number(unoriginalAddressLines[a].copyFromLine);
			    
			    var targetExistingCustomAddressId = targetRecord.getLineItemValue("item", "shipaddress", copyFromLine);

                targetRecord.selectLineItem("item", unoriginalAddressLines[a].targetLine);
                targetRecord.setCurrentLineItemValue("item", "shipgroup", unoriginalAddressLines[a].shipGroup);
                targetRecord.setCurrentLineItemValue("item", "shipaddress", targetExistingCustomAddressId);
                targetRecord.setCurrentLineItemValue("item", "shipgroup", unoriginalAddressLines[a].shipGroup);
                nlapiLogExecution("DEBUG", "beforeCommitLine", 1);
                targetRecord.commitLineItem("item");
                nlapiLogExecution("DEBUG", "afterCommitLine", 1);
			}

			nlapiLogExecution("DEBUG", "targetRecord second", 1);
            nlapiLogExecution("DEBUG", "targetRecord second", targetRecord);
            var submittedRecordId = nlapiSubmitRecord(targetRecord);
            nlapiLogExecution("DEBUG", "submittedRecordId second", submittedRecordId);
		}
		
		nlapiLogExecution("DEBUG", "FINISHED", "FINISHED");
	}
	catch(e)
	{
		nlapiLogExecution("DEBUG", "ERROR in function userEventAfterSubmit", e.message);
	}
}
