/* ============================================================
   Payment Entry List View — KPI Summary Cards Injector
   Scoped to listview.$page (same pattern as Journal Entry).
   Source strings in English for Frappe translation (__)
   ============================================================ */

frappe.listview_settings['Payment Entry'] = frappe.listview_settings['Payment Entry'] || {};

var _pe_old_onload = frappe.listview_settings['Payment Entry'].onload;
frappe.listview_settings['Payment Entry'].onload = function (listview) {
  if (_pe_old_onload) _pe_old_onload(listview);
  renderPaymentKPI(listview);
};

var _pe_old_refresh = frappe.listview_settings['Payment Entry'].refresh;
frappe.listview_settings['Payment Entry'].refresh = function (listview) {
  if (_pe_old_refresh) _pe_old_refresh(listview);
  if (listview.$page && listview.$page.find('.pe-kpi-container').length) {
    loadPaymentKPIData(listview);
  } else {
    renderPaymentKPI(listview);
  }
};

function getPaymentListContainer(listview) {
  var $wrapper = (listview.page && listview.page.wrapper)
    ? $(listview.page.wrapper)
    : (listview.$page || $());

  var $main = $wrapper.find('.layout-main-section');
  if (!$main.length) {
    $main = listview.$page && listview.$page.length ? listview.$page : $wrapper;
  }
  return $main;
}

function renderPaymentKPI(listview) {
  if (!listview || !listview.$page) return;

  if (listview.$page.find('.pe-kpi-container').length) return;

  var kpiWrapperHtml = [
    '<div class="pe-kpi-container">',
      '<div class="pe-kpi-card">',
        '<div class="pe-kpi-card__body">',
          '<div class="pe-kpi-card__label">' + __("Total Receipts (Receive)") + '</div>',
          '<div class="pe-kpi-card__val" id="pe-kpi-receive"></div>',
          '<div class="pe-kpi-card__sub pe-kpi-card__sub--green" id="pe-kpi-receive-sub">• 0 ' + __("Verified incoming entries") + '</div>',
        '</div>',
        '<div class="pe-kpi-card__badge pe-kpi-card__badge--green">',
          '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#10b981" stroke-width="2.5"><path d="M12 19V5M5 12l7-7 7 7"/></svg>',
        '</div>',
      '</div>',

      '<div class="pe-kpi-card">',
        '<div class="pe-kpi-card__body">',
          '<div class="pe-kpi-card__label">' + __("Total Disbursements (Pay)") + '</div>',
          '<div class="pe-kpi-card__val" id="pe-kpi-disburse"></div>',
          '<div class="pe-kpi-card__sub pe-kpi-card__sub--blue" id="pe-kpi-disburse-sub">• 0 ' + __("Mustahik disbursement entries") + '</div>',
        '</div>',
        '<div class="pe-kpi-card__badge pe-kpi-card__badge--red">',
          '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#ef4444" stroke-width="2.5"><path d="M12 5v14M5 12l7 7 7-7"/></svg>',
        '</div>',
      '</div>',

      '<div class="pe-kpi-card">',
        '<div class="pe-kpi-card__body">',
          '<div class="pe-kpi-card__label">' + __("Xendit Escrow Settlement") + '</div>',
          '<div class="pe-kpi-card__val" id="pe-kpi-escrow"></div>',
          '<div class="pe-kpi-card__sub pe-kpi-card__sub--green">• ' + __("Auto-Reconciled Today") + '</div>',
        '</div>',
        '<div class="pe-kpi-card__badge pe-kpi-card__badge--blue">',
          '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#3b82f6" stroke-width="2"><path d="M13 2L3 14h9l-1 8 10-12h-9l1-8z"/></svg>',
        '</div>',
      '</div>',


    '</div>'
  ].join('');

  var $main = getPaymentListContainer(listview);
  if ($main && $main.length) {
    $main.before(kpiWrapperHtml);
    loadPaymentKPIData(listview);
  }
}

