/**
 * AUTHOR : Rodmar Dimasaca
 * Script file : ANC_handleReturnsGL.js
 * Script Name : ANC RD Handle Returns GL
 * Script Id : customscript_anc_rd_handlereturnsgl
 * Script Type : Custom GL Lines Plugin
 *
 * EXECUTE AS ROLE: System Administrator
 */

/**
 *
 * @param transactionRecord
 * @param standardLines
 * @param customLines
 * @param book
 */
function customizeGlImpact(transactionRecord, standardLines, customLines, book)
{
    var CUSTOM_SEGMENT_COLUMNS_TO_COPY = ["cseg_anc_mrkt_sgmt", "cseg_anc_dstnation"];
    //cseg_anc_dstnation 251 = Canada
    //cseg_anc_mrkt_sgmt 1 = NY - Painted Post

    var FORCE_DEFAULT_SEGMENTS = {};
    // var FORCE_DEFAULT_SEGMENTS = {cseg_anc_mrkt_sgmt : 1, cseg_anc_dstnation : 251};
    var ACCOUNT_NUMBER_1502_INTERNALID = "129"; //1502 Purchases Returned Not Credited

    var SUBSIDIARY_DEFAULT_VRA_ACCOUNT = "";
    try{
        var targetRecord = transactionRecord;
        var targetRecord_recType = targetRecord.getRecordType();
        var targetRecord_id = targetRecord.getId();

        log.debug("targetRecord_recType", targetRecord_recType)

        if(targetRecord_recType == "itemfulfillment")
        {
            var targetRecord_createdfrom = targetRecord.getFieldValue("createdfrom");
            var targetRecord_billingtype = targetRecord.getFieldValue("billingtype") || "";
            targetRecord_billingtype = targetRecord_billingtype ? targetRecord_billingtype.toLowerCase() : "";

            log.debug("targetRecord_billingtype", targetRecord_billingtype);
            if(targetRecord_billingtype == "vendcred")
            {

                var targetRecord_correctiveVra = targetRecord.getFieldValue("custbody_anc_corrective_vra") || "";
                log.debug("targetRecord_correctiveVra", targetRecord_correctiveVra);

                if(targetRecord_correctiveVra == "T")
                {
                    var targetRecord_subsidiary = targetRecord.getFieldValue("subsidiary") || "";
                    //1
                    var subsidiaryRecObj = nlapiLoadRecord("subsidiary", targetRecord_subsidiary);
                    //119 represents = 3107 Accrued Liabilities - Mainsaver & Wrapmation Integration
                    SUBSIDIARY_DEFAULT_VRA_ACCOUNT = Number(subsidiaryRecObj.getFieldValue("custrecord_anc_corrective_vra_account")) || 119;


                    log.debug("DO MAIN LOGIC HERE");

                    log.debug("standardLines", standardLines);
                    for (var i = 0; i < standardLines.getCount(); i++)
                    {
                        var currLine = standardLines.getLine(i);
                        log.debug("currLine", currLine);

                        // var currLine_id = currLine.getId();
                        // var currLine_taxamount = currLine.getTaxAmount();
                        // log.debug("currLine_id", currLine_id);
                        // log.debug("currLine_taxamount", currLine_taxamount);

                        // var currLine_account = currLine.accountId;
                        var currLine_account = currLine.getAccountId();

                        if(currLine_account == ACCOUNT_NUMBER_1502_INTERNALID)
                        {
                            // var currLine_debitamount = currLine.debitAmount;
                            // var currLine_creditamount = currLine.creditAmount;
                            var currLine_debitamount = currLine.getDebitAmount();
                            var currLine_creditamount = currLine.getCreditAmount();

                            log.debug("{currLine_account, SUBSIDIARY_DEFAULT_VRA_ACCOUNT, targetRecord_subsidiary, currLine_debitamount, currLine_creditamount}", {currLine_account:currLine_account, SUBSIDIARY_DEFAULT_VRA_ACCOUNT:SUBSIDIARY_DEFAULT_VRA_ACCOUNT, targetRecord_subsidiary:targetRecord_subsidiary, currLine_debitamount:currLine_debitamount, currLine_creditamount:currLine_creditamount})

                            if(currLine_debitamount > 0)
                            {
                                var newLine = customLines.addNewLine();
                                newLine.setCreditAmount(currLine_debitamount);
                                newLine.setAccountId(currLine_account);
                                // newLine.setAccountId(ACCOUNT_NUMBER_1502_INTERNALID);
                                // newLine.setMemo("Payment catches both revenue and cash.");

                                // TODO setSegmentValueId(segmentId, segmentValueId)

                                //other columns
                                //TODO issue setting entity
                                // try
                                // {
                                //     if(currLine.getEntityId())
                                //     {
                                //         newLine.setEntityId(currLine.getEntityId());
                                //     }
                                // }
                                // catch(e0_1)
                                // {
                                //     log.debug("ERROR setting entity", e0_1)
                                // }
                                if(currLine.getEntityId())
                                {
                                    newLine.setEntityId(currLine.getEntityId());
                                }

                                newLine.setClassId(currLine.getClassId());
                                newLine.setDepartmentId(currLine.getDepartmentId());
                                newLine.setLocationId(currLine.getLocationId());
                                newLine.setMemo(currLine.getMemo());
                                for(var a = 0 ; a < CUSTOM_SEGMENT_COLUMNS_TO_COPY.length ; a++)
                                {
                                    //TODO: try catch block will cause: UNEXPECTED_ERROR --> null; ID: ls1jrgy4sdxp6h2jo6q9 ... ls1k7i2119nricworsd7j ...
                                    // try
                                    // {
                                    //     newLine.setSegmentValueId(CUSTOM_SEGMENT_COLUMNS_TO_COPY[a], currLine.getSegmentValueId(CUSTOM_SEGMENT_COLUMNS_TO_COPY[a]))
                                    // }
                                    // catch(e1)
                                    // {
                                    //     log.debug("ERROR in ANC_handleReturnsGL.js, function customizeGlImpact", e1);
                                    // }
                                    //TODO: no try catch block will complain if it executes as NON-ADMIN role/role does not have permission to set segment
                                    //already tried checking the role, individual segments(market,destination)
                                    // newLine.setSegmentValueId(CUSTOM_SEGMENT_COLUMNS_TO_COPY[a], currLine.getSegmentValueId(CUSTOM_SEGMENT_COLUMNS_TO_COPY[a]))
                                    if(currLine.getSegmentValueId(CUSTOM_SEGMENT_COLUMNS_TO_COPY[a]))
                                    {
                                        newLine.setSegmentValueId(CUSTOM_SEGMENT_COLUMNS_TO_COPY[a], currLine.getSegmentValueId(CUSTOM_SEGMENT_COLUMNS_TO_COPY[a]))
                                    }
                                    if(FORCE_DEFAULT_SEGMENTS && FORCE_DEFAULT_SEGMENTS[CUSTOM_SEGMENT_COLUMNS_TO_COPY[a]])
                                    {
                                        newLine.setSegmentValueId(CUSTOM_SEGMENT_COLUMNS_TO_COPY[a], FORCE_DEFAULT_SEGMENTS[CUSTOM_SEGMENT_COLUMNS_TO_COPY[a]])
                                    }
                                }

                                var newLine = customLines.addNewLine();
                                newLine.setDebitAmount(currLine_debitamount);
                                newLine.setAccountId(SUBSIDIARY_DEFAULT_VRA_ACCOUNT);
                                newLine.setAccountId(SUBSIDIARY_DEFAULT_VRA_ACCOUNT);

                                //other columns
                                //TODO issue setting entity
                                // try
                                // {
                                //     if(currLine.getEntityId())
                                //     {
                                //         newLine.setEntityId(currLine.getEntityId());
                                //     }
                                // }
                                // catch(e0_1)
                                // {
                                //     log.debug("ERROR setting entity", e0_1)
                                // }
                                if(currLine.getEntityId())
                                {
                                    newLine.setEntityId(currLine.getEntityId());
                                }

                                newLine.setClassId(currLine.getClassId());
                                newLine.setDepartmentId(currLine.getDepartmentId());
                                newLine.setLocationId(currLine.getLocationId());
                                newLine.setMemo(currLine.getMemo());


                                for(var a = 0 ; a < CUSTOM_SEGMENT_COLUMNS_TO_COPY.length ; a++)
                                {
                                    //TODO: try catch block will cause: UNEXPECTED_ERROR --> null; ID: ls1jrgy4sdxp6h2jo6q9
                                    // try
                                    // {
                                    //     newLine.setSegmentValueId(CUSTOM_SEGMENT_COLUMNS_TO_COPY[a], currLine.getSegmentValueId(CUSTOM_SEGMENT_COLUMNS_TO_COPY[a]))
                                    // }
                                    // catch(e2)
                                    // {
                                    //     log.debug("ERROR in ANC_handleReturnsGL.js, function customizeGlImpact", e2);
                                    // }
                                    //TODO: no try catch block will complain if it executes as NON-ADMIN role/role does not have permission to set segment
                                    //already tried checking the role, individual segments(market,destination)
                                    // newLine.setSegmentValueId(CUSTOM_SEGMENT_COLUMNS_TO_COPY[a], currLine.getSegmentValueId(CUSTOM_SEGMENT_COLUMNS_TO_COPY[a]))
                                    if(currLine.getSegmentValueId(CUSTOM_SEGMENT_COLUMNS_TO_COPY[a]))
                                    {
                                        newLine.setSegmentValueId(CUSTOM_SEGMENT_COLUMNS_TO_COPY[a], currLine.getSegmentValueId(CUSTOM_SEGMENT_COLUMNS_TO_COPY[a]))
                                    }
                                    if(FORCE_DEFAULT_SEGMENTS && FORCE_DEFAULT_SEGMENTS[CUSTOM_SEGMENT_COLUMNS_TO_COPY[a]])
                                    {
                                        newLine.setSegmentValueId(CUSTOM_SEGMENT_COLUMNS_TO_COPY[a], FORCE_DEFAULT_SEGMENTS[CUSTOM_SEGMENT_COLUMNS_TO_COPY[a]])
                                    }
                                }


                            }
                        }
                    }
                }
            }
        }
    }
    catch(e)
    {
        log.debug("ERROR in ANC_handleReturnsGL.js, function customizeGlImpact", e);
    }
}


function debug(title, details)
{
    var dets = details;
    if((typeof details == 'Object') || (typeof details == 'object'))
    {
        dets = JSON.stringify(details)
    }
    nlapiLogExecution("DEBUG", title, dets);
}
var log = {debug : debug}