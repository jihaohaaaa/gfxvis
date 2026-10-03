import { expect, test } from "@playwright/test";

test.describe("依值类型论文章与 DependentTypeDiagram E2E 冒烟测试", () => {
  test("页面加载、KaTeX 渲染与 DependentTypeDiagram 核心交互", async ({
    page,
  }) => {
    const errors: string[] = [];
    page.on("pageerror", (err) => errors.push(err.message));

    await page.goto("/posts/type-systems/dependent-types");
    await page.waitForLoadState("domcontentloaded");

    // 1. 验证标题与 KaTeX 渲染
    await expect(page).toHaveTitle(/依值类型论/);
    await expect(page.locator(".katex").first()).toBeVisible();
    await expect(page.locator(".katex-error")).toHaveCount(0);

    // 2. 验证组件挂载并执行预设切换
    const matrixPreset = page
      .locator("button:has-text('2. 矩阵乘法维度检查')")
      .first();
    await expect(matrixPreset).toBeVisible();
    await matrixPreset.click();
    await expect(page.locator("text=矩阵乘法").first()).toBeVisible();

    // 3. 验证无运行时未捕获异常
    expect(errors).toEqual([]);
  });
});
