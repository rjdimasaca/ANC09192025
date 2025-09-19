/**
 * @NApiVersion 2.1
 * @NScriptType Suitelet
 */
define(['N/ui/serverWidget', 'N/file', 'N/log'], (serverWidget, file, log) => {

    const onRequest = (context) => {
        if (context.request.method === 'GET') {
            const form = serverWidget.createForm({ title: 'Planner Calendar' });

            const inlineHtmlField = form.addField({
                id: 'custpage_calendar_html',
                type: serverWidget.FieldType.INLINEHTML,
                label: 'Calendar'
            });

            try {
                // Load the HTML file from the File Cabinet
                const htmlFile = file.load({
                    id: './calendar-planner.html' // Update path if different
                });

                inlineHtmlField.defaultValue = htmlFile.getContents();
            } catch (e) {
                log.error('Error loading HTML file', e);
                inlineHtmlField.defaultValue = '<div style="color:red">Failed to load calendar UI.</div>';
            }

            context.response.writePage(form);
        }
    };

    return { onRequest };
});
