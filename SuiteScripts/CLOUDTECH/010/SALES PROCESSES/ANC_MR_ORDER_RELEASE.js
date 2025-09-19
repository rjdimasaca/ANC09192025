/**
 * @NApiVersion 2.1
 * @NScriptType MapReduceScript
 */
define([
    '/SuiteScripts/ANC_lib.js',
    'N/task',
    'N/file',
    'N/format',
    'N/https',
    'N/email',
    'N/query',
    'N/record',
    'N/runtime',
    'N/search',
    'N/url'
], (ANC_lib, task, file, format, https, email, query, record, runtime, search, url) => {

    const getInputData = () => {
        try {
            var force_single_id = runtime.getCurrentScript().getParameter({
                name : "custscript_anc_mr_orderrelease_forceid"
            })
            log.debug("force_single_id", force_single_id);

            //TODO COMMENT OUT THIS CODE LATER
            // if(!force_single_id)
            // {
            //     force_single_id = 61306880 || 61306676 || 61276625;
            // }

            var internalIdList = ANC_lib.querySoPastLdc({
                // traninternalids: [61307893],
                sqlOperator: 'IN',
                filterbyfield: 'TRANSACTION.ID',
                dayspassedoper: '=',
                dayspassed: 0
            });

            log.debug("internalIdList", internalIdList)
            log.debug("internalIdList.length", internalIdList.length)

            var processedSoInternalid = [];
            for(var a = 0 ; a < internalIdList.length ; a++)
            {
                var force_single_id = internalIdList[a].traninternalid;

                if(!processedSoInternalid.includes(force_single_id))
                {
                    processedSoInternalid.push(force_single_id);
                    if(force_single_id)
                    {
                        var submitFieldValues = {};

                        submitFieldValues[ANC_Lib.references.SO_FIELDS.RELEASED.id] = ANC_Lib.references.SO_FIELDS.ORDERSTATUS.options.RELEASED.val
                        submitFieldValues[ANC_Lib.references.SO_FIELDS.ORDERSTATUS.id] = ANC_Lib.references.SO_FIELDS.ORDERSTATUS.options.RELEASED.val
                        var soMarkedAsReleased = record.submitFields({
                            type : "salesorder",
                            id : force_single_id,
                            values : submitFieldValues
                        })
                        log.debug("ANC_MR_ORDER_RELEASE.js soMarkedAsPreReleased force_single_id", soMarkedAsReleased);
                    }
                }
            }

            return internalIdList;

        } catch (e) {
            log.error('Error in getInputData', e);
        }
    };

    const map = (mapContext) => {
        const value = typeof mapContext.value === 'string' ? JSON.parse(mapContext.value) : mapContext.value;
        mapContext.write({ key: value.traninternalid, value });
    };

    const reduce = (reduceContext) => {
        try {
            var transferOrderIdList = [];

            log.debug("reduceContext", reduceContext);

            const values = reduceContext.values.map(val => typeof val === 'string' ? JSON.parse(val) : val);
            const groupedByInternalId = ANC_lib.groupBy(values, 'traninternalid');
            log.debug("groupedByInternalId", groupedByInternalId);

            for (const soId in groupedByInternalId) {
                log.debug("groupedByInternalId soId", soId);

                const leg2Lines = ANC_lib.findLeg2Shipments(groupedByInternalId[soId]);
                log.debug("leg2Lines", leg2Lines);

                if(!leg2Lines || leg2Lines.length == 0)
                {
                    return false;
                }

                const groupedTOs = ANC_lib.groupTransferOrderLinesByOriginAndCrossdock(leg2Lines);

                log.debug("groupedTOs", groupedTOs);

                for (const group of groupedTOs) {
                    const { transferOrderId, itemIndexMap } = ANC_lib.createTransferOrder({
                        sourceLocation: group.originWarehouse,
                        destinationLocation: group.crossdock,
                        items: group.items
                    });


                    //call function to create Leg1 shipments out of transfer order
                    var resp = https.requestSuitelet({
                        scriptId : "customscript_anc_sl_fitmentchecking",
                        deploymentId : "customdeploy_anc_sl_fitmentchecking",
                        urlParams : {
                            "traninternalid" : transferOrderId,
                            "rectype" : "transferorder",
                            "leg" : 1
                        }
                    })

                    transferOrderIdList.push(transferOrderId);

                    log.debug("resp", resp);


                    //create shipments via transferOrderId //TODO remove further code
                    continue;


                }
            }

            // //TODo do not release for now, i think bashar may have same kind of code
            // const syncPayload = ANC_lib.prepareOrderPayload(groupedByInternalId);
            // const syncResult = ANC_lib.syncLinesPastLdc(syncPayload);
            //
            // log.debug('syncLinesPastLdc OrderHeader', syncPayload.OrderHeader);
            // log.debug('syncLinesPastLdc Result', syncResult);
        } catch (e) {
            log.error('Error in reduce', e);
        }
    };

    const summarize = (summaryContext) => {
        // Optional: log summary stats
    };

    return { getInputData, map, reduce, summarize };
});
