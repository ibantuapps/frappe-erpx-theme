"""Balance Sheet (Neraca) - generic across companies/COA.

Accounts are grouped by ``root_type`` (Asset / Liability / Equity) so no COA
prefix is hardcoded. Current-year profit that has not been closed to equity is
added on the Equity side so the statement always balances.
"""

import frappe
from frappe import _
from frappe.utils import flt, getdate

from erpx_new_custom_theme.fund.engine import _accounts, _balances_to, _period, _prev_period, _lang

LABELS = {
	"id": {
		"title": "Neraca",
		"subtitle": "Posisi keuangan per tanggal laporan",
		"code": "Kode & Nama Akun",
		"debit": "Debit",
		"credit": "Kredit",
		"amount": "Saldo",
		"prev": "Saldo Tahun Lalu",
		"diff": "Selisih",
		"asset": "ASET",
		"liability": "LIABILITAS",
		"equity": "EKUITAS",
		"total_asset": "TOTAL ASET",
		"total_liability": "TOTAL LIABILITAS",
		"total_equity": "TOTAL EKUITAS",
		"pl": "Surplus (Defisit) Berjalan",
		"surplus_of": "Surplus (Defisit) {0}",
		"other_surplus": "Surplus (Defisit) Lainnya",
		"check": "TOTAL LIABILITAS + EKUITAS",
		"balanced": "Seimbang",
		"unbalanced": "Tidak seimbang",
		"empty": "Belum ada akun Aset/Liabilitas/Ekuitas untuk company ini.",
	},
	"en": {
		"title": "Balance Sheet",
		"subtitle": "Financial position as of the report date",
		"code": "Account Code & Name",
		"debit": "Debit",
		"credit": "Credit",
		"amount": "Balance",
		"prev": "Prior Year Balance",
		"diff": "Difference",
		"asset": "ASSETS",
		"liability": "LIABILITIES",
		"equity": "EQUITY",
		"total_asset": "TOTAL ASSETS",
		"total_liability": "TOTAL LIABILITIES",
		"total_equity": "TOTAL EQUITY",
		"pl": "Current Period Surplus (Deficit)",
		"surplus_of": "Surplus (Deficit) {0}",
		"other_surplus": "Other Surplus (Deficit)",
		"check": "TOTAL LIABILITIES + EQUITY",
		"balanced": "Balanced",
		"unbalanced": "Not balanced",
		"empty": "No Asset/Liability/Equity accounts for this company.",
	},
}

SECTIONS = (
	("Asset", "asset", "total_asset", -1),
	("Liability", "liability", "total_liability", 1),
	("Equity", "equity", "total_equity", 1),
)


def _debit_credit(company, accounts, date):
	names = [a["name"] for a in accounts]
	if not names:
		return {}
	rows = frappe.db.sql(
		"""
		SELECT account, SUM(debit), SUM(credit)
		FROM `tabGL Entry`
		WHERE company = %(company)s AND is_cancelled = 0 AND docstatus = 1
		  AND posting_date <= %(date)s AND account IN %(accounts)s
		GROUP BY account
		""",
		{"company": company, "date": date, "accounts": tuple(names)},
	)
	return {r[0]: (flt(r[1]), flt(r[2])) for r in rows}


def _chain(account, by_name):
	parts = []
	cur = account
	seen = set()
	while cur and cur["name"] not in seen:
		seen.add(cur["name"])
		parts.append((cur.get("account_name") or cur["name"]).lower())
		cur = by_name.get(cur.get("parent_account"))
	return " ".join(parts)


def _labels():
	lang = _lang()
	return dict(LABELS[lang])


def _row(label, value, row_type="account", indent=0, bold=0, prev=None, account=None, debit=None, credit=None):
	value = flt(value)
	row = {
		"keterangan": label,
		"nilai": value,
		"debit": flt(debit) if debit is not None else None,
		"kredit": flt(credit) if credit is not None else None,
		"indent": indent,
		"bold": bold,
		"row_type": row_type,
		"account": account,
	}
	if prev is not None:
		row["perbandingan"] = flt(prev)
		row["selisih"] = value - flt(prev)
	return row


def _label(account):
	code = (account.get("name") or "").split(" - ")[0].strip()
	name = (account.get("account_name") or "").strip()
	return f"{code}  {name}" if code and not name.startswith(code) else name


