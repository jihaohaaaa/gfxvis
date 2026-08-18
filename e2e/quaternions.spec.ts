import { test, expect } from "@playwright/test";

test.describe("Quaternions, Rotations, and SO(3) 文章与 QuaternionRotationDemo 3D 可视化组件 E2E 测试", () => {
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
    const realErrors = consoleErrors.filter(
      (err) =>
        !err.includes("favicon") &&
        !err.includes("WebGL") &&
        !err.includes("CONTEXT_LOST"),
    );
    expect(realErrors, "不应产生控制台 JS 异常").toEqual([]);
  });

  test("页面基础加载、Title、KaTeX 数学公式与 3D 工作台挂载断言", async ({
    page,
  }) => {
    await page.goto("/posts/linear-algebra/quaternions-rotations-and-so3");
    await page.waitForLoadState("domcontentloaded");

    // 1. 验证标题与 H1
    await expect(page).toHaveTitle(
      /四元数、三维旋转与 SO\(3\)：从代数结构、自由度到 SLERP/,
    );
    const h1 = page.locator("article h1").first();
    await expect(h1).toBeVisible();
    await expect(h1).toContainText(
      "四元数、三维旋转与 SO(3)：从代数结构、自由度到 SLERP",
    );

    // 2. 验证 KaTeX 数学公式渲染
    const katexMath = page.locator(".katex").first();
    await expect(katexMath).toBeVisible();

    // 3. 验证自由度对比图表挂载
    await expect(
      page.getByText("三维旋转三大数学表象体系与自由度（DoF）全景对比").first(),
    ).toBeVisible();

    // 4. 滚动到 3D 工作台区域并断言 Canvas
    const demoHeading = page.getByRole("heading", {
      name: /3D 交互实战工作台/,
    });
    await demoHeading.scrollIntoViewIfNeeded();
    await page.waitForTimeout(600);

    const canvases = page.locator("canvas");
    await expect(canvases.first()).toBeVisible({ timeout: 10000 });
  });

  test("QuaternionRotationDemo 预设切换、参数滑块与双重覆盖 -q 验证断言", async ({
    page,
  }) => {
    await page.goto("/posts/linear-algebra/quaternions-rotations-and-so3");
    await page.waitForLoadState("domcontentloaded");

    const demoHeading = page.getByRole("heading", {
      name: /3D 交互实战工作台/,
    });
    await demoHeading.scrollIntoViewIfNeeded();
    await page.waitForTimeout(600);

    // 1. 验证默认恒等姿态
    await expect(page.getByText("恒等姿态 (零旋转)").first()).toBeVisible({
      timeout: 10000,
    });

    // 2. 切换到“偏航旋转 90°”预设
    const yawBtn = page.getByRole("button", { name: /偏航旋转 90°/ });
    await yawBtn.scrollIntoViewIfNeeded();
    await yawBtn.click({ force: true });
    await expect(page.getByText(/半角 θ\/2 = 45\.0°/).first()).toBeVisible({
      timeout: 5000,
    });

    // 3. 验证 3×3 矩阵行列式保持为 1.00
    await expect(page.getByText(/det\(R\) = 1\.00/).first()).toBeVisible();

    // 4. 验证双重覆盖 -q 切换功能
    const doubleCoverBtn = page.getByRole("button", {
      name: /切换至对跖四元数 -q/,
    });
    await doubleCoverBtn.scrollIntoViewIfNeeded();
    await doubleCoverBtn.click({ force: true });

    // 验证切换为 -q 状态按钮文案更新
    await expect(
      page.getByText("当前为对跖四元数 -q (姿态完全一致)").first(),
    ).toBeVisible();
    // 矩阵行列式与旋转仍严格保持 1.00
    await expect(page.getByText(/det\(R\) = 1\.00/).first()).toBeVisible();
  });

  test("QuaternionRotationDemo SLERP vs Matrix LERP 插值对比与动画时间轴断言", async ({
    page,
  }) => {
    await page.goto("/posts/linear-algebra/quaternions-rotations-and-so3");
    await page.waitForLoadState("domcontentloaded");

    const demoHeading = page.getByRole("heading", {
      name: /3D 交互实战工作台/,
    });
    await demoHeading.scrollIntoViewIfNeeded();
    await page.waitForTimeout(600);

    // 1. 切换到插值对比 Tab
    const interpTab = page.getByRole("button", {
      name: /SLERP 球面插值 vs Matrix LERP 形变对比/,
    });
    await interpTab.scrollIntoViewIfNeeded();
    await interpTab.click({ force: true });

    // 2. 验证插值对比视口与说明卡片
    await expect(page.getByText("四元数球面插值 (SLERP)").first()).toBeVisible({
      timeout: 5000,
    });
    await expect(
      page.getByText("矩阵直接线性混合 (Matrix LERP)").first(),
    ).toBeVisible();

    // 3. 验证自动播放插值按钮
    const playBtn = page.getByRole("button", { name: /自动播放插值/ });
    await expect(playBtn).toBeVisible();
    await playBtn.click({ force: true });
    await expect(page.getByRole("button", { name: /暂停动画/ })).toBeVisible();
  });

  test("文章交叉超链接有效性断言", async ({ page }) => {
    await page.goto("/posts/linear-algebra/quaternions-rotations-and-so3");
    await page.waitForLoadState("domcontentloaded");

    // 验证指向《三维旋转、正交群 SO(3) 与图形学 View 变换》的超链接存在
    const rotLink = page.getByRole("link", {
      name: /三维旋转、正交群 SO\(3\) 与图形学 View 变换/,
    });
    await expect(rotLink.first()).toBeVisible();
    expect(await rotLink.first().getAttribute("href")).toContain(
      "/posts/linear-algebra/rotation-so3-view-transform",
    );
  });
});
