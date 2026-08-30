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
    await expect(header).toHaveClass(
      /-translate-y-28|-translate-y-24|-translate-y-full/,
    );

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

  test("回到顶部按钮作为主锚点常驻，鼠标靠近半展开，悬停全展开并可点击回到顶部", async ({
    page,
  }) => {
    await page.goto("/posts/linear-algebra/inner-product-spaces");
    await page.waitForLoadState("domcontentloaded");

    const backToTopBtn = page.locator("#back-to-top");
    const focusBtn = page.locator("#focus-toggle");
    const floatingActions = page.locator("#floating-actions");

    // 1. 初始在页面顶部，回到顶部主按钮默认存在
    await expect(backToTopBtn).toBeVisible();
    await expect(floatingActions).toHaveAttribute("data-state", "collapsed");

    // 2. 向下滚动 1000px -> 回到顶部按钮高亮激活
    await page.evaluate(() => window.scrollTo(0, 1000));
    await page.waitForTimeout(300);
    await expect(backToTopBtn).toHaveClass(/text-accent|opacity-100/);

    // 3. 鼠标移动到右下角附近 (~100px 处) -> 触发半展开 peek 状态
    const box = await floatingActions.boundingBox();
    if (box) {
      // 移动到卡片左上方 70px 处
      await page.mouse.move(box.x - 70, box.y - 70);
      await page.waitForTimeout(200);
      await expect(floatingActions).toHaveAttribute("data-state", "peek");
    }

    // 4. 鼠标直接移入卡片本体 -> 触发全展开 expanded 状态
    await floatingActions.hover();
    await page.waitForTimeout(200);
    await expect(floatingActions).toHaveAttribute("data-state", "expanded");
    await expect(focusBtn).toBeVisible();

    // 5. 点击回到顶部按钮
    await backToTopBtn.click();
    await page.waitForTimeout(600);

    // 验证视口已回到顶部
    let scrollY = await page.evaluate(() => window.scrollY);
    expect(scrollY).toBeLessThan(100);

    // 6. 测试核心功能：点击浏览器后退，能够自动平滑返回刚才阅读的 1000px 位置
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
    await expect(header).toHaveClass(
      /-translate-y-28|-translate-y-24|-translate-y-full/,
    );

    // 3. 向上大幅滚动 300px -> Header 依然绝对静默，绝不弹出分心
    await page.evaluate(() => window.scrollTo(0, 500));
    await page.waitForTimeout(300);
    await expect(header).toHaveClass(
      /-translate-y-28|-translate-y-24|-translate-y-full/,
    );

    // 4. 鼠标移至屏幕最顶端区域 (Y < 48px) -> Header 轻柔唤出
    await page.mouse.move(300, 20);
    await page.waitForTimeout(200);
    await expect(header).toHaveClass(/translate-y-0/);

    // 5. 鼠标离开顶端区域 -> Header 重新收起
    await page.mouse.move(300, 300);
    await page.waitForTimeout(200);
    await expect(header).toHaveClass(
      /-translate-y-28|-translate-y-24|-translate-y-full/,
    );
  });

  test("右下角 Focus 模式按钮：开启后锁定隐藏 Header，鼠标移至顶端绝不唤出，再次点击恢复", async ({
    page,
  }) => {
    await page.goto("/posts/linear-algebra/projection-operators");
    await page.waitForLoadState("domcontentloaded");

    const header = page.locator("#site-header");
    const focusBtn = page.locator("#focus-toggle");
    const focusToast = page.locator("#focus-toast");

    // 1. 初始在顶部，Header 正常显现
    await expect(header).toHaveClass(/translate-y-0/);

    // 2. 悬停展开悬浮卡片并点击 Focus 按钮 -> 开启专注模式
    const floatingActions = page.locator("#floating-actions");
    await floatingActions.hover();
    await page.waitForTimeout(200);
    await expect(focusBtn).toBeVisible();

    await focusBtn.click();
    await page.waitForTimeout(200);

    // 验证 Toast 弹出且 Header 立即收起
    await expect(focusToast).toHaveClass(/opacity-100/);
    await expect(header).toHaveClass(
      /-translate-y-28|-translate-y-24|-translate-y-full/,
    );
    await expect(focusBtn).toHaveAttribute("aria-pressed", "true");

    // 3. 鼠标移至屏幕最顶端区域 (Y < 20px) -> 在 Focus 模式下，Header 保持绝对锁定隐藏，绝不弹出
    await page.mouse.move(300, 10);
    await page.waitForTimeout(300);
    await expect(header).toHaveClass(
      /-translate-y-28|-translate-y-24|-translate-y-full/,
    );

    // 4. 再次移回右下角悬浮卡片并点击 Focus 按钮 -> 退出专注模式
    await floatingActions.hover();
    await page.waitForTimeout(200);
    await expect(focusBtn).toBeVisible();

    await focusBtn.click();
    await page.waitForTimeout(200);

    // 验证 Header 恢复显现 (由于仍在页面顶部 scrollY <= 80)
    await expect(header).toHaveClass(/translate-y-0/);
    await expect(focusBtn).toHaveAttribute("aria-pressed", "false");

    // 5. 鼠标离开悬浮卡片区域，验证卡片立即失去焦点并自动收起为 collapsed
    await page.mouse.move(100, 100);
    await page.waitForTimeout(200);
    await expect(floatingActions).toHaveAttribute("data-state", "collapsed");
    await expect(focusToast).toHaveClass(/opacity-0/, { timeout: 2000 });
  });
});
