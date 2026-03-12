// public/js/status-ui.js
import * as orderStatusModule from "./order-status.js";

const normalizeStatus = orderStatusModule.normalizeStatus ?? ((status) => String(status ?? "").trim());

export function orderStatusBadgeClass(status) {
  const normalized = normalizeStatus(status);
  return {
    Reservado: "bg-amber-50 text-amber-700 border border-amber-200",
    Preparado: "bg-sky-50 text-sky-700 border border-sky-200",
    Entregado: "bg-emerald-50 text-emerald-700 border border-emerald-200",
    Finalizado: "bg-slate-100 text-slate-700 border border-slate-200",
    Cancelado: "bg-rose-50 text-rose-700 border border-rose-200"
  }[normalized] ?? "bg-slate-100 text-slate-700 border border-slate-200";
}

export function paymentStatusBadgeClass(status) {
  const normalized = normalizeStatus(status);
  return {
    Pendiente: "bg-yellow-50 text-yellow-700 border border-yellow-200",
    Parcial: "bg-indigo-50 text-indigo-700 border border-indigo-200",
    Finalizado: "bg-emerald-50 text-emerald-700 border border-emerald-200",
    Cancelado: "bg-rose-50 text-rose-700 border border-rose-200"
  }[normalized] ?? "bg-slate-100 text-slate-700 border border-slate-200";
}