def _tree_rows(accounts, root_type, sign, balances, prior_balances, compare, show_zero, dc=None):
	rows = []
	subset = [a for a in accounts if a["root_type"] == root_type]
	by_name = {a["name"]: a for a in subset}
	leaves = [a for a in subset if not a["is_group"]]

	def dc_of(account):
		if not dc:
			return None, None
		if account["is_group"]:
			debit = credit = 0.0
			for leaf in leaves:
				if leaf["lft"] >= account["lft"] and leaf["rgt"] <= account["rgt"]:
					d, c = dc.get(leaf["name"], (0.0, 0.0))
					debit += d
					credit += c
			return debit, credit
		return dc.get(account["name"], (0.0, 0.0))

	def value_of(account, source):
		if account["is_group"]:
			total = 0.0
			for leaf in leaves:
				if leaf["lft"] >= account["lft"] and leaf["rgt"] <= account["rgt"]:
					total += flt(source.get(leaf["name"], 0))
			return total
		return flt(source.get(account["name"], 0))

	roots = [a for a in subset if a["is_group"] and not a.get("parent_account") in by_name]
	if not roots:
		roots = [a for a in subset if a["is_group"] and a.get("parent_account") not in by_name]

	for root in roots:
		subtree = [a for a in subset if a["lft"] >= root["lft"] and a["rgt"] <= root["rgt"]]
		if not subtree:
			continue
		group_value = value_of(root, balances) * sign
		group_prior = value_of(root, prior_balances) * sign if compare else None
		if not (show_zero or flt(group_value) or flt(group_prior or 0)):
			continue
		d0, c0 = dc_of(root)
		rows.append(_row(_label(root), group_value, "group", 0, 1, group_prior, root["name"], d0, c0))
		for account in subtree:
			if account["name"] == root["name"]:
				continue
			depth = 1
			parent = account.get("parent_account")
			while parent and parent in by_name and parent != root["name"]:
				depth += 1
				parent = (by_name.get(parent) or {}).get("parent_account")
			value = value_of(account, balances) * sign
			prior = value_of(account, prior_balances) * sign if compare else None
			if not (show_zero or flt(value) or flt(prior or 0)):
				continue
			da, ca = dc_of(account)
			rows.append(
				_row(
					_label(account),
					value,
					"group" if account["is_group"] else "account",
					min(depth, 4),
					1 if account["is_group"] else 0,
					prior,
					account["name"],
					da,
					ca,
				)
			)
	return rows


def _total(accounts, root_type, sign, balances):
	leaves = [a for a in accounts if a["root_type"] == root_type and not a["is_group"]]
	return flt(sum(flt(balances.get(a["name"], 0)) for a in leaves)) * sign


