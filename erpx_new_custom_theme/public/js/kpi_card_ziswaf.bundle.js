/* ============================================================
   KPI Card ZISWAF — Custom HTML Block Component (Figma: KPI 2)
   ============================================================ */

class KPICardZISWAF {
  constructor({ container, data = {} }) {
    this.container = container;
    this.data = {
      apiEndpoint: data.apiEndpoint || 'erpx_new_custom_theme.api.kpi.get_kpi_ziswaf',
      apiArgs: data.apiArgs || {},
      autoLoad: data.autoLoad !== false,
      labelLines: data.labelLines || [__("Fund Receipts"), __("(This Month)")],
      value: data.value || '',
      trendValue: data.trendValue || '0%',
      trendLabel: data.trendLabel || __("vs last month"),
      trendUp: data.trendUp !== false,
      breakdown: data.breakdown || { zakat: 0, infak: 0, wakaf: 0 },
      iconHtml: data.iconHtml || ''
    };

    if (!this.container) {
      console.warn('KPICardZISWAF: Container element not found', this.container);
      return;
    }

    this.injectStyles();
    this.render();
    if (this.data.autoLoad !== false) {
      this.loadData().then(() => this.render());
    }
  }

  escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
  }

  getDefaultIcon() {
    return `
      <svg class="kpi-card__icon" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#10b981" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="width:20px;height:20px;display:block;flex-shrink:0">
        <path d="M12 2a8 8 0 1 0 8 8"/>
        <path d="M12 10v6"/>
        <path d="M9 13h6"/>
      </svg>
    `;
  }

  injectCriticalCss() {
    const root = this.container.getRootNode();
    const target = root instanceof ShadowRoot ? root : document.head;
    if (target.querySelector('style[data-x-css-kpi-critical]')) return;
    const st = document.createElement('style');
    st.setAttribute('data-x-css-kpi-critical', '1');
    st.textContent = [
      '.kpi-card__icon{width:20px!important;height:20px!important;display:block!important;flex-shrink:0!important}',
      '.kpi-card__icon-badge{width:36px!important;height:36px!important;display:flex!important;align-items:center!important;justify-content:center!important;flex-shrink:0!important;overflow:hidden!important}',
      '.kpi-card__header{display:flex!important;align-items:flex-start!important;justify-content:space-between!important;gap:12px!important}',
      '.kpi-card{display:flex!important;flex-direction:column!important;min-height:172px!important;box-sizing:border-box!important}',
      '.kpi-card__footer{margin-top:auto!important;padding-top:8px!important}',
    ].join('');
    if (target === document.head) {
      document.head.appendChild(st);
    } else {
      target.prepend(st);
    }
  }

injectStyles() {
    this.injectCriticalCss();
    const root = this.container.getRootNode();
    if (root instanceof ShadowRoot) {
      if (root.querySelector('link[data-x-css-ziswaf]')) return;

      // Pakai URL stylesheet yang sudah ada di <head> apa adanya (ikut cache),
      // jangan tambah timestamp tiap load agar tidak download ulang tiap refresh.
      const headLink = Array.from(document.querySelectorAll('link[rel="stylesheet"]'))
        .find((l) => l.href && l.href.includes('kpi_card'));

      const cssUrl = headLink
        ? headLink.href
        : '/assets/erpx_new_custom_theme/css/kpi_card.bundle.css';

      const link = document.createElement('link');
      link.rel = 'stylesheet';
      link.setAttribute('data-x-css-ziswaf', '1');
      link.href = cssUrl;
      root.prepend(link);
    }
  }

  fitWorkspaceBlock() {
    const root = this.container.getRootNode();
    if (!(root instanceof ShadowRoot)) return;

    const host = root.host;
    if (!host) return;

    host.style.setProperty('display', 'block', 'important');
    host.style.setProperty('width', '100%', 'important');

    let el = host.parentElement;
    for (let i = 0; i < 8 && el; i++) {
      if (el.classList.contains('codex-editor__redactor') || el.classList.contains('codex-editor')) break;
      el.style.setProperty('padding', '0', 'important');
      el.style.setProperty('min-height', '0', 'important');
      el.style.setProperty('height', 'auto', 'important');
      el.style.setProperty('max-height', 'none', 'important');
      if (el.classList.contains('widget')) {
        el.style.setProperty('border', '0', 'important');
        el.style.setProperty('box-shadow', 'none', 'important');
        el.style.setProperty('background', 'transparent', 'important');
      }
      if (el.classList.contains('ce-block')) {
        el.style.setProperty('align-self', 'flex-start', 'important');
        break;
      }
      el = el.parentElement;
    }
  }

  async loadData() {
    try {
      const result = await frappe.call({
        method: this.data.apiEndpoint,
        args: this.data.apiArgs
      });

      if (result && result.message) {
        const d = result.message;
        this.data.labelLines = d.labelLines || this.data.labelLines;
        this.data.value = d.value || this.data.value;
        this.data.currency = d.currency || this.data.currency;
        this.data.trendValue = d.trendValue || this.data.trendValue;
        this.data.trendLabel = d.trendLabel || this.data.trendLabel;
        this.data.trendUp = d.trendUp !== undefined ? d.trendUp : this.data.trendUp;
        this.data.breakdown = d.breakdown || this.data.breakdown;
      }
    } catch (e) {
      console.error('KPICardZISWAF: Failed to load data', e);
    }
  }

  formatCurrency(amount) {
    if (typeof amount === 'string') return amount;
    // Symbol, thousands separator and symbol position come from Frappe
    // (Currency doctype + system settings) - no hardcoded currency here.
    return format_currency(amount, this.data.currency, 0);
  }

  render() {
    const iconHtml = this.data.iconHtml || this.getDefaultIcon();
    const breakdown = this.data.breakdown;
    const breakdownText = `${__("Zakat")}: ${breakdown.zakat || 0}% | ${__("Infaq")}: ${breakdown.infak || 0}% | ${__("Waqf")}: ${breakdown.wakaf || 0}%`;
    const trendClass = this.data.trendUp ? 'kpi-card__trend--up' : 'kpi-card__trend--down';

    this.container.innerHTML = `
      <div class="kpi-card kpi-card--ziswaf">
        <!-- Header: Labels + Icon Badge -->
        <div class="kpi-card__header">
          <div class="kpi-card__label-wrap">
            <div class="kpi-card__label">
              ${this.data.labelLines.map(line => `<div class="kpi-card__label-line">${this.escapeHtml(line)}</div>`).join('')}
            </div>
          </div>
          <div class="kpi-card__icon-badge">
            ${iconHtml}
          </div>
        </div>

        <!-- Value -->
        <div class="kpi-card__value-wrap">
          <div class="kpi-card__value">${this.escapeHtml(this.data.value)}</div>
        </div>

        <!-- Breakdown -->
        <div class="kpi-card__breakdown">
          <div class="kpi-card__breakdown-text">${this.escapeHtml(breakdownText)}</div>
        </div>

        <!-- Footer Trend (same as Cash & Bank card) -->
        <div class="kpi-card__footer">
          <span class="kpi-card__trend ${trendClass}">${this.escapeHtml(this.data.trendValue)}</span>
          <span class="kpi-card__trend-label">${this.escapeHtml(this.data.trendLabel)}</span>
        </div>
      </div>
    `;

    this.fitWorkspaceBlock();
  }
}

// Global export
window.erpnext = window.erpnext || {};
window.erpnext.kpi = window.erpnext.kpi || {};
window.erpnext.kpi.KPICardZISWAF = KPICardZISWAF;
