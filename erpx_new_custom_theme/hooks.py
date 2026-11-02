app_name = "erpx_new_custom_theme"
app_title = "Erpx New Custom Theme"
app_publisher = "akbar"
app_description = "ERPX New Custom Theme"
app_email = "tm@ibantu.co"
app_license = "mit"

import os


def _static_asset_url(url_path, file_path):
    try:
        return f"{url_path}?v={int(os.path.getmtime(file_path))}"
    except OSError:
        return url_path

# Apps
# ------------------

# required_apps = []

# Each item in the list will be shown as an app in the apps page
# add_to_apps_screen = [
# 	{
# 		"name": "erpx_new_custom_theme",
# 		"logo": "/assets/erpx_new_custom_theme/logo.png",
# 		"title": "Erpx New Custom Theme",
# 		"route": "/erpx_new_custom_theme",
# 		"has_permission": "erpx_new_custom_theme.api.permission.has_app_permission"
# 	}
# ]

# Includes in <head>
# ------------------

#app_include_css = "/assets/erpx_new_custom_theme/css/custom2.css"
app_include_css = [
    "/assets/erpx_new_custom_theme/css/custom2.css",
    "/assets/erpx_new_custom_theme/css/frappe-list-modern.css",
    "/assets/erpx_new_custom_theme/css/coa_card_view.bundle.css",
    "/assets/erpx_new_custom_theme/css/kpi_card.bundle.css",
    "/assets/erpx_new_custom_theme/css/je_kpi.bundle.css",
    "/assets/erpx_new_custom_theme/css/pe_pilar_filter.bundle.css",
    "/assets/erpx_new_custom_theme/css/arus_kas.bundle.css",
    "/assets/erpx_new_custom_theme/css/infak_report.bundle.css",
]


app_include_js = [
    "/assets/erpx_new_custom_theme/js/custom14.js",
    _static_asset_url(
        "/assets/erpx_new_custom_theme/js/fund_report.js",
        os.path.join(os.path.dirname(__file__), "public", "js", "fund_report.js"),
    ),
    "/assets/erpx_new_custom_theme/js/coa_card_view.bundle.js",
    "/assets/erpx_new_custom_theme/js/kpi_card.bundle.js",
    "/assets/erpx_new_custom_theme/js/kpi_card_ziswaf.bundle.js",
    "/assets/erpx_new_custom_theme/js/kpi_card_mustahik.bundle.js",
    "/assets/erpx_new_custom_theme/js/audit_trail_block.bundle.js"
]

doctype_list_js = {
    "Payment Entry": "public/js/payment_entry_list.bundle.js",
    "Journal Entry": "public/js/journal_entry_list.bundle.js"
}

# Desk boot: per-company report configuration (hak amil caps, ...) so the report
# and the KPI cards read it once per session instead of querying per render.
boot_session = "erpx_new_custom_theme.boot.boot_session"

# include js, css files in header of desk.html
# app_include_css = "/assets/erpx_new_custom_theme/css/erpx_new_custom_theme.css"
# app_include_js = "/assets/erpx_new_custom_theme/js/erpx_new_custom_theme.js"

# include js, css files in header of web template
# web_include_css = "/assets/erpx_new_custom_theme/css/erpx_new_custom_theme.css"
# web_include_js = "/assets/erpx_new_custom_theme/js/erpx_new_custom_theme.js"

# Login page skin (Figma ERPx, node 7:15). Scoped to body[data-path="login"].
# This is a plain (non-bundle) static file, so nginx serves it with a one-year
# max-age. The file mtime is appended as a cache-buster: after editing the CSS
# and running `bench clear-cache`, the URL changes and browsers fetch the new
# version without a hard reload. No version number is written by hand.
web_include_css = _static_asset_url(
    "/assets/erpx_new_custom_theme/css/login_erpx.css",
    os.path.join(os.path.dirname(__file__), "public", "css", "login_erpx.css"),
)

# Login heading: derive the app name from the site instead of storing/hardcoding it.
update_website_context = ["erpx_new_custom_theme.website.update_website_context"]

# include custom scss in every website theme (without file extension ".scss")
# website_theme_scss = "erpx_new_custom_theme/public/scss/website"

# include js, css files in header of web form
# webform_include_js = {"doctype": "public/js/doctype.js"}
# webform_include_css = {"doctype": "public/css/doctype.css"}

# include js in page
# page_js = {"page" : "public/js/file.js"}

# include js in doctype views
# doctype_js = {"doctype" : "public/js/doctype.js"}
# doctype_list_js = {"doctype" : "public/js/doctype_list.js"}
# doctype_tree_js = {"doctype" : "public/js/doctype_tree.js"}
# doctype_calendar_js = {"doctype" : "public/js/doctype_calendar.js"}

# Svg Icons
# ------------------
# include app icons in desk
# app_include_icons = "erpx_new_custom_theme/public/icons.svg"

# Home Pages
# ----------

# application home page (will override Website Settings)
# home_page = "login"

