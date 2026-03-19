import {
  getLogisticsEntityMeta,
  getLogisticsInventories,
  LOGISTICS_ENTITY_TYPES
} from "./logistics-inventory-service.js";

function escapeHtml(str) {
  return String(str ?? "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

function buildFormUrl({ type = "", id = "", mode = "" } = {}) {
  const params = new URLSearchParams();
  if (type) params.set("type", type);
  if (id) params.set("id", id);
  if (mode) params.set("mode", mode);
  const qs = params.toString();
  return `/pages/inventarios-logisticos-form.html${qs ? `?${qs}` : ""}`;
}

function formatTypeLabel(type) {
  return getLogisticsEntityMeta(type)?.singularLabel || "Registro";
}

export function initLogisticsInventoriesPage() {
  const listEl = document.getElementById("logisticsList");
  const emptyEl = document.getElementById("logisticsEmpty");
  const countEl = document.getElementById("logisticsCount");
  const searchEl = document.getElementById("q");
  const showInactiveEl = document.getElementById("showInactive");
  const typeFilterEl = document.getElementById("logisticsTypeFilter");
  const btnNewEl = document.getElementById("btnNewLogistics");

  let rows = [];

  function renderList() {
    const q = (searchEl.value || "").trim().toLowerCase();
    const includeInactive = showInactiveEl.checked;
    const selectedType = String(typeFilterEl.value || "").trim();

    const filtered = rows.filter((row) => {
      if (!includeInactive && !row.active) return false;
      if (selectedType && row.entity_type !== selectedType) return false;
      if (!q) return true;

      return (
        String(row.name || "").toLowerCase().includes(q) ||
        String(row.code || "").toLowerCase().includes(q) ||
        String(row.description || "").toLowerCase().includes(q) ||
        formatTypeLabel(row.entity_type).toLowerCase().includes(q)
      );
    });

    countEl.textContent = `${filtered.length} registro(s)`;

    if (!filtered.length) {
      listEl.innerHTML = "";
      emptyEl.classList.remove("hidden");
      return;
    }

    emptyEl.classList.add("hidden");
    listEl.innerHTML = filtered.map((row) => `
      <a href="${buildFormUrl({ type: row.entity_type, id: row.id, mode: "view" })}" class="block card p-3 transition hover-surface-2">
        <div class="flex items-start justify-between gap-3">
          <div class="min-w-0 flex-1">
            <div class="flex flex-wrap items-center gap-2">
              <div class="font-semibold break-words">${escapeHtml(row.name)}</div>
              <span class="badge badge-neutral">${escapeHtml(formatTypeLabel(row.entity_type))}</span>
            </div>
            <div class="mt-1 text-sm text-muted">Codigo: ${escapeHtml(row.code || "Sin codigo")}</div>
            <div class="text-sm text-muted">${escapeHtml(row.description || "Sin descripcion")}</div>
          </div>
          <span class="${row.active ? "badge badge-success" : "badge badge-neutral"}">${row.active ? "Activo" : "Inactivo"}</span>
        </div>
      </a>
    `).join("");
  }

  async function loadRows() {
    rows = await getLogisticsInventories({ includeInactive: true });
    renderList();
  }

  btnNewEl.addEventListener("click", () => {
    const selectedType = String(typeFilterEl.value || "").trim();
    location.href = buildFormUrl({
      type: selectedType || LOGISTICS_ENTITY_TYPES.WAREHOUSE,
      mode: "new"
    });
  });

  searchEl.addEventListener("input", renderList);
  showInactiveEl.addEventListener("change", renderList);
  typeFilterEl.addEventListener("change", renderList);

  loadRows();
}
