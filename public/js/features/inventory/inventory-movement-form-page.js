import { getProductsForAdmin } from "../product/product-service.js";
import { getLogisticsInventories, LOGISTICS_ENTITY_TYPES } from "./logistics-inventory-service.js";
import {
  createInventoryMovement,
  deleteInventoryMovementById,
  getInventoryMovementById,
  updateInventoryMovementById
} from "./inventory-movement-service.js";
import { showToast } from "../../shared/ui/toast.js";

const MOVEMENT_TYPE_OPTIONS = [
  "ADJUSTMENT",
  "PURCHASE",
  "SALE",
  "RETURN",
  "TRANSFER_IN",
  "TRANSFER_OUT"
];

const REFERENCE_TYPE_OPTIONS = [
  "MANUAL",
  "ORDER_ITEM_STOCK",
  "ORDER_SOFT_DELETE_STOCK",
  "PURCHASE_ORDER"
];

function safeReturnPath(value) {
  const raw = String(value || "").trim();
  if (!raw) return "/pages/movimientos-inventario.html";
  try {
    const url = new URL(raw, location.origin);
    if (url.origin !== location.origin) return "/pages/movimientos-inventario.html";
    return `${url.pathname}${url.search}${url.hash}`;
  } catch {
    return "/pages/movimientos-inventario.html";
  }
}

