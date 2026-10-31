# App Map — erpx_new_custom_theme v0.0.1

## Struktur

```
apps/erpx_new_custom_theme/
├── erpx_new_custom_theme/          # package Python (jangan taruh docs di sini)
│   ├── hooks.py                    # registrasi asset + doctype_list_js
│   ├── api/coa.py                  # get_coa_tree, get_account_balance
│   ├── api/kpi.py                  # 8 API: cash_bank, receivables, payables,
│   │                               # ziswaf, mustahik, audit_trail,
│   │                               # payment_entry_summary, pilar_counts/names
│   ├── api/je_kpi.py               # get_journal_entry_summary
│   ├── page/coa_card_view/         # Desk Page coa-card-view (Manager/User)
│   ├── public/js/                  # SOURCE (yang diedit)
│   │   ├── kpi_card.bundle.js              # Total Cash & Bank
│   │   ├── kpi_card_ziswaf.bundle.js       # ZISWAF Receipts
│   │   ├── kpi_card_mustahik.bundle.js    # Mustahik Distribution
│   │   ├── audit_trail_block.bundle.js    # Latest Transaction Entries
│   │   ├── coa_card_view.bundle.js        # Card COA (coa_card_view2.js = mati)
│   │   ├── payment_entry_list.bundle.js   # KPI + filter pilar Payment Entry
│   │   ├── journal_entry_list.bundle.js   # KPI Journal Entry
│   │   └── custom*.js              # iterasi lama, nonaktif (aktif: custom14.js)
│   ├── public/css/
│   │   ├── kpi_card.bundle.css     # .kpi-card + .kpi-audit + .pe-kpi-*
│   │   ├── coa_card_view.bundle.css
│   │   ├── je_kpi.bundle.css       # .je-kpi-*
│   │   ├── pe_pilar_filter.bundle.css  # .pe-pilar-*
│   │   └── custom*.css             # iterasi lama (aktif: custom2.css)
│   └── public/dist/                # HASIL bench build (jangan edit manual)
├── second-brain/                   # folder ini (docs, di luar package)
└── pyproject.toml / README.md
```

## Registrasi hooks.py

- `app_include_css`: custom2, frappe-list-modern, coa_card_view, kpi_card,
  je_kpi, pe_pilar_filter.
- `app_include_js`: custom14, coa_card_view, kpi_card, kpi_card_ziswaf,
  kpi_card_mustahik, audit_trail_block.
- `doctype_list_js` (1 file per DocType):
  - Payment Entry → `public/js/payment_entry_list.bundle.js`
  - Journal Entry → `public/js/journal_entry_list.bundle.js`

## Catatan

- `build.json` ketinggalan zaman (tak mencakup bundle KPI) — build via bench.
- `templates/`, `www/`, `config/` kosong. `patches.txt` kosong.
- File `nano` nyasar di package (abaikan).
