/**
 * @NApiVersion 2.1
 */

//delete integration logs
// var arr = nlapiSearchRecord(nlapiGetRecordType());
// for(var a = 0 ; a < arr.length ; a++)
// {
//     nlapiDeleteRecord(arr[a].getRecordType(), arr[a].getId())
define(['N/query', 'N/record', 'N/runtime', 'N/search', 'N/https', 'N/email', 'N/format'],

    (query, record, runtime, search, https, email, format) => {

        // NEW: generic wrapper to log the start of any function with its params
        function _wrapWithStartLog(fn, fnName) {
            return function () {
                try {
                    var args = Array.prototype.slice.call(arguments);
                    var params;

                    // If the function was called with a single options object, log that object as-is.
                    if (args.length === 1 &&
                        args[0] &&
                        typeof args[0] === 'object' &&
                        !Array.isArray(args[0]) &&
                        !(args[0] instanceof Date)) {
                        params = args[0];
                    } else {
                        // Otherwise, index positional args as arg0, arg1, ...
                        params = {};
                        for (var i = 0; i < args.length; i++) params['arg' + i] = args[i];
                    }

                    log.debug('functionStarted ' + fnName, { params: params });
                } catch (e) {
                    try { log.debug('functionStarted ' + fnName, { params: '<<unserializable>>' }); } catch (_) {}
                }
                return fn.apply(this, arguments);
            };
        }


        var TEMPORARY_SHIPMENT_ITEM = 188748;

        var loadFittingBearerToken = `Bearer iryj8ibMLTLKOZa1HtOcSixzkmNjt16OPKhLNiIUDno`;

        var salesForecastJobFolderId = 392686;

        function GET_ICONS(){
            return {
                "1116623_SB2" : {
                    "NOTES" :{
                        url : "https://1116623-sb2.app.netsuite.com/core/media/media.nl?id=9206734&amp;c=1116623_SB2&amp;h=_us6MR1TID72HyBuY__AucCpfRA0AO1rhhkq2_EGGi6-4yj8"
                    },
                    "LOGISTICS" :{
                        url : "https://1116623-sb2.app.netsuite.com/core/media/media.nl?id=9203525&c=1116623_SB2&h=2o0tcA7GgL-Ks2Zfeomc6r_d4v-ly5uw_wONtpN70kpJzyuG"
                    },
                }
            }
        }

        // Canonical market-segment label by consignee country variants.
        // Usage: (MARKET_SEGMENT_COUNTRY_CANONICAL[(country || '').trim().toUpperCase()] || 'International')
        //TODO discontinued this is AI suggestion that just broke the script
        const MARKET_SEGMENT_COUNTRY_CANONICAL = {
            // Canada
            'CA': 'Canada',
            'CAN': 'Canada',
            'CANADA': 'Canada',

            // United States
            'US': 'USA',
            'USA': 'USA',
            'UNITED STATES': 'USA',
            'UNITED STATES OF AMERICA': 'USA',
            'U.S.': 'USA',
            'U.S.A.': 'USA',

            // Mexico (if you segment it separately)
            'MX': 'Mexico',
            'MEX': 'Mexico',
            'MEXICO': 'Mexico',
        };

        const references = {
            SO_FIELDS : {
                RELEASED : {
                    id : "custbody_anc_syncjob_release",
                },
                ORDERSTATUS : {
                    id : "custbody_anc_sostatus",
                    options : {
                        "PENDING": {val: 1, text: "APPROVED"},
                        "APPROVED": {val: 2, text: "APPROVED"},
                        "RELEASED": {val: 5, text: "RELEASED"},
                        "CHECKING": {val: 9, text: "CHECKING"},
                        "CHECK COMPLETE": {val: 10, text: "CHECK COMPLETE"},
                    }
                }
            },
            SO_COLUMNS : {
                GRADE : "custcol_anc_grade",
                CONSIGNEE : "custcol_consignee",
                DELIVERYDATE : "custcol_anc_deliverydate",
                SHIPDATE : "custcol_anc_shipdate",
                PRODUCTIONDATE : "custcol_anc_productiondate",
                SALESFORECAST : "custcol_anc_customeralloc_caid",
                SHIPMENTCAPACITY : "custcol_anc_shipmentcap_id",
                PRODUCTIONCAPACITYMONTH : "custcol_anc_prodcapmonth_id",
                PRODUCTIONCAPACITYWEEK : "custcol_anc_prodcapweek_id",
                LINESTATUS : {
                    id : "custcol_anc_status",
                    options : {
                        "APPROVED" : {val:2, text:"APPROVED"},
                        "PENDING" : {val:1, text:"PENDING"},
                        "REQUIRED" : {val:3, text:"REQUIRED"},
                        "SHIPPED" : {val:4, text:"SHIPPED"},
                        "CHECKING" : {val:9, text:"CHECKING"},
                        "CHECK_COMPLETE" : {val:10, text:"CHECK COMPLETE"},
                    }
                },
                TRANSITLOCATION : {
                    id : "custcol_anc_transitlocation",
                },
                TRANSITTIME : {
                    id : "custcol_anc_transittime",
                },
                TRANSITOPTMETHOD : {
                    id : "custcol_anc_transitoptmethod",
                },
                EQUIPMENT : {
                    id : "custcol_anc_equipment",
                },
                EQUIPMENT : {
                    id : "custcol_anc_equipment",
                },
                LDCDATE : {
                    id : "custcol_anc_ldcdate",
                },
                PRESSRUNDATE : {
                    id : "custcol_anc_pressrundate",
                },
                PRESSRUNDATE : {
                    id : "custcol_anc_pressrundate",
                },
                PRESSRUNDATE : {
                    id : "custcol_anc_pressrundate",
                },
                EXPECTEDTONNAGE : {
                    id : "custcol_anc_expectedtonnage",
                },
                TOTALROLLS : {
                    id : "custcol_anc_totalrolls",
                },
                ROLLSPERPACK : {
                    id : "custcol_anc_rollsperpack",
                },
                WRAPTYPE : {
                    id : "custcol_anc_wraptype",
                },
                SHIPPINGLANE : {
                    id : "custcol_anc_shippinglane",
                },
                ROLLSONHAND : {
                    id : "custcol_anc_rollsonhand",
                },
                RESERVEDROLLS : {
                    id : "custcol_anc_reservedrolls",
                },
                BACKORDERROLLS : {
                    id : "custcol_anc_backorderrolls",
                },
                CONSIGNEECOL : {
                    id : "custcol_consignee",
                },
                LINECHECKINGSTATUSCOL : {
                    id : "custcol_anc_fitment",
                },

            },
            SALESFORECAST : {
                FIELDS : {
                    CUSTOMER : "custrecord_anc_pf_customer",
                    GRADE : "custrecord_anc_pf_grade",
                    CONSIGNEE : "custrecord_anc_pf_consignee",
                    MONTH : "custrecord_anc_pf_month",
                    YEAR : "custrecord_anc_pf_year",
                    COMPOSITEKEY : "custrecord_anc_pf_compositekey",
                    ALLOCATION : "custrecord_anc_pf_allocation",
                    NAME : "name",
                },
            },
            RECTYPES : {
                lane : {
                    id:"customrecord_anc_shippinglanes",
                    fields : {
                        destinationcity : "custrecord_anc_lane_destinationcity",
                        originwarehouse : "custrecord_anc_lane_originwarehouse",
                        originwarehousecity : "custrecord_anc_lane_originwarehousecity",
                        destination : "custrecord_anc_lane_destination",
                        crossdockwarehouse : "custrecord_anc_lane_cdw",
                        crossdockwarehousecity : "custrecord_anc_lane_crossdockcity",
                    }
                },
                consignee : {
                    id:"customrecord_alberta_ns_consignee_record",
                    fields : {
                        city : "custrecord_alberta_ns_city",
                    }
                },
                production_forecast : {
                    id: "customrecord_production_forecast",
                    fields: {
                        month: "custrecord_prodfc_month",
                        quantity: "custrecord_prodfc_plannedprodpmcap",
                        year: "custrecord_prodfc_year",
                        name: "name",
                    },
                },
                production_year : {
                    id:"customrecord_anc_pf_years",
                    fields : {
                        month : "name",
                        quantity : "name",
                        year : "custrecord_prodfc_year",
                        name : "name",
                    },
                    sublists : {
                        salesforecast : "recmachcustrecord_anc_pf_year",
                        productionforecast : "recmachcustrecord_prodfc_year"
                    }
                },
                shipment : {
                    id : "CuTrSale108", //FIXME,
                    sub_id : "customsale_anc_shipment",
                    fields : {
                        equipment : "custbody_anc_equipment",
                        shipdate : "custbody_anc_shipdate",
                        shipstatus : "custbody_anc_shipstatus"
                    },
                },
                months : {
                    id : "customrecord_anc_pf_months"
                },
                shipmentcapacity : {
                    id : "customrecord_anc_dailyshipmentcap"
                },
                equipment : {
                    id : "customrecord_anc_equipment"
                },
                jobdetail : {
                    id : "customrecord_anc_syncjobdetail"
                }
            }
        }

        function getRelatedForecasts(tranInternalid, lineValList)
        {
            var compositeKeyResults = {};
            try
            {
                var forecastFilters = getForecastFilters(tranInternalid, lineValList);
                var sqlFilters_text = forecastFilters.join(" OR ")

                log.debug("getRelatedForecasts sqlFilters_text", sqlFilters_text)

                var sql =
                    `Select
                         sf.id as sf_id,
                         sf.custrecord_anc_pf_grade as sf_grade,
                         sf.custrecord_anc_pf_allocation as sf_allocation,
                         sf.custrecord_anc_pf_year as sf_year,
                         sf.custrecord_anc_pf_month as sf_month,
                         sf.custrecord_anc_pf_consignee as sf_consignee,
                         sf.custrecord_anc_pf_customer as sf_customer,
                         y.name as y_name,
                         m.name as m_name,

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

                log.debug("sqlResults", sqlResults);

                var keyOrder = ["sf_customer", "sf_consignee", "sf_grade", "sf_month", "sf_year"]
                compositeKeyResults = buildCompositeKeys(keyOrder, sqlResults);
            }
            catch(e)
            {
                log.error("ERROR in fucntion getForecasts", e)
            }

            return compositeKeyResults;
        }


        function getRelatedShipCap(tranInternalid, lineValList)
        {
            var compositeKeyResults = {};
            try
            {
                var forecastFilters = getShipCapFilters(tranInternalid, lineValList);
                var sqlFilters_text = forecastFilters.join(" OR ")

                log.debug("getRelatedForecasts sqlFilters_text", sqlFilters_text)

                var sql =
                    `Select
                         sc.id as sc_id,
                         sc.custrecord_anc_dsc_loc as sc_location,
                         sc.custrecord_anc_dsc_fulldate as sc_fulldate

                     FROM
                         customrecord_anc_dailyshipmentcap as sc

                     WHERE
                         ${sqlFilters_text}
                    `

                log.debug("sql", sql)

                const sqlResults = query.runSuiteQL({ query: sql }).asMappedResults();

                log.debug("sqlResults", sqlResults);

                var keyOrder = ["sc_location", "sc_fulldate"]
                compositeKeyResults = buildCompositeKeys(keyOrder, sqlResults)
            }
            catch(e)
            {
                log.error("ERROR in fucntion getRelatedShipCap", e)
            }

            log.debug("getRelatedShipCap compositeKeyResults", compositeKeyResults)
            return compositeKeyResults;
        }

        const getShipCapFilters = (tranInternalId, lineValList) =>
        {
            var filters = [];
            try
            {
                log.debug("getShipCapFilters lineValList.length", lineValList.length)
                for(var a = 0 ; a < lineValList.length ; a++)
                {
                    var lineVals = lineValList[a];
                    log.debug("getShipCapFilters lineVals", lineVals)
                    if(lineVals.shipdate)
                    {
                        var sqlForecastFilter = `
                                        (
                                        '${lineVals.shipdate}' = sc.${"custrecord_anc_dsc_fulldate"}
                                        AND
                                        ${lineVals.location} = sc.${"custrecord_anc_dsc_loc"}
                                        )
                                        `
                        //TODO move to lib
                        //TODO move to lib
                        filters.push(sqlForecastFilter)
                    }
                }

                log.debug("getShipCapFilters filters", filters);
            }
            catch(e)
            {
                log.error("ERROR in function getForecastFilters")
            }

            return filters;
        }

        const buildCompositeKeys = (keyOrder, forecastObj) =>
        {
            var buildCompositeKeys = {bucketIds : [], forecastObj : forecastObj, groupedByCompositekey : {}};
            if(!keyOrder)
            {
                keyOrder = ["customer", "consignee", "grade", "month", "year"]
            }

            if(Array.isArray(forecastObj))
            {
                for(var a = 0 ; a < forecastObj.length ; a++)
                {
                    var compositekey = "";
                    var listOfCompositeElems = [];
                    for(var b = 0 ; b < keyOrder.length ; b++)
                    {
                        listOfCompositeElems.push(forecastObj[a][keyOrder[b]]);
                    }
                    compositekey = listOfCompositeElems.join("_");

                    forecastObj[a].compositekey = compositekey;

                    buildCompositeKeys.groupedByCompositekey[compositekey] = forecastObj[a];

                    if(buildCompositeKeys.bucketIds.includes(forecastObj[a].sf_id || forecastObj[a].sc_id) == false)
                    {
                        buildCompositeKeys.bucketIds.push(forecastObj[a].sf_id || forecastObj[a].sc_id || forecastObj[a].pc_id)
                    }
                }
            }
            else
            {
                var compositekey = "";
                var listOfCompositeElems = [];
                for(var b = 0 ; b < keyOrder.length ; b++)
                {
                    listOfCompositeElems.push(forecastObj[keyOrder[b]]);
                }
                compositekey = listOfCompositeElems.join("_");
                forecastObj.compositekey = compositekey;
                // buildCompositeKeys.groupedByCompositekey[compositekey] = forecastObj;
            }

            log.debug("buildCompositeKeys forecastObj", forecastObj);
            log.debug("buildCompositeKeys buildCompositeKeys", buildCompositeKeys);
            return buildCompositeKeys
        }

        const getForecastFilters = (tranInternalId, lineValList) =>
        {
            var forecastFilters = [];
            try
            {
                log.debug("getForecastFilters lineValList.length", lineValList.length)
                for(var a = 0 ; a < lineValList.length ; a++)
                {
                    var lineVals = lineValList[a];
                    log.debug("getForecastFilters lineVals", lineVals)
                    if(lineVals.customer && lineVals.grade && lineVals.consignee && lineVals.month && lineVals.year)
                    {
                        var sqlForecastFilter = `
                                        (
                                        ${lineVals.customer} = sf.${references.SALESFORECAST.FIELDS.CUSTOMER}
                                        AND
                                        ${lineVals.consignee} = sf.${references.SALESFORECAST.FIELDS.CONSIGNEE}
                                        AND
                                        ${lineVals.grade} = sf.${references.SALESFORECAST.FIELDS.GRADE}
                                        AND
                                        ${lineVals.month} = sf.${references.SALESFORECAST.FIELDS.MONTH}
                                        AND
                                                (
                                                ${lineVals.year} = sf.${references.SALESFORECAST.FIELDS.YEAR}
                                                OR
                                                ${lineVals.year} = y.name
                                                )
                                        )
                                        `
                        forecastFilters.push(sqlForecastFilter)
                    }
                }

                log.debug("getForecastFilters forecastFilters", forecastFilters);
            }
            catch(e)
            {
                log.error("ERROR in function getForecastFilters")
            }

            return forecastFilters;
        }

        var yearMapping = {
            "2020" : 1,
            "2021" : 2,
            "2022" : 3,
            "2023" : 4,
            "2024" : 5,
            "2025" : 6,
            "2026" : 7,
            "2027" : 8,
            "2028" : 9,
            "2029" : 10,
            "2030" : 11,
            "2031" : 12,
            "2032" : 13,
            "2033" : 14,
            "2034" : 15,
            "2035" : 16,
            "2036" : 17,
            "2037" : 18,
            "2038" : 19,
            "2039" : 20,
            "2040" : 21,
            "2041" : 22,
            "2042" : 23,
            "2043" : 24,
            "2044" : 25,
            "2045" : 26,
            "2046" : 27,
            "2047" : 28,
            "2048" : 29,
            "2049" : 30,
            "2050" : 31,
        }

        function submitIntegrationLog(integrationLogId, integrationLogObj, ignoreTags)
        {
            var functionResult = {};
            try
            {
                var recObj = null;
                if(integrationLogId)
                {
                    recObj = record.load({
                        type : "customrecord_anc_integration_config_logs",
                        // type : "customrecord_anc_integrationlogs",
                        id : integrationLogId
                    });
                }
                else
                {
                    recObj = record.create({
                        type : "customrecord_anc_integration_config_logs",
                        // type : "customrecord_anc_integrationlogs"
                    });
                }


                log.debug("integrationLogObj", integrationLogObj)



                if(integrationLogObj.request)
                {
                    recObj.setValue({
                        fieldId : "custrecord_anc_icl_request",
                        value : integrationLogObj.request.slice(0,3999)
                    })
                }

                if(integrationLogObj.response)
                {
                    recObj.setValue({
                        fieldId : "custrecord_anc_icl_response",
                        value : integrationLogObj.response.slice(0,3999)
                    })
                }


                if(runtime.getCurrentScript().id)
                {

                    var searchObj = search.create({
                        type : "script",
                        filters : ["scriptid","is",runtime.getCurrentScript().id]
                    });

                    var scriptNumericInternalId = "";
                    searchObj.run().each(function(res){
                        scriptNumericInternalId = res.id;
                        return false;
                    })

                    recObj.setValue({
                        fieldId : "custrecord_anc_icl_script",
                        value :scriptNumericInternalId
                    })
                }


                // var submittedRecId = recObj.save({
                //         ignoreMandatoryFields : true,
                //         allowSourcing : true
                // });

                if(runtime.getCurrentScript().deploymentId)
                {
                    var searchObj = search.create({
                        type : "scriptdeployment",
                        filters : ["scriptid","is",runtime.getCurrentScript().deploymentId]
                    });

                    var deploymentNumericInternalId = "";
                    searchObj.run().each(function(res){
                        deploymentNumericInternalId = res.id;
                        return false;
                    })

                    recObj.setValue({
                        fieldId : "custrecord_anc_icl_deployment",
                        value :deploymentNumericInternalId
                    })
                }

                //TAGS
                if(runtime.getCurrentScript().deploymentId)
                {
                    var searchObj = search.create({
                        type : "scriptdeployment",
                        filters : ["scriptid","is",runtime.getCurrentScript().deploymentId]
                    });

                    var deploymentNumericInternalId = "";
                    searchObj.run().each(function(res){
                        deploymentNumericInternalId = res.id;
                        return false;
                    })

                    recObj.setValue({
                        fieldId : "custrecord_anc_icl_deployment",
                        value :deploymentNumericInternalId
                    })
                }


                try
                {
                    if(ignoreTags)
                    {

                    }
                    else
                    {
                        if(integrationLogObj.request)

                        {
                            var searchFilter = [];
                            var tagArray = [];

                            log.debug("integrationLogObj.request", integrationLogObj.request);

                            var requestObj = (typeof integrationLogObj.request == "object") ? integrationLogObj.request : JSON.parse(integrationLogObj.request);

                            if(requestObj.integrationLogTags)
                            {
                                if(typeof requestObj.integrationLogTags == "object")
                                {
                                    if(Array.isArray(requestObj.integrationLogTags))
                                    {
                                        tagArray = requestObj.integrationLogTags
                                    }
                                }
                                else if(typeof requestObj.integrationLogTags == "string")
                                {
                                    tagArray = requestObj.integrationLogTags.split(",")
                                }

                                var tagArrayQuoted = tagArray.map(function(tag){
                                    return `'${tag}'`
                                })
                                var tagArrayStr = tagArrayQuoted.join(",");
                                var searchFilter = [`formulanumeric: CASE WHEN {name} IN (${tagArrayStr}) THEN 1 ELSE 0 END`,"equalto","1"]

                                var searchTags_results = searchTags(searchFilter);

                                var tagFieldValues = [];
                                for(var a = 0 ; a < tagArray.length ; a++)
                                {
                                    if(searchTags_results.byName[tagArray[a]])
                                    {
                                        tagFieldValues.push(searchTags_results.byName[tagArray[a]].id);
                                    }
                                    else
                                    {
                                        var tagRecObj = record.create({
                                            type : "customrecord_anc_tags"
                                        });
                                        tagRecObj.setValue({
                                            fieldId : "name",
                                            value : tagArray[a]
                                        });
                                        var newTagRecId = tagRecObj.save()
                                        tagFieldValues.push(newTagRecId);
                                    }

                                }
                                log.debug("tagFieldValues", tagFieldValues)
                                recObj.setValue({
                                    fieldId : "custrecord_anc_icl_tags",
                                    value :tagFieldValues
                                })

                            }
                        }
                    }
                }
                catch(e)
                {
                    log.error("ERROR (acceptable) in function submitIntegrationLogs", e)
                }


                var submittedRecId = recObj.save({
                    ignoreMandatoryFields : true,
                    allowSourcing : true
                });

                // var submittedRecId1 = record.submitFields({
                //         type : recObj.type,
                //         id : submittedRecId,
                //         values : {
                //                 custrecord_anc_icl_deployment : deploymentNumericInternalId
                //         }
                // })
                //
                // log.debug("submitIntegrationLog submittedRecId1", submittedRecId1)


                log.debug("submitIntegrationLog submittedRecId", submittedRecId)
            }
            catch(e)
            {
                log.error("ERROR in function submitIntegrationLog", e)
            }
            return submittedRecId;
            // return functionResult;
        }

        function searchTags(filters, cols)
        {
            cols = cols ? cols : [];
            var searchTags_results = {byId:{}, byName:{},list:[]};
            var nameCol = search.createColumn({name: "name", label: "Name"});
            cols = cols.concat([nameCol])
            var customrecord_anc_tagsSearchObj = search.create({
                type: "customrecord_anc_tags",
                filters:
                    [
                        filters
                    ],
                columns:
                cols
            });
            var searchResultCount = customrecord_anc_tagsSearchObj.runPaged().count;
            log.debug("customrecord_anc_tagsSearchObj result count",searchResultCount);
            customrecord_anc_tagsSearchObj.run().each(function(result){
                // .run().each has a limit of 4,000 results

                var resObj = {};
                resObj.id = result.id;
                for(var a = 0 ; a < cols.length ; a++)
                {
                    resObj[cols[a].label] = result.getValue(nameCol)
                }
                searchTags_results.byName[result.getValue(nameCol)] = resObj
                searchTags_results.byId[result.id] = resObj
                return true;
            });

            log.debug("searchTags_results", searchTags_results);

            searchTags_results

            return searchTags_results
        }

        var MINIMIZE_UI = function(){
            var ICONS = GET_ICONS();
            log.debug("ICONS", ICONS)
            return {
                headerElems : [
                    {
                        name : "linenotes",
                        list : [],
                        title : "Notes",
                        icon : "https://1116623-sb2.app.netsuite.com/core/media/media.nl?id=9206734&c=1116623_SB2&h=_us6MR1TID72HyBuY__AucCpfRA0AO1rhhkq2_EGGi6-4yj8",
                        properties : [

                        ],
                        tdElemHtml : [
                            `<td align="center"><p>Product<br/>&<br/>Packaging<img width="75px" height="75px" src="https://1116623-sb2.app.netsuite.com/core/media/media.nl?id=9203525&c=1116623_SB2&h=2o0tcA7GgL-Ks2Zfeomc6r_d4v-ly5uw_wONtpN70kpJzyuG" style="cursor: pointer;" onclick="window.open(window.lineUrl_`,

                            ', \'popupWindow\', \'width=700,height=700,scrollbars=yes\'); return false;" alt="Click to open popup"></p></td>'
                        ],
                        targetScriptId : "customscript_anc_sl_minimize_ui",
                        targetDeploymentId : "customdeploy_anc_sl_minimize_ui",
                        headerTitle : "Notes",
                        rowTitle : "Notes",
                        iconWidth : "25px",
                        iconWidth : "25px",
                        position : 11,
                        addtlParams : "&minimizeui=notes",
                    },
                ],
                elemList : [
                    {
                        name : "warehouse_and_logistics",
                        list : [],
                        title : "Logistics",
                        icon : runtime ? ICONS[runtime.accountId].LOGISTICS.url || "" : "",
                        properties : [

                        ],
                        tdElemHtml : [
                            `<td align="center"><p>Logistics<br/><img width="75px" height="75px" src="https://1116623-sb2.app.netsuite.com/core/media/media.nl?id=9203525&c=1116623_SB2&h=2o0tcA7GgL-Ks2Zfeomc6r_d4v-ly5uw_wONtpN70kpJzyuG" style="cursor: pointer;" onclick="window.open(window.lineUrl_`,

                            ', \'popupWindow\', \'width=700,height=700,scrollbars=yes\'); return false;" alt="Click to open popup"></p></td>'
                        ],
                        targetScriptId : "customscript_anc_sl_minimize_ui",
                        targetDeploymentId : "customdeploy_anc_sl_minimize_ui",
                        headerTitle : "Logistics",
                        rowTitle : "Logistics",
                        iconWidth : "25px",
                        iconWidth : "25px",
                        position : 11,
                        addtlParams : "&minimizeui=warehouse_and_logistics"
                    },
                    {
                        name : "orderquantity_and_inventorystatus",
                        list : [],
                        title : "Inventory",
                        icon : "https://1116623-sb2.app.netsuite.com/core/media/media.nl?id=9203538&c=1116623_SB2&h=GBFNo186_VXtycKD8lQ8h1BqLzd9c6FG3wq_rEZNvsLpQU9N",
                        properties : [

                        ],
                        tdElemHtml : [
                            `<td align="center"><p>Qty&Status<br/><img width="75px" height="75px" src="https://1116623-sb2.app.netsuite.com/core/media/media.nl?id=9203525&c=1116623_SB2&h=2o0tcA7GgL-Ks2Zfeomc6r_d4v-ly5uw_wONtpN70kpJzyuG" style="cursor: pointer;" onclick="window.open(window.lineUrl_`,

                            ', \'popupWindow\', \'width=700,height=700,scrollbars=yes\'); return false;" alt="Click to open popup"></p></td>'
                        ],
                        targetScriptId : "customscript_anc_sl_minimize_ui",
                        targetDeploymentId : "customdeploy_anc_sl_minimize_ui",
                        headerTitle : "Inventory",
                        rowTitle : "Qty<br/>Status",
                        iconWidth : "25px",
                        iconWidth : "25px",
                        position : 11,
                        addtlParams : "&minimizeui=orderquantity_and_inventorystatus"
                    },
                    {
                        name : "product_and_packaging",
                        list : [],
                        title : "Packaging",
                        icon : "https://1116623-sb2.app.netsuite.com/core/media/media.nl?id=9203539&c=1116623_SB2&h=Al2AWzDaC39Xoch4LmAX2-WdvZ-DGfERnRBArgrJctLb72QV",
                        properties : [

                        ],
                        tdElemHtml : [
                            `<td align="center"><p>Product<br/>&<br/>Packaging<img width="75px" height="75px" src="https://1116623-sb2.app.netsuite.com/core/media/media.nl?id=9203525&c=1116623_SB2&h=2o0tcA7GgL-Ks2Zfeomc6r_d4v-ly5uw_wONtpN70kpJzyuG" style="cursor: pointer;" onclick="window.open(window.lineUrl_`,

                            ', \'popupWindow\', \'width=700,height=700,scrollbars=yes\'); return false;" alt="Click to open popup"></p></td>'
                        ],
                        targetScriptId : "customscript_anc_sl_minimize_ui",
                        targetDeploymentId : "customdeploy_anc_sl_minimize_ui",
                        headerTitle : "Packaging",
                        rowTitle : "Packaging",
                        iconWidth : "25px",
                        iconWidth : "25px",
                        position : 11,
                        addtlParams : "&minimizeui=product_and_packaging"
                    },
                    {
                        name : "customer_and_shipping_information",
                        list : [],
                        title : "Customer & Shipping Information",
                        icon : "https://1116623-sb2.app.netsuite.com/core/media/media.nl?id=9203540&c=1116623_SB2&h=qADtKTHIw11x-nfVLN4KLPPcRqNKm5HmGa960KpNFbYInydL",
                        properties : [

                        ],
                        tdElemHtml : [
                            `<td align="center"><p>Product<br/>&<br/>Packaging<img width="75px" height="75px" src="https://1116623-sb2.app.netsuite.com/core/media/media.nl?id=9203525&c=1116623_SB2&h=2o0tcA7GgL-Ks2Zfeomc6r_d4v-ly5uw_wONtpN70kpJzyuG" style="cursor: pointer;" onclick="window.open(window.lineUrl_`,

                            ', \'popupWindow\', \'width=700,height=700,scrollbars=yes\'); return false;" alt="Click to open popup"></p></td>'
                        ],
                        targetScriptId : "customscript_anc_sl_minimize_ui",
                        targetDeploymentId : "customdeploy_anc_sl_minimize_ui",
                        headerTitle : "Shipping",
                        rowTitle : "Shipping",
                        iconWidth : "25px",
                        iconWidth : "25px",
                        position : 11,
                        addtlParams : "&minimizeui=customer_and_shipping"
                    },
                    {
                        name : "scheduling_and_keydates",
                        list : [],
                        title : "Key Dates",
                        icon : "https://1116623-sb2.app.netsuite.com/core/media/media.nl?id=9203556&c=1116623_SB2&h=9LRWts-XaNsvfWEGThTpxop3PPh_vw9a5NL8XkmR0s-IMKXQ",
                        // icon : "https://1116623-sb2.app.netsuite.com/core/media/media.nl?id=9203552&c=1116623_SB2&h=MN-utZwPfu8HdYVArnZgof3D9B7h0I8-zrYC9jESuG41PgRG",
                        // icon : "https://1116623-sb2.app.netsuite.com/core/media/media.nl?id=9203548&c=1116623_SB2&h=bmBfsZKAzX1cWJW3k6JWscc898dfKvCqn4-HlAnnSmEdv9b-",
                        // icon : "https://1116623-sb2.app.netsuite.com/core/media/media.nl?id=9203546&c=1116623_SB2&h=b78Hwg-A3GdVaZkoRGhCGPfUdZ-46PpS4e87hlLXZCd31zlg",
                        // icon : "https://1116623-sb2.app.netsuite.com/core/media/media.nl?id=9203547&c=1116623_SB2&h=T3_gjlsgsuFfQOjmnJ88n0duN5T6UHxs17J4UTxsfshVHFn0",
                        properties : [

                        ],
                        tdElemHtml : [
                            `<td align="center"><p><img width="100px" height="100px" src="https://1116623-sb2.app.netsuite.com/core/media/media.nl?id=9203525&c=1116623_SB2&h=2o0tcA7GgL-Ks2Zfeomc6r_d4v-ly5uw_wONtpN70kpJzyuG" style="cursor: pointer;" onclick="window.open(window.lineUrl_`,

                            ', \'popupWindow\', \'width=700,height=700,scrollbars=yes\'); return false;" alt="Click to open popup"></p></td>'
                        ],
                        targetScriptId : "customscript_anc_sl_minimize_ui",
                        targetDeploymentId : "customdeploy_anc_sl_minimize_ui",
                        headerTitle : "Key Dates",
                        rowTitle : "",
                        iconWidth : "25px",
                        iconWidth : "25px",
                        position : 11,
                        addtlParams : "&minimizeui=scheduling_and_keydates"
                    },
                    {
                        name : "prodcap",
                        list : [],
                        title : "Production Capacity",
                        icon : "https://1116623-sb2.app.netsuite.com/core/media/media.nl?id=9203540&c=1116623_SB2&h=qADtKTHIw11x-nfVLN4KLPPcRqNKm5HmGa960KpNFbYInydL",
                        properties : [

                        ],
                        tdElemHtml : [
                            `<td align="center"><p>Product<br/>&<br/>Packaging<img width="75px" height="75px" src="https://1116623-sb2.app.netsuite.com/core/media/media.nl?id=9203525&c=1116623_SB2&h=2o0tcA7GgL-Ks2Zfeomc6r_d4v-ly5uw_wONtpN70kpJzyuG" style="cursor: pointer;" onclick="window.open(window.lineUrl_`,

                            ', \'popupWindow\', \'width=700,height=700,scrollbars=yes\'); return false;" alt="Click to open popup"></p></td>'
                        ],
                        targetScriptId : "customscript_anc_sl_minimize_ui",
                        targetDeploymentId : "customdeploy_anc_sl_minimize_ui",
                        headerTitle : "Production Capacity",
                        rowTitle : "Production Capacity",
                        iconWidth : "25px",
                        iconWidth : "25px",
                        position : 11,
                        addtlParams : "&minimizeui=prodcap",
                        replicateIcon : true,
                        redirect_to_record : "customrecord_anc_production_capacity"
                    },
                    {
                        name : "shipcap",
                        list : [],
                        title : "Shipment Capacity",
                        icon : "https://1116623-sb2.app.netsuite.com/core/media/media.nl?id=9203540&c=1116623_SB2&h=qADtKTHIw11x-nfVLN4KLPPcRqNKm5HmGa960KpNFbYInydL",
                        properties : [

                        ],
                        tdElemHtml : [
                            `<td align="center"><p>Product<br/>&<br/>Packaging<img width="75px" height="75px" src="https://1116623-sb2.app.netsuite.com/core/media/media.nl?id=9203525&c=1116623_SB2&h=2o0tcA7GgL-Ks2Zfeomc6r_d4v-ly5uw_wONtpN70kpJzyuG" style="cursor: pointer;" onclick="window.open(window.lineUrl_`,

                            ', \'popupWindow\', \'width=700,height=700,scrollbars=yes\'); return false;" alt="Click to open popup"></p></td>'
                        ],
                        targetScriptId : "customscript_anc_sl_minimize_ui",
                        targetDeploymentId : "customdeploy_anc_sl_minimize_ui",
                        headerTitle : "Shipment Capacity",
                        rowTitle : "Shipment Capacity",
                        iconWidth : "25px",
                        iconWidth : "25px",
                        position : 11,
                        addtlParams : "&minimizeui=shipcap",
                        replicateIcon : true,
                        redirect_to_record : "customrecord_anc_production_capacity"
                    },
                    {
                        name : "shipments",
                        list : [],
                        title : "Fitment",
                        icon : "https://1116623-sb2.app.netsuite.com/core/media/media.nl?id=9203540&c=1116623_SB2&h=qADtKTHIw11x-nfVLN4KLPPcRqNKm5HmGa960KpNFbYInydL",
                        properties : [

                        ],
                        tdElemHtml : [
                            `<td align="center"><p>Product<br/>&<br/>Packaging<img width="75px" height="75px" src="https://1116623-sb2.app.netsuite.com/core/media/media.nl?id=9203525&c=1116623_SB2&h=2o0tcA7GgL-Ks2Zfeomc6r_d4v-ly5uw_wONtpN70kpJzyuG" style="cursor: pointer;" onclick="window.open(window.lineUrl_`,

                            ', \'popupWindow\', \'width=700,height=700,scrollbars=yes\'); return false;" alt="Click to open popup"></p></td>'
                        ],
                        targetScriptId : "customscript_anc_sl_minimize_ui",
                        targetDeploymentId : "customdeploy_anc_sl_minimize_ui",
                        headerTitle : "Fitment",
                        rowTitle : "Fitment",
                        iconWidth : "25px",
                        iconWidth : "25px",
                        position : 11,
                        addtlParams : "&minimizeui=shipments",
                        replicateIcon : true
                    },
                    {
                        name : "salesforecast",
                        list : [],
                        title : "Forecast",
                        icon : "https://1116623-sb2.app.netsuite.com/core/media/media.nl?id=9203540&c=1116623_SB2&h=qADtKTHIw11x-nfVLN4KLPPcRqNKm5HmGa960KpNFbYInydL",
                        properties : [

                        ],
                        tdElemHtml : [
                            `<td align="center"><p>Product<br/>&<br/>Packaging<img width="75px" height="75px" src="https://1116623-sb2.app.netsuite.com/core/media/media.nl?id=9203525&c=1116623_SB2&h=2o0tcA7GgL-Ks2Zfeomc6r_d4v-ly5uw_wONtpN70kpJzyuG" style="cursor: pointer;" onclick="window.open(window.lineUrl_`,

                            ', \'popupWindow\', \'width=700,height=700,scrollbars=yes\'); return false;" alt="Click to open popup"></p></td>'
                        ],
                        targetScriptId : "customscript_anc_sl_minimize_ui",
                        targetDeploymentId : "customdeploy_anc_sl_minimize_ui",
                        headerTitle : "Forecast",
                        rowTitle : "Forecast",
                        iconWidth : "25px",
                        iconWidth : "25px",
                        position : 11,
                        addtlParams : "&minimizeui=salesforecast",
                        replicateIcon : true,
                        redirect_to_record : "customrecord_anc_production_capacity"
                    },
                    {
                        name : "linenotes",
                        list : [],
                        title : "Notes",
                        icon : "https://1116623-sb2.app.netsuite.com/core/media/media.nl?id=9206734&c=1116623_SB2&h=_us6MR1TID72HyBuY__AucCpfRA0AO1rhhkq2_EGGi6-4yj8",
                        properties : [

                        ],
                        tdElemHtml : [
                            `<td align="center"><p>Product<br/>&<br/>Packaging<img width="75px" height="75px" src="https://1116623-sb2.app.netsuite.com/core/media/media.nl?id=9203525&c=1116623_SB2&h=2o0tcA7GgL-Ks2Zfeomc6r_d4v-ly5uw_wONtpN70kpJzyuG" style="cursor: pointer;" onclick="window.open(window.lineUrl_`,

                            ', \'popupWindow\', \'width=700,height=700,scrollbars=yes\'); return false;" alt="Click to open popup"></p></td>'
                        ],
                        targetScriptId : "customscript_anc_sl_minimize_ui",
                        targetDeploymentId : "customdeploy_anc_sl_minimize_ui",
                        headerTitle : "Notes",
                        rowTitle : "Notes",
                        iconWidth : "25px",
                        iconWidth : "25px",
                        position : 11,
                        addtlParams : "&minimizeui=notes",
                    },
                ]
            }
        }



        var FREIGHTINVOICE = {
            accessorial_mapping : {
                //FUEL SURCHARGE IS NOT AN ACCESSORIAL
                // "Fuel Surcharge" : 12231, //Newsprint Freight : Fuel Surcharge (Truck - Percent of Freight),
                "Unknown Accessorial Line" : 188338,
                "Detention Charge" : 27415
            },
            "DEFAULT_FUELSURCHARGE_item" : 12231,
            "NF_item_truck_to_cust" : "12493", //Newsprint Freight
            "NF_item_truck_to_whs" : "68403", //Prepaid Newsprint Freight
            "NF_item_rail_to_cust" : "12493", //Newsprint Freight
            "NF_item_rail_to_whs" : "68403", //Prepaid Newsprint Freight
            "FUELSURCHARGE_item_truck_to_cust" : 12231, //Fuel Surcharge (Truck - Percent of Freight)
            "FUELSURCHARGE_item_truck_to_whs" : 68407, //Prepaid Fuel Surcharge (Truck - Percent of Freight)
            "FUELSURCHARGE_item_rail_to_cust" : 12232, //Fuel Surcharge (Rail - $/mile)
            "FUELSURCHARGE_item_rail_to_whs" : 68406, //Prepaid Fuel Surcharge (Rail - $/mile)
            TAXCODES : {
                "TAXCODE_NONTAXABLE82" : 82
            },
            TEMPORARY_ITEM : "188748", //FIXME
            DEFAULTCUSTOMER : {
                "1116623_SB2": 549160,
                "1116623_SB1": 549160,
                "1116623": 549160
            }, //FIXME
            DEFAULTCONSIGNEE : {
                "1116623_SB2": 305737,
                "1116623_SB1": 305737,
                "1116623": 305737
            } //FIXME
        }


        function generateShipments(fitmentRequestData) {
            var rawResp = https.post({
                url: "https://loadfitting.anchub.ca/loadfitting/generateshipments",
                body: fitmentRequestData,
                headers: {
                    "Authorization": loadFittingBearerToken,
                    "Content-Type": "application/json",
                    "accept": "*/*"
                }
            });

            return rawResp;
        }

        const PTMX = {
            generateShipments : generateShipments
        }


        function getFitmentResponse(group_init_to_final = [], shipmentLineIdTracker, prefer_few_payload)
        {
            try
            {
                //MULTIPLE LINES
                log.debug("getFitmentResponse group_init_to_final", group_init_to_final)



                if(group_init_to_final)

                var fitmentResponse = {
                    list : []
                }

                var fitmentRequestData = {};
                fitmentRequestData.jurisdictionName = group_init_to_final[0].lane_originloc_countrytext || "Canada"; //TODO
                fitmentRequestData.syncDetailRecInternalid = group_init_to_final[0].syncDetailRecInternalid; //TODO
                fitmentRequestData.syncDetailParentRecInternalid = group_init_to_final[0].syncDetailParentRecInternalid; //TODO
                fitmentRequestData.correlationId = group_init_to_final[0].correlationId; //TODO

                fitmentRequestData.vehicleName = group_init_to_final[0].line_equipmenttext || "TRTAMDV53"; //TODO REMOVE THIS FALLBACK DEFAULT
                // fitmentRequestData.transportationMode = "TRUCK"; //TODO
                //TODO DEFAULTS to TRUCK if not configured
                fitmentRequestData.transportationMode = group_init_to_final[0].line_equipment_typetext ? (group_init_to_final[0].line_equipment_typetext).toUpperCase() : "TRUCK"; //TODO
                fitmentRequestData.orderItems = [];
                var rawRequestData = group_init_to_final

                for(var a = 0 ; a < group_init_to_final.length; a++)
                {
                    //this function was tested with dedication to xdocks because this was the demo path / main flow
                    if(true /*!group_init_to_final[a].line_usecrossdock || group_init_to_final[a].line_usecrossdock == "F"*/)
                    {

                        try
                        {
                            //TODO
                            //06232025 whats wrong here, why get a blank
                            //test via fitement : https://1116623-sb2.app.netsuite.com/app/site/hosting/scriptlet.nl?script=5573&deploy=1&compid=1116623_SB2&traninternalid=61265755&processid=fitmentcheck
                            //SO62882 + 61265756, trigger via SO62882
                            //FIXME
                            log.debug("xdock=t rawRequestData", rawRequestData);
                            log.debug("xdock=t before push fitmentRequestData", fitmentRequestData);
                            log.debug("xdock=t before push fitmentRequestData.orderItems", fitmentRequestData.orderItems);
                            fitmentRequestData.orderItems = fitmentRequestData.orderItems ? fitmentRequestData.orderItems : [];
                            log.debug("xdock=t after : push fitmentRequestData.orderItems", fitmentRequestData.orderItems);
                            fitmentRequestData.orderItems = fitmentRequestData.orderItems || [];
                            log.debug("xdock=t after || reinit push fitmentRequestData.orderItems", fitmentRequestData.orderItems);

                            if(fitmentRequestData && !fitmentRequestData.orderItems)
                            {
                                fitmentRequestData.orderItems = [];
                            }


                            if(shipmentLineIdTracker[rawRequestData[a].line_uniquekey])
                            {

                            }
                            else
                            {
                                shipmentLineIdTracker[rawRequestData[a].line_uniquekey] = {};
                            }
                            shipmentLineIdTracker[rawRequestData[a].line_uniquekey].weight = rawRequestData[a].line_item_basis_weight;

                            if(fitmentRequestData && !fitmentRequestData.orderItems)
                            {
                                fitmentRequestData.orderItems = [
                                    {
                                        itemId : rawRequestData[a].line_uniquekey || rawRequestData[a].uniquekey || rawRequestData[a].salesOrderLineKey || `1`,
                                        diameter : Number(rawRequestData[a].actualitem_diameter) || Number(rawRequestData[a].line_item_rolldiameter) || 127, //TODO
                                        width : Number(rawRequestData[a].actualitem_width) || Number(rawRequestData[a].line_item_rollwidth) || 88.90,
                                        weight : rawRequestData[a].actualitem_weight || rawRequestData[a].line_item_basis_weight || 673.1,
                                        nb : rawRequestData[a].quantity || rawRequestData[a].line_quantity || rawRequestData[a].qty || 1,
                                        type : /*rawRequestData[a].line_transitoptmethod || */1, //ALWAYS TRUCK OR IT WILL ERROR OUT
                                        rpp : rawRequestData[a].actualitem_rollsperpack || rawRequestData[a].line_item_rollsperpack || rawRequestData[a].line_rollsperpack || 1,
                                    }
                                ];
                                log.debug("xdock=t getFitmentResponse 1 fitmentRequestData.orderItems", fitmentRequestData.orderItems)

                            }
                            else
                            {
                                fitmentRequestData.orderItems.push(
                                    {
                                        itemId : rawRequestData[a].line_uniquekey || rawRequestData[a].uniquekey || rawRequestData[a].salesOrderLineKey || `1`,
                                        diameter : Number(rawRequestData[a].actualitem_diameter) || Number(rawRequestData[a].line_item_rolldiameter) || 127, //TODO
                                        width : Number(rawRequestData[a].actualitem_width) || Number(rawRequestData[a].line_item_rollwidth) || 88.90,
                                        weight : rawRequestData[a].actualitem_weight || rawRequestData[a].line_item_basis_weight || 673.1,
                                        nb : rawRequestData[a].quantity || rawRequestData[a].line_quantity || rawRequestData[a].qty || 1,
                                        type : /*rawRequestData[a].line_transitoptmethod || */1, //ALWAYS TRUCK OR IT WILL ERROR OUT
                                        rpp : rawRequestData[a].actualitem_rollsperpack || rawRequestData[a].line_item_rollsperpack || rawRequestData[a].line_rollsperpack || 1,
                                    }
                                )
                                log.debug("xdock=t getFitmentResponse 2 fitmentRequestData.orderItems", fitmentRequestData.orderItems)

                            }
                            log.debug("xdock=t after push fitmentRequestData.orderItems", fitmentRequestData.orderItems);

                        }
                        catch(e)
                        {
                            log.error("ERROR in function getFitmentResponse leg2", e);
                        }
                    }
                    //IF not using crossdock - meaning it's a direct shipment
                    else
                    {

                        try
                        {
                            //TODO
                            //06232025 whats wrong here, why get a blank
                            //test via fitement : https://1116623-sb2.app.netsuite.com/app/site/hosting/scriptlet.nl?script=5573&deploy=1&compid=1116623_SB2&traninternalid=61265755&processid=fitmentcheck
                            //SO62882 + 61265756, trigger via SO62882
                            //FIXME
                            log.debug("xdock=f rawRequestData", rawRequestData);
                            log.debug("xdock=f before push fitmentRequestData", fitmentRequestData);
                            log.debug("xdock=f before push fitmentRequestData.orderItems", fitmentRequestData.orderItems);
                            fitmentRequestData.orderItems = fitmentRequestData.orderItems ? fitmentRequestData.orderItems : [];
                            log.debug("xdock=f after : push fitmentRequestData.orderItems", fitmentRequestData.orderItems);
                            fitmentRequestData.orderItems = fitmentRequestData.orderItems || [];
                            log.debug("xdock=f after || reinit push fitmentRequestData.orderItems", fitmentRequestData.orderItems);

                            if(fitmentRequestData && !fitmentRequestData.orderItems)
                            {
                                fitmentRequestData.orderItems = [];
                            }


                            if(shipmentLineIdTracker[rawRequestData[a].line_uniquekey])
                            {

                            }
                            else
                            {
                                shipmentLineIdTracker[rawRequestData[a].line_uniquekey] = {};
                            }
                            shipmentLineIdTracker[rawRequestData[a].line_uniquekey].weight = rawRequestData[a].line_item_basis_weight;

                            if(fitmentRequestData && !fitmentRequestData.orderItems)
                            {
                                fitmentRequestData.orderItems = [
                                    {
                                        itemId : rawRequestData[a].line_uniquekey || rawRequestData[a].salesOrderLineKey || 123,
                                        diameter : Number(rawRequestData[a].line_item_rolldiameter) || 127, //TODO
                                        width : Number(rawRequestData[a].line_item_rollwidth) || 88.90,
                                        weight : rawRequestData[a].line_item_basis_weight || 673.1,
                                        nb : rawRequestData[a].line_quantity || rawRequestData[a].qty || 1,
                                        type : /*rawRequestData[a].line_transitoptmethod || */1, //ALWAYS TRUCK OR IT WILL ERROR OUT
                                        rpp : rawRequestData[a].line_item_rollsperpack || rawRequestData[a].line_rollsperpack || 1,
                                    }
                                ];
                                log.debug("xdock=f getFitmentResponse 1 fitmentRequestData.orderItems", fitmentRequestData.orderItems)

                            }
                            else
                            {
                                fitmentRequestData.orderItems.push(
                                    {
                                        itemId : rawRequestData[a].line_uniquekey || rawRequestData[a].salesOrderLineKey || 1,
                                        diameter : Number(rawRequestData[a].line_item_rolldiameter) || 127, //TODO
                                        width : Number(rawRequestData[a].line_item_rollwidth) || 88.90,
                                        weight : rawRequestData[a].line_item_basis_weight || 673.1,
                                        nb : rawRequestData[a].line_quantity || rawRequestData[a].qty || 1,
                                        type : /*rawRequestData[a].line_transitoptmethod || */1, //ALWAYS TRUCK OR IT WILL ERROR OUT
                                        rpp : rawRequestData[a].line_item_rollsperpack || rawRequestData[a].line_rollsperpack || 1,
                                    }
                                )
                                log.debug("xdock=f getFitmentResponse 2 fitmentRequestData.orderItems", fitmentRequestData.orderItems)

                            }
                            log.debug("xdock=f after push fitmentRequestData.orderItems", fitmentRequestData.orderItems);

                        }
                        catch(e)
                        {
                            log.error("ERROR in function getFitmentResponse leg0 direct", e);
                        }
                    }
                }



                log.debug("LEG1 fitmentRequestData", fitmentRequestData)

                var fitmentRequestDataStr = JSON.stringify([fitmentRequestData])

                var connection_timeStamp_start = new Date().getTime();

                //TODO on 08132025 needs an array for Vlad's async logic we requested
                //TODo 09162025 conditionally do this based on parameter prefer_few_payload because loadxpert is less responsive on parallel jobs
                // var rawResp = PTMX.generateShipments(fitmentRequestDataStr);

                var rawResp = "";
                if(prefer_few_payload)
                {
                    return JSON.parse(fitmentRequestDataStr);
                }
                else
                {
                    rawResp = PTMX.generateShipments(fitmentRequestDataStr);
                }

                var connection_timeStamp_end = new Date().getTime();

                log.debug("LEG1 connection time stats", {connection_timeStamp_start, connection_timeStamp_end, duration: connection_timeStamp_start - connection_timeStamp_end})

                log.debug("LEG1 rawResp.body", rawResp.body)

                fitmentResponse.list.push(rawResp)


                // if(group_init_to_final.line_usecrossdock && group_init_to_final.line_usecrossdock != "F")
                // {
                //         group_init_to_final.line_usecrossdock
                //
                // }
                // fitmentRequestData.country = "Canada"; //TODO

                //first leg, if it requires cross dock expect 2 legs already



                log.debug("getFitmentResponse fitmentResponse", fitmentResponse);
                return fitmentResponse;
            }
            catch(e)
            {
                log.error("ERROR in function getFitmentResponse", e);
            }

        }

        function formatAsFilters(shipmentUniqueKeys)
        {

            log.debug("shipmentUniqueKeys", shipmentUniqueKeys);
            var tranlineUniquekeyQuotedCSV_array = shipmentUniqueKeys.map(function(elem){
                return `'${elem}'`
            })

            var tranlineUniquekeyQuotedCSV = tranlineUniquekeyQuotedCSV_array.join(",");

            return tranlineUniquekeyQuotedCSV;
        }

        //08252025 must work for both sales orders and transfer orders both.
        function groupOrderLinesForShipmentGeneration(tranInternalId, tranlineUniquekey, shipmentUniqueKeys, salesOrderLineKeys, forceLeg)
        {
            var columns = [];
            var filters = [];
            // tranInternalId = tranInternalId.concat(61265756);
            if(shipmentUniqueKeys) //retrieving leg2s for leg1shipments
            {
                var shipmentUniqueKeys = formatAsFilters(shipmentUniqueKeys)

                filters = [
                    ["mainline","is","F"],
                    "AND",
                    ["taxline","is","F"],
                ];
                if(shipmentUniqueKeys)
                {
                    filters.push("AND")
                    filters.push([`formulanumeric: CASE WHEN {lineuniquekey} IN (${shipmentUniqueKeys}) THEN 1 ELSE 0 END`,"equalto","1"])

                }
                else
                    //TODO STOP IT FROM DOING RUNNING SEARCHES WITH NO FILTER OR IT WILL SEARCH THOUSANDS OF TRANSACTION LINES
                {
                    //this will make it continue search but with no results because no such lineuniquekey as 1
                    filters.push("AND")
                    filters.push([`formulanumeric: CASE WHEN {lineuniquekey} IN ('1') THEN 1 ELSE 0 END`,"equalto","1"])
                }

                if(tranlineUniquekey)
                {

                    var tranlineUniquekeyQuotedCSV_array = tranlineUniquekey.map(function(elem){
                        return `'${elem}'`
                    })

                    var tranlineUniquekeyQuotedCSV = tranlineUniquekeyQuotedCSV_array.join(",");

                    filters.push("AND")
                    filters.push([`formulanumeric: CASE WHEN {lineuniquekey} IN (${tranlineUniquekeyQuotedCSV}) THEN 1 ELSE 0 END`,"equalto","1"])
                }

                log.debug("groupOrderLinesForShipmentGeneration shipmentUniqueKeys=T filters", filters)

                columns = [
                    search.createColumn({name: "custbody_consignee", label: "body_consignee"}),
                    search.createColumn({name: "custbody_anc_deliverydate", label: "body_deliverydate"}),
                    search.createColumn({name: "mainname", label: "body_entity"}),
                    search.createColumn({name: "internalid", label: "body_internalid"}),
                    search.createColumn({name: "custcol_anc_shippinglane", label: "line_lane"}),
                    search.createColumn({
                        name: "custrecord_anc_lane_cde",
                        join: "CUSTCOL_ANC_SHIPPINGLANE",
                        label: "line_lane_cde"
                    }),
                    search.createColumn({
                        name: "custrecord_anc_lane_cdw",
                        join: "CUSTCOL_ANC_SHIPPINGLANE",
                        label: "line_lane_cdw"
                    }),
                    search.createColumn({
                        name: "custrecord_anc_lane_cdtt",
                        join: "CUSTCOL_ANC_SHIPPINGLANE",
                        label: "line_lane_cdtt"
                    }),
                    search.createColumn({
                        name: "custrecord_anc_lane_crossdockcity",
                        join: "CUSTCOL_ANC_SHIPPINGLANE",
                        label: "line_lane_crossdockcity"
                    }),
                    search.createColumn({
                        name: "custrecord_anc_crossdockeligible",
                        join: "CUSTCOL_ANC_SHIPPINGLANE",
                        label: "line_lane_crossdockeligible"
                    }),
                    search.createColumn({
                        name: "custrecord_anc_lane_destinationcity",
                        join: "CUSTCOL_ANC_SHIPPINGLANE",
                        label: "line_lane_destinationcity"
                    }),
                    search.createColumn({
                        name: "custrecord_anc_lane_ftte",
                        join: "CUSTCOL_ANC_SHIPPINGLANE",
                        label: "line_lane_fte"
                    }),
                    search.createColumn({
                        name: "custrecord_fttc",
                        join: "CUSTCOL_ANC_SHIPPINGLANE",
                        label: "line_lane_ftc"
                    }),
                    search.createColumn({
                        name: "custrecord_anc_lane_ftt",
                        join: "CUSTCOL_ANC_SHIPPINGLANE",
                        label: "line_lane_ftt"
                    }),
                    search.createColumn({
                        name: "custrecord_anc_lane_lce",
                        join: "CUSTCOL_ANC_SHIPPINGLANE",
                        label: "line_lane_lce"
                    }),
                    search.createColumn({
                        name: "custrecord_anc_lane_lcpt",
                        join: "CUSTCOL_ANC_SHIPPINGLANE",
                        label: "line_lane_lcc"
                    }),
                    search.createColumn({
                        name: "custrecord_anc_lane_lctt",
                        join: "CUSTCOL_ANC_SHIPPINGLANE",
                        label: "line_lane_lct"
                    }),
                    search.createColumn({
                        name: "custrecord_anc_lane_originwarehousecity",
                        join: "CUSTCOL_ANC_SHIPPINGLANE",
                        label: "line_lane_origincity"
                    }),
                    search.createColumn({
                        name: "custrecord_anc_lane_originwarehousecntry",
                        join: "CUSTCOL_ANC_SHIPPINGLANE",
                        label: "line_lane_origincountry"
                    }),
                    search.createColumn({name: "custbody_anc_shipment_leg", label: "body_leg"}),
                    search.createColumn({name: "custbody_ns_consignee", label: "body_nsconsignee"}),
                    search.createColumn({
                        name: "custrecord_alberta_ns_country",
                        join: "CUSTBODY_NS_CONSIGNEE",
                        label: "body_nsconsignee_country"
                    }),
                    search.createColumn({name: "custbody_anc_shipdate", label: "body_shipdate"}),
                    search.createColumn({name: "statusref", label: "body_status"}),
                    search.createColumn({name: "custcol_anc_actualitemtobeshipped", label: "line_actualitem"}),
                    search.createColumn({
                        name: "custitem_roll_diameter_metric",
                        join: "CUSTCOL_ANC_ACTUALITEMTOBESHIPPED",
                        label: "line_actualitem_diameter"
                    }),
                    search.createColumn({
                        name: "parent",
                        join: "CUSTCOL_ANC_ACTUALITEMTOBESHIPPED",
                        label: "line_actualitem_parent"
                    }),
                    search.createColumn({
                        name: "custitem_roll_rpp",
                        join: "CUSTCOL_ANC_ACTUALITEMTOBESHIPPED",
                        label: "line_actualitem_rollsperpack"
                    }),
                    search.createColumn({
                        name: "custitem_weight_of_sku",
                        join: "CUSTCOL_ANC_ACTUALITEMTOBESHIPPED",
                        label: "line_actualitem_weight"
                    }),
                    search.createColumn({
                        name: "custitem_roll_width_metric",
                        join: "CUSTCOL_ANC_ACTUALITEMTOBESHIPPED",
                        label: "line_actualitem_width"
                    }),
                    search.createColumn({name: "custcol_consignee", label: "line_consignee"}),
                    search.createColumn({
                        name: "custrecord_alberta_ns_country",
                        join: "CUSTCOL_CONSIGNEE",
                        label: "line_consignee_country"
                    }),
                    search.createColumn({
                        name: "country",
                        join: "CUSTCOL_ANC_TRANSITLOCATION",
                        label: "line_crossdock_country"
                    }),
                    search.createColumn({name: "custcol_anc_deliverydate", label: "line_deliverydate"}),
                    search.createColumn({name: "custcol_anc_equipment", label: "line_equipment"}),
                    search.createColumn({name: "custcol_anc_equipment_leg1", label: "line_equipment_leg1"}),
                    search.createColumn({
                        name: "custrecord_anc_transportmode",
                        join: "CUSTCOL_ANC_EQUIPMENT",
                        label: "line_equipment_type"
                    }),
                    search.createColumn({name: "line", label: "line_id"}),
                    search.createColumn({name: "item", label: "line_item"}),
                    search.createColumn({
                        name: "parent",
                        join: "item",
                        label: "line_item_parent"
                    }),
                    search.createColumn({name: "location", label: "line_location"}),
                    search.createColumn({name: "quantity", label: "line_quantity"}),
                    search.createColumn({name: "custcol_anc_relatedlineuniquekey", label: "line_relatedlineuniquekey"}),
                    search.createColumn({name: "custcol_anc_relatedtransaction", label: "line_relatedtransaction"}),
                    search.createColumn({name: "linesequencenumber", label: "line_sequencenumber"}),
                    search.createColumn({name: "custcol_anc_shipdate", label: "line_shipdate"}),
                    search.createColumn({name: "custcol_anc_transitoptmethod", label: "line_transitoptmethod"}),
                    search.createColumn({name: "lineuniquekey", label: "line_uniquekey"}),
                    search.createColumn({name: "custcol_anc_usecrossdock", label: "line_usecrossdock"}),
                    search.createColumn({name: "custbody_anc_lane", label: "body_lane"}),
                    search.createColumn({
                        name: "custrecord_anc_lane_cde",
                        join: "CUSTBODY_ANC_LANE",
                        label: "body_lane_cde"
                    }),
                    search.createColumn({
                        name: "custrecord_anc_lane_cdw",
                        join: "CUSTBODY_ANC_LANE",
                        label: "body_lane_cdw"
                    }),
                    search.createColumn({
                        name: "custrecord_anc_lane_crossdockcity",
                        join: "CUSTBODY_ANC_LANE",
                        label: "body_lane_crossdockcity"
                    }),
                    search.createColumn({
                        name: "custrecord_anc_crossdockeligible",
                        join: "CUSTBODY_ANC_LANE",
                        label: "body_lane_crossdockeligible"
                    }),
                    search.createColumn({
                        name: "custrecord_anc_lane_destinationcity",
                        join: "CUSTBODY_ANC_LANE",
                        label: "body_lane_destinationcity"
                    }),
                    search.createColumn({
                        name: "custrecord_anc_lane_ftte",
                        join: "CUSTBODY_ANC_LANE",
                        label: "body_lane_fte"
                    }),
                    search.createColumn({
                        name: "custrecord_fttc",
                        join: "CUSTBODY_ANC_LANE",
                        label: "body_lane_ftc"
                    }),
                    search.createColumn({
                        name: "custrecord_anc_lane_ftt",
                        join: "CUSTBODY_ANC_LANE",
                        label: "body_lane_ftt"
                    }),
                    search.createColumn({
                        name: "custrecord_anc_lane_lce",
                        join: "CUSTBODY_ANC_LANE",
                        label: "body_lane_lce"
                    }),
                    search.createColumn({
                        name: "custrecord_anc_lane_lcpt",
                        join: "CUSTBODY_ANC_LANE",
                        label: "body_lane_lcc"
                    }),
                    search.createColumn({
                        name: "custrecord_anc_lane_lctt",
                        join: "CUSTBODY_ANC_LANE",
                        label: "body_lane_lct"
                    }),
                    search.createColumn({
                        name: "custrecord_anc_lane_originwarehousecity",
                        join: "CUSTBODY_ANC_LANE",
                        label: "body_lane_ftc"
                    }),
                    search.createColumn({
                        name: "custrecord_anc_lane_originwarehousecntry",
                        join: "CUSTBODY_ANC_LANE",
                        label: "body_lane_origincountry"
                    }),
                    search.createColumn({
                        name: "custcol_anc_relatedtransaction_to",
                        label: "line_relatedtransferorder"
                    }),
                    search.createColumn({
                        name: "custcol_anc_relatedlineuniquekey_to",
                        label: "line_relatedtransferorderuk"
                    }),
                    search.createColumn({
                        name: "custcol_anc_consigneealtaddresscity",
                        label: "line_lane_destinationcity"
                    })
                ]


                var salesorderSearchObj = search.create({
                    type: "transaction",
                    filters: filters,
                    columns:
                    columns
                });
                var searchResultCount = salesorderSearchObj.runPaged().count;
                log.debug("salesorderSearchObj result count",searchResultCount);
                // salesorderSearchObj.run().each(function(result){
                //     // .run().each has a limit of 4,000 results
                //     return true;
                // });

                salesorderSearchObj.title = "groupOrderLinesForShipmentGeneration_" + new Date().getTime();
                salesorderSearchObj.isPublic = true;

                // var srId = salesorderSearchObj.save();
                // log.debug("groupOrderLinesForShipmentGeneration_srId" , srId)

                var sr = getResults(salesorderSearchObj.run());

                var firstLocationId = "";
                var firstLocationText = "";
                var srToObjects = sr.map(function(res){
                    // var res = sr[a];

                    var columns = res.columns;

                    var resObjByColumnKey = {}
                    columns.forEach(function(column) {
                        var label = column.label || column.name; // Fallback to name if label is unavailable
                        var value = res.getValue(column);

                        // if(label == "line_deliverydate")
                        // {
                        //     resObjByColumnKey.line_deliverydatetext = res.getText(column);
                        // }

                        resObjByColumnKey[label] = value;


                        if(label == "line_location")
                        {
                            if(!firstLocationId)
                            {
                                firstLocationId = res.getValue(column);
                            }
                            if(!firstLocationText)
                            {
                                firstLocationText = res.getText(column);
                            }

                            resObjByColumnKey.line_location = firstLocationId;
                            resObjByColumnKey.line_locationtext = firstLocationText;
                        }
                        if(label == "line_consignee")
                        {
                            resObjByColumnKey.line_consigneetext = res.getText(column);
                        }

                        if(label == "custbody_ns_consignee")
                        {
                            resObjByColumnKey.line_custbody_ns_consignee_text = res.getText(column);
                        }

                        if(label == "line_equipment")
                        {
                            resObjByColumnKey.line_equipmenttext = res.getText(column);
                        }
                        if(label == "line_crossdock_country")
                        {
                            resObjByColumnKey.line_crossdock_countrytext = res.getText(column);
                            // resObjByColumnKey.line_crossdock_countrytext = res.getValue(column);
                        }
                        if(label == "lane_originloc_country")
                        {
                            resObjByColumnKey.lane_originloc_countrytext = res.getText(column);
                            // resObjByColumnKey.line_crossdock_countrytext = res.getValue(column);
                        }
                        if(label == "line_equipment_type")
                        {
                            resObjByColumnKey.line_equipment_typetext = res.getText(column);
                        }
                        if(label == "line_quantity")
                        {
                            resObjByColumnKey.line_quantity = Math.abs(res.getValue(column));
                        }
                    });

                    resObjByColumnKey.id = res.id



                    return resObjByColumnKey;
                })
                log.debug("srToObjects", {srToObjects_length : srToObjects.length, srToObjects})

                // var srGroupedByDeliveryDate = groupBy(srToObjects, "line_shipdate")
                // var srGroupedByDeliveryDate = groupByKeys(srToObjects, ["line_shipdate", "line_locationtext", "line_consigneetext", /*"line_equipmenttext"*/])
                // var srGroupedByDeliveryDate = groupByKeys(srToObjects, ["line_shipdate", "line_locationtext", "custrecord_anc_lane_destinationcity", /*"line_equipmenttext"*/])
                //refactored and moved;
                return srToObjects;
            }
            else if(salesOrderLineKeys) //retrieving leg2s for crossdocks
            {
                const filters = [
                    ['mainline', 'is', 'F'],
                    'AND',
                    // ['custbody_anc_shipment_leg', 'is', '2'],
                    ['custbody_anc_shipment_leg', 'equalto', 2],
                    // 'AND',
                    // ['type', 'anyof', 'customsale_anc_shipment'],
                    'AND',
                    [
                        ['custcol_anc_relatedtransaction', 'anyof', ...[...new Set(salesOrderLineKeys.map(k => k.tranId))]]
                    ],
                    "AND",
                    ["custbody_anc_tobedeletedduetodecons", "is", false],
                    //TODO add filter to only deal with SO Lines past LDC
                ];

                const columns = [
                    search.createColumn({name: "custbody_consignee", label: "body_consignee"}),
                    search.createColumn({name: "custbody_anc_deliverydate", label: "body_deliverydate"}),
                    search.createColumn({name: "mainname", label: "body_entity"}),
                    search.createColumn({name: "internalid", label: "body_internalid"}),
                    search.createColumn({name: "custbody_anc_lane", label: "line_lane"}),
                    search.createColumn({
                        name: "custrecord_anc_lane_cde",
                        join: "custbody_anc_lane",
                        label: "line_lane_cde"
                    }),
                    search.createColumn({
                        name: "custrecord_anc_lane_cdw",
                        join: "custbody_anc_lane",
                        label: "line_lane_cdw"
                    }),
                    search.createColumn({
                        name: "custrecord_anc_lane_cdtt",
                        join: "custbody_anc_lane",
                        label: "line_lane_cdtt"
                    }),
                    search.createColumn({
                        name: "custrecord_anc_lane_crossdockcity",
                        join: "custbody_anc_lane",
                        label: "line_lane_crossdockcity"
                    }),
                    search.createColumn({
                        name: "custrecord_anc_crossdockeligible",
                        join: "custbody_anc_lane",
                        label: "line_lane_crossdockeligible"
                    }),
                    search.createColumn({
                        name: "custrecord_anc_lane_destinationcity",
                        join: "custbody_anc_lane",
                        label: "line_lane_destinationcity"
                    }),
                    search.createColumn({
                        name: "custrecord_anc_lane_ftte",
                        join: "custbody_anc_lane",
                        label: "line_lane_fte"
                    }),
                    search.createColumn({
                        name: "custrecord_fttc",
                        join: "custbody_anc_lane",
                        label: "line_lane_ftc"
                    }),
                    search.createColumn({
                        name: "custrecord_anc_lane_ftt",
                        join: "custbody_anc_lane",
                        label: "line_lane_ftt"
                    }),
                    search.createColumn({
                        name: "custrecord_anc_lane_lce",
                        join: "custbody_anc_lane",
                        label: "line_lane_lce"
                    }),
                    search.createColumn({
                        name: "custrecord_anc_lane_lcpt",
                        join: "custbody_anc_lane",
                        label: "line_lane_lcc"
                    }),
                    search.createColumn({
                        name: "custrecord_anc_lane_lctt",
                        join: "custbody_anc_lane",
                        label: "line_lane_lct"
                    }),
                    search.createColumn({
                        name: "custrecord_anc_lane_originwarehousecity",
                        join: "custbody_anc_lane",
                        label: "line_lane_origincity"
                    }),
                    search.createColumn({
                        name: "custrecord_anc_lane_originwarehousecntry",
                        join: "custbody_anc_lane",
                        label: "line_lane_origincountry"
                    }),
                    search.createColumn({name: "custbody_anc_shipment_leg", label: "body_leg"}),
                    search.createColumn({name: "custbody_ns_consignee", label: "body_nsconsignee"}),
                    search.createColumn({
                        name: "custrecord_alberta_ns_country",
                        join: "CUSTBODY_NS_CONSIGNEE",
                        label: "body_nsconsignee_country"
                    }),
                    search.createColumn({name: "custbody_anc_shipdate", label: "body_shipdate"}),
                    search.createColumn({name: "statusref", label: "body_status"}),
                    search.createColumn({name: "item", label: "line_actualitem"}),
                    search.createColumn({
                        name: "custitem_roll_diameter_metric",
                        join: "ITEM",
                        label: "line_actualitem_diameter"
                    }),
                    search.createColumn({
                        name: "parent",
                        join: "ITEM",
                        label: "line_actualitem_parent"
                    }),
                    search.createColumn({
                        name: "custitem_roll_rpp",
                        join: "ITEM",
                        label: "line_actualitem_rollsperpack"
                    }),
                    search.createColumn({
                        name: "custitem_weight_of_sku",
                        join: "ITEM",
                        label: "line_actualitem_weight"
                    }),
                    search.createColumn({
                        name: "custitem_roll_width_metric",
                        join: "ITEM",
                        label: "line_actualitem_width"
                    }),
                    search.createColumn({name: "custcol_consignee", label: "line_consignee"}),
                    search.createColumn({
                        name: "custrecord_alberta_ns_country",
                        join: "CUSTCOL_CONSIGNEE",
                        label: "line_consignee_country"
                    }),
                    search.createColumn({
                        name: "country",
                        join: "CUSTCOL_ANC_TRANSITLOCATION",
                        label: "line_crossdock_country"
                    }),
                    search.createColumn({name: "custcol_anc_deliverydate", label: "line_deliverydate"}),
                    search.createColumn({name: "custcol_anc_equipment", label: "line_equipment"}),
                    search.createColumn({name: "custcol_anc_equipment_leg1", label: "line_equipment_leg1"}),
                    search.createColumn({
                        name: "custrecord_anc_transportmode",
                        join: "CUSTCOL_ANC_EQUIPMENT",
                        label: "line_equipment_type"
                    }),
                    search.createColumn({name: "line", label: "line_id"}),
                    search.createColumn({name: "item", label: "line_item"}),
                    search.createColumn({name: "custcol_anc_actualitemtobeshipped", label: "line_actualitem"}),
                    search.createColumn({
                        name: "parent",
                        join: "item",
                        label: "line_item_parent"
                    }),
                    search.createColumn({name: "location", label: "line_location"}),
                    search.createColumn({name: "quantity", label: "line_quantity"}),
                    search.createColumn({name: "custcol_anc_relatedlineuniquekey", label: "line_relatedlineuniquekey"}),
                    search.createColumn({name: "custcol_anc_relatedtransaction", label: "line_relatedtransaction"}),
                    search.createColumn({name: "linesequencenumber", label: "line_sequencenumber"}),
                    search.createColumn({name: "custcol_anc_shipdate", label: "line_shipdate"}),
                    search.createColumn({name: "custcol_anc_transitoptmethod", label: "line_transitoptmethod"}),
                    search.createColumn({name: "lineuniquekey", label: "line_uniquekey"}),
                    search.createColumn({name: "custcol_anc_usecrossdock", label: "line_usecrossdock"}),
                    search.createColumn({name: "custbody_anc_lane", label: "body_lane"}),
                    search.createColumn({
                        name: "custrecord_anc_lane_cde",
                        join: "CUSTBODY_ANC_LANE",
                        label: "body_lane_cde"
                    }),
                    search.createColumn({
                        name: "custrecord_anc_lane_cdw",
                        join: "CUSTBODY_ANC_LANE",
                        label: "body_lane_cdw"
                    }),
                    search.createColumn({
                        name: "custrecord_anc_lane_crossdockcity",
                        join: "CUSTBODY_ANC_LANE",
                        label: "body_lane_crossdockcity"
                    }),
                    search.createColumn({
                        name: "custrecord_anc_crossdockeligible",
                        join: "CUSTBODY_ANC_LANE",
                        label: "body_lane_crossdockeligible"
                    }),
                    search.createColumn({
                        name: "custrecord_anc_lane_destinationcity",
                        join: "CUSTBODY_ANC_LANE",
                        label: "body_lane_destinationcity"
                    }),
                    search.createColumn({
                        name: "custrecord_anc_lane_ftte",
                        join: "CUSTBODY_ANC_LANE",
                        label: "body_lane_fte"
                    }),
                    search.createColumn({
                        name: "custrecord_fttc",
                        join: "CUSTBODY_ANC_LANE",
                        label: "body_lane_ftc"
                    }),
                    search.createColumn({
                        name: "custrecord_anc_lane_ftt",
                        join: "CUSTBODY_ANC_LANE",
                        label: "body_lane_ftt"
                    }),
                    search.createColumn({
                        name: "custrecord_anc_lane_lce",
                        join: "CUSTBODY_ANC_LANE",
                        label: "body_lane_lce"
                    }),
                    search.createColumn({
                        name: "custrecord_anc_lane_lcpt",
                        join: "CUSTBODY_ANC_LANE",
                        label: "body_lane_lcc"
                    }),
                    search.createColumn({
                        name: "custrecord_anc_lane_lctt",
                        join: "CUSTBODY_ANC_LANE",
                        label: "body_lane_lct"
                    }),
                    search.createColumn({
                        name: "custrecord_anc_lane_originwarehousecity",
                        join: "CUSTBODY_ANC_LANE",
                        label: "body_lane_ftc"
                    }),
                    search.createColumn({
                        name: "custrecord_anc_lane_originwarehousecntry",
                        join: "CUSTBODY_ANC_LANE",
                        label: "body_lane_origincountry"
                    }),
                    search.createColumn({
                        name: "custcol_anc_consigneealtaddresscity",
                        label: "line_lane_destinationcity"
                    })
                ];


                log.debug("findLeg2Shipments shipmentSearch", shipmentSearch);

                // shipmentSearch.title = "findLeg2Shipments shipmentSearch " + new Date().getTime();
                // shipmentSearch.public = true;
                // shipmentSearch.isPublic = true;
                // var searchInternalId = shipmentSearch.save()
                // log.debug("findLeg2Shipments searchInternalId", searchInternalId)

                var shipmentSearch = search.create({
                    type: "transaction",
                    filters: filters,
                    columns:
                    columns
                });
                var searchResultCount = shipmentSearch.runPaged().count;
                log.debug("salesorderSearchObj result count",searchResultCount);
                // salesorderSearchObj.run().each(function(result){
                //     // .run().each has a limit of 4,000 results
                //     return true;
                // });

                var sr = getResults(shipmentSearch.run());

                var firstLocationId = "";
                var firstLocationText = "";
                var srToObjects = sr.map(function(res){
                    // var res = sr[a];

                    var columns = res.columns;

                    var resObjByColumnKey = {}
                    columns.forEach(function(column) {
                        var label = column.label || column.name; // Fallback to name if label is unavailable
                        var value = res.getValue(column);

                        // if(label == "line_deliverydate")
                        // {
                        //     resObjByColumnKey.line_deliverydatetext = res.getText(column);
                        // }

                        resObjByColumnKey[label] = value;


                        if(label == "line_location")
                        {
                            if(!firstLocationId)
                            {
                                firstLocationId = res.getValue(column);
                            }
                            if(!firstLocationText)
                            {
                                firstLocationText = res.getText(column);
                            }

                            resObjByColumnKey.line_location = firstLocationId;
                            resObjByColumnKey.line_locationtext = firstLocationText;
                        }
                        if(label == "line_consignee")
                        {
                            resObjByColumnKey.line_consigneetext = res.getText(column);
                        }

                        if(label == "custbody_ns_consignee")
                        {
                            resObjByColumnKey.line_custbody_ns_consignee_text = res.getText(column);
                        }

                        if(label == "line_equipment")
                        {
                            resObjByColumnKey.line_equipmenttext = res.getText(column);
                        }
                        if(label == "line_crossdock_country")
                        {
                            resObjByColumnKey.line_crossdock_countrytext = res.getText(column);
                            // resObjByColumnKey.line_crossdock_countrytext = res.getValue(column);
                        }
                        if(label == "lane_originloc_country")
                        {
                            resObjByColumnKey.lane_originloc_countrytext = res.getText(column);
                            // resObjByColumnKey.line_crossdock_countrytext = res.getValue(column);
                        }
                        if(label == "line_equipment_type")
                        {
                            resObjByColumnKey.line_equipment_typetext = res.getText(column);
                        }
                        if(label == "line_quantity")
                        {
                            resObjByColumnKey.line_quantity = Math.abs(res.getValue(column));
                        }
                    });

                    resObjByColumnKey.id = res.id



                    return resObjByColumnKey;
                })
                log.debug("srToObjects", {srToObjects_length : srToObjects.length, srToObjects})

                // var srGroupedByDeliveryDate = groupBy(srToObjects, "line_shipdate")
                // var srGroupedByDeliveryDate = groupByKeys(srToObjects, ["line_shipdate", "line_locationtext", "line_consigneetext", /*"line_equipmenttext"*/])
                // var srGroupedByDeliveryDate = groupByKeys(srToObjects, ["line_shipdate", "line_locationtext", "custrecord_anc_lane_destinationcity", /*"line_equipmenttext"*/])
                //refactored and moved;
                return srToObjects;
            }
            else
            {
                var filters = [
                    ["mainline","is","F"],
                    "AND",
                    ["taxline","is","F"],
                    "AND",
                    ["formulanumeric: CASE WHEN {recordtype} = 'transferorder' THEN CASE WHEN UPPER({transactionlinetype}) = 'ITEM' THEN 1 ELSE 0 END ELSE 1 END","equalto","1"]
                ];
                if(tranInternalId)
                {
                    filters.push("AND")
                    // filters.push(["internalid","anyof",[tranInternalId,61250544]])
                    filters.push(["internalid","anyof",tranInternalId])
                    // filters.push(["internalid","anyof",[tranInternalId]])
                }

                if(tranlineUniquekey)
                {

                    var tranlineUniquekeyQuotedCSV_array = tranlineUniquekey.map(function(elem){
                        return `'${elem}'`
                    })

                    var tranlineUniquekeyQuotedCSV = tranlineUniquekeyQuotedCSV_array.join(",");

                    filters.push("AND")
                    filters.push([`formulanumeric: CASE WHEN {lineuniquekey} IN (${tranlineUniquekeyQuotedCSV}) THEN 1 ELSE 0 END`,"equalto","1"])
                }

                log.debug("groupOrderLinesForShipmentGeneration shipmentUniqueKeys=F filters", filters)

                columns = [
                    search.createColumn({name: "custbody_consignee", label: "body_consignee"}),
                    search.createColumn({name: "custbody_anc_deliverydate", label: "body_deliverydate"}),
                    search.createColumn({name: "mainname", label: "body_entity"}),
                    search.createColumn({name: "internalid", label: "body_internalid"}),
                    search.createColumn({name: "custcol_anc_shippinglane", label: "line_lane"}),
                    search.createColumn({
                        name: "custrecord_anc_lane_cde",
                        join: "CUSTCOL_ANC_SHIPPINGLANE",
                        label: "line_lane_cde"
                    }),
                    search.createColumn({
                        name: "custrecord_anc_lane_cdw",
                        join: "CUSTCOL_ANC_SHIPPINGLANE",
                        label: "line_lane_cdw"
                    }),
                    search.createColumn({
                        name: "custrecord_anc_lane_crossdockcity",
                        join: "CUSTCOL_ANC_SHIPPINGLANE",
                        label: "line_lane_crossdockcity"
                    }),
                    search.createColumn({
                        name: "custrecord_anc_crossdockeligible",
                        join: "CUSTCOL_ANC_SHIPPINGLANE",
                        label: "line_lane_crossdockeligible"
                    }),
                    search.createColumn({
                        name: "custrecord_anc_lane_destinationcity",
                        join: "CUSTCOL_ANC_SHIPPINGLANE",
                        label: "line_lane_destinationcity"
                    }),
                    search.createColumn({
                        name: "custrecord_anc_lane_ftte",
                        join: "CUSTCOL_ANC_SHIPPINGLANE",
                        label: "line_lane_fte"
                    }),
                    search.createColumn({
                        name: "custrecord_fttc",
                        join: "CUSTCOL_ANC_SHIPPINGLANE",
                        label: "line_lane_ftc"
                    }),
                    search.createColumn({
                        name: "custrecord_anc_lane_ftt",
                        join: "CUSTCOL_ANC_SHIPPINGLANE",
                        label: "line_lane_ftt"
                    }),
                    search.createColumn({
                        name: "custrecord_anc_lane_lce",
                        join: "CUSTCOL_ANC_SHIPPINGLANE",
                        label: "line_lane_lce"
                    }),
                    search.createColumn({
                        name: "custrecord_anc_lane_lcpt",
                        join: "CUSTCOL_ANC_SHIPPINGLANE",
                        label: "line_lane_lcc"
                    }),
                    search.createColumn({
                        name: "custrecord_anc_lane_lctt",
                        join: "CUSTCOL_ANC_SHIPPINGLANE",
                        label: "line_lane_lct"
                    }),
                    search.createColumn({
                        name: "custrecord_anc_lane_originwarehousecity",
                        join: "CUSTCOL_ANC_SHIPPINGLANE",
                        label: "line_lane_origincity"
                    }),
                    search.createColumn({
                        name: "custrecord_anc_lane_originwarehousecntry",
                        join: "CUSTCOL_ANC_SHIPPINGLANE",
                        label: "line_lane_origincountry"
                    }),
                    search.createColumn({name: "custbody_anc_shipment_leg", label: "body_leg"}),
                    search.createColumn({name: "custbody_ns_consignee", label: "body_nsconsignee"}),
                    search.createColumn({
                        name: "custrecord_alberta_ns_country",
                        join: "CUSTBODY_NS_CONSIGNEE",
                        label: "body_nsconsignee_country"
                    }),
                    search.createColumn({name: "custbody_anc_shipdate", label: "body_shipdate"}),
                    search.createColumn({name: "statusref", label: "body_status"}),
                    search.createColumn({name: "item", label: "line_actualitem"}),
                    search.createColumn({
                        name: "custitem_roll_diameter_metric",
                        join: "ITEM",
                        label: "line_actualitem_diameter"
                    }),
                    search.createColumn({
                        name: "parent",
                        join: "ITEM",
                        label: "line_actualitem_parent"
                    }),
                    search.createColumn({
                        name: "custitem_roll_rpp",
                        join: "ITEM",
                        label: "line_actualitem_rollsperpack"
                    }),
                    search.createColumn({
                        name: "custitem_weight_of_sku",
                        join: "ITEM",
                        label: "line_actualitem_weight"
                    }),
                    search.createColumn({
                        name: "custitem_roll_width_metric",
                        join: "ITEM",
                        label: "line_actualitem_width"
                    }),
                    search.createColumn({name: "custcol_consignee", label: "line_consignee"}),
                    search.createColumn({
                        name: "custrecord_alberta_ns_country",
                        join: "CUSTCOL_CONSIGNEE",
                        label: "line_consignee_country"
                    }),
                    search.createColumn({
                        name: "country",
                        join: "CUSTCOL_ANC_TRANSITLOCATION",
                        label: "line_crossdock_country"
                    }),
                    search.createColumn({name: "custcol_anc_deliverydate", label: "line_deliverydate"}),
                    search.createColumn({name: "custcol_anc_equipment", label: "line_equipment"}),
                    search.createColumn({name: "custcol_anc_equipment_leg1", label: "line_equipment_leg1"}),
                    search.createColumn({
                        name: "custrecord_anc_transportmode",
                        join: "CUSTCOL_ANC_EQUIPMENT",
                        label: "line_equipment_type"
                    }),
                    search.createColumn({name: "line", label: "line_id"}),
                    search.createColumn({name: "item", label: "line_item"}),
                    search.createColumn({
                        name: "parent",
                        join: "item",
                        label: "line_item_parent"
                    }),
                    search.createColumn({name: "location", label: "line_location"}),
                    search.createColumn({name: "quantity", label: "line_quantity"}),
                    search.createColumn({name: "custcol_anc_relatedlineuniquekey", label: "line_relatedlineuniquekey"}),
                    search.createColumn({name: "custcol_anc_relatedtransaction", label: "line_relatedtransaction"}),
                    search.createColumn({name: "linesequencenumber", label: "line_sequencenumber"}),
                    search.createColumn({name: "custcol_anc_shipdate", label: "line_shipdate"}),
                    search.createColumn({name: "custcol_anc_transitoptmethod", label: "line_transitoptmethod"}),
                    search.createColumn({name: "lineuniquekey", label: "line_uniquekey"}),
                    search.createColumn({name: "custcol_anc_usecrossdock", label: "line_usecrossdock"}),
                    search.createColumn({name: "custbody_anc_lane", label: "body_lane"}),
                    search.createColumn({
                        name: "custrecord_anc_lane_cde",
                        join: "CUSTBODY_ANC_LANE",
                        label: "body_lane_cde"
                    }),
                    search.createColumn({
                        name: "custrecord_anc_lane_cdw",
                        join: "CUSTBODY_ANC_LANE",
                        label: "body_lane_cdw"
                    }),
                    search.createColumn({
                        name: "custrecord_anc_lane_crossdockcity",
                        join: "CUSTBODY_ANC_LANE",
                        label: "body_lane_crossdockcity"
                    }),
                    search.createColumn({
                        name: "custrecord_anc_crossdockeligible",
                        join: "CUSTBODY_ANC_LANE",
                        label: "body_lane_crossdockeligible"
                    }),
                    search.createColumn({
                        name: "custrecord_anc_lane_destinationcity",
                        join: "CUSTBODY_ANC_LANE",
                        label: "body_lane_destinationcity"
                    }),
                    search.createColumn({
                        name: "custrecord_anc_lane_ftte",
                        join: "CUSTBODY_ANC_LANE",
                        label: "body_lane_fte"
                    }),
                    search.createColumn({
                        name: "custrecord_fttc",
                        join: "CUSTBODY_ANC_LANE",
                        label: "body_lane_ftc"
                    }),
                    search.createColumn({
                        name: "custrecord_anc_lane_ftt",
                        join: "CUSTBODY_ANC_LANE",
                        label: "body_lane_ftt"
                    }),
                    search.createColumn({
                        name: "custrecord_anc_lane_lce",
                        join: "CUSTBODY_ANC_LANE",
                        label: "body_lane_lce"
                    }),
                    search.createColumn({
                        name: "custrecord_anc_lane_lcpt",
                        join: "CUSTBODY_ANC_LANE",
                        label: "body_lane_lcc"
                    }),
                    search.createColumn({
                        name: "custrecord_anc_lane_lctt",
                        join: "CUSTBODY_ANC_LANE",
                        label: "body_lane_lct"
                    }),
                    search.createColumn({
                        name: "custrecord_anc_lane_originwarehousecity",
                        join: "CUSTBODY_ANC_LANE",
                        label: "body_lane_ftc"
                    }),
                    search.createColumn({
                        name: "custrecord_anc_lane_originwarehousecntry",
                        join: "CUSTBODY_ANC_LANE",
                        label: "body_lane_origincountry"
                    }),
                    search.createColumn({
                        name: "custcol_anc_consigneealtaddresscity",
                        label: "line_lane_destinationcity"
                    })
                ]



                var salesorderSearchObj = search.create({
                    type: "transaction",
                    filters: filters,
                    columns:
                    columns
                });
                var searchResultCount = salesorderSearchObj.runPaged().count;
                log.debug("salesorderSearchObj result count",searchResultCount);
                // salesorderSearchObj.run().each(function(result){
                //     // .run().each has a limit of 4,000 results
                //     return true;
                // });

                var sr = getResults(salesorderSearchObj.run());

                var firstLocationId = "";
                var firstLocationText = "";
                var srToObjects = sr.map(function(res){
                    // var res = sr[a];

                    var columns = res.columns;

                    var resObjByColumnKey = {}
                    columns.forEach(function(column) {
                        var label = column.label || column.name; // Fallback to name if label is unavailable
                        var value = res.getValue(column);

                        // if(label == "line_deliverydate")
                        // {
                        //     resObjByColumnKey.line_deliverydatetext = res.getText(column);
                        // }

                        resObjByColumnKey[label] = value;


                        if(label == "line_location")
                        {
                            if(!firstLocationId)
                            {
                                firstLocationId = res.getValue(column);
                            }
                            if(!firstLocationText)
                            {
                                firstLocationText = res.getText(column);
                            }

                            resObjByColumnKey.line_location = firstLocationId;
                            resObjByColumnKey.line_locationtext = firstLocationText;
                        }
                        if(label == "line_consignee")
                        {
                            resObjByColumnKey.line_consigneetext = res.getText(column);
                        }

                        if(label == "custbody_ns_consignee")
                        {
                            resObjByColumnKey.line_custbody_ns_consignee_text = res.getText(column);
                        }

                        if(label == "line_equipment")
                        {
                            resObjByColumnKey.line_equipmenttext = res.getText(column);
                        }
                        if(label == "line_crossdock_country")
                        {
                            resObjByColumnKey.line_crossdock_countrytext = res.getText(column);
                            // resObjByColumnKey.line_crossdock_countrytext = res.getValue(column);
                        }
                        if(label == "lane_originloc_country")
                        {
                            resObjByColumnKey.lane_originloc_countrytext = res.getText(column);
                            // resObjByColumnKey.line_crossdock_countrytext = res.getValue(column);
                        }
                        if(label == "line_equipment_type")
                        {
                            resObjByColumnKey.line_equipment_typetext = res.getText(column);
                        }
                        if(label == "line_quantity")
                        {
                            resObjByColumnKey.line_quantity = Math.abs(res.getValue(column));
                        }
                    });

                    resObjByColumnKey.id = res.id



                    return resObjByColumnKey;
                })
                log.debug("srToObjects", {srToObjects_length : srToObjects.length, srToObjects})

                // var srGroupedByDeliveryDate = groupBy(srToObjects, "line_shipdate")
                // var srGroupedByDeliveryDate = groupByKeys(srToObjects, ["line_shipdate", "line_locationtext", "line_consigneetext", /*"line_equipmenttext"*/])
                // var srGroupedByDeliveryDate = groupByKeys(srToObjects, ["line_shipdate", "line_locationtext", "custrecord_anc_lane_destinationcity", /*"line_equipmenttext"*/])
                //refactored and moved;
                return srToObjects;
            }



        }

        function getShipmentsAndOrders(shipmentInput)
        {
            if(!shipmentInput)
            {
                return null;
            }
            var respObj = {};

            log.debug("shipmentInput", shipmentInput)
            if(typeof shipmentInput != "object")
            {
                shipmentInput = JSON.parse(shipmentInput);
            }

            if(!shipmentInput || !shipmentInput.shipmentIds || !shipmentInput.shipmentIds.length > 0)
            {
                return null;
            }

            var shipmentInputQuoted = shipmentInput.shipmentIds.map(function(elem){
                var deconstructedShipmentInternalid = record.submitFields({
                    type : "customsale_anc_shipment",
                    id : elem,
                    values : {
                        custbody_anc_tobedeletedduetodecons : true
                    }
                })
                log.debug("deconstructedShipmentInternalid", deconstructedShipmentInternalid);
                return `'${elem}'`;
            })
            log.debug("shipmentInputQuoted", shipmentInputQuoted)

            var shipmentInputCSVSTR = shipmentInputQuoted.join(",")
            log.debug("shipmentInputCSVSTR", shipmentInputCSVSTR)
            try
            {
                respObj.shipmentAndOrders = []
                if(shipmentInput && shipmentInput.shipmentIds)
                {
                    var sql = `SELECT
                                   BUILTIN_RESULT.TYPE_DATE(TRANSACTION.trandate) AS trandate,
                                   BUILTIN_RESULT.TYPE_STRING(TRANSACTION.memo) AS memo,
                                   BUILTIN_RESULT.TYPE_INTEGER(TRANSACTION.entity) AS entity,
                                   BUILTIN_RESULT.TYPE_STRING(TRANSACTION.tranid) AS tranid,
                                   BUILTIN_RESULT.TYPE_STRING(TRANSACTION.trandisplayname) AS trandisplayname,
                                   BUILTIN_RESULT.TYPE_STRING(TRANSACTION.TYPE) AS TYPE,
                                   BUILTIN_RESULT.TYPE_INTEGER(transactionLine.custcol_anc_relatedtransaction) AS custcol_anc_relatedtransaction,
                                   BUILTIN_RESULT.TYPE_INTEGER(transactionLine.uniquekey) AS uniquekey,
                                   BUILTIN_RESULT.TYPE_STRING(transactionLine.custcol_anc_relatedlineuniquekey) AS custcol_anc_relatedlineuniquekey
                               FROM
                                   TRANSACTION,
                                   transactionLine
                               WHERE
                                   TRANSACTION.ID = transactionLine.TRANSACTION
                                 AND ((NVL(transactionLine.mainline, 'F') = 'F' AND TRANSACTION.TYPE IN ('CuTrSale108')))
                                 AND TRANSACTION.ID IN (${shipmentInputCSVSTR})
                    `;

                    log.debug("sql", sql);
                    const sqlResults_shipmentLines = query.runSuiteQL({ query: sql }).asMappedResults();

                    log.debug("sqlResults_shipmentLines", sqlResults_shipmentLines);
                    respObj.sqlResults_shipmentLines = sqlResults_shipmentLines;

                    var sqlResults_shipmentLinesCondition = "";
                    // var sqlResults_shipmentLines_asFilters = respObj.sqlResults_shipmentLines.map(function(res){
                    //
                    //         if(sqlResults_shipmentLinesCondition)
                    //         {
                    //                 sqlResults_shipmentLinesCondition += ` OR UPPER(transactionLine.custcol_anc_relatedshipments) LIKE '%"SHIPMENTLINEUNIQUEKEY":"${res.uniquekey}"%'`
                    //         }
                    //         else
                    //         {
                    //                 sqlResults_shipmentLinesCondition += `UPPER(transactionLine.custcol_anc_relatedshipments) LIKE '%"SHIPMENTLINEUNIQUEKEY":"${res.uniquekey}"%'`
                    //         }
                    //
                    //         return `OR UPPER(transactionLine.custcol_anc_relatedshipments) LIKE '%"SHIPMENTLINEUNIQUEKEY":"${res.uniquekey}"%'`
                    //
                    // })



                    var sqlResults_shipmentLines_asFilters = respObj.sqlResults_shipmentLines.map(function(res){

                        if(sqlResults_shipmentLinesCondition)
                        {
                            sqlResults_shipmentLinesCondition += ` OR UPPER(transactionLine.uniquekey) = '${res.uniquekey}'`
                        }
                        else
                        {
                            sqlResults_shipmentLinesCondition += `UPPER(transactionLine.uniquekey) = '${res.uniquekey}'`
                        }

                        return `OR UPPER(transactionLine.uniquekey) = '${res.uniquekey}'`

                    })





                    log.debug("sqlResults_shipmentLinesCondition", sqlResults_shipmentLinesCondition);


                    if(shipmentInput && shipmentInput.shipmentIds)
                    {
                        var sql = `SELECT
                                       BUILTIN_RESULT.TYPE_DATE(TRANSACTION.trandate) AS trandate,
                                       BUILTIN_RESULT.TYPE_STRING(TRANSACTION.memo) AS memo,
                                       BUILTIN_RESULT.TYPE_INTEGER(TRANSACTION.entity) AS entity,
                                       BUILTIN_RESULT.TYPE_STRING(TRANSACTION.tranid) AS tranid,
                                       BUILTIN_RESULT.TYPE_STRING(TRANSACTION.trandisplayname) AS trandisplayname,
                                       BUILTIN_RESULT.TYPE_STRING(TRANSACTION.custbody_anc_shipment_leg) AS custbody_anc_shipment_leg,
                                       BUILTIN_RESULT.TYPE_STRING(TRANSACTION.custbody_anc_lane) AS custbody_anc_lane,
                                       BUILTIN_RESULT.TYPE_STRING(TRANSACTION.custbody_anc_originlocation) AS custbody_anc_originlocation,
                                       BUILTIN_RESULT.TYPE_STRING(TRANSACTION.TYPE) AS TYPE,
                                       BUILTIN_RESULT.TYPE_STRING(transactionLine.custcol_anc_relatedshipments) AS custcol_anc_relatedshipments,
                                       BUILTIN_RESULT.TYPE_INTEGER(transactionLine.custcol_anc_relatedtransaction) AS custcol_anc_relatedtransaction,
                                       BUILTIN_RESULT.TYPE_STRING(transactionLine.custcol_anc_relatedlineuniquekey) AS custcol_anc_relatedlineuniquekey,
                                       BUILTIN_RESULT.TYPE_STRING(TRANSACTION.custbody_anc_shipdate) AS line_shipdate,
                                       BUILTIN_RESULT.TYPE_STRING(transactionLine.location) AS line_locationtext,
                                       BUILTIN_RESULT.TYPE_STRING(TRANSACTION.custbody_consignee) AS custrecord_anc_lane_destinationcity,
                                       BUILTIN_RESULT.TYPE_STRING(TRANSACTION.custbody_anc_equipment) AS line_equipmenttext,
                                       BUILTIN_RESULT.TYPE_STRING(transactionLine.uniquekey) AS uniquekey,



                                       BUILTIN_RESULT.TYPE_INTEGER(transactionLine.custcol_anc_actualitemtobeshipped) AS custcol_anc_actualitemtobeshipped,
                                       BUILTIN_RESULT.TYPE_FLOAT(item.custitem_roll_width_metric) AS line_item_rollwidth,
                                       BUILTIN_RESULT.TYPE_FLOAT(item.custitem_item_diameter_imperial) AS line_item_rolldiameter,
                                       BUILTIN_RESULT.TYPE_FLOAT(item.custitem_weight_of_sku) AS line_item_basis_weight,
                                       BUILTIN_RESULT.TYPE_FLOAT(item.custitem_roll_rpp) AS line_rollsperpack

                                   FROM TRANSACTION
                                            JOIN transactionLine
                                                 ON transactionLine.transaction = TRANSACTION.id
                                            LEFT JOIN item
                                                      ON item.id = transactionLine.custcol_anc_actualitemtobeshipped
                                   WHERE
                                        ((NVL(transactionLine.mainline, 'F') = 'F' AND TRANSACTION.TYPE IN ('CuTrSale108') AND ( ${sqlResults_shipmentLinesCondition})))
                        `;

                        log.debug("sql", sql);
                        const sqlResults_shipmentLines = query.runSuiteQL({ query: sql }).asMappedResults();

                        log.debug("sqlResults_shipmentLines", sqlResults_shipmentLines);
                        respObj.lineuniquekeys = sqlResults_shipmentLines.map(function(elem){
                            return elem.lineuniquekey || elem.uniquekey
                        })
                        respObj.sqlResults_shipmentLines = sqlResults_shipmentLines;
                    }
                }
            }
            catch(e)
            {
                log.error("ERROR in function getShipmentsAndOrders", e)
            }
            return respObj;
        }

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

        function groupBy(objectArray, property, fallbackproperty) {
            return objectArray.reduce(function (acc, obj) {
                var key = obj[property];

                if(!key || key == "undefined")
                {
                    key = obj[fallbackproperty];
                }

                if (!acc[key]) {
                    acc[key] = [];
                }
                acc[key].push(obj);
                return acc;
            }, {});
        }

        function resolveLegOrigcityDestcity(objectArray, property, forceLeg, followLeg)
        {
            try
            {
                return objectArray.reduce(function (acc, obj) {

                    // var separator = " | ";
                    var separator = " > ";
                    var isCrossDock = true;
                    var isCrossDock = obj.custrecord_anc_crossdockeligible;

                    var key = "";
                    var origkeys = "";
                    var obj1 = JSON.parse(JSON.stringify(obj))
                    for(var a = 0 ; a < property.length; a++)
                    {
                        obj1["orig_"+property[a]] = obj1[""+property[a]];
                        origkeys += separator + (obj1[property[a]] || "");
                        key +=  separator + (obj1[property[a]] || "");
                    }

                    obj1["orig_custrecord_anc_lane_destinationcity"] = obj1["custrecord_anc_lane_destinationcity"];
                    obj1["orig_line_location"] = obj1["line_location"];
                    obj1.origkeys = origkeys;
                    // key += "|"

                    if (!acc[key]) {
                        acc[key] = {};
                        acc[key].leg = forceLeg || 2;
                        acc[key].list = [];
                        acc[key].followLeg = followLeg
                    }

                    var straightObj = acc[key];
                    log.debug("straightObj", straightObj)

                    if(!isCrossDock || isCrossDock == "F")
                    {
                        if(followLeg)
                        {
                            var key = "";
                            var origkeys = "";
                            var obj1 = JSON.parse(JSON.stringify(obj))
                            for(var a = 0 ; a < property.length; a++)
                            {
                                obj1["orig_"+property[a]] = obj1[""+property[a]];
                                origkeys += separator + (obj1[property[a]] || "");
                                key +=  separator + (obj1[property[a]] || "");
                            }

                            obj1["orig_custrecord_anc_lane_destinationcity"] = obj1["custrecord_anc_lane_destinationcity"];
                            obj1["orig_line_location"] = obj1["line_location"];
                            obj1.origkeys = origkeys;
                            // key += "|"

                            if (!straightObj["list"]) {
                                straightObj.list = [];
                            }
                            // straightObj = acc[key];

                            straightObj.leg = forceLeg
                            straightObj.followLeg = followLeg
                            straightObj.list.push(obj1);
                        }
                        else if(forceLeg == 1)
                        {
                            var key = "";
                            var origkeys = "";
                            var obj1 = JSON.parse(JSON.stringify(obj))
                            for(var a = 0 ; a < property.length; a++)
                            {
                                obj1["orig_"+property[a]] = obj1[""+property[a]];
                                origkeys += separator + (obj1[property[a]] || "");
                                key +=  separator + (obj1[property[a]] || "");
                            }

                            obj1["orig_custrecord_anc_lane_destinationcity"] = obj1["custrecord_anc_lane_destinationcity"];
                            obj1["orig_line_location"] = obj1["line_location"];
                            obj1.origkeys = origkeys;
                            // key += "|"

                            if (!straightObj["list"]) {
                                straightObj.list = [];
                            }
                            // straightObj = acc[key];

                            straightObj.leg = forceLeg
                            straightObj.followLeg = followLeg
                            straightObj.list.push(obj1);
                        }
                        else if(forceLeg == 2)
                        {
                            var key = "";
                            var origkeys = "";
                            var obj1 = JSON.parse(JSON.stringify(obj))
                            for(var a = 0 ; a < property.length; a++)
                            {
                                obj1["orig_"+property[a]] = obj1[""+property[a]];
                                origkeys += separator + (obj1[property[a]] || "");
                                key +=  separator + (obj1[property[a]] || "");
                            }

                            obj1["orig_custrecord_anc_lane_destinationcity"] = obj1["custrecord_anc_lane_destinationcity"];
                            obj1["orig_line_location"] = obj1["line_location"];
                            obj1.origkeys = origkeys;
                            // key += "|"

                            if (!straightObj["list"]) {
                                straightObj.list = [];
                            }
                            // straightObj = acc[key];

                            straightObj.leg = forceLeg
                            straightObj.followLeg = followLeg
                            straightObj.list.push(obj1);
                        }
                    }
                    else/* if(isCrossDock)*/
                    {

                        key = "";
                        origkeys = "";
                        //LEG1
                        //dont need to track it. it will be created after TO

                        //LEG2

                        var obj2 = JSON.parse(JSON.stringify(obj))
                        for(var a = 0 ; a < property.length; a++)
                        {
                            origkeys += separator + (obj2[property[a]] || "");
                            key +=  separator + (obj2[property[a]] || "");
                        }
                        obj2["orig_custrecord_anc_lane_destinationcity"] = obj2["custrecord_anc_lane_destinationcity"].replace();
                        obj2["orig_line_location"] = obj2["line_crossdock_location"];
                        obj2.custpage_ifr_leg = "2";
                        obj2.subtabname = obj2["line_uniquekey"];
                        obj2.origkeys = origkeys;
                        // key += "|"

                        //09031992 - change from .leg2 to .list, we dont want to have leg0,1,2 we just want list
                        if (!straightObj["list"]) {
                            straightObj.list = [];
                        }

                        straightObj.leg = forceLeg || 2
                        straightObj.followLeg = followLeg
                        straightObj.list.push(obj2);

                    }
                    log.debug("resolveLegOrigcityDestcity isCrossDock", {isCrossDock, straightObj})

                    return acc;
                }, {});
            }
            catch(e)
            {
                log.error("ERROR in function resolveLegOrigcityDestcity", e)
            }

        }

        function resolveLegOrigcityDestcity_LP(objectArray, property, forceLeg, followLeg)
        {
            try
            {
                return objectArray.reduce(function (acc, obj) {

                    // var separator = " | ";
                    var separator = " > ";
                    var isCrossDock = true;
                    var isCrossDock = obj.lane_crossdockeligible || obj.custrecord_anc_crossdockeligible;

                    log.debug("resolveLegOrigcityDestcity_LP isCrossDock", isCrossDock)
                    var key = "";
                    var origkeys = "";
                    var obj1 = JSON.parse(JSON.stringify(obj))
                    for(var a = 0 ; a < property.length; a++)
                    {
                        obj1["orig_"+property[a]] = obj1[""+property[a]];
                        origkeys += separator + (obj1[property[a]] || "");
                        key +=  separator + (obj1[property[a]] || "");
                    }

                    obj1["orig_custrecord_anc_lane_destinationcity"] = obj1["custrecord_anc_lane_destinationcity"];
                    obj1["orig_line_location"] = obj1["line_location"];
                    obj1.origkeys = origkeys;
                    // key += "|"

                    if (!acc[key]) {
                        acc[key] = {};
                        acc[key].leg = forceLeg || 2;
                        acc[key].list = [];
                        acc[key].followLeg = followLeg
                    }

                    var straightObj = acc[key];
                    log.debug("straightObj", straightObj)

                    if(!isCrossDock || isCrossDock == "F")
                    {
                        if(followLeg)
                        {
                            var key = "";
                            var origkeys = "";
                            var obj1 = JSON.parse(JSON.stringify(obj))
                            for(var a = 0 ; a < property.length; a++)
                            {
                                obj1["orig_"+property[a]] = obj1[""+property[a]];
                                origkeys += separator + (obj1[property[a]] || "");
                                key +=  separator + (obj1[property[a]] || "");
                            }

                            obj1["orig_custrecord_anc_lane_destinationcity"] = obj1["custrecord_anc_lane_destinationcity"];
                            obj1["orig_line_location"] = obj1["line_location"];
                            obj1.origkeys = origkeys;
                            // key += "|"

                            if (!straightObj["list"]) {
                                straightObj.list = [];
                            }
                            // straightObj = acc[key];

                            straightObj.leg = forceLeg
                            straightObj.followLeg = followLeg
                            straightObj.list.push(obj1);
                        }
                        else if(forceLeg == 1)
                        {
                            var key = "";
                            var origkeys = "";
                            var obj1 = JSON.parse(JSON.stringify(obj))
                            for(var a = 0 ; a < property.length; a++)
                            {
                                obj1["orig_"+property[a]] = obj1[""+property[a]];
                                origkeys += separator + (obj1[property[a]] || "");
                                key +=  separator + (obj1[property[a]] || "");
                            }

                            obj1["orig_custrecord_anc_lane_destinationcity"] = obj1["custrecord_anc_lane_destinationcity"];
                            obj1["orig_line_location"] = obj1["line_location"];
                            obj1.origkeys = origkeys;
                            obj1.leg = forceLeg;
                            // key += "|"

                            if (!straightObj["list"]) {
                                straightObj.list = [];
                            }
                            // straightObj = acc[key];

                            straightObj.leg = forceLeg
                            straightObj.followLeg = followLeg
                            straightObj.list.push(obj1);
                        }
                        else if(forceLeg == 2)
                        {
                            var key = "";
                            var origkeys = "";
                            var obj1 = JSON.parse(JSON.stringify(obj))
                            for(var a = 0 ; a < property.length; a++)
                            {
                                obj1["orig_"+property[a]] = obj1[""+property[a]];
                                origkeys += separator + (obj1[property[a]] || "");
                                key +=  separator + (obj1[property[a]] || "");
                            }

                            obj1["orig_custrecord_anc_lane_destinationcity"] = obj1["custrecord_anc_lane_destinationcity"];
                            obj1["orig_line_location"] = obj1["line_location"];
                            obj1.origkeys = origkeys;
                            obj1.leg = forceLeg;
                            // key += "|"

                            if (!straightObj["list"]) {
                                straightObj.list = [];
                            }
                            // straightObj = acc[key];

                            straightObj.leg = forceLeg
                            straightObj.followLeg = followLeg
                            straightObj.list.push(obj1);
                        }
                        else
                        {
                            var key = "";
                            var origkeys = "";
                            var obj1 = JSON.parse(JSON.stringify(obj))
                            for(var a = 0 ; a < property.length; a++)
                            {
                                obj1["orig_"+property[a]] = obj1[""+property[a]];
                                origkeys += separator + (obj1[property[a]] || "");
                                key +=  separator + (obj1[property[a]] || "");
                            }

                            obj1["orig_custrecord_anc_lane_destinationcity"] = obj1["custrecord_anc_lane_destinationcity"];
                            obj1["orig_line_location"] = obj1["line_location"];
                            obj1.origkeys = origkeys;
                            obj1.leg = "0";
                            // key += "|"

                            if (!straightObj["list"]) {
                                straightObj.list = [];
                            }
                            // straightObj = acc[key];

                            straightObj.leg = forceLeg || 0
                            straightObj.followLeg = followLeg
                            straightObj.list.push(obj1);
                        }
                    }
                    else/* if(isCrossDock)*/
                    {

                        key = "";
                        origkeys = "";
                        //LEG1
                        //dont need to track it. it will be created after TO

                        //LEG2

                        var obj2 = JSON.parse(JSON.stringify(obj))
                        for(var a = 0 ; a < property.length; a++)
                        {
                            origkeys += separator + (obj2[property[a]] || "");
                            key +=  separator + (obj2[property[a]] || "");
                        }
                        obj2["orig_custrecord_anc_lane_destinationcity"] = obj2["custrecord_anc_lane_destinationcity"];
                        obj2["orig_line_location"] = obj2["line_crossdock_location"];
                        obj2.custpage_ifr_leg = "2";
                        obj2.subtabname = obj2["uniquekey"] || obj2["line_uniquekey"];
                        obj2.origkeys = origkeys;
                        obj2.leg = "2";
                        // key += "|"

                        //09031992 - change from .leg2 to .list, we dont want to have leg0,1,2 we just want list
                        if (!straightObj["list"]) {
                            straightObj.list = [];
                        }

                        straightObj.leg = 2
                        straightObj.followLeg = followLeg
                        straightObj.list.push(obj2);

                    }
                    log.debug("resolveLegOrigcityDestcity isCrossDock", {isCrossDock, straightObj})

                    return acc;
                }, {});
            }
            catch(e)
            {
                log.error("ERROR in function resolveLegOrigcityDestcity_LP", e)
            }

        }

        /**
         * Split pre-grouped loads into sub-groups carrying lines for at most 2 consignees.
         * Grouping key: line_consignee (fallback to custbody_consignee if blank/missing).
         * Output keys are derived from the original key plus a suffix:
         *   - Two-consignee batch: "<orig> > <firstLineKeyOfCons1>_<firstLineKeyOfCons2>"
         *   - One-consignee batch: "<orig> > <consigneeId>"
         *
         * @param {Object} input
         * @returns {Object}
         */
        // function splitByConsigneeMax2(input) {
        //     if (!input || typeof input !== 'object') return {};
        //
        //     const out = {};
        //
        //     for (const [groupKey, groupVal] of Object.entries(input)) {
        //         const legArrays = {};
        //         const meta = {};
        //         for (const [k, v] of Object.entries(groupVal)) {
        //             if (Array.isArray(v)) legArrays[k] = v; else meta[k] = v;
        //         }
        //
        //         const allLines = Object.values(legArrays).flat();
        //
        //         // 1) Bucket by consignee (with a real fallback)
        //         const byConsignee = new Map();
        //         const orderedConsignees = [];
        //         for (var line of allLines) {
        //             const primary   = (line.consignee ?? '').toString().trim();
        //             const fallbackC = (line.nsconsignee ?? '').toString().trim(); // <- real fallback, adjust if needed
        //             var consigneeId = primary || fallbackC;
        //
        //             // Pick a stable per-line key
        //             const stableLineKey = String(
        //                 line.relatedlineuniquekey ?? line.uniquekey ?? ''
        //             );
        //
        //             // Deterministic unknown bucket per line
        //             const unknownId = `__NO_CONSIGNEE__:${stableLineKey || 'NA'}`;
        //
        //             const id = consigneeId || unknownId;
        //
        //             if (!byConsignee.has(id)) {
        //                 byConsignee.set(id, {
        //                     id: consigneeId || null,
        //                     firstLineKey: stableLineKey,
        //                     lines: []
        //                 });
        //                 orderedConsignees.push(id);
        //             }
        //             const bucket = byConsignee.get(id);
        //             bucket.lines.push(line);
        //             if (!bucket.firstLineKey && stableLineKey) bucket.firstLineKey = stableLineKey;
        //         }
        //
        //         // 2) Batches of <= 2 consignees
        //         var consigneeBatches = [];
        //         for (let i = 0; i < orderedConsignees.length; i += 2) {
        //             const ids = orderedConsignees.slice(i, i + 2);
        //             consigneeBatches.push(ids.map(id => byConsignee.get(id)));
        //         }
        //
        //         // 3) Build subgroups; guard against duplicate keys
        //         const seenKeys = new Set();
        //         for (const batch of consigneeBatches) {
        //             // Build suffix
        //             let suffix = '';
        //             if (batch.length === 2) {
        //                 const [a, b] = batch;
        //                 const s1 = sanitizeNonEmpty(a.firstLineKey);
        //                 const s2 = sanitizeNonEmpty(b.firstLineKey);
        //                 suffix = `${s1}_${s2}`;
        //             } else {
        //                 const only = batch[0];
        //                 suffix = sanitizeNonEmpty(only.id ?? 'UNKNOWN');
        //             }
        //
        //             let newKey = `${groupKey} > ${suffix}`;
        //             // Ensure uniqueness if suffix collides
        //             if (seenKeys.has(newKey)) {
        //                 let i = 2;
        //                 while (seenKeys.has(`${newKey} #${i}`)) i++;
        //                 newKey = `${newKey} #${i}`;
        //             }
        //             seenKeys.add(newKey);
        //
        //             const newGroup = { ...meta };
        //
        //             for (const [legKey, legLines] of Object.entries(legArrays)) {
        //                 const allowedIds = new Set(batch.map(b => b.id ?? b.firstLineKey));
        //                 const filtered = legLines.filter(line => {
        //                     const primary   = (line.consignee ?? '').toString().trim();
        //                     const fallbackC = (line.nsconsignee ?? '').toString().trim();
        //                     var consigneeId = primary || fallbackC;
        //                     const stableLineKey = String(line.relatedlineuniquekey ?? line.uniquekey ?? '');
        //                     const unknownId = `__NO_CONSIGNEE__:${stableLineKey || 'NA'}`;
        //                     const id = consigneeId || unknownId;
        //                     return allowedIds.has(id);
        //                 });
        //
        //                 if (filtered.length > 0) newGroup[legKey] = filtered;
        //             }
        //
        //             if (Object.keys(newGroup).some(k => Array.isArray(newGroup[k]) && newGroup[k].length)) {
        //                 out[newKey] = newGroup;
        //             }
        //         }
        //     }
        //
        //     return out;
        // }

        // function splitByConsigneeMax2(input) {
        //     if (!input || typeof input !== 'object') return {};
        //
        //     const out = {};
        //
        //     for (const [groupKey, groupVal] of Object.entries(input)) {
        //         // 1) Gather all candidate lines
        //         let allLines = [];
        //         if (Array.isArray(groupVal?.list)) {
        //             allLines = groupVal.list.slice();
        //         } else {
        //             // Flatten any arrays found under the groupVal (e.g., leg1, leg2, list, etc.)
        //             for (const v of Object.values(groupVal)) {
        //                 if (Array.isArray(v)) allLines.push(...v);
        //             }
        //         }
        //         if (!allLines.length) continue;
        //
        //         // 2) Determine leg to preserve
        //         // Priority: explicit group leg -> majority leg from lines -> null
        //         let legToPreserve = (groupVal && groupVal.leg != null && groupVal.leg !== '')
        //             ? Number(groupVal.leg) || groupVal.leg
        //             : null;
        //
        //         if (legToPreserve == null) {
        //             // Tally leg values from lines
        //             const tally = new Map();
        //             for (const ln of allLines) {
        //                 const raw = (ln.leg ?? ln.custpage_ifr_leg ?? '').toString().trim();
        //                 if (!raw) continue;
        //                 const val = Number(raw);
        //                 const key = Number.isFinite(val) ? val : raw; // accept numeric or string legs
        //                 tally.set(key, (tally.get(key) || 0) + 1);
        //             }
        //             if (tally.size) {
        //                 // pick the most frequent leg value
        //                 let best = null, bestCount = -1;
        //                 for (const [k, cnt] of tally.entries()) {
        //                     if (cnt > bestCount) { best = k; bestCount = cnt; }
        //                 }
        //                 legToPreserve = best;
        //             }
        //         }
        //
        //         // 3) Bucket lines by consignee id (fallbacks preserved & deterministic per line)
        //         const byConsignee = new Map(); // id -> lines[]
        //         const order = [];              // preserve first-seen consignee order
        //
        //         for (var line of allLines) {
        //             const primary   = (line.consignee ?? line.custbody_consignee ?? '').toString().trim();
        //             const fallbackC = (line.nsconsignee ?? '').toString().trim();
        //             const stableKey = String(line.relatedlineuniquekey ?? line.uniquekey ?? '').trim();
        //             const id = primary || fallbackC || `__NO_CONSIGNEE__:${stableKey || 'NA'}`;
        //
        //             if (!byConsignee.has(id)) {
        //                 byConsignee.set(id, []);
        //                 order.push(id);
        //             }
        //             byConsignee.get(id).push(line);
        //         }
        //
        //         // 4) Emit batches of up to 2 consignees, preserving order
        //         for (let i = 0; i < order.length; i += 2) {
        //             const batchIds = order.slice(i, i + 2);
        //             const suffix = batchIds.join('_');
        //             const newKey = `${groupKey} > ${suffix}`;
        //
        //             const list = batchIds.flatMap(id => byConsignee.get(id));
        //
        //             out[newKey] = {
        //                 leg: legToPreserve ?? null,
        //                 followLeg: true,
        //                 list
        //             };
        //         }
        //     }
        //
        //     return out;
        // }

        // // TODO replaced with AI mod version because loadplanning testing shows it had more entries than expected(doubled by case c)
        // function splitByConsigneeMax2(input) {
        //     if (!input || typeof input !== 'object') return {};
        //
        //     var out = {};
        //
        //     for (var groupKey in input) {
        //         if (!Object.prototype.hasOwnProperty.call(input, groupKey)) continue;
        //         var groupVal = input[groupKey];
        //
        //         // Collect all lines for this group
        //         var allLines = [];
        //
        //         // Case A: groupVal is an object with .list directly
        //         if (groupVal && typeof groupVal === 'object' && Array.isArray(groupVal.list)) {
        //             for (var i = 0; i < groupVal.list.length; i++) allLines.push(groupVal.list[i]);
        //         }
        //
        //         // Case B: groupVal is an array of group objects (your common case)
        //         if (Array.isArray(groupVal)) {
        //             for (var gi = 0; gi < groupVal.length; gi++) {
        //                 var g = groupVal[gi];
        //                 if (g && g.request) {
        //                     var r = g.request;
        //                     if (Array.isArray(r.list)) {
        //                         for (i = 0; i < r.list.length; i++) allLines.push(r.list[i]);
        //                     }
        //                     if (Array.isArray(r.leg1)) {
        //                         for (i = 0; i < r.leg1.length; i++) allLines.push(r.leg1[i]);
        //                     }
        //                     if (Array.isArray(r.leg2)) {
        //                         for (i = 0; i < r.leg2.length; i++) allLines.push(r.leg2[i]);
        //                     }
        //                 }
        //             }
        //         }
        //
        //         // Case C: groupVal is an object with nested arrays (fallback)
        //         if (groupVal && typeof groupVal === 'object' && !Array.isArray(groupVal)) {
        //             for (var k in groupVal) {
        //                 if (!Object.prototype.hasOwnProperty.call(groupVal, k)) continue;
        //                 var v = groupVal[k];
        //                 if (Array.isArray(v)) {
        //                     for (i = 0; i < v.length; i++) allLines.push(v[i]);
        //                 } else if (v && v.request) {
        //                     var req = v.request;
        //                     if (Array.isArray(req.list))  { for (i = 0; i < req.list.length; i++)  allLines.push(req.list[i]); }
        //                     if (Array.isArray(req.leg1))  { for (i = 0; i < req.leg1.length; i++)  allLines.push(req.leg1[i]); }
        //                     if (Array.isArray(req.leg2))  { for (i = 0; i < req.leg2.length; i++)  allLines.push(req.leg2[i]); }
        //                 }
        //             }
        //         }
        //
        //         if (!allLines.length) continue;
        //
        //         // Determine leg to preserve
        //         var legToPreserve = null;
        //
        //         // Prefer explicit group leg if present
        //         if (groupVal && typeof groupVal === 'object' && !Array.isArray(groupVal)) {
        //             if (groupVal.leg != null && groupVal.leg !== '') {
        //                 legToPreserve = isFinite(Number(groupVal.leg)) ? Number(groupVal.leg) : groupVal.leg;
        //             } else if (groupVal.request && groupVal.request.leg != null && groupVal.request.leg !== '') {
        //                 legToPreserve = isFinite(Number(groupVal.request.leg)) ? Number(groupVal.request.leg) : groupVal.request.leg;
        //             }
        //         }
        //
        //         // If still null, infer majority leg from lines
        //         if (legToPreserve == null) {
        //             var tally = {};
        //             for (i = 0; i < allLines.length; i++) {
        //                 var ln = allLines[i];
        //                 var raw = (ln.leg != null ? ln.leg : (ln.custpage_ifr_leg != null ? ln.custpage_ifr_leg : '')).toString().replace(/^\\s+|\\s+$/g, '');
        //                 if (!raw) continue;
        //                 var key = isFinite(Number(raw)) ? Number(raw) : raw;
        //                 tally[key] = (tally[key] || 0) + 1;
        //             }
        //             var best = null, bestCount = -1;
        //             for (var tk in tally) {
        //                 if (!Object.prototype.hasOwnProperty.call(tally, tk)) continue;
        //                 if (tally[tk] > bestCount) { bestCount = tally[tk]; best = tk; }
        //             }
        //             if (best != null) legToPreserve = best;
        //         }
        //
        //         // Bucket lines by consignee (fallbacks preserved)
        //         var byConsignee = {};
        //         var order = [];
        //         for (i = 0; i < allLines.length; i++) {
        //             var line = allLines[i];
        //             var primary = (line.consignee != null ? String(line.consignee) :
        //                 (line.custbody_consignee != null ? String(line.custbody_consignee) : '')).replace(/^\\s+|\\s+$/g, '');
        //             var fallbackC = (line.nsconsignee != null ? String(line.nsconsignee) : '').replace(/^\\s+|\\s+$/g, '');
        //             var stableKey = String(line.relatedlineuniquekey != null ? line.relatedlineuniquekey :
        //                 (line.uniquekey != null ? line.uniquekey : '')).replace(/^\\s+|\\s+$/g, '');
        //             var id = primary || fallbackC || ('__NO_CONSIGNEE__:' + (stableKey || 'NA'));
        //
        //             if (!Object.prototype.hasOwnProperty.call(byConsignee, id)) {
        //                 byConsignee[id] = [];
        //                 order.push(id);
        //             }
        //             byConsignee[id].push(line);
        //         }
        //
        //         // Emit batches of up to 2 consignees, preserving order
        //         for (i = 0; i < order.length; i += 2) {
        //             var batchIds = order.slice(i, i + 2);
        //             var suffix = batchIds.join('_');
        //             var newKey = groupKey + ' > ' + suffix;
        //
        //             var list = [];
        //             for (var bi = 0; bi < batchIds.length; bi++) {
        //                 var bid = batchIds[bi];
        //                 var arr = byConsignee[bid] || [];
        //                 for (var j = 0; j < arr.length; j++) list.push(arr[j]);
        //             }
        //
        //             out[newKey] = {
        //                 leg: (legToPreserve != null ? legToPreserve : null),
        //                 followLeg: true,
        //                 list: list
        //             };
        //         }
        //     }
        //
        //     return out;
        // }
        //
        // //TODO this splits leg1s based on consignee but it should rely on nsconsignee because consignee in this perspective should be considered internal
        // //TODO in other words leg1 is shouldered by anc, so why cap it by 2 customerconsignees
        // function splitByConsigneeMax2(input) {
        //     if (!input || typeof input !== 'object') return {};
        //
        //     var out = {};
        //
        //     for (var groupKey in input) {
        //         if (!Object.prototype.hasOwnProperty.call(input, groupKey)) continue;
        //         var groupVal = input[groupKey];
        //
        //         // Collect all lines for this group
        //         var allLines = [];
        //
        //         // Case A: groupVal is an object with .list directly
        //         if (groupVal && typeof groupVal === 'object' && Array.isArray(groupVal.list)) {
        //             for (var i = 0; i < groupVal.list.length; i++) allLines.push(groupVal.list[i]);
        //         }
        //
        //         // Case B: groupVal is an array of group objects
        //         if (Array.isArray(groupVal)) {
        //             for (var gi = 0; gi < groupVal.length; gi++) {
        //                 var g = groupVal[gi];
        //                 if (g && g.request) {
        //                     var r = g.request;
        //                     if (Array.isArray(r.list))  { for (i = 0; i < r.list.length; i++)  allLines.push(r.list[i]); }
        //                     if (Array.isArray(r.leg1))  { for (i = 0; i < r.leg1.length; i++)  allLines.push(r.leg1[i]); }
        //                     if (Array.isArray(r.leg2))  { for (i = 0; i < r.leg2.length; i++)  allLines.push(r.leg2[i]); }
        //                 }
        //             }
        //         }
        //
        //         if (!allLines.length) continue;
        //
        //         // Determine leg to preserve
        //         var legToPreserve = null;
        //         if (groupVal && typeof groupVal === 'object' && !Array.isArray(groupVal)) {
        //             if (groupVal.leg != null && groupVal.leg !== '') {
        //                 legToPreserve = isFinite(Number(groupVal.leg)) ? Number(groupVal.leg) : groupVal.leg;
        //             } else if (groupVal.request && groupVal.request.leg != null && groupVal.request.leg !== '') {
        //                 legToPreserve = isFinite(Number(groupVal.request.leg)) ? Number(groupVal.request.leg) : groupVal.request.leg;
        //             }
        //         }
        //         if (legToPreserve == null) {
        //             var tally = {};
        //             for (i = 0; i < allLines.length; i++) {
        //                 var ln = allLines[i];
        //                 var raw = (ln.leg != null ? ln.leg : (ln.custpage_ifr_leg != null ? ln.custpage_ifr_leg : '')).toString().replace(/^\s+|\s+$/g, '');
        //                 if (!raw) continue;
        //                 var key = isFinite(Number(raw)) ? Number(raw) : raw;
        //                 tally[key] = (tally[key] || 0) + 1;
        //             }
        //             var best = null, bestCount = -1;
        //             for (var tk in tally) {
        //                 if (!Object.prototype.hasOwnProperty.call(tally, tk)) continue;
        //                 if (tally[tk] > bestCount) { bestCount = tally[tk]; best = tk; }
        //             }
        //             if (best != null) legToPreserve = best;
        //         }
        //
        //         // Bucket by consignee
        //         var byConsignee = {};
        //         var order = [];
        //         for (i = 0; i < allLines.length; i++) {
        //             var line = allLines[i];
        //             var primary = (line.consignee != null ? String(line.consignee) :
        //                 (line.custbody_consignee != null ? String(line.custbody_consignee) : '')).replace(/^\s+|\s+$/g, '');
        //             var fallbackC = (line.nsconsignee != null ? String(line.nsconsignee) : '').replace(/^\s+|\s+$/g, '');
        //             var stableKey = String(line.relatedlineuniquekey != null ? line.relatedlineuniquekey :
        //                 (line.uniquekey != null ? line.uniquekey : '')).replace(/^\s+|\s+$/g, '');
        //             var id = primary || fallbackC || ('__NO_CONSIGNEE__:' + (stableKey || 'NA'));
        //
        //             if (!Object.prototype.hasOwnProperty.call(byConsignee, id)) {
        //                 byConsignee[id] = [];
        //                 order.push(id);
        //             }
        //             byConsignee[id].push(line);
        //         }
        //
        //         // Emit batches of up to 2 consignees
        //         for (i = 0; i < order.length; i += 2) {
        //             var batchIds = order.slice(i, i + 2);
        //             var suffix = batchIds.join('_');
        //             var newKey = groupKey + ' > ' + suffix;
        //
        //             var list = [];
        //             for (var bi = 0; bi < batchIds.length; bi++) {
        //                 var bid = batchIds[bi];
        //                 var arr = byConsignee[bid] || [];
        //                 for (var j = 0; j < arr.length; j++) list.push(arr[j]);
        //             }
        //
        //             out[newKey] = {
        //                 leg: (legToPreserve != null ? legToPreserve : null),
        //                 followLeg: groupVal.followLeg,
        //                 list: list
        //             };
        //         }
        //     }
        //
        //     return out;
        // }
        function splitByConsigneeMax2(input) {
            if (!input || typeof input !== 'object') return {};

            var out = {};

            for (var groupKey in input) {
                if (!Object.prototype.hasOwnProperty.call(input, groupKey)) continue;
                var groupVal = input[groupKey];

                // Collect all lines for this group
                var allLines = [];

                // Case A: groupVal is an object with .list directly
                if (groupVal && typeof groupVal === 'object' && Array.isArray(groupVal.list)) {
                    for (var i = 0; i < groupVal.list.length; i++) allLines.push(groupVal.list[i]);
                }

                // Case B: groupVal is an array of group objects
                if (Array.isArray(groupVal)) {
                    for (var gi = 0; gi < groupVal.length; gi++) {
                        var g = groupVal[gi];
                        if (g && g.request) {
                            var r = g.request;
                            if (Array.isArray(r.list)) { for (i = 0; i < r.list.length; i++) allLines.push(r.list[i]); }
                            if (Array.isArray(r.leg1)) { for (i = 0; i < r.leg1.length; i++) allLines.push(r.leg1[i]); }
                            if (Array.isArray(r.leg2)) { for (i = 0; i < r.leg2.length; i++) allLines.push(r.leg2[i]); }
                        }
                    }
                }

                if (!allLines.length) continue;

                // Determine leg to preserve
                var legToPreserve = null;
                if (groupVal && typeof groupVal === 'object' && !Array.isArray(groupVal)) {
                    if (groupVal.leg != null && groupVal.leg !== '') {
                        legToPreserve = isFinite(Number(groupVal.leg)) ? Number(groupVal.leg) : groupVal.leg;
                    } else if (groupVal.request && groupVal.request.leg != null && groupVal.request.leg !== '') {
                        legToPreserve = isFinite(Number(groupVal.request.leg)) ? Number(groupVal.request.leg) : groupVal.request.leg;
                    }
                }
                if (legToPreserve == null) {
                    var tally = {};
                    for (i = 0; i < allLines.length; i++) {
                        var ln = allLines[i];
                        var raw = (ln.leg != null ? ln.leg : (ln.custpage_ifr_leg != null ? ln.custpage_ifr_leg : '')).toString().replace(/^\s+|\s+$/g, '');
                        if (!raw) continue;
                        var key = isFinite(Number(raw)) ? Number(raw) : raw;
                        tally[key] = (tally[key] || 0) + 1;
                    }
                    var best = null, bestCount = -1;
                    for (var tk in tally) {
                        if (!Object.prototype.hasOwnProperty.call(tally, tk)) continue;
                        if (tally[tk] > bestCount) { bestCount = tally[tk]; best = tk; }
                    }
                    if (best != null) legToPreserve = best;
                }

                // If leg == 1, prefer nsconsignee; else prefer consignee
                var isLeg1 = (legToPreserve != null && String(legToPreserve).replace(/^\s+|\s+$/g, '') === '1');

                // Bucket by consignee/nsconsignee (depending on leg)
                var byConsignee = {};
                var order = [];
                for (i = 0; i < allLines.length; i++) {
                    var line = allLines[i];

                    var consigneePrimary, consigneeFallback;

                    if (isLeg1) {
                        // Leg 1 → bucket by internal crossdock (nsconsignee)
                        consigneePrimary = (line.nsconsignee != null ? String(line.nsconsignee) : '').replace(/^\s+|\s+$/g, '');
                        consigneeFallback = (line.consignee != null ? String(line.consignee) :
                            (line.custbody_consignee != null ? String(line.custbody_consignee) : '')).replace(/^\s+|\s+$/g, '');
                    } else {
                        // Other legs → bucket by external consignee (default behavior)
                        consigneePrimary = (line.consignee != null ? String(line.consignee) :
                            (line.custbody_consignee != null ? String(line.custbody_consignee) : '')).replace(/^\s+|\s+$/g, '');
                        consigneeFallback = (line.nsconsignee != null ? String(line.nsconsignee) : '').replace(/^\s+|\s+$/g, '');
                    }

                    var stableKey = String(line.relatedlineuniquekey != null ? line.relatedlineuniquekey :
                        (line.uniquekey != null ? line.uniquekey : '')).replace(/^\s+|\s+$/g, '');

                    var id = consigneePrimary || consigneeFallback || ('__NO_CONSIGNEE__:' + (stableKey || 'NA'));

                    if (!Object.prototype.hasOwnProperty.call(byConsignee, id)) {
                        byConsignee[id] = [];
                        order.push(id);
                    }
                    byConsignee[id].push(line);
                }

                // Emit batches of up to 2 buckets
                for (i = 0; i < order.length; i += 2) {
                    var batchIds = order.slice(i, i + 2);
                    var suffix = batchIds.join('_');
                    var newKey = groupKey + ' > ' + suffix;

                    var list = [];
                    for (var bi = 0; bi < batchIds.length; bi++) {
                        var bid = batchIds[bi];
                        var arr = byConsignee[bid] || [];
                        for (var j = 0; j < arr.length; j++) list.push(arr[j]);
                    }

                    out[newKey] = {
                        leg: (legToPreserve != null ? legToPreserve : null),
                        followLeg: groupVal && typeof groupVal === 'object' ? groupVal.followLeg : undefined,
                        list: list
                    };
                }
            }

            return out;
        }






        function sanitizeNonEmpty(s) {
            const raw = (s ?? '').toString();
            const cleaned = raw.replace(/\s+/g, '').replace(/[^A-Za-z0-9_\-:.]/g, '');
            return cleaned || 'UNKNOWN';
        }


        /* ===== Example =====
        const input = {
          " > 9/9/2025 > ANS Paper (Summary) : ANC Whitecourt Warehouse > De Kalb > TRTAMDV53": {
            leg: 2,
            list: [
              { line_uniquekey: "69412325", line_consignee: "280317", line_consigneetext: "Castle-PrinTech", line_quantity: 50 },
              { line_uniquekey: "69412326", line_consignee: "306042", line_consigneetext: "Castle-PrinTech", line_quantity: 50 },
              { line_uniquekey: "69412327", line_consignee: "306043", line_consigneetext: "Castle-PrinTech", line_quantity: 50 }
            ],
            syncJobDetailInternald: "2570"
          }
        };

        console.log(splitByConsigneeMax2(input));

        /*
        Possible output (shape you requested):
        {
          " > 9/9/2025 > ANS Paper (Summary) : ANC Whitecourt Warehouse > De Kalb > TRTAMDV53 > 69412325_69412326": {
            "leg": 2,
            "list": [
              { ... line_uniquekey: "69412325", line_consignee: "280317", ... },
              { ... line_uniquekey: "69412326", line_consignee: "306042", ... }
            ],
            "syncJobDetailInternald": "2570"
          },
          " > 9/9/2025 > ANS Paper (Summary) : ANC Whitecourt Warehouse > De Kalb > TRTAMDV53 > 306043": {
            "leg": 2,
            "list": [
              { ... line_uniquekey: "69412327", line_consignee: "306043", ... }
            ],
            "syncJobDetailInternald": "2570"
          }
        }
        */



        //this is deprecated, this is not being called anywhere asof 09042025 TODO remove this once confirmed
        function groupByKeys(objectArray, property) {
            return objectArray.reduce(function (acc, obj) {

                // var separator = " | ";
                var separator = " > ";
                var key = "";
                var origkeys = "";
                var isCrossDock = true;
                var isCrossDock = obj.custrecord_anc_crossdockeligible;
                if(!isCrossDock || isCrossDock == "F")
                {
                    var obj1 = JSON.parse(JSON.stringify(obj))
                    for(var a = 0 ; a < property.length; a++)
                    {
                        obj1["orig_"+property[a]] = obj1[""+property[a]];
                        origkeys += separator + (obj1[property[a]] || "");
                        key +=  separator + (obj1[property[a]] || "");
                    }

                    obj1["orig_custrecord_anc_lane_destinationcity"] = obj1["custrecord_anc_lane_destinationcity"];
                    obj1["orig_line_location"] = obj1["line_location"];
                    obj1.origkeys = origkeys;
                    // key += "|"

                    if (!acc[key]) {
                        acc[key] = [];
                    }
                    acc[key].push(obj1);
                }
                else/* if(isCrossDock)*/
                {
                    //LEG1

                    var obj1 = JSON.parse(JSON.stringify(obj))
                    for(var a = 0 ; a < property.length; a++)
                    {
                        origkeys += separator + (obj1[property[a]] || "");
                        if(property[a] == "custrecord_anc_lane_destinationcity")
                        {
                            obj1["orig_"+property[a]] = obj1["custrecord_anc_lane_destinationcity"];
                            obj1[property[a]] = obj1["custrecord_anc_lane_crossdockcity"];
                        }
                        key +=  separator + (obj1[property[a]] || "");
                    }
                    obj1["orig_line_location"] = obj1["line_location"];
                    obj1.custpage_ifr_leg = "1";
                    obj1.subtabname = obj1["line_uniquekey"];
                    obj1.origkeys = origkeys;
                    // key += "|"

                    if (!acc[key]) {
                        acc[key] = [];
                    }
                    acc[key].push(obj1);

                    key = "";
                    origkeys = "";

                    //LEG2

                    var obj2 = JSON.parse(JSON.stringify(obj))
                    for(var a = 0 ; a < property.length; a++)
                    {
                        origkeys += separator + (obj2[property[a]] || "");
                        if(property[a] == "line_locationtext")
                        {
                            obj2["orig_"+property[a]] = obj2["line_locationtext"];
                            obj2[property[a]] = obj2["custrecord_anc_lane_crossdockcity"];
                        }
                        key +=  separator + (obj2[property[a]] || "");
                    }
                    obj2["orig_custrecord_anc_lane_destinationcity"] = obj2["custrecord_anc_lane_destinationcity"];
                    obj2["orig_line_location"] = obj2["line_location"];
                    obj2.custpage_ifr_leg = "2";
                    obj2.subtabname = obj2["line_uniquekey"];
                    obj2.origkeys = origkeys;
                    // key += "|"

                    if (!acc[key]) {
                        acc[key] = [];
                    }
                    acc[key].push(obj2);
                }

                return acc;
            }, {});
        }

        function getLoadDetails(loadId)
        {
            var getLoadDetails_result = {};
            getLoadDetails_result.loadId = loadId;
            try
            {

                getLoadDetails_result.taxId = 82;
            }
            catch(e)
            {
                log.error("ERROR in function getLoadDetails", e)
            }

            return getLoadDetails_result;
        }

        function prepLoad(loadID, otherDetails={}, updateShipment)
        {
            var OVERRIDE_LOAD_FOR_TESTING = false;
            var prepShipmentRecId = "";
            var assumeLoadIsMissing = true;
            var customerId = "";
            var consigneeId = "";
            // var customerId = FREIGHTINVOICE.DEFAULTCUSTOMER[runtime.accountId]
            // var consigneeId = FREIGHTINVOICE.DEFAULTCONSIGNEE[runtime.accountId]
            try
            {
                if(assumeLoadIsMissing)
                {

                    var searchObj = search.create({
                        type : "customsale_anc_shipment",
                        filters : [
                            ["custbody4", "is", loadID]
                        ]
                    });

                    customerId = searchCustomer_id(otherDetails)
                    consigneeId = searchConsignee_id(otherDetails)
                    var searchResultCount = searchObj.runPaged().count;
                    if(searchResultCount <= 0)
                    {
                        log.debug("no result for " + loadID, searchObj.filters)
                    }
                    else
                    {
                        searchObj.run().each(function(res){
                            prepShipmentRecId = res.id;
                            return false;
                        })
                        if(updateShipment)
                        {


                            var shipmentRecObj = record.load({
                                type : "customsale_anc_shipment",
                                id : prepShipmentRecId
                            });
                            shipmentRecObj.setValue({
                                fieldId : "entity",
                                //         value: 106127,
                                // //Lee BHM Corp (Parent) : Arizona Daily Sun
                                // // WM5845	6477-WM5845_DUP_1
                                value: customerId,
                                // //Mittera Albertson's
                                //         value: 498581,
                                // //Midland Paper Company (Parent) : Midland PRH All Star Book
                                // value: 330177,
                                //Friesens Corporation - MB CAN
                            })

                            shipmentRecObj.setValue({
                                fieldId : "custbody_consignee",
                                //         value: 305730,
                                // // Lee BHM Corp (Parent) : Arizona Daily Sun // Arizona Daily Sun TEST Second Consignee
                                // //AZ US
                                value: consigneeId,
                                // //BC Coast 2000 Terminals Ltd.
                                // // Lulu Island	BC	CAN
                                //         //WM6040
                                //         value: 304127,
                                // // Friesens Corporation - MB CAN
                                // value: 302826,
                                //Active Warehouse 9	Mittera (Parent) : Mittera Kroger - AB CAN
                            })


                            shipmentRecObj.setValue({
                                fieldId : "custbody_anc_shipment_leg",
                                value: "2"
                            })
                            shipmentRecObj.setValue({
                                fieldId : "custbody4",
                                value: loadID
                            })
                            shipmentRecObj.setValue({
                                fieldId : "custbody_anc_equipment",
                                value: 1 //TRTAMDV53
                            })
                            /*
                                                    shipmentRecObj.setValue({
                                                            fieldId : "location",
                                                            value: 9 //ANS Paper (Summary) : ANC Whitecourt Warehouse
                                                    });*/

                            shipmentRecObj.setSublistValue({
                                sublistId : "item",
                                fieldId : "item",
                                line : 0,
                                value : FREIGHTINVOICE.TEMPORARY_ITEM,
                                //NPL79RO : D100cm/40in-W100cm/40in-BNLD
                                //Not Shipped
                            })
                            shipmentRecObj.setSublistValue({
                                sublistId : "item",
                                fieldId : "quantity",
                                line : 0,
                                value : 1
                                //NPL79RO : D100cm/40in-W100cm/40in-BNLD
                                //Not Shipped
                            })
                            // shipmentRecObj.setSublistValue({
                            //         sublistId : "item",
                            //         fieldId : "custcol_anc_relatedlineuniquekey",
                            //         line : 0,
                            //         value : 969350858
                            //         //NPL79RO : D100cm/40in-W100cm/40in-BNLD
                            //         //Not Shipped
                            // })
                            // shipmentRecObj.setSublistValue({
                            //         sublistId : "item",
                            //         fieldId : "custcol_anc_relatedtransaction",
                            //         line : 0,
                            //         value : 61243742
                            //         //Sales Order #SO62862
                            // });

                            shipmentRecObj.setValue({
                                fieldId : "tobeemailed",
                                value: false
                            })

                            prepShipmentRecId = shipmentRecObj.save({
                                ignoreMandatoryFields : true,
                                enableSourcing : true
                            })

                            log.debug("prepShipmentRecId", prepShipmentRecId);

                        }
                        return prepShipmentRecId;
                    }


                    var shipmentRecObj = record.create({
                        type : "customsale_anc_shipment",
                    });
                    shipmentRecObj.setValue({
                        fieldId : "entity",
                        //         value: 106127,
                        // //Lee BHM Corp (Parent) : Arizona Daily Sun
                        // // WM5845	6477-WM5845_DUP_1
                        //         value: 492090,
                        // //Mittera Albertson's
                        //         value: 498581,
                        // //Midland Paper Company (Parent) : Midland PRH All Star Book
                        value: customerId,
                        //Friesens Corporation - MB CAN
                    })

                    shipmentRecObj.setValue({
                        fieldId : "custbody_consignee",
                        //         value: 305730,
                        // // Lee BHM Corp (Parent) : Arizona Daily Sun // Arizona Daily Sun TEST Second Consignee
                        // //AZ US
                        //         value: 300725,
                        // //BC Coast 2000 Terminals Ltd.
                        // // Lulu Island	BC	CAN
                        //         //WM6040
                        //         value: 304127,
                        // // Friesens Corporation - MB CAN
                        value: consigneeId,
                        //Active Warehouse 9	Mittera (Parent) : Mittera Kroger - AB CAN
                    })


                    shipmentRecObj.setValue({
                        fieldId : "custbody_anc_shipment_leg",
                        value: "2"
                    })
                    shipmentRecObj.setValue({
                        fieldId : "custbody4",
                        value: loadID
                    })
                    shipmentRecObj.setValue({
                        fieldId : "custbody_anc_equipment",
                        value: 1 //TRTAMREF53
                    })
                    // shipmentRecObj.setValue({
                    //         fieldId : "location",
                    //         value: 9 //ANS Paper (Summary) : ANC Whitecourt Warehouse
                    // });

                    shipmentRecObj.setSublistValue({
                        sublistId : "item",
                        fieldId : "item",
                        line : 0,
                        value : FREIGHTINVOICE.TEMPORARY_ITEM,
                        //NPL79RO : D100cm/40in-W100cm/40in-BNLD
                        //Not Shipped
                    })
                    shipmentRecObj.setSublistValue({
                        sublistId : "item",
                        fieldId : "quantity",
                        line : 0,
                        value : 1
                        //NPL79RO : D100cm/40in-W100cm/40in-BNLD
                        //Not Shipped
                    })
                    // shipmentRecObj.setSublistValue({
                    //         sublistId : "item",
                    //         fieldId : "custcol_anc_relatedlineuniquekey",
                    //         line : 0,
                    //         value : 969350858
                    //         //NPL79RO : D100cm/40in-W100cm/40in-BNLD
                    //         //Not Shipped
                    // })
                    // shipmentRecObj.setSublistValue({
                    //         sublistId : "item",
                    //         fieldId : "custcol_anc_relatedtransaction",
                    //         line : 0,
                    //         value : 61243742
                    //         //Sales Order #SO62862
                    // });

                    shipmentRecObj.setValue({
                        fieldId : "tobeemailed",
                        value: false
                    })

                    prepShipmentRecId = shipmentRecObj.save({
                        ignoreMandatoryFields : true,
                        enableSourcing : true
                    })

                    log.debug("prepShipmentRecId", prepShipmentRecId);
                }
            }
            catch(e)
            {
                log.error("ERROR in function prepLoad", e)
            }
            return prepShipmentRecId;
        }

        function searchCustomer_id(otherDetails)
        {
            var customerId = otherDetails.customerId || FREIGHTINVOICE.DEFAULTCUSTOMER[runtime.accountId]
            var consigneeId = otherDetails.consigneeId || FREIGHTINVOICE.DEFAULTCONSIGNEE[runtime.accountId]
            try
            {
                if(otherDetails.customerId)
                {
                    var customerSearchObj = search.create({
                        type: "customer",
                        filters:
                            [
                                ["externalidstring","contains",`WM${otherDetails.customerId}`]
                            ],
                        columns:
                            [
                                search.createColumn({name: "entityid", label: "Name"}),
                                search.createColumn({name: "internalid", label: "Internal ID"}),
                                search.createColumn({name: "externalid", label: "External ID"})
                            ]
                    });
                    var searchResultCount = customerSearchObj.runPaged().count;
                    log.debug("customerSearchObj result count",searchResultCount);
                    customerId = FREIGHTINVOICE.DEFAULTCUSTOMER[runtime.accountId];
                    customerSearchObj.run().each(function(result){
                        // .run().each has a limit of 4,000 results
                        customerId = result.id;
                        return false;
                    });

                }
            }
            catch(e)
            {
                log.error("ERROR in function searchCustomer_id", e)
            }

            return customerId;
        }
        function searchConsignee_id(otherDetails)
        {
            var customerId = otherDetails.customerId || FREIGHTINVOICE.DEFAULTCUSTOMER[runtime.accountId]
            var consigneeId = otherDetails.consigneeId || FREIGHTINVOICE.DEFAULTCONSIGNEE[runtime.accountId]
            try
            {
                if(otherDetails.consigneeId && otherDetails.customerId)
                {
                    var customrecord_alberta_ns_consignee_recordSearchObj = search.create({
                        type: "customrecord_alberta_ns_consignee_record",
                        filters:
                            [
                                ["externalidstring","is",`${otherDetails.consigneeId}-WM${otherDetails.customerId}`]
                            ],
                        columns:
                            [
                                search.createColumn({name: "name", label: "Name"}),
                            ]
                    });
                    var searchResultCount = customrecord_alberta_ns_consignee_recordSearchObj.runPaged().count;
                    log.debug("customrecord_alberta_ns_consignee_recordSearchObj result count",searchResultCount);
                    consigneeId = FREIGHTINVOICE.DEFAULTCONSIGNEE[runtime.accountId];
                    customrecord_alberta_ns_consignee_recordSearchObj.run().each(function(result){
                        // .run().each has a limit of 4,000 results
                        consigneeId = result.id;
                        return false;
                    });
                }
            }
            catch(e)
            {
                log.error("ERROR in function searchConsignee_id", e)
            }
            return consigneeId;
        }


        const CA_TAXCODE_MAPPING_BY_STATE_CODE = {
            AB : 11,
            BC : 92,
            MB : 38,
            NB : 42,
            NL : 45,
            NONTAXABLE : 82,
            NS : 63,
            NT : 69,
            NU : 51,
            ON : 54,
            NONTAXABLE : 82,
            PEI : 60,
            QC : 57,
            SK : 20,
            YT : 66,
            // NU : 51,
            // ON : 54,
            // NT : 69,
            // NU : 51,
            // ON : 54,
        }

        function querySoPastLdc(obj)
        {




            var querySoPastLdc_queryFilters = ``;
            if(obj.traninternalids)
            {
                querySoPastLdc_queryFilters = `
                    WHERE
                    t.ID IN (${obj.traninternalids})
                    AND tl.quantity IS NOT NULL
                    AND NVL(tl.taxline, 'F') = 'F'
                `
            }
            else
            {
                querySoPastLdc_queryFilters = `
                    WHERE
                    tl.quantity IS NOT NULL
                    AND NVL(tl.taxline, 'F') = 'F'
                    AND tl.custcol_anc_ldcdate  IS NOT NULL 
                    AND NVL(t.custbody_anc_syncjob_release, 'F') = 'F'
                    AND (CASE WHEN TRUNC(CURRENT_DATE) - TRUNC(tl.custcol_anc_ldcdate) ${obj.dayspassedoper} ${obj.dayspassed} THEN 1 ELSE 0 END) = 1
                `
            }

            if(!querySoPastLdc_queryFilters) //never proceed with no filters, it will pick up wrong set and make the system busy
            {
                return;
            }


            var sql = `
                SELECT
                    BUILTIN_RESULT.TYPE_INTEGER(t.ID) AS tranInternalid,
                    BUILTIN_RESULT.TYPE_STRING(t.otherrefnum) AS otherrefnum,
                    BUILTIN_RESULT.TYPE_INTEGER(t.entity) AS entity,
                    BUILTIN_RESULT.TYPE_STRING(e.entitytitle) AS ent_entitytitle,
                    BUILTIN_RESULT.TYPE_STRING(tb.addressee) AS addressee,
                    BUILTIN_RESULT.TYPE_STRING(tb.addr1) AS addr1,
                    BUILTIN_RESULT.TYPE_STRING(tb.city) AS city,
                    BUILTIN_RESULT.TYPE_INTEGER(tl.custcol_anc_equipment) AS custcol_anc_equipment,
                    BUILTIN_RESULT.TYPE_INTEGER(t.custbody_anc_vehicleno) AS custbody_anc_vehicleno,
                    BUILTIN_RESULT.TYPE_INTEGER(t.custbody_anc_transportmode) AS custbody_anc_transportmode,
                    BUILTIN_RESULT.TYPE_INTEGER(tl.units) AS units,
                    BUILTIN_RESULT.TYPE_INTEGER(t.custbody_anc_certification) AS custbody_anc_certification,
                    BUILTIN_RESULT.TYPE_BOOLEAN(tl.custcol_anc_shipall) AS custcol_anc_shipall,
                    BUILTIN_RESULT.TYPE_STRING(tb.state) AS state,
                    BUILTIN_RESULT.TYPE_STRING(t.tranid) AS custcol_anc_millordernum,
                    BUILTIN_RESULT.TYPE_STRING(t.custbody4) AS custbody4,
                    BUILTIN_RESULT.TYPE_STRING(t.custbody_wm_millordernumber) AS custbody_wm_millordernumber,
                    BUILTIN_RESULT.TYPE_STRING(tb.zip) AS zip,
                    BUILTIN_RESULT.TYPE_STRING(tb.country) AS country,
                    BUILTIN_RESULT.TYPE_STRING(e.externalid) AS ent_externalid,
                    BUILTIN_RESULT.TYPE_STRING(t.transactionnumber) AS transactionnumber,
                    BUILTIN_RESULT.TYPE_STRING(t.tranid) AS tranid,
                    BUILTIN_RESULT.TYPE_STRING(e.CATEGORY) AS ent_CATEGORY,
                    BUILTIN_RESULT.TYPE_STRING(e.fullname) AS ent_fullname,
                    BUILTIN_RESULT.TYPE_STRING(e.email) AS ent_email,
                    BUILTIN_RESULT.TYPE_INTEGER(tl.custcol_anc_consigneealtaddress) AS custcol_anc_consigneealtaddress,
                    BUILTIN_RESULT.TYPE_INTEGER(tl.linesequencenumber) AS linesequencenumber,
                    BUILTIN_RESULT.TYPE_INTEGER(i.LOCATION) AS LOCATION,
                    BUILTIN_RESULT.TYPE_STRING(loc.addressee) AS loc_addressee,
                    BUILTIN_RESULT.TYPE_STRING(loc.addr1) AS loc_addr1,
                    BUILTIN_RESULT.TYPE_STRING(loc.city) AS loc_city,
                    BUILTIN_RESULT.TYPE_STRING(loc.state) AS loc_state,
                    BUILTIN_RESULT.TYPE_STRING(loc.zip) AS loc_zip,
                    BUILTIN_RESULT.TYPE_STRING(loc.country) AS loc_country,
                    BUILTIN_RESULT.TYPE_INTEGER(tl.item) AS item,
                    BUILTIN_RESULT.TYPE_STRING(i.fullname) AS item_fullname,
                    BUILTIN_RESULT.TYPE_STRING(BUILTIN.DF(i.custitem_anc_rollcore)) AS custitem_anc_rollcore,
                    BUILTIN_RESULT.TYPE_STRING(BUILTIN.DF(i.custitem_anc_rolldiameter)) AS custitem_anc_rolldiameter,
                    BUILTIN_RESULT.TYPE_STRING(BUILTIN.DF(i.custitem_anc_rollwidth)) AS custitem_anc_rollwidth,
                    BUILTIN_RESULT.TYPE_FLOAT(tl.quantitybackordered) AS quantitybackordered,
                    BUILTIN_RESULT.TYPE_FLOAT(tl.quantity) AS quantity,
                    BUILTIN_RESULT.TYPE_FLOAT(tl.uniquekey) AS lineuniquekey,
                    (CASE WHEN TRUNC(CURRENT_DATE) - TRUNC(tl.custcol_anc_ldcdate) ${obj.dayspassedoper} ${obj.dayspassed} THEN 1 ELSE 1 END) AS ldcdayspast

                FROM
                    TRANSACTION t
                        INNER JOIN transactionLine tl
                                   ON t.ID = tl.TRANSACTION
                        LEFT JOIN transactionBillingAddress tb
                                  ON t.billingaddress = tb.nkey
                        LEFT JOIN (
                        SELECT
                            en.ID AS ID,
                            en.entitytitle AS entitytitle,
                            en.externalid AS externalid,
                            c.CATEGORY AS CATEGORY,
                            c.fullname AS fullname,
                            c.email AS email
                        FROM entity en
                                 LEFT JOIN Contact c
                                           ON en.contact = c.ID
                    ) e
                                  ON t.entity = e.ID
                        LEFT JOIN item i
                                  ON tl.item = i.ID
                        LEFT JOIN (
                        SELECT
                            l.ID AS id_join,
                            la.addressee,
                            la.addr1,
                            la.city,
                            la.state,
                            la.zip,
                            la.country
                        FROM LOCATION l
                                 LEFT JOIN LocationMainAddress la
                                           ON l.mainaddress = la.nkey
                    ) loc
                                  ON tl.LOCATION = loc.id_join
                    ${querySoPastLdc_queryFilters}
            `

            //TODO review if this code is needed, it doesnt seem to be called. obj seems to be an object not an array.
            log.debug("querySoPastLdc obj", obj)
            log.debug("querySoPastLdc sql1", sql.substring(0,2100))
            log.debug("querySoPastLdc sql2", sql.substring(2100,9999))
            log.debug("querySoPastLdc querySoPastLdc_queryFilters", querySoPastLdc_queryFilters)

            // if(obj && obj.traninternalids && obj.traninternalids.length > 0)
            // {
            //     sql += buildTranIdFilter(obj).filterStr;
            // }

            // sql+= `
            // AND (("TRANSACTION"."ID" = 61250543 AND transactionLine.quantity IS NOT NULL))`

            log.debug("querySoPastLdc querySoPastLdc sql", sql)
            const sqlResults = query.runSuiteQL({ query: sql }).asMappedResults();

            log.debug("querySoPastLdc sqlResults", sqlResults);
            return sqlResults
        }

        //TODO deprecate or discontinue, delete completely if needed.
        var syncLinesPastLdcUrl = "https://loadfitting.anchub.ca/loadfitting/generateshipments"

        function syncLinesPastLdc(obj)
        {
            var syncLinesPastLdc_result = obj || {};

            log.debug("obj", obj);

            var rawResp = callPastLdcUrl(obj)


            syncLinesPastLdc_result.by_tranInternalid = [];
            syncLinesPastLdc_result.responseList = [];

            syncLinesPastLdc_result.responseList.push(rawResp);

            log.debug("syncLinesPastLdc_result", syncLinesPastLdc_result)

            return syncLinesPastLdc_result;
        }


        function updateLinesPastLdc(recObj, obj)
        {
            var updateLinesPastLdc = {};

            var orderedByLineId = obj.sort(function(a, b){
                return (a.transactionlinenum || 0) - (b.transactionlinenum)
            });

            // var lineCount = recObj.getLineCount({
            //     sublistId : "item"
            // });
            // for(var a = 0 ; a < lineCount; a++)
            // {
            //
            // }
            for(var a = 0 ; a < orderedByLineId.length ; a++)
            {
                recObj.setSublistValue({
                    sublistId : "item",
                    fieldId : references.SO_COLUMNS.LINESTATUS.id,
                    line : orderedByLineId[a].transactionlinenum - 1,
                    value : references.SO_COLUMNS.LINESTATUS.options.REQUIRED.VAL || 3
                })
            }

            updateLinesPastLdc.orderedByLineId = orderedByLineId;
            log.debug("updateLinesPastLdc", updateLinesPastLdc)
            return updateLinesPastLdc;
        }

        function prepareOrderPayload(objByInternalid)
        {
            var singleOrderPayload = {};




            for(var internalid in objByInternalid)
            {
                var detail = objByInternalid[internalid];
                if(detail && detail.length > 0)
                {

                    log.debug("prepareOrderPayload detail", detail);
                    singleOrderPayload =
                        {
                            // ===========================
                            // Order Header
                            // ===========================
                            "OrderHeader": {
                                "millOrderNumber":     detail[0].custcol_anc_millordernum || "",   // Mill / ERP master order
                                "purchaseOrderNumber": detail[0].otherrefnum || "",  // Customer’s PO reference
                                "orderStatus":         "New",      // New | Amended | Cancelled | Completed
                                "version":             1,          // Document version (1 = first issue) //TODO

                                /* ---------- Buyer Party ---------- */
                                "buyerParty": {
                                    //TODO list of possible ways to find the buyer
                                    "partyIdentifiers": [
                                        { "partyIdentifierType": "Internal", "value": detail[0].ent_entitytitle },
                                        { "partyIdentifierType": "GLN",      "value": detail[0].ent_externalid } //TODO
                                    ],
                                    "nameAddress": {
                                        "name1":      detail[0].addr1,
                                        "address1":   detail[0].addr1,
                                        "city":       detail[0].city,
                                        "region":     detail[0].state,
                                        "postalCode": detail[0].zip,
                                        "country":    detail[0].country

                                    },
                                    //TODO list array
                                    "contacts": [
                                        {
                                            "contactType": detail[0].ent_category,
                                            "contactName": detail[0].ent_fullname,
                                            "email":       detail[0].ent_email
                                        }
                                    ],
                                    //TODO list array
                                    "notes": [
                                        { "noteType": "Shipping", "note": "Credit check before shipping" }
                                    ]
                                },

                                "isInternal":       false,     // true = internal transfer (no invoice)
                                "orderPurpose":     "Customer",// Customer | Customer Cull | Stock | Stock Cull
                                //TODO list array
                                "orderHeaderNotes": [
                                    { "noteType": "Planner", "note": "Urgent order – please expedite delivery." }
                                ]
                            },

                            // ===========================
                            // Order Line Items
                            // ===========================

                        }
                }

                //safe to be inside the loop
                singleOrderPayload["lineItems"] = [];
                singleOrderPayload = buildLineItems(singleOrderPayload, detail);
            }















            // for(var internalid in objByInternalid)
            // {
            //     singleOrderPayload.OrderHeader = {
            //         millOrderNumber : "",
            //         purchaseOrderNumber: "",
            //         orderStatus : "NEW",
            //         version : 1,
            //         buyerParty : {
            //             partyIdentifiers
            //         }
            //     }
            //
            //     // singleOrderPayload.OrderHeader.buyerParty
            //
            //     ;
            // }

            log.debug("singleOrderPayload", singleOrderPayload)
            return singleOrderPayload;
        }

        function buildLineItems(singleOrderPayload, detail)
        {
            for(var a = 0 ; a < detail.length ; a++)
            {
                var arrayElem =
                    // [
                    {
                        "millOrderLineItemNumber":      detail[a].custcol_anc_millordernum,
                        "purchaseOrderLineItemNumber":  detail[a].linesequencenumber,
                        "lineItemStatusType":          "New //TODO",

                        "product": {
                            "sku":          detail[a].item_fullname,
                            "grade":        detail[a].item_grade,
                            "rollWidth":    { "value": detail[a].custitem_anc_rollwidth, "uom": "mm //TODO" },
                            "rollDiameter": { "value": detail[a].custitem_anc_rolldiameter, "uom": "mm //TODO" },
                            "core":         detail[a].custitem_anc_rollcore,
                            "wrapType":     detail[a].item_rollwraptype,
                            "rollPerPack":  detail[a].item_rollperpack
                        },

                        "labelMark": "WALGREENS //TODO",
                        "quantity":  { "value": detail[a].custcol_anc_orderweight || detail[a].quantity, "uom": "MetricTon //TODO" },

                        "orderItemNotes": [
                            { "noteType": "//TODO Packaging", "note": "//TODO Deliver in moisture-resistant packaging." }
                        ],

                        /* ---------- mill shipment plan ---------- */
                        "shipmentSchedule": [
                            {
                                "shipmentRequestedDate": detail[a].custcol_anc_shipdate ,
                                "quantity":             { "value": "50 //TODO", "uom": "MetricTon //TODO" },
                                "shipmentNotes": [
                                    { "noteType": "General //TODO", "note": "First half of order //TODO" }
                                ]
                            },
                            {
                                "shipmentRequestedDate": "2025-07-15 //TODO",
                                "quantity":             { "value": "50 //TODO", "uom": "MetricTon //TODO" },
                                "shipmentNotes": [
                                    { "noteType": "General //TODO", "note": "Second half of order //TODO" }
                                ]
                            }
                        ]
                    }

                // /* ---------- second line ---------- */
                // {
                //         "millOrderLineItemNumber":      2,
                //         "purchaseOrderLineItemNumber":  2,
                //         "lineItemStatusType":          "New",
                //
                //         "product": {
                //                 "sku":          "NPB66HT-1000-0800-NSTA-BB-RPP2",
                //                 "grade":        "NPB66HT",
                //                 "rollWidth":    { "value": 1000, "uom": "mm" },
                //                 "rollDiameter": { "value": 800,  "uom": "mm" },
                //                 "core":         "NSTA",
                //                 "wrapType":     "BB",
                //                 "rollPerPack":  2
                //         },
                //
                //         "labelMark": "LIBERTY TIMES",
                //         "quantity":  { "value": 6, "uom": "Roll" },
                //
                //         "orderItemNotes": [
                //                 { "noteType": "Handling", "note": "Pack rolls securely to prevent damage." }
                //         ],
                //
                //         "shipmentSchedule": [
                //                 {
                //                         "shipmentRequestedDate": "2025-07-15",
                //                         "quantity":             { "value": 6, "uom": "Roll" },
                //                         "shipmentNotes": [
                //                                 { "noteType": "General", "note": "Single shipment for this item" }
                //                         ]
                //                 }
                //         ]
                // }
                // ]

                singleOrderPayload["lineItems"].push(arrayElem);
            }


            return singleOrderPayload;
        }


        function callPastLdcUrl(requestData)
        {
            var callPastLdcUrl_response = "";

            requestData = JSON.stringify(requestData);

            /*Endpoint base & docs

                Base URL: https://netsuitetest.anchub.ca



                Swagger UI: https://netsuitetest.anchub.ca/swagger/index.html

                Full request / response models are visible in the UI.



                Authorization

                Add the following header to every request:

                Authorization: Bearer iryj8ibMLTLKOZa1HtOcSixzkmNjt16OPKhLNiIUDno



                What’s new in v2

                Area       Change

                Master-data       Four dedicated endpoints

                POST /netsuite/customerupdate

                POST /netsuite/consigneeupdate

                POST /netsuite/carrierupdate

                POST /netsuite/shipperupdate

                Transactions       POST /netsuite/orderupdate (unchanged)

                POST /netsuite/loadupdate (new)

                Removed             Legacy /netsuite/partyupdate has been retired.

                Swagger               Every route now shows a summary, description, sample payload, and response codes via Swashbuckle annotations.

                Validation            DTOs include DataAnnotation rules (e.g., [Required], [EmailAddress]). Invalid requests return HTTP 400 with details.*/

            var rawResp = https.post({
                url: "https://netsuitetest.anchub.ca/netsuite/orderupdate",
                body: requestData,
                headers: {
                    "Authorization": loadFittingBearerToken,
                    "Content-Type": "application/json",
                    "accept": "*/*"
                }
            });
            log.debug("rawResp", rawResp);

            // email.send({
            //     author: 108542,
            //     recipients: 108542,
            //     subject : "SO PAYLOAD FOR VLAD " + new Date(),
            //     body : "" + requestData
            // })

            log.debug("callPastLdcUrl callPastLdcUrl_response", callPastLdcUrl_response);

            callPastLdcUrl_response.rawResp = rawResp;
            return callPastLdcUrl_response;
        }

        function buildTranIdFilter(obj)
        {
            var functionOutput = {};
            var filterStr = "";
            try
            {

                var filterList = [];
                if(obj.traninternalids)
                {
                    filterList.push("AND");
                    filterStr += "AND "
                    filterStr += " " + obj.filterbyfield;
                    filterStr += " " + obj.sqlOperator;
                    filterStr += " " + as_IN_SQL_FILTER(obj.traninternalids).listStringCsv
                }
            }
            catch(e)
            {
                log.error("ERROR in function buildTranIdFilter", e)
            }

            functionOutput.filterStr = filterStr;
            functionOutput.filterList = filterList;
            log.debug("buildTranIdFilter functionOutput.filterStr", functionOutput.filterStr)
            return functionOutput
        }

        function as_IN_SQL_FILTER(list)
        {
            var functionOutput = {};
            try
            {
                if(list && list.length > 0)
                {
                    var listStringList = list.map(function(elem){

                        return `${elem}`
                    });
                    log.error("listStringList", listStringList)
                    functionOutput.listStringCsv = `(${listStringList.join(",")})`

                    log.debug("functionOutput.listStringCsv", functionOutput.listStringCsv)
                }
            }
            catch(e)
            {
                log.error("ERROR in function as_IN_SQL_FILTER", e)
            }

            log.debug("as_IN_SQL_FILTER functionOutput", functionOutput)
            return functionOutput;
        }

        function soPastLdc(obj)
        {
            var functionOutput = {};
            try
            {
                if(obj.recObj)
                {
                    var linesDetails = getLinesDetails(obj);
                }
            }
            catch(e)
            {
                log.error("ERROR in function soPastLdc", e)
            }

            return functionOutput;
        }

        function getLinesDetails(obj)
        {
            var functionOutput = {};
            try
            {
                var lineCount = obj.recObj.getLineCount({
                    sublistId : "item"
                })

                for(var a = 0 ; a < lineCount ; a++)
                {
                    var line_
                    var lineDetail = getLineDetails()
                }
            }
            catch(e)
            {
                log.error("ERROR in function getLinesDetails", e)
            }

            return functionOutput;
        }

        function getLineDetails(obj)
        {
            var functionOutput = {};
            try
            {

            }
            catch(e)
            {
                log.error("ERROR in function getLineDetils", e)
            }

            return functionOutput;
        }

        function getShipmentLocs()
        {
            var sqlResults = [];
            try
            {
                var sql = `
                    SELECT
                        BUILTIN_RESULT.TYPE_STRING(LOCATION.name) AS name,
                        BUILTIN_RESULT.TYPE_INTEGER(LOCATION.ID) AS ID,
                        BUILTIN_RESULT.TYPE_STRING(LocationMainAddress.city) AS city,
                        BUILTIN_RESULT.TYPE_STRING(LOCATION.fullname) AS fullname
                    FROM
                        LOCATION,
                        LocationMainAddress
                    WHERE
                        LOCATION.mainaddress = LocationMainAddress.nkey(+)
                      AND ((LocationMainAddress.city IS NOT NULL AND NVL(LOCATION.isinactive, 'F') = 'F' AND LOCATION.makeinventoryavailable = 'T'))
                `

                log.debug("getShipmentLocs sql", sql)

                sqlResults = query.runSuiteQL({ query: sql }).asMappedResults();

                log.debug("getShipmentLocs sqlResults", sqlResults);
            }
            catch(e)
            {
                log.error("ERROR in function getShipmentLocs", e);
            }

            return sqlResults;
        }

        function getRelatedProdCap(recId, targetDates)
        {
            var sqlResults = [];
            var filterArray = [];
            var filterText = "";
            try
            {
                filterArray = prodCapDatesAsFilterArray(targetDates);
                log.debug("getRelatedProdCap filterArray", filterArray);
                filterText = prodCapDatesAsFilterText(filterArray);
                var sql = `
                    SELECT
                        BUILTIN_RESULT.TYPE_STRING(CUSTOMRECORD_ANC_PRODUCTION_CAPACITY.name) AS name,
                        (CUSTOMRECORD_ANC_PRODUCTION_CAPACITY.id) pc_id,
                        (CUSTOMRECORD_ANC_PRODUCTION_CAPACITY.custrecord_prodfcw_daterangestart) AS weekstartdate,
                        (CUSTOMRECORD_ANC_PRODUCTION_CAPACITY.custrecord_prodfcw_daterangeend) AS weekenddate,
                        (CUSTOMRECORD_ANC_PRODUCTION_CAPACITY.custrecord_prodfcw_capacity) AS weekcapacity,
                        (CUSTOMRECORD_ANC_PRODUCTION_CAPACITY.custrecord_prodfcw_weeknumber) AS weeknumber
                    FROM
                        CUSTOMRECORD_ANC_PRODUCTION_CAPACITY
                    WHERE
                        (
                            ${filterText}
                            )
                `

                log.debug("getRelatedProdCap sql", sql)

                sqlResults = query.runSuiteQL({ query: sql }).asMappedResults();

                log.debug("getRelatedProdCap sqlResults", sqlResults);
            }
            catch(e)
            {
                log.error("ERROR in function getRelatedProdCap", e);
            }

            return sqlResults;
        }

        function getRelatedShipments(recId, lineuniquekeys)
        {
            var sqlResults = [];
            var filterArray = [];
            var filterText = "";
            try
            {
                filterArray = lineuniquekeysAsFilterArray(lineuniquekeys);
                log.debug("getRelatedShipments filterArray", filterArray);
                filterText = lineuniquekeysAsFilterText(filterArray);
                log.debug("getRelatedShipments filterText", filterText);
                var sql = `
                    SELECT
                        BUILTIN_RESULT.TYPE_INTEGER(TRANSACTION.ID) AS ID,
                        BUILTIN_RESULT.TYPE_STRING(transactionLine.custcol_anc_relatedlineuniquekey) AS custcol_anc_relatedlineuniquekey,
                        BUILTIN_RESULT.TYPE_INTEGER(TRANSACTION.custbody_anc_shipstatus) AS custbody_anc_shipstatus,
                        BUILTIN_RESULT.TYPE_PERCENT(TRANSACTION.custbody_anc_loadingefficiency) AS custbody_anc_loadingefficiency,
                        BUILTIN_RESULT.TYPE_INTEGER(transactionLine.custcol_anc_relatedtransaction) AS custcol_anc_relatedtransaction,
                        TRANSACTION.custbody_anc_shipdate AS custbody_anc_shipdate
                    FROM
                        TRANSACTION,
                        transactionLine
                    WHERE
                        TRANSACTION.ID = transactionLine.TRANSACTION
                      AND (TRANSACTION.TYPE IN ('${references.RECTYPES.shipment.id}') ) AND
                        (
                            ${filterText}
                            )
                `

                log.debug("getRelatedShipments sql", sql)

                sqlResults = query.runSuiteQL({ query: sql }).asMappedResults();

                log.debug("getRelatedShipments sqlResults", sqlResults);
            }
            catch(e)
            {
                log.error("ERROR in function getRelatedShipments", e);
            }
            sqlResultsObj = {list:sqlResults};
            sqlResultsObj.byLineUniqueKey = groupBy(sqlResults, "custcol_anc_relatedlineuniquekey")
            sqlResultsObj.byShipDate = groupBy(sqlResults, "custbody_anc_shipdate")

            log.debug("getRelatedShipments returnvalue sqlResultsObj", sqlResultsObj);
            return sqlResultsObj;
        }

        function prodCapDatesAsFilterArray(targetDates)
        {
            var filterArray = [];
            for(var a = 0 ; a < targetDates.length ; a++)
            {
                //'2025-06-01'
                filterArray.push(`(DATE '${targetDates[a].productiondate}' BETWEEN CUSTOMRECORD_ANC_PRODUCTION_CAPACITY.custrecord_prodfcw_daterangestart AND CUSTOMRECORD_ANC_PRODUCTION_CAPACITY.custrecord_prodfcw_daterangeend)`)
            }

            return filterArray;
        }
        function prodCapDatesAsFilterText(filterArray)
        {
            var filterText = "";
            filterText = filterArray.join(" OR ")
            return filterText;
        }

        function lineuniquekeysAsFilterArray(targetDates)
        {
            var filterArray = [];
            for(var a = 0 ; a < targetDates.length ; a++)
            {
                filterArray.push(`(transactionLine.custcol_anc_relatedlineuniquekey = ${targetDates[a].lineuniquekey})`)
            }

            return filterArray;
        }
        function lineuniquekeysAsFilterText(filterArray)
        {
            var filterText = "";
            filterText = filterArray.join(" OR ")
            return filterText;
        }

        function addLeadingZeroToMonths(monthText)
        {
            if(typeof monthText == "number")
            {
                if(monthText < 10)
                {
                    return "0" + monthText;
                }
                else
                {
                    return monthText
                }
            }
            else
            {
                if(Number(monthText) < 10)
                {
                    return "0" + monthText;
                }
                else
                {
                    return monthText
                }
            }

        }



        const toMDY = (dateVal) => {
            var retVal = dateVal;
            try
            {
                if(dateVal)
                {
                    retVal = new Date(retVal);
                }

            }
            catch(e)
            {
                // console.log("ERROR in function toMDY", e)
            }
            // console.log("retVal", retVal)
            return retVal;
        }

        function getEquipmentList(equipIds)
        {
            var sqlResults = [];
            try {
                // var sqlFilters = getForecastFilters(tranInternalid, lineValList);
                // var sqlFilters_text = forecastFilters.join(" OR ")
                //
                // log.debug("getRelatedForecasts sqlFilters_text", sqlFilters_text)

                var sql =
                    `Select
                         eq.id as eq_internalid,
                         eq.custrecord_anc_equipmentweightcap as eq_weightcap,
                         eq.custrecord_anc_transportmode as eq_transportmode
                     FROM
                         customrecord_anc_equipment as eq`


                log.debug("getEquipmentList sql", sql)

                sqlResults = query.runSuiteQL({ query: sql }).asMappedResults();

                log.debug("getEquipmentList sqlResults", sqlResults);
            }
            catch(e)
            {
                log.error("ERROR in function getEquipmentList", e)
            }

            log.debug("getEquipmentList sqlResults return", sqlResults)
            return sqlResults;
        }

        //equipmentList, { line_equipment: equipment }, totalWeight
        function computeLoadUtilization(equipmentList, resObjByColumnKey, totalLoadWeight)
        {
            log.debug("computeLoadUtilization params", {totalLoadWeight, equipmentList, resObjByColumnKey});
            var computeLoadUtilization_result = {};
            var transportationMaxWeight = 0;
            var equipmentList_filtered = equipmentList.filter(function(elem){
                if(elem.eq_internalid == resObjByColumnKey.line_equipment)
                {
                    return true;
                }
                else
                {
                    return false;
                }
            })
            if(equipmentList_filtered.length > 0)
            {
                transportationMaxWeight = equipmentList_filtered[0].eq_weightcap || 0
            }

            var shipmentUtilRate = 0;


            if(transportationMaxWeight)
            {
                shipmentUtilRate = (100 * (totalLoadWeight/transportationMaxWeight));
            }

            log.debug("computeLoadUtilization stats", {shipmentUtilRate, totalLoadWeight, transportationMaxWeight, equipmentList_filtered})
            log.debug("shipmentUtilRate", shipmentUtilRate);

            computeLoadUtilization_result.shipmentUtilRate = shipmentUtilRate;
            return computeLoadUtilization_result;
        }

        function computeLoadUtilizationStatus(utilization)
        {
            /*
                    Ship Status
                    customlist_anc_shipstatus
                    custbody_anc_shipstatus
                    https://1116623-sb2.app.netsuite.com/app/common/custom/custlist.nl?id=1396&e=T&ord=T
                    MAPPING:
                    1	Planned
                    7	Planning Exception
                    2	Awaiting Stock
                    3	Ready to Ship
                    4	Loaded
                    5	Shipped
                    6	Delivered
                    */

            var computeLoadUtilizationStatus_result = {};
            var shipmentUtilStatus = null;

            try {

                if(!utilization || Number(utilization.shipmentUtilRate) >= 90)
                {
                    shipmentUtilStatus = 1;
                }
                else
                {
                    shipmentUtilStatus = 7;
                }

            }
            catch(e)
            {
                log.error("ERROR in function computeLoadUtilizationStatus", e)
            }

            computeLoadUtilizationStatus_result.shipmentUtilStatus = shipmentUtilStatus;
            return computeLoadUtilizationStatus_result;
        }


        var fitmentJobScript = {
            scriptId : "customscript_anc_mr_fitment_blanked",
            deploymentId : "customdeploy_anc_mr_fitment_blanked"
        }

        function findConsigneeFromLocation(locationId)
        {

            log.debug("locationId", locationId);
            var output = {};
            try
            {
                var consigneeMasterId = "";
                var customerConsigneeId = "";
                var searchObj = search.create({
                    type : "customrecord_anc_consigneemaster",
                    filters : [
                        ["custrecord_anc_conmaster_location", "anyof", locationId]
                    ],
                    columns : [
                        search.createColumn({
                            name : "internalid"
                        })
                    ]
                });

                searchObj.run().each(function(res){
                    consigneeMasterId = res.id;
                    return false;
                })

                var searchObj = search.create({
                    type : "customrecord_alberta_ns_consignee_record",
                    filters : [
                        ["custrecord_anc_custcons_consignee", "anyof", consigneeMasterId]
                    ],
                    columns : [
                        search.createColumn({
                            name : "internalid"
                        })
                    ]
                });

                searchObj.run().each(function(res){
                    customerConsigneeId = res.id;
                    return false;
                })

                output = {consigneeMasterId, customerConsigneeId}
            }
            catch(e)
            {
                log.error("ERROR in function findConsigneeFromLocation", e);
            }

            log.debug("findConsigneeFromLocation {consigneeMasterId, customerConsigneeId}", {consigneeMasterId, customerConsigneeId});
            return output;
        }

        function createTransferOrder({ sourceLocation, destinationLocation, items, memo }) {

            if (!sourceLocation || !destinationLocation || !Array.isArray(items) || items.length === 0) {
                throw new Error('Missing required fields for transfer order creation');
            }

            try {
                var rec = record.create({
                    type: record.Type.TRANSFER_ORDER,
                    isDynamic: true,
                    // defaultValues : {"subsidiary" : 5}
                });

                rec.setValue({ fieldId: 'subsidiary', value: 5 });
                rec.setValue({ fieldId: 'location', value: sourceLocation });
                rec.setValue({ fieldId: 'transferlocation', value: destinationLocation });
                rec.setValue({ fieldId: 'incoterm', value: 1 });
                rec.setValue({ fieldId: 'orderstatus', value: 'B' });
                var newOrderStatus = rec.getValue({ fieldId: 'orderstatus', value: 'B' }); //FIXME 09152025 THIS DOES NOT WORK but submitfield might
                log.debug("successfully changed orderstatus to B", newOrderStatus);

                var custcons_id = 57714;
                var consmaster_id = 134;
                var consmasterloc_id = 239;


                var custCons_consMaster_obj = findConsigneeFromLocation(destinationLocation);
                var custcons_id = custCons_consMaster_obj.customerConsigneeId
                var consmaster_id = custCons_consMaster_obj.consigneeMasterId



                //TODO lookup the consignee, it will be based on the TO LOCATION--->CONSIGNEEMASTER--->CUSTOMERCONSIGNEE<---TO.TO_LINE.SO.CONSIGNEE


                rec.setValue({ fieldId: 'custbody_ns_consignee', value: custcons_id });

                if (memo) {
                    rec.setValue({ fieldId: 'memo', value: memo });
                }

                var itemIndexMap = [];
                log.debug("createTransferOrder items", items)

                for (const item of items) {

                    log.debug("createTransferOrder item 1", item)
                    if (!item.itemId || !item.qty) continue;

                    log.debug("createTransferOrder item 2", item)

                    rec.selectNewLine({ sublistId: 'item' });
                    rec.setCurrentSublistValue({ sublistId: 'item', fieldId: references.SO_COLUMNS.DELIVERYDATE, value: item.line_deliverydate });
                    rec.setCurrentSublistValue({ sublistId: 'item', fieldId: 'item', value: item.itemId });
                    // rec.setCurrentSublistValue({ sublistId: 'item', fieldId: 'item', value: 193394 });
                    rec.setCurrentSublistValue({ sublistId: 'item', fieldId: 'quantity', value: item.qty });


                    rec.setCurrentSublistValue({ sublistId: 'item', fieldId: 'custcol_anc_orderweight', value: item.qty * item.weight });



                    //ADDITIONAL MAPPING discovered as needed on 08242025
                    //leg1 technically no longer to be created from leg2 contrary to instruction wording provided
                    //TO is created from leg2 and so leg1 can be created from TO

                    rec.setCurrentSublistValue({ sublistId: 'item', fieldId: 'custcol_anc_relatedtransaction', value: item.salesOrderId });
                    rec.setCurrentSublistValue({ sublistId: 'item', fieldId: 'custcol_anc_relatedlineuniquekey', value: item.salesOrderLineKey });
                    rec.setCurrentSublistValue({ sublistId: 'item', fieldId: 'custcol_consignee', value: item.consignee || item.custcol_consignee || item.custbody_ns_consignee });


                    rec.setCurrentSublistValue({ sublistId: 'item', fieldId: 'custcol_anc_consigneealtaddresscity', value: item.consigneealtaddresscity });

                    var targetDeliveryDate = format.format({
                        value: item.line_shipdate,
                        type: format.Type.DATE
                    });

                    // var targetDeliveryDate = format.format({
                    //     value: item.line_deliverydate,
                    //     type: format.Type.DATE
                    // });

                    rec.setCurrentSublistText({
                        sublistId: 'item',
                        fieldId: 'custcol_anc_deliverydate',
                        // value: targetDeliveryDate,
                        text : targetDeliveryDate
                    });

                    log.debug("attempt to set custcol_anc_deliverydate as targetDeliveryDate", targetDeliveryDate)

                    // rec.setCurrentSublistValue({ sublistId: 'item', fieldId: 'custcol_anc_shippinglane', value: item.custrecord_anc_lane_cdw }); //dont even need shipping lane, it must resolve it's own
                    // rec.setCurrentSublistValue({ sublistId: 'item', fieldId: 'custcol_anc_shipdate', value: toMDY(item.shipdate) });
                    // rec.setCurrentSublistValue({ sublistId: 'item', fieldId: 'custcol_anc_deliverydate', value: item.line_deliverydate });







                    rec.commitLine({ sublistId: 'item' });


                }

                const transferOrderId = rec.save({ ignoreMandatoryFields: true });
                log.audit('✅ Transfer Order Created', { transferOrderId, sourceLocation, destinationLocation });

                //TODO review why we additionally need a submitfield on status instead of just setting it before creating
                var approvedToInternalId = record.submitFields({
                    type : "transferorder",
                    id : transferOrderId,
                    values : {
                        orderstatus : "B"
                    }
                })
                log.debug("approvedToInternalId", approvedToInternalId);

                var rec = record.load({
                    type : "transferorder",
                    id : transferOrderId
                })
                var toLineCount = rec.getLineCount({
                    sublistId : "item"
                })
                for(var a = 0 ; a < toLineCount ; a++)
                {
                    var lineIndex = a;
                    var itemId = rec.getSublistValue({
                        sublistId : "item",
                        fieldId : "item",
                        line : a
                    })
                    var qty = rec.getSublistValue({
                        sublistId : "item",
                        fieldId : "quantity",
                        line : a
                    })
                    var lineUniqueKey_to = rec.getSublistValue({
                        sublistId : "item",
                        fieldId : "lineuniquekey",
                        line : a
                    })
                    itemIndexMap.push({
                        itemId: itemId,
                        qty: qty,
                        lineIndex: lineIndex,
                        lineUniqueKey_to: lineUniqueKey_to
                    });
                }

                log.debug("itemIndexMap", itemIndexMap);

                return { transferOrderId, itemIndexMap };
            } catch (e) {
                log.error('❌ Failed to create Transfer Order', { error: e });
                throw e;
            }
        }

        function getRelatedForecasts(tranInternalid, lineValList)
        {
            var compositeKeyResults = {};
            try
            {
                var forecastFilters = getForecastFilters(tranInternalid, lineValList);
                var sqlFilters_text = forecastFilters.join(" OR ")

                log.debug("getRelatedForecasts sqlFilters_text", sqlFilters_text)

                var sql =
                    `Select
                         sf.id as sf_id,
                         sf.custrecord_anc_pf_grade as sf_grade,
                         sf.custrecord_anc_pf_allocation as sf_allocation,
                         sf.custrecord_anc_pf_year as sf_year,
                         sf.custrecord_anc_pf_month as sf_month,
                         sf.custrecord_anc_pf_consignee as sf_consignee,
                         sf.custrecord_anc_pf_customer as sf_customer,
                         y.name as y_name,
                         m.name as m_name,

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

                log.debug("sqlResults", sqlResults);

                var keyOrder = ["sf_customer", "sf_consignee", "sf_grade", "sf_month", "sf_year"]
                compositeKeyResults = buildCompositeKeys(keyOrder, sqlResults)
            }
            catch(e)
            {
                log.error("ERROR in fucntion getForecasts", e)
            }

            return compositeKeyResults;
        }

        const get_soLineUniqueKey_filters = (soLineUniquekeys) =>
        {
            var filters = [];
            try
            {
                log.debug("get_soLineUniqueKey_filters soLineUniquekeys.length", soLineUniquekeys.length)
                log.debug("get_soLineUniqueKey_filters soLineUniquekeys", soLineUniquekeys)
                for(var a = 0 ; a < soLineUniquekeys.length ; a++)
                {
                    var lineVal = soLineUniquekeys[a];
                    log.debug("get_soLineUniqueKey_filters lineVals", lineVal)
                    if(lineVal)
                    {
                        var filter = `(transactionLine.custcol_anc_relatedlineuniquekey = ${lineVal})`
                        filters.push(filter)
                    }
                }

                log.debug("get_soLineUniqueKey_filters filters", filters);
            }
            catch(e)
            {
                log.error("ERROR in function get_soLineUniqueKey_filters")
            }

            return filters;
        }

        /**
         * Finds Leg 2 shipments (crossdock → customer) linked to given sales order lines.
         *
         * @param {Array<Object>} soLineData - Array of objects, each having at least `traninternalid` and `lineuniquekey`
         * @returns {Array<Object>} - List of Leg 2 shipments grouped by lineuniquekey
         */
        function findLeg2Shipments(soLineData) {

            var CROSSDOCK_ALLOWANCEDAYS = 1;
            if(!soLineData || soLineData.length == 0)
            {
                log.debug("preterminate findLeg2Shipments, soLineData", soLineData)
                return;
            }
            
            log.debug("findLeg2Shipments soLineData", soLineData)
            const salesOrderLineKeys = soLineData.map(line => ({
                tranId: line.traninternalid,
                lineKey: line.lineuniquekey
            }));

            log.debug("findLeg2Shipments [...new Set(salesOrderLineKeys.map(k => k.tranId))]", [...new Set(salesOrderLineKeys.map(k => k.tranId))]);

            // var soInternalids = [...new Set(salesOrderLineKeys.map(k => k.tranId))]
            var soLineUniquekeys = [...new Set(salesOrderLineKeys.map(k => k.lineKey))]

            var srToObjects = this.groupOrderLinesForShipmentGeneration(null, null, null, salesOrderLineKeys, 1)

            log.debug("findLeg2Shipments srToObjects before standardizeObjectKeysByProcess")

            srToObjects = standardizeObjectKeysByProcess(srToObjects, "prerelease")

            log.debug("findLeg2Shipments srToObjects after standardizeObjectKeysByProcess")

            var results = [];
            srToObjects.forEach(result => {

                log.debug("findLeg2Shipments result", result);
                var delDate = result.deliverydate;
                var shipdate = result.shipdate;
                log.debug("findLeg2Shipments delDate", delDate);

                results.push({
                    shipmentId: (result['internalid']),
                    shipmentTranId: (result['tranid']),
                    location: (result['location']),
                    salesOrderId: (result['relatedtransaction']),
                    salesOrderLineKey: (result['relatedlineuniquekey']),
                    soInternalid : (result['relatedtransaction']),
                    item: (result['actualitem']) || (result['item']),
                    quantity: parseFloat((result['quantity'])) || 0,
                    lineUniqueKey: (result['lineuniquekey']),
                    equipmentText : (result['equipmenttext']),
                    custbody_consignee : (result['consignee']),
                    custcol_consignee : (result['consignee']),
                    //TODO make it root from from SALESORDER leg1
                    equipment : (result['lane_cde']),
                    crossdockCity : (result['lane_crossdockcity']),
                    line_location : (result['lane_cdw']),
                    custcol_anc_shippinglane : (result['lane']),
                    originWarehouse : 9, //TODO hardcoded as WHITECOURT warehouse???
                    crossdockTT : (result['lane_cdtt']),
                    originWarehouseCity : "WHITECOURT",
                    deliverydate : (result['deliverydate']),
                    line_deliverydate : (result['deliverydate']),
                    weight : (result['item_weight'] || result['actualitem_weight']),

                    // shipdate : new Date(shipdate).setDate(new Date(shipdate).getDate() - (result['lane_cdtt'])),
                    // line_shipdate : new Date(shipdate).setDate(new Date(shipdate).getDate() - (result['lane_cdtt'])),
                    shipdate : new Date(shipdate).setDate(new Date(shipdate).getDate() - CROSSDOCK_ALLOWANCEDAYS),
                    line_shipdate : new Date(shipdate).setDate(new Date(shipdate).getDate() - CROSSDOCK_ALLOWANCEDAYS),
                    consigneealtaddresscity : (result['consigneealtaddresscity'])

                    // shipdate : new Date(delDate).setDate(new Date(delDate).getDate() - result.getValue({
                    //     name: "custrecord_anc_lane_cdtt",
                    //     join: "CUSTBODY_ANC_LANE",
                    //     label: "CrossDock Transit Time"
                    // })),
                    // line_shipdate : new Date(delDate).setDate(new Date(delDate).getDate() - result.getValue({
                    //     name: "custrecord_anc_lane_cdtt",
                    //     join: "CUSTBODY_ANC_LANE",
                    //     label: "CrossDock Transit Time"
                    // }))
                });
                return true;
            });

            log.debug("findLeg2Shipments results", results);

            // equipmentText
            // crossdockCity
            // originWarehouseCity
            // shipdate

            // Group by SO line key for easier Leg 1 creation
            const grouped = {};
            for (const r of results) {
                const key = `${r.salesOrderId}_${r.salesOrderLineKey}`;
                if (!grouped[key]) {
                    grouped[key] = {
                        shipmentId: r.shipmentId,
                        shipmentTranId: r.shipmentTranId,
                        originWarehouse: r.originWarehouse, // you’ll need to fill this from the SO line or config
                        crossdock: 239 || r.location,
                        salesOrderId: r.salesOrderId,
                        salesOrderLineKey: r.salesOrderLineKey,
                        items: [],
                        equipmentText : r.equipmentText,
                        originWarehouseCity : r.originWarehouseCity,
                        crossdockCity : r.crossdockCity,
                        shipdate : new Date(r.shipdate || new Date()),
                        line_location : r.line_location,
                        line_equipment : r.equipment,
                        line_shipdate : new Date(r.line_shipdate || new Date()),
                        line_deliverydate : new Date(r.line_deliverydate || new Date()),
                        internalid : r.soInternalid,
                        custrecord_anc_lane_cdw : r.line_location,
                        custcol_anc_shippinglane : r.custcol_anc_shippinglane,
                        //TODO 08232025 additional mappings
                        equipment_leg1 : r.equipment_leg1,
                        custcol_consignee : r.custcol_consignee || r.custbody_consignee,
                        custbody_consignee : r.custbody_consignee
                    };
                }

                grouped[key].items.push({
                    itemId: r.item,
                    qty: r.quantity,
                    shipmentLineKey: r.lineUniqueKey
                });
            }

            return Object.values(grouped);
        }



        /**
         * Updates the Transfer Order to tag its lines with the corresponding shipment line unique keys.
         *
         * @param {Object} options
         * @param {number} options.transferOrderId
         * @param {Array<{ transferOrderLineIndex: number, shipmentLineUniqueKey: string }>} options.lineMap
         */
        function tagTransferOrderLines({ transferOrderId, lineMap }) {

            try {
                log.debug("tagTransferOrderLines { transferOrderId, lineMap }", { transferOrderId, lineMap });
                const toRec = record.load({
                    type: record.Type.TRANSFER_ORDER,
                    id: transferOrderId,
                    isDynamic: false
                });

                for (const entry of lineMap) {
                    log.debug("tagTransferOrderLines entry", entry);
                    const { transferOrderLineIndex, shipmentLineUniqueKey } = entry;

                    if (typeof transferOrderLineIndex !== 'number' || !shipmentLineUniqueKey) continue;

                    toRec.setSublistValue({
                        sublistId: 'item',
                        fieldId: 'custcol_anc_relatedshipments',
                        line: transferOrderLineIndex,
                        value: shipmentLineUniqueKey
                    });
                }

                const updatedId = toRec.save({ ignoreMandatoryFields: true });
                log.audit('🔗 Transfer Order lines updated with shipment references', updatedId);
            } catch (e) {
                log.error('❌ Failed to tag Transfer Order lines', e);
                throw e;
            }
        }

        /**
         * Groups Leg 2 shipment lines for TO creation, minimizing Transfer Orders.
         * Grouping is done ONLY by origin and crossdock location.
         *
         * @param {Array<Object>} leg2ShipmentLines - list of Leg 2 line objects
         * @returns {Array<Object>} - grouped structures for TO creation
         */
        function groupTransferOrderLinesByOriginAndCrossdock(leg2ShipmentLines) {
            const grouped = {};

            for (var line of leg2ShipmentLines) {
                const key = `${line.originWarehouse}_${line.crossdock}`;
                if (!grouped[key]) {
                    grouped[key] = {
                        originWarehouse: line.originWarehouse,
                        crossdock: line.crossdock,
                        items: []
                    };
                }

                for (const item of line.items || []) {

                    log.debug('groupTransferOrderLinesByOriginAndCrossdock {line}', {line})

                    grouped[key].items.push({
                        itemId: item.actualitem || item.itemId,
                        qty: item.qty,
                        shipmentLineKey: item.shipmentLineKey,
                        equipment: line.equipment,
                        shipdate: toMDY(line.shipdate),
                        salesOrderId: line.salesOrderId,
                        salesOrderLineKey: line.salesOrderLineKey,
                        originWarehouse: line.originWarehouse,
                        originWarehouseCity: line.originWarehouseCity,
                        crossdockCity: line.crossdockCity,
                        equipmentText: line.equipmentText,
                        equipment: line.equipment,



                        //TODO do you need to do it here as well???
                        line_location : line.line_location,
                        line_equipment : item.line_equipment,
                        line_shipdate :toMDY(line.line_shipdate),
                        internalid : line.internalid,
                        custrecord_anc_lane_cdw : line.custrecord_anc_lane_cdw,
                        custcol_anc_shippinglane : line.custcol_anc_shippinglane,
                        equipment_leg1 : line.equipment_leg1, //TODO 08232025 additional mappings
                        line_deliverydate : line.line_deliverydate,
                        custcol_consignee : line.custcol_consignee || line.custbody_consignee,
                        line_lane_destinationcity : line.line_lane_destinationcity,

                    });
                }
            }

            log.debug("groupTransferOrderLinesByOriginAndCrossdock result", Object.values(grouped));
            return Object.values(grouped);
        }


        /**
         * Groups Leg 1 shipment lines by shipdate, origin warehouse city, crossdock city, and equipment.
         * Similar to groupOrderLinesForShipmentGeneration but structured for Leg 1 logic.
         *
         * @param {Array<Object>} leg1Lines
         * @returns {Object} - grouped structure like: { [groupKey]: { list: [...], leg: '1' } }
         */
        /**
         * Groups Leg 1 shipment lines by shipdate, origin warehouse, crossdock, and equipment.
         * Input is typically itemsWithIndexes built in MR.reduce (already enriched with TO linkage).
         * Returns an object keyed by a human key; each value has stable ID fields + a list of lines.
         *
         * @param {Array<Object>} leg1Lines
         * @returns {Object} grouped
         */
        /**
         * Groups Leg 1 shipment lines by shipdate, origin warehouse, crossdock, and equipment.
         * Input is typically itemsWithIndexes built in MR.reduce (already enriched with TO linkage).
         * Returns an object keyed by a human key; each value has stable ID fields + a list of lines.
         *
         * @param {Array<Object>} leg1Lines
         * @returns {Object} grouped
         */
        function groupLinesForLeg1ShipmentGeneration(leg1Lines, tranlineUniquekey, shipmentUniqueKeys, forceLeg)
        {
            log.debug("groupLinesForLeg1ShipmentGeneration leg1Lines", leg1Lines)

            const grouped = {};

            for (var line of (leg1Lines || [])) {
                // Prefer explicit fields; fall back to legacy names if present
                const shipdateRaw = line.shipdate || line.line_shipdate || null;

                const originWarehouse = line.originWarehouse || line.custrecord_anc_lane_cdw || line.line_location || null; // ID
                const originWarehouseCity = line.originWarehouseCity || line.custrecord_anc_lane_originwarehousecity || null;

                const crossdock = line.crossdock || null; // ID if available from upstream grouping
                const crossdockCity = line.crossdockCity || line.custrecord_anc_lane_crossdockcity || null;

                const equipment = line.line_equipment || line.equipment || null; // ID
                const equipment_leg1 = line.equipment_leg1 || line.equipment_leg1 || null; //TODO 08232025 additional mappings
                const equipmentText = line.equipmentText || line.line_equipmenttext || null;

                // Normalize date to MDY string when possible, but also keep raw for safety
                const toMDYSafe = (d) => {
                    try {
                        return (typeof toMDY === 'function') ? toMDY(d) : d;
                    } catch (e) { return d; }
                };
                const shipdate = shipdateRaw ? toMDYSafe(shipdateRaw) : null;

                // Build a stable ID-based key, plus a readable label we save on the group
                const idKey = `${shipdate || 'NA'}|OW:${originWarehouse || 'NA'}|CD:${crossdock || 'NA'}|EQ:${equipment || 'NA'}`;
                const humanKey = `${shipdate || 'NA'} > ${originWarehouseCity || originWarehouse || 'NA'} > ${crossdockCity || crossdock || 'NA'} > ${equipmentText || equipment || 'NA'}`;

                if (!grouped[idKey]) {
                    grouped[idKey] = {
                        leg: '1',
                        key: humanKey,              // for display/logging
                        shipdate,                   // normalized
                        originWarehouse, originWarehouseCity,
                        crossdock, crossdockCity,
                        equipment, equipmentText,
                        equipment_leg1 : equipment_leg1, //TODO 08232025 additional mappings
                        list: []
                    };
                }

                // Ensure each line carries everything downstream needs (TO/SO linkage + item + metadata)
                grouped[idKey].list.push({
                    // Linkage
                    transferOrderId: line.transferOrderId || null,
                    transferOrderLineIndex: line.transferOrderLineIndex || null,
                    lineUniqueKey_to: line.lineUniqueKey_to || null,

                    salesOrderId: line.salesOrderId || null,
                    salesOrderLineKey: line.salesOrderLineKey || line.line_uniquekey || null,

                    // Item + qty
                    itemId: line.itemId,
                    qty: line.qty,

                    // Equipment / locations / dates
                    equipment: equipment,
                    equipmentText: equipmentText,
                    equipment_leg1: equipment_leg1, //TODO 08232025 additional mappings
                    originWarehouse, originWarehouseCity,
                    crossdock, crossdockCity,
                    shipdate,                         // MDY string
                    line_shipdate: shipdateRaw || null, // keep the raw, if any

                    // Useful extras already present upstream
                    line_location: line.line_location || null,
                    internalid: line.internalid || null,
                    custrecord_anc_lane_cdw: line.custrecord_anc_lane_cdw || originWarehouse || null,
                    custcol_anc_shippinglane: line.custcol_anc_shippinglane || null
                });
            }

            log.debug('groupLinesForLeg1ShipmentGeneration result', grouped);
            return grouped;
        }



        function updateSoLines(recObj, colId, val)
        {
            try
            {
                var lineCount = recObj.getLineCount({
                    sublistId : "item"
                })
                for(var a = 0 ; a < lineCount ; a++)
                {
                    recObj.setSublistValue({
                        sublistId : "item",
                        fieldId : colId,
                        line : a,
                        value : val
                    })
                }

            }
            catch(e)
            {
                log.error("ERROR in function updateSoLines", e)
            }
        }

        function createGuidFromInteger(integerValue) {
            // Ensure the integer is within a reasonable range for embedding
            // For example, using the last 8 characters of the GUID
            const hexValue = integerValue.toString(16).padStart(8, '0');

            // Generate a standard GUID structure
            const guidTemplate = 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx';

            // Replace parts of the template with random hex values, and embed the integer
            const guid = guidTemplate.replace(/[xy]/g, function(c) {
                const r = Math.random() * 16 | 0;
                const v = c === 'x' ? r : (r & 0x3 | 0x8);
                return v.toString(16);
            });

            // Embed the integer value into the last part of the generated GUID
            // This replaces the last 8 'x' characters with the hex representation of the integer
            return guid.substring(0, guid.length - 8) + hexValue;
        }

        function processDeferredResponse(fitmentResponse, srGroupedByDeliveryDate, opts)
        {
            log.debug(`processDeferredResponse{fitmentResponse, srGroupedByDeliveryDate, opts}`, {fitmentResponse, srGroupedByDeliveryDate, opts})
            try
            {
                var deconstructedShipments = {list : []};
                const soUpdateMap = {};
                equipmentList = getEquipmentList();

                for (var groupText in srGroupedByDeliveryDate)
                {
                    var shipmentGroups = srGroupedByDeliveryDate[groupText];

                    for (var a = 0 ; a < shipmentGroups.length; a++)
                    {
                        var shipmentGroup = shipmentGroups[a];
                        const shipmentLineIdTracker = {};

                        // var groupList = shipmentGroup.request?.leg2
                        //     || shipmentGroup.request?.list
                        //     || shipmentGroup.request?.leg1
                        //     || shipmentGroup.request?.leg0
                        //     || shipmentGroup.request?.list
                        //     || shipmentGroup.groupData?.list
                        //     || [];
                        var groupList = shipmentGroup.request?.list
                            || [];

                        log.debug("groupList", groupList);

                        if (groupList.length <= 0) { continue; }

                        var groupByLineKey = {};
                        if(groupList[0].line_uniquekey)
                        {
                            groupByLineKey = groupBy(groupList, 'line_uniquekey', 'salesOrderLineKey');
                        }
                        else
                        {
                            groupByLineKey = groupBy(groupList, 'uniquekey', 'salesOrderLineKey');
                        }
                        log.debug("groupByLineKey", groupByLineKey);


                        var responseBody = fitmentResponse;

                        var correlationId = responseBody.correlationId;
                        var syncJobDetailRecObj = record.load({
                            type : "customrecord_anc_syncjobdetail",
                            id : correlationId
                        });

                        var correlationIdParent = syncJobDetailRecObj.getValue({
                            fieldId : "custrecord_anc_syncjobdet_syncjob"
                        })
                        if(responseBody.shipments)
                        {
                            for (const shipment of responseBody.shipments) {
                                const rec = record.create({ type: 'customsale_anc_shipment', isDynamic: true });

                                rec.setValue({ fieldId : 'entity', value : 549160 });
                                rec.setValue({ fieldId: 'memo', value: '✅✅✅' });
                                rec.setValue({ fieldId: 'custbody_anc_syncjob', value: correlationIdParent });

                                let entity, location, consignee, deliveryDate, shipDate, equipment, equipment_leg1, originWarehouse, custcol_anc_shippinglane, shippingLane;
                                let totalWeight = 0;

                                var counter = 0;
                                for (const item of shipment.shipmentItems) {



                                    //TODO do it this way for now to make sure other pieces are preserved, they might request demo out of nowhere
                                    if(shipmentGroup.request.followLeg)
                                    {
                                        var lineKey = item.itemId;
                                        const qty = item.nb;
                                        var line = (groupByLineKey[lineKey] || [])[0];
                                        if (!line || !qty) continue;

                                        if(counter == 0)
                                        {
                                            //add this block so that there is some window to write more logic, something will likely change here, this is also AI suggestion
                                            entity = line.entity || line.body_entity || 549160;
                                            location = line.location || line.line_location || line.line_location;
                                            consignee = line.consignee || line.nsconsignee || line.custbody_ns_consignee || line.line_consignee || line.custbody_consignee;
                                            deliveryDate = line.deliverydate || line.line_deliverydate;
                                            shipDate = line.shipdate || line.line_shipdate;
                                            equipment = line.equipment || line.line_equipment;
                                            originWarehouse = line.lane_cdw || line.custrecord_anc_lane_cdw || line.custrecord_anc_lane_cdw;
                                            custcol_anc_shippinglane = line.lane || line.custcol_anc_shippinglane || line.custbody_anc_lane; //09042025 secondary source, useful for deconstructing shipments where source is no longer at transactionline but shipmentheader

                                            var targetLeg = shipmentGroup.request.leg;
                                            targetLeg = line.leg || line.custbody_anc_shipment_leg;

                                            /*
                                            //TODO if event is deconstruction of shipments, they need to be tracked
                                            //TODO so that they can be marked as deconstructed, either in this portion where new shipments are incoming,
                                            // or immediately after attempt is made (loadplanning suitelet posting POST)
                                            */
                                            if(deconstructedShipments.list.includes(line.internalid))
                                            {

                                            }
                                            else
                                            {
                                                deconstructedShipments.list.push(line.internalid);
                                            }

                                            if (entity) rec.setValue({ fieldId: 'entity', value: entity });

                                            //TODO sort this out, do the conditions from here, not from when data is being stored on syncjob
                                            //TODO this is the practical approach so that the other portion is just about retrieving data
                                            //TODO refactor the variables later on, example originWarehouse is from SO.column.lane
                                            //TODO it is better to have conditions and dedicated keys rather than fallback via || operator
                                            if(targetLeg == 1)
                                            {
                                                //loadplanning leg1, same no impact
                                                if(shipmentGroup.request.followLeg)
                                                {
                                                    if (location) rec.setValue({ fieldId: 'location', value: location });
                                                    if (originWarehouse) rec.setValue({ fieldId: 'custbody_anc_originlocation', value: location });
                                                }
                                                else
                                                {
                                                    if (location) rec.setValue({ fieldId: 'location', value: location });
                                                    if (originWarehouse) rec.setValue({ fieldId: 'custbody_anc_originlocation', value: location });
                                                }

                                            }
                                            else if(targetLeg == 2)
                                            {
                                                //loadplanning leg1, same no impact
                                                if(shipmentGroup.request.followLeg)
                                                {
                                                    if (location) rec.setValue({ fieldId: 'location', value: location });
                                                    if (originWarehouse) rec.setValue({ fieldId: 'custbody_anc_originlocation', value: location });
                                                }
                                                else
                                                {
                                                    if (location) rec.setValue({ fieldId: 'location', value: location });
                                                    if (originWarehouse) rec.setValue({ fieldId: 'custbody_anc_originlocation', value: location });
                                                }
                                            }
                                            else
                                            {
                                                if (location) rec.setValue({ fieldId: 'location', value: location });
                                                if (originWarehouse) rec.setValue({ fieldId: 'custbody_anc_originlocation', value: originWarehouse });
                                            }

                                            if (deliveryDate) rec.setText({ fieldId: 'custbody_anc_deliverydate', text: deliveryDate });
                                            if (shipDate) rec.setText({ fieldId: 'custbody_anc_shipdate', text: shipDate });

                                            if(targetLeg == 1)
                                            {
                                                //whichever consignee is available. TODO refactor so that it is specific than fallbacks?
                                                //FIXME why are you falling back to harccoded 1, you will not reach that code because its already checking if variable is valid
                                                if (line.nsconsignee) rec.setValue({ fieldId: 'custbody_ns_consignee', value: line.nsconsignee || 1 });
                                            }
                                            else if(targetLeg == 2)
                                            {
                                                //FIXME why are you falling back to harccoded 1, you will not reach that code because its already checking if variable is valid
                                                if (consignee) rec.setValue({ fieldId: 'custbody_consignee', value: consignee });
                                                if (consignee || line.nsconsignee) rec.setValue({ fieldId: 'custbody_ns_consignee', value: consignee || line.nsconsignee});
                                            }

                                            rec.setValue({ fieldId: 'custbody_anc_shipment_leg', value: targetLeg || shipmentGroup.request.leg || line.leg || line.custbody_anc_shipment_leg });
                                            // if(shipmentGroup.request.followLeg)
                                            // {
                                            //     //force follow the leg defined, since this is from loadplanning/deconstruction
                                            //     rec.setValue({ fieldId: 'custbody_anc_shipment_leg', value: shipmentGroup.request.leg || line.leg || line.custbody_anc_shipment_leg });
                                            // }
                                            // else
                                            // {
                                            //     // ✅ Pick the leg from the sync-job detail (opts / legOverride), else fall back
                                            //     const legToUse = resolveLeg(opts, shipmentGroup, line);
                                            //     rec.setValue({ fieldId: 'custbody_anc_shipment_leg', value: legToUse || 1 });
                                            // }


                                            if (equipment) rec.setValue({ fieldId: 'custbody_anc_equipment', value: equipment });

                                            if (custcol_anc_shippinglane) rec.setValue({ fieldId: 'custbody_anc_lane', value: custcol_anc_shippinglane });
                                        }

                                        var lineWeight = qty * (line.actualitem_weight || line.item_weight || 1);
                                        //08262025 fix retrieval of weight TODO it used to be based on basis weight but later. weight should be
                                        // sourced from new fields Bashar set up

                                        totalWeight += lineWeight;
                                        log.debug("{lineWeight, qty, line.line_item_basis_weight, totalWeight}}", totalWeight)

                                        rec.selectNewLine({ sublistId: 'item' });
                                        // rec.selectLine({ sublistId: 'item', line : counter });
                                        rec.setCurrentSublistValue({ sublistId: 'item', fieldId: 'item', value: TEMPORARY_SHIPMENT_ITEM });
                                        rec.setCurrentSublistValue({ sublistId: 'item', fieldId: 'quantity', value: qty });
                                        rec.setCurrentSublistValue({ sublistId: 'item', fieldId: 'rate', value: 0 });
                                        rec.setCurrentSublistValue({ sublistId: 'item', fieldId: 'custcol_anc_actualitemtobeshipped', value: line.actualitem || line.line_item || line.line_tempitem || line.itemId });
                                        rec.setCurrentSublistValue({ sublistId: 'item', fieldId: 'custcol_consignee', value: consignee });
                                        rec.setCurrentSublistValue({ sublistId: 'item', fieldId: 'custcol_anc_relatedtransaction', value: line.relatedtransaction || line.custcol_anc_relatedtransaction || line.internalid });
                                        rec.setCurrentSublistValue({ sublistId: 'item', fieldId: 'custcol_anc_relatedlineuniquekey', value: line.relatedlineuniquekey || line.custcol_anc_relatedlineuniquekey || line.line_uniquekey || line.salesOrderLineKey });
                                        rec.setCurrentSublistValue({ sublistId: 'item', fieldId: 'custcol_anc_shipment_linetotalweight', value: lineWeight });
                                        rec.setCurrentSublistValue({ sublistId: 'item', fieldId: 'custcol_anc_equipment', value: line.equipment });

                                        //this only applies to shipments
                                        rec.setCurrentSublistValue({ sublistId: 'item', fieldId: 'custcol_anc_related_trans_orderline', value: line.relatedtransferorder || line.transferOrderLineIndex });


                                        if(targetLeg == 1)
                                        {
                                            rec.setCurrentSublistValue({ sublistId: 'item', fieldId: 'custcol_anc_relatedtransaction_to',value : line.relatedtransferorder ||  line.line_relatedtransferorder || line.transferOrderId || line.toInternalId || line.internalid });
                                            rec.setCurrentSublistValue({ sublistId: 'item', fieldId: 'custcol_anc_relatedlineuniquekey_to', value: line.relatedtransferorderuk || line.line_relatedtransferorderuk || line.lineUniqueKey_to || line.line_uniquekey });
                                        }
                                        else if(targetLeg == 2)
                                        {
                                            // rec.setCurrentSublistValue({ sublistId: 'item', fieldId: 'custcol_anc_relatedtransaction_to', value: line.transferOrderId || line.toInternalId || line.internalid });
                                            // rec.setCurrentSublistValue({ sublistId: 'item', fieldId: 'custcol_anc_relatedlineuniquekey_to', value: line.lineUniqueKey_to || line.line_uniquekey });
                                        }
                                        else
                                        {
                                            // rec.setCurrentSublistValue({ sublistId: 'item', fieldId: 'custcol_anc_relatedtransaction_to', value: line.transferOrderId || line.toInternalId || line.internalid });
                                            // rec.setCurrentSublistValue({ sublistId: 'item', fieldId: 'custcol_anc_relatedlineuniquekey_to', value: line.lineUniqueKey_to || line.line_uniquekey });
                                        }

                                        rec.setCurrentSublistValue({ sublistId: 'item', fieldId: 'custcol_consignee', value: line.consignee || line.nsconsignee || line.custbody_consignee });

                                        rec.commitLine({ sublistId: 'item' });
                                        counter++;
                                        log.debug(`counter`, counter)
                                        log.debug(`rec.getLineCount({sublistId : "item"})`, rec.getLineCount({sublistId : "item"}))
                                    }
                                    else
                                    {
                                        //TODO do this first! leg2 shipments
                                        var targetLeg = shipmentGroup.request.leg;
                                        if(targetLeg == 1)
                                        {

                                            var lineKey = item.itemId;
                                            const qty = item.nb;
                                            var line = (groupByLineKey[lineKey] || [])[0];
                                            if (!line || !qty) continue;

                                            if(counter == 0)
                                            {
                                                //add this block so that there is some window to write more logic, something will likely change here, this is also AI suggestion
                                                entity = line.entity || line.body_entity || 549160;
                                                location = line.location || 9;
                                                consignee = line.nsconsignee || line.consignee || 306041;
                                                deliveryDate = line.deliverydate || line.line_deliverydate;
                                                shipDate = line.shipdate || line.line_shipdate;
                                                equipment = line.equipment || line.line_equipment;
                                                originWarehouse = line.lane_cdw || line.custrecord_anc_lane_cdw || line.custrecord_anc_lane_cdw;
                                                custcol_anc_shippinglane = line.lane || line.custcol_anc_shippinglane || line.custbody_anc_lane; //09042025 secondary source, useful for deconstructing shipments where source is no longer at transactionline but shipmentheader

                                                var targetLeg = shipmentGroup.request.leg;
                                                targetLeg = targetLeg || line.leg || line.custbody_anc_shipment_leg;


                                                if (entity) rec.setValue({ fieldId: 'entity', value: entity });

                                                //TODO sort this out, do the conditions from here, not from when data is being stored on syncjob
                                                //TODO this is the practical approach so that the other portion is just about retrieving data
                                                //TODO refactor the variables later on, example originWarehouse is from SO.column.lane
                                                //TODO it is better to have conditions and dedicated keys rather than fallback via || operator
                                                if(targetLeg == 1)
                                                {
                                                    //loadplanning leg1, same no impact
                                                    if(shipmentGroup.request.followLeg)
                                                    {
                                                        if (location) rec.setValue({ fieldId: 'location', value: location });
                                                        if (originWarehouse) rec.setValue({ fieldId: 'custbody_anc_originlocation', value: location });
                                                    }
                                                    else
                                                    {
                                                        if (location) rec.setValue({ fieldId: 'location', value: location });
                                                        if (originWarehouse) rec.setValue({ fieldId: 'custbody_anc_originlocation', value: location });
                                                    }

                                                }

                                                if (deliveryDate) rec.setText({ fieldId: 'custbody_anc_deliverydate', text: deliveryDate });
                                                if (shipDate) rec.setText({ fieldId: 'custbody_anc_shipdate', text: shipDate });

                                                if(targetLeg == 1)
                                                {
                                                    //whichever consignee is available. TODO refactor so that it is specific than fallbacks?
                                                    //FIXME why are you falling back to harccoded 1, you will not reach that code because its already checking if variable is valid
                                                    if (consignee) rec.setValue({ fieldId: 'custbody_ns_consignee', value: consignee || 1 });
                                                }

                                                rec.setValue({ fieldId: 'custbody_anc_shipment_leg', value: targetLeg || shipmentGroup.request.leg || line.leg || line.custbody_anc_shipment_leg });
                                                // if(shipmentGroup.request.followLeg)
                                                // {
                                                //     //force follow the leg defined, since this is from loadplanning/deconstruction
                                                //     rec.setValue({ fieldId: 'custbody_anc_shipment_leg', value: shipmentGroup.request.leg || line.leg || line.custbody_anc_shipment_leg });
                                                // }
                                                // else
                                                // {
                                                //     // ✅ Pick the leg from the sync-job detail (opts / legOverride), else fall back
                                                //     const legToUse = resolveLeg(opts, shipmentGroup, line);
                                                //     rec.setValue({ fieldId: 'custbody_anc_shipment_leg', value: legToUse || 1 });
                                                // }


                                                if (equipment) rec.setValue({ fieldId: 'custbody_anc_equipment', value: equipment });

                                                if (custcol_anc_shippinglane) rec.setValue({ fieldId: 'custbody_anc_lane', value: custcol_anc_shippinglane });
                                            }

                                            var lineWeight = qty * (line.actualitem_weight || line.item_weight || 1);
                                            //08262025 fix retrieval of weight TODO it used to be based on basis weight but later. weight should be
                                            // sourced from new fields Bashar set up

                                            totalWeight += lineWeight;
                                            log.debug("{lineWeight, qty, line.line_item_basis_weight, totalWeight}}", totalWeight)

                                            rec.selectNewLine({ sublistId: 'item' });
                                            // rec.selectLine({ sublistId: 'item', line : counter });
                                            rec.setCurrentSublistValue({ sublistId: 'item', fieldId: 'item', value: TEMPORARY_SHIPMENT_ITEM });
                                            rec.setCurrentSublistValue({ sublistId: 'item', fieldId: 'quantity', value: qty });
                                            rec.setCurrentSublistValue({ sublistId: 'item', fieldId: 'rate', value: 0 });
                                            rec.setCurrentSublistValue({ sublistId: 'item', fieldId: 'custcol_anc_actualitemtobeshipped', value: line.actualitem || line.line_item || line.line_tempitem || line.itemId });
                                            rec.setCurrentSublistValue({ sublistId: 'item', fieldId: 'custcol_consignee', value: consignee });
                                            rec.setCurrentSublistValue({ sublistId: 'item', fieldId: 'custcol_anc_relatedtransaction', value: line.relatedtransaction || line.custcol_anc_relatedtransaction || line.internalid });
                                            rec.setCurrentSublistValue({ sublistId: 'item', fieldId: 'custcol_anc_relatedlineuniquekey', value: line.relatedlineuniquekey || line.custcol_anc_relatedlineuniquekey || line.line_uniquekey || line.salesOrderLineKey });
                                            rec.setCurrentSublistValue({ sublistId: 'item', fieldId: 'custcol_anc_shipment_linetotalweight', value: lineWeight });
                                            rec.setCurrentSublistValue({ sublistId: 'item', fieldId: 'custcol_anc_equipment', value: line.equipment });

                                            rec.setCurrentSublistValue({ sublistId: 'item', fieldId: 'custcol_anc_related_trans_orderline', value: line.relatedtransferorder || line.transferOrderLineIndex });


                                            if(targetLeg == 1)
                                            {

                                                rec.setCurrentSublistValue({ sublistId: 'item', fieldId: 'custcol_anc_relatedtransaction_to', value: line.internalid });
                                                rec.setCurrentSublistValue({ sublistId: 'item', fieldId: 'custcol_anc_relatedlineuniquekey_to', value: line.uniquekey || line.line_uniquekey });
                                            }
                                            else
                                            {
                                                // rec.setCurrentSublistValue({ sublistId: 'item', fieldId: 'custcol_anc_relatedtransaction_to', value: line.transferOrderId || line.toInternalId || line.internalid });
                                                // rec.setCurrentSublistValue({ sublistId: 'item', fieldId: 'custcol_anc_relatedlineuniquekey_to', value: line.lineUniqueKey_to || line.line_uniquekey });
                                            }

                                            rec.setCurrentSublistValue({ sublistId: 'item', fieldId: 'custcol_consignee', value: line.consignee || line.nsconsignee || line.custbody_consignee });

                                            rec.commitLine({ sublistId: 'item' });
                                            counter++;
                                            log.debug(`counter`, counter)
                                            log.debug(`rec.getLineCount({sublistId : "item"})`, rec.getLineCount({sublistId : "item"}))
                                        }
                                        else if(targetLeg == 2)
                                        {

                                            var lineKey = item.itemId;
                                            const qty = item.nb;
                                            var line = (groupByLineKey[lineKey] || [])[0];
                                            if (!line || !qty) continue;

                                            if(counter == 0)
                                            {
                                                //add this block so that there is some window to write more logic, something will likely change here, this is also AI suggestion
                                                entity = line.entity || line.body_entity || 549160;
                                                location = line.lane_cdw || line.custrecord_anc_lane_cdw || line.custrecord_anc_lane_cdw;
                                                consignee = line.consignee || line.nsconsignee || line.custbody_ns_consignee || line.line_consignee || line.custbody_consignee;
                                                deliveryDate = line.deliverydate || line.line_deliverydate;
                                                shipDate = line.shipdate || line.line_shipdate;
                                                equipment = line.equipment || line.line_equipment;
                                                originWarehouse = line.lane_cdw || line.custrecord_anc_lane_cdw || line.custrecord_anc_lane_cdw;
                                                custcol_anc_shippinglane = line.lane || line.custcol_anc_shippinglane || line.custbody_anc_lane; //09042025 secondary source, useful for deconstructing shipments where source is no longer at transactionline but shipmentheader

                                                var targetLeg = shipmentGroup.request.leg;

                                                if (entity) rec.setValue({ fieldId: 'entity', value: entity });

                                                //TODO sort this out, do the conditions from here, not from when data is being stored on syncjob
                                                //TODO this is the practical approach so that the other portion is just about retrieving data
                                                //TODO refactor the variables later on, example originWarehouse is from SO.column.lane
                                                //TODO it is better to have conditions and dedicated keys rather than fallback via || operator
                                                if(targetLeg == 2)
                                                {
                                                    //loadplanning leg1, same no impact
                                                    if(shipmentGroup.request.followLeg)
                                                    {
                                                        if (location) rec.setValue({ fieldId: 'location', value: location });
                                                        if (originWarehouse) rec.setValue({ fieldId: 'custbody_anc_originlocation', value: location });
                                                    }
                                                    else
                                                    {
                                                        if (location) rec.setValue({ fieldId: 'location', value: location });
                                                        if (originWarehouse) rec.setValue({ fieldId: 'custbody_anc_originlocation', value: location });
                                                    }
                                                }

                                                if (deliveryDate) rec.setText({ fieldId: 'custbody_anc_deliverydate', text: deliveryDate });
                                                if (shipDate) rec.setText({ fieldId: 'custbody_anc_shipdate', text: shipDate });

                                                if(targetLeg == 2)
                                                {
                                                    if (consignee) rec.setValue({ fieldId: 'custbody_consignee', value: consignee });
                                                    if (line.nsconsignee) rec.setValue({ fieldId: 'custbody_ns_consignee', value: line.nsconsignee });
                                                }

                                                rec.setValue({ fieldId: 'custbody_anc_shipment_leg', value: targetLeg || shipmentGroup.request.leg || line.leg || line.custbody_anc_shipment_leg });
                                                // if(shipmentGroup.request.followLeg)
                                                // {
                                                //     //force follow the leg defined, since this is from loadplanning/deconstruction
                                                //     rec.setValue({ fieldId: 'custbody_anc_shipment_leg', value: shipmentGroup.request.leg || line.leg || line.custbody_anc_shipment_leg });
                                                // }
                                                // else
                                                // {
                                                //     // ✅ Pick the leg from the sync-job detail (opts / legOverride), else fall back
                                                //     const legToUse = resolveLeg(opts, shipmentGroup, line);
                                                //     rec.setValue({ fieldId: 'custbody_anc_shipment_leg', value: legToUse || 1 });
                                                // }


                                                if (equipment) rec.setValue({ fieldId: 'custbody_anc_equipment', value: equipment });

                                                if (custcol_anc_shippinglane) rec.setValue({ fieldId: 'custbody_anc_lane', value: custcol_anc_shippinglane });
                                            }

                                            var lineWeight = qty * (line.actualitem_weight || line.item_weight || 1);
                                            //08262025 fix retrieval of weight TODO it used to be based on basis weight but later. weight should be
                                            // sourced from new fields Bashar set up

                                            totalWeight += lineWeight;
                                            log.debug("{lineWeight, qty, line.line_item_basis_weight, totalWeight}}", totalWeight)

                                            rec.selectNewLine({ sublistId: 'item' });
                                            // rec.selectLine({ sublistId: 'item', line : counter });
                                            rec.setCurrentSublistValue({ sublistId: 'item', fieldId: 'item', value: TEMPORARY_SHIPMENT_ITEM });
                                            rec.setCurrentSublistValue({ sublistId: 'item', fieldId: 'quantity', value: qty });
                                            rec.setCurrentSublistValue({ sublistId: 'item', fieldId: 'rate', value: 0 });
                                            rec.setCurrentSublistValue({ sublistId: 'item', fieldId: 'custcol_anc_actualitemtobeshipped', value: line.item});
                                            rec.setCurrentSublistValue({ sublistId: 'item', fieldId: 'custcol_consignee', value: consignee });
                                            rec.setCurrentSublistValue({ sublistId: 'item', fieldId: 'custcol_anc_relatedtransaction', value: line.internalid });
                                            rec.setCurrentSublistValue({ sublistId: 'item', fieldId: 'custcol_anc_relatedlineuniquekey', value: line.uniquekey });
                                            rec.setCurrentSublistValue({ sublistId: 'item', fieldId: 'custcol_anc_shipment_linetotalweight', value: lineWeight });
                                            rec.setCurrentSublistValue({ sublistId: 'item', fieldId: 'custcol_anc_equipment', value: line.equipment });

                                            rec.setCurrentSublistValue({ sublistId: 'item', fieldId: 'custcol_anc_related_trans_orderline', value: line.relatedtransferorder || line.transferOrderLineIndex });

                                            rec.setCurrentSublistValue({ sublistId: 'item', fieldId: 'custcol_consignee', value: line.consignee || line.nsconsignee || line.custbody_consignee });

                                            rec.commitLine({ sublistId: 'item' });
                                            counter++;
                                            log.debug(`counter`, counter)
                                            log.debug(`rec.getLineCount({sublistId : "item"})`, rec.getLineCount({sublistId : "item"}))
                                        }
                                        else
                                        {


                                            var lineKey = item.itemId;
                                            const qty = item.nb;
                                            var line = (groupByLineKey[lineKey] || [])[0];
                                            if (!line || !qty) continue;

                                            if(counter == 0)
                                            {
                                                //add this block so that there is some window to write more logic, something will likely change here, this is also AI suggestion
                                                entity = line.entity || line.body_entity || 549160;
                                                location = line.location;
                                                consignee = line.consignee || line.nsconsignee || line.custbody_ns_consignee || line.line_consignee || line.custbody_consignee;
                                                deliveryDate = line.deliverydate || line.line_deliverydate;
                                                shipDate = line.shipdate || line.line_shipdate;
                                                equipment = line.equipment || line.line_equipment;
                                                originWarehouse = line.location;
                                                custcol_anc_shippinglane = line.lane || line.custcol_anc_shippinglane || line.custbody_anc_lane; //09042025 secondary source, useful for deconstructing shipments where source is no longer at transactionline but shipmentheader

                                                var targetLeg = shipmentGroup.request.leg;

                                                if (entity) rec.setValue({ fieldId: 'entity', value: entity });

                                                //TODO direct shipment
                                                if (location) rec.setValue({ fieldId: 'location', value: location });
                                                if (originWarehouse) rec.setValue({ fieldId: 'custbody_anc_originlocation', value: location });

                                                if (deliveryDate) rec.setText({ fieldId: 'custbody_anc_deliverydate', text: deliveryDate });
                                                if (shipDate) rec.setText({ fieldId: 'custbody_anc_shipdate', text: shipDate });

                                                if (consignee) rec.setValue({ fieldId: 'custbody_consignee', value: consignee });
                                                if (line.nsconsignee) rec.setValue({ fieldId: 'custbody_ns_consignee', value: line.nsconsignee });

                                                rec.setValue({ fieldId: 'custbody_anc_shipment_leg', value: targetLeg || shipmentGroup.request.leg || line.leg || 0 });
                                                // if(shipmentGroup.request.followLeg)
                                                // {
                                                //     //force follow the leg defined, since this is from loadplanning/deconstruction
                                                //     rec.setValue({ fieldId: 'custbody_anc_shipment_leg', value: shipmentGroup.request.leg || line.leg || line.custbody_anc_shipment_leg });
                                                // }
                                                // else
                                                // {
                                                //     // ✅ Pick the leg from the sync-job detail (opts / legOverride), else fall back
                                                //     const legToUse = resolveLeg(opts, shipmentGroup, line);
                                                //     rec.setValue({ fieldId: 'custbody_anc_shipment_leg', value: legToUse || 1 });
                                                // }


                                                if (equipment) rec.setValue({ fieldId: 'custbody_anc_equipment', value: equipment });

                                                if (custcol_anc_shippinglane) rec.setValue({ fieldId: 'custbody_anc_lane', value: custcol_anc_shippinglane });
                                            }

                                            var lineWeight = qty * (line.actualitem_weight || line.item_weight || 1);
                                            //08262025 fix retrieval of weight TODO it used to be based on basis weight but later. weight should be
                                            // sourced from new fields Bashar set up

                                            totalWeight += lineWeight;
                                            log.debug("{lineWeight, qty, line.line_item_basis_weight, totalWeight}}", totalWeight)

                                            rec.selectNewLine({ sublistId: 'item' });
                                            // rec.selectLine({ sublistId: 'item', line : counter });
                                            rec.setCurrentSublistValue({ sublistId: 'item', fieldId: 'item', value: TEMPORARY_SHIPMENT_ITEM });
                                            rec.setCurrentSublistValue({ sublistId: 'item', fieldId: 'quantity', value: qty });
                                            rec.setCurrentSublistValue({ sublistId: 'item', fieldId: 'rate', value: 0 });
                                            rec.setCurrentSublistValue({ sublistId: 'item', fieldId: 'custcol_anc_actualitemtobeshipped', value: line.item});
                                            rec.setCurrentSublistValue({ sublistId: 'item', fieldId: 'custcol_consignee', value: consignee });
                                            rec.setCurrentSublistValue({ sublistId: 'item', fieldId: 'custcol_anc_relatedtransaction', value: line.internalid });
                                            rec.setCurrentSublistValue({ sublistId: 'item', fieldId: 'custcol_anc_relatedlineuniquekey', value: line.uniquekey });
                                            rec.setCurrentSublistValue({ sublistId: 'item', fieldId: 'custcol_anc_shipment_linetotalweight', value: lineWeight });
                                            rec.setCurrentSublistValue({ sublistId: 'item', fieldId: 'custcol_anc_equipment', value: line.equipment });

                                            rec.setCurrentSublistValue({ sublistId: 'item', fieldId: 'custcol_anc_related_trans_orderline', value: line.relatedtransferorder || line.transferOrderLineIndex });

                                            rec.setCurrentSublistValue({ sublistId: 'item', fieldId: 'custcol_consignee', value: line.consignee || line.nsconsignee || line.custbody_consignee });

                                            rec.commitLine({ sublistId: 'item' });
                                            counter++;
                                            log.debug(`counter`, counter)
                                            log.debug(`rec.getLineCount({sublistId : "item"})`, rec.getLineCount({sublistId : "item"}))

                                        }
                                    }
                                }

                                const utilization = computeLoadUtilization(equipmentList, { line_equipment: equipment }, totalWeight);
                                const computeLoadUtilizationStatus_result = computeLoadUtilizationStatus(utilization);

                                if(computeLoadUtilizationStatus_result.shipmentUtilStatus) {
                                    rec.setValue({ fieldId: 'custbody_anc_shipstatus', value: computeLoadUtilizationStatus_result.shipmentUtilStatus });
                                }
                                rec.setValue({ fieldId: 'custbody_anc_loadingefficiency', value: utilization.shipmentUtilRate });

                                const shipmentId = rec.save({ ignoreMandatoryFields: true });
                                log.audit('✅ Shipment Created', shipmentId);

                                const shipmentRec = record.load({
                                    type: 'customsale_anc_shipment',
                                    id: shipmentId,
                                    isDynamic: false
                                });

                                const numLines = shipmentRec.getLineCount({ sublistId: 'item' });
                                for (let i = 0; i < numLines; i++) {
                                    const soId = shipmentRec.getSublistValue({ sublistId: 'item', fieldId: 'custcol_anc_relatedtransaction', line: i });
                                    const soLineKey = shipmentRec.getSublistValue({ sublistId: 'item', fieldId: 'custcol_anc_relatedlineuniquekey', line: i });
                                    const shipmentLineKey = shipmentRec.getSublistValue({ sublistId: 'item', fieldId: 'lineuniquekey', line: i });
                                    if (!soId || !soLineKey) continue;

                                    if (!soUpdateMap[soId]) soUpdateMap[soId] = {};
                                    if (!soUpdateMap[soId][soLineKey]) soUpdateMap[soId][soLineKey] = [];
                                    soUpdateMap[soId][soLineKey].push({
                                        shipmentInternalId: String(shipmentId),
                                        shipmentLineUniqueKey: String(shipmentLineKey)
                                    });
                                }
                            }
                        }

                        for (const soId in soUpdateMap) {
                            try {
                                const soRec = record.load({
                                    type: record.Type.SALES_ORDER,
                                    id: soId,
                                    isDynamic: false
                                });

                                var lineCount = soRec.getLineCount({ sublistId: 'item' });
                                for (let j = 0; j < lineCount; j++) {
                                    const soLineKey = soRec.getSublistValue({
                                        sublistId: 'item',
                                        fieldId: 'lineuniquekey',
                                        line: j
                                    });
                                    if (!soLineKey || !soUpdateMap[soId][soLineKey]) continue;

                                    let existingLinks = soRec.getSublistValue({
                                        sublistId: 'item',
                                        fieldId: 'custcol_anc_relatedshipments',
                                        line: j
                                    }) || '[]';

                                    let parsedLinks = [];
                                    try { parsedLinks = JSON.parse(existingLinks); } catch (_) { parsedLinks = []; }

                                    parsedLinks = soUpdateMap[soId][soLineKey];
                                    // parsedLinks.push(...soUpdateMap[soId][soLineKey]); //do not accumulate shipments anymore

                                    soRec.setSublistValue({
                                        sublistId: 'item',
                                        fieldId: 'custcol_anc_relatedshipments',
                                        line: j,
                                        value: JSON.stringify(parsedLinks)
                                    });
                                }
                                soRec.save({ ignoreMandatoryFields: true });

                            } catch (e) {
                                log.error('❌ Error Updating Sales Order', { soId, error: e });
                            }
                        }
                    }
                }

                //BEST mark for deconstruction as soon as loadplanning page is submitted, because if we wait then mindless users will spam things they already submitted.
                // for(var a = 0 ; a < deconstructedShipments.list.length ; a++)
                // {
                //     var submittedDeconstructedShipmentId = record.submitFields({
                //         type: "customsale_anc_shipment",
                //         id : deconstructedShipments.list[a],
                //         values : {
                //             custbody_anc_tobedeletedduetodecons : "T"
                //         }
                //     });
                //     log.debug("submittedDeconstructedShipmentId", submittedDeconstructedShipmentId);
                // }

            } catch (e) {
                log.error("ERROR in function processDeferredResponse", e);
            }
        }



        function processDeferredResponse2(fitmentResponse, srGroupedByDeliveryDate, opts, soIds)
        {
            log.debug(`processDeferredResponse2{fitmentResponse, srGroupedByDeliveryDate, opts}`, {fitmentResponse, srGroupedByDeliveryDate, opts})
            try
            {
                var deconstructedShipments = {list : []};
                const soUpdateMap = {};
                equipmentList = getEquipmentList();

                log.debug("processDeferredResponse srGroupedByDeliveryDate before max2 cons", srGroupedByDeliveryDate)
                // srGroupedByDeliveryDate = ANC_lib ? ANC_lib.splitByConsigneeMax2(srGroupedByDeliveryDate) : splitByConsigneeMax2(srGroupedByDeliveryDate);

                log.debug("processDeferredResponse srGroupedByDeliveryDate max2 cons", srGroupedByDeliveryDate)

                for (var groupText in srGroupedByDeliveryDate)
                {


                    var shipmentGroups = srGroupedByDeliveryDate[groupText];

                    log.debug("shipmentGroups", shipmentGroups);

                    for (const shipmentGroup of shipmentGroups) {
                        const groupList = shipmentGroup.request?.list || [];
                        if (!groupList.length) continue;


                        const groupByLineKey = groupBy(groupList, 'uniquekey');
                        const groupByConsignee = groupBy(groupList, 'consignee');

                        var counter = 0;
                        var lineCount = 0;


                        var responseBody = fitmentResponse;
                        var correlationId = responseBody.correlationId;
                        var syncJobDetailRecObj = record.load({
                            type : "customrecord_anc_syncjobdetail",
                            id : correlationId
                        });
                        var correlationIdParent = syncJobDetailRecObj.getValue({
                            fieldId : "custrecord_anc_syncjobdet_syncjob"
                        })

                        for (const shipment of fitmentResponse.shipments) {
// group shipmentItems by consignee (look up from groupByLineKey)
//                             var consigneeGroups = {};
//                             for (const item of shipment.shipmentItems) {
//                                 var line = (groupByLineKey[item.itemId] || [])[0];
//                                 if (!line) continue;
//                                 var consignee = line.consignee || line.nsconsignee;
//                                 if (!consigneeGroups[consignee]) consigneeGroups[consignee] = [];
//                                 consigneeGroups[consignee].push({item, line});
//                             }
//                             var consignees = Object.keys(consigneeGroups).slice(0,2); // limit to 2 consignees
//                             if (!consignees.length) continue;
                            //TODO ADDED logic so that it does not try to split for leg1 shipments, it should rely on nsconsignee instead of consignee

                            var consigneeGroups = {};
                            var sawLeg1 = false;

                            for (const item of shipment.shipmentItems) {
                                var line = (groupByLineKey[item.itemId] || [])[0];
                                if (!line) continue;

                                // detect leg (supports string/number or alt field)
                                var legRaw = (line.leg != null ? line.leg : line.custpage_ifr_leg);
                                var isLeg1 = String(legRaw != null ? legRaw : '').trim() === '1';
                                if (isLeg1) sawLeg1 = true;

                                // choose bucket key:
                                // - leg 1  → prefer nsconsignee (internal crossdock)
                                // - other  → prefer consignee (external)
                                var primary = isLeg1
                                    ? (line.nsconsignee != null ? String(line.nsconsignee).trim() : '')
                                    : (line.consignee != null ? String(line.consignee).trim()
                                        : (line.custbody_consignee != null ? String(line.custbody_consignee).trim() : ''));

                                var fallback = isLeg1
                                    ? (line.consignee != null ? String(line.consignee).trim()
                                        : (line.custbody_consignee != null ? String(line.custbody_consignee).trim() : ''))
                                    : (line.nsconsignee != null ? String(line.nsconsignee).trim() : '');

                                var stableKey = String(line.relatedlineuniquekey || line.uniquekey || '').trim();
                                var bucketId = primary || fallback || ('__NO_CONSIGNEE__:' + (stableKey || 'NA'));

                                if (!consigneeGroups[bucketId]) consigneeGroups[bucketId] = [];
                                consigneeGroups[bucketId].push({ item, line });
                            }

// Build the final list of consignees
                            var consignees = Object.keys(consigneeGroups);

// If any leg1 lines were present, allow only a single group (per your requirement)
                            if (sawLeg1 && consignees.length > 1) {
                                consignees = [consignees[0]];
                            }

// Still keep the existing cap for non-leg1 cases
                            consignees = consignees.slice(0, 2);

                            if (!consignees.length) continue;



                            var totalWeight = consignees.reduce((sum,c)=>{
                                return sum + consigneeGroups[c].reduce((s,{item,line})=>{
                                    return s + item.nb * (line.actualitem_weight || line.item_weight || 1);
                                },0);
                            },0);


                            var jointLoadNumber = consignees.length>1 ? `${consignees.join('-')}_${Date.now()}` : '';

                            log.debug("consignees", consignees);

                            for (var consignee of consignees) {
                                log.debug("consignee", consignee);

                                log.debug("consigneeGroups", consigneeGroups);
                                var line = consigneeGroups[consignee][0].line
                                log.debug("line", line);

                                const rec = record.create({type:'customsale_anc_shipment', isDynamic:true});
                                rec.setValue({fieldId:'entity', value: consigneeGroups[consignee][0].line.entity || 549160});
                                rec.setValue({fieldId:'location', value: consigneeGroups[consignee][0].line.location || 9});

                                rec.setValue({fieldId: 'custbody_anc_syncjob', value: correlationIdParent});
                                var entity, location, consigneeX, consignee, deliveryDate, shipDate, equipment, equipment_leg1, originWarehouse, custcol_anc_shippinglane, shippingLane;

                                if(shipmentGroup.request.followLeg)
                                {
                                    log.debug("followleg jointloads")
                                    var fixedConsignee = line.consignee;
                                    entity = line.entity || line.body_entity || 549160;
                                    location = line.location || line.line_location || line.line_location;
                                    consignee = line.consignee || line.nsconsignee || line.custbody_ns_consignee || line.line_consignee || line.custbody_consignee;
                                    deliveryDate = line.deliverydate || line.line_deliverydate;
                                    shipDate = line.shipdate || line.line_shipdate;
                                    equipment = line.equipment || line.line_equipment;
                                    originWarehouse = line.lane_cdw || line.custrecord_anc_lane_cdw || line.custrecord_anc_lane_cdw;
                                    custcol_anc_shippinglane = line.lane || line.custcol_anc_shippinglane || line.custbody_anc_lane; //09042025 secondary source, useful for deconstructing shipments where source is no longer at transactionline but shipmentheader

                                    var targetLeg = shipmentGroup.request.leg;
                                    if (entity) rec.setValue({ fieldId: 'entity', value: entity });

                                    if(targetLeg == 1)
                                    {
                                        //loadplanning leg1, same no impact
                                        if(shipmentGroup.request.followLeg)
                                        {
                                            fixedConsignee = line.nsconsignee || line.consignee;
                                            if (location) rec.setValue({ fieldId: 'location', value: location });
                                            if (originWarehouse) rec.setValue({ fieldId: 'custbody_anc_originlocation', value: location });
                                        }
                                        else
                                        {
                                            if (location) rec.setValue({ fieldId: 'location', value: location });
                                            if (originWarehouse) rec.setValue({ fieldId: 'custbody_anc_originlocation', value: location });
                                        }

                                    }
                                    else if(targetLeg == 2)
                                    {
                                        //loadplanning leg1, same no impact
                                        if(shipmentGroup.request.followLeg)
                                        {
                                            if (location) rec.setValue({ fieldId: 'location', value: location });
                                            if (originWarehouse) rec.setValue({ fieldId: 'custbody_anc_originlocation', value: location });
                                        }
                                        else
                                        {
                                            if (location) rec.setValue({ fieldId: 'location', value: location });
                                            if (originWarehouse) rec.setValue({ fieldId: 'custbody_anc_originlocation', value: location });
                                        }
                                    }
                                    else
                                    {
                                        if (location) rec.setValue({ fieldId: 'location', value: location });
                                        if (originWarehouse) rec.setValue({ fieldId: 'custbody_anc_originlocation', value: originWarehouse });
                                    }

                                    if (deliveryDate) rec.setText({ fieldId: 'custbody_anc_deliverydate', text: deliveryDate });
                                    if (shipDate) rec.setText({ fieldId: 'custbody_anc_shipdate', text: shipDate });

                                    if(targetLeg == 1)
                                    {
                                        //whichever consignee is available. TODO refactor so that it is specific than fallbacks?
                                        //FIXME why are you falling back to harccoded 1, you will not reach that code because its already checking if variable is valid
                                        if (line.nsconsignee) rec.setValue({ fieldId: 'custbody_ns_consignee', value: line.nsconsignee || 1 });
                                    }
                                    else if(targetLeg == 2)
                                    {
                                        //FIXME why are you falling back to harccoded 1, you will not reach that code because its already checking if variable is valid
                                        if (consignee) rec.setValue({ fieldId: 'custbody_consignee', value: consignee });
                                        if (consignee || line.nsconsignee) rec.setValue({ fieldId: 'custbody_ns_consignee', value: consignee || line.nsconsignee});
                                    }
                                    else if(targetLeg === 0 || targetLeg === "0")
                                    {
                                        //FIXME why are you falling back to harccoded 1, you will not reach that code because its already checking if variable is valid
                                        if (consignee) rec.setValue({ fieldId: 'custbody_consignee', value: consignee });
                                        if (consignee || line.nsconsignee) rec.setValue({ fieldId: 'custbody_ns_consignee', value: consignee || line.nsconsignee});
                                    }
                                    else
                                    {
                                        if (consignee) rec.setValue({ fieldId: 'custbody_consignee', value: consignee });
                                        if (consignee || line.nsconsignee) rec.setValue({ fieldId: 'custbody_ns_consignee', value: consignee || line.nsconsignee});
                                    }

                                    rec.setValue({ fieldId: 'custbody_anc_shipment_leg', value: targetLeg || shipmentGroup.request.leg || line.leg || line.custbody_anc_shipment_leg || 0 });

                                    if (equipment) rec.setValue({ fieldId: 'custbody_anc_equipment', value: equipment });

                                    if (custcol_anc_shippinglane) rec.setValue({ fieldId: 'custbody_anc_lane', value: custcol_anc_shippinglane });

                                    var singleShipmentWeight = 0;
                                    log.debug("consigneeGroups[consignee]", consigneeGroups[fixedConsignee]);
                                    for (const {item,line} of consigneeGroups[fixedConsignee]) {

                                        log.debug("{item,line}", {item,line});

                                        var lineWeight = item.nb * (line.actualitem_weight || line.item_weight || 1);
                                        rec.selectNewLine({sublistId:'item'});
                                        rec.setCurrentSublistValue({sublistId:'item', fieldId:'item', value:TEMPORARY_SHIPMENT_ITEM});
                                        rec.setCurrentSublistValue({sublistId:'item', fieldId:'quantity', value:item.nb});
                                        rec.setCurrentSublistValue({ sublistId: 'item', fieldId: 'rate', value: 0 });
                                        rec.setCurrentSublistValue({ sublistId: 'item', fieldId: 'custcol_anc_actualitemtobeshipped', value: line.actualitem || line.line_item || line.line_tempitem || line.itemId });
                                        rec.setCurrentSublistValue({sublistId:'item', fieldId:'custcol_consignee', value:consignee});
                                        rec.setCurrentSublistValue({sublistId:'item', fieldId:'custcol_anc_shipment_linetotalweight', value:lineWeight});
                                        rec.setCurrentSublistValue({ sublistId: 'item', fieldId: 'custcol_anc_equipment', value: line.equipment });
                                        rec.setCurrentSublistValue({sublistId:'item', fieldId:'custcol_anc_relatedtransaction', value:line.relatedtransaction});
                                        rec.setCurrentSublistValue({sublistId:'item', fieldId:'custcol_anc_relatedlineuniquekey', value:line.relatedlineuniquekey});

                                        //this only applies to shipments
                                        rec.setCurrentSublistValue({ sublistId: 'item', fieldId: 'custcol_anc_related_trans_orderline', value: line.relatedtransferorder || line.transferOrderLineIndex });

                                        if(targetLeg == 1)
                                        {
                                            rec.setCurrentSublistValue({ sublistId: 'item', fieldId: 'custcol_anc_relatedtransaction_to', value: line.relatedtransferorder ||  line.line_relatedtransferorder || line.transferOrderId || line.toInternalId || line.internalid });
                                            rec.setCurrentSublistValue({ sublistId: 'item', fieldId: 'custcol_anc_relatedlineuniquekey_to', value: line.relatedtransferorderuk || line.line_relatedtransferorderuk || line.lineUniqueKey_to || line.line_uniquekey });
                                        }
                                        else if(targetLeg == 2)
                                        {
                                            // rec.setCurrentSublistValue({ sublistId: 'item', fieldId: 'custcol_anc_relatedtransaction_to', value: line.transferOrderId || line.toInternalId || line.internalid });
                                            // rec.setCurrentSublistValue({ sublistId: 'item', fieldId: 'custcol_anc_relatedlineuniquekey_to', value: line.lineUniqueKey_to || line.line_uniquekey });
                                        }
                                        else if(targetLeg === 0 || targetLeg === "0")
                                        {
                                            // rec.setCurrentSublistValue({ sublistId: 'item', fieldId: 'custcol_anc_relatedtransaction_to', value: line.transferOrderId || line.toInternalId || line.internalid });
                                            // rec.setCurrentSublistValue({ sublistId: 'item', fieldId: 'custcol_anc_relatedlineuniquekey_to', value: line.lineUniqueKey_to || line.line_uniquekey });
                                        }
                                        else
                                        {
                                            rec.setCurrentSublistValue({ sublistId: 'item', fieldId: 'custcol_anc_relatedtransaction_to', value: line.line_relatedtransferorder || line.transferOrderId || line.toInternalId || line.internalid });
                                            rec.setCurrentSublistValue({ sublistId: 'item', fieldId: 'custcol_anc_relatedlineuniquekey_to', value: line.line_relatedtransferorderuk || line.lineUniqueKey_to || line.line_uniquekey });
                                        }

                                        rec.setCurrentSublistValue({ sublistId: 'item', fieldId: 'custcol_consignee', value: line.consignee || line.nsconsignee || line.custbody_consignee });

                                        rec.commitLine({sublistId:'item'});
                                        singleShipmentWeight += lineWeight;
                                        counter++;
                                        lineCount++;
                                    }

                                    if(targetLeg == 1)
                                    {
                                        var utilization = computeLoadUtilization(equipmentList,{line_equipment:consigneeGroups[fixedConsignee][0].line.equipment}, singleShipmentWeight);
                                        var utilStatus = computeLoadUtilizationStatus(utilization).shipmentUtilStatus;
                                        rec.setValue({fieldId:'custbody_anc_shipstatus', value:utilStatus});
                                        rec.setValue({ fieldId: 'custbody_anc_loadingefficiency', value: utilization.shipmentUtilRate });
                                        jointLoadNumber = "";
                                    }
                                    else if(targetLeg == 2)
                                    {
                                        var utilization = computeLoadUtilization(equipmentList,{line_equipment:consigneeGroups[fixedConsignee][0].line.equipment}, totalWeight);
                                        var utilStatus = computeLoadUtilizationStatus(utilization).shipmentUtilStatus;
                                        rec.setValue({fieldId:'custbody_anc_shipstatus', value:utilStatus});
                                        rec.setValue({ fieldId: 'custbody_anc_loadingefficiency', value: utilization.shipmentUtilRate });
                                    }
                                    else if(targetLeg === 0 || targetLeg === "0")
                                    {
                                        var utilization = computeLoadUtilization(equipmentList,{line_equipment:consigneeGroups[fixedConsignee][0].line.equipment}, totalWeight);
                                        var utilStatus = computeLoadUtilizationStatus(utilization).shipmentUtilStatus;
                                        rec.setValue({fieldId:'custbody_anc_shipstatus', value:utilStatus});
                                        rec.setValue({ fieldId: 'custbody_anc_loadingefficiency', value: utilization.shipmentUtilRate });
                                    }
                                    else
                                    {
                                        var utilization = computeLoadUtilization(equipmentList,{line_equipment:consigneeGroups[fixedConsignee][0].line.equipment}, singleShipmentWeight);
                                        var utilStatus = computeLoadUtilizationStatus(utilization).shipmentUtilStatus;
                                        rec.setValue({fieldId:'custbody_anc_shipstatus', value:utilStatus});
                                        rec.setValue({ fieldId: 'custbody_anc_loadingefficiency', value: utilization.shipmentUtilRate });
                                        jointLoadNumber = "";
                                    }
                                    if (jointLoadNumber) rec.setValue({fieldId:'custbody_anc_jointloadnumber', value: jointLoadNumber});



                                }
                                else {


                                    //reset totalweight
                                    var totalWeight = 0;
                                    var targetLeg = shipmentGroup.request.leg;

                                    if (targetLeg == 1) {
                                        createShipment_leg1({rec, line, shipmentGroup, consigneeGroups, totalWeight, counter, lineCount});
                                    }
                                    else if (targetLeg == 2) {
                                        log.debug("order check button, line", line)
                                        createShipment_leg2({rec, line, shipmentGroup, consigneeGroups, totalWeight, counter, lineCount});
                                        if(soIds && !soIds.includes(line.internalid))
                                        {
                                            soIds.push(line.internalid)
                                        }
                                    }
                                    else{
                                        createShipment_leg0({rec, line, shipmentGroup, consigneeGroups, totalWeight, counter, lineCount});
                                    }

                                    if(jointLoadNumber && jointLoadNumber.includes("-"))
                                    {
                                        rec.setValue({ fieldId : 'custbody_anc_jointloadnumber', value : jointLoadNumber });
                                    }
                                }


                                // if(lineCount)
                                // {
                                    const shipmentId = rec.save({ ignoreMandatoryFields: true });
                                    log.audit('✅ Shipment Created', shipmentId);

                                    const shipmentRec = record.load({
                                        type: 'customsale_anc_shipment',
                                        id: shipmentId,
                                        isDynamic: false
                                    });

                                    const numLines = shipmentRec.getLineCount({ sublistId: 'item' });
                                    for (let i = 0; i < numLines; i++) {
                                        const soId = shipmentRec.getSublistValue({ sublistId: 'item', fieldId: 'custcol_anc_relatedtransaction', line: i });
                                        const soLineKey = shipmentRec.getSublistValue({ sublistId: 'item', fieldId: 'custcol_anc_relatedlineuniquekey', line: i });
                                        const shipmentLineKey = shipmentRec.getSublistValue({ sublistId: 'item', fieldId: 'lineuniquekey', line: i });
                                        if (!soId || !soLineKey) continue;

                                        if (!soUpdateMap[soId]) soUpdateMap[soId] = {};
                                        if (!soUpdateMap[soId][soLineKey]) soUpdateMap[soId][soLineKey] = [];
                                        soUpdateMap[soId][soLineKey].push({
                                            shipmentInternalId: String(shipmentId),
                                            shipmentLineUniqueKey: String(shipmentLineKey)
                                        });
                                    }
                                // }
                            }
                        }


                    }

                    for (const soId in soUpdateMap) {
                        try {
                            const soRec = record.load({
                                type: record.Type.SALES_ORDER,
                                id: soId,
                                isDynamic: false
                            });

                            var lineCount = soRec.getLineCount({ sublistId: 'item' });
                            for (let j = 0; j < lineCount; j++) {
                                const soLineKey = soRec.getSublistValue({
                                    sublistId: 'item',
                                    fieldId: 'lineuniquekey',
                                    line: j
                                });
                                if (!soLineKey || !soUpdateMap[soId][soLineKey]) continue;

                                let existingLinks = soRec.getSublistValue({
                                    sublistId: 'item',
                                    fieldId: 'custcol_anc_relatedshipments',
                                    line: j
                                }) || '[]';

                                let parsedLinks = [];
                                try { parsedLinks = JSON.parse(existingLinks); } catch (_) { parsedLinks = []; }

                                parsedLinks = soUpdateMap[soId][soLineKey];
                                // parsedLinks.push(...soUpdateMap[soId][soLineKey]); //do not accumulate shipments anymore

                                soRec.setSublistValue({
                                    sublistId: 'item',
                                    fieldId: 'custcol_anc_relatedshipments',
                                    line: j,
                                    value: JSON.stringify(parsedLinks)
                                });
                            }
                            soRec.save({ ignoreMandatoryFields: true });

                        } catch (e) {
                            log.error('❌ Error Updating Sales Order', { soId, error: e });
                        }


                    }

                }
            } catch (e) {
                log.error("ERROR in function processDeferredResponse2", e);
            }
        }

        function createShipment_leg2({rec, line, shipmentGroup, consigneeGroups, totalWeight, counter, lineCount})
        {


            log.debug("processDeferredResponse2 leg2")
            log.debug("processDeferredResponse2 line", line)
            entity = line.entity || line.body_entity || 549160;
            location = line.lane_cdw || line.custrecord_anc_lane_cdw || line.custrecord_anc_lane_cdw;
            consignee = line.consignee || line.nsconsignee || line.custbody_ns_consignee || line.line_consignee || line.custbody_consignee;
            deliveryDate = line.deliverydate || line.line_deliverydate;
            shipDate = line.shipdate || line.line_shipdate;
            equipment = line.equipment || line.line_equipment;
            originWarehouse = line.lane_cdw || line.custrecord_anc_lane_cdw || line.custrecord_anc_lane_cdw;
            custcol_anc_shippinglane = line.lane || line.custcol_anc_shippinglane || line.custbody_anc_lane; //09042025 secondary source, useful for deconstructing shipments where source is no longer at transactionline but shipmentheader

            var targetLeg = shipmentGroup.request.leg;

            if (entity) rec.setValue({fieldId: 'entity', value: entity});

            //TODO sort this out, do the conditions from here, not from when data is being stored on syncjob
            //TODO this is the practical approach so that the other portion is just about retrieving data
            //TODO refactor the variables later on, example originWarehouse is from SO.column.lane
            //TODO it is better to have conditions and dedicated keys rather than fallback via || operator
            if (targetLeg == 2) {
                //loadplanning leg1, same no impact
                if (shipmentGroup.request.followLeg) {
                    if (location) rec.setValue({
                        fieldId: 'location',
                        value: location
                    });
                    if (originWarehouse) rec.setValue({
                        fieldId: 'custbody_anc_originlocation',
                        value: location
                    });
                } else {
                    if (location) rec.setValue({
                        fieldId: 'location',
                        value: location
                    });
                    if (originWarehouse) rec.setValue({
                        fieldId: 'custbody_anc_originlocation',
                        value: location
                    });
                }
            }

            if (deliveryDate) rec.setText({
                fieldId: 'custbody_anc_deliverydate',
                text: deliveryDate
            });
            if (shipDate) rec.setText({
                fieldId: 'custbody_anc_shipdate',
                text: shipDate
            });

            if (targetLeg == 2) {
                if (consignee) rec.setValue({
                    fieldId: 'custbody_consignee',
                    value: consignee
                });
                if (line.nsconsignee) rec.setValue({
                    fieldId: 'custbody_ns_consignee',
                    value: line.nsconsignee
                });
            }

            rec.setValue({
                fieldId: 'custbody_anc_shipment_leg',
                value: targetLeg || shipmentGroup.request.leg || line.leg || line.custbody_anc_shipment_leg || 0
            });
            // if(shipmentGroup.request.followLeg)
            // {
            //     //force follow the leg defined, since this is from loadplanning/deconstruction
            //     rec.setValue({ fieldId: 'custbody_anc_shipment_leg', value: shipmentGroup.request.leg || line.leg || line.custbody_anc_shipment_leg });
            // }
            // else
            // {
            //     // ✅ Pick the leg from the sync-job detail (opts / legOverride), else fall back
            //     const legToUse = resolveLeg(opts, shipmentGroup, line);
            //     rec.setValue({ fieldId: 'custbody_anc_shipment_leg', value: legToUse || 1 });
            // }


            if (equipment) rec.setValue({
                fieldId: 'custbody_anc_equipment',
                value: equipment
            });

            if (custcol_anc_shippinglane) rec.setValue({
                fieldId: 'custbody_anc_lane',
                value: custcol_anc_shippinglane
            });

            for (const {item, line} of consigneeGroups[consignee]) {


                log.debug("processDeferredResponse2 targetLeg2 {item, line}", {item, line})

                qty = item.nb
                var lineWeight = qty * (line.actualitem_weight || line.item_weight || 1);
                //08262025 fix retrieval of weight TODO it used to be based on basis weight but later. weight should be
                // sourced from new fields Bashar set up

                totalWeight += lineWeight;
                log.debug("{lineWeight, qty, line.line_item_basis_weight, totalWeight}}", totalWeight)

                rec.selectNewLine({sublistId: 'item'});
                // rec.selectLine({ sublistId: 'item', line : counter });
                rec.setCurrentSublistValue({
                    sublistId: 'item',
                    fieldId: 'item',
                    value: TEMPORARY_SHIPMENT_ITEM
                });
                rec.setCurrentSublistValue({
                    sublistId: 'item',
                    fieldId: 'quantity',
                    value: item.nb
                });
                rec.setCurrentSublistValue({sublistId: 'item', fieldId: 'rate', value: 0});
                rec.setCurrentSublistValue({
                    sublistId: 'item',
                    fieldId: 'custcol_anc_actualitemtobeshipped',
                    value: line.item
                });
                rec.setCurrentSublistValue({
                    sublistId: 'item',
                    fieldId: 'custcol_consignee',
                    value: consignee
                });
                rec.setCurrentSublistValue({
                    sublistId: 'item',
                    fieldId: 'custcol_anc_relatedtransaction',
                    value: line.internalid
                });
                rec.setCurrentSublistValue({
                    sublistId: 'item',
                    fieldId: 'custcol_anc_relatedlineuniquekey',
                    value: line.uniquekey
                });
                rec.setCurrentSublistValue({
                    sublistId: 'item',
                    fieldId: 'custcol_anc_shipment_linetotalweight',
                    value: lineWeight
                });
                rec.setCurrentSublistValue({
                    sublistId: 'item',
                    fieldId: 'custcol_anc_equipment',
                    value: line.equipment
                });

                rec.setCurrentSublistValue({
                    sublistId: 'item',
                    fieldId: 'custcol_anc_related_trans_orderline',
                    value: line.relatedtransferorder || line.transferOrderLineIndex
                });

                rec.setCurrentSublistValue({
                    sublistId: 'item',
                    fieldId: 'custcol_consignee',
                    value: line.consignee || line.nsconsignee || line.custbody_consignee
                });

                rec.commitLine({sublistId: 'item'});
                counter++;
                log.debug(`counter`, counter)
                log.debug(`rec.getLineCount({sublistId : "item"})`, rec.getLineCount({sublistId: "item"}))
                lineCount++;
            }
            const utilization = computeLoadUtilization(equipmentList, {line_equipment: consigneeGroups[consignee][0].line.equipment}, totalWeight);
            const utilStatus = computeLoadUtilizationStatus(utilization).shipmentUtilStatus;
            rec.setValue({fieldId: 'custbody_anc_shipstatus', value: utilStatus});

            rec.setValue({
                fieldId: 'custbody_anc_loadingefficiency',
                value: utilization.shipmentUtilRate
            });



        }

        function createShipment_leg1({rec, line, shipmentGroup, consigneeGroups, totalWeight, counter, lineCount})
        {
            log.debug("processDeferredResponse2 leg1")
            entity = line.entity || line.body_entity || 549160;
            location = line.location || 9;
            consignee = line.nsconsignee || line.consignee || 306041;
            consigneeX = line.consignee || line.nsconsignee || 306041;
            deliveryDate = line.deliverydate || line.line_deliverydate;
            shipDate = line.shipdate || line.line_shipdate;
            equipment = line.equipment || line.line_equipment;
            originWarehouse = line.lane_cdw || line.custrecord_anc_lane_cdw || line.custrecord_anc_lane_cdw;
            custcol_anc_shippinglane = line.lane || line.custcol_anc_shippinglane || line.custbody_anc_lane; //09042025 secondary source, useful for deconstructing shipments where source is no longer at transactionline but shipmentheader
            var targetLeg = shipmentGroup.request.leg;
            if (entity) rec.setValue({fieldId: 'entity', value: entity});

            //loadplanning leg1, same no impact
            if (shipmentGroup.request.followLeg) {
                if (location) rec.setValue({
                    fieldId: 'location',
                    value: location
                });
                if (originWarehouse) rec.setValue({
                    fieldId: 'custbody_anc_originlocation',
                    value: location
                });
            } else {
                if (location) rec.setValue({
                    fieldId: 'location',
                    value: location
                });
                if (originWarehouse) rec.setValue({
                    fieldId: 'custbody_anc_originlocation',
                    value: location
                });
            }

            if (deliveryDate) rec.setText({
                fieldId: 'custbody_anc_deliverydate',
                text: deliveryDate
            });
            if (shipDate) rec.setText({
                fieldId: 'custbody_anc_shipdate',
                text: shipDate
            });

            //whichever consignee is available. TODO refactor so that it is specific than fallbacks?
            //FIXME why are you falling back to harccoded 1, you will not reach that code because its already checking if variable is valid
            if (consignee) rec.setValue({
                fieldId: 'custbody_ns_consignee',
                value: consignee || 1
            });

            rec.setValue({
                fieldId: 'custbody_anc_shipment_leg',
                value: targetLeg || shipmentGroup.request.leg || line.leg || line.custbody_anc_shipment_leg || 0
            });

            if (equipment) rec.setValue({
                fieldId: 'custbody_anc_equipment',
                value: equipment
            });

            if (custcol_anc_shippinglane) rec.setValue({
                fieldId: 'custbody_anc_lane',
                value: custcol_anc_shippinglane
            });




            for (const {item, line} of consigneeGroups[consignee || consigneeX]) {
                qty = item.nb
                var lineWeight = qty * (line.actualitem_weight || line.item_weight || 1);
                //08262025 fix retrieval of weight TODO it used to be based on basis weight but later. weight should be
                // sourced from new fields Bashar set up

                totalWeight += lineWeight;
                log.debug("{lineWeight, qty, line.line_item_basis_weight, totalWeight}}", totalWeight)

                rec.selectNewLine({sublistId: 'item'});
                // rec.selectLine({ sublistId: 'item', line : counter });
                rec.setCurrentSublistValue({
                    sublistId: 'item',
                    fieldId: 'item',
                    value: TEMPORARY_SHIPMENT_ITEM
                });
                rec.setCurrentSublistValue({
                    sublistId: 'item',
                    fieldId: 'quantity',
                    value: item.nb
                });
                rec.setCurrentSublistValue({sublistId: 'item', fieldId: 'rate', value: 0});
                rec.setCurrentSublistValue({
                    sublistId: 'item',
                    fieldId: 'custcol_anc_actualitemtobeshipped',
                    value: line.actualitem || line.line_item || line.line_tempitem || line.itemId
                });
                rec.setCurrentSublistValue({
                    sublistId: 'item',
                    fieldId: 'custcol_consignee',
                    value: consignee
                });
                rec.setCurrentSublistValue({
                    sublistId: 'item',
                    fieldId: 'custcol_anc_relatedtransaction',
                    value: line.relatedtransaction || line.custcol_anc_relatedtransaction || line.internalid
                });
                rec.setCurrentSublistValue({
                    sublistId: 'item',
                    fieldId: 'custcol_anc_relatedlineuniquekey',
                    value: line.relatedlineuniquekey || line.custcol_anc_relatedlineuniquekey || line.line_uniquekey || line.salesOrderLineKey
                });
                rec.setCurrentSublistValue({
                    sublistId: 'item',
                    fieldId: 'custcol_anc_shipment_linetotalweight',
                    value: lineWeight
                });
                rec.setCurrentSublistValue({
                    sublistId: 'item',
                    fieldId: 'custcol_anc_equipment',
                    value: line.equipment
                });

                rec.setCurrentSublistValue({
                    sublistId: 'item',
                    fieldId: 'custcol_anc_related_trans_orderline',
                    value: line.relatedtransferorder || line.transferOrderLineIndex
                });


                if (targetLeg == 1) {

                    rec.setCurrentSublistValue({
                        sublistId: 'item',
                        fieldId: 'custcol_anc_relatedtransaction_to',
                        value: line.internalid
                    });
                    rec.setCurrentSublistValue({
                        sublistId: 'item',
                        fieldId: 'custcol_anc_relatedlineuniquekey_to',
                        value: line.uniquekey || line.line_uniquekey
                    });
                } else {
                    // rec.setCurrentSublistValue({ sublistId: 'item', fieldId: 'custcol_anc_relatedtransaction_to', value: line.transferOrderId || line.toInternalId || line.internalid });
                    // rec.setCurrentSublistValue({ sublistId: 'item', fieldId: 'custcol_anc_relatedlineuniquekey_to', value: line.lineUniqueKey_to || line.line_uniquekey });
                }

                rec.setCurrentSublistValue({
                    sublistId: 'item',
                    fieldId: 'custcol_consignee',
                    value: line.consignee || line.nsconsignee || line.custbody_consignee || consigneeX
                });

                rec.commitLine({sublistId: 'item'});
                counter++;
                log.debug(`counter`, counter)
                log.debug(`rec.getLineCount({sublistId : "item"})`, rec.getLineCount({sublistId: "item"}))
                lineCount++;

            }

            const utilization = computeLoadUtilization(equipmentList, {line_equipment: consigneeGroups[consignee || consigneeX][0].line.equipment}, totalWeight);
            const utilStatus = computeLoadUtilizationStatus(utilization).shipmentUtilStatus;
            rec.setValue({fieldId: 'custbody_anc_shipstatus', value: utilStatus});

            rec.setValue({
                fieldId: 'custbody_anc_loadingefficiency',
                value: utilization.shipmentUtilRate
            });
        }

        function createShipment_leg0({rec, line, shipmentGroup, consigneeGroups, totalWeight, counter, lineCount})
        {
            log.debug("followleg jointloads")
            entity = line.entity || line.body_entity || 549160;
            location = line.location;
            consignee = line.consignee || line.nsconsignee || line.custbody_ns_consignee || line.line_consignee || line.custbody_consignee;
            deliveryDate = line.deliverydate || line.line_deliverydate;
            shipDate = line.shipdate || line.line_shipdate;
            equipment = line.equipment || line.line_equipment;
            originWarehouse = line.location;
            custcol_anc_shippinglane = line.lane || line.custcol_anc_shippinglane || line.custbody_anc_lane; //09042025 secondary source, useful for deconstructing shipments where source is no longer at transactionline but shipmentheader

            var targetLeg = shipmentGroup.request.leg;

            if (entity) rec.setValue({fieldId: 'entity', value: entity});

            if (shipmentGroup.request.followLeg) {
                if (location) rec.setValue({
                    fieldId: 'location',
                    value: location
                });
                if (originWarehouse) rec.setValue({
                    fieldId: 'custbody_anc_originlocation',
                    value: location
                });
            } else {
                if (location) rec.setValue({
                    fieldId: 'location',
                    value: location
                });
                if (originWarehouse) rec.setValue({
                    fieldId: 'custbody_anc_originlocation',
                    value: location
                });
            }

            if (deliveryDate) rec.setText({
                fieldId: 'custbody_anc_deliverydate',
                text: deliveryDate
            });
            if (shipDate) rec.setText({
                fieldId: 'custbody_anc_shipdate',
                text: shipDate
            });

            if (consignee) rec.setValue({
                fieldId: 'custbody_consignee',
                value: consignee
            });
            if (line.nsconsignee) rec.setValue({
                fieldId: 'custbody_ns_consignee',
                value: line.nsconsignee
            });

            rec.setValue({
                fieldId: 'custbody_anc_shipment_leg',
                value: targetLeg || shipmentGroup.request.leg || line.leg || line.custbody_anc_shipment_leg || 0
            });
            // if(shipmentGroup.request.followLeg)
            // {
            //     //force follow the leg defined, since this is from loadplanning/deconstruction
            //     rec.setValue({ fieldId: 'custbody_anc_shipment_leg', value: shipmentGroup.request.leg || line.leg || line.custbody_anc_shipment_leg });
            // }
            // else
            // {
            //     // ✅ Pick the leg from the sync-job detail (opts / legOverride), else fall back
            //     const legToUse = resolveLeg(opts, shipmentGroup, line);
            //     rec.setValue({ fieldId: 'custbody_anc_shipment_leg', value: legToUse || 1 });
            // }


            if (equipment) rec.setValue({
                fieldId: 'custbody_anc_equipment',
                value: equipment
            });

            if (custcol_anc_shippinglane) rec.setValue({
                fieldId: 'custbody_anc_lane',
                value: custcol_anc_shippinglane
            });

            for (const {item, line} of consigneeGroups[consignee]) {
                qty = item.nb
                var lineWeight = qty * (line.actualitem_weight || line.item_weight || 1);
                //08262025 fix retrieval of weight TODO it used to be based on basis weight but later. weight should be
                // sourced from new fields Bashar set up

                totalWeight += lineWeight;
                log.debug("{lineWeight, qty, line.line_item_basis_weight, totalWeight}}", totalWeight)

                rec.selectNewLine({sublistId: 'item'});
                // rec.selectLine({ sublistId: 'item', line : counter });
                rec.setCurrentSublistValue({
                    sublistId: 'item',
                    fieldId: 'item',
                    value: TEMPORARY_SHIPMENT_ITEM
                });
                rec.setCurrentSublistValue({
                    sublistId: 'item',
                    fieldId: 'quantity',
                    value: item.nb
                });
                rec.setCurrentSublistValue({sublistId: 'item', fieldId: 'rate', value: 0});
                rec.setCurrentSublistValue({
                    sublistId: 'item',
                    fieldId: 'custcol_anc_actualitemtobeshipped',
                    value: line.item
                });
                rec.setCurrentSublistValue({
                    sublistId: 'item',
                    fieldId: 'custcol_consignee',
                    value: consignee
                });
                rec.setCurrentSublistValue({
                    sublistId: 'item',
                    fieldId: 'custcol_anc_relatedtransaction',
                    value: line.internalid
                });
                rec.setCurrentSublistValue({
                    sublistId: 'item',
                    fieldId: 'custcol_anc_relatedlineuniquekey',
                    value: line.uniquekey
                });
                rec.setCurrentSublistValue({
                    sublistId: 'item',
                    fieldId: 'custcol_anc_shipment_linetotalweight',
                    value: lineWeight
                });
                rec.setCurrentSublistValue({
                    sublistId: 'item',
                    fieldId: 'custcol_anc_equipment',
                    value: line.equipment
                });

                rec.setCurrentSublistValue({
                    sublistId: 'item',
                    fieldId: 'custcol_anc_related_trans_orderline',
                    value: line.relatedtransferorder || line.transferOrderLineIndex
                });

                rec.setCurrentSublistValue({
                    sublistId: 'item',
                    fieldId: 'custcol_consignee',
                    value: line.consignee || line.nsconsignee || line.custbody_consignee
                });

                rec.commitLine({sublistId: 'item'});
                counter++;
                log.debug(`counter`, counter)
                log.debug(`rec.getLineCount({sublistId : "item"})`, rec.getLineCount({sublistId: "item"}))
                lineCount++;
            }
            const utilization = computeLoadUtilization(equipmentList, {line_equipment: consigneeGroups[consignee][0].line.equipment}, totalWeight);
            const utilStatus = computeLoadUtilizationStatus(utilization).shipmentUtilStatus;
            rec.setValue({fieldId: 'custbody_anc_shipstatus', value: utilStatus});

            rec.setValue({
                fieldId: 'custbody_anc_loadingefficiency',
                value: utilization.shipmentUtilRate
            });
        }

        function buildShipmentGroups(syncJobId) {
            const syncJobRec = record.load({ type: 'customrecord_anc_syncjob', id: syncJobId });
            var lineCount = syncJobRec.getLineCount({ sublistId: 'recmachcustrecord_anc_syncjobdet_syncjob' });

            const list = [];
            for (let i = 0; i < lineCount; i++) {
                const syncDetailRecInternalid = syncJobRec.getSublistValue({
                    sublistId: 'recmachcustrecord_anc_syncjobdet_syncjob',
                    fieldId: 'id',
                    line: i,
                });
                const groupName = syncJobRec.getSublistValue({
                    sublistId: 'recmachcustrecord_anc_syncjobdet_syncjob',
                    fieldId: 'name',
                    line: i,
                });

                let groupData = syncJobRec.getSublistValue({
                    sublistId: 'recmachcustrecord_anc_syncjobdet_syncjob',
                    fieldId: 'custrecord_anc_syncjobdet_request',
                    line: i,
                });
                if (!groupData) continue;

                groupData = JSON.parse(groupData);

                // ✅ Read the leg override directly from the stored detail JSON
                // Use `forceLeg` if present (e.g., { "forceLeg": 1 } in the stored request JSON)
                const legOverride = (groupData && groupData.forceLeg != null)
                    ? String(groupData.forceLeg)
                    : null;

                // Keep existing behavior, but annotate list items and include metadata we need
                groupData.list = (groupData.list || []).map((elem) => {
                    elem.syncDetailRecInternalid = syncDetailRecInternalid;
                    elem.syncDetailParentRecInternalid = syncJobRec.id;
                    elem.correlationId = syncDetailRecInternalid;
                    if (legOverride != null) elem.forceLeg = legOverride; // light per-line hint
                    return elem;
                });

                // Expose legOverride at the group level for later use
                list.push({ syncDetailRecInternalid, groupName, groupData, legOverride });
            }
            return list;
        }


        var ANC_lib = null;
        function processGroup(shipmentGroup, prefer_few_payload) {
            try {
                const shipmentLineIdTracker = {};
                const groupList = (shipmentGroup.groupData && shipmentGroup.groupData.list) ? shipmentGroup.groupData.list : [];
                const groupByLineKey = ANC_lib ? ANC_lib.groupBy(groupList, 'line_uniquekey') : groupBy(groupList, 'line_uniquekey');

                const fitmentResponse = ANC_lib
                    ? ANC_lib.getFitmentResponse(groupList, shipmentLineIdTracker, prefer_few_payload)
                    : getFitmentResponse(groupList, shipmentLineIdTracker, prefer_few_payload);

                log.debug(`processGroup fitmentResponse`, fitmentResponse)
                return fitmentResponse;

                // ✅ NEW: carry the stored override (if any) to downstream shipment creation
                const opts = {};
                if (shipmentGroup.legOverride != null) opts.leg = String(shipmentGroup.legOverride);
                else if (shipmentGroup.groupData && shipmentGroup.groupData.forceLeg != null) opts.leg = String(shipmentGroup.groupData.forceLeg);

                // If your flow calls processDeferredResponse here, pass opts.
                // If your flow calls it elsewhere, the signature now accepts opts safely.
                (ANC_lib ? ANC_lib.processDeferredResponse : processDeferredResponse)(fitmentResponse, { [shipmentGroup.groupName || 'G']: [shipmentGroup] }, opts);

                return [];


                // const fitmentResponse = ANC_lib
                //     ? ANC_lib.getFitmentResponse(groupList, shipmentLineIdTracker)
                //     : getFitmentResponse(groupList, shipmentLineIdTracker);
                //
                // const fitmentResponseList = fitmentResponse.list || [];
                // if (!fitmentResponseList.length) return [];
                //
                // // ✅ NEW: carry the stored override (if any) to downstream shipment creation
                // const opts = {};
                // if (shipmentGroup.legOverride != null) opts.leg = String(shipmentGroup.legOverride);
                // else if (shipmentGroup.groupData && shipmentGroup.groupData.forceLeg != null) opts.leg = String(shipmentGroup.groupData.forceLeg);
                //
                // // If your flow calls processDeferredResponse here, pass opts.
                // // If your flow calls it elsewhere, the signature now accepts opts safely.
                // (ANC_lib ? ANC_lib.processDeferredResponse : processDeferredResponse)(fitmentResponse, { [shipmentGroup.groupName || 'G']: [shipmentGroup] }, opts);
                //
                // return [];

            } catch (e) {
                log.error('ERROR in processGroup()', e);
                return [];
            }
        }


        function capitalizeFirstLetter(str) {
            if (typeof str !== 'string' || str.length === 0) {
                return str; // Handle non-string or empty input
            }
            return str.charAt(0).toUpperCase() + str.slice(1).toLowerCase();
        }

        function resolveLeg(opts, shipmentGroup, line) {
            // Highest priority: explicit override coming from the sync-job detail
            log.debug(`resolveLeg opts`, opts)
            log.debug(`resolveLeg shipmentGroup`, shipmentGroup)
            log.debug(`resolveLeg line`, line)


            // If the group built from the sync-job detail carries an override
            if (shipmentGroup && shipmentGroup.request && shipmentGroup.request.leg != null) return String(shipmentGroup.request.leg);

            if (opts && opts.leg != null) return String(opts.leg);

            // If the group built from the sync-job detail carries an override
            if (shipmentGroup && shipmentGroup.legOverride != null) return String(shipmentGroup.legOverride);



            // If any per-line override was propagated
            if (line && line.forceLeg != null) return String(line.forceLeg);

            // Fall back to existing grouping hints (keeps legacy behavior safe)
            if (shipmentGroup && shipmentGroup.request) {
                if (shipmentGroup.request.leg2) return '2';
                if (shipmentGroup.request.leg1) return '1';
                if (shipmentGroup.request.leg0) return '0';
                if (shipmentGroup.request.leg) return shipmentGroup.request.leg;
                shipmentGroup.request
            }
            return '2';
        }

        function submitSyncJob_orderCheck(srGroupedByDeliveryDate)
        {
            var recObj = record.create({
                type : "customrecord_anc_syncjob",
            });
            recObj.setValue({
                fieldId : "name",
                value : new Date().getTime()
            })
            recObj.setValue({
                fieldId : "custrecord_anc_syncjob_request",
                value : JSON.stringify(srGroupedByDeliveryDate, null, "\t").substring(0, 999999)
            })

            var lineCounter = 0;
            for(var groupKey in srGroupedByDeliveryDate)
            {
                log.debug("groupKey", groupKey)
                recObj.setSublistValue({
                    sublistId : "recmachcustrecord_anc_syncjobdet_syncjob",
                    fieldId : "name",
                    line : lineCounter,
                    value : groupKey
                })

                recObj.setSublistValue({
                    sublistId : "recmachcustrecord_anc_syncjobdet_syncjob",
                    fieldId : "custrecord_anc_syncjobdet_request",
                    line : lineCounter,
                    value : JSON.stringify(srGroupedByDeliveryDate[groupKey], null, "\t").substring(0, 999999)
                })
                lineCounter++;
            }

            var customJobId = recObj.save();
            log.debug("customJobId", customJobId);


            var recObj = record.load({
                type : "customrecord_anc_syncjob",
                id : customJobId
            })
            var lineCounter = 0;
            for(var groupKey in srGroupedByDeliveryDate)
            {
                var syncJobDetailInternald = recObj.getSublistValue({
                    sublistId : "recmachcustrecord_anc_syncjobdet_syncjob",
                    fieldId : "id",
                    line : lineCounter,
                    value : groupKey
                })

                srGroupedByDeliveryDate[groupKey].syncJobDetailInternald = syncJobDetailInternald;
                // srGroupedByDeliveryDate[groupKey].syncJobDetailInternald.list[0].syncJobDetailInternald = syncJobDetailInternald;
                lineCounter++;


                log.debug("srGroupedByDeliveryDate[groupKey]", srGroupedByDeliveryDate[groupKey]);
            }

            // var customJobId = recObj.save();
            // log.debug("customJobId", customJobId);


            log.debug("srGroupedByDeliveryDate", srGroupedByDeliveryDate);



            return customJobId;
        }

        function processJobId(customJobId)
        {
            // redirect directly to ANC_SL_loadXpert.js
            var resp = https.requestSuitelet({
                scriptId : "customscript_anc_sl_loadxpert",
                deploymentId : "customdeploy_anc_sl_loadxpert",
                urlParams : {
                    "custscript_anc_mr_fitment_syncjobid" : customJobId,
                    "rectype" : "transferorder"
                }
            })

            log.debug("resp", resp);

            log.debug('REDIRECTED SUCCESSFULLY', {
                scriptId: 'customscript_anc_sl_loadxpert',
                deploymentId: 'customdeploy_anc_sl_loadxpert',
                parameters: {
                    custscript_anc_mr_fitment_syncjobid: customJobId
                }
            });

// no need to return fitmentJobObj here, because control flow
// will jump to the ANC_SL_loadXpert suitelet.


// store call summary back on the sync job (re-using your MR job field)
            record.submitFields({
                type: 'customrecord_anc_syncjob',
                id: customJobId,
                values: {
                    custrecord_anc_syncjob_mrjob: JSON.stringify({
                        scriptId : "customscript_anc_sl_loadxpert",
                        deploymentId : "customdeploy_anc_sl_loadxpert",
                        urlParams : {
                            "custscript_anc_mr_fitment_syncjobid" : customJobId,
                            "rectype" : "transferorder"
                        }
                    }, null, '\t')
                }
            });
        }

        function standardizeObjectKeysByProcess(srToObjects, processtype) {
            var standardized_srToObjects = [];
            try {
                if (processtype === "loadplanning") {
                    for (var a = 0; a < srToObjects.length; a++) {
                        var sourceObj = srToObjects[a];
                        var standardized_srToObject = {};

                        for (var key in sourceObj) {
                            if (!sourceObj.hasOwnProperty(key)) continue;

                            if (key.startsWith("body_")) {
                                var strippedKey = key.substring(5);
                                standardized_srToObject[strippedKey] = sourceObj[key];

                                // only set if no line_ value already exists
                                if (!standardized_srToObject[strippedKey]) {
                                    standardized_srToObject[strippedKey] = sourceObj[key];
                                }
                                log.debug("loadplanning {key,standardized_srToObject}", {key,standardized_srToObject});
                            }
                            else if (key.startsWith("line_")) {
                                var strippedKey = key.substring(5);
                                if(sourceObj[key])
                                {
                                    standardized_srToObject[strippedKey] = sourceObj[key];
                                }
                            }
                        }

                        standardized_srToObjects.push(standardized_srToObject);
                    }
                }
                //TODO
                else if (processtype === "ordercheck") {
                    for (var a = 0; a < srToObjects.length; a++) {
                        var sourceObj = srToObjects[a];
                        var standardized_srToObject = {};

                        for (var key in sourceObj) {
                            if (!sourceObj.hasOwnProperty(key)) continue;

                            if (key.startsWith("line_")) {
                                var strippedKey = key.substring(5);
                                if(sourceObj[key])
                                {
                                    standardized_srToObject[strippedKey] = sourceObj[key];
                                }
                            }
                            else if (key.startsWith("body_")) {
                                var strippedKey = key.substring(5);

                                // only set if no line_ value already exists
                                if (!standardized_srToObject[strippedKey]) {
                                    standardized_srToObject[strippedKey] = sourceObj[key];
                                }
                                log.debug("ordercheck {key,standardized_srToObject}", {key,standardized_srToObject});
                            }
                        }

                        standardized_srToObjects.push(standardized_srToObject);
                    }
                }
                //TODO
                else if (processtype === "prerelease") {
                    for (var a = 0; a < srToObjects.length; a++) {
                        var sourceObj = srToObjects[a];
                        var standardized_srToObject = {};

                        for (var key in sourceObj) {
                            if (!sourceObj.hasOwnProperty(key)) continue;

                            if (key.startsWith("line_")) {
                                var strippedKey = key.substring(5);
                                if(sourceObj[key])
                                {
                                    standardized_srToObject[strippedKey] = sourceObj[key];
                                }
                            }
                            else if (key.startsWith("body_")) {
                                var strippedKey = key.substring(5);

                                // only set if no line_ value already exists
                                if (!standardized_srToObject[strippedKey]) {
                                    standardized_srToObject[strippedKey] = sourceObj[key];
                                }
                                log.debug("prerelease {key,standardized_srToObject}", {key,standardized_srToObject});
                            }
                        }

                        standardized_srToObjects.push(standardized_srToObject);
                    }
                }
            } catch (e) {
                log.error("ERROR in function standardizeObjectKeysByProcess", e);
            }
            return standardized_srToObjects;
        }

        // Build the API exactly as before...
        const api = {
            toMDY,
            groupBy,
            groupByKeys,
            getResults,
            getRelatedForecasts,
            references,
            getForecastFilters,
            yearMapping,
            submitIntegrationLog,
            MINIMIZE_UI,
            FREIGHTINVOICE,
            PTMX,
            getFitmentResponse,
            generateShipments,
            groupOrderLinesForShipmentGeneration, //surely used 0904
            groupTransferOrderLinesByOriginAndCrossdock, //used by ANC_SL_SALES_PROCESSES.js
            getLoadDetails,
            prepLoad,
            CA_TAXCODE_MAPPING_BY_STATE_CODE,
            querySoPastLdc,
            syncLinesPastLdc,
            callPastLdcUrl,
            updateLinesPastLdc,
            salesForecastJobFolderId,
            getRelatedShipCap,
            getShipmentLocs,
            getRelatedProdCap,
            getRelatedShipments,
            addLeadingZeroToMonths,
            getEquipmentList,
            searchConsignee_id,
            searchCustomer_id,
            computeLoadUtilization,
            computeLoadUtilizationStatus,
            prepareOrderPayload,
            getShipmentsAndOrders,
            fitmentJobScript,
            findLeg2Shipments,
            createTransferOrder,
            tagTransferOrderLines,
            groupLinesForLeg1ShipmentGeneration, //no longer used by ANC_SL_FITMENT_CHECKING.js, changed to groupOrderLinesForShipmentGeneration, mike dont want leg1 shipments to be generated based on TO not directly by leg2s
            updateSoLines,
            createGuidFromInteger,
            processDeferredResponse,
            processDeferredResponse2,
            buildShipmentGroups,
            processGroup,
            capitalizeFirstLetter,
            MARKET_SEGMENT_COUNTRY_CANONICAL, //FIXME what is this, this is AI code that didnt work
            resolveLeg,
            findConsigneeFromLocation,
            resolveLegOrigcityDestcity, //TODO to merge so there's only 1 function?
            resolveLegOrigcityDestcity_LP, //TODO to merge so there's only 1 function?
            submitSyncJob_orderCheck,
            processJobId,
            splitByConsigneeMax2,
            standardizeObjectKeysByProcess,
            GET_ICONS
        };

// NEW: auto-wrap every exported function so calls log their params
        Object.keys(api).forEach(function (k) {
            if (typeof api[k] === 'function') {
                api[k] = _wrapWithStartLog(api[k], k);
            }
        });

        return api;


    });

// getFitmentResponse sample args
// [{"internalid":"61250543","status":"pendingFulfillment","entity":"106127","line_item":"188522","line_item_parent":"188519","line_quantity":"40","line_location":"9","line_locationtext":"Lulu Island","line_id":"1","line_sequencenumber":"1","line_uniquekey":"69348155","line_number":"","line_memo":"","line_reservedqty":"","line_reservedweight":"","line_deliverydate":"04/03/2025","line_shipdate":"03/09/2025","line_consignee":"198816","line_consigneetext":"The Arizona Republic","line_equipment":"5","line_equipmenttext":"TRTAMHTR53","line_rollsperpack":"1","line_transitoptmethod":"1","line_item_basis_weight":"673.1","line_item_rolldiameter":"1","line_item_rolldiametertext":"100","line_item_rollwidth":"1","line_item_rollwidthtext":"100","custrecord_anc_lane_cde":"5","custrecord_anc_lane_lce":"6","custrecord_anc_lane_ftte":"1","custrecord_anc_lane_originwarehousecity":"WHITECOURT","custrecord_anc_lane_destinationcity":"Deer Valley","custrecord_anc_lane_crossdockcity":"Lulu Island","custrecord_anc_crossdockeligible":true,"id":"61250543","orig_line_locationtext":"ANS Paper (Summary) : ANC Whitecourt Warehouse","orig_custrecord_anc_lane_destinationcity":"Deer Valley","orig_line_location":"9","custpage_ifr_leg":"2","subtabname":"69348155","origkeys":" > TRTAMHTR53 > 03/09/2025 > ANS Paper (Summary) : ANC Whitecourt Warehouse > Deer Valley"}]
//2 orders, 2 cities(2taxation), 1 meter apart, if practical then it can be shipped in 1 go, but design and progress is not ready to tax this properl