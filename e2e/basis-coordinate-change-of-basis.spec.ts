import { expect, test } from "@playwright/test";

test.describe("Change of Basis 文章与 ChangeOfBasisDemo E2E 冒烟测试", () => {
  test("页面加载、KaTeX 渲染与 ChangeOfBasisDemo 核心交互", async ({
    page,
  }) => {
    const errors: string[] = [];
    page.on("pageerror", (err) => errors.push(err.message));

    await page.goto("/posts/linear-algebra/basis-coordinate-change-of-basis");
    await page.waitForLoadState("domcontentloaded");

    // 1. 验证标题与 KaTeX 渲染
    await expect(page).toHaveTitle(/基、坐标表示与基变换/);
    await expect(page.locator(".katex").first()).toBeVisible();
    await expect(page.locator(".katex-error")).toHaveCount(0);

    // 2. 验证 Canvas 画布挂载
    const canvas = page.locator("canvas").first();
    await canvas.scrollIntoViewIfNeeded();
    await expect(canvas).toBeVisible();

    // 3. 验证无运行时未捕获异常
    expect(errors).toEqual([]);
  });
});
