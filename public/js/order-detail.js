import { createDropdown } from "./components/dropdown.js";
import { getImageUrl } from "./image.js";
import { getOrderDetail, updateOrderStatus, updatePaymentStatus } from "./services/orders-service.js";
import * as orderStatusModule from "./order-status.js";
import { formatOrderRef } from "./order-ref.js";
import { showToast } from "./toast.js";

const ORDER_STATUS = orderStatusModule.ORDER_STATUS ?? ["Reservado", "Preparado", "Entregado", "Finalizado", "Cancelado"];
const PAYMENT_STATUS = orderStatusModule.PAYMENT_STATUS ?? ["Pendiente", "Parcial", "Finalizado", "Cancelado"];
const normalizeStatus = orderStatusModule.normalizeStatus ?? ((status) => String(status ?? "").trim());
const statusLabel = orderStatusModule.statusLabel ?? ((status) => String(status ?? ""));

function escapeHtml(str) {
  return String(str ?? "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

function initials(value) {
  const clean = String(value || "").trim();
  if (!clean) return "--";
  const parts = clean.split(/\s+/).slice(0, 2);
  return parts.map((p) => p[0]?.toUpperCase() || "").join("") || "--";
}

function getCustomerModel(order) {
  const customerRow = order.customers || {};
  const name = order.customer_name_snapshot || order.customer_name || customerRow.full_name || "Cliente sin nombre";
  const phone = order.customer_phone_snapshot || order.customer_phone || customerRow.phone || "Sin telefono";
  const email = order.customer_email_snapshot || customerRow.email || "Sin email";
  const address = order.customer_address_snapshot || "Direccion no disponible";
  return { name, phone, email, address };
}

function itemLineCode(orderRef, item, index) {
  const sku = String(item?.sku_snapshot || "").trim();
  if (sku) return `#${sku}`;
  return `${orderRef}-${String(index + 1).padStart(2, "0")}`;
}

export async function initOrderDetailScreen({ containerId = "order-detail-container", orderId = null } = {}) {
  const root = document.getElementById(containerId);
  if (!root) return;

  const id = orderId || new URLSearchParams(location.search).get("id");
  if (!id) {
    root.innerHTML = `<div class="rounded-2xl bg-white shadow-sm p-4 text-sm text-red-600">Falta el parametro <code>id</code>.</div>`;
    return;
  }

  const currencyFmt = new Intl.NumberFormat("es-AR", {
    style: "currency",
    currency: "ARS",
    maximumFractionDigits: 0
  });

  const dateFmt = new Intl.DateTimeFormat("es-AR", {
    weekday: "short",
    day: "2-digit",
    month: "short",
    hour: "2-digit",
    minute: "2-digit"
  });

  const dropdownInstances = [];

  function destroyDropdowns() {
    while (dropdownInstances.length) {
      const instance = dropdownInstances.pop();
      instance?.destroy?.();
    }
  }

  function renderOrderDetail(order) {
    destroyDropdowns();

    const customer = getCustomerModel(order);
    const orderRef = formatOrderRef(order);
    const createdAt = order.created_at ? new Date(order.created_at) : new Date();
    const orderAmount = Number(order.subtotal ?? order.total ?? 0);
    const promoAmount = Number(order.discount_amount ?? 0);
    const deliveryAmount = Number(order.shipping_amount ?? 0);
    const taxAmount = Number(order.tax_amount ?? 0);
    const totalAmount = Number(order.grand_total ?? order.total ?? 0);
    const items = Array.isArray(order.order_items) ? order.order_items : [];

    const itemsHtml = items.length
      ? items.map((item, idx) => {
          const product = item.products || {};
          const imagePath = String(product.image_path || "").replace(/^\/+/, "");
          const imageUrl = imagePath ? getImageUrl(imagePath) : "";
          const productName = item.product_name_snapshot || product.name || "Producto";
          const variant = item.variant_name_snapshot || "General";
          const qty = Number(item.qty ?? 0);
          const lineTotal = Number(item.subtotal ?? 0);
          const lineCode = itemLineCode(orderRef, item, idx);

          return `
            <article class="flex items-start gap-3 py-2 ${idx < items.length - 1 ? "border-b border-slate-100" : ""}">
              <div class="w-14 h-14 rounded-xl overflow-hidden bg-slate-100 shrink-0">
                ${imageUrl
                  ? `<img src="${escapeHtml(imageUrl)}" alt="${escapeHtml(productName)}" class="w-full h-full object-cover" />`
                  : `<div class="w-full h-full grid place-items-center text-[10px] text-slate-400">No img</div>`}
              </div>

              <div class="min-w-0 flex-1">
                <h4 class="text-sm font-semibold text-slate-900 truncate">${escapeHtml(productName)}</h4>
                <p class="text-xs text-slate-500 mt-1">Qty: ${qty} pcs / ${escapeHtml(variant)}</p>
              </div>

              <div class="text-right shrink-0">
                <div class="text-sm font-semibold text-slate-900">${currencyFmt.format(lineTotal)}</div>
                <div class="text-[11px] text-slate-400 mt-1">${escapeHtml(lineCode)}</div>
              </div>
            </article>
          `;
        }).join("")
      : `<p class="text-sm text-slate-500">Este pedido no tiene items.</p>`;

    root.innerHTML = `
      <section class="space-y-4">
        <div class="flex items-center justify-between px-1">
          <button id="btnBack" type="button" aria-label="Volver" class="w-9 h-9 inline-flex items-center justify-center rounded-lg bg-white shadow-sm text-slate-700">
            <svg viewBox="0 0 24 24" class="w-5 h-5" fill="none" stroke="currentColor" stroke-width="1.8" aria-hidden="true">
              <path d="M15 6l-6 6 6 6"></path>
            </svg>
          </button>
          <h1 class="text-base font-semibold text-slate-900">Order Details</h1>
          <span class="w-9 h-9"></span>
        </div>

        <article class="bg-white rounded-2xl shadow-sm p-4 space-y-3">
          <div class="flex items-start justify-between">
            <h2 class="text-sm font-semibold text-slate-900">Info Cliente</h2>
            <button type="button" aria-label="More customer actions" class="w-8 h-8 inline-flex items-center justify-center rounded-lg text-slate-500 hover:bg-slate-100">
              <svg viewBox="0 0 24 24" class="w-5 h-5" fill="none" stroke="currentColor" stroke-width="1.8" aria-hidden="true">
                <circle cx="12" cy="5" r="1.5"></circle>
                <circle cx="12" cy="12" r="1.5"></circle>
                <circle cx="12" cy="19" r="1.5"></circle>
              </svg>
            </button>
          </div>

          <div class="flex items-start gap-3">
            <div class="w-12 h-12 rounded-full bg-slate-200 text-slate-700 grid place-items-center font-semibold text-sm shrink-0">${escapeHtml(initials(customer.name))}</div>
            <div class="min-w-0 flex-1 space-y-1">
              <p class="text-sm font-semibold text-slate-900 truncate">${escapeHtml(customer.name)}</p>
              <p class="text-xs text-slate-500 truncate">${escapeHtml(customer.email)}</p>
              <p class="text-xs text-slate-600 flex items-start gap-1.5">
                <svg viewBox="0 0 24 24" class="w-4 h-4 mt-[1px] shrink-0" fill="none" stroke="currentColor" stroke-width="1.8" aria-hidden="true">
                  <path d="M12 21s7-4.5 7-11a7 7 0 1 0-14 0c0 6.5 7 11 7 11z"></path>
                  <circle cx="12" cy="10" r="2.5"></circle>
                </svg>
                <span class="break-words">${escapeHtml(customer.address)}</span>
              </p>
              <p class="text-xs text-slate-600 flex items-center gap-1.5">
                <svg viewBox="0 0 24 24" class="w-4 h-4 shrink-0" fill="none" stroke="currentColor" stroke-width="1.8" aria-hidden="true">
                  <path d="M22 16.9v3a2 2 0 0 1-2.2 2 19.8 19.8 0 0 1-8.6-3.1 19.5 19.5 0 0 1-6-6 19.8 19.8 0 0 1-3.1-8.7A2 2 0 0 1 4 2h3a2 2 0 0 1 2 1.7c.1.9.4 1.8.7 2.6a2 2 0 0 1-.5 2.1L8 9.6a16 16 0 0 0 6.4 6.4l1.2-1.2a2 2 0 0 1 2.1-.5c.8.3 1.7.6 2.6.7A2 2 0 0 1 22 16.9z"></path>
                </svg>
                <span>${escapeHtml(customer.phone)}</span>
              </p>
            </div>
          </div>
        </article>

        <article class="bg-white rounded-2xl shadow-sm p-4 space-y-3">
          <div class="flex items-center justify-between gap-2">
            <h2 class="text-sm font-semibold text-slate-900">Resumen del Pedido</h2>
            <span class="text-xs text-slate-500 text-right">${escapeHtml(orderRef)} &bull; ${escapeHtml(dateFmt.format(createdAt))}</span>
          </div>
          <div>${itemsHtml}</div>
        </article>

        <article class="bg-white rounded-2xl shadow-sm p-4 space-y-3">
          <h2 class="text-sm font-semibold text-slate-900">Detalles del Precio</h2>
          <div class="space-y-2 text-sm">
            <div class="flex items-center justify-between text-slate-600"><span>Monto Pedido</span><span>${currencyFmt.format(orderAmount)}</span></div>
            <div class="flex items-center justify-between text-slate-600"><span>Descuento Promo</span><span>${promoAmount > 0 ? `-${currencyFmt.format(promoAmount)}` : currencyFmt.format(0)}</span></div>
            <div class="flex items-center justify-between text-slate-600"><span>Envio</span><span>${currencyFmt.format(deliveryAmount)}</span></div>
            <div class="flex items-center justify-between text-slate-600"><span>Impuesto</span><span>${currencyFmt.format(taxAmount)}</span></div>
          </div>
          <div class="border-t border-slate-200 pt-3 flex items-center justify-between">
            <span class="text-base font-semibold text-slate-900">Total Pedido</span>
            <span class="text-lg font-bold text-slate-900">${currencyFmt.format(totalAmount)}</span>
          </div>
        </article>

        <div class="grid grid-cols-2 gap-3 pt-1 pb-2">
          <div id="orderStatusDropdown"></div>
          <div id="paymentStatusDropdown"></div>
        </div>
      </section>
    `;

    document.getElementById("btnBack")?.addEventListener("click", () => {
      if (window.history.length > 1) {
        window.history.back();
        return;
      }
      location.href = "/pages/pedidos.html";
    });

    const orderDropdown = createDropdown({
      containerId: "orderStatusDropdown",
      options: ORDER_STATUS.map((status) => ({ value: status, label: statusLabel(status) })),
      selected: normalizeStatus(order.order_status || "Reservado"),
      labelPrefix: "Estado",
      onChange: async (next) => {
        if (next === order.order_status) return;

        try {
          await updateOrderStatus(order.id, next);
          order.order_status = next;
          showToast(`Estado pedido: ${statusLabel(next)}`, { type: "success", duration: 1500 });
          renderOrderDetail(order);
        } catch (error) {
          console.error(error);
          showToast("No se pudo actualizar el estado del pedido", { type: "error", duration: 2000 });
        }
      }
    });

    const paymentDropdown = createDropdown({
      containerId: "paymentStatusDropdown",
      options: PAYMENT_STATUS.map((status) => ({ value: status, label: statusLabel(status) })),
      selected: normalizeStatus(order.payment_status || "Pendiente"),
      labelPrefix: "Pago",
      onChange: async (next) => {
        if (next === order.payment_status) return;

        try {
          await updatePaymentStatus(order.id, next);
          order.payment_status = next;
          showToast(`Estado pago: ${statusLabel(next)}`, { type: "success", duration: 1500 });
          renderOrderDetail(order);
        } catch (error) {
          console.error(error);
          showToast("No se pudo actualizar el estado de pago", { type: "error", duration: 2000 });
        }
      }
    });

    dropdownInstances.push(orderDropdown, paymentDropdown);
  }

  root.innerHTML = `<div class="rounded-2xl bg-white shadow-sm p-4 text-sm text-slate-500">Cargando detalle del pedido...</div>`;

  const order = await getOrderDetail(id);
  if (!order) {
    root.innerHTML = `<div class="rounded-2xl bg-white shadow-sm p-4 text-sm text-red-600">No se encontro el pedido solicitado.</div>`;
    return;
  }

  renderOrderDetail(order);
}
