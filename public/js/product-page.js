// public/js/product-page.js
import { getProductById } from "./product-service.js";
import { getImageUrl } from "./image.js";
import { shareProduct, copyToClipboard, downloadImage } from "./share.js";

function formatArs(value) {
  const n = Number(value ?? 0);
  return new Intl.NumberFormat("es-AR", { maximumFractionDigits: 0 }).format(n);
}

function setText(id, text) {
  const el = document.getElementById(id);
  if (el) el.textContent = text ?? "";
}

function setHtml(id, html) {
  const el = document.getElementById(id);
  if (el) el.innerHTML = html ?? "";
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
    setText("msg", "Falta el parámetro id en la URL.");
    return;
  }

  setText("msg", "Cargando producto...");
  const p = await getProductById(id);

  if (!p) {
    setText("msg", "No se encontró el producto (o está inactivo).");
    return;
  }

  const imageUrl = p.image_path ? getImageUrl(p.image_path) : "";
  const shareUrl = `${location.origin}/pages/producto.html?id=${encodeURIComponent(p.id)}`;
  const shareText = `Mirá este producto: ${p.name} - $ ${formatArs(p.price)}`;

  // Render
  setText("name", p.name);
  setText("price", `$ ${formatArs(p.price)}`);
  setText("category", p.categories?.name ? p.categories.name : "");
  setText("desc", p.description || "");
  setSrc("img", imageUrl, p.name);

  setText("msg", "");

  // Botones
  const msgEl = document.getElementById("msg");

  document.getElementById("btnShare")?.addEventListener("click", async () => {
    const res = await shareProduct({
      title: p.name,
      text: shareText,
      url: shareUrl,
      imageUrl
    });
    msgEl.textContent = res.ok ? `Listo (${res.mode}).` : "No se pudo compartir en este dispositivo.";
  });

  document.getElementById("btnCopy")?.addEventListener("click", async () => {
    const ok = await copyToClipboard(shareUrl);
    msgEl.textContent = ok ? "Link copiado." : "No se pudo copiar el link.";
  });

  document.getElementById("btnDownload")?.addEventListener("click", () => {
    if (!imageUrl) {
      msgEl.textContent = "Este producto no tiene imagen.";
      return;
    }
    downloadImage(imageUrl, `producto-${p.id}.jpg`);
    msgEl.textContent = "Descarga iniciada.";
  });
}