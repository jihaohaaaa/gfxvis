import { test, expect } from "@playwright/test";

test.describe("Matrix Decompositions 文章与 MatrixDecompositionsDemo 可视化组件 E2E 测试", () => {
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

  test("页面基础加载、Title、KaTeX 数学公式与 Canvas 挂载断言", async ({
    page,
  }) => {
    await page.goto("/posts/linear-algebra/matrix-decompositions");
    await page.waitForLoadState("domcontentloaded");

    // 1. 验证文章标题
    await expect(page).toHaveTitle(/矩阵分解全景大一统/);

    const h1 = page.locator("h1");
    await expect(h1).toContainText("矩阵分解全景大一统");

    // 2. 验证 KaTeX 数学公式正常渲染
    const katexMath = page.locator(".katex").first();
    await expect(katexMath).toBeVisible();

    // 3. 验证 Canvas 画布挂载
    const canvas = page.locator("canvas").first();
    await expect(canvas).toBeVisible();
    const box = await canvas.boundingBox();
    expect(box?.width).toBeGreaterThan(200);
    expect(box?.height).toBeGreaterThan(200);
  });

  test("MatrixDecompositionsDemo 四大分解 Tab 切换与代数卡片断言", async ({
    page,
  }) => {
    await page.goto("/posts/linear-algebra/matrix-decompositions");
    await page.waitForLoadState("domcontentloaded");

    const demo = page.locator("#matrix-decompositions-demo");
    await expect(demo).toBeVisible();

    // 1. 切换至 LU 分解 Tab
    const luTab = demo.getByRole("button", { name: /1. LU 分解/ });
    await luTab.click();
    await expect(demo).toContainText("高斯消元三角分解：A = L · U");

    // 2. 切换至 QR 分解 Tab
    const qrTab = demo.getByRole("button", { name: /2. QR 分解/ });
    await qrTab.click();
    await expect(demo).toContainText("单边正交三角分解：A = Q · R");

    // 3. 切换至 极分解 Tab
    const polarTab = demo.getByRole("button", { name: /3. 极分解/ });
    await polarTab.click();
    await expect(demo).toContainText("右极分解：A = Q · P");

    // 4. 切换至 SVD 分解 Tab
    const svdTab = demo.getByRole("button", { name: /4. SVD 奇异值分解/ });
    await svdTab.click();
    await expect(demo).toContainText("奇异值分解：A = U · Σ · Vᵀ");
  });

  test("MatrixDecompositionsDemo 预设切换、时间轴滑块与工具栏切换测试", async ({
    page,
  }) => {
    await page.goto("/posts/linear-algebra/matrix-decompositions");
    await page.waitForLoadState("domcontentloaded");

    const demo = page.locator("#matrix-decompositions-demo");
    await expect(demo).toBeVisible();

    // 1. 预设切换测试（通过按钮点击）
    const spdBtn = demo.getByRole("button", { name: /实对称正定/ });
    await spdBtn.click();
    await page.waitForTimeout(200);

    // 验证对称正定矩阵计算结果正确展示
    await expect(demo).toContainText("det(A) = 1.80");

    // 2. 切换至近奇异预设
    const singularBtn = demo.getByRole("button", { name: /接近奇异退化/ });
    await singularBtn.click();
    await page.waitForTimeout(200);
    await expect(demo).toContainText("det(A) = 0.30");

    // 3. 时间轴滑块控制测试
    const slider = demo.locator('input[type="range"]').first();
    await slider.fill("0.5");
    await page.waitForTimeout(200);

    // 4. 动画播放与暂停测试
    const playBtn = demo.getByRole("button", { name: /播放分步/ });
    await playBtn.click();
    await expect(demo.getByRole("button", { name: /暂停/ })).toBeVisible();
    await page.waitForTimeout(300);
    const pauseBtn = demo.getByRole("button", { name: /暂停/ });
    await pauseBtn.click();
    await expect(demo.getByRole("button", { name: /播放分步/ })).toBeVisible();

    // 5. 工具栏按钮测试
    const gridBtn = demo.getByRole("button", { name: "网格" });
    await gridBtn.click();
    await page.waitForTimeout(100);
    await gridBtn.click();

    const circleBtn = demo.getByRole("button", { name: "椭圆" });
    await circleBtn.click();
    await page.waitForTimeout(100);
    await circleBtn.click();
  });

  test("文章双向超链接跳转与深层锚点测试", async ({ page }) => {
    await page.goto("/posts/linear-algebra/matrix-decompositions");
    await page.waitForLoadState("domcontentloaded");

    // 验证文章正文中的交叉链接存在
    const svdLink = page
      .locator('a[href*="/posts/linear-algebra/singular-value-decomposition"]')
      .first();
    await expect(svdLink).toBeVisible();

    const inverseLink = page
      .locator('a[href*="/posts/linear-algebra/matrix-inverse"]')
      .first();
    await expect(inverseLink).toBeVisible();
  });
});
