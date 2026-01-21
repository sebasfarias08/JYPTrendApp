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

  const items = getCart();

  if (!items.length) {
    listEl.innerHTML = `<div class="text-slate-300">Tu pedido está vacío.</div>`;
    totalEl.textContent = "$ 0";
    return;
  }

  listEl.innerHTML = items.map(it => {
    const img = it.image_path ? getImageUrl(String(it.image_path).trim().replace(/^\/+/, "")) : "";
    return `
      <div class="rounded-2xl border border-slate-800 bg-slate-900 p-3 flex gap-3">
        <img src="${img}" class="w-16 h-16 object-contain rounded-xl bg-slate-950 border border-slate-800" />
        <div class="flex-1">
          <div class="font-semibold">${escapeHtml(it.name)}</div>
          <div class="text-slate-300 text-sm">$ ${formatArs(it.price)} c/u</div>

          <div class="mt-2 flex items-center gap-2">
            <button data-dec="${it.product_id}" class="px-3 py-2 rounded-lg border border-slate-700">−</button>
            <input data-qty="${it.product_id}" value="${it.qty}"
              class="w-16 text-center px-2 py-2 rounded-lg bg-slate-950 border border-slate-800" />
            <button data-inc="${it.product_id}" class="px-3 py-2 rounded-lg border border-slate-700">+</button>

            <div class="ml-auto font-semibold">$ ${formatArs(Number(it.price) * Number(it.qty))}</div>
          </div>
        </div>
      </div>
    `;
  }).join("");

  totalEl.textContent = `$ ${formatArs(cartTotal())}`;

  // handlers
  listEl.querySelectorAll("[data-inc]").forEach(btn => {
    btn.addEventListener("click", () => {
      const id = btn.getAttribute("data-inc");
      const it = getCart().find(x => x.product_id === id);
      updateQty(id, (it?.qty || 0) + 1);
      render();
    });
  });

  listEl.querySelectorAll("[data-dec]").forEach(btn => {
    btn.addEventListener("click", () => {
      const id = btn.getAttribute("data-dec");
      const it = getCart().find(x => x.product_id === id);
      updateQty(id, (it?.qty || 0) - 1);
      render();
    });
  });

  listEl.querySelectorAll("[data-qty]").forEach(inp => {
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

  document.getElementById("btnClear").addEventListener("click", () => {
    clearCart();
    msgEl.textContent = "Pedido vaciado.";
    render();
  });

  document.getElementById("btnSubmit").addEventListener("click", async () => {
    const items = getCart();
    if (!items.length) {
      msgEl.textContent = "Tu pedido está vacío.";
      return;
    }

    const customer_name = document.getElementById("customerName").value?.trim() || null;
    const customer_phone = document.getElementById("customerPhone").value?.trim() || null;
    const notes = document.getElementById("notes").value?.trim() || null;

    msgEl.textContent = "Enviando pedido...";

    const total = cartTotal();

    const order = {
      user_id: session.user.id,
      status: "submitted",
      customer_name,
      customer_phone,
      notes,
      total
    };

    const res = await createOrderWithItems(order, items);

    if (!res.ok) {
      msgEl.textContent = "Error enviando pedido. Revisá consola.";
      return;
    }

    clearCart();
    render();
    msgEl.textContent = `Pedido enviado ✅ (ID: ${res.order_id})`;
  });

  window.addEventListener("cart:changed", () => render());
}