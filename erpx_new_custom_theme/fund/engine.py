"""Dynamic fund statements (Zakat / Infak / Amil).

The COA is never assumed: every company + fund is described in ``profiles.json``
(optionally overridden per site through ``site_config.json`` -> ``erpx_fund_profiles``).
The engine only walks the configured account subtrees, so companies with different
numbering schemes (4-digit, 6-digit, grouped or not) produce the same statement.
"""

import json
import os

import frappe
from frappe import _
from frappe.utils import flt, get_first_day, get_last_day, getdate

PROFILE_PATH = os.path.join(os.path.dirname(__file__), "profiles.json")

LABELS = {
	"id": {
		"period": "Periode",
		"code": "Kode & Nama Akun",
		"tied": "Dana Terikat",
		"untied": "Dana Tidak Terikat",
		"total": "Total",
		"amount": "Jumlah",
		"prev_amount": "Jumlah Tahun Sebelumnya",
		"diff": "Selisih",
		"income": "A. PENERIMAAN DANA {0} (INFLOWS)",
		"expense": "B. PENYALURAN / PENGGUNAAN DANA {0} (OUTFLOWS)",
		"recon": "C. REKONSILIASI DANA",
		"total_income": "TOTAL PENERIMAAN DANA {0}",
		"total_expense": "TOTAL PENYALURAN / PENGGUNAAN DANA {0}",
		"surplus": "Surplus (Defisit) Dana {0}",
		"opening": "Saldo Awal Dana {0}",
		"other": "Mutasi Dana Lainnya (Ekuitas)",
		"closing": "SALDO AKHIR DANA {0}",
		"empty": "Belum ada profil COA untuk perusahaan ini. Atur di profiles.json.",
		"no_account": "Tidak ada akun yang cocok dengan profil COA.",
	},
	"en": {
		"period": "Period",
		"code": "Account Code & Name",
		"tied": "Tied Fund",
		"untied": "Untied Fund",
		"total": "Total",
		"amount": "Amount",
		"prev_amount": "Previous Year Amount",
		"diff": "Difference",
		"income": "A. {0} FUND RECEIPTS (INFLOWS)",
		"expense": "B. {0} FUND DISTRIBUTIONS / USAGE (OUTFLOWS)",
		"recon": "C. FUND RECONCILIATION",
		"total_income": "TOTAL {0} FUND RECEIPTS",
		"total_expense": "TOTAL {0} FUND DISTRIBUTIONS / USAGE",
		"surplus": "{0} Fund Surplus (Deficit)",
		"opening": "{0} Fund Opening Balance",
		"other": "Other Fund Movements (Equity)",
		"closing": "{0} FUND CLOSING BALANCE",
		"empty": "No COA profile for this company yet. Configure profiles.json.",
		"no_account": "No account matches the COA profile.",
	},
}

FUND_NAME = {
	"zakat": {"id": "ZAKAT", "en": "ZAKAT"},
	"infak": {"id": "INFAK / SEDEKAH", "en": "INFAK / SEDEKAH"},
	"amil": {"id": "AMIL", "en": "AMIL"},
}


def _period(filters):
	"""Return (from_date, to_date) from the period filters.

	Supports monthly (default), fiscal year and custom ranges, so the same
	report works for MTD views and full-year statements.
	"""
	period = (filters.get("period_type") or "Bulanan").strip().lower()

	if period.startswith("fiscal"):
		fy_name = filters.get("fiscal_year")
		if fy_name:
			fy = frappe.db.get_value(
				"Fiscal Year", fy_name, ["year_start_date", "year_end_date"], as_dict=True
			)
			if fy:
				return getdate(fy.year_start_date), getdate(fy.year_end_date)
		today = getdate()
		return getdate(f"{today.year}-01-01"), getdate(f"{today.year}-12-31")

	if period.startswith("custom"):
		from_date = getdate(filters.get("from_date")) if filters.get("from_date") else getdate()
		to_date = getdate(filters.get("to_date")) if filters.get("to_date") else from_date
		return from_date, getdate(to_date)

	# monthly (default)
	anchor = getdate(filters.get("from_date")) if filters.get("from_date") else getdate()
	return getdate(get_first_day(anchor)), getdate(get_last_day(anchor))


