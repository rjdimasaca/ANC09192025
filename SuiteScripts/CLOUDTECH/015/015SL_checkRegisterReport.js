/**
 * @Author: Jed
 * @Date Created: 10/08/2019
 * Custom UI for Cheque Register
 **/


function addNewCommas(number) {
  parts = number.toString().split('.');
  parts[0] = parts[0].replace(/\B(?=(\d{3})+(?!\d))/g, ',');
  return parts.join('.');
}

var groupBy = function groupBy(xs, key) {
  return xs.reduce(function (rv, x) {
    (rv[x[key]] = rv[x[key]] || []).push(x);
    return rv;
  }, {});
};


function getListValues(listScriptId) {
  var searchColumn = new nlobjSearchColumn('name');
  var searchResults = nlapiSearchRecord(listScriptId, null, null, searchColumn);
  var listArray = new Array();
  listArray[0] = '-- ALL -- ';
  for (i in searchResults) {
    listArray[searchResults[i].id] = searchResults[i].getValue(searchColumn);
  }
  return listArray;
}

function getBillPaymentwBankCodes(bankCodes) {
  nlapiLogExecution('debug', 'getBillPaymentwBankCodes filters', bankCodes);
  var index = 0;
  var holder = [];

  var search = nlapiLoadSearch(null, 'customsearch_anc_bankaccount');
  search.addFilter(new nlobjSearchFilter('account', null, 'anyof', bankCodes));

  search = search.runSearch();
  var result;
  while (true) {
    result = search.getResults(index, index + 1000);
    if (!result) break;
    holder = holder.concat(result);
    if (result.length < 1000) break;
    index += 1000;
  }

  var data = [];
  var temp = [];
  if (holder.length > 0) {
    holder.forEach(function (set) {
      col = set.getAllColumns();
      var obj = set.id;
      data.push(obj);
    });
  }

  return data;
}

function getBillPayments(subs, datefrom, dateto, payment, bpWBankCodes) {
  nlapiLogExecution('debug', 'filters', subs + " : " + datefrom + " : " + dateto + " : " + payment + " : " + bpWBankCodes);
  var index = 0;
  var holder = [];

  var search = nlapiLoadSearch(null, 'customsearch_anc_cheque_register');
  if (bpWBankCodes.length > 0) {
    // nlapiLogExecution('debug', 'filters', 'filteredbpWBankCodes' + bpWBankCodes.length + " : " + bpWBankCodes);
    search.addFilter(new nlobjSearchFilter('internalid', 'applyingTransaction', 'anyof', bpWBankCodes));
  }
  search.addFilter(new nlobjSearchFilter('subsidiary', null, 'anyof', subs));
  search.addFilter(new nlobjSearchFilter('trandate', 'applyingTransaction', 'within', datefrom, dateto));
  if (payment != 0) {
    search.addFilter(new nlobjSearchFilter('custbody_anc_checkpaymenttype', 'applyingTransaction', 'anyof', [payment]));
  }

  search = search.runSearch();
  var result;
  while (true) {
    result = search.getResults(index, index + 1000);
    if (!result) break;
    holder = holder.concat(result);
    if (result.length < 1000) break;
    index += 1000;
  }
  var appliedTransactionFilterExpression = [];

  var data = [];
  var temp = [];
  if (holder.length > 0) {
    holder.forEach(function (set) {
      col = set.getAllColumns();
      var obj = {
        "internalid": set.id,
        "vendor": set.getText(col[0]),
        "vendorid": set.getValue(col[0]),
        "invoicenumber": set.getValue(col[3]),
        "checknumber": set.getValue(col[1]),
        "checkdate": set.getValue(col[2]),
        "invDate": set.getValue(col[4]),
        "amount": set.getValue(col[5]),
        "subsidiary": set.getText(col[8]),
        "paymentType": set.getText(col[9]),
        "checkinternalid": set.getValue(col[11]), // Bill Payment
        "invoiceinternalid": set.getValue(col[12]), // Vendor Bill,
        "appliedtransactions": [] // will be used for the credits etc
      };
      data.push(obj);
      appliedTransactionFilterExpression.push(
        [
          ['appliedtotransaction.payingtransaction', 'anyof', obj.checkinternalid], 'AND',
          ['appliedtotransaction', 'anyof', obj.invoiceinternalid]
        ], 'OR'
      );
    });
  }
  nlapiLogExecution('ERROR', 'datalength', data.length)
  //region Match applied transactions to the bill payments
  appliedTransactionFilterExpression.pop(); //Removes dangling OR
  var appliedTransactions = getAppliedTransactions(appliedTransactionFilterExpression);

  if (appliedTransactions.length > 0) {
    appliedTransactions.forEach(function (appliedTransaction) {
      var billPaymentIndex = _.findIndex(data, function (txn) {
        return txn.invoiceinternalid == appliedTransaction.appliedToTransactionInternalId && txn.checkinternalid == appliedTransaction.payingTransactionInternalId
      });
      if (billPaymentIndex > -1)
        data[billPaymentIndex]['appliedtransactions'].push(appliedTransaction)
    })
  }
  //endregion

  return data;
}

