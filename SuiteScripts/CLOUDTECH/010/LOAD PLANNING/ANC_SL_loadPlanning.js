/**
 * @NApiVersion 2.1
 * @NScriptType Suitelet
 */
define(['/SuiteScripts/ANC_lib.js', 'N/file', 'N/url', 'N/redirect', 'N/https', 'N/query', 'N/record', 'N/runtime', 'N/search', 'N/task', 'N/ui/serverWidget'],
    /**
     * @param{file} file
     * @param{https} https
     * @param{query} query
     * @param{record} record
     * @param{runtime} runtime
     * @param{search} search
     * @param{task} task
     * @param{serverWidget} serverWidget
     */
    (ANC_lib, file, url, redirect, https, query, record, runtime, search, task, serverWidget) => {
        /**
         * Defines the Suitelet script trigger point.
         * @param {Object} scriptContext
         * @param {ServerRequest} scriptContext.request - Incoming request
         * @param {ServerResponse} scriptContext.response - Suitelet response
         * @since 2015.2
         */
        var form = null;
        const onRequest = (scriptContext) =>
        {
            try {
                if(scriptContext.request.method == "GET")
                {
                    loadPlanningUi(scriptContext);
                }
                else if(scriptContext.request.method == "POST")
                {
                    log.debug(scriptContext.request, scriptContext.request);
                    log.debug(scriptContext.request.submitter, scriptContext.request.submitter);
                    log.debug(scriptContext.request.parameters, scriptContext.request.parameters);

                    // return;
                    form = serverWidget.createForm({
                        title : "Load Planning",
                        hideNavBar : false
                    });
                    var fitmentJobObj = processShipmentInput(scriptContext);
                    log.debug("fitmentJobObj", fitmentJobObj);

                    var jobDetails = form.addField({
                        label : "InlineHtml",
                        id : "custpage_fld_joblink",
                        type : "inlinehtml"
                    });
                    jobDetails.defaultValue = fitmentJobObj.customJobId

                    var syncJobUrl = url.resolveRecord({
                        recordType : "customrecord_anc_syncjob",
                        recordId : fitmentJobObj.customJobId,
                        params : {
                            openedfrom_loadplanning : "T"
                        }
                    })
                    log.debug("syncJobUrl", syncJobUrl)
                    jobDetails.defaultValue = `<a href="${syncJobUrl}">SYNC JOB:${fitmentJobObj.customJobId}</a>`

                    scriptContext.response.writePage(form);
                }

            }
            catch(e)
            {
                log.error("ERROR in function onRequest", e.message)
            }
        }

        function processShipmentInput(scriptContext)
        {
            var shipmentInput = getShipmentInputs(scriptContext);

            /*
            //TODO searching/querying too much
            //TODO could have retrieved it from the previous function
            // it is this way because of the rush to merge into 1 function that does same things
            */
            const shipmentsAndOrders = ANC_lib.getShipmentsAndOrders(shipmentInput);
            var shipmentLineUniqueKeys = shipmentsAndOrders && shipmentsAndOrders.lineuniquekeys ? shipmentsAndOrders.lineuniquekeys : null;

            log.debug("shipmentLineUniqueKeys", shipmentLineUniqueKeys);

            // const grouped = ANC_lib.groupOrderLinesForShipmentGeneration(null, shipmentsAndOrders.lineuniquekeys, );
            if(!shipmentLineUniqueKeys || !shipmentLineUniqueKeys.length == 0)
            {
                var srToObjects = ANC_lib.groupOrderLinesForShipmentGeneration(null, null, shipmentLineUniqueKeys);

                log.debug("srToObjects", srToObjects);


                //TODO
                // standardizeObjectKeysByProcess();

                srToObjects2 = ANC_lib.standardizeObjectKeysByProcess(srToObjects, "loadplanning");
                log.debug("srToObjects2", srToObjects2);
                srToObjects = srToObjects2;

                var srGroupedByDeliveryDate = ANC_lib.resolveLegOrigcityDestcity_LP(srToObjects, ["deliverydate", "locationtext", "lane_destinationcity", "equipmenttext"], null, true)
                log.debug("srGroupedByDeliveryDate", srGroupedByDeliveryDate)

                // var srGroupedByDeliveryDate = srToObjects;

                srGroupedByDeliveryDate = ANC_lib.splitByConsigneeMax2(srGroupedByDeliveryDate)
                log.debug("srGroupedByDeliveryDate max2 cons", srGroupedByDeliveryDate)

                var customJobId = ANC_lib.submitSyncJob_orderCheck(srGroupedByDeliveryDate);

                var fitmentJobObj = ANC_lib.processJobId( customJobId)

                // redirect.toRecord({
                //     type : "customrecord_anc_syncjob",
                //     id : customJobId
                // })

                log.debug("onRequest customJobId", customJobId)


            }
            var fitmentJobObj = {customJobId:customJobId};

            return fitmentJobObj;
        }

        function getShipmentInputs(scriptContext)
        {
            var respObj = {};
            try
            {
                log.debug("scriptContext.request", scriptContext.request)
                log.debug("scriptContext.request.parameters", scriptContext.request.parameters);

                var sublist1Count = scriptContext.request.getLineCount({
                    group : "custpage_subtab_lp_sublist1"
                });

                log.debug("sublist1Count", sublist1Count)
                var shipmentIds = [];
                for(var a = 0 ; a < sublist1Count ; a++)
                {
                    var sublist1_cbVal = scriptContext.request.getSublistValue({
                        group : "custpage_subtab_lp_sublist1",
                        name : "custpage_fld_lp_select",
                        line : a
                    })
                    // log.debug("sublist1_cbVal", sublist1_cbVal);

                    var sublist1_shipmentVal = scriptContext.request.getSublistValue({
                        group : "custpage_subtab_lp_sublist1",
                        name : "custpage_fld_lp_shipment1",
                        line : a
                    })
                    // log.debug("sublist1_cbVal", sublist1_cbVal);

                    if(sublist1_cbVal && sublist1_cbVal != "F")
                    {
                        shipmentIds.push(sublist1_shipmentVal)
                    }
                }

                log.debug("shipmentIds", shipmentIds)

                respObj.shipmentIds = shipmentIds;
            }
            catch(e)
            {
                log.error("ERROR in function getShipmentInputs")
            }
            return respObj;
        }

        function loadPlanningUi(scriptContext)
        {
            try
            {
                addElements(scriptContext);
            }
            catch(e)
            {
                log.error("ERROR in function loadPlanningUi", e)
            }
        }

        var sublistObj1 = {};

        var shipmentCols = [
            search.createColumn({name : "internalid", join:null, label:"internalid", sort:search.Sort.DESC}),
            search.createColumn({name: "tranid", label: "Document Number"}),
            search.createColumn({name: "custcol_anc_relatedtransaction", label: "Related Transaction"}),
            search.createColumn({name: "custcol_anc_relatedlineuniquekey", label: "Related Line Unique Key"}),
            search.createColumn({name: "item", label: "Item"}),
            search.createColumn({name: "custcol_anc_actualitemtobeshipped", label: "Actual Item To Be Shipped"}),
            search.createColumn({name: "custbody_anc_carrier", label: "Carrier(vendor)"}),
            search.createColumn({name: "custbody_anc_vehicleno", label: "Vehicle Number"}),
            search.createColumn({name: "custbody_anc_trackingno", label: "Tracking No"}),
            search.createColumn({name: "line", label: "Line ID"}),
            search.createColumn({name: "linesequencenumber", label: "Line Sequence Number"}),
            search.createColumn({name: "lineuniquekey", label: "Line Unique Key"}),
            search.createColumn({name: "quantity", label: "Quantity"}),
            search.createColumn({name: "statusref", label: "Status"}),
            search.createColumn({name: "custbody_anc_sostatus", label: "Status (?)"}),
            search.createColumn({name: "custcol_anc_status", label: "Status"}),
            search.createColumn({name: "custbody_anc_loadingefficiency", label: "Loading Efficiency"}),
            search.createColumn({name: "custbody_anc_deliverydate", label: "Delivery Date"}),
            search.createColumn({
                name: "custbody_anc_shipment_leg",
                label: "Leg"
            }),
            search.createColumn({
                name: "city",
                join: "location",
                label: "City_orig"
            }),
            search.createColumn({
                name: "custrecord_anc_lane_destinationcity",
                join: "custbody_anc_lane",
                label: "City"
            }),
            search.createColumn({name: "custbody_anc_usecrossdock", label: "Use Crossdock?"}),
            search.createColumn({name: "custbody_anc_shipstatus", label: "Ship Status"}),
            search.createColumn({name: "custbody_anc_shipdate", label: "Ship Date"}),
            search.createColumn({name: "custbody_anc_equipment", label: "Equipment"}),
            search.createColumn({name: "custbody_anc_needsrebuild", label: "Needs Rebuild"}),
            search.createColumn({name: "custbody_anc_jointloadnumber", label: "Joint Load Number"}),
            search.createColumn({name: "custbody_anc_transportmode", label: "Transport Mode"}),
            search.createColumn({
                name: "formulanumeric",
                formula: "NVL({custbody_consignee.internalid}, {custbody_ns_consignee.internalid})",
                label: "Cust.Consignee"
            }),
            search.createColumn({
                name: "formulatext",
                formula: "NVL({custbody_consignee}, {custbody_ns_consignee})",
                label: "Cust.Consignee_text"
            })
        ]

        function addElements(scriptContext)
        {
            try
            {
                form = serverWidget.createForm({
                    title : "Load Planning",
                    hideNavBar : false
                });

                form.addField({
                    id : "custpage_anc_filterby_customer",
                    type : "select",
                    label : "Filter By Customer",
                    source : "customer"
                })

                form.addSubmitButton({
                    id : `custpage_button_lp_submit`,
                    label : `Reprocess`
                })

                form.addButton({
                    id : `custpage_button_lp_sendtotender`,
                    label : `Send to Tender`,
                    functionName : `alert('send to tender, refresh the page, because of sync this is not realtime and same data can show up again, may have to flag it or wait integ to finish, its a list so runtime is dependent on the size of the ist')`
                })


                form.addTab({
                    id : `custpage_subtab_lp_tab1`,
                    label : `Planning for Exception`,
                })

                //input
                sublistObj1 = form.addSublist({
                    type : "list",
                    id : "custpage_subtab_lp_sublist1",
                    tab : "custpage_subtab_lp_tab1",
                    label : `Planning Exception`
                })


                sublistObj1.addField({
                    type : "Checkbox",
                    id : "custpage_fld_lp_select",
                    label : `Select`,
                    // source : ""
                })
                sublistObj1.addField({
                    type : "Select",
                    id : "custpage_fld_lp_shipment1",
                    label : `Shipment No`,
                    source : "customsale_anc_shipment",
                    sourceSearchCol : "internalid"
                }).updateDisplayType({
                    displayType : "disabled"
                })


                sublistObj1.addField({
                    type : "select",
                    id : "custpage_fld_lp_custconsignee",
                    source : "customrecord_alberta_ns_consignee_record",
                    label : `Cust.Consignee`,
                }).updateDisplayType({
                    displayType : "disabled"
                })


                sublistObj1.addField({
                    type : "text",
                    id : "custpage_fld_lp_jointloadnumber",
                    label : `Joint Load #`,
                })/*.updateDisplayType({
                    displayType : "disabled"
                })*/

                sublistObj1.addField({
                    type : "integer",
                    id : "custpage_fld_lp_shipmentleg1",
                    label : `Leg`,
                    // source : ""
                })

                sublistObj1.addField({
                    type : "text",
                    id : "custpage_fld_lp_origin1",
                    label : `Origin`,
                    // source : ""
                })

                sublistObj1.addField({
                    type : "text",
                    id : "custpage_fld_lp_destination1",
                    label : `Destination`,
                    // source : ""
                })
                sublistObj1.addField({
                    type : "percent",
                    id : "custpage_fld_lp_loadefficiency1",
                    label : `Loading Efficiency`,
                    // source : ""
                }).updateDisplayType({
                    displayType : "inline"
                })
                sublistObj1.addField({
                    type : "Select",
                    id : "custpage_fld_lp_status1",
                    label : `Ship Status`,
                    source : "customlist_anc_shipstatus"
                }).updateDisplayType({
                    displayType : "inline"
                })

                sublistObj1.addField({
                    type : "date",
                    id : "custpage_fld_lp_deldate1",
                    label : `Delivery Date`,
                    // source : ""
                })
                //08132025MT add new fields
                sublistObj1.addField({
                    type : "date",
                    id : "custpage_fld_lp_shipdate1",
                    label : `Ship Date`,
                }).updateDisplayType({
                    displayType : "inline"
                })
                sublistObj1.addField({
                    type : "Select",
                    id : "custpage_fld_lp_transportmode",
                    label : `Transport Mode`,
                    source : "customlist_anc_transportmode" //TODO
                }).updateDisplayType({
                    displayType : "inline"
                })
                sublistObj1.addField({
                    type : "Select",
                    id : "custpage_fld_lp_equipment1",
                    label : `Equipment`,
                    source : ANC_lib.references.RECTYPES.equipment.id
                }).updateDisplayType({
                    displayType : "inline"
                })

                sublistObj1.addField({
                    type : "Checkbox",
                    id : "custpage_fld_lp_crossdockelig1",
                    label : `Cross Dock Eligible`,
                    // source : ""
                }).updateDisplayType({
                    displayType : "hidden"
                })



                sublistObj1.addField({
                    type : "Checkbox",
                    id : "custpage_fld_lp_needsrebuild1",
                    label : `Needs Rebuild`,
                    // source : ""
                }).updateDisplayType({
                    displayType : "inline"
                })


                var sqlResults1 = [];

                var shipment_search_list1 = search.create({
                    type : "customsale_anc_shipment",
                    filters : [
                        ["mainline", "is", true],
                        "AND",
                        ["custbody_anc_tobedeletedduetodecons", "is", false],
                        "AND",
                        ["custbody_anc_shipstatus", "anyof", [7]],
                        "AND",
                        ["datecreated","onorafter","yesterday"],
                        // "AND",
                        // ["internalid", "anyof", 61264854],
                    ],
                    columns : shipmentCols
                })

                shipment_search_list1.run().each(function(result){
                    var resultObj = {};
                    var searchCols = shipment_search_list1.columns;
                    for(var a = 0 ; a < searchCols.length ; a++){
                        var searchCol = searchCols[a]
                        resultObj[searchCol.label] = {
                            val : result.getValue(searchCol),
                            txt : result.getText(searchCol)
                        }
                    }
                    sqlResults1.push(resultObj);

                    return true;
                })

                log.debug("sqlResults1", sqlResults1);


                for(var a = 0 ; a < sqlResults1.length; a++)
                {
                    var sr = sqlResults1[a];
                    sublistObj1.setSublistValue({
                        id : "custpage_fld_lp_shipment1",
                        line : a,
                        value : sr.internalid.val
                    });
                    sr["Joint Load Number"].val ? sublistObj1.setSublistValue({
                        id : "custpage_fld_lp_jointloadnumber",
                        line : a,
                        value : sr["Joint Load Number"].val
                    }) : "";
                    sr["Cust.Consignee"].val ? sublistObj1.setSublistValue({
                        id : "custpage_fld_lp_custconsignee",
                        line : a,
                        value : sr["Cust.Consignee"].val
                    }) : "";
                    sr["Transport Mode"].val ? sublistObj1.setSublistValue({
                        id : "custpage_fld_lp_transportmode",
                        line : a,
                        value : sr["Transport Mode"].val
                    }) : "";
                    sr["Leg"].val ? sublistObj1.setSublistValue({
                        id : "custpage_fld_lp_shipmentleg1",
                        line : a,
                        value : sr["Leg"].val
                    }) : "";
                    sr["City_orig"].val ? sublistObj1.setSublistValue({
                        id : "custpage_fld_lp_origin1",
                        line : a,
                        value : sr["City_orig"].val
                    }) : "";
                    sr["City"].val ? sublistObj1.setSublistValue({
                        id : "custpage_fld_lp_destination1",
                        line : a,
                        value : sr["City"].val
                    }) : "";

                    // log.debug(`sqlResults1 sr`, sr)
                    sr["Delivery Date"].val ? sublistObj1.setSublistValue({
                        id : "custpage_fld_lp_deldate1",
                        line : a,
                        value : sr["Delivery Date"].val
                    }) : "";

                    sr["Loading Efficiency"].val ? sublistObj1.setSublistValue({
                        id : "custpage_fld_lp_loadefficiency1",
                        line : a,
                        value : sr["Loading Efficiency"].val
                    }) : "";

                    sr["Ship Status"].val ? sublistObj1.setSublistValue({
                        id : "custpage_fld_lp_status1",
                        line : a,
                        value : sr["Ship Status"].val
                    }) : "";
                    sr["Use Crossdock?"].val && sr["Use Crossdock?"].val != "F" ? sublistObj1.setSublistValue({
                        id : "custpage_fld_lp_crossdockelig1",
                        line : a,
                        value : "T"
                    }) : "";
                    sr["Needs Rebuild"].val && sr["Needs Rebuild"].val != "F" ? sublistObj1.setSublistValue({
                        id : "custpage_fld_lp_needsrebuild1",
                        line : a,
                        value : "T"
                    }) : "";

                    //08132025MT add new fields, and populate value for display
                    sr["Ship Date"].val ? sublistObj1.setSublistValue({
                        id : "custpage_fld_lp_shipdate1",
                        line : a,
                        value : sr["Ship Date"].val
                    }) : "";
                    sr["Equipment"].val ? sublistObj1.setSublistValue({
                        id : "custpage_fld_lp_equipment1",
                        line : a,
                        value : sr["Equipment"].val
                    }) : "";
                }



                scriptContext.response.writePage({
                    pageObj : form,
                    pageObject : form
                })
            }
            catch(e)
            {
                log.error("ERROR in function loadPlanningUi", e)
            }
        }

        return {onRequest}

    });
