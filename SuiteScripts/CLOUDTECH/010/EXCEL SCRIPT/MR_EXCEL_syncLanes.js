/**
 * @NApiVersion 2.1
 * @NAmdConfig ./JsLibraryConfig.json
 * @NScriptType MapReduceScript
 * @NModuleScope SameAccount
 */

define(['require', 'N/util', 'N/search', 'N/record', 'N/error', 'N/email',  'N/encode', 'N/runtime', 'N/file', 'jszip', 'xlsx'  ],
    function(require, util, search, record, error, email, encode, runtime, file, JSZIP, XLSX) {

        function getInputData() {

            // var XLSX = require('/SuiteScripts/CLOUDTECH/010/EXCEL SCRIPT/xlsxfullmin.js'); // Load SheetJS
            // var XLSX = require('./xlsxfullmin.js'); // Load SheetJS
            // var XLSX = define('/SuiteScripts/CLOUDTECH/010/EXCEL SCRIPT/xlsxfullmin.js'); // Load SheetJS

            // var fileObj = file.load({
            //     id : "9203564"
            // });
            // input = fileObj.getContents();
            // fileContents = input;
            // log.debug("XLSX", XLSX)
            // var workbook = XLSX.read(fileContents, { type: 'binary' });
            // // var workbook = xlsxfullmin.read(fileContents, { type: 'binary' });
            //
            // workbook.SheetNames.forEach(function(sheetName) {
            //     var csvData = XLSX.utils.sheet_to_csv(workbook.Sheets[sheetName]); // Convert each sheet to CSV
            //     // var csvData = xlsxfullmin.utils.sheet_to_csv(workbook.Sheets[sheetName]); // Convert each sheet to CSV
            //     log.debug('Sheet: ' + sheetName, csvData);
            //
            //     // You can save csvData as a new CSV file in NetSuite File Cabinet
            // });




            var fullJsonData = excelFileToJson(9203564);
            log.debug("fullJsonData", fullJsonData);

            processRawFile(fullJsonData);

            createExcelFile(processRawFile, 392673, "anc_sync_lanes" + new Date().getTime());
            // createExcelFile(392673)


            // var fileObj = file.load({
            //     id : "9203564"
            // });
            // input = fileObj.getContents();
            // log.debug("raw input", input);
            // // input = atob(input);
            // // log.debug("atob input", input);
            //
            //
            // log.debug("XLSX", typeof XLSX);
            //
            // log.debug("require", typeof require);
            // log.debug("defined", typeof define);
            // if(!XLSX)
            // {
            //     XLSX = require('sheetjs'); // Load SheetJS
            // }
            //
            // log.debug("XLSX", typeof XLSX);
            //
            // var wb = XLSX.read(input);
            //
            // log.debug("wb", wb);
            //
            //
            //
            // // input = '<html>' + '</html>';
            // output = generateXls(input, 392673, true)
            // log.debug("output", output);

        }

        function processRawFile(fullJsonData)
        {
            try
            {
                // for(var a = 0 ; a < fullJsonData.length ; a++)
                for(var a = 0 ; a < 1 ; a++)
                {
                    var jsonData = fullJsonData[a];
                    log.debug("jsonData", jsonData);
                    var splitRciSheetResult = splitRciSheets(jsonData);
                    log.debug("splitRciSheetResult", splitRciSheetResult);
                }
            }
            catch(e)
            {
                log.error("ERROR in function processRawFile", e);
            }
        }

        /**
         * @function createExcelFile
         * @description Based on the data, creates excel file and saves in File Cabinet
         *
         * @module N/file
         * @module xlsx
         * @module jszip
         *
         * @param {object} excelData - Report data
         * @param {integer} folderId - Internal ID of the folder that file to be saved in
         * @param {string} fileName - Name of the file
         * @return {integer} - Internal ID of the file created
         */
        let createExcelFile = (excelData, folderId, fileName) => {
            let workbook = XLSX.utils.book_new();
            log.debug("createExcelFile excelData", excelData)

            for (e in excelData) {

                log.debug("createExcelFile e in excelData", e)
                log.debug("excelData[e].sheetName", excelData[e].sheetName)

                workbook.SheetNames.push(excelData[e].sheetName);

                let worksheet = XLSX.utils.aoa_to_sheet(excelData[e].rows);
                workbook.Sheets[excelData[e].sheetName] = worksheet;
            }

            let workbookOutput = XLSX.write(workbook, {
                booktype: 'xlsx',
                type: 'base64'
            });

            let excelFile = file.create({
                name: fileName + '.xlsx',
                fileType: file.Type.EXCEL,
                contents: workbookOutput,
                folder: folderId
            });

            return excelFile.save();
        }

        var jsonDataSplits = [];
        function splitRciSheets(jsonData)
        {

            try
            {
                // for(var a = 0 ; a < jsonData.length ; a++)
                // {
                //     log.debug("jsonData[a]", jsonData[a]);
                //     log.debug(`jsonData[a]["__EMPTY"]`, jsonData[a]["__EMPTY"]);
                //     if(jsonData[a]["__EMPTY"] == "RCI Price List")
                //     {
                //         var endRange = 0;
                //         log.debug("{a, endRange}", {a, endRange});
                //         if(a == 0)
                //         {
                //             continue;
                //         }
                //         else
                //         {
                //             if(jsonData[a]["__EMPTY"] == "RCI Price List")
                //             {
                //
                //                 var arrCopy = jsonData.slice(endRange, a)
                //                 log.debug("arrCopy", arrCopy);
                //                 jsonDataSplits.push(arrCopy)
                //
                //                 endRange = a;
                //             }
                //         }
                //
                //     }
                // }

                var rows = [];
                var lastForAddtlFinish = 0;
                for(var a = 0 ; a < jsonData.length ; a++)
                {
                    log.debug("jsonData[a]", jsonData[a]);
                    log.debug(`jsonData[a]["__EMPTY"]`, jsonData[a]["__EMPTY"]);
                    if(
                        (jsonData[a]["__EMPTY"] == "RCI Price List" || !jsonData[a]["__EMPTY_2"])
                        /*|| !jsonData[a]["__EMPTY_1"]*/ || typeof jsonData[a]["__EMPTY_2"] != "number"
                    )
                    {
                        lastForAddtlFinish = [];
                        continue;
                    }
                    else
                    {

                        const str1 = jsonData[a]["__EMPTY"];
                        const str2 = jsonData[a]["__EMPTY_1"];
                        const str3 = jsonData[a]["__EMPTY_2"];

                        var separator = "";
                        if(str1.indexOf(" x "))
                        {
                            separator = " x ";
                        }
                        else if(str1.indexOf("-"))
                        {
                            separator = "-";
                        }

                        var str1_toArray = str1.split(" x ");
                        var str1_toArray_copy = str1.split(" x ");
                        var str2_toArray = str2 ? str2.split(" x ") : [];
                        var str2_toArray_copy = str2 ? str2.split(" x ") : [];
                        var fullRow = [str1_toArray, str2_toArray.join(" x "), str3]
                        var fullRowCopy = [str1_toArray_copy, str2_toArray_copy, str3]

                        if(str1.includes("For ") && str1.includes("finish") && str1.includes("add"))
                        {
                            var extraFinish = "";
                            const match = str1.match(/For (\d+) finish/i); // Extract number between "For" and "Finish"

                            if (match) {
                                extraFinish = match[1]; // Output: 40
                            }

                            var extraFinishAmount = str3;


                            for(var b = 0 ; b < lastForAddtlFinish.length ; b++)
                            {
                                var str1_toArray_of_addtls = lastForAddtlFinish[b][0];
                                if(str1_toArray_of_addtls.length > 0)
                                {
                                    str1_toArray_of_addtls[str1_toArray_of_addtls.length - 1] = extraFinish;
                                }


                                var str2_toArray_of_addtls = lastForAddtlFinish[b][1];
                                if(str2_toArray_of_addtls.length > 0)
                                {
                                    str2_toArray_of_addtls[str2_toArray_of_addtls.length - 1] = extraFinish;
                                }

                                log.debug("typeof str2_toArray_of_addtls", str2_toArray_of_addtls);

                                var addtlRow = [str1_toArray_of_addtls, str2_toArray_of_addtls.join(" x "), Number(lastForAddtlFinish[b][2]) + (extraFinishAmount)];
                                // addtlRow[addtlRow.length - 1] = extraFinish;
                                rows.push(addtlRow)
                            }
                        }
                        else
                        {
                            rows.push(fullRow)

                            lastForAddtlFinish.push(fullRowCopy);
                        }
                    }
                }

                log.debug("rows", rows);

                jsonDataSplits.push(rows)
            }
            catch(e)
            {
                log.error("ERROR in function processRawFile", e);
            }

            return jsonDataSplits;
        }

        let excelFileToJson = (fileId, headers) => {
            let returnData = [];
            let excelFile = file.load({
                id: fileId
            });

            let workbook = XLSX.read(excelFile.getContents(), {type: 'base64'});
            for (let sn in workbook.SheetNames) {
                let sheet = workbook.Sheets[workbook.SheetNames[sn]];
                returnData.push(isEmpty(headers) || isEmpty(headers[workbook.SheetNames[sn]]) ? XLSX.utils.sheet_to_json(sheet) : XLSX.utils.sheet_to_json(sheet, headers[workbook.SheetNames[sn]]));
            }

            return returnData;
        }

        let isEmpty = (value) => {
            if (value == undefined || value == null)
                return true;
            if (util.isNumber(value) || util.isBoolean(value) || util.isDate(value) || util.isFunction(value))
                return false;
            if (util.isString(value))
                return (value.length == 0) ? true : false;
            return (Object.keys(value).length == 0) ? true : false;
        }

        function generateXls(data, folderId, returnFileId) {

            log.debug("data before encode.convert from UTF8 to BASE64", data)
            data = data.replace('<html>', '<html xmlns:o="urn:schemas-microsoft-com:office:office" xmlns:x="urn:schemas-microsoft-com:office:excel" xmlns="http://www.w3.org/TR/REC-html40">');
            var new_data = '<html xmlns:o="urn:schemas-microsoft-com:office:office" xmlns:x="urn:schemas-microsoft-com:office:excel" xmlns="http://www.w3.org/TR/REC-html40">' + '</html>';

            // var base64EncodedString = encode.convert({
            //     string: data,
            //     inputEncoding: encode.Encoding.BASE_64,
            //     outputEncoding: encode.Encoding.UTF_8
            // });

            var base64EncodedString = encode.convert({
                string: data,
                outputEncoding: encode.Encoding.UTF_8,
                inputEncoding: encode.Encoding.BASE_64,
            });


            log.debug("base64EncodedString", base64EncodedString)

            var base64EncodedString2 = encode.convert({
                string: data,
                outputEncoding: encode.Encoding.UTF_8,
                inputEncoding: encode.Encoding.BASE_64,
            });


            log.debug("base64EncodedString2", base64EncodedString2)

            var fileObj = file.create({
                name: "test excel",
                fileType: file.Type.EXCEL,
                contents: base64EncodedString,
                // contents: new_data,
                // encoding: file.Encoding.BASE_64,
                // encoding: file.Encoding.UTF8,
                folder: 392673
            });
            var fileId = fileObj.save();
            if (returnFileId)
                return fileId;
            else
                return this.setScript(fileId);
        }

        function map(context) {
            log.debug("map context", context);
            log.debug("map context.value", context.value);
            // var dataFromSearch = getDataFromSearch(context, context.value);

        }

        function getDataFromSearch(context, searchId, decodedParams)
        {
            decodedParams = decodedParams ? decodedParams : {};
            log.debug("getDataFromSearch1 searchId", searchId);
            var dataFromSearch = [];
            log.debug("searchId", searchId);
            try
            {
                var base_searchObj = search.load({
                    id : searchId
                });

                var newFilters = base_searchObj.filters;
                if(decodedParams.param_dateFrom)
                {
                    newFilters.push(search.createFilter({
                        name : "trandate",
                        operator : "onorafter",
                        values : decodedParams.param_dateFrom
                    }))
                }
                if(decodedParams.param_dateFrom)
                {
                    newFilters.push(search.createFilter({
                        name : "trandate",
                        operator : "onorbefore",
                        values : decodedParams.param_dateTo
                    }))
                }
                if(decodedParams.param_items && decodedParams.param_items.length > 0 && (decodedParams.param_items != undefined && decodedParams.param_items != "undefined"))
                {
                    newFilters.push(search.createFilter({
                        name : "item",
                        operator : "anyof",
                        values : decodedParams.param_items.split(",")
                    }))
                }

                log.debug("getDataFromSearch1 newFilters", newFilters);
                var searchObj = search.create({
                    type : base_searchObj.searchType,
                    filters : newFilters,
                    columns : base_searchObj.columns
                })

                log.debug("searchObj", searchObj);
                var sr = getResults(searchObj.run());
                return {sr:sr, searchObj:searchObj}

                if(sr && sr.length > 0)
                {
                    for(var a = 0 ; a < sr.length ; a++)
                    {
                        var result = sr[a];
                        var sr_obj = {
                        };
                        searchObj.columns.forEach(function(col){
                            sr_obj[col.label] = {val:result.getValue(col), txt:result.getText(col)}
                        })
                        dataFromSearch.push(sr_obj);

                        context.write({
                            key: sr_obj["Individual Item"].val,
                            value: sr_obj
                        });
                    }
                }
            }
            catch(e)
            {
                log.error("ERROR in function getDataFromSearch", e);
            }
            log.debug("getDataFromSearch1 dataFromSearch", dataFromSearch);
            return dataFromSearch;
        }

        function reduce(context) {

            log.debug("reduce context", context);
            log.debug("reduce context.values", context.values);
            log.debug("reduce context.values.length", context.values.length);

            decodedParams = {param_dateFrom:"1/1/2023", param_dateTo:"3/31/2023"}
            var searchId = context.values[0];
            var decodedParams = decodedParams ? decodedParams : {};
            log.debug("getDataFromSearch1 searchId", searchId);
            var combinedData = [];
            log.debug("searchId", searchId);
            try
            {
                // var dataFromSearch = getDataFromSearch(context, searchId);
                // log.debug("dataFromSearch", dataFromSearch);
                // combinedData = combinedData.concat(dataFromSearch);

                var functionRes = getDataFromSearch(context, searchId, decodedParams);
                var sr = functionRes.sr;
                var searchObj = functionRes.searchObj;

                log.debug("sr", sr);
                if(sr && sr.length > 0)
                {
                    for(var a = 0 ; a < sr.length ; a++)
                    {
                        var result = sr[a];
                        var sr_obj = {
                        };
                        searchObj.columns.forEach(function(col){
                            sr_obj[col.label] = {val:result.getValue(col), txt:result.getText(col)}
                        })
                        // dataFromSearch.push(sr_obj);

                        context.write({
                            key: sr_obj["Individual Item"].val,
                            value: sr_obj
                        });
                    }
                }
                // context.write({
                //     key: "TEST",
                //     value: "TEST STR"
                // });
            }
            catch(e)
            {
                log.error("ERROR in function reduce", e);
            }
            log.debug("combinedData", combinedData);

            // dataFromSearch3 = [];
            // var combinedData = dataFromSearch1.concat(dataFromSearch2);
            // var listResultsObj = {};
            // listResultsObj.list = [];
            // try{
            // 	listResultsObj.list.push(
            // 		["test_item1",2,3,4,5,6,7,8,9,10],
            // 		[11,12,13,14,15,16,17,18,19,20]);

            // 	listResultsObj.groupedlist_mapped = listResultsObj.list;

            // }
            // catch(e)
            // {
            // 	log.error("ERROR in function getListResults", e.stack);
            // }

            // // return listResultsObj;//for tests

            // log.debug("combinedData", combinedData);
            // combinedData = combinedData.splice(0,10000)
            // // combinedData = combinedData.splice(0,1000)


            // var list = combinedData;
            // var groupByIndividualItem = list.reduce(function(group, obj){

            // 	var baseAttr = obj["Individual Item"].val;
            // 	var attr = baseAttr;
            // 	group[attr] = group[attr] || [];
            // 	group[attr].push(obj);

            // 	return group;
            // 	},
            // {});

            // dataFromSearch3.forEach(function(res){
            // 	var item = res["Name"].val;
            // 	var itemInfo = {};
            // 	itemInfo.grandTotal = 0;
            // 	itemInfo.comittedQty = res["Committed"].val;
            // 	itemInfo.lastTranDate = res["Date"].val;
            // 	itemInfo.onSoQty = res["ON SO"].val;
            // 	itemInfo.onHandQty = res["On Hand"].val;
            // 	itemInfo.onPoQty = res["On Order"].val;

            // 	var list = groupByIndividualItem[item] || [];
            // 	var groupByAccPeriod_year = list.reduce(function(group, obj){
            // 		var baseAttr = obj.Period.txt;
            // 		var spaceIndex = baseAttr.indexOf(" ");
            // 		var year = baseAttr.slice(spaceIndex+1)
            // 		var attr = year;
            // 		group[attr] = group[attr] || [];
            // 		group[attr].push(obj);
            // 		return group;
            // 		},
            // 	{});

            // 	for(var year in groupByAccPeriod_year)
            // 	{
            // 		var list = groupByAccPeriod_year[year];
            // 		var groupByAccPeriod = list.reduce(function(group, obj){
            // 			var baseAttr = obj.Period.txt;
            // 			var attr = baseAttr;

            // 			if(group[attr])
            // 			{
            // 				group[attr].Fulfilled.val = Number(group[attr].Fulfilled.val) + Number(obj["Fulfilled"].val);
            // 				// if(group[attr].docList)
            // 				// {
            // 				// 	group[attr].docList.push(obj["Document Number"].val)
            // 				// }
            // 				// else
            // 				// {
            // 				// 	group[attr].docList = [obj["Document Number"].val]
            // 				// }
            // 			}
            // 			else
            // 			{
            // 				group[attr] = {};
            // 				group[attr].Fulfilled = {};
            // 				group[attr].Fulfilled.val = 0;

            // 				group[attr].Fulfilled.val = Number(group[attr].Fulfilled.val) + Number(obj["Fulfilled"].val);
            // 				// if(group[attr].docList)
            // 				// {
            // 				// 	group[attr].docList.push(obj["Document Number"].val)
            // 				// }
            // 				// else
            // 				// {
            // 				// 	group[attr].docList = [obj["Document Number"].val]
            // 				// }
            // 			}
            // 			itemInfo.grandTotal += group[attr].Fulfilled.val

            // 			return group;
            // 			},
            // 		{});

            // 		groupByAccPeriod_year[year] = {periodList:groupByAccPeriod}
            // 	}

            // 	groupByIndividualItem[item] = {yearList : groupByAccPeriod_year, itemInfo : itemInfo};
            // })

            // log.debug("groupByIndividualItem", groupByIndividualItem);
            // // var groupByIndividualItem_dtFormat = applyDtFormat(groupByIndividualItem);
            // // var objHtml = "<table><tr><th>Individual Item</th></tr></table>";
            // // objHtml = objHtml
            // var objHtml = config.getResultsHtml(groupByIndividualItem);
            // // var objHtml = "test";
            // // return {groupedlist_mapped : groupByIndividualItem_dtFormat, obj:groupByIndividualItem, objHtml:objHtml};
            // return {objHtml:objHtml};
        }

        function summarize(summary) {

            var combinedData = [];
            summary.output.iterator().each(function (key, value) {
                combinedData.push({key:key, value:value})
                return true;
            });

            log.debug("summarize combinedData", combinedData)
            var list = combinedData;
            var groupByIndividualItem = list.reduce(function(group, obj){

                    // log.debug("building groupByIndividualItem obj.value", obj["value"])
                    // var value = obj["value"];
                    // log.debug("summarize each of combinedData.value", obj["value"])
                    var value = JSON.parse(obj["value"]);
                    // var value = obj["value"];
                    var baseAttr = obj["key"];
                    var attr = baseAttr;
                    group[attr] = group[attr] || [];
                    group[attr].push(value);

                    return group;
                },
                {});

            log.debug("summarize groupByIndividualItem", groupByIndividualItem);

            var decodedParams = decodedParams ? decodedParams : {};


            for(var item in groupByIndividualItem)
            {
                var itemInfo = {};
                itemInfo.grandTotal = 0;
                // itemInfo.comittedQty = res["Committed"].val;
                // itemInfo.lastTranDate = res["Date"].val;
                // itemInfo.onSoQty = res["ON SO"].val;
                // itemInfo.onHandQty = res["On Hand"].val;
                // itemInfo.onPoQty = res["On Order"].val;
                var list = groupByIndividualItem[item] ? groupByIndividualItem[item] : [];

                // log.debug("summarize dataFromSearch3 item list", {item, list});

                var groupByAccPeriod_year = list.reduce(function(group, obj){

                        // log.debug("groupByAccPeriod_year obj", obj);
                        // log.debug("groupByAccPeriod_year obj.length", obj.length);
                        // obj = JSON.parse(obj);
                        // log.debug("groupByAccPeriod_year obj.Period", obj.Period);
                        var baseAttr = obj.Period.txt;
                        var spaceIndex = baseAttr.indexOf(" ");
                        var year = baseAttr.slice(spaceIndex+1)
                        var attr = year;
                        group[attr] = group[attr] || [];
                        group[attr].push(obj);
                        return group;
                    },
                    {});


                // log.debug("groupByAccPeriod_year", groupByAccPeriod_year);
                for(var year in groupByAccPeriod_year)
                {
                    var list = groupByAccPeriod_year[year];
                    var groupByAccPeriod = list.reduce(function(group, obj){
                            var baseAttr = obj.Period.txt;
                            var attr = baseAttr;

                            if(group[attr])
                            {
                                group[attr].Fulfilled.val = Number(group[attr].Fulfilled.val) + Number(obj["Fulfilled"].val);
                                // if(group[attr].docList)
                                // {
                                // 	group[attr].docList.push(obj["Document Number"].val)
                                // }
                                // else
                                // {
                                // 	group[attr].docList = [obj["Document Number"].val]
                                // }
                            }
                            else
                            {
                                group[attr] = {};
                                group[attr].Fulfilled = {};
                                group[attr].Fulfilled.val = 0;

                                group[attr].Fulfilled.val = Number(group[attr].Fulfilled.val) + Number(obj["Fulfilled"].val);
                                // if(group[attr].docList)
                                // {
                                // 	group[attr].docList.push(obj["Document Number"].val)
                                // }
                                // else
                                // {
                                // 	group[attr].docList = [obj["Document Number"].val]
                                // }
                            }
                            itemInfo.grandTotal += group[attr].Fulfilled.val

                            return group;
                        },
                        {});

                    groupByAccPeriod_year[year] = {periodList:groupByAccPeriod}
                }

                groupByIndividualItem[item] = {yearList : groupByAccPeriod_year, itemInfo : itemInfo};
            }









            // var dataFromSearch3 = getDataFromSearch3(summary, decodedParams)
            // dataFromSearch3.forEach(function(res){
            // 	var item = res["Name"].val;
            // 	var itemInfo = {};
            // 	itemInfo.grandTotal = 0;
            // 	itemInfo.comittedQty = res["Committed"].val;
            // 	itemInfo.lastTranDate = res["Date"].val;
            // 	itemInfo.onSoQty = res["ON SO"].val;
            // 	itemInfo.onHandQty = res["On Hand"].val;
            // 	itemInfo.onPoQty = res["On Order"].val;

            // 	var list = groupByIndividualItem[item] ? groupByIndividualItem[item] : [];

            // 	log.debug("summarize dataFromSearch3 item res list", {item, res, list});

            // 	var groupByAccPeriod_year = list.reduce(function(group, obj){

            // 		log.debug("groupByAccPeriod_year obj", obj);
            // 		log.debug("groupByAccPeriod_year obj.length", obj.length);
            // 		// obj = JSON.parse(obj);
            // 		log.debug("groupByAccPeriod_year obj.Period", obj.Period);
            // 		var baseAttr = obj.Period.txt;
            // 		var spaceIndex = baseAttr.indexOf(" ");
            // 		var year = baseAttr.slice(spaceIndex+1)
            // 		var attr = year;
            // 		group[attr] = group[attr] || [];
            // 		group[attr].push(obj);
            // 		return group;
            // 		},
            // 	{});


            // 	log.debug("groupByAccPeriod_year", groupByAccPeriod_year);
            // 	for(var year in groupByAccPeriod_year)
            // 	{
            // 		var list = groupByAccPeriod_year[year];
            // 		var groupByAccPeriod = list.reduce(function(group, obj){
            // 			var baseAttr = obj.Period.txt;
            // 			var attr = baseAttr;

            // 			if(group[attr])
            // 			{
            // 				group[attr].Fulfilled.val = Number(group[attr].Fulfilled.val) + Number(obj["Fulfilled"].val);
            // 				// if(group[attr].docList)
            // 				// {
            // 				// 	group[attr].docList.push(obj["Document Number"].val)
            // 				// }
            // 				// else
            // 				// {
            // 				// 	group[attr].docList = [obj["Document Number"].val]
            // 				// }
            // 			}
            // 			else
            // 			{
            // 				group[attr] = {};
            // 				group[attr].Fulfilled = {};
            // 				group[attr].Fulfilled.val = 0;

            // 				group[attr].Fulfilled.val = Number(group[attr].Fulfilled.val) + Number(obj["Fulfilled"].val);
            // 				// if(group[attr].docList)
            // 				// {
            // 				// 	group[attr].docList.push(obj["Document Number"].val)
            // 				// }
            // 				// else
            // 				// {
            // 				// 	group[attr].docList = [obj["Document Number"].val]
            // 				// }
            // 			}
            // 			itemInfo.grandTotal += group[attr].Fulfilled.val

            // 			return group;
            // 			},
            // 		{});

            // 		groupByAccPeriod_year[year] = {periodList:groupByAccPeriod}
            // 	}

            // 	groupByIndividualItem[item] = {yearList : groupByAccPeriod_year, itemInfo : itemInfo};
            // })

            log.debug("groupByIndividualItem", groupByIndividualItem);

            // var xlsResult = new _xls.generate(`${reportTitle}.xls`, '365499');


            // var groupByIndividualItem_dtFormat = applyDtFormat(groupByIndividualItem);
            var objHtml = "<html>";
            objHtml += `<style>
		.report{
			border : 1px solid black;
		}
		.report tr{
			border : 1px solid black;
		}

		.report {
			border-collapse: collapse;
		}



		.perioddata > tbody > tr > td
		{
			text-align : center;
			background-color : yellowgreen;
		}
		.perioddata > tbody > tr > th
		{
			text-align : center;
			background-color : lightgray
		}
		.perioddata {
			border-collapse: collapse;
			margin-bottom : 25px;
		}

		.stockdata > tbody > tr > td
		{
			text-align : center;
			background-color : yellowgreen;
		}
		.stockdata > tbody > tr > th
		{
			text-align : center;
			background-color : lightgray
		}
		.stockdata {
			border-collapse: collapse;
			margin-top : 25px;
			margin-bottom : 25px;
		}

		.fontSize15
		{
			font-size : 15px;
		}

		.__loader {
			border: 16px solid #f3f3f3;
			border-radius: 50%;
			border-top: 16px solid #d3d3d3;
			width: 120px;
			height: 120px;
			-webkit-animation: spin 2s linear infinite; /* Safari */
			animation: spin 2s linear infinite;
		  }
	
		  @-webkit-keyframes spin {
			0% {
			  -webkit-transform: rotate(0deg);
			}
			100% {
			  -webkit-transform: rotate(360deg);
			}
		  }
	
		  @keyframes spin {
			0% {
			  transform: rotate(0deg);
			}
			100% {
			  transform: rotate(360deg);
			}
		  }
	</style>`


            objHtml += `<div id="__loader" style="display: none">
	<div style="margin: 0 auto;" class="__loader"></div>`
            objHtml += `</div><table class="report fontSize15" width="100%"><tbody><tr><th>Individual Item</th><th>Data</th></tr><tr><td width="20%" style="font-size:30px">002-025</td><td><table class="stockdata" width="50%"><tbody><tr><th>LAST TRANSACTION DATE</th><th>ON HAND QTY</th><th>COMMITED QTY</th><th>ON SO</th><th>ON PO</th><th text-align="right">GRAND TOTAL</th></tr><tr><td></td><td></td><td></td><td></td><td></td><td></td></tr></tbody></table><table class="yeardata" width="100%"><tbody><tr><td align="center"><b>2023</b><table class="perioddata" width="100%"><tbody><tr><th>JAN 2023</th><th>FEB 2023</th><th>MAR 2023</th><th>APR 2023</th><th>MAY 2023</th><th>JUN 2023</th><th>JUL 2023</th><th>AUG 2023</th><th>SEP 2023</th><th>OCT 2023</th><th>NOV 2023</th><th>DEC 2023</th><th>TOTAL 2023</th></tr><tr><td>0</td><td>0</td><td>0</td><td>0</td><td>0</td><td>0</td><td>0</td><td>0</td><td>0</td><td>0</td><td>0</td><td>0</td><td>0</td></tr></tbody></table></td></tr><tr><td align="center"><b>2022</b><table class="perioddata" width="100%"><tbody><tr><th>JAN 2022</th><th>FEB 2022</th><th>MAR 2022</th><th>APR 2022</th><th>MAY 2022</th><th>JUN 2022</th><th>JUL 2022</th><th>AUG 2022</th><th>SEP 2022</th><th>OCT 2022</th><th>NOV 2022</th><th>DEC 2022</th><th>TOTAL 2022</th></tr><tr><td>0</td><td>0</td><td>0</td><td>0</td><td>0</td><td>0</td><td>0</td><td>0</td><td>0</td><td>0</td><td>0</td><td>0</td><td>0</td></tr></tbody></table></td></tr><tr><td align="center"><b>2021</b><table class="perioddata" width="100%"><tbody><tr><th>JAN 2021</th><th>FEB 2021</th><th>MAR 2021</th><th>APR 2021</th><th>MAY 2021</th><th>JUN 2021</th><th>JUL 2021</th><th>AUG 2021</th><th>SEP 2021</th><th>OCT 2021</th><th>NOV 2021</th><th>DEC 2021</th><th>TOTAL 2021</th></tr><tr><td>0</td><td>0</td><td>0</td><td>0</td><td>0</td><td>0</td><td>0</td><td>0</td><td>0</td><td>0</td><td>0</td><td>0</td><td>0</td></tr></tbody></table></td></tr><tr><td align="center"><b>2020</b><table class="perioddata" width="100%"><tbody><tr><th>JAN 2020</th><th>FEB 2020</th><th>MAR 2020</th><th>APR 2020</th><th>MAY 2020</th><th>JUN 2020</th><th>JUL 2020</th><th>AUG 2020</th><th>SEP 2020</th><th>OCT 2020</th><th>NOV 2020</th><th>DEC 2020</th><th>TOTAL 2020</th></tr><tr><td>0</td><td>0</td><td>0</td><td>0</td><td>0</td><td>0</td><td>0</td><td>0</td><td>0</td><td>0</td><td>0</td><td>0</td><td>0</td></tr></tbody></table></td></tr><tr><td align="center"><b>2019</b><table class="perioddata" width="100%"><tbody><tr><th>JAN 2019</th><th>FEB 2019</th><th>MAR 2019</th><th>APR 2019</th><th>MAY 2019</th><th>JUN 2019</th><th>JUL 2019</th><th>AUG 2019</th><th>SEP 2019</th><th>OCT 2019</th><th>NOV 2019</th><th>DEC 2019</th><th>TOTAL 2019</th></tr><tr><td>0</td><td>0</td><td>0</td><td>0</td><td>0</td><td>0</td><td>0</td><td>0</td><td>0</td><td>0</td><td>0</td><td>0</td><td>0</td></tr></tbody></table></td></tr></tbody></table></td></tr><tr><td width="20%" style="font-size:30px">001-005</td><td><table class="stockdata" width="50%"><tbody><tr><th>LAST TRANSACTION DATE</th><th>ON HAND QTY</th><th>COMMITED QTY</th><th>ON SO</th><th>ON PO</th><th text-align="right">GRAND TOTAL</th></tr><tr><td></td><td></td><td></td><td></td><td></td><td></td></tr></tbody></table><table class="yeardata" width="100%"><tbody><tr><td align="center"><b>2023</b><table class="perioddata" width="100%"><tbody><tr><th>JAN 2023</th><th>FEB 2023</th><th>MAR 2023</th><th>APR 2023</th><th>MAY 2023</th><th>JUN 2023</th><th>JUL 2023</th><th>AUG 2023</th><th>SEP 2023</th><th>OCT 2023</th><th>NOV 2023</th><th>DEC 2023</th><th>TOTAL 2023</th></tr><tr><td>0</td><td>0</td><td>0</td><td>0</td><td>0</td><td>0</td><td>0</td><td>0</td><td>0</td><td>0</td><td>0</td><td>0</td><td>0</td></tr></tbody></table></td></tr><tr><td align="center"><b>2022</b><table class="perioddata" width="100%"><tbody><tr><th>JAN 2022</th><th>FEB 2022</th><th>MAR 2022</th><th>APR 2022</th><th>MAY 2022</th><th>JUN 2022</th><th>JUL 2022</th><th>AUG 2022</th><th>SEP 2022</th><th>OCT 2022</th><th>NOV 2022</th><th>DEC 2022</th><th>TOTAL 2022</th></tr><tr><td>0</td><td>0</td><td>0</td><td>0</td><td>0</td><td>0</td><td>0</td><td>0</td><td>0</td><td>0</td><td>0</td><td>0</td><td>0</td></tr></tbody></table></td></tr><tr><td align="center"><b>2021</b><table class="perioddata" width="100%"><tbody><tr><th>JAN 2021</th><th>FEB 2021</th><th>MAR 2021</th><th>APR 2021</th><th>MAY 2021</th><th>JUN 2021</th><th>JUL 2021</th><th>AUG 2021</th><th>SEP 2021</th><th>OCT 2021</th><th>NOV 2021</th><th>DEC 2021</th><th>TOTAL 2021</th></tr><tr><td>0</td><td>0</td><td>0</td><td>0</td><td>0</td><td>0</td><td>0</td><td>0</td><td>0</td><td>0</td><td>0</td><td>0</td><td>0</td></tr></tbody></table></td></tr><tr><td align="center"><b>2020</b><table class="perioddata" width="100%"><tbody><tr><th>JAN 2020</th><th>FEB 2020</th><th>MAR 2020</th><th>APR 2020</th><th>MAY 2020</th><th>JUN 2020</th><th>JUL 2020</th><th>AUG 2020</th><th>SEP 2020</th><th>OCT 2020</th><th>NOV 2020</th><th>DEC 2020</th><th>TOTAL 2020</th></tr><tr><td>0</td><td>0</td><td>0</td><td>0</td><td>0</td><td>0</td><td>0</td><td>0</td><td>0</td><td>0</td><td>0</td><td>0</td><td>0</td></tr></tbody></table></td></tr><tr><td align="center"><b>2019</b><table class="perioddata" width="100%"><tbody><tr><th>JAN 2019</th><th>FEB 2019</th><th>MAR 2019</th><th>APR 2019</th><th>MAY 2019</th><th>JUN 2019</th><th>JUL 2019</th><th>AUG 2019</th><th>SEP 2019</th><th>OCT 2019</th><th>NOV 2019</th><th>DEC 2019</th><th>TOTAL 2019</th></tr><tr><td>0</td><td>0</td><td>0</td><td>0</td><td>0</td><td>0</td><td>0</td><td>0</td><td>0</td><td>0</td><td>0</td><td>0</td><td>0</td></tr></tbody></table></td></tr></tbody></table></td></tr></tbody></table></span>`;


            objHtml += "</html>";
            // var objHtml = config.getResultsHtml(groupByIndividualItem);
            log.debug("objHtml", objHtml);
            log.debug("objHtml.length", objHtml.length);

            var fileObj = createXls(objHtml);

            return;


            var fileObj = file.create({
                name:"Consumption Demand Report" + new Date().getTime(),
                // fileType: file.Type.HTMLDOC,
                fileType: file.Type.PLAINTEXT,
                contents : objHtml
            });
            fileObj.folder = 365499;

            log.debug("fileObj.size", fileObj.size);
            var fileId = fileObj.save();
            log.debug("fileId", fileId)

            email.send({
                author: 4487319,
                recipients: runtime.getCurrentUser().id,
                subject : "Consumption Demand Report",
                body : "" + objHtml
            })
            // var objHtml = "test";
            // return {groupedlist_mapped : groupByIndividualItem_dtFormat, obj:groupByIndividualItem, objHtml:objHtml};
            return {objHtml:objHtml};





            log.debug("contents", contents);
            // log.debug("summary", summary);
            // log.debug("summary.reduceSummary", summary.reduceSummary);
            // log.debug("summary.reduceSummary.keys", summary.reduceSummary.keys);

            // summary.reduceSummary.keys.iterator().each(function (key, value)
            // {
            //     log.debug("summary.mapSummary.keys.iterator", {key:key, value : value})
            //     contents += (key + ' ' + value + '\n');
            //     return true;
            // });

            // log.debug("contents", contents);

            // This function is executed after the Map/Reduce process is complete
            // You can perform any final operations or error handling here
            // log.audit('Script Execution Summary', 'Number of inputs: ' + summary.inputSummary.totalRecords);
            // log.audit('Script Execution Summary', 'Number of mapped records: ' + summary.mapSummary.totalRecords);
            // log.audit('Script Execution Summary', 'Number of reduced records: ' + summary.reduceSummary.totalKeys);
            // log.audit('Script Execution Summary', 'Number of output records: ' + summary.outputSummary.totalRecords);
        }

        function createXls(data) {
            // data = data.replace('<html>', '<html xmlns:o="urn:schemas-microsoft-com:office:office" xmlns:x="urn:schemas-microsoft-com:office:excel" xmlns="http://www.w3.org/TR/REC-html40">');
            var base64EncodedString = encode.convert({
                string: data,
                inputEncoding: encode.Encoding.UTF_8,
                outputEncoding: encode.Encoding.BASE_64
            });
            var fileObj = file.create({
                name: "CDR",
                fileType: file.Type.EXCEL,
                contents: base64EncodedString,
                encoding: file.Encoding.BASE_64,
                folder: 365499
            });
            var fileId = fileObj.save();
            log.debug("fileId", fileId)
            //return this.setScript(fileId);
            // return fileId;
            return fileObj;
        }

        function getDataFromSearch3(context, decodedParams)
        {
            var searchId = "customsearch_rd_debug_cnsmptndmndrprt";
            var dataFromSearch = [];
            log.debug("searchId", searchId);
            try
            {
                var base_searchObj = search.load({
                    id : searchId
                });

                var newFilters = base_searchObj.filters;
                if(decodedParams.param_items && decodedParams.param_items.length > 0 && (decodedParams.param_items != undefined && decodedParams.param_items != "undefined"))
                {
                    newFilters.push(search.createFilter({
                        name : "internalid",
                        operator : "anyof",
                        values : decodedParams.param_items.split(",")
                    }))
                }

                log.debug("getDataFromSearch1 newFilters", newFilters);
                var searchObj = search.create({
                    type : base_searchObj.searchType,
                    filters : newFilters,
                    columns : base_searchObj.columns
                })

                log.debug("searchObj", searchObj);
                var sr = getResults(searchObj.run());
                log.debug("sr", sr);
                if(sr && sr.length > 0)
                {
                    for(var a = 0 ; a < sr.length ; a++)
                    {
                        var result = sr[a];
                        var sr_obj = {
                        };
                        searchObj.columns.forEach(function(col){
                            sr_obj[col.label] = {val:result.getValue(col), txt:result.getText(col)}
                        })
                        dataFromSearch.push(sr_obj);
                    }
                }
            }
            catch(e)
            {
                log.error("ERROR in function getDataFromSearch1", e);
            }
            log.debug("getDataFromSearch3 dataFromSearch", dataFromSearch);
            return dataFromSearch;
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

        return {
            getInputData: getInputData,
            map: map,
            // reduce: reduce,
            // summarize: summarize
        };
    });