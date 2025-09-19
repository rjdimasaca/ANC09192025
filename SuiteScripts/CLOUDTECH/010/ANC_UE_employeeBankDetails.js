/**
 * @NApiVersion 2.1
 * @NScriptType UserEventScript
 */
define(['N/record', 'N/redirect', 'N/runtime', 'N/search', 'N/url'],
    /**
 * @param{record} record
 * @param{redirect} redirect
 * @param{runtime} runtime
 * @param{search} search
 * @param{url} url
 */
    (record, redirect, runtime, search, url) => {
        /**
         * Defines the function definition that is executed before record is loaded.
         * @param {Object} scriptContext
         * @param {Record} scriptContext.newRecord - New record
         * @param {string} scriptContext.type - Trigger type; use values from the context.UserEventType enum
         * @param {Form} scriptContext.form - Current form
         * @param {ServletRequest} scriptContext.request - HTTP request information sent from the browser for a client action only.
         * @since 2015.2
         */
        const beforeLoad = (scriptContext) =>
        {
            try
            {
            }
            catch(e)
            {
                log.error("ERROR in function beforeLoad", e);
            }
        }

        function handleRecord(scriptContext)
        {
            try
            {
                if(scriptContext.type == "delete")
                {
                    return;
                }
                upsertBankDetails(scriptContext);
            }
            catch(e)
            {
                log.error("ERROR in function handleRecord", e);
            }
        }

        function upsertBankDetails(scriptContext)
        {
            try
            {
                // var bankDetailPrefix = "RBC Standard - CAD -";
                var bankDetailPrefix = "";
                // var bankDetailSuffix = " - RBC Standard - CAD";
                var bankDetailSuffix = "";
                var bankDetailId = "";
                var customrecord_2663_entity_bank_detailsSearchObj = search.create({
                    type: "customrecord_2663_entity_bank_details",
                    filters:
                        [
                            ["custrecord_2663_parent_employee","anyof",scriptContext.newRecord.id],
                            "AND",
                            ["custrecord_2663_entity_file_format","anyof","72"], //RBC Cad
                            "AND",
                            ["custrecord_2663_entity_bank_type","anyof","1"] //primary
                        ],
                    columns:
                        [
                            search.createColumn({name: "name", label: "Name"}),
                            search.createColumn({name: "scriptid", label: "Script ID"}),
                            search.createColumn({name: "custrecord_2663_entity_bank_type", label: "Type"}),
                            search.createColumn({name: "custrecord_2663_entity_file_format", label: "Payment File Format"}),
                            search.createColumn({name: "custrecord_2663_entity_acct_no", label: "Bank Account Number"}),
                            search.createColumn({name: "custrecord_2663_entity_bank_no", label: "Bank Number"}),
                            search.createColumn({name: "custrecord_2663_entity_branch_no", label: "Branch Number"}),
                            search.createColumn({name: "custrecord_9572_subsidiary", label: "Subsidiary"})
                        ]
                });
                var searchResultCount = customrecord_2663_entity_bank_detailsSearchObj.runPaged().count;
                log.debug("customrecord_2663_entity_bank_detailsSearchObj result count",searchResultCount);
                customrecord_2663_entity_bank_detailsSearchObj.run().each(function(result){
                    // .run().each has a limit of 4,000 results
                    bankDetailId = result.id;
                    return true;
                });

                var recordObj = "";
                var fieldValues = {
                    custentity_anc_ukg_entity_acct_no : {mapsTo: "custrecord_2663_entity_acct_no", value: ""},
                    custentity_anc_ukg_entity_branch_no : {mapsTo: "custrecord_2663_entity_branch_no", value: ""},
                    custentity_anc_ukg_entity_bank_no : {mapsTo: "custrecord_2663_entity_bank_no", value: ""},
                };

                for(var fieldId in fieldValues)
                {
                    fieldValues[fieldId].value = scriptContext.newRecord.getValue({
                        fieldId : fieldId
                    })
                }
                log.debug("fieldValues", fieldValues);

                if(bankDetailId)
                {
                    recordObj = record.load({
                        type : "customrecord_2663_entity_bank_details",
                        id: bankDetailId
                    })
                }
                else
                {
                    recordObj = record.create({
                        type : "customrecord_2663_entity_bank_details",
                    })
                }

                for(var fieldId in fieldValues)
                {

                    log.debug(fieldId + " " + "fieldValues[fieldId]", fieldValues[fieldId]);
                    if(fieldValues[fieldId].mapsTo)
                    {
                        if(fieldValues[fieldId].value || fieldValues[fieldId].value.length > 0)
                        {
                            recordObj.setValue({
                                fieldId : fieldValues[fieldId].mapsTo,
                                value : fieldValues[fieldId].value
                            })
                        }
                    }
                }

                //ensure, TODO dont set if already correct?
                recordObj.setValue({
                    fieldId : "name",
                    value : bankDetailPrefix + scriptContext.newRecord.getValue({fieldId : "entityid"}) + bankDetailSuffix
                })

                recordObj.setValue({
                    fieldId : "custrecord_2663_parent_employee",
                    value : scriptContext.newRecord.id
                })

                recordObj.setValue({
                    fieldId : "custrecord_2663_entity_file_format",
                    value : 72
                })

                recordObj.setValue({
                    fieldId : "custrecord_2663_entity_bank_type",
                    value : 1
                })

                var bankRecId = recordObj.save({
                    ignoreMandatoryFields : true,
                    allowSourcing : true
                })

                log.debug("bankRecId", bankRecId);
            }
            catch(e)
            {
                log.error("ERROR in function upsertBankDetails", e);
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
            try
            {
                handleRecord(scriptContext);
            }
            catch(e)
            {
                log.error("ERROR in function afterSubmit", e);
            }
        }

        return {/*beforeLoad, beforeSubmit, */afterSubmit}

    });
