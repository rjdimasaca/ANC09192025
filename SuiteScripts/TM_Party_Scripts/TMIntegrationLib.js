/**
 *  TRAQ Manager – generic sender
 *  @NApiVersion 2.1
 *  @NModuleScope Public
 */
define([
  "N/record",
  "N/search",
  "N/runtime",
  "N/https",
  "N/email",
  "N/log",
  "N/format",
], (record, search, runtime, https, email, log, format) => {
  /*───────────────────────────────────────────────────────────────────────────*/
  /*  CONFIG – adjust / extend once, then forget                              */
  /*───────────────────────────────────────────────────────────────────────────*/

  // endpoint path for each entity we might push
  const ENDPOINT = {
    CUSTOMER: "/netsuite/customerupdate",
    CONSIGNEE: "/netsuite/consigneeupdate",
    CARRIER: "/netsuite/carrierupdate",
    SHIPPER: "/netsuite/shipperupdate",
    CONSIGNEE_SHIP_ADDRESS: "/netsuite/consigneeshipaddressupdate",
    SO: "/netsuite/orderupdate",
    LOAD: "/netsuite/loadupdate",
    ORDER_INVENTORY: "/netsuite/orderinventorystate",
  };

  /* builder function for each entity */
  const BUILDERS = {
    CUSTOMER: buildCustomerPayload,
    CONSIGNEE: buildConsigneePayload,
    CARRIER: buildCarrierPayload,
    SHIPPER: buildShipperPayload,
    CONSIGNEE_SHIP_ADDRESS: buildConsigneeShipAddressPayload,
    SO: buildSalesOrderPayload,
    LOAD: buildLoadPayload,
  };

  /*───────────────────────────────────────────────────────────────────────────*/
  /*  PUBLIC API                                                              */
  /*───────────────────────────────────────────────────────────────────────────*/

  function push(entityType, recId) {
    const script = runtime.getCurrentScript();
    //   const base   = script.getParameter('custscript_tm_baseurl');
    //   const token  = script.getParameter('custscript_tm_token');
    const base = "https://netsuitetest.anchub.ca";
    const token = "iryj8ibMLTLKOZa1HtOcSixzkmNjt16OPKhLNiIUDno";

    if (!ENDPOINT[entityType] || !BUILDERS[entityType]) {
      throw Error(`TMIntegrationLib: unsupported entityType ${entityType}`);
    }

    const builder = BUILDERS[entityType];
    let payload, resp;

    try {
      payload = builder(recId); // ➊ build JSON
    } catch (e) {
      return emailError(entityType, recId, "build-payload", e);
    }

    try {
      // ➋ POST it
      resp = https.post({
        url: base + ENDPOINT[entityType],
        headers: {
          "Content-Type": "application/json",
          Authorization: "Bearer " + token,
        },
        body: JSON.stringify(payload),
      });
    } catch (e) {
      return emailError(entityType, recId, "http-post", e, payload);
    }

    if (resp.code !== 200) {
      // ➌ API rejected
      return emailError(
        entityType,
        recId,
        `HTTP ${resp.code}`,
        resp.body,
        payload
      );
    }

    log.audit(`TM ${entityType} OK`, { recId, body: resp.body });
    return resp.body;
  }

  function build(entityType, recId) {
    const fn = BUILDERS[entityType];
    if (!fn)
      throw Error(
        `TMIntegrationLib.build: unsupported entityType ${entityType}`
      );
    return fn(recId);
  }


  /*───────────────────────────────────────────────────────────────────────────*/
  /*  BUILDERS – INPUT PARAMS ARE NATIVE internalid ONLY                      */
  /*───────────────────────────────────────────────────────────────────────────*/

  /** --------------------------------------------------------------------
   *  CUSTOMER  →  builds CustomerPayload (schema v2, July 2025)
   *  ------------------------------------------------------------------*/
  function buildCustomerPayload(recId) {
    /* 0 ▸ use provided native internalid */
    const custInternalId = recId;

    /* 1 ▸ load customer */
    const rec = record.load({ type: record.Type.CUSTOMER, id: custInternalId });

    /* 2 ▸ scalars ----------------------------------------------------- */

    let customerId = custInternalId;

    const customerName =
      rec.getValue("companyname") ||
      rec.getValue("altname") ||
      rec.getValue("entityid");

    /* currencyCode: 3-char symbol from currency record */
    const currencyId = rec.getValue("currency");
    let currencyCode = null;
    if (currencyId) {
      try {
        const cur = search.lookupFields({
          type: "currency",
          id: currencyId,
          columns: ["symbol"],
        });
        if (cur && cur.symbol) {
          currencyCode = String(cur.symbol).trim().slice(0, 3).toUpperCase();
        }
      } catch (e) {
        log.error("Currency lookup failed (Customer)", {
          recId: custInternalId,
          currencyId,
          error: e,
        });
      }
    }
    if (!currencyCode) {
      const txt = rec.getText("currency") || "";
      currencyCode =
        txt
          .replace(/[^A-Za-z]/g, "")
          .slice(0, 3)
          .toUpperCase() || null;
    }

    /* customerType + parent */
    let customerType = "PARENT";
    let customerParent = null;
    if (rec.getValue("parent") !== null && rec.getValue("parent") !== "") {
      customerType = rec.getValue("parent") === 9655 ? "INDEPENDENT" : "CHILD";
      customerParent = {
        customerParentId: rec.getValue("parent"),
        customerParentName: rec.getText("parent"),
      };
    }

    /* 3 ▸ address (default shipping) ---------------------------------- */
    let addressBlock = null;
    const addrLines = rec.getLineCount({ sublistId: "addressbook" }) || 0;
    for (let i = 0; i < addrLines; i++) {
      if (
        rec.getSublistValue({
          sublistId: "addressbook",
          fieldId: "defaultshipping",
          line: i,
        })
      ) {
        const a = rec.getSublistSubrecord({
          sublistId: "addressbook",
          fieldId: "addressbookaddress",
          line: i,
        });
        addressBlock = {
          address1: a.getValue("addr1"),
          address2: a.getValue("addr2") || null,
          city: a.getValue("city"),
          region: a.getValue("state"),
          postalCode: a.getValue("zip"),
          country: a.getValue("country"),
        };
        break;
      }
    }

    /* 4 ▸ consignees --------------------------------------------------- */
    const consignees = [];
    search
      .create({
        type: "customrecord_alberta_ns_consignee_record",
        filters: [["custrecord_alberta_ns_customer", "anyof", custInternalId]],
        columns: ["name", "custrecord_alberta_ns_consigneekey"],
      })
      .run()
      .each((r) => {
        consignees.push({
          consigneeId: r.id,
          consigneeName: r.getValue("name"),
        });
        return true;
      });

    /* 5 ▸ sales reps (primary + internal) ----------------------------- */
    const salesReps = [];
    const stdRep = rec.getValue("salesrep");
    if (stdRep) {
      const emp = record.load({ type: "employee", id: stdRep });
      salesReps.push({
        salesRepId: stdRep.toString(),
        salesRepType: "PRIMARY",
        salesRepName: emp.getText({ fieldId: "entityid" }),
        salesRepEmail: emp.getValue("email"),
      });
    }
    const intRep = rec.getValue("custentity_internalrep");
    if (intRep) {
      const emp =
        intRep === stdRep
          ? null
          : record.load({ type: "employee", id: intRep });
      salesReps.push({
        salesRepId: intRep.toString(),
        salesRepType: "INTERNAL",
        salesRepName: emp
          ? emp.getText({ fieldId: "entityid" })
          : rec.getText("custentity_internalrep"),
        salesRepEmail: emp ? emp.getValue("email") : null,
      });
    }

    /* 6 ▸ contacts ----------------------------------------------------- */
    const contacts = [];
    search
      .create({
        type: search.Type.CONTACT,
        filters: [
          ["company", "anyof", custInternalId],
          "AND",
          ["isinactive", "is", "F"],
        ],
        columns: ["internalid", "entityid", "email", "phone", "category"],
      })
      .run()
      .each((r) => {
        contacts.push({
          contactId: r.getValue("internalid"),
          contactType: r.getText("category"),
          contactName: r.getValue("entityid"),
          contactEmail: r.getValue("email") || null,
          phone: r.getValue("phone") || null,
          active: true,
        });
        return true;
      });

    /* 7 ▸ certifications ----------------------------------------------- */
    const certVals = rec.getValue("custentity_anc_certification");
    const certifications = [];
    (Array.isArray(certVals) ? certVals : certVals ? [certVals] : []).forEach(
      (v) => {
        certifications.push({ certificationType: v, effectiveDate: null });
      }
    );

    /* 8 ▸ notes -------------------------------------------------------- */
    const noteTxt = rec.getValue("comments");
    const notes = noteTxt ? [{ noteType: "GENERAL", note: noteTxt }] : null;

    /* 9 ▸ assemble ----------------------------------------------------- */
    return {
      customerId,
      customerType,
      customerName,
      customerParent,
      active: rec.getValue("isinactive") !== "T",
      currencyCode,
      useParentForCustomsInvoice: false,
      address: addressBlock,
      consignees: consignees.length ? consignees : null,
      salesReps: salesReps.length ? salesReps : null,
      contacts: contacts.length ? contacts : null,
      ediIdentifiers: [],
      notes,
      attributes: null,
      certifications: certifications.length ? certifications : null,
    };
  }

  /** --------------------------------------------------------------------
   *  CONSIGNEE  →  builds ConsigneePayload (schema v3 / July 2025)
   *  ------------------------------------------------------------------*/
  function buildConsigneePayload(recId) {
    var consInternalId = recId; // internalid only

    /* 1 ▸ load consignee master (1421) */
    const rec = record.load({
      type: "customrecord_anc_consigneemaster",
      id: consInternalId,
    });

    /* 2 ▸ scalars */
    const consigneeId = consInternalId;
    const consigneeName = rec.getValue("name");
    const active = rec.getValue("isinactive") !== "T";
    const shipmentTerms =
      rec.getText("custrecord_anc_conmaster_transmode") || null;

    /* TODO: replace fieldId below if/when a real Consignee Type field exists */
    const consigneeType =
      rec.getText("custrecord_anc_consignee_type") || "STANDARD";

    /* 3 ▸ preferences → notes[] */
    const notes = [];

    const dow = rec.getText("custrecord_anc_conmaster_delivery"); // list-of-days
    if (dow) notes.push({ noteType: "PREF_DAY_OF_WEEK", note: dow });

    // delivery window: use display text; fall back to raw value
    let delWindowTxt = rec.getText("custrecord_anc_conmaster_deliveryhours");
    if (!delWindowTxt)
      delWindowTxt = rec.getValue("custrecord_anc_conmaster_deliveryhours"); // e.g., '5:00 pm'
    if (delWindowTxt)
      notes.push({ noteType: "PREF_DELIVERY_WINDOW", note: delWindowTxt });

    const instr = rec.getValue("custrecord_anc_conmaster_deliveryinstr"); // text
    if (instr) notes.push({ noteType: "DELIVERY_INSTRUCTION", note: instr });

    /* 4 ▸ alt-addresses (1422) → pick PRIMARY for top-level address,
        send ALL as {id,name} in consigneeShipAddresses[].              */
    let primaryAddress = null;
    const consigneeShipAddresses = [];

    search
      .create({
        type: "customrecord_anc_consigneealtaddress",
        filters: [
          ["custrecord_anc_consaltadr_consignee", "anyof", consInternalId],
          "AND",
          ["isinactive", "is", "F"],
        ],
        columns: [
          "internalid",
          "custrecord_anc_conmaster_addr_primary",
          "custrecord_anc_conmaster_addr_addr1",
          "custrecord_anc_conmaster_addr_addr2",
          "custrecord_anc_conmaster_addr_city",
          "custrecord_anc_conmaster_addr_state",
          "custrecord_anc_conmaster_addr_zip",
          "custrecord_anc_conmaster_addr_country",
        ],
      })
      .run()
      .each((r) => {
        // For list: just ID + Name
        consigneeShipAddresses.push({
          consigneeShipAddressId: r.getValue("internalid"),
        });

        // Also capture address details if this line is PRIMARY (for top-level)
        if (r.getValue("custrecord_anc_conmaster_addr_primary") === "T") {
          primaryAddress = {
            address1: r.getValue("custrecord_anc_conmaster_addr_addr1"),
            address2: r.getValue("custrecord_anc_conmaster_addr_addr2") || null,
            city: r.getValue("custrecord_anc_conmaster_addr_city"),
            region: r.getText("custrecord_anc_conmaster_addr_state") || null,
            postalCode: r.getValue("custrecord_anc_conmaster_addr_zip"),
            country: r.getText("custrecord_anc_conmaster_addr_country") || null,
          };
        }
        return true;
      });

    /* Fallback: promote first alt address to top-level if no PRIMARY flag */
    if (!primaryAddress && consigneeShipAddresses.length) {
      const promoteId = consigneeShipAddresses[0].consigneeShipAddressId;
      try {
        search
          .create({
            type: "customrecord_anc_consigneealtaddress",
            filters: [["internalid", "anyof", promoteId]],
            columns: [
              "custrecord_anc_conmaster_addr_addr1",
              "custrecord_anc_conmaster_addr_addr2",
              "custrecord_anc_conmaster_addr_city",
              "custrecord_anc_conmaster_addr_state",
              "custrecord_anc_conmaster_addr_zip",
              "custrecord_anc_conmaster_addr_country",
            ],
          })
          .run()
          .each((r) => {
            primaryAddress = {
              address1: r.getValue("custrecord_anc_conmaster_addr_addr1"),
              address2:
                r.getValue("custrecord_anc_conmaster_addr_addr2") || null,
              city: r.getValue("custrecord_anc_conmaster_addr_city"),
              region: r.getText("custrecord_anc_conmaster_addr_state") || null,
              postalCode: r.getValue("custrecord_anc_conmaster_addr_zip"),
              country:
                r.getText("custrecord_anc_conmaster_addr_country") || null,
            };
            return false; // stop after one
          });
      } catch (e) {
        // leave primaryAddress null if lookup fails
      }
    }

    /* 5 ▸ contacts -------------------------------------------------------- */
    const contacts = [];

    // Free-text contact name on master
    const txtContact = rec.getValue("custrecord_anc_consmaster_contact");
    if (txtContact) {
      contacts.push({
        contactId: null,
        contactType: "PRIMARY",
        contactName: txtContact,
        contactEmail: null,
        phone: null,
        active: true,
      });
    }

    // Contact records linked to this consignee master (company join)
    search
      .create({
        type: search.Type.CONTACT,
        filters: [
          ["company", "anyof", consInternalId],
          "AND",
          ["isinactive", "is", "F"],
        ],
        columns: ["internalid", "entityid", "email", "phone", "contactrole"],
      })
      .run()
      .each((r) => {
        contacts.push({
          contactId: r.getValue("internalid"),
          contactType: r.getText("contactrole") || "UNSPECIFIED",
          contactName: r.getValue("entityid"),
          contactEmail: r.getValue("email") || null,
          phone: r.getValue("phone") || null,
          active: true,
        });
        return true;
      });

    /* 6 ▸ assemble payload */
    return {
      consigneeId,
      consigneeName,
      active,
      shipmentTerms,
      consigneeType,
      address: primaryAddress,
      consigneeShipAddresses: consigneeShipAddresses.length
        ? consigneeShipAddresses
        : null,
      contacts: contacts.length ? contacts : null,
      ediIdentifiers: [], // none yet
      notes: notes.length ? notes : null,
      attributes: [], // none yet
    };
  }

  /** --------------------------------------------------------------------
   *  CARRIER  →  builds CarrierPayload (schema v2, July 2025)
   *              • INPUT must be native internalid
   *  ------------------------------------------------------------------*/
  function buildCarrierPayload(vendorIdInput) {
    // 0 ▸ use native internalid directly
    var vendorInternalId = vendorIdInput;

    // 1 ▸ load vendor
    var rec = record.load({ type: record.Type.VENDOR, id: vendorInternalId });

    if (!rec.getValue("custentity_anc_vendor_iscarrier")) {
      throw Error(
        "Vendor " + vendorInternalId + " is not flagged as a carrier"
      );
    }

    // 2 ▸ scalars
    var carrierId = vendorInternalId;
    var carrierName = rec.getValue("companyname") || rec.getValue("entityid");
    var active = rec.getValue("isinactive") !== "T";

    // currency → 3-char symbol
    var currencyId = rec.getValue("currency");
    var currency = null;
    if (currencyId) {
      try {
        var cur = search.lookupFields({
          type: "currency",
          id: currencyId,
          columns: ["symbol"],
        });
        if (cur && cur.symbol) {
          currency = String(cur.symbol).trim().slice(0, 3).toUpperCase();
        }
      } catch (e) {
        log.error("Currency lookup failed (Carrier)", {
          vendorInternalId,
          currencyId,
          error: e,
        });
      }
    }
    if (!currency) {
      var txt = rec.getText("currency") || "";
      currency =
        txt
          .replace(/[^A-Za-z]/g, "")
          .slice(0, 3)
          .toUpperCase() || null;
    }

    var transportationMode =
      rec.getText("custentity_anc_vendor_transmode") || null;

    // 3 ▸ address (default shipping, fallback to first)
    var primaryAddress = null;
    var addrCnt = rec.getLineCount({ sublistId: "addressbook" }) || 0;
    for (var i = 0; i < addrCnt; i++) {
      var sub = rec.getSublistSubrecord({
        sublistId: "addressbook",
        fieldId: "addressbookaddress",
        line: i,
      });
      var addrObj = {
        address1: sub.getValue("addr1"),
        address2: sub.getValue("addr2") || null,
        city: sub.getValue("city"),
        region: sub.getValue("state"),
        postalCode: sub.getValue("zip"),
        country: sub.getValue("country"),
      };
      if (
        rec.getSublistValue({
          sublistId: "addressbook",
          fieldId: "defaultshipping",
          line: i,
        })
      ) {
        primaryAddress = addrObj;
        break;
      }
    }
    if (!primaryAddress && addrCnt) {
      var sub0 = rec.getSublistSubrecord({
        sublistId: "addressbook",
        fieldId: "addressbookaddress",
        line: 0,
      });
      primaryAddress = {
        address1: sub0.getValue("addr1"),
        address2: sub0.getValue("addr2") || null,
        city: sub0.getValue("city"),
        region: sub0.getValue("state"),
        postalCode: sub0.getValue("zip"),
        country: sub0.getValue("country"),
      };
    }

    // 4 ▸ contacts
    var contacts = [];
    search
      .create({
        type: search.Type.CONTACT,
        filters: [
          ["company", "anyof", vendorInternalId],
          "AND",
          ["isinactive", "is", "F"],
        ],
        columns: ["internalid", "entityid", "email", "phone", "contactrole"],
      })
      .run()
      .each(function (r) {
        contacts.push({
          contactId: r.getValue("internalid"),
          contactType: r.getText("contactrole") || "UNSPECIFIED",
          contactName: r.getValue("entityid"),
          contactEmail: r.getValue("email") || null,
          phone: r.getValue("phone") || null,
          active: true,
        });
        return true;
      });

    // 5 ▸ notes
    var notes = [];
    var phone = rec.getValue("phone");
    if (phone) notes.push({ noteType: "PHONE", note: phone });
    var fax = rec.getValue("fax");
    if (fax) notes.push({ noteType: "FAX", note: fax });

    // 6 ▸ assemble
    return {
      carrierId,
      carrierName,
      active,
      currency,
      transportationMode,
      address: primaryAddress,
      contacts: contacts.length ? contacts : null,
      ediIdentifiers: [],
      notes: notes.length ? notes : null,
      attributes: null,
    };
  }

  /** --------------------------------------------------------------------
   *  SHIPPER  →  builds the ShipperPayload schema (Location record)
   *              • INPUT must be native internalid
   *              • custrecord_loc_consigneekey kept as a single string
   * ------------------------------------------------------------------*/
  function buildShipperPayload(locIdInput) {
    /* 0 ▸ use native internalid */
    var locInternalId = locIdInput;

    /* 1 ▸ load Location */
    var loc = record.load({ type: record.Type.LOCATION, id: locInternalId });

    /* 2 ▸ grab the raw key string */
    var keyRaw = (loc.getValue("custrecord_loc_consigneekey") || "").trim();

    /* 3 ▸ best-effort name lookup (may fail → "(unknown)") */
    var consigneeName = "(unknown)";
    try {
      var hit = search
        .create({
          type: "customrecord_anc_consigneemaster",
          filters: [["custrecord_anc_consignee_key", "is", keyRaw]],
          columns: ["name"],
        })
        .run()
        .getRange({ start: 0, end: 1 });

      if (hit.length) consigneeName = hit[0].getValue("name");
    } catch (e) {
      // ignore lookup errors
    }

    /* 4 ▸ assemble payload */
    return {
      shipperId: locInternalId,
      shipperName: loc.getValue("name"),
      active: loc.getValue("isinactive") !== "T",
      consignee: {
        consigneeId: keyRaw,
        consigneeName: consigneeName,
      },
    };
  }

  /*───────────────────────────────────────────────────────────────────────────*/
  /*  CONSIGNEE SHIP ADDRESS  –  builds ConsigneeShipAddressPayload           */
  /*───────────────────────────────────────────────────────────────────────────*/
  function buildConsigneeShipAddressPayload(addrId) {
    /* 1 ▸ load the alt-address record (1422) */
    const addrRec = record.load({
      type: "customrecord_anc_consigneealtaddress",
      id: addrId,
    });

    /* 2 ▸ resolve parent Consignee master (1421) */
    const consigneeRecId = addrRec.getValue(
      "custrecord_anc_consaltadr_consignee"
    );

    let consigneeId = "(unknown)";
    let consigneeName = "(unknown)";

    try {
      const consRec = record.load({
        type: "customrecord_anc_consigneemaster",
        id: consigneeRecId,
      });
      consigneeId = consigneeRecId;
      consigneeName = consRec.getValue("name") || "(unknown)";
    } catch (e) {
      // keep “(unknown)” – best-effort lookup
    }

    /* 3 ▸ scalar fields */
    const payload = {
      consigneeShipAddressId:
        addrRec.getValue("externalid") || addrId.toString(),
      consigneeShipAddressName: addrRec.getValue("name"),
      active: addrRec.getValue("isinactive") !== "T",

      consignee: {
        consigneeId,
        consigneeName,
      },

      address: {
        address1: addrRec.getValue("custrecord_anc_conmaster_addr_addr1"),
        address2:
          addrRec.getValue("custrecord_anc_conmaster_addr_addr2") || null,
        city: addrRec.getValue("custrecord_anc_conmaster_addr_city"),
        region: addrRec.getText("custrecord_anc_conmaster_addr_state") || null,
        postalCode: addrRec.getValue("custrecord_anc_conmaster_addr_zip"),
        country:
          addrRec.getText("custrecord_anc_conmaster_addr_country") || null,
      },

      notes: buildShipAddrNotes(addrRec), // helper below
    };

    return payload;
  }

  /* helper to translate free-text fields → notes[] */
  function buildShipAddrNotes(r) {
    const notes = [];

    const attn = r.getValue("custrecord_anc_conmaster_addr_attention");
    if (attn) notes.push({ noteType: "ATTENTION", note: attn });

    const instr = r.getValue("custrecord_anc_conmaster_addr_instr");
    if (instr) notes.push({ noteType: "DELIVERY_INSTRUCTION", note: instr });

    const phone = r.getValue("custrecord_anc_conmaster_addr_phone");
    if (phone)
      notes.push({ noteType: "PHONE", note: phone.replace(/\D/g, "") });

    return notes.length ? notes : null;
  }

  // helpers (add near top of file or inside the module)
  function toIsoDateTime(val) {
    if (!val) return null;
    const d = val instanceof Date ? val : new Date(val);
    return isNaN(d) ? null : d.toISOString(); // ISO 8601 with time
  }
  function toNum(v, fallback = null) {
    const n = Number(v);
    return Number.isFinite(n) ? n : fallback;
  }

  /**
   * Requires: N/record, N/search
   */
  function buildSalesOrderPayload(recId) {
    const soRec = record.load({ type: record.Type.SALES_ORDER, id: recId });

    const millOrderNumber = soRec.getValue("tranid");

    // strings are fine for these two, but make sure they exist
    const purchaseOrderNumber = String(soRec.getValue("otherrefnum") || "");
    const referenceNumber = String(
      soRec.getValue("custbody_anc_consignee_ordrefnum") || ""
    );

    // allocationMonth & lastDateChange as ISO (UTC @ 00:00)
    const trandate = soRec.getValue("trandate");
    let allocationMonth = null;
    if (trandate) {
      const d = new Date(trandate);
      d.setUTCDate(1);
      d.setUTCHours(0, 0, 0, 0);
      allocationMonth = d.toISOString();
    }

    const ldcDays = parseInt(soRec.getValue("custbody_anc_ldc"), 10);
    let lastDateChange = null;
    if (trandate && !isNaN(ldcDays)) {
      const d = new Date(trandate);
      d.setDate(d.getDate() + ldcDays);
      d.setUTCHours(0, 0, 0, 0);
      lastDateChange = d.toISOString();
    }

    const orderStatus = soRec.getText("custbody_anc_sostatus");
    const orderType = soRec.getText("custbody_anc_ordertype"); // "STANDARD" etc.
    const revisionNo = toNum(soRec.getValue("version"), 1);

    const customer = {
      customerId: String(soRec.getValue("entity")),
      customerName: soRec.getText("entity"),
    };

    const orderHeaderNotes = [
      {
        noteType: "SHIPPING",
        note: soRec.getValue("memo") || "",
      },
    ];

    const lineItems = [];
    const lineCount = soRec.getLineCount({ sublistId: "item" }) || 0;

    const headerConsigneeId = soRec.getValue("custbody_consignee");
    const headerConsigneeName = soRec.getText("custbody_consignee");

    for (let i = 0; i < lineCount; i++) {
      // numbers per schema
      const millOrderLineNumber = toNum(
        soRec.getSublistValue({ sublistId: "item", fieldId: "line", line: i }),
        i + 1
      );

      const itemId = soRec.getSublistValue({
        sublistId: "item",
        fieldId: "item",
        line: i,
      });
      const itemText =
        soRec.getSublistText({ sublistId: "item", fieldId: "item", line: i }) ||
        "";
      const sku = (itemText.split(" : ")[1] || itemText || "").trim();

      // status (your logic – still forcing "Active")
      const lineItemStatusType = "Active";

      // line-level dates must be ISO datetimes (UTC)
      const lineLastDateChange = toIsoDateTime(
        soRec.getSublistValue({
          sublistId: "item",
          fieldId: "custcol_anc_ldcdate",
          line: i,
        })
      );
      const dateToShip =
        toIsoDateTime(
          soRec.getSublistValue({
            sublistId: "item",
            fieldId: "custcol_anc_shipdate",
            line: i,
          })
        ) || toIsoDateTime(soRec.getValue("custbody_anc_deliverydate"));
      const firmDateToShip = Boolean(dateToShip); // replace if you add a real boolean later

      const shipperId = String(
        soRec.getSublistValue({
          sublistId: "item",
          fieldId: "location",
          line: i,
        }) || ""
      );
      const shipperName =
        soRec.getSublistText({
          sublistId: "item",
          fieldId: "location",
          line: i,
        }) || "";

      const qtyRolls = toNum(
        soRec.getSublistValue({
          sublistId: "item",
          fieldId: "quantity",
          line: i,
        }),
        0
      );
      const orderWeightPerRoll = toNum(
        soRec.getSublistValue({
          sublistId: "item",
          fieldId: "custcol_anc_orderweight",
          line: i,
        }),
        0
      );

      // numeric price
      const price = toNum(
        soRec.getSublistValue({ sublistId: "item", fieldId: "rate", line: i }),
        0
      );

      // ---- NEW: pull product attributes from the item record itself
      const itemFields = lookupItemFields(itemId, [
        "custitem_roll_width_metric", // cm
        "custitem_roll_diameter_metric", // cm
        "custitem_roll_rpp", // 1|2
        "custitem_anc_grade",
        "custitem_anc_core",
        "custitem_anc_wraptype", // AAA|BBB
        "custitem_roll_width_imperial", // in
        "custitem_item_diameter_imperial", // in
      ]);

      const product = {
        sku,
        grade: getScalar(itemFields, "custitem_anc_grade"),
        width: toNum(getScalar(itemFields, "custitem_roll_width_metric"), null),
        diameter: toNum(
          getScalar(itemFields, "custitem_roll_diameter_metric"),
          null
        ),
        widthImperial: toNum(
          getScalar(itemFields, "custitem_roll_width_imperial"),
          null
        ),
        diameterImperial: toNum(
          getScalar(itemFields, "custitem_item_diameter_imperial"),
          null
        ),
        core: getScalar(itemFields, "custitem_anc_core"),
        rollPerPack: toNum(getScalar(itemFields, "custitem_roll_rpp"), 1),
        wrapType: getScalar(itemFields, "custitem_anc_wraptype") || "AAA",
      };

      const orderItemNotes = [{ noteType: "SHIPPING", note: "placeholder" }];

      lineItems.push({
        millOrderLineNumber,
        lineItemStatusType,
        // optional but kept; not in sample list, but harmless to include if your schema allows
        lastDateChange: lineLastDateChange,

        dateToShip,
        firmDateToShip,
        orderItemType: "STANDARD",
        rollPosition: "ANY",

        shipper: {
          shipperId,
          shipperName,
          shipperConsignee: headerConsigneeId
            ? {
                consigneeId: String(headerConsigneeId),
                consigneeName: headerConsigneeName,
              }
            : undefined,
        },

        consignee: {
          consigneeId: String(headerConsigneeId || ""),
          consigneeName: headerConsigneeName || "",
        },

        product,
        labelMark: "WALGREENS",
        quantity: {
          value: (orderWeightPerRoll || 0) * (qtyRolls || 0),
          uom: "MT",
        },
        rolls: qtyRolls || 0,
        price,
        orderItemNotes,
      });
    }

    const orderHeader = {
      millOrderNumber,
      purchaseOrderNumber,
      referenceNumber,
      allocationMonth,
      lastDateChange,
      orderStatus,
      orderType,
      revisionNo,
      customer,
      orderHeaderNotes,
    };

    return { orderHeader, lineItems };

    // ----------------- helpers -----------------

    function toNum(v, def = null) {
      const n = Number(v);
      return Number.isFinite(n) ? n : def;
    }

    function toIsoDateTime(v) {
      if (!v) return null;
      const d = new Date(v);
      if (isNaN(d.getTime())) return null;
      d.setUTCHours(0, 0, 0, 0);
      return d.toISOString();
    }

    function getScalar(lookupResult, fieldId) {
      // search.lookupFields returns primitives or arrays of objects depending on field type
      const val = lookupResult && lookupResult[fieldId];
      if (val == null) return null;
      if (Array.isArray(val)) {
        // handle list/record fields; take first text or value
        if (!val.length) return null;
        const first = val[0];
        return first.text != null
          ? first.text
          : first.value != null
          ? first.value
          : null;
      }
      if (typeof val === "object" && val.value != null) return val.value;
      return val;
    }

    function lookupItemFields(id, columns) {
      if (!id) return {};
      try {
        // Most of these rolls are standard inventory items; adjust if your catalog uses other types.
        return search.lookupFields({
          type: search.Type.INVENTORY_ITEM,
          id,
          columns,
        });
      } catch (eInv) {
        // Fallbacks in case some items are non-inventory or assemblies.
        try {
          return search.lookupFields({
            type: search.Type.ASSEMBLY_ITEM,
            id,
            columns,
          });
        } catch (eAsm) {
          try {
            return search.lookupFields({
              type: search.Type.NON_INVENTORY_ITEM,
              id,
              columns,
            });
          } catch (eNon) {
            // Last resort: return empty so we don't blow up the payload build
            log &&
              log.debug &&
              log.debug("lookupItemFields", { id, err: eNon });
            return {};
          }
        }
      }
    }
  }

  function buildLoadPayload(recId) {
    const loadRec = record.load({ type: "customsale_anc_shipment", id: recId });

    const loadNumber = loadRec.getValue("tranid");

    let loadStatus = "Amended";
    if (
      loadRec.getValue("voided") === true ||
      (loadRec.getText("status") || "").toUpperCase().includes("CANCEL")
    ) {
      loadStatus = "Cancelled";
    } else if (Number(loadRec.getValue("version")) === 1) {
      loadStatus = "New";
    }

    const version = toNum(loadRec.getValue("version"), 1);
    const loadMethod = loadRec.getText("custbody_anc_ship_loadmethod");

    const dateToShip = toIsoDateTime(loadRec.getValue("custbody_anc_shipdate"));
    const dateToDeliver = toIsoDateTime(
      loadRec.getValue("custbody_anc_deliverydate")
    );
    const firmDateToShip = true;

    const customer = {
      customerId: String(loadRec.getValue("entity") || ""),
      customerName: loadRec.getText("entity") || "",
    };

    const shipperId = String(loadRec.getValue("location") || "");
    const shipperName = loadRec.getText("location") || "";

    let shipperConsignee = null;
    if (shipperId) {
      const hit = search
        .create({
          type: "customrecord_anc_consigneemaster",
          filters: [["custrecord_anc_conmaster_location", "anyof", shipperId]],
          columns: ["internalid", "name"],
        })
        .run()
        .getRange({ start: 0, end: 1 });
      if (hit && hit.length) {
        shipperConsignee = {
          consigneeId: hit[0].getValue("internalid"),
          consigneeName: hit[0].getValue("name"),
        };
      }
    }

    let consignee = null;
    const consRecId = loadRec.getValue("custbody_consignee");
    if (consRecId) {
      const lf = search.lookupFields({
        type: "customrecord_alberta_ns_consignee_record",
        id: consRecId,
        columns: ["custrecord_anc_custcons_consignee"],
      });
      const arr = Array.isArray(lf.custrecord_anc_custcons_consignee)
        ? lf.custrecord_anc_custcons_consignee
        : [];
      const pair = arr.length ? arr[0] : null;
      if (pair)
        consignee = { consigneeId: pair.value, consigneeName: pair.text };
    }

    const transport = {
      transportMode: loadRec.getText("custbody_anc_transportmode") || null,
      equipmentType: loadRec.getText("custbody_anc_equipment") || null,
    };

    const references = [];
    const refVal = loadRec.getValue("custbody_anc_consignee_ordrefnum");
    if (refVal)
      references.push({
        referenceType: "customerLoadNumber",
        referenceValue: refVal,
      });

    const lineItems = [];
    const certSet = new Set();
    const lineCount = loadRec.getLineCount({ sublistId: "item" }) || 0;

    for (let i = 0; i < lineCount; i++) {
      const soInternalId = loadRec.getSublistValue({
        sublistId: "item",
        fieldId: "custcol_anc_relatedtransaction",
        line: i,
      });
      const relatedLineUniqueId = loadRec.getSublistValue({
        sublistId: "item",
        fieldId: "custcol_anc_relatedlineuniquekey",
        line: i,
      });
      const rolls = toNum(
        loadRec.getSublistValue({
          sublistId: "item",
          fieldId: "quantity",
          line: i,
        }),
        0
      );

      if (!soInternalId) continue; // skip if no SO link

      let millOrderNumber = null;
      let millOrderLineNumber = null;
      let orderType = null;
      let shipInFull = false;

      try {
        const so = record.load({
          type: record.Type.SALES_ORDER,
          id: soInternalId,
        });
        millOrderNumber = so.getValue("tranid");
        orderType = so.getText("custbody_anc_ordertype") || null;

        // find SO line with matching unique key, then take the SO sublist field 'line' for the line number
        const soItemCnt = so.getLineCount({ sublistId: "item" }) || 0;
        for (let j = 0; j < soItemCnt; j++) {
          const keyOnSO = so.getSublistValue({
            sublistId: "item",
            fieldId: "lineuniquekey",
            line: j,
          });
          if (String(keyOnSO) === String(relatedLineUniqueId)) {
            const soLineFieldVal = so.getSublistValue({
              sublistId: "item",
              fieldId: "line",
              line: j,
            });
            millOrderLineNumber = toNum(soLineFieldVal, null); // <-- exact SO 'line' value
            shipInFull = !!so.getSublistValue({
              sublistId: "item",
              fieldId: "custcol_anc_shipall",
              line: j,
            });
            break;
          }
        }

        const certText = so.getText("custbody_anc_certification");
        if (certText)
          (Array.isArray(certText) ? certText : [certText]).forEach((v) =>
            certSet.add(v)
          );
      } catch (e) {
        log &&
          log.error &&
          log.error("buildLoadPayload: SO load/parse failed", {
            soInternalId,
            relatedLineUniqueId,
            e,
          });
      }

      lineItems.push({
        orderLink: { millOrderNumber, millOrderLineNumber, orderType },
        rolls,
        shipInFull,
      });
    }

    const certifications = Array.from(certSet).map((c) => ({
      certification: c,
    }));

    return {
      loadNumber,
      loadStatus,
      version,
      loadMethod,
      dateToShip,
      dateToDeliver,
      firmDateToShip,
      customer,
      shipper: { shipperId, shipperName, shipperConsignee },
      consignee,
      transport,
      references: references.length ? references : null,
      lineItems,
      certifications: certifications.length ? certifications : null,
    };
  }

  /**
   * Fetch order inventory state quantities for a given SO and line number
   * @param {string} tranid - Sales Order transaction id (e.g. "SO85458")
   * @param {number} lineNumber - line number to match
   * @returns {Array|Null} quantities array or null if not found
   */
  function fetchOrderInventoryQuantities(tranid, lineNumber) {
    const base = "https://netsuitetest.anchub.ca";
    const token = "iryj8ibMLTLKOZa1HtOcSixzkmNjt16OPKhLNiIUDno";

    try {
      const resp = https.post({
        url: base + ENDPOINT.ORDER_INVENTORY,
        headers: {
          "Content-Type": "application/json",
          Authorization: "Bearer " + token,
        },
        body: JSON.stringify([tranid]), // always one order
      });

      if (resp.code !== 200) {
        log.error("fetchOrderInventoryQuantities failed", resp.body);
        return null;
      }

      const data = JSON.parse(resp.body);
      if (!Array.isArray(data)) return null;

      for (const entry of data) {
        if (
          entry.orderLink &&
          entry.orderLink.millOrderNumber === tranid &&
          Number(entry.orderLink.millOrderLineNumber) === Number(lineNumber)
        ) {
          return entry.quantities || null;
        }
      }

      return null;
    } catch (e) {
      log.error("fetchOrderInventoryQuantities exception", e);
      return null;
    }
  }

  return { push, build, fetchOrderInventoryQuantities };

  /*───────────────────────────────────────────────────────────────────────────*/
  /*  ERROR HELPER – mails Bashar + writes log                                */
  /*───────────────────────────────────────────────────────────────────────────*/

  function emailError(entityType, recId, step, details, payload) {
    // log payload no matter what:
    log.error("TRAQ sync failed", { entityType, recId, step, payload });
    const subj = `TRAQ sync failed: ${entityType} ${recId} at ${step}`;
    const body = `
     Record ID: ${recId}
     Entity    : ${entityType}
     Step      : ${step}

     Details:
     ${
       typeof details === "string"
         ? details
         : details.message || JSON.stringify(details)
     }

     Payload (may be partial):
     ${JSON.stringify(payload, null, 2)}
  `;

    email.send({
      author: 427512, // -5 = default “System”
      recipients: "basharh@albertanewsprint.com",
      subject: subj,
      body: body,
    });

    log.error(subj, body);
    throw Error(subj); // bubble up so caller still sees failure
  }
});
