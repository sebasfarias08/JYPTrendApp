import {
  createProduct,
  getProductById,
  getProductCategories,
  updateProductById
} from "./product-service.js";
import { showToast } from "./toast.js";

function safeReturnPath(value) {
  const raw = String(value || "").trim();
  if (!raw.startsWith("/")) return "/pages/productos.html";
  return raw;
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

export function initProductFormPage() {
  const titleEl = document.getElementById("productFormTitle");
  const formEl = document.getElementById("productForm");
  const nameEl = document.getElementById("productName");
  const priceEl = document.getElementById("productPrice");
  const categoryEl = document.getElementById("productCategory");
  const imagePathEl = document.getElementById("productImagePath");
  const descriptionEl = document.getElementById("productDescription");
  const btnSaveEl = document.getElementById("btnSaveProduct");
  const btnCancelEl = document.getElementById("btnCancelProduct");

  const params = new URLSearchParams(location.search);
  const id = params.get("id");
  const returnTo = safeReturnPath(params.get("returnTo"));
  const isEdit = Boolean(id);
  let categories = [];
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
      showToast("El precio debe ser un numero mayor o igual a 0.", { type: "warning" });
      priceEl.focus();
      return;
    }

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

    showToast(isEdit ? "Producto actualizado." : "Producto creado.", { type: "success", duration: 1200 });
    goBack();
  });

  btnCancelEl.addEventListener("click", goBack);

  (async () => {
    categories = await getProductCategories();
    renderCategoryOptions("");
    await loadForEdit();
  })();
}
