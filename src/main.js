import "./style.css";

const byId = (id) => document.getElementById(id);
const stage = byId("model-stage");
const modelInputs = [
  ...stage.querySelectorAll(".model-toolbar button, .model-options input"),
];
let viewer;
let study;
let selectedId = "D3";
let activeGroup = null;
let loading = false;
const pins = new Map();
const groups = new Map();

function markPressed(buttons, active) {
  for (const button of buttons) {
    const selected = button === active;
    button.classList.toggle("active", selected);
    button.setAttribute("aria-pressed", String(selected));
  }
}

function selectCarton(id) {
  const box = study.boxes.find((item) => item.id === id);
  if (!box) return;
  if (byId("show-gaps").checked) {
    byId("show-gaps").checked = false;
    viewer?.showGaps(false);
  }
  if (activeGroup && !id.startsWith(activeGroup)) selectGroup(activeGroup);
  selectedId = id;
  for (const [pinId, pin] of pins) {
    pin.classList.toggle("selected", pinId === id);
    pin.setAttribute("aria-pressed", String(pinId === id));
  }
  byId("carton-select").value = id;
  byId("selected-title").textContent = `Carton ${id}`;
  byId("selected-note").textContent = box.note;
  byId("selected-dimensions").textContent =
    `Model size: ${box.sizeMM.join(" × ")} mm (W × D × H). Conditional on the assumed pallet and inferred depth.`;
  byId("selected-model-id").textContent = `${id} / OBSERVED IN PHOTOGRAPH`;
  const viewport = byId("photo-viewport");
  const pin = pins.get(id);
  if (
    pin.offsetLeft - 18 < viewport.scrollLeft ||
    pin.offsetLeft + 18 > viewport.scrollLeft + viewport.clientWidth
  ) {
    viewport.scrollLeft = pin.offsetLeft - viewport.clientWidth / 2;
  }
  viewer?.select(id);
  modelCaption();
}

function selectGroup(group) {
  activeGroup = activeGroup === group ? null : group;
  for (const [key, button] of groups)
    button.setAttribute("aria-pressed", String(key === activeGroup));
  for (const [id, pin] of pins)
    pin.classList.toggle(
      "dimmed",
      Boolean(activeGroup && !id.startsWith(activeGroup)),
    );
}

function buildInventory() {
  const selector = document.createElement("select");
  selector.id = "carton-select";
  const label = document.createElement("label");
  label.className = "carton-selector";
  label.htmlFor = selector.id;
  label.append("Choose any carton", selector);
  byId("selected-card").before(label);
  const fragment = document.createDocumentFragment();
  for (const box of study.boxes) {
    const pin = document.createElement("button");
    pin.type = "button";
    pin.className = `photo-pin${box.review ? " review" : ""}`;
    pin.dataset.carton = box.id;
    pin.style.left = `${(box.pixel[0] / study.imageSize[0]) * 100}%`;
    pin.style.top = `${(box.pixel[1] / study.imageSize[1]) * 100}%`;
    pin.textContent = box.id;
    pin.title = `${box.id}: ${box.note}`;
    pin.setAttribute(
      "aria-label",
      `Inspect carton ${box.id}${box.review ? ", with a review note" : ""}`,
    );
    pin.setAttribute("aria-pressed", "false");
    pin.addEventListener("click", () => {
      selectCarton(box.id);
    });
    fragment.append(pin);
    pins.set(box.id, pin);
    const option = new Option(
      `${box.id}${box.review ? " — review note" : ""}`,
      box.id,
    );
    selector.add(option);
  }
  selector.addEventListener("change", () => {
    selectCarton(selector.value);
  });
  byId("photo-pins").append(fragment);
  for (const [group, points] of Object.entries(study.inventory.groups)) {
    const button = document.createElement("button");
    button.className = "inventory-group";
    button.type = "button";
    button.dataset.group = group;
    button.setAttribute(
      "aria-label",
      `Highlight image group ${group}, ${points.length} cartons`,
    );
    button.setAttribute("aria-pressed", "false");
    const letter = document.createElement("span");
    letter.className = "group-letter";
    letter.textContent = group;
    const bar = document.createElement("span");
    bar.className = "group-bar";
    bar.setAttribute("aria-hidden", "true");
    for (const _ of points) bar.append(document.createElement("i"));
    const count = document.createElement("span");
    count.className = "group-count";
    count.textContent = String(points.length).padStart(2, "0");
    button.append(letter, bar, count);
    button.addEventListener("click", () => selectGroup(group));
    groups.set(group, button);
    byId("inventory-groups").append(button);
  }
  byId("show-labels").addEventListener("change", (event) => {
    byId("photo-pins").hidden = !event.target.checked;
    byId("evidence-image").classList.toggle(
      "with-labels",
      event.target.checked,
    );
    byId("photo-scroll-hint").hidden = !event.target.checked;
  });
  const clipping = new IntersectionObserver(
    (entries) => {
      for (const entry of entries)
        entry.target.classList.toggle(
          "clipped",
          entry.intersectionRatio < 0.99,
        );
    },
    { root: byId("photo-viewport"), threshold: [0, 0.99, 1] },
  );
  for (const pin of pins.values()) clipping.observe(pin);
  selectCarton("D3");
}

