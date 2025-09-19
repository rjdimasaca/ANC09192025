/**
 * @NApiVersion 2.x
 * @NScriptType Suitelet
 * @NModuleScope SameAccount
 */
define(['N/record', 'N/runtime', 'N/search', 'N/url', 'N/ui/serverWidget', 'N/task',],
/**
 * @param {record} record
 * @param {runtime} runtime
 * @param {search} search
 * @param {url} url
 */
function(record, runtime, search, url, ui, task) {

	function onRequest(scriptContext)
	{
		log.debug("010SL_deleteLimsAndJournals.js, scriptContext", scriptContext);
		if(scriptContext.request.method == "GET")
		{
			var searchForSavedSearch = search.create({
				type : "savedsearch",
				columns : [
					search.createColumn({name : "internalid"}),
					search.createColumn({name : "title", sort: search.Sort.ASC}),
					]
			})
			
			var searchForSavedSearch_results = getResults(searchForSavedSearch.run());
			
			log.debug("searchForSavedSearch_results", searchForSavedSearch_results);
			
			var form = ui.createForm({ title: "DELETE LIMS and JOURNALS"});
			var search_field = form.addField({
				id : "custpage_savedsearches",
				label : "saved searches",
				type : "multiselect",
//				source : "savedsearch"
			})
			
			search_field.updateDisplaySize({
			    height : 60,
			    width : 1000
			});
			
			search_field.isMandatory = true; 
			
			for(var a = 0 ; a < searchForSavedSearch_results.length ; a++)
			{
				search_field.addSelectOption({
					value : searchForSavedSearch_results[a].id,
					text : searchForSavedSearch_results[a].getValue(search.createColumn({name : "title"}))
				})				
			}
			
			form.addSubmitButton({
				label : "Submit"
			})
			
			scriptContext.response.writePage(form);
		}
		else if(scriptContext.request.method == "POST")
		{
			var currentUser = runtime.getCurrentUser();
			
			var custscript_submissionid = new Date().getTime();
			
			log.debug("POST scriptContext.request.parameters", scriptContext.request.parameters);
			form = ui.createForm({
				title : "Processing... " +
						"<br/>" +
						"submission id : " + custscript_submissionid +
						"<br/>" +
						"The progress and results will be sent to your email address : " +
						"" + currentUser.email
			})
			var searchIdsToProcess = [];
			var searchIdsToProcess = scriptContext.request.parameters.custpage_savedsearches;
			if(searchIdsToProcess)
			{
				searchIdsToProcess = searchIdsToProcess.split("\u0005");
				
				var runnableTask = task.create({
			        taskType: task.TaskType.MAP_REDUCE,
			        scriptId: 'customscript_010mr_deletelimsandjournals',
			        params: {
			        	custscript_searchids: searchIdsToProcess,
			        	custscript_dlaj_submissionid : custscript_submissionid
			        }
				});
				log.debug("runnableTask", runnableTask);
				var mrStatus = runnableTask.submit();
				log.debug("mrStatus1", mrStatus);
				if(mrStatus)
				{
					  log.debug("mrStatus2", mrStatus);
					  scriptContext.response.writePage(form);
				}
				else
				{
					log.debug("mrStatus3", mrStatus);
					var fail_asResponse = {status : "fail", errormsg : "Previous Submission may still be processing"};
					fail_asResponse = JSON.stringify(fail_asResponse);
					context.response.write(fail_asResponse)
				}
			}
			
			log.debug("searchIdsToProcess", searchIdsToProcess);
//			for(var a = 0 ; a < searchIdsToProcess.length ; a++)
//			{
//				
//			}
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
		onRequest : onRequest
	}
});
