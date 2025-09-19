/** Copyright @ 2003-2017
** 	NetScore Technologies
**	8300 Boone Boulevard, Suite 500
**	Vienna, VA 22182 
**	Phone 703-599-9282
** 	All Rights Reserved. 
**	 
** This code is the confidential and proprietary information of 
** NetScore Technologies Private Limited ("Confidential Information"). You shall not 
** disclose such Confidential Information and shall use it only in 
** accordance with the terms of the license agreement you entered into 
** with NetScore.
** 
** @client:	Alberta NewsPrint
** @author: Yogesh Bhurley
** @dated: 	23-04-2018
** @version: 1.0
** @Script Name:
** @Description: Script working description
*
** @libraries used:
					1.libraries file name and its used
					

 -- Date--      -- Modified By--      --Requested By--     --Change Request(Issues,New Functionality,Changes)
DD-MM-YYYY        Employee Name			Client Name			  One line description
 
	 SUITELET
		- backend_suitelet(request, response)
		
	 SUB-FUNCTIONS
		- The following sub-functions are called by the above core functions in order to maintain code
			modularization:

***/
function backend_suitelet(request,response)
{
	try
	{
		nlapiLogExecution('DEBUG', 'Suitelet Backend', 'Restlet backend-->');
		var jsonArryFormat=[];var clssArr=[];
		
		//1 Get the product parameter 
		var prod_id = request.getParameter('product_id');
		
		var class_txt = request.getParameter('class_text');
		nlapiLogExecution('DEBUG', 'class_txt', class_txt);
		
		//2 Get the grade parameter 
		//var grade_id = request.getParameter('grade_id');
		//nlapiLogExecution('DEBUG', 'grade_id', grade_id);
		
		//3 Get the Customer Id parameter 
		var cutomer_name = request.getParameter('cust_id');
		//nlapiLogExecution('DEBUG', 'cutomer_name', cutomer_name);
		
		//4 Get the grade parameter 
		var customerGrp = request.getParameter('custgrp_id');
		//nlapiLogExecution('DEBUG', 'customerGrp', customerGrp);
		
		//5 Get the product parameter 
		var years = request.getParameter('years');
		nlapiLogExecution('DEBUG', 'years', years);		
		
		//6 Get the grade parameter 
		var currency_name = request.getParameter('currency_name');
		//nlapiLogExecution('DEBUG', 'currency_name', currency_name);
		
		//7 Get the grade parameter 
		var consignee_name = request.getParameter('consignee_name');
		//nlapiLogExecution('DEBUG', 'consignee_name', consignee_name);
		
		var classificationSearch = nlapiSearchRecord("classification",null,[["name","startswith",class_txt]],[new nlobjSearchColumn("name").setSort(false)]);
		
		if(classificationSearch)
		{
			nlapiLogExecution('DEBUG', 'classificationSearch len', classificationSearch.length);
			for(var i=0;i<classificationSearch.length;i++)
			{
				clssArr.push(classificationSearch[i].getId());
			}			
		}
		else
		{
			clssArr.push(prod_id);
		}
		
		nlapiLogExecution('DEBUG', 'clssArr len', clssArr.length);
		nlapiLogExecution('DEBUG', 'clssArr', clssArr[0]);
		
		var filters =new Array();
		
		if(cutomer_name!=0 && cutomer_name)
			filters[filters.length]=new nlobjSearchFilter('custrecord_albert_ns_item_price_customer', null, 'is',cutomer_name);
		if(consignee_name!=0 && consignee_name)
			filters[filters.length]=new nlobjSearchFilter('custrecord_albert_ns_item_price_consigne', null, 'is',consignee_name);
		if(years!=0 && years!=1)
			filters[filters.length]=new nlobjSearchFilter('custrecord_alberta_ns_item_pricing_year', null, 'is',years);		
		
		
		if(prod_id!=0 && clssArr)
			filters[filters.length]=new nlobjSearchFilter('class','custrecord_alberta_ns_item','anyof',clssArr);	 
		if(currency_name!=0 && currency_name)
			filters[filters.length]=new nlobjSearchFilter('custrecord_alberta_ns_currency', null, 'is',currency_name);
		if(customerGrp!=0 && customerGrp)
			filters[filters.length]=new nlobjSearchFilter('custrecord_alberta_newsprin_customer_grp', null, 'is',customerGrp);
		/*if(grade_id!=0 && grade_id)
			filters[filters.length]=new nlobjSearchFilter('custrecord_alberta_grade_code', null, 'is',grade_id);*/
		
		if(years==0 && years!=1)
		{
			var date = new Date();
							
			var years = date.getFullYear();	
			nlapiLogExecution('DEBUG', 'years1', years);
			
			years=years.toString();
			filters[filters.length]=new nlobjSearchFilter('custrecord_alberta_ns_item_pricing_year', null, 'is',years);
			//nlapiLogExecution('DEBUG', 'filters.length ', filters.length);
		}
		
		/**var columns=new Array();
		columns[0]=new nlobjSearchColumn('custrecord_alberta_ns_month_jan');
		columns[1]=new nlobjSearchColumn('custrecord_alberta_ns_month_feb');
		columns[2]=new nlobjSearchColumn('custrecord_alberta_ns_month_march');
		columns[3]=new nlobjSearchColumn('custrecord_alberta_ns_month_april');
		columns[4]=new nlobjSearchColumn('custrecord_alberta_ns_month_may');
		columns[5]=new nlobjSearchColumn('custrecord_alberta_ns_month_june');
		columns[6]=new nlobjSearchColumn('custrecord_alberta_ns_month_july');
		columns[7]=new nlobjSearchColumn('custrecord_alberta_ns_month_august');
		columns[8]=new nlobjSearchColumn('custrecord_alberta_ns_month_sep');
		columns[9]=new nlobjSearchColumn('custrecord_alberta_ns_month_oct');
		columns[10]=new nlobjSearchColumn('custrecord_alberta_ns_month_nov');
		columns[11]=new nlobjSearchColumn('custrecord_alberta_ns_month_dec');
		columns[12]= new nlobjSearchColumn("custrecord_alberta_newsprin_customer_grp").setSort(false);
		columns[13]=new nlobjSearchColumn("custrecord_albert_ns_item_price_customer").setSort(false);
		columns[14]=new nlobjSearchColumn("name").setSort(false);
		/*columns[15]=new nlobjSearchColumn('custrecord_alberta_grade_code').setSort(false);
		columns[16]=new nlobjSearchColumn('custrecord_alberta_ns_grade_desc').setSort(false);*/	
			
		
		var srch=nlapiLoadSearch(null,'customsearch_alberta_custom_price_srch');
		var str='';		
		srch.addFilters(filters);
		//srch.addColumns(columns);
		//nlapiLogExecution('debug','resulte2','results');
		//var newId = srch.saveSearch('Alberta Custom Result Srch', 'customsearch_alberta_custom_price_srch');
		nlapiLogExecution('debug','resulte','srch: '+srch);
		var results= srch.runSearch();
		nlapiLogExecution('debug','resulte','results: '+results);
		var start= 0;
		var end = 1000;
		var resultSetCount = 1000;
		do
		{
			nlapiLogExecution('debug','do','loop');
			var results_cust = results.getResults(start, end);
			nlapiLogExecution('debug','results_cust ',results_cust.length);
			for (var i=0;results_cust&&i<results_cust.length;i++)
			{
				
				var result = results_cust[i];
				
				var columns = result.getAllColumns();
				
				var lineLevelPriceing=new Object();
				var mon_jan=result.getValue(columns[0]);
				//nlapiLogExecution('debug','mon_jan',mon_jan);	
				var mon_feb=result.getValue(columns[1]);
				var mon_mar=result.getValue(columns[2]);
				var mon_apr=result.getValue(columns[3]);
				var mon_may=result.getValue(columns[4]);
				var mon_jun=result.getValue(columns[5]);
				var mon_jul=result.getValue(columns[6]);
				var mon_aug=result.getValue(columns[7]);
				var mon_sep=result.getValue(columns[8]);
				var mon_oct=result.getValue(columns[9]);
				var mon_nov=result.getValue(columns[10]);
				var mon_dec=result.getValue(columns[11]);
				var cust_grps=result.getText(columns[12]);
				var cust_names=result.getText(columns[13]);
				var consignee_names=result.getText(columns[14]);
				/*var grade_codes=result.getText(columns[15]);
				var grade_descs=result.getValue(columns[16]);*/
				var years=result.getValue(columns[15]);
				var currencys=result.getText(columns[16]);
				var itemName=result.getText(columns[17]);
				var rec_id=result.getId();
				//nlapiLogExecution('debug','rec_id',rec_id);
				
				
				//str+=rec_id+"@@"+cust_grps+"@@"+cust_names+"@@"+consignee_names+"@@"+grade_codes+"@@"+grade_descs+"@@"+mon_jan+"@@"+mon_feb+"@@"+mon_mar+"@@"+mon_apr+"@@"+mon_may+"@@"+mon_jun+"@@"+mon_jul+"@@"+mon_aug+"@@"+mon_sep+"@@"+mon_oct+"@@"+mon_nov+"@@"+mon_dec;
				
				str+=rec_id+"@@"+years+"@@"+currencys+"@@"+cust_grps+"@@"+cust_names+"@@"+consignee_names+"@@"+itemName+"@@"+mon_jan+"@@"+mon_feb+"@@"+mon_mar+"@@"+mon_apr+"@@"+mon_may+"@@"+mon_jun+"@@"+mon_jul+"@@"+mon_aug+"@@"+mon_sep+"@@"+mon_oct+"@@"+mon_nov+"@@"+mon_dec;
			
				if(results_cust.length>i+1)
					str+="$$";
			}
		
			resultSetCount  = results_cust.length;
			start = end;	
			end = end +1000;
			
		}while (resultSetCount== 1000);
		
		/*for(var i=0;srch && i<srch.length;i++)
		{
			 nlapiLogExecution('debug','resulte',srch.length);
			 var lineLevelPriceing=new Object();
			 var mon_jan=srch[i].getValue(columns[0]);
			 var mon_feb=srch[i].getValue(columns[1]);
			 var mon_mar=srch[i].getValue(columns[2]);
			 var mon_apr=srch[i].getValue(columns[3]);
			 var mon_may=srch[i].getValue(columns[4]);
			 var mon_jun=srch[i].getValue(columns[5]);
			 var mon_jul=srch[i].getValue(columns[6]);
			 var mon_aug=srch[i].getValue(columns[7]);
			 var mon_sep=srch[i].getValue(columns[8]);
			 var mon_oct=srch[i].getValue(columns[9]);
			 var mon_nov=srch[i].getValue(columns[10]);
			 var mon_dec=srch[i].getValue(columns[11]);
			 var cust_grps=srch[i].getText(columns[12]);
			 var cust_names=srch[i].getText(columns[13]);
			 var consignee_names=srch[i].getText(columns[14]);
			 var grade_codes=srch[i].getText(columns[15]);
			 var grade_descs=srch[i].getValue(columns[16]);
			 var rec_id=srch[i].getId();
			 nlapiLogExecution('debug','rec_id',rec_id);
			 nlapiLogExecution('debug','mon_jan',mon_jan);
			 //alert('rec_id'+rec_id);	
			 
			 /*jsonArryFormat.push(rec_id);
			 
			 jsonArryFormat.push(mon_jan);jsonArryFormat.push(mon_feb);
			 jsonArryFormat.push(mon_mar);jsonArryFormat.push(mon_apr);
			 jsonArryFormat.push(mon_may);jsonArryFormat.push(mon_jun);
			 jsonArryFormat.push(mon_jul);jsonArryFormat.push(mon_aug);
			 jsonArryFormat.push(mon_sep);jsonArryFormat.push(mon_oct);
			 jsonArryFormat.push(mon_nov);jsonArryFormat.push(mon_dec);	
			 jsonArryFormat.push(cust_grps);jsonArryFormat.push(cust_names);
			 jsonArryFormat.push(consignee_names);jsonArryFormat.push(grade_codes);
			 jsonArryFormat.push(grade_descs);
			 if(srch.length>i+1)
				jsonArryFormat.push("@@");*/
			
			
			 /*str+=rec_id+"@@"+cust_grps+"@@"+cust_names+"@@"+consignee_names+"@@"+grade_codes+"@@"+grade_descs+"@@"+mon_jan+"@@"+mon_feb+"@@"+mon_mar+"@@"+mon_apr+"@@"+mon_may+"@@"+mon_jun+"@@"+mon_jul+"@@"+mon_aug+"@@"+mon_sep+"@@"+mon_oct+"@@"+mon_nov+"@@"+mon_dec;
			
			if(srch.length>i+1)
				str+="$$";
		}*/
		if(!srch)
		{
			jsonArryFormat.push(0);
		}	
		
		response.write(JSON.stringify(str));
		return;
	}
	catch(e)
	{
		response.write("");
		return;
	}	
}