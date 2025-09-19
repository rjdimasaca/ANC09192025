/**
 * @Author: Jed
 * @Date Created: 04/12/2018
 **/

function fieldChange(type, name, linenum) {
  console.log(type + " : " + name + " : " + linenum)
  if (name == "custpage_subsidiary") {
    var subs = nlapiGetFieldValue("custpage_subsidiary");
    var paymenttype = nlapiGetFieldValue("custpage_payment_type");
    var dateFrom = nlapiGetFieldValue("custpage_date_from");
    var dateTo = nlapiGetFieldValue("custpage_date_to");
    var bankcodes = nlapiGetFieldValue("custpage_bank_codes");
    var flag = 0;

    window.onbeforeunload = null;


    var suiteletURL = nlapiResolveURL("SUITELET", "customscript_015sl_checkregisterreport", "customdeploy_015sl_checkregisterreport");
    suiteletURL += "&sb=" + subs; //subsidiary
    suiteletURL += "&pt=" + paymenttype; //payment type
    suiteletURL += "&df=" + dateFrom; //date from
    suiteletURL += "&dt=" + dateTo; //date to
    suiteletURL += "&fg=" + flag; //flag for ui
    suiteletURL += "&bc=" + bankcodes;

    window.location.href = suiteletURL;
  }
}


function reloadPage() {
  var subs = nlapiGetFieldValue("custpage_subsidiary");
  var paymenttype = nlapiGetFieldValue("custpage_payment_type");
  var dateFrom = nlapiGetFieldValue("custpage_date_from");
  var dateTo = nlapiGetFieldValue("custpage_date_to");
  var flag = 1;
  var bankcodes = nlapiGetFieldValue("custpage_bank_codes");

  window.onbeforeunload = null;


  var suiteletURL = nlapiResolveURL("SUITELET", "customscript_015sl_checkregisterreport", "customdeploy_015sl_checkregisterreport");
  suiteletURL += "&sb=" + subs; //subsidiary
  suiteletURL += "&pt=" + paymenttype; //payment type
  suiteletURL += "&df=" + dateFrom; //date from
  suiteletURL += "&dt=" + dateTo; //date to
  suiteletURL += "&fg=" + flag; //flag for ui
  suiteletURL += "&bc=" + bankcodes;


  window.location.href = suiteletURL;
}