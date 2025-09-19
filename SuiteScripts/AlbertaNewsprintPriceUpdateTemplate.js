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
** @dated: 	19-04-2018
** @version: 1.0
** @Script Name:
** @Description: Script working description
*
** @libraries used:
					1.libraries file name and its used
					

 -- Date--      -- Modified By--      --Requested By--     --Change Request(Issues,New Functionality,Changes)
DD-MM-YYYY        Employee Name			Client Name			  One line description
 
	 SUITELET
		- suiteletFunction(request, response)
		
	 SUB-FUNCTIONS
		- The following sub-functions are called by the above core functions in order to maintain code
			modularization:

***/
{
	var globalarray=[];
	var totalResultPerPage = 8;
	var paginationStart = 0;
	var paginationEnd = 8;
}

function albertaNSPricingUpdate(request,response)
{
	var html='';
	html+='<!DOCTYPE html>'
	html+='<html lang="en">'
	html+='<head>'
	html+='<title>Alberta NewsPrint Price Update Template</title>'
	html+='<meta charset="utf-8">'
	html+='<meta name="viewport" content="width=device-width, initial-scale=1">'
	html+='<link rel="stylesheet" href="https://maxcdn.bootstrapcdn.com/bootstrap/3.3.7/css/bootstrap.min.css">'
	html+='<script src="https://ajax.googleapis.com/ajax/libs/jquery/3.3.1/jquery.min.js"></script>'
	html+='<script src="https://maxcdn.bootstrapcdn.com/bootstrap/3.3.7/js/bootstrap.min.js"></script>'
	//html+='<script>function myFunction() {  alert("hi")}';
	html+='</script>';
	html+= '<script>' + clear_prodField + '</script>';
	html+= '<script>' + showResult + '</script>';
	html+= '<script>' + defaultValue + '</script>';
	html+= '<script>' + default_prodField + '</script>';
	//html+= '<script>' + showData + '</script>';
	html+='</head>'
	html+='<style type="">'
	html+='.button{width: 100%;float: left;text-align: center;margin-bottom: 10px;margin-top: 20px;}'
	html+='.year-div ,.currency-div ,.product-div ,.grade-div ,.cgroup-div ,.customer-div ,.consignee-div{width: 100%;float: left; display: inline-block; margin:3px 0px;}'
	html+='#nxtbtn{margin-left:20px;} table{width:100%;float:left;} .group1{width: 9%;padding: 5px 3px !important;display: table-cell;font-size: 13px;word-wrap: break-word;text-align: center;} .group2 {width: 5%;		text-align: center;padding: 5px 3px !important;display: table-cell;font-size: 13px;word-wrap: break-word;}.table td{text-align: center;}'	
	
	html+='.year-div label ,.currency-div label {width: 25%;float: left;display: inline-block;height: 30px;font-weight: normal;}'
	html+='.cgroup-div label ,.customer-div label ,.consignee-div label ,.product-div label ,.grade-div label{width: 35%;float: left;display: inline-block;height: 30px;font-weight: normal;}'
	html+='.year-div input ,.currency-div select{width: 62%;float: left;display: inline-block;height: 30px;margin-right: 2%}'
	html+='.cgroup-div select ,.customer-div select ,.consignee-div select ,.product-div select ,.grade-div select{width: 55%;float: left;display: inline-block;height: 30px;margin-right: 2%}'
	html+='span.glyphicon {width: 8%;float: left;border: 1px solid;height: 28px;text-align: center;padding: 5px 0px;cursor: pointer;}'
	
	html+='.btn-grp{width:100%;float:left;text-align:center;margin-bottom:20px;}'
	
	//html+='table,tr,td,th{border:2 px solid black}'
	html+='@media screen and (max-width:991px){.table1 {overflow-x: scroll;width: 100%;float: left;border:2px solid black}}'

	html+='@media screen and (max-width:767px){.year-div label ,.currency-div label,.cgroup-div label ,.customer-div label ,.consignee-div label ,.product-div label ,.grade-div label{width: 35%;float: left;display: inline-block;height: 30px;}'
	html+='.year-div input ,.currency-div select ,.cgroup-div select ,.customer-div select ,.consignee-div select ,.product-div select ,.grade-div select{width: 65%;float: left;display: inline-block;height: 30px;margin-right: 2%}'

	html+='</style>'
	html+='<body id="htmbody" onload="default_prodField()">'

	html+='<div class="container">'
	html+='<div class="button">'
	html+='<button class="btn btn-defult" id="btnRefesh" onclick="default_prodField(this.id)">Refresh</button>'
	html+='</div>'
	html+='<div class="">'
	html+='<div class="col-lg-3 col-md-3 col-sm-3 col-xs-12">'
	html+='<div class="year-div">'
	var date = new Date();
										
	var years = date.getFullYear();
    var maxYears=Number(years)+5;
	var minYears=Number(years)-5;	
	html+='<label>Year</label>'
	/*html+='<select id="year">'
	html+='<option value="0">-- Select Year --</option>';
	html+='<option value="2016">2016</option>';
	html+='<option value="2017">2017</option>';
	html+='<option value="2018">2018</option>';
	html+='<option value="2019">2019</option>';
	
	html+='</select>'*/
	html+='<input type="number" name="priceyear" min="'+minYears+'" max="'+maxYears+'" id="year">'
	html+='</div>'
	html+='<div class="currency-div">'
	html+='<label>Currency</label>'
	var currency_filters=[];
	var currency_columns=[];
	currency_filters[currency_filters.length] = new nlobjSearchFilter('isinactive', null, 'is', 'F');	
	//prod_filters[prod_filters.length] = new nlobjSearchFilter('type', null, 'is', 'inventoryitem');
	
	currency_columns[0]=new nlobjSearchColumn('name');
	var currency_internalid = nlapiSearchRecord('currency', null, currency_filters, currency_columns);
	
	html+='<select id="currencyVal">'
	html+='<option value="0"></option>'
	for(var i=0;currency_internalid && i<currency_internalid.length;i++){
		html+='<option value="'+currency_internalid[i].getId()+'">'+currency_internalid[i].getValue(currency_columns[0])+'</option>';
	}
	html+='</select>'
	html+='</div>'
	html+='</div>'
	html+='<div class="col-lg-4 col-md-4 col-sm-4 col-xs-12">'
	html+='<div class="product-div">'
	html+='<label>Class</label>'
	
	//Product List
	var prod_filters=[];
	var prod_columns=[];
	prod_filters[prod_filters.length] = new nlobjSearchFilter('isinactive', null, 'is', 'F');	
	//prod_filters[prod_filters.length] = new nlobjSearchFilter('type', null, 'is', 'inventoryitem');
	
	prod_columns[0]=new nlobjSearchColumn('name');
	var Item_internalid = nlapiSearchRecord('classification', null, prod_filters, prod_columns);
	
	html+='<select id="prodVal">'
	html+='<option value="0"></option>'
	for(var i=0;Item_internalid && i<Item_internalid.length;i++){
		html+='<option value="'+Item_internalid[i].getId()+'">'+Item_internalid[i].getValue(prod_columns[0])+'</option>';
	}
	html+='</select>'
	html+='<span class="glyphicon glyphicon-remove	icon2" id="prodClose" onclick="default_prodField(this.id)"></span>'
	html+='</div>'
	
	//Grade List
	/*html+='<div class="grade-div">'
	html+='<label>Grade</label>'
	
	var grade_filters=[];
	grade_filters[grade_filters.length] = new nlobjSearchFilter('isinactive', null, 'is', 'F');	
	var grade_columns=[];
	grade_columns[0]=new nlobjSearchColumn('name');
	var grade_internalid = nlapiSearchRecord('customlist_alberta_newsprint_grade', null, grade_filters, grade_columns);
	
	html+='<select id="gradeVal">'
	html+='<option value="0"></option>'
	for(var i=0;grade_internalid && i<grade_internalid.length;i++){
		html+='<option value="'+grade_internalid[i].getId()+'">'+grade_internalid[i].getValue(grade_columns[0])+'</option>';
	}
	html+='</select>'
	html+='<span class="glyphicon glyphicon-remove	icon2" id="gradeClose" onclick="default_prodField(this.id)"></span>'
	html+='</div>'*/
	html+='<div class="cgroup-div">'
	html+='<label>Customer Group</label>'
	
	/*var customer_grp_filters=[];
	customer_grp_filters[customer_grp_filters.length] = new nlobjSearchFilter('isinactive', null, 'is', 'F');	
	
	var customer_grps_columns=[];
	customer_grps_columns[0]=new nlobjSearchColumn('name');
	var customer_grps_internalid = nlapiSearchRecord('customlist_alberta_ns_customer_group', null, customer_grp_filters, customer_grps_columns);*/
	
	html+='<select id="custgrpval">'
	html+='<option value="0"></option>'
	/*nlapiLogExecution('debug','customer_grps_internalid len',customer_grps_internalid.length);
	for(var i=0;customer_grps_internalid && i<customer_grps_internalid.length;i++){
		html+='<option value="'+customer_grps_internalid[i].getId()+'">'+customer_grps_internalid[i].getValue(customer_grps_columns[0])+'</option>';
	}*/
	
	var resultSet =nlapiLoadSearch(null,'customsearch_alberta_cust_grp');
	

	var results= resultSet.runSearch();

	var start= 0;
	var end = 1000;
	var resultSetCount = 1000;
	do
	{
		var results_custgrp = results.getResults(start, end);
		
		for (var y=0;results_custgrp&&y<results_custgrp.length;y++)
		{

			var result = results_custgrp[y];
			var columns = result.getAllColumns();
			//nlapiLogExecution('debug','text',result.getText(columns[0]));
			//nlapiLogExecution('debug','value',result.getValue(columns[0]));
			/*var customergrp_alt_name = result.getValue(columns[0]);
			var customergrp_internal_id = result.getId();*/
			var customergrp_alt_name = result.getText(columns[0]);
			var customergrp_internal_id = result.getValue(columns[0]);
			
			if(customergrp_alt_name)
				html+='<option value="'+customergrp_internal_id+'">'+customergrp_alt_name+'</option>';	
		}
		
		resultSetCount  = results_custgrp.length;
		start = end;
		end = end +1000;

	}while (resultSetCount== 1000);
	
	html+='</select>'
	
	html+='<span class="glyphicon glyphicon-remove	icon1" id="custGrpClose" onclick="default_prodField(this.id)"></span>'
	html+='</div>'	
	html+='</div>'
	
	html+='<div class="col-lg-4 col-md-4 col-sm-4 col-xs-12">'
	html+='<div class="customer-div">'
	html+='<label>Customer</label>'
	html+='<select id="custval">'
	html+='<option value="0"></option>'
	
	/*var filters_customer = new Array();
	var column_customer = new Array();
	filters_customer[filters_customer.length] = new nlobjSearchFilter('isinactive', null, 'is', 'F');
	column_customer[column_customer.length] = new nlobjSearchColumn('internalid');
	column_customer[column_customer.length] = new nlobjSearchColumn('entityid');
	column_customer[column_customer.length] = new nlobjSearchColumn('altname');
	var customer_internalid = nlapiSearchRecord('customer',null, null, column_customer);
	
	nlapiLogExecution('debug','customer len',customer_internalid.length);
	for(var i=0;customer_internalid && i<customer_internalid.length;i++){
		html+='<option value="'+customer_internalid[i].getId()+'">'+customer_internalid[i].getValue(column_customer[2])+'</option>';
	}*/
	
	var resultSet =nlapiLoadSearch(null,'customsearch_alberta_item_pricing_srch');
	

	var results= resultSet.runSearch();

	var start= 0;
	var end = 1000;
	var resultSetCount = 1000;
	do
	{
		var results_cust = results.getResults(start, end);
		
		for (var y=0;results_cust&&y<results_cust.length;y++)
		{

			var result = results_cust[y];
			var columns = result.getAllColumns();

			var customer_alt_name = result.getText(columns[0]);
			var customer_internal_id = result.getValue(columns[0]);
			
			html+='<option value="'+customer_internal_id+'">'+customer_alt_name+'</option>';	
		}
		
		resultSetCount  = results_cust.length;
		start = end;
		end = end +1000;

	}while (resultSetCount== 1000);
	
	
	
	html+='</select>'
	html+='<span class="glyphicon glyphicon-remove	icon1" id="custClose" onclick="default_prodField(this.id)"></span>'
	html+='</div>'
	html+='<div class="consignee-div">'
	html+='<label>Consignee</label>'
	
	/*var consignee_filters=[];
	consignee_filters[consignee_filters.length] = new nlobjSearchFilter('isinactive', null, 'is', 'F');	
	consignee_filters[consignee_filters.length] = new nlobjSearchFilter('custrecord_albert_ns_item_price_consigne', null, 'is', 'F');	
	
	var consignee_columns=[];
	consignee_columns[0]=new nlobjSearchColumn('custrecord_albert_ns_item_price_consigne');
	var consignee_internalid = nlapiSearchRecord('customrecord_alberta_ns_pricing_list', null, consignee_filters, consignee_columns);
	
	html+='<select id="consigneeval">'
	html+='<option value="0"></option>'
	for(var i=0;consignee_internalid && i<consignee_internalid.length;i++){
		html+='<option value="'+consignee_internalid[i].getId()+'">'+consignee_internalid[i].getValue(consignee_columns[0])+'</option>';
	}*/
	
	html+='<select id="consigneeval">'
	html+='<option value="0"></option>'
	/*for(var i=0;consignee_internalid && i<consignee_internalid.length;i++){
		html+='<option value="'+consignee_internalid[i].getId()+'">'+consignee_internalid[i].getValue(consignee_columns[0])+'</option>';
	}*/
	var resultSet =nlapiLoadSearch(null,'customsearch_alberta_consignee_sch');
	

	var results= resultSet.runSearch();

	var start= 0;
	var end = 1000;
	var resultSetCount = 1000;
	do
	{
		var results_consignee = results.getResults(start, end);
		
		for (var y=0;results_consignee&&y<results_consignee.length;y++)
		{

			var result = results_consignee[y];
			var columns = result.getAllColumns();
			
			var consignee_alt_name = result.getText(columns[0]);
			var consignee_internal_id = result.getValue(columns[0]);
			nlapiLogExecution('debug',consignee_alt_name,consignee_internal_id);
			
			html+='<option value="'+consignee_internal_id+'">'+consignee_alt_name+'</option>';	
		}
		
		resultSetCount  = results_consignee.length;
		start = end;
		end = end +1000;

	}while (resultSetCount== 1000);
	
	
	
	html+='</select>'
	
	
	
	html+='<span class="glyphicon glyphicon-remove	icon1" id="consigneeClose" onclick="default_prodField(this.id)"></span>'
	html+='</div>'
	html+='</div>'

	html+='</div>'
	html+='<br/>'
	html+='<br/>'
	html+='<br/>'
	html+='<br/>'
	html+='<div class="table1">'
	html+='<table class="table table-responsive table-bordered" id="tblprice" style="margin-top:20px;color: black;">'
	html+='<tr>'
	html+='<th class="group2">Update</th>'
	html+='<th class="group1">Year</th>'
	html+='<th class="group1">Currency</th>'
	html+='<th class="group1">Group</th>'	
	html+='<th class="group1">Customer</th>'
	html+='<th class="group1">Consignee</th>'
	html+='<th class="group1">Item Name</th>'
	/*html+='<th class="group1">Grade Code</th>'
	html+='<th class="group1">Grade Description</th>'*/
	html+='<th class="group2">Jan</th>'
	html+='<th class="group2">Feb</th>'
	html+='<th class="group2">Mar</th>'
	html+='<th class="group2">Apr</th>'
	html+='<th class="group2">May</th>'
	html+='<th class="group2">Jun</th>'
	html+='<th class="group2">Juy</th>'
	html+='<th class="group2">Aug</th>'
	html+='<th class="group2">Sep</th>'
	html+='<th class="group2">Oct</th>'
	html+='<th class="group2">Nov</th>'
	html+='<th class="group2">Dec</th>'
	html+='</tr>'

	html+='</table>'
	html+='</div>'
	html+='<div class="btn-grp"><button class="btn btn-primary" id="prevbtn" onClick="showResult(this.id)">Previous</button><button id="nxtbtn" class="btn btn-primary" onClick="showResult(this.id)">Next</button></div>'
	html+='<div><span><textarea id="lastVal" hidden>0</textarea></span>'
	html+='</body>'
	html+='</html>'
	response.write(html);	
}

