/**
 * @fileoverview
 * Version    Date            Author           Remarks
 * 1.00       23 Oct 2018     eli
 *
 * Production: https://system.na2.netsuite.com/app/common/scripting/script.nl?id=494
 *
 **/

var CUSTOM_RECORD = 'customrecord_syncmssuppliers';
var FIELD_SYNC_STATUS = 'custrecord_syncmssupplier_syncstatus';
var FIELD_ERROR_MSG = 'custrecord_syncmssupplier_errmsg';
var FIELD_NS_ID = 'custrecord_syncmssupplier_nsid';

var scheduledSupplierSync = function () {

    try{

        loggerJSON('000 START', '');
        var statusArr = [];
        statusArr[0] = statusList.NEW;
        statusArr[1] = statusList.ERROR;
        statusArr[2] = statusList.TO_REPROCESS;

        var supplierForSync = getSupplierRecords(statusArr);

        if(!isBlank(supplierForSync)){
            for(var i in supplierForSync){
                var supplierRecord = supplierForSync[i];
                loggerJSON('001 SUPPLIER DATA', JSON.stringify(supplierRecord));
                var vendorId = createSupplierRecord(supplierRecord);
                loggerJSON('888 VENDOR ID','https://system.na2.netsuite.com/app/common/entity/vendor.nl?id=' + vendorId);
                if(!isBlank(vendorId)){
                    var contactId = createContactRecord(supplierRecord, vendorId);
                    loggerJSON('888 CONTACT ID','https://system.na2.netsuite.com/app/common/entity/contact.nl?id=' + contactId);
                }
            }
        }

        loggerJSON('9999 END', '');

    }
    catch(ex){
            nlapiLogExecution('ERROR', ex instanceof nlobjError ? ex.getCode() : 'CUSTOM_ERROR_CODE', ex instanceof nlobjError ? ex.getDetails() : 'JavaScript Error: ' + (ex.message !== null ? ex.message : ex));
    }

}

//region FUNCTIONS

var createSupplierRecord = function (supplier) {

    var syncId = supplier.syncId;

    var id = '';
    var create = nlapiCreateRecord('vendor');
    create.setFieldValue('subsidiary', subsidiaryList.ALBERTA_NEWSPRINT_COMPANY);

    //Main Fields
    for(var key in mappingSupplierMainField){
        if (mappingSupplierMainField.hasOwnProperty(key)){
            if(!isBlank(mappingSupplierMainField[key])){
                create.setFieldValue(mappingSupplierMainField[key], supplier[mappingSupplierMainField[key]]);
            }
        }
    }

    //Address Fields
    for(var key in mappingSupplierAddressField){
        if (mappingSupplierAddressField.hasOwnProperty(key)){
            if(!isBlank(mappingSupplierAddressField[key])){
                create.setLineItemValue('addressbook', mappingSupplierAddressField[key], 1, supplier[mappingSupplierAddressField[key]]);
            }
        }
    }
    try {
        id = nlapiSubmitRecord(create);
        nlapiSubmitField(CUSTOM_RECORD, syncId, FIELD_SYNC_STATUS, statusList.COMPLETE);
        nlapiSubmitField(CUSTOM_RECORD, syncId, FIELD_ERROR_MSG, '');
        nlapiSubmitField(CUSTOM_RECORD, syncId, FIELD_NS_ID, id);
    }
    catch(ex){
        var error = ex.getDetails();
        nlapiSubmitField(CUSTOM_RECORD, syncId, FIELD_SYNC_STATUS, statusList.ERROR);
        nlapiSubmitField(CUSTOM_RECORD, syncId, FIELD_ERROR_MSG, error);
    }
    return id;
};

var createContactRecord = function (supplier, vendorId) {

    var syncId = supplier.syncId;

    var id = '';

    var contact = nlapiCreateRecord('contact');
    contact.setFieldValue('subsidiary', subsidiaryList.ALBERTA_NEWSPRINT_COMPANY);

    for(var key in mappingSupplierContactField){
        if (mappingSupplierContactField.hasOwnProperty(key)){
            if(!isBlank(mappingSupplierContactField[key])){
                contact.setFieldValue(mappingSupplierContactField[key], supplier[mappingSupplierContactField[key]]);
            }
        }
    }

    try {
        id = nlapiSubmitRecord(contact);

        if(!isBlank(id)) {
            nlapiAttachRecord('contact', id, 'vendor', vendorId);
        }
        nlapiSubmitField(CUSTOM_RECORD, syncId, FIELD_SYNC_STATUS, statusList.COMPLETE);
        nlapiSubmitField(CUSTOM_RECORD, syncId, FIELD_ERROR_MSG, '');
    }
    catch(ex){
        var error = ex.getDetails();
        nlapiSubmitField(CUSTOM_RECORD, syncId, FIELD_SYNC_STATUS, statusList.ERROR);
        nlapiSubmitField(CUSTOM_RECORD, syncId, FIELD_ERROR_MSG, error);
    }
    return id;
};


/**
 * Get all Suppliers Ready for Sync
 * @param statusArr
 * @return {Array}
 */