def _prev_period(from_date):
	"""Previous fiscal year (or previous year when no FY record exists)."""
	fy = frappe.db.sql(
		"""SELECT year_start_date, year_end_date FROM `tabFiscal Year`
		WHERE year_end_date < %s ORDER BY year_end_date DESC LIMIT 1""",
		from_date,
	)
	if fy:
		return getdate(fy[0][0]), getdate(fy[0][1])
	return getdate(frappe.utils.add_years(from_date, -1)), getdate(frappe.utils.add_years(from_date, -1))


def _lang():
	lang = (frappe.local.lang or "en").split("-")[0]
	return lang if lang in LABELS else "en"


def _labels(fund):
	lang = _lang()
	labels = dict(LABELS[lang])
	for key, value in labels.items():
		if "{0}" in value:
			labels[key] = value.format(FUND_NAME[fund][lang])
	return labels


def get_profiles():
	with open(PROFILE_PATH, encoding="utf-8") as handle:
		profiles = json.load(handle)

	override = frappe.conf.get("erpx_fund_profiles") or {}
	for company, data in override.items():
		profiles.setdefault(company, {})
		profiles[company].setdefault("funds", {}).update(data.get("funds") or {})
	return profiles


def get_profile(company, fund):
	profile = get_profiles().get(company)
	if not profile:
		return None
	return profile.get("funds", {}).get(fund)


def _accounts(company):
	return frappe.get_all(
		"Account",
		filters={"company": company},
		fields=["name", "account_name", "root_type", "is_group", "lft", "rgt", "parent_account"],
		order_by="lft asc",
	)


def _find(accounts, code):
	code = str(code)
	for account in accounts:
		if account["name"] == code or account["name"].startswith(f"{code} - "):
			return account
	return None


def _subtree(accounts, root):
	return [
		a
		for a in accounts
		if a["lft"] >= root["lft"] and a["rgt"] <= root["rgt"]
	]


def _balances(company, accounts, from_date, to_date):
	names = [a["name"] for a in accounts]
	if not names:
		return {}
	rows = frappe.db.sql(
		"""
		SELECT account, SUM(credit - debit)
		FROM `tabGL Entry`
		WHERE company = %(company)s
		  AND is_cancelled = 0
		  AND docstatus = 1
		  AND posting_date BETWEEN %(from_date)s AND %(to_date)s
		  AND account IN %(accounts)s
		GROUP BY account
		""",
		{"company": company, "from_date": from_date, "to_date": to_date, "accounts": tuple(names)},
	)
	return {row[0]: flt(row[1]) for row in rows}


def _balances_before(company, accounts, date):
	names = [a["name"] for a in accounts]
	if not names:
		return {}
	rows = frappe.db.sql(
		"""
		SELECT account, SUM(credit - debit)
		FROM `tabGL Entry`
		WHERE company = %(company)s
		  AND is_cancelled = 0
		  AND docstatus = 1
		  AND posting_date < %(date)s
		  AND account IN %(accounts)s
		GROUP BY account
		""",
		{"company": company, "date": date, "accounts": tuple(names)},
	)
	return {row[0]: flt(row[1]) for row in rows}


def _balances_to(company, accounts, date):
	"""Saldo akun sampai dengan tanggal (inklusif) - dipakai untuk saldo awal."""
	names = [a["name"] for a in accounts]
	if not names:
		return {}
	rows = frappe.db.sql(
		"""
		SELECT account, SUM(credit - debit)
		FROM `tabGL Entry`
		WHERE company = %(company)s
		  AND is_cancelled = 0
		  AND docstatus = 1
		  AND posting_date <= %(date)s
		  AND account IN %(accounts)s
		GROUP BY account
		""",
		{"company": company, "date": date, "accounts": tuple(names)},
	)
	return {row[0]: flt(row[1]) for row in rows}


