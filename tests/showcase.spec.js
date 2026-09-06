import { test, expect } from "@playwright/test";
import AxeBuilder from "@axe-core/playwright";

async function ready(page) {
  await page.goto("/");
  await expect(page.locator("#model-stage")).toHaveAttribute(
    "data-viewer-status",
    "ready",
  );
}

test("loads the actual GLB and links all 79 photograph instances to the model", async ({
  page,
}) => {
  const errors = [];
  page.on("pageerror", (error) => errors.push(error.message));
  page.on("console", (message) => {
    if (message.type() === "error") errors.push(message.text());
  });
  await ready(page);
  const stage = page.locator("#model-stage");
  await expect(stage).toHaveAttribute("data-observed-cartons", "79");
  await expect(stage).toHaveAttribute("data-total-cartons", "172");
  await expect(stage).toHaveAttribute("data-three-revision", "180");
  const renderer = await page
    .locator("#model-canvas canvas")
    .evaluate((canvas) => {
      const gl = canvas.getContext("webgl2");
      const extension = gl.getExtension("WEBGL_debug_renderer_info");
      return extension
        ? gl.getParameter(extension.UNMASKED_RENDERER_WEBGL)
        : "";
    });
  expect(renderer).toMatch(/llvmpipe/i);
  expect(renderer).not.toMatch(/NVIDIA|GeForce|Radeon|SwiftShader/i);
  await expect(stage).toHaveAttribute("data-visible-cartons", "79");
  await expect(page.locator(".photo-pin")).toHaveCount(79);
  await expect(page.locator(".inventory-group")).toHaveCount(11);
  await expect(page.locator("#selected-title")).toHaveText("Carton D3");
  await page.locator("#carton-select").selectOption("H1");
  await expect(stage).toHaveAttribute("data-selected-carton", "H1");
  await expect(page.locator("#selected-note")).toContainText("top");
  await page.locator('[data-carton="J1"]').click();
  await expect(stage).toHaveAttribute("data-selected-carton", "J1");
  await expect(page.locator("#selected-dimensions")).toContainText(
    "Conditional",
  );
  await page.locator('[data-group="H"]').click();
  await expect(page.locator(".photo-pin:not(.dimmed)")).toHaveCount(3);
  await page.locator('[data-group="H"]').click();
  await expect(page.locator(".photo-pin:not(.dimmed)")).toHaveCount(79);
  await page.locator("#show-labels").uncheck({ force: true });
  await expect(page.locator("#photo-pins")).toBeHidden();
  await page.locator("#show-labels").check({ force: true });
  expect(errors).toEqual([]);
});

test("keeps hypothetical counts, camera presets, separation and reset consistent", async ({
  page,
}) => {
  await ready(page);
  const stage = page.locator("#model-stage");
  await page.locator("#show-hidden").check({ force: true });
  await expect(stage).toHaveAttribute("data-visible-cartons", "172");
  await expect(page.locator("#viewer-status")).toContainText("93 hypothetical");
  await page.locator("#remove-hidden").check({ force: true });
  await expect(page.locator("#hypothesis-count")).toHaveText("171");
  await expect(stage).toHaveAttribute("data-visible-cartons", "171");
  await expect(page.locator("#viewer-status")).toContainText("92 hypothetical");
  await page.locator('[data-view="rear"]').click();
  await expect(stage).toHaveAttribute("data-camera-view", "rear");
  await page.locator("#explode").fill("65");
  await expect(stage).toHaveAttribute("data-separation", "65");
  await expect(page.locator("#model-caption")).toContainText(
    "Separated for inspection",
  );
  await page.locator("#rotate-model").click();
  await expect(page.locator("#rotate-model")).toHaveAttribute(
    "aria-pressed",
    "true",
  );
  await page.locator("#reset-model").click();
  await expect(stage).toHaveAttribute("data-visible-cartons", "79");
  await expect(stage).toHaveAttribute("data-camera-view", "overview");
  await expect(page.locator("#explode")).toHaveValue("0");
  await expect(page.locator("#rotate-model")).toHaveAttribute(
    "aria-pressed",
    "false",
  );
  await page.locator("#show-hidden").check({ force: true });
  await expect(stage).toHaveAttribute("data-visible-cartons", "171");
});

test("comparison works by keyboard and concealed-count images have identical pixels", async ({
  page,
}) => {
  await ready(page);
  await page.locator('[data-compare="neutral"]').click();
  await expect(page.locator("#compare-image")).toHaveAttribute(
    "src",
    "/evidence/neutral_geometry.png",
  );
  await page.locator("#comparison-slider").focus();
  await page.keyboard.press("End");
  await expect(page.locator("#comparison-slider")).toHaveValue("100");
  await expect(page.locator("#compare-reveal")).toHaveCSS(
    "clip-path",
    "inset(0px 0% 0px 0px)",
  );
  await page.locator('[data-compare="overlay"]').click();
  await expect(page.locator("#compare-image")).toHaveAttribute(
    "src",
    "/evidence/geometry_overlay.png",
  );
  const difference = await page.evaluate(async () => {
    async function pixels(file) {
      const image = new Image();
      image.src = `/evidence/${file}`;
      await image.decode();
      const canvas = document.createElement("canvas");
      canvas.width = image.naturalWidth;
      canvas.height = image.naturalHeight;
      const context = canvas.getContext("2d");
      context.drawImage(image, 0, 0);
      return context.getImageData(0, 0, canvas.width, canvas.height).data;
    }
    const [a, b] = await Promise.all(
      ["visibility_hypothesis_a.png", "visibility_hypothesis_b.png"].map(
        pixels,
      ),
    );
    return a.reduce(
      (total, value, index) => total + Number(value !== b[index]),
      0,
    );
  });
  expect(difference).toBe(0);
});

