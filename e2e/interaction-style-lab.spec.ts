import { expect, test } from "@playwright/test";

test.describe("交互式可视化 UI 风格试验场 E2E 冒烟测试", () => {
  test("试验场页面加载、六种 KDE 布局挂载与 KaTeX 公式渲染", async ({
    page,
  }) => {
    const errors: string[] = [];
    page.on("pageerror", (err) => errors.push(err.message));

    await page.goto("/posts/visualization/interaction-style-lab");
    await page.waitForLoadState("domcontentloaded");

    // 1. 验证标题与布局样例存在
    await expect(page).toHaveTitle(/交互式可视化 UI 风格试验场/);

    const samples = page.locator('[data-style="kde"]');
    await expect(samples).toHaveCount(6);

    // 2. 验证首个样例 Canvas 与 KaTeX Readouts
    const firstSample = samples.first();
    await firstSample.scrollIntoViewIfNeeded();
    await expect(firstSample.locator("canvas").first()).toBeVisible();

    const readouts = firstSample.locator(".style-lab__readouts");
    await expect(readouts.locator(".katex")).not.toHaveCount(0);

    // 3. 验证无运行时未捕获异常
    expect(errors).toEqual([]);
  });
});
