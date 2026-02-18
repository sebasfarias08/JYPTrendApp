// public/js/app-shell.js
const TAB_LINKS = {
  botellas: "/index.html?tab=botellas",
  perfumes: "/index.html?tab=perfumes",
  importados: "/index.html?tab=importados",
  outlet: "/index.html?tab=outlet",
  reservas: "/pages/pedidos.html"
};

function resolveActiveTab() {
  const path = location.pathname;
  const tab = new URLSearchParams(location.search).get("tab");

  if (path === "/" || path === "/index.html") {
    return tab || "perfumes";
  }
  if (path.includes("/pages/pedidos.html") || path.includes("/pages/pedido-detalle.html")) {
    return "reservas";
  }
  return "perfumes";
}

export function initAppShell({ title = "JyP Ventas", onRefresh = null } = {}) {
  const titleEl = document.getElementById("appShellTitle");
  if (titleEl) titleEl.textContent = title;

  const activeTab = resolveActiveTab();
  document.querySelectorAll("[data-shell-tab]").forEach((el) => {
    const key = el.getAttribute("data-shell-tab");
    const active = key === activeTab;
    el.classList.toggle("bg-slate-900/80", active);
    el.classList.toggle("text-slate-100", active);
    el.classList.toggle("text-slate-400", !active);
    if (el.tagName === "A") el.href = TAB_LINKS[key] || "/index.html";
  });

  const btnMenu = document.getElementById("btnShellMenu");
  const btnSearch = document.getElementById("btnShellSearch");
  const btnSelect = document.getElementById("btnShellSelect");
  const btnAdd = document.getElementById("btnShellAdd");
  const btnRefresh = document.getElementById("btnShellRefresh");
  const searchWrap = document.getElementById("appShellSearchWrap");
  const searchInput = document.getElementById("appShellSearchInput");

  let selectMode = false;

  btnMenu?.addEventListener("click", () => {
    location.href = "/pages/pedidos.html";
  });

  btnSearch?.addEventListener("click", () => {
    if (!searchWrap) {
      location.href = "/index.html";
      return;
    }
    searchWrap.classList.toggle("hidden");
    if (!searchWrap.classList.contains("hidden")) searchInput?.focus();
  });

  btnSelect?.addEventListener("click", () => {
    selectMode = !selectMode;
    btnSelect.classList.toggle("bg-emerald-400", selectMode);
    btnSelect.classList.toggle("text-slate-950", selectMode);
  });

  btnAdd?.addEventListener("click", () => {
    location.href = "/pages/pedido.html";
  });

  btnRefresh?.addEventListener("click", async () => {
    if (typeof onRefresh === "function") {
      await onRefresh();
      return;
    }
    location.reload();
  });
}
