import { expect, test } from "@playwright/test";

test.describe("子类型与型变文章与 SubtypingVarianceDiagram E2E 冒烟测试", () => {
  test("页面加载、KaTeX 渲染与 SubtypingVarianceDiagram 核心交互", async ({
    page,
  }) => {
    const errors: string[] = [];
    page.on("pageerror", (err) => errors.push(err.message));

    await page.goto("/posts/type-systems/subtyping-and-variance");
    await page.waitForLoadState("domcontentloaded");

    // 1. 验证标题与 KaTeX 渲染
    await expect(page).toHaveTitle(/子类型与型变/);
    await expect(page.locator(".katex").first()).toBeVisible();
    await expect(page.locator(".katex-error")).toHaveCount(0);

    // 2. 滚动触发水合并执行预设切换
    const island = page.locator("astro-island").first();
    await island.scrollIntoViewIfNeeded();

    const preset2Btn = page
      .locator("button:has-text('2. 记录宽度与深度子类型')")
      .first();
    if (await preset2Btn.isVisible()) {
      await preset2Btn.click();
      await expect(page.locator("text=Point3D").first()).toBeVisible();
    }

    // 3. 验证无运行时未捕获异常
    expect(errors).toEqual([]);
  });
});
