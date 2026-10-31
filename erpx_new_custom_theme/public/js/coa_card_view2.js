/* ============================================================
   ERPX - COA Card View
   Mode 'category' : kartu ringkasan (sesuai desain)
   Mode 'tree'     : daftar akun berhierarki
   Dimuat sebagai script biasa: JANGAN pakai export/import.
   Semua pencarian elemen lewat this.container (aman untuk
   shadow DOM Custom HTML Block).
   ============================================================ */

class COACardView {
  constructor(options = {}) {
    this.container = options.container || document.body;
    this.company = options.company || (frappe.defaults && frappe.defaults.get_user_default ? frappe.defaults.get_user_default('company') : frappe.defaults.get_default('company'));
    this.currency = (frappe.boot && frappe.boot.sysdefaults && frappe.boot.sysdefaults.currency) || '';
    this.statusText = options.statusText || 'Tervalidasi DSN MUI';
    this.viewMode = options.view === 'tree' ? 'tree' : 'category';
    this.cssVersion = options.cssVersion || '';

    this.accounts = [];
    this.treeData = [];
    this.categories = [];
    this.visible = new Set();
    this.expandedNodes = new Set();
    this.searchQuery = '';
    this.showInactive = false;
    this.searchDebounce = null;

    this.init();
  }

  async init() {
    this.renderShell();
    this.bindEvents();
    this.render();
    await this.loadData();
    this.render();
  }

  /* ---------- Kerangka kartu ---------- */
  renderShell() {
    this.fitWorkspaceBlock();
    // Pasang stylesheet ke dalam shadow DOM (Custom HTML Block)
    const root = this.container.getRootNode();
    if (root instanceof ShadowRoot && !root.querySelector('link[data-coa-css]')) {
      const link = document.createElement('link');
      link.rel = 'stylesheet';
      const cssVersion = this.cssVersion || (window.COA_CARD_VIEW_CSS_VERSION || '');
      const versionSuffix = cssVersion ? `?v=${cssVersion}` : '';
      link.href = `/assets/erpx_new_custom_theme/css/coa_card_view.css${versionSuffix}`;
      link.setAttribute('data-coa-css', '1');
      root.prepend(link);
    }

    this.container.innerHTML = `
      <div class="coa-card-view">
        <div class="coa-widget">
          <div class="coa-widget__head">
            <h3 class="coa-widget__title">
              <span class="coa-widget__bullet"></span>COA
              <a class="coa-widget__link" href="/app/account/view/tree" data-act="open-coa" title="Buka Chart of Accounts">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M7 17L17 7M8 7h9v9"/></svg>
              </a>
            </h3>
            <span class="coa-widget__badge" data-el="badge">Memuat...</span>
          </div>

          <div class="coa-widget__body">
            <p class="coa-widget__desc" data-el="desc">Struktur hierarki bagan akun standar filantropi Islam.</p>
            <div data-el="cats"></div>
            <div class="coa-widget__tree" data-el="treewrap" style="display:none">
              <input type="search" class="coa-search" data-el="search" placeholder="Cari kode atau nama akun" aria-label="Cari akun">
              <div class="coa-tree" data-el="tree" role="tree" aria-label="Chart of Accounts"></div>
            </div>
          </div>

          <div class="coa-widget__actions">
            <button type="button" class="coa-btn" data-act="toggle-tree">Buka Tree View</button>
            <button type="button" class="coa-btn coa-btn--primary" data-act="new">+ Tambah Akun</button>
          </div>

          <div class="coa-widget__foot">
            <span>Status COA</span>
            <span class="coa-widget__status"><i class="coa-widget__status-dot"></i>${frappe.utils.escape_html(this.statusText)}</span>
          </div>
        </div>
      </div>`;

    const $ = (n) => this.container.querySelector(`[data-el="${n}"]`);
    this.widgetEl = this.container.querySelector('.coa-widget');
    this.badgeEl = $('badge');
    this.descEl = $('desc');
    this.catsEl = $('cats');
    this.treeWrapEl = $('treewrap');
    this.treeEl = $('tree');
    this.searchEl = $('search');
    this.toggleBtn = this.container.querySelector('[data-act="toggle-tree"]');
  }

