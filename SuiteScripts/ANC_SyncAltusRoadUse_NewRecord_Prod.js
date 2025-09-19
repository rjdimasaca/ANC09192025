/* @User Event Script on User Event: Commit

Calls next available scheduled script deployment to process SyncAltusLandUse Records

Production: https://system.na2.netsuite.com/app/common/scripting/script.nl?id=492

*/

function ScheduleSyncAltusRoadUse(type,form) {

	if(type == "delete")
	{
		return;
	}
    var script_id = 'customscript_sched_syncaltusru';
    var syncAltusRoadUseID = nlapiGetRecordId();
    var syncAltusRoadUseRecord = nlapiLoadRecord('customrecord_syncaltusru',syncAltusRoadUseID);
    var Status = syncAltusRoadUseRecord.getFieldValue('custrecord_syncaltusru_syncstatus');
    var Retries = -1;

    if (type == 'create' || (type == 'edit' && Status == syncStatus.TO_REPROCESS)) { //Record is new or is for reprocessing

        Retries = syncAltusRoadUseRecord.getFieldValue('custrecord_syncaltusru_retries');

        if (Status == syncStatus.NEW || Status == syncStatus.TO_REPROCESS || (Status == syncStatus.ERROR)) {

            var params = {
                'custscript_syncaltusroaduseid':syncAltusRoadUseID
            };

            nlapiLogExecution('DEBUG','001 Scheduling SyncAltusRoadUse','Schedule SyncAltusRoadUse is being called on record '+ syncAltusRoadUseID);

            var ScheduleStatus = nlapiScheduleScript(script_id,null,params); //Deployment is empty so that script selects first available deployment

            nlapiLogExecution('DEBUG','002 Scheduling SyncAltusRoadUse','Schedule Status is '+ScheduleStatus);

            while(ScheduleStatus != 'QUEUED')
            {
            	nlapiLogExecution("DEBUG", "nlapiGetContext().getRemainingUsage()", nlapiGetContext().getRemainingUsage())
            	if(Number(nlapiGetContext().getRemainingUsage()) < 100)
            	{
            		nlapiSubmitField('customrecord_syncaltusru',syncAltusRoadUseID,['custrecord_syncaltusru_syncstatus', 'custrecord_syncaltusru_errmsg'],[syncStatus.TO_REPROCESS, "FAILED TO PROCESS DUE TO GOVERNANCE LIMIT"]);
            		break;
            	}
            	ScheduleStatus = nlapiScheduleScript(script_id,null,params); //Deployment is empty so that script selects first available deployment
            }
            
            if(ScheduleStatus == 'QUEUED') {
                nlapiSubmitField('customrecord_syncaltusru',syncAltusRoadUseID,'custrecord_syncaltusru_syncstatus',syncStatus.QUEUED);
            } //else record will wait to be picked up at end of previously running scheduled script
            
        }
    } else {
        //else skip execution - record is not for processing
        nlapiLogExecution('DEBUG','003 Scheduling SyncAltusRoadUse','Not queued. Type is '+type+', Status is '+Status+', Retries is '+Retries);
    }
}

var syncStatus = {
    'NEW' : '1',
    'PROCESSING' : '2',
    'ERROR' : '3',
    'COMPLETE' : '4',
    'TO_REPROCESS' : '5',
    'QUEUED' : '6',
    'DUPLICATE' : '7'
}