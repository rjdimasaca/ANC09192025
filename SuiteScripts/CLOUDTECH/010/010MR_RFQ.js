/**
 * @NApiVersion 2.x
 * @NScriptType MapReduceScript
 * @NModuleScope SameAccount
 */

/**
 * 07012021 - update 010MR_RFQ.js
so that it stores the pdf file suffix on the RFQ Message History record.
The RFQ Message History Record can now be treated as an RFQ Record, it having it's unique identifier that makes sense
updated the custom view to display the identifier.
updated script so dat the default pdf file name does not have colon : which was forced down into an underscore, causing the file name to be on format ANC REQUEST FOR QUOTE_1625536898833 instead of ANC REQUEST FOR QUOTE _ 1625536898833 notice the space before and after the underscore.

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
        var fileObj = script.getParameter({ name: 'custscript_010mr_rfq_payloadfileid'});
        //log.debug("TC10RODfileObj", fileObj);
        fileObj = JSON.parse(fileObj)
        var fileId = fileObj.fileId;
        var filePath = fileObj.filePath;
        //log.debug("TC10RODfileId", fileId);
        if(fileId)
        {
        	var fileObj = file.load({
            	id :fileId, 
//            	id :filePath 
            })
            var fileContents = fileObj.getContents();
        	//log.debug("TC10RODfileContents", fileContents);
            data = JSON.parse(fileContents)
            //log.debug("TC10RODdata1", data);
//            data = data.length ? JSON.parse(data) : [];
            //log.debug("TC10RODdata2", data);
            
            var deletedFileId = file.delete({
            	id: fileId
            });
            log.debug("TC10RODdeletedFileId", deletedFileId);
        }
        log.audit('getData INPUT_DATA', JSON.stringify(data));
//        data.linesToProcess = _.groupBy(data.linesToProcess, 'custpage_prvendor')
        
        data.linesToProcess = splitVendors(data.linesToProcess);
        log.debug("data.linesToProcess after splitVendors", data.linesToProcess);
        return data.linesToProcess;
    }
    
    function splitVendors(linesToProcess)
    {
    	var linesToProcess_grouped = [];
    	try
    	{

			log.debug("splitVendors linesToProcess", linesToProcess);
    		for(var a = 0 ; a < linesToProcess.length ; a++)
    		{
    			var vendorIds = linesToProcess[a].custpage_prvendorid.value;
    			//just in case we got rougue whitespaces
    			vendorIds = vendorIds.trim();
    			log.debug("splitVendors vendorIds", vendorIds);
    			if(vendorIds)
    			{
    				vendorIdsList = vendorIds.split(",");

        			log.debug("splitVendors vendorIdsList", vendorIdsList);
    				for(var b = 0 ; b < vendorIdsList.length ; b++)
    				{
    					var singleVendorId = vendorIdsList[b];
    					log.debug("singleVendorId", singleVendorId);
    					var linesToProcessEntry = JSON.parse(JSON.stringify(linesToProcess[a]))
    					linesToProcessEntry["singleVendorId"] = singleVendorId; //this is the key that will group per vendor
    					linesToProcess_grouped.push(linesToProcessEntry)
    				}
    			}
    		}
    	}
    	catch(e)
    	{
    		log.error("ERROR in function splitVendors", e.message);
    	}
    	return linesToProcess_grouped
    }

    /**
     * Executes when the map entry point is triggered and applies to each key/value pair.
     *
     * @param {MapSummary} context - Data collection containing the key/value pairs to process through the map stage
     * @since 2015.1
     */
    function map(context) {
//    	try
//    	{
//    		log.debug("map context", context);
//        	
//    		var fileObj = file.load({
//    			id : 186595
//    		})
//    		
//    		var finalXmlStr = fileObj.getContents();
//    		
////    		var finalXmlStr = '';
////        	finalXmlStr += '<?xml version="1.0"?>';
////        	finalXmlStr += '<!DOCTYPE pdf PUBLIC "-//big.faceless.org//report" "report-1.1.dtd">';
////        	finalXmlStr += '<pdf>';
////        	finalXmlStr += '<head><body><div>';
////        	finalXmlStr += 'RODMAR TEST PDF VIA MAPREDUCE';
////        	finalXmlStr += '</div></body></head>';
////        	finalXmlStr += '</pdf>';
//        	
//        	log.debug("finalXmlStr", finalXmlStr);
//        	
//        	var pdf = render.xmlToPdf({
//        		xmlString: finalXmlStr
//    	    });
//        	
//
//        	log.debug("pdf", pdf);
//        	
//        	pdf.name = "RODMAR TEST PDF VIA MAPREDUCE " + new Date().getTime();
//        	pdf.folder = 11457; //SuiteScripts > CLOUDTECH > 010
//        	var fileId = pdf.save();
//        	log.debug("fileId", fileId);
//    	}
//    	catch(e)
//    	{
//    		log.error("ERROR in function map", e.message);
//    	}
    	
    	log.debug("map context", context);
    	
    	for(var key in context)
    	{
    		log.debug("key in context : " + key, context[key])
    		
    		if(key=="value")
    		{
    			log.debug("custpage_princlude in context['value']", context[key].custpage_princlude)
    			log.debug("custpage_princlude in context['value']", JSON.parse(context[key])["custpage_princlude"])
    		}
    		
    	}
    	
    	var data = JSON.parse(context['value']);
    	
    	log.debug('data', data);
    	log.debug('data.custpage_prvendorid', data.custpage_prvendor);
    	context.write({
//    		key: (data["custpage_prvendorid"] ? data["custpage_prvendorid"].value : "") + '_' + (data["custpage_prnumber"] ? data["custpage_prnumber"].value : "")/* + '_' + (data.custpage_pritemid || "")*/,
    		key: (data["singleVendorId"] ? data["singleVendorId"] : ""),
    	    value: data
    	});
    	
    }

    /**
     * Executes when the reduce entry point is triggered and applies to each group.
     *
     * @param {ReduceSummary} context - Data collection containing the groups to process through the reduce stage
     * @since 2015.1
     */
    function reduce(context)
    {
    	try
    	{
        	log.debug("reduce context", context);
        	var configDetails = getConfigDetails(context);
        	var pdfFile = generatePdf_sendEmail(context, configDetails);
    	}
    	catch(e)
    	{
    		log.error("ERROR in function reduce", e.message);
    	}
    }
    
    function getConfigDetails(context)
    {
    	var configDetails = {};
    	try
    	{
    		var companyInfo = config.load({
                type: config.Type.COMPANY_INFORMATION
            });
    		configDetails.pagelogo_file = companyInfo.getValue({fieldId : "pagelogo"});
    		configDetails.companyname = companyInfo.getValue({fieldId : "companyname"});
    		configDetails.companyaddress = companyInfo.getValue({fieldId : "mainaddress_text"});
    		
    		
    		var logoFileObj = file.load({
                id: configDetails.pagelogo_file
            })
            
            var logoFileObj_url = logoFileObj.url.replace(/&/g, '&amp;');

    		configDetails.pagelogo_url = logoFileObj_url;
    		
    	}
    	catch(e)
    	{
    		log.error("ERROR in function getConfigDetails", e.message);
    	}
    	
    	log.debug("configDetails", configDetails);
    	return configDetails
    }

    function generatePdf_sendEmail(context, configDetails)
    {
    	try
    	{
          
    		var vendorId = context["key"];
    		var buildLineContents_output = buildLineContents(context, vendorId);
    		var lineContents = buildLineContents_output.lineContents;
    		log.debug("lineContents", lineContents);
    		/*var fileObj = file.load({
			id : 186595 //010TMPLT_RFQ_PDF.html
			})*/
            //09092021
            var fileObj = file.load({
				id : "./010TMPLT_RFQ_PDF.html" //010TMPLT_RFQ_PDF.html
			})
            
			
			var fileObj_contents = fileObj.getContents();
			

    		log.debug("fileObj_contents orig", fileObj_contents);
    		
    		var vendorLookup = search.lookupFields({
    			type : "vendor",
    			id : vendorId,
    			columns : ["entityid"]
    		})
			fileObj_contents = fileObj_contents.replace("<Supplier></Supplier>", "" + vendorLookup.entityid)
			fileObj_contents = fileObj_contents.replace("<RequestedBy></RequestedBy>", "" + runtime.getCurrentUser().name)
			fileObj_contents = fileObj_contents.replace("<REQUESTFORQUOTEDATE></REQUESTFORQUOTEDATE>", "" + formatDateMMDDYYYY(new Date()))
			
			fileObj_contents = fileObj_contents.replace("{configCompanyLogo}", "" + configDetails.pagelogo_url)
			fileObj_contents = fileObj_contents.replace("{configCompanyName}", "" + configDetails.companyname)
			fileObj_contents = fileObj_contents.replace("{configCompanyAddress}", ("" + configDetails.companyaddress).replace(/\r\n/g, "<br/>"))
    		fileObj_contents = fileObj_contents.replace("{rfqDate}", formatDateMMDDYYYY(new Date())) //date today
    		
    		fileObj_contents = fileObj_contents.replace("{lineContents}", lineContents)
    		
    		log.debug("fileObj_contents after lineContents", fileObj_contents);
    		
//    		var debugFile = file.create({
//    		    name: 'test' + new Date().getTime() + '.txt',
////    		    fileType: file.Type.PLAINTEXT,
//    		    fileType: file.Type.HTMLDOC,
//    		    contents: fileObj_contents,
//    		    description: 'This is a plain text file.',
//    		    encoding: file.Encoding.UTF8,
//    		    folder: 22463,
//    		    isOnline: true
//    		});
//    		
//    		var debugFileId = debugFile.save();
//    		log.debug("debugFile", debugFile);
    		
			var finalXmlStr = fileObj_contents;
			
	//		var finalXmlStr = '';
	//    	finalXmlStr += '<?xml version="1.0"?>';
	//    	finalXmlStr += '<!DOCTYPE pdf PUBLIC "-//big.faceless.org//report" "report-1.1.dtd">';
	//    	finalXmlStr += '<pdf>';
	//    	finalXmlStr += '<head><body><div>';
	//    	finalXmlStr += 'RODMAR TEST PDF VIA MAPREDUCE';
	//    	finalXmlStr += '</div></body></head>';
	//    	finalXmlStr += '</pdf>';
	    	
	    	log.debug("finalXmlStr", finalXmlStr);
	    	
	    	var pdfFile = render.xmlToPdf({
	    		xmlString: finalXmlStr
		    });
	
	    	log.debug("pdfFile", pdfFile);
	    	
	    	var file_timeStamp = new Date().getTime();
	    	pdfFile.name = "ANC REQUEST FOR QUOTE_"/* + vendorLookup.entityid + "_"*/ + file_timeStamp;
//	    	pdfFile.folder = 11457; //SuiteScripts > CLOUDTECH > 010
	    	/*pdfFile.folder = 22463; //SuiteScripts > CLOUDTECH > 010 RFQ Payload
*/	    	fileObj.folder = 157938; //SuiteScripts > CLOUDTECH > 010 RFQ Payload //prod
//	    	var fileId = pdfFile.save();
//	    	log.debug("fileId", fileId);
	    	
	    	//send email
	    	
	    	var emailBody = "";
	    	var emailSubject = "";
	    	
	    	var runtime_currentUser = runtime.getCurrentUser();
	    	
	    	emailBody = "Good day," +
	    			"<br/>This is " + runtime_currentUser.name + " of Alberta Newsprint." +
	    					"<br/>Please see attached file."
	    	emailSubject = "Request For Quote";
	    	var emailObj = {
		    	    author: runtime_currentUser.id,
		    	    recipients: vendorId,
		    	    subject: emailSubject,
		    	    body: emailBody,
		    	    attachments: [pdfFile],
		    	    //TODO not working for PR, PR has no EMAIL CAPABILITY, thus customrecord_010pr_rfq_msghistory
//		    	    relatedRecords: {
//		    	           entityId: vendorId,
//		    	           transactionId:"34497175"
//		    	      }
		    	}
	    	
	    	var success = false;
	    	try
	    	{
	    		email.send(emailObj);
	    		success = true;
	    	}
	    	catch(e)
	    	{
	    		log.error("ERROR in sending Email : emailObj :", emailObj)
	    	}
	    	
	    	log.debug("emailObj", emailObj);
	    	
	    	//CREATE MSG HISTORY CUSTOM RECORD
	    	createEmailHistory(vendorId, emailSubject, emailBody, buildLineContents_output.transactionIds, pdfFile.name, success, file_timeStamp);
	    	
    	}
    	catch(e)
    	{
    		log.error("ERROR in function generatePdf_sendEmail", e);
    	}
    	
    	return pdfFile;
    }
    
    //DEPRECATED
    function createEmailHistory_withRetries(vendorId, emailSubject, emailBody, transactionIds, pdfFile_name, success)
    {
    	var remainingCreateRecordAttempt = 3;
    	var rfqHistoryRecord_submittedId = "";
    	var runtime_currentUser = runtime.getCurrentUser();
    	while(remainingCreateRecordAttempt > 0 && !rfqHistoryRecord_submittedId)
    	{
    		log.debug("ATTEMPT", remainingCreateRecordAttempt)
    		try
        	{
        		var rfqHistoryRecord = record.create({
            		type : "customrecord_010pr_rfq_msghistory",
            	});
            	
            	rfqHistoryRecord.setValue({
            		fieldId : "custrecord_010pr_rfq_msghstry_vndr",
            		value : vendorId
            	})
            	rfqHistoryRecord.setValue({
            		fieldId : "custrecord_010pr_rfq_msghstry_sndr",
            		value : runtime_currentUser.id
            	})
            	rfqHistoryRecord.setValue({
            		fieldId : "custrecord_010pr_rfq_msghstry_subject",
            		value : emailSubject
            	})
            	rfqHistoryRecord.setValue({
            		fieldId : "custrecord_010pr_rfq_msghstry_emailbody",
            		value : emailBody
            	})
            	
            	rfqHistoryRecord.setValue({
            		fieldId : "custrecord_010pr_rfq_tranref",
            		value : transactionIds
            	})
            	
            	if(!success)
            	{
            		rfqHistoryRecord.setValue({
                		fieldId : "custrecord_010pr_rfq_notes",
                		value : "Email sending failed, please check the vendor's email address"
                	})
            	}
            	else
            	{
            		var rfqFileAttachment = "";
                	var rfqFileAttachmentSearchObj = search.create({
                		type : "file",
                		filters : [
                			["name", "is", pdfFile_name],
                			],
                	})
                	
                	rfqFileAttachmentSearchObj.run().each(function(res){
                		log.debug("res", res);
                		rfqFileAttachment = res.id;
                	});
                	
                	log.debug("rfqFileAttachment", rfqFileAttachment);
                	
                	var baseFileObjUrl = "/app/common/media/mediaitem.nl?id=";
        	    	baseFileObjUrl += rfqFileAttachment;
        	    	
        	    	
        	    	var baseFileObjUrl = file.load({
        	    		id : rfqFileAttachment
        	    	}).url
                	
                	rfqHistoryRecord.setValue({
                		fieldId : "custrecord_010pr_rfq_filelink",
                		value : baseFileObjUrl
                	})
            		
            		
            		rfqHistoryRecord.setValue({
                		fieldId : "custrecord_010pr_rfq_notes",
                		value : "Email sent successfully!"
                	})
            	}
            	
            	//TC10ROD some files are not applicable to the field, workaround, link to the file cabinet instead
            	// we dont want to store a copy of it, we need to stick with the original attachment to save space
            	//this can be enhanced to use the FILE URL instead
    	    	rfqHistoryRecord_submittedId = rfqHistoryRecord.save();
    	    	log.debug("rfqHistoryRecord_submittedId", rfqHistoryRecord_submittedId);
    	    	
//    	    	rfqHistoryRecord.setValue({
//    	    		fieldId : "custrecord_rfq_msghstry_attachment",
//    	    		value : rfqFileAttachment
//    	    	})
//    	    	log.debug("rfqHistoryRecord.getValue(custrecord_rfq_msghstry_attachment)", rfqHistoryRecord.getValue({fieldId : "custrecord_rfq_msghstry_attachment"}));
//    	    	log.debug("did u set the field?", rfqHistoryRecord_submittedId);
        	}
        	catch(e)
        	{
        		remainingCreateRecordAttempt--;
        		log.error("ERROR in filling custrecord_rfq_msghstry_attachment", e.message)
        	}
        	
//        	if(rfqHistoryRecord_submittedId && rfqFileAttachment)
//        	{
//        		record.submitFields({
//        			type : "customrecord_010pr_rfq_msghistory",
//        			id : rfqHistoryRecord_submittedId,
//        			values : {custrecord_rfq_msghstry_attachment : rfqFileAttachment}
//        		})
//        	}
    	} 
    }
    
    function createEmailHistory(vendorId, emailSubject, emailBody, transactionIds, pdfFile_name, success, file_timeStamp)
    {
    	var rfqHistoryRecord_submittedId = "";
    	var runtime_currentUser = runtime.getCurrentUser();
    	
    	try
    	{
    		var rfqHistoryRecord = record.create({
        		type : "customrecord_010pr_rfq_msghistory",
        	});
    		if(file_timeStamp)
    		{
    		    try
    		    {
    		        rfqHistoryRecord.setValue({
                        fieldId : "name",
                        value : "" + file_timeStamp
                    })
    		    }
    		    catch(e)
    		    {
    		        log.error("ERROR setting rfqmessage timestamp as id", e)
    		    }
    		}
        	rfqHistoryRecord.setValue({
        		fieldId : "custrecord_010pr_rfq_msghstry_vndr",
        		value : vendorId
        	})
        	rfqHistoryRecord.setValue({
        		fieldId : "custrecord_010pr_rfq_msghstry_sndr",
        		value : runtime_currentUser.id
        	})
        	rfqHistoryRecord.setValue({
        		fieldId : "custrecord_010pr_rfq_msghstry_subject",
        		value : emailSubject
        	})
        	rfqHistoryRecord.setValue({
        		fieldId : "custrecord_010pr_rfq_msghstry_emailbody",
        		value : emailBody
        	})
        	
        	rfqHistoryRecord.setValue({
        		fieldId : "custrecord_010pr_rfq_tranref",
        		value : transactionIds
        	});
        	
        	if(!success)
        	{
        		rfqHistoryRecord.setValue({
            		fieldId : "custrecord_010pr_rfq_notes",
            		value : "Email sending failed, please check the records involved."
            	})
        	}
        	else
        	{
        		var rfqFileAttachment = "";
            	var rfqFileAttachmentSearchObj = search.create({
            		type : "file",
            		filters : [
            			["name", "is", pdfFile_name],
            			],
            	})
            	
            	rfqFileAttachmentSearchObj.run().each(function(res){
            		log.debug("res", res);
            		rfqFileAttachment = res.id;
            	});
            	
            	log.debug("rfqFileAttachment", rfqFileAttachment);
            	
            	var baseFileObjUrl = "/app/common/media/mediaitem.nl?id=";
    	    	baseFileObjUrl += rfqFileAttachment;
    	    	
    	    	
    	    	var baseFileObjUrl = file.load({
    	    		id : rfqFileAttachment
    	    	}).url
            	
            	rfqHistoryRecord.setValue({
            		fieldId : "custrecord_010pr_rfq_filelink",
            		value : baseFileObjUrl
            	})
        		
        		
        		rfqHistoryRecord.setValue({
            		fieldId : "custrecord_010pr_rfq_notes",
            		value : "Email sent successfully!"
            	})
        	}
        	
        	//TC10ROD some files are not applicable to the field, workaround, link to the file cabinet instead
        	// we dont want to store a copy of it, we need to stick with the original attachment to save space
        	//this can be enhanced to use the FILE URL instead
	    	rfqHistoryRecord_submittedId = rfqHistoryRecord.save();
	    	log.debug("rfqHistoryRecord_submittedId", rfqHistoryRecord_submittedId);
	    	
//	    	rfqHistoryRecord.setValue({
//	    		fieldId : "custrecord_rfq_msghstry_attachment",
//	    		value : rfqFileAttachment
//	    	})
//	    	log.debug("rfqHistoryRecord.getValue(custrecord_rfq_msghstry_attachment)", rfqHistoryRecord.getValue({fieldId : "custrecord_rfq_msghstry_attachment"}));
//	    	log.debug("did u set the field?", rfqHistoryRecord_submittedId);
    	}
    	catch(e)
    	{
    		var rfqHistoryRecord = record.create({
        		type : "customrecord_010pr_rfq_msghistory",
        	});
    		rfqHistoryRecord.setValue({
        		fieldId : "custrecord_010pr_rfq_msghstry_subject",
        		value : emailSubject
        	})
        	rfqHistoryRecord.setValue({
        		fieldId : "custrecord_010pr_rfq_msghstry_emailbody",
        		value : emailBody
        	})
        	if(!success)
        	{
        		rfqHistoryRecord.setValue({
            		fieldId : "custrecord_010pr_rfq_notes",
            		value : "Email sending failed, please check records involved."
            	})
        	}
    		rfqHistoryRecord.setValue({
        		fieldId : "custrecord_010pr_rfq_tranref",
        		value : transactionIds
        	});
    		rfqHistoryRecord_submittedId = rfqHistoryRecord.save();
    		log.debug("rfqHistoryRecord_submittedId", rfqHistoryRecord_submittedId);
	    	
    		log.error("ERROR in function createEmailHistory", e.message)
    	}
    	
    }
    
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
    
    function buildLineContents(context, poVendor)
    {
    	var functionResult = {};
    	var lineContents = "";
    	var transactionIds = [];
    	try
    	{
    		var vendorInternalid = context.key;
    		var data = context.values;
    		
    		for(var a = 0 ; a < data.length ; a++)
    		{
    			var data_entry = data[a];
    			log.debug("data_entry", data_entry);
    			data_entry.replace("'", "Ã¯Â¿Â½");
    			log.debug("data_entry.length", data_entry.length);
    			data_entry = JSON.parse(data_entry)
//    			log.debug("data_entry JSON PARSED", JSON.parse(data_entry));
    			log.debug("data_entry.custpage_pritemtext", data_entry.custpage_pritemtext)
    			var itemId = data_entry.custpage_pritemid ? data_entry.custpage_pritemid.value : "";
    			var itemText = data_entry.custpage_pritemtext ? data_entry.custpage_pritemtext.value : "";
    			var qty = data_entry.custpage_prquantity ? data_entry.custpage_prquantity.value : "";
    			var unitsTextStandard = data_entry.custpage_prunitstext ? data_entry.custpage_prunitstext.value : "";
    			var unitsText = data_entry.custpage_prexternalunits ? data_entry.custpage_prexternalunits.value : "";
    			var requiredDate = data_entry.custpage_prrequireddate ? data_entry.custpage_prrequireddate.value : "";
    			var instructions = data_entry.custpage_instructions ? data_entry.custpage_instructions.value : "";
    			var prRef = data_entry.custpage_prtext ? data_entry.custpage_prtext.value : "";
    			var prItemDesc = data_entry.custpage_pritemdescription ? data_entry.custpage_pritemdescription.value : "";
    			
    			var transactionId = data_entry.custpage_prnumber ? data_entry.custpage_prnumber.value : "";
    			
    			var itemLookup = {};
    			if(itemId)
    			{
    				itemLookup = search.lookupFields({
    					type : "item",
    					id : itemId,
    					columns : ["averagecost", "custitemitem_category", "type", "manufacturer", "mpn", "recordtype"]
    				})
    			}
//    			var itemCategoryText = itemLookup.custitemitem_category && itemLookup.custitemitem_category[0] && itemLookup.custitemitem_category[0].text ? || itemLookup.custitemitem_category[0].text : "";
    			var itemCategoryText = itemLookup.custitemitem_category || "";
    			var itemType = itemLookup.type[0].value;
    			
    			log.debug("itemLookup", itemLookup);
    			
    			if(itemType == "InvtPart")
    			{
    				prItemDesc += "<br/>";
    				if(itemLookup.mpn)
    				{
    					prItemDesc += "MPN : " + itemLookup.mpn + "<br/>";
    				}
    				if(itemLookup.manufacturer)
    				{
    					prItemDesc += "Manufacturer : " + itemLookup.manufacturer + "<br/>";
    				}
    			}
              
              	//09092021
              	if(poVendor)
				{
                    var itemRec = record.load({
                      type : itemLookup.recordtype,
                      id : itemId,
                      isDynamic : true
                    })
                    var vendorIndex = itemRec.findSublistLineWithValue({
                                sublistId : "itemvendor",
                                fieldId : "vendor",
                                value : Number(poVendor)
                            });
                    log.debug("vendorIndex", vendorIndex)
                    if(Number(vendorIndex) < 0)
                    {
                        itemRec.selectNewLine({
                            sublistId: 'itemvendor'
                        });

                        itemRec.setCurrentSublistValue({
                          sublistId : 'itemvendor',
                          fieldId : "vendor",
                          value : Number(poVendor)
                        })

                        itemRec.commitLine({
                          sublistId : 'itemvendor'
                        })
                      log.debug("commited vendor!", poVendor)
                    }
                  	itemRec.save({ignoreMandatoryFields : true, allowSourcing : true});
                }
    			
    			lineContents += "<tr>";
    			
    			lineContents += "<td>";
    			lineContents += prRef;
    			lineContents += "</td>";
    			

    			lineContents += "<td align='right'>";
    			lineContents += qty;
    			lineContents += "</td>";
    			

    			lineContents += "<td align='center'>";
    			lineContents += unitsText ? unitsText : unitsTextStandard;
    			lineContents += "</td>";

    			
    			
    			
    			lineContents += "<td>";
    			//07012021
//    			lineContents += itemText;
//    			lineContents += "<br/>";
    			lineContents += prItemDesc;
    			lineContents += "<br/>";
    			lineContents += instructions;
    			lineContents += "</td>";
    			
    			lineContents += "<td>";
    			lineContents += (itemCategoryText || "");
    			lineContents += "</td>";
    			lineContents += "<td>";
    			lineContents += (itemLookup.averagecost || "");
    			lineContents += "</td>";
    			lineContents += "<td>";
    			lineContents += "extension";
    			lineContents += "</td>";
    			lineContents += "<td>";
    			lineContents += requiredDate;
    			lineContents += "</td>";

        		lineContents += "</tr>";
        		
    			if(transactionIds.indexOf(transactionId))
    			{
    				transactionIds.push(transactionId)
    			}
    			
    		}
    	}
    	catch(e)
    	{
    		log.error("ERROR in function buildLineContents", e.message);
    	}
    	functionResult.transactionIds = transactionIds;
    	functionResult.lineContents = lineContents;
    	
    	log.debug("functionResult", functionResult);
    	return functionResult;
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

    return {
        getInputData: getInputData,
        map: map,
        reduce: reduce,
        summarize: summarize
    };
    
});
