import { getProductsForAdmin } from "./product-service.js";
import { getStockByVariant, INVENTORY_CHANGED_EVENT } from "../inventory/stock-service.js";
import { getImageUrl } from "../../shared/utils/image.js";

const CATALOG_SCROLL_POSITION_KEY = "catalog_scroll_position";

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
  return `/pages/productos-form.html${qs ? `?${qs}` : ""}`;
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
  const scrollContainerEl = document.querySelector("main.overflow-y-auto");

  let isLoading = false; // Estado de carga
  let rows = [];
  const stockByVariantId = new Map();

  function showSkeletons() {
    const skeletons = Array.from({ length: 6 }, () => `
      <div class="card p-3 skeleton-card">
        <div class="skeleton skeleton-text w-3/4 mb-2"></div>
        <div class="flex items-start gap-3">
          <div class="w-14 h-14 rounded-xl bg-surface-2 skeleton shrink-0"></div>
          <div class="min-w-0 flex-1">
            <div class="skeleton skeleton-text w-full mb-1"></div>
            <div class="skeleton skeleton-text w-2/3 mb-1"></div>
            <div class="skeleton skeleton-text w-1/2 mb-1"></div>
            <div class="skeleton skeleton-text w-1/3"></div>
          </div>
        </div>
      </div>
    `).join('');
    listEl.innerHTML = skeletons;
    emptyEl.classList.add("hidden");
    countEl.textContent = "Cargando productos...";
  }

  function hideSkeletons() {
    // No hacer nada, renderList se encargará
  }

  let rows = [];
  const stockByVariantId = new Map();
  let hasRestoredScroll = false;

  function getCatalogScrollTop() {
    return scrollContainerEl ? scrollContainerEl.scrollTop : window.scrollY;
  }

  function saveCatalogScrollPosition() {
    sessionStorage.setItem(CATALOG_SCROLL_POSITION_KEY, String(getCatalogScrollTop()));
  }

  function restoreCatalogScrollPosition() {
    if (hasRestoredScroll) return;

    const storedValue = sessionStorage.getItem(CATALOG_SCROLL_POSITION_KEY);
    const scrollTop = Number(storedValue);
    if (!Number.isFinite(scrollTop) || scrollTop <= 0) {
      hasRestoredScroll = true;
      return;
    }

    hasRestoredScroll = true;
    requestAnimationFrame(() => {
      requestAnimationFrame(() => {
        if (scrollContainerEl) {
          scrollContainerEl.scrollTo({ top: scrollTop, behavior: "auto" });
          return;
        }
        window.scrollTo({ top: scrollTop, behavior: "auto" });
      });
    });
  }

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
        <a href="${buildFormUrl({ id: p.id, mode: "view" })}" class="block card p-3 transition hover-surface-2 fade-in">
          <div class="mb-2 text-xs text-muted">
            Variantes activas: <span class="font-semibold">${activeVariants.length}</span>
            ${labels.length ? ` | ${labels.join(" | ")}` : ""}
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
          <div class="mb-2 text-xs text-muted">
            Variantes activas: <span class="font-semibold">${activeVariants.length}</span>
            ${labels.length ? ` | ${labels.join(" | ")}` : ""}
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
        </a>
      `;
    }).join("");

    restoreCatalogScrollPosition();
  }

  async function loadRows() {
    if (isLoading) return; // Prevenir carga múltiple
    isLoading = true;

    showSkeletons();

    try {
      const [products, stockRows] = await Promise.all([
        getProductsForAdmin({ includeInactive: true }),
        getStockByVariant()
      ]);

      rows = products;
      stockByVariantId.clear();
      for (const row of stockRows ?? []) {
        const variantId = row?.variant_id ?? null;
        if (!variantId) continue;
        stockByVariantId.set(variantId, Number(row?.stock_qty ?? 0));
      }

      renderList();
    } catch (error) {
      console.error('Error loading products:', error);
      listEl.innerHTML = '<div class="text-center text-danger p-4">Error al cargar productos. Intente nuevamente.</div>';
      countEl.textContent = "Error al cargar";
    } finally {
      isLoading = false;
    }
  }

  btnNewEl.addEventListener("click", () => {
    if (btnNewEl.disabled) return; // Prevenir doble-clic
    btnNewEl.disabled = true;
    btnNewEl.classList.add('loading');
    location.href = buildFormUrl({ mode: "new" });
  });
  listEl.addEventListener("click", (event) => {
    const link = event.target.closest("a[href]");
    if (!link) return;
    saveCatalogScrollPosition();
  });
  searchEl.addEventListener("input", renderList);
  showInactiveEl.addEventListener("change", renderList);
  window.addEventListener(INVENTORY_CHANGED_EVENT, () => {
    loadRows();
  });

  loadRows();
}
