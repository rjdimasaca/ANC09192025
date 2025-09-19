/**
 * @NApiVersion 2.x
 * @NScriptType Restlet
 * @NModuleScope SameAccount
 */

/***************************************************************************
 * Script Name		: 010 RL Integrate Client
 * Script Id		: customscript_010rl_pr_api
 * Script Deploy Id	: customdeploy_010rl_pr_api
 * Script File Name	: 010RL_purchaseRequisitionApi.js
 * Script Type		: Restlet Script
 * SuiteScript Ver	: 2.0
 * References		: 
 * 					010 PR INTEGRATION
 * 						Consumer Key
 * 							a5aef50d07d3b5def59eb2670077e7add032ae0c4c4678edc939e2083a099ec2
 * 						Consumer Secret
 * 							1786ac8b5c9d0a3bba915ffb9502be58d9e26ab244eb584f6001252140761c49
 * 					  TOKEN ID SAMPLE
 * 						953e717594228d2f91a6e9216ded6b4375371be3e40ae2582f134f9c9d97e37a
 * 					  TOKEN SECRET SAMPLE
 * 						ec68d3358303479bad04377c63db9febbd4825dc95bf279cd1979bb1c4aba0fc
 * 
 * 
 * 						JITTERBIT TOKEN
 * 						371ba6ef354940f662f165c51bf422193737b84588e875f67221ea19fa1791d9
 * 						JITTERBIT SECRET
 * 						62d1657ee62c90b457ad0efd848e252aeadf2dbf4c357b953abac5d1ea5bb6cf
 * Dependencies		: 
 * Libraries		:
 * Author			: TC10ROD
 * Dev Version		: 1.0.0 - Initial Release - 02072020 - TC10ROD
 **************************************************************************
 */

