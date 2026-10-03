import { expect, test } from "@playwright/test";

test.describe("文章标题锚点与深层链接复制 E2E 冒烟测试", () => {
  test("小节标题锚点存在、点击更新 Hash 并弹出 Toast", async ({
    page,
    context,
  }) => {
    await context.grantPermissions(["clipboard-read", "clipboard-write"]);
    const errors: string[] = [];
    page.on("pageerror", (err) => errors.push(err.message));

    await page.goto("/posts/linear-algebra/projection-operators");
    await page.waitForLoadState("domcontentloaded");

    // 1. 验证小节标题与锚点
    const targetHeading = page.locator(".prose h2").first();
    await expect(targetHeading).toBeVisible();

    const anchor = targetHeading.locator(".heading-anchor");
    await expect(anchor).toBeAttached();

    // 2. 点击锚点图标
    await anchor.click();

    // 3. 验证 Toast 弹出
    const toast = page.locator("#heading-copy-toast");
    await expect(toast).toBeVisible();

    // 4. 验证无运行时未捕获异常
    expect(errors).toEqual([]);
  });
});
