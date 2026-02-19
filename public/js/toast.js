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
  if (type === "success") return "alert alert-success";
  if (type === "error") return "alert alert-danger";
  if (type === "warning") return "alert alert-warning";
  return "alert alert-info";
}

export function showToast(message, { type = "info", duration = 2200 } = {}) {
  if (!message) return;

  const root = ensureContainer();
  const toast = document.createElement("div");
  toast.className = `pointer-events-auto text-sm shadow-md ${toneClass(type)}`;
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
