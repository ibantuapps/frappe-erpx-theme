# ============================================================
# ERPX New Custom Theme - KPI API
# File: erpx_new_custom_theme/api/kpi.py
# ============================================================

import frappe
from frappe import _
from dateutil.relativedelta import relativedelta
from frappe.utils import getdate, nowdate, cint

from erpx_new_custom_theme.api.money import (
    format_money,
    get_company_currency,
    get_currency_symbol,
)


def get_company_currency_symbol(company=None):
    """
    (currency, currency) yang benar-benar dipakai company.

    Symbol diambil dari doctype Currency (bukan map hardcode) supaya site
    negara lain (RM, $, €, ...) ikut benar.
    """
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
def get_kpi_cash_bank(company=None):
    """
    Ambil total saldo Kas & Bank untuk KPI Card.
    """
    company = _resolve_company(company)

    if not company:
        return {"error": _("Company not set")}
    
    currency, symbol = get_company_currency_symbol(company)

    accounts = frappe.get_all('Account',
        filters={
            'company': company,
            'root_type': 'Asset',
            'account_type': ['in', ['Bank', 'Cash']],
            'is_group': 0
        },
        fields=['name']
    )
    
    icon_html = '''
        <svg class="kpi-card__icon" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#10b981" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
            <path d="M12 2a8 8 0 1 0 8 8"/>
            <path d="M12 10v6"/>
            <path d="M9 13h6"/>
        </svg>
    '''
    
    if not accounts:
        return {
            "labelLines": [_("Total Cash & Bank"), _("All Funds")],
            "value": format_money(0, currency),
            "trendValue": "0%",
            "trendLabel": _("vs last month"),
            "trendUp": True,
            "iconHtml": icon_html
        }
    
    account_names = [a.name for a in accounts]
    today = getdate(nowdate())
    last_month_end = today.replace(day=1) - relativedelta(days=1)
    
    current_balance = frappe.db.sql("""
        SELECT SUM(debit - credit) as balance
        FROM `tabGL Entry`
        WHERE account IN %(accounts)s
          AND company = %(company)s
          AND is_cancelled = 0
          AND posting_date <= %(today)s
    """, {'accounts': account_names, 'company': company, 'today': today}, as_dict=True)
    
    last_month_balance = frappe.db.sql("""
        SELECT SUM(debit - credit) as balance
        FROM `tabGL Entry`
        WHERE account IN %(accounts)s
          AND company = %(company)s
          AND is_cancelled = 0
          AND posting_date <= %(end)s
    """, {'accounts': account_names, 'company': company, 'end': last_month_end}, as_dict=True)
    
    current = float(current_balance[0].balance or 0) if current_balance else 0
    last_month = float(last_month_balance[0].balance or 0) if last_month_balance else 0
    
    if last_month != 0:
        pct = ((current - last_month) / abs(last_month)) * 100
        trend_value = f"{'+' if pct >= 0 else ''}{pct:.1f}%"
        trend_up = pct >= 0
    else:
        trend_value = "0%"
        trend_up = True
    
    return {
        "labelLines": [_("Total Cash & Bank"), _("All Funds")],
        "value": format_money(current, currency),
        "trendValue": trend_value,
        "trendLabel": _("vs last month"),
        "trendUp": trend_up,
        "iconHtml": icon_html
    }


@frappe.whitelist()
def get_kpi_receivables(company=None):
    """Piutang / Receivables KPI"""
    company = _resolve_company(company)

    if not company:
        return {"error": _("Company not set")}

    currency, symbol = get_company_currency_symbol(company)

    accounts = frappe.get_all('Account',
        filters={'company': company, 'root_type': 'Asset', 'account_type': 'Receivable', 'is_group': 0},
        fields=['name']
    )
    
    icon_html = '<svg class="kpi-card__icon" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#f59e0b" stroke-width="2"><path d="M21 12V7H5v5"/><path d="M7 7l4 4 4-4"/><rect x="3" y="11" width="18" height="11" rx="2"/></svg>'

    if not accounts:
        return {
            "labelLines": [_("Total Receivables")], 
            "value": format_money(0, currency), 
            "trendValue": "0%", 
            "trendLabel": _("vs last month"), 
            "trendUp": True,
            "iconHtml": icon_html
        }
    
    account_names = [a.name for a in accounts]
    today = getdate(nowdate())
    
    balance = frappe.db.sql("""
        SELECT SUM(debit - credit) as balance
        FROM `tabGL Entry`
        WHERE account IN %(accounts)s 
          AND company = %(company)s 
          AND is_cancelled = 0
          AND posting_date <= %(today)s
    """, {'accounts': account_names, 'company': company, 'today': today}, as_dict=True)
    
    val = float(balance[0].balance or 0) if balance else 0
    return {
        "labelLines": [_("Total Receivables")],
        "value": format_money(val, currency),
        "trendValue": "0%",
        "trendLabel": _("vs last month"),
        "trendUp": True,
        "iconHtml": icon_html
    }


