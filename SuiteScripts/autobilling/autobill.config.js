/**
 * @NApiVersion 2.x
 * @NModuleScope Public
 * @Author TC010ROD
 * @Email netrodsuite@gmail.com
 * @Project ANC
 * @Date Feb 20, 2020
 * @Filename customReordering.config.js
 * 
 * 
 * 
 * 
 */

/***************************************************************************
 * Script Name      : No Script Record / Library only
 * Script Id        : 
 * Script Deploy Id : 
 * Script File Name : autobill.config.js
 * Script Type      : library
 * SuiteScript Ver  : 2.0
 * References       : 
 * Dependencies     : 
 * Libraries        :
 * Author           : TC10ROD
 * Dev Version      : 1.0.0 - Initial Release - 03252020 - TC10ROD
 * TODO             : this module and other related objects were intently not following cloudtech standards as the developer originally wanted to take ownership of this module
 **************************************************************************
 */

define(['N/search'],

function(search)
{
	var vendorMatchingFields = [/*"companyname", */"firstname", "lastname", "legalname", "entityid"];
	
	function getVendorMatching_results(requestBody, result)
	{
		var vendorNameMatching_results = {};
		for(var a = 0 ; a < vendorMatchingFields.length ; a++)
		{
			var columnResultValue = result.getValue({
				name : vendorMatchingFields[a],
				join : "vendor"
			})
			if(requestBody.vendorName == columnResultValue)
			{
				vendorNameMatching_results.byId == vendorMatchingFields[a];
				break;
			}
		}
		return vendorNameMatching_results;
	}
	
	function find_po_viaTotal(requestBody)
	{
		var find_po_viaTotal_results = {};
		find_po_viaTotal_results.results = [];
		if(!requestBody.amount)
		{
			return find_po_viaTotal_results;
		}
		var finalFilters = [
//		      ["internalidnumber","equalto","43660208"], 
//		      "AND", 
		      ["custbody_remainingbillableamount","equalto",parseFloat(requestBody.amount)],
		      "AND",
		      ["mainline","is","T"], 
		      "AND", 
		      ["taxline","is","F"],
		      "AND", 
		      ["type","anyof","PurchOrd"]
		   ];
		
		
		if(requestBody.vendorName)
		{
			var vendorFilters = [];
			
			for(var a = 0 ; a < vendorMatchingFields.length; a++)
			{
				if(a != 0)
				{
					vendorFilters.push("OR");
				}
				var vendorFilterEntry = ["vendor" + "." + vendorMatchingFields[a], "is", requestBody.vendorName]
				vendorFilters.push(vendorFilterEntry);
			}
			
			//have to be in a bracket, otherwise if any is vendor is matched it will give search result
			finalFilters = finalFilters.concat(["AND", vendorFilters]);
		}
		
		log.debug("finalFilters", finalFilters);
		var transactionSearchObj = search.create({
			   type: "transaction",
			   filters: finalFilters,
			   columns:
			   [
			      search.createColumn({
			         name: "companyname",
			         join: "vendor",
			         label: "Company Name"
			      }),
			      search.createColumn({
			         name: "firstname",
			         join: "vendor",
			         label: "First Name"
			      }),
			      search.createColumn({
			         name: "lastname",
			         join: "vendor",
			         label: "Last Name"
			      }),
			      search.createColumn({
			         name: "legalname",
			         join: "vendor",
			         label: "Legal Name"
			      }),
			      search.createColumn({
			         name: "entityid",
			         join: "vendor",
			         label: "Name"
			      }),
			      search.createColumn({
			         name: "entitynumber",
			         join: "vendor",
			         label: "Number"
			      }),
			      search.createColumn({
			         name: "internalid",
			         sort: search.Sort.ASC,
			         label: "Internal ID"
			      })
			   ]
			});

		log.debug("transactionSearchObj", transactionSearchObj)
		var transactionSearchObj_res = getResults(transactionSearchObj.run());
		find_po_viaTotal_results.results = transactionSearchObj_res;
		log.debug("transactionSearchObj_res", transactionSearchObj_res);
		if(transactionSearchObj_res && transactionSearchObj_res.length > 1)
		{
			find_po_viaTotal_results.isValid = false;
			find_po_viaTotal_results.message = "Multiple PO detected";
			find_po_viaTotal_results.poId = [];
			for(var a = 0 ; a < transactionSearchObj_res.length ; a++)
			{
				find_po_viaTotal_results.poId.push(transactionSearchObj_res[a].id)
			}
		}
		else if(transactionSearchObj_res && transactionSearchObj_res.length == 1)
		{
			find_po_viaTotal_results.isValid = true;
			find_po_viaTotal_results.poId = transactionSearchObj_res[0].id;
		}
		else if(transactionSearchObj_res && transactionSearchObj_res.length == 0)
		{
			find_po_viaTotal_results.isValid = false;
			find_po_viaTotal_results.message = "No PO matched";
		}
		else
		{
			find_po_viaTotal_results.isValid = false;
			find_po_viaTotal_results.message = "Issue resolving PO";
		}
		
		log.debug("find_po_viaTotal_results", find_po_viaTotal_results)
//		return find_po_viaTotal_results;
	
		return find_po_viaTotal_results
	}
	
	function find_po_viaUnitPrice(requestBody, unitPrices)
	{
        var find_po_viaTotal_results = {};
        find_po_viaTotal_results.results = [];
        if(!requestBody.amount)
        {
            return find_po_viaTotal_results;
        }
        var finalFilters = [
//            ["internalidnumber","equalto","43660208"], 
//            "AND", 
            //exclude po with amount less than the remaining billable amount
            ["custbody_remainingbillableamount","greaterthanorequalto",requestBody.amount], 
            "AND", 
              ["mainline","is","T"], 
              "AND", 
              ["taxline","is","F"],
              "AND", 
              ["type","anyof","PurchOrd"]
           ];
        
        finalFilters.push("AND");
        

        var unitpricefilters = [];
        for(var a = 0 ; a < unitPrices.length ; a++)
        {
            unitpricefilters.push(["custbody_autobill_unitpricelist","contains",unitPrices[a]]);
            if(a+1 < unitPrices.length)
            {
                unitpricefilters.push("AND");
            }
        }
        finalFilters = finalFilters.concat([unitpricefilters])
        
        
        if(requestBody.vendorName)
        {
            var vendorFilters = [];
            
            for(var a = 0 ; a < vendorMatchingFields.length; a++)
            {
                if(a != 0)
                {
                    vendorFilters.push("OR");
                }
                var vendorFilterEntry = ["vendor" + "." + vendorMatchingFields[a], "is", requestBody.vendorName]
                vendorFilters.push(vendorFilterEntry);
            }
            
            //have to be in a bracket, otherwise if any is vendor is matched it will give search result
            finalFilters = finalFilters.concat(["AND", vendorFilters]);
        }
        
        log.debug("finalFilters", finalFilters);
        var transactionSearchObj = search.create({
               type: "transaction",
               filters: finalFilters,
               columns:
               [
                  search.createColumn({
                     name: "companyname",
                     join: "vendor",
                     label: "Company Name"
                  }),
                  search.createColumn({
                     name: "firstname",
                     join: "vendor",
                     label: "First Name"
                  }),
                  search.createColumn({
                     name: "lastname",
                     join: "vendor",
                     label: "Last Name"
                  }),
                  search.createColumn({
                     name: "legalname",
                     join: "vendor",
                     label: "Legal Name"
                  }),
                  search.createColumn({
                     name: "entityid",
                     join: "vendor",
                     label: "Name"
                  }),
                  search.createColumn({
                     name: "entitynumber",
                     join: "vendor",
                     label: "Number"
                  }),
                  search.createColumn({
                     name: "internalid",
                     sort: search.Sort.ASC,
                     label: "Internal ID"
                  })
               ]
            });

        log.debug("transactionSearchObj", transactionSearchObj)
        var transactionSearchObj_res = getResults(transactionSearchObj.run());
        find_po_viaTotal_results.results = transactionSearchObj_res;
        log.debug("transactionSearchObj_res", transactionSearchObj_res);
        if(transactionSearchObj_res && transactionSearchObj_res.length > 1)
        {
            find_po_viaTotal_results.isValid = false;
            find_po_viaTotal_results.message = "Multiple PO detected";
            find_po_viaTotal_results.poId = [];
            for(var a = 0 ; a < transactionSearchObj_res.length ; a++)
            {
                find_po_viaTotal_results.poId.push(transactionSearchObj_res[a].id)
            }
        }
        else if(transactionSearchObj_res && transactionSearchObj_res.length == 1)
        {
            find_po_viaTotal_results.isValid = true;
            find_po_viaTotal_results.poId = transactionSearchObj_res[0].id;
        }
        else if(transactionSearchObj_res && transactionSearchObj_res.length == 0)
        {
            find_po_viaTotal_results.isValid = false;
            find_po_viaTotal_results.message = "No PO matched";
        }
        else
        {
            find_po_viaTotal_results.isValid = false;
            find_po_viaTotal_results.message = "Issue resolving PO via UNIT PRICE";
        }
        
        log.debug("find_po_viaTotal_results", find_po_viaTotal_results)
//      return find_po_viaTotal_results;
    
        return find_po_viaTotal_results
    
	}
	
	function unitpriceformat(val)
    {
        return "*" + Number(val).toFixed(2) + "*"
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
		masterSetup : {
			autobill_recordtype : "customrecord_autobilldata",
			functions : {
				find_po_viaTotal : find_po_viaTotal,
				find_po_viaUnitPrice : find_po_viaUnitPrice,
				getVendorMatching_results : getVendorMatching_results,
				unitpriceformat : unitpriceformat
			},
		}
	}
}

);