function getBankCodesList(subs) {
  nlapiLogExecution('debug', 'filters', subs);
  var index = 0;
  var holder = [];

  var search = nlapiLoadSearch(null, 'customsearch_accounts_banktype');
  search.addFilter(new nlobjSearchFilter('subsidiary', null, 'anyof', subs));

  search = search.runSearch();
  var result;
  while (true) {
    result = search.getResults(index, index + 1000);
    if (!result) break;
    holder = holder.concat(result);
    if (result.length < 1000) break;
    index += 1000;
  }

  var data = [];
  var temp = [];
  if (holder.length > 0) {
    holder.forEach(function (set) {
      col = set.getAllColumns();
      var obj = {
        "id": set.id,
        "name": set.getValue(col[0]),
      };
      data.push(obj);
    });
  }

  return data;
}

function getAppliedTransactions(filterExpression) {
  var transactionSearchObj = nlapiCreateSearch("transaction",
    [
      ["trandate", "onorafter", "9/1/2019"],
      "AND",
      ["taxline", "is", "F"],
      "AND",
      ["mainline", "is", "T"],
      "AND",
      filterExpression
    ],
    [
      new nlobjSearchColumn("type"),
      new nlobjSearchColumn("transactionnumber"),
      new nlobjSearchColumn("tranid"),
      new nlobjSearchColumn("trandate"),
      new nlobjSearchColumn("payingtransaction", "appliedToTransaction", null),
      new nlobjSearchColumn("amount"),
      new nlobjSearchColumn("appliedtotransaction"),
      new nlobjSearchColumn("appliedtolinkamount")
    ]
  );
  var transactionSearchResultSet = transactionSearchObj.runSearch();
  var result;
  var holder = [];
  var index = 0;
  //prevent endless loop
  if(transactionSearchResultSet && transactionSearchResultSet.length > 0)
  {
	  nlapiLogExecution("DEBUG", "transactionSearchResultSet", transactionSearchResultSet);
	  while (true) {
	    result = transactionSearchResultSet.getResults(index, index + 1000);
	    if (!result) break;
	    holder = holder.concat(result);
	    if (result.length < 1000) break;
	    index += 1000;
	  }
  }

  var data = holder.map(function (res) {
    return {
      documentNumber: res.getValue('tranid') || res.getValue('transactionnumber'),
      internalId: res.getId(),
      tranDate: res.getValue('trandate'),
      payingTransaction: res.getText('payingtransaction', 'appliedToTransaction'),
      payingTransactionInternalId: res.getValue('payingtransaction', 'appliedToTransaction'), // Bill Payment
      appliedToTransaction: res.getText('appliedtotransaction'), // Vendor Bill
      appliedToTransactionInternalId: res.getValue('appliedtotransaction'),
      amount: res.getValue('amount')
    }
  }) || [];

  return data;
}

