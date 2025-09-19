/**
 * @NApiVersion 2.x
 * @NScriptType UserEventScript
 * @NModuleScope SameAccount
 * 
 * @dev_version			:	1.0.0 - initial release
 * 		 					- Gets the BOL Column next to Ref No. Column as requested by Katherine Lakeman on 04212020 - TC10ROD
 * 		 					- TODO for enhancement: this all depends on element attributes, and was assuming there was only one result for data-label=BOL
 * 								This may break if conflicting elements are introduced
 * 		 					- pairs with 010CS_customerPayment.js 1.0.0
 *                          1.0.1 - move memo/external invoice# next to BOL, rename memo to external invoice# as requested by Nav - TC10ROD
 *                          - pair with 010CS_customerPayment.js 1.0.1 
 * 
 * 
 * @dev_dependencies	:	010CS_customerPayment.js
 * 							BOL column on the Customer Payment form
 * 
 * @dev_notes			:	Applies to all form, should not trigger on print
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
    	if(scriptContext.type == "print")
    	{
    		return;
    	}
    	var additionalScriptField = scriptContext.form.addField({
    		type : "inlinehtml",
    		label: "additionalscript",
    		id : "custpage_cstpymnt_addtlscript"
    	})
    	
    	var additionalScript = "<script>;jQuery(document).ready(function(){";
    	if(scriptContext.type == "view")
    	{
    	    //1.0.1
            additionalScript += "window.applyMemoDisplay =" + applyMemoDisplay_view;
            additionalScript += applyMemoDisplay_view;
            
    		additionalScript += "window.applyBolDisplay =" + applyBolDisplay_view;
        	additionalScript += applyBolDisplay_view;
    	}
    	else
    	{
    	    //1.0.1
            additionalScript += "window.applyMemoDisplay =" + applyMemoDisplay;
            additionalScript += applyMemoDisplay;
    	    
        	additionalScript += "window.applyBolDisplay =" + applyBolDisplay;
        	additionalScript += applyBolDisplay;
    	}

        //1.0.1 trigger asap
        additionalScript += "applyMemoDisplay();"
        
    	//trigger asap
    	additionalScript += "applyBolDisplay();"
    		
		additionalScript += "});";
		additionalScript += "</script>";
    	
    	additionalScriptField.defaultValue = additionalScript;
    }
    
    /**
     * 1.0.0 arranges the sublist, for non view mode
     */
    function applyBolDisplay()
    {
    	//get the container of BOL and its children
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
    	
    	//console.log({bolIndex : bolIndex, refNoIndex : refNoIndex});
    	if(bolIndex==-1 || refNoIndex == -1 || bolIndex == refNoIndex + 1)
    	{
    		//console.log("BOL is already next to REF NO.")
    		return;
    	}

    	var headerMode = 0;
    	//apply_splits is the parent container
    	jQuery(jQuery("#apply_splits").children()[0]).children().each(function(elem){
	    	//console.log("THIS LINE", this)
	    	var bolElem = jQuery(this).children()[bolIndex + headerMode];
	    	console.log("bolElem", bolElem);
	    	var refNoElem = jQuery(this).children()[refNoIndex];
	    	jQuery(bolElem).insertAfter(jQuery(refNoElem));
	    	if(headerMode == 0)
	    	{
	    		headerMode += 2; //need to make adjustments because there are childred/columns, in this case 2 adjustment needed thus 2
	    	}
    	});
    }
    
    
    /**
     * 1.0.1 arranges the sublist, for non view mode
     * 
     * TODO for optimization, you can just reuse the index of the refNo when it was defined beforehand, it doesnt really change
     */
    function applyMemoDisplay()
    {
        //get the container of Memo and its children
        var headerContainer_children = jQuery("[data-label=Memo]").parent().children();
        var memoIndex = -1;
        var refNoIndex = -1;
        var loopCounter = 0;
        headerContainer_children.each(function(elem){
            var dataLabelValue = jQuery(this).attr("data-label");
            if(dataLabelValue == "Memo")
            {
                //1.0.1 - TC10ROD body field label in invoice is external invoice #, but it really is just the standard memo field.
                jQuery(this).first().html("External Invoice#");
                
                memoIndex = loopCounter;
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
        
        console.log({memoIndex : memoIndex, refNoIndex : refNoIndex});
        if(memoIndex==-1 || refNoIndex == -1 || memoIndex == refNoIndex + 1)
        {
            console.log("MEMO is already next to REF NO.")
            return;
        }

        var headerMode = 0;
        //apply_splits is the parent container
        jQuery(jQuery("#apply_splits").children()[0]).children().each(function(elem){
            //console.log("THIS LINE", this)
            var memoElem = jQuery(this).children()[memoIndex + headerMode];
            console.log("memoElem", memoElem);
            var refNoElem = jQuery(this).children()[refNoIndex];
            jQuery(memoElem).insertAfter(jQuery(refNoElem));
            if(headerMode == 0)
            {
                headerMode += 2; //need to make adjustments because there are childred/columns, in this case 2 adjustment needed thus 2
            }
        });
    }
    
    
    /**
     * 1.0.1 arranges the sublist, for non view mode
     * 
     * TODO for optimization, you can just reuse the index of the refNo when it was defined beforehand, it doesnt really change
     */
    function applyMemoDisplay_view()
    {
        //get the container of Memo and its children
        var headerContainer_children = jQuery("[data-label=Memo]").parent().children();
        var memoIndex = -1;
        var refNoIndex = -1;
        var loopCounter = 0;
        headerContainer_children.each(function(elem){
            var dataLabelValue = jQuery(this).attr("data-label");
            if(dataLabelValue == "Memo")
            {
                //1.0.1 - TC10ROD body field label in invoice is external invoice #, but it really is just the standard memo field.
                jQuery(this).first().html("External Invoice#");

                memoIndex = loopCounter;
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
        
        //TODO you dont really need this block, because view mode will have no way to edit
        //console.log({memoIndex : memoIndex, refNoIndex : refNoIndex});
        if(memoIndex==-1 || refNoIndex == -1 || memoIndex == refNoIndex + 1)
        {
            //console.log("Memo is already next to REF NO.")
            return;
        }

        var headerMode = 0;
        //apply_splits is the parent container
        jQuery(jQuery("#apply_splits").children()[0]).children().each(function(elem){
            //console.log("THIS LINE", this)
            var memoElem = jQuery(this).children()[memoIndex + headerMode];
            console.log("memoElem", memoElem);
            var refNoElem = jQuery(this).children()[refNoIndex];
            jQuery(memoElem).insertAfter(jQuery(refNoElem));
            if(headerMode == 0)
            {
                headerMode += 0; //need to make adjustments because there are childred/columns,in this case no adjustment needed thus 0
            }
        });
    }
    
    /**
     * 1.0.0 arranges the sublist, for view mode
     */
    function applyBolDisplay_view()
    {
    	//get the container of BOL and its children
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
    	
    	//TODO you dont really need this block, because view mode will have no way to edit
    	//console.log({bolIndex : bolIndex, refNoIndex : refNoIndex});
    	if(bolIndex==-1 || refNoIndex == -1 || bolIndex == refNoIndex + 1)
    	{
    		//console.log("BOL is already next to REF NO.")
    		return;
    	}

    	var headerMode = 0;
    	//apply_splits is the parent container
    	jQuery(jQuery("#apply_splits").children()[0]).children().each(function(elem){
	    	//console.log("THIS LINE", this)
	    	var bolElem = jQuery(this).children()[bolIndex + headerMode];
	    	console.log("bolElem", bolElem);
	    	var refNoElem = jQuery(this).children()[refNoIndex];
	    	jQuery(bolElem).insertAfter(jQuery(refNoElem));
	    	if(headerMode == 0)
	    	{
	    		headerMode += 0; //need to make adjustments because there are childred/columns,in this case no adjustment needed thus 0
	    	}
    	});
    }

    return {
        beforeLoad: beforeLoad,
    };
    
});
