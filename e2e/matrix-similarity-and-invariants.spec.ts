import { test, expect } from "@playwright/test";

test.describe("矩阵相似、相似不变量与特征结构 文章与 MatrixSimilarityDiagram E2E 测试", () => {
  let consoleErrors: string[] = [];
  let allConsoleLogs: string[] = [];

  test.beforeEach(async ({ page }) => {
    consoleErrors = [];
    allConsoleLogs = [];
    page.on("console", (msg) => {
      allConsoleLogs.push(`[${msg.type()}] ${msg.text()}`);
      if (msg.type() === "error") {
        consoleErrors.push(msg.text());
      }
    });
    page.on("pageerror", (err) => {
      consoleErrors.push(err.message);
    });
  });

  test.afterEach(() => {
    if (allConsoleLogs.length > 0) {
      console.log("Console messages:", allConsoleLogs);
    }
    expect(consoleErrors, "不应产生控制台 JS 异常").toEqual([]);
  });

  test("1. 页面基础加载、Title、KaTeX 数学公式与 MatrixSimilarityDiagram 挂载断言", async ({
    page,
  }) => {
    await page.goto("/posts/linear-algebra/matrix-similarity-and-invariants");
    await page.waitForLoadState("domcontentloaded");

    // 检查文章标题
    const title = page.locator("h1");
    await expect(title).toContainText("矩阵相似");

    // 检查 KaTeX 公式正常渲染且无语法错误
    const katexMath = page.locator(".katex").first();
    await expect(katexMath).toBeVisible();
    await expect(page.locator(".katex-error")).toHaveCount(0);

    // 检查 MatrixSimilarityDiagram 交互组件挂载
    const diagram = page.locator("text=矩阵相似（Similarity）与坐标换基交换图");
    await expect(diagram).toBeVisible();
  });

  test("2. 预设切换与相似不变量（迹、行列式、特征值）探针联动断言", async ({
    page,
  }) => {
    await page.goto("/posts/linear-algebra/matrix-similarity-and-invariants");
    await page.waitForLoadState("domcontentloaded");

    // 默认实对称矩阵预设：特征值 λ=4, 2，tr=6, det=8
    await expect(
      page.locator("text=换基交换图（Commutative Diagram）").first(),
    ).toBeVisible();
    await expect(page.locator("text=已对角化！").first()).toBeVisible();

    // 切换到三角剪切矩阵预设 (tr=5, det=6, λ=3, 2)
    const shearPresetBtn = page
      .locator("button:has-text('三角剪切矩阵')")
      .first();
    await shearPresetBtn.click();
    await expect(page.locator("text=5.00").first()).toBeVisible();

    // 切换到亏损矩阵（Jordan 块）预设 (tr=4, det=4)
    const defectivePresetBtn = page
      .locator("button:has-text('亏损矩阵')")
      .first();
    await defectivePresetBtn.click();
    await expect(page.locator("text=4.00").first()).toBeVisible();

    // 切换到伸缩旋转复合预设 (复特征值)
    const rotationPresetBtn = page
      .locator("button:has-text('伸缩旋转复合')")
      .first();
    await rotationPresetBtn.click();
    await expect(page.locator("text=5.00").first()).toBeVisible();
  });

  test("3. 基底参数滑块调节与矩阵数值实时联动测试", async ({ page }) => {
    await page.goto("/posts/linear-algebra/matrix-similarity-and-invariants");
    await page.waitForLoadState("domcontentloaded");

    // 获取角度输入滑块
    const angleSlider = page.locator("input[type='range']").first();
    await expect(angleSlider).toBeVisible();

    // 拖动滑块改变旋转角
    await angleSlider.fill("30");

    // 验证换基矩阵 P 与相似矩阵 B 实时渲染
    await expect(page.locator("text=新基表示矩阵").first()).toBeVisible();
    await expect(
      page.locator("text=相似不变量（严格恒等守恒）").first(),
    ).toBeVisible();
  });

  test("4. 文章交叉超链接有效性与导航测试", async ({ page }) => {
    await page.goto("/posts/linear-algebra/matrix-similarity-and-invariants");
    await page.waitForLoadState("domcontentloaded");

    // 点击指向基变换文章的超链接
    const changeOfBasisLink = page
      .locator("a[href*='basis-coordinate-change-of-basis']")
      .first();
    await expect(changeOfBasisLink).toBeVisible();
    await changeOfBasisLink.click();

    await page.waitForURL(
      "**/posts/linear-algebra/basis-coordinate-change-of-basis*",
    );
    await expect(page.locator("h1")).toContainText("基、坐标表示与基变换");
  });
});
