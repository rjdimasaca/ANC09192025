/**
 * @NApiVersion 2.1
 * @NScriptType Suitelet
 */
define(['/SuiteScripts/ANC_lib.js', 'N/query', 'N/record', 'N/task', 'N/file'], (ANC_lib, query, record, task, file) => {
    const onRequest = (context) => {

        var startTimeStamp = new Date().getTime();
        log.debug("context",context)
        log.debug("context.request",context.request)
        log.debug("body",context.request.body)
        log.debug("parameters",context.request.parameters)
        log.debug("parameters.copyToYear",context.request.parameters.copyToYear)


        var groupedByYear = {};
        if(context.request.parameters.copyToYear || typeof context.request.parameters.copytoyear=='number')
        {
            var targetYear = context.request.parameters.copyToYear;
            var yearSql = `SELECT id, name FROM customrecord_anc_pf_years`;

            if(targetYear)
            {
                yearSql += ` WHERE name = '${targetYear}'`;
            }

            log.debug("yearSql", yearSql);

            const years = query.runSuiteQL({ query: yearSql }).asMappedResults();

            var yearInternalId = "";
            var reqBodyObj = JSON.parse(context.request.body);

            // var yearRecObj = "";
            // if(years.length < 1)
            // {
            //     yearRecObj = record.create({
            //         type : "customrecord_anc_pf_years"
            //     });
            //     yearRecObj.setValue({
            //         fieldId : "name",
            //         value : targetYear
            //     })
            //     // fillupYearRecObj(yearRecObj, reqBodyObj, "new")
            // }
            // else
            // {
            //     yearRecObj = record.load({
            //         type : "customrecord_anc_pf_years",
            //         id : years[0].id
            //     });
            //     // fillupYearRecObj(yearRecObj, reqBodyObj, "edit")
            //     //SL cant do this, times out
            // }

            var reqBodyObj = JSON.parse(context.request.body);
            for(var compositeKey in reqBodyObj.compositeKeys)
            {
                var compositeKeyBreakdown = compositeKey.split("_");

                //June02 2025 - this is a copy operation, override yearInternalId with the year being copied.
                //raw compositekeys are based on UI composite keys which are based on the year being copied
                //thus when you copy 2025 to 2026 it means that the compositekey here is 2025
                //this code does not aim to update 2025, but to copy 2025 to 2026 thus we need preperation for 2026
                var yearInternalId = years[0].id || compositeKeyBreakdown[0]

                // var customerGroup = compositeKeyBreakdown[1];
                var customerInternalId = compositeKeyBreakdown[1]
                var consigneeInternalId = compositeKeyBreakdown[2]
                var gradeInternalId = compositeKeyBreakdown[3]
                var monthInternalId = compositeKeyBreakdown[4]
                var qty = reqBodyObj.compositeKeys[compositeKey]

                var compositeObj ={};
                compositeObj[compositeKey] = reqBodyObj.compositeKeys[compositeKey]

                if(groupedByYear[yearInternalId])
                {
                    groupedByYear[yearInternalId].entries.push(compositeObj)
                    groupedByYear[yearInternalId].byKeys[compositeKey] = {
                        qty : qty,
                        colVals : {
                            monthInternalId,
                            customerInternalId,
                            consigneeInternalId,
                            gradeInternalId,
                            qty
                        }
                    }
                }
                else
                {
                    groupedByYear[yearInternalId] = {
                        entries : [
                            compositeObj
                        ]
                    }
                    groupedByYear[yearInternalId].byKeys = {}
                    groupedByYear[yearInternalId].byKeys[compositeKey] = {
                        qty : qty,
                        colVals : {
                            monthInternalId,
                            customerInternalId,
                            consigneeInternalId,
                            gradeInternalId,
                            qty
                        }
                    }
                    // groupedByYear[yearInternalId].entries.push(compositeKeyBreakdown)
                }
            }

            log.debug("groupedByYear", groupedByYear);
            // groupedByYear = {"test1": {"test2":123}}

            var fileTitle = "sf_job_" + new Date().getTime();
            var fileObj = file.create({
                name : fileTitle,
                fileType : file.Type.PLAINTEXT,
                contents : JSON.stringify(groupedByYear),
                folder : ANC_lib.salesForecastJobFolderId,

            });
            fileObj.title =fileTitle
            fileObj.folder = ANC_lib.salesForecastJobFolderId;
            var fileId = fileObj.save();
            log.debug("fileId", fileId)

            var mrTaskObj = task.create({
                taskType : task.TaskType.MAP_REDUCE,
                scriptId : "customscript_anc_mr_forecastalloc",
                // deploymentId : "customdeploy_anc_mr_forecastalloc",
                params : {
                    custscript_anc_salesforecastdata:fileId,
                    // custscript_anc_salesforecasttyear:targetYear, //MR is expecting year internalid not actual year text
                    custscript_anc_salesforecasttyear:years[0].id,
                }
            });

            var mrTaskid = mrTaskObj.submit();
            log.debug("mrTaskid", mrTaskid);

            return "Job to setup year is queued in the background, with job id : " + mrTaskid

            // for(var yearId in groupedByYear)
            // {
            //     // var yearRecObj = record.load({
            //     //     type : "customrecord_anc_pf_years",
            //     //     id : yearId
            //     // })
            //
            //     // for(var a = 0 ; a < groupedByYear[yearId].entries.length ; a++)
            //     // {
            //     //     yearRecObj.findSublistLineWithValue({
            //     //         sublistId : "recmachcustrecord_anc_pf_year",
            //     //         fieldId : "custrecord_anc_pf_compositekey",
            //     //         value : groupedByYear[yearId].entries[a].
            //     //     })
            //     // }
            //
            //     var newLineIndex = yearRecObj.getLineCount({
            //         sublistId : "recmachcustrecord_anc_pf_year",
            //     })
            //     for(var compositeKeys in groupedByYear[yearId].byKeys)
            //     {
            //         var targetIndex = yearRecObj.findSublistLineWithValue({
            //             sublistId : "recmachcustrecord_anc_pf_year",
            //             fieldId : "custrecord_anc_pf_compositekey",
            //             value : compositeKeys
            //         });
            //
            //         if(targetIndex > -1)
            //         {
            //             yearRecObj.setSublistValue({
            //                 sublistId : "recmachcustrecord_anc_pf_year",
            //                 fieldId : "custrecord_anc_pf_allocation",
            //                 line : targetIndex,
            //                 value : groupedByYear[yearId].byKeys[compositeKeys].qty
            //             })
            //         }
            //         else
            //         {
            //             // log.debug("it does not exist yet? then add it then!")
            //
            //             yearRecObj.setSublistValue({
            //                 sublistId : "recmachcustrecord_anc_pf_year",
            //                 fieldId : "custrecord_anc_pf_month",
            //                 line : newLineIndex,
            //                 value : groupedByYear[yearId].byKeys[compositeKeys].colVals.monthInternalId
            //             })
            //             yearRecObj.setSublistValue({
            //                 sublistId : "recmachcustrecord_anc_pf_year",
            //                 fieldId : "custrecord_anc_pf_customer",
            //                 line : newLineIndex,
            //                 value : groupedByYear[yearId].byKeys[compositeKeys].colVals.customerInternalId
            //             })
            //             yearRecObj.setSublistValue({
            //                 sublistId : "recmachcustrecord_anc_pf_year",
            //                 fieldId : "custrecord_anc_pf_consignee",
            //                 line : newLineIndex,
            //                 value : groupedByYear[yearId].byKeys[compositeKeys].colVals.consigneeInternalId
            //             })
            //             yearRecObj.setSublistValue({
            //                 sublistId : "recmachcustrecord_anc_pf_year",
            //                 fieldId : "custrecord_anc_pf_grade",
            //                 line : newLineIndex,
            //                 value : groupedByYear[yearId].byKeys[compositeKeys].colVals.gradeInternalId
            //             })
            //             yearRecObj.setSublistValue({
            //                 sublistId : "recmachcustrecord_anc_pf_year",
            //                 fieldId : "custrecord_anc_pf_allocation",
            //                 line : newLineIndex,
            //                 value : groupedByYear[yearId].byKeys[compositeKeys].colVals.qty
            //             })
            //             yearRecObj.setSublistValue({
            //                 sublistId : "recmachcustrecord_anc_pf_year",
            //                 fieldId : "custrecord_anc_pf_compositekey",
            //                 line : newLineIndex,
            //                 value : compositeKeys
            //             })
            //             newLineIndex++;
            //         }
            //     }
            //
            //     var submittedYearRecId = yearRecObj.save({
            //         ignoreMandatoryFields : true,
            //         enableSourcing : true
            //     });
            //
            //     log.debug("submittedYearRecId", submittedYearRecId);
            // }
            //
            // var endTimeStamp = new Date().getTime();
            // log.debug("{startTimeStamp,endTimeStamp}", {startTimeStamp,endTimeStamp})
            //
            // log.debug("attemptsave year")
            //
            // var yearRecInternalId = yearRecObj.save({
            //     ignoreMandatoryFields : true,
            //     enableSoucrcing : true
            // });
            // log.debug("yearRecInternalId", yearRecInternalId);
        }
        else if(context.request.parameters.submitdata=="T")
        {
            var reqBodyObj = JSON.parse(context.request.body);
            for(var compositeKey in reqBodyObj.compositeKeys)
            {
                var compositeKeyBreakdown = compositeKey.split("_");

                var yearInternalId = compositeKeyBreakdown[0]
                var customerInternalId = compositeKeyBreakdown[1]
                var consigneeInternalId = compositeKeyBreakdown[2]
                var gradeInternalId = compositeKeyBreakdown[3]

                var monthInternalId = compositeKeyBreakdown[4]

                var qty = reqBodyObj.compositeKeys[compositeKey]

                var compositeObj ={};
                compositeObj[compositeKey] = reqBodyObj.compositeKeys[compositeKey]

                if(groupedByYear[yearInternalId])
                {
                    groupedByYear[yearInternalId].entries.push(compositeObj)
                    groupedByYear[yearInternalId].byKeys[compositeKey] = {
                        qty : qty,
                        colVals : {
                            monthInternalId,
                            customerInternalId,
                            consigneeInternalId,
                            gradeInternalId,
                            qty
                        }
                    }
                }
                else
                {
                    groupedByYear[yearInternalId] = {
                        entries : [
                            compositeObj
                        ]
                    }
                    groupedByYear[yearInternalId].byKeys = {}
                    groupedByYear[yearInternalId].byKeys[compositeKey] = {
                        qty : qty,
                        colVals : {
                            monthInternalId,
                            customerInternalId,
                            consigneeInternalId,
                            gradeInternalId,
                            qty
                        }
                    }
                    // groupedByYear[yearInternalId].entries.push(compositeKeyBreakdown)
                }
            }

            log.debug("groupedByYear", groupedByYear);


            for(var yearId in groupedByYear)
            {
                var yearRecObj = record.load({
                    type : "customrecord_anc_pf_years",
                    id : yearId
                })

                // for(var a = 0 ; a < groupedByYear[yearId].entries.length ; a++)
                // {
                //     yearRecObj.findSublistLineWithValue({
                //         sublistId : "recmachcustrecord_anc_pf_year",
                //         fieldId : "custrecord_anc_pf_compositekey",
                //         value : groupedByYear[yearId].entries[a].
                //     })
                // }

                var newLineIndex = yearRecObj.getLineCount({
                    sublistId : "recmachcustrecord_anc_pf_year",
                })
                for(var compositeKeys in groupedByYear[yearId].byKeys)
                {
                    var targetIndex = yearRecObj.findSublistLineWithValue({
                        sublistId : "recmachcustrecord_anc_pf_year",
                        fieldId : "custrecord_anc_pf_compositekey",
                        value : compositeKeys
                    });

                    if(targetIndex > -1)
                    {
                        yearRecObj.setSublistValue({
                            sublistId : "recmachcustrecord_anc_pf_year",
                            fieldId : "custrecord_anc_pf_allocation",
                            line : targetIndex,
                            value : groupedByYear[yearId].byKeys[compositeKeys].qty
                        })
                    }
                    else
                    {
                        // log.debug("it does not exist yet? then add it then!")

                        yearRecObj.setSublistValue({
                            sublistId : "recmachcustrecord_anc_pf_year",
                            fieldId : "custrecord_anc_pf_month",
                            line : newLineIndex,
                            value : groupedByYear[yearId].byKeys[compositeKeys].colVals.monthInternalId
                        })
                        yearRecObj.setSublistValue({
                            sublistId : "recmachcustrecord_anc_pf_year",
                            fieldId : "custrecord_anc_pf_customer",
                            line : newLineIndex,
                            value : groupedByYear[yearId].byKeys[compositeKeys].colVals.customerInternalId
                        })
                        yearRecObj.setSublistValue({
                            sublistId : "recmachcustrecord_anc_pf_year",
                            fieldId : "custrecord_anc_pf_consignee",
                            line : newLineIndex,
                            value : groupedByYear[yearId].byKeys[compositeKeys].colVals.consigneeInternalId
                        })
                        yearRecObj.setSublistValue({
                            sublistId : "recmachcustrecord_anc_pf_year",
                            fieldId : "custrecord_anc_pf_grade",
                            line : newLineIndex,
                            value : groupedByYear[yearId].byKeys[compositeKeys].colVals.gradeInternalId
                        })
                        yearRecObj.setSublistValue({
                            sublistId : "recmachcustrecord_anc_pf_year",
                            fieldId : "custrecord_anc_pf_allocation",
                            line : newLineIndex,
                            value : groupedByYear[yearId].byKeys[compositeKeys].colVals.qty
                        })
                        yearRecObj.setSublistValue({
                            sublistId : "recmachcustrecord_anc_pf_year",
                            fieldId : "custrecord_anc_pf_compositekey",
                            line : newLineIndex,
                            value : compositeKeys
                        })
                        newLineIndex++;
                    }
                }

                var submittedYearRecId = yearRecObj.save({
                    ignoreMandatoryFields : true,
                    enableSourcing : true
                });

                log.debug("submittedYearRecId", submittedYearRecId);
            }

            context.response.write(JSON.stringify(groupedByYear)); // Return data as JSON
        }
        else
        {
            var currYear = new Date().getFullYear();


            const customerConsigneeSql = `
            SELECT
                cust.id AS customer_id,
                cust.entityid AS customer_name,
                con.id AS consignee_id,
                con.name AS consignee_name,
                con.custrecord_alberta_ns_city AS consignee_city,
                parent.entityid AS parent_entityid
            FROM customer cust
                     JOIN customrecord_alberta_ns_consignee_record con
                          ON con.custrecord_alberta_ns_customer = cust.id
                     JOIN customersubsidiaryrelationship csr ON csr.entity = cust.ID
                     JOIN customer parent ON parent.ID = cust.parent
            WHERE cust.isinactive='F' AND con.isinactive='F' AND con.custrecord_anc_includeinsalesforecast='T' AND csr.subsidiary=5 
        `;
            const itemSql = `
            SELECT itemid, id,  FROM item
            WHERE isserialitem='T'
              AND
                parent IS NULL
              AND
                isinactive = 'F'
              AND
                LENGTH(itemid) < 10
              AND
                custitemitem_category = 'Paper'
                /*matrixtype = 'PARENT'*/
        `;
            var monthSql = `SELECT id, name FROM customrecord_anc_pf_months`;
            var yearSql = `SELECT id, name FROM customrecord_anc_pf_years`;

            if(context.request.parameters.year)
            {
                yearSql += ` WHERE name = '${context.request.parameters.year}'`;
            }
            else
            {
                yearSql += ` WHERE name = '${currYear}'`;
            }

            log.debug("customerConsigneeSql", customerConsigneeSql);
            log.debug("yearSql", yearSql);
            log.debug("monthSql", monthSql);
            log.debug("itemSql", itemSql);

            const customers = query.runSuiteQL({ query: customerConsigneeSql }).asMappedResults();
            const items = query.runSuiteQL({ query: itemSql }).asMappedResults();
            const months = query.runSuiteQL({ query: monthSql }).asMappedResults();
            const years = query.runSuiteQL({ query: yearSql }).asMappedResults();


            log.debug("customers", customers.length)

            log.debug("items", items.length)

            log.debug("months", months.length)

            log.debug("years", years.length)

            var yearFilter = ""
            var targetYear = context.request.parameters.year;
            if(targetYear)
            {
                yearFilter = `AND customrecord_anc_pf_years.name='${targetYear}'`
            }
            else
            {
                yearFilter = `AND customrecord_anc_pf_years.name = '${currYear}'`;
                targetYear = currYear
            }


            forecastSql = `SELECT customrecord_anc_pf_.*
            FROM customrecord_anc_pf_ 
                JOIN customrecord_anc_pf_years ON customrecord_anc_pf_.custrecord_anc_pf_year = customrecord_anc_pf_years.ID 
            WHERE customrecord_anc_pf_.isinactive='F' AND customrecord_anc_pf_years.name='${targetYear}'`;
            const existingForecast = query.runSuiteQL({ query: forecastSql }).asMappedResults();


            log.debug("forecastSql", forecastSql);
            log.debug("existingForecast", existingForecast);


            var forecastByCompositeKey = {};
            for(var a = 0 ; a < existingForecast.length ; a++)
            {
                forecastByCompositeKey[`${existingForecast[a].custrecord_anc_pf_year}_${existingForecast[a].custrecord_anc_pf_month}_${existingForecast[a].custrecord_anc_pf_customer}_${existingForecast[a].custrecord_anc_pf_consignee}_${existingForecast[a].custrecord_anc_pf_grade}`] = {
                    vals:existingForecast[a],
                    id : existingForecast[a].id,
                    qty : existingForecast[a].custrecord_anc_pf_allocation
                };
            }
            log.debug("forecastByCompositeKey",forecastByCompositeKey);

            // var baseMonths = [];
            // months.forEach(month => {
            //     baseMonths.push(0)
            // });
            //
            // // Build permutations
            // let combinations = [];
            // years.forEach(year => {
            //     customers.forEach(c => {
            //         items.forEach(item => {
            //             combinations.push({
            //                 year,
            //                 customer: { id: c.customer_id, name: c.customer_name, parent_entityid : c.parent_entityid },
            //                 consignee: { id: c.consignee_id, name: c.consignee_name },
            //                 item,
            //             });
            //         });
            //     });
            //
            // });

            // Build permutations
            let combinations = [];
            years.forEach(year => {
                // months.forEach(month => {
                items.forEach(item => {
                    customers.forEach(c => {
                        combinations.push({
                            year, /*month,*/
                            customer: { id: c.customer_id, name: c.customer_name, parent_entityid : c.parent_entityid },
                            consignee: { id: c.consignee_id, name: c.consignee_name, city : c.consignee_city },
                            item,
                        });
                    });
                });
                // });
            });

            log.debug("combinations.length", combinations.length)
            log.debug("combinations", combinations)

            // log.debug("combinations.splice", combinations.splice(0, 100000))
            // combinations = combinations.splice(0, 100000);


            // const tableRows = combinations.map(row => `
            //     <tr>
            //         <td>${row.customer.parent_entityid}</td>
            //         <td>${row.customer.name}</td>
            //         <td>${row.consignee.name}</td>
            //         <td>${row.item.itemid}</td>
            //         <td></td>
            //         <td>
            //             <input type="number"
            //                    name="alloc_${row.year.id}_${row.month.id}_${row.customer.id}_${row.consignee.id}_${row.item.id}"
            //                    style="width: 60px;" />
            //         </td>
            //         <td>${row.customer.id}_${row.consignee.id}_${row.item.id}</td>
            //     </tr>
            // `).join('');
            //
            // log.debug("tableRows", tableRows);


            // const responseData = combinations.map(row => ({
            //     customerGroup: `${row.customer.parent_entityid}`,
            //     customer: `${row.customer.name}`,
            //     consignee: `${row.consignee.name}`,
            //     grade: `${row.item.itemid}`,
            //     month1 : forecastByCompositeKey[`${row.year.id}_1_${row.customer.id}_${row.consignee.id}_${row.item.id}`] ? forecastByCompositeKey[`${row.year.id}_1_${row.customer.id}_${row.consignee.id}_${row.item.id}`].qty : 0,
            //     month2 : forecastByCompositeKey[`${row.year.id}_2_${row.customer.id}_${row.consignee.id}_${row.item.id}`] ? forecastByCompositeKey[`${row.year.id}_2_${row.customer.id}_${row.consignee.id}_${row.item.id}`].qty : 0,
            //     month3 : forecastByCompositeKey[`${row.year.id}_3_${row.customer.id}_${row.consignee.id}_${row.item.id}`] ? forecastByCompositeKey[`${row.year.id}_3_${row.customer.id}_${row.consignee.id}_${row.item.id}`].qty : 0,
            //     month4 : forecastByCompositeKey[`${row.year.id}_4_${row.customer.id}_${row.consignee.id}_${row.item.id}`] ? forecastByCompositeKey[`${row.year.id}_4_${row.customer.id}_${row.consignee.id}_${row.item.id}`].qty : 0,
            //     month5 : forecastByCompositeKey[`${row.year.id}_5_${row.customer.id}_${row.consignee.id}_${row.item.id}`] ? forecastByCompositeKey[`${row.year.id}_5_${row.customer.id}_${row.consignee.id}_${row.item.id}`].qty : 0,
            //     month6 : forecastByCompositeKey[`${row.year.id}_6_${row.customer.id}_${row.consignee.id}_${row.item.id}`] ? forecastByCompositeKey[`${row.year.id}_6_${row.customer.id}_${row.consignee.id}_${row.item.id}`].qty : 0,
            //     month7 : forecastByCompositeKey[`${row.year.id}_7_${row.customer.id}_${row.consignee.id}_${row.item.id}`] ? forecastByCompositeKey[`${row.year.id}_7_${row.customer.id}_${row.consignee.id}_${row.item.id}`].qty : 0,
            //     month8 : forecastByCompositeKey[`${row.year.id}_8_${row.customer.id}_${row.consignee.id}_${row.item.id}`] ? forecastByCompositeKey[`${row.year.id}_8_${row.customer.id}_${row.consignee.id}_${row.item.id}`].qty : 0,
            //     month9 : forecastByCompositeKey[`${row.year.id}_9_${row.customer.id}_${row.consignee.id}_${row.item.id}`] ? forecastByCompositeKey[`${row.year.id}_9_${row.customer.id}_${row.consignee.id}_${row.item.id}`].qty : 0,
            //     month10 : forecastByCompositeKey[`${row.year.id}_10_${row.customer.id}_${row.consignee.id}_${row.item.id}`] ? forecastByCompositeKey[`${row.year.id}_10_${row.customer.id}_${row.consignee.id}_${row.item.id}`].qty : 0,
            //     month11 : forecastByCompositeKey[`${row.year.id}_11_${row.customer.id}_${row.consignee.id}_${row.item.id}`] ? forecastByCompositeKey[`${row.year.id}_11_${row.customer.id}_${row.consignee.id}_${row.item.id}`].qty : 0,
            //     month12 : forecastByCompositeKey[`${row.year.id}_12_${row.customer.id}_${row.consignee.id}_${row.item.id}`] ? forecastByCompositeKey[`${row.year.id}_12_${row.customer.id}_${row.consignee.id}_${row.item.id}`].qty : 0,
            //     total: `0`,
            //     compositeKey: `${row.year.id}_${row.month.id}_${row.customer.id}_${row.consignee.id}_${row.item.id}`,
            // }));
            const responseData = combinations.map(function(row){

                var obj = {
                    customerGroup: `${row.customer.parent_entityid}`,
                    customer: `${row.customer.name}`,
                    consignee: `${row.consignee.name}`,
                    city: `${row.consignee.city}`,
                    grade: `${row.item.itemid}`,
                    month1 : forecastByCompositeKey[`${row.year.id}_1_${row.customer.id}_${row.consignee.id}_${row.item.id}`] ? forecastByCompositeKey[`${row.year.id}_1_${row.customer.id}_${row.consignee.id}_${row.item.id}`].qty : 0,
                    month2 : forecastByCompositeKey[`${row.year.id}_2_${row.customer.id}_${row.consignee.id}_${row.item.id}`] ? forecastByCompositeKey[`${row.year.id}_2_${row.customer.id}_${row.consignee.id}_${row.item.id}`].qty : 0,
                    month3 : forecastByCompositeKey[`${row.year.id}_3_${row.customer.id}_${row.consignee.id}_${row.item.id}`] ? forecastByCompositeKey[`${row.year.id}_3_${row.customer.id}_${row.consignee.id}_${row.item.id}`].qty : 0,
                    month4 : forecastByCompositeKey[`${row.year.id}_4_${row.customer.id}_${row.consignee.id}_${row.item.id}`] ? forecastByCompositeKey[`${row.year.id}_4_${row.customer.id}_${row.consignee.id}_${row.item.id}`].qty : 0,
                    month5 : forecastByCompositeKey[`${row.year.id}_5_${row.customer.id}_${row.consignee.id}_${row.item.id}`] ? forecastByCompositeKey[`${row.year.id}_5_${row.customer.id}_${row.consignee.id}_${row.item.id}`].qty : 0,
                    month6 : forecastByCompositeKey[`${row.year.id}_6_${row.customer.id}_${row.consignee.id}_${row.item.id}`] ? forecastByCompositeKey[`${row.year.id}_6_${row.customer.id}_${row.consignee.id}_${row.item.id}`].qty : 0,
                    month7 : forecastByCompositeKey[`${row.year.id}_7_${row.customer.id}_${row.consignee.id}_${row.item.id}`] ? forecastByCompositeKey[`${row.year.id}_7_${row.customer.id}_${row.consignee.id}_${row.item.id}`].qty : 0,
                    month8 : forecastByCompositeKey[`${row.year.id}_8_${row.customer.id}_${row.consignee.id}_${row.item.id}`] ? forecastByCompositeKey[`${row.year.id}_8_${row.customer.id}_${row.consignee.id}_${row.item.id}`].qty : 0,
                    month9 : forecastByCompositeKey[`${row.year.id}_9_${row.customer.id}_${row.consignee.id}_${row.item.id}`] ? forecastByCompositeKey[`${row.year.id}_9_${row.customer.id}_${row.consignee.id}_${row.item.id}`].qty : 0,
                    month10 : forecastByCompositeKey[`${row.year.id}_10_${row.customer.id}_${row.consignee.id}_${row.item.id}`] ? forecastByCompositeKey[`${row.year.id}_10_${row.customer.id}_${row.consignee.id}_${row.item.id}`].qty : 0,
                    month11 : forecastByCompositeKey[`${row.year.id}_11_${row.customer.id}_${row.consignee.id}_${row.item.id}`] ? forecastByCompositeKey[`${row.year.id}_11_${row.customer.id}_${row.consignee.id}_${row.item.id}`].qty : 0,
                    month12 : forecastByCompositeKey[`${row.year.id}_12_${row.customer.id}_${row.consignee.id}_${row.item.id}`] ? forecastByCompositeKey[`${row.year.id}_12_${row.customer.id}_${row.consignee.id}_${row.item.id}`].qty : 0,
                    total: `0`,
                    compositeKey: `${row.year.id}_${row.customer.id}_${row.consignee.id}_${row.item.id}`}

                obj.total = Number(obj.month1) + Number(obj.month2) + Number(obj.month3) + Number(obj.month4) + Number(obj.month5) + Number(obj.month6) + Number(obj.month7) + Number(obj.month8) + Number(obj.month9) + Number(obj.month10) + Number(obj.month11) + Number(obj.month12)
                // log.debug("responseData row", row)
                return obj
            });

            log.debug("responseData", responseData);

            context.response.write(JSON.stringify(responseData)); // Return data as JSON
        }
    };

    var yearRecForecastSublistId = "recmachcustrecord_anc_pf_year";
    var yearRecCompositeKeyFieldId = "custrecord_anc_pf_compositekey";
    var yearRecFieldMapping = {
        columns: [
            // {
            //     source : "customerGroup",
            //     dataType : "compositekey",
            //     compositeKeyIndex : 2,
            //     targetCol : "custrecord_anc_pf_customer"
            // },
            {
                source : "month",
                dataType : "compositekey",
                compositeKeyIndex : 0,
                targetCol : "custrecord_anc_pf_month"
            },
            // {
            //     source : "year",
            //     dataType : "compositekey",
            //     compositeKeyIndex : 1,
            //     targetCol : "custrecord_anc_pf_year"
            // },
            {
                source : "customer",
                dataType : "compositekey",
                compositeKeyIndex : 2,
                targetCol : "custrecord_anc_pf_customer"
            },
            {
                source : "consignee",
                dataType : "compositekey",
                compositeKeyIndex : 3,
                targetCol : "custrecord_anc_pf_consignee"
            },
            {
                source : "grade",
                dataType : "compositekey",
                compositeKeyIndex : 4,
                targetCol : "custrecord_anc_pf_grade"
            },
            {
                source : "compositekey",
                dataType : "text",
                targetCol : "custrecord_anc_pf_compositekey"
            },
            {
                source : "currQty",
                dataType : "value",
                targetCol : "custrecord_anc_pf_allocation"
            },
            // {
            //     source : "name",
            //     dataType : "combination",
            //     combinationKeys : ["month", "year", "customer", "consignee", "grade"],
            //     targetCol : "name"
            // },
        ]
    }

    function fillupYearRecObj(yearRecObj, reqBodyObj, mode)
    {
        var groupedByYear = {};
        for(var compositeKey in reqBodyObj.compositeKeys)
        {
            var compositeKeyBreakdown = compositeKey.split("_");

            var yearInternalId = compositeKeyBreakdown[0]
            var monthInternalId = compositeKeyBreakdown[1]
            var customerInternalId = compositeKeyBreakdown[2]
            var consigneeInternalId = compositeKeyBreakdown[3]
            var gradeInternalId = compositeKeyBreakdown[4]
            var qty = reqBodyObj.compositeKeys[compositeKey]

            var compositeObj ={};
            compositeObj[compositeKey] = reqBodyObj.compositeKeys[compositeKey]

            if(groupedByYear[yearInternalId])
            {
                groupedByYear[yearInternalId].entries.push(compositeObj)
                groupedByYear[yearInternalId].byKeys[compositeKey] = {
                    qty : qty,
                    colVals : {
                        monthInternalId,
                        customerInternalId,
                        consigneeInternalId,
                        gradeInternalId,
                        qty
                    }
                }
            }
            else
            {
                groupedByYear[yearInternalId] = {
                    entries : [
                        compositeObj
                    ]
                }
                groupedByYear[yearInternalId].byKeys = {}
                groupedByYear[yearInternalId].byKeys[compositeKey] = {
                    qty : qty,
                    colVals : {
                        monthInternalId,
                        customerInternalId,
                        consigneeInternalId,
                        gradeInternalId,
                        qty
                    }
                }
                // groupedByYear[yearInternalId].entries.push(compositeKeyBreakdown)
            }
        }
        // for(var a = 0 ; a < sublistValues.length ; a++)
        // {
        //     var targetIndex = yearRecObj.findSublistLineWithValue({
        //         sublistId : yearRecForecastSublistId,
        //         fieldId : yearRecCompositeKeyFieldId
        //     })
        //     if(mode == "edit")
        //     {
        //
        //     }
        //     else
        //     {
        //         var nameValue = "";
        //         for(var b = 0 ; b < yearRecFieldMapping.columns.length ; b++)
        //         {
        //             var lineObj = yearRecFieldMapping.columns[b];
        //             var dataType = lineObj.dataType;
        //             var targetValue = "";
        //             if(dataType == "compositekey")
        //             {
        //                 var compositeArr = sublistValues[a].compositekey.split("_")
        //                 try
        //                 {
        //                     targetValue = compositeArr[lineObj.compositeKeyIndex] || "";
        //
        //                     yearRecObj.setSublistValue({
        //                         sublistId : yearRecForecastSublistId,
        //                         fieldId : lineObj.targetCol,
        //                         value : targetValue,
        //                         line : b
        //                     })
        //                 }
        //                 catch(compositeArrIssue)
        //                 {
        //                     error.log("Error ignored in function fillupYearRecObj compositeArrIssue", compositeArrIssue);
        //                 }
        //             }
        //             else if(dataType == "value")
        //             {
        //                 var targetValue = sublistValues[a][lineObj.source]
        //                 try
        //                 {
        //                     targetValue = sublistValues[lineObj.compositeKeyIndex] || "";
        //
        //                     yearRecObj.setSublistValue({
        //                         sublistId : yearRecForecastSublistId,
        //                         fieldId : lineObj.targetCol,
        //                         value : targetValue,
        //                         line : b
        //                     })
        //                 }
        //                 catch(compositeArrIssue)
        //                 {
        //                     error.log("Error ignored in function fillupYearRecObj compositeArrIssue", compositeArrIssue);
        //                 }
        //             }
        //             else if(dataType == "text")
        //             {
        //                 var targetValue = sublistValues[a][lineObj.source]
        //                 try
        //                 {
        //                     targetValue = sublistValues[lineObj.compositeKeyIndex] || "";
        //
        //                     yearRecObj.setSublistText({
        //                         sublistId : yearRecForecastSublistId,
        //                         fieldId : lineObj.targetCol,
        //                         text : targetValue,
        //                         line : b
        //                     })
        //                 }
        //                 catch(compositeArrIssue)
        //                 {
        //                     error.log("Error ignored in function fillupYearRecObj compositeArrIssue", compositeArrIssue);
        //                 }
        //             }
        //
        //         }
        //         yearRecObj.setSublistValue({
        //             sublistId : yearRecForecastSublistId,
        //             fieldId : nameValue,
        //             value : `${sublistValues[a].year}|${sublistValues[a].month}|${sublistValues[a].customer.id}|${sublistValues[a].customer.id}|${sublistValues[a].consignee}|${sublistValues[a].grade}`,
        //             line : b
        //         })
        //
        //
        //     }
        // }

    }

    return { onRequest };
});
