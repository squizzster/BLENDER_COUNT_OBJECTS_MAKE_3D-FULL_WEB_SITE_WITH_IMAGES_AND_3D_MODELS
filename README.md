# Pallet / 001

**Mode: ALPHA** · A total-stock estimate from one photograph, with supported Blender scenarios and an interactive evidence study.

[Live study](https://lively-gaufre-7166ed.netlify.app/) · [Complete findings](public/evidence/report.md)

**Working estimate: 317 boxes, approximately 320.** The selected dense packing contains 318 positions: 79 observed and 239 inferred. Assuming one concealed carton is missing gives 317. Zero through three missing gives **315–318 within that packing**. Changing nominal carton depths by ±10% produces **276–336 one-missing totals**. These are conditional scenarios and a dimensional sensitivity sweep, not confidence intervals or measured inventory. The earlier 172/171 occlusion illustration is superseded.

The site combines a supported 3D stack, four realistic removal scenarios, course arithmetic, a selectable photographic inventory, source/render comparisons, and downloadable evidence. The supplied tropical-crown mini-head replaces the header wordmark alongside the retained box icon. Branding uses `#FF3A00`, black, white, neutral greys, Inter and Space Grotesk.

## Run and verify

Use Node.js 24 and npm; the lockfile fixes the dependency graph.

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

The build verifies every evidence asset's SHA-256 and size, observed IDs, actual GLB carton counts, embedded resources, all four decoded visibility renders, the saved Blender record, and recorded static/gravity checks. These checks establish consistency of the deliverables; they do not establish the true unseen inventory.

Browser tests cover desktop and portrait mobile layouts, real GLB picking, all four supported scenarios, reset, comparison controls, scrolling, downloads, failure/retry and context loss, the supplied head logo, and automated WCAG AA checks. Portrait users scroll normally over the model and opt into touch rotation with **Interact with 3D**. Camera buttons remain available without entering that mode.

Playwright runs one browser worker using **Mesa llvmpipe on the CPU**, with SwiftShader explicitly excluded. `scripts/software-browser.mjs` supplies `--enable-gpu` but restricts Vulkan/EGL discovery to Mesa. Tests inspect the actual renderer string. Ubuntu requires `mesa-vulkan-drivers libegl-mesa0`; use the equivalent Mesa packages on other Linux distributions. No NVIDIA, SELinux or kernel changes are needed. See the [validation record](docs/ALPHA_VALIDATION.md).

## Structure

- `src/main.js`: shared photograph/model selection and one scenario state for every control, count, rear image and support readout.
- `src/viewer.js`: Three.js r180, GLTFLoader, OrbitControls, RoomEnvironment/PMREM and ACES Filmic rendering. Inferred boxes stay in fixed support positions; the interior switch changes their colour. Optional outlines identify absent positions.
- `src/logo.js`: a separate, event-rendered mini-head with a transparent supplied-model poster fallback.
- `src/style.css`: responsive brand styling, visible focus and reduced motion.
- `public/evidence/`: explicitly published study assets and checksums. These generated artifacts are intentionally versioned as the website deliverable. WebP previews supplement unchanged scientific PNGs.
- `public/brand/`: the optimized supplied GLB, CPU Blender poster and source provenance.
- `scripts/import-evidence.mjs` and `scripts/verify-evidence.mjs`: evidence import and release integrity checks.
- `scripts/prepare-logo.py`: reproducible optimization of the user-supplied archive using Blender.
- `tests/`: browser integration and accessibility checks.

The model and logo cap pixel ratio at 1.5, stop rendering offscreen, and have no initial animation loop. Static scenarios, images and downloads remain useful when 3D fails. Fonts and assets are served locally, with no third-party tracking.

## Evidence updates

Research lives in the separate `BLENDER_COUNT_OBJECTS_MAKE_3D` project, under `experiments/supported_stock_estimate/`. This website does not fit geometry or run Blender during deployment.

```bash
node scripts/import-evidence.mjs ../BLENDER_COUNT_OBJECTS_MAKE_3D
npm run build
npm test
```

Import after the research artifacts and source commit are finalized. Review numerical claims in `index.html` against the imported evidence. The default scenario assumes a 1200×1000 mm UK-size pallet, ten courses, dense rear occupancy and rigid cartons with centred contents. Four shared-force/moment calculations, 40 varied-mass checks and four ten-second Bullet simulations support the model's physical plausibility. Carton strength, pallet flex and warehouse handling are outside that check.

To regenerate the header assets, run `scripts/prepare-logo.py` inside Blender and pass the path to `tropical-crown-website-kit.zip` after `--`. The script reads only the supplied GLB, simplifies its geometry and textures, and renders a transparent poster on the CPU.

## Deployment

Netlify builds `main` using `npm run build` and publishes `dist/`. Use a feature branch, a reviewed pull request and passing checks before merging; verify the deployed page and evidence checksums afterwards. `netlify.toml` records Node 24 and cache headers. The ALPHA label is the website's release stage; the inventory estimate remains conditional on the published assumptions.