function loadPaymentKPIData(listview) {
  var $scope = (listview && listview.$page && listview.$page.length) ? listview.$page : $(document);
  var args = {};
  var company = getActiveCompany(listview);
  if (company) args.company = company;

  // Cegah respons lama menimpa respons baru saat filter diganti cepat
  var seq = ((listview && listview.__pe_kpi_seq) || 0) + 1;
  if (listview) listview.__pe_kpi_seq = seq;

  frappe.call({
    method: 'erpx_new_custom_theme.api.kpi.get_payment_entry_summary',
    args: args,
    callback: function (r) {
      if (listview && listview.__pe_kpi_seq !== seq) return;
      if (r && r.message) {
        var d = r.message;
        var $r = $scope.find('[id="pe-kpi-receive"]');
        var $rSub = $scope.find('[id="pe-kpi-receive-sub"]');
        var $d = $scope.find('[id="pe-kpi-disburse"]');
        var $dSub = $scope.find('[id="pe-kpi-disburse-sub"]');
        var $e = $scope.find('[id="pe-kpi-escrow"]');

        if ($r.length) $r.text(d.total_receive_fmt || '');
        if ($rSub.length) $rSub.text('• ' + (d.count_receive || 0) + ' ' + __("Verified incoming entries"));

        if ($d.length) $d.text(d.total_disburse_fmt || '');
        if ($dSub.length) $dSub.text('• ' + (d.count_disburse || 0) + ' ' + __("Mustahik disbursement entries"));

        if ($e.length) $e.text(d.total_escrow_fmt || '');

      }
    }
  });
}

/* Company yang sedang aktif di filter list (kalau ada).
   Kosong = biarkan backend memakai default company user.
   Comment bilingual-friendly: sumber string UI tetap di __(). */
function getActiveCompany(listview) {
  var filters = [];
  try {
    if (listview && typeof listview.get_filters_for_args === 'function') {
      filters = listview.get_filters_for_args() || [];
    } else if (listview && listview.filter_area && listview.filter_area.get) {
      filters = listview.filter_area.get() || [];
    }
  } catch (e) {
    return null;
  }

  var company = null;
  filters.forEach(function (f) {
    if (!f || f[1] !== 'company') return;
    var operator = f[2];
    var value = f[3];

    if (operator === '=' && value) {
      company = value;
    } else if (operator === 'in' && value) {
      var first = Array.isArray(value) ? value[0] : String(value).split(',')[0];
      if (first) company = first;
    } else if (operator === 'like' && value) {
      var cleaned = String(value).replace(/^%|%$/g, '');
      if (cleaned) company = cleaned;
    }
  });

  return company;
}

/* Fallback timing: kalau onload ke-fire telat / list udah render duluan (bounded, scoped) */
(function pollPeKpi() {
  var tries = 0;
  function tick() {
    tries++;
    if (tries > 50) return;

    var route = (frappe.get_route && frappe.get_route()) || [];
    var onPeList = route[0] === 'List' && route[1] === 'Payment Entry';
    if (!onPeList) { setTimeout(tick, 300); return; }

    var list = (frappe.views && frappe.views.ListView && frappe.views.ListView.current_list)
      || frappe.cur_list;

    if (list && list.doctype === 'Payment Entry' && list.$page) {
      if (!list.$page.find('.pe-kpi-container').length) {
        renderPaymentKPI(list);
      }
      loadPaymentKPIData(list);
      return;
    }
    setTimeout(tick, 300);
  }
  $(document).ready(function () { setTimeout(tick, 500); });
})();

/* ============================================================
   Fund Pillar Sidebar Filter (Payment Entry List)
   Card "PILAR DANA" di sidebar, di bawah filter standar.
   Filter pilar = SATU filter `name in [...]` (daftar entry dari
   backend berdasar akun dana COA) — tidak pernah numpuk di URL.
   PE_PILAR_KEYWORDS hanya dipakai untuk menyapu sisa filter
   remarks versi lama. Source strings in English for __().
   ============================================================ */

var PE_PILAR_KEYWORDS = {
  zakat: 'zakat',
  infak: 'infak',
  amil: 'amil',
  wakaf: 'wakaf'
};

var PE_PILAR_DEFS = [
  { key: 'all', label: __("All Funds") },
  { key: 'zakat', label: __("Zakat Funds (Fitrah & Maal)") },
  { key: 'infak', label: __("Infaq & Sadaqah Funds") },
  { key: 'amil', label: __("Amil Share Funds") },
  { key: 'wakaf', label: __("Cash Waqf Funds (Nazhir)") }
];

function getPilarSideSection(listview) {
  var $wrapper = (listview.page && listview.page.wrapper)
    ? $(listview.page.wrapper)
    : (listview.$page || $());
  var $side = $wrapper.find('.layout-side-section');
  if (!$side.length) $side = $wrapper.find('.list-sidebar');
  if (!$side.length && listview.sidebar_wrapper) $side = $(listview.sidebar_wrapper);
  return $side;
}

function isPilarValue(v) {
  var s = String(v == null ? '' : v).toLowerCase();
  if (!s) return false;
  return Object.keys(PE_PILAR_KEYWORDS).some(function (k) {
    return s.indexOf(PE_PILAR_KEYWORDS[k]) !== -1;
  });
}

