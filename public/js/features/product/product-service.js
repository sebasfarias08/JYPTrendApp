import { supabase } from "../../app/core/supabase-client.js";
import { getSessionSnapshot } from "../../app/auth/auth-service.js";

async function getCurrentUserId() {
  const { session, error } = await getSessionSnapshot();
  if (error) {
    console.error("getCurrentUserId product-service error:", error);
    return null;
  }
  return session?.user?.id ?? null;
}

function mapVariant(row) {
  if (!row) return null;
  return {
    id: row.id,
    product_id: row.product_id ?? null,
    sku: row.sku ?? "",
    barcode: row.barcode ?? "",
    variant_name: row.variant_name ?? "",
    image_path: row.image_path ?? "",
    sale_price: row.sale_price == null ? null : Number(row.sale_price),
    active: row.active !== false,
    created_at: row.created_at ?? null,
    updated_at: row.updated_at ?? null
  };
}

function mapProduct(row) {
  if (!row) return null;
  return {
    id: row.id,
    name: row.name ?? "",
    description: row.description ?? "",
    price: Number(row.price ?? 0),
    image_path: row.image_path ?? "",
    active: row.active !== false,
    category_id: row.category_id ?? row.categories?.id ?? null,
    categories: row.categories ?? null,
    product_variants: Array.isArray(row.product_variants)
      ? row.product_variants.map(mapVariant).filter(Boolean)
      : [],
    created_at: row.created_at ?? null
  };
}

function mapVariantDetail(row) {
  if (!row) return null;

  const product = row.products ?? {};

  const images = Array.isArray(row.product_variant_images)
    ? [...row.product_variant_images].sort((a, b) => {
        if (a.is_primary !== b.is_primary) {
          return a.is_primary ? -1 : 1;
        }
        return Number(a.sort_order ?? 0) - Number(b.sort_order ?? 0);
      })
    : [];

  const thumbnail = images.find(
    (img) => img.image_type === "thumbnail"
  );

  const galleryImages = images
    .filter((img) => img.image_type === "gallery")
    .sort((a, b) => Number(a.sort_order ?? 0) - Number(b.sort_order ?? 0));

  return {
    id: product.id ?? row.product_id ?? null,
    product_id: row.product_id ?? product.id ?? null,
    variant_id: row.id,
    sku: row.sku ?? "",
    name:
      String(row.variant_name ?? "").trim() ||
      String(product.name ?? "").trim(),
    product_name: product.name ?? "",
    variant_name: row.variant_name ?? "",
    description: product.description ?? "",
    price: Number(row.sale_price ?? product.price ?? 0),
    base_price: Number(product.price ?? 0),

    thumbnail_path: thumbnail?.image_path ?? "",

    front_image_path:
      galleryImages.find((img) => Number(img.sort_order) === 1)?.image_path ??
      galleryImages[0]?.image_path ??
      thumbnail?.image_path ??
      "",

    gallery_images: galleryImages.map((img) => ({
      path: img.image_path,
      order: Number(img.sort_order ?? 0)
    })),

    active: row.active !== false && product.active !== false,
    category_id: product.category_id ?? null,
    categories: product.categories ?? null,
    created_at: row.created_at ?? null,
    updated_at: row.updated_at ?? null
  };
}

export async function getProductById(id, { includeInactive = false } = {}) {
  let query = supabase
    .from("products")
    .select(`
      id,
      name,
      description,
      price,
      image_path,
      active,
      category_id,
      created_at,
      categories (
        id,
        name,
        slug
      ),
      product_variants (
        id,
        product_id,
        sku,
        barcode,
        variant_name,
        image_path,
        sale_price,
        active,
        created_at,
        updated_at
      )
    `)
    .eq("id", id);

  if (!includeInactive) {
    query = query.eq("active", true);
  }

  const { data, error } = await query.maybeSingle();
  if (error) {
    console.error("getProductById error:", error);
    return null;
  }
  return mapProduct(data);
}

export async function getProductVariantById(id, { includeInactive = false } = {}) {
  let query = supabase
    .from("product_variants")
    .select(`
      id,
      product_id,
      sku,
      barcode,
      variant_name,
      image_path,
      sale_price,
      active,
      created_at,
      updated_at,
      product_variant_images (
        id,
        image_path,
        image_type,
        is_primary,
        sort_order
      ),
      products!inner (
        id,
        name,
        description,
        price,
        image_path,
        active,
        category_id,
        categories (
          id,
          name,
          slug
        )
      )
    `)
    .eq("id", id);

  if (!includeInactive) {
    query = query.eq("active", true).eq("products.active", true);
  }

  const { data, error } = await query.maybeSingle();
  if (error) {
    console.error("getProductVariantById error:", error);
    return null;
  }

  return mapVariantDetail(data);
}

