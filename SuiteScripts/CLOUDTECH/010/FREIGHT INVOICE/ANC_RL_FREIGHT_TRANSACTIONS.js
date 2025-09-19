/**
 * @NApiVersion 2.1
 * @NScriptType Restlet
 */
/*

create freight PO
{"CarrierParentId":null,"NetAmount":1300,"HarmonizedSalesAmount":0,"NonassignedCarrierAccessorials":null,"transactionDate":"2025-04-16T14:46:01.8697052-06:00","AcctCode":null,"ControlCustomerNumber":"6170","LoadID":"F0428XX1","Rate":1300,"RateQualifier":"FC","GoodsServicesAmount":0,"MethodOfPayment":"P","LineHaul":1300,"MinimumCharge":0,"InvoiceNumber":null,"Currency":"CAD","Accessorials":null,"CarrierID":"1127","ProvincialSalesAmount":0,"FuelSurcharge":0,"FuelSurchargeQualifier":"NC","ApiType":"INVOICE_UPDATE","IsFinalInvoice":false}

update freight PO
{"CarrierParentId":null,"NetAmount":1500,"HarmonizedSalesAmount":0,"NonassignedCarrierAccessorials":null,"transactionDate":"2025-04-16T14:46:01.8697052-06:00","AcctCode":null,"ControlCustomerNumber":"6170","LoadID":"F0428XX1","Rate":1500,"RateQualifier":"FC","GoodsServicesAmount":0,"MethodOfPayment":"P","LineHaul":1300,"MinimumCharge":0,"InvoiceNumber":null,"Currency":"CAD","Accessorials":null,"CarrierID":"1127","ProvincialSalesAmount":0,"FuelSurcharge":0,"FuelSurchargeQualifier":"NC","ApiType":"INVOICE_UPDATE","IsFinalInvoice":false}

BILL load
{"CarrierParentId":null,"NetAmount":1500,"HarmonizedSalesAmount":0,"NonassignedCarrierAccessorials":null,"transactionDate":"2025-04-16T14:46:01.8697052-06:00","AcctCode":null,"ControlCustomerNumber":"6170","LoadID":"F0428XX1","Rate":1500,"RateQualifier":"FC","GoodsServicesAmount":0,"MethodOfPayment":"P","LineHaul":1300,"MinimumCharge":0,"InvoiceNumber":null,"Currency":"CAD","Accessorials":null,"CarrierID":"1127","ProvincialSalesAmount":0,"FuelSurcharge":0,"FuelSurchargeQualifier":"NC","ApiType":"INVOICE_UPDATE","IsFinalInvoice":true}
*/

