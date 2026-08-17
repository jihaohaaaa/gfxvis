import { test, expect } from "@playwright/test";

test.describe("Change of Basis 文章与 ChangeOfBasisDemo 可视化组件 E2E 测试", () => {
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

    await page.goto("/posts/linear-algebra/basis-coordinate-change-of-basis");
    await page.waitForLoadState("domcontentloaded");
    const demoHeading = page.getByRole("heading", { name: /交互演示/ });
    await demoHeading.scrollIntoViewIfNeeded();
    await page.waitForTimeout(600);
  });

  test.afterEach(() => {
    expect(consoleErrors, "不应产生控制台 JS 异常").toEqual([]);
  });

  test("页面基础加载、Title、KaTeX数学公式与 Canvas 挂载断言", async ({
    page,
  }) => {
    // 1. Title 验证
    await expect(page).toHaveTitle(/基、坐标表示与基变换/);

    // 2. 文章主标题 h1 验证
    const h1 = page.locator("article h1").first();
    await expect(h1).toBeVisible();
    await expect(h1).toContainText("基、坐标表示与基变换");

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

  test("ChangeOfBasisDemo 2D 模式预设切换与坐标换算测试", async ({ page }) => {
    const demoHeading = page.getByRole("heading", { name: /交互演示/ });
    await demoHeading.scrollIntoViewIfNeeded();
    await expect(page.locator("canvas").first()).toBeVisible({
      timeout: 10000,
    });

    // 1. 断言默认在 2D 基变换模式
    await expect(
      page.getByText("同一向量在两组基下的坐标快照").first(),
    ).toBeVisible({ timeout: 10000 });

    // 2. 切换到“水平剪切基”预设
    const shearBtn = page.getByRole("button", { name: "水平剪切基" });
    await shearBtn.scrollIntoViewIfNeeded();
    await shearBtn.click({ force: true });
    await expect(page.getByText("保持 x 轴基底不变").first()).toBeVisible({
      timeout: 10000,
    });

    // 3. 切换到“一般非正交基”预设
    const generalBtn = page.getByRole("button", { name: "一般非正交基" });
    await generalBtn.scrollIntoViewIfNeeded();
    await generalBtn.click({ force: true });
    await expect(page.getByText("非正交且不同模长").first()).toBeVisible({
      timeout: 10000,
    });
  });

  test("ChangeOfBasisDemo 3D 模式切换与 3×3 矩阵列对应断言", async ({
    page,
  }) => {
    const demoHeading = page.getByRole("heading", { name: /交互演示/ });
    await demoHeading.scrollIntoViewIfNeeded();
    await expect(page.locator("canvas").first()).toBeVisible({
      timeout: 10000,
    });
    await page.waitForTimeout(500);

    // 1. 切换到 3D 模式
    const tab3D = page.getByRole("button", {
      name: /3D 图形学矩阵与局部坐标系/,
    });
    await tab3D.scrollIntoViewIfNeeded();
    await tab3D.click({ force: true });
    await page.waitForTimeout(500);

    // 2. 断言 3D 滑块、预设与两行矩阵分解面板呈现
    await expect(
      page.getByText("偏航角 Yaw (Z轴 / 垂直向上)").first(),
    ).toBeVisible({ timeout: 10000 });
    await expect(
      page.getByText("3×3 旋转矩阵复合公式与实时数值分解").first(),
    ).toBeVisible({ timeout: 10000 });
    await expect(
      page.getByText("第一行（三角符号公式）：").first(),
    ).toBeVisible();
    await expect(
      page.getByText("第二行（各轴具体矩阵连乘 = 最终复合旋转矩阵）：").first(),
    ).toBeVisible();
    await expect(
      page.getByText("三列对应局部基向量（右手系 Z-up）").first(),
    ).toBeVisible();
    await expect(page.getByText("第 1 列 (Right 右轴)").first()).toBeVisible();
    await expect(
      page.getByText("第 2 列 (Forward 前轴)").first(),
    ).toBeVisible();
    await expect(page.getByText("第 3 列 (Up 上轴)").first()).toBeVisible();

    // 3. 切换姿态预设（纯偏航）
    const yawPreset = page.getByRole("button", { name: "纯偏航 (Yaw 45°)" });
    await yawPreset.scrollIntoViewIfNeeded();
    await yawPreset.click();
    await expect(
      page.getByText("绕垂直 Z 轴（Up）逆时针旋转 45°").first(),
    ).toBeVisible({ timeout: 10000 });

    // 4. 切换几何模型（默认基向量立方体 -> 切换为相机视锥台）
    const modelToggle = page.getByRole("button", {
      name: "切换为相机视锥台",
    });
    await modelToggle.scrollIntoViewIfNeeded();
    await modelToggle.click();
    await expect(
      page.getByRole("button", { name: "切换为基向量立方体" }),
    ).toBeVisible({ timeout: 10000 });
  });
});
