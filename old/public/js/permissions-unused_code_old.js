// Removed unused code from: public/js/utils/permissions.js
// Date: 2026-03-11

export function canManageUsers(role) {
  return normalizeRole(role) === ROLES.ADMIN;
}

export function canRegisterPayments(role) {
  const normalized = normalizeRole(role);
  return normalized === ROLES.ADMIN || normalized === ROLES.SELLER;
}
