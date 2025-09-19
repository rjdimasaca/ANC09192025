/**
 * @NApiVersion 2.1
 * @NScriptType MapReduceScript
 * @description This script processes PDF files from a specified folder,
 * extracts sales order data using the Google Gemini API, converts quantities
 * to metric tons, and creates Sales Order records in NetSuite.
 */
define(['N/file', 'N/https', 'N/log', 'N/search', 'N/record'],
    (file, https, log, search, record) => {

        // --- Gemini API Configuration ---
        // CRITICAL: The API key below is a placeholder. Replace it with your actual key.
        // For production, store this key in NetSuite's secret management (see notes below script).
        const GEMINI_API_KEY = 'AIzaSyDirZdORqDIdio5ZrGD3jlkl22sZXOd0eU';
        const MODEL = 'gemini-2.5-pro';
        const API_BASE_URL = 'https://generativelanguage.googleapis.com/v1beta';

        // --- File & Record Configuration ---
        const SCHEMA_FILE_ID = 9205967;      // Internal ID of the JSON schema file
        const HARDCODED_ITEM_ID = 188731;   // The item ID to use on SO lines
        const FOLDER_ID = "392993";          // The folder to scan for new PDFs

        /**
         * getInputData: Finds all PDF files in the specified folder to be processed.
         */
        const getInputData = (inputContext) => {
            try {
                return search.create({
                    type: "file",
                    filters: [ ["folder", "anyof", FOLDER_ID] ],
                    columns: [ "name", "folder", "documentsize", "url" ]
                });
            } catch (e) {
                log.error('getInputData Error', e);
                throw e;
            }
        };

        /**
         * map: Processes one PDF file at a time. It calls the Gemini API, then passes the
         * result to the function that creates the Sales Order.
         */
        const map = (mapContext) => {
            const pdfFileId = mapContext.key;
            const searchResult = JSON.parse(mapContext.value);
            const pdfFileName = searchResult.values.name;

            log.debug(`Starting processing for PDF: ${pdfFileName}`, `File ID: ${pdfFileId}`);

            try {
                const schemaFile = file.load({ id: SCHEMA_FILE_ID });
                const schemaObj = JSON.parse(schemaFile.getContents());
                const pdfFile = file.load({ id: pdfFileId });

                const parsedJson = parsePdfWithGemini(pdfFile, schemaObj);

                log.debug({
                    title: `Successfully Parsed PDF: ${pdfFileName}`,
                    details: JSON.stringify(parsedJson, null, 2)
                });
                
                processJson(parsedJson);

            } catch (err) {
                log.error({
                    title: `Failed to process PDF File ID ${pdfFileId} (${pdfFileName})`,
                    details: err.message || err.toString()
                });
            }
        };

        /**
         * parsePdfWithGemini: Sends the PDF file to the Google Gemini API for extraction.
         */
        function parsePdfWithGemini(pdfFile, schemaObj) {
            const base64EncodedPdf = pdfFile.getContents();
            const prompt = `Please extract the relevant data from the attached PDF purchase order and format it according to the provided JSON schema. In Your response do not include any raw text, only return the json object. 
            Important Context: The field BuyerCompany must never be set to Alberta Newsprint Company or ANC. ANC is the vendor, not the buyer, and is the party receiving the purchase order.
            Paper Roll Context: This purchase order relates to paper rolls used in the printing and publishing industry. To ensure the data is extracted meaningfully, please take note of the following fields in the schema and their roles in the papermaking process:
            - Basis Weight: Indicates the weight of the paper per unit area (e.g., gsm or pounds). It's crucial for paper grade.
            - Quantity: The number or weight of paper rolls ordered.
            - Roll Diameter: The size of each paper roll.
            - Roll Width: The width of the paper roll, critical for different printing presses.
            These attributes are critical specifications. Please ensure they are extracted precisely. Sometimes these values are not in dedicated columns but are part of the item description. You must extract them from there if necessary. A number in the description ending in double quotes (") means inches, and one beginning with a pound sign (#) means pounds. Also, you must ignore any lines that are marked as canceled or deleted.`;

            const requestBody = {
                contents: [{
                    role: "user",
                    parts: [
                        { inline_data: { mime_type: "application/pdf", data: base64EncodedPdf } },
                        { text: prompt }
                    ]
                }],
                generationConfig: {
                    responseMimeType: "application/json",
                    responseSchema: schemaObj
                }
            };

            const url = `${API_BASE_URL}/models/${MODEL}:generateContent?key=${GEMINI_API_KEY}`;
            log.debug('Sending request to Gemini API', `URL: ${url.split('?')[0]}`);

            const response = https.request({
                method: https.Method.POST,
                url: url,
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(requestBody)
            });

            if (response.code !== 200) {
                throw new Error(`Gemini API request failed with status code ${response.code}: ${response.body}`);
            }

            const result = JSON.parse(response.body);

            if (result.usageMetadata) {
                log.audit('Gemini API Token Usage', `File: ${pdfFile.name} | Total Tokens: ${result.usageMetadata.totalTokenCount}`);
            }

            if (!result.candidates || !result.candidates[0] || !result.candidates[0].content || !result.candidates[0].content.parts || !result.candidates[0].content.parts[0].text) {
                if (result.promptFeedback) {
                     log.error('Gemini API Error: Blocked by Safety Settings or other issue', JSON.stringify(result.promptFeedback));
                }
                throw new Error('Failed to get a valid response from Gemini. The response may be empty or blocked.');
            }

            const jsonText = result.candidates[0].content.parts[0].text;
            return JSON.parse(jsonText);
        }

        /**
         * findCustomerAndConsignee: Searches for the customer and consignee records based on shipping address.
         */
        function findCustomerAndConsignee(shipToAddress) {
            if (!shipToAddress || !shipToAddress.AddressLines || !shipToAddress.AddressLines[0]) {
                log.error('findCustomerAndConsignee', 'ShipTo address data is missing or incomplete in the AI response.');
                return null;
            }

            const addressLine = shipToAddress.AddressLines[0].AddressLine;
            const city = shipToAddress.ShipToCity;
            const country = shipToAddress.ShipToCountry;
            // UPDATED: Handle both Zip and Postal Code fields from the schema
            const postalCode = shipToAddress.ShipToZipCode || shipToAddress.ShipToPostalCode;

            if (!addressLine || !city || !country || !postalCode) {
                log.warning('Incomplete Address for Search', `Missing one or more key fields: Address, City, Country, PostalCode`);
                return null;
            }

            try {
                const consigneeSearch = search.create({
                    type: "customrecord_alberta_ns_consignee_record",
                    filters: [
                        ["custrecord_alberta_ns_ship_address", "contains", addressLine], "AND",
                        ["custrecord_alberta_ns_city", "is", city], "AND",
                        ["custrecord_alberta_ns_country", "is", country], "AND",
                        ["custrecord_alberta_ns_postal_code", "is", postalCode]
                    ],
                    columns: [
                        search.createColumn({ name: "custrecord_alberta_ns_customer", label: "Customer" })
                    ]
                });

                const resultSet = consigneeSearch.run().getRange({ start: 0, end: 1 });

                if (resultSet && resultSet.length > 0) {
                    const result = resultSet[0];
                    const customerId = result.getValue({ name: 'custrecord_alberta_ns_customer' });
                    const consigneeId = result.id;

                    log.debug('Customer and Consignee Found', `Customer ID: ${customerId}, Consignee ID: ${consigneeId}`);
                    return { customerId, consigneeId };
                } else {
                    log.warning('Customer/Consignee Not Found', `No match for Address: ${addressLine}, ${city}, ${postalCode}`);
                    return null;
                }
            } catch (e) {
                log.error('Error in findCustomerAndConsignee search', e);
                return null;
            }
        }
        
        /**
         * processJson: Creates the Sales Order record from the parsed JSON, including quantity conversion.
         */
        function processJson(json) {
            try {
                if (!json.ShipTo || json.ShipTo.length === 0) {
                    throw new Error('No ShipTo information was found in the AI response.');
                }
                const customerInfo = findCustomerAndConsignee(json.ShipTo[0]);

                if (!customerInfo) {
                    log.error('Halting SO Creation', 'Could not find a valid Customer/Consignee.');
                    return;
                }

                const salesOrder = record.create({ type: record.Type.SALES_ORDER, isDynamic: true });

                salesOrder.setValue({ fieldId: 'entity', value: customerInfo.customerId });
                salesOrder.setValue({ fieldId: 'custbody_consignee', value: customerInfo.consigneeId });

                const poRef = json['Ref#'] || json['BuyerPO#'];
                if (poRef) {
                    salesOrder.setValue({ fieldId: 'otherrefnum', value: poRef });
                }

                if (json.itemLines && json.itemLines.length > 0) {
                    json.itemLines.forEach(line => {
                        line.item.forEach(itemDetail => {
                            let quantityInMetricTons;
                            const originalQuantity = parseFloat(itemDetail.quantity);
                            const originalUom = (itemDetail.quantityUom || '').toLowerCase();

                            switch (originalUom) {
                                case 'lbs':
                                    quantityInMetricTons = originalQuantity / 2205;
                                    log.debug('Quantity Conversion', `Converted ${originalQuantity} lbs to ${quantityInMetricTons} metric tons.`);
                                    break;
                                case 'kg':
                                    quantityInMetricTons = originalQuantity / 1000;
                                    log.debug('Quantity Conversion', `Converted ${originalQuantity} kg to ${quantityInMetricTons} metric tons.`);
                                    break;
                                case 'mt':
                                    quantityInMetricTons = originalQuantity;
                                    log.debug('Quantity Conversion', 'Quantity is already in Metric Tons (MT).');
                                    break;
                                default:
                                    quantityInMetricTons = originalQuantity;
                                    log.warning('Unrecognized UOM for Conversion', `UOM "${originalUom}" is not standard. Using original quantity: ${originalQuantity}.`);
                                    break;
                            }

                            salesOrder.selectNewLine({ sublistId: 'item' });
                            salesOrder.setCurrentSublistValue({ sublistId: 'item', fieldId: 'item', value: HARDCODED_ITEM_ID });
                            salesOrder.setCurrentSublistValue({ sublistId: 'item', fieldId: 'quantity', value: quantityInMetricTons });
                            salesOrder.commitLine({ sublistId: 'item' });
                        });
                    });
                }

                const salesOrderId = salesOrder.save();
                log.audit('Sales Order Created Successfully', `ID: ${salesOrderId} from PO/Ref: ${poRef}`);

            } catch (err) {
                log.error('Error in processJson', err);
            }
        }

        const reduce = (reduceContext) => {};
        const summarize = (summaryContext) => {
            if (summaryContext.inputSummary.error) {
                log.error('Input Stage Error', summaryContext.inputSummary.error);
            }
            summaryContext.mapSummary.errors.iterator().each(function (key, error){
                log.error('Map Error for key: ' + key, error);
                return true;
            });
             log.audit('Map/Reduce Process Summary', {
                'Total Time (seconds)': summaryContext.seconds,
                'Governance Usage': summaryContext.usage,
                'Files Processed': summaryContext.mapSummary.keys.iterator().length
            });
        };

        return { getInputData, map, reduce, summarize };
    });