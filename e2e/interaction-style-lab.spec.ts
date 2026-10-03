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
    let painted = 0;
    for (let index = 3; index < pixels.length; index += 4) {
      if (pixels[index] > 8) painted += 1;
      if (painted > 100) return true;
    }
    return false;
  });
}

test.describe("交互式可视化 UI 风格试验场 E2E 冒烟测试", () => {
  test("试验场页面加载、六种 KDE 布局挂载与 KaTeX 公式渲染", async ({
    page,
  }) => {
    const errors: string[] = [];
    page.on("pageerror", (err) => errors.push(err.message));

    await page.goto("/posts/visualization/interaction-style-lab");
    await page.waitForLoadState("domcontentloaded");

    // 1. 验证标题与布局样例存在
    await expect(page).toHaveTitle(/交互式可视化 UI 风格试验场/);

    const samples = page.locator('[data-style="kde"]');
    await expect(samples).toHaveCount(6);

    // 2. 验证首个样例 Canvas 与 KaTeX Readouts
    const firstSample = samples.first();
    await firstSample.scrollIntoViewIfNeeded();
    await expect(firstSample.locator("canvas").first()).toBeVisible();

    const readouts = firstSample.locator(".style-lab__readouts");
    await expect(readouts.locator(".katex")).not.toHaveCount(0);

    // 3. 验证无运行时未捕获异常
    expect(errors).toEqual([]);
  });

  test("密集 Dock 与四画布对照使用框架视口组", async ({ page }) => {
    await page.goto("/posts/visualization/interaction-style-lab");

    const samples = page.locator('[data-style="kde"]');
    const denseDock = samples.nth(3);
    await denseDock.scrollIntoViewIfNeeded();

    const denseGroup = denseDock.locator(
      '[data-testid="dense-dock-canvas-group"]',
    );
    await expect(denseGroup).toHaveAttribute("data-viewport-count", "4");
    await expect(denseGroup).toHaveAttribute("data-viewport-columns", "2");
    await expect(denseDock.locator("canvas")).toHaveCount(4);
    await expect(
      denseDock.locator('[data-testid="dense-dock-view-config"]'),
    ).toBeVisible();
    await expect(
      denseDock.locator('[data-testid^="dense-dock-view-config-view-"]'),
    ).toHaveCount(4);

    const firstView = denseDock.locator(
      '[data-testid="dense-dock-view-config-view-01"]',
    );
    await firstView.locator("select").first().selectOption("line-yx");
    await expect(firstView.locator("select").first()).toHaveValue("line-yx");

    const dualView = samples.nth(4);
    await dualView.scrollIntoViewIfNeeded();
    await expect(
      dualView.locator('[data-layout-preset="dual-view"]'),
    ).toHaveCount(1);
    await expect(
      dualView.locator('[data-testid="dual-view-main-group"]'),
    ).toHaveAttribute("data-viewport-count", "2");
    await expect(
      dualView.locator('[data-testid="dual-view-secondary-group"]'),
    ).toHaveAttribute("data-viewport-count", "2");
    await expect(dualView.locator("canvas")).toHaveCount(4);
  });

  test("几何 Tab 在代数 Tab 往返后重新绘制 Canvas", async ({ page }) => {
    await page.goto("/posts/visualization/interaction-style-lab");
    const sample = page.locator('[data-style="kde"]').first();
    await sample.scrollIntoViewIfNeeded();
    const canvas = sample.locator("canvas").first();
    await expect.poll(() => hasPaintedPixels(canvas)).toBe(true);

    await sample.getByRole("button", { name: /代数矩阵/ }).click();
    await expect(sample.locator("canvas").first()).toBeHidden();

    await sample.getByRole("button", { name: /几何投影/ }).click();
    await expect(canvas).toBeVisible();
    await expect.poll(() => hasPaintedPixels(canvas)).toBe(true);
  });

  test("多画布网格在窄屏和深色主题下不产生横向溢出", async ({ page }) => {
    await page.goto("/posts/visualization/interaction-style-lab");
    await page.locator("#theme-toggle").click();
    await expect(page.locator("html")).toHaveClass(/dark/);
    await page.setViewportSize({ width: 390, height: 844 });
    await page.reload();
    await page.locator('[data-style="kde"]').nth(3).scrollIntoViewIfNeeded();
    await expect
      .poll(() =>
        page.evaluate(
          () => document.documentElement.scrollWidth <= window.innerWidth + 1,
        ),
      )
      .toBe(true);
  });
});
