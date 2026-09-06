import * as THREE from "three";
import { GLTFLoader } from "three/addons/loaders/GLTFLoader.js";

// A small event-rendered 3D brand mark. The supplied-model poster is always a fallback.
export async function startLogo() {
  const host = document.getElementById("brand-avatar");
  if (!host || navigator.connection?.saveData) return;
  let renderer;
  let frame = 0;
  let stopped = false;
  let model;
  let resize;
  let visibility;
  let active = true;
  const scene = new THREE.Scene();
  try {
    renderer = new THREE.WebGLRenderer({
      alpha: true,
      antialias: true,
      preserveDrawingBuffer: true,
    });
    renderer.setPixelRatio(Math.min(devicePixelRatio, 1.5));
    renderer.outputColorSpace = THREE.SRGBColorSpace;
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1.15;
    renderer.domElement.setAttribute("aria-hidden", "true");
    const response = await fetch("/brand/tropical-crown-logo.glb", {
      signal: AbortSignal.timeout(15000),
    });
    if (!response.ok) throw new Error("Logo unavailable");
    model = (
      await new GLTFLoader().parseAsync(await response.arrayBuffer(), "/brand/")
    ).scene;
    const bounds = new THREE.Box3().setFromObject(model);
    const center = bounds.getCenter(new THREE.Vector3());
    const size = bounds.getSize(new THREE.Vector3());
    model.position.sub(center);
    scene.add(model);
    scene.add(new THREE.HemisphereLight(0xffffff, 0xb9a28a, 2.2));
    for (const [color, intensity, position] of [
      [0xfff0df, 2, [-3, 5, 6]],
      [0xe4efff, 1.1, [4, 3, 4]],
      [0xffffff, 1.7, [2, 4, -4]],
    ]) {
      const light = new THREE.DirectionalLight(color, intensity);
      light.position.set(...position);
      scene.add(light);
    }
    const camera = new THREE.PerspectiveCamera(30, 1, 0.1, 50);
    camera.position.set(
      0,
      0.05,
      (size.y * 1.09) / (2 * Math.tan(Math.PI / 12)),
    );
    camera.lookAt(0, 0, 0);
    function draw() {
      if (stopped || !active || document.hidden || frame) return;
      frame = requestAnimationFrame(() => {
        frame = 0;
        renderer.render(scene, camera);
        host.dataset.logoStatus = "ready";
      });
    }
    document.addEventListener("visibilitychange", draw);
    resize = new ResizeObserver(() => {
      renderer.setSize(host.clientWidth, host.clientHeight, false);
      camera.aspect = host.clientWidth / host.clientHeight;
      camera.updateProjectionMatrix();
      draw();
    });
    resize.observe(host);
    visibility = new IntersectionObserver(([entry]) => {
      active = entry.isIntersecting;
      draw();
    });
    visibility.observe(host);
    const brand = host.closest(".brand");
    const reduced = matchMedia("(prefers-reduced-motion: reduce)");
    brand.addEventListener("pointermove", (event) => {
      if (reduced.matches || event.pointerType !== "mouse") return;
      const rect = host.getBoundingClientRect();
      model.rotation.y =
        THREE.MathUtils.clamp(
          (event.clientX - rect.left) / rect.width - 0.5,
          -0.5,
          0.5,
        ) * 0.4;
      draw();
    });
    brand.addEventListener("pointerleave", () => {
      model.rotation.y = 0;
      draw();
    });
    renderer.domElement.addEventListener(
      "webglcontextlost",
      (event) => {
        event.preventDefault();
        dispose();
        host.dataset.logoStatus = "fallback";
      },
      { once: true },
    );
    function dispose() {
      if (stopped) return;
      stopped = true;
      cancelAnimationFrame(frame);
      resize?.disconnect();
      visibility?.disconnect();
      document.removeEventListener("visibilitychange", draw);
      const geometries = new Set();
      const materials = new Set();
      const textures = new Set();
      scene.traverse((node) => {
        if (node.geometry) geometries.add(node.geometry);
        for (const m of Array.isArray(node.material)
          ? node.material
          : [node.material])
          if (m) materials.add(m);
      });
      for (const m of materials) {
        for (const value of Object.values(m))
          if (value?.isTexture) textures.add(value);
        m.dispose();
      }
      for (const g of geometries) g.dispose();
      for (const t of textures) t.dispose();
      renderer.dispose();
      renderer.domElement.remove();
    }
    host.append(renderer.domElement);
    draw();
  } catch {
    renderer?.dispose();
    renderer?.domElement.remove();
    host.dataset.logoStatus = "fallback";
  }
}
