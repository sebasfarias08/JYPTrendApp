import {
  createCustomer,
  deactivateCustomer,
  getCustomers,
  reactivateCustomer,
  updateCustomer
} from "./customers-service.js";
import { showToast } from "./toast.js";

const EMPTY_FORM = {
  full_name: "",
  phone: "",
  email: "",
  notes: ""
};

function toSafeReturnPath(value) {
  const raw = String(value || "").trim();
  if (!raw.startsWith("/")) return null;
  return raw;
}

function escapeHtml(str) {
  return String(str ?? "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

function summarizeError(err) {
  const msg = String(err?.message || err?.details || err || "").trim();
  if (!msg) return "No se pudo completar la operacion.";
  if (msg.includes("customers_user_full_name_uidx")) return "Ya existe un cliente activo con ese nombre.";
  if (msg.includes("customers_full_name_len_chk")) return "El nombre debe tener al menos 2 caracteres.";
  if (msg.includes("customers_email_format_chk")) return "El email tiene un formato invalido.";
  return msg;
}

export function initClientsPage() {
  const listEl = document.getElementById("clientsList");
  const emptyEl = document.getElementById("clientsEmpty");
  const countEl = document.getElementById("clientsCount");
  const searchEl = document.getElementById("q");
  const showInactiveEl = document.getElementById("showInactive");
  const btnNewClientEl = document.getElementById("btnNewClient");

  const panelEl = document.getElementById("clientFormPanel");
  const formTitleEl = document.getElementById("clientFormTitle");
  const formEl = document.getElementById("clientForm");
  const nameEl = document.getElementById("clientName");
  const phoneEl = document.getElementById("clientPhone");
  const emailEl = document.getElementById("clientEmail");
  const notesEl = document.getElementById("clientNotes");
  const btnSaveEl = document.getElementById("btnSaveClient");
  const btnCancelEl = document.getElementById("btnCancelClient");

  const params = new URLSearchParams(location.search);
  const mode = params.get("mode");
  const returnTo = toSafeReturnPath(params.get("returnTo"));

  let rows = [];
  let editingId = null;
  let saving = false;

  function setFormValues(data = EMPTY_FORM) {
    nameEl.value = data.full_name || "";
    phoneEl.value = data.phone || "";
    emailEl.value = data.email || "";
    notesEl.value = data.notes || "";
  }

  function readFormValues() {
    return {
      full_name: nameEl.value.trim(),
      phone: phoneEl.value.trim(),
      email: emailEl.value.trim(),
      notes: notesEl.value.trim()
    };
  }

  function openForm(customer = null) {
    editingId = customer?.id ?? null;
    formTitleEl.textContent = editingId ? "Editar cliente" : "Nuevo cliente";
    setFormValues(customer ?? EMPTY_FORM);
    panelEl.classList.remove("hidden");
    nameEl.focus();
  }

  function closeForm() {
    editingId = null;
    setFormValues(EMPTY_FORM);
    panelEl.classList.add("hidden");
  }

  function renderList() {
    const q = (searchEl.value || "").trim().toLowerCase();
    const includeInactive = showInactiveEl.checked;

    const filtered = rows.filter((c) => {
      if (!includeInactive && !c.is_active) return false;
      if (!q) return true;

      return (
        c.full_name.toLowerCase().includes(q) ||
        String(c.phone || "").toLowerCase().includes(q) ||
        String(c.email || "").toLowerCase().includes(q)
      );
    });

    countEl.textContent = `${filtered.length} cliente(s)`;

    if (!filtered.length) {
      listEl.innerHTML = "";
      emptyEl.classList.remove("hidden");
      return;
    }

    emptyEl.classList.add("hidden");
    listEl.innerHTML = filtered.map((c) => `
      <article class="card p-3">
        <div class="flex items-start justify-between gap-3">
          <div class="min-w-0">
            <div class="font-semibold break-words">${escapeHtml(c.full_name)}</div>
            <div class="text-sm text-muted">${escapeHtml(c.phone || "-")}</div>
            <div class="text-sm text-muted">${escapeHtml(c.email || "-")}</div>
            ${c.notes ? `<div class="text-sm text-subtle mt-1 break-words">${escapeHtml(c.notes)}</div>` : ""}
            <div class="mt-2">
              <span class="${c.is_active ? "badge badge-success" : "badge badge-neutral"}">${c.is_active ? "Activo" : "Inactivo"}</span>
            </div>
          </div>
          <div class="flex flex-col gap-2 shrink-0">
            <button class="btn btn-secondary text-sm" data-edit-id="${c.id}">Editar</button>
            <button class="btn ${c.is_active ? "btn-secondary" : "btn-primary"} text-sm" data-toggle-id="${c.id}">
              ${c.is_active ? "Dar de baja" : "Reactivar"}
            </button>
          </div>
        </div>
      </article>
    `).join("");

    listEl.querySelectorAll("[data-edit-id]").forEach((btn) => {
      btn.addEventListener("click", () => {
        const id = btn.getAttribute("data-edit-id");
        const row = rows.find((x) => x.id === id);
        if (!row) return;
        openForm(row);
      });
    });

    listEl.querySelectorAll("[data-toggle-id]").forEach((btn) => {
      btn.addEventListener("click", async () => {
        const id = btn.getAttribute("data-toggle-id");
        const row = rows.find((x) => x.id === id);
        if (!row) return;

        if (row.is_active) {
          const ok = confirm(`Dar de baja a "${row.full_name}"?`);
          if (!ok) return;
          const res = await deactivateCustomer(id);
          if (!res.ok) {
            showToast(summarizeError(res.error), { type: "error", duration: 2800 });
            return;
          }
          showToast("Cliente dado de baja.", { type: "success" });
        } else {
          const res = await reactivateCustomer(id);
          if (!res.ok) {
            showToast(summarizeError(res.error), { type: "error", duration: 2800 });
            return;
          }
          showToast("Cliente reactivado.", { type: "success" });
        }

        await loadRows();
      });
    });
  }

  async function loadRows() {
    rows = await getCustomers({ includeInactive: true });
    renderList();
  }

  async function submitForm(event) {
    event.preventDefault();
    if (saving) return;

    const body = readFormValues();
    if (!body.full_name) {
      showToast("El nombre del cliente es obligatorio.", { type: "warning" });
      nameEl.focus();
      return;
    }

    saving = true;
    btnSaveEl.disabled = true;
    btnSaveEl.classList.add("opacity-70", "cursor-not-allowed");

    const creatingNew = !editingId;
    let res = null;
    if (editingId) {
      res = await updateCustomer(editingId, body);
    } else {
      res = await createCustomer(body);
    }

    saving = false;
    btnSaveEl.disabled = false;
    btnSaveEl.classList.remove("opacity-70", "cursor-not-allowed");

    if (!res?.ok) {
      showToast(summarizeError(res?.error), { type: "error", duration: 3000 });
      return;
    }

    showToast(editingId ? "Cliente actualizado." : "Cliente creado.", { type: "success" });
    closeForm();
    await loadRows();

    if (creatingNew && returnTo) {
      const sep = returnTo.includes("?") ? "&" : "?";
      location.href = `${returnTo}${sep}customer_id=${encodeURIComponent(res.data.id)}`;
    }
  }

  btnNewClientEl.addEventListener("click", () => openForm());
  btnCancelEl.addEventListener("click", () => closeForm());
  formEl.addEventListener("submit", submitForm);
  searchEl.addEventListener("input", renderList);
  showInactiveEl.addEventListener("change", renderList);

  loadRows();

  if (mode === "new") {
    openForm();
  }
}
