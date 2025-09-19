/**
 * @NApiVersion 2.x
 * @NScriptType MapReduceScript
 * @NModuleScope SameAccount
 */
define(['N/search', 'N/email', 'N/file', 'N/record', 'N/render', 'N/runtime', 'N/url', 'N/config', '../lodash.min.js'],
/**
 * @param {email} email
 * @param {file} file
 * @param {record} record
 * @param {render} render
 * @param {runtime} runtime
 * @param {url} url
 */
function(search, email, file, record, render, runtime, url, config, _) {
   
    /**
     * Marks the beginning of the Map/Reduce process and generates input data.
     *
     * @typedef {Object} ObjectRef
     * @property {number} id - Internal ID of the record instance
     * @property {string} type - Record type id
     *
     * @return {Array|Object|Search|RecordRef} inputSummary
     * @since 2015.1
     */
    function getInputData()
    {
//    	var inputData = [1,2,3];
//    	log.debug("inputData", inputData);
//    	return inputData;
    	
    	var script = runtime.getCurrentScript();
        var data = [];
        var ic_ia_str = script.getParameter({ name: 'custscript_010mr_proc_ic_ia'});
        //log.debug("TC10RODfileObj", fileObj);
        var ic_ia_str_obj = JSON.parse(ic_ia_str)
        
        log.debug("ic_ia_str_obj", ic_ia_str_obj)
        return ic_ia_str_obj;
    }
    
    /**
     * Executes when the map entry point is triggered and applies to each key/value pair.
     *
     * @param {MapSummary} context - Data collection containing the key/value pairs to process through the map stage
     * @since 2015.1
     */
    function map(context) {
    	
    	log.debug("map context", context);
    	
		var data = context.value;
    	data = JSON.parse(data);
    	
//		var iaContents = getIaContents(data);
    	//do it straight to not redo iteration
    	
    	log.debug("data", data);
    	var transactionSearchObj = search.create({
			   type: "transaction",
			   filters:
			   [
			      ["mainline","is","F"], 
			      "AND", 
			      ["internalid","is",data.id]
			   ],
			   columns:
			   [
				   search.createColumn({name: "item", label: "Item"}),
				      search.createColumn({
				         name: "expenseaccount",
				         join: "item",
				         label: "Expense/COGS Account"
				      }),
				      search.createColumn({
				         name: "department",
				         join: "item",
				         label: "Department"
				      }),
				      search.createColumn({name: "location", label: "Location"}),
				      search.createColumn({name: "quantity", label: "Quantity"}),
				      search.createColumn({name: "unit", label: "Units"}),
				      search.createColumn({name: "unitabbreviation", label: "Units"})
			   ]
			});
    	
    	var recObj = record.load({
    		type : data.type,
    		id : data.id
    	});
    	var subsidiaryId = recObj.getValue({
    		fieldId : "subsidiary"
    	});
    	
    	//you need inventory details, so just get it from the record not from search
//    	var transactionSearchObj_results = getResults(transactionSearchObj.run());
//    	
//    	log.debug("transactionSearchObj_results", transactionSearchObj_results);
// 		if(transactionSearchObj_results && transactionSearchObj_results.length > 0)
// 		{
// 			log.debug(1);
// 			for(var a = 0 ; a < transactionSearchObj_results.length ; a++)
// 			{
// 				var lineDetails = {
//     					item : "" + transactionSearchObj_results[a].getValue({name: "item", label: "Item"}),
//     					department : transactionSearchObj_results[a].getValue({
//    				         name: "department",
//     				         join: "item",
//     				         label: "Department"
//     				      }),
//     					location : transactionSearchObj_results[a].getValue({name: "location", label: "Location"}),
//     					adjustqtyby : transactionSearchObj_results[a].getValue({name: "quantity", label: "Quantity"}),
//     					//TODO UNITS HAVE TO BE LOOKEDUP, SEARCH DOES NOT PROVIDE INTERNAL ID OF UNIT
////     					units : transactionSearchObj_results[a].getValue({name: "unit", label: "Units"}),
//     					ic_id : data.ic_id,
//     					subsidiaryId : subsidiaryId
//     			};
//     			
//     			log.debug("lineDetails", lineDetails);
//     			var itemCogsAccount = transactionSearchObj_results[a].getValue({
//			         name: "expenseaccount",
//				         join: "item",
//				         label: "Expense/COGS Account"
//				      });
//     			
//     			
//     			log.debug("itemCogsAccount", itemCogsAccount);
//     			log.debug("lineDetails", lineDetails);
//     			context.write({
//     	    		key: (itemCogsAccount),
//     	    	    value: lineDetails
//     	    	});
// 			}
// 			
// 			log.debug("map end")
// 		}
    	
    	var recObj_inventory_count = recObj.getLineCount({
    		sublistId : "inventory"
    	});
    	log.debug("TEMP: recObj_inventory_count", recObj_inventory_count);
    	for(var a = 0 ; a < recObj_inventory_count ; a++)
    	{
    		try
    		{
    			log.debug("INDEX", a);
        		var itemValue = recObj.getSublistValue({
        			sublistId : "inventory",
        			fieldId : "item",
        			line : a
        		});
        		//log.debug("TEMP: itemValue", itemValue);
        		var itemLookup = search.lookupFields({
        			type : "item",
        			id : itemValue,
        			columns : ["recordtype"]
        		})
        		
        		//log.debug("TEMP: itemLookup", itemLookup);
        		var itemRecord = record.load({
        			type : itemLookup.recordtype,
        			id : itemValue
        		});

        		//log.debug("TEMP: itemRecord", itemRecord);
        		var itemRecord_cogsAccount = itemRecord.getValue({
        			fieldId : "cogsaccount"
        		});
        		//log.debug("TEMP: itemRecord_cogsAccount", itemRecord_cogsAccount);
        		var itemRecord_department = itemRecord.getValue({
        			fieldId : "department"
        		});

        		//log.debug("TEMP: itemRecord_department", itemRecord_department);
        		var locationValue = recObj.getSublistValue({
        			sublistId : "inventory",
        			fieldId : "location",
        			line : a
        		});

        		//log.debug("TEMP: locationValue", locationValue);
        		var unitsValue = recObj.getSublistValue({
        			sublistId : "inventory",
        			fieldId : "units",
        			line : a
        		});
        		//log.debug("TEMP: unitsValue", unitsValue);
        		var adjustQtyByValue = recObj.getSublistValue({
        			sublistId : "inventory",
        			fieldId : "adjustqtyby",
        			line : a
        		});
        		
        		var unitCost = recObj.getSublistValue({
        			sublistId : "inventory",
        			fieldId : "unitcost",
        			line : a
        		});
        		
        		//log.debug("TEMP: adjustQtyByValue", adjustQtyByValue);
        		var inventoryDetailSubrecord = recObj.getSublistSubrecord({
        			sublistId : "inventory",
        			fieldId : "inventorydetail",
        			line : a
        		});
        		//log.debug("TEMP: inventoryDetailSubrecord", inventoryDetailSubrecord);
        		var inventoryDetailSubrecord_inventoryassignment_count = inventoryDetailSubrecord.getLineCount({
        			sublistId : "inventoryassignment"
        		});

        		//log.debug("TEMP: inventoryDetailSubrecord_inventoryassignment_count", inventoryDetailSubrecord_inventoryassignment_count);
        		
        		var isSerial = inventoryDetailSubrecord.getLineCount({
    				sublistId : "inventoryassignment",
    				fieldId : "isserial",
    				line : b
    			});

        		var isSerialOrLot = inventoryDetailSubrecord.getLineCount({
    				sublistId : "inventoryassignment",
    				fieldId : "serialorlot",
    				line : b
    			});
        		
        		isSerialOrLot = !(isSerial && isSerial !="F") ? true : false;
        		
        		var isLot = !isSerial && (isSerialOrLot) ? true : false;

        		var inventoryDetails = [];
        		for(var b = 0 ; b < inventoryDetailSubrecord_inventoryassignment_count ; b++)
        		{
            		var inventoryDetail = {};
            		
            		
            		
            		inventoryDetail.quantity = inventoryDetailSubrecord.getSublistValue({
        				sublistId : "inventoryassignment",
        				fieldId : "quantity",
        				line : b
        			})
        			
        			var invdetail_receiptnumber_field = inventoryDetail.quantity < 0 ? "issueinventorynumber" : "receiptinventorynumber";

        			inventoryDetail[invdetail_receiptnumber_field] = inventoryDetailSubrecord.getSublistValue({
        				sublistId : "inventoryassignment",
        				fieldId : invdetail_receiptnumber_field,
        				line : b
        			})
            		
            		
            		
            		
            		
            		
            		
            		
            		
            		
            		
            		var itemusesbins = inventoryDetailSubrecord.getSublistValue({
        				sublistId : "inventoryassignment",
        				fieldId : "itemusesbins",
        				line : b
        			});
            		
            		if(itemusesbins)
            		{
            			inventoryDetail.binnumber = inventoryDetailSubrecord.getSublistValue({
            				sublistId : "inventoryassignment",
            				fieldId : "binnumber",
            				line : b
            			});
            		}
            		
        			if(isSerial)
        			{
        				
        			}
        			
        			if(isLot)
        			{
        				inventoryDetail.expirationdate = inventoryDetailSubrecord.getSublistValue({
            				sublistId : "inventoryassignment",
            				fieldId : "expirationdate",
            				line : b
            			})
        			}
        			
        			
        			inventoryDetails.push(inventoryDetail)
        			//log.debug("TEMP: inventoryDetails", inventoryDetailSubrecord_inventoryassignment_count);
        		}
        		
        		log.debug("inventoryDetails", inventoryDetails);
        		var iaDetails = {
        				sublistValues : {
        					item : itemValue,
         					department : itemRecord_department,
         					location : locationValue,
         					quantity : adjustQtyByValue,
         					adjustqtyby : adjustQtyByValue,
         					units : unitsValue,
         					inventoryDetails : inventoryDetails,
         					custbody_original_ia : data.id
        				},
        				headerValues : {
         					subsidiary : subsidiaryId,
         					custbody_010_createdfrom_transaction : data.ic_id,
        				},
        		};
        		
        		if(adjustQtyByValue > 0)
        		{
        			iaDetails.sublistValues.unitcost = unitCost;
        		}
        		log.debug("iaDetails", iaDetails);
        		
        		context.write({
    	    		key: (itemRecord_cogsAccount),
    	    	    value: iaDetails
    	    	});
        	
        		
        		log.debug("deletedRecId", deletedRecId);
    		}
    		catch(e)
    		{
    			log.debug("ERROR in function map", {msg:e.message, stack: e.stack})
    		}
    	}
    	var deletedRecId = record.delete({
			type : data.type,
			id : data.id
		})
    }
    
    /*
     * do it straight to not redo iteration
     * deprecated, just do it straight so you wont need to iterate again
     */
    function getIaContents(data)
    {}

    /**
     * Executes when the reduce entry point is triggered and applies to each group. 
     * 
     * via recObj
     *
     * @param {ReduceSummary} context - Data collection containing the groups to process through the reduce stage
     * @since 2015.1
     */
    function reduce(context)
    {
    	try
    	{
    		log.debug("reduce context", context);
    		
    		var data = context.values;
        	
        	log.debug("reduce data", data);
        	
        	var iaRecord = record.create({
        		type : "inventoryadjustment",
        		isDynamic : true
        	});
        	
        	log.debug("REDUCE data.length", data.length);
        	
        	for(var a = 0 ; a < data.length ; a ++)
        	{
        		var dataObj = JSON.parse(data[a]);
        		
        		if(a == 0)
        		{
        			for(var bodyField in dataObj.headerValues)
            		{
            			iaRecord.setValue({
            				fieldId : bodyField,
            				value : dataObj.headerValues[bodyField],
            			});

            		}
        			iaRecord.setValue({
        				sublistId : "inventory",
        				fieldId : "account",
        				value : "" + context.key
        			});
        		}
        		
        		for(var sublistField in dataObj.sublistValues)
        		{
        			iaRecord.setCurrentSublistValue({
        				sublistId : "inventory",
        				fieldId : sublistField,
        				value : dataObj.sublistValues[sublistField],
        				line : a
        			});
        			if(sublistField == "inventoryDetails")
        			{
        				var inventoryDetailsArray = dataObj.sublistValues[sublistField];
        				log.debug("inventoryDetailsArray", inventoryDetailsArray);
        				if(inventoryDetailsArray && inventoryDetailsArray.length > 0)
        				{
        					var line_inventoryDetail = iaRecord.getCurrentSublistSubrecord({
        					    sublistId: "inventory",
        					    fieldId: "inventorydetail",
        					    line: a
        					})
        					for(var c = 0 ; c < inventoryDetailsArray.length ; c++)
        					{
        						for(var columnId in inventoryDetailsArray[c])
        						{
        							log.debug("setting columnId : " + columnId, "value : " + inventoryDetailsArray[c][columnId]);
        							
        							line_inventoryDetail.setCurrentSublistValue({
        								sublistId : "inventoryassignment",
        								fieldId : columnId,
        								line : c,
        								value : inventoryDetailsArray[c][columnId]
        							})
        						}
        						line_inventoryDetail.commitLine({
        							sublistId : "inventoryassignment"
        						});
        					}
        				}
        			}
        		}
        		
        		log.debug("iaRecord", iaRecord);
        		

    			iaRecord.commitLine({
    				sublistId : "inventory",
    			})
        	}
        	
        	var submittedIaRec = iaRecord.save();
        	log.debug("submittedIaRec", submittedIaRec);
    	}
    	catch(e)
    	{
    		log.error("ERROR in function reduce", {message : e.message, stack : e.stack});
    	}
    }
    
    
    /**
     * Executes when the reduce entry point is triggered and applies to each group.
     *
     * @param {ReduceSummary} context - Data collection containing the groups to process through the reduce stage
     * @since 2015.1
     */
//    function reduce(context)
//    {
//    	try
//    	{
//    		log.debug("reduce context", context);
//    		
//    		var data = context.values;
//        	
//        	log.debug("reduce data", data);
//        	
//        	var iaRecord = record.create({
//        		type : "inventoryadjustment",
//        		isDynamic : true
//        	});
//        	
//        	for(var a = 0 ; a < data.length ; a ++)
//        	{
//        		var dataObj = JSON.parse(data[a]);
//        		
//        		if(a == 0)
//        		{
//        			iaRecord.setValue({
//        				sublistId : "inventory",
//        				fieldId : "subsidiary",
//        				value : dataObj.subsidiaryId
//        			});
//        			iaRecord.setValue({
//        				sublistId : "inventory",
//        				fieldId : "account",
//        				value : "" + context.key
//        			});
//        			iaRecord.setValue({
//        				sublistId : "inventory",
//        				fieldId : "custbody_010_createdfrom_transaction",
//        				value : dataObj.ic_id
//        			})
//        		}
//        		
//        		log.debug("iaRecord", iaRecord);
//        		
//        		for(var sublistField in dataObj)
//        		{
//        			log.debug("setting sublistField : " + sublistField, "value : " + dataObj[sublistField]);
//        			if(sublistField == "ic_id" || sublistField == "subsidiaryId")
//        			{
//        				continue;
//        			}
//        			iaRecord.setCurrentSublistValue({
//        				sublistId : "inventory",
//        				fieldId : sublistField,
//        				value : dataObj[sublistField],
//        				line : a
//        			});
//
//        		}
//
//    			iaRecord.commitLine({
//    				sublistId : "inventory",
//    			})
//        	}
//        	
//        	var submittedIaRec = iaRecord.save();
//        	log.debug("submittedIaRec", submittedIaRec);
//    	}
//    	catch(e)
//    	{
//    		log.error("ERROR in function reduce", {message : e.message, stack : e.stack});
//    	}
//    }
    
    function formatDateMMDDYYYY(targetDate)
    {
    	if(!targetDate)
    	{
    		targetDate = new Date();
    	}
    	
    	var targetDate_date_month = (Number(targetDate.getMonth()) + 1);
    	var targetDate_date_year = targetDate.getFullYear();
    	var targetDate_date_date = targetDate.getDate();
    	
    	if(targetDate_date_month < 10)
    	{
    		targetDate_date_month = "0" + targetDate_date_month
    	}
    	if(targetDate_date_date < 10)
    	{
    		targetDate_date_date = "0" + targetDate_date_date
    	}
    	
    	targetDate = targetDate_date_month + "/" + targetDate_date_date + "/" + targetDate_date_year;
    	return targetDate
    }
    
    /**
     * Executes when the summarize entry point is triggered and applies to the result set.
     *
     * @param {Summary} summary - Holds statistics regarding the execution of a map/reduce script
     * @since 2015.1
     */
    function summarize(summary)
    {
    	log.debug("summarize summary", summary);
    }
    
    function summarize(summary)
    {
    	log.debug("summarize summary", summary);
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

    return {
        getInputData: getInputData,
        map: map,
        reduce: reduce,
        summarize: summarize
    };
    
});
