/**
 * @NApiVersion 2.1
 * @NScriptType UserEventScript
 */
define(['N/record'],
    /**
 * @param{record} record
 */
    (record) => {
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
        const afterSubmit = (scriptContext) =>
        {
            try
            {
                if(scriptContext.type == "create" || scriptContext.type == "edit" || scriptContext == "xedit")
                {
                    let fieldPrefix = {
                        inventoryitem : "custitem",
                        lotnumberedinventoryitem : "custitem",
                        noninventoryitem : "custitem",
                        serviceitem : "custitem",
                    };
                    let proxyInternalIdField = `${fieldPrefix[scriptContext.newRecord.type] || ''}_anc_proxyexternalid`
                    let proxyExternalId_old = scriptContext.oldRecord ? scriptContext.oldRecord.getValue({
                        fieldId :proxyInternalIdField
                    }) : "";
                    let proxyExternalId_new = scriptContext.newRecord ? scriptContext.newRecord.getValue({
                        fieldId : proxyInternalIdField
                    }) : "";
                    let externalId_old = scriptContext.oldRecord ? scriptContext.oldRecord.getValue({
                        fieldId : `externalid`
                    }) : "";
                    let externalId_new = scriptContext.newRecord ? scriptContext.newRecord.getValue({
                        fieldId : `externalid`
                    }) : "";

                    let submittedRecId = "";
                    let values = {};
                    if(proxyExternalId_new || externalId_new)
                    {
                        if(proxyExternalId_old !== proxyExternalId_new)
                        {
                            values = {};
                            values["externalid"] = proxyExternalId_new || null
                            submittedRecId = record.submitFields({
                                type : scriptContext.newRecord.type,
                                id : scriptContext.newRecord.id,
                                values : values
                            })
                        }
                        else if(externalId_new !== externalId_old)
                        {
                            values = {};
                            values[proxyInternalIdField] = externalId_new
                            submittedRecId = record.submitFields({
                                type : scriptContext.newRecord.type,
                                id : scriptContext.newRecord.id,
                                values : values
                            })
                        }
                        else
                        {
                            //01292024 - handle allow blanking
                            if(proxyExternalId_new !== externalId_new)
                            {
                                values = {};
                                values["externalid"] = proxyExternalId_new || null
                                submittedRecId = record.submitFields({
                                    type : scriptContext.newRecord.type,
                                    id : scriptContext.newRecord.id,
                                    values : values
                                })
                            }
                            
                        }
                    }

                    log.debug("{fieldPrefix, proxyExternalId_new, proxyExternalId_old, externalId_new, externalId_old, values}", {fieldPrefix, proxyExternalId_new, proxyExternalId_old, externalId_new, externalId_old, values})


                    log.debug("submittedRecId", submittedRecId);
                }
            }
            catch(e)
            {
                log.error("ERROR in function afterSubmit", e);
            }
        }

        return {/*beforeLoad, beforeSubmit,*/ afterSubmit}

    });
