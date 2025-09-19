/**
 * @NApiVersion 2.1
 * @NScriptType RESTlet
 * @NModuleScope SameAccount
 */
define(['N/record', 'N/log'], (record, log) => {

    /**
     * @param {Object} requestParams - The parameters from the HTTP request.
     * @returns {Object} - A JSON object with the result.
     */
    function post(requestParams) {
        const { customlistId, valueName } = requestParams;

        log.debug({
            title: 'RESTlet Received Request',
            details: `List ID: ${customlistId}, Value: ${valueName}`
        });

        // Basic validation
        if (!customlistId || !valueName) {
            return {
                success: false,
                message: 'Missing required parameters: customlistId or valueName.'
            };
        }

        try {
            // Check for existing duplicates on the server side as a final safeguard.
            // Note: This requires a search and adds complexity. A simpler approach
            // is to rely on NetSuite's duplicate detection, which will cause the
            // record.save() to fail if the list is configured to prevent duplicates.

            const customListRecord = record.create({
                type: customlistId, // The script ID of the custom list is its record type
                isDynamic: true
            });

            customListRecord.setValue({
                fieldId: 'name', // The standard field for the value of a list item
                value: valueName
            });

            const newId = customListRecord.save();

            log.audit({
                title: 'Successfully Created Record',
                details: `Created new entry "${valueName}" in list ${customlistId} with Internal ID: ${newId}`
            });

            // Return a success response with the new internal ID
            return {
                success: true,
                id: newId,
                name: valueName
            };

        } catch (e) {
            log.error({
                title: `Failed to create record for "${valueName}" in ${customlistId}`,
                details: e
            });

            // Return a failure response with the error message
            return {
                success: false,
                message: e.message
            };
        }
    }

    return { post };
});