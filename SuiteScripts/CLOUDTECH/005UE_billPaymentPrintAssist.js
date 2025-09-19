/** 
 * @NApiVersion 2.x
 * @NScriptType UserEventScript
 */

const MODULES = [
  'N/ui/serverWidget',
  'N/record',
  'N/search',
  'N/format',
  'N/file',
  'N/url',
  'N/runtime',
  'N/email'
];

define(MODULES, function (ui, record, search, format, file, url, runtime, email) {

  function sortByKey(array, key) {
    return array.sort(function (a, b) {
      var x = a[key];
      var y = b[key];
      return ((x > y) ? -1 : ((x < y) ? 1 : 0));
    });
  }

  /**
   * Removes Duplicates
   * used via array.filter
   * 
   */
  function removeDuplicates(x, i, arr) {
    return arr.indexOf(x) == i;
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
  };

  function getVendorBill(params) {
    var columns = [
      'tranid',
      'internalid',
      'appliedtotransaction',
      search.createColumn({
        name: 'tranid',
        join: 'appliedtotransaction'
      }),
      search.createColumn({
        name: 'custbody_sii_ref_no',
        join: 'appliedtotransaction'
      }),
      search.createColumn({
        name: 'amount',
        join: 'appliedtotransaction'
      }),
      search.createColumn({
        name: 'trandate',
        join: 'appliedtotransaction'
      }),
      search.createColumn({
        name: 'memo',
        join: 'appliedtotransaction'
      }),
    ];

    var searchObj = search.create({
      'type': search.Type.TRANSACTION,
      'columns': columns,
      'isPublic': true
    })

    searchObj.filters.push(search.createFilter({
      'name': 'type',
      'operator': search.Operator.ANYOF,
      'values': ["VendCred"]
    }));
    searchObj.filters.push(search.createFilter({
      'name': 'mainline',
      'operator': search.Operator.ANYOF,
      'values': ["T"]
    }));
    // var savedSearchId = 'customsearch_010util_getvendorbills4pymt';
    // var searchObj = search.load({
    //   id: savedSearchId
    // });
    if (params.length > 0) {
      searchObj.filters.push(search.createFilter({
        name: 'appliedtotransaction',
        operator: search.Operator.ANYOF,
        values: params
      }));
    }
    var results = getResults(searchObj.run()).map(function (x) {
      return {
        id: x.id,
        docnum: x.getValue(x.columns[3]),
        internalid: x.getValue(x.columns[1]),
        applyingtransaction: x.getValue(x.columns[2]),
        applyingtransactionTxt: x.getText(x.columns[2]),
        tranid: x.getValue(x.columns[0]),
        amount: x.getValue(x.columns[5]) || 0.00,
        trandate: x.getValue(x.columns[6]),
        memo: x.getValue(x.columns[7]) || '',
      };
    });
    return results
  }

  function getBillCredits(params) {
    var columns = [
      'tranid',
      'internalid',
      'APPLYINGTRANSACTION',
      search.createColumn({
        name: 'total',
        join: 'APPLYINGTRANSACTION'
      }),
      search.createColumn({
        name: 'transactionnumber',
        join: 'APPLYINGTRANSACTION'
      }),
      search.createColumn({
        name: 'paidamount',
        join: 'APPLYINGTRANSACTION'
      }),
      'invoicenum',
      search.createColumn({
        name: 'memo',
        join: 'APPLYINGTRANSACTION'
      }),
      'trandate',
      search.createColumn({
        name: 'tranid',
        join: 'APPLYINGTRANSACTION'
      }),
    ];

    var searchObj = search.create({
      'type': search.Type.TRANSACTION,
      'columns': columns,
      'isPublic': true
    })

    searchObj.filters.push(search.createFilter({
      'name': 'type',
      'operator': search.Operator.ANYOF,
      'values': ["VendBill"]
    }));
    searchObj.filters.push(search.createFilter({
      'name': 'type',
      'operator': search.Operator.ANYOF,
      'join': 'APPLYINGTRANSACTION',
      'values': ["VendCred"]
    }));
    // var savedSearchId = 'customsearch_010util_getvendorbills4pymt';
    // var searchObj = search.load({
    //   id: savedSearchId
    // });
    if (params.length > 0) {
      searchObj.filters.push(search.createFilter({
        name: 'APPLYINGTRANSACTION',
        operator: search.Operator.ANYOF,
        values: params
      }));
    }
    var results = getResults(searchObj.run()).map(function (x) {
      return {
        id: x.id,
        docnum: x.getValue(x.columns[9]),
        internalid: x.getValue(x.columns[1]),
        applyingtransaction: x.getValue(x.columns[2]),
        applyingtransactionTxt: x.getText(x.columns[2]),
        amount: Math.abs(x.getValue(x.columns[3])) || 0.00,
        tranid: x.getValue(x.columns[4]),
        amountPaid: Math.abs(x.getValue(x.columns[5])) || 0.00,
        memo: x.getValue(x.columns[7]) || '',
        trandate: x.getValue(x.columns[8])
      };
    });
    return results
  }

  function sumFunction(accumulator, currentItem, currentIndex) {
    // look up if the current item is of a category that is already in our end result.
    log.error('currentitem', JSON.stringify(currentItem));
    var index = -1;
    for (var i = 0; i < accumulator.length; i++) {
      var otherNum = accumulator[i].otherNum;
      var tempOtherNum = currentItem.otherNum
      if (otherNum === tempOtherNum) {
        index = i
      }
    }
    var isNgtvStart = "";
    var isNgtvEnd = "";
    var i = 1;
    if (currentItem.apldtoType.indexOf("Vendor Bill") != 0) {
      isNgtvStart = "($";
      isNgtvEnd = ")";
    }
    log.error('index', index)
    if (index < 0) {
      currentItem.tempAmt
      accumulator.push(currentItem); // now item added to the array
    } else {
      if (!accumulator[index + i]) {
        accumulator[index + i] = {
          "apldto": '',
          "amountFloat": '$' + 0.00,
          "tempInvAmt": 0.00,
          "tempDiscAmt": 0.00,
          "tempAmt": 0.00,
          "invAmt": '$' + 0.00,
          "discAmt": '$' + addCommas(parseFloat(0.00)),
          "otherDate": '',
          "otherNum": '',
          "amount": '',
        }
      }
      accumulator[index + i].otherDate = currentItem.otherDate
      accumulator[index + i].otherNum = currentItem.apldto
      accumulator[index].tempInvAmt = parseFloat(currentItem.tempInvAmt) // update the sum of already existing item
      accumulator[index].tempDiscAmt = parseFloat(currentItem.tempDiscAmt)
      accumulator[index].tempAmt += parseFloat(currentItem.tempAmt)
      accumulator[index + i].tempAmt = parseFloat(currentItem.tempInvAmt - currentItem.tempDiscAmt)
      accumulator[index + i].invAmt = isNgtvStart + addCommas(parseFloat(accumulator[index].tempInvAmt)) + isNgtvEnd
      accumulator[index + i].discAmt = isNgtvStart + addCommas(parseFloat(accumulator[index].tempDiscAmt)) + isNgtvEnd
      accumulator[index].amount = "($" + addCommas(parseFloat(accumulator[index].tempAmt)) + ")"
      accumulator[index + i].amount = isNgtvStart + addCommas(parseFloat(accumulator[index + 1].tempAmt)) + isNgtvEnd
      accumulator[index].invAmt = "($" + addCommas(parseFloat(accumulator[index].tempAmt)) + ")"
      i++;
    }
    log.error('test', accumulator)
    return accumulator;
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

  function beforeLoad(ctx) {
    var USER = runtime.getCurrentUser();
    var rec = ctx.newRecord;
    var id = ctx.newRecord.id;
    var type = ctx.newRecord.type;
    var form = ctx.form;
    if (ctx.type == 'view') {
      try {
        var html = form.addField({
          id: 'custpage_custbody_inlinehtml',
          type: 'inlinehtml',
          label: 'CUSTOM SCRIPT',
          source: null,
          container: 's_sysinfo'
        });
        // lc - iupdate natin ung credits applied na field on view
        var script = '<script>' +
          'var $ = jQuery;' +
          '$(document).ready(function() {' +
          'var result = [];' +
          'var creditsApplied = $("table#credit_splits tr").length;' +
          'console.log("creditsApplied", creditsApplied);' +
          'try {' +
          'if (creditsApplied >= 2 && $("table#credit_splits tr:nth-child(2) td:nth-child(1) a").attr("href")); {' +
          'for (var i = 2; i <= creditsApplied; i++) {' +
          'result.push({' +
          'apldtoId: $("table#credit_splits tr:nth-child("+i+") td:nth-child(4) a").attr("href").split("id=")[1],' +
          'apldto: $("table#credit_splits tr:nth-child("+i+") td:nth-child(4) a").text().split("#")[1],' +
          'apldtoType: $("table#credit_splits tr:nth-child("+i+") td:nth-child(4) a").text().split("#")[0],' +
          'date: $("table#credit_splits tr:nth-child(" + i + ") td:nth-child(1) a").html(),' +
          'typeid: $("table#credit_splits tr:nth-child("+i+") td:nth-child(2) a").attr("href").split("id=")[1],' +
          'type: $("table#credit_splits tr:nth-child(" + i + ") td:nth-child(2) a").text(),' +
          'refno: $("table#credit_splits tr:nth-child(" + i + ") td:nth-child(3) span").text(),' +
          'amount: parseFloat($("table#credit_splits tr:nth-child(" + i + ") td:nth-child(6)").text().replace(/,/g, "")) || 0' +
          '});' +
          '}' +
          '}' +
          'result = result.filter(function(f) {return f.type!="" && f.type != null});' +
          'console.log(result);' +
          'nlapiSubmitField(nlapiGetRecordType(), nlapiGetRecordId(), "custbody_creditsapplied", JSON.stringify(result));' +
          '$("td#tdbody_menu_print").click(function() {' +
          'location.reload();' +
          '});' +
          '} catch(e) {' +
          'console.log(e);' +
          '}' +
          '})' +
          '</script>'
        html.defaultValue = script
        log.error('field added!')
      } catch (e) {
        log.error('error', e.message)
      }
    }
    if (ctx.type == 'print') {
      if (!rec.id) return;
      log.error('custbody_creditsapplied', rec.getValue('custbody_creditsapplied'))
      var rec = record.load({
        type: type,
        id: id
      })

      var isNgtvStart = "";
      var isNgtvEnd = "";

      var subsidiary = rec.getValue('subsidiary')
      log.error('subsidiary', subsidiary);

      var count = rec.getLineCount({
        "sublistId": "apply"
      });
      log.error('creditz', creditz);
      log.error('count', count);
      var glLines = [];
      var refnumArray = [];
      var billCreditsRefnumArray = []
      var glLinesTotal = 0;
      for (var i = 0; i < count; i++) {
        var apply = rec.getSublistValue({
          sublistId: 'apply',
          fieldId: 'apply',
          line: i
        });
        // log.error('apply', apply);
        if (apply) {
          var internalid = rec.getSublistText({
            sublistId: 'apply',
            fieldId: 'internalid',
            line: i
          }) || '';
          var duedate = rec.getSublistText({
            sublistId: 'apply',
            fieldId: 'duedate',
            line: i
          }) || '';
          var refnum = rec.getSublistValue({
            sublistId: 'apply',
            fieldId: 'refnum',
            line: i
          }) || '';
          var total = parseFloat(rec.getSublistValue({
            sublistId: 'apply',
            fieldId: 'total',
            line: i
          }) || 0);
          var disc = parseFloat(rec.getSublistValue({
            sublistId: 'apply',
            fieldId: 'disc',
            line: i
          }) || 0);
          var amount = parseFloat(rec.getSublistValue({
            sublistId: 'apply',
            fieldId: 'amount',
            line: i
          }) || 0);
          // for (var x = 0; x < creditz.length; x++) {
          //   var apldto = creditz[x].apldto;
          //   if (apldto == internalid) {
          //     log.error('creditz.amountFloat', creditz[x].amountFloat);
          //     creditz.splice(x, 1)
          //   }
          // }
          var paymentAmount = amount;
          amount = total - parseFloat(disc);

          // log.error('amount', amount);
          var name = internalid ?
            search.lookupFields({
              "type": search.Type.TRANSACTION,
              "id": internalid,
              "columns": [
                'memo'
              ]
            }).memo :
            '';
          log.error('amount', amount);
          refnumArray.push(refnum)
          glLinesTotal += parseFloat(paymentAmount)
          glLines.push({
            "apldto": '',
            "invAmt": '$' + addCommas(parseFloat(total)) || '$' + 0.00,
            "discAmt": '$' + addCommas(parseFloat(disc)) || '$' + 0.00,
            "memo": name,
            "otherDate": duedate || '',
            "otherNum": refnum || '',
            "amount": '$' + addCommas(parseFloat(amount)) || '$' + 0.00,
            "tempAmt": parseFloat(amount) || 0.00,
            "show": true
          })
        }
      }

      var second = [];
      var indexChecker = {};
      var secondTotal = 0;
      var thirdTotal = 0;
      log.error('refnumArray', JSON.stringify(refnumArray))
      var billCreditsIds = [];
      log.error('refnumArray', JSON.stringify(rec.getValue('custbody_creditsapplied')))
      var creditz = JSON.parse(rec.getValue('custbody_creditsapplied') || '[]').filter(function (m) {
        log.error('sample', refnumArray + " : " + m.apldto + " : " + refnumArray.indexOf(m.apldto))
        if (refnumArray.indexOf(m.typeid) > -1) {
          return false
        }
        return true
      }).map(function (m) {
        // log.error('m', JSON.stringify(m))
        // billCreditsIds.push(m.typeid)
        // var vendCredRec = record.load({
        //   "type": 'vendorcredit',
        //   "id": m.typeid,
        // })

        var memo = m.apldtoId ?
          search.lookupFields({
            "type": search.Type.TRANSACTION,
            "id": m.apldtoId,
            "columns": [
              'memo',
            ]
          }).memo :
          '';
        // var memo = vendCredRec.getValue('memo') || '';
        var refno = m.refno || '';
        log.error("memo", memo)
        if (m.refno.indexOf("00000") != -1) {
          refno = (m.refno + "").slice(30, m.refno.length)
        }
        // var count = vendCredRec.getLineCount('apply')

        var amount = m.amount;
        var type = m.type
        var applydate = m.date
        var refnum = m.apldto
        var doc = m.refno.toLowerCase()
        if (billCreditsRefnumArray.indexOf(doc) > -1) {
          log.error('m false', JSON.stringify(m))
          isNgtvStart = "($";
          isNgtvEnd = ")";
          var index = indexChecker[doc];
          log.error('second', JSON.stringify(second) + " : " + JSON.stringify(second[index]))
          second[index].tempAmt += parseFloat(amount);
          second[index].invAmt = isNgtvStart + addCommas(parseFloat(second[index].tempAmt)) + isNgtvEnd || '$' + 0.00;
          second[index].discAmt = isNgtvStart + addCommas(parseFloat(0.00)) + isNgtvEnd || '$' + 0.00;
          second[index].amount = isNgtvStart + addCommas(parseFloat(second[index].tempAmt)) + isNgtvEnd || '$' + 0.00;

          // second.push({
          //   "applyid": doc,
          //   "apldtoType": type,
          //   "apldto": refnum || '',
          //   "memo": memo,
          //   "amountFloat": '$' + 0.00,
          //   "tempInvAmt": 0.00,
          //   "tempDiscAmt": 0.00,
          //   "tempAmt": 0.00,
          //   "invAmt": isNgtvStart + addCommas(parseFloat(0.00)) + isNgtvEnd || '$' + 0.00,
          //   "discAmt": isNgtvStart + addCommas(parseFloat(0.00)) + isNgtvEnd || '$' + 0.00,
          //   "otherDate": applydate || '',
          //   "otherNum": refno || '',
          //   "amount": isNgtvStart + addCommas(parseFloat(0.00)) + isNgtvEnd || '$' + 0.00,
          //   "show": false
          // })
        } else {
          log.error('m true', JSON.stringify(m))
          // secondTotal -= parseFloat(amount)
          isNgtvStart = "($";
          isNgtvEnd = ")";

          billCreditsRefnumArray.push(doc)


          second.push({
            "applyid": doc,
            "apldtoType": type,
            "apldto": refnum || '',
            "memo": memo,
            "amountFloat": parseFloat(amount) || '$' + 0.00,
            "tempInvAmt": amount || 0.00,
            "tempDiscAmt": 0.00,
            "tempAmt": amount,
            "invAmt": isNgtvStart + addCommas(parseFloat(amount)) + isNgtvEnd || '$' + 0.00,
            "discAmt": isNgtvStart + addCommas(parseFloat(0.00)) + isNgtvEnd || '$' + 0.00,
            "otherDate": applydate || '',
            "otherNum": refno || '',
            "amount": isNgtvStart + addCommas(parseFloat(amount)) + isNgtvEnd || '$' + 0.00,
            "show": true
          })
          if (!indexChecker[doc]) {
            indexChecker[doc] = second.length - 1
          }
        }
        // for (var x = 0; x < count; x++) {
        //   var apply = vendCredRec.getSublistValue('apply', 'apply', x)
        //   if (apply) {
        //     var amount = vendCredRec.getSublistValue('apply', 'total', x)
        //     var type = vendCredRec.getSublistValue('apply', 'type', x)
        //     var applydate = vendCredRec.getSublistText('apply', 'applydate', x)
        //     var refnum = vendCredRec.getSublistValue('apply', 'apldto', x)
        //     var doc = vendCredRec.getSublistValue('apply', 'doc', x)
        //     log.error("refnum", refnum)
        //     log.error("type", type)

        //     if (refnumArray.indexOf(refnum) > -1) {
        //       isNgtvStart = "($";
        //       isNgtvEnd = ")";

        //       second.push({
        //         "applyid": doc,
        //         "apldtoType": type,
        //         "apldto": refnum || '',
        //         "memo": memo,
        //         "amountFloat": '$' + 0.00,
        //         "tempInvAmt": 0.00,
        //         "tempDiscAmt": 0.00,
        //         "tempAmt": 0.00,
        //         "invAmt": isNgtvStart + addCommas(parseFloat(0.00)) + isNgtvEnd || '$' + 0.00,
        //         "discAmt": isNgtvStart + addCommas(parseFloat(0.00)) + isNgtvEnd || '$' + 0.00,
        //         "otherDate": applydate || '',
        //         "otherNum": refno || '',
        //         "amount": isNgtvStart + addCommas(parseFloat(0.00)) + isNgtvEnd || '$' + 0.00,
        //         "show": false
        //       })
        //     } else {

        //       // secondTotal -= parseFloat(amount)
        //       isNgtvStart = "($";
        //       isNgtvEnd = ")";

        //       refnumArray.push(refnum)
        //       second.push({
        //         "applyid": doc,
        //         "apldtoType": type,
        //         "apldto": refnum || '',
        //         "memo": memo,
        //         "amountFloat": parseFloat(amount) || '$' + 0.00,
        //         "tempInvAmt": amount || 0.00,
        //         "tempDiscAmt": 0.00,
        //         "tempAmt": amount,
        //         "invAmt": isNgtvStart + addCommas(parseFloat(amount)) + isNgtvEnd || '$' + 0.00,
        //         "discAmt": isNgtvStart + addCommas(parseFloat(0.00)) + isNgtvEnd || '$' + 0.00,
        //         "otherDate": applydate || '',
        //         "otherNum": refno || '',
        //         "amount": isNgtvStart + addCommas(parseFloat(amount)) + isNgtvEnd || '$' + 0.00,
        //         "show": true
        //       })
        //     }
        //   }
        // }
      })
      // log.error('billCreditsIds', JSON.stringify(billCreditsIds))
      // if (billCreditsIds.length > 0) {
      //   var billCredits = getBillCredits(billCreditsIds)
      //   log.error('billCredits', JSON.stringify(billCredits))
      //   var billCreditFrmBpId = [];
      //   for (var i = 0; i < billCredits.length; i++) {
      //     var internalid = billCredits[i].id;
      //     billCreditFrmBpId.push(internalid);

      //     var refnum = billCredits[i].docnum;
      //     var memo = billCredits[i].memo;
      //     var applyingtransactionTxt = billCredits[i].applyingtransactionTxt;
      //     var amount = billCredits[i].amountPaid;
      //     var applydate = billCredits[i].trandate;

      //     if (refnumArray.indexOf(refnum) > -1) {
      //       // secondTotal -= parseFloat(amount);
      //       second.push({
      //         "applyid": applyingtransactionTxt,
      //         "apldtoType": '',
      //         "apldto": refnum || '',
      //         "memo": memo,
      //         "amountFloat": parseFloat(amount) || '$' + 0.00,
      //         "tempInvAmt": amount || 0.00,
      //         "tempDiscAmt": 0.00,
      //         "tempAmt":  (parseFloat(amount) * -1),
      //         "invAmt": "($" + addCommas(parseFloat(amount)) + ")" || '$' + 0.00,
      //         "discAmt": "($" + addCommas(parseFloat(0.00)) + ")" || '$' + 0.00,
      //         "otherDate": applydate || '',
      //         "otherNum": refnum || '',
      //         "amount": "($" + addCommas(parseFloat(amount)) + ")" || '$' + 0.00,
      //         "show": false
      //       })
      //     } else {
      //       // secondTotal -= parseFloat(amount);
      //       second.push({
      //         "applyid": applyingtransactionTxt,
      //         "apldtoType": '',
      //         "apldto": refnum || '',
      //         "memo": memo,
      //         "amountFloat": parseFloat(amount) || '$' + 0.00,
      //         "tempInvAmt": amount || 0.00,
      //         "tempDiscAmt": 0.00,
      //         "tempAmt": (parseFloat(amount) * -1),
      //         "invAmt": "($" + addCommas(parseFloat(amount)) + ")" || '$' + 0.00,
      //         "discAmt": "($" + addCommas(parseFloat(0.00)) + ")" || '$' + 0.00,
      //         "otherDate": applydate || '',
      //         "otherNum": refnum || '',
      //         "amount": "($" + addCommas(parseFloat(amount)) + ")" || '$' + 0.00,
      //         "show": true
      //       })
      //     }
      //     refnumArray.push(refnum)
      //   }

      //   // log.error('billCreditsIds', JSON.stringify(billCreditsIds));
      //   // log.error('getBillCredits', JSON.stringify(billCredits));
      //   billCreditFrmBpId = billCreditFrmBpId.filter(removeDuplicates)
      //   var vendorBill = getVendorBill(billCreditFrmBpId)

      //   // log.error('billCreditFrmBpId', JSON.stringify(billCreditFrmBpId));
      //   // log.error('vendorBill', JSON.stringify(vendorBill));

      //   for (var i = 0; i < vendorBill.length; i++) {
      //     var internalid = billCredits[i].id;
      //     var refnum = vendorBill[i].docnum;
      //     var memo = vendorBill[i].memo;
      //     var applyingtransactionTxt = vendorBill[i].applyingtransactionTxt;
      //     var amount = vendorBill[i].amount;
      //     var applydate = vendorBill[i].trandate;

      //     if (refnumArray.indexOf(refnum) > -1) {
      //       // thirdTotal += parseFloat(amount);
      //       // second.push({
      //       //   "applyid": applyingtransactionTxt,
      //       //   "apldtoType": '',
      //       //   "apldto": refnum || '',
      //       //   "memo": memo,
      //       //   "amountFloat": parseFloat(amount) || '$' + 0.00,
      //       //   "tempInvAmt": amount || 0.00,
      //       //   "tempDiscAmt": 0.00,
      //       //   "tempAmt": parseFloat(amount),
      //       //   "invAmt": isNgtvStart + "$" + addCommas(parseFloat(amount)) + isNgtvEnd || '$' + 0.00,
      //       //   "discAmt": isNgtvStart + "$" + addCommas(parseFloat(0.00)) + isNgtvEnd || '$' + 0.00,
      //       //   "otherDate": applydate || '',
      //       //   "otherNum": refnum || '',
      //       //   "amount": isNgtvStart + "$" + addCommas(parseFloat(amount)) + isNgtvEnd || '$' + 0.00,
      //       //   "show": false
      //       // })
      //     } else {
      //       // thirdTotal += parseFloat(amount);
      //       // second.push({
      //       //   "applyid": applyingtransactionTxt,
      //       //   "apldtoType": '',
      //       //   "apldto": refnum || '',
      //       //   "memo": memo,
      //       //   "amountFloat": parseFloat(amount) || '$' + 0.00,
      //       //   "tempInvAmt": amount || 0.00,
      //       //   "tempDiscAmt": 0.00,
      //       //   "tempAmt": parseFloat(amount),
      //       //   "invAmt": isNgtvStart + "$" + addCommas(parseFloat(amount)) + isNgtvEnd || '$' + 0.00,
      //       //   "discAmt": isNgtvStart + "$" + addCommas(parseFloat(0.00)) + isNgtvEnd || '$' + 0.00,
      //       //   "otherDate": applydate || '',
      //       //   "otherNum": refnum || '',
      //       //   "amount": isNgtvStart + "$" + addCommas(parseFloat(amount)) + isNgtvEnd || '$' + 0.00,
      //       //   "show": true
      //       // })
      //     }
      //     refnumArray.push(refnum)
      //   }
      // }

      // var copySecond = JSON.parse(JSON.stringify(second));
      // var temp = 0;

      // for (var x = 0; x <= copySecond.length - 1; x++) {

      //   var vendBillRec = record.load({
      //     "type": 'vendorbill',
      //     "id": copySecond[x].applyid,
      //   })

      //   var count = vendBillRec.getLineCount('links')
      //   var plus = temp != 0 ? temp + 1 : 1;
      //   temp = 0;
      //   for (var z = 0; z < count; z++) {
      //     var type = vendBillRec.getSublistValue('links', 'type', z);
      //     if (type == "Bill Credit") {
      //       var amount = vendBillRec.getSublistValue('links', 'total', z)
      //       var linkDate = vendBillRec.getSublistText('links', 'trandate', z)
      //       var refnum = vendBillRec.getSublistValue('links', 'tranid', z)
      //       var doc = vendBillRec.getSublistValue('links', 'id', z)
      //       log.error('refnum', refnum)

      //       var details = doc ?
      //         search.lookupFields({
      //           "type": search.Type.TRANSACTION,
      //           "id": doc,
      //           "columns": [
      //             'memo',
      //             'total'
      //           ]
      //         }) :
      //         '';

      //       var memo = '',
      //         amount = 0;
      //       if (details) {
      //         memo = details.memo;
      //         amount = Math.abs(parseFloat(details.total))
      //       }
      //       log.error('details', JSON.stringify(details))

      //       if (refnumArray.indexOf(refnum) > -1) {
      //         if (type == "Vendor Bill") {
      //           thirdTotal += parseFloat(0)
      //           isNgtvStart = '';
      //           isNgtvEnd = '';
      //         } else {
      //           thirdTotal -= parseFloat(0)
      //           isNgtvStart = "($";
      //           isNgtvEnd = ")";
      //         }

      //         refnumArray.push(refnum)
      //         second.splice(x + z + plus, 0, {
      //           "applyid": doc,
      //           "apldtoType": type,
      //           "apldto": '',
      //           "memo": memo,
      //           "amountFloat": parseFloat(0) || '$' + 0.00,
      //           "tempInvAmt": 0.00,
      //           "tempDiscAmt": 0.00,
      //           "tempAmt": 0,
      //           "invAmt": isNgtvStart + addCommas(parseFloat(0.00)) + isNgtvEnd || '$' + 0.00,
      //           "discAmt": isNgtvStart + addCommas(parseFloat(0.00)) + isNgtvEnd || '$' + 0.00,
      //           "otherDate": linkDate || '',
      //           "otherNum": refnum || '',
      //           "amount": isNgtvStart + addCommas(parseFloat(0.00)) + isNgtvEnd || '$' + 0.00,
      //           "show": false
      //         })
      //       } else {
      //         if (type == "Vendor Bill") {
      //           thirdTotal += parseFloat(amount)
      //           isNgtvStart = '';
      //           isNgtvEnd = '';
      //         } else {
      //           thirdTotal -= parseFloat(amount)
      //           isNgtvStart = "($";
      //           isNgtvEnd = ")";
      //         }

      //         refnumArray.push(refnum)
      //         log.error('COUNT', x + " : " + z + " : " + plus)
      //         second.splice(x + z + plus, 0, {
      //           "applyid": doc,
      //           "apldtoType": type,
      //           "apldto": '',
      //           "memo": memo,
      //           "amountFloat": parseFloat(amount) || '$' + 0.00,
      //           "tempInvAmt": amount || 0.00,
      //           "tempDiscAmt": 0.00,
      //           "tempAmt": amount,
      //           "invAmt": isNgtvStart + addCommas(parseFloat(amount)) + isNgtvEnd || '$' + 0.00,
      //           "discAmt": isNgtvStart + addCommas(parseFloat(0.00)) + isNgtvEnd || '$' + 0.00,
      //           "otherDate": linkDate || '',
      //           "otherNum": refnum || '',
      //           "amount": isNgtvStart + addCommas(parseFloat(amount)) + isNgtvEnd || '$' + 0.00,
      //           "show": true
      //         })
      //       }

      //       temp++
      //     }
      //   }
      // }
      // log.error('error', JSON.stringify(creditz))
      // log.error('second', JSON.stringify(second))
      // creditz = creditz.reduce(sumFunction, []);

      log.error('glLines', glLines);
      // search ac codes and particulars of each credits applied from ss
      // for (var i in creditz) {
      //   _ = creditz[i]
      //   idx = glLines.map(function (m) {
      //     return m.apldto
      //   }).indexOf(_.apldto)
      //   if (idx > -1) {
      //     _.accountId = glLines[idx].accountId
      //     _.accountCode = glLines[idx].accountCode
      //     _.name = glLines[idx].name
      //   }
      // }
      // append credits applied data
      glLines = sortByKey(glLines, 'tempAmt')
      second = sortByKey(second, 'tempAmt')
      glLines = glLines.concat(second)
      // log.error('glines', glLines);
      var filtered = glLines.filter(function (el) {
        return el;
      });

      var totalValue = glLinesTotal + secondTotal + thirdTotal
      log.error('TOTALS', glLinesTotal + " : " + secondTotal + " : " + thirdTotal);

      var rows = (function () {

        var tbl = '';

        filtered.forEach(function (x) {
          // log.error('x', x);
          if (x.show) {
            //make ANS/TIMBER subsidiary behave same way for MEMO portion as requested by Katherine c/o Rodmar 5 is ANS 2 is timber
            //if (subsidiary == 5){
            if (subsidiary == 5 || subsidiary == 2) {
              tbl += '<tr style="height:12pt; width: 100%;">' +
                '<td style="width: 13%; text-align: justify" align="center">' +
                '<p class="centerAlign">' + x.otherDate + '</p>' +
                '</td>' +
                '<td style="width: 16%; text-align: justify" align="center">' +
                '<p>' + x.otherNum + '</p>' +
                '</td>' +
                '<td style="width: 18%; text-align: justify" align="center">' +
                '<p>' + x.memo + '</p>' +
                '</td>' +
                '<td style="width: 16%; text-align: justify" align="right">' +
                '<p class="centerAlign">' + x.invAmt + '</p>' +
                '</td>' +
                '<td style="width: 16%; text-align: justify" align="right">' +
                '<p class="centerAlign">' + x.discAmt + '</p>' +
                '</td>' +
                '<td style="width: 16%; text-align: justify" align="right">' +
                '<p class="centerAlign">' + x.amount + '</p>' +
                '</td>' +
                '<td style="width:2%">' +
                '<p class="centerAlign"></p>' +
                '</td>' +
                '</tr>';

            } else {
              tbl += '<tr style="height:12pt; width: 100%;">' +
                '<td style="width: 13%; text-align: justify" align="center">' +
                '<p class="centerAlign">' + x.otherDate + '</p>' +
                '</td>' +
                '<td style="width: 16%; text-align: justify" align="center">' +
                '<p>' + x.otherNum + '</p>' +
                '</td>' +
                '<td style="width: 16%; text-align: justify" align="right">' +
                '<p class="centerAlign">' + x.invAmt + '</p>' +
                '</td>' +
                '<td style="width: 16%; text-align: justify" align="right">' +
                '<p class="centerAlign">' + x.discAmt + '</p>' +
                '</td>' +
                '<td style="width: 16%; text-align: justify" align="right">' +
                '<p class="centerAlign">' + x.amount + '</p>' +
                '</td>' +
                '<td style="width:2%">' +
                '<p class="centerAlign"></p>' +
                '</td>' +
                '</tr>';

            }
          }
        });
        return tbl;
      })();

      var tableHeader = '<tr style="height:12pt;border-bottom: 1px solid #000;">' +
        '<td align="center" style="width: 14%; text-align: justify"><strong>INVOICE DATE</strong></td>' +
        '<td align="center" style="width: 13%; text-align: justify"><strong>VENDOR INVOICE NO.</strong></td>' +
        '<td align="center" style="width: 18%; text-align: justify"><strong>MEMO</strong></td>' +
        '<td align="right" style="width: 17%; text-align: justify"><strong>INVOICE AMOUNT</strong></td>' +
        '<td align="right" style="width: 19%; text-align: justify"><strong>DISCOUNT AMOUNT</strong></td>' +
        '<td align="right" style="width: 17%; text-align: justify"><strong>NET AMOUNT</strong></td>' +
        '<td style="width:2%"></td>' +
        '</tr>';
      var landscape = 'size="Letter-LANDSCAPE"'
      //if (subsidiary != 5) { //make ANS/TIMBER subsidiary behave same way for MEMO portion as requested by Katherine c/o Rodmar 5 is ANS 2 is timber
      if (subsidiary != 5 && subsidiary != 2) {
        landscape = 'size="Letter"'
        tableHeader = '<tr style="height:12pt;border-bottom: 1px solid #000;">' +
          '<td align="center" style="width: 14%; text-align: justify"><strong>INVOICE DATE</strong></td>' +
          '<td align="center" style="width: 13%; text-align: justify"><strong>VENDOR INVOICE NO.</strong></td>' +
          '<td align="right" style="width: 17%; text-align: justify"><strong>INVOICE AMOUNT</strong></td>' +
          '<td align="right" style="width: 19%; text-align: justify"><strong>DISCOUNT AMOUNT</strong></td>' +
          '<td align="right" style="width: 17%; text-align: justify"><strong>NET AMOUNT</strong></td>' +
          '<td style="width:2%"></td>' +
          '</tr>'
      }
      
      //override landscape TC10ROD 12212019
      landscape = 'size="Letter-LANDSCAPE"';
      var custbody_9997_is_for_ep_eft = rec.getValue('custbody_9997_is_for_ep_eft');
      if(custbody_9997_is_for_ep_eft == "F" || !custbody_9997_is_for_ep_eft)
	  {
          landscape = 'size="Letter"';
	  }

      log.error('glLines', glLines);
      log.error('rows', rows);
      var fieldTypes = ui.FieldType;

      var fields = [{
          "id": "custpage_total",
          "label": "TOTAL",
          "type": fieldTypes.CURRENCY,
          "value": totalValue.toString()
        },
        {
          "id": "custpage_tableheader",
          "label": "table body",
          "type": fieldTypes.RICHTEXT,
          "value": tableHeader
        },
        {
          "id": "custpage_landscape",
          "label": "table body",
          "type": fieldTypes.RICHTEXT,
          "value": landscape
        }

      ];
      log.error('rows', rows.length);
      var newRows = '';
      for (var i = 0; i < 11; i++) {
        var rowsTemp = '';
        // log.error('rows START' + (i + 1), rows.substring(0, 100));
        if (rows != '') {
          if (rows.length > 99991) {
            rowsTemp = rows.substring(0, 99991)
            newRows = rows.substring(99991, rows.length)
          } else {
            rowsTemp = rows.substring(0, rows.length)
            newRows = ''
          }
          rows = newRows
        }
        // log.error('rows' + (i + 1), rowsTemp.length);
        // log.error('rows END' + (i + 1), rowsTemp.substring(rowsTemp.length - 100, rowsTemp.length));
        fields.push({
          "id": "custpage_rows" + (i + 1),
          "label": "table body" + (i + 1),
          "type": fieldTypes.RICHTEXT,
          "value": rowsTemp
        })
        // log.error('FIELDS', JSON.stringify(fields[i + 1]));
      }
      // email.send({
      //   author: USER.id,
      //   recipients: ['rbducusin@cloudtecherp.com'],
      //   subject: "TEST",
      //   body: JSON.stringify(fields)
      // });
      fields.forEach(function (fld) {
        var field = form.addField(fld);
        if (fld.value) field.defaultValue = fld.value.replace(/&/g, '&amp;');
      });
    }
  }


  return {
    "beforeLoad": beforeLoad
  };

});