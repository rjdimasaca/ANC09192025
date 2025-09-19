/**
 * @NApiVersion 2.1
 * @NScriptType UserEventScript
 */
define(['N/email', 'N/record', 'N/runtime', 'N/search', 'N/url'],
    /**
 * @param{email} email
 * @param{record} record
 * @param{runtime} runtime
 * @param{search} search
 * @param{url} url
 */
    (email, record, runtime, search, url) => {
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
            try
            {
                if(scriptContext.type != "delete")
                {
                    attempt_to_notify(scriptContext);
                }
            }
            catch(e)
            {
                log.error("ERROR in function afterSubmit", e)
            }
        }

        var ANC_SYSTEMS_EMP_ID = 13;
        function attempt_to_notify(scriptContext)
        {
            ANC_SYSTEMS_EMP_ID["1116623_SB2"] = 13;
            ANC_SYSTEMS_EMP_ID["1116623_SB1"] = 13;
            ANC_SYSTEMS_EMP_ID["1116623"] = 13;
            try
            {
                if(scriptContext.oldRecord)
                {
                    var oldRecord_isinactive_val = scriptContext.oldRecord.getValue({
                        fieldId : "isinactive"
                    });
                    var newRecord_isinactive_val = scriptContext.newRecord.getValue({
                        fieldId : "isinactive"
                    });
                    if(oldRecord_isinactive_val && (oldRecord_isinactive_val != "F"))
                    {

                    }
                    else
                    {
                        if(newRecord_isinactive_val && (newRecord_isinactive_val != "F"))
                        {
                            var recordUrl = "";
                            recordUrl = url.resolveRecord({
                                isEditMode : false,
                                recordId : scriptContext.newRecord.id,
                                recordType : scriptContext.newRecord.type, /*"customrecord_alberta_ns_consignee_record",*/
                            });
                            var domainUrl = url.resolveDomain({
                                hostType: url.HostType.APPLICATION,
                                accountId: runtime.accountId
                            });
                            email.send({
                                author : runtime.getCurrentUser().id || ANC_SYSTEMS_EMP_ID,
                                recipients : "consigneealert@albertanewsprint.com",
                                subject : "Consignee inactivated in ANC NetSuite Environment " + runtime.accountId,
                                body : `
                                Consignee Name : ${scriptContext.newRecord.getValue({fieldId : "name"})}
                                <br/>
                                NetSuite Link : <a href="https://${domainUrl + recordUrl}"> ${domainUrl + recordUrl} </a>
                                <br/>
                                Consignee Key : ${scriptContext.newRecord.getValue({fieldId : "custrecord_alberta_ns_consigneekey"})}
                                <br/>
                                Status : Inactive
                                <br/>
                                Inactivation Time : ${new Date().toString()}
                                `
                            })
                            log.debug("Email successfully sent");
                        }
                    }

                }
            }
            catch(e)
            {
                log.error("ERROR in function attempt_to_notify", e)
            }
        }

        return {beforeLoad, beforeSubmit, afterSubmit}

    });
