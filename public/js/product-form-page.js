import {
  createProduct,
  getProductById,
  getProductCategories,
  upsertVariants,
  updateProductById
} from "./product-service.js";
import { showToast } from "./toast.js";

function safeReturnPath(value) {
  const raw = String(value || "").trim();
  if (!raw) return "/pages/productos.html";
  try {
    const url = new URL(raw, location.origin);
    if (url.origin !== location.origin) return "/pages/productos.html";
    return `${url.pathname}${url.search}${url.hash}`;
  } catch {
    return "/pages/productos.html";
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

function normalizeVariantDraft(v) {
  return {
    id: v?.id || null,
    variant_name: String(v?.variant_name ?? "").trim(),
    sku: String(v?.sku ?? "").trim(),
    barcode: String(v?.barcode ?? "").trim(),
    sale_price: v?.sale_price === "" || v?.sale_price == null ? "" : Number(v.sale_price),
    active: v?.active !== false
  };
}

function hasVariantData(v) {
  return Boolean(v.variant_name || v.sku || v.barcode || v.sale_price !== "");
}

export function initProductFormPage() {
  const titleEl = document.getElementById("productFormTitle");
  const formEl = document.getElementById("productForm");
  const nameEl = document.getElementById("productName");
  const priceEl = document.getElementById("productPrice");
  const categoryEl = document.getElementById("productCategory");
  const imagePathEl = document.getElementById("productImagePath");
  const descriptionEl = document.getElementById("productDescription");
  const variantsListEl = document.getElementById("variantsList");
  const btnAddVariantEl = document.getElementById("btnAddVariant");
  const btnSaveEl = document.getElementById("btnSaveProduct");
  const btnCancelEl = document.getElementById("btnCancelProduct");

  const params = new URLSearchParams(location.search);
  const id = params.get("id");
  const returnTo = safeReturnPath(params.get("returnTo"));
  const isEdit = Boolean(id);
  let categories = [];
  let variants = [];
  let saving = false;

  function goBack() {
    location.href = returnTo;
  }

  function renderCategoryOptions(selected = "") {
    categoryEl.innerHTML = [
      `<option value="">Sin categoria</option>`,
      ...categories.map((c) => `<option value="${c.id}">${escapeHtml(c.name)}</option>`)
    ].join("");
    categoryEl.value = selected || "";
  }

  function renderVariants() {
    variantsListEl.innerHTML = "";

    if (!variants.length) {
      variantsListEl.innerHTML = `<div class="text-xs text-muted">Sin variantes cargadas.</div>`;
      return;
    }

    variants.forEach((v, index) => {
      const item = document.createElement("div");
      item.className = "card p-3 space-y-2";
      item.innerHTML = `
        <div class="flex items-center justify-between">
          <div class="text-xs font-semibold">Variante ${index + 1}</div>
          <button type="button" class="btn btn-secondary text-xs" data-remove-variant="${index}">Quitar</button>
        </div>
        <div class="grid grid-cols-1 sm:grid-cols-2 gap-2">
          <div>
            <label class="text-xs text-muted block mb-1">Nombre variante *</label>
            <input class="input" data-variant-field="variant_name" data-variant-index="${index}" value="${escapeHtml(v.variant_name || "")}" />
          </div>
          <div>
            <label class="text-xs text-muted block mb-1">SKU</label>
            <input class="input" data-variant-field="sku" data-variant-index="${index}" value="${escapeHtml(v.sku || "")}" />
          </div>
          <div>
            <label class="text-xs text-muted block mb-1">Barcode</label>
            <input class="input" data-variant-field="barcode" data-variant-index="${index}" value="${escapeHtml(v.barcode || "")}" />
          </div>
          <div>
            <label class="text-xs text-muted block mb-1">Precio venta variante</label>
            <input type="number" min="0" step="1" class="input" data-variant-field="sale_price" data-variant-index="${index}" value="${v.sale_price ?? ""}" />
          </div>
        </div>
        <label class="inline-flex items-center gap-2 text-xs text-muted">
          <input type="checkbox" data-variant-field="active" data-variant-index="${index}" ${v.active === false ? "" : "checked"} />
          Variante activa
        </label>
      `;
      variantsListEl.appendChild(item);
    });

    variantsListEl.querySelectorAll("[data-remove-variant]").forEach((btn) => {
      btn.addEventListener("click", () => {
        const idx = Number(btn.getAttribute("data-remove-variant"));
        if (!Number.isInteger(idx)) return;
        variants.splice(idx, 1);
        renderVariants();
      });
    });

    variantsListEl.querySelectorAll("[data-variant-field]").forEach((input) => {
      const sync = () => {
        const idx = Number(input.getAttribute("data-variant-index"));
        const field = input.getAttribute("data-variant-field");
        if (!Number.isInteger(idx) || !field || !variants[idx]) return;

        if (field === "active") {
          variants[idx][field] = Boolean(input.checked);
          return;
        }

        variants[idx][field] = input.value;
      };

      input.addEventListener("input", sync);
      if (input.type === "checkbox") {
        input.addEventListener("change", sync);
      }
    });
  }

  async function loadForEdit() {
    if (!isEdit) return;
    titleEl.textContent = "Editar producto";

    const row = await getProductById(id, { includeInactive: true });
    if (!row) {
      showToast("No se encontro el producto.", { type: "error", duration: 2500 });
      goBack();
      return;
    }

    nameEl.value = row.name || "";
    priceEl.value = String(Number(row.price || 0));
    categoryEl.value = row.category_id || "";
    imagePathEl.value = row.image_path || "";
    descriptionEl.value = row.description || "";
    variants = (Array.isArray(row.product_variants) ? row.product_variants : []).map((v) => normalizeVariantDraft(v));
    renderVariants();
  }

  function validateVariants() {
    const normalized = variants.map(normalizeVariantDraft);
    const withData = normalized.filter(hasVariantData);

    for (const v of withData) {
      if (!v.variant_name) {
        showToast("Cada variante debe tener nombre.", { type: "warning" });
        return null;
      }
      if (v.sale_price !== "" && (!Number.isFinite(Number(v.sale_price)) || Number(v.sale_price) < 0)) {
        showToast("El precio de variante debe ser un numero mayor o igual a 0.", { type: "warning" });
        return null;
      }
    }

    const skus = withData
      .map((v) => String(v.sku || "").trim().toLowerCase())
      .filter(Boolean);
    const skuSet = new Set();
    for (const sku of skus) {
      if (skuSet.has(sku)) {
        showToast("No puede haber SKUs duplicados en el mismo producto.", { type: "warning" });
        return null;
      }
      skuSet.add(sku);
    }

    return withData;
  }

  formEl.addEventListener("submit", async (event) => {
    event.preventDefault();
    if (saving) return;

    const payload = {
      name: nameEl.value.trim(),
      price: Number(priceEl.value),
      category_id: categoryEl.value || null,
      image_path: imagePathEl.value.trim() || null,
      description: descriptionEl.value.trim() || null
    };

    if (!payload.name) {
      showToast("El nombre del producto es obligatorio.", { type: "warning" });
      nameEl.focus();
      return;
    }

    if (!Number.isFinite(payload.price) || payload.price < 0) {
      showToast("El precio base debe ser un numero mayor o igual a 0.", { type: "warning" });
      priceEl.focus();
      return;
    }

    const validatedVariants = validateVariants();
    if (!validatedVariants) return;

    saving = true;
    btnSaveEl.disabled = true;
    btnSaveEl.classList.add("opacity-70", "cursor-not-allowed");

    const res = isEdit
      ? await updateProductById(id, payload)
      : await createProduct(payload);

    saving = false;
    btnSaveEl.disabled = false;
    btnSaveEl.classList.remove("opacity-70", "cursor-not-allowed");

    if (!res?.ok) {
      showToast(summarizeError(res?.error), { type: "error", duration: 3000 });
      return;
    }

    const productId = isEdit ? id : res?.data?.id;
    if (productId) {
      const variantsResult = await upsertVariants(productId, validatedVariants);
      if (!variantsResult?.ok) {
        showToast(summarizeError(variantsResult?.error), { type: "error", duration: 3000 });
        return;
      }
    }

    showToast(isEdit ? "Producto actualizado." : "Producto creado.", { type: "success", duration: 1200 });
    goBack();
  });

  btnAddVariantEl.addEventListener("click", () => {
    variants.push({
      id: null,
      variant_name: "",
      sku: "",
      barcode: "",
      sale_price: "",
      active: true
    });
    renderVariants();
  });

  btnCancelEl.addEventListener("click", goBack);

  (async () => {
    categories = await getProductCategories();
    renderCategoryOptions("");
    renderVariants();
    await loadForEdit();
  })();
}
