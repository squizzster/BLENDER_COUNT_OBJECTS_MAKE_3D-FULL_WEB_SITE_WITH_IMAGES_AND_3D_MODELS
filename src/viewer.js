import * as THREE from "three";
import { GLTFLoader } from "three/addons/loaders/GLTFLoader.js";
import { OrbitControls } from "three/addons/controls/OrbitControls.js";
import { RoomEnvironment } from "three/addons/environments/RoomEnvironment.js";

// Evidence classification lives on exported carton nodes, not each material mesh.
export async function createViewer({ container, study, onSelect, onFailure }) {
  const stage = container.closest(".model-stage");
  const renderer = new THREE.WebGLRenderer({
    antialias: true,
    alpha: true,
    preserveDrawingBuffer: true,
  });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 1.5));
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1.2;
  renderer.shadowMap.enabled = true;
  renderer.shadowMap.type = THREE.PCFShadowMap;
  renderer.domElement.tabIndex = 0;
  renderer.domElement.setAttribute("role", "img");
  renderer.domElement.setAttribute(
    "aria-label",
    "Interactive carton reconstruction. Drag to orbit, scroll to zoom, or use the camera buttons. Select a labelled carton in the photograph for keyboard inspection.",
  );
  const scene = new THREE.Scene();
  const camera = new THREE.PerspectiveCamera(34, 1, 0.01, 30);
  const controls = new OrbitControls(camera, renderer.domElement);
  controls.enableDamping = true;
  controls.dampingFactor = 0.1;
  controls.minDistance = 1.4;
  controls.maxDistance = 7;
  controls.maxPolarAngle = Math.PI * 0.88;
  controls.autoRotateSpeed = 1.1;
  controls.enablePan = false;
  scene.add(new THREE.HemisphereLight(0xffffff, 0x626262, 1.6));
  const key = new THREE.DirectionalLight(0xffffff, 2.5);
  key.position.set(-3, 5, 4);
  key.castShadow = true;
  key.shadow.mapSize.set(1024, 1024);
  Object.assign(key.shadow.camera, {
    left: -2,
    right: 2,
    top: 3,
    bottom: -2,
    near: 0.1,
    far: 12,
  });
  key.shadow.normalBias = 0.01;
  scene.add(key);
  const rim = new THREE.DirectionalLight(0xffffff, 1.2);
  rim.position.set(3, 3, -4);
  scene.add(rim);
  const ground = new THREE.Mesh(
    new THREE.PlaneGeometry(20, 20),
    new THREE.ShadowMaterial({ color: 0x000000, opacity: 0.16 }),
  );
  ground.rotation.x = -Math.PI / 2;
  ground.position.y = -0.009;
  ground.receiveShadow = true;
  scene.add(ground);

  let root;
  try {
    const response = await fetch("/evidence/pallet_reconstruction.glb", {
      signal: AbortSignal.timeout(20000),
      cache: "no-cache",
    });
    if (!response.ok)
      throw new Error(`Model request failed (${response.status}).`);
    const gltf = await new GLTFLoader().parseAsync(
      await response.arrayBuffer(),
      "/evidence/",
    );
    root = gltf.scene;
  } catch (error) {
    controls.dispose();
    renderer.dispose();
    throw error;
  }
  scene.add(root);
  root.updateMatrixWorld(true);
  const observed = new Map();
  const hidden = [];
  const hiddenMaterial = new THREE.MeshStandardMaterial({
    color: 0x85827c,
    roughness: 0.82,
  });
  const edgeMaterial = new THREE.LineBasicMaterial({
    color: 0x191919,
    transparent: true,
    opacity: 0.4,
  });
  root.traverse((node) => {
    if (node.isMesh) {
      node.castShadow = true;
      node.receiveShadow = true;
    }
    if (node.userData.is_carton) {
      if (node.userData.image_id) observed.set(node.userData.image_id, node);
      else hidden.push(node);
    }
  });
  if (
    observed.size !== study.conclusion.visible ||
    hidden.length !== study.hypotheses.hidden
  ) {
    controls.dispose();
    renderer.dispose();
    throw new Error("Model inventory does not match the audited study.");
  }
  const room = new RoomEnvironment();
  const pmrem = new THREE.PMREMGenerator(renderer);
  const environment = pmrem.fromScene(room, 0.04);
  scene.environment = environment.texture;
  scene.environmentIntensity = 0.65;
  room.dispose();
  pmrem.dispose();
  for (const node of [...observed.values(), ...hidden]) {
    const meshes = [];
    node.traverse((child) => {
      if (child.isMesh) meshes.push(child);
    });
    for (const mesh of meshes) {
      if (!node.userData.image_id) mesh.material = hiddenMaterial;
      const edges = new THREE.LineSegments(
        new THREE.EdgesGeometry(mesh.geometry, 25),
        edgeMaterial,
      );
      edges.raycast = () => {};
      mesh.add(edges);
    }
  }
  const selection = new THREE.Box3Helper(new THREE.Box3(), 0xff3a00);
  selection.material.depthTest = false;
  selection.material.toneMapped = false;
  selection.renderOrder = 10;
  selection.visible = false;
  scene.add(selection);
  let selectedId;
  let highlightInterior = true;
  let missing = 1;
  let markGaps = false;
  const gapMarkers = new Map();
  for (const removal of study.hypotheses.removals) {
    const node = hidden.find((item) => item.name === removal.id);
    if (!node) throw new Error("A removable carton is absent from the model.");
    const marker = new THREE.Box3Helper(
      new THREE.Box3().setFromObject(node),
      0xff3a00,
    );
    marker.material.depthTest = false;
    marker.material.toneMapped = false;
    marker.renderOrder = 9;
    marker.visible = false;
    scene.add(marker);
    gapMarkers.set(node.name, marker);
  }
  let active = true;
  let disposed = false;
  let frame = 0;
  let previousTime = 0;
  const baseTarget = new THREE.Vector3(0, 0.84, -0.42);
  const presets = {
    front: [0.12, 1.6, 3.1],
    overview: [2.0, 1.9, 2.4],
    rear: [2.0, 1.85, -3.0],
  };
  function select(id) {
    selectedId = observed.has(id) ? id : undefined;
    selection.visible = Boolean(selectedId) && !markGaps;
    if (selectedId) selection.box.setFromObject(observed.get(selectedId));
    stage.dataset.selectedCarton = selectedId || "";
    requestRender();
  }
  function setView(name) {
    camera.position.set(...(presets[name] || presets.overview));
    controls.target.copy(baseTarget);
    controls.update();
    stage.dataset.cameraView = name;
    requestRender();
  }
  function setHypotheses(highlight, omitted) {
    if (!Number.isInteger(omitted) || !study.hypotheses.scenarios[omitted])
      throw new Error("Invalid packing scenario.");
    highlightInterior = highlight;
    missing = omitted;
    hiddenMaterial.color.set(highlight ? 0x85827c : 0x997c59);
    const removed = new Set(study.hypotheses.scenarios[missing].removedIds);
    for (const node of hidden) node.visible = !removed.has(node.name);
    for (const [id, marker] of gapMarkers)
      marker.visible = markGaps && removed.has(id);
    const count = hidden.filter((node) => node.visible).length;
    stage.dataset.visibleCartons = String(observed.size + count);
    stage.dataset.hypotheticalVisible = String(count);
    stage.dataset.missing = String(missing);
    stage.dataset.highlightInterior = String(highlight);
    stage.dataset.supportedCartons = String(
      study.hypotheses.scenarios[missing].supported,
    );
    requestRender();
  }
  function showGaps(enabled) {
    markGaps = enabled;
    selection.visible = Boolean(selectedId) && !enabled;
    stage.dataset.markGaps = String(enabled);
    setHypotheses(highlightInterior, missing);
  }
  function render(time) {
    frame = 0;
    if (disposed || !active || document.hidden) return;
    const delta = Math.min((time - previousTime) / 1000, 0.05);
    previousTime = time;
    const changed = controls.update(delta);
    renderer.render(scene, camera);
    if (controls.autoRotate || changed) requestRender();
  }
  function requestRender() {
    if (!disposed && active && !document.hidden && !frame)
      frame = requestAnimationFrame(render);
  }
  controls.addEventListener("change", requestRender);
  const resize = new ResizeObserver(() => {
    const { width, height } = container.getBoundingClientRect();
    renderer.setSize(width, height, false);
    camera.aspect = width / height;
    camera.updateProjectionMatrix();
    requestRender();
  });
  resize.observe(container);
  const visibility = new IntersectionObserver(
    ([entry]) => {
      active = entry.isIntersecting;
      requestRender();
    },
    { rootMargin: "100px" },
  );
  visibility.observe(container);
  document.addEventListener("visibilitychange", requestRender);
  const raycaster = new THREE.Raycaster();
  let pointerStart;
  renderer.domElement.addEventListener("pointerdown", (event) => {
    pointerStart = [event.clientX, event.clientY];
  });
  renderer.domElement.addEventListener("pointerup", (event) => {
    if (
      !pointerStart ||
      Math.hypot(
        event.clientX - pointerStart[0],
        event.clientY - pointerStart[1],
      ) > 5
    )
      return;
    const rect = renderer.domElement.getBoundingClientRect();
    raycaster.setFromCamera(
      new THREE.Vector2(
        ((event.clientX - rect.left) / rect.width) * 2 - 1,
        (-(event.clientY - rect.top) / rect.height) * 2 + 1,
      ),
      camera,
    );
    const candidates = [
      ...observed.values(),
      ...hidden.filter((node) => node.visible),
    ];
    const hit = raycaster.intersectObjects(candidates, true)[0];
    let node = hit?.object;
    while (node && !node.userData.is_carton) node = node.parent;
    if (node?.userData.image_id) onSelect(node.userData.image_id);
  });
  renderer.domElement.addEventListener("keydown", (event) => {
    if (event.key !== "+" && event.key !== "-" && event.key !== "=") return;
    event.preventDefault();
    const offset = camera.position.clone().sub(controls.target);
    offset
      .multiplyScalar(event.key === "-" ? 1.1 : 0.9)
      .clampLength(controls.minDistance, controls.maxDistance);
    camera.position.copy(controls.target).add(offset);
    controls.update();
    requestRender();
  });
  function dispose() {
    if (disposed) return;
    disposed = true;
    cancelAnimationFrame(frame);
    resize.disconnect();
    visibility.disconnect();
    document.removeEventListener("visibilitychange", requestRender);
    controls.dispose();
    const materials = new Set();
    const geometries = new Set();
    scene.traverse((node) => {
      if (node.geometry) geometries.add(node.geometry);
      for (const material of Array.isArray(node.material)
        ? node.material
        : [node.material]) {
        if (material) materials.add(material);
      }
    });
    const textures = new Set();
    for (const material of materials) {
      for (const value of Object.values(material))
        if (value?.isTexture) textures.add(value);
      material.dispose();
    }
    for (const geometry of geometries) geometry.dispose();
    for (const texture of textures) texture.dispose();
    environment.dispose();
    renderer.dispose();
    renderer.domElement.remove();
  }
  renderer.domElement.addEventListener(
    "webglcontextlost",
    (event) => {
      event.preventDefault();
      dispose();
      onFailure(new Error("The browser lost its graphics context."));
    },
    { once: true },
  );
  container.append(renderer.domElement);
  setView("overview");
  setHypotheses(true, 1);
  stage.dataset.observedCartons = String(observed.size);
  stage.dataset.totalCartons = String(observed.size + hidden.length);
  stage.dataset.threeRevision = THREE.REVISION;
  stage.dataset.viewerStatus = "ready";
  stage.setAttribute("aria-busy", "false");
  return {
    select,
    setView,
    showGaps,
    setHypotheses,
    dispose,
    interact(enabled) {
      controls.enabled = enabled;
      renderer.domElement.tabIndex = enabled ? 0 : -1;
    },
    rotate(enabled) {
      controls.autoRotate = enabled;
      requestRender();
    },
    reset() {
      controls.autoRotate = false;
      showGaps(false);
      setHypotheses(true, 1);
      setView("overview");
      select(selectedId);
    },
    get state() {
      return { highlightInterior, missing, markGaps };
    },
  };
}
