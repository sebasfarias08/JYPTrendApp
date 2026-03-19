function readMetaContent(name) {
  const el = document.querySelector(`meta[name="${name}"]`);
  return String(el?.getAttribute("content") ?? "").trim();
}

export function getPublicRuntimeConfig() {
  const globalConfig = window.__APP_CONFIG && typeof window.__APP_CONFIG === "object"
    ? window.__APP_CONFIG
    : {};

  return {
    googleMapsApiKey: String(
      globalConfig.GOOGLE_MAPS_API_KEY ||
      readMetaContent("google-maps-api-key") ||
      ""
    ).trim()
  };
}
