export const ORDER_STATUS = [
  "Reservado",
  "Preparado",
  "Entregado",
  "Finalizado",
  "Cancelado"
];

export const PAYMENT_STATUS = [
  "Pendiente",
  "Parcial",
  "Finalizado",
  "Cancelado"
];

const STATUS_ALIASES = {
  RESERVADO: "Reservado",
  PREPARADO: "Preparado",
  ENTREGADO: "Entregado",
  FINALIZADO: "Finalizado",
  CANCELADO: "Cancelado",
  PENDIENTE: "Pendiente",
  PARCIAL: "Parcial",
  PAGADO: "Finalizado",
  FALLIDO: "Cancelado"
};

export function normalizeStatus(status) {
  const value = String(status ?? "").trim();
  return STATUS_ALIASES[value] ?? value;
}

export function statusLabel(status) {
  return normalizeStatus(status);
}
