/**
 * @NApiVersion 2.x
 * @NScriptType Suitelet
 * @NModuleScope SameAccount
 */
define(['N/runtime', 'N/file', 'N/https', 'N/record', 'N/search', 'N/ui/serverWidget', 'N/url', './boxreport.config.js'],
/**
 * @param {https} https
 * @param {record} record
 * @param {search} search
 * @param {serverWidget} serverWidget
 * @param {url} url
 */
function(runtime, file, https, record, search, serverWidget, url, config) {
   
    /**
     * Definition of the Suitelet script trigger point.
     *
     * @param {Object} context
     * @param {ServerRequest} context.request - Encapsulation of the incoming request
     * @param {ServerResponse} context.response - Encapsulation of the Suitelet response
     * @Since 2015.2
     */
    function onRequest(context)
    {
        
        if(context.request.parameters.requestaction == "getlist")
        {
            listResultsObj = getListResultsObj(context);
            listResultsObj.success = true;
            listResultsObj.status = 200;
            listResultsObj_asResponse = JSON.stringify(listResultsObj); 
            log.debug("listResultsObj_asResponse", listResultsObj_asResponse)
            
            var form = buildUi(context);
        
            form = defaultFormValues(form, context.request);
            
//            context.response.writePage(form);
//            return;
            
            for(var a = 0 ; a < listResultsObj.listResults.length; a++)
            {
                var fieldId = "custpage_" + a + "_" +  listResultsObj.listResults[a].internalid;
                
                var fieldObj = form.addField({
                    type : "inlinehtml",
                    id : fieldId,
                    label : "listResultsObj_asResponse[a][0]"
                });
                
                var linkElem = '<a style="font-size:30px"; href="/app/accounting/transactions/vendbill.nl?id=' + listResultsObj.listResults[a].internalid + '">' + listResultsObj.listResults[a].refnum + " (" + listResultsObj.listResults[a].internalid + ') </a>'
                var baseBoxUrl = '<iframe id="boxnet_widget_frame" src="/app/site/hosting/scriptlet.nl?script=588&amp;deploy=1&amp;compid=1116623&amp;record_id=' + listResultsObj.listResults[a].internalid + '&amp;record_type=vendorbill" align="center" style="width: 100%; height:600px; margin:0; border:0; padding:0" frameborder="0"></iframe>'
                //var baseBoxUrl = '<iframe id="boxnet_widget_frame" src="/app/site/hosting/scriptlet.nl?script=588&amp;deploy=1&amp;compid=1116623&amp;record_id=50785531&amp;record_type=vendorbill" align="center" style="width: 100%; height:600px; margin:0; border:0; padding:0" frameborder="0"></iframe>'
                
                fieldObj.defaultValue = linkElem + baseBoxUrl
                
                log.debug("fieldObj", fieldObj);
            }
            
            context.response.writePage({
                pageObject: form
            });
            return;
            
//            context.response.write(listResultsObj_asResponse);
//            return;
        }
        else
        {
            
        }
        
        var form = buildUi(context);
        
        form = defaultFormValues(form, context.request);
        
        context.response.writePage(form);
        return;
        
        context.response.writePage({
            pageObject: form
        });
    }
    
    
    function getListResultsObj(context)
    {
        //samples, this should be declared as a blank array once finalized
        //var listResults = {listResults : [{internalid : 50785430, refnum : "TEST"}, {internalid : 50785531, refnum : "TEST1"}]};
        var listResults = {listResults : []};
        log.debug("decodeURIComponent(context.request.parameters.dateFrom)", decodeURIComponent(context.request.parameters.dateFrom));
        
        var searchObj = search.create({
            type : "vendorbill",
            filters : [
                        ["mainline", "is", 'T'],
                        "AND",
                       ["trandate", "onorafter", decodeURIComponent(context.request.parameters.dateFrom)],
                       "AND",
                       ["trandate", "onorbefore", decodeURIComponent(context.request.parameters.dateTo)],
                       ],
                       columns : ["tranid"]
        })
        
        var searchObj_results = getResults(searchObj.run());
        
        for(var a = 0 ; a < searchObj_results.length ; a++)
        {
            log.debug("searchObj_results[a]", searchObj_results[a]);
            
            listResults.listResults.push({
                internalid : searchObj_results[a].id,
                refnum : searchObj_results[a].getValue("tranid")
            })
        }
        
        log.debug("listResults", listResults);
        return listResults;
    }
    
    var getResults = function getResults(set) {
        var holder = [];
        var i = 0;
        while (true) {
          var result = set.getRange({
            start: i,
            end: i + 1000
          });
          if (!result) break;
          holder = holder.concat(result);
          if (result.length < 1000) break;
          i += 1000;
        }
        return holder;
      };
    
    function defaultFormValues(form, req) {
        var user = runtime.getCurrentUser();
        var html = file.load({ id: 591745 }).getContents() || ''; //billinggeneration_manpower.html
        // var params = req.parameters.clients;
        var defaultValues = {
//          _subsidiary: user.subsidiary,
          _datatables: html.replace('{{marker}}', 'Ã¢Å“â€�') // '<iframe frameBorder="0" scrolling="no" src="' + html + '" style="overflow: hidden" width="100%" height="500"></iframe>'
          // _clients: ,
          // _clientsite: fieldSource
        };
        form.updateDefaultValues(defaultValues);
        return form;
      }
    
    function buildUi(context)
    {
        log.debug("config", config);
        log.debug("context.request.parameters", context.request.parameters);
        var form = serverWidget.createForm({ title: config.billingForm.title});
        config.billingForm.tabs.forEach(function(tab) {
          form.addTab(tab);
        });
        config.billingForm.fieldGroups.forEach(function(fieldGroup) {
          form.addFieldGroup(fieldGroup);
        });
        config.billingForm.fields.forEach(function(field) {
          var fld = form.addField(field);
          if (field.isMandatory) fld.isMandatory = true;
          if (field.display) {
            fld.updateDisplayType({ displayType: field.display });
          }
          

          log.debug("context.request.parameters.removekeepref", context.request.parameters.removekeepref);
          log.debug("fld.id", fld.id);
          
          if (field.defaultvalue) {
              if(context.request.parameters.dateFrom && fld.id == "_startdate")
              {
                  fld.defaultValue = decodeURIComponent(context.request.parameters.dateFrom);
              }
              else if (context.request.parameters.dateTo && fld.id == "_enddate")
              {
                  fld.defaultValue = decodeURIComponent(context.request.parameters.dateTo);
              }
              else if (context.request.parameters.removekeepref && fld.id == "_removekeepref")
              {
                  //log.debug("set it to TRUE!!!", context.request.parameters.removekeepref);
                  if(context.request.parameters.removekeepref && context.request.parameters.removekeepref != 'false' && context.request.parameters.removekeepref != 'F')
                  {
                      //log.debug("set it to TRUE!!! CONDITION MET!", context.request.parameters.removekeepref);
                      fld.defaultValue = 'T';
                  }
                  else
                  {
                      fld.defaultValue = 'F';
                  }
              }
              else
              {
                  fld.defaultValue = field.defaultvalue;
              }
            }
        });
        config.billingForm.sublists.forEach(function(sublist) {
          var list = form.addSublist(sublist.props);
          sublist.fields.forEach(function(field) {
            var fld = list.addField(field);
            if (field.isMandatory) fld.isMandatory = true;
            if (field.display) {
              fld.updateDisplayType({ displayType: field.display });
            }
          });
        });
        config.billingForm.customButtons.forEach(function(btn) {
          form.addButton(btn);
        });
        var clientScriptPath = config.billingForm.clientScriptModulePath || '';
        if (clientScriptPath) form.clientScriptModulePath = clientScriptPath;
        var clientScriptId = config.billingForm.clientScriptId || '';
        if (clientScriptId) form.clientScriptFileId = clientScriptId;
        
        
        /*var form = null;
        var form = serverWidget.createForm({
            title : "Box Report"
        })*/
        
        return form;
    }

    return {
        onRequest: onRequest
    };
    
});
