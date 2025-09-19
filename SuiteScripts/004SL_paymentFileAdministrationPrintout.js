"use strict";

function _typeof(obj) { if (typeof Symbol === "function" && typeof Symbol.iterator === "symbol") { _typeof = function _typeof(obj) { return typeof obj; }; } else { _typeof = function _typeof(obj) { return obj && typeof Symbol === "function" && obj.constructor === Symbol && obj !== Symbol.prototype ? "symbol" : typeof obj; }; } return _typeof(obj); }

/**
 * @NApiVersion 2.x
 * @NScriptType Suitelet
 * @NModuleScope SameAccount
 * @Author Antonio E. del Rosario Jr
 * @Email aedelrosariojr@gmail.com
 * @Description
 */
define(['N/search', 'N/http', 'N/render', 'N/record', 'N/file', './lodash.min.js', 'N/format'], function (search, http, render, record, file, _, format) {
  //region common functions
  var mapSearchResultObj = function mapSearchResultObj(searchResults) {
    if (searchResults.length < 1) return [];
    var columnsArray = searchResults[0]['columns'].map(function (col) {
      //array of column 'internalid' ['custpage_something']
      var colLabel = col.label;
      colLabel = colLabel.substring(colLabel.lastIndexOf(' ') + 1);
      return colLabel;
    });
    return searchResults.map(function (res) {
      var obj = {};
      columnsArray.forEach(function (x) {
        var i = getColIndex(searchResults[0]['columns'], x);
        obj[x] = '';
        if (i > -1) obj[x] = res.getValue(searchResults[0]['columns'][i]);
      });
      return obj;
    });
  };

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
      var savedSearchId = 'customsearch_paymentregister';
      var pfaRecord = record.load({
        type: customRecord,
        id: pfaInternalId
      });
      var searchObj = search.load({
        id: savedSearchId
      });
      searchObj.filters.push(search.createFilter({
        name: 'custbody_9997_pfa_record',
        operator: search.Operator.ANYOF,
        values: [pfaInternalId]
      }));
      var searchResults = mapSearchResultObj(getResults(searchObj.run()));

      try {
        var pfaCreditsSearchObj = search.load({
          id: 'customsearch_paymentregistercredits'
        });
        var creditsInternalId = JSON.parse(pfaRecord.getValue({
          fieldId: 'custrecord_2663_applied_credits'
        }));
        var creditsAmount = JSON.parse(pfaRecord.getValue({
          fieldId: 'custrecord_2663_applied_credits_amt'
        }));
        pfaCreditsSearchObj.filterExpression = [['mainline', 'is', true], 'AND', ['internalid', 'anyof', creditsInternalId]];
        var pfaCreditsSearchResults = mapSearchResultObj(getResults(pfaCreditsSearchObj.run()));
        pfaCreditsSearchResults.forEach(function (credit) {
          var __index = creditsInternalId.indexOf(credit['internalid']);

          if (__index > -1) {
            credit['invoiceamount'] = Math.abs(creditsAmount[__index]);
            credit['paymentamount'] = Math.abs(creditsAmount[__index]);
          }
        });
        searchResults = searchResults.concat(pfaCreditsSearchResults);
      } catch (e) {
        log.error({
          title: 'Error',
          details: e.message
        });
      }

      var searchResultsGroupedByEntityInternalId = _.groupBy(searchResults, function (res) {
        return res['entityinternalid'];
      });

      var grandTotalInvoiceAmount = 0;
      var grandTotalDiscountAmount = 0;
      var grandTotalPaymentAmount = 0;
      var tableBody = '';

      for (var entityInternalId in searchResultsGroupedByEntityInternalId) {
        var totalInvoiceAmount = 0;
        var totalDiscountAmount = 0;
        var totalPaymentAmount = 0;
        totalInvoiceAmount = searchResultsGroupedByEntityInternalId[entityInternalId].reduce(function (accu, res) {
          return res['includeincomputation'] != 0 ? accu + parseFloat(res['invoiceamount']) : accu + 0;
        }, 0);
        log.emergency({
          title: 'totalInvoiceAmount',
          details: totalInvoiceAmount
        });
        grandTotalInvoiceAmount += totalInvoiceAmount;
        totalDiscountAmount = searchResultsGroupedByEntityInternalId[entityInternalId].reduce(function (accu, res) {
          return res['includeincomputation'] != 0 ? accu + parseFloat(res['discountamount']) : accu + 0;
        }, 0);
        log.emergency({
          title: 'totalDiscountAmount',
          details: totalDiscountAmount
        });
        grandTotalDiscountAmount += totalDiscountAmount;
        totalPaymentAmount = searchResultsGroupedByEntityInternalId[entityInternalId].reduce(function (accu, res) {
          return res['includeincomputation'] != 0 ? accu + parseFloat(res['paymentamount']) : accu + 0;
        }, 0);
        log.emergency({
          title: 'totalPaymentAmount',
          details: totalPaymentAmount
        });
        grandTotalPaymentAmount += totalPaymentAmount;
        tableBody += '<tr class="row-totals">';
        tableBody += '<td class="left"><p class="left">' + searchResultsGroupedByEntityInternalId[entityInternalId][0]['entityinternalid'] + '</p></td>';
        tableBody += '<td class="left"><p class="left">' + searchResultsGroupedByEntityInternalId[entityInternalId][0]['entityname'] + '</p></td>';
        tableBody += '<td></td>'; //Invoice Number

        tableBody += '<td></td>'; //Cheque Number

        tableBody += '<td></td>'; //Voucher Number

        tableBody += '<td class="right"><p class="right">' + format.format({
          type: format.Type.CURRENCY,
          value: totalInvoiceAmount
        }) + '</p></td>';
        tableBody += '<td class="right"><p class="right">' + format.format({
          type: format.Type.CURRENCY,
          value: totalDiscountAmount
        }) + '</p></td>';
        tableBody += '<td class="right"><p class="right">' + format.format({
          type: format.Type.CURRENCY,
          value: totalPaymentAmount
        }) + '</p></td>';
        tableBody += '</tr>';
        searchResultsGroupedByEntityInternalId[entityInternalId].forEach(function (res) {
          var _invoiceAmountString = format.format({
            type: format.Type.CURRENCY,
            value: res['invoiceamount']
          });

          var _discountAmountString = format.format({
            type: format.Type.CURRENCY,
            value: res['discountamount']
          });

          var _paymentAmountString = format.format({
            type: format.Type.CURRENCY,
            value: res['paymentamount']
          });

          if (res['iscredit'] == 1) {
            _invoiceAmountString = '(' + _invoiceAmountString + ')';
            _discountAmountString = '(' + _discountAmountString + ')';
            _paymentAmountString = '(' + _paymentAmountString + ')';
          }

          tableBody += '<tr class="row-details">';
          tableBody += '<td></td>'; //Entity MSID

          tableBody += '<td></td>'; //Entity Name

          tableBody += '<td class="left"><p class="left">' + res['invoicenumber'] + '</p></td>';
          tableBody += '<td class="left"><p class="left">' + res['checknumber'] + '</p></td>';
          tableBody += '<td class="left"><p class="left">' + res['vouchernumber'] + '</p></td>';
          tableBody += '<td class="right"><p class="right">' + _invoiceAmountString + '</p></td>';
          tableBody += '<td class="right"><p class="right">' + _discountAmountString + '</p></td>';
          tableBody += '<td class="right"><p class="right">' + _paymentAmountString + '</p></td>';
          tableBody += '</tr>';
        });
      }

      tableBody += '<tr class="row-grandtotals">';
      tableBody += '<td></td>';
      tableBody += '<td></td>';
      tableBody += '<td></td>'; //Invoice Number

      tableBody += '<td></td>'; //Cheque Number

      tableBody += '<td></td>'; //Voucher Number

      tableBody += '<td class="right"><p class="right">' + format.format({
        type: format.Type.CURRENCY,
        value: grandTotalInvoiceAmount
      }) + '</p></td>';
      tableBody += '<td class="right"><p class="right">' + format.format({
        type: format.Type.CURRENCY,
        value: grandTotalDiscountAmount
      }) + '</p></td>';
      tableBody += '<td class="right"><p class="right">' + format.format({
        type: format.Type.CURRENCY,
        value: grandTotalPaymentAmount
      }) + '</p></td>';
      tableBody += '</tr>';
      log.emergency({
        title: 'tableBody',
        details: tableBody
      }); //region generate pdf

      var template = file.load({
        id: 'SuiteScripts/004_paymentFileAdministrationPrintoutTemplate.html'
      }).getContents();
      template = template.replace('{{report_title}}', 'Payment Register');
      template = template.replace('{{remitt_id}}', ' ');
      template = template.replace('{{tablebody}}', tableBody);
      var templatePlaceHolders = template.match(/({{)(.*?)(}})/g) || []; //match all strings between {}

      templatePlaceHolders = templatePlaceHolders.map(function (placeHolder) {
        placeHolder = placeHolder.replace('{{', '');
        placeHolder = placeHolder.replace('}}', '');
        return placeHolder;
      });
      log.emergency({
        title: 'templatePlaceHolders',
        details: templatePlaceHolders
      });

      if (templatePlaceHolders.length > 0) {
        var recordLookup = search.lookupFields({
          type: customRecord,
          id: pfaInternalId,
          columns: templatePlaceHolders
        });
        log.emergency({
          title: 'recordLookup',
          details: recordLookup
        });
        templatePlaceHolders.forEach(function (placeHolder) {
          var value = '';

          if (typeof recordLookup[placeHolder] == 'string') {
            value = recordLookup[placeHolder];
          }

          if (_typeof(recordLookup[placeHolder]) == 'object') {
            value = recordLookup[placeHolder][0]['text'];
          }

          template = template.replace('{{' + placeHolder + '}}', value);
        });
      }

      template = template.replace(/&/g, '&amp;');
      template = template.replace(/null/g, ' ');
      var xmlFile = render.xmlToPdf({
        xmlString: template
      });
      var pfaName = search.lookupFields({
        type: customRecord,
        id: pfaInternalId,
        columns: 'name'
      });
      xmlFile.name = 'Payment Register ' + pfaName['name'] + '.pdf';
      context.response.writeFile({
        file: xmlFile,
        isInline: true
      }); //endregion generate pdf
    } catch (e) {
      log.emergency({
        title: 'Error in generating Payment Register',
        details: e.message
      });
    }
  };

  var postHandler = function postHandler(context) {};

  var errorHandler = function errorHandler(context) {};

  return {
    onRequest: onRequestPrintout
  };
});

//# sourceMappingURL=004SL_paymentFileAdministrationPrintout.js.map