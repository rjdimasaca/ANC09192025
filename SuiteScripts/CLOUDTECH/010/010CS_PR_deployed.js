/**
 * @NApiVersion 2.x
 * @NScriptType ClientScript
 * @NModuleScope SameAccount
 */

/**
 * 010UE_PR.js userevent on edit cannot fill the buyer field, so do it in client side instead
 * @param runtime
 * @returns
 */
define(['N/runtime'],

function(runtime) {
    
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
    	console.log("fieldChanged", scriptContext);
    }
    
    function pageInit(scriptContext)
    {
    	console.log("010CS_PR_deployed.js pageInit", "pageInit");
    	scriptContext.currentRecord.setValue({
			fieldId : "custbody_010pr_buyer",
			value : runtime.getCurrentUser().id
		});
    }

    return {
        fieldChanged: fieldChanged,
        pageInit: pageInit,
    };
    
});
