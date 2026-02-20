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
  const customerSelectWrapEl = document.getElementById("customerSelect");
  const customerSelectTriggerEl = document.getElementById("customerSelectTrigger");
  const customerSelectPanelEl = document.getElementById("customerSelectPanel");
  const customerSelectLabelEl = document.getElementById("customerSelectLabel");
  const customerSearchEl = document.getElementById("customerSearch");
  const customerOptionsEl = document.getElementById("customerOptions");

  let submitting = false;
  let customers = [];
  let selectedCustomerId = "";

  const NEW_CUSTOMER_VALUE = "__new_customer__";

  function openNewCustomerFlow() {
    const returnTo = "/pages/pedido.html";
    location.href = `/pages/cliente-form.html?mode=new&returnTo=${encodeURIComponent(returnTo)}`;
  }

  function closeCustomerPanel() {
    customerSelectPanelEl?.classList.add("hidden");
  }

  function openCustomerPanel() {
    customerSelectPanelEl?.classList.remove("hidden");
    customerSearchEl?.focus();
  }

  function setSelectedCustomer(id) {
    selectedCustomerId = id || "";
    const selected = customers.find((c) => c.id === selectedCustomerId);
    if (customerSelectLabelEl) {
      customerSelectLabelEl.textContent = selected
        ? `${selected.full_name}${selected.phone ? ` - ${selected.phone}` : ""}`
        : "Seleccionar cliente";
    }
    setSubmitAvailability();
  }

  function setSubmitAvailability() {
    const hasSelectedCustomer = Boolean(
      selectedCustomerId &&
      selectedCustomerId !== NEW_CUSTOMER_VALUE
    );
    const hasItems = getCart().some((it) => Number(it.qty || 0) > 0);
    const canSubmit = hasSelectedCustomer && hasItems;

    [btnSubmit, btnSubmitSticky].filter(Boolean).forEach((btn) => {
      if (!submitting) {
        btn.disabled = !canSubmit;
        btn.classList.toggle("opacity-60", !canSubmit);
        btn.classList.toggle("cursor-not-allowed", !canSubmit);
      }
    });
  }

  function renderCustomerOptions(query = "") {
    if (!customerOptionsEl) return;

    const q = String(query || "").trim().toLowerCase();
    const filtered = q
      ? customers.filter((c) => (
        String(c.full_name || "").toLowerCase().includes(q) ||
        String(c.phone || "").toLowerCase().includes(q)
      ))
      : customers;

    const optionsHtml = filtered.length
      ? filtered.map((c) => {
        const active = c.id === selectedCustomerId;
        const cls = active ? "chip chip-active" : "hover-surface-2";
        return `
          <button type="button" data-customer-id="${c.id}" class="w-full text-left px-3 py-2 rounded-lg ${cls}">
            ${escapeHtml(c.full_name)}${c.phone ? ` - ${escapeHtml(c.phone)}` : ""}
          </button>
        `;
      }).join("")
      : `<div class="px-3 py-2 text-sm text-muted">Sin coincidencias</div>`;

    customerOptionsEl.innerHTML = `
      ${optionsHtml}
      <div class="border-t divider mt-1 pt-1">
        <button type="button" data-customer-id="${NEW_CUSTOMER_VALUE}" class="w-full text-left px-3 py-2 rounded-lg text-primary hover-surface-2">
          + Cliente nuevo
        </button>
      </div>
    `;

    customerOptionsEl.querySelectorAll("[data-customer-id]").forEach((btn) => {
      btn.addEventListener("click", () => {
        const id = btn.getAttribute("data-customer-id") || "";
        if (id === NEW_CUSTOMER_VALUE) {
          openNewCustomerFlow();
          return;
        }
        setSelectedCustomer(id);
        closeCustomerPanel();
      });
    });
  }

  async function loadCustomers() {
    if (!customerOptionsEl) return;

    customerOptionsEl.innerHTML = `<div class="px-3 py-2 text-sm text-muted">Cargando clientes...</div>`;
    customers = await getActiveCustomers();

    const requestedCustomerId = new URLSearchParams(location.search).get("customer_id");
    if (requestedCustomerId && !customers.some((x) => x.id === requestedCustomerId)) {
      const fetched = await getCustomerById(requestedCustomerId);
      if (fetched?.is_active) customers = [fetched, ...customers];
    }

    if (!customers.length) {
      customerOptionsEl.innerHTML = `
        <div class="px-3 py-2 text-sm text-muted">No hay clientes disponibles</div>
        <div class="border-t divider mt-1 pt-1">
          <button type="button" data-customer-id="${NEW_CUSTOMER_VALUE}" class="w-full text-left px-3 py-2 rounded-lg text-primary hover-surface-2">
            + Cliente nuevo
          </button>
        </div>
      `;
      customerOptionsEl.querySelector(`[data-customer-id="${NEW_CUSTOMER_VALUE}"]`)?.addEventListener("click", openNewCustomerFlow);
      setSelectedCustomer("");
      return;
    }

    if (requestedCustomerId && customers.some((x) => x.id === requestedCustomerId)) {
      setSelectedCustomer(requestedCustomerId);
      history.replaceState({}, "", location.pathname);
      showToast("Cliente seleccionado para el pedido.", { type: "success", duration: 1600 });
    } else {
      setSelectedCustomer("");
    }

    if (customerSearchEl) customerSearchEl.value = "";
    renderCustomerOptions("");
  }

  function setSubmitState(isBusy) {
    submitting = isBusy;
    [btnSubmit, btnSubmitSticky].filter(Boolean).forEach((btn) => {
      btn.disabled = isBusy;
      btn.classList.toggle("opacity-60", isBusy);
      btn.classList.toggle("cursor-not-allowed", isBusy);
      btn.textContent = isBusy ? "Enviando..." : "Confirmar pedido";
    });
    if (!isBusy) setSubmitAvailability();
  }

  async function submitOrder() {
    if (submitting) return;

    const items = getCart();
    if (!items.length) {
      showToast("Tu pedido esta vacio.", { type: "warning" });
      return;
    }

    const currentSelectedCustomerId = selectedCustomerId || "";
    if (!currentSelectedCustomerId || currentSelectedCustomerId === NEW_CUSTOMER_VALUE) {
      showToast("Selecciona un cliente para continuar.", { type: "warning" });
      openCustomerPanel();
      return;
    }

    let selectedCustomer = customers.find((x) => x.id === currentSelectedCustomerId) ?? null;
    if (!selectedCustomer) selectedCustomer = await getCustomerById(currentSelectedCustomerId);

    if (!selectedCustomer || !selectedCustomer.is_active) {
      showToast("El cliente seleccionado no esta disponible.", { type: "warning" });
      await loadCustomers();
      openCustomerPanel();
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
  customerSelectTriggerEl?.addEventListener("click", () => {
    const isOpen = customerSelectPanelEl && !customerSelectPanelEl.classList.contains("hidden");
    if (isOpen) closeCustomerPanel();
    else openCustomerPanel();
  });
  customerSearchEl?.addEventListener("input", () => {
    renderCustomerOptions(customerSearchEl.value);
  });

  document.addEventListener("click", (event) => {
    if (!customerSelectWrapEl) return;
    if (!customerSelectWrapEl.contains(event.target)) closeCustomerPanel();
  });
  window.addEventListener("keydown", (event) => {
    if (event.key === "Escape") closeCustomerPanel();
  });

  window.addEventListener("cart:changed", () => {
    render();
    setSubmitAvailability();
  });

  loadCustomers();
}
