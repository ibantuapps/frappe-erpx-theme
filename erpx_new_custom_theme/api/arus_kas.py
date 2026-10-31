# ============================================================
# ERPX New Custom Theme - Arus Kas API
# Rincian rekening Kas & Bank untuk section Figma report Arus Kas
# ============================================================

import frappe


@frappe.whitelist()
def get_bank_breakdown(company=None, to_date=None):
    """Saldo buku per rekening Kas/Bank s/d to_date (data GL, tanpa nilai rekaan).

    Pengenalan rekening kas/bank memakai Account.account_type lebih dulu,
    lalu kata kunci generik sebagai cadangan untuk COA tanpa account_type.
    """
    if not company:
        company = frappe.defaults.get_user_default("company")
    if not to_date:
        to_date = frappe.utils.nowdate()

    accs = frappe.get_all("Account",
        filters={"company": company, "is_group": 0, "root_type": "Asset"},
        fields=["name", "account_name", "account_number", "account_type"],
        limit_page_length=0)

    # Kata kunci generik (tanpa merek bank / tanpa istilah khas negara tertentu).
    cash_kw = ["kas", "cash", "bank", "giro", "deposito", "tabungan"]
    bank_kw = ["bank", "giro", "deposito", "tabungan"]
    rows = []
    total = 0.0

    for a in accs:
        nm = (a.get("account_name") or "").lower()
        a_type = a.get("account_type") or ""
        is_cash = (a_type in ("Cash", "Bank")
                   or any(k in nm for k in cash_kw))
        if not is_cash:
            continue
        is_bank = (a_type == "Bank" or any(k in nm for k in bank_kw))
        bal = frappe.db.sql(
            """SELECT IFNULL(SUM(debit - credit), 0) FROM `tabGL Entry`
               WHERE is_cancelled = 0 AND company = %s
                 AND posting_date <= %s AND account = %s""",
            (company, to_date, a["name"]))
        v = float(bal[0][0]) if bal else 0.0
        total += v
        rows.append({
            "account": a["name"],
            "label": a.get("account_name") or a["name"],
            "nomor": a.get("account_number") or "-",
            "kind": "bank" if is_bank else "kas",
            "saldo_buku": v,
        })

    rows.sort(key=lambda r: r["label"])
    return {"rows": rows, "total": total,
            "company": company, "to_date": str(to_date)}
