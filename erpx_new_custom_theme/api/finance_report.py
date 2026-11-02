"""Whitelisted entry points for the Balance Sheet and Cash Flow reports."""

import frappe

from erpx_new_custom_theme.finance.balance_sheet import run as _balance_sheet
from erpx_new_custom_theme.finance.cashflow import run as _cash_flow


@frappe.whitelist()
def run_balance_sheet(filters=None):
	if isinstance(filters, str):
		filters = frappe.parse_json(filters)
	return _balance_sheet(filters or {})


@frappe.whitelist()
def run_cash_flow(filters=None):
	if isinstance(filters, str):
		filters = frappe.parse_json(filters)
	return _cash_flow(filters or {})