def _sum_subtree(account, leaves, balances):
	return flt(sum(balances.get(leaf["name"], 0) for leaf in leaves if leaf["lft"] >= account["lft"] and leaf["rgt"] <= account["rgt"]))


def _resolve_entries(profile_entries, accounts):
	resolved = []
	for entry in profile_entries or []:
		root = _find(accounts, entry.get("code"))
		if not root:
			continue
		resolved.append({"root": root, "bucket": entry.get("bucket") or "total", "subtree": _subtree(accounts, root)})
	return resolved


def _section_rows(entries, balances, labels, single, negative=False, show_zero=True, prev_balances=None):
	rows = []
	totals = {"terikat": 0.0, "tidak_terikat": 0.0, "total": 0.0}
	prev_totals = {"terikat": 0.0, "tidak_terikat": 0.0, "total": 0.0}
	by_name = {a["name"]: a for entry in entries for a in entry["subtree"]}

	def value_of(account, leaves, source):
		if account["is_group"]:
			return _sum_subtree(account, leaves, source)
		return flt(source.get(account["name"], 0))

	for entry in entries:
		root = entry["root"]
		subtree = entry["subtree"]
		subtree_names = {a["name"] for a in subtree}
		leaves = [a for a in subtree if not a["is_group"]]
		if not leaves:
			continue

		group_value = value_of(root, leaves, balances)
		group_prev = value_of(root, leaves, prev_balances) if prev_balances is not None else None
		rows.append(
			_row(
				_account_label(root),
				-group_value if negative else group_value,
				entry["bucket"],
				single=single,
				indent=0,
				bold=1,
				row_type="group",
				account=root["name"],
				prev_value=(-group_prev if negative else group_prev) if group_prev is not None else None,
			)
		)

		for account in subtree:
			if account["name"] == root["name"]:
				continue
			value = value_of(account, leaves, balances)
			prev_value = value_of(account, leaves, prev_balances) if prev_balances is not None else None
			rows.append(
				_row(
					_account_label(account),
					-value if negative else value,
					entry["bucket"],
					single=single,
					indent=min(_depth(account, subtree_names, by_name), 4),
					bold=1 if account["is_group"] else 0,
					row_type="group" if account["is_group"] else "account",
					account=account["name"],
					prev_value=(-prev_value if negative else prev_value) if prev_value is not None else None,
				)
			)

		if entry["bucket"] in totals:
			totals[entry["bucket"]] += group_value
			prev_totals[entry["bucket"]] += group_prev or 0
		else:
			totals["total"] += group_value
			prev_totals["total"] += group_prev or 0

	if not single and not totals["total"]:
		totals["total"] = totals["terikat"] + totals["tidak_terikat"]
		prev_totals["total"] = prev_totals["terikat"] + prev_totals["tidak_terikat"]

	if negative:
		prev_totals = {key: -abs(value) for key, value in prev_totals.items()}

	return rows, totals, prev_totals


def _account_label(account):
	name = account.get("name") or ""
	code = name.split(" - ")[0].strip()
	label = (account.get("account_name") or name).strip()
	if code and not label.startswith(code):
		return f"{code}  {label}"
	return label


def _depth(account, subtree_names, by_name):
	depth = 0
	parent = account.get("parent_account")
	while parent and parent in subtree_names:
		depth += 1
		parent = (by_name.get(parent) or {}).get("parent_account")
	return depth


def _row(label, value, bucket, single, indent=0, bold=0, row_type="account", account=None, prev_value=None):
	value = flt(value)
	row = {
		"keterangan": label,
		"indent": indent,
		"bold": bold,
		"row_type": row_type,
		"account": account,
	}
	if single:
		row["jumlah"] = value
	else:
		row["terikat"] = value if bucket == "terikat" else None
		row["tidak_terikat"] = value if bucket == "tidak_terikat" else None
		row["total"] = value if bucket in ("total", "tidak_terikat", "terikat") else None
		if bucket == "tidak_terikat":
			row["total"] = value
	if prev_value is not None:
		prev_value = flt(prev_value)
		row["jumlah_perbandingan"] = prev_value
		row["selisih"] = value - prev_value
	return row


