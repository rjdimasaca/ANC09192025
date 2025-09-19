/**
 * @NApiVersion 2.1
 * @NScriptType UserEventScript
 *
 * Author       :       Rodmar Dimasaca / rod@joycloud.solutions / netrodsuite@gmail.com
 * Description  :       For ANC
 * File Name    :       ANC_UE_MINIMIZE_UI.js
 * Script Name  :       ANC UE MINIMIZE UI
 * Script Id    :       customscript_ue_minimize_ui
 * Deployment Id:       customdeploy_ue_minimize_ui
 * API Version  :       2.1
 * version      :       1.0.0
 *
 */
define(['/SuiteScripts/ANC_lib.js', 'N/https', 'N/record', 'N/runtime', 'N/ui/dialog', 'N/ui/message', 'N/ui/serverWidget', 'N/url'],
    /**
     * @param{https} https
     * @param{record} record
     * @param{runtime} runtime
     * @param{dialog} dialog
     * @param{message} message
     * @param{serverWidget} serverWidget
     * @param{url} url
     */
    (ANC_lib, https, record, runtime, dialog, message, serverWidget, url) => {


        var ANC_SL_MINIMIZE_UI_url = "";
        /**
         * Defines the function definition that is executed before record is loaded.
         * @param {Object} scriptContext
         * @param {Record} scriptContext.newRecord - New record
         * @param {string} scriptContext.type - Trigger type; use values from the context.UserEventType enum
         * @param {Form} scriptContext.form - Current form
         * @param {ServletRequest} scriptContext.request - HTTP request information sent from the browser for a client action only.
         * @since 2015.2
         */
        const beforeLoad = (scriptContext) => {
            try
            {
                ANC_SL_MINIMIZE_UI_url = url.resolveScript({
                    scriptId : "customscript_anc_sl_minimize_ui",
                    deploymentId : "customdeploy_anc_sl_minimize_ui"
                });
                elemList = ANC_lib.MINIMIZE_UI().elemList;
                addHeaderElements(scriptContext);
                addElements(scriptContext);
                hideColumns(scriptContext);
            }
            catch(e)
            {
                log.error("ERROR in function beforeLoad", e);
            }
        }

        function addHeaderElements(scriptContext)
        {
            try
            {
                if(scriptContext.type == "view")
                {
                    var inlineHtmlField = scriptContext.form.addField({
                        id : "custpage_anc_headernotes",
                        label : "notes",
                        type : "inlinehtml",
                    });

                    var ICONS = ANC_lib.GET_ICONS();
                    log.debug(`addHeaderElements ICONS`, ICONS)
                    inlineHtmlField.defaultValue = `
                    <img width="25px" height="undefined" src="${ICONS[runtime.accountId].NOTES.url}" style="cursor: pointer;" onclick="window.open('${ANC_SL_MINIMIZE_UI_url}&traninternalid=${scriptContext.newRecord.id}&minimizeui=headernotes','popupWindowlinenotes1', 'width=900,height=700,scrollbars=yes'); return false;" alt="Click to open popup">
                    Header Notes
                    <!--<a target="_blank" href="/app/site/hosting/scriptlet.nl?script=5576&deploy=1&compid=1116623_SB2&traninternalid=${scriptContext.newRecord.id}&minimizeui=headernotes">NOTES</a>-->
                `
                }
            }
            catch(e)
            {
                log.error("ERROR in function addHeaderElements", e)
            }
        }

        function hideColumns(scriptContext)
        {
            try
            {
                // var columnsToHide = ["options"];
                // var columnsToHide = ["options","rate","amount","taxrate1","taxrate2"];
                var columnsToHide = [];
                if(scriptContext.type == "view")
                {
                    columnsToHide = ["options","rate","amount","taxrate1","taxrate2","shipaddress", "shippingaddress", "shippingaddress_key", "shipaddress_display", "shippingcarrier", "shipcarrier", "shipcarrier_display", "shipgroup", "shipmethod", "shipvia", "shippingmethod", "shipping_method"];
                    columnsToHide = columnsToHide.concat([
                            "custcol_anc_customeralloc_caid",
                            "custcol_anc_fitment",
                            "custcol_anc_shipmentcap_id",
                            "custcol_anc_prodcapweek_id",
                            "custcol_anc_relatedshipments",
                            "custcol_anc_salesforecastcheck",
                            "custcol_anc_shipcapcheck",
                            "custcol_anc_prodcapcheck",
                        ]
                    );
                }
                else if(scriptContext.type == "edit")
                {
                    columnsToHide = ["taxrate1","taxrate2","shipaddress", "shippingaddress", "shippingaddress_key", "shipaddress_display", "shippingcarrier", "shipcarrier", "shipcarrier_display", "shipgroup", "shipmethod", "shipvia", "shippingmethod", "shipping_method"];
                    columnsToHide = columnsToHide.concat([
                            "custcol_anc_customeralloc_caid",
                            "custcol_anc_fitment",
                            "custcol_anc_shipmentcap_id",
                            "custcol_anc_prodcapweek_id",
                            "custcol_anc_relatedshipments",
                            "custcol_anc_salesforecastcheck",
                            "custcol_anc_shipcapcheck",
                            "custcol_anc_prodcapcheck",
                        ]
                    );
                }
                else if(scriptContext.type == "create")
                {
                    columnsToHide = ["taxrate1","taxrate2","shipaddress", "shippingaddress", "shippingaddress_key", "shipaddress_display", "shippingcarrier", "shipcarrier", "shipcarrier_display", "shipgroup", "shipmethod", "shipvia", "shippingmethod", "shipping_method"];
                    columnsToHide = columnsToHide.concat([
                            "custcol_anc_customeralloc_caid",
                            "custcol_anc_fitment",
                            "custcol_anc_shipmentcap_id",
                            "custcol_anc_prodcapweek_id",
                            "custcol_anc_relatedshipments",
                            "custcol_anc_salesforecastcheck",
                            "custcol_anc_shipcapcheck",
                            "custcol_anc_prodcapcheck",
                        ]
                    );
                }
                else if(scriptContext.type == "copy")
                {
                    columnsToHide = ["taxrate1","taxrate2","shipaddress", "shippingaddress", "shippingaddress_key", "shipaddress_display", "shippingcarrier", "shipcarrier", "shipcarrier_display", "shipgroup", "shipmethod", "shipvia", "shippingmethod", "shipping_method"];
                    columnsToHide = columnsToHide.concat([
                            "custcol_anc_customeralloc_caid",
                            "custcol_anc_fitment",
                            "custcol_anc_shipmentcap_id",
                            "custcol_anc_prodcapweek_id",
                            "custcol_anc_relatedshipments",
                            "custcol_anc_salesforecastcheck",
                            "custcol_anc_shipcapcheck",
                            "custcol_anc_prodcapcheck",
                        ]
                    );
                }


                log.debug("columnsToHide", columnsToHide);
                if(scriptContext.type == "view" || scriptContext.type == "edit")
                {

                    for(var a = 0 ; a < columnsToHide.length ; a++)
                    {
                        try
                        {
                            var targetFieldObj = scriptContext.form.getSublist({id: 'item'}).getField({id: columnsToHide[a]});

                            if(targetFieldObj)
                            {
                                targetFieldObj.updateDisplayType({
                                    displayType : "hidden"
                                })

                                log.debug("targetFieldObj to hide" + columnsToHide[a], targetFieldObj)
                            }
                        }
                        catch(e_hidecol)
                        {
                            log.error("CANNOT HIDE COLUMN " + columnsToHide[a], e_hidecol)
                        }
                    }

                }
            }
            catch(e)
            {
                log.error("ERROR in function hideColumns", e)
            }
        }

        //TODO MOVE TO LIBRARY
        var elemList = [];

        const addElements = (scriptContext) => {
            try
            {
                var lineUrlsObj = {};
                var lineUrls = [];
                var lineFitmentIcons = [];
                var lineProdcapIcons = [];
                var lineShipcapIcons = [];
                var lineForecastIcons = [];

                if (scriptContext.type == "view" /*|| scriptContext.type == "edit"*/) {


                    elemList = elemList.sort(function(a,b){
                        return b.position - a.position
                    })


                    for(var j = 0 ; j < elemList.length; j++)
                    {
                        lineUrls = [];
                        lineFitmentIcons = [];
                        lineProdcapIcons = [];
                        lineShipcapIcons = [];
                        lineForecastIcons = [];
                        var groupElem = elemList[j];

                        var base_fitmentAndReserveUiUrl = "/app/site/hosting/scriptlet.nl?script=5576&deploy=1";
                        var base_fitmentAndReserveUiUrl = url.resolveScript({
                            scriptId : groupElem.targetScriptId,
                            deploymentId : groupElem.targetDeploymentId
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

                        if(groupElem.addtlParams)
                        {
                            base_fitmentAndReserveUiUrl += groupElem.addtlParams
                        }

                        var lineCount = scriptContext.newRecord.getLineCount({
                            sublistId : "item"
                        })

                        for(var a = 0  ; a < lineCount ; a++)
                        {
                            var doMinimizeUi = true;

                            if(doMinimizeUi)
                            {
                                var substitutionUiUrl = "" + base_fitmentAndReserveUiUrl;
                                substitutionUiUrl += "&tranlinenum=" + scriptContext.newRecord.getSublistValue({sublistId : "item", fieldId : "line", line : a})
                                // substitutionUiUrl += "&tranlineitem=" + scriptContext.newRecord.getSublistValue({sublistId : "item", fieldId : "item", line : a})
                                // substitutionUiUrl += "&tranlineqty=" + scriptContext.newRecord.getSublistValue({sublistId : "item", fieldId : "quantity", line : a})
                                substitutionUiUrl += "&tranlinesequence=" + (Number(a) + 1)

                                // substitutionUiUrl += "&othercompf=" + JSON.stringify(filteredArr);

                                var lineProdcapIcon = scriptContext.newRecord.getSublistValue({sublistId : "item", fieldId : "custcol_anc_prodcapcheck", line : a});
                                var lineForecastIcon = scriptContext.newRecord.getSublistValue({sublistId : "item", fieldId : "custcol_anc_salesforecastcheck", line : a});
                                var lineFitmentIcon = scriptContext.newRecord.getSublistValue({sublistId : "item", fieldId : "custcol_anc_fitment", line : a});
                                var lineShipcapIcon = scriptContext.newRecord.getSublistValue({sublistId : "item", fieldId : "custcol_anc_shipcapcheck", line : a});

                                lineUrls.push(substitutionUiUrl);
                                lineProdcapIcons.push(lineProdcapIcon)
                                lineForecastIcons.push(lineForecastIcon)
                                lineFitmentIcons.push(lineFitmentIcon)
                                lineShipcapIcons.push(lineShipcapIcon)
                            }
                        }

                        log.debug("lineUrls", lineUrls);
                        log.debug("lineFitmentIcons", lineFitmentIcons);
                        lineUrlsObj.lineUrls = lineUrlsObj.lineUrls;
                        lineUrlsObj.lineFitmentIcons = lineFitmentIcons;
                        lineUrlsObj.lineForecastIcons = lineForecastIcons;
                        lineUrlsObj.lineProdcapIcons = lineProdcapIcons;
                        lineUrlsObj.lineShipcapIcons = lineShipcapIcons;

                        var inlineHtmlFieldValue = `
                        <script>
                        jQuery(document).ready(function() {
                            
                            
                            //makeElementClickable
                            
                            
                            
                            
                            
                            
                            
                            
                            // alert(12345);
                            var anc_minimized_ui = false;
                            
                            var minimize_ui_tds = jQuery(".minimize_ui_elem_td0${groupElem.name}");
                            // console.log("anc_minimized_ui_${groupElem.name}", anc_minimized_ui)
                            console.log("minimize_ui_tds_${groupElem.name}", minimize_ui_tds)
                            if(/*!anc_minimized_ui || */minimize_ui_tds.length == 0)
                            {
                                var rows = [];
                                console.log("scriptContext.type", "${scriptContext.type}"=="view");
                                if(("${scriptContext.type}"=="view") == true)
                                {
                                    console.log("its true")
                                    rows = jQuery("#item_splits.uir-machine-table tbody tr");
                                }
                                else if("${scriptContext.type}"=="edit")
                                {
                                    console.log("its false")
                                    rows = jQuery("tr[id^=item_row]");
                                    rows = jQuery("#item_splits.uir-machine-table tbody tr[id^=item_]");
                                }
                                
                                console.log("rows", rows);
                                
                                
                                rows.each(function(index, elem){
                                    
                                    var lineUrls = ${JSON.stringify(lineUrls)};
                                    var lineFitmentIcons = ${JSON.stringify(lineFitmentIcons)};
                                    var lineProdcapIcons = ${JSON.stringify(lineProdcapIcons)};
                                    var lineShipcapIcons = ${JSON.stringify(lineShipcapIcons)};
                                    var lineForecastIcons = ${JSON.stringify(lineForecastIcons)};
                                    
                                    // console.log("lineUrls", lineUrls);
                                    
                                    window["lineUrl_${groupElem.name}" + index] = lineUrls[index]
                                    window["lineFitmentIcons_${groupElem.name}" + index] = lineFitmentIcons[index]
                                    window["lineProdcapIcons_${groupElem.name}" + index] = lineProdcapIcons[index]
                                    window["lineShipcapIcons_${groupElem.name}" + index] = lineShipcapIcons[index]
                                    window["lineForecastIcons_${groupElem.name}" + index] = lineForecastIcons[index]
                                    
                                    console.log("lineFitmentIcons", lineFitmentIcons)
                                    console.log("lineProdcapIcons", lineProdcapIcons)
                                    console.log("lineShipcapIcons", lineShipcapIcons)
                                    console.log("lineForecastIcons", lineForecastIcons)
                                    console.log("lineUrls", lineUrls)
                                
                                //TODO you may not have to plug the functions or details into WINDOWS object, see see ANC_UE_SALES_PROCESSES.js it may have been done here already.
                                    if(index==0)
                                    {
                                        // console.log("jQuery(this).children()" + index, jQuery(this).children());
                                        // jQuery(this).prepend("<td>${groupElem.headerTitle}</td>") 
                                        // jQuery(this).prepend("<td height="100%" class="listheadertd listheadertextb uir-column-large" style="" data-label="Units" data-nsps-type="columnheader" data-nsps-label="Units" data-nsps-id="columnheader_item_units"><div class="listheader">${groupElem.headerTitle}</td>") 
                                        // jQuery(this).prepend('<td height="100%" class="listheadertdleft listheadertextb uir-column-large" style="" data-label="Item" data-nsps-type="columnheader" data-nsps-label="Item" data-nsps-id="columnheader_item_item"><div class="listheader">${groupElem.headerTitle}<img class="uir-hover-icon" src="/images/hover/icon_hover.png?v=2025.1" alt="" border="0" style="margin-left:8px;vertical-align:middle;" title="This column is hoverable"></div></td>')   
                                        jQuery(this).children().eq(${groupElem.position}).before(jQuery('<td height="100%" class="minimize_ui_elem_td0${groupElem.name} listheadertd listheadertextb uir-column-large" style="" data-label="Units" data-nsps-type="columnheader" data-nsps-label="Units" data-nsps-id="columnheader_item_units"><div class="listheader">${groupElem.headerTitle}</td>'));
                                        
                                        anc_minimized_ui = true;
                                    }
                                    else
                                    {
                                        // console.log("jQuery(this).children()" + index, jQuery(this).children());
                                        // var newTdHtml = '<td align="center"><img width="25px" height="25px" src="https://tstdrv1469253.app.netsuite.com/core/media/media.nl?id=58980&c=TSTDRV1469253&h=cb99Jl9ybtFCXBKZyIxOi8rE3eIQMbaejHergNw3VHVbiTGL" style="cursor: pointer;" onclick="window.open(window.lineUrl_';
                                        
                                        var newTdHtml = "";
                                        if(${groupElem.tdElementEnd})
                                        {
                                            newTdHtml = ${groupElem.tdElementStart}
                                            newTdHtml += (index-1)
                                            newTdHtml += ${groupElem.tdElementEnd}
                                        }
                                        else
                                        {
                                            if(${groupElem.replicateIcon})
                                            {
                                                
                                                if("${groupElem.name}" == "shipments")
                                                {
                                                   newTdHtml += '<td class="minimize_ui_elem_td0${groupElem.name}" align="center"><p style="cursor: pointer;" onclick="window.open(window.lineUrl_${groupElem.name}' + (index-1) + '' +
                                                 '' + ',' + "'" + "popupWindow${groupElem.name}" + (index-1) + "'," + ' \\'width=700,height=700,scrollbars=yes\\'); return false;" alt="Click to open popup">' + lineFitmentIcons[index-1] + '</p></td>' +
                                                  '' + lineFitmentIcons[index-1] + '';
                                                // newTdHtml += ',' + "'" + "popupWindow${groupElem.name}" + (index-1) + "'," + ' \\'width=700,height=700,scrollbars=yes\\'); return false;" alt="Click to open popup"></p></td>' 
                                                }
                                                else if("${groupElem.name}" == "prodcap")
                                                {
                                                   newTdHtml += '<td class="minimize_ui_elem_td0${groupElem.name}" align="center"><p style="cursor: pointer;" onclick="window.open(window.lineUrl_${groupElem.name}' + (index-1) + '' +
                                                 '' + ',' + "'" + "popupWindow${groupElem.name}" + (index-1) + "'," + ' \\'width=700,height=700,scrollbars=yes\\'); return false;" alt="Click to open popup">' + lineProdcapIcons[index-1] + '</p></td>' +
                                                  '' + lineProdcapIcons[index-1] + '';
                                                // newTdHtml += ',' + "'" + "popupWindow${groupElem.name}" + (index-1) + "'," + ' \\'width=700,height=700,scrollbars=yes\\'); return false;" alt="Click to open popup"></p></td>' 
                                                }
                                                else if("${groupElem.name}" == "shipcap")
                                                {
                                                   newTdHtml += '<td class="minimize_ui_elem_td0${groupElem.name}" align="center"><p style="cursor: pointer;" onclick="window.open(window.lineUrl_${groupElem.name}' + (index-1) + '' +
                                                 '' + ',' + "'" + "popupWindow${groupElem.name}" + (index-1) + "'," + ' \\'width=700,height=700,scrollbars=yes\\'); return false;" alt="Click to open popup">' + lineShipcapIcons[index-1] + '</p></td>' +
                                                  '' + lineShipcapIcons[index-1] + '';
                                                // newTdHtml += ',' + "'" + "popupWindow${groupElem.name}" + (index-1) + "'," + ' \\'width=700,height=700,scrollbars=yes\\'); return false;" alt="Click to open popup"></p></td>' 
                                                }
                                                else if("${groupElem.name}" == "salesforecast")
                                                {
                                                   newTdHtml += '<td class="minimize_ui_elem_td0${groupElem.name}" align="center"><p style="cursor: pointer;" onclick="window.open(window.lineUrl_${groupElem.name}' + (index-1) + '' +
                                                 '' + ',' + "'" + "popupWindow${groupElem.name}" + (index-1) + "'," + ' \\'width=700,height=700,scrollbars=yes\\'); return false;" alt="Click to open popup">' + lineForecastIcons[index-1] + '</p></td>' +
                                                  '' + lineForecastIcons[index-1] + '';
                                                // newTdHtml += ',' + "'" + "popupWindow${groupElem.name}" + (index-1) + "'," + ' \\'width=700,height=700,scrollbars=yes\\'); return false;" alt="Click to open popup"></p></td>' 
                                                }
                                                
                                            }
                                            else
                                            {
                                                newTdHtml = '<td class="minimize_ui_elem_td0${groupElem.name}" align="center"><img width="${groupElem.iconWidth}" height="${groupElem.iconHeight}" src="${groupElem.icon}" style="cursor: pointer;" onclick="window.open(window.lineUrl_${groupElem.name}';
                                                newTdHtml += (index-1) + ',' + "'" + "popupWindow${groupElem.name}" + (index-1) + "'," + ' \\'width=900,height=700,scrollbars=yes\\'); return false;" alt="Click to open popup"></td>'
                                            }
                                            // newTdHtml = '<td class="minimize_ui_elem_td0${groupElem.name}" align="center"><p>' + lineFitmentIcons[index-1] + '</p><img width="${groupElem.iconWidth}" height="${groupElem.iconHeight}" src="${groupElem.icon}" style="cursor: pointer;" onclick="window.open(window.lineUrl_${groupElem.name}';
                                    
                                            // newTdHtml = '<td class="minimize_ui_elem_td0${groupElem.name}" align="center"><p>${'window.lineFitmentIcons_' + groupElem.name}' + (index-1) + '</p><img width="${groupElem.iconWidth}" height="${groupElem.iconHeight}" src="${groupElem.icon}" style="cursor: pointer;" onclick="window.open(window.lineUrl_${groupElem.name}';
                                    
                                            // //as of 06272025 mike wants a clickable asci based on a stored field
                                            
                                            // newTdHtml += (index-1) + ',' + "'" + (index-1) + 'popupWindow${groupElem.name},' + ' \\'popupWindow${groupElem.name}\\', \\'width=700,height=700,scrollbars=yes\\'); return false;" alt="Click to open popup"></td>'
                                            // newTdHtml += (index-1) + ',' + "'" + "popupWindow${groupElem.name}" + (index-1) + "'," + ' \\'width=700,height=700,scrollbars=yes\\'); return false;" alt="Click to open popup"></td>'
                                
                                        }
                                        
                                        var lineUrl = lineUrls[index-1]
                                        if(lineUrl != "substituted")
                                        {
                                            // jQuery(this).prepend(newTdHtml);
                                            jQuery(this).children().eq(${groupElem.position}).before(jQuery(newTdHtml));
                                        }
                                        else
                                        {
                                            // jQuery(this).prepend('<td align="center">Reserved</td>');
                                            jQuery(this).children().eq(${groupElem.position}).before(jQuery('<td align="center">Reserved</td>'));
                                        }
                                        
                                        anc_minimized_ui = true;
                                    }
                                })
                            }
                            
                        });
                        </script>
                        `

                        var inlineHtmlField = scriptContext.form.addField({
                            id: "custpage_anc_minimize_ui_html" + j,
                            type: "inlinehtml",
                            label: "ANC Minimize UI HTML" + j
                        });

                        inlineHtmlField.defaultValue = inlineHtmlFieldValue;

                    }

                }
            } catch (e) {
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

        return {beforeLoad, beforeSubmit, afterSubmit}

    });
