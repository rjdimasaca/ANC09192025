function albertaSoShipToAddressSet(type,name)
{	
	if(name=='custbody_consignee' || name=='entity' || name=='trandate')
	{
		var entity=nlapiGetFieldValue('entity');
		
		var consignee=nlapiGetFieldText('custbody_consignee');
		
		if(!entity || !consignee)
		{
			nlapiSetFieldValue('shipaddress','',false,false);
			return false;
		}
		else
		{
			 //alert('consignee'+consignee);
			 var filters=new Array();
			 filters[0]=new nlobjSearchFilter('name',null,'is',consignee);
			 filters[1]=new nlobjSearchFilter('custrecord_alberta_ns_customer',null,'anyof',entity);
			 filters[2]=new nlobjSearchFilter('isinactive',null,'is','F');
			 
			 var columns=new Array();
			 columns[0]=new nlobjSearchColumn('custrecord_alberta_ns_ship_address');
			 
			 
			 var alberta_consignee_rec_srch=nlapiSearchRecord('customrecord_alberta_ns_consignee_record',null,filters,columns);
			 
			 if(alberta_consignee_rec_srch)
			 {
				 var ship_address=alberta_consignee_rec_srch[0].getValue('custrecord_alberta_ns_ship_address');
				 //alert('ship_address'+ship_address);
			 }
				
			 
			 if(ship_address)
				nlapiSetFieldValue('shipaddress',ship_address,false,false);
			 else
				nlapiSetFieldValue('shipaddress','',false,false);		
			 
			 return true;
		}		
	}
}

function albertaSoShipToAddressSetValidateLine(type,name)
{	
	try
	{
		var entity=nlapiGetFieldValue('entity');
		//alert('entity '+entity);
			
		var consignee=nlapiGetFieldValue('custbody_consignee');
		
		if(!entity)
		{
			return false;
		}
		
		var date=nlapiGetFieldValue('custbody_wmpricingdate'); //replaced trandate with PricingDate
					 
		//alert('date'+date);

		date=date.split('/');

		var month=date[0];
		var count=0;
		//alert('month'+month);
		 
		//if(name=='item')
		{
			var item_id=nlapiGetCurrentLineItemValue('item','item');

			/*alert('item_id '+item_id);		
			alert('consignee '+consignee);
			alert('entity '+entity);
			alert('date[2] '+date[2]);*/
			var lookUpCustVal=nlapiLookupField('customer',entity,'parent');
			//alert('lookUpCustVal: '+lookUpCustVal);
			if(lookUpCustVal)
			{
				if(item_id)
				{
					if(!consignee) 	
						consignee="@NONE@";

					
					
					var yr=date[2];
					
					var returnVal=getCustValue(consignee,entity,lookUpCustVal,yr,month,item_id);
					
					if(!returnVal)
					{
						consignee="@NONE@";							
						
							
						var returnVal=getCustValue(consignee,entity,lookUpCustVal,yr,month,item_id);						
						
						if(!returnVal)
						{
							entity="@NONE@";	
							var returnVal=getCustValue(consignee,entity,lookUpCustVal,yr,month,item_id);
							if(returnVal)
							{
								return true;
							}
						}
						else
							return true;
					}
					else
					{
						return true;
					}
					return true;
				}
			}
							 
		}
	}
	catch(e)
	{
		nlapiLogExecution('debug','Error ',e.message)
	}	
}

