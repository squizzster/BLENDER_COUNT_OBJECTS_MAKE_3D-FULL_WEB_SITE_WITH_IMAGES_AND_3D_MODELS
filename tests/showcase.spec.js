import { test, expect } from "@playwright/test";
import AxeBuilder from "@axe-core/playwright";

async function ready(page) {
  const diagnostics = [];
  page.on("console", (message) => {
    if (["error", "warning"].includes(message.type()))
      diagnostics.push(message.text());
  });
  await page.goto("/");
  try {
    await expect(page.locator("#model-stage")).toHaveAttribute(
      "data-viewer-status",
      "ready",
    );
  } catch (error) {
    console.error(diagnostics.slice(-8).join("\n"));
    throw error;
  }
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
  await expect(stage).toHaveAttribute("data-total-cartons", "318");
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
  await expect(stage).toHaveAttribute("data-visible-cartons", "317");
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

test("all four scenarios retain supported geometry, linked counts and a consistent reset", async ({
  page,
}) => {
  await ready(page);
  const stage = page.locator("#model-stage");
  await expect(page.locator("#explode")).toHaveCount(0);
  await expect(page.locator('[data-stat="estimate"]')).toHaveText("317");
  await expect(page.locator(".course-row")).toHaveCount(10);
  await expect(page.locator("#sensitivity-rows tr")).toHaveCount(5);
  for (const missing of [0, 1, 2, 3]) {
    const count = String(318 - missing);
    await page.locator(`.scenario-quick [data-missing="${missing}"]`).click();
    await expect(stage).toHaveAttribute("data-visible-cartons", count);
    await expect(stage).toHaveAttribute("data-supported-cartons", count);
    await expect(stage).toHaveAttribute("data-missing", String(missing));
    await expect(page.locator("#hypothesis-count")).toHaveText(count);
    await expect(page.locator("#support-count")).toHaveText(
      `${count}/${count} supported`,
    );
    await expect(
      page.locator(`.scenario-cards [data-missing="${missing}"]`),
    ).toHaveAttribute("aria-pressed", "true");
    await expect(page.locator("#scenario-image")).toHaveAttribute(
      "src",
      `/evidence/scenario_${missing}_rear.webp`,
    );
    await expect(page.locator('[data-stat="estimate"]')).toHaveText("317");
  }
  await expect(page.locator("#scenario-note")).toContainText(
    "bridge neighbouring supports",
  );
  await expect(page.locator("#support-contact")).toHaveText("55.6%");
  await page.locator("#show-hidden").uncheck({ force: true });
  await expect(stage).toHaveAttribute("data-visible-cartons", "315");
  await expect(stage).toHaveAttribute("data-highlight-interior", "false");
  await page.locator("#inspect-gaps").click();
  await expect(stage).toHaveAttribute("data-mark-gaps", "true");
  await expect(stage).toHaveAttribute("data-camera-view", "rear");
  await expect(page.locator("#model-caption")).toContainText("empty positions");
  await expect(page.locator("#selected-model-id")).toHaveText(
    "3 EMPTY POSITIONS MARKED",
  );
  await page.locator("#rotate-model").click();
  await expect(page.locator("#rotate-model")).toHaveAttribute(
    "aria-pressed",
    "true",
  );
  await page.locator("#reset-model").click();
  await expect(stage).toHaveAttribute("data-visible-cartons", "317");
  await expect(stage).toHaveAttribute("data-camera-view", "overview");
  await expect(stage).toHaveAttribute("data-mark-gaps", "false");
  await expect(stage).toHaveAttribute("data-highlight-interior", "true");
  await expect(page.locator("#hypothesis-count")).toHaveText("317");
  await expect(page.locator("#rotate-model")).toHaveAttribute(
    "aria-pressed",
    "false",
  );
});

test("comparison works by keyboard and all four concealed-removal renders have identical pixels", async ({
  page,
}) => {
  await ready(page);
  await page.locator('[data-compare="neutral"]').click();
  await expect(page.locator("#compare-image")).toHaveAttribute(
    "src",
    "/evidence/neutral_geometry.png?v=2",
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
    "/evidence/geometry_overlay.png?v=2",
  );
  const difference = await page.evaluate(async () => {
    async function pixels(index) {
      const image = new Image();
      image.src = `/evidence/visibility_scenario_${index}.png`;
      await image.decode();
      const canvas = document.createElement("canvas");
      canvas.width = image.naturalWidth;
      canvas.height = image.naturalHeight;
      const context = canvas.getContext("2d");
      context.drawImage(image, 0, 0);
      return context.getImageData(0, 0, canvas.width, canvas.height).data;
    }
    const images = await Promise.all([0, 1, 2, 3].map(pixels));
    return images
      .slice(1)
      .map((b) =>
        images[0].reduce(
          (total, value, index) => total + Number(value !== b[index]),
          0,
        ),
      );
  });
  expect(difference).toEqual([0, 0, 0]);
});

test("responsive page has no overflow or automated WCAG AA violations, including expanded evidence", async ({
  page,
}) => {
  await ready(page);
  for (const selector of [
    ".sources",
    ".comparison-notes details",
    ".depth-details",
    ".visibility-details",
  ]) {
    await page.locator(`${selector} summary`).click();
  }
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

test("a failed 3D load preserves scenario exploration and downloads, and retry keeps the selection", async ({
  page,
  request,
}) => {
  await page.route("**/evidence/pallet_reconstruction.glb", (route) =>
    route.abort(),
  );
  await page.goto("/");
  const stage = page.locator("#model-stage");
  await expect(stage).toHaveAttribute("data-viewer-status", "error");
  await expect(page.locator("#retry-model")).toBeVisible();
  await expect(page.locator("#model-caption")).toContainText(
    "supported scenarios",
  );
  await expect(page.locator(".photo-pin")).toHaveCount(79);
  await page.locator('.scenario-quick [data-missing="2"]').click();
  await expect(page.locator("#hypothesis-count")).toHaveText("316");
  await expect(page.locator(".model-poster")).toHaveAttribute(
    "src",
    "/evidence/scenario_2_rear.webp",
  );
  const response = await request.get("/evidence/pallet_reconstruction.blend");
  expect(response.ok()).toBe(true);
  expect((await response.body()).length).toBeGreaterThan(100000);
  await page.unroute("**/evidence/pallet_reconstruction.glb");
  await page.locator("#retry-model").click();
  await expect(stage).toHaveAttribute("data-viewer-status", "ready");
  await expect(stage).toHaveAttribute("data-visible-cartons", "316");
});

test("malformed study data retains the static conditional estimate", async ({
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
    "estimated total boxes",
  );
  await expect(page.locator('[data-stat="estimate"]')).toHaveText("317");
  await expect(page.locator("#downloads")).toBeVisible();
  await expect(
    page.locator('.scenario-quick [data-missing="1"]'),
  ).toBeDisabled();
});

test("actual 3D picking clears an unrelated image filter", async ({
  page,
  isMobile,
}) => {
  await ready(page);
  await page.locator('[data-group="H"]').click();
  await page.locator('[data-view="front"]').click();
  if (isMobile) await page.locator("#touch-model").click();
  const canvas = page.locator("#model-canvas canvas");
  await canvas.scrollIntoViewIfNeeded();
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

test("graphics-context loss keeps evidence and retry creates one working canvas", async ({
  page,
}) => {
  await ready(page);
  await page
    .locator("#model-canvas canvas")
    .evaluate((canvas) =>
      canvas
        .getContext("webgl2")
        .getExtension("WEBGL_lose_context")
        .loseContext(),
    );
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

test("supplied head logo renders alongside the box icon and survives context loss as a poster", async ({
  page,
}) => {
  await ready(page);
  const logo = page.locator("#brand-avatar");
  await expect(logo).toHaveAttribute("data-logo-status", "ready");
  await expect(page.locator(".site-header .brand svg")).toHaveCount(1);
  await expect(page.locator(".site-header .brand")).not.toContainText("PALLET");
  await expect(page.locator(".site-header .release-tag")).toHaveText("ALPHA");
  const visiblePixels = await logo.locator("canvas").evaluate((canvas) => {
    const gl = canvas.getContext("webgl2");
    const pixels = new Uint8Array(canvas.width * canvas.height * 4);
    gl.readPixels(
      0,
      0,
      canvas.width,
      canvas.height,
      gl.RGBA,
      gl.UNSIGNED_BYTE,
      pixels,
    );
    return pixels.filter((v, i) => i % 4 === 3 && v > 0).length;
  });
  expect(visiblePixels).toBeGreaterThan(500);
  await logo
    .locator("canvas")
    .evaluate((canvas) =>
      canvas
        .getContext("webgl2")
        .getExtension("WEBGL_lose_context")
        .loseContext(),
    );
  await expect(logo).toHaveAttribute("data-logo-status", "fallback");
  await expect(logo.locator("img")).toBeVisible();
  await expect(logo.locator("canvas")).toHaveCount(0);
  await expect(page.locator("#model-stage")).toHaveAttribute(
    "data-viewer-status",
    "ready",
  );
});

test("portrait viewing scrolls naturally over the model until touch interaction is enabled", async ({
  page,
  isMobile,
}) => {
  test.skip(!isMobile, "Touch scrolling is checked in the portrait project.");
  await ready(page);
  const stage = page.locator("#model-stage");
  const toggle = page.locator("#touch-model");
  await expect(stage).toHaveAttribute("data-touch-interactive", "false");
  await expect(toggle).toBeVisible();
  await page.locator("#model-canvas").scrollIntoViewIfNeeded();
  const bounds = await page.locator("#model-canvas").boundingBox();
  const startY = await page.evaluate(() => scrollY);
  const cdp = await page.context().newCDPSession(page);
  const x = bounds.x + bounds.width / 2;
  const y = bounds.y + bounds.height * 0.75;
  await cdp.send("Input.dispatchTouchEvent", {
    type: "touchStart",
    touchPoints: [{ x, y }],
  });
  for (let step = 1; step <= 8; step++)
    await cdp.send("Input.dispatchTouchEvent", {
      type: "touchMove",
      touchPoints: [{ x, y: y - step * 18 }],
    });
  await cdp.send("Input.dispatchTouchEvent", {
    type: "touchEnd",
    touchPoints: [],
  });
  await expect
    .poll(() => page.evaluate(() => scrollY))
    .toBeGreaterThan(startY + 50);
  await toggle.click();
  await expect(stage).toHaveAttribute("data-touch-interactive", "true");
  await expect(toggle).toHaveText("Done · scroll page");
  await expect(page.locator("#model-canvas canvas")).toHaveCSS(
    "pointer-events",
    "auto",
  );
  await toggle.click();
  await expect(stage).toHaveAttribute("data-touch-interactive", "false");
  for (const selector of [
    "#touch-model",
    '.model-toolbar [data-view="front"]',
    '.scenario-quick [data-missing="1"]',
  ]) {
    expect(
      (await page.locator(selector).boundingBox()).height,
    ).toBeGreaterThanOrEqual(44);
  }
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

test("a head logo loaded in a hidden tab keeps its poster and renders when the tab returns", async ({
  page,
}) => {
  await page.addInitScript(() => {
    let hidden = true;
    Object.defineProperty(document, "hidden", {
      get: () => hidden,
      configurable: true,
    });
    window.revealStudyTab = () => {
      hidden = false;
      document.dispatchEvent(new Event("visibilitychange"));
    };
  });
  await page.goto("/");
  const logo = page.locator("#brand-avatar");
  await expect(logo.locator("canvas")).toHaveCount(1);
  await expect(logo).not.toHaveAttribute("data-logo-status", "ready");
  await expect(logo.locator("img")).toBeVisible();
  await page.evaluate(() => window.revealStudyTab());
  await expect(logo).toHaveAttribute("data-logo-status", "ready");
  await expect(logo.locator("img")).toBeHidden();
});