const scenarioCopy = [
  [
    "Full rear",
    "Every assumed position is filled.",
    "Complete the rear columns with 239 inferred cartons. All 318 boxes have contact support, and the whole stack passes force and moment balance.",
  ],
  [
    "One assumed missing",
    "One missing. A clear support path.",
    "Remove the concealed top rear-left carton. Nothing rests on it, so the remaining stack keeps its support. This is our 317-box working estimate.",
  ],
  [
    "Two assumed missing",
    "A second gap. No load above it.",
    "Remove the rear carton immediately below the first gap. The carton it carried is already absent. The remaining 316 boxes retain their support.",
  ],
  [
    "Three assumed missing",
    "A third gap. Supported from beside it.",
    "Also remove a concealed rear carton in course eight. Boxes above this gap bridge neighbouring supports. The force-balance check and gravity simulation pass with all 315 remaining cartons.",
  ],
];
let missing = 1;
const coarsePointer = matchMedia("(pointer: coarse)");

function modelCaption() {
  if (!viewer) return;
  const current = study.hypotheses.scenarios[missing];
  byId("selected-model-id").textContent = byId("show-gaps").checked
    ? `${missing} EMPTY POSITION${missing === 1 ? "" : "S"} MARKED`
    : `${selectedId} / OBSERVED IN PHOTOGRAPH`;
  byId("viewer-status").textContent =
    `${current.count} boxes · 79 observed + ${current.count - 79} inferred`;
  byId("model-caption").textContent =
    byId("show-gaps").checked && missing
      ? "Orange outlines mark empty positions · remaining cartons stay supported"
      : byId("show-hidden").checked
        ? "Grey cartons are hypothetical · all remaining boxes stay supported"
        : "Neutral colour view · inferred cartons remain in their support positions";
}

function selectScenario(value) {
  if (!Number.isInteger(value) || !study.hypotheses.scenarios[value]) return;
  missing = value;
  const current = study.hypotheses.scenarios[missing];
  document.querySelectorAll("[data-missing]").forEach((button) => {
    const active = Number(button.dataset.missing) === missing;
    button.classList.toggle("active", active);
    button.setAttribute("aria-pressed", String(active));
  });
  const [name, title, note] = scenarioCopy[missing];
  byId("hypothesis-count").textContent = current.count;
  byId("hypothesis-name").textContent = name;
  byId("scenario-title").textContent = title;
  byId("scenario-note").textContent = note;
  byId("scenario-image").src = `/evidence/scenario_${missing}_rear.webp`;
  byId("scenario-image").alt =
    `Rear of the supported ${current.count}-box model: ${name.toLowerCase()}`;
  byId("occlusion-image").src = `/evidence/visibility_scenario_${missing}.png`;
  byId("occlusion-image").alt =
    `Controlled ID-colour render: ${current.count} boxes, ${missing} concealed cartons missing`;
  byId("support-count").textContent =
    `${current.supported}/${current.count} supported`;
  byId("support-contact").textContent =
    `${(current.minimumBaseContact * 100).toFixed(1)}%`;
  byId("support-margin").textContent =
    `${current.minimumCentroidMarginMM.toFixed(1)} mm`;
  // The fallback follows the same scenario as the live viewer.
  stage.querySelector(".model-poster").src =
    `/evidence/scenario_${missing}_rear.webp`;
  stage.querySelector(".model-poster").alt =
    `Blender render of the ${current.count}-box scenario, viewed from behind`;
  viewer?.setHypotheses(byId("show-hidden").checked, missing);
  modelCaption();
}

