export const ORDER_STATUS = [
  "NUEVO",
  "CONFIRMADO",
  "ENVIADO",
  "ENTREGADO",
  "CANCELADO"
];

export const PAYMENT_STATUS = [
  "PENDIENTE",
  "PARCIAL",
  "PAGADO",
  "FALLIDO",
  "CANCELADO"
];

export function statusLabel(s) {
  return {
    NUEVO: "Nuevo",
    CONFIRMADO: "Confirmado",
    ENVIADO: "Enviado",
    ENTREGADO: "Entregado",
    CANCELADO: "Cancelado",

    PENDIENTE: "Pendiente",
    PARCIAL: "Parcial",
    PAGADO: "Pagado",
    FALLIDO: "Fallido"
  }[s] ?? s;
}
