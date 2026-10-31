// custom_theme_v9 bootstrap — ERPX Figma theme
frappe.ready(function () {
  // ensure Archivo is requested
  if (!document.getElementById('archivo-font')) {
    const link = document.createElement('link');
    link.id = 'archivo-font';
    link.rel = 'stylesheet';
    link.href = 'https://fonts.googleapis.com/css2?family=Archivo:wght@400;500;600;700&display=swap';
    document.head.appendChild(link);
  }

  console.log('ERPX Theme loaded');

  // shortcut handler (mapped by ERPNext shortcut widgets)
  document.querySelectorAll('.shortcut-item').forEach(function (btn) {
    btn.addEventListener('click', function (e) {
      e.preventDefault();
      const href = btn.getAttribute('href') || btn.dataset.href;
      if (href) frappe.set_route(href);
    });
  });
});
