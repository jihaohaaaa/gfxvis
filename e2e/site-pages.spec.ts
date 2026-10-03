import { expect, test } from "@playwright/test";

test.describe("网站通用核心页面 E2E 冒烟测试", () => {
  test("首页、全部文章页与关于页基础加载", async ({ page }) => {
    const errors: string[] = [];
    page.on("pageerror", (err) => errors.push(err.message));

    // 1. 验证首页
    await page.goto("/");
    await page.waitForLoadState("domcontentloaded");
    await expect(page).toHaveTitle(/GFXVis/);
    await expect(page.locator("article").first()).toBeVisible();

    // 2. 验证全部文章页
    await page.goto("/posts");
    await page.waitForLoadState("domcontentloaded");
    await expect(page).toHaveTitle(/全部文章/);
    await expect(page.locator("article").first()).toBeVisible();

    // 3. 验证关于页
    await page.goto("/about");
    await page.waitForLoadState("domcontentloaded");
    await expect(page).toHaveTitle(/关于/);

    // 4. 验证无运行时未捕获异常
    expect(errors).toEqual([]);
  });
});
