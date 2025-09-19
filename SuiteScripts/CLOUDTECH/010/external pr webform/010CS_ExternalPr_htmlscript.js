//function addListeners()
//{
//	console.log('element', jQuery('#custpage_sl_rqstdqty_formattedValue'));jQuery(document).ready(function(){jQuery('#custpage_sl_rqstdqty_formattedValue').on( 'change', function(e){console.log('rate changed to : TODO')})});console.log('2');
//	//jQuery(document).ready(function(){jQuery('#custpage_sl_rqstdqty_formattedValue').on( "change", function(e){console.log('rate changed to : TODO')})});
//	console.log('addListeners triggered via script tag on hosted library')
//}
//addListeners();
var EXTERNAL_PR_MASTER_OBJ = {
		itemSublistId: "custpage_itemsublist",
		itemSublist_qtyField : "custpage_sl_rqstdqty",
		itemSublist_qtyElementId : "custpage_sl_rqstdqty_formattedValue",
		itemSublist_qtyElementId_jSelector : "#custpage_sl_rqstdqty_formattedValue",
		itemSublist_rateField : "custpage_sl_estimatedrate",
		itemSublist_rateElementId : "custpage_sl_estimatedrate_formattedValue",
		itemSublist_rateElementId_jSelector : "#custpage_sl_estimatedrate_formattedValue",
		itemSublist_amountField : "custpage_sl_estimatedamount",
		itemSublist_amountElementId : "custpage_sl_estimatedamount_formattedValue",
		itemSublist_amountElementId_jSelector : "#custpage_sl_estimatedamount_formattedValue",
		body_requestor_jSelector : "#custpage_body_employee_display",
//		body_requestor_jSelector : "#hddn_custpage_body_employee_fs",
		body_requestor_fieldId : "custpage_body_employee",
		validEmployeeFieldId : "custpage_body_validatedemployee",
		userMessageAlerts : {
			lineCountAlert : "You must enter at least one line."
		}
};


var VALID_EMPLOYEES = [];
var lastRequestorValue = "";



function fieldChange_qty()
{
	computeAmt();
}
function computeAmt()
{
	var currentLineIndex = window.nlapiGetCurrentLineItemIndex(EXTERNAL_PR_MASTER_OBJ.itemSublistId);
	var qtyValue = window.nlapiGetCurrentLineItemValue(EXTERNAL_PR_MASTER_OBJ.itemSublistId, EXTERNAL_PR_MASTER_OBJ.itemSublist_qtyField) || 0;
	var rateValue = window.nlapiGetCurrentLineItemValue(EXTERNAL_PR_MASTER_OBJ.itemSublistId, EXTERNAL_PR_MASTER_OBJ.itemSublist_rateField) || 0;
	
	var computedAmountValue = Number(qtyValue) * Number(rateValue);
	window.nlapiSetCurrentLineItemValue(EXTERNAL_PR_MASTER_OBJ.itemSublistId, EXTERNAL_PR_MASTER_OBJ.itemSublist_amountField, computedAmountValue);
	console.log('rate changed to : ' + qtyValue);
	
	console.log('computedAmountValue : ' + computedAmountValue);
}

function fieldChange_requestor()
{
	console.log("fieldChange_requestor", "triggered");
	var requestorValue = window.nlapiGetFieldValue(EXTERNAL_PR_MASTER_OBJ.body_requestor_fieldId) || "";
	console.log("requestorValue", requestorValue);
	if(requestorValue)
	{
		console.log("VALID_EMPLOYEES.indexOf(requestorValue) > -1.1", "VALID_EMPLOYEES.indexOf(requestorValue) > -1");
	
		if(VALID_EMPLOYEES.indexOf(requestorValue) > -1)
		{
			console.log("VALID_EMPLOYEES.indexOf(requestorValue) > -1.2", "VALID_EMPLOYEES.indexOf(requestorValue) > -1");
			
			lastRequestorValue = requestorValue
		}
		else
		{
			console.log("VALID_EMPLOYEES.indexOf(requestorValue) > -1.3", "VALID_EMPLOYEES.indexOf(requestorValue) > -1");
			
			alert("Selected Requestor is not applicable to the selected subsidiary. Please review your input");
			window.nlapiSetFieldValue(EXTERNAL_PR_MASTER_OBJ.body_requestor_fieldId, "");
		}
	}
}


function fieldChange_rate()
{
	computeAmt();
}


