/**
 * @NApiVersion 2.1
 * @NScriptType Suitelet
 */

define(['N/ui/serverWidget', 'N/query', 'N/log'], (ui, query, log) => {
    const onRequest = (context) => {
        if (context.request.method === 'GET') {
            try {
                // Create a simple form
                const form = ui.createForm({ title: 'Consignee Records (SuiteQL)' });

                // Add a sublist to display results
                const sublist = form.addSublist({
                    id: 'custpage_consignee_sublist',
                    label: 'Consignee Records',
                    type: ui.SublistType.LIST
                });

                // Add columns to the sublist
                sublist.addField({ id: 'name', label: 'Name', type: ui.FieldType.TEXT });
                sublist.addField({ id: 'transport_mode', label: 'Transportation Mode', type: ui.FieldType.TEXT });

                // SuiteQL query
                const sql = `
                    SELECT 
                        cr.name,
                        cm.custrecord_anc_conmaster_transmode
                    FROM 
                        customrecord_alberta_ns_consignee_record cr
                    LEFT JOIN 
                        customer cust ON cr.custrecord_alberta_ns_customer = cust.id
                    LEFT JOIN 
                        customrecord_anc_consigneemaster cm ON cr.custrecord_anc_custcons_consignee = cm.id
                    WHERE 
                        cr.isinactive = 'F'
                        AND cr.id = ?
                `;

                const results = query.runSuiteQL({ query: sql, params: ['305738'] }).asMappedResults();

                log.debug('SuiteQL Result Count', results.length);
                log.debug('SuiteQL Result Count', results);

                // Populate sublist with data
                results.forEach((row, index) => {
                    log.debug("row", row);
                    log.debug("index", index);
                    log.debug("row.name", row.name);
                    log.debug("row.custrecord_anc_conmaster_transmode", row.custrecord_anc_conmaster_transmode);

                    if (row.name)
                        sublist.setSublistValue({ id: 'name', line: index, value: safeValue(row.name) || '' });
                    if (row.custrecord_anc_conmaster_transmode)
                        sublist.setSublistValue({ id: 'transport_mode', line: index, value: safeValue(row.custrecord_anc_conmaster_transmode) });

                });

                context.response.writePage(form);
            } catch (error) {
                log.error('Error in Suitelet', error);
                context.response.write(`Error: ${error.message}`);
            }
        }
    };

    function safeValue(val) {
        return val ? String(val) : '';
    }

    return { onRequest };
});
