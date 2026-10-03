import { expect, test } from "@playwright/test";

test.describe("抽象向量空间与线性映射文章与 AbstractLinearMapDiagram E2E 冒烟测试", () => {
  test("页面加载、KaTeX 渲染与 AbstractLinearMapDiagram 核心交互", async ({
    page,
  }) => {
    const errors: string[] = [];
    page.on("pageerror", (err) => errors.push(err.message));

    await page.goto(
      "/posts/linear-algebra/abstract-vector-spaces-and-linear-maps",
    );
    await page.waitForLoadState("domcontentloaded");

    // 1. 验证标题与 KaTeX 渲染
    await expect(page).toHaveTitle(/抽象向量空间与线性映射/);
    await expect(page.locator(".katex").first()).toBeVisible();
    await expect(page.locator(".katex-error")).toHaveCount(0);

    // 2. 验证组件挂载并切换预设
    const linearBtn = page.locator("button:has-text('一次直线')").first();
    await expect(linearBtn).toBeVisible();
    await linearBtn.click();
    await expect(page.locator("text=秩-零度守恒等式").first()).toBeVisible();

    // 3. 验证无运行时未捕获异常
    expect(errors).toEqual([]);
  });
});
