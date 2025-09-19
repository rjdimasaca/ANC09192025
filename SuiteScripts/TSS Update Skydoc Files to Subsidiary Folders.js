/**
 * @NApiVersion 2.x
 * @NScriptType MapReduceScript
 * @NModuleScope SameAccount
 */
define(['N/record','N/search','N/runtime'],

		function(record,search,runtime) {

	/**
	 * Marks the beginning of the Map/Reduce process and generates input data.
	 *
	 * @typedef {Object} ObjectRef
	 * @property {number} id - Internal ID of the record instance
	 * @property {string} type - Record type id
	 *
	 * @return {Array|Object|Search|RecordRef} inputSummary
	 * @since 2015.1
	 */
	function getInputData() {
		try{
			
			var customrecord_tss_aws_s3_ns_file_recordSearchObj = search.create({
				type: "customrecord_tss_aws_s3_ns_file_record",
				filters:
				[
				   ["custrecord_tss_file_id_in_trnasac","isnotempty",""], 
				   "AND", 
				   ["custrecord_tss_aws_s3_ns_folder","anyof","53"], 
				   "AND", 
				   ["custrecord_tss_transaction_list_record.mainline","is","T"],
				   "AND",
				   ["internalid","anyof","46056"]
				],
				columns:
				[
				   search.createColumn({
					  name: "internalid",
					  label: "Internal ID"
				   }),
				   search.createColumn({
					  name: "custrecord_tss_aws_s3_ns_folder",
					  label: "Folder"
				   }),
				   search.createColumn({
					  name: "custrecord_tss_aws_s3_ns_rectype",
					  label: "Record Type"
				   }),
				   search.createColumn({
					name: "custrecord_tss_aws_s3_ns_recid",
					label: "Record Type"
				   }),
				   search.createColumn({
					  name: "subsidiary",
					  join: "CUSTRECORD_TSS_TRANSACTION_LIST_RECORD",
					  label: "Subsidiary"
				   })
				]
			 });
			
			 var searchResultCount = customrecord_tss_aws_s3_ns_file_recordSearchObj.runPaged().count;

			 log.debug("searchResultCount",searchResultCount);
			 return customrecord_tss_aws_s3_ns_file_recordSearchObj;
		  

		}catch(errorInIputData){
			log.error("Error in getInputData",errorInIputData);
		}
	}
	
	function map(context) {
		try{

			var scriptObj 					=	runtime.getCurrentScript();
			log.debug("map context",context);
			var rawJson 	     			= 	JSON.parse(context.value);
			log.debug("rawJson",rawJson);
			var awsRecId 	     			= 	rawJson.id;
			log.debug("awsRecId",awsRecId);
			var awsCurrRecFold 	     		= 	rawJson.values.custrecord_tss_aws_s3_ns_folder.value;
			log.debug("awsCurrRecFold",awsCurrRecFold);
			var recSubsidiary 	     			= 	rawJson.values["subsidiary.CUSTRECORD_TSS_TRANSACTION_LIST_RECORD"].value;
			log.debug("recSubsidiary",recSubsidiary);
			var nsRecordType 	     		= 	rawJson.values.custrecord_tss_aws_s3_ns_rectype;
			log.debug("nsRecordType",nsRecordType);
			var nsRecordId 	     		= 	rawJson.values.custrecord_tss_aws_s3_ns_recid;
			log.debug("nsRecordId",nsRecordId);
			
			
			var subSkyDocFoldId = getSubSkydocFold(nsRecordId,nsRecordType,recSubsidiary);
			log.debug("subSkyDocFoldId",subSkyDocFoldId);
			return;

			if(subSkyDocFoldId){
				var recId = record.submitFields({type:'customrecord_tss_aws_s3_ns_file_record',id:Number(awsRecId),values: {custrecord_tss_aws_s3_ns_folder:skydocFolderIntId}});
			}else{
				log.error("subfolder not found for:recSubsidiary "+recSubsidiary,"nsRecordType: "+nsRecordType);
			}
			
			
		}catch(errorInMap){
			log.error("Error in map",errorInMap);
		}
	}

	function reduce(context) {
		try{

		}catch(errorInReduce){
			log.error("Error in Reduce ",errorInReduce);
		}
	}
 
	/**
	 * Executes when the summarize entry point is triggered and applies to the result set.
	 *
	 * @param {Summary} summary - Holds statistics regarding the execution of a map/reduce script
	 * @since 2015.1
	 */
	function summarize(summary) {

	}


	function getSubSkydocFold(recordId,recordType,recSubsidiary){
		var subSkyDocFold ='';
		/*var fieldLookUp = search.lookupFields({
			type: recordType,
			id: Number(recordId),
			columns: [ 'subsidiary']
		});
		log.debug("fieldLookUp",fieldLookUp);*/
		try{
		//var subVal = fieldLookUp.subsidiary[0].value;
		var subVal =recSubsidiary;
			if(subVal){
				
				var customrecord_tss_aws_to_ns_folderSearchObj = search.create({
					type: "customrecord_tss_aws_to_ns_folder",
					filters:
					[
						["formulatext: CASE WHEN REPLACE(LOWER({custrecord_default_folder_for_record}), ' ', '') = '"+recordType+"' THEN 1 ELSE 0 END","is","1"], 
						"AND", 
						["custrecord_tss_updating_fol_on_sub","anyof",subVal]
					],
					columns:
					[
					search.createColumn({name: "name", label: "Name"}),
					search.createColumn({name: "internalid", label: "Internal ID"})
					]
				});
				var res = customrecord_tss_aws_to_ns_folderSearchObj.run().getRange(0,1);
				log.error("res",res);
				if(res.length>0){
					subSkyDocFold = res[0].getValue('internalid');
				}else{
					var customrecord_tss_aws_to_ns_folderSearchObj = search.create({
						type: "customrecord_tss_aws_to_ns_folder",
						filters:
						[
							["custrecord_default_folder_for_record","isempty",""], 
							"AND", 
							["custrecord_tss_updating_fol_on_sub","anyof",subVal]
						],
						columns:
						[
						search.createColumn({name: "name", label: "Name"}),
						search.createColumn({name: "internalid", label: "Internal ID"})
						]
					});
					var res = customrecord_tss_aws_to_ns_folderSearchObj.run().getRange(0,1);
					if(res.length>0){
						subSkyDocFold = res[0].getValue('internalid');
					}
				}
			}
		}catch(subFoldErr){
			log.error("subFoldErr",subFoldErr);
		}
		log.debug("subSkyDocFold",subSkyDocFold);
		return subSkyDocFold;	 
	}
	
	function getDeploymentId(deploymentid){
		try{
			var deploymentId = '';
			var deploymentSearch = search.create({
				type: search.Type.SCRIPT_DEPLOYMENT,
				filters: [{name: 'scriptid',operator: 'is',values: deploymentid}],
				columns: [{name: 'internalid'}]
			});
			var deploymentResult = deploymentSearch.run().getRange({start: 0,end:1});
			deploymentId = deploymentResult[0].getValue('internalid')
		}catch(Error){
			log.error('Error in getting the Scheduled Script Deployment Id',Error);
			deploymentId = '';
		}
		return deploymentId;
	}

	return {
		getInputData: getInputData,
		map:map,
		reduce: reduce,
		summarize: summarize
	};

});