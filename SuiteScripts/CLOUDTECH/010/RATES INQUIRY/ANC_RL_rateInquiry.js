/**
 * @NApiVersion 2.1
 * @NScriptType Restlet
 */
define(['N/task', 'N/https', 'N/record', 'N/runtime', 'N/search', 'N/url'],
    /**
 * @param{https} https
 * @param{record} record
 * @param{runtime} runtime
 * @param{search} search
 * @param{url} url
 */
    (task, https, record, runtime, search, url) => {
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
            triggerMr(requestParams);
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

        function triggerMr(requestParams)
        {
            var taskObj = task.create({
                taskType : task.TaskType.MAP_REDUCE,
                scriptId : "customscript_anc_mr_ratesinquiry",
                deploymentId : "customdeploy_anc_mr_ratesinquiry"
            });

            var mrTaskId = taskObj.submit();
            log.debug("mrTaskId", mrTaskId);
        }

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
            var responseBody = {};
            try
            {
                log.debug("requestBody", requestBody);

                if(typeof requestBody == "object")
                {
                    responseBody = requestBody;

                    return JSON.stringify(responseBody);
                }
                else
                {
                    return responseBody;
                }
            }
            catch(e)
            {
                log.error("ERROR in function post", e)
            }
            return JSON.stringify(responseBody);
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

        }

        return {get, put, post, delete: doDelete}

    });
