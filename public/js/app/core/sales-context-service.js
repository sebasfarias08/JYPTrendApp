import { supabase } from "./supabase-client.js";
import { getSessionSnapshot, logSupabaseError } from "../auth/auth-service.js";

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

async function fetchResolvedSalesContext(userId) {
  const normalizedUserId = normalizeId(userId);
  if (!normalizedUserId) return null;

  const { data, error } = await supabase.rpc("get_sales_context_resolved", {
    p_user_id: normalizedUserId
  });

  if (error) {
    const { session } = await getSessionSnapshot();
    logSupabaseError({
      source: "sales-context-service",
      action: "fetchResolvedSalesContext",
      error,
      session,
      extra: {
        userId: normalizedUserId,
        rpc: "get_sales_context_resolved"
      }
    });
    return null;
  }

  if (Array.isArray(data)) {
    return data[0] ?? null;
  }

  return data ?? null;
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

function normalizeResolvedContextRow(row, fallbackUserId = null) {
  return buildResolvedContext({
    userId: normalizeId(row?.user_id) ?? normalizeId(fallbackUserId),
    warehouseId: normalizeId(row?.warehouse_id),
    pointOfSaleId: normalizeId(row?.point_of_sale_id),
    warehouseSource: row?.warehouse_source ?? null,
    pointOfSaleSource: row?.point_of_sale_source ?? null
  });
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

  const resolvedContextRow = await fetchResolvedSalesContext(resolvedUserId);
  cachedContext = normalizeResolvedContextRow(resolvedContextRow, resolvedUserId);
  cachedContextUserId = resolvedUserId;

  return cachedContext;
}

export async function requireSalesContext(options = null) {
  const context = await getSalesContext(options);
  if (context?.is_valid) return context;

  throw context?.error || buildSalesContextError();
}

export { SALES_CONTEXT_ERROR_CODE };
