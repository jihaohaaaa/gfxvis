import { test, expect } from "@playwright/test";

test.describe("仿射空间与仿射映射 文章与 AffineSpaceDiagram E2E 测试", () => {
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

  test("1. 页面基础加载、Title、KaTeX 公式与 AffineSpaceDiagram 挂载断言", async ({
    page,
  }) => {
    await page.goto("/posts/linear-algebra/affine-spaces-and-affine-maps");
    await page.waitForLoadState("domcontentloaded");

    // 检查文章标题
    const title = page.locator("h1");
    await expect(title).toContainText("仿射空间与仿射映射");

    // 检查 KaTeX 公式正常渲染且无语法错误
    const katexMath = page.locator(".katex").first();
    await expect(katexMath).toBeVisible();
    await expect(page.locator(".katex-error")).toHaveCount(0);

    // 检查 AffineSpaceDiagram 交互组件挂载
    const diagram = page.locator("text=仿射几何公理与代数结构交互探针").first();
    await expect(diagram).toBeVisible();
  });

  test("2. 模式一（点 vs 自由向量）原点滑块与画布直接拖拽断言", async ({
    page,
  }) => {
    await page.goto("/posts/linear-algebra/affine-spaces-and-affine-maps");
    await page.waitForLoadState("domcontentloaded");

    const diagram = page.locator("text=仿射几何公理与代数结构交互探针").first();
    await diagram.scrollIntoViewIfNeeded();
    await expect(diagram).toBeVisible();

    // 验证模式一默认选中与诊断卡片
    await expect(page.locator("text=代数差值向量").first()).toBeVisible();
    await expect(page.locator("text=观察者原点").first()).toBeVisible();

    // 1. 滑块调节
    const oxSlider = page.locator("input[type='range']").first();
    await expect(oxSlider).toBeVisible();
    await oxSlider.fill("1.4");

    // 2. 画布上直接拖拽原点 O
    const svgOrigin = page.locator("text=O (拖拽原点)").first();
    await expect(svgOrigin).toBeVisible();
    const box = await svgOrigin.boundingBox();
    if (box) {
      await page.mouse.move(box.x + 5, box.y + 5);
      await page.mouse.down();
      await page.mouse.move(box.x + 40, box.y + 30);
      await page.mouse.up();
    }

    // 检查差向量依然保持良好计算
    await expect(page.locator("text=代数差值向量").first()).toBeVisible();
  });

  test("3. 模式二（仿射标架与重心坐标）模式切换、滑块与点拖拽断言", async ({
    page,
  }) => {
    await page.goto("/posts/linear-algebra/affine-spaces-and-affine-maps");
    await page.waitForLoadState("domcontentloaded");

    const diagram = page.locator("text=仿射几何公理与代数结构交互探针").first();
    await diagram.scrollIntoViewIfNeeded();
    await expect(diagram).toBeVisible();

    // 切换到模式二
    const mode2Btn = page
      .locator("button:has-text('2. 仿射标架与重心坐标')")
      .first();
    await mode2Btn.click();

    // 验证模式二特有诊断卡片
    await expect(page.locator("text=处于凸包内部").first()).toBeVisible();

    // 调节 lambda1 滑块至外部
    const lambda1Slider = page.locator("input[type='range']").first();
    await lambda1Slider.fill("1.2");

    // 验证状态切换为处于凸包外部
    await expect(page.locator("text=处于凸包外部").first()).toBeVisible();
  });

  test("4. 模式三（齐次化超平面嵌入）模式切换与向量/点切换断言", async ({
    page,
  }) => {
    await page.goto("/posts/linear-algebra/affine-spaces-and-affine-maps");
    await page.waitForLoadState("domcontentloaded");

    const diagram = page.locator("text=仿射几何公理与代数结构交互探针").first();
    await diagram.scrollIntoViewIfNeeded();
    await expect(diagram).toBeVisible();

    // 切换到模式三
    const mode3Btn = page
      .locator("button:has-text('3. 齐次化超平面嵌入')")
      .first();
    await mode3Btn.click();

    // 验证模式三特有内容
    await expect(
      page.locator("text=仿射切片超平面 w = 1").first(),
    ).toBeVisible();

    // 切换到方向向量 (w = 0)
    const vectorBtn = page.locator("button:has-text('方向向量')").first();
    await vectorBtn.click();

    await expect(page.locator("text=平移分量").first()).toBeVisible();
  });

  test("5. CanvasToolbar S/M/L 视口高度切换与复位按钮断言", async ({
    page,
  }) => {
    await page.goto("/posts/linear-algebra/affine-spaces-and-affine-maps");
    await page.waitForLoadState("domcontentloaded");

    const diagram = page.locator("text=仿射几何公理与代数结构交互探针").first();
    await diagram.scrollIntoViewIfNeeded();
    await expect(diagram).toBeVisible();

    // 查找 CanvasToolbar 中的 S/M/L 按钮
    const btnL = page
      .locator("button[aria-label='大视口高度 (560px)']")
      .first();
    await expect(btnL).toBeVisible();
    await btnL.click();

    const btnS = page
      .locator("button[aria-label='标准视口高度 (300px)']")
      .first();
    await expect(btnS).toBeVisible();
    await btnS.click();

    // 查找复位按钮
    const resetBtn = page.locator("button[aria-label='复位视野']").first();
    await expect(resetBtn).toBeVisible();
    await resetBtn.click();
  });

  test("6. 文章交叉超链接有效性与导航测试", async ({ page }) => {
    await page.goto("/posts/linear-algebra/affine-spaces-and-affine-maps");
    await page.waitForLoadState("domcontentloaded");

    // 点击指向抽象向量空间的超链接
    const abstractLink = page
      .locator("a[href*='abstract-vector-spaces-and-linear-maps']")
      .first();
    await expect(abstractLink).toBeVisible();
    await abstractLink.click();
    await page.waitForURL(/abstract-vector-spaces-and-linear-maps/);
    await expect(page.locator("h1")).toContainText("抽象向量空间与线性映射");
  });
});
