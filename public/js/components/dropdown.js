export function createDropdown({
  containerId,
  options = [],
  selected = null,
  onChange = () => {},
  labelPrefix = ""
} = {}) {
  const host = typeof containerId === "string"
    ? document.getElementById(containerId)
    : containerId;

  if (!host) {
    throw new Error(`createDropdown: container not found (${containerId})`);
  }

  const normalizedOptions = Array.isArray(options)
    ? options
      .map((opt) => ({
        value: String(opt?.value ?? "").trim(),
        label: String(opt?.label ?? opt?.value ?? "").trim()
      }))
      .filter((opt) => opt.value)
    : [];

  if (!normalizedOptions.length) {
    host.innerHTML = "";
    return {
      getValue: () => "",
      setValue: () => {},
      destroy: () => {}
    };
  }

  let currentValue = String(selected ?? "").trim();
  if (!normalizedOptions.some((opt) => opt.value === currentValue)) {
    currentValue = normalizedOptions[0].value;
  }

  host.innerHTML = `
    <div class="relative w-full">
      <button
        type="button"
        class="w-full h-12 rounded-xl px-3 bg-white border border-slate-200 shadow-sm text-sm text-slate-800 flex items-center justify-between gap-2 focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-500"
        aria-haspopup="listbox"
        aria-expanded="false"
      >
        <span class="truncate" data-dd-label></span>
        <svg viewBox="0 0 24 24" class="w-4 h-4 shrink-0 text-slate-500 transition-transform duration-150" fill="none" stroke="currentColor" stroke-width="1.8" aria-hidden="true">
          <path d="M6 9l6 6 6-6"></path>
        </svg>
      </button>

      <div
        class="absolute left-0 right-0 top-full mt-2 z-40 rounded-xl border border-slate-200 bg-white shadow-lg max-h-56 overflow-auto transition duration-150 ease-out opacity-0 -translate-y-1 pointer-events-none"
        role="listbox"
        tabindex="-1"
        data-dd-menu
      ></div>
    </div>
  `;

  const root = host.firstElementChild;
  const trigger = root.querySelector("button");
  const labelEl = root.querySelector("[data-dd-label]");
  const menuEl = root.querySelector("[data-dd-menu]");
  const chevron = trigger.querySelector("svg");

  let open = false;

  function escapeHtml(str) {
    return String(str ?? "")
      .replaceAll("&", "&amp;")
      .replaceAll("<", "&lt;")
      .replaceAll(">", "&gt;")
      .replaceAll('"', "&quot;")
      .replaceAll("'", "&#039;");
  }

  function getOptionByValue(value) {
    return normalizedOptions.find((opt) => opt.value === value) ?? normalizedOptions[0];
  }

  function buildLabel(value) {
    const option = getOptionByValue(value);
    return labelPrefix ? `${labelPrefix}: ${option.label}` : option.label;
  }

  function renderOptions() {
    menuEl.innerHTML = normalizedOptions.map((opt) => {
      const active = opt.value === currentValue;
      return `
        <button
          type="button"
          class="w-full text-left px-3 py-2.5 text-sm transition-colors ${active ? "bg-gray-100 text-slate-900 font-medium" : "text-slate-700 hover:bg-gray-100"}"
          role="option"
          aria-selected="${active ? "true" : "false"}"
          data-dd-value="${escapeHtml(opt.value)}"
        >${escapeHtml(opt.label)}</button>
      `;
    }).join("");
  }

  function setOpen(nextOpen) {
    open = Boolean(nextOpen);
    trigger.setAttribute("aria-expanded", open ? "true" : "false");

    menuEl.classList.toggle("opacity-0", !open);
    menuEl.classList.toggle("-translate-y-1", !open);
    menuEl.classList.toggle("pointer-events-none", !open);

    chevron.classList.toggle("rotate-180", open);
  }

  function setValue(nextValue, emit = true) {
    const safe = getOptionByValue(String(nextValue ?? "")).value;
    const changed = safe !== currentValue;

    currentValue = safe;
    labelEl.textContent = buildLabel(currentValue);
    renderOptions();

    if (changed && emit) {
      onChange(currentValue);
    }
  }

  function onMenuClick(event) {
    const btn = event.target.closest("[data-dd-value]");
    if (!btn) return;

    const value = btn.getAttribute("data-dd-value") ?? "";
    setValue(value, true);
    setOpen(false);
  }

  function onDocumentClick(event) {
    if (!root.contains(event.target)) {
      setOpen(false);
    }
  }

  function onDocumentKeydown(event) {
    if (event.key === "Escape") {
      setOpen(false);
    }
  }

  const onTriggerClick = () => setOpen(!open);

  trigger.addEventListener("click", onTriggerClick);
  menuEl.addEventListener("click", onMenuClick);
  document.addEventListener("click", onDocumentClick);
  document.addEventListener("keydown", onDocumentKeydown);

  setValue(currentValue, false);
  setOpen(false);

  return {
    getValue: () => currentValue,
    setValue: (value, emit = false) => setValue(value, emit),
    destroy: () => {
      trigger.removeEventListener("click", onTriggerClick);
      menuEl.removeEventListener("click", onMenuClick);
      document.removeEventListener("click", onDocumentClick);
      document.removeEventListener("keydown", onDocumentKeydown);
      host.innerHTML = "";
    }
  };
}