function synctotal1() 
{
var total = 0;
var linecount = document.forms[0].elements['nextcustpage_itemsublistidx'].value-1;
var custpage_itemsublist_total = 0.0;
 for (var i=1; i <= linecount; i++) {
     var amount = getEncodedValue('custpage_itemsublist',i,'custpage_sl_estimatedamount');
     amount = amount.replace(/,/g,"");
     if (amount.length) {
         amount = parseFloat(format_currency(parseFloat(amount)));
         custpage_itemsublist_total += amount;
     }
 }
custpage_itemsublist_total = parseFloat(format_currency(custpage_itemsublist_total));
console.log("custpage_itemsublist_total", custpage_itemsublist_total)
total += custpage_itemsublist_total;
total = addCommas(parseFloat(format_currency(total)));
console.log("total", total)
jQuery('#custpage_itemsublist_total').html(total)
}

jQuery(document).ready(externalPr_pageInit);
console.log('2');

//depricated, cant work with submit button, too hard to override, just prefilter the list
function validateForm(e)
{
	var isValid = true;
	console.log("validateForm", "triggered");
	console.log("EXTERNAL_PR_MASTER_OBJ", EXTERNAL_PR_MASTER_OBJ)
	console.log("EXTERNAL_PR_MASTER_OBJ.body_requestor_fieldId", EXTERNAL_PR_MASTER_OBJ.body_requestor_fieldId)
	console.log("window", window);
	console.log("window.nlapiGetFieldValue", window.nlapiGetFieldValue)
	console.log("window.nlapiGetFieldValue(EXTERNAL_PR_MASTER_OBJ.body_requestor_fieldId)", window.nlapiGetFieldValue(EXTERNAL_PR_MASTER_OBJ.body_requestor_fieldId))
	var requestorValue = window.nlapiGetFieldValue(EXTERNAL_PR_MASTER_OBJ.body_requestor_fieldId) || "";
	console.log("requestorValue", requestorValue);
	if(requestorValue)
	{
		console.log("VALID_EMPLOYEES.indexOf(requestorValue) > -1.1", "VALID_EMPLOYEES.indexOf(requestorValue) > -1");
	
		if(VALID_EMPLOYEES.indexOf(""+requestorValue) > -1)
		{
			console.log("VALID_EMPLOYEES.indexOf(requestorValue) > -1.2", "VALID_EMPLOYEES.indexOf(requestorValue) > -1");
			
			lastRequestorValue = requestorValue;
//			jQuery('#main_form').on( "submit", validateForm );
			//try {if (NS.form.isInited() && NS.form.isValid() && save_record(true)) { return true; } return false; } catch(e) { return false; }
//			return;
		}
		else
		{
			console.log("VALID_EMPLOYEES.indexOf(requestorValue) > -1.3", "VALID_EMPLOYEES.indexOf(requestorValue) > -1");
			
			alert("Selected Requestor is not applicable to the selected subsidiary. Please review your input.");
			window.nlapiSetFieldValue(EXTERNAL_PR_MASTER_OBJ.body_requestor_fieldId, "");
			
//			jQuery('#main_form').on( "submit", validateForm );
//			return false;
			isValid = false;
		}
	}
	
	if(isValid)
	{
		isValid = validateLineItems();
	}
	
	return isValid
}

function validateLineItems()
{
	var isValid = true;
	try
	{
		var itemSublistCount = window.nlapiGetLineItemCount(EXTERNAL_PR_MASTER_OBJ.itemSublistId);
		if(Number(itemSublistCount) < 1)
		{
			isValid = false;
			alert(EXTERNAL_PR_MASTER_OBJ.userMessageAlerts.lineCountAlert);
		}
	}
	catch(e)
	{
		console.log("ERROR in function validateLineItems", e.message);
		isValid = confirm("A problem has occured during the validation of line details. Do you want to confirm submission?");
	}
	return isValid;
}

