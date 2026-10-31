/* ============================================================
   Audit Trail Realtime — Custom HTML Block Component
   ============================================================ */

class AuditTrailBlock {
  constructor({ container, data = {} }) {
    this.container = container;
    this.data = {
      apiEndpoint: data.apiEndpoint || 'erpx_new_custom_theme.api.kpi.get_audit_trail',
      apiArgs: data.apiArgs || {},
      autoLoad: data.autoLoad !== false,
      refreshInterval: data.refreshInterval || 60000, // Default 60000ms = 1 Menit
      entries: data.entries || [],
      symbol: data.symbol || '',
      currency: data.currency || null,
      lastSync: data.lastSync || null
    };

    if (!this.container) {
      console.warn('AuditTrailBlock: Container element not found', this.container);
      return;
    }

    this.injectStyles();
    this.render();

    if (this.data.autoLoad !== false) {
      this.loadData().then(() => this.render());

      // Auto Refresh Interval (Polling Realtime)
      if (this.pollInterval) clearInterval(this.pollInterval);
      this.pollInterval = setInterval(() => {
        this.loadData().then(() => this.render());
      }, this.data.refreshInterval);
    }
  }

  escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
  }

  /* Helper Waktu Penyelarasan Dinamis */
  getTimeAgo(lastSyncTime) {
    if (!lastSyncTime) return __("Just now");
    const now = new Date();
    const syncDate = new Date(lastSyncTime);
    const diffSec = Math.floor((now - syncDate) / 1000);

    if (diffSec < 30) return __("Just now");
    if (diffSec < 60) return __("{0} seconds ago").replace("{0}", diffSec);
    const diffMin = Math.floor(diffSec / 60);
    if (diffMin < 60) return __("{0} minutes ago").replace("{0}", diffMin);
    const diffHour = Math.floor(diffMin / 60);
    return __("{0} hours ago").replace("{0}", diffHour);
  }

  injectCriticalCss() {
    const root = this.container.getRootNode();
    const target = root instanceof ShadowRoot ? root : document.head;
    if (target.querySelector('style[data-x-css-audit-critical]')) return;
    const st = document.createElement('style');
    st.setAttribute('data-x-css-audit-critical', '1');
    st.textContent = [
      '.kpi-audit{box-sizing:border-box!important;min-height:120px!important}',
      '.kpi-audit__table{width:100%!important;border-collapse:collapse!important}',
      '.kpi-audit__table-wrap{overflow-x:auto!important}',
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
      if (root.querySelector('link[data-x-css-audit]')) return;

      // Pakai URL stylesheet yang sudah ada di <head> apa adanya (ikut cache).
      const headLink = Array.from(document.querySelectorAll('link[rel="stylesheet"]'))
        .find((l) => l.href && l.href.includes('kpi_card'));

      const cssUrl = headLink
        ? headLink.href
        : '/assets/erpx_new_custom_theme/css/kpi_card.bundle.css';

      const link = document.createElement('link');
      link.rel = 'stylesheet';
      link.setAttribute('data-x-css-audit', '1');
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

      if (result && result.message && result.message.entries) {
        this.data.entries = result.message.entries;
        this.data.symbol = result.message.symbol || this.data.symbol;
        this.data.currency = result.message.currency || this.data.currency;
        this.data.lastSync = result.message.last_sync || new Date();
      }
    } catch (e) {
      console.error('[AuditTrailBlock] Load failed:', e);
    }
  }

  badgeClass(tone) {
    return `kpi-audit__badge kpi-audit__badge--${tone || 'slate'}`;
  }

  statusBadge(status) {
    const s = status || __("Approved");
    if (s.toLowerCase().includes("pending")) {
      return `<span class="kpi-audit__status kpi-audit__status--pending">
        <svg width="12" height="12" viewBox="0 0 16 16" fill="none" stroke="#d97706" stroke-width="1.5">
          <circle cx="8" cy="8" r="6.5"/><path d="M8 4.5V8l2.5 1.5"/>
        </svg>
        ${this.escapeHtml(s)}
      </span>`;
    }
    return `<span class="kpi-audit__status kpi-audit__status--approved">
      <svg width="12" height="12" viewBox="0 0 16 16" fill="none" stroke="#059669" stroke-width="1.5">
        <circle cx="8" cy="8" r="6.5"/><path d="M4.5 8.5l2 2 4-4"/>
      </svg>
      ${this.escapeHtml(s)}
    </span>`;
  }

  render() {
    const rows = this.data.entries;

    const bodyHtml = rows.map((r) => `
      <tr>
        <td class="kpi-audit__ref">${this.escapeHtml(r.ref)}</td>
        <td><span class="${this.badgeClass(r.tone)}">${this.escapeHtml(r.type)}</span></td>
        <td class="kpi-audit__desc">${this.escapeHtml(r.desc)}</td>
        <td class="kpi-audit__amount">${r.amount_fmt || format_currency(r.amount || 0, this.data.currency, 0)}</td>
        <td class="kpi-audit__alloc">${this.escapeHtml(r.allocation)}</td>
        <td>${this.statusBadge(r.status)}</td>
      </tr>
    `).join('');

    const emptyHtml = rows.length === 0
      ? `<tr><td colspan="6" class="kpi-audit__empty">${this.escapeHtml(__("No transactions recorded"))}</td></tr>`
      : bodyHtml;

    this.container.innerHTML = `
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
              ${emptyHtml}
            </tbody>
          </table>
        </div>
      </div>
    `;

    this.fitWorkspaceBlock();
  }
}

// Global export
window.erpnext = window.erpnext || {};
window.erpnext.kpi = window.erpnext.kpi || {};
window.erpnext.kpi.AuditTrailBlock = AuditTrailBlock;
