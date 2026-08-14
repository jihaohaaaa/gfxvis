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

  test("3. 偏导数与切平面 (/posts/calculus/partial-derivatives)", async ({
    page,
  }) => {
    await page.goto("/posts/calculus/partial-derivatives");
    await page.waitForLoadState("domcontentloaded");

    await expect(page).toHaveTitle(/偏导数/);
    const h1 = page.locator("article h1").first();
    await expect(h1).toBeVisible();

    const mathNodes = page.locator(".katex");
    expect(await mathNodes.count()).toBeGreaterThan(10);
  });

  test("4. 标量场与梯度 (/posts/calculus/scalar-field-gradient)", async ({
    page,
  }) => {
    await page.goto("/posts/calculus/scalar-field-gradient");
    await page.waitForLoadState("domcontentloaded");

    await expect(page).toHaveTitle(/标量场与梯度/);
    const h1 = page.locator("article h1").first();
    await expect(h1).toBeVisible();

    const mathNodes = page.locator(".katex");
    expect(await mathNodes.count()).toBeGreaterThan(10);
  });

  test("5. 一元函数与切线 (/posts/calculus/tangent-line)", async ({ page }) => {
    await page.goto("/posts/calculus/tangent-line");
    await page.waitForLoadState("domcontentloaded");

    await expect(page).toHaveTitle(/一元函数与切线/);
    const h1 = page.locator("article h1").first();
    await expect(h1).toBeVisible();

    const canvas = page.locator("canvas").first();
    await expect(canvas).toBeVisible();
  });

  test("6. 向量场与微分算子 (/posts/calculus/vector-field-operators)", async ({
    page,
  }) => {
    await page.goto("/posts/calculus/vector-field-operators");
    await page.waitForLoadState("domcontentloaded");

    await expect(page).toHaveTitle(/向量场与微分算子/);
    const h1 = page.locator("article h1").first();
    await expect(h1).toBeVisible();

    const canvas = page.locator("canvas").first();
    await expect(canvas).toBeVisible();
  });
});
