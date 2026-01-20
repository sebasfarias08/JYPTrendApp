/* public/js/app.js */
import { getProducts } from "./catalog-service.js";
import { getImageUrl } from "./image.js";

export async function renderCatalog() {
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
      <div class="text-slate-300">$ ${format(p.price)}</div>
    </a>
  `).join("");
}

function formatArs(n) {
  return new Intl.NumberFormat("es-AR").format(n);
}

function escapeHtml(str) {
  return String(str)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}