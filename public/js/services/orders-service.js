import { supabase } from "../lib/supabase-client.js";
import { fetchUser } from "./auth-service.js";
import { getStockByVariant, notifyInventoryChanged } from "./stock-service.js";

function mapOrderQtyByVariant(items = []) {
  const qtyByVariantId = new Map();
  for (const item of items) {
    const variantId = item?.variant_id ?? null;
    if (!variantId) continue;
    const currentQty = Number(qtyByVariantId.get(String(variantId)) ?? 0);
    qtyByVariantId.set(String(variantId), currentQty + Number(item?.qty ?? 0));
  }
  return qtyByVariantId;
}

function normalizeEditableItems(items = []) {
  return (Array.isArray(items) ? items : [])
    .map((item) => ({
      id: item?.id ?? null,
      product_id: item?.product_id ?? null,
      variant_id: item?.variant_id ?? null,
      qty: Number(item?.qty ?? 0),
      unit_price: Number(item?.unit_price ?? 0)
    }))
    .filter((item) => item.product_id && item.variant_id && Number.isFinite(item.qty) && item.qty > 0);
}

function emitInventoryRefresh(detail = {}) {
  notifyInventoryChanged({
    source: "orders",
    ...detail
  });
}

export async function getMyOrders({ limit = 50 } = {}) {
  const { data, error } = await supabase
    .from("orders")
    .select("id, order_number, created_at, order_status, payment_status, total, customer_name")
    .eq("is_active", true)
    .order("created_at", { ascending: false })
    .limit(limit);

  if (error) {
    console.error("getMyOrders error:", error);
    return [];
  }
  return data ?? [];
}

export async function getMyOpenOrders({ limit = 80 } = {}) {
  const { data: userData, error: userErr } = await fetchUser();
  if (userErr) {
    console.error("getMyOpenOrders fetchUser error:", userErr);
    return [];
  }

  const userId = userData?.user?.id;
  if (!userId) return [];

  const { data, error } = await supabase
    .from("orders")
    .select("id, order_number, created_at, order_status, payment_status, total, customer_name, user_id")
    .eq("user_id", userId)
    .eq("is_active", true)
    .not("order_status", "in", "(Cancelado,Finalizado)")
    .order("created_at", { ascending: false })
    .limit(limit);

  if (error) {
    console.error("getMyOpenOrders error:", error);
    return [];
  }
  return data ?? [];
}

export async function getPendingPaymentsCount() {
  const { data, error } = await supabase
    .from("v_order_payment_summary")
    .select("pending_amount");

  if (error) {
    console.error("getPendingPaymentsCount error:", error);
    return 0;
  }

  return (data ?? []).filter((row) => Number(row.pending_amount ?? 0) > 0).length;
}

export async function getOrderDetail(orderId) {
  const { data, error } = await supabase
    .from("orders")
    .select(`
      id,
      order_number,
      created_at,
      warehouse_id,
      point_of_sale_id,
      order_status,
      payment_status,
      customer_id,
      subtotal,
      discount_amount,
      shipping_amount,
      tax_amount,
      grand_total,
      total,
      customer_name,
      customer_name_snapshot,
      customer_phone,
      customer_phone_snapshot,
      customer_email_snapshot,
      customer_address_snapshot,
      notes,
      customers (
        full_name,
        phone,
        email
      ),
      order_items (
        id,
        product_id,
        variant_id,
        qty,
        unit_price,
        subtotal,
        product_name_snapshot,
        variant_name_snapshot,
        sku_snapshot,
        products (
          id,
          name,
          image_path
        )
      )
    `)
    .eq("id", orderId)
    .eq("is_active", true)
    .maybeSingle();

  if (error) {
    console.error("getOrderDetail error:", error);
    return null;
  }
  return data ?? null;
}

export async function updateOrderStatus(orderId, order_status) {
  const { data, error } = await supabase
    .from("orders")
    .update({ order_status })
    .eq("id", orderId)
    .eq("is_active", true);
  if (error) throw error;
  return data;
}

export async function updatePaymentStatus(orderId, payment_status) {
  const { data, error } = await supabase
    .from("orders")
    .update({ payment_status })
    .eq("id", orderId)
    .eq("is_active", true);
  if (error) throw error;
  return data;
}

export async function softDeleteOrder(orderId, { warehouseId = null, pointOfSaleId = null } = {}) {
  const { data, error } = await supabase
    .from("orders")
    .update({ is_active: false })
    .eq("id", orderId)
    .eq("is_active", true)
    .select("id")
    .maybeSingle();

  if (error) throw error;

  emitInventoryRefresh({
    orderId,
    warehouse_id: warehouseId,
    point_of_sale_id: pointOfSaleId
  });

  return data;
}

