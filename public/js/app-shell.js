// public/js/app-shell.js
const TAB_LINKS = {
  home: "/pages/home.html",
  botellas: "/index.html?tab=botellas",
  perfumes: "/index.html?tab=perfumes",
  importados: "/index.html?tab=importados",
  outlet: "/index.html?tab=outlet"
};

const MENU_ITEMS = [
  { label: "Home", href: "/pages/home.html", icon: "home" },
  { label: "Catalogo", href: "/index.html?tab=perfumes", icon: "list" },
  { label: "Historial Pedidos", href: "/pages/pedidos.html", icon: "history" },
  { label: "Clientes", href: "/pages/clientes.html", icon: "users" },
  { label: "Productos", href: "/pages/productos.html", icon: "inventory" },
  { label: "Parametros", href: null, icon: "settings" },
  { label: "Inventario", href: null, icon: "inventory" },
  { label: "About", href: "/pages/about.html", icon: "info" },
  { label: "Salir", href: null, icon: "logout", action: "logout" }
];

function iconSvg(name) {
  const icons = {
    home: '<path d="M3 11l9-7 9 7"></path><path d="M5 10v10h14V10"></path><path d="M9 20v-6h6v6"></path>',
    list: '<rect x="3" y="3" width="7" height="7" rx="1"></rect><rect x="14" y="3" width="7" height="7" rx="1"></rect><rect x="14" y="14" width="7" height="7" rx="1"></rect><rect x="3" y="14" width="7" height="7" rx="1"></rect>',
    history: '<path d="M3 3v5h5"></path><path d="M3.5 8a9 9 0 1 0 2.4-3.4"></path><path d="M12 7v5l3 2"></path>',
    users: '<path d="M16 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"></path><circle cx="8.5" cy="7" r="4"></circle><path d="M20 8v6"></path><path d="M23 11h-6"></path>',
    settings: '<circle cx="12" cy="12" r="3"></circle><path d="M19.4 15a1.7 1.7 0 0 0 .3 1.8l.1.1a2 2 0 1 1-2.8 2.8l-.1-.1a1.7 1.7 0 0 0-1.8-.3 1.7 1.7 0 0 0-1 1.5V21a2 2 0 1 1-4 0v-.1a1.7 1.7 0 0 0-1-1.5 1.7 1.7 0 0 0-1.8.3l-.1.1a2 2 0 1 1-2.8-2.8l.1-.1a1.7 1.7 0 0 0 .3-1.8 1.7 1.7 0 0 0-1.5-1H3a2 2 0 1 1 0-4h.1a1.7 1.7 0 0 0 1.5-1 1.7 1.7 0 0 0-.3-1.8l-.1-.1a2 2 0 1 1 2.8-2.8l.1.1a1.7 1.7 0 0 0 1.8.3h0a1.7 1.7 0 0 0 1-1.5V3a2 2 0 1 1 4 0v.1a1.7 1.7 0 0 0 1 1.5h0a1.7 1.7 0 0 0 1.8-.3l.1-.1a2 2 0 1 1 2.8 2.8l-.1.1a1.7 1.7 0 0 0-.3 1.8v0a1.7 1.7 0 0 0 1.5 1H21a2 2 0 1 1 0 4h-.1a1.7 1.7 0 0 0-1.5 1z"></path>',
    inventory: '<path d="M3 7h18"></path><path d="M6 7l1.5-3h9L18 7"></path><rect x="4" y="7" width="16" height="13" rx="2"></rect><path d="M9 11h6"></path>',
    info: '<circle cx="12" cy="12" r="9"></circle><path d="M12 10v6"></path><circle cx="12" cy="7" r="1"></circle>',
    logout: '<path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"></path><path d="M16 17l5-5-5-5"></path><path d="M21 12H9"></path>',
    package: '<path d="M10 2h4"></path><path d="M10 2v3"></path><path d="M14 2v3"></path><path d="M9 8h6"></path><path d="M9 5h6v3l1.5 2.5V20a2 2 0 0 1-2 2h-5a2 2 0 0 1-2-2v-9.5L9 8z"></path>',
    spray: '<rect x="7" y="8" width="10" height="12" rx="2"></rect><path d="M10 8V6h4v2"></path><path d="M14 6V4h4"></path><path d="M18 4h3"></path><path d="M12 12v4"></path>',
    globe: '<circle cx="12" cy="12" r="10"></circle><path d="M2 12h20"></path><path d="M12 2a15 15 0 0 1 0 20"></path><path d="M12 2a15 15 0 0 0 0 20"></path>',
    badgePercent: '<path d="M12 2l2.2 2.2 3.1-.4 1.1 2.9 2.8 1.5-.9 3 1.7 2.6-2.3 2.1.2 3.1-3 .8-1.4 2.8-2.9-1-2.9 1-1.4-2.8-3-.8.2-3.1-2.3-2.1 1.7-2.6-.9-3 2.8-1.5 1.1-2.9 3.1.4Z"></path><path d="m9 15 6-6"></path><circle cx="9.5" cy="9.5" r=".5"></circle><circle cx="14.5" cy="14.5" r=".5"></circle>',
    layoutList: '<line x1="8" y1="6" x2="21" y2="6"></line><line x1="8" y1="12" x2="21" y2="12"></line><line x1="8" y1="18" x2="21" y2="18"></line><circle cx="3" cy="6" r="1"></circle><circle cx="3" cy="12" r="1"></circle><circle cx="3" cy="18" r="1"></circle>',
    dollar: '<line x1="12" y1="2" x2="12" y2="22"></line><path d="M17 5H9.5a3.5 3.5 0 0 0 0 7H14.5a3.5 3.5 0 0 1 0 7H7"></path>',
    search: '<circle cx="11" cy="11" r="7"></circle><path d="M20 20l-3.5-3.5"></path>',
    refresh: '<path d="M21 12a9 9 0 1 1-2.64-6.36"></path><path d="M21 3v6h-6"></path>',
    menu: '<path d="M3 6h18"></path><path d="M3 12h18"></path><path d="M3 18h18"></path>',
    plus: '<path d="M12 5v14"></path><path d="M5 12h14"></path>',
    cart: '<circle cx="9" cy="20" r="1"></circle><circle cx="17" cy="20" r="1"></circle><path d="M3 4h2l2.2 10.2a1 1 0 0 0 1 .8h8.8a1 1 0 0 0 1-.8L20 7H7"></path>'
  };
  return icons[name] ?? icons.list;
}

