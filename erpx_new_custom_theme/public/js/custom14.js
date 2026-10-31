/* ============================================================
   Custom JS — erpx_new_custom_theme
   ============================================================ */

// ERPx: sidebar workspace di-collapse -> rail ikon saja
// (Figma node 4:11 "Sidebar (close)": rail 144px, ikon saja)
//
// File ini sudah dimuat lewat app_include_js (non-bundle), jadi
// tidak perlu ubah hooks.py maupun bench build.
//
// Kenapa perlu JS: tombol toggle bawaan Frappe memanggil
// `.layout-side-section.toggle()` alias `display:none`, sehingga
// sidebar hilang total. Di sini klik ditangkap lebih dulu
// (capture phase) lalu hanya menambah class di <body>.
(function () {
  const STORAGE_KEY = "erpx:sidebar-mini";
  const MINI_CLASS = "erpx-sidebar-mini";
  const DESKTOP_MIN = 992;

  const is_mini = () => document.body.classList.contains(MINI_CLASS);

  function set_mini(mini, persist) {
    document.body.classList.toggle(MINI_CLASS, !!mini);
    if (persist !== false) {
      try {
        localStorage.setItem(STORAGE_KEY, mini ? "1" : "0");
      } catch (e) {
        /* private mode: abaikan */
      }
    }
    sync_toggle_icon();
  }

  function restore_state() {
    let saved = null;
    try {
      saved = localStorage.getItem(STORAGE_KEY);
    } catch (e) {
      saved = null;
    }
    set_mini(saved === "1", false);
  }

  // Frappe mengganti ikon toggle di update_sidebar_icon(), yang hanya
  // dipanggil dari handler klik bawaan. Karena handler itu diblokir,
  // ikon kita ganti sendiri: chevron collapse <-> chevron expand.
  function sync_toggle_icon() {
    if (!window.frappe || !frappe.utils || !frappe.utils.icon) return;
    const icon = is_mini() ? "es-line-sidebar-expand" : "es-line-sidebar-collapse";
    document
      .querySelectorAll("#page-Workspaces .page-head .sidebar-toggle-icon")
      .forEach(function (el) {
        if (el.dataset.erpxIcon === icon) return;
        el.innerHTML = frappe.utils.icon(icon, "md");
        el.dataset.erpxIcon = icon;
      });
  }

  document.addEventListener(
    "click",
    function (event) {
      const target = event.target;
      if (!target || !target.closest) return;
      if (!target.closest(".sidebar-toggle-btn")) return;

      // Hanya untuk sidebar workspace yang SEDANG TAMPIL. Container
      // #page-Workspaces tetap ada di DOM (display:none) walau user
      // sedang di halaman list/form, jadi cek offsetWidth dulu.
      // Sidebar filter list/form tetap memakai perilaku bawaan Frappe.
      const workspace_page = document.getElementById("page-Workspaces");
      if (!workspace_page || !workspace_page.offsetWidth) return;
      if (!workspace_page.querySelector(".desk-sidebar")) return;

      // Mobile: biarkan Frappe membuka overlay sidebar.
      if (window.innerWidth < DESKTOP_MIN) return;

      event.preventDefault();
      event.stopPropagation();
      event.stopImmediatePropagation();
      set_mini(!is_mini());
    },
    true
  );

  // Kalau sidebar sempat di-collapse di mobile (display:none) lalu
  // layar dilebarkan, bersihkan inline style supaya sidebar muncul.
  window.addEventListener("resize", function () {
    if (window.innerWidth < DESKTOP_MIN) return;
    document.querySelectorAll(".layout-side-section").forEach(function (el) {
      if (el.style.display === "none") el.style.display = "";
    });
  });

  function start() {
    restore_state();
    sync_toggle_icon();
    // ikon di page-head bisa dibuat ulang saat pindah halaman
    if (window.jQuery) {
      jQuery(document).on("page-change", function () {
        setTimeout(sync_toggle_icon, 0);
      });
    }
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", start);
  } else {
    start();
  }
})();

/* ============================================================
   Journal Entry — Validation Footer card (Figma node 634:3372)
   Card di bawah tabel Accounting Entries: status balance +
   Total Debit / Total Credit.

   PENTING: sengaja ditaruh di file ini (app_include_js = static file)
   dan BUKAN di doctype_js, karena isi doctype_js dibaca server lalu
   disimpan di cache redis "doctype_meta" -- setiap perubahan butuh
   clear-cache dan file tidak pernah sampai ke browser.

   Sumber angka: baris tabel "Accounting Entries" (Journal Entry Account),
   persis seperti cur_frm.cscript.update_totals milik ERPNext:
     total_debit  = SUM(debit)   -> Debit in Company Currency
     total_credit = SUM(credit)  -> Credit in Company Currency
     difference   = total_debit - total_credit
   Field doc.total_debit/total_credit/difference sengaja TIDAK dibaca,
   karena itu field read-only hasil hitung ERPNext yang bisa tertinggal
   (0 / "") dan membuat card salah menyebut "balanced".
   ============================================================ */
