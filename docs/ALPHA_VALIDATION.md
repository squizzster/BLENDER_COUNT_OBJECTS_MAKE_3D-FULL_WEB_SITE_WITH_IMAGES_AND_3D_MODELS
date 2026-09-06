# ALPHA release validation

Release: `0.2.0-alpha.2` · 2026-09-06 · Three.js r180 · Node 24

**317 estimated boxes, approximately 320**, assuming one concealed carton is missing from a fully occupied 318-box model. The 79 observed instances anchor the reconstruction. Zero–three removals give 315–318 within the selected packing; the nominal-depth sensitivity sweep gives 276–336. Neither range is a statistical confidence interval or guaranteed bound on real inventory. This replaces the earlier 172/171 occlusion illustration.

| Check                                     | Result                                                                                        |
| ----------------------------------------- | --------------------------------------------------------------------------------------------- |
| Published evidence SHA-256 and sizes      | 32 assets match the manifest                                                                  |
| Photograph identity                       | Matches the original 841×1280 source hash                                                     |
| Observed IDs                              | 79 distinct, represented in the GLB and diagnostic render                                     |
| Independently parsed carton nodes         | 79 observed-only; 318 complete positions                                                      |
| Cumulative supported scenarios            | 318 / 317 / 316 / 315                                                                         |
| Model intersections / unsupported cartons | 0 / 0                                                                                         |
| Coupled static force and moment balance   | All four scenarios pass                                                                       |
| Independently varied carton masses        | 40 finite sensitivity checks pass                                                             |
| Blender Bullet gravity                    | All four ten-second runs pass; peak movement below 5 mm, net final-second movement below 1 mm |
| Gravity mechanism control                 | Unsupported body falls; negative static-support fixtures fail as expected                     |
| Controlled camera visibility              | Four decoded renders agree at all 1,076,480 RGBA pixels                                       |
| Saved Blender state                       | Reopened; geometry and original image hash verified; one-missing layer is the default         |
| Browser integration                       | 22 passed, 2 deliberate project-specific skips                                                |
| Real 3D picking and linked selection      | Passed in desktop and mobile layouts                                                          |
| Scenario/reset consistency                | Both sets of controls, visible counts, support readouts and images agree                      |
| Load failure and context loss             | Static evidence retained; retry restores one working canvas and current scenario              |
| Supplied mini-head                        | Actual GLB renders; context loss restores the poster without affecting the study              |
| Portrait scrolling                        | Touch swipe over inactive model scrolls the page; explicit interaction toggle works           |
| Responsive widths                         | 320, 390, 768, 1024 and 1440 CSS pixels                                                       |
| Automated WCAG A/AA checks                | No detected violations, including expanded evidence panels                                    |

The integrity verifier parses the real model files and PNG pixel arrays independently of the UI. Static mechanics and gravity records come from the research pipeline; website checks do not rerun those solvers. Geometry remains in fixed positions in the viewer. The **See-through interior** switch alternates faint transparent volumes with pale edges and solid cardboard. Observed cartons stay opaque. Transparent inferred meshes neither write opaque depth nor cast solid shadows, and pointer picking reaches the observed cartons behind them. Both materials are disposed on context loss. Counts, geometry and support remain unchanged. Orange gap outlines are inspection markers, not cartons.

Playwright uses one Chromium worker with **Mesa llvmpipe CPU rendering**. `--enable-gpu` permits driver selection, while Vulkan/EGL discovery is explicitly restricted to Mesa and SwiftShader fallback is disabled. Tests inspect the WebGL renderer string. No SELinux, NVIDIA driver, kernel-module or reboot settings were changed.

Manual visual inspection covers the supplied mini-head, desktop and portrait hero, transparent and solid interior views from the front and rear, the supported model, course arithmetic, and the rear-removal scenarios. The source photograph and all scientific PNGs remain downloadable. Narrow photo panels retain readable labels through horizontal inspection; labels can be disabled to fit the full photograph.

The shared Three.js/GLTFLoader chunk is approximately 144 kB gzipped, plus small viewer and logo modules. The supplied mini-head is reduced from 3.5 MB to approximately 0.82 MB. WebP rear previews reduce transfer size; the original PNGs remain unchanged. Both 3D views cap pixel ratio at 1.5 and pause offscreen. The logo renders on events, without a continuous idle loop. It keeps the poster when the browser requests data saving.

Validation also includes an isolated dependency installation, lint/format checks, production build and primary browser workflow. The clean-install log is retained locally in an ignored project temporary directory. GitHub CI repeats the release checks on Ubuntu before merge; production assets are checked after Netlify deployment.

These checks establish consistency, physical plausibility under the model assumptions, usability and recovery. They do not certify carton crushing strength, transport safety or the actual hidden stock. Browser mobile emulation does not replace physical-device testing, and automated accessibility checks do not replace an assistive-technology audit. See the [research findings](../public/evidence/report.md) for the residuals, assumptions and limitations.
