// public/js/product-page.js
import { getProductById, updateProductById } from "./product-service.js";
import { getImageUrl } from "./image.js";
import { shareProduct, copyToClipboard, downloadImage } from "./share.js";
import { addToCart } from "./cart.js";
import { showToast } from "./toast.js";

function formatArs(value) {
  const n = Number(value ?? 0);
  return new Intl.NumberFormat("es-AR", { maximumFractionDigits: 0 }).format(n);
}

function setText(id, text) {
  const el = document.getElementById(id);
  if (el) el.textContent = text ?? "";
}

function setSrc(id, src, alt = "") {
  const el = document.getElementById(id);
  if (el) {
    el.src = src || "";
    el.alt = alt || "";
  }
}

export async function initProductPage() {
  const params = new URLSearchParams(location.search);
  const id = params.get("id");

  if (!id) {
    showToast("Falta el parametro id en la URL.", { type: "error" });
    return;
  }

  showToast("Cargando producto...", { type: "info", duration: 900 });
  let p = await getProductById(id);

  if (!p) {
    showToast("No se encontro el producto (o esta inactivo).", { type: "error" });
    return;
  }

  const editModalEl = document.getElementById("productEditModal");
  const editModalDialogEl = document.getElementById("productEditModalDialog");
  const btnEditProductEl = document.getElementById("btnEditProduct");
  const btnCloseEditModalEl = document.getElementById("btnCloseEditModal");
  const btnSaveProductEl = document.getElementById("btnSaveProduct");
  const btnCancelEditEl = document.getElementById("btnCancelEdit");
  const editNameEl = document.getElementById("editName");
  const editPriceEl = document.getElementById("editPrice");
  const editDescriptionEl = document.getElementById("editDescription");
  const editImagePathEl = document.getElementById("editImagePath");

  function currentShareMeta() {
    const shareUrl = `${location.origin}/pages/producto.html?id=${encodeURIComponent(p.id)}`;
    const shareText = `Mira este producto: ${p.name} - $ ${formatArs(p.price)}`;
    const imageUrl = p.image_path ? getImageUrl(p.image_path) : "";
    return { shareUrl, shareText, imageUrl };
  }

  function fillEditForm() {
    if (editNameEl) editNameEl.value = p.name ?? "";
    if (editPriceEl) editPriceEl.value = String(Number(p.price ?? 0));
    if (editDescriptionEl) editDescriptionEl.value = p.description ?? "";
    if (editImagePathEl) editImagePathEl.value = p.image_path ?? "";
  }

  function renderProduct() {
    const imageUrl = p.image_path ? getImageUrl(p.image_path) : "";
    setText("name", p.name);
    setText("price", `$ ${formatArs(p.price)}`);
    setText("category", p.categories?.name ? p.categories.name : "");
    setText("desc", p.description || "");
    setSrc("img", imageUrl, p.name);
  }

  function openEditModal() {
    if (!editModalEl) return;
    fillEditForm();
    editModalEl.classList.remove("hidden");
    editNameEl?.focus();
  }

  function closeEditModal() {
    editModalEl?.classList.add("hidden");
  }

  renderProduct();
  closeEditModal();

  document.getElementById("btnAddCart")?.addEventListener("click", () => {
    addToCart(
      {
        id: p.id,
        name: p.name,
        price: p.price,
        image_path: p.image_path
      },
      1
    );
    showToast("Agregado al pedido.", { type: "success" });
  });

  document.getElementById("btnShare")?.addEventListener("click", async () => {
    const { shareUrl, shareText, imageUrl } = currentShareMeta();
    const res = await shareProduct({
      title: p.name,
      text: shareText,
      url: shareUrl,
      imageUrl
    });
    showToast(res.ok ? `Listo (${res.mode}).` : "No se pudo compartir en este dispositivo.", {
      type: res.ok ? "success" : "error"
    });
  });

  document.getElementById("btnCopy")?.addEventListener("click", async () => {
    const { shareUrl } = currentShareMeta();
    const ok = await copyToClipboard(shareUrl);
    showToast(ok ? "Link copiado." : "No se pudo copiar el link.", {
      type: ok ? "success" : "error"
    });
  });

  document.getElementById("btnDownload")?.addEventListener("click", () => {
    const { imageUrl } = currentShareMeta();
    if (!imageUrl) {
      showToast("Este producto no tiene imagen.", { type: "warning" });
      return;
    }
    downloadImage(imageUrl, `producto-${p.id}.jpg`);
    showToast("Descarga iniciada.", { type: "info" });
  });

  btnEditProductEl?.addEventListener("click", openEditModal);

  btnCancelEditEl?.addEventListener("click", () => {
    closeEditModal();
  });

  btnCloseEditModalEl?.addEventListener("click", closeEditModal);

  editModalEl?.addEventListener("click", (event) => {
    if (event.target === editModalEl) closeEditModal();
  });

  editModalDialogEl?.addEventListener("click", (event) => {
    event.stopPropagation();
  });

  window.addEventListener("keydown", (event) => {
    if (event.key === "Escape") closeEditModal();
  });

  btnSaveProductEl?.addEventListener("click", async () => {
    const name = editNameEl?.value?.trim() || "";
    const price = Number(editPriceEl?.value ?? NaN);
    const description = editDescriptionEl?.value?.trim() || null;
    const image_path = editImagePathEl?.value?.trim() || null;

    if (!name) {
      showToast("El nombre es obligatorio.", { type: "warning" });
      editNameEl?.focus();
      return;
    }

    if (!Number.isFinite(price) || price < 0) {
      showToast("El precio debe ser un numero mayor o igual a 0.", { type: "warning" });
      editPriceEl?.focus();
      return;
    }

    btnSaveProductEl.disabled = true;
    btnSaveProductEl.classList.add("opacity-70", "cursor-not-allowed");
    showToast("Guardando cambios...", { type: "info", duration: 1000 });

    const result = await updateProductById(p.id, {
      name,
      price,
      description,
      image_path
    });

    btnSaveProductEl.disabled = false;
    btnSaveProductEl.classList.remove("opacity-70", "cursor-not-allowed");

    if (!result.ok) {
      showToast("No se pudieron guardar los cambios.", { type: "error", duration: 2600 });
      return;
    }

    p = result.data || { ...p, name, price, description, image_path };
    renderProduct();
    closeEditModal();
    showToast("Producto actualizado.", { type: "success" });
  });
}
