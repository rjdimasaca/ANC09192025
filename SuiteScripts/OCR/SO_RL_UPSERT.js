/**
 * @NApiVersion 2.1
 * @NScriptType Restlet
 * @NModuleScope SameAccount
 *
 * Title: ANC — Sales Order Creator (from OCR payload)
 * Purpose: Accept OCR-parsed PO JSON, resolve consignee + customer, and create a Sales Order.
 *
 * Behavior:
 * - Wraps everything in try/catch and returns a detailed JSON result or error.
 * - Consignee resolution per spec (tokenize BuyerCompany, filter by name+city, then disambiguate via address sublist).
 * - Customer Consignee resolution from customrecord_alberta_ns_consignee_record.
 * - Creates SO: entity, custbody_consignee, otherrefnum, custbody_anc_consignee_ordrefnum, custbody_anc_ordertype=7.
 * - Adds item lines by SKU (itemid), sets custcol_anc_ordered_weight (MT), custcol_anc_orderweight (adjusted kg), rate=1,
 *   custcol_anc_deliverydate, calculates line quantity = floor((ordered_MT*1000) / custitem_weight_of_sku_kg) rolls,
 *   sets custcol_anc_numofpacks = floor(quantity / custitem_roll_rpp).
 *
 * Notes on payload shape (from app schema): expects keys BuyerPO#, DateRequired, Revision, TransportMode, itemLines, BuyerCompany, ShipTo, etc.
 */

