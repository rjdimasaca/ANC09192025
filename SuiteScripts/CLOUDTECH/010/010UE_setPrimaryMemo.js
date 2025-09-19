/**
 * @NApiVersion 2.x
 * @NScriptType UserEventScript
 * @NModuleScope SameAccount
 * 
 * @devdescription : sets the line memo to the primary header memo - requested by Nav via skype on 05282020 - TC10ROD
 * 					:adjusted to be applied to itemreceipt as requested by Nav via skype on 06032020/06042020PH - TC10ROD
 */
define(['N/runtime', 'N/search', 'N/record'],

function(runtime, search, record) {
   
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
    	log.debug("beforeLoad scriptContext", scriptContext);
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
    function beforeSubmit(scriptContext)
    {
    	log.debug("beforeSubmit scriptContext", scriptContext);
    	log.debug("runtime.executionContext", runtime.executionContext);
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
    function afterSubmit(scriptContext)
    {
    	try
    	{
    		if(scriptContext.type == "delete")
    		{
    			return;
    		}
    		var recObj = record.load({
    		    type : scriptContext.newRecord.type,
    		    id : scriptContext.newRecord.id
    		});
    		
          //apply to itemreceipt, but columns source is different
          	var memoColumn = "memo";
          var targetsublistId = "inventory"
          if(scriptContext.newRecord.type == "itemreceipt")
            {
              memoColumn = "description";
              targetsublistId = "item";
            }
          
    		var recObj_itemCount = recObj.getLineCount({
    		    sublistId : "item"
    		})
    		
    		var new_mainline_memo_value = "";

    		if(scriptContext.type == "edit" || scriptContext.type == "inlineedit")
            {
    		    new_mainline_memo_value = "";
            }
    		else
    		{
    		    //if not edit mode, retain the old memo, because it may be important memo from integration
                var originalMemo = recObj.getValue({
                    fieldId : "memo"
                });
    		    //new_mainline_memo_value += originalMemo + "\n";
                //allow override, NAV doesnt seem to care about the old memo, she said, IA usually have only 1 item
    		    new_mainline_memo_value = ""
    		}
    		
    		var new_mainline_memo_value_list = [];
            for(var a  = 0 ; a < 1; a++)
            {
              //use memoColumn variable
                var line_memo_value = recObj.getSublistValue({
                    sublistId : targetsublistId,
                    fieldId : memoColumn,
                    line : a
                });
              
              log.debug("line_memo_value", line_memo_value)
                new_mainline_memo_value_list.push(line_memo_value);
            }
            var lineMemos = new_mainline_memo_value_list.join("\n");
            new_mainline_memo_value += lineMemos;
            
            var submittedRecordId = record.submitFields({
                type : scriptContext.newRecord.type,
                id : scriptContext.newRecord.id,
                values : {"memo" : new_mainline_memo_value,
                    custbody_010linememos : lineMemos} //this field is not official, it doesnt hurt submitting this field if it does not exist yet
            })
            
            log.debug("submittedRecordId", submittedRecordId);
    		
    		
    		
    		
    		
            /*var new_mainline_memo_value_list = [];
    		for(var a  = 0 ; a < recObj_itemCount; a++)
    		{
    		    var line_memo_value = recObj.getSublistValue({
    		        sublistId : "inventory",
    		        fieldId : "memo",
    		        line : a
    		    });
    		    new_mainline_memo_value_list.push(line_memo_value);
    		}
    		var lineMemos = new_mainline_memo_value_list.join("\n");
    		new_mainline_memo_value += lineMemos;
    		
    		var submittedRecordId = record.submitFields({
    		    type : scriptContext.newRecord.type,
                id : scriptContext.newRecord.id,
                values : {"memo" : new_mainline_memo_value,
                    custbody_010linememos : lineMemos}
    		})
    		
    		log.debug("submittedRecordId", submittedRecordId);*/
    		
    	}
    	catch(e)
    	{
    		log.error("ERROR in function afterSubmit", {stack : e.stack, message : e.message});
    	}
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
        beforeLoad: beforeLoad,
        beforeSubmit: beforeSubmit,
        afterSubmit: afterSubmit
    };
    
});
