/**
 * @NApiVersion 2.1
 * @NScriptType MapReduceScript
 */
define(['/SuiteScripts/ANC_lib.js', 'N/query', 'N/record', 'N/search', 'N/runtime'],
    (ANC_lib, query, record, search, runtime) => {

        const TEMPORARY_SHIPMENT_ITEM = 188748;

        const getInputData = () => {
            log.debug("getInput Start");
            var rawInput_shipments = runtime.getCurrentScript().getParameter({
                name: 'custscript_anc_mr_fitment_shipmentids'
            });
            log.debug("rawInput_shipments", rawInput_shipments);
            var shipmentLineKeys = null;
            if(rawInput_shipments)
            {
                shipmentLineKeys = JSON.parse(rawInput_shipments || '{}');
            }




            const rawInput_so = runtime.getCurrentScript().getParameter({
                name: 'custscript_anc_mr_fitment_soids'
            });
            log.debug("rawInput_so", rawInput_so);
            var soKeys = null;
            if(rawInput_so)
            {
                soKeys = JSON.parse(rawInput_so || '{}');
            }

            const rawInput_soline = runtime.getCurrentScript().getParameter({
                name: 'custscript_anc_mr_fitment_solineids'
            });
            log.debug("rawInput_soline", rawInput_soline);
            var soLineKeys = null;
            if(rawInput_soline)
            {
                soLineKeys = JSON.parse(rawInput_soline || '{}');
            }

            log.debug("rawInputs", {soKeys, soLineKeys, shipmentLineKeys});
            const shipmentsAndOrders = ANC_lib.getShipmentsAndOrders(shipmentLineKeys);
            var shipmentLineUniqueKeys = shipmentsAndOrders && shipmentsAndOrders.lineuniquekeys ? shipmentsAndOrders.lineuniquekeys : null;

            log.debug("shipmentLineUniqueKeys", shipmentLineUniqueKeys);

            // const grouped = ANC_lib.groupOrderLinesForShipmentGeneration(null, shipmentsAndOrders.lineuniquekeys, );
            const grouped = ANC_lib.groupOrderLinesForShipmentGeneration(soKeys, soLineKeys, shipmentLineUniqueKeys);

            log.debug("grouped", grouped);

            return Object.values(grouped);
        };

        const map = (context) => {
            try {
                const shipmentGroup = JSON.parse(context.value);
                log.debug("shipmentGroup", shipmentGroup)
                const shipmentLineIdTracker = {};
                log.debug("shipmentLineIdTracker", shipmentLineIdTracker)
                const equipmentList = ANC_lib.getEquipmentList();

                const groupList = shipmentGroup.list || [];
                const groupByLineKey = ANC_lib.groupBy(groupList, 'line_uniquekey');
                log.debug("groupByLineKey", groupByLineKey)

                const fitmentResponse = ANC_lib.getFitmentResponse(groupList, shipmentLineIdTracker);

                log.debug("fitmentResponse", fitmentResponse)

                for(var a = 0 ; a < shipmentGroup.list.length ; a++)
                {
                    context.write({
                        key : shipmentGroup.list[a].internalid,
                        value : shipmentGroup.list[a].internalid/*shipmentGroup.list[a]*/
                    })
                }




                ////TODO to be moved to restlet
                // const shipments = fitmentResponse.list || [];
                // log.debug("shipments", shipments)
                //
                // for (const fitment of shipments) {
                //     const responseBody = fitment.body ? JSON.parse(fitment.body) : { shipments: [] };
                //
                //     for (const shipment of responseBody.shipments) {
                //         const rec = record.create({ type: 'customsale_anc_shipment', isDynamic: true });
                //
                //         rec.setValue({
                //             fieldId :  "entity",
                //             value : 549160
                //         })
                //
                //         rec.setValue({ fieldId: 'memo', value: '✅✅✅' });
                //
                //         let entity, location, consignee, deliveryDate, shipDate, equipment, soInternalid, custbody_anc_shipment_leg, custbody_anc_originlocation, custbody_anc_lane, skuWeight;
                //         let totalWeight = 0;
                //
                //
                //
                //
                //
                //
                //
                //         for (const item of shipment.shipmentItems) {
                //             const lineKey = item.itemId;
                //             const qty = item.nb;
                //             const line = (groupByLineKey[lineKey] || [])[0];
                //             if (!line || !qty) continue;
                //
                //             if (!entity) {
                //                 // entity = line.entity;
                //                 location = line.line_location;
                //                 consignee = line.line_consignee;
                //                 custbody_anc_shipment_leg = line.custbody_anc_shipment_leg;
                //                 custbody_anc_originlocation = line.custbody_anc_originlocation;
                //                 custbody_anc_lane = line.custbody_anc_lane;
                //                 deliveryDate = line.line_deliverydate;
                //                 shipDate = line.line_shipdate;
                //                 equipment = line.line_equipment;
                //                 soInternalid = line.custcol_anc_relatedtransaction;
                //                 skuWeight = line.custitem_weight_of_sku || line.line_item_basis_weight;
                //             }
                //
                //             if (entity) rec.setValue({ fieldId: 'entity', value: entity });
                //             if (location) rec.setValue({ fieldId: 'location', value: location });
                //             if (consignee) rec.setValue({ fieldId: 'custbody_consignee', value: consignee });
                //             if (custbody_anc_lane) rec.setValue({ fieldId: 'custbody_anc_lane', value: custbody_anc_lane });
                //             if (custbody_anc_shipment_leg) rec.setValue({ fieldId: 'custbody_anc_shipment_leg', value: custbody_anc_shipment_leg });
                //             if (custbody_anc_originlocation) rec.setValue({ fieldId: 'custbody_anc_originlocation', value: custbody_anc_originlocation });
                //             if (deliveryDate) rec.setText({ fieldId: 'custbody_anc_deliverydate', text: deliveryDate });
                //             if (shipDate) rec.setText({ fieldId: 'custbody_anc_shipdate', text: shipDate });
                //             if (equipment) rec.setValue({ fieldId: 'custbody_anc_equipment', value: equipment });
                //
                //             // var lineWeight = qty * (shipmentLineIdTracker[lineKey]?.weight || 1);
                //
                //             //TODO there is soon going to be functional weight column in the orderline
                //             //TODO so you may need to adjust qty*weight code
                //             const lineWeight = qty * (skuWeight || 1);
                //
                //             totalWeight += lineWeight;
                //
                //             rec.selectNewLine({ sublistId: 'item' });
                //             rec.setCurrentSublistValue({ sublistId: 'item', fieldId: 'item', value: TEMPORARY_SHIPMENT_ITEM });
                //             rec.setCurrentSublistValue({ sublistId: 'item', fieldId: 'quantity', value: qty });
                //             rec.setCurrentSublistValue({ sublistId: 'item', fieldId: 'rate', value: 0 });
                //             rec.setCurrentSublistValue({ sublistId: 'item', fieldId: 'custcol_anc_actualitemtobeshipped', value: line.line_item });
                //             rec.setCurrentSublistValue({ sublistId: 'item', fieldId: 'custcol_consignee', value: consignee });
                //             rec.setCurrentSublistValue({ sublistId: 'item', fieldId: 'custcol_anc_relatedtransaction', value: line.custcol_anc_relatedtransaction });
                //             rec.setCurrentSublistValue({ sublistId: 'item', fieldId: 'custcol_anc_relatedlineuniquekey', value: line.line_uniquekey }); //TODO fix this, this should be the SO lineuniquekey
                //             rec.setCurrentSublistValue({ sublistId: 'item', fieldId: 'custcol_anc_shipment_linetotalweight', value: line.line_item_basis_weight });
                //             rec.setCurrentSublistValue({ sublistId: 'item', fieldId: 'custcol_anc_equipment', value: line.line_equipment });
                //             rec.commitLine({ sublistId: 'item' });
                //         }
                //
                //         const utilization = ANC_lib.computeLoadUtilization(equipmentList, { line_equipment: equipment }, totalWeight);
                //
                //
                //         rec.setValue({ fieldId: 'custbody_anc_loadingefficiency', value: utilization.shipmentUtilRate });
                //
                //         const id = rec.save({ ignoreMandatoryFields: true });
                //         log.audit('Rebuilt shipment', id);
                //     }
                // }
            } catch (e) {
                log.error('ERROR in function map', e);
            }
        };

        const reduce = (context) => {
            try
            {
                var key = context.key;
                var values = context.values;
                var value = context.value;

                log.debug(`reduce {key, values, value}`, {key, values, value});

                var deletedRecordId = record.delete({
                    type : ANC_lib.references.RECTYPES.shipment.sub_id || ANC_lib.references.RECTYPES.shipment.id,
                    id : key
                });

                // var deletedRecordId = record.submitFields({
                //     type : ANC_lib.references.RECTYPES.shipment.sub_id || ANC_lib.references.RECTYPES.shipment.id,
                //     id : key,
                //     values : {
                //         // custbody_anc_usecrossdock : "T",
                //         custbody_anc_tobedeletedduetodecons : "T"
                //     }
                // })

                log.debug("deletedRecordId", deletedRecordId)
            }
            catch(e)
            {
                log.error("ERROR in function reduce", e)
            }
        };
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

        return { getInputData, map, reduce, summarize };
    });
