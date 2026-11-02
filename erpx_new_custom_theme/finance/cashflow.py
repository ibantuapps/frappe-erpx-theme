"""Cash Flow (direct method) - fixed statement lines like a statutory report.

Cash movements are taken from the cash/bank accounts and classified per voucher
using the counterpart lines. The line items follow the usual BAZNAS/LAZ layout
(Zakat, Infak/Sedekah, Amil receipts and distributions) so the report looks
complete even when a period only has a few transactions.
"""

import frappe
from frappe import _
from frappe.utils import flt

from erpx_new_custom_theme.fund.engine import (
	_accounts,
	_balances_before,
	_balances_to,
	_period,
	_prev_period,
	_lang,
)

LABELS = {
	"id": {
		"code": "Kode & Nama Akun",
		"amount": "Jumlah",
		"prev": "Jumlah Tahun Sebelumnya",
		"diff": "Selisih",
		"operating": "ARUS KAS DARI AKTIVITAS OPERASI",
		"receipts": "Penerimaan",
		"payments": "Penyaluran dan Beban",
		"receipt_zakat": "Penerimaan Dana Zakat",
		"receipt_infak": "Penerimaan Dana Infak/Sedekah",
		"receipt_amil": "Penerimaan Dana Amil",
		"receipt_other": "Penerimaan Lainnya",
		"total_receipts": "Jumlah Penerimaan",
		"pay_zakat": "Penyaluran Dana Zakat",
		"pay_infak": "Penyaluran Dana Infak/Sedekah",
		"pay_amil": "Beban Operasional Amil",
		"pay_other": "Penyaluran dan Beban Lainnya",
		"total_payments": "Jumlah Penyaluran dan Beban",
		"oper_other": "Mutasi Operasi Lainnya",
		"total_operating": "Kas Bersih dari Aktivitas Operasi",
		"investing": "ARUS KAS DARI AKTIVITAS INVESTASI",
		"investing_line": "Perolehan/(Pelepasan) Aset Tetap",
		"total_investing": "Kas Bersih dari Aktivitas Investasi",
		"financing": "ARUS KAS DARI AKTIVITAS PENDANAAN",
		"financing_line": "Mutasi Liabilitas/Pembiayaan",
		"financing_equity": "Penerimaan Saldo Dana",
		"total_financing": "Kas Bersih dari Aktivitas Pendanaan",
		"total_flow": "KENAIKAN (PENURUNAN) BERSIH KAS DAN SETARA KAS",
		"opening": "Kas dan Setara Kas Awal Periode",
		"closing": "KAS DAN SETARA KAS AKHIR PERIODE",
		"empty": "Tidak ada akun kas/bank untuk company ini.",
	},
	"en": {
		"code": "Account Code & Name",
		"amount": "Amount",
		"prev": "Previous Year Amount",
		"diff": "Difference",
		"operating": "CASH FLOWS FROM OPERATING ACTIVITIES",
		"receipts": "Receipts",
		"payments": "Distributions and Expenses",
		"receipt_zakat": "Zakat Fund Receipts",
		"receipt_infak": "Infak/Sedekah Fund Receipts",
		"receipt_amil": "Amil Fund Receipts",
		"receipt_other": "Other Receipts",
		"total_receipts": "Total Receipts",
		"pay_zakat": "Zakat Fund Distributions",
		"pay_infak": "Infak/Sedekah Fund Distributions",
		"pay_amil": "Amil Operating Expenses",
		"pay_other": "Other Distributions and Expenses",
		"total_payments": "Total Distributions and Expenses",
		"oper_other": "Other Operating Movements",
		"total_operating": "Net Cash from Operating Activities",
		"investing": "CASH FLOWS FROM INVESTING ACTIVITIES",
		"investing_line": "Acquisition/(Disposal) of Fixed Assets",
		"total_investing": "Net Cash from Investing Activities",
		"financing": "CASH FLOWS FROM FINANCING ACTIVITIES",
		"financing_line": "Movements in Liabilities/Financing",
		"financing_equity": "Fund Balance Received",
		"total_financing": "Net Cash from Financing Activities",
		"total_flow": "NET INCREASE (DECREASE) IN CASH AND CASH EQUIVALENTS",
		"opening": "Cash and Cash Equivalents at Beginning of Period",
		"closing": "CASH AND CASH EQUIVALENTS AT END OF PERIOD",
		"empty": "No cash/bank account for this company.",
	},
}

FUND_KEYWORDS = (
	("zakat", ("zakat", "zakah", "fitrah")),
	("infak", ("infak", "infaq", "sedekah", "sadaqah", "sodaqoh")),
	("amil", ("amil",)),
)

INVESTING_HINTS = (
	"aset tetap",
	"inventaris",
	"kendaraan",
	"bangunan",
	"peralatan",
	"tanah",
	"software",
	"fixed asset",
	"property",
	"equipment",
)


def _labels():
	lang = _lang()
	return dict(LABELS[lang])


