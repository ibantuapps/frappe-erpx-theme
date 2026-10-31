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
          '<div class="je-kpi-card__label">' + __("Total Debit") + '</div>',
          '<div class="je-kpi-card__val" id="je-total-debit">$0</div>',
          '<div class="je-kpi-card__sub je-kpi-card__sub--blue" id="je-total-debit-sub">• 0 ' + __("Entries") + '</div>',
        '</div>',
        '<div class="je-kpi-card__badge je-kpi-card__badge--blue">',
          '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#3b82f6" stroke-width="2"><path d="M13 2L3 14h9l-1 8 10-12h-9l1-8z"/></svg>',
        '</div>',
      '</div>',

      '<div class="je-kpi-card">',
        '<div class="je-kpi-card__body">',
          '<div class="je-kpi-card__label">' + __("Total Credit") + '</div>',
          '<div class="je-kpi-card__val" id="je-total-credit">$0</div>',
          '<div class="je-kpi-card__sub je-kpi-card__sub--green" id="je-total-credit-sub">• 0 ' + __("Entries") + '</div>',
        '</div>',
        '<div class="je-kpi-card__badge je-kpi-card__badge--green">',
          '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#10b981" stroke-width="2.5"><path d="M12 19V5M5 12l7-7 7 7"/></svg>',
        '</div>',
      '</div>',

      '<div class="je-kpi-card">',
        '<div class="je-kpi-card__body">',
          '<div class="je-kpi-card__label">' + __("Net (Debit - Credit)") + '</div>',
          '<div class="je-kpi-card__val" id="je-net">$0</div>',
          '<div class="je-kpi-card__sub je-kpi-card__sub--gray">• ' + __("Month-end difference") + '</div>',
        '</div>',
        '<div class="je-kpi-card__badge je-kpi-card__badge--gray">',
          '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#64748b" stroke-width="1.5"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/></svg>',
        '</div>',
      '</div>',

      '<div class="je-kpi-card">',
        '<div class="je-kpi-card__body">',
          '<div class="je-kpi-card__label">' + __("Journal Entries") + '</div>',
          '<div class="je-kpi-card__val" id="je-count">0</div>',
          '<div class="je-kpi-card__sub je-kpi-card__sub--blue" id="je-count-sub">• ' + __("Entries this month") + '</div>',
        '</div>',
        '<div class="je-kpi-card__badge je-kpi-card__badge--blue">',
          '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#3b82f6" stroke-width="2"><path d="M12 4v16m8-8H4"/></svg>',
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
        var $net = $scope.find('[id="je-net"]');
        var $count = $scope.find('[id="je-count"]');
        var $countSub = $scope.find('[id="je-count-sub"]');

        if ($debit.length) $debit.text(d.total_debit_fmt || '');
        if ($debitSub.length) $debitSub.text('• ' + (d.count || 0) + ' ' + __("Entries"));

        if ($credit.length) $credit.text(d.total_credit_fmt || '');
        if ($creditSub.length) $creditSub.text('• ' + (d.count || 0) + ' ' + __("Entries"));

        if ($net.length) $net.text(d.net_fmt || '');

        if ($count.length) $count.text(d.count || 0);
        if ($countSub.length) $countSub.text('• ' + (d.count || 0) + ' ' + __("Entries this month"));
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

/* Fallback timing: kalau onload ke-fire telat / list udah render duluan */
(function pollJeKpi() {
  var tries = 0;
  function tick() {
    tries++;
    if (tries > 50) return;

    var route = (frappe.get_route && frappe.get_route()) || [];
    var onJeList = route[0] === 'List' && route[1] === 'Journal Entry';
    if (!onJeList) { setTimeout(tick, 300); return; }

    var list = (frappe.views && frappe.views.ListView && frappe.views.ListView.current_list)
      || frappe.cur_list;

    if (list && list.doctype === 'Journal Entry' && list.$page) {
      if (list.$page.find('.je-kpi-container').length) {
        loadJournalKPIData(list);
      } else {
        renderJournalKPI(list);
      }
      return;
    }
    setTimeout(tick, 300);
  }
  $(document).ready(function () { setTimeout(tick, 500); });
})();
