/**
 * @NApiVersion 2.1
 * @NScriptType UserEventScript
 *
 * Author       :       Rodmar Dimasaca / rod@joycloud.solutions / netrodsuite@gmail.com
 * Description  :       For ANC
 * File Name    :       ANC_UE_SHIPMENT.js
 * Script Name  :       ANC UE SHIPMENT
 * Script Id    :       customscript_ue_shipment
 * Deployment Id:       customdeploy_ue_shipment
 * API Version  :       2.1
 * version      :       1.0.0
 *
 * Notes        :       function checkChanges just needs to detect equipment changes, no longer needed for shipdate changes
 *                      add field Origin to checkChanges, where origin is location
 *
 */
define(['/SuiteScripts/ANC_lib.js','N/query', 'N/format', 'N/search', 'N/https', 'N/record', 'N/runtime', 'N/ui/dialog', 'N/ui/message', 'N/ui/serverWidget', 'N/url'],
    /**
     * @param{https} https
     * @param{record} record
     * @param{runtime} runtime
     * @param{dialog} dialog
     * @param{message} message
     * @param{serverWidget} serverWidget
     * @param{url} url
     */
    (ANC_lib, query, format, search, https, record, runtime, dialog, message, serverWidget, url) => {
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
            }
            catch(e)
            {
                log.error("ERROR in function beforeLoad", e);
            }
        }

        const afterSubmit = (scriptContext) =>
        {
            try
            {
                checkChanges(scriptContext);
            }
            catch(e)
            {
                log.error("ERROR in function afterSubmit", e)
            }
        }

        const checkChanges = (scriptContext) =>
        {
            try
            {
                var oldRecord = scriptContext.oldRecord;
                var newRecord = scriptContext.newRecord;

                if(scriptContext.type != "delete")
                {
                    var liveRecord = record.load({
                        type : scriptContext.newRecord.type,
                        id : scriptContext.newRecord.id
                    })

                    implementShipCap_shipments(liveRecord);


                    if(oldRecord)
                    {
                        var oldRecord_equipment = oldRecord.getValue({
                            fieldId : ANC_lib.references.RECTYPES.shipment.fields.equipment
                        })
                        var newRecord_equipment = newRecord.getValue({
                            fieldId : ANC_lib.references.RECTYPES.shipment.fields.equipment
                        })

                        //09132025 - additional fields defined
                        var oldRecord_shipdate = oldRecord.getText({
                            fieldId : ANC_lib.references.RECTYPES.shipment.fields.shipdate
                        })
                        var newRecord_shipdate = newRecord.getText({
                            fieldId : ANC_lib.references.RECTYPES.shipment.fields.shipdate
                        })

                        var oldRecord_origin = oldRecord.getValue({
                            fieldId : "location"
                        })
                        var newRecord_origin = newRecord.getValue({
                            fieldId : "location"
                        })

                        //08142025 - when status change from ? to Shipped, then create item fulfillment
                        var oldRecord_status = oldRecord.getValue({
                            fieldId : ANC_lib.references.RECTYPES.shipment.fields.shipstatus
                        })
                        var newRecord_status = newRecord.getValue({
                            fieldId : ANC_lib.references.RECTYPES.shipment.fields.shipstatus
                        })

                        log.debug("{oldRecord_equipment, newRecord_equipment}", {oldRecord_equipment, newRecord_equipment})
                        log.debug("{oldRecord_shipdate, newRecord_shipdate}", {oldRecord_shipdate, newRecord_shipdate})
                        log.debug("{oldRecord_origin, newRecord_origin}", {oldRecord_origin, newRecord_origin})
                        log.debug("{oldRecord_status, newRecord_status}", {oldRecord_status, newRecord_status})


                        if(newRecord_equipment && (oldRecord_equipment != newRecord_equipment))
                        {
                            updateNeedsRebuildFlag(scriptContext, liveRecord);
                        }
                        else if(newRecord_shipdate && (oldRecord_shipdate != newRecord_shipdate))
                        {
                            updateNeedsRebuildFlag(scriptContext, liveRecord);
                        }
                        else if(newRecord_origin && (oldRecord_origin != newRecord_origin))
                        {
                            updateNeedsRebuildFlag(scriptContext, liveRecord);
                        }







                        //5 ship status is Shipped
                        //TODO shipdate is blank upon submitfield
                        if(/*true || */(/*newRecord_shipdate &&*/ (oldRecord_status != 5 && newRecord_status == 5)))
                        {
                            var shipment_so_solineuniquekey = {};

                            var shipmentLineDetails = getShipmentLineDetails(liveRecord);
                            log.debug("shipmentLineDetails", shipmentLineDetails);

                            //TODO
                            var shipmentLineDetails_bySoInternalid = getShipmentLineDetails_bySoInternalid(shipmentLineDetails, "so_internalid", "");
                            var shipmentLineDetails_byToInternalid = getShipmentLineDetails_bySoInternalid(shipmentLineDetails, "to_internalid", "");


                            var shipmentLeg = liveRecord.getValue({fieldId : "custbody_anc_shipment_leg"});
                            var transformSalesOrders_result = null;
                            log.debug("shipmentLeg", shipmentLeg);
                            if(shipmentLeg == 2)
                            {
                                transformSalesOrders_result = transformSalesOrders(shipmentLineDetails_bySoInternalid, liveRecord);
                            }
                            else if(shipmentLeg == 1)
                            {
                                transformSalesOrders_result = transformTransferOrders(shipmentLineDetails_byToInternalid, liveRecord);
                            }
                            else if(shipmentLeg === 0 || shipmentLeg === "0")
                            {
                                transformSalesOrders_result = transformSalesOrders(shipmentLineDetails_bySoInternalid, liveRecord);
                            }
                            else //by default then it is a direct transfer
                            {
                                transformSalesOrders_result = transformSalesOrders(shipmentLineDetails_byToInternalid, liveRecord);
                            }

                            log.debug("transformSalesOrders_result", transformSalesOrders_result)
                        }
                        else if(/*true || */(/*newRecord_shipdate &&*/ (oldRecord_status != 6 && newRecord_status == 6)))
                        {
                            var shipment_so_solineuniquekey = {};

                            var shipmentLineDetails = getShipmentLineDetails(liveRecord);
                            log.debug("shipmentLineDetails", shipmentLineDetails);

                            //TODO
                            var shipmentLineDetails_bySoInternalid = getShipmentLineDetails_bySoInternalid(shipmentLineDetails, "so_internalid", "");
                            var shipmentLineDetails_byToInternalid = getShipmentLineDetails_bySoInternalid(shipmentLineDetails, "to_internalid", "");


                            var shipmentLeg = liveRecord.getValue({fieldId : "custbody_anc_shipment_leg"});
                            var transformSalesOrders_result = null;
                            log.debug("shipmentLeg", shipmentLeg);
                            if(shipmentLeg == 2)
                            {
                                transformSalesOrders_result = transformSalesOrders_invoice(shipmentLineDetails_bySoInternalid, liveRecord);
                            }
                            else if(shipmentLeg == 1)
                            {
                                transformSalesOrders_result = transformTransferOrders_receive(shipmentLineDetails_byToInternalid, liveRecord);
                            }
                            else if(shipmentLeg == 0)
                            {
                                transformSalesOrders_result = transformSalesOrders_invoice(shipmentLineDetails_bySoInternalid, liveRecord);
                            }
                            else //by default then it is a direct transfer
                            {
                                transformSalesOrders_result = transformTransferOrders_receive(shipmentLineDetails_byToInternalid, liveRecord);
                            }

                            log.debug("transformSalesOrders_result", transformSalesOrders_result)
                        }

                    }

                    var submittedShipmentRecId = liveRecord.save({
                        ignoreMandatoryFields : true,
                        enableSourcing : true
                    });
                    log.debug("checkChanges submittedShipmentRecId", submittedShipmentRecId);
                }
            }
            catch(e)
            {
                log.error("ERROR in function checkChanges", e)
            }
        }

        const transformSalesOrders = (shipmentLineDetails_bySoInternalid, liveRecord) => {
            const transformSalesOrders_results = { list: [], fulfillmentlist: [], invoicelist: [] };
            try {

                for (let salesOrderInternalId in shipmentLineDetails_bySoInternalid) {
                    const soLineDetails = shipmentLineDetails_bySoInternalid[salesOrderInternalId];


                    var itemFulfillmentRecObj = null;
                    if(soLineDetails.length > 0)
                    {
                        itemFulfillmentRecObj = record.transform({
                            fromType: "salesorder",
                            toType: "itemfulfillment",
                            fromId: salesOrderInternalId,
                            isDynamic: true
                        });
                        itemFulfillmentRecObj.setValue({
                            fieldId: "custbody_anc_createdfromshipment",
                            value: soLineDetails[0].custbody_anc_createdfromshipment // shipment's internalid
                        });
                        itemFulfillmentRecObj.setValue({
                            fieldId: "shipstatus",
                            value: "C" // PACKED
                        });
                    }
                    else
                    {
                        continue;
                    }

                    for (let a = 0; a < soLineDetails.length; a++) {
                        // Use dynamic mode here

                        const orderline = soLineDetails[a].so_lineuniquekey || soLineDetails[a].shipment_lineuniquekey;
                        log.debug("orderline", orderline);

                        const itemfulfillment_lineindex = itemFulfillmentRecObj.findSublistLineWithValue({
                            sublistId: "item",
                            fieldId: "custcol_anc_orig_uniquekeytracker",
                            value: "" + orderline
                        });
                        log.debug("itemfulfillment_lineindex", itemfulfillment_lineindex);

                        if (itemfulfillment_lineindex !== -1) {
                            // In dynamic mode: select the line and set current values
                            itemFulfillmentRecObj.selectLine({
                                sublistId: "item",
                                line: itemfulfillment_lineindex
                            });
                            itemFulfillmentRecObj.setCurrentSublistValue({
                                sublistId: "item",
                                fieldId: "itemreceive",
                                value: true
                            });
                            //TODO must do this because SO is using initial warehouse entry
                            itemFulfillmentRecObj.setCurrentSublistValue({
                                sublistId: "item",
                                fieldId: "location",
                                value: soLineDetails[a].location
                            });
                            itemFulfillmentRecObj.setCurrentSublistValue({
                                sublistId: "item",
                                fieldId: "quantity",
                                value: soLineDetails[a].shipmentqty
                            });

                            const itemFulfillmentRecObj_invDetail = itemFulfillmentRecObj.getCurrentSublistSubrecord({
                                sublistId: "item",
                                fieldId: "inventorydetail"
                            });

                            for (let c = 0; c < soLineDetails[a].invDetail.length; c++) {
                                const detail = soLineDetails[a].invDetail[c];
                                itemFulfillmentRecObj_invDetail.selectNewLine({
                                    sublistId: "inventoryassignment"
                                });
                                itemFulfillmentRecObj_invDetail.setCurrentSublistValue({
                                    sublistId: "inventoryassignment",
                                    fieldId: "issueinventorynumber",
                                    value: detail.issueinventorynumber
                                });
                                itemFulfillmentRecObj_invDetail.setCurrentSublistValue({
                                    sublistId: "inventoryassignment",
                                    fieldId: "quantity",
                                    value: Number(detail.issueinventorynumberqty)
                                });
                                itemFulfillmentRecObj_invDetail.commitLine({
                                    sublistId: "inventoryassignment"
                                });
                            }
                            itemFulfillmentRecObj.commitLine({ sublistId: "item" });
                        }
                    }
                    var submittedItemFulfillmentRecId = itemFulfillmentRecObj.save({
                        ignoreMandatoryFields: true,
                        enableSourcing: true
                    });
                    transformSalesOrders_results.list.push(submittedItemFulfillmentRecId);
                    transformSalesOrders_results.fulfillmentlist.push(submittedItemFulfillmentRecId);
                    log.debug("transformSalesOrders_results", transformSalesOrders_results);

                }
            } catch (e) {
                log.error("ERROR in function transformSalesOrders", e);
            }
            return transformSalesOrders_results;
        };
        const transformSalesOrders_invoice = (shipmentLineDetails_bySoInternalid, liveRecord) => {
            const transformSalesOrders_results = { list: [], fulfillmentlist: [], invoicelist: [] };
            try {

                for (let salesOrderInternalId in shipmentLineDetails_bySoInternalid) {
                    const soLineDetails = shipmentLineDetails_bySoInternalid[salesOrderInternalId];

                    const invoiceRecObj = record.transform({
                        fromType: "salesorder",
                        toType: "invoice",
                        fromId: salesOrderInternalId,
                        isDynamic: true
                    });

                    invoiceRecObj.setValue({
                        fieldId: "custbody_anc_invoice_int_only",
                        value: false
                    });
                    invoiceRecObj.setValue({
                        fieldId: "tobeemailed",
                        value: false
                    });
                    // invoiceRecObj.setValue({
                    //     fieldId: "custbody_010invoice_fulfillment_pair",
                    //     value: submittedItemFulfillmentRecId
                    // });

                    const submittedInvoiceId = invoiceRecObj.save({
                        ignoreMandatoryFields: true,
                        enableSourcing: true
                    });

                    transformSalesOrders_results.list.push(submittedInvoiceId);
                    transformSalesOrders_results.invoicelist.push(submittedInvoiceId);

                    // record.submitFields({
                    //     type: "itemfulfillment",
                    //     id: submittedItemFulfillmentRecId,
                    //     values: {
                    //         custbody_010invoice_fulfillment_pair: submittedInvoiceId
                    //     }
                    // });
                    //
                    // log.debug("{itemFulfillmentId, submittedInvoiceId}", {
                    //     itemFulfillmentId: submittedItemFulfillmentRecId,
                    //     submittedInvoiceId
                    // });
                }
            } catch (e) {
                log.error("ERROR in function transformSalesOrders", e);
            }
            return transformSalesOrders_results;
        };

        const transformTransferOrders = (shipmentLineDetails_bySoInternalid, liveRecord) => {
            const transformOrders_results = { list: [], fulfillmentlist: [], receiptlist: []};
            try {

                for (let salesOrderInternalId in shipmentLineDetails_bySoInternalid) {
                    const soLineDetails = shipmentLineDetails_bySoInternalid[salesOrderInternalId];

                    log.debug("transformTransferOrders soLineDetails", soLineDetails);
                    var itemFulfillmentRecObj = null;
                    if(soLineDetails.length > 0)
                    {
                        itemFulfillmentRecObj = record.transform({
                            fromType: "transferorder",
                            toType: "itemfulfillment",
                            fromId: salesOrderInternalId,
                            isDynamic: true
                        });
                        itemFulfillmentRecObj.setValue({
                            fieldId: "custbody_anc_createdfromshipment",
                            value: soLineDetails[0].custbody_anc_createdfromshipment // shipment's internalid
                        });
                        itemFulfillmentRecObj.setValue({
                            fieldId: "shipstatus",
                            value: "C" // PACKED
                        });
                    }
                    else
                    {
                        continue;
                    }

                    for (let a = 0; a < soLineDetails.length; a++) {
                        // Use dynamic mode here

                        log.debug("transformTransferOrders soLineDetails[a]", soLineDetails[a]);


                        const orderline = soLineDetails[a].to_lineuniquekey || soLineDetails[a].shipment_lineuniquekey;
                        log.debug("orderline", orderline);

                        const itemfulfillment_lineindex = itemFulfillmentRecObj.findSublistLineWithValue({
                            sublistId: "item",
                            fieldId: "custcol_anc_orig_uniquekeytracker",
                            value: "" + orderline
                        });
                        log.debug("itemfulfillment_lineindex", itemfulfillment_lineindex);

                        if (itemfulfillment_lineindex !== -1) {
                            // In dynamic mode: select the line and set current values
                            itemFulfillmentRecObj.selectLine({
                                sublistId: "item",
                                line: itemfulfillment_lineindex
                            });
                            itemFulfillmentRecObj.setCurrentSublistValue({
                                sublistId: "item",
                                fieldId: "itemreceive",
                                value: true
                            });
                            itemFulfillmentRecObj.setCurrentSublistValue({
                                sublistId: "item",
                                fieldId: "quantity",
                                value: soLineDetails[a].shipmentqty
                            });

                            const itemFulfillmentRecObj_invDetail = itemFulfillmentRecObj.getCurrentSublistSubrecord({
                                sublistId: "item",
                                fieldId: "inventorydetail"
                            });

                            for (let c = 0; c < soLineDetails[a].invDetail.length; c++) {
                                const detail = soLineDetails[a].invDetail[c];
                                itemFulfillmentRecObj_invDetail.selectNewLine({
                                    sublistId: "inventoryassignment"
                                });
                                itemFulfillmentRecObj_invDetail.setCurrentSublistValue({
                                    sublistId: "inventoryassignment",
                                    fieldId: "issueinventorynumber",
                                    value: detail.issueinventorynumber
                                });
                                itemFulfillmentRecObj_invDetail.setCurrentSublistValue({
                                    sublistId: "inventoryassignment",
                                    fieldId: "quantity",
                                    value: Number(detail.issueinventorynumberqty)
                                });
                                itemFulfillmentRecObj_invDetail.commitLine({
                                    sublistId: "inventoryassignment"
                                });
                            }
                            itemFulfillmentRecObj.commitLine({ sublistId: "item" });
                        }
                    }
                    var submittedItemFulfillmentRecId = itemFulfillmentRecObj.save({
                        ignoreMandatoryFields: true,
                        enableSourcing: true
                    });
                    transformOrders_results.list.push(submittedItemFulfillmentRecId);
                    transformOrders_results.fulfillmentlist.push(submittedItemFulfillmentRecId);
                    log.debug("transformOrders_results", transformOrders_results);

                }
            } catch (e) {
                log.error("ERROR in function transformTransferOrders", e);
            }
            return transformOrders_results;
        };

        const transformTransferOrders_receive = (shipmentLineDetails_bySoInternalid, liveRecord) => {
            const transformOrders_results = { list: [], fulfillmentlist: [], receiptlist: []};
            try {

                for (let salesOrderInternalId in shipmentLineDetails_bySoInternalid) {
                    const soLineDetails = shipmentLineDetails_bySoInternalid[salesOrderInternalId];

                    log.debug("transformTransferOrders_receive soLineDetails", soLineDetails);


                    var itemReceiptRecObj = null;
                    if(soLineDetails.length > 0)
                    {
                        itemReceiptRecObj = record.transform({
                            fromType: "transferorder",
                            toType: "itemreceipt",
                            fromId: salesOrderInternalId,
                            isDynamic: true
                        });
                        itemReceiptRecObj.setValue({
                            fieldId: "custbody_anc_createdfromshipment",
                            value: soLineDetails[0].custbody_anc_createdfromshipment // shipment's internalid
                        });
                        itemReceiptRecObj.setValue({
                            fieldId: "shipstatus",
                            value: "C" // PACKED
                        });
                    }
                    else
                    {
                        continue;
                    }

                    for (let a = 0; a < soLineDetails.length; a++) {
                        // Use dynamic mode here

                        log.debug("transformTransferOrders_receive soLineDetails[a]", soLineDetails[a]);


                        const orderline = soLineDetails[a].to_lineuniquekey || soLineDetails[a].shipment_lineuniquekey;
                        log.debug("transformTransferOrders_receive orderline", orderline);

                        const itemfulfillment_lineindex = itemReceiptRecObj.findSublistLineWithValue({
                            sublistId: "item",
                            fieldId: "custcol_anc_orig_uniquekeytracker",
                            value: "" + orderline
                        });
                        log.debug("transformTransferOrders_receive itemfulfillment_lineindex", itemfulfillment_lineindex);

                        if (itemfulfillment_lineindex !== -1) {
                            // In dynamic mode: select the line and set current values
                            itemReceiptRecObj.selectLine({
                                sublistId: "item",
                                line: itemfulfillment_lineindex
                            });
                            itemReceiptRecObj.setCurrentSublistValue({
                                sublistId: "item",
                                fieldId: "itemreceive",
                                value: true
                            });
                            itemReceiptRecObj.setCurrentSublistValue({
                                sublistId: "item",
                                fieldId: "quantity",
                                value: soLineDetails[a].shipmentqty
                            });

                            const itemFulfillmentRecObj_invDetail = itemReceiptRecObj.getCurrentSublistSubrecord({
                                sublistId: "item",
                                fieldId: "inventorydetail"
                            });

                            ////TODO commented out to Receive whats fulfilled
                            // for (let c = 0; c < soLineDetails[a].invDetail.length; c++) {
                            //     const detail = soLineDetails[a].invDetail[c];
                            //     // itemFulfillmentRecObj_invDetail.selectNewLine({
                            //     //     sublistId: "inventoryassignment"
                            //     // });
                            //     itemFulfillmentRecObj_invDetail.selectLine({
                            //         sublistId: "inventoryassignment",
                            //         line : a
                            //     });
                            //     itemFulfillmentRecObj_invDetail.setCurrentSublistValue({
                            //         sublistId: "inventoryassignment",
                            //         fieldId: "issueinventorynumber",
                            //         value: detail.issueinventorynumber
                            //     });
                            //     itemFulfillmentRecObj_invDetail.setCurrentSublistValue({
                            //         sublistId: "inventoryassignment",
                            //         fieldId: "quantity",
                            //         value: Number(detail.issueinventorynumberqty)
                            //     });
                            //     itemFulfillmentRecObj_invDetail.commitLine({
                            //         sublistId: "inventoryassignment"
                            //     });
                            // }
                            itemReceiptRecObj.commitLine({ sublistId: "item" });
                        }
                    }
                    var submittedItemReceiptRecId = itemReceiptRecObj.save({
                        ignoreMandatoryFields: true,
                        enableSourcing: true
                    });
                    transformOrders_results.list.push(submittedItemReceiptRecId);
                    transformOrders_results.receiptlist.push(submittedItemReceiptRecId);
                    log.debug("transformOrders_results", transformOrders_results);



                }
            } catch (e) {
                log.error("ERROR in function transformTransferOrders", e);
            }
            return transformOrders_results;
        };


        const getShipmentLineDetails = (liveRecord) =>
        {
            var shipmentLineDetails = [];
            try
            {
                var lineCount = liveRecord.getLineCount({
                    sublistId : "item"
                });
                var shipmentinternalid = liveRecord.id;

                for(var a = 0 ; a < lineCount ; a++)
                {
                    var lineObj = {shipmentinternalid};

                    lineObj.location = liveRecord.getValue({
                        // sublistId : "item",
                        fieldId : "location",
                        // line : a
                    })
                    lineObj.so_internalid = liveRecord.getSublistValue({
                        sublistId : "item",
                        fieldId : "custcol_anc_relatedtransaction",
                        line : a
                    })
                    lineObj.to_internalid = liveRecord.getSublistValue({
                        sublistId : "item",
                        fieldId : "custcol_anc_relatedtransaction_to",
                        line : a
                    })
                    lineObj.so_lineuniquekey = liveRecord.getSublistValue({
                        sublistId : "item",
                        fieldId : "custcol_anc_relatedlineuniquekey",
                        line : a
                    });
                    lineObj.to_lineuniquekey = liveRecord.getSublistValue({
                        sublistId : "item",
                        fieldId : "custcol_anc_relatedlineuniquekey_to",
                        line : a
                    });
                    lineObj.shipment_lineuniquekey = liveRecord.getSublistValue({
                        sublistId : "item",
                        fieldId : "lineuniquekey",
                        line : a
                    });
                    lineObj.orderline = liveRecord.getSublistValue({
                        sublistId : "item",
                        fieldId : "custcol_anc_related_trans_orderline",
                        line : a
                    });
                    lineObj.to_orderline = liveRecord.getSublistValue({
                        sublistId : "item",
                        fieldId : "custcol_anc_related_trans_orderline",
                        line : a
                    });
                    lineObj.shipmentqty = liveRecord.getSublistValue({
                        sublistId : "item",
                        fieldId : "quantity",
                        line : a
                    });

                    lineObj.invDetail = [];
                    var invDetail = liveRecord.getSublistSubrecord({
                        sublistId : "item",
                        fieldId : "inventorydetail",
                        line : a
                    });
                    //serialized so assumed as 1qty
                    log.debug("getShipmentLineDetails invDetail", invDetail)

                    var invDetail_lineCount = invDetail.getLineCount({
                        sublistId : "inventoryassignment",
                    })
                    log.debug(`getShipmentLineDetails index:${a}|invDetail_lineCount:${invDetail_lineCount}`, invDetail_lineCount)
                    var invNumbers = [];
                    for(var b = 0 ; b < invDetail_lineCount ; b++)
                    {
                        var issueinventorynumber = invDetail.getSublistValue({
                            sublistId : "inventoryassignment",
                            fieldId : `issueinventorynumber`,
                            line : b
                        });
                        var issueinventorynumberqty = invDetail.getSublistValue({
                            sublistId : "inventoryassignment",
                            fieldId : `quantity`,
                            line : b
                        });
                        invNumbers.push(issueinventorynumber);
                        lineObj.invDetail.push({orderline:lineObj.orderline, issueinventorynumber, issueinventorynumberqty});
                    }
                    log.debug("getShipmentLineDetails invNumbers", invNumbers);
                    lineObj.invNumbers = invNumbers

                    shipmentLineDetails.push(lineObj);
                }
            }
            catch(e)
            {
                log.error("ERROR in function getShipmentLineDetails_bySoInternalid", e);
            }
            log.debug("getShipmentLineDetails shipmentLineDetails", shipmentLineDetails);
            return shipmentLineDetails;
        }
        const getShipmentLineDetails_bySoInternalid = (shipmentLineDetails, param2, param3) =>
        {
            var funcResult = {};
            try
            {
                funcResult = ANC_lib.groupBy(shipmentLineDetails, param2, param3)
            }
            catch(e)
            {
                log.error("ERROR in function getShipmentLineDetails_bySoInternalid", e);
            }
            log.debug("getShipmentLineDetails_bySoInternalid funcResult", funcResult)
            return funcResult;
        }

        const updateNeedsRebuildFlag = (scriptContext, liveRecord) =>
        {
            try
            {
                liveRecord.setValue({
                    fieldId : "custbody_anc_needsrebuild",
                    value : true
                })
                // if(scriptContext)
                // {
                //     if(scriptContext.newRecord)
                //     {
                //         if(scriptContext.newRecord.id && scriptContext.newRecord.type)
                //         {
                //             var submittedRecordId = record.submitFields({
                //                 type : scriptContext.newRecord.type,
                //                 id : scriptContext.newRecord.id,
                //                 values : {
                //                     custbody_anc_needsrebuild : "T"
                //                 }
                //             });
                //             log.debug("submittedRecordId", submittedRecordId)
                //         }
                //     }
                // }
            }
            catch(e)
            {
                log.error("ERROR in function updateNeedsRebuildFlag", e)
            }
        }

        function implementShipCap_shipments(recObj)
        {
            var doImplement = true;
            yearMapping = ANC_lib.yearMapping;

            try
            {
                if(doImplement)
                {
                    var lineCount = recObj.getLineCount({
                        sublistId : "item"
                    });

                    log.debug("implementShipCap lineCount", lineCount)
                    log.debug("implementShipCap ANC_lib.references", ANC_lib.references)
                    var lineValList = [];
                    var lineVals = {};
                    var headerLocation = recObj.getValue({
                        fieldId : "location"
                    })
                    log.debug("lineVals after location", headerLocation)
                    var headerShipdate = recObj.getValue({
                        fieldId : "custbody_anc_shipdate"
                    })
                    log.debug("lineVals after custbody_anc_shipdate", headerShipdate);

                    lineVals.shipdate = headerShipdate;

                    if(lineVals.shipdate)
                    {
                        lineVals.shipdate = format.format({
                            value: lineVals.shipdate,
                            type: format.Type.DATE
                        });
                    }

                    log.debug("lineVals after shipdate", lineVals)
                    lineVals.location = headerLocation;
                    log.debug("lineVals after location", lineVals)
                    lineValList.push(lineVals);

                    var lineCompositeKey = lineVals.location + "_" + lineVals.shipdate


                    var compositeKeyResults = ANC_lib.getRelatedShipCap(recObj.id, lineValList)
                    log.debug("implementShipCap compositeKeyResults", compositeKeyResults);
                    var RESULTSBYCOMPOSITEKEY = compositeKeyResults.groupedByCompositekey;


                    log.debug("implementShipCap_shipments lineCompositeKey", lineCompositeKey)
                    if(RESULTSBYCOMPOSITEKEY[lineCompositeKey])
                    {
                        log.debug("implementShipCap_shipments RESULTSBYCOMPOSITEKEY[lineCompositeKey].sc_id", RESULTSBYCOMPOSITEKEY[lineCompositeKey].sc_id)
                        if(RESULTSBYCOMPOSITEKEY[lineCompositeKey].sc_id) {
                            recObj.setValue({
                                fieldId: "custbody_anc_shipmentcapacity",
                                value: RESULTSBYCOMPOSITEKEY[lineCompositeKey].sc_id
                            })
                        }
                        else
                        {
                            recObj.setValue({
                                fieldId: "custbody_anc_shipmentcapacity",
                                value: ""
                            })
                        }
                    }
                    else
                    {
                        recObj.setSublistValue({
                            sublistId: "item",
                            fieldId: ANC_lib.references.SO_COLUMNS.SHIPMENTCAPACITY,
                            line: a,
                            value: ""
                        })
                    }
                }
            }
            catch(e)
            {
                log.error("ERROR in funtion implementShipCap", e)
            }
        }



        return {beforeLoad/*, beforeSubmit*/, afterSubmit}

    });



