// public/js/toast.js
let container = null;

function ensureContainer() {
  if (container) return container;

  container = document.createElement("div");
  container.id = "appToastContainer";
  container.className = "fixed top-16 right-3 left-3 z-[60] pointer-events-none space-y-2";
  document.body.appendChild(container);
  return container;
}

function toneClass(type) {
  if (type === "success") return "border-emerald-500/40 bg-emerald-500/15 text-emerald-100";
  if (type === "error") return "border-red-500/40 bg-red-500/15 text-red-100";
  if (type === "warning") return "border-amber-500/40 bg-amber-500/15 text-amber-100";
  return "border-slate-600 bg-slate-900/95 text-slate-100";
}

export function showToast(message, { type = "info", duration = 2200 } = {}) {
  if (!message) return;

  const root = ensureContainer();
  const toast = document.createElement("div");
  toast.className = `pointer-events-auto rounded-xl border px-3 py-2 text-sm shadow-lg backdrop-blur ${toneClass(type)}`;
  toast.textContent = String(message);
  root.appendChild(toast);

  const close = () => {
    toast.classList.add("opacity-0", "transition");
    setTimeout(() => toast.remove(), 140);
  };

  if (duration > 0) {
    setTimeout(close, duration);
  }

  return { close, el: toast };
}
