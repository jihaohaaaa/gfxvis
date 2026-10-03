import { expect, test } from "@playwright/test";

test.describe("Rotation, SO(3), and Camera View Transform E2E 冒烟测试", () => {
  test("页面加载、KaTeX 渲染与 3D 双视口相机矩阵联动", async ({ page }) => {
    const errors: string[] = [];
    page.on("pageerror", (err) => errors.push(err.message));

    await page.goto("/posts/linear-algebra/rotation-so3-view-transform");
    await page.waitForLoadState("domcontentloaded");

    // 1. 验证标题与 KaTeX 渲染
    await expect(page).toHaveTitle(
      /三维旋转、正交群 SO\(3\) 与图形学 View 变换/,
    );
    await expect(page.locator(".katex").first()).toBeVisible();
    await expect(page.locator(".katex-error")).toHaveCount(0);

    // 2. 验证 3D Canvas 与视角预设切换
    const demoHeading = page.getByRole("heading", {
      name: /3D 双视口交互演示/,
    });
    await demoHeading.scrollIntoViewIfNeeded();

    const canvas = page.locator("canvas").first();
    await expect(canvas).toBeVisible({ timeout: 10000 });

    const topdownBtn = page.getByRole("button", { name: /鸟瞰俯视/ });
    if (await topdownBtn.isVisible()) {
      await topdownBtn.click({ force: true });
      await expect(page.getByText(/det\(R.*1\.00/).first()).toBeVisible();
    }

    // 3. 验证无运行时未捕获异常
    const realErrors = errors.filter(
      (err) =>
        !err.includes("favicon") &&
        !err.includes("WebGL") &&
        !err.includes("CONTEXT_LOST"),
    );
    expect(realErrors).toEqual([]);
  });
});
