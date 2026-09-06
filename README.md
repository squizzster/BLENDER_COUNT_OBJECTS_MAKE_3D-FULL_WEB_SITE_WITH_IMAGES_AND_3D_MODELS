# Pallet / 001

**Mode: ALPHA** · An interactive evidence showcase for a single-image carton-counting study.

[Live study](https://lively-gaufre-7166ed.netlify.app/) · [Complete findings](public/evidence/report.md)

The photograph supports **79 manually audited visible carton instances**: 77 front-dominant and two top-dominant. The full physical inventory, including concealed cartons, remains unresolved. The 172- and 171-carton models demonstrate occlusion; neither is an inventory estimate or a validated physical packing.

The site pairs a selectable photographic inventory with the actual Blender GLB, a source/render comparison, a controlled visibility experiment, and downloadable evidence. Branding uses `#FF3A00`, black, white, neutral greys, Inter, and Space Grotesk. Reconstruction imagery retains the source photograph's colours.

## Run and verify

Use Node.js 24 LTS and npm. The lockfile fixes the dependency graph.

```bash
npm ci
npm run dev
```

```bash
npm run lint
npm run format:check
npm run build
npx playwright install chromium
npm test
npm run test:clean
```

The production build independently checks every evidence asset's SHA-256, inventory IDs, both GLB carton counts and embedded textures, the saved Blender verification record, and all 1,076,480 RGBA pixels in the controlled render pair. Integrity checks establish consistency of the deliverables, not the real concealed stock.

Browser checks exercise the actual GLB in desktop and mobile Chromium layouts, linked selection, hypothesis visibility, camera controls, separation/reset, the comparison slider, downloads, loading failures and retry, and automated WCAG AA checks. Mobile tests emulate a viewport and touch input; they are not physical-device certification. Manual visual inspection complements automation.

Playwright runs one browser worker at a time using **Mesa llvmpipe on the CPU**. `scripts/software-browser.mjs` passes `--enable-gpu` for normal driver selection, restricts Vulkan/EGL driver discovery to Mesa, and disables SwiftShader fallback. Tests assert the reported renderer is llvmpipe. On Ubuntu, install `mesa-vulkan-drivers libegl-mesa0`; equivalent Mesa packages are required on other Linux distributions. Testing fails if these drivers are missing. SwiftShader is deliberately excluded after a reproducible native JIT crash in the development host. See the [ALPHA validation record](docs/ALPHA_VALIDATION.md).

## Structure

- `src/main.js`: one selection path shared by photograph, dropdown, and 3D picking; comparison and display state.
- `src/viewer.js`: exported-node classification, Three.js rendering and controls, resource lifecycle, and context-loss fallback.
- `src/style.css`: responsive brand styling, visible focus, reduced motion.
- `public/evidence/`: the explicitly published study assets, provenance and checksums. These generated artifacts are intentionally versioned because they are the website's deliverable.
- `scripts/import-evidence.mjs`: explicit import from the separate research project; regenerates the study metadata and manifest.
- `scripts/verify-evidence.mjs`: release integrity checks, also run by Netlify before building.
- `tests/`: browser integration and accessibility checks.

Static images and downloads remain useful when interactive loading fails. The viewer uses **Three.js r180**, WebGLRenderer, GLTFLoader, OrbitControls, RoomEnvironment/PMREM, and ACES Filmic tone mapping. It loads separately from the page code, pauses offscreen, caps its pixel ratio at 1.5, and starts without automatic rotation. Fonts and evidence are served locally, with no third-party tracking.

## Evidence updates

The research code lives in a separate project, `BLENDER_COUNT_OBJECTS_MAKE_3D`. This website does not rerun geometry fitting or Blender during deployment. To import a newly reviewed research run:

```bash
node scripts/import-evidence.mjs ../BLENDER_COUNT_OBJECTS_MAKE_3D
npm run build
npm test
```

Review the imported findings, numerical claims in `index.html`, model classification, and rendered images together before committing. Model widths, depths, heights, pallet scale, and course count are conditional assumptions; visually fitted geometry cannot establish unseen occupancy or stability.

## Deployment

The existing Netlify site builds `main` from this repository using `npm run build` and publishes `dist/`. `netlify.toml` records Node 24 and asset headers. Use a feature branch, a reviewed pull request, passing checks, and merge to `main`; verify the resulting live page and evidence checksums after deployment.

The ALPHA label reflects the website release stage. It does not certify an exact total stock count or the model's physical stability. See the complete findings for the measurement assumptions and unresolved evidence.
