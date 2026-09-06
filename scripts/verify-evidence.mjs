import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { readFile, readdir } from "node:fs/promises";
import { PNG } from "pngjs";

const evidence = new URL("../public/evidence/", import.meta.url);
const read = (file) => readFile(new URL(file, evidence));
const json = async (file) => JSON.parse(await read(file));
const manifest = await json("manifest.json");
assert.equal(new Set(manifest.map((a) => a.file)).size, manifest.length);
for (const asset of manifest) {
  assert.match(asset.file, /^[a-z0-9_.-]+$/);
  const data = await read(asset.file);
  assert.equal(data.length, asset.bytes, `${asset.file}: size`);
  assert.equal(
    createHash("sha256").update(data).digest("hex"),
    asset.sha256,
    `${asset.file}: checksum`,
  );
}
assert.deepEqual(
  (await readdir(evidence)).sort(),
  [...manifest.map((a) => a.file), "manifest.json"].sort(),
);
const study = await json("case-study.json");
const reconstruction = await json("supported_estimate.json");
const inventory = await json("visible_inventory.json");
const audit = await json("audit.json");
const gravity = await json("gravity_validation.json");
assert.equal(study.schemaVersion, 2);
assert.deepEqual(study.inventory, inventory);
assert.deepEqual(study.audit, audit);
const ids = Object.entries(inventory.groups)
  .flatMap(([g, positions]) => positions.map((_, i) => `${g}${i + 1}`))
  .sort();
assert.equal(ids.length, 79);
assert.equal(new Set(ids).size, 79);
assert.deepEqual(study.boxes.map((b) => b.id).sort(), ids);
assert.equal(study.conclusion.total, "estimated");
assert.equal(study.conclusion.visible, 79);
assert.equal(study.conclusion.estimate, reconstruction.full_count - 1);
assert.deepEqual(study.conclusion.range, [
  reconstruction.full_count - 3,
  reconstruction.full_count,
]);
assert.equal(reconstruction.boxes.length, 79);
assert.equal(
  reconstruction.hidden_hypothesis_boxes.length,
  study.hypotheses.hidden,
);
assert.equal(
  audit.source_sha256,
  manifest.find((a) => a.file === study.sourceImage).sha256,
);
assert.deepEqual(Object.keys(audit.observed_render_pixel_counts).sort(), ids);
assert.ok(
  Object.values(audit.observed_render_pixel_counts).every((p) => p > 0),
);
assert.deepEqual(audit.box_intersections, []);
assert.equal(audit.mass_checks_passed, 40);
assert.ok(audit.all_static_scenarios_passed && gravity.all_passed);
assert.equal(gravity.checks.length, 4);
for (const scenario of reconstruction.scenarios) {
  const { missing, count, support } = scenario;
  assert.equal(count, reconstruction.full_count - missing);
  assert.equal(scenario.removed_ids.length, missing);
  assert.deepEqual(
    scenario.removed_ids,
    reconstruction.removals.slice(0, missing).map((r) => r.id),
  );
  assert.ok(support.feasible);
  assert.deepEqual(support.unsupported_ids, []);
  assert.ok(support.minimum_centroid_support_margin_m >= 0.002);
  assert.ok(support.minimum_contact_fraction_above_deck >= 0.55);
  assert.ok(support.maximum_equilibrium_residual < 1e-6);
  assert.equal(scenario.mass_sensitivity.length, 10);
  assert.ok(scenario.mass_sensitivity.every((s) => s.feasible));
  const settled = gravity.checks.find((g) => g.missing === missing);
  assert.equal(settled.cartons, count);
  assert.ok(settled.passed && settled.unsupported_control_drop_m > 5);
  assert.ok(settled.peak_displacement_all_frames_mm < 5);
  assert.ok(settled.maximum_motion_last_second_mm < 1);
}
for (const alternative of reconstruction.depth_sensitivity) {
  assert.ok(
    alternative.support.feasible && alternative.one_missing_support.feasible,
  );
  assert.ok(alternative.image_fit.top_median_px > 0);
}
for (const [file, count] of [
  ["pallet_reconstruction.glb", reconstruction.full_count],
  ["observed_cartons.glb", 79],
]) {
  const data = await read(file);
  assert.equal(data.subarray(0, 4).toString(), "glTF");
  assert.equal(data.readUInt32LE(4), 2);
  assert.equal(data.readUInt32LE(8), data.length);
  const gltf = JSON.parse(data.subarray(20, 20 + data.readUInt32LE(12)));
  const cartons = gltf.nodes.filter((n) => n.extras?.is_carton);
  assert.equal(cartons.length, count);
  assert.deepEqual(
    cartons
      .filter((n) => n.extras.image_id)
      .map((n) => n.extras.image_id)
      .sort(),
    ids,
  );
  assert.ok(
    gltf.images.length &&
      gltf.images.every((i) => Number.isInteger(i.bufferView) && !i.uri),
  );
  assert.ok(gltf.buffers.every((b) => !b.uri));
  if (file === "pallet_reconstruction.glb") {
    for (const [index, removal] of reconstruction.removals.entries()) {
      const node = cartons.find((n) => n.name === removal.id);
      assert.ok(node && !node.extras.image_id);
      assert.equal(node.extras.removed_from_scenario, index + 1);
    }
  }
}
const a = PNG.sync.read(await read("visibility_scenario_0.png"));
assert.deepEqual([a.width, a.height], [841, 1280]);
for (let i = 1; i <= 3; i++) {
  const b = PNG.sync.read(await read(`visibility_scenario_${i}.png`));
  assert.deepEqual(a.data, b.data, `Scenario ${i} visibility differs`);
}
assert.deepEqual(audit.scenario_differing_rgba_pixels, [0, 0, 0, 0]);
const saved = await json("saved_blend_verification.json");
assert.ok(saved.passed && saved.maximum_geometry_error_m < 1e-6);
assert.equal(saved.default_missing, 1);
assert.deepEqual(
  saved.view_layers.map((v) => v.cartons),
  reconstruction.scenarios.map((s) => s.count),
);
assert.equal(saved.packed_source_sha256, audit.source_sha256);
assert.ok((await read("pallet_reconstruction.blend")).length > 100000);
const brand = new URL("../public/brand/", import.meta.url);
const provenance = JSON.parse(
  await readFile(new URL("provenance.json", brand)),
);
const logo = await readFile(new URL("tropical-crown-logo.glb", brand));
assert.equal(
  createHash("sha256").update(logo).digest("hex"),
  provenance.logo_sha256,
);
assert.ok(logo.length < 1000000);
console.log(
  `Verified ${manifest.length} evidence assets; supported scenarios ${reconstruction.scenarios.map((s) => s.count).join("/")}; 79 observed IDs; four pixel-identical renders; supplied 3D logo.`,
);
