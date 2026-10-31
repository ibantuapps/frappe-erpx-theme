frappe.pages['coa-card-view'].on_page_load = function (wrapper) {
    const page = frappe.ui.make_app_page({
        parent: wrapper,
        title: 'COA Card View',
        single_column: true,
    });
    $(page.body).html('<div id="coa-card-view"></div>');

    new erpnext.coa.CardView({
        container: document.getElementById('coa-card-view'),
    });
};
