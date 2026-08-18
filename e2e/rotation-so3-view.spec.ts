import { test, expect } from "@playwright/test";

test.describe("Rotation, SO(3), and Camera View Transform 文章与 3D 可视化组件 E2E 测试", () => {
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

  test("页面基础加载、Title、KaTeX数学公式与 3D 双视口挂载断言", async ({
    page,
  }) => {
    await page.goto("/posts/linear-algebra/rotation-so3-view-transform");
    await page.waitForLoadState("domcontentloaded");

    // 1. 验证标题与 H1
    await expect(page).toHaveTitle(
      /三维旋转、正交群 SO\(3\) 与图形学 View 变换/,
    );
    const h1 = page.locator("article h1").first();
    await expect(h1).toBeVisible();
    await expect(h1).toContainText("三维旋转、正交群 SO(3) 与图形学 View 变换");

    // 2. 验证 KaTeX 数学公式渲染
    const katexMath = page.locator(".katex").first();
    await expect(katexMath).toBeVisible();

    // 3. 滚动到 3D LookAt 示意图区域并断言 Canvas
    const section1 = page.getByRole("heading", {
      name: /相机坐标系的定义/,
    });
    await section1.scrollIntoViewIfNeeded();
    await page.waitForTimeout(600);

    // 4. 滚动到 3D 双视口联动演示区域并等待 Canvas 挂载
    const demoHeading = page.getByRole("heading", {
      name: /3D 双视口交互演示/,
    });
    await demoHeading.scrollIntoViewIfNeeded();
    await page.waitForTimeout(600);

    const canvases = page.locator("canvas");
    await expect(canvases.first()).toBeVisible({ timeout: 10000 });
    expect(await canvases.count()).toBeGreaterThanOrEqual(3);
  });

  test("CameraLookAtDiagram 3D 相机正交基与 Gram-Schmidt 纠偏测试", async ({
    page,
  }) => {
    await page.goto("/posts/linear-algebra/rotation-so3-view-transform");
    await page.waitForLoadState("domcontentloaded");

    const section = page.getByRole("heading", {
      name: /相机坐标系的定义/,
    });
    await section.scrollIntoViewIfNeeded();
    await page.waitForTimeout(600);

    // 1. 验证 3D 组件内文本与推导面板
    await expect(
      page
        .getByText("三维相机坐标系与 Gram-Schmidt 正交化基底交互视图")
        .first(),
    ).toBeVisible({ timeout: 10000 });
    await expect(
      page.getByText("Gram-Schmidt 实时三步正交归一化推导").first(),
    ).toBeVisible();

    // 2. 切换到“Up 轴倾斜 (Gram-Schmidt 修正)”预设
    const tiltBtn = page.getByRole("button", {
      name: /Up 轴倾斜/,
    });
    await tiltBtn.scrollIntoViewIfNeeded();
    await tiltBtn.click({ force: true });

    // 3. 验证正交归一性点积仍然严格保持为 0.00
    await expect(page.getByText("正交归一性点积检验：")).toBeVisible();
    await expect(
      page.getByText(/r·u = 0\.00.*r·f = 0\.00/).first(),
    ).toBeVisible();
  });

  test("RotationViewDemo 预设视角切换与 4×4 视图矩阵数值联动断言", async ({
    page,
  }) => {
    await page.goto("/posts/linear-algebra/rotation-so3-view-transform");
    await page.waitForLoadState("domcontentloaded");

    // 1. 滚动触发组件水合
    const demoHeading = page.getByRole("heading", {
      name: /3D 双视口交互演示/,
    });
    await demoHeading.scrollIntoViewIfNeeded();
    await page.waitForTimeout(600);

    // 2. 验证默认正面平视预设与面板说明
    await expect(page.getByText("标准视平线观察").first()).toBeVisible({
      timeout: 10000,
    });
    await expect(
      page.getByText("4×4 LookAt 相机 View 矩阵实时展开").first(),
    ).toBeVisible();

    // 3. 切换到“鸟瞰俯视”预设
    const topdownBtn = page.getByRole("button", { name: /鸟瞰俯视/ });
    await topdownBtn.scrollIntoViewIfNeeded();
    await topdownBtn.click({ force: true });
    await expect(
      page.getByText("高空 45° 斜向下俯瞰场景中心").first(),
    ).toBeVisible({ timeout: 5000 });

    // 4. 切换到“荷兰倾斜角 (Dutch Angle)”预设
    const dutchBtn = page.getByRole("button", { name: /荷兰倾斜角/ });
    await dutchBtn.scrollIntoViewIfNeeded();
    await dutchBtn.click({ force: true });
    await expect(
      page.getByText("第一人称画面发生戏剧性的旋转翻滚").first(),
    ).toBeVisible({ timeout: 5000 });

    // 5. 验证特殊正交群 SO(3) 行列式保持为 1.00
    await expect(page.getByText("特殊正交群行列式 (SO(3))：")).toBeVisible();
    await expect(page.getByText(/det\(R.*1\.00/).first()).toBeVisible();
  });

  test("文章交叉超链接有效性断言", async ({ page }) => {
    await page.goto("/posts/linear-algebra/rotation-so3-view-transform");
    await page.waitForLoadState("domcontentloaded");

    // 验证指向《基、坐标表示与基变换》的超链接存在
    const basisLink = page.getByRole("link", {
      name: /基、坐标表示与基变换/,
    });
    await expect(basisLink.first()).toBeVisible();
    expect(await basisLink.first().getAttribute("href")).toContain(
      "/posts/linear-algebra/basis-coordinate-change-of-basis",
    );
  });
});
