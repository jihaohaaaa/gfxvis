import { test, expect } from "@playwright/test";

test.describe("网站通用页面 E2E 测试 (首页 / 关于 / 文章列表 / 标签页)", () => {
  let consoleErrors: string[] = [];

  test.beforeEach(async ({ page }) => {
    consoleErrors = [];
    page.on("console", (msg) => {
      if (msg.type() === "error") {
        consoleErrors.push(msg.text());
      }
    });
    page.on("pageerror", (err) => {
      consoleErrors.push(err.message);
    });
  });

  test.afterEach(() => {
    expect(consoleErrors, "不应产生控制台 JS 异常").toEqual([]);
  });

  test("首页 (/) 加载、标题与文章卡片展示测试", async ({ page }) => {
    await page.goto("/");
    await page.waitForLoadState("domcontentloaded");

    // 1. 验证 Title 与 Header
    await expect(page).toHaveTitle(/GFXVis/);
    const headerLogo = page.locator("header").getByText("GFXVis").first();
    await expect(headerLogo).toBeVisible();

    // 2. 验证文章卡片列表
    const postCards = page.locator("article");
    const count = await postCards.count();
    expect(count).toBeGreaterThan(0);

    // 3. 验证页脚 Footer
    const footer = page.locator("footer");
    await expect(footer).toBeVisible();
  });

  test("关于页 (/about) 加载与内容断言", async ({ page }) => {
    await page.goto("/about");
    await page.waitForLoadState("domcontentloaded");

    // 1. Title 与 h1 验证
    await expect(page).toHaveTitle(/关于/);
    const h1 = page.locator("h1").first();
    await expect(h1).toBeVisible();
    await expect(h1).toHaveText("关于");
  });

  test("文章索引页 (/posts) 加载与全量卡片渲染", async ({ page }) => {
    await page.goto("/posts");
    await page.waitForLoadState("domcontentloaded");

    // 1. 验证 Title 与 h1
    await expect(page).toHaveTitle(/全部文章/);
    const h1 = page.locator("h1").first();
    await expect(h1).toContainText("全部文章");

    // 2. 验证所有 14 篇文章卡片挂载
    const postCards = page.locator("article");
    const count = await postCards.count();
    expect(count).toBe(14);
  });

  test("标签页 (/tags/linear-algebra) 筛选与文章列表断言", async ({ page }) => {
    await page.goto("/tags/linear-algebra");
    await page.waitForLoadState("domcontentloaded");

    // 1. 验证 Title 与标签标题
    await expect(page).toHaveTitle(/linear-algebra/);
    const h1 = page.locator("h1").first();
    await expect(h1).toContainText("linear-algebra");

    // 2. 验证筛选出的文章列表非空
    const postCards = page.locator("article");
    const count = await postCards.count();
    expect(count).toBeGreaterThan(0);
  });
});