function renderIcon(name, sizeClass = "w-5 h-5") {
  return `<span class="flex items-center justify-center"><svg viewBox="0 0 24 24" class="${sizeClass} stroke-[1.8]" fill="none" stroke="currentColor" aria-hidden="true">${iconSvg(name)}</svg></span>`;
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
  return "home";
}

function ensureShellContainers() {
  let top = document.getElementById("appShellTop");
  let bottom = document.getElementById("appShellBottom");

  if (!top) {
    top = document.createElement("header");
    top.id = "appShellTop";
    document.body.prepend(top);
  }

  if (!bottom) {
    bottom = document.createElement("nav");
    bottom.id = "appShellBottom";
    document.body.append(bottom);
  }

  return { top, bottom };
}

function renderShell({ title }) {
  const { top, bottom } = ensureShellContainers();

  top.className = "sticky top-0 z-30 border-b divider bg-surface backdrop-blur";
  top.innerHTML = `
    <div class="px-3 py-2 flex items-center gap-2">
      <button id="btnShellMenu" class="icon-btn" aria-label="Menu">
        ${renderIcon("menu")}
      </button>
      <div class="w-8 h-8 rounded-md bg-primary-soft text-primary-strong text-xs font-bold inline-flex items-center justify-center">JYP</div>
      <h1 id="appShellTitle" class="text-base font-semibold truncate">${title}</h1>
      <div class="ml-auto flex items-center gap-1">
        <button id="btnShellSearch" class="icon-btn" aria-label="Buscar">
          ${renderIcon("search")}
        </button>
        <button id="btnShellAdd" class="icon-btn" aria-label="Ver pedido"></button>
        <button id="btnShellRefresh" class="icon-btn" aria-label="Recargar">
          ${renderIcon("refresh")}
        </button>
      </div>
    </div>

    <div id="appShellSearchWrap" class="hidden px-3 pb-2">
      <input id="appShellSearchInput" class="input" placeholder="Buscar..." />
    </div>

    <div id="updateBanner" class="hidden px-3 pb-2">
      <button id="btnUpdate" class="w-full text-left text-sm alert alert-warning">
        Hay una nueva version disponible. Tocar para actualizar.
      </button>
    </div>
  `;

  bottom.className = "fixed bottom-0 inset-x-0 z-50 bg-white border-t border-slate-200 shadow-[0_-6px_20px_rgba(0,0,0,0.06)]";
  bottom.innerHTML = `
    <div class="relative grid grid-cols-5 items-end px-3 pt-2 pb-[calc(env(safe-area-inset-bottom)+0.5rem)]">
      <a data-shell-tab="botellas" class="flex flex-col items-center justify-end gap-1 h-14 text-[12px] leading-none text-slate-500" aria-label="Botellas">
        ${renderIcon("package")}
        <span>Botellas</span>
      </a>
      <a data-shell-tab="perfumes" class="flex flex-col items-center justify-end gap-1 h-14 text-[12px] leading-none text-slate-500" aria-label="Perfumes">
        ${renderIcon("spray")}
        <span>Perfumes</span>
      </a>
      <a data-shell-tab="home" class="relative flex flex-col items-center justify-end gap-1 h-14 pt-6 text-[12px] leading-none text-slate-500" aria-label="Home">
      </a>
      <a data-shell-tab="importados" class="flex flex-col items-center justify-end gap-1 h-14 text-[12px] leading-none text-slate-500" aria-label="Importados">
        ${renderIcon("globe")}
        <span>Importados</span>
      </a>
      <a data-shell-tab="outlet" class="flex flex-col items-center justify-end gap-1 h-14 text-[12px] leading-none text-slate-500" aria-label="Outlet">
        ${renderIcon("badgePercent")}
        <span>Outlet</span>
      </a>

      <div class="pointer-events-none absolute left-1/2 -translate-x-1/2 -translate-y-4">
        <div class="rounded-full bg-gradient-to-br from-emerald-400 via-blue-500 to-purple-500 p-[2px] shadow-[0_12px_30px_rgba(0,0,0,0.18)]">
          <a data-shell-tab="home" class="pointer-events-auto relative w-16 h-16 rounded-full bg-white border-[6px] border-white grid place-items-center text-blue-600" aria-label="Home">
            ${renderIcon("home", "w-7 h-7")}
          </a>
        </div>
      </div>
    </div>
  `;
}