def _blank(single):
	return _row("", 0, "total", single, row_type="blank")


def _section(label, single):
	return _row(label, 0, "total", single, row_type="section")


def _totals(single):
	return {"terikat": 0.0, "tidak_terikat": 0.0, "total": 0.0}


def run(fund, filters):
	filters = frappe._dict(filters or {})
	company = filters.get("company")
	if not company:
		frappe.throw(_("Please select a Company"))

	labels = _labels(fund)
	profile = get_profile(company, fund)
	currency = frappe.db.get_value("Company", company, "default_currency") or "IDR"

	period_type = (filters.get("period_type") or "Bulanan").strip().lower()
	compare = period_type.startswith("fiscal")
	single = (profile or {}).get("columns") == "single"
	columns = _columns(single, labels, currency, compare=compare)

	if not profile:
		return [columns, [_row(_(labels["empty"]), 0, "total", single, row_type="empty")]]

	from_date, to_date = _period(filters)
	show_zero = filters.get("show_zero")
	show_zero = True if show_zero is None else bool(show_zero)

	accounts = _accounts(company)
	income_entries = _resolve_entries(profile.get("income"), accounts)
	expense_entries = _resolve_entries(profile.get("expense"), accounts)

	if not income_entries and not expense_entries:
		return [columns, [_row(_(labels["no_account"]), 0, "total", single, row_type="empty")]]

	balance_accounts = []
	for entry in income_entries + expense_entries:
		balance_accounts.extend(entry["subtree"])
	balance_accounts = list({a["name"]: a for a in balance_accounts}.values())

	balances = _balances(company, balance_accounts, from_date, to_date)

	prev_balances = None
	prev_income_totals = prev_expense_totals = None
	prev_from = prev_to = None
	if compare:
		prev_from, prev_to = _prev_period(from_date)
		prev_balances = _balances(company, balance_accounts, prev_from, prev_to)

	income_rows, income_totals, prev_income_raw = _section_rows(
		income_entries, balances, labels, single, show_zero=show_zero, prev_balances=prev_balances
	)
	expense_rows, expense_totals, prev_expense_raw = _section_rows(
		expense_entries, balances, labels, single, negative=True, show_zero=show_zero, prev_balances=prev_balances
	)
	prev_income_totals = prev_income_raw
	prev_expense_totals = {key: -abs(value) for key, value in prev_expense_raw.items()}
	expense_totals = {key: -abs(value) for key, value in expense_totals.items()}

	rows = [_section(labels["income"], single)]
	rows.extend(income_rows)
	rows.append(
		_row(
			labels["total_income"],
			income_totals["total"] if not single else income_totals["total"],
			"total",
			single,
			row_type="total_income",
			bold=1,
		)
	)
	if not single:
		rows[-1].update(
			{
				"terikat": income_totals["terikat"],
				"tidak_terikat": income_totals["tidak_terikat"],
				"total": income_totals["total"],
			}
		)
	if compare:
		rows[-1].update(
			{
				"jumlah_perbandingan": prev_income_totals["total"],
				"selisih": income_totals["total"] - prev_income_totals["total"],
			}
		)
	rows.append(_blank(single))

	rows.append(_section(labels["expense"], single))
	rows.extend(expense_rows)
	rows.append(
		_row(
			labels["total_expense"],
			expense_totals["total"],
			"total",
			single,
			row_type="total_expense",
			bold=1,
		)
	)
	if not single:
		rows[-1].update(
			{
				"terikat": expense_totals["terikat"],
				"tidak_terikat": expense_totals["tidak_terikat"],
				"total": expense_totals["total"],
			}
		)
	if compare:
		rows[-1].update(
			{
				"jumlah_perbandingan": prev_expense_totals["total"],
				"selisih": expense_totals["total"] - prev_expense_totals["total"],
			}
		)
	rows.append(_blank(single))

	# ---- opening / closing -------------------------------------------------
	opening, equity_movement = _opening_balance(company, accounts, profile, from_date, to_date)

	surplus = flt(income_totals["total"]) + flt(expense_totals["total"])
	closing = flt(opening) + surplus + flt(equity_movement)

	prev_opening = prev_surplus = prev_closing = prev_equity = None
	if compare:
		prev_opening, prev_equity = _opening_balance(company, accounts, profile, prev_from, prev_to)
		prev_surplus = flt(prev_income_totals["total"]) + flt(prev_expense_totals["total"])
		prev_closing = flt(prev_opening) + prev_surplus + flt(prev_equity)

	rows.append(_section(labels["recon"], single))
	surplus_row = _row(
		labels["surplus"], surplus, "total", single, row_type="surplus", bold=1,
		prev_value=prev_surplus if compare else None,
	)
	rows.append(surplus_row)
	opening_row = _row(
		labels["opening"], opening, "total", single, row_type="opening",
		prev_value=prev_opening if compare else None,
	)
	rows.append(opening_row)
	if flt(equity_movement):
		rows.append(
			_row(
				labels["other"], equity_movement, "total", single, row_type="other",
				prev_value=prev_equity if compare else None,
			)
		)
	closing_row = _row(
		labels["closing"], closing, "total", single, row_type="closing", bold=1,
		prev_value=prev_closing if compare else None,
	)
	rows.append(closing_row)

	for row in rows:
		row["currency"] = currency

	return [columns, rows]


