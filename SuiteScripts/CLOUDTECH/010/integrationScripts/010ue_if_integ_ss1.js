/**
 * Module Description
 * 
 * Version    Date            Author           Remarks
 * 1.00       26 Feb 2020     Roood
 * 1.0.1      Minor changes, uncommented out the logic because there were dependencies during development, WIP
 * 1.0.2      now crosstags invoice and itemfulfillment throught custbody_010invoice_fulfillment_pair field
 * 1.0.3      now sets market segment
 * 1.0.4      06092020MTZ - now copies shipping and carrier related fields from IF to INVOICE as requested by Kath and Mark S - TC10ROD 
 * 1.0.5      06152020MTZ - fix for salesrep no longer a salesrep - TC10ROD 
 * 1.0.6      now sets custcol_wm_numberofrolls, custcol_wm_rollsperpack column
 * 1.0.7 - TC10ROD check the new custom field for auto emailing - requested by Mark S.
 * 1.0.8 - get email to multi value, from customer record's USE MULTIPLE EMAILS checkbox, added logs to trace these
 * 1.0.9 fill this up as well
 * 1.0.10 - handle billing unit, qty and rate
 * 1.0.11 - 09282020MTZ - custbody_anc_invoice_int_only is now forced to be unchecked - TC10ROD, Mark S
 * 1.0.12 - 10282020PH - set custcol_010itemdisplayname to solve printout issue raised by dylan - TC10ROD
 *        - 12182020PH - added logs such as target record id, line quantity in invoice - TC10ROD
 *
 *@dev_dependencies a followup on mark sullivan's item fulfillment integration
 *1.0.6 - custcol_wm_numberofrolls, custcol_wm_rollsperpack, custbody_wm_shippedrolls
 *1.0.7 - custbody_anc_email_to_multi
 *1.0.8 custentity_anc_use_multi_emails
 *1.0.9 custentity_anc_email_transction_to
 *1.0.10 - custcol_010_billingunit, custcol_010_billingqty, custcol_010_billingrate
 *1.0.11 - 09282020MTZ - custbody_anc_invoice_int_only is now forced to be unchecked - TC10ROD, Mark S
 *1.0.12 - 10282020PH - set custcol_010itemdisplayname to solve printout issue raised by dylan - TC10ROD
 *1.0.13 - 02132022PH - now also sets invoice trandate based on if date shipped - TC10ROD
 *1.0.14 - 05282022PH - Support for Custom Surcharges - TC10ROD
 */


var SURCHARGE_ITEMS = {};
var MT_CWT_CONVERSION_RATE = 0.04536;
var MT_CWT_CONVERSION_QTY = 22.046226218488;
var ALLOW_EXISTING_INVOICE_OVERRIDE = false;

/**
 * The recordType (internal id) corresponds to the "Applied To" record in your script deployment. 
 * @appliedtorecord recordType
 *   
 * @param {String} type Operation types: create, edit, view, copy, print, email
 * @param {nlobjForm} form Current form
 * @param {nlobjRequest} request Request object
 * @returns {Void}
 */
