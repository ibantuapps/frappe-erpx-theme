"""Company-level configuration for the fund statement report.

The hak amil cap is a regulation that differs per country and per entity, so it
lives on the Company record (with a portable default) instead of being a
constant inside the report JavaScript.
"""

from frappe.custom.doctype.custom_field.custom_field import create_custom_fields

FIELDS = {
	"Company": [
		{
			"fieldname": "custom_amil_cap_section",
			"label": "ZISWAF Fund Statement",
			"fieldtype": "Section Break",
			"insert_after": "country",
			"collapsible": 1,
		},
		{
			"fieldname": "custom_amil_cap_zakat",
			"label": "Hak Amil Cap - Zakat (%)",
			"fieldtype": "Percent",
			"precision": "1",
			"insert_after": "custom_amil_cap_section",
			"default": "12.5",
			"description": "Maximum amil share of zakat receipts, shown by the fund statement report. Change it when the rule differs for this company/country.",
		},
		{
			"fieldname": "custom_amil_cap_non_zakat",
			"label": "Hak Amil Cap - Infaq/Sadaqah & Other Funds (%)",
			"fieldtype": "Percent",
			"precision": "1",
			"insert_after": "custom_amil_cap_zakat",
			"default": "20",
			"description": "Maximum amil share of infaq/sadaqah (and other non-zakat) receipts, shown by the fund statement report.",
		},
	],
}


def execute():
	create_custom_fields(FIELDS, ignore_validate=True)
