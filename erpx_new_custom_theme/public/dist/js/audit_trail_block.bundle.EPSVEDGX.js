(()=>{var n=class{constructor({container:t,data:e={}}){if(this.container=t,this.data={apiEndpoint:e.apiEndpoint||"erpx_new_custom_theme.api.kpi.get_audit_trail",apiArgs:e.apiArgs||{},autoLoad:e.autoLoad!==!1,refreshInterval:e.refreshInterval||6e4,entries:e.entries||[],symbol:e.symbol||"",currency:e.currency||null,lastSync:e.lastSync||null},!this.container){console.warn("AuditTrailBlock: Container element not found",this.container);return}this.injectStyles(),this.render(),this.data.autoLoad!==!1&&(this.loadData().then(()=>this.render()),this.pollInterval&&clearInterval(this.pollInterval),this.pollInterval=setInterval(()=>{this.loadData().then(()=>this.render())},this.data.refreshInterval))}escapeHtml(t){let e=document.createElement("div");return e.textContent=t,e.innerHTML}getTimeAgo(t){if(!t)return __("Just now");let e=new Date,s=new Date(t),a=Math.floor((e-s)/1e3);if(a<30)return __("Just now");if(a<60)return __("{0} seconds ago").replace("{0}",a);let i=Math.floor(a/60);if(i<60)return __("{0} minutes ago").replace("{0}",i);let r=Math.floor(i/60);return __("{0} hours ago").replace("{0}",r)}injectCriticalCss(){let t=this.container.getRootNode(),e=t instanceof ShadowRoot?t:document.head;if(e.querySelector("style[data-x-css-audit-critical]"))return;let s=document.createElement("style");s.setAttribute("data-x-css-audit-critical","1"),s.textContent=[".kpi-audit{box-sizing:border-box!important;min-height:120px!important}",".kpi-audit__table{width:100%!important;border-collapse:collapse!important}",".kpi-audit__table-wrap{overflow-x:auto!important}"].join(""),e===document.head?document.head.appendChild(s):e.prepend(s)}injectStyles(){this.injectCriticalCss();let t=this.container.getRootNode();if(t instanceof ShadowRoot){if(t.querySelector("link[data-x-css-audit]"))return;let e=Array.from(document.querySelectorAll('link[rel="stylesheet"]')).find(i=>i.href&&i.href.includes("kpi_card")),s=e?e.href:"/assets/erpx_new_custom_theme/css/kpi_card.bundle.css",a=document.createElement("link");a.rel="stylesheet",a.setAttribute("data-x-css-audit","1"),a.href=s,t.prepend(a)}}fitWorkspaceBlock(){let t=this.container.getRootNode();if(!(t instanceof ShadowRoot))return;let e=t.host;if(!e)return;e.style.setProperty("display","block","important"),e.style.setProperty("width","100%","important");let s=e.parentElement;for(let a=0;a<8&&s&&!(s.classList.contains("codex-editor__redactor")||s.classList.contains("codex-editor"));a++){if(s.style.setProperty("padding","0","important"),s.style.setProperty("min-height","0","important"),s.style.setProperty("height","auto","important"),s.style.setProperty("max-height","none","important"),s.classList.contains("widget")&&(s.style.setProperty("border","0","important"),s.style.setProperty("box-shadow","none","important"),s.style.setProperty("background","transparent","important")),s.classList.contains("ce-block")){s.style.setProperty("align-self","flex-start","important");break}s=s.parentElement}}async loadData(){try{let t=await frappe.call({method:this.data.apiEndpoint,args:this.data.apiArgs});t&&t.message&&t.message.entries&&(this.data.entries=t.message.entries,this.data.symbol=t.message.symbol||this.data.symbol,this.data.currency=t.message.currency||this.data.currency,this.data.lastSync=t.message.last_sync||new Date)}catch(t){console.error("[AuditTrailBlock] Load failed:",t)}}badgeClass(t){return`kpi-audit__badge kpi-audit__badge--${t||"slate"}`}statusBadge(t){let e=t||__("Approved");return e.toLowerCase().includes("pending")?`<span class="kpi-audit__status kpi-audit__status--pending">
        <svg width="12" height="12" viewBox="0 0 16 16" fill="none" stroke="#d97706" stroke-width="1.5">
          <circle cx="8" cy="8" r="6.5"/><path d="M8 4.5V8l2.5 1.5"/>
        </svg>
        ${this.escapeHtml(e)}
      </span>`:`<span class="kpi-audit__status kpi-audit__status--approved">
      <svg width="12" height="12" viewBox="0 0 16 16" fill="none" stroke="#059669" stroke-width="1.5">
        <circle cx="8" cy="8" r="6.5"/><path d="M4.5 8.5l2 2 4-4"/>
      </svg>
      ${this.escapeHtml(e)}
    </span>`}render(){let t=this.data.entries,e=t.map(a=>`
      <tr>
        <td class="kpi-audit__ref">${this.escapeHtml(a.ref)}</td>
        <td><span class="${this.badgeClass(a.tone)}">${this.escapeHtml(a.type)}</span></td>
        <td class="kpi-audit__desc">${this.escapeHtml(a.desc)}</td>
        <td class="kpi-audit__amount">${a.amount_fmt||format_currency(a.amount||0,this.data.currency,0)}</td>
        <td class="kpi-audit__alloc">${this.escapeHtml(a.allocation)}</td>
        <td>${this.statusBadge(a.status)}</td>
      </tr>
    `).join(""),s=t.length===0?`<tr><td colspan="6" class="kpi-audit__empty">${this.escapeHtml(__("No transactions recorded"))}</td></tr>`:e;this.container.innerHTML=`
      <div class="kpi-audit">
        <div class="kpi-audit__header">
          <div class="kpi-audit__title-wrap">
            <h3 class="kpi-audit__title">${this.escapeHtml(__("Latest Transaction Entries"))}</h3>
            <p class="kpi-audit__subtitle">${this.escapeHtml(__("Latest bookkeeping log from all donation and asnaf distribution channels"))}</p>
          </div>
          <div class="kpi-audit__meta">
            <a class="kpi-audit__link" href="/app/payment-entry">${this.escapeHtml(__("View All Logs"))} <svg width="12" height="12" viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.5"><path d="M6 3l5 5-5 5"/></svg></a>
          </div>
        </div>
        <div class="kpi-audit__table-wrap">
          <table class="kpi-audit__table">
            <thead>
              <tr>
                <th>${this.escapeHtml(__("Ref No / Voucher"))}</th>
                <th>${this.escapeHtml(__("Transaction Type"))}</th>
                <th>${this.escapeHtml(__("Description / Donor / Beneficiary"))}</th>
                <th class="kpi-audit__th-right">${this.escapeHtml(__("Amount"))}</th>
                <th>${this.escapeHtml(__("Fund Allocation"))}</th>
                <th>${this.escapeHtml(__("Status"))}</th>
              </tr>
            </thead>
            <tbody>
              ${s}
            </tbody>
          </table>
        </div>
      </div>
    `,this.fitWorkspaceBlock()}};window.erpnext=window.erpnext||{};window.erpnext.kpi=window.erpnext.kpi||{};window.erpnext.kpi.AuditTrailBlock=n;})();
//# sourceMappingURL=audit_trail_block.bundle.EPSVEDGX.js.map
