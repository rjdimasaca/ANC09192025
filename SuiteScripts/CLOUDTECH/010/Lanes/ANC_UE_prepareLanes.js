/**
 * @NApiVersion 2.1
 * @NScriptType UserEventScript
 */
define(['N/task', 'N/https', 'N/record', 'N/search'],
    /**
 * @param{https} https
 * @param{record} record
 * @param{search} search
 */
    (task, https, record, search) => {
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
        const afterSubmit = (scriptContext) => {


            // prepareLanes_old(scriptContext)

            prepareLanes_new(scriptContext)

        }

        function prepareLanes_old(scriptContext)
        {
            try
            {
                if(scriptContext.type == "create" || scriptContext.type == "edit")
                {
                    if(scriptContext.newRecord.type == "customrecord_alberta_ns_consignee_record")
                    {
                        var consigneeOldCity = "";
                        if(scriptContext.type == "edit")
                        {
                            consigneeOldCity = scriptContext.oldRecord.getValue({
                                fieldId : "custrecord_alberta_ns_city"
                            })
                        }
                        var consigneeNewCity = scriptContext.newRecord.getValue({
                            fieldId : "custrecord_alberta_ns_city"
                        })

                        log.debug({consigneeOldCity, consigneeNewCity})
                        if(consigneeOldCity != consigneeNewCity)
                        {
                            var prepShipmentResults = prepShipments(scriptContext.newRecord.id, consigneeNewCity);
                        }
                    }

                    if(scriptContext.newRecord.type == "location")
                    {
                        var oldCity = "";
                        if(scriptContext.type == "edit")
                        {
                            oldCity = scriptContext.oldRecord.getValue({
                                fieldId : "custrecord_alberta_ns_city"
                            })
                        }
                        var consigneeNewCity = scriptContext.newRecord.getValue({
                            fieldId : "custrecord_alberta_ns_city"
                        })

                        log.debug({oldCity, consigneeNewCity})
                        if(oldCity != consigneeNewCity)
                        {
                            var prepShipmentResults = prepShipments(scriptContext.newRecord.id, consigneeNewCity);
                        }
                    }
                }
            }
            catch(e)
            {
                log.error("ERROR in function prepareLanes_old", e)
            }
        }

        function prepareLanes_new(scriptContext)
        {
            try
            {
                if(scriptContext.type == "create" || scriptContext.type == "edit")
                {
                    var taskObj = task.create({
                        taskType : task.TaskType.MAP_REDUCE,
                        scriptId : "customscript_anc_mr_preparelanes",
                        deploymentId : "customdeploy_anc_mr_preparelanes"
                    });

                    var taskObjId = taskObj.submit()
                    log.debug("taskObjId", taskObjId);
                }
            }
            catch(e)
            {
                log.error("ERROR in function prepareLanes_old", e)
            }
        }

        function prepShipments(consigneeId, consigneeNewCity)
        {
            var results = {};
            var consigneeRecObj = record.load({
                type : "customrecord_alberta_ns_consignee_record",
                id : consigneeId
            })
            try
            {
                var locIds = [];
                var locIdsById = {}
                var locationSearchObj = search.create({
                    type: "location",
                    filters:
                        [
                            ["city","isnotempty", ""],
                            "AND",
                            ["locationtype","anyof","2"],
                            "AND",
                            ["makeinventoryavailable","is","T"],
                            // ["formulanumeric: CASE WHEN UPPER({city}) = UPPER('wHiTeCoUrT') THEN 1 ELSE 0 END","equalto","1"]
                        ],
                    columns:
                        [
                            search.createColumn({name: "city", label: "City"}),
                            search.createColumn({name: "state", label: "State/Province"}),
                            search.createColumn({name: "country", label: "Country"}),
                        ]
                });
                var searchResultCount = locationSearchObj.runPaged().count;
                log.debug("locationSearchObj result count",searchResultCount);
                locationSearchObj.run().each(function(result){
                    // .run().each has a limit of 4,000 results
                    locIds.push(result.id)
                    locIdsById[result.id] = {city : result.getValue({name: "city", label: "City"})};
                    return true;
                });

                /*
                locationSearchObj.id="customsearch1746118642497";
                locationSearchObj.title="Location Search (copy)";
                var newSearchId = locationSearchObj.save();
                */

                results = {locIds, locIdsById};


                var customrecord_anc_shippinglanesSearchObj = search.create({
                    type: "customrecord_anc_shippinglanes",
                    filters:
                        [
                            [`formulanumeric: CASE WHEN UPPER('${consigneeNewCity}') = UPPER({custrecord_anc_lane_destinationcity}) THEN 1 ELSE 0 END`,"equalto","1"]
                        ],
                    columns:
                        [
                            search.createColumn({name: "name", label: "Name"}),
                            search.createColumn({name: "scriptid", label: "Script ID"}),
                            search.createColumn({name: "custrecord_anc_lane_originwarehouse", label: "Origin Warehouse"}),
                            search.createColumn({name: "custrecord_anc_lane_originwarehousecity", label: "Origin Warehouse City"}),
                            search.createColumn({name: "custrecord_anc_lane_destination", label: "Destination"}),
                            search.createColumn({name: "custrecord_anc_lane_destinationcity", label: "Destination City"}),
                            search.createColumn({name: "custrecord_anc_lane_cdw", label: "CrossDock Warehouse"}),
                            search.createColumn({name: "custrecord_anc_lane_crossdockcity", label: "Crossdock City"}),
                            search.createColumn({name: "custrecord_anc_lane_cdtt", label: "CrossDock Transit Time"}),
                            search.createColumn({name: "custrecord_anc_lane_cdc", label: "CrossDock Cost"}),
                            search.createColumn({name: "custrecord_anc_lane_cde", label: "CrossDock Equipment"}),
                            search.createColumn({name: "custrecord_anc_lane_lcpt", label: "Lowest Cost per Ton"}),
                            search.createColumn({name: "custrecord_anc_lane_lctt", label: "Lowest Cost Transit Time"}),
                            search.createColumn({name: "custrecord_anc_lane_lce", label: "Lowest Cost Equipment"}),
                            search.createColumn({name: "custrecord_anc_lane_ftt", label: "Fastest Transit Time"}),
                            search.createColumn({name: "custrecord_fttc", label: "Fastest Transit Time Cost"}),
                            search.createColumn({name: "custrecord_anc_crossdockeligible", label: "Crossdock Eligible"})
                        ]
                });
                var searchResultCount = customrecord_anc_shippinglanesSearchObj.runPaged().count;
                log.debug("customrecord_anc_shippinglanesSearchObj result count",searchResultCount);
                var originLoc = {};
                customrecord_anc_shippinglanesSearchObj.run().each(function(result){
                    origLocCity = result.getValue({name: "custrecord_anc_lane_originwarehousecity", label: "Origin Warehouse City"})
                    origLocCity = origLocCity.toLowerCase();
                    originLoc[origLocCity] = {};
                    // .run().each has a limit of 4,000 results
                    return true;
                });

                //if you have lanes going FROM required warehouses to that consignee city already, then you dont want to create a new lanes for those whs-cons
                //this means, its not enough checking the result
                //you need to actually check which whs-conscity already exist, skip the existing ones, create new ones
                //thus actually go through the result and extract the origins
                if(searchResultCount > 0)
                {
                    doUpdateLanes = true;
                }
                else //create the lanes
                {
                    doUpdateLanes = true
                }

                if(doUpdateLanes)
                {
                    var currLine = consigneeRecObj.getLineCount({
                        sublistId : "recmachcustrecord_anc_lane_destination"
                    });
                    for(var a = 0 ; a < locIds.length ; a++)
                    {
                        var locCity = locIdsById[locIds[a]].city;
                        locCity = locCity.toLowerCase();
                         var locIndex = consigneeRecObj.findSublistLineWithValue({
                            sublistId : "recmachcustrecord_anc_lane_destination",
                            fieldId : "custrecord_anc_lane_originwarehouse",
                            value : locIds[a]
                        })

                        //skip it if there already a lane from this CITY.
                        if(originLoc[locCity])
                        {
                            log.debug("skip this origLoc city", locCity)
                            continue;
                        }
                        if(locIndex == -1)
                        {
                            targetIndex = currLine;
                            currLine++;
                        }
                        else
                        {
                            targetIndex = locIndex;
                        }

                        consigneeRecObj.setSublistValue({
                            sublistId : "recmachcustrecord_anc_lane_destination",
                            fieldId : "name",
                            value : locCity || "Unknown City" + " - " + consigneeNewCity,
                            line : targetIndex
                        })
                        consigneeRecObj.setSublistValue({
                            sublistId : "recmachcustrecord_anc_lane_destination",
                            fieldId : "custrecord_anc_lane_originwarehouse",
                            value : locIds[a],
                            line : targetIndex
                        })
                        //city can be set through sourcing, add a set command to override

                        //already knows this because u are using a sublist
                        // consigneeRecObj.setSublistValue({
                        //     sublistId : "recmachcustrecord_anc_lane_destination",
                        //     fieldId : "custrecord_anc_lane_destination",
                        //     value : consigneeId,
                        //     line : targetIndex
                        // })

                    }

                    /*
                    customrecord_anc_shippinglanesSearchObj.id="customsearch1746120306685";
                    customrecord_anc_shippinglanesSearchObj.title="Lanes Search (copy)";
                    var newSearchId = customrecord_anc_shippinglanesSearchObj.save();
                    */
                    var submittedConsigneeRecId = consigneeRecObj.save({
                        ignoreMandatoryFields : true,
                        enableSourcing : true
                    })
                    log.debug("submittedConsigneeRecId", submittedConsigneeRecId);
                }





            }
            catch(e)
            {
                log.error("ERROR in function prepShipments", e)
            }

            return results
        }

        return {beforeLoad, beforeSubmit, afterSubmit}

    });
