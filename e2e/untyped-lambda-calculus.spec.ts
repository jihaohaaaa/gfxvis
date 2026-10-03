import { expect, test } from "@playwright/test";

test.describe("无类型 λ 演算（UTLC）文章与 LambdaReductionDiagram E2E 冒烟测试", () => {
  test("页面加载、KaTeX 渲染与 LambdaReductionDiagram 核心交互", async ({
    page,
  }) => {
    const errors: string[] = [];
    page.on("pageerror", (err) => errors.push(err.message));

    await page.goto("/posts/type-systems/untyped-lambda-calculus");
    await page.waitForLoadState("domcontentloaded");

    // 1. 验证标题与 KaTeX 渲染
    await expect(page).toHaveTitle(/无类型 λ 演算/);
    await expect(page.locator(".katex").first()).toBeVisible();
    await expect(page.locator(".katex-error")).toHaveCount(0);

    // 2. 滚动触发水合并执行单步归约
    const island = page.locator("astro-island").first();
    await island.scrollIntoViewIfNeeded();

    const nextBtn = page.locator("button:has-text('单步步进 ▶')").first();
    if (await nextBtn.isVisible()) {
      await nextBtn.click();
      await expect(page.locator("text=步数：2").first()).toBeVisible();
    }

    // 3. 验证无运行时未捕获异常
    expect(errors).toEqual([]);
  });
});
