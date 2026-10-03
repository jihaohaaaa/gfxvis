import { expect, test } from "@playwright/test";

test.describe("Matrix Decompositions 文章与 MatrixDecompositionsDemo E2E 冒烟测试", () => {
  test("页面加载、KaTeX 渲染与四大矩阵分解 Tab 切换", async ({ page }) => {
    const errors: string[] = [];
    page.on("pageerror", (err) => errors.push(err.message));

    await page.goto("/posts/linear-algebra/matrix-decompositions");
    await page.waitForLoadState("domcontentloaded");

    // 1. 验证标题与 KaTeX 渲染
    await expect(page).toHaveTitle(/矩阵分解全景大一统/);
    await expect(page.locator(".katex").first()).toBeVisible();
    await expect(page.locator(".katex-error")).toHaveCount(0);

    // 2. 验证 Canvas 画布挂载与 Tab 切换
    const demo = page.locator("#matrix-decompositions-demo");
    await expect(demo).toBeVisible();
    await expect(demo.locator("canvas").first()).toBeVisible();

    const qrTab = demo.getByRole("button", { name: /2. QR 分解/ });
    await qrTab.click();
    await expect(demo).toContainText("单边正交三角分解：A = Q · R");

    // 3. 验证无运行时未捕获异常
    expect(errors).toEqual([]);
  });
});
