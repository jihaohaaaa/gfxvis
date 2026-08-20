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

    // 校验特征值分解与谱展开段落
    await expect(
      page.getByRole("heading", { name: /矩阵对角化与特征值分解/ }),
    ).toBeVisible();
    await expect(page.getByRole("heading", { name: /谱展开/ })).toBeVisible();
    await expect(
      page.getByRole("heading", { name: /矩阵分解全景透视/ }),
    ).toBeVisible();
  });

  test("6. 奇异值分解 (/posts/linear-algebra/singular-value-decomposition)", async ({
    page,
  }) => {
    await page.goto("/posts/linear-algebra/singular-value-decomposition");
    await page.waitForLoadState("domcontentloaded");

    await expect(page).toHaveTitle(/奇异值分解/);
    const h1 = page.locator("article h1").first();
    await expect(h1).toBeVisible();

    const mathNodes = page.locator(".katex");
    expect(await mathNodes.count()).toBeGreaterThan(15);

    const canvas = page.locator("canvas").first();
    await canvas.scrollIntoViewIfNeeded();
    await page.waitForTimeout(400);
    await expect(canvas).toBeVisible();

    // 交互测试：切换分步阶段与预设
    const step2Tab = page.getByRole("button", { name: /2\. 轴向缩放/ });
    await step2Tab.scrollIntoViewIfNeeded();
    await step2Tab.click();
    await expect(page.getByText("第二奇异值").first()).toBeVisible();

    const step3Tab = page.getByRole("button", { name: /3\. 旋转输出/ });
    await step3Tab.click();
    await expect(canvas).toBeVisible();

    const shearPreset = page.getByRole("button", { name: /剪切矩阵/ });
    await shearPreset.click();
    await expect(canvas).toBeVisible();

    // 校验正交群分解与代数推导段落
    await expect(
      page.getByRole("heading", { name: /核心思想的大一统/ }),
    ).toBeVisible();
    await expect(
      page.getByRole("heading", { name: /三维几何直观/ }),
    ).toBeVisible();
    await expect(page.getByRole("heading", { name: /一般形式/ })).toBeVisible();
    await expect(
      page.getByRole("heading", { name: /基变换视角/ }),
    ).toBeVisible();
    await expect(
      page.getByRole("heading", { name: /双边对称 Gram 矩阵的谱分解对偶/ }),
    ).toBeVisible();

    // 校验探测向量追踪与矩阵数值分解等式
    await expect(page.getByText("探测向量实时变换追踪")).toBeVisible();
    await expect(page.getByText("实时矩阵数值分解等式")).toBeVisible();
    await expect(page.getByText("左奇异矩阵").first()).toBeVisible();
    await expect(page.getByText("主轴向量").first()).toBeVisible();
    await expect(page.getByText("原像主向").first()).toBeVisible();
    await expect(page.getByText("基底向量映射校验")).toBeVisible();
  });
});
