/**
 * @NApiVersion 2.x
 * @NScriptType UserEventScript
 * @NModuleScope SameAccount
 */
define(['N/search', 'N/runtime'],
/**
 * @param {email} email
 * @param {https} https
 * @param {record} record
 * @param {redirect} redirect
 * @param {serverWidget} serverWidget
 * @param {url} url
 */
function(search, runtime) {
   
    /**
     * Function definition to be triggered before record is loaded.
     *
     * @param {Object} scriptContext
     * @param {Record} scriptContext.newRecord - New record
     * @param {string} scriptContext.type - Trigger type
     * @param {Form} scriptContext.form - Current form
     * @Since 2015.2
     */
    function beforeLoad(scriptContext)
    {
        try
        {
            log.debug("beforeLoad triggered", scriptContext)
            if(scriptContext.type == "create" && runtime.executionContext == runtime.ContextType.USER_INTERFACE)
            {
                var unapproveJe_result = unapproveJe(scriptContext);
            }
        }
        catch(e)
        {
            log.error("ERROR in function beforeSubmit", e.message);
        }
    }
    
    /**
     * Function definition to be triggered before record is loaded.
     *
     * @param {Object} scriptContext
     * @param {Record} scriptContext.newRecord - New record
     * @param {string} scriptContext.type - Trigger type
     * @param {Form} scriptContext.form - Current form
     * @Since 2015.2
     */
    function beforeSubmit(scriptContext)
    {
        try
        {
            log.debug("beforeSubmit triggered", scriptContext)
            if(scriptContext.type == "create" && runtime.executionContext == runtime.ContextType.USER_INTERFACE)
            {
                var unapproveJe_result = unapproveJe(scriptContext);
            }
        }
        catch(e)
        {
            log.error("ERROR in function beforeSubmit", e.message);
        }
    }
    
    function unapproveJe(scriptContext)
    {
        var unapproveJe_result = {success:false};
        try
        {
            log.debug("3gerred")
            scriptContext.newRecord.setValue({
                fieldId : "approved",
                value : false
            })
        }
        catch(e)
        {
            log.error("ERROR in function unapproveJe", e.message);
        }
        
        return unapproveJe_result;
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

    return {
        beforeSubmit: beforeSubmit,
        beforeLoad: beforeLoad,
    };
    
});
