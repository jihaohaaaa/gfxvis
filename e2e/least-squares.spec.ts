import { test, expect } from "@playwright/test";

test.describe("Least Squares 文章与 LeastSquaresDemo 可视化组件 E2E 测试", () => {
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

  test("页面基础加载、Title、KaTeX 数学公式与双 Canvas 挂载断言", async ({
    page,
  }) => {
    await page.goto("/posts/linear-algebra/least-squares");
    await page.waitForLoadState("domcontentloaded");

    // 1. 验证文章标题
    await expect(page).toHaveTitle(/最小二乘法/);

    const h1 = page.locator("h1");
    await expect(h1).toContainText("最小二乘法");

    // 2. 验证 KaTeX 数学公式正常渲染
    const katexMath = page.locator(".katex").first();
    await expect(katexMath).toBeVisible();

    // 3. 验证双 Canvas 画布挂载 (2D + 3D)
    const canvases = page.locator("#least-squares-demo canvas");
    await expect(canvases).toHaveCount(2);

    const box2D = await canvases.nth(0).boundingBox();
    expect(box2D?.width).toBeGreaterThan(150);
    expect(box2D?.height).toBeGreaterThan(150);

    const box3D = await canvases.nth(1).boundingBox();
    expect(box3D?.width).toBeGreaterThan(150);
    expect(box3D?.height).toBeGreaterThan(150);
  });

  test("LeastSquaresDemo 四大算法 Tab 切换与 Ridge 滑块断言", async ({
    page,
  }) => {
    await page.goto("/posts/linear-algebra/least-squares");
    await page.waitForLoadState("domcontentloaded");

    const demo = page.locator("#least-squares-demo");
    await expect(demo).toBeVisible();

    // 1. 切换至正规方程法
    const normalTab = demo.getByRole("button", { name: /1. 正规方程法/ });
    await normalTab.click();
    await expect(demo).toContainText("AᵀA x̂ = Aᵀb");

    // 2. 切换至 QR 分解法
    const qrTab = demo.getByRole("button", { name: /2. QR 分解法/ });
    await qrTab.click();
    await expect(demo).toContainText("最佳拟合直线");

    // 3. 切换至 SVD 伪逆法
    const svdTab = demo.getByRole("button", { name: /3. SVD 伪逆法/ });
    await svdTab.click();
    await expect(demo).toContainText("四大子空间正交性检验");

    // 4. 切换至 Ridge 正则化
    const ridgeTab = demo.getByRole("button", { name: /4. Ridge 正则化/ });
    await ridgeTab.click();
    await expect(demo).toContainText("Ridge 惩罚系数");

    // 调整 Ridge 惩罚滑块
    const slider = demo.locator('input[type="range"]').first();
    await slider.fill("2.5");
    await page.waitForTimeout(200);
  });

  test("LeastSquaresDemo 预设切换、工具栏开关与代数诊断卡片测试", async ({
    page,
  }) => {
    await page.goto("/posts/linear-algebra/least-squares");
    await page.waitForLoadState("domcontentloaded");

    const demo = page.locator("#least-squares-demo");
    await expect(demo).toBeVisible();

    // 1. 切换至完美共线预设 (零残差)
    const collinearBtn = demo.getByRole("button", { name: /完美共线/ });
    await collinearBtn.click({ force: true });
    await page.waitForTimeout(200);
    await expect(demo).toContainText("1.00x");
    await expect(demo).toContainText("0.000");

    // 2. 切换至病态近共线预设 (高条件数警示)
    const illBtn = demo.getByRole("button", { name: /病态近共线/ });
    await illBtn.click({ force: true });
    await page.waitForTimeout(200);
    await expect(demo).toContainText("严重病态");

    // 3. 切换至离群点预设
    const outlierBtn = demo.getByRole("button", { name: /严重离群点/ });
    await outlierBtn.click({ force: true });
    await page.waitForTimeout(200);

    // 4. 工具栏按钮切换
    const toggleSquareBtn = demo.getByRole("button", { name: /隐藏误差面积/ });
    await toggleSquareBtn.click();
    await page.waitForTimeout(100);
    const showSquareBtn = demo.getByRole("button", { name: /显示误差面积/ });
    await showSquareBtn.click();

    const togglePlaneBtn = demo.getByRole("button", { name: /隐藏列空间平面/ });
    await togglePlaneBtn.click();
    await page.waitForTimeout(100);
    const showPlaneBtn = demo.getByRole("button", { name: /显示.*平面/ });
    await showPlaneBtn.click();
  });

  test("BasisFittingDemo 基函数拟合组件 Tab 切换与多项式阶数切换断言", async ({
    page,
  }) => {
    await page.goto("/posts/linear-algebra/least-squares");
    await page.waitForLoadState("domcontentloaded");

    const demo = page.locator("#basis-fitting");
    await expect(demo).toBeVisible();

    // 1. 验证 Canvas 画布挂载
    const canvas = demo.locator("canvas");
    await expect(canvas).toBeVisible();

    // 2. 默认多项式基
    await expect(demo).toContainText("多项式最高阶数");

    // 切换至 2 阶
    const deg2Btn = demo.getByRole("button", { name: "2 阶" });
    await deg2Btn.click();
    await page.waitForTimeout(100);

    // 3. 切换至傅里叶基
    const fourierTab = demo.getByRole("button", { name: /傅里叶基/ });
    await fourierTab.click();
    await page.waitForTimeout(100);
    await expect(demo).toContainText("sin");

    // 4. 切换至径向基 (RBF)
    const rbfTab = demo.getByRole("button", { name: /径向基/ });
    await rbfTab.click();
    await page.waitForTimeout(100);
    await expect(demo).toContainText("RBF");
  });

  test("文章双向超链接有效性与跳转测试", async ({ page }) => {
    await page.goto("/posts/linear-algebra/least-squares");
    await page.waitForLoadState("domcontentloaded");

    // 验证文章正文中的交叉链接存在
    const fourSubspacesLink = page
      .locator('a[href*="/posts/linear-algebra/four-fundamental-subspaces"]')
      .first();
    await expect(fourSubspacesLink).toBeVisible();

    const projectionLink = page
      .locator('a[href*="/posts/linear-algebra/projection-operators"]')
      .first();
    await expect(projectionLink).toBeVisible();

    const svdLink = page
      .locator('a[href*="/posts/linear-algebra/singular-value-decomposition"]')
      .first();
    await expect(svdLink).toBeVisible();

    const innerProductLink = page
      .locator('a[href*="/posts/linear-algebra/inner-product-spaces"]')
      .first();
    await expect(innerProductLink).toBeVisible();

    const gramMatrixLink = page
      .locator('a[href*="/posts/linear-algebra/gram-matrix"]')
      .first();
    await expect(gramMatrixLink).toBeVisible();
  });
});
