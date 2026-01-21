// public/js/cart.js

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

export function addToCart(product, qty = 1) {
  const items = getCart();
  const id = product.id;

  const found = items.find(x => x.product_id === id);
  if (found) {
    found.qty += qty;
  } else {
    items.push({
      product_id: id,
      name: product.name,
      price: Number(product.price || 0),
      image_path: product.image_path || "",
      qty: qty
    });
  }
  saveCart(items);
}

export function updateQty(product_id, qty) {
  const items = getCart();
  const q = Number(qty);

  const idx = items.findIndex(x => x.product_id === product_id);
  if (idx === -1) return;

  if (q <= 0) items.splice(idx, 1);
  else items[idx].qty = q;

  saveCart(items);
}

export function cartTotal() {
  return getCart().reduce((acc, it) => acc + (Number(it.price) * Number(it.qty)), 0);
}