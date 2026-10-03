import { expect, test } from "@playwright/test";

test.describe("GitHub Flavored Markdown Alert 提示框 E2E 冒烟测试", () => {
  test("Note / Tip 提示框渲染与样式验证", async ({ page }) => {
    const errors: string[] = [];
    page.on("pageerror", (err) => errors.push(err.message));

    await page.goto("/posts/linear-algebra/projection-operators");
    await page.waitForLoadState("domcontentloaded");

    // 1. 验证 Note 提示框与内部 KaTeX
    const noteAlert = page
      .locator(".markdown-alert.markdown-alert-note")
      .first();
    await expect(noteAlert).toBeVisible();

    const title = noteAlert.locator(".markdown-alert-title");
    await expect(title).toContainText("Note");
    await expect(title.locator("svg.markdown-alert-icon")).toBeVisible();
    await expect(noteAlert.locator(".katex").first()).toBeVisible();

    // 2. 验证无运行时未捕获异常
    expect(errors).toEqual([]);
  });
});
