"""Website context overrides for this app.

The stock login page renders its heading as ``_("Login to {0}").format(app_name)``
(see ``frappe/www/login.html``), and ``frappe/www/login.py`` resolves that name as:

    Website Settings.app_name  ->  System Settings.app_name  ->  _("Frappe")

Those are stored values, so they have to be maintained by hand and a fresh
install leaks the upstream brand. Here the name is derived from the site itself
instead, with an optional per-site override in ``site_config.json``:

    { "app_name": "ERPx" }

Nothing is hardcoded: change the site/host or the config and the heading follows.
"""

import frappe


def get_site_app_name():
	"""Human label for the current site: config override, else the host label."""
	configured = frappe.conf.get("app_name")
	if configured:
		return configured

	host = (frappe.local.site or "").split(":")[0]
	return host.split(".")[0] if host else ""


def update_website_context(context):
	"""Hook: runs after ``login.get_context()``, so it can override ``app_name``.

	Scoped to the login page (``login.py`` sets ``context.for_test`` to the
	template it renders), so no other website page is touched.
	"""
	if context.get("for_test") != "login.html":
		return

	app_name = get_site_app_name()
	if app_name:
		return {"app_name": app_name}
