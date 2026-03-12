// public/js/status-ui.js
import * as orderStatusModule from "./order-status.js";

const normalizeStatus = orderStatusModule.normalizeStatus ?? ((status) => String(status ?? "").trim());

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
