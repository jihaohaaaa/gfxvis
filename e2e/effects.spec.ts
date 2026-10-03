import { expect, test } from "@playwright/test";

test.describe("代数效应与效应系统文章与 EffectsDiagram E2E 冒烟测试", () => {
  test("页面加载、KaTeX 渲染与 EffectsDiagram 核心交互", async ({ page }) => {
    const errors: string[] = [];
    page.on("pageerror", (err) => errors.push(err.message));

    await page.goto("/posts/type-systems/effects");
    await page.waitForLoadState("domcontentloaded");

    // 1. 验证标题与 KaTeX 渲染
    await expect(page).toHaveTitle(/代数效应与效应系统/);
    await expect(page.locator(".katex").first()).toBeVisible();
    await expect(page.locator(".katex-error")).toHaveCount(0);

    // 2. 验证组件挂载并执行一次核心交互
    const nextBtn = page.locator("button:has-text('下一步 ▶')").first();
    await expect(nextBtn).toBeVisible();
    await nextBtn.click();
    await expect(
      page.locator("text=步骤 2: 运行时沿动态调用栈寻找就近的 Handler").first(),
    ).toBeVisible();

    // 3. 验证无运行时未捕获异常
    expect(errors).toEqual([]);
  });
});