@frappe.whitelist()
def get_kpi_payables(company=None):
    """Hutang / Payables KPI"""
    company = _resolve_company(company)

    if not company:
        return {"error": _("Company not set")}

    currency, symbol = get_company_currency_symbol(company)

    accounts = frappe.get_all('Account',
        filters={'company': company, 'root_type': 'Liability', 'account_type': 'Payable', 'is_group': 0},
        fields=['name']
    )
    
    icon_html = '<svg class="kpi-card__icon" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#ef4444" stroke-width="2"><path d="M21 12V7H5v5"/><path d="M7 7l4 4 4-4"/><rect x="3" y="11" width="18" height="11" rx="2"/></svg>'

    if not accounts:
        return {
            "labelLines": [_("Total Payables")], 
            "value": format_money(0, currency), 
            "trendValue": "0%", 
            "trendLabel": _("vs last month"), 
            "trendUp": True,
            "iconHtml": icon_html
        }
    
    account_names = [a.name for a in accounts]
    today = getdate(nowdate())
    
    balance = frappe.db.sql("""
        SELECT SUM(credit - debit) as balance
        FROM `tabGL Entry`
        WHERE account IN %(accounts)s 
          AND company = %(company)s 
          AND is_cancelled = 0
          AND posting_date <= %(today)s
    """, {'accounts': account_names, 'company': company, 'today': today}, as_dict=True)
    
    val = float(balance[0].balance or 0) if balance else 0
    return {
        "labelLines": [_("Total Payables")],
        "value": format_money(val, currency),
        "trendValue": "0%",
        "trendLabel": _("vs last month"),
        "trendUp": True,
        "iconHtml": icon_html
    }


@frappe.whitelist()
def get_kpi_ziswaf(company=None):
    """
    Ambil data KPI Penerimaan ZISWAF (Zakat, Infak/Sedekah, Wakaf).
    """
    company = _resolve_company(company)

    if not company:
        return {"error": _("Company not set")}

    currency, symbol = get_company_currency_symbol(company)

    icon_html = '''
        <svg class="kpi-card__icon" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#10b981" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
            <path d="M12 2a8 8 0 1 0 8 8"/>
            <path d="M12 10v6"/>
            <path d="M9 13h6"/>
        </svg>
    '''

    all_income_accounts = frappe.get_all('Account',
        filters={
            'company': company,
            'root_type': 'Income',
            'is_group': 0
        },
        fields=['name', 'account_name']
    )

    ziswaf_keywords = ['zakat', 'infak', 'infaq', 'sedekah', 'wakaf']
    accounts = [
        a for a in all_income_accounts 
        if any(kw in a.account_name.lower() for kw in ziswaf_keywords) or a.name.startswith('42')
    ]

    if not accounts:
        return {
            "labelLines": [_("Fund Receipts"), _("(This Month)")],
            "value": format_money(0, currency),
            "currency": currency,
            "trendValue": "0%",
            "trendLabel": _("vs last month"),
            "trendUp": True,
            "breakdown": {"zakat": 0, "infak": 0, "wakaf": 0},
            "iconHtml": icon_html
        }

    account_names = [a.name for a in accounts]
    today = getdate(nowdate())
    month_start = today.replace(day=1)
    last_month_end = month_start - relativedelta(days=1)
    last_month_start = last_month_end.replace(day=1)

    current_total = frappe.db.sql("""
        SELECT SUM(credit - debit) as balance
        FROM `tabGL Entry`
        WHERE account IN %(accounts)s
          AND company = %(company)s
          AND is_cancelled = 0
          AND posting_date BETWEEN %(start)s AND %(end)s
    """, {'accounts': account_names, 'company': company, 'start': month_start, 'end': today}, as_dict=True)

    last_month_total = frappe.db.sql("""
        SELECT SUM(credit - debit) as balance
        FROM `tabGL Entry`
        WHERE account IN %(accounts)s
          AND company = %(company)s
          AND is_cancelled = 0
          AND posting_date BETWEEN %(start)s AND %(end)s
    """, {'accounts': account_names, 'company': company, 'start': last_month_start, 'end': last_month_end}, as_dict=True)

    current = float(current_total[0].balance or 0) if current_total else 0
    last_month = float(last_month_total[0].balance or 0) if last_month_total else 0

    breakdown_raw = {"zakat": 0.0, "infak": 0.0, "wakaf": 0.0}
    
    for a in accounts:
        acc_name = a.account_name.lower()
        target_cat = None
        if 'zakat' in acc_name:
            target_cat = 'zakat'
        elif 'infak' in acc_name or 'infaq' in acc_name or 'sedekah' in acc_name:
            target_cat = 'infak'
        elif 'wakaf' in acc_name:
            target_cat = 'wakaf'

        if target_cat:
            cat_total = frappe.db.sql("""
                SELECT SUM(credit - debit) as balance
                FROM `tabGL Entry`
                WHERE account = %(account)s
                  AND company = %(company)s
                  AND is_cancelled = 0
                  AND posting_date BETWEEN %(start)s AND %(end)s
            """, {'account': a.name, 'company': company, 'start': month_start, 'end': today}, as_dict=True)
            
            bal = float(cat_total[0].balance or 0) if cat_total else 0
            breakdown_raw[target_cat] += bal

    total_breakdown = sum(breakdown_raw.values())
    breakdown_pct = {"zakat": 0, "infak": 0, "wakaf": 0}
    if total_breakdown > 0:
        for k in breakdown_raw:
            breakdown_pct[k] = round((breakdown_raw[k] / total_breakdown) * 100)

    if last_month != 0:
        pct = ((current - last_month) / abs(last_month)) * 100
        trend_value = f"{'+' if pct >= 0 else ''}{pct:.1f}%"
        trend_up = pct >= 0
    else:
        trend_value = "0%"
        trend_up = True

    return {
        "labelLines": [_("Fund Receipts"), _("(This Month)")],
        "value": format_money(current, currency),
        "currency": currency,
        "trendValue": trend_value,
        "trendLabel": _("vs last month"),
        "trendUp": trend_up,
        "breakdown": breakdown_pct,
        "iconHtml": icon_html
    }