function clear_prodField(id)
{
	//alert('hello '+id);
	
	
	if(id=='prodClose')
		document.getElementById('prodVal').selectedIndex="0";
	/*if(id=='gradeClose')
		document.getElementById('gradeVal').selectedIndex="0";*/
	if(id=='custGrpClose')
		document.getElementById('custgrpval').selectedIndex="0";
	if(id=='custClose')
		document.getElementById('custval').selectedIndex="0";
	if(id=='consigneeClose')
		document.getElementById('consigneeval').selectedIndex="0";
	
	var prod_value=document.getElementById('prodVal').value;
	 var ddlReport = document.getElementById("prodVal");

	var class_text = ddlReport.options[ddlReport.selectedIndex].text;
	//var grade_value=document.getElementById('gradeVal').value;
	//alert('grade_value'+grade_value);
	var custgrp_value=document.getElementById('custgrpval').value;
	var cust_value=document.getElementById('custval').value;
	var consignee_drp_txt = document.getElementById("consigneeval");
	var consignee_value=consignee_drp_txt.options[consignee_drp_txt.selectedIndex].text;
	
	var years=document.getElementById('year').value;
	
	/*if(!years)
	{		
		var date = new Date();
							
		var years = date.getFullYear();			
	}*/
	
	var currency=document.getElementById('currencyVal').value;
	
	//alert('he');	
	jQuery.ajax({
		url: "/app/site/hosting/scriptlet.nl?script=418&deploy=1",
		type: "GET",
		data:  "&product_id=" + prod_value+"&custgrp_id=" + custgrp_value +"&years="+years+"&currency_name=" + currency+"&consignee_name="+consignee_value+"&cust_id="+cust_value+"&class_text="+class_text,
		success: function(result) 
		{
			//alert(result);
			var jsonResponse = JSON.parse(result);
			//alert('jsonResponse length'+jsonResponse.length);
			
			jsonResponse=jsonResponse.split('$$');
			//alert('jsonResponse1.length '+jsonResponse.length);
			var table = document.getElementById("tblprice");
			//table.innerHTML="";
			
			//var table = document.getElementById("tblprice");
			//var rowLen=table.rows.length;
			
			//alert('rowLen: '+rowLen);
			
			var tabLen=table.rows.length;
			//alert('tabLen '+tabLen);
			if(tabLen>1)
			{
				var count=tabLen;
				for(var k=0;k<tabLen-1;tabLen--)
				{
					
					//alert('k: '+k);
					document.getElementById("tblprice").deleteRow(count-1);
					count--;
					//alert('count: '+count);
				}
			}
			defaultValue(jsonResponse,id);		
			//if(jsonResponse.length>1)
			{
				/*for(var i=0;i<jsonResponse.length;i++)
				{
					var res=jsonResponse[i].split("@@");
					//for(var j=0;j<res.length;j++)
					if(res.length>1)
					{
						defaultValue(res,id);
					}
					else
					{						
						  var markup = "<tr><td colspan='18' id='mytd' style='text-align:center;'><b style='color: red'>No Data Available</b></td></tr>";
						  $("#tblprice").append(markup);						  
					}	
				}*/
			}
						
		}
	});	
}

