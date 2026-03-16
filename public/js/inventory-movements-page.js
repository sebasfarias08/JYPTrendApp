import { getInventoryMovements } from "./inventory-movement-service.js";

function escapeHtml(str) {
  return String(str ?? "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

function formatSignedQty(value) {
  const n = Number(value ?? 0);
  const abs = Math.abs(n);
  const formatted = new Intl.NumberFormat("es-AR", { maximumFractionDigits: 2 }).format(abs);
  if (n > 0) return `+${formatted}`;
  if (n < 0) return `-${formatted}`;
  return formatted;
}

function buildFormUrl({ id = "", mode = "" } = {}) {
  const params = new URLSearchParams();
  if (id) params.set("id", id);
  if (mode) params.set("mode", mode);
  const qs = params.toString();
  return `/pages/movimientos-inventario-form.html${qs ? `?${qs}` : ""}`;
}

function buildSearchText(row) {
  return [
    row?.products?.name,
    row?.product_variants?.variant_name,
    row?.product_variants?.sku,
    row?.warehouses?.name,
    row?.points_of_sale?.name,
    row?.movement_type,
    row?.reference_type,
    row?.notes
  ].join(" ").toLowerCase();
}

export function initInventoryMovementsPage() {
  const listEl = document.getElementById("inventoryMovementsList");
  const emptyEl = document.getElementById("inventoryMovementsEmpty");
  const countEl = document.getElementById("inventoryMovementsCount");
  const searchEl = document.getElementById("q");
  const movementTypeEl = document.getElementById("movementTypeFilter");
  const btnNewEl = document.getElementById("btnNewInventoryMovement");

  let rows = [];

  function renderList() {
    const q = String(searchEl.value || "").trim().toLowerCase();
    const movementType = String(movementTypeEl.value || "").trim().toUpperCase();

    const filtered = rows.filter((row) => {
      if (movementType && String(row.movement_type || "").trim().toUpperCase() !== movementType) return false;
      if (!q) return true;
      return buildSearchText(row).includes(q);
    });

    countEl.textContent = `${filtered.length} movimiento(s)`;

    if (!filtered.length) {
      listEl.innerHTML = "";
      emptyEl.classList.remove("hidden");
      return;
    }

    emptyEl.classList.add("hidden");
    listEl.innerHTML = filtered.map((row) => {
      const productName = row?.products?.name || "Producto";
      const variantName = row?.product_variants?.variant_name || "Sin variante";
      const location = row?.warehouses?.name || row?.points_of_sale?.name || "Sin ubicacion";
      const qtyClass = row.qty > 0 ? "badge badge-success" : row.qty < 0 ? "badge badge-neutral" : "badge badge-neutral";
      const createdAt = row?.created_at ? new Date(row.created_at).toLocaleString("es-AR") : "";

      return `
        <a href="${buildFormUrl({ id: row.id, mode: "view" })}" class="block card p-3 transition hover-surface-2">
          <div class="flex items-start justify-between gap-3">
            <div class="min-w-0 flex-1">
              <div class="flex flex-wrap items-center gap-2">
                <div class="font-semibold break-words">${escapeHtml(productName)}</div>
                <span class="badge badge-neutral">${escapeHtml(row.movement_type || "Sin tipo")}</span>
                ${row.is_system_generated ? `<span class="badge badge-neutral">Automatico</span>` : ""}
              </div>
              <div class="text-sm text-muted">${escapeHtml(variantName)}</div>
              <div class="text-sm text-muted">${escapeHtml(location)}</div>
              <div class="text-xs text-subtle mt-1">${escapeHtml(row.reference_type || "MANUAL")}${row.reference_id ? ` | ${escapeHtml(row.reference_id)}` : ""}</div>
              ${row.notes ? `<div class="text-xs text-subtle mt-1">${escapeHtml(row.notes)}</div>` : ""}
            </div>
            <div class="text-right shrink-0">
              <span class="${qtyClass}">${escapeHtml(formatSignedQty(row.qty))}</span>
              <div class="text-xs text-subtle mt-2">${escapeHtml(createdAt)}</div>
            </div>
          </div>
        </a>
      `;
    }).join("");
  }

  async function loadRows() {
    rows = await getInventoryMovements({ limit: 150 });
    renderList();
  }

  btnNewEl.addEventListener("click", () => {
    location.href = buildFormUrl({ mode: "new" });
  });
  searchEl.addEventListener("input", renderList);
  movementTypeEl.addEventListener("change", renderList);

  loadRows();
}