  /* Hilangkan padding/tinggi pembungkus Custom Block agar pas dengan kartu & cegah melar */
  fitWorkspaceBlock() {
    const root = this.container.getRootNode();
    if (!(root instanceof ShadowRoot)) return;
    const host = root.host;
    if (!host) return;

    const set = (el, k, v) => el.style.setProperty(k, v, 'important');
    set(host, 'display', 'block');
    set(host, 'width', '100%');

    let el = host.parentElement;
    for (let i = 0; i < 8 && el; i++) {
      if (el.classList.contains('codex-editor__redactor') || el.classList.contains('codex-editor')) break;
      set(el, 'padding', '0');
      set(el, 'min-height', '0');
      set(el, 'height', 'auto');
      set(el, 'max-height', 'none');

      if (el.classList.contains('widget')) {
        set(el, 'border', '0');
        set(el, 'box-shadow', 'none');
        set(el, 'background', 'transparent');
      }

      if (el.classList.contains('ce-block')) {
        set(el, 'align-self', 'flex-start');
        break;
      }
      el = el.parentElement;
    }
  }

  /* ---------- Fallback Pendeteksi Root Type ---------- */
  getRootType(account) {
    if (account.root_type) return account.root_type;
    const nameOrNumber = (account.account_number || account.name || '').trim();
    if (nameOrNumber.startsWith('1')) return 'Asset';
    if (nameOrNumber.startsWith('2')) return 'Liability';
    if (nameOrNumber.startsWith('3')) return 'Equity';
    if (nameOrNumber.startsWith('4')) return 'Income';
    if (nameOrNumber.startsWith('5') || nameOrNumber.startsWith('6') || nameOrNumber.startsWith('7') || nameOrNumber.startsWith('8') || nameOrNumber.startsWith('9')) return 'Expense';
    if (account.report_type === 'Balance Sheet') return 'Asset';
    if (account.report_type === 'Profit and Loss') return 'Income';
    return '';
  }

  /* ---------- Data ---------- */
  async loadData() {
    this.isLoading = true;
    try {
      const r = await frappe.call({
        method: 'erpx_new_custom_theme.api.coa.get_coa_tree',
        args: { company: this.company },
      });
      this.accounts = (r.message && r.message.accounts) || [];
      this.buildTree();
      this.buildCategories();
      this.error = null;
    } catch (err) {
      console.error('Failed to load COA:', err);
      this.error = 'Data akun gagal dimuat. Muat ulang halaman atau hubungi admin.';
    } finally {
      this.isLoading = false;
    }
  }

  buildTree() {
    const map = new Map();
    this.accounts.forEach((a) => map.set(a.name, { ...a, children: [] }));

    const roots = [];
    this.accounts.forEach((a) => {
      const node = map.get(a.name);
      if (a.parent_account && map.has(a.parent_account)) {
        map.get(a.parent_account).children.push(node);
      } else {
        roots.push(node);
      }
    });

    this.treeData = roots;
    if (this.expandedNodes.size === 0) roots.forEach((r) => this.expandedNodes.add(r.name));
  }

  buildCategories() {
    const defs = [
      { color: 'var(--coa-asset)',     label: '1 - ASET (Lancar & Tidak Lancar)',            types: ['Asset'] },
      { color: 'var(--coa-liability)', label: '2 - LIABILITAS (Kewajiban Amil/Penyaluran)', types: ['Liability'] },
      { color: 'var(--coa-equity)',    label: '3 - SALDO DANA (Zakat, Infak, Amil)',         types: ['Equity'] },
      { color: 'var(--coa-expense)',   label: '4/5 - PENERIMAAN & PENYALURAN BEBAN',         types: ['Income', 'Expense'] },
    ];

    this.categories = defs.map((d) => ({
      ...d,
      count: this.accounts.filter((a) => {
        const type = (a.root_type || this.getRootType(a) || '').toLowerCase();
        return d.types.some((t) => t.toLowerCase() === type);
      }).length,
    }));

    const total = this.accounts.length;
    const groups = this.accounts.filter((a) => a.is_group).length;
    const classes = new Set(this.accounts.map((a) => a.root_type || this.getRootType(a)).filter(Boolean)).size;

    this.badgeEl.textContent = `${total} Akun Terdaftar`;
    this.descEl.textContent =
      `Struktur hierarki bagan akun standar filantropi Islam (Total ${total} Akun, ${groups} Grup/Folder) terbagi atas ${classes || 4} klasifikasi:`;
  }

  /* ---------- Render ---------- */
  render() {
    const isTree = this.viewMode === 'tree';
    this.catsEl.style.display = isTree ? 'none' : 'block';
    this.treeWrapEl.style.display = isTree ? 'block' : 'none';
    this.widgetEl.classList.toggle('coa-widget--tree', isTree);
    this.toggleBtn.textContent = isTree ? 'Kembali ke Ringkasan' : 'Buka Tree View';

    if (isTree) this.renderTree();
    else this.renderCategories();
  }

