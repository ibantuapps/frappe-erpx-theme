(()=>{var r=class{constructor({container:e,data:t={}}){if(this.container=e,this.data={apiEndpoint:t.apiEndpoint||"erpx_new_custom_theme.api.kpi.get_kpi_ziswaf",apiArgs:t.apiArgs||{},autoLoad:t.autoLoad!==!1,labelLines:t.labelLines||[__("Fund Receipts"),__("(This Month)")],value:t.value||"",trendValue:t.trendValue||"0%",trendLabel:t.trendLabel||__("vs last month"),trendUp:t.trendUp!==!1,breakdown:t.breakdown||{zakat:0,infak:0,wakaf:0},iconHtml:t.iconHtml||""},!this.container){console.warn("KPICardZISWAF: Container element not found",this.container);return}this.injectStyles(),this.render(),this.data.autoLoad!==!1&&this.loadData().then(()=>this.render())}escapeHtml(e){let t=document.createElement("div");return t.textContent=e,t.innerHTML}getDefaultIcon(){return`
      <svg class="kpi-card__icon" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#10b981" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="width:20px;height:20px;display:block;flex-shrink:0">
        <path d="M12 2a8 8 0 1 0 8 8"/>
        <path d="M12 10v6"/>
        <path d="M9 13h6"/>
      </svg>
    `}injectCriticalCss(){let e=this.container.getRootNode(),t=e instanceof ShadowRoot?e:document.head;if(t.querySelector("style[data-x-css-kpi-critical]"))return;let a=document.createElement("style");a.setAttribute("data-x-css-kpi-critical","1"),a.textContent=[".kpi-card__icon{width:20px!important;height:20px!important;display:block!important;flex-shrink:0!important}",".kpi-card__icon-badge{width:36px!important;height:36px!important;display:flex!important;align-items:center!important;justify-content:center!important;flex-shrink:0!important;overflow:hidden!important}",".kpi-card__header{display:flex!important;align-items:flex-start!important;justify-content:space-between!important;gap:12px!important}",".kpi-card{display:flex!important;flex-direction:column!important;min-height:172px!important;box-sizing:border-box!important}",".kpi-card__footer{margin-top:auto!important;padding-top:8px!important}"].join(""),t===document.head?document.head.appendChild(a):t.prepend(a)}injectStyles(){this.injectCriticalCss();let e=this.container.getRootNode();if(e instanceof ShadowRoot){if(e.querySelector("link[data-x-css-ziswaf]"))return;let t=Array.from(document.querySelectorAll('link[rel="stylesheet"]')).find(n=>n.href&&n.href.includes("kpi_card")),a=t?t.href:"/assets/erpx_new_custom_theme/css/kpi_card.bundle.css",i=document.createElement("link");i.rel="stylesheet",i.setAttribute("data-x-css-ziswaf","1"),i.href=a,e.prepend(i)}}fitWorkspaceBlock(){let e=this.container.getRootNode();if(!(e instanceof ShadowRoot))return;let t=e.host;if(!t)return;t.style.setProperty("display","block","important"),t.style.setProperty("width","100%","important");let a=t.parentElement;for(let i=0;i<8&&a&&!(a.classList.contains("codex-editor__redactor")||a.classList.contains("codex-editor"));i++){if(a.style.setProperty("padding","0","important"),a.style.setProperty("min-height","0","important"),a.style.setProperty("height","auto","important"),a.style.setProperty("max-height","none","important"),a.classList.contains("widget")&&(a.style.setProperty("border","0","important"),a.style.setProperty("box-shadow","none","important"),a.style.setProperty("background","transparent","important")),a.classList.contains("ce-block")){a.style.setProperty("align-self","flex-start","important");break}a=a.parentElement}}async loadData(){try{let e=await frappe.call({method:this.data.apiEndpoint,args:this.data.apiArgs});if(e&&e.message){let t=e.message;this.data.labelLines=t.labelLines||this.data.labelLines,this.data.value=t.value||this.data.value,this.data.currency=t.currency||this.data.currency,this.data.trendValue=t.trendValue||this.data.trendValue,this.data.trendLabel=t.trendLabel||this.data.trendLabel,this.data.trendUp=t.trendUp!==void 0?t.trendUp:this.data.trendUp,this.data.breakdown=t.breakdown||this.data.breakdown}}catch(e){console.error("KPICardZISWAF: Failed to load data",e)}}formatCurrency(e){return typeof e=="string"?e:format_currency(e,this.data.currency,0)}render(){let e=this.data.iconHtml||this.getDefaultIcon(),t=this.data.breakdown,a=`${__("Zakat")}: ${t.zakat||0}% | ${__("Infaq")}: ${t.infak||0}% | ${__("Waqf")}: ${t.wakaf||0}%`,i=this.data.trendUp?"kpi-card__trend--up":"kpi-card__trend--down";this.container.innerHTML=`
      <div class="kpi-card kpi-card--ziswaf">
        <!-- Header: Labels + Icon Badge -->
        <div class="kpi-card__header">
          <div class="kpi-card__label-wrap">
            <div class="kpi-card__label">
              ${this.data.labelLines.map(n=>`<div class="kpi-card__label-line">${this.escapeHtml(n)}</div>`).join("")}
            </div>
          </div>
          <div class="kpi-card__icon-badge">
            ${e}
          </div>
        </div>

        <!-- Value -->
        <div class="kpi-card__value-wrap">
          <div class="kpi-card__value">${this.escapeHtml(this.data.value)}</div>
        </div>

        <!-- Breakdown -->
        <div class="kpi-card__breakdown">
          <div class="kpi-card__breakdown-text">${this.escapeHtml(a)}</div>
        </div>

        <!-- Footer Trend (same as Cash & Bank card) -->
        <div class="kpi-card__footer">
          <span class="kpi-card__trend ${i}">${this.escapeHtml(this.data.trendValue)}</span>
          <span class="kpi-card__trend-label">${this.escapeHtml(this.data.trendLabel)}</span>
        </div>
      </div>
    `,this.fitWorkspaceBlock()}};window.erpnext=window.erpnext||{};window.erpnext.kpi=window.erpnext.kpi||{};window.erpnext.kpi.KPICardZISWAF=r;})();
//# sourceMappingURL=kpi_card_ziswaf.bundle.3HDNPBYT.js.map
