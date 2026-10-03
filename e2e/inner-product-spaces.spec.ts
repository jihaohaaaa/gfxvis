import { expect, test } from "@playwright/test";

test.describe("Inner Product Spaces 文章与 InnerProductSpaceDemo E2E 冒烟测试", () => {
  test("页面加载、KaTeX 渲染与内积空间多模式切换", async ({ page }) => {
    const errors: string[] = [];
    page.on("pageerror", (err) => errors.push(err.message));

    await page.goto("/posts/linear-algebra/inner-product-spaces");
    await page.waitForLoadState("domcontentloaded");

    // 1. 验证标题与 KaTeX 渲染
    await expect(page).toHaveTitle(/内积空间/);
    await expect(page.locator(".katex").first()).toBeVisible();
    await expect(page.locator(".katex-error")).toHaveCount(0);

    // 2. 验证 Canvas 画布与模式切换
    const canvas = page.locator("canvas").first();
    await canvas.scrollIntoViewIfNeeded();
    await expect(canvas).toBeVisible();

    const funcTab = page.getByRole("button", { name: /函数空间积分内积/ });
    await funcTab.scrollIntoViewIfNeeded();
    await funcTab.click({ force: true });
    await expect(page.getByText("积分内积结果").first()).toBeVisible({
      timeout: 7000,
    });

    // 3. 验证无运行时未捕获异常
    expect(errors).toEqual([]);
  });
});
