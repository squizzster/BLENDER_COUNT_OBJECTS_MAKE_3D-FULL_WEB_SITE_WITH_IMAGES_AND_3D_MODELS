import { copyFileSync, readFileSync, writeFileSync, mkdirSync } from "node:fs";
import { resolve, basename } from "node:path";
import { createHash } from "node:crypto";

const source = resolve(process.argv[2] || "../BLENDER_COUNT_OBJECTS_MAKE_3D");
const output = resolve("public/evidence");
mkdirSync(output, { recursive: true });
const artifacts = resolve(source, "artifacts/single_view_reconstruction");
const experiment = resolve(source, "experiments/single_view_reconstruction");
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
    "visibility_hypothesis_a.png",
    "visibility_hypothesis_b.png",
    "audit.json",
    "scale_hypothesis_sweep.json",
    "saved_blend_verification.json",
    "reconstruction.json",
  ].map((name) => [name, resolve(artifacts, name)]),
  ["report.md", resolve(experiment, "REPORT.md")],
  ["visible_inventory.json", resolve(experiment, "visible_inventory.json")],
];
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
const read = (name) => JSON.parse(readFileSync(resolve(output, name), "utf8"));
const reconstruction = read("reconstruction.json");
const inventory = read("visible_inventory.json");
const audit = read("audit.json");
const notes = {
  D3: "The narrow label on its right side belongs to this carton. It is not another box.",
  B2: "A separate carton partly concealed by the protruding labelled carton B3.",
  B3: "The front and right side are two surfaces of one carton.",
  H1: "Identified mainly from its exposed top. Its front is concealed.",
  H2: "Identified mainly from its exposed top. Its front is concealed.",
  H3: "The stepped-back carton at the right. Counted here, not again in group I.",
  E7: "Shadowed face: boundary interpretation was reviewed independently.",
  I1: "The boundary with J1 is faint. Retained as a separate carton after review.",
  J1: "The boundary above is faint; the lower seam is clearer. See the original pixels.",
};
const data = {
  study: "Pallet / 001",
  date: "2026-09-06",
  sourceCommit: "228b25f",
  sourceImage: "boxes_to_count.jpg",
  imageSize: [841, 1280],
  conclusion: {
    visible: audit.visible_inventory,
    total: "unresolved",
    front: 77,
    top: 2,
  },
  inventory,
  audit,
  assumptions: {
    palletMM: [1200, 1000, 162],
    courses: 10,
    cameraHeightM: reconstruction.camera_position_m[2],
  },
  hypotheses: {
    a: audit.hypothesis_a_cartons,
    b: audit.hypothesis_b_cartons,
    hidden: reconstruction.hidden_hypothesis_boxes.length,
    removedId: reconstruction.counterexample_removed_id,
  },
  boxes: reconstruction.boxes.map((box) => ({
    id: box.id,
    pixel: inventory.groups[box.id[0]][Number(box.id.slice(1)) - 1],
    sizeMM: box.size_m.map((v) => Math.round(v * 1000)),
    layerHypothesis: box.physical_layer_hypothesis,
    fitRMSE: box.front_corner_rmse_px * Math.sqrt(2),
    note:
      notes[box.id] ||
      "Distinct visible carton. Its unseen depth remains a modelling assumption.",
    review: Boolean(notes[box.id]),
  })),
  scaleSweep: read("scale_hypothesis_sweep.json"),
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
  `Imported ${files.length} verified study assets into ${basename(output)}.`,
);
