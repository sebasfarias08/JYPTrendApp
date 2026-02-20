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
            <a class="btn btn-secondary text-sm" href="${buildFormUrl({ id: c.id })}">Editar</a>
            <button class="btn ${c.is_active ? "btn-secondary" : "btn-primary"} text-sm" data-toggle-id="${c.id}">
              ${c.is_active ? "Dar de baja" : "Reactivar"}
            </button>
          </div>
        </div>
      </article>
    `).join("");

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
