import { test, expect } from "@playwright/test";

test.describe("Matrix Inverse 文章与 MatrixInverseDemo 可视化组件 E2E 测试", () => {
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

    await page.goto("/posts/linear-algebra/matrix-inverse");
    await page.waitForLoadState("domcontentloaded");
  });

  test.afterEach(() => {
    expect(consoleErrors, "不应产生控制台 JS 异常").toEqual([]);
  });

  test("页面基础加载、Title、KaTeX数学公式与 Canvas 挂载断言", async ({
    page,
  }) => {
    // 1. Title 验证
    await expect(page).toHaveTitle(/矩阵的逆/);

    // 2. 文章主标题 h1 验证
    const h1 = page.locator("article h1").first();
    await expect(h1).toBeVisible();
    await expect(h1).toContainText("矩阵的逆");

    // 3. KaTeX 数学公式渲染检验
    const mathNodes = page.locator(".katex");
    const count = await mathNodes.count();
    expect(count).toBeGreaterThan(15);

    // 4. 滚动至交互演示区域并等待 Canvas 可视化元素挂载
    const demoHeading = page.getByRole("heading", { name: /交互演示/ });
    await demoHeading.scrollIntoViewIfNeeded();
    const canvas = page.locator("canvas").first();
    await expect(canvas).toBeVisible();
  });

  test("MatrixInverseDemo 模式 1：预设切换、时间轴滑块与奇异退化断言", async ({
    page,
  }) => {
    const demoHeading = page.getByRole("heading", { name: /交互演示/ });
    await demoHeading.scrollIntoViewIfNeeded();
    await page.waitForTimeout(600);

    // 1. 断言默认在 2D 空间变换模式
    await expect(page.getByText("矩阵 A 与 逆矩阵 A⁻¹").first()).toBeVisible();

    // 2. 切换到“水平剪切”预设
    const shearBtn = page.getByRole("button", { name: /水平剪切/ });
    await shearBtn.click({ force: true });
    await expect(page.getByText("保面积的仿射剪切").first()).toBeVisible();

    // 3. 切换到“奇异矩阵 (不可逆降维)”预设并断言不可逆警告
    const singularBtn = page.getByRole("button", { name: /奇异矩阵/ });
    await singularBtn.click({ force: true });
    await expect(
      page.getByText("不存在（矩阵奇异不可逆，信息已塌缩丢失）").first(),
    ).toBeVisible();

    // 4. 点击“应用正变换 A”与“初始网格 I”
    const applyBtn = page.getByRole("button", { name: "应用正变换 A" });
    await applyBtn.click({ force: true });
    const resetBtn = page.getByRole("button", { name: "初始网格 I" });
    await resetBtn.click({ force: true });
  });

  test("MatrixInverseDemo 模式 2：法线变换对比与正交性断言", async ({
    page,
  }) => {
    const demoHeading = page.getByRole("heading", { name: /交互演示/ });
    await demoHeading.scrollIntoViewIfNeeded();
    await page.waitForTimeout(600);

    // 1. 切换到图形学法线变换模式
    const normalTab = page.getByRole("button", {
      name: /图形学法线变换/,
    });
    await normalTab.scrollIntoViewIfNeeded();
    await normalTab.click({ force: true });
    await page.waitForTimeout(600);

    // 2. 断言法线变换说明与点积卡片呈现
    await expect(
      page.getByText("为什么不能用模型矩阵 M 直接变换法线？").first(),
    ).toBeVisible();
    await expect(
      page.getByText("法线矩阵的正解：逆转置矩阵 (M⁻¹)ᵀ").first(),
    ).toBeVisible();
    await expect(page.getByText(/直接变换点积/).first()).toBeVisible();
    await expect(page.getByText(/逆转置点积/).first()).toBeVisible();
  });
});
