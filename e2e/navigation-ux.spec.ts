import { expect, test } from "@playwright/test";

test.describe("导航体验与回到顶部 UX E2E 冒烟测试", () => {
  test("页面滚动、回到顶部按钮与导航 Header 交互", async ({ page }) => {
    const errors: string[] = [];
    page.on("pageerror", (err) => errors.push(err.message));

    await page.goto("/posts/linear-algebra/projection-operators");
    await page.waitForLoadState("domcontentloaded");

    // 1. 验证顶部 Header 初始存在
    const header = page.getByRole("banner");
    await expect(header).toBeVisible();

    // 2. 模拟向下滚动 800px -> Header 静默收起
    await page.evaluate(() => window.scrollTo(0, 800));
    await page.waitForTimeout(200);

    // 3. 点击回到顶部按钮
    const backToTopBtn = page.locator("#back-to-top");
    await expect(backToTopBtn).toBeVisible();
    await backToTopBtn.click();
    await page.waitForTimeout(300);

    const scrollY = await page.evaluate(() => window.scrollY);
    expect(scrollY).toBeLessThan(200);

    // 4. 验证无运行时未捕获异常
    expect(errors).toEqual([]);
  });
});
