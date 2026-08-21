import { test, expect } from "@playwright/test";

test.describe("GitHub Flavored Markdown (GFM) Alert 提示框 E2E 测试", () => {
  test("1. Note 提示框渲染与样式验证 (/posts/linear-algebra/projection-operators)", async ({
    page,
  }) => {
    await page.goto("/posts/linear-algebra/projection-operators");
    await page.waitForLoadState("domcontentloaded");

    const noteAlert = page
      .locator(".markdown-alert.markdown-alert-note")
      .first();
    await expect(noteAlert).toBeVisible();

    // 检查标题与图标
    const title = noteAlert.locator(".markdown-alert-title");
    await expect(title).toContainText("Note");
    const svgIcon = title.locator("svg.markdown-alert-icon");
    await expect(svgIcon).toBeVisible();

    // 检查内部正文与 KaTeX 公式渲染
    await expect(noteAlert).toContainText("正规方程在几何本质上正是");
    const katexMath = noteAlert.locator(".katex").first();
    await expect(katexMath).toBeVisible();

    // 检查内部超链接跳转
    const leastSquaresLink = noteAlert.locator(
      'a[href*="/posts/linear-algebra/least-squares"]',
    );
    await expect(leastSquaresLink).toBeVisible();
  });

  test("2. Tip 提示框渲染与样式验证 (/posts/linear-algebra/least-squares)", async ({
    page,
  }) => {
    await page.goto("/posts/linear-algebra/least-squares");
    await page.waitForLoadState("domcontentloaded");

    const tipAlert = page.locator(".markdown-alert.markdown-alert-tip").first();
    await expect(tipAlert).toBeVisible();

    const title = tipAlert.locator(".markdown-alert-title");
    await expect(title).toContainText("Tip");
    const svgIcon = title.locator("svg.markdown-alert-icon");
    await expect(svgIcon).toBeVisible();

    await expect(tipAlert).toContainText("几何第一性原理");
  });

  test("3. Important / Warning 提示框渲染验证 (/posts/linear-algebra/matrix-inverse)", async ({
    page,
  }) => {
    await page.goto("/posts/linear-algebra/matrix-inverse");
    await page.waitForLoadState("domcontentloaded");

    // Important 提示框
    const importantAlert = page
      .locator(".markdown-alert.markdown-alert-important")
      .first();
    await expect(importantAlert).toBeVisible();
    await expect(importantAlert.locator(".markdown-alert-title")).toContainText(
      "Important",
    );

    // Warning 提示框
    const warningAlert = page
      .locator(".markdown-alert.markdown-alert-warning")
      .first();
    await expect(warningAlert).toBeVisible();
    await expect(warningAlert.locator(".markdown-alert-title")).toContainText(
      "Warning",
    );
  });

  test("4. 普通 Blockquote 正常渲染而不被误识别为 Alert", async ({ page }) => {
    await page.goto("/posts/linear-algebra/inner-product-spaces");
    await page.waitForLoadState("domcontentloaded");

    // 验证常规 blockquote 正常存在且不受影响
    const regularBlockquotes = page.locator(".prose blockquote");
    const count = await regularBlockquotes.count();
    expect(count).toBeGreaterThanOrEqual(1);
  });
});
