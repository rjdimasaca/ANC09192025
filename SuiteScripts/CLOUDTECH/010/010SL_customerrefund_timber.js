/**
 * @NApiVersion 2.x
 * @NScriptType Suitelet
 * @NModuleScope SameAccount
 */
define(['N/record', 'N/file', 'N/render', 'N/config', 'N/email', 'N/search', 'N/runtime', 'N/https'],

function(record, file, render, config, email, search, runtime, https) {
   
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
	
	var addCommas = function (number) {
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
        //010TMPLT_customerrefund_timber.html
    	var templateFileId = 217233;//SB
    	var templateFileId = 217233;//PROD
    	
    	
    	var templateFileId = "./010TMPLT_customerrefund_timber.html"; //010TMPLT_customerrefund_timber.html
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
            		var replaceKeys = {};
            		var recordObj = record.load({
            			type : context.request.parameters.recType,
            			id : context.request.parameters.recId
            		});
            		//different template if Timber subsidiary
            		var subsidiaryId = recordObj.getValue({
            		    fieldId : "subsidiary"
            		})
            		
            		var applySublist_count = recordObj.getLineCount({
            			sublistId : "apply"
            		});
            		
            		var printoutEntries = [];
            		var totalPaymentAmount = 0;
            		for(var a = 0 ; a < applySublist_count ; a++)
            		{
            			var refundedTran_refnum = recordObj.getSublistValue({
            				sublistId : "apply",
            				fieldId : "refnum",
            				line : a
            			})
            			var refundedTran_applydate = recordObj.getSublistText({
            				sublistId : "apply",
            				fieldId : "applydate",
            				line : a
            			})
            			var refundedTran_amount = recordObj.getSublistValue({
            				sublistId : "apply",
            				fieldId : "amount",
            				line : a
            			})
                        var refundedTran_discamount = recordObj.getSublistValue({
                            sublistId : "apply",
                            fieldId : "discamount",
                            line : a
                        })
            			var refundedTran_total = recordObj.getSublistValue({
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
            		}
            		log.debug("printoutEntries", printoutEntries);
            		
            		lineContents = "";
            		for(var a = 0 ; a < printoutEntries.length ; a++)
            		{
            			lineContents += "<tr>";

            			lineContents += "<td align='center' class='lineContents'>" +
            					"" + printoutEntries[a].refundedTran_applydate + "" +
    							"</td>";


            			lineContents += "<td align='center' class='lineContents'>" +
            					"" + printoutEntries[a].refundedTran_refnum + "" +
    							"</td>";

            			lineContents += "<td align='right' class='lineContents'>" +
            					"" + printoutEntries[a].refundedTran_total + "" +
            							"</td>";

            			lineContents += "<td align='right' class='lineContents'>" +
            					"" + printoutEntries[a].refundedTran_amount + "" +
            							"</td>";

            			lineContents += "</tr>";
            		}
            		
            		//from record
            		var tranDateText = recordObj.getText({
            			fieldId : "trandate"
            		});
            		replaceKeys.checkDate = tranDateText
            		
            		replaceKeys.checkDateYYYYMMDD = formatDateYYYYMMDD(tranDateText);
            		
            		var vendorNo = search.lookupFields({
            			type : "customer",
            			id : recordObj.getValue({fieldId : "customer"}),
            			columns : ["entityid"]
            		}).entityid
            		
            		replaceKeys.vendorNo = vendorNo
            		
            		replaceKeys.vendorText = recordObj.getText({
            			fieldId : "customer"
            		})
            		
            		replaceKeys.checkNo = recordObj.getValue({
            			fieldId : "tranid"
            		})
            		
            		//if no tranid get transactionnumber
            		if(!replaceKeys.checkNo)
            		{
            			replaceKeys.checkNo = recordObj.getValue({
                			fieldId : "transactionnumber"
                		})
            		}
            		
            		replaceKeys.payToTheOrderOfText = recordObj.getText({
            			fieldId : "customer"
            		})
            		
            		replaceKeys.payToAddressText = recordObj.getValue({
            			fieldId : "address"
            		})
            		
            		var accountId = recordObj.getValue({
            			fieldId : "account"
            		})
            		var accountText = "{account}";
            		if(accountId)
            		{
            			var accountObj = record.load({
                			type : "account",
                			id : accountId
                		})
                		if(accountObj)
                		{
                			accountText = accountObj.getValue({
                				fieldId : "acctname"
                			})
                		}
            		}
            		
            		replaceKeys.accountText = accountText;

            		var currencySymbol = "";
            		var currencyFundsText = "";
            		var currencyId = recordObj.getValue({
            			fieldId : "currency"
            		})
            		if(currencyId == 1 || currencyId == "1")
            		{
            			currencyFundsText = "Canadian Funds";
            			currencySymbol = "C$";
            		}
            		else if(currencyId == 2 || currencyId == "2")
            		{
            			currencyFundsText = "US Dollars";
            			currencySymbol = "$";
            		}
            		else if(currencyId == 3 || currencyId == "3")
            		{
            			currencyFundsText = "GBP Funds";
            		}
            		else if(currencyId == 4 || currencyId == "4")
            		{
            			currencyFundsText = "Euro Funds";
            		}
            		else if(currencyId == 5 || currencyId == "5")
            		{
            			currencyFundsText = "Swiss Franc";
            		}
            		else if(currencyId == 6 || currencyId == "6")
            		{
            			currencyFundsText = "Swedish Krona";
            		}
            		
            		replaceKeys.currencyFundsText = currencyFundsText;
            		replaceKeys.currencySymbol = currencySymbol;
            		
//            		replaceKeys.payToAddressText = recordObj.getValue({
//            			fieldId : "address"
//            		})
            		
            		replaceKeys.totalAmount = addCommas(totalPaymentAmount)
            		replaceKeys.totalAmountInWordsCaps = addSpacers(toWords(totalPaymentAmount).toUpperCase())
            		//from company information
            		var companyObj = companyRecord();
                    log.debug('COMPANY_INFO', JSON.stringify(companyObj));

//            		var logoUrl = "https://1116623-sb1.app.netsuite.com/core/media/media.nl?id=2146&c=1116623_SB1&h=5075cf7dc56ad7ed0ccc";
//            		var logoUrl = "/core/media/media.nl?id=2146&c=1116623_SB1&h=5075cf7dc56ad7ed0ccc&expurl=T";
//            		var logoUrl = "/core/media/media.nl?id=2146&c=1116623_SB1&h=5075cf7dc56ad7ed0ccc";
//            		var logoUrl = "1116623.app.netsuite.com/core/media/media.nl?id=2146&c=1116623&h=a2be42823de94e11fae6";
//            		var logoUrl = "/core/media/media.nl?id=2146&c=1116623&h=a2be42823de94e11fae6";
//            		var logoUrl = "https://1116623-sb1.app.netsuite.com/core/media/media.nl?id=2146&c=1116623_SB1&h=5075cf7dc56ad7ed0ccc";
//            		var logoUrl = "/images/logos/netsuite-oracle.svg";
//            		var logoUrl = 'https://ecotoxcan.ca/media/LOGO-Alberta-Newsprint-Company-Colour.bmp';
//            		/core/media/media.nl?id=2146&c=1116623&h=a2be42823de94e11fae6
//                    
//                    var accountUrls = getDatacenterUrls();
//                    log.debug("accountUrls", accountUrls);
//                    
//                    accountUrls.systemDomain = "1116623.app.netsuite.com"
                    
                    log.debug("companyObj.pagelogo", companyObj.pagelogo);
                    
                    var logoFileObj = file.load({
                        id: companyObj.pagelogo
                    })
                    
                    var logoFileObj_url = logoFileObj.url.replace(/&/g, '&amp;');

//                    logoFileObj_url = '/images/branding/googlelogo/2x/googlelogo_color_272x92dp.png'
//                    logoFileObj_url = 'https://upload.wikimedia.org/wikipedia/commons/f/f9/Phoenicopterus_ruber_in_S%C3%A3o_Paulo_Zoo.jpg';
//                    logoFileObj_url = 'https://ecotoxcan.ca/media/LOGO-Alberta-Newsprint-Company-Colour.bmp';
                    
                    log.debug("logoFileObj_url", logoFileObj_url);
                    var img_logoUrl = '<img src="' +
                    logoFileObj_url +
                    '" height="35px" width="100px" />'

                    log.debug("img_logoUrl", img_logoUrl);
                    
            		var templateFileObj = file.load({
            			id : templateFileId
            		})
            		var templateFileContents = templateFileObj.getContents();
            		templateFileContents = templateFileContents.replace("/{lineContents}/g", lineContents)
            		log.debug("templateFileContents", templateFileContents);
            		
//            		/core/media/media.nl?id=2146&c=1116623&h=a2be42823de94e11fae6
            		companyObj.mainaddress_text = companyObj.mainaddress_text.replace(/\r\n/g, "<br/>")
            		
//            		Alberta News Print Company<br />
//              Postal Bag 9000<br />
//				Whitecourt AB T7S 1P9<br />
//				Canada<br />
            		
            		var custbody_pdfaccountnumber = recordObj.getValue({
            			fieldId : "custbody_pdfaccountnumber"
            		})
            		var custbody_pdfroutenumber = recordObj.getValue({
            			fieldId : "custbody_pdfroutenumber"
            		})
            		var custbody_pdfbanknumber = recordObj.getValue({
            			fieldId : "custbody_pdfbanknumber"
            		})
            		
            		//override checkDateYYYYMMDD
            		var custbody_pdfdate = recordObj.getValue({
            			fieldId : "custbody_pdfdate"
            		})
            		
            		replaceKeys.checkDateYYYYMMDD = custbody_pdfdate;
            		
            		replaceKeys.leadingZeroesBasedOnTranId = getLeadingZeroesBasedOnTranId(replaceKeys.checkNo);
            		
            		replaceKeys.custbody_pdfaccountnumber = custbody_pdfaccountnumber;
            		replaceKeys.custbody_pdfbanknumber = custbody_pdfbanknumber;
            		replaceKeys.custbody_pdfroutenumber = custbody_pdfroutenumber;
            		replaceKeys.configCompanyName = companyObj.companyname;
            		replaceKeys.configCompanyAddress = companyObj.mainaddress_text;
            		
            		replaceKeys.configCompanyLogo = logoFileObj_url;
            		replaceKeys.img_logoUrl = img_logoUrl;
            		replaceKeys.lineContents = lineContents;
            		
            		for(var replaceKey in replaceKeys)
            		{
            			while(templateFileContents.indexOf("{" + replaceKey + "}") > -1)
            			{
            				templateFileContents = templateFileContents.replace("{" + replaceKey + "}", replaceKeys[replaceKey]);
            			}
            		}
            		
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
    	
    	
//    	finalXmlStr = "<?xml version='1.0'?>" +
//    			"<!DOCTYPE pdf PUBLIC '-//big.faceless.org//report' 'report-1.1.dtd'>" +
//    			"<pdf>" +
//    			"<body>" +
//    			"</body>" +
//    			"</pdf>";
    	
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
        
        company = record.load({
            type : "subsidiary",
            id : 2
        })
        
        log.debug("company", company)
        var ids = ['companyname', 'pagelogo', 'mainaddress_text', 'employerid', 'fax', 'pagelogo', 'phone', 'url', 'email', 'name'];
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
        
        obj.companyname = obj.name;
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
    
    function addSpacers(targetStr, spacerChar)
    {
    	var strWithSpacer = targetStr;
    	try
    	{
    		if(strWithSpacer.length<=10)
    		{
    			strWithSpacer += "********************************************************************";
    		}
    		else if(strWithSpacer.length>10 && strWithSpacer.length<=20)
    		{
    			strWithSpacer += "****************************************************************";
    		}
    		else if(strWithSpacer.length>20 && strWithSpacer.length<=30)
    		{
    			strWithSpacer += "******************************************************";
    		}
    		else if(strWithSpacer.length>30 && strWithSpacer.length<=40)
    		{
    			strWithSpacer += "********************************************";
    		}
    		else if(strWithSpacer.length>40 && strWithSpacer.length<=60)
    		{
    			strWithSpacer += "**********************************";
    		}

    		else if(strWithSpacer.length>60 && strWithSpacer.length<=70)
    		{
    			strWithSpacer += "***********************";
    		}
    		else if(strWithSpacer.length>70)
    		{
    			strWithSpacer += "*************";
    		}
    		
    		
    	}
    	catch(e)
    	{
    		log.debug("ERROR in function addSpacers", e.message);
    	}
    	
    	return strWithSpacer;
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
    
    function getLeadingZeroesBasedOnTranId(tranId)
	{
    	var tranId = tranId;
		if(tranId.length>=10)
			tranId = tranId;
        else if(tranId.length==9)
        	tranId = "0" + tranId;
        else if(tranId.length==8)
        	tranId = "00" + tranId;
        else if(tranId.length==7)
        	tranId = "0" + tranId;
        else if(tranId.length==6)
        	tranId = "000" + tranId;
        else if(tranId.length==5)
        	tranId = "0000" + tranId;
        else if(tranId.length==4)
        	tranId = "00000" + tranId;
        else if(tranId.length==3)
        	tranId = "0000000" + tranId;
        else if(tranId.length==2)
        	tranId = "00000000" + tranId;
        else if(tranId.length==1)
        	tranId = "000000000" + tranId;
        return tranId;
	}

    return {
        onRequest: onRequest
    };
    
});