  renderCategories() {
    if (this.isLoading !== false && !this.accounts.length && !this.error) {
      this.catsEl.innerHTML = '<div class="coa-skeleton"></div>'.repeat(4);
      return;
    }
    if (this.error) {
      this.badgeEl.textContent = 'Gagal memuat';
      this.catsEl.innerHTML = `<div class="coa-empty">${frappe.utils.escape_html(this.error)}</div>`;
      return;
    }

    const max = Math.max(...this.categories.map((c) => c.count), 1);
    this.catsEl.innerHTML = this.categories.map((c) => `
      <div class="coa-cat" style="--c:${c.color}">
        <div class="coa-cat__row">
          <i class="coa-cat__dot"></i>
          <span class="coa-cat__label">${frappe.utils.escape_html(c.label)}</span>
          <span class="coa-cat__count"><span>${c.count}</span><span>Akun</span></span>
        </div>
        <div class="coa-cat__bar"><div style="width:${((c.count / max) * 100).toFixed(0)}%"></div></div>
      </div>`).join('');
  }

  renderTree() {
    this.treeEl.innerHTML = '';
    if (this.error) {
      this.treeEl.innerHTML = `<div class="coa-empty">${frappe.utils.escape_html(this.error)}</div>`;
      return;
    }

    this.computeVisible();
    if (this.visible.size === 0) {
      this.treeEl.innerHTML = '<div class="coa-empty">Tidak ada akun yang cocok dengan pencarian.</div>';
      return;
    }
    this.treeData.forEach((root) => this.renderNode(root, this.treeEl));
  }

  computeVisible() {
    const q = this.searchQuery.toLowerCase().trim();
    const byName = new Map(this.accounts.map((a) => [a.name, a]));

    const matches = this.accounts.filter((a) => {
      if (!this.showInactive && a.disabled) return false;
      if (!q) return true;
      return (
        (a.account_name || '').toLowerCase().includes(q) ||
        (a.name || '').toLowerCase().includes(q) ||
        (a.account_number || '').toLowerCase().includes(q)
      );
    });

    this.visible = new Set();
    matches.forEach((a) => {
      let cur = a;
      while (cur && !this.visible.has(cur.name)) {
        this.visible.add(cur.name);
        cur = byName.get(cur.parent_account);
      }
    });
  }

  renderNode(node, parentEl) {
    if (!this.visible.has(node.name)) return;

    const kids = node.children.filter((c) => this.visible.has(c.name));
    const hasKids = kids.length > 0;
    const expanded = hasKids && (this.expandedNodes.has(node.name) || !!this.searchQuery.trim());
    const type = node.root_type || this.getRootType(node) || '';
    const esc = frappe.utils.escape_html;

    const typeColors = {
      Asset: 'var(--coa-asset)', Liability: 'var(--coa-liability)', Equity: 'var(--coa-equity)',
      Income: 'var(--coa-income)', Expense: 'var(--coa-expense)',
    };

    const card = document.createElement('div');
    card.className = `coa-card${hasKids && !expanded ? ' coa-card--collapsed' : ''}`;
    card.dataset.accountName = node.name;
    card.style.setProperty('--coa-type-color', typeColors[type] || 'var(--coa-line)');

    let balanceHtml = '';
    if (!node.is_group) {
      const bal = node.balance || 0;
      const cls = bal > 0 ? 'debit' : bal < 0 ? 'credit' : 'zero';
      const lbl = type === 'Asset' || type === 'Expense' ? 'Debit' : 'Kredit';
      balanceHtml = `
        <div class="coa-card__balance-row">
          <span class="coa-card__balance-label">${lbl}</span>
          <span class="coa-card__balance-value coa-card__balance-value--${cls}">${format_currency(bal, this.currency)}</span>
          ${node.disabled ? '<span class="coa-card__status">Nonaktif</span>' : ''}
        </div>`;
    } else if (node.disabled) {
      balanceHtml = '<div class="coa-card__balance-row"><span class="coa-card__status">Nonaktif</span></div>';
    }

    const icon = (d) => `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">${d}</svg>`;

    card.innerHTML = `
      <div class="coa-card__header" role="treeitem" aria-expanded="${hasKids ? expanded : 'false'}">
        ${hasKids
          ? `<button type="button" class="coa-card__toggle" aria-label="${expanded ? 'Tutup' : 'Buka'} ${esc(node.account_name)}"></button>`
          : '<span class="coa-card__indent"></span>'}
        <div class="coa-card__main">
          <div class="coa-card__code-name">
            ${node.account_number ? `<span class="coa-card__code">${esc(node.account_number)}</span>` : ''}
            <span class="coa-card__name">${esc(node.account_name)}</span>
            ${type ? `<span class="coa-card__type-badge coa-card__type-badge--${type.toLowerCase()}">${esc(type)}</span>` : ''}
          </div>
          ${balanceHtml}
        </div>
        <div class="coa-card__actions">
          <button type="button" class="coa-card__action-btn" data-act="ledger" title="Lihat buku besar">${icon('<path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/>')}</button>
          <button type="button" class="coa-card__action-btn" data-act="edit" title="Ubah akun">${icon('<path d="M12 20h9"/><path d="M16.5 3.5a2.1 2.1 0 013 3L7 19l-4 1 1-4z"/>')}</button>
          <button type="button" class="coa-card__action-btn" data-act="child" title="Tambah akun anak">${icon('<path d="M12 5v14M5 12h14"/>')}</button>
          <button type="button" class="coa-card__action-btn" data-act="status" data-disabled="${node.disabled ? 1 : 0}" title="${node.disabled ? 'Aktifkan' : 'Nonaktifkan'}">${icon('<path d="M18.4 6.6a9 9 0 11-12.8 0"/><path d="M12 2v10"/>')}</button>
        </div>
      </div>
      ${expanded ? '<div class="coa-card__children" role="group"></div>' : ''}`;

    parentEl.appendChild(card);

    if (expanded) {
      const box = card.querySelector('.coa-card__children');
      kids.forEach((k) => this.renderNode(k, box));
    }
  }

