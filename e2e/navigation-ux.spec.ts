import { test, expect } from "@playwright/test";

test.describe("导航体验与回到顶部 UX E2E 测试", () => {
  test("长文页面向下滚动时静默收起，移至顶部唤出后点击 Logo 可无缝返回首页", async ({
    page,
  }) => {
    await page.goto("/posts/linear-algebra/projection-operators");
    await page.waitForLoadState("domcontentloaded");

    // 1. 验证顶部 Header 初始存在
    const header = page.getByRole("banner");
    await expect(header).toBeVisible();

    // 2. 模拟向下滚动 1200px -> Header 静默收起以保证专注阅读
    await page.evaluate(() => window.scrollTo(0, 1200));
    await page.waitForTimeout(300);
    await expect(header).toHaveClass(/-translate-y-full/);

    // 3. 鼠标移至顶部区域 (Y < 35px) -> 唤出 Header
    await page.mouse.move(300, 15);
    await page.waitForTimeout(200);
    await expect(header).toHaveClass(/translate-y-0/);

    // 4. 点击 Header 中的 Logo，验证能够无缝导航回首页
    const logo = header.locator('a[href="/"]').first();
    await logo.click();
    await page.waitForLoadState("domcontentloaded");

    await expect(page).toHaveURL("/");
    await expect(page.locator("h1").first()).toContainText("GFXVis");
  });

  test("滚动超过阈值后回到顶部按钮自动浮现，点击后平滑回到顶部", async ({
    page,
  }) => {
    await page.goto("/posts/linear-algebra/inner-product-spaces");
    await page.waitForLoadState("domcontentloaded");

    const backToTopBtn = page.locator("#back-to-top");
    // 初始在页面顶部，按钮应处于不可见状态
    await expect(backToTopBtn).toHaveClass(/invisible|opacity-0/);

    // 向下滚动 1000px
    await page.evaluate(() => window.scrollTo(0, 1000));
    await page.waitForTimeout(400);

    // 滚动后按钮可见
    await expect(backToTopBtn).toBeVisible();
    await expect(backToTopBtn).toHaveClass(/opacity-100/);

    // 点击回到顶部按钮
    await backToTopBtn.click();
    await page.waitForTimeout(600);

    // 验证视口已回到顶部
    let scrollY = await page.evaluate(() => window.scrollY);
    expect(scrollY).toBeLessThan(100);

    // 5. 测试核心功能：点击浏览器后退，能够自动平滑返回刚才阅读的 1000px 位置
    await page.goBack();
    await page.waitForTimeout(600);

    scrollY = await page.evaluate(() => window.scrollY);
    expect(scrollY).toBeGreaterThan(600);
  });

  test("长文阅读时滚动完全不弹出 Header（绝对静默），仅鼠标移至屏幕顶端时轻柔唤出", async ({
    page,
  }) => {
    await page.goto("/posts/linear-algebra/projection-operators");
    await page.waitForLoadState("domcontentloaded");

    const header = page.locator("#site-header");

    // 1. 初始在顶部，Header 正常显现
    await expect(header).toHaveClass(/translate-y-0/);

    // 2. 向下滚动到文章中段 800px -> Header 立即静默隐藏
    await page.evaluate(() => window.scrollTo(0, 800));
    await page.waitForTimeout(300);
    await expect(header).toHaveClass(/-translate-y-full/);

    // 3. 向上大幅滚动 300px -> Header 依然绝对静默，绝不弹出分心
    await page.evaluate(() => window.scrollTo(0, 500));
    await page.waitForTimeout(300);
    await expect(header).toHaveClass(/-translate-y-full/);

    // 4. 鼠标移至屏幕最顶端区域 (Y < 48px) -> Header 轻柔唤出
    await page.mouse.move(300, 20);
    await page.waitForTimeout(200);
    await expect(header).toHaveClass(/translate-y-0/);

    // 5. 鼠标离开顶端区域 -> Header 重新收起
    await page.mouse.move(300, 300);
    await page.waitForTimeout(200);
    await expect(header).toHaveClass(/-translate-y-full/);
  });
});
