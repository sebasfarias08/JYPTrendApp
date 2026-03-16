import { supabase } from "../lib/supabase-client.js";
import { getSessionSnapshot, logSupabaseError } from "./auth-service.js";

const SALES_CONTEXT_ERROR_CODE = "SALES_CONTEXT_UNRESOLVED";
let cachedContext = null;
let cachedContextUserId = null;

async function getCurrentUserId() {
  const { session, error } = await getSessionSnapshot();
  if (error) {
    logSupabaseError({ source: "sales-context-service", action: "getCurrentUserId", error, session });
    return null;
  }

  return session?.user?.id ?? null;
}

function normalizeId(value) {
  const id = String(value ?? "").trim();
  return id || null;
}

function buildSalesContextError(message) {
  const error = new Error(
    message || "No se pudo resolver un deposito y punto de venta validos para cargar el catalogo."
  );
  error.code = SALES_CONTEXT_ERROR_CODE;
  return error;
}

async function fetchProfileDefaults(userId) {
  const normalizedUserId = normalizeId(userId);
  if (!normalizedUserId) return null;

  const { data, error } = await supabase
    .from("profiles")
    .select("id, default_warehouse_id, default_point_of_sale_id")
    .eq("id", normalizedUserId)
    .maybeSingle();

  if (error) {
    const { session } = await getSessionSnapshot();
    logSupabaseError({ source: "sales-context-service", action: "fetchProfileDefaults", table: "profiles", error, session, extra: { userId: normalizedUserId } });
    return null;
  }

  return data ?? null;
}

async function getReadableWarehouseById(warehouseId) {
  const normalizedWarehouseId = normalizeId(warehouseId);
  if (!normalizedWarehouseId) return null;

  const { data, error } = await supabase
    .from("warehouses")
    .select("id, is_active")
    .eq("id", normalizedWarehouseId)
    .maybeSingle();

  if (error) {
    const { session } = await getSessionSnapshot();
    logSupabaseError({ source: "sales-context-service", action: "getReadableWarehouseById", table: "warehouses", error, session, extra: { warehouseId: normalizedWarehouseId } });
    return null;
  }

  if (!data?.id || data.is_active !== true) return null;
  return data.id;
}

async function getReadablePointOfSaleById(pointOfSaleId) {
  const normalizedPointOfSaleId = normalizeId(pointOfSaleId);
  if (!normalizedPointOfSaleId) return null;

  const { data, error } = await supabase
    .from("points_of_sale")
    .select("id, active")
    .eq("id", normalizedPointOfSaleId)
    .maybeSingle();

  if (error) {
    const { session } = await getSessionSnapshot();
    logSupabaseError({ source: "sales-context-service", action: "getReadablePointOfSaleById", table: "points_of_sale", error, session, extra: { pointOfSaleId: normalizedPointOfSaleId } });
    return null;
  }

  if (!data?.id || data.active !== true) return null;
  return data.id;
}

async function getFallbackWarehouseId() {
  const { data, error } = await supabase
    .from("warehouses")
    .select("id")
    .eq("is_active", true)
    .order("created_at", { ascending: true })
    .limit(1)
    .maybeSingle();

  if (error) {
    const { session } = await getSessionSnapshot();
    logSupabaseError({ source: "sales-context-service", action: "getFallbackWarehouseId", table: "warehouses", error, session });
    return null;
  }

  return data?.id ?? null;
}

async function getFallbackPointOfSaleId() {
  const { data, error } = await supabase
    .from("points_of_sale")
    .select("id")
    .eq("active", true)
    .order("created_at", { ascending: true })
    .limit(1)
    .maybeSingle();

  if (error) {
    const { session } = await getSessionSnapshot();
    logSupabaseError({ source: "sales-context-service", action: "getFallbackPointOfSaleId", table: "points_of_sale", error, session });
    return null;
  }

  return data?.id ?? null;
}

function buildResolvedContext({ userId, warehouseId, pointOfSaleId, warehouseSource, pointOfSaleSource }) {
  const isValid = Boolean(warehouseId && pointOfSaleId);
  return {
    user_id: userId ?? null,
    warehouse_id: warehouseId ?? null,
    point_of_sale_id: pointOfSaleId ?? null,
    warehouse_source: warehouseSource ?? null,
    point_of_sale_source: pointOfSaleSource ?? null,
    is_valid: isValid,
    error: isValid
      ? null
      : buildSalesContextError(
          "No se pudo resolver un contexto de venta valido. Configura deposito y punto de venta por defecto en tu perfil o habilita registros compartidos activos."
        )
  };
}

export function clearSalesContextCache() {
  cachedContext = null;
  cachedContextUserId = null;
}

export async function getSalesContext(options = null) {
  const normalizedOptions = options && typeof options === "object"
    ? options
    : { userId: options ?? null };
  const resolvedUserId = normalizeId(normalizedOptions.userId) || await getCurrentUserId();
  const providedProfile = normalizedOptions.profile ?? null;
  const forceReload = normalizedOptions.forceReload === true;

  if (!resolvedUserId) {
    return buildResolvedContext({
      userId: null,
      warehouseId: null,
      pointOfSaleId: null,
      warehouseSource: null,
      pointOfSaleSource: null
    });
  }

  if (!forceReload && cachedContext && cachedContextUserId === resolvedUserId) {
    return cachedContext;
  }

  const profile = providedProfile ?? await fetchProfileDefaults(resolvedUserId);
  const defaultWarehouseId = normalizeId(profile?.default_warehouse_id);
  const defaultPointOfSaleId = normalizeId(profile?.default_point_of_sale_id);

  const [validatedDefaultWarehouseId, validatedDefaultPointOfSaleId] = await Promise.all([
    getReadableWarehouseById(defaultWarehouseId),
    getReadablePointOfSaleById(defaultPointOfSaleId)
  ]);

  let warehouseId = validatedDefaultWarehouseId;
  let warehouseSource = validatedDefaultWarehouseId ? "profile.default_warehouse_id" : null;
  let pointOfSaleId = validatedDefaultPointOfSaleId;
  let pointOfSaleSource = validatedDefaultPointOfSaleId ? "profile.default_point_of_sale_id" : null;

  if (!warehouseId) {
    warehouseId = await getFallbackWarehouseId();
    warehouseSource = warehouseId ? "shared_active_warehouse" : null;
  }

  if (!pointOfSaleId) {
    pointOfSaleId = await getFallbackPointOfSaleId();
    pointOfSaleSource = pointOfSaleId ? "shared_active_point_of_sale" : null;
  }

  cachedContext = buildResolvedContext({
    userId: resolvedUserId,
    warehouseId,
    pointOfSaleId,
    warehouseSource,
    pointOfSaleSource
  });
  cachedContextUserId = resolvedUserId;

  return cachedContext;
}

export async function requireSalesContext(options = null) {
  const context = await getSalesContext(options);
  if (context?.is_valid) return context;

  throw context?.error || buildSalesContextError();
}

export { SALES_CONTEXT_ERROR_CODE };