export async function getProductsForAdmin({ includeInactive = true, search = "" } = {}) {
  let query = supabase
    .from("products")
    .select(`
      id,
      name,
      description,
      price,
      image_path,
      active,
      category_id,
      created_at,
      categories (
        id,
        name,
        slug
      ),
      product_variants (
        id,
        product_id,
        sku,
        barcode,
        variant_name,
        image_path,
        sale_price,
        active,
        created_at,
        updated_at
      )
    `)
    .order("created_at", { ascending: false });

  if (!includeInactive) {
    query = query.eq("active", true);
  }

  const q = String(search || "").trim();
  if (q) {
    query = query.ilike("name", `%${q}%`);
  }

  const { data, error } = await query;
  if (error) {
    console.error("getProductsForAdmin error:", error);
    return [];
  }

  return (data ?? []).map(mapProduct);
}

export async function getProductCategories() {
  const { data, error } = await supabase
    .from("categories")
    .select("id, name, slug")
    .order("name", { ascending: true });

  if (error) {
    console.error("getProductCategories error:", error);
    return [];
  }

  return data ?? [];
}

export async function createProduct(payload) {
  const body = {
    name: String(payload?.name ?? "").trim(),
    description: String(payload?.description ?? "").trim() || null,
    price: Number(payload?.price ?? 0),
    image_path: String(payload?.image_path ?? "").trim() || null,
    category_id: payload?.category_id || null,
    active: true
  };

  const { data, error } = await supabase
    .from("products")
    .insert(body)
    .select("id")
    .single();

  if (error) {
    console.error("createProduct error:", error);
    return { ok: false, error };
  }

  const full = await getProductById(data.id, { includeInactive: true });
  return { ok: true, data: full };
}

export async function updateProductById(id, changes) {
  const { error } = await supabase
    .from("products")
    .update(changes)
    .eq("id", id);

  if (error) {
    console.error("updateProductById error:", error);
    return { ok: false, error };
  }

  const updated = await getProductById(id, { includeInactive: true });
  return { ok: true, data: updated };
}

export async function setProductActive(id, active) {
  const { error } = await supabase
    .from("products")
    .update({ active: Boolean(active) })
    .eq("id", id);

  if (error) {
    console.error("setProductActive error:", error);
    return { ok: false, error };
  }

  const updated = await getProductById(id, { includeInactive: true });
  return { ok: true, data: updated };
}

export async function upsertVariants(productId, variants = []) {
  const userId = await getCurrentUserId();
  if (!userId) {
    return { ok: false, error: new Error("No se pudo identificar al usuario actual para guardar variantes.") };
  }

  const clean = (Array.isArray(variants) ? variants : [])
    .map((v) => ({
      id: v?.id || null,
      product_id: productId,
      variant_name: String(v?.variant_name ?? "").trim(),
      sku: String(v?.sku ?? "").trim() || null,
      barcode: String(v?.barcode ?? "").trim() || null,
      image_path: String(v?.image_path ?? "").trim() || null,
      sale_price: v?.sale_price == null || v?.sale_price === "" ? 0 : Number(v.sale_price),
      active: v?.active !== false
    }))
    .filter((v) => v.variant_name);

  const submittedIds = clean.map((v) => v.id).filter(Boolean);

  const { data: existing, error: existingError } = await supabase
    .from("product_variants")
    .select("id")
    .eq("product_id", productId);

  if (existingError) {
    console.error("upsertVariants existing error:", existingError);
    return { ok: false, error: existingError };
  }

  const toDeactivate = (existing ?? [])
    .map((v) => v.id)
    .filter((id) => !submittedIds.includes(id));

  if (toDeactivate.length) {
    const { error: deactivateError } = await supabase
      .from("product_variants")
      .update({ active: false })
      .in("id", toDeactivate);

    if (deactivateError) {
      console.error("upsertVariants deactivate error:", deactivateError);
      return { ok: false, error: deactivateError };
    }
  }

  const toInsert = clean
    .filter((v) => !v.id)
    .map((v) => ({
      product_id: v.product_id,
      user_id: userId,
      variant_name: v.variant_name,
      sku: v.sku,
      barcode: v.barcode,
      image_path: v.image_path,
      sale_price: v.sale_price,
      active: v.active
    }));

  if (toInsert.length) {
    const { error: insertError } = await supabase
      .from("product_variants")
      .insert(toInsert);

    if (insertError) {
      console.error("upsertVariants insert error:", insertError);
      return { ok: false, error: insertError };
    }
  }

  const toUpdate = clean.filter((v) => v.id);
  for (const row of toUpdate) {
    const { error: updateError } = await supabase
      .from("product_variants")
      .update({
        variant_name: row.variant_name,
        sku: row.sku,
        barcode: row.barcode,
        image_path: row.image_path,
        sale_price: row.sale_price,
        active: row.active
      })
      .eq("id", row.id)
      .eq("product_id", productId);

    if (updateError) {
      console.error("upsertVariants update error:", updateError);
      return { ok: false, error: updateError };
    }
  }

  return { ok: true };
}