function showResult(id)
{
	clear_prodField(id);	
}

function defaultValue(jsonResponse,id)
{	
	var lastVal=document.getElementById('lastVal').value;
	//alert('lastVal '+lastVal);
	
	var temp=Number(jsonResponse.length)-Number(lastVal);
	//alert('temp '+temp);alert('jsonResponse.length '+jsonResponse.length);
	
	var count=0;	
	
	if(lastVal==0)
	{
		document.getElementById("prevbtn").disabled = true;
	}
	else
	{
		document.getElementById("prevbtn").disabled = false;
	}
	
	if(id=="nxtbtn")
	{
		if(temp>100)
			var val=100+Number(lastVal);
		else
			var val=temp;
		
		//alert('nxtbtn '+val);
		
	  
		for(var i=lastVal;i<jsonResponse.length;i++)
		{
			var res=jsonResponse[i].split("@@");
			//alert('res.length '+res.length);
			//for(var j=0;j<res.length;j++)
			if(res.length>1)
			{
				var recId=res[0];
				//alert("recId"+recId);
				var table = document.getElementById("tblprice");				
				var row = table.insertRow(++count);

				if(i%2==0)
				{
					row.style.backgroundColor = "#f1f1f1";
				}
				
				//alert('res.length: '+res.length)
				for(var j=0;j<res.length;j++)
				{
					//alert('i '+i);alert('j '+j);
					if(res.length>21)
					{
						
					}
					else
					{
						var cell1 = row.insertCell(j);
						//var cell2 = row.insertCell(j);
						var url="https://system.na2.netsuite.com/app/common/custom/custrecordentry.nl?rectype=284&id=";
						//cell2.innerHTML = "NEW CELL2";
						if(j==0)
						{
							url+=res[j]+"&e=T";
							cell1.innerHTML = "<a href='"+url+"' target='_self' style='text-decoration:none;color:red'><b>Update<b></a>";
						}
						else
						{
							cell1.innerHTML = res[j];
						}
					}
											
				}
				if(i==val)
				{
					break;
				}
			}
			else
			{						
				  var markup = "<tr><td colspan='21' id='mytd' style='text-align:center;'><b style='color: red'>We couldn't find any records.</b></td></tr>";
				  $("#tblprice").append(markup);						  
			}	
		}
		//alert("i "+i);
		if(lastVal==0)
			document.getElementById('lastVal').value=i+1;
		else
			document.getElementById('lastVal').value=i;
		//alert('hello1');
		
		if(temp==val)
		{
			document.getElementById("nxtbtn").disabled = true;
		}
		else
		{
			document.getElementById("nxtbtn").disabled = false;
		}
		
		//alert('count '+count);
		var table = document.getElementById("tblprice");
		var tabLen=table.rows.length;
		//alert('tabLen '+tabLen);
	}
	else if(id=="prevbtn")
	{
		//alert(temp);alert('lastVal '+lastVal);
		var lstVal=lastVal;
		var temp_val='';
		if(temp>100)
			var val=Number(lastVal)-100;
		else
			var val=temp;
		
		if(temp==0)
		{
			var val=Number(lastVal)-100;
		}
		
		var remVal=Number(lastVal)%100;
		
		if(remVal>1)
		{
			//alert('remVal '+remVal);
			lastVal=(Number(lastVal)-remVal)+1;
			
			document.getElementById("nxtbtn").disabled = false;
		}
		else
			lastVal=(Number(lastVal)-100);
		
		//alert('lastVal1 '+lastVal);
		temp_val=(Number(lastVal)-100)-1;	
		//alert('temp_val '+temp_val);
		
		
		for(var i=lstVal;i>lastVal;i--)
		{
			//alert('jsonResponse[temp_val] '+jsonResponse[temp_val]);
			var res=jsonResponse[temp_val].split("@@");
			temp_val++;
			//alert('res '+res);
			//for(var j=0;j<res.length;j++)
			if(res.length>1)
			{
				var recId=res[0];
				//alert("recId"+recId);
				var table = document.getElementById("tblprice");				
				var row = table.insertRow(++count);		
				if(i%2==0)
				{
					row.style.backgroundColor = "#f1f1f1";
				}
				
				//alert('res.length: '+res.length)
				for(var j=0;j<res.length;j++)
				{
					//alert('i '+i);alert('j '+j);
					var a=j%2;					
					
					if(res.length>21)
					{
						//#f1f1f1!important;
					}
					else
					{
						var cell1 = row.insertCell(j);
						//var cell2 = row.insertCell(j);
						var url="https://system.na2.netsuite.com/app/common/custom/custrecordentry.nl?rectype=284&id=";
						//cell2.innerHTML = "NEW CELL2";
						if(j==0)
						{
							url+=res[j]+"&e=T";
							//alert("url "+url);
							cell1.innerHTML = "<a href='"+url+"' target='_self' style='text-decoration:none;color:red'><b>Update<b></a>";
						}
						else
						{
							//alert("res j"+res[j]);
							cell1.innerHTML = res[j];
						}
					}
											
				}
				if(i==val)
				{
					break;
				}
			}
			else
			{						
				  var markup = "<tr><td colspan='21' id='mytd' style='text-align:center;'><b style='color: red'>We couldn't find any records.</b></td></tr>";
				  $("#tblprice").append(markup);						  
			}	
		}
		
		
		//alert("lastVal "+lastVal);
		/*if(lastVal==0)
			document.getElementById('lastVal').value=i+1;
		else*/
		if(lastVal==1)
			lastVal=0;
		
		document.getElementById('lastVal').value=lastVal;
		//alert("val "+val);
		//alert("temp "+temp);
		
		if(temp==val || lastVal==101)
		{
			document.getElementById("prevbtn").disabled = true;
		}
		else
		{
			document.getElementById("prevbtn").disabled = false;
		}
		
		if(lastVal%100==1 && lastVal!=101)
		{
			document.getElementById("prevbtn").disabled = false;
		}
	}	
}

