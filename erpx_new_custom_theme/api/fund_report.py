"""Whitelisted entry points for the fund statement reports."""

import frappe

from erpx_new_custom_theme.fund.engine import get_meta as _get_meta
from erpx_new_custom_theme.fund.engine import run as _run


@frappe.whitelist()
def run(fund, filters=None):
	"""Run a fund statement (zakat / infak / amil) for the given filters."""
	if isinstance(filters, str):
		filters = frappe.parse_json(filters)
	return _run(fund, filters or {})


@frappe.whitelist()
def meta(fund, company):
	"""Title / subtitle for the desk header, resolved per language."""
	return _get_meta(fund, company)
