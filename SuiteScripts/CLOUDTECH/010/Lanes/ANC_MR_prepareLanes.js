/**
 * @NApiVersion 2.1
 * @NScriptType MapReduceScript
 */
define(['/SuiteScripts/ANC_lib.js', 'N/https', 'N/query', 'N/record', 'N/runtime', 'N/search'],
    /**
     * @param{query} query
     * @param{record} record
     * @param{runtime} runtime
     * @param{search} search
     */
    (ANC_lib, https, query, record, runtime, search) => {
        /**
         * Defines the function that is executed at the beginning of the map/reduce process and generates the input data.
         * @param {Object} inputContext
         * @param {boolean} inputContext.isRestarted - Indicates whether the current invocation of this function is the first
         *     invocation (if true, the current invocation is not the first invocation and this function has been restarted)
         * @param {Object} inputContext.ObjectRef - Object that references the input data
         * @typedef {Object} ObjectRef
         * @property {string|number} ObjectRef.id - Internal ID of the record instance that contains the input data
         * @property {string} ObjectRef.type - Type of the record instance that contains the input data
         * @returns {Array|Object|Search|ObjectRef|File|Query} The input data to use in the map/reduce process
         * @since 2015.2
         */

        const getInputData = (inputContext) =>
        {
            try
            {
                //default locs
                var locs = [9, 239, 215, 245]; //TODO delete completely as soon as function getShipmentLocs is stable
                var locs = ANC_lib.getShipmentLocs();
                log.debug("getInputData getShipmentLocs locs", locs)

                //allow override
                var newLocId = runtime.getCurrentScript().getParameter({
                    name : "custscript_anc_preplanes_loc"
                });
                if(newLocId)
                {
                    var newLocRecObj = record.load({
                        type : "location",
                        id : newLocId
                    });
                    var newLocName = newLocRecObj.getValue({
                        fieldId : "name"
                    });
                    var newShipmentCapLoc = {
                        name : newLocName,
                        id : newLoc
                    }
                    locs = [newShipmentCapLoc]
                }


                locs = locs.map(function(elem){
                    return elem.id;
                })
                log.debug("getInputData map locs", locs)



                var locSr = search.create({
                    type : "location",
                    filters : [
                        ["internalid", "anyof", locs]
                    ],
                    columns : [
                        search.createColumn({
                            name : "name",
                            label : "location_name"
                        }),
                        search.createColumn({
                            name : "city",
                            label : "location_city"
                        }),
                    ]
                })

                var locsList = [];
                locSr.run().each(function(res){
                    var locObj = {};
                    locObj.id = res.id;
                    locObj.name = res.getValue({
                        name : "name",
                        label : "location_name"
                    });
                    locObj.city = res.getValue({
                        name : "city",
                        label : "location_city"
                    });
                    locsList.push(locObj);
                    return true;
                })
                log.debug("locsList", locsList);



                //TODO limit for dev stage
                // var cons = [305736, 305730, 304627];
                var consSr = search.create({
                    type : "customrecord_alberta_ns_consignee_record",
                    filters : [
                        // ["internalid", "anyof", cons],
                        // "AND",
                        ["custrecord_anc_includeinsalesforecast", "is", "T"],
                    ],
                    columns : [
                        search.createColumn({
                            name : "name",
                            label : "consignee_name"
                        }),
                        search.createColumn({
                            name : "custrecord_alberta_ns_city",
                            label : "consignee_city"
                        }),
                    ]
                })

                var consList = [];
                consSr.run().each(function(res){
                    var consObj = {};
                    consObj.id = res.id;
                    consObj.name = res.getValue({
                        name : "name",
                        label : "consignee_name"
                    });
                    consObj.city = res.getValue({
                        name : "custrecord_alberta_ns_city",
                        label : "consignee_city"
                    });
                    consList.push(consObj);
                    return true;
                })
                log.debug("consList", consList);



                // var cons = [305736, 305730];
                var lanesSr = search.create({
                    type : "customrecord_anc_shippinglanes",
                    filters : [
                        // ["internalid", "anyof", cons]
                    ],
                    columns : [
                        search.createColumn({
                            name : "name",
                            label : "lanes_name"
                        }),
                        search.createColumn({
                            name : "custrecord_anc_lane_originwarehouse",
                            label : "lanes_originwhs"
                        }),
                        search.createColumn({
                            name : "custrecord_anc_lane_originwarehousecity",
                            label : "lanes_origincity"
                        }),
                        search.createColumn({
                            name : "custrecord_anc_lane_destination",
                            label : "lanes_destwhs"
                        }),
                        search.createColumn({
                            name : "custrecord_anc_lane_destinationcity",
                            label : "lanes_destcity"
                        }),
                        search.createColumn({
                            name : "custrecord_anc_lane_cdw",
                            label : "lanes_xdwhs"
                        }),
                        search.createColumn({
                            name : "custrecord_anc_lane_crossdockcity",
                            label : "lanes_xdwhscity"
                        }),
                    ]
                })


                var laneKeys = {};
                var lanesList = [];
                lanesSr.run().each(function(res){
                    var lanesObj = {};
                    lanesObj.id = res.id;
                    for(var a = 0 ; a < lanesSr.columns.length ; a++)
                    {
                        lanesObj[lanesSr.columns[a].label] = res.getValue(lanesSr.columns[a])
                        lanesObj[lanesSr.columns[a].label + "text"] = res.getText(lanesSr.columns[a])
                    }

                    // lanesObj.lanesObj_cityroute = lanesObj.lanes_originwhs.toUpperCase() + "_" + lanesObj.lanes_destcity.toUpperCase()
                    // lanesObj.lanes_name = lanesObj.lanes_name.toUpperCase();
                    // lanesObj.fromwhstext_tocity = lanesObj.lanes_originwhstext.toUpperCase() + "_" + lanesObj.lanes_destcity.toUpperCase();
                    //
                    // lanesObj.origcitytext = lanesObj.lanes_origincity.toUpperCase() + "_" + lanesObj.lanes_destcity.toUpperCase();
                    lanesObj.origcity_destcitytext = lanesObj.lanes_origincity.toUpperCase() + "_" + lanesObj.lanes_destcity.toUpperCase();

                    lanesList.push(lanesObj);
                    // laneKeys[lanesObj.lanesObj_cityroute] = {lanesObj}
                    // laneKeys[lanesObj.lanes_name] = {lanesObj}
                    laneKeys[lanesObj.origcity_destcitytext] = {lanesObj}


                    // laneKeys[lanesObj.fromwhstext_tocitytext] = {lanesObj}
                    return true;
                })
                log.debug("lanesList", lanesList);
                log.debug("before", laneKeys);

                var mapVals = [];
                for(var b = 0 ; b < locsList.length ; b++)
                {
                    for(var a = 0 ; a < consList.length ; a++)
                    {
                        var mapObj = {};
                        var locName_consCity = locsList[b].city + "_" + consList[a].city;
                        locName_consCity = locName_consCity.toUpperCase();
                        if(laneKeys[locName_consCity])
                        {
                            if(!mapObj[locName_consCity])
                            {
                                mapObj[locName_consCity] = [];
                            }
                            mapObj[locName_consCity].push({locObj : locsList[b], conObj:consList[a]})
                            laneKeys[locName_consCity] = {} //TODO this allows it to not create dupes
                        }
                        else
                        {
                            if(!mapObj[locName_consCity])
                            {
                                mapObj[locName_consCity] = [];
                            }
                            mapObj[locName_consCity].push({locObj : locsList[b], conObj:consList[a]})
                            mapVals.push(mapObj)
                            laneKeys[locName_consCity] = {} //TODO this allows it to not create dupes
                        }
                    }

                    for(var a = 0 ; a < locsList.length ; a++)
                    {
                        //a!=b skip self
                        if(a != b)
                        {
                            var mapObj = {};
                            var locName_xlocName = locsList[b].city + "_" + locsList[a].city;
                            locName_xlocName = locName_xlocName.toUpperCase();
                            if(laneKeys[locName_xlocName])
                            {
                                if(!mapObj[locName_xlocName])
                                {
                                    mapObj[locName_xlocName] = [];
                                }
                                mapObj[locName_xlocName].push({locObj : locsList[b], xlocObj:locsList[a]})
                                laneKeys[locName_xlocName] = {} //TODO this allows it to not create dupes
                            }
                            else
                            {
                                if(!mapObj[locName_xlocName])
                                {
                                    mapObj[locName_xlocName] = [];
                                }
                                mapObj[locName_xlocName].push({locObj : locsList[b], xlocObj:locsList[a]})
                                mapVals.push(mapObj)
                                laneKeys[locName_xlocName] = {} //TODO this allows it to not create dupes
                            }
                        }

                    }
                }


                log.debug("after", laneKeys);

                log.debug("mapVals", mapVals)
                return mapVals;
            }
            catch(e)
            {
                log.error("ERROR in function getInputData", e)
            }
        }

        /**
         * Defines the function that is executed when the map entry point is triggered. This entry point is triggered automatically
         * when the associated getInputData stage is complete. This function is applied to each key-value pair in the provided
         * context.
         * @param {Object} mapContext - Data collection containing the key-value pairs to process in the map stage. This parameter
         *     is provided automatically based on the results of the getInputData stage.
         * @param {Iterator} mapContext.errors - Serialized errors that were thrown during previous attempts to execute the map
         *     function on the current key-value pair
         * @param {number} mapContext.executionNo - Number of times the map function has been executed on the current key-value
         *     pair
         * @param {boolean} mapContext.isRestarted - Indicates whether the current invocation of this function is the first
         *     invocation (if true, the current invocation is not the first invocation and this function has been restarted)
         * @param {string} mapContext.key - Key to be processed during the map stage
         * @param {string} mapContext.value - Value to be processed during the map stage
         * @since 2015.2
         */

        const map = (mapContext) =>
        {
            // var locs = [{"id":"215","name":"ANC Paper (Summary) : ANC Whitecourt Warehouse -Paper","city":"WHITECOURT"},{"id":"9","name":"ANS Paper (Summary) : ANC Whitecourt Warehouse","city":"WHITECOURT"},{"id":"245","name":"ANS Paper (Summary) : ANS Active Warehousing 9","city":""},{"id":"239","name":"ANS Paper (Summary) : Coast 2000 Terminals Ltd. Whse","city":"Lulu Island"}]
            try
            {
                log.debug("mapContext.key", mapContext.key)
                log.debug("mapContext.value", mapContext.value);
                // var consId = mapContext.value.id;
                // for(var a = 0 ; a < locs.length; a++)
                // {
                //
                // }

                createLane(JSON.parse(mapContext.value))
            }
            catch(e)
            {
                log.error("ERROR in function map", e)
            }
        }

        function createLane(obj)
        {
            var equipmentsObj = {
                byId : {
                    list:[

                    ]
                },
                byName : {
                    list:[

                    ]
                },
                list : []
            };
            var equipmentsSearchObj = search.create({
                type : "customrecord_anc_equipment",
                filters : [
                    ["isinactive", "is", "F"]
                ],
                columns : [
                    search.createColumn({name : "name"})
                ]
            });
            equipmentsSearchObj.run().each(function(res){
                var equipmentName = res.getValue({name : "name"});
                var equipmentId = res.id;
                equipmentsObj.list.push({equipmentId,equipmentName});

                return true;
            })
            log.debug("equipmentsObj.list", equipmentsObj.list);
            equipmentsObj.byId = ANC_lib.groupBy(equipmentsObj.list, "equipmentId")
            log.debug("equipmentsObj.byId", equipmentsObj.byId);
            equipmentsObj.byName = ANC_lib.groupBy(equipmentsObj.list, "equipmentName")
            log.debug("equipmentsObj.byName", equipmentsObj.byName);

            var laneRecObj = null;
            var laneRecId = null
            try
            {
                for(var laneName in obj)
                {
                    for(var a = 0 ; a < obj[laneName].length ; a++)
                    {
                        log.debug("obj[laneName]", obj[laneName]);


                        if(obj[laneName][a].locObj && obj[laneName][a].conObj)
                        {
                            laneRecObj = record.create({
                                type : "customrecord_anc_shippinglanes"
                            });
                            laneRecObj.setValue({
                                fieldId : "name",
                                value : laneName
                            })
                            laneRecObj.setValue({
                                fieldId : "custrecord_anc_lane_originwarehousecity",
                                value : obj[laneName][a].locObj.city
                            })
                            laneRecObj.setValue({
                                fieldId : "custrecord_anc_lane_destinationcity",
                                value : obj[laneName][a].conObj.city
                            })

                            log.debug("error city")
                            var locs = {origincity:obj[laneName][a].locObj.city, destcity:obj[laneName][a].conObj.city}
                            var functionResults = buildRateApiPayload(locs, equipmentsObj.list);

                            laneRecObj.setText({
                                fieldId : "custrecord_anc_lane_ftte",
                                value : functionResults.fastestTimeElement.rates[0].equipment,
                                text : functionResults.fastestTimeElement.rates[0].equipment
                            })
                            laneRecObj.setValue({
                                fieldId : "custrecord_anc_lane_ftt",
                                value : functionResults.fastestTimeElement.rates[0].transitTime,
                                text : functionResults.fastestTimeElement.rates[0].transitTime
                            })
                            laneRecObj.setValue({
                                fieldId : "custrecord_fttc",
                                value : functionResults.fastestTimeElement.rates[0].totalCost,
                                text : functionResults.fastestTimeElement.rates[0].totalCost
                            })

                            //FIXME - for lowest cost optmeth

                            laneRecObj.setText({
                                fieldId : "custrecord_anc_lane_lce",
                                value : functionResults.lowestCostElement.rates[0].equipment,
                                text : functionResults.lowestCostElement.rates[0].equipment
                            })
                            laneRecObj.setValue({
                                fieldId : "custrecord_anc_lane_lctt",
                                value : functionResults.lowestCostElement.rates[0].transitTime,
                                text : functionResults.lowestCostElement.rates[0].transitTime
                            })
                            laneRecObj.setValue({
                                fieldId : "custrecord_anc_lane_lcpt",
                                value : functionResults.lowestCostElement.rates[0].totalCost,
                                text : functionResults.lowestCostElement.rates[0].totalCost
                            })

                        }
                        else if(obj[laneName][a].locObj && obj[laneName][a].xlocObj)
                        {
                            laneRecObj = record.create({
                                type : "customrecord_anc_shippinglanes"
                            });
                            laneRecObj.setValue({
                                fieldId : "name",
                                value : laneName
                            })
                            laneRecObj.setValue({
                                fieldId : "custrecord_anc_lane_originwarehousecity",
                                value : obj[laneName][a].locObj.city
                            })
                            laneRecObj.setValue({
                                fieldId : "custrecord_anc_lane_destinationcity",
                                value : obj[laneName][a].xlocObj.city
                            });
                            log.debug("error city2")

                            var locs = {origincity:obj[laneName][a].locObj.city, destcity:obj[laneName][a].xlocObj.city}

                            log.debug("error city2.5")
                            var functionResults = buildRateApiPayload(locs, equipmentsObj.list);

                            log.debug("error city3")

                            laneRecObj.setText({
                                fieldId : "custrecord_anc_lane_ftte",
                                value : functionResults.fastestTimeElement.rates[0].equipment,
                                text : functionResults.fastestTimeElement.rates[0].equipment
                            })
                            laneRecObj.setValue({
                                fieldId : "custrecord_anc_lane_ftt",
                                value : functionResults.fastestTimeElement.rates[0].transitTime,
                                text : functionResults.fastestTimeElement.rates[0].transitTime
                            })
                            laneRecObj.setValue({
                                fieldId : "custrecord_fttc",
                                value : functionResults.fastestTimeElement.rates[0].totalCost,
                                text : functionResults.fastestTimeElement.rates[0].totalCost
                            })

                            //FIXME - for lowest cost optmeth

                            laneRecObj.setText({
                                fieldId : "custrecord_anc_lane_lce",
                                value : functionResults.lowestCostElement.rates[0].equipment,
                                text : functionResults.lowestCostElement.rates[0].equipment
                            })
                            laneRecObj.setValue({
                                fieldId : "custrecord_anc_lane_lctt",
                                value : functionResults.lowestCostElement.rates[0].transitTime,
                                text : functionResults.lowestCostElement.rates[0].transitTime
                            })
                            laneRecObj.setValue({
                                fieldId : "custrecord_anc_lane_lcpt",
                                value : functionResults.lowestCostElement.rates[0].totalCost,
                                text : functionResults.lowestCostElement.rates[0].totalCost
                            })
                        }

                        log.debug("error city4")
                        laneRecId = laneRecObj.save({
                            ignoreMandatoryFields : true,
                            enableSourcing : true
                        });


                        log.debug("laneRecId", laneRecId);
                    }
                }

            }
            catch(e)
            {
                log.error("ERROR in function createLane", e)
            }

            return laneRecId;
        }

        function buildRateApiPayload(locs, equipmentsObjList)
        {
            var functionRes = {};
            var requestBodyObj = []
            try
            {
                for(var a = 0 ; a < equipmentsObjList.length ; a++)
                {
                    var eqObj = equipmentsObjList[a];

                    var reqBody = {
                        "origAlias":"6170",
                        "origCity":locs.origCity,
                        "origState":"AB",
                        "origZip":"T7S 1P9",
                        "origCountry":"CAN",
                        "destAlias":"6760",
                        "destCity":locs.destCity,
                        "destState":"BC",
                        "destZip":"V6W 1M1",
                        "destCountry":"CAN",
                        "commodity":"PPR",
                        "distance": 661,
                        "equipment":eqObj.equipmentName,
                        "weight":21769,
                        "controlCust":"6170",
                        "id":eqObj.equipmentName + new Date().getTime(),
                        "destZone":"",
                        "weightUOM":"LB",
                        "hazmat": false,
                        "effectiveDate":new Date()
                    }
                    requestBodyObj.push(reqBody);
                }
                var requestBodyStr = JSON.stringify(requestBodyObj)

                log.debug("getRateInquiryResponse rawData before HTTP POST", requestBodyStr)

                var rawResp = https.post({
                    // url: "https://esb.albertanewsprint.com:50107/TMX",
                    url: "https://esb.albertanewsprint.com:443/TMX",
                    body : requestBodyStr
                });

                log.debug("getRateInquiryResponse rawResp", rawResp)
                // rawResp = JSON.parse(rawResp)

                var data = rawResp.body;
                data = typeof data == "object" ? data : JSON.parse(data);
                log.debug("buildRateApiPayload data1", data)
                var lowestCostElement = getElementWithLowestTotalCost(data);
                var fastestTimeElement = getElementWithFastestTransitTime(data); //FIXME
                log.debug("buildRateApiPayload data2", data)
                functionRes.lowestCostElement = lowestCostElement;
                log.debug("lowestCostElement", lowestCostElement);
                functionRes.fastestTimeElement = fastestTimeElement;
                log.debug("fastestTimeElement", fastestTimeElement);

            }
            catch(e)
            {
                log.error("ERROR in function buildRateApiPayload", e)
            }

            log.debug("functionRes", functionRes);
            return functionRes;
        }

        function getElementWithLowestTotalCost(data) {
            return data.reduce((lowest, current) => {
                const currentRate = current.rates && current.rates[0];
                const lowestRate = lowest?.rates?.[0];

                if (!currentRate) return lowest;
                if (!lowestRate || currentRate.totalCost < lowestRate.totalCost) {
                    return current;
                }
                return lowest;
            }, null);
        }

        function getElementWithFastestTransitTime(data) {
            return data.reduce((lowest, current) => {
                const currentRate = current.rates && current.rates[0];
                const lowestRate = lowest?.rates?.[0];

                if (!currentRate) return lowest;
                if (!lowestRate || currentRate.totalCost < lowestRate.totalCost) {
                    return current;
                }
                return lowest;
            }, null);
        }




        /**
         * Defines the function that is executed when the reduce entry point is triggered. This entry point is triggered
         * automatically when the associated map stage is complete. This function is applied to each group in the provided context.
         * @param {Object} reduceContext - Data collection containing the groups to process in the reduce stage. This parameter is
         *     provided automatically based on the results of the map stage.
         * @param {Iterator} reduceContext.errors - Serialized errors that were thrown during previous attempts to execute the
         *     reduce function on the current group
         * @param {number} reduceContext.executionNo - Number of times the reduce function has been executed on the current group
         * @param {boolean} reduceContext.isRestarted - Indicates whether the current invocation of this function is the first
         *     invocation (if true, the current invocation is not the first invocation and this function has been restarted)
         * @param {string} reduceContext.key - Key to be processed during the reduce stage
         * @param {List<String>} reduceContext.values - All values associated with a unique key that was passed to the reduce stage
         *     for processing
         * @since 2015.2
         */
        const reduce = (reduceContext) => {

        }


        /**
         * Defines the function that is executed when the summarize entry point is triggered. This entry point is triggered
         * automatically when the associated reduce stage is complete. This function is applied to the entire result set.
         * @param {Object} summaryContext - Statistics about the execution of a map/reduce script
         * @param {number} summaryContext.concurrency - Maximum concurrency number when executing parallel tasks for the map/reduce
         *     script
         * @param {Date} summaryContext.dateCreated - The date and time when the map/reduce script began running
         * @param {boolean} summaryContext.isRestarted - Indicates whether the current invocation of this function is the first
         *     invocation (if true, the current invocation is not the first invocation and this function has been restarted)
         * @param {Iterator} summaryContext.output - Serialized keys and values that were saved as output during the reduce stage
         * @param {number} summaryContext.seconds - Total seconds elapsed when running the map/reduce script
         * @param {number} summaryContext.usage - Total number of governance usage units consumed when running the map/reduce
         *     script
         * @param {number} summaryContext.yields - Total number of yields when running the map/reduce script
         * @param {Object} summaryContext.inputSummary - Statistics about the input stage
         * @param {Object} summaryContext.mapSummary - Statistics about the map stage
         * @param {Object} summaryContext.reduceSummary - Statistics about the reduce stage
         * @since 2015.2
         */
        const summarize = (summaryContext) => {

        }

        return {getInputData, map, reduce, summarize}

    });
