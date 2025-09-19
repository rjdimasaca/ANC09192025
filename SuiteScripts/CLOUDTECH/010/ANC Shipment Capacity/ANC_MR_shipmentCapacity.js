/**
 * @NApiVersion 2.1
 * @NScriptType MapReduceScript
 */
define(['/SuiteScripts/ANC_lib.js', 'N/format', 'N/https', 'N/record', 'N/runtime', 'N/search'],
    /**
 * @param{format} format
 * @param{https} https
 * @param{record} record
 * @param{runtime} runtime
 * @param{search} search
 */
    (ANC_lib, format, https, record, runtime, search) => {
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
            var year = runtime.getCurrentScript().getParameter({
                name : "custscript_anc_shipcap_year"
            });
            year = year ? year : new Date().getFullYear();

            var dates = getAllDatesOfYear(year);

            return dates;
        }

        function getAllDatesOfYear(year) {
            const dates = [];
            const firstDayOfYear = new Date(year, 0, 1);
            const lastDayOfYear = new Date(year, 11, 31);

            let currentDate = firstDayOfYear;

            while (currentDate <= lastDayOfYear) {

                // var currentDateText = `${currentDate.getMonth()+1}/${currentDate.getDate()}/${currentDate.getFullYear()}`

                var currentDateText = dateToStr(currentDate)
                log.debug("currentDateText", currentDateText);

                //broken due to serializations? thus convert it to M/D/Y
                dates.push(currentDateText);
                currentDate.setDate(currentDate.getDate() + 1);
                currentDate = new Date(currentDate);
            }

            return dates;
        }

        function dateToStr(currentDate, addLeadingZeroes)
        {
            var dateStr = currentDate.getDate()
            var monthStr = currentDate.getMonth()+1
            if(monthStr < 10)
            {
                monthStr = "0" + monthStr;
            }
            if(dateStr < 10)
            {
                dateStr = "0" + dateStr;
            }
            var retMsg = `${monthStr}/${dateStr}/${currentDate.getFullYear()}`

            return retMsg;
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
            try
            {
                // log.debug("mapContext", mapContext)
                log.debug("mapContext.value", mapContext.value);
                log.debug("typeof mapContext.value", typeof mapContext.value);

                var targetDate = mapContext.value;

                // targetDate = "05/25/2025"

                // targetDate = typeof targetDate == "string" ? new Date(targetDate) : targetDate
                // targetDate = format.format({
                //     type : format.Type.DATE,
                //     value : targetDate
                // })
                log.debug("targetDate1", targetDate)
                var targetDate_dateObj = new Date(targetDate);
                log.debug("targetDate_dateObj", targetDate_dateObj)
                var targetDateMonth = targetDate_dateObj.getMonth();
                log.debug("targetDateMonth", targetDateMonth)
                //
                var mapObj = {
                    key : targetDateMonth,
                    value : targetDate
                };
                log.debug("mapObj", mapObj)
                mapContext.write(mapObj)
            }
            catch(e)
            {
                log.error("ERROR in function map", e)
            }
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
        const reduce = (reduceContext) =>
        {
            try
            {
                log.debug("reduceContext", reduceContext)
                log.debug("reduceContext.key", reduceContext.key)
                log.debug("reduceContext.values", reduceContext.values);

                var shipmentLocs = ANC_lib.getShipmentLocs();

                log.debug("reduce shipmentLocs", shipmentLocs)
                createDailyShipmentCapByMonth({month:reduceContext.key, dates:reduceContext.values, shipmentLocs:shipmentLocs});

                // createDailyShipmentCap()
            }
            catch(e)
            {
                log.error("ERROR in function reduce", e);
            }
        }

        function createDailyShipmentCapByMonth(obj)
        {

            log.debug("createDailyShipmentCapByMonth obj", obj)
            shipmentLocs = obj.shipmentLocs;
            var year = runtime.getCurrentScript().getParameter({
                name : "custscript_anc_shipcap_year"
            });
            year = year ? year : "2025";


            log.debug("createDailyShipmentCapByMonth obj", obj)
            // if(obj.month != 9)
            // {
            //     return;
            // }
            var monthId = Number(obj.month) + 1;
            log.debug("createDailyShipmentCapByMonth monthId", monthId)
            var recObj = record.load({
                type : ANC_lib.references.RECTYPES.months.id,
                id : monthId
            });

            var lineCount = recObj.getLineCount({
                sublistId : "item"
            });


            var newLocId = runtime.getCurrentScript().getParameter({
                name : "custscript_anc_shipcap_loc"
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
                shipmentLocs = [newShipmentCapLoc]
            }

            var lineIndex = 0;
            for(var b = 0 ; b < shipmentLocs.length ; b++)
            {
                for(var a = 0 ; a < obj.dates.length ; a++)
                {
                    recObj.setSublistValue({
                        sublistId : "recmachcustrecord_anc_dsc_month",
                        fieldId : "custrecord_anc_dsc_fulldate",
                        line : lineIndex,
                        value : new Date(obj.dates[a])
                    })
                    recObj.setSublistValue({
                        sublistId : "recmachcustrecord_anc_dsc_month",
                        fieldId : "name",
                        line : lineIndex,
                        value : shipmentLocs[b].name + "|" + obj.dates[a]
                    })
                    recObj.setSublistValue({
                        sublistId : "recmachcustrecord_anc_dsc_month",
                        fieldId : "custrecord_anc_dsc_date",
                        line : lineIndex,
                        value : new Date(obj.dates[a]).getDate(),
                    })
                    recObj.setSublistText({
                        sublistId : "recmachcustrecord_anc_dsc_month",
                        fieldId : "custrecord_anc_dsc_year",
                        line : lineIndex,
                        value : Math.floor(new Date(obj.dates[a]).getFullYear()),
                        text : Math.floor(new Date(obj.dates[a]).getFullYear())
                    })
                    recObj.setSublistValue({
                        sublistId : "recmachcustrecord_anc_dsc_month",
                        fieldId : "custrecord_anc_dsc_loc",
                        line : lineIndex,
                        value : shipmentLocs[b].id,
                    })
                    // recObj.setSublistValue({
                    //     sublistId : "recmachcustrecord_anc_dsc_month",
                    //     fieldId : "custrecord_anc_dsc_fulldate",
                    //     line : a,
                    //     value : obj.dates[a]
                    // })
                    // recObj.setSublistValue({
                    //     sublistId : "recmachcustrecord_anc_dsc_month",
                    //     fieldId : "custrecord_anc_dsc_fulldate",
                    //     line : a,
                    //     value : obj.dates[a]
                    // })

                    lineIndex++;
                }
            }

            var monthRecObjId = recObj.save({
                ignoreMandatoryFields : true,
                enableSourcing : true
            })

            log.debug("monthRecObjId", monthRecObjId);
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
