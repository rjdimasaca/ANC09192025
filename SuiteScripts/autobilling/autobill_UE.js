/**
 * @NApiVersion 2.x
 * @NScriptType UserEventScript
 * @NModuleScope SameAccount
 */

/***************************************************************************
 * Script Name      : Autobill UE
 * Script Id        : customscript_autobill_ue
 * Script Deploy Id : customdeploy_autobill_ue
 * Script File Name : autobill_ue.js
 * Script Type      : User Event
 * SuiteScript Ver  : 2.0
 * References       : 
 * Dependencies     : 
 * Libraries        : autobill.config.js
 * Author           : TC10ROD
 * Dev Version      : 1.0.0 - Initial Release - 03252020 - TC10ROD
 * TODO             : this module and other related objects were intently not following cloudtech standards as the developer originally wanted to take ownership of this module
 **************************************************************************
 */
define(['N/email', 'N/error', 'N/https', 'N/record', 'N/redirect', 'N/ui/serverWidget', 'N/url', 'N/task', 'N/runtime', 'N/search', './autobill.config.js'],
/**
 * @param {email} email
 * @param {https} https
 * @param {record} record
 * @param {redirect} redirect
 * @param {serverWidget} serverWidget
 * @param {url} url
 */
function(email, error, https, record, redirect, serverWidget, url, task, runtime, search, customConfig) {
   
	var MASTERSETUP = {};
    /**
     * Function definition to be triggered before record is loaded.
     *
     * @param {Object} scriptContext
     * @param {Record} scriptContext.newRecord - New record
     * @param {string} scriptContext.type - Trigger type
     * @param {Form} scriptContext.form - Current form
     * @Since 2015.2
     */
    function beforeLoad(scriptContext)
    {
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
    
    function beforeSubmit(scriptContext)
    {
    	MASTERSETUP = customConfig.masterSetup;
    	try
    	{
    		if(scriptContext.type == "delete")
    		{
    			return;
    		}
    		log.debug("before submit scriptContext", scriptContext)
    		log.debug("before submit runtime.executionContext", runtime.executionContext)
    	}
    	catch(e)
    	{
    		log.error("ERROR in function beforeSubimt", {stack : e.stack, message : e.message});
    	}
    }
    
    function createBill(find_po_viaTotal_results, vendorNameMatching_results, scriptContext, uniquePricing)
	{
        try
        {
            var createBill_result = {};
            var billRecObj = record.transform({
                fromType : "purchaseorder",
                fromId : find_po_viaTotal_results.poId,
                toType : "vendorbill",
            });
            
            //Pending Approval is 1
            billRecObj.setValue({
                fieldId : "approvalstatus",
                value : 1
            });
            
            billRecObj.setValue({
                fieldId : "custbody_abd_createdfrom",
                value : scriptContext.newRecord.id
            });
            
            log.debug("uniquePricing", uniquePricing);
            
            if(uniquePricing)
            {
                var linesToKeep = {};
                for(var price in uniquePricing)
                {
                    //do this here because at this point you have a PO to suggest
                    if(uniquePricing[price].hasDuplicate)
                    {
                        var errorMessage = error.create({
                            name: 'AUTOBILLING_SAME_RATES',
                            message: 'Cannot resolve PO lines to be Billed due to multiple items with same price:' + formattedUnitPrice + '',
                            notifyOff: false
                        });
                        throw errorMessage;
                    }
                    
                    
                    var numericPrice = Number(price.replace("*", "").replace("*", ""));
                    
                    var priceIndex = billRecObj.findSublistLineWithValue({
                        sublistId : "item",
                        fieldId : "rate",
                        value : numericPrice
                    });
                    log.debug("priceIndex", priceIndex);
                    if(Number(priceIndex) > -1)
                    {
                        if(!uniquePricing[price].quantity || uniquePricing[price].quantity <= 0)
                        {
                            var errorMessage = error.create({
                                name: 'AUTOBILLING_INVALID_QUANTITY',
                                message: 'Cannot resolve Quantity (' + uniquePricing[price].quantity + ') to be billed for item with unit price: ' + Number(priceIndex) + '',
                                notifyOff: false
                            });
                            throw errorMessage;
                        }
                        
                        billRecObj.setSublistValue({
                            sublistId : "item",
                            fieldId : "description",
                            value : uniquePricing[price].quantity,
                            line : priceIndex
                        })
                        billRecObj.setSublistValue({
                            sublistId : "item",
                            fieldId : "quantity",
                            value : uniquePricing[price].quantity,
                            line : priceIndex
                        })

                        
                        linesToKeep["" + priceIndex] = {quantity : uniquePricing[price].quantity};
                    }
                    else
                    {
                        var errorMessage = error.create({
                            name: 'AUTOBILL_CANNOT_RESOLVE_LINE_TO_BILL',
                            message: 'Cannot resolve PO line to be Billed, the item with price of ' + numericPrice + ' is greater than the remaining quantity that can be billed.',
                            notifyOff: false
                        });
                        throw errorMessage;
                    }
                    
                }
                
                log.debug("linesToKeep", linesToKeep);
                var itemSublistCount = billRecObj.getLineCount({
                    sublistId : "item",
                })
                
                for(var a = itemSublistCount-1 ; a >= 0 ; a--)
                {
                    log.debug("attempt to remove line a", a);
                    if(linesToKeep[""+a])
                    {
                        
                    }
                    else
                    {
                        billRecObj.removeLine({
                            sublistId : "item",
                            line : a
                        })
                    }
                }
            }
            
            var billId = billRecObj.save();
            
            //recalculate PO remaining billable amount because UE cant trigger UE
            var targetRecord = record.load({
//              type : billRecObj.type,
                type : "vendorbill",
                id : billId
            });
            
            var createdFrom = "";
            var purchaseOrderCount = targetRecord.getLineCount({
                sublistId : "purchaseorders"
            });
            
            if(purchaseOrderCount && purchaseOrderCount > 0)
            {
                //there is no created from in bill. get the po from the sublist.
                //TODO multiple PO will break the design
                createdFrom = targetRecord.getSublistValue({
                    sublistId : "purchaseorders",
                    fieldId : "id",
                    line : 0
                });
            }
            if(createdFrom)
            {
                var totalAmountBilled = 0;
                
                var createdFrom_record = record.load({
                    type : "purchaseorder",
                    id : createdFrom
                });
                
                var poTotalAmount = createdFrom_record.getValue({
                    fieldId : "total"
                });
                poTotalAmount = parseFloat(poTotalAmount);
                
                var linksSublistCount = createdFrom_record.getLineCount({
                    sublistId : "links",
                });
                log.debug("linksSublistCount", linksSublistCount);
                for(var a = 0 ; a < linksSublistCount ; a++)
                {
                    var linksType = createdFrom_record.getSublistValue({
                        sublistId : "links",
                        fieldId : "type",
                        line : a
                    });
                    log.debug("linksType index : " + a, linksType);
                    if(linksType == "Vendor Bill")
                    {
                        var linksTotal = createdFrom_record.getSublistValue({
                            sublistId : "links",
                            fieldId : "total",
                            line : a
                        });
                        
                        totalAmountBilled += parseFloat(linksTotal)
                    }
                }
                
                var submittedPoId = record.submitFields({
                    type : "purchaseorder",
                    id : createdFrom,
                    values : {
                        custbody_remainingbillableamount : poTotalAmount - totalAmountBilled
                    }
                });
                
                log.debug("submittedPoId", submittedPoId);
            }

            createBill_result.poId = submittedPoId;
            createBill_result.billId = billId;
        }
        catch(e)
        {
            throw e;
//            flagError(scriptContext, e)
            log.debug("find_po_viaUnitPrice_results", find_po_viaUnitPrice_results);
        }
        return createBill_result;
	}
    
    var last_suggested_po = {};
    function afterSubmit(scriptContext)
    {
    	MASTERSETUP = customConfig.masterSetup;
    	//to store the suggested po in whatever ways it was found
    	try
    	{
    		if(scriptContext.type == "delete")
    		{
    			return;
    		}
    		
    		var autobillStatus = scriptContext.newRecord.getValue({
    			fieldId : "custrecord_abd_status"
    		});
    		
    		//only proceed it if not 1 = NEW, 5 = TO REPROCESS, or if status is blank
    		if(!autobillStatus || autobillStatus == "1" || autobillStatus == "5")
    		{
    			var targetRecord = record.load({
        			type : scriptContext.newRecord.type,
        			id : scriptContext.newRecord.id
        		});
        		var requestBody = targetRecord.getValue({
        			fieldId : "custrecord_autobilldata_requestdata"
        		});
        		requestBody = JSON.parse(requestBody);

    			var find_po_viaTotal_results = MASTERSETUP.functions.find_po_viaTotal(requestBody);
    			last_suggested_po = find_po_viaTotal_results;
    			//if has results
//    			log.debug("find_po_viaTotal_results", find_po_viaTotal_results);
    			if(find_po_viaTotal_results && find_po_viaTotal_results.results && find_po_viaTotal_results.results.length > 0)
    			{
    				var vendorNameMatching_results = MASTERSETUP.functions.getVendorMatching_results(requestBody, find_po_viaTotal_results.results[0]);

    				log.debug("vendorNameMatching_results 0", vendorNameMatching_results)

    				//vendor name matches? TODO for learning
    				if(vendorNameMatching_results.byId = "altname")
    				{
    					
    				}
    				else if(vendorNameMatching_results.byId = "entityid")
    				{
    					
    				}
    				else if(vendorNameMatching_results.byId = "companyname")
    				{
    					
    				}
    				log.debug("find_po_viaTotal_results 1", find_po_viaTotal_results)
    				//if only one result
    				if(find_po_viaTotal_results.results && find_po_viaTotal_results.results.length == 1)
    				{
    					log.debug("find_po_viaTotal_results 2", find_po_viaTotal_results)
    					var createBill_result = createBill(find_po_viaTotal_results, vendorNameMatching_results, scriptContext);

    					log.debug("createBill_result", createBill_result);
    					
    					
    					targetRecord.setValue({
    						fieldId : "custrecord_abd_relatedbill",
    						value : createBill_result.billId
    					});
    					targetRecord.setValue({
    						fieldId : "custrecord_abd_relatedpo",
    						value : createBill_result.poId
    					});
    					targetRecord.setValue({
    						fieldId : "custrecord_abd_message",
    						value : "Successfully created BILL with ID : " + createBill_result.billId
    					});
    					targetRecord.setValue({
    						fieldId : "custrecord_abd_suggestedpo",
    						value : find_po_viaTotal_results.poId
    					});
    					
    					//4 is completed, field type LIST > AUTOBILL STATUS / customlist_autobill_status
    					targetRecord.setValue({
    						fieldId : "custrecord_abd_status",
    						value : 4
    					});
    				}
    			}
    			//if more than one result
                else if(requestBody.itemdetails && /*requestBody.itemdetails.constructor == Array &&*/ requestBody.itemdetails.length > 0)
                {
                    var uniquePricing = {};
                    var unitPrices = [];
                    for(var b = 0 ; b < requestBody.itemdetails.length; b++)
                    {
                        var unitqtylinemapping = {};
                        if(requestBody.itemdetails[b].unitprice)
                        {
                            if(!requestBody.itemdetails[b].quantity || requestBody.itemdetails[b].quantity <= 0)
                            {
                                //better to do this when u resolved a PO so you have something to suggest
                                /*
                                var errorMessage = error.create({
                                    name: 'AUTOBILLING_INVALID_QUANTITY',
                                    message: 'Cannot resolve Quantity (' + requestBody.itemdetails[b].quantity + ') to be billed for item with unit price: ' + requestBody.itemdetails[b].unitprice + '',
                                    notifyOff: false
                                });
                                throw errorMessage;
                                */
                            }
                            var formattedUnitPrice = MASTERSETUP.functions.unitpriceformat(requestBody.itemdetails[b].unitprice);
                            unitPrices.push(formattedUnitPrice);
                            
                            if(uniquePricing[formattedUnitPrice])
                            {
                                //better to do this when u resolved a PO so you have something to suggest
                                /*
                                var errorMessage = error.create({
                                    name: 'AUTOBILLING_SAME_RATES',
                                    message: 'Cannot resolve PO lines to be Billed due to multiple items with same price:' + formattedUnitPrice + '',
                                    notifyOff: false
                                });
                                throw errorMessage;
                                */
                                uniquePricing[formattedUnitPrice] = {quantity : requestBody.itemdetails[b].quantity, hasDuplicate : true}
                            }
                            else
                            {
                                uniquePricing[formattedUnitPrice] = {quantity : requestBody.itemdetails[b].quantity}
                            }
                        }
                    }
                    
                    log.debug("unitPrices", unitPrices);
                    find_po_viaUnitPrice_results = MASTERSETUP.functions.find_po_viaUnitPrice(requestBody, unitPrices);
                    last_suggested_po = find_po_viaUnitPrice_results;
                    if(find_po_viaUnitPrice_results.results && find_po_viaUnitPrice_results.results.length == 1)
                    {
                        log.debug("find_po_viaUnitPrice_results 2", find_po_viaUnitPrice_results)
                        var createBill_result = createBill(find_po_viaUnitPrice_results, vendorNameMatching_results, scriptContext, uniquePricing);

                        log.debug("createBill_result", createBill_result);
                        
                        targetRecord.setValue({
                            fieldId : "custrecord_abd_relatedbill",
                            value : createBill_result.billId
                        });
                        targetRecord.setValue({
                            fieldId : "custrecord_abd_relatedpo",
                            value : createBill_result.poId
                        });
                        targetRecord.setValue({
                            fieldId : "custrecord_abd_message",
                            value : "Successfully created BILL with ID : " + createBill_result.billId + "VIA UNIT PRICE"
                        });
                        targetRecord.setValue({
                            fieldId : "custrecord_abd_suggestedpo",
                            value : find_po_viaUnitPrice_results.poId
                        });
                        
                        //4 is completed, field type LIST > AUTOBILL STATUS / customlist_autobill_status
                        targetRecord.setValue({
                            fieldId : "custrecord_abd_status",
                            value : 4
                        });
                    }
                    else
                    {
                        targetRecord.setValue({
                            fieldId : "custrecord_abd_suggestedpo",
                            value : find_po_viaUnitPrice_results.poId
                        });
                        
//                        find_po_viaUnitPrice_results.message = "multiple PO found."
                        
                        targetRecord.setValue({
                            fieldId : "custrecord_abd_message",
                            value : find_po_viaUnitPrice_results.message + " VIA UNIT PRICE"//TODO
                        });
                        
                        targetRecord.setValue({
                            fieldId : "custrecord_abd_status",
                            value : 3 //ERROR
                        });
                        
                    }
                }
    			else
    			{
    				targetRecord.setValue({
						fieldId : "custrecord_abd_message",
						value : find_po_viaTotal_results.message
					});
    				targetRecord.setValue({
						fieldId : "custrecord_abd_status",
						value : 3 //ERROR
					});
    			}
    			

				var autoBillId = targetRecord.save();
				log.debug("autoBillId", autoBillId);
    			//additional layer to try have a fresh page
    			redirect.toRecord({
    				type : scriptContext.newRecord.type,
    				id : scriptContext.newRecord.id
    			})
    		}
    		//manual
    		else if(autobillStatus == "9")
    		{
    			var relatedPoValue = scriptContext.newRecord.getValue({
    				fieldId : "custrecord_abd_relatedpo"
    			});
    			
    			log.debug("relatedPoValue", relatedPoValue);
    			if(relatedPoValue)
    			{
    				redirect.redirect({
    					url : "/app/accounting/transactions/vendbill.nl?transform=purchord&whence=&e=T&memdoc=0" + "&id=" + relatedPoValue + "" +
    							"&custbody_abd_createdfrom=" + scriptContext.newRecord.id
    				})
    			}
    		}
    		
    		log.debug("after submit scriptContext", scriptContext)
    		log.debug("after submit runtime.executionContext", runtime.executionContext)
    	}
    	catch(e)
    	{
    	    //make sure abd record is updated to reflect any error so it can be traced
    	    flagError(scriptContext, e);
    		log.error("ERROR in function afterSubmit", {stack : e.stack, message : e.message});
    	}
    }
    
    function flagError(scriptContext, e)
    {
        log.debug("last_suggested_po", last_suggested_po);
        var submittedRecId = record.submitFields({
            type : scriptContext.newRecord.type,
            id : scriptContext.newRecord.id,
            values : {
                custrecord_abd_suggestedpo : last_suggested_po.poId,
                custrecord_abd_status : 3,
                custrecord_abd_message : e.message
            }
        });
    }
    
    return {
        beforeLoad: beforeLoad,
        beforeSubmit: beforeSubmit,
        afterSubmit: afterSubmit,
    };
    
});
