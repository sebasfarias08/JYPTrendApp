import { supabase } from "../lib/supabase-client.js";
import { getSessionSnapshot } from "./auth-service.js";
import { notifyInventoryChanged } from "./stock-service.js";

export const SYSTEM_REFERENCE_TYPES = new Set([
  "ORDER_ITEM_STOCK",
  "ORDER_SOFT_DELETE_STOCK"
]);

const MOVEMENT_SELECT = `
  id,
  user_id,
  product_id,
  variant_id,
  warehouse_id,
  point_of_sale_id,
  movement_type,
  qty,
  unit_cost,
  reference_type,
  reference_id,
  notes,
  created_at,
  updated_at,
  products (
    id,
    name
  ),
  product_variants (
    id,
    variant_name,
    sku
  ),
  warehouses (
    id,
    name,
    code
  ),
  points_of_sale (
    id,
    name,
    code
  )
`;

function isSystemReferenceType(referenceType) {
  const value = String(referenceType ?? "").trim().toUpperCase();
  return value.startsWith("ORDER_") || SYSTEM_REFERENCE_TYPES.has(value);
}

function mapMovement(row) {
  if (!row) return null;

  return {
    id: row.id,
    user_id: row.user_id ?? null,
    product_id: row.product_id ?? row.products?.id ?? null,
    variant_id: row.variant_id ?? row.product_variants?.id ?? null,
    warehouse_id: row.warehouse_id ?? row.warehouses?.id ?? null,
    point_of_sale_id: row.point_of_sale_id ?? row.points_of_sale?.id ?? null,
    movement_type: row.movement_type ?? "",
    qty: Number(row.qty ?? 0),
    unit_cost: row.unit_cost == null ? null : Number(row.unit_cost),
    reference_type: row.reference_type ?? "",
    reference_id: row.reference_id ?? null,
    notes: row.notes ?? "",
    created_at: row.created_at ?? null,
    updated_at: row.updated_at ?? null,
    products: row.products ?? null,
    product_variants: row.product_variants ?? null,
    warehouses: row.warehouses ?? null,
    points_of_sale: row.points_of_sale ?? null,
    is_system_generated: isSystemReferenceType(row.reference_type)
  };
}

async function getCurrentUserId() {
  const { session, error } = await getSessionSnapshot();
  if (error) {
    console.error("getCurrentUserId inventory movements error:", error);
    return null;
  }
  return session?.user?.id ?? null;
}

function emitMovementChange(detail = {}) {
  notifyInventoryChanged({
    source: "inventory_movements",
    ...detail
  });
}

function normalizePayload(payload, userId) {
  return {
    user_id: userId,
    product_id: payload?.product_id || null,
    variant_id: payload?.variant_id || null,
    warehouse_id: payload?.warehouse_id || null,
    point_of_sale_id: payload?.point_of_sale_id || null,
    movement_type: String(payload?.movement_type ?? "").trim(),
    qty: Number(payload?.qty ?? 0),
    unit_cost: payload?.unit_cost == null || payload?.unit_cost === "" ? null : Number(payload.unit_cost),
    reference_type: String(payload?.reference_type ?? "").trim() || null,
    reference_id: payload?.reference_id || null,
    notes: String(payload?.notes ?? "").trim() || null
  };
}

export async function getInventoryMovements({ limit = 100 } = {}) {
  const { data, error } = await supabase
    .from("inventory_movements")
    .select(MOVEMENT_SELECT)
    .order("created_at", { ascending: false })
    .limit(limit);

  if (error) {
    console.error("getInventoryMovements error:", error);
    return [];
  }

  return (data ?? []).map(mapMovement).filter(Boolean);
}

export async function getInventoryMovementById(id) {
  if (!id) return null;

  const { data, error } = await supabase
    .from("inventory_movements")
    .select(MOVEMENT_SELECT)
    .eq("id", id)
    .maybeSingle();

  if (error) {
    console.error("getInventoryMovementById error:", error);
    return null;
  }

  return mapMovement(data);
}

export async function createInventoryMovement(payload) {
  const userId = await getCurrentUserId();
  if (!userId) {
    return { ok: false, error: new Error("No se pudo identificar al usuario actual.") };
  }

  const body = normalizePayload(payload, userId);

  const { data, error } = await supabase
    .from("inventory_movements")
    .insert(body)
    .select("id")
    .single();

  if (error) {
    console.error("createInventoryMovement error:", error);
    return { ok: false, error };
  }

  emitMovementChange({
    movement_id: data.id,
    warehouse_id: body.warehouse_id,
    point_of_sale_id: body.point_of_sale_id
  });

  const full = await getInventoryMovementById(data.id);
  return { ok: true, data: full };
}

export async function updateInventoryMovementById(id, payload) {
  if (!id) {
    return { ok: false, error: new Error("Movimiento invalido.") };
  }

  const existing = await getInventoryMovementById(id);
  if (!existing) {
    return { ok: false, error: new Error("No se encontro el movimiento.") };
  }
  if (existing.is_system_generated) {
    return { ok: false, error: new Error("Los movimientos automaticos no se pueden editar desde esta pantalla.") };
  }

  const userId = existing.user_id || await getCurrentUserId();
  if (!userId) {
    return { ok: false, error: new Error("No se pudo identificar al usuario actual.") };
  }

  const body = normalizePayload(payload, userId);

  const { error } = await supabase
    .from("inventory_movements")
    .update(body)
    .eq("id", id);

  if (error) {
    console.error("updateInventoryMovementById error:", error);
    return { ok: false, error };
  }

  emitMovementChange({
    movement_id: id,
    warehouse_id: body.warehouse_id,
    point_of_sale_id: body.point_of_sale_id
  });

  const full = await getInventoryMovementById(id);
  return { ok: true, data: full };
}

export async function deleteInventoryMovementById(id) {
  if (!id) {
    return { ok: false, error: new Error("Movimiento invalido.") };
  }

  const existing = await getInventoryMovementById(id);
  if (!existing) {
    return { ok: false, error: new Error("No se encontro el movimiento.") };
  }
  if (existing.is_system_generated) {
    return { ok: false, error: new Error("Los movimientos automaticos no se pueden borrar desde esta pantalla.") };
  }

  const { error } = await supabase
    .from("inventory_movements")
    .delete()
    .eq("id", id);

  if (error) {
    console.error("deleteInventoryMovementById error:", error);
    return { ok: false, error };
  }

  emitMovementChange({
    movement_id: id,
    warehouse_id: existing.warehouse_id,
    point_of_sale_id: existing.point_of_sale_id
  });

  return { ok: true, data: existing };
}