@frappe.whitelist()
def get_kpi_amil(company=None):
    """KPI Penerimaan Dana Amil (bulan berjalan)."""
    company = _resolve_company(company)

    if not company:
        return {"error": _("Company not set")}

    currency, symbol = get_company_currency_symbol(company)

    icon_html = '''
        <svg class="kpi-card__icon" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#0ea5e9" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
            <path d="M12 2a8 8 0 1 0 8 8"/>
            <path d="M12 10v6"/>
            <path d="M9 13h6"/>
        </svg>
    '''

    income_accounts = frappe.get_all(
        "Account",
        filters={"company": company, "root_type": "Income", "is_group": 0},
        fields=["name", "account_name"],
    )
    accounts = [
        a for a in income_accounts
        if "amil" in (a.account_name or "").lower() or a.name.startswith("43")
    ]

    if not accounts:
        return {
            "labelLines": [_("Amil Fund Receipts"), _("(This Month)")],
            "value": format_money(0, currency),
            "currency": currency,
            "trendValue": "0%",
            "trendLabel": _("vs last month"),
            "trendUp": True,
            "iconHtml": icon_html,
        }

    account_names = [a.name for a in accounts]
    today = getdate(nowdate())
    month_start = today.replace(day=1)
    last_month_end = month_start - relativedelta(days=1)
    last_month_start = last_month_end.replace(day=1)

    current_total = frappe.db.sql("""
        SELECT SUM(credit - debit) as balance
        FROM `tabGL Entry`
        WHERE account IN %(accounts)s
          AND company = %(company)s
          AND is_cancelled = 0
          AND posting_date BETWEEN %(start)s AND %(end)s
    """, {"accounts": account_names, "company": company, "start": month_start, "end": today}, as_dict=True)

    last_month_total = frappe.db.sql("""
        SELECT SUM(credit - debit) as balance
        FROM `tabGL Entry`
        WHERE account IN %(accounts)s
          AND company = %(company)s
          AND is_cancelled = 0
          AND posting_date BETWEEN %(start)s AND %(end)s
    """, {"accounts": account_names, "company": company, "start": last_month_start, "end": last_month_end}, as_dict=True)

    current = float(current_total[0].balance or 0) if current_total else 0
    last_month = float(last_month_total[0].balance or 0) if last_month_total else 0

    if last_month != 0:
        pct = ((current - last_month) / abs(last_month)) * 100
        trend_value = f"{'+' if pct >= 0 else ''}{pct:.1f}%"
        trend_up = pct >= 0
    else:
        trend_value = "0%"
        trend_up = True

    return {
        "labelLines": [_("Amil Fund Receipts"), _("(This Month)")],
        "value": format_money(current, currency),
        "currency": currency,
        "trendValue": trend_value,
        "trendLabel": _("vs last month"),
        "trendUp": trend_up,
        "iconHtml": icon_html,
    }


