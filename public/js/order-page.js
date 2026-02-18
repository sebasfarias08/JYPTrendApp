// public/js/order-page.js
import { getCart, updateQty, clearCart, cartTotal } from "./cart.js";
import { getImageUrl } from "./image.js";
import { createOrderWithItems } from "./order-service.js";

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

  itemCountEl.textContent = `${count} item(s)`;
  totalEl.textContent = `$ ${formatArs(total)}`;
  totalStickyEl.textContent = `$ ${formatArs(total)}`;

  if (!items.length) {
    listEl.innerHTML = `
      <div class="rounded-xl border border-slate-800 bg-slate-950 p-4 text-sm text-slate-300">
        Tu pedido esta vacio. <a href="/index.html" class="text-emerald-300 underline">Volver al catalogo</a>
      </div>
    `;
    return;
  }

  listEl.innerHTML = items.map((it) => {
    const img = it.image_path ? getImageUrl(String(it.image_path).trim().replace(/^\/+/, "")) : "";

    return `
      <div class="rounded-2xl border border-slate-800 bg-slate-950/70 p-3 flex gap-3">
        <img src="${img}" class="w-16 h-16 object-contain rounded-xl bg-slate-950 border border-slate-800" />
        <div class="flex-1">
          <div class="font-semibold">${escapeHtml(it.name)}</div>
          <div class="text-slate-300 text-sm">$ ${formatArs(it.price)} c/u</div>

          <div class="mt-2 flex items-center gap-2">
            <button data-dec="${it.product_id}" class="px-3 py-2 rounded-lg border border-slate-700">-</button>
            <input data-qty="${it.product_id}" value="${it.qty}"
              class="w-16 text-center px-2 py-2 rounded-lg bg-slate-950 border border-slate-800" />
            <button data-inc="${it.product_id}" class="px-3 py-2 rounded-lg border border-slate-700">+</button>

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

  const msgEl = document.getElementById("msg");
  const btnClear = document.getElementById("btnClear");
  const btnSubmit = document.getElementById("btnSubmit");
  const btnSubmitSticky = document.getElementById("btnSubmitSticky");
  const customerNameEl = document.getElementById("customerName");
  const customerPhoneEl = document.getElementById("customerPhone");
  const notesEl = document.getElementById("notes");

  const clearModalEl = document.getElementById("clearModal");
  const btnConfirmClear = document.getElementById("btnConfirmClear");
  const btnCancelClear = document.getElementById("btnCancelClear");

  let submitting = false;

  function setSubmitState(isBusy) {
    submitting = isBusy;

    const buttons = [btnSubmit, btnSubmitSticky].filter(Boolean);
    for (const btn of buttons) {
      btn.disabled = isBusy;
      btn.classList.toggle("opacity-60", isBusy);
      btn.classList.toggle("cursor-not-allowed", isBusy);
      btn.textContent = isBusy ? "Enviando..." : "Confirmar pedido";
    }
  }

  function openClearModal() {
    clearModalEl?.classList.remove("hidden");
  }

  function closeClearModal() {
    clearModalEl?.classList.add("hidden");
  }

  btnClear?.addEventListener("click", () => {
    if (!getCart().length) {
      msgEl.textContent = "No hay productos para vaciar.";
      return;
    }
    openClearModal();
  });

  btnCancelClear?.addEventListener("click", closeClearModal);

  clearModalEl?.addEventListener("click", (event) => {
    if (event.target === clearModalEl) closeClearModal();
  });

  btnConfirmClear?.addEventListener("click", () => {
    clearCart();
    closeClearModal();
    msgEl.textContent = "Pedido vaciado.";
    render();
  });

  async function submitOrder() {
    if (submitting) return;

    const items = getCart();
    if (!items.length) {
      msgEl.textContent = "Tu pedido esta vacio.";
      return;
    }

    const customer_name = customerNameEl.value?.trim() || null;
    const customer_phone = customerPhoneEl.value?.trim() || null;
    const notes = notesEl.value?.trim() || null;

    if (!customer_name) {
      msgEl.textContent = "Ingresa el nombre del cliente para continuar.";
      customerNameEl.focus();
      return;
    }

    setSubmitState(true);
    msgEl.textContent = "Enviando pedido. Espera un momento...";

    const order = {
      user_id: session.user.id,
      order_status: "NEW",
      payment_status: "PENDING",
      customer_name,
      customer_phone,
      notes,
      total: cartTotal()
    };

    let res = { ok: false };

    try {
      res = await createOrderWithItems(order, items);
    } catch (e) {
      console.error("createOrderWithItems error:", e);
    }

    if (!res.ok) {
      msgEl.textContent = "No pudimos enviar el pedido. Verifica conexion e intenta de nuevo.";
      setSubmitState(false);
      return;
    }

    clearCart();
    render();
    msgEl.textContent = `Pedido enviado (ID: ${res.order_id})`;
    setSubmitState(false);
  }

  btnSubmit?.addEventListener("click", submitOrder);
  btnSubmitSticky?.addEventListener("click", submitOrder);

  window.addEventListener("cart:changed", () => render());
}
