import { test, expect } from "@playwright/test";

test.describe("线性代数板块 (Linear Algebra) 补充文章与可视化组件 E2E 测试", () => {
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

  test("1. 线性组合、线性相关与线性无关 (/posts/linear-algebra/linear-combination-independence)", async ({
    page,
  }) => {
    await page.goto("/posts/linear-algebra/linear-combination-independence");
    await page.waitForLoadState("domcontentloaded");

    await expect(page).toHaveTitle(/线性组合/);
    const h1 = page.locator("article h1").first();
    await expect(h1).toBeVisible();

    const mathNodes = page.locator(".katex");
    expect(await mathNodes.count()).toBeGreaterThan(10);
  });

  test("2. 矩阵的秩、列空间与行空间 (/posts/linear-algebra/matrix-rank-column-row-space)", async ({
    page,
  }) => {
    await page.goto("/posts/linear-algebra/matrix-rank-column-row-space");
    await page.waitForLoadState("domcontentloaded");

    await expect(page).toHaveTitle(/矩阵的秩、列空间与行空间/);
    const h1 = page.locator("article h1").first();
    await expect(h1).toBeVisible();

    const mathNodes = page.locator(".katex");
    expect(await mathNodes.count()).toBeGreaterThan(10);
  });

  test("3. 投影算子 (/posts/linear-algebra/projection-operators)", async ({
    page,
  }) => {
    await page.goto("/posts/linear-algebra/projection-operators");
    await page.waitForLoadState("domcontentloaded");

    await expect(page).toHaveTitle(/投影算子/);
    const h1 = page.locator("article h1").first();
    await expect(h1).toBeVisible();

    const canvases = page.locator("canvas");
    expect(await canvases.count()).toBeGreaterThanOrEqual(1);
  });
});
