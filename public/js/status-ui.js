// public/js/status-ui.js
import { normalizeStatus } from "./order-status.js";

export function orderStatusBadgeClass(status) {
  const normalized = normalizeStatus(status);
  return {
    Reservado: "badge badge-neutral",
    Preparado: "badge badge-primary",
    Entregado: "badge badge-warning",
    Finalizado: "badge badge-success",
    Cancelado: "badge badge-danger"
  }[normalized] ?? "badge badge-neutral";
}

export function paymentStatusBadgeClass(status) {
  const normalized = normalizeStatus(status);
  return {
    Pendiente: "badge badge-neutral",
    Parcial: "badge badge-warning",
    Finalizado: "badge badge-success",
    Cancelado: "badge badge-danger"
  }[normalized] ?? "badge badge-neutral";
}

/* Chips de filtros */
export function chipClass(active = false) {
  return active
    ? "chip chip-active text-sm font-semibold"
    : "chip text-sm";
}
