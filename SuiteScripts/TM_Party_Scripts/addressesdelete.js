/**
 * @NApiVersion 2.x
 * @NScriptType ScheduledScript
 */
define(['N/record', 'N/search'], function(record, search) {

    function execute(context) {
        var mySearch = search.create({
            type: 'customrecord_anc_consigneealtaddress', // change to your record type ID
            filters: [],
            columns: ['internalid']
        });

        var pagedData = mySearch.runPaged({ pageSize: 1000 });

        pagedData.pageRanges.forEach(function(pageRange) {
            var page = pagedData.fetch({ index: pageRange.index });
            page.data.forEach(function(result) {
                var id = result.id;
                try {
                    record.delete({
                        type: 'customrecord_anc_consigneealtaddress',
                        id: id
                    });
                } catch (e) {
                    log.error('Delete failed', e);
                }
            });
        });
    }

    return { execute: execute };
});
