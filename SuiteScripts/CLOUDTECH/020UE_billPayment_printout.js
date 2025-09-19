function getDatacenterUrls() {
    var headers = [];
    headers['Content-Type'] = 'text/xml';
    headers['SOAPAction'] = 'getDataCenterUrls';
    var urls = {
        'webservicesDomain': '',
        'systemDomain': '',
        'restDomain': ''
    }

    var xml = "<soapenv:Envelope xmlns:xsd='http://www.w3.org/2001/XMLSchema' xmlns:xsi='http://www.w3.org/2001/XMLSchema-instance' xmlns:soapenv='http://schemas.xmlsoap.org/soap/envelope/' > <soapenv:Header> </soapenv:Header> <soapenv:Body> <getDataCenterUrls xsi:type='platformMsgs:GetDataCenterUrlsRequest'> <account xsi:type='xsd:string'>" + nlapiGetContext().getCompany() + "</account> </getDataCenterUrls> </soapenv:Body> </soapenv:Envelope>";
    /* The variable above was properly escaped and has no line breaks, apparently using the nlapiEscapeXML() does not resolve this because this is declared as a String not an XML type */

    var sUrl = "https://webservices.netsuite.com/services/NetSuitePort_2014_2"
        /* use the latest webservice URL to call the getDataCenterURLs command. */

    resp = nlapiRequestURL(sUrl, xml, headers); // creates and calls the web service request

    var res = resp.getBody(); // gets the body of the request into XML form

    Object.keys(urls).forEach(function(url, index, a) {
        var b = new RegExp('<platformCore:' + url + '>(.*?)<\/platformCore:' + url + '>', 'g')
        if (b.test(res))
            res.match(b).map(function(val) {
                urls[url] = val.replace(new RegExp('<\/?platformCore:' + url + '>', 'g'), '')
            })
    })
    return urls;
}
function beforeLoad(type){
	
	try{
		if (type != 'print')
		return;

	var params = { 
		'recordId': nlapiGetRecordId(),
		'recordType': nlapiGetRecordType()
	}

	var loadRecord = nlapiLoadRecord(params.recordType, params.recordId);
	var subsidiaryId = loadRecord.getFieldValue('subsidiary');

	var loadSubsidiaryRecord = nlapiLoadRecord('subsidiary', subsidiaryId);
	var getLogoId = loadSubsidiaryRecord.getFieldValue('logo');
    var getAddressId = loadSubsidiaryRecord.getFieldValue('mainaddress_text');

	var logoImgSysDomain = getDatacenterUrls(nlapiLoadFile(getLogoId).getURL());
	var logoURL = logoImgSysDomain.systemDomain + nlapiLoadFile(getLogoId).getURL().replace(/&/g, '&amp;');

	nlapiLogExecution('ERROR', 'logoURL', logoURL);

	var logoUrlField = form.addField('custpage_sublogourl', 'richtext', 'logoURL', null);
    logoURL = 'https://1116623.app.netsuite.com/core/media/media.nl?id=2146&amp;amp;c=1116623&amp;h=bWe47HcNnUYBVxU_1mrYGRHQdd4qzuMXcpPDjvqU1ercsHHp'
    logoUrlField.setDefaultValue(logoURL);

	var addressField = form.addField('custpage_address', 'longtext', 'mainaddress_text', null);
    addressField.setDefaultValue(getAddressId);
    

	}catch(e){
		nlapiLogExecution('ERROR', 'e', e)
	}
}