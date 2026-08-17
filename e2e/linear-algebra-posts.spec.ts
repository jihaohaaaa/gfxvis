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

  test("4. 矩阵的迹与行列式 (/posts/linear-algebra/trace-and-determinant)", async ({
    page,
  }) => {
    await page.goto("/posts/linear-algebra/trace-and-determinant");
    await page.waitForLoadState("domcontentloaded");

    await expect(page).toHaveTitle(/矩阵的迹与行列式/);
    const h1 = page.locator("article h1").first();
    await expect(h1).toBeVisible();

    const mathNodes = page.locator(".katex");
    expect(await mathNodes.count()).toBeGreaterThan(15);

    const canvas = page.locator("canvas").first();
    await canvas.scrollIntoViewIfNeeded();
    await page.waitForTimeout(600);
    await expect(canvas).toBeVisible();

    // 交互测试：切换到连续流动模式与相似不变性模式
    const flowTab = page.getByRole("button", { name: /连续流动/ });
    await flowTab.scrollIntoViewIfNeeded();
    await flowTab.click({ force: true });
    await expect(page.getByText("Jacobi 体积展开").first()).toBeVisible({
      timeout: 10000,
    });

    const simTab = page.getByRole("button", { name: /基变换/ });
    await simTab.scrollIntoViewIfNeeded();
    await simTab.click({ force: true });
    await expect(page.getByText("新基底下的").first()).toBeVisible({
      timeout: 10000,
    });
  });

  test("5. 特征值与特征向量 (/posts/linear-algebra/eigenvalues-and-eigenvectors)", async ({
    page,
  }) => {
    await page.goto("/posts/linear-algebra/eigenvalues-and-eigenvectors");
    await page.waitForLoadState("domcontentloaded");

    await expect(page).toHaveTitle(/特征值与特征向量/);
    const h1 = page.locator("article h1").first();
    await expect(h1).toBeVisible();

    const mathNodes = page.locator(".katex");
    expect(await mathNodes.count()).toBeGreaterThan(15);

    const canvas = page.locator("canvas").first();
    await canvas.scrollIntoViewIfNeeded();
    await page.waitForTimeout(400);
    await expect(canvas).toBeVisible();

    // 交互测试：切换模式与预设
    const ellipseTab = page.getByRole("button", { name: /主轴椭圆/ });
    await ellipseTab.scrollIntoViewIfNeeded();
    await ellipseTab.click();
    await expect(canvas).toBeVisible();

    const diagTab = page.getByRole("button", { name: /对角化/ });
    await diagTab.click();
    await expect(canvas).toBeVisible();
  });
});
