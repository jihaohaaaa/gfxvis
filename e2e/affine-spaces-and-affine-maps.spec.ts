import { expect, test } from "@playwright/test";

test.describe("仿射空间与仿射映射文章与 AffineSpaceDiagram E2E 冒烟测试", () => {
  test("页面加载、KaTeX 渲染与仿射交互组件挂载", async ({ page }) => {
    const errors: string[] = [];
    page.on("pageerror", (err) => errors.push(err.message));

    await page.goto("/posts/linear-algebra/affine-spaces-and-affine-maps");
    await page.waitForLoadState("domcontentloaded");

    // 1. 验证标题与 KaTeX 渲染
    await expect(page).toHaveTitle(/仿射空间与仿射映射/);
    await expect(page.locator(".katex").first()).toBeVisible();
    await expect(page.locator(".katex-error")).toHaveCount(0);

    // 2. 验证 Canvas 画布挂载
    const canvas = page.locator("canvas").first();
    await canvas.scrollIntoViewIfNeeded();
    await expect(canvas).toBeVisible();

    // 3. 验证模式切换交互
    const modeBtn = page.locator("button:has-text('3D 空间平面')").first();
    if (await modeBtn.isVisible()) {
      await modeBtn.click();
      await expect(canvas).toBeVisible();
    }

    // 4. 验证无运行时未捕获异常
    expect(errors).toEqual([]);
  });
});
