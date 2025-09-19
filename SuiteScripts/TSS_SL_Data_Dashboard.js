/**
 * @NApiVersion 2.1
 * @NScriptType Suitelet
 */
//var lineChartHtmlFile='TSS Line Chartjs.html';
var cashFlowHTMLFile='TSS Sales Order HTML data.html';
var cashFlowCSSFile='TSS Dashboard CSS data.css';
var selfSuiteLetScript=['customscript_tss_sl_dashboard_forecast','customdeploy_tss_sl_dashboard_forecast']
var tagetSuiteletScript=['customscript_tss_sl_sales_order_line_gra', 'customdeploy_tss_sl_sales_order_line_gra']
var addValDataJson={};
var userDateFormat='MM/DD/YYYY';
define(['N/ui/serverWidget','N/search','N/file','N/config','N/url','N/format','N/record','N/redirect','./moment.js'],
    /**
 * @param{serverWidget} serverWidget
 */
    (serverWidget, search, file, config, url, format, record, redirect,moment) => {
        /**
         * Defines the Suitelet script trigger point.
         * @param {Object} scriptContext
         * @param {ServerRequest} scriptContext.request - Incoming request
         * @param {ServerResponse} scriptContext.response - Suitelet response
         * @since 2015.2
         */
        const onRequest = (scriptContext) => {
           
            try{
                var targetUrl  = url.resolveScript({
                    scriptId: tagetSuiteletScript[0],
                    deploymentId: tagetSuiteletScript[1],
                    returnExternalUrl: false
                });
                var form = serverWidget.createForm({
                    title: 'Forecast Dashboard', hideNavBar: true 
                });
                var htmlField = form.addField({
                    id: 'custpage_html',
                    type: serverWidget.FieldType.INLINEHTML,
                    label: 'HTML Field'
                })
                var content = '<iframe id="htmliframe" src="'+targetUrl+'" style="position: absolute; top: 0; left: 0; border:none;width:100%;height:100%;"></iframe>';
                htmlField.defaultValue = content;
                scriptContext.response.writePage(form);
            }
            catch(e){
                log.error("error in showing the form",e)
            }

        }

        return {onRequest}

    });
