import { supabase } from "../../app/core/supabase-client.js";
import { getSessionSnapshot } from "../../app/auth/auth-service.js";

export const LOGISTICS_ENTITY_TYPES = {
  WAREHOUSE: "warehouse",
  POINT_OF_SALE: "point_of_sale"
};

const ENTITY_META = {
  [LOGISTICS_ENTITY_TYPES.WAREHOUSE]: {
    type: LOGISTICS_ENTITY_TYPES.WAREHOUSE,
    table: "warehouses",
    activeColumn: "is_active",
    label: "Depositos",
    singularLabel: "Deposito"
  },
  [LOGISTICS_ENTITY_TYPES.POINT_OF_SALE]: {
    type: LOGISTICS_ENTITY_TYPES.POINT_OF_SALE,
    table: "points_of_sale",
    activeColumn: "active",
    label: "Puntos de venta",
    singularLabel: "Punto de venta"
  }
};

function normalizeEntityType(type) {
  const value = String(type ?? "").trim().toLowerCase();
  return ENTITY_META[value] ? value : null;
}

export function getLogisticsEntityMeta(type) {
  return ENTITY_META[normalizeEntityType(type)] ?? null;
}

function mapLogisticsRow(type, row) {
  const meta = getLogisticsEntityMeta(type);
  if (!meta || !row) return null;

  return {
    entity_type: meta.type,
    entity_label: meta.singularLabel,
    id: row.id,
    user_id: row.user_id ?? null,
    name: row.name ?? "",
    code: row.code ?? "",
    description: row.description ?? "",
    active: row[meta.activeColumn] !== false,
    created_at: row.created_at ?? null,
    updated_at: row.updated_at ?? null
  };
}

function getSelectFields(type) {
  const meta = getLogisticsEntityMeta(type);
  if (!meta) return "*";

  const fields = ["id", "user_id", "name", "code", "description", "created_at", "updated_at"];
  fields.push(meta.activeColumn);
  return fields.join(", ");
}

async function listEntityRows(type, { includeInactive = true } = {}) {
  const meta = getLogisticsEntityMeta(type);
  if (!meta) return [];

  let query = supabase
    .from(meta.table)
    .select(getSelectFields(type))
    .order("created_at", { ascending: false });

  if (!includeInactive) {
    query = query.eq(meta.activeColumn, true);
  }

  const { data, error } = await query;
  if (error) {
    console.error(`listEntityRows(${meta.table}) error:`, error);
    return [];
  }

  return (data ?? []).map((row) => mapLogisticsRow(type, row)).filter(Boolean);
}

export async function getLogisticsInventories({ includeInactive = true, type = "" } = {}) {
  const normalizedType = normalizeEntityType(type);

  if (normalizedType) {
    return listEntityRows(normalizedType, { includeInactive });
  }

  const [warehouses, pointsOfSale] = await Promise.all([
    listEntityRows(LOGISTICS_ENTITY_TYPES.WAREHOUSE, { includeInactive }),
    listEntityRows(LOGISTICS_ENTITY_TYPES.POINT_OF_SALE, { includeInactive })
  ]);

  return [...warehouses, ...pointsOfSale].sort((a, b) => {
    const byDate = String(b.created_at ?? "").localeCompare(String(a.created_at ?? ""));
    if (byDate !== 0) return byDate;
    return String(a.name ?? "").localeCompare(String(b.name ?? ""), "es");
  });
}

export async function getLogisticsInventoryById(type, id, { includeInactive = true } = {}) {
  const meta = getLogisticsEntityMeta(type);
  if (!meta || !id) return null;

  let query = supabase
    .from(meta.table)
    .select(getSelectFields(type))
    .eq("id", id);

  if (!includeInactive) {
    query = query.eq(meta.activeColumn, true);
  }

  const { data, error } = await query.maybeSingle();
  if (error) {
    console.error(`getLogisticsInventoryById(${meta.table}) error:`, error);
    return null;
  }

  return mapLogisticsRow(type, data);
}

async function getCurrentUserId() {
  const { session, error } = await getSessionSnapshot();
  if (error) {
    console.error("getCurrentUserId logistics error:", error);
    return null;
  }
  return session?.user?.id ?? null;
}

function buildPayload(type, payload, { includeUserId = false } = {}) {
  const meta = getLogisticsEntityMeta(type);
  if (!meta) return null;

  const body = {
    name: String(payload?.name ?? "").trim(),
    code: String(payload?.code ?? "").trim() || null,
    description: String(payload?.description ?? "").trim() || null,
    [meta.activeColumn]: payload?.active !== false
  };

  if (includeUserId) {
    body.user_id = payload?.user_id ?? null;
  }

  return body;
}

export async function createLogisticsInventory(type, payload) {
  const meta = getLogisticsEntityMeta(type);
  if (!meta) {
    return { ok: false, error: new Error("Tipo de inventario logistico invalido.") };
  }

  const userId = await getCurrentUserId();
  if (!userId) {
    return { ok: false, error: new Error("No se pudo identificar al usuario actual.") };
  }

  const body = buildPayload(type, { ...payload, user_id: userId }, { includeUserId: true });

  const { data, error } = await supabase
    .from(meta.table)
    .insert(body)
    .select("id")
    .single();

  if (error) {
    console.error(`createLogisticsInventory(${meta.table}) error:`, error);
    return { ok: false, error };
  }

  const full = await getLogisticsInventoryById(type, data.id, { includeInactive: true });
  return { ok: true, data: full };
}

export async function updateLogisticsInventoryById(type, id, changes) {
  const meta = getLogisticsEntityMeta(type);
  if (!meta) {
    return { ok: false, error: new Error("Tipo de inventario logistico invalido.") };
  }

  const body = buildPayload(type, changes);

  const { error } = await supabase
    .from(meta.table)
    .update(body)
    .eq("id", id);

  if (error) {
    console.error(`updateLogisticsInventoryById(${meta.table}) error:`, error);
    return { ok: false, error };
  }

  const full = await getLogisticsInventoryById(type, id, { includeInactive: true });
  return { ok: true, data: full };
}

export async function setLogisticsInventoryActive(type, id, active) {
  const meta = getLogisticsEntityMeta(type);
  if (!meta) {
    return { ok: false, error: new Error("Tipo de inventario logistico invalido.") };
  }

  const { error } = await supabase
    .from(meta.table)
    .update({ [meta.activeColumn]: Boolean(active) })
    .eq("id", id);

  if (error) {
    console.error(`setLogisticsInventoryActive(${meta.table}) error:`, error);
    return { ok: false, error };
  }

  const full = await getLogisticsInventoryById(type, id, { includeInactive: true });
  return { ok: true, data: full };
}
