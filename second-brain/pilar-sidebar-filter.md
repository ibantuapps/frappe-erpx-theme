# Widget Filter Pilar PSAK 109 (Payment Entry List)

Card sidebar di bawah filter standar: header `PSAK 109 Fund Pillars` + badge
`Akad`; 5 item (All/Zakat/Infak/Amil/Wakaf) dengan dot warna + pill count;
footer koneksi BSI & Muamalat.

## Desain (basis COA, bukan remarks)

- `PILAR_ACCOUNT_KEYWORDS` (`kpi.py`): zakat: zakat/fitrah/maal,
  infak: infak/infaq/sedekah, amil: amil, wakaf: wakaf/nazhir/nazir.
- `_get_pilar_accounts(company)`: akun daun COA yang namanya cocok keyword.
- Entry pilar = `paid_from IN akun OR paid_to IN akun` (dana bisa di dua sisi
  tergantung arah Receive/Pay), docstatus=1.
- `get_pilar_counts` → `{all, zakat, infak, amil, wakaf}`.
- `get_pilar_names(pilar)` → `{names (max 1000 terbaru), total, capped}`.

## Kendaraan filter: SATU `name in [...]`

`filter_area` hanya AND → OR antar-field tak mungkin. Jadi backend yang
mengerjakan OR, frontend pasang satu filter `name in [names]`.
Stacking mustahil by design. `All`/buka list = sapu filter widget.

## Aturan main

- Pilar aktif di memori (`listview._pilar_key`); filter `name in` tak membawa
  info pilar.
- Pilar tanpa akun/entri → msgprint `No fund accounts or entries...`, balik All.
- `total > 1000` → alert orange `Showing first 1000 of N` (badge = total real).
- Filter `name in` manual ikut tersapu saat pilar diklik (kendaraan sama).
- Versi remarks lama: hanya disapu sekali sebagai migrasi (lihat git history).

## File

- JS digabung ke `payment_entry_list.bundle.js` (1 file per DocType di hooks).
- CSS: `public/css/pe_pilar_filter.bundle.css` (terdaftar `app_include_css`).