define(['N/log', 'N/error', 'N/record', 'N/search', 'N/runtime', 'N/format'], (
  log,
  error,
  record,
  search,
  runtime,
  format
) => {
  // ---------- Constants / Field IDs ----------
  const CONSIGNEE_MASTER = 'customrecord_anc_consigneemaster';
  const CONSIGNEE_ADDR_SUBLIST = 'recmachcustrecord_anc_consaltadr_consignee';
  const CONSIGNEE_ADDR_ADDR1 = 'custrecord_anc_conmaster_addr_addr1';
  const CONSIGNEE_ADDR_CITY  = 'custrecord_anc_conmaster_addr_city';
  const CONSIGNEE_ADDR_ZIP   = 'custrecord_anc_conmaster_addr_zip';

  const CUSTOMER_CONSIGNEE_REC = 'customrecord_alberta_ns_consignee_record';
  const F_CUSTCON_CONSIGNEE = 'custrecord_anc_custcons_consignee'; // -> Consignee master (list)
  const F_CUSTCON_CUSTOMER  = 'custrecord_alberta_ns_customer';    // -> Customer (entity)

  const SO_BODY_CONSIGNEE = 'custbody_consignee';
  const SO_BODY_CONSIGNEE_REFNUM = 'custbody_anc_consignee_ordrefnum';
  const SO_BODY_ORDERTYPE = 'custbody_anc_ordertype';

  const ITEM_SUBLIST = 'item';
  const ITEM_COL_ORDERED_WEIGHT_MT = 'custcol_anc_ordered_weight';    // MT ordered by customer
  const ITEM_COL_ADJ_WEIGHT_KG    = 'custcol_anc_orderweight';        // adjusted KG after rounding rolls
  const ITEM_COL_DELIVERY_DATE    = 'custcol_anc_deliverydate';
  const ITEM_COL_NUM_PACKS        = 'custcol_anc_numofpacks';

  // Item fields (on item record)
  const ITEM_FIELD_WEIGHT_KG = 'custitem_weight_of_sku'; // kg per single roll
  const ITEM_FIELD_RPP       = 'custitem_roll_rpp';      // rolls per pack

  // ---------- Helpers ----------
  function parseBody(body) {
    if (body == null) return {};
    if (typeof body === 'string') {
      try { return JSON.parse(body); } catch (e) {
        throw error.create({ name: 'INVALID_JSON', message: 'Body is not valid JSON: ' + e.message });
      }
    }
    return body; // already object
  }

  function onlyLettersToTokens(name) {
    const cleaned = String(name || '').replace(/[^A-Za-z]+/g, ' ').trim();
    if (!cleaned) return [];
    const parts = cleaned.split(/\s+/).filter(Boolean);
    return parts.slice(0, 2); // at most 2
  }

  function firstAddress(payload) {
    const ship = Array.isArray(payload.ShipTo) && payload.ShipTo.length ? payload.ShipTo[0] : null;
    if (!ship) return { city: '', zip: '', line1: '' };
    const line1 = (Array.isArray(ship.AddressLines) && ship.AddressLines[0] && ship.AddressLines[0].AddressLine) || '';
    return {
      city: String(ship.ShipToCity || ''),
      zip: String(ship.ShipToZipCode || ''),
      line1: String(line1 || '')
    };
  }

  function addressToken(addrLine1) {
    const cleaned = String(addrLine1 || '').trim();
    if (!cleaned) return '';
    const first = cleaned.split(/\s+/)[0];
    return first || '';
  }

  function toLower(s) { return String(s || '').toLowerCase(); }

  function mtFrom(quantity, uom) {
    const q = Number(quantity || 0);
    const unit = String(uom || '').toLowerCase();
    if (!q || isNaN(q)) return 0;
    if (unit === 'mt' || unit === 'metric tonne' || unit === 'metric tonnes') return q;
    if (unit === 'kg') return q / 1000;
    if (unit === 'lbs' || unit === 'lb' || unit === 'pounds') return q * 0.00045359237;
    // return rounded to 2
    return Math.round(q * 100) / 100;
  }

  function parseDateSmart(s) {
    if (!s) return null;
    try {
      const d = new Date(s);
      if (!isNaN(d.getTime())) return d;
    } catch (e) {}
    try {
      return format.parse({ value: String(s), type: format.Type.DATE });
    } catch (e) { return null; }
  }

  function findConsigneeMaster({ buyerCompany, shipCity, shipZip, shipAddr1 }) {
    const nameTokens = onlyLettersToTokens(buyerCompany);
    const cityToken = String(shipCity || '').trim();
    if (!nameTokens.length || !cityToken) {
      throw error.create({ name: 'CONS_MATCH_INPUT_MISSING', message: 'Insufficient data for consignee search (company tokens or ship city missing).' });
    }

    const filters = [];
    filters.push(['name', 'contains', nameTokens[0]]);
    if (nameTokens[1]) { filters.push('and', ['name', 'contains', nameTokens[1]]); }
    filters.push('and', ['name', 'contains', cityToken]);

    const col = [search.createColumn({ name: 'internalid' }), search.createColumn({ name: 'name' })];

    const results = search.create({ type: CONSIGNEE_MASTER, filters, columns: col }).run().getRange({ start: 0, end: 1000 }) || [];

    if (!results.length) {
      throw error.create({ name: 'CONS_NOT_FOUND', message: 'No consignee master matched name tokens & city.' });
    }

    if (results.length === 1) {
      return { id: results[0].getValue('internalid'), name: results[0].getValue('name'), diagnostics: { candidates: 1, matchedBy: 'name+city' } };
    }

    const aTok = addressToken(shipAddr1);
    const targetCityLc = toLower(cityToken);
    const targetZip = String(shipZip || '').trim();

    const matches = [];
    for (let r of results) {
      const recId = r.getValue('internalid');
      const recName = r.getValue('name');
      try {
        const rec = record.load({ type: CONSIGNEE_MASTER, id: recId });
        const lineCount = rec.getLineCount({ sublistId: CONSIGNEE_ADDR_SUBLIST }) || 0;
        for (let i = 0; i < lineCount; i++) {
          const addr1 = rec.getSublistValue({ sublistId: CONSIGNEE_ADDR_SUBLIST, fieldId: CONSIGNEE_ADDR_ADDR1, line: i }) || '';
          const city  = rec.getSublistValue({ sublistId: CONSIGNEE_ADDR_SUBLIST, fieldId: CONSIGNEE_ADDR_CITY,  line: i }) || '';
          const zip   = rec.getSublistValue({ sublistId: CONSIGNEE_ADDR_SUBLIST, fieldId: CONSIGNEE_ADDR_ZIP,   line: i }) || '';
          const addr1HasTok = aTok ? toLower(addr1).indexOf(toLower(aTok)) !== -1 : true;
          const cityEq = toLower(city) === targetCityLc;
          const zipEq = targetZip ? String(zip).trim() === targetZip : true;
          if (addr1HasTok && cityEq && zipEq) {
            matches.push({ id: recId, name: recName, addrIndex: i });
          }
        }
      } catch (e) {
        log.error({ title: 'Consignee load error', details: { recId, e: e.message } });
      }
    }

    const uniqueIds = {}; matches.forEach(m => uniqueIds[m.id] = true);
    const ids = Object.keys(uniqueIds);
    if (!ids.length) {
      throw error.create({ name: 'CONS_NO_ADDR_MATCH', message: 'Multiple consignees matched name+city, but none matched address sublist.' });
    }
    if (ids.length > 1) {
      throw error.create({ name: 'CONS_AMBIGUOUS', message: 'More than one consignee master matches the provided address.' });
    }

    const picked = matches[0];
    return { id: picked.id, name: picked.name, diagnostics: { candidates: results.length, addrMatches: matches.length } };
  }

  function findCustomerFromConsignee(consigneeId, buyerCompany) {
    const nameTokens = onlyLettersToTokens(buyerCompany);
    if (!nameTokens.length) {
      throw error.create({ name: 'CUST_MATCH_INPUT_MISSING', message: 'Cannot derive customer token from company name.' });
    }

    const filters = [
      [F_CUSTCON_CONSIGNEE, 'anyof', consigneeId], 'and',
      [F_CUSTCON_CUSTOMER + '.entityid', 'contains', nameTokens[0]]
    ];

    const cols = [
      search.createColumn({ name: 'internalid' }),
      search.createColumn({ name: F_CUSTCON_CUSTOMER })
    ];

    const res = search.create({ type: CUSTOMER_CONSIGNEE_REC, filters, columns: cols }).run().getRange({ start: 0, end: 10 }) || [];

    if (!res.length) {
      throw error.create({ name: 'CUSTOMER_NOT_FOUND', message: 'No customer-consignee record found for consignee and name token.' });
    }
    if (res.length > 1) {
      throw error.create({ name: 'CUSTOMER_AMBIGUOUS', message: 'More than one customer-consignee record matched.' });
    }

    const row = res[0];
    const customerId = row.getValue(F_CUSTCON_CUSTOMER);
    const customerConsigneeInternalId = row.getValue('internalid');
    if (!customerId) {
      throw error.create({ name: 'CUSTOMER_FIELD_EMPTY', message: 'Matched customer-consignee record has no customer value.' });
    }
    return { customerId: String(customerId), mappingId: row.getValue('internalid'), customerConID: String(customerConsigneeInternalId) };
  }

  function searchItemBySKU(sku) {
    if (!sku) return null;
    const filters = [ ['itemid', 'is', String(sku)], 'and', ['isinactive', 'is', 'F'] ];
    const cols = [
      search.createColumn({ name: 'internalid' }),
      search.createColumn({ name: 'itemid' }),
      search.createColumn({ name: ITEM_FIELD_WEIGHT_KG }),
      search.createColumn({ name: ITEM_FIELD_RPP })
    ];
    const r = search.create({ type: search.Type.ITEM, filters, columns: cols }).run().getRange({ start: 0, end: 2 }) || [];
    if (!r.length) return null;
    return {
      id: r[0].getValue('internalid'),
      itemid: r[0].getValue('itemid'),
      weightKg: Number(r[0].getValue(ITEM_FIELD_WEIGHT_KG) || 0),
      rpp: Number(r[0].getValue(ITEM_FIELD_RPP) || 0)
    };
  }

  function createSalesOrder({ payload, customerId, consigneeId }) {
    const so = record.create({ type: record.Type.SALES_ORDER, isDynamic: true });

    // Header fields
    so.setValue({ fieldId: 'entity', value: Number(customerId) });
    so.setValue({ fieldId: SO_BODY_CONSIGNEE, value: Number(consigneeId) });
    if (payload['BuyerPO#']) so.setValue({ fieldId: 'otherrefnum', value: String(payload['BuyerPO#']) });
    if (payload['Ref#'] != null) so.setValue({ fieldId: SO_BODY_CONSIGNEE_REFNUM, value: String(payload['Ref#']) });
    so.setValue({ fieldId: SO_BODY_ORDERTYPE, value: 7 });

    const reqDate = parseDateSmart(payload.DateRequired);

    const itemResults = [];

    // Loop items
    const lines = Array.isArray(payload.itemLines) ? payload.itemLines : [];
    for (const line of lines) {
      const items = (line && Array.isArray(line.item)) ? line.item : [];
      for (const it of items) {
        const sku = String(it.sku || '').trim();
        if (!sku || sku === 'NOTFOUND') {
          itemResults.push({ sku, status: 'skipped', reason: 'SKU missing or NOTFOUND' });
          continue; // skip this line rather than fatal
        }
        const found = searchItemBySKU(sku);
        if (!found) {
          itemResults.push({ sku, status: 'error', reason: 'SKU not found in NetSuite' });
          continue;
        }

        const weightMtOrdered = mtFrom(it.quantity, it.quantityUom);
        const kgPerRoll = Number(found.weightKg || 0);
        if (!kgPerRoll || isNaN(kgPerRoll) || kgPerRoll <= 0) {
          throw error.create({ name: 'ITEM_MISSING_ROLL_WEIGHT', message: 'Item ' + sku + ' missing ' + ITEM_FIELD_WEIGHT_KG + ' (kg/roll).' });
        }

        // rolls = floor(ordered_MT * 1000 / kgPerRoll)
        const rawRolls = (weightMtOrdered * 1000) / kgPerRoll;
        const rolls = Math.floor(rawRolls);
        if (!rolls || rolls <= 0) {
          throw error.create({ name: 'ROLLS_COMPUTE_ZERO', message: 'Computed zero rolls for item ' + sku + ' from ordered weight.' });
        }

        // packs = floor(rolls / rpp) when rpp>0
        const rpp = Number(found.rpp || 0);
        const packs = rpp > 0 ? Math.floor(rolls / rpp) : null;

        const adjustedKg = rolls * kgPerRoll/1000; // adjusted weight after rounding (kg)

        so.selectNewLine({ sublistId: ITEM_SUBLIST });
        so.setCurrentSublistValue({ sublistId: ITEM_SUBLIST, fieldId: 'item', value: Number(found.id) });
        // quantity = number of rolls
        so.setCurrentSublistValue({ sublistId: ITEM_SUBLIST, fieldId: 'quantity', value: rolls });
        // rate $1
        so.setCurrentSublistValue({ sublistId: ITEM_SUBLIST, fieldId: 'rate', value: 1 });
        // custom columns
        if (weightMtOrdered) so.setCurrentSublistValue({ sublistId: ITEM_SUBLIST, fieldId: ITEM_COL_ORDERED_WEIGHT_MT, value: Math.round(parseFloat(weightMtOrdered) * 100) / 100 });
        if (reqDate)           so.setCurrentSublistValue({ sublistId: ITEM_SUBLIST, fieldId: ITEM_COL_DELIVERY_DATE, value: reqDate });
        if (packs != null)     so.setCurrentSublistValue({ sublistId: ITEM_SUBLIST, fieldId: ITEM_COL_NUM_PACKS, value: packs });
        if (adjustedKg)        so.setCurrentSublistValue({ sublistId: ITEM_SUBLIST, fieldId: ITEM_COL_ADJ_WEIGHT_KG, value: Math.round(parseFloat(adjustedKg) * 100) / 100 });

        so.commitLine({ sublistId: ITEM_SUBLIST });
        itemResults.push({ sku, status: 'added', itemId: found.id, weightMtOrdered, kgPerRoll, rolls, rpp, packs, adjustedKg });
      }
    }

    const missing = itemResults.filter(r => r.status === 'error');
    if (missing.length) {
      throw error.create({ name: 'ITEMS_NOT_FOUND', message: 'One or more SKUs not found: ' + missing.map(m => m.sku).join(', ') });
    }

    const soId = so.save({ enableSourcing: true, ignoreMandatoryFields: false });
    return { id: soId, items: itemResults };
  }

  function summarize(payload) {
    let lineCount = 0; let itemCount = 0;
    if (Array.isArray(payload.itemLines)) {
      lineCount = payload.itemLines.length;
      for (const line of payload.itemLines) {
        if (line && Array.isArray(line.item)) itemCount += line.item.length;
      }
    }
    return { lineCount, itemCount };
  }

  // ---------- REST verbs ----------
  function post(body) {
    const t0 = Date.now();

    try {
      const payload = parseBody(body);

      // Diagnostics log (not fatal if fails)
      try {
        log.audit({ title: 'OCR PO Received', details: JSON.stringify({ buyerPO: payload['BuyerPO#'] || null, buyerCompany: payload.BuyerCompany || null }) });
      } catch (e) { log.error({ title: 'Log error', details: e.message }); }

      // Prep data for searches
      const { city, zip, line1 } = firstAddress(payload);

      // 1) Find consignee master
      const consignee = findConsigneeMaster({ buyerCompany: payload.BuyerCompany, shipCity: city, shipZip: zip, shipAddr1: line1 });

      // 2) Find customer from consignee mapping
      const cust = findCustomerFromConsignee(consignee.id, payload.BuyerCompany);

      // 3) Create Sales Order (NOTE: use customerConsignee internal id on the body consignee if your body expects that)
      const so = createSalesOrder({ payload, customerId: cust.customerId, consigneeId: cust.customerConID });

      const { lineCount, itemCount } = summarize(payload);

      return {
        status: 'created',
        message: 'Sales Order created successfully.',
        elapsedMs: Date.now() - t0,
        buyerPo: payload['BuyerPO#'] || null,
        consignee: { id: consignee.id, name: consignee.name, diagnostics: consignee.diagnostics },
        customer: { id: cust.customerId, mappingId: cust.mappingId, customerConsigneeId: cust.customerConID },
        salesOrder: { id: so.id },
        counts: { lines: lineCount, items: itemCount },
        items: so.items
      };

    } catch (e) {
      // Detailed error payload
      const errObj = {
        status: 'error',
        message: (e && e.message) || 'Unexpected failure',
        name: (e && e.name) || 'UNEXPECTED',
        stack: (e && e.stack) || '',
        elapsedMs: Date.now() - t0
      };
      try { log.error({ title: 'RESTlet Error', details: JSON.stringify(errObj) }); } catch(_) {}
      return errObj;
    }
  }

  function get(params) { return { status: 'up', message: 'ANC Sales Order Creator RESTlet is running' }; }
  function put(body) { return post(body); }
  function del(body) { return { status: 'noop', message: 'Delete not implemented' }; }

  return { get, post, put, delete: del };
});
