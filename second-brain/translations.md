# Konvensi Translate (English-first)

Source string wajib English agar terdeteksi Frappe Translate; Indonesia via
Translation doctype / `translations/id.po` (folder po belum ada — next step).

## Aturan

- Python: `from frappe import _` lalu `_("English Source")`.
- JS: `__("English Source")` langsung (global desk). Placeholder:
  `__("{0} seconds ago").replace("{0}", n)`.
- CSS `text-transform: uppercase` menangani kapitalisasi label kartu.

## Yang sudah dikonversi

- `api/kpi.py`: semua `labelLines`/`trendLabel`/label audit/`Company not set`.
  Mapping: Total Cash & Bank, ZISWAF, Total Receivables/Payables,
  ZISWAF Receipts (This Month), Mustahik Distribution (This Month),
  vs last month, Payment Entry (Incoming), Journal Entry (Transfer),
  Disbursement (Outgoing).
- 4 bundle KPI + audit: default label, breakdown Zakat/Infaq/Waqf, header tabel
  audit (Ref No/Voucher, Transaction Type, Description/Donor/Beneficiary,
  Amount, Fund Allocation, Status), waktu (Just now, {0} seconds/minutes/hours
  ago), Approved.
- `payment_entry_list.bundle.js` + `journal_entry_list.bundle.js`: semua label.
- `coa_card_view.bundle.js`: seluruh UI (Loading, Search code or account name,
  Open Tree View/Back to Summary, Add Account, COA Status, kategori 1-5,
  Registered Accounts, No accounts match your search, Debit/Credit, Inactive,
  Collapse/Expand, View General Ledger, Edit/Add child/Activate/Deactivate,
  Account deactivated/activated). Komen kode boleh tetap Indonesia.
