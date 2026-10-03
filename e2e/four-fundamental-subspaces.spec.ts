import { expect, test } from "@playwright/test";

test.describe("Four Fundamental Subspaces 文章与 FourSubspacesDemo E2E 冒烟测试", () => {
  test("页面加载、KaTeX 渲染与四大基本子空间 Canvas 交互", async ({ page }) => {
    const errors: string[] = [];
    page.on("pageerror", (err) => errors.push(err.message));

    await page.goto("/posts/linear-algebra/four-fundamental-subspaces");
    await page.waitForLoadState("domcontentloaded");

    // 1. 验证标题与 KaTeX 渲染
    await expect(page).toHaveTitle(/四大基本子空间/);
    await expect(page.locator(".katex").first()).toBeVisible();
    await expect(page.locator(".katex-error")).toHaveCount(0);

    // 2. 验证 Canvas 画布挂载与预设切换
    const canvas = page.locator("canvas").first();
    await canvas.scrollIntoViewIfNeeded();
    await expect(canvas).toBeVisible();

    const orthoBtn = page.getByRole("button", { name: /正交投影/ });
    await orthoBtn.scrollIntoViewIfNeeded();
    await orthoBtn.click({ force: true });
    await expect(
      page.getByText(/正交投影 \(P²=P, Pᵀ=P\)/).first(),
    ).toBeVisible();

    // 3. 验证无运行时未捕获异常
    expect(errors).toEqual([]);
  });
});
