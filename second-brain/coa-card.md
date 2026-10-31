# COA Card (`coa_card_view.bundle.js`)

- Class `COACardView` (`erpnext.coa.CardView`), mode category + tree inline.
- Full English + `__()` (lihat `translations.md`).
- Helper global `format_currency(val, currency)` ditambahkan (dulu dipanggil
  di `renderNode` tapi tak terdefinisi → tree mode throw).
- **Semua angka live** dari `get_coa_tree`: count baris, badge total, grup,
  bar progres. Satu-satunya hardcode (`classes || 4`) sudah dicabut.
  Statis hanya nama klasifikasi + warna dot (label, bukan angka).
- Tombol `Open Tree View` = navigasi `frappe.set_route('Tree','Account')`
  (`/app/account/view/tree`), sama seperti ikon panah. Mode tree inline kini
  tak terpakai (`toggleViewMode` dibiarkan). `coa_card_view2.js` = duplikat mati.
