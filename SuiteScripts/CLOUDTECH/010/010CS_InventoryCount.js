/**
 * @NApiVersion 2.x
 * @NScriptType ClientScript
 * @NModuleScope SameAccount
 * 
 * @dev_version 1.0.0 - initial version - TC10ROD
 * @dev_version 1.0.1 - added filtering by bin details as requested by Audrey Lisa on skype - TC10ROD
 */

/**
 * @param runtime
 * @returns
 */
define(['N/runtime', 'N/search'],

function(runtime, search) {
    
	var PREFERRED_BIN_FIELD = "custpage_010_bin";
	var ITEM_PREFERRED_BIN_FIELD = "custitem_preferredbin";
	var popSub = false;
	var binValue = "";
	
	
	//1.1.0 - will need a scriptContext so store pageinit's scriptContext to a variable global_scriptContext
	var global_scriptContext = null;
	
	var binFilterFields = {
	        custpage_010_binstockroom:{binRecordField : "custrecord_010_binstockroom"},
	        custpage_010_binaisle:{binRecordField : "custrecord_010_binaisle"},
	        custpage_010_binsection:{binRecordField : "custrecord_010_binsection"},
	        custpage_010_binshelfposition:{binRecordField : "custrecord_010_binshelfposition"},
	};
	
    /**
     * Function to be executed when field is changed.
     *
     * @param {Object} scriptContext
     * @param {Record} scriptContext.currentRecord - Current form record
     * @param {string} scriptContext.sublistId - Sublist name
     * @param {string} scriptContext.fieldId - Field name
     * @param {number} scriptContext.line - Line number. Will be undefined if not a sublist or matrix field
     * @param {number} scriptContext.columnNum - Line number. Will be undefined if not a matrix field
     *
     * @since 2015.2
     */
    function postSourcing(scriptContext)
    {
    	//console.log("postSourcing scriptContext", scriptContext)
    	var currentStatus = scriptContext.currentRecord.getValue({
    		fieldId : "status"
    	})
    	//console.log("postSourcing currentStatus", currentStatus);
    	if(!currentStatus)
    	{
    		if(scriptContext.sublistId == "item" && scriptContext.fieldId == "item")
        	{
        		var currentItemValue = scriptContext.currentRecord.getCurrentSublistValue({
        			sublistId : "item",
        			fieldId : "item",
        			line : scriptContext.line
        		});
        		//console.log("currentItemValue", currentItemValue);
        		if(currentItemValue)
        		{
        			var itemLookup = search.lookupFields({
        				type : "item",
        				id : currentItemValue,
        				columns : ["averagecost"]
        			});
        			
        			//console.log("itemLookup", itemLookup);
        			var defaultRate = itemLookup.averagecost || 0.00;
        			scriptContext.currentRecord.setCurrentSublistValue({
        				sublistId : "item",
        				fieldId : "rate",
        				line : scriptContext.line,
        				value : defaultRate,
        				ignoreFieldChange : true,
        				forceSyncSourcing : true
        			})
        			
        			popSub = true;
        			
        			scriptContext.currentRecord.setCurrentSublistValue({
        				sublistId : "item",
        				fieldId : "binnumber",
        				line : scriptContext.line,
        				value : binValue,
                      //error, due to script, form wont accept the bins, it does though when i disabled the script, which means this script is causing issue
        				//ignoreFieldChange : true,
        				ignoreFieldChange : false,
        				forceSyncSourcing : true
        			});
        			
//        			scriptContext.currentRecord.commitLine({
//    					sublistId : "item"
//    				})
//    				scriptContext.currentRecord.selectNewLine({
//    					sublistId : "item"
//    				})
        		}
        		
        	}
        	
        	if(scriptContext.fieldId == "binnumber")
        	{
//        		scriptContext.currentRecord.commitLine({
//    				sublistId : "item"
//    			})
//    			scriptContext.currentRecord.selectNewLine({
//    				sublistId : "item"
//    			})
        	}
    	}
    	
    	//console.log("postSourcing", scriptContext);
    }
    
    function populateSublist(scriptContext)
    {
    	binValue = scriptContext.currentRecord.getValue({
    		fieldId : PREFERRED_BIN_FIELD
    	});
    	if(binValue)
    	{
    		var searchObj = search.create({
    			type : "item",
    			filters : [[ITEM_PREFERRED_BIN_FIELD, "is", binValue],
    				"OR",
    				[ITEM_PREFERRED_BIN_FIELD + "." + "custrecord_010_bingroup", "is", binValue]],
//    			columns : ["averagecost", "stockunit"] //forceSyncSourcing : true ought to do it!!! - TC10ROD
    		});
    		
    		var searchObj_results = getResults(searchObj.run());
    		
    		//console.log("searchObj_results", searchObj_results);
    		for(var a = 0 ; a < searchObj_results.length ; a++)
    		{
    			var itemId = searchObj_results[a].id;
    			
        		//console.log("itemId", itemId);
    			if(itemId)
    			{
    				scriptContext.currentRecord.setCurrentSublistValue({
    					sublistId : "item",
    					fieldId : "item",
    					value : itemId,
//        				ignoreFieldChange : true, //forceSyncSourcing : true ought to do it!!! - TC10ROD
        				forceSyncSourcing : true
    				});
    				
    				//force set rate, but dont call that function cause it's chaining like crazy
    				//rely on search result, because you cant afford lookingup each item
    				//forceSyncSourcing : true ought to do it!!! - TC10ROD
    				/*var currentItemValue = scriptContext.currentRecord.getCurrentSublistValue({
            			sublistId : "item",
            			fieldId : "item",
            			line : scriptContext.line
            		});
            		console.log("currentItemValue", currentItemValue);
            		if(currentItemValue)
            		{
            			var item_averageCost = searchObj_results[a].getValue({
            				name : "averagecost"
            			})
            			var item_stockUnit = searchObj_results[a].getValue({
            				name : "stockunit"
            			})
            			console.log("item_stockUnit", item_stockUnit);
            			var defaultRate = item_averageCost || 0.00;
            			scriptContext.currentRecord.setCurrentSublistValue({
            				sublistId : "item",
            				fieldId : "rate",
            				line : scriptContext.line,
            				value : defaultRate,
            				ignoreFieldChange : true,
            				forceSyncSourcing : true
            			})
            			
            			popSub = true;
            			
            			scriptContext.currentRecord.setCurrentSublistValue({
            				sublistId : "item",
            				fieldId : "binnumber",
            				line : scriptContext.line,
            				value : binValue,
            				ignoreFieldChange : true,
            				forceSyncSourcing : true
            			});
            			

//            			scriptContext.currentRecord.setCurrentSublistValue({
//            				sublistId : "item",
//            				fieldId : "units",
//            				line : scriptContext.line,
//            				value : "" + item_stockUnit,
////            				ignoreFieldChange : true,
////            				forceSyncSourcing : true
//            			})
            		}*/
            		
            		
    				popSub = false;
    				
        			scriptContext.currentRecord.commitLine({
						sublistId : "item"
					});
    				
    				console.log("commit item sublist successful")
    			}
    		}
    	}
    	
    	
    	
    	
    }
    
    //1.1.0
    function populateSublist_viaBinFilterFields(scriptContext, binFilterFields)
    {
        var binSearchFilters = [];
        var binValue = scriptContext.currentRecord.getValue({
            fieldId : PREFERRED_BIN_FIELD
        });
        if(binValue)
        {
            binSearchFilters = [[ITEM_PREFERRED_BIN_FIELD, "is", binValue],
                                "OR",
                                [ITEM_PREFERRED_BIN_FIELD + "." + "custrecord_010_bingroup", "is", binValue]]
        }

        var compiledAddtlFilter = [];
        for(var binFilterFieldId in binFilterFields)
        {
            var binFilterFieldValue = scriptContext.currentRecord.getValue({
                fieldId : binFilterFieldId
            });
            if(binFilterFieldValue)
            {
                var addtlFilter = [ITEM_PREFERRED_BIN_FIELD + "." + binFilterFields[binFilterFieldId]["binRecordField"], "is", binFilterFieldValue];
                compiledAddtlFilter.push(addtlFilter);
                compiledAddtlFilter.push("AND");
            }
        }
        if(compiledAddtlFilter.length > 0)
        {
            compiledAddtlFilter.pop();
        }
        
        console.log("compiledAddtlFilter", compiledAddtlFilter);
        
        if(compiledAddtlFilter.length > 0)
        {
            if(binSearchFilters.length > 0)
            {
                binSearchFilters.push("AND");
            }
            binSearchFilters.push(compiledAddtlFilter);
        }
        
        console.log("binSearchFilters", binSearchFilters);
        
        if(binSearchFilters.length > 0)
        {
            var searchObj = search.create({
                type : "item",
                filters : binSearchFilters,
//              columns : ["averagecost", "stockunit"] //forceSyncSourcing : true ought to do it!!! - TC10ROD
                columns : ["custitem_preferredbin"]
            });
            
            var searchObj_results = getResults(searchObj.run());
            
            console.log("searchObj_results", searchObj_results);
            if(!searchObj_results || searchObj_results.length < 1)
            {
                alert("No Items Matched, no item will be added to the list.");
            }
            for(var a = 0 ; a < searchObj_results.length ; a++)
            {
                var itemId = searchObj_results[a].id;
                var item_preferredBinId = searchObj_results[a].getValue("custitem_preferredbin");
                
                console.log("itemId", itemId);
                if(itemId)
                {
                    scriptContext.currentRecord.setCurrentSublistValue({
                        sublistId : "item",
                        fieldId : "item",
                        value : itemId,
//                      ignoreFieldChange : true, //forceSyncSourcing : true ought to do it!!! - TC10ROD
                        forceSyncSourcing : true
                    });
                    
                    scriptContext.currentRecord.setCurrentSublistValue({
                        sublistId : "item",
                        fieldId : "binnumber",
                        value : item_preferredBinId,
//                      ignoreFieldChange : true, //forceSyncSourcing : true ought to do it!!! - TC10ROD
                        forceSyncSourcing : true
                    });
                    
                    //force set rate, but dont call that function cause it's chaining like crazy
                    //rely on search result, because you cant afford lookingup each item
                    //forceSyncSourcing : true ought to do it!!! - TC10ROD
                    /*var currentItemValue = scriptContext.currentRecord.getCurrentSublistValue({
                        sublistId : "item",
                        fieldId : "item",
                        line : scriptContext.line
                    });
                    console.log("currentItemValue", currentItemValue);
                    if(currentItemValue)
                    {
                        var item_averageCost = searchObj_results[a].getValue({
                            name : "averagecost"
                        })
                        var item_stockUnit = searchObj_results[a].getValue({
                            name : "stockunit"
                        })
                        console.log("item_stockUnit", item_stockUnit);
                        var defaultRate = item_averageCost || 0.00;
                        scriptContext.currentRecord.setCurrentSublistValue({
                            sublistId : "item",
                            fieldId : "rate",
                            line : scriptContext.line,
                            value : defaultRate,
                            ignoreFieldChange : true,
                            forceSyncSourcing : true
                        })
                        
                        popSub = true;
                        
                        scriptContext.currentRecord.setCurrentSublistValue({
                            sublistId : "item",
                            fieldId : "binnumber",
                            line : scriptContext.line,
                            value : binValue,
                            ignoreFieldChange : true,
                            forceSyncSourcing : true
                        });
                        

//                      scriptContext.currentRecord.setCurrentSublistValue({
//                          sublistId : "item",
//                          fieldId : "units",
//                          line : scriptContext.line,
//                          value : "" + item_stockUnit,
////                            ignoreFieldChange : true,
////                            forceSyncSourcing : true
//                      })
                    }*/
                    
                    
                    popSub = false;
                    
                    scriptContext.currentRecord.commitLine({
                        sublistId : "item"
                    });
                    
                    console.log("commit item sublist successful")
                }
            }
        }
        //1.0.0
        else
        {
            alert("No Bins Matched, no item will be added to the list.");    
        }
        
        
        
        
    }
    
    
    //1.1.0 - triggered by a button
    function filterByBinsDetails()
    {
        //TC10ROD TODO binFilterFields now a global variable no need to pass as argument
        //clearSublist(); //you dont need to clear the sublist as user may want to add from different bins
      //1.1.0 - will need a scriptContext so store pageinit's scriptContext to a variable global_scriptContext
        populateSublist_viaBinFilterFields(global_scriptContext, binFilterFields);
    }
    
    
    
    function fieldChanged(scriptContext)
    {
    	var currentStatus = scriptContext.currentRecord.getValue({
    		fieldId : "status"
    	})
    	//console.log("fieldChanged currentStatus", currentStatus);
    	if(!currentStatus)
    	{
    		if(scriptContext.fieldId == PREFERRED_BIN_FIELD)
        	{
        		//clearSublist();
        		populateSublist(scriptContext);
        	}
    		
    		//1.0.0 - trigger this on button click cause this is now multipart filters, there can be combinations and u dont want to keep adding items when user has not yet finalized his/her filters - TC10ROD
    		/*if(binFilterFields[scriptContext.fieldId])
            {
                //clearSublist();
    		    populateSublist_viaBinFilterFields(scriptContext, binFilterFields);
            }*/
        	//console.log("fieldChanged", scriptContext);
    	}
    }

    //TODO CANT GET THIS TO WORK, function on removeAll button created from an inline html field on the userevent level
    function removeLines(sublistId)
    {
    	/*var sublistCount = global_scriptContext.currentRecord.getLineCount({
    		sublistId : sublistId
    	});
    	console.log("ss2 removelines", sublistCount);
    	if(sublistCount && sublistCount > 0)
    	{
    		for(var a =  0 ; a < sublistCount ; a++)
    		{
    			global_scriptContext.currentRecord.removeLine({
    	    		sublistId : sublistId,
    	    		line : sublistCount - a
    	    	});
    		}
    	}*/
    	
        //TODO the above ss2.0 is not working - TC10ROD
    	window.removeLines_ss1();
    	alert("Successfuly cleared the items list.")
    }
    function pageInit(scriptContext)
    {
    	//console.log("010CS_InventoryCount.js pageInit", "pageInit");
    	//1.1.0 - will need a scriptContext so store pageinit's scriptContext to a variable global_scriptContext
    	global_scriptContext = scriptContext;
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
        postSourcing: postSourcing,
        pageInit: pageInit,
        fieldChanged : fieldChanged,
        removeLines : removeLines,
        filterByBinsDetails : filterByBinsDetails
    };
    
});
