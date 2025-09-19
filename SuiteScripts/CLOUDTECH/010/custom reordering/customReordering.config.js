/**
 * @NApiVersion 2.x
 * @NModuleScope Public
 * @Author TC010ROD
 * @Email netrodsuite@gmail.com
 * @Project ANC
 * @Date Feb 20, 2020
 * @Filename customReordering.config.js
 */

define(['N/search'],

function(search)
{
	return {
		masterSetup : {
			searches: {
				getTargetItemForReordering : {
					id : "customsearch_010_getreorderingdetails",
					searchName : "[SCRIPT] 010 Get Target Items For Reordering",
					systemId : 123 //TODO the numeric internal id, currently not used anywhere though, just to make it easy for devs
					},
				getItemsReorderedRequested : {
					id : "customsearch_010getdepleteditems_ordreq",
					searchName : "[SCRIPT] 010 Get Depleted Items Ordered/Requested",
					systemId : 35303 //numeric internal id, currently not used anywhere though, just to make it easy for devs
				},
					
			},
			depletedItemBatch : {
				recordId : "customrecord_010_depleteditembatch",
				nameField : "name",
				depletedItemSublistId : "recmachcustrecord_010_dpltditem_batch",
				autopopulatedColumns : [
					"custrecord_010dpltditem_item",
					"custrecord_010dpltditem_qtysnapshot",
					"custrecord_010dpltditem_maxstock",
					"custrecord_010dpltditem_minstock",
					"custrecord_010dpltditem_prfrrdlctn",
					"custrecord_010dpltditem_status",
					"custrecord_010dpltditem_vendor",
					"custrecord_010dpltditem_lstprchprc",
					],
			},
			depletedItem : {
				recordId : "customrecord_010_depleteditem",
				expiredFieldId : "custrecord_010dpltditem_expired",
				itemFieldId : "custrecord_010dpltditem_item",
				statusFieldId : "custrecord_010dpltditem_status",
			},
			counter : 0,
			emailDefaults : {
				author : "108542", //TODO rod cloudtech this gets overriden upon usage
				recipients : ["108542", "124904", "108542", "124904", "108542", "124904", "108542", "124904", "108542", "124904", "108542", "124904", "108542", "124904"], //TODO rod cloudtech this gets overriden upon usage
				subject : "ANC : Reorder Reminder",
				body : "The following items are below their preferred stock level."
			},
			emailDefaults_successfulreorder : {
				author : "108542", //TODO rod cloudtech this gets overriden upon usage
				recipients : ["108542", "124904", "108542", "124904", "108542", "124904", "108542", "124904", "108542", "124904", "108542", "124904", "108542", "124904"], //TODO rod cloudtech this gets overriden upon usage
				subject : "ANC : Reorder Successful",
				body : "Your request for reorder has successfully created {PRLINK}"
			},
			sublistId : "custpage_depleteditems",
			sublist_include_id : "custpage_sl_include",
			depletedItemStatus : {
				below : 1,
				requested : 2,
				ordered : 3,
				received : 4,
				},
			transactions : 
			{
				columns: {
					reorderingsource : "custcol_010reorderingsource"
				}
			}
		}
		
	}
}

);