def run(filters):
	filters = frappe._dict(filters or {})
	company = filters.get("company")
	if not company:
		frappe.throw(_("Please select a Company"))

	labels = _labels()
	currency = frappe.db.get_value("Company", company, "default_currency") or "IDR"
	period_type = (filters.get("period_type") or "Bulanan").strip().lower()
	compare = period_type.startswith("fiscal") or bool(filters.get("show_comparison"))

	from_date, to_date = _period(filters)
	show_zero = filters.get("show_zero")
	show_zero = True if show_zero is None else bool(show_zero)

	accounts = _accounts(company)
	bs_accounts = [a for a in accounts if a["root_type"] in ("Asset", "Liability", "Equity")]
	if not bs_accounts:
		columns = _columns(labels)
		return [columns, [_row(_(labels["empty"]), 0, "empty")]]

	leaves = [a for a in bs_accounts if not a["is_group"]]
	balances = _balances_to(company, leaves, to_date)

	prior_end = None
	prior_balances = {}
	if compare:
		prev_from, prev_to = _prev_period(from_date)
		prior_end = getdate(prev_to)
		prior_balances = _balances_to(company, leaves, prior_end)

	dc = _debit_credit(company, leaves, to_date)
	pl_leaves = [a for a in accounts if a["root_type"] in ("Income", "Expense") and not a["is_group"]]
	pl_balance = flt(sum(_balances_to(company, pl_leaves, to_date).values()))
	pl_prior = flt(sum(_balances_to(company, pl_leaves, prior_end).values())) if compare else 0

	rows = []
	totals = {}
	for root_type, key, total_key, sign in SECTIONS:
		rows.append(_row(labels[key], 0, "section"))
		rows.extend(_tree_rows(accounts, root_type, sign, balances, prior_balances, compare, show_zero, dc))
		if root_type == "Equity":
			by_name = {a["name"]: a for a in accounts}
			pl_bal_all = _balances_to(company, pl_leaves, to_date)
			pl_bal_prior = _balances_to(company, pl_leaves, prior_end) if compare else {}
			assigned = set()
			equity_groups = [
				a for a in accounts
				if a["root_type"] == "Equity" and a["is_group"] and a.get("parent_account")
			]
			total_surplus = 0.0
			total_surplus_prev = 0.0
			for group in equity_groups:
				tokens = [
					t for t in str(group.get("account_name") or "").lower().replace("/", " ").split()
					if len(t) > 3 and t not in {"dana", "saldo", "periode", "sebelumnya", "lainnya", "lain", "tidak", "terikat", "dengan", "pembatasan", "tanpa", "pembatasan"}
				]
				if not tokens:
					continue
				matched = []
				for leaf in pl_leaves:
					if leaf["name"] in assigned:
						continue
					text = _chain(leaf, by_name)
					if "bagian amil" in text and "amil" not in tokens:
						continue
					if tokens == ["amil"] and "dana amil" not in text:
						continue
					if any(tok in text for tok in tokens):
						matched.append(leaf)
				if not matched:
					continue
				amount = flt(sum(flt(pl_bal_all.get(l["name"], 0)) for l in matched))
				amount_prev = flt(sum(flt(pl_bal_prior.get(l["name"], 0)) for l in matched)) if compare else 0
				for l in matched:
					assigned.add(l["name"])
				if flt(amount) or flt(amount_prev) or show_zero:
					rows.append(
						_row(
							labels["surplus_of"].format(group.get("account_name") or group["name"]),
							amount,
							"account",
							1,
							0,
							amount_prev if compare else None,
						)
					)
				total_surplus += amount
				total_surplus_prev += amount_prev

			remaining = flt(sum(flt(v) for k, v in pl_bal_all.items() if k not in assigned))
			remaining_prev = flt(sum(flt(v) for k, v in pl_bal_prior.items() if k not in assigned)) if compare else 0
			if flt(remaining) or flt(remaining_prev):
				rows.append(
					_row(
						labels["other_surplus"],
						remaining,
						"account",
						1,
						0,
						remaining_prev if compare else None,
					)
				)
			total_equity = _total(accounts, "Equity", 1, balances) + total_surplus + remaining
			total = total_equity
		else:
			total = _total(accounts, root_type, sign, balances)
		totals[key] = total

		total_row = _row(labels[total_key], total, total_key, 0, 1)
		if compare:
			if root_type == "Equity":
				prior_total = _total(accounts, "Equity", 1, prior_balances) + pl_prior
			else:
				prior_total = _total(accounts, root_type, sign, prior_balances)
			total_row["perbandingan"] = prior_total
			total_row["selisih"] = total - prior_total
		rows.append(total_row)
		rows.append(_row("", 0, "blank"))

	right_total = flt(totals["liability"]) + flt(totals["equity"])
	check = _row(labels["check"], right_total, "check", 0, 1)
	if compare:
		check["perbandingan"] = None
	rows.append(check)
	difference = flt(totals["asset"]) - right_total
	rows.append(
		_row(
			labels["balanced"] if abs(difference) < 0.01 else labels["unbalanced"],
			difference,
			"balance",
			0,
			1,
		)
	)

	for row in rows:
		row["currency"] = currency

	return [_columns(labels), rows]


def _columns(labels):
	return [
		{"fieldname": "keterangan", "label": labels["code"], "fieldtype": "Data", "width": 640},
		{"fieldname": "debit", "label": labels["debit"], "fieldtype": "Currency", "options": "currency", "width": 150},
		{"fieldname": "kredit", "label": labels["credit"], "fieldtype": "Currency", "options": "currency", "width": 150},
		{"fieldname": "nilai", "label": labels["amount"], "fieldtype": "Currency", "options": "currency", "width": 200},
		{"fieldname": "perbandingan", "label": labels["prev"], "fieldtype": "Currency", "options": "currency", "width": 200},
		{"fieldname": "selisih", "label": labels["diff"], "fieldtype": "Currency", "options": "currency", "width": 180},
	]
