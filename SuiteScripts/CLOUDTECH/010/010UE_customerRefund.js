/**
 * @NApiVersion 2.x
 * @NScriptType UserEventScript
 * @NModuleScope SameAccount
 */
define(['N/record', 'N/runtime', 'N/search', 'N/url'],
/**
 * @param {record} record
 * @param {runtime} runtime
 * @param {search} search
 * @param {url} url
 */
function(record, runtime, search, url) {
   
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
    	if(scriptContext.type == "view")
    	{
    	    var targetScriptId = "customscript_010custrefundprintout";
    	    var targetDeployId = "customdeploy_010custrefundprintout";
    	    
    	    var subsidiaryValue = scriptContext.newRecord.getValue({
    	        fieldId : "subsidiary"
    	    });
    	    if(subsidiaryValue == "2")
    	    {
    	        targetScriptId = "customscript_010custrefundprintouttimber";
                targetDeployId = "customdeploy_010custrefundprintouttimber";
    	    }
            
    		var recId = scriptContext.newRecord.id;
    		var recType = scriptContext.newRecord.type;
    		var targetCommand = "window.location.href=";
        	var targetUrl = url.resolveScript({
        	    scriptId: targetScriptId,
        	    deploymentId: targetDeployId,
        	    returnExternalUrl: false
        	});
        	targetCommand += targetUrl;
        	log.debug("targetCommand", targetCommand)
        	scriptContext.form.addButton({
        		id : "custpage_printcustomerrefundbtn",
        		label : "Print",
        		functionName : 'location.assign("' + targetUrl + '&recId=' + recId + '&recType=' + recType + '");'
        	})    		
    	}
    	
    	var additionalScriptField = scriptContext.form.addField({
    		type : "inlinehtml",
    		label: "additionalscript",
    		id : "custpage_cstpymnt_addtlscript"
    	})
    	
    	var additionalScript = "<script>;jQuery(document).ready(function(){";
    	
    	additionalScript += applyBolDisplay;

    	additionalScript += "window.applyBolDisplay =" + applyBolDisplay;
    	
    	//trigger asap
    	additionalScript += "applyBolDisplay();"
    		
		additionalScript += "});";
		additionalScript += "</script>";
    	
    	additionalScriptField.defaultValue = additionalScript;
    }
    
    function applyBolDisplay()
    {
    	var headerContainer_children = jQuery("[data-label=BOL]").parent().children();
    	var bolIndex = -1;
    	var refNoIndex = -1;
    	var loopCounter = 0;
    	headerContainer_children.each(function(elem){

    	var dataLabelValue = jQuery(this).attr("data-label");
    	if(dataLabelValue == "BOL")
    	{
    	    bolIndex = loopCounter;
    	    //return;
    	}
    	if(dataLabelValue == "Ref No.")
    	{
    	    refNoIndex = loopCounter;
    	    //return;
    	}

    	//console.log("dataLabelValue", dataLabelValue)

    	loopCounter++;
    	})


    	var headerMode = 0;
    	jQuery(jQuery("#apply_splits").children()[0]).children().each(function(elem){
    	/*
    	console.log("lines", jQuery(this));

    	console.log("lines BOL", jQuery(this).children()[12]);
    	console.log("lines REFNO", jQuery(this).children()[4]);
    	*/
    	console.log("THIS LINE", this)
    	var bolElem = jQuery(this).children()[bolIndex + headerMode];

    	console.log("bolElem", bolElem);
    	var refNoElem = jQuery(this).children()[refNoIndex];

    	jQuery(bolElem).insertAfter(jQuery(refNoElem));

    	if(headerMode == 0)
    	{
    	headerMode += 2;
    	}
    	});
    }

    /**
     * Function definition to be triggered before record is loaded.
     *
     * @param {Object} scriptContext
     * @param {Record} scriptContext.newRecord - New record
     * @param {Record} scriptContext.oldRecord - Old record
     * @param {string} scriptContext.type - Trigger type
     * @Since 2015.2
     */
    function beforeSubmit(scriptContext) {

    }

    /**
     * Function definition to be triggered before record is loaded.
     *
     * @param {Object} scriptContext
     * @param {Record} scriptContext.newRecord - New record
     * @param {Record} scriptContext.oldRecord - Old record
     * @param {string} scriptContext.type - Trigger type
     * @Since 2015.2
     */
    function afterSubmit(scriptContext) {

    }

    return {
        beforeLoad: beforeLoad,
        beforeSubmit: beforeSubmit,
        afterSubmit: afterSubmit
    };
    
});
