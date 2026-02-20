import {
  deactivateCustomer,
  getCustomers,
  reactivateCustomer
} from "./customers-service.js";
import { showToast } from "./toast.js";

function escapeHtml(str) {
  return String(str ?? "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

function buildFormUrl({ id = "", mode = "", returnTo = "" } = {}) {
  const params = new URLSearchParams();
  if (id) params.set("id", id);
  if (mode) params.set("mode", mode);
  if (returnTo) params.set("returnTo", returnTo);
  const qs = params.toString();
  return `/pages/cliente-form.html${qs ? `?${qs}` : ""}`;
}

function buildWhatsAppUrl(phone) {
  const digits = String(phone ?? "").replace(/\D/g, "");
  if (digits.length < 8) return null;
  return `https://wa.me/${digits}`;
}


function whatsappIconSvg() {
  return `<svg aria-hidden="true" viewBox="0 0 24 24" width="14" height="14" fill="#25D366">
    <path d="M19.05 4.91A9.82 9.82 0 0 0 12.03 2C6.57 2 2.13 6.44 2.13 11.9c0 1.75.46 3.46 1.33 4.97L2 22l5.27-1.38a9.86 9.86 0 0 0 4.76 1.22h.01c5.46 0 9.9-4.44 9.9-9.9a9.8 9.8 0 0 0-2.89-7.03Zm-7.01 15.25h-.01a8.2 8.2 0 0 1-4.17-1.14l-.3-.18-3.13.82.84-3.05-.2-.31a8.2 8.2 0 0 1-1.27-4.4c0-4.52 3.68-8.2 8.21-8.2 2.19 0 4.25.85 5.8 2.4a8.14 8.14 0 0 1 2.4 5.8c0 4.52-3.68 8.2-8.17 8.2Zm4.5-6.15c-.25-.13-1.47-.73-1.7-.81-.23-.08-.4-.13-.57.12-.17.25-.65.81-.8.98-.15.17-.29.19-.54.06-.25-.13-1.04-.38-1.99-1.22-.74-.66-1.24-1.47-1.39-1.72-.15-.25-.02-.39.11-.52.11-.11.25-.29.38-.44.13-.15.17-.25.25-.42.08-.17.04-.31-.02-.44-.06-.13-.57-1.37-.78-1.88-.21-.5-.42-.43-.57-.44h-.49c-.17 0-.44.06-.67.31-.23.25-.87.85-.87 2.08 0 1.22.89 2.4 1.01 2.56.12.17 1.75 2.67 4.23 3.75.59.26 1.05.41 1.41.52.59.19 1.13.16 1.56.1.48-.07 1.47-.6 1.68-1.18.21-.58.21-1.08.15-1.18-.06-.1-.23-.17-.48-.29Z"/>
  </svg>`;
}
export function initClientsPage() {
  const listEl = document.getElementById("clientsList");
  const emptyEl = document.getElementById("clientsEmpty");
  const countEl = document.getElementById("clientsCount");
  const searchEl = document.getElementById("q");
  const showInactiveEl = document.getElementById("showInactive");
  const btnNewClientEl = document.getElementById("btnNewClient");

  const params = new URLSearchParams(location.search);
  const mode = params.get("mode");
  const returnTo = params.get("returnTo");

  if (mode === "new") {
    location.replace(buildFormUrl({ mode: "new", returnTo: returnTo || "" }));
    return;
  }

  let rows = [];

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
    listEl.innerHTML = filtered.map((c) => {
      const waUrl = buildWhatsAppUrl(c.phone);
      const phoneCell = c.phone
        ? waUrl
          ? `<a class="inline-flex items-center gap-1 text-sm text-muted underline underline-offset-2 hover:opacity-80" href="${waUrl}" target="_blank" rel="noopener noreferrer" aria-label="Abrir chat de WhatsApp con ${escapeHtml(c.full_name)}">
              ${whatsappIconSvg()}
              <span>${escapeHtml(c.phone)}</span>
            </a>`
          : `<div class="text-sm text-muted">${escapeHtml(c.phone)}</div>`
        : `<div class="text-sm text-muted">-</div>`;

      return `
      <article class="card p-3">
        <div class="flex items-start justify-between gap-3">
          <div class="min-w-0">
            <div class="font-semibold break-words">${escapeHtml(c.full_name)}</div>
            ${phoneCell}
            ${c.notes ? `<div class="text-sm text-subtle mt-1 break-words">${escapeHtml(c.notes)}</div>` : ""}
            <div class="mt-2">
              <span class="${c.is_active ? "badge badge-success" : "badge badge-neutral"}">${c.is_active ? "Activo" : "Inactivo"}</span>
            </div>
          </div>
          <div class="flex flex-col gap-2 shrink-0">
            <a class="btn btn-secondary text-sm" href="${buildFormUrl({ id: c.id })}">Editar</a>
            <button class="btn ${c.is_active ? "btn-secondary" : "btn-primary"} text-sm" data-toggle-id="${c.id}">
              ${c.is_active ? "Dar de baja" : "Reactivar"}
            </button>
          </div>
        </div>
      </article>
    `;
    }).join("");

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
            showToast("No se pudo dar de baja el cliente.", { type: "error", duration: 2800 });
            return;
          }
          showToast("Cliente dado de baja.", { type: "success" });
        } else {
          const res = await reactivateCustomer(id);
          if (!res.ok) {
            showToast("No se pudo reactivar el cliente.", { type: "error", duration: 2800 });
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

  btnNewClientEl.addEventListener("click", () => {
    location.href = buildFormUrl({ mode: "new" });
  });
  searchEl.addEventListener("input", renderList);
  showInactiveEl.addEventListener("change", renderList);

  loadRows();
}

