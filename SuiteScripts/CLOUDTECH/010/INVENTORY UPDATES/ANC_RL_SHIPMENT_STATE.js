/**
 * @NApiVersion 2.1
 * @NScriptType Restlet
 */
define(['/SuiteScripts/ANC_lib.js', 'N/https', 'N/record', 'N/runtime', 'N/search', 'N/url'],

    (ANC_lib, https, record, runtime, search, url) => {
            /**
             * Defines the function that is executed when a GET request is sent to a RESTlet.
             * @param {Object} requestParams - Parameters from HTTP request URL; parameters passed as an Object (for all supported
             *     content types)
             * @returns {string | Object} HTTP response body; returns a string when request Content-Type is 'text/plain'; returns an
             *     Object when request Content-Type is 'application/json' or 'application/xml'
             * @since 2015.2
             */
            const get = (requestParams) => {

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

            /**
             * Defines the function that is executed when a POST request is sent to a RESTlet.
             * @param {string | Object} requestBody - The HTTP request body; request body is passed as a string when request
             *     Content-Type is 'text/plain' or parsed into an Object when request Content-Type is 'application/json' (in which case
             *     the body must be a valid JSON)
             * @returns {string | Object} HTTP response body; returns a string when request Content-Type is 'text/plain'; returns an
             *     Object when request Content-Type is 'application/json' or 'application/xml'
             * @since 2015.2
             */
            const post = (requestBody) => {
                    var integrationLogId = ANC_lib.submitIntegrationLog(integrationLogId,{request:JSON.stringify(requestBody)});
                    try
                    {
                            respMsg = {
                                    success:true,
                                    message: `Hello, you connected to ANC NETSUITE ${runtime.accountId} : ${runtime.envType} : LOAD/SHIPMENT STATE API`,
                                    api_message : "This endpoint is under development",
                                    requestBody: requestBody
                            }
                    }
                    catch(e)
                    {
                            log.error("ERROR in ANC_RL_SHIPMENT_STATE.js function post", e)
                            respMsg={success:false, message: "ERROR caught: " + JSON.stringify(e), requestBody};
                    }
                    respMsg.integrationLogId = integrationLogId;
                    respMsgStr = JSON.stringify(respMsg);

                    integrationLogId = ANC_lib.submitIntegrationLog(integrationLogId,{response:respMsgStr});
                    log.debug(integrationLogId, integrationLogId)
                    return respMsgStr
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
