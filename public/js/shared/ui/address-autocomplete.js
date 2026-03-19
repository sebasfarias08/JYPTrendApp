import { getPublicRuntimeConfig } from "../utils/runtime-config.js";

const GOOGLE_MAPS_SCRIPT_ID = "google-maps-places-script";
let googleMapsLoadPromise = null;

function escapeHtml(str) {
  return String(str ?? "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

function readLatLng(place) {
  const location = place?.geometry?.location;
  if (!location) return { lat: null, lng: null };

  const lat = typeof location.lat === "function" ? location.lat() : Number(location.lat ?? NaN);
  const lng = typeof location.lng === "function" ? location.lng() : Number(location.lng ?? NaN);

  return {
    lat: Number.isFinite(lat) ? lat : null,
    lng: Number.isFinite(lng) ? lng : null
  };
}

function buildAddressState(nextState = {}) {
  // Supabase/UI callers may pass null during transitions; normalize first.
  const safeState = nextState ?? {};
  return {
    address_input: String(safeState?.address_input ?? "").trim(),
    address_formatted: String(safeState?.address_formatted ?? "").trim(),
    address_notes: String(safeState?.address_notes ?? "").trim(),
    address_place_id: String(safeState?.address_place_id ?? "").trim(),
    address_lat: Number.isFinite(Number(safeState?.address_lat)) ? Number(safeState.address_lat) : null,
    address_lng: Number.isFinite(Number(safeState?.address_lng)) ? Number(safeState.address_lng) : null
  };
}

function buildMapsUrl(lat, lng) {
  if (!Number.isFinite(Number(lat)) || !Number.isFinite(Number(lng))) return "";
  return `https://www.google.com/maps/search/?api=1&query=${Number(lat)},${Number(lng)}`;
}

async function loadGoogleMapsPlaces() {
  const { googleMapsApiKey } = getPublicRuntimeConfig();
  if (!googleMapsApiKey) {
    throw new Error("Falta configurar GOOGLE_MAPS_API_KEY para usar autocomplete de direcciones.");
  }

  if (window.google?.maps?.places) return window.google;
  if (googleMapsLoadPromise) return googleMapsLoadPromise;

  googleMapsLoadPromise = new Promise((resolve, reject) => {
    const existing = document.getElementById(GOOGLE_MAPS_SCRIPT_ID);
    if (existing) {
      existing.addEventListener("load", () => resolve(window.google), { once: true });
      existing.addEventListener("error", () => reject(new Error("No se pudo cargar Google Maps.")), { once: true });
      return;
    }

    const script = document.createElement("script");
    script.id = GOOGLE_MAPS_SCRIPT_ID;
    script.async = true;
    script.defer = true;
    script.src = `https://maps.googleapis.com/maps/api/js?key=${encodeURIComponent(googleMapsApiKey)}&libraries=places&v=weekly`;
    script.addEventListener("load", () => resolve(window.google), { once: true });
    script.addEventListener("error", () => reject(new Error("No se pudo cargar Google Maps.")), { once: true });
    document.head.append(script);
  });

  return googleMapsLoadPromise;
}

export function createAddressAutocomplete({
  input,
  notesInput = null,
  mapsButton = null,
  summary = null,
  status = null,
  initialValue = null,
  onChange = () => {}
} = {}) {
  const addressInput = typeof input === "string" ? document.getElementById(input) : input;
  const addressNotesInput = typeof notesInput === "string" ? document.getElementById(notesInput) : notesInput;
  const mapsButtonEl = typeof mapsButton === "string" ? document.getElementById(mapsButton) : mapsButton;
  const summaryEl = typeof summary === "string" ? document.getElementById(summary) : summary;
  const statusEl = typeof status === "string" ? document.getElementById(status) : status;

  if (!addressInput) {
    throw new Error("createAddressAutocomplete: input no encontrado.");
  }

  let currentState = buildAddressState(initialValue ?? {});
  let lastTypedValue = currentState.address_input || currentState.address_formatted || "";
  let autocomplete = null;
  let placeListener = null;

  function renderStatus(message = "", tone = "muted") {
    if (!statusEl) return;
    statusEl.textContent = message;
    statusEl.className = `mt-1 text-xs ${tone === "warning" ? "text-warning" : "text-subtle"}`;
  }

  function renderSummary() {
    if (!summaryEl) return;

    const formatted = currentState.address_formatted || currentState.address_input;
    const notes = currentState.address_notes;
    if (!formatted && !notes) {
      summaryEl.innerHTML = "";
      summaryEl.classList.add("hidden");
      return;
    }

    summaryEl.classList.remove("hidden");
    summaryEl.innerHTML = `
      ${formatted ? `<div class="font-medium text-[13px] text-[var(--text)] break-words">${escapeHtml(formatted)}</div>` : ""}
      ${notes ? `<div class="mt-1 text-xs text-subtle break-words">${escapeHtml(notes)}</div>` : ""}
    `;
  }

  function updateMapsButton() {
    if (!mapsButtonEl) return;
    const hasCoords = Number.isFinite(currentState.address_lat) && Number.isFinite(currentState.address_lng);
    mapsButtonEl.disabled = !hasCoords;
    mapsButtonEl.classList.toggle("opacity-60", !hasCoords);
    mapsButtonEl.classList.toggle("cursor-not-allowed", !hasCoords);
  }

  function syncInputValues() {
    addressInput.value = currentState.address_formatted || currentState.address_input || "";
    if (addressNotesInput) {
      addressNotesInput.value = currentState.address_notes || "";
    }
    renderSummary();
    updateMapsButton();
  }

  function emitChange() {
    renderSummary();
    updateMapsButton();
    onChange({ ...currentState });
  }

  function setState(nextState = {}, { syncInputs = true } = {}) {
    const safeNextState = nextState ?? {};
    currentState = buildAddressState({
      ...currentState,
      ...safeNextState
    });
    if (syncInputs) syncInputValues();
    emitChange();
  }

  function clearSelectedPlace() {
    setState({
      address_input: addressInput.value,
      address_formatted: "",
      address_place_id: "",
      address_lat: null,
      address_lng: null
    }, { syncInputs: false });
  }

  function handleInput() {
    addressInput.value = String(addressInput.value ?? "").replace(/[<>]/g, "");
    lastTypedValue = addressInput.value;

    const currentVisibleValue = String(currentState.address_input || currentState.address_formatted || "");
    if (currentVisibleValue && currentVisibleValue !== addressInput.value) {
      clearSelectedPlace();
    } else {
      setState({ address_input: addressInput.value }, { syncInputs: false });
    }
  }

  function handleNotesInput() {
    setState({ address_notes: addressNotesInput?.value ?? "" }, { syncInputs: false });
  }

  function openInMaps() {
    const url = buildMapsUrl(currentState.address_lat, currentState.address_lng);
    if (!url) return;
    window.open(url, "_blank", "noopener,noreferrer");
  }

  async function enableGoogleAutocomplete() {
    try {
      const google = await loadGoogleMapsPlaces();
      autocomplete = new google.maps.places.Autocomplete(addressInput, {
        fields: ["formatted_address", "place_id", "geometry"],
        componentRestrictions: { country: "ar" },
        types: ["address"]
      });

      placeListener = autocomplete.addListener("place_changed", () => {
        const place = autocomplete.getPlace();
        const { lat, lng } = readLatLng(place);
        setState({
          address_input: lastTypedValue || addressInput.value,
          address_formatted: String(place?.formatted_address ?? addressInput.value ?? "").trim(),
          address_place_id: String(place?.place_id ?? "").trim(),
          address_lat: lat,
          address_lng: lng
        });
        renderStatus("Direccion validada con Maps.", "muted");
      });

      renderStatus("Autocomplete activo para direcciones de Argentina.", "muted");
    } catch (error) {
      console.warn("Address autocomplete unavailable:", error);
      renderStatus("Autocomplete no disponible. Puedes cargar la direccion manualmente.", "warning");
    }
  }

  addressInput.addEventListener("input", handleInput);
  addressNotesInput?.addEventListener("input", handleNotesInput);
  mapsButtonEl?.addEventListener("click", openInMaps);

  syncInputValues();
  if (addressInput.readOnly) {
    renderStatus(currentState.address_formatted ? "Direccion guardada." : "", "muted");
  } else {
    enableGoogleAutocomplete();
  }

  return {
    getValue: () => ({ ...currentState }),
    setValue: (value = {}) => {
      const safeValue = value ?? {};
      lastTypedValue = String(safeValue?.address_input || safeValue?.address_formatted || "").trim();
      setState(safeValue);
    },
    destroy: () => {
      addressInput.removeEventListener("input", handleInput);
      addressNotesInput?.removeEventListener("input", handleNotesInput);
      mapsButtonEl?.removeEventListener("click", openInMaps);
      if (placeListener?.remove) placeListener.remove();
    }
  };
}
