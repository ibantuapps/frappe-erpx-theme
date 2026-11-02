/* ERPx fund statements (Zakat / Infak / Amil)
 * Desk UI for the dynamic fund reports. The numbers always come from the
 * report engine (server side), keyed by the selected Company.
 */

(function () {
	const TITLES = {
		id: {
			zakat: "Laporan Perubahan Dana Zakat",
			infak: "Laporan Perubahan Dana Infak & Sedekah",
			amil: "Laporan Perubahan Dana Amil",
		},
		en: {
			zakat: "Zakat Fund Statement",
			infak: "Infak & Sedekah Fund Statement",
			amil: "Amil Fund Statement",
		},
	};

	const SUBTITLES = {
		id: {
			zakat: "Penyajian mutasi dan saldo dana zakat per periode",
			infak: "Mutasi dan saldo dana infak/sedekah terikat dan tidak terikat",
			amil: "Penerimaan dan penggunaan hak amil pengelola ziswaf",
		},
		en: {
			zakat: "Zakat fund movements and balances for the period",
			infak: "Tied and untied infak/sedekah fund movements and balances",
			amil: "Amil share receipts and usage",
		},
	};

	const LABELS = {
		id: {
			opening: "Saldo Awal Dana",
			income: "Total Penerimaan",
			expense: "Total Penyaluran / Penggunaan",
			closing: "Saldo Akhir Dana",
			as_of: "s.d.",
			period: "Periode",
			amount: "Jumlah",
			company: "Entitas",
		},
		en: {
			opening: "Opening Balance",
			income: "Total Receipts",
			expense: "Total Distributions / Usage",
			closing: "Closing Balance",
			as_of: "as of",
			period: "Period",
			amount: "Amount",
			company: "Entity",
		},
	};

	const CONFIG = {
		"Zakat Fund": { fund: "zakat", single: false },
		"Infak Fund": { fund: "infak", single: false },
		"Amil Fund": { fund: "amil", single: true },
	};

	const FIN = {
		"Statement of Financial Position": {
			title: { id: "Statement of Financial Position", en: "Statement of Financial Position" },
			subtitle: { id: "Posisi keuangan per tanggal laporan", en: "Financial position as of the report date" },
			kpis: [
				{ type: "total_asset", label: { id: "Total Aset", en: "Total Assets" }, cls: "" },
				{ type: "total_liability", label: { id: "Total Liabilitas", en: "Total Liabilities" }, cls: "" },
				{ type: "total_equity", label: { id: "Total Ekuitas", en: "Total Equity" }, cls: "" },
				{ type: "check", label: { id: "Liabilitas + Ekuitas", en: "Liabilities + Equity" }, cls: "closing" },
			],
		},
		"Statement of Cash Flows": {
			title: { id: "Statement of Cash Flows", en: "Statement of Cash Flows" },
			subtitle: { id: "Arus kas masuk dan keluar per aktivitas", en: "Cash inflows and outflows by activity" },
			kpis: [
				{ type: "opening", label: { id: "Kas Awal", en: "Opening Cash" }, cls: "" },
				{ type: "total_operating", label: { id: "Arus Kas Operasi", en: "Operating Cash Flow" }, cls: "income" },
				{ type: "total_flow", label: { id: "Arus Kas Bersih", en: "Net Cash Flow" }, cls: "expense" },
				{ type: "closing", label: { id: "Kas Akhir", en: "Closing Cash" }, cls: "closing" },
			],
		},
	};

	function lang() {
		const code = (frappe.boot.lang || "en").split("-")[0];
		return TITLES[code] ? code : "en";
	}

	function t(key) {
		return LABELS[lang()][key];
	}

	function money(value, currency) {
		const sign = value < 0;
		const text = format_currency(Math.abs(flt(value)), currency || "IDR");
		return sign ? `<span class="erpx-neg">(${text})</span>` : text;
	}

	function inject_css() {
		if (document.getElementById("erpx-fund-css")) return;
		const css = `
		.erpx-fund-head { padding: 6px 0 16px; margin-bottom: 12px; border-bottom: 1px solid #e2e8f0; text-align:center; }
		.erpx-fund-head .erpx-title { font-size: 22px; font-weight: 700; color: #11213b; line-height: 1.3; letter-spacing: -0.4px; display:flex; align-items:center; justify-content:center; gap:10px; flex-wrap:wrap; }
		.erpx-fund-head .erpx-sub { font-size: 12px; color: #64748b; margin-top: 4px; }
		.erpx-fund-kpi { display:grid; grid-template-columns: repeat(4, minmax(0,1fr)); gap:12px; margin: 4px 0 16px; }
		.erpx-fund-kpi .card { background:#fff; border:1px solid #e2e8f0; border-radius:8px; padding:12px 14px; min-height:78px; display:flex; flex-direction:column; justify-content:space-between; box-shadow:0 1px 1px rgba(0,0,0,.03); }
		.erpx-fund-kpi .lbl { font-size:10px; font-weight:600; letter-spacing:.6px; text-transform:uppercase; color:#64748b; }
		.erpx-fund-kpi .val { font-size:20px; font-weight:700; color:#11213b; margin-top:6px; }
		.erpx-fund-kpi .card.income { border-top:3px solid #10b981; }
		.erpx-fund-kpi .card.expense { border-top:3px solid #f59e0b; }
		.erpx-fund-kpi .card.closing { background:#11213b; border-color:#11213b; }
		.erpx-fund-kpi .card.closing .lbl { color:#cbd5e1; }
		.erpx-fund-kpi .card.closing .val { color:#fff; }
		.erpx-fund-report .dt-header .dt-cell { background:#ffffff !important; border-bottom:2px solid #cbd5e1 !important; border-top:1px solid #e2e8f0 !important; }
		.erpx-fund-report .dt-header .dt-cell__content { color:#11213b !important; background:transparent !important; font-weight:700; font-size:11px; text-transform:uppercase; letter-spacing:.5px; white-space:nowrap; }
		.erpx-fund-report .dt-row .dt-cell { background:#ffffff !important; border-color:#eef2f7 !important; font-size:13px; }
		.erpx-fund-report .dt-row:hover .dt-cell { background:#f6f9fc !important; }
		.erpx-fund-cell { display:flex; align-items:baseline; gap:10px; padding:3px 0; line-height:1.45; }
		.erpx-acc-code { flex:0 0 76px; color:#64748b; font-family: ui-monospace, SFMono-Regular, Menlo, Consolas, monospace; font-size:11px; letter-spacing:.2px; }
		.erpx-acc-name { color:#1e293b; font-size:12.5px; }
		.erpx-acc-plain { margin-left:0; }
		.erpx-subheader { font-weight:700; color:#1e293b; padding-top:8px; display:block; }
		.erpx-section { font-weight:700; color:#11213b; text-transform:uppercase; letter-spacing:.4px; font-size:11px; padding-top:10px; display:block; }
		.erpx-group { font-weight:600; color:#1e293b; }
		.erpx-account { color:#334155; }
		.erpx-total_income, .erpx-total_expense { font-weight:700; color:#11213b; }
		.erpx-surplus { font-weight:700; color:#0f766e; }
		.erpx-opening { color:#475569; }
		.erpx-other { color:#64748b; font-style:italic; }
		.erpx-closing { font-weight:700; color:#11213b; background:#e8eef7; padding:5px 10px; border-radius:4px; display:inline-block; }
		.erpx-strong { font-weight:700; color:#11213b; }
		.erpx-neg { color:#dc2626; font-weight:500; }
		.erpx-fund-note { font-size:11px; color:#94a3b8; padding:8px 0 0; }
		@media (max-width: 1100px) { .erpx-fund-kpi { grid-template-columns: repeat(2, minmax(0,1fr)); } }
		`;
		$(`<style id="erpx-fund-css">${css}</style>`).appendTo(document.head);
	}

	function decorate(settings) {
		const report = settings._report;
		if (!report || !report.page) return;
		const cfg = CONFIG[settings._report_name];
		const fin = FIN[settings._report_name];
		if (!cfg && !fin) return;

		inject_css();

		const $main = report.page.main;
		const currency = ((report.data || []).find((r) => r && r.currency) || {}).currency;
		const title = fin ? fin.title[lang()] : TITLES[lang()][cfg.fund];
		const subtitle = fin ? fin.subtitle[lang()] : SUBTITLES[lang()][cfg.fund];

		report.page.set_title(title);

		let $head = $main.find(".erpx-fund-head");
		if (!$head.length) {
			$head = $('<div class="erpx-fund-head"></div>').prependTo($main);
		}
		$head.html(`
			<div class="erpx-title">${frappe.utils.escape_html(title)}</div>
			<div class="erpx-sub">${frappe.utils.escape_html(subtitle)}</div>
		`);

		const rows = report.data || [];
		const pick = (type, field) => {
			const row = rows.find((r) => r && r.row_type === type);
			return row ? flt(row[field]) : 0;
		};

		let $kpi = $main.find(".erpx-fund-kpi");
		if (!$kpi.length) {
			$kpi = $('<div class="erpx-fund-kpi"></div>');
			const $wrapper = $main.find(".report-wrapper");
			if ($wrapper.length) $kpi.insertBefore($wrapper);
			else $kpi.appendTo($main);
		}

		if (fin) {
			const cards = fin.kpis
				.map((item) => {
					const label = item.label[lang()];
					const value = pick(item.type, "nilai");
					const cls = ["closing", "income", "expense"].includes(item.cls) ? ` ${item.cls}` : "";
					return `<div class="card${cls}"><span class="lbl">${frappe.utils.escape_html(label)}</span><span class="val">${money(value, currency)}</span></div>`;
				})
				.join("");
			$kpi.html(cards);
		} else {
			const field = cfg.single ? "jumlah" : "total";
			const opening = pick("opening", field);
			const income = pick("total_income", field);
			const expense = pick("total_expense", field);
			const closing = pick("closing", field);
			$kpi.html(`
				<div class="card opening"><span class="lbl">${t("opening")}</span><span class="val">${money(opening, currency)}</span></div>
				<div class="card income"><span class="lbl">${t("income")}</span><span class="val">${money(income, currency)}</span></div>
				<div class="card expense"><span class="lbl">${t("expense")}</span><span class="val">${money(expense, currency)}</span></div>
				<div class="card closing"><span class="lbl">${t("closing")}</span><span class="val">${money(closing, currency)}</span></div>
			`);
		}

		$main.find(".report-wrapper").addClass("erpx-fund-report");
		$main.find(".report-summary").hide();
	}


	function period_label(report) {
		const ptype = report.get_filter_value("period_type") || "Fiscal Year";
		if (ptype === "Fiscal Year") return report.get_filter_value("fiscal_year") || "";
		const from = report.get_filter_value("from_date");
		const to = report.get_filter_value("to_date");
		if (ptype === "Custom") {
			return [from ? frappe.datetime.str_to_user(from) : "", to ? frappe.datetime.str_to_user(to) : ""]
				.filter(Boolean)
				.join(" – ");
		}
		const anchor = from || frappe.datetime.get_today();
		const start = moment(anchor).startOf("month").format("YYYY-MM-DD");
		const end = moment(anchor).endOf("month").format("YYYY-MM-DD");
		return `${frappe.datetime.str_to_user(start)} – ${frappe.datetime.str_to_user(end)}`;
	}

	const CALK_TITLES = {
		"Zakat Fund": ["LAPORAN PERUBAHAN DANA ZAKAT", "STATEMENT OF CHANGES IN ZAKAT FUNDS"],
		"Infak Fund": ["LAPORAN PERUBAHAN DANA INFAK DAN SEDEKAH", "STATEMENT OF CHANGES IN INFAQ AND SADAQAH FUNDS"],
		"Amil Fund": ["LAPORAN PERUBAHAN DANA AMIL", "STATEMENT OF CHANGES IN AMIL FUNDS"],
		"Statement of Financial Position": ["LAPORAN POSISI KEUANGAN", "STATEMENT OF FINANCIAL POSITION"],
		"Statement of Cash Flows": ["LAPORAN ARUS KAS", "STATEMENT OF CASH FLOWS"],
	};

	const ID_MONTHS = ["JANUARI", "FEBRUARI", "MARET", "APRIL", "MEI", "JUNI", "JULI", "AGUSTUS", "SEPTEMBER", "OKTOBER", "NOVEMBER", "DESEMBER"];
	const EN_MONTHS = ["JANUARY", "FEBRUARY", "MARCH", "APRIL", "MAY", "JUNE", "JULY", "AUGUST", "SEPTEMBER", "OCTOBER", "NOVEMBER", "DECEMBER"];

	function calk_date_id(value) {
		if (!value) return "";
		const [y, m, d] = String(value).split("-");
		return `${parseInt(d, 10)} ${ID_MONTHS[parseInt(m, 10) - 1] || m} ${y}`;
	}

	function calk_date_en(value) {
		if (!value) return "";
		const [y, m, d] = String(value).split("-");
		return `${EN_MONTHS[parseInt(m, 10) - 1] || m} ${parseInt(d, 10)}, ${y}`;
	}

	function calk_period(report, is_sfp) {
		const ptype = report.get_filter_value("period_type") || "Fiscal Year";
		const fy = report.get_filter_value("fiscal_year");
		if (ptype === "Fiscal Year") {
			const year = fy || String(new Date().getFullYear());
			if (is_sfp) return { id: `PER 31 DESEMBER ${year}`, en: `AS OF DECEMBER 31, ${year}` };
			return { id: `UNTUK TAHUN YANG BERAKHIR 31 DESEMBER ${year}`, en: `FOR THE YEAR ENDED DECEMBER 31, ${year}` };
		}
		const to = report.get_filter_value("to_date") || report.get_filter_value("from_date");
		const from = report.get_filter_value("from_date");
		if (ptype === "Custom" && from && to && from !== to) {
			return {
				id: `${calk_date_id(from)} SAMPAI ${calk_date_id(to)}`,
				en: `${calk_date_en(from)} TO ${calk_date_en(to)}`,
			};
		}
		const anchor = to || from;
		const day = anchor ? anchor : frappe.datetime.get_today();
		const end = moment(day).endOf("month").format("YYYY-MM-DD");
		return { id: `PER ${calk_date_id(end)}`, en: `AS OF ${calk_date_en(end)}` };
	}

	function calk_header_label(fieldname, label) {
		const map = {
			keterangan: "URAIAN / DESCRIPTION",
			nilai: "SALDO / BALANCE",
			jumlah: "JUMLAH / AMOUNT",
			debit: "DEBIT",
			kredit: "KREDIT",
			total: "TOTAL",
			terikat: "DANA TERIKAT",
			tidak_terikat: "DANA TIDAK TERIKAT",
			perbandingan: "TAHUN LALU / PRIOR YEAR",
			jumlah_perbandingan: "TAHUN LALU / PRIOR YEAR",
			selisih: "SELISIH / DIFFERENCE",
		};
		return map[fieldname] || String(label || fieldname).toUpperCase();
	}

	function calk_number(value, currency) {
		if (value === null || value === undefined || value === "") return "";
		const n = flt(value);
		if (!n) return "-";
		const text = Math.abs(n).toLocaleString("id-ID", { minimumFractionDigits: 0, maximumFractionDigits: 0 });
		return n < 0 ? `(${text})` : text;
	}

	const EN_WORDS = {
		penerimaan: "Receipts", penyaluran: "Distributions", penggunaan: "Usage", beban: "Expenses",
		dana: "Fund", zakat: "Zakat", infak: "Infaq", sedekah: "Sadaqah", amil: "Amil",
		kas: "Cash", bank: "Bank", piutang: "Receivables", persediaan: "Inventories",
		aset: "Assets", "aset tetap": "Fixed Assets", liabilitas: "Liabilities", ekuitas: "Equity",
		utang: "Payables", pajak: "Tax", titipan: "Trust", hibah: "Grant", qurban: "Qurban",
		wakaf: "Waqf", csr: "CSR", apbn: "State Budget", apbd: "Regional Budget",
		surplus: "Surplus", defisit: "Deficit", saldo: "Balance", awal: "Beginning", akhir: "Ending",
		periode: "Period", sebelumnya: "Prior", tahun: "Year", lalu: "Prior",
		total: "Total", jumlah: "Total", lainnya: "Other", lain: "Other",
		gaji: "Salaries", honorarium: "Honorarium", tunjangan: "Allowances", bonus: "Bonus",
		insentif: "Incentives", sewa: "Rent", asuransi: "Insurance", audit: "Audit",
		konsultan: "Consultant", legal: "Legal", listrik: "Electricity", telepon: "Telephone",
		air: "Water", internet: "Internet", transportasi: "Transportation", konsumsi: "Meals",
		pemeliharaan: "Maintenance", penyusutan: "Depreciation", amortisasi: "Amortization",
		publikasi: "Publication", dokumentasi: "Documentation", perjalanan: "Travel",
		dinas: "Business", administrasi: "Administration", umum: "General", kantor: "Office",
		penguatan: "Strengthening", jaringan: "Network", lembaga: "Institution",
		sosialisasi: "Socialization", fundraising: "Fundraising", kerohiman: "Hospitality",
		pendidikan: "Education", kesehatan: "Health", kemanusiaan: "Humanitarian",
		dakwah: "Dakwah", ekonomi: "Economic", khusus: "Restricted", umum: "General",
		terikat: "Restricted", "tidak terikat": "Unrestricted", bagi: "Sharing", hasil: "Income",
		penempatan: "Placement", nilai: "Value", tukar: "Exchange", penilaian: "Valuation",
		fitrah: "Fitrah", mal: "Wealth", perdagangan: "Trade", pertanian: "Agriculture",
		peternakan: "Livestock", emas: "Gold", perak: "Silver", profesi: "Profession",
		entitas: "Entity", individual: "Individual", harta: "Asset", temuan: "Found",
		penjualan: "Sale", operasional: "Operating", operasi: "Operating",
		investasi: "Investing", pendanaan: "Financing", kenaikan: "Increase",
		penurunan: "Decrease", bersih: "Net", setara: "Equivalents", modal: "Capital",
	};

	const EN_PHRASES = [
		[/total liabilitas.*ekuitas/i, "Total Liabilities and Equity"],
		[/total aset/i, "Total Assets"],
		[/total liabilitas/i, "Total Liabilities"],
		[/total ekuitas/i, "Total Equity"],
		[/^aset$/i, "ASSETS"],
		[/^liabilitas$/i, "LIABILITIES"],
		[/^ekuitas$/i, "EQUITY"],
		[/^aset lancar$/i, "Current Assets"],
		[/^aset tidak lancar$/i, "Non-current Assets"],
		[/^liabilitas jangka pendek$/i, "Current Liabilities"],
		[/^liabilitas jangka panjang$/i, "Non-current Liabilities"],
		[/^saldo dana$/i, "Fund Balances"],
		[/saldo awal/i, "Beginning Balance"],
		[/saldo akhir/i, "Ending Balance"],
		[/mutasi dana lainnya/i, "Other Fund Movements"],
		[/surplus/i, "Surplus"],
		[/defisit/i, "Deficit"],
		[/penerimaan/i, "Receipts"],
		[/penyaluran/i, "Distributions"],
		[/penggunaan/i, "Usage"],
		[/jumlah (penerimaan|beban|penyaluran).*/i, "Total"],
		[/total/i, "Total"],
		[/kas dan setara kas/i, "Cash and Cash Equivalents"],
		[/^kas/i, "Cash"],
		[/bank/i, "Bank"],
		[/piutang/i, "Receivables"],
		[/persediaan/i, "Inventories"],
		[/aset tetap/i, "Fixed Assets"],
		[/akumulasi penyusutan/i, "Accumulated Depreciation"],
		[/utang/i, "Payables"],
		[/dana zakat/i, "Zakat Fund"],
		[/dana infak|dana infaq/i, "Infaq Fund"],
		[/sedekah/i, "Sadaqah"],
		[/dana amil/i, "Amil Fund"],
		[/hibah/i, "Grant Fund"],
		[/qurban|kurban/i, "Qurban Fund"],
		[/wakaf/i, "Waqf Fund"],
		[/csr/i, "CSR Fund"],
		[/apbn|apbd/i, "State/Regional Budget Fund"],
		[/dana sosial/i, "Social Fund"],
		[/gaji|honorarium/i, "Salaries and Honorarium"],
		[/tunjangan/i, "Allowances"],
		[/bonus|insentif/i, "Bonus and Incentives"],
		[/sewa/i, "Rent"],
		[/asuransi/i, "Insurance"],
		[/audit/i, "Audit"],
		[/konsultan/i, "Consultant"],
		[/legal/i, "Legal"],
		[/listrik/i, "Electricity"],
		[/telepon|komunikasi/i, "Telephone"],
		[/internet/i, "Internet"],
		[/transportasi|perjalanan/i, "Travel"],
		[/konsumsi/i, "Meals"],
		[/pemeliharaan/i, "Maintenance"],
		[/penyusutan/i, "Depreciation"],
		[/amortisasi/i, "Amortization"],
		[/publikasi|dokumentasi/i, "Publication and Documentation"],
		[/administrasi|umum/i, "General and Administration"],
		[/kantor/i, "Office"],
		[/pendidikan/i, "Education"],
		[/kesehatan/i, "Health"],
		[/kemanusiaan/i, "Humanitarian"],
		[/dakwah/i, "Dakwah"],
		[/ekonomi/i, "Economic"],
		[/penerimaan lain/i, "Other Receipts"],
		[/penyaluran lain|beban lain/i, "Other Distributions and Expenses"],
		[/selisih nilai tukar/i, "Exchange Difference"],
		[/penilaian/i, "Valuation"],
		[/bagi hasil/i, "Revenue Sharing"],
	];

	function en_label(text) {
		const raw = String(text || "").replace(/^[0-9][0-9.\-]*\s{2,}/, "").trim();
		if (!raw) return "";
		const lower = raw.toLowerCase();
		let fund = "";
		if (/zakat/.test(lower)) fund = "Zakat Fund";
		else if (/infak|infaq/.test(lower)) fund = "Infaq Fund";
		else if (/sedekah|sadaqah/.test(lower)) fund = "Sadaqah Fund";
		else if (/amil/.test(lower)) fund = "Amil Fund";
		else if (/hibah/.test(lower)) fund = "Grant Fund";
		else if (/qurban|kurban/.test(lower)) fund = "Qurban Fund";
		else if (/dskl/.test(lower)) fund = "DSKL Fund";
		if (/saldo awal/.test(lower)) return "Beginning Balance" + (fund ? ` - ${fund}` : "");
		if (/saldo akhir/.test(lower)) return "Ending Balance" + (fund ? ` - ${fund}` : "");
		if (/surplus|defisit/.test(lower)) return (fund ? `${fund} ` : "") + "Surplus (Deficit)";
		if (/^penerimaan|penerimaan dana/.test(lower)) return (fund ? `${fund} ` : "") + "Receipts";
		if (/^penyaluran|penyaluran dana/.test(lower)) return (fund ? `${fund} ` : "") + "Distributions";
		if (/^beban|^penggunaan/.test(lower)) return (fund ? `${fund} ` : "") + "Usage";
		for (const [pattern, label] of EN_PHRASES) {
			if (pattern.test(raw)) return label;
		}
		const words = raw.toLowerCase().replace(/[()\/]/g, " ").split(/\s+/).filter(Boolean);
		let translated = 0;
		const out = words.map((w) => {
			const hit = EN_WORDS[w];
			if (hit) {
				translated += 1;
				return hit;
			}
			return w;
		});
		if (!translated) return "";
		return out
			.map((w) => (w.length > 2 ? w.charAt(0).toUpperCase() + w.slice(1) : w.toUpperCase()))
			.join(" ");
	}

	function pdf_html(report, title) {
		const rows = report.data || [];
		const name = report.report_name;
		const is_sfp = name === "Statement of Financial Position";
		const is_scf = name === "Statement of Cash Flows";
		const is_amil = name === "Amil Fund";
		const amount_field = is_sfp || is_scf ? "nilai" : is_amil ? "jumlah" : "total";
		const compare = rows.some((r) => r && Object.prototype.hasOwnProperty.call(r, "perbandingan"));

		const fy = report.get_filter_value("fiscal_year") || String(new Date().getFullYear());
		const prev_fy = String(parseInt(fy, 10) - 1);
		const company = (report.get_filter_value("company") || "").toUpperCase();
		const period = calk_period(report, is_sfp);
		const esc = (v) => frappe.utils.escape_html(String(v == null ? "" : v));
		const [title_id, title_en] = CALK_TITLES[name] || [title, title];

		const keep_types = ["section", "subheader", "total", "subtotal", "total_income", "total_expense", "total_asset", "total_liability", "total_equity", "total_operating", "total_investing", "total_financing", "total_flow", "check", "balance", "opening", "closing", "surplus", "other"];
		const printable = rows.filter((r) => (r.row_type || "account") !== "blank");

		const columns = [
			{ key: "keterangan", label: "URAIAN / DESCRIPTION", cls: "col-desc" },
			{ key: "__notes", label: "CATATAN / NOTES", cls: "col-notes" },
			{ key: amount_field, label: compare ? fy : is_sfp ? "SALDO / BALANCE" : "JUMLAH / AMOUNT", cls: "col-amt" },
		];
		if (compare) columns.push({ key: "perbandingan", label: prev_fy, cls: "col-amt" });
		columns.push({ key: "__en", label: "DESCRIPTION (EN)", cls: "col-en" });

		const head = columns.map((c) => `<th class="${c.cls}">${esc(c.label)}</th>`).join("");
		const bold_types = keep_types;
		const line_types = ["total", "subtotal", "total_income", "total_expense", "total_asset", "total_liability", "total_equity", "total_operating", "total_investing", "total_financing", "total_flow", "check"];

		const body = printable
			.map((row) => {
				const type = row.row_type || "account";
				if (type === "section") {
					const label = (row.keterangan || "").replace(/^[0-9][0-9.\-]*\s{2,}/, "");
					const en = en_label(label);
					return `<tr class="section"><td colspan="${columns.length}">${esc(label)}${en ? ` / <i>${esc(en)}</i>` : ""}</td></tr>`;
				}
				const label = (row.keterangan || "").replace(/^[0-9][0-9.\-]*\s{2,}/, "");
				const lv = Math.min(flt(row.indent) || 0, 5);
				const cells = columns
					.slice(1)
					.map((c) => {
						if (c.key === "__notes") return `<td class="col-notes"></td>`;
						if (c.key === "__en") {
							const en = en_label(label);
							return `<td class="col-en">${en && en.toLowerCase() !== label.toLowerCase() ? esc(en) : ""}</td>`;
						}
						return `<td class="col-amt">${esc(calk_number(row[c.key], row.currency))}</td>`;
					})
					.join("");
				const cls = [];
				if (bold_types.includes(type)) cls.push("bold");
				const all_zero = !flt(row[amount_field]) && !flt(row.perbandingan) && !flt(row.selisih);
				if (all_zero && type === "account") cls.push("zero");
				if (line_types.includes(type)) cls.push("line-top");
				if (type === "closing") cls.push("line-double");
				return `<tr class="${cls.join(" ")}"><td class="col-desc lv${lv}">${esc(label)}</td>${cells}</tr>`;
			})
			.join("");

		const row_count = printable.length;
		const font = row_count > 100 ? 6.2 : row_count > 80 ? 6.7 : row_count > 60 ? 7.3 : row_count > 45 ? 8 : row_count > 34 ? 8.7 : row_count > 26 ? 9.4 : 10;
		const pad = row_count > 60 ? 0.2 : row_count > 40 ? 0.4 : 1;
		const section_pad = row_count > 60 ? 1 : row_count > 40 ? 2 : 4;
		const page_margin = row_count > 60 ? "6mm 7mm 6mm 7mm" : "9mm 10mm 9mm 10mm";

		return `<!DOCTYPE html><html><head><meta charset="utf-8"><style>
			@page { size: A4 portrait; margin: ${page_margin}; }
			* { box-sizing: border-box; }
			body { font-family: "Times New Roman", Times, serif; font-size:${font}pt; color:#000; margin:0; padding:0; line-height:1.1; }
			.calk-hdr { text-align:center; margin-bottom:2px; }
			.calk-hdr .org { font-weight:bold; font-size:${font + 1.8}pt; letter-spacing:.3px; margin-bottom:1px; text-transform:uppercase; }
			.calk-hdr .doc-title { font-size:${font + 0.8}pt; font-weight:bold; margin-bottom:1px; }
			.calk-hdr .doc-date { font-size:${font}pt; margin-bottom:1px; }
			.calk-hdr .cur { font-size:${font - 0.4}pt; }
			.dline { border-top:2px solid #000; border-bottom:1px solid #000; height:1px; margin-bottom:2px; }
			table { width:100%; border-collapse:collapse; table-layout:fixed; }
			th { font-weight:bold; font-size:${font - 0.6}pt; padding:0 2px 1px; vertical-align:bottom; border-bottom:1px solid #000; }
			.col-desc { width:34%; text-align:left; }
			.col-notes { width:7%; text-align:center; }
			.col-amt { width:${compare ? "13%" : "18%"}; text-align:right; padding-right:2px; }
			.col-en { width:${compare ? "20%" : "26%"}; text-align:right; font-style:italic; padding-right:0; }
			th.col-en { text-align:right; }
			td { padding:${pad}px 2px; vertical-align:top; }
			td.col-amt { text-align:right; white-space:nowrap; }
			tr.section td { font-weight:bold; text-transform:uppercase; padding-top:${section_pad}px; }
			tr.bold td { font-weight:bold; }
			tr.zero td { color:#5a5a5a; }
			tr.line-top td { border-top:1px solid #000; padding-top:1px; }
			tr.line-double td { border-top:1px solid #000; border-bottom:2px double #000; padding-top:1px; padding-bottom:1px; }
			.lv0 { padding-left:0; } .lv1 { padding-left:9px; } .lv2 { padding-left:18px; } .lv3 { padding-left:27px; } .lv4 { padding-left:36px; } .lv5 { padding-left:45px; }
			.calk-ft { margin-top:8px; font-size:${font - 0.8}pt; border-top:1px solid #000; padding-top:2px; }
			.calk-ft .id { float:left; width:52%; }
			.calk-ft .en { float:right; width:46%; text-align:right; font-style:italic; }
			.calk-ft::after { content:""; display:table; clear:both; }
			tr, table, .calk-ft { page-break-inside: avoid; }
			table { page-break-after: avoid; }
		</style></head><body>
			<div class="calk-hdr">
				<div class="org">${esc(company)}</div>
				<div class="doc-title">${esc(title_id)} / <i>${esc(title_en)}</i></div>
				<div class="doc-date">${esc(period.id)} / <i>${esc(period.en)}</i></div>
				<div class="cur">(Angka-angka disajikan dalam Rupiah, kecuali dinyatakan lain) / <i>(Figures are presented in Rupiah, unless otherwise stated)</i></div>
			</div>
			<div class="dline"></div>
			<table><thead><tr>${head}</tr></thead><tbody>${body}</tbody></table>
			<div class="calk-ft">
				<div class="id">Catatan atas laporan keuangan merupakan bagian yang tidak terpisahkan dari laporan keuangan secara keseluruhan.</div>
				<div class="en">The accompanying notes form an integral part of these financial statements.</div>
			</div>
		</body></html>`;
	}

	function cetak_pdf(report, title, filename) {
		const html = pdf_html(report, title);
		const fd = new URLSearchParams();
		fd.append("csrf_token", frappe.csrf_token);
		fd.append("html", html);
		fd.append("orientation", "Portrait");
		fetch("/api/method/frappe.utils.print_format.report_to_pdf", {
			method: "POST",
			headers: { "Content-Type": "application/x-www-form-urlencoded" },
			body: fd,
		})
			.then((r) => {
				if (!r.ok) throw new Error("PDF status " + r.status);
				return r.blob();
			})
			.then((blob) => {
				const a = document.createElement("a");
				a.href = URL.createObjectURL(blob);
				a.download = `${filename}.pdf`;
				document.body.appendChild(a);
				a.click();
				document.body.removeChild(a);
				setTimeout(() => URL.revokeObjectURL(a.href), 1000);
			})
			.catch((error) => {
				console.error("PDF gagal:", error);
				frappe.msgprint(__("Gagal membuat PDF. Periksa konfigurasi PDF server."));
			});
	}

	function make_report(name, fund, single) {
		const settings = {
			_report_name: name,
			_report: null,
			filters: [
				{
					fieldname: "company",
					label: __("Company"),
					fieldtype: "Link",
					options: "Company",
					reqd: 1,
					default: frappe.defaults.get_user_default("Company"),
				},
				{
					fieldname: "period_type",
					label: __("Periode"),
					fieldtype: "Select",
					options: "Bulanan\nFiscal Year\nCustom",
					default: "Fiscal Year",
					reqd: 1,
				},
				{
					fieldname: "fiscal_year",
					label: __("Fiscal Year"),
					fieldtype: "Link",
					options: "Fiscal Year",
					default: (frappe.boot.sysdefaults && frappe.boot.sysdefaults.fiscal_year) || frappe.defaults.get_user_default("fiscal_year"),
					depends_on: "eval:doc.period_type=='Fiscal Year'",
				},
				{
					fieldname: "from_date",
					label: __("Bulan / Dari Tanggal"),
					fieldtype: "Date",
					default: frappe.datetime.month_start().slice(0, 10),
					depends_on: "eval:doc.period_type=='Bulanan' || doc.period_type=='Custom'",
				},
				{
					fieldname: "to_date",
					label: __("Sampai Tanggal"),
					fieldtype: "Date",
					default: frappe.datetime.get_today(),
					depends_on: "eval:doc.period_type=='Custom'",
				},
				{
					fieldname: "show_zero",
					label: __("Tampilkan akun bernilai nol"),
					fieldtype: "Check",
					default: 1,
				},
			],
			onload(report) {
				settings._report = report;
				if (!report.__erpx_pdf_btn) {
					const fin = FIN[name];
					const title = fin ? fin.title[lang()] : TITLES[lang()][fund];
					report.__erpx_pdf_btn = report.page.add_inner_button(__("Cetak PDF"), () => {
						cetak_pdf(report, title, title.replace(/[^A-Za-z0-9]+/g, "_"));
					});
				}
			},
			formatter(value, row, column, data, default_formatter) {
				if (!data) return default_formatter(value, row, column, data);
				if (column.fieldname === "keterangan") {
					const raw = data.keterangan || "";
					if (!raw) return "";
					const type = data.row_type || "account";
					const indent = Math.min(flt(data.indent) || 0, 4) * 18;
					const match = /^([0-9][0-9.\-]*)\s{2,}(.+)$/.exec(raw);
					const inner = match
						? `<span class="erpx-acc-code">${frappe.utils.escape_html(match[1])}</span><span class="erpx-acc-name">${frappe.utils.escape_html(match[2])}</span>`
						: `<span class="erpx-acc-name erpx-acc-plain">${frappe.utils.escape_html(raw)}</span>`;
					return `<div class="erpx-fund-cell erpx-${type}" style="padding-left:${indent}px">${inner}</div>`;
				}
				if (["section", "blank", "empty", "subheader"].includes(data.row_type)) return "";
				if (value === null || value === undefined || value === "") return "";
				const currency = data.currency || "IDR";
				if (flt(value) < 0) {
					return `<span class="erpx-neg">(${format_currency(Math.abs(flt(value)), currency)})</span>`;
				}
				if (["total", "total_income", "total_expense", "surplus", "closing", "total_asset", "total_liability", "total_equity", "total_operating", "total_investing", "total_financing", "total_flow", "check", "balance", "subtotal"].includes(data.row_type)) {
					return `<span class="erpx-strong">${format_currency(flt(value), currency)}</span>`;
				}
				return format_currency(flt(value), currency);
			},
			after_datatable_render(datatable) {
				decorate(settings);
			},
		};
		frappe.query_reports[name] = settings;
	}

	// Backward-compatible alias used by the report doc names.
	make_report("Zakat Fund", "zakat", false);
	make_report("Infak Fund", "infak", false);
	make_report("Amil Fund", "amil", true);
	make_report("Statement of Financial Position", "balance_sheet", true);
	make_report("Statement of Cash Flows", "cashflow", true);
})();
