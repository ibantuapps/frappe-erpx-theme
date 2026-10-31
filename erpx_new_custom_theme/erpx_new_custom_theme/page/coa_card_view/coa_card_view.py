# ============================================================
# ERPX - COA Card View Page
# Custom desk page for Chart of Accounts card view
# ============================================================

import frappe
from frappe import _


def get_context(context):
    """Context for the COA Card View page."""
    context.title = _("Chart of Accounts")
    context.parents = [{"label": _("Accounting"), "route": "/app/accounting"}]
    context.show_sidebar = True
    
    # Add required assets
    context.css = [
        "/assets/erpx_new_custom_theme/css/coa_card_view.css"
    ]
    context.js = [
        "/assets/erpx_new_custom_theme/js/coa_card_view.js"
    ]
    
    return context
