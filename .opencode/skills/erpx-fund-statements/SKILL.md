---
name: ERPx PSAK 109 Fund Statements
description: Use when working on the ERPx / erpx_new_custom_theme Frappe app or its site demo-theme.i-erpx.co — especially the PSAK 109 fund statement reports (Perubahan Dana Infak dan Sedekah, Perubahan Dana Zakat, Perubahan Dana Amil) and their Report doc report_script + javascript, the infak_report.bundle.css skin, COA-prefix fund profiles (42+46/52+56/32, 41/51/31, 43/53/33), the hak amil 12,5%/20% rule, the Figma design language, patching or duplicating Report docs between demo-theme and prod, plus the workspace KPI cards, COA card, Payment Entry / Journal Entry list KPI cards and the pilar sidebar filter.
---

# ERPx PSAK 109 fund statements (and friends)

Load this before touching the fund statement reports, the desk KPI cards, or the report
skins of `erpx_new_custom_theme`. It records the architecture, the exact anchors used to
patch things, the ops commands, and the mistakes already made once.

Deep detail lives next to this file:
- `references/fund-report-architecture.md` — script + JS anatomy, label dicts, row contract
- `references/figma-design-notes.md` — Figma file/node ids and the exact design strings
- `references/ops-commands.md` — commands, MCP patch recipe, verification
- `references/prod-migration.md` — prod report inventory + migration plan

Project docs written for humans live in
`/home/demoierpx/frappe-bench/apps/erpx_new_custom_theme/second-brain/`
(app-map, workspace-kpi-cards, coa-card, pilar-sidebar-filter, listview-injectors,
translations, company-permissions, custom-block-snippets, ops-checklist).

## 0. Standing rules (do not break these)

1. **Never run a shell/bench command without an explicit "iya" from the user.** Explain the
   exact commands first, then wait. Reading via the `grep`/`glob`/`read` tools is fine.
2. **Never query the DB directly** (no `bench console`, no raw SQL for data questions).
   Use the `erpnext-prod` / `erpnext-theme` MCP tools, or ask the user for a snippet.
3. **All UI strings English + wrapped for translation**: `_()` in Python, `__()` in JS.
   Language switch for the reports is id / ms / en via the `language` filter (auto from
   company country: Indonesia → `id`, Malaysia → `ms`, else `en`).
4. **No hardcoded numbers in code.** Every figure derives from company/COA/GL data.
   Rule constants (e.g. the amil cap) are allowed but must be named and commented.
5. **Company scoping**: superadmin sees all; users with User Permissions only their company
   (shared helpers `_resolve_company()` / `_get_allowed_companies()` in `api/kpi.py`).

## 1. Where things live

| Thing | Location |
| --- | --- |
| App repo root | `/home/demoierpx/frappe-bench/apps/erpx_new_custom_theme` |
| Python package | `erpx_new_custom_theme/` (analysis cwd is `.../erpx_new_custom_theme/erpx_new_custom_theme`) |
| Desk CSS/JS skins | `erpx_new_custom_theme/public/css/*.bundle.css`, `public/js/*.bundle.js` |
| Report skins registered in | `erpx_new_custom_theme/hooks.py` → `app_include_css` |
| Whitelisted APIs | `erpx_new_custom_theme/api/{kpi,je_kpi,coa,arus_kas,report_tools}.py` |
| **The fund reports themselves** | **only in the site DB (`Report` doctype), NOT in the repo** — `bench migrate` will not carry them |
| Theme site | `demo-theme.i-erpx.co` (company **Ibantu**, abbr `I`, IDR, Indonesia → language `id`). It has a generic trading COA and **zero fund accounts**, so all fund reports render zeros/empty — that is expected, not a bug. |
| Prod site | company **Local Zakora**, abbr `LZ` (real data) |

MCP servers available: `erpnext-theme` (theme site), `erpnext-prod` (prod), `Figma`.
Generic CRUD: `erpnext_doc_get`, `erpnext_doc_list`, `erpnext_doc_update`,
`erpnext_doc_create`, `erpnext_doc_delete`.

## 2. The fund statement reports

Three fund types share ONE generic script + ONE generic UI, selected by the `fund` filter
(`infak` / `zakat` / `amil`), each rendered as its own `Report` doc:

| Report doc (theme) | fund | COA profiles (income / expense / equity) |
| --- | --- | --- |
| `Perubahan Dana Infak dan Sedekah` | infak | `42`+`46` / `52`+`56` / `32` |
| `Perubahan Dana Zakat` | zakat | `41` / `51` / `31` |
| (Amil) | amil | `43` / `53` / `33` |

The zakat profile matches the prod script `Perubahan Dana Zakat` exactly (prod detects
income root `41%`, expense root `51%`, equity accounts containing "zakat" with a separate
"Koreksi Saldo Awal" bucket). See `references/fund-report-architecture.md`.

Shipped state as of 2026-10-18 (theme): both existing docs carry the same generic script
(19,385 chars) and JS (37,331 chars for Infak / 37,319 for Zakat). If the lengths differ
wildly, someone edited one doc only — check for divergence.

Only the `javascript` differs between the two docs: the report key
(`frappe.query_reports["<report_name>"] = {`) and the `fund` default (`infak` vs `zakat`).

### Report doc shape (remember this)

- `autoname = field:report_name` → the doc name IS `report_name`; a copy must set
  `report_name` before insert or it collides with the source.
- `report_type = "Script Report"`, `ref_doctype = "GL Entry"`, `is_standard = "No"`,
  `module = "Accounts"`, roles = Accounts Manager / Accounts User / System Manager
  (+ **Auditor** on Zakat, matching prod).
