// public/js/app-shell.js
const TAB_LINKS = {
  botellas: "/index.html?tab=botellas",
  perfumes: "/index.html?tab=perfumes",
  importados: "/index.html?tab=importados",
  outlet: "/index.html?tab=outlet",
  reservas: "/pages/pedidos.html"
};

const MENU_ITEMS = [
  { label: "Catalogo", href: "/index.html", icon: "list" },
  { label: "Historial Pedidos", href: "/pages/pedidos.html", icon: "history" },
  { label: "Clientes", href: null, icon: "users" },
  { label: "Parametros", href: null, icon: "settings" },
  { label: "Inventario", href: null, icon: "inventory" },
  { label: "About", href: null, icon: "info" }
];

function iconSvg(name) {
  const icons = {
    list: '<path d="M8 6h13"></path><path d="M8 12h13"></path><path d="M8 18h13"></path><circle cx="3" cy="6" r="1"></circle><circle cx="3" cy="12" r="1"></circle><circle cx="3" cy="18" r="1"></circle>',
    history: '<path d="M3 3v5h5"></path><path d="M3.5 8a9 9 0 1 0 2.4-3.4"></path><path d="M12 7v5l3 2"></path>',
    users: '<path d="M16 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"></path><circle cx="8.5" cy="7" r="4"></circle><path d="M20 8v6"></path><path d="M23 11h-6"></path>',
    settings: '<circle cx="12" cy="12" r="3"></circle><path d="M19.4 15a1.7 1.7 0 0 0 .3 1.8l.1.1a2 2 0 1 1-2.8 2.8l-.1-.1a1.7 1.7 0 0 0-1.8-.3 1.7 1.7 0 0 0-1 1.5V21a2 2 0 1 1-4 0v-.1a1.7 1.7 0 0 0-1-1.5 1.7 1.7 0 0 0-1.8.3l-.1.1a2 2 0 1 1-2.8-2.8l.1-.1a1.7 1.7 0 0 0 .3-1.8 1.7 1.7 0 0 0-1.5-1H3a2 2 0 1 1 0-4h.1a1.7 1.7 0 0 0 1.5-1 1.7 1.7 0 0 0-.3-1.8l-.1-.1a2 2 0 1 1 2.8-2.8l.1.1a1.7 1.7 0 0 0 1.8.3h0a1.7 1.7 0 0 0 1-1.5V3a2 2 0 1 1 4 0v.1a1.7 1.7 0 0 0 1 1.5h0a1.7 1.7 0 0 0 1.8-.3l.1-.1a2 2 0 1 1 2.8 2.8l-.1.1a1.7 1.7 0 0 0-.3 1.8v0a1.7 1.7 0 0 0 1.5 1H21a2 2 0 1 1 0 4h-.1a1.7 1.7 0 0 0-1.5 1z"></path>',
    inventory: '<path d="M3 7h18"></path><path d="M6 7l1.5-3h9L18 7"></path><rect x="4" y="7" width="16" height="13" rx="2"></rect><path d="M9 11h6"></path>',
    info: '<circle cx="12" cy="12" r="9"></circle><path d="M12 10v6"></path><circle cx="12" cy="7" r="1"></circle>'
  };
  return icons[name] ?? icons.list;
}

function getUserEmail() {
  try {
    const keys = Object.keys(localStorage).filter((k) => k.startsWith("sb-") && k.endsWith("-auth-token"));
    for (const key of keys) {
      const raw = localStorage.getItem(key);
      if (!raw) continue;
      const parsed = JSON.parse(raw);
      const email = parsed?.currentSession?.user?.email || parsed?.user?.email;
      if (email) return email;
    }
  } catch {}
  return "usuario@jypventas";
}

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
  panel.className = "absolute left-0 top-0 h-full w-72 max-w-[84vw] bg-slate-950 border-r border-slate-800 flex flex-col";
  panel.innerHTML = `
    <div class="px-4 py-3 border-b border-slate-800">
      <div class="flex items-center justify-between">
        <div class="flex items-center gap-3">
          <div class="w-8 h-8 rounded-md bg-emerald-400 text-slate-950 text-xs font-bold inline-flex items-center justify-center">JYP</div>
          <div class="font-semibold text-slate-100">JyP Trend New</div>
        </div>
        <button id="appShellMenuClose" class="w-8 h-8 rounded-lg border border-slate-700 text-slate-300">X</button>
      </div>
    </div>
    <nav id="appShellMenuList" class="flex-1 overflow-y-auto px-3 py-3 space-y-1"></nav>
    <div class="border-t border-slate-800 px-4 py-3">
      <div class="flex items-center gap-3">
        <div class="w-8 h-8 rounded-full bg-blue-500 text-white text-sm font-semibold inline-flex items-center justify-center">S</div>
        <div class="text-sm text-slate-400 truncate">${getUserEmail()}</div>
      </div>
    </div>
  `;

  overlay.appendChild(panel);
  document.body.appendChild(overlay);

  const list = panel.querySelector("#appShellMenuList");
  MENU_ITEMS.forEach((item, index) => {
    if (index === 2 || index === 5) {
      const divider = document.createElement("div");
      divider.className = "my-2 border-t border-slate-800";
      list.appendChild(divider);
    }

    const btn = document.createElement(item.href ? "a" : "button");
    btn.className = "w-full text-left px-2.5 py-2 rounded-lg hover:bg-slate-900/70 flex items-center gap-3 text-slate-200";
    btn.innerHTML = `
      <span class="w-5 h-5 inline-flex items-center justify-center text-slate-400">
        <svg viewBox="0 0 24 24" class="w-5 h-5" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true">
          ${iconSvg(item.icon)}
        </svg>
      </span>
      <span class="text-[15px]">${item.label}</span>
    `;

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
  const legacyTitleEl = document.getElementById("headerTitle");
  if (titleEl) titleEl.textContent = title;
  if (legacyTitleEl) legacyTitleEl.textContent = title;

  const activeTab = resolveActiveTab();
  document.querySelectorAll("[data-shell-tab]").forEach((el) => {
    const key = el.getAttribute("data-shell-tab");
    const active = key === activeTab;
    el.classList.toggle("bg-slate-900/80", active);
    el.classList.toggle("text-slate-100", active);
    el.classList.toggle("text-slate-400", !active);
    if (el.tagName === "A") el.href = TAB_LINKS[key] || "/index.html";
  });

  const btnMenu = document.getElementById("btnShellMenu") || document.getElementById("btnMenu");
  const btnSearch = document.getElementById("btnShellSearch") || document.getElementById("btnSearch");
  const btnAdd = document.getElementById("btnShellAdd") || document.getElementById("btnAdd");
  const btnRefresh = document.getElementById("btnShellRefresh") || document.getElementById("btnRefresh");
  const btnSelectLegacy = document.getElementById("btnSelectMode");
  const searchWrap = document.getElementById("appShellSearchWrap") || document.getElementById("searchWrap");
  const searchInput = document.getElementById("appShellSearchInput") || document.getElementById("searchInput");

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
  btnSelectLegacy?.remove();

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
