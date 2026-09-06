# ALPHA release validation

Release: `0.1.0-alpha.1` · 2026-09-06 · Three.js r180 · Node 24

The release presents **79 manually audited visible carton instances**. The concealed total remains unresolved. Model counts of 172 and 171 are illustrative occlusion counterexamples, not actual stock counts or verified packings.

| Check                                         | Result                                                                               |
| --------------------------------------------- | ------------------------------------------------------------------------------------ |
| Website asset SHA-256 and size verification   | 20 assets match the manifest                                                         |
| Source photograph identity                    | Matches the research audit's SHA-256                                                 |
| Visible inventory and unique exported IDs     | 79                                                                                   |
| Independently parsed GLB carton nodes         | 79 observed-only; 172 with illustrative interior                                     |
| Embedded GLB texture and geometry             | Self-contained exports                                                               |
| Controlled render pair, decoded independently | 1,076,480 identical RGBA pixels                                                      |
| Browser integration                           | 17 passed; duplicate mobile width sweep intentionally skipped                        |
| Real 3D ray picking and linked selection      | Passed on desktop and mobile layouts                                                 |
| Failed model loading and retry                | Static evidence retained; retry restores viewer                                      |
| Deliberate WebGL context loss and retry       | Evidence retained; one working replacement canvas                                    |
| Automated WCAG A/AA checks                    | No detected violations at tested widths                                              |
| Responsive widths                             | 320, 390, 768, 1024, and 1440 pixels                                                 |
| Clean dependency installation                 | Isolated `npm ci`, lint, formatting, build and browser workflow passed               |
| Dependency audit                              | No reported vulnerabilities at release preparation                                   |
| Independent read-only review                  | Evidence claims and model classification reviewed; shared selection issues corrected |

Playwright uses Chromium 153 with one worker and **Mesa llvmpipe CPU rendering**. Its launch uses `--enable-gpu` to permit normal driver selection, while Vulkan/EGL discovery is explicitly restricted to Mesa and SwiftShader fallback is disabled. Tests inspect the actual WebGL renderer string. The development host's NVIDIA card reported 1 MiB usage and 0% utilization after the final test run. No SELinux, kernel module, or reboot changes were made.

Manual visual inspection covered desktop, tablet, mobile, the original photograph, neutral and textured reconstructions, and the hypothetical interior. Narrow photo panels preserve readable labels with horizontal inspection; labels can be disabled to fit the full photograph. The native source image and its annotation remain downloadable.

The page and renderer load in separate JavaScript chunks; the Three.js viewer is approximately 151 kB gzipped. Native evidence images are retained, so scrolling through the full study transfers several megabytes. A static rendered preview and direct downloads remain available when interactive loading fails. The browser view caps pixel ratio at 1.5 and pauses rendering offscreen.

These checks establish consistency, usability, and recoverability of the website and its evidence. Automated accessibility checks do not replace a complete assistive-technology audit; mobile emulation does not certify every physical device. Geometric dimensions, rear occupancy, and stability remain conditional or unverified as recorded in the [research findings](../public/evidence/report.md).
