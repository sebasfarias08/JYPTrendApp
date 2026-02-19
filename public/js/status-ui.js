// public/js/status-ui.js
export function orderStatusBadgeClass(status) {
  return {
    NUEVO: "badge badge-neutral",
    EN_PREPARACION: "badge badge-primary",
    LISTO_PARA_RETIRO: "badge badge-warning",
    ENTREGADO: "badge badge-success",
    FINALIZADO: "badge badge-success",
    CANCELADO: "badge badge-danger",
    NEW: "badge badge-neutral",
    PREPARING: "badge badge-primary",
    READY: "badge badge-warning",
    DELIVERED: "badge badge-success",
    FINISHED: "badge badge-success",
    CANCELLED: "badge badge-danger",
    submitted: "badge badge-neutral",
    preparing: "badge badge-primary",
    ready: "badge badge-warning",
    delivered: "badge badge-success",
    finished: "badge badge-success",
    cancelled: "badge badge-danger"
  }[status] ?? "badge badge-neutral";
}

export function paymentStatusBadgeClass(status) {
  return {
    PENDIENTE: "badge badge-neutral",
    PARCIAL: "badge badge-warning",
    PAGADO: "badge badge-success",
    CANCELADO: "badge badge-danger",
    FINALIZADO: "badge badge-success",
    PENDING: "badge badge-neutral",
    PARTIAL: "badge badge-warning",
    PAID: "badge badge-success",
    pending: "badge badge-neutral",
    partial: "badge badge-warning",
    paid: "badge badge-success"
  }[status] ?? "badge badge-neutral";
}

/* Chips de filtros */
export function chipClass(active = false) {
  return active
    ? "chip chip-active text-sm font-semibold"
    : "chip text-sm";
}
