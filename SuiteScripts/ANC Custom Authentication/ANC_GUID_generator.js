/**
 * @NApiVersion 2.x
 * @NScriptType Suitelet
 * @NModuleScope SameAccount
 */

define([
'N/ui/serverWidget',
'N/https'
],
function (
    ui,
    https
) {
    var HOST_KEY_TOOL_URL = 'https://ursuscode.com/tools/sshkeyscan.php?url=';

    function getFormTemplate() {
        var form;
        form = ui.createForm({
            title: 'Password Form'
        });
        form.addSubmitButton({
            label: 'Submit'
        });

        return form;
    }

    function addSelectorFields(form) {
        var select = form.addField({
            id: 'selectaction',
            type: ui.FieldType.SELECT,
            label: 'Select Action'
        });
        select.addSelectOption({
            value: 'getpasswordguid',
            text: 'Get Password GUID'
        });
        select.addSelectOption({
            value: 'gethostkey',
            text: 'Get Host Key'
        });
        return form;
    }

    function addPasswordGUID1Fields(form) {
        var frm = form;

        frm.addField({
            id: 'restricttoscriptids',
            type: ui.FieldType.TEXT,
            label: 'Restrict To Script Ids'
        }).isMandatory = true;
        frm.addField({
            id: 'restricttodomains',
            type: ui.FieldType.TEXT,
            label: 'Restrict To Domains'
        }).isMandatory = true;

        return frm;
    }

    function addPasswordGUID2Fields(form, restrictToScriptIds, restrictToDomains) {
        form.addCredentialField({
            id: 'password',
            label: 'Password',
            restrictToScriptIds: restrictToScriptIds.replace(' ', '').split(','),
            restrictToDomains: restrictToDomains.replace(' ', '').split(',')
        });
        return form;
    }

    function addHostKeyFields(form) {
        form.addField({
            id: 'url',
            type: ui.FieldType.TEXT,
            label: 'URL (Required)'
        });

        form.addField({
            id: 'port',
            type: ui.FieldType.INTEGER,
            label: 'Port (Optional)'
        });

        form.addField({
            id: 'hostkeytype',
            type: ui.FieldType.TEXT,
            label: 'Type (Optional)'
        });
        return form;
    }

    function onRequest(option) {
        var method;
        var form;
        var selectAction;
        var port;
        var hostKeyType;
        var restricttoscriptids;
        var restricttodomains;
        var password;

        var theResponse;
        var myUrl;
        var url;
        method = option.request.method;
        form = getFormTemplate(method);
        if (method === 'GET') {
            form = addSelectorFields(form);
        }
        if (method === 'POST') {
            selectAction = option.request.parameters.selectaction;
            if (selectAction === 'getpasswordguid') {
                form = addPasswordGUID1Fields(form);

            } else if (selectAction === 'gethostkey') {
                form = addHostKeyFields(form);
            } else {
                password = option.request.parameters.password;
                url = option.request.parameters.url;
                port = option.request.parameters.port;
                hostKeyType = option.request.parameters.hostkeytype;
                restricttoscriptids = option.request.parameters.restricttoscriptids;
                restricttodomains = option.request.parameters.restricttodomains;

                if (restricttoscriptids && restricttodomains) {
                    form = addPasswordGUID2Fields(form, restricttoscriptids, restricttodomains);
                }

                if (password) {
                    form.addField({
                        id: 'passwordguidresponse',
                        type: ui.FieldType.LONGTEXT,
                        label: 'PasswordGUID Response',
                        displayType: ui.FieldDisplayType.INLINE
                    }).defaultValue = password;
                }
                if (url) {
                    myUrl = HOST_KEY_TOOL_URL + url + '&port=' + port + '&type=' + hostKeyType;
                    theResponse = https.get({ url: myUrl }).body;
                    form.addField({
                        id: 'hostkeyresponse',
                        type: ui.FieldType.LONGTEXT,
                        label: 'Host Key Response',
                        displayType: ui.FieldDisplayType.INLINE
                    }).defaultValue = theResponse;
                }
            }
        }
        option.response.writePage(form);
    }
    return {
        onRequest: onRequest
    };
});