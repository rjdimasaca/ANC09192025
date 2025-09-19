/* @User Event Script on User Event: Commit

Calls next available scheduled script deployment to process SyncAltusLandUse Records

Production: https://system.na2.netsuite.com/app/common/scripting/script.nl?id=490

*/

/**
 * @dev_version 1.0.1 - looped schedule script invocation because, calling the same scheduled script whilst running will return scheduled script stauts as null
 */


function ScheduleSyncAltusLandUse(type,form) {

	if(type == "delete")
	{
		return;
	}
    var script_id = 'customscript_sched_syncaltuslanduse';
  	var deployment_id = 'customdeploy_ue_syncaltuslanduse';
    var syncWMID = nlapiGetRecordId();
    var syncWMRecord = nlapiLoadRecord('customrecord_syncaltuslu',syncWMID);
    var Status = syncWMRecord.getFieldValue('custrecord_syncaltuslu_syncstatus');
    var Retries = -1;

    nlapiLogExecution("DEBUG", "type", type)
    if (type == 'create' || (type == 'edit' && Status == syncStatus.TO_REPROCESS)) { //Record is new or is for reprocessing

        Retries = syncWMRecord.getFieldValue('custrecord_syncaltuslu_retries');

        if (Status == syncStatus.NEW || Status == syncStatus.TO_REPROCESS || (Status == syncStatus.ERROR)) {

            var params = {
                'custscript_syncaltuslanduseid':syncWMID
            };

            nlapiLogExecution('DEBUG','001 Scheduling SyncAltusLandUse','Schedule SyncAltusLandUse is being called on record '+ syncWMID);

            var ScheduleStatus = nlapiScheduleScript(script_id,null,params); //Deployment is empty so that script selects first available deployment

            while(ScheduleStatus != 'QUEUED')
            {
            	nlapiLogExecution("DEBUG", "nlapiGetContext().getRemainingUsage()", nlapiGetContext().getRemainingUsage())
            	if(Number(nlapiGetContext().getRemainingUsage()) < 100)
            	{
            		nlapiSubmitField('customrecord_syncaltuslu',syncWMID,['custrecord_syncaltuslu_syncstatus', 'custrecord_syncaltuslu_errmsg'],[syncStatus.TO_REPROCESS, "FAILED TO PROCESS DUE TO GOVERNANCE LIMIT"]);
            		break;
            	}
            	ScheduleStatus = nlapiScheduleScript(script_id,null,params); //Deployment is empty so that script selects first available deployment
            }
            
            nlapiLogExecution('DEBUG','002 Scheduling SyncAltusLandUse','Schedule Status is '+ScheduleStatus);

            if(ScheduleStatus == 'QUEUED') {
                nlapiSubmitField('customrecord_syncaltuslu',syncWMID,'custrecord_syncaltuslu_syncstatus',syncStatus.QUEUED);
            } //else record will wait to be picked up at end of previously running scheduled script

        }
    } else {
        //else skip execution - record is not for processing
        nlapiLogExecution('DEBUG','003 Scheduling SyncAltusLandUse','Not queued. Type is '+type+', Status is '+Status+', Retries is '+Retries);
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