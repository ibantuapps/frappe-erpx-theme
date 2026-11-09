/* ============================================================
   Journal Entry List View — KPI Summary Cards Injector
   Source strings in English for Frappe translation (__)
   ============================================================ */

frappe.listview_settings['Journal Entry'] = frappe.listview_settings['Journal Entry'] || {};

var _je_old_onload = frappe.listview_settings['Journal Entry'].onload;
frappe.listview_settings['Journal Entry'].onload = function (listview) {
  if (_je_old_onload) _je_old_onload(listview);
  renderJournalKPI(listview);
};

var _je_old_refresh = frappe.listview_settings['Journal Entry'].refresh;
frappe.listview_settings['Journal Entry'].refresh = function (listview) {
  if (_je_old_refresh) _je_old_refresh(listview);
  if (listview.$page && listview.$page.find('.je-kpi-container').length) {
    loadJournalKPIData(listview);
  } else {
    renderJournalKPI(listview);
  }
};

function getListContainer(listview) {
  var $wrapper = (listview.page && listview.page.wrapper)
    ? $(listview.page.wrapper)
    : (listview.$page || $());

  var $main = $wrapper.find('.layout-main-section');
  if (!$main.length) {
    $main = listview.$page && listview.$page.length ? listview.$page : $wrapper;
  }
  return $main;
}

function renderJournalKPI(listview) {
  if (!listview || !listview.$page) return;

  if (listview.$page.find('.je-kpi-container').length) return;

  var kpiWrapperHtml = [
    '<div class="je-kpi-container">',

      '<div class="je-kpi-card">',
        '<div class="je-kpi-card__body">',
          '<div class="je-kpi-card__label">' + __("Total Debit Posted") + '</div>',
          '<div class="je-kpi-card__val" id="je-total-debit">—</div>',
          '<div class="je-kpi-card__sub je-kpi-card__sub--green" id="je-total-debit-sub">• 0 ' + __("Entries Verified") + '</div>',
        '</div>',
        '<div class="je-kpi-card__badge je-kpi-card__badge--blue js-badge-text">Dr</div>',
      '</div>',

      '<div class="je-kpi-card">',
        '<div class="je-kpi-card__body">',
          '<div class="je-kpi-card__label">' + __("Total Credit Posted") + '</div>',
          '<div class="je-kpi-card__val" id="je-total-credit">—</div>',
          '<div class="je-kpi-card__sub je-kpi-card__sub--green" id="je-total-credit-sub">• 0 ' + __("Entries Verified") + '</div>',
        '</div>',
        '<div class="je-kpi-card__badge je-kpi-card__badge--indigo js-badge-text">Cr</div>',
      '</div>',

      '<div class="je-kpi-card">',
        '<div class="je-kpi-card__body">',
          '<div class="je-kpi-card__label">' + __("Balance Status") + '</div>',
          '<div class="je-kpi-card__val" id="je-status">' + __("Balanced") + '</div>',
          '<div class="je-kpi-card__sub je-kpi-card__sub--green" id="je-status-sub">✓ ' + __("Double-Entry Sharia Check OK") + '</div>',
        '</div>',
        '<div class="je-kpi-card__badge je-kpi-card__badge--green">',
          '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#059669" stroke-width="2.4"><path d="M20 6L9 17l-5-5"/></svg>',
        '</div>',
      '</div>',


    '</div>'
  ].join('');

  var $main = getListContainer(listview);
  if ($main && $main.length) {
    $main.before(kpiWrapperHtml);
    loadJournalKPIData(listview);
  }
}

