export function toOrderNumber(value) {
  const n = Number(value);
  if (!Number.isFinite(n) || n <= 0) return null;
  return Math.trunc(n);
}

export function formatOrderRef(order) {
  const num = toOrderNumber(order?.order_number);
  if (num) return `#${String(num).padStart(6, "0")}`;

  const shortId = String(order?.id ?? "").slice(0, 8).toUpperCase();
  return shortId ? `ID ${shortId}` : "ID S/N";
}

export function matchesOrderQuery(order, query) {
  const q = String(query ?? "").toLowerCase().trim();
  if (!q) return true;

  const shortId = String(order?.id ?? "").slice(0, 8).toLowerCase();
  const customer = String(order?.customer_name ?? "").toLowerCase();
  const rawNum = String(order?.order_number ?? "").toLowerCase();

  const num = toOrderNumber(order?.order_number);
  const paddedNum = num ? String(num).padStart(6, "0").toLowerCase() : "";
  const hashNum = num ? `#${paddedNum}` : "";

  return (
    shortId.includes(q) ||
    customer.includes(q) ||
    rawNum.includes(q) ||
    paddedNum.includes(q) ||
    hashNum.includes(q)
  );
}
