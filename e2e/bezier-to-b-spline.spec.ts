import { expect, test } from "@playwright/test";

async function hasPaintedPixels(canvas: import("@playwright/test").Locator) {
  return canvas.evaluate((element) => {
    const canvasElement = element as HTMLCanvasElement;
    const context = canvasElement.getContext("2d");
    if (!context) return false;
    const pixels = context.getImageData(
      0,
      0,
      canvasElement.width,
      canvasElement.height,
    ).data;
    let nonTransparent = 0;
    for (let index = 3; index < pixels.length; index += 4) {
      if (pixels[index] > 8) nonTransparent += 1;
      if (nonTransparent > 100) return true;
    }
    return false;
  });
}

async function moveRange(
  range: import("@playwright/test").Locator,
  fraction: number,
) {
  const before = await range.inputValue();
  const box = await range.boundingBox();
  if (!box) throw new Error("range slider is not measurable");
  await range.click({
    position: { x: box.width * fraction, y: box.height / 2 },
  });
  await expect.poll(() => range.inputValue()).not.toBe(before);
}

test.describe("Bézier 到 B-Spline 文章", () => {
  test("四个 KDE island 和画布都能挂载", async ({ page }) => {
    const errors: string[] = [];
    page.on("pageerror", (error) => errors.push(error.message));

    await page.goto("/posts/visualization/bezier-to-b-spline");
    await expect(page).toHaveTitle(/从 Bézier 到 B-Spline/);

    const shells = page.locator('[data-window-shell="kde"]');
    await expect(shells).toHaveCount(7);

    for (let index = 0; index < 7; index += 1) {
      const shell = shells.nth(index);
      await shell.scrollIntoViewIfNeeded();
      await expect(shell).toBeVisible();
      await expect(
        shell.locator('[data-layout-preset="side-right"]'),
      ).toHaveCount(1);
      const canvas = shell.locator("canvas").first();
      await expect(canvas).toBeVisible({ timeout: 10000 });
      await expect.poll(() => hasPaintedPixels(canvas)).toBe(true);
      await expect(
        shell.locator("[data-console-readout]").first(),
      ).toBeVisible();
    }

    expect(errors).toEqual([]);
  });

  test("Bézier 控制与 Bernstein 权重会实时更新", async ({ page }) => {
    await page.goto("/posts/visualization/bezier-to-b-spline");

    const casteljau = page.locator('[data-testid="bezier-casteljau-demo"]');
    await casteljau.scrollIntoViewIfNeeded();
    const casteljauReadout = casteljau.locator(
      '[data-testid="bezier-casteljau-point-readout"]',
    );
    await expect(casteljauReadout).toContainText("C(0.50)");
    await expect(
      casteljau.locator('[data-testid="bezier-control-point-count"]'),
    ).toContainText("n+1=4");
    await moveRange(casteljau.locator('input[type="range"]').first(), 0.8);
    await expect(casteljauReadout).not.toContainText("C(0.50)");
    const levelToggles = casteljau.locator(
      '[data-testid="bezier-level-toggles"]',
    );
    await expect(
      levelToggles.locator('[data-testid="bezier-level-toggle-0"] input'),
    ).toBeChecked();
    await expect(
      levelToggles.locator('[data-testid="bezier-level-toggle-final"] input'),
    ).toBeChecked();
    await expect(
      levelToggles.locator('[data-testid="bezier-level-toggle-1"] input'),
    ).not.toBeChecked();
    await levelToggles
      .locator('[data-testid="bezier-level-toggle-1"] input')
      .check();
    await expect(
      casteljau.locator('[data-testid="bezier-level-label-list"]'),
    ).toContainText("L1·Q0");
    await levelToggles
      .locator('[data-testid="bezier-level-toggle-1"] input')
      .uncheck();

    await casteljau.locator('[data-testid="bezier-degree-increase"]').click();
    await expect(
      casteljau.locator('[data-testid="bezier-degree-readout"]'),
    ).toContainText("n = 4");
    await expect(
      casteljau.locator('[data-testid="bezier-control-point-count"]'),
    ).toContainText("n+1=5");
    await expect(
      casteljau.locator('[data-testid="bezier-level-toggle-final"] input'),
    ).toBeChecked();
    await casteljau.locator('[data-testid="bezier-degree-decrease"]').click();
    await expect(
      casteljau.locator('[data-testid="bezier-degree-readout"]'),
    ).toContainText("n = 3");

    for (let index = 0; index < 5; index += 1) {
      await casteljau.locator('[data-testid="bezier-degree-increase"]').click();
    }
    await expect(
      casteljau.locator('[data-testid="bezier-degree-readout"]'),
    ).toContainText("n = 8");
    await expect(
      casteljau.locator('[data-testid="bezier-degree-increase"]'),
    ).toBeDisabled();
    await expect
      .poll(() =>
        casteljau
          .locator('[data-testid="bezier-level-label-list"]')
          .evaluate(
            (element) => element.scrollWidth <= element.clientWidth + 1,
          ),
      )
      .toBe(true);

    const basis = page.locator('[data-testid="bezier-basis-demo"]');
    await basis.scrollIntoViewIfNeeded();
    const basisGroup = basis.locator(
      '[data-testid="bezier-basis-canvas-group"]',
    );
    await expect(basisGroup).toHaveAttribute("data-viewport-count", "2");
    await expect(basis.locator("canvas")).toHaveCount(2);
    for (let index = 0; index < 2; index += 1) {
      const canvas = basis.locator("canvas").nth(index);
      await expect(canvas).toBeVisible();
      await expect.poll(() => hasPaintedPixels(canvas)).toBe(true);
    }
    const geometryCanvas = basis.locator(
      '[data-testid="bezier-basis-geometry-canvas"] canvas',
    );
    const geometryBox = await geometryCanvas.boundingBox();
    const curveReadout = basis.locator(
      '[data-testid="bezier-basis-curve-point"]',
    );
    const curveBeforeDrag = await curveReadout.innerText();
    if (geometryBox) {
      const margin = 34;
      const pointX =
        geometryBox.x +
        margin +
        ((-2.2 + 4) / 8) * (geometryBox.width - margin * 2);
      const pointY =
        geometryBox.y +
        geometryBox.height -
        margin -
        ((3 + 3) / 7) * (geometryBox.height - margin * 2);
      await page.mouse.move(pointX, pointY);
      await page.mouse.down();
      await page.mouse.move(pointX + 24, pointY + 16);
      await page.mouse.up();
      await expect(curveReadout).not.toHaveText(curveBeforeDrag);
    }
    await basis.locator('[data-testid="bezier-basis-degree-dec"]').click();
    await expect(
      basis.locator('[data-testid="bezier-basis-degree-value"]'),
    ).toHaveText(/n\s*=\s*2/);
    await expect(
      basis.locator('[data-testid="bezier-basis-sum"]'),
    ).toContainText("1.000");
    await moveRange(basis.locator('input[type="range"]').first(), 0.2);
    await expect(
      basis.locator('[data-testid="bezier-basis-sum"]'),
    ).toContainText("1.000");
  });

  test("B-Spline 的 Span → Basis 与 Basis → Span 可以互相检查", async ({
    page,
  }) => {
    await page.goto("/posts/visualization/bezier-to-b-spline");

    const support = page.locator('[data-testid="bspline-local-support-demo"]');
    await support.scrollIntoViewIfNeeded();
    await expect(
      support.locator('[data-testid="bspline-active-basis"]'),
    ).toContainText("N");
    await expect(
      support.locator('[data-testid="bspline-partition-sum"]'),
    ).toContainText("1.000");

    const basisTab = support.getByRole("button", { name: /Basis → Span/ });
    await basisTab.scrollIntoViewIfNeeded();
    await basisTab.click();
    await expect(
      support.locator('[data-testid="bspline-support-spans"]'),
    ).toContainText("s");

    const continuity = page.locator('[data-testid="bspline-continuity-demo"]');
    await continuity.scrollIntoViewIfNeeded();
    await continuity.getByRole("button", { name: /m = 3/ }).click();
    await expect(
      continuity.locator('[data-testid="bspline-continuity-readout"]'),
    ).toContainText("C");
  });

  test("Bernstein 权重稀释探针可以通过 KdeTabs 切换阶数并正确响应", async ({
    page,
  }) => {
    await page.goto("/posts/visualization/bezier-to-b-spline");

    const dilution = page.locator(
      '[data-testid="bezier-weight-dilution-console"]',
    );
    await dilution.scrollIntoViewIfNeeded();
    await expect(dilution).toBeVisible();

    const canvasGroup = dilution.locator(
      '[data-testid="bezier-weight-dilution-canvas-group"]',
    );
    await expect(canvasGroup).toHaveAttribute("data-viewport-count", "2");

    for (let i = 0; i < 2; i += 1) {
      const cv = dilution.locator("canvas").nth(i);
      await expect(cv).toBeVisible();
      await expect.poll(() => hasPaintedPixels(cv)).toBe(true);
    }

    // 默认 n=3, 峰值 ~44.4%
    await expect(dilution).toContainText("44.4%");

    // 切换到 n=2 (二次)
    await dilution.getByRole("button", { name: "n=2 (二次)" }).click();
    await expect(dilution).toContainText("50.0%");

    // 切换到 n=30
    await dilution.getByRole("button", { name: "n=30" }).click();
    await expect(dilution).toContainText("14.4%");
  });

  test("深色主题与 390px 窄屏没有页面横向溢出", async ({ page }) => {
    await page.goto("/posts/visualization/bezier-to-b-spline");
    await page.locator("#theme-toggle").click();
    await expect(page.locator("html")).toHaveClass(/dark/);

    await page.setViewportSize({ width: 390, height: 844 });
    await page.reload();
    await expect
      .poll(() =>
        page.evaluate(
          () => document.documentElement.scrollWidth <= window.innerWidth + 1,
        ),
      )
      .toBe(true);
  });
});
