/**
 * @NApiVersion 2.x
 * @NScriptType Restlet
 * @NModuleScope SameAccount
 */

/***************************************************************************
 * Script Name		: Autobill
 * Script Id		: customscript_autobill
 * Script Deploy Id	: customdeploy_autobill
 * Script File Name	: autobill.js
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
 * Libraries		: autobill.config.js
 * Author			: TC10ROD
 * Dev Version		: 1.0.0 - Initial Release - 03252020 - TC10ROD
 * TODO             : this module and other related objects were intently not following cloudtech standards as the developer originally wanted to take ownership of this module
 **************************************************************************
 */

define(['N/email', 'N/https', 'N/record', 'N/search', 'N/url', 'N/error', './autobill.config.js'],
/**
 * @param {email} email
 * @param {https} https
 * @param {record} record
 * @param {search} search
 * @param {url} url
 */
function(email, https, record, search, url, error, customConfig) {
   
	var MASTERSETUP = {};
	
	
	function createRecord(requestBody)
	{
		var createRecord_results = {};
		createRecord_results.result = {};
		try
		{
			var autobill_recordObj = record.create({
				type : MASTERSETUP.autobill_recordtype
			});
			autobill_recordObj.setValue({
				fieldId : "custrecord_autobilldata_requestdata",
				value : JSON.stringify(requestBody)
			});
			
			var autobill_id = autobill_recordObj.save();
			createRecord_results.result.recordId = autobill_id;
		}
		catch(e)
		{
			log.error("ERROR in function createRecord", e.message);
		}
		return createRecord_results;
	}
	
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
		var responseObj = {};
		var responseText = "";

		var responseObj_simple = {};
		try
		{
			MASTERSETUP = customConfig.masterSetup;
			
			log.debug("doPost requestBody", requestBody)
			
			log.debug("doPost requestBody.length", requestBody.length)
			
			var validationObj = validateRequestBody(requestBody);
			responseObj = validationObj;
			log.debug("validationObj", validationObj);
			
			if(validationObj.isValid)
			{
				//create custom record
				var createRecord_results = createRecord(requestBody);
				
				responseObj.createRecord_results = createRecord_results;
			}
			log.debug(1,1)
			responseObj_simple.status = "SUCCESS";
			responseObj_simple.statusmessage = "SUCCESSFULLY CREATED AUTOBILL ENTRY";

			responseText = JSON.stringify(responseObj_simple)
//			responseText = JSON.stringify({responseObj : responseObj})
			log.debug(2,2)
			
//    		responseText = "harcoded response"
		}
		catch(e)
		{
			log.error("ERROR in function doPost", e.message);
			
			responseObj.status = "FAILED";
			responseObj.statusmessage = e.message;
			
			responseObj_simple.status = "FAILED";
			responseObj_simple.statusmessage = e.message;

			responseText = JSON.stringify(responseObj_simple)
//			responseText = JSON.stringify({responseObj : responseObj})
		}
//    	log.debug("final response", response);
		log.debug("final responseText", responseText);
		return responseText;
	}
	
	function validateRequestBody(requestBody)
	{
		var validationObj = {};
		try
		{
			if(requestBody.poRef && requestBody.amount && requestBody.vendorName)
			{
				validationObj.isValid = true;
			}
			else
			{
				validationObj.isValid = false;
				validationObj.message = "Missing poRef, amount, or vendorName";
			}
		}
		catch(e)
		{
			validationObj.isValid = false;
			log.error("ERROR in function validateRequestBody", e.message);
		}
		return validationObj;
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