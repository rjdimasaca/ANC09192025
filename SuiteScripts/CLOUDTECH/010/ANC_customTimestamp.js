/**
 * @NApiVersion 2.1
 * @NScriptType UserEventScript
 */
define(['N/record'],
    /**
 * @param{record} record
 */
    (record) => {
        /**
         * Defines the function definition that is executed before record is loaded.
         * @param {Object} scriptContext
         * @param {Record} scriptContext.newRecord - New record
         * @param {string} scriptContext.type - Trigger type; use values from the context.UserEventType enum
         * @param {Form} scriptContext.form - Current form
         * @param {ServletRequest} scriptContext.request - HTTP request information sent from the browser for a client action only.
         * @since 2015.2
         */
        const beforeLoad = (scriptContext) => {

        }

        /**
         * Defines the function definition that is executed before record is submitted.
         * @param {Object} scriptContext
         * @param {Record} scriptContext.newRecord - New record
         * @param {Record} scriptContext.oldRecord - Old record
         * @param {string} scriptContext.type - Trigger type; use values from the context.UserEventType enum
         * @since 2015.2
         */
        const beforeSubmit = (scriptContext) => {
            log.debug("beforeSubmit scriptContext", scriptContext);

			//var format = "2023-02-21 16:04:07.793"
			var baseDate = new Date();
			var baseDate_year = new Date().getFullYear();
			var baseDate_month = addZero(new Date().getMonth() + 1);
			var baseDate_date = addZero(new Date().getDate());
			var formattedDate = baseDate_year + "-" + baseDate_month + "-" + baseDate_date;

			var baseDate_hr = addZero(new Date().getHours());
			var baseDate_min = addZero(new Date().getMinutes());
			var baseDate_sec = addZero(new Date().getSeconds());
			var baseDate_msec = addZero(new Date().getMilliseconds());
			formattedDate += " " + baseDate_hr + ":" + baseDate_min + ":" + baseDate_sec;

			var timeStampValue = formattedDate

			function addZero(i) {
			  if (i < 10) {i = "0" + i}
			  return i;
			}

            if(scriptContext.type == "create")
            {
                var oldDate = scriptContext.newRecord.getValue({
                    fieldId : "custrecord_anc_" + scriptContext.newRecord.type + "datecreated"
                });
    
                if(oldDate == "")
                {
    
                    scriptContext.newRecord.setValue({
                        fieldId : "custrecord_anc_" + scriptContext.newRecord.type + "datecreated",
                        value : timeStampValue
                    })
                }
            }
            else if(scriptContext.type == "edit")
            {
                var oldDate = scriptContext.newRecord.getValue({
                    fieldId : "custrecord_anc_" + scriptContext.newRecord.type + "_datemod"
                });
    
    
                scriptContext.newRecord.setValue({
                    fieldId : "custrecord_anc_" + scriptContext.newRecord.type + "_datemod",
                    value : timeStampValue
                })


                //edit records with no create date
                var oldDate = scriptContext.newRecord.getValue({
                    fieldId : "custrecord_anc_" + scriptContext.newRecord.type + "_datecreated"
                });
    
                if(oldDate == "")
                {
                    scriptContext.newRecord.setValue({
                        fieldId : "custrecord_anc_" + scriptContext.newRecord.type + "_datecreated",
                        value : timeStampValue
                    })
                }


            }
            else if(scriptContext.type == "xedit")
            {
                var oldDate = scriptContext.newRecord.getValue({
                    fieldId : "custrecord_anc_" + scriptContext.newRecord.type + "_datemod"
                });
    
    
                scriptContext.newRecord.setValue({
                    fieldId : "custrecord_anc_" + scriptContext.newRecord.type + "_datemod",
                    value : timeStampValue
                })


                //edit records with no create date
                var oldDate = scriptContext.newRecord.getValue({
                    fieldId : "custrecord_anc_" + scriptContext.newRecord.type + "_datecreated"
                });
    
                if(oldDate == "")
                {
                    scriptContext.newRecord.setValue({
                        fieldId : "custrecord_anc_" + scriptContext.newRecord.type + "_datecreated",
                        value : timeStampValue
                    })
                }


            }
            

            

        }

        /**
         * Defines the function definition that is executed after record is submitted.
         * @param {Object} scriptContext
         * @param {Record} scriptContext.newRecord - New record
         * @param {Record} scriptContext.oldRecord - Old record
         * @param {string} scriptContext.type - Trigger type; use values from the context.UserEventType enum
         * @since 2015.2
         */
        const afterSubmit = (scriptContext) => {
            // var targetRec = record.load({
            //     type : scriptContext.newRecord.type,
            //     id : scriptContext.newRecord.id
            // });

            
            // targetRec.newRecord.setValue({
            //     fieldId : "custrecord_anc_datecreated",
            //     value : timeStampValue
            // })

            // targetRec.save();
        }

        return {
            //beforeLoad,
            beforeSubmit,
            //afterSubmit
        }

    });
