import { getAccountBalances } from "./accounts-service.js";
import { getPendingCustomerPayments } from "./payments-service.js";
import { getPendingSupplierPayments } from "./suppliers-payments-service.js";
import { getCashFlowLast7Days } from "./transactions-service.js";

const currencyFormatter = new Intl.NumberFormat("es-AR", {
  style: "currency",
  currency: "ARS",
  maximumFractionDigits: 0
});

function formatMoney(value) {
  return currencyFormatter.format(Number(value ?? 0));
}

function safeText(value) {
  return String(value ?? "").trim();
}

function buildAccountCard(account) {
  return `
    <article class="rounded-3xl border border-slate-200 bg-white p-4 shadow-sm">
      <div class="flex items-center justify-between gap-3">
        <div>
          <p class="text-xs uppercase tracking-[0.24em] text-slate-500">${safeText(account.account_name)}</p>
          <p class="mt-2 text-lg font-semibold text-slate-900">${formatMoney(account.balance)}</p>
        </div>
        <span class="rounded-2xl bg-slate-100 px-3 py-1 text-xs font-semibold text-slate-600">${safeText(account.currency)}</span>
      </div>
    </article>
  `;
}

function buildPendingRow(item, fallbackLabel) {
  const label = safeText(item.customer_name || item.supplier_name || item.order_code || item.purchase_order_code || fallbackLabel || "Pendiente");
  const balance = Number(item.balance ?? item.amount_due ?? 0);
  const dueDate = safeText(item.due_date || item.due_at || item.due || "-");
  return `
    <div class="flex items-start justify-between gap-3 py-3 border-b border-slate-200">
      <div class="min-w-0">
        <p class="font-semibold text-slate-900 truncate">${label}</p>
        <p class="mt-1 text-xs text-slate-500">Vence: ${dueDate}</p>
      </div>
      <p class="text-sm font-semibold text-rose-600">${formatMoney(balance)}</p>
    </div>
  `;
}

function buildCashFlowRow(day) {
  return `
    <div class="flex items-center justify-between gap-3 py-3 border-b border-slate-200">
      <p class="text-sm text-slate-700">${safeText(day.label)}</p>
      <p class="text-sm font-semibold ${day.value >= 0 ? "text-emerald-600" : "text-rose-600"}">${formatMoney(day.value)}</p>
    </div>
  `;
}

function summarizeCashFlow(movements) {
  const timeline = [];
  const bucket = {};

  movements.forEach((movement) => {
    const date = new Date(movement.movement_date || movement.date || movement.created_at || null);
    if (Number.isNaN(date.getTime())) return;
    const key = date.toISOString().slice(0, 10);
    bucket[key] = (bucket[key] ?? 0) + Number(movement.amount ?? 0);
  });

  const fromDate = new Date();
  fromDate.setDate(fromDate.getDate() - 6);
  for (let i = 0; i < 7; i += 1) {
    const current = new Date(fromDate);
    current.setDate(fromDate.getDate() + i);
    const key = current.toISOString().slice(0, 10);
    const label = current.toLocaleDateString("es-AR", { day: "2-digit", month: "short" });
    timeline.push({ label, value: bucket[key] ?? 0 });
  }

  return timeline;
}

export async function initFinanceDashboard() {
  const totalBalanceEl = document.getElementById("dashboardTotalBalance");
  const accountCardsEl = document.getElementById("dashboardAccountCards");
  const cashFlowEl = document.getElementById("dashboardCashFlow");
  const pendingCustomersEl = document.getElementById("dashboardPendingCustomers");
  const pendingSuppliersEl = document.getElementById("dashboardPendingSuppliers");

  if (!totalBalanceEl || !accountCardsEl || !cashFlowEl || !pendingCustomersEl || !pendingSuppliersEl) return;

  totalBalanceEl.textContent = "Cargando...";
  accountCardsEl.innerHTML = "<p class=\"py-4 text-sm text-slate-500\">Cargando cuentas...</p>";
  cashFlowEl.innerHTML = "<p class=\"py-4 text-sm text-slate-500\">Cargando flujo de caja...</p>";
  pendingCustomersEl.innerHTML = "<p class=\"py-4 text-sm text-slate-500\">Cargando pagos de clientes...</p>";
  pendingSuppliersEl.innerHTML = "<p class=\"py-4 text-sm text-slate-500\">Cargando pagos a proveedores...</p>";

  const [accounts, customerPayments, supplierPayments, cashflowMovements] = await Promise.all([
    getAccountBalances(),
    getPendingCustomerPayments(),
    getPendingSupplierPayments(),
    getCashFlowLast7Days()
  ]);

  const totalBalance = accounts.reduce((sum, account) => sum + Number(account.balance ?? 0), 0);
  totalBalanceEl.textContent = formatMoney(totalBalance);

  if (!accounts.length) {
    accountCardsEl.innerHTML = "<p class='py-4 text-sm text-slate-500'>No hay cuentas disponibles.</p>";
  } else {
    accountCardsEl.innerHTML = accounts.map(buildAccountCard).join("");
  }

  const cashFlowTimeline = summarizeCashFlow(cashflowMovements);
  cashFlowEl.innerHTML = cashFlowTimeline.map(buildCashFlowRow).join("");

  pendingCustomersEl.innerHTML = customerPayments.length
    ? customerPayments.map((item) => buildPendingRow(item, "Pago cliente")).join("")
    : "<p class='py-4 text-sm text-slate-500'>No hay pagos pendientes de clientes.</p>";

  pendingSuppliersEl.innerHTML = supplierPayments.length
    ? supplierPayments.map((item) => buildPendingRow(item, "Pago proveedor")).join("")
    : "<p class='py-4 text-sm text-slate-500'>No hay pagos pendientes de proveedores.</p>";
}
