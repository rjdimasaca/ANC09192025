/**
 * @NApiVersion 2.1
 * @NScriptType MapReduceScript
 */
define(['/SuiteScripts/ANC_lib.js', 'N/query', 'N/record', 'N/search', 'N/runtime'],
    (ANC_lib, query, record, search, runtime) => {

        const TEMPORARY_SHIPMENT_ITEM = 188748;
        const getInputData = () => {
            log.debug("getInput Start");

            var custscript_anc_mr_fitment_syncjobid = runtime.getCurrentScript().getParameter({
                name : "custscript_anc_mr_fitment_syncjobid"
            });

            log.debug("runtime param custscript_anc_mr_fitment_syncjobid", custscript_anc_mr_fitment_syncjobid);



            var syncJobRec = record.load({
                type : "customrecord_anc_syncjob",
                id : custscript_anc_mr_fitment_syncjobid
            });
            var syncJobDetailLineCount = syncJobRec.getLineCount({
                sublistId : "recmachcustrecord_anc_syncjobdet_syncjob"
            });


            var syncDetailRecsObj = {};
            var syncDetailRecsList = [];
            for(var a = 0 ; a < syncJobDetailLineCount ; a++)
            {
                var syncDetailRecInternalid = syncJobRec.getSublistValue({
                    sublistId : "recmachcustrecord_anc_syncjobdet_syncjob",
                    fieldId : "id",
                    line : a
                });
                var groupName = syncJobRec.getSublistValue({
                    sublistId : "recmachcustrecord_anc_syncjobdet_syncjob",
                    fieldId : "name",
                    line : a
                });
                var groupData = syncJobRec.getSublistValue({
                    sublistId : "recmachcustrecord_anc_syncjobdet_syncjob",
                    fieldId : "custrecord_anc_syncjobdet_request",
                    line : a
                });
                groupData = JSON.parse(groupData);
                groupData.list = groupData.list.map(function(elem){
                    elem.syncDetailRecInternalid = syncDetailRecInternalid;
                    elem.syncDetailParentRecInternalid = syncJobRec.id;
                    elem.correlationId = syncDetailRecInternalid;
                    // elem.correlationId = createGuidFromInteger(syncDetailRecInternalid);
                    return elem;
                })
                syncDetailRecsList.push({
                    syncDetailRecInternalid, groupName, groupData:groupData
                })
            }
            log.debug("syncDetailRecsList", syncDetailRecsList);
            return syncDetailRecsList;

            // syncDetailRecsObj = ANC_lib.groupBy(syncDetailRecsList, "syncDetailRecInternalid");
            // log.debug("syncDetailRecsObj", syncDetailRecsObj);
            //
            // // return syncDetailRecsList;
            // return syncDetailRecsObj;

        };

        var mapContext = null;
        const map = (context) => {
            try {
                mapContext = context;
                const shipmentGroup = JSON.parse(context.value);
                log.debug("shipmentGroup", shipmentGroup)
                const shipmentLineIdTracker = {};
                log.debug("shipmentLineIdTracker", shipmentLineIdTracker)

                const groupList = shipmentGroup.groupData.list || [];
                const groupByLineKey = ANC_lib.groupBy(groupList, 'line_uniquekey');
                log.debug("groupByLineKey", groupByLineKey)

                const fitmentResponse = ANC_lib.getFitmentResponse(groupList, shipmentLineIdTracker);

                log.debug("fitmentResponse", fitmentResponse)
                ////TODO to be moved to restlet
                // const fitmentResponseList = fitmentResponse.list || [];
                // log.debug("fitmentResponseList", fitmentResponseList);
                //
                // processFitmentResponse(fitmentResponseList, groupByLineKey, shipmentLineIdTracker);

            } catch (e) {
                log.error('ERROR in function map', e);
            }
        };

        function processFitmentResponse(fitmentResponseList, groupByLineKey, shipmentLineIdTracker)
        {

            const equipmentList = ANC_lib.getEquipmentList();

            for(var a = 0 ; a < fitmentResponseList.length ; a++)
            {
                var fitmentResponse_entry = fitmentResponseList[a];
                var responseBody = JSON.parse(fitmentResponse_entry.body);
                log.debug("responseBody", responseBody);
                var shipments = responseBody.shipments;
                log.debug("shipments", shipments);

                for (const shipment of shipments) {

                    log.debug("shipment", shipment);

                    const rec = record.create({ type: 'customsale_anc_shipment', isDynamic: true });

                    rec.setValue({
                        fieldId :  "entity",
                        value : 549160
                    })

                    rec.setValue({ fieldId: 'memo', value: '✅✅✅' });

                    let entity, location, consignee, deliveryDate, shipDate, equipment, soInternalid, skuWeight, toInternalId;
                    let totalWeight = 0;

                    for (const item of shipment.shipmentItems) {
                        const lineKey = item.itemId;
                        const qty = item.nb;
                        const line = (groupByLineKey[lineKey] || [])[0];
                        if (!line || !qty) continue;

                        if (!entity) {
                            // entity = line.entity;
                            location = line.line_location;
                            consignee = line.line_consignee;
                            deliveryDate = line.line_deliverydate;
                            shipDate = line.line_shipdate;
                            equipment = line.line_equipment;
                            soInternalid = line.custcol_anc_relatedtransaction || line.internalid;
                            toInternalId = line.internalid || line.custcol_anc_relatedtransaction;
                            skuWeight = line.custitem_weight_of_sku || line.line_item_basis_weight;
                        }

                        if (entity) rec.setValue({ fieldId: 'entity', value: entity });
                        if (location) rec.setValue({ fieldId: 'location', value: location });
                        if (consignee) rec.setValue({ fieldId: 'custbody_consignee', value: consignee });
                        if (deliveryDate) rec.setText({ fieldId: 'custbody_anc_deliverydate', text: deliveryDate });
                        if (shipDate) rec.setText({ fieldId: 'custbody_anc_shipdate', text: shipDate });
                        if (equipment) rec.setValue({ fieldId: 'custbody_anc_equipment', value: equipment });

                        //TODO there is soon going to be functional weight column in the orderline
                        //TODO so you may need to adjust qty*weight code
                        const lineWeight = qty * (skuWeight || 1);
                        totalWeight += lineWeight;

                        rec.selectNewLine({ sublistId: 'item' });
                        log.debug("ANC_lib.FREIGHTINVOICE.TEMPORARY_ITEM", ANC_lib.FREIGHTINVOICE.TEMPORARY_ITEM)
                        rec.setCurrentSublistValue({ sublistId: 'item', fieldId: 'item', value: ANC_lib.FREIGHTINVOICE.TEMPORARY_ITEM });
                        rec.setCurrentSublistValue({ sublistId: 'item', fieldId: 'quantity', value: qty });
                        rec.setCurrentSublistValue({ sublistId: 'item', fieldId: 'rate', value: 0 });
                        rec.setCurrentSublistValue({ sublistId: 'item', fieldId: 'custodial_anc_actualitemtobeshipped', value: line.line_item || line.line_tempitem });
                        rec.setCurrentSublistValue({ sublistId: 'item', fieldId: 'custcol_consignee', value: consignee });
                        //TODO to confirm if we tie it both 2 transfer orders and sales orders
                        rec.setCurrentSublistValue({ sublistId: 'item', fieldId: 'custcol_anc_relatedtransaction', value: soInternalid });
                        rec.setCurrentSublistValue({ sublistId: 'item', fieldId: 'custcol_anc_relatedtransaction_to', value: toInternalId });
                        rec.setCurrentSublistValue({ sublistId: 'item', fieldId: 'custcol_anc_relatedlineuniquekey', value: line.line_uniquekey }); //TODO fix this, this should be the SO lineuniquekey
                        rec.setCurrentSublistValue({ sublistId: 'item', fieldId: 'custcol_anc_relatedlineuniquekey_to', value: line.lineUniqueKey_to }); //TODO fix this, this should be the SO lineuniquekey
                        rec.setCurrentSublistValue({ sublistId: 'item', fieldId: 'custcol_anc_shipment_linetotalweight', value: skuWeight });
                        rec.setCurrentSublistValue({ sublistId: 'item', fieldId: 'custcol_anc_equipment', value: line.line_equipment });
                        rec.commitLine({ sublistId: 'item' });
                    }

                    const utilization = ANC_lib.computeLoadUtilization(equipmentList, { line_equipment: equipment }, totalWeight);
                    const computeLoadUtilizationStatus_result = ANC_lib.computeLoadUtilizationStatus(utilization);

                    if(computeLoadUtilizationStatus_result.shipmentUtilStatus)
                    {
                        rec.setValue({ fieldId: 'custbody_anc_shipstatus', value: computeLoadUtilizationStatus_result.shipmentUtilStatus });
                    }

                    rec.setValue({ fieldId: 'custbody_anc_loadingefficiency', value: utilization.shipmentUtilRate });

                    const id = rec.save({ ignoreMandatoryFields: true });
                    log.audit('Rebuilt shipment', id);

                    mapContext.write({
                        key : id,
                        value : computeLoadUtilizationStatus_result.shipmentUtilStatus
                    })
                }
            }
        }

        const reduce = (context) => {
            log.debug("reduce context", context);
            if(context.key)
            {
                updateSoLineFitmentIcon(context.key);
            }
        };

        function updateSoLineFitmentIcon(obj)
        {
            try
            {
                log.debug("updateSoLineFitmentIcon", obj)
                if(obj.key)
                {

                }
            }
            catch(e)
            {

            }
        }

        const summarize = (summary) => {
            log.audit('Map/Reduce Summary', {
                usage: summary.usage,
                yields: summary.yields,
                concurrency: summary.concurrency
            });

            summary.output.iterator().each((key, value) => {
                log.audit(`Output Key: ${key}`, value);
                return true;
            });
        };

        return { getInputData, map, reduce, /*summarize*/ };
    });
