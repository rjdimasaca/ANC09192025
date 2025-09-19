/**
 * @NApiVersion 2.1
 * @NScriptType ClientScript
 */
define([
  'N/currentRecord',
  'N/url',
  'N/ui/dialog'
], (currentRecord, url, dialog) => {

  /**
   * Function to be executed after page is initialized.
   * @param {Object} context - The context for the pageInit event.
   */
  function pageInit(context) {
  }

  /**
   * Function to be executed when a field is changed.
   * @param {Object} context - The context for the fieldChanged event.
   */
  function fieldChanged(context) {
    const fieldId = context.fieldId;
    if (fieldId === 'custpage_item' || fieldId === 'custpage_location') {
      const rec = currentRecord.get();
      const itemId = rec.getValue({ fieldId: 'custpage_item' });
      const locId  = rec.getValue({ fieldId: 'custpage_location' });

      if (itemId && locId) {
        // Build the Suitelet URL with item and location parameters.
        const suiteletUrl = url.resolveScript({
          scriptId:     '5716',
          deploymentId: '2',
          params:       { itemId, locId }
        });

        // Disable the unsaved-changes warning before redirecting.
        window.onbeforeunload = null;

        // Redirect to the suitelet with the new parameters.
        window.location.href = suiteletUrl;
      }
    }
  }

  function saveRecord(context) {
    const rec         = currentRecord.get();
    const qtyOnHand   = parseInt(rec.getValue({ fieldId: 'custpage_qty_on_hand' }), 10) || 0;
    const lineCount   = rec.getLineCount({ sublistId: 'custpage_orders' });
    let totalCommitted = 0;

    for (let i = 0; i < lineCount; i++) {
      const lineQty = parseInt(rec.getSublistValue({
        sublistId: 'custpage_orders',
        fieldId : 'qtycom',
        line    : i
      }), 10) || 0;

      totalCommitted += lineQty;
    }

    // --- Client-side validation ---
    if (totalCommitted > qtyOnHand) {
      dialog.alert({
        title  : 'Quantity Overflow',
        message: `The total committed quantity (${totalCommitted}) ` +
                 `cannot exceed Quantity On Hand (${qtyOnHand}).\n\n` +
                 `Please correct the numbers and try again.`
      });
      return false;   // stops the POST - user stays on the page
    }

    return true;      // allow submit to continue
  }

  return {
    pageInit,
    fieldChanged,
    saveRecord
  };
});