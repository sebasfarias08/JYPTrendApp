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
    PREPARING: "En preparación",
    READY: "Listo para retirar",
    DELIVERED: "Entregado",
    CANCELLED: "Cancelado",
    FINISHED: "Finalizado",

    PENDING: "Pendiente",
    PARTIAL: "Parcial",
    PAID: "Pagado"
  }[s] ?? s;
}