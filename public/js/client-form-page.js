import { createCustomer, getCustomerById, updateCustomer } from "./customers-service.js";
import { showToast } from "./toast.js";

function safeReturnPath(value) {
  const raw = String(value || "").trim();
  if (!raw.startsWith("/")) return "/pages/clientes.html";
  return raw;
}

function summarizeError(err) {
  const msg = String(err?.message || err?.details || err || "").trim();
  if (!msg) return "No se pudo completar la operacion.";
  if (msg.includes("customers_user_full_name_uidx")) return "Ya existe un cliente activo con ese nombre.";
  if (msg.includes("customers_full_name_len_chk")) return "El nombre debe tener al menos 2 caracteres.";
  if (msg.includes("customers_email_format_chk")) return "El email tiene un formato invalido.";
  return msg;
}

export function initClientFormPage() {
  const titleEl = document.getElementById("clientFormTitle");
  const formEl = document.getElementById("clientForm");
  const nameEl = document.getElementById("clientName");
  const phoneEl = document.getElementById("clientPhone");
  const emailEl = document.getElementById("clientEmail");
  const notesEl = document.getElementById("clientNotes");
  const btnSaveEl = document.getElementById("btnSaveClient");
  const btnCancelEl = document.getElementById("btnCancelClient");

  const params = new URLSearchParams(location.search);
  const id = params.get("id");
  const returnTo = safeReturnPath(params.get("returnTo"));
  const isEdit = Boolean(id);
  let saving = false;

  function goBack(extra = "") {
    const sep = returnTo.includes("?") ? "&" : "?";
    location.href = `${returnTo}${extra ? `${sep}${extra}` : ""}`;
  }

  async function loadForEdit() {
    if (!isEdit) return;

    titleEl.textContent = "Editar cliente";
    const row = await getCustomerById(id);
    if (!row) {
      showToast("No se encontro el cliente.", { type: "error", duration: 2500 });
      goBack();
      return;
    }

    nameEl.value = row.full_name || "";
    phoneEl.value = row.phone || "";
    emailEl.value = row.email || "";
    notesEl.value = row.notes || "";
  }

  formEl.addEventListener("submit", async (event) => {
    event.preventDefault();
    if (saving) return;

    const payload = {
      full_name: nameEl.value.trim(),
      phone: phoneEl.value.trim(),
      email: emailEl.value.trim(),
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

    const res = isEdit
      ? await updateCustomer(id, payload)
      : await createCustomer(payload);

    saving = false;
    btnSaveEl.disabled = false;
    btnSaveEl.classList.remove("opacity-70", "cursor-not-allowed");

    if (!res?.ok) {
      showToast(summarizeError(res?.error), { type: "error", duration: 3000 });
      return;
    }

    showToast(isEdit ? "Cliente actualizado." : "Cliente creado.", { type: "success", duration: 1200 });

    if (!isEdit && returnTo === "/pages/pedido.html") {
      goBack(`customer_id=${encodeURIComponent(res.data.id)}`);
      return;
    }

    goBack();
  });

  btnCancelEl.addEventListener("click", () => goBack());

  loadForEdit();
}
