(()=>{var n=class{constructor({container:a,data:t={}}){if(this.container=a,this.data={apiEndpoint:t.apiEndpoint||"erpx_new_custom_theme.api.kpi.get_kpi_mustahik",apiArgs:t.apiArgs||{},autoLoad:t.autoLoad!==!1,labelLines:t.labelLines||[__("Mustahik Distribution"),__("(This Month)")],value:t.value||"",trendValue:t.trendValue||"0%",trendLabel:t.trendLabel||__("vs last month"),trendUp:t.trendUp!==!1,iconHtml:t.iconHtml||""},!this.container){console.warn("KPICardMUSTAHIK: Container element not found",this.container);return}this.injectStyles(),this.render(),this.data.autoLoad!==!1&&this.loadData().then(()=>this.render())}escapeHtml(a){let t=document.createElement("div");return t.textContent=a,t.innerHTML}getDefaultIcon(){return`
      <svg class="kpi-card__icon" width="20" height="20" viewBox="0 0 16 16" fill="none" stroke="#d97706" stroke-width="1.33333" stroke-linecap="round" stroke-linejoin="round" style="width:20px;height:20px;display:block;flex-shrink:0">
        <path d="M3.33333 6.66667L8 2M8 2L12.6667 6.66667M8 2V14"/>
      </svg>
    `}injectCriticalCss(){let a=this.container.getRootNode(),t=a instanceof ShadowRoot?a:document.head;if(t.querySelector("style[data-x-css-kpi-critical]"))return;let e=document.createElement("style");e.setAttribute("data-x-css-kpi-critical","1"),e.textContent=[".kpi-card__icon{width:20px!important;height:20px!important;display:block!important;flex-shrink:0!important}",".kpi-card__icon-badge{width:36px!important;height:36px!important;display:flex!important;align-items:center!important;justify-content:center!important;flex-shrink:0!important;overflow:hidden!important}",".kpi-card__header{display:flex!important;align-items:flex-start!important;justify-content:space-between!important;gap:12px!important}",".kpi-card{display:flex!important;flex-direction:column!important;min-height:172px!important;box-sizing:border-box!important}",".kpi-card__footer{margin-top:auto!important;padding-top:8px!important}"].join(""),t===document.head?document.head.appendChild(e):t.prepend(e)}injectStyles(){this.injectCriticalCss();let a=this.container.getRootNode();if(a instanceof ShadowRoot){if(a.querySelector("link[data-x-css-mustahik]"))return;let t=Array.from(document.querySelectorAll('link[rel="stylesheet"]')).find(s=>s.href&&s.href.includes("kpi_card")),e=t?t.href:"/assets/erpx_new_custom_theme/css/kpi_card.bundle.css",i=document.createElement("link");i.rel="stylesheet",i.setAttribute("data-x-css-mustahik","1"),i.href=e,a.prepend(i)}}fitWorkspaceBlock(){let a=this.container.getRootNode();if(!(a instanceof ShadowRoot))return;let t=a.host;if(!t)return;t.style.setProperty("display","block","important"),t.style.setProperty("width","100%","important");let e=t.parentElement;for(let i=0;i<8&&e&&!(e.classList.contains("codex-editor__redactor")||e.classList.contains("codex-editor"));i++){if(e.style.setProperty("padding","0","important"),e.style.setProperty("min-height","0","important"),e.style.setProperty("height","auto","important"),e.style.setProperty("max-height","none","important"),e.classList.contains("widget")&&(e.style.setProperty("border","0","important"),e.style.setProperty("box-shadow","none","important"),e.style.setProperty("background","transparent","important")),e.classList.contains("ce-block")){e.style.setProperty("align-self","flex-start","important");break}e=e.parentElement}}async loadData(){try{let a=await frappe.call({method:this.data.apiEndpoint,args:this.data.apiArgs});if(a&&a.message){let t=a.message;this.data.labelLines=t.labelLines||this.data.labelLines,this.data.value=t.value||this.data.value,this.data.trendValue=t.trendValue||this.data.trendValue,this.data.trendLabel=t.trendLabel||this.data.trendLabel,this.data.trendUp=t.trendUp!==void 0?t.trendUp:this.data.trendUp}}catch(a){console.error("KPICardMUSTAHIK: Failed to load data",a)}}render(){let a=this.data.iconHtml||this.getDefaultIcon(),t=this.data.trendUp?"kpi-card__trend--up":"kpi-card__trend--down";this.container.innerHTML=`
      <div class="kpi-card kpi-card--mustahik">
        <!-- Header: Labels + Icon Badge -->
        <div class="kpi-card__header">
          <div class="kpi-card__label-wrap">
            <div class="kpi-card__label">
              ${this.data.labelLines.map(e=>`<div class="kpi-card__label-line">${this.escapeHtml(e)}</div>`).join("")}
            </div>
          </div>
          <div class="kpi-card__icon-badge">
            ${a}
          </div>
        </div>

        <!-- Value -->
        <div class="kpi-card__value-wrap">
          <div class="kpi-card__value">${this.escapeHtml(this.data.value)}</div>
        </div>

        <!-- Footer Trend (same as Cash & Bank card) -->
        <div class="kpi-card__footer">
          <span class="kpi-card__trend ${t}">${this.escapeHtml(this.data.trendValue)}</span>
          <span class="kpi-card__trend-label">${this.escapeHtml(this.data.trendLabel)}</span>
        </div>
      </div>
    `,this.fitWorkspaceBlock()}};window.erpnext=window.erpnext||{};window.erpnext.kpi=window.erpnext.kpi||{};window.erpnext.kpi.KPICardMUSTAHIK=n;})();
//# sourceMappingURL=kpi_card_mustahik.bundle.OXNXWG7A.js.map
