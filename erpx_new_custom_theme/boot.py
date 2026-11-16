"""Per-session configuration shared by the fund statement report and the KPI cards.

Everything is resolved once per session instead of on every render, and every
lookup is defensive:

* the hak amil caps come from the Company custom fields when they exist (they are
  created by this app's patch on ``bench migrate``), otherwise the portable
  defaults below apply - so no cap is hardcoded per country in the UI,
* only the companies the session user may read are shipped to the desk.
"""

import frappe

DEFAULT_AMIL_CAP_ZAKAT = 12.5
DEFAULT_AMIL_CAP_NON_ZAKAT = 20.0

AMIL_CAP_FIELDS = (
	("zakat", "custom_amil_cap_zakat"),
	("non_zakat", "custom_amil_cap_non_zakat"),
)


def get_amil_caps(company=None):
	"""Hak amil cap in percent for one company (falls back to the defaults)."""
	caps = {"zakat": DEFAULT_AMIL_CAP_ZAKAT, "non_zakat": DEFAULT_AMIL_CAP_NON_ZAKAT}
	if not company or not frappe.db.exists("Company", company):
		return caps

	meta = frappe.get_meta("Company")
	for key, fieldname in AMIL_CAP_FIELDS:
		if not meta.has_field(fieldname):
			continue
		value = frappe.db.get_value("Company", company, fieldname)
		if value not in (None, ""):
			caps[key] = float(value)
	return caps


def boot_session(bootinfo):
	"""Ship the per-company report configuration to the desk (``frappe.boot``).

	Never fatal: a boot hook that raises would break the whole desk, so failures
	are logged and the report falls back to the defaults above.
	"""
	bootinfo.erpx_report_config = {}

	# Logo sidebar: ikuti Website Settings -> Brand Image (app_logo),
	# fallback ke Navbar Settings / hook app_logo_url.
	try:
		from frappe.core.doctype.navbar_settings.navbar_settings import get_app_logo

		bootinfo.erpx_app_logo = get_app_logo()
	except Exception:
		bootinfo.erpx_app_logo = None

	# Nama entitas untuk brand header sidebar.
	bootinfo.erpx_company_name = (
		frappe.defaults.get_user_default("company") or frappe.local.site
	)

	if frappe.session.user == "Guest":
		return

	try:
		# Peta caps di-cache global (bukan per user): nilainya sama untuk
		# semua user dan jarang berubah.
		caps_map = frappe.cache.get_value("erpx:amil_caps_map")
		if caps_map is None:
			meta = frappe.get_meta("Company")
			fields = [f for _k, f in AMIL_CAP_FIELDS if meta.has_field(f)]
			caps_map = {}
			for c in frappe.get_all(
				"Company", fields=["name"] + fields, limit_page_length=0, order_by="name asc"
			):
				caps = {"zakat": DEFAULT_AMIL_CAP_ZAKAT, "non_zakat": DEFAULT_AMIL_CAP_NON_ZAKAT}
				for key, fieldname in AMIL_CAP_FIELDS:
					value = c.get(fieldname) if fieldname in fields else None
					if value not in (None, ""):
						caps[key] = float(value)
				caps_map[c.name] = caps
			frappe.cache.set_value("erpx:amil_caps_map", caps_map, expires_in_sec=600)

		company_names = frappe.get_list(
			"Company", pluck="name", limit_page_length=0, order_by="name asc"
		)
		default_caps = {"zakat": DEFAULT_AMIL_CAP_ZAKAT, "non_zakat": DEFAULT_AMIL_CAP_NON_ZAKAT}
		bootinfo.erpx_report_config = {
			name: caps_map.get(name, default_caps) for name in company_names
		}
	except Exception:
		frappe.log_error(
			title="ERPX report config could not be loaded",
			message=frappe.get_traceback(),
		)
