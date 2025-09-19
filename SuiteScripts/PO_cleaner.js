/**
 * @NApiVersion 2.1
 * @NScriptType ScheduledScript
 */
define(['N/search', 'N/log'], (search, log) => {

    const execute = () => {
        const poSearch = search.create({
            type: search.Type.PURCHASE_ORDER,
            filters: [
    ['tranid', 'startswith', 'EAMPO'], 'AND',
    ['createddate', 'onorafter', '01/01/2025'], 'AND',
    ['mainline', 'is', 'F'], 'AND',
    ['custcol_syncmspo_lineno', 'greaterthan', 0], 'AND',
    ['custcol_syncmspo_lineno', 'lessthan', 10]
],

            columns: [
                'internalid',         // PO ID
                'tranid',             // PO number
                'line',               // Line number in sublist
                'custcol_syncmspo_lineno' // Your custom line no
            ]
        });

        poSearch.run().each(result => {
            const poId = result.getValue('internalid');
            const poNumber = result.getValue('tranid');
            const lineNum = result.getValue('line');
            const eamLineNo = result.getValue('custcol_syncmspo_lineno');

            log.audit('Matched PO Line', 
                `PO #: ${poNumber} (Internal ID: ${poId}), Line: ${lineNum}, EAM Line #: ${eamLineNo}`
            );
            return true;
        });
    };

    return { execute };
});
