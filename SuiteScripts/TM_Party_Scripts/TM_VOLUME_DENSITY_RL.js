/**
 * ANC Item Density Update RESTlet
 * Strict validation: require grade + density on single; require both on every element when array.
 *
 * @NApiVersion 2.1
 * @NScriptType Restlet
 * @NModuleScope SameAccount
 */
define(['N/record', 'N/search', 'N/runtime', 'N/log'],
(record, search, runtime, log) => {

    const MODULE = 'ANC_RL_ITEM_DENSITY_UPDATE';

    const post = (requestBody) => {
        const originalRequest = requestBody;
        log.audit({ title: `${MODULE} request`, details: safeStringify(originalRequest) });

        let respMsg;

        try {
            // --- parse ----------------------------------------------------------------
            let payload = requestBody;
            if (typeof payload === 'string') {
                try {
                    payload = JSON.parse(payload);
                } catch (parseErr) {
                    throw buildValidationError('Invalid JSON payload.', [
                        { index: null, field: '*', issue: 'JSON_PARSE_ERROR', detail: parseErr && parseErr.message }
                    ]);
                }
            }

            // --- normalize to array ---------------------------------------------------
            let isSingle = false;
            if (!Array.isArray(payload)) {
                if (payload && typeof payload === 'object') {
                    isSingle = true;
                    payload = [payload];
                } else {
                    throw buildValidationError(
                        'Payload must be an object or an array of objects.',
                        [{ index: null, field: '*', issue: 'NOT_OBJECT_OR_ARRAY' }]
                    );
                }
            }

            // --- validate required fields BEFORE any updates -------------------------
            const validationIssues = [];
            for (let i = 0; i < payload.length; i++) {
                const row = payload[i];
                if (!row || typeof row !== 'object') {
                    validationIssues.push({ index: i, field: '*', issue: 'NOT_OBJECT', detail: 'Row is null or not an object.' });
                    continue;
                }

                const hasGrade   = Object.prototype.hasOwnProperty.call(row, 'grade');
                const hasDensity = Object.prototype.hasOwnProperty.call(row, 'density');

                if (!hasGrade || !hasDensity) {
                    validationIssues.push({
                        index: i,
                        field: !hasGrade ? (!hasDensity ? 'grade,density' : 'grade') : 'density',
                        issue: 'MISSING_FIELD',
                        detail: 'Required key(s) missing.'
                    });
                    continue;
                }

                // basic value checks
                const grade = (row.grade ?? '').toString().trim();
                const densityNum = Number(row.density);

                if (!grade) {
                    validationIssues.push({ index: i, field: 'grade', issue: 'EMPTY', detail: 'Grade is blank.' });
                }
                if (isNaN(densityNum)) {
                    validationIssues.push({ index: i, field: 'density', issue: 'NOT_NUMERIC', detail: 'Density is not numeric.' });
                }
            }

            // If *any* validation issue: fail everything (per your requirement)
            if (validationIssues.length) {
                throw buildValidationError(
                    isSingle
                        ? 'Single payload missing required grade/density data.'
                        : 'One or more array elements missing required grade/density data.',
                    validationIssues
                );
            }
            // --------------------------------------------------------------------------

            // --- process (all rows are structurally valid) ----------------------------
            let details = [];
            let processed = 0, updated = 0, notFound = 0, errors = 0;

            for (let i = 0; i < payload.length; i++) {
                processed++;
                const row = payload[i];
                const grade = row.grade.toString().trim();
                const density = Number(row.density);

                try {
                    const item = findItemByItemId(grade);
                    if (!item) {
                        notFound++;
                        details.push({
                            index: i,
                            grade,
                            density,
                            status: 'not_found'
                        });
                        continue;
                    }

                    record.submitFields({
                        type: item.type,
                        id: item.id,
                        values: { custitem_average_volume_density: density },
                        options: { enableSourcing: false, ignoreMandatoryFields: true }
                    });

                    updated++;
                    details.push({
                        index: i,
                        grade,
                        density,
                        itemId: item.id,
                        recordType: item.type,
                        status: 'updated'
                    });
                } catch (rowErr) {
                    errors++;
                    log.error({ title: `Error updating ${grade}`, details: rowErr });
                    details.push({
                        index: i,
                        grade,
                        density,
                        status: 'error',
                        error: serializeError(rowErr)
                    });
                }
            }

            // success logic: all updated & no errors & no notFound
            let overallStatus;
            if (updated === processed && errors === 0 && notFound === 0) {
                overallStatus = 'success';
            } else if (updated > 0) {
                overallStatus = 'partial_success';
            } else {
                overallStatus = 'failure';
            }

            respMsg = {
                success: (overallStatus === 'success'),
                overallStatus,
                message: `Hello, you connected to ANC NETSUITE ${runtime.accountId} : ${runtime.envType} : ITEM DENSITY UPDATE`,
                api_message: `Processed ${processed} rows: ${updated} updated, ${notFound} not found, ${errors} errors.`,
                requestBody: originalRequest,
                summary: { processed, updated, notFound, errors },
                details,
                integrationLogId: null
            };

        } catch (e) {
            // Validation or processing thrown before summary loop → handled here
            const serialized = serializeError(e);
            const validationErrors = e && e.name === 'PAYLOAD_VALIDATION_ERROR'
                ? (e.issues || [])
                : (serialized && serialized.issues) || [];

            respMsg = {
                success: false,
                overallStatus: 'failure',
                message: "ERROR caught: " + safeStringify(serialized),
                requestBody: originalRequest,
                summary: { processed: 0, updated: 0, notFound: 0, errors: 0 },
                details: validationErrors,   // surfaced for client debugging
                integrationLogId: null
            };
            log.error({ title: `${MODULE} POST error`, details: serialized });
        }

        const respMsgStr = JSON.stringify(respMsg);
        log.audit({ title: `${MODULE} response`, details: respMsgStr });
        return respMsgStr;
    };

    // ----------------------------------------------------------------------
    // Helpers
    // ----------------------------------------------------------------------
    function buildValidationError(message, issues) {
        return { name: 'PAYLOAD_VALIDATION_ERROR', message, issues: issues || [] };
    }

    function findItemByItemId(itemidText) {
        const s = search.create({
            type: search.Type.ITEM,
            filters: [['itemid', 'is', itemidText]],
            columns: ['internalid']
        });
        const r = s.run().getRange({ start: 0, end: 1 });
        if (r && r.length) {
            return { id: r[0].id, type: r[0].recordType };
        }
        return null;
    }

    function safeStringify(obj) {
        try { return JSON.stringify(obj); } catch (_e) { return String(obj); }
    }

    function serializeError(e) {
        if (!e) return e;
        if (e instanceof Error) {
            return { name: e.name, message: e.message, stack: e.stack };
        }
        // if we threw our own validation object, include issues
        return {
            name: e.name || e.type || 'ERROR',
            message: e.message || e.toString(),
            details: e.details || e.id || null,
            issues: e.issues || []
        };
    }

    return { post };
});