  /* ---------- Event ---------- */
  bindEvents() {
    this.container.addEventListener('click', (e) => {
      const actEl = e.target.closest('[data-act]');
      const act = actEl && actEl.dataset.act;

      if (act === 'open-coa') { e.preventDefault(); frappe.set_route('Tree', 'Account'); return; }
      if (act === 'toggle-tree') { this.toggleViewMode(); return; }
      if (act === 'new') { this.openNewAccount(); return; }

      const card = e.target.closest('.coa-card');
      if (!card) return;
      const name = card.dataset.accountName;

      if (act === 'ledger') return this.openLedger(name);
      if (act === 'edit') return frappe.set_route('Form', 'Account', name);
      if (act === 'child') return this.openNewAccount(name);
      if (act === 'status') return this.toggleAccountStatus(name, actEl.dataset.disabled !== '1');

      if (e.target.closest('.coa-card__header') && !e.target.closest('.coa-card__actions')) {
        if (card.querySelector(':scope > .coa-card__header .coa-card__toggle')) this.toggleNode(name);
      }
    });

    this.searchEl.addEventListener('input', (e) => {
      clearTimeout(this.searchDebounce);
      this.searchDebounce = setTimeout(() => {
        this.searchQuery = e.target.value;
        this.renderTree();
      }, 200);
    });
  }

  toggleViewMode() {
    this.viewMode = this.viewMode === 'category' ? 'tree' : 'category';
    this.render();
  }

  toggleNode(name) {
    if (this.expandedNodes.has(name)) this.expandedNodes.delete(name);
    else this.expandedNodes.add(name);
    this.renderTree();
  }

  openLedger(name) {
    frappe.set_route('query-report', 'General Ledger', { account: name, company: this.company });
  }

  openNewAccount(parent = null) {
    const opts = { company: this.company };
    if (parent) opts.parent_account = parent;
    frappe.new_doc('Account', opts);
  }

  async toggleAccountStatus(name, disabled) {
    try {
      await frappe.call({
        method: 'frappe.client.set_value',
        args: { doctype: 'Account', name, fieldname: 'disabled', value: disabled ? 1 : 0 },
      });
      frappe.show_alert({ message: disabled ? 'Akun dinonaktifkan' : 'Akun diaktifkan', indicator: disabled ? 'orange' : 'green' });
      await this.loadData();
      this.render();
    } catch (err) {
      frappe.msgprint({ title: 'Gagal mengubah status akun', message: err.message || String(err), indicator: 'red' });
    }
  }

  destroy() {
    clearTimeout(this.searchDebounce);
    this.container.innerHTML = '';
  }
}

// Daftarkan ke namespace global
frappe.provide('erpnext.coa');
erpnext.coa.CardView = COACardView;
