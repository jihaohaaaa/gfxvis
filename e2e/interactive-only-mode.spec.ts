import { expect, test } from "@playwright/test";

async function openFloatingActions(page: import("@playwright/test").Page) {
  const actions = page.locator("#floating-actions");
  await actions.hover();
  await expect(actions).toHaveAttribute("data-state", "expanded");
  return actions;
}

test.describe("文章只保留可交互组件模式", () => {
  test("隐藏正文并保留 Astro islands，可独立开关专注模式", async ({ page }) => {
    await page.goto("/posts/linear-algebra/affine-spaces-and-affine-maps");
    const actions = await openFloatingActions(page);
    const interactiveButton = page.locator("#interactive-only-toggle");
    await expect(interactiveButton).toBeVisible();
    await expect(page.locator("article astro-island")).not.toHaveCount(0);

    await interactiveButton.click();
    await expect(page.locator("body")).toHaveClass(/interactive-only-active/);
    await expect(page.locator("article > header")).toBeHidden();
    await expect(page.locator("article > .prose > p").first()).toBeHidden();
    await expect(page.locator("article astro-island").first()).toBeVisible();
    await expect(interactiveButton).toHaveAttribute("aria-pressed", "true");

    await actions.hover();
    await page.getByRole("button", { name: "进入专注模式 (隐藏顶栏)" }).click();
    await expect(page.locator("body")).toHaveClass(/focus-mode-active/);
    await expect(page.locator("body")).toHaveClass(/interactive-only-active/);

    await actions.hover();
    await page.getByRole("button", { name: "显示完整文章" }).click();
    await expect(page.locator("body")).not.toHaveClass(
      /interactive-only-active/,
    );
    await expect(page.locator("article > header")).toBeVisible();
    await expect(page.locator("article > .prose > p").first()).toBeVisible();
    await expect(actions).toBeVisible();
  });

  test("没有 Astro island 的文章显示空状态", async ({ page }) => {
    await page.goto("/posts/calculus/derivative-gradient-jacobian");
    await openFloatingActions(page);
    await page.getByRole("button", { name: "只保留可交互组件" }).click();
    await expect(
      page.getByText("这篇文章没有可交互组件。", { exact: true }),
    ).toBeVisible();
    await expect(page.locator("article > header")).toBeHidden();
  });

  test("390px 窄屏下按钮和过滤模式不产生横向溢出", async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 844 });
    await page.goto("/posts/linear-algebra/affine-spaces-and-affine-maps");
    await openFloatingActions(page);
    await page.getByRole("button", { name: "只保留可交互组件" }).click();
    const overflow = await page.evaluate(
      () => document.documentElement.scrollWidth - window.innerWidth,
    );
    expect(overflow).toBeLessThanOrEqual(0);
    await expect(page.locator("body")).toHaveClass(/interactive-only-active/);
  });
});
