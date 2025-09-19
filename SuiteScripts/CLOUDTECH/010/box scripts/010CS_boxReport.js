/**
 * @NApiVersion 2.x
 * @NScriptType ClientScript
 * @NModuleScope Public
 * @Author TC003
 * @Email nbdejesus@cloudtecherp.com
 * @Project ANC
 * @Date Sept 09, 2020
 * @Filename 010CS_boxReport.js
 */

define(['N/ui/message', 'N/ui/dialog', 'N/currentRecord', 'N/search'], function(
  message,
  dialog,
  currentRecord,
  search
) {
  const STORAGE_ID = 'hsb_clients';
  var exports = {};

  /**
   * Defaults the clients
   */
  exports.pageInit = function(context) {

      console.log("PAGEINIT via DIRECT CS");
      //jQuery(document).ready(startOperation);
  };
  
  exports.forcevalidation = function(context) {

      clearEntries();
  };
  
  function startOperation() {
      console.log("DOC IS READYYYY via DIRECT CS");
      
      //var timerId = setInterval(clearEntries, 5000);
      var timerId = setTimeout(clearEntries, 5000);
      
      /*let timerId = setTimeout(function tick() {
          console.log('tick');
        }, 2000);*/
  }

  function clearEntries(){
      
      jQuery("[id=boxnet_widget_frame]").each(function(elem){
      console.log("elem", elem)
      console.log("this", this)
      
      var spanAbove = jQuery(this).parent();
      console.log("spanAbove", spanAbove);
      
      
      
      var targetFrameElem = this;
      console.log("***targetFrameElem" , targetFrameElem)
      var iframeDocument = jQuery(this).contents().find('body').get(0);
      
      if(!iframeDocument)
      {
          //console.log("***targetIframDocument is blank_1" , targetFrameElem)
          //iframeDocument = jQuery(elem).contents().find('body').get(0);
          //console.log("***targetIframDocument is blank_2" , targetFrameElem)
      }
      
      console.log("iframeDocument", iframeDocument);
      
      console.log("jQuery(this)", jQuery(this));
      console.log("jQuery(this).contents()", jQuery(this).contents());
      console.log("JSON.stringify(this)", JSON.stringify(this));
      console.log("JSON.stringify(jQuery(this))", JSON.stringify(jQuery(this)));
      
      if(!iframeDocument)
      {
          jQuery(targetFrameElem).remove();
          if(spanAbove)
          {
              jQuery(spanAbove).remove();
          }
          return;
      }
      else
      {
          //iframeDocument2_jquery_0 = iframeDocument[0]
          iframeDocument2_jquery_0 = iframeDocument;
          
          iframeDocument2_jquery_0_elem1 = iframeDocument2_jquery_0.getElementsByClassName('content-message');
          
          for(var a = 0 ; a <  iframeDocument2_jquery_0_elem1.length ; a++)
          {
              var jq = jQuery(iframeDocument2_jquery_0_elem1[a]);
              var jqhtml = jQuery(jq).html();

              if(jqhtml)
              {
                  var remove_keep_reference = false;
                  var jqhtmlindex = ""+jqhtml.indexOf("This record is not associated with a folder in Box")
                  if(jqhtmlindex == -1)
                  {
                      jqhtmlindex = ""+jqhtml.indexOf("If choosing a folder you must select one in the folder picker");
                      
                  }
                  else
                  {
                      //means its a result that we want to remove but want to keep the reference.
                      remove_keep_reference = true;
                  }
                  
                  if(jqhtmlindex == -1)
                  {
                      jqhtmlindex = ""+jqhtml.indexOf("It appears your Netsuite account is not linked to your Box instance")
                  }
                  

                  if(jqhtmlindex == -1)
                  {
                      jqhtmlindex = ""+jqhtml.indexOf('<div class="crawler is-large">')
                  }
                  console.log("jqhtml", jqhtml)
                  console.log("jqhtmlindex", jqhtmlindex)
                  if(jqhtmlindex > -1)
                  {
                      if(spanAbove)
                      {
                          var href = new URL(window.location.href);
                          var get_removekeepref = href.searchParams.get('removekeepref');
                          console.log("get_removekeepref", get_removekeepref);
                          if (get_removekeepref != "false" && get_removekeepref != "F")
                          {
                              //apply removal of frame keep reference
                              if(remove_keep_reference)
                              {
                                  jQuery(targetFrameElem).remove();
                              }
                          }
                      }
                  }
                  else
                  {
                      console.log("ROOOOOD iframeDocument", iframeDocument);
                      
                      console.log("ROOOOOD iframeDocument2_jquery_0_elem1", iframeDocument2_jquery_0_elem1);
                      
                      console.log('must hide because no value jqhtml', jqhtml)
                      console.log("must hide because no value jq", jq);
                      
                      jQuery(targetFrameElem).remove();
                      if(spanAbove)
                      {
                          jQuery(spanAbove).remove();
                      }
                      return;
                  }
                              
              }
                  //if(jQuery(iframeDocument2_jquery_0_elem1[a]))
          }
      }

      //iframeDocument.console.log(12345)
      return true;
      })
      
      
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
  
    
    function showLoader()
    {
    	var myMsg = message.create({
		    title: "Sourcing Values", 
	        message: "Please wait...", 
	        type: message.Type.INFORMATION
	    });
    
	    // will disappear after 5s
	    myMsg.show({
	        duration: 3
	    });
//    	if(scriptContext.fieldId == "custpage_clients" || scriptContext.fieldId == "_subsidiary")
//    	{
//    		var myMsg = message.create({
//    		    title: "My Title", 
//    	        message: "Sourcing values...", 
//    	        type: message.Type.INFORMATION
//    	    });
//        
//    	    // will disappear after 5s
//    	    myMsg.show({
//    	        duration: 3
//    	    });
//    	}
    	return true;
    }
    
  exports.fieldChanged = function(scriptContext)
  {}

  /**
   * Redirects the user to the same page but with filters applied
   */
  exports.redirect = function() {
    var uiURL = window.location.href;
    var form = currentRecord.get();
    var startDate = form.getText({ fieldId: '_startdate' });
    var endDate = form.getText({ fieldId: '_enddate' });
    var removekeepref = form.getValue({ fieldId: '_removekeepref' });
    
    console.log("removekeepref", removekeepref);
    if (!startDate || !endDate) {
      dialog.alert({
        title: 'Notice',
        message: 'Please specify filters for the mandatory fields'
      });
      return; // halt execution
    }
    //$('#data-table_wrapper').hide();
    //$('#__loader').fadeIn();
    
    var href = new URL(window.location.href);
    if (startDate)
    {
        href.searchParams.set('dateFrom', encodeURIComponent(startDate));
    }
    if (endDate)
    {
        href.searchParams.set('dateTo', encodeURIComponent(endDate));
    }
    if (!removekeepref || removekeepref == 'F' || removekeepref == 'false')
    {
        href.searchParams.set('removekeepref', removekeepref);
    }
    else
    {
        href.searchParams.set('removekeepref', removekeepref);
    }
    href.searchParams.set('requestaction', 'getlist');
    
    var servicePath = window.location.pathname;
    var params = window.location.search;
    
    if (startDate) params += '&dateFrom=' + encodeURIComponent(startDate);
    if (endDate) params += '&dateTo=' + encodeURIComponent(endDate);
    
      params += '&requestaction=getlist';
      
      var path = servicePath + params;
      console.log('service path', path);
      
      window.location.href = path;
      
      window.location.href = href.toString();
      
      // execute a get request to the same service
//      fetch(path)
//        .then(function(res) {
//        	console.log(199, res)
//          if (res.status == 200) {
//        	  console.log(200,res)
//            return res.json();
//          } else {
//        	  console.log(201,res)
//            dialog.alert({
//              title: 'Notice',
//              message:
//                'An unexpected error occured.<br/>' +
//                'Please contact your administrator'
//            });
//            $('#data-table_wrapper').fadeIn();
//            $('#__loader').hide();
//          }
//        })
//        .then(function(res) {
//        	console.log(202,res)
//            console.log("res.body",res.body)
//            console.log("res.success",res.success)
//          if (res.success) {
//        	console.log("res.success", res.success);
//              var b = res.listResults;
//            table.clear();
//            console.log(b);
//            
//            /*for(var ctr = 0 ; ctr < b.length; ctr++)
//            {
//                fetch('https://1116623.app.netsuite.com/app/site/hosting/scriptlet.nl?script=588&deploy=1&compid=1116623&record_id=50785531&record_type=vendorbill')
//                .then(function(res) {
//                    console.log("fetech suitelet response 1", res)
//                  if (res.status == 200) {
//                      console.log("fetech suitelet response 2 body",res.body)
//                      //console.log("fetech suitelet response 2.1 res.json",res.json())
//                      return res;
//                    //return res.json();
//                  } else {
//                      console.log("fetech suitelet response 3",res)
//                    dialog.alert({
//                      title: 'Notice',
//                      message:
//                        'An unexpected error occured.<br/>' +
//                        'Please contact your administrator'
//                    });
//                  }
//                })
//                .then(function(res) {
//                    console.log("RESSSS", res)
//                    console.log("RESSSS.json()", res.json())
//                })
//            }*/
//            
//            for(var ctr = 0 ; ctr < b.length; ctr++)
//            {
//                fetch('https://app.box.com/embed/folder/121105059869?partner_id=187'
////                        ,
////                        {
////                    method: 'POST', // *GET, POST, PUT, DELETE, etc.
////                    //mode: 'cors', // no-cors, *cors, same-origin,
////                    mode: 'no-cors', // no-cors, *cors, same-origin,
////                    //'Access-Control-Allow-Origin' : '*',
//////                    cache: 'no-cache', // *default, no-cache, reload, force-cache, only-if-cached
//////                    credentials: 'same-origin', // include, *same-origin, omit
//////                    headers: {
//////                      'Content-Type': 'application/json'
//////                      // 'Content-Type': 'application/x-www-form-urlencoded',
//////                    },
//////                    redirect: 'follow', // manual, *follow, error
//////                    referrerPolicy: 'no-referrer', // no-referrer, *no-referrer-when-downgrade, origin, origin-when-cross-origin, same-origin, strict-origin, strict-origin-when-cross-origin, unsafe-url
////                  }
//                )
//                //fetch('https://1116623.app.netsuite.com/app/site/hosting/scriptlet.nl?script=588&deploy=1&compid=1116623&record_id=50785531&record_type=vendorbill')
//                .then(function(res) {
//                    console.log("fetech suitelet response 1", res)
//                  if (res.status == 200) {
//                      console.log("fetech suitelet response 2 body",res.body)
//                      //console.log("fetech suitelet response 2.1 res.json",res.json())
//                      //return res;
//                    return res.text();
//                  } else {
//                      console.log("fetech suitelet response 3",res)
//                    dialog.alert({
//                      title: 'Notice',
//                      message:
//                        'An unexpected error occured.<br/>' +
//                        'Please contact your administrator'
//                    });
//                  }
//                })
//                .then(function(res) {
//                    console.log("RESSSS", res)
//                    //console.log("RESSSS.text()", res.text())
//                })
//            }
//            
//            
//            
//            table.rows.add(b);
//            table.draw();
//            $('#data-table_wrapper').fadeIn();
//            $('#__loader').hide();
//          }
//        });
//      console.log('filtering results');
  };
  

  return exports;
});