@frappe.whitelist()
def get_kpi_mustahik(company=None):
    """
    Ambil data KPI Penyaluran Mustahik bulan ini.
    """
    company = _resolve_company(company)

    if not company:
        return {"error": _("Company not set")}

    currency, symbol = get_company_currency_symbol(company)

    icon_html = '''
        <svg class="kpi-card__icon" width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="#d97706" stroke-width="1.33333" stroke-linecap="round" stroke-linejoin="round">
            <path d="M3.33333 6.66667L8 2M8 2L12.6667 6.66667M8 2V14"/>
        </svg>
    '''

    mustahik_keywords = ['mustahik', 'penyaluran', 'pencairan', 'distribusi', 'salur']
    all_expense_accounts = frappe.get_all('Account',
        filters={'company': company, 'root_type': 'Expense', 'is_group': 0},
        fields=['name', 'account_name']
    )

    accounts = [
        a for a in all_expense_accounts
        if any(kw in a.account_name.lower() for kw in mustahik_keywords)
    ]

    if not accounts:
        return {
            "labelLines": [_("Mustahik Distribution"), _("(This Month)")],
            "value": format_money(0, currency),
            "trendValue": "0%",
            "trendLabel": _("vs last month"),
            "trendUp": True,
            "iconHtml": icon_html
        }

    account_names = [a.name for a in accounts]
    today = getdate(nowdate())
    month_start = today.replace(day=1)
    last_month_end = month_start - relativedelta(days=1)
    last_month_start = last_month_end.replace(day=1)

    current_total = frappe.db.sql("""
        SELECT SUM(debit - credit) as balance
        FROM `tabGL Entry`
        WHERE account IN %(accounts)s
          AND company = %(company)s
          AND is_cancelled = 0
          AND posting_date BETWEEN %(start)s AND %(end)s
    """, {'accounts': account_names, 'company': company, 'start': month_start, 'end': today}, as_dict=True)

    last_month_total = frappe.db.sql("""
        SELECT SUM(debit - credit) as balance
        FROM `tabGL Entry`
        WHERE account IN %(accounts)s
          AND company = %(company)s
          AND is_cancelled = 0
          AND posting_date BETWEEN %(start)s AND %(end)s
    """, {'accounts': account_names, 'company': company, 'start': last_month_start, 'end': last_month_end}, as_dict=True)

    current = float(current_total[0].balance or 0) if current_total else 0
    last_month = float(last_month_total[0].balance or 0) if last_month_total else 0

    if last_month != 0:
        pct = ((current - last_month) / abs(last_month)) * 100
        trend_value = f"{'+' if pct >= 0 else ''}{pct:.1f}%"
        trend_up = pct >= 0
    else:
        trend_value = "0%"
        trend_up = True

    return {
        "labelLines": [_("Mustahik Distribution"), _("(This Month)")],
        "value": format_money(current, currency),
        "trendValue": trend_value,
        "trendLabel": _("vs last month"),
        "trendUp": trend_up,
        "iconHtml": icon_html
    }


