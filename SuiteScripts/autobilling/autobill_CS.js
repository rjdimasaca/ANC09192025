/**
 * @NApiVersion 2.x
 * @NScriptType ClientScript
 * @NModuleScope SameAccount
 */

/**
 * @param runtime
 * @returns
 */
define(['N/runtime', 'N/ui/message'],

function(runtime, message) {
    
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
    	if(scriptContext.fieldId == "custrecord_abd_status")
    	{
    		var statusValue = scriptContext.currentRecord.getValue({
    			fieldId : "custrecord_abd_status"
    		});
    		if(statusValue == "9")
    		{
    			//TODO SS1 for now, find SS2 equivalent later
    			window.nlapiSetFieldMandatory("custrecord_abd_relatedpo", true)
    		}
    		else
    		{
    			//TODO SS1 for now, find SS2 equivalent later
    			window.nlapiSetFieldMandatory("custrecord_abd_relatedpo", false)
    		}
    	}
    }
    
    function pageInit(scriptContext)
    {
    	var queryString = window.location.search;
    	var urlParams = new URLSearchParams(queryString);
    	var showManualUpdateMsg = urlParams.get('showManualUpdateMsg')
    	if(showManualUpdateMsg)
    	{
    		//get rod of url param so u it wont show on refresh or reload
		    urlParams.delete('showManualUpdateMsg');
		    window.history.replaceState(null, null, window.location.pathname + "/" + urlParams)
		    
    		var myMsg2 = message.create({
                title: "Manual Update", 
                message: "This record has been manually updated successfully.", 
                type: message.Type.INFORMATION
            });
    		setTimeout(myMsg2.hide, 7000);
            myMsg2.show();

//    		setTimeout(window.history.replaceState(null, null, window.location.pathname + "/" + urlParams), 7000);
    	}
    	
    	
    	
    	var statusValue = scriptContext.currentRecord.getValue({
			fieldId : "custrecord_abd_status"
		});
    	if(statusValue == "9")
		{
			//TODO SS1 for now, find SS2 equivalent later
			window.nlapiSetFieldMandatory("custrecord_abd_relatedpo", true)
		}
		else
		{
			//TODO SS1 for now, find SS2 equivalent later
			window.nlapiSetFieldMandatory("custrecord_abd_relatedpo", false)
		}
    }
    
    function saveRecord(scriptContext)
    {
    	var isValid = true;
    	var statusValue = scriptContext.currentRecord.getValue({
			fieldId : "custrecord_abd_status"
		});
    	if(statusValue == "9")
		{
    		//make sure u cant submit with no Related PO
    		var relatedPoValue = scriptContext.currentRecord.getValue({
    			fieldId : "custrecord_abd_relatedpo"
    		});
    		
    		if(!relatedPoValue)
    		{
    			isValid = false;
    			alert("" +
    					"You must define a PO." +
    					"\n" +
    					"You will then be redirected to a Bill form for the selected PO." +
    					"\n" +
    					"You will be redirected back to this page after submitting the Bill, and will be able to confirm that this Autobill Entry was completed manually." +
    					"");
    			return isValid;
    		}
    		else
    		{
    			alert("" +
    					"You will be redirected to a Bill form for the selected PO." +
    					"\n" +
    					"After submitting the Bill, You will be redirected back to this page and will be able to confirm that this Autobill Entry was completed manually." +
    					"");
    			
    			return isValid;

    			window.onbeforeunload = null;
    		}
		}
    	
    	return isValid;
    }

    return {
        fieldChanged: fieldChanged,
        pageInit: pageInit,
        saveRecord: saveRecord,
    };
    
});