function userEventBeforeSubmit(type)
{
    
    var SHIPPING_DETAILS_FIELD = "custbody_wm_shippedrolls"; //field created by Mark S. TODO change this to something more appropriate e.g., custbody_shippedrolls
    //var SHIPPING_DETAILS_FIELD = "custbody16"; //field created by Mark S. TODO change this to something more appropriate e.g., custbody_shippedrolls
    try
    {
        var shippingDetails = [];
        var shippingDetails_rawStr = nlapiGetFieldValue(SHIPPING_DETAILS_FIELD);
        nlapiLogExecution("DEBUG", "BEFORESUBMIT shippingDetails_rawStr", shippingDetails_rawStr);
        if(shippingDetails_rawStr)
        {
            try
            {
                shippingDetails = JSON.parse(shippingDetails_rawStr)
            }
            catch(e)
            {
                nlapiLogExecution("DEBUG", "ERROR parsing shipping details/shippedrolls, treated as blank list", e.message);
            }
        }
        
        //TODO hardcode for now, as this field has not yet been setup by mark s.- TC10ROD 06252020PH
        //shippingDetails = [{"custcol_wm_numberofrolls": "3", "custcol_wm_rollsperpack": "2", "orderline": "1"},{"custcol_wm_numberofrolls": "1", "custcol_wm_rollsperpack": "2", "orderline": "2"},{"custcol_wm_numberofrolls": "8", "custcol_wm_rollsperpack": "1", "orderline": "4"}]
        nlapiLogExecution("DEBUG", "BEFORESUBMIT FINAL shippingDetails", JSON.stringify(shippingDetails));
        
        //FILL the sublist
        for(var a = 0 ; a < shippingDetails.length ; a++)
        {
            nlapiLogExecution("DEBUG", "BEFORESUBMIT : shippingDetails.length", shippingDetails.length);
            
            //1.0.10  - handle billing unit, qty and rate
            var lineColumnsToMapFromIfToInvoice = ["custcol_wm_numberofrolls", "custcol_wm_rollsperpack",
                                                   "custcol_010_billingunit", "custcol_010_billingqty", "custcol_wm_billingrate"
                                                   ];
            var shippingDetails_orderline = shippingDetails[a].orderline;
//            var shippingDetails_numberofrolls = shippingDetails[a].custcol_wm_numberofrolls;
//            var shippingDetails_rollsperpack = shippingDetails[a].custcol_wm_rollsperpack;
            
            var targetIndex = nlapiFindLineItemValue("item", "orderline", shippingDetails_orderline);
            nlapiLogExecution("DEBUG", "BEFORESUBMIT : targetIndex", targetIndex);
            if(targetIndex > -1)
            {
                //1.0.12 - 10282020PH - set custcol_010itemdisplayname to solve printout issue raised by dylan - TC10ROD
                //this may cause governance limit based on number of unique items, they dont have much items in transactions so this works so keep it this way to minimize change=minimize problems, this is live - TC10ROD
                var item_internalid = nlapiGetLineItemValue("item", "item", targetIndex);
              	nlapiLogExecution("DEBUG", "BEFORESUBMIT : item_internalid", item_internalid);
              
                if(item_internalid)
                {
                    try
                    {
                        var item_displayname = nlapiLookupField("item", item_internalid, "displayname") || "";
                      	nlapiLogExecution("DEBUG", "BEFORESUBMIT : item_displayname", item_displayname);
                        if(item_displayname)
                        {
                            nlapiSetLineItemValue("item", "custcol_010itemdisplayname", targetIndex, item_displayname);
                        }
                    }
                    catch(e)
                    {
                        nlapiLogExecution("EMERGENCY", "ERROR lookingup/setting custcol/displayname of item", item_internalid + " : " + e.message)
                    }
                }
                
                for(var b = 0; b < lineColumnsToMapFromIfToInvoice.length ; b++)
                {
                    var targetColumnId = lineColumnsToMapFromIfToInvoice[b];
                    nlapiLogExecution("DEBUG", "BEFORE SUBMIT : targetColumnId", targetColumnId);
                    nlapiLogExecution("DEBUG", "BEFORE SUBMIT : shippingDetails[a][targetColumnId]", shippingDetails[a][targetColumnId]);
                    
                    
                    if(targetColumnId == "custcol_010_billingunit" && !shippingDetails[a][targetColumnId])
                    {
                        nlapiSetLineItemValue("item", targetColumnId, targetIndex, 'MT');
                    }
                    else
                    {
                        nlapiSetLineItemValue("item", targetColumnId, targetIndex, shippingDetails[a][targetColumnId]);
                    }
                    
                    var valueAfterSetting = nlapiGetLineItemValue("item", targetColumnId, targetIndex);
                    nlapiLogExecution("DEBUG", "BEFORE SUBMIT : valueAfterSetting", valueAfterSetting);
                    
                    
                }
            }
        }
    }
    catch(e)
    {
        nlapiLogExecution("ERROR", "ERROR in function userEventBeforeSubmit", e.message);
    }
}

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
    nlapiLogExecution("DEBUG", "userEventAfterSubmit triggered : type", type);
    try
    {
        if(type == "delete"/* && type == "edit"*/)
        {
            return;
        }
        nlapiLogExecution("DEBUG", "AFTER SUBMIT RUNNING FOR id ", nlapiGetRecordId())
        var SALES_ORDER_ORDERTYPE = {ordType : "SalesOrd", recordType : "salesorder"};
        var createdFromValue = nlapiGetFieldValue("createdfrom");
        
        var createdFromValue_type = nlapiGetFieldValue("ordertype");
        var shipStatus = nlapiGetFieldValue("shipstatus");
      
        var executionContext = nlapiGetContext().getExecutionContext();
        if(/*executionContext == "webservices" && */createdFromValue_type == SALES_ORDER_ORDERTYPE.ordType && createdFromValue && shipStatus == "C")//C is SHIPPED
        {
      
        //these are 2.0 codes in 1.0 script
        /*var executionContext = runtime.executionContext;
        if(executionContext == runtime.Context.Type.WEBSERVICES && createdFromValue_type == SALES_ORDER_ORDERTYPE.ordType && createdFromValue && shipStatus == "C")//C is SHIPPED
        {*
//          var salesOrderRecordObj = nlapiLoadRecord(SALES_ORDER_ORDERTYPE.recordType, createdFromValue);
            
//          var invoiceRecObj = nlapiTransformRecord(/*{*/
//              /*fromType: */SALES_ORDER_ORDERTYPE.recordType,
//              /*fromId: */createdFromValue,
//              /*toType: */record.Type.INVOICE,
//              /*isDynamic: true,*/
//          /*}*/);
            //do not update existing INVOICE, only if SCRIPT PARAM ALLOW_EXISTING_INVOICE_OVERRIDE is checked
            var existingInvoiceId = nlapiGetFieldValue('custbody_010invoice_fulfillment_pair', 'F');
            var invoiceRecObj = null;
            ALLOW_EXISTING_INVOICE_OVERRIDE = nlapiGetContext().getSetting("SCRIPT", "custscript_anc_allowexistinginvoverride");
            
            nlapiLogExecution("DEBUG", "ALLOW_EXISTING_INVOICE_OVERRIDE", ALLOW_EXISTING_INVOICE_OVERRIDE);
            if(existingInvoiceId && (ALLOW_EXISTING_INVOICE_OVERRIDE && ALLOW_EXISTING_INVOICE_OVERRIDE != "F"))
            {
                invoiceRecObj = nlapiLoadRecord("invoice", existingInvoiceId, {recordmode: 'dynamic'});
            }
            else
            {
                invoiceRecObj = nlapiTransformRecord("salesorder", createdFromValue, "invoice", {recordmode: 'dynamic'});
            }
            
            
          	invoiceRecObj.setFieldValue('custbody_anc_invoice_int_only', 'F') //1.0.11 - TC10ROD
          	
            var allocationdate_val = nlapiGetFieldValue("custbody_wmallocationdate");
            var dateshipped_val = nlapiGetFieldValue("custbody_wmdateshipped");
          
          //1.0.3
            var marketsegment_val = nlapiGetFieldValue("cseg_anc_mrkt_sgmt");
            //1.0.4
            var custbody_wm_carriername = nlapiGetFieldValue("custbody_wm_carriername");
            var custbody_wm_carrierunitnumber = nlapiGetFieldValue("custbody_wm_carrierunitnumber");
            var custbody4 = nlapiGetFieldValue("custbody4");
            
            var customerId = nlapiGetFieldValue("entity");
            nlapiLogExecution("DEBUG", "customerId", customerId);
            //1.0.8 optimize by reusing recordObj instance
            var customerRecord = nlapiLoadRecord("customer", customerId)
            var customerTerms = customerRecord.getFieldValue("terms");
            
            var email_to_multi_value = customerRecord.getFieldValue("custentity_anc_use_multi_emails");
            var email_transction_to_value = customerRecord.getFieldValue("custentity_anc_email_transction_to");
            nlapiLogExecution("DEBUG", "email to multi value", email_to_multi_value);
            //1.0.5      06152020MTZ - fix for salesrep no longer a salesrep - TC10ROD 
            var customerSalesrep = nlapiLoadRecord("customer", customerId).getFieldValue("salesrep");
            var setSalesRep = true;
            if(customerSalesrep)
            {
                var salesRepRecord = nlapiLoadRecord("employee", customerSalesrep);
                if(salesRepRecord)
                {
                    var salesRepRecord_inactive = salesRepRecord.getFieldValue("inactive");
                    var salesRepRecord_isSalesRep = salesRepRecord.getFieldValue("issalesrep");
                    
                    nlapiLogExecution("DEBUG", "salesRepRecord_inactive", salesRepRecord_inactive)
                    nlapiLogExecution("DEBUG", "salesRepRecord_isSalesRep", salesRepRecord_isSalesRep)
                    if(salesRepRecord_inactive == 'T' || salesRepRecord_isSalesRep == 'F')
                    {
                        setSalesRep = false;
                    }
                }
            }
            nlapiLogExecution("DEBUG", "customerTerms", customerTerms);
            //var shipcarrier = nlapiGetFieldValue("shipcarrier");
            //var shipmethod = nlapiGetFieldValue("shipmethod");
            
            
            
            //1.0.2
            invoiceRecObj.setFieldValue("custbody_010invoice_fulfillment_pair", nlapiGetRecordId());
            invoiceRecObj.setFieldValue("custbody_wmallocationdate", allocationdate_val);
            invoiceRecObj.setFieldValue("custbody_wmdateshipped", dateshipped_val);
          
          	//02132022PH - now also sets invoice trandate based on if shipdate - TC10ROD
          	if(dateshipped_val)
            {
                invoiceRecObj.setFieldValue("trandate", dateshipped_val);
			}
          	
          //1.0.3
            invoiceRecObj.setFieldValue("cseg_anc_mrkt_sgmt", marketsegment_val);
            //1.0.4
            invoiceRecObj.setFieldValue("custbody_wm_carriername", custbody_wm_carriername);
            invoiceRecObj.setFieldValue("custbody_wm_carrierunitnumber", custbody_wm_carrierunitnumber);
            invoiceRecObj.setFieldValue("custbody4", custbody4);
            invoiceRecObj.setFieldValue("terms", customerTerms);
            
            //1.0.7 - TC10ROD check the new custom field for auto emailing - requested by Mark S.
            //invoiceRecObj.setFieldValue("custbody_anc_email_to_multi", 'T');
            invoiceRecObj.setFieldValue("custbody_anc_email_to_multi", email_to_multi_value);
            //1.0.9 fill this up as well
            
            nlapiLogExecution("DEBUG", "email_transction_to_value", email_transction_to_value);
            
            //invoiceRecObj.setFieldText("custbody_anc_mutli_emails", email_transction_to_value);
            //invoiceRecObj.setFieldValue("custbody_anc_mutli_emails", email_transction_to_value);

            var lastSetValueFor_EMAIL_TO_MULTI = invoiceRecObj.getFieldValue("custbody_anc_email_to_multi");
            
            nlapiLogExecution("DEBUG", "lastSetValueFor_EMAIL_TO_MULTI", lastSetValueFor_EMAIL_TO_MULTI);
            
          //1.0.5      06152020MTZ - fix for salesrep no longer a salesrep - TC10ROD 
            if(customerSalesrep && setSalesRep)
            {
                try
                {
                    invoiceRecObj.setFieldValue("salesrep", customerSalesrep);                    
                }
                catch(e)
                {
                    nlapiLogExecution("AUDIT", "FAILED TO SET SALESREP", e.message);
                }
            }

            invoiceRecObj.setFieldValue("tobeemailed", "F");
            //invoiceRecObj.setFieldValue("shipmethod", shipmethod);
            
            //1.0.6 get and update line items, must source from IF not from SO as requested by mark sullivan on 06252020PH - TC10ROD
            var lineFieldValuesByOrderline = {};
            var lineColumnsToMapFromIfToInvoice = ["custcol_wm_numberofrolls_val", "custcol_wm_rollsperpack_val"];
            var if_lineCount = nlapiGetLineItemCount("item");
            nlapiLogExecution("DEBUG", "if_lineCount", if_lineCount);
            
            for(var a = 1 ; a <= if_lineCount ; a++)
            {
                var if_custcol_wm_numberofrolls_val = nlapiGetLineItemValue("item", "custcol_wm_numberofrolls", a);
                var if_custcol_wm_rollsperpack_val = nlapiGetLineItemValue("item", "custcol_wm_rollsperpack", a);
              //1.0.10  - handle billing unit, qty and rate
                var if_custcol_010_billingunit_val = nlapiGetLineItemValue("item", "custcol_010_billingunit", a);
                var if_custcol_010_billingqty_val = nlapiGetLineItemValue("item", "custcol_010_billingqty", a);
                var if_custcol_wm_billingrate_val = nlapiGetLineItemValue("item", "custcol_wm_billingrate", a);
                if_custcol_wm_billingrate_val = parseFloat(if_custcol_wm_billingrate_val).toFixed(2);
                var if_orderline_val = nlapiGetLineItemValue("item", "orderline", a);
                
                nlapiLogExecution("DEBUG", "if_custcol_wm_numberofrolls_val,custcol_wm_rollsperpack_val,orderline", JSON.stringify({if_custcol_wm_numberofrolls_val : if_custcol_wm_numberofrolls_val, if_custcol_wm_rollsperpack_val : if_custcol_wm_rollsperpack_val, if_orderline : if_orderline_val}));
                
              //1.0.10  - handle billing unit, qty and rate
                lineFieldValuesByOrderline[if_orderline_val] = {
                        custcol_wm_numberofrolls : {val:if_custcol_wm_numberofrolls_val},
                        custcol_wm_rollsperpack : {val:if_custcol_wm_rollsperpack_val},
                        custcol_010_billingunit : {val:if_custcol_010_billingunit_val},
                        custcol_010_billingqty : {val:if_custcol_010_billingqty_val},
                        custcol_wm_billingrate : {val:if_custcol_wm_billingrate_val}
                }
            }
            
            nlapiLogExecution("DEBUG", "lineFieldValuesByOrderline", JSON.stringify(lineFieldValuesByOrderline));
            
            var invoiceRecObj_lineCount = invoiceRecObj.getLineItemCount("item");
            
            for(var a = 1 ; a <= invoiceRecObj_lineCount ; a++)
            {

                var lineQuantity = nlapiGetLineItemValue("item", "quantity", a);
                nlapiLogExecution("DEBUG", "12182020PH lineQty before setting other cols", lineQuantity);
                
                //you can iterate through lineFieldValuesByOrderline to set each column, but do it manually for simplicity
                var orderline_val = invoiceRecObj.getLineItemValue("item", "orderline", a);
                if(lineFieldValuesByOrderline[orderline_val])
                {
                    for(var columnId in lineFieldValuesByOrderline[orderline_val])
                    {
                        invoiceRecObj.setLineItemValue("item", columnId, a, lineFieldValuesByOrderline[orderline_val][columnId].val);
                    }
                }
                
                var custcol_wm_numberofrolls_val = invoiceRecObj.getLineItemValue("item", "custcol_wm_numberofrolls", a);
                var custcol_wm_rollsperpack_val = invoiceRecObj.getLineItemValue("item", "custcol_wm_rollsperpack", a);
                var orderline_val = invoiceRecObj.getLineItemValue("item", "orderline", a);
              
          		//TC10ROD 10112020
          		var item_internalid = invoiceRecObj.getLineItemValue("item", "item", a);
              	nlapiLogExecution("DEBUG", "aftersubmit : invoice item_internalid", item_internalid);
              
                if(item_internalid)
                {
                    try
                    {
                        var item_displayname = nlapiLookupField("item", item_internalid, "displayname") || "";
                      	nlapiLogExecution("DEBUG", "aftersubmit : invoice item_displayname", item_displayname);
                        if(item_displayname)
                        {
                            invoiceRecObj.setLineItemValue("item", "custcol_010itemdisplayname", a, item_displayname);
                        }
                    }
                    catch(e)
                    {
                        nlapiLogExecution("EMERGENCY", "ERROR in aftersubmit, lookingup/setting custcol/displayname of item", item_internalid + " : " + e.message)
                    }
                }
                

                var lineQuantity = nlapiGetLineItemValue("item", "quantity", a);
                nlapiLogExecution("DEBUG", "12182020PH lineQty after setting other cols", lineQuantity);
                
                nlapiLogExecution("DEBUG", "custcol_wm_numberofrolls_val,custcol_wm_rollsperpack_val,orderline", JSON.stringify({custcol_wm_numberofrolls_val : custcol_wm_numberofrolls_val, custcol_wm_rollsperpack_val : custcol_wm_rollsperpack_val, orderline : orderline_val}));
            }
            
            //05282022 - support for freight and energy surcharge
            invoiceRecObj = applyCustomSurcharge(invoiceRecObj);
            //set cseg_anc_mrkt_sgmt
//            invoiceRecObj = applyMarketSegment(invoiceRecObj);
          	
            var submittedInvoiceId = nlapiSubmitRecord(invoiceRecObj, true, true);
            
            //DO THIS ONLY IF IT SUCCEED creating invoice because this triggers on edit mode - TC10ROD
//            if(submittedInvoiceId)
//            {
            //1.0.2
                var submittedIfId = nlapiSubmitField(nlapiGetRecordType(), nlapiGetRecordId(), "custbody_010invoice_fulfillment_pair", submittedInvoiceId);
                nlapiLogExecution("DEBUG", "submittedIfId", submittedIfId);
//            }
            nlapiLogExecution("DEBUG", "submittedInvoiceId", submittedInvoiceId);
        }
        
        
    }
    catch(e)
    {
        nlapiLogExecution("ERROR", "ERROR in function userEventAfterSubmit", e.message);
    }
}


