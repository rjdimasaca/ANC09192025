/**
 * @NApiVersion 2.1
 * @NScriptType ClientScript
 * @NModuleScope SameAccount
 */
define(['N/record'],

    function(record) {

        /**
         * Function to be executed after page is initialized.
         *
         * @param {Object} scriptContext
         * @param {Record} scriptContext.currentRecord - Current form record
         * @param {string} scriptContext.mode - The mode in which the record is being accessed (create, copy, or edit)
         *
         * @since 2015.2
         */
        function pageInit(scriptContext) {

        }

        /**
         * Function to be executed when field is changed.
         *
         * @param {Object} scriptContext
         * @param {Record} scriptContext.currentRecord - Current form record
         * @param {string} scriptContext.sublistId - Sublist name
         * @param {string} scriptContext.fieldId - Field name
         * @param {number} scriptContext.lineNum - Line number. Will be undefined if not a sublist or matrix field
         * @param {number} scriptContext.columnNum - Line number. Will be undefined if not a matrix field
         *
         * @since 2015.2
         */
        function fieldChanged(scriptContext)
        {
            try {
                if(scriptContext.sublistId == "item" && scriptContext.fieldId == "custcol_anc_itemvalidator")
                {
                    if(true)
                        // if(confirm("update item column?"))
                    {
                        var currItemValidatorId = scriptContext.currentRecord.getCurrentSublistValue({
                            sublistId : scriptContext.sublistId,
                            fieldId : "custcol_anc_itemvalidator",
                        });

                        console.log("currItemValidatorId", currItemValidatorId);

                        if(currItemValidatorId)
                        {
                            var ivRecObj = record.load({
                                type : "customrecord_anc_itemvalidator",
                                id : currItemValidatorId
                            });

                            console.log("currItemValidatorId", currItemValidatorId);

                            var targetSku = ivRecObj.getValue({
                                fieldId : "custrecord_anc_itemval_sku"
                            });

                            console.log("targetSku", targetSku);

                            if(targetSku)
                            {
                                scriptContext.currentRecord.setCurrentSublistValue({
                                    sublistId : scriptContext.sublistId,
                                    fieldId : "item",
                                    value : targetSku
                                });
                            }
                        }
                    }
                }
                else if (scriptContext.fieldId == "custbody_anc_transportmode")
                {
                    targetRec = scriptContext.currentRecord;
                    resolveTransportMode(scriptContext, targetRec);
                }
                else if (scriptContext.fieldId == "custbody_consignee")
                {
                    targetRec = scriptContext.currentRecord;
                    resolveConsignee(scriptContext, targetRec);
                }

            }
            catch(e)
            {
                console.log("ERROR in ANC_CS_SO.js", e)
            }
        }

        /**
         * Function to be executed when field is slaved.
         *
         * @param {Object} scriptContext
         * @param {Record} scriptContext.currentRecord - Current form record
         * @param {string} scriptContext.sublistId - Sublist name
         * @param {string} scriptContext.fieldId - Field name
         *
         * @since 2015.2
         */
        function postSourcing(scriptContext) {

        }

        /**
         * Function to be executed after sublist is inserted, removed, or edited.
         *
         * @param {Object} scriptContext
         * @param {Record} scriptContext.currentRecord - Current form record
         * @param {string} scriptContext.sublistId - Sublist name
         *
         * @since 2015.2
         */
        function sublistChanged(scriptContext) {

        }

        /**
         * Function to be executed after line is selected.
         *
         * @param {Object} scriptContext
         * @param {Record} scriptContext.currentRecord - Current form record
         * @param {string} scriptContext.sublistId - Sublist name
         *
         * @since 2015.2
         */
        function lineInit(scriptContext)
        {
            try
            {
                resolveCurrentLineValue(scriptContext);
            }
            catch(e)
            {
                log.error("ERROR in function lineInit", e);
            }
        }

        function resolveCurrentLineValue(scriptContext)
        {
            try
            {
                if(scriptContext.currentRecord && scriptContext.currentRecord/*.get()*/)
                {
                    console.log("resolveCurrentLineValue scriptContext", scriptContext);
                    var targetRec = scriptContext.currentRecord/*.get()*/;
                    if(scriptContext.sublistId == "item")
                    {
                        resolveTransportMode(scriptContext, targetRec);

                        resolveConsignee(scriptContext, targetRec);
                    }
                }
            }
            catch(e)
            {
                log.error("ERROR in function resolveCurrentLineValue", e)
            }
        }

        function resolveTransportMode(scriptContext, targetRec)
        {
            try
            {
                if(!targetRec)
                {
                    targetRec = scriptContext.currentRecord;
                }
                //TRANSPORTMODE
                console.log("resolveTransportMode resolveCurrentLineValue scriptContext.sublistId", scriptContext.sublistId);
                var currentLine_transportmode = targetRec.getCurrentSublistValue({
                    sublistId : "item",
                    fieldId : "custcol_anc_transportmode",
                    line : targetRec.getCurrentSublistIndex({sublistId : "item"}),
                });

                console.log("resolveCurrentLineValue currentLine_transportmode", currentLine_transportmode);

                if(currentLine_transportmode)
                {

                }
                else
                {
                    var header_transportmode = targetRec.getValue({
                        fieldId : "custbody_anc_transportmode"
                    });

                    if(header_transportmode)
                    {
                        console.log("resolveCurrentLineValue header_transportmode", header_transportmode);

                        targetRec.setCurrentSublistValue({
                            sublistId : "item",
                            fieldId : "custcol_anc_transportmode",
                            line : targetRec.getCurrentSublistIndex({sublistId : "item"}),
                            value : header_transportmode
                        });
                    }
                }
            }
            catch(e)
            {
                log.error("ERROR in function resolveTransportMode", e);
            }
        }

        function resolveConsignee(scriptContext, targetRec)
        {
            try
            {
                if(!targetRec)
                {
                    targetRec = scriptContext.currentRecord;
                }
                //CONSIGNEE
                console.log("resolveConsignee resolveCurrentLineValue scriptContext.sublistId", scriptContext.sublistId);
                var currentLine_custconsignee = targetRec.getCurrentSublistValue({
                    sublistId : "item",
                    fieldId : "custcol_consignee",
                    line : targetRec.getCurrentSublistIndex({sublistId : "item"}),
                });

                console.log("resolveCurrentLineValue currentLine_custconsignee", currentLine_custconsignee);

                if(currentLine_custconsignee)
                {

                }
                else
                {
                    var header_custconsignee = targetRec.getValue({
                        fieldId : "custbody_consignee"
                    });

                    if(header_custconsignee)
                    {
                        console.log("resolveCurrentLineValue header_custconsignee", header_custconsignee);

                        targetRec.setCurrentSublistValue({
                            sublistId : "item",
                            fieldId : "custcol_consignee",
                            line : targetRec.getCurrentSublistIndex({sublistId : "item"}),
                            value : header_custconsignee
                        });
                    }
                }
            }
            catch(e)
            {
                log.error("ERROR in function resolveConsignee", e);
            }
        }

        /**
         * Validation function to be executed when field is changed.
         *
         * @param {Object} scriptContext
         * @param {Record} scriptContext.currentRecord - Current form record
         * @param {string} scriptContext.sublistId - Sublist name
         * @param {string} scriptContext.fieldId - Field name
         * @param {number} scriptContext.lineNum - Line number. Will be undefined if not a sublist or matrix field
         * @param {number} scriptContext.columnNum - Line number. Will be undefined if not a matrix field
         *
         * @returns {boolean} Return true if field is valid
         *
         * @since 2015.2
         */
        function validateField(scriptContext) {

        }

        /**
         * Validation function to be executed when sublist line is committed.
         *
         * @param {Object} scriptContext
         * @param {Record} scriptContext.currentRecord - Current form record
         * @param {string} scriptContext.sublistId - Sublist name
         *
         * @returns {boolean} Return true if sublist line is valid
         *
         * @since 2015.2
         */
        function validateLine(scriptContext) {

        }

        /**
         * Validation function to be executed when sublist line is inserted.
         *
         * @param {Object} scriptContext
         * @param {Record} scriptContext.currentRecord - Current form record
         * @param {string} scriptContext.sublistId - Sublist name
         *
         * @returns {boolean} Return true if sublist line is valid
         *
         * @since 2015.2
         */
        function validateInsert(scriptContext) {

        }

        /**
         * Validation function to be executed when record is deleted.
         *
         * @param {Object} scriptContext
         * @param {Record} scriptContext.currentRecord - Current form record
         * @param {string} scriptContext.sublistId - Sublist name
         *
         * @returns {boolean} Return true if sublist line is valid
         *
         * @since 2015.2
         */
        function validateDelete(scriptContext) {

        }

        /**
         * Validation function to be executed when record is saved.
         *
         * @param {Object} scriptContext
         * @param {Record} scriptContext.currentRecord - Current form record
         * @returns {boolean} Return true if record is valid
         *
         * @since 2015.2
         */
        function saveRecord(scriptContext) {

        }

        return {
            // pageInit: pageInit,
            fieldChanged: fieldChanged,
            // postSourcing: postSourcing,
            // sublistChanged: sublistChanged,
            lineInit: lineInit,
            // validateField: validateField,
            // validateLine: validateLine,
            // validateInsert: validateInsert,
            // validateDelete: validateDelete,
            // saveRecord: saveRecord
        };

    });
