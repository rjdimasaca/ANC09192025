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
            
        }

        

        function handleBankDetails(scriptContext)
        {
            log.debug("handleBankDetails scriptContext", scriptContext)
            try{
                if(scriptContext.type == "create" /*|| scriptContext.type == "edit"*/)
                {
                    setDefaults(scriptContext)
                }
            }
            catch(e)
            {
                log.error("ERROR in function handleBankDetails", e)
            }
        }

        function setDefaults(scriptContext)
        {
            log.debug("setDefaults scriptContext", scriptContext)
            let defaultValues = [ 
                {fieldId : "custrecord_2663_entity_file_format", value : "72"}, //RBC Standard - CAD
                {fieldId : "custrecord_2663_entity_bank_type", value : "1"}, //primary
                //{fieldId : "custrecord_2663_entity_acct_no", value : "333"},
            ];
            try{
                for(var a = 0 ; a < defaultValues.length ; a++)
                {
                    log.debug("setDefaults loop defaultValues[a]" + a, defaultValues[a])
                    scriptContext.newRecord.setValue(defaultValues[a])
                }
            }
            catch(e)
            {
                log.error("ERROR in function setDefaults", e)
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
        const beforeSubmit = (scriptContext) => 
        {
            log.debug("beforeSubmit scriptContext", scriptContext)
            handleBankDetails(scriptContext)
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

        }

        return {/* beforeLoad, */ beforeSubmit, /* afterSubmit */}

    });
