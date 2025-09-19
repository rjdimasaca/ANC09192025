/**
 * @NApiVersion 2.x
 * @NScriptType MapReduceScript
 * @NModuleScope SameAccount
 */
define(['N/record', 'N/search', 'N/runtime', 'N/runtime'],
/**
 * @param {record} record
 * @param {search} search
 */
function(record, search, email) {
   
    /*var sr = nlapiSearchRecord(null, "customsearch_010util_outdated_consignee");
    for(var a = 0 ; a < sr.length ; a++)
    {
    //var recObj = nlapiLoadRecord(nlapiGetRecordType(), sr[a].getId());
    //nlapiSubmitRecord(recObj);

    var submittedRecId = nlapiSubmitField(nlapiGetRecordType(), sr[a].getId(), "externalid", "");
    console.log("submittedRecId : " + a + "/" + sr.length, submittedRecId)
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
        var targetSavedSearchId = runtime.getCurrentScript().getParameter({ name: 'custscript_010mr_resubmit_srchid'});
        if(targetSavedSearchId)
        {
            var searchObj = search.load({
                id : "customsearch_010util_outdated_consignee"
            });
            var searchObj_results = getResults(searchObj.run());
            
            return searchObj_results;
        }
    }

    /**
     * Executes when the map entry point is triggered and applies to each key/value pair.
     *
     * @param {MapSummary} context - Data collection containing the key/value pairs to process through the map stage
     * @since 2015.1
     */
    function map(context) {
        log.debug("context.value", context.value);
        data = JSON.parse(context.value);
//        log.debug("data", data);
        log.debug("data.recordType", data.recordType)
        log.debug("data.id", data.id)
        if(data.recordType && data.id)
        {
            log.debug("attempting to resubmit record")
            var submittedRecordId = record.submitFields({
                type : data.recordType,
                id : data.id,
                values : {
                    externalid : ""
                }
            });
            log.debug("submitted : " + data.recordType, submittedRecordId);
        }
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
        email.send({
            author: runtime.getCurrentUser().id,
            recipients : runtime.getCurrentUser().id,
            subject : "010MR_resubmitRecord finished execution",
            body : JSON.stringify(summary)
        });
        log.debug("finished");
    }

    return {
        getInputData: getInputData,
        map: map,
        reduce: reduce,
        summarize: summarize
    };
    
});
