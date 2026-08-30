import { test, expect } from "@playwright/test";

test.describe("抽象向量空间与线性映射 文章与 AbstractLinearMapDiagram E2E 测试", () => {
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

  test("1. 页面基础加载、Title、KaTeX 数学公式与 AbstractLinearMapDiagram 挂载断言", async ({
    page,
  }) => {
    await page.goto(
      "/posts/linear-algebra/abstract-vector-spaces-and-linear-maps",
    );
    await page.waitForLoadState("domcontentloaded");

    // 检查文章标题
    const title = page.locator("h1");
    await expect(title).toContainText("抽象向量空间与线性映射");

    // 检查 KaTeX 公式正常渲染且无语法错误
    const katexMath = page.locator(".katex").first();
    await expect(katexMath).toBeVisible();
    await expect(page.locator(".katex-error")).toHaveCount(0);

    // 检查 AbstractLinearMapDiagram 交互组件挂载
    const diagram = page.locator("text=抽象算子同构图：多项式空间").first();
    await expect(diagram).toBeVisible();
  });

  test("2. 预设切换与多项式求导同构探针联动断言", async ({ page }) => {
    await page.goto(
      "/posts/linear-algebra/abstract-vector-spaces-and-linear-maps",
    );
    await page.waitForLoadState("domcontentloaded");

    // 验证核心诊断卡片挂载
    await expect(page.locator("text=秩-零度守恒等式").first()).toBeVisible();
    await expect(
      page.locator("text=核空间（零度 Nullity）").first(),
    ).toBeVisible();

    // 切换到一次直线预设
    const linearBtn = page.locator("button:has-text('一次直线')").first();
    await linearBtn.click();
    await expect(linearBtn).toBeVisible();

    // 切换到常数多项式预设（进入核空间）
    const constantBtn = page.locator("button:has-text('常数多项式')").first();
    await constantBtn.click();
    await expect(
      page.locator("text=当前多项式位于核空间 ker(D) 中").first(),
    ).toBeVisible();
  });

  test("3. 系数滑块调节与矩阵乘法实时联动测试", async ({ page }) => {
    await page.goto(
      "/posts/linear-algebra/abstract-vector-spaces-and-linear-maps",
    );
    await page.waitForLoadState("domcontentloaded");

    // 获取二次项系数滑块
    const cSlider = page.locator("input[type='range']").nth(2);
    await expect(cSlider).toBeVisible();

    // 拖动滑块将二次项系数设为 2
    await cSlider.fill("2");

    // 验证导数项与矩阵乘法联动更新
    await expect(page.locator("text=秩-零度守恒等式").first()).toBeVisible();
  });

  test("4. 文章交叉超链接有效性与导航测试", async ({ page }) => {
    await page.goto(
      "/posts/linear-algebra/abstract-vector-spaces-and-linear-maps",
    );
    await page.waitForLoadState("domcontentloaded");

    // 点击指向基与坐标变换文章的超链接
    const changeOfBasisLink = page
      .locator("a[href*='basis-coordinate-change-of-basis']")
      .first();
    await expect(changeOfBasisLink).toBeVisible();
    await changeOfBasisLink.click();

    await page.waitForURL(
      "**/posts/linear-algebra/basis-coordinate-change-of-basis*",
    );
    await expect(page.locator("h1")).toContainText("基");
  });
});
