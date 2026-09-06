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

function modelCaption() {
  const show = byId("show-hidden").checked;
  const remove = byId("remove-hidden").checked;
  const separated = Number(byId("explode").value) > 0;
  byId("viewer-status").textContent = show
    ? `${study.conclusion.visible} observed + ${study.hypotheses.hidden - Number(remove)} hypothetical`
    : `${study.conclusion.visible} observed cartons · interior hidden`;
  byId("model-caption").textContent = separated
    ? "Separated for inspection · inferred depths and supports remain unverified"
    : show
      ? "Grey interior is hypothetical · no exact total or physical packing is established"
      : "Drag to orbit · scroll or +/− to zoom · select a carton to inspect";
}

function modelFailed(error) {
  console.warn("Interactive model unavailable:", error.message);
  viewer = undefined;
  stage.dataset.viewerStatus = "error";
  stage.setAttribute("aria-busy", "false");
  modelInputs.forEach((input) => {
    input.disabled = true;
  });
  byId("viewer-status").textContent = "Static Blender render · 3D unavailable";
  byId("model-caption").textContent =
    "Preview includes 79 observed + 93 hypothetical cartons. Download the Blender scene to inspect.";
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
    byId("show-hidden").checked = false;
    byId("explode").value = 0;
    markPressed(
      stage.querySelectorAll("[data-view]"),
      stage.querySelector('[data-view="overview"]'),
    );
    byId("rotate-model").setAttribute("aria-pressed", "false");
    viewer.select(selectedId);
    modelCaption();
  } catch (error) {
    modelFailed(error);
  } finally {
    loading = false;
  }
}

function setupModelControls() {
  stage.querySelectorAll("[data-view]").forEach((button) => {
    button.addEventListener("click", () => {
      markPressed(stage.querySelectorAll("[data-view]"), button);
      viewer?.rotate(false);
      byId("rotate-model").setAttribute("aria-pressed", "false");
      viewer?.setView(button.dataset.view);
    });
  });
  byId("rotate-model").addEventListener("click", (event) => {
    const button = event.currentTarget;
    const rotate = button.getAttribute("aria-pressed") !== "true";
    button.setAttribute("aria-pressed", String(rotate));
    viewer?.rotate(rotate);
  });
  byId("show-hidden").addEventListener("change", () => {
    viewer?.setHypotheses(
      byId("show-hidden").checked,
      byId("remove-hidden").checked,
    );
    modelCaption();
  });
  byId("explode").addEventListener("input", (event) => {
    viewer?.separate(Number(event.target.value));
    modelCaption();
  });
  byId("reset-model").addEventListener("click", () => {
    viewer?.reset();
    byId("show-hidden").checked = false;
    byId("explode").value = 0;
    byId("rotate-model").setAttribute("aria-pressed", "false");
    markPressed(
      stage.querySelectorAll("[data-view]"),
      stage.querySelector('[data-view="overview"]'),
    );
    modelCaption();
  });
  byId("retry-model").addEventListener("click", startViewer);
  byId("locate-model").addEventListener("click", () => {
    viewer?.rotate(false);
    byId("rotate-model").setAttribute("aria-pressed", "false");
    viewer?.select(selectedId);
    viewer?.setView("front");
    markPressed(
      stage.querySelectorAll("[data-view]"),
      stage.querySelector('[data-view="front"]'),
    );
    stage.scrollIntoView({
      block: "center",
      behavior: matchMedia("(prefers-reduced-motion: reduce)").matches
        ? "instant"
        : "smooth",
    });
    byId("model-canvas")
      .querySelector("canvas")
      ?.focus({ preventScroll: true });
  });
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
      byId("compare-image").src = `/evidence/${file}`;
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
  byId("remove-hidden").addEventListener("change", (event) => {
    const removed = event.target.checked;
    byId("hypothesis-count").textContent = String(
      removed ? study.hypotheses.b : study.hypotheses.a,
    );
    byId("hypothesis-name").textContent = `Hypothesis ${removed ? "B" : "A"}`;
    byId("occlusion-image").src =
      `/evidence/visibility_hypothesis_${removed ? "b" : "a"}.png`;
    viewer?.setHypotheses(byId("show-hidden").checked, removed);
    if (viewer) modelCaption();
  });
}

async function initialize() {
  modelInputs.forEach((input) => {
    input.disabled = true;
  });
  try {
    const response = await fetch("/evidence/case-study.json", {
      signal: AbortSignal.timeout(15000),
    });
    if (!response.ok)
      throw new Error(`Study request failed (${response.status}).`);
    study = await response.json();
    if (
      !Array.isArray(study.boxes) ||
      study.boxes.length !== 79 ||
      new Set(study.boxes.map((box) => box.id)).size !== 79 ||
      study.conclusion.total !== "unresolved"
    ) {
      throw new Error("The study inventory does not match this release.");
    }
    buildInventory();
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
      "Preview includes hypothetical interior. Static evidence and downloads remain available.";
    document.documentElement.dataset.studyStatus = "error";
    document
      .querySelectorAll(
        "#show-labels, #remove-hidden, #locate-model, #comparison-slider, [data-compare]",
      )
      .forEach((input) => {
        input.disabled = true;
      });
  }
}

initialize();
