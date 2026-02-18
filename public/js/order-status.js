export const ORDER_STATUS = [
  "NEW",
  "PREPARING",
  "READY",
  "DELIVERED",
  "FINISHED",
  "CANCELLED"
];

export const PAYMENT_STATUS = [
  "PENDING",
  "PARTIAL",
  "PAID"
];

export function statusLabel(s) {
  return {
    NEW: "Nuevo",
    PREPARING: "En preparacion",
    READY: "Listo para retirar",
    DELIVERED: "Entregado",
    CANCELLED: "Cancelado",
    FINISHED: "Finalizado",

    PENDING: "Pendiente",
    PARTIAL: "Parcial",
    PAID: "Pagado",

    submitted: "Nuevo",
    preparing: "En preparacion",
    ready: "Listo para retirar",
    delivered: "Entregado",
    finished: "Finalizado",
    cancelled: "Cancelado",
    pending: "Pendiente",
    partial: "Parcial",
    paid: "Pagado"
  }[s] ?? s;
}
