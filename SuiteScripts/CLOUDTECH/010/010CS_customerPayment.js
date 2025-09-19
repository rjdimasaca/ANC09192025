/**
 * @NApiVersion 2.x
 * @NScriptType ClientScript
 * @NModuleScope SameAccount
 * 
 * @dev_version			:	1.0.0 - initial release
 * 		 					- Gets the BOL Column next to Ref No. Column as requested by Katherine Lakeman on 04212020 - TC10ROD
 * 		 					- TODO for enhancement: this all depends on element attributes, and was assuming there was only one result for data-label=BOL
 * 								This may break if conflicting elements are introduced
 * 		 					- pairs with 010UE_customerPayment.js 1.0.0
 *                          1.0.1 - move memo/external invoice# next to BOL, rename memo to external invoice# as requested by Nav - TC10ROD
 *                          - pair with 010UE_customerPayment.js 1.0.1
 * 
 * @dev_dependencies	:	010UE_customerPayment.js
 * 							BOL column on the Customer Payment form
 * 
 * @dev_notes			:	Applies to all form, should not trigger on print 
 */
define(['N/currentRecord'],

function(currentRecord) {
    
	var SUBLIST_ID = "custpage_depleteditems";
	var SUBLIST_INCLUDE_ID = "custpage_sl_include";
	
    /**
     * Validation function to be executed when record is changed.
     *
     */
    function fieldChanged(scriptContext)
    {
    	//TODO may need to do this in postsourcing
    	if(scriptContext.fieldId == "customer")
    	{
    		//console.log("customer was triggered!")
    	    //1.0.1 - added logic for MEMO/External Invoice#
    	    window.applyMemoDisplay();
    	    
    	    //for some reason delaying the call gets a better result than calling the next code straight away - TC10ROD
    	    var timeOutDelay = setTimeout(function(){
    	        window.applyBolDisplay();
    	        console.log("calling applyBolDisplay");
    	        clearTimeout(timeOutDelay);
    	        }, 100);
    		//window.applyBolDisplay();
    	}
    }
    
    return {
        postSourcing: fieldChanged
    };
    
});
