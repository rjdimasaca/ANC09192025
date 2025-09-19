/**
 * @NApiVersion 2.1
 * @NScriptType Suitelet
 */
define(['/SuiteScripts/ANC_lib.js', 'N/record', 'N/runtime', 'N/log', 'N/redirect'],
    (ANC_lib, record, runtime, log, redirect) => {

        const TEMPORARY_SHIPMENT_ITEM = 188748;

        const onRequest = (context) => {
            const { request, response } = context;
            try {

                const syncJobId =
                    (request.parameters && request.parameters.custscript_anc_mr_fitment_syncjobid) ||
                    runtime.getCurrentScript().getParameter({ name: 'custscript_anc_mr_fitment_syncjobid' });

                log.debug("syncJobId", syncJobId);
                if (!syncJobId) {
                    response.setHeader({ name: 'Content-Type', value: 'application/json' });
                    response.write({ output: JSON.stringify({ ok: false, message: "Missing syncJobId" }) });
                    return;
                }

                const groups = ANC_lib.buildShipmentGroups(syncJobId);
                var results = [];

                for (let g of groups) {
                    const r = ANC_lib.processGroup(g, true);
                    results = results.concat(r)
                }

                log.debug("onRequest results", results);

                var rawResp = ANC_lib.PTMX.generateShipments(JSON.stringify(results));
                log.debug("onRequest rawResp", rawResp)

                redirect.toRecord({
                    type : "customrecord_anc_syncjob",
                    id : syncJobId
                })

                // response.setHeader({ name: 'Content-Type', value: 'application/json' });
                // response.write({ output: JSON.stringify({ ok: true, syncJobId, outputs: results }) });

            } catch (e) {
                log.error('Suitelet error', e);
                response.setHeader({ name: 'Content-Type', value: 'application/json' });
                response.write({ output: JSON.stringify({ ok: false, error: e.message, stack: e.stack }) });
            }
        };

        return { onRequest };
    });