//delete integration logs
// var arr = nlapiSearchRecord(nlapiGetRecordType());
// for(var a = 0 ; a < arr.length ; a++)
// {
//     nlapiDeleteRecord(arr[a].getRecordType(), arr[a].getId())
//UI dont error out because it resolve tascode, but scripting does, is it because of static vs dynamic mode?
//TODO different handling for truck to customer vs truck WHS-WHS - cody, rod
//TODO different handling for taxcode, US carriers dont tax anc, CA carriers is questionable
//TODO ... because LOBLAW taxes, but BISON does not based on PROD samples - cody, rod
define(['/SuiteScripts/ANC_lib.js', 'N/https', 'N/record', 'N/runtime', 'N/search', 'N/url'],
    /**
     * @param{https} https
     * @param{record} record
     * @param{runtime} runtime
     * @param{search} search
     * @param{url} url
     */
    (ANC_lib, https, record, runtime, search, url) => {
        /**
         * Defines the function that is executed when a GET request is sent to a RESTlet.
         * @param {Object} requestParams - Parameters from HTTP request URL; parameters passed as an Object (for all supported
         *     content types)
         * @returns {string | Object} HTTP response body; returns a string when request Content-Type is 'text/plain'; returns an
         *     Object when request Content-Type is 'application/json' or 'application/xml'
         * @since 2015.2
         */
        const get = (requestParams) =>
        {

        }


        /**
         * Defines the function that is executed when a PUT request is sent to a RESTlet.
         * @param {string | Object} requestBody - The HTTP request body; request body are passed as a string when request
         *     Content-Type is 'text/plain' or parsed into an Object when request Content-Type is 'application/json' (in which case
         *     the body must be a valid JSON)
         * @returns {string | Object} HTTP response body; returns a string when request Content-Type is 'text/plain'; returns an
         *     Object when request Content-Type is 'application/json' or 'application/xml'
         * @since 2015.2
         */
        const put = (requestBody) => {

        }


        var PAYLOAD_VALUES_INCLUSIVE_OF_TAX = false;
        var accessorial_mapping = {}
        var targets = {
            targetBol : "",
            targetCust : "",
            targetCons : "",
            targetEquip : "",
            targetEquipType : "",
            legNum : ""
        };
        var NF_item = "";
        var integrationLogId = null;
        var FUELSURCHARGE_item = "";
        /**
         * Defines the function that is executed when a POST request is sent to a RESTlet.
         * @param {string | Object} requestBody - The HTTP request body; request body is passed as a string when request
         *     Content-Type is 'text/plain' or parsed into an Object when request Content-Type is 'application/json' (in which case
         *     the body must be a valid JSON)
         * @returns {string | Object} HTTP response body; returns a string when request Content-Type is 'text/plain'; returns an
         *     Object when request Content-Type is 'application/json' or 'application/xml'
         * @since 2015.2
         */
        const post = (requestBody) =>
        {
            accessorial_mapping = ANC_lib.FREIGHTINVOICE.accessorial_mapping;
            // NF_item = ANC_lib.FREIGHTINVOICE.NF_item_to_whs;
            // FUELSURCHARGE_item = ANC_lib.FREIGHTINVOICE.FUELSURCHARGE_item_truck_to_whs;
            try
            {
                var poRecId = ""
                var irRecId = "";
                var vbRecId = "";
                log.debug("requestBody", requestBody);
                var loadID = requestBody.loadID || requestBody.LoadID;
                var IsFinalInvoice = requestBody.IsFinalInvoice || requestBody.isFinalInvoice;
                log.debug("loadID", loadID)
                targets.targetBol = loadID

                integrationLogId = ANC_lib.submitIntegrationLog(integrationLogId,{request:JSON.stringify(requestBody)});

                //AS OF 06192025 - ROD raised this issue to Mike, he suggest do not create anything if it is not marked final
                if(!IsFinalInvoice && IsFinalInvoice != "true")
                {
                    log.audit("NOT MARKED AS FINAL, REJECT", loadID);
                    throw {success:false, message: "NO LONGER processing payloads NOT marked as FINAL as of June 19,2025MT 15:15pm", request:JSON.stringify(requestBody)}
                }

                var prepLoad_result = ANC_lib.prepLoad(loadID)
                log.debug("prepLoad_result", prepLoad_result);

                var loadDetails_result = ANC_lib.getLoadDetails(loadID);
                log.debug("loadDetails_result", loadDetails_result);

                var salesorderSearchObj = search.create({
                    type: "transaction",
                    filters:
                        [
                            ["type","anyof",ANC_lib.references.RECTYPES.shipment.id],
                            "AND",
                            ["custbody4","is",targets.targetBol],
                            "AND",
                            ["mainline","is","T"]
                        ],
                    columns:
                        [
                            search.createColumn({name: "entity", label: "Name"}),
                            search.createColumn({name: "custbody_consignee", label: "Consignee"}),
                            search.createColumn({name: "custbody_anc_equipment", label: "Equipment"}),
                            search.createColumn({name: "custrecord_anc_transportmode", join:"custbody_anc_equipment", label: "Transport Mode"}),
                            search.createColumn({name: "custbody_anc_shipment_leg", label: "Leg"}),
                            search.createColumn({name: "shipstate", label: "Ship State"}),
                            targets.custrecord_alberta_ns_ship_addrprovince = search.createColumn({
                                name: "custrecord_alberta_ns_ship_addrprovince",
                                join: "CUSTBODY_CONSIGNEE",
                                label: "Consignee Address Province"
                            }),
                            targets.custrecord_alberta_ns_country = search.createColumn({
                                name: "custrecord_alberta_ns_country",
                                join: "CUSTBODY_CONSIGNEE",
                                label: "Country"
                            })
                        ]
                });

                log.debug("salesorderSearchObj", salesorderSearchObj);

                // salesorderSearchObj.title = "shipment search " + new Date().getTime();
                // salesorderSearchObj.save()
                log.debug("salesorderSearchObj.filters", JSON.stringify(salesorderSearchObj.filters))
                salesorderSearchObj.run().each(function(res){
                    log.debug("res", res)
                    targets.legNum = res.getValue({name: "custbody_anc_shipment_leg", label: "Leg"})
                    targets.targetCust = res.getValue({
                        name: "entity", label: "Name"
                    })
                    targets.targetCons = res.getValue({
                        name: "custbody_consignee", label: "Consignee"
                    })
                    targets.targetEquip = res.getValue({name: "custbody_anc_equipment", label: "Equipment"})
                    targets.targetEquipType = res.getValue({name: "custrecord_anc_transportmode", join:"custbody_anc_equipment", label: "Transport Mode"})
                    targets.shipstate = res.getValue({name: "shipstate", label: "Ship State"})
                    targets.custrecord_alberta_ns_postal_code = res.getValue({name: "custrecord_alberta_ns_postal_code", join: "custbody_consignee", label: "Consignee Postal Code"})
                    targets.custrecord_alberta_ns_ship_addrprovince = res.getValue({
                        name: "custrecord_alberta_ns_ship_addrprovince",
                        join: "custbody_consignee",
                        label: "Consignee Address Province"
                    })
                    targets.custrecord_alberta_ns_country = res.getValue({
                        name: "custrecord_alberta_ns_country",
                        join: "custbody_consignee",
                        label: "Country"
                    })
                    return false;
                })

                if(!targets.custrecord_alberta_ns_ship_addrprovince || !targets.custrecord_alberta_ns_country)
                {
                    var consigneeLookup = search.lookupFields({
                        type : "customrecord_alberta_ns_consignee_record",
                        id : targets.targetCons,
                        columns : [
                            "custrecord_alberta_ns_ship_addrprovince",
                            "custrecord_alberta_ns_country"
                        ]
                    })

                    log.debug("consigneeLookup", consigneeLookup)
                    targets.custrecord_alberta_ns_ship_addrprovince = consigneeLookup.custrecord_alberta_ns_ship_addrprovince
                    targets.custrecord_alberta_ns_country = consigneeLookup.custrecord_alberta_ns_country
                }

                targets.targetTaxcodeId =  ANC_lib.FREIGHTINVOICE.TAXCODES.TAXCODE_NONTAXABLE82
                log.debug("targets", targets)

                if(targets.custrecord_alberta_ns_country && targets.custrecord_alberta_ns_country.toUpperCase() != "CANADA" && targets.custrecord_alberta_ns_country.toUpperCase() != "CAN")
                {
                    log.debug("what's the taxcode1", targets)
                    targets.targetTaxcodeId = ANC_lib.FREIGHTINVOICE.TAXCODES.TAXCODE_NONTAXABLE82;
                }
                else
                {
                    if(targets.custrecord_alberta_ns_ship_addrprovince)
                    {
                        log.debug("what's the taxcode3", targets)
                        log.debug("what's the taxcode3.4 ANC_lib.CA_TAXCODE_MAPPING_BY_STATE_CODE", ANC_lib.CA_TAXCODE_MAPPING_BY_STATE_CODE)
                        log.debug("what's the taxcode3.5 ANC_lib.CA_TAXCODE_MAPPING_BY_STATE_CODE[x]", ANC_lib.CA_TAXCODE_MAPPING_BY_STATE_CODE[targets.custrecord_alberta_ns_ship_addrprovince])

                        if(ANC_lib.CA_TAXCODE_MAPPING_BY_STATE_CODE[targets.custrecord_alberta_ns_ship_addrprovince])
                        {
                            log.debug("what's the taxcode4", targets)
                            targets.targetTaxcodeId = ANC_lib.CA_TAXCODE_MAPPING_BY_STATE_CODE[targets.custrecord_alberta_ns_ship_addrprovince];
                        }
                        else
                        {

                            log.debug("what's the taxcode5", targets)
                            targets.targetTaxcodeId = ANC_lib.FREIGHTINVOICE.TAXCODES.TAXCODE_NONTAXABLE82
                        }
                    }
                    else
                    {

                        log.debug("what's the taxcode6", targets)
                        targets.targetTaxcodeId =  ANC_lib.FREIGHTINVOICE.TAXCODES.TAXCODE_NONTAXABLE82
                    }
                }

                log.debug("targets after taxcode", targets)

                //05122025 - JUST ALWAYS UPDATE THE PO, they will only send INVOICE WHEN IT's FINAL and it is not expected to change... cause it is final! - CODY
                if(true/*!IsFinalInvoice*/)
                {
                    var lookupPo_result = lookupPo(loadID);
                    log.debug("lookupPo_result", lookupPo_result);

                    if(lookupPo_result.list && lookupPo_result.list.length > 0 && lookupPo_result.list[0].id)
                    {
                        log.debug("0")
                        log.debug("lookupPo_result.list[0].status", lookupPo_result.list[0].status);

                        if(lookupPo_result.list[0].status == "fullyBilled")
                        {
                            throw {message: "The PO is in the fully billed state, further changes are disallowed through integration."}
                        }

                        var poId = lookupPo_result.list[0].id;

                        var poRecObj = record.load({
                            type : "purchaseorder",
                            id : poId,
                        });

                        //as of 06252025
                        //make sure to use the new vendor
                        // var poId = lookupPo(_result.list[0];
                        var carrierId = requestBody.carrierID || requestBody.CarrierID;
                        var carrierInternalid = "";
                        var vendorSearchObj = search.create({
                            type : "vendor",
                            filters : [
                                ["externalid", "anyof", [carrierId, "CAR"+carrierId]]
                            ],
                        })

                        var sr = vendorSearchObj.run();

                        sr.each(function(res){
                            carrierInternalid = res.id;
                            //no just get the first result
                            return false;
                        })

                        if(!carrierInternalid)
                        {
                            respMsg ={success:false, message : "Cannot resolve Vendor/Carrier with externalid : " + carrierId, requestBody};
                            throw respMsg;
                        }

                        var currentEntity = poRecObj.getValue({
                            fieldId : "entity",
                            value : carrierInternalid
                        });
                        if(carrierInternalid && (carrierInternalid != currentEntity))
                        {
                            poRecObj.setValue({
                                fieldId : "entity",
                                value : carrierInternalid
                            })
                        }

                        /*
                        5 is ANC, as of 16202025/06232025 CODY confirmed that all freight should go to ANS
                        Cody, alyssa and katherine found this issue
                        Rod explained that i let the system default the subsidiary because its not defined in the payload
                        Cody said existing issues regarding this should be okay since ANC is still the parent subsidiary
                        but should be all to ANS going forward
                        rod warned that they need to make sure ANS is applied to freight vendors now that im forcing ANS as subsidiary
                        */
                        var currSubsidiary = poRecObj.getValue({
                            fieldId : "subsidiary",
                        })

                        if(Number(currSubsidiary) != 5)
                        {
                            poRecObj.setValue({
                                fieldId : "subsidiary",
                                value : 5
                            })
                        }

                        if(targets.targetCons)
                        {
                            poRecObj.setValue({
                                fieldId : "custbody_ns_consignee",
                                value : targets.targetCons
                            })
                        }
                        //TODO do you need to specify currency? the payload sample has currency
                        var payloadCurrencyText = requestBody.Currency || requestBody.currency
                        var payloadCurrencyId = "";

                        if(payloadCurrencyText == "CAD")
                        {
                            payloadCurrencyId = 1;
                        }
                        else if(payloadCurrencyText == "USD")
                        {
                            payloadCurrencyId = 2;
                        }
                        else
                        {
                            payloadCurrencyId = "";
                        }

                        try
                        {
                            if(payloadCurrencyId)
                            {
                                poRecObj.setValue({
                                    fieldId : "currency",
                                    value : payloadCurrencyId
                                })
                            }
                        }
                        catch(e)
                        {
                            log.emergency("ERROR in ANC_RL_FREIGHT_TRANSACTION.js, cannot resolve currency", e)
                        }

                        if(targets.targetBol)
                        {
                            poRecObj.setValue({
                                fieldId : "custbody4",
                                value : targets.targetBol
                            })
                        }
                        if(targets.targetBol)
                        {
                            poRecObj.setValue({
                                fieldId : "custbody_wmid",
                                value : targets.targetBol
                            })
                        }


                        var transactionDateRaw = requestBody.invoiceDate || requestBody.InvoiceDate
                        var transactionDate = new Date(transactionDateRaw);
                        var transactionDateStr = (transactionDate.getMonth() + 1) + "/" + (transactionDate.getDate()) + "/" + (transactionDate.getFullYear());

                        log.debug("transactionDateRaw", transactionDateRaw)
                        log.debug("transactionDate", transactionDate)
                        log.debug("transactionDateStr", transactionDateStr)
                        log.debug("requestBody.NetAmount", requestBody.NetAmount)

                        poRecObj.setValue({
                            fieldId : "trandate",
                            // value :new Date(),
                            // text :transactionDateStr,
                            value :new Date(transactionDateRaw),
                        })
                        poRecObj.setValue({
                            fieldId : "approvalstatus",
                            value :"1",
                        })
                        poRecObj.setValue({
                            fieldId : "custbody_anc_integ_origamt",
                            value : requestBody.NetAmount,
                        })

                        clearSublist(poRecObj, requestBody);
                        fillSublist(poRecObj, requestBody, lookupPo_result, true);

                        poRecId = poRecObj.save({
                            ignoreMandatoryFields : true,
                            enableSourcing : true
                        })

                        log.debug("poRecId edit", poRecId);

                        var respMsg = {success:true, errorcode : lookupPo_result.errorcode, message : "Successfully Updated NetSuite PO for load : " + loadID, NS_RECORD_INTERNALID:poRecId, requestBody};
                        if(lookupPo_result.list[0] && lookupPo_result.list[0].errorcode)
                        {
                            // respMsg.errorcode = lookupPo_result.list[0].errorcode
                            respMsg.errorcode = lookupPo_result.errorcode
                        }

                    }
                    else
                    {
                        log.debug("1")
                        if(lookupPo_result.list && lookupPo_result.list[0] && lookupPo_result.list[0].errorcode)
                        {
                            respMsgStr = JSON.stringify({success:false, errorcode:(lookupPo_result.list[0].errorcode), message : "Action Rejected for : " + loadID, NS_RECORD_INTERNALID:poRecId, requestBody});
                        }

                        log.debug("PO CREATE")
                        // var poId = lookupPo(_result.list[0];
                        var carrierId = requestBody.carrierID || requestBody.CarrierID;
                        var carrierInternalid = "";
                        var vendorSearchObj = search.create({
                            type : "vendor",
                            filters : [
                                ["externalid", "anyof", [carrierId, "CAR"+carrierId]]
                            ],
                        })

                        var sr = vendorSearchObj.run();

                        sr.each(function(res){
                            carrierInternalid = res.id;
                            //no just get the first result
                            return false;
                        })

                        if(!carrierInternalid)
                        {
                            respMsg ={success:false, message : "Cannot resolve Vendor/Carrier with externalid : " + carrierId, requestBody};
                            throw respMsg;
                        }

                        var poRecObj = record.create({
                            type : "purchaseorder",
                            defaultValues : {
                                entity : carrierInternalid
                            }
                        });

                        /*
                        5 is ANC, as of 16202025/06232025 CODY confirmed that all freight should go to ANS
                        Cody, alyssa and katherine found this issue
                        Rod explained that i let the system default the subsidiary because its not defined in the payload
                        Cody said existing issues regarding this should be okay since ANC is still the parent subsidiary
                        but should be all to ANS going forward
                        rod warned that they need to make sure ANS is applied to freight vendors now that im forcing ANS as subsidiary
                        */
                        poRecObj.setValue({
                            fieldId : "subsidiary",
                            value : 5
                        })

                        if(targets.targetCons)
                        {
                            poRecObj.setValue({
                                fieldId : "custbody_ns_consignee",
                                value : targets.targetCons
                            })
                        }

                        var transactionDateRaw = requestBody.invoiceDate || requestBody.InvoiceDate
                        var transactionDate = new Date(transactionDateRaw);
                        var transactionDateStr = (transactionDate.getMonth() + 1) + "/" + (transactionDate.getDate()) + "/" + (transactionDate.getFullYear());

                        log.debug("transactionDateRaw", transactionDateRaw)
                        log.debug("transactionDate", transactionDate)
                        log.debug("transactionDateStr", transactionDateStr)
                        log.debug("requestBody.NetAmount", requestBody.NetAmount)

                        // poRecObj.setText({
                        //     fieldId : "trandate",
                        //     value :transactionDateStr,
                        //     text :transactionDateStr
                        // })

                        poRecObj.setValue({
                            fieldId: "trandate",
                            // value :new Date(),
                            // text :transactionDateStr,
                            value: new Date(transactionDateRaw),
                        })

                        poRecObj.setValue({
                            fieldId : "approvalstatus",
                            value :"1",
                        })
                        poRecObj.setValue({
                            fieldId : "custbody_anc_integ_origamt",
                            value : requestBody.NetAmount,
                        })

                        poRecObj.setValue({
                            fieldId : "externalid",
                            value :loadID,
                        })
                        // poRecObj.setValue({
                        //     fieldId : "custbody_work_order",
                        //     value :loadID,
                        // })
                        poRecObj.setValue({
                            fieldId : "custbody_purchase_order",
                            value :loadID,
                        })
                        if(targets.targetBol)
                        {
                            poRecObj.setValue({
                                fieldId : "custbody4",
                                value : targets.targetBol
                            })
                        }
                        if(targets.targetBol)
                        {
                            poRecObj.setValue({
                                fieldId : "custbody_wmid",
                                value : targets.targetBol
                            })
                        }

                        var currEntity = poRecObj.getValue({
                            fieldId : "entity",
                        });
                        log.debug("currEntity", currEntity);

                        clearSublist(poRecObj, requestBody);
                        fillSublist(poRecObj, requestBody, lookupPo_result, true);

                        poRecObj.setValue({
                            fieldId : "tobeemailed",
                            value: false
                        })

                        poRecId = poRecObj.save({
                            ignoreMandatoryFields : true,
                            enableSourcing : true
                        })

                        log.debug("poRecId create", poRecId);

                        respMsg = {success:true, message : "Successfully Created NetSuite PO for load : " + loadID, NS_RECORD_INTERNALID:poRecId, requestBody};
                        if(lookupPo_result.list[0] && lookupPo_result.list[0].errorcode)
                        {
                            // respMsg.errorcode = lookupPo_result.list[0].errorcode
                            respMsg.errorcode = lookupPo_result.list[0].errorcode
                        }
                    }
                }

                if(IsFinalInvoice)
                {
                    var lookupPo_result = lookupPo_final(loadID);
                    log.debug("lookupPo_result", lookupPo_result);

                    if(lookupPo_result.list && lookupPo_result.list.length > 0 && lookupPo_result.list[0].id)
                    {
                        var poId = lookupPo_result.list[0].id;

                        try
                        {
                            var poId_approved = record.submitFields({
                                type : "purchaseorder",
                                id : poId,
                                values : {"supervisorapproval" : "T"}
                            })
                            log.debug("poId_approved", poId_approved)
                        }
                        catch(e)
                        {
                            log.error("ERROR in function post, approve PO", e.message)
                        }

                        var itemReceipt = "";
                        try
                        {
                            var irRecObj = record.transform({
                                fromType : "purchaseorder",
                                fromId : poId,
                                toType : "itemreceipt",
                            });

                            var transactionDateRaw = requestBody.invoiceDate || requestBody.InvoiceDate;
                            var transactionDate = new Date(transactionDateRaw);
                            var transactionDateStr = (transactionDate.getMonth() + 1) + "/" + (transactionDate.getDate()) + "/" + (transactionDate.getFullYear());

                            log.debug("transactionDateRaw", transactionDateRaw)
                            log.debug("transactionDate", transactionDate)
                            log.debug("transactionDateStr", transactionDateStr)

                            // irRecObj.setText({
                            //     fieldId : "trandate",
                            //     value :transactionDateStr,
                            //     text :transactionDateStr
                            // })
                            irRecObj.setValue({
                                fieldId: "trandate",
                                // value :new Date(),
                                // text :transactionDateStr,
                                value: new Date(transactionDateRaw),
                            })


                            clearSublist(irRecObj, requestBody);
                            //we only need a checkbox, do it in clearSublist
                            //we dont need locations for noninvetory items/services
                            // fillSublist(irRecObj, requestBody, lookupPo_result);


                            irRecObj.setValue({
                                fieldId : "tobeemailed",
                                value: false
                            })
                            irRecId = irRecObj.save({
                                ignoreMandatoryFields : true,
                                enableSourcing : true
                            })

                            log.debug("irRecId", irRecId);

                            // respMsgStr = JSON.stringify({success:true, message : "Successfully Submitted NetSuite Vendor Bill for load : " + loadID, NS_RECORD_INTERNALID:vbRecId, requestBody});
                        }
                        catch(e)
                        {
                            log.error("ERROR in function post, receive PO", e.message)
                        }

                        var vbRecObj = record.transform({
                            fromType : "purchaseorder",
                            fromId : poId,
                            toType : "vendorbill",
                        });

                        var transactionDateRaw = requestBody.invoiceDate || requestBody.InvoiceDate;
                        var transactionDate = new Date(transactionDateRaw);
                        var transactionDateStr = (transactionDate.getMonth() + 1) + "/" + (transactionDate.getDate()) + "/" + (transactionDate.getFullYear());

                        log.debug("transactionDateRaw", transactionDateRaw)
                        log.debug("transactionDate", transactionDate)
                        log.debug("transactionDateStr", transactionDateStr)
                        log.debug("requestBody.NetAmount", requestBody.NetAmount)

                        // vbRecObj.setText({
                        //     fieldId : "trandate",
                        //     value :transactionDateStr,
                        //     text :transactionDateStr
                        // })
                        vbRecObj.setValue({
                            fieldId : "trandate",
                            // value :new Date(),
                            // text :transactionDateStr,
                            value :new Date(transactionDateRaw),
                        })


                        vbRecObj.setValue({
                            fieldId : "approvalstatus",
                            value :"1",
                        })

                        // poRecObj.setValue({
                        //     fieldId : "externalid",
                        //     value :loadID,
                        // })
                        // vbRecObj.setValue({
                        //     fieldId : "custbody_work_order",
                        //     value :loadID,
                        // })
                        vbRecObj.setValue({
                            fieldId : "custbody_purchase_order",
                            value :loadID,
                        })
                        if(targets.targetBol)
                        {
                            vbRecObj.setValue({
                                fieldId : "custbody4",
                                value : targets.targetBol
                            })
                        }
                        if(targets.targetBol)
                        {
                            vbRecObj.setValue({
                                fieldId : "tranid",
                                value : targets.targetBol
                            })
                        }
                        if(targets.targetBol)
                        {
                            vbRecObj.setValue({
                                fieldId : "custbody_wmid",
                                value : targets.targetBol
                            })
                        }

                        // clearSublist(vbRecObj, requestBody);
                        // fillSublist(vbRecObj, requestBody, lookupPo_result);
                        vbRecObj.setValue({
                            fieldId : "tobeemailed",
                            value: false
                        })
                        vbRecId = vbRecObj.save({
                            ignoreMandatoryFields : true,
                            enableSourcing : true
                        })

                        log.debug("vbRecId", vbRecId);

                        respMsg = ({success:true, message : "Successfully Submitted NetSuite Vendor Bill for load : " + loadID, NS_RECORD_INTERNALID:vbRecId, requestBody});
                    }
                    else
                    {
                        var respMsg = {success:false, message : "Cannot resolve load : " + loadID, NS_RECORD_INTERNALID:vbRecId, requestBody}
                        if(lookupPo_result.list[0] && lookupPo_result.list[0].errorcode)
                        {
                            // respMsg.errorcode = lookupPo_result.list[0].errorcode
                            respMsg.errorcode = lookupPo_result.errorcode
                        }
                        throw (respMsg);
                    }


                }
            }
            catch(e)
            {
                log.error("ERROR in function post", e)
                respMsg={success:false, message: "ERROR caught: " + JSON.stringify(e), requestBody};
            }
            respMsg.integrationLogId = integrationLogId;
            respMsgStr = JSON.stringify(respMsg);

            integrationLogId = ANC_lib.submitIntegrationLog(integrationLogId,{response:respMsgStr});
            log.debug(integrationLogId, integrationLogId)
            return respMsgStr
        }

        function fillSublist(nsRecObj, requestBody, lookupPo_result, initializeMainItem)
        {

            var nsRecObj_stringified = JSON.stringify(nsRecObj);
            log.debug("nsRecObj_stringified", nsRecObj_stringified);
            var nsRecObj_stringified_lineFields = nsRecObj.lineFields;

            if(targets.legNum == 2 && targets.targetEquipType == "2") //2 is truck //TODO add this to library
            {
                FUELSURCHARGE_item = ANC_lib.FREIGHTINVOICE.FUELSURCHARGE_item_truck_to_cust;
                NF_item = ANC_lib.FREIGHTINVOICE.NF_item_truck_to_cust;
            }
            else if(targets.legNum != 2 && targets.targetEquipType == "2") //2 is truck //TODO add this to library
            {
                FUELSURCHARGE_item = ANC_lib.FREIGHTINVOICE.FUELSURCHARGE_item_truck_to_whs;
                NF_item = ANC_lib.FREIGHTINVOICE.NF_item_truck_to_whs;
            }
            else if(targets.legNum == 2 && targets.targetEquipType == "1") //2 is cust //TODO add this to library
            {
                FUELSURCHARGE_item = ANC_lib.FREIGHTINVOICE.FUELSURCHARGE_item_rail_to_cust;
                NF_item = ANC_lib.FREIGHTINVOICE.NF_item_rail_to_cust
            }
            else if(targets.legNum != 2 && targets.targetEquipType == "1") //1 is rail //TODO add this to library
            {
                FUELSURCHARGE_item = ANC_lib.FREIGHTINVOICE.FUELSURCHARGE_item_rail_to_whs;
                NF_item = ANC_lib.FREIGHTINVOICE.NF_item_rail_to_whs;
            }
            else if(targets.legNum == 2 && targets.targetEquipType == "3") //2 is intermodal //TODO add this to library
            {
                FUELSURCHARGE_item = ANC_lib.FREIGHTINVOICE.FUELSURCHARGE_item_truck_to_cust;
                NF_item = ANC_lib.FREIGHTINVOICE.NF_item_truck_to_cust;
            }
            else if(targets.legNum != 2 && targets.targetEquipType == "3") //1 is intermodal //TODO add this to library
            {
                FUELSURCHARGE_item = ANC_lib.FREIGHTINVOICE.FUELSURCHARGE_item_truck_to_whs;
                NF_item = ANC_lib.FREIGHTINVOICE.NF_item_truck_to_whs;
            }

            //TODO these are based on shipments, since we are testing with shipments not yet working, then use default items
            if(!FUELSURCHARGE_item)
            {
                FUELSURCHARGE_item = ANC_lib.FREIGHTINVOICE.FUELSURCHARGE_item_truck_to_cust;
            }
            if(!NF_item)
            {
                NF_item = ANC_lib.FREIGHTINVOICE.NF_item_truck_to_cust;
            }

            // FIXME driven consignee - but if US consignee, then no tax
            // FIXME whs - whs - destination warehouse's state
            log.debug("nsRecObj_stringified_items", nsRecObj_stringified_lineFields);

            try
            {
                if(initializeMainItem)
                {
                    nsRecObj.setSublistValue({
                        sublistId : "item",
                        fieldId : "item",
                        line : 0,
                        value : NF_item
                    })
                    if(PAYLOAD_VALUES_INCLUSIVE_OF_TAX)
                    {
                        nsRecObj.setSublistValue({
                            sublistId : "item",
                            fieldId : "rate",
                            line : 0,
                            value : requestBody.rate || requestBody.Rate
                        })
                    }
                    else
                    {
                        nsRecObj.setSublistValue({
                            sublistId : "item",
                            fieldId : "rate",
                            line : 0,
                            value : requestBody.rate || requestBody.Rate
                        })
                    }

                    nsRecObj.setSublistValue({
                        sublistId : "item",
                        fieldId : "quantity",
                        line : 0,
                        value : 1
                    })
                    nsRecObj.setSublistValue({
                        sublistId : "item",
                        fieldId : "amount",
                        line : 0,
                        value : requestBody.rate || requestBody.Rate
                    })

                    //TODO clear this, it's just for testing standard defaultings
                    // var currentLineTaxcode = nsRecObj.getSublistValue({
                    //     sublistId : "item",
                    //     fieldId : "taxcode",
                    //     line : 0
                    // })
                    // log.debug("currentLineTaxcode", currentLineTaxcode);
                    // var currentLineItem = nsRecObj.getSublistValue({
                    //     sublistId : "item",
                    //     fieldId : "item",
                    //     line : targetLine
                    // })
                    // log.debug("currentLineItem", currentLineItem);
                    //TODO, setup a rule when or when not to add tax
                    if(targets.targetTaxcodeId)
                    {
                        nsRecObj.setSublistValue({
                            sublistId : "item",
                            fieldId : "taxcode",
                            line : 0,
                            value : targets.targetTaxcodeId
                        })
                    }

                    if(targets.targetBol)
                    {
                        nsRecObj.setSublistValue({
                            sublistId : "item",
                            fieldId : "custcol_wm_bol",
                            line : 0,
                            value : targets.targetBol
                        })
                    }

                    if(targets.targetCust)
                    {
                        nsRecObj.setSublistValue({
                            sublistId : "item",
                            fieldId : "custcol_wm_customer",
                            line : 0,
                            value : targets.targetCust
                        })
                    }

                    if(targets.targetCons)
                    {
                        nsRecObj.setSublistValue({
                            sublistId : "item",
                            fieldId : "custcol_consignee",
                            line : 0,
                            value : targets.targetCons
                        })
                    }
                }

                if(requestBody.FuelSurcharge || requestBody.fuelSurcharge)
                {
                    log.debug("YES YOU HAVE FUEL SURCHARGE", requestBody.FuelSurcharge || requestBody.fuelSurcharge)
                    nsRecObj.setSublistValue({
                        sublistId : "item",
                        fieldId : "item",
                        line : 1,
                        value : FUELSURCHARGE_item
                    })
                    if(PAYLOAD_VALUES_INCLUSIVE_OF_TAX)
                    {
                        nsRecObj.setSublistValue({
                            sublistId : "item",
                            fieldId : "rate",
                            line : 1,
                            value : requestBody.FuelSurcharge || requestBody.fuelSurcharge
                        })
                    }
                    else
                    {
                        nsRecObj.setSublistValue({
                            sublistId : "item",
                            fieldId : "rate",
                            line : 1,
                            value : requestBody.FuelSurcharge || requestBody.fuelSurcharge
                        })
                    }

                    nsRecObj.setSublistValue({
                        sublistId : "item",
                        fieldId : "quantity",
                        line : 1,
                        value : 1
                    })
                    nsRecObj.setSublistValue({
                        sublistId : "item",
                        fieldId : "amount",
                        line : 1,
                        value : requestBody.FuelSurcharge || requestBody.fuelSurcharge
                    })

                    //TODO clear this, it's just for testing standard defaultings
                    // var currentLineTaxcode = nsRecObj.getSublistValue({
                    //     sublistId : "item",
                    //     fieldId : "taxcode",
                    //     line : 1
                    // })
                    // log.debug("currentLineTaxcode", currentLineTaxcode);
                    // var currentLineItem = nsRecObj.getSublistValue({
                    //     sublistId : "item",
                    //     fieldId : "item",
                    //     line : targetLine
                    // })
                    // log.debug("currentLineItem", currentLineItem);
                    //TODO, setup a rule when or when not to add tax
                    if(targets.targetTaxcodeId)
                    {
                        nsRecObj.setSublistValue({
                            sublistId : "item",
                            fieldId : "taxcode",
                            line : 1,
                            value : targets.targetTaxcodeId
                        })
                    }

                    if(targets.targetBol)
                    {
                        nsRecObj.setSublistValue({
                            sublistId : "item",
                            fieldId : "custcol_wm_bol",
                            line : 1,
                            value : targets.targetBol
                        })
                    }

                    if(targets.targetCust)
                    {
                        nsRecObj.setSublistValue({
                            sublistId : "item",
                            fieldId : "custcol_wm_customer",
                            line : 1,
                            value : targets.targetCust
                        })
                    }
                    if(targets.targetCons)
                    {
                        nsRecObj.setSublistValue({
                            sublistId : "item",
                            fieldId : "custcol_consignee",
                            line : 1,
                            value : targets.targetCons
                        })
                    }
                }





                var nsRecObj_itemSublist_count = nsRecObj.getLineCount({
                    sublistId : "item"
                })
                var targetLine = nsRecObj_itemSublist_count;
                var accessorials = requestBody.accessorials || requestBody.Accessorials || [];
                log.debug("accessorials", accessorials)
                if(accessorials.length > 0)
                {
                    for(var a = 0 ; a < accessorials.length ; a++)
                    {


                        log.debug("looping accessorials", accessorials)
                        log.debug("looping targetLine", targetLine)
                        var accessorial = accessorials[a];
                        var accessorial_charge = accessorial.charge;
                        var accessorial_qualifier = accessorial.qualifier;
                        var targetItemInternalId = "";
                        if(accessorial_qualifier && accessorial_mapping[accessorial_qualifier])
                        {
                            targetItemInternalId = accessorial_mapping[accessorial_qualifier]
                        }

                        if(!targetItemInternalId)
                        {
                            targetItemInternalId = accessorial_mapping["Unknown Accessorial Line"] //"Unknown Accessorial Line"
                        }

                        //05202025 Mike wants fixed accessorial
                        targetItemInternalId = accessorial_mapping["Unknown Accessorial Line"] //"Unknown Accessorial Line"

                        log.debug("targetItemInternalId", targetItemInternalId)

                        //do this to default to unknown accessorials
                        // if(accessorial_mapping[accessorial_qualifier] && accessorial_qualifier && accessorial_charge)
                        if(targetItemInternalId && accessorial_qualifier && accessorial_charge)
                        {
                            if(targetItemInternalId)
                            {
                                nsRecObj.setSublistValue({
                                    sublistId : "item",
                                    fieldId : "item",
                                    line : targetLine,
                                    value : targetItemInternalId
                                })
                            }
                            else
                            {
                                nsRecObj.setSublistValue({
                                    sublistId : "item",
                                    fieldId : "item",
                                    line : targetLine,
                                    value : accessorial_mapping["Unknown Accessorial Line"]
                                })
                            }

                            if(PAYLOAD_VALUES_INCLUSIVE_OF_TAX)
                            {
                                nsRecObj.setSublistValue({
                                    sublistId : "item",
                                    fieldId : "rate",
                                    line : targetLine,
                                    value : accessorial_charge
                                })
                            }
                            else
                            {
                                nsRecObj.setSublistValue({
                                    sublistId : "item",
                                    fieldId : "rate",
                                    line : targetLine,
                                    value : accessorial_charge
                                })
                            }

                            nsRecObj.setSublistValue({
                                sublistId : "item",
                                fieldId : "quantity",
                                line : targetLine,
                                value : 1
                            })
                            nsRecObj.setSublistValue({
                                sublistId : "item",
                                fieldId : "amount",
                                line : targetLine,
                                value : accessorial_charge
                            })


                            nsRecObj.setSublistValue({
                                sublistId : "item",
                                fieldId : "description",
                                line : targetLine,
                                value : accessorial_qualifier
                            })

                            //TODO clear this, it's just for testing standard defaultings
                            // var currentLineTaxcode = nsRecObj.getSublistValue({
                            //     sublistId : "item",
                            //     fieldId : "taxcode",
                            //     line : targetLine
                            // })
                            // log.debug("currentLineTaxcode", currentLineTaxcode);
                            // var currentLineItem = nsRecObj.getSublistValue({
                            //     sublistId : "item",
                            //     fieldId : "item",
                            //     line : targetLine
                            // })
                            // log.debug("currentLineItem", currentLineItem);
                            //TODO, setup a rule when or when not to add tax
                            if(targets.targetTaxcodeId)
                            {
                                nsRecObj.setSublistValue({
                                    sublistId : "item",
                                    fieldId : "taxcode",
                                    line : targetLine,
                                    value : targets.targetTaxcodeId
                                })
                            }

                            if(targets.targetBol)
                            {
                                nsRecObj.setSublistValue({
                                    sublistId : "item",
                                    fieldId : "custcol_wm_bol",
                                    line : targetLine,
                                    value : targets.targetBol
                                })
                            }

                            if(targets.targetCust)
                            {
                                nsRecObj.setSublistValue({
                                    sublistId : "item",
                                    fieldId : "custcol_wm_customer",
                                    line : targetLine,
                                    value : targets.targetCust
                                })
                            }
                            if(targets.targetCons)
                            {
                                nsRecObj.setSublistValue({
                                    sublistId : "item",
                                    fieldId : "custcol_consignee",
                                    line : targetLine,
                                    value : targets.targetCons
                                })
                            }
                        }

                        targetLine++;
                    }

                }

            }
            catch(e)
            {
                log.error("ERROR i nfunction fillSublist", e)
            }

            return nsRecObj;
        }

        function clearSublist(nsRecObj, requestBody)
        {
            if(nsRecObj.type == "itemreceipt")
            {
                var nsRecObj_itemSublist_count = nsRecObj.getLineCount({
                    sublistId : "item"
                })

                for(var a = nsRecObj_itemSublist_count ; a > 0 ; a--)
                {
                    var itemId = nsRecObj.getSublistValue({
                        sublistId : "item",
                        fieldId : "item",
                        line : a-1
                    })
                    log.debug("clearSublist itemId", itemId)
                    //TODO dont have to uncheck it if it passed.
                    if(itemId == NF_item)
                    {
                        nsRecObj.setSublistValue({
                            sublistId : "item",
                            fieldId : "itemreceive",
                            line : a-1,
                            value : true
                        })
                    }
                    //just receive all - Cody said he spoke with Mike and accepted PO,IR,BILL to be created all at the same time.
                    else if(itemId != NF_item)
                    {
                        nsRecObj.setSublistValue({
                            sublistId : "item",
                            fieldId : "itemreceive",
                            line : a-1,
                            // value : false,
                            value : true
                        })
                    }
                }
            }
            else
            {
                var NF_rate = requestBody.rate || requestBody.Rate;

                var nsRecObj_itemSublist_count = nsRecObj.getLineCount({
                    sublistId : "item"
                })

                log.debug("clearSublist nsRecObj_itemSublist_count", nsRecObj_itemSublist_count)

                for(var a = nsRecObj_itemSublist_count ; a > 0 ; a--)
                {
                    log.debug("clearSublist, a", a);
                    var itemId = nsRecObj.getSublistValue({
                        sublistId : "item",
                        fieldId : "item",
                        line : a-1
                    })
                    log.debug("clearSublist itemId", itemId)
                    // if(itemId == NF_item)
                    // {
                    //     nsRecObj.setSublistValue({
                    //         sublistId : "item",
                    //         fieldId : "rate",
                    //         line : a-1,
                    //         value : NF_rate
                    //     })
                    // }
                    // else if(itemId != NF_item)
                    // {
                    nsRecObj.removeLine({
                        sublistId : "item",
                        line : a-1
                    })
                    // }
                }
            }
            return nsRecObj;
        }

        function lookupPo_final(loadID)
        {
            var lookupPo_result = {list : []};
            try
            {
                var purchaseorderSearchObj = search.create({
                    type: "purchaseorder",
                    // settings:[{"name":"consolidationtype","value":"ACCTTYPE"}],
                    filters:
                        [
                            ["type","anyof","PurchOrd"],
                            "AND",
                            // ["status","anyof","PurchOrd:F","PurchOrd:E"],
                            // ["status","anyof","PurchOrd:A","PurchOrd:B","PurchOrd:F","PurchOrd:D","PurchOrd:E"],
                            // "AND",
                            ["mainline","is","T"],
                            "AND",
                            [["externalidstring","is",loadID],
                                // "OR",["poastext","is",loadID]
                            ]
                        ],
                    columns:
                        [
                            search.createColumn({name:"status"})
                        ]
                });

                var sr = purchaseorderSearchObj.run();

                sr.each(function(res){
                    lookupPo_result.list.push({id:res.id});
                    if(res.getValue({name:"status"}) == "fullyBilled")
                    {
                        lookupPo_result.list[0].errorcode = "Warning, the PO have related records that may be affected."
                        lookupPo_result.list[0].status = res.getValue({name:"status"})
                    }
                    //no just get the first result
                    return false;
                })
            }
            catch(e)
            {
                log.error("ERROR in function lookupPo", e)
            }

            return lookupPo_result
        }

        function lookupPo(loadID)
        {
            var lookupPo_result = {list : []};
            try
            {
                var purchaseorderSearchObj = search.create({
                    type: "purchaseorder",
                    settings:[{"name":"consolidationtype","value":"ACCTTYPE"}],
                    filters:
                        [
                            ["type","anyof","PurchOrd"],
                            "AND",
                            // ["status","anyof","PurchOrd:F","PurchOrd:B","PurchOrd:A"],
                            // "AND",
                            ["mainline","is","T"],
                            "AND",
                            [["externalidstring","is",loadID],
                                // "OR",["poastext","is",loadID]
                            ]
                        ],
                    columns:
                        [
                            search.createColumn({name:"status"})
                        ]
                });

                var sr = purchaseorderSearchObj.run();

                sr.each(function(res){
                    log.debug("res", res)
                    lookupPo_result.list.push({id:res.id});
                    if(res.getValue({name:"status"}) == "fullyBilled")
                    {
                        lookupPo_result.list[0].errorcode = "Warning, the PO have related records that may be affected."
                        lookupPo_result.list[0].status = res.getValue({name:"status"})
                    }
                    //no just get the first result
                    //no just get the first result
                    return false;
                })
            }
            catch(e)
            {
                log.error("ERROR in function lookupPo", e)
            }

            return lookupPo_result
        }

        /**
         * Defines the function that is executed when a DELETE request is sent to a RESTlet.
         * @param {Object} requestParams - Parameters from HTTP request URL; parameters are passed as an Object (for all supported
         *     content types)
         * @returns {string | Object} HTTP response body; returns a string when request Content-Type is 'text/plain'; returns an
         *     Object when request Content-Type is 'application/json' or 'application/xml'
         * @since 2015.2
         */
        const doDelete = (requestParams) => {

        }

        //TODO
        var sample = {
            "carrierParentId": "string",
            "distance": 0,
            "fuelSurchargeQualifier": "string",
            "controlCustomerNumber": "string",
            "rateType": "string",
            "loadID": "string",
            "rate": 0.1,
            "goodsServicesAmount": 0.1,
            "invoiceNumber": "string",
            "currency": "string",
            "carrierID": "string",
            "isFinalInvoice": true,
            "netAmount": 0.1,
            "harmonizedSalesAmount": 0.1,
            "nonassignedCarrierAccessorials": [
                {
                    "carrier": "string",
                    "charge": 0.1,
                    "qualifier": "string",
                    "acctCode": "string"
                }
            ],
            "transactionDate": "2019-08-24T14:15:22Z",
            "acctCode": "string",
            "refs": [
                {
                    "referenceNumber": "string",
                    "referenceType": "string"
                }
            ],
            "methodOfPayment": "string",
            "lineHaul": 0.1,
            "minimumCharge": 0.1,
            "rateQualifier": "string",
            "accessorials": [
                {
                    "charge": 0.1,
                    "qualifier": "string"
                }
            ],
            "provincialSalesAmount": 0.1,
            "fuelSurcharge": 0.1,
            "apiType": "string"
        }
        var sample1 = {
            "integrationLogTags" : "test,postman,t",
            "CarrierParentId": null,
            "NetAmount": 3450.01082,
            "HarmonizedSalesAmount": 0,
            "NonassignedCarrierAccessorials": null,
            "InvoiceDate": "2025-04-16T13:59:49.8635151-06:00",
            "AcctCode": null,
            "ControlCustomerNumber": "6170",
            "LoadID": "F0425XZ9",
            "Rate": 3400,
            "RateQualifier": "FC",
            "GoodsServicesAmount": 0,
            "MethodOfPayment": "P",
            "LineHaul": 3400,
            "MinimumCharge": 0,
            "InvoiceNumber": null,
            "Currency": "CAD",
            "Accessorials": [
                {
                    "qualifier": "Detention Chargee",
                    "charge": 50
                },
                {
                    "qualifier": "Detention Charge",
                    "charge": 20
                },
                {
                    "qualifier": "Detention Charge",
                    "charge": 20
                },
                {
                    "qualifier": "Detention Chargesss",
                    "charge": 33
                }
            ],
            "CarrierID": "1366",
            "ProvincialSalesAmount": 0,
            "FuelSurcharge": 50.01082,
            "FuelSurchargeQualifier": "FC",
            "ApiType": "INVOICE_UPDATE",
            "IsFinalInvoice": false
        }

        return {get, put, post, delete: doDelete}

    });
