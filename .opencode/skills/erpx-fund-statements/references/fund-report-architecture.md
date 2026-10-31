# Fund report architecture (script + JS + CSS)

Everything below was verified against the live docs on `demo-theme.i-erpx.co` on
2026-10-18. Line numbers are approximate; search for the identifier instead.

## 1. `report_script` (Python, safe_exec constraints)

Header comment lists the *safe_exec* constraints: **no `def`, no unpacking, no
`.format()`, no `import`; the final expression must be `data = [columns, rows]`.**
Filters available: `company, fund, branch, periode, from_date, to_date, cut_off_date,
language, hide_zero` (+ optional undocumented `amil_je_title_like`).

Landmarks (search these strings):

| Search for | Meaning |
| --- | --- |
| `FUND_PROFILES = {` | `{"infak": {"inc": ["42","46"], "exp": ["52","56"], "eq": ["32"], "pf": ...}, "zakat": {"inc": ["41"], "exp": ["51"], "eq": ["31"]}, "amil": {"inc": ["43"], "exp": ["53"], "eq": ["33"]}}` |
| `FUNDNAME_ALL = {` | uppercase fund name per language, e.g. id zakat `"DANA ZAKAT"` |
| `FUNDTITLE_ALL = {` | title-case fund name, e.g. id zakat `"Dana Zakat"` **already contains the word "Dana"** |
| `MONTHS_ALL = {` / `MONTHS = MONTHS_ALL[LANG]` | localized month names for `tgl_awal` / `tgl_akhir` |
| `LBL_ALL = {` then `L = LBL_ALL[LANG]` | row/section/column labels (`receipts, inflows, disb, outflows, coagroup, total_receipts, total_disb, recon, recon_en, surplus, monthly, opening, correction, opening_after, closing, c_desc, c_kode, c_amt, c_prev, c_diff`) |
| `C2. ` / `D2. ` head strings | comparison-period blocks (`C2. PERIODE PEMBANDING`, `D2. SALDO AWAL PERIODE PEMBANDING`) with `sec_prev`, `bal_prev`, `sur_prev`, `aw_prev`, `awt_prev`, `sk_prev`, `tot_p`; the comparison period is the last fiscal year ending before `from_date` (fallback `from_date` − 1 year) and is always computed (no `show_comparison` switch) |
| `FREE_KW = [` / `TIED_KW = [` | tied/free keyword lists (FREE checked first) |
| `SPLIT_EQUITY_BY_RATIO` | allocate a single equity account proportionally by cumulative surplus ratio |
| `"A. " + L["receipts"]` | section A head: `A. PENERIMAAN <FUNDNAME> (INFLOWS) — KELOMPOK COA <pf>` |
| `"B. " + L["disb"]` | section B head: `B. PENYALURAN / PENGGUNAAN <FUNDNAME> (OUTFLOWS) — KELOMPOK COA <pf>` |
| `recon_head = "C. "` | section C head: `C. REKONSILIASI DANA (FUND RECONCILIATION) — KELOMPOK COA <eq>` |
| `L["total_receipts"] + " " + FUNDNAME` | subtotal rows include the fund name and prefix list |
| `open_label = L["opening"]` | `Saldo Awal <FUNDTITLE> (<dd Month yyyy>)` |
| `if corr != 0:` | emits `correction` **and** `opening_after` rows only when there is a correction |
| `close_label = L["closing"]` | `SALDO AKHIR <FUNDNAME> (<dd Month yyyy>)` |
| `columns = [` | returns the **4 columns of the prod standard report**: `keterangan` / `jumlah` / `jumlah_perbandingan` / `selisih` (labels `L["c_desc"]/["c_amt"]/["c_prev"]/["c_diff"]`, all `Currency` with `options: currency`). `terikat`/`tidak_terikat` stay on the row dicts (KPI + amil control) but are **not** columns, and the COA-code pill renders in the last column (`selisih`) to keep the Figma layout. Figma-only columns (Terikat/Tidak Terikat, Zakat/Infak/Amil/Non-Halal) were replaced, not added. |

