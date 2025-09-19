/**
 * @NApiVersion 2.1
 * @NScriptType Suitelet
 * @NModuleScope SameAccount
 */
define(["require", "exports", "N/log", "N/query", "N/ui/serverWidget", "N/url", "N/runtime"], function (require, exports, log, query, serverWidget, url, runtime) {
    "use strict";
    class ItemsNoImagesQuery {
        onRequest(context) {
            log.debug({
                title: "test",
                details: "test"
            });
            if (context.request.method == "POST") {
                let reqPayload = JSON.parse(context.request.body);
                context.response.setHeader('Content-Type', 'application/json');
                let moreRecords = true;
                let itemsArr = new Array();
                let rownumStart = 1;
                let rownumEnd = rownumStart + 5000;
                log.debug({
                    title: 'reqPayload',
                    details: JSON.stringify(reqPayload)
                });
                if (reqPayload.action == 'executeQuery') {
                    this.executeQuery(context, reqPayload);
                }
            }
            else {
                const scriptUrl = url.resolveScript({
                    scriptId: runtime.getCurrentScript().id,
                    deploymentId: runtime.getCurrentScript().deploymentId,
                    returnExternalUrl: false
                });
                const queryToolForm = serverWidget.createForm({
                    title: "Web Store Items with No Images",
                    hideNavBar: false
                });
                let htmlField = queryToolForm.addField({
                    id: 'custpage_field_html',
                    type: serverWidget.FieldType.INLINEHTML,
                    label: 'HTML'
                });
                htmlField.defaultValue = this.generateHTMLContent(scriptUrl);
                context.response.writePage(queryToolForm);
            }
        }
        getQueryString(start, end) {
            let queryString = '';
            queryString = `SELECT * FROM ( ` +
                `SELECT ` +
                `ROWNUM AS RN, * FROM ( ` +
                `SELECT ` +
                `Item.ID, ` +
                `Item.ItemID, ` +
                `Item.STOREDISPLAYNAME, ` +
                `Item.ISONLINE, ` +
                `Item.ITEMTYPE, ` +
                `ItemVendor.Vendor, ` +
                `Vendor.CompanyName, ` +
                `ItemVendor.PreferredVendor ` +
                `FROM Item INNER JOIN ` +
                `ItemVendor ON Item.ID = ItemVendor.Item ` +
                `INNER JOIN ` +
                `Vendor ON Vendor.ID = ItemVendor.Vendor ` +
                `LEFT JOIN ` +
                `ItemImage ON Item.ID = ItemImage.Item ` +
                `WHERE ItemImage.Item IS NULL ` +
                `AND Item.ISONLINE = 'T' ` +
                `AND Item.ITEMTYPE = 'InvtPart' ` +
                `AND ItemVendor.PreferredVendor = 'T' ` +
                `ORDER BY Item.ID, ` +
                `Item.ItemID )) ` +
                `WHERE RN BETWEEN '${start}' AND '${end}'`;
            return queryString;
        }
        generateHTMLContent(scripturl) {
            let reqQuery = this.getQueryString(1, 5000);
            return `
        <link rel="stylesheet" href="https://maxcdn.bootstrapcdn.com/bootstrap/4.5.2/css/bootstrap.min.css">
		<script src="/ui/jquery/jquery-3.5.1.min.js"></script>
		<script src="https://maxcdn.bootstrapcdn.com/bootstrap/4.5.2/js/bootstrap.min.js"></script>
        <style type = "text/css"> 
		
			input[type="text"], input[type="search"], textarea, button {
				outline: none;
				box-shadow:none !important;
				border: 1px solid #ccc !important;
			}
			
			p, pre {
				font-size: 10pt;
			}
			
			td, th { 
				font-size: 10pt;
				border: 3px;
			}
			
			th {
				text-transform: lowercase;
				font-weight: bold;				
			}
			
		</style>
        <script>
            function querySubmit() {
                document.getElementById('resultsDiv').style.display = "block";
		
                document.getElementById('resultsDiv').innerHTML = '<h5 style="color: green;">Running query...</h5>';

                var xhr = new XMLHttpRequest()
                ,   reqPayload = {
                    query: "${reqQuery}",
                    action: "executeQuery"
                };

                xhr.open('POST', '${scripturl}', true);

                xhr.setRequestHeader( 'Accept', 'application/json' );
                
                xhr.send(JSON.stringify(reqPayload));

                xhr.onload = function() {
		
                    if( xhr.status === 200 ) {	
                    
                        try {
                            var queryResponsePayload = JSON.parse( xhr.response );
                            
                        } catch( e ) {	
                            alert( 'Unable to parse the response.' );
                            return;					
                        }
                
                        if ( queryResponsePayload['error'] == undefined ) {		
    
                            generateTable(queryResponsePayload);																															
                
                        } else {
            
                            var content = '<h5 class="text-danger">Error</h5>';
                            content += '<pre>';
                            content += queryResponsePayload.error.message;
                            content += '</pre>';		
    
                            document.getElementById('resultsDiv').innerHTML = content;								
            
                        }																																			
                    
                    } else {
                
                        var content = '<h5 class="text-danger">Error</h5>';
                        content += '<pre>';
                        content += 'XHR Error: Status ' + xhr.status;
                        content += '</pre>';		
    
                        document.getElementById('resultsDiv').innerHTML = content;								
                
                    }
                
                }
            }

            function generateTable(queryResponsePayload) {
                if ( queryResponsePayload.records.length > 0 ) {
                                    
                    var columnNames = Object.keys( queryResponsePayload.records[0] );
                    
                    var firstColumnIsRowNumber = false;
                    var rowNumbersHidden = false;
    
                    var thead = '<thead class="thead-light">';
                    thead += '<tr>';
                    for ( i = 0; i < columnNames.length; i++ ) {
                        thead += '<th>' + columnNames[i] + '</th>';
                    }
                    thead += '</tr>';
                    thead += '</thead>';
    
                    var tbody = '<tbody>';
                    for ( r = 0; r < queryResponsePayload.records.length; r++ ) {		
                        tbody += '<tr>';
                        for ( i = 0; i < columnNames.length; i++ ) {
                            var value = queryResponsePayload.records[r][ columnNames[i] ];
                            if ( value === null ) {
                                value = '<span style="color: #ccc;">' + value + '</span>';
                            }
                            if ( ( i == 0 ) && ( firstColumnIsRowNumber ) && ( rowNumbersHidden === false) ) {
                                tbody += '<td style="text-align: center;">' + value + '</td>';
                            } else if ( ( i == 0 ) && ( firstColumnIsRowNumber ) && ( rowNumbersHidden === true) ) {
                                continue;							
                            } else {
                                tbody += '<td>' + value + '</td>';					
                            }
                        }				
                        tbody += '</tr>';		
                    }	
                    tbody += '</tbody>';
                
                    var content = '<h5 style="margin-bottom: 3px; color: #4d5f79; font-weight: 600;">Results</h5>';
                    content += 'Retrieved ' + queryResponsePayload.records.length;
                    content += '<div class="table-responsive">';
                    content += '<table class="table table-sm table-bordered table-hover table-responsive-sm" id="resultsTable">';
                    content += thead;
                    content += tbody;
                    content += '</table>';
                    content += '</div>';		
    
                    document.getElementById('resultsDiv').innerHTML = content;
                    document.getElementById('downloadCSV').style.display = 'block';
                
                } else {
                
                    document.getElementById('resultsDiv').innerHTML = '<h5 class="text-warning">No Records Were Found</h5>';
                    document.getElementById('downloadCSV').style.display = 'none';
                    
                }
            }

            function exportListAsCSV() {
                var csv_data = [];

                var resultsTable = document.getElementById('resultsTable')
                ,   rows = resultsTable.getElementsByTagName('tr');

                console.log("rows", rows);

                for(var idx = 0; idx < rows.length; idx++) {
                    var cols = rows[idx].querySelectorAll('td,th');

                    console.log("cols", cols);

                    var csvrow = [];
                    
                    for(var idy = 0; idy < cols.length; idy++) {

                        csvrow.push("\\"" + cols[idy].innerHTML.replace( /\\"/g , "\\"\\"" ) + "\\"");
                    }

                    csv_data.push(csvrow.join(","));
                }

                csv_data = csv_data.join("\\n");
                
                var csvFile = new Blob([csv_data], { type: "text/csv" });

                var temp_link = document.createElement('a'),
                    dateObj = new Date(),
                    yearToday = dateObj.getFullYear(),
                    dateMonth = dateObj.getMonth(),
                    monthToday = dateMonth < 10 ? '0'+ dateMonth+1 : dateMonth+1,
                    dateToday = dateObj.getDate(),
                    csvFileDate = monthToday+dateToday+yearToday;

                temp_link.download = "ItemsWithNoImages"+csvFileDate+".csv";
                let url = window.URL.createObjectURL(csvFile);
                temp_link.href = url;

                temp_link.style.display = "none";
                document.body.appendChild(temp_link);

                // Automatically click the link to trigger download 
                temp_link.click();
                document.body.removeChild(temp_link);
            }
        </script>
        <table style="table-layout: fixed; width: 100%; border-spacing: 6px; border-collapse: separate;">
            <tr>				
				<td width="55%" style="text-align: left;">
					<div id="buttonsDiv">
						<button type="button" class="btn btn-sm btn-success" onclick="querySubmit();" accesskey="g">Generate List</button>	
					</div>
				</td>
                <td>
                    <div id="downloadCSV" style="display: none;">
						<button type="button" class="btn btn-sm" onclick="exportListAsCSV();">Export as CSV</button>	
					</div>
                </td>											
			</tr>
            <tr>
				<td colspan="3">	
					<div id="resultsDiv" style="max-width: 100%; margin-top: 12px; display: none; overflow: auto; overflow-y: hidden;">
					<!-- RESULTS -->								
					</div>
				</td>
		    </tr>	
        </table>
        `;
        }
        executeQuery(ctx, payload) {
            let nestedSQL = payload.query + "\n";
            log.debug("nestedSQL", nestedSQL)
            var responsePayload = {};
            try {
                let records = query.runSuiteQL({ query: nestedSQL }).asMappedResults();
                log.debug({ title: 'records', details: JSON.stringify(records) });
                responsePayload = { 'records': records };
            }
            catch (e) {
                log.debug({
                    title: "There's an error with your query",
                    details: JSON.stringify(e)
                });
                responsePayload = { 'error': e };
            }
            ctx.response.write(JSON.stringify(responsePayload, null, 5));
        }
    }
    const itemsNoImageQuery = new ItemsNoImagesQuery();
    return {
        onRequest: (context) => itemsNoImageQuery.onRequest(context)
    };
});
