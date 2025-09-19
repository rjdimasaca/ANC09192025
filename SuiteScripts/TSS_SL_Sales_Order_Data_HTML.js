/**
 * @NApiVersion 2.1
 * @NScriptType Suitelet
 */
//var lineChartHtmlFile='TSS Line Chartjs.html';
var cashFlowHTMLFile = 'TSS Sales Order HTML data.html';
var cashFlowCSSFile = 'TSS Dashboard CSS data.css';
var targetSuiteletScript = ['customscript_tss_sl_dashboard_forecast', 'customdeploy_tss_sl_dashboard_forecast']
var selfSuiteLetScript = ['customscript_tss_sl_sales_order_line_gra', 'customdeploy_tss_sl_sales_order_line_gra']
var addValDataJson = {};
var userDateFormat = 'MM/DD/YYYY';
define(['N/ui/serverWidget', 'N/search', 'N/file', 'N/config', 'N/url', 'N/format', 'N/record', 'N/redirect', './moment.js'],
    /**
 * @param{serverWidget} serverWidget
 */
    (serverWidget, search, file, config, url, format, record, redirect, moment) => {
        /**
         * Defines the Suitelet script trigger point.
         * @param {Object} scriptContext
         * @param {ServerRequest} scriptContext.request - Incoming request
         * @param {ServerResponse} scriptContext.response - Suitelet response
         * @since 2015.2
         */
        const onRequest = (scriptContext) => {

            try {
                /*var targetUrl  = url.resolveScript({
                    scriptId: targetSuiteletScript[0],
                    deploymentId: targetSuiteletScript[1],
                    returnExternalUrl: false
                });
                var form = serverWidget.createForm({
                    title: 'CashFlow Forecast Dashboard'
                });
                var htmlField = form.addField({
                    id: 'custpage_html',
                    type: serverWidget.FieldType.INLINEHTML,
                    label: 'HTML Field'
                })
                var content = '<iframe src="'+targetUrl+'" style="position: absolute; top: 0; left: 0; border:none;width:100%;height:100%;"></iframe>';
                htmlField.defaultValue = content;
                scriptContext.response.writePage(form);*/
                var selfSuiteLetUrl = url.resolveScript({
                    scriptId: selfSuiteLetScript[0], deploymentId: selfSuiteLetScript[1], returnExternalUrl: false
                });
                log.debug("selfSuiteLetUrl", selfSuiteLetUrl);
                var userPref = config.load({
                    type: config.Type.USER_PREFERENCES
                });
                userDateFormat = userPref.getValue({ fieldId: 'DATEFORMAT' });
                log.emergency('userDateFormat', userDateFormat);
                log.emergency('moment().format()', moment().format());


                var fileSearch = search.create({
                    type: "file",
                    filters: [["name", "is", cashFlowHTMLFile], "OR", ["name", "is", cashFlowCSSFile]],
                    columns: [
                        search.createColumn({ name: "internalid", label: "Internal ID" }),
                        search.createColumn({ name: "name", label: "Name" }),
                        search.createColumn({ name: "url", label: "Url" })
                    ]
                });
                fileSearch = fileSearch.run().getRange({ start: 0, end: 2 });
                log.debug("files data", fileSearch);
                if (fileSearch.length == 2) {
                    var fileNameArray = new Array();
                    var fileIdIdArray = new Array();
                    var fileUrlArray = new Array();
                    for (var count = 0; count < fileSearch.length; count++) {
                        fileNameArray.push(fileSearch[count].getValue({ name: "name", label: "Name" }));
                        fileIdIdArray.push(fileSearch[count].getValue({ name: "internalid", label: "Internal ID" }));
                        fileUrlArray.push(fileSearch[count].getValue({ name: "url", label: "Url" }))
                    }
                    //var lineChartFileId = fileSearch[0].getValue({name: "internalid", label: "Internal ID"});
                } else {
                    throw 'Issue with getting the HTML and CSS data' + ' Search Length: ' + fileSearch.length;
                }
                // log.debug("lineChartFileId",lineChartFileId);
                log.debug("files data", "fileNameArray : " + fileNameArray + "fileIdIdArray : " + fileIdIdArray + "fileUrlArray : " + fileUrlArray);
                var cashFlowHTMLContent = file.load({
                    id: fileIdIdArray[fileNameArray.indexOf(cashFlowHTMLFile)]
                }).getContents().toString();
                var cashFlowStyle = fileUrlArray[fileNameArray.indexOf(cashFlowCSSFile)];
                cashFlowHTMLContent = cashFlowHTMLContent.replace('cashflowStyle', cashFlowStyle);
                cashFlowHTMLContent = cashFlowHTMLContent.replace(/actionurl/g, selfSuiteLetUrl);

                // Step 1: Create Sales Order Search
                var salesData = {}; // { grade: { month: totalQty } }
                var totalPerGrade = {}; // { grade: totalQty }
                var months = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

                var salesorderSearchObj = search.create({
                    type: "salesorder",
                    filters: [
                        ["mainline", "is", "F"],
                        "AND", ["taxline", "is", "F"],
                        "AND", ["cogs", "is", "F"],
                        "AND", ["shipping", "is", "F"],
                        "AND", ["trandate", "within", "thisyear"],
                        "AND",
                        ["custcol_anc_grade", "noneof", "@NONE@"]
                    ],
                    columns: [
                        search.createColumn({ name: "trandate" }),
                        search.createColumn({ name: "quantity" }),
                        search.createColumn({ name: "custcol_anc_grade" })
                    ]
                });

                salesorderSearchObj.run().each(function (result) {
                    var date = result.getValue("trandate");
                    var quantity = parseFloat(result.getValue("quantity")) || 0;
                    var grade = result.getText("custcol_anc_grade") || "Unknown";

                    var monthIndex = new Date(date).getMonth();
                    var month = months[monthIndex];

                    if (!salesData[grade]) salesData[grade] = {};
                    if (!salesData[grade][month]) salesData[grade][month] = 0;

                    salesData[grade][month] += quantity;

                    // Track total per grade
                    totalPerGrade[grade] = (totalPerGrade[grade] || 0) + quantity;

                    return true;
                });

                // Step 2: Get Top 5 Grades
                var topGrades = Object.keys(totalPerGrade)
                    .sort((a, b) => totalPerGrade[b] - totalPerGrade[a])
                    .slice(0, 5);

                // Step 3: Prepare datasets for Chart.js
                var datasets = [];
                var colors = ['gold', 'orange', 'pink', 'blue', 'green'];

                topGrades.forEach(function (grade, index) {
                    var gradeData = [];
                    months.forEach(month => {
                        gradeData.push(salesData[grade][month] || 0);
                    });
                    datasets.push({
                        label: grade,
                        data: gradeData,
                        borderColor: colors[index],
                        fill: false
                    });
                });
                log.debug("months",months);
                log.debug("datasets",datasets);
                cashFlowHTMLContent = cashFlowHTMLContent.replace('graphMonths', months);
                cashFlowHTMLContent = cashFlowHTMLContent.replace('graphData', JSON.stringify(datasets));
                log.debug("cashFlowHTMLContent",cashFlowHTMLContent);
                scriptContext.response.write(cashFlowHTMLContent);
            }
            catch (e) {
                log.error("error in fething the chart data", e);
                scriptContext.response.write('Error in getting the Forecast data, please contact Administrator');
            }

            if (scriptContext.request.method == 'POST') {
                try {
                  
                }
                catch (e) {
                    log.error("error in getting post data", e)
                }

            }

        }

        function getAddValData(forecastDate, forecastType) {
            log.audit("addValDataJson in getAddValData", addValDataJson);
            log.audit("forecastDate in getAddValData", forecastDate + " userDateFormat " + userDateFormat);


            const keys = Object.keys(addValDataJson);
            //var addDataLength = Object.keys(addValDataJson).length;
            var amountAtEnd = 0;
            // var type='';
            for (var j = 0; j < keys.length; j++) {
                var formatForecastDate = moment(forecastDate, userDateFormat);
                log.emergency("formatForecastDate", formatForecastDate);
                const key = keys[j];

                const addValDate = addValDataJson[key]['date']
                const initialAmount = addValDataJson[key]['amount'];
                const recurrenceType = addValDataJson[key]['recurrenceType'];
                const type = addValDataJson[key]['type'];
                const recurrence = addValDataJson[key]['recurrence'];
                const growthRate = (addValDataJson[key]['grate']) / 100;
                log.emergency("key", key + " recurrenceType: " + recurrenceType + " forecastType: " + forecastType)
                var endDate = {};
                if (recurrenceType == 'Weekly') {
                    endDate = moment(addValDate).add(recurrence - 1, 'weeks');
                    if (forecastType == 2) {//monthly
                        formatForecastDate = moment(formatForecastDate).clone().endOf("month");
                    }
                }
                else {
                    endDate = moment(addValDate).clone().add(recurrence - 1, 'months');
                }

                log.emergency("endDate", endDate);
                if (formatForecastDate > endDate) {
                    log.audit("formatForecastDate> endDate", formatForecastDate > endDate + "formatForecastDate - endDate " + formatForecastDate - endDate)
                    formatForecastDate = endDate;
                }
                let isForecastInBetween = formatForecastDate.isBetween(addValDate, endDate, null, [])
                // var endofweekormonth=moment(formatForecastDate).weekday(7);//get end of week - sunday
                var endofweekormonth = (moment(formatForecastDate).clone().day() == 0) ? formatForecastDate : moment(formatForecastDate).clone().weekday(7);//get end of week - sunday

                if (forecastType == 2 && recurrenceType == 'Monthly') {
                    // log.audit("formatForecastDate",formatForecastDate)
                    // var startOfMonth = moment(formatForecastDate).startOf("month");
                    //log.audit("startOfMonth",startOfMonth)
                    endofweekormonth = moment(formatForecastDate).clone().endOf('month');
                    log.audit("endofweekormonth - Monthly", endofweekormonth);
                }
                isForecastInBetween = endofweekormonth.isBetween(addValDate, endDate, null, []);
                log.emergency("isForecastInBetween", isForecastInBetween);
                log.emergency("endofweekormonth", endofweekormonth);

                var number = 0;
                if ((isForecastInBetween == true || (endofweekormonth > endDate && endDate > moment()))) {
                    if (recurrenceType == 'Weekly'/* && forecastType==1*/) {//forecastType==1 - weekly
                        number = endofweekormonth.diff(addValDate, 'weeks', true);
                        number = Math.floor(number);
                        var weeksSubtract = [];
                        for (var i = number; i >= 0; i--) {
                            if (i == number) {
                                var addWeeksToAdDate1 = moment(addValDate).add(i, "week");
                                if (addWeeksToAdDate1 > moment()) {
                                    if (type == 'Inflow') {
                                        amountAtEnd += Math.round(initialAmount * Math.pow(1 + growthRate, i) * 100) / 100;
                                    }
                                    else {
                                        amountAtEnd -= Math.round(initialAmount * Math.pow(1 + growthRate, i) * 100) / 100;
                                    }
                                }
                                weeksSubtract = moment(formatForecastDate).subtract(1, "week");
                            } else {
                                var weeksSubtractEndDate = moment(weeksSubtract).weekday(7);
                                var addWeeksToAdDate = moment(addValDate).add(i, "week");
                                var weeksSubtractIsInBetweeen = weeksSubtractEndDate.isBetween(addValDate, endDate, null, []);
                                if (weeksSubtractIsInBetweeen == true && addWeeksToAdDate > moment()) {
                                    if (type == 'Inflow') {
                                        amountAtEnd += Math.round(initialAmount * Math.pow(1 + growthRate, i) * 100) / 100;
                                    }
                                    else {
                                        amountAtEnd -= Math.round(initialAmount * Math.pow(1 + growthRate, i) * 100) / 100;
                                    }
                                    weeksSubtract = moment(weeksSubtract).subtract(1, "weeks");
                                } else {
                                    break;
                                }
                            }

                        }


                    }
                    else if (recurrenceType == 'Monthly'/* && forecastType==2*/) {//forecastType==2 - Monthly
                        number = endofweekormonth.diff(addValDate, 'months', true);
                        number = Math.floor(number);

                        var monthsSubtract = [];
                        for (var i = number; i >= 0; i--) {
                            if (i == number) {
                                var addMonthsToAdDate1 = moment(addValDate).add(i, "months");
                                if (addMonthsToAdDate1 > moment()) {
                                    if (type == 'Inflow') {
                                        amountAtEnd += Math.round(initialAmount * Math.pow(1 + growthRate, i) * 100) / 100;
                                    }
                                    else {
                                        amountAtEnd -= Math.round(initialAmount * Math.pow(1 + growthRate, i) * 100) / 100;
                                    }
                                }
                                monthsSubtract = moment(formatForecastDate).subtract(1, "months");
                            }
                            else {
                                var monthsSubtractEndDate = moment(monthsSubtract).endOf("month");
                                var addMonthsToAdDate = moment(addValDate).add(i, "months");
                                var monthsSubtractIsInBetweeen = monthsSubtractEndDate.isBetween(addValDate, endDate, null, []);
                                if (monthsSubtractIsInBetweeen == true && addMonthsToAdDate > moment()) {
                                    if (type == 'Inflow') {
                                        amountAtEnd += Math.round(initialAmount * Math.pow(1 + growthRate, i) * 100) / 100;
                                    }
                                    else {
                                        amountAtEnd -= Math.round(initialAmount * Math.pow(1 + growthRate, i) * 100) / 100;
                                    }
                                    monthsSubtract = moment(monthsSubtract).subtract(1, "months");
                                } else {
                                    break;
                                }
                            }
                        }

                    }



                }
                /*  else if(endofweekormonth>endDate){//add same balance
                   if(type=='Inflow'){
                     amountAtEnd +=  Math.round(initialAmount * Math.pow(1 + growthRate, recurrence-1)*100)/100;
                   }
                   else{
                      amountAtEnd -=  Math.round(initialAmount * Math.pow(1 + growthRate, recurrence-1)*100)/100;
                   }
                  }*/
                log.emergency("number", number);
                log.emergency("amountAtEnd", amountAtEnd);
            }

            log.emergency(`Amount at the forecast date`, amountAtEnd);
            return amountAtEnd;

        }

        return { onRequest }

    });
