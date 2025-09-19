/**
 * @NApiVersion 2.1
 * @NScriptType UserEventScript
 */
define([],
    
    () => {
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

        var tariff_item_usd_internalid = 188035;
        /**
         * Defines the function definition that is executed before record is submitted.
         * @param {Object} scriptContext
         * @param {Record} scriptContext.newRecord - New record
         * @param {Record} scriptContext.oldRecord - Old record
         * @param {string} scriptContext.type - Trigger type; use values from the context.UserEventType enum
         * @since 2015.2
         */
        const beforeSubmit = (scriptContext) => {
                try
                {
                        if(scriptContext.type == "create" || scriptContext.type == "edit"|| scriptContext.type == "copy")
                        {
                                var shipdate = scriptContext.newRecord.getText({
                                        fieldId : "custbody_wmdateshipped"
                                });
                                var effectiveAfterDate = new Date("03/03/2025");
                                shipdate = new Date(shipdate);

                                log.debug("{shipdate, effectiveAfterDate, shipdate > effectiveAfterDate} " + (shipdate > effectiveAfterDate), {shipdate, effectiveAfterDate, shipdate_GT_effectiveAfterDate : (shipdate > effectiveAfterDate)})

                                if(!(shipdate && effectiveAfterDate && shipdate > effectiveAfterDate))
                                {
                                     return ;
                                }



                                var value_for_customs = scriptContext.newRecord.getValue({
                                        fieldId : "custbody_anc_valueforcustoms"
                                })
                                var tariffrate = scriptContext.newRecord.getValue({
                                        fieldId : "custbody_anc_tariffrate"
                                })

                                log.debug("value_for_customs", {value_for_customs, tariffrate})
                                if(value_for_customs && tariffrate)
                                {
                                        var tariff_line_amt = value_for_customs * tariffrate / 100;

                                        if(tariff_line_amt)
                                        {
                                                var tariffLine = scriptContext.newRecord.findSublistLineWithValue({
                                                        sublistId : "item",
                                                        fieldId : "item",
                                                        value : tariff_item_usd_internalid
                                                })

                                                log.debug("tariffLine", tariffLine)

                                                if(tariffLine == -1)
                                                {
                                                        var lineCount = scriptContext.newRecord.getLineCount({
                                                                sublistId : "item"
                                                        })
                                                        var lineConsignee = scriptContext.newRecord.getSublistValue({
                                                                sublistId : "item",
                                                                fieldId : "custcol_consignee",
                                                                line : lineCount - 1,
                                                        })
                                                        var lineMarketSegment = scriptContext.newRecord.getSublistValue({
                                                                sublistId : "item",
                                                                fieldId : "cseg_anc_mrkt_sgmt",
                                                                line : lineCount - 1,
                                                        })

                                                        scriptContext.newRecord.setSublistValue({
                                                                sublistId : "item",
                                                                fieldId : "item",
                                                                line : lineCount,
                                                                value : tariff_item_usd_internalid
                                                        })
                                                        scriptContext.newRecord.setSublistValue({
                                                                sublistId : "item",
                                                                fieldId : "amount",
                                                                line : lineCount,
                                                                value : tariff_line_amt
                                                        })

                                                        scriptContext.newRecord.setSublistValue({
                                                                sublistId : "item",
                                                                fieldId : "custcol_consignee",
                                                                line : lineCount,
                                                                value : lineConsignee
                                                        })
                                                        scriptContext.newRecord.setSublistValue({
                                                                sublistId : "item",
                                                                fieldId : "cseg_anc_mrkt_sgmt",
                                                                line : lineCount,
                                                                value : lineMarketSegment
                                                        })

                                                        log.debug("ADDED TARIFF LINE")

                                                }
                                        }
                                }
                        }
                }
                catch(e)
                {
                        log.error("ERROR in ANC_TRAQM_SO_INTEG.js function beforeSubmit", e);
                }
        }

        /**
         * Defines the function definition that is executed after record is submitted.
         * @param {Object} scriptContext
         * @param {Record} scriptContext.newRecord - New record
         * @param {Record} scriptContext.oldRecord - Old record
         * @param {string} scriptContext.type - Trigger type; use values from the context.UserEventType enum
         * @since 2015.2
         */
        const afterSubmit = (scriptContext) => {

        }

        return {beforeLoad, beforeSubmit, afterSubmit}

    });
