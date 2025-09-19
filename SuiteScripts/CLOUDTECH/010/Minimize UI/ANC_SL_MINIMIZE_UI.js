/**
 * @NApiVersion 2.1
 * @NScriptType Suitelet
 * @NModuleScope SameAccount
 *
 * Author       :       Rodmar Dimasaca / rod@joycloud.solutions / netrodsuite@gmail.com
 * Description  :       For ANC
 * File Name    :       ANC_SL_MINIMIZE_UI.js
 * Script Name  :       ANC SL MINIMIZE UI
 * Script Id    :       customscript_sl_minimize_ui
 * Deployment Id:       customdeploy_sl_minimize_ui
 * API Version  :       2.1
 * version      :       1.0.0
 */
define(['/SuiteScripts/ANC_lib.js', '/SuiteScripts/TM_Party_Scripts/TMIntegrationLib.js', 'N/record', 'N/runtime', 'N/search', 'N/url', 'N/ui/serverWidget', 'N/redirect'],
    /**
     * @param{runtime} runtime
     * @param{search} search
     * @param{url} url
     */
    (ANC_lib, TMINTEG_lib, record, runtime, search, url, uiSw, redirect) => {

        var globalrefs = {};
        var fitmentLineLimit = 2;
        var allowMultiGrade = false;
        var DEBUGMODE = false;
        var accountId = "";

        var uiSublistId = "custpage_itemfitmentandreservation";

        var elements = {};
        var globalrefs = {};
        var minimize_ui_processid = "";


        const getElements = (scriptContext) => {
            elements = {
                "warehouse_and_logistics" : {
                    title : "Logistics",
                    bodyfieldgroups : {
                        list : [
                            {
                                id: "custpage_flgroup_source",
                                label: "Source"
                            },
                            {
                                id: "custpage_flgroup_input",
                                label: "Input"
                            }
                        ]
                    },
                    bodyfields : {
                        list : [
                            {
                                label : "Minimize UI / Process Id",
                                type : "text",
                                id : "custpage_minimizeui",
                                //container: "custpage_flgroup_source",
                                defaultValue:scriptContext.request.parameters.minimizeui || scriptContext.request.parameters.processid || scriptContext.request.parameters.custpage_minimizeui,
                                displayType : {
                                    displayType: "hidden"
                                }
                            },
                            {
                                label : "Source",
                                type : "select",
                                id : "custpage_traninternalid",
                                source : "salesorder",
                                //container: "custpage_flgroup_source",
                                sourceSearchKey:"tran_internalid",
                                displayType : {
                                    displayType: "inline"
                                }
                            },
                            {
                                label : "Item",
                                type : "select",
                                id : "custpage_tranlineitem",
                                source : "item",
                                //container: "custpage_flgroup_source",
                                sourceSearchKey:"tranline_item",
                                displayType : {
                                    displayType: "inline"
                                }
                            },
                            {
                                label : "Line Sequence",
                                type : "integer",
                                id : "custpage_tranlinesequence",
                                //container: "custpage_flgroup_source",
                                sourceSearchKey:"tranline_linesequence",
                                displayType : {
                                    displayType: "hidden"
                                },
                            },
                            {
                                label : "Line Num",
                                type : "integer",
                                id : "custpage_tranlinenum",
                                //container: "custpage_flgroup_source",
                                sourceSearchKey:"tranline_linenum",
                                displayType : {
                                    // displayType: "inline",
                                    displayType: "hidden"
                                }
                            },

                            {
                                label : "Shipping Lane",
                                type : "select",
                                id : "custpage_tranlinelaneid",
                                source : "customrecord_anc_shippinglanes",
                                sourceSearchKey : "tranline_shippinglane",
                                //container: "custpage_flgroup_input",
                                displayType : {
                                    displayType: "inline"
                                },
                                updateBreakType : {
                                    breakType : uiSw.FieldBreakType.STARTCOL
                                }
                            },
                            {
                                label : "Origin Warehouse",
                                type : "select",
                                id : "custpage_tranlineoriginwhse",
                                source : "location",
                                //container: "custpage_flgroup_input",
                                sourceSearchKey:"tranline_location",
                                targetColumnId : "location",
                                displayType : {
                                    displayType: "inline"
                                },
                            },
                            {
                                label : "Transit Warehouse",
                                type : "select",
                                id : "custpage_tranlinetransitwhse",
                                source : "location",
                                //container: "custpage_flgroup_input",
                                sourceSearchKey:"tranline_transitlocation",
                                targetColumnId : ANC_lib.references.SO_COLUMNS.TRANSITLOCATION.id,
                                displayType : {
                                    displayType: "inline"
                                }
                            },
                            {
                                label : "Transit Time",
                                type : "integer",
                                id : "custpage_tranlinetransittime",
                                //container: "custpage_flgroup_input",
                                sourceSearchKey:"tranline_transittime",
                                targetColumnId : ANC_lib.references.SO_COLUMNS.TRANSITTIME.id,
                                displayType : {
                                    displayType: "inline"
                                }
                            },
                            {
                                label : "Transit Optimization Method",
                                type : "select",
                                id : "custpage_tranlinetransittom",
                                source : "customlist_anc_transitoptmethods",
                                sourceSearchKey:"tranline_transitoptmethod",
                                targetColumnId : ANC_lib.references.SO_COLUMNS.TRANSITOPTMETHOD.id,
                                //container: "custpage_flgroup_input",
                                displayType : {
                                    displayType: "entry"
                                }
                            },
                            {
                                label : "Equipment",
                                type : "select",
                                id : "custpage_tranlineequipment",
                                source : ANC_lib.references.RECTYPES.equipment.id,
                                sourceSearchKey:"tranline_equipment",
                                targetColumnId : ANC_lib.references.SO_COLUMNS.EQUIPMENT.id,
                                //container: "custpage_flgroup_input",
                                displayType : {
                                    displayType: "inline"
                                }
                            },
                        ]
                    },
                    sublists : {
                        list : [

                        ]
                    },
                    searchFilters : [
                        ["type","anyof","SalesOrd"],
                        "AND",
                        ["mainline","is","F"],
                    ],
                    searchColumns: [
                        search.createColumn({name: "internalid", label: "tran_internalid"}),
                        search.createColumn({name: "mainname", label: "tran_customer"}),
                        search.createColumn({name: "item", label: "tranline_item"}),
                        search.createColumn({name: "linesequencenumber", label: "tranline_linesequence"}),
                        search.createColumn({name: "line", label: "tranline_linenum"}),
                        search.createColumn({name: "location", label: "tranline_location"}),
                        search.createColumn({name: ANC_lib.references.SO_COLUMNS.TRANSITLOCATION.id, label: "tranline_transitlocation"}),
                        search.createColumn({name: "location", label: "tranline_laneoriginwarehouse"}),
                        search.createColumn({
                            name: "formulanumeric",
                            formula: "600",
                            label: "tranline_transittime"
                        }),
                        search.createColumn({name: ANC_lib.references.SO_COLUMNS.LDCDATE.id, label: "tranline_ldc_date"}),
                        search.createColumn({name: ANC_lib.references.SO_COLUMNS.PRESSRUNDATE.id, label: "tranline_pressrun_date"}),
                        search.createColumn({
                            name: "formuladate",
                            formula: `{${ANC_lib.references.SO_COLUMNS.SHIPDATE}}`,
                            label: "tranline_ship_date"
                        }),
                        search.createColumn({name: "shipdate", label: "tranline_stndship_date"}),
                        search.createColumn({name: ANC_lib.references.SO_COLUMNS.PRODUCTIONDATE, label: "tranline_production_date"}),
                        search.createColumn({
                            name: "formuladate",
                            formula: `{${ANC_lib.references.SO_COLUMNS.PRODUCTIONDATE}}`,
                            label: "tranline_delivery_date"
                        }),
                        search.createColumn({name: ANC_lib.references.SO_COLUMNS.PRESSRUNDATE.id, label: "tranline_pressrundate"}),
                        //replaced on 08272025 - EXPECTEDTONNAGE
                        //replaced on 08272025 - TOTALROLLS
                        search.createColumn({name: ANC_lib.references.SO_COLUMNS.ROLLSPERPACK.id, label: "tranline_rollsperpack"}),
                        search.createColumn({name: ANC_lib.references.SO_COLUMNS.WRAPTYPE.id, label: "tranline_wraptype"}),
                        search.createColumn({
                            name: "locationquantityavailable",
                            join: "item",
                            label: "tranline_availablequantity"
                        }),
                        search.createColumn({name: ANC_lib.references.SO_COLUMNS.SHIPPINGLANE.id, label: "tranline_shippinglane"}),
                        //removed or replaced on 08272025 - ROLLSONHAND
                        //removed or replaced on 08272025 - RESERVEDROLLS
                        //removed or replaced on 08272025 - BACKORDERROLLS
                        search.createColumn({name: ANC_lib.references.SO_COLUMNS.EQUIPMENT.id, label: "tranline_equipment"}),
                        search.createColumn({name: ANC_lib.references.SO_COLUMNS.TRANSITOPTMETHOD.id, label: "tranline_transitoptmethod"}),
                        search.createColumn({name: ANC_lib.references.SO_COLUMNS.TRANSITTIME.id, label: "tranline_transittime"}),
                        search.createColumn({name: ANC_lib.references.SO_COLUMNS.CONSIGNEECOL.id, label: "tranline_consignee"}),
                        search.createColumn({name: "custbody_consignee", label: "custbody_consignee"})
                    ]
                },
                "orderquantity_and_inventorystatus" : {
                    title : "Inventory",
                    doFetchOrderInventoryQuantities : true,
                    bodyfieldgroups : {
                        list : [
                            {
                                id: "custpage_flgroup_source",
                                label: "Source"
                            },
                            {
                                id: "custpage_flgroup_details",
                                label: "Details"
                            },
                            {
                                id: "custpage_flgroup_input",
                                label: "Input"
                            }
                        ]
                    },
                    bodyfields : {
                        list : [
                            {
                                label : "Minimize UI / Process Id",
                                type : "text",
                                id : "custpage_minimizeui",
                                //container: "custpage_flgroup_source",
                                defaultValue:scriptContext.request.parameters.minimizeui || scriptContext.request.parameters.processid || scriptContext.request.parameters.custpage_minimizeui,
                                displayType : {
                                    displayType: "hidden"
                                }
                            },
                            {
                                label : "Source",
                                type : "select",
                                id : "custpage_traninternalid",
                                source : "salesorder",
                                //container: "custpage_flgroup_source",
                                sourceSearchKey:"tran_internalid",
                                displayType : {
                                    displayType: "inline"
                                }
                            },
                            {
                                label : "Item",
                                type : "select",
                                id : "custpage_tranlineitem",
                                source : "item",
                                //container: "custpage_flgroup_source",
                                sourceSearchKey:"tranline_item",
                                displayType : {
                                    displayType: "inline"
                                }
                            },
                            {
                                label : "Line Sequence",
                                type : "integer",
                                id : "custpage_tranlinesequence",
                                //container: "custpage_flgroup_source",
                                sourceSearchKey:"tranline_linesequence",
                                displayType : {
                                    displayType: "hidden"
                                },
                            },
                            {
                                label : "Line Num",
                                type : "integer",
                                id : "custpage_tranlinenum",
                                //container: "custpage_flgroup_source",
                                sourceSearchKey:"tranline_linenum",
                                displayType : {
                                    // displayType: "inline",
                                    displayType: "hidden"
                                },
                            },
                            //start new bashar fields 08272025 these will be coming from another system
                            {
                                label : "Quality Status",
                                type : "text",
                                id : "custpage_tmqualitystatus",
                                //container: "custpage_flgroup_input",
                                sourceIntegrationKey : "tmqualityStatus",
                                displayType : {
                                    displayType: "inline"
                                },
                                updateBreakType : {
                                    breakType : uiSw.FieldBreakType.STARTCOL
                                }
                            },
                            {
                                label : "Rolls Finished",
                                type : "integer",
                                id : "custpage_tmrollsfinished",
                                //container: "custpage_flgroup_input",
                                sourceIntegrationKey : "tmrollsfinished",
                                displayType : {
                                    displayType: "inline"
                                }
                            },
                            {
                                label : "Weight Finished",
                                type : "float",
                                id : "custpage_tmweightfinished",
                                //container: "custpage_flgroup_input",
                                sourceIntegrationKey : "tmweightfinished",
                                displayType : {
                                    displayType: "inline"
                                }
                            },
                            {
                                label : "Rolls Loaded",
                                type : "integer",
                                id : "custpage_tmrollsloaded",
                                //container: "custpage_flgroup_input",
                                sourceIntegrationKey : "tmrollsloaded",
                                displayType : {
                                    displayType: "inline"
                                }
                            },
                            {
                                label : "Weight Loaded",
                                type : "float",
                                id : "custpage_tmweightloaded",
                                //container: "custpage_flgroup_input",
                                sourceIntegrationKey : "tmweightloaded",
                                displayType : {
                                    displayType: "inline"
                                }
                            },
                            {
                                label : "Rolls In Transit",
                                type : "integer",
                                id : "custpage_tmrollsintransit",
                                //container: "custpage_flgroup_input",
                                sourceIntegrationKey : "tmrollsintransit",
                                displayType : {
                                    displayType: "inline"
                                }
                            },
                            {
                                label : "Weight In Transit",
                                type : "float",
                                id : "custpage_tmweightintransit",
                                //container: "custpage_flgroup_input",
                                sourceIntegrationKey : "tmweightintransit",
                                displayType : {
                                    displayType: "inline"
                                }
                            },
                            //end new bashar fields 08272025 these will be coming from another system
                        ]
                    },
                    sublists : {
                        list : [

                        ]
                    },
                    searchFilters : [
                        ["type","anyof","SalesOrd"],
                        "AND",
                        ["mainline","is","F"],
                    ],
                    searchColumns: [
                        search.createColumn({name: "internalid", label: "tran_internalid"}),
                        search.createColumn({name: "mainname", label: "tran_customer"}),
                        search.createColumn({name: "item", label: "tranline_item"}),
                        search.createColumn({name: "linesequencenumber", label: "tranline_linesequence"}),
                        search.createColumn({name: "line", label: "tranline_linenum"}),
                        search.createColumn({name: "location", label: "tranline_location"}),
                        //replaced on 08272025 - EXPECTEDTONNAGE
                        //replaced on 08272025 - TOTALROLLS
                        search.createColumn({name: ANC_lib.references.SO_COLUMNS.ROLLSPERPACK.id, label: "tranline_rollsperpack"}),
                        search.createColumn({name: ANC_lib.references.SO_COLUMNS.WRAPTYPE.id, label: "tranline_wraptype"}),
                        search.createColumn({
                            name: "locationquantityavailable",
                            join: "item",
                            label: "tranline_availablequantity"
                        }),
                        //removed or replaced on 08272025 - ROLLSONHAND
                        //removed or replaced on 08272025 - RESERVEDROLLS
                        //removed or replaced on 08272025 - BACKORDERROLLS
                    ]
                },
                "product_and_packaging" : {
                    title : "Packaging",
                    bodyfieldgroups : {
                        list : [
                            {
                                id: "custpage_flgroup_source",
                                label: "Source"
                            },
                            {
                                id: "custpage_flgroup_input",
                                label: "Input"
                            }
                        ]
                    },
                    bodyfields : {
                        list : [
                            {
                                label : "Minimize UI / Process Id",
                                type : "text",
                                id : "custpage_minimizeui",
                                //container: "custpage_flgroup_source",
                                defaultValue:scriptContext.request.parameters.minimizeui || scriptContext.request.parameters.processid || scriptContext.request.parameters.custpage_minimizeui,
                                displayType : {
                                    displayType: "hidden"
                                }
                            },
                            {
                                label : "Source",
                                type : "select",
                                id : "custpage_traninternalid",
                                source : "salesorder",
                                //container: "custpage_flgroup_source",
                                sourceSearchKey:"tran_internalid",
                                displayType : {
                                    displayType: "inline"
                                }
                            },
                            {
                                label : "Item",
                                type : "select",
                                id : "custpage_tranlineitem",
                                source : "item",
                                //container: "custpage_flgroup_source",
                                sourceSearchKey:"tranline_item",
                                displayType : {
                                    displayType: "inline"
                                }
                            },
                            {
                                label : "Line Sequence",
                                type : "integer",
                                id : "custpage_tranlinesequence",
                                //container: "custpage_flgroup_source",
                                sourceSearchKey:"tranline_linesequence",
                                displayType : {
                                    displayType: "hidden"
                                },
                            },
                            {
                                label : "Line Num",
                                type : "integer",
                                id : "custpage_tranlinenum",
                                //container: "custpage_flgroup_source",
                                sourceSearchKey:"tranline_linenum",
                                displayType : {
                                    // displayType: "inline",
                                    displayType: "hidden"
                                }
                            },
                            {
                                label : "Rolls Per Pack",
                                type : "integer",
                                id : "custpage_tranlinerollsperpack",
                                //container: "custpage_flgroup_input",
                                sourceSearchKey:"tranline_rollsperpack",
                                displayType : {
                                    displayType: "entry"
                                },
                                updateBreakType : {
                                    breakType : uiSw.FieldBreakType.STARTCOL
                                }
                            },
                            {
                                label : "Wrap Type",
                                type : "select",
                                id : "custpage_tranlinewraptype",
                                source : "customlist_anc_wraptypes",
                                //container: "custpage_flgroup_input",
                                sourceSearchKey:"tranline_wraptype",
                                displayType : {
                                    displayType: "entry"
                                }
                            },
                        ]
                    },
                    sublists : {
                        list : [

                        ]
                    },
                    searchFilters : [
                        ["type","anyof","SalesOrd"],
                        "AND",
                        ["mainline","is","F"],
                    ],
                    searchColumns: [
                        search.createColumn({name: "internalid", label: "tran_internalid"}),
                        search.createColumn({name: "mainname", label: "tran_customer"}),
                        search.createColumn({name: "item", label: "tranline_item"}),
                        search.createColumn({name: "linesequencenumber", label: "tranline_linesequence"}),
                        search.createColumn({name: "line", label: "tranline_linenum"}),
                        search.createColumn({name: "location", label: "tranline_location"}),
                        search.createColumn({name: ANC_lib.references.SO_COLUMNS.TRANSITLOCATION.id, label: "tranline_transitlocation"}),
                        search.createColumn({name: "location", label: "tranline_laneoriginwarehouse"}),
                        search.createColumn({
                            name: "formulanumeric",
                            formula: "600",
                            label: "tranline_transittime"
                        }),
                        search.createColumn({name: ANC_lib.references.SO_COLUMNS.LDCDATE.id, label: "tranline_ldc_date"}),
                        search.createColumn({name: ANC_lib.references.SO_COLUMNS.PRESSRUNDATE.id, label: "tranline_pressrun_date"}),
                        search.createColumn({
                            name: "formuladate",
                            formula: `{${ANC_lib.references.SO_COLUMNS.SHIPDATE}}`,
                            label: "tranline_ship_date"
                        }),
                        search.createColumn({name: "shipdate", label: "tranline_stndship_date"}),
                        search.createColumn({name: ANC_lib.references.SO_COLUMNS.PRODUCTIONDATE, label: "tranline_production_date"}),
                        search.createColumn({
                            name: "formuladate",
                            formula: `{${ANC_lib.references.SO_COLUMNS.PRODUCTIONDATE}}`,
                            label: "tranline_delivery_date"
                        }),
                        search.createColumn({name: ANC_lib.references.SO_COLUMNS.PRESSRUNDATE.id, label: "tranline_pressrundate"}),
                        //replaced on 08272025 - EXPECTEDTONNAGE
                        //replaced on 08272025 - TOTALROLLS
                        search.createColumn({name: ANC_lib.references.SO_COLUMNS.ROLLSPERPACK.id, label: "tranline_rollsperpack"}),
                        search.createColumn({name: ANC_lib.references.SO_COLUMNS.WRAPTYPE.id, label: "tranline_wraptype"}),
                        search.createColumn({
                            name: "locationquantityavailable",
                            join: "item",
                            label: "tranline_availablequantity"
                        }),
                        search.createColumn({name: ANC_lib.references.SO_COLUMNS.SHIPPINGLANE.id, label: "tranline_shippinglane"}),
                        //removed or replaced on 08272025 - ROLLSONHAND
                        //removed or replaced on 08272025 - RESERVEDROLLS
                        //removed or replaced on 08272025 - BACKORDERROLLS
                        search.createColumn({name: ANC_lib.references.SO_COLUMNS.TRANSITOPTMETHOD.id, label: "tranline_transitoptmethod"}),
                        search.createColumn({name: ANC_lib.references.SO_COLUMNS.TRANSITTIME.id, label: "tranline_transittime"}),
                        search.createColumn({name: ANC_lib.references.SO_COLUMNS.CONSIGNEECOL.id, label: "tranline_consignee"}),
                        search.createColumn({name: "custbody_consignee", label: "custbody_consignee"})
                    ]
                },
                "customer_and_shipping" : {
                    title : "Shipping",
                    bodyfieldgroups : {
                        list : [
                            {
                                id: "custpage_flgroup_source",
                                label: "Origin"
                            },
                            {
                                id: "custpage_flgroup_input",
                                label: "Input"
                            }
                        ]
                    },
                    bodyfields : {
                        list : [
                            {
                                label : "Minimize UI / Process Id",
                                type : "text",
                                id : "custpage_minimizeui",
                                //container: "custpage_flgroup_source",
                                defaultValue:scriptContext.request.parameters.minimizeui || scriptContext.request.parameters.processid || scriptContext.request.parameters.custpage_minimizeui,
                                displayType : {
                                    displayType: "hidden"
                                }
                            },
                            {
                                label : "Source",
                                type : "select",
                                id : "custpage_traninternalid",
                                source : "salesorder",
                                //container: "custpage_flgroup_source",
                                sourceSearchKey:"tran_internalid",
                                displayType : {
                                    displayType: "inline"
                                }
                            },
                            {
                                label : "Item",
                                type : "select",
                                id : "custpage_tranlineitem",
                                source : "item",
                                //container: "custpage_flgroup_source",
                                sourceSearchKey:"tranline_item",
                                displayType : {
                                    displayType: "inline"
                                }
                            },
                            {
                                label : "Line Sequence",
                                type : "integer",
                                id : "custpage_tranlinesequence",
                                //container: "custpage_flgroup_source",
                                sourceSearchKey:"tranline_linesequence",
                                displayType : {
                                    displayType: "hidden"
                                },
                            },
                            {
                                label : "Line Num",
                                type : "integer",
                                id : "custpage_tranlinenum",
                                //container: "custpage_flgroup_source",
                                sourceSearchKey:"tranline_linenum",
                                displayType : {
                                    // displayType: "inline",
                                    displayType: "hidden"
                                }
                            },
                            // {
                            //     label : "Customer Address",
                            //     type : "select",
                            //     id : "custpage_tranlinecustomeraddress",
                            //     source : "addressbook",
                            //     //container: "custpage_flgroup_input",
                            //     displayType : {
                            //         displayType: "entry"
                            //     }
                            // },
                            {
                                label : "Customer Agreement?",
                                type : "select",
                                id : "custpage_tranlinecustomeragreement",
                                source : "customrecord_anc_customeragreement",
                                //container: "custpage_flgroup_input",
                                displayType : {
                                    displayType: "inline"
                                },
                                updateBreakType : {
                                    breakType : uiSw.FieldBreakType.STARTCOL
                                }
                            },
                            {
                                label : "Consignee",
                                type : "select",
                                id : "custpage_tranlineconsignee",
                                source : "customrecord_alberta_ns_consignee_record",
                                // sourceSearchKey : "tranline_consignee",
                                sourceSearchKey : "custbody_consignee",
                                //container: "custpage_flgroup_input",
                                targetColumnId : ANC_lib.references.SO_COLUMNS.CONSIGNEECOL.id,
                                displayType : {
                                    displayType: "entry"
                                },
                            },
                            {
                                label : "Shipping Lane",
                                type : "select",
                                id : "custpage_tranlinelaneid",
                                source : "customrecord_anc_shippinglanes",
                                sourceSearchKey : "tranline_shippinglane",
                                //container: "custpage_flgroup_input",
                                displayType : {
                                    displayType: "inline"
                                }
                            },

                        ]
                    },
                    sublists : {
                        list : [

                        ]
                    },
                    searchFilters : [
                        ["type","anyof","SalesOrd"],
                        "AND",
                        ["mainline","is","F"],
                    ],
                    searchColumns: [
                        search.createColumn({name: "internalid", label: "tran_internalid"}),
                        search.createColumn({name: "mainname", label: "tran_customer"}),
                        search.createColumn({name: "item", label: "tranline_item"}),
                        search.createColumn({name: "linesequencenumber", label: "tranline_linesequence"}),
                        search.createColumn({name: "line", label: "tranline_linenum"}),
                        search.createColumn({name: "location", label: "tranline_location"}),
                        search.createColumn({name: ANC_lib.references.SO_COLUMNS.TRANSITLOCATION.id, label: "tranline_transitlocation"}),
                        search.createColumn({name: "location", label: "tranline_laneoriginwarehouse"}),
                        search.createColumn({
                            name: "formulanumeric",
                            formula: "600",
                            label: "tranline_transittime"
                        }),
                        search.createColumn({name: ANC_lib.references.SO_COLUMNS.LDCDATE.id, label: "tranline_ldc_date"}),
                        search.createColumn({name: ANC_lib.references.SO_COLUMNS.PRESSRUNDATE.id, label: "tranline_pressrun_date"}),
                        search.createColumn({
                            name: "formuladate",
                            formula: `{${ANC_lib.references.SO_COLUMNS.SHIPDATE}}`,
                            label: "tranline_ship_date"
                        }),
                        search.createColumn({name: "shipdate", label: "tranline_stndship_date"}),
                        search.createColumn({name: ANC_lib.references.SO_COLUMNS.PRODUCTIONDATE, label: "tranline_production_date"}),
                        search.createColumn({
                            name: "formuladate",
                            formula: `{${ANC_lib.references.SO_COLUMNS.PRODUCTIONDATE}}`,
                            label: "tranline_delivery_date"
                        }),
                        search.createColumn({name: ANC_lib.references.SO_COLUMNS.PRESSRUNDATE.id, label: "tranline_pressrundate"}),
                        //replaced on 08272025 - EXPECTEDTONNAGE
                        //replaced on 08272025 - TOTALROLLS
                        search.createColumn({name: ANC_lib.references.SO_COLUMNS.ROLLSPERPACK.id, label: "tranline_rollsperpack"}),
                        search.createColumn({name: ANC_lib.references.SO_COLUMNS.WRAPTYPE.id, label: "tranline_wraptype"}),
                        search.createColumn({
                            name: "locationquantityavailable",
                            join: "item",
                            label: "tranline_availablequantity"
                        }),
                        search.createColumn({name: ANC_lib.references.SO_COLUMNS.SHIPPINGLANE.id, label: "tranline_shippinglane"}),
                        //removed or replaced on 08272025 - ROLLSONHAND
                        //removed or replaced on 08272025 - RESERVEDROLLS
                        //removed or replaced on 08272025 - BACKORDERROLLS
                        search.createColumn({name: ANC_lib.references.SO_COLUMNS.TRANSITOPTMETHOD.id, label: "tranline_transitoptmethod"}),
                        search.createColumn({name: ANC_lib.references.SO_COLUMNS.TRANSITTIME.id, label: "tranline_transittime"}),
                        search.createColumn({name: ANC_lib.references.SO_COLUMNS.CONSIGNEECOL.id, label: "tranline_consignee"}),
                        search.createColumn({name: "custbody_consignee", label: "custbody_consignee"})
                    ]
                },
                "scheduling_and_keydates" : {
                    title : "Key Dates",
                    bodyfieldgroups : {
                        list : [
                            {
                                id: "custpage_flgroup_source",
                                label: "Origin"
                            },
                            {
                                id: "custpage_flgroup_input",
                                label: "Input"
                            }
                        ]
                    },
                    bodyfields : {
                        list : [
                            {
                                label : "Minimize UI / Process Id",
                                type : "text",
                                id : "custpage_minimizeui",
                                //container: "custpage_flgroup_source",
                                defaultValue:scriptContext.request.parameters.minimizeui || scriptContext.request.parameters.processid || scriptContext.request.parameters.custpage_minimizeui,
                                displayType : {
                                    displayType: "hidden"
                                }
                            },
                            {
                                label : "Source",
                                type : "select",
                                id : "custpage_traninternalid",
                                source : "salesorder",
                                //container: "custpage_flgroup_source",
                                sourceSearchKey:"tran_internalid",
                                displayType : {
                                    displayType: "inline"
                                }
                            },
                            {
                                label : "Item",
                                type : "select",
                                id : "custpage_tranlineitem",
                                source : "item",
                                //container: "custpage_flgroup_source",
                                sourceSearchKey:"tranline_item",
                                displayType : {
                                    displayType: "inline"
                                }
                            },
                            {
                                label : "Line Sequence",
                                type : "integer",
                                id : "custpage_tranlinesequence",
                                //container: "custpage_flgroup_source",
                                sourceSearchKey:"tranline_linesequence",
                                displayType : {
                                    displayType: "hidden"
                                },
                            },
                            {
                                label : "Line Num",
                                type : "integer",
                                id : "custpage_tranlinenum",
                                //container: "custpage_flgroup_source",
                                sourceSearchKey:"tranline_linenum",
                                displayType : {
                                    // displayType: "inline",
                                    displayType: "hidden"
                                }
                            },
                            // {
                            //     label : "Customer Address",
                            //     type : "select",
                            //     id : "custpage_tranlinecustomeraddress",
                            //     source : "addressbook",
                            //     //container: "custpage_flgroup_input",
                            //     displayType : {
                            //         displayType: "entry"
                            //     }
                            // },
                            {
                                label : "LDC Date",
                                type : "date",
                                id : "custpage_tranlinecustomeragreement",
                                source : "customrecord_anc_customeragreement",
                                //container: "custpage_flgroup_input",
                                sourceSearchKey:"tranline_ldc_date",
                                displayType : {
                                    displayType: "inline"
                                },
                                updateBreakType : {
                                    breakType : uiSw.FieldBreakType.STARTCOL
                                }
                            },
                            {
                                label : "Ship Date",
                                type : "date",
                                id : "custpage_tranlineshipdate",
                                //container: "custpage_flgroup_input",
                                sourceSearchKey:"tranline_ship_date",
                                displayType : {
                                    displayType: "inline"
                                }
                            },
                            {
                                label : "Production Date",
                                type : "date",
                                id : "custpage_tranlineproductiondate",
                                //container: "custpage_flgroup_input",
                                sourceSearchKey:"tranline_production_date",
                                displayType : {
                                    displayType: "inline"
                                }
                            },
                            {
                                label : "Press Run Date",
                                type : "date",
                                id : "custpage_tranlinepressrundate",
                                //container: "custpage_flgroup_input",
                                sourceSearchKey:"tranline_pressrundate",
                                displayType : {
                                    displayType: "entry"
                                }
                            },

                        ]
                    },
                    sublists : {
                        list : [

                        ]
                    },
                    searchFilters : [
                        ["type","anyof","SalesOrd"],
                        "AND",
                        ["mainline","is","F"],
                    ],
                    searchColumns: [
                        search.createColumn({name: "internalid", label: "tran_internalid"}),
                        search.createColumn({name: "mainname", label: "tran_customer"}),
                        search.createColumn({name: "item", label: "tranline_item"}),
                        search.createColumn({name: "linesequencenumber", label: "tranline_linesequence"}),
                        search.createColumn({name: "line", label: "tranline_linenum"}),
                        search.createColumn({name: "location", label: "tranline_location"}),
                        search.createColumn({name: ANC_lib.references.SO_COLUMNS.TRANSITLOCATION.id, label: "tranline_transitlocation"}),
                        search.createColumn({name: "location", label: "tranline_laneoriginwarehouse"}),
                        search.createColumn({
                            name: "formulanumeric",
                            formula: "600",
                            label: "tranline_transittime"
                        }),
                        search.createColumn({name: ANC_lib.references.SO_COLUMNS.LDCDATE.id, label: "tranline_ldc_date"}),
                        search.createColumn({name: ANC_lib.references.SO_COLUMNS.PRESSRUNDATE.id, label: "tranline_pressrun_date"}),
                        search.createColumn({
                            name: "formuladate",
                            formula: `{${ANC_lib.references.SO_COLUMNS.SHIPDATE}}`,
                            label: "tranline_ship_date"
                        }),
                        search.createColumn({name: "shipdate", label: "tranline_stndship_date"}),
                        search.createColumn({name: ANC_lib.references.SO_COLUMNS.PRODUCTIONDATE, label: "tranline_production_date"}),
                        search.createColumn({
                            name: "formuladate",
                            formula: `{${ANC_lib.references.SO_COLUMNS.PRODUCTIONDATE}}`,
                            label: "tranline_delivery_date"
                        }),
                        search.createColumn({name: ANC_lib.references.SO_COLUMNS.PRESSRUNDATE.id, label: "tranline_pressrundate"}),
                        //replaced on 08272025 - EXPECTEDTONNAGE
                        //replaced on 08272025 - TOTALROLLS
                        search.createColumn({name: ANC_lib.references.SO_COLUMNS.ROLLSPERPACK.id, label: "tranline_rollsperpack"}),
                        search.createColumn({name: ANC_lib.references.SO_COLUMNS.WRAPTYPE.id, label: "tranline_wraptype"}),
                        search.createColumn({
                            name: "locationquantityavailable",
                            join: "item",
                            label: "tranline_availablequantity"
                        }),
                        search.createColumn({name: ANC_lib.references.SO_COLUMNS.SHIPPINGLANE.id, label: "tranline_shippinglane"}),
                        //removed or replaced on 08272025 - ROLLSONHAND
                        //removed or replaced on 08272025 - RESERVEDROLLS
                        //removed or replaced on 08272025 - BACKORDERROLLS
                        search.createColumn({name: ANC_lib.references.SO_COLUMNS.TRANSITOPTMETHOD.id, label: "tranline_transitoptmethod"}),
                        search.createColumn({name: ANC_lib.references.SO_COLUMNS.TRANSITTIME.id, label: "tranline_transittime"}),
                        search.createColumn({name: ANC_lib.references.SO_COLUMNS.CONSIGNEECOL.id, label: "tranline_consignee"}),
                        search.createColumn({name: "custbody_consignee", label: "custbody_consignee"})
                    ]
                }
                ,
                "shipments" : {
                    title : "Shipments",
                    bodyfieldgroups : {
                        list : [
                            {
                                id: "custpage_flgroup_source",
                                label: "Origin"
                            },
                            {
                                id: "custpage_flgroup_input",
                                label: "Input"
                            }
                        ]
                    },
                    bodyfields : {
                        list : [
                            {
                                label : "Minimize UI / Process Id",
                                type : "text",
                                id : "custpage_minimizeui",
                                //container: "custpage_flgroup_source",
                                defaultValue:scriptContext.request.parameters.minimizeui || scriptContext.request.parameters.processid || scriptContext.request.parameters.custpage_minimizeui,
                                displayType : {
                                    displayType: "hidden"
                                }
                            },
                            {
                                label : "Source",
                                type : "select",
                                id : "custpage_traninternalid",
                                source : "salesorder",
                                //container: "custpage_flgroup_source",
                                sourceSearchKey:"tran_internalid",
                                displayType : {
                                    displayType: "inline"
                                }
                            },
                            {
                                label : "Item",
                                type : "select",
                                id : "custpage_tranlineitem",
                                source : "item",
                                //container: "custpage_flgroup_source",
                                sourceSearchKey:"tranline_item",
                                displayType : {
                                    displayType: "inline"
                                }
                            },
                            {
                                label : "Line Sequence",
                                type : "integer",
                                id : "custpage_tranlinesequence",
                                //container: "custpage_flgroup_source",
                                sourceSearchKey:"tranline_linesequence",
                                displayType : {
                                    displayType: "hidden"
                                },
                            },
                            {
                                label : "Line Num",
                                type : "integer",
                                id : "custpage_tranlinenum",
                                //container: "custpage_flgroup_source",
                                sourceSearchKey:"tranline_linenum",
                                displayType : {
                                    // displayType: "inline",
                                    displayType: "hidden"
                                }
                            },
                            {
                                label : "Ship Date",
                                type : "date",
                                id : "custpage_tranlineshipdate",
                                //container: "custpage_flgroup_input",
                                sourceSearchKey:"tranline_ship_date",
                                displayType : {
                                    displayType: "inline"
                                },
                                updateBreakType : {
                                    breakType : uiSw.FieldBreakType.STARTCOL
                                },
                            },
                            {
                                label : "Production Date",
                                type : "date",
                                id : "custpage_tranlineproductiondate",
                                //container: "custpage_flgroup_input",
                                sourceSearchKey:"tranline_production_date",
                                displayType : {
                                    displayType: "inline"
                                }
                            },
                            {
                                label : "Total Shipments",
                                type : "integer",
                                id : "custpage_totalshipments",
                                //container: "custpage_flgroup_input",
                                displayType : {
                                    displayType: "inline"
                                },
                                updateBreakType : {
                                    breakType : uiSw.FieldBreakType.STARTCOL
                                },
                                updateLayoutType : {
                                    layoutType : uiSw.FieldLayoutType.OUTSIDEBELOW
                                }
                            },

                        ]
                    },
                    sublists : {
                        list : [
                            {
                                listCounter_bodyField : "custpage_totalshipments",
                                id : "custpage_minui_sublist_shipments",
                                label : "Shipments",
                                type : "list",
                                updateTotallingFieldId:"custpage_shipmentreflineqty",
                                dataSource:"",
                                sublistFields : [
                                    {
                                        label : "Shipment Ref#",
                                        type : "select",
                                        id : "custpage_shipmentref",
                                        source : "transaction",
                                        //container: "custpage_flgroup_input",
                                        sourceSearchKey:"internalid",
                                        displayType : {
                                            displayType: "disabled"
                                        }
                                    },
                                    {
                                        label : "Leg#",
                                        type : "text",
                                        id : "custpage_leg",
                                        //container: "custpage_flgroup_input",
                                        sourceSearchKey:"leg",
                                        displayType : {
                                            displayType: "disabled"
                                        }
                                    },
                                    {
                                        label : "Origin",
                                        type : "text",
                                        id : "custpage_origin",
                                        //container: "custpage_flgroup_input",
                                        sourceSearchKey:"origin",
                                        displayType : {
                                            displayType: "disabled"
                                        }
                                    },
                                    {
                                        label : "Destination",
                                        type : "text",
                                        id : "custpage_destination",
                                        //container: "custpage_flgroup_input",
                                        sourceSearchKey:"destination",
                                        displayType : {
                                            displayType: "disabled"
                                        }
                                    },
                                    {
                                        label : "Shipment Line Qty",
                                        type : "float",
                                        id : "custpage_shipmentreflineqty",
                                        //container: "custpage_flgroup_input",
                                        sourceSearchKey:"Quantity",
                                        displayType : {
                                            displayType: "inline"
                                        }
                                    },
                                    {
                                        label : "Weight",
                                        type : "float",
                                        id : "custpage_weight",
                                        //container: "custpage_flgroup_input",
                                        sourceSearchKey:"weight",
                                        displayType : {
                                            displayType: "disabled"
                                        }
                                    },
                                    {
                                        label : "Equipment",
                                        type : "select",
                                        id : "custpage_equipment",
                                        //container: "custpage_flgroup_input",
                                        source : ANC_lib.references.RECTYPES.equipment.id,
                                        sourceSearchKey:"equipment",
                                        displayType : {
                                            displayType: "disabled"
                                        }
                                    },
                                    {
                                        label : "Utilization%",
                                        type : "percent",
                                        id : "custpage_shipmentutilpercent",
                                        //container: "custpage_flgroup_input",
                                        sourceSearchKey:"Utilization Percent",
                                        displayType : {
                                            displayType: "inline"
                                        }
                                    },
                                    {
                                        label : "Status",
                                        type : "select",
                                        id : "custpage_shipmentstatus",
                                        source : "customlist_anc_shipstatus",
                                        //container: "custpage_flgroup_input",
                                        sourceSearchKey:"custbody_anc_shipstatus",
                                        displayType : {
                                            displayType: "inline"
                                        }
                                    },
                                    {
                                        label : "Cancelled",
                                        type : "checkbox",
                                        id : "custpage_cancelled",
                                        sourceSearchKey:"custbody_anc_tobedeletedduetodecons",
                                        displayType : {
                                            displayType: "inline"
                                        }
                                    },
                                    {
                                        label : "Needs Rebuild",
                                        type : "checkbox",
                                        id : "custpage_needsrebuild",
                                        sourceSearchKey:"custbody_anc_needsrebuild",
                                        displayType : {
                                            displayType: "inline"
                                        }
                                    },
                                    {
                                        label : "Shipment Line Status",
                                        type : "select",
                                        id : "custpage_shipmentlinestatus",
                                        source : "customlist_anc_shipstatus",
                                        //container: "custpage_flgroup_input",
                                        sourceSearchKey:"custcol_anc_shipmentlinestatus",
                                        displayType : {
                                            displayType: "hidden"
                                        }
                                    },
                                    {
                                        label : "Shipment Line#",
                                        type : "integer",
                                        id : "custpage_shipmentreflinenum",
                                        //container: "custpage_flgroup_input",
                                        sourceSearchKey:"Line Sequence Number",
                                        displayType : {
                                            displayType: "hidden"
                                        }
                                    },
                                    {
                                        label : "Shipment Line Unique Key",
                                        type : "integer",
                                        id : "custpage_shipmentreflineuniquekey",
                                        //container: "custpage_flgroup_input",
                                        sourceSearchKey:"Line Unique Key",
                                        displayType : {
                                            displayType: "hidden"
                                        }
                                    },
                                ],
                                searchtype: "transaction",
                                columns:
                                    [
                                        search.createColumn({name: "internalid", label: "internalid", sort:search.Sort.DESC}),
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
                                        search.createColumn({name: "custbody_anc_loadingefficiency", label: "Utilization Percent"}),
                                        search.createColumn({name: "lineuniquekey", label: "Line Unique Key"}),
                                        search.createColumn({name: "quantity", label: "Quantity"}),
                                        search.createColumn({name: "statusref", label: "Status"}),
                                        search.createColumn({name: "custbody_anc_shipstatus", label: "custbody_anc_shipstatus"}),
                                        search.createColumn({name: "custcol_anc_shipmentlinestatus", label: "custcol_anc_shipmentlinestatus"}),
                                        search.createColumn({name: "custbody_anc_tobedeletedduetodecons", label: "custbody_anc_tobedeletedduetodecons"}),
                                        search.createColumn({name: "custbody_anc_needsrebuild", label: "custbody_anc_needsrebuild"}),


                                        search.createColumn({name: "custbody_anc_shipment_leg", label: "leg"}),
                                        search.createColumn({name: "city", join: "location", label: "origin"}),
                                        search.createColumn({name: "custcol_anc_shipment_linetotalweight", label: "weight"}),
                                        search.createColumn({name: "custbody_anc_equipment", label: "equipment"}),
                                        search.createColumn({name: "custrecord_anc_lane_destinationcity", join: "custbody_anc_lane", label: "destination"}),
                                    ],
                                filters:
                                    [
                                        ["mainline","is","F"],
                                        "AND",
                                        ["type", "is", ANC_lib.references.RECTYPES.shipment.id]
                                    ]
                            }
                        ]
                    },
                    searchFilters : [
                        ["type","anyof","SalesOrd"],
                        "AND",
                        ["mainline","is","F"],
                    ],
                    searchColumns: [
                        search.createColumn({name: "internalid", label: "tran_internalid"}),
                        search.createColumn({name: "mainname", label: "tran_customer"}),
                        search.createColumn({name: "item", label: "tranline_item"}),
                        search.createColumn({name: "linesequencenumber", label: "tranline_linesequence"}),
                        search.createColumn({name: "lineuniquekey", label: "tranline_lineuniquekey"}),
                        search.createColumn({name: "line", label: "tranline_linenum"}),
                        search.createColumn({name: "location", label: "tranline_location"}),
                        search.createColumn({name: ANC_lib.references.SO_COLUMNS.TRANSITLOCATION.id, label: "tranline_transitlocation"}),
                        search.createColumn({name: "location", label: "tranline_laneoriginwarehouse"}),
                        search.createColumn({
                            name: "formulanumeric",
                            formula: "600",
                            label: "tranline_transittime"
                        }),
                        search.createColumn({name: ANC_lib.references.SO_COLUMNS.LDCDATE.id, label: "tranline_ldc_date"}),
                        search.createColumn({name: ANC_lib.references.SO_COLUMNS.PRESSRUNDATE.id, label: "tranline_pressrun_date"}),
                        search.createColumn({
                            name: "formuladate",
                            formula: `{${ANC_lib.references.SO_COLUMNS.SHIPDATE}}`,
                            label: "tranline_ship_date"
                        }),
                        search.createColumn({name: "shipdate", label: "tranline_stndship_date"}),
                        search.createColumn({name: ANC_lib.references.SO_COLUMNS.PRODUCTIONDATE, label: "tranline_production_date"}),
                        search.createColumn({
                            name: "formuladate",
                            formula: `{${ANC_lib.references.SO_COLUMNS.PRODUCTIONDATE}}`,
                            label: "tranline_delivery_date"
                        }),
                        search.createColumn({name: ANC_lib.references.SO_COLUMNS.PRESSRUNDATE.id, label: "tranline_pressrundate"}),
                        //replaced on 08272025 - EXPECTEDTONNAGE
                        //replaced on 08272025 - TOTALROLLS
                        search.createColumn({name: ANC_lib.references.SO_COLUMNS.ROLLSPERPACK.id, label: "tranline_rollsperpack"}),
                        search.createColumn({name: ANC_lib.references.SO_COLUMNS.WRAPTYPE.id, label: "tranline_wraptype"}),
                        search.createColumn({
                            name: "locationquantityavailable",
                            join: "item",
                            label: "tranline_availablequantity"
                        }),
                        search.createColumn({name: ANC_lib.references.SO_COLUMNS.SHIPPINGLANE.id, label: "tranline_shippinglane"}),
                        //removed or replaced on 08272025 - ROLLSONHAND
                        //removed or replaced on 08272025 - RESERVEDROLLS
                        //removed or replaced on 08272025 - BACKORDERROLLS
                        search.createColumn({name: ANC_lib.references.SO_COLUMNS.TRANSITOPTMETHOD.id, label: "tranline_transitoptmethod"}),
                        search.createColumn({name: ANC_lib.references.SO_COLUMNS.TRANSITTIME.id, label: "tranline_transittime"}),
                        search.createColumn({name: ANC_lib.references.SO_COLUMNS.CONSIGNEECOL.id, label: "tranline_consignee"}),
                        search.createColumn({name: "custbody_consignee", label: "custbody_consignee"}),
                    ]
                },
                "shipcap" : {
                    title : "shipcap",
                    bodyfieldgroups : {
                        list : [
                        ]
                    },
                    bodyfields : {
                        list : [
                        ]
                    },
                    sublists : {
                        list : [

                        ]
                    },
                    searchFilters : [
                        ["type","anyof","SalesOrd"],
                        "AND",
                        ["mainline","is","F"],
                    ],
                    searchColumns: [
                        search.createColumn({name: "custcol_anc_shipmentcap_id", label: "custcol_anc_shipmentcap_id"}),
                    ]
                },
                "prodcap" : {
                    title : "prodcap",
                    bodyfieldgroups : {
                        list : [
                        ]
                    },
                    bodyfields : {
                        list : [
                        ]
                    },
                    sublists : {
                        list : [

                        ]
                    },
                    searchFilters : [
                        ["type","anyof","SalesOrd"],
                        "AND",
                        ["mainline","is","F"],
                    ],
                    searchColumns: [
                        search.createColumn({name: "custcol_anc_prodcapweek_id", label: "custcol_anc_prodcapweek_id"}),
                    ]
                },
                "salesforecast" : {
                    title : "salesforecast",
                    bodyfieldgroups : {
                        list : [
                        ]
                    },
                    bodyfields : {
                        list : [
                        ]
                    },
                    sublists : {
                        list : [

                        ]
                    },
                    searchFilters : [
                        ["type","anyof","SalesOrd"],
                        "AND",
                        ["mainline","is","F"],
                    ],
                    searchColumns: [
                        search.createColumn({name: "custcol_anc_customeralloc_caid", label: "custcol_anc_customeralloc_caid"}),
                    ]
                },
                "notes" : {
                    title : "Notes",
                    upsertAndRedirect : {
                        recordType : "customrecord_anc_orderlinenotes",
                        filters : [
                            {
                                name : "custrecord_anc_oln_tranlineuniquekey",
                                // join : "customrecord_anc_orderlinenotes",
                                operator : "is",
                                firstresultsourcevalue : "tranline_lineuniquekey",
                                doSource : true,
                                targetFieldId : "custrecord_anc_oln_tranlineuniquekey"
                            },
                            {
                                name : "custrecord_anc_oln_traninternalid",
                                // join : "customrecord_anc_orderlinenotes",
                                operator : "anyof",
                                firstresultsourcevalue : "tran_internalid",
                                doSource : true,
                                targetFieldId : "custrecord_anc_oln_traninternalid"
                            }
                        ],
                        overridableRedirectParams : {
                            custrecord_anc_oln_traninternalid : "tran_internalid"
                        }
                    },
                    bodyfieldgroups : {
                        list : [
                            {
                                id: "custpage_flgroup_source",
                                label: "Origin"
                            },
                            {
                                id: "custpage_flgroup_input",
                                label: "Input"
                            }
                        ]
                    },
                    bodyfields : {
                        list : [
                            {
                                label : "Minimize UI / Process Id",
                                type : "text",
                                id : "custpage_minimizeui",
                                //container: "custpage_flgroup_source",
                                defaultValue:scriptContext.request.parameters.minimizeui || scriptContext.request.parameters.processid || scriptContext.request.parameters.custpage_minimizeui,
                                displayType : {
                                    displayType: "hidden"
                                }
                            },
                            {
                                label : "Source",
                                type : "select",
                                id : "custpage_traninternalid",
                                source : "salesorder",
                                //container: "custpage_flgroup_source",
                                sourceSearchKey:"tran_internalid",
                                displayType : {
                                    displayType: "inline"
                                }
                            },
                            {
                                label : "Item",
                                type : "select",
                                id : "custpage_tranlineitem",
                                source : "item",
                                //container: "custpage_flgroup_source",
                                sourceSearchKey:"tranline_item",
                                displayType : {
                                    displayType: "inline"
                                }
                            },
                            {
                                label : "Line Sequence",
                                type : "integer",
                                id : "custpage_tranlinesequence",
                                //container: "custpage_flgroup_source",
                                sourceSearchKey:"tranline_linesequence",
                                displayType : {
                                    displayType: "hidden"
                                },
                            },
                            {
                                label : "Line Num",
                                type : "integer",
                                id : "custpage_tranlinenum",
                                //container: "custpage_flgroup_source",
                                sourceSearchKey:"tranline_linenum",
                                displayType : {
                                    // displayType: "inline",
                                    displayType: "hidden"
                                }
                            },

                        ]
                    },
                    sublists : {

                    },
                    searchFilters : [
                        ["type","anyof","SalesOrd"],
                        "AND",
                        ["mainline","is","F"],
                    ],
                    searchColumns: [
                        search.createColumn({name: "internalid", label: "tran_internalid"}),
                        search.createColumn({name: "mainname", label: "tran_customer"}),
                        search.createColumn({name: "item", label: "tranline_item"}),
                        search.createColumn({name: "linesequencenumber", label: "tranline_linesequence"}),
                        search.createColumn({name: "lineuniquekey", label: "tranline_lineuniquekey"}),
                        search.createColumn({name: "line", label: "tranline_linenum"}),
                    ]
                },
                "headernotes" : {
                    title : "Body Notes",
                    upsertAndRedirect_headeronly : {
                        recordType : "customrecord_anc_orderlinenotes",
                        filters : [
                            {
                                name : "custrecord_anc_oln_traninternalid",
                                // join : "customrecord_anc_orderlinenotes",
                                operator : "anyof",
                                firstresultsourcevalue : "tran_internalid",
                                doSource : true,
                                targetFieldId : "custrecord_anc_oln_traninternalid"
                            },
                            {
                                name : "custrecord_anc_oln_tranlineuniquekey",
                                // join : "customrecord_anc_orderlinenotes",
                                operator : "isempty",
                                firstresultsourcevalue : "tran_internalid",
                                doSource : false,
                            }
                        ],
                        overridableRedirectParams : {
                            custrecord_anc_oln_traninternalid : "tran_internalid"
                        }
                    },
                    bodyfieldgroups : {
                        list : [
                            {
                                id: "custpage_flgroup_source",
                                label: "Origin"
                            },
                            {
                                id: "custpage_flgroup_input",
                                label: "Input"
                            }
                        ]
                    },
                    bodyfields : {
                        list : [
                            {
                                label : "Minimize UI / Process Id",
                                type : "text",
                                id : "custpage_minimizeui",
                                //container: "custpage_flgroup_source",
                                defaultValue:scriptContext.request.parameters.minimizeui || scriptContext.request.parameters.processid || scriptContext.request.parameters.custpage_minimizeui,
                                displayType : {
                                    displayType: "hidden"
                                }
                            },
                            {
                                label : "Source",
                                type : "select",
                                id : "custpage_traninternalid",
                                source : "salesorder",
                                //container: "custpage_flgroup_source",
                                sourceSearchKey:"tran_internalid",
                                displayType : {
                                    displayType: "inline"
                                }
                            },
                            {
                                label : "Item",
                                type : "select",
                                id : "custpage_tranlineitem",
                                source : "item",
                                //container: "custpage_flgroup_source",
                                sourceSearchKey:"tranline_item",
                                displayType : {
                                    displayType: "inline"
                                }
                            },
                            {
                                label : "Line Sequence",
                                type : "integer",
                                id : "custpage_tranlinesequence",
                                //container: "custpage_flgroup_source",
                                sourceSearchKey:"tranline_linesequence",
                                displayType : {
                                    displayType: "hidden"
                                },
                            },
                            {
                                label : "Line Num",
                                type : "integer",
                                id : "custpage_tranlinenum",
                                //container: "custpage_flgroup_source",
                                sourceSearchKey:"tranline_linenum",
                                displayType : {
                                    // displayType: "inline",
                                    displayType: "hidden"
                                }
                            },

                        ]
                    },
                    sublists : {

                    },
                    searchFilters : [
                        ["type","anyof","SalesOrd"],
                        "AND",
                        ["mainline","is","T"],
                    ],
                    searchColumns: [
                        search.createColumn({name: "internalid", label: "tran_internalid"}),
                        search.createColumn({name: "mainname", label: "tran_customer"}),
                    ]
                },
            }
        }

        function generateForm(scriptContext, form)
        {
            try
            {
                log.debug("generateForm scriptContext.request.method", scriptContext.request.method);

                log.debug("elements[minimize_ui_processid]", elements[minimize_ui_processid]);

                var form = uiSw.createForm({
                    title: elements[minimize_ui_processid].title,
                    hideNavBar: true
                })


                form.clientScriptModulePath = './ANC_CS_MINIMIZE_UI.js'


                var sourceValSearchObj = null;
                var firstResult = {};
                var tmfirstResult = {};
                //search and source the values
                if(scriptContext.request.parameters.traninternalid && scriptContext.request.parameters.tranlinenum)
                {

                    var searchFilters = [];
                    if(elements[minimize_ui_processid] &&
                        elements[minimize_ui_processid].searchFilters &&
                        elements[minimize_ui_processid].searchFilters.length > 0)
                    {
                        searchFilters = elements[minimize_ui_processid].searchFilters;
                    }

                    searchFilters.push("AND")
                    searchFilters.push(["internalid", "anyof", scriptContext.request.parameters.traninternalid])
                    searchFilters.push("AND")
                    searchFilters.push(["line", "equalto", scriptContext.request.parameters.tranlinenum])

                    log.debug("searchFilters", searchFilters);


                    sourceValSearchObj = search.create({
                        type: "salesorder",
                        settings:[{"name":"consolidationtype","value":"ACCTTYPE"}],
                        filters : searchFilters,
                        columns : elements[minimize_ui_processid].searchColumns,
                    })

                    var sr = getResults(sourceValSearchObj.run())

                    for(var a = 0 ; a < sr.length ; a++)
                    {
                        var res = sr[a];

                        var columns = res.columns;

                        var resObjByColumnKey = {}
                        columns.forEach(function(column) {
                            var label = column.label || column.name; // Fallback to name if label is unavailable
                            var value = res.getValue(column);
                            var text = res.getText(column);
                            resObjByColumnKey[label] = {value, text};
                        });

                        resObjByColumnKey.id = {value:res.id, text : res.id};
                        log.debug("resObjByColumnKey", resObjByColumnKey);
                        firstResult = resObjByColumnKey;
                        break;
                    }


                }
                else if(scriptContext.request.parameters.traninternalid)
                {

                    var searchFilters = [];
                    if(elements[minimize_ui_processid] &&
                        elements[minimize_ui_processid].searchFilters &&
                        elements[minimize_ui_processid].searchFilters.length > 0)
                    {
                        searchFilters = elements[minimize_ui_processid].searchFilters;
                    }

                    searchFilters.push("AND")
                    searchFilters.push(["internalid", "anyof", scriptContext.request.parameters.traninternalid])

                    log.debug("searchFilters", searchFilters);


                    sourceValSearchObj = search.create({
                        type: "salesorder",
                        settings:[{"name":"consolidationtype","value":"ACCTTYPE"}],
                        filters : searchFilters,
                        columns : elements[minimize_ui_processid].searchColumns,
                    })

                    var sr = getResults(sourceValSearchObj.run())

                    for(var a = 0 ; a < sr.length ; a++)
                    {
                        var res = sr[a];

                        var columns = res.columns;

                        var resObjByColumnKey = {}
                        columns.forEach(function(column) {
                            var label = column.label || column.name; // Fallback to name if label is unavailable
                            var value = res.getValue(column);
                            var text = res.getText(column);
                            resObjByColumnKey[label] = {value, text};
                        });

                        resObjByColumnKey.id = {value:res.id, text : res.id};
                        log.debug("resObjByColumnKey", resObjByColumnKey);
                        firstResult = resObjByColumnKey;
                        break;
                    }


                }





                if(elements[minimize_ui_processid].doFetchOrderInventoryQuantities)
                {
                    log.debug("TMINTEG_lib", TMINTEG_lib);
                    var tmResult = TMINTEG_lib.fetchOrderInventoryQuantities(scriptContext.request.parameters.traninternalid, scriptContext.request.parameters.tranlinenum);

                    log.debug("tmResult", tmResult);
                    if(tmResult && tmResult["quantities"])
                    {
                        if(typeof tmResult["quantities"].toLowerCase() === "object")
                        {
                            if(tmResult["quantities"].length > 0)
                            {
                                tmfirstResult = tmResult["quantities"][0];
                            }
                        }
                    }
                }

                if(scriptContext.request.parameters.minimizeui == "shipcap")
                {
                    if(firstResult.custcol_anc_shipmentcap_id && firstResult.custcol_anc_shipmentcap_id.value)
                    {
                        log.debug("firstResult.custcol_anc_shipmentcap_id", firstResult.custcol_anc_shipmentcap_id)
                        redirect.toRecord({
                            type : "customrecord_anc_dailyshipmentcap",
                            id : firstResult.custcol_anc_shipmentcap_id.value,
                            // parameters : {}
                        })
                        return;
                    }
                    else
                    {
                        scriptContext.response.write({
                            output : "no shipping capacity record found."
                        })
                    }

                }
                else if(scriptContext.request.parameters.minimizeui == "prodcap")
                {
                    if(firstResult.custcol_anc_prodcapweek_id && firstResult.custcol_anc_prodcapweek_id.value)
                    {
                        log.debug("firstResult.custcol_anc_shipmentcap_id", firstResult.custcol_anc_prodcapweek_id)
                        redirect.toRecord({
                            type : "customrecord_anc_production_capacity",
                            id : firstResult.custcol_anc_prodcapweek_id.value,
                            // parameters : {}
                        })
                        return;
                    }
                    else
                    {
                        scriptContext.response.write({
                            output : "no production capacity record found."
                        })
                    }

                }
                else if(scriptContext.request.parameters.minimizeui == "salesforecast")
                {
                    if(firstResult.custcol_anc_customeralloc_caid && firstResult.custcol_anc_customeralloc_caid.value)
                    {
                        log.debug("firstResult.custcol_anc_shipmentcap_id", firstResult.custcol_anc_customeralloc_caid)
                        redirect.toRecord({
                            type : "customrecord_anc_pf_",
                            id : firstResult.custcol_anc_customeralloc_caid.value,
                            // parameters : {}
                        })
                        return;
                    }
                    else
                    {
                        scriptContext.response.write({
                            output : "no salesforecast record found."
                        })
                    }

                }

                if(elements[minimize_ui_processid].upsertAndRedirect)
                {
                    log.debug("upsertAndRedirect firstResult", firstResult)
                    var filters = elements[minimize_ui_processid].upsertAndRedirect.filters.map(function(elem){

                        log.debug("elem", elem)
                        log.debug("firstResult", firstResult)
                        log.debug("elem.firstresultsourcevalue", elem.firstresultsourcevalue)
                        log.debug("firstResult[elem.firstresultsourcevalue]", firstResult[elem.firstresultsourcevalue])
                        elem.values = firstResult[elem.firstresultsourcevalue].value;
                        elem = search.createFilter(elem);
                        return elem;
                    });
                    log.debug("upsertAndRedirect filters", filters)
                    elements[minimize_ui_processid].upsertAndRedirect.filters.forEach(function(elem){
                        elem = search.createFilter(elem);
                        elem.values = firstResult[elem.firstresultsourcevalue];
                    });
                    log.debug("upsertAndRedirect filters", filters);
                    var searchObj = search.create({
                        type : "customrecord_anc_orderlinenotes",
                        filters : filters
                    });

                    var targetOrderLineNotes = null;
                    searchObj.run().each(function(res){

                        log.debug("upsertAndRedirect res", res);
                        targetOrderLineNotes = res.id;
                        return false;
                    });
                    if(!targetOrderLineNotes)
                    {
                        var targetOrderLineNotesRecObj = record.create({
                            type : "customrecord_anc_orderlinenotes"
                        });
                        elements[minimize_ui_processid].upsertAndRedirect.filters.forEach(function(elem){

                            if(elem.targetFieldId && elem.doSource)
                            {
                                targetOrderLineNotesRecObj.setValue({
                                    fieldId : elem.targetFieldId,
                                    value : elem.values
                                })
                            }
                            //TODO flawed, this targetting of line only works for targetOrderLineNotes, cant source map more, but ordernotes is the only one using this anyway



                        });
                        var targetOrderLineNotes = targetOrderLineNotesRecObj.save({
                            ignoreMandatoryFields : true,
                            enableSourcing : true
                        })

                        log.debug("targetOrderLineNotes", targetOrderLineNotes);
                    }
                    else
                    {

                    }
                    //always redirect. see if it will work with empty val;

                    if(targetOrderLineNotes)
                    {
                        // var params = elements[minimize_ui_processid].upsertAndRedirect.overridableRedirectParams;
                        // for(var key in elements[minimize_ui_processid].upsertAndRedirect.overridableRedirectParams)
                        // {
                        //     params[key] = firstResult[elements[minimize_ui_processid].upsertAndRedirect.overridableRedirectParams[key]]
                        // }
                        //
                        // log.debug("redirectparams", params);

                        redirect.toRecord({
                            type : "customrecord_anc_orderlinenotes",
                            id : targetOrderLineNotes || null,
                            isEditMode : true
                        })
                    }
                    else
                    {
                        // var params = elements[minimize_ui_processid].upsertAndRedirect.overridableRedirectParams;
                        // for(var key in elements[minimize_ui_processid].upsertAndRedirect.overridableRedirectParams)
                        // {
                        //     params[key] = firstResult[elements[minimize_ui_processid].upsertAndRedirect.overridableRedirectParams[key]]
                        // }
                        //
                        // log.debug("redirectparams", params);

                        redirect.toRecord({
                            type : "customrecord_anc_orderlinenotes",
                            id : null,
                            isEditMode : true,
                            params : {
                                custrecord_anc_oln_traninternalid : elements[minimize_ui_processid].upsertAndRedirect.overridableRedirectParams
                            }
                        })
                    }



                    return;
                }


                if(elements[minimize_ui_processid].upsertAndRedirect_headeronly)
                {
                    log.debug("upsertAndRedirect_headeronly firstResult", firstResult);
                    var filters = elements[minimize_ui_processid].upsertAndRedirect_headeronly.filters.map(function(elem){

                        log.debug(" upsertAndRedirect_headeronlyelem", elem)
                        log.debug("upsertAndRedirect_headeronly firstResult", firstResult)
                        log.debug("upsertAndRedirect_headeronly elem.firstresultsourcevalue", elem.firstresultsourcevalue)
                        log.debug("upsertAndRedirect_headeronly firstResult[elem.firstresultsourcevalue]", firstResult[elem.firstresultsourcevalue])
                        elem.values = firstResult[elem.firstresultsourcevalue].value;
                        elem = search.createFilter(elem);
                        return elem;
                    });
                    log.debug("upsertAndRedirect_headeronly filters", filters)
                    elements[minimize_ui_processid].upsertAndRedirect_headeronly.filters.forEach(function(elem){
                        elem = search.createFilter(elem);
                        elem.values = firstResult[elem.firstresultsourcevalue];
                    });
                    log.debug("upsertAndRedirect_headeronly filters", filters);
                    var searchObj = search.create({
                        type : "customrecord_anc_orderlinenotes",
                        filters : filters
                    });

                    var targetOrderLineNotes = null;
                    searchObj.run().each(function(res){

                        log.debug("upsertAndRedirect_headeronly res", res);
                        targetOrderLineNotes = res.id;
                        return false;
                    });
                    if(!targetOrderLineNotes)
                    {
                        var targetOrderLineNotesRecObj = record.create({
                            type : "customrecord_anc_orderlinenotes"
                        });
                        elements[minimize_ui_processid].upsertAndRedirect_headeronly.filters.forEach(function(elem){

                            if(elem.targetFieldId && elem.doSource)
                            {
                                targetOrderLineNotesRecObj.setValue({
                                    fieldId : elem.targetFieldId,
                                    value : elem.values
                                })
                            }
                            //TODO flawed, this targetting of line only works for targetOrderLineNotes, cant source map more, but ordernotes is the only one using this anyway



                        });
                        var targetOrderLineNotes = targetOrderLineNotesRecObj.save({
                            ignoreMandatoryFields : true,
                            enableSourcing : true
                        })

                        log.debug("targetOrderLineNotes", targetOrderLineNotes);
                    }
                    else
                    {

                    }
                    //always redirect. see if it will work with empty val;

                    if(targetOrderLineNotes)
                    {
                        // var params = elements[minimize_ui_processid].upsertAndRedirect.overridableRedirectParams;
                        // for(var key in elements[minimize_ui_processid].upsertAndRedirect.overridableRedirectParams)
                        // {
                        //     params[key] = firstResult[elements[minimize_ui_processid].upsertAndRedirect.overridableRedirectParams[key]]
                        // }
                        //
                        // log.debug("redirectparams", params);

                        redirect.toRecord({
                            type : "customrecord_anc_orderlinenotes",
                            id : targetOrderLineNotes || null,
                            isEditMode : true
                        })
                    }
                    else
                    {
                        // var params = elements[minimize_ui_processid].upsertAndRedirect.overridableRedirectParams;
                        // for(var key in elements[minimize_ui_processid].upsertAndRedirect.overridableRedirectParams)
                        // {
                        //     params[key] = firstResult[elements[minimize_ui_processid].upsertAndRedirect.overridableRedirectParams[key]]
                        // }
                        //
                        // log.debug("redirectparams", params);

                        redirect.toRecord({
                            type : "customrecord_anc_orderlinenotes",
                            id : null,
                            isEditMode : true,
                            params : {
                                custrecord_anc_oln_traninternalid : elements[minimize_ui_processid].upsertAndRedirect_headeronly.overridableRedirectParams
                            }
                        })
                    }



                    return;
                }


                for(var a = 0 ; a < elements[minimize_ui_processid].bodyfieldgroups.list.length ; a++)
                {
                    var widgetObj = elements[minimize_ui_processid].bodyfieldgroups.list[a];
                    var uiWidgetObj = form.addFieldGroup(widgetObj);

                    globalrefs["uiWidgetObj_" + widgetObj.id] = uiWidgetObj;
                }
                for(var a = 0 ; a < elements[minimize_ui_processid].bodyfields.list.length ; a++)
                {
                    var widgetObj = elements[minimize_ui_processid].bodyfields.list[a];
                    var uiWidgetObj = form.addField(widgetObj);
                    if(widgetObj.displayType)
                    {
                        uiWidgetObj.updateDisplayType(widgetObj.displayType)
                    }
                    if(widgetObj.updateBreakType)
                    {
                        uiWidgetObj.updateBreakType(widgetObj.updateBreakType)
                    }
                    if(widgetObj.updateLayoutType)
                    {
                        uiWidgetObj.updateLayoutType(widgetObj.updateLayoutType)
                    }
                    if(widgetObj.defaultValue || widgetObj.defaultValue == "0" || widgetObj.defaultValue === false)
                    {
                        uiWidgetObj.defaultValue = widgetObj.defaultValue
                    }

                    //dont compare with 0 or false, they might be actual values?
                    if(tmfirstResult && widgetObj.sourceIntegrationKey /*|| widgetObj.sourceIntegrationKey == "0" || widgetObj.sourceIntegrationKey === false*/)
                    {
                        log.debug("tmfirstResult[widgetObj.sourceSearchKey]", tmfirstResult[widgetObj.sourceSearchKey]);
                        uiWidgetObj.defaultValue = tmfirstResult[widgetObj.sourceIntegrationKey];
                        log.debug("set value tmfirstResult[widgetObj.sourceSearchKey]", tmfirstResult[widgetObj.sourceSearchKey])
                    }
                    //TODO else ensures other sources dont override it
                    else if(firstResult && widgetObj.sourceSearchKey || widgetObj.sourceSearchKey == "0" || widgetObj.sourceSearchKey === false)
                    {
                        // uiWidgetObj.defaultValue = widgetObj.defaultValue
                        log.debug("firstResult[widgetObj.sourceSearchKey]", firstResult[widgetObj.sourceSearchKey]);
                        if(firstResult[widgetObj.sourceSearchKey])
                        {
                            uiWidgetObj.defaultValue = firstResult[widgetObj.sourceSearchKey].value;
                        }
                        log.debug("set value firstResult[widgetObj.sourceSearchKey]", firstResult[widgetObj.sourceSearchKey])
                    }



                    globalrefs["uiWidgetObj_" + widgetObj.id] = uiWidgetObj;
                }

                //add sublist 06132025
                for(var a = 0 ; a < elements[minimize_ui_processid].sublists.list.length ; a++)
                {
                    var sublistObj = form.addSublist(elements[minimize_ui_processid].sublists.list[a]);

                    for(var b = 0 ; b < elements[minimize_ui_processid].sublists.list[a].sublistFields.length ; b++)
                    {
                        var widgetObj = elements[minimize_ui_processid].sublists.list[a].sublistFields[b];
                        log.debug("widgetObj", widgetObj);
                        var uiWidgetObj = sublistObj.addField(widgetObj);
                        if(widgetObj.displayType)
                        {
                            uiWidgetObj.updateDisplayType(widgetObj.displayType)
                        }
                        if(widgetObj.updateBreakType)
                        {
                            uiWidgetObj.updateBreakType(widgetObj.updateBreakType)
                        }
                        if(widgetObj.defaultValue || widgetObj.defaultValue == "0" || widgetObj.defaultValue === false)
                        {
                            uiWidgetObj.defaultValue = widgetObj.defaultValue
                        }




                    }

                    //
                    if(elements[minimize_ui_processid].sublists.list[a].filters &&
                        elements[minimize_ui_processid].sublists.list[a].columns)
                    {
                        // elements[minimize_ui_processid].sublists.list[a].filter = elements[minimize_ui_processid].sublists.list[a].filters.concat(
                        //     [
                        //         "AND",
                        //         // ["internalid","anyof",[scriptContext.request.parameters.traninternalid]],
                        //         ["custcol_anc_relatedlineuniquekey","is",[firstResult.tranline_lineuniquekey.value]],
                        //     ]
                        // )
                        if(minimize_ui_processid == "shipments" && elements[minimize_ui_processid].sublists.list[a].label == "Shipments")
                        {
                            elements[minimize_ui_processid].sublists.list[a].filters = elements[minimize_ui_processid].sublists.list[a].filters.concat(
                                [
                                    "AND",
                                    // ["internalid","anyof",[scriptContext.request.parameters.traninternalid]],
                                    ["custcol_anc_relatedlineuniquekey","is",[firstResult.tranline_lineuniquekey.value]],
                                ]
                            )
                        }

                        log.debug("elements[minimize_ui_processid].sublists.list[a].filters", elements[minimize_ui_processid].sublists.list[a].filters);

                        // return;

                        var transactionSearchObj = search.create({
                            type:elements[minimize_ui_processid].sublists.list[a].searchtype,
                            filters:
                            elements[minimize_ui_processid].sublists.list[a].filters,
                            columns:
                            elements[minimize_ui_processid].sublists.list[a].columns
                        });
                        var searchResultCount = transactionSearchObj.runPaged().count;
                        log.debug("transactionSearchObj result count",searchResultCount);

                        if(elements[minimize_ui_processid].sublists.list[a].listCounter_bodyField)
                        {
                            var listCounterFieldObj = form.getField({id:elements[minimize_ui_processid].sublists.list[a].listCounter_bodyField});
                            listCounterFieldObj.defaultValue = searchResultCount;

                        }

                        var resCounter = 0;
                        transactionSearchObj.run().each(function(result){
                            // .run().each has a limit of 4,000 results


                            for(var b = 0 ; b < elements[minimize_ui_processid].sublists.list[a].sublistFields.length ; b++)
                            {
                                var resObjBykey = {};
                                for(var c = 0 ; c < elements[minimize_ui_processid].sublists.list[a].columns.length ; c++)
                                {
                                    srCol = elements[minimize_ui_processid].sublists.list[a].columns[c]
                                    resObjBykey[srCol.label] = result.getValue(srCol)
                                }

                                var widgetObj = elements[minimize_ui_processid].sublists.list[a].sublistFields[b];
                                log.debug("fillup sublist widgetObj", widgetObj)
                                log.debug("fillup sublist resObjBykey", resObjBykey)
                                if(resObjBykey[widgetObj.sourceSearchKey])
                                {
                                    if(widgetObj.type == "checkbox")
                                    {
                                        sublistObj.setSublistValue({
                                            id : widgetObj.id,
                                            line : resCounter,
                                            value : resObjBykey[widgetObj.sourceSearchKey] ? 'T' : 'F'
                                        })
                                    }
                                    else
                                    {
                                        sublistObj.setSublistValue({
                                            id : widgetObj.id,
                                            line : resCounter,
                                            value : resObjBykey[widgetObj.sourceSearchKey]
                                        })
                                    }
                                }

                            }

                            resCounter++;
                            return true;
                        });
                    }

                    if(elements[minimize_ui_processid].sublists.list[a].updateTotallingFieldId)
                    {
                        sublistObj.updateTotallingFieldId({
                            id: elements[minimize_ui_processid].sublists.list[a].updateTotallingFieldId
                        });
                    }

                    // var widgetObj = elements[minimize_ui_processid].bodyfields.list[a];
                    // var uiWidgetObj = form.addField(widgetObj);
                    // if(widgetObj.displayType)
                    // {
                    //     uiWidgetObj.updateDisplayType(widgetObj.displayType)
                    // }
                    // if(widgetObj.updateBreakType)
                    // {
                    //     uiWidgetObj.updateBreakType(widgetObj.updateBreakType)
                    // }
                    // if(widgetObj.defaultValue || widgetObj.defaultValue == "0" || widgetObj.defaultValue === false)
                    // {
                    //     uiWidgetObj.defaultValue = widgetObj.defaultValue
                    // }
                    //
                    // if(firstResult && widgetObj.sourceSearchKey || widgetObj.sourceSearchKey == "0" || widgetObj.sourceSearchKey === false)
                    // {
                    //     // uiWidgetObj.defaultValue = widgetObj.defaultValue
                    //     log.debug("firstResult[widgetObj.sourceSearchKey]", firstResult[widgetObj.sourceSearchKey]);
                    //     uiWidgetObj.defaultValue = firstResult[widgetObj.sourceSearchKey].value;
                    //     log.debug("set value firstResult[widgetObj.sourceSearchKey]", firstResult[widgetObj.sourceSearchKey])
                    // }
                    //
                    //
                    //
                    // globalrefs["uiWidgetObj_" + widgetObj.id] = uiWidgetObj;
                }


                form.addSubmitButton({
                    label : "Ok"
                })

                scriptContext.response.writePage(form);
            }
            catch(e)
            {
                log.error("ERROR in function generateForm", e);
            }
        }

        function updateRecord(scriptContext)
        {
            try
            {
                var custpage_minimizeui = scriptContext.request.parameters.custpage_minimizeui;
                var custpage_traninternalid = scriptContext.request.parameters.custpage_traninternalid;
                var custpage_tranlinenum = scriptContext.request.parameters.custpage_tranlinenum;
                if(custpage_minimizeui)
                {
                    getElements(scriptContext);
                    if(elements[custpage_minimizeui])
                    {
                        var bodyFieldsList = elements[custpage_minimizeui].bodyfields.list;

                        var colsToUpdateCount = 0;
                        if(bodyFieldsList && bodyFieldsList.length > 0)
                        {
                            var soRecObj = record.load({
                                type : "salesorder",
                                id : custpage_traninternalid
                            });

                            var targetIndex = soRecObj.findSublistLineWithValue({
                                sublistId : "item",
                                fieldId : "line",
                                value : custpage_tranlinenum
                            });

                            if(targetIndex != -1)
                            {
                                for(var a = 0 ; a < bodyFieldsList.length; a++)
                                {

                                    if(bodyFieldsList[a].targetColumnId)
                                    {
                                        var oldValue = soRecObj.getSublistValue({
                                            sublistId : "item",
                                            fieldId : bodyFieldsList[a].targetColumnId,
                                            line : targetIndex,
                                            value : targetColumnValue
                                        })

                                        var targetColumnValue = scriptContext.request.parameters[bodyFieldsList[a].id];


                                        if(oldValue != targetColumnValue)
                                        {
                                            soRecObj.setSublistValue({
                                                sublistId : "item",
                                                fieldId : bodyFieldsList[a].targetColumnId,
                                                line : targetIndex,
                                                value : targetColumnValue
                                            })
                                            colsToUpdateCount++;
                                        }
                                    }

                                }



                                //05122025 - UE now handles optimization method
                                // var targetColumnValue = scriptContext.request.parameters["custpage_tranlinetransittom"];
                                //
                                // var searchFilters = [
                                //     ["type","anyof","SalesOrd"],
                                //     "AND",
                                //     ["mainline","is","F"],
                                //     "AND",
                                //     ["taxline","is","F"],
                                // ];
                                // if(searchFilters)
                                // {
                                //     searchFilters.push("AND")
                                //     searchFilters.push(["internalid", "anyof", scriptContext.request.parameters.custpage_traninternalid])
                                //     searchFilters.push("AND")
                                //     searchFilters.push(["line", "equalto", scriptContext.request.parameters.custpage_tranlinenum])
                                //
                                // }
                                //
                                //
                                // log.debug("searchFilters", searchFilters);
                                //
                                // var post_searchObj = search.create({
                                //     type: "salesorder",
                                //     settings:[{"name":"consolidationtype","value":"ACCTTYPE"}],
                                //     filters : searchFilters,
                                //     columns : [
                                //         search.createColumn({
                                //             name : "location"
                                //         }),
                                //         search.createColumn({
                                //             name : "custrecord_alberta_ns_city",
                                //             join : ANC_lib.references.SO_COLUMNS.CONSIGNEECOL.id,
                                //             label : "consignee city"
                                //         }),
                                //         search.createColumn({
                                //             name : "location"
                                //         }),
                                //     ],
                                // })
                                //
                                // var sr = getResults(post_searchObj.run());
                                // log.debug("sr", sr)
                                // var originloc = "";
                                // var destCity = "";
                                // for(var a = 0 ; a < sr.length ; a++)
                                // {
                                //     originloc = sr[a].getValue(search.createColumn({
                                //         name : "location"
                                //     }))
                                //
                                //     destCity = sr[a].getValue(search.createColumn({
                                //         name : "custrecord_alberta_ns_city",
                                //         join : ANC_lib.references.SO_COLUMNS.CONSIGNEECOL.id,
                                //         label : "consignee city"
                                //     }))
                                //
                                // }
                                //
                                // log.debug("{targetColumnValue, originloc, destCity}", {targetColumnValue, originloc, destCity})
                                // var newLineDetails = resolveLane(targetColumnValue, originloc, destCity);
                                //
                                // log.debug("bodyFieldsList[a].targetColumnId", {colId : bodyFieldsList[a].targetColumnId, colVal : targetColumnValue})
                                //
                                // soRecObj.setSublistValue({
                                //     sublistId : "item",
                                //     fieldId : ANC_lib.references.SO_COLUMNS.SHIPPINGLANE.id,
                                //     value : newLineDetails.laneid,
                                //     line : targetIndex
                                // })
                                //
                                // soRecObj.setSublistValue({
                                //     sublistId : "item",
                                //     fieldId : ANC_lib.references.SO_COLUMNS.EQUIPMENT.id,
                                //     value : newLineDetails.eqid,
                                //     line : targetIndex
                                // })





                                if(colsToUpdateCount > 0)
                                {
                                    var submittedSoRecId = soRecObj.save({
                                        ignoreMandatoryFields : true,
                                        enableSourcing : true
                                    });

                                    log.debug("submittedSoRecId", submittedSoRecId);
                                }
                            }
                            else
                            {
                                log.error("CANNOT FIND SUBLIST LINE", {targetIndex, custpage_tranlinenum})
                            }

                        }
                    }
                }
            }
            catch(e)
            {
                log.error("ERROR in function updateRecord", e);
            }
        }


        function resolveLane(tom, originloc, targetloc)
        {
            var resolveLaneObj = {};
            if(tom && originloc && targetloc)
            {
                var tomFilter = [];
                var LCTT_EQUIP = search.createColumn({
                    name : "custrecord_anc_lane_lce",
                    join : null,
                    label : "LCTT_equip",
                    sort : "ASC"
                });
                var LCTT_BASIS = search.createColumn({
                    name : "custrecord_anc_lane_lctt",
                    join : null,
                    label : "LCTT",
                    sort : "ASC",
                    eqfield : JSON.parse(JSON.stringify(LCTT_EQUIP)) //TODO this does not work!!!
                });

                var FTT_EQUIP = search.createColumn({
                    name : "custrecord_anc_lane_ftte",
                    join : null,
                    label : "FTT_equip",
                    sort : "ASC"
                });
                var FTT_BASIS = search.createColumn({
                    name : "custrecord_anc_lane_ftt",
                    join : null,
                    label : "LCTT",
                    sort : "ASC",
                    eqfield : JSON.parse(JSON.stringify(FTT_EQUIP))
                });

                var defining_basis = LCTT_BASIS;
                var defining_eq = LCTT_EQUIP;
                if(tom == 1)
                {
                    defining_basis = LCTT_BASIS;
                    defining_eq = LCTT_EQUIP
                    tomFilter = [LCTT_BASIS.name, "notempty"]
                }
                else if(tom == 2)
                {
                    defining_basis = FTT_BASIS;
                    defining_eq = FTT_EQUIP
                    tomFilter = [FTT_BASIS.name, "notempty"]
                }
                else
                {
                    defining_basis = LCTT_BASIS;
                    defining_eq = LCTT_EQUIP
                    tomFilter = [LCTT_BASIS.name, "notempty"]
                }

                var laneSearchObj = search.create({
                    type : "customrecord_anc_shippinglanes",
                    filters :
                        [
                            ["custrecord_anc_lane_originwarehouse", "anyof", [originloc]],
                            "AND",
                            ["custrecord_anc_lane_destinationcity", "is", targetloc],
                            // "AND",
                            // tomFilter
                        ],
                    columns : [
                        defining_basis,
                        FTT_EQUIP,FTT_BASIS,LCTT_EQUIP,LCTT_BASIS,
                        defining_eq

                    ]
                });

                log.debug("laneSearchObj", laneSearchObj);
                // laneSearchObj.title = "customsearch_anc0429rod_DBFIRST" + new Date().getTime();
                // laneSearchObj.save();

                laneSearchObj.run().each(function(res){
                    resolveLaneObj.laneid = res.id
                    // resolveLaneObj.eqid = res.getValue(defining_basis.eqfield);
                    resolveLaneObj.eqid = res.getValue(laneSearchObj.columns[5]);
                    return false;
                })
            }
            else
            {
                throw "Cannot resolve lane, origin/destination/Transport Optimization Method Missing"
            }
            log.debug("resolveLaneObj", resolveLaneObj);
            return resolveLaneObj;
        }

        const onRequest = (scriptContext) =>
        {
            minimize_ui_processid = scriptContext.request.parameters.minimizeui || scriptContext.request.parameters.custpage_minimizeui

            log.debug("minimize_ui_processid", minimize_ui_processid);

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


                    getElements(scriptContext);

                    // log.debug("scriptContext.request.parameters.minimizeui", scriptContext.request.parameters.minimizeui);
                    //
                    // log.debug("elements", elements);

                    generateForm(scriptContext)
                }
                else
                {
                    log.debug("POST, Submitted", scriptContext);


                    updateRecord(scriptContext)


                    var currScript = runtime.getCurrentScript()
                    redirect.toSuitelet({
                        scriptId : currScript.id,
                        deploymentId : currScript.deploymentId,
                        parameters : {
                            minimizeui : scriptContext.request.parameters.custpage_minimizeui,
                            traninternalid : scriptContext.request.parameters.custpage_traninternalid,
                            tranlinenum : scriptContext.request.parameters.custpage_tranlinenum,
                            tranlinesequence : scriptContext.request.parameters.custpage_tranlinesequence,
                            sl_posted : "T",
                        }
                    })


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

                if(scriptContext.request.parameters["traninternalid"])
                {
                    filters.push("AND")
                    filters.push(["internalid","anyof",scriptContext.request.parameters["traninternalid"]])
                }
                if(scriptContext.request.parameters["tranlinenum"])
                {
                    filters.push("AND")
                    filters.push(["line","equalto",scriptContext.request.parameters["tranlinenum"]])
                }

                log.debug("filters", filters)

                var salesorderSearchObj = search.create({
                    type: "salesorder",
                    settings:[{"name":"consolidationtype","value":"ACCTTYPE"}],
                    filters: filters,
                    columns:
                        [
                            search.createColumn({name: "statusref", label: "status"}),
                            search.createColumn({name: "mainname", label: "entity"}),
                            search.createColumn({name: "item", label: "line_item"}),
                            search.createColumn({
                                name: "parent",
                                join: "item",
                                label: "line_item_parent"
                            }),
                            search.createColumn({name: "quantity", label: "line_quantity"}),
                            search.createColumn({name: "location", label: "line_location"}),
                            search.createColumn({name: "line", label: "line_id"}),
                            search.createColumn({name: "linesequencenumber", label: "line_sequencenumber"}),
                            search.createColumn({name: "lineuniquekey", label: "line_uniquekey"}),
                            // search.createColumn({name: "custcol_010linememoinstruction", label: "line_memo"})
                        ]
                });
                var searchResultCount = salesorderSearchObj.runPaged().count;
                log.debug("salesorderSearchObj result count",searchResultCount);
                // salesorderSearchObj.run().each(function(result){
                //     // .run().each has a limit of 4,000 results
                //     return true;
                // });

                var sr = getResults(salesorderSearchObj.run());

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
                    var multiGradeIndex = 0;
                    for(var b = 0; b < fitmentLineLimit; b++)
                    {
                        if(resObjByColumnKey.line_item)
                        {
                            fitmentReservationSublist.setSublistValue({
                                id : "custpage_ifr_item",
                                line : multiGradeIndex || b,
                                value : resObjByColumnKey.line_item || globalrefs.tranItemVals.itemid
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



