/**
 * @NApiVersion 2.x
 * @NScriptType ClientScript
 * @NModuleScope SameAccount
 */
define(['N/currentRecord'],

function(currentRecord) {
    
	var SUBLIST_ID = "custpage_depleteditems";
	var SUBLIST_INCLUDE_ID = "custpage_sl_include";
	
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
    	var isValid = validateReorderingForm(scriptContext);
    	return isValid;
    }
    
    function validateReorderingForm(scriptContext)
    {
    	var isValid = true;
    	
    	isValid = validateIncludeCount(scriptContext)
    	if(!isValid)
    	{
    		return isValid;
    	}
    	
    	return isValid;
    }

    function validateIncludeCount(scriptContext)
    {
    	var isValid = true;
    	try
    	{
    		var includeFirstIndex = scriptContext.currentRecord.findSublistLineWithValue({
    			sublistId : SUBLIST_ID,
    			fieldId : SUBLIST_INCLUDE_ID,
    			value : "T"
    		})
    		
    		if(Number(includeFirstIndex) < 0)
    		{
    			isValid = false;
    			alert("You must select atleast one item(REPAIRABLE).")
    		}
    		
    		console.log("includeFirstIndex", includeFirstIndex)
    		console.log("isValid", isValid)
    	}
    	catch(e)
    	{
    		console.log("ERROR in function validateIncludeCount", e.message);
    		//alert("An error occured during validation of items. Please contact your administrator." + e.message);
    		return false;
    	}
    	return isValid;
    }
    
    return {
        saveRecord: saveRecord
    };
    
});