var getSupplierRecords = function (statusArr) {

    var supplierArr = [];
    var search = nlapiSearchRecord('customrecord_syncmssuppliers',null,
        [
            ['custrecord_syncmssupplier_syncstatus','anyof', statusArr]
        ],
        [
            new nlobjSearchColumn('name').setSort(false),
            new nlobjSearchColumn('scriptid'),
            new nlobjSearchColumn('custrecord_syncmssupplier_syncstatus'),
            new nlobjSearchColumn('custrecord_syncmssupplier_errmsg'),
            new nlobjSearchColumn('custrecord_syncmssupplier_msid'),
            new nlobjSearchColumn('custrecord_syncmssupplier_nsid'),
            new nlobjSearchColumn('custrecord_syncmssupp_sisuintfrefid'),
            new nlobjSearchColumn('custrecord_syncmssupp_xntype'),
            new nlobjSearchColumn('custrecord_syncmssupp_supplier'),
            new nlobjSearchColumn('custrecord_syncmssupp_status'),
            new nlobjSearchColumn('custrecord_syncmssupp_company'),
            new nlobjSearchColumn('custrecord_syncmssupp_contact'),
            new nlobjSearchColumn('custrecord_syncmssupp_phone'),
            new nlobjSearchColumn('custrecord_syncmssupp_faxphone'),
            new nlobjSearchColumn('custrecord_syncmssupp_address1'),
            new nlobjSearchColumn('custrecord_syncmssupp_address2'),
            new nlobjSearchColumn('custrecord_syncmssupp_city'),
            new nlobjSearchColumn('custrecord_syncmssupp_state'),
            new nlobjSearchColumn('custrecord_syncmssupp_postalcode'),
            new nlobjSearchColumn('custrecord_syncmssupp_province'),
            new nlobjSearchColumn('custrecord_syncmssupp_country'),
            new nlobjSearchColumn('custrecord_syncmssupp_email'),
            new nlobjSearchColumn('custrecord_syncmssupp_buyer'),
            new nlobjSearchColumn('custrecord_syncmssupp_terms'),
            new nlobjSearchColumn('custrecord_syncmssupp_fob'),
            new nlobjSearchColumn('custrecord_syncmssupp_shipvia'),
            new nlobjSearchColumn('custrecord_syncmssupp_taxrate')
        ]
    );

    if(!isBlank(search)){
        for (var i = 0; i < search.length; i++) {

            var syncId = search[i].getId();
            var syncStatus = search[i].getValue('custrecord_syncmssupplier_syncstatus');
            var errorMsg = search[i].getValue('custrecord_syncmssupplier_errmsg');

            var sisuintfrefid = search[i].getValue('custrecord_syncmssupp_sisuintfrefid');
            var xntype = search[i].getValue('custrecord_syncmssupp_xntype');
            var supplier = search[i].getValue('custrecord_syncmssupp_supplier');
            var status = search[i].getValue('custrecord_syncmssupp_status');
            var companyname = search[i].getValue('custrecord_syncmssupp_company');
            var entityid = search[i].getValue('custrecord_syncmssupp_contact');
            var phone = search[i].getValue('custrecord_syncmssupp_phone');
            var fax = search[i].getValue('custrecord_syncmssupp_faxphone');
            var addr1 = search[i].getValue('custrecord_syncmssupp_address1');
            var addr2 = search[i].getValue('custrecord_syncmssupp_address2');
            var city = search[i].getValue('custrecord_syncmssupp_city');
            var state = search[i].getValue('custrecord_syncmssupp_state');
            var zip = search[i].getValue('custrecord_syncmssupp_postalcode');
            var state = search[i].getValue('custrecord_syncmssupp_province');
            var country = search[i].getValue('custrecord_syncmssupp_country');
            var email = search[i].getValue('custrecord_syncmssupp_email');
            var buyer = search[i].getValue('custrecord_syncmssupp_buyer');
            var terms = search[i].getValue('custrecord_syncmssupp_terms');
            var fob = search[i].getValue('custrecord_syncmssupp_fob');
            var shipvia = search[i].getValue('custrecord_syncmssupp_shipvia');
            var taxrate = search[i].getValue('custrecord_syncmssupp_taxrate');

            supplierArr.push({
                'syncId' : syncId,
                'syncStatus' : syncStatus,
                'errorMsg' : errorMsg,
                'sisuintfrefid' : sisuintfrefid,
                'xntype' : xntype,
                'supplier' : supplier,
                'status' : status,
                'companyname' : companyname,
                'entityid' : entityid,
                'phone' : phone,
                'fax' : fax,
                'addr1' : addr1,
                'addr2' : addr2,
                'city' : city,
                'state' : state,
                'zip' : zip,
                'state' : state,
                'country' : country,
                'email' : email,
                'buyer' : buyer,
                'terms' : terms,
                'fob' : fob,
                'shipvia' : fob,
                'taxrate' : taxrate
            });
        }
    }

    return supplierArr;

};

//endregion FUNCTIONS

//region LIST

var mappingSupplierMainField = {
    'company' : 'companyname',
    'fob' : '',
    'shipvia' : '',
    'taxrate' : '',
    'sisuintfrefid' : '',
    'xntype' : '',
    'supplier' : '',
    'buyer' : '',
    'terms' : ''
};

var mappingSupplierAddressField = {
    'phone' : 'phone',
    'addr1' : 'addr1',
    'addr2' : 'addr2',
    'city' : 'city',
    'state' : 'state',
    'zip' : 'zip',
    'province' : 'state',
    'country' : 'country'
};

var mappingSupplierContactField = {
    'entityid' : 'entityid',
    'phone' : 'phone',
    'fax' : 'fax',
    'email' : 'email'
};

//endregion LIST