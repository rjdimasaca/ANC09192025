/**
 * @NApiVersion 2.1
 * @NScriptType Suitelet
 */
define(['N/ui/serverWidget', 'N/query', 'N/url'], (serverWidget, query, url) => {
    var forecast_alloc_helper_url = "";
    const onRequest = (context) => {
        log.debug("onRequest context", context)
        forecast_alloc_helper_url = url.resolveScript({
            scriptId : "customscript_anc_sl_forecastalloc_helper",
            deploymentId : "customdeploy_anc_sl_forecastalloc_helper"
        })
        log.debug("forecast_alloc_helper_url", forecast_alloc_helper_url)
        if (context.request.method === 'GET') {
            const form = serverWidget.createForm({ title: 'Sales Forecast' });

            // const filterFieldGroupObj = form.addFieldGroup({
            //     id: 'custpage_fldgroup_filters',
            //     label: 'Pre-Filters'
            // });
            //
            // const yearFieldObj = form.addField({
            //     id: 'custpage_filter_years',
            //     type: serverWidget.FieldType.SELECT,
            //     source : "customrecord_anc_pf_years",
            //     label: "Year",
            //     container : "custpage_fldgroup_filters"
            // });
            // const monthFieldObj = form.addField({
            //     id: 'custpage_filter_month',
            //     type: serverWidget.FieldType.MULTISELECT,
            //     source : "customrecord_anc_pf_months",
            //     label: "Months",
            //     container : "custpage_fldgroup_filters"
            // });
            // const customerGroupFieldObj = form.addField({
            //     id: 'custpage_filter_customergroup',
            //     type: serverWidget.FieldType.MULTISELECT,
            //     source : "customer",
            //     label: "Customer Group",
            //     container : "custpage_fldgroup_filters"
            // });
            // const customerFieldObj = form.addField({
            //     id: 'custpage_filter_customer',
            //     type: serverWidget.FieldType.MULTISELECT,
            //     source : "customer",
            //     label: "Customer",
            //     container : "custpage_fldgroup_filters"
            // });
            // const customerConsigneeFieldObj = form.addField({
            //     id: 'custpage_filter_consignee',
            //     type: serverWidget.FieldType.MULTISELECT,
            //     source : "customrecord_alberta_ns_consignee_record",
            //     label: "Consignee",
            //     container : "custpage_fldgroup_filters"
            // });
            // const gradeFieldObj = form.addField({
            //     id: 'custpage_filter_grade',
            //     type: serverWidget.FieldType.MULTISELECT,
            //     source : "item",
            //     label: "Grade",
            //     container : "custpage_fldgroup_filters"
            // });

            const forecastFieldGroupObj = form.addFieldGroup({
                id: 'custpage_fldgroup_forecast',
                label: 'Sales Forecast'
            });

            // var inlineHtmlField = {}
            const inlineHtmlField = form.addField({
                id: 'custpage_inlinehtml',
                type: serverWidget.FieldType.INLINEHTML,
                label: 'HTML Table',
                container : "custpage_fldgroup_forecast"
            });

            const html = `
<script>jQuery("[data-field-name='custpage_inlinehtml']").parents('td').eq(1).css('width', '100%');</script>
                <html>
                <head>
                    <link rel="stylesheet" type="text/css" href="https://cdn.datatables.net/1.13.6/css/jquery.dataTables.min.css">
                    <script src="https://code.jquery.com/jquery-3.7.1.min.js"></script>
                    <script src="https://cdn.datatables.net/1.13.6/js/jquery.dataTables.min.js"></script>
                    <link href="https://cdn.jsdelivr.net/npm/select2@4.1.0-rc.0/dist/css/select2.min.css" rel="stylesheet" />
                    <script src="https://cdn.jsdelivr.net/npm/select2@4.1.0-rc.0/dist/js/select2.min.js"></script>
                    <script src="https://cdn.datatables.net/fixedheader/3.2.0/js/dataTables.fixedHeader.min.js"></script>
                    <style>
                      #loadingModal {
                        position: fixed;
                        top: 0;
                        left: 0;
                        width: 100%;
                        height: 100%;
                        background-color: rgba(0, 0, 0, 0.5);
                        color: white;
                        display: flex;
                        justify-content: center;
                        align-items: center;
                        font-size: 20px;
                        z-index: 9999;
                        visibility: visible;
                      }
                    
                      #loadingModal.hidden {
                        visibility: hidden;
                      }
                    
                      .spinner {
                        border: 4px solid rgba(255, 255, 255, 0.3);
                        border-top: 4px solid white;
                        border-radius: 50%;
                        width: 50px;
                        height: 50px;
                        animation: spin 1s linear infinite;
                      }
                    
                      @keyframes spin {
                        0% { transform: rotate(0deg); }
                        100% { transform: rotate(360deg); }
                      }
                    </style>
                    
                    
                    <script>
                        document.addEventListener('DOMContentLoaded', () => {
                            const currentYear = new Date().getFullYear().toString();
                            document.querySelector("#years").value = currentYear;
                
                            preFilterYear();
                        });
                    </script>
                    
                    
                    <div id="loadingModal">
                      <div class="spinner"></div>
                      <span>Loading... Please wait</span>
                    </div>
                    
                    <script>
                        require([], function() {
                            window.onload = function() {
                                jQuery(document).ready(function($) {
                                    
                                    $('#loadingModal').removeClass('hidden');
                                    $('#loadingModal').addClass('hidden');
                                    
                                });
                            };
                        });
                    </script>
                </head>
                <body>
                    <form id="customerForm">
                        
                        <label for="years">Target Year:</label>
                        <select id="years">
                          <option value="2050">2050</option>
                          <option value="2049">2049</option>
                            <option value="2048">2048</option>
                          <option value="2047">2047</option>
                          <option value="2046">2046</option>
                            <option value="2045">2045</option>
                          <option value="2044">2044</option>
                          <option value="2043">2043</option>
                          <option value="2042">2042</option>
                          <option value="2041">2041</option>
                          <option value="2040">2040</option>
                          <option value="2039">2039</option>
                          <option value="2038">2038</option>
                          <option value="2037">2037</option>
                          <option value="2036">2036</option>
                          <option value="2035">2035</option>
                          <option value="2034">2034</option>
                          <option value="2033">2033</option>
                          <option value="2032">2032</option>
                          <option value="2031">2031</option>
                          <option value="2030">2030</option>
                          <option value="2029">2029</option>
                          <option value="2028">2028</option>
                          <option value="2027">2027</option>
                          <option value="2026">2026</option>
                          <option value="2025">2025</option>
                          <option value="2024">2024</option>
                          <option value="2023">2023</option>
                        </select>
                        
                        
                        
                        <table role="presentation" cellpadding="0" cellspacing="0">
                        <tbody>
                        <tr class="uir-buttons">
                        <td>
                        <table id="tbl_secondaryedit" cellpadding="0" cellspacing="0" border="0" class="uir-button" style="margin-right:6px;" role="presentation">
                        <tbody>
                        <tr id="tr_secondaryedit" class="pgBntG pgBntB"> <td id="tdleftcap_secondaryedit">
                        <img src="/images/nav/ns_x.gif" class="bntLT" border="0" height="50%" width="3" alt=""> 
                        <img src="/images/nav/ns_x.gif" class="bntLB" border="0" height="50%" width="3" alt=""> 
                        </td> <td id="tdbody_secondaryedit" height="20" valign="top" nowrap="" class="bntBgB"> 
                        <input type="button" style="" class="rndbuttoninpt bntBgT " value="Submit Changes" id="secondaryedit" name="secondaryedit" onclick="collectInput(); return false;" onmousedown="this.setAttribute('_mousedown','T'); setButtonDown(true, false, this);" onmouseup="this.setAttribute('_mousedown','F'); setButtonDown(false, false, this);" onmouseout="if(this.getAttribute('_mousedown')=='T') setButtonDown(false, false, this);" onmouseover="if(this.getAttribute('_mousedown')=='T') setButtonDown(true, false, this);" fdprocessedid="ht99do" _mousedown="F">
                        </td> 
                        <td id="tdrightcap_secondaryedit"> 
                        <img src="/images/nav/ns_x.gif" height="50%" class="bntRT" border="0" width="3" alt=""> <img src="/images/nav/ns_x.gif" height="50%" class="bntRB" border="0" width="3" alt="">
                        </td> 
                        </tr> 
                        </tbody>
                        </table> 
                        </td>
                         <td> 
                         <table id="tbl_secondary_back" cellpadding="0" cellspacing="0" border="0" class="uir-button" style="margin-right:6px;" role="presentation"> 
                         <tbody>
                         <tr id="tr_secondary_back" class="pgBntG"> <td id="tdleftcap_secondary_back"><img src="/images/nav/ns_x.gif" class="bntLT" border="0" height="50%" width="3" alt=""> 
                         <img src="/images/nav/ns_x.gif" class="bntLB" border="0" height="50%" width="3" alt=""> 
                         </td> <td id="tdbody_secondary_back" height="20" valign="top" nowrap="" class="bntBgB">
                          <input type="button" style="" class="rndbuttoninpt bntBgT " value="Pre-Filter" id="secondary_back" name="secondary_back" onclick="preFilterYear(); return false;" onmousedown="this.setAttribute('_mousedown','T'); setButtonDown(true, false, this);" onmouseup="this.setAttribute('_mousedown','F'); setButtonDown(false, false, this);" onmouseout="if(this.getAttribute('_mousedown')=='T') setButtonDown(false, false, this);" onmouseover="if(this.getAttribute('_mousedown')=='T') setButtonDown(true, false, this);" fdprocessedid="rwkb9h"></td> 
                          <td id="tdrightcap_secondary_back"> <img src="/images/nav/ns_x.gif" height="50%" class="bntRT" border="0" width="3" alt=""> <img src="/images/nav/ns_x.gif" height="50%" class="bntRB" border="0" width="3" alt=""> 
                          </td>
                          </tr>
                          </tbody>
                         </table> 
                         </td>
                          <td>
                          <table border="0" cellpadding="0" cellspacing="0"><tbody><tr><td><div class="uir-button-menu-divider">
                          
</div>
                          </td>
                          </tr>
                          </tbody>
                          </table>
                          </td> 
                          
                          <td> 
                         <table id="tbl_secondary_back" cellpadding="0" cellspacing="0" border="0" class="uir-button" style="margin-right:6px;" role="presentation"> 
                         <tbody>
                         <tr id="tr_secondary_back" class="pgBntG"> <td id="tdleftcap_secondary_back"><img src="/images/nav/ns_x.gif" class="bntLT" border="0" height="50%" width="3" alt=""> 
                         <img src="/images/nav/ns_x.gif" class="bntLB" border="0" height="50%" width="3" alt=""> 
                         </td> <td id="tdbody_secondary_back" height="20" valign="top" nowrap="" class="bntBgB">
                          <input type="button" style="" class="rndbuttoninpt bntBgT " value="Copy To Year" id="secondary_back" name="secondary_back" onclick="copyToYear(); return false;" onmousedown="this.setAttribute('_mousedown','T'); setButtonDown(true, false, this);" onmouseup="this.setAttribute('_mousedown','F'); setButtonDown(false, false, this);" onmouseout="if(this.getAttribute('_mousedown')=='T') setButtonDown(false, false, this);" onmouseover="if(this.getAttribute('_mousedown')=='T') setButtonDown(true, false, this);" fdprocessedid="rwkb9h"></td> 
                          <td id="tdrightcap_secondary_back"> <img src="/images/nav/ns_x.gif" height="50%" class="bntRT" border="0" width="3" alt=""> <img src="/images/nav/ns_x.gif" height="50%" class="bntRB" border="0" width="3" alt=""> 
                          </td>
                          </tr>
                          </tbody>
                         </table> 
                         </td>
                                  <td> 
                                   </td> </tr> </tbody></table>
                        
                        <!--<button type="button" onclick="copyFromYear()">Copy from Year</button>-->
                        
                        <table id="customerTable" class="display" style="width:100%">
                            <thead>
                                <tr>
                                    <th>Customer Group</th>
                                    <th>Customer</th>
                                    <th>Consignee</th>
                                    <th>Grade</th>
                                    <th>City</th>
                                    <th>Jan</th>
                                    <th>Feb</th>
                                    <th>Mar</th>
                                    <th>Apr</th>
                                    <th>May</th>
                                    <th>Jun</th>
                                    <th>Jul</th>
                                    <th>Aug</th>
                                    <th>Sep</th>
                                    <th>Oct</th>
                                    <th>Nov</th>
                                    <th>Dec</th>
                                    <th>Total</th>
                                    <th>COMPOSITE KEY</th>
                                    
                                </tr>
                                <tr>
                                    <th><input type="text" class="filter-input" data-column="0" placeholder="Filter Customer Group" /></th>
                                    <th><input type="text" class="filter-input" data-column="1" placeholder="Filter Customer" /></th>
                                    <th><input type="text" class="filter-input" data-column="2" placeholder="Filter Consignee" /></th>
                                    <th><input type="text" class="filter-input" data-column="3" placeholder="Filter Grade" /></th>
                                    <th><input type="text" class="filter-input" data-column="4" placeholder="Filter City" /></th>
                                    <!--<th><input type="text" class="filter-input" data-column="5" placeholder="Filter Jan" /></th>
                                    <th><input type="text" class="filter-input" data-column="6" placeholder="Filter Feb" /></th>
                                    <th><input type="text" class="filter-input" data-column="7" placeholder="Filter Mar" /></th>
                                    <th><input type="text" class="filter-input" data-column="8" placeholder="Filter Apr" /></th>
                                    <th><input type="text" class="filter-input" data-column="9" placeholder="Filter May" /></th>
                                    <th><input type="text" class="filter-input" data-column="10" placeholder="Filter Jun" /></th>
                                    <th><input type="text" class="filter-input" data-column="11" placeholder="Filter Jul" /></th>
                                    <th><input type="text" class="filter-input" data-column="12" placeholder="Filter Aug" /></th>
                                    <th><input type="text" class="filter-input" data-column="13" placeholder="Filter Sep" /></th>
                                    <th><input type="text" class="filter-input" data-column="14" placeholder="Filter Oct" /></th>
                                    <th><input type="text" class="filter-input" data-column="15" placeholder="Filter Nov" /></th>
                                    <th><input type="text" class="filter-input" data-column="16" placeholder="Filter Dec" /></th>
                                    <th><input type="text" class="filter-input" data-column="17" placeholder="Filter Total" /></th>-->
                                    <th></th>
                                    <th></th>
                                    <th></th>
                                    <th></th>
                                    <th></th>
                                    <th></th>
                                    <th></th>
                                    <th></th>
                                    <th></th>
                                    <th></th>
                                    <th></th>
                                    <th></th>
                                    <th></th>
                                    <th><input type="text" class="filter-input" data-column="18" placeholder="Filter Composite Key" /></th>
                                </tr>
                            </thead>
                            <tbody>
                                <!-- Initially empty rows -->
                            </tbody>
                            <tfoot>
                            <tr id="page-total-row">
                              <th>Current Page Total:</th>
                              <th></th> <!-- Total Quantity -->
                              <th></th> <!-- Total Price -->
                              <th></th> <!-- Total Quantity -->
                              <th></th> <!-- Total Price -->
                              <th>0</th> <!-- Total Quantity -->
                              <th></th> <!-- Total Price -->
                              <th></th> <!-- Total Quantity -->
                              <th></th> <!-- Total Price -->
                              <th></th> <!-- Total Quantity -->
                              <th></th> <!-- Total Price --><th>0</th> <!-- Total Quantity -->
                              <th></th> <!-- Total Price -->
                              <th></th> <!-- Total Quantity -->
                              <th></th> <!-- Total Price -->
                              <th></th> <!-- Total Quantity -->
                              <th></th> <!-- Total Price -->
                              <th></th> <!-- Total Price -->
                              <th></th> <!-- Total Price -->
                            </tr>
                            <tr id="overall-total-row">
                              <th>Overall Total:</th>
                              <th></th> <!-- Total Quantity -->
                              <th></th> <!-- Total Price -->
                              <th></th> <!-- Total Quantity -->
                              <th></th> <!-- Total Price -->
                              <th>0</th> <!-- Total Quantity -->
                              <th></th> <!-- Total Price -->
                              <th></th> <!-- Total Quantity -->
                              <th></th> <!-- Total Price -->
                              <th></th> <!-- Total Quantity -->
                              <th></th> <!-- Total Price --><th>0</th> <!-- Total Quantity -->
                              <th></th> <!-- Total Price -->
                              <th></th> <!-- Total Quantity -->
                              <th></th> <!-- Total Price -->
                              <th></th> <!-- Total Quantity -->
                              <th></th> <!-- Total Price -->
                              <th></th> <!-- Total Price -->
                              <th></th> <!-- Total Price -->
                            </tr>
                          </tfoot>
                        </table>
                        <br/>
                        
                        
                        
                        <table role="presentation" cellpadding="0" cellspacing="0">
                        <tbody>
                        <tr class="uir-buttons">
                        <td>
                        <table id="tbl_secondaryedit" cellpadding="0" cellspacing="0" border="0" class="uir-button" style="margin-right:6px;" role="presentation">
                        <tbody>
                        <tr id="tr_secondaryedit" class="pgBntG pgBntB"> <td id="tdleftcap_secondaryedit">
                        <img src="/images/nav/ns_x.gif" class="bntLT" border="0" height="50%" width="3" alt=""> 
                        <img src="/images/nav/ns_x.gif" class="bntLB" border="0" height="50%" width="3" alt=""> 
                        </td> <td id="tdbody_secondaryedit" height="20" valign="top" nowrap="" class="bntBgB"> 
                        <input type="button" style="" class="rndbuttoninpt bntBgT " value="Submit Changes" id="secondaryedit" name="secondaryedit" onclick="collectInput(); return false;" onmousedown="this.setAttribute('_mousedown','T'); setButtonDown(true, false, this);" onmouseup="this.setAttribute('_mousedown','F'); setButtonDown(false, false, this);" onmouseout="if(this.getAttribute('_mousedown')=='T') setButtonDown(false, false, this);" onmouseover="if(this.getAttribute('_mousedown')=='T') setButtonDown(true, false, this);" fdprocessedid="ht99do" _mousedown="F">
                        </td> 
                        <td id="tdrightcap_secondaryedit"> 
                        <img src="/images/nav/ns_x.gif" height="50%" class="bntRT" border="0" width="3" alt=""> <img src="/images/nav/ns_x.gif" height="50%" class="bntRB" border="0" width="3" alt="">
                        </td> 
                        </tr> 
                        </tbody>
                        </table> 
                        </td>
                         <td> 
                         <table id="tbl_secondary_back" cellpadding="0" cellspacing="0" border="0" class="uir-button" style="margin-right:6px;" role="presentation"> 
                         <tbody>
                         <tr id="tr_secondary_back" class="pgBntG"> <td id="tdleftcap_secondary_back"><img src="/images/nav/ns_x.gif" class="bntLT" border="0" height="50%" width="3" alt=""> 
                         <img src="/images/nav/ns_x.gif" class="bntLB" border="0" height="50%" width="3" alt=""> 
                         </td> <td id="tdbody_secondary_back" height="20" valign="top" nowrap="" class="bntBgB">
                          <input type="button" style="" class="rndbuttoninpt bntBgT " value="Pre-Filter" id="secondary_back" name="secondary_back" onclick="preFilterYear(); return false;" onmousedown="this.setAttribute('_mousedown','T'); setButtonDown(true, false, this);" onmouseup="this.setAttribute('_mousedown','F'); setButtonDown(false, false, this);" onmouseout="if(this.getAttribute('_mousedown')=='T') setButtonDown(false, false, this);" onmouseover="if(this.getAttribute('_mousedown')=='T') setButtonDown(true, false, this);" fdprocessedid="rwkb9h"></td> 
                          <td id="tdrightcap_secondary_back"> <img src="/images/nav/ns_x.gif" height="50%" class="bntRT" border="0" width="3" alt=""> <img src="/images/nav/ns_x.gif" height="50%" class="bntRB" border="0" width="3" alt=""> 
                          </td>
                          </tr>
                          </tbody>
                         </table> 
                         </td>
                          <td>
                          <table border="0" cellpadding="0" cellspacing="0"><tbody><tr><td><div class="uir-button-menu-divider">
                          
</div>
                          </td>
                          </tr>
                          </tbody>
                          </table>
                          </td> 
                          
                          <td> 
                         <table id="tbl_secondary_back" cellpadding="0" cellspacing="0" border="0" class="uir-button" style="margin-right:6px;" role="presentation"> 
                         <tbody>
                         <tr id="tr_secondary_back" class="pgBntG"> <td id="tdleftcap_secondary_back"><img src="/images/nav/ns_x.gif" class="bntLT" border="0" height="50%" width="3" alt=""> 
                         <img src="/images/nav/ns_x.gif" class="bntLB" border="0" height="50%" width="3" alt=""> 
                         </td> <td id="tdbody_secondary_back" height="20" valign="top" nowrap="" class="bntBgB">
                          <input type="button" style="" class="rndbuttoninpt bntBgT " value="Copy To Year" id="secondary_back" name="secondary_back" onclick="copyToYear(); return false;" onmousedown="this.setAttribute('_mousedown','T'); setButtonDown(true, false, this);" onmouseup="this.setAttribute('_mousedown','F'); setButtonDown(false, false, this);" onmouseout="if(this.getAttribute('_mousedown')=='T') setButtonDown(false, false, this);" onmouseover="if(this.getAttribute('_mousedown')=='T') setButtonDown(true, false, this);" fdprocessedid="rwkb9h"></td> 
                          <td id="tdrightcap_secondary_back"> <img src="/images/nav/ns_x.gif" height="50%" class="bntRT" border="0" width="3" alt=""> <img src="/images/nav/ns_x.gif" height="50%" class="bntRB" border="0" width="3" alt=""> 
                          </td>
                          </tr>
                          </tbody>
                         </table> 
                         </td>
                                  <td> 
                                   </td> </tr> </tbody></table>
                        
                        <!--<button type="button" onclick="copyFromYear()">Copy from Year</button>-->
                        
                        
                        
                        
                    </form>
                    <script>
                        function preFilterYear()
                        {
                            $.fn.dataTable.ext.order['dom-input-numeric'] = function (settings, colIndex) {
                                return this.api()
                                    .column(colIndex, { order: 'index' })
                                    .nodes()
                                    .map(function (td, i) {
                                        var input = $('input', td).val();
                                        return parseFloat(input) || 0;
                                    });
                            };
                            var table = $('#customerTable').DataTable({
                                orderCellsTop: true,
                                fixedHeader: true,
                                dom: '<"top"ilp>rt<"bottom"lpi><"clear">',
                                columnDefs: [
                                    {
                                        targets: [5,6,7,8,9,10,11,12,13,14,15,16], // Jan to Dec
                                        orderDataType: 'dom-input-numeric'
                                    }
                                ],
                                pageLength: 10,
                                initComplete: function () {
                                    // const api = this.api();
                                    //
                                    // // For each column, apply the filter
                                    // api.columns().every(function () {
                                    //     var that = this;
                                    //
                                    //     $('input', this.header()).on('keyup change', function () {
                                    //         if (that.search() !== this.value) {
                                    //             that.search(this.value).draw();
                                    //         }
                                    //     });
                                    // });
                                },
                                footerCallback: function (row, data, start, end, display) {
                                    const api = this.api();
                                
                                    const columnsToTotal = [5,6,7,8,9,10,11,12,13,14,15,16,17];
                                
                                    // Get both footer rows
                                    const footerRows = $(api.table().footer()).find('tr');
                                    // const pageTotalRow = $(footerRows[0]).find('th');
                                    // const overallTotalRow = $(footerRows[1]).find('th');
                                    
                                    const pageTotalRow = $('#page-total-row th');
                                    const overallTotalRow = $('#overall-total-row th');
                                
                                    columnsToTotal.forEach(function (colIdx) {
                                        let pageTotal = 0;
                                        let overallTotal = 0;
                                
                                        // Sum for current page
                                        api.rows({ page: 'current' }).every(function () {
                                            const row = this.node();
                                            const $input = $('td:eq(' + colIdx + ') input', row);
                                            const val = parseFloat($input.val()) || 0;
                                            pageTotal += val;
                                        });
                                
                                        // Sum for all pages
                                        api.rows().every(function () {
                                            const row = this.node();
                                            const $input = $('td:eq(' + colIdx + ') input', row);
                                            const val = parseFloat($input.val()) || 0;
                                            overallTotal += val;
                                        });
                                
                                        // Write to correct footer cells
                                        pageTotalRow.eq(colIdx).html(pageTotal.toFixed(2));
                                        overallTotalRow.eq(colIdx).html(overallTotal.toFixed(2));
                                    });
                                }
                            });
                            
                            $('#loadingModal').removeClass('hidden');
                            // $('#loadingModal').addClass('hidden');
                            // table = $('#customerTable').DataTable();
                            // table.clear().draw();
                            
                            
                            // Fetch data asynchronously
                            $.ajax({
                                url: '${forecast_alloc_helper_url}' + "&year=" + document.querySelector("#years").value,
                                method: 'POST',
                                success: function(data) {
                                    data = JSON.parse(data);
                                    var tableRows = data.map(function(row) {
                                        return '<tr>' +
                                            '<td>' + row.customerGroup + '</td>' +
                                            '<td>' + row.customer + '</td>' +
                                            '<td>' + row.consignee + '</td>' +
                                            '<td>' + row.grade + '</td>' +
                                            '<td>' + row.city + '</td>' +
                                            '<td><input value=' + row.month1 + ' origvalue=' + row.month1 + ' type="number" name="' + row.compositeKey+"_"+1 + '" style="width: 60px;" /></td>' +
                                            '<td><input value=' + row.month2 + ' origvalue=' + row.month2 + ' type="number" name="' + row.compositeKey+"_"+2 + '" style="width: 60px;" /></td>' +
                                            '<td><input value=' + row.month3 + ' origvalue=' + row.month3 + ' type="number" name="' + row.compositeKey+"_"+3 + '" style="width: 60px;" /></td>' +
                                            '<td><input value=' + row.month4 + ' origvalue=' + row.month4 + ' type="number" name="' + row.compositeKey+"_"+4 + '" style="width: 60px;" /></td>' +
                                            '<td><input value=' + row.month5 + ' origvalue=' + row.month5 + ' type="number" name="' + row.compositeKey+"_"+5 + '" style="width: 60px;" /></td>' +
                                            '<td><input value=' + row.month6+ ' origvalue=' + row.month6 + ' type="number" name="' + row.compositeKey+"_"+6 + '" style="width: 60px;" /></td>' +
                                            '<td><input value=' + row.month7 + ' origvalue=' + row.month7 + ' type="number" name="' + row.compositeKey+"_"+7 + '" style="width: 60px;" /></td>' +
                                            '<td><input value=' + row.month8 + ' origvalue=' + row.month8 + ' type="number" name="' + row.compositeKey+"_"+8 + '" style="width: 60px;" /></td>' +
                                            '<td><input value=' + row.month9 + ' origvalue=' + row.month9 + ' type="number" name="' + row.compositeKey+"_"+9 + '" style="width: 60px;" /></td>' +
                                            '<td><input value=' + row.month10 + ' origvalue=' + row.month10 + ' type="number" name="' + row.compositeKey+"_"+10 + '" style="width: 60px;" /></td>' +
                                            '<td><input value=' + row.month11 + ' origvalue=' + row.month11 + ' type="number" name="' + row.compositeKey+"_"+11 + '" style="width: 60px;" /></td>' +
                                            '<td><input value=' + row.month12 + ' origvalue=' + row.month12 + ' type="number" name="' + row.compositeKey+"_"+12 + '" style="width: 60px;" /></td>' +
                                            '<td><input disabled class="horizontalTotal" value=' + row.total + ' origvalue=' + row.total + ' type="number" name="' + row.compositeKey+"_"+"13" + '" style="width: 60px;" /></td>' +
                                            
                                            '<td>' + row.compositeKey + '</td>' +
                                        '</tr>';
                                    }).join('');
                                    
                                    try
                                    {
                                        table.clear();
                                        console.log("table.clear()")
                                        
                                    }
                                    catch(e)
                                    {
                                        console.log("ERROR clearing dt", e)
                                    }
                                    // Add fetched rows into the table
                                    table.rows.add($(tableRows)).draw();
                                    
                                    
                                    $('#loadingModal').removeClass('hidden');
                                    $('#loadingModal').addClass('hidden');
                                },
                                error: function() {
                                    alert('Error fetching data');
                                }
                            });
                            
                            // Simple Filtering Functionality
                            $("input[type='text']").on("keyup", function() {
                                var columnIdx = $(this).data('column');
                                table.column(columnIdx).search(this.value).draw();
                            });
                        }
                        function collectInput() {
                            const data = {};
                        
                            var table = $('#customerTable').DataTable();
                            var tableRows = table.rows().nodes(); // DataTables API
                        
                            // $(tableRows).find('input[type="number"]').each(function() {
                            $(tableRows).find('input[type="number"]:not([name$="_13"])').each(function() {
                                const origValue = this.getAttribute('origvalue');
                                const currentValue = this.value;
                                if (origValue !== currentValue || (origValue==="0" && currentValue==="")) {
                                    data[this.name] = currentValue;
                                }
                            });
                        
                            console.log('Collected Allocation Input:', data);
                            // alert('Open the console to see collected data. You can send it to NetSuite.');
                            
                            
                            $.ajax({
                                url: '${forecast_alloc_helper_url}&submitdata=T',
                                method: 'POST',
                                success: function(data) {
                                    
                                    console.log("resp data", data)
                                    // const tableRows = data.map(function(row) {
                                    //     return '<tr>' +
                                    //         '<td>' + row.compositeKey + '</td>' +
                                    //         '<td>' + row.year + '</td>' +
                                    //         '<td>' + row.month + '</td>' +
                                    //         '<td>' + row.customerGroup + '</td>' +
                                    //         '<td>' + row.customer + '</td>' +
                                    //         '<td>' + row.consignee + '</td>' +
                                    //         '<td>' + row.grade + '</td>' +
                                    //         '<td>' + row.parent + '</td>' +
                                    //         '<td><input value=' + row.currQty + ' origvalue=' + row.currQty + ' type="number" name="' + row.compositeKey + '" style="width: 60px;" /></td>' +
                                    //     '</tr>';
                                    // }).join('');
                                    //
                                    // // Add fetched rows into the table
                                    // table.rows.add($(tableRows)).draw();
                                    
                                    
                                },
                                data : JSON.stringify({compositeKeys : data}),
                                error: function() {
                                    alert('Error posting data');
                                }
                            });
                        }
                        
                        function copyToYear() {
                        
                            alert("Warning:You are copying ALL present values in this page which was initialized for year " + document.querySelector("#years").value + " to another year.")
                            var confirmResults = prompt('What year do you want to setup?')

                            if(confirmResults && Number(confirmResults) != "NaN")
                            {
                                const data = {};
                        
                                var table = $('#customerTable').DataTable();
                                var tableRows = table.rows().nodes(); // DataTables API
                            
                                $(tableRows).find('input[type="number"]:not([class*="horizontalTotal"])').each(function() {
                                    const origValue = this.getAttribute('origvalue');
                                    const currentValue = this.value;
                                    // if (origValue !== currentValue || (origValue==="0" && currentValue==="")) {
                                    //     data[this.name] = currentValue;
                                    // }
                                    if (currentValue && (origValue==="0" && currentValue!=="")) {
                                        data[this.name] = currentValue;
                                    }
                                    else
                                    {
                                        data[this.name] = currentValue;
                                    }
                                });
                            
                                $('#loadingModal').removeClass('hidden');
                                console.log('Collected Allocation Input:', data);
                                // alert('Open the console to see collected data. You can send it to NetSuite.');
                                
                                
                                $.ajax({
                                    url: '${forecast_alloc_helper_url}&copyToYear=' + confirmResults,
                                    method: 'POST',
                                    success: function(data) {
                                        
                                        console.log("resp data", data)
                                        // const tableRows = data.map(function(row) {
                                        //     return '<tr>' +
                                        //         '<td>' + row.compositeKey + '</td>' +
                                        //         '<td>' + row.year + '</td>' +
                                        //         '<td>' + row.month + '</td>' +
                                        //         '<td>' + row.customerGroup + '</td>' +
                                        //         '<td>' + row.customer + '</td>' +
                                        //         '<td>' + row.consignee + '</td>' +
                                        //         '<td>' + row.grade + '</td>' +
                                        //         '<td>' + row.parent + '</td>' +
                                        //         '<td><input value=' + row.currQty + ' origvalue=' + row.currQty + ' type="number" name="' + row.compositeKey + '" style="width: 60px;" /></td>' +
                                        //     '</tr>';
                                        // }).join('');
                                        //
                                        // // Add fetched rows into the table
                                        // table.rows.add($(tableRows)).draw();
                                        
                                        
                                        $('#loadingModal').removeClass('hidden');
                                        $('#loadingModal').addClass('hidden');
                                        
                                    },
                                    data : JSON.stringify({compositeKeys : data}),
                                    error: function() {
                                        alert('Error posting data');
                                        
                                        
                                        $('#loadingModal').removeClass('hidden');
                                    }
                                });
                            }
                            else
                            {
                                alert("Aborted, invalid input " + confirmResults)
                            }
                        
                            
                        }
                        
                        // $('#customerTable').on('input', 'input[type="number"]', function () {
                        //     console.log("handle input, recalc totals")
                        //     var table = $('#customerTable').DataTable();
                        //     table.draw(false); // false = don't reset pagination
                        // });
                        $('#customerTable').on('change', 'input[type="number"]', function () {
                            
                            const $input = $(this);
                            const value = parseFloat($input.val()) || 0;
                            const $row = $input.closest('tr');
                            const colIndex = $input.closest('td').index();
                            
                            const name = this.name;
                            
                            console.log('Changed input name attribute:', name);
                            var monthColListVals = 0;
                            var relatedCols = name.split("_");
                            
                            if(relatedCols[relatedCols.length - 1] == "13")
                            {
                                return;                                
                            }
                            relatedCols = relatedCols.splice(0, relatedCols.length - 1);
                            var relatedColsStr = relatedCols.join("_") + "_";
                            
                            var prefix = relatedColsStr;
                            var inputs = $('input[name^="' + prefix + '"]');
                            
                            var total = 0;

                            inputs.each(function () {
                                if(this.name != relatedColsStr + "13")
                                    {
                                        total += parseFloat(this.value) || 0;                                        
                                    }
                                
                            });
                            
                            console.log('Total: ' + total);
                            
                            $('input[name="'+ relatedColsStr + '13' + '"]').val(total).trigger("change");
                            
                            console.log('relatedColsStr:', relatedColsStr);
                            // 6_500394_304827_188595_4
                        
                            console.log('Changed value:', value);
                            console.log('Row index:', $row.index());
                            console.log('Column index:', colIndex);
                            
                            const table = $('#customerTable').DataTable();
                            table.draw(false);
                        });
                        // $('#customerTable').on('change', 'input[type="number"]', function () {
                        //     const $input = $(this);
                        //     const $row = $input.closest('tr');
                        //
                        //     // Recalculate the row total (columns 5 to 16 = indices 5 to 16)
                        //     let rowTotal = 0;
                        //     for (let colIdx = 5; colIdx <= 16; colIdx++) {
                        //         const val = parseFloat($row.find('td:eq(' + colIdx + ') input').val()) || 0;
                        //         rowTotal += val;
                        //     }
                        //
                        //     // Set value in the 17th column (index 17) — Total column
                        //     $row.find('td:eq(17)').text(rowTotal.toFixed(2));
                        //
                        //     // Re-draw the DataTable to trigger footer totals update
                        //     const table = $('#customerTable').DataTable();
                        //     table.draw(false);
                        // });
                    </script>
                </body>
                </html>
            `;

            inlineHtmlField.defaultValue = html;
            context.response.writePage(form);
        }
    };

    return { onRequest };
});
