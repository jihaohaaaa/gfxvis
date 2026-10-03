import { expect, test } from "@playwright/test";

test.describe("Gram Matrix 文章与 GramMatrixDemo E2E 冒烟测试", () => {
  test("页面加载、KaTeX 渲染与 GramMatrixDemo 核心交互", async ({ page }) => {
    const errors: string[] = [];
    page.on("pageerror", (err) => errors.push(err.message));

    const response = await page.goto("/posts/linear-algebra/gram-matrix");
    expect(response?.status()).toBe(200);

    // 1. 验证标题与 KaTeX 渲染
    await expect(page).toHaveTitle(/Gram 矩阵与几何体积/);
    await expect(page.locator(".katex").first()).toBeVisible();
    await expect(page.locator(".katex-error")).toHaveCount(0);

    // 2. 验证 Canvas 画布挂载与预设交互
    const canvas = page.locator("canvas").first();
    await canvas.scrollIntoViewIfNeeded();
    await expect(canvas).toBeVisible();

    const collinearBtn = page.getByRole("button", { name: "共线 (退化 0°)" });
    await collinearBtn.scrollIntoViewIfNeeded();
    await collinearBtn.click({ force: true });
    await expect(page.getByText(/向量线性相关/).first()).toBeVisible({
      timeout: 5000,
    });

    // 3. 验证无运行时未捕获异常
    expect(errors).toEqual([]);
  });
});
