//region COMMON FUNCTIONS
/**
 * @param {string} test input the string to look for space characters
 * @return {boolean}
 */
function isBlank(test) {
    if ((test == '') || (test == null) || (test == undefined) ||
        (test.toString().charCodeAt() == 32)) {
        return true;
    } else {
        return false;
    }
}

/**
 * @param {string} msg message title
 * @param {string} str debug message
 */
var loggerJSON = function(msg, str) {
    var d = nlapiDateToString(new Date(), 'datetimetz');
    var sequenceNum = '';
    if (!isBlank(str)) {
        if (str.length > 4000) {
            var arrStr = str.match(/.{1,4000}/g);
            for (var i in arrStr) {
                sequenceNum = 'Datetime: ' + d + ' | ' + (parseInt(i) + 1) + ' of ' +
                    arrStr.length;
                nlapiLogExecution('DEBUG', msg + ' | ' + sequenceNum, arrStr[i]);
            }
        } else {
            sequenceNum = 'Datetime: ' + d;
            nlapiLogExecution('DEBUG', msg + ' | ' + sequenceNum, str);
        }
    }
};
//endregion COMMON FUNCTIONS


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

var subsidiaryList = {
    'ALBERTA_NEWSPRINT_COMPANY' : '1'
}

//endregion LIST