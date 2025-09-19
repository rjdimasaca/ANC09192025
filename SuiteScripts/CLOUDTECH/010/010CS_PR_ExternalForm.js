/**
 * @NApiVersion 2.x
 * @NScriptType ClientScript
 * @NModuleScope SameAccount
 */
define([],

function() {
	
	
	function pageInit(scriptContext)
	{
		try
		{
			
		}
		catch(e)
		{
			console.log("ERROR in function pageInit", e.stack);
		}
	}
	
	function fieldChanged(scriptContext)
	{
		try
		{
			
		}
		catch(e)
		{
			console.log("ERROR in function fieldChanged", e.stack);
		}
	}
	
	return {
		fieldChanged : fieldChanged,
		pageInit : pageInit
	}
});
