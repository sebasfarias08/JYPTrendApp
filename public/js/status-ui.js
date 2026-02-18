// public/js/status-ui.js
export function orderStatusBadgeClass(status) {
  return {
    NEW: "bg-slate-700 text-slate-100",
    PREPARING: "bg-blue-700 text-white",
    READY: "bg-amber-600 text-white",
    DELIVERED: "bg-emerald-600 text-white",
    FINISHED: "bg-emerald-900 text-white",
    CANCELLED: "bg-red-700 text-white"
  }[status] ?? "bg-slate-700 text-white";
}

export function paymentStatusBadgeClass(status) {
  return {
    PENDING: "bg-slate-600 text-white",
    PARTIAL: "bg-yellow-600 text-black",
    PAID: "bg-emerald-600 text-white"
  }[status] ?? "bg-slate-600 text-white";
}

/* Chips de filtros */
export function chipClass(active = false) {
  return active
    ? "px-3 py-1.5 rounded-full text-sm bg-slate-100 text-slate-900 font-semibold"
    : "px-3 py-1.5 rounded-full text-sm bg-slate-800 text-slate-300 border border-slate-700";
}