function externalPr_pageInit()
{
	//DO THE FUNCTION OVERRIDES FIRST, cause if not validations will not kick in and user will be allowed to submit invalid input
	var timerObj = setInterval(pageInitTimer, 500);

	function pageInitTimer()
	{
		if(window.synctotal)
		{
			window.synctotal = synctotal1;
			window.save_record = save_record_rod;
			console.log("overriding synctotal", window.synctotal);
			myStopFunction();
		}
		else
		{
			console.log("native synctotal", window.synctotal);
		}
	}
	
	function myStopFunction() {
	  clearInterval(timerObj);
	}
	
	try
	{
		console.log("own document.cookies", document.cookie);
		console.log("parent", parent)
		console.log("parent.document", parent.document);
		console.log("parent.document.cookie", parent.document.cookie);
		console.log("window.opener", window.opener)
		console.log("window.opener.document.cookies", window.opener.document.cookie)
		console.log("parent.document.cookies", parent.document.cookie)
		
	}
	catch(e)
	{
		console.log("ERROR", e.message);
	}
	
	//TODO
	//STORE VALID EMPLOYEES, store in global variable so that you dont need to resolve it again
	//a more secure way is validating against the actual field value, and write a script that prevents editing the value of that field
	validEmployeeFieldValue = window.nlapiGetFieldValue(EXTERNAL_PR_MASTER_OBJ.validEmployeeFieldId);
	try
	{
		VALID_EMPLOYEES = validEmployeeFieldValue ? JSON.parse(validEmployeeFieldValue) : [];
	}
	catch(e)
	{
		console.log("employee validation may have encountered a problem, select valid employees to prevent error");
		VALID_EMPLOYEES = [];
	}
	
	jQuery(EXTERNAL_PR_MASTER_OBJ.itemSublist_qtyElementId_jSelector).on( 'change', fieldChange_qty)
	jQuery(EXTERNAL_PR_MASTER_OBJ.itemSublist_rateElementId_jSelector).on( 'change', fieldChange_rate)
	
	
	//depricated, cant work with submit button, too hard to override, just prefilter the list, cant get a proper fieldchange listener
//	jQuery(EXTERNAL_PR_MASTER_OBJ.body_requestor_jSelector).on( 'change', fieldChange_requestor)
//	jQuery(EXTERNAL_PR_MASTER_OBJ.body_requestor_jSelector).on( 'change', fieldChange_requestor)
	
	//depricated, cant work with submit button, too hard to override, just prefilter the list
//	jQuery('#main_form').on( "submit", validateForm );
//	jQuery('#main_form').attr( "onsubmit", validateForm );
}


function save_record_rod(lastcall, allowEnhancedResult) {
	var customValidateForm = validateForm();
	if (!customValidateForm) { return false };
	var _saverec = function _saverec(lastcall) {
	if(document.forms['main_form'].bonsubmitisnull) return true;
	if (!NS.form.isInited()) return false;
	for(key in window.subrecordcache)
	{
	    if (window.subrecordcache.hasOwnProperty(key) && window.subrecordcache[key])
	    {
	        window.subrecordcache[key].commit();
	    }
	}
	var form = document.forms['main_form'];
	if (form.submitted) {
	if (form.submitted.value == 'T') { 
	var resubmit = false;
	if (form.clickedback.value == 'T')
	resubmit = confirm('You have already submitted this form, would you like to submit it again?'); 
	else alert('You have already submitted this form.');
	if(!resubmit) return false;
	}
	}
	try {
	if(custpage_itemsublist_machine!=null && custpage_itemsublist_machine.ischanged) 
	{
	  if (!custpage_itemsublist_machine.addline()) 
	  {
	    return false;
	  }
	}
	writeLineArray('custpage_itemsublist');
	if (!checkMachineValid('custpage_itemsublist')) return false;
	var _lastResult = nlapiSaveRecord();
	var isSaveRecordValid = validationResultToBoolean(_lastResult);
	if (!isSaveRecordValid) return _lastResult;
	var _a_fld = new Array(document.forms['main_form'].elements['custpage_body_employee']);
	var _a_lbl = new Array('Requestor');
	var emptylabels = checkMandatoryFields(_a_fld,_a_lbl,null,null,true);
	if (emptylabels.length>0) {
	return { valid: false, fields: emptylabels.map(function(v){return {id: _a_fld[_a_lbl.indexOf(v)]};}), messages: ['Please enter value(s) for: ' + emptylabels.join(', ')] }
	}
	enableDisabledFields(isSaveRecordValid); 

	if (document.forms['main_form'].elements['custpage_body_subsidiary'].disabled && document.forms['main_form'].elements['custpage_body_subsidiary_send'] != null) document.forms['main_form'].elements['custpage_body_subsidiary_send'].value=document.forms['main_form'].elements['custpage_body_subsidiary'].value
	for(key in window.subrecordcache)
	{
	    if (window.subrecordcache.hasOwnProperty(key) && window.subrecordcache[key])
	    {
	        window.subrecordcache[key].commit();
	    }
	}
	} catch(err) {
	  alert('You cannot submit this form due to an unexpected error.'); return false;
	}
	setWindowChanged(window, false);
	if(lastcall == true && form.submitted) form.submitted.value='T';
	return true;
	}
	var result = _saverec(lastcall);
	if (!allowEnhancedResult) result = handleValidationResult(result);
	return result;
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
