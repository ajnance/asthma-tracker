// Zone Slider: flow-rate readout circle + zoned range track.
// Usage: const slider = createZoneSlider(document.querySelector(".zone-slider"), { onChange })
// slider.value reads/sets the flow rate; null means empty.
// The root element only needs class="zone-slider"; the markup is rendered here.

let zoneSliderCount = 0;

function createZoneSlider(root, { onChange } = {}) {
  const MIN = 0;
  const MAX = 320;
  const TICKS = [0, 100, 200, 300];
  const MINOR_TICKS = [160, 255];
  // Upper bound (inclusive) of each zone
  const ZONES = [
    { max: 160, color: "var(--red)",    label: "red zone" },
    { max: 255, color: "var(--orange)", label: "orange zone" },
    { max: 320, color: "var(--green)",  label: "green zone" },
  ];

  // Unique ids so more than one slider can live on a page
  const id = `zoneSlider${++zoneSliderCount}`;
  root.innerHTML = `
    <div class="readout">
      <div class="readout-circle">
        <input class="readout-value" id="${id}-readout" type="text" inputmode="numeric" maxlength="3" autocomplete="off" aria-labelledby="${id}-label">
        <label class="readout-label" id="${id}-label" for="${id}-readout">Flow Rate</label>
      </div>
    </div>
    <div class="rail">
      <div class="track">
        <div class="zones"></div>
        <div class="unfilled"></div>
      </div>
      <div class="ticks"></div>
      <input type="range" min="${MIN}" max="${MAX}" step="1" value="${MIN}" aria-labelledby="${id}-label">
    </div>`;

  const input = root.querySelector('input[type="range"]');
  const readout = root.querySelector(".readout-value");
  const ticks = root.querySelector(".ticks");

  const pct = (v) => ((v - MIN) / (MAX - MIN)) * 100;

  // Zone boundaries sit halfway between the last value of one zone and the first of the next
  root.style.setProperty("--b1", pct(ZONES[0].max + 0.5) + "%");
  root.style.setProperty("--b2", pct(ZONES[1].max + 0.5) + "%");

  function addTick(v, className) {
    const t = document.createElement("div");
    t.className = className;
    t.style.left = pct(v) + "%";
    t.textContent = v;
    ticks.appendChild(t);
  }

  TICKS.forEach((v) => addTick(v, "tick"));
  MINOR_TICKS.forEach((v) => addTick(v, "tick minor"));

  // Redraws the track and circle color; also rewrites the typed box unless the user is mid-typing
  function update({ syncReadout = true } = {}) {
    const v = Number(input.value);
    if (onChange) onChange(v === MIN ? null : v);
    // 0 is the empty / starting state: gray circle, blank number box
    if (v === MIN) {
      root.style.setProperty("--pct", "0%");
      root.style.setProperty("--zone-color", "var(--empty)");
      if (syncReadout) readout.value = "";
      input.setAttribute("aria-valuetext", "No value entered");
      return;
    }
    const zone = ZONES.find((z) => v <= z.max);
    root.style.setProperty("--pct", pct(v) + "%");
    root.style.setProperty("--zone-color", zone.color);
    if (syncReadout) readout.value = v;
    input.setAttribute("aria-valuetext", `${v}, ${zone.label}`);
  }

  // Slider -> circle
  input.addEventListener("input", () => update());

  // Circle -> slider: move the slider live as digits are typed
  readout.addEventListener("input", () => {
    readout.value = readout.value.replace(/\D/g, "");
    if (readout.value === "") return;
    const v = Math.min(MAX, Math.max(MIN, Number(readout.value)));
    input.value = v;
    update({ syncReadout: false });
  });

  // When done typing, clamp to the range (or restore the last value if left blank)
  function commit() {
    update();
  }
  readout.addEventListener("blur", commit);
  readout.addEventListener("keydown", (e) => {
    if (e.key === "Enter") {
      commit();
      readout.blur();
    } else if (e.key === "ArrowUp" || e.key === "ArrowDown") {
      e.preventDefault();
      input.value = Number(input.value) + (e.key === "ArrowUp" ? 1 : -1);
      update();
    }
  });
  readout.addEventListener("focus", () => readout.select());

  update();

  return {
    get value() { return Number(input.value) === MIN ? null : Number(input.value); },
    // null (or MIN) returns the slider to its empty state
    set value(v) {
      input.value = v ?? MIN;
      update();
    },
  };
}
