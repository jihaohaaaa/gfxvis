import { test, expect } from "@playwright/test";

test.describe("文章标题锚点与深层链接复制 E2E 测试", () => {
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

  test("文章小节标题包含锚点，点击可更新 Hash 并弹出 Toast 提示", async ({
    page,
    context,
  }) => {
    // Grant clipboard permissions
    await context.grantPermissions(["clipboard-read", "clipboard-write"]);

    await page.goto("/posts/linear-algebra/projection-operators");
    await page.waitForLoadState("domcontentloaded");

    // 1. 验证小节标题存在且已自动注入 .heading-anchor
    const targetHeading = page.locator(".prose h2").first();
    await expect(targetHeading).toBeVisible();

    const headingId = await targetHeading.getAttribute("id");
    expect(headingId).toBeTruthy();

    const anchor = targetHeading.locator(".heading-anchor");
    await expect(anchor).toBeAttached();

    // 2. 点击锚点图标
    await anchor.click();

    // 3. 验证 URL Hash 正确更新 (兼容未编码或已 URL 编码形式)
    const encodedId = encodeURIComponent(headingId!);
    await expect(page).toHaveURL(new RegExp(`#.*(${encodedId}|${headingId})`));

    // 4. 验证 Toast 提示组件已弹出
    const toast = page.locator("#heading-copy-toast");
    await expect(toast).toBeVisible();
    await expect(toast).toContainText("已复制链接");

    // 5. 验证标题具有脉冲高亮样式
    await expect(targetHeading).toHaveClass(/heading-pulse/);
  });

  test("直接带 Hash 访问页面能够自动滚动定位并触发脉冲高亮", async ({
    page,
  }) => {
    await page.goto("/posts/linear-algebra/projection-operators");
    await page.waitForLoadState("domcontentloaded");

    const targetHeading = page.locator(".prose h2").nth(1);
    const headingId = await targetHeading.getAttribute("id");
    expect(headingId).toBeTruthy();

    await page.goto("/posts/linear-algebra/projection-operators#" + headingId);
    await page.waitForLoadState("domcontentloaded");

    await expect(targetHeading).toBeVisible();
    await expect(targetHeading).toHaveClass(/heading-pulse/, { timeout: 3000 });
  });

  test("带 Hash 刷新页面能够准确恢复至目标小节并处于视口范围内", async ({
    page,
  }) => {
    await page.goto("/posts/linear-algebra/projection-operators");
    await page.waitForLoadState("domcontentloaded");

    const targetHeading = page.locator(".prose h2").nth(2);
    const headingId = await targetHeading.getAttribute("id");
    expect(headingId).toBeTruthy();

    await page.goto("/posts/linear-algebra/projection-operators#" + headingId);
    await page.waitForLoadState("domcontentloaded");
    await page.waitForTimeout(500);

    await expect(targetHeading).toBeInViewport();

    // 页面刷新 (Reload)
    await page.reload();
    await page.waitForLoadState("domcontentloaded");
    await page.waitForTimeout(500);

    await expect(targetHeading).toBeInViewport();
  });
});
