/**
 * @NApiVersion 2.1
 * @NScriptType ClientScript
 * @NModuleScope SameAccount
 *
 * Author       :       Rodmar Dimasaca / rod@joycloud.solutions / netrodsuite@gmail.com
 * Description  :       For ANC
 * File Name    :       ANC_CS_MINIMIZE_UI.js
 * Script Name  :       ANC CS MINIMIZE UI
 * Script Id    :       no script, used in form.setScript
 * Deployment Id:       no deployment, used in form.setScript
 * API Version  :       2.1
 * version      :       1.0.0
 */
define(['N/runtime', 'N/search', 'N/url', 'N/ui/message', 'N/currentRecord'],
    /**
 * @param{runtime} runtime
 * @param{search} search
 * @param{url} url
 * @param{uimessage} uimessage
 */
    (runtime, search, url, uimessage, currentRecord) => {

        const pageInit = (scriptContext) => {
            var currRecObj = currentRecord.get();
            try {
                // var implementMessagesHasWarning = implementMessages(scriptContext, currRecObj);
                console.log("implementMessagesHasWarning", implementMessagesHasWarning);


            } catch (e) {
                console.log("ERROR in ANC_CS_FITMENT_AND_RESERVE.js, function pageInit", e)
            }
        }

        const implementMessages = (scriptContext, currRecObj) =>
        {
            var implementMessagesHasWarning = false;
            try {
                console.log("currRecObj", currRecObj);


                var timeLimit = 15000
                var msPerSec = 1000

                var myMsg = uimessage.create({
                    title: "Warning",
                    message: "This page will refresh in " + 15000/msPerSec + " seconds to load the most recent data.",
                    type: uimessage.Type.WARNING,
                    // duration : 15000
                });
                myMsg.show();


                var messageInterval = setInterval(() => {

                    jQuery(".descr").each(function(elem){
                        jQuery(this).html("This page will refresh in " + timeLimit / msPerSec + " seconds to load the most recent data.");
                    });

                    timeLimit -= 1000

                    if(timeLimit < 0)
                    {
                        clearInterval(messageInterval);
                        window.location.reload();
                    }


                },msPerSec)



            } catch (e) {
                console.log("ERROR in ANC_CS_FITMENT_AND_RESERVE.js, function implementMessages", e)
            }
            return implementMessagesHasWarning;
        }


        function saveRecord(scriptContext)
        {
            if(confirm("proceed?"))
            {
                return true;
            }
            else
            {
                return false;
            }
        }



        return {
            pageInit : pageInit,
            saveRecord : saveRecord
        };

    });



