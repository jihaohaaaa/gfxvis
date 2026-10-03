import { expect, test } from "@playwright/test";

test.describe("Permutation Matrices 文章与 PermutationMatrixDemo E2E 冒烟测试", () => {
  test("页面加载、KaTeX 渲染与 3D 置换矩阵交互", async ({ page }) => {
    const errors: string[] = [];
    page.on("pageerror", (err) => errors.push(err.message));

    await page.goto("/posts/linear-algebra/permutation-matrices");
    await page.waitForLoadState("domcontentloaded");

    // 1. 验证标题与 KaTeX 渲染
    await expect(page).toHaveTitle(/置换矩阵/);
    await expect(page.locator(".katex").first()).toBeVisible();
    await expect(page.locator(".katex-error")).toHaveCount(0);

    // 2. 验证 3D Canvas 与置换群预设切换
    const canvas = page.locator("canvas").first();
    await expect(canvas).toBeVisible();

    const cycleBtn = page.locator("button:has-text('3-循环 (1 2 3)')").first();
    await expect(cycleBtn).toBeVisible();
    await cycleBtn.click();
    await expect(page.locator("text=偶置换 (Even)")).toBeVisible();

    // 3. 验证无运行时未捕获异常
    expect(errors).toEqual([]);
  });
});