def _columns(single, labels, currency, compare=False):
	columns = [
		{"fieldname": "keterangan", "label": labels["code"], "fieldtype": "Data", "width": 640},
	]
	if single:
		columns.append(
			{"fieldname": "jumlah", "label": labels["amount"], "fieldtype": "Currency", "options": "currency", "width": 200}
		)
	else:
		columns.extend(
			[
				{"fieldname": "terikat", "label": labels["tied"], "fieldtype": "Currency", "options": "currency", "width": 180},
				{"fieldname": "tidak_terikat", "label": labels["untied"], "fieldtype": "Currency", "options": "currency", "width": 180},
				{"fieldname": "total", "label": labels["total"], "fieldtype": "Currency", "options": "currency", "width": 180},
			]
		)
	if compare:
		columns.extend(
			[
				{
					"fieldname": "jumlah_perbandingan",
					"label": labels["prev_amount"],
					"fieldtype": "Currency",
					"options": "currency",
					"width": 200,
				},
				{"fieldname": "selisih", "label": labels["diff"], "fieldtype": "Currency", "options": "currency", "width": 180},
			]
		)
	return columns


def _opening_balance(company, accounts, profile, from_date, to_date):
	equity = profile.get("equity") or {}
	opening_codes = list(equity.get("opening") or [])
	prior_codes = list(equity.get("prior") or [])

	opening_accounts = []
	for code in opening_codes + prior_codes:
		root = _find(accounts, code)
		if root:
			opening_accounts.extend(a for a in _subtree(accounts, root) if not a["is_group"])

	equity_from = _balances_to(company, opening_accounts, from_date)
	equity_to = _balances_to(company, opening_accounts, to_date)
	total = flt(sum(equity_from.values()))
	equity_movement = flt(sum(equity_to.values())) - total

	if (profile.get("opening_mode") or "equity_only") == "pl_unclosed":
		pl_accounts = []
		for kind in ("Income", "Expense"):
			for account in accounts:
				if account["root_type"] != kind or account["is_group"]:
					continue
				for code in [e.get("code") for e in profile.get(kind.lower()) or []]:
					root = _find(accounts, code)
					if root and account["lft"] >= root["lft"] and account["rgt"] <= root["rgt"]:
						pl_accounts.append(account)
		pl_accounts = list({a["name"]: a for a in pl_accounts}.values())
		total += flt(sum(_balances_before(company, pl_accounts, from_date).values()))

	return flt(total), equity_movement


def get_meta(fund, company):
	"""Small helper for the desk JS (title/subtitle per language)."""
	lang = _lang()
	profile = get_profile(company, fund) or {}
	title = (profile.get("title") or {}).get(lang) or fund.title()
	subtitle = (profile.get("subtitle") or {}).get(lang) or ""
	return {"title": title, "subtitle": subtitle, "lang": lang}
