// public/js/order-page.js
import { getCart, updateQty, clearCart, cartTotal } from "./cart.js";
import { getImageUrl } from "./image.js";
import { createOrderWithItems } from "./order-service.js";
import { getActiveCustomers, getCustomerById } from "./customers-service.js";
import { showToast } from "./toast.js";
import { formatOrderRef } from "./order-ref.js";

function formatArs(value) {
  const n = Number(value ?? 0);
  return new Intl.NumberFormat("es-AR", { maximumFractionDigits: 0 }).format(n);
}

function escapeHtml(str) {
  return String(str ?? "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

function render() {
  const listEl = document.getElementById("list");
  const totalEl = document.getElementById("total");
  const totalStickyEl = document.getElementById("totalSticky");
  const itemCountEl = document.getElementById("itemCount");

  const items = getCart();
  const count = items.reduce((acc, it) => acc + (Number(it.qty) || 0), 0);
  const total = cartTotal();

  if (itemCountEl) itemCountEl.textContent = `${count} item(s)`;
  if (totalEl) totalEl.textContent = `$ ${formatArs(total)}`;
  if (totalStickyEl) totalStickyEl.textContent = `$ ${formatArs(total)}`;

  if (!items.length) {
    listEl.innerHTML = `
      <div class="card p-4 text-sm text-muted">
        Tu pedido esta vacio. <a href="/index.html" class="text-primary underline">Volver al catalogo</a>
      </div>
    `;
    return;
  }

  listEl.innerHTML = items.map((it) => {
    const img = it.image_path ? getImageUrl(String(it.image_path).trim().replace(/^\/+/, "")) : "";

    return `
      <div class="card p-3 flex gap-3">
        <img src="${img}" class="w-16 h-16 object-contain rounded-xl bg-surface-2 border divider" />
        <div class="flex-1">
          <div class="font-semibold">${escapeHtml(it.name)}</div>
          <div class="text-muted text-sm">$ ${formatArs(it.price)} c/u</div>

          <div class="mt-2 flex items-center gap-2">
            <button data-dec="${it.product_id}" class="btn btn-secondary px-3 py-2">-</button>
            <input data-qty="${it.product_id}" value="${it.qty}"
              class="input w-16 text-center px-2 py-2" />
            <button data-inc="${it.product_id}" class="btn btn-secondary px-3 py-2">+</button>

            <div class="ml-auto font-semibold">$ ${formatArs(Number(it.price) * Number(it.qty))}</div>
          </div>
        </div>
      </div>
    `;
  }).join("");

  listEl.querySelectorAll("[data-inc]").forEach((btn) => {
    btn.addEventListener("click", () => {
      const id = btn.getAttribute("data-inc");
      const it = getCart().find((x) => x.product_id === id);
      updateQty(id, (it?.qty || 0) + 1);
      render();
    });
  });

  listEl.querySelectorAll("[data-dec]").forEach((btn) => {
    btn.addEventListener("click", () => {
      const id = btn.getAttribute("data-dec");
      const it = getCart().find((x) => x.product_id === id);
      updateQty(id, (it?.qty || 0) - 1);
      render();
    });
  });

  listEl.querySelectorAll("[data-qty]").forEach((inp) => {
    inp.addEventListener("change", () => {
      const id = inp.getAttribute("data-qty");
      const q = Number(inp.value);
      updateQty(id, isFinite(q) ? q : 1);
      render();
    });
  });
}

export function initOrderPage(session) {
  render();

  const btnSubmit = document.getElementById("btnSubmit");
  const btnSubmitSticky = document.getElementById("btnSubmitSticky");
  const customerSearchEl = document.getElementById("customerSearch");
  const customerSelectEl = document.getElementById("customerSelect");
  const customerHelpEl = document.getElementById("customerHelp");

  let submitting = false;
  let customers = [];

  const NEW_CUSTOMER_VALUE = "__new_customer__";

  function openNewCustomerFlow() {
    const returnTo = "/pages/pedido.html";
    location.href = `/pages/cliente-form.html?mode=new&returnTo=${encodeURIComponent(returnTo)}`;
  }

  function setSubmitAvailability() {
    const hasSelectedCustomer =
      customerSelectEl &&
      customerSelectEl.value &&
      customerSelectEl.value !== NEW_CUSTOMER_VALUE;
    const hasItems = getCart().some((it) => Number(it.qty || 0) > 0);
    const canSubmit = Boolean(hasSelectedCustomer && hasItems);

    const buttons = [btnSubmit, btnSubmitSticky].filter(Boolean);
    for (const btn of buttons) {
      if (!submitting) {
        btn.disabled = !canSubmit;
        btn.classList.toggle("opacity-60", !canSubmit);
        btn.classList.toggle("cursor-not-allowed", !canSubmit);
      }
    }

    if (customerHelpEl) {
      customerHelpEl.textContent = !hasItems
        ? "Agrega al menos 1 producto para confirmar el pedido."
        : hasSelectedCustomer
        ? "Cliente seleccionado. Ya puedes confirmar el pedido."
        : "Selecciona un cliente para confirmar el pedido.";
    }
  }

  function renderCustomerOptions(query = "") {
    if (!customerSelectEl) return;

    const q = String(query || "").trim().toLowerCase();
    const selectedBefore = customerSelectEl.value || "";
    const filtered = q
      ? customers.filter((c) => (
        String(c.full_name || "").toLowerCase().includes(q) ||
        String(c.phone || "").toLowerCase().includes(q)
      ))
      : customers;

    customerSelectEl.innerHTML = [
      `<option value="">Seleccionar cliente</option>`,
      ...filtered.map((c) => {
        const phone = c.phone ? ` - ${c.phone}` : "";
        return `<option value="${c.id}">${escapeHtml(c.full_name)}${escapeHtml(phone)}</option>`;
      }),
      `<option value="${NEW_CUSTOMER_VALUE}">+ Cliente nuevo</option>`
    ].join("");

    if (!filtered.length && q) {
      customerSelectEl.insertAdjacentHTML(
        "afterbegin",
        `<option value="" disabled>Sin coincidencias para "${escapeHtml(query)}"</option>`
      );
    }

    if (selectedBefore && selectedBefore !== NEW_CUSTOMER_VALUE && filtered.some((c) => c.id === selectedBefore)) {
      customerSelectEl.value = selectedBefore;
    } else if (selectedBefore === NEW_CUSTOMER_VALUE) {
      customerSelectEl.value = NEW_CUSTOMER_VALUE;
    }

    setSubmitAvailability();
  }

  async function loadCustomers() {
    if (!customerSelectEl) return;

    customerSelectEl.innerHTML = `<option value="">Cargando clientes...</option>`;
    customers = await getActiveCustomers();

    const requestedCustomerId = new URLSearchParams(location.search).get("customer_id");
    if (requestedCustomerId && !customers.some((x) => x.id === requestedCustomerId)) {
      const fetched = await getCustomerById(requestedCustomerId);
      if (fetched?.is_active) {
        customers = [fetched, ...customers];
      }
    }

    if (!customers.length) {
      customerSelectEl.innerHTML = `
        <option value="">No hay clientes disponibles</option>
        <option value="${NEW_CUSTOMER_VALUE}">+ Cliente nuevo</option>
      `;
      if (customerHelpEl) {
        customerHelpEl.textContent = "No hay clientes creados. Crea uno para continuar.";
      }
      setSubmitAvailability();
      return;
    }

    if (requestedCustomerId && customerSearchEl) {
      customerSearchEl.value = "";
    }

    renderCustomerOptions(customerSearchEl?.value || "");

    if (requestedCustomerId && customers.some((x) => x.id === requestedCustomerId)) {
      customerSelectEl.value = requestedCustomerId;
      const cleanUrl = `${location.pathname}`;
      history.replaceState({}, "", cleanUrl);
      showToast("Cliente seleccionado para el pedido.", { type: "success", duration: 1600 });
    }

    setSubmitAvailability();
  }

  function setSubmitState(isBusy) {
    submitting = isBusy;

    const buttons = [btnSubmit, btnSubmitSticky].filter(Boolean);
    for (const btn of buttons) {
      btn.disabled = isBusy;
      btn.classList.toggle("opacity-60", isBusy);
      btn.classList.toggle("cursor-not-allowed", isBusy);
      btn.textContent = isBusy ? "Enviando..." : "Confirmar pedido";
    }
    if (!isBusy) setSubmitAvailability();
  }

  async function submitOrder() {
    if (submitting) return;

    const items = getCart();
    if (!items.length) {
      showToast("Tu pedido esta vacio.", { type: "warning" });
      return;
    }

    const selectedCustomerId = customerSelectEl?.value || "";
    if (!selectedCustomerId || selectedCustomerId === NEW_CUSTOMER_VALUE) {
      showToast("Selecciona un cliente para continuar.", { type: "warning" });
      customerSelectEl?.focus();
      return;
    }

    let selectedCustomer = customers.find((x) => x.id === selectedCustomerId) ?? null;
    if (!selectedCustomer) {
      selectedCustomer = await getCustomerById(selectedCustomerId);
    }
    if (!selectedCustomer || !selectedCustomer.is_active) {
      showToast("El cliente seleccionado no esta disponible.", { type: "warning" });
      await loadCustomers();
      customerSelectEl?.focus();
      return;
    }

    setSubmitState(true);
    showToast("Enviando pedido. Espera un momento...", { type: "info", duration: 1400 });

    const order = {
      user_id: session.user.id,
      customer_id: selectedCustomer.id,
      order_status: "NUEVO",
      payment_status: "PENDIENTE",
      customer_name: selectedCustomer.full_name,
      customer_phone: selectedCustomer.phone || null,
      notes: null,
      total: cartTotal()
    };

    let res = { ok: false };

    try {
      res = await createOrderWithItems(order, items);
    } catch (e) {
      console.error("createOrderWithItems error:", e);
    }

    if (!res.ok) {
      showToast("No pudimos enviar el pedido. Verifica conexion e intenta de nuevo.", { type: "error", duration: 3200 });
      setSubmitState(false);
      return;
    }

    clearCart();
    render();
    showToast(`Pedido enviado (${formatOrderRef({ id: res.order_id, order_number: res.order_number })})`, { type: "success", duration: 3200 });
    setSubmitState(false);
  }

  btnSubmit?.addEventListener("click", submitOrder);
  btnSubmitSticky?.addEventListener("click", submitOrder);
  customerSelectEl?.addEventListener("change", () => {
    if (customerSelectEl.value === NEW_CUSTOMER_VALUE) {
      openNewCustomerFlow();
      return;
    }
    setSubmitAvailability();
  });
  customerSearchEl?.addEventListener("input", () => {
    renderCustomerOptions(customerSearchEl.value);
  });

  window.addEventListener("cart:changed", () => {
    render();
    setSubmitAvailability();
  });
  loadCustomers();
}
