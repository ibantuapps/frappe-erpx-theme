# Ops Checklist

## Kapan build

- Ubah JS/CSS → `bench build --app erpx_new_custom_theme` + clear-cache +
  hard refresh (Ctrl+Shift+R). Jangan edit `public/dist/` manual.
- Ubah Python (hooks/`boot_session`/API) → **wajib restart proses web**, lihat
  "Reload Python" di bawah. `clear-cache` saja **tidak** memuat ulang modul.

## Perintah (minta "iya" owner dulu)

```bash
cd ~/frappe-bench
bench build --app erpx_new_custom_theme
bench --site [site] clear-cache
```

## Reload Python (jebakan gunicorn `--preload`)

Site di-serve supervisord (`/etc/supervisor/conf.d/frappe-bench.conf`):
`[program:frappe-bench-frappe-web]` → `gunicorn ... frappe.app:application
--preload`, `autorestart=true`, user `demoierpx`. Akibatnya:

| Tindakan | Efek |
|---|---|
| `bench build` + `clear-cache` | hanya JS/CSS + cache dokumen |
| `kill -HUP <master>` | worker diganti, **master tidak re-exec** → modul Python lama tetap dipakai ✗ |
| `kill -TERM <master>` | master mati → supervisord menyalakan ulang (±1 detik) → modul baru ✓ |
| `sudo supervisorctl restart frappe-bench-frappe-web` | paling rapi (butuh sudo) |
| `bench restart` | butuh sudo; di mesin ini gagal non-interaktif |

Cari PID master gunicorn (induknya supervisord, PID 858; worker bukan):

```bash
ps -eo pid,ppid,cmd | awk '$2==858 && /frappe.app:application/ {print $1}'
```

Bukti berhasil: `tail -n 5 logs/web.error.log` → "Starting gunicorn" dengan
timestamp baru. Jangan sentuh `frappe-schedule` (tidak punya `autorestart`).

## Konfigurasi per company (jangan hardcode per negara)

- Cap hak amil: field Company `custom_amil_cap_zakat` /
  `custom_amil_cap_non_zakat` (patch
  `patches/add_company_amil_cap_fields.py`, ikut `bench migrate`). Dibaca sekali
  per sesi oleh `boot_session` → `frappe.boot.erpx_report_config` (hanya company
  yang boleh dibaca user). Kosong → fallback 12,5% / 20%.
- Karena field itu baru ada setelah migrate, `get_amil_caps`/`boot_session`
  **harus defensif** (`get_meta().has_field()`, try/except): boot hook yang
  melempar error akan merusak seluruh desk, bukan cuma satu laporan.
- Label kartu KPI Workspace datang dari **API** (`api/kpi.py`, `labelLines`),
  bukan dari default bundle JS — `loadData()` menimpanya. Ubah dua-duanya.

## Kontrak kolom report (Infak, Zakat, Arus Kas)

- Kolom = kontrak **prod**: `keterangan` · `jumlah` · `jumlah_perbandingan` ·
  `selisih` (label bilingual dari `LBL_ALL`, sumber Inggris di `_()`). Kolom khas
  Figma (Terikat/Tidak Terikat, Zakat/Infak/Amil/Non-Halal) **diganti**, bukan
  ditambah; kode COA tetap tampil sebagai pill di kolom terakhir.
- Periode pembanding selalu dihitung (tahun fiskal terakhir sebelum `from_date`,
  fallback −1 tahun) dan selisih selalu tampil. `hide_zero` menyembunyikan baris
  hanya bila nol di **kedua** periode.
- Uang & bahasa ikut company, bukan konstanta: ambil `currency` dari baris report
  (`row.currency` → `_ARUS_CUR` / `_inf_cur_set`) lalu
  `format_number(n, get_number_format(cur), 0)`; label dari filter `language` →
  `Company.country`. Tidak ada `Rp`, `id-ID`, atau merek bank di kode/JS.
- Kas/bank: andalkan `Account.account_type` (`Cash`/`Bank`), kata kunci generik
  (`kas, cash, bank, giro, deposito, tabungan`) hanya sebagai cadangan. Akun
  aneh yang muncul = `account_type` salah di COA, bukan bug report.

## Matriks tes

- Workspace Home: 4 kartu render + angka masuk akal + tak ada warn console.
- List Payment Entry: KPI langsung muncul tanpa refresh; pilar klik tiap item
  (URL 1 filter); user restricted vs superadmin (angka sesuai company).
- List Journal Entry: 4 kartu langsung muncul.
- COA card: counts = COA aktif; tombol → `/app/account/view/tree`.

## Gejala umum

| Gejala | Penyebab umum |
|---|---|
| Kartu kosong | Custom Block terhapus / class JS belum load / company null |
| Ikon gede sekilas | CSS belum rebuild (timestamp/cache) |
| URL filter numpuk | Regresi kendaraan filter (lihat `listview-injectors.md`) |
| `Rp 0` semua | company tak ter-resolve /GL kosong |
| `ValueError unsupported format` | `%` literal di `db.sql` → kirim via params |
| Laporan blank saat diklik dari kartu Workspace | baris Workspace Link punya `is_query_report = 0` (dianggap Report Builder) → set 1 + kosongkan `report_ref_doctype` |
| Perubahan Python tak berefek | `kill -HUP` tidak cukup → lihat "Reload Python" |
| Ubah JS/CSS tak terlihat | belum `bench build` + `clear-cache` + hard refresh |
| Report doc hilang/berbeda antar-site | Report custom hidup di DB (tanpa folder `report/`), `bench migrate` tidak membawanya → `api/report_tools.duplicate_report` |
| Cap amil salah | isi field Company `custom_amil_cap_*` (kosong = fallback 12,5% / 20%) |
| Akun non-kas muncul di rincian Kas & Bank | `Account.account_type` salah di COA (mis. akun uang muka di-tag `Bank`) |
| Format uang beda antar company/negara | masih ada `Rp`/`id-ID` hardcode → ambil dari `row.currency` (`_ARUS_CUR`/`_inf_cur_set`) |
| Bahasa baris ≠ bahasa chrome | filter `language` tak diteruskan; JS harus resolusi filter → `Company.country` seperti script |