`pf_txt` = the section's COA prefixes joined with `" & "` (so `"42 & 46"`); `eq_txt` = the
equity prefixes joined with `" & "`. `nm_suffix` appends the root account names in
parentheses and must stay empty when there is none (an earlier bug produced `()`).

Account detection: exact `account_number == prefix`, else `name LIKE "<prefix> %"`.
Ordering/depth come from `lft`/`rgt`; `depth` becomes `indent` (`+1`).

## 2. `javascript` (desk report UI)

Module-level helpers (all prefixed `_inf_`), then the report object keyed by
`frappe.query_reports["<report_name>"]`. Helper inventory:

- formatting: `_inf_fmt`, `_inf_fmtRp`, `_inf_pct`, `_inf_date_short`, `_inf_month_end`,
  `_inf_prev_month`, `_inf_strip`, `_inf_num`
- fund/lang: `_inf_fund_name(lang, fund)`, `_inf_T(lang)` (`T.ms = T.id`), `_inf_lang(f, cb)`
  (filter → company country), `_inf_ctx_fund()`, `_inf_ctx_lang()`, `_inf_fu(lang, f)`
- amil rule: `_inf_amil_cap()` (zakat 12.5 else 20), `_inf_amil_max_txt(T)`,
  `_inf_amil_cap_lbl(T)`
- data: `_inf_rows(report)`, `_inf_of(rows, tipe)`, `_inf_income_of`, `_inf_expense_rows`
- tables/cells: `_inf_tone(tipe)`, `_inf_cell_desc(data)`, `_inf_cell_kode(data)`,
  `_inf_cell_amt(data, fn)` — these emit marker classes, see §4
- sections: `_inf_html_head`, `_inf_bar_html`, `_inf_kpi_html`, `_inf_letterhead_html`,
  `_inf_ctl_html`, `_inf_foot_html`, `_inf_bind_bar`
- render/export: `_inf_render(report)`, `_inf_report_data`, `_inf_add_buttons`,
  `_inf_build_html`, `_inf_excel`, `_inf_pdf`, `_inf_load_xlsx`

Report object:

```js
frappe.query_reports["<report_name>"] = {
  formatter: function (value, row, column, data, default_formatter) { ... },
  filters: [ company, fund, branch, periode, from_date, to_date, cut_off_date, language, hide_zero ],
  onload: function (report) { ...; if (!report.get_filter_value("fund")) report.set_filter_value("fund", "<default>"); },
  after_datatable_render: function () { _inf_render(frappe.query_report); }
};
```

- `fund` filter: `Select`, `options: "infak\nzakat\namil"`, `default:` **`"infak"` for the
  Infak doc, `"zakat"` for the Zakat doc** (also in `onload`).
- `periode` `on_change` sets from/to (month start→month end, or year start→year end).
- `_inf_render` measures the report rows, computes the KPI block, fetches company currency
  (`frappe.db.get_value Company default_currency`), `Accounts Settings.acc_frozen_upto`
  (drives the "locked" control card) and the previous month's report for MoM, then injects
  `#infak-top` before and `#infak-bottom` after `.datatable`, binds the custom filter bar,
  and hides Frappe's own filter bar by adding `.infak-hide-form` to `.page-form`.
- `_inf_add_buttons` adds the **Print PDF** and **Export Excel** inner buttons (XLSX is
  loaded from the SheetJS CDN).

## 3. `T` label dictionary (id / en; `ms` aliases `id`)

Notable keys: `pageSub, badgeOk, badgeMtd, seg{infak,zakat,amil}, allBranch, monthly, yearly,
fBranch, fPeriode, fRange, fLang, fHideZero, apply, currencyLabel, valid, openPeriod,
kAwal, kMasuk, kKeluar, kAkhir, tied, free, momVs, firstMonth, efektif, amilLabel, amilMax,
amilMax12, amilBadge, ctlAmilMaxZ, surplus, recon, klir, notKlir, docTitle, docPeriod,
docBasis, lhLeft, lhCoa, lhOk, docControl, cutOff, ctlLockT, ctlLockedV, ctlOpenV,
ctlLockD, ctlLockD2, ctlKeyId, ctlAmilT, ctlAmilOkV, ctlAmilWarnV, ctlAmilMax, ctlAmilReal,
ctlAmilStatus, ctlIntT, ctlIntV, ctlIntD, footLinks, footnote`.

