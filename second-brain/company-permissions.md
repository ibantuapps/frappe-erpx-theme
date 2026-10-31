# Company Permissions

Semua API whitelist resolve company lewat helper identik di 3 file
(`api/kpi.py`, `api/je_kpi.py`, `api/coa.py`):

- `_get_allowed_companies()` — baca `frappe.defaults.get_user_permissions()["Company"]`.
- `_resolve_company(company)`:
  - Param diisi → harus ada (`db.exists`) + `has_permission("Company", doc)` +
    masuk allowed list (kecuali System Manager), kalau tidak
    `throw _("Not permitted to access Company {0}")`.
  - Kosong → default user (bila permitted) → allowed[0] → company pertama
    (manager) → None (caller return `{"error": _("Company not set")}` /
    coa throw `No company found`).

## Perilaku

- User 1-company + Custom Block (`apiArgs: {}`) → angka company dia saja.
- Panggil langsung dengan company lain → ditolak (dulu lolos karena
  `get_all`/`db.sql` bypass permission).
- Superadmin tanpa default → otomatis company pertama (dulu `Rp 0`).

## Cakupan (10 fungsi)

kpi: cash_bank, receivables, payables, ziswaf, mustahik, audit_trail,
payment_entry_summary, pilar_counts/names. je_kpi: journal_summary.
coa: get_coa_tree, get_account_balance.