define(['N/email', 'N/https', 'N/record', 'N/search', 'N/url'],
/**
 * @param {email} email
 * @param {https} https
 * @param {record} record
 * @param {search} search
 * @param {url} url
 */
function(email, https, record, search, url) {
   
    /**
     * Function called upon sending a POST request to the RESTlet.
     *
     * @param {string | Object} requestBody - The HTTP request body; request body will be passed into function as a string when request Content-Type is 'text/plain'
     * or parsed into an Object when request Content-Type is 'application/json' (in which case the body must be a valid JSON)
     * @returns {string | Object} HTTP response body; return string when request Content-Type is 'text/plain'; return Object when request Content-Type is 'application/json'
     * @since 2015.2
     */
	function doPost(requestBody)
    {
    	var response = "";
    	try
    	{
          	log.debug("doPost requestBody", requestBody)
          	validationObj = validateRequestBody(requestBody);
          	var requisitionObj = {};
          	if(validationObj.isValid)
          	{
          		requisitionObj = createRequisition_anc(requestBody);
          	}
          	
          	log.debug(1,1)
    		var obj = JSON.stringify({requisitionObj : requisitionObj})
    		log.debug(2,2)
          	response = obj;
          	log.debug(3,3)
    		
//    		log.debug("obj", obj);
//    		log.debug("response", response);
    		
    		response = "harcoded response"
    		
//    		response = "POST METHOD TRIGGERED";
//    		response = "tsahahaha post1"
    	}
    	catch(e)
    	{
    		log.error("ERROR in function doPost", e.message);
    	}
    	log.debug("final response", response);
    	return response;
    }
	
	var mapping = {
			body : [
				{
					nsField : "entity",
					requestBody_source : "requestor",
					lookupType : "singleLookup"
				},
				{
					nsField : "custbody_010pr_buyer",
					requestBody_source : "buyer",
				},
				{
					nsField : "department",
					requestBody_source : "department",
				},
				{
					nsField : "duedate",
					requestBody_source : "daterequired",
				},
				{
					nsField : "trandate",
					requestBody_source : "trandate",
				},
				{
					nsField : "memo",
					requestBody_source : "memo",
				},
				{
					nsField : "custbody_work_order",
					requestBody_source : "workorder",
				},
			],
			item : [
				{
					nsField : "item",
					requestBody_source : "item",
					lookupType : "bulkLookup"
				},
				{
					nsField : "vendor",
					requestBody_source : "vendor",
					ignoreIfEmpty : true,
					lookupType : "bulkLookup"
				},
				{
					nsField : "quantity",
					requestBody_source : "quantity",
					ignoreIfEmpty : true
				},
				{
					nsField : "units",
					requestBody_source : "units",
					ignoreIfEmpty : true,
					lookupType : "bulkLookup"
				},
				{
					nsField : "description",
					requestBody_source : "description",
					ignoreIfEmpty : true
				},
				{
					nsField : "estimatedrate",
					requestBody_source : "estimatedrate",
					ignoreIfEmpty : true
				},
				{
					nsField : "custcol_010pr_cstmzd_prrate",
					requestBody_source : "estimatedrate",
					ignoreIfEmpty : true
				},
			]
	}
	
	function createRequisition_anc(requestBody)
    {
    	var requisitionObj = {};
    	try
    	{
    		var requestBodyObj = requestBody;
//    		var requestBodyObj = JSON.stringify(requestBody);
    		log.debug("createRequisition_anc typeof(requestBodyObj)", typeof(requestBodyObj))
    		requestBodyObj = JSON.parse(requestBodyObj);
    		
    		var finalValues = {};
    		finalValues.body = [];
    		finalValues.item = [];
    		log.debug("createRequisition_anc requestBodyObj", requestBodyObj)
    		
    		
    		
    		if(requestBodyObj.body)
    		{
    			log.debug("createRequisition_anc mapping.body", mapping.body)
    			for(var a = 0 ; a < mapping.body.length ; a++)
        		{
        			var entry = mapping.body[a];
        			var requestBodyObj_value = requestBodyObj.body[entry.requestBody_source];

        			log.debug("createRequisition_anc requestBodyObj_value", requestBodyObj_value)
        			if(requestBodyObj_value)
        			{
        				entry.value = requestBodyObj_value;
        				
        				//TODO take care of the lookup for fields that require lookup
        				
        				log.debug("createRequisition_anc entry", entry)
        				
        				finalValues.body.push(entry);
        			}
        		}
    		}
    		
    		if(requestBodyObj.item)
    		{
    			for(var x = 0; x < requestBodyObj.item.length; x++)
    			{
    				var lineEntry = [];
    				for(var a = 0 ; a < mapping.item.length ; a++)
            		{
            			var fieldEntry = mapping.item[a];
            			var requestBodyObj_value = requestBodyObj.item[x][fieldEntry.requestBody_source];
            			if(requestBodyObj_value)
            			{
            				fieldEntry.value = requestBodyObj_value;
            				//TODO take care of the lookup for fields that require lookup
            			}
            			lineEntry.push(fieldEntry);
            		}

        			finalValues.item.push(lineEntry)
    			}
    		}
    		
    		log.debug("finalValues", finalValues);
    		
    		var targetRec = record.create({
    			type : "purchaserequisition",
    			isDynamic : true
    		})
    		
    		for(var a = 0 ; a < finalValues.body.length ; a++)
    		{
    			var entry = finalValues.body[a];
    			log.debug("body entry", entry);
    			if(!entry.value)
    			{
    				if(!entry.ignoreIfEmpty)
    				{
    					targetRec.setValue({
            				fieldId : entry.nsField,
            				value : entry.value
            			})
    				}
    			}
    			else
    			{
    				targetRec.setValue({
        				fieldId : entry.nsField,
        				value : entry.value
        			})
    			}
    		}
    		
    		for(var a = 0 ; a < finalValues.item.length ; a++)
    		{
    			var lineEntry = finalValues.item[a];
    			targetRec.selectNewLine({
    				sublistId : "item"
    			})
    			
    			for(var x = 0 ; x < lineEntry.length ; x++)
    			{
    				var fieldEntry = lineEntry[x];
    				log.debug("fieldEntry", fieldEntry);
    				if(!fieldEntry.value)
        			{
        				if(!fieldEntry.ignoreIfEmpty)
        				{
        					targetRec.setCurrentSublistValue({
        						sublistId : "item",
                				fieldId : fieldEntry.nsField,
                				value : fieldEntry.value,
                				line : a
                			})
        				}
        			}
        			else
        			{
        				targetRec.setCurrentSublistValue({
    						sublistId : "item",
            				fieldId : fieldEntry.nsField,
            				value : fieldEntry.value,
            				line : a
            			})
        			}
        			log.debug("item fieldEntry", fieldEntry);
    			}
    			
    			var currentItemBeforeCommit = targetRec.getCurrentSublistValue({
					sublistId : "item",
    				fieldId : "item",
    			});
    			log.debug("currentItemBeforeCommit", currentItemBeforeCommit);
    			
    			targetRec.commitLine({
    				sublistId : "item"
    			})
    		}
    		
    		var targetRec_submittedRecId = targetRec.save();
    		log.debug("targetRec_submittedRecId", targetRec_submittedRecId);
    		requisitionObj.createdRecordId = targetRec_submittedRecId;
    		requisitionObj.finalValues = finalValues;
    	}
    	catch(e)
    	{
    		log.error("ERROR in function createRequisition_anc", e.message);
    	}
    	return requisitionObj;
    }
    
    function getRecordViaExternalRef(params)
    {
    	try
    	{
    		search.create({
    			type : params.type,
    			filters : [
    				
    			],
    			columns : [
    				
    			]
    		})
    	}
    	catch(e)
    	{
    		log.error("ERROR in function getRecordViaExternalRef", e.message);
    	}
    }
    
    function validateRequestBody(requestBody)
    {
    	var validationObj = {};
    	try
    	{
    		validationObj.isValid = true;
    	}
    	catch(e)
    	{
    		validationObj.isValid = false;
    		log.error("ERROR in function validateRequestBody", e.message);
    	}
    	return validationObj;
    }
  
    function doGet(requestBody)
    {
    	var response = "GET METHOD RESPONSE";
    	try
    	{
          	log.debug("doGet requestBody", requestBody)
    		response = "GET METHOD RESPONSE"
    	}
    	catch(e)
    	{
    		log.error("ERROR in function doGet", e.message);
    	}
    	return response;
    }
    
    function doPut(requestBody)
    {
    	var response = "PUT METHOD RESPONSE";
    	try
    	{
          	log.debug("doGet requestBody", requestBody)
    		response = "PUT METHOD RESPONSE"
    	}
    	catch(e)
    	{
    		log.error("ERROR in function doPut", e.message);
    	}
    	return response;
    }

    return {
        post: doPost,
        get: doGet,
        put: doPut,
    };
    
});
