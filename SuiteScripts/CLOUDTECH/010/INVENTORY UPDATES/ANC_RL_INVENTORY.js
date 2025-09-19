/**
 * @NApiVersion 2.1
 * @NScriptType Restlet
 */

//delete integration logs
// var arr = nlapiSearchRecord(nlapiGetRecordType());
// for(var a = 0 ; a < arr.length ; a++)
// {
//     nlapiDeleteRecord(arr[a].getRecordType(), arr[a].getId())

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


        var integrationLogId = null;
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
            var respMsg = {requestBody};
            var createdShipmentRecId = "";
            try
            {
                integrationLogId = ANC_lib.submitIntegrationLog(integrationLogId,{request:JSON.stringify(requestBody)});

                log.debug("requestBody", requestBody);

                var loadId = requestBody.Load.Body.LoadNo;
                var customerId = requestBody.Load.Body.CustomerId;
                var consigneeId = requestBody.Load.Body.ConsigneeId;
                var otherDetails = {customerId, consigneeId};

                log.debug("{loadId, otherDetails}", {loadId, otherDetails})

                if(loadId && otherDetails)
                {
                    var createdShipmentRecId = ANC_lib.prepLoad(loadId, otherDetails);
                    log.debug("createdShipmentRecId", createdShipmentRecId);
                }
                else
                {
                    throw {success:false, message:"cannot resolve details provided" + JSON.stringify({loadId, otherDetails})}
                }

                respMsg={success:true, message: "created shipment for " + JSON.stringify({loadId, otherDetails}), nsRecordInternalId:createdShipmentRecId, warnings : [], requestBody:requestBody};
                //TODO
                // respMsg={success:false, message: "ERROR caught: " + JSON.stringify(e), nsRecordInternalId:integrationLogId, warnings : [], requestBody:requestBody};

            }
            catch(e)
            {
                log.error("ERROR in function post", e)
                respMsg={success:false, message: "ERROR caught: " + JSON.stringify(e), requestBody};
            }

            respMsg.integrationLogId = integrationLogId;
            var respMsgStr = JSON.stringify(respMsg);

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
