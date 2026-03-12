export const ROLES = Object.freeze({
  ADMIN: "admin",
  SELLER: "seller",
  VIEWER: "viewer"
});

export const ROLE_VALUES = Object.freeze([
  ROLES.ADMIN,
  ROLES.SELLER,
  ROLES.VIEWER
]);

export function normalizeRole(role) {
  const value = String(role ?? "").trim().toLowerCase();
  return ROLE_VALUES.includes(value) ? value : ROLES.VIEWER;
}

export function canManageUsers(role) {
  return normalizeRole(role) === ROLES.ADMIN;
}

export function canManageInventory(role) {
  return normalizeRole(role) === ROLES.ADMIN;
}

export function canCreateOrders(role) {
  const normalized = normalizeRole(role);
  return normalized === ROLES.ADMIN || normalized === ROLES.SELLER;
}

export function canRegisterPayments(role) {
  const normalized = normalizeRole(role);
  return normalized === ROLES.ADMIN || normalized === ROLES.SELLER;
}

export function canViewAdminPanel(role) {
  return normalizeRole(role) === ROLES.ADMIN;
}

export function canViewReports(role) {
  const normalized = normalizeRole(role);
  return normalized === ROLES.ADMIN || normalized === ROLES.SELLER;
}

export function canAccessCatalogRoute(pathname) {
  const path = String(pathname || "").toLowerCase();
  return path === "/" || path === "/index.html" || path === "/pages/producto.html";
}
