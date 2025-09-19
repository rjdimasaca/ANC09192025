/* @User Event Script on User Event: Commit
*	Calls next available scheduled script deployment to process SyncWMInventory Records
*
*	Name                                        Environment     Script ID                  Link
*	ANC_SyncMSInventoryTransaction_Scheduled    SB              customscript499            https://system.netsuite.com/app/common/scripting/script.nl?id=499
*
*/

function SyncMSInventoryTransaction(type, form) {

    var RECORD_TYPE = 'customrecord_syncmsinvtrans';
    var F = {
        'SYNC_STATUS' : 'custrecord_syncmsinvtxn_syncstatus',
        'RETRIES' : 'custrecord_syncmsinvtxn_retries'
    }

    var script_id = 549;//499;
    var syncWMID = nlapiGetRecordId();
    var syncWMRecord = nlapiLoadRecord(RECORD_TYPE, syncWMID);
    var Status = syncWMRecord.getFieldValue(F.SYNC_STATUS);
    var Retries = -1;
  
  nlapiLogExecution('debug',syncWMID,syncWMRecord.getFieldValue('custrecord_syncmsinvtxn_retries'));

    if (type == 'create' || (type == 'edit' && Status == statusList.TO_REPROCESS)) { //Record is new or is for reprocessing

        Retries = syncWMRecord.getFieldValue(F.RETRIES);

        if (Status == statusList.NEW || Status == statusList.TO_REPROCESS || (Status == statusList.ERROR && Retries > 0)) {

            var params = {
                'custscript_newsyncmsinvtxn' : syncWMID
            };

            nlapiLogExecution('DEBUG','Scheduling SyncMSInventoryTransaction','Schedule SyncMSInventoryTransaction is being called on record ' + syncWMID);

            var ScheduleStatus = nlapiScheduleScript(script_id, null, params); //Deployment is empty so that script selects first available deployment

            nlapiLogExecution('DEBUG','Scheduling SyncMSInventoryTransaction','Schedule Status is '+ScheduleStatus);

            if(ScheduleStatus == 'QUEUED') {
                nlapiSubmitField(RECORD_TYPE, syncWMID, F.SYNC_STATUS, statusList.QUEUED);
            } //else record will wait to be picked up at end of previously running scheduled script

        }
    } else {
        //else skip execution - record is not for processing
        nlapiLogExecution('DEBUG','Scheduling SyncMSInventoryTransaction','Not queued. Type is '+type+', Status is '+Status+', Retries is '+Retries);
    }
}

//region LIST

var statusList = {
    'NEW' : '1',
    'PROCESSING' : '2',
    'ERROR' : '3',
    'COMPLETE' : '4',
    'TO_REPROCESS' : '5',
    'QUEUED' : '6',
    'DUPLICATE' : '7'
};

//endregion LIST