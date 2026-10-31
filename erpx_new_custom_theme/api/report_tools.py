"""Ops helpers for Script Report maintenance (CLI only, not a web API).

These helpers exist because the PSAK 109 fund statements (Infak/Sedekah, Zakat,
Amil) are *custom* Report documents that live only in a site database - they are
not shipped as app fixtures, so `bench migrate` will not carry them between
sites (e.g. theme -> prod). Use these to duplicate and smoke-test them instead
of hand-copying report_script / javascript / columns / filters.

None of the functions below are decorated with @frappe.whitelist(), so they are
NOT reachable over HTTP - only from the bench CLI:

    bench --site <site> execute \
        erpx_new_custom_theme.api.report_tools.duplicate_report \
        --kwargs "{'src': 'Perubahan Dana Infak dan Sedekah', 'dst': 'Perubahan Dana Zakat', 'defaults': {'fund': 'zakat'}, 'replace_in_javascript': [['\"Perubahan Dana Infak dan Sedekah\"] = {', '\"Perubahan Dana Zakat\"] = {']]}"

    bench --site <site> execute \
        erpx_new_custom_theme.api.report_tools.probe_report \
        --kwargs "{'name': 'Perubahan Dana Zakat', 'filters': {'company': 'Ibantu'}}"
"""

import frappe

# Fields that must never be carried over into a copy.
_RESET_FIELDS = (
	"name",
	"creation",
	"modified",
	"modified_by",
	"owner",
	"idx",
	"docstatus",
)


def duplicate_report(src, dst, defaults=None, replace_in_javascript=None, roles_add=None):
	"""Copy Report `src` into a new Report named `dst`; return the new name.

	:param src: source Report name
	:param dst: new Report name (= report_name; Report autonomic names by it)
	:param defaults: optional {filter_fieldname: default_value} applied to the
		copied filter rows, e.g. {"fund": "zakat"}
	:param replace_in_javascript: optional list of [find, replace] pairs applied
		to the copied `javascript` field (the report key must match the name)
	:param roles_add: optional list of Roles to append to the copied roles
	"""
	source = frappe.get_doc("Report", src)

	payload = {k: v for k, v in source.as_dict().items() if k not in _RESET_FIELDS}
	payload["report_name"] = dst

	target = frappe.get_doc(payload)

	if defaults:
		for row in target.filters or []:
			if row.fieldname in defaults:
				row.default = defaults[row.fieldname]

	if replace_in_javascript:
		js = target.javascript or ""
		for pair in replace_in_javascript:
			js = js.replace(pair[0], pair[1])
		target.javascript = js

	if roles_add:
		existing = {row.role for row in (target.roles or [])}
		for role in roles_add:
			if role not in existing:
				target.append("roles", {"role": role})

	target.insert(ignore_permissions=True)
	frappe.db.commit()
	return target.name


def probe_report(name, filters=None, sample=10):
	"""Run a Script Report and return a compact summary (safe for CLI output).

	Returns column labels, row count, the row `tipe` values seen, any fund
	profile actually resolved, plus a small sample of rows - instead of dumping
	the whole result (which also contains the full report script).
	"""
	frappe.local.lang = frappe.local.lang or "en"

	from frappe.desk.query_report import run

	result = run(name, filters or {}, user=frappe.session.user) or {}

	columns = result.get("columns") or []
	rows = [r for r in (result.get("result") or []) if isinstance(r, dict)]

	types = {}
	for row in rows:
		key = str(row.get("tipe") or "")
		types[key] = types.get(key, 0) + 1

	return {
		"report": name,
		"columns": [c.get("label") for c in columns],
		"rows": len(rows),
		"tipe_counts": types,
		"sample": [
			{
				"keterangan": row.get("keterangan"),
				"kode": row.get("kode"),
				"terikat": row.get("terikat"),
				"tidak_terikat": row.get("tidak_terikat"),
				"jumlah": row.get("jumlah"),
				"jumlah_perbandingan": row.get("jumlah_perbandingan"),
				"selisih": row.get("selisih"),
				"tipe": row.get("tipe"),
			}
			for row in rows[:sample]
		],
	}
