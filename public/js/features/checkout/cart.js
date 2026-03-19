// Checkout cart storage helpers.

const CART_KEY = "jyp_cart_v1";

function safeParse(json, fallback) {
  try { return JSON.parse(json); } catch { return fallback; }
}

export function getCart() {
  return safeParse(localStorage.getItem(CART_KEY) || "[]", []);
}

export function saveCart(items) {
  localStorage.setItem(CART_KEY, JSON.stringify(items));
  window.dispatchEvent(new CustomEvent("cart:changed"));
}

export function clearCart() {
  saveCart([]);
}

export function getCartCount() {
  return getCart().reduce((acc, it) => acc + (Number(it.qty) || 0), 0);
}

function itemKey(item) {
  return String(
    item?.cart_key ||
    [item?.variant_id || item?.product_id || "", item?.warehouse_id || "", item?.point_of_sale_id || ""].join("::")
  );
}

export function addToCart(product, qty = 1) {
  const items = getCart();
  const productId = String(product?.product_id || product?.id || "");
  const variantId = product?.variant_id ? String(product.variant_id) : null;
  const warehouseId = product?.warehouse_id ? String(product.warehouse_id) : null;
  const pointOfSaleId = product?.point_of_sale_id ? String(product.point_of_sale_id) : null;
  const cartKey = String(product?.cart_key || [variantId || productId, warehouseId || "", pointOfSaleId || ""].join("::"));
  if (!cartKey || !productId) return;

  const found = items.find((x) => itemKey(x) === cartKey);
  if (found) {
    found.qty += qty;
    found.warehouse_id = warehouseId;
    found.point_of_sale_id = pointOfSaleId;
  } else {
    items.push({
      cart_key: cartKey,
      product_id: productId,
      variant_id: variantId,
      warehouse_id: warehouseId,
      point_of_sale_id: pointOfSaleId,
      name: product.name,
      price: Number(product.price || 0),
      image_path: product.image_path || "",
      qty: qty
    });
  }
  saveCart(items);
}

export function updateQty(item_id, qty) {
  const items = getCart();
  const q = Number(qty);
  const targetKey = String(item_id || "");
  if (!targetKey) return;

  const idx = items.findIndex((x) => itemKey(x) === targetKey);
  if (idx === -1) return;

  if (q <= 0) items.splice(idx, 1);
  else items[idx].qty = q;

  saveCart(items);
}

export function updatePrice(item_id, price) {
  const items = getCart();
  const normalizedPrice = Math.trunc(Number(price));
  const targetKey = String(item_id || "");
  if (!targetKey || !Number.isFinite(normalizedPrice) || normalizedPrice < 0) return;

  const idx = items.findIndex((x) => itemKey(x) === targetKey);
  if (idx === -1) return;

  items[idx].price = normalizedPrice;
  saveCart(items);
}

export function cartTotal() {
  return getCart().reduce((acc, it) => acc + (Number(it.price) * Number(it.qty)), 0);
}
