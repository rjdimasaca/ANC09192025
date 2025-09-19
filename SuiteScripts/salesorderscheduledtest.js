

/**
 * @NApiVersion 2.1
 * @NScriptType ScheduledScript
 */
define(['N/log', 'N/record'],
    /**
 * @param{log} log
 * @param{record} record
 */
    (log, record) => {

        /**
         * Defines the Scheduled script trigger point.
         * @param {Object} scriptContext
         * @param {string} scriptContext.type - Script execution context. Use values from the scriptContext.InvocationType enum.
         * @since 2015.2
         */
        const execute = (scriptContext) => {
            var rec = record.create({
                type: record.Type.SALES_ORDER,
                isDynamic: true
            });
            rec.setValue({
                fieldId: 'entity',
                value: 427305
            });
            rec.setValue({
                fieldId: 'memo',
                value: 'Scheduled Script Test'
            })
            // items sublist
            rec.selectNewLine({
                sublistId: 'item'
            });
            rec.setCurrentSublistValue({
                sublistId: 'item',
                fieldId: 'item',
                value: 24495
            });
            rec.setCurrentSublistValue({
                sublistId: 'item',
                fieldId: 'quantity',
                value: 1
            });
            rec.commitLine({
                sublistId: 'item'
            });
            var internalID = rec.save();
            log.debug({
                title: 'Sales Order Created',
                details: 'Internal ID: ' + internalID
            });

            

        }

        return {execute}

    });
