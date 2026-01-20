/* public/js/app.js */

export function renderCatalog() {
  const grid = document.getElementById("grid");
  if (!grid) return;

  // Mock: luego lo reemplazamos por Supabase
  const products = [
    { id: 1, name: "Botella 1L", price: 12000, img: "/assets/icons/icon-192.png" },
    { id: 2, name: "Perfume", price: 22000, img: "/assets/icons/icon-192.png" }
  ];

  grid.innerHTML = products.map(p => `
    <a href="/pages/producto.html?id=${encodeURIComponent(p.id)}"
       class="block rounded-xl border border-slate-800 bg-slate-900 p-3 active:scale-[0.99]">
      <img src="${p.img}" alt="${escapeHtml(p.name)}" class="w-full h-32 object-contain mb-2" />
      <div class="text-sm font-semibold">${escapeHtml(p.name)}</div>
      <div class="text-sm text-slate-300">$ ${formatArs(p.price)}</div>
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