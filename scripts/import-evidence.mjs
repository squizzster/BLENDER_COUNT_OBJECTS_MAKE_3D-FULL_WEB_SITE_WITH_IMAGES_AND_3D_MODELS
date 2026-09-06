import {
  copyFileSync,
  readFileSync,
  writeFileSync,
  mkdirSync,
  existsSync,
  unlinkSync,
} from "node:fs";
import { resolve } from "node:path";
import { createHash } from "node:crypto";
import { execFileSync } from "node:child_process";
import sharp from "sharp";

const source = resolve(process.argv[2] || "../BLENDER_COUNT_OBJECTS_MAKE_3D");
const output = resolve("public/evidence");
mkdirSync(output, { recursive: true });
const artifacts = resolve(source, "artifacts/supported_stock_estimate");
const experiment = resolve(source, "experiments/supported_stock_estimate");
const files = [
  ["boxes_to_count.jpg", resolve(source, "datasets/boxes_to_count.jpg")],
  ...[
    "pallet_reconstruction.blend",
    "pallet_reconstruction.glb",
    "observed_cartons.glb",
    "visible_cartons_annotated.png",
    "photo_surface_reconstruction.png",
    "neutral_geometry.png",
    "overview.png",
    "rear_uncertainty_audit.png",
    "reconstruction_comparison.jpg",
    "geometry_overlay.png",
    ...Array.from({ length: 4 }, (_, i) => `visibility_scenario_${i}.png`),
    ...Array.from({ length: 4 }, (_, i) => `scenario_${i}_rear.png`),
    "audit.json",
    "supported_estimate.json",
    "gravity_validation.json",
    "saved_blend_verification.json",
  ].map((name) => [name, resolve(artifacts, name)]),
  ["report.md", resolve(experiment, "REPORT.md")],
  [
    "visible_inventory.json",
    resolve(
      source,
      "experiments/single_view_reconstruction/visible_inventory.json",
    ),
  ],
];
const read = (name) => JSON.parse(readFileSync(resolve(output, name), "utf8"));
if (existsSync(resolve(output, "manifest.json"))) {
  for (const old of read("manifest.json")) {
    if (
      old.file !== "case-study.json" &&
      !files.some(([name]) => name === old.file)
    )
      unlinkSync(resolve(output, old.file));
  }
}
const manifest = [];
for (const [name, path] of files) {
  copyFileSync(path, resolve(output, name));
  const data = readFileSync(path);
  manifest.push({
    file: name,
    bytes: data.length,
    sha256: createHash("sha256").update(data).digest("hex"),
  });
}
// Compressed presentation images are separate from the unchanged evidence PNGs.
for (const name of [
  "overview",
  "rear_uncertainty_audit",
  ...Array.from({ length: 4 }, (_, i) => `scenario_${i}_rear`),
]) {
  const file = `${name}.webp`;
  await sharp(resolve(output, `${name}.png`))
    .resize({ width: 1000, withoutEnlargement: true })
    .webp({ quality: 84 })
    .toFile(resolve(output, file));
  const data = readFileSync(resolve(output, file));
  manifest.push({
    file,
    bytes: data.length,
    sha256: createHash("sha256").update(data).digest("hex"),
  });
}
const reconstruction = read("supported_estimate.json");
const inventory = read("visible_inventory.json");
const audit = read("audit.json");
const notes = {
  D3: "The narrow label on its right belongs to this carton, not another box.",
  B2: "A separate carton partly concealed by the protruding labelled carton B3.",
  B3: "The front and right side are two surfaces of one carton. Its protrusion is fitted within available space.",
  H1: "Identified mainly from its exposed top. Its front is concealed.",
  H2: "Identified mainly from its exposed top. Its front is concealed.",
  H3: "The stepped-back carton at the right. Counted here, not again in group I.",
  E3: "A protruding carton refined across the empty space in front of the next column. The nearby stagger is approximate.",
  E4: "Partly occluded behind E3. The column model approximates this staggered boundary.",
  E7: "Shadowed face: boundary interpretation was reviewed independently.",
  I1: "The boundary with J1 is faint. Retained as a separate carton after review.",
  J1: "The boundary above is faint; the lower seam is clearer. See the original pixels.",
};
const data = {
  schemaVersion: 2,
  study: "Pallet / 001",
  date: "2026-09-06",
  sourceCommit: execFileSync("git", ["rev-parse", "HEAD"], {
    cwd: source,
    encoding: "utf8",
  }).trim(),
  sourceImage: "boxes_to_count.jpg",
  imageSize: [841, 1280],
  conclusion: {
    visible: 79,
    front: 77,
    top: 2,
    total: "estimated",
    estimate: reconstruction.estimated_count,
    full: reconstruction.full_count,
    range: reconstruction.conditional_range,
    depthSensitivity: reconstruction.depth_sensitivity_range,
  },
  inventory,
  audit,
  assumptions: {
    palletMM: [1200, 1000, 162],
    courses: 10,
    cameraHeightM: reconstruction.camera_position_m[2],
  },
  hypotheses: {
    full: reconstruction.full_count,
    hidden: reconstruction.hidden_hypothesis_boxes.length,
    removals: reconstruction.removals,
    scenarios: reconstruction.scenarios.map((s) => ({
      missing: s.missing,
      count: s.count,
      removedIds: s.removed_ids,
      minimumBaseContact: s.support.minimum_contact_fraction_above_deck,
      minimumCentroidMarginMM:
        s.support.minimum_centroid_support_margin_m * 1000,
      supported: s.support.cartons,
      staticPassed: s.support.feasible,
      massChecks: s.mass_sensitivity.length,
      gravity: audit.gravity.checks.find((g) => g.missing === s.missing),
    })),
  },
  boxes: reconstruction.boxes.map((box) => ({
    id: box.id,
    pixel: inventory.groups[box.id[0]][Number(box.id.slice(1)) - 1],
    sizeMM: box.size_m.map((v) => Math.round(v * 1000)),
    layerHypothesis: box.physical_layer_hypothesis,
    fitRMSE: box.front_corner_rmse_px * Math.sqrt(2),
    note:
      notes[box.id] ||
      "Distinct observed carton. Its model dimensions and unseen depth remain conditional assumptions.",
    review: Boolean(notes[box.id]),
  })),
  courses: reconstruction.courses,
  depthSensitivity: reconstruction.depth_sensitivity.map((s) => ({
    factor: s.nominal_depth_factor,
    full: s.full_count,
    estimate: s.one_missing_count,
    topMedianPX: s.image_fit.top_median_px,
    topP95PX: s.image_fit.top_p95_px,
    supportPassed: s.one_missing_support.feasible,
  })),
  downloads: manifest,
};
writeFileSync(
  resolve(output, "case-study.json"),
  JSON.stringify(data, null, 2) + "\n",
);
const derived = readFileSync(resolve(output, "case-study.json"));
manifest.push({
  file: "case-study.json",
  bytes: derived.length,
  sha256: createHash("sha256").update(derived).digest("hex"),
});
writeFileSync(
  resolve(output, "manifest.json"),
  JSON.stringify(manifest, null, 2) + "\n",
);
console.log(
  `Imported ${manifest.length} assets: ${data.conclusion.estimate} estimated total; ${data.conclusion.range.join("–")} in the selected packing.`,
);
