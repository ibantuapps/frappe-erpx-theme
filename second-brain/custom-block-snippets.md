# Custom HTML Block Snippets (versi koreksi)

Paste per block di Workspace. Pola: `typeof root_element` guard + retry maks
50x + warn. Ganti nama class bila dipakai ulang.

## 1. Total Cash & Bank

```html
<div class="kpi-card-root"></div>
<script>
function initKPIRootBlock(a){a=a||0;var m=(typeof root_element!=='undefined'&&root_element&&root_element.querySelector)?root_element.querySelector('.kpi-card-root'):null;var K=window.KPICard||(window.erpnext&&window.erpnext.kpi&&window.erpnext.kpi.KPICard);if(!m||typeof K!=='function'){if(a<50)setTimeout(function(){initKPIRootBlock(a+1)},100);else console.warn('[KPI-KAS] gagal mount:',!!m,typeof K);return;}new K({container:m,data:{apiEndpoint:'erpx_new_custom_theme.api.kpi.get_kpi_cash_bank'}});}
initKPIRootBlock();
</script>
```

## 2. Penerimaan ZISWAF

```html
<div class="kpi-card-ziswaf-root"></div>
<script>
function initKPICardZISWAF(a){a=a||0;var m=(typeof root_element!=='undefined'&&root_element&&root_element.querySelector)?root_element.querySelector('.kpi-card-ziswaf-root'):null;var K=window.erpnext&&window.erpnext.kpi&&window.erpnext.kpi.KPICardZISWAF;if(!m||typeof K!=='function'){if(a<50)setTimeout(function(){initKPICardZISWAF(a+1)},100);else console.warn('[KPI-ZISWAF] gagal mount:',!!m,typeof K);return;}new K({container:m,data:{apiEndpoint:'erpx_new_custom_theme.api.kpi.get_kpi_ziswaf'}});}
initKPICardZISWAF();
</script>
```

## 3. Penyaluran Mustahik

```html
<div class="kpi-card-mustahik-root"></div>
<script>
function initKPICardMUSTAHIK(a){a=a||0;var m=(typeof root_element!=='undefined'&&root_element&&root_element.querySelector)?root_element.querySelector('.kpi-card-mustahik-root'):null;var K=window.erpnext&&window.erpnext.kpi&&window.erpnext.kpi.KPICardMUSTAHIK;if(!m||typeof K!=='function'){if(a<50)setTimeout(function(){initKPICardMUSTAHIK(a+1)},100);else console.warn('[KPI-MUSTAHIK] gagal mount:',!!m,typeof K);return;}new K({container:m,data:{apiEndpoint:'erpx_new_custom_theme.api.kpi.get_kpi_mustahik'}});}
initKPICardMUSTAHIK();
</script>
```

## 4. Audit Trail

```html
<div class="audit-trail-root"></div>
<script>
function initAuditTrail(a){a=a||0;var m=(typeof root_element!=='undefined'&&root_element&&root_element.querySelector)?root_element.querySelector('.audit-trail-root'):null;var K=window.erpnext&&window.erpnext.kpi&&window.erpnext.kpi.AuditTrailBlock;if(!m||typeof K!=='function'){if(a<50)setTimeout(function(){initAuditTrail(a+1)},100);else console.warn('[AUDIT] gagal mount:',!!m,typeof K);return;}new K({container:m,data:{apiEndpoint:'erpx_new_custom_theme.api.kpi.get_audit_trail',apiArgs:{limit:10},refreshInterval:30000}});}
initAuditTrail();
</script>
```
