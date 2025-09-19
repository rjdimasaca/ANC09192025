/**
 * @NApiVersion 2.1
 * @NScriptType Suitelet
 * @NModuleScope SameAccount
 */
define(['/SuiteScripts/ANC_lib.js', 'N/redirect', 'N/record', 'N/runtime', 'N/https', 'N/search', 'N/url', 'N/ui/serverWidget', 'N/task'],
    /**
     * @param{runtime} runtime
     * @param{search} search
     * @param{url} url
     */
    (ANC_lib, redirect, record, runtime, https, search, url, uiSw, task) => {

        var globalrefs = {
            tranBodyVals:{

            },
            tranItemVals:{

            }
        };

        var orderLineLimit = 0;
        var fitmentLineLimit = 1;
        var allowMultiGrade = true;
        var DEBUGMODE = false;
        var accountId = "";

        var processids = {};

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

                    if(scriptContext.request.parameters.processid == "prerelease")
                    {

                        triggerTargettedPreRelease(scriptContext.request.parameters.traninternalid);

                        return;
                    }

                    var tranRecObj = record.load({
                        type : "salesorder",
                        id : scriptContext.request.parameters["traninternalid"]
                    });
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

                        globalrefs.tranItemVals.line_item_parent = tranRecObj.getSublistValue({
                            sublistId : "item",
                            fieldId : "custcol_anc_grade",
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

                    processids = {
                        "prerelease":{
                            title : "Pre-Release Initiated",
                            noResultsSubmitButton : true,
                            doNotRefresh : true
                        },
                        "confirm":{
                            title : "Confirm",
                            noResultsSubmitButton : true,
                            doNotRefresh : true,
                            refreshSourceWindow : true,
                            autoClose : true
                        },
                        "fitmentcheck" : {
                            apiEndPoint : true,
                            title : "Fitment Check",
                        },
                    }

                    var form = uiSw.createForm({
                        title: processids[scriptContext.request.parameters.processid].title,
                        hideNavBar: true
                    })

                    form.clientScriptModulePath = './ANC_CS_SALES_PROCESSES.js'



                    if(scriptContext.request.parameters.processid == "confirm")
                    {
                        var submittedRecId = record.submitFields({
                            type : "salesorder",
                            id : scriptContext.request.parameters.traninternalid,
                            values : {
                                orderstatus : "B",
                                custbody_anc_sostatus : 2
                            }
                        })
                        log.debug("processid=confirm submittedRecId", submittedRecId);
                    }

                    if(processids[scriptContext.request.parameters.processid].refreshSourceWindow)
                    {
                        var doNotRefreshFlagField = form.addField({
                            id : "custpage_anc_refreshsourcewindow",
                            type : "checkbox",
                            name : "custpage_anc_refreshsourcewindow",
                            label : "refresh source window"
                        });
                        doNotRefreshFlagField.defaultValue = 'T';
                        doNotRefreshFlagField.updateDisplayType({
                            displayType : "hidden"
                        })
                    }
                    if(processids[scriptContext.request.parameters.processid].autoClose)
                    {
                        var doNotRefreshFlagField = form.addField({
                            id : "custpage_anc_autoclose",
                            type : "checkbox",
                            name : "custpage_anc_autoclose",
                            label : "Do Not Refresh"
                        });
                        doNotRefreshFlagField.defaultValue = 'T';
                        doNotRefreshFlagField.updateDisplayType({
                            displayType : "hidden"
                        })
                    }



                    if(processids[scriptContext.request.parameters.processid].doNotRefresh)
                    {
                        var doNotRefreshFlagField = form.addField({
                            id : "custpage_anc_donotrefreshflag",
                            type : "checkbox",
                            name : "custpage_anc_donotrefreshflag",
                            label : "Do Not Refresh"
                        });
                        doNotRefreshFlagField.defaultValue = 'T';
                        doNotRefreshFlagField.updateDisplayType({
                            displayType : "hidden"
                        })
                    }


                    var buttons = processids[scriptContext.request.parameters.processid].buttons || [];
                    for(var a = 0 ; a < buttons.length ; a++)
                    {
                        var button = buttons[a]
                        form.addButton(button)
                    }



                    var fieldGroups = processids[scriptContext.request.parameters.processid].fieldGroups || [];
                    for(var a = 0 ; a < fieldGroups.length ; a++)
                    {
                        var fieldGroupObj = fieldGroups[a]
                        form.addFieldGroup(fieldGroupObj)
                    }
                    var fields = processids[scriptContext.request.parameters.processid].fields || [];
                    for(var a = 0 ; a < fields.length ; a++)
                    {
                        var field = fields[a];
                        var nsFieldObj = form.addField(field)

                        log.debug("field", field);

                        if(field.defaultValue)
                        {
                            nsFieldObj.defaultValue = field.defaultValue
                        }

                        if(field.displayType)
                        {
                            nsFieldObj.updateDisplayType({
                                displayType: field.displayType
                            });
                        }

                        if(field.updateBreakType)
                        {
                            nsFieldObj.updateBreakType({
                                breakType : field.updateBreakType
                            });
                        }


                        globalrefs[field.id] = nsFieldObj;

                    }

                    log.debug("globalrefs", globalrefs)

                    var sublists = processids[scriptContext.request.parameters.processid].sublists || [];

                    for(var a = 0 ; a < sublists.length ; a++)
                    {
                        var sublist = sublists[a];
                        uiSublistId = sublist.id
                        var nsSublist = form.addSublist({
                            label : `${processids[scriptContext.request.parameters.processid].title} Results`,
                            type : "LIST",
                            id : uiSublistId,
                        });
                        globalrefs[uiSublistId] = nsSublist;

                        for(var b = 0 ; b < sublist.sublistFields.length ; b++)
                        {
                            var sublistField = sublist.sublistFields[b];
                            var nsSublistField = nsSublist.addField(sublistField);

                            if(sublistField.displayType)
                            {
                                nsSublistField.updateDisplayType({
                                    displayType : sublistField.displayType
                                });
                            }
                            if(sublistField.defaultValue)
                            {
                                nsSublistField.defaultValue = sublistField.defaultValue
                            }

                            globalrefs[nsSublistField.id] = nsSublistField;
                        }

                        //08192025 - moved inside loop
                        fillSublist(scriptContext, nsSublist)
                    }



                    if(!processids[scriptContext.request.parameters.processid].noResultsSubmitButton)
                    {
                        form.addSubmitButton({
                            label : `Save ${processids[scriptContext.request.parameters.processid].title} Results`
                        })
                    }


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

        function getInputDetails(scriptContext, targetSublist)
        {
            try
            {
                var filters = [
                    ["type","anyof",["SalesOrd","TrnfrOrd"]],
                    "AND",
                    ["mainline","is","F"],
                    "AND",
                    ["taxline","is","F"],
                ];


                // globalrefs.tranBodyVals.location
                // globalrefs.tranItemVals.deliverydate
                // globalrefs.tranItemVals.destination
                if(scriptContext.request.parameters["traninternalid"])
                {
                    filters.push("AND")
                    filters.push(["internalid","anyof",scriptContext.request.parameters["traninternalid"]])
                }


                if(scriptContext.request.parameters["processid"] == "grreservation" && scriptContext.request.parameters["tranlinenum"])
                {

                    filters.push("AND")
                    filters.push(["line","equalto",scriptContext.request.parameters["tranlinenum"]])
                }
                // if(globalrefs.tranBodyVals.location)
                // {
                //     filters.push("AND")
                //     filters.push(["location","anyof",globalrefs.tranBodyVals.location])
                // }
                // if(globalrefs.tranItemVals.deliverydate)
                // {
                //     filters.push("AND")
                //     filters.push(["trandate","on",globalrefs.tranItemVals.deliverydate])
                // }
                // if(globalrefs.tranItemVals.destinationid)
                // {
                //     filters.push("AND")
                //     filters.push(["line.cseg_anc_dstnation","anyof",globalrefs.tranItemVals.destinationid])
                // }

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
                                name: "locationquantityavailable",
                                join: "item",
                                label: "line_availablequantity"
                            }),
                            search.createColumn({name: "quantity", label: "line_quantity"}),
                            search.createColumn({name: "location", label: "line_location"}),
                            search.createColumn({name: "line", label: "line_id"}),
                            search.createColumn({name: "linesequencenumber", label: "line_sequencenumber", sort: search.Sort.ASC}),
                            search.createColumn({name: "lineuniquekey", label: "line_uniquekey"}),
                            search.createColumn({name: "custcol_svb_vend_bill_lineno", label: "line_number"}),
                            search.createColumn({name: "custcol_010linememoinstruction", label: "line_memo"}),
                            //TODO you dont need it as result, only as filter, you need to join to line
                            // search.createColumn({name: "line.cseg_anc_dstnation", label: "line_memo"}),
                            search.createColumn({name: "custcol_anc_lxpert_loadreservedqty", label: "line_reservedqty"}),
                            search.createColumn({name: "custcol_anc_lxpert_loadreservedwt", label: "line_reservedweight"}),
                            search.createColumn({name: "custcol_anc_deliverydate", label: "line_deliverydate"}),
                        ]
                });
                var searchResultCount = salesorderSearchObj.runPaged().count;
                log.debug("salesorderSearchObj result count",searchResultCount);
                // salesorderSearchObj.run().each(function(result){
                //     // .run().each has a limit of 4,000 results
                //     return true;
                // });

                var sr = getResults(salesorderSearchObj.run());

                var firstLocationId = "";
                var firstLocationText = "";
                var srToObjects = sr.map(function(res){
                    // var res = sr[a];

                    var columns = res.columns;

                    var resObjByColumnKey = {}
                    columns.forEach(function(column) {
                        var label = column.label || column.name; // Fallback to name if label is unavailable
                        var value = res.getValue(column);

                        // if(label == "line_deliverydate")
                        // {
                        //     resObjByColumnKey.line_deliverydatetext = res.getText(column);
                        // }



                        resObjByColumnKey[label] = value;

                        if(label == "line_location")
                        {
                            if(!firstLocationId)
                            {
                                firstLocationId = res.getValue(column);
                            }
                            if(!firstLocationText)
                            {
                                firstLocationText = res.getText(column);
                            }

                            resObjByColumnKey.line_location = firstLocationId;
                            resObjByColumnKey.line_locationtext = firstLocationText;
                        }
                    });

                    resObjByColumnKey.id = res.id

                    return resObjByColumnKey;
                })
                log.debug("srToObjects", srToObjects)

                var srGroupedByDeliveryDate = groupBy(srToObjects, "line_deliverydate")
                log.debug("srGroupedByDeliveryDate", srGroupedByDeliveryDate)


                var a = 0;
                var multiGradeIndex = 0;
                for(var date in srGroupedByDeliveryDate)
                {
                    var deliveryDateGroup = srGroupedByDeliveryDate[date];
                    for(var c = 0 ; c < deliveryDateGroup.length ; c++)
                    {
                        var resObjByColumnKey = deliveryDateGroup[c]
                        var fitmentResponse = processids[scriptContext.request.parameters.processid].apiEndPoint ? get_responseObjs(scriptContext) : {list:[0]};

                        var firstSoRefLineIndex = (multiGradeIndex || 0);
                        for(var b = 0; b < fitmentResponse.list.length; b++)
                            // for(var b = 0; b < fitmentLineLimit; b++)
                        {
                            if(b == 0)
                            {
                                targetSublist.setSublistValue({
                                    id : "custpage_ifr_tietoline",
                                    line : multiGradeIndex || b,
                                    value : (multiGradeIndex || b)+1
                                })
                            }
                            else if(b > 0)
                            {
                                targetSublist.setSublistValue({
                                    id : "custpage_ifr_tietoline",
                                    line : multiGradeIndex || b,
                                    value : firstSoRefLineIndex
                                })
                            }
                            if(resObjByColumnKey.internalid)
                            {
                                targetSublist.setSublistValue({
                                    id : "custpage_ifr_so",
                                    line : multiGradeIndex || b,
                                    value : resObjByColumnKey.internalid
                                })
                            }

                            log.debug("resObjByColumnKey.line_deliverydate", resObjByColumnKey.line_deliverydate);
                            if(resObjByColumnKey.line_deliverydate)
                            {
                                targetSublist.setSublistValue({
                                    id : "custpage_col_ifr_line_deliverydate",
                                    line : multiGradeIndex || b,
                                    value : /*"03/03/2025"*/resObjByColumnKey.line_deliverydate
                                })
                            }
                            if(resObjByColumnKey.line_availablequantity)
                            {
                                targetSublist.setSublistValue({
                                    id : "custpage_col_ifr_availableqty",
                                    line : multiGradeIndex || b,
                                    value : /*"03/03/2025"*/resObjByColumnKey.line_availablequantity
                                })
                            }

                            //FILL BY ORDER QTY
                            if(resObjByColumnKey.line_quantity)
                            {
                                targetSublist.setSublistValue({
                                    id : "custpage_col_ifr_orderqty",
                                    line : multiGradeIndex || b,
                                    value : resObjByColumnKey.line_quantity
                                })
                            }
                            if(resObjByColumnKey.line_quantity)
                            {
                                targetSublist.setSublistValue({
                                    id : "custpage_col_ifr_reservedqty",
                                    line : multiGradeIndex || b,
                                    value : (resObjByColumnKey.line_reservedqty || 0)
                                })
                            }
                            if(resObjByColumnKey.line_quantity)
                            {
                                targetSublist.setSublistValue({
                                    id : "custpage_col_ifr_inputqty",
                                    line : multiGradeIndex || b,
                                    value : resObjByColumnKey.line_quantity - (resObjByColumnKey.line_reservedqty || 0)
                                })
                            }

                            //FILL BY ORDER WEIGHT
                            if(resObjByColumnKey.line_quantity)
                            {
                                targetSublist.setSublistValue({
                                    id : "custpage_col_ifr_orderweight",
                                    line : multiGradeIndex || b,
                                    value : resObjByColumnKey.line_quantity
                                })
                            }
                            if(resObjByColumnKey.line_quantity)
                            {
                                targetSublist.setSublistValue({
                                    id : "custpage_col_ifr_reservedweight",
                                    line : multiGradeIndex || b,
                                    value : (resObjByColumnKey.line_reservedweight || 0)
                                })
                            }
                            if(resObjByColumnKey.line_quantity)
                            {
                                targetSublist.setSublistValue({
                                    id : "custpage_col_ifr_inputweight",
                                    line : multiGradeIndex || b,
                                    value : resObjByColumnKey.line_quantity - (resObjByColumnKey.line_reservedweight || 0)
                                })
                            }


                            if(resObjByColumnKey.line_id)
                            {
                                targetSublist.setSublistValue({
                                    id : "custpage_ifr_linesequence",
                                    line : multiGradeIndex || b,
                                    value : resObjByColumnKey.line_sequencenumber
                                })
                            }
                            if(resObjByColumnKey.line_id)
                            {
                                targetSublist.setSublistValue({
                                    id : "custpage_ifr_lineref",
                                    line : multiGradeIndex || b,
                                    value : resObjByColumnKey.line_id
                                })
                            }
                            if(resObjByColumnKey.internalid && resObjByColumnKey.line_id)
                            {
                                targetSublist.setSublistValue({
                                    id : "custpage_ifr_solineref",
                                    line : multiGradeIndex || b,
                                    value : resObjByColumnKey.internalid + "_" + resObjByColumnKey.line_id
                                })
                            }
                            if(resObjByColumnKey.line_item)
                            {
                                targetSublist.setSublistValue({
                                    id : "custpage_ifr_item",
                                    line : multiGradeIndex || b,
                                    value : resObjByColumnKey.line_item
                                })
                            }
                            if(resObjByColumnKey.line_item_parent)
                            {
                                targetSublist.setSublistValue({
                                    id : "custpage_ifr_itemgrade",
                                    line : multiGradeIndex || b,
                                    value : resObjByColumnKey.line_item_parent
                                })
                            }
                            if(resObjByColumnKey.line_location)
                            {
                                targetSublist.setSublistValue({
                                    id : "custpage_ifr_location",
                                    line : multiGradeIndex || b,
                                    value : resObjByColumnKey.line_location
                                })
                            }

                            // loadid: "17424",
                            //     loadnumber: "4",
                            // weightplanned: "weight planned",
                            // percentage: "34.567"
                            if(processids[scriptContext.request.parameters.processid].apiEndPoint)
                            {
                                if(fitmentResponse.list[b] && fitmentResponse.list[b].loadid)
                                {
                                    targetSublist.setSublistValue({
                                        id : "custpage_ifr_loadid",
                                        line : multiGradeIndex || b,
                                        value : fitmentResponse.list[b].loadid
                                    })
                                }
                                if(fitmentResponse.list[b] && fitmentResponse.list[b].loadnumber)
                                {
                                    targetSublist.setSublistValue({
                                        id : "custpage_ifr_loadnum",
                                        line : multiGradeIndex || b,
                                        value : fitmentResponse.list[b].loadnumber
                                    })
                                }
                                if(fitmentResponse.list[b] && fitmentResponse.list[b].weightplanned)
                                {
                                    targetSublist.setSublistValue({
                                        id : "custpage_ifr_weightplanned",
                                        line : multiGradeIndex || b,
                                        value : fitmentResponse.list[b].weightplanned
                                    })
                                }
                                if(fitmentResponse.list[b] && fitmentResponse.list[b].percentage)
                                {
                                    targetSublist.setSublistValue({
                                        id : "custpage_ifr_percentage",
                                        line : multiGradeIndex || b,
                                        value : fitmentResponse.list[b].percentage
                                    })
                                }
                                //GRADERESPONSE
                                if(fitmentResponse.list[b] && fitmentResponse.list[b].graderunstartdate)
                                {
                                    targetSublist.setSublistValue({
                                        id : "custpage_ifr_graderunstart",
                                        line : multiGradeIndex || b,
                                        value : fitmentResponse.list[b].graderunstartdate
                                    })
                                }
                                if(fitmentResponse.list[b] && fitmentResponse.list[b].graderunenddate)
                                {
                                    targetSublist.setSublistValue({
                                        id : "custpage_ifr_graderunend",
                                        line : multiGradeIndex || b,
                                        value : fitmentResponse.list[b].graderunenddate
                                    })
                                }
                                if(fitmentResponse.list[b] && fitmentResponse.list[b].graderunavailablecapacity)
                                {
                                    targetSublist.setSublistValue({
                                        id : "custpage_ifr_availablecapacity",
                                        line : multiGradeIndex || b,
                                        value : fitmentResponse.list[b].graderunavailablecapacity
                                    })
                                }
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
                log.error("ERROR in function getInputDetails", e)
            }
        }

        function groupBy(objectArray, property) {
            return objectArray.reduce(function (acc, obj) {
                var key = obj[property];
                if (!acc[key]) {
                    acc[key] = [];
                }
                acc[key].push(obj);
                return acc;
            }, {});
        }

        // var groupBy = function(xs, key) {
        //     return xs.reduce(function(rv, x) {
        //         (rv[x[key]] ??= []).push(x);
        //         return rv;
        //     }, {});
        // };


        function fillSublist(scriptContext, targetSublist)
        {
            var inputDetails = getInputDetails(scriptContext, targetSublist)


            // fitmentReservationSublist
        }

        function get_responseObjs(scriptContext)
        {
            var responseObjs = {
                list : []
            };
            try
            {
                var respObj = {
                    loadid: "1",
                    loadnumber: "1",
                    weightplanned: "weight planned",
                    percentage: "10",
                    graderunstartdate: "6/20/2025",
                    graderunenddate: "6/27/2025",
                    graderunavailablecapacity : "20"
                };
                responseObjs.list.push(respObj)

                var respObj = {
                    loadid: "17424",
                    loadnumber: "4",
                    weightplanned: "weight planned",
                    percentage: "34.567",
                    graderunstartdate: "5/20/2025",
                    graderunenddate: "5/27/2025",
                    graderunavailablecapacity : "20"
                };
                responseObjs.list.push(respObj)

                var respObj = {
                    loadid: "17424",
                    loadnumber: "4",
                    weightplanned: "weight planned",
                    percentage: "876.54",
                    graderunstartdate: "7/20/2025",
                    graderunenddate: "7/27/2025",
                    graderunavailablecapacity : "40"
                };
                responseObjs.list.push(respObj)
            }
            catch(e)
            {
                log.error("ERROR in function get_responseObjs", e);
            }
            return responseObjs;
        }

        function triggerTargettedPreRelease(force_single_id)
        {
            log.debug("triggerTargettedPreRelease force_single_id", force_single_id)
            if(!force_single_id)
            {
                force_single_id = 61276625; //TODO temporarily this is to ensure you dont query all salesorder instead.
            }

            if(force_single_id)
            {
                var submitFieldValues = {};
                submitFieldValues[ANC_lib.references.SO_FIELDS.RELEASED.id] = "T";
                submitFieldValues[ANC_lib.references.SO_FIELDS.ORDERSTATUS.id] = ANC_lib.references.SO_FIELDS.ORDERSTATUS.options.RELEASED.val
                var soMarkedAsReleased = record.submitFields({
                    type : "salesorder",
                    id : force_single_id,
                    values : submitFieldValues
                })
                log.debug("soMarkedAsPreReleased", soMarkedAsReleased);
            }


            var mapContext = [];
            mapContext = ANC_lib.querySoPastLdc({
                    // traninternalids: [61250543],
                    // traninternalids: [61276625],
                    traninternalids: [force_single_id],
                    tranlineuniquekeys: [force_single_id],
                    sqlOperator: 'IN',
                    filterbyfield: 'TRANSACTION.ID',
                    dayspassedoper: '>',
                    dayspassed: 0
                });

            log.debug("triggerTargettedPreRelease mapContext", mapContext)

            try {
                var transferOrderIdList = [];
                const groupedByInternalId = ANC_lib.groupBy(mapContext, 'traninternalid');

                for (const soId in groupedByInternalId) {
                    const leg2Lines = ANC_lib.findLeg2Shipments(groupedByInternalId[soId]);
                    log.debug("leg2Lines", leg2Lines);

                    const groupedTOs = ANC_lib.groupTransferOrderLinesByOriginAndCrossdock(leg2Lines);

                    log.debug("groupedTOs", groupedTOs);

                    for (const group of groupedTOs) {
                        const { transferOrderId, itemIndexMap } = ANC_lib.createTransferOrder({
                            sourceLocation: group.originWarehouse,
                            destinationLocation: group.crossdock,
                            items: group.items
                        });

                        //call function to create Leg1 shipments out of transfer order
                        var resp = https.requestSuitelet({
                            scriptId : "customscript_anc_sl_fitmentchecking",
                            deploymentId : "customdeploy_anc_sl_fitmentchecking",
                            urlParams : {
                                "traninternalid" : transferOrderId,
                                "rectype" : "transferorder",
                                "leg" : 1
                            }
                        })

                        transferOrderIdList.push(transferOrderId);

                        log.debug("resp", resp);


                        //create shipments via transferOrderId //TODO remove further code
                        continue;

                    }
                }

                if(transferOrderIdList.length > 0)
                {
                    var listOfToSearch = search.create({
                        type : "transferorder",
                        filters : [
                            ["internalid", "anyof", transferOrderIdList],
                            "AND",
                            ["mainline", "is", true]
                        ],
                        columns : [
                            search.createColumn({
                                name : "tranid"
                            }),
                            search.createColumn({
                                name : "trandate"
                            }),
                            search.createColumn({
                                name : "location"
                            }),
                            search.createColumn({
                                name : "transferlocation"
                            }),
                        ]
                    });

                    redirect.toSearchResult({
                        search : listOfToSearch
                    })
                }

            } catch (e) {
                log.error('Error in reduce', e);
            }


            // const value = typeof mapContext.value === 'string' ? JSON.parse(mapContext.value) : mapContext.value;
            // mapContext.write({ key: value.traninternalid, value });
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



