// public/js/app-shell.js
const TAB_LINKS = {
  botellas: "/index.html?tab=botellas",
  perfumes: "/index.html?tab=perfumes",
  importados: "/index.html?tab=importados",
  outlet: "/index.html?tab=outlet",
  reservas: "/pages/pedidos.html"
};

const MENU_ITEMS = [
  { label: "Catalogo", href: "/index.html" },
  { label: "Historial Pedidos", href: "/pages/pedidos.html" },
  { label: "Clientes", href: null },
  { label: "Parametros", href: null },
  { label: "Inventario", href: null },
  { label: "About", href: null }
];

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

function createMenuDrawer() {
  let overlay = document.getElementById("appShellMenuOverlay");
  if (overlay) return overlay;

  overlay = document.createElement("div");
  overlay.id = "appShellMenuOverlay";
  overlay.className = "hidden fixed inset-0 z-50 bg-slate-950/60";

  const panel = document.createElement("aside");
  panel.className = "absolute left-0 top-0 h-full w-72 max-w-[84vw] bg-slate-950 border-r border-slate-800 p-4";
  panel.innerHTML = `
    <div class="flex items-center justify-between mb-4">
      <div class="font-semibold">Menu</div>
      <button id="appShellMenuClose" class="w-8 h-8 rounded-lg border border-slate-700">X</button>
    </div>
    <nav id="appShellMenuList" class="space-y-1"></nav>
  `;

  overlay.appendChild(panel);
  document.body.appendChild(overlay);

  const list = panel.querySelector("#appShellMenuList");
  MENU_ITEMS.forEach((item) => {
    const btn = document.createElement(item.href ? "a" : "button");
    btn.className = "w-full text-left px-3 py-2 rounded-lg border border-slate-800 bg-slate-900 hover:border-slate-700";
    btn.textContent = item.label;

    if (item.href) {
      btn.setAttribute("href", item.href);
    } else {
      btn.setAttribute("type", "button");
      btn.addEventListener("click", () => {
        alert(`"${item.label}" estara disponible pronto.`);
      });
    }
    list.appendChild(btn);
  });

  const closeBtn = panel.querySelector("#appShellMenuClose");
  closeBtn?.addEventListener("click", () => {
    overlay.classList.add("hidden");
  });

  overlay.addEventListener("click", (event) => {
    if (event.target === overlay) overlay.classList.add("hidden");
  });

  window.addEventListener("keydown", (event) => {
    if (event.key === "Escape") overlay.classList.add("hidden");
  });

  return overlay;
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
  const btnAdd = document.getElementById("btnShellAdd");
  const btnRefresh = document.getElementById("btnShellRefresh");
  const searchWrap = document.getElementById("appShellSearchWrap");
  const searchInput = document.getElementById("appShellSearchInput");

  const menuOverlay = createMenuDrawer();

  // Redesign: make add button a cart button with live item count
  if (btnAdd) {
    btnAdd.setAttribute("aria-label", "Ver pedido");
    btnAdd.classList.add("relative");
    btnAdd.innerHTML = `
      <svg viewBox="0 0 24 24" class="w-5 h-5" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true">
        <circle cx="9" cy="20" r="1"></circle>
        <circle cx="17" cy="20" r="1"></circle>
        <path d="M3 4h2l2.2 10.2a1 1 0 0 0 1 .8h8.8a1 1 0 0 0 1-.8L20 7H7"></path>
      </svg>
      <span id="appShellCartCount" class="absolute -top-1 -right-1 min-w-[18px] h-[18px] px-1 rounded-full bg-emerald-400 text-[10px] leading-[18px] text-slate-950 font-bold text-center">0</span>
    `;
  }

  btnMenu?.addEventListener("click", () => {
    menuOverlay.classList.remove("hidden");
  });

  btnSearch?.addEventListener("click", () => {
    if (!searchWrap) {
      location.href = "/index.html";
      return;
    }
    searchWrap.classList.toggle("hidden");
    if (!searchWrap.classList.contains("hidden")) searchInput?.focus();
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

  async function refreshCartCount() {
    const counter = document.getElementById("appShellCartCount");
    if (!counter) return;

    try {
      const mod = await import("/js/cart.js");
      const count = Number(mod.getCartCount?.() ?? 0);
      counter.textContent = String(count);
      counter.classList.toggle("hidden", count <= 0);
    } catch {
      counter.textContent = "0";
    }
  }

  window.addEventListener("cart:changed", refreshCartCount);
  window.addEventListener("storage", refreshCartCount);
  refreshCartCount();
}
