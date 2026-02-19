/* public/js/sw-register.js */
export function registerServiceWorker({ onUpdate } = {}) {
  if (!("serviceWorker" in navigator)) return;

  window.addEventListener("load", async () => {
    try {
      const reg = await navigator.serviceWorker.register("/sw.js");
      await reg.update().catch(() => {});

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

      // Re-chequea updates al volver a la app (util en Android)
      document.addEventListener("visibilitychange", async () => {
        if (document.visibilityState !== "visible") return;
        await reg.update().catch(() => {});
        if (reg.waiting && typeof onUpdate === "function") onUpdate(reg);
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

export async function requestSwVersion() {
  if (!("serviceWorker" in navigator)) return null;

  const reg = await navigator.serviceWorker.getRegistration();
  const worker = reg?.active || reg?.waiting || reg?.installing;
  if (!worker) return null;

  return await new Promise((resolve) => {
    const channel = new MessageChannel();
    const timeout = setTimeout(() => resolve(null), 1200);

    channel.port1.onmessage = (event) => {
      clearTimeout(timeout);
      resolve(event.data?.version ?? null);
    };

    worker.postMessage({ type: "GET_VERSION" }, [channel.port2]);
  });
}
