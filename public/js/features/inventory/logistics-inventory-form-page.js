import {
  createLogisticsInventory,
  getLogisticsEntityMeta,
  getLogisticsInventoryById,
  LOGISTICS_ENTITY_TYPES,
  setLogisticsInventoryActive,
  updateLogisticsInventoryById
} from "./logistics-inventory-service.js";
import { showToast } from "../../shared/ui/toast.js";

function safeReturnPath(value) {
  const raw = String(value || "").trim();
  if (!raw) return "/pages/inventarios-logisticos.html";
  try {
    const url = new URL(raw, location.origin);
    if (url.origin !== location.origin) return "/pages/inventarios-logisticos.html";
    return `${url.pathname}${url.search}${url.hash}`;
  } catch {
    return "/pages/inventarios-logisticos.html";
  }
}

function summarizeError(err) {
  const msg = String(err?.message || err?.details || err || "").trim();
  if (!msg) return "No se pudo completar la operacion.";
  return msg;
}

function getTypeLabel(type) {
  return getLogisticsEntityMeta(type)?.singularLabel || "Registro";
}

export function initLogisticsInventoryFormPage() {
  const actionsEl = document.getElementById("logisticsFormActions");
  const titleEl = document.getElementById("logisticsFormTitle");
  const formEl = document.getElementById("logisticsForm");
  const typeEl = document.getElementById("logisticsType");
  const nameEl = document.getElementById("logisticsName");
  const codeEl = document.getElementById("logisticsCode");
  const descriptionEl = document.getElementById("logisticsDescription");
  const btnSaveEl = document.getElementById("btnSaveLogistics");
  const btnCancelEl = document.getElementById("btnCancelLogistics");
  const btnEditTopEl = document.getElementById("btnEditTop");
  const btnDeleteTopEl = document.getElementById("btnDeleteTop");

  const params = new URLSearchParams(location.search);
  const id = params.get("id");
  const typeFromQuery = params.get("type");
  const mode = params.get("mode");
  const returnTo = safeReturnPath(params.get("returnTo"));
  const isExisting = Boolean(id);
  const isViewMode = isExisting && mode === "view";
  const isEditMode = isExisting && !isViewMode;
  let entityType = String(typeFromQuery || LOGISTICS_ENTITY_TYPES.WAREHOUSE).trim();
  let row = null;
  let saving = false;

  function goBack() {
    location.href = returnTo;
  }

  function buildCurrentPageUrl(nextMode) {
    const query = new URLSearchParams();
    if (entityType) query.set("type", entityType);
    if (id) query.set("id", id);
    if (nextMode) query.set("mode", nextMode);
    if (returnTo) query.set("returnTo", returnTo);
    const qs = query.toString();
    return `/pages/inventarios-logisticos-form.html${qs ? `?${qs}` : ""}`;
  }

  function setReadOnlyState(disabled) {
    [typeEl, nameEl, codeEl, descriptionEl].forEach((el) => {
      el.disabled = disabled || (isExisting && el === typeEl);
      el.readOnly = disabled;
    });
  }

  function updateActionButtons() {
    if (!actionsEl || !btnEditTopEl || !btnDeleteTopEl) return;

    const showTopActions = isExisting;
    actionsEl.classList.toggle("hidden", !showTopActions);
    actionsEl.classList.toggle("flex", showTopActions);
    btnEditTopEl.classList.toggle("hidden", !isViewMode);

    const active = row?.active !== false;
    btnDeleteTopEl.textContent = active ? "Borrar" : "Reactivar";
  }

  function applyPageMode() {
    const label = getTypeLabel(entityType).toLowerCase();

    titleEl.textContent = !isExisting
      ? `Nuevo ${label}`
      : isViewMode
        ? `Detalle ${label}`
        : `Editar ${label}`;

    setReadOnlyState(isViewMode);
    btnSaveEl.classList.toggle("hidden", isViewMode);
    btnCancelEl.textContent = isViewMode ? "Volver" : "Cancelar";
    updateActionButtons();
  }

  async function loadForEdit() {
    if (!isExisting) return;

    const current = await getLogisticsInventoryById(entityType, id, { includeInactive: true });
    if (!current) {
      showToast("No se encontro el registro.", { type: "error", duration: 2500 });
      goBack();
      return;
    }

    row = current;
    entityType = current.entity_type;
    typeEl.value = current.entity_type;
    nameEl.value = current.name || "";
    codeEl.value = current.code || "";
    descriptionEl.value = current.description || "";
    applyPageMode();
  }

  formEl.addEventListener("submit", async (event) => {
    event.preventDefault();
    if (saving || isViewMode) return;

    entityType = String(typeEl.value || "").trim();
    const meta = getLogisticsEntityMeta(entityType);
    if (!meta) {
      showToast("Selecciona un tipo valido.", { type: "warning" });
      typeEl.focus();
      return;
    }

    const payload = {
      name: nameEl.value.trim(),
      code: codeEl.value.trim() || null,
      description: descriptionEl.value.trim() || null,
      active: row?.active !== false
    };

    if (!payload.name) {
      showToast(`El nombre del ${getTypeLabel(entityType).toLowerCase()} es obligatorio.`, { type: "warning" });
      nameEl.focus();
      return;
    }

    saving = true;
    btnSaveEl.disabled = true;
    btnSaveEl.classList.add("opacity-70", "cursor-not-allowed");

    const result = isEditMode
      ? await updateLogisticsInventoryById(entityType, id, payload)
      : await createLogisticsInventory(entityType, payload);

    saving = false;
    btnSaveEl.disabled = false;
    btnSaveEl.classList.remove("opacity-70", "cursor-not-allowed");

    if (!result?.ok) {
      showToast(summarizeError(result?.error), { type: "error", duration: 3000 });
      return;
    }

    showToast(isEditMode ? "Registro actualizado." : "Registro creado.", { type: "success", duration: 1200 });
    goBack();
  });

  btnCancelEl.addEventListener("click", goBack);

  btnEditTopEl?.addEventListener("click", () => {
    if (!isExisting) return;
    location.href = buildCurrentPageUrl("edit");
  });

  btnDeleteTopEl?.addEventListener("click", async () => {
    if (!isExisting || saving || !row) return;

    const willActivate = row.active === false;
    const label = getTypeLabel(entityType);
    const ok = confirm(
      willActivate
        ? `Reactivar "${row.name}" como ${label.toLowerCase()}?`
        : `Dar de baja a "${row.name}" como ${label.toLowerCase()}?`
    );
    if (!ok) return;

    saving = true;
    btnDeleteTopEl.disabled = true;
    btnDeleteTopEl.classList.add("opacity-70", "cursor-not-allowed");

    const result = await setLogisticsInventoryActive(entityType, id, willActivate);

    saving = false;
    btnDeleteTopEl.disabled = false;
    btnDeleteTopEl.classList.remove("opacity-70", "cursor-not-allowed");

    if (!result?.ok) {
      showToast(summarizeError(result?.error), { type: "error", duration: 3000 });
      return;
    }

    showToast(willActivate ? "Registro reactivado." : "Registro dado de baja.", { type: "success", duration: 1400 });
    goBack();
  });

  typeEl.innerHTML = [
    `<option value="${LOGISTICS_ENTITY_TYPES.WAREHOUSE}">Deposito</option>`,
    `<option value="${LOGISTICS_ENTITY_TYPES.POINT_OF_SALE}">Punto de venta</option>`
  ].join("");
  typeEl.value = entityType;

  applyPageMode();
  loadForEdit();
}
