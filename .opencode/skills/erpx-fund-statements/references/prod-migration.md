# Prod migration plan (theme → prod)

## The two sites

| | Theme | Prod |
| --- | --- | --- |
| Site | `demo-theme.i-erpx.co` | (prod host, `erpnext-prod` MCP) |
| Company | `Ibantu` (abbr `I`, IDR, Indonesia) | `Local Zakora` (abbr `LZ`) |
| COA | generic trading chart, **zero fund accounts** | real ZISWAF chart, 2-digit group codes |
| Fund reports | `Perubahan Dana Infak dan Sedekah`, `Perubahan Dana Zakat` (new UI) | 16 custom reports, all old UI |
| Custom app installed | `erpx_new_custom_theme` | **not yet** |
| Data | empty for fund purposes | the real GL |

Prod reports must never be edited in place until the theme versions are verified against
prod numbers.

## Prod custom report inventory (16)

- `Perubahan Dana Infak dan Sedekah`, `... Dinamis`, `... v3`
- `Perubahan Dana Zakat`, `... Dinamis`, `... v3`
- `Perubahan Dana Amil`, `... Dinamis`, `... v3`
- `Neraca`, `Neracaa`, `Neraca Dinamis`, `Neraca v3`
- `Arus Kas`, `Arus Kas Dinamis`, `Arus Kas` (another variant), `Arus Kas v3`

Note the `Neracaa` typo — do not "fix" it blindly, other things may reference that name.

The prod `Perubahan Dana Zakat` doc: `report_script` ~23.6 KB, `javascript` ~16.0 KB,
columns `Description / Amount / Previous Year / Difference`, **no filters stored on the doc**,
roles include `Auditor`. Its logic (already re-implemented generically in the theme script):

- mode `date_range | fiscal_year`, flag `show_comparison`
- penerimaan = `credit - debit` on accounts whose number starts with `41`
- penyaluran = `debit - credit` on `51`, **displayed negative**
- surplus = penerimaan − penyaluran
- opening = the equity balance before `from_date`
- a second equity account named for "Koreksi Saldo Awal" (name containing
  `sebelumnya|periode|entitas|penambahan`, fallback number `3103` / `311005`)
- closing = opening total + surplus

The theme's generic profile for zakat (`41` / `51` / `31`) was validated against exactly
this, so the arithmetic should line up. What will differ is presentation and the extra
controls (KPI cards, letterhead, compliance cards) — those are additive.

## Prod COA reference

Income `41` Zakat, `42` Infak/Sedekah, `43` Amil, `44` Hibah, `45` APBN, `46` Jasa Giro,
`47` Qurban, `48` Wakaf, `49` CSR. Expense `51`–`59` mirrored. Equity `31`–`39`; prod has a
single equity account `3201 Saldo Dana Infak/Sedekah`. There is **no** `custom_jenis_dana`
custom field on Account, and no Branch doctype in use (use Cost Center).

Because the theme matches on the **exact** 2-digit `account_number` (falling back to
`name LIKE "41 %"`), prod's chart works as-is. Do not "upgrade" the matcher to a
prefix-`LIKE` on `account_number` — that is what would drag unrelated accounts in.

## Steps

1. Ship the app: install `erpx_new_custom_theme` on prod, `bench build --app
   erpx_new_custom_theme`, `bench --site <prod> clear-cache`.
2. Copy the report docs (repo helper, not `bench migrate` — the reports live only in a site
   DB):
   `report_tools.duplicate_report` from the theme's `Perubahan Dana Infak dan Sedekah` to
   prod, then re-point the `fund` defaults. Alternatively create them on prod and paste the
   `report_script` / `javascript` from the theme docs after the app is installed.
3. Verify each fund:
   `report_tools.probe_report(name=..., filters={'company': 'Local Zakora', 'fund': ...})`.
4. Reconcile against the existing prod reports: compare penerimaan, penyaluran, surplus,
   opening and closing for the same period. Differences must be explained before anything
   is retired.
5. Only then replace/disable the old `... v3` / `Dinamis` variants.

## Open questions to resolve on prod

- Do prod's fund GL entries carry a `cost_center` on the fund accounts? If so, the
  "Kantor Cabang" filter should map to Cost Center and be enabled by default on prod but
  not necessarily on the theme.
- Is there an independent control figure for the closing equity balance (a bank
  reconciliation or a budget figure) that would make the Figma "MATCH ✓ (Tie-Out)" pill
  meaningful? Until there is one, it stays unimplemented (see SKILL.md §7).
- Which exact period conventions the finance team wants by default (monthly `periode` vs
  explicit `from_date`/`to_date`).
- Whether the remaining `Neraca` / `Arus Kas` reports also need to move to the new
  `.infak-*` design language. The theme's `Arus Kas` report still uses the old style.

## Current status of this migration

Not started. The theme work is complete and verified for structure (both reports run with
zero errors, correct section headers, correct profiles). Numeric parity with prod can only
be confirmed after installing on prod — the theme site has no fund data at all.
