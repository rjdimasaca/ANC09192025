/**
 * @NApiVersion 2.x
 * @NScriptType UserEventScript
 * @NModuleScope SameAccount
 */
/**
 * 09092021 - copy MPN to MFG Part No Custom field - Rodmar, c/o Mark S
 */
define(['N/search'],
/**
 * @param {email} email
 * @param {https} https
 * @param {record} record
 * @param {redirect} redirect
 * @param {serverWidget} serverWidget
 * @param {url} url
 */
function(search) {
   
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
    	try
    	{
    		log.debug("scriptContext.newRecord.type", scriptContext.newRecord.type);
    		var applyAllVendor = scriptContext.newRecord.getValue({
    			fieldId : "custitem_010_applyallvendor"
    		});
          
          	//09092021 - copy MPN to MFG Part No Custom field - Rodmar, c/o Mark S
          	var mpn_value = scriptContext.newRecord.getValue({
    			fieldId : "mpn"
    		});
          	if(mpn_value)
			{
                var mpn_value = scriptContext.newRecord.setValue({
    				fieldId : "custitem_ms_mfg_partno",
                    value : mpn_value
    			});
            }
          	
    		
    		//if not checked
    		if(!applyAllVendor || applyAllVendor == "F")
    		{
    			
    		}
    		else
    		{
    			var subsidiaryId = scriptContext.newRecord.getValue({
    				fieldId : "subsidiary"
    			});
    			log.debug("subsidiary", subsidiaryId);
    			if(subsidiaryId)
    			{
    				var vendorSearchObj = search.create({
	    				type : "vendor",
	    				filters : [["subsidiary", "anyof", subsidiaryId],
	    					"AND",
	    					["isinactive", "is", false]],
	    				columns : [{name : "subsidiary"}, {name : "representingsubsidiary"}]
    				});
    				
    				log.debug("vendorSearchObj", vendorSearchObj);
    				
    				var vendorSearchResults = getResults(vendorSearchObj.run());
    				 
    				log.debug("vendorSearchResults", vendorSearchResults);
    				if(vendorSearchResults && vendorSearchResults.length > 0)
    				{
    					var itemVendorLineCount = scriptContext.newRecord.getLineCount({
    						sublistId : "itemvendor"
    					});
    					for(var a = 0 ; a < itemVendorLineCount ; a++)
    					{
    						scriptContext.newRecord.removeLine({
    							sublistId : "itemvendor",
    							line : 0
    						});
    					}
    					for(var a = 0, b = 0 ; a < vendorSearchResults.length ; a++)
    					{
    						var vendorId = vendorSearchResults[a].id;
    						if(vendorId < 1)
    						{
    							log.debug("vendorId", vendorId);
    							continue;
    						}
    						var vendorRepresentingSubsidiary = vendorSearchResults[a].getValue({
    							name : "representingsubsidiary"
    						});
    						var vendorSubsidiary = vendorSearchResults[a].getValue({
    							name : "subsidiary"
    						});
//    						log.debug("vendorId", vendorId);
//    						log.debug("vendorSubsidiary", vendorSubsidiary);
    						//what is vendor is multisubsidiary? should you specify here?
    						
    						try
    						{
    							//no dynamic mode in beforeSubmit!!! SAD
//    							scriptContext.newRecord.selectLine({
//    								sublistId : "itemvendor",
//    								line : a
//    							})
    							
//    							scriptContext.newRecord.setCurrentSublistValue({
//        							sublistId : "itemvendor",
//        							fieldId : "vendor",
//        							value : vendorId,
//        							line : a
//        						});
    							
    							scriptContext.newRecord.setSublistValue({
        							sublistId : "itemvendor",
        							fieldId : "vendor",
        							value : vendorId,
        							line : b
        						});
//    							scriptContext.newRecord.setSublistValue({
//        							sublistId : "itemvendor",
//        							fieldId : "subsidiary",
//        							value : vendorSubsidiary,
//        							line : a
//        						});
    							log.debug("setting", {vendorId : vendorId,})
        						b++;
    						}
    						catch(e)
    						{
    							log.error("ERROR in trying to set vendorId : " + vendorId, e.message);
    						}
    					}
    					
    					/*scriptContext.newRecord.setSublistValue({
							sublistId : "itemvendor",
							fieldId : "vendor",
							value : "3461",
							line : 0
						});
    					scriptContext.newRecord.setSublistValue({
							sublistId : "itemvendor",
							fieldId : "vendor",
							value : "8474",
							line : 1
						});
    					scriptContext.newRecord.setSublistValue({
							sublistId : "itemvendor",
							fieldId : "vendor",
							value : "107130",
							line : 2
						});*/
    				}
    			}
    		}
    	}
    	catch(e)
    	{
    		log.error("ERROR in function beforeSubmit", e.message);
    	}
    }
  
  function beforeLoad(scriptContext)
  {
    log.debug("scriptContext.newRecord.type", scriptContext.newRecord.type);
  }

    return {
        beforeLoad: beforeLoad,
        beforeSubmit: beforeSubmit,
//        afterSubmit: afterSubmit,
    };
    
});
