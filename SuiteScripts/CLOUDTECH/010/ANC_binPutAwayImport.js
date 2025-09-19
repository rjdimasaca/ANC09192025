/**
 * @NApiVersion 2.1
 * @NScriptType MapReduceScript
 */
define(['N/file', 'N/record', 'N/search'],
    /**
     * @param{file} file
     * @param{record} record
     * @param{search} search
     */
    (file, record, search) => {
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

        let rawJson = {110:{
                "10847" : /*[*/
                    {
                        type : "reduction",
                        binId : "100",
                        qty : 20
                    }
                /*]*/
            }}

        function csvToJson(csv) {
            const lines = csv.split('\n');
            const result = {};

            lines.forEach(line => {
                const values = line.trim().split(',');

                if (values.length === 4) {
                    const id = values[0];
                    const key = values[1];
                    const binId = values[2];
                    const qty = values[3];

                    if (!result[id]) {
                        result[id] = {};
                    }

                    result[id][key] = {
                        binId: parseInt(binId),
                        qty: parseInt(qty)
                    };
                }
            });

            return result;
        }

        const getInputData = (inputContext) =>
        {
            try
            {
                // var targetFileId = 8051131;
                // var targetFileId = 8836772;
                // var targetFileId = 8836873;
                // var targetFileId = 8836974;
                // var targetFileId = 8840338;
                //var targetFileId = 8840339;
                var targetFileId = 8840540;
                var targetFileObj = file.load({
                    id : targetFileId
                })
                var csvString = targetFileObj.getContents();
                // var csvString = '10847,100,20\n10876,141,10';
                // var csvString = '110,10847,100,20\n110,10876,141,10\n112,10847,100,20\n113,10876,141,10';
                rawJson = csvToJson(csvString);

                log.debug("rawJson", rawJson);

                // return;

                // recObj.setValue({
                //     fieldId : "location",
                //     value : "110"
                // })

                // let lineItemCount = recObj.getLineCount({
                //     sublistId : "item"
                // })

                for(var locId in rawJson)
                {
                    try
                    {
                        let recObj = record.create({
                            type : "binworksheet",
                            isDynamic : true,
                            defaultValues : {
                                location : locId
                            }
                        });

                        recObj.setValue({
                            fieldId : "memo",
                            value : "fixing bin putaways (RD, MS)"
                        })

                        log.debug("loc " + locId, {"rawJson[locId]" : rawJson[locId]})


                        for(var itemId in rawJson[locId])
                        {
                            var lineIndex = recObj.findSublistLineWithValue({
                                sublistId : "item",
                                fieldId : "item",
                                value : itemId
                            });



                            if(lineIndex != -1)
                            {
                                recObj.selectLine({
                                    sublistId : "item",
                                    line : lineIndex
                                });

                                recObj.setCurrentSublistValue({
                                    sublistId : "item",
                                    fieldId : "quantity",
                                    value : rawJson[locId][itemId].qty
                                });

                                var subrec = recObj.getCurrentSublistSubrecord({
                                    sublistId : "item",
                                    fieldId : "inventorydetail"
                                });

                                log.debug("subrec0", subrec)

                                subrec.selectNewLine({
                                    sublistId : "inventoryassignment"
                                });

                                subrec.setCurrentSublistValue({
                                    sublistId : "inventoryassignment",
                                    fieldId : "binnumber",
                                    value : rawJson[locId][itemId].binId
                                })

                                subrec.setCurrentSublistValue({
                                    sublistId : "inventoryassignment",
                                    fieldId : "quantity",
                                    value : rawJson[locId][itemId].qty
                                });


                                log.debug("subrec1", subrec)

                                subrec.commitLine({
                                    sublistId : "inventoryassignment"
                                })

                                log.debug("success" + itemId + " locId " + locId, {det:rawJson[locId][itemId], itemId, lineIndex})

                                recObj.commitLine({
                                    sublistId : "item"
                                })
                            }
                            else
                            {
                                log.debug("fail" + itemId + " locId " + locId, {det:rawJson[locId][itemId], itemId, lineIndex})
                            }

                            

                        }

                        var submittedRecId = recObj.save();
                        log.debug("submittedRecId", submittedRecId);


                        log.debug("binworksheet created recObj", recObj);
                    }
                    catch(e_recCreate)
                    {
                        log.error("error e_recCreate", e_recCreate)
                    }

                }



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

        const map = (mapContext) => {

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
