import { expect, test } from "@playwright/test";

test.describe("线性代数板块 (Linear Algebra) 补充文章 E2E 冒烟测试", () => {
  test("文章页面加载、KaTeX 渲染与迹/行列式交互组件挂载", async ({ page }) => {
    const errors: string[] = [];
    page.on("pageerror", (err) => errors.push(err.message));

    await page.goto("/posts/linear-algebra/trace-and-determinant");
    await page.waitForLoadState("domcontentloaded");

    // 1. 验证标题与 KaTeX 渲染
    await expect(page).toHaveTitle(/矩阵的迹与行列式/);
    await expect(page.locator(".katex").first()).toBeVisible();
    await expect(page.locator(".katex-error")).toHaveCount(0);

    // 2. 验证 Canvas 与模式切换
    const canvas = page.locator("canvas").first();
    await canvas.scrollIntoViewIfNeeded();
    await expect(canvas).toBeVisible();

    const flowTab = page.getByRole("button", { name: /连续流动/ });
    if (await flowTab.isVisible()) {
      await flowTab.click({ force: true });
      await expect(canvas).toBeVisible();
    }

    // 3. 验证无运行时未捕获异常
    expect(errors).toEqual([]);
  });
});
