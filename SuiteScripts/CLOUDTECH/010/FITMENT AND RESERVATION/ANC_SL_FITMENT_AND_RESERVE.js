/**
 * @NApiVersion 2.1
 * @NScriptType Suitelet
 * @NModuleScope SameAccount
 */
define(['N/record', 'N/runtime', 'N/search', 'N/url', 'N/ui/serverWidget'],
    /**
     * @param{runtime} runtime
     * @param{search} search
     * @param{url} url
     */
    (record, runtime, search, url, uiSw) => {

        var globalrefs = {};
        var orderLineLimit = 0;
        var fitmentLineLimit = 2;
        var allowMultiGrade = true;
        var DEBUGMODE = false;
        var accountId = "";

        var uiSublistId = "custpage_itemfitmentandreservation";

        const onRequest = (scriptContext) =>
        {
            accountId = runtime.accountId;
            try
            {
                if(accountId == "1116623-sb2" || accountId == "1116623-SB2" || accountId == "1116623_SB2" || accountId == "1116623_SB2")
                {
                    log.debug("SANDBOX");
                }
                else
                {
                    log.debug("NON SANDBOX");
                }

                if(scriptContext.request.method == "GET") {
                    var form = uiSw.createForm({
                        title: "FITMENT CHECK and RESERVATION",
                        hideNavBar: true
                    })

                    form.clientScriptModulePath = './ANC_CS_FITMENT_AND_RESERVE.js'

                    form.addFieldGroup({
                        id: "custpage_flgroup_source",
                        label: "Basis"
                    })

                    var tranRefField = form.addField({
                        label: "REF#",
                        type: "select",
                        id: "custpage_traninternalid",
                        source: "salesorder",
                        container: "custpage_flgroup_source"
                    })
                    tranRefField.defaultValue = scriptContext.request.parameters["traninternalid"]
                    tranRefField.updateDisplayType({
                        displayType: "inline"
                    });
                    globalrefs["tranRefField"] = tranRefField;


                    var tranRecObj = record.load({
                        type : "salesorder",
                        id : scriptContext.request.parameters["traninternalid"]
                    });
                    globalrefs.tranBodyVals = {};
                    globalrefs.tranItemVals = {};
                    globalrefs.tranBodyVals.trandate = tranRecObj.getText({
                        fieldId : "trandate"
                    })
                    globalrefs.tranBodyVals.location = tranRecObj.getValue({
                        fieldId : "location"
                    })
                    globalrefs.tranBodyVals.entity = tranRecObj.getValue({
                        fieldId : "entity"
                    })
                    if(scriptContext.request.parameters["tranlinenum"])
                    {
                        var index = tranRecObj.findSublistLineWithValue({
                            sublistId : "item",
                            fieldId : "line",
                            value : scriptContext.request.parameters["tranlinenum"]
                        })
                        globalrefs.tranItemVals.itemid = tranRecObj.getSublistValue({
                            sublistId : "item",
                            fieldId : "item",
                            line : index
                        })
                        globalrefs.tranItemVals.quantity = tranRecObj.getSublistValue({
                            sublistId : "item",
                            fieldId : "quantity",
                            line : index
                        })
                        globalrefs.tranItemVals.deliverydate = tranRecObj.getText({
                            fieldId : "trandate"
                        })
                        globalrefs.tranItemVals.destination = tranRecObj.getSublistText({
                            sublistId : "item",
                            fieldId : "cseg_anc_dstnation",
                            line : index
                        })
                        globalrefs.tranItemVals.destinationid = tranRecObj.getSublistValue({
                            sublistId : "item",
                            fieldId : "cseg_anc_dstnation",
                            line : index
                        })
                    }

                    log.debug("globalrefs", globalrefs)

                    //rest of the fields
                    if(globalrefs.tranBodyVals.entity)
                    {
                        var entityField = form.addField({
                            label : "Customer",
                            type : "select",
                            id : "custpage_trancustomer",
                            source : "customer",
                            container: "custpage_flgroup_source"
                        }).updateDisplayType({
                            displayType : "inline"
                        })
                        entityField.defaultValue = globalrefs.tranBodyVals.entity;
                        globalrefs["entityField"] = entityField;
                    }

                    var trandateField = form.addField({
                        label : "Date",
                        type : "date",
                        id : "custpage_trandate",
                        source : "item",
                        container: "custpage_flgroup_source"
                    }).updateDisplayType({
                        displayType : "inline"
                    })
                    trandateField.defaultValue = globalrefs.tranBodyVals.trandate;
                    globalrefs["trandateField"] = trandateField;

                    var tranlineseqField = form.addField({
                        label : "LINE SEQUENCE",
                        type : "integer",
                        id : "custpage_tranlineseq",
                        container: "custpage_flgroup_source"
                    }).updateDisplayType({
                        displayType : "inline"
                    })
                    tranlineseqField.defaultValue = scriptContext.request.parameters["tranlinesequence"]
                    globalrefs["tranlineseqField"] = tranlineseqField;

                    var tranlinenumField = form.addField({
                        label : "LINE#",
                        type : "integer",
                        id : "custpage_tranlinenum",
                        container: "custpage_flgroup_source"
                    }).updateDisplayType({
                        displayType : "inline"
                    })
                    tranlinenumField.defaultValue = scriptContext.request.parameters["tranlinenum"]
                    globalrefs["tranlinenumField"] = tranlinenumField;

                    if(globalrefs.tranItemVals.itemid)
                    {
                        var tranlineitemField = form.addField({
                            label : "LINE ITEM GRADE TO RESERVE",
                            type : "select",
                            id : "custpage_tranlineitem",
                            source : "item",
                            container: "custpage_flgroup_source"
                        }).updateDisplayType({
                            displayType : "inline"
                        })
                        tranlineitemField.defaultValue = globalrefs.tranItemVals.itemid;
                        globalrefs["tranlineitemField"] = tranlineitemField;
                    }

                    if(globalrefs.tranBodyVals.location)
                    {
                        var tranlinelocField = form.addField({
                            label : "LOCATION",
                            type : "select",
                            id : "custpage_tranlineloc",
                            source : "location",
                            container: "custpage_flgroup_source"
                        }).updateDisplayType({
                            displayType : "inline"
                        }).defaultValue = globalrefs.tranBodyVals.location
                        globalrefs["tranlinelocField"] = tranlinelocField;
                    }

                    var equipmentField = form.addField({
                        label : "Equipment",
                        type : "text",
                        id : "custpage_equipment",
                        container: "custpage_flgroup_source"
                    }).updateDisplayType({
                        displayType : "inline"
                    })
                    globalrefs["equipmentField"] = equipmentField;
                    if(globalrefs.tranBodyVals.equipment)
                    {
                        equipmentField.defaultValue = globalrefs.tranBodyVals.equipment
                    }

                    var tranlineqtyField = form.addField({
                        label : "LINE ITEM GRADE ORDER QUANTITY",
                        type : "float",
                        id : "custpage_tranlineqty",
                        container: "custpage_flgroup_source"
                    }).updateDisplayType({
                        displayType : "inline"
                    }).defaultValue = globalrefs.tranItemVals.quantity
                    globalrefs["tranlineqtyField"] = tranlineqtyField;

                    if(globalrefs.tranItemVals.deliverydate)
                    {
                        var tranlinedeldateField = form.addField({
                            label : "Delivery Date",
                            type : "date",
                            id : "custpage_tranlinedeldate",
                            container: "custpage_flgroup_source"
                        }).updateDisplayType({
                            displayType : "inline"
                        }).defaultValue = globalrefs.tranItemVals.deliverydate
                        globalrefs["tranlinedeldateField"] = tranlinedeldateField;
                    }

                    if(globalrefs.tranBodyVals.location)
                    {
                        var tranlineoriginField = form.addField({
                            label : "ORIGIN",
                            type : "select",
                            id : "custpage_tranlineorigin",
                            source : "location",
                            container: "custpage_flgroup_source"
                        }).updateDisplayType({
                            displayType : "inline"
                        }).defaultValue = globalrefs.tranBodyVals.location
                        globalrefs["tranlineoriginField"] = tranlineoriginField;
                    }

                    if(globalrefs.tranItemVals.destination)
                    {
                        var tranlinedestField = form.addField({
                            label : "DESTINATION",
                            type : "text",
                            id : "custpage_tranlinedest",
                            container: "custpage_flgroup_source"
                        }).updateDisplayType({
                            displayType : "inline"
                        }).defaultValue = globalrefs.tranItemVals.destination
                        globalrefs["tranlinedestField"] = tranlinedestField;
                    }

                    var fitmentReservationSublist = form.addSublist({
                        label : "Fitment Check Results",
                        type : "LIST",
                        id : uiSublistId,
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


                    //RESERVE BY QUANTITY
                    var fitmentorderqtyField = fitmentReservationSublist.addField({
                        label : "Order Qty",
                        type : "integer",
                        id : "custpage_col_ifr_orderqty",
                    }).updateDisplayType({
                        displayType : uiSw.FieldDisplayType.INLINE
                    });
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
                        type : "integer",
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

                    fillSublist(scriptContext, fitmentReservationSublist)

                    form.addSubmitButton({
                        label : "Submit Reservation"
                    })

                    scriptContext.response.writePage(form);
                }
                else
                {
                    log.debug("POST, Submitted", scriptContext);
                    var tranInternalid = scriptContext.request.parameters.custpage_traninternalid;
                    var tranLinenum = scriptContext.request.parameters.custpage_tranlinenum;

                    var lineCount = scriptContext.request.getLineCount({
                        group : uiSublistId
                    });
                    log.debug("lineCount", lineCount);

                    var tranObj = record.load({
                        type : "salesorder",
                        id : tranInternalid,
                        isDynamic : true
                    });

                    // custpage_col_ifr_inputqty
                    // custpage_col_ifr_cb
                    // custpage_ifr_weightplanned
                    // custpage_ifr_percentage
                    // custpage_ifr_loadnum
                    // custpage_ifr_loadid
                    for(var a = 0 ; a < lineCount ; a++)
                    {
                        var lineValues = {};
                        lineValues["custpage_col_ifr_cb"] = scriptContext.request.getSublistValue({
                            group: uiSublistId,
                            name : "custpage_col_ifr_cb",
                            line : a
                        })
                        if(lineValues["custpage_col_ifr_cb"] && lineValues["custpage_col_ifr_cb"] != "F")
                        {
                            lineValues["custpage_col_ifr_inputqty"] = scriptContext.request.getSublistValue({
                                group: uiSublistId,
                                name : "custpage_col_ifr_inputqty",
                                line : a
                            })
                            lineValues["custpage_ifr_weightplanned"] = scriptContext.request.getSublistValue({
                                group: uiSublistId,
                                name : "custpage_ifr_weightplanned",
                                line : a
                            })
                            lineValues["custpage_ifr_percentage"] = scriptContext.request.getSublistValue({
                                group: uiSublistId,
                                name : "custpage_ifr_percentage",
                                line : a
                            })
                            lineValues["custpage_ifr_loadnum"] = scriptContext.request.getSublistValue({
                                group: uiSublistId,
                                name : "custpage_ifr_loadnum",
                                line : a
                            })
                            lineValues["custpage_ifr_loadid"] = scriptContext.request.getSublistValue({
                                group: uiSublistId,
                                name : "custpage_ifr_loadid",
                                line : a
                            })

                            log.debug("lineValues", lineValues)
                            // nlapiLoadRecord(nlapiGetRecordType(), nlapiGetRecordId()).getLineItemValue("item", "line", 3)
                            // {"custpage_col_ifr_cb":"T","custpage_col_ifr_inputqty":"1","custpage_ifr_weightplanned":"weight planned","custpage_ifr_percentage":"34.567","custpage_ifr_loadnum":"4","custpage_ifr_loadid":"17424"}
                            var targetIndex = tranObj.findSublistLineWithValue({
                                sublistId : "item",
                                fieldId : "line",
                                value : tranLinenum
                            })
                            log.debug("POST tranLinenum", tranLinenum)
                            tranObj.selectLine({
                                sublistId : "item",
                                line : targetIndex
                            })
                            log.debug("POST targetIndex", targetIndex)
                            tranObj.setCurrentSublistValue({
                                sublistId : "item",
                                fieldId : "custcol_anc_lxpert_loadweightplanned",
                                line : targetIndex,
                                value : lineValues["custpage_ifr_weightplanned"]
                            })
                            tranObj.setCurrentSublistValue({
                                sublistId : "item",
                                fieldId : "custcol_anc_lxpert_loadscount",
                                line : targetIndex,
                                value : lineValues["custpage_ifr_loadnum"]
                            })
                            tranObj.setCurrentSublistValue({
                                sublistId : "item",
                                fieldId : "custcol_anc_lxpert_lastloadutilrate",
                                line : targetIndex,
                                value : lineValues["custpage_ifr_percentage"]
                            })
                            tranObj.setCurrentSublistValue({
                                sublistId : "item",
                                fieldId : "custcol_anc_lxpert_loadreservedqty",
                                line : targetIndex,
                                value : lineValues["custpage_col_ifr_inputqty"]
                            })
                            log.debug("before commit")
                            tranObj.commitLine({
                                sublistId : "item",
                            })
                            log.debug("after commit")
                        }
                    }
                    var submittedRecId = tranObj.save({
                        ignoreMandatoryFeilds : true,
                        enableSourcing : true
                    });
                    log.debug("submittedRecId", submittedRecId);

                }
            }
            catch(e)
            {
                log.error("ERROR in function onRequest", e);
            }
        }

        function getInputDetails(scriptContext, fitmentReservationSublist)
        {
            try
            {
                var filters = [
                    ["type","anyof","SalesOrd"],
                    "AND",
                    ["mainline","is","F"],
                    "AND",
                    ["taxline","is","F"],
                ];


                // globalrefs.tranBodyVals.location
                // globalrefs.tranItemVals.deliverydate
                // globalrefs.tranItemVals.destination
                if(globalrefs.tranBodyVals.location)
                {
                    filters.push("AND")
                    filters.push(["location","anyof",globalrefs.tranBodyVals.location])
                }
                if(globalrefs.tranItemVals.deliverydate)
                {
                    filters.push("AND")
                    filters.push(["trandate","on",globalrefs.tranItemVals.deliverydate])
                }
                if(globalrefs.tranItemVals.destinationid)
                {
                    filters.push("AND")
                    filters.push(["line.cseg_anc_dstnation","anyof",globalrefs.tranItemVals.destinationid])
                }

                log.debug("filters", filters)

                var salesorderSearchObj = search.create({
                    type: "salesorder",
                    settings:[{"name":"consolidationtype","value":"ACCTTYPE"}],
                    filters: filters,
                    columns:
                        [
                            search.createColumn({name: "internalid", label: "internalid"}),
                            search.createColumn({name: "statusref", label: "status"}),
                            search.createColumn({name: "mainname", label: "entity"}),
                            search.createColumn({name: "item", label: "line_item"}),
                            search.createColumn({
                                name: "parent",
                                join: "item",
                                label: "line_item_parent"
                            }),
                            search.createColumn({
                                name: "cseg1",
                                join: "item",
                                label: "line_item_grade"
                            }),
                            search.createColumn({name: "quantity", label: "line_quantity"}),
                            search.createColumn({name: "location", label: "line_location"}),
                            search.createColumn({name: "line", label: "line_id"}),
                            search.createColumn({name: "linesequencenumber", label: "line_sequencenumber"}),
                            search.createColumn({name: "lineuniquekey", label: "line_uniquekey"}),
                            search.createColumn({name: "custcol_svb_vend_bill_lineno", label: "line_number"}),
                            search.createColumn({name: "custcol_010linememoinstruction", label: "line_memo"}),
                            //TODO you dont need it as result, only as filter, you need to join to line
                            // search.createColumn({name: "line.cseg_anc_dstnation", label: "line_memo"}),
                            search.createColumn({name: "custcol_anc_lxpert_loadreservedqty", label: "line_reservedqty"}),
                            search.createColumn({name: "custcol_anc_lxpert_loadreservedwt", label: "line_reservedweight"}),
                        ]
                });
                var searchResultCount = salesorderSearchObj.runPaged().count;
                log.debug("salesorderSearchObj result count",searchResultCount);
                // salesorderSearchObj.run().each(function(result){
                //     // .run().each has a limit of 4,000 results
                //     return true;
                // });

                var sr = getResults(salesorderSearchObj.run());

                var multiGradeIndex = 0;
                for(var a = 0 ; a < sr.length ; a++)
                {
                    var res = sr[a];

                    var columns = res.columns;

                    var resObjByColumnKey = {}
                    columns.forEach(function(column) {
                        var label = column.label || column.name; // Fallback to name if label is unavailable
                        var value = res.getValue(column);
                        resObjByColumnKey[label] = value;
                    });

                    resObjByColumnKey.id = res.id
                    log.debug("resObjByColumnKey", resObjByColumnKey)

                    var fitmentResponse = getFitmentResponse(scriptContext);

                        // custpage_ifr_percentage
                        // custpage_ifr_weightplanned
                        // custpage_ifr_loadnum
                        // custpage_ifr_location

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

            }
            catch(e)
            {
                log.error("ERROR in function getInputDetails", e)
            }
        }

        function fillSublist(scriptContext, fitmentReservationSublist)
        {
            var inputDetails = getInputDetails(scriptContext, fitmentReservationSublist)


            // fitmentReservationSublist
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


        function groupBy(array, key) {
            return array.reduce(function (acc, obj) {
                let groupKey = obj[key];
                acc[groupKey] = acc[groupKey] || [];
                acc[groupKey].push(obj);
                return acc;
            }, {});
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

        function convertArrayToConcat(arr, headerquantity)
        {
            var str = "";
            var newArr = [];


            var newArr = arr.map(function(elem){
                return elem.itemQty / (headerquantity || 1) + "-" + elem.itemText
            })
            str = newArr.join(",")

            return str;
        }

        return {
            onRequest: onRequest
        };

    });



