# List View Injectors (Payment & Journal Entry)

## Pola scoped (wajib untuk injector baru)

- Cari container di dalam instance: `listview.page.wrapper` →
  `.layout-main-section`; fallback `listview.$page`. Jangan pakai selector
  global `.first()` (pernah salah sasaran saat navigasi SPA → kartu harus
  refresh manual baru muncul).
- Cek duplikat scoped: `listview.$page.find('.x-container')`.
- Guard `if (!listview || !listview.$page) return`.
- Chain handler lama pakai `var _x_old_onload` (JANGAN `const` top-level:
  file dievaluasi ulang saat navigasi → `already declared` → handler mati).
- Poll fallback bounded (maks 50x @300ms), bukan `setInterval` abadi.

## API FilterList v15 (sumber: `apps/frappe/.../ui/filters/`)

- `filter_list.js` = class FilterList. **Tidak ada** `.get()` maupun
  `.remove(doctype, field)`. Yang ada: `add()`, `get_filters()`,
  `clear_filters()`, `get_filter(fieldname)`, `filter_exists()`.
- `filter.js` = class Filter per baris; hapus via objek `f.remove()`.
- `add(doctype, field, cond, value)` selalu append (dedupe hanya bila identik
  persis) + auto-refresh. `Filter.remove()` hanya cabut DOM (tak refresh).

## Insiden: URL stacking remarks (selesai)

- Gejala: `?remarks=[...zakat]&remarks=[...infak]&remarks=[...amil]`.
- Sebab: kode lama pakai `.get()`/`.remove()` yang tak ada → gagal diam-diam
  di `try/catch` → tiap klik cuma `add`.
- Fix saat itu: baca `get_filters()` toleran bentuk, hapus per objek Filter,
  sapu-sebelum-tambah + dedupe sekali per instance.
- Pelajaran: jangan bungkus API Frappe dalam `try/catch` bisu saat debugging;
  cek eksistensi method dulu dari source bench lokal.
