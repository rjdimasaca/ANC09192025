/**
 * @NApiVersion 2.1
 * @NScriptType UserEventScript
 */
define(['N/email', 'N/record', 'N/runtime', 'N/search', 'N/url'],
    /**
 * @param{email} email
 * @param{record} record
 * @param{runtime} runtime
 * @param{search} search
 * @param{url} url
 */
    (email, record, runtime, search, url) => {


        var noteTypeMapping = {7:"Note"};
        var DEFAULT_NOTE_TYPE_TEXT = "Unmapped Note Type";
        /**
         * Defines the function definition that is executed before record is loaded.
         * @param {Object} scriptContext
         * @param {Record} scriptContext.newRecord - New record
         * @param {string} scriptContext.type - Trigger type; use values from the context.UserEventType enum
         * @param {Form} scriptContext.form - Current form
         * @param {ServletRequest} scriptContext.request - HTTP request information sent from the browser for a client action only.
         * @since 2015.2
         */
        const beforeLoad = (scriptContext) =>
        {
            try
            {
                var doHideSublist = true;
                var sublistId_noterec = "recmachcustrecord_anc_note_parentnote";
                if(doHideSublist)
                {
                    var origNotesList = [];
                    if(sublistId_noterec && scriptContext.type == "view" /*|| scriptContext.type == "edit"*/)
                    {
                        var targetSubtab = "";
                        var targetRec = record.load({
                            type : scriptContext.newRecord.type,
                            id : scriptContext.newRecord.id
                        })
                        var sublistObj = scriptContext.form.getSublist({
                            id : sublistId_noterec
                        });

                        log.debug("sublistObj.lineCount", sublistObj.lineCount);
                        log.debug("sublistObj", sublistObj);
                        var lineCount = targetRec.getLineCount({
                            sublistId : sublistId_noterec
                        })

                        log.debug("lineCount", lineCount)

                        // lineCount = 1;

                        for(var a = 0 ; a < lineCount; a++)
                        {
                            var notelistelemparam = {
                                sublistId : sublistId_noterec,
                                fieldId : "custrecord_anc_note_notetype",
                                id : "custrecord_anc_note_notetype",
                                line : a,
                                convertToNoteType : true
                            }

                            notelistelemparam.value = targetRec.getSublistText(notelistelemparam);
                            if(notelistelemparam.value)
                            {
                                notelistelemparam.value = targetRec.getSublistValue(notelistelemparam);
                            }

                            notelistelemparam.id = "custpage_ancnotetype"


                            origNotesList.push(
                                notelistelemparam
                            )

                            //next

                            var notelistelemparam = {
                                sublistId : sublistId_noterec,
                                fieldId : "custrecord_anc_note_note",
                                id : "custrecord_anc_note_note",
                                line : a
                            }

                            notelistelemparam.value = targetRec.getSublistValue(notelistelemparam);
                            log.debug("notelistelemparam.value", notelistelemparam.value)
                            notelistelemparam.id = "custpage_ancnotenote"


                            origNotesList.push(
                                notelistelemparam
                            );
                        }


                        targetSubtab = "custom261";
                        sublistObj.displayType = "hidden";


                        var sublistObj_fake = scriptContext.form.addSublist({
                            id : "custpage_anc_fakesublist",
                            label : "fake sublist",
                            type : "STATICLIST",
                            tab : "custom261", // TODO
                            container : "custom261" // TODO
                        });

                        var sublistObj_title = sublistObj_fake.addField({
                            id : "custpage_ancnotetype",
                            label : "Title",
                            type : "text",
                        })

                        var sublistObj_note = sublistObj_fake.addField({
                            id : "custpage_ancnotenote",
                            label : "Note",
                            type : "textarea",
                        });

                        log.debug("origNotesList", origNotesList)

                        for(var a = 0 ; a < origNotesList.length ; a++)
                        {
                            if(origNotesList[a].convertToNoteType)
                            {
                                origNotesList[a].value = noteTypeMapping[origNotesList[a].value] ? noteTypeMapping[origNotesList[a].value] : DEFAULT_NOTE_TYPE_TEXT;
                            }


                            sublistObj_fake.setSublistValue(origNotesList[a]);




                        }

                        // sublistObj_fake.setSublistValue({
                        //     id : "custpage_ancnotetype",
                        //     line : 0,
                        //     value : "test text"
                        // })
                        // sublistObj_fake.setSublistValue({
                        //     id : "custpage_ancnotenote",
                        //     line : 0,
                        //     value : "test longtext"
                        // })

                        scriptContext.form.hideNavBar = true;

                    }


                    if(scriptContext.type == "edit")
                    {
                        var btnObj = scriptContext.form.getButton({
                            id : "newrec1424" //TODO no this does not work
                        });

                        log.debug("btnObj", btnObj)

                        if(btnObj)
                        {
                            btnObj.isHidden = true;
                        }
                    }
                }
            }
            catch(e)
            {
                log.error("ERROR in function beforeLoad", e);
            }
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
            try
            {
                if(scriptContext.type != "delete")
                {
                }
            }
            catch(e)
            {
                log.error("ERROR in function afterSubmit", e)
            }
        }

        return {beforeLoad, beforeSubmit, afterSubmit}

    });
