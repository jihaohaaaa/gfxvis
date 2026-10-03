import { expect, test } from "@playwright/test";

test.describe("文章只保留可交互组件模式 E2E 冒烟测试", () => {
  test("悬浮操作栏展开与只保留可交互组件模式切换", async ({ page }) => {
    const errors: string[] = [];
    page.on("pageerror", (err) => errors.push(err.message));

    await page.goto("/posts/linear-algebra/affine-spaces-and-affine-maps");
    await page.waitForLoadState("domcontentloaded");

    const actions = page.locator("#floating-actions");
    await actions.hover();
    await page.waitForTimeout(200);

    const interactiveButton = page.locator("#interactive-only-toggle");
    await expect(interactiveButton).toBeVisible();

    await interactiveButton.click();
    await expect(page.locator("body")).toHaveClass(/interactive-only-active/);

    // 再次展开并点击恢复
    await actions.hover();
    await page.waitForTimeout(200);
    await page.getByRole("button", { name: "显示完整文章" }).click();
    await expect(page.locator("body")).not.toHaveClass(
      /interactive-only-active/,
    );

    // 验证无运行时未捕获异常
    expect(errors).toEqual([]);
  });
});
