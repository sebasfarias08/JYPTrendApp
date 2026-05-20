import { formatOrderRef, matchesOrderQuery } from "../../shared/utils/order-ref.js";
import * as orderStatusModule from "../../shared/utils/order-status.js";
import { getOrdersReportPage } from "./orders-service.js";

const ORDER_STATUS = orderStatusModule.ORDER_STATUS ?? ["Reservado", "Preparado", "Entregado", "Finalizado", "Cancelado"];
const normalizeStatus = orderStatusModule.normalizeStatus ?? ((status) => String(status ?? "").trim());
const statusLabel = orderStatusModule.statusLabel ?? ((status) => String(status ?? ""));

const moneyFmt = new Intl.NumberFormat("es-AR", {
  style: "currency",
  currency: "ARS",
  maximumFractionDigits: 0
});

function escapeHtml(str) {
  return String(str ?? "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

function formatDateTime(value) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "Sin fecha";
  return date.toLocaleString("es-AR", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit"
  });
}

function formatMoney(value) {
  return moneyFmt.format(Number(value ?? 0));
}

function itemName(item) {
  return String(item?.product_name_snapshot || item?.products?.name || "Producto sin nombre").trim();
}

function itemVariant(item) {
  return String(item?.variant_name_snapshot || item?.product_variants?.variant_name || "").trim();
}

function itemSubtotal(item) {
  const subtotal = Number(item?.subtotal);
  if (Number.isFinite(subtotal) && subtotal > 0) return subtotal;
  return Number(item?.qty ?? 0) * Number(item?.unit_price ?? 0);
}

function orderCustomer(order) {
  return String(order?.customer_name || order?.customer_name_snapshot || "Sin cliente").trim();
}

function orderTotal(order) {
  const candidates = [order?.grand_total, order?.total, order?.subtotal];
  for (const value of candidates) {
    if (value === null || value === undefined || value === "") continue;
    const n = Number(value);
    if (Number.isFinite(n)) return n;
  }
  return 0;
}

function statusBadgeClass(status) {
  switch (normalizeStatus(status)) {
    case "Reservado":
      return "bg-amber-50 text-amber-700 border-amber-200";
    case "Preparado":
      return "bg-sky-50 text-sky-700 border-sky-200";
    case "Entregado":
      return "bg-emerald-50 text-emerald-700 border-emerald-200";
    case "Cancelado":
      return "bg-rose-50 text-rose-700 border-rose-200";
    default:
      return "bg-slate-100 text-slate-700 border-slate-200";
  }
}

function buildSearchText(order) {
  const items = Array.isArray(order?.order_items) ? order.order_items : [];
  return [
    orderCustomer(order),
    formatOrderRef(order),
    order?.order_number,
    order?.customer_phone,
    order?.customer_phone_snapshot,
    order?.customer_email_snapshot,
    order?.order_status,
    order?.payment_status,
    ...items.flatMap((item) => [itemName(item), itemVariant(item), item?.sku_snapshot])
  ].join(" ").toLowerCase();
}

function renderOrderRows(order) {
  const items = Array.isArray(order?.order_items) ? order.order_items : [];

  if (!items.length) {
    return `
      <tr class="border-b border-slate-100">
        <td colspan="5" class="px-3 py-4 text-sm text-slate-500">Este pedido no tiene items.</td>
      </tr>
    `;
  }

  return items.map((item) => {
    const qty = Number(item?.qty ?? 0);
    const unitPrice = Number(item?.unit_price ?? 0);
    return `
      <tr class="border-b border-slate-100">
        <td class="px-3 py-2.5 align-top">
          <div class="font-medium text-slate-900">${escapeHtml(itemName(item))}</div>
          ${itemVariant(item) ? `<div class="text-xs text-slate-500">${escapeHtml(itemVariant(item))}</div>` : ""}
        </td>
        <td class="px-3 py-2.5 align-top text-sm text-slate-600">${escapeHtml(item?.sku_snapshot || "-")}</td>
        <td class="px-3 py-2.5 align-top text-right tabular-nums">${escapeHtml(qty)}</td>
        <td class="px-3 py-2.5 align-top text-right tabular-nums">${escapeHtml(formatMoney(unitPrice))}</td>
        <td class="px-3 py-2.5 align-top text-right tabular-nums font-medium">${escapeHtml(formatMoney(itemSubtotal(item)))}</td>
      </tr>
    `;
  }).join("");
}

