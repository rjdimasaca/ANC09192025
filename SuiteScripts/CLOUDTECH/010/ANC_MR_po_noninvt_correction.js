/**
 * @NApiVersion 2.1
 * @NScriptType MapReduceScript
 * @NModuleScope SameAccount
 */

/**
 * @Author Rodmar Dimasaca
 * @Email netrodsuite@gmail.com
 * @Project ANC
 * @Date June 26, 2023
 * @Filename ANC_MR_UPDATE_POS.js
 */
define(['N/search', 'N/record', 'N/file', 'N/task'],
function(search, record, file, task) {
  
    function getInputData() {
		var searchObj = search.load({
			id : "customsearch_anc_postoupdatemsitem"
		});
		log.debug("searchObj", searchObj)
		return searchObj;
    }
	function map(context) {

		try{
			log.debug("map context", context);
			log.debug("map context.value", context.value);
			var contextValue = JSON.parse(context.value);
			// var contextValues = JSON.parse(contextValue.values);
			var contextValues = contextValue.values;
			// log.debug("map contextValues", {contextValues, /* contextValue_length : contextValues.length */});
			log.debug("map contextValues", contextValues);

			updatePoItems(contextValues);



			// Greg Blass
			// Parent Company
			// nowakdental@consulesolutions.com

			// APPLICATION/INTEGRATION name : Icortica Integration
			// consumer key
			// a9be65d6b0a6ff81104bf4616fc14c5e0aa9e383a74445ac8075b359733f127e
			// consumer secret
			// ec608ea1256abac03f8c4f3062b7a7a24f56d67aca4102857184c3f75ed25093

			// ACCESS TOKEN: GREG BLASS, ICORTICA INTEGRATION DEVELOPER
			// token id
			// 3efcd72b73b79ce943db93ca15d4dfbe542b9f70fca4b36bc864ba504ddd6c09
			// token secret
			// 2c5c370d17285b3393273e24065214d5ace9f33d4d5672acda9211a3fba6daa6
		}
		catch(e)
		{
			log.error("ERROR in function map", e);
		}
		
    }

	function updatePoItems(contextValues)
	{
		//NS ITEM CREATED FROM MAINSAVER - 1427 //internalid is = 93293
		var itemPrefix1 = "NS ITEM CREATED FROM MAINSAVER - ";
		var itemPrefix2 = "NS ITEMS CREATED FROM MAINSAVER - ";
		var wrongItemId = 93293;
		// log.debug("updatePoItems contextValues", contextValues);
		// log.debug("updatePoItems", contextValues['GROUP(internalid)'].value);

		var poRec = record.load({
			type : "purchaseorder",
			id : contextValues['GROUP(internalid)'].value
		})

		var lineCount = poRec.getLineCount({
			sublistId : "item"
		});

		var poChangeRequired = false;

		for(var a = 0 ; a < lineCount ; a++)
		{
			var itemId = poRec.getSublistValue({
				sublistId : "item",
				fieldId : "item",
				line : a
			});

			var itemDesc = poRec.getSublistValue({
				sublistId : "item",
				fieldId : "description",
				line : a
			});

			var itemRate = poRec.getSublistValue({
				sublistId : "item",
				fieldId : "rate",
				line : a
			});

			var itemDept = poRec.getSublistValue({
				sublistId : "item",
				fieldId : "department",
				line : a
			});

			var itemQty = poRec.getSublistValue({
				sublistId : "item",
				fieldId : "quantity",
				line : a
			});

			var itemTaxcode = poRec.getSublistValue({
				sublistId : "item",
				fieldId : "taxcode",
				line : a
			});
			var itemErd = poRec.getSublistValue({
				sublistId : "item",
				fieldId : "expectedreceiptdate",
				line : a
			});

			log.debug("{itemDesc, itemQty, itemDept, itemRate}", {itemDesc, itemQty, itemDept, itemRate, itemErd, itemTaxcode});

			if(itemId == wrongItemId)
			{
				var correctAccountId = poRec.getSublistValue({
					sublistId : "item",
					fieldId : "custcol_svb_item_exp_account",
					line : a
				});

				if(correctAccountId)
				{
					var correctAccount_accountRec = record.load({
						type : "account",
						id : correctAccountId
					})

					var correctAccountCode = correctAccount_accountRec.getValue({
						fieldId : "acctnumber"
					});
					log.debug("correctAccountCode", correctAccountCode);

					if(""+correctAccountCode)
					{
						var noninventoryitemSearchObj = search.create({
							type: "noninventoryitem",
							filters:
							[
							   ["isinactive","is","F"], 
							   "AND", 
							   ["type","anyof","NonInvtPart"], 
							   "AND", 
							   [["name","is",itemPrefix1 + correctAccountCode],"OR",["name","is",itemPrefix2 + correctAccountCode]]
							],
							columns:
							[
							   search.createColumn({
								  name: "internalid",
								  sort: search.Sort.DESC,
								  label: "InternalId"
							   })
							]
						 });
						 var searchResultCount = noninventoryitemSearchObj.runPaged().count;
						 var itemFound = false;
						 if(searchResultCount && searchResultCount > 1)
						 {
							log.audit("warning: more than 1 item found for" + correctAccountCode, searchResultCount);
						 }
						 noninventoryitemSearchObj.run().each(function(result){
							// .run().each has a limit of 4,000 results
							var correctItemId = result.id;
							log.audit("review", {correctItemId, wrongItemId, correctAccountCode, line:a, poId : contextValues['GROUP(internalid)'].value});

							itemFound = true;
							// poRec
							if(correctItemId != wrongItemId)
							{
								poRec.setSublistValue({
									sublistId : "item",
									fieldId : "item",
									value : correctItemId,
									line : a
								});


								poRec.setSublistValue({
									sublistId : "item",
									fieldId : "description",
									value : itemDesc,
									line : a
								});
								poRec.setSublistValue({
									sublistId : "item",
									fieldId : "quantity",
									value : itemQty,
									line : a
								});
								poRec.setSublistValue({
									sublistId : "item",
									fieldId : "rate",
									value : itemRate,
									line : a
								});
								poRec.setSublistValue({
									sublistId : "item",
									fieldId : "department",
									value : itemDept,
									line : a
								});
								poRec.setSublistValue({
									sublistId : "item",
									fieldId : "taxcode",
									value : itemTaxcode,
									line : a
								});
								poRec.setSublistValue({
									sublistId : "item",
									fieldId : "expectedreceiptdate",
									value : itemErd,
									line : a
								});




								poChangeRequired = true;
							}
							
							return false;
						 });

						 if(!itemFound)
						 {
							log.audit("warning: item not found for" + correctAccountCode, {itemFound, wrongItemId, correctAccountCode, line:a, poId : contextValues['GROUP(internalid)'].value})
						 }
					}
				}
				else{
					log.audit("warning: correctAccountId not defined" + correctAccountId)
				}
				
			}

			

			
			log.debug('{itemId}', {itemId})
		}

		if(poChangeRequired)
		{
			var submittedPoId = poRec.save({
				ignoreMandatoryFields : true,
				allowSourcing : true
			});

			log.audit("submittedPoId", submittedPoId);
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

	function summarize()
	{
		//call mr again for leftovers or missed timings
	}
  
    return {
        getInputData: getInputData,
        map: map,
    };
  });