function loadJournalKPIData(listview) {
  var $scope = (listview && listview.$page && listview.$page.length) ? listview.$page : $(document);
  var args = {};
  var company = getActiveCompany(listview);
  if (company) args.company = company;

  // Cegah respons lama menimpa respons baru saat filter diganti cepat
  var seq = ((listview && listview.__je_kpi_seq) || 0) + 1;
  if (listview) listview.__je_kpi_seq = seq;

  frappe.call({
    method: 'erpx_new_custom_theme.api.je_kpi.get_journal_entry_summary',
    args: args,
    callback: function (r) {
      if (listview && listview.__je_kpi_seq !== seq) return;
      if (r && r.message && !r.message.error) {
        var d = r.message;
        // pakai selector atribut supaya tidak salah halaman saat list view di-cache
        var $debit = $scope.find('[id="je-total-debit"]');
        var $debitSub = $scope.find('[id="je-total-debit-sub"]');
        var $credit = $scope.find('[id="je-total-credit"]');
        var $creditSub = $scope.find('[id="je-total-credit-sub"]');
        var $status = $scope.find('[id="je-status"]');
        var $statusSub = $scope.find('[id="je-status-sub"]');

        if ($debit.length) $debit.text(d.total_debit_fmt || '');
        if ($debitSub.length) $debitSub.text('• ' + (d.count || 0) + ' ' + __("Entries Verified"));

        if ($credit.length) $credit.text(d.total_credit_fmt || '');
        if ($creditSub.length) $creditSub.text('• ' + (d.count || 0) + ' ' + __("Entries Verified"));

        if ($status.length) {
          $status.text((d.status_text || '') + (d.balanced ? ' (' + __("Difference") + ': ' + (d.difference_fmt || '') + ')' : ''));
        }
        if ($statusSub.length) {
          $statusSub.text((d.balanced ? '✓ ' : '• ') + __("Double-Entry Sharia Check OK"));
          $statusSub.toggleClass('je-kpi-card__sub--green', !!d.balanced);
          $statusSub.toggleClass('je-kpi-card__sub--red', !d.balanced);
        }
      }
    },
  });
}

/* Company yang sedang aktif di filter list (kalau ada).
   Kosong = biarkan backend memakai default company user. */
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

/* ------------------------------------------------------------------
   Fallback: Client Script site lain (mis. "filter company journal entry")
   menimpa frappe.listview_settings['Journal Entry'] sehingga onload/
   refresh milik app tidak dipanggil. Hook ke prototype ListView +
   polling memastikan card KPI tetap terpasang dan ikut filter Company.
   ------------------------------------------------------------------ */
(function pollJeKpi() {
  var last_sig = null;

  function current_list() {
    var list = window.cur_list
      || frappe.cur_list
      || (frappe.views && frappe.views.ListView && frappe.views.ListView.current_list);
    return (list && list.doctype === 'Journal Entry' && list.$page) ? list : null;
  }

  function ensure(list) {
    if (!list || !list.$page) return;
    if (!list.$page.find('.je-kpi-container').length) {
      renderJournalKPI(list);
      return;
    }
    var sig = '';
    try {
      sig = JSON.stringify((list.get_filters_for_args && list.get_filters_for_args()) || []);
    } catch (e) {
      sig = '';
    }
    if (sig && sig !== last_sig) {
      last_sig = sig;
      loadJournalKPIData(list);
    }
  }

  function patch_listview() {
    var LV = window.frappe && frappe.views && frappe.views.ListView;
    if (!LV || !LV.prototype || typeof LV.prototype.refresh !== 'function') return false;
    if (LV.prototype.__erpx_je_hooked) return true;

    var original_refresh = LV.prototype.refresh;
    LV.prototype.refresh = function () {
      var result = original_refresh.apply(this, arguments);
      var self = this;
      if (self && self.doctype === 'Journal Entry' && self.$page) {
        setTimeout(function () { ensure(self); }, 250);
      }
      return result;
    };
    LV.prototype.__erpx_je_hooked = true;
    return true;
  }

  var hook_timer = setInterval(function () {
    if (patch_listview()) clearInterval(hook_timer);
  }, 100);

  function tick() {
    var route = (frappe.get_route && frappe.get_route()) || [];
    if (route[0] === 'List' && route[1] === 'Journal Entry') {
      ensure(current_list());
    }
    setTimeout(tick, 700);
  }

  if (window.jQuery) {
    $(document).ready(function () { setTimeout(tick, 600); });
  }
})();
