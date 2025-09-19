/**
 * @NApiVersion 2.1
 * @NScriptType ClientScript
 * @NModuleScope SameAccount
 */
define([],

function() {



    /**
     * Function to be executed after page is initialized.
     *
     * @param {Object} scriptContext
     * @param {Record} scriptContext.currentRecord - Current form record
     * @param {string} scriptContext.mode - The mode in which the record is being accessed (create, copy, or edit)
     *
     * @since 2015.2
     */
    function pageInit(scriptContext)
    {

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
        try
        {
            if(scriptContext.fieldId == "custbodycustbody_fsctransaction" || scriptContext.fieldId == "custbody_pefctransaction")
            evaluateCertificationConflicts(scriptContext, true);
        }
        catch(e)
        {
            console.log("ERROR in function fieldChanged", e);
            log.error("ERROR in function fieldChanged", e);
        }
    }

    function evaluateCertificationConflicts(scriptContext, doFix)
    {
        var isValid = true;
        try
        {
            var isFSC = scriptContext.currentRecord.getValue({fieldId : "custbodycustbody_fsctransaction"});
            var isPEFC = scriptContext.currentRecord.getValue({fieldId : "custbody_pefctransaction"});
            if(((isFSC && isFSC != "F") && (isPEFC && isPEFC != "F")) || ((isPEFC && isPEFC != "F") && (isFSC && isFSC != "F")))
            {
                if(doFix)
                {
                    isValid = false;
                    if(scriptContext.fieldId == "custbodycustbody_fsctransaction")
                    {
                        alert("PEFC CERT UNCHECKED, you cannot mark record as both FSC and PEFC certified.");
                        scriptContext.currentRecord.setValue({
                            fieldId : "custbody_pefctransaction",
                            value : false,
                            ignoreFieldChange : true
                        });
                    }
                    else if(scriptContext.fieldId == "custbody_pefctransaction")
                    {
                        alert("FSC CERT UNCHECKED, you cannot mark record as both FSC and PEFC certified.");
                        scriptContext.currentRecord.setValue({
                            fieldId : "custbodycustbody_fsctransaction",
                            value : false,
                            ignoreFieldChange : true
                        });
                    }
                }
                else
                {
                    alert("Certification Conflict, you cannot mark record as both FSC and PEFC certified.");
                    isValid = false;
                }
            }
        }
        catch(e)
        {
            console.log("ERROR in function evaluateCertificationConflicts", e);
            log.error("ERROR in function evaluateCertificationConflicts", e);
        }
        return isValid;
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
    function lineInit(scriptContext) {

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
    function saveRecord(scriptContext)
    {
        var evalCertRes = true;
        try
        {
            evalCertRes = evaluateCertificationConflicts(scriptContext, false)
        }
        catch(e)
        {
            console.log("ERROR in function saveRecord", e);
            log.error("ERROR in function saveRecord", e);
        }
        return evalCertRes;
    }

    return {
        // pageInit: pageInit,
        fieldChanged: fieldChanged,
        // postSourcing: postSourcing,
        // sublistChanged: sublistChanged,
        // lineInit: lineInit,
        // validateField: validateField,
        // validateLine: validateLine,
        // validateInsert: validateInsert,
        // validateDelete: validateDelete,
        saveRecord: saveRecord
    };

});