function getCustValue(consignee,entity,lookUpCustVal,yr,month,item_id)
{	
	//alert('consignee'+consignee);
	var filter=new Array();
	filter[0]=new nlobjSearchFilter('custrecord_albert_ns_item_price_consigne',null,'is',consignee);
	filter[1]=new nlobjSearchFilter('custrecord_albert_ns_item_price_customer',null,'is',entity);
	filter[2]=new nlobjSearchFilter('custrecord_alberta_ns_item_pricing_year',null,'is',yr);	
	if(month==1)
	filter[3]=new nlobjSearchFilter('custrecord_alberta_ns_month_jan',null,'isnotempty',"");
	if(month==2)
	filter[3]=new nlobjSearchFilter('custrecord_alberta_ns_month_feb',null,'isnotempty',"");
	if(month==3)
	filter[3]=new nlobjSearchFilter('custrecord_alberta_ns_month_march',null,'isnotempty',"");
	if(month==4)
	filter[3]=new nlobjSearchFilter('custrecord_alberta_ns_month_april',null,'isnotempty',"");
	if(month==5)
	filter[3]=new nlobjSearchFilter('custrecord_alberta_ns_month_may',null,'isnotempty',"");
	if(month==6)
	filter[3]=new nlobjSearchFilter('custrecord_alberta_ns_month_june',null,'isnotempty',"");
	if(month==7)
	filter[3]=new nlobjSearchFilter('custrecord_alberta_ns_month_july',null,'isnotempty',"");
	if(month==8)
	filter[3]=new nlobjSearchFilter('custrecord_alberta_ns_month_august',null,'isnotempty',"");
	if(month==9)
	filter[3]=new nlobjSearchFilter('custrecord_alberta_ns_month_sep',null,'isnotempty',"");
	if(month==10)
	filter[3]=new nlobjSearchFilter('custrecord_alberta_ns_month_oct',null,'isnotempty',"");
	if(month==11)
	filter[3]=new nlobjSearchFilter('custrecord_alberta_ns_month_nov',null,'isnotempty',"");
	if(month==12)
	filter[3]=new nlobjSearchFilter('custrecord_alberta_ns_month_dec',null,'isnotempty',"");

	filter[4]=new nlobjSearchFilter('custrecord_alberta_newsprin_customer_grp',null,'anyof',lookUpCustVal);
	filter[5]=new nlobjSearchFilter('custrecord_alberta_ns_item',null,'anyof',item_id);	
	
	filter[6]=new nlobjSearchFilter('isinactive',null,'is','F');

	var column=new Array();			

	column[0]= new nlobjSearchColumn("custrecord_alberta_newsprin_customer_grp").setSort(false);
	column[1]=new nlobjSearchColumn("custrecord_albert_ns_item_price_customer").setSort(false);
	column[2]=new nlobjSearchColumn("custrecord_albert_ns_item_price_consigne").setSort(false);
	

	if(month==1)
	column[3]=new nlobjSearchColumn('custrecord_alberta_ns_month_jan');
	if(month==2)
	column[3]=new nlobjSearchColumn('custrecord_alberta_ns_month_feb');
	if(month==3)
	column[3]=new nlobjSearchColumn('custrecord_alberta_ns_month_march');
	if(month==4)
	column[3]=new nlobjSearchColumn('custrecord_alberta_ns_month_april');
	if(month==5)
	column[3]=new nlobjSearchColumn('custrecord_alberta_ns_month_may');
	if(month==6)
	column[3]=new nlobjSearchColumn('custrecord_alberta_ns_month_june');
	if(month==7)
	column[3]=new nlobjSearchColumn('custrecord_alberta_ns_month_july');
	if(month==8)
	column[3]=new nlobjSearchColumn('custrecord_alberta_ns_month_august');
	if(month==9)
	column[3]=new nlobjSearchColumn('custrecord_alberta_ns_month_sep');
	if(month==10)
	column[3]=new nlobjSearchColumn('custrecord_alberta_ns_month_oct');
	if(month==11)
	column[3]=new nlobjSearchColumn('custrecord_alberta_ns_month_nov');
	if(month==12)
	column[3]=new nlobjSearchColumn('custrecord_alberta_ns_month_dec');

	var alberta_price_rec_srch=nlapiSearchRecord('customrecord_alberta_ns_pricing_list',null,filter,column);
	
	if(alberta_price_rec_srch)
	{				
		 var pricing=alberta_price_rec_srch[0].getValue(column[3]);
		 //alert('pricing: '+pricing);
		 if(pricing)
		 {
			 nlapiSetCurrentLineItemValue('item','price',-1,false,false);
			 nlapiSetCurrentLineItemValue('item','rate',pricing,false,false);
		 }
		 else
			 nlapiSetCurrentLineItemValue('item','price',1,false,false);
		
		return alberta_price_rec_srch;
							
	}
	else
		return alberta_price_rec_srch;	
}