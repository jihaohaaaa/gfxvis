import { expect, test } from "@playwright/test";

test.describe("存在类型文章与 ExistentialTypesDiagram E2E 冒烟测试", () => {
  test("页面加载、KaTeX 渲染与 ExistentialTypesDiagram 核心交互", async ({
    page,
  }) => {
    const errors: string[] = [];
    page.on("pageerror", (err) => errors.push(err.message));

    await page.goto("/posts/type-systems/existential-types");
    await page.waitForLoadState("domcontentloaded");

    // 1. 验证标题与 KaTeX 渲染
    await expect(page).toHaveTitle(/存在类型/);
    await expect(page.locator(".katex").first()).toBeVisible();
    await expect(page.locator(".katex-error")).toHaveCount(0);

    // 2. 验证组件挂载并执行预设切换
    const rustDynPreset = page
      .locator("button:has-text('2. Rust dyn Trait')")
      .first();
    await expect(rustDynPreset).toBeVisible();
    await rustDynPreset.click();
    await expect(page.locator("text=Trait").first()).toBeVisible();

    // 3. 验证无运行时未捕获异常
    expect(errors).toEqual([]);
  });
});
