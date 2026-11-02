# Journal Entry KPI API
# Separate file as requested: not mixed with kpi.py

import frappe
from frappe import _

from erpx_new_custom_theme.api.money import (
    format_money,
    get_company_currency,
    get_currency_symbol,
)


def get_company_currency_symbol(company=None):
    """(currency, currency) for the given company, read from the Currency doctype."""
    currency = get_company_currency(company)
    return currency, get_currency_symbol(currency)


def _get_allowed_companies():
    """Return list of Company names the current user may access via User Permissions."""
    try:
        perms = frappe.defaults.get_user_permissions()
        if perms and "Company" in perms:
            return [p.get("doc") for p in perms["Company"] if p.get("doc")]
    except Exception:
        pass
    return []


def _resolve_company(company=None):
    """
    Resolve + enforce company access.
    - Explicit param: must exist and be permitted, else throw.
    - Empty: user default -> single allowed -> first allowed -> first Company (managers).
    Returns company name or None.
    """
    is_manager = "System Manager" in frappe.get_roles()

    if company:
        if isinstance(company, str):
            company = company.strip()
        if not frappe.db.exists("Company", company):
            frappe.throw(_("Company {0} not found").format(company))
        if not frappe.has_permission("Company", doc=company):
            frappe.throw(_("Not permitted to access Company {0}").format(company))
        allowed = _get_allowed_companies()
        if allowed and company not in allowed and not is_manager:
            frappe.throw(_("Not permitted to access Company {0}").format(company))
        return company

    default = frappe.defaults.get_user_default("company")
    if default and frappe.db.exists("Company", default):
        allowed = _get_allowed_companies()
        if is_manager or not allowed or default in allowed:
            if frappe.has_permission("Company", doc=default):
                return default

    allowed = _get_allowed_companies()
    if allowed:
        return allowed[0]

    return frappe.db.get_value("Company", {}, "name", order_by="creation asc")


@frappe.whitelist()
def get_journal_entry_summary(company=None):
    """
    KPI Summary di atas List View Journal Entry:
    - Total Journal Entry count (bulan ini, docstatus=1)
    - Total Debit amount
    - Total Credit amount
    """
    company = _resolve_company(company)

    if not company:
        return {"error": _("Company not set")}

    currency, symbol = get_company_currency_symbol(company)
    today = frappe.utils.getdate(frappe.utils.nowdate())
    month_start = today.replace(day=1)

    # Fetch Journal Entry aggregates
    je = (
        frappe.db.sql(
            """
        SELECT
            SUM(total_debit) AS total_debit,
            SUM(total_credit) AS total_credit,
            COUNT(name) AS cnt
        FROM `tabJournal Entry`
        WHERE company = %(company)s
          AND docstatus = 1
          AND posting_date BETWEEN %(start)s AND %(end)s
    """,
            {"company": company, "start": month_start, "end": today},
            as_dict=True,
        )[0]
        or {}
    )

    tot_debit = float(je.get("total_debit") or 0)
    tot_credit = float(je.get("total_credit") or 0)
    cnt = int(je.get("cnt") or 0)

    asnaf_keywords = [
        ("fakir", "Fakir"),
        ("miskin", "Miskin"),
        ("riqab", "Riqab"),
        ("gharim", "Gharim"),
        ("muallaf", "Muallaf"),
        ("fisabil", "Fisabilillah"),
        ("ibnu sabil", "Ibnu Sabil"),
        ("mustahik", "Mustahik"),
        ("bantuan pendidikan", "Pendidikan"),
        ("bantuan kesehatan", "Kesehatan"),
        ("bantuan kemanusiaan", "Kemanusiaan"),
        ("bantuan dakwah", "Dakwah"),
    ]

    mustahik_rows = frappe.db.sql(
        """
        SELECT jea.account, SUM(jea.debit - jea.credit) AS amount
        FROM `tabJournal Entry Account` jea
        JOIN `tabJournal Entry` je ON je.name = jea.parent
        WHERE je.company = %(company)s
          AND je.docstatus = 1
          AND je.posting_date BETWEEN %(start)s AND %(end)s
          AND jea.account NOT LIKE '%%Amil%%'
        GROUP BY jea.account
    """,
        {"company": company, "start": month_start, "end": today},
        as_dict=True,
    )

    mustahik_total = 0.0
    asnaf = []
    for row in mustahik_rows:
        name = (row.account or "").lower()
        matched = [label for key, label in asnaf_keywords if key in name]
        if not matched:
            continue
        mustahik_total += float(row.amount or 0)
        for label in matched:
            if label not in asnaf:
                asnaf.append(label)

    difference = tot_debit - tot_credit
    balanced = abs(difference) < 0.01

    return {
        "total_debit_fmt": format_money(tot_debit, currency),
        "total_credit_fmt": format_money(tot_credit, currency),
        "count": cnt,
        "net_fmt": format_money(difference, currency),
        "balanced": balanced,
        "status_text": _("Balanced") if balanced else _("Not Balanced"),
        "difference_fmt": format_money(abs(difference), currency),
        "mustahik_fmt": format_money(mustahik_total, currency),
        "asnaf": asnaf,
        "currency": currency,
    }