function escapeHtml(str) {
  return String(str ?? "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

function summarizeError(err) {
  const msg = String(err?.message || err?.details || err || "").trim();
  if (!msg) return "No se pudo completar la operacion.";
  return msg;
}

function isUuid(value) {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(String(value || "").trim());
}

function ensureSelectValue(selectEl, value) {
  const normalized = String(value || "").trim();
  if (!normalized) return;
  const exists = Array.from(selectEl.options).some((option) => option.value === normalized);
  if (exists) return;

  const option = document.createElement("option");
  option.value = normalized;
  option.textContent = normalized;
  selectEl.appendChild(option);
}

export function initInventoryMovementFormPage() {
  const actionsEl = document.getElementById("inventoryMovementFormActions");
  const titleEl = document.getElementById("inventoryMovementFormTitle");
  const formEl = document.getElementById("inventoryMovementForm");
  const systemAlertEl = document.getElementById("inventoryMovementSystemAlert");
  const productEl = document.getElementById("inventoryMovementProduct");
  const variantEl = document.getElementById("inventoryMovementVariant");
  const movementTypeEl = document.getElementById("inventoryMovementType");
  const qtyEl = document.getElementById("inventoryMovementQty");
  const unitCostEl = document.getElementById("inventoryMovementUnitCost");
  const warehouseEl = document.getElementById("inventoryMovementWarehouse");
  const pointOfSaleEl = document.getElementById("inventoryMovementPointOfSale");
  const referenceTypeEl = document.getElementById("inventoryMovementReferenceType");
  const referenceIdEl = document.getElementById("inventoryMovementReferenceId");
  const notesEl = document.getElementById("inventoryMovementNotes");
  const btnSaveEl = document.getElementById("btnSaveInventoryMovement");
  const btnCancelEl = document.getElementById("btnCancelInventoryMovement");
  const btnEditTopEl = document.getElementById("btnEditTop");
  const btnDeleteTopEl = document.getElementById("btnDeleteTop");

  const params = new URLSearchParams(location.search);
  const id = params.get("id");
  const mode = params.get("mode");
  const returnTo = safeReturnPath(params.get("returnTo"));
  const isExisting = Boolean(id);
  const isViewMode = isExisting && mode === "view";
  const isEditMode = isExisting && !isViewMode;
  let products = [];
  let warehouses = [];
  let pointsOfSale = [];
  let row = null;
  let saving = false;

  function goBack() {
    location.href = returnTo;
  }

  function buildCurrentPageUrl(nextMode) {
    const query = new URLSearchParams();
    if (id) query.set("id", id);
    if (nextMode) query.set("mode", nextMode);
    if (returnTo) query.set("returnTo", returnTo);
    const qs = query.toString();
    return `/pages/movimientos-inventario-form.html${qs ? `?${qs}` : ""}`;
  }

  function setReadOnlyState(disabled) {
    [
      productEl,
      variantEl,
      movementTypeEl,
      qtyEl,
      unitCostEl,
      warehouseEl,
      pointOfSaleEl,
      referenceTypeEl,
      referenceIdEl,
      notesEl
    ].forEach((el) => {
      el.disabled = disabled;
      el.readOnly = disabled;
    });
  }

  function renderProductOptions(selectedProductId = "") {
    productEl.innerHTML = [
      `<option value="">Seleccionar producto</option>`,
      ...products.map((product) => `<option value="${product.id}">${escapeHtml(product.name || "Producto")}</option>`)
    ].join("");
    productEl.value = selectedProductId || "";
  }

  function renderVariantOptions(selectedVariantId = "", selectedProductId = "") {
    const product = products.find((item) => item.id === selectedProductId);
    const variants = Array.isArray(product?.product_variants) ? product.product_variants : [];

    variantEl.innerHTML = [
      `<option value="">Sin variante</option>`,
      ...variants.map((variant) => {
        const label = variant.variant_name || variant.sku || "Variante";
        return `<option value="${variant.id}">${escapeHtml(label)}</option>`;
      })
    ].join("");
    variantEl.value = selectedVariantId || "";
  }

  function renderLocationOptions() {
    warehouseEl.innerHTML = [
      `<option value="">Sin deposito</option>`,
      ...warehouses.map((item) => `<option value="${item.id}">${escapeHtml(item.name)}</option>`)
    ].join("");
    pointOfSaleEl.innerHTML = [
      `<option value="">Sin punto de venta</option>`,
      ...pointsOfSale.map((item) => `<option value="${item.id}">${escapeHtml(item.name)}</option>`)
    ].join("");
  }

  function updateActionButtons() {
    if (!actionsEl || !btnEditTopEl || !btnDeleteTopEl) return;

    const locked = row?.is_system_generated === true;
    const showTopActions = isExisting;
    actionsEl.classList.toggle("hidden", !showTopActions);
    actionsEl.classList.toggle("flex", showTopActions);
    btnEditTopEl.classList.toggle("hidden", !isViewMode || locked);
    btnDeleteTopEl.classList.toggle("hidden", locked);
    systemAlertEl.classList.toggle("hidden", !locked);
  }

  function applyPageMode() {
    titleEl.textContent = !isExisting
      ? "Nuevo movimiento"
      : isViewMode
        ? "Detalle movimiento"
        : "Editar movimiento";

    setReadOnlyState(isViewMode || row?.is_system_generated === true);
    btnSaveEl.classList.toggle("hidden", isViewMode || row?.is_system_generated === true);
    btnCancelEl.textContent = isViewMode ? "Volver" : "Cancelar";
    updateActionButtons();
  }

  async function loadForEdit() {
    if (!isExisting) return;

    const current = await getInventoryMovementById(id);
    if (!current) {
      showToast("No se encontro el movimiento.", { type: "error", duration: 2500 });
      goBack();
      return;
    }

    row = current;
    renderProductOptions(current.product_id || "");
    renderVariantOptions(current.variant_id || "", current.product_id || "");
    ensureSelectValue(movementTypeEl, current.movement_type || "");
    ensureSelectValue(referenceTypeEl, current.reference_type || "");
    movementTypeEl.value = current.movement_type || "";
    qtyEl.value = String(current.qty ?? "");
    unitCostEl.value = current.unit_cost == null ? "" : String(current.unit_cost);
    warehouseEl.value = current.warehouse_id || "";
    pointOfSaleEl.value = current.point_of_sale_id || "";
    referenceTypeEl.value = current.reference_type || "MANUAL";
    referenceIdEl.value = current.reference_id || "";
    notesEl.value = current.notes || "";
    applyPageMode();
  }

  formEl.addEventListener("submit", async (event) => {
    event.preventDefault();
    if (saving || isViewMode || row?.is_system_generated) return;

    const productId = String(productEl.value || "").trim();
    const variantId = String(variantEl.value || "").trim() || null;
    const movementType = String(movementTypeEl.value || "").trim().toUpperCase();
    const qty = Number(qtyEl.value);
    const unitCost = unitCostEl.value === "" ? null : Number(unitCostEl.value);
    const referenceType = String(referenceTypeEl.value || "").trim().toUpperCase() || "MANUAL";
    const referenceId = String(referenceIdEl.value || "").trim() || null;

    if (!productId) {
      showToast("Selecciona un producto.", { type: "warning" });
      productEl.focus();
      return;
    }

    if (!movementType) {
      showToast("El tipo de movimiento es obligatorio.", { type: "warning" });
      movementTypeEl.focus();
      return;
    }

    if (!Number.isFinite(qty) || qty === 0) {
      showToast("La cantidad debe ser un numero distinto de 0.", { type: "warning" });
      qtyEl.focus();
      return;
    }

    if (unitCost != null && (!Number.isFinite(unitCost) || unitCost < 0)) {
      showToast("El costo unitario debe ser mayor o igual a 0.", { type: "warning" });
      unitCostEl.focus();
      return;
    }

    if (referenceId && !isUuid(referenceId)) {
      showToast("El reference_id debe ser un UUID valido.", { type: "warning" });
      referenceIdEl.focus();
      return;
    }

    const payload = {
      product_id: productId,
      variant_id: variantId,
      movement_type: movementType,
      qty,
      unit_cost: unitCost,
      warehouse_id: warehouseEl.value || null,
      point_of_sale_id: pointOfSaleEl.value || null,
      reference_type: referenceType,
      reference_id: referenceId,
      notes: notesEl.value.trim() || null
    };

    saving = true;
    btnSaveEl.disabled = true;
    btnSaveEl.classList.add("opacity-70", "cursor-not-allowed");

    const result = isEditMode
      ? await updateInventoryMovementById(id, payload)
      : await createInventoryMovement(payload);

    saving = false;
    btnSaveEl.disabled = false;
    btnSaveEl.classList.remove("opacity-70", "cursor-not-allowed");

    if (!result?.ok) {
      showToast(summarizeError(result?.error), { type: "error", duration: 3000 });
      return;
    }

    showToast(isEditMode ? "Movimiento actualizado." : "Movimiento creado.", { type: "success", duration: 1200 });
    goBack();
  });

  productEl.addEventListener("change", () => {
    renderVariantOptions("", productEl.value || "");
  });

  btnCancelEl.addEventListener("click", goBack);
  btnEditTopEl?.addEventListener("click", () => {
    if (!isExisting || row?.is_system_generated) return;
    location.href = buildCurrentPageUrl("edit");
  });
  btnDeleteTopEl?.addEventListener("click", async () => {
    if (!isExisting || saving || !row || row.is_system_generated) return;

    const ok = confirm(`Borrar el movimiento "${row.movement_type}" de "${row.products?.name || "Producto"}"?`);
    if (!ok) return;

    saving = true;
    btnDeleteTopEl.disabled = true;
    btnDeleteTopEl.classList.add("opacity-70", "cursor-not-allowed");

    const result = await deleteInventoryMovementById(id);

    saving = false;
    btnDeleteTopEl.disabled = false;
    btnDeleteTopEl.classList.remove("opacity-70", "cursor-not-allowed");

    if (!result?.ok) {
      showToast(summarizeError(result?.error), { type: "error", duration: 3000 });
      return;
    }

    showToast("Movimiento borrado.", { type: "success", duration: 1200 });
    goBack();
  });

  movementTypeEl.innerHTML = [
    `<option value="">Seleccionar tipo</option>`,
    ...MOVEMENT_TYPE_OPTIONS.map((value) => `<option value="${value}">${value}</option>`)
  ].join("");
  referenceTypeEl.innerHTML = REFERENCE_TYPE_OPTIONS.map((value) => `<option value="${value}">${value}</option>`).join("");

  (async () => {
    const [productsRows, warehouseRows, pointOfSaleRows] = await Promise.all([
      getProductsForAdmin({ includeInactive: true }),
      getLogisticsInventories({ includeInactive: true, type: LOGISTICS_ENTITY_TYPES.WAREHOUSE }),
      getLogisticsInventories({ includeInactive: true, type: LOGISTICS_ENTITY_TYPES.POINT_OF_SALE })
    ]);

    products = productsRows ?? [];
    warehouses = warehouseRows ?? [];
    pointsOfSale = pointOfSaleRows ?? [];

    renderProductOptions("");
    renderVariantOptions("", "");
    renderLocationOptions();
    referenceTypeEl.value = "MANUAL";
    applyPageMode();
    await loadForEdit();
  })();
}
