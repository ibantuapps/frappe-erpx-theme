# Workspace KPI Cards (Home)

4 kartu di Workspace Home, dirender via **Custom HTML Block** (isi block ada di
database, bukan di repo). Snippet siap paste: `custom-block-snippets.md`.

| Card | Class JS | API |
|---|---|---|
| Total Cash & Bank / All Funds | `KPICard` (`erpnext.kpi` + `window.KPICard`) | `kpi.get_kpi_cash_bank` |
| Fund Receipts (This Month) | `KPICardZISWAF` | `kpi.get_kpi_ziswaf` (+breakdown zakat/infaq/waqf %) |
| Mustahik Distribution (This Month) | `KPICardMUSTAHIK` | `kpi.get_kpi_mustahik` |
| Latest Transaction Entries | `AuditTrailBlock` (auto-refresh 30 dtk) | `kpi.get_audit_trail` (limit 10) |

## Mekanisme mount

- Bundle JS hanya **definisi class**; inisiasi via snippet block:
  `root_element.querySelector('.kpi-card-root')` → `new K({container, data})`.
- Snippet **tidak** mengirim `labelLines` → label dipakai dari response API
  (`api/kpi.py`); default di bundle JS hanya cadangan, karena `loadData()`
  menimpa `this.data.labelLines`.
- Retry 100 ms × maks 50x + `console.warn` bila gagal (dulu infinite tanpa log).
- Snippet ZISWAF lama pakai `if (root_element && ...)` tanpa `typeof` guard →
  `ReferenceError` permanen. Sudah diperbaiki di snippet koreksi.

## CSS (`public/css/kpi_card.bundle.css`)

- File ini pernah **tertimpa isi `.pe-kpi-*`** sehingga `.kpi-card` tanpa style.
  Sudah ditulis ulang: `.kpi-card` + `.kpi-audit` + tetap pertahankan `.pe-kpi-*`.
- Variabel CSS di scope `.kpi-card`/`.kpi-audit` (bukan `:root`) agar jalan di
  shadow DOM (pola sama `coa_card_view.bundle.css`).

## Flicker-fix ikon gede saat refresh

Penyebab: SVG tanpa width/height + `render()` sebelum `injectStyles()` +
`?v=timestamp` tiap load (download ulang tiap refresh).
Perbaikan di 4 bundle: SVG dikunci (`width/height` + inline style),
`injectCriticalCss()` (style mini sinkron: ikon 20px, badge 36px, header flex),
urutan inject→render, URL CSS dipakai apa adanya (ikut cache browser).

## Layout seragam

- 3 kartu KPI: kerangka identik header / value / footer trend.
  ZISWAF punya baris ekstra breakdown (datanya memang hanya dia yang punya).
- `.kpi-card`: flex column, `min-height: 172px`, `height: 100%`,
  footer `margin-top: auto` → 3 kartu sama tinggi, footer sejajar.
- Critical CSS inline di 3 bundle disamakan (172px + flex + footer pin).

## Perubahan Audit block

- Teks `Last synced: ...` dihapus dari header (fungsi `getTimeAgo` dibiarkan).
- `View All Logs` → `href="/app/payment-entry"` (dulu `/app/general-ledger`).
- Isi: maks 10 voucher unik terakhir (Journal + Payment Entry), urut
  `posting_date DESC`. Nominal/alokasi = baris GL pertama voucher itu.
