/**
 * @NApiVersion 2.1
 * @NScriptType Restlet
 */
define(['/SuiteScripts/ANC_lib.js', 'N/https', 'N/query', 'N/record', 'N/runtime', 'N/search', 'N/url', 'N/email'],
    /**
     * @param{https} https
     * @param{record} record
     * @param{runtime} runtime
     * @param{search} search
     * @param{url} url
     */
    (ANC_lib, https, query, record, runtime, search, url, email) => {
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
            log.debug("GET requestParams", requestParams);
        }

        var soIds = [];
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
            log.debug("PUT requestBody", requestBody);
        }

        var salesOrdersToUpdate = [];
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
            var respMsg = {};
            try
            {
                log.debug("POST requestBody", requestBody);
                var integrationLogId = ANC_lib.submitIntegrationLog(integrationLogId,{request:JSON.stringify(requestBody)});
                if(typeof requestBody == "object")
                {
                    respMsg = requestBody;

                    respMsg.message = "Hello Vlad, Your Connection Is Successful! -Rodmar"
                    respMsg.timestamp = new Date().getTime();
                }
                else
                {
                    requestBody = JSON.parse(requestBody);

                    respMsg = JSON.parse(respMsg)

                    respMsg.message = "Hello Vlad, Your Connection Is Successful! -Rodmar"
                    respMsg.timestamp = new Date().getTime();
                }

                log.debug("requestBody", requestBody)
                log.debug("requestBody.length", requestBody.length)
                if(requestBody && requestBody.length > 0)
                {
                    processLoadXpertResults(requestBody);
                }

                log.debug("soIds", soIds);
                for(var a = 0 ; a < soIds.length; a++)
                {
                    var soId_values = {};
                    soId_values[ANC_lib.references.SO_FIELDS.ORDERSTATUS.id] = ANC_lib.references.SO_FIELDS.ORDERSTATUS.options["CHECK COMPLETE"].val;
                    var soMarkedAsCheckComplete = record.submitFields({
                        type : "salesorder",
                        id : soIds[a],
                        values : soId_values
                    })
                    log.debug("soMarkedAsCheckComplete", soMarkedAsCheckComplete);
                }



            }
            catch(e)
            {
                log.error("ERROR in function post", e)
            }

            respMsg.integrationLogId = integrationLogId;
            var respMsgStr = JSON.stringify(respMsg);

            integrationLogId = ANC_lib.submitIntegrationLog(integrationLogId,{response:respMsgStr});

            return JSON.stringify(respMsg);
        }

        function processLoadXpertResults(loadXpertResultList)
        {
            try
            {
                var loadXpertResult_correlatedIds = loadXpertResultList.map(function(elem){

                    return elem.correlationId
                });

                log.debug("processLoadXpertResults loadXpertResult_correlatedIds", loadXpertResult_correlatedIds)

                var correlatedRecs = getCorrelatedRecs(loadXpertResult_correlatedIds);

                // for (var a = 0; a < correlatedRecs.length; a++)
                // {
                var a = 0;
                if(a == 0)
                {
                    if(correlatedRecs[a].parentid)
                    {
                        var parentSyncJobRec = record.load({
                            type : "customrecord_anc_syncjob",
                            id : correlatedRecs[a].parentid
                        });

                        var lineCount = parentSyncJobRec.getLineCount({
                            sublistId : ""
                        })
                        log.debug("lxpert.length", loadXpertResultList.length);
                        log.debug("typeof loadXpertResultList", typeof loadXpertResultList);
                        log.debug("loadXpertResultList[0]", loadXpertResultList[0]);
                        for(var b = 0 ; b < loadXpertResultList.length ; b++)
                        {
                            log.debug("b start", b)
                            log.debug("loadXpertResultList[b]", loadXpertResultList[b])

                            log.debug("typeof loadXpertResultList[b]", typeof loadXpertResultList[b]);

                            var correlationIdIndex = parentSyncJobRec.findSublistLineWithValue({
                                sublistId : "recmachcustrecord_anc_syncjobdet_syncjob",
                                fieldId : "id",
                                value : ""+(loadXpertResultList[b].correlationId)
                            });

                            log.debug("correlationIdIndex", correlationIdIndex)
                            if(correlationIdIndex != -1)
                            {
                                parentSyncJobRec.setSublistValue({
                                    sublistId : "recmachcustrecord_anc_syncjobdet_syncjob",
                                    fieldId : "custrecord_anc_syncjobdet_response",
                                    value : JSON.stringify(loadXpertResultList[b]),
                                    line : correlationIdIndex
                                })
                            }
                            log.debug("b end", b)
                        }
                        log.debug("c start", b)

                        parentSyncJobRec.setValue({
                            fieldId : "custrecord_anc_syncjob_response",
                            value : JSON.stringify(loadXpertResultList)
                        });

                        var submittedParentSyncJobRecId = parentSyncJobRec.save({
                            ignoreMandatoryFields : true,
                            enableSourcing : true
                        });
                        log.debug("submittedParentSyncJobRecId", submittedParentSyncJobRecId);
                    }

                }
                a++;
                // }

                log.debug("processLoadXpertResults correlatedRecs1", correlatedRecs);

                // email.send({
                //     author : runtime.getCurrentUser().id,
                //     recipients : "netrosuite@gmail.com",
                //     subject : "log correlatedRecs",
                //     body : JSON.stringify(correlatedRecs)
                // })

                var correlatedRecs_byCorrelationId = ANC_lib.groupBy(correlatedRecs, "id")

                log.debug("correlatedRecs_byCorrelationId", correlatedRecs_byCorrelationId);

                // for(var a = 0 ; a < loadXpertResultList.length ; a++)
                // {
                //
                // }
                for(var a = 0 ; a < loadXpertResultList.length; a++)
                {
                    var loadXpertResultObj = loadXpertResultList[a];
                    processLoadXpertResult(loadXpertResultObj, correlatedRecs_byCorrelationId)
                }
            }
            catch(e)
            {
                log.error("ERROR in function processLoadXpertResults", e)
            }
        }

        function getCorrelatedRecs(correlatedRecIds)
        {
            var filters = [];
            var correlatedRecs = []
            if(correlatedRecIds && correlatedRecIds.length > 0)
            {
                filters.push(
                    ["internalid", "anyof", correlatedRecIds]
                )
            }
            if(correlatedRecIds) //TODO or use condition on variable filters instead
            {

                correlatedRecs = searchCorrelatedRecs(correlatedRecIds);
                log.debug("processLoadXpertResults correlatedRecs2", correlatedRecs)

            }

            log.debug("getCorrelatedRecs correlatedRecs", correlatedRecs)
            return correlatedRecs;
        }

        function searchCorrelatedRecs(correlatedRecIds)
        {
            ////TODO via search
            // //only perform search if there are specific correlatedRecIds, otherwise you will waste processing power retrieving everything - Rod
            // var customrecord_anc_syncjobdetailSearchObj = search.create({
            //     type: "customrecord_anc_syncjobdetail",
            //     filters:
            //     filters,
            //     columns:
            //         [
            //             search.createColumn({name: "name", label: "Name"}),
            //             search.createColumn({name: "scriptid", label: "Script ID"}),
            //             search.createColumn({name: "custrecord_anc_syncjobdet_request", label: "Sync Job Detail Request"}),
            //             search.createColumn({name: "custrecord_anc_syncjobdet_response", label: "Sync Job Detail Response"}),
            //             search.createColumn({name: "custrecord_anc_syncjobdet_syncjob", label: "Parent Sync Job"})
            //         ]
            // });
            // var searchResultCount = customrecord_anc_syncjobdetailSearchObj.runPaged().count;
            // log.debug("customrecord_anc_syncjobdetailSearchObj result count",searchResultCount);
            // customrecord_anc_syncjobdetailSearchObj.run().each(function(result){
            //     // .run().each has a limit of 4,000 results
            //     return true;
            // });





            //VIA SUITEQL query
            // Example dynamic filtering: add WHERE clauses using bind params
            // Build your WHERE as needed; keep it parameterized.
            const whereClauses = [`d.id IN (${correlatedRecIds})`];
            const params = [];

            // e.g. filter by a specific parent sync job internal id
            // whereClauses.push('d.custrecord_anc_syncjobdet_syncjob = ?');
            // params.push(12345);

            // e.g. filter by name like
            // whereClauses.push('LOWER(d.name) LIKE ?');
            // params.push('%error%');

            const whereSql = whereClauses.length ? `WHERE ${whereClauses.join(' AND ')}` : '';

            const sql = `
                SELECT
                    d.id,
                    d.name,
                    d.scriptid,
                    d.custrecord_anc_syncjobdet_syncjob  AS parentid,
                    p.name                                AS parentname,
                    d.custrecord_anc_syncjobdet_request  AS request,
                    d.custrecord_anc_syncjobdet_response AS response,
                FROM customrecord_anc_syncjobdetail d
                         LEFT JOIN customrecord_anc_syncjob p
                                   ON p.id = d.custrecord_anc_syncjobdet_syncjob
                    ${whereSql}
                ORDER BY d.id DESC
            `;

            const res = query.runSuiteQL({ query: sql, params });
            const rows = res.asMappedResults(); // array of {id, name, scriptid, request, response, parentid, parentname}

            log.debug('SuiteQL rows count', rows.length);

            rows.forEach(r => {
                log.debug('Row', r);
                // r.parentid is the raw internal ID (value)
                // r.parentname is the display text (joined from parent record)
                r.request = JSON.parse(r.request)
                log.debug('r.request', r.request);
            });

            log.debug("searchCorrelatedRecs rows", rows)
            return rows;
        }

        function processLoadXpertResult(loadXpertResultObj, correlatedRecs_byCorrelationId)
        {
            try
            {
                if(loadXpertResultObj.correlationId && correlatedRecs_byCorrelationId)
                {
                    // If Pre-Release sends { forceLeg: 1 } with the payload, we pass it through.
                    // Other callers don’t send it, so behavior remains unchanged.
                    var opts = {};
                    if (loadXpertResultObj.forceLeg != null) {
                        opts.leg = String(loadXpertResultObj.forceLeg);
                    }

                    // ANC_lib.processDeferredResponse(loadXpertResultObj, correlatedRecs_byCorrelationId, opts);
                    ANC_lib.processDeferredResponse2(loadXpertResultObj, correlatedRecs_byCorrelationId, opts, soIds);
                }
            }
            catch(e)
            {
                log.error("ERROR in function processLoadXpertResult", e)
            }
        }

        function getRateInquiryResponse(rawData)
        {

            // var sample = {"transportationMethod":"R","methodOfPayment":"PP","releaseCode":"R","carrierID":"1250","equipment":[{"prefix":"RC60","number":"TBOX676282"}],"originStation":{"city":"Whitecourt","state":"AB"},"destinationStation":{"city":"Lulu Island","state":"BC"},"routeInformation":[{"carrierID":"1250","code":"CN","city":"Whitecourt"}],"orders":[{"orderNumber":"096847","lineItems":[{"commodity":"2621345","qualifier":"T","measures":[{"weight":71064,"weightQualifier":"E","ladingQuantity":10,"packagingCode":"ROL"}]}]}]}





            var rateInquiryResponse = {};
            try
            {
                rateInquiryResponse.summary = {};
                rateInquiryResponse.list = [];

                log.debug("getRateInquiryResponse rawData before HTTP POST", rawData)

                var rawResp = "";
                try
                {
                    var rawResp = https.post({
                        // url: "https://esb.albertanewsprint.com:50107/TMX",
                        url: "https://esb.albertanewsprint.com:443/TMX",
                        body : {
                            equipment : rawData.equipmentName,
                            commodity : 2621345,
                            id : 2621345,
                            weight : 71064,
                            // weight : 500,
                            controlCust : 1,
                            effectiveDate : "3/19/2024"
                        }
                    });

                    log.debug("getRateInquiryResponse rawResp", rawResp)
                }
                catch(e)
                {
                    log.error("ERROR in function getRateInquiryResponse", e)
                }

                //TEMP
                rawResp = {
                    body : [
                        {
                            "loadID": "string",
                            "shipmentID": "string",
                            "rates": [
                                {
                                    "carrier": "163AFC5F-1B38-4EB5-BE8F-51625D46F2E3",
                                    "lineHaulCharge": 0.1,
                                    "route": "ANC TEST LANE1",
                                    "railRateAuthority": "string",
                                    "distance": 0,
                                    "transitTime": 111,
                                    "equipment": rawData.equipmentName,
                                    "currency": "string",
                                    "accessorials": [
                                        {
                                            "accCharge": 0.1,
                                            "accQual": "string"
                                        }
                                    ],
                                    "fuelSurcharge": 0.1,
                                    "carrierGroupName": "string",
                                    "totalCost": 0.1
                                },
                                {
                                    "carrier": "1B5F8CFF-5BB0-4112-834C-31964EC514F0",
                                    "lineHaulCharge": 0.1,
                                    "route": "ANC TEST LANE2",
                                    "railRateAuthority": "string",
                                    "distance": 0,
                                    "transitTime": 222,
                                    "equipment": rawData.equipmentName,
                                    "currency": "string",
                                    "accessorials": [
                                        {
                                            "accCharge": 0.1,
                                            "accQual": "string"
                                        }
                                    ],
                                    "fuelSurcharge": 0.1,
                                    "carrierGroupName": "string",
                                    "totalCost": 0.1
                                },
                            ],
                            "id": "string",
                            "errors": [
                                {
                                    "errorDesc": "string",
                                    "errorCode": 0
                                }
                            ],
                            "effectiveDate": "2019-08-24",
                            "timestamp": "string"
                        }
                    ]
                };

                if(typeof rawResp.body == "object")
                {
                    rateInquiryResponse.list = rawResp.body;
                    rateInquiryResponse.firstresult = rawResp.body[0];
                }



            }
            catch(e)
            {
                log.error("ERROR in function getRateInquiryResponse", e);
            }
            return rateInquiryResponse;
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
            log.debug("DELETE requestParams", requestParams);
        }



        return {get, put, post, delete: doDelete}

    });
