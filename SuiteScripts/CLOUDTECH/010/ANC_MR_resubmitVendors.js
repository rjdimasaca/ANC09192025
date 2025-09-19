/**
 * @NApiVersion 2.1
 * @NScriptType MapReduceScript
 * @NModuleScope SameAccount
 */

/**
 * @Author Rodmar Dimasaca
 * @Email netrodsuite@gmail.com
 * @Project ANC
 * @Date AUG 17, 2023
 * @Filename COS_MR_consumptionDemandReport.js
 */
define(['N/search', 'N/record'],
function(search, record) {
  
    function getInputData() {
		try{
			var searchObj = search.create({
				type: "vendor",
				filters:
				[
					["category","noneof","3"], 
					"AND", 
					["otherrelationships","noneof","CustJob","OtherName","Partner"], 
					"AND", 
					["count(msesubsidiary.internalid)","equalto","1"]
				],
				columns:
				[
					search.createColumn({
						name: "internalid",
						summary: "GROUP",
						label: "Internal ID"
					})
				]
			});
			return searchObj;
		}
		catch(e)
		{
			log.error("ERROR in function getInputData", e)
		}
		
    }
  
    function map(context) {
		try{
			//better to run in reduce stage for less limitations
			log.debug("map context", context);
			var value = JSON.parse(context.value).values["GROUP(internalid)"].value

			log.debug("target value", value)
			// var value = JSON.parse(context.value);
			var vendorRec = record.load({
				type : "vendor",
				id : value
			});

			var submittedRecId = vendorRec.save({
				ignoreMandatoryFields : true,
				allowSourcing : true
			})

			log.debug("submittedRecId", {submittedRecId, details : {
				type : "vendor",
				id : value
			}})

			// var value = JSON.parse(context.value);
			// var vendorRec = record.load({
			// 	type : "vendor",
			// 	id : value.id
			// });

			// var submittedRecId = vendorRec.save({
			// 	ignoreMandatoryFields : true,
			// 	allowSourcing : true
			// })

			// log.debug("submittedRecId", {submittedRecId, details : {
			// 	type : "vendor",
			// 	id : value.id
			// }})
		}
		catch(e)
		{
			log.audit("ERROR in function map", e)
		}
        
    }
  
    return {
        getInputData: getInputData,
        map: map,
        // reduce: reduce,
        // summarize: summarize
    };
  });