function getActivePilarKey(listview) {
  // Pilar aktif dilacak di memori (filter `name in` tidak membawa info pilar).
  return (listview && listview._pilar_key) || 'all';
}

function removeOurListFilters(listview) {
  // Sapu filter milik widget: `name in [...]` + sisa remarks-pilar versi lama.
  // Catatan: filter `name in` manual yang ada ikut terhapus saat pilar diklik
  // karena keduanya memakai kendaraan filter yang sama.
  try {
    var fa = listview.filter_area;
    if (!fa || !Array.isArray(fa.filters)) return;
    fa.filters.slice().forEach(function (f) {
      try {
        var fv = (f && typeof f.get_value === 'function') ? f.get_value() : null;
        if (!fv || fv[0] !== 'Payment Entry') return;
        var field = String(fv[1] || '').toLowerCase();
        var cond = String(fv[2] || '').toLowerCase();
        if (field === 'name' && (cond === 'in' || cond === 'not in')) {
          f.remove();
          return;
        }
        if (field === 'remarks' && cond === 'like' && isPilarValue(fv[3])) {
          f.remove();
        }
      } catch (e) { /* lanjut filter berikutnya */ }
    });
  } catch (e) { /* abaikan */ }
}

function syncPilarActive(listview, key) {
  var active = key || getActivePilarKey(listview);
  var $side = getPilarSideSection(listview);
  if (!$side || !$side.length) return;
  $side.find('.pe-pilar-item').each(function () {
    $(this).toggleClass('active', $(this).attr('data-pilar') === active);
  });
}

function renderPilarFilter(listview) {
  if (!listview || !listview.$page) return;
  var $side = getPilarSideSection(listview);
  if (!$side || !$side.length) return;
  if ($side.find('.pe-pilar-card').length) {
    syncPilarActive(listview);
    return;
  }

  var itemsHtml = PE_PILAR_DEFS.map(function (d, i) {
    return '<button type="button" class="pe-pilar-item' + (i === 0 ? ' active' : '') + '" data-pilar="' + d.key + '">'
      + '<span class="pe-pilar-item__dot"></span>'
      + '<span class="pe-pilar-item__label">' + frappe.utils.escape_html(d.label) + '</span>'
      + '<span class="pe-pilar-item__count" data-count="' + d.key + '">0</span>'
      + '</button>';
  }).join('');

  var cardHtml = '<div class="pe-pilar-card">'
    + '<div class="pe-pilar-card__head">'
    + '<span class="pe-pilar-card__title">' + frappe.utils.escape_html(__("Fund Pillars")) + '</span>'
    + '<span class="pe-pilar-card__badge">' + frappe.utils.escape_html(__("Contract")) + '</span>'
    + '</div>'
    + '<div class="pe-pilar-card__list">' + itemsHtml + '</div>'
    + '<div class="pe-pilar-card__foot">'
    + '<span class="pe-pilar-card__check"><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#10b981" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="M20 6L9 17l-5-5"/></svg></span>'
    + '<span>' + frappe.utils.escape_html(__("Fund pillars are mapped from the Chart of Accounts")) + '</span>'
    + '</div>'
    + '</div>';

  var $std = $side.find('.standard-filter-section, .filter-section, .list-sidebar-standard').first();
  if ($std.length) {
    $std.after(cardHtml);
  } else {
    $side.append(cardHtml);
  }

  $side.find('.pe-pilar-item').on('click', function () {
    applyPilarFilter(listview, $(this).attr('data-pilar'));
  });

  // onload: mulai bersih (sapu filter milik widget + sisa remarks versi lama
  // yang mungkin terbawa URL), lalu tandai All aktif.
  removeOurListFilters(listview);
  listview._pilar_key = null;
  syncPilarActive(listview, 'all');
  loadPilarCounts(listview);
}

