"use strict";

function _typeof(obj) {
  if (typeof Symbol === "function" && typeof Symbol.iterator === "symbol") {
    _typeof = function _typeof(obj) {
      return typeof obj;
    };
  } else {
    _typeof = function _typeof(obj) {
      return obj && typeof Symbol === "function" && obj.constructor === Symbol && obj !== Symbol.prototype ? "symbol" : typeof obj;
    };
  }
  return _typeof(obj);
}

/**
 * @NApiVersion 2.x
 * @NScriptType Suitelet
 * @NModuleScope SameAccount
 * @Author Antonio E. del Rosario Jr
 * @Email aedelrosariojr@gmail.com
 * @Description
 */
define(['N/search', 'N/http', 'N/render', 'N/record', 'N/file', 'SuiteScripts/lodash.min.js', 'N/format'], function (search, http, render, record, file, _, format) {
  //region common functions
  var mapSearchResultObj = function mapSearchResultObj(searchResults) {
    if (searchResults.length < 1) return [];
    var columnsArray = searchResults[0]['columns'].map(function (col) {
      //array of column 'internalid' ['custpage_something']
      var colLabel = col.label;
      colLabel = colLabel.substring(colLabel.lastIndexOf(' ') + 1);
      return colLabel;
    });
    columnsArray.push('id')
    log.emergency({
      title: 'columnsArray',
      details: columnsArray
    });
    return searchResults.map(function (res, index) {
      var obj = {};
      columnsArray.forEach(function (x) {
        var i = getColIndex(searchResults[0]['columns'], x);
        obj[x] = '';
        if (i > -1) {
          obj[x] = res.getValue(searchResults[0]['columns'][i]);
        }
      });
      return obj;
    });
  };

  var getVendorBill = function getVendorBill(params) {
    var savedSearchId = 'customsearch_010util_getvendorbills4py_2';
    var searchObj = search.load({
      id: savedSearchId
    });
    if (params.length > 0) {
      searchObj.filters.push(search.createFilter({
        name: 'applyingtransaction',
        operator: search.Operator.ANYOF,
        values: params
      }));

    }
    var results = getResults(searchObj.run()).map(function (x) {
      return {
        internalid: x.getValue(x.columns[1]),
        tranid: x.getValue(x.columns[1]),
        applyingtransaction: x.getValue(x.columns[2]),
        amount: x.getValue(x.columns[3]),
      };
    });
    return results
  }
  var getBillCredits = function getBillCredits(params) {
    var savedSearchId = 'customsearch_010util_getvendorbills4pymt';
    var searchObj = search.load({
      id: savedSearchId
    });
    if (params.length > 0) {
      searchObj.filters.push(search.createFilter({
        name: 'internalid',
        operator: search.Operator.ANYOF,
        values: params
      }));
    }
    var results = getResults(searchObj.run()).map(function (x) {
      return {
        internalid: x.getValue(x.columns[1]),
        tranid: x.getValue(x.columns[1]),
        applyingtransaction: x.getValue(x.columns[2]),
        amount: x.getValue(x.columns[3]),
      };
    });
    return results
  }
  var getOtherVendorBill = function getOtherVendorBill(params) {
    var filterIn = params.filterIn;
    var filterOut = params.filterOut;
    var savedSearchId = 'customsearch_010util_getvendorbills4py_3';
    var searchObj = search.load({
      id: savedSearchId
    });
    if (filterIn.length > 0) {
      searchObj.filters.push(search.createFilter({
        name: 'internalid',
        operator: search.Operator.ANYOF,
        values: filterIn
      }));

    }
    if (filterOut.length > 0) {
      searchObj.filters.push(search.createFilter({
        name: 'appliedtotransaction',
        operator: search.Operator.NONEOF,
        values: filterOut
      }));

    }
    var results = getResults(searchObj.run()).map(function (x) {
      return {
        internalid: x.getValue(x.columns[1]),
        tranid: x.getValue(x.columns[1]),
        applyingtransaction: x.getValue(x.columns[2]),
        applyngTransDocNo: x.getValue(x.columns[3]),
        applyngTransRefNo: x.getValue(x.columns[4]),
        amount: x.getValue(x.columns[5]),
      };
    });
    return results
  }


  var getColIndex = function getColIndex(cols, colInternalId) {
    var colIndex = cols.map(function (e) {
      var colLabel = e.label;
      colLabel = colLabel.substring(colLabel.lastIndexOf(' ') + 1);
      return colLabel;
    }).indexOf(colInternalId);
    return colIndex;
  };

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
  }; //endregion


  var onRequestPrintout = function onRequestPrintout(context) {
    var eventRouter = {};
    eventRouter[http.Method.GET] = getHandler;
    eventRouter[http.Method.POST] = postHandler;
    eventRouter[context.request.method] ? eventRouter[context.request.method](context) : errorHandler(context);
  };

  var getHandler = function getHandler(context) {
    var params = context['request']['parameters'];
    var customRecord = 'customrecord_2663_file_admin';

    try {
      log.emergency({
        title: 'params',
        details: params
      });
      var pfaInternalId = params['recId'];
      var createFile = params['createFile'];
//      var savedSearchId = 'customsearch_paymentregister';
      var searchObj = search.create({
        type: "transaction",
        filters : ["custbody_9997_pfa_record", "anyof", [pfaInternalId]]
      });
      var searchResultsSet = getResults(searchObj.run());
      var billsPaymentIds = searchResultsSet.map(function(res){
    	  return res.id
      })
      
      log.debug("billsPaymentIds", billsPaymentIds);
//      var searchResults = mapSearchResultObj(getResults(searchObj.run()));
//
//      log.emergency({
//        title: 'searchResults',
//        details: searchResults
//      });
//
//      var searchResultsGroupedByEntityInternalId = _.groupBy(searchResults, function (res) {
//        return res['entityinternalid'];
//      });
//
//      log.emergency({
//        title: 'searchResultsGroupedByEntityInternalId',
//        details: searchResultsGroupedByEntityInternalId
//      });
//
//
//      var grandTotalInvoiceAmount = 0;
//      var grandTotalDiscountAmount = 0;
//      var grandTotalPaymentAmount = 0;
//      var tableBody = '';
//      var vendPaymentArray = []
//
//      //TC10ROD
//      var jsonObject = {
//        entities: []
//      };
//      var firstLevel = 0
//      for (var entityInternalId in searchResultsGroupedByEntityInternalId) {
//
//        if (!jsonObject['entities']) {
//          jsonObject['entities'] = []
//        }
//        jsonObject['entities'].push({
//          entityId: entityInternalId,
//          billpaymentEntries: []
//        })
//
//        var second = [];
//        var secondTotal = 0;
//
//        var isNgtvStart = "";
//        var isNgtvEnd = "";
//        var refnumArray = [],
//          billPaymentIds = [],
//          vendorBillIds = [],
//          billCreditsIds = [];
//
//        // log.debug("JSON.parse(searchResultsGroupedByEntityInternalId[entityInternalId].creditsappliedobj || '[]')", JSON.parse(searchResultsGroupedByEntityInternalId[entityInternalId].creditsappliedobj || '[]'))
//        var secondLevel = 0;
//        for (var a = 0; a < searchResultsGroupedByEntityInternalId[entityInternalId].length; a++) {
//          refnumArray.push(searchResultsGroupedByEntityInternalId[entityInternalId][a].invoicenumber)
//        }
//        for (var a = 0; a < searchResultsGroupedByEntityInternalId[entityInternalId].length; a++) {
//          billPaymentIds.push(searchResultsGroupedByEntityInternalId[entityInternalId][a].internalid)
//        }
//
//        var vendorBillRecObj = getVendorBill(billPaymentIds);
//
//        for (var i = 0; i < vendorBillRecObj.length; i++) {
//          var internalid = vendorBillRecObj[i].internalid;
//          vendorBillIds.push(internalid)
//        }
//
//        var billCreditsRecObj = getBillCredits(vendorBillIds);
//
//        for (var i = 0; i < billCreditsRecObj.length; i++) {
//          var internalid = billCreditsRecObj[i].internalid;
//          billCreditsIds.push(internalid)
//        }
//
//
//        var params = {
//          filterIn: billCreditsIds,
//          filterOut: vendorBillIds
//        }
//
//        var otherVendorBillRecObj = getOtherVendorBill(params);
//
//        log.emergency({
//          title: 'vendorBillRecObj',
//          details: JSON.stringify(vendorBillRecObj)
//        });
//        log.emergency({
//          title: 'billCreditsRecObj',
//          details: JSON.stringify(billCreditsRecObj)
//        });
//        log.emergency({
//          title: 'otherVendorBillRecObj',
//          details: JSON.stringify(otherVendorBillRecObj)
//        });
//
//
//        log.emergency({
//          title: 'ids',
//          details: billPaymentIds + " : " + vendorBillIds + " : " + billCreditsIds
//        });
//
//        var vendorBillGrouped = _.groupBy(vendorBillRecObj, function (res) {
//          return res['applyingtransaction'];
//        });
//        var billCreditsGrouped = _.groupBy(billCreditsRecObj, function (res) {
//          return res['tranid'];
//        });
//        var otherVendorBillGrouped = _.groupBy(otherVendorBillRecObj, function (res) {
//          return res['applyingtransaction'];
//        });
//
//        log.emergency({
//          title: 'vendorBillGrouped',
//          details: JSON.stringify(vendorBillGrouped)
//        });
//
//        log.emergency({
//          title: 'billCreditsGrouped',
//          details: JSON.stringify(billCreditsGrouped)
//        });
//        log.emergency({
//          title: 'otherVendorBillGrouped',
//          details: JSON.stringify(otherVendorBillGrouped)
//        });
//
//        log.debug("ZZZ searchResultsGroupedByEntityInternalId[entityInternalId].length", searchResultsGroupedByEntityInternalId[entityInternalId].length)
//        for (var a = 0; a < searchResultsGroupedByEntityInternalId[entityInternalId].length; a++) {
//          var thirdLevel = 0;
//          jsonObject['entities'][firstLevel]['billpaymentEntries'].push({
//            billPaymentId: searchResultsGroupedByEntityInternalId[entityInternalId][a].internalid,
//            billCreditEntries: []
//          })
//          log.emergency({
//            title: '2',
//            details: JSON.stringify(jsonObject)
//          });
//
//          var vouchernumber = searchResultsGroupedByEntityInternalId[entityInternalId][a].vouchernumber
//          var entityname = searchResultsGroupedByEntityInternalId[entityInternalId][a].entityname
//          var entitymsid = searchResultsGroupedByEntityInternalId[entityInternalId][a].entitymsid
//          var entityinternalid = searchResultsGroupedByEntityInternalId[entityInternalId][a].entityinternalid
//          var checknumber = searchResultsGroupedByEntityInternalId[entityInternalId][a].checknumber
//          for (var key in vendorBillGrouped) {
//            var fourthLevel = 0;
//            if (vendorBillGrouped.hasOwnProperty(key)) {
//              for (var i = 0; i < vendorBillGrouped[key].length; i++) {
//                jsonObject['entities'][firstLevel]['billpaymentEntries'][secondLevel]['billCreditEntries'].push({
//                  billCreditId: vendorBillGrouped[key][i].tranid,
//                  vendorBillEntries: []
//                })
//              }
//              log.debug("vendorBillGrouped[key].length", vendorBillGrouped[key].length);
//
//              for (var billCreditKey in billCreditsGrouped) {
//                if (billCreditsGrouped.hasOwnProperty(billCreditKey)) {
//                  for (var x = 0; x < billCreditsGrouped[billCreditKey].length; x++) {
//                    jsonObject['entities'][firstLevel]['billpaymentEntries'][secondLevel]['billCreditEntries'][thirdLevel]['vendorBillEntries'].push({
//                      vendorBillId: billCreditsGrouped[billCreditKey][x].tranid,
//                      otherVBEntries: []
//                    })
//                  }
//                  for (var otherVBKey in otherVendorBillGrouped) {
//                    if (otherVendorBillGrouped.hasOwnProperty(otherVBKey)) {
//                      for (var y = 0; y < otherVendorBillGrouped[otherVBKey].length; y++) {
//                        jsonObject['entities'][firstLevel]['billpaymentEntries'][secondLevel]['billCreditEntries'][thirdLevel]['vendorBillEntries'][fourthLevel]['otherVBEntries'].push({
//                          otherVendorbillid: otherVendorBillGrouped[otherVBKey][y].tranid,
//
//                        })
//                      }
//
//                    }
//                  }
//
//                  log.debug("otherVendorBillGrouped", otherVendorBillGrouped);
//                }
//                fourthLevel++;
//              }
//              log.debug("billCreditsGrouped", billCreditsGrouped);
//            }
//            thirdLevel++;
//          }
//          // log.error('SEARCH', JSON.parse(searchResultsGroupedByEntityInternalId[entityInternalId][a].creditsappliedobj))
//          //              log.error('vendPaymentArray', vendPaymentArray + " : " + vouchernumber)
//          // if (vendPaymentArray.indexOf(vouchernumber) == -1) {
//          //   var creditz = JSON.parse(searchResultsGroupedByEntityInternalId[entityInternalId][a].creditsappliedobj || '[]').filter(function (m) {
//          //     if (refnumArray.indexOf(m.apldto) > -1) {
//          //       return false
//          //     }
//          //     return true
//          //   }).map(function (m) {
//          //     // log.error('m', JSON.stringify(m))
//          //     vendPaymentArray.push(vouchernumber)
//          //     // log.error('m', JSON.stringify(m))
//
//          //     // var vendCredRec = record.load({
//          //     //   "type": 'vendorcredit',
//          //     //   "id": m.typeid,
//          //     // })
//          //     jsonObject['entities'][firstLevel]['billpaymentEntries'][secondLevel]['billCreditEntries'].push({
//          //       billcreditid: m.typeid,
//          //       vendorbillentries: [{}]
//          //     })
//          //     thirdLevel++;
//          //     // var netAmount = vendCredRec.getValue('usertotal') || 0;
//          //     // var discAmmount = vendCredRec.getValue('discountamount') || 0;
//          //     // var memo = m.apldtoId ?
//          //     //   search.lookupFields({
//          //     //     "type": search.Type.TRANSACTION,
//          //     //     "id": m.apldtoId,
//          //     //     "columns": [
//          //     //       'memo',
//          //     //     ]
//          //     //   }).memo :
//          //     //   '';
//          //     // var refno = m.refno || '';
//          //     // // log.error("memo", memo)
//          //     // if (m.refno.indexOf("00000") != -1) {
//          //     //   refno = (m.refno + "").slice(30, m.refno.length)
//          //     // }
//          //     // var count = vendCredRec.getLineCount('apply')
//
//          //     // for (var x = 0; x < count; x++) {
//          //     //   var apply = vendCredRec.getSublistValue('apply', 'apply', x)
//          //     //   if (apply) {
//          //     //     var amount = vendCredRec.getSublistValue('apply', 'amount', x)
//          //     //     var invoice_total_amount = vendCredRec.getSublistValue('apply', 'total', x)
//          //     //     var disc_line = 0;
//          //     //     var type = vendCredRec.getSublistValue('apply', 'type', x)
//          //     //     var applydate = vendCredRec.getSublistText('apply', 'applydate', x)
//          //     //     var refnum = vendCredRec.getSublistValue('apply', 'refnum', x)
//          //     //     var doc = vendCredRec.getSublistValue('apply', 'doc', x)
//
//          //     //     log.error('refnumArray', refnumArray + " : " + refnum + ' ' + refnumArray.indexOf(refnum))
//          //     //     if (refnumArray.indexOf(refnum) == -1) {
//          //     //       if (type == "Vendor Bill") {
//          //     //         secondTotal += parseFloat(0)
//          //     //         isNgtvStart = '';
//          //     //         isNgtvEnd = '';
//          //     //       } else {
//          //     //         secondTotal -= parseFloat(0)
//          //     //         isNgtvStart = "($";
//          //     //         isNgtvEnd = ")";
//          //     //       }
//
//          //     //       refnumArray.push(refnum)
//          //     //       second.push({
//          //     //         "applyid": doc,
//          //     //         "apldtoType": type,
//          //     //         "apldto": refnum || '',
//          //     //         "memo": memo,
//          //     //         "amountFloat": '$' + 0.00,
//          //     //         "tempInvAmt": 0.00,
//          //     //         "tempDiscAmt": 0.00,
//          //     //         "tempAmt": 0.00,
//          //     //         "invAmt": isNgtvStart + addCommas(parseFloat(0.00)) + isNgtvEnd || '$' + 0.00,
//          //     //         "discAmt": isNgtvStart + addCommas(parseFloat(0.00)) + isNgtvEnd || '$' + 0.00,
//          //     //         "otherDate": applydate || '',
//          //     //         "otherNum": refnum || '',
//          //     //         "invoicenumber": refnum || '',
//          //     //         "amount": isNgtvStart + addCommas(parseFloat(0.00)) + isNgtvEnd || '$' + 0.00,
//          //     //         "donotshow": false,
//          //     //         //      	                "donotshow": true,
//          //     //         vouchernumber: vouchernumber,
//          //     //         entityname: entityname,
//          //     //         entitymsid: entitymsid,
//          //     //         entityinternalid: entityinternalid,
//          //     //         checknumber: checknumber,
//          //     //         invoiceamount: isNgtvStart + addCommas(parseFloat(invoice_total_amount)) + isNgtvEnd || '$' + 0.00,
//          //     //         invoiceamount_raw: parseFloat(invoice_total_amount),
//          //     //         discountamount: isNgtvStart + addCommas(parseFloat(disc_line)) + isNgtvEnd || '$' + 0.00,
//          //     //         discountamount_raw: parseFloat(disc_line),
//          //     //         paymentamount: isNgtvStart + addCommas(parseFloat(amount)) + isNgtvEnd || '$' + 0.00,
//          //     //         paymentamount_raw: parseFloat(amount),
//          //     //       })
//          //     //     } else {
//          //     //       if (type == "Vendor Bill") {
//          //     //         secondTotal += parseFloat(amount)
//          //     //         isNgtvStart = '';
//          //     //         isNgtvEnd = '';
//          //     //       } else {
//          //     //         secondTotal -= parseFloat(amount)
//          //     //         isNgtvStart = "($";
//          //     //         isNgtvEnd = ")";
//          //     //       }
//
//
//
//          //     //       /*vouchernumber = searchResultsGroupedByEntityInternalId[entityInternalId][a].vouchernumber
//          //     //       var entityname = searchResultsGroupedByEntityInternalId[entityInternalId][a].entityname
//          //     //       var entitymsid = searchResultsGroupedByEntityInternalId[entityInternalId][a].entitymsid
//          //     //       var entityinternalid = searchResultsGroupedByEntityInternalId[entityInternalId][a].entityinternalid
//          //     //       var checknumber*/
//
//
//          //     //       refnumArray.push(refnum)
//          //     //       second.push({
//          //     //         "applyid": doc,
//          //     //         "apldtoType": type,
//          //     //         "apldto": refnum || '',
//          //     //         "memo": memo,
//          //     //         "amountFloat": parseFloat(amount) || '$' + 0.00,
//          //     //         "tempInvAmt": amount || 0.00,
//          //     //         "tempDiscAmt": 0.00,
//          //     //         "tempAmt": amount,
//          //     //         "invAmt": isNgtvStart + addCommas(parseFloat(amount)) + isNgtvEnd || '$' + 0.00,
//          //     //         "discAmt": isNgtvStart + addCommas(parseFloat(0.00)) + isNgtvEnd || '$' + 0.00,
//          //     //         "otherDate": applydate || '',
//          //     //         "otherNum": refnum || '',
//          //     //         "invoicenumber": refnum || '',
//          //     //         "amount": isNgtvStart + addCommas(parseFloat(amount)) + isNgtvEnd || '$' + 0.00,
//          //     //         "donotshow": true,
//          //     //         //      	                "donotshow": false,
//          //     //         vouchernumber: vouchernumber,
//          //     //         entityname: entityname,
//          //     //         entitymsid: entitymsid,
//          //     //         entityinternalid: entityinternalid,
//          //     //         checknumber: checknumber,
//          //     //         invoiceamount: isNgtvStart + addCommas(parseFloat(invoice_total_amount)) + isNgtvEnd || '$' + 0.00,
//          //     //         invoiceamount_raw: parseFloat(invoice_total_amount),
//          //     //         discountamount: isNgtvStart + addCommas(parseFloat(disc_line)) + isNgtvEnd || '$' + 0.00,
//          //     //         discountamount_raw: parseFloat(disc_line),
//          //     //         paymentamount: isNgtvStart + addCommas(parseFloat(amount)) + isNgtvEnd || '$' + 0.00,
//          //     //         paymentamount_raw: parseFloat(amount),
//          //     //       })
//          //     //     }
//          //     //   }
//          //     // }
//
//
//          //   })
//          // }
//          //              log.debug("TC10ROD 10292019 second", second)
//          secondLevel++;
//        }
//        // var copySecond = JSON.parse(JSON.stringify(second));
//        // var temp = 0;
//        // var thirdTotal = 0;
//        // for (var x = 0; x <= copySecond.length - 1; x++) {
//
//        //   var vendBillRec = record.load({
//        //     "type": 'vendorbill',
//        //     "id": copySecond[x].applyid,
//        //   })
//
//        //   var count = vendBillRec.getLineCount('links')
//        //   var plus = temp != 0 ? temp + 1 : 1;
//        //   temp = 0;
//        //   for (var z = 0; z < count; z++) {
//        //     var type = vendBillRec.getSublistValue('links', 'type', z);
//        //     if (type == "Bill Credit") {
//        //       var amount = vendBillRec.getSublistValue('links', 'total', z)
//        //       var invoice_total_amount = vendBillRec.getSublistValue('links', 'total', z)
//        //       var disc_line = 0;
//        //       var linkDate = vendBillRec.getSublistText('links', 'trandate', z)
//        //       var refnum = vendBillRec.getSublistValue('links', 'tranid', z)
//        //       var doc = vendBillRec.getSublistValue('links', 'id', z)
//        //       log.error('refnum', refnum)
//
//        //       var details = doc ?
//        //         search.lookupFields({
//        //           "type": search.Type.TRANSACTION,
//        //           "id": doc,
//        //           "columns": [
//        //             'memo',
//        //             'total'
//        //           ]
//        //         }) :
//        //         '';
//
//        //       var memo = '',
//        //         amount = 0;
//        //       if (details) {
//        //         memo = details.memo;
//        //         amount = Math.abs(parseFloat(details.total))
//        //       }
//        //       log.error('details', JSON.stringify(details) + " : " + refnumArray + " : " + refnum + " : " + refnumArray.indexOf(refnum))
//
//        //       if (refnumArray.indexOf(refnum) > -1) {
//        //         if (type == "Vendor Bill") {
//        //           thirdTotal += parseFloat(0)
//        //           isNgtvStart = '';
//        //           isNgtvEnd = '';
//        //         } else {
//        //           thirdTotal -= parseFloat(0)
//        //           isNgtvStart = "($";
//        //           isNgtvEnd = ")";
//        //         }
//
//        //         refnumArray.push(refnum)
//        //         second.splice(x + z + plus, 0, {
//        //           "applyid": doc,
//        //           "apldtoType": type,
//        //           "apldto": '',
//        //           "memo": memo,
//        //           "amountFloat": parseFloat(0) || '$' + 0.00,
//        //           "tempInvAmt": 0.00,
//        //           "tempDiscAmt": 0.00,
//        //           "tempAmt": 0,
//        //           "invAmt": isNgtvStart + addCommas(parseFloat(0.00)) + isNgtvEnd || '$' + 0.00,
//        //           "discAmt": isNgtvStart + addCommas(parseFloat(0.00)) + isNgtvEnd || '$' + 0.00,
//        //           "otherDate": linkDate || '',
//        //           "otherNum": refnum || '',
//        //           "invoicenumber": refnum || '',
//        //           "amount": isNgtvStart + addCommas(parseFloat(0.00)) + isNgtvEnd || '$' + 0.00,
//        //           "donotshow": true,
//        //           vouchernumber: vouchernumber,
//        //           entityname: entityname,
//        //           entitymsid: entitymsid,
//        //           entityinternalid: entityinternalid,
//        //           checknumber: checknumber,
//        //           invoiceamount: isNgtvStart + addCommas(parseFloat(invoice_total_amount)) + isNgtvEnd || '$' + 0.00,
//        //           invoiceamount_raw: parseFloat(invoice_total_amount),
//        //           discountamount: isNgtvStart + addCommas(parseFloat(disc_line)) + isNgtvEnd || '$' + 0.00,
//        //           discountamount_raw: parseFloat(disc_line),
//        //           paymentamount: isNgtvStart + addCommas(parseFloat(amount)) + isNgtvEnd || '$' + 0.00,
//        //           paymentamount_raw: parseFloat(amount),
//        //         })
//        //       } else {
//        //         if (type == "Vendor Bill") {
//        //           thirdTotal += parseFloat(amount)
//        //           isNgtvStart = '';
//        //           isNgtvEnd = '';
//        //         } else {
//        //           thirdTotal -= parseFloat(amount)
//        //           isNgtvStart = "($";
//        //           isNgtvEnd = ")";
//        //         }
//
//        //         refnumArray.push(refnum)
//        //         // log.error('COUNT', x + " : " + z + " : " + plus)
//        //         second.splice(x + z + plus, 0, {
//        //           "applyid": doc,
//        //           "apldtoType": type,
//        //           "apldto": '',
//        //           "memo": memo,
//        //           "amountFloat": parseFloat(amount) || '$' + 0.00,
//        //           "tempInvAmt": amount || 0.00,
//        //           "tempDiscAmt": 0.00,
//        //           "tempAmt": amount,
//        //           "invAmt": isNgtvStart + addCommas(parseFloat(amount)) + isNgtvEnd || '$' + 0.00,
//        //           "discAmt": isNgtvStart + addCommas(parseFloat(0.00)) + isNgtvEnd || '$' + 0.00,
//        //           "otherDate": linkDate || '',
//        //           "otherNum": refnum || '',
//        //           "invoicenumber": refnum || '',
//        //           "amount": isNgtvStart + addCommas(parseFloat(amount)) + isNgtvEnd || '$' + 0.00,
//        //           "donotshow": false,
//        //           vouchernumber: vouchernumber,
//        //           entityname: entityname,
//        //           entitymsid: entitymsid,
//        //           entityinternalid: entityinternalid,
//        //           checknumber: checknumber,
//        //           invoiceamount: isNgtvStart + addCommas(parseFloat(invoice_total_amount)) + isNgtvEnd || '$' + 0.00,
//        //           invoiceamount_raw: parseFloat(invoice_total_amount),
//        //           discountamount: isNgtvStart + addCommas(parseFloat(disc_line)) + isNgtvEnd || '$' + 0.00,
//        //           discountamount_raw: parseFloat(disc_line),
//        //           paymentamount: isNgtvStart + addCommas(parseFloat(amount)) + isNgtvEnd || '$' + 0.00,
//        //           paymentamount_raw: parseFloat(amount),
//        //         })
//        //       }
//
//        //       temp++
//        //     }
//        //   }
//        // }
//        // searchResultsGroupedByEntityInternalId[entityInternalId] = searchResultsGroupedByEntityInternalId[entityInternalId].concat(second);
//        firstLevel++;
//      }
//
//      log.debug("TC10ROD 10292019 searchResultsGroupedByEntityInternalId", searchResultsGroupedByEntityInternalId)
//
//      log.debug("TC05RJD 11082019 jsonObject", JSON.stringify(jsonObject))
//
//      for (var entityInternalId in searchResultsGroupedByEntityInternalId) {
//
//        var totalInvoiceAmount = 0;
//        var totalDiscountAmount = 0;
//        var totalPaymentAmount = 0;
//        totalInvoiceAmount = searchResultsGroupedByEntityInternalId[entityInternalId].reduce(function (accu, res) {
//          return accu + (parseFloat(res['invoiceamount']) || parseFloat(res['amount']) || 0);
//        }, 0);
//        // log.emergency({
//        //   title: 'totalInvoiceAmount',
//        //   details: totalInvoiceAmount
//        // });
//        grandTotalInvoiceAmount += totalInvoiceAmount;
//        totalDiscountAmount = searchResultsGroupedByEntityInternalId[entityInternalId].reduce(function (accu, res) {
//          return accu + (parseFloat(res['discountamount']) || parseFloat(res['discAmt']) || 0);
//        }, 0);
//        // log.emergency({
//        //   title: 'totalDiscountAmount',
//        //   details: totalDiscountAmount
//        // });
//        grandTotalDiscountAmount += totalDiscountAmount;
//        totalPaymentAmount = searchResultsGroupedByEntityInternalId[entityInternalId].reduce(function (accu, res) {
//          return accu + (parseFloat(res['paymentamount']) || 0);
//        }, 0);
//        // log.emergency({
//        //   title: 'totalPaymentAmount',
//        //   details: totalPaymentAmount
//        // });
//        grandTotalPaymentAmount += totalPaymentAmount;
//        tableBody += '<tr class="row-totals">';
//        tableBody += '<td class="left"><p class="left">' + searchResultsGroupedByEntityInternalId[entityInternalId][0]['entityinternalid'] + '</p></td>';
//        tableBody += '<td class="left"><p class="left">' + searchResultsGroupedByEntityInternalId[entityInternalId][0]['entityname'] + '</p></td>';
//        tableBody += '<td></td>'; //Invoice Number
//
//        tableBody += '<td></td>'; //Cheque Number
//
//        tableBody += '<td></td>'; //Voucher Number
//
//        tableBody += '<td class="right"><p class="right">' + format.format({
//          type: format.Type.CURRENCY,
//          value: totalInvoiceAmount
//        }) + '</p></td>';
//        tableBody += '<td class="right"><p class="right">' + format.format({
//          type: format.Type.CURRENCY,
//          value: totalDiscountAmount
//        }) + '</p></td>';
//        tableBody += '<td class="right"><p class="right">' + format.format({
//          type: format.Type.CURRENCY,
//          value: totalPaymentAmount
//        }) + '</p></td>';
//        tableBody += '</tr>';
//        searchResultsGroupedByEntityInternalId[entityInternalId].forEach(function (res) {
//
//          // log.debug("TC10ROD 10302019, current res", res);
//          if (!res['donotshow']) {
//            // log.debug("TC10ROD 10302019, show this res", res);
//            tableBody += '<tr class="row-details">';
//            tableBody += '<td></td>'; //Entity MSID
//
//            tableBody += '<td></td>'; //Entity Name
//
//            tableBody += '<td class="left"><p class="left">' + res['invoicenumber'] + '</p></td>';
//            tableBody += '<td class="left"><p class="left">' + res['checknumber'] + '</p></td>';
//            tableBody += '<td class="left"><p class="left">' + res['vouchernumber'] + '</p></td>';
//            tableBody += '<td class="right"><p class="right">' + format.format({
//              type: format.Type.CURRENCY,
//              //                  value: res['invoiceamount']
//              value: res['invoiceamount']
//            }) + '</p></td>';
//            tableBody += '<td class="right"><p class="right">' + format.format({
//              type: format.Type.CURRENCY,
//              //                  value: res['discountamount']
//              value: res['discountamount']
//            }) + '</p></td>';
//            tableBody += '<td class="right"><p class="right">' + format.format({
//              type: format.Type.CURRENCY,
//              //                  value: res['paymentamount']
//              value: (res['paymentamount'])
//            }) + '</p></td>';
//            tableBody += '</tr>';
//
//
//            totalInvoiceAmount += res.invoiceamount_raw;
//            totalDiscountAmount += res.discountamount_raw;
//            totalPaymentAmount += res.paymentamount_raw;
//
//            // log.debug("zzz grandTotalInvoiceAmount", grandTotalInvoiceAmount)
//            // log.debug("zzz res.invoiceamount_raw", res.invoiceamount_raw)
//            grandTotalInvoiceAmount += Number(res.invoiceamount_raw || 0);
//            grandTotalDiscountAmount += Number(res.discountamount_raw || 0);
//            grandTotalPaymentAmount += Number(res.paymentamount_raw || 0);
//            //                grandTotalDiscountAmount += res.discountamount_raw || 0;
//            grandTotalPaymentAmount += res.paymentamount_raw;
//          } else {
//            // log.debug("TC10ROD 10302019, dont show this res", res);
//          }
//        });
//      }
//
//      // log.debug("TC10ROD 10302019, totalInvoiceAmount", JSON.stringify(grandTotalInvoiceAmount));
//      // log.debug("TC10ROD 10302019, totalDiscountAmount", JSON.stringify(grandTotalDiscountAmount));
//      // log.debug("TC10ROD 10302019, totalPaymentAmount", JSON.stringify(grandTotalPaymentAmount));
//
//      tableBody += '<tr class="row-grandtotals">';
//      tableBody += '<td></td>';
//      tableBody += '<td></td>';
//      tableBody += '<td></td>'; //Invoice Number
//
//      tableBody += '<td></td>'; //Cheque Number
//
//      tableBody += '<td></td>'; //Voucher Number
//
//      grandTotalInvoiceAmount = grandTotalInvoiceAmount || 0.00
//      grandTotalDiscountAmount = grandTotalDiscountAmount || 0.00
//      grandTotalPaymentAmount = grandTotalPaymentAmount || 0.00
//      // log.debug("grandTotalInvoiceAmount", grandTotalInvoiceAmount);
//      // log.debug("grandTotalDiscountAmount", grandTotalDiscountAmount);
//      // log.debug("grandTotalPaymentAmount", grandTotalPaymentAmount);
//
//      tableBody += '<td class="right"><p class="right">' + format.format({
//        type: format.Type.CURRENCY,
//        value: grandTotalInvoiceAmount
//      }) + '</p></td>';
//      tableBody += '<td class="right"><p class="right">' + format.format({
//        type: format.Type.CURRENCY,
//        value: grandTotalDiscountAmount
//      }) + '</p></td>';
//      tableBody += '<td class="right"><p class="right">' + format.format({
//        type: format.Type.CURRENCY,
//        value: grandTotalPaymentAmount
//      }) + '</p></td>';
//      tableBody += '</tr>';
//      log.emergency({
//        title: 'tableBody',
//        details: tableBody
//      }); //region generate pdf
//
//      var template = file.load({
//        id: 'SuiteScripts/004_paymentFileAdministrationPrintoutTemplate.html'
//      }).getContents();
//      template = template.replace('{{report_title}}', 'Payment Register');
//      template = template.replace('{{remitt_id}}', ' ');
//      template = template.replace('{{tablebody}}', tableBody);
//      var templatePlaceHolders = template.match(/({{)(.*?)(}})/g) || []; //match all strings between {}
//
//      templatePlaceHolders = templatePlaceHolders.map(function (placeHolder) {
//        placeHolder = placeHolder.replace('{{', '');
//        placeHolder = placeHolder.replace('}}', '');
//        return placeHolder;
//      });
//      log.emergency({
//        title: 'templatePlaceHolders',
//        details: templatePlaceHolders
//      });
//
//      if (templatePlaceHolders.length > 0) {
//        var recordLookup = search.lookupFields({
//          type: customRecord,
//          id: pfaInternalId,
//          columns: templatePlaceHolders
//        });
//        log.emergency({
//          title: 'recordLookup',
//          details: recordLookup
//        });
//        templatePlaceHolders.forEach(function (placeHolder) {
//          var value = '';
//
//          if (typeof recordLookup[placeHolder] == 'string') {
//            value = recordLookup[placeHolder];
//          }
//
//          if (_typeof(recordLookup[placeHolder]) == 'object') {
//            value = recordLookup[placeHolder][0]['text'];
//          }
//
//          template = template.replace('{{' + placeHolder + '}}', value);
//
//        });
//
//        log.debug("final template after replaces", template)
//      }
//
//      template = template.replace(/&/g, '&amp;');
//      template = template.replace(/null/g, ' ');
//      var xmlFile = render.xmlToPdf({
//        xmlString: template
//      });
//      var pfaName = search.lookupFields({
//        type: customRecord,
//        id: pfaInternalId,
//        columns: 'name'
//      });
//      xmlFile.name = 'Payment Register ' + pfaName['name'] + '.pdf';
//      context.response.writeFile({
//        file: xmlFile,
//        isInline: true
//      }); //endregion generate pdf
    } catch (e) {
      log.emergency({
        title: 'Error in generating Payment Register',
        details: e.message
      });
    }
  };

  var postHandler = function postHandler(context) {}
  var errorHandler = function errorHandler(context) {};

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

  return {
    onRequest: onRequestPrintout
  };
});

//# sourceMappingURL=004SL_paymentFileAdministrationPrintout.js.map