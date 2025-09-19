/**
 * @NApiVersion 2.x
 * @NScriptType MapReduceScript
 */
define(['N/search', 'N/record'],

function(search, record) {
  function getInputData() {
    return search.create({
      type: 'account',
      filters: [
        ['custrecord_anc_account_datecreated', 'isempty', ''],
        'OR',
        ['custrecord_anc_account_datemod', 'isempty', '']
      ],
      columns: ['internalid']
    });
  }

  function map(context) {
    log.debug("map context", context)
    var val = JSON.parse(context.value)
    var accountId = val.id;
    var account = record.load({
      type: 'account',
      id: accountId
    });

    try
    {

        // Submit the account record
        var submittedRecId = account.save();
        log.debug({
          title: 'Submitted Account',
          details: submittedRecId
        });
    }
    catch(e)
    {
        log.error("ERROR in function map", e)
    }
  }

  function reduce(context) {
    // This function is not used in this example
  }

  function summarize(summary) {
    log.audit({
      title: 'Accounts Processed',
      details: summary.mapSummary.totalRecordsProcessed
    });
  }

  return {
    getInputData: getInputData,
    map: map,
    reduce: reduce,
    summarize: summarize
  };
});