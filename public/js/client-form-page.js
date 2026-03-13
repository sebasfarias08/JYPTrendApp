import {
  createCustomer,
  deactivateCustomer,
  getCustomerById,
  reactivateCustomer,
  updateCustomer
} from "./customers-service.js";
import { createAddressAutocomplete } from "./components/address-autocomplete.js";
import { showToast } from "./toast.js";
import {
  formatArgentinaPhoneForInput,
  normalizeArgentinaWhatsAppPhone,
  sanitizeArgentinaPhoneInput
} from "./utils/argentina-phone.js";
import { canManageCustomers, normalizeRole, ROLES } from "./utils/permissions.js";

function safeReturnPath(value) {
  const raw = String(value || "").trim();
  if (!raw) return "/pages/clientes.html";
  try {
    const url = new URL(raw, location.origin);
    if (url.origin !== location.origin) return "/pages/clientes.html";
    return `${url.pathname}${url.search}${url.hash}`;
  } catch {
    return "/pages/clientes.html";
  }
}

function summarizeError(err) {
  const msg = String(err?.message || err?.details || err || "").trim();
  if (!msg) return "No se pudo completar la operacion.";
  if (msg.includes("customers_full_name_phone_uidx") || msg.includes("duplicate key value")) {
    return "Usuario y telefono duplicados: no se puede guardar o actualizar.";
  }
  if (msg.includes("customers_full_name_len_chk")) return "El nombre debe tener al menos 2 caracteres.";
  if (msg.includes("customers_email_format_chk")) return "El email tiene un formato invalido.";
  return msg;
}

function validateWhatsappPhone(phone) {
  return normalizeArgentinaWhatsAppPhone(phone);
}

function setReadOnly(inputs, readOnly) {
  inputs.forEach((el) => {
    if (!el) return;
    el.readOnly = readOnly;
    el.classList.toggle("bg-slate-50", readOnly);
  });
}

