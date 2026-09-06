# Supported estimate of total pallet stock

**Working estimate: 317 boxes — approximately 320.**

The selected model has **318 boxes when its inferred rear is fully
occupied**. Following the requested working assumption that one concealed box
is missing gives **317**. With zero through three missing,
the conditional interval is **315–318**.
Exactly one missing box is an explicit assumption, not a probability learned
from the photograph. The photograph still supplies **79 manually audited
visible instances**, used as anchors for this total-stock estimate.

## Why this is a materially different estimate

The initial 172/171 construction was an incomplete occlusion illustration and
did not validate support. It is superseded for estimation by a dense packing
with continuous horizontal course planes and rear completion. Cartons no
longer float between mismatched heights. Every scenario is checked together
for contact, centre-of-mass support, force balance and torque balance, followed
by an independent Blender Bullet gravity simulation.

The chosen assumptions are a **1200×1000×162 mm UK-size pallet**, ten courses,
and dense occupancy behind the photographed stepped front. The 1000 mm
dimension runs away from the camera. Carton fronts guide a joint camera and
column fit. Exposed protruding fronts are refined within available space while
preserving nonintersection and whole-stack support. The front setbacks are
continued to the assumed pallet rear, filling each column with whole boxes.
Each row count is the nearest integer to available depth divided by a nominal
carton depth around 138/166 mm. Available depth is then shared evenly among
that many whole boxes. This is a packing heuristic, not a globally optimal fit.

Seven/eight-wide patterns motivate rectangular-carton orientation candidates,
but the final approximation permits carton-size variation. Median model size
is approximately **142×160×142 mm**. These are
conditional model dimensions, not measured packaging specifications. The
column model simplifies staggered seams, particularly E3/E4; its front-space
refinement improves correspondence without inventing extra observed boxes.

## Full-stack arithmetic

Courses are numbered from the pallet upward; image groups A–K are a separate
labelling system. All 79 observed IDs appear once in the Blender export.

| Course | Observed | Assumed rear | Full total |
|---|---:|---:|---:|
| 1 | 8 | 40 | 48 |
| 2 | 8 | 40 | 48 |
| 3 | 10 | 37 | 47 |
| 4 | 7 | 30 | 37 |
| 5 | 8 | 28 | 36 |
| 6 | 8 | 23 | 31 |
| 7 | 7 | 17 | 24 |
| 8 | 8 | 11 | 19 |
| 9 | 7 | 11 | 18 |
| 10 | 8 | 2 | 10 |
| **Total** | **79** | **239** | **318** |

## The four supported scenarios

| Missing | Total | Removed IDs, cumulative | Static support |
|---|---:|---|---|
| 0 | 318 | None | Pass |
| 1 | 317 | HYP_L10_A1_R02 | Pass |
| 2 | 316 | HYP_L10_A1_R02, HYP_L09_B1_R02 | Pass |
| 3 | 315 | HYP_L10_A1_R02, HYP_L09_B1_R02, HYP_L08_C6_R02 | Pass |

The first removal is a concealed carton on the top rear-left. The second is
the rear carton immediately below that vacated position; neither carries a
remaining carton when removed. The third is an accessible rear carton in
course eight. Some cartons above that third gap bridge adjacent supports:
the least-supported remaining carton retains **55.6%**
base contact above the deck, and every carton centre lies at least
**9.2 mm**
inside its support polygon. It is not described as an unloaded removal.

All four configurations pass nonnegative contact-reaction and moment balance
for every body simultaneously. The calculation uses equal and opposite
forces at shared contact patches, so weight above cannot disappear. It also
passes **40** runs with independently varied carton masses between 0.5 and
1.5 times the reference mass. This finite sweep is sensitivity testing,
not a guarantee for every possible distribution of contents.

Blender Bullet simulated each configuration for ten seconds under 9.81 m/s²
gravity, using actual separate pallet deck boards. All four stayed within the
predeclared 5 mm peak displacement and 0.02 rad peak tilt limits, checked at
every simulation frame. Net movement over the final second stayed below 1 mm.
An unsupported control fell more than five metres, confirming that gravity
was running. See `gravity_validation.json` for the numerical results.

