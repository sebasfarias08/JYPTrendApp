// public/js/status-ui.js
import { statusLabel } from "./order-status.js";

export function orderStatusBadgeClass(status) {
  return {
    NEW: "bg-slate-700 text-slate-100",
    PREPARING: "bg-blue-700 text-white",
    READY: "bg-amber-600 text-white",
    DELIVERED: "bg-emerald-600 text-white",
    FINALIZADO: "bg-emerald-900 text-white",
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