function buildEstimation() {
  const values = {
    estimate: study.conclusion.estimate,
    range: study.conclusion.range.join("–"),
    sensitivity: study.conclusion.depthSensitivity.join("–"),
  };
  for (const [key, value] of Object.entries(values)) {
    document.querySelectorAll(`[data-stat="${key}"]`).forEach((node) => {
      node.textContent = value;
    });
  }
  const maximum = Math.max(...study.courses.map((course) => course.full));
  for (const course of [...study.courses].reverse()) {
    const row = document.createElement("div");
    row.className = "course-row";
    row.setAttribute(
      "aria-label",
      `Course ${course.layer}: ${course.observed} observed plus ${course.full - course.observed} assumed, ${course.full} boxes total`,
    );
    const label = document.createElement("span");
    label.textContent = `L${String(course.layer).padStart(2, "0")}`;
    const bar = document.createElement("div");
    bar.className = "course-bar";
    bar.setAttribute("aria-hidden", "true");
    const observed = document.createElement("i");
    observed.style.width = `${(course.observed / maximum) * 100}%`;
    const inferred = document.createElement("i");
    inferred.style.width = `${((course.full - course.observed) / maximum) * 100}%`;
    bar.append(observed, inferred);
    const count = document.createElement("strong");
    count.textContent = course.full;
    row.append(label, bar, count);
    byId("course-chart").append(row);
  }
  for (const item of study.depthSensitivity) {
    const row = document.createElement("tr");
    if (item.factor === 1) row.className = "selected-depth";
    for (const text of [
      `${item.factor.toFixed(2)}×`,
      `${item.estimate} boxes`,
      `${item.topMedianPX.toFixed(2)} px`,
    ]) {
      const cell = document.createElement("td");
      cell.textContent = text;
      row.append(cell);
    }
    byId("sensitivity-rows").append(row);
  }
}

function touchInteraction(enabled) {
  stage.dataset.touchInteractive = String(!coarsePointer.matches || enabled);
  const button = byId("touch-model");
  button.hidden = !coarsePointer.matches;
  button.setAttribute("aria-pressed", String(enabled));
  button.textContent = enabled ? "Done · scroll page" : "Interact with 3D";
  viewer?.interact(!coarsePointer.matches || enabled);
}

function modelFailed(error) {
  console.warn("Interactive model unavailable:", error.message);
  viewer = undefined;
  stage.dataset.viewerStatus = "error";
  stage.setAttribute("aria-busy", "false");
  modelInputs.forEach((input) => {
    input.disabled = true;
  });
  byId("touch-model").hidden = true;
  byId("viewer-status").textContent = "Static Blender render · 3D unavailable";
  byId("model-caption").textContent =
    "The supported scenarios, rear renders and Blender download remain available.";
  byId("retry-model").hidden = false;
}

async function startViewer() {
  if (loading || !study) return;
  loading = true;
  stage.dataset.viewerStatus = "loading";
  stage.setAttribute("aria-busy", "true");
  byId("retry-model").hidden = true;
  byId("viewer-status").textContent = "Loading the interactive model…";
  try {
    const { createViewer } = await import("./viewer.js");
    viewer = await createViewer({
      container: byId("model-canvas"),
      study,
      onSelect: selectCarton,
      onFailure: modelFailed,
    });
    modelInputs.forEach((input) => {
      input.disabled = false;
    });
    viewer.setHypotheses(byId("show-hidden").checked, missing);
    viewer.showGaps(byId("show-gaps").checked);
    markPressed(
      stage.querySelectorAll("[data-view]"),
      stage.querySelector('[data-view="overview"]'),
    );
    byId("rotate-model").setAttribute("aria-pressed", "false");
    viewer.select(selectedId);
    touchInteraction(false);
    modelCaption();
  } catch (error) {
    modelFailed(error);
  } finally {
    loading = false;
  }
}

function cameraView(name) {
  markPressed(
    stage.querySelectorAll("[data-view]"),
    stage.querySelector(`[data-view="${name}"]`),
  );
  viewer?.rotate(false);
  byId("rotate-model").setAttribute("aria-pressed", "false");
  viewer?.setView(name);
}

function scrollToModel() {
  stage.scrollIntoView({
    block: "center",
    behavior: matchMedia("(prefers-reduced-motion: reduce)").matches
      ? "instant"
      : "smooth",
  });
}