Fund-aware KPI titles render as `T.kAwal + " " + _inf_fu(lang, f) + " (date)"` →
`SALDO AWAL DANA ZAKAT (…)`; `T.kMasuk + " " + fund` → `TOTAL PENERIMAAN ZAKAT`;
`T.kKeluar` alone → `TOTAL PENYALURAN`; `T.kAkhir + " " + fund` → `SALDO AKHIR DANA ZAKAT`.

## 4. Row tones, cells and CSS contract

Formatter output for every row carries a tone marker so CSS can fill the whole row:

| tipe | marker class | surface |
| --- | --- | --- |
| `section` | `inf-row--section` | `#f1f5f9` band, 30px row, inset navy rail, bold navy 11.5px |
| `subtotal`, `surplus`, `opening_after` | `inf-row--subtotal` | `#f8fafc`, 1px `#94a3b8` top border, bold |
| `closing` | `inf-row--closing` | `#eef2f7`, 2px navy top border, bold |
| `blank` | `inf-row--blank` | transparent, 10px row |
| other | — | white |

Cell classes: `inf-desc` (+`--section|--group|--total|--account`), `inf-num`
(+`--neg|--zero|--total`), `inf-code` (+`--section` pill), `inf-badge` (green amil pill).
Amounts format as `(1.234)` for negatives and `-`/muted grey for zero, `tabular-nums`.

CSS file: `erpx_new_custom_theme/public/css/infak_report.bundle.css`, registered in
`hooks.py` as `/assets/erpx_new_custom_theme/css/infak_report.bundle.css`. It contains the
`.infak-title*`, `.infak-badges/.infak-badge`, `.infak-bar/.infak-seg/.infak-field/
.infak-chip/.infak-input/.infak-btn`, `.infak-kpi/.infak-card`, `.infak-letterhead/
.infak-tag`, `.infak-ctl/.infak-ctl-box`, `.infak-foot`, the DataTable overrides, the
`.page-form.infak-hide-form` rule, plus responsive and print rules. All report DOM is scoped
by `.infak-report`, which `_inf_render` adds to `report.$report`.

## 5. Adding another fund type

1. Add the profile to `FUND_PROFILES` (+ `FUNDNAME_ALL`, `FUNDTITLE_ALL`, and `COLT_ALL` if
   needed) in the **shared** script.
2. Add the option to the JS `fund` filter `options` and to `T.seg`.
3. Duplicate the Report doc with `report_tools.duplicate_report` and set the fund default.
4. Probe it; then check the browser.

## 6. Frappe DataTable facts worth remembering

- `.dt-row { height: 35px }` (overridden per tone to 30/34/10px); `.dt-cell` owns the
  background and has `padding: 0`; `.dt-cell__content` has the padding and already sets
  `font-feature-settings: "tnum"`.
- Rows are `.dt-row.dt-row-<index>`, cells are `.dt-cell--col-<n>`; header cells
  `.dt-cell--header` with `.dt-cell__content--header-<n>`.
- `.datatable .dt-cell { color: var(--text-color) !important }` — set colours on inner
  elements, not on `.dt-cell`.
- `.dt-row--hide` / `.dt-row--unhighlight` exist; `dt-row-filter` is the filter row.

## 7. `Arus Kas` (cash flow) — same design language, prod column contract

Verified against the live doc on `demo-theme.i-erpx.co` on 2026-10-19 (script 18 187 chars,
JS 18 848 chars).

`report_script` landmarks:

