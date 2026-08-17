import { test, expect } from "@playwright/test";

test.describe("微积分板块 (Calculus) 所有文章与可视化组件 E2E 测试", () => {
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

  test("1. 曲线与曲面 (/posts/calculus/curves-and-surfaces)", async ({
    page,
  }) => {
    await page.goto("/posts/calculus/curves-and-surfaces");
    await page.waitForLoadState("domcontentloaded");

    await expect(page).toHaveTitle(/曲线与曲面/);
    const h1 = page.locator("article h1").first();
    await expect(h1).toBeVisible();

    const mathNodes = page.locator(".katex");
    expect(await mathNodes.count()).toBeGreaterThan(10);
  });

  test("2. 导数与 Jacobian 矩阵 (/posts/calculus/derivative-gradient-jacobian)", async ({
    page,
  }) => {
    await page.goto("/posts/calculus/derivative-gradient-jacobian");
    await page.waitForLoadState("domcontentloaded");

    await expect(page).toHaveTitle(/导数/);
    const h1 = page.locator("article h1").first();
    await expect(h1).toBeVisible();

    const mathNodes = page.locator(".katex");
    expect(await mathNodes.count()).toBeGreaterThan(10);
  });

  test("3. 导数、偏导数与切空间 (/posts/calculus/derivatives-and-tangent-spaces)", async ({
    page,
  }) => {
    await page.goto("/posts/calculus/derivatives-and-tangent-spaces");
    await page.waitForLoadState("domcontentloaded");

    await expect(page).toHaveTitle(/导数、偏导数与切空间/);
    const h1 = page.locator("article h1").first();
    await expect(h1).toBeVisible();

    const mathNodes = page.locator(".katex");
    expect(await mathNodes.count()).toBeGreaterThan(15);

    const canvas = page.locator("canvas").first();
    await canvas.scrollIntoViewIfNeeded();
    await expect(canvas).toBeVisible();
  });

  test("4. 场论基础：标量场、向量场与微分算子 (/posts/calculus/fields-and-operators)", async ({
    page,
  }) => {
    await page.goto("/posts/calculus/fields-and-operators");
    await page.waitForLoadState("domcontentloaded");

    await expect(page).toHaveTitle(/场论基础/);
    const h1 = page.locator("article h1").first();
    await expect(h1).toBeVisible();

    const mathNodes = page.locator(".katex");
    expect(await mathNodes.count()).toBeGreaterThan(15);

    // 交互测试：向量场预设切换与探针
    const radialBtn = page.getByRole("button", { name: /径向场/ });
    await radialBtn.scrollIntoViewIfNeeded();
    await radialBtn.click({ force: true });
    await expect(page.getByText("解析 2.0").first()).toBeVisible();

    const rotBtn = page.getByRole("button", { name: /旋转场/ });
    await rotBtn.click({ force: true });
    await expect(page.getByText("解析 2.0").first()).toBeVisible();

    // 交互测试：3D 标量场探针与预设
    const saddleBtn = page.getByRole("button", { name: /鞍点原点/ });
    await saddleBtn.scrollIntoViewIfNeeded();
    await page.waitForTimeout(600);
    await saddleBtn.click({ force: true });
    await expect(page.getByText("(0.00, 0.00, 0.00)").first()).toBeVisible();

    // 断言 Canvas 挂载正常
    const canvases = page.locator("canvas");
    await expect(canvases.first()).toBeVisible();
  });
});
