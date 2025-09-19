/**
 * @NApiVersion 2.x
 * @NScriptType ClientScript
 * @NModuleScope SameAccount
 */
define(["N/ui/dialog", "N/currentRecord", "N/url", "N/https"],

function(dialog, currentRecord, url, https) {
    
	var childWindow = null;
	var globalContext = {};
	var suiteletUrls = {};
    /**
     * Function to be executed after page is initialized.
     *
     * @param {Object} scriptContext
     * @param {Record} scriptContext.currentRecord - Current form record
     * @param {string} scriptContext.mode - The mode in which the record is being accessed (create, copy, or edit)
     *
     * @since 2015.2
     */
    function pageInit(scriptContext) {
		//means you are on the parent page, cause child page doesnt have this custpage_prsublisttxt element
    	if(jQuery( '#custpage_prsublisttxt' ).length > 0)
    	{
        	suiteletUrls = getSuiteletUrls()
        	
//    		data-label="MULTILINE?"
        	var onClickFunction = "multiLineOnClickFunction(this)";
    		var mutliLineAll_element = '<script>' + multiLineOnClickFunction + updatePrMultilines + '</script><span id="custpage_prmultiline1_fs" class="checkbox_unck" onclick="' + onClickFunction + ';NLCheckboxOnClick(this);"><input type="checkbox" class="checkbox" value="T" aria-label="MULTILINE?" onkeypress="NLCheckboxOnKeyPress(event);  return true;" onchange="NLCheckboxOnChange(this);"><img class="checkboximage" src="/images/nav/ns_x.gif" alt=""></span>'
    		jQuery('[data-label="MULTILINE?"]').append(mutliLineAll_element)
        	
    		
    		console.log("adding eventlistener");
    		jQuery('body').on('click', function(e){
    			console.log("clicked body");
        		if(childWindow)
        		{
        			childWindow.focus()
        			console.log("childWindow", childWindow)
        			console.log("childWindowFocused", true)
        		}
        		
    		})
    		
    		window.onunload = function()
    		{
    			if(childWindow)
        		{
//        			childWindow.alert("parent closed so close the child too")
        			childWindow.close();
        			childWindow = null;
        		}
    		}
    	}
    	//means you are on the child page, cause child page doesnt have this custpage_prsublisttxt element
    	else
    	{

    		loadModalDiv_childToParent();
    		jQuery('body').append("<script>function getUniq(targetArray){return [ ...new Set(targetArray) ]}</script>")
			
    		window.onunload = function()
    		{
    			
//    			window.opener.window.alert("child closed, so remove the blocker on the parent");
    			hideModalDiv();
    			childWindow.close();
    			childWindow = null;
    		}
    	}
    	jQuery('body').append('<div id = "divBackground" style="position: fixed; z-index: 9999999; height: 100%; width: 100%; top: 0; left:0; background-color: Black; filter: alpha(opacity=60); opacity: 0.6; -moz-opacity: 0.8;display:none"></div>');
    	
    	jQuery( "[id^='custpage_prsublist_custpage_prvendortext']" ).attr('readonly', '')
    	jQuery( "[id^='custpage_prsublist_custpage_prvendorid']" ).attr('readonly', '')
    	
    	jQuery( "[id^='custpage_prsublist_custpage_prvendortext']" ).on('click', function(e){
//    		var opener_currentLineItemIndex = window.nlapiGetCurrentLineItemIndex("custpage_prsublist")
    		var opener_currentLineItemIndex = scriptContext.currentRecord.getCurrentSublistIndex({
    		    sublistId: 'custpage_prsublist'
    		});
    		
    		initiateSelectVendorUi(scriptContext, true);
    	})
    	
    	globalContext = scriptContext;
    }
    
    function multiLineOnClickFunction(obj)
    {
    	console.log("multiLineOnClick", {obj : obj});
    	console.log("multiLineOnClick", {objclassname : obj.className});
    	
    	if(obj.className == "checkbox_ck")
    	{
    		updatePrMultilines(window, "custpage_prmultiline", "F")
//    		var prSublistLineCount = window.nlapiGetLineItemCount("custpage_prsublist");
//        	for(var a = 0 ; a < prSublistLineCount ; a++)
//        	{
//        		window.nlapiSetLineItemValue("custpage_prsublist", "custpage_prmultiline", a+1, "F");
//        	}
    	}
    	else
    	{
    		updatePrMultilines(window, "custpage_prmultiline", "T")
//    		var prSublistLineCount = window.nlapiGetLineItemCount("custpage_prsublist");
//        	for(var a = 0 ; a < prSublistLineCount ; a++)
//        	{
//        		window.nlapiSetLineItemValue("custpage_prsublist", "custpage_prmultiline", a+1, "T");
//        	}
    	}
    }
    
    function updatePrMultilines(targetWindow, columnId, value)
    {
    	console.log("updating mr multiline via updatePrMultilines");
    	var prSublistLineCount = targetWindow.nlapiGetLineItemCount("custpage_prsublist");
    	for(var a = 0 ; a < prSublistLineCount ; a++)
    	{
    		targetWindow.nlapiSetLineItemValue("custpage_prsublist", columnId, a+1, value);
//    		targetWindow.nlapiSetLineItemValue("custpage_prsublist", columnId, a+1, value);
    	}
    }
    
    function showSendRfqUi(scriptContext)
    {
    	console.log("scriptContext", scriptContext);
    	suiteletUrls = getSuiteletUrls()
    	console.log("showSendRfqUi suiteletUrls", suiteletUrls);
    	try
    	{
    		//depricated, table representation is NS FORM STYLE
    		/*var htmlTemplate = getHtmlTemplate(scriptContext);
    		var htmlTable = getHtmlTable(scriptContext);*/
    		
    		var targetUrl = suiteletUrls.rfqSuitelet;
    		targetUrl += "&requisitionids=";
    		targetUrl += currentRecord.get().id;
    		var sendRfqWindow = window.open(targetUrl, "Send RFQ")
    		sendRfqWindow.focus();
    		console.log("function showSendRfqUi executed", true);
    	}
    	catch(e)
    	{
    		console.log("ERROR in fucntion showSendRfqUI", e.message);
    	}
    	return false;
    }
    
    //depricated, table representation is NS FORM STYLE
    /*function getHtmlTemplate(scriptContext)
    {
    	var htmlTemplate = "";
    	try
    	{
    		
    	}
    	catch(e)
    	{
    		console.log("ERROR in function getHtmlTemplate", e.message);
    	}
    	return htmlTemplate;
    }
    
    function getHtmlTable(scriptContext)
    {
    	var htmlTable = "";
    	try
    	{
    		
    	}
    	catch(e)
    	{
    		log.error("ERROR in fucntion getHtmlTable", e.message);
    	};
    	
    	return htmlTable
    }*/
    
    
    
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
    
    function submitRfqForm()
    {
    	var linesToProcess = table
	      .rows({ selected: true })
	      .data()
	      .toArray();
    	console.log("linesToProcess", linesToProcess)
	    if (linesToProcess.length == 0) {
	      dialog.alert({
	        title: 'Notice',
	        message: 'Please select at least 1 record to process'
	      });
	      return;
	    }

    	console.log("parent window should be reloaded start")
    	window.opener.window.location.reload();
    	console.log("parent window should be reloaded end")
    }
    
    function submitSelectVendorForm(scriptContext)
    {
    	console.log("submitSelectVendorForm", scriptContext);
    	console.log("submitSelectVendorForm window.opener", window.opener);
    	var opener_currentLineItemIndex = window.opener.window.nlapiGetCurrentLineItemIndex("custpage_prsublist")
    	console.log("opener_currentLineItemIndex", opener_currentLineItemIndex);
//    	console.log("submitSelectVendorForm window.opener.getCurrentSublistValue", window.opener.window.nlapiGetCurrentLineItemIndex("custpage_prsublist"));
    	
    	var selectedVendors_raw = currentRecord.get().getValue({
    		fieldId : "custpage_body_vendor"
    	})
    	console.log("selectedVendors_raw", selectedVendors_raw);
    	var selectedVendors = selectedVendors_raw.join(",");
    	console.log("selectedVendors", selectedVendors);
    	
    	var selectedVendors_text_raw = currentRecord.get().getText({
    		fieldId : "custpage_body_vendor"
    	}) || "";
    	
    	console.log("selectedVendors_text_raw", selectedVendors_text_raw)
    	console.log("JSON STRINGIFIED selectedVendors_text_raw", JSON.stringify(selectedVendors_text_raw))
    	var selectedVendors_text = "";
    	//somehow the text gets stuck with old value, add vendor id checking to make sure
    	if(selectedVendors && selectedVendors.length && selectedVendors_text_raw && selectedVendors_text_raw.length > 0)
    	{
    		selectedVendors_text = selectedVendors_text_raw.join(", \n");
    	}
    	var hasMultiLine = window.opener.window.nlapiFindLineItemValue("custpage_prsublist", "custpage_prmultiline", "T");
    	if(hasMultiLine > 0)
    	{
    		var prSublistLineCount = window.opener.window.nlapiGetLineItemCount("custpage_prsublist");
    		for(var a = 0 ; a < prSublistLineCount ; a++)
    		{
    			
    			var multiLineIschecked = window.opener.window.nlapiGetLineItemValue("custpage_prsublist", "custpage_prmultiline", a+1);
    			console.log("multiLineIschecked : " + multiLineIschecked);
    			if(multiLineIschecked == 'T')
    			{
    				window.opener.window.nlapiSetLineItemValue("custpage_prsublist", "custpage_prvendorid", a+1, selectedVendors);
        	    	window.opener.window.nlapiSetLineItemValue("custpage_prsublist", "custpage_prvendortext", a+1, selectedVendors_text);
        	    	
        	    	if(selectedVendors)
                	{
                		window.opener.window.nlapiSetLineItemValue("custpage_prsublist", "custpage_princlude", a+1, "T");
                	}
                	else
                	{
                    	window.opener.window.nlapiSetLineItemValue("custpage_prsublist", "custpage_princlude", a+1, "F");
                   	}
    			}
    		}
    	}
    	else
    	{
    		console.log("multiLineIschecked", multiLineIschecked);
    		
        	window.opener.window.nlapiSetLineItemValue("custpage_prsublist", "custpage_prvendorid", opener_currentLineItemIndex, selectedVendors);
        	window.opener.window.nlapiSetLineItemValue("custpage_prsublist", "custpage_prvendortext", opener_currentLineItemIndex, selectedVendors_text);
        	
        	if(selectedVendors)
        	{
        		window.opener.window.nlapiSetLineItemValue("custpage_prsublist", "custpage_princlude", opener_currentLineItemIndex, "T");
        	}
        	else
        	{
            	window.opener.window.nlapiSetLineItemValue("custpage_prsublist", "custpage_princlude", opener_currentLineItemIndex, "F");
           	}
    	}
    	
    	window.onbeforeunload = null;
    	window.close();
    }
    
    function fieldChanged(scriptContext)
    {
    	globalContext= scriptContext;
    	try
    	{
    		if(scriptContext.fieldId == "custpage_princlude")
    		{
    			initiateSelectVendorUi(scriptContext, false); //false means ignore include checkbox
    		}
    		else if (scriptContext.fieldId == "custpage_body_vendor_validated" || scriptContext.fieldId == "custpage_body_vendor")
    		{
    			addDummyVendorToActualVendor(scriptContext);
    		}
    	}
    	catch(e)
    	{
    		console.log("ERROR in function fieldChanged", e.message);
    	}
    }
    
    function addDummyVendorToActualVendor(scriptContext)
    {
    	var dummyValues = scriptContext.currentRecord.getValue({
    		fieldId : "custpage_body_vendor_validated",
    	})
    	var actualValues = scriptContext.currentRecord.getValue({
    		fieldId : "custpage_body_vendor",
    	})
    	console.log("dummyValues", dummyValues)
    	console.log("actualValues", actualValues)
    	
    	var combinedValues = dummyValues.concat(actualValues);
    	
    	console.log("combinedValues", combinedValues);
    	var combinedValues_uniq = window.getUniq(combinedValues)
    	console.log("combinedValues_uniq", combinedValues_uniq);
    	
    	if(scriptContext.fieldId == "custpage_body_vendor_validated")
    	{
    		scriptContext.currentRecord.setValue({
        		fieldId : "custpage_body_vendor",
        		value : combinedValues_uniq,
        		ignoreFieldChange : true
        	})
        	
//        	scriptContext.currentRecord.setValue({
//        		fieldId : "custpage_body_vendor_validated",
//        		value : "",
//        		ignoreFieldChange : true
//        	})
    	}
    	if(scriptContext.fieldId == "custpage_body_vendor")
    	{
    		var actualValues = scriptContext.currentRecord.getValue({
        		fieldId : "custpage_body_vendor",
        	})
        	
        	scriptContext.currentRecord.setValue({
        		fieldId : "custpage_body_vendor_validated",
        		value : actualValues,
        		ignoreFieldChange : true
        	})
    	}
    }
    
    function initiateSelectVendorUi(scriptContext, ignoreInclude)
    {
    	try
    	{
    		suiteletUrls = getSuiteletUrls()
    		console.log("initiateSelectVendorUi scriptContext", scriptContext)
    		console.log("initiateSelectVendorUi ignoreInclude", ignoreInclude)
    		
    		var prInclude_value = false;
    		if(!ignoreInclude)
    		{
    			prInclude_value = scriptContext.currentRecord.getCurrentSublistValue({
        			sublistId : "custpage_prsublist",
        			fieldId : scriptContext.fieldId,
        			line : scriptContext.line
        		}) || false;
    		}

    		console.log("initiateSelectVendorUi prInclude_value", prInclude_value)
			var line_currentVendorIds = scriptContext.currentRecord.getCurrentSublistValue({
    			sublistId : "custpage_prsublist",
    			fieldId : "custpage_prvendorid",
    			line : scriptContext.line
    		}).trim() || null;
    		

    		console.log("initiateSelectVendorUi line_currentVendorIds", line_currentVendorIds)
			
			var line_preferredVendorId = scriptContext.currentRecord.getCurrentSublistValue({
    			sublistId : "custpage_prsublist",
    			fieldId : "custpage_prvendor",
    			line : scriptContext.line
    		}).trim() || null;
    		
    		console.log("initiateSelectVendorUi line_preferredVendorId", line_preferredVendorId)
			
			console.log("line_currentVendorIds", line_currentVendorIds);
//			console.log("line_currentVendorIds.split", line_currentVendorIds.split(','));
//			console.log("line_currentVendorIds.split", line_currentVendorIds.split(',').length);
    		
			var selectVendorUrl = suiteletUrls.rfqSuitelet;
			selectVendorUrl += '&selectvendor=T';
			
			if(line_currentVendorIds)
			{
				selectVendorUrl += "&linecurrentvendorids=" + line_currentVendorIds
			}
			else
			{
				selectVendorUrl += "&preferredvendor=" + line_preferredVendorId
			}
			
			console.log("ignoreInclude and prInclude_value", ignoreInclude, prInclude_value)
			if(ignoreInclude || (prInclude_value && prInclude_value != "F"))
			{
				//when clicked checked through include, this has to be called to uncheck the checkbox before the popup
				//this is so that a checkbox cannot be checked without commiting vendors for the line
				if(!ignoreInclude)
				{
					console.log('ignoreInclude || (prInclude_value && prInclude_value != "F")', ignoreInclude || (prInclude_value && prInclude_value != "F"))
//					var childWindow = window.open("/app/site/hosting/scriptlet.nl?script=604&deploy=1&selectvendor=T", "Popup", "width=500,height=200");
//					childWindow.focus();
					scriptContext.currentRecord.setCurrentSublistValue({
		    			sublistId : "custpage_prsublist",
		    			fieldId : scriptContext.fieldId,
		    			value : false,
		    			ignoreFieldChange : !ignoreInclude
		    		})
				}
				
				openAsPopup(selectVendorUrl, "Send RFQ : Vendor Selection", 450,525)
				
				//checkbox doesnt need to be reset to unchecked if popup was initiated from the vendor list instead of the include checkbox
				//the user may just be reviewing it without any changes
//				if(ignoreInclude)
//				{
//					console.log('ignoreInclude || (prInclude_value && prInclude_value != "F")', ignoreInclude || (prInclude_value && prInclude_value != "F"))
////					var childWindow = window.open("/app/site/hosting/scriptlet.nl?script=604&deploy=1&selectvendor=T", "Popup", "width=500,height=200");
////					childWindow.focus();
//					scriptContext.currentRecord.setCurrentSublistValue({
//		    			sublistId : "custpage_prsublist",
//		    			fieldId : scriptContext.fieldId,
//		    			value : false,
//		    			ignoreFieldChange : !ignoreInclude
//		    		})
//				}
			}
    	}
    	catch(e)
    	{
    		log.error("ERROR in function initiateSelectVendorUi", e.messsage);
    	}
    }
    
    function openAsPopup(url, title, w, h){
    	
		childWindow = window.open(url, title,
				"width=" + w + ",height=" + h + "toolbar=no," +
			    "scrollbars=no," +
			    "location=no," +
			    "statusbar=no,");
		
		childWindow.focus();
		childWindow.resizeTo(w, h);
		childWindow.moveTo(((screen.width - w) / 2), ((screen.height - h) / 2));
		
		/*//deprecated, dont wanna block the , move this to when the child page is actually loaded.
		loadModalDiv();*/
    }
    

    function loadModalDiv_childToParent()
    {
        var bcgDiv = window.opener.document.getElementById("divBackground");
        if(bcgDiv && bcgDiv.style)
        {
        	bcgDiv.style.display="block";
        }
    }
    
    
    function loadModalDiv()
    {
        var bcgDiv = document.getElementById("divBackground");
        if(bcgDiv && bcgDiv.style)
        {
        	bcgDiv.style.display="block";
        }
    }
    
    function hideModalDiv()
    {
       var bcgDiv = window.opener.window.document.getElementById("divBackground");
       bcgDiv.style.display="none";
    }
    
    function saveRecord(scriptContext)
    {
    	var isValid = true;
    	try
    	{
    		if(jQuery( '#custpage_prsublisttxt' ).length > 0)
        	{
    			isValid = validateIncludeCount(scriptContext);
        	}
    	}
    	catch(e)
    	{
    		console.log("ERROR in function saveRecord", e.message);
    	}
    	return isValid;
    }
    
    function validateIncludeCount(scriptContext)
    {
    	var isValid = true;
    	try
    	{
    		var includeFirstIndex = scriptContext.currentRecord.findSublistLineWithValue({
    			sublistId : "custpage_prsublist",
    			fieldId : "custpage_princlude",
    			value : "T"
    		})
    		
    		if(Number(includeFirstIndex) < 0)
    		{
    			isValid = false;
    			alert("You must select atleast one requisition item.")
    		}
    		
    		console.log("includeFirstIndex", includeFirstIndex)
    		console.log("isValid", isValid)
    	}
    	catch(e)
    	{
    		console.log("ERROR in function validateIncludeCount", e.message);
    		alert("An error occured during validation of included requisition items. Please contact your administrator." + e.message);
    		return false;
    	}
    	return isValid;
    }
    
    //deprecated, submission for approval is now done in the workflow
    function submitForApproval(targetRecId)
    {
    	try
    	{
    		suiteletUrls = getSuiteletUrls()
    		console.log("suiteletUrls.rfqSuitelet", suiteletUrls.rfqSuitelet)
    		
    		var responseObj = https.post({
    			url : suiteletUrls.rfqSuitelet,
    			body : JSON.stringify({type : "submitRfq", targetRecId : targetRecId})
    		})
    		
    		console.log("responseObj", responseObj)
    		
    		var response_bodyStr = responseObj.body;
    		console.log("response_bodyStr", response_bodyStr)
    		if(response_bodyStr && response_bodyStr != "{}")
    		{
    			var response_bodyObj = JSON.parse(response_bodyStr);
    			
    			if(response_bodyObj.submittedRecordId && response_bodyObj.success)
    			{
    				console.log("location", location);
    				location.reload();
    			}
    		}
    		else
    		{
    			alert("ERROR Submitting For Approval. \n This record may already have been changed. \n The record will be reloaded");
    		}
    		
    	}
    	catch(e)
    	{
    		console.log("ERROR in function submitForApproval", e.message);
    	}
    }
    
    function getSuiteletUrls()
    {
    	var suiteletUrls = {};
    	try
    	{
    		var scriptId = "customscript_010sl_rfq";
        	var scriptDeploymentId = "customdeploy_010sl_rfq";
        	
        	var baseUrl_internal = url.resolveScript({
    			scriptId : scriptId,
    			deploymentId : scriptDeploymentId,
    			returnExternalUrl: false
    		});
        	
//        	var baseUrl_external = url.resolveScript({
//    			scriptId : scriptId,
//    			deploymentId : scriptDeploymentId,
//    			returnExternalUrl: true
//    		});
        	suiteletUrls.rfqSuitelet = baseUrl_internal
    	}
    	catch(e)
    	{
    		log.error("ERROR in function getSuiteletUrl", e.message);
    	}
    	console.log("suiteletUrls", suiteletUrls);
    	return suiteletUrls;
    }
    
    function lineInit(scriptContext)
    {
    	try
    	{
    		console.log("lineinit triggered", e.message);
    	}
    	catch(e)
    	{
    		console.log("ERROR in fucntion lineINit", e.message);
    	}
    }

    return {
        pageInit: pageInit,
        showSendRfqUi : showSendRfqUi,
        submitRfqForm : submitRfqForm,
        submitSelectVendorForm : submitSelectVendorForm,
        fieldChanged : fieldChanged,
        saveRecord : saveRecord,
        submitForApproval : submitForApproval,
//        lineInit : lineInit
    };
    
});