function renderOrderBlock(order) {
  const status = normalizeStatus(order?.order_status || "Reservado");
  const paymentStatus = String(order?.payment_status || "Pendiente");
  const customerPhone = String(order?.customer_phone || order?.customer_phone_snapshot || "").trim();
  const total = orderTotal(order);

  return `
    <section class="bg-white border border-slate-200 rounded-xl shadow-sm overflow-hidden">
      <div class="px-4 py-3 border-b border-slate-200 bg-slate-50 flex flex-col gap-2 md:flex-row md:items-start md:justify-between">
        <div class="min-w-0">
          <div class="flex flex-wrap items-center gap-2">
            <a href="/pages/pedido-detalle.html?id=${encodeURIComponent(order.id)}" class="text-sm font-semibold text-blue-700 hover:underline">${escapeHtml(formatOrderRef(order))}</a>
            <span class="inline-flex rounded-full border px-2 py-0.5 text-[11px] font-semibold ${statusBadgeClass(status)}">${escapeHtml(statusLabel(status) || status)}</span>
            <span class="inline-flex rounded-full border border-slate-200 bg-white px-2 py-0.5 text-[11px] font-semibold text-slate-600">${escapeHtml(paymentStatus)}</span>
          </div>
          <div class="mt-1 text-sm font-medium text-slate-900">${escapeHtml(orderCustomer(order))}</div>
          <div class="mt-0.5 text-xs text-slate-500">${escapeHtml(formatDateTime(order?.created_at))}${customerPhone ? ` - ${escapeHtml(customerPhone)}` : ""}</div>
        </div>
        <div class="text-left md:text-right">
          <div class="text-xs uppercase text-slate-500">Total pedido</div>
          <div class="text-lg font-bold text-slate-900 tabular-nums">${escapeHtml(formatMoney(total))}</div>
        </div>
      </div>

      <div class="overflow-x-auto">
        <table class="min-w-[760px] w-full border-collapse text-sm">
          <thead class="bg-white text-xs uppercase tracking-wide text-slate-500">
            <tr class="border-b border-slate-200">
              <th class="px-3 py-2 text-left font-semibold">Producto</th>
              <th class="px-3 py-2 text-left font-semibold">SKU</th>
              <th class="px-3 py-2 text-right font-semibold">Cant.</th>
              <th class="px-3 py-2 text-right font-semibold">Precio</th>
              <th class="px-3 py-2 text-right font-semibold">Subtotal</th>
            </tr>
          </thead>
          <tbody>
            ${renderOrderRows(order)}
            <tr class="bg-slate-50">
              <td colspan="4" class="px-3 py-3 text-right text-sm font-bold text-slate-900">Total</td>
              <td class="px-3 py-3 text-right text-sm font-bold text-slate-900 tabular-nums">${escapeHtml(formatMoney(total))}</td>
            </tr>
          </tbody>
        </table>
      </div>
    </section>
  `;
}

function debounce(fn, wait = 180) {
  let timer = 0;
  return (...args) => {
    window.clearTimeout(timer);
    timer = window.setTimeout(() => fn(...args), wait);
  };
}

export async function initOrdersReportScreen({ containerId = "orders-report-container" } = {}) {
  const root = document.getElementById(containerId);
  if (!root) return;

  root.innerHTML = `
    <section class="space-y-4">
      <div class="bg-white border border-slate-200 rounded-xl shadow-sm p-3">
        <div class="grid gap-2 md:grid-cols-[1fr_180px]">
          <label class="input flex items-center gap-2 !p-0 !px-3">
            <span class="text-slate-400">
              <svg viewBox="0 0 24 24" class="w-5 h-5" fill="none" stroke="currentColor" stroke-width="1.8" aria-hidden="true">
                <circle cx="11" cy="11" r="7"></circle>
                <path d="M20 20l-3.5-3.5"></path>
              </svg>
            </span>
            <input id="ordersReportSearch" class="w-full bg-transparent outline-none text-sm" placeholder="Buscar pedido, cliente, producto o SKU" />
          </label>

          <select id="ordersReportStatus" class="input text-sm">
            <option value="">Todos los estados</option>
            ${ORDER_STATUS.map((status) => `<option value="${escapeHtml(status)}">${escapeHtml(statusLabel(status) || status)}</option>`).join("")}
          </select>
        </div>
        <div id="ordersReportSummary" class="mt-3 text-sm text-slate-600">Cargando pedidos...</div>
      </div>

      <div id="ordersReportList" class="space-y-4"></div>

      <button id="ordersReportLoadMore" type="button" class="hidden w-full rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm font-semibold text-slate-700 shadow-sm">
        Cargar mas pedidos
      </button>
    </section>
  `;

  const searchInput = document.getElementById("ordersReportSearch");
  const statusSelect = document.getElementById("ordersReportStatus");
  const summaryEl = document.getElementById("ordersReportSummary");
  const listEl = document.getElementById("ordersReportList");
  const loadMoreBtn = document.getElementById("ordersReportLoadMore");

  const PAGE_SIZE = 20;
  let rows = [];
  let totalRows = 0;
  let isLoading = false;

  function filteredRows() {
    const q = String(searchInput?.value || "").toLowerCase().trim();
    const status = normalizeStatus(statusSelect?.value || "");

    return rows.filter((order) => {
      if (status && normalizeStatus(order?.order_status) !== status) return false;
      if (!q) return true;
      return matchesOrderQuery(order, q) || buildSearchText(order).includes(q);
    });
  }

  function render() {
    const visibleRows = filteredRows();
    const visibleTotal = visibleRows.reduce((sum, order) => sum + orderTotal(order), 0);

    summaryEl.textContent = `${visibleRows.length} de ${totalRows} pedidos cargados - Total visible ${formatMoney(visibleTotal)}`;

    if (!visibleRows.length) {
      listEl.innerHTML = `<div class="rounded-xl border border-slate-200 bg-white p-4 text-sm text-slate-500">No hay pedidos para mostrar con los filtros actuales.</div>`;
    } else {
      listEl.innerHTML = visibleRows.map(renderOrderBlock).join("");
    }

    const hasMore = rows.length < totalRows;
    loadMoreBtn?.classList.toggle("hidden", !hasMore);
    if (loadMoreBtn) {
      loadMoreBtn.disabled = isLoading;
      loadMoreBtn.textContent = isLoading ? "Cargando..." : "Cargar mas pedidos";
    }
  }

  async function loadNextPage() {
    if (isLoading) return;
    isLoading = true;
    render();

    try {
      const result = await getOrdersReportPage({
        limit: PAGE_SIZE,
        offset: rows.length
      });
      totalRows = result.total;
      rows = rows.concat(result.rows ?? []);
    } finally {
      isLoading = false;
      render();
    }
  }

  searchInput?.addEventListener("input", debounce(render, 180));
  statusSelect?.addEventListener("change", render);
  loadMoreBtn?.addEventListener("click", loadNextPage);

  listEl.innerHTML = `<div class="rounded-xl border border-slate-200 bg-white p-4 text-sm text-slate-500">Cargando reporte...</div>`;
  await loadNextPage();
}
