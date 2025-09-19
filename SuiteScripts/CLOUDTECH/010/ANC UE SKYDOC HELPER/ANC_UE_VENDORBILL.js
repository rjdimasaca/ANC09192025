/**
 * @NApiVersion 2.1
 * @NScriptType UserEventScript
 */
define(['N/https', 'N/query', 'N/record', 'N/runtime', 'N/search'],
    /**
     * @param{https} https
     * @param{query} query
     * @param{record} record
     * @param{runtime} runtime
     * @param{search} search
     */
    (https, query, record, runtime, search) => {
        /**
         * Defines the function definition that is executed before record is loaded.
         * @param {Object} scriptContext
         * @param {Record} scriptContext.newRecord - New record
         * @param {string} scriptContext.type - Trigger type; use values from the context.UserEventType enum
         * @param {Form} scriptContext.form - Current form
         * @param {ServletRequest} scriptContext.request - HTTP request information sent from the browser for a client action only.
         * @since 2015.2
         */
        const beforeLoad = (scriptContext) => {

        }

        /**
         * Defines the function definition that is executed before record is submitted.
         * @param {Object} scriptContext
         * @param {Record} scriptContext.newRecord - New record
         * @param {Record} scriptContext.oldRecord - Old record
         * @param {string} scriptContext.type - Trigger type; use values from the context.UserEventType enum
         * @since 2015.2
         */
        const beforeSubmit = (scriptContext) => {

        }

        /**
         * Defines the function definition that is executed after record is submitted.
         * @param {Object} scriptContext
         * @param {Record} scriptContext.newRecord - New record
         * @param {Record} scriptContext.oldRecord - Old record
         * @param {string} scriptContext.type - Trigger type; use values from the context.UserEventType enum
         * @since 2015.2
         */
        const afterSubmit = (scriptContext) =>
        {
            try
            {
                // syncBill_via_ss(scriptContext);
                syncPoBilledQtys(scriptContext);
            }
            catch(e)
            {
                log.error("ERROR in function afterSubmit", e)
            }
        }

        function syncPoBilledQtys(scriptContext)
        {
            //get bill id
            //handle 3 kinds of submission
            //submission1 - creation
            //submission2 - modification
            //submission3 - deletion

            //the biggest difference is that the record is not accessible thru NEWRECORD for delete events
            // since the resource is erased or ceases to exist anymore
            // so we will utilize the OLDRECORD
            let recObj = null;
            if(scriptContext.type == "delete")
            {
                recObj = scriptContext.oldRecord
            }
            else
            {
                recObj = record.load({
                    type : scriptContext.newRecord.type,
                    id : scriptContext.newRecord.id
                })
            }

            //algorithm:
            //get the PO internalid from BILL that triggered the event

            let recInternalId = recObj.getValue({
                fieldId : "createdfrom"
            });
            //it would appear that the system supports VB from multiple sources, not 1PO:1BILL
            //thats why system represents it as a list, not a simple field from the VB body
            if(!recInternalId)
            {
                //count how many POs are associated
                var poSublistCount = recObj.getLineCount({
                    sublistId : "purchaseorders"
                });
                log.debug("poSublistCount", poSublistCount);
                //iterate through the PO SUBLIST
                //set up an ARRAY to collect the PO Internalids
                var po_internalid_list = [];
                for(var a = 0 ; a < poSublistCount; a++)
                {
                    var po_internalid = recObj.getSublistValue({
                        sublistId : "purchaseorders",
                        fieldId : "id",
                        line : a
                    })
                    if(!po_internalid_list.includes(po_internalid))
                    {
                        po_internalid_list.push(po_internalid);
                    }

                }
                log.debug("po_internalid_list", po_internalid_list);

                var searchResults = [];
                if(po_internalid_list.length > 0)
                {
                    var purchaseorderSearchObj = search.create({
                        type: "purchaseorder",
                        settings:[{"name":"consolidationtype","value":"ACCTTYPE"}],
                        filters:
                            [
                                ["type","anyof","PurchOrd"],
                                "AND",
                                ["internalid","anyof",po_internalid_list],
                                "AND",
                                ["externalidstring","contains","EAMPO"],
                                "AND",
                                ["mainline","is","F"],
                                "AND",
                                ["custcol_syncmspo_lineno","isnotempty",""]
                            ],
                        columns:
                            [
                                search.createColumn({name: "custcol_syncmspo_lineno", label: "SYNCMSPO Line #"}),
                                search.createColumn({name: "quantitybilled", label: "Quantity Billed"}),
                                search.createColumn({name: "line", label: "Line ID"}),
                                search.createColumn({name: "externalid", label: "External ID"})
                            ]
                    });
                    purchaseorderSearchObj.run().each(function(result){
                        // .run().each has a limit of 4,000 results
                        searchResults.push({
                            bill_qty : result.getValue({name: "quantitybilled", label: "Quantity Billed"}),
                            poline_external_lineno : result.getValue({name: "custcol_syncmspo_lineno", label: "SYNCMSPO Line #"}),
                            po_externalid : result.getValue({name: "externalid", label: "External ID"}),
                        })
                        return true;
                    });
                }

                log.debug("searchResults", searchResults);

                var respObj = {
                    vb_internalid : recObj.internalid
                };
                var vb_lines = searchResults;
                respObj.vb_lines = vb_lines;
                respObj.submitmode = scriptContext.type;

                log.debug("respObj", respObj)

                if(respObj.vb_lines && respObj.vb_lines.length > 0)
                {
                    var ESB_VB_ENDPOINT = `https://esbdev.albertanewsprint.com/billstatus`
                    var  requestBody = JSON.stringify(respObj);
                    var resp = https.post({
                        url : ESB_VB_ENDPOINT,
                        body : requestBody
                    });

                    log.debug("resp", resp)
                }
                else
                {
                    log.debug("DO NOT sync via https! - version2 06042025")
                }

            }

            //all of the below points are handled because we went for the search approach.
            //load the PO record, to analyze it
            //check if it is a relevant PO (EXTERNALID contains EAM
            //iterate through the relevant PO LINES
            //check if they are relevant lines (CUSTCOL_SYNCMSPO#
            //collect relevant lines, put them in an array
            //format or structure it
            //call to endpoint
        }

        return {beforeLoad, beforeSubmit, afterSubmit}

    });