def _cash_accounts(accounts):
	cash = []
	for account in accounts:
		if account["is_group"]:
			continue
		account_type = (account.get("account_type") or "").lower()
		name = (account.get("account_name") or "").lower()
		if account_type in ("cash", "bank") or "kas" in name or "bank" in name:
			cash.append(account)
	return cash


def _chain(account, by_name):
	parts = []
	cur = account
	seen = set()
	while cur and cur["name"] not in seen:
		seen.add(cur["name"])
		parts.append((cur.get("account_name") or cur["name"]).lower())
		cur = by_name.get(cur.get("parent_account"))
	return " ".join(parts)


def _fund_of(text):
	for key, keywords in FUND_KEYWORDS:
		if any(keyword in text for keyword in keywords):
			return key
	return "other"


def _gl_rows(company, from_date, to_date):
	return frappe.db.sql(
		"""
		SELECT voucher_type, voucher_no, account, debit, credit
		FROM `tabGL Entry`
		WHERE company = %(company)s AND is_cancelled = 0 AND docstatus = 1
		  AND posting_date BETWEEN %(from_date)s AND %(to_date)s
		""",
		{"company": company, "from_date": from_date, "to_date": to_date},
		as_dict=True,
	)


def _is_fixed_asset(account):
	name = (account.get("account_name") or "").lower()
	if (account.get("account_type") or "").lower() in ("fixed asset", "capital work in progress"):
		return True
	return any(hint in name for hint in INVESTING_HINTS)


def _flow(company, accounts, from_date, to_date):
	cash = _cash_accounts(accounts)
	cash_names = {a["name"] for a in cash}
	by_name = {a["name"]: a for a in accounts}

	buckets = {
		"receipt_zakat": 0.0,
		"receipt_infak": 0.0,
		"receipt_amil": 0.0,
		"receipt_other": 0.0,
		"pay_zakat": 0.0,
		"pay_infak": 0.0,
		"pay_amil": 0.0,
		"pay_other": 0.0,
		"oper_other": 0.0,
		"investing": 0.0,
		"financing_line": 0.0,
		"financing_equity": 0.0,
	}

	vouchers = {}
	for row in _gl_rows(company, from_date, to_date):
		vouchers.setdefault((row.voucher_type, row.voucher_no), []).append(row)

	for lines in vouchers.values():
		net = flt(sum(flt(l.debit) - flt(l.credit) for l in lines if l.account in cash_names))
		if abs(net) < 0.005:
			continue

		counterpart = [by_name.get(l.account) for l in lines if l.account not in cash_names]
		counterpart = [c for c in counterpart if c]
		roots = {c["root_type"] for c in counterpart}
		text = " ".join(_chain(c, by_name) for c in counterpart)
		fund = _fund_of(text)
		fund_key = "amil" if fund == "amil" else ("zakat" if fund == "zakat" else ("infak" if fund == "infak" else "other"))

		if roots & {"Liability"}:
			buckets["financing_line"] += net
		elif "Equity" in roots:
			buckets["financing_equity"] += net
		elif any(_is_fixed_asset(c) for c in counterpart if c["root_type"] == "Asset"):
			buckets["investing"] += net
		elif "Income" in roots and "Expense" not in roots:
			buckets["receipt_" + fund_key] += net
		elif "Expense" in roots and "Income" not in roots:
			buckets["pay_" + fund_key] += net
		else:
			buckets["oper_other"] += net

	return buckets, cash


def _cash_balance(company, cash, date, inclusive=True):
	if not cash:
		return 0.0
	source = _balances_to(company, cash, date) if inclusive else _balances_before(company, cash, date)
	return -flt(sum(source.values()))


