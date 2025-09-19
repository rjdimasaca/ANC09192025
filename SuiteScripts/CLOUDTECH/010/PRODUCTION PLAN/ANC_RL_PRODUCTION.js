/**
 * @NApiVersion 2.1
 * @NScriptType Restlet
 */

//delete integration logs
// var arr = nlapiSearchRecord(nlapiGetRecordType());
// for(var a = 0 ; a < arr.length ; a++)
// {
//     nlapiDeleteRecord(arr[a].getRecordType(), arr[a].getId())

define(['/SuiteScripts/ANC_lib.js', 'N/https', 'N/record', 'N/runtime', 'N/search', 'N/url'],
    /**
     * @param{https} https
     * @param{record} record
     * @param{runtime} runtime
     * @param{search} search
     * @param{url} url
     */
    (ANC_lib, https, record, runtime, search, url) => {
        /**
         * Defines the function that is executed when a GET request is sent to a RESTlet.
         * @param {Object} requestParams - Parameters from HTTP request URL; parameters passed as an Object (for all supported
         *     content types)
         * @returns {string | Object} HTTP response body; returns a string when request Content-Type is 'text/plain'; returns an
         *     Object when request Content-Type is 'application/json' or 'application/xml'
         * @since 2015.2
         */
        const get = (requestParams) =>
        {

        }

        /**
         * Defines the function that is executed when a PUT request is sent to a RESTlet.
         * @param {string | Object} requestBody - The HTTP request body; request body are passed as a string when request
         *     Content-Type is 'text/plain' or parsed into an Object when request Content-Type is 'application/json' (in which case
         *     the body must be a valid JSON)
         * @returns {string | Object} HTTP response body; returns a string when request Content-Type is 'text/plain'; returns an
         *     Object when request Content-Type is 'application/json' or 'application/xml'
         * @since 2015.2
         */
        const put = (requestBody) => {

        }


        var prodCapYearMonthSublist = "recmachcustrecord_prodfc_year";
        var integrationLogId = null;
        var yearRecObj = null;
        /**
         * Defines the function that is executed when a POST request is sent to a RESTlet.
         * @param {string | Object} requestBody - The HTTP request body; request body is passed as a string when request
         *     Content-Type is 'text/plain' or parsed into an Object when request Content-Type is 'application/json' (in which case
         *     the body must be a valid JSON)
         * @returns {string | Object} HTTP response body; returns a string when request Content-Type is 'text/plain'; returns an
         *     Object when request Content-Type is 'application/json' or 'application/xml'
         * @since 2015.2
         */
        const post = (requestBody) =>
        {
            var respMsg = {requestBody};
            try
            {
                integrationLogId = ANC_lib.submitIntegrationLog(integrationLogId,{request:JSON.stringify(requestBody)});

                if(typeof requestBody == "object")
                {
                    var getWeeksResults = {};

                    var yearRecId = "";
                    var yearSearch = search.create({
                        type : "customrecord_anc_pf_years",
                        filters : [
                            ["name", "is", `${requestBody.year}`]
                        ]
                    });
                    yearSearch.run().each(function(res){
                        yearRecId = res.id;
                        return false;
                    })

                    if(yearRecId)
                    {
                        yearRecObj = record.load({
                            type : "customrecord_anc_pf_years",
                            id : yearRecId
                        })
                    }
                    else
                    {
                        yearRecObj = record.create({
                            type : "customrecord_anc_pf_years",
                        })

                        yearRecObj.setValue({
                            fieldId : "name",
                            value : requestBody.year
                        })
                    }

                    if(Array.isArray(requestBody.months))
                    {
                        for(var a = 0 ; a < 12 ; a++)
                        {
                            fillProdMonthSublist(a, requestBody);
                        }

                        var submittedYearRecObj = yearRecObj.save();
                        log.debug("submittedYearRecObj multimonth", submittedYearRecObj)


                        updateTargetYearMonths(requestBody.year, requestBody.months, submittedYearRecObj)

                    }
                    else
                    {
                        for(var a = 1 ; a <= 12 ; a++)
                        {
                            fillProdMonthSublist(a, [requestBody]);
                        }

                        var submittedYearRecObj = yearRecObj.save();
                        log.debug("submittedYearRecObj single month", submittedYearRecObj)

                        updateTargetYearMonths(requestBody.year, [requestBody.months], submittedYearRecObj)

                    }
                }
                log.debug("requestBody", requestBody);

            }
            catch(e)
            {
                log.error("ERROR in function post", e)
                respMsg={success:false, message: "ERROR caught: " + JSON.stringify(e), requestBody};
            }

            respMsg.integrationLogId = integrationLogId;
            var respMsgStr = JSON.stringify(respMsg);

            integrationLogId = ANC_lib.submitIntegrationLog(integrationLogId,{response:respMsgStr});
            log.debug(integrationLogId, integrationLogId)
            return respMsgStr
        }

        function updateTargetYearMonths(year, monthsFromRequest, submittedYearRecObj)
        {
            try
            {
                yearRecObj = record.load({
                    type : "customrecord_anc_pf_years",
                    id : submittedYearRecObj
                })

                var yearMonthsLineCount = yearRecObj.getLineCount({
                    sublistId : prodCapYearMonthSublist
                })
                log.debug("yearMonthsLineCount", yearMonthsLineCount);
                for(var a = 0 ; a < yearMonthsLineCount ; a++)
                {
                    var monthCap_id = yearRecObj.getSublistValue({
                        sublistId : prodCapYearMonthSublist,
                        fieldId : "id",
                        line : a
                    });

                    log.debug("monthCap_id", monthCap_id);

                    var monthCapRecObj = record.load({
                        type : ANC_lib.references.RECTYPES.production_forecast.id,
                        id : monthCap_id
                    })

                    var monthCapRecObj_monthNumber = monthCapRecObj.getValue({
                        fieldId : ANC_lib.references.RECTYPES.production_forecast.fields.month
                    })
                    var monthCapRecObj_quantity = monthCapRecObj.getValue({
                        fieldId : ANC_lib.references.RECTYPES.production_forecast.fields.quantity
                    }) || 0
                    var weeklyDistributionQty = monthCapRecObj_quantity / 4;

                    log.debug("weeklyDistributionQty", weeklyDistributionQty)
                    // var getWeeksResults = getWeeks(year, monthCapRecObj_monthNumber, null)
                    var month445 = get445Month({
                        year: year,
                        month: monthCapRecObj_monthNumber, // 4th fiscal month
                        anchorDate: '2025-01-06' // Fiscal year starts on Jan 6, 2025 (Monday)
                    });

                    getWeeksResults = month445.weeks;
                    weeklyDistributionQty = parseFloat(monthCapRecObj_quantity / getWeeksResults.length).toFixed(2);
                    //can never be zero anyway, so just pray lol
                    log.debug("getWeeksResults", getWeeksResults);

                    for(var b = 0 ; b < getWeeksResults.length ; b++)
                    {
                        monthCapRecObj.setSublistValue({
                            sublistId : "recmachcustrecord_prodfcw_month",
                            fieldId : "custrecord_prodfcw_weeknumber",
                            line : b,
                            value : getWeeksResults[b].week
                        })

                        monthCapRecObj.setSublistValue({
                            sublistId : "recmachcustrecord_prodfcw_month",
                            fieldId : "custrecord_prodfcw_daterangestart",
                            line : b,
                            value : new Date(getWeeksResults[b].start)
                        })

                        monthCapRecObj.setSublistValue({
                            sublistId : "recmachcustrecord_prodfcw_month",
                            fieldId : "custrecord_prodfcw_daterangeend",
                            line : b,
                            value : new Date(getWeeksResults[b].end)
                        })

                        monthCapRecObj.setSublistValue({
                            sublistId : "recmachcustrecord_prodfcw_month",
                            fieldId : "custrecord_prodfcw_capacity",
                            line : b,
                            value : weeklyDistributionQty
                        })

                        monthCapRecObj.setSublistValue({
                            sublistId : "recmachcustrecord_prodfcw_month",
                            fieldId : "custrecord_prodfcw_monthweeknumber",
                            line : b,
                            value : getWeeksResults[b].monthweek
                        })

                        var monthWithLeadingZero = monthCapRecObj_monthNumber < 10 ? `0${monthCapRecObj_monthNumber}` : `${monthCapRecObj_monthNumber}`;
                        var weekWithLeadingZero = getWeeksResults[b].week < 10 ? `0${getWeeksResults[b].week}` : `${getWeeksResults[b].week}`;


                        monthCapRecObj.setSublistValue({
                            sublistId : "recmachcustrecord_prodfcw_month",
                            fieldId : "name",
                            line : b,
                            value : `${year}|${monthWithLeadingZero}|MONTHWEEK${getWeeksResults[b].monthweek}|YEARWEEK${weekWithLeadingZero}`
                        })
                    }

                    var submittedMonthCapacityRecId = monthCapRecObj.save();
                    log.debug("submittedMonthCapacityRecId", submittedMonthCapacityRecId)
                }

            }
            catch(e)
            {
                log.error("ERROR in function updateTargetYearMonths", e);
            }
        }

        function fillProdMonthSublist(a, requestBody)
        {
            for(var b = 0 ; b < requestBody.months.length ; b++)
            {
                var monthNumber = requestBody.months[b].monthNumber;
                log.debug("monthNumber", monthNumber);
                var newLineMonthId = (a+1);

                if(newLineMonthId == monthNumber)
                {
                    var monthWithLeadingZero = monthNumber < 10 ? `0${monthNumber}` : `${monthNumber}`;
                    yearRecObj.setSublistValue({
                        sublistId : prodCapYearMonthSublist,
                        fieldId : "custrecord_prodfc_month",
                        line : a,
                        value : monthNumber
                    })
                    yearRecObj.setSublistValue({
                        sublistId : prodCapYearMonthSublist,
                        fieldId : "custrecord_prodfc_plannedprodpmcap",
                        line : a,
                        value :requestBody.months[b].quantity
                    })
                    yearRecObj.setSublistValue({
                        sublistId : prodCapYearMonthSublist,
                        fieldId : "name",
                        line : a,
                        value : monthWithLeadingZero + "|" + requestBody.year
                    })

                }
                else
                {
                    var monthWithLeadingZero = newLineMonthId < 10 ? `0${newLineMonthId}` : `${newLineMonthId}`;

                    yearRecObj.setSublistValue({
                        sublistId : prodCapYearMonthSublist,
                        fieldId : "custrecord_prodfc_month",
                        line : a,
                        value : a+1
                    })
                    // yearRecObj.setSublistValue({
                    //     sublistId : prodCapYearMonthSublist,
                    //     fieldId : "custrecord_prodfc_plannedprodpmcap",
                    //     line : a,
                    //     value :requestBody.months[b].quantity
                    // })
                    yearRecObj.setSublistValue({
                        sublistId : prodCapYearMonthSublist,
                        fieldId : "name",
                        line : a,
                        value : monthWithLeadingZero + "|" + requestBody.year
                    })
                }
            }
        }

        // function formatDate(date) {
        //     return date.toISOString().slice(0, 10);
        // }

        function get445Month({ year, month, anchorDate }) {
            const baseAnchor = new Date(anchorDate);
            const baseYear = baseAnchor.getFullYear();

            // Calculate how many fiscal years to offset
            const yearsToAdd = year - baseYear;

            // Each 445 fiscal year is 52 weeks = 364 days
            const adjustedAnchor = new Date(baseAnchor);
            adjustedAnchor.setDate(adjustedAnchor.getDate() + yearsToAdd * 364);

            const weeksPerMonth = [4, 4, 5]; // 4-4-5 pattern
            const months = [];
            let current = new Date(adjustedAnchor);
            let weekCounter = 1;

            for (let i = 0; i < 12; i++) {
                const weeksInMonth = weeksPerMonth[i % 3];
                const monthWeeks = [];

                for (let w = 0; w < weeksInMonth; w++) {
                    const weekStart = new Date(current);
                    const weekEnd = new Date(current);
                    weekEnd.setDate(weekEnd.getDate() + 6);

                    monthWeeks.push({
                        week: weekCounter++,
                        start: formatDate(weekStart),
                        end: formatDate(weekEnd),
                        monthweek: w + 1,
                    });

                    current.setDate(current.getDate() + 7);
                }

                months.push({
                    year: year,
                    monthNumber: i + 1,
                    weeks: monthWeeks,
                });
            }

            return months[month - 1];
        }




        function getWeeks(year, month, trimOverflow = false) {

            log.debug("getWeeks {year,month}", {year,month})

            const weeks = [];
            let weekNumber = 1;

            const jsMonth = month - 1;
            const firstDayOfMonth = new Date(year, jsMonth, 1);
            const lastDayOfMonth = new Date(year, month, 0);

            // Find first Monday on or after the first of the month
            let current = new Date(firstDayOfMonth);
            while (current.getDay() !== 1) {
                current.setDate(current.getDate() + 1); // advance to Monday
            }

            if(jsMonth == 12)
            {
                while (weeks.length < 5 && current <= lastDayOfMonth) {
                    const weekStart = new Date(current);
                    const weekEnd = new Date(current);
                    weekEnd.setDate(weekStart.getDate() + 6);

                    if (trimOverflow) {
                        if (
                            weekStart.getMonth() === jsMonth &&
                            weekEnd.getMonth() === jsMonth
                        ) {
                            weeks.push({
                                week: weekNumber++,
                                start: formatDate(weekStart),
                                end: formatDate(weekEnd),
                            });
                        }
                    } else {
                        if (weekStart.getMonth() === jsMonth) {
                            weeks.push({
                                week: weekNumber++,
                                start: formatDate(weekStart),
                                end: formatDate(weekEnd),
                            });
                        }
                    }

                    current.setDate(current.getDate() + 7); // move to next Monday
                }
            }
            else
            {
                while (weeks.length < 4 && current <= lastDayOfMonth) {
                    const weekStart = new Date(current);
                    const weekEnd = new Date(current);
                    weekEnd.setDate(weekStart.getDate() + 6);

                    if (trimOverflow) {
                        if (
                            weekStart.getMonth() === jsMonth &&
                            weekEnd.getMonth() === jsMonth
                        ) {
                            weeks.push({
                                week: weekNumber++,
                                start: formatDate(weekStart),
                                end: formatDate(weekEnd),
                            });
                        }
                    } else {
                        if (weekStart.getMonth() === jsMonth) {
                            weeks.push({
                                week: weekNumber++,
                                start: formatDate(weekStart),
                                end: formatDate(weekEnd),
                            });
                        }
                    }

                    current.setDate(current.getDate() + 7); // move to next Monday
                }
            }


            return weeks;
        }

        function formatDate(date) {
            return date.toISOString().split('T')[0];
        }


        /**
         * Defines the function that is executed when a DELETE request is sent to a RESTlet.
         * @param {Object} requestParams - Parameters from HTTP request URL; parameters are passed as an Object (for all supported
         *     content types)
         * @returns {string | Object} HTTP response body; returns a string when request Content-Type is 'text/plain'; returns an
         *     Object when request Content-Type is 'application/json' or 'application/xml'
         * @since 2015.2
         */
        const doDelete = (requestParams) => {

        }

        return {get, put, post, delete: doDelete}

    });
