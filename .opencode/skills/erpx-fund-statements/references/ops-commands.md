# Ops commands, patching, verification

## Golden rule

Explain the exact commands, then **wait for an explicit "iya"**. No exceptions — not even
for "just a quick clear-cache". Reads with the `read`/`grep`/`glob` tools are always fine.

## Bench commands

Run from `/home/demoierpx/frappe-bench`.

```bash
# rebuild the app's CSS/JS bundles (required after any public/css|js change)
bench build --app erpx_new_custom_theme

# clear all caches on the theme site (required after bundle or doc changes)
bench --site demo-theme.i-erpx.co clear-cache
```

After a rebuild the dist hash changes (e.g. `infak_report.bundle.KOCPEOWS.css`); confirm via
`/home/demoierpx/frappe-bench/sites/assets/assets.json`:

```bash
grep infak_report.bundle.css /home/demoierpx/frappe-bench/sites/assets/assets.json
```

## Report doc helpers (`api/report_tools.py`, CLI-only)

`report_tools.py` is intentionally **not** `@frappe.whitelist()` — it is called only via
`bench execute` and does not create a web API surface.

| Function | Purpose |
| --- | --- |
| `duplicate_report(src, dst, defaults=None, replace_in_javascript=None, roles_add=None)` | Insert a copy of a `Report` doc under a new `report_name`, with optional filter defaults, JS string replacements, and extra roles. Returns the new name. |
| `probe_report(name, filters=None, sample=6)` | Run the report in-process and return `{report, columns, rows, tipe_counts, sample}` so you can verify without opening a browser. |

```bash
bench --site demo-theme.i-erpx.co execute erpx_new_custom_theme.api.report_tools.duplicate_report \
  --kwargs "{'src': 'Perubahan Dana Infak dan Sedekah', 'dst': 'Perubahan Dana Zakat', 'defaults': {'fund': 'zakat'}, 'roles_add': ['Auditor']}"

bench --site demo-theme.i-erpx.co execute erpx_new_custom_theme.api.report_tools.probe_report \
  --kwargs "{'name': 'Perubahan Dana Zakat', 'filters': {'company': 'Ibantu', 'fund': 'zakat'}}"
```

Why a helper instead of `frappe.copy_doc` by hand:

- `Report.autoname = field:report_name` means the doc **name is the report name**, so a copy
  must overwrite `report_name` before insert or it collides with the source (DuplicateEntryError).
- Script Reports must keep `report_type = "Script Report"`, `ref_doctype = "GL Entry"`,
  `is_standard = "No"`, `module = "Accounts"`, plus their `filters` / `columns` child tables and
  `roles`; a naive copy misses or mis-points some of them.

## `bench execute --kwargs` syntax

- The value is evaluated with Python `eval()` inside `frappe/commands/utils.py`, which does
  `import frappe` first. So use **Python dict literal syntax** (`{'a': 'b'}`, `None`, `True`),
  not JSON. `frappe.*` expressions are available.
- On the command line, wrap the whole thing in double quotes and use single quotes inside, as
  above. Names with spaces are fine inside the quotes.

## Patching a Report doc via MCP (script / JS)

The two fields are large (script ~19 KB, JS ~37 KB) — never fetch them into context
wholesale and never re-write them from scratch. Procedural find/replace:

1. `erpnext_doc_get({doctype:"Report", name:"<report>"})` → take `report_script` and
   `javascript` as single strings.
2. For each `[find, replace]` pair, count occurrences of `find` **before** replacing, and
   assert the expected count (1 for a unique anchor, 2 when the same literal appears in both
   the `id` and `ms` label blocks).
3. Also assert on the number of replacements actually applied — abort if it does not match.
4. Write once: `erpnext_doc_update({doctype:"Report", name:"<report>", data:{report_script: py, javascript: js}})`.
5. Re-read and verify markers (new identifier present, old one gone, brace/paren balance 0,
   tail rows intact).
6. Ask permission and run `probe_report` for a runtime check.

Node/Code Mode caveats:

- `new Function` is blocked in the Code Mode runtime, so JS cannot be compile-checked. Use
  brace/paren/bracket balance counts and marker presence as the proxy, plus the probe.
- The script body is stored with literal `\u2014` escape sequences. Build that search string
  programmatically (`String.fromCharCode(92) + "u2014"`), do not hand-type it — hand-typed
  variants silently fail to match.
- Anchors should avoid leading whitespace (MCP/grep output is trimmed). Search on the token
  itself, e.g. `'frappe.query_reports["Perubahan Dana Zakat"] = {'` or `'"amt": "Total {F} (MTD)"'`.
- Always include the producing context in the anchor when a short string could match more
  than once (e.g. `onload`'s `report.set_filter_value("fund", "zakat");`).

### Expected diff between the two theme docs

Everything is identical except the `javascript`:

| Anchor | Infak doc | Zakat doc |
| --- | --- | --- |
| report key | `frappe.query_reports["Perubahan Dana Infak dan Sedekah"] = {` | `frappe.query_reports["Perubahan Dana Zakat"] = {` |
| filter default | `... default: "infak" ...` | `... default: "zakat" ...` |
| `onload` | `report.set_filter_value("fund", "infak");` | `report.set_filter_value("fund", "zakat");` |

The `report_script` is shared and must stay byte-identical so both funds keep the same
behaviour. Any change made to one must be replayed on the other (that is exactly what the
find/replace list above is for).

## Verification checklist after any change

1. `probe_report` for the touched report: `rows > 0`, the `tipe_counts` still contain
   `section`, `subtotal`, `surplus`, `opening`, `closing`, and the section headers show the
   right COA prefixes.
2. Column labels read correctly, e.g. `Dana Zakat Terikat (Muqayyad)` — **never**
   `Dana Dana Zakat Terikat` (`FUNDTITLE` already contains "Dana").
3. Both theme docs report equal `report_script` length and known `javascript` lengths.
4. If CSS changed: bundle hash moved in `assets.json`, then hard-refresh
   (`Ctrl+Shift+R`) before judging the visuals.

## Diagnosing a blank or weird report in the browser

- All zeros + no account rows on the theme site is **normal**: company `Ibantu` has no fund
  accounts. Use prod (`Local Zakora`) or a seeded test company for realistic numbers.
- If the page shows the stock Frappe filter bar, the `.infak-hide-form` class was not added
  → `_inf_render` did not run, or an exception was thrown earlier in it.
- If a row band colours only the description column, the tone was applied inline instead of
  via the `:has()` rule in §4 of the architecture doc.
- If numbers look right but formatting is stale, it is almost always the bundle cache: rerun
  `bench build` + `clear-cache` and hard-refresh.

## Second-brain docs (human-facing)

`/home/demoierpx/frappe-bench/apps/erpx_new_custom_theme/second-brain/`
— `README.md`, `app-map.md`, `ops-checklist.md`, `translations.md`,
`company-permissions.md`, `workspace-kpi-cards.md`, `coa-card.md`,
`pilar-sidebar-filter.md`, `listview-injectors.md`, `custom-block-snippets.md`.

When behaviour documented here changes, update **both** this skill and the matching
second-brain doc — the skill is what a future agent loads; the second-brain is what the
human reads.