- For **script reports the `columns` child table is ignored**: the datatable uses the
  columns the script returns (`data = [columns, rows]`). Keep the child table tidy anyway.
- The desk UI is injected by the doc's `javascript` (module-level `_inf_*` helpers, not a
  `frappe.ui.form`). CSS skin: `public/css/infak_report.bundle.css`.

### Row contract

`{keterangan, kode, terikat, tidak_terikat, jumlah, indent, bold, tipe, currency}`

`tipe` ∈ `section | group | account | subtotal | surplus | opening | correction |
opening_after | closing | blank`. `indent` drives padding, `bold` drives weight. The
formatter + CSS key off `tipe` — never off label text (except the amil-row badge).

### Calculation rules that must not regress

- Prefix matching is **exact** `account_number == prefix`, falling back to
  `name LIKE "<prefix> %"`. Never prefix-`LIKE`: the theme site uses `4200.000` style codes
  and would pull HPP into Penerimaan.
- Tied/free classification checks **FREE_KW first** (because "Tidak Terikat" contains
  "terikat"), then TIED_KW, on the account name **and its ancestors**.
- Opening = equity fund accounts + cumulative surplus before the period (switchable).
  `correction` = the separate "Koreksi Saldo Awal" equity bucket; `closing` =
  opening-after-correction + surplus. Equity is split tied/free per account when the COA is
  split, otherwise proportionally (`SPLIT_EQUITY_BY_RATIO`).
- **Hak amil cap**: `zakat → 12,5 %` (PMK 68/2025 & fatwa), `infak` / `amil` → `20 %`.
  Implemented in JS as `_inf_amil_cap()` and used by the KPI card, the compliance control
  box and the `inf-badge` pill ("Beban Amil 12,5%") on the amil expense row.

## 3. Patching a Report doc (the safe recipe)

The script/JS are huge; never dump them into context wholesale. Recipe:

1. `erpnext_doc_get` → keep `report_script` / `javascript` in one string variable.
2. Apply a list of `[find, replace]` pairs, each with an **asserted occurrence count**
   (exactly 1, or N when intentionally matching id+ms). Abort the write if any fails.
3. Write once with `erpnext_doc_update` (`data: {report_script, javascript, ...}`).
4. Verify by re-reading markers (counts of the new identifiers, brace/paren balance, tail).
5. `bench --site ... execute ...probe_report` (needs permission) for a runtime check.

Notes: the script source contains literal `\\u2014` escapes — build that search string with
`String.fromCharCode(92) + "u2014"`, do not hand-type it. `new Function` is blocked in the
Code Mode runtime, so JS cannot be compile-checked; balance counts + marker counts are the
proxy. Anchors should avoid leading whitespace (grep output is trimmed).

## 4. Datatable styling rule (learned the hard way)

Frappe paints the row background on `.dt-cell`, **not** on the content. So a formatter that
puts a background on its own inner element only colours the description column and looks
like a broken dark box. **Row tones must target the cell/row**, driven by a marker class in
the formatter output plus CSS `:has()`:

```css
.infak-report .dt-cell:has(.inf-row--section) { background: #f1f5f9; }
.infak-report .dt-row:has(.inf-row--blank)   { height: 10px; }
```

Palette is deliberately calm: navy header only, light section bands, muted zeros
(`#c3ccd8`), red only for negatives, thin `#e9eef4` borders, no zebra. Keep it that way —
the user complained about eye strain once already.

## 5. Ops (ask for "iya" first)

```bash
bench build --app erpx_new_custom_theme          # after any public/css|js change
bench --site demo-theme.i-erpx.co clear-cache
# duplicate a Report doc (repo helper, CLI only, not a web API)
bench --site demo-theme.i-erpx.co execute erpx_new_custom_theme.api.report_tools.duplicate_report \
  --kwargs "{'src': 'Perubahan Dana Infak dan Sedekah', 'dst': 'Perubahan Dana Zakat', 'defaults': {'fund': 'zakat'}, 'roles_add': ['Auditor']}"
# compact runtime check returning column labels, row count, tipe counts, sample rows
bench --site demo-theme.i-erpx.co execute erpx_new_custom_theme.api.report_tools.probe_report \
  --kwargs "{'name': 'Perubahan Dana Zakat', 'filters': {'company': 'Ibantu', 'fund': 'zakat'}}"
```

`bench execute --kwargs` uses plain `eval()` with `frappe` in scope → **Python dict syntax,
not JSON**. After changing CSS the browser needs a hard refresh (Ctrl+Shift+R).

## 6. Figma

File `VsY9EnwjV3IlDdmkf8YX1e` (ERPx):
- node `925-986` → Laporan Perubahan Dana **Infak & Sedekah** - PSAK 109
- node `925-2110` → Laporan Perubahan Dana **Zakat** - PSAK 109

Always read `skill://figma/figma-design-to-code/SKILL.md` first and pass
`skillNames: "resource:figma-design-to-code"` to `get_design_context`. The returned
screenshot is visible in context — use it as the visual target. Exact design strings and
node-by-node anatomy: `references/figma-design-notes.md`.

## 7. Known deviations (deliberate, do not "fix" silently)

- No "MATCH ✓ (Tie-Out …)" pill on the closing row: we have no independent control value;
  our closing is derived from the same equity movement, so the pill would be a tautology.
  The closing row already shows the equity account code in the `kode` column.
- "Integrasi SIMBA BAZNAS" card shows "Belum dikonfigurasi" — no real integration exists.
- "Kantor Cabang" maps to Cost Center (there is no Branch doctype in use).
- Prod's Zakat doc is still the old v5 shape (Description / Amount / Previous Year /
  Difference); migration is pending. See `references/prod-migration.md`.