@frappe.whitelist()
def get_audit_trail(company=None, limit=10):
    """
    Ambil transaksi terakhir (Journal Entry / Payment Entry / GL Entry)
    untuk section Audit Trail Realtime.
    """
    company = _resolve_company(company)

    if not company:
        return {"error": _("Company not set")}

    limit = cint(limit) or 10
    currency, symbol = get_company_currency_symbol(company)

    rows = frappe.db.sql("""
        SELECT
            gl.voucher_no    AS ref,
            gl.voucher_type  AS doc_type,
            gl.remarks       AS desc_text,
            gl.debit,
            gl.credit,
            gl.posting_date,
            gl.account
        FROM `tabGL Entry` gl
        WHERE gl.company = %(company)s
          AND gl.is_cancelled = 0
          AND gl.voucher_type IN ('Journal Entry', 'Payment Entry')
        ORDER BY gl.posting_date DESC, gl.creation DESC
        LIMIT %(limit)s
    """, {'company': company, 'limit': limit}, as_dict=True)

    seen = set()
    entries = []

    for r in rows:
        if r.ref in seen:
            continue
        seen.add(r.ref)

        amount = float(r.debit or 0) - float(r.credit or 0)
        doc_type = r.doc_type or 'GL Entry'

        if doc_type == 'Payment Entry':
            label = _('Payment Entry (Incoming)')
            tone  = 'green'
        elif doc_type == 'Journal Entry':
            label = _('Journal Entry (Transfer)')
            tone  = 'blue'
        else:
            label = _('Disbursement (Outgoing)')
            tone  = 'amber'

        acc = frappe.db.get_value('Account', r.account, 'account_name') or r.account or '-'

        entries.append({
            'ref':        r.ref,
            'type':       label,
            'tone':       tone,
            'desc':       r.desc_text or '-',
            'amount':     abs(amount),
            'amount_fmt': format_money(abs(amount), currency),
            'symbol':     symbol,
            'allocation': acc,
            'date':       str(r.posting_date) if r.posting_date else ''
        })

    return {
        'entries':   entries,
        'currency':  currency,
        'symbol':    symbol,
        'last_sync': frappe.utils.now()
    }


@frappe.whitelist()
def get_payment_entry_summary(company=None):
    """
    KPI Summary di atas List View Payment Entry:
    - Total Receive (bulan ini, docstatus=1)
    - Total Pay / Disburse (bulan ini, docstatus=1)
    - Selisih netto kas (receive - disburse)
    """
    company = _resolve_company(company)

    if not company:
        return {"error": _("Company not set")}

    currency, symbol = get_company_currency_symbol(company)
    today = frappe.utils.getdate(frappe.utils.nowdate())
    month_start = today.replace(day=1)

    rec = frappe.db.sql("""
        SELECT
            SUM(paid_amount) AS total,
            COUNT(name) AS cnt
        FROM `tabPayment Entry`
        WHERE company = %(company)s
          AND payment_type = 'Receive'
          AND docstatus = 1
          AND posting_date BETWEEN %(start)s AND %(end)s
    """, {'company': company, 'start': month_start, 'end': today}, as_dict=True)[0] or {}

    pay = frappe.db.sql("""
        SELECT
            SUM(paid_amount) AS total,
            COUNT(name) AS cnt
        FROM `tabPayment Entry`
        WHERE company = %(company)s
          AND payment_type = 'Pay'
          AND docstatus = 1
          AND posting_date BETWEEN %(start)s AND %(end)s
    """, {'company': company, 'start': month_start, 'end': today}, as_dict=True)[0] or {}

    tot_rec = float(rec.get('total') or 0)
    tot_pay = float(pay.get('total') or 0)

    evidence = frappe.db.sql("""
        SELECT
            COUNT(DISTINCT pe.name) AS total,
            COUNT(DISTINCT CASE WHEN f.name IS NOT NULL THEN pe.name END) AS documented
        FROM `tabPayment Entry` pe
        LEFT JOIN `tabFile` f
            ON f.attached_to_doctype = 'Payment Entry'
           AND f.attached_to_name = pe.name
        WHERE pe.company = %(company)s
          AND pe.docstatus = 1
          AND pe.posting_date BETWEEN %(start)s AND %(end)s
    """, {'company': company, 'start': month_start, 'end': today}, as_dict=True)[0] or {}

    ev_total = int(evidence.get('total') or 0)
    ev_documented = int(evidence.get('documented') or 0)

    return {
        "total_receive_fmt":  format_money(tot_rec, currency),
        "count_receive":      int(rec.get('cnt') or 0),
        "total_disburse_fmt": format_money(tot_pay, currency),
        "count_disburse":     int(pay.get('cnt') or 0),
        "total_escrow_fmt":   format_money(tot_rec - tot_pay, currency),
        # Audit evidence completeness: share of this month's submitted entries
        # that carry at least one supporting document (attachment). None when
        # there is no entry to measure, so the card can show a dash instead of
        # a made up 100%.
        "evidence_total":      ev_total,
        "evidence_documented": ev_documented,
        "evidence_pct":        int(round(ev_documented * 100.0 / ev_total)) if ev_total else None
    }


