/**
 * @fileoverview
 * Version    Date            Author           Remarks
 * 1.00       11 Nov 2018     eli@        Initial version.
 *
 **/

/**
 * The recordType (internal id) corresponds to the "Applied To" record in your script deployment.
 * @appliedtorecord recordType
 *
 * @param {String} type Operation types: create, edit, delete, xedit,
 *                      approve, cancel, reject (SO, ER, Time Bill, PO & RMA only)
 *                      pack, ship (IF only)
 *                      dropship, specialorder, orderitems (PO only)
 *                      paybills (vendor payments)
 * @returns {Void}
 */
function userEventAfterSubmit(type){
    try {
        if(type == 'create' || type == 'edit'){

            var modify = false;
            var load = nlapiLoadRecord(nlapiGetRecordType(), nlapiGetRecordId());
            var stockLocn = load.getFieldValue('custrecord_syncmspo_linestklocn');
            var stockNo = load.getFieldValue('custrecord_syncmspo_linemkey');
            var chargeAcct = load.getFieldValue('custrecord_syncmspo_linechgaccount');

            var currItem = load.getFieldValue('custrecord_syncmspo_item_link');
            var currSupplier = load.getFieldValue('custrecord_syncmspo_vendor_id');

            var validSupplier = validateSupplier(load.getFieldValue('custrecord_syncmspo_supplier'));
            if(!isBlank(validSupplier)){
                if(validSupplier != currSupplier) {
                    load.setFieldValue('custrecord_syncmspo_vendor_id', validSupplier);
                    modify = true;
                }
            }

            var itemId = validateItem(stockLocn, stockNo, chargeAcct);
            if(!isBlank(itemId)){
                if(itemId != currItem) {
                    load.setFieldValue('custrecord_syncmspo_item_link', itemId);
                    modify = true;
                }
            }

            if(modify){
                nlapiSubmitRecord(load);
            }
        }
    }
    catch(ex)
    {
        nlapiLogExecution('ERROR', ex instanceof nlobjError ? ex.getCode() : 'CUSTOM_ERROR_CODE', ex instanceof nlobjError ? ex.getDetails() : 'JavaScript Error: ' + (ex.message !== null ? ex.message : ex));
    }
}


function validateItem(stockLocn, stockNo, chargeAcct) {
    var type = '';
    var itemColumns = [];
    var item = '';
    itemColumns[0] = new nlobjSearchColumn('internalid');
    if ((stockLocn.substr(0,3) == 'NS-' && stockLocn.substr(0,7) != 'NS-CHEM') || stockLocn.substr(0,3) == 'FI-') {
        type = 'noninventoryitem';
        var itemFilters = [['custitem_msid','is',chargeAcct]];
        item = chargeAcct;
    } else {
        type = 'inventoryitem';
        var itemFilters = [['custitem_msid','is',stockNo]];
        item = stockNo;
    }
    var itemResults = nlapiSearchRecord(type,null,itemFilters,itemColumns);
    if (itemResults) {
        return itemResults[0].getValue('internalid');
    } else {
        throw nlapiCreateError('error','Unable to find matching item record for item type '+type+' and MS ID: '+item);
    }
}

function validateSupplier(supplierKey) {
    var filters = [['custentity_msid','is',supplierKey]];
    var columns = [];
    columns[0] = new nlobjSearchColumn('internalid');
    var searchResults = nlapiSearchRecord('vendor',null,filters,columns);

    if (searchResults) {
        return searchResults[0].getValue('internalid');
    } else {
        throw nlapiCreateError('error','Unable to find Mainsaver Supplier for Supplier Key '+supplierKey);
    }
}

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
