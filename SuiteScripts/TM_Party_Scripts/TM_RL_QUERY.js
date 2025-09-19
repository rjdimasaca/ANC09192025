/**
 * TM_RL_QUERY – build-only query endpoint (no push to TRAQ)
 *
 * @NApiVersion 2.1
 * @NScriptType Restlet
 *
 * GET examples:
 *   ?entityType=CUSTOMER&id=507408
 *   ?entityType=CONSIGNEE&id=1421
 *   ?entityType=CUSTOMER_CONSIGNEES&id=507408
 *   ?entityType=CONSIGNEE_ADDRESSES&id=1
 *   ?entityType=ADDRESS_CONSIGNEE&id=3
 */
define(['./TMIntegrationLib','N/search','N/record','N/log'], function (tm, search, record, log) {

  function _err(msg){ return { ok:false, message:msg }; }

  function _isSingle(entityType){
    return (
      entityType === 'CUSTOMER' ||
      entityType === 'CONSIGNEE' ||
      entityType === 'CARRIER' ||
      entityType === 'SHIPPER' ||
      entityType === 'CONSIGNEE_SHIP_ADDRESS' ||
      entityType === 'SO'
    );
  }

  function _isMulti(entityType){
    return (
      entityType === 'CUSTOMER_CONSIGNEES' ||
      entityType === 'CONSIGNEE_CUSTOMERS' ||
      entityType === 'CONSIGNEE_ADDRESSES' ||
      entityType === 'ADDRESS_CONSIGNEE'
    );
  }

  /*─────────────────────────────────────────────────────────────────────*/
  /* RESTlet entrypoints                                                  */
  /*─────────────────────────────────────────────────────────────────────*/

  function get(params){
    var entityType = (params.entityType||'').toUpperCase();
    var id   = params.id;
    if (!entityType || !id) return _err('Missing ?entityType= and/or ?id=');

    if (_isMulti(entityType)) return _doMulti(entityType, id);
    if (_isSingle(entityType)) return _doSingle(entityType, id);
    return _err('Unsupported entityType: ' + entityType);
  }

  function post(body){
    var entityType = (body.entityType||'').toUpperCase();
    var id   = body.id;
    if (!entityType || !id) return _err('Body must include entityType & id');

    if (_isMulti(entityType)) return _doMulti(entityType, id);
    if (_isSingle(entityType)) return _doSingle(entityType, id);
    return _err('Unsupported entityType: ' + entityType);
  }

  /*─────────────────────────────────────────────────────────────────────*/
  /* dispatchers                                                          */
  /*─────────────────────────────────────────────────────────────────────*/

  function _doSingle(entityType, id){
    try {
      var payload = tm.build(entityType, id);
      return payload;
    } catch(e){
      log.error('Build failed', {entityType:entityType, id:id, err:e.message, stack:e.stack});
      return _err(e.message || 'Build failed');
    }
  }

  function _doMulti(entityType, id){
    try {
      if (entityType==='CUSTOMER_CONSIGNEES') return _getConsigneesForCustomer(id);
      if (entityType==='CONSIGNEE_CUSTOMERS') return _getCustomersForConsignee(id);
      if (entityType==='CONSIGNEE_ADDRESSES') return _getAddressesForConsignee(id);
      if (entityType==='ADDRESS_CONSIGNEE')   return _getConsigneeForAddress(id);
      return _err('Unsupported multi entityType: '+entityType);
    } catch(e){
      log.error('Multi failed', {entityType:entityType, id:id, err:e.message, stack:e.stack});
      return _err(e.message || 'Multi failed');
    }
  }

  /*─────────────────────────────────────────────────────────────────────*/
  /* multi-entity helpers (INPUTS USE INTERNALID ONLY)                    */
  /*─────────────────────────────────────────────────────────────────────*/

  // Input: native Customer internalid
  function _getConsigneesForCustomer(customerId){
    var custInternalId = customerId;
    var keys = [];
    search.create({
      type:'customrecord_alberta_ns_consignee_record',
      filters:[['custrecord_alberta_ns_customer','anyof',custInternalId]],
      columns:['custrecord_alberta_ns_consigneekey']
    }).run().each(function(r){
      var k = r.getValue('custrecord_alberta_ns_consigneekey');
      if (k && keys.indexOf(k)<0) keys.push(k);
      return true;
    });

    var items = [];
    keys.forEach(function(k){
      try {
        // Map from business key → internalid for related record
        var consInternal = _resolveConsigneeInternalId(k);
        items.push(tm.build('CONSIGNEE', consInternal));
      } catch(e){}
    });
    return items;
  }

  // Input: native Consignee internalid
  function _getCustomersForConsignee(consigneeId){
    var consInternalId = consigneeId;
    // first get the consignee key so we can hit the mapping record
    var consKey = search.lookupFields({
      type:'customrecord_anc_consigneemaster',
      id:consInternalId,
      columns:['custrecord_anc_consignee_key']
    }).custrecord_anc_consignee_key;

    var custIds = [];
    search.create({
      type:'customrecord_alberta_ns_consignee_record',
      filters:[['custrecord_alberta_ns_consigneekey','is',consKey]],
      columns:['custrecord_alberta_ns_customer']
    }).run().each(function(r){
      var id = r.getValue('custrecord_alberta_ns_customer');
      if (id && custIds.indexOf(id)<0) custIds.push(id);
      return true;
    });

    var items = [];
    custIds.forEach(function(custId){
      try {
        items.push(tm.build('CUSTOMER', custId));
      } catch(e){}
    });
    return items;
  }

  // Input: native Consignee internalid
  function _getAddressesForConsignee(consigneeId){
    var consInternalId = consigneeId;
    var addrIds = [];
    search.create({
      type:'customrecord_anc_consigneealtaddress',
      filters:[['custrecord_anc_consaltadr_consignee','anyof',consInternalId]],
      columns:['internalid']
    }).run().each(function(r){
      addrIds.push(r.getValue('internalid'));
      return true;
    });

    var items = [];
    addrIds.forEach(function(addrId){
      try {
        items.push(tm.build('CONSIGNEE_SHIP_ADDRESS', addrId));
      } catch(e){}
    });
    return items;
  }

  // Input: native Consignee-Alt-Address internalid
  function _getConsigneeForAddress(addrId){
    var items = [];
    try {
      var addrPayload = tm.build('CONSIGNEE_SHIP_ADDRESS', addrId);
    } catch(e){}
    return addrPayload;
  }

  /*─────────────────────────────────────────────────────────────────────*/
  /* legacy resolver (used only for internal mapping, not for input)     */
  /*─────────────────────────────────────────────────────────────────────*/

  /* resolve Consignee internalid from internalid or consignee_key */
  function _resolveConsigneeInternalId(idOrKey){
    var v = (idOrKey==null?'':String(idOrKey).trim());
    if (!v) throw Error('No Consignee id supplied.');

    if (/^\d+$/.test(v)){
      try { record.load({type:'customrecord_anc_consigneemaster',id:v}); return v; } catch(e){}
    }
    var found = null;
    search.create({
      type:'customrecord_anc_consigneemaster',
      filters:[["custrecord_anc_consignee_key","is",v]],
      columns:['internalid']
    }).run().each(function(r){
      found = r.getValue('internalid'); return false;
    });

    if (!found) throw Error('Consignee not found by key: '+v);
    return found;
  }

  return { get:get, post:post };
});
