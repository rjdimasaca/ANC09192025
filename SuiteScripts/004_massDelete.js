function DeleteRecord(record_type, record_id) {
    try {
        nlapiLogExecution('DEBUG', 'DELETING', 'Record type: ' + record_type + '. Internal id: ' + record_id);
        nlapiDeleteRecord(record_type, record_id);
        nlapiLogExecution('DEBUG', 'SUCCESS DELETING', 'Record type: ' + record_type + '. Internal id: ' + record_id)
    } catch (e) {
        nlapiLogExecution('ERROR', 'Error deleting record', 'Record type: ' + record_type + '. Internal id: ' + record_id + '. Details: ' + e.message);
    }
}