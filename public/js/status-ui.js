// public/js/status-ui.js
export function orderStatusBadgeClass(status) {
  return {
    NUEVO: "badge badge-neutral",
    CONFIRMADO: "badge badge-primary",
    ENVIADO: "badge badge-warning",
    ENTREGADO: "badge badge-success",
    CANCELADO: "badge badge-danger"
  }[status] ?? "badge badge-neutral";
}

export function paymentStatusBadgeClass(status) {
  return {
    PENDIENTE: "badge badge-neutral",
    PARCIAL: "badge badge-warning",
    PAGADO: "badge badge-success",
    FALLIDO: "badge badge-danger",
    CANCELADO: "badge badge-danger"
  }[status] ?? "badge badge-neutral";
}

/* Chips de filtros */
export function chipClass(active = false) {
  return active
    ? "chip chip-active text-sm font-semibold"
    : "chip text-sm";
}
