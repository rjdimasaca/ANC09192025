/**
 * @NApiVersion 2.x
 * @NScriptType ClientScript
 * @NModuleScope SameAccount
 */
define(["N/currentRecord", "N/search"], /**
 * @param{currentRecord} currentRecord
 * @param{search}        search
 */
function (currentRecord, search) {
  /**
   * Function to be executed after page is initialized.
   *
   * @param {Object} scriptContext
   * @param {Record} scriptContext.currentRecord - Current form record
   * @param {string} scriptContext.mode - The mode in which the record is being accessed (create, copy, or edit)
   *
   * @since 2015.2
   */
  function pageInit(scriptContext) {}

  /**
   * Function to be executed when field is changed.
   *
   * @param {Object} scriptContext
   * @param {Record} scriptContext.currentRecord - Current form record
   * @param {string} scriptContext.sublistId - Sublist name
   * @param {string} scriptContext.fieldId - Field name
   * @param {number} scriptContext.lineNum - Line number. Will be undefined if not a sublist or matrix field
   * @param {number} scriptContext.columnNum - Line number. Will be undefined if not a matrix field
   *
   * @since 2015.2
   */
  function fieldChanged(scriptContext) {}

  /**
   * Function to be executed when field is slaved.
   *
   * @param {Object} scriptContext
   * @param {Record} scriptContext.currentRecord - Current form record
   * @param {string} scriptContext.sublistId - Sublist name
   * @param {string} scriptContext.fieldId - Field name
   *
   * @since 2015.2
   */
  function postSourcing(scriptContext) {}

  /**
   * Function to be executed after sublist is inserted, removed, or edited.
   *
   * @param {Object} scriptContext
   * @param {Record} scriptContext.currentRecord - Current form record
   * @param {string} scriptContext.sublistId - Sublist name
   *
   * @since 2015.2
   */
  function sublistChanged(scriptContext) {}

  /**
   * Function to be executed after line is selected.
   *
   * @param {Object} scriptContext
   * @param {Record} scriptContext.currentRecord - Current form record
   * @param {string} scriptContext.sublistId - Sublist name
   *
   * @since 2015.2
   */
  function lineInit(scriptContext) {}

  /**
   * Validation function to be executed when field is changed.
   *
   * @param {Object} scriptContext
   * @param {Record} scriptContext.currentRecord - Current form record
   * @param {string} scriptContext.sublistId - Sublist name
   * @param {string} scriptContext.fieldId - Field name
   * @param {number} scriptContext.lineNum - Line number. Will be undefined if not a sublist or matrix field
   * @param {number} scriptContext.columnNum - Line number. Will be undefined if not a matrix field
   *
   * @returns {boolean} Return true if field is valid
   *
   * @since 2015.2
   */
  function validateField(scriptContext) {
    var retVal = true;
    if (scriptContext.currentRecord.type != "customlist1368") {
      try {
        console.log("validateField scriptContext", scriptContext);
        // alert(1)
        var nameVal = scriptContext.currentRecord.getValue({
          fieldId: "name",
        });
        nameVal = Number(nameVal);
        if (nameVal == "NaN") {
          return false;
        }
        console.log("validateField nameVal", nameVal);
        const regex = /^\d+(\.\d{1,2})?$/;
        return regex.test(nameVal);
      } catch (e) {
        console.log("error in function validateField", e);
      }
    }

    return retVal;
  }

  /**
   * Validation function to be executed when sublist line is committed.
   *
   * @param {Object} scriptContext
   * @param {Record} scriptContext.currentRecord - Current form record
   * @param {string} scriptContext.sublistId - Sublist name
   *
   * @returns {boolean} Return true if sublist line is valid
   *
   * @since 2015.2
   */
  function validateLine(scriptContext) {}

  /**
   * Validation function to be executed when sublist line is inserted.
   *
   * @param {Object} scriptContext
   * @param {Record} scriptContext.currentRecord - Current form record
   * @param {string} scriptContext.sublistId - Sublist name
   *
   * @returns {boolean} Return true if sublist line is valid
   *
   * @since 2015.2
   */
  function validateInsert(scriptContext) {}

  /**
   * Validation function to be executed when record is deleted.
   *
   * @param {Object} scriptContext
   * @param {Record} scriptContext.currentRecord - Current form record
   * @param {string} scriptContext.sublistId - Sublist name
   *
   * @returns {boolean} Return true if sublist line is valid
   *
   * @since 2015.2
   */
  function validateDelete(scriptContext) {}

  /**
   * Validation function to be executed when record is saved.
   *
   * @param {Object} scriptContext
   * @param {Record} scriptContext.currentRecord - Current form record
   * @returns {boolean} Return true if record is valid
   *
   * @since 2015.2
   */
  function saveRecord(scriptContext) {
    console.log("saveRecord scriptContext", scriptContext);
    var retVal = true;
    try {
      if (scriptContext.currentRecord.type != "customlist1368") {
        console.log("saveRecord scriptContext", scriptContext);
        // alert(1)
        var nameVal = scriptContext.currentRecord.getValue({
          fieldId: "name",
        });
        nameVal = Number(nameVal);
        if (nameVal == "NaN") {
          return false;
        }
        console.log("saveRecord nameVal", nameVal);
        const regex = /^\d+(\.\d{1,2})?$/;
        if (!regex.test(nameVal)) {
          return false;
        }
      }
      // --- Added: Uniqueness check against existing records ---
      var listType = scriptContext.currentRecord.type;
      console.log("listType ", listType);
      var nameString = scriptContext.currentRecord.getValue({
        fieldId: "name",
      }); // Added

      var customlist1366SearchObj = search.create({
        type: listType,
        filters: [["name", "is", nameString]],
        columns: [
          search.createColumn({ name: "name", label: "Name" }),
          search.createColumn({ name: "scriptid", label: "Script ID" }),
        ],
      }); // Added
      var searchResultCount = customlist1366SearchObj.runPaged().count;
      log.debug("customlist1366SearchObj result count", searchResultCount);
      if (searchResultCount > 0) {
        alert(
          "A record with this name already exists. Please enter a unique name."
        );
        return false;
      }

      return true;
    } catch (e) {
      console.log("error in function saveRecord", e);
    }
    return retVal;
  }

  return {
    // pageInit: pageInit,
    // fieldChanged: fieldChanged,
    // postSourcing: postSourcing,
    // sublistChanged: sublistChanged,
    // lineInit: lineInit,
    validateField: validateField,
    // validateLine: validateLine,
    // validateInsert: validateInsert,
    // validateDelete: validateDelete,
    saveRecord: saveRecord,
  };
});
