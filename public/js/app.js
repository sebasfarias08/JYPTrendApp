/* public/js/app.js */
import { getProducts } from "./catalog-service.js";
import { getImageUrl } from "./image.js";

export async function renderCatalog() {
  try {
    const grid = document.getElementById("grid");
    const products = await getProducts();

    grid.innerHTML = products.map(p => `
      <a href="/pages/producto.html?id=${p.id}"
        class="block rounded-xl border border-slate-800 bg-slate-900 p-3">

        <img
            src="${getImageUrl(p.image_path)}"
            class="w-full h-32 object-contain mb-2"
        />
        <div class="font-semibold">${p.name}</div>
        <div class="text-slate-300">$ ${formatArs(p.price)}</div>
      </a>
    `).join("");
  } catch (e) {
    console.error(e);
    const grid = document.getElementById("grid");
    if (grid) grid.innerHTML = `<p class="text-slate-300">Error cargando catálogo.</p>`;
  }
}

function formatArs(value) {
  const n = Number(value ?? 0);
  return new Intl.NumberFormat("es-AR", {
    minimumFractionDigits: 0,
    maximumFractionDigits: 0
  }).format(n);
}

function escapeHtml(str) {
  return String(str)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}