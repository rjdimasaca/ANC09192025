/**
 * @NApiVersion 2.1
 * @NScriptType MapReduceScript
 *
 *
 *
 *
 */
define(['N/https', 'N/query', 'N/record', 'N/runtime', 'N/search', 'N/url'],
    /**
 * @param{https} https
 * @param{query} query
 * @param{record} record
 * @param{runtime} runtime
 * @param{search} search
 * @param{url} url
 */
    (https, query, record, runtime, search, url) => {
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
            var bearerToken = `d9235c2779694d31b3f1c48aaca8255d`;

            var bodyVal = {
                "eventDateTime": "2025-03-20T19:38:13.979Z",
                "carrierParentId": "string",
                "eventType": "string",
                "stopOrder": 0,
                "controlCustomerNumber": "string",
                "loadID": "string",
                "carrierName": "string",
                "loadingAreas": [
                    {
                        "loadingArea": "string"
                    }
                ],
                "orders": [
                    {
                        "orderNumber": "string"
                    }
                ],
                "locationNumber": "string",
                "carrierID": "string",
                "apiType": "string",
                "loadSource": "string"
            };

            var rawResp = https.post({
                // url: "https://esb.albertanewsprint.com:50107/TMX",
                //https://ptmx.anchub.ca/ptmx/eventupdate
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${bearerToken}`
                },
                url: "https://ptmx.anchub.ca/ptmx/eventupdate",
                body : JSON.stringify(bodyVal)
            });

            log.debug("https://ptmx.anchub.ca/ptmx/eventupdate rawResp", rawResp)

            //
            //
            // var equipmentsSearch = search.create({
            //     type : "customrecord_anc_equipment",
            //     columns : [
            //         search.createColumn({name: "name", label: "Name"})
            //     ]
            // })
            //
            //
            // return equipmentsSearch;

            // var equipmentsSearchSr = getResults(equipmentsSearch.run());
            //
            //
            // return equipmentsSearchSr;
            //
            // var equipmentNames = [];
            // var equipmentIds = [];
            // var equipmentObjs = equipmentsSearchSr.map(function(res){
            //     var idVal = res.id;
            //     var nameVal = res.getValue({name:"name"});
            //     equipmentIds.push(idVal);
            //     equipmentNames.push(nameVal);
            //     return {
            //         id: idVal,
            //         name: nameVal
            //     }
            // })
            // log.debug("equipmentObjs", equipmentObjs)
            // log.debug("equipmentIds", equipmentIds)
            // log.debug("equipmentNames", equipmentNames)
            //
            // return equipmentObjs;

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
            try{
                log.debug("mapContext", mapContext);
                log.debug("mapContext.value", mapContext.value);
                log.debug("mapContext.value.length", mapContext.value.length);

                var mapValue = JSON.parse(mapContext.value);
                log.debug("mapValue", mapValue);

                var equipmentName = mapValue.values.name;

                if(mapContext.key && equipmentName)
                {
                    log.debug("mapContext.key", mapContext.key);


                    log.debug("equipmentName", equipmentName);

                    var rateInquiryResponse = getRateInquiryResponse({
                        equipmentName : equipmentName,
                        routeName : `ANC TEST LANE1`
                    })

                    log.debug("rateInquiryResponse", rateInquiryResponse);

                    if(rateInquiryResponse.list && rateInquiryResponse.list.length > 0)
                    {
                        for(var z = 0 ; z < rateInquiryResponse.list.length ; z++)
                        {
                            var rateInquiryResponse_rates = rateInquiryResponse.list[z].rates

                            log.debug("rateInquiryResponse_rates", rateInquiryResponse_rates);

                            if(rateInquiryResponse_rates && rateInquiryResponse_rates.length > 0)
                            {
                                for(var a = 0 ; a < rateInquiryResponse_rates.length ; a++)
                                {
                                    //create the lane here, now! because reduce will need this reference
                                    log.debug("rateInquiryResponse_rates[0].equipment.toUpperCase()", rateInquiryResponse_rates[a].equipment.toUpperCase())
                                    log.debug("rateInquiryResponse_rates[0].route.toUpperCase()", rateInquiryResponse_rates[a].route.toUpperCase())

                                    var nsLeqSearch = search.create({
                                        type : "customrecord_anc_laneequipment",
                                        filters : [
                                            ["formulatext: UPPER({custrecord_anc_laneequip_lane})","is",rateInquiryResponse_rates[a].route.toUpperCase()],
                                            "AND",
                                            ["formulatext: UPPER({custrecord_anc_laneequip_equipment})","is",rateInquiryResponse_rates[a].equipment.toUpperCase()]
                                        ],
                                        columns : []
                                    })

                                    var nsLeqSearchSr = getResults(nsLeqSearch.run());

                                    log.debug("nsLeqSearchSr", nsLeqSearchSr)

                                    var targetLeqRecId = "";
                                    var targetLeqRecObj = "";
                                    if(nsLeqSearchSr && nsLeqSearchSr.length > 0)
                                    {
                                        targetLeqRecId = nsLeqSearchSr[0].id;
                                        targetLeqRecObj = record.load({
                                            type : "customrecord_anc_laneequipment",
                                            id : targetLeqRecId
                                        })
                                    }

                                    var submittedLeqRecId = "";

                                    if(!targetLeqRecId)
                                    {
                                        targetLeqRecObj = record.create({
                                            type : "customrecord_anc_laneequipment",
                                        })

                                        targetLeqRecObj.setValue({
                                            fieldId : "name",
                                            value : rateInquiryResponse_rates[a].route.toUpperCase() + " - " + rateInquiryResponse_rates[a].equipment.toUpperCase()
                                        })

                                        //attemptSet custrecord_anc_laneequip_lane
                                        targetLeqRecObj.setText({
                                            fieldId : "custrecord_anc_laneequip_lane",
                                            text : rateInquiryResponse_rates[a].route.toUpperCase()
                                        })
                                        targetLeqRecObj.setText({
                                            fieldId : "custrecord_anc_laneequip_equipment",
                                            text : rateInquiryResponse_rates[a].equipment.toUpperCase()
                                        })

                                        submittedLeqRecId = targetLeqRecObj.save({
                                            ignoreMandatoryFields : true,
                                            enableSourcing : true
                                        })

                                        rateInquiryResponse_rates[a].parentleqid = submittedLeqRecId || targetLeqRecId;
                                    }
                                    else
                                    {
                                        rateInquiryResponse_rates[a].parentleqid = submittedLeqRecId || targetLeqRecId;
                                    }



                                    log.debug("map submittedLeqRecId", submittedLeqRecId);

                                    //end
                                    // rateInquiryResponse.firstresult.parentleqid = submittedLeqRecId || targetLeqRecId;

                                    // mapContext.write({
                                    //     key : mapContext.key,
                                    //     value : rateInquiryResponse.firstresult
                                    // })
                                }

                                //TODO, single request can have multi result with multi rates
                                mapContext.write({
                                    key : mapContext.key,
                                    value : rateInquiryResponse.list[z]
                                })
                            }
                        }
                    }


                    // if(rateInquiryResponse.firstresult.rates && rateInquiryResponse.firstresult.rates.length > 0)
                    // {
                    //     for(var a = 0 ; a < rateInquiryResponse.firstresult.rates.length ; a++)
                    //     {
                    //         //create the lane here, now! because reduce will need this reference
                    //         log.debug("rateInquiryResponse.firstresult.rates[0].equipment.toUpperCase()", rateInquiryResponse.firstresult.rates[a].equipment.toUpperCase())
                    //         log.debug("rateInquiryResponse.firstresult.rates[0].route.toUpperCase()", rateInquiryResponse.firstresult.rates[a].route.toUpperCase())
                    //
                    //         var nsLeqSearch = search.create({
                    //             type : "customrecord_anc_laneequipment",
                    //             filters : [
                    //                 ["formulatext: UPPER({custrecord_anc_laneequip_lane})","is",rateInquiryResponse.firstresult.rates[a].route.toUpperCase()],
                    //                 "AND",
                    //                 ["formulatext: UPPER({custrecord_anc_laneequip_equipment})","is",rateInquiryResponse.firstresult.rates[a].equipment.toUpperCase()]
                    //             ],
                    //             columns : []
                    //         })
                    //
                    //         var nsLeqSearchSr = getResults(nsLeqSearch.run());
                    //
                    //         log.debug("nsLeqSearchSr", nsLeqSearchSr)
                    //
                    //         var targetLeqRecId = "";
                    //         var targetLeqRecObj = "";
                    //         if(nsLeqSearchSr && nsLeqSearchSr.length > 0)
                    //         {
                    //             targetLeqRecId = nsLeqSearchSr[0].id;
                    //             targetLeqRecObj = record.load({
                    //                 type : "customrecord_anc_laneequipment",
                    //                 id : targetLeqRecId
                    //             })
                    //         }
                    //
                    //         var submittedLeqRecId = "";
                    //
                    //         if(!targetLeqRecId)
                    //         {
                    //             targetLeqRecObj = record.create({
                    //                 type : "customrecord_anc_laneequipment",
                    //             })
                    //
                    //             targetLeqRecObj.setValue({
                    //                 fieldId : "name",
                    //                 value : rateInquiryResponse.firstresult.rates[a].route.toUpperCase() + " - " + rateInquiryResponse.firstresult.rates[a].equipment.toUpperCase()
                    //             })
                    //
                    //             //attemptSet custrecord_anc_laneequip_lane
                    //             targetLeqRecObj.setText({
                    //                 fieldId : "custrecord_anc_laneequip_lane",
                    //                 text : rateInquiryResponse.firstresult.rates[a].route.toUpperCase()
                    //             })
                    //             targetLeqRecObj.setText({
                    //                 fieldId : "custrecord_anc_laneequip_equipment",
                    //                 text : rateInquiryResponse.firstresult.rates[a].equipment.toUpperCase()
                    //             })
                    //
                    //             submittedLeqRecId = targetLeqRecObj.save({
                    //                 ignoreMandatoryFields : true,
                    //                 enableSourcing : true
                    //             })
                    //         }
                    //         else
                    //         {
                    //
                    //         }
                    //
                    //
                    //
                    //         log.debug("map submittedLeqRecId", submittedLeqRecId);
                    //
                    //         //end
                    //         rateInquiryResponse.firstresult.parentleqid = submittedLeqRecId || targetLeqRecId;
                    //
                    //         mapContext.write({
                    //             key : mapContext.key,
                    //             value : rateInquiryResponse.firstresult
                    //         })
                    //     }
                    // }

                }
            }
            catch(e)
            {
                log.error("ERROR in function map", e)
            }
        }

        function getRateInquiryResponse(rawData)
        {

            // var sample = {"transportationMethod":"R","methodOfPayment":"PP","releaseCode":"R","carrierID":"1250","equipment":[{"prefix":"RC60","number":"TBOX676282"}],"originStation":{"city":"Whitecourt","state":"AB"},"destinationStation":{"city":"Lulu Island","state":"BC"},"routeInformation":[{"carrierID":"1250","code":"CN","city":"Whitecourt"}],"orders":[{"orderNumber":"096847","lineItems":[{"commodity":"2621345","qualifier":"T","measures":[{"weight":71064,"weightQualifier":"E","ladingQuantity":10,"packagingCode":"ROL"}]}]}]}





            var rateInquiryResponse = {};
            try
            {
                rateInquiryResponse.summary = {};
                rateInquiryResponse.list = [];

                log.debug("getRateInquiryResponse rawData before HTTP POST", rawData)

                var rawResp = "";
                try
                {
                    var rawResp = https.post({
                        // url: "https://esb.albertanewsprint.com:50107/TMX",
                        url: "https://esb.albertanewsprint.com:443/TMX",
                        body : [{
                            equipment : rawData.equipmentName,
                            commodity : 2621345,
                            id : 2621345,
                            weight : 71064,
                            // weight : 500,
                            controlCust : 1,
                            effectiveDate : "3/19/2024"
                        }]
                    });

                    log.debug("getRateInquiryResponse rawResp", rawResp)
                }
                catch(e)
                {
                    log.error("ERROR in function getRateInquiryResponse", e)
                }

                //TEMP
                rawResp = {
                    body : [
                        {
                            "loadID": "string",
                            "shipmentID": "string",
                            "rates": [
                                {
                                    "carrier": "163AFC5F-1B38-4EB5-BE8F-51625D46F2E3",
                                    "lineHaulCharge": 0.1,
                                    "route": "ANC TEST LANE1",
                                    "railRateAuthority": "string",
                                    "distance": 0,
                                    "transitTime": 111,
                                    "equipment": rawData.equipmentName,
                                    "currency": "string",
                                    "accessorials": [
                                        {
                                            "accCharge": 0.1,
                                            "accQual": "string"
                                        }
                                    ],
                                    "fuelSurcharge": 0.1,
                                    "carrierGroupName": "string",
                                    "totalCost": 0.1
                                },
                                {
                                    "carrier": "1B5F8CFF-5BB0-4112-834C-31964EC514F0",
                                    "lineHaulCharge": 0.1,
                                    "route": "ANC TEST LANE2",
                                    "railRateAuthority": "string",
                                    "distance": 0,
                                    "transitTime": 222,
                                    "equipment": rawData.equipmentName,
                                    "currency": "string",
                                    "accessorials": [
                                        {
                                            "accCharge": 0.1,
                                            "accQual": "string"
                                        }
                                    ],
                                    "fuelSurcharge": 0.1,
                                    "carrierGroupName": "string",
                                    "totalCost": 0.3
                                },
                            ],
                            "id": "string",
                            "errors": [
                                {
                                    "errorDesc": "string",
                                    "errorCode": 0
                                }
                            ],
                            "effectiveDate": "2019-08-24",
                            "timestamp": "string"
                        },
                        {
                            "loadID": "string",
                            "shipmentID": "string",
                            "rates": [
                                {
                                    "carrier": "163AFC5F-1B38-4EB5-BE8F-51625D46F2E3XXX",
                                    "lineHaulCharge": 0.1,
                                    "route": "ANC TEST LANE1",
                                    "railRateAuthority": "string",
                                    "distance": 0,
                                    "transitTime": 111,
                                    "equipment": rawData.equipmentName,
                                    "currency": "string",
                                    "accessorials": [
                                        {
                                            "accCharge": 0.1,
                                            "accQual": "string"
                                        }
                                    ],
                                    "fuelSurcharge": 0.1,
                                    "carrierGroupName": "string",
                                    "totalCost": 0.4
                                },
                                {
                                    "carrier": "1B5F8CFF-5BB0-4112-834C-31964EC514F0YYY",
                                    "lineHaulCharge": 0.1,
                                    "route": "ANC TEST LANE2",
                                    "railRateAuthority": "string",
                                    "distance": 0,
                                    "transitTime": 222,
                                    "equipment": rawData.equipmentName,
                                    "currency": "string",
                                    "accessorials": [
                                        {
                                            "accCharge": 0.1,
                                            "accQual": "string"
                                        }
                                    ],
                                    "fuelSurcharge": 0.1,
                                    "carrierGroupName": "string",
                                    "totalCost": 0.2
                                },
                            ],
                            "id": "string",
                            "errors": [
                                {
                                    "errorDesc": "string",
                                    "errorCode": 0
                                }
                            ],
                            "effectiveDate": "2019-08-24",
                            "timestamp": "string"
                        },
                    ]
                };

                if(typeof rawResp.body == "object")
                {
                    rateInquiryResponse.list = rawResp.body;
                    rateInquiryResponse.firstresult = rawResp.body[0];
                }



            }
            catch(e)
            {
                log.error("ERROR in function getRateInquiryResponse", e);
            }
            return rateInquiryResponse;
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

            try
            {
                log.debug("reduce reduceContext", reduceContext)
                log.debug("reduce reduceContext.key", reduceContext.key)
                log.debug("reduce reduceContext.values", reduceContext.values)
                //
                // var values = JSON.parse(reduceContext.values);
                // log.debug("values", values)
                //
                // var compiledEquipmentRates = [];
                //
                // var value = values.rates;
                // log.debug("value", value);
                // compiledEquipmentRates = compiledEquipmentRates.concat(value);
                // log.debug("iter compiledEquipmentRates", compiledEquipmentRates);




                var values = reduceContext.values;
                values = values.map(function(mapVal){
                    return JSON.parse(mapVal)
                });
                log.debug("values", values)

                var compiledEquipmentRates = [];

                for(var a = 0 ; a < values.length; a++)
                {
                    var mapVal = values[a];
                    var rates = mapVal.rates;
                    log.debug("mapVal", mapVal);
                    compiledEquipmentRates = compiledEquipmentRates.concat(rates);

                }

                log.debug("iter compiledEquipmentRates", compiledEquipmentRates);

                log.debug("compiledEquipmentRates", compiledEquipmentRates);
                log.debug("compiledEquipmentRates.length", compiledEquipmentRates.length);

                log.debug("reduce mapVal.parentleqid", mapVal.parentleqid);

                var laneEquipsToUpdate = {};

                for(var a = 0 ; a < compiledEquipmentRates.length ; a++)
                {
                    var laneEquipmentCarrierObj = compiledEquipmentRates[a];

                    if(laneEquipmentCarrierObj.equipment && laneEquipmentCarrierObj.route)
                    {
                        //can be optimized
                        var nsLeqcSearch = search.create({
                            type : "customrecord_anc_laneequipmentcarrier",
                            filters : [
                                ["formulatext: UPPER({custrecord_anc_lec_laneequipment.custrecord_anc_laneequip_lane})","is",laneEquipmentCarrierObj.route.toUpperCase()],
                                "AND",
                                ["formulatext: UPPER({custrecord_anc_lec_laneequipment.custrecord_anc_laneequip_equipment})","is",laneEquipmentCarrierObj.equipment.toUpperCase()],
                                "AND",
                                ["formulatext: UPPER({custrecord_anc_lec_carrier})","is",laneEquipmentCarrierObj.carrier.toUpperCase()]
                            ],
                            columns : []
                        })

                        var nsLeqcSearchSr = getResults(nsLeqcSearch.run());

                        log.debug("nsLeqcSearchSr", {nsLeqcSearchSr, nsLeqcSearch_filters:nsLeqcSearch.filters})

                        var targetLeqcRecId = "";
                        var targetLeqcRecObj = "";
                        if(nsLeqcSearchSr && nsLeqcSearchSr.length > 0)
                        {
                            var targetLeqcRecId = nsLeqcSearchSr[0].id;
                            targetLeqcRecObj = record.load({
                                type : "customrecord_anc_laneequipmentcarrier",
                                id : targetLeqcRecId
                            })
                        }

                        if(!targetLeqcRecId)
                        {
                            targetLeqcRecObj = record.create({
                                type : "customrecord_anc_laneequipmentcarrier",
                            })
                        }


                        targetLeqcRecObj.setText({
                            fieldId : "custrecord_anc_lec_equipment",
                            text : laneEquipmentCarrierObj.equipment.toUpperCase()
                        })
                        targetLeqcRecObj.setValue({
                            fieldId : "custrecord_anc_lec_laneequipment",
                            value : laneEquipmentCarrierObj.parentleqid || compiledEquipmentRates[0].parentleqid
                        })
                        targetLeqcRecObj.setValue({
                            fieldId : "custrecord_anc_lec_transittime",
                            value : laneEquipmentCarrierObj.transitTime
                        })
                        //TODO hardcoded carrier
                        // targetLeqcRecObj.setValue({
                        //     fieldId : "custrecord_anc_lec_carrier",
                        //     value : laneEquipmentCarrierObj.carrier
                        // })
                        targetLeqcRecObj.setText({
                            fieldId : "custrecord_anc_lec_carrier",
                            text : laneEquipmentCarrierObj.carrier
                        })

                        var submittedLeqcRecId = targetLeqcRecObj.save({
                            ignoreMandatoryFields : true,
                            enableSourcing : true
                        })


                        var targetLeqInternalId = laneEquipmentCarrierObj.parentleqid || compiledEquipmentRates[0].parentleqid;
                        if(!laneEquipsToUpdate[targetLeqInternalId])
                        {
                            laneEquipsToUpdate[targetLeqInternalId] = {};
                            laneEquipsToUpdate[targetLeqInternalId].custrecord_anc_laneequip_fasttransittime = {value:laneEquipmentCarrierObj.transitTime};
                            laneEquipsToUpdate[targetLeqInternalId].custrecord_anc_laneequip_fsttrnsttmcarrr = {text:laneEquipmentCarrierObj.carrier};

                            laneEquipsToUpdate[targetLeqInternalId].custrecord_anc_laneequip_lowcostpertonca = {text:laneEquipmentCarrierObj.carrier}
                            laneEquipsToUpdate[targetLeqInternalId].custrecord_anc_laneequip_lowcostperton = {value:laneEquipmentCarrierObj.totalCost}
                        }
                        else
                        {
                            if(laneEquipsToUpdate[targetLeqInternalId].custrecord_anc_laneequip_fasttransittime.value > laneEquipmentCarrierObj.transitTime)
                            {
                                laneEquipsToUpdate[targetLeqInternalId].custrecord_anc_laneequip_fasttransittime = {value:laneEquipmentCarrierObj.transitTime}
                                laneEquipsToUpdate[targetLeqInternalId].custrecord_anc_laneequip_fsttrnsttmcarrr = {text:laneEquipmentCarrierObj.carrier}
                            }
                            if(laneEquipsToUpdate[targetLeqInternalId].custrecord_anc_laneequip_lowcostperton.value > laneEquipmentCarrierObj.totalCost)
                            {
                                laneEquipsToUpdate[targetLeqInternalId].custrecord_anc_laneequip_lowcostpertonca = {text:laneEquipmentCarrierObj.carrier}
                                laneEquipsToUpdate[targetLeqInternalId].custrecord_anc_laneequip_lowcostperton = {value:laneEquipmentCarrierObj.totalCost}
                            }
                        }

                        log.debug("laneEquipsToUpdate", laneEquipsToUpdate);

                        log.debug("submittedLeqcRecId", submittedLeqcRecId);

                    }
                }

                for(var targetLeqInternalId in laneEquipsToUpdate)
                {
                    reduceContext.write({
                        key : targetLeqInternalId,
                        value : laneEquipsToUpdate[targetLeqInternalId]
                    })
                }


            }
            catch(e)
            {
                log.error("ERROR in function reduce", e);
            }

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
            summaryContext.output.iterator().each(function(key, value) {
                log.debug('Lane Equipment Id: ' + key, 'value ' + value);

                // var recObj = record.load({
                //     type : "",
                //     id : key
                // });
                log.debug("typeof value", typeof value)
                if(typeof value == "string")
                {
                    value = JSON.parse(value)
                }

                // var submittedLeqRecId = record.submitFields({
                //     type : "customrecord_anc_laneequipment",
                //     id : key,
                //     values : value
                // });
                // log.debug("submittedLeqRecId", submittedLeqRecId);

                var leqRecObj = record.load({
                    type : "customrecord_anc_laneequipment",
                    id : key,
                });

                for(var fieldId in value)
                {
                    if(value[fieldId].text)
                    {
                        leqRecObj.setText({
                            fieldId : fieldId,
                            text : value[fieldId].text
                        })
                    }
                    else if(value[fieldId].value)
                    {
                        leqRecObj.setValue({
                            fieldId : fieldId,
                            value : value[fieldId].value
                        })
                    }
                }

                leqRecObj.setText({
                    fieldId : "custrecord_anc_laneequip_lastsync",
                    text : toMDY_text(new Date())
                })


                var submittedLeqRecObjId = leqRecObj.save({
                    ignoreMandatoryFields : true,
                    enableSourcing : true
                })
                log.debug("submittedLeqRecObjId", submittedLeqRecObjId);

                return true;
            });
        }

        const toMDY_text = (dateVal) => {
            var retVal = dateVal;
            try
            {
                if(dateVal)
                {
                    retVal = new Date(retVal);

                    retVal = retVal.getMonth() + 1 + "/" + retVal.getDate() + "/" + retVal.getFullYear();
                }

            }
            catch(e)
            {
                log.error("ERROR in function toMDY", e)
            }
            log.debug("retVal", retVal)
            return retVal;
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

        return {getInputData, map, reduce, summarize}

    });
