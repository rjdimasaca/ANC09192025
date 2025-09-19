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
define(['N/https', 'N/record', 'N/runtime', 'N/ui/serverWidget', 'N/url', 'N/search', 'N/ui/serverWidget'],
    /**
 * @param{https} https
 * @param{record} record
 * @param{runtime} runtime
 * @param{serverWidget} serverWidget
 * @param{url} url
 */
    (https, record, runtime, serverWidget, url, search, uiSw) => {

        var globalrefs = {};var fitmentLineLimit = 1;
        var allowMultiGrade = true;
        var DEBUGMODE = false;
        var accountId = "";
        var form = "";

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
                if(scriptContext.type == "view" || scriptContext.type == "edit")
                {
                    log.debug("scriptContext", scriptContext)
                    form = scriptContext.form;
                    addElements(scriptContext);
                }
            }
            catch(e)
            {
                log.error("ERROR in function beforeLoad", e)
            }
        }

        var srGroupedByDeliveryDate = {};
        const addElements = (scriptContext) => {
            try
            {

                var filters = [
                    // ["type","anyof","customrecord_anc_fitmentchecklines"],
                    // "AND",
                    ["custrecord_anc_fitmentcheckl_parent","anyof",scriptContext.newRecord.id],
                ];

                // globalrefs.tranBodyVals.location
                // globalrefs.tranItemVals.deliverydate
                // globalrefs.tranItemVals.destination

                log.debug("filters", filters)

                var salesorderSearchObj = search.create({
                    type: "customrecord_anc_fitmentchecklines",
                    filters: filters,
                    columns:
                        [
                            search.createColumn({join: "custrecord_anc_fitmentcheckl_parent", name: "internalid", label: "parent_internalid"}),
                            // search.createColumn({name: "statusref", label: "status"}),
                            // search.createColumn({name: "mainname", label: "entity"}),
                            search.createColumn({name: "custrecord_anc_fitmentcheckl_item", label: "line_item"}),
                            search.createColumn({name: "custrecord_anc_fitmentcheckl_deldate", label: "line_deliverydate"}),
                            // search.createColumn({
                            //     name: "parent",
                            //     join: "item",
                            //     label: "line_item_parent"
                            // }),
                            // search.createColumn({
                            //     name: "cseg1",
                            //     join: "item",
                            //     label: "line_item_grade"
                            // }),
                            // search.createColumn({name: "quantity", label: "line_quantity"}),
                            // search.createColumn({name: "location", label: "line_location"}),
                            // search.createColumn({name: "line", label: "line_id"}),
                            // search.createColumn({name: "linesequencenumber", label: "line_sequencenumber"}),
                            // search.createColumn({name: "lineuniquekey", label: "line_uniquekey"}),
                            // search.createColumn({name: "custcol_svb_vend_bill_lineno", label: "line_number"}),
                            // search.createColumn({name: "custcol_010linememoinstruction", label: "line_memo"}),
                            // //TODO you dont need it as result, only as filter, you need to join to line
                            // // search.createColumn({name: "line.cseg_anc_dstnation", label: "line_memo"}),
                            // search.createColumn({name: "custcol_anc_lxpert_loadreservedqty", label: "line_reservedqty"}),
                            // search.createColumn({name: "custcol_anc_lxpert_loadreservedwt", label: "line_reservedweight"}),
                            // search.createColumn({name: "custcol_anc_deliverydate", label: "line_deliverydate"}),
                        ]
                });
                var searchResultCount = salesorderSearchObj.runPaged().count;
                log.debug("salesorderSearchObj result count",searchResultCount);
                // salesorderSearchObj.run().each(function(result){
                //     // .run().each has a limit of 4,000 results
                //     return true;
                // });

                var sr = getResults(salesorderSearchObj.run());

                var srToObjects = sr.map(function(res){
                    // var res = sr[a];

                    var columns = res.columns;

                    var resObjByColumnKey = {}
                    columns.forEach(function(column) {
                        var label = column.label || column.name; // Fallback to name if label is unavailable
                        var value = res.getValue(column);
                        var text = res.getText(column);

                        resObjByColumnKey[label + "text"] = text;

                        // if(label == "line_deliverydate")
                        // {
                        //     resObjByColumnKey.line_deliverydatetext = res.getText(column);
                        // }

                        resObjByColumnKey[label] = value;
                    });

                    resObjByColumnKey.id = res.id

                    return resObjByColumnKey;
                })
                log.debug("srToObjects", srToObjects)

                srGroupedByDeliveryDate = groupBy(srToObjects, "line_deliverydate")
                log.debug("srGroupedByDeliveryDate", srGroupedByDeliveryDate)


                var a = 0;
                var fitmentchekl_tab = form.addTab({
                    id : "custpage_fitmentchekl_tab",
                    label : "Grouped Results"
                })
                for(var date in srGroupedByDeliveryDate)
                {
                    var multiGradeIndex = 0;

                    var uiSublistId = "custpage_sublist_fitmentcheck" + a;
                    var fitmentCheckSublistLabel = "Fitment Check:" + toMDY_text(date);

                    var subtab_date_id = "custpage_fitmentchekl_subtab" + a
                    var fitmentchekl_tab = form.addSubtab({
                        id : subtab_date_id,
                        label : toMDY_text(date),
                        tab : "custpage_fitmentchekl_tab"
                    })

                    var fitmentReservationSublist = form.addSublist({
                        label : fitmentCheckSublistLabel,
                        type : "LIST",
                        id : uiSublistId,
                        container : subtab_date_id,
                        tab : subtab_date_id
                    });
                    globalrefs["fitmentReservationSublist"] = fitmentReservationSublist;

                    var fitmentcbField = fitmentReservationSublist.addField({
                        label : "SELECT",
                        type : "checkbox",
                        id : "custpage_col_ifr_cb",
                    }).updateDisplayType({
                        displayType : uiSw.FieldDisplayType.ENTRY
                    });
                    fitmentcbField.defaultValue = "T";
                    globalrefs["fitmentcbField"] = fitmentcbField;


                    var fitmentlinedeliverydaeField = fitmentReservationSublist.addField({
                        label : "Line Delivery Date",
                        type : "date",
                        id : "custpage_col_ifr_line_deliverydate",
                    }).updateDisplayType({
                        displayType : uiSw.FieldDisplayType.INLINE
                    });
                    globalrefs["fitmentlinedeliverydaeField"] = fitmentlinedeliverydaeField;

                    //RESERVE BY QUANTITY
                    var fitmentorderqtyField = fitmentReservationSublist.addField({
                        label : "Order Qty",
                        type : "float",
                        id : "custpage_col_ifr_orderqty",
                    }).updateDisplayType({
                        displayType : uiSw.FieldDisplayType.INLINE
                    });
                    globalrefs["fitmentorderqtyField"] = fitmentorderqtyField;
                    var fitmentreservedqtyField = fitmentReservationSublist.addField({
                        label : "Reserved Qty",
                        type : "integer",
                        id : "custpage_col_ifr_reservedqty",
                    }).updateDisplayType({
                        displayType : uiSw.FieldDisplayType.INLINE
                    });
                    // fitmentinputqtyField.defaultValue = globalrefs.tranItemVals.quantity
                    globalrefs["fitmentreservedqtyField"] = fitmentreservedqtyField;
                    var fitmentinputqtyField = fitmentReservationSublist.addField({
                        label : "Fitment Reservation Qty",
                        type : "float",
                        id : "custpage_col_ifr_inputqty",
                    }).updateDisplayType({
                        displayType : uiSw.FieldDisplayType.ENTRY
                    });
                    // fitmentinputqtyField.defaultValue = globalrefs.tranItemVals.quantity
                    globalrefs["fitmentorderqtyField"] = fitmentinputqtyField;

                    //RESERVE BY WEIGHT
                    var fitmentorderweightField = fitmentReservationSublist.addField({
                        label : "Order Weight",
                        type : "float",
                        id : "custpage_col_ifr_orderweight",
                    }).updateDisplayType({
                        displayType : uiSw.FieldDisplayType.INLINE
                    });
                    // fitmentorderqtyField.defaultValue = globalrefs.tranItemVals.weight
                    globalrefs["fitmentorderweightField"] = fitmentorderweightField;
                    var fitmentreservedweightField = fitmentReservationSublist.addField({
                        label : "Reserved Weight",
                        type : "float",
                        id : "custpage_col_ifr_reservedweight",
                    }).updateDisplayType({
                        displayType : uiSw.FieldDisplayType.INLINE
                    });
                    // fitmentorderqtyField.defaultValue = globalrefs.tranItemVals.weight
                    globalrefs["fitmentreservedweightField"] = fitmentreservedweightField;
                    var fitmentinputweightField = fitmentReservationSublist.addField({
                        label : "Fitment Reservation Weight",
                        type : "float",
                        id : "custpage_col_ifr_inputweight",
                    }).updateDisplayType({
                        displayType : uiSw.FieldDisplayType.ENTRY
                    });
                    // fitmentinputqtyField.defaultValue = globalrefs.tranItemVals.weight
                    globalrefs["fitmentinputweightField"] = fitmentinputweightField;


                    var fitmenttietolineField = fitmentReservationSublist.addField({
                        label : "Tied to Line",
                        type : "integer",
                        id : "custpage_ifr_tietoline",
                    }).updateDisplayType({
                        displayType : uiSw.FieldDisplayType.HIDDEN
                    })
                    globalrefs["fitmenttietolineField"] = fitmenttietolineField;
                    var fitmentsolinerefField = fitmentReservationSublist.addField({
                        label : "{SO#}_{LINEREF}",
                        type : "text",
                        id : "custpage_ifr_solineref",
                    }).updateDisplayType({
                        displayType : uiSw.FieldDisplayType.HIDDEN
                    })
                    globalrefs["fitmentsolinerefField"] = fitmentsolinerefField;
                    var fitmentsoField = fitmentReservationSublist.addField({
                        label : "SO#",
                        type : "select",
                        id : "custpage_ifr_so",
                        source : "salesorder"
                    }).updateDisplayType({
                        displayType : uiSw.FieldDisplayType.INLINE
                    })
                    globalrefs["fitmentsoField"] = fitmentsoField;
                    var fitmentlinerefField = fitmentReservationSublist.addField({
                        label : "Line Ref",
                        type : "text",
                        id : "custpage_ifr_lineref",
                    }).updateDisplayType({
                        displayType : uiSw.FieldDisplayType.INLINE
                    })
                    globalrefs["fitmentlinerefField"] = fitmentlinerefField;

                    var fitmentitemField = fitmentReservationSublist.addField({
                        label : "Grade / Item",
                        type : "select",
                        id : "custpage_ifr_item",
                        source : "item",
                    }).updateDisplayType({
                        displayType : uiSw.FieldDisplayType.INLINE
                    })
                    globalrefs["fitmentitemField"] = fitmentitemField;

                    var fitmentequipmentField = fitmentReservationSublist.addField({
                        label : "Equipment",
                        type : "text",
                        id : "custpage_col_ifr_equipment",
                    }).updateDisplayType({
                        displayType : uiSw.FieldDisplayType.INLINE
                    })
                    globalrefs["fitmentequipmentField"] = fitmentequipmentField;

                    var fitmentlocationField = fitmentReservationSublist.addField({
                        label : "Origin",
                        type : "select",
                        id : "custpage_ifr_location",
                        source : "location"
                    }).updateDisplayType({
                        displayType : uiSw.FieldDisplayType.HIDDEN
                    })
                    globalrefs["fitmentlocationField"] = fitmentlocationField;

                    var fitmentloadidField = fitmentReservationSublist.addField({
                        label : "Load Id",
                        type : "text",
                        id : "custpage_ifr_loadid",
                    }).updateDisplayType({
                        displayType : uiSw.FieldDisplayType.INLINE
                    })
                    globalrefs["fitmentloadidField"] = fitmentloadidField;

                    var fitmentloadnumField = fitmentReservationSublist.addField({
                        label : "Load#",
                        type : "text",
                        id : "custpage_ifr_loadnum",
                    }).updateDisplayType({
                        displayType : uiSw.FieldDisplayType.INLINE
                    })
                    globalrefs["fitmentloadnumField"] = fitmentloadnumField;

                    var fitmentweightplanned = fitmentReservationSublist.addField({
                        label : "Weight Planned",
                        type : "text",
                        id : "custpage_ifr_weightplanned",
                    }).updateDisplayType({
                        displayType : uiSw.FieldDisplayType.INLINE
                    })
                    globalrefs["fitmentweightplanned"] = fitmentweightplanned;

                    var fitmentpercentageField = fitmentReservationSublist.addField({
                        label : "Percentage",
                        type : "percent",
                        id : "custpage_ifr_percentage",
                    }).updateDisplayType({
                        displayType : uiSw.FieldDisplayType.INLINE
                    })
                    globalrefs["fitmentpercentageField"] = fitmentpercentageField;


                    var deliveryDateGroup = srGroupedByDeliveryDate[date];
                    for(var c = 0 ; c < deliveryDateGroup.length ; c++)
                    {
                        var resObjByColumnKey = deliveryDateGroup[c]
                        var fitmentResponse = getFitmentResponse(scriptContext);

                        var firstSoRefLineIndex = (multiGradeIndex || 0);
                        for(var b = 0; b < fitmentLineLimit; b++)
                        {
                            if(b == 0)
                            {
                                fitmentReservationSublist.setSublistValue({
                                    id : "custpage_ifr_tietoline",
                                    line : multiGradeIndex || b,
                                    value : (multiGradeIndex || b)+1
                                })
                            }
                            else if(b > 0)
                            {
                                fitmentReservationSublist.setSublistValue({
                                    id : "custpage_ifr_tietoline",
                                    line : multiGradeIndex || b,
                                    value : firstSoRefLineIndex
                                })
                            }
                            if(resObjByColumnKey.internalid)
                            {
                                fitmentReservationSublist.setSublistValue({
                                    id : "custpage_ifr_so",
                                    line : multiGradeIndex || b,
                                    value : resObjByColumnKey.internalid
                                })
                            }

                            log.debug("resObjByColumnKey.line_deliverydate", resObjByColumnKey.line_deliverydate);
                            if(resObjByColumnKey.line_deliverydate)
                            {
                                fitmentReservationSublist.setSublistValue({
                                    id : "custpage_col_ifr_line_deliverydate",
                                    line : multiGradeIndex || b,
                                    value : /*"03/03/2025"*/resObjByColumnKey.line_deliverydate
                                })
                            }

                            //FILL BY ORDER QTY
                            if(resObjByColumnKey.line_quantity)
                            {
                                fitmentReservationSublist.setSublistValue({
                                    id : "custpage_col_ifr_orderqty",
                                    line : multiGradeIndex || b,
                                    value : resObjByColumnKey.line_quantity
                                })
                            }
                            if(resObjByColumnKey.line_quantity)
                            {
                                fitmentReservationSublist.setSublistValue({
                                    id : "custpage_col_ifr_reservedqty",
                                    line : multiGradeIndex || b,
                                    value : (resObjByColumnKey.line_reservedqty || 0)
                                })
                            }
                            if(resObjByColumnKey.line_quantity)
                            {
                                fitmentReservationSublist.setSublistValue({
                                    id : "custpage_col_ifr_inputqty",
                                    line : multiGradeIndex || b,
                                    value : resObjByColumnKey.line_quantity - (resObjByColumnKey.line_reservedqty || 0)
                                })
                            }

                            //FILL BY ORDER WEIGHT
                            if(resObjByColumnKey.line_quantity)
                            {
                                fitmentReservationSublist.setSublistValue({
                                    id : "custpage_col_ifr_orderweight",
                                    line : multiGradeIndex || b,
                                    value : resObjByColumnKey.line_quantity
                                })
                            }
                            if(resObjByColumnKey.line_quantity)
                            {
                                fitmentReservationSublist.setSublistValue({
                                    id : "custpage_col_ifr_reservedweight",
                                    line : multiGradeIndex || b,
                                    value : (resObjByColumnKey.line_reservedweight || 0)
                                })
                            }
                            if(resObjByColumnKey.line_quantity)
                            {
                                fitmentReservationSublist.setSublistValue({
                                    id : "custpage_col_ifr_inputweight",
                                    line : multiGradeIndex || b,
                                    value : resObjByColumnKey.line_quantity - (resObjByColumnKey.line_reservedweight || 0)
                                })
                            }




                            if(resObjByColumnKey.line_id)
                            {
                                fitmentReservationSublist.setSublistValue({
                                    id : "custpage_ifr_lineref",
                                    line : multiGradeIndex || b,
                                    value : resObjByColumnKey.line_id
                                })
                            }
                            if(resObjByColumnKey.internalid && resObjByColumnKey.line_id)
                            {
                                fitmentReservationSublist.setSublistValue({
                                    id : "custpage_ifr_solineref",
                                    line : multiGradeIndex || b,
                                    value : resObjByColumnKey.internalid + "_" + resObjByColumnKey.line_id
                                })
                            }
                            if(resObjByColumnKey.line_item)
                            {
                                fitmentReservationSublist.setSublistValue({
                                    id : "custpage_ifr_item",
                                    line : multiGradeIndex || b,
                                    value : resObjByColumnKey.line_item
                                })
                            }
                            if(resObjByColumnKey.line_location)
                            {
                                fitmentReservationSublist.setSublistValue({
                                    id : "custpage_ifr_location",
                                    line : multiGradeIndex || b,
                                    value : resObjByColumnKey.line_location
                                })
                            }

                            // loadid: "17424",
                            //     loadnumber: "4",
                            // weightplanned: "weight planned",
                            // percentage: "34.567"
                            if(fitmentResponse.list[b] && fitmentResponse.list[b].loadid)
                            {
                                fitmentReservationSublist.setSublistValue({
                                    id : "custpage_ifr_loadid",
                                    line : multiGradeIndex || b,
                                    value : fitmentResponse.list[b].loadid
                                })
                            }
                            if(fitmentResponse.list[b] && fitmentResponse.list[b].loadnumber)
                            {
                                fitmentReservationSublist.setSublistValue({
                                    id : "custpage_ifr_loadnum",
                                    line : multiGradeIndex || b,
                                    value : fitmentResponse.list[b].loadnumber
                                })
                            }
                            if(fitmentResponse.list[b] && fitmentResponse.list[b].weightplanned)
                            {
                                fitmentReservationSublist.setSublistValue({
                                    id : "custpage_ifr_weightplanned",
                                    line : multiGradeIndex || b,
                                    value : fitmentResponse.list[b].weightplanned
                                })
                            }
                            if(fitmentResponse.list[b] && fitmentResponse.list[b].percentage)
                            {
                                fitmentReservationSublist.setSublistValue({
                                    id : "custpage_ifr_percentage",
                                    line : multiGradeIndex || b,
                                    value : fitmentResponse.list[b].percentage
                                })
                            }
                            if(allowMultiGrade)
                            {
                                multiGradeIndex++;
                            }
                        }
                    }

                    a++;
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

        function getFitmentResponse(scriptContext)
        {
            var fitmentResponse = {
                list : []
            };
            try
            {
                var fitmentObj = {
                    loadid: "1",
                    loadnumber: "1",
                    weightplanned: "weight planned",
                    percentage: "10",
                };
                fitmentResponse.list.push(fitmentObj)

                var fitmentObj = {
                    loadid: "17424",
                    loadnumber: "4",
                    weightplanned: "weight planned",
                    percentage: "34.567",
                };
                fitmentResponse.list.push(fitmentObj)
            }
            catch(e)
            {
                log.error("ERROR in function getFitmentResponse", e);
            }
            return fitmentResponse;
        }

        var getResults = function getResults(set) {
            var holder = [];
            var i = 0;
            while (true) {
                var result = set.getRange({
                    start: i,
                    end: i + 1000
                });
                if (!result) break;
                holder = holder.concat(result);
                if (result.length < 1000) break;
                i += 1000;
            }
            return holder;
        };

        function groupBy(array, key) {
            return array.reduce(function (acc, obj) {
                let groupKey = obj[key];
                acc[groupKey] = acc[groupKey] || [];
                acc[groupKey].push(obj);
                return acc;
            }, {});
        }

        const toMDY = (dateVal) => {
            var retVal = dateVal;
            try
            {
                if(dateVal)
                {
                    retVal = new Date(retVal);
                }

            }
            catch(e)
            {
                log.error("ERROR in function toMDY", e)
            }
            log.debug("retVal", retVal)
            return retVal;
        }
        const toMDY_text = (dateVal) => {
            var retVal = dateVal;
            try
            {
                if(dateVal)
                {
                    retVal = new Date(retVal);

                    retVal = retVal.getMonth() + 1 + "/" + retVal.getDate() + "/" + retVal.getFullYear();
                }

            }
            catch(e)
            {
                log.error("ERROR in function toMDY", e)
            }
            log.debug("retVal", retVal)
            return retVal;
        }

        return {beforeLoad/*, beforeSubmit, afterSubmit*/}

    });
