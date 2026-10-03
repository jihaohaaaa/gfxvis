import { expect, test } from "@playwright/test";

test.describe("代数数据类型（ADT）与递归类型文章与 AdtRecursiveTypesDiagram E2E 冒烟测试", () => {
  test("页面加载、KaTeX 渲染与 AdtRecursiveTypesDiagram 核心交互", async ({
    page,
  }) => {
    const errors: string[] = [];
    page.on("pageerror", (err) => errors.push(err.message));

    await page.goto(
      "/posts/type-systems/algebraic-data-types-and-recursive-types",
    );
    await page.waitForLoadState("domcontentloaded");

    // 1. 验证标题与 KaTeX 渲染
    await expect(page).toHaveTitle(/代数数据类型/);
    await expect(page.locator(".katex").first()).toBeVisible();
    await expect(page.locator(".katex-error")).toHaveCount(0);

    // 2. 滚动进入视口触发水合并验证组件挂载
    const island = page.locator("astro-island").first();
    await island.scrollIntoViewIfNeeded();
    await expect(island).toBeVisible();

    // 3. 执行核心交互：点击单步展开 unfold 按钮
    const unfoldBtn = page
      .locator("button:has-text('展开一层 (unfold)')")
      .first();
    if (await unfoldBtn.isVisible()) {
      await unfoldBtn.click();
      await expect(page.locator("text=首次解构").first()).toBeVisible();
    }

    // 4. 验证无运行时未捕获异常
    expect(errors).toEqual([]);
  });
});