| Search for | Meaning |
| --- | --- |
| `LANG = (filters.get("language") or "").lower()` | label language from the `language` filter, else `Company.country` (indonesia→`id`, malaysia→`ms`, else `en`) |
| `LBL_ALL = {` / `L = LBL_ALL[LANG]` | id/ms/en row labels; `tipe` per row is language-independent |
| `mata_uang = frappe.db.get_value("Company", comp, "default_currency")` | per-company currency, emitted as `currency` on **every** row |
| `columns = [` … `data = [columns, rows]` | 4 columns: `keterangan` / `jumlah` / `jumlah_perbandingan` / `selisih` |

Row contract: `{keterangan, jumlah, jumlah_perbandingan, selisih, indent, bold, tipe, currency}`.
`tipe` enum — the JS finds rows by `tipe`, **not** by matching localised text: `opHead, inHead,
inTotal, outHead, outTotal, detail, other, opNet, invHead, invRow, invNet, finHead, finRow,
finNet, net, open, end, consists, kas, bank, sum, blank, noCash`. Section rows carry
`jumlah: null` and `selisih: null` (not a bug).

`javascript` (all helpers prefixed `_arus_`):

- money: `_ARUS_CUR` / `_arus_cur_set` — primed from `row.currency` (render, PDF, Excel) so the
  number format comes from the **company**, never the site locale; `_arus_num_fmt` →
  `format_number(n, get_number_format(_ARUS_CUR), 0)`, `_arus_cur_sym` → `get_currency_symbol`,
  `_arus_fmt` (table cells: `(1.234)` for negatives, `-` for zero), `_arus_fmt_cur` (KPI cards,
  symbol prefix). No `Rp`, no `toLocaleString("id-ID")`.
- labels: `_arus_T(lang)` (id/en, `T.ms = T.id`), `_arus_lang()` (filter → cached `_ARUS_LANG` →
  `frappe.boot.lang`), `_arus_lang_resolve(f, cb)` (filter → `Company.country`) — mirrors the
  script so rows and chrome always agree.
- data/lookup: `_arus_rows(report)`, `_arus_find(rows, re, tipe)` — tries `tipe` first, then the
  regex, so the KPI block works in every language.
- sections: `_arus_render_sections` injects `#arus-title`, `#arus-kpi` (5 cards) and `#arus-bank`;
  the bank table is **3 columns** (label / nomor / saldo_buku) — the old "SALDO REKENING",
  "STATUS" and the "Selaras" pill were fabricated values and were removed, together with the
  PSAK/BAZNAS/DPS badges.
- export: `_arus_report_data` (returns `rows`, `filters`, `columns` from
  `frappe.desk.query_report.run`), `_arus_build_html`, `_arus_excel` (SheetJS CDN), `_arus_pdf`
  (`frappe.utils.print_format.report_to_pdf`); buttons are `__("Print PDF")` /
  `__("Download Excel")`.
- filters: `periode` (label `__("Reporting Period")`), `from_date`, `to_date`, `language`
  (`Label Language`, options `id/ms/en`).

`api/arus_kas.get_bank_breakdown(company, to_date)`: cash/bank accounts are detected from
`Account.account_type` (`Cash`/`Bank`) first, then generic name keywords
(`kas, cash, bank, giro, deposito, tabungan`) as a fallback for COAs without an `account_type` —
no bank brand names, no country-specific words. Returns
`{rows: [{account, label, nomor, kind: "kas"|"bank", saldo_buku}], total, company, to_date}`;
`saldo_buku` is the GL sum (debit − credit) up to `to_date`; nothing is invented. Caveat: it
trusts `account_type`, so a mis-typed COA row (e.g. an advance account tagged `Bank` on the demo
site) will be listed — fix the COA, not the report.

CSS: `public/css/arus_kas.bundle.css` (`.arus-kpi/.arus-card*`, `.arus-bank*`,
`table.arus-table`); `.arus-match` and `.arus-dps` were deleted on 2026-10-19 together with
their markup.

Python reloads: changes under `api/*.py` need `kill -TERM <gunicorn master>` (see
`ops-commands.md`); DB-only edits to `javascript`/`report_script` only need a hard reload.
