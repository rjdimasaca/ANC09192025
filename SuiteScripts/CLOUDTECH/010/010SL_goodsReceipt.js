/**
 * @NApiVersion 2.x
 * @NScriptType Suitelet
 * @NModuleScope SameAccount
 */
define(['N/record', 'N/file', 'N/render', 'N/config', 'N/email', 'N/search', 'N/runtime', 'N/https', 'N/format'],

function(record, file, render, config, email, search, runtime, https, format) {
   
	//make these global for easy access, useful for scoped function reference
	var transactionSearchObj = null;
	var transactionSearchObj_columns = [];
	
	function formatDateYYYYMMDD(targetDate)
    {
    	targetDate = new Date(targetDate);
    	
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
    	
    	
    	targetDate =targetDate_date_year + "" + targetDate_date_month + "" + targetDate_date_date;
    	targetDate = targetDate.split("");
    	targetDate = targetDate.join("&nbsp;")
    	return targetDate
    }
	
	function getLineItemsToPrintHtml(lineItemsToPrint, requestorMappingObj)
	{
		var lineItemsToPrintHtml = '<table width="100%">';
		
		try
		{
			for(var a = 0 ; a < lineItemsToPrint.length ; a++)
			{
				lineItemsToPrintHtml += '<tr><td align="left">';
				lineItemsToPrintHtml += '<table class="contents_item">'
				lineItemsToPrintHtml += "<tr>";
				
				//BASIS, make sure this is updated

				/*search.createColumn({name: "item", label: "Item"}),
			      search.createColumn({
			         name: "itemid",
			         join: "item",
			         label: "Name"
			      }),
			      search.createColumn({
			         name: "displayname",
			         join: "item",
			         label: "Display Name"
			      }),
			      search.createColumn({name: "memo", label: "Memo"}), //EMPTY? NOT WORKING? GET FROM ITEM PURCHASE DESCRIPTION INSTEAD, index = still 3
			     //4
			      search.createColumn({
			         name: "stockdescription",
			         join: "item",
			         label: "Stock Description"
			      }),
			      search.createColumn({name: "location", label: "Location"}), //INDEX = 5
			      search.createColumn({name: "quantity", label: "Quantity"}), //INDEX = 6
			      search.createColumn({name: "quantityshiprecv", label: "Quantity Fulfilled/Received"}), //INDEX = 7
			      search.createColumn({name: "unit", label: "Units"}), //INDEX = 8
			      search.createColumn({name: "unitabbreviation", label: "Units"}), //INDEX = 9
			      search.createColumn({name: "rate", label: "Item Rate"}), // INDEX = 10
			      search.createColumn({name: "porate", label: "PO Rate"}), // INDEX = 11
			      search.createColumn({ //INDEX = 12
			         name: "averagecost",
			         join: "item",
			         label: "Average Cost"
			      }),
			      search.createColumn({name: "line", label: "Line ID"}), //LINE = 13
			      search.createColumn({ //INDEX = 14
			         name: "custcol_svb_vend_bill_lineno",
			         sort: search.Sort.ASC,
			         label: "Line #"
			      }),
			      search.createColumn({name: "linesequencenumber", label: "Line Sequence Number"}), //15
			      search.createColumn({name: "lineuniquekey", label: "Line Unique Key"}),
			      custcol_010lnkdtrnsctn_crtdfrm
			*/
				var tdValues = [];
				
				log.debug("lineItemsToPrint[a].columns", lineItemsToPrint[a].columns);
				
				//{name: "linesequencenumber", label: "Line Sequence Number"}
				var lineValue = lineItemsToPrint[a].getValue(lineItemsToPrint[a].columns[13]) //.columns[15]), 13 is po seqno, 15 isitemreceipt linecount
				lineValue = clean(lineValue);
				tdValues.push({lineValue : lineValue, styleClassName : "polinenumber"});
				
				/*{
			         name: "itemid",
			         join: "item",
			         label: "Name"
			    }*/
				var lineValue = lineItemsToPrint[a].getText(lineItemsToPrint[a].columns[0]) //.columns[0])
				lineValue = clean(lineValue);
				tdValues.push({lineValue : lineValue, styleClassName : "stocknumber"});
				
				//TODO should be description on the transasction line level, however MEMO doesnt seem to work
				var lineValue = lineItemsToPrint[a].getValue(lineItemsToPrint[a].columns[4]) //.columns[4]) stock desc from item
//				var lineValue = "no wrap test1, no wrap test2, no wrap test3, no wrap test4, no wrap test5, no wrap test6," //.columns[4]) stock desc from item
//				var lineValue = lineItemsToPrint[a].getValue(lineItemsToPrint[a].columns[3]) //.columns[3]) description line from transaction
				lineValue = clean(lineValue);
				tdValues.push({lineValue : lineValue, styleClassName : "description"});
				
				//name: "location", label: "Location" // THIS SHOULD BE GET TEXT
				var lineValue = lineItemsToPrint[a].getText(lineItemsToPrint[a].columns[5])
				lineValue = clean(lineValue);
				tdValues.push({lineValue : lineValue, styleClassName : "stocklocation"});
				
				//{name: "quantity", label: "Quantity"}
				var lineValue = lineItemsToPrint[a].getValue(lineItemsToPrint[a].columns[6]) //.columns[6])
				lineValue = clean(lineValue, true);
				tdValues.push({lineValue : lineValue, styleClassName : "receivedqty"});
				
				//{name: "unitabbreviation", label: "Units"}
				var lineValue = lineItemsToPrint[a].getValue(lineItemsToPrint[a].columns[9]) //.columns[9])
				lineValue = clean(lineValue);
				tdValues.push({lineValue : lineValue, styleClassName : "uom"});
				
				//{name: "rate", label: "Item Rate"}
				var lineValue = lineItemsToPrint[a].getValue(lineItemsToPrint[a].columns[10]) //.columns[10])
				lineValue = clean(lineValue, true);
				tdValues.push({lineValue : lineValue, styleClassName : "itemcost"});
              
              
              	//09092021
              	var lineValue = lineItemsToPrint[a].getValue(lineItemsToPrint[a].columns[18]) //.columns[9])
				lineValue = clean(lineValue);
				tdValues.push({lineValue : lineValue, styleClassName : "workorder"});
				
				var lineValue_raw = lineItemsToPrint[a].getValue(lineItemsToPrint[a].columns[17]) //.columns[10])
				//lineValue = clean(lineValue, true);
				log.debug("lineValue_raw1", lineValue_raw);
				lineValue_raw = lineValue_raw ? JSON.parse(lineValue_raw) : [];
				log.debug("lineValue_raw1", lineValue_raw);
				var lineValue = [];
				if(lineValue_raw && lineValue_raw.length > 0)
				{
					for(var x = 0 ; x < lineValue_raw.length ; x++)
					{
						var requestorMappingObj_target = lineValue_raw[x];
						if(requestorMappingObj[requestorMappingObj_target])
						{
							lineValue.push(requestorMappingObj[requestorMappingObj_target].requestorText || "")
						}
					}
				}
				lineValue = lineValue.join("<br/>");
				tdValues.push({lineValue : lineValue, styleClassName : "requestor"});
				
				for(var b = 0 ; b < tdValues.length ; b++)
				{
					lineItemsToPrintHtml += "<td ";
					if(tdValues[b].styleClassName)
					{
						lineItemsToPrintHtml += "class=" + '"' + tdValues[b].styleClassName + '"';
					}
					lineItemsToPrintHtml += ">";
					lineItemsToPrintHtml += "<p>";
					lineItemsToPrintHtml += tdValues[b].lineValue ? tdValues[b].lineValue : "";

					lineItemsToPrintHtml += "</p>";
					lineItemsToPrintHtml += "</td>"
				}
				
				lineItemsToPrintHtml += "</tr>";
				lineItemsToPrintHtml += "</table>";
				
				lineItemsToPrintHtml += "</td>";
				lineItemsToPrintHtml += "</tr>";
			}
			log.debug("lineItemsToPrintHtml", lineItemsToPrintHtml);
		}
		catch(e)
		{
			log.error("ERROR in function getLineItemsToPrintHtml", e.message);
			log.error("ERROR in function getLineItemsToPrintHtml", e.stack);
		}

		
		lineItemsToPrintHtml += "</table>";
		
		return lineItemsToPrintHtml;
	}
	
	function getLineItemsToPrint(context)
	{
		var transactionSearchObj_SearchResults = [];
		
		transactionSearchObj_columns = [
			search.createColumn({name: "item", label: "Item"}),
		      search.createColumn({
		         name: "itemid",
		         join: "item",
		         label: "Name"
		      }),
		      search.createColumn({
		         name: "displayname",
		         join: "item",
		         label: "Display Name"
		      }),
		      search.createColumn({name: "memo", label: "Memo"}),
		      search.createColumn({
		         name: "stockdescription",
		         join: "item",
		         label: "Stock Description"
		      }),
		      search.createColumn({name: "location", label: "Location"}),
		      search.createColumn({name: "quantity", label: "Quantity"}),
		      search.createColumn({name: "quantityshiprecv", label: "Quantity Fulfilled/Received"}),
		      search.createColumn({name: "unit", label: "Units"}),
		      search.createColumn({name: "unitabbreviation", label: "Units"}),
		      search.createColumn({name: "rate", label: "Item Rate"}),
		      search.createColumn({name: "porate", label: "PO Rate"}),
		      search.createColumn({
		         name: "averagecost",
		         join: "item",
		         label: "Average Cost"
		      }),
		      search.createColumn({name: "line", label: "Line ID"}),
		      search.createColumn({
		         name: "custcol_svb_vend_bill_lineno",
		         sort: search.Sort.ASC,
		         label: "Line #"
		      }),
		      search.createColumn({name: "linesequencenumber", label: "Line Sequence Number"}),
		      search.createColumn({name: "lineuniquekey", label: "Line Unique Key"}),
		      search.createColumn({name: "custcol_010lnkdtrnsctn_crtdfrm"}),
		      search.createColumn({name: "custcol_workorder"})
		]
		
		log.debug("transactionSearchObj_columns", transactionSearchObj_columns)
		
		transactionSearchObj = search.create({
			   type: "transaction",
			   filters:
			   [
			      ["internalidnumber","equalto",context.request.parameters.recId], 
			      "AND", 
			      ["mainline","is","F"], 
			      "AND", 
			      ["taxline","is","F"]
			   ],
			   columns:
			   transactionSearchObj_columns
			});
		
		log.debug("transactionSearchObj", transactionSearchObj)
		
		
		transactionSearchObj_SearchResults = getResults(transactionSearchObj.run());

		
		log.debug("transactionSearchObj_SearchResults", transactionSearchObj_SearchResults)
		
		return transactionSearchObj_SearchResults;
	}
	
	function getReplaceKeys(context)
	{
		var replaceKeys = {}
		try
		{
			var itemreceiptSearchObj = search.create({
				   type: "itemreceipt",
				   filters:
				   [
				      ["type","anyof","ItemRcpt"], 
				      "AND", 
				      ["internalid","is",context.request.parameters.recId],
				      "AND", 
				      ["mainline","is",true]
				   ],
				   columns:
				   [
					   //0
				      search.createColumn({
				         name: "tranid",
				         join: "createdFrom",
				         label: "Document Number"
				      }),
				      //1
				      search.createColumn({name: "mainname", label: "Main Line Name"}),
				      //2
				      search.createColumn({
				         name: "billaddress",
				         join: "vendor",
				         label: "Billing Address"
				      }),
				      //3
				      search.createColumn({
				         name: "billaddress1",
				         join: "vendor",
				         label: "Billing Address 1"
				      }),
				      //4
				      search.createColumn({
				         name: "billaddress2",
				         join: "vendor",
				         label: "Billing Address 2"
				      }),
				      //5
				      search.createColumn({
				         name: "billaddress3",
				         join: "vendor",
				         label: "Billing Address 3"
				      }),
				      //6
				      search.createColumn({
				         name: "billaddressee",
				         join: "vendor",
				         label: "Billing Addressee"
				      }),
				      //7
				      search.createColumn({
				         name: "billattention",
				         join: "vendor",
				         label: "Billing Attention"
				      }),
				      //8
				      search.createColumn({
				         name: "billcity",
				         join: "vendor",
				         label: "Billing City"
				      }),
				      //9
				      search.createColumn({
				         name: "billcountry",
				         join: "vendor",
				         label: "Billing Country"
				      }),
				      //10
				      search.createColumn({
				         name: "billcountrycode",
				         join: "vendor",
				         label: "Billing Country Code"
				      }),
				      //11
				      search.createColumn({
				         name: "billphone",
				         join: "vendor",
				         label: "Billing Phone"
				      }),
				      //12
				      search.createColumn({
				         name: "billstate",
				         join: "vendor",
				         label: "Billing State/Province"
				      }),
				      //13
				      search.createColumn({
				         name: "billzipcode",
				         join: "vendor",
				         label: "Billing Zip"
				      }),
				      //14
				      search.createColumn({
				         name: "formulatext",
				         formula: "'SAMPLE CONTACT(SS)'",
				         label: "Formula (Text)"
				      }),
				      //15
				      search.createColumn({name: "location", label: "Location"}),
				      //16
				      search.createColumn({name: "memo", label: "Memo"}),
				      //17
				      search.createColumn({name: "custbody_010packagetrackingnumber_ir", label: "Package Tracking Number"}),
				      //18
				      search.createColumn({name: "trandate", label: "Date"}),
				      //19
				      search.createColumn({
					         name: "formulatext",
					         formula: "'SAMPLE STATUS(SS)'",
					         label: "Formula (Text)"
					      }),
				      //20
				      search.createColumn({
				         name: "formulatext",
				         formula: "'SAMPLE PO TYPE(SS)'",
				         label: "Formula (Text)"
				      }),
				      //21
				      search.createColumn({
				         name: "trandate",
				         join: "createdFrom",
				         label: "Date"
				      }),
				      //22
				      search.createColumn({
				         name: "duedate",
				         join: "createdFrom",
				         label: "Due Date/Receive By"
				      }),
				      //23
				      search.createColumn({
				         name: "custbody_010promiseddate",
				         join: "createdFrom",
				         label: "PROMISED DATE"
				      }),
				      //24
				      search.createColumn({
				         name: "custbody_010followupdate",
				         join: "createdFrom",
				         label: "FOLLOWUP DATE"
				      }),
				      //25
				      search.createColumn({
				         name: "custbody_010pr_buyer",
				         join: "createdFrom",
				         label: "BUYER"
				      }),
				      //26
				      search.createColumn({
				         name: "formulatext",
				         formula: "{custbody_shipvia}",
				         label: "Formula (Text)"
				      })
				   ]
				});
			
			
			var searchResults = getResults(itemreceiptSearchObj.run());
			
			var contactSearchObj = search.create({
				   type: "contact",
				   filters:
				   [
				      ["transaction.internalidnumber","equalto",context.request.parameters.recId]
				   ],
				   columns:
				   [
				      search.createColumn({
				         name: "entityid",
				         sort: search.Sort.ASC,
				         label: "Name"
				      }),
				      search.createColumn({name: "email", label: "Email"}),
				      search.createColumn({name: "phone", label: "Phone"}),
				      search.createColumn({name: "altphone", label: "Office Phone"}),
				      search.createColumn({name: "fax", label: "Fax"}),
				      search.createColumn({name: "company", label: "Company"}),
				      search.createColumn({name: "altemail", label: "Alt. Email"})
				   ]
				});
			
			var searchResults_contact = getResults(contactSearchObj.run());
			
			var contactsTextList = [];
			if(searchResults_contact && searchResults_contact.length)
			{
				for(var a = 0 ; a < searchResults_contact.length ; a++)
				{
					var buyerName = searchResults_contact[a].getValue({
				         name: "entityid",
				         sort: search.Sort.ASC,
				         label: "Name"
				      })
					contactsTextList.push(buyerName);
				}
			}
			
			var contactTexts = contactsTextList.join(", ");
			
			log.debug("contactTexts", contactTexts);
			
			if(searchResults && searchResults.length > 0 && searchResults[0])
			{
				replaceKeys['<ponumber class="replaceKey"></ponumber>'] = clean(searchResults[0].getValue(itemreceiptSearchObj.columns[0]));
				replaceKeys['<supplier class="replaceKey"></supplier>'] = clean(searchResults[0].getText(itemreceiptSearchObj.columns[1]));
				replaceKeys['<supplieraddress class="replaceKey"></supplieraddress>'] = clean(searchResults[0].getValue(itemreceiptSearchObj.columns[2]));
				replaceKeys['<contact class="replaceKey"></contact>'] = clean(contactTexts);
				replaceKeys['<fobvalue class="replaceKey"></fobvalue>'] = clean(searchResults[0].getText(itemreceiptSearchObj.columns[15]));
				replaceKeys['<explanationvalue class="replaceKey"></explanationvalue>'] = clean(searchResults[0].getValue(itemreceiptSearchObj.columns[16]));
				replaceKeys['<packingslipvalue class="replaceKey"></packingslipvalue>'] = clean(searchResults[0].getValue(itemreceiptSearchObj.columns[17]));
				
				replaceKeys['<receiptdate class="replaceKey"></receiptdate>'] = clean(searchResults[0].getValue(itemreceiptSearchObj.columns[18]));
				replaceKeys['<status class="replaceKey"></status>'] = clean(searchResults[0].getValue(itemreceiptSearchObj.columns[19]));
				replaceKeys['<potype class="replaceKey"></potype>'] = clean(searchResults[0].getValue(itemreceiptSearchObj.columns[20]));
				replaceKeys['<podate class="replaceKey"></podate>'] = clean(searchResults[0].getValue(itemreceiptSearchObj.columns[21]));
				replaceKeys['<requireddate class="replaceKey"></requireddate>'] = clean(searchResults[0].getValue(itemreceiptSearchObj.columns[22]));
				replaceKeys['<promiseddate class="replaceKey"></promiseddate>'] = clean(searchResults[0].getValue(itemreceiptSearchObj.columns[23]));
				replaceKeys['<followupdate class="replaceKey"></followupdate>'] = clean(searchResults[0].getValue(itemreceiptSearchObj.columns[24]));
				
				//TODO what do you want, dedicated field for contacts, or the contacts sublist?
				replaceKeys['<buyervalue class="replaceKey"></buyervalue>'] = clean(searchResults[0].getText(itemreceiptSearchObj.columns[25]));
				
				replaceKeys['<shipvia class="replaceKey"></shipvia>'] = clean(searchResults[0].getValue(itemreceiptSearchObj.columns[26]));
				
				var timeStamp = new Date().getTime();
				var printDate = toMMDDYYYYHHMMSS(timeStamp)
				
				replaceKeys['<custxmlprintdate class="replaceKey"></custxmlprintdate>'] = clean(printDate);
			}
		}
		catch(e)
		{
			log.error("ERROR in fucntion getReplaceKeys", e.message);
		}
		
		return replaceKeys;
	}
	
	function toMMDDYYYYHHMMSS(timeStamp)
	{
//		var formattedDate = format.parse({value:new Date(), type: format.Type.DATETIME});
		
		var formattedDate = format.parse({value:new Date(), type: format.Type.DATETIMETZ, timezone:format.Timezone.AMERICA_DENVER})
		
		//TODO experimenting with format, cleanup variable usage after
		timeStamp = formattedDate;
		log.debug("formattedDate", formattedDate);
		
		var toMMDDYYYYHHMMSS_result = timeStamp;
		try
		{
			//MONTH
			var mm = new Date(timeStamp).getMonth() - 1;
			if(mm < 10)
			{
				mm = "0" + String(mm)
			}
			
			toMMDDYYYYHHMMSS_result = "";
			
			toMMDDYYYYHHMMSS_result += mm + "/";
			//DATE
			var dd = new Date(timeStamp).getDate();
			if(dd < 10)
			{
				dd = "0" + String(dd)
			}
			toMMDDYYYYHHMMSS_result += dd + "/";
			//YEAR
			var yyyy = new Date(timeStamp).getFullYear();
			toMMDDYYYYHHMMSS_result += yyyy

			//SEPARATOR
			toMMDDYYYYHHMMSS_result += " "; 
			
			//HH
			var hh = new Date(timeStamp).getHours();
			if(hh < 10)
			{
				hh = "0" + String(hh)
			}
			toMMDDYYYYHHMMSS_result += hh + ":"
			
			//MM
			var mm = new Date(timeStamp).getMinutes();
			if(hh < 10)
			{
				mm = "0" + String(mm)
			}
			toMMDDYYYYHHMMSS_result += mm + ":"
			
			//SS
			var ss = new Date(timeStamp).getSeconds();
			if(ss < 10)
			{
				ss = "0" + String(ss)
			}
			toMMDDYYYYHHMMSS_result += ss
		}
		catch(e)
		{
			log.error("ERROR in function toMMDDYYYYHHMMSS", e.message);
		}
		return toMMDDYYYYHHMMSS_result
	}
	
	function getRequestorMappingObj(lineItemsToPrint)
	{
		var requisitionRequestorMapping = {};
		var requisitionIdList = [];
		var requestorMappingObj = {};
		for(var a = 0 ; a < lineItemsToPrint.length; a++)
		{
			var lineValue = lineItemsToPrint[a].getValue(lineItemsToPrint[a].columns[17]) //.columns[17]), 13 is array of requisition ids
			var lineValue_json = JSON.parse(lineValue);
			requisitionIdList = requisitionIdList.concat(lineValue_json);
		}
		
		if(requisitionIdList && requisitionIdList.length > 0)
		{
			var tranSearch = search.create({
				type : "transaction",
				filters : [["internalid", "anyof", requisitionIdList], "AND", ["mainline", "is", "T"]],
				columns : [{name : "entity"}]
			});
			
			tranSearch_results = getResults(tranSearch.run());
			
			if(tranSearch_results && tranSearch_results.length > 0)
			{
				for(var a = 0; a < tranSearch_results.length ; a++)
				{
					var resId = tranSearch_results[a].id;
					var resRequestor = tranSearch_results[a].getValue({
						name : "entity"
					});
					var resRequestorText = tranSearch_results[a].getText({
						name : "entity"
					});
					requisitionRequestorMapping[resId] = {requestor : resRequestor};
					requisitionRequestorMapping[resId] = {requestorText : resRequestorText};
				}
			}
		}
		
		return requisitionRequestorMapping;
	}
	
    /**
     * Definition of the Suitelet script trigger point.
     *
     * @param {Object} context
     * @param {ServerRequest} context.request - Encapsulation of the incoming request
     * @param {ServerResponse} context.response - Encapsulation of the Suitelet response
     * @Since 2015.2
     */
    function onRequest(context)
    {
    	var templateFileId = 215623;//SB
    	var templateFileId = 215623;//PROD
    	var templateFileId = './010TMPLT_goodsReceipt.html';//PROD
//    	var templateFileId = 136493;
//    	
//    	var templateFileId = 84207
//    	var templateFileId = 135261
    	var finalXmlStr = "";
    	try
    	{
    		if(context.request.method == "GET")
        	{
            	if(context.request.parameters.recType && context.request.parameters.recId)
            	{
            		var recordObj = record.load({
            			type : context.request.parameters.recType,
            			id : context.request.parameters.recId
            		});
            		var tranIdValue = recordObj.getValue({
            			fieldId : "tranid"
            		})
            		
            		var lineItemsToPrint = getLineItemsToPrint(context);
            		
            		var requestorMappingObj = getRequestorMappingObj(lineItemsToPrint);

            		log.debug("requestorMappingObj", requestorMappingObj);
            		var lineItemsToPrintHtml = getLineItemsToPrintHtml(lineItemsToPrint, requestorMappingObj);
            		
            		log.debug("lineItemsToPrintHtml", lineItemsToPrintHtml);
            		
            		/*var itemSublist_count = recordObj.getLineCount({
            			sublistId : "apply"
            		});
            		
            		var printoutEntries = [];
            		var totalPaymentAmount = 0;
            		for(var a = 0 ; a < itemSublist_count ; a++)
            		{
            			var poLineNo = recordObj.getSublistValue({
            				sublistId : "apply",
            				fieldId : "refnum",
            				line : a
            			})
            			var stockNumber = recordObj.getSublistText({
            				sublistId : "apply",
            				fieldId : "applydate",
            				line : a
            			})
            			var description = recordObj.getSublistValue({
            				sublistId : "apply",
            				fieldId : "amount",
            				line : a
            			})
            			var stockLocation = recordObj.getSublistValue({
            				sublistId : "apply",
            				fieldId : "total",
            				line : a
            			})
            			
            			var receivedQty = recordObj.getSublistValue({
            				sublistId : "apply",
            				fieldId : "total",
            				line : a
            			})
            			
            			var uomId = recordObj.getSublistValue({
            				sublistId : "apply",
            				fieldId : "total",
            				line : a
            			})
            			
            			var uomText = recordObj.getSublistValue({
            				sublistId : "apply",
            				fieldId : "total",
            				line : a
            			})
            			
            			var itemCost = recordObj.getSublistValue({
            				sublistId : "apply",
            				fieldId : "total",
            				line : a
            			})
            			//totalPaymentAmount += Number(refundedTran_total);
            			totalPaymentAmount += Number(refundedTran_amount);
            			var printoutEntryObj = {
            				refundedTran_refnum : refundedTran_refnum,
            				refundedTran_applydate : refundedTran_applydate,
            				refundedTran_amount : addCommas(Number(refundedTran_amount).toFixed(2)),
            				refundedTran_total : addCommas(Number(refundedTran_total).toFixed(2))
            			}
            			printoutEntries.push(printoutEntryObj);
            		}*/
                    
            		var templateFileObj = file.load({
            			id : templateFileId
            		});
            		
            		var replaceKeys = getReplaceKeys(context);
            		
            		var templateFileContents = templateFileObj.getContents();
            		
            		for(var replaceKey in replaceKeys)
            		{
            			templateFileContents = templateFileContents.replace(replaceKey, replaceKeys[replaceKey]);
            		}
            		
            		templateFileContents = templateFileContents.replace("{TABLE_ITEM}", lineItemsToPrintHtml)
//            		templateFileContents = templateFileContents.replace("/{TABLE_ITEM}/g", lineItemsToPrintHtml)
            		log.debug("templateFileContents", templateFileContents);
            		;
            		var barcodeElement = '<barcode bar-width="1" codetype="code128" showtext="true" value="' + tranIdValue + '"></barcode>'
            		
            		templateFileContents = templateFileContents.replace("{GOODSRECEIPTSLIPBARCODE}", barcodeElement)
//            		
            		
            		
            		finalXmlStr += templateFileContents;
            	}
        	}
    	}
    	catch(e)
    	{
    		log.error("ERROR in function onRequest", e.message);
    	}
    	log.debug("context", context);
    	
//    	<?xml version='1.0'?>
//    	<!DOCTYPE pdf PUBLIC '-//big.faceless.org//report' 'report-1.1.dtd'>
//    	<pdf>
//    		<body>
//    	        
//
//    	    </body>
//    	</pdf>
    	
    	
//    	var templateFileObj = file.load({
//			id : templateFileId
//		})
//		var templateFileContents = templateFileObj.getContents();
//		log.debug("templateFileContents", templateFileContents);
//    	
//		finalXmlStr = templateFileContents;
		
    	/*finalXmlStr = "<?xml version='1.0'?>" +
    			"<!DOCTYPE pdf PUBLIC '-//big.faceless.org//report' 'report-1.1.dtd'>" +
    			"<pdf>" +
    			"<body>" +
    			"</body>" +
    			"</pdf>";*/
    	
//    	email.send({
//            author: 99847,
//            recipients: 99847,
//            subject: 'customer refund printout logs',
//            body: finalXmlStr,
//        })
    	
    	var pdf = render.xmlToPdf({
    		xmlString: finalXmlStr
	    });
    	
    	context.response.writeFile({file: pdf, isInline : true})
    }
    
    function companyRecord() {
        var company = config.load({
            type: 'companyinformation'
        });
        log.debug("company", company)
        var ids = ['companyname', 'pagelogo', 'mainaddress_text', 'employerid', 'fax', 'pagelogo', 'phone', 'url', 'email'];
        var obj = {};
        for (var i in ids) {
            obj[ids[i]] = company.getValue(ids[i]) || '';
        }
        // Fields inside address subrecord
        var addressRecord = company.getSubrecord('mainaddress');

        ids = ['country', 'addrphone', 'addrtext', 'addr1'];
        for (var i in ids) {
            obj[ids[i]] = addressRecord.getValue(ids[i]) || '';
        }
        return obj;
    }
    
    var th = ['', 'Thousand', 'Million', 'Billion', 'Trillion'];
    var dg = ['Zero', 'One', 'Two', 'Three', 'Four', 'Five', 'Six', 'Seven', 'Eight', 'Nine'];
    var tn = ['Ten', 'Eleven', 'Twelve', 'Thirteen', 'Fourteen', 'Fifteen', 'Sixteen', 'Seventeen', 'Eighteen', 'Nineteen'];
    var tw = ['Twenty', 'Thirty', 'Forty', 'Fifty', 'Sixty', 'Seventy', 'Eighty', 'Ninety'];

    function toWords(s) {
        s = s.toString();
        s = s.replace(/[\, ]/g, '');
        if (s != parseFloat(s)) return 'not a number';
        var x = s.indexOf('.');
        if (x == -1) x = s.length;
        if (x > 15) return 'too big';
        var n = s.split('');
        var str = '';
        var sk = 0;
        for (var i = 0; i < x; i++) {
            if ((x - i) % 3 == 2) {
                if (n[i] == '1') {
                    str += tn[Number(n[i + 1])] + ' ';
                    i++;
                    sk = 1;
                } else if (n[i] != 0) {
                    str += tw[n[i] - 2] + ' ';
                    sk = 1;
                }
            } else if (n[i] != 0) {
                str += dg[n[i]] + ' ';
                if ((x - i) % 3 == 0) str += 'Hundred ';
                sk = 1;
            }
            if ((x - i) % 3 == 1) {
                if (sk) str += th[(x - i - 1) / 3] + ' ';
                sk = 0;
            }
        }
        if (x != s.length) {
            var y = s.length;
            o = s.substring(x + 1);
            u = parseFloat(o);
            if (o > 0) {
                str += 'and ';
                str += o + "/100";
            }

        }
        str += " Only";
        return str.replace(/\s+/g, ' ');
    }
    
    function getDatacenterUrls() {
        var headers = [];
        headers['Content-Type'] = 'text/xml';
        headers['SOAPAction'] = 'getDataCenterUrls';
        var urls = {
            'webservicesDomain': '',
            'systemDomain': '',
            'restDomain': ''
        }

        var xml = "<soapenv:Envelope xmlns:xsd='http://www.w3.org/2001/XMLSchema' xmlns:xsi='http://www.w3.org/2001/XMLSchema-instance' xmlns:soapenv='http://schemas.xmlsoap.org/soap/envelope/' > <soapenv:Header> </soapenv:Header> <soapenv:Body> <getDataCenterUrls xsi:type='platformMsgs:GetDataCenterUrlsRequest'> <account xsi:type='xsd:string'>" + runtime.accountId + "</account> </getDataCenterUrls> </soapenv:Body> </soapenv:Envelope>";
        /* The variable above was properly escaped and has no line breaks, apparently using the nlapiEscapeXML() does not resolve this because this is declared as a String not an XML type */

        var sUrl = "https://webservices.netsuite.com/services/NetSuitePort_2014_2"
            /* use the latest webservice URL to call the getDataCenterURLs command. */

        resp = https.post({
        	url : sUrl, body : xml, header: headers
        }); // creates and calls the web service request

        log.debug("getDatacenterUrls resp", resp);
        var res = resp.body; // gets the body of the request into XML form

        log.debug("getDatacenterUrls res", res);
        Object.keys(urls).forEach(function(url, index, a) {
            var b = new RegExp('<platformCore:' + url + '>(.*?)<\/platformCore:' + url + '>', 'g')
            if (b.test(res))
                res.match(b).map(function(val) {
                    urls[url] = val.replace(new RegExp('<\/?platformCore:' + url + '>', 'g'), '')
                })
        })
        
        log.debug("getDatacenterUrls urls", urls);
        return urls;
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
    
    function clean(value, comma)
	{
    	try
    	{
    		if(value)
    		{
    			value = value.replace(/&/g, "&amp;");
    			value = value.replace(/\n/g, "<br/>");
    			if(comma)
    			{
    				value = addCommas(value);
    			}
    		}
    	}
    	catch(e)
    	{
    		log.error("ERROR in function clean", e.message);
    	}
		
		return value;
	}
    
    function addCommas(number) {
        if (number) {
          if (Math.floor(number) === number) {
            number += '.00';
          } else {
            number = parseFloat(number).toFixed(2);
          }
          parts = number.toString().split('.');
          parts[0] = parts[0].replace(/\B(?=(\d{3})+(?!\d))/g, ',');
          number = parts.join('.');
          return number;
        } else {
          return '0.00';
        }
      }
    

    return {
        onRequest: onRequest
    };
    
});
