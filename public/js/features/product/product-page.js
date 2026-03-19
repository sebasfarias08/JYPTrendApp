// public/js/product-page.js
import { getProductById, getProductVariantById, updateProductById } from "./product-service.js";
import { getImageUrl, getProductDetailImageUrls } from "../../shared/utils/image.js";
import { shareProduct, copyToClipboard, downloadImage } from "../../shared/utils/share.js";
import { addToCart } from "../checkout/cart.js";
import { showToast } from "../../shared/ui/toast.js";
import { canManageInventory } from "../../app/auth/permissions.js";
import { requireSalesContext } from "../../app/core/sales-context-service.js";

function formatArs(value) {
  const n = Number(value ?? 0);
  return new Intl.NumberFormat("es-AR", { maximumFractionDigits: 0 }).format(n);
}

function setText(id, text) {
  const el = document.getElementById(id);
  if (el) el.textContent = text ?? "";
}

function setSrc(id, src, alt = "", fallbackSrc = "") {
  const el = document.getElementById(id);
  if (el) {
    el.src = src || "";
    el.alt = alt || "";
    if (fallbackSrc) {
      el.dataset.fallbackSrc = fallbackSrc;
      el.onerror = () => {
        if (!el.dataset.fallbackSrc || el.src === el.dataset.fallbackSrc) return;
        el.src = el.dataset.fallbackSrc;
      };
    } else {
      delete el.dataset.fallbackSrc;
      el.onerror = null;
    }
  }
}

export async function initProductPage(role = "viewer") {
  const params = new URLSearchParams(location.search);
  const id = params.get("id");
  const variantId = params.get("variant_id");

  if (!id && !variantId) {
    showToast("Falta el parametro id o variant_id en la URL.", { type: "error" });
    return;
  }

  showToast("Cargando producto...", { type: "info", duration: 900 });
  let p = variantId ? await getProductVariantById(variantId) : await getProductById(id);
  let salesContext = null;
  try {
    salesContext = await requireSalesContext();
  } catch (error) {
    console.warn("initProductPage sales context warning:", error);
    showToast(String(error?.message || "No se pudo resolver el contexto de venta."), { type: "warning", duration: 3200 });
  }

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
  const btnAddCartEl = document.getElementById("btnAddCart");
  const isVariantMode = Boolean(variantId);

  function getSingleActiveVariant() {
    const activeVariants = (p.product_variants ?? []).filter((variant) => variant?.active !== false);
    if (activeVariants.length !== 1) return null;
    return activeVariants[0];
  }

  function getSelectedVariant() {
    if (isVariantMode) {
      return {
        id: p.variant_id ?? variantId ?? null,
        product_id: p.product_id ?? p.id ?? null,
        variant_name: p.variant_name ?? p.name ?? "",
        sale_price: Number(p.price ?? 0),
        image_path: p.image_path ?? "",
        active: p.active !== false
      };
    }
    return getSingleActiveVariant();
  }

  function getPreferredVariantImagePath() {
    if (isVariantMode) {
      return String(p.image_path || p.product_image_path || "").trim();
    }
    const activeVariants = (p.product_variants ?? []).filter((variant) => variant?.active !== false);
    const withImage = activeVariants.find((variant) => String(variant?.image_path || "").trim());
    return String(withImage?.image_path || activeVariants[0]?.image_path || "").trim();
  }

  function getDisplayImagePath() {
    return String(getPreferredVariantImagePath() || p.image_path || "").trim();
  }

  function currentShareMeta() {
    const shareUrl = isVariantMode
      ? `${location.origin}/pages/producto.html?id=${encodeURIComponent(p.product_id || p.id || "")}&variant_id=${encodeURIComponent(p.variant_id || variantId || "")}`
      : `${location.origin}/pages/producto.html?id=${encodeURIComponent(p.id)}`;
    const shareText = `Mira este producto: ${p.name} - $ ${formatArs(p.price)}`;
    const imagePath = getDisplayImagePath();
    const imageUrl = imagePath ? getImageUrl(imagePath) : "";
    return { shareUrl, shareText, imageUrl };
  }

  function fillEditForm() {
    if (editNameEl) editNameEl.value = p.name ?? "";
    if (editPriceEl) editPriceEl.value = String(Number(p.price ?? 0));
    if (editDescriptionEl) editDescriptionEl.value = p.description ?? "";
    if (editImagePathEl) editImagePathEl.value = p.image_path ?? "";
  }

  function renderProduct() {
    const imagePath = getDisplayImagePath();
    const imageUrls = imagePath
      ? getProductDetailImageUrls(imagePath)
      : { transformedUrl: "", publicUrl: "" };
    setText("name", p.name);
    setText("price", `$ ${formatArs(p.price)}`);
    setText("category", p.categories?.name ? p.categories.name : "");
    setText("desc", p.description || "");
    setSrc("img", imageUrls.transformedUrl, p.name, imageUrls.publicUrl);
  }

  function openEditModal() {
    if (!editModalEl) return;
    if (!canManageInventory(role)) return;
    fillEditForm();
    editModalEl.classList.remove("hidden");
    editNameEl?.focus();
  }

  function closeEditModal() {
    editModalEl?.classList.add("hidden");
  }

  renderProduct();
  closeEditModal();
  if (btnEditProductEl) {
    btnEditProductEl.classList.toggle("hidden", !canManageInventory(role));
  }
  if (btnAddCartEl) {
    const canAddFromDetail = Boolean(
      getSelectedVariant() &&
      salesContext?.warehouse_id &&
      salesContext?.point_of_sale_id
    );
    btnAddCartEl.disabled = !canAddFromDetail;
    btnAddCartEl.classList.toggle("opacity-60", !canAddFromDetail);
    btnAddCartEl.classList.toggle("cursor-not-allowed", !canAddFromDetail);
  }

  btnAddCartEl?.addEventListener("click", () => {
    const variant = getSelectedVariant();
    if (!variant) {
      showToast("Este producto debe agregarse desde el catalogo de variantes.", { type: "warning" });
      return;
    }

    addToCart(
      {
        product_id: p.product_id || p.id,
        variant_id: variant.id,
        warehouse_id: salesContext.warehouse_id,
        point_of_sale_id: salesContext.point_of_sale_id,
        name: p.name,
        price: Number(variant.sale_price ?? p.price ?? 0),
        image_path: String(variant.image_path || p.image_path || "").trim()
      },
      1
    );
    showToast("Agregado al pedido.", { type: "success" });
  });

  document.getElementById("btnShare")?.addEventListener("click", async () => {
    const { shareText, imageUrl } = currentShareMeta();
    const res = await shareProduct({
      title: p.name,
      text: shareText,
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
