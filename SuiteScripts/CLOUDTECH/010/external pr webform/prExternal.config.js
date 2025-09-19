/**
 * @NApiVersion 2.x
 * @NModuleScope Public
 * @Author TC010ROD
 * @Email netrodsuite@gmail.com
 * @Project ANC
 * @Date Feb 20, 2020
 * @Filename prExternal.config.js
 */

define({
	masterSetup : {
		searches: {
		},
		counter : 0,
		emailDefaults_successfulsubmission : {
			author : "108542", //TODO rod cloudtech this gets overriden upon usage
			recipients : ["108542", "124904", "108542", "124904", "108542", "124904", "108542", "124904", "108542", "124904", "108542", "124904", "108542", "124904"], //TODO rod cloudtech this gets overriden upon usage
			subject : "ANC : External Purchase Requisition Successful",
			body : "Your request for Purchase Requisition has successfully produced {PRLINK}"
		},
		directories: {
			externalPrWebform : {path : 'SuiteScripts/CLOUDTECH/010/external pr webform/'}
		},
		htmlScriptName : "010CS_ExternalPr_htmlscript.js",
		scriptParamIds: {
			payloadfile : 
				{id : 'custscript_010mr_extpr_payloadfileid'
			}		
		},
		unitstypeid : 48,
		purchaseunitid : 161,
		prpayloadfolderid : 65930
	}
	
});
