import { supabase } from "../lib/supabase-client.js";
import { getStockByVariant } from "./stock-service.js";
import { getSalesContext } from "./sales-context-service.js";

function resolveOrderContext(order, cartItems, fallbackContext) {
  const explicitWarehouseId = order?.warehouse_id ?? null;
  const explicitPointOfSaleId = order?.point_of_sale_id ?? null;
  if (explicitWarehouseId && explicitPointOfSaleId) {
    return {
      warehouse_id: explicitWarehouseId,
      point_of_sale_id: explicitPointOfSaleId
    };
  }

  const itemWarehouseIds = Array.from(new Set((cartItems ?? []).map((it) => it?.warehouse_id).filter(Boolean)));
  const itemPointOfSaleIds = Array.from(new Set((cartItems ?? []).map((it) => it?.point_of_sale_id).filter(Boolean)));

  if (itemWarehouseIds.length > 1 || itemPointOfSaleIds.length > 1) {
    return {
      warehouse_id: null,
      point_of_sale_id: null
    };
  }

  return {
    warehouse_id: itemWarehouseIds[0] ?? fallbackContext.warehouse_id ?? null,
    point_of_sale_id: itemPointOfSaleIds[0] ?? fallbackContext.point_of_sale_id ?? null
  };
}

async function validateCartStock(cartItems, context) {
  const rows = await getStockByVariant({
    warehouseId: context.warehouse_id,
    pointOfSaleId: context.point_of_sale_id
  });

  const availableByVariantId = new Map();
  for (const row of rows ?? []) {
    const variantId = row?.variant_id ?? null;
    if (!variantId) continue;
    availableByVariantId.set(String(variantId), Number(row?.stock_qty ?? 0));
  }

  const requestedByVariantId = new Map();
  for (const item of cartItems ?? []) {
    if (!item?.product_id || !item?.variant_id) {
      return {
        ok: false,
        error: new Error("Missing product_id or variant_id in one or more order items.")
      };
    }

    const variantId = String(item.variant_id);
    const currentQty = Number(requestedByVariantId.get(variantId) ?? 0);
    requestedByVariantId.set(variantId, currentQty + Number(item.qty || 0));
  }

  for (const [variantId, requestedQty] of requestedByVariantId.entries()) {
    const availableQty = Number(availableByVariantId.get(variantId) ?? 0);
    if (availableQty < requestedQty) {
      return {
        ok: false,
        error: new Error(`Stock insuficiente para la variante. Disponible: ${availableQty}, solicitado: ${requestedQty}.`)
      };
    }
  }

  return { ok: true };
}

export async function createOrderWithItems(order, cartItems) {
  const userId = order?.user_id ?? null;
  const fallbackContext = await getSalesContext(userId);
  const { warehouse_id: warehouseId, point_of_sale_id: pointOfSaleId } = resolveOrderContext(order, cartItems, fallbackContext);

  if (!warehouseId || !pointOfSaleId) {
    return {
      ok: false,
      error: new Error("Missing or inconsistent warehouse_id / point_of_sale_id for order creation.")
    };
  }

  const invalidItem = (cartItems ?? []).find((it) => !it?.product_id || !it?.variant_id);
  if (invalidItem) {
    return {
      ok: false,
      error: new Error("Missing product_id or variant_id in one or more order items.")
    };
  }

  const stockValidation = await validateCartStock(cartItems, {
    warehouse_id: warehouseId,
    point_of_sale_id: pointOfSaleId
  });
  if (!stockValidation.ok) return stockValidation;

  const orderPayload = {
    ...order,
    warehouse_id: warehouseId,
    point_of_sale_id: pointOfSaleId
  };

  // 1) Insert order with canonical schema/status values.
  const { data: orderRow, error: orderErr } = await supabase
    .from("orders")
    .insert(orderPayload)
    .select("id")
    .single();

  if (orderErr) {
    console.error("Insert order error:", orderErr);
    return { ok: false, error: orderErr };
  }

  const order_id = orderRow.id;

  // Best-effort: ensure customer fields stay persisted even if DB defaults/triggers override on insert.
  const customerPatch = {
    customer_name: orderPayload.customer_name ?? null,
    customer_phone: orderPayload.customer_phone ?? null,
    notes: orderPayload.notes ?? null
  };
  const { error: patchErr } = await supabase
    .from("orders")
    .update(customerPatch)
    .eq("id", order_id);
  if (patchErr) {
    console.warn("Customer patch warning:", patchErr);
  }

  // 2) Insert items. DB trigger calculates subtotals/totals.
  const items = cartItems.map((it) => ({
    order_id,
    product_id: it.product_id,
    variant_id: it.variant_id,
    qty: Number(it.qty || 1),
    unit_price: Number(it.price || 0)
  }));

  const { error: itemsErr } = await supabase
    .from("order_items")
    .insert(items);

  if (itemsErr) {
    console.error("Insert items error:", itemsErr);
    // rollback best-effort
    await supabase.from("orders").delete().eq("id", order_id);
    return { ok: false, error: itemsErr };
  }

  let order_number = null;
  const { data: numRow, error: numErr } = await supabase
    .from("orders")
    .select("order_number")
    .eq("id", order_id)
    .maybeSingle();

  if (!numErr) {
    order_number = numRow?.order_number ?? null;
  }

  return { ok: true, order_id, order_number };
}
