// public/js/status-ui.js

export const ORDER_STATUS = [
  "NUEVO",
  "EN_PREPARACION",
  "LISTO_PARA_RETIRO",
  "ENTREGADO",
  "FINALIZADO",
  "CANCELADO"
];

export const PAYMENT_STATUS = [
  "PENDIENTE",
  "PARCIAL",
  "PAGADO",
  "FINALIZADO",
  "CANCELADO"
];

export function statusLabel(s) {
  return String(s ?? "").replaceAll("_", " ");
}

export function orderStatusBadgeClass(s) {
  switch (s) {
    case "NUEVO": return "bg-slate-800 text-slate-100 border border-slate-700";
    case "EN_PREPARACION": return "bg-blue-950 text-blue-200 border border-blue-900";
    case "LISTO_PARA_RETIRO": return "bg-indigo-950 text-indigo-200 border border-indigo-900";
    case "ENTREGADO": return "bg-emerald-950 text-emerald-200 border border-emerald-900";
    case "FINALIZADO": return "bg-emerald-900 text-emerald-50 border border-emerald-700";
    case "CANCELADO": return "bg-rose-950 text-rose-200 border border-rose-900";
    default: return "bg-slate-800 text-slate-100 border border-slate-700";
  }
}

export function paymentStatusBadgeClass(s) {
  switch (s) {
    case "PENDIENTE": return "bg-amber-950 text-amber-200 border border-amber-900";
    case "PARCIAL": return "bg-orange-950 text-orange-200 border border-orange-900";
    case "PAGADO": return "bg-emerald-950 text-emerald-200 border border-emerald-900";
    case "FINALIZADO": return "bg-emerald-900 text-emerald-50 border border-emerald-700";
    case "CANCELADO": return "bg-rose-950 text-rose-200 border border-rose-900";
    default: return "bg-slate-800 text-slate-100 border border-slate-700";
  }
}

export function chipClass(active) {
  return active
    ? "px-3 py-2 rounded-xl bg-slate-100 text-slate-900 text-sm font-semibold"
    : "px-3 py-2 rounded-xl border border-slate-700 text-slate-100 text-sm";
}