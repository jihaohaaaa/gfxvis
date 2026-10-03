import { expect, test } from "@playwright/test";

test.describe("Matrix Inverse 文章与 MatrixInverseDemo E2E 冒烟测试", () => {
  test("页面加载、KaTeX 渲染与逆矩阵 Canvas 交互", async ({ page }) => {
    const errors: string[] = [];
    page.on("pageerror", (err) => errors.push(err.message));

    await page.goto("/posts/linear-algebra/matrix-inverse");
    await page.waitForLoadState("domcontentloaded");

    // 1. 验证标题与 KaTeX 渲染
    await expect(page).toHaveTitle(/矩阵的逆/);
    await expect(page.locator(".katex").first()).toBeVisible();
    await expect(page.locator(".katex-error")).toHaveCount(0);

    // 2. 滚动进入视口触发水合并验证 Canvas 与预设切换
    const demoHeading = page.getByRole("heading", { name: /交互演示/ });
    await demoHeading.scrollIntoViewIfNeeded();

    const canvas = page.locator("canvas").first();
    await expect(canvas).toBeVisible();

    const shearBtn = page.getByRole("button", { name: /水平剪切/ }).first();
    await shearBtn.scrollIntoViewIfNeeded();
    await expect(shearBtn).toBeVisible();
    await shearBtn.click();
    await expect(page.getByText(/保面积的仿射剪切/).first()).toBeVisible();

    // 3. 验证无运行时未捕获异常
    expect(errors).toEqual([]);
  });
});
