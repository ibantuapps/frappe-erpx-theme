# ============================================================
# ERPX - COA Card View API
# Returns hierarchical account tree with balances
# ============================================================

import frappe
from frappe import _

from erpx_new_custom_theme.api.money import get_company_currency, get_currency_symbol


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
def get_coa_tree(company=None):
    """
    Get Chart of Accounts tree with balances for card view.
    
    Args:
        company (str): Company name (defaults to user default)
    
    Returns:
        dict: { accounts: [...], company: str }
    """
    company = _resolve_company(company)

    if not company:
        frappe.throw(_("No company found. Please set a default company."))
    
    # Get all accounts for the company
    accounts = frappe.get_all(
        "Account",
        filters={
            "company": company,
            "is_group": 0  # Only leaf accounts for now, groups handled via parent_account
        },
        fields=[
            "name",
            "account_name",
            "account_number",
            "account_type",
            "root_type",
            "parent_account",
            "disabled",
            "is_group"
        ],
        order_by="lft"
    )
    
    # Get balances for all accounts
    account_names = [acc.name for acc in accounts]
    balances = get_account_balances(account_names, company)
    
    # Merge balances
    for acc in accounts:
        acc.balance = balances.get(acc.name, 0)
    
    # Also include group accounts for hierarchy
    group_accounts = frappe.get_all(
        "Account",
        filters={"company": company, "is_group": 1},
        fields=[
            "name",
            "account_name",
            "account_number",
            "account_type",
            "root_type",
            "parent_account",
            "disabled",
            "is_group"
        ],
        order_by="lft"
    )
    
    # Group accounts have 0 balance (sum of children)
    for acc in group_accounts:
        acc.balance = 0
    
    all_accounts = accounts + group_accounts

    currency = get_company_currency(company)

    return {
        "accounts": all_accounts,
        "company": company,
        "currency": currency,
        "symbol": get_currency_symbol(currency)
    }


def get_account_balances(account_names, company):
    """
    Get balances for multiple accounts efficiently.
    Uses GL Entry aggregation.
    """
    if not account_names:
        return {}
    
    # Get fiscal year for company
    fiscal_year = frappe.get_all(
        "Fiscal Year",
        filters={"company": company, "disabled": 0},
        fields=["name", "year_start_date", "year_end_date"],
        order_by="year_start_date desc",
        limit=1
    )
    
    if not fiscal_year:
        return {acc: 0 for acc in account_names}
    
    fy = fiscal_year[0]
    
    # Aggregate balances from GL Entry
    gl_entries = frappe.db.sql("""
        SELECT 
            account,
            SUM(debit) as total_debit,
            SUM(credit) as total_credit
        FROM `tabGL Entry`
        WHERE 
            account IN %(accounts)s
            AND company = %(company)s
            AND posting_date BETWEEN %(fy_start)s AND %(fy_end)s
            AND is_cancelled = 0
        GROUP BY account
    """, {
        "accounts": account_names,
        "company": company,
        "fy_start": fy.year_start_date,
        "fy_end": fy.year_end_date
    }, as_dict=True)
    
    balances = {}
    for entry in gl_entries:
        balances[entry.account] = entry.total_debit - entry.total_credit
    
    # Default 0 for accounts with no entries
    for acc in account_names:
        if acc not in balances:
            balances[acc] = 0
    
    return balances


@frappe.whitelist()
def get_account_balance(account, company=None, as_at_date=None):
    """
    Get balance for a single account (for real-time updates).
    """
    company = _resolve_company(company)

    if not company:
        frappe.throw(_("No company found. Please set a default company."))

    if not as_at_date:
        as_at_date = frappe.utils.nowdate()
    
    balance = frappe.db.sql("""
        SELECT 
            SUM(debit) as total_debit,
            SUM(credit) as total_credit
        FROM `tabGL Entry`
        WHERE 
            account = %(account)s
            AND company = %(company)s
            AND posting_date <= %(as_at_date)s
            AND is_cancelled = 0
    """, {
        "account": account,
        "company": company,
        "as_at_date": as_at_date
    }, as_dict=True)
    
    if balance and balance[0]:
        return balance[0].total_debit - balance[0].total_credit
    
    return 0
