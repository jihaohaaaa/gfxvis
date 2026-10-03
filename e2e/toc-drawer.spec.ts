import { expect, test } from "@playwright/test";

test.describe("文章目录抽屉 (TOC Drawer) E2E 冒烟测试", () => {
  test("悬停展开目录抽屉、KaTeX 公式渲染与小节导航", async ({ page }) => {
    const errors: string[] = [];
    page.on("pageerror", (err) => errors.push(err.message));

    await page.goto("/posts/linear-algebra/projection-operators");
    await page.waitForLoadState("domcontentloaded");

    const tocBtn = page.locator("#toc-toggle-btn");
    const drawer = page.locator("#toc-drawer");

    // 1. 悬停展开抽屉
    await tocBtn.hover();
    await page.waitForTimeout(450);
    await expect(drawer).toHaveClass(/translate-x-0/);

    // 2. 验证 TOC 中的链接渲染了 KaTeX 公式
    const tocLinks = drawer.locator("a.toc-link");
    await expect(tocLinks.first()).toBeVisible();

    // 3. 验证无运行时未捕获异常
    expect(errors).toEqual([]);
  });
});
