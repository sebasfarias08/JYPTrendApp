/* public/js/share.js */

function canShareFiles() {
  return !!(navigator.share && navigator.canShare);
}

export async function shareProduct({ title, text, url, imageUrl }) {
  // Preferimos siempre incluir url (para ventas es lo más robusto)
  const shareData = { title, text, url };

  // Intento 1: Share con archivo (si hay imageUrl y el dispositivo soporta)
  if (imageUrl && canShareFiles()) {
    try {
      const resp = await fetch(imageUrl, { cache: "no-store" });
      const blob = await resp.blob();
      const fileExt = (blob.type === "image/png") ? "png" : "jpg";
      const file = new File([blob], `producto.${fileExt}`, { type: blob.type });

      const dataWithFile = { ...shareData, files: [file] };

      // Algunos navegadores requieren canShare con files
      if (navigator.canShare(dataWithFile)) {
        await navigator.share(dataWithFile);
        return { ok: true, mode: "share_files" };
      }
    } catch (e) {
      // seguimos con share normal
      console.warn("Share with file failed, falling back:", e);
    }
  }

  // Intento 2: Share normal (link+texto)
  if (navigator.share) {
    try {
      await navigator.share(shareData);
      return { ok: true, mode: "share_link" };
    } catch (e) {
      // usuario canceló o no se pudo
      console.warn("Share failed:", e);
    }
  }

  // Fallback 1: copiar link
  const copied = await copyToClipboard(url);
  if (copied) return { ok: true, mode: "copy_link" };

  // Fallback 2: abrir whatsapp web share (solo link) (opcional)
  // Nota: Instagram no tiene un deep link universal para “compartir” desde web sin selector
  try {
    window.open(`https://wa.me/?text=${encodeURIComponent(`${text || ""} ${url}`)}`, "_blank");
    return { ok: true, mode: "wa_fallback" };
  } catch {
    return { ok: false, mode: "none" };
  }
}

export async function copyToClipboard(str) {
  try {
    await navigator.clipboard.writeText(str);
    return true;
  } catch {
    // fallback viejo
    try {
      const ta = document.createElement("textarea");
      ta.value = str;
      ta.style.position = "fixed";
      ta.style.top = "-1000px";
      document.body.appendChild(ta);
      ta.focus();
      ta.select();
      const ok = document.execCommand("copy");
      document.body.removeChild(ta);
      return ok;
    } catch {
      return false;
    }
  }
}

export function downloadImage(imageUrl, filename = "producto.jpg") {
  const a = document.createElement("a");
  a.href = imageUrl;
  a.download = filename;
  a.rel = "noopener";
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
}