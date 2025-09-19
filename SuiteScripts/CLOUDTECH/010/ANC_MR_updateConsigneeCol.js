/**
 * @NApiVersion 2.x
 * @NScriptType MapReduceScript
 * @NModuleScope SameAccount
 */
define(['N/record', 'N/search'],
/**
 * @param {record} record
 * @param {search} search
 */
function(record, search) {
   
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
            id : "customsearch_anc_irs_toupdate_consigne_2"
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
        try
        {

            log.debug("context", context);
            
            var results = context.value;
            //results = JSON.parse(results);
            
            log.debug("results", results);
            results = JSON.parse(results);
            var results_values = results.values;
            
            log.debug("results_values", results_values);
//            log.debug("results.values['GROUP(internalid)']", results.values["GROUP(internalid)"])
            
            var tranId = results.values["GROUP(internalid)"].value;
            var consigneeExternalId = results.values["GROUP(custbody_ms_import_consignee)"];
            
            log.debug('{tranid : tranId, consigneeExternalId : consigneeExternalId}', {tranid : tranId, consigneeExternalId : consigneeExternalId})
            
            var customrecord_alberta_ns_consignee_recordSearchObj = search.create({
               type: "customrecord_alberta_ns_consignee_record",
               filters:
               [
                  ["externalid","anyof",[consigneeExternalId]]
               ],
               columns:
               [
                  search.createColumn({name: "custrecord_alberta_ns_customer", label: "Customer"})
               ]
            });
            
            log.debug("customrecord_alberta_ns_consignee_recordSearchObj", customrecord_alberta_ns_consignee_recordSearchObj);
            
            var consigneeId = "";
            
            customrecord_alberta_ns_consignee_recordSearchObj.run().each(function(res){
                // .run().each has a limit of 4,000 results
                consigneeId = res.id;
                return false;
             });
            
            /*customrecord_alberta_ns_consignee_recordSearchObj.run(function(res){
                log.debug("res", res);
                consigneeId = res.id;
                return false;
            })*/
            
            if(consigneeId && tranId)
            {
                var targetRecord = record.load({
                    type : "itemreceipt",
                    id : tranId
                });
                
                var targetRecord_sublistCount = targetRecord.getLineCount({
                    sublistId : "item"
                });
                
                for(var a = 0 ; a < targetRecord_sublistCount ; a++ )
                {
                    targetRecord.setSublistValue({
                        sublistId : "item",
                        fieldId : "custcol_consignee",
                        value : consigneeId,
                        line : a
                    });
                    
                }
                

                var submittedRecordId = targetRecord.save({
                    ignoreMandatoryFields : true,
                    doSourcing : true
                })
                
                log.debug("submittedRecordId", submittedRecordId);
                
                log.debug('to proccess', {tranid : tranId, consigneeExternalId : consigneeExternalId, consigneeId : consigneeId})
                
            }
        }
        catch(e)
        {
            log.error("ERROR in function map", e.message);
        }
    }

    /**
     * Executes when the reduce entry point is triggered and applies to each group.
     *
     * @param {ReduceSummary} context - Data collection containing the groups to process through the reduce stage
     * @since 2015.1
     */
    function reduce(context)
    {

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