export function initClientFormPage(session = null) {
  const titleEl = document.getElementById("clientFormTitle");
  const formEl = document.getElementById("clientForm");
  const nameEl = document.getElementById("clientName");
  const phoneEl = document.getElementById("clientPhone");
  const emailEl = document.getElementById("clientEmail");
  const addressSearchEl = document.getElementById("clientAddressSearch");
  const addressNotesEl = document.getElementById("clientAddressNotes");
  const addressSummaryEl = document.getElementById("clientAddressSummary");
  const addressStatusEl = document.getElementById("clientAddressStatus");
  const btnOpenMapsEl = document.getElementById("btnOpenMaps");
  const notesEl = document.getElementById("clientNotes");
  const formActionsEl = document.getElementById("clientFormActions");
  const detailActionsEl = document.getElementById("clientDetailActions");
  const btnSaveEl = document.getElementById("btnSaveClient");
  const btnCancelEl = document.getElementById("btnCancelClient");
  const btnEditEl = document.getElementById("btnEditClient");
  const btnToggleActiveEl = document.getElementById("btnToggleClientActive");

  const params = new URLSearchParams(location.search);
  const id = params.get("id");
  const returnTo = safeReturnPath(params.get("returnTo"));
  const requestedMode = String(params.get("mode") || "").trim().toLowerCase();
  const role = normalizeRole(session?.profile?.role || document.body.dataset.role || ROLES.VIEWER);
  const canManage = canManageCustomers(role);
  const isExisting = Boolean(id);
  const isEditMode = isExisting && requestedMode === "edit";
  const isViewMode = isExisting && requestedMode !== "edit";
  const isCreateMode = !isExisting;
  let saving = false;
  let currentCustomer = null;
  let addressField = {
    getValue: () => ({}),
    setValue: () => {},
    destroy: () => {}
  };

  function syncPhoneField() {
    if (!phoneEl) return;

    // Keep the mobile input constrained to a friendly national-format draft.
    const sanitized = sanitizeArgentinaPhoneInput(phoneEl.value);
    phoneEl.value = formatArgentinaPhoneForInput(sanitized);
  }

  function goBack(extra = "") {
    const sep = returnTo.includes("?") ? "&" : "?";
    location.href = `${returnTo}${extra ? `${sep}${extra}` : ""}`;
  }

  function setupViewMode() {
    titleEl.textContent = "Detalle de cliente";
    formActionsEl?.classList.remove("hidden");
    btnSaveEl?.classList.add("hidden");
    if (btnCancelEl) btnCancelEl.textContent = "Volver";
    detailActionsEl?.classList.remove("hidden");
    detailActionsEl?.classList.add("flex");
    setReadOnly([nameEl, phoneEl, emailEl, addressSearchEl, addressNotesEl, notesEl], true);
  }

  function setupEditOrCreateMode() {
    titleEl.textContent = isCreateMode ? "Nuevo cliente" : "Editar cliente";
    formActionsEl?.classList.remove("hidden");
    btnSaveEl?.classList.remove("hidden");
    if (btnCancelEl) btnCancelEl.textContent = "Cancelar";
    detailActionsEl?.classList.add("hidden");
    detailActionsEl?.classList.remove("flex");
    setReadOnly([nameEl, phoneEl, emailEl, addressSearchEl, addressNotesEl, notesEl], false);
  }

  async function loadForExisting() {
    if (!isExisting) return;

    const row = await getCustomerById(id);
    if (!row) {
      showToast("No se encontro el cliente.", { type: "error", duration: 2500 });
      goBack();
      return;
    }

    const customer = row ?? {};
    currentCustomer = customer;
    nameEl.value = customer?.full_name || "";
    phoneEl.value = formatArgentinaPhoneForInput(customer?.phone || "");
    emailEl.value = customer?.email || "";
    notesEl.value = customer?.notes || "";
    addressField?.setValue({
      address_input: customer?.address_input || customer?.address_formatted || customer?.address || "",
      address_formatted: customer?.address_formatted || customer?.address || "",
      address_notes: customer?.address_notes || "",
      address_place_id: customer?.address_place_id || "",
      address_lat: customer?.address_lat ?? null,
      address_lng: customer?.address_lng ?? null
    });

    if (btnToggleActiveEl) {
      btnToggleActiveEl.textContent = row.is_active ? "Dar de baja" : "Reactivar";
      btnToggleActiveEl.classList.toggle("btn-primary", !row.is_active);
      btnToggleActiveEl.classList.toggle("btn-secondary", row.is_active);
    }
  }

  if (!canManage && !isViewMode) {
    showToast("No tenes permisos para modificar clientes.", { type: "warning", duration: 2500 });
    if (!isExisting) {
      goBack();
      return;
    }
  }

  if (isViewMode || !canManage) setupViewMode();
  else setupEditOrCreateMode();

  if (btnEditEl) {
    btnEditEl.classList.toggle("hidden", !canManage);
    btnEditEl.addEventListener("click", () => {
      if (!isExisting || !canManage) return;
      location.href = `/pages/cliente-form.html?id=${encodeURIComponent(id)}&mode=edit&returnTo=${encodeURIComponent(returnTo)}`;
    });
  }

  if (btnToggleActiveEl) {
    btnToggleActiveEl.classList.toggle("hidden", !canManage);
    btnToggleActiveEl.addEventListener("click", async () => {
      if (!isExisting || !canManage || !currentCustomer) return;

      if (currentCustomer.is_active) {
        const ok = confirm(`Dar de baja a "${currentCustomer.full_name}"?`);
        if (!ok) return;
      }

      const res = currentCustomer.is_active
        ? await deactivateCustomer(currentCustomer.id)
        : await reactivateCustomer(currentCustomer.id);

      if (!res?.ok) {
        showToast(summarizeError(res?.error), { type: "error", duration: 3000 });
        return;
      }

      currentCustomer = res.data;
      btnToggleActiveEl.textContent = currentCustomer.is_active ? "Dar de baja" : "Reactivar";
      btnToggleActiveEl.classList.toggle("btn-primary", !currentCustomer.is_active);
      btnToggleActiveEl.classList.toggle("btn-secondary", currentCustomer.is_active);
      showToast(currentCustomer.is_active ? "Cliente reactivado." : "Cliente dado de baja.", { type: "success" });
    });
  }

  if (!canManage) {
    detailActionsEl?.classList.add("hidden");
    detailActionsEl?.classList.remove("flex");
  }

  phoneEl?.addEventListener("input", syncPhoneField);
  phoneEl?.addEventListener("blur", syncPhoneField);
  if (addressSearchEl) {
    addressField = createAddressAutocomplete({
      input: addressSearchEl,
      notesInput: addressNotesEl,
      mapsButton: btnOpenMapsEl,
      summary: addressSummaryEl,
      status: addressStatusEl
    });
  }

  formEl.addEventListener("submit", async (event) => {
    event.preventDefault();
    if (saving || isViewMode || !canManage) return;

    const validatedPhone = validateWhatsappPhone(phoneEl.value);
    if (!validatedPhone.ok) {
      showToast(validatedPhone.error, { type: "warning", duration: 3000 });
      phoneEl.focus();
      return;
    }

    const addressValue = addressField?.getValue?.() ?? {};
    const payload = {
      full_name: nameEl.value.trim(),
      phone: validatedPhone.value,
      email: emailEl.value.trim(),
      address_input: addressValue.address_input,
      address_formatted: addressValue.address_formatted,
      address_notes: addressValue.address_notes,
      address_place_id: addressValue.address_place_id,
      address_lat: addressValue.address_lat,
      address_lng: addressValue.address_lng,
      notes: notesEl.value.trim()
    };

    if (!payload.full_name) {
      showToast("El nombre del cliente es obligatorio.", { type: "warning" });
      nameEl.focus();
      return;
    }

    saving = true;
    btnSaveEl.disabled = true;
    btnSaveEl.classList.add("opacity-70", "cursor-not-allowed");

    const res = isEditMode
      ? await updateCustomer(id, payload)
      : await createCustomer(payload);

    saving = false;
    btnSaveEl.disabled = false;
    btnSaveEl.classList.remove("opacity-70", "cursor-not-allowed");

    if (!res?.ok) {
      showToast(summarizeError(res?.error), { type: "error", duration: 3000 });
      return;
    }

    showToast(isEditMode ? "Cliente actualizado." : "Cliente creado.", { type: "success", duration: 1200 });

    if (!isEditMode && returnTo === "/pages/checkout.html") {
      goBack(`customer_id=${encodeURIComponent(res.data.id)}`);
      return;
    }

    goBack();
  });

  btnCancelEl.addEventListener("click", () => goBack());

  loadForExisting();
}