# website user home page (by Role)
# role_home_page = {
# 	"Role": "home_page"
# }

# Generators
# ----------

# automatically create page for each record of this doctype
# website_generators = ["Web Page"]

# Jinja
# ----------

# add methods and filters to jinja environment
# jinja = {
# 	"methods": "erpx_new_custom_theme.utils.jinja_methods",
# 	"filters": "erpx_new_custom_theme.utils.jinja_filters"
# }

# Installation
# ------------

# before_install = "erpx_new_custom_theme.install.before_install"
# after_install = "erpx_new_custom_theme.install.after_install"

# Uninstallation
# ------------

# before_uninstall = "erpx_new_custom_theme.uninstall.before_uninstall"
# after_uninstall = "erpx_new_custom_theme.uninstall.after_uninstall"

# Integration Setup
# ------------------
# To set up dependencies/integrations with other apps
# Name of the app being installed is passed as an argument

# before_app_install = "erpx_new_custom_theme.utils.before_app_install"
# after_app_install = "erpx_new_custom_theme.utils.after_app_install"

# Integration Cleanup
# -------------------
# To clean up dependencies/integrations with other apps
# Name of the app being uninstalled is passed as an argument

# before_app_uninstall = "erpx_new_custom_theme.utils.before_app_uninstall"
# after_app_uninstall = "erpx_new_custom_theme.utils.after_app_uninstall"

# Desk Notifications
# ------------------
# See frappe.core.notifications.get_notification_config

# notification_config = "erpx_new_custom_theme.notifications.get_notification_config"

# Permissions
# -----------
# Permissions evaluated in scripted ways

# permission_query_conditions = {
# 	"Event": "frappe.desk.doctype.event.event.get_permission_query_conditions",
# }
#
# has_permission = {
# 	"Event": "frappe.desk.doctype.event.event.has_permission",
# }

# DocType Class
# ---------------
# Override standard doctype classes

# override_doctype_class = {
# 	"ToDo": "custom_app.overrides.CustomToDo"
# }

# Document Events
# ---------------
# Hook on document methods and events

# doc_events = {
# 	"*": {
# 		"on_update": "method",
# 		"on_cancel": "method",
# 		"on_trash": "method"
# 	}
# }

# Scheduled Tasks
# ---------------

# scheduler_events = {
# 	"all": [
# 		"erpx_new_custom_theme.tasks.all"
# 	],
# 	"daily": [
# 		"erpx_new_custom_theme.tasks.daily"
# 	],
# 	"hourly": [
# 		"erpx_new_custom_theme.tasks.hourly"
# 	],
# 	"weekly": [
# 		"erpx_new_custom_theme.tasks.weekly"
# 	],
# 	"monthly": [
# 		"erpx_new_custom_theme.tasks.monthly"
# 	],
# }

# Testing
# -------

# before_tests = "erpx_new_custom_theme.install.before_tests"

# Overriding Methods
# ------------------------------
#
# override_whitelisted_methods = {
# 	"frappe.desk.doctype.event.event.get_events": "erpx_new_custom_theme.event.get_events"
# }
#
# each overriding function accepts a `data` argument;
# generated from the base implementation of the doctype dashboard,
# along with any modifications made in other Frappe apps
# override_doctype_dashboards = {
# 	"Task": "erpx_new_custom_theme.task.get_dashboard_data"
# }

# exempt linked doctypes from being automatically cancelled
#
# auto_cancel_exempted_doctypes = ["Auto Repeat"]

# Ignore links to specified DocTypes when deleting documents
# -----------------------------------------------------------

# ignore_links_on_delete = ["Communication", "ToDo"]

# Request Events
# ----------------
# before_request = ["erpx_new_custom_theme.utils.before_request"]
# after_request = ["erpx_new_custom_theme.utils.after_request"]

# Job Events
# ----------
# before_job = ["erpx_new_custom_theme.utils.before_job"]
# after_job = ["erpx_new_custom_theme.utils.after_job"]

# User Data Protection
# --------------------

# user_data_fields = [
# 	{
# 		"doctype": "{doctype_1}",
# 		"filter_by": "{filter_by}",
# 		"redact_fields": ["{field_1}", "{field_2}"],
# 		"partial": 1,
# 	},
# 	{
# 		"doctype": "{doctype_2}",
# 		"filter_by": "{filter_by}",
# 		"partial": 1,
# 	},
# 	{
# 		"doctype": "{doctype_3}",
# 		"strict": False,
# 	},
# 	{
# 		"doctype": "{doctype_4}"
# 	}
# ]

# Authentication and authorization
# --------------------------------

# auth_hooks = [
# 	"erpx_new_custom_theme.auth.validate"
# ]

# Automatically update python controller files with type annotations for this app.
# export_python_type_annotations = True

# default_log_clearing_doctypes = {
# 	"Logging DocType Name": 30  # days to retain logs
# }

# Translation
# ------------
# List of apps whose translatable strings should be excluded from this app's translations.
# ignore_translatable_strings_from = []