/**
 * applies custom surcharges
 * @param invoiceRecObj
 * @returns
 */
function applyCustomSurcharge(invoiceRecObj)
{
    try
    {
        var targetMarketSegment = invoiceRecObj.getFieldValue("cseg_anc_mrkt_sgmt");
        nlapiLogExecution("DEBUG", "targetMarketSegment", targetMarketSegment);
        var currency = invoiceRecObj.getFieldValue("currency");
        //FREIGHT
        var targetConsigneeId = invoiceRecObj.getFieldValue("custbody_consignee");
        var targetCustomerId = invoiceRecObj.getFieldValue("entity");
        var targetLocation = "";
        
        var totalLineQty = 0;
        var totalLineBillingQty = 0;
        var totalLineBillingRate = 0;
        
        var totalLineBillingQty_freight = 0;
        var totalLineBillingQty_energy = 0;
        var lastLineBillingUnit = "";
        

        ALLOW_ENERGY_SURCHARGE = nlapiGetContext().getSetting("SCRIPT", "custscript_anc_allowenergysurcharge");
        nlapiLogExecution("DEBUG", "ALLOW_ENERGY_SURCHARGE", ALLOW_ENERGY_SURCHARGE);
        
        var consigneeRecObj = "";
        var consigneeRecObj_freightSurcharge = "";
        if(targetConsigneeId)
        {
            consigneeRecObj = nlapiLoadRecord("customrecord_alberta_ns_consignee_record", targetConsigneeId);
            consigneeRecObj_freightSurcharge = consigneeRecObj.getFieldValue("custrecord_alberta_ns_freightsurcharge");
            
        }
        var customerRecObj = nlapiLoadRecord("customer", targetCustomerId);
        var customerRecObj_energysurchargeexemption = customerRecObj.getFieldValue("custentity_anc_energy_surchargeexemption");

        nlapiLogExecution("DEBUG", "consigneeRecObj_freightSurcharge", consigneeRecObj_freightSurcharge);
        nlapiLogExecution("DEBUG", "customerRecObj_energysurchargeexemption", customerRecObj_energysurchargeexemption);
        
        if(consigneeRecObj_freightSurcharge || (!(customerRecObj_energysurchargeexemption && customerRecObj_energysurchargeexemption != "F")))
        {
            
            loadSurchargeSettings(invoiceRecObj);
            
            var doConvert = false;
            
            //get quantity sum
            var itemLineCount = invoiceRecObj.getLineItemCount("item");
            nlapiLogExecution("DEBUG", "itemLineCount", itemLineCount);
            if(itemLineCount > 0)
            {
                for(var a = 1 ; a <= itemLineCount ; a++)
                {
                    var line_billingunit = invoiceRecObj.getLineItemValue("item", "custcol_010_billingunit", a);
                    var line_qty = invoiceRecObj.getLineItemValue("item", "quantity", a);
                    var line_itemtype = invoiceRecObj.getLineItemValue("item", "itemtype", a);
                    var line_item = invoiceRecObj.getLineItemValue("item", "item", a);
                    var targetLocation = invoiceRecObj.getLineItemValue("item", "location", a);
                    var line_rate = invoiceRecObj.getLineItemValue("item", "rate", a);
                    
                    if(line_itemtype == "InvtPart" && line_item != SURCHARGE_ITEMS[currency].e_item && line_item != SURCHARGE_ITEMS[currency].fs_item)
                    {
//                        if(line_billingunit == "MT")
//                        {
//                            line_qty = line_qty * MT_CWT_CONVERSION_RATE;
//                            totalLineQty += line_qty;
//                        }
//                        else if(line_billingunit == "CWT")
//                        {
//                            //line_qty = line_qty * MT_CWT_CONVERSION_RATE;
//                            totalLineQty += line_qty;
//                        }
                        
                        if(line_billingunit == "CWT")
                        {
//                            line_qty = line_qty * MT_CWT_CONVERSION_RATE;
                            totalLineQty += Number(line_qty);
                            totalLineBillingQty += Number(line_qty);
                            lastLineBillingUnit = line_billingunit;
                            doConvert = true;
                        }
                        else if(line_billingunit == "MT")
                        {
                            //line_qty = line_qty * MT_CWT_CONVERSION_RATE;
                            totalLineQty += Number(line_qty);
                            totalLineBillingQty += Number(line_qty);
                            lastLineBillingUnit = line_billingunit;
                        }
                        
                    }
                }
            }
            
            nlapiLogExecution("DEBUG", "totalLineBillingQty", totalLineBillingQty);
            
            if(totalLineBillingQty)
            {
                totalLineBillingQty_freight = totalLineBillingQty;
                totalLineBillingQty_energy = totalLineBillingQty;
                if(consigneeRecObj_freightSurcharge && SURCHARGE_ITEMS[currency].fs_item && consigneeRecObj_freightSurcharge!=0)
                {
                    //ADD FREIGHT SURCHARGE
                    var currentFreightLine = invoiceRecObj.findLineItemValue("item", "item", SURCHARGE_ITEMS[currency].fs_item);
                    nlapiLogExecution("DEBUG", "currentFreightLine", currentFreightLine);
                    if(currentFreightLine > 0)
                    {
                        invoiceRecObj.selectLineItem("item", currentFreightLine);
                    }
                    else
                    {
                        invoiceRecObj.selectNewLineItem("item");                            
                    }
                    
                    invoiceRecObj.setCurrentLineItemValue("item", "item", ""+SURCHARGE_ITEMS[currency].fs_item);
                    invoiceRecObj.setCurrentLineItemValue("item", "quantity", totalLineQty);
                    invoiceRecObj.setCurrentLineItemValue("item", "cseg_anc_mrkt_sgmt", targetMarketSegment);
                    
                    if(doConvert)
                    {
                        consigneeRecObj_freightSurcharge = consigneeRecObj_freightSurcharge;
                        totalLineBillingQty_freight = totalLineBillingQty * MT_CWT_CONVERSION_QTY;
                        nlapiLogExecution("DEBUG", "totalLineBillingQty_freight", totalLineBillingQty_freight);
                        totalLineBillingQty_freight = totalLineBillingQty_freight.toFixed(3);
                        totalLineBillingRate = consigneeRecObj_freightSurcharge * MT_CWT_CONVERSION_RATE;
                    }
                    else
                    {
                        totalLineBillingRate = consigneeRecObj_freightSurcharge;
                    }
                    
                    invoiceRecObj.setCurrentLineItemValue("item", "rate", consigneeRecObj_freightSurcharge);
                    invoiceRecObj.setCurrentLineItemValue("item", "custcol_wm_billingrate", totalLineBillingRate);
                    invoiceRecObj.setCurrentLineItemValue("item", "location", targetLocation);

                    invoiceRecObj.setCurrentLineItemValue("item", "custcol_010_billingqty", totalLineBillingQty_freight);
                    invoiceRecObj.setCurrentLineItemValue("item", "custcol_010_billingunit", lastLineBillingUnit);
                    
//                    invoiceRecObj.setCurrentLineItemValue("item", "taxcode", targetTaxcode);
                    invoiceRecObj.commitLineItem("item");
                }
                if(ALLOW_ENERGY_SURCHARGE && ALLOW_ENERGY_SURCHARGE != "F") //controlled by script parameter so they can toggle energy surcharge on/off
                {
                    if(!(customerRecObj_energysurchargeexemption && customerRecObj_energysurchargeexemption != "F"))
                    {
                        //ADD ENERGY SURCHARGE
                        var currentEnergyLine = invoiceRecObj.findLineItemValue("item", "item", SURCHARGE_ITEMS[currency].e_item);
                        nlapiLogExecution("DEBUG", "currentEnergyLine", currentEnergyLine);
                        if(currentEnergyLine > 0)
                        {
                            invoiceRecObj.selectLineItem("item", currentEnergyLine);
                        }
                        else
                        {
                            invoiceRecObj.selectNewLineItem("item");                           
                        }
                        
                        invoiceRecObj.setCurrentLineItemValue("item", "item", SURCHARGE_ITEMS[currency].e_item);
                        invoiceRecObj.setCurrentLineItemValue("item", "quantity", totalLineQty);
                        invoiceRecObj.setCurrentLineItemValue("item", "cseg_anc_mrkt_sgmt", targetMarketSegment);

                        var itemDefaultRate = invoiceRecObj.getCurrentLineItemValue("item", "rate") || 0;
                        nlapiLogExecution("DEBUG", "itemDefaultRate", itemDefaultRate);
//                        var finalRate = itemDefaultRate; //TODO no need, just use the default rate
                        
                        if(doConvert)
                        {
                            totalLineBillingQty_energy = totalLineBillingQty * MT_CWT_CONVERSION_QTY;
                            nlapiLogExecution("DEBUG", "totalLineBillingQty_energy", totalLineBillingQty_energy);
                            totalLineBillingQty_energy = totalLineBillingQty_energy.toFixed(3);
                            totalLineBillingRate = itemDefaultRate * MT_CWT_CONVERSION_RATE;
                        }
                        else
                        {
                            totalLineBillingRate = itemDefaultRate;
                        }
                        
                        invoiceRecObj.setCurrentLineItemValue("item", "rate", itemDefaultRate);
                        invoiceRecObj.setCurrentLineItemValue("item", "custcol_wm_billingrate", totalLineBillingRate);
                        invoiceRecObj.setCurrentLineItemValue("item", "location", targetLocation);
                        
                        invoiceRecObj.setCurrentLineItemValue("item", "custcol_010_billingqty", totalLineBillingQty_energy);
                        invoiceRecObj.setCurrentLineItemValue("item", "custcol_010_billingunit", lastLineBillingUnit);
                        
//                      invoiceRecObj.setCurrentLineItemValue("item", "taxcode", targetTaxcode);
                        invoiceRecObj.commitLineItem("item");
                    }
                }
                
            }
            
        }
            
            
    }
    catch(e)
    {
        nlapiLogExecution("DEBUG", "ERROR in function applyCustomSurcharge", e.message);
    }
    return invoiceRecObj
}

