import { getProductsForAdmin, setProductActive } from "./product-service.js";
import { getStockByVariant } from "./services/stock-service.js";
import { getImageUrl } from "./image.js";
import { showToast } from "./toast.js";

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

function buildFormUrl({ id = "", mode = "" } = {}) {
  const params = new URLSearchParams();
  if (id) params.set("id", id);
  if (mode) params.set("mode", mode);
  const qs = params.toString();
  return `/pages/producto-form.html${qs ? `?${qs}` : ""}`;
}

function resolveVariantId(row) {
  return row?.variant_id ?? row?.product_variant_id ?? row?.id ?? null;
}

function resolveVariantStockQty(row) {
  const candidates = [
    row?.stock,
    row?.stock_qty,
    row?.quantity,
    row?.qty,
    row?.current_stock
  ];

  for (const raw of candidates) {
    const n = Number(raw);
    if (Number.isFinite(n)) return n;
  }

  return 0;
}

function variantPriceSummary(activeVariants) {
  const prices = activeVariants
    .map((v) => Number(v.sale_price))
    .filter((n) => Number.isFinite(n));

  if (!prices.length) return "Sin precio de variante";

  const min = Math.min(...prices);
  const max = Math.max(...prices);
  if (min === max) return `$ ${formatArs(min)}`;
  return `$ ${formatArs(min)} - $ ${formatArs(max)}`;
}

export function initProductsPage() {
  const listEl = document.getElementById("productsList");
  const emptyEl = document.getElementById("productsEmpty");
  const countEl = document.getElementById("productsCount");
  const searchEl = document.getElementById("q");
  const showInactiveEl = document.getElementById("showInactive");
  const btnNewEl = document.getElementById("btnNewProduct");

  let rows = [];
  const stockByVariantId = new Map();

  function getProductVariantStock(product) {
    const variants = Array.isArray(product.product_variants) ? product.product_variants : [];
    return variants
      .filter((v) => v.active !== false)
      .reduce((sum, v) => sum + Number(stockByVariantId.get(v.id) ?? 0), 0);
  }

  function renderList() {
    const q = (searchEl.value || "").trim().toLowerCase();
    const includeInactive = showInactiveEl.checked;

    const filtered = rows.filter((p) => {
      if (!includeInactive && !p.active) return false;
      if (!q) return true;

      const variants = Array.isArray(p.product_variants) ? p.product_variants : [];
      const variantMatch = variants.some((v) => {
        return (
          String(v.variant_name || "").toLowerCase().includes(q) ||
          String(v.sku || "").toLowerCase().includes(q)
        );
      });

      return (
        p.name.toLowerCase().includes(q) ||
        String(p.categories?.name || "").toLowerCase().includes(q) ||
        variantMatch
      );
    });

    countEl.textContent = `${filtered.length} producto(s)`;

    if (!filtered.length) {
      listEl.innerHTML = "";
      emptyEl.classList.remove("hidden");
      return;
    }

    emptyEl.classList.add("hidden");
    listEl.innerHTML = filtered.map((p) => {
      const variants = Array.isArray(p.product_variants) ? p.product_variants : [];
      const activeVariants = variants.filter((v) => v.active !== false);
      const labels = activeVariants
        .slice(0, 3)
        .map((v) => escapeHtml(v.variant_name || v.sku || "Variante"));
      const stockTotal = getProductVariantStock(p);

      return `
        <article class="card p-3">
          <div class="mb-2 text-xs text-muted">
            Variantes activas: <span class="font-semibold">${activeVariants.length}</span>
            ${labels.length ? ` · ${labels.join(" · ")}` : ""}
          </div>
          <div class="flex items-start gap-3">
            <img
              src="${p.image_path ? getImageUrl(String(p.image_path).trim().replace(/^\/+/, "")) : ""}"
              class="w-14 h-14 rounded-xl border divider bg-surface-2 object-contain shrink-0"
              alt="${escapeHtml(p.name)}"
            />
            <div class="min-w-0 flex-1">
              <div class="font-semibold break-words">${escapeHtml(p.name)}</div>
              <div class="text-sm text-muted">Precio base: $ ${formatArs(p.price)}</div>
              <div class="text-sm text-muted">Precio variantes: ${variantPriceSummary(activeVariants)}</div>
              <div class="text-sm text-muted">Stock variantes: ${stockTotal}</div>
              <div class="text-sm text-muted">${escapeHtml(p.categories?.name || "Sin categoria")}</div>
              ${p.image_path ? `<div class="text-xs text-subtle mt-1 break-all">${escapeHtml(p.image_path)}</div>` : ""}
              <div class="mt-2">
                <span class="${p.active ? "badge badge-success" : "badge badge-neutral"}">${p.active ? "Activo" : "Inactivo"}</span>
              </div>
            </div>
          </div>
          <div class="mt-3 flex flex-wrap gap-2">
            <a href="/pages/producto.html?id=${encodeURIComponent(p.id)}" class="btn btn-secondary text-sm">Ver</a>
            <a href="${buildFormUrl({ id: p.id })}" class="btn btn-secondary text-sm">Editar</a>
            <button class="btn ${p.active ? "btn-secondary" : "btn-primary"} text-sm" data-toggle-id="${p.id}">
              ${p.active ? "Dar de baja" : "Reactivar"}
            </button>
          </div>
        </article>
      `;
    }).join("");

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
          showToast("No se pudo actualizar el estado del producto.", { type: "error", duration: 2800 });
          return;
        }

        showToast(row.active ? "Producto dado de baja." : "Producto reactivado.", { type: "success" });
        await loadRows();
      });
    });
  }

  async function loadRows() {
    const [products, stockRows] = await Promise.all([
      getProductsForAdmin({ includeInactive: true }),
      getStockByVariant()
    ]);

    rows = products;
    stockByVariantId.clear();
    for (const row of stockRows ?? []) {
      const variantId = resolveVariantId(row);
      if (!variantId) continue;
      stockByVariantId.set(variantId, resolveVariantStockQty(row));
    }

    renderList();
  }

  btnNewEl.addEventListener("click", () => {
    location.href = buildFormUrl({ mode: "new" });
  });
  searchEl.addEventListener("input", renderList);
  showInactiveEl.addEventListener("change", renderList);

  loadRows();
}