function applyPilarFilter(listview, key) {
  if (!listview || !listview.filter_area) return;
  // Selalu sapu dulu agar filter tidak pernah numpuk di URL.
  removeOurListFilters(listview);
  if (!key || key === 'all') {
    listview._pilar_key = null;
    syncPilarActive(listview, 'all');
    if (listview.refresh) listview.refresh();
    return;
  }
  listview._pilar_key = key;
  syncPilarActive(listview, key);
  var pilarArgs = { pilar: key };
  var pilarCompany = getActiveCompany(listview);
  if (pilarCompany) pilarArgs.company = pilarCompany;
  frappe.call({
    method: 'erpx_new_custom_theme.api.kpi.get_pilar_names',
    args: pilarArgs,
    callback: function (r) {
      var msg = (r && r.message) || {};
      if (msg.error) {
        frappe.msgprint(msg.error);
        listview._pilar_key = null;
        syncPilarActive(listview, 'all');
        return;
      }
      var names = msg.names || [];
      if (!names.length) {
        frappe.msgprint(__("No fund accounts or entries found for this pillar"));
        listview._pilar_key = null;
        syncPilarActive(listview, 'all');
        return;
      }
      try {
        listview.filter_area.add('Payment Entry', 'name', 'in', names);
      } catch (e) { /* abaikan */ }
      if (msg.capped) {
        frappe.show_alert({
          message: __("Showing first {0} of {1} entries", [names.length, msg.total]),
          indicator: 'orange'
        });
      }
      if (listview.refresh) listview.refresh();
    },
    error: function () {
      listview._pilar_key = null;
      syncPilarActive(listview, 'all');
    }
  });
}

function loadPilarCounts(listview) {
  // Guard: cegah respons lama menimpa respons baru
  var seq = ((listview && listview.__pe_pilar_seq) || 0) + 1;
  if (listview) listview.__pe_pilar_seq = seq;

  var args = {};
  var company = getActiveCompany(listview);
  if (company) args.company = company;

  var $scope = (listview && listview.$page && listview.$page.length) ? listview.$page : $(document);

  frappe.call({
    method: 'erpx_new_custom_theme.api.kpi.get_pilar_counts',
    args: args,
    callback: function (r) {
      if (listview && listview.__pe_pilar_seq !== seq) return;
      if (r && r.message && !r.message.error) {
        Object.keys(r.message).forEach(function (k) {
          var $el = $scope.find('.pe-pilar-card .pe-pilar-item__count[data-count="' + k + '"]');
          if ($el.length) $el.text(r.message[k] || 0);
        });
      }
    }
  });
}

/* ------------------------------------------------------------------
   Fallback: Client Script lain di site (mis. "Merapikan Payment Entry")
   menimpa frappe.listview_settings['Payment Entry'] dengan objek baru,
   sehingga onload/refresh milik app tidak dipanggil. Polling ini
   memastikan card KPI tetap terpasang & ter-refresh.
   ------------------------------------------------------------------ */
(function pollPaymentKPI() {
  var last_sig = null;

  function current_list() {
    var list = window.cur_list
      || frappe.cur_list
      || (frappe.views && frappe.views.ListView && frappe.views.ListView.current_list);
    return (list && list.doctype === 'Payment Entry' && list.$page) ? list : null;
  }

  // Hook langsung ke prototype ListView: tetap jalan walaupun
  // frappe.listview_settings['Payment Entry'] ditimpa Client Script.
  function patch_listview() {
    var LV = window.frappe && frappe.views && frappe.views.ListView;
    if (!LV || !LV.prototype || typeof LV.prototype.refresh !== "function") return false;
    if (LV.prototype.__erpx_pe_hooked) return true;

    var original_refresh = LV.prototype.refresh;
    LV.prototype.refresh = function () {
      var result = original_refresh.apply(this, arguments);
      var self = this;
      if (self && self.doctype === "Payment Entry" && self.$page) {
        setTimeout(function () {
          if (!self.$page.find(".pe-kpi-container").length) {
            renderPaymentKPI(self);
          } else {
            loadPaymentKPIData(self);
          }
        }, 250);
      }
      return result;
    };
    LV.prototype.__erpx_pe_hooked = true;
    return true;
  }

  (function wait_for_listview() {
    var tries = 0;
    var timer = setInterval(function () {
      tries += 1;
      if (patch_listview() || tries > 100) clearInterval(timer);
    }, 100);
  })();

  function tick() {
    var route = (frappe.get_route && frappe.get_route()) || [];
    if (route[0] === 'List' && route[1] === 'Payment Entry') {
      var list = current_list();
      if (list) {
        if (!list.$page.find('.pe-kpi-container').length) {
          renderPaymentKPI(list);
        } else {
          var sig = '';
          try {
            sig = JSON.stringify((list.get_filters_for_args && list.get_filters_for_args()) || []);
          } catch (e) {
            sig = '';
          }
          if (sig && sig !== last_sig) {
            last_sig = sig;
            loadPaymentKPIData(list);
          }
        }
      }
    }
    setTimeout(tick, 700);
  }

  if (window.jQuery) {
    $(document).ready(function () {
      setTimeout(tick, 600);
    });
  }
})();
