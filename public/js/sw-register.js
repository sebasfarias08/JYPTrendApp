/* public/js/sw-register.js */
export function registerServiceWorker({ onUpdate } = {}) {
  if (!("serviceWorker" in navigator)) return;

  window.addEventListener("load", async () => {
    try {
      const reg = await navigator.serviceWorker.register("/sw.js");

      // Si hay un SW esperando, ya hay update listo
      if (reg.waiting && typeof onUpdate === "function") {
        onUpdate(reg);
      }

      reg.addEventListener("updatefound", () => {
        const newWorker = reg.installing;
        if (!newWorker) return;

        newWorker.addEventListener("statechange", () => {
          // Cuando termina de instalar y ya hay un SW controlando, significa update
          if (newWorker.state === "installed" && navigator.serviceWorker.controller) {
            if (typeof onUpdate === "function") onUpdate(reg);
          }
        });
      });

      // Cuando el nuevo SW toma control, refrescamos
      navigator.serviceWorker.addEventListener("controllerchange", () => {
        window.location.reload();
      });
    } catch (e) {
      console.warn("SW register failed:", e);
    }
  });
}

// Llamar cuando el usuario acepta actualizar
export function applyUpdate(reg) {
  if (!reg?.waiting) return;
  reg.waiting.postMessage({ type: "SKIP_WAITING" });
}