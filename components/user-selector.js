// User Selector: tap or drag to rotate a child into the center.
// Usage: createUserSelector(trackEl, nameEl, ["Avery", "Ben", ...], { onChange })
// Markup: <div class="user-selector"><div class="user-track" role="radiogroup" aria-label="Select child"></div><div class="user-name" aria-live="polite"></div></div>
function createUserSelector(track, nameEl, users, { onChange } = {}) {
  const n = users.length;
  const css = getComputedStyle(document.documentElement);
  const SIZE = parseFloat(css.getPropertyValue("--circle"));
  const GAP_NEAR = parseFloat(css.getPropertyValue("--gap-near"));
  const GAP_FAR = parseFloat(css.getPropertyValue("--gap-far"));
  const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

  // Visible slots relative to the selected user (0). Matches the design:
  // 2 users: no wrap; 3: -1..1; 4: -1..2; 5+: -2..2
  const lo = n >= 5 ? -2 : -1;
  const hi = n >= 5 ? 2 : n === 4 ? 2 : 1;
  const wraps = n >= 3;

  // rot is a continuous "which user is centered" value; integers are resting positions
  let rot = 0;
  let anim = null;
  // Last selection reported to onChange; compared against instead of rot,
  // since a drag has already moved rot to the new user before it settles
  let notifiedSel = 0;

  // Shrinks the whole row on screens too narrow for all visible slots
  let fit = 1;
  const neededWidth = 2 * (GAP_NEAR + GAP_FAR) + 60 + 8;
  function measure() {
    fit = Math.min(1, track.clientWidth / neededWidth);
    track.style.height = `${(SIZE + 8) * fit}px`;
    layout();
  }

  track.innerHTML = "";
  const items = users.map((name, i) => {
    const b = document.createElement("button");
    b.type = "button";
    b.className = "user";
    b.textContent = name[0].toUpperCase();
    b.setAttribute("role", "radio");
    b.setAttribute("aria-label", name);
    b.dataset.index = i;
    track.appendChild(b);
    return b;
  });

  const mod = (a, m) => ((a % m) + m) % m;
  const lerp = (a, b, t) => a + (b - a) * t;
  const clampRot = (r) => (wraps ? r : Math.min(n - 1, Math.max(0, r)));
  const selectedIndex = () => mod(Math.round(rot), n);

  // Position of user i relative to the center slot, as a continuous value
  function offsetOf(i) {
    if (!wraps) return i - rot;
    const start = lo - 0.5;
    return mod(i - rot - start, n) + start;
  }

  function xFor(o) {
    const d = Math.abs(o);
    const x = d <= 1 ? d * GAP_NEAR : GAP_NEAR + (d - 1) * GAP_FAR;
    return Math.sign(o) * x;
  }

  function layout() {
    items.forEach((el, i) => {
      const o = offsetOf(i);
      const d = Math.abs(o);
      const near = Math.min(d, 1);

      // Size: 75 selected -> 65 neighbor -> 60 outer
      const px = d <= 1 ? lerp(SIZE, 65, d) : lerp(65, 60, Math.min(d - 1, 1));
      const scale = (px / SIZE) * fit;

      // Opacity: full for center + neighbors, lighter for outer, fade out past the visible window
      let opacity = d <= 1 ? 1 : lerp(1, 0.5, Math.min(d - 1, 1));
      if (o > hi) opacity *= Math.max(0, 1 - (o - hi) * 2);
      if (o < lo) opacity *= Math.max(0, 1 - (lo - o) * 2);

      const bg = Math.round(lerp(207, 240, near));
      const fg = Math.round(lerp(0, 150, near));

      el.style.transform = `translate(-50%, -50%) translateX(${xFor(o) * fit}px) scale(${scale})`;
      el.style.opacity = opacity;
      el.style.visibility = opacity < 0.02 ? "hidden" : "visible";
      el.style.background = `rgb(${bg}, ${bg}, ${bg})`;
      el.style.color = `rgb(${fg}, ${fg}, ${fg})`;
      el.style.zIndex = String(100 - Math.round(d * 10));
    });
  }

  function syncSelection() {
    const sel = selectedIndex();
    items.forEach((el, i) => {
      el.setAttribute("aria-checked", String(i === sel));
      el.tabIndex = i === sel ? 0 : -1;
    });
    nameEl.textContent = users[sel];
  }

  function animateTo(target) {
    target = clampRot(target);
    cancelAnimationFrame(anim);
    const from = rot;
    const dist = Math.abs(target - from);
    rot = target;
    syncSelection(); // update name + aria right away, then animate the visuals
    if (selectedIndex() !== notifiedSel) {
      notifiedSel = selectedIndex();
      if (onChange) onChange(users[notifiedSel], notifiedSel);
    }

    if (reduceMotion || dist === 0) {
      layout();
      return;
    }
    const duration = 220 + 120 * Math.min(dist, 3);
    const t0 = performance.now();
    rot = from;
    const tick = (now) => {
      const t = Math.min(1, (now - t0) / duration);
      const eased = 1 - Math.pow(1 - t, 3);
      rot = lerp(from, target, eased);
      layout();
      if (t < 1) anim = requestAnimationFrame(tick);
      else rot = target;
    };
    anim = requestAnimationFrame(tick);
  }

  // ---- Tap / drag ----
  let drag = null;
  track.addEventListener("pointerdown", (e) => {
    if (n < 2 || (e.pointerType === "mouse" && e.button !== 0)) return;
    cancelAnimationFrame(anim);
    rot = Math.round(rot * 1000) / 1000;
    drag = {
      id: e.pointerId,
      x: e.clientX,
      rot,
      moved: false,
      target: e.target.closest(".user"),
    };
  });

  track.addEventListener("pointermove", (e) => {
    if (!drag || e.pointerId !== drag.id) return;
    const dx = e.clientX - drag.x;
    if (!drag.moved && Math.abs(dx) < 6) return;
    if (!drag.moved) {
      drag.moved = true;
      track.setPointerCapture(e.pointerId);
      track.classList.add("dragging");
    }
    // Dragging left brings users from the right into the center
    rot = clampRot(drag.rot - dx / (GAP_NEAR * fit));
    layout();
  });

  function endDrag(e) {
    if (!drag || e.pointerId !== drag.id) return;
    const d = drag;
    drag = null;
    track.classList.remove("dragging");
    if (d.moved) {
      animateTo(Math.round(rot));
    } else if (d.target) {
      // Tap: rotate the tapped user into the center
      animateTo(Math.round(rot + offsetOf(Number(d.target.dataset.index))));
      d.target.focus({ preventScroll: true });
    } else {
      animateTo(Math.round(rot));
    }
  }
  track.addEventListener("pointerup", endDrag);
  track.addEventListener("pointercancel", endDrag);

  // ---- Keyboard ----
  track.addEventListener("keydown", (e) => {
    const step = { ArrowRight: 1, ArrowDown: 1, ArrowLeft: -1, ArrowUp: -1 }[e.key];
    if (!step) return;
    e.preventDefault();
    animateTo(Math.round(rot) + step);
    items[selectedIndex()].focus({ preventScroll: true });
  });

  syncSelection();
  measure();
  new ResizeObserver(measure).observe(track);

  return {
    get selected() { return users[selectedIndex()]; },
    select(i) { animateTo(Math.round(rot + offsetOf(i))); },
  };
}
