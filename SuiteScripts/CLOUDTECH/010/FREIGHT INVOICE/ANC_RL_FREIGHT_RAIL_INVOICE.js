/**
 * @NApiVersion 2.1
 * @NScriptType Restlet
 */
define([
    '/SuiteScripts/ANC_lib.js',
    'N/https',
    'N/record',
    'N/runtime',
    'N/search',
    'N/format'
], (ANC_lib, https, record, runtime, search, format) => {

    /**
     * GET — unused
     */
    const get = (requestParams) => ({});

    /**
     * PUT — unused
     */
    const put = (requestBody) => ({});

    /**
     * POST — Create/Update PO, then (if final) transform to IR & VB for RAIL invoices.
     * Request body expected to follow rail payload (see FCS06151.json).
     */
    const post = (requestBody) => {
        var integrationLogId = null;
        try {
            const payload = typeof requestBody === 'string' ? JSON.parse(requestBody) : (requestBody || {});

            // -------- Config switches (easy to flip later) --------
            const RAIL_CONFIG = {
                dateFieldStrategy: 'BillingDate',          // 'BillingDate' | 'InvoiceDate'
                invoiceNumberStrategy: 'InvoiceNumber',    // 'InvoiceNumber' | 'Waybill' | 'BOL'
                forceUnknownAccessorial: true
            };

            //TODO declarations should be moved to ANC_lib.js
            // -------- Environment-controlled vendor + defaults --------
            const ENV = runtime.accountId; // '1116623_SB1' | '1116623_SB2' | '1116623'
            const RAIL_VENDOR_BY_ENV = {
                '1116623_SB1': 1740,
                '1116623_SB2': 1740,
                '1116623': 1740
            };
            const DEFAULTS = {
                '1116623_SB1': { customer: 593064, consignee: 319828 },
                '1116623_SB2': { customer: 549160, consignee: 305737 },
                '1116623':     { customer: 593064, consignee: 319828 }
            };
            const RAIL_VENDOR_ID = RAIL_VENDOR_BY_ENV[ENV] || 1740;
            const DEFAULT_CUST = (DEFAULTS[ENV] || DEFAULTS['1116623']).customer;
            const DEFAULT_CONS = (DEFAULTS[ENV] || DEFAULTS['1116623']).consignee;

            // Shipment record internal id per environment
            const SHIPMENT_REC_INTERNALID_BY_ENV = {
                '1116623_SB1': 'CuTrSale106',
                '1116623_SB2': 'CuTrSale108',
                '1116623':     'CuTrSale106'
            };
            const SHIPMENT_REC_INTERNALID = SHIPMENT_REC_INTERNALID_BY_ENV[ENV] || 'CuTrSale108';

            // --- Debug: environment & config snapshot ---
            try {
                log.debug('Rail Invoice - Env/Config', {
                    account: ENV,
                    vendorId: RAIL_VENDOR_ID,
                    defaults: { customer: DEFAULT_CUST, consignee: DEFAULT_CONS },
                    shipmentRecInternalId: SHIPMENT_REC_INTERNALID,
                    config: RAIL_CONFIG
                });
                log.debug('Rail Invoice - Raw request typeof', typeof requestBody);
            } catch (e) {}

            // --- Debug: payload summary ---
            try {
                log.debug('Rail Invoice - Payload keys', {
                    ShipmentBOL: resolveBOL(payload),
                    BillingDate: payload && payload.BillingDate,
                    InvoiceNumber: payload && payload.InvoiceNumber,
                    CurrencyCode: payload && payload.CurrencyCode
                });
            } catch (e) {}

            // -------- Integration log (request) --------
            var integrationLogId = ANC_lib.submitIntegrationLog(integrationLogId,{request:JSON.stringify(requestBody)});

            // -------- Guard: Only process FINAL invoices --------
            const isFinal = Boolean(payload.IsFinalInvoice) || String(payload.Status || '').toLowerCase() === 'approved';
            if (!isFinal) {
                const msg = 'Invoice is not final/approved. Set IsFinalInvoice=true or Status="Approved".';
                ANC_lib.submitIntegrationLog(integrationLogId, { response: JSON.stringify({ success: false, message: msg }) });
                return { success: false, message: msg };
            }

            // -------- Keys & dates --------
            const targetBol = resolveBOL(payload);
            if (!targetBol) throw new Error('Missing ShipmentBOL / BM / SI reference.');

            const transactionDateRaw = getTransactionDateRaw(payload, RAIL_CONFIG);
            const trandate = safeJSDate(transactionDateRaw);
            try {
                log.debug('Rail Invoice - Final check', { IsFinalInvoice: payload.IsFinalInvoice, Status: payload.Status, isFinal });
                log.debug('Rail Invoice - Keys', { BOL: targetBol, transactionDateRaw: transactionDateRaw, trandate: trandate });
            } catch (e) {}

            // -------- Optional: prep shipment context (read-only) --------
            try {
                var prepLoad_result = ANC_lib.prepLoad(targetBol); // false => don't mutate/create shipment
                log.debug('prepLoad_result', prepLoad_result);
                var loadDetails_result = ANC_lib.getLoadDetails(targetBol);
                log.debug('getLoadDetails_result', loadDetails_result);
            } catch (e) { log.debug('prepLoad/getLoadDetails skipped', e && e.message ? e.message : e); }

            // -------- Shipment context → consignee/customer/equipment/taxcode --------
            const targets = searchShipmentContext(targetBol, SHIPMENT_REC_INTERNALID) || {};

            // Fallback defaults for customer/consignee
            if (!targets.targetCust) targets.targetCust = DEFAULT_CUST;
            if (!targets.targetCons) targets.targetCons = DEFAULT_CONS;

            // Determine tax code by province/country (same approach as truck)
            targets.targetTaxcodeId = computeTaxCode(targets);
            try {
                log.debug('Rail Invoice - Shipment targets', {
                    customer: targets.targetCust,
                    consignee: targets.targetCons,
                    equipType: targets.targetEquipType,
                    leg: targets.legNum,
                    province: targets.custrecord_alberta_ns_ship_addrprovince,
                    country: targets.custrecord_alberta_ns_countrytext,
                    taxcode: targets.targetTaxcodeId
                });
            } catch (e) {}

            // -------- Parse rail charges from payload --------
            const charges = extractRailCharges(payload);
            try { log.debug('Rail Invoice - Charges extracted', charges); } catch (e) {}

            // -------- Create/Update PO by externalid = BOL --------
            const lookup = lookupPo(targetBol);
            try { log.debug('Rail Invoice - PO lookup', lookup); } catch (e) {}
            let poId = '';

            if (lookup.found && lookup.status === 'fullyBilled') {
                throw new Error('The PO is fully billed; changes are disallowed.');
            }

            //TODO THIS is specific to RAIL FREIGHT INVOICE, assumption is that it gets synced 1 time unlike REGULAR/TRUCK FREIGHT INVOICE WHERE multiple versions of a NON-FINAL payload is being sent to NetSuite
            if (lookup.found)
            {
                throw new Error(`The RAIL PO already exists for  ${targetBol} . `);
            }

            if (lookup.found) {
                // EDIT existing PO
                const poRec = record.load({ type: 'purchaseorder', id: lookup.id });

                // Make sure vendor matches the rail vendor for this env
                const currentVendor = poRec.getValue({ fieldId: 'entity' });
                if (Number(currentVendor) !== Number(RAIL_VENDOR_ID)) {
                    poRec.setValue({ fieldId: 'entity', value: RAIL_VENDOR_ID });
                }

                // Set standard header values
                stampPOHeader(poRec, {
                    trandate,
                    bol: targetBol,
                    consignee: targets.targetCons,
                    currency: payload.CurrencyCode || payload.Currency,
                    netAmountDue: payload.NetAmountDue,
                    countryText: targets.custrecord_alberta_ns_countrytext
                });

                // Lines
                clearSublist(poRec);
                fillSublist(poRec, charges, targets, { initializeMainItem: true });

                poId = poRec.save({ ignoreMandatoryFields: true, enableSourcing: true });
                try { log.debug('Rail Invoice - PO saved', { poId: poId }); } catch (e) {}
            } else {
                // CREATE new PO (set vendor in defaultValues)
                const poRec = record.create({ type: 'purchaseorder', defaultValues: { entity: RAIL_VENDOR_ID } });

                // Set standard header values
                stampPOHeader(poRec, {
                    trandate,
                    bol: targetBol,
                    consignee: targets.targetCons,
                    currency: payload.CurrencyCode || payload.Currency,
                    netAmountDue: payload.NetAmountDue,
                    countryText: targets.custrecord_alberta_ns_countrytext
                });

                // Lines
                clearSublist(poRec);
                fillSublist(poRec, charges, targets, { initializeMainItem: true });

                poId = poRec.save({ ignoreMandatoryFields: true, enableSourcing: true });
                try { log.debug('Rail Invoice - PO saved', { poId: poId }); } catch (e) {}
            }

            // -------- If final: approve then transform to IR & VB --------
            // Approve PO
            try {
                const poToApprove = record.load({ type: 'purchaseorder', id: poId });
                poToApprove.setValue({ fieldId: 'supervisorapproval', value: true });
                poToApprove.save({ ignoreMandatoryFields: true, enableSourcing: true });
                try { log.debug('Rail Invoice - PO approved', { poId: poId }); } catch (e) {}
            } catch (e) {
                logError('Approving PO failed (continuing).', e);
            }

            // Transform to IR
            let irId = '';
            try {
                const ir = record.transform({ fromType: 'purchaseorder', fromId: poId, toType: 'itemreceipt' });
                ir.setValue({ fieldId: 'trandate', value: trandate });
                ir.setValue({ fieldId: 'tobeemailed', value: false });
                markAllReceive(ir); // check all item lines
                irId = ir.save({ ignoreMandatoryFields: true, enableSourcing: true });
                try { log.debug('Rail Invoice - IR created', { irId: irId }); } catch (e) {}
            } catch (e) {
                logError('Transform to Item Receipt failed.', e);
            }

            // Transform to VB
            let vbId = '';
            try {
                const vb = record.transform({ fromType: 'purchaseorder', fromId: poId, toType: 'vendorbill' });
                vb.setValue({ fieldId: 'trandate', value: trandate });
                if (targetBol) {
                    vb.setValue({ fieldId: 'custbody4', value: targetBol });
                    vb.setValue({ fieldId: 'custbody_wmid', value: targetBol });
                }
                // Vendor Bill number per config
                const vbNum = resolveVendorBillNumber(payload, targetBol, RAIL_CONFIG);
                if (vbNum) vb.setValue({ fieldId: 'tranid', value: vbNum });
                vb.setValue({ fieldId: 'tobeemailed', value: false });

                vbId = vb.save({ ignoreMandatoryFields: true, enableSourcing: true });
                try { log.debug('Rail Invoice - VB created', { vbId: vbId, vbNum: vbNum }); } catch (e) {}
            } catch (e) {
                logError('Transform to Vendor Bill failed.', e);
            }

            const resp = { success: true, message: 'OK', NS_RECORD_INTERNALID: { poId, irId, vbId } };
            ANC_lib.submitIntegrationLog(integrationLogId, { response: JSON.stringify(resp) });
            try { log.debug('Rail Invoice - Done', resp); } catch (e) {}
            return resp;
        } catch (e) {
            const msg = (e && e.message) ? e.message : JSON.stringify(e);
            ANC_lib.submitIntegrationLog(integrationLogId, { response: JSON.stringify({ success: false, message: msg }) });
            return { success: false, message: msg };
        }
    };

    /** ------------------------------ Helpers ------------------------------ */

    function safeJSDate(raw) {
        try { return raw ? new Date(raw) : new Date(); } catch (_e) { return new Date(); }
    }

    function getTransactionDateRaw(payload, cfg) {
        if ((cfg || {}).dateFieldStrategy === 'BillingDate') {
            return payload.BillingDate || payload.billingDate || payload.InvoiceDate || payload.invoiceDate;
        }
        return payload.InvoiceDate || payload.invoiceDate || payload.BillingDate || payload.billingDate;
    }

    function resolveVendorBillNumber(payload, bol, cfg) {
        const mode = (cfg || {}).invoiceNumberStrategy || 'BOL';
        if (mode === 'InvoiceNumber') return payload.InvoiceNumber || payload.invoiceNumber || '';
        if (mode === 'Waybill') return (payload.Waybill != null) ? String(payload.Waybill) : '';
        return bol || '';
    }

    function resolveBOL(payload) {
        if (payload.ShipmentBOL) return payload.ShipmentBOL;
        if (Array.isArray(payload.Refs)) {
            for (const r of payload.Refs) {
                if (!r) continue;
                if (r.Qualifier === 'BM' || r.Qualifier === 'SI') return r.ReferenceNumber;
            }
        }
        // legacy fallbacks
        return payload.BOL || payload.bol || payload.LoadID || payload.loadID || '';
    }

    function searchShipmentContext(bol, shipmentRecInternalId) {
        try {
            const targets = { targetBol: bol };
            const columns = [
                search.createColumn({ name: 'entity' }),
                search.createColumn({ name: 'custbody_consignee' }),
                search.createColumn({ name: 'custbody_anc_equipment' }),
                search.createColumn({ name: 'custrecord_anc_transportmode', join: 'custbody_anc_equipment' }),
                search.createColumn({ name: 'shipstate' }),
                search.createColumn({ name: 'custrecord_alberta_ns_postal_code', join: 'custbody_consignee' }),
                search.createColumn({ name: 'custrecord_alberta_ns_ship_addrprovince', join: 'custbody_consignee' }),
                search.createColumn({ name: 'custrecord_alberta_ns_country', join: 'custbody_consignee' }),
                search.createColumn({ name: 'custrecord_alberta_ns_country', join: 'custbody_consignee' })
            ];

            const srObj = search.create({
                type: 'transaction',
                filters: [
                    ['type', 'anyof', shipmentRecInternalId], 'AND',
                    ['custbody4', 'is', bol], 'AND',
                    ['mainline', 'is', 'T']
                ],
                columns
            })
            sr = srObj.run();
            log.debug("searchShipmentContext sr", sr)

            // srObj.title = "searchShipmentContext sr " + new Date().getTime();
            // srObj.isPublic = true;
            // var srId = srObj.save();
            // log.debug("srId", srId);

            sr.each((res) => {
                targets.legNum = res.getValue({ name: 'custbody_anc_shipment_leg' });
                targets.targetCust = res.getValue({ name: 'entity' });
                targets.targetCons = res.getValue({ name: 'custbody_consignee' });
                targets.targetEquip = res.getValue({ name: 'custbody_anc_equipment' });
                targets.targetEquipType = res.getValue({ name: 'custrecord_anc_transportmode', join: 'custbody_anc_equipment' });
                targets.shipstate = res.getValue({ name: 'shipstate' });
                targets.custrecord_alberta_ns_postal_code = res.getValue({ name: 'custrecord_alberta_ns_postal_code', join: 'custbody_consignee' });
                targets.custrecord_alberta_ns_ship_addrprovince = res.getValue({ name: 'custrecord_alberta_ns_ship_addrprovince', join: 'custbody_consignee' });
                targets.custrecord_alberta_ns_country = res.getValue({ name: 'custrecord_alberta_ns_country', join: 'custbody_consignee' });
                targets.custrecord_alberta_ns_countrytext = res.getValue({ name: 'custrecord_alberta_ns_country', join: 'custbody_consignee' });
                return false; // first only
            });

            // If province/country not on line, try a direct lookup on consignee record
            if ((!targets.custrecord_alberta_ns_ship_addrprovince || !targets.custrecord_alberta_ns_country) && targets.targetCons) {
                try {
                    const c = search.lookupFields({
                        type: 'customrecord_alberta_ns_consignee_record',
                        id: targets.targetCons,
                        columns: ['custrecord_alberta_ns_ship_addrprovince', 'custrecord_alberta_ns_country']
                    });
                    targets.custrecord_alberta_ns_ship_addrprovince = c.custrecord_alberta_ns_ship_addrprovince || targets.custrecord_alberta_ns_ship_addrprovince;
                    targets.custrecord_alberta_ns_country = c.custrecord_alberta_ns_country || targets.custrecord_alberta_ns_country;
                } catch (_e) {}
            }

            log.debug("searchShipmentContext targets", targets)

            return targets;
        } catch (e) {
            logError('searchShipmentContext error', e);
            return null;
        }
    }

    function computeTaxCode(targets) {
        try {
            // Default non-taxable
            let taxcode = ANC_lib.FREIGHTINVOICE.TAXCODES.TAXCODE_NONTAXABLE82;

            const countryText = targets.custrecord_alberta_ns_countrytext || '';
            if (String(countryText).toLowerCase() !== 'canada') return taxcode;

            const prov = targets.custrecord_alberta_ns_ship_addrprovince;
            if (prov && ANC_lib.CA_TAXCODE_MAPPING_BY_STATE_CODE && ANC_lib.CA_TAXCODE_MAPPING_BY_STATE_CODE[prov]) {
                taxcode = ANC_lib.CA_TAXCODE_MAPPING_BY_STATE_CODE[prov];
            }
            return taxcode;
        } catch (_e) {
            return ANC_lib.FREIGHTINVOICE.TAXCODES.TAXCODE_NONTAXABLE82;
        }
    }

    function extractRailCharges(payload) {
        const out = { base: 0, fuel: 0, fuelCode: '', accessorials: [] };
        try {
            const orders = Array.isArray(payload.Orders) ? payload.Orders : [];
            for (const order of orders) {
                const items = (order && Array.isArray(order.LineItems)) ? order.LineItems : [];
                for (const li of items) {
                    const measures = (li && Array.isArray(li.Measures)) ? li.Measures : [];
                    for (const m of measures) {
                        const charges = (m && Array.isArray(m.Charges)) ? m.Charges : [];
                        for (const ch of charges) {
                            const amt = Number(ch.AmountCharged || 0) || 0;
                            const rq = ch.RateQualifier || '';
                            const scc = ch.SpecialChargeCode || '';

                            if (String(scc).toUpperCase() === 'GST') continue;

                            // Fuel
                            if (/^(FSC|FS|FUEL)$/i.test(scc)) {
                                out.fuel += amt;
                                if (!out.fuelCode && scc) out.fuelCode = String(scc);
                                continue;
                            }

                            // Base vs accessorial
                            if (!scc && (rq === 'PC' || out.base === 0)) {
                                out.base += amt;
                            } else if (scc) {
                                out.accessorials.push({ code: String(scc), amount: amt });
                            } else {
                                out.base += amt;
                            }
                        }
                    }
                }
            }
        } catch (e) {
            logError('extractRailCharges error — falling back to NetAmountDue base', e);
        }

        try {
            if (!out.base && !out.accessorials.length && Number(payload.NetAmountDue)) out.base = Number(payload.NetAmountDue);
        } catch (_e) {}

        return out;
    }


    function stampPOHeader(poRec, opts) {
        log.debug("stampPOHeader opts", opts)
        const { trandate, bol, consignee, currency, netAmountDue, countryText } = opts || {};

        // Force subsidiary to ANS (internalid 5) per business rule
        poRec.setValue({ fieldId: 'subsidiary', value: 5 });

        if (consignee) poRec.setValue({ fieldId: 'custbody_ns_consignee', value: consignee });

        // Currency mapping
        const c = (currency || '').toUpperCase();
        const currencyId = (c === 'USD') ? 2 : 1; // CAD=1, USD=2
        poRec.setValue({ fieldId: 'currency', value: currencyId });

        if (trandate) poRec.setValue({ fieldId: 'trandate', value: trandate });

        // BOL stamp
        if (bol) {
            poRec.setValue({ fieldId: 'custbody4', value: bol });
            poRec.setValue({ fieldId: 'custbody_wmid', value: bol });
        }

        // Approval status = Pending Approval (1)
        poRec.setValue({ fieldId: 'approvalstatus', value: 1 });

        // Optional: set original amount for visibility
        if (Number(netAmountDue)) {
            poRec.setValue({ fieldId: 'custbody_freightinvoice_original_amount', value: Number(netAmountDue) });
        }

        // Market segment (line-level will also be set in fillSublist)
        log.debug("stampPOHeader { trandate, bol, consignee, currency, netAmountDue, countryText }", { trandate, bol, consignee, currency, netAmountDue, countryText })
        log.debug("stampPOHeader countryText", countryText)

        poRec.setValue({
            fieldId : "externalid",
            value :bol,
        })
        poRec.setValue({
            fieldId : "custbody_purchase_order",
            value :bol,
        })
        if(bol)
        {
            poRec.setValue({
                fieldId : "custbody4",
                value : bol
            })
        }
        if(bol)
        {
            poRec.setValue({
                fieldId : "custbody_wmid",
                value : bol
            })
        }

        if (countryText) {
            poRec.setText({
                fieldId : "cseg_anc_mrkt_sgmt",
                value : countryText,
                text : resolveMarketSegment(countryText),
            })
            log.debug("set header cseg_anc_mrkt_sgmt", { fieldId: 'cseg_anc_mrkt_sgmt', value: resolveMarketSegment(countryText), text: resolveMarketSegment(countryText) })
        }
        // poRec.setText({
        //     fieldId : "cseg_anc_mrkt_sgmt",
        //     // value : 2,
        //     text : "Canada",
        // })
        // poRec.setValue({
        //     fieldId : "cseg_anc_mrkt_sgmt",
        //     value : 2,
        //     // text : "Canada",
        // })
        // poRec.setValue({
        //     fieldId : "memo",
        //     value : "cseg_anc_mrkt_sgmt should be 2",
        //     // text : "Canada",
        // })
    }

    function lookupPo(externalIdStr) {
        const out = { found: false };
        try {
            const srObj = search.create({
                type: 'purchaseorder',
                filters: [
                    ['type', 'anyof', 'PurchOrd'], 'AND',
                    ['mainline', 'is', 'T'], 'AND',
                    ['externalidstring', 'is', externalIdStr]
                ],
                columns: [
                    search.createColumn({ name: 'internalid' }),
                    search.createColumn({ name: 'statusref' })
                ]
            })
            sr = srObj.run();
            log.debug("lookupPo sr", sr)

            // srObj.title = "lookupPo sr " + new Date().getTime();
            // srObj.isPublic = true;
            // var srId = srObj.save();
            // log.debug("srId", srId);

            sr.each((res) => {
                out.found = true;
                out.id = res.getValue({ name: 'internalid' });
                const statusRef = res.getValue({ name: 'statusref' }) || '';
                // statusref samples: PurchOrd:A (Pending Approval), PurchOrd:F (Fully Billed)
                out.status = /:F$/.test(statusRef) ? 'fullyBilled' : statusRef;
                return false; // first only
            });
        } catch (e) { logError('lookupPo error', e); }
        return out;
    }

    function clearSublist(nsRec) {
        if (nsRec.type === 'itemreceipt') {
            const count = nsRec.getLineCount({ sublistId: 'item' });
            for (let i = 0; i < count; i++) {
                try { nsRec.setSublistValue({ sublistId: 'item', fieldId: 'itemreceive', line: i, value: true }); } catch (_e) {}
            }
            return;
        }

        // For PO/VB, remove all existing lines
        try {
            for (let idx = nsRec.getLineCount({ sublistId: 'item' }) - 1; idx >= 0; idx--) {
                nsRec.removeLine({ sublistId: 'item', line: idx });
            }
        } catch (e) {
            logError('clearSublist error', e);
        }
    }

    function fillSublist(nsRec, charges, targets, opts) {

        log.debug("fillSublist targets", targets)

        const initializeMainItem = (opts && opts.initializeMainItem) || false;

        // Select items by leg & equipment transport mode (same pattern as truck)
        // targetEquipType: 1=rail, 2=truck, 3=intermodal in current convention
        let NF_ITEM = null;
        let FSC_ITEM = null;

        if (String(targets.legNum) === '2' && String(targets.targetEquipType) === '2') {
            // Truck → Customer
            FSC_ITEM = ANC_lib.FREIGHTINVOICE.FUELSURCHARGE_item_truck_to_cust;
            NF_ITEM = ANC_lib.FREIGHTINVOICE.NF_item_truck_to_cust;
        } else if (String(targets.legNum) !== '2' && String(targets.targetEquipType) === '2') {
            // Truck → Warehouse
            FSC_ITEM = ANC_lib.FREIGHTINVOICE.FUELSURCHARGE_item_truck_to_whs;
            NF_ITEM = ANC_lib.FREIGHTINVOICE.NF_item_truck_to_whs;
        } else if (String(targets.legNum) === '2' && String(targets.targetEquipType) === '1') {
            // Rail → Customer
            FSC_ITEM = ANC_lib.FREIGHTINVOICE.FUELSURCHARGE_item_rail_to_cust;
            NF_ITEM = ANC_lib.FREIGHTINVOICE.NF_item_rail_to_cust;
        } else if (String(targets.legNum) !== '2' && String(targets.targetEquipType) === '1') {
            // Rail → Warehouse
            FSC_ITEM = ANC_lib.FREIGHTINVOICE.FUELSURCHARGE_item_rail_to_whs;
            NF_ITEM = ANC_lib.FREIGHTINVOICE.NF_item_rail_to_whs;
        } else if (String(targets.legNum) === '2' && String(targets.targetEquipType) === '3') {
            // Intermodal → Customer
            FSC_ITEM = ANC_lib.FREIGHTINVOICE.FUELSURCHARGE_item_truck_to_cust;
            NF_ITEM = ANC_lib.FREIGHTINVOICE.NF_item_truck_to_cust;
        } else {
            // Intermodal/Other → Warehouse
            FSC_ITEM = ANC_lib.FREIGHTINVOICE.FUELSURCHARGE_item_truck_to_whs;
            NF_ITEM = ANC_lib.FREIGHTINVOICE.NF_item_truck_to_whs;
        }

        let line = 0;

        // Main linehaul (NF) — no SpecialChargeCode by definition; leave description blank
        if (initializeMainItem) {
            nsRec.setSublistValue({ sublistId: 'item', fieldId: 'item', line, value: NF_ITEM });
            nsRec.setSublistValue({ sublistId: 'item', fieldId: 'quantity', line, value: 1 });
            if (charges && Number(charges.base)) {
                nsRec.setSublistValue({ sublistId: 'item', fieldId: 'rate', line, value: Number(charges.base) });
                nsRec.setSublistValue({ sublistId: 'item', fieldId: 'amount', line, value: Number(charges.base) });
            }
            if (targets.targetTaxcodeId) nsRec.setSublistValue({ sublistId: 'item', fieldId: 'taxcode', line, value: targets.targetTaxcodeId });
            try { if (targets.targetBol) nsRec.setSublistValue({ sublistId: 'item', fieldId: 'custcol_wm_bol', line, value: targets.targetBol }); } catch (_e) {}
            try { if (targets.targetCust) nsRec.setSublistValue({ sublistId: 'item', fieldId: 'custcol_wm_customer', line, value: targets.targetCust }); } catch (_e) {}
            try { if (targets.targetCons) nsRec.setSublistValue({ sublistId: 'item', fieldId: 'custcol_wm_consignee', line, value: targets.targetCons }); } catch (_e) {}
            try {
                if (targets.custrecord_alberta_ns_countrytext)
                {
                    nsRec.setSublistText({ sublistId: 'item', fieldId: 'cseg_anc_mrkt_sgmt', line, value: resolveMarketSegment(targets.custrecord_alberta_ns_countrytext), text: resolveMarketSegment(targets.custrecord_alberta_ns_countrytext) });
                    log.debug("MARKET SEGMENT SET", {val:nsRec.getSublistValue({ sublistId: 'item', fieldId: 'cseg_anc_mrkt_sgmt', line}), args:{ sublistId: 'item', fieldId: 'cseg_anc_mrkt_sgmt', line}})
                }
            } catch (_e) {
                log.error("ERROR setting cseg_anc_mrkt_sgmt for line " + line, { _e, sublistId: 'item', fieldId: 'cseg_anc_mrkt_sgmt', line, value: resolveMarketSegment(targets.custrecord_alberta_ns_countrytext), text: resolveMarketSegment(targets.custrecord_alberta_ns_countrytext) })
            }

            log.debug('fillSublist', { lineType: 'NF', line, description: '(blank)' });
            line++;
        }

        // Fuel surcharge
        if (charges && Number(charges.fuel)) {
            nsRec.setSublistValue({ sublistId: 'item', fieldId: 'item', line, value: FSC_ITEM });
            nsRec.setSublistValue({ sublistId: 'item', fieldId: 'quantity', line, value: 1 });
            nsRec.setSublistValue({ sublistId: 'item', fieldId: 'rate', line, value: Number(charges.fuel) });
            nsRec.setSublistValue({ sublistId: 'item', fieldId: 'amount', line, value: Number(charges.fuel) });
            // 👉 description from SpecialChargeCode used for fuel (e.g., FSC/FS/FUEL)
            try { if (charges.fuelCode) nsRec.setSublistValue({ sublistId: 'item', fieldId: 'description', line, value: String(charges.fuelCode) }); } catch (_e) {}
            if (targets.targetTaxcodeId) nsRec.setSublistValue({ sublistId: 'item', fieldId: 'taxcode', line, value: targets.targetTaxcodeId });
            try { if (targets.targetBol) nsRec.setSublistValue({ sublistId: 'item', fieldId: 'custcol_wm_bol', line, value: targets.targetBol }); } catch (_e) {}
            try { if (targets.targetCust) nsRec.setSublistValue({ sublistId: 'item', fieldId: 'custcol_wm_customer', line, value: targets.targetCust }); } catch (_e) {}
            try { if (targets.targetCons) nsRec.setSublistValue({ sublistId: 'item', fieldId: 'custcol_wm_consignee', line, value: targets.targetCons }); } catch (_e) {}
            try {
                if (targets.custrecord_alberta_ns_countrytext)
                {
                    nsRec.setSublistText({ sublistId: 'item', fieldId: 'cseg_anc_mrkt_sgmt', line, value: resolveMarketSegment(targets.custrecord_alberta_ns_countrytext), text: resolveMarketSegment(targets.custrecord_alberta_ns_countrytext) });
                    log.debug("MARKET SEGMENT SET", {val:nsRec.getSublistValue({ sublistId: 'item', fieldId: 'cseg_anc_mrkt_sgmt', line}), args:{ sublistId: 'item', fieldId: 'cseg_anc_mrkt_sgmt', line}})
                }
            } catch (_e) {
                log.error("ERROR setting cseg_anc_mrkt_sgmt for line " + line, { _e, sublistId: 'item', fieldId: 'cseg_anc_mrkt_sgmt', line, value: resolveMarketSegment(targets.custrecord_alberta_ns_countrytext), text: resolveMarketSegment(targets.custrecord_alberta_ns_countrytext) })
            }

            log.debug('fillSublist', { lineType: 'FUEL', line, description: charges.fuelCode || '' });
            line++;
        }

        // Accessorials — Unknown Accessorial item, but description shows SpecialChargeCode
        const accMap = ANC_lib.FREIGHTINVOICE.accessorial_mapping || {};
        const UNKNOWN_ITEM = accMap['Unknown Accessorial Line'];

        if (charges && Array.isArray(charges.accessorials)) {
            for (const a of charges.accessorials) {
                if (!a || !Number(a.amount)) continue;
                nsRec.setSublistValue({ sublistId: 'item', fieldId: 'item', line, value: UNKNOWN_ITEM });
                nsRec.setSublistValue({ sublistId: 'item', fieldId: 'quantity', line, value: 1 });
                nsRec.setSublistValue({ sublistId: 'item', fieldId: 'rate', line, value: Number(a.amount) });
                nsRec.setSublistValue({ sublistId: 'item', fieldId: 'amount', line, value: Number(a.amount) });
                // 👉 description from SpecialChargeCode
                try { if (a.code) nsRec.setSublistValue({ sublistId: 'item', fieldId: 'description', line, value: String(a.code) }); } catch (_e) {}
                if (targets.targetTaxcodeId) nsRec.setSublistValue({ sublistId: 'item', fieldId: 'taxcode', line, value: targets.targetTaxcodeId });
                try { if (targets.targetBol) nsRec.setSublistValue({ sublistId: 'item', fieldId: 'custcol_wm_bol', line, value: targets.targetBol }); } catch (_e) {}
                try { if (targets.targetCust) nsRec.setSublistValue({ sublistId: 'item', fieldId: 'custcol_wm_customer', line, value: targets.targetCust }); } catch (_e) {}
                try { if (targets.targetCons) nsRec.setSublistValue({ sublistId: 'item', fieldId: 'custcol_wm_consignee', line, value: targets.targetCons }); } catch (_e) {}
                try {
                    if (targets.custrecord_alberta_ns_countrytext)
                    {
                        nsRec.setSublistText({ sublistId: 'item', fieldId: 'cseg_anc_mrkt_sgmt', line, value: resolveMarketSegment(targets.custrecord_alberta_ns_countrytext), text: resolveMarketSegment(targets.custrecord_alberta_ns_countrytext) });
                        log.debug("MARKET SEGMENT SET", {val:nsRec.getSublistValue({ sublistId: 'item', fieldId: 'cseg_anc_mrkt_sgmt', line}), args:{ sublistId: 'item', fieldId: 'cseg_anc_mrkt_sgmt', line}})
                    }
                } catch (_e) {
                    log.error("ERROR setting cseg_anc_mrkt_sgmt for line " + line, { _e, sublistId: 'item', fieldId: 'cseg_anc_mrkt_sgmt', line, value: resolveMarketSegment(targets.custrecord_alberta_ns_countrytext), text: resolveMarketSegment(targets.custrecord_alberta_ns_countrytext) })
                }

                // log.debug("hardcode cseg_anc_mrkt_sgmt column USA/2");
                // nsRec.setSublistValue({ sublistId: 'item', fieldId: 'cseg_anc_mrkt_sgmt', line, value: 2});
                log.debug('fillSublist', { lineType: 'ACCESSORIAL', line, description: a.code || '' });
                line++;
            }
        }
    }

    function markAllReceive(ir) {
        try {
            const cnt = ir.getLineCount({ sublistId: 'item' });
            for (let i = 0; i < cnt; i++) {
                try { ir.setSublistValue({ sublistId: 'item', fieldId: 'itemreceive', line: i, value: true }); } catch (_e) {}
            }
        } catch (e) { logError('markAllReceive error', e); }
    }

    function resolveMarketSegment(countryText)
    {
        var marketSegmentMapping = {
            "Canada": 1,
            "Can": 1,
            "USA": 2,
            "China": 3,
            "India": 4,
            "Taiwan": 5,
            "Philippines": 6,
            "Hong Kong": 7,
            "Singapore": 8,
            "Guatemala": 9,
            "Thailand": 11,
            "Other": 10,
            "Japan": 12,
            "Hawaii": 13,
            "Sri Lanka": 14,
            "Malaysia": 15
        };


        var fullCountryMapping = {
            "BR": "Other",
            "CAN": "Canada",
            "USA": "USA",
            "GT": "Guatemala",
            "HK": "Hong Kong",
            "IND": "India",
            "LK": "Sri Lanka",
            "MY": "Malaysia",
            "PH": "Philippines",
            "ROC": "Taiwan",
            "SGP": "Singapore",
            "TH": "Thailand",
            "UK": "Other",
            "DUPLICATE": "Other",
            "Canada": "Canada",
            "United States": "USA",
            "United States of America": "USA",
            "Guatemala": "Guatemala",
            "Hong Kong": "Hong Kong",
            "India": "India",
            "Sri Lanka": "Sri Lanka",
            "Malaysia": "Malaysia",
            "Philippines": "Philippines",
            "Taiwan": "Taiwan",
            "Singapore": "Singapore",
            "Thailand": "Thailand",
            "Japan": "Japan",
            "Hawaii": "Hawaii",
            "China": "China",
            "Brazil": "Other",
            "Mexico": "Mexico",
            "MX": "Mexico",
            "MEX": "Mexico",
            "Germany": "Germany",
            "DE": "Germany",
            "DEU": "Germany",
            "France": "France",
            "FR": "France",
            "FRA": "France",
            "Italy": "Italy",
            "IT": "Italy",
            "ITA": "Italy",
            "Spain": "Spain",
            "ES": "Spain",
            "ESP": "Spain",
            "Netherlands": "Netherlands",
            "NL": "Netherlands",
            "NLD": "Netherlands",
            "Sweden": "Sweden",
            "SE": "Sweden",
            "SWE": "Sweden",
            "Norway": "Norway",
            "NO": "Norway",
            "NOR": "Norway",
            "Denmark": "Denmark",
            "DK": "Denmark",
            "DNK": "Denmark",
            "Finland": "Finland",
            "FI": "Finland",
            "FIN": "Finland",
            "Australia": "Australia",
            "AU": "Australia",
            "AUS": "Australia",
            "New Zealand": "New Zealand",
            "NZ": "New Zealand",
            "NZL": "New Zealand",
            "South Africa": "South Africa",
            "ZA": "South Africa",
            "ZAF": "South Africa",
            "Russia": "Russia",
            "RU": "Russia",
            "RUS": "Russia",
            "Pakistan": "Pakistan",
            "PK": "Pakistan",
            "PAK": "Pakistan",
            "Bangladesh": "Bangladesh",
            "BD": "Bangladesh",
            "BGD": "Bangladesh",
            "Vietnam": "Vietnam",
            "VN": "Vietnam",
            "VNM": "Vietnam",
            "Indonesia": "Indonesia",
            "ID": "Indonesia",
            "IDN": "Indonesia",
            "South Korea": "South Korea",
            "KR": "South Korea",
            "KOR": "South Korea",
            "North Korea": "North Korea",
            "KP": "North Korea",
            "PRK": "North Korea",
            "Israel": "Israel",
            "IL": "Israel",
            "ISR": "Israel",
            "United Arab Emirates": "United Arab Emirates",
            "AE": "United Arab Emirates",
            "ARE": "United Arab Emirates",
            "Saudi Arabia": "Saudi Arabia",
            "SA": "Saudi Arabia",
            "SAU": "Saudi Arabia",
            "Argentina": "Argentina",
            "AR": "Argentina",
            "ARG": "Argentina",
            "Chile": "Chile",
            "CL": "Chile",
            "CHL": "Chile",
            "Colombia": "Colombia",
            "CO": "Colombia",
            "COL": "Colombia",
            "Peru": "Peru",
            "PE": "Peru",
            "PER": "Peru",
            "Poland": "Poland",
            "PL": "Poland",
            "POL": "Poland",
            "Ukraine": "Ukraine",
            "UA": "Ukraine",
            "UKR": "Ukraine",
            "Czechia": "Czechia",
            "CZ": "Czechia",
            "CZE": "Czechia",
            "Switzerland": "Switzerland",
            "CH": "Switzerland",
            "CHE": "Switzerland",
            "Austria": "Austria",
            "AT": "Austria",
            "AUT": "Austria",
            "Belgium": "Belgium",
            "BE": "Belgium",
            "BEL": "Belgium",
            "Ireland": "Ireland",
            "IE": "Ireland",
            "IRL": "Ireland",
            "Portugal": "Portugal",
            "PT": "Portugal",
            "PRT": "Portugal",
            "Greece": "Greece",
            "GR": "Greece",
            "GRC": "Greece",
            "Turkey": "Turkey",
            "TR": "Turkey",
            "TUR": "Turkey",
            "Egypt": "Egypt",
            "EG": "Egypt",
            "EGY": "Egypt",
            "Morocco": "Morocco",
            "MA": "Morocco",
            "MAR": "Morocco",
            "Kenya": "Kenya",
            "KE": "Kenya",
            "KEN": "Kenya",
            "Nigeria": "Nigeria",
            "NG": "Nigeria",
            "NGA": "Nigeria",
            "Venezuela": "Venezuela",
            "VE": "Venezuela",
            "VEN": "Venezuela"
        }


        var retVal = null;
        try
        {
            log.debug("resolveMarketSegment countryText", countryText)
            if(countryText)
            {

                // retVal = fullCountryMapping[countryText] || fullCountryMapping[countryText.toUpperCase()] || fullCountryMapping[countryText.toLowerCase()] || fullCountryMapping[ANC_lib.capitalizeFirstLetter(countryText)]



                if(fullCountryMapping[countryText])
                {
                    //market segments are full country names, lets allow them freeform consignee text, cause consignee country text is freeform right now
                    //TODO this may be changed soon when we restructure consignee records

                    retVal = fullCountryMapping[countryText];

                    // //TODO this is by ID mapping, there are only a few countries mapped, so do not implement this yet unless settext fails
                    // if(marketSegmentMapping[fullCountryMapping[countryText]])
                    // {
                    //     retVal = marketSegmentMapping[fullCountryMapping[countryText]]
                    // }
                }
                else if(fullCountryMapping[countryText.toUpperCase()])
                {
                    //market segments are full country names, lets allow them freeform consignee text, cause consignee country text is freeform right now
                    //TODO this may be changed soon when we restructure consignee records

                    retVal = fullCountryMapping[countryText.toUpperCase()];

                    // //TODO this is by ID mapping, there are only a few countries mapped, so do not implement this yet unless settext fails
                    // if(marketSegmentMapping[fullCountryMapping[countryText]])
                    // {
                    //     retVal = marketSegmentMapping[fullCountryMapping[countryText]]
                    // }
                }
                else if(fullCountryMapping[countryText.toLowerCase()])
                {
                    //market segments are full country names, lets allow them freeform consignee text, cause consignee country text is freeform right now
                    //TODO this may be changed soon when we restructure consignee records

                    retVal = fullCountryMapping[countryText.toLowerCase()];

                    // //TODO this is by ID mapping, there are only a few countries mapped, so do not implement this yet unless settext fails
                    // if(marketSegmentMapping[fullCountryMapping[countryText]])
                    // {
                    //     retVal = marketSegmentMapping[fullCountryMapping[countryText]]
                    // }
                }
                else if(fullCountryMapping[capitalizeFirstLetter(countryText)])
                {
                    //market segments are full country names, lets allow them freeform consignee text, cause consignee country text is freeform right now
                    //TODO this may be changed soon when we restructure consignee records

                    retVal = fullCountryMapping[capitalizeFirstLetter(countryText)];

                    // //TODO this is by ID mapping, there are only a few countries mapped, so do not implement this yet unless settext fails
                    // if(marketSegmentMapping[fullCountryMapping[countryText]])
                    // {
                    //     retVal = marketSegmentMapping[fullCountryMapping[countryText]]
                    // }
                }
            }
        }
        catch(e)
        {
            log.error("ERROR in function resolveMarketSegment", e);
        }
        log.debug("resolveMarketSegment retVal", retVal)
        return retVal;
    }

    function logError(what, e) {
        try { log.error(what, (e && e.message) ? e.message : JSON.stringify(e)); } catch (_e) {}
    }

    function capitalizeFirstLetter(str) {
        if (typeof str !== 'string' || str.length === 0) {
            return str; // Handle non-string or empty input
        }
        return str.charAt(0).toUpperCase() + str.slice(1).toLowerCase();
    }

    /**
     * DELETE — unused
     */
    const doDelete = (requestParams) => ({});

    return { get, put, post, delete: doDelete };
});
