"""Currency-aware money formatting - one source of truth for every amount.

Nothing here is hardcoded per country:

* the currency comes from the document's Company (``default_currency``),
* the symbol, the number format and the symbol position come from the site's
  ``Currency`` records,
* the digit grouping / decimal separator come from Frappe's own
  ``fmt_money`` (site ``number_format``, or the per-currency format when the
  site enables *Use Number Format from Currency*).

So the same code renders ``Rp 1.000.000`` on an Indonesian site, ``RM 1,000,000``
on a Malaysian one and ``$1,000,000`` for a USD company - without a single
currency literal in the app.
"""

import frappe
from frappe.utils import cint, flt
from frappe.utils.data import fmt_money

DEFAULT_PRECISION = 0


def get_company_currency(company=None):
	"""Currency code of a company, falling back to the site default currency."""
	currency = frappe.db.get_value("Company", company, "default_currency") if company else None
	return currency or frappe.db.get_default("currency")


def _currency_field(currency, fieldname):
	if not currency or not frappe.db.exists("Currency", currency):
		return None
	return frappe.get_cached_value("Currency", currency, fieldname)


def get_currency_symbol(currency=None):
	"""Symbol configured for a currency (falls back to the ISO code)."""
	return _currency_field(currency, "symbol") or (currency or "")


def get_currency_number_format(currency=None):
	"""Per-currency number format - only when the site opts into it (Frappe-native)."""
	if cint(frappe.db.get_default("use_number_format_from_currency")):
		return _currency_field(currency, "number_format")
	return None


def format_money(value, currency=None, precision=DEFAULT_PRECISION, with_symbol=True):
	"""Format ``value`` with the site's number format and the currency symbol.

	The symbol and its position are applied by ``frappe.utils.fmt_money`` itself:
	it reads ``symbol`` / ``symbol_on_right`` from the Currency doctype and honors
	the site-wide *Hide Currency Symbol* default. We deliberately do not add a
	symbol here, otherwise it would be printed twice.
	"""
	currency = currency or frappe.db.get_default("currency")
	return fmt_money(
		flt(value),
		precision=precision,
		currency=currency if with_symbol else None,
		format=get_currency_number_format(currency),
	)


def get_company_currency_symbol(company=None):
	"""(currency, symbol) for a company - kept for backwards compatibility."""
	currency = get_company_currency(company)
	return currency, get_currency_symbol(currency)
