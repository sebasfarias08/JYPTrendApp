import { getVariantsForAdmin } from "./variants-service.js";
import { getStockByVariant, INVENTORY_CHANGED_EVENT } from "../inventory/stock-service.js";
import { getImageUrl } from "../../shared/utils/image.js";
import { debounce } from "../../shared/utils/debounce.js";

const VARIANTS_SCROLL_POSITION_KEY = "variants_scroll_position";

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
  return `/pages/variantes-form.html${qs ? `?${qs}` : ""}`;
}

export function initVariantsPage() {
  const listEl = document.getElementById("variantsList");
  const emptyEl = document.getElementById("variantsEmpty");
  const countEl = document.getElementById("variantsCount");
  const searchEl = document.getElementById("q");
  const showInactiveEl = document.getElementById("showInactive");
  const btnNewEl = document.getElementById("btnNewVariant");
  const scrollContainerEl = document.querySelector("main.overflow-y-auto");

  let isLoading = false;
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
    countEl.textContent = "Cargando variantes...";
  }

  let items = [];
  let hasRestoredScroll = false;

  function getVariantsScrollTop() {
    return scrollContainerEl ? scrollContainerEl.scrollTop : window.scrollY;
  }

  function saveVariantsScrollPosition() {
    sessionStorage.setItem(VARIANTS_SCROLL_POSITION_KEY, String(getVariantsScrollTop()));
  }

  function restoreVariantsScrollPosition() {
    if (hasRestoredScroll) return;

    const storedValue = sessionStorage.getItem(VARIANTS_SCROLL_POSITION_KEY);
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

  function renderList() {
    const q = (searchEl.value || "").trim().toLowerCase();
    const includeInactive = showInactiveEl.checked;

    const filtered = items.filter((v) => {
      if (!includeInactive && !v.active) return false;
      if (!q) return true;

      const product = v.products ?? {};
      return (
        String(v.variant_name || "").toLowerCase().includes(q) ||
        String(v.sku || "").toLowerCase().includes(q) ||
        String(v.barcode || "").toLowerCase().includes(q) ||
        String(product.name || "").toLowerCase().includes(q)
      );
    });

    countEl.textContent = `${filtered.length} variante(s)`;

    if (!filtered.length) {
      listEl.innerHTML = "";
      emptyEl.classList.remove("hidden");
      return;
    }

    emptyEl.classList.add("hidden");
    listEl.innerHTML = filtered.map((v) => {
      const product = v.products ?? {};
      const stock = stockByVariantId.get(v.id) ?? 0;
      const imagePath = v.image_path || product.image_path || "";
      const movementUrl = `/pages/movimientos-inventario-form.html?mode=new&variant=${encodeURIComponent(v.id)}`;

      return `
        <div class="card p-3 fade-in space-y-3">
          <a href="${buildFormUrl({ id: v.id, mode: "view" })}" class="block transition hover-surface-2">
            <div class="mb-2 text-xs text-muted">
              <span class="font-semibold">${escapeHtml(product.name || "Sin producto")}</span>
            </div>
            <div class="flex items-start gap-3">
              <img
                src="${imagePath ? getImageUrl(String(imagePath).trim().replace(/^\/+/, "")) : ""}"
                class="w-14 h-14 rounded-xl border divider bg-surface-2 object-contain shrink-0"
                alt="${escapeHtml(v.variant_name || v.sku)}"
              />
              <div class="min-w-0 flex-1">
                <div class="font-semibold break-words">${escapeHtml(v.variant_name || "Sin nombre")}</div>
                <div class="text-sm text-muted">SKU: ${escapeHtml(v.sku || "N/A")}</div>
                <div class="text-sm text-muted">Código: ${escapeHtml(v.barcode || "N/A")}</div>
                <div class="text-sm text-muted">Precio: $ ${formatArs(v.sale_price || product.price || 0)}</div>
                <div class="text-sm text-muted">Stock: ${stock}</div>
                <div class="mt-2">
                  <span class="${v.active ? "badge badge-success" : "badge badge-neutral"}">${v.active ? "Activo" : "Inactivo"}</span>
                </div>
              </div>
            </div>
          </a>
          <a href="${movementUrl}" class="btn btn-secondary btn-sm w-full">Cargar Inventario</a>
        </div>
      `;
    }).join("");

    restoreVariantsScrollPosition();
  }

  async function loadRows() {
    if (isLoading) return;
    isLoading = true;

    showSkeletons();

    try {
      const [variants, stockRows] = await Promise.all([
        getVariantsForAdmin({ includeInactive: true }),
        getStockByVariant()
      ]);

      items = variants;
      stockByVariantId.clear();
      for (const row of stockRows ?? []) {
        const variantId = row?.variant_id ?? null;
        if (!variantId) continue;
        stockByVariantId.set(variantId, Number(row?.stock_qty ?? 0));
      }

      renderList();
    } catch (error) {
      console.error('Error loading variants:', error);
      listEl.innerHTML = '<div class="text-center text-danger p-4">Error al cargar variantes. Intente nuevamente.</div>';
      countEl.textContent = "Error al cargar";
    } finally {
      isLoading = false;
    }
  }

  btnNewEl.addEventListener("click", () => {
    if (btnNewEl.disabled) return;
    btnNewEl.disabled = true;
    btnNewEl.classList.add('loading');
    location.href = buildFormUrl({ mode: "new" });
  });

  listEl.addEventListener("click", (event) => {
    const link = event.target.closest("a[href]");
    if (!link) return;
    saveVariantsScrollPosition();
  });

  searchEl.addEventListener("input", debounce(renderList, 180));
  showInactiveEl.addEventListener("change", renderList);
  window.addEventListener(INVENTORY_CHANGED_EVENT, () => {
    loadRows();
  });

  loadRows();
}