/**
 * loads and resolves surcharge settings
 * @param invoiceRecObj
 */
function loadSurchargeSettings(invoiceRecObj)
{
    try
    {
        var currency = invoiceRecObj.getFieldValue("currency");
        var fs_item = "";
        var e_item = "";
        if(currency == "1") //CAD
        {
            fs_item = nlapiGetContext().getSetting("SCRIPT", "custscript_anc_freightsurchargeitem_cad");
            e_item = nlapiGetContext().getSetting("SCRIPT", "custscript_anc_energysurchargeitem_cad");
        }
        else if(currency == "2") //USD
        {
            fs_item = nlapiGetContext().getSetting("SCRIPT", "custscript_anc_freightsurchargeitem_usd");
            e_item = nlapiGetContext().getSetting("SCRIPT", "custscript_anc_energysurchargeitem_usd");
        }
            
//        var fs_usd = nlapiGetContext().getSetting("SCRIPT", "custscript_anc_freightsurchargeitem_usd");
//        var fs_cad = nlapiGetContext().getSetting("SCRIPT", "custscript_anc_freightsurchargeitem_cad");
    //
//        var e_usd = nlapiGetContext().getSetting("SCRIPT", "custscript_anc_energysurchargeitem_usd");
//        var e_cad = nlapiGetContext().getSetting("SCRIPT", "custscript_anc_energysurchargeitem_cad");
        
        SURCHARGE_ITEMS[currency] = {};
        SURCHARGE_ITEMS[currency].fs_item = fs_item;
        SURCHARGE_ITEMS[currency].e_item = e_item;
        
        nlapiLogExecution("DEBUG", "SURCHARGE_ITEMS", JSON.stringify(SURCHARGE_ITEMS));
    }
    catch(e)
    {
        nlapiLogExecution("DEBUG", "ERROR in function loadSurchargeSettings", e.message);
    }
}


