import { test, expect } from "@playwright/test";

test.describe("左侧书签高阈值静止悬停文章目录 (350ms Dwell TOC Drawer) E2E 测试", () => {
  test("快速划过 (< 200ms) 绝对不误触打开，长停顿 (> 350ms) 才平滑展开目录", async ({
    page,
  }) => {
    await page.goto("/posts/linear-algebra/projection-operators");
    await page.waitForLoadState("domcontentloaded");

    const tocBtn = page.locator("#toc-toggle-btn");
    const drawer = page.locator("#toc-drawer");

    // 1. 验证初始状态处于收起状态
    await expect(drawer).toHaveClass(/-translate-x-full/);

    // 2. 模拟鼠标快速划过左侧区域 (100ms 快速掠过)
    await page.mouse.move(10, 300);
    await page.waitForTimeout(100);
    await page.mouse.move(600, 300);
    await page.waitForTimeout(200);

    // 验证抽屉绝对没有被误触打开
    await expect(drawer).toHaveClass(/-translate-x-full/);

    // 3. 模拟鼠标有意停留在 > 按钮上超过 400ms (满足 350ms 静止判定)
    await tocBtn.hover();
    await page.waitForTimeout(450);

    await expect(drawer).toHaveClass(/translate-x-0/);
    await expect(drawer).toBeVisible();

    // 4. 点击目录小节
    const targetLink = drawer.locator('a[href*="代数定义"]').first();
    await targetLink.click();
    await page.waitForTimeout(600);

    const targetHeading = page
      .locator("h2, h3")
      .filter({ hasText: "代数定义" })
      .first();
    await expect(targetHeading).toBeInViewport();

    // 5. 鼠标移开正文 -> 抽屉平滑收起
    await page.mouse.move(600, 300);
    await page.waitForTimeout(300);
    await expect(drawer).toHaveClass(/-translate-x-full/);
  });

  test("鼠标悬停展开抽屉后按下 Escape 键能够立即关闭抽屉", async ({ page }) => {
    await page.goto("/posts/linear-algebra/inner-product-spaces");
    await page.waitForLoadState("domcontentloaded");

    const tocBtn = page.locator("#toc-toggle-btn");
    const drawer = page.locator("#toc-drawer");

    // 悬停超过 400ms 展开抽屉
    await tocBtn.hover();
    await page.waitForTimeout(450);
    await expect(drawer).toHaveClass(/translate-x-0/);

    // 按下 Escape 键
    await page.keyboard.press("Escape");
    await page.waitForTimeout(200);
    await expect(drawer).toHaveClass(/-translate-x-full/);
  });
});