(function () {
  var CARD_CLASS = "erpx-je-validation";

  function t(s) {
    return typeof __ === "function" ? __(s) : s;
  }

  function company_currency(frm) {
    try {
      if (frm.doc.company) {
        var company = frappe.get_doc(":Company", frm.doc.company);
        if (company && company.default_currency) return company.default_currency;
      }
    } catch (e) {
      /* company belum dipilih / belum ter-load */
    }
    var options = (frappe.boot && frappe.boot.sysdefaults) || {};
    return options.currency || "";
  }

  function money(value, currency) {
    var amount = flt(value || 0);
    // Figma menampilkan tanpa desimal (Rp 2.500.000), tapi kalau memang
    // ada pecahan tetap ditampilkan supaya tidak menyesatkan.
    var decimals = Math.abs(amount % 1) > 0.004 ? undefined : 0;
    if (typeof format_currency === "function") {
      return format_currency(amount, currency, decimals);
    }
    return amount.toFixed(decimals === 0 ? 0 : 2);
  }

  function icon(state) {
    var head =
      '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" ' +
      'stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">';
    if (state === "unbalanced") {
      return (
        head +
        '<circle cx="12" cy="12" r="9"/><path d="M12 7.4v5.7"/>' +
        '<circle cx="12" cy="16.7" r="0.9" fill="currentColor" stroke="none"/></svg>'
      );
    }
    if (state === "empty") {
      return head + '<circle cx="12" cy="12" r="9"/><path d="M8.2 12h7.6"/></svg>';
    }
    return head + '<circle cx="12" cy="12" r="9"/><path d="M8.2 12.3l2.6 2.6 5-5.4"/></svg>';
  }

  function total_block(kind, label) {
    return $('<div class="erpx-je-validation-total erpx-je-validation-total--' + kind + '">')
      .append($('<span class="erpx-je-validation-label">').text(t(label)))
      .append($('<span class="erpx-je-validation-value">'));
  }

  function make_card() {
    return $('<div class="' + CARD_CLASS + '" role="status" aria-live="polite">')
      .append(
        $('<div class="erpx-je-validation-status">')
          .append($('<span class="erpx-je-validation-icon">'))
          .append($('<span class="erpx-je-validation-text">'))
      )
      .append(
        $('<div class="erpx-je-validation-totals">')
          .append(total_block("debit", "Total Debit"))
          .append(total_block("credit", "Total Credit"))
      );
  }

  function get_card(frm) {
    var $control = frm.fields_dict.accounts && frm.fields_dict.accounts.$wrapper;
    if (!$control || !$control.length) return null;

    var $card = $control.next("." + CARD_CLASS);
    if (!$card.length) {
      $card = make_card();
      $control.after($card);
    }
    return $card;
  }

  function round_amount(value, fieldname, doc) {
    var p = 2;
    try {
      if (typeof precision === "function") p = precision(fieldname, doc);
    } catch (e) {
      /* pakai default 2 desimal */
    }
    return flt(value, p);
  }

  // Sama seperti cur_frm.cscript.update_totals milik ERPNext:
  //   total_debit  = SUM(accounts[].debit)    -> Debit in Company Currency
  //   total_credit = SUM(accounts[].credit)   -> Credit in Company Currency
  //   difference   = total_debit - total_credit
  //
  // Catatan penting soal "dua jenis angka" di JE:
  //   - debit / credit                    = mata uang COMPANY (yang dipakai
  //                                         ERPNext untuk cek balance)
  //   - debit_in_account_currency / ...   = mata uang AKUN (kolom Debit/Credit
  //                                         yang tampil di tabel)
  // Kalau single currency (multi_currency = 0) dan exchange_rate = 1, keduanya
  // wajib sama. Kalau ternyata beda (field company belum/stale ter-update),
  // pakai angka mata uang akun supaya card sama dengan yang dilihat user.
  function uses_account_currency(frm) {
    if (frm.doc.multi_currency) return false;
    return (frm.doc.accounts || []).every(function (row) {
      var rate = flt(row.exchange_rate);
      return !rate || Math.abs(rate - 1) < 1e-9;
    });
  }

  function row_amount(row, kind, prefer_account_currency) {
    var account_amount = flt(row[kind + "_in_account_currency"]);
    var company_amount = flt(row[kind]);

    if (prefer_account_currency && account_amount)
      return round_amount(account_amount, kind, row);

    if (company_amount) return round_amount(company_amount, kind, row);

    // ERPNext belum sempat konversi (baris baru / multi currency):
    // hitung sendiri dari mata uang akun x exchange rate.
    if (!account_amount) return 0;
    var rate = flt(row.exchange_rate) || 1;
    return round_amount(account_amount * rate, kind, row);
  }

  function balance_state(frm) {
    var debit = 0;
    var credit = 0;
    var prefer_account_currency = uses_account_currency(frm);

    (frm.doc.accounts || []).forEach(function (row) {
      debit += row_amount(row, "debit", prefer_account_currency);
      credit += row_amount(row, "credit", prefer_account_currency);
    });

    var diff = round_amount(debit - credit, "difference", frm.doc);

    if (!debit && !credit) return { state: "empty", debit: debit, credit: credit, diff: diff };
    if (Math.abs(diff) > 0.005)
      return { state: "unbalanced", debit: debit, credit: credit, diff: diff };
    return { state: "balanced", debit: debit, credit: credit, diff: diff };
  }

  function status_text(info, currency) {
    if (info.state === "empty") return t("No entries yet");
    if (info.state === "unbalanced") {
      return (
        t("Not Balanced") + " \u00b7 " + t("Difference") + " " + money(Math.abs(info.diff), currency)
      );
    }
    return t("Journal Balanced");
  }

  function render(frm) {
    if (!frm || !frm.doc || frm.doctype !== "Journal Entry") return;

    var $card = get_card(frm);
    if (!$card) return;

    var info = balance_state(frm);
    var currency = company_currency(frm);

    $card.removeClass("is-balanced is-unbalanced is-empty").addClass("is-" + info.state);
    $card.find(".erpx-je-validation-icon").html(icon(info.state));
    $card.find(".erpx-je-validation-text").text(status_text(info, currency));
    $card
      .find(".erpx-je-validation-total--debit .erpx-je-validation-value")
      .text(money(info.debit, currency));
    $card
      .find(".erpx-je-validation-total--credit .erpx-je-validation-value")
      .text(money(info.credit, currency));

    // class di .form-layout: dipakai CSS untuk menyembunyikan field
    // total bawaan dan menampilkan "Difference" hanya saat tidak balance
    if (frm.layout && frm.layout.wrapper) {
      frm.layout.wrapper.addClass("erpx-je-form");
      frm.layout.wrapper.toggleClass("erpx-je-unbalanced", info.state === "unbalanced");
    }
  }

  // Render ditunda sedikit supaya tidak menulis DOM di tengah proses
  // hitung/refresh grid milik ERPNext.
  function schedule_render(frm) {
    if (!frm || !frm.doc) return;
    if (frm.__erpx_validation_timer) clearTimeout(frm.__erpx_validation_timer);
    frm.__erpx_validation_timer = setTimeout(function () {
      frm.__erpx_validation_timer = null;
      try {
        render(frm);
      } catch (e) {
        /* jangan ganggu alur form */
      }
    }, 30);
  }

  function patch_totals(frm) {
    var cscript = frm.cscript;
    if (!cscript || typeof cscript.update_totals !== "function") return;
    if (cscript.__erpx_validation_patched) return;

    var original = cscript.update_totals;
    cscript.update_totals = function (doc) {
      var out = original.apply(this, arguments);
      schedule_render(frm);
      return out;
    };
    cscript.__erpx_validation_patched = true;
  }

  function attach_handlers() {
    if (!window.frappe || !frappe.ui || !frappe.ui.form || typeof frappe.ui.form.on !== "function") {
      return false;
    }
    if (frappe.ui.form.__erpx_je_validation) return true;

    frappe.ui.form.on("Journal Entry", {
      refresh: function (frm) {
        patch_totals(frm);
        render(frm);
        // sebagian handler ERPNext menulis total setelah refresh selesai
        setTimeout(function () {
          render(frm);
        }, 0);
      },
      accounts_add: function (frm) {
        schedule_render(frm);
      },
      accounts_remove: function (frm) {
        schedule_render(frm);
      },
      accounts_on_form_rendered: function (frm) {
        schedule_render(frm);
      },
      company: function (frm) {
        schedule_render(frm);
      },
      multi_currency: function (frm) {
        schedule_render(frm);
      },
    });

    // Perubahan di tiap baris tabel tidak selalu lewat update_totals
    // (mis. saat exchange rate di-fetch async), jadi pantau juga di sini.
    frappe.ui.form.on("Journal Entry Account", {
      account: function (frm) {
        schedule_render(frm);
      },
      account_currency: function (frm) {
        schedule_render(frm);
      },
      debit_in_account_currency: function (frm) {
        schedule_render(frm);
      },
      credit_in_account_currency: function (frm) {
        schedule_render(frm);
      },
      debit: function (frm) {
        schedule_render(frm);
      },
      credit: function (frm) {
        schedule_render(frm);
      },
      exchange_rate: function (frm) {
        schedule_render(frm);
      },
    });

    frappe.ui.form.__erpx_je_validation = true;
    return true;
  }

  // app_include_js bisa dieksekusi sebelum frappe.ui.form siap
  if (!attach_handlers()) {
    document.addEventListener("DOMContentLoaded", attach_handlers);
    var __erpx_tries = 0;
    var __erpx_timer = setInterval(function () {
      __erpx_tries += 1;
      if (attach_handlers() || __erpx_tries > 40) clearInterval(__erpx_timer);
    }, 250);
  }
})();

// Export untuk compatibility jika ada yang butuh
window.erpx_custom = window.erpx_custom || {};
