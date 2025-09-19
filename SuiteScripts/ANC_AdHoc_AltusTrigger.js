function adHocAltus(request,response){
    if (request.getMethod() == 'GET'){
        var form = nlapiCreateForm('Execute Altus Job');
        form.setScript('customscript_cl_anc_adhoc_execution_ui');
        var selectAltus = form.addField('custpage_altus_select','select','Select Altus Job');
        selectAltus.addSelectOption(0,'-Select-');
        selectAltus.addSelectOption(1,'Altus Road Use');
        selectAltus.addSelectOption(2,'Altus Land Use');
        form.addSubmitButton('Execute');
        response.writePage(form);
    }
    else{

        var selectedAltusJob = request.getParameter('custpage_altus_select');

        var form = nlapiCreateForm('Execute Altus Job');
        var msg = form.addField('custpage_message', 'text', '');
        msg.setDisplayType('inline');

        if(selectedAltusJob == '1'){

            var status = nlapiScheduleScript('customscript_sched_syncaltusru', 'customdeploy_sched_syncaltusru');
            if (status == 'QUEUED'){
            }
            msg.setDefaultValue('Altus Road Use Job is now running.')
        }
        else if(selectedAltusJob == '2'){

            var status = nlapiScheduleScript('customscript_sched_syncaltuslanduse', 'customdeploy_sched_syncaltuslandus');
            if (status == 'QUEUED'){
            }
            msg.setDefaultValue('Altus Land Use Job is now running.')
        }

        response.writePage(form);
    }
}

function runAltusRoadUse() {
    /**
    var status = nlapiScheduleScript('customscript_sched_syncaltusru', 'customdeploy_sched_syncaltusru');
    if (status == 'QUEUED'){

    }
     **/
    alert('Road Use');
    nlapiSetRedirectURL('RECORD', 'customrecord_syncaltusru');

}

function runAltusLandUse(){
    //nlapiScheduleScript('customscript_sched_syncaltuslanduse', 'customdeploy_sched_syncaltuslandus');
    alert('Land Use');
    nlapiSetRedirectURL('RECORD', 'customrecord_syncaltuslu');
}