import { expect, test } from "@playwright/test";

test.describe("四元数与 SO(3) 文章与 QuaternionRotationDemo E2E 冒烟测试", () => {
  test("页面加载、KaTeX 渲染与 3D 四元数姿态交互", async ({ page }) => {
    const errors: string[] = [];
    page.on("pageerror", (err) => errors.push(err.message));

    await page.goto("/posts/linear-algebra/quaternions-rotations-and-so3");
    await page.waitForLoadState("domcontentloaded");

    // 1. 验证标题与 KaTeX 渲染
    await expect(page).toHaveTitle(
      /四元数、三维旋转与 SO\(3\)：从代数结构、自由度到 SLERP/,
    );
    await expect(page.locator(".katex").first()).toBeVisible();
    await expect(page.locator(".katex-error")).toHaveCount(0);

    // 2. 验证 3D Canvas 与预设切换
    const demoHeading = page.getByRole("heading", {
      name: /3D 交互实战工作台/,
    });
    await demoHeading.scrollIntoViewIfNeeded();

    const canvas = page.locator("canvas").first();
    await expect(canvas).toBeVisible({ timeout: 10000 });

    const yawBtn = page.getByRole("button", { name: /偏航旋转 90°/ });
    if (await yawBtn.isVisible()) {
      await yawBtn.click({ force: true });
      await expect(page.getByText(/det\(R\) = 1\.00/).first()).toBeVisible();
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
