import { expect, test } from "@playwright/test";

test.describe("类型类与特质文章与 TypeClassesTraitsDiagram E2E 冒烟测试", () => {
  test("页面加载、KaTeX 渲染与 TypeClassesTraitsDiagram 核心交互", async ({
    page,
  }) => {
    const errors: string[] = [];
    page.on("pageerror", (err) => errors.push(err.message));

    await page.goto("/posts/type-systems/type-classes-traits");
    await page.waitForLoadState("domcontentloaded");

    // 1. 验证标题与 KaTeX 渲染
    await expect(page).toHaveTitle(/类型类与特质/);
    await expect(page.locator(".katex").first()).toBeVisible();
    await expect(page.locator(".katex-error")).toHaveCount(0);

    // 2. 滚动触发水合并执行预设切换
    const island = page.locator("astro-island").first();
    await island.scrollIntoViewIfNeeded();

    const orphanPresetBtn = page
      .locator("button:has-text('2. Rust 孤儿规则与全局唯一性')")
      .first();
    if (await orphanPresetBtn.isVisible()) {
      await orphanPresetBtn.click();
      await expect(page.locator("text=Coherence").first()).toBeVisible();
    }

    // 3. 验证无运行时未捕获异常
    expect(errors).toEqual([]);
  });
});