test("responsive page has no horizontal overflow and no automated WCAG AA violations", async ({
  page,
}) => {
  await ready(page);
  await page.locator(".sources summary").click();
  await page.locator(".comparison-notes summary").click();
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= innerWidth,
    ),
  ).toBe(true);
  const report = await new AxeBuilder({ page })
    .withTags(["wcag2a", "wcag2aa", "wcag21aa", "wcag22aa"])
    .analyze();
  expect(report.violations).toEqual([]);
  await page.screenshot({
    path: test.info().outputPath("showcase-full.png"),
    fullPage: true,
  });
});

test("downloads remain available when 3D fails, and retry recovers", async ({
  page,
  request,
}) => {
  await page.route("**/evidence/pallet_reconstruction.glb", (route) =>
    route.abort(),
  );
  await page.goto("/");
  await expect(page.locator("#model-stage")).toHaveAttribute(
    "data-viewer-status",
    "error",
  );
  await expect(page.locator("#retry-model")).toBeVisible();
  await expect(page.locator("#model-caption")).toContainText("93 hypothetical");
  await expect(page.locator(".photo-pin")).toHaveCount(79);
  const response = await request.get("/evidence/pallet_reconstruction.blend");
  expect(response.ok()).toBe(true);
  expect((await response.body()).length).toBeGreaterThan(100000);
  await page.unroute("**/evidence/pallet_reconstruction.glb");
  await page.locator("#retry-model").click();
  await expect(page.locator("#model-stage")).toHaveAttribute(
    "data-viewer-status",
    "ready",
  );
});

test("malformed study data falls back to the static findings without inventing an inventory", async ({
  page,
}) => {
  await page.route("**/evidence/case-study.json", (route) =>
    route.fulfill({ contentType: "application/json", body: '{"boxes":[]}' }),
  );
  await page.goto("/");
  await expect(page.locator("#app-error")).toBeVisible();
  await expect(page.locator("html")).toHaveAttribute(
    "data-study-status",
    "error",
  );
  await expect(page.locator(".hero-result")).toContainText(
    "Concealed total: unresolved",
  );
  await expect(page.locator("#downloads")).toBeVisible();
  await expect(page.locator("#remove-hidden")).toBeDisabled();
});

test("actual 3D picking clears an unrelated image filter", async ({ page }) => {
  await ready(page);
  await page.locator('[data-group="H"]').click();
  await page.locator('[data-view="front"]').click();
  const canvas = page.locator("#model-canvas canvas");
  const bounds = await canvas.boundingBox();
  let selected;
  for (const [x, y] of [
    [0.5, 0.3],
    [0.5, 0.4],
    [0.6, 0.45],
    [0.5, 0.6],
  ]) {
    await canvas.click({
      position: { x: bounds.width * x, y: bounds.height * y },
    });
    selected = await page
      .locator("#model-stage")
      .getAttribute("data-selected-carton");
    if (selected !== "D3" && !selected.startsWith("H")) break;
  }
  expect(selected).toMatch(/^[A-K][1-8]$/);
  expect(selected).not.toBe("D3");
  await expect(page.locator(".photo-pin.dimmed")).toHaveCount(0);
  await expect(page.locator(`[data-carton="${selected}"]`)).toHaveAttribute(
    "aria-pressed",
    "true",
  );
});

test("graphics-context loss preserves the evidence and retry creates one working canvas", async ({
  page,
}) => {
  await ready(page);
  await page.locator("#model-canvas canvas").evaluate((canvas) => {
    canvas
      .getContext("webgl2")
      .getExtension("WEBGL_lose_context")
      .loseContext();
  });
  await expect(page.locator("#model-stage")).toHaveAttribute(
    "data-viewer-status",
    "error",
  );
  await expect(page.locator("#model-canvas canvas")).toHaveCount(0);
  await expect(page.locator(".photo-pin")).toHaveCount(79);
  await page.locator("#retry-model").click();
  await expect(page.locator("#model-stage")).toHaveAttribute(
    "data-viewer-status",
    "ready",
  );
  await expect(page.locator("#model-canvas canvas")).toHaveCount(1);
});

test("small phones and intermediate widths retain readable controls without overflow", async ({
  page,
}, info) => {
  test.skip(info.project.name !== "desktop", "This width sweep runs once.");
  await ready(page);
  for (const width of [320, 768, 1024]) {
    await page.setViewportSize({ width, height: 1000 });
    expect(
      await page.evaluate(
        () => document.documentElement.scrollWidth <= innerWidth,
      ),
      `Overflow at ${width}px`,
    ).toBe(true);
    const report = await new AxeBuilder({ page })
      .withTags(["wcag2a", "wcag2aa", "wcag21aa", "wcag22aa"])
      .analyze();
    expect(report.violations, `Accessibility at ${width}px`).toEqual([]);
  }
});