export async function getEditableOrderCatalog({
  warehouseId = null,
  pointOfSaleId = null,
  orderItems = []
} = {}) {
  const [variantsResult, stockRows] = await Promise.all([
    supabase
      .from("product_variants")
      .select(`
        id,
        product_id,
        variant_name,
        sku,
        sale_price,
        active,
        products!inner (
          id,
          name,
          image_path,
          active
        )
      `)
      .eq("active", true)
      .eq("products.active", true)
      .order("variant_name", { ascending: true }),
    getStockByVariant({
      warehouseId,
      pointOfSaleId
    })
  ]);

  const { data, error } = variantsResult;
  if (error) throw error;

  const stockByVariantId = new Map();
  for (const row of stockRows ?? []) {
    const variantId = row?.variant_id ?? null;
    if (!variantId) continue;
    stockByVariantId.set(String(variantId), Number(row?.stock_qty ?? 0));
  }

  const currentOrderQtyByVariant = mapOrderQtyByVariant(orderItems);

  return (data ?? [])
    .map((row) => {
      const variantId = String(row.id);
      const product = row?.products ?? {};
      const stockQty = Number(stockByVariantId.get(variantId) ?? 0);
      const currentOrderQty = Number(currentOrderQtyByVariant.get(variantId) ?? 0);
      const effectiveStockQty = stockQty + currentOrderQty;

      return {
        id: row.id,
        variant_id: row.id,
        product_id: row.product_id ?? product?.id ?? null,
        product_name: String(product?.name ?? "").trim(),
        variant_name: String(row?.variant_name ?? "").trim(),
        sku: String(row?.sku ?? "").trim(),
        image_path: product?.image_path ?? "",
        price: Number(row?.sale_price ?? 0),
        stock_qty: stockQty,
        effective_stock_qty: effectiveStockQty
      };
    })
    .filter((row) => Number(row.effective_stock_qty ?? 0) > 0 || Number(currentOrderQtyByVariant.get(String(row.variant_id)) ?? 0) > 0)
    .sort((a, b) => String(a.product_name || a.variant_name || "").localeCompare(String(b.product_name || b.variant_name || ""), "es", { sensitivity: "base" }));
}

export async function saveOrderItems(
  orderId,
  items,
  { warehouseId = null, pointOfSaleId = null, existingItems = [] } = {}
) {
  const normalizedItems = normalizeEditableItems(items);
  const normalizedExistingItems = normalizeEditableItems(existingItems);
  const existingById = new Map(normalizedExistingItems.filter((item) => item.id).map((item) => [String(item.id), item]));
  const requestedQtyByVariant = mapOrderQtyByVariant(normalizedItems);
  const currentOrderQtyByVariant = mapOrderQtyByVariant(normalizedExistingItems);
  const stockRows = await getStockByVariant({ warehouseId, pointOfSaleId });
  const availableByVariantId = new Map();

  for (const row of stockRows ?? []) {
    const variantId = row?.variant_id ?? null;
    if (!variantId) continue;
    availableByVariantId.set(String(variantId), Number(row?.stock_qty ?? 0));
  }

  for (const [variantId, requestedQty] of requestedQtyByVariant.entries()) {
    const currentOrderQty = Number(currentOrderQtyByVariant.get(String(variantId)) ?? 0);
    const availableQty = Number(availableByVariantId.get(String(variantId)) ?? 0);
    const effectiveQty = availableQty + currentOrderQty;
    if (requestedQty > effectiveQty) {
      throw new Error(`Stock insuficiente para la variante. Disponible: ${effectiveQty}, solicitado: ${requestedQty}.`);
    }
  }

  const nextIds = new Set(normalizedItems.filter((item) => item.id).map((item) => String(item.id)));
  const deleteIds = normalizedExistingItems
    .filter((item) => item.id && !nextIds.has(String(item.id)))
    .map((item) => item.id);

  if (deleteIds.length) {
    const { error } = await supabase
      .from("order_items")
      .delete()
      .in("id", deleteIds)
      .eq("order_id", orderId);
    if (error) throw error;
  }

  for (const item of normalizedItems) {
    if (!item.id) continue;

    const prev = existingById.get(String(item.id));
    if (!prev) continue;
    if (prev.qty === item.qty && prev.unit_price === item.unit_price) continue;

    const { error } = await supabase
      .from("order_items")
      .update({
        qty: item.qty,
        unit_price: item.unit_price
      })
      .eq("id", item.id)
      .eq("order_id", orderId);

    if (error) throw error;
  }

  const inserts = normalizedItems
    .filter((item) => !item.id)
    .map((item) => ({
      order_id: orderId,
      product_id: item.product_id,
      variant_id: item.variant_id,
      qty: item.qty,
      unit_price: item.unit_price
    }));

  if (inserts.length) {
    const { error } = await supabase
      .from("order_items")
      .insert(inserts);
    if (error) throw error;
  }

  emitInventoryRefresh({
    orderId,
    warehouse_id: warehouseId,
    point_of_sale_id: pointOfSaleId
  });
}
