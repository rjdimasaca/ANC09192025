/**
 * @NApiVersion 2.x
 * @NModuleScope Public
 * @Author TC010
 * @Email rmdimasaca@cloudtecherp.com
 * @Project Active One (a1)
 * @Date August 13, 2019
 * @Filename manpower.config.js
 */

define({
  billingForm: {
    clientScriptModulePath:
      'SuiteScripts/CLOUDTECH/010/box scripts/010CS_boxReport.js',
    title: 'Box Report',
    fieldGroups: [
      {
        id: '_filters',
        label: 'Filters'
      }
    ],
    fields: [
      {
        id: '_startdate',
        type: 'date',
        label: 'Start Date',
        isMandatory: true,
        container: '_filters',
        defaultvalue : new Date()
      },
      {
          id: '_enddate',
          type: 'date',
          label: 'End Date',
          isMandatory: true,
          container: '_filters',
          defaultvalue : new Date()
      },
      /*{
          id: '_removekeepref',
          type: 'checkbox',
          label: 'Show Reference Only',
          container: '_filters',
          defaultvalue : 'T'
      },*/
    ],
    tabs: [
    {
        id: '_filestab',
        label: 'Filing'
    },
  ],
    sublists: [],
    fieldOptions: [],
    standardButtons: [],
    customButtons: [
      {
        id: '_filter',
        label: 'Filter',
        functionName: 'redirect'
      }
    ]
  }
});
