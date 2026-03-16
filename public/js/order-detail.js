import { createDropdown } from "./components/dropdown.js";
import { getImageUrl } from "./image.js";
import {
  getEditableOrderCatalog,
  getOrderDetail,
  saveOrderItems,
  softDeleteOrder,
  updateOrderStatus,
  updatePaymentStatus
} from "./services/orders-service.js";
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
  return clean.split(/\s+/).slice(0, 2).map((p) => p[0]?.toUpperCase() || "").join("") || "--";
}

function getCustomerModel(order) {
  const customerRow = order.customers || {};
  return {
    name: order.customer_name_snapshot || order.customer_name || customerRow.full_name || "Cliente sin nombre",
    phone: order.customer_phone_snapshot || order.customer_phone || customerRow.phone || "Sin telefono",
    email: order.customer_email_snapshot || customerRow.email || "Sin email",
    address: order.customer_address_snapshot || "Direccion no disponible"
  };
}

function itemLineCode(orderRef, item, index) {
  const sku = String(item?.sku_snapshot || "").trim();
  return sku ? `#${sku}` : `${orderRef}-${String(index + 1).padStart(2, "0")}`;
}

function orderStatusToneClass(status) {
  switch (normalizeStatus(status)) {
    case "Reservado": return "bg-amber-50 text-amber-700 border border-amber-200";
    case "Preparado": return "bg-sky-50 text-sky-700 border border-sky-200";
    case "Entregado": return "bg-emerald-50 text-emerald-700 border border-emerald-200";
    case "Finalizado": return "bg-slate-100 text-slate-700 border border-slate-200";
    case "Cancelado": return "bg-rose-50 text-rose-700 border border-rose-200";
    default: return "bg-slate-100 text-slate-700 border border-slate-200";
  }
}

function paymentStatusToneClass(status) {
  switch (normalizeStatus(status)) {
    case "Pendiente": return "bg-yellow-50 text-yellow-700 border border-yellow-200";
    case "Parcial": return "bg-indigo-50 text-indigo-700 border border-indigo-200";
    case "Finalizado": return "bg-emerald-50 text-emerald-700 border border-emerald-200";
    case "Cancelado": return "bg-rose-50 text-rose-700 border border-rose-200";
    default: return "bg-slate-100 text-slate-700 border border-slate-200";
  }
}

function normalizeQty(value) {
  const qty = Math.trunc(Number(value ?? 0));
  return Number.isFinite(qty) ? qty : 0;
}

function mapQtyByVariant(items = []) {
  const map = new Map();
  for (const item of items ?? []) {
    const variantId = item?.variant_id ?? null;
    if (!variantId) continue;
    map.set(String(variantId), Number(map.get(String(variantId)) ?? 0) + Number(item?.qty ?? 0));
  }
  return map;
}

function getOrderItemVariantName(item) {
  return String(
    item?.variant_name_snapshot ||
    item?.product_variants?.variant_name ||
    ""
  ).trim() || "General";
}

function buildDraftItemFromOrderItem(item) {
  const product = item?.products ?? {};
  const variant = item?.product_variants ?? {};
  const variantName = getOrderItemVariantName(item);
  const productName = item?.product_name_snapshot || product?.name || "Producto";
  return {
    id: item?.id ?? null,
    product_id: item?.product_id ?? product?.id ?? null,
    variant_id: item?.variant_id ?? null,
    product_name: productName,
    display_name: variantName,
    variant_name: variantName,
    sku: item?.sku_snapshot || "",
    image_path: variant?.image_path || product?.image_path || "",
    qty: Math.max(1, normalizeQty(item?.qty ?? 1)),
    unit_price: Number(item?.unit_price ?? 0)
  };
}

function buildDraftItemFromCatalogRow(row) {
  const variantName = row?.variant_name || "General";
  return {
    id: null,
    product_id: row?.product_id ?? null,
    variant_id: row?.variant_id ?? row?.id ?? null,
    product_name: row?.product_name || "Producto",
    display_name: variantName,
    variant_name: variantName,
    sku: row?.sku || "",
    image_path: row?.image_path || "",
    qty: 1,
    unit_price: Number(row?.price ?? 0)
  };
}

