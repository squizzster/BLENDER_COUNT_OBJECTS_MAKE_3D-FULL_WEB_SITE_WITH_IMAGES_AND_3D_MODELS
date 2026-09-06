import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { readFile, readdir } from "node:fs/promises";
import { PNG } from "pngjs";

const evidence = new URL("../public/evidence/", import.meta.url);
const read = (file) => readFile(new URL(file, evidence));
const json = async (file) => JSON.parse(await read(file));
const manifest = await json("manifest.json");
assert.equal(
  new Set(manifest.map((item) => item.file)).size,
  manifest.length,
  "Duplicate asset paths",
);
for (const asset of manifest) {
  assert.match(
    asset.file,
    /^[a-z0-9_.-]+$/,
    "Asset must be a local evidence file",
  );
  const content = await read(asset.file);
  assert.equal(content.length, asset.bytes, `${asset.file}: unexpected size`);
  assert.equal(
    createHash("sha256").update(content).digest("hex"),
    asset.sha256,
    `${asset.file}: checksum changed`,
  );
}
assert.deepEqual(
  (await readdir(evidence)).sort(),
  [...manifest.map((item) => item.file), "manifest.json"].sort(),
  "Untracked or missing evidence assets",
);
const study = await json("case-study.json");
const inventory = await json("visible_inventory.json");
const audit = await json("audit.json");
assert.deepEqual(study.inventory, inventory);
assert.deepEqual(study.audit, audit);
const expectedIds = Object.entries(inventory.groups)
  .flatMap(([group, positions]) =>
    positions.map((_, index) => `${group}${index + 1}`),
  )
  .sort();
assert.equal(expectedIds.length, 79);
assert.equal(new Set(expectedIds).size, 79);
assert.deepEqual(study.boxes.map((box) => box.id).sort(), expectedIds);
assert.deepEqual(study.conclusion, {
  visible: 79,
  total: "unresolved",
  front: 77,
  top: 2,
});
assert.equal(audit.visible_inventory, 79);
assert.equal(
  audit.source_sha256,
  manifest.find((asset) => asset.file === study.sourceImage).sha256,
);
assert.deepEqual(
  Object.keys(audit.observed_render_pixel_counts).sort(),
  expectedIds,
);
assert.ok(
  Object.values(audit.observed_render_pixel_counts).every(
    (pixels) => pixels > 0,
  ),
);
assert.deepEqual(audit.observed_ids_without_exact_interior_color_pixels, []);
assert.deepEqual(audit.observed_box_intersections_over_2mm, []);
assert.equal(audit.hypothetical_magenta_pixels, 0);

for (const [file, count] of Object.entries(audit.glb_verified_carton_counts)) {
  const buffer = await read(file);
  assert.equal(buffer.subarray(0, 4).toString(), "glTF");
  assert.equal(buffer.readUInt32LE(4), 2);
  assert.equal(buffer.readUInt32LE(8), buffer.length);
  const gltf = JSON.parse(
    buffer.subarray(20, 20 + buffer.readUInt32LE(12)).toString(),
  );
  const cartons = gltf.nodes.filter((node) => node.extras?.is_carton);
  const observed = cartons.filter((node) => node.extras.image_id);
  assert.equal(cartons.length, count, `${file}: carton count`);
  assert.deepEqual(
    observed.map((node) => node.extras.image_id).sort(),
    expectedIds,
  );
  assert.ok(
    gltf.images?.length > 0 &&
      gltf.images.every(
        (image) => Number.isInteger(image.bufferView) && !image.uri,
      ),
    `${file}: textures must be embedded`,
  );
  assert.ok(
    gltf.buffers.every((buffer) => !buffer.uri),
    `${file}: geometry must be embedded`,
  );
  if (file === "pallet_reconstruction.glb") {
    assert.equal(cartons.length, study.hypotheses.a);
    assert.equal(cartons.length - observed.length, study.hypotheses.hidden);
    const removed = cartons.find(
      (node) => node.name === study.hypotheses.removedId,
    );
    assert.ok(
      removed && !removed.extras.image_id,
      "Counterexample must remove a hypothetical carton",
    );
  }
}
const a = PNG.sync.read(await read("visibility_hypothesis_a.png"));
const b = PNG.sync.read(await read("visibility_hypothesis_b.png"));
assert.deepEqual([a.width, a.height], study.imageSize);
assert.deepEqual([a.width, a.height], [b.width, b.height]);
assert.equal(a.width * a.height, 1076480);
assert.deepEqual(a.data, b.data, "Controlled render pixels differ");
assert.equal(audit.visibility_image_differing_pixels, 0);
assert.equal(study.hypotheses.a - study.hypotheses.b, 1);
const saved = await json("saved_blend_verification.json");
assert.equal(saved.saved_blend_reopened, true);
assert.equal(saved.observed_carton_objects, 79);
assert.equal(saved.total_carton_objects_in_model, 172);
assert.equal(saved.source_texture_packed, true);
assert.equal(saved.actual_total, "unresolved");
const blend = await read("pallet_reconstruction.blend");
// Blender 5 stores compressed files with Zstandard; read-back was checked in Blender.
assert.ok(
  blend.length > 100000,
  "Saved Blender artifact is unexpectedly small",
);
console.log(
  `Evidence verified: ${manifest.length} checksummed assets, 79 observed IDs, GLB carton counts 79/172, and 1,076,480 identical RGBA pixels. These checks do not establish concealed stock.`,
);