# Pilar dana (fund pillars) -> keyword nama Akun (COA).
# Frontend tidak filter remarks lagi: backend yang petakan pilar -> daftar
# Payment Entry (paid_from/paid_to cocok akun dana), lalu list difilter
# memakai SATU filter `name in [...]` agar konsisten dengan angka badge.
PILAR_ACCOUNT_KEYWORDS = {
    "zakat": ("zakat", "fitrah", "maal"),
    "infak": ("infak", "infaq", "sedekah"),
    "amil": ("amil",),
    "wakaf": ("wakaf", "nazhir", "nazir"),
}

_PILAR_NAME_LIMIT = 1000


def _get_pilar_accounts(company):
    """Petakan pilar -> daftar nama Akun daun yang mengandung keyword pilar."""
    accs = frappe.db.sql("""
        SELECT name, account_name
        FROM `tabAccount`
        WHERE company = %(company)s
          AND is_group = 0
    """, {"company": company}, as_dict=True) or []

    out = {k: [] for k in PILAR_ACCOUNT_KEYWORDS}
    for a in accs:
        nm = (a.get("account_name") or "").lower()
        for k, words in PILAR_ACCOUNT_KEYWORDS.items():
            if any(w in nm for w in words):
                out[k].append(a.get("name"))
                break
    return out


def _pilar_entry_names(company, pilar, limit=None):
    """Daftar nama Payment Entry suatu pilar (akun dana di paid_from ATAU paid_to)."""
    accounts = _get_pilar_accounts(company).get(pilar) or []
    if not accounts:
        return []
    query = """
        SELECT name
        FROM `tabPayment Entry`
        WHERE company = %(company)s
          AND docstatus = 1
          AND (paid_from IN %(accounts)s OR paid_to IN %(accounts)s)
        ORDER BY posting_date DESC, creation DESC
    """
    params = {"company": company, "accounts": tuple(accounts)}
    if limit:
        query += " LIMIT %(limit)s"
        params["limit"] = int(limit)
    rows = frappe.db.sql(query, params, as_dict=True) or []
    return [r.get("name") for r in rows if r.get("name")]


@frappe.whitelist()
def get_pilar_counts(company=None):
    """
    Realtime counts per pilar dana untuk sidebar List View Payment Entry.
    Menghitung record docstatus=1 pada company aktif yang paid_from/paid_to-nya
    adalah akun dana pilar tersebut.
    """
    company = _resolve_company(company)

    if not company:
        return {"error": _("Company not set")}

    accounts = _get_pilar_accounts(company)

    all_c = frappe.db.sql("""
        SELECT COUNT(name) AS c
        FROM `tabPayment Entry`
        WHERE company = %(company)s
          AND docstatus = 1
    """, {"company": company}, as_dict=True)[0].get("c") or 0

    out = {"all": int(all_c)}
    for pilar, accs in accounts.items():
        if not accs:
            out[pilar] = 0
            continue
        c = frappe.db.sql("""
            SELECT COUNT(name) AS c
            FROM `tabPayment Entry`
            WHERE company = %(company)s
              AND docstatus = 1
              AND (paid_from IN %(accounts)s OR paid_to IN %(accounts)s)
        """, {"company": company, "accounts": tuple(accs)}, as_dict=True)[0].get("c") or 0
        out[pilar] = int(c)
    return out


@frappe.whitelist()
def get_pilar_names(pilar, company=None):
    """
    Daftar nama Payment Entry untuk satu pilar (dipakai sebagai
    filter `name in [...]` di list view). Dibatasi _PILAR_NAME_LIMIT
    agar URL tidak raksasa; `total` memberi tahu jumlah sebenarnya.
    """
    if pilar not in PILAR_ACCOUNT_KEYWORDS:
        frappe.throw(_("Unknown fund pillar: {0}").format(pilar))

    company = _resolve_company(company)

    if not company:
        return {"error": _("Company not set")}

    names = _pilar_entry_names(company, pilar, limit=_PILAR_NAME_LIMIT)
    accounts = _get_pilar_accounts(company).get(pilar) or []
    total = 0
    if accounts:
        total = frappe.db.sql("""
            SELECT COUNT(name) AS c
            FROM `tabPayment Entry`
            WHERE company = %(company)s
              AND docstatus = 1
              AND (paid_from IN %(accounts)s OR paid_to IN %(accounts)s)
        """, {"company": company, "accounts": tuple(accounts)}, as_dict=True)[0].get("c") or 0

    return {"names": names, "total": int(total), "capped": int(total) > len(names)}
