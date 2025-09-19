/**
 * @NApiVersion 2.1
 * @NScriptType UserEventScript
 *
 * Author       :       Rodmar Dimasaca / rod@joycloud.solutions / netrodsuite@gmail.com
 * Description  :       For ANC
 * File Name    :       ANC_UE_SALES_PROCESSES.js
 * Script Name  :       ANC UE SALES PROCESSES
 * Script Id    :       customscript_ue_sales_processes
 * Deployment Id:       customdeploy_ue_sales_processes
 * API Version  :       2.1
 * version      :       1.0.0
 *
 */
define(['/SuiteScripts/ANC_lib.js','N/query', 'N/email','N/format', 'N/search', 'N/https', 'N/record', 'N/runtime', 'N/ui/dialog', 'N/ui/message', 'N/ui/serverWidget', 'N/url'],
    /**
     * @param{https} https
     * @param{record} record
     * @param{runtime} runtime
     * @param{dialog} dialog
     * @param{message} message
     * @param{serverWidget} serverWidget
     * @param{url} url
     */
    (ANC_lib, query, email, format, search, https, record, runtime, dialog, message, serverWidget, url) => {
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
            try
            {

                if(scriptContext.newRecord.type == "salesorder")
                {
                    controlButtons(scriptContext);

                    log.debug("beforeLoad ANC_lib", ANC_lib)
                    // eval_requestforecastadj(scriptContext)
                    addElements(scriptContext);
                }

            }
            catch(e)
            {
                log.error("ERROR in function beforeLoad", e);
            }
        }

        function controlButtons(scriptContext)
        {
            try
            {
                var custbody_anc_sostatus = scriptContext.newRecord.getValue({
                    fieldId : "custbody_anc_sostatus"
                })
                var orderstatus = scriptContext.newRecord.getValue({
                    fieldId : "orderstatus"
                })

                try
                {
                    if(orderstatus == "A")
                    {
                        var approveBtnFieldObj = scriptContext.form.getButton({
                            id : "approve"
                        });

                        if(approveBtnFieldObj)
                        {
                            approveBtnFieldObj.isHidden = true;
                        }
                    }
                }
                catch(ee)
                {
                    log.error("ATTEMPT TO HIDE APPROVE BUTTON FAILED", ee)
                }

                if(custbody_anc_sostatus == 1 && orderstatus == "A")
                {
                    var anc_confirm_btn = {
                        id : "custpage_btn_anc_confirm",
                        label : "Confirm",
                        // function : "alert('this feature is under development')"
                        functionName : "alert('this feature is under development')",
                        targetScript : "customscript_anc_sl_salesprocesses",
                        targetDeployment : "customdeploy_anc_sl_salesprocesses",
                        processid : "confirm",
                    }

                    completeFunction(anc_confirm_btn, scriptContext);
                    scriptContext.form.addButton(anc_confirm_btn);
                }


                // if(scriptContext.type == "view")
                // {
                //     var isprereleased = scriptContext.newRecord.getValue({
                //         fieldId: "custbody_anc_syncjob_release"
                //     })
                //     log.debug("adding PRERELEASE BUTTON isprereleased", isprereleased)
                //     if(!isprereleased && isprereleased != "T")
                //     {
                //         var pre_release_btn = {
                //             id : "custpage_btn_anc_prerelease",
                //             label : "Pre-Release",
                //             // function : "alert('this feature is under development')"
                //             functionName : "alert('this feature is under development')",
                //             targetScript : "customscript_anc_sl_salesprocesses",
                //             targetDeployment : "customdeploy_anc_sl_salesprocesses",
                //             processid : "prerelease",
                //         }
                //
                //         completeFunction(pre_release_btn, scriptContext);
                //         scriptContext.form.addButton(pre_release_btn);
                //     }
                // }

            }
            catch(e)
            {
                log.error("ERROR in function controlButtons", e)
            }
        }


        var csv_rows = [];
        var csv_text = "";
        var linesToHighlight_yellow = [];
        var linesToHighlight_orange = [];
        function showReqForecastButton()
        {
            var retVal = false;
            try
            {
                if(linesToHighlight_yellow.length > 0 || linesToHighlight_orange.length > 0)
                {
                    retVal = true;
                }
            }
            catch(e)
            {
                log.error("ERROR in function showReqForecastButton", e);
            }
            return retVal;
        }

        function doShowOrderCheck(scriptContext)
        {
            var doShowOrderCheck_retval = false;
            try
            {
                var custbody_anc_syncjob = scriptContext.newRecord.getValue({
                    fieldId : "custbody_anc_syncjob"
                });

                if(custbody_anc_syncjob && custbody_anc_syncjob.length == 0)
                {
                    doShowOrderCheck_retval = true;
                }
            }
            catch(e)
            {
                log.error("ERROR in function doShowOrderCheck", e);
            }
            return doShowOrderCheck_retval;
        }
        function doShowOrderPreRelease(scriptContext)
        {
            var doShowPreRelease_retval = false;
            try
            {
                var isprereleased = scriptContext.newRecord.getValue({
                    fieldId: "custbody_anc_syncjob_release"
                })
                log.debug("adding PRERELEASE BUTTON isprereleased", isprereleased)
                if(!isprereleased && isprereleased != "T")
                {
                    doShowPreRelease_retval = true;
                }
            }
            catch(e)
            {
                log.error("ERROR in function doShowOrderPreRelease", e);
            }
            return doShowPreRelease_retval;
        }


        var elemList =
            {
                bodyElems : {
                    buttons : [
                        {
                            name : "custpage_soprocesses_fitcheck",
                            id : "custpage_soprocesses_fitcheck",
                            label : "Order Check",
                            functionName : "alert('Fitment Check')",
                            targetScript : "customscript_anc_sl_fitmentchecking",
                            targetDeployment : "customdeploy_anc_sl_fitmentchecking",
                            processid : "fitmentcheck",
                            condition : doShowOrderCheck
                        },
                        {
                            id : "custpage_btn_anc_prerelease",
                            label : "Pre-Release",
                            functionName : "alert('Pre-Release')",
                            targetScript : "customscript_anc_sl_salesprocesses",
                            targetDeployment : "customdeploy_anc_sl_salesprocesses",
                            processid : "prerelease",
                            condition : doShowOrderPreRelease
                        }
                    ],
                },
                sublistElems : [

                ]
            }

        var salesAllocRecType = "customrecord_anc_pf_" //TODO remove occurences
        function eval_requestforecastadj(scriptContext)
        {
            // salesAllocRecType
            var eval_requestforecastadj_res = {};

            try
            {
                var newRecord = scriptContext.newRecord;
                var itemGradeList = [];
                var lineCount = newRecord.getLineCount({
                    sublistId : "item"
                });

                var itemIdList = [];
                var itemGradeIdList = [];
                var gradeLineMapping = {};
                var lineGradeMapping = {};
                var orderLinesByConsignee = {};

                var sqlFilters = [];
                var sqlFilters_text = "";


                var compositeKeys = {};

                for(var a = 0 ; a < lineCount ; a++)
                {
                    var lineGradeId = scriptContext.newRecord.getSublistValue({
                        sublistId : "item",
                        fieldId : "custcol_anc_grade",
                        line : a
                    });
                    var lineQty = scriptContext.newRecord.getSublistValue({
                        sublistId : "item",
                        fieldId : "quantity",
                        line : a
                    });
                    var lineConsignee = scriptContext.newRecord.getSublistValue({
                        sublistId : "item",
                        fieldId : "custcol_consignee",
                        line : a
                    })  || scriptContext.newRecord.getValue({
                        fieldId : "custbody_consignee"
                    });
                    var lineDate = scriptContext.newRecord.getSublistValue({
                        sublistId : "item",
                        fieldId : "custcol_anc_deliverydate",
                        line : a
                    });

                    log.debug("lineDate", lineDate)

                    if(typeof lineDate != "object" && lineDate != "null" && lineDate)
                    {
                        log.debug("NON date blineDate", lineDate)
                        lineDate = new Date(lineDate);
                        log.debug("NON date alineDate", lineDate)
                    }
                    else
                    {
                        log.debug("alrd date blineDate", lineDate)
                        lineDate = lineDate ? new Date(lineDate) : new Date();
                        log.debug("alrd date alineDate", lineDate)
                    }

                    var lineDate_year = lineDate.getFullYear();
                    var lineDate_year_plain = lineDate.getFullYear();

                    log.debug("lineDate_year fullyear", lineDate_year)

                    lineDate_year = `'${lineDate_year}'`
                    log.debug("lineDate_yearlineDate_year", lineDate_year)


                    var lineDate_month = lineDate.getMonth() + 1;

                    log.debug("lineDate_month", lineDate_month)


                    sqlFilters.push(`(
                        sf.custrecord_anc_pf_grade = ${lineGradeId} 
                        AND 
                        y.name = ${lineDate_year} 
                        AND 
                        sf.custrecord_anc_pf_month = ${lineDate_month} 
                        AND 
                        sf.custrecord_anc_pf_consignee = ${lineConsignee}
                    )`)

                    var compositeKey = `${lineGradeId}_${lineConsignee}_${lineDate_month}_${lineDate_year_plain}`
                    //make month the last part of the compositeKey to make it easy for the salesforecasting piece
                    // var compositeKey = `${lineDate_year_plain}_${lineGradeId}_${lineConsignee}_${lineDate_month}`

                    log.debug("compositeKey", compositeKey)

                    sqlFilters_text = sqlFilters.join( " OR " )

                    log.debug("sqlFilters_text", sqlFilters_text);

                    if(gradeLineMapping[lineGradeId])
                    {
                        gradeLineMapping[lineGradeId].lines.push(a);
                        gradeLineMapping[lineGradeId].totalQty += lineQty;
                    }
                    else
                    {
                        gradeLineMapping[lineGradeId] = {};
                        gradeLineMapping[lineGradeId].lines = [a];
                        gradeLineMapping[lineGradeId].totalQty = lineQty;
                    }

                    if(lineGradeMapping[lineGradeId])
                    {
                        lineGradeMapping[a].grades.push(lineGradeId);
                        lineGradeMapping[a].totalQty += lineQty;
                    }
                    else
                    {
                        lineGradeMapping[a] = {};
                        lineGradeMapping[a].grades = [lineGradeId];
                        lineGradeMapping[a].totalQty = lineQty;
                    }


                    if(compositeKeys[compositeKey])
                    {
                        compositeKeys[compositeKey].lines.push(a);
                        compositeKeys[compositeKey].totalQty += lineQty;
                    }
                    else
                    {
                        compositeKeys[compositeKey] = {};
                        compositeKeys[compositeKey].lines = [a];
                        compositeKeys[compositeKey].totalQty = lineQty;
                    }

                    itemGradeIdList.push(`'${lineGradeId}'`);
                }

                log.debug("itemGradeIdList", itemGradeIdList);
                log.debug("lineGradeMapping", lineGradeMapping);
                log.debug("gradeLineMapping", gradeLineMapping);
                log.debug("compositeKeys", compositeKeys);

                var itemGradeIdList_joined = `(${itemGradeIdList.join(",")})`;


                log.debug("itemGradeIdList_joined", itemGradeIdList_joined);


                var sql =
                    `Select
                 sf.custrecord_anc_pf_grade as sf_grade,
                 sf.custrecord_anc_pf_allocation as sf_allocation,
                 sf.custrecord_anc_pf_year as sf_year,
                 sf.custrecord_anc_pf_month as sf_month,
                 sf.custrecord_anc_pf_consignee as sf_consignee,
                 y.name as y_name,
                 m.name as m_name

             FROM
                 customrecord_anc_pf_ as sf
                     JOIN
                 customrecord_anc_pf_years as y ON y.id = sf.custrecord_anc_pf_year
                     JOIN
                 customrecord_anc_pf_months as m ON m.id = sf.custrecord_anc_pf_month

             WHERE
                 ${sqlFilters_text}
                 `

                log.debug("sql", sql)

                const sqlResults = query.runSuiteQL({ query: sql }).asMappedResults();

                log.debug("sqlResults", sqlResults)

                var sqlResults_byKey = groupByKeys(sqlResults, ["sf_grade", "sf_consignee", "sf_month", "y_name"]);

                eval_requestforecastadj_res.sqlResults = sqlResults;
                eval_requestforecastadj_res.sqlResults_byKey = sqlResults_byKey;
                eval_requestforecastadj_res.gradeLineMapping = gradeLineMapping;
                eval_requestforecastadj_res.lineGradeMapping = lineGradeMapping;
                eval_requestforecastadj_res.itemGradeIdList = itemGradeIdList;

                log.debug("eval_requestforecastadj_res", eval_requestforecastadj_res);

                log.debug("sqlResults_byKey", sqlResults_byKey);

                for(var compositeKey in compositeKeys)
                {
                    if(sqlResults_byKey[compositeKey] && sqlResults_byKey[compositeKey][0])
                    {
                        //TODO you need to look at other orders, not just this salesorder
                        if(sqlResults_byKey[compositeKey][0].sf_allocation < compositeKeys[compositeKey].totalQty)
                        {
                            log.debug("detected forecast issue on lines", compositeKeys[compositeKey].lines)
                            linesToHighlight_yellow = linesToHighlight_yellow.concat(compositeKeys[compositeKey].lines)
                        }
                        else
                        {
                            log.debug("NO forecast issue on lines", compositeKeys[compositeKey].lines)
                        }
                    }
                    else
                    {
                        log.debug("detected forecast issue on lines, no forcast found", compositeKeys[compositeKey].lines)
                        linesToHighlight_orange = linesToHighlight_orange.concat(compositeKeys[compositeKey].lines)
                    }
                }

                log.debug("linesToHighlight_orange", linesToHighlight_orange)
                log.debug("linesToHighlight_yellow", linesToHighlight_yellow)

                var yellowHtml = "";
                if(linesToHighlight_orange.length > 0)
                {
                    // highlightItemSplitsSpecificRows(linesToHighlight_orange, 'orange');
                    yellowHtml += `highlightItemSplitsSpecificRows(${JSON.stringify(linesToHighlight_orange)}, 'orange');`
                }
                var orangeHtml = "";
                if(linesToHighlight_yellow.length > 0)
                {
                    // highlightItemSplitsSpecificRows(linesToHighlight_yellow, 'yellow')
                    orangeHtml += `highlightItemSplitsSpecificRows(${JSON.stringify(linesToHighlight_yellow)}, 'yellow');`
                }

                var inlineHtmlField = scriptContext.form.addField({
                    id: "custpage_anc_forecasthighlighter",
                    type: "inlinehtml",
                    label: "ANC SALES_forecasthighlighter"
                });

                var inlineHtmlFieldValue =`<script>


            console.log('wasap man111')
            function highlightItemSplitsSpecificRows(rowIndices, color = 'lightblue', apply = true) {
              const tableElement = document.getElementById('item_splits');

              if (!tableElement || tableElement.tagName !== 'TABLE') {
                console.error('Table with ID "item_splits" not found or is not a table element.');
                return;
              }

              const rows = Array.from(tableElement.querySelectorAll('tbody > tr'));
              // Filter out the header row to get data rows for 0-based indexing
              const dataRows = rows.filter(row => !row.classList.contains('uir-machine-headerrow'));

              rowIndices.forEach(index => {
                // Check if the index is valid for the data rows
                if (index >= 0 && index < dataRows.length) {
                  const row = dataRows[index];
                  const cells = row.querySelectorAll('td');

                  cells.forEach(cell => {
                    if (apply) {
                      // Apply background color with !important to override existing styles
                      cell.style.setProperty('background-color', color, 'important');
                    } else {
                      // Remove the applied background color style
                      cell.style.removeProperty('background-color');
                    }
                  });
                } else {
                }
              });
            }
            
            jQuery(document).ready(function() {
                ${orangeHtml}
                console.log('wasap man orange')
                ${yellowHtml}
                console.log('wasap man yellow')
            })
            </script>`

                inlineHtmlField.defaultValue = inlineHtmlFieldValue;
            }
            catch(e) {
                log.error("ERROR in function eval_requestforecastadj", e)
            }

            return eval_requestforecastadj_res;

        }

        function postUpdates(newRecord)
        {
            var eval_requestforecastadj_res = {};

            try
            {
                // postUpdates_shipCap(newRecord) //moved inside updateShipmentLines
                postUpdates_prodCap(newRecord)
                postUpdates_forecastCaps(newRecord)
            }
            catch(e) {
                log.error("ERROR in function eval_requestforecastadj", e)
            }
            return eval_requestforecastadj_res;

        }

        //TODO review and update - shipcap to be shipment based instead of solineshipmentdate
        function postUpdates_shipCap(newRecord, shipmentsByShipdates)
        {
            log.debug("newRecord", newRecord.id);
            //TODO YOU CAN DO 1 search!, but you have to code totals, and it's less flexible cause 1 filterset 1 columnset
            var shipCaps = {};
            var transactionSearchObj = search.create({
                type: "transaction",
                settings:[{"name":"consolidationtype","value":"ACCTTYPE"}],
                filters:
                    [
                        ["mainline","is","F"],
                        "AND",
                        ["custcol_anc_shipmentcap_id","noneof","@NONE@"],
                        // "AND",
                        // ["internalid","anyof",[newRecord.id]]
                    ],
                columns:
                    [
                        search.createColumn({
                            name: "lineuniquekey",
                            summary: "COUNT",
                            label: "Line Unique Key"
                        }),
                        search.createColumn({
                            name: "internalid",
                            join: "CUSTCOL_ANC_SHIPMENTCAP_ID",
                            summary: "GROUP",
                            label: "Internal ID"
                        }),
                        search.createColumn({
                            name: "custrecord_anc_dsc_capacity",
                            join: "CUSTCOL_ANC_SHIPMENTCAP_ID",
                            summary: "GROUP",
                            label: "Internal ID"
                        }),
                    ]
            });
            var searchResultCount = transactionSearchObj.runPaged().count;
            log.debug("transactionSearchObj result count",searchResultCount);
            transactionSearchObj.run().each(function(result){
                // .run().each has a limit of 4,000 results
                var recId = result.getValue({
                    name: "internalid",
                    join: "CUSTCOL_ANC_SHIPMENTCAP_ID",
                    summary: "GROUP",
                    label: "Internal ID"
                });
                var count = result.getValue({
                    name: "lineuniquekey",
                    summary: "COUNT",
                    label: "Line Unique Key"
                });
                var cap = result.getValue({
                    name: "custrecord_anc_dsc_capacity",
                    join: "CUSTCOL_ANC_SHIPMENTCAP_ID",
                    summary: "GROUP",
                    label: "Internal ID"
                });
                shipCaps[recId] = {count : count, cap : cap};
                return true;
            });

            log.debug("postUpdates shipCaps", shipCaps)
            var lineCount = newRecord.getLineCount({
                sublistId : "item"
            });

            for(var a = 0 ; a < lineCount ; a++) {
                var capId = ""+newRecord.getSublistValue({
                    sublistId: "item",
                    fieldId: "custcol_anc_shipmentcap_id",
                    line: a
                });
                var lineShipDate = ""+newRecord.getSublistText({
                    sublistId: "item",
                    fieldId: "custcol_anc_shipdate",
                    line: a
                });

                log.debug("shipcap shipCaps[capId]", shipCaps[capId])
                var iconsList = [];
                if(shipCaps[capId])
                {
                    var shipmentRecordList = shipmentsByShipdates[lineShipDate];
                    var shipmentRecordList_length = shipmentRecordList ? shipmentRecordList.length : 0
                    if(shipmentRecordList_length /*|| Number(shipCaps[capId].count)*/  > Number(shipCaps[capId].cap))
                    {
                        if(Number(shipCaps[capId].cap * .10) <= (shipmentRecordList_length) - Number(shipCaps[capId].cap))
                        {
                            newRecord.setSublistValue({
                                sublistId: "item",
                                fieldId: "custcol_anc_shipcapcheck",
                                line: a,
                                value : "⚠"
                            });
                            log.debug("shipcap exceed setval")
                            iconsList.push("⚠")
                        }
                        else
                        {
                            newRecord.setSublistValue({
                                sublistId: "item",
                                fieldId: "custcol_anc_shipcapcheck",
                                line: a,
                                value : "❌"
                            });
                            iconsList.push("❌")
                        }

                    }
                    else/* if(shipCaps[capId].count <= shipCaps[capId].cap)*/
                    {
                        newRecord.setSublistValue({
                            sublistId: "item",
                            fieldId: "custcol_anc_shipcapcheck",
                            line: a,
                            value : "✅"
                        });
                        log.debug("shipcap contained setval")
                    }
                    iconsList.push("✅")
                }
                else
                {
                    newRecord.setSublistValue({
                        sublistId: "item",
                        fieldId: "custcol_anc_shipcapcheck",
                        line: a,
                        value : "❌"
                    });
                    iconsList.push("❌")
                }
            }

            if(iconsList.includes("❌"))
            {
                newRecord.setValue({
                    fieldId : "custbody_anc_shipcapstatusicon",
                    value : "❌"
                })
                validation_email_notifs(
                    newRecord,
                    "Ship Cap warning❌",
                    `order exceeded Sales Forecast
                    ${JSON.stringify(shipCaps)}`
                )
            }
            else if(iconsList.includes("⚠"))
            {
                newRecord.setValue({
                    fieldId : "custbody_anc_shipcapstatusicon",
                    value : "⚠"
                })
                validation_email_notifs(
                    newRecord,
                    "Ship Cap warning⚠",
                    `order exceeded Sales Forecast
                    ${JSON.stringify(shipCaps)}`
                )
            }
            else if(iconsList.includes(""))
            {
                newRecord.setValue({
                    fieldId : "custbody_anc_shipcapstatusicon",
                    value : "❌"
                })
                validation_email_notifs(
                    newRecord,
                    "Ship Cap warning❌",
                    `order exceeded Sales Forecast
                    ${JSON.stringify(shipCaps)}`
                )
            }
            else if(iconsList.includes("✅"))
            {
                newRecord.setValue({
                    fieldId : "custbody_anc_shipcapstatusicon",
                    value : "✅"
                })
            }
            else
            {
                newRecord.setValue({
                    fieldId : "custbody_anc_shipcapstatusicon",
                    value : "❌"
                })
                validation_email_notifs(
                    newRecord,
                    "Ship Cap warning❌",
                    `order exceeded Sales Forecast
                    ${JSON.stringify(shipCaps)}`
                )
            }
        }

        //TODO review tresholds etc
        function postUpdates_prodCap(newRecord)
        {
            var prodCaps = {};
            var transactionSearchObj = search.create({
                type: "transaction",
                settings:[{"name":"consolidationtype","value":"ACCTTYPE"}],
                filters:
                    [
                        ["mainline","is","F"],
                        "AND",
                        ["custcol_anc_prodcapweek_id","noneof","@NONE@"],
                        // "AND",
                        // ["internalid","anyof",[newRecord.id]]
                    ],
                columns:
                    [
                        search.createColumn({
                            name: "custcol_anc_prodcapweek_id",
                            summary: "GROUP",
                            label: "Production Cap Week"
                        }),
                        search.createColumn({
                            name: "custcol_anc_orderweight",
                            summary: "SUM",
                            label: "Weight"
                        }),
                        search.createColumn({
                            name: "custrecord_prodfcw_capacity",
                            join: "CUSTCOL_ANC_PRODCAPWEEK_ID",
                            summary: "GROUP",
                            label: "Week Capacity"
                        })
                    ]
            });
            var searchResultCount = transactionSearchObj.runPaged().count;
            log.debug("transactionSearchObj result count",searchResultCount);
            transactionSearchObj.run().each(function(result){
                // .run().each has a limit of 4,000 results
                var recId = result.getValue({
                    name: "custcol_anc_prodcapweek_id",
                    summary: "GROUP",
                    label: "Production Cap Week"
                });
                var count = result.getValue({
                    name: "custcol_anc_orderweight",
                    summary: "SUM",
                    label: "Weight"
                });
                var cap = result.getValue({
                    name: "custrecord_prodfcw_capacity",
                    join: "CUSTCOL_ANC_PRODCAPWEEK_ID",
                    summary: "GROUP",
                    label: "Week Capacity"
                });
                prodCaps[recId] = {count : count, cap : cap}; //commented out, it is not enough per testing, so sum it up
                // if(prodCaps[recId])
                // {
                //     prodCaps[recId].count += count;
                // }
                // else
                // {
                //     prodCaps[recId] = {count : count, cap : cap};
                // }

                return true;
            });

            log.debug("postUpdates prodCaps", prodCaps)
            var lineCount = newRecord.getLineCount({
                sublistId : "item"
            });

            var iconsList = [];
            for(var a = 0 ; a < lineCount ; a++) {
                var capId = ""+newRecord.getSublistValue({
                    sublistId: "item",
                    fieldId: "custcol_anc_prodcapweek_id",
                    line: a
                });
                log.debug("prodCaps capId", capId)

                log.debug("postUpdates prodCaps[capId]", prodCaps[capId])
                if(prodCaps[capId])
                {
                    if((Number(prodCaps[capId].cap * .10) + (Number(prodCaps[capId].cap)) > Number(prodCaps[capId].count))
                    && Number(prodCaps[capId].count) > (Number(prodCaps[capId].cap))
                    )
                    // if(Number(prodCaps[capId].cap * .10) <= (Number(prodCaps[capId].count)) - Number(prodCaps[capId].cap))
                    // if(Number(prodCaps[capId].cap * .10) <= (Number(prodCaps[capId].count)) - Number(prodCaps[capId].cap))
                    {
                        log.debug("postUpdates prodCaps Number(prodCaps[capId].cap * .10) <= (Number(prodCaps[capId].count)) - Number(prodCaps[capId].cap)", Number(prodCaps[capId].cap * .10) <= (Number(prodCaps[capId].count)) - Number(prodCaps[capId].cap))

                        newRecord.setSublistValue({
                            sublistId: "item",
                            fieldId: "custcol_anc_prodcapcheck",
                            line: a,
                            value : "⚠"
                        });
                        iconsList.push("⚠")
                    }
                    else if(Number(prodCaps[capId].count) > (Number(prodCaps[capId].cap)))
                    {
                        newRecord.setSublistValue({
                            sublistId: "item",
                            fieldId: "custcol_anc_prodcapcheck",
                            line: a,
                            value : "❌"
                        });
                        iconsList.push("❌")
                    }
                    else/* if(prodCaps[capId].count <= prodCaps[capId].cap)*/
                    {
                        newRecord.setSublistValue({
                            sublistId: "item",
                            fieldId: "custcol_anc_prodcapcheck",
                            line: a,
                            value : "✅"
                        });
                        iconsList.push("✅")
                    }
                }
                else
                {
                    newRecord.setSublistValue({
                        sublistId: "item",
                        fieldId: "custcol_anc_prodcapcheck",
                        line: a,
                        value : "❌"
                    });
                    iconsList.push("❌")
                }

            }

            if(iconsList.includes("❌"))
            {
                newRecord.setValue({
                    fieldId : "custbody_anc_prodcapstatusicon",
                    value : "❌"
                })

                validation_email_notifs(
                    newRecord,
                    "Prod Cap warning❌",
                    `order exceeded Prod Cap
                    ${JSON.stringify(prodCaps)}`
                )
            }
            else if(iconsList.includes("⚠"))
            {
                newRecord.setValue({
                    fieldId : "custbody_anc_prodcapstatusicon",
                    value : "⚠"
                })
                validation_email_notifs(
                    newRecord,
                    "Prod Cap warning⚠",
                    `order exceeded Prod Cap
                    ${JSON.stringify(prodCaps)}`
                )
            }
            else if(iconsList.includes(""))
            {
                newRecord.setValue({
                    fieldId : "custbody_anc_prodcapstatusicon",
                    value : "❌"
                })
                validation_email_notifs(
                    newRecord,
                    "Prod Cap warning❌",
                    `order exceeded Prod Cap
                    ${JSON.stringify(prodCaps)}`
                )
            }
            else if(iconsList.includes("✅"))
            {
                newRecord.setValue({
                    fieldId : "custbody_anc_prodcapstatusicon",
                    value : "✅"
                })
            }
            else
            {
                newRecord.setValue({
                    fieldId : "custbody_anc_prodcapstatusicon",
                    value : "❌"
                })
                validation_email_notifs(
                    newRecord,
                    "Prod Cap warning❌",
                    `order exceeded Prod Cap
                    ${JSON.stringify(prodCaps)}`
                )
            }
        }

        function validation_email_notifs(recObj, subject, body)
        {
            try
            {
                var isr = recObj.getValue({
                    fieldId : "custbody_anc_insidesalesrep"
                })
                var soDocNum = recObj.getValue({
                    fieldId : "tranid"
                })
                ////TODO disabled temorarily, no clarity how they want email notifs, Mike asked this but users complain of being bombarded
                ////TODO added back on 09172025 mike send just send whatever, some temporary stuff, to my self... as myself.
                ////TODO this will likely spam because of the multiple changes to salesorder, example, 5 shipments means SO needs to be changed 5 times, because validation occurs upon SO submit
                ////TODO take not ue does not trigger ue, shipment gen is not from UE so shipment gen,which also re-submit SO, triggers this script.
                email.send({
                    author: 108542 || isr,
                    recipients : 108542 || isr,
                    subject : subject,
                    body : body + "<br/> " + soDocNum
                })
            }
            catch(e)
            {
                log.error("ERROR in funcction validation_email_notifs", e)
            }
        }

        function postUpdates_forecastCaps(newRecord)
        {
            var forecastCaps = {};
            var transactionSearchObj = search.create({
                type: "transaction",
                settings:[{"name":"consolidationtype","value":"ACCTTYPE"}],
                filters:
                    [
                        ["mainline","is","F"],
                        "AND",
                        ["custcol_anc_customeralloc_caid","noneof","@NONE@"],
                        // "AND",
                        // ["internalid","anyof",[newRecord.id]] //THIS is a problem if you dont filter, because there are tons of salesforecast
                    ],
                columns:
                    [
                        search.createColumn({
                            name: "custcol_anc_customeralloc_caid",
                            summary: "GROUP",
                            label: "Sales Forecast"
                        }),
                        search.createColumn({
                            name: "custcol_anc_orderweight",
                            summary: "SUM",
                            label: "Weight"
                        }),
                        search.createColumn({
                            name: "custrecord_anc_pf_allocation",
                            join: "CUSTCOL_ANC_CUSTOMERALLOC_CAID",
                            summary: "GROUP",
                            label: "Sales Forecast - Allocation(MT)"
                        })
                    ]
            });
            var searchResultCount = transactionSearchObj.runPaged().count;
            log.debug("transactionSearchObj result count",searchResultCount);
            transactionSearchObj.run().each(function(result){
                // .run().each has a limit of 4,000 results
                var recId = result.getValue({
                    name: "custcol_anc_customeralloc_caid",
                    summary: "GROUP",
                    label: "Sales Forecast"
                });
                var count = result.getValue({
                    name: "custcol_anc_orderweight",
                    summary: "SUM",
                    label: "Weight"
                });
                var cap = result.getValue({
                    name: "custrecord_anc_pf_allocation",
                    join: "CUSTCOL_ANC_CUSTOMERALLOC_CAID",
                    summary: "GROUP",
                    label: "Sales Forecast - Allocation(MT)"
                });
                forecastCaps[recId] = {count : count, cap : cap};
                return true;
            });

            log.debug("postUpdates forecastCaps", forecastCaps)
            var lineCount = newRecord.getLineCount({
                sublistId : "item"
            });

            var iconsList = [];
            for(var a = 0 ; a < lineCount ; a++) {
                var capId = ""+newRecord.getSublistValue({
                    sublistId: "item",
                    fieldId: "custcol_anc_customeralloc_caid",
                    line: a
                });

                if(forecastCaps[capId])
                {
                    if(Number(forecastCaps[capId].count) > Number(forecastCaps[capId].cap))
                    {
                        newRecord.setSublistValue({
                            sublistId: "item",
                            fieldId: "custcol_anc_salesforecastcheck",
                            line: a,
                            value : "⚠"
                        });
                        iconsList.push("⚠")
                    }
                    else/* if(forecastCaps[capId].count <= forecastCaps[capId].cap)*/
                    {
                        newRecord.setSublistValue({
                            sublistId: "item",
                            fieldId: "custcol_anc_salesforecastcheck",
                            line: a,
                            value : "✅"
                        });
                        iconsList.push("✅")
                    }
                }
                else
                {
                    newRecord.setSublistValue({
                        sublistId: "item",
                        fieldId: "custcol_anc_salesforecastcheck",
                        line: a,
                        value : "❌"
                    });
                    iconsList.push("❌")
                }

            }

            if(iconsList.includes("❌"))
            {
                newRecord.setValue({
                    fieldId : "custbody_anc_forecasticon",
                    value : "❌"
                })
                validation_email_notifs(
                    newRecord,
                    "Sales Forecast warning❌",
                    `order exceeded Sales Forecast
                    ${JSON.stringify(forecastCaps)}`
                )
            }
            else if(iconsList.includes("⚠"))
            {
                newRecord.setValue({
                    fieldId : "custbody_anc_forecasticon",
                    value : "⚠"
                })
                validation_email_notifs(
                    newRecord,
                    "Sales Forecast warning⚠",
                    `order exceeded Sales Forecast
                    ${JSON.stringify(forecastCaps)}`
                )
            }
            else if(iconsList.includes(""))
            {
                newRecord.setValue({
                    fieldId : "custbody_anc_forecasticon",
                    value : "❌"
                })
                validation_email_notifs(
                    newRecord,
                    "Sales Forecast warning❌",
                    `order exceeded Sales Forecast
                    ${JSON.stringify(forecastCaps)}`
                )
            }
            else if(iconsList.includes("✅"))
            {
                newRecord.setValue({
                    fieldId : "custbody_anc_forecasticon",
                    value : "✅"
                })
            }
            else
            {
                newRecord.setValue({
                    fieldId : "custbody_anc_forecasticon",
                    value : "❌"
                })
                validation_email_notifs(
                    newRecord,
                    "Sales Forecast warning❌",
                    `order exceeded Sales Forecast
                    ${JSON.stringify(forecastCaps)}`
                )
            }
        }

        function groupBy(array, key) {
            return array.reduce(function (acc, obj) {
                let groupKey = obj[key];
                acc[groupKey] = acc[groupKey] || [];
                acc[groupKey].push(obj);
                return acc;
            }, {});
        }

        function groupByKeys(objectArray, property) {
            return objectArray.reduce(function (acc, obj) {

                var key = "";
                for(var a = 0 ; a < property.length; a++)
                {
                    if(!key)
                    {
                        key += (obj[property[a]] || "");
                    }
                    else
                    {
                        key += "_" + (obj[property[a]] || "");
                    }
                }
                // key += "|"

                if (!acc[key]) {
                    acc[key] = [];
                }
                acc[key].push(obj);
                return acc;
            }, {});
        }

        function completeFunction(nsObj,scriptContext)
        {
            var targetUrl = "";
            if(nsObj.targetScript && nsObj.targetDeployment)
            {
                var baseUiUrl = url.resolveScript({
                    scriptId : nsObj.targetScript,
                    deploymentId : nsObj.targetDeployment
                });

                targetUrl = baseUiUrl +"&traninternalid=" + scriptContext.newRecord.id
                targetUrl += "&processid=" + nsObj.processid
            }

            // nsObj.functionName = `alert('completeFunction${nsObj.label}')`
            nsObj.functionName = `window.open('${targetUrl}', 'popupWindow', 'width=1440,height=700,scrollbars=yes')`



        }

        const addElements = (scriptContext) => {
            try
            {
                var lineUrls = [];

                log.debug("scriptContext.type", scriptContext.type)

                if (scriptContext.type == "view" || scriptContext.type == "edit") {

                    log.debug("elemList.bodyElems.buttons", {a:elemList.bodyElems, b:elemList.bodyElems.buttons})

                    if(scriptContext.type == "view")
                    {
                        for(var j = 0 ; j < elemList.bodyElems.buttons.length; j++) {
                            log.debug("elemList.bodyElems[j]", elemList.bodyElems.buttons[j]);

                            var nsObj = elemList.bodyElems.buttons[j];
                            completeFunction(nsObj,scriptContext);

                            if(!nsObj.condition)
                            {
                                scriptContext.form.addButton(
                                    nsObj
                                )
                            }
                            else
                            {
                                var buttonConditionMet = nsObj.condition(scriptContext);
                                log.debug("buttonConditionMet", buttonConditionMet)
                                if(nsObj.condition(scriptContext))
                                {
                                    scriptContext.form.addButton(
                                        nsObj
                                    )
                                }
                            }
                        }

                        for(var j = 0 ; j < elemList.sublistElems.length; j++)
                        {
                            var groupElem = elemList.sublistElems[j];

                            var base_fitmentAndReserveUiUrl = "/app/site/hosting/scriptlet.nl?script=5576&deploy=1";
                            var base_fitmentAndReserveUiUrl = url.resolveScript({
                                scriptId : groupElem.targetScriptId,
                                deploymentId : groupElem.targetDeploymentId
                            });
                            log.debug("base_fitmentAndReserveUiUrl", base_fitmentAndReserveUiUrl);
                            base_fitmentAndReserveUiUrl += "&traninternalid=" + scriptContext.newRecord.id
                            ////TODO shortcuts what to bring in as parameters?
                            // base_fitmentAndReserveUiUrl += "&tranentity=" + scriptContext.newRecord.getValue({fieldId : "entity"})
                            // base_fitmentAndReserveUiUrl += "&trandate=" + scriptContext.newRecord.getValue({fieldId : "trandate"})
                            // base_fitmentAndReserveUiUrl += "&tranheaderitem=" + scriptContext.newRecord.getValue({fieldId : "assemblyitem"})
                            // base_fitmentAndReserveUiUrl += "&tranheadercreatedfrom=" + scriptContext.newRecord.getValue({fieldId : "createdfrom"})

                            // var othercompObj = getOtherComponents(scriptContext);
                            // var othercompparam = "&othercomp=" + othercompObj.stringify;
                            // base_fitmentAndReserveUiUrl += othercompparam;

                            log.debug("base_fitmentAndReserveUiUrl", base_fitmentAndReserveUiUrl);

                            var lineCount = scriptContext.newRecord.getLineCount({
                                sublistId : "item"
                            })

                            for(var a = 0  ; a < lineCount ; a++)
                            {
                                // var lastSubstituteId = scriptContext.newRecord.getSublistValue({sublistId : "item", fieldId : "custcol_r8l_itemsubstitution", line : a})
                                var substitutionCount = scriptContext.newRecord.getSublistValue({sublistId : "item", fieldId : "custcol_r8l_substitutioncount", line : a});


                                substitutionCount = Number(substitutionCount || 0);
                                log.debug("substitutionCount", substitutionCount);
                                if(substitutionCount > 0)
                                {
                                    var substitutionUiUrl = "substituted";
                                    lineUrls.push(substitutionUiUrl);
                                }
                                else
                                {
                                    var substitutionUiUrl = "" + base_fitmentAndReserveUiUrl;
                                    substitutionUiUrl += "&tranlinenum=" + scriptContext.newRecord.getSublistValue({sublistId : "item", fieldId : "line", line : a})
                                    // substitutionUiUrl += "&tranlineitem=" + scriptContext.newRecord.getSublistValue({sublistId : "item", fieldId : "item", line : a})
                                    // substitutionUiUrl += "&tranlineqty=" + scriptContext.newRecord.getSublistValue({sublistId : "item", fieldId : "quantity", line : a})
                                    substitutionUiUrl += "&tranlinesequence=" + (Number(a) + 1)

                                    // substitutionUiUrl += "&othercompf=" + JSON.stringify(filteredArr);
                                    lineUrls.push(substitutionUiUrl);
                                }


                            }

                            log.debug("lineUrls", lineUrls);

                            var inlineHtmlFieldValue = `
                        <script>
                        jQuery(document).ready(function() {
                            // alert(12345);
                            var anc_minimized_ui = false;
                            
                            var minimize_ui_interval = setInterval(function(){
                                var minimize_ui_tds = jQuery(".minimize_ui_elem_td0${groupElem.name}");
                                // console.log("anc_minimized_ui_${groupElem.name}", anc_minimized_ui)
                                console.log("minimize_ui_tds_${groupElem.name}", minimize_ui_tds)
                                if(/*!anc_minimized_ui || */minimize_ui_tds.length == 0)
                                {
                                    var rows = [];
                                    console.log("scriptContext.type", "${scriptContext.type}"=="view");
                                    if(("${scriptContext.type}"=="view") == true)
                                    {
                                        console.log("its true")
                                        rows = jQuery("#item_splits.uir-machine-table tbody tr");
                                    }
                                    else if("${scriptContext.type}"=="edit")
                                    {
                                        console.log("its false")
                                        rows = jQuery("tr[id^=item_row]");
                                        rows = jQuery("#item_splits.uir-machine-table tbody tr[id^=item_]");
                                    }
                                    
                                    console.log("rows", rows);
                                    
                                    rows.each(function(index, elem){
                                        
                                        var lineUrls = ${JSON.stringify(lineUrls)};
                                        
                                        // console.log("lineUrls", lineUrls);
                                        
                                        window["lineUrl_" + index] = lineUrls[index]
                                    
                                        if(index==0)
                                        {
                                            // console.log("jQuery(this).children()" + index, jQuery(this).children());
                                            // jQuery(this).prepend("<td>${groupElem.headerTitle}</td>") 
                                            // jQuery(this).prepend("<td height="100%" class="listheadertd listheadertextb uir-column-large" style="" data-label="Units" data-nsps-type="columnheader" data-nsps-label="Units" data-nsps-id="columnheader_item_units"><div class="listheader">${groupElem.headerTitle}</td>") 
                                            // jQuery(this).prepend('<td height="100%" class="listheadertdleft listheadertextb uir-column-large" style="" data-label="Item" data-nsps-type="columnheader" data-nsps-label="Item" data-nsps-id="columnheader_item_item"><div class="listheader">${groupElem.headerTitle}<img class="uir-hover-icon" src="/images/hover/icon_hover.png?v=2025.1" alt="" border="0" style="margin-left:8px;vertical-align:middle;" title="This column is hoverable"></div></td>')   
                                            jQuery(this).children().eq(${groupElem.position}).before(jQuery('<td height="100%" class="minimize_ui_elem_td0${groupElem.name} listheadertd listheadertextb uir-column-large" style="" data-label="Units" data-nsps-type="columnheader" data-nsps-label="Units" data-nsps-id="columnheader_item_units"><div class="listheader">${groupElem.headerTitle}</td>'));
                                            
                                            anc_minimized_ui = true;
                                        }
                                        else
                                        {
                                            // console.log("jQuery(this).children()" + index, jQuery(this).children());
                                            // var newTdHtml = '<td align="center"><img width="25px" height="25px" src="https://tstdrv1469253.app.netsuite.com/core/media/media.nl?id=58980&c=TSTDRV1469253&h=cb99Jl9ybtFCXBKZyIxOi8rE3eIQMbaejHergNw3VHVbiTGL" style="cursor: pointer;" onclick="window.open(window.lineUrl_';
                                            
                                            var newTdHtml = "";
                                            if(${groupElem.tdElementEnd})
                                            {
                                                newTdHtml = ${groupElem.tdElementStart}
                                                newTdHtml += (index-1)
                                                newTdHtml += ${groupElem.tdElementEnd}
                                            }
                                            else
                                            {
                                                newTdHtml = '<td class="minimize_ui_elem_td0${groupElem.name}" align="center"><p>${groupElem.rowTitle}<br/><img width="${groupElem.iconWidth}" height="${groupElem.iconHeight}" src="${groupElem.icon}" style="cursor: pointer;" onclick="window.open(window.lineUrl_';
                                        
                                                newTdHtml += (index-1) + ', \\'popupWindow\\', \\'width=700,height=700,scrollbars=yes\\'); return false;" alt="Click to open popup"></p></td>'
                                    
                                            }
                                            
                                            var lineUrl = lineUrls[index-1]
                                            if(lineUrl != "substituted")
                                            {
                                                // jQuery(this).prepend(newTdHtml);
                                                jQuery(this).children().eq(${groupElem.position}).before(jQuery(newTdHtml));
                                            }
                                            else
                                            {
                                                // jQuery(this).prepend('<td align="center">Reserved</td>');
                                                jQuery(this).children().eq(${groupElem.position}).before(jQuery('<td align="center">Reserved</td>'));
                                            }
                                            
                                            anc_minimized_ui = true;
                                        }
                                    })
                                }
                                else
                                {
                                    clearInterval(minimize_ui_interval);
                                }
                            }, 3000)
                            
                        });
                        </script>
                        `

                            var inlineHtmlField = scriptContext.form.addField({
                                id: "custpage_anc_salesprocesses_html" + j,
                                type: "inlinehtml",
                                label: "ANC SALES PROCESSES" + j
                            });

                            inlineHtmlField.defaultValue = inlineHtmlFieldValue;

                        }
                    }
                }
            } catch (e) {
                log.error("ERROR in function addElements", e);
            }
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
            try
            {
                try
                {
                    if(scriptContext.newRecord.type == "transferorder")
                    {
                        var custbody_ns_consignee = scriptContext.newRecord.getValue({
                            fieldId : "custbody_ns_consignee"
                        })

                        if(!custbody_ns_consignee)
                        {
                            var transferLocationId = scriptContext.newRecord.getValue({
                                fieldId : "transferlocation"
                            })


                            var custCons_consMaster_obj = ANC_lib.findConsigneeFromLocation(transferLocationId);

                            var custcons_id = custCons_consMaster_obj.customerConsigneeId
                            var consmaster_id = custCons_consMaster_obj.consigneeMasterId

                            if(custCons_consMaster_obj.customerConsigneeId)
                            {
                                scriptContext.newRecord.setValue({
                                    fieldId : "custbody_ns_consignee",
                                    value : custcons_id
                                })
                            }
                        }
                    }
                }
                catch(e)
                {
                    log.error("ERROR in function beforeSubmit", e);
                }
            }
            catch(e)
            {
                log.error("ERROR in function beforeSubmit", e)
            }

        }

        function prepItems(recObj)
        {
            var prepItems_result = {list:[]};
            try
            {
                var lineCount = recObj.getLineCount({
                    sublistId : "item"
                });
                for(var a = 0 ; a < lineCount ; a++)
                {
                    var lineObj = {};
                    lineObj["line_index"] = a;
                    lineObj.line_item = recObj.getSublistValue({
                        sublistId : "item",
                        fieldId : "item",
                        line : a
                    });
                    lineObj.line_overrideopts = recObj.getSublistValue({
                        sublistId : "item",
                        fieldId : "custcol_anc_item_override_options",
                        line : a
                    });
                    lineObj.line_grade = recObj.getSublistValue({
                        sublistId : "item",
                        fieldId : "custcol_anc_grade",
                        line : a
                    });
                    // lineObj["line_item"] = line_item;
                    // lineObj["custcol_anc_item_override_options"] = line_overrideopts;
                    // lineObj[line_item] = line_item;

                    lineObj.line_overrideopts_stringify = `{${lineObj.line_overrideopts.split("\n").join(",")}}`;
                    log.debug("lineObj after overrideopts stringify", lineObj.line_overrideopts_stringify);
                    lineObj.line_overrideopts_obj = JSON.parse(lineObj.line_overrideopts_stringify);
                    log.debug("lineObj after overrideopts parse", lineObj)

                    if(lineObj.line_overrideopts_obj && lineObj.line_overrideopts_obj["G"])
                    {
                        prepItems_result.list.push(lineObj);
                    }

                    prepItems_result.byItem = groupBy(prepItems_result.list, "line_item");
                    prepItems_result.byIndex = groupBy(prepItems_result.list, "line_index");
                    prepItems_result.byGrade = groupBy(prepItems_result.list, "line_grade");
                }

                for (var gradeId in prepItems_result.byGrade)
                {
                    for(var a = 0 ; a < prepItems_result.byGrade[gradeId].length ; a++)
                    {
                        var opts = prepItems_result.byGrade[gradeId][a].line_overrideopts_obj;
                        log.debug("opts after prepitems", opts)
                        if(opts.D && opts.W && opts.Core)
                        {
                            var csv_row = [];
                            // var opts = prepItems_result.byGrade[a].line_overrideopts_stringify;
                            csv_row.push(gradeId, opts.D, opts.W, (opts.Core || opts.CORE));
                            log.debug("csv_row after prepitems", csv_row)
                            var csv_row_text = csv_row.join(",");
                            log.debug("csv_row_text after prepitems", csv_row_text)

                            csv_rows.push(csv_row_text)
                        }
                    }
                }
                csv_text = csv_rows.join("\n")
                log.debug("prepItems csv_text", csv_text)
            }
            catch(e)
            {
                log.error("ERROR in function prepItems", e)
            }

            log.debug("prepItems_result", prepItems_result);
            return prepItems_result;
        }

        var doSaveAfterSubmit = false;
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
            if(scriptContext.newRecord.type == "salesorder")
            {
                if(scriptContext.type == "delete")
                {
                    return;
                }
                var recObj = record.load({
                    type : scriptContext.newRecord.type,
                    id : scriptContext.newRecord.id
                });

                if(scriptContext.type == "create" || scriptContext.type == "copy")
                {
                    recObj.setValue({
                        fieldId : "orderstatus",
                        value : "A" //PENDING
                    })
                    recObj.setValue({
                        fieldId : "custbody_anc_sostatus",
                        value : 1 //PENDING
                    })


                    recObj.setValue({
                        fieldId : "custbody_anc_syncjob",
                        value : "" //PENDING
                    })

                    recObj.setValue({
                        fieldId : "custbody_anc_syncjob_release",
                        value : false //PENDING
                    })

                    //header validation icons
                    recObj.setValue({
                        fieldId : "custbody_anc_forecasticon",
                        value : "" //PENDING
                    })
                    recObj.setValue({
                        fieldId : "custbody_anc_prodcapstatusicon",
                        value : "" //PENDING
                    })
                    recObj.setValue({
                        fieldId : "custbody_anc_fitmentstatusicon",
                        value : "" //PENDING
                    })
                    recObj.setValue({
                        fieldId : "custbody_anc_shipcapstatusicon",
                        value : "" //PENDING
                    })


                }

                //create mimssing item
                // prepItems(recObj);
                // deprecated, use item validator custom record/dropdown // deprecated itemvalidator too //lots of back and forth on this, no clarity on what to follow i asked they just keep saying they will ask users
                // decision : not only use discontinue validator, but to also change item type or setup
                //TODO to remove this code and affected areas

                determineLane(recObj);

                log.debug("afterSubmit , call implementSF");
                implementSF(recObj);

                if(doSaveAfterSubmit)
                {
                    var submittedRecId = recObj.save({
                        ignoreMandatoryFields : true,
                        enableSourcing : true
                    })

                    log.debug("afterSubmit submittedRecId after prepitems, determinelane, implemFitment", submittedRecId);
                }

                var recObj = record.load({
                    type : scriptContext.newRecord.type,
                    id : scriptContext.newRecord.id
                });

                //call it after shipdate is resolved
                implementShipCap(recObj);

                //call it after shipdate,proddate is resolved //TODO
                implementProdCap(recObj);


                updateShipmentLines(recObj, scriptContext);

                /*
                ////TODO TEMP DISABLED
                // var pastLdcLinesSqlResults = ANC_lib.querySoPastLdc({traninternalids:[scriptContext.newRecord.id], sqlOperator:"IN", filterbyfield :"TRANSACTION.ID", dayspassedoper : ">", dayspassed : 0})
                //
                // var syncLinesPastLdcSyncResults = ANC_lib.syncLinesPastLdc(pastLdcLinesSqlResults)
                //
                // var updateLinesPastLdcResults = ANC_lib.updateLinesPastLdc(recObj, pastLdcLinesSqlResults)
                */

                var submittedRecId = recObj.save({
                    ignoreMandatoryFields : true,
                    enableSourcing : true
                })

                var recObj = record.load({
                    type : scriptContext.newRecord.type,
                    id : scriptContext.newRecord.id
                });

                postUpdates(recObj)
                var submittedRecId = recObj.save({
                    ignoreMandatoryFields : true,
                    enableSourcing : true
                })

                log.debug("afterSubmit after postUpdates", submittedRecId);
            }
            else if(scriptContext.newRecord.type == "transferorder")
            {
                var recObj = record.load({
                    type : scriptContext.newRecord.type,
                    id : scriptContext.newRecord.id
                });

                if(scriptContext.type == "create" || scriptContext.type == "copy")
                {
                    recObj.setValue({
                        fieldId : "orderstatus",
                        value : "A" //PENDING
                    })
                    recObj.setValue({
                        fieldId : "custbody_anc_sostatus",
                        value : 1 //PENDING
                    });

                    //CONSIGNEE --- default to ANC for now
                    // recObj.setValue({
                    //     fieldId : "custbody_consignee",
                    //     value : 280317 //TODO hardcoded to Castle-PrinTech, but change to ANC CONSIGNEE later - not sure if the consignee is ready enough for me to use in my devt
                    // });
                    //FIXME cant, this custbody_anc_sostatus is sourced/filtered by entity because of how it is used on SO, TO does not have a customer/entity
                    //then create a new field for this, or just keep hardcoding, hardcoding is not good because it has no

                }

                //create mimssing item
                // prepItems(recObj); //deprecated, use item validator custom record/dropdown

                determineLane(recObj);

                if(doSaveAfterSubmit)
                {
                    var submittedRecId = recObj.save({
                        ignoreMandatoryFields : true,
                        enableSourcing : true
                    })
                }
            }
        }

        function determineLane(recObj)
        {
            var doDetermineLane = true;
            try
            {
                if(doDetermineLane)
                {
                    var lineCount = recObj.getLineCount({
                        sublistId : "item"
                    });
                    var header_consigneeId = recObj.getValue({
                        fieldId : "custbody_consignee"
                    });
                    if(recObj.type == "transferorder")
                    {
                        header_consigneeId = recObj.getValue({
                            fieldId : "custbody_ns_consignee"
                        });
                    }
                    var custbody_anc_ldc = recObj.getValue({
                        fieldId : "custbody_anc_ldc"
                    });
                    var header_consigneeLookup = search.lookupFields({
                        type : ANC_lib.references.RECTYPES.consignee.id,
                        id : header_consigneeId,
                        columns : ANC_lib.references.RECTYPES.consignee.fields.city
                    })
                    var header_consigneeCity = header_consigneeLookup[ANC_lib.references.RECTYPES.consignee.fields.city]
                    log.debug("header_consigneeCity.", header_consigneeCity);

                    var header_originWarehouse = recObj.getValue({
                        fieldId : "location"
                    })

                    var lineDetailsSql = `
                        SELECT
                        BUILTIN_RESULT.TYPE_STRING(Location_SUB.city) AS loc_city,
                        BUILTIN_RESULT.TYPE_STRING(transactionLine.custcol_anc_consigneealtaddresscity) AS cons_city,
                        BUILTIN_RESULT.TYPE_INTEGER(CUSTOMRECORD_ALBERTA_NS_CONSIGNEE_RECORD.ID) AS cons_id,
                        BUILTIN_RESULT.TYPE_INTEGER(Location_SUB.id_join) AS loc_id
                    FROM
                        TRANSACTION,
                        CUSTOMRECORD_ALBERTA_NS_CONSIGNEE_RECORD,
                        (
                            SELECT
                                LOCATION.ID AS id_join,
                                LocationMainAddress.city AS city
                            FROM
                                LOCATION,
                                LocationMainAddress
                            WHERE
                                LOCATION.mainaddress = LocationMainAddress.nkey(+)
                        ) Location_SUB,
                        transactionLine
                    WHERE
                        TRANSACTION.ID = transactionLine.TRANSACTION
                        AND (
                            NVL(transactionLine.mainline, 'F') = 'F' AND
                            NVL(transactionLine.taxline, 'F') = 'F'
                        )
                        AND CUSTOMRECORD_ALBERTA_NS_CONSIGNEE_RECORD.ID(+) = COALESCE(TRANSACTION.custbody_ns_consignee, COALESCE(transactionLine.custcol_consignee, TRANSACTION.custbody_consignee))
                        AND Location_SUB.id_join(+) = transactionLine.LOCATION
                        AND TRANSACTION.ID IN ('${recObj.id}')
                    `

                    log.debug("lineDetailsSql", lineDetailsSql);

                    var lineDetailsSqlRes = query.runSuiteQL({ query: lineDetailsSql }).asMappedResults();
                    //TODO overrides 08252025
                    if(recObj.type == "transferorder")
                    {
                        lineDetailsSqlRes.map(function(elem){
                            elem.cons_id = header_consigneeId
                            // elem.cons_city = header_consigneeCity //09082025 City must be retrieved as a linelevel defaulted value with override options
                        })
                    }
                    lineDetailsSqlRes_byCons = groupBy(lineDetailsSqlRes, "cons_id")
                    lineDetailsSqlRes_byLoc = groupBy(lineDetailsSqlRes, "loc_id")
                    lineDetailsSqlRes_byCity_loc = groupByKeys(lineDetailsSqlRes, ["cons_city", "loc_id"])

                    log.debug("lineDetailsSqlRes_byCons", lineDetailsSqlRes_byCons);
                    log.debug("lineDetailsSqlRes_byCity_loc", lineDetailsSqlRes_byCity_loc);
                    log.debug("lineDetailsSqlRes_byLoc", lineDetailsSqlRes_byLoc);

                    var laneFiltersArray = [];
                    for (var city_loc in lineDetailsSqlRes_byCity_loc) {
                        var consigneeCity = lineDetailsSqlRes_byCity_loc[city_loc][0].cons_city
                            ? lineDetailsSqlRes_byCity_loc[city_loc][0].cons_city
                            : header_consigneeCity;

                        var originWarehouse = lineDetailsSqlRes_byCity_loc[city_loc][0].loc_city
                            ? lineDetailsSqlRes_byCity_loc[city_loc][0].loc_city
                            : lineDetailsSqlRes_byLoc[header_originWarehouse].loc_city;

                        // Case-insensitive comparisons by normalizing both sides with UPPER()
                        if(recObj.type == "transferorder")
                        {
                            laneFiltersArray.push(
                                `(
                              UPPER(${ANC_lib.references.RECTYPES.lane.fields.originwarehousecity}) = ${sqlSafeUpperLiteral(originWarehouse)}
                              AND UPPER(${ANC_lib.references.RECTYPES.lane.fields.destinationcity}) = ${sqlSafeUpperLiteral(consigneeCity)}
                            )`
                            );
                        }
                        else
                        {
                            laneFiltersArray.push(
                                `(
                              UPPER(${ANC_lib.references.RECTYPES.lane.fields.originwarehousecity}) = ${sqlSafeUpperLiteral(originWarehouse)}
                              AND UPPER(${ANC_lib.references.RECTYPES.lane.fields.destinationcity}) = ${sqlSafeUpperLiteral(consigneeCity)}
                            )`
                            );
                        }
                    }

                    var laneFiltersStr = laneFiltersArray.join(" OR ");

                    var laneSql = `
                        SELECT
                            lane.id                                   AS lane_id,
                            lane.custrecord_anc_lane_destination      AS cons_id,
                            lane.custrecord_anc_lane_destinationcity  AS lane_destcity,
                            lane.custrecord_anc_lane_originwarehouse  AS lane_origloc,
                            lane.custrecord_anc_lane_originwarehousecity AS lane_origcity,

                            lane.custrecord_anc_lane_cdw              AS lane_xdockloc,
                            lane.custrecord_anc_lane_crossdockcity    AS lane_xdockcity,
                            lane.custrecord_anc_lane_cdtt             AS lane_xdocktt,
                            lane.custrecord_anc_lane_cdc              AS lane_xdockcost,
                            lane.custrecord_anc_lane_cde              AS lane_xdockeq,

                            lane.custrecord_anc_lane_lcpt             AS lane_lcpt,
                            lane.custrecord_anc_lane_lctt             AS lane_lctt,
                            lane.custrecord_anc_lane_lce              AS lane_lceq,

                            lane.custrecord_fttc                      AS lane_fttc,
                            lane.custrecord_anc_lane_ftt              AS lane_ftt,
                            lane.custrecord_anc_lane_ftte             AS lane_ftteq,

                            lane.custrecord_anc_lane_ltt              AS lane_ltt,
                            lane.custrecord_anc_crossdockeligible     AS lane_xdockelig
                        FROM ${ANC_lib.references.RECTYPES.lane.id} AS lane
                        WHERE
                            lane.isinactive = 'F'
                          AND (${laneFiltersStr})
                    `;

                    // SELECT lane.id FROM customrecord_anc_shippinglanes as lane JOIN customrecord_alberta_ns_consignee_record as cons ON cons.ID = lane.custrecord_anc_lane_destination WHERE lane.isinactive = 'F' AND ( lane.custrecord_anc_lane_originwarehouse = '215' AND cons.ID = 198816)

                    log.debug("determineLane laneSql", laneSql)
                    var laneSqlResults = query.runSuiteQL({ query: laneSql }).asMappedResults();
                    laneSqlResults = laneSqlResults.map(function(elem){
                        elem.lane_destcity = elem.lane_destcity.toLowerCase();
                        elem.lane_origcity = elem.lane_origcity.toLowerCase();
                        return elem;
                    })
                    log.debug("laneSqlResults", laneSqlResults)
                    laneSqlResults_byCity_loc = groupByKeys(laneSqlResults, ["lane_destcity", "lane_origcity"]);
                    log.debug("laneSqlResults_byCity_loc", laneSqlResults_byCity_loc);
                    for(var a = 0 ; a < lineCount ; a++)
                    {
                        //UPDATE LINEUNIQUEKEYS so it can be inherited by succeeding transactions, eg. SO to Item fulfillments, this is because we would have to know which lines to fulfill
                        //in short, the itemfulfillment does not inherit the native salesorders lineuniquekey, this makes sense because itemfulfillment has it's own
                        //netsuite has a hidden way of linking this, likely by the order number, but these are assumptions and could easily break.
                        var currentLineUniquekey  = recObj.getSublistValue({
                            sublistId : "item",
                            fieldId : "lineuniquekey",
                            line : a
                        })
                        recObj.setSublistValue({
                            sublistId : "item",
                            fieldId : "custcol_anc_orig_uniquekeytracker",
                            line : a,
                            value : currentLineUniquekey
                        })

                        var lineVals = {}
                        lineVals.consignee = recObj.getSublistValue({
                            sublistId : "item",
                            fieldId : ANC_lib.references.SO_COLUMNS.CONSIGNEE,
                            line : a
                        }) || recObj.getValue({
                            fieldId : "custbody_consignee"
                        }) || recObj.getValue({
                            fieldId : "custbody_ns_consignee"
                        });

                        lineVals.consignee = recObj.getSublistValue({
                            sublistId : "item",
                            fieldId : "custcol_anc_consigneealtaddresscity",
                            line : a
                        }) || recObj.getValue({
                            fieldId : "custbody_consignee"
                        }) || recObj.getValue({
                            fieldId : "custbody_ns_consignee"
                        });

                        log.debug("RESOLVE LINE CONSIGNEE lineVals", lineVals)

                        if(!lineVals.consignee)
                        {
                            lineVals.consignee = recObj.getValue({
                                fieldId : "custbody_consignee",
                            }) || recObj.getValue({
                                fieldId : "custbody_ns_consignee",
                            })
                        }
                        if(recObj.type == "transferorder")
                        {
                            lineVals.consignee = recObj.getValue({
                                fieldId : "custbody_ns_consignee",
                            }) || recObj.getValue({
                                fieldId : "custbody_consignee",
                            })
                        }
                        else
                        {
                            lineVals.consignee = recObj.getValue({
                                fieldId : "custbody_consignee",
                            }) || recObj.getValue({
                                fieldId : "custbody_ns_consignee",
                            })
                        }
                        lineVals.consigneeCity = recObj.getSublistValue({
                            sublistId : "item",
                            fieldId : `custcol_anc_consigneealtaddresscity`,
                            line : a
                        })

                        //TODO 08262025 - it needs city of the consignee, but the consignee is not present here if its a leg1 TO because the consignee field is prefiltered by customer, customer standard and cannot be included in the TO
                        lineVals.consigneeCity = lineVals.consigneeCity || lineVals.custcol_anc_consigneealtaddresscity || lineDetailsSqlRes_byCons[""+lineVals.consignee][0].cons_city || header_consigneeCity;

                        // log.debug("RESOLVE LINE CONSIGNEE lineVals", {lineVals, byCons:lineDetailsSqlRes_byCons[""+lineVals.consignee], byCons_consCity:lineDetailsSqlRes_byCons[""+lineVals.consignee].cons_city, header_consigneeCity})

                        lineVals.location = recObj.getSublistValue({
                            sublistId : "item",
                            fieldId : "location",
                            line : a
                        })
                        lineVals.location = lineVals.location ? lineVals.location : header_originWarehouse;
                        lineVals.origincity = lineDetailsSqlRes_byLoc[""+lineVals.location][0].loc_city

                        var line_destCity_origloc = lineVals.consigneeCity + "_" + lineVals.origincity
                        line_destCity_origloc = line_destCity_origloc.toLowerCase();
                        log.debug("setting shippinglane index" + a, {a, line_destCity_origloc})
                        if(laneSqlResults_byCity_loc[line_destCity_origloc])
                        {
                            lineVals.optmethod = recObj.getSublistValue({
                                sublistId : "item",
                                fieldId : "custcol_anc_transitoptmethod",
                                line : a
                            })

                            var transitTime = "";
                            var xdockElig = laneSqlResults_byCity_loc[line_destCity_origloc][0].lane_xdockelig
                            var xdockCost = laneSqlResults_byCity_loc[line_destCity_origloc][0].lane_xdockcost;
                            var directLowestCost = laneSqlResults_byCity_loc[line_destCity_origloc][0].lane_lcpt
                            var lane_lceq = laneSqlResults_byCity_loc[line_destCity_origloc][0].lane_lceq
                            var lane_xdockeq = laneSqlResults_byCity_loc[line_destCity_origloc][0].lane_xdockeq
                            var lane_fteq = laneSqlResults_byCity_loc[line_destCity_origloc][0].lane_ftteq
                            var lane_ftt = laneSqlResults_byCity_loc[line_destCity_origloc][0].lane_ftt
                            var lane_xdocktt = laneSqlResults_byCity_loc[line_destCity_origloc][0].lane_xdocktt
                            var lane_lctt = laneSqlResults_byCity_loc[line_destCity_origloc][0].lane_lctt

                            var lane_xdockloc = laneSqlResults_byCity_loc[line_destCity_origloc][0].lane_xdockloc

                            var xdock_direct_diff = xdockCost - directLowestCost;
                            var xdock_direct_diff_tt = lane_xdocktt - lane_ftt;
                            //LOWEST COST
                            //BY DEFAULT LOWEST COSt, so if left blank then assume LOWEST COST

                            var extraTransitTime = 0;
                            if(xdockElig && xdockElig != "F")
                            {
                                recObj.setSublistValue({
                                    sublistId : "item",
                                    fieldId : "custcol_anc_usecrossdock",
                                    line : a,
                                    value : true //TODO what to follow if xdock but lowcost
                                })

                                //added on 09152025 there seem to be a dependency this field is hidden on the form but meant to track the transitloc/ xdockwhs
                                recObj.setSublistValue({
                                    sublistId : "item",
                                    fieldId : "custcol_anc_transitlocation",
                                    line : a,
                                    value : lane_xdockloc
                                })
                                log.debug("successfully set custcol_anc_transitlocation with value " + lane_xdockloc, lane_xdockloc)

                                //xdock attributes such as cost will be maintained by delivery planner, manually - Mike, Rod
                                //it is manageable enough for the delivery planner - Mike, Rod
                                //TODO no thresholds
                                //xdock9 - direct10 = -1, if diff is under 0 then we want to use xdock cause it's cheaper
                                log.debug("xdockElig=Y set usecrossdock = T", xdock_direct_diff)
                                if(!lineVals.optmethod || lineVals.optmethod == 1) //1 = lowest cost //TODO they mentoned standard opt mehod (kate, mike)
                                {
                                    log.debug("xdockElig lineVals.optmethod == 1", xdockElig)
                                    //only if direct lowest cost equip is defined
                                    if(lane_lceq)
                                    {
                                        recObj.setSublistValue({
                                            sublistId : "item",
                                            fieldId : "custcol_anc_transittime_leg1", //TODO provision field if needed
                                            line : a,
                                            value : lane_xdocktt //TODO what to follow if xdock but lowcost
                                        })
                                        log.debug("xdockElig lineVals.optmethod == 1 lane_lceq", lane_lceq);
                                    }


                                    ////09122025 CROSSDOCK EQ is for LEG1, the WHITECOURT to CROSSDOCK situation
                                    ////what we optimize is the LEG2 shipments
                                    recObj.setSublistValue({
                                        sublistId : "item",
                                        fieldId : "custcol_anc_equipment",
                                        line : a,
                                        value : lane_lceq //TODO what to follow if xdock but lowcost
                                    })
                                    recObj.setSublistValue({
                                        sublistId : "item",
                                        fieldId : "custcol_anc_transittime",
                                        line : a,
                                        value : lane_lctt //TODO what to follow if xdock but lowcost
                                    })

                                    transitTime = lane_lctt

                                }
                                else if(lineVals.optmethod && lineVals.optmethod == 2) //2 = fastest time
                                {
                                    recObj.setSublistValue({
                                        sublistId : "item",
                                        fieldId : "custcol_anc_transittime_leg1", //TODO provision field if needed
                                        line : a,
                                        value : lane_fteq
                                    })

                                    recObj.setSublistValue({
                                        sublistId : "item",
                                        fieldId : "custcol_anc_equipment",
                                        line : a,
                                        value : lane_fteq //TODO what to follow if xdock but lowcost
                                    })
                                    recObj.setSublistValue({
                                        sublistId : "item",
                                        fieldId : "custcol_anc_transittime",
                                        line : a,
                                        value : lane_ftt //TODO what to follow if xdock but lowcost
                                    })

                                    transitTime = lane_ftt
                                }

                                extraTransitTime += lane_xdocktt;
                            }
                            //not xdock eligible, auto refer to direct lowest cost
                            else
                            {
                                recObj.setSublistValue({
                                    sublistId : "item",
                                    fieldId : "custcol_anc_usecrossdock",
                                    line : a,
                                    value : false //TODO what to follow if xdock but lowcost
                                })
                                //xdock attributes such as cost will be maintained by delivery planner, manually - Mike, Rod
                                //it is manageable enough for the delivery planner - Mike, Rod
                                //TODO no thresholds
                                //xdock9 - direct10 = -1, if diff is under 0 then we want to use xdock cause it's cheaper
                                log.debug("xdockElig=N set usecrossdock = T", xdock_direct_diff)
                                if(!lineVals.optmethod || lineVals.optmethod == 1) //1 = lowest cost //TODO they mentoned standard opt mehod (kate, mike)
                                {
                                    log.debug("xdockElig=N lineVals.optmethod == 1", xdockElig)
                                    //only if direct lowest cost equip is defined
                                    if(lane_lceq)
                                    {
                                        recObj.setSublistValue({
                                            sublistId : "item",
                                            fieldId : "custcol_anc_equipment",
                                            line : a,
                                            value : lane_lceq //TODO what to follow if xdock but lowcost
                                        })
                                        recObj.setSublistValue({
                                            sublistId : "item",
                                            fieldId : "custcol_anc_transittime", //TODO provision field if needed
                                            line : a,
                                            value : lane_lctt //TODO what to follow if xdock but lowcost
                                        })
                                        recObj.setSublistValue({
                                            sublistId : "item",
                                            fieldId : "custcol_anc_transittime_leg1", //TODO provision field if needed
                                            line : a,
                                            value : lane_lctt //TODO what to follow if xdock but lowcost
                                        })
                                        log.debug("xdockElig=N lineVals.optmethod == 1 lane_lceq", lane_lceq)
                                        transitTime = lane_lctt
                                    }
                                }
                                else if(lineVals.optmethod && lineVals.optmethod == 2) //2 = fastest time
                                {
                                    recObj.setSublistValue({
                                        sublistId : "item",
                                        fieldId : "custcol_anc_equipment",
                                        line : a,
                                        value : lane_fteq
                                    })
                                    recObj.setSublistValue({
                                        sublistId : "item",
                                        fieldId : "custcol_anc_transittime", //TODO provision field if needed
                                        line : a,
                                        value : lane_ftt
                                    })
                                    recObj.setSublistValue({
                                        sublistId : "item",
                                        fieldId : "custcol_anc_transittime_leg1", //TODO provision field if needed
                                        line : a,
                                        value : lane_ftt
                                    })
                                    transitTime = lane_ftt
                                }
                            }

                            //TODO example , line 1 used to be 0403 deliver ship 0325, but should be 0403 - 2 days = 0401
                            var newShipDate = "";
                            var newProductionDate = "";
                            var newLdcDate = "";
                            var deliverydate = recObj.getSublistValue({
                                sublistId : "item",
                                fieldId : ANC_lib.references.SO_COLUMNS.DELIVERYDATE,
                                line : a
                            });
                            var ldcDate = recObj.getSublistValue({
                                sublistId : "item",
                                fieldId : ANC_lib.references.SO_COLUMNS.DELIVERYDATE,
                                line : a
                            });
                            //need deep copies
                            var deliverydate_forprod = recObj.getSublistValue({
                                sublistId : "item",
                                fieldId : ANC_lib.references.SO_COLUMNS.DELIVERYDATE,
                                line : a
                            });
                            log.debug("raw deliverydate", deliverydate)
                            log.debug("raw deliverydate_forprod", deliverydate_forprod)
                            log.debug("transitTime", transitTime || 0)

                            if(deliverydate)
                            {
                                deliverydate = new Date(deliverydate);
                                if(typeof deliverydate == "object")
                                {
                                    newShipDate = deliverydate.setDate(deliverydate.getDate() - transitTime)
                                    newProductionDate = deliverydate_forprod.setDate(deliverydate_forprod.getDate() - transitTime - extraTransitTime - 1)

                                    newLdcDate = new Date(deliverydate);
                                    newLdcDate = newLdcDate.setDate(newLdcDate.getDate() - custbody_anc_ldc)
                                }
                                else
                                {
                                    newShipDate = new Date(deliverydate).setDate(deliverydate.getDate() - transitTime)
                                    newProductionDate = new Date(deliverydate_forprod).setDate(deliverydate_forprod.getDate() - transitTime - extraTransitTime - 1)

                                    newLdcDate = new Date(deliverydate);
                                    newLdcDate = newLdcDate.setDate(newLdcDate.getDate() - custbody_anc_ldc)
                                }
                                newShipDate = (typeof newShipDate) != "object" ? new Date(newShipDate) : newShipDate;
                                newProductionDate = (typeof newProductionDate) != "object" ? new Date(newProductionDate) : newProductionDate;
                                newLdcDate = (typeof newLdcDate) != "object" ? new Date(newLdcDate) : newLdcDate;

                                var newShipDate = format.format({
                                    value: newShipDate,
                                    type: format.Type.DATE
                                });

                                var newProductionDate = format.format({
                                    value: newProductionDate,
                                    type: format.Type.DATE
                                });

                                var newLdcDate = format.format({
                                    value: newLdcDate,
                                    type: format.Type.DATE
                                });

                                log.debug("newProductionDate", newProductionDate);
                                log.debug("newShipDate", newShipDate);
                                log.debug("newLdcDate", newLdcDate);
                                // transitTime
                                //update shipdate
                                if(newShipDate)
                                {
                                    recObj.setSublistText({
                                        sublistId : "item",
                                        fieldId : "custcol_anc_shipdate",
                                        line : a,
                                        // value : newShipDate,
                                        text : newShipDate
                                    })
                                }
                                if(recObj.type == "salesorder")
                                {
                                    if(newProductionDate)
                                    {
                                        recObj.setSublistText({
                                            sublistId : "item",
                                            fieldId : "custcol_anc_productiondate",
                                            line : a,
                                            // value : newProductionDate,
                                            text : newProductionDate
                                        })
                                    }
                                }
                                if(recObj.type == "salesorder")
                                {
                                    //06012025
                                    if(newLdcDate)
                                    {
                                        recObj.setSublistText({
                                            sublistId : "item",
                                            fieldId : "custcol_anc_ldcdate",
                                            line : a,
                                            // value : newLdcDate,
                                            text : newLdcDate
                                        })
                                    }
                                }
                            }
                            doSaveAfterSubmit = true;
                            log.debug("attempt to set line " + a, {a, lane_id : laneSqlResults_byCity_loc[line_destCity_origloc][0].lane_id})

                            log.debug("lineVals", lineVals)

                            recObj.setSublistValue({
                                sublistId : "item",
                                fieldId : "custcol_anc_shippinglane",
                                line : a,
                                value : laneSqlResults_byCity_loc[line_destCity_origloc][0].lane_id
                            })
                            log.debug("successfully set")

                        }
                    }
                }
            }
            catch(e)
            {
                log.error("ERROR in funtion determineLane", e)
            }
        }

        var yearMapping = {};
        function implementSF(recObj)
        {
            var doImplementSf = true;
            yearMapping = ANC_lib.yearMapping;


            try
            {
                if(doImplementSf)
                {
                    var lineCount = recObj.getLineCount({
                        sublistId : "item"
                    });

                    log.debug("implementSF lineCount", lineCount)
                    log.debug("implementSF ANC_lib.references", ANC_lib.references)
                    var lineValList = [];
                    var headerEntity = recObj.getValue({
                        fieldId : "entity"
                    })

                    for(var a = 0 ; a < lineCount ; a++)
                    {
                        var lineVals = {}
                        lineVals.customer = headerEntity;
                        lineVals.grade = recObj.getSublistValue({
                            sublistId : "item",
                            fieldId : ANC_lib.references.SO_COLUMNS.GRADE,
                            line : a
                        })
                        lineVals.consignee = recObj.getSublistValue({
                            sublistId : "item",
                            fieldId : ANC_lib.references.SO_COLUMNS.CONSIGNEE,
                            line : a
                        }) || recObj.getValue({
                            fieldId : "custbody_consignee"
                        });
                        lineVals.deliverydate = recObj.getSublistValue({
                            sublistId : "item",
                            fieldId : ANC_lib.references.SO_COLUMNS.DELIVERYDATE,
                            line : a
                        })
                        lineVals.month = lineVals.deliverydate ? (new Date(lineVals.deliverydate).getMonth())+ 1 : (new Date().getMonth()) + 1;
                        lineVals.year = lineVals.deliverydate ? new Date(lineVals.deliverydate).getFullYear() : new Date().getFullYear();
                        lineValList.push(lineVals);
                    }
                    log.debug("lineValList", lineValList);


                    var compositeKeyResults = ANC_lib.getRelatedForecasts(recObj.id, lineValList);
                    log.debug("implementSF compositeKeyResults", compositeKeyResults);
                    var SF_RESULTSBYCOMPOSITEKEY = compositeKeyResults.groupedByCompositekey;


                    //TODO you can optimize this because it performs another loop that it already had.
                    for(var a = 0 ; a < lineCount ; a++)
                    {
                        var lineVals = {}
                        lineVals.customer = headerEntity;
                        lineVals.grade = recObj.getSublistValue({
                            sublistId : "item",
                            fieldId : ANC_lib.references.SO_COLUMNS.GRADE,
                            line : a
                        })
                        lineVals.consignee = recObj.getSublistValue({
                            sublistId : "item",
                            fieldId : ANC_lib.references.SO_COLUMNS.CONSIGNEE,
                            line : a
                        }) || recObj.getValue({
                            fieldId : "custbody_consignee"
                        });
                        lineVals.deliverydate = recObj.getSublistValue({
                            sublistId : "item",
                            fieldId : ANC_lib.references.SO_COLUMNS.DELIVERYDATE,
                            line : a
                        })
                        lineVals.month = lineVals.deliverydate ? (new Date(lineVals.deliverydate).getMonth())+ 1 : (new Date().getMonth()) + 1;
                        lineVals.year = lineVals.deliverydate ? new Date(lineVals.deliverydate).getFullYear() : new Date().getFullYear();

                        //TODO if not in yearmapping then refrain from proceeding, just from the start, dont waste effort if year is not mapped.
                        // you have a defaulting anyway so year will always be mapped, but what if its's 2051?!?!?
                        var lineCompositeKey = `${lineVals.customer}_${lineVals.consignee}_${lineVals.grade}_${lineVals.month}_${yearMapping[lineVals.year]}`;

                        log.debug("setting SF COLUMN lineCompositeKey", lineCompositeKey);
                        // log.debug("setting SF COLUMN SF_RESULTSBYCOMPOSITEKEY[lineCompositeKey].sf_id", SF_RESULTSBYCOMPOSITEKEY[lineCompositeKey].sf_id);
                        if(SF_RESULTSBYCOMPOSITEKEY[lineCompositeKey])
                        {
                            if(SF_RESULTSBYCOMPOSITEKEY[lineCompositeKey].sf_id) {
                                recObj.setSublistValue({
                                    sublistId: "item",
                                    fieldId: ANC_lib.references.SO_COLUMNS.SALESFORECAST,
                                    line: a,
                                    value: SF_RESULTSBYCOMPOSITEKEY[lineCompositeKey].sf_id
                                })

                                doSaveAfterSubmit = true;
                            }
                            else
                            {
                                recObj.setSublistValue({
                                    sublistId: "item",
                                    fieldId: ANC_lib.references.SO_COLUMNS.SALESFORECAST,
                                    line: a,
                                    value: ""
                                })

                                doSaveAfterSubmit = true;
                            }
                        }
                        else
                        {
                            recObj.setSublistValue({
                                sublistId: "item",
                                fieldId: ANC_lib.references.SO_COLUMNS.SALESFORECAST,
                                line: a,
                                value: ""
                            })

                            doSaveAfterSubmit = true;
                        }
                    }
                    log.debug("lineValList", lineValList);

                }
            }
            catch(e)
            {
                log.error("ERROR in funtion implementSF", e)
            }
        }

        function implementShipCap(recObj)
        {
            var doImplement = true;
            yearMapping = ANC_lib.yearMapping;

            try
            {
                if(doImplement)
                {
                    var lineCount = recObj.getLineCount({
                        sublistId : "item"
                    });

                    log.debug("implementShipCap lineCount", lineCount)
                    log.debug("implementShipCap ANC_lib.references", ANC_lib.references)
                    var lineValList = [];
                    var headerEntity = recObj.getValue({
                        fieldId : "entity"
                    })
                    log.debug("lineVals after entity", headerEntity)
                    var headerLocation = recObj.getValue({
                        fieldId : "location"
                    })
                    log.debug("lineVals after location", headerLocation)

                    for(var a = 0 ; a < lineCount ; a++)
                    {
                        var lineVals = {}

                        log.debug("lineVals after lineVals declared", lineVals)

                        lineVals.shipdate = recObj.getSublistValue({
                            sublistId : "item",
                            fieldId : ANC_lib.references.SO_COLUMNS.SHIPDATE || "custcol_anc_shipdate",
                            line : a
                        });

                        lineVals.shipdate = format.format({
                            value: lineVals.shipdate,
                            type: format.Type.DATE
                        });

                        log.debug("lineVals after shipdate", lineVals)
                        lineVals.location = recObj.getSublistValue({
                            sublistId : "item",
                            fieldId : "location",
                            line : a
                        }) || headerLocation;

                        var isCrossDock = recObj.getSublistValue({
                            sublistId : "item",
                            fieldId : "custcol_anc_usecrossdock",
                            line : a
                        })
                        if(isCrossDock && isCrossDock != 'F')
                        {
                            lineVals.location = recObj.getSublistValue({
                                sublistId : "item",
                                fieldId : "custcol_anc_transitlocation",
                                line : a
                            });
                            log.debug("what is lineVals.location now, it should be custcol_anc_transitlocation", lineVals.location)
                        }



                        log.debug("lineVals after location", lineVals)
                        lineValList.push(lineVals);
                    }
                    log.debug("lineValList", lineValList);


                    var compositeKeyResults = ANC_lib.getRelatedShipCap(recObj.id, lineValList)
                    log.debug("implementShipCap compositeKeyResults", compositeKeyResults);
                    var RESULTSBYCOMPOSITEKEY = compositeKeyResults.groupedByCompositekey;


                    //TODO you can optimize this because it performs another loop that it already had.
                    for(var a = 0 ; a < lineCount ; a++)
                    {
                        var lineVals = {}
                        lineVals.shipdate = recObj.getSublistValue({
                            sublistId : "item",
                            fieldId : ANC_lib.references.SO_COLUMNS.SHIPDATE || "custcol_anc_shipdate",
                            line : a
                        });

                        lineVals.location = recObj.getSublistValue({
                            sublistId : "item",
                            fieldId : "location",
                            line : a
                        }) || headerLocation;

                        var isCrossDock = recObj.getSublistValue({
                            sublistId : "item",
                            fieldId : "custcol_anc_usecrossdock",
                            line : a
                        })
                        if(isCrossDock && isCrossDock != 'F')
                        {
                            lineVals.location = recObj.getSublistValue({
                                sublistId : "item",
                                fieldId : "custcol_anc_transitlocation",
                                line : a
                            });
                            log.debug("what is lineVals.location now, it should be custcol_anc_transitlocation", lineVals.location)
                        }

                        lineVals.shipdate = format.format({
                            value: lineVals.shipdate,
                            type: format.Type.DATE
                        });

                        //TODO if not in yearmapping then refrain from proceeding, just from the start, dont waste effort if year is not mapped.
                        // you have a defaulting anyway so year will always be mapped, but what if its's 2051?!?!?
                        var lineCompositeKey = `${lineVals.location}_${lineVals.shipdate}`;

                        log.debug("setting SC COLUMN lineCompositeKey", lineCompositeKey);
                        // log.debug("setting SF COLUMN SF_RESULTSBYCOMPOSITEKEY[lineCompositeKey].sf_id", SF_RESULTSBYCOMPOSITEKEY[lineCompositeKey].sf_id);
                        if(RESULTSBYCOMPOSITEKEY[lineCompositeKey])
                        {
                            if(RESULTSBYCOMPOSITEKEY[lineCompositeKey].sc_id) {
                                recObj.setSublistValue({
                                    sublistId: "item",
                                    fieldId: ANC_lib.references.SO_COLUMNS.SHIPMENTCAPACITY,
                                    line: a,
                                    value: RESULTSBYCOMPOSITEKEY[lineCompositeKey].sc_id
                                })

                                doSaveAfterSubmit = true;
                            }
                            else
                            {
                                recObj.setSublistValue({
                                    sublistId: "item",
                                    fieldId: ANC_lib.references.SO_COLUMNS.SHIPMENTCAPACITY,
                                    line: a,
                                    value: ""
                                })

                                doSaveAfterSubmit = true;
                            }
                        }
                        else
                        {
                            recObj.setSublistValue({
                                sublistId: "item",
                                fieldId: ANC_lib.references.SO_COLUMNS.SHIPMENTCAPACITY,
                                line: a,
                                value: ""
                            })

                            doSaveAfterSubmit = true;
                        }
                    }
                    log.debug("lineValList", lineValList);
                }
            }
            catch(e)
            {
                log.error("ERROR in funtion implementShipCap", e)
            }
        }

        //TODO - review
        function implementProdCap(recObj)
        {
            var doImplement = true;
            yearMapping = ANC_lib.yearMapping;


            try
            {
                if(doImplement)
                {
                    var lineCount = recObj.getLineCount({
                        sublistId : "item"
                    });

                    log.debug("implementProdCap lineCount", lineCount)
                    log.debug("implementProdCap ANC_lib.references", ANC_lib.references)
                    var lineValList = [];

                    for(var a = 0 ; a < lineCount ; a++)
                    {
                        var lineVals = {}

                        log.debug("implementProdCap lineVals after lineVals declared", lineVals)

                        lineVals.productiondate = recObj.getSublistValue({
                            sublistId : "item",
                            fieldId : ANC_lib.references.SO_COLUMNS.PRODUCTIONDATE || "custcol_anc_productiondate",
                            line : a
                        });

                        lineVals.productiondate_date = new Date(lineVals.productiondate);
                        lineVals.productiondate = `${new Date(lineVals.productiondate_date).getFullYear()}-${new Date(lineVals.productiondate_date).getMonth()+1}-${new Date(lineVals.productiondate_date).getDate()}`

                        log.debug("implementProdCap lineVals after productiondate", lineVals)
                        lineValList.push(lineVals);
                    }
                    log.debug("implementProdCap lineValList", lineValList);

                    var compositeKeyResults = ANC_lib.getRelatedProdCap(recObj.id, lineValList)
                    log.debug("implementProdCap compositeKeyResults", compositeKeyResults);
                    // var RESULTSBYCOMPOSITEKEY = compositeKeyResults.groupedByCompositekey;

                    //TODO you can optimize this because it performs another loop that it already had.
                    for(var a = 0 ; a < lineCount ; a++)
                    {
                        var lineVals = {}
                        lineVals.productiondate = recObj.getSublistValue({
                            sublistId : "item",
                            fieldId : ANC_lib.references.SO_COLUMNS.PRODUCTIONDATE || "custcol_anc_productiondate",
                            line : a
                        });

                        var prodDate_dateObj = new Date(lineVals.productiondate)
                        log.debug("prodDate_dateObj", prodDate_dateObj);

                        var existingWeeklyProdCaps = compositeKeyResults.filter(function(elem){
                            var startDate = new Date(elem.weekstartdate);
                            var endDate = new Date(elem.weekenddate);
                            log.debug("{prodDate_dateObj,startDate,endDate}", {prodDate_dateObj,startDate,endDate})
                            log.debug("(startDate <= prodDate_dateObj && endDate >= prodDate_dateObj)", (startDate <= prodDate_dateObj && endDate >= prodDate_dateObj))
                            if(startDate <= prodDate_dateObj && endDate >= prodDate_dateObj)
                            {
                                return true;
                            }
                            else
                            {
                                return false;
                            }
                        });
                        log.debug("existingWeeklyProdCaps", existingWeeklyProdCaps)

                        if(existingWeeklyProdCaps.length > 0)
                        {
                            recObj.setSublistValue({
                                sublistId: "item",
                                fieldId: ANC_lib.references.SO_COLUMNS.PRODUCTIONCAPACITYWEEK,
                                line: a,
                                value: existingWeeklyProdCaps[0].pc_id
                            });

                            log.debug(`LINE ${a} PRODCAP set to`, existingWeeklyProdCaps[0].pc_id)
                        }
                    }
                    log.debug("lineValList", lineValList);
                }
            }
            catch(e)
            {
                log.error("ERROR in funtion implementProdCap", e)
            }
        }

        function updateShipmentLines(newRecord, scriptContext)
        {
            var doImplement = true;
            yearMapping = ANC_lib.yearMapping;

            try
            {
                if(doImplement)
                {
                    var lineCount = newRecord.getLineCount({
                        sublistId : "item"
                    });

                    log.debug("updateShipmentLines lineCount", lineCount)
                    log.debug("updateShipmentLines ANC_lib.references", ANC_lib.references)
                    var lineValList = [];

                    for(var a = 0 ; a < lineCount ; a++)
                    {
                        var lineVals = {}

                        log.debug("updateShipmentLines lineVals after lineVals declared", lineVals)

                        lineVals.lineuniquekey = newRecord.getSublistValue({
                            sublistId : "item",
                            fieldId : "lineuniquekey",
                            line : a
                        });

                        if(scriptContext.type == "create" || scriptContext.type == "copy")
                        {
                            newRecord.setSublistValue({
                                sublistId : "item",
                                fieldId : ANC_lib.references.SO_COLUMNS.LINECHECKINGSTATUSCOL.id,
                                line : a,
                                value : "❌"
                            });

                            newRecord.setSublistValue({
                                sublistId : "item",
                                fieldId : ANC_lib.references.SO_COLUMNS.LINESTATUS.id,
                                line : a,
                                value : ANC_lib.references.SO_COLUMNS.LINESTATUS.options.PENDING.val
                            });
                        }

                        log.debug("updateShipmentLines lineVals after lineuniquekey", lineVals)
                        lineValList.push(lineVals);
                    }

                    //TODO what is this, to remove if no longer needed
                    // if(scriptContext.type == "create" || scriptContext.type == "copy")
                    // {
                    //     ANC_lib.updateSoLines(recObj, ANC_lib.references.SO_COLUMNS.LINESTATUS.id, ANC_lib.references.SO_COLUMNS.LINESTATUS.options.PENDING.val)
                    //     log.debug("updateShipmentLines updateSoLineStatus")
                    // }

                    log.debug("updateShipmentLines lineValList", lineValList);

                    var compositeKeyResults = ANC_lib.getRelatedShipments(newRecord.id, lineValList)
                    log.debug("updateShipmentLines compositeKeyResults", compositeKeyResults);

                    log.debug("updateShipmentLines compositeKeyResults extra", compositeKeyResults);

                    var iconsList = [];

                    var finalHeaderIcon = "";
                    if(compositeKeyResults.byLineUniqueKey)
                    {
                        // //TODO you can optimize this because it performs another loop that it already had.
                        lineCountLoop : for(var a = 0 ; a < lineCount ; a++)
                        {
                            var lineVals = {}
                            lineVals.lineuniquekey = newRecord.getSublistValue({
                                sublistId : "item",
                                fieldId : "lineuniquekey",
                                line : a
                            });

                            log.debug("updateShipmentLines lineVals.lineuniquekey set icon", lineVals.lineuniquekey);

                            if(""+compositeKeyResults.byLineUniqueKey[""+lineVals.lineuniquekey])
                            {
                                var shipmentList = (compositeKeyResults.byLineUniqueKey[""+lineVals.lineuniquekey]) || [];
                                log.debug("shipmentList", shipmentList)
                                var finalLineIcon = "";
                                for(var shipmentCtr = 0 ; shipmentCtr < shipmentList.length ; shipmentCtr++)
                                {
                                    var shipmentEntry = shipmentList[shipmentCtr];
                                    log.debug("shipmentEntry", shipmentEntry)
                                    if(shipmentEntry.custbody_anc_loadingefficiency < .80)
                                    {
                                        iconsList.push("❌")
                                        finalLineIcon = "❌"
                                        finalHeaderIcon = "❌"

                                        newRecord.setSublistValue({
                                            sublistId: "item",
                                            fieldId: "custcol_anc_fitment",
                                            line: a,
                                            value: finalLineIcon
                                        });

                                        break lineCountLoop;
                                    }
                                    else if(shipmentEntry.custbody_anc_loadingefficiency < .90)
                                    {
                                        if(finalLineIcon != "⚠")
                                        {
                                            iconsList.push("⚠")
                                            finalHeaderIcon = "⚠";
                                            finalLineIcon = "⚠";
                                        }

                                        newRecord.setSublistValue({
                                            sublistId: "item",
                                            fieldId: "custcol_anc_fitment",
                                            line: a,
                                            value: finalLineIcon
                                        });
                                    }
                                    else if(shipmentEntry.custbody_anc_loadingefficiency >= .95)
                                    {
                                        if(finalLineIcon != "❌" && finalLineIcon != "⚠")
                                        {
                                            iconsList.push("✅")
                                            finalHeaderIcon = "✅";
                                            finalLineIcon = "✅"
                                        }

                                        newRecord.setSublistValue({
                                            sublistId: "item",
                                            fieldId: "custcol_anc_fitment",
                                            line: a,
                                            value: finalLineIcon
                                        });
                                        // break; //NOT an instant break
                                    }
                                    else
                                    {
                                        iconsList.push("❌")
                                        finalHeaderIcon = "❌"
                                        finalLineIcon = "❌"

                                        newRecord.setSublistValue({
                                            sublistId: "item",
                                            fieldId: "custcol_anc_fitment",
                                            line: a,
                                            value: finalLineIcon
                                        });
                                        break;
                                    }




                                    if(finalLineIcon == "❌")
                                    {
                                        finalHeaderIcon = "❌"
                                    }
                                    else if(finalHeaderIcon != "❌" && finalLineIcon == "⚠")
                                    {
                                        finalHeaderIcon = "⚠"
                                    }
                                    else if((finalLineIcon != "⚠" && finalHeaderIcon != "❌") && finalLineIcon == "✅")
                                    {
                                        finalHeaderIcon = "✅"
                                    }
                                }
                            }
                        }
                        log.debug("lineValList", lineValList);

                        newRecord.setValue({
                            sublistId: "item",
                            fieldId: "custbody_anc_fitmentstatusicon",
                            value: finalHeaderIcon
                        });


                        if(iconsList.includes("❌"))
                        {
                            newRecord.setValue({
                                fieldId : "custbody_anc_fitmentstatusicon",
                                value : "❌"
                            })
                            validation_email_notifs(
                                newRecord,
                                "Fitment warning❌",
                                `Your fitment results are not optimized
                                         ${JSON.stringify('login to review')}`
                            )
                        }
                        else if(iconsList.includes("⚠"))
                        {
                            newRecord.setValue({
                                fieldId : "custbody_anc_fitmentstatusicon",
                                value : "⚠"
                            })
                            validation_email_notifs(
                                newRecord,
                                "Fitment warning❌",
                                `Your fitment results are not optimized
                                         ${JSON.stringify('login to review')}`
                            )
                        }
                        else if(iconsList.includes(""))
                        {
                            newRecord.setValue({
                                fieldId : "custbody_anc_fitmentstatusicon",
                                value : "❌"
                            })
                            validation_email_notifs(
                                newRecord,
                                "Fitment warning❌",
                                `Your fitment results are not optimized
                                         ${JSON.stringify('login to review')}`
                            )
                        }
                        else if(iconsList.includes("✅"))
                        {
                            newRecord.setValue({
                                fieldId : "custbody_anc_fitmentstatusicon",
                                value : "✅"
                            })
                        }
                        else
                        {
                            newRecord.setValue({
                                fieldId : "custbody_anc_fitmentstatusicon",
                                value : "❌"
                            })
                            validation_email_notifs(
                                newRecord,
                                "Fitment warning❌",
                                `Your fitment results are not optimized
                                         ${JSON.stringify('login to review')}`
                            )
                        }
                    }

                    log.debug("updateShipmentLines, compositeKeyResults", compositeKeyResults)
                    postUpdates_shipCap(newRecord, compositeKeyResults.byShipDate)
                    //09132025 new shipcap implementation









                }
            }
            catch(e)
            {
                log.error("ERROR in funtion updateShipmentLines", e)
            }
        }

        // Helper to safely embed strings in SQL (handles null/undefined and single quotes)
        function sqlSafeUpperLiteral(v) {
            const s = (v == null ? '' : String(v)).trim().replace(/'/g, "''");
            return `UPPER('${s}')`;
        }



        return {beforeLoad, beforeSubmit, afterSubmit}

    });


//cleanup columns
// var lineCount = nlapiGetLineItemCount("item");
// console.log("lineCount", lineCount)
// for(var a = 0 ; a < lineCount ; a++)
// {
//     var fieldsToEmpty = ["custcol_anc_shipmentcap","custcol_anc_shipdate", "custcol_anc_deliverydate", "custcol_anc_productiondate","custcol_anc_ldcdate","custcol_anc_status","custcol_anc_shipmentcap_id","custcol_anc_shipdate","custcol_anc_usecrossdock","custcol_anc_prodcapweek","custcol_anc_equipment","custcol_anc_customeralloc_caid", "custcol_anc_shipcapcheck", "custcol_anc_salesforecastcheck", "custcol_anc_prodcapcheck","custcol_anc_prodcapweek_id"];
//     for(var b = 0 ; b < fieldsToEmpty.length ; b++)
//     {
//         nlapiSetCurrentLineItemValue("item", fieldsToEmpty[b], "");
//     }
//
//
//     nlapiCommitLineItem("item")
//
// }