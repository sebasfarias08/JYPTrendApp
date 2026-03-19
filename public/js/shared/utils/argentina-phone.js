const ARGENTINA_MOBILE_PREFIX = "549";
const ARGENTINA_COUNTRY_CODE = "54";
const BUENOS_AIRES_AREA_CODE = "11";
const NATIONAL_MOBILE_DIGITS = 10;

function digitsOnly(value) {
  return String(value ?? "").replace(/\D/g, "");
}

function extractDraftNationalDigits(value) {
  let digits = digitsOnly(value);
  if (!digits) return "";

  if (digits.startsWith(ARGENTINA_MOBILE_PREFIX)) {
    digits = digits.slice(ARGENTINA_MOBILE_PREFIX.length);
  } else if (digits.startsWith(ARGENTINA_COUNTRY_CODE)) {
    digits = digits.slice(ARGENTINA_COUNTRY_CODE.length);
    if (digits.startsWith("9")) digits = digits.slice(1);
  } else if (digits.startsWith("9") && digits.length === NATIONAL_MOBILE_DIGITS + 1) {
    digits = digits.slice(1);
  }

  return digits.slice(0, NATIONAL_MOBILE_DIGITS);
}

function formatNationalDigits(digits) {
  if (!digits) return "";

  if (digits.startsWith(BUENOS_AIRES_AREA_CODE)) {
    if (digits.length <= 2) return digits;
    if (digits.length <= 6) return `${digits.slice(0, 2)} ${digits.slice(2)}`;
    return `${digits.slice(0, 2)} ${digits.slice(2, 6)} ${digits.slice(6, 10)}`;
  }

  if (digits.length <= 3) return digits;
  if (digits.length <= 6) return `${digits.slice(0, 3)} ${digits.slice(3)}`;
  return `${digits.slice(0, 3)} ${digits.slice(3, 6)} ${digits.slice(6, 10)}`;
}

export function formatArgentinaPhoneForInput(value) {
  return formatNationalDigits(extractDraftNationalDigits(value));
}

export function normalizeArgentinaWhatsAppPhone(value) {
  const normalizedDigits = extractDraftNationalDigits(value);
  if (!normalizedDigits) {
    return { ok: true, value: "", national: "" };
  }

  if (!/^\d{10}$/.test(normalizedDigits)) {
    return {
      ok: false,
      value: "",
      national: normalizedDigits,
      error: "Telefono invalido. Ingresa un celular argentino, por ejemplo: 11 6054 0410."
    };
  }

  return {
    ok: true,
    value: `${ARGENTINA_MOBILE_PREFIX}${normalizedDigits}`,
    national: normalizedDigits
  };
}

export function sanitizeArgentinaPhoneInput(value) {
  return String(value ?? "").replace(/[^\d\s-]/g, "");
}
