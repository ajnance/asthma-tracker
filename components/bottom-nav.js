// Bottom Nav: fixed tab bar at the bottom of the screen.
// Usage: createBottomNav(document.querySelector(".bottom-nav"), { current: "check-in" })
// The root element only needs class="bottom-nav" (a <nav>); the markup is rendered here.
// Needs Font Awesome for icons. Pages should pad their bottom by
// calc(var(--bottom-nav-height) + env(safe-area-inset-bottom)) so content isn't hidden behind it.

// Free Font Awesome stand-ins; the design uses Pro icons noted alongside.
const BOTTOM_NAV_ITEMS = [
  { id: "check-in", label: "Check-in", icon: "fa-solid fa-plus",              href: "check-in.html" },
  { id: "history",  label: "History",  icon: "fa-solid fa-clock-rotate-left", href: "#history" },  // Pro: calendar-clock
  { id: "stats",    label: "Stats",    icon: "fa-solid fa-chart-line",        href: "#stats" },
  { id: "data",     label: "Data",     icon: "fa-solid fa-arrows-up-down",    href: "#data" },     // Pro: arrow-up-arrow-down
  { id: "settings", label: "Settings", icon: "fa-solid fa-gear",              href: "#settings" },
];

function createBottomNav(root, { items = BOTTOM_NAV_ITEMS, current } = {}) {
  if (!root.hasAttribute("aria-label")) root.setAttribute("aria-label", "Main");

  const list = document.createElement("div");
  list.className = "bottom-nav-items";
  items.forEach((item) => {
    const a = document.createElement("a");
    a.className = "bottom-nav-item";
    a.href = item.href;
    a.dataset.id = item.id;
    a.innerHTML = `<i class="${item.icon}" aria-hidden="true"></i><span>${item.label}</span>`;
    list.appendChild(a);
  });
  root.replaceChildren(list);

  function setCurrent(id) {
    list.querySelectorAll(".bottom-nav-item").forEach((a) => {
      if (a.dataset.id === id) a.setAttribute("aria-current", "page");
      else a.removeAttribute("aria-current");
    });
  }
  setCurrent(current);

  return { setCurrent };
}
