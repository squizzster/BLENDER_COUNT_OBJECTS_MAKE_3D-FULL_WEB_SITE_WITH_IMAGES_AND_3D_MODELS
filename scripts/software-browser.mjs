import { existsSync } from "node:fs";

// Test processes must never select a physical GPU. Restrict driver discovery,
// not just the WebGL preference; desktop composition also needs a CPU backend.
export function softwareBrowserOptions() {
  const mesaICD = "/usr/share/vulkan/icd.d/lvp_icd.x86_64.json";
  const mesaEGL = "/usr/share/glvnd/egl_vendor.d/50_mesa.json";
  if (!existsSync(mesaICD) || !existsSync(mesaEGL))
    throw new Error(
      "Mesa CPU rendering is required. Install mesa-vulkan-drivers and libegl-mesa0 (Ubuntu), or the corresponding Mesa packages on your Linux distribution. SwiftShader is intentionally excluded.",
    );
  return {
    args: [
      "--enable-gpu",
      "--use-gl=angle",
      "--use-angle=gl",
      "--disable-gpu-compositing",
      "--disable-features=AllowSwiftShaderFallback,AllowSoftwareGLFallbackDueToCrashes",
    ],
    env: {
      ...process.env,
      LIBGL_ALWAYS_SOFTWARE: "true",
      GALLIUM_DRIVER: "llvmpipe",
      VK_DRIVER_FILES: mesaICD,
      VK_ICD_FILENAMES: mesaICD,
      __GLX_VENDOR_LIBRARY_NAME: "mesa",
      __EGL_VENDOR_LIBRARY_FILENAMES: mesaEGL,
    },
  };
}
