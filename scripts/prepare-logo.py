"""Prepare the supplied 3D mini-head for a small header; run inside Blender."""

import hashlib
import json
import sys
import tempfile
import zipfile
from pathlib import Path

import bpy
from mathutils import Vector

ROOT = Path(__file__).resolve().parents[1]
args = sys.argv[sys.argv.index("--") + 1 :]
archive = Path(args[0])
output = ROOT / "public/brand"
output.mkdir(parents=True, exist_ok=True)
model_name = "Tropical-Crown-Website/tropical-crown-avatar.glb"
with zipfile.ZipFile(archive) as package:
    source = package.read(model_name)
bpy.ops.wm.read_factory_settings(use_empty=True)
with tempfile.TemporaryDirectory(prefix=".tmp.logo-", dir=ROOT) as folder:
    path = Path(folder) / "source.glb"
    path.write_bytes(source)
    bpy.ops.import_scene.gltf(filepath=str(path))
meshes = [o for o in bpy.context.scene.objects if o.type == "MESH"]
for obj in meshes:
    if len(obj.data.polygons) > 500:
        bpy.context.view_layer.objects.active = obj
        modifier = obj.modifiers.new("Header size simplification", "DECIMATE")
        modifier.ratio = 0.25
        bpy.ops.object.modifier_apply(modifier=modifier.name)
for texture in bpy.data.images:
    if texture.size[0] > 256 or texture.size[1] > 256:
        scale = 256 / max(texture.size)
        texture.scale(round(texture.size[0] * scale), round(texture.size[1] * scale))
bpy.ops.object.select_all(action="DESELECT")
for obj in meshes:
    obj.select_set(True)
model = output / "tropical-crown-logo.glb"
bpy.ops.export_scene.gltf(
    filepath=str(model), export_format="GLB", use_selection=True, export_apply=True
)
corners = [o.matrix_world @ Vector(p) for o in meshes for p in o.bound_box]
low = Vector([min(p[a] for p in corners) for a in range(3)])
high = Vector([max(p[a] for p in corners) for a in range(3)])
center = (low + high) / 2
data = bpy.data.cameras.new("Header logo camera")
data.type = "ORTHO"
data.ortho_scale = (high.z - low.z) * 1.14
camera = bpy.data.objects.new("Header logo camera", data)
bpy.context.scene.collection.objects.link(camera)
camera.location = center + Vector((0, -10, 0.12))
camera.rotation_euler = (center - camera.location).to_track_quat("-Z", "Y").to_euler()
for name, loc, energy, size in [
    ("Key", (-3, -5, 6), 400, 5),
    ("Fill", (3, -3, 3), 200, 4),
    ("Rim", (2, 3, 5), 300, 4),
]:
    light_data = bpy.data.lights.new(name, "AREA")
    light_data.energy, light_data.size = energy, size
    light = bpy.data.objects.new(name, light_data)
    bpy.context.scene.collection.objects.link(light)
    light.location = loc
    light.rotation_euler = (center - light.location).to_track_quat("-Z", "Y").to_euler()
scene = bpy.context.scene
scene.camera = camera
scene.render.engine = "CYCLES"
scene.cycles.device = "CPU"
scene.cycles.samples = 48
scene.render.threads_mode = "FIXED"
scene.render.threads = 4
scene.render.film_transparent = True
scene.render.resolution_x, scene.render.resolution_y = 128, 144
scene.render.resolution_percentage = 100
scene.render.image_settings.file_format = "PNG"
scene.render.image_settings.color_mode = "RGBA"
scene.view_settings.view_transform = "AgX"
scene.render.filepath = str(output / "tropical-crown-logo.png")
bpy.ops.render.render(write_still=True)
triangles = sum(sum(len(p.vertices) - 2 for p in o.data.polygons) for o in meshes)
record = {
    "source_archive": archive.name,
    "source_model_sha256": hashlib.sha256(source).hexdigest(),
    "source_bytes": len(source),
    "logo_bytes": model.stat().st_size,
    "logo_sha256": hashlib.sha256(model.read_bytes()).hexdigest(),
    "logo_triangles": triangles,
    "method": "Supplied GLB; geometry simplified for header size, textures capped at 256 px; CPU Blender poster. No generated portrait replacement.",
}
(output / "provenance.json").write_text(json.dumps(record, indent=2) + "\n")
print(json.dumps(record), flush=True)
