import { getImageUrl } from "./image.js";
import { formatOrderRef, matchesOrderQuery } from "./order-ref.js";
import { ORDER_STATUS, normalizeStatus, statusLabel } from "./order-status.js";
import { getMyOrders, getOrderDetail } from "./orders-service.js";

function escapeHtml(str) {
  return String(str ?? "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

function statusUiLabel(status) {
  return statusLabel(status) || "Unknown";
}

function statusBadgeClass(status) {
  switch (normalizeStatus(status)) {
    case "Reservado":
      return "bg-orange-50 text-orange-700 border border-orange-200";
    case "Preparado":
      return "bg-blue-50 text-blue-700 border border-blue-200";
    case "Entregado":
      return "bg-emerald-50 text-emerald-700 border border-emerald-200";
    case "Finalizado":
      return "bg-slate-100 text-slate-700 border border-slate-200";
    case "Cancelado":
      return "bg-red-50 text-red-700 border border-red-200";
    default:
      return "bg-slate-100 text-slate-700 border border-slate-200";
  }
}

function orderDateGroupLabel(date) {
  const now = new Date();
  const startToday = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const startGiven = new Date(date.getFullYear(), date.getMonth(), date.getDate());
  const diffDays = Math.round((startToday - startGiven) / 86400000);

  if (diffDays === 0) return "Today";
  if (diffDays === 1) return "Yesterday";
  return date.toLocaleDateString("en-US", { month: "short", day: "numeric" });
}

function buildOrderCardModel(summaryRow, detailRow) {
  const items = Array.isArray(detailRow?.order_items) ? detailRow.order_items : [];
  const firstItem = items[0] ?? null;
  const product = firstItem?.products ?? null;

  const qty = items.reduce((sum, item) => sum + Number(item?.qty ?? 0), 0);
  const productName = String(product?.name || "Order Items");
  const imagePath = String(product?.image_path || "").trim().replace(/^\/+/, "");

  return {
    id: summaryRow.id,
    ref: formatOrderRef(summaryRow),
    createdAt: new Date(summaryRow.created_at),
    customer: String(summaryRow.customer_name || detailRow?.customer_name || "Sin cliente"),
    status: normalizeStatus(summaryRow.order_status || "Reservado"),
    qty: qty > 0 ? qty : 1,
    productName,
    imageUrl: imagePath ? getImageUrl(imagePath) : "",
    searchSource: {
      ...summaryRow,
      customer_name: summaryRow.customer_name || detailRow?.customer_name || "",
      order_number: summaryRow.order_number
    }
  };
}

export async function initOrdersScreen({ containerId = "orders-container" } = {}) {
  const root = document.getElementById(containerId);
  if (!root) return;

  root.innerHTML = `
    <section class="space-y-4">
      <div class="bg-slate-50 rounded-xl shadow-sm p-2 flex items-center gap-2">
        <label class="flex-1 flex items-center gap-2 bg-white rounded-xl px-3 py-2.5 shadow-sm">
          <svg viewBox="0 0 24 24" class="w-5 h-5 text-slate-400" fill="none" stroke="currentColor" stroke-width="1.8" aria-hidden="true">
            <circle cx="11" cy="11" r="7"></circle>
            <path d="M20 20l-3.5-3.5"></path>
          </svg>
          <input id="ordersSearchInput" class="w-full bg-transparent outline-none text-sm" placeholder="Search order..." />
        </label>

        <div class="relative">
          <button id="ordersFilterBtn" type="button" class="w-11 h-11 rounded-xl bg-white shadow-sm inline-flex items-center justify-center text-slate-600" aria-label="Filter orders">
            <svg viewBox="0 0 24 24" class="w-5 h-5" fill="none" stroke="currentColor" stroke-width="1.8" aria-hidden="true">
              <line x1="4" y1="6" x2="20" y2="6"></line>
              <circle cx="9" cy="6" r="2"></circle>
              <line x1="4" y1="12" x2="20" y2="12"></line>
              <circle cx="15" cy="12" r="2"></circle>
              <line x1="4" y1="18" x2="20" y2="18"></line>
              <circle cx="11" cy="18" r="2"></circle>
            </svg>
          </button>

          <div id="ordersFilterMenu" class="hidden absolute right-0 mt-2 w-44 bg-white rounded-xl shadow-md border border-slate-100 p-2 z-10"></div>
        </div>
      </div>

      <div id="ordersListWrap" class="space-y-4"></div>
    </section>
  `;

  const searchInput = document.getElementById("ordersSearchInput");
  const filterBtn = document.getElementById("ordersFilterBtn");
  const filterMenu = document.getElementById("ordersFilterMenu");
  const listWrap = document.getElementById("ordersListWrap");

  let allOrders = [];
  let statusFilter = "all";

  filterMenu.innerHTML = [
    `<button data-status="all" class="w-full text-left px-3 py-2 rounded-lg text-sm hover:bg-slate-50">All statuses</button>`,
    ...ORDER_STATUS.map((status) => `<button data-status="${status}" class="w-full text-left px-3 py-2 rounded-lg text-sm hover:bg-slate-50">${escapeHtml(statusUiLabel(status))}</button>`)
  ].join("");

  function filteredOrders() {
    const q = String(searchInput?.value || "").toLowerCase().trim();

    return allOrders.filter((order) => {
      if (statusFilter !== "all" && order.status !== statusFilter) return false;
      if (!q) return true;

      return (
        matchesOrderQuery(order.searchSource, q) ||
        order.productName.toLowerCase().includes(q)
      );
    });
  }

  function renderOrders() {
    const rows = filteredOrders();
    if (!rows.length) {
      listWrap.innerHTML = `<div class="text-sm text-slate-500 bg-white rounded-xl shadow-sm p-4">No orders match your search/filter.</div>`;
      return;
    }

    const groups = new Map();
    rows.forEach((order) => {
      const label = orderDateGroupLabel(order.createdAt);
      if (!groups.has(label)) groups.set(label, []);
      groups.get(label).push(order);
    });

    const sections = [];
    for (const [label, items] of groups.entries()) {
      const cards = items.map((order) => {
        const timeText = order.createdAt.toLocaleTimeString("en-US", { hour: "2-digit", minute: "2-digit" });
        return `
          <a href="/pages/pedido-detalle.html?id=${encodeURIComponent(order.id)}" class="block bg-white rounded-xl shadow-sm p-3">
            <div class="flex items-start gap-3">
              <div class="w-14 h-14 rounded-lg shrink-0 bg-slate-100 overflow-hidden">
                ${order.imageUrl ? `<img src="${escapeHtml(order.imageUrl)}" alt="${escapeHtml(order.productName)}" class="w-full h-full object-cover" />` : ""}
              </div>

              <div class="min-w-0 flex-1">
                <div class="font-semibold text-sm text-slate-900 truncate">${escapeHtml(order.productName)}</div>
                <div class="text-xs text-slate-500 mt-0.5">${escapeHtml(timeText)}</div>
                <div class="text-xs text-slate-600 mt-1">${order.qty} pcs | ${escapeHtml(order.customer)}</div>
              </div>

              <div class="text-right shrink-0">
                <span class="inline-flex px-2 py-1 rounded-full text-[11px] font-medium ${statusBadgeClass(order.status)}">${escapeHtml(statusUiLabel(order.status))}</span>
                <div class="text-xs text-slate-500 mt-2">${escapeHtml(order.ref)}</div>
              </div>
            </div>
          </a>
        `;
      }).join("");

      sections.push(`
        <section class="space-y-2">
          <h2 class="text-sm font-semibold text-slate-700">${escapeHtml(label)}</h2>
          <div class="space-y-2">${cards}</div>
        </section>
      `);
    }

    listWrap.innerHTML = sections.join("");
  }

  filterBtn?.addEventListener("click", () => {
    filterMenu?.classList.toggle("hidden");
  });

  filterMenu?.querySelectorAll("[data-status]")?.forEach((btn) => {
    btn.addEventListener("click", () => {
      statusFilter = btn.getAttribute("data-status") || "all";
      filterMenu.classList.add("hidden");
      renderOrders();
    });
  });

  document.addEventListener("click", (event) => {
    if (!filterMenu || !filterBtn) return;
    if (filterMenu.contains(event.target) || filterBtn.contains(event.target)) return;
    filterMenu.classList.add("hidden");
  });

  searchInput?.addEventListener("input", renderOrders);

  listWrap.innerHTML = `<div class="text-sm text-slate-500 bg-white rounded-xl shadow-sm p-4">Loading orders...</div>`;

  const summary = await getMyOrders({ limit: 80 });
  const details = await Promise.all(summary.map((row) => getOrderDetail(row.id)));
  allOrders = summary.map((row, idx) => buildOrderCardModel(row, details[idx])).sort((a, b) => b.createdAt - a.createdAt);

  renderOrders();
}