function setupModelControls() {
  stage.querySelectorAll("[data-view]").forEach((button) => {
    button.addEventListener("click", () => cameraView(button.dataset.view));
  });
  document.querySelectorAll("[data-missing]").forEach((button) => {
    button.addEventListener("click", () =>
      selectScenario(Number(button.dataset.missing)),
    );
  });
  byId("rotate-model").addEventListener("click", (event) => {
    const button = event.currentTarget;
    const rotate = button.getAttribute("aria-pressed") !== "true";
    button.setAttribute("aria-pressed", String(rotate));
    viewer?.rotate(rotate);
  });
  byId("show-hidden").addEventListener("change", () => {
    viewer?.setHypotheses(byId("show-hidden").checked, missing);
    modelCaption();
  });
  byId("show-gaps").addEventListener("change", () => {
    viewer?.showGaps(byId("show-gaps").checked);
    modelCaption();
  });
  byId("touch-model").addEventListener("click", () =>
    touchInteraction(stage.dataset.touchInteractive !== "true"),
  );
  coarsePointer.addEventListener("change", () => touchInteraction(false));
  byId("reset-model").addEventListener("click", () => {
    viewer?.reset();
    byId("show-hidden").checked = true;
    byId("show-gaps").checked = false;
    selectScenario(1);
    cameraView("overview");
    touchInteraction(false);
  });
  byId("retry-model").addEventListener("click", startViewer);
  byId("locate-model").addEventListener("click", () => {
    viewer?.select(selectedId);
    cameraView("front");
    scrollToModel();
    if (!coarsePointer.matches)
      byId("model-canvas")
        .querySelector("canvas")
        ?.focus({ preventScroll: true });
  });
  byId("inspect-gaps").addEventListener("click", () => {
    byId("show-gaps").checked = true;
    viewer?.showGaps(true);
    cameraView("rear");
    modelCaption();
    scrollToModel();
  });
  selectScenario(1);
}

function setupComparisons() {
  const modes = {
    textured: [
      "photo_surface_reconstruction.png",
      "RECONSTRUCTION",
      "Photo-textured reconstructed surfaces from the fitted camera",
    ],
    neutral: [
      "neutral_geometry.png",
      "NEUTRAL GEOMETRY",
      "Neutral carton geometry without photo textures",
    ],
    overlay: [
      "geometry_overlay.png",
      "FITTED EDGES",
      "Fitted carton edges over the original photograph",
    ],
  };
  document.querySelectorAll("[data-compare]").forEach((button) => {
    button.addEventListener("click", () => {
      markPressed(document.querySelectorAll("[data-compare]"), button);
      const [file, label, alt] = modes[button.dataset.compare];
      byId("compare-image").src = `/evidence/${file}?v=2`;
      byId("compare-image").alt = alt;
      byId("compare-label").textContent = label;
    });
  });
  byId("comparison-slider").addEventListener("input", (event) => {
    const value = Number(event.target.value);
    byId("compare-reveal").style.clipPath = `inset(0 ${100 - value}% 0 0)`;
    byId("compare-divider").style.left = `${value}%`;
    event.target.setAttribute(
      "aria-valuetext",
      `${value}% reconstruction revealed`,
    );
  });
}

async function initialize() {
  modelInputs.forEach((input) => {
    input.disabled = true;
  });
  try {
    const response = await fetch("/evidence/case-study.json", {
      signal: AbortSignal.timeout(15000),
      cache: "no-cache",
    });
    if (!response.ok)
      throw new Error(`Study request failed (${response.status}).`);
    study = await response.json();
    if (
      study.schemaVersion !== 2 ||
      !Array.isArray(study.boxes) ||
      study.boxes.length !== 79 ||
      new Set(study.boxes.map((box) => box.id)).size !== 79 ||
      study.conclusion.total !== "estimated" ||
      study.conclusion.full !== 318 ||
      study.hypotheses.scenarios.length !== 4
    ) {
      throw new Error("The study inventory does not match this release.");
    }
    buildInventory();
    buildEstimation();
    setupComparisons();
    setupModelControls();
    document.documentElement.dataset.studyStatus = "ready";
    await startViewer();
  } catch (error) {
    console.warn("Study unavailable:", error.message);
    byId("app-error").hidden = false;
    stage.dataset.viewerStatus = "error";
    stage.setAttribute("aria-busy", "false");
    byId("viewer-status").textContent = "Static Blender render";
    byId("model-caption").textContent =
      "The 317-box estimate is conditional. Static evidence and downloads remain available.";
    document.documentElement.dataset.studyStatus = "error";
    document
      .querySelectorAll(
        "#show-labels, #locate-model, #inspect-gaps, #comparison-slider, [data-compare], [data-missing]",
      )
      .forEach((input) => {
        input.disabled = true;
      });
  }
  // Start the small logo after the study renderer has finished its initial load.
  import("./logo.js").then((module) => module.startLogo()).catch(() => {});
}

initialize();
