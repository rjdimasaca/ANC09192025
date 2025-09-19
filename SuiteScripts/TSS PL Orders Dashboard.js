/**
 * @NApiVersion 2.1
 * @NScriptType Portlet
 * @NScriptPortletType form
 * Author               : Raj Kumar
 * Start Date           : 24th july 2025
 * Last Modified Date   : 
 * 
 * Description          : Orders graph as Dashboard view.
 * 
 */

define(['N/url'], function(url) {
	function render(context) {
		try{
			var targetUrl  = url.resolveScript({
				scriptId: 'customscript_tss_sl_sales_order_line_gra',
				deploymentId: 'customdeploy_tss_sl_sales_order_line_gra',
				returnExternalUrl: false
			});
			var portletObj = context.portlet;
			portletObj.title = 'Orders';
			var fieldObj = portletObj.addField({
				id: 'inlinefield',
				type: 'inlinehtml',
				label: 'Inject Code'
			});
			var content = '<iframe id="myFrame" src="'+targetUrl+'" style="position: absolute; top: 0; left: 0; border:none;width:100%;height:400px;"></iframe>';
			fieldObj.defaultValue = content;
		}catch(Error){
			log.error('Error in portlet',Error);
		}
	}
	return {
		render: render
	};
})