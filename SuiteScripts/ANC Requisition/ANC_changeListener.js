/**
 * @NApiVersion 2.x
 * @NScriptType UserEventScript
 * @NModuleScope SameAccount
 */

/**
 * Script Name      : ANC_externalIdHelper.js
 * Script           : ANC External Id Helper / customscript_anc_externalidhelper
 * Deployment       : Vendor : customdeploy_anc_externalidhelper_vendor
 * Author           : RD
 * 1.0.0                - 
 *       
 * requirement      :   I need an update flag on vendor records that gets set every time something significant changes about the vendor
 *                      looking to do this(external system) is to query a list of all vendors that have this update flag set from Netsuite,
 *                      copy certain fields to a database, and reset that flag
 *                      - Mark Sullivan
 * 						09092021 - now marked MS UPDATE as checked on new records
 * 
 * dependencies : 
 * 
 */
define(['N/record', 'N/search'],
/**
 * @param {record} record
 */
function(record, search) {
   
    var oldPrimaryContact = "";
    var mapping = {
            vendor : {
                bodyFields : [
                              "companyname",
                              "isinactive",
                              "email",
                              "comments",
                              //TODO primary contact change does not fire on the Customer UE, may have got to be from contact record UE
                              "contact",
                              "defaultaddress", //body text address equivalent
                              //FIXME these address fields below are not directly body fields
                              "addrtext",
                              "city",
                              "state",
                              "zip",
                              "country",
                              "phone",
                              "fax",
                              "currency",
                              "custentity_msid"
                              ],
                "FLAG_FIELD_INTERNALID" : "custentity_ms_update"
            },
            noninventoryitem : {
                bodyFields : [
                              "itemid",
                              "purchasedescription",
                              "totalquantityonhand", //not trackable by item UE, transactional
                              "unitstype", //TODO have not tested, cannot be changed if there is already existing transactions???
                              "averagecost", //not trackable by item UE, transactional
                              "isinactive",
                              "safetystocklevel",
                              "safetystockleveldays",
                              "location", //TODO for testing
                              "vendor", //is a sublist thing, not tracked on body level
                              "mpn",
                              "manufacturer",
                              "schedulenumber", //TODO cant find this field
                              "assetaccount",
                              "supplyreplenishmentmethod", //TODO field exists cant find in ui, cant test to change value
                              "custitem_ms_hazardousmaterial", //TODO
                              "costingmethod" //TODO have not tested, cannot be changed if there is already existing transactions???
                              ],
                "FLAG_FIELD_INTERNALID" : "custitem_ms_update"
            },
            inventoryitem : {
                bodyFields : [
                              "itemid",
                              "purchasedescription",
                              "totalquantityonhand", //not trackable by item UE, transactional
                              "unitstype", //TODO have not tested, cannot be changed if there is already existing transactions???
                              "averagecost", //not trackable by item UE, transactional
                              "isinactive",
                              "safetystocklevel",
                              "safetystockleveldays",
                              "location", //TODO for testing
                              "vendor", //is a sublist thing, not tracked on body level
                              "mpn",
                              "manufacturer",
                              "schedulenumber", //TODO cant find this field
                              "assetaccount",
                              "supplyreplenishmentmethod", //TODO field exists cant find in ui, cant test to change value
                              "custitem_ms_hazardousmaterial", //TODO
                              "costingmethod" //TODO have not tested, cannot be changed if there is already existing transactions???
                              ],
                "FLAG_FIELD_INTERNALID" : "custitem_ms_update"
            },
            lotnumberedinventoryitem : {
                bodyFields : [
                              "itemid",
                              "purchasedescription",
                              "totalquantityonhand", //not trackable by item UE, transactional
                              "unitstype", //TODO have not tested, cannot be changed if there is already existing transactions???
                              "averagecost", //not trackable by item UE, transactional
                              "isinactive",
                              "safetystocklevel",
                              "safetystockleveldays",
                              "location", //TODO for testing
                              "vendor", //is a sublist thing, not tracked on body level
                              "mpn",
                              "manufacturer",
                              "schedulenumber", //TODO cant find this field
                              "assetaccount",
                              "supplyreplenishmentmethod", //TODO field exists cant find in ui, cant test to change value
                              "custitem_ms_hazardousmaterial", //TODO
                              "costingmethod" //TODO have not tested, cannot be changed if there is already existing transactions???
                              ],
                "FLAG_FIELD_INTERNALID" : "custitem_ms_update"
            },
    }
    
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
        try
        {
            
            if(scriptContext.type == "create" || scriptContext.type == "edit"
                || scriptContext.type == "copy" || scriptContext.type == "view")
            {
                if(scriptContext.newRecord.type == "vendor")
                {
                    var instrVal = "<b>NOTE: <br/> When attaching EXISTING CONTACT records as Primary Contact, <br/> please manually tick the MS UPDATE checkbox.</b>"
                    var instrField = scriptContext.form.addField({
                        type : "label",
                        id : "custpage_anc_changelistenermsg",
                        label : instrVal,
//                            container : "custom78",
//                            container : "custom78_mh_sp_3"
                    })
                        
                    scriptContext.form.insertField({
                        field : instrField,
                        nextfield : 'custentity_anc_lastprimarycontact'
                    })
                }
                
//              instrField.updateLayoutType({
//              layoutType: serverWidget.FieldLayoutType.OUTSIDEBELOW
//              });
                
//                var tabs = scriptContext.form.getTabs();
//                log.debug("tabs", tabs);
//                var tabs = [
//                            //"general",
//                            //"info",
//                            //"sales",
//                            //"support",
//                            //"subsidiary_tab",
//                            //"main",
//                            "custom78",
////                            "subsidiaries",
////                            "s_relation",
////                            "address","financial",
////                            "s_comm","marketing",
////                            "preferences",
////                            "s_sysinfo",
////                            "custom",
////                            "custom5",
////                            "custom29",
////                            "custom75",
////                            "custom28",
////                            "custom7",
////                            "custom27",
////                            "custom10",
////                            "custom9",
////                            "custom8",
////                            "custom6",
////                            "custom126",
////                            "commission",
////                            "outsourcedmfg",
////                            "s_time",
////                            "custpage_create_box_subtab"
//                            ]
////              var tabs = [
////                          "custom",
////                          "custom5",
////                          "custom29",
////                          "custom75",
////                          "custom28",
////                          "custom7",
////                          "custom27",
////                          "custom10",
////                          "custom9",
////                          "custom8",
////                          "custom6",
////                          "custom126"
////                          ]
//                var instrField = null;
//                for(var tab in tabs)
//                {
//                    log.debug("tab", tab)
//                    try
//                    {
//                        instrField = scriptContext.form.addField({
//                            type : "label",
//                            id : "custpage_anc_changelistenermsg" + tab,
//                            label : instrVal,
//                            container : tabs[0]
//                        })
//                    }
//                    catch(e)
//                    {
//                        log.error("ERROR in setting instr to tab " + tab, e)
//                    }
//                    
//                }
                //instrField.value = "<html><body>When attaching EXISTING CONTACT records, please manually tick the MS UPDATE checkbox.</body></html>"
            }
        }
        catch(e)
        {
            log.error("ERROR in function beforeLoad", e)
        }
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
        /**
         * DEPRECATED. newRecord.contact and oldRecord.contact is not reliable in beforeSubmit
         * 
         */
        try
        {
            if(scriptContext.type == "create" || scriptContext.type == "edit" || scriptContext.type == "copy")
            {
                updateFlag(scriptContext.newRecord, scriptContext.oldRecord);
            }
        }
        catch(e)
        {
            log.error("ERROR in function beforeSubmit", e);
        }
        log.debug("scriptContext", scriptContext)
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
            log.debug("scriptContext", scriptContext);
            if(scriptContext.type == "create" || scriptContext.type == "edit" || scriptContext.type == "copy")
            {
                if(scriptContext.newRecord.type == "contact")
                {
                    log.debug("UE FIRED FOR CONTACT")
                    var companyInternalId = scriptContext.newRecord.getValue({fieldId : "company"});
                    var contactrole = scriptContext.newRecord.getValue({fieldId : "contactrole"});
                    log.debug("contactrole", contactrole);
                    if(companyInternalId && (contactrole == -10 || contactrole == "-10"))
                    {
                          var entityLookup = search.lookupFields({
                              type : "entity",
                              id : companyInternalId,
                              columns : ["recordtype"]
                          })
                          var targetRecordType = entityLookup.recordtype;
                          log.debug("targetRecordType", targetRecordType);
                          var submittedEntityId = record.submitFields({
                              type : targetRecordType,
                              id : companyInternalId,
                              values : {
                                  custentity_ms_update : true,
                                  custentity_anc_lastprimarycontact : scriptContext.newRecord.id
                              }
                          })
                          log.debug("submittedEntityId due to contact submit", submittedEntityId);
//                        var companyRecObj = record.load({
//                            type : "entity",
//                            id : companyInternalId
//                        });
//                        companyRecObj
                    }
                    return;
                }
              	if(scriptContext.newRecord.type == "vendor")
                {
                    log.debug("UE FIRED FOR VENDOR")
                    var recObj = record.load({
                        type : scriptContext.newRecord.type,
                        id : scriptContext.newRecord.id
                    })
                    recObj = updateFlag(recObj, scriptContext.oldRecord, true);
                    
                    if(recObj.flaggedAsChanged)
                    {
                        var recId = recObj.save({
                            ignoreMandatoryFields : true,
                            allowSourcing : true
                        })
                        log.debug("recId", recId);
                    }
                    return;
                }
                else if(scriptContext.newRecord.type == "noninventoryitem" || scriptContext.newRecord.type == "inventoryitem"
                    || scriptContext.newRecord.type == "lotnumberedinventoryitem")
                {
                    var recObj = record.load({
                        type : scriptContext.newRecord.type,
                        id : scriptContext.newRecord.id
                    })
                    recObj = updateFlag(recObj, scriptContext.oldRecord);
                    
                    if(recObj.flaggedAsChanged)
                    {
                        var recId = recObj.save({
                            ignoreMandatoryFields : true,
                            allowSourcing : true
                        })
                        log.debug("recId", recId);
                    }
                }
                else if(scriptContext.newRecord.type == "item")
                {
                    var recObj = record.load({
                        type : scriptContext.newRecord.type,
                        id : scriptContext.newRecord.id
                    })
                    recObj = updateFlag(recObj, scriptContext.oldRecord);
                    
                    if(recObj.flaggedAsChanged)
                    {
                        var recId = recObj.save({
                            ignoreMandatoryFields : true,
                            allowSourcing : true
                        })
                        log.debug("recId", recId);
                    }
                }
            }
        }
        catch(e)
        {
            log.error("ERROR in function beforeSubmit", e);
        }
        log.debug("scriptContext", scriptContext)
    }
    
    function updateFlag(recObj, oldRecord, forced)
    {
        try
        {
            var recType = recObj.type;
          	if(forced)
			{
              	recObj.setValue({
					fieldId : mapping[recType].FLAG_FIELD_INTERNALID,
                    value : true
				});
				recObj.flaggedAsChanged = true;
                return recObj;
            }
            if(mapping[recType])
            {
                if(mapping[recType].bodyFields)
                {
                    for(var a = 0 ; a < mapping[recType].bodyFields.length ; a++)
                    {
                        var bodyFieldId = mapping[recType].bodyFields[a];
                        
                        log.debug("bodyFieldId", bodyFieldId);
                        
                        if(bodyFieldId)
                        {
                          	//check if oldRecord is fine, because we recently wanted to apply this to new record, it used to be running on edits only. 09222021
                            var oldValue = oldRecord ? oldRecord.getValue({
                                fieldId : bodyFieldId
                            }) : null;
                            var newValue = recObj.getValue({
                                fieldId : bodyFieldId
                            });
                            
                            log.debug("oldValue", oldValue)
                            log.debug("newValue", newValue)
                            
                            if(oldValue != newValue)
                            {
                                recObj.setValue({
                                    fieldId : mapping[recType].FLAG_FIELD_INTERNALID,
                                    value : true
                                });
                                recObj.flaggedAsChanged = true;
                                log.debug("SIGNIFICANT CHANGE through field : ", bodyFieldId)
                                break;
                            }
                        }
                    }
                }
            }
        }
        catch(e)
        {
            log.error("ERROR in function updateFlag", e);
        }
        return recObj
    }

    return {
        beforeLoad: beforeLoad,
        //beforeSubmit: beforeSubmit,
        afterSubmit: afterSubmit
    };
    
});
