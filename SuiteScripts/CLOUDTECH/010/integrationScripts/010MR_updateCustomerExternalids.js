/**
 * @NApiVersion 2.x
 * @NScriptType MapReduceScript
 * @NModuleScope SameAccount
 */
define(['N/record', 'N/runtime', 'N/search', 'N/email'],
/**
 * @param {record} record
 * @param {runtime} runtime
 * @param {search} search
 */
function(record, runtime, search, email) {
   
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
        var searchObj = search.load({
            id : "customsearch_010_util_cust_toupdate_xid"
        });
        return searchObj;
    }

    /**
     * Executes when the map entry point is triggered and applies to each key/value pair.
     *
     * @param {MapSummary} context - Data collection containing the key/value pairs to process through the map stage
     * @since 2015.1
     */
    function map(context)
    {
        var resultEntry = JSON.parse(context.value);
        log.debug("resultEntry", resultEntry);
        
//      {"recordType":"customer","id":"3722","values":{"entityid":"Sun Media, a division of Postmedia Network Inc. (PARENT) : Calgary Sun","externalid":{"value":"583","text":"583"},"custentity_wmid":"5025","isinactive":"T"}}
        
        var fieldsToUpdate = {
                externalid : "WM" + resultEntry.values.custentity_wmid
        };
        log.debug("updating recordtype : " + resultEntry.recordType, fieldsToUpdate)
        if(resultEntry.values.custentity_wmid)
        {
            try
            {
                var submittedRecordId = record.submitFields({
                    type: resultEntry.recordType,
                    id: resultEntry.id,
                    values : fieldsToUpdate
                });                
            }
            catch(e)
            {
                log.error("ERROR updating record", {recordtype : resultEntry.recordType, recordid : resultEntry.id, errorMsg : e.message})
            }
            
            log.debug("submittedRecordId", submittedRecordId);
        }
        
//        context.write({
//            key: soEntry.values.recordtype, 
//            value: context.key 
//        }); 
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
    function summarize(summary){
        email.send({
            author: runtime.getCurrentUser().id,
            recipients : runtime.getCurrentUser().id,
            subject : "010MR_updateCustomerExternalIds finished execution",
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
