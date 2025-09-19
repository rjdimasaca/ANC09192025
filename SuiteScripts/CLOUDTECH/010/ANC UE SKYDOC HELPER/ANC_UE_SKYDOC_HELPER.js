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
                syncBill_via_ss(scriptContext);
            }
            catch(e)
            {
                log.error("ERROR in function afterSubmit", e)
            }
        }

        var ESB_VB_ENDPOINT = `https://esbtest.albertanewsprint.com/billstatus`
        function syncBill_via_ss(scriptContext)
        {
            if(scriptContext.newRecord.type == "vendorbill")
            {
                var respObj = {};
                var vb_lines = [];
                respObj.vb_internalid = scriptContext.newRecord.id;
                var vendorbillSearchObj = search.create({
                    type: "vendorbill",
                    settings:[{"name":"consolidationtype","value":"ACCTTYPE"}],
                    filters:
                        [
                            ["internalid","anyof",scriptContext.newRecord.id],
                            "AND",
                            ["type","anyof","VendBill"],
                            "AND",
                            ["createdfrom.externalidstring","startswith","EAM"],
                            "AND",
                            ["mainline","is","F"],
                            "AND",
                            ["createdfrom.type","anyof","PurchOrd"],
                            "AND",
                            ["custcol_syncmspo_lineno","isnotempty",""]
                        ],
                    columns:
                        [
                            search.createColumn({name: "internalid", label: "bill_internalid"}),
                            search.createColumn({name: "tranid", label: "bill_tranid"}),
                            search.createColumn({name: "transactionnumber", label: "bill_trannum"}),
                            search.createColumn({name: "externalid", label: "bill_externalid"}),
                            search.createColumn({
                                name: "internalid",
                                join: "createdFrom",
                                label: "po_internalid"
                            }),
                            search.createColumn({
                                name: "externalid",
                                join: "createdFrom",
                                label: "po_externalid"
                            }),
                            search.createColumn({
                                name: "tranid",
                                join: "createdFrom",
                                label: "po_docnum"
                            }),
                            search.createColumn({name: "line", label: "billline_lineid"}),
                            search.createColumn({name: "custcol_syncmspo_lineno", label: "poline_external_lineno"}),
                            search.createColumn({name: "quantityuom", label: "bill_qty"}),
                            search.createColumn({name: "quantity", label: "bill_qty_inbaseunits"}),
                            // search.createColumn({
                            //     name: "quantityuom",
                            //     join: "createdFrom",
                            //     label: "poline_qty"
                            // }),
                            // search.createColumn({
                            //     name: "quantity",
                            //     join: "createdFrom",
                            //     label: "poline_qty_inbaseunits"
                            // })
                        ]
                });
                var searchResultCount = vendorbillSearchObj.runPaged().count;
                log.debug("vendorbillSearchObj result count",searchResultCount);
                vendorbillSearchObj.run().each(function(result){
                    // .run().each has a limit of 4,000 results
                    var resObj = {};

                    for(var a = 0 ; a < vendorbillSearchObj.columns.length ; a++)
                    {
                        var col = vendorbillSearchObj.columns[a];
                        var resVal = result.getValue(col);
                        if(col.label == "bill_qty" || col.label == "BILL_QTY")
                        {
                            resVal = Math.abs(resVal);
                        }
                        else if(col.label == "BILL_QTY_INBASEUNITS" || col.label == "bill_qty_inbaseunits")
                        {
                            resVal = Math.abs(resVal);
                        }
                        else if(col.label == "po_externalid")
                        {
                            respObj[col.label] = resVal;
                        }
                        else if(col.label == "po_docnum")
                        {
                            respObj[col.label] = resVal;
                        }
                        resObj[col.label] = resVal;

                    }

                    vb_lines.push(resObj);
                    return true;
                });

                log.debug("vb_lines", vb_lines);
                respObj.vb_lines = vb_lines;
                respObj.submitmode = scriptContext.type;

                if(respObj.vb_lines && respObj.vb_lines.length > 0)
                {
                    log.debug("sync via https!", respObj)
                }
                else
                {
                    log.debug("DO NOT sync via https!", respObj)
                }
            }

            log.debug("respObj", respObj);

            var  requestBody = JSON.stringify(respObj);
            var resp = https.post({
                url : ESB_VB_ENDPOINT,
                body : requestBody
            });

            log.debug("resp", resp)
        }

        return {beforeLoad, beforeSubmit, afterSubmit}

    });