def run(filters):
	filters = frappe._dict(filters or {})
	company = filters.get("company")
	if not company:
		frappe.throw(_("Please select a Company"))

	labels = _labels()
	currency = frappe.db.get_value("Company", company, "default_currency") or "IDR"
	period_type = (filters.get("period_type") or "Bulanan").strip().lower()
	compare = period_type.startswith("fiscal")

	from_date, to_date = _period(filters)
	accounts = _accounts(company)
	cash = _cash_accounts(accounts)

	if not cash:
		return [_columns(labels, compare), [_row(_(labels["empty"]), 0, "empty")]]

	buckets, _ = _flow(company, accounts, from_date, to_date)
	opening = _cash_balance(company, cash, from_date, inclusive=False)
	closing = _cash_balance(company, cash, to_date)

	prev = None
	prev_opening = prev_closing = None
	if compare:
		prev_from, prev_to = _prev_period(from_date)
		prev, _ = _flow(company, accounts, prev_from, prev_to)
		prev_opening = _cash_balance(company, cash, prev_from, inclusive=False)
		prev_closing = _cash_balance(company, cash, prev_to)

	def val(key):
		return flt(buckets.get(key, 0))

	def val_prev(key):
		return flt((prev or {}).get(key, 0)) if compare else None

	total_receipts = val("receipt_zakat") + val("receipt_infak") + val("receipt_amil") + val("receipt_other")
	total_payments = val("pay_zakat") + val("pay_infak") + val("pay_amil") + val("pay_other")
	operating = total_receipts + total_payments + val("oper_other")
	investing = val("investing")
	financing = val("financing_line") + val("financing_equity")
	total_flow = operating + investing + financing
	closing_calc = opening + total_flow

	if compare:
		total_receipts_p = sum(val_prev(k) for k in ("receipt_zakat", "receipt_infak", "receipt_amil", "receipt_other"))
		total_payments_p = sum(val_prev(k) for k in ("pay_zakat", "pay_infak", "pay_amil", "pay_other"))
		operating_p = total_receipts_p + total_payments_p + val_prev("oper_other")
		investing_p = val_prev("investing")
		financing_p = val_prev("financing_line") + val_prev("financing_equity")
		total_flow_p = operating_p + investing_p + financing_p
	else:
		total_receipts_p = total_payments_p = operating_p = investing_p = financing_p = total_flow_p = None

	rows = []
	rows.append(_row(labels["operating"], 0, "section"))
	rows.append(_row(labels["receipts"], 0, "subheader", 0, 1))
	rows.append(_row(labels["receipt_zakat"], val("receipt_zakat"), "account", 1, 0, val_prev("receipt_zakat")))
	rows.append(_row(labels["receipt_infak"], val("receipt_infak"), "account", 1, 0, val_prev("receipt_infak")))
	rows.append(_row(labels["receipt_amil"], val("receipt_amil"), "account", 1, 0, val_prev("receipt_amil")))
	rows.append(_row(labels["receipt_other"], val("receipt_other"), "account", 1, 0, val_prev("receipt_other")))
	rows.append(_row(labels["total_receipts"], total_receipts, "subtotal", 0, 1, total_receipts_p))

	rows.append(_row(labels["payments"], 0, "subheader", 0, 1))
	rows.append(_row(labels["pay_zakat"], val("pay_zakat"), "account", 1, 0, val_prev("pay_zakat")))
	rows.append(_row(labels["pay_infak"], val("pay_infak"), "account", 1, 0, val_prev("pay_infak")))
	rows.append(_row(labels["pay_amil"], val("pay_amil"), "account", 1, 0, val_prev("pay_amil")))
	rows.append(_row(labels["pay_other"], val("pay_other"), "account", 1, 0, val_prev("pay_other")))
	rows.append(_row(labels["total_payments"], total_payments, "subtotal", 0, 1, total_payments_p))

	rows.append(_row(labels["oper_other"], val("oper_other"), "account", 1, 0, val_prev("oper_other")))
	rows.append(_row(labels["total_operating"], operating, "total_operating", 0, 1, operating_p))
	rows.append(_row("", 0, "blank"))

	rows.append(_row(labels["investing"], 0, "section"))
	rows.append(_row(labels["investing_line"], investing, "account", 1, 0, investing_p))
	rows.append(_row(labels["total_investing"], investing, "total_investing", 0, 1, investing_p))
	rows.append(_row("", 0, "blank"))

	rows.append(_row(labels["financing"], 0, "section"))
	rows.append(_row(labels["financing_line"], val("financing_line"), "account", 1, 0, val_prev("financing_line")))
	rows.append(_row(labels["financing_equity"], val("financing_equity"), "account", 1, 0, val_prev("financing_equity")))
	rows.append(_row(labels["total_financing"], financing, "total_financing", 0, 1, financing_p))
	rows.append(_row("", 0, "blank"))

	rows.append(_row(labels["total_flow"], total_flow, "total_flow", 0, 1, total_flow_p))
	rows.append(_row("", 0, "blank"))
	rows.append(_row(labels["opening"], opening, "opening", 0, 0, prev_opening))
	rows.append(_row(labels["closing"], closing if abs(closing - closing_calc) < 0.01 else closing_calc, "closing", 0, 1, prev_closing))

	for row in rows:
		row["currency"] = currency

	return [_columns(labels, compare), rows]


def _row(label, value, row_type="account", indent=0, bold=0, prev=None):
	value = flt(value)
	row = {
		"keterangan": label,
		"nilai": value,
		"indent": indent,
		"bold": bold,
		"row_type": row_type,
	}
	if prev is not None:
		row["perbandingan"] = flt(prev)
		row["selisih"] = value - flt(prev)
	return row


def _columns(labels, compare):
	columns = [
		{"fieldname": "keterangan", "label": labels["code"], "fieldtype": "Data", "width": 640},
		{"fieldname": "nilai", "label": labels["amount"], "fieldtype": "Currency", "options": "currency", "width": 200},
	]
	if compare:
		columns.extend(
			[
				{"fieldname": "perbandingan", "label": labels["prev"], "fieldtype": "Currency", "options": "currency", "width": 200},
				{"fieldname": "selisih", "label": labels["diff"], "fieldtype": "Currency", "options": "currency", "width": 180},
			]
		)
	return columns
