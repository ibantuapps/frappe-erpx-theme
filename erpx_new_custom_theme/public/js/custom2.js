// custom_theme_v9 bootstrap — ERPX Figma theme
// inject: Poppins font (sidebar navy), logo iBantu + "Powered by ERPX"

function erpx_inject_font() {
  if (document.getElementById("poppins-font")) return;
  const link = document.createElement("link");
  link.id = "poppins-font";
  link.rel = "stylesheet";
  link.href =
    "https://fonts.googleapis.com/css2?family=Poppins:wght@300;400;500;600;700&display=swap";
  document.head.appendChild(link);
}

function erpx_inject_sidebar_logo() {
  const side = document.querySelector(".layout-side-section");
  if (!side || side.querySelector(".sidebar-logo")) return;

  const logo = document.createElement("div");
  logo.className = "sidebar-logo";
  logo.innerHTML =
    '<span class="logo-icon">iBantu</span>' +
    '<span class="sidebar-logo-text">Powered by ERPX</span>';
  side.insertBefore(logo, side.firstChild);
}

frappe.ready(function () {
  erpx_inject_font();

  const side = document.querySelector(".layout-side-section");
  if (side) {
    erpx_inject_sidebar_logo();
    // sidebar dibangun async oleh frappe.views.Workspace, pantau perubahan DOM
    new MutationObserver(erpx_inject_sidebar_logo).observe(side, {
      childList: true,
      subtree: true,
    });
  }
});