function summarizeEditError(error) {
  return String(error?.message || error?.details || "").trim() || "No se pudieron guardar los cambios del pedido.";
}

export async function initOrderDetailScreen({ containerId = "order-detail-container", orderId = null } = {}) {
  const root = document.getElementById(containerId);
  if (!root) return;

  const id = orderId || new URLSearchParams(location.search).get("id");
  if (!id) {
    root.innerHTML = `<div class="rounded-2xl bg-white shadow-sm p-4 text-sm text-red-600">Falta el parametro <code>id</code>.</div>`;
    return;
  }

  const currencyFmt = new Intl.NumberFormat("es-AR", { style: "currency", currency: "ARS", maximumFractionDigits: 0 });
  const dateFmt = new Intl.DateTimeFormat("es-AR", { weekday: "short", day: "2-digit", month: "short", hour: "2-digit", minute: "2-digit" });
  const dropdownInstances = [];
  let currentOrder = null;
  let isEditModalOpen = false;
  let isLoadingEditCatalog = false;
  let isSavingEdit = false;
  let isDeletingOrder = false;
  let editCatalog = [];
  let editSearch = "";
  let editDraftItems = [];

  function destroyDropdowns() {
    while (dropdownInstances.length) dropdownInstances.pop()?.destroy?.();
  }

  function getDraftTotal(items = []) {
    return (items ?? []).reduce((sum, item) => sum + (Number(item?.unit_price ?? 0) * Number(item?.qty ?? 0)), 0);
  }

  function getCurrentOrderQtyByVariant() {
    return mapQtyByVariant(currentOrder?.order_items ?? []);
  }

  function getDraftQtyByVariant() {
    return mapQtyByVariant(editDraftItems);
  }

  function getCatalogRowByVariantId(variantId) {
    return editCatalog.find((row) => String(row.variant_id ?? row.id ?? "") === String(variantId ?? "")) ?? null;
  }

  function getVariantLimit(variantId) {
    const catalogRow = getCatalogRowByVariantId(variantId);
    if (catalogRow) return Number(catalogRow.effective_stock_qty ?? 0);
    return Number(getCurrentOrderQtyByVariant().get(String(variantId ?? "")) ?? 0);
  }

  function setDraftItemQty(index, nextQty) {
    const item = editDraftItems[index];
    if (!item) return;
    const limit = Math.max(0, getVariantLimit(item.variant_id));
    const normalized = normalizeQty(nextQty);
    if (normalized <= 0) {
      editDraftItems.splice(index, 1);
      return;
    }
    if (limit > 0 && normalized > limit) {
      showToast(`Stock maximo disponible para esta variante: ${limit}.`, { type: "warning", duration: 2200 });
      editDraftItems[index] = { ...item, qty: limit };
      return;
    }
    editDraftItems[index] = { ...item, qty: normalized };
  }

  function addCatalogItem(variantId) {
    const row = getCatalogRowByVariantId(variantId);
    if (!row) return;
    const limit = Math.max(0, Number(row.effective_stock_qty ?? 0));
    const existingIndex = editDraftItems.findIndex((item) => String(item.variant_id ?? "") === String(variantId ?? ""));
    if (existingIndex >= 0) {
      const currentQty = Number(editDraftItems[existingIndex]?.qty ?? 0);
      if (limit > 0 && currentQty >= limit) {
        showToast(`No hay mas stock disponible para ${row.product_name}.`, { type: "warning", duration: 2200 });
        return;
      }
      setDraftItemQty(existingIndex, currentQty + 1);
      return;
    }
    if (limit <= 0) {
      showToast(`Sin stock disponible para ${row.product_name}.`, { type: "warning", duration: 2200 });
      return;
    }
    editDraftItems = [...editDraftItems, buildDraftItemFromCatalogRow(row)];
  }

  function removeDraftItem(index) {
    editDraftItems.splice(index, 1);
  }

  async function reloadOrderDetail() {
    currentOrder = await getOrderDetail(id);
    return currentOrder;
  }

  async function openEditModal() {
    if (!currentOrder) return;
    if (!currentOrder.warehouse_id || !currentOrder.point_of_sale_id) {
      showToast("Este pedido no tiene contexto de stock valido para editar items.", { type: "warning", duration: 2600 });
      return;
    }
    editDraftItems = (currentOrder.order_items ?? []).map((item) => buildDraftItemFromOrderItem(item));
    editSearch = "";
    editCatalog = [];
    isEditModalOpen = true;
    isLoadingEditCatalog = true;
    renderOrderDetail(currentOrder);
    try {
      editCatalog = await getEditableOrderCatalog({
        warehouseId: currentOrder.warehouse_id,
        pointOfSaleId: currentOrder.point_of_sale_id,
        orderItems: currentOrder.order_items ?? []
      });
    } catch (error) {
      console.error(error);
      showToast("No se pudo cargar el catalogo del pedido.", { type: "error", duration: 2600 });
      editCatalog = [];
    } finally {
      isLoadingEditCatalog = false;
      renderOrderDetail(currentOrder);
    }
  }

  function closeEditModal() {
    if (isSavingEdit) return;
    isEditModalOpen = false;
    isLoadingEditCatalog = false;
    editSearch = "";
    editCatalog = [];
    editDraftItems = [];
    renderOrderDetail(currentOrder);
  }

  async function handleSaveEditedItems() {
    if (!currentOrder || isSavingEdit) return;
    isSavingEdit = true;
    renderOrderDetail(currentOrder);
    try {
      await saveOrderItems(currentOrder.id, editDraftItems, {
        warehouseId: currentOrder.warehouse_id,
        pointOfSaleId: currentOrder.point_of_sale_id,
        existingItems: currentOrder.order_items ?? []
      });
      const reloaded = await reloadOrderDetail();
      if (!reloaded) {
        location.href = "/pages/pedidos.html";
        return;
      }
      isEditModalOpen = false;
      editCatalog = [];
      editDraftItems = [];
      editSearch = "";
      showToast("Pedido actualizado.", { type: "success", duration: 2000 });
      renderOrderDetail(reloaded);
    } catch (error) {
      console.error(error);
      showToast(summarizeEditError(error), { type: "error", duration: 3200 });
    } finally {
      isSavingEdit = false;
      if (currentOrder) renderOrderDetail(currentOrder);
    }
  }

  async function handleSoftDelete() {
    if (!currentOrder || isDeletingOrder) return;
    const ok = confirm(`Borrar el pedido ${formatOrderRef(currentOrder)}? Esta accion lo ocultara del frontend.`);
    if (!ok) return;
    isDeletingOrder = true;
    renderOrderDetail(currentOrder);
    try {
      await softDeleteOrder(currentOrder.id, {
        warehouseId: currentOrder.warehouse_id,
        pointOfSaleId: currentOrder.point_of_sale_id
      });
      showToast("Pedido borrado.", { type: "success", duration: 1800 });
      location.href = "/pages/pedidos.html";
    } catch (error) {
      console.error(error);
      isDeletingOrder = false;
      renderOrderDetail(currentOrder);
      showToast("No se pudo borrar el pedido.", { type: "error", duration: 2200 });
    }
  }

  function renderEditModal(order) {
    if (!isEditModalOpen) return "";
    const currentQtyByVariant = getDraftQtyByVariant();
    const filteredCatalog = (editCatalog ?? []).filter((row) => {
      const q = String(editSearch || "").trim().toLowerCase();
      if (!q) return true;
      return (
        String(row.product_name || "").toLowerCase().includes(q) ||
        String(row.variant_name || "").toLowerCase().includes(q) ||
        String(row.sku || "").toLowerCase().includes(q)
      );
    });

    const draftItemsHtml = editDraftItems.length
      ? editDraftItems.map((item, index) => {
          const imageUrl = item.image_path ? getImageUrl(String(item.image_path).trim().replace(/^\/+/, "")) : "";
          const limit = Math.max(0, getVariantLimit(item.variant_id));
          const qty = Number(item.qty ?? 0);
          const lineTotal = Number(item.unit_price ?? 0) * qty;
          const canIncrease = limit > qty;
          return `
            <article class="rounded-2xl border border-slate-200 bg-slate-50 p-3 space-y-3">
              <div class="flex items-start gap-3">
                <div class="w-12 h-12 rounded-xl overflow-hidden bg-white border border-slate-200 shrink-0">
                  ${imageUrl ? `<img src="${escapeHtml(imageUrl)}" alt="${escapeHtml(item.product_name)}" class="w-full h-full object-cover" />` : `<div class="w-full h-full grid place-items-center text-[10px] text-slate-400">No img</div>`}
                </div>
                <div class="min-w-0 flex-1">
                  <div class="text-sm font-semibold text-slate-900">${escapeHtml(item.display_name || item.variant_name || item.product_name || "General")}</div>
                  <div class="text-xs text-slate-500 mt-1">${escapeHtml(item.product_name || "Producto")}${item.sku ? ` | ${escapeHtml(item.sku)}` : ""}</div>
                  <div class="text-xs text-slate-500 mt-1">Maximo editable: ${limit}</div>
                </div>
                <button type="button" data-remove-draft-index="${index}" class="h-9 px-3 rounded-xl border border-rose-200 bg-rose-50 text-rose-700 text-sm">Quitar</button>
              </div>
              <div class="flex items-center justify-between gap-3">
                <div class="inline-flex items-center rounded-xl border border-slate-200 bg-white overflow-hidden">
                  <button type="button" data-dec-draft-index="${index}" class="w-10 h-10 text-slate-700">-</button>
                  <span class="w-10 text-center text-sm font-semibold text-slate-900">${qty}</span>
                  <button type="button" data-inc-draft-index="${index}" class="w-10 h-10 text-slate-700 ${canIncrease ? "" : "opacity-40"}" ${canIncrease ? "" : "disabled"}>+</button>
                </div>
                <div class="text-right">
                  <div class="text-xs text-slate-500">Precio unitario</div>
                  <div class="text-sm font-semibold text-slate-900">${currencyFmt.format(item.unit_price ?? 0)}</div>
                  <div class="text-xs text-slate-500 mt-1">Linea: ${currencyFmt.format(lineTotal)}</div>
                </div>
              </div>
            </article>
          `;
        }).join("")
      : `<div class="rounded-2xl border border-dashed border-slate-300 bg-slate-50 p-4 text-sm text-slate-500">El pedido quedara sin items si guardas asi.</div>`;

    const catalogHtml = isLoadingEditCatalog
      ? `<div class="text-sm text-slate-500">Cargando variantes disponibles...</div>`
      : filteredCatalog.length
        ? filteredCatalog.map((row) => {
            const currentQty = Number(currentQtyByVariant.get(String(row.variant_id ?? row.id ?? "")) ?? 0);
            const limit = Math.max(0, Number(row.effective_stock_qty ?? 0));
            const canAdd = limit > currentQty;
            return `
              <button type="button" data-add-variant-id="${escapeHtml(row.variant_id ?? row.id ?? "")}" class="w-full rounded-2xl border border-slate-200 bg-white p-3 text-left ${canAdd ? "hover:border-slate-300" : "opacity-60"}" ${canAdd ? "" : "disabled"}>
                <div class="flex items-start justify-between gap-3">
                  <div class="min-w-0">
                    <div class="text-sm font-semibold text-slate-900">${escapeHtml(row.variant_name || "General")}</div>
                    <div class="text-xs text-slate-500 mt-1">${escapeHtml(row.product_name || "Producto")}${row.sku ? ` | ${escapeHtml(row.sku)}` : ""}</div>
                    <div class="text-xs text-slate-500 mt-1">Disponible para editar: ${limit}</div>
                  </div>
                  <div class="text-right shrink-0">
                    <div class="text-sm font-semibold text-slate-900">${currencyFmt.format(row.price ?? 0)}</div>
                    <div class="mt-2 inline-flex px-2 py-1 rounded-full text-[11px] font-medium ${canAdd ? "bg-emerald-50 text-emerald-700 border border-emerald-200" : "bg-slate-100 text-slate-500 border border-slate-200"}">${canAdd ? "Agregar" : "Sin stock"}</div>
                  </div>
                </div>
              </button>
            `;
          }).join("")
        : `<div class="text-sm text-slate-500">No hay variantes para agregar con ese filtro.</div>`;

    return `
      <div id="editOrderModal" class="fixed inset-0 z-50 bg-slate-950/40 backdrop-blur-sm p-4 flex items-end justify-center">
        <div class="w-full max-w-md h-[92vh] overflow-hidden rounded-[28px] bg-white shadow-2xl flex flex-col">
          <div class="px-4 pt-4 pb-3 border-b border-slate-200 flex items-center justify-between gap-3">
            <div>
              <h2 class="text-base font-semibold text-slate-900">Editar pedido</h2>
              <p class="text-xs text-slate-500 mt-1">${escapeHtml(formatOrderRef(order))}</p>
            </div>
            <div class="flex items-center gap-2">
              <button id="btnSaveEditOrderTop" type="button" class="h-10 px-3 rounded-xl bg-slate-900 text-white text-sm font-medium ${isSavingEdit ? "opacity-70" : ""}" ${isSavingEdit ? "disabled" : ""}>${isSavingEdit ? "Guardando..." : "Guardar"}</button>
              <button id="btnCloseEditOrderModal" type="button" class="w-10 h-10 rounded-xl bg-slate-100 text-slate-700">x</button>
            </div>
          </div>
          <div class="flex-1 overflow-y-auto px-4 py-4 space-y-4">
            <section class="space-y-3">
              <div class="flex items-center justify-between gap-3">
                <h3 class="text-sm font-semibold text-slate-900">Items actuales</h3>
                <div class="text-xs text-slate-500">Total parcial: ${currencyFmt.format(getDraftTotal(editDraftItems))}</div>
              </div>
              <div class="space-y-3">${draftItemsHtml}</div>
            </section>
            <section class="space-y-3">
              <div class="flex items-center justify-between gap-3">
                <h3 class="text-sm font-semibold text-slate-900">Agregar items</h3>
                <span class="text-xs text-slate-500">${filteredCatalog.length} variante(s)</span>
              </div>
              <label class="flex items-center gap-2 rounded-2xl border border-slate-200 bg-slate-50 px-3 py-3">
                <svg viewBox="0 0 24 24" class="w-5 h-5 text-slate-400" fill="none" stroke="currentColor" stroke-width="1.8" aria-hidden="true"><circle cx="11" cy="11" r="7"></circle><path d="M20 20l-3.5-3.5"></path></svg>
                <input id="editOrderSearchInput" value="${escapeHtml(editSearch)}" class="w-full bg-transparent outline-none text-sm" placeholder="Buscar producto o variante" />
              </label>
              <div class="space-y-2">${catalogHtml}</div>
            </section>
          </div>
          <div class="px-4 py-4 border-t border-slate-200 bg-slate-50 flex items-center gap-3 pb-[calc(env(safe-area-inset-bottom)+1rem)]">
            <button id="btnCancelEditOrder" type="button" class="flex-1 h-11 rounded-2xl border border-slate-200 bg-white text-slate-700 text-sm font-medium">Cancelar</button>
            <button id="btnSaveEditOrder" type="button" class="flex-1 h-11 rounded-2xl bg-slate-900 text-white text-sm font-medium ${isSavingEdit ? "opacity-70" : ""}" ${isSavingEdit ? "disabled" : ""}>${isSavingEdit ? "Guardando..." : "Guardar cambios"}</button>
          </div>
        </div>
      </div>
    `;
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
          const variantRow = item.product_variants || {};
          const imagePath = String(variantRow.image_path || product.image_path || "").replace(/^\/+/, "");
          const imageUrl = imagePath ? getImageUrl(imagePath) : "";
          const productName = item.product_name_snapshot || product.name || "Producto";
          const variantName = getOrderItemVariantName(item);
          const qty = Number(item.qty ?? 0);
          const lineTotal = Number(item.subtotal ?? 0);
          const lineCode = itemLineCode(orderRef, item, idx);
          return `
            <article class="flex items-start gap-3 py-2 ${idx < items.length - 1 ? "border-b border-slate-100" : ""}">
              <div class="w-14 h-14 rounded-xl overflow-hidden bg-slate-100 shrink-0">
                ${imageUrl ? `<img src="${escapeHtml(imageUrl)}" alt="${escapeHtml(variantName)}" class="w-full h-full object-cover" />` : `<div class="w-full h-full grid place-items-center text-[10px] text-slate-400">No img</div>`}
              </div>
              <div class="min-w-0 flex-1">
                <h4 class="text-sm font-semibold text-slate-900 truncate">${escapeHtml(variantName)}</h4>
                <p class="text-xs text-slate-500 mt-1">Producto: ${escapeHtml(productName)}${item.sku_snapshot ? ` | SKU: ${escapeHtml(item.sku_snapshot)}` : ""}</p>
                <p class="text-xs text-slate-500 mt-1">Qty: ${qty} pcs</p>
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
        <div class="flex items-center justify-between gap-3 px-1">
          <button id="btnBack" type="button" aria-label="Volver" class="w-9 h-9 inline-flex items-center justify-center rounded-lg bg-white shadow-sm text-slate-700">
            <svg viewBox="0 0 24 24" class="w-5 h-5" fill="none" stroke="currentColor" stroke-width="1.8" aria-hidden="true"><path d="M15 6l-6 6 6 6"></path></svg>
          </button>
          <h1 class="text-base font-semibold text-slate-900 flex-1 text-center">Order Details</h1>
          <div class="flex items-center gap-2">
            <button id="btnEditOrder" type="button" class="h-9 px-3 rounded-xl bg-white shadow-sm text-slate-700 text-sm font-medium">Editar</button>
            <button id="btnDeleteOrder" type="button" class="h-9 px-3 rounded-xl bg-rose-50 border border-rose-200 text-rose-700 text-sm font-medium ${isDeletingOrder ? "opacity-70" : ""}" ${isDeletingOrder ? "disabled" : ""}>${isDeletingOrder ? "Borrando..." : "Borrar"}</button>
          </div>
        </div>

        <article class="bg-white rounded-2xl shadow-sm p-4 space-y-3">
          <div class="flex items-start justify-between">
            <h2 class="text-sm font-semibold text-slate-900">Info Cliente</h2>
            <button type="button" class="w-8 h-8 inline-flex items-center justify-center rounded-lg text-slate-500 hover:bg-slate-100">
              <svg viewBox="0 0 24 24" class="w-5 h-5" fill="none" stroke="currentColor" stroke-width="1.8" aria-hidden="true"><circle cx="12" cy="5" r="1.5"></circle><circle cx="12" cy="12" r="1.5"></circle><circle cx="12" cy="19" r="1.5"></circle></svg>
            </button>
          </div>
          <div class="flex items-start gap-3">
            <div class="w-12 h-12 rounded-full bg-slate-200 text-slate-700 grid place-items-center font-semibold text-sm shrink-0">${escapeHtml(initials(customer.name))}</div>
            <div class="min-w-0 flex-1 space-y-1">
              <p class="text-sm font-semibold text-slate-900 truncate">${escapeHtml(customer.name)}</p>
              <p class="text-xs text-slate-500 truncate">${escapeHtml(customer.email)}</p>
              <p class="text-xs text-slate-600 flex items-start gap-1.5"><svg viewBox="0 0 24 24" class="w-4 h-4 mt-[1px] shrink-0" fill="none" stroke="currentColor" stroke-width="1.8" aria-hidden="true"><path d="M12 21s7-4.5 7-11a7 7 0 1 0-14 0c0 6.5 7 11 7 11z"></path><circle cx="12" cy="10" r="2.5"></circle></svg><span class="break-words">${escapeHtml(customer.address)}</span></p>
              <p class="text-xs text-slate-600 flex items-center gap-1.5"><svg viewBox="0 0 24 24" class="w-4 h-4 shrink-0" fill="none" stroke="currentColor" stroke-width="1.8" aria-hidden="true"><path d="M22 16.9v3a2 2 0 0 1-2.2 2 19.8 19.8 0 0 1-8.6-3.1 19.5 19.5 0 0 1-6-6 19.8 19.8 0 0 1-3.1-8.7A2 2 0 0 1 4 2h3a2 2 0 0 1 2 1.7c.1.9.4 1.8.7 2.6a2 2 0 0 1-.5 2.1L8 9.6a16 16 0 0 0 6.4 6.4l1.2-1.2a2 2 0 0 1 2.1-.5c.8.3 1.7.6 2.6.7A2 2 0 0 1 22 16.9z"></path></svg><span>${escapeHtml(customer.phone)}</span></p>
            </div>
          </div>
          <div class="grid grid-cols-2 gap-3 pt-1">
            <div id="orderStatusDropdown"></div>
            <div id="paymentStatusDropdown"></div>
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
      </section>
      ${renderEditModal(order)}
    `;

    document.getElementById("btnBack")?.addEventListener("click", () => {
      if (window.history.length > 1) {
        window.history.back();
        return;
      }
      location.href = "/pages/pedidos.html";
    });
    document.getElementById("btnEditOrder")?.addEventListener("click", openEditModal);
    document.getElementById("btnDeleteOrder")?.addEventListener("click", handleSoftDelete);
    document.getElementById("btnCloseEditOrderModal")?.addEventListener("click", closeEditModal);
    document.getElementById("btnCancelEditOrder")?.addEventListener("click", closeEditModal);
    document.getElementById("btnSaveEditOrderTop")?.addEventListener("click", handleSaveEditedItems);
    document.getElementById("btnSaveEditOrder")?.addEventListener("click", handleSaveEditedItems);
    document.getElementById("editOrderModal")?.addEventListener("click", (event) => {
      if (event.target?.id === "editOrderModal") closeEditModal();
    });
    document.getElementById("editOrderSearchInput")?.addEventListener("input", (event) => {
      editSearch = event.target.value || "";
      renderOrderDetail(order);
    });

    root.querySelectorAll("[data-add-variant-id]").forEach((button) => {
      button.addEventListener("click", () => {
        addCatalogItem(button.getAttribute("data-add-variant-id"));
        renderOrderDetail(order);
      });
    });
    root.querySelectorAll("[data-inc-draft-index]").forEach((button) => {
      button.addEventListener("click", () => {
        const index = Number(button.getAttribute("data-inc-draft-index"));
        const item = editDraftItems[index];
        if (!item) return;
        setDraftItemQty(index, Number(item.qty ?? 0) + 1);
        renderOrderDetail(order);
      });
    });
    root.querySelectorAll("[data-dec-draft-index]").forEach((button) => {
      button.addEventListener("click", () => {
        const index = Number(button.getAttribute("data-dec-draft-index"));
        const item = editDraftItems[index];
        if (!item) return;
        setDraftItemQty(index, Number(item.qty ?? 0) - 1);
        renderOrderDetail(order);
      });
    });
    root.querySelectorAll("[data-remove-draft-index]").forEach((button) => {
      button.addEventListener("click", () => {
        removeDraftItem(Number(button.getAttribute("data-remove-draft-index")));
        renderOrderDetail(order);
      });
    });

    const orderDropdown = createDropdown({
      containerId: "orderStatusDropdown",
      options: ORDER_STATUS.map((status) => ({ value: status, label: statusLabel(status) })),
      selected: normalizeStatus(order.order_status || "Reservado"),
      labelPrefix: "Estado",
      triggerClassName: orderStatusToneClass(order.order_status || "Reservado"),
      getLabelClassName: (value) => orderStatusToneClass(value),
      getOptionClassName: (value, active) => active ? orderStatusToneClass(value) : "",
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
      triggerClassName: paymentStatusToneClass(order.payment_status || "Pendiente"),
      getLabelClassName: (value) => paymentStatusToneClass(value),
      getOptionClassName: (value, active) => active ? paymentStatusToneClass(value) : "",
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
  currentOrder = await getOrderDetail(id);
  if (!currentOrder) {
    root.innerHTML = `<div class="rounded-2xl bg-white shadow-sm p-4 text-sm text-red-600">No se encontro el pedido solicitado.</div>`;
    return;
  }
  renderOrderDetail(currentOrder);
}
