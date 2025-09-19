/**
 * @NApiVersion 2.1
 * @NScriptType UserEventScript
 *
 * Author       :       Rodmar Dimasaca / rod@joycloud.solutions
 * Description  :       For ANC
 * File Name    :       ANC_UE_FITMENT_AND_RESERVE.js
 * Script Name  :       ANC UE FITMENT AND RESERVE
 * Script Id    :       customscript_ue_fitment_and_reserve
 * Deployment Id:       customdeploy_ue_fitment_and_reserve
 * API Version  :       2.1
 * version      :       1.0.0
 */
define(['N/https', 'N/record', 'N/runtime', 'N/ui/serverWidget', 'N/url'],
    /**
 * @param{https} https
 * @param{record} record
 * @param{runtime} runtime
 * @param{serverWidget} serverWidget
 * @param{url} url
 */
    (https, record, runtime, serverWidget, url) => {

        var lineUrls = [];

        /**
         * Defines the function definition that is executed before record is loaded.
         * @param {Object} scriptContext
         * @param {Record} scriptContext.newRecord - New record
         * @param {string} scriptContext.type - Trigger type; use values from the context.UserEventType enum
         * @param {Form} scriptContext.form - Current form
         * @param {ServletRequest} scriptContext.request - HTTP request information sent from the browser for a client action only.
         * @since 2015.2
         */
        const beforeLoad = (scriptContext) =>
        {
            try
            {
                log.debug("beforeLoad scriptContext", scriptContext)
                addElements(scriptContext);
            }
            catch(e)
            {
                log.error("ERROR in function beforeLoad", e)
            }
        }

        const addElements = (scriptContext) => {
            try
            {
                var lineUrls = [];
                if (scriptContext.type == "view") {

                    var base_fitmentAndReserveUiUrl = "/app/site/hosting/scriptlet.nl?script=5572&deploy=1";
                    var base_fitmentAndReserveUiUrl = url.resolveScript({
                        scriptId : "customscript_anc_sl_fit_and_reserve",
                        deploymentId : "customdeploy_anc_sl_fit_and_reserve"
                    });
                    log.debug("base_fitmentAndReserveUiUrl", base_fitmentAndReserveUiUrl);
                    base_fitmentAndReserveUiUrl += "&traninternalid=" + scriptContext.newRecord.id
                    // base_fitmentAndReserveUiUrl += "&tranentity=" + scriptContext.newRecord.getValue({fieldId : "entity"})
                    // base_fitmentAndReserveUiUrl += "&trandate=" + scriptContext.newRecord.getValue({fieldId : "trandate"})
                    // base_fitmentAndReserveUiUrl += "&tranheaderitem=" + scriptContext.newRecord.getValue({fieldId : "assemblyitem"})
                    // base_fitmentAndReserveUiUrl += "&tranheadercreatedfrom=" + scriptContext.newRecord.getValue({fieldId : "createdfrom"})

                    // var othercompObj = getOtherComponents(scriptContext);
                    // var othercompparam = "&othercomp=" + othercompObj.stringify;
                    // base_fitmentAndReserveUiUrl += othercompparam;

                    log.debug("base_fitmentAndReserveUiUrl", base_fitmentAndReserveUiUrl);

                    var lineCount = scriptContext.newRecord.getLineCount({
                        sublistId : "item"
                    })

                    for(var a = 0  ; a < lineCount ; a++)
                    {
                        // var filteredArr = othercompObj.array.filter(function(elem){
                        //     if(elem.line == a+1)
                        //     {
                        //         return false;
                        //     }
                        //     else
                        //     {
                        //         return true;
                        //     }
                        // })
                        // log.debug("filteredArr", filteredArr);


                        // var lastSubstituteId = scriptContext.newRecord.getSublistValue({sublistId : "item", fieldId : "custcol_r8l_itemsubstitution", line : a})
                        var substitutionCount = scriptContext.newRecord.getSublistValue({sublistId : "item", fieldId : "custcol_r8l_substitutioncount", line : a});


                        substitutionCount = Number(substitutionCount || 0);
                        log.debug("substitutionCount", substitutionCount);
                        if(substitutionCount > 0)
                        {
                            var substitutionUiUrl = "substituted";
                            lineUrls.push(substitutionUiUrl);
                        }
                        else
                        {
                            var substitutionUiUrl = "" + base_fitmentAndReserveUiUrl;
                            substitutionUiUrl += "&tranlinenum=" + scriptContext.newRecord.getSublistValue({sublistId : "item", fieldId : "line", line : a})
                            // substitutionUiUrl += "&tranlineitem=" + scriptContext.newRecord.getSublistValue({sublistId : "item", fieldId : "item", line : a})
                            // substitutionUiUrl += "&tranlineqty=" + scriptContext.newRecord.getSublistValue({sublistId : "item", fieldId : "quantity", line : a})
                            substitutionUiUrl += "&tranlinesequence=" + (Number(a) + 1)

                            // substitutionUiUrl += "&othercompf=" + JSON.stringify(filteredArr);
                            lineUrls.push(substitutionUiUrl);
                        }


                    }

                    log.debug("lineUrls", lineUrls);

                    var inlineHtmlFieldValue = `
                    <script>
                    jQuery(document).ready(function() {
                        // alert(12345);
                        
                        var rows = jQuery("#item_splits.uir-machine-table tbody tr");
                        console.log(rows);
                        
                        
                        rows.each(function(index, elem){
                            
                            var lineUrls = ${JSON.stringify(lineUrls)};
                            
                            console.log("lineUrls", lineUrls);
                            
                            window["lineUrl_fc_" + index] = lineUrls[index]
                        
                            if(index==0)
                            {
                                // jQuery(this).prepend("<td height='100%' class='minimize_ui_elem_td0f listheadertd listheadertextb uir-column-large' style='' data-label='Units' data-nsps-type='columnheader' data-nsps-label='Units' data-nsps-id='columnheader_item_units'><div class='listheader'>Fitment and Reservation</div></td">
                                //
                                // jQuery(this).prepend('<td height="100%" class="minimize_ui_elem_td0f listheadertd listheadertextb uir-column-large" style="" data-label="Units" data-nsps-type="columnheader" data-nsps-label="Units" data-nsps-id="columnheader_item_units"><div class="listheader">Fitment and Reservation</div></td'>
                                jQuery(this).prepend("<td>Fitment and Reservation</td>")    
                            }
                            else
                            {
                            
                                // var newTdHtml = '<td align="center"><img width="25px" height="25px" src="https://tstdrv1469253.app.netsuite.com/core/media/media.nl?id=58980&c=TSTDRV1469253&h=cb99Jl9ybtFCXBKZyIxOi8rE3eIQMbaejHergNw3VHVbiTGL" style="cursor: pointer;" onclick="window.open(window.lineUrl_';
                                // var newTdHtml = '<td align="center"><img width="50px" height="50px" src="https://1116623-sb2.app.netsuite.com/core/media/media.nl?id=9203519&c=1116623_SB2&h=LtlOhAYTLDyMXRBethELwZMrys0xDpb03GNVp9glCEtxUR3q" style="cursor: pointer;" onclick="window.open(window.lineUrl_fc_';
                                // var newTdHtml = '<td align="center"><img width="50px" height="50px" src="https://1116623-sb2.app.netsuite.com/core/media/media.nl?id=9203553&c=1116623_SB2&h=l-Po_cjvZBx0ApgT98Uj09nMfx1ami--SWWodaj8xHW1QE7m" style="cursor: pointer;" onclick="window.open(window.lineUrl_fc_';
                                var newTdHtml = '<td align="center"><img width="50px" height="50px" src="https://1116623-sb2.app.netsuite.com/core/media/media.nl?id=9203554&c=1116623_SB2&h=kTJFfuyMLg3xSqJ3X2VCVHc9OqW4GxxNPE8KEga83kzlgzYJ" style="cursor: pointer;" onclick="window.open(window.lineUrl_fc_';
                                // var newTdHtml = '<td align="center"><img width="50px" height="50px" src="https://1116623-sb2.app.netsuite.com/core/media/media.nl?id=9203555&c=1116623_SB2&h=gXgGAfmwzsE3pRIGUEu_CzDf627Og5NVkbhfNeIArIdrjy-X" style="cursor: pointer;" onclick="window.open(window.lineUrl_fc_';
                                
                                newTdHtml += (index-1) + ', \\'popupWindow\\', \\'width=700,height=700,scrollbars=yes\\'); return false;" alt="Click to open popup"></td>'
                            
                                var lineUrl = lineUrls[index-1]
                                if(lineUrl != "substituted")
                                {
                                    jQuery(this).prepend(newTdHtml);                                
                                }
                                else
                                {
                                    jQuery(this).prepend('<td align="center">Reserved</td>');                                
                                }
                            }
                            
                        })
                    });
                    </script>
                    `

                    var inlineHtmlField = scriptContext.form.addField({
                        id : "custpage_anc_fitment_and_reserve_html",
                        type : "inlinehtml",
                        label : "Fitment and Reserve HTML"
                    });

                    inlineHtmlField.defaultValue = inlineHtmlFieldValue;

                    var base_fitmentmentcheckingUiUrl = "/app/site/hosting/scriptlet.nl?script=5572&deploy=1";
                    var base_fitmentmentcheckingUiUrl = url.resolveScript({
                        scriptId : "customscript_anc_sl_fitmentchecking",
                        deploymentId : "customdeploy_anc_sl_fitmentchecking"
                    });
                    log.debug("base_fitmentmentcheckingUiUrl", base_fitmentmentcheckingUiUrl);
                    base_fitmentmentcheckingUiUrl += "&traninternalid=" + scriptContext.newRecord.id



                    scriptContext.form.addButton({
                        name : "custpage_btn_fitmentcheck",
                        id : "custpage_btn_fitmentcheck",
                        label : "Fitment Check",
                        functionName : `window.open('${base_fitmentmentcheckingUiUrl}', '${scriptContext.newRecord.id}_fitmentchecking_popupWindow', 'width=700,height=700,scrollbars=yes')`
                    })

                }
            }
            catch(e)
            {
                log.error("ERROR in function addElements", e);
            }
        }



        /**
         * Defines the function definition that is executed before record is submitted.
         * @param {Object} scriptContext
         * @param {Record} scriptContext.newRecord - New record
         * @param {Record} scriptContext.oldRecord - Old record
         * @param {string} scriptContext.type - Trigger type; use values from the context.UserEventType enum
         * @since 2015.2
         */
        const beforeSubmit = (scriptContext) => {

        }

        /**
         * Defines the function definition that is executed after record is submitted.
         * @param {Object} scriptContext
         * @param {Record} scriptContext.newRecord - New record
         * @param {Record} scriptContext.oldRecord - Old record
         * @param {string} scriptContext.type - Trigger type; use values from the context.UserEventType enum
         * @since 2015.2
         */
        const afterSubmit = (scriptContext) => {

        }

        return {beforeLoad/*, beforeSubmit, afterSubmit*/}

    });
