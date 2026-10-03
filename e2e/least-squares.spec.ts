import { expect, test } from "@playwright/test";

test.describe("Least Squares 文章与 LeastSquaresDemo E2E 冒烟测试", () => {
  test("页面加载、KaTeX 渲染与 LeastSquaresDemo 双 Canvas 交互", async ({
    page,
  }) => {
    const errors: string[] = [];
    page.on("pageerror", (err) => errors.push(err.message));

    await page.goto("/posts/linear-algebra/least-squares");
    await page.waitForLoadState("domcontentloaded");

    // 1. 验证标题与 KaTeX 渲染
    await expect(page).toHaveTitle(/最小二乘法/);
    await expect(page.locator(".katex").first()).toBeVisible();
    await expect(page.locator(".katex-error")).toHaveCount(0);

    // 2. 滚动进入视口水合并验证双 Canvas 挂载与算法 Tab 切换
    const demo = page.locator("#least-squares-demo");
    await demo.scrollIntoViewIfNeeded();
    await expect(demo).toBeVisible();
    await expect(demo.locator("canvas")).toHaveCount(2);

    const qrTab = demo.getByRole("button", { name: /QR 分解法/ });
    if (await qrTab.isVisible()) {
      await qrTab.click();
      await expect(demo).toContainText("QR 分解法");
    }

    // 3. 验证无运行时未捕获异常
    expect(errors).toEqual([]);
  });
});
