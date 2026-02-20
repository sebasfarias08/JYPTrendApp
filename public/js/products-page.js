import {
  createProduct,
  getProductCategories,
  getProductsForAdmin,
  setProductActive,
  updateProductById
} from "./product-service.js";
import { showToast } from "./toast.js";

const EMPTY_FORM = {
  name: "",
  price: "",
  description: "",
  image_path: "",
  category_id: ""
};

function escapeHtml(str) {
  return String(str ?? "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

function formatArs(value) {
  const n = Number(value ?? 0);
  return new Intl.NumberFormat("es-AR", { maximumFractionDigits: 0 }).format(n);
}

function summarizeError(err) {
  const msg = String(err?.message || err?.details || err || "").trim();
  if (!msg) return "No se pudo completar la operacion.";
  return msg;
}

export function initProductsPage() {
  const listEl = document.getElementById("productsList");
  const emptyEl = document.getElementById("productsEmpty");
  const countEl = document.getElementById("productsCount");
  const searchEl = document.getElementById("q");
  const showInactiveEl = document.getElementById("showInactive");
  const btnNewEl = document.getElementById("btnNewProduct");

  const panelEl = document.getElementById("productFormPanel");
  const formTitleEl = document.getElementById("productFormTitle");
  const formEl = document.getElementById("productForm");
  const nameEl = document.getElementById("productName");
  const priceEl = document.getElementById("productPrice");
  const descriptionEl = document.getElementById("productDescription");
  const imagePathEl = document.getElementById("productImagePath");
  const categoryEl = document.getElementById("productCategory");
  const btnSaveEl = document.getElementById("btnSaveProduct");
  const btnCancelEl = document.getElementById("btnCancelProduct");

  let rows = [];
  let categories = [];
  let editingId = null;
  let saving = false;

  function setFormValues(data = EMPTY_FORM) {
    nameEl.value = data.name || "";
    priceEl.value = data.price != null ? String(data.price) : "";
    descriptionEl.value = data.description || "";
    imagePathEl.value = data.image_path || "";
    categoryEl.value = data.category_id || "";
  }

  function readFormValues() {
    return {
      name: nameEl.value.trim(),
      price: Number(priceEl.value),
      description: descriptionEl.value.trim() || null,
      image_path: imagePathEl.value.trim() || null,
      category_id: categoryEl.value || null
    };
  }

  function renderCategoryOptions(selected = "") {
    categoryEl.innerHTML = [
      `<option value="">Sin categoria</option>`,
      ...categories.map((c) => `<option value="${c.id}">${escapeHtml(c.name)}</option>`)
    ].join("");
    categoryEl.value = selected || "";
  }

  function openForm(product = null) {
    editingId = product?.id ?? null;
    formTitleEl.textContent = editingId ? "Editar producto" : "Nuevo producto";
    setFormValues(product ?? EMPTY_FORM);
    renderCategoryOptions(product?.category_id || "");
    panelEl.classList.remove("hidden");
    nameEl.focus();
  }

  function closeForm() {
    editingId = null;
    setFormValues(EMPTY_FORM);
    renderCategoryOptions("");
    panelEl.classList.add("hidden");
  }

  function renderList() {
    const q = (searchEl.value || "").trim().toLowerCase();
    const includeInactive = showInactiveEl.checked;

    const filtered = rows.filter((p) => {
      if (!includeInactive && !p.active) return false;
      if (!q) return true;
      return (
        p.name.toLowerCase().includes(q) ||
        String(p.categories?.name || "").toLowerCase().includes(q)
      );
    });

    countEl.textContent = `${filtered.length} producto(s)`;

    if (!filtered.length) {
      listEl.innerHTML = "";
      emptyEl.classList.remove("hidden");
      return;
    }

    emptyEl.classList.add("hidden");
    listEl.innerHTML = filtered.map((p) => `
      <article class="card p-3">
        <div class="flex items-start justify-between gap-3">
          <div class="min-w-0">
            <div class="font-semibold break-words">${escapeHtml(p.name)}</div>
            <div class="text-sm text-muted">$ ${formatArs(p.price)}</div>
            <div class="text-sm text-muted">${escapeHtml(p.categories?.name || "Sin categoria")}</div>
            ${p.image_path ? `<div class="text-xs text-subtle mt-1 break-all">${escapeHtml(p.image_path)}</div>` : ""}
            <div class="mt-2">
              <span class="${p.active ? "badge badge-success" : "badge badge-neutral"}">${p.active ? "Activo" : "Inactivo"}</span>
            </div>
          </div>
          <div class="flex flex-col gap-2 shrink-0">
            <a href="/pages/producto.html?id=${encodeURIComponent(p.id)}" class="btn btn-secondary text-sm">Ver</a>
            <button class="btn btn-secondary text-sm" data-edit-id="${p.id}">Editar</button>
            <button class="btn ${p.active ? "btn-secondary" : "btn-primary"} text-sm" data-toggle-id="${p.id}">
              ${p.active ? "Dar de baja" : "Reactivar"}
            </button>
          </div>
        </div>
      </article>
    `).join("");

    listEl.querySelectorAll("[data-edit-id]").forEach((btn) => {
      btn.addEventListener("click", () => {
        const id = btn.getAttribute("data-edit-id");
        const row = rows.find((x) => x.id === id);
        if (!row) return;
        openForm(row);
      });
    });

    listEl.querySelectorAll("[data-toggle-id]").forEach((btn) => {
      btn.addEventListener("click", async () => {
        const id = btn.getAttribute("data-toggle-id");
        const row = rows.find((x) => x.id === id);
        if (!row) return;

        if (row.active) {
          const ok = confirm(`Dar de baja a "${row.name}"?`);
          if (!ok) return;
        }

        const res = await setProductActive(id, !row.active);
        if (!res.ok) {
          showToast(summarizeError(res.error), { type: "error", duration: 2800 });
          return;
        }

        showToast(row.active ? "Producto dado de baja." : "Producto reactivado.", { type: "success" });
        await loadRows();
      });
    });
  }

  async function loadRows() {
    rows = await getProductsForAdmin({ includeInactive: true });
    renderList();
  }

  async function submitForm(event) {
    event.preventDefault();
    if (saving) return;

    const body = readFormValues();
    if (!body.name) {
      showToast("El nombre del producto es obligatorio.", { type: "warning" });
      nameEl.focus();
      return;
    }

    if (!Number.isFinite(body.price) || body.price < 0) {
      showToast("El precio debe ser un numero mayor o igual a 0.", { type: "warning" });
      priceEl.focus();
      return;
    }

    saving = true;
    btnSaveEl.disabled = true;
    btnSaveEl.classList.add("opacity-70", "cursor-not-allowed");

    let res = null;
    if (editingId) {
      res = await updateProductById(editingId, body);
    } else {
      res = await createProduct(body);
    }

    saving = false;
    btnSaveEl.disabled = false;
    btnSaveEl.classList.remove("opacity-70", "cursor-not-allowed");

    if (!res?.ok) {
      showToast(summarizeError(res?.error), { type: "error", duration: 3000 });
      return;
    }

    showToast(editingId ? "Producto actualizado." : "Producto creado.", { type: "success" });
    closeForm();
    await loadRows();
  }

  btnNewEl.addEventListener("click", () => openForm());
  btnCancelEl.addEventListener("click", () => closeForm());
  formEl.addEventListener("submit", submitForm);
  searchEl.addEventListener("input", renderList);
  showInactiveEl.addEventListener("change", renderList);

  (async () => {
    categories = await getProductCategories();
    renderCategoryOptions("");
    await loadRows();
  })();
}
