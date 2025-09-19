/**
 * @NApiVersion 2.1
 * @NScriptType ClientScript
 * @NModuleScope SameAccount
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
            // var currRecObj = currentRecord.get();
            // alert(123)
            try {
                window.opener.location.reload();
                // var implementMessagesHasWarning = implementMessages(scriptContext, currRecObj);
                // console.log("implementMessagesHasWarning", implementMessagesHasWarning);

            } catch (e) {
                console.log("ERROR in ANC_CS_FITMENT_AND_RESERVE.js, function pageInit", e)
            }
        }

        var messageInterval = null;
        const implementMessages = (scriptContext, currRecObj) =>
        {
            var implementMessagesHasWarning = false;
            try {
                console.log("currRecObj", currRecObj);


                var timeLimit = 200000
                var msPerSec = 1000

                var myMsg = uimessage.create({
                    title: "Warning",
                    message: "This page will refresh in " + timeLimit/msPerSec + " seconds to load the most recent data.",
                    type: uimessage.Type.WARNING,
                    // duration : 15000
                });
                myMsg.show();


                messageInterval = setInterval(() => {

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

        const toMDY = (dateVal) => {
            var retVal = dateVal;
            try
            {
                if(dateVal)
                {
                    retVal = new Date(retVal);
                }

            }
            catch(e)
            {
                console.log("ERROR in function toMDY", e)
            }
            console.log("retVal", retVal)
            return retVal;
        }

        function saveRecord(scriptContext)
        {
            if(confirm("proceed?"))
            {

                clearInterval(messageInterval)
                jQuery(".descr").each(function(elem){
                    jQuery(this).html("Submitting, please wait.");
                });

                return true;
            }
            else
            {
                return false;
            }
        }

        return {
            // fieldChanged: fieldChanged,
            pageInit : pageInit,
            // saveRecord : saveRecord
        };

    });



