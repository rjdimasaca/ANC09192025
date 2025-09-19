/**
 * @NApiVersion 2.1
 * @NScriptType Suitelet
 * @NModuleScope SameAccount
 */

/**
 * no longer shows UI as of July 11 2025, it will be a full background process contrary to initial requests.
 */
define(['/SuiteScripts/ANC_lib.js', 'N/task', 'N/https', 'N/record', 'N/redirect', 'N/runtime', 'N/search', 'N/url', 'N/ui/serverWidget'],
    /**
     * @param{runtime} runtime
     * @param{search} search
     * @param{url} url
     */
    (ANC_lib, task, https, record, redirect, runtime, search, url, uiSw) => {

        var globalrefs = {};
        var orderLineLimit = 0;
        var fitmentLineLimit = 1;
        var allowMultiGrade = true;
        var DEBUGMODE = false;
        var accountId = "";
        var form = "";
        var CONSIGNEE_REC_TYPE = "customrecord_alberta_ns_consignee_record"
        var serverWidget = uiSw;


        var SUBMITTED_FITMENT_RESULT_COLUMNS = [
            search.createColumn({name: "tranid", label: "Document Number"}),
            search.createColumn({name: "custcol_anc_relatedtransaction", label: "Related Transaction"}),
            search.createColumn({name: "custcol_anc_relatedlineuniquekey", label: "Related Line Unique Key"}),
            search.createColumn({name: "item", label: "Item"}),
            search.createColumn({name: "custcol_anc_actualitemtobeshipped", label: "Actual Item To Be Shipped"}),
            search.createColumn({name: "custbody_anc_carrier", label: "Carrier(vendor)"}),
            search.createColumn({name: "custbody_anc_vehicleno", label: "Vehicle Number"}),
            search.createColumn({name: "custbody_anc_trackingno", label: "Tracking No"}),
            search.createColumn({name: "lineuniquekey", label: "Line Unique Key"})
        ];

        var TEMPORARY_SHIPMENT_ITEM = 188748;

        var BASE_SUBLIST_ID = "custpage_sublist_fitmentcheck";
        var BASE_SUBTAB_ID = "custpage_tab_fc";

        var SHIPMENT_CONSIGNEE_FIELD_ID = "custbody_consignee";

        const onRequest = (scriptContext) =>
        {
            var script_timeStamp_start = new Date().getTime();

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
                    form = uiSw.createForm({
                        title: "Fitment/Shipments Being Processed...",
                        hideNavBar: true
                    })

                    // form.clientScriptModulePath = './ANC_CS_FITMENT_AND_RESERVE.js'
                    var listOfTrans = getInputDetails(scriptContext);

                    var srToObjects = {};

                    log.debug("scriptContext.request.parameters", scriptContext.request.parameters);

                    if(scriptContext.request.parameters.rectype == "transferorder")
                    {

                        if(scriptContext.request.parameters.leg == 1)
                        {
                            //TODO this one does not accept flat ids.
                            // srGroupedByDeliveryDate = ANC_lib.groupLinesForLeg1ShipmentGeneration(listOfTrans, null, null, scriptContext.request.parameters.leg)
                            srToObjects = ANC_lib.groupOrderLinesForShipmentGeneration(listOfTrans, null, null, null, scriptContext.request.parameters.leg)
                        }
                        else
                        {
                            srToObjects = ANC_lib.groupOrderLinesForShipmentGeneration(listOfTrans, null, null, null, scriptContext.request.parameters.leg)
                        }

                        srToObjects = ANC_lib.groupOrderLinesForShipmentGeneration(listOfTrans)

                        srToObjects2 = ANC_lib.standardizeObjectKeysByProcess(srToObjects, "prerelease");
                        log.debug("srToObjects2", srToObjects2);
                        srToObjects = srToObjects2;

                        var srGroupedByDeliveryDate = ANC_lib.resolveLegOrigcityDestcity_LP(srToObjects, ["deliverydate", "locationtext", "lane_destinationcity", "equipmenttext"], 1, false)
                        log.debug("srGroupedByDeliveryDate", srGroupedByDeliveryDate)

                        //NOTE TO do not need to max2 custconsignees it is always fully assumed as an ANC custconsignee
                        // srGroupedByDeliveryDate = ANC_lib.splitByConsigneeMax2(srGroupedByDeliveryDate)
                        // log.debug("srGroupedByDeliveryDate max2 cons", srGroupedByDeliveryDate)

                    }
                    else
                    {
                        srToObjects = ANC_lib.groupOrderLinesForShipmentGeneration(listOfTrans)

                        srToObjects2 = ANC_lib.standardizeObjectKeysByProcess(srToObjects, "ordercheck");
                        log.debug("srToObjects2", srToObjects2);
                        srToObjects = srToObjects2;

                        var srGroupedByDeliveryDate = ANC_lib.resolveLegOrigcityDestcity_LP(srToObjects, ["deliverydate", "lane_crossdockcity", "lane_destinationcity", "equipmenttext"], null, false)
                        log.debug("srGroupedByDeliveryDate", srGroupedByDeliveryDate)

                        // var srGroupedByDeliveryDate = srToObjects;

                        //TODO individual orders are guaranteed single consignee, so never had to use it here, even if its a leg0
                        // srGroupedByDeliveryDate = ANC_lib.splitByConsigneeMax2(srGroupedByDeliveryDate)
                        // log.debug("srGroupedByDeliveryDate max2 cons", srGroupedByDeliveryDate)

                    }

                    // var srGroupedByDeliveryDate = ANC_lib.resolveLegOrigcityDestcity(srToObjects, ["line_shipdate", "line_locationtext", "custrecord_anc_lane_destinationcity", "line_equipmenttext"], scriptContext.request.parameters.leg)
                    // log.debug("srGroupedByDeliveryDate", srGroupedByDeliveryDate)


                    var customJobId = ANC_lib.submitSyncJob_orderCheck(srGroupedByDeliveryDate);

                    var fitmentJobObj = ANC_lib.processJobId( customJobId)

                    try
                    {
                        for(var a = 0 ; a < listOfTrans.length ; a++)
                        {
                            var values = {
                                custbody_anc_syncjob : customJobId
                            };
                            values[ANC_lib.references.SO_FIELDS.ORDERSTATUS.id] = ANC_lib.references.SO_FIELDS.ORDERSTATUS.options.CHECKING.val
                            record.submitFields({
                                type : scriptContext.request.parameters.rectype || "salesorder",
                                id : listOfTrans[a],
                                values : values
                            })
                        }
                    }
                    catch(ordupdateerr)
                    {
                        log.error("ERROR in file ANC_SL_FITMENT_CHECKING.js function onRequest, ordupdateerr", ordupdateerr)
                    }

                    form = serverWidget.createForm({
                        title : "Fitment Check",
                        hideNavBar : false
                    });


                    form.clientScriptModulePath = './ANC_CS_FITMENT_AND_RESERVE.js'

                    var jobDetails = form.addField({
                        label : "InlineHtml",
                        id : "custpage_fld_joblink",
                        type : "inlinehtml"
                    });
                    jobDetails.defaultValue = customJobId

                    var syncJobUrl = url.resolveRecord({
                        recordType : "customrecord_anc_syncjob",
                        recordId : customJobId,
                        params : {
                            openedfrom_loadplanning : "T"
                        }
                    })
                    log.debug("syncJobUrl", syncJobUrl)
                    jobDetails.defaultValue = `
                    <script>window.onload = function() {
                        window.opener.location.reload()
                    })
                    window.opener.location.reload();
                    </script>
                    <a href="${syncJobUrl}">SYNC JOB:${customJobId}</a>
                    `

                    scriptContext.response.writePage(form);

                    // redirect.toRecord({
                    //     type : "customrecord_anc_syncjob",
                    //     id : customJobId
                    // })
                    //
                    // log.debug("onRequest customJobId", customJobId)

                    // var jobId = form.addField({
                    //     label : "Job Id",
                    //     id : "custpage_fld_jobid",
                    //     type : "text"
                    // });
                    // jobId.defaultValue = fitmentJobObj.jobId
                    //
                    // var jobDetails = form.addField({
                    //     label : "Task Object",
                    //     id : "custpage_fld_taskobj",
                    //     type : "textarea"
                    // });
                    // jobDetails.defaultValue = fitmentJobObj.taskObj
                    //
                    //
                    // scriptContext.response.writePage(form);
                }
                else
                {
                    fitmentCheckFormSubmitted(scriptContext)
                }
            }
            catch(e)
            {
                log.error("ERROR in function onRequest", e);
            }

            var script_timeStamp_end = new Date().getTime();
            log.debug("script time stats", {script_timeStamp_start, script_timeStamp_end, duration: script_timeStamp_start - script_timeStamp_end})

        }





        var equipmentList = [];


        var shipmentLineIdTracker = {};
        function getInputDetails(scriptContext)
        {
            try
            {
                var listOfTrans = [scriptContext.request.parameters["traninternalid"]];


                return listOfTrans;

            }
            catch(e)
            {
                log.error("ERROR in function getInputDetails", e)
            }
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



/*
sample payload
{"JurisdictionName":"Canada","vehicleName":"TRTAMHTR53","transportationMode":"TRUCK","orderItems":[{"ItemId":"69348155","Diameter":100,"Width":100,"Weight":"673.1","Nb":"40","Type":1,"RPP":1}]}
 */

/*
sample response
{
  "isSuccess": true,
  "errorMessage": "",
  "shipments": [
    {
      "shipmentNumber": 1,
      "shipmentItems": [
        {
          "itemId": "69348155",
          "nb": 24
        }
      ],
      "base64Image": "",
      "loadingPattern": null
    },
    {
      "shipmentNumber": 2,
      "shipmentItems": [
        {
          "itemId": "69348154",
          "nb": 8
        },
        {
          "itemId": "69348155",
          "nb": 16
        }
      ],
      "base64Image": "",
      "loadingPattern": null
    },
    {
      "shipmentNumber": 3,
      "shipmentItems": [
        {
          "itemId": "69348154",
          "nb": 24
        }
      ],
      "base64Image": "",
      "loadingPattern": null
    },
    {
      "shipmentNumber": 4,
      "shipmentItems": [
        {
          "itemId": "69348154",
          "nb": 8
        }
      ],
      "base64Image": "",
      "loadingPattern": null
    }
  ]
}
 */