import { expect, test } from "@playwright/test";

test.describe("微积分板块 (Calculus) E2E 冒烟测试", () => {
  test("微积分文章加载、KaTeX 渲染与向量场 Canvas 交互", async ({ page }) => {
    const errors: string[] = [];
    page.on("pageerror", (err) => errors.push(err.message));

    await page.goto("/posts/calculus/fields-and-operators");
    await page.waitForLoadState("domcontentloaded");

    // 1. 验证标题与 KaTeX 渲染
    await expect(page).toHaveTitle(/场论基础/);
    await expect(page.locator(".katex").first()).toBeVisible();
    await expect(page.locator(".katex-error")).toHaveCount(0);

    // 2. 验证 Canvas 画布挂载并执行预设切换
    const radialBtn = page.getByRole("button", { name: /径向场/ });
    await radialBtn.scrollIntoViewIfNeeded();
    await radialBtn.click({ force: true });
    await expect(page.locator("canvas").first()).toBeVisible();

    // 3. 验证无运行时未捕获异常
    expect(errors).toEqual([]);
  });
});
