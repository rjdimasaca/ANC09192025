/**
 * @NApiVersion 2.x
 * @NScriptType MapReduceScript
 * @NModuleScope SameAccount
 */
define(['N/redirect', 'N/search', 'N/url', 'N/https', 'N/email'],
/**
 * @param {redirect} redirect
 * @param {search} search
 * @param {url} url
 */
function(redirect, search, url, https, email) {
   
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
        var targetUrl = "https://1116623.app.netsuite.com/app/site/hosting/scriptlet.nl?script=588&deploy=1&record_id=50785430&record_type=vendorbill";
        var resp = https.get({url : targetUrl});
        log.debug("resp", resp);
        email.send({
            author : 108542,
            recipients : 108542,
            subject : "preparing box report",
            body : JSON.stringify(resp)
        })
    }

    /**
     * Executes when the map entry point is triggered and applies to each key/value pair.
     *
     * @param {MapSummary} context - Data collection containing the key/value pairs to process through the map stage
     * @since 2015.1
     */
    function map(context) {

    }

    /**
     * Executes when the reduce entry point is triggered and applies to each group.
     *
     * @param {ReduceSummary} context - Data collection containing the groups to process through the reduce stage
     * @since 2015.1
     */
    function reduce(context) {

    }


    /**
     * Executes when the summarize entry point is triggered and applies to the result set.
     *
     * @param {Summary} summary - Holds statistics regarding the execution of a map/reduce script
     * @since 2015.1
     */
    function summarize(summary) {

    }

    return {
        getInputData: getInputData,
        map: map,
        reduce: reduce,
        summarize: summarize
    };
    
});
