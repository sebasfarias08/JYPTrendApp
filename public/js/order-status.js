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
  "CANCELADO",
  "FINALIZADO"
];

export function statusLabel(s) {
  return {
    NUEVO: "Nuevo",
    EN_PREPARACION: "En preparacion",
    LISTO_PARA_RETIRO: "Listo para retirar",
    ENTREGADO: "Entregado",
    CANCELADO: "Cancelado",
    FINALIZADO: "Finalizado",

    PENDIENTE: "Pendiente",
    PARCIAL: "Parcial",
    PAGADO: "Pagado",

    submitted: "Nuevo",
    preparing: "En preparacion",
    ready: "Listo para retirar",
    delivered: "Entregado",
    finished: "Finalizado",
    cancelled: "Cancelado",
    pending: "Pendiente",
    partial: "Parcial",
    paid: "Pagado",

    NEW: "Nuevo",
    PREPARING: "En preparacion",
    READY: "Listo para retirar",
    DELIVERED: "Entregado",
    CANCELLED: "Cancelado",
    FINISHED: "Finalizado",
    PENDING: "Pendiente",
    PARTIAL: "Parcial",
    PAID: "Pagado"
  }[s] ?? s;
}
