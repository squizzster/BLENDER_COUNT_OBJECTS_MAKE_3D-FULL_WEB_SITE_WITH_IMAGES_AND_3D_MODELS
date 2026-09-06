# Pallet photograph: findings and verification

**Audited visible count: 79 cartons. Actual total: unresolved.**

This conclusion concerns `datasets/boxes_to_count.jpg`, an 841 × 1280 photograph
with no EXIF camera calibration. Two independent visual passes identified 77
cartons with substantial front faces and two seen mainly from above. An exact
total cannot be certified because the image does not reveal the entire rear
or interior of the load.

## Visible inventory

| Image group | Cartons |
|---|---:|
| A | 8 |
| B | 7 |
| C | 8 |
| D | 7 |
| E | 8 |
| F | 8 |
| G | 7 |
| H | 3 |
| I | 7 |
| J | 8 |
| K | 8 |
| **Total visible** | **79** |

Groups identify positions on the image, not physical courses. H1 and H2 show
mainly their tops. D3's narrow right-side label is part of D3, not an extra box.
B2 is partly hidden by B3. H3 is the stepped-back carton on the right and is
not counted again in group I. E7 is shadowed; the I1/J1 boundary is faint.
These review notes are retained on the annotated photo and in the measurements.

The 79 count is a human-audited interpretation of visible boundaries. It is not
a supplier inventory record or a certification of the full load.

## Reconstruction and scale

The candidate uses a 1200 × 1000 × 162 mm pallet, ten physical courses, a fitted
camera, and individually fitted rectangular carton fronts. The ten courses are
an input hypothesis. Under these assumptions, the camera is approximately
1.65 m high. Median final model carton dimensions are approximately
143 × 149 × 141 mm (front width × depth × height); these are conditional fitted
dimensions, not physical measurements. Box sizes vary in the approximation.

LPR's UK100 specification lists 1200 × 1000 × 162 mm. Its PR080 Euro pallet is
1200 × 800 × 144 mm. Both are red, so colour cannot identify the photographed
pallet. The photographed brand and frontage orientation are unconfirmed.
[UK100 manufacturer specification](https://www.lpr.eu/app/uploads/sites/3/2024/04/UK100-LPR-EN-PRODUCT-INFO-FILES-WOODEN-PALLET.pdf),
[PR080 manufacturer specification](https://www.lpr.eu/product/wooden-euro-pallet-pr080/).

Four frontage/scale hypotheses produced weighted coordinate fitting errors
around 2.7–3.0 pixels. These scores mix explicitly weighted residuals and are
neither probabilities nor independent accuracy measurements. The rear edge is
unobserved; some scale arrangements imply overhang. A low fit error therefore
cannot establish pallet type, occupied depth, or true box dimensions.

After removing cuboid intersections, the median per-carton front-corner distance
RMS error is **2.21 px**, with a **6.61 px** 95th percentile, against the manually
traced corners used for fitting. Occluded/estimated fronts are excluded from
this summary. These are fit residuals, not an accuracy guarantee. See the neutral
render and geometry overlay as well as the photo-textured visualization.

## Hidden-stock check

The model contains 79 observed cartons and 93 explicitly hypothetical cartons:
**172 model objects**. A second visibility configuration removes one concealed
bottom-course carton, giving **171**. The two controlled emission renders are
identical at all **1,076,480 pixels**. Neither total is offered as the real count,
a best estimate, a bound, or a validated complete packing.

This is an occlusion demonstration: the same visible surface image can accompany
different model object counts. It does not prove that either interior existed.
Global stability, rear completion, and contact support remain unvalidated.
The visibility experiment uses neutral ID emissions; lighting, arbitrary shadows,
and photographic texture projection do not create the equality result.

## Checks executed

- Independent visual inventory and review of likely front/side double counts.
- Arithmetic, unique IDs, source-image hash, and 79 Blender object mappings.
- Native-resolution ray sweeps filtering hypothetical fill behind observed geometry.
- All 79 observed IDs represented in the visibility render; zero exact magenta
  interior pixels from hypothetical fill.
- Exact RGBA comparison of the 172/171 controlled visibility images: zero differences.
- Zero observed-carton intersections exceeding 2 mm on all three axes.
- Four standard pallet frontage/scale fits, retained as a sensitivity sweep.
- Blender 5.2.1 Cycles OptiX rendering, packed source texture, and GLB export.

The saved `audit.json` is the numerical check record. The `.blend` file separates
observed cartons, hypothetical interiors, the pallet, and packaging detail into
named collections. The original photograph is packed into the file.

## What would resolve the total

A verified layer plan and rear occupancy, a physical inventory, or sufficient
additional viewpoints would add information this image lacks. Pallet dimensions
alone would improve scale without establishing hidden occupancy. A guaranteed
single total from this image would exceed the available evidence.
