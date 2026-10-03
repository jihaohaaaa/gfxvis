import { expect, test } from "@playwright/test";

test.describe("矩阵相似、相似不变量与特征结构 E2E 冒烟测试", () => {
  test("页面加载、KaTeX 渲染与 MatrixSimilarityDiagram 核心交互", async ({
    page,
  }) => {
    const errors: string[] = [];
    page.on("pageerror", (err) => errors.push(err.message));

    await page.goto("/posts/linear-algebra/matrix-similarity-and-invariants");
    await page.waitForLoadState("domcontentloaded");

    // 1. 验证标题与 KaTeX 渲染
    await expect(page).toHaveTitle(/矩阵相似/);
    await expect(page.locator(".katex").first()).toBeVisible();
    await expect(page.locator(".katex-error")).toHaveCount(0);

    // 2. 验证组件挂载并切换预设
    const shearPresetBtn = page
      .locator("button:has-text('三角剪切矩阵')")
      .first();
    await expect(shearPresetBtn).toBeVisible();
    await shearPresetBtn.click();
    await expect(page.locator("text=5.00").first()).toBeVisible();

    // 3. 验证无运行时未捕获异常
    expect(errors).toEqual([]);
  });
});