function default_prodField(id)
{
	//alert('hello'+id);
	
	if(id=='prodClose')
		document.getElementById('prodVal').selectedIndex="0";
	/*if(id=='gradeClose')
		document.getElementById('gradeVal').selectedIndex="0";*/
	if(id=='custGrpClose')
		document.getElementById('custgrpval').selectedIndex="0";
	if(id=='custClose')
		document.getElementById('custval').selectedIndex="0";
	if(id=='consigneeClose')
		document.getElementById('consigneeval').selectedIndex="0";
	
	var prod_value=document.getElementById('prodVal').value;
	 var ddlReport = document.getElementById("prodVal");

	var class_text = ddlReport.options[ddlReport.selectedIndex].text;
	
	//alert('class_text'+class_text);
	//alert('prod_value'+prod_value);
	//var grade_value=document.getElementById('gradeVal').value;
	//alert('grade_value'+grade_value);
	var custgrp_value=document.getElementById('custgrpval').value;
	var cust_value=document.getElementById('custval').value;
	var consignee_value=document.getElementById('consigneeval').value;
	
	var years=document.getElementById('year').value;
	
	if(!years && (id=='btnRefesh' || id=='prodClose' || id=='custGrpClose' || id=='custClose' || id=='consigneeClose'))
		years=1;
	
	var currency=document.getElementById('currencyVal').value;
	
	
	//alert('he');	
	jQuery.ajax({
		url: "/app/site/hosting/scriptlet.nl?script=418&deploy=1",
		type: "GET",
		data:  "&product_id=" + prod_value+"&custgrp_id=" + custgrp_value +"&years="+years+"&currency_name=" + currency+"&consignee_name="+consignee_value+"&cust_id="+cust_value+"&class_text="+class_text,
		success: function(result) 
		{			
			var jsonResponse = JSON.parse(result);
			//alert('jsonResponse length'+jsonResponse.length);
			
			jsonResponse=jsonResponse.split('$$');
			//alert('jsonResponse1.length '+jsonResponse.length);
			var table = document.getElementById("tblprice");
			
			
			var tabLen=table.rows.length;
			//alert('tabLen '+tabLen);
			if(tabLen>1)
			{
				var count=tabLen;
				for(var k=0;k<tabLen-1;tabLen--)
				{
					
					//alert('k: '+k);
					document.getElementById("tblprice").deleteRow(count-1);
					count--;
					//alert('count: '+count);
				}
			}
			
			if(jsonResponse)
			{
				var temp_count='';
				if(jsonResponse.length>100)
				{
					temp_count=100;
				}
				else	
					temp_count=jsonResponse.length;
			
				for(var i=0;i<temp_count;i++)
				{
					document.getElementById('lastVal').value=101;
					
					if(jsonResponse.length>100)
					{
						document.getElementById("nxtbtn").disabled = false;
						document.getElementById("prevbtn").disabled = true;
					}
					else
					{
						document.getElementById("nxtbtn").disabled = true;
						document.getElementById("prevbtn").disabled = true;
					}						
					
					
					var res=jsonResponse[i].split("@@");
					//for(var j=0;j<res.length;j++)
					if(res.length>1)
					{
						var recId=res[0];
						//alert("recId"+recId);
										
						var row = table.insertRow(i+1);					
						
						if(i%2==0)
						{
							row.style.backgroundColor = "#f1f1f1";
						}
					
						//alert('res.length: '+res.length)
						for(var j=0;j<res.length;j++)
						{
							//alert('i '+i);alert('j '+j);
							
							var cell1 = row.insertCell(j);
							//var cell2 = row.insertCell(j);
							var url="https://system.na2.netsuite.com/app/common/custom/custrecordentry.nl?rectype=284&id=";
							//cell2.innerHTML = "NEW CELL2";
							if(j==0)
							{
								url+=res[j]+"&e=T";
								cell1.innerHTML = "<a href='"+url+"' target='_self' style='text-decoration:none;color:red'><b>Update<b></a>";
							}
							else
							{
								cell1.innerHTML = res[j];
							}						
						}
					}
					else
					{
						/*var row = table.insertRow(1);					
						var table = document.getElementById("tblprice");
						var cell1 = row.insertCell(0);
						cell1.innerHTML = "<td id='myTd' colspan='18'><b>No Data Available</b></td>";
						document.getElementById("myTd").colSpan = "18";
						document.getElementById("myTd").style.textAlign = "center";*/
						
						  var markup = "<tr><td colspan='21' id='mytd' style='text-align:center;'><b style='color: red'>We couldn't find any records.</b></td></tr>";
						  $("#tblprice").append(markup);
						  document.getElementById("nxtbtn").disabled = true;
						  document.getElementById("prevbtn").disabled = true;
						  //document.getElementById("myTd").style.textAlign = "center";
					}	
				}
				if(!id)
				{		
					var date = new Date();
										
					var years = date.getFullYear();		
					document.getElementById('year').value=years;
				}	
			}
						
		}
	});	
}