function createMenuDrawer() {
  let overlay = document.getElementById("appShellMenuOverlay");
  if (overlay) return overlay;

  overlay = document.createElement("div");
  overlay.id = "appShellMenuOverlay";
  overlay.className = "hidden fixed inset-0 z-50 overlay-backdrop";

  const panel = document.createElement("aside");
  panel.className = "absolute left-0 top-0 h-full w-72 max-w-[84vw] bg-surface border-r divider flex flex-col";
  panel.innerHTML = `
    <div class="px-4 py-3 border-b divider">
      <div class="flex items-center justify-between">
        <div class="flex items-center gap-3">
          <div class="w-8 h-8 rounded-md bg-primary-soft text-primary-strong text-xs font-bold inline-flex items-center justify-center">JYP</div>
          <div class="font-semibold">JyP Trend New</div>
        </div>
        <button id="appShellMenuClose" class="icon-btn !w-8 !h-8">X</button>
      </div>
    </div>
    <nav id="appShellMenuList" class="flex-1 overflow-y-auto px-3 py-3 space-y-1"></nav>
    <div class="border-t divider px-4 py-3">
      <div class="flex items-center gap-3">
        <div class="w-8 h-8 rounded-full bg-primary text-inverse text-sm font-semibold inline-flex items-center justify-center">S</div>
        <div class="text-sm text-muted truncate">${getUserEmail()}</div>
      </div>
    </div>
  `;

  overlay.appendChild(panel);
  document.body.appendChild(overlay);

  const list = panel.querySelector("#appShellMenuList");
  MENU_ITEMS.forEach((item, index) => {
    if (index === 3 || index === 7) {
      const divider = document.createElement("div");
      divider.className = "my-2 border-t divider";
      list.appendChild(divider);
    }

    const btn = document.createElement(item.href ? "a" : "button");
    btn.className = "w-full text-left px-2.5 py-2 rounded-lg hover-surface-2 flex items-center gap-3";
    btn.innerHTML = `
      <span class="w-5 h-5 inline-flex items-center justify-center text-subtle">
        <svg viewBox="0 0 24 24" class="w-5 h-5 stroke-[1.8]" fill="none" stroke="currentColor" aria-hidden="true">${iconSvg(item.icon)}</svg>
      </span>
      <span class="text-[15px]">${item.label}</span>
    `;

    if (item.href) {
      btn.setAttribute("href", item.href);
    } else {
      btn.setAttribute("type", "button");
      btn.addEventListener("click", async () => {
        if (item.action === "logout") {
          try {
            const { signOut } = await import("/js/auth.js");
            await signOut();
          } catch (e) {
            console.error("Logout error:", e);
          } finally {
            location.href = "/pages/login.html";
          }
          return;
        }
        alert(`"${item.label}" estara disponible pronto.`);
      });
    }

    list.appendChild(btn);
  });

  panel.querySelector("#appShellMenuClose")?.addEventListener("click", () => {
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
  renderShell({ title });

  const activeTab = resolveActiveTab();
  document.querySelectorAll("[data-shell-tab]").forEach((el) => {
    const key = el.getAttribute("data-shell-tab");
    const active = key === activeTab;
    el.classList.toggle("text-blue-600", active);
    el.classList.toggle("font-semibold", active);
    if (key === "outlet") {
      el.classList.toggle("text-rose-600", !active);
      el.classList.remove("text-slate-500");
    } else {
      el.classList.toggle("text-slate-500", !active);
      el.classList.remove("text-rose-600");
    }
    el.setAttribute("aria-current", active ? "page" : "false");
    if (el.tagName === "A") el.href = TAB_LINKS[key] || "/index.html";
  });

  const btnMenu = document.getElementById("btnShellMenu");
  const btnSearch = document.getElementById("btnShellSearch");
  const btnAdd = document.getElementById("btnShellAdd");
  const btnRefresh = document.getElementById("btnShellRefresh");
  const searchWrap = document.getElementById("appShellSearchWrap");
  const searchInput = document.getElementById("appShellSearchInput");

  const menuOverlay = createMenuDrawer();

  if (btnAdd) {
    btnAdd.setAttribute("aria-label", "Ver pedido");
    btnAdd.classList.add("relative");
    btnAdd.innerHTML = `
      ${renderIcon("cart", "w-6 h-6")}
      <span id="appShellCartCount" class="absolute -top-1 -right-1 min-w-[18px] h-[18px] px-1 rounded-full bg-primary text-[10px] leading-[18px] text-inverse font-bold text-center">0</span>
    `;
  }

  btnMenu?.addEventListener("click", () => {
    menuOverlay.classList.remove("hidden");
  });

  btnSearch?.addEventListener("click", () => {
    searchWrap?.classList.toggle("hidden");
    if (searchWrap && !searchWrap.classList.contains("hidden")) searchInput?.focus();
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