Selected removal candidates passed four subpixel ray samples per native image
pixel. The four final controlled ID-emission renders differ at **zero of
1,076,480 RGBA pixels**. This checks direct camera visibility; it is not a
claim that every possible lighting effect would remain identical. Pallet and
carton ID materials are emissive to isolate visibility from indirect lighting.

## Dimensional sensitivity belongs beside the estimate

The 315–318 interval concerns missing boxes **within the selected packing**.
It is not the full uncertainty interval for the actual pallet. Altering nominal
carton depths by ±10% changes how many whole boxes fit behind the observed
front. Those alternatives pass support checks, and their one-box removals are
individually checked for support and concealment. Their top-face residuals are
shown because depth changes affect photographed surfaces too.

| Nominal depth | Full stock | One missing | Median top fit | Top fit p95 |
|---|---:|---:|---:|---:|
| 0.90× | 337 | 336 | 11.00 px | 15.19 px |
| 0.95× | 326 | 325 | 10.34 px | 16.47 px |
| 1.00× | 318 | 317 | 10.05 px | 16.47 px |
| 1.05× | 302 | 301 | 10.05 px | 18.83 px |
| 1.10× | 277 | 276 | 11.23 px | 19.33 px |

This sweep uses the common unrefined column packing. The selected model also
refines protruding fronts; its top-fit residual therefore differs slightly from
the 1.00× row.

The resulting **276–336**
one-missing totals are a model sensitivity sweep, not a statistical confidence
interval or guaranteed physical bounds. Pallet type/orientation, extra rear
voids, a different layer plan, and unknown carton contents can widen uncertainty.
The useful planning statement is **about 320 boxes under the stated dense
UK-pallet packing assumption**, with 317 as the selected one-missing scenario.

## Fit and independent checks

Front-corner distance RMS: **2.87 px median,
5.80 px p95**. Top-corner RMS:
**10.34 px median,
15.19 px p95**. Top corners are less certain and
include approximate/inferred boundaries. These are residuals against the
manual tracing, not independent measurement accuracy. Photographic textures
are for correspondence and cannot validate hidden geometry. The fitted view
also exposes 11064 exact ID-colour pixels
of assumed fill; these are reconstruction mismatch, not additional observations.

Verification includes zero carton intersections, all 79 IDs visible in the
diagnostic render, GLB node counts, packed original-image hash, and reopening
the actual `.blend`. Its four named view layers contain 318/317/316/315 cartons;
the one-missing view layer is enabled by default. Five mechanism tests include
floating, individually tipping, and jointly overturning counterexamples.

The models assume rigid boxes with centred contents and an anchored pallet.
They do not test cardboard crushing strength, uneven contents, pallet flex,
removal dynamics, wrapping, forklift accelerations, or safe warehouse handling.
The real total remains unmeasured; physical plausibility improves the estimate
without converting unseen geometry into photographic fact.

## Sources and provenance

- [LPR UK100 specification](https://www.lpr.eu/app/uploads/sites/3/2024/04/UK100-LPR-EN-PRODUCT-INFO-FILES-WOODEN-PALLET.pdf): 1200×1000×162 mm. This motivates the selected scale; it does not identify the photographed pallet.
- [LPR Euro PR080 specification](https://www.lpr.eu/product/wooden-euro-pallet-pr080/): alternative 1200×800 mm format. Red colour alone does not identify type or orientation.
- [Modern Robotics, transport of an assembly](https://modernrobotics.northwestern.edu/nu-gm-book-resource/12-3-transport-of-an-assembly/): contact forces and external gravity must balance for each body in an assembly.
- [Blender rigid-body world documentation](https://docs.blender.org/manual/en/latest/physics/rigid_body/world.html): simulation substeps and solver iterations govern the numerical settling check.

Original photograph: `datasets/boxes_to_count.jpg`, 841×1280, no EXIF calibration.
SHA-256: `3ac1e327fa1429fca0b54e816e84c33c9fcfe49284a9affd810c50243be733c1`. No generative image enhancement was used.