function chequeRegisterUi(request, response) {

  var form = nlapiCreateForm('Cheque Register');
  nlapiLogExecution('ERROR', 'LOG ERROR', request.getMethod())
  if (request.getMethod() == 'GET') {

    var paramSubsidiary = request.getParameter("sb");
    var paramPaymentType = request.getParameter("pt");
    var paramDateFrom = request.getParameter("df");
    var paramDateto = request.getParameter("dt");
    var paramFlag = request.getParameter("fg");
    var paramBankCode = request.getParameter("bc");

    var checkPaymentTypeList = getListValues('customlist_anc_checkpaymenttype');
    var bankCodeList = {}
    if (paramSubsidiary) {
      bankCodeList = getBankCodesList(paramSubsidiary)
    }

    nlapiLogExecution('ERROR', 'bankcodeList', JSON.stringify(bankCodeList))
    if (paramFlag != 1) {
      var fldSubsidiary = form.addField('custpage_subsidiary', 'select', 'Subsidiary', 'subsidiary');
      if (paramSubsidiary != 0) {
        fldSubsidiary.setDefaultValue(paramSubsidiary);
      }

      fldSubsidiary.setMandatory(true);

      var fldPaymentType = form.addField('custpage_payment_type', 'select', 'Payment Type', null);

      for (var i = 0; i < checkPaymentTypeList.length; i++) {
        fldPaymentType.addSelectOption(i, checkPaymentTypeList[i]);
      }
      if (paramPaymentType != 0) {
        fldPaymentType.setDefaultValue(paramPaymentType);
      }
      fldPaymentType.setMandatory(true);

      var bankCodes = form.addField('custpage_bank_codes', 'select', 'Bank Code');
      for (var i = 0; i < bankCodeList.length; i++) {
        bankCodes.addSelectOption(bankCodeList[i].id, bankCodeList[i].name);
      }
      if (paramBankCode) {
        bankCodes.setDefaultValue(paramBankCode);
      }
      bankCodes.setMandatory(true);

      var fldDateFrom = form.addField('custpage_date_from', 'date', 'Date From');
      if (paramDateFrom) {
        fldDateFrom.setDefaultValue(paramDateFrom);
      }
      fldDateFrom.setMandatory(true);

      var fldDateTo = form.addField('custpage_date_to', 'date', 'Date To');
      if (paramDateto) {
        fldDateTo.setDefaultValue(paramDateto);
      }
      fldDateTo.setMandatory(true);


      form.setScript("customscript_015cs_checkregisterreport");
      form.addButton("custpage_reloadpage", "Submit", "reloadPage()");

    }

    if (paramSubsidiary && paramDateFrom && paramDateto && paramPaymentType && paramFlag == 1) {

      var bpWBankCodes = getBillPaymentwBankCodes(paramBankCode)
      nlapiLogExecution('ERROR', 'bpWBankCodes', JSON.stringify(bpWBankCodes))
      var bankCodeName = '';
      var paymentType = '';

      nlapiLogExecution('ERROR', 'length', checkPaymentTypeList.length + " : " + bankCodeList.length)
      for (var i = 0; i < bankCodeList.length; i++) {
        var bankCodeId = bankCodeList[i].id;
        if (paramBankCode == bankCodeId) {
          bankCodeName = bankCodeList[i].name;
        }
      }

      nlapiLogExecution('ERROR', 'flag', checkPaymentTypeList.length + " : " + bankCodeList.length)
      for (var i = 0; i < checkPaymentTypeList.length; i++) {
        if (i == paramPaymentType) {
          paymentType = checkPaymentTypeList[i]
        }
      }
      nlapiLogExecution('ERROR', 'flag2', checkPaymentTypeList.length + " : " + bankCodeList.length)
      result = getBillPayments(paramSubsidiary, paramDateFrom, paramDateto, paramPaymentType, bpWBankCodes);
      //result = getBillPayments(paramSubsidiary,paramDateFrom,paramDateto);

      nlapiLogExecution('debug', 'result', result.length + " : " + JSON.stringify(result));
      var tableRows = '';
      var scriptrow = '';
      var subsidiary = '';
      if (result.length > 0) {
        var grandTotal = 0;
        var vendorTransactions;
        var vendors = groupBy(result, 'vendor');
        Object.keys(vendors).forEach(function (vendor) {
          vendorTransactions = vendors[vendor];
          var vendorTotal = vendorTransactions.reduce(function (acc, cum) {
            return acc += parseFloat(cum.amount);
          }, 0);

          var vendorTotal = 0;
          var vendorName = ''
          vendorTransactions.forEach(function (result) {
            subsidiary = result.subsidiary;
            tableRows += '<tr>';
            tableRows += '  <td width="30%">' + result.vendor + '</td>';
            tableRows += '  <td width="16%">' + result.invoicenumber + '</td>';
            tableRows += '  <td width="16%">' + result.checknumber + '</td>';
            tableRows += '  <td width="16%" align="center">' + result.checkdate + '</td>';
            tableRows += '  <td width="16%" align="right">' + addNewCommas(parseFloat(result.amount).toFixed(2)) + '</td>';
            tableRows += '</tr>';
            if (result.appliedtransactions.length > 0) {
              result.appliedtransactions.forEach(function (appliedTransaction) {
                tableRows += '<tr>';
                tableRows += '  <td width="30%">' + result.vendor + '</td>';
                tableRows += '  <td width="16%">' + result.invoicenumber + '</td>';
                tableRows += '  <td width="16%">' + appliedTransaction.documentNumber + '</td>';
                tableRows += '  <td width="16%" align="center">' + appliedTransaction.tranDate + '</td>';
                tableRows += '  <td width="16%" align="right">' + addNewCommas(parseFloat(appliedTransaction.amount).toFixed(2)) + '</td>';
                tableRows += '</tr>';
                vendorTotal = parseFloat(vendorTotal) + parseFloat(appliedTransaction.amount);
                grandTotal = parseFloat(grandTotal) + parseFloat(appliedTransaction.amount);
              });
            }
            tableRows += '<tr style="border-top: none; border-bottom: 0px solid #fff; height: 1px">';
            tableRows += '  <td style="background-color: #fefefe;" colspan="5"></td>';
            tableRows += '</tr>';
            vendorTotal = parseFloat(vendorTotal) + parseFloat(result.amount);
            grandTotal = parseFloat(grandTotal) + parseFloat(result.amount);
            vendorName = result.vendor;
          })

          tableRows += '<tr>';
          tableRows += '  <td colspan="4" class="totalLine" align="left"><p>' + vendorName.toUpperCase() + ' TOTAL</p></td>';
          tableRows += '  <td width="16%" class="totalLine" align="right"><p>' + addNewCommas(parseFloat(vendorTotal).toFixed(2)) + '</p></td>';
          tableRows += '</tr>';
        });

        tableRows += '<tr>';
        tableRows += '  <td colspan="4" class="grandTotalLine" align="left"><p>GRAND TOTAL</p></td>';
        tableRows += '  <td width="16%" class="grandTotalLine" align="right"><p>' + addNewCommas(parseFloat(grandTotal).toFixed(2)) + '</p></td>';
        tableRows += '</tr>';

        scriptrow += "<script src='https://code.jquery.com/jquery-3.3.1.min.js'></script>";
        scriptrow += "<script src='https://momentjs.com/downloads/moment.js'></script>";
        scriptrow += "<script>";
        scriptrow += "    var m = moment().zone('+08:00');";
        scriptrow += "    var currDate = new moment(m).format('MM_DD_YYYY');";
        scriptrow += "    $('#custpage_downloadexcel').click(function (e) {";
        scriptrow += "var postfix = 'Cheque_Register_' + currDate;";
        scriptrow += "var a = document.createElement('a');";
        scriptrow += "var data_type = 'data:application/vnd.ms-excel';";
        scriptrow += "var table_div = document.getElementById('tableToExcel');";
        scriptrow += "var table_html = table_div.outerHTML.replace(/ /g, '%20');";
        scriptrow += "a.href = data_type + ', ' + table_html;";
        scriptrow += "a.download = postfix + '.xls';";
        scriptrow += "a.click();";
        scriptrow += "});";
        scriptrow += "</script>";

      } else {
        tableRows += '<tr>';
        tableRows += '  <td width="94%" colspan="5" align="center">NO RECORD FOUND!</td>';
        tableRows += '</tr>';
      }

      // Load Template to build the Report
      var html = nlapiLoadFile('SuiteScripts/CLOUDTECH/015/CheckRegisterTemplate.html')
      html = html.getValue();
      
      html = html.replace('{subsidiary}', subsidiary);
      html = html.replace('{paymenttype}', paymentType);
      html = html.replace('{invoicedate}', paramDateFrom + ' - ' + paramDateto);
      html = html.replace('{bankAccount}', bankCodeName);
      html = html.replace('{custbody_tbody}', tableRows);
      var htmls = html.replace('{custbody_scriptrow}', scriptrow);

      form.addField('custpage_custscript', 'inlinehtml', 'INLINE HTML').setDefaultValue(htmls);

      // file to be downloaded via PDF
      var createFile = nlapiCreateFile("CheckRegister.html", "HTMLDOC", html);
      createFile.setFolder(11558);
      nlapiSubmitFile(createFile);

      if (result.length > 0) {
        form.addButton("custpage_downloadexcel", "Excel");
        form.addSubmitButton("PDF");
      }


    }

    response.writePage(form);


  } else {
    //POST Method
    // Download file to PDF
    var file = nlapiLoadFile("SuiteScripts/CLOUDTECH/015/CheckRegister.html");
    var fileValue = file.getValue();

    var tempFile = fileValue.replace('<!DOCTYPE html>', '<?xml version="1.0"?><!DOCTYPE pdf PUBLIC "-//big.faceless.org//report" "report-1.1.dtd">');
    tempFile = tempFile.replace('<html>', '<pdf>');
    tempFile = tempFile.replace('</html>', '</pdf>');
    tempFile = tempFile.replace(/&/g, '&amp;');
    tempFile = tempFile.replace('font-size: 16px;', 'font-size: 7px;');

    var eFile = nlapiXMLToPDF(tempFile);
    response.setContentType('PDF', "Cheque_Register.pdf", 'attachment');
    response.write(eFile.getValue());


  }

}