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
  return s.replaceAll("_", " ");
}