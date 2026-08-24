import { test, expect } from "@playwright/test";

test.describe("Permutation Matrices 文章与 PermutationMatrixDemo 可视化组件 E2E 测试", () => {
  test("1. 页面基础加载、Title、KaTeX 数学公式与 3D Canvas 挂载断言", async ({
    page,
  }) => {
    await page.goto("/posts/linear-algebra/permutation-matrices");
    await page.waitForLoadState("domcontentloaded");

    // 检查页面标题
    const title = page.locator("h1");
    await expect(title).toContainText("置换矩阵");

    // 检查 KaTeX 公式正常渲染且无错误
    const katexMath = page.locator(".katex").first();
    await expect(katexMath).toBeVisible();
    await expect(page.locator(".katex-error")).toHaveCount(0);

    // 检查 PermutationMatrixDemo 挂载
    const demo = page
      .locator('[data-component="expandable-demo"], .relative')
      .first();
    await expect(demo).toBeVisible();

    // 检查 3D WebGL Canvas
    const canvas = page.locator("canvas").first();
    await expect(canvas).toBeVisible();
  });

  test("2. S₃ 对称群置换切换与 3D 几何手性 (det = ±1) 诊断联动测试", async ({
    page,
  }) => {
    await page.goto("/posts/linear-algebra/permutation-matrices");
    await page.waitForLoadState("domcontentloaded");

    // 默认对换 (1 2)：det = -1, 翻转为左手系
    await expect(page.locator("text=左手系翻转 (det = -1)")).toBeVisible();
    await expect(page.locator("text=奇置换 (Odd)")).toBeVisible();

    // 点击切换为 3-循环 (1 2 3)：det = +1, 保持右手系
    const cycle123Btn = page
      .locator("button:has-text('3-循环 (1 2 3)')")
      .first();
    await cycle123Btn.click();

    await expect(page.locator("text=右手系保持 (det = +1)")).toBeVisible();
    await expect(page.locator("text=偶置换 (Even)")).toBeVisible();
    await expect(page.locator("text=循环: (1 2 3)")).toBeVisible();

    // 点击切换为 恒等置换 (e)
    const identityBtn = page.locator("button:has-text('恒等置换 (e)')").first();
    await identityBtn.click();

    await expect(page.locator("text=右手系保持 (det = +1)")).toBeVisible();
    await expect(page.locator("text=逆序数 inv:").locator("..")).toContainText(
      "0",
    );
  });

  test("3. 稀疏矩阵 Cholesky 填充优化 Tab 切换与 AMD 置换对比测试", async ({
    page,
  }) => {
    await page.goto("/posts/linear-algebra/permutation-matrices");
    await page.waitForLoadState("domcontentloaded");

    // 切换到稀疏矩阵 Tab
    const sparseTabBtn = page.locator(
      "button:has-text('稀疏矩阵 Cholesky 填充优化')",
    );
    await sparseTabBtn.click();

    // 检查自然标号与 AMD 置换对比卡片
    await expect(page.locator("text=自然标号矩阵 A 与分解 L")).toBeVisible();
    await expect(page.locator("text=Fill-in: +8 个非零元")).toBeVisible();
    await expect(
      page.locator("text=RCM / AMD 置换后矩阵 P A Pᵀ 与 L"),
    ).toBeVisible();
    await expect(page.locator("text=Fill-in: 仅 +1 个非零元")).toBeVisible();
  });

  test("4. 文章双向超链接跳转有效性验证", async ({ page }) => {
    await page.goto("/posts/linear-algebra/permutation-matrices");
    await page.waitForLoadState("domcontentloaded");

    // 检查指向矩阵分解与逆矩阵的超链接
    const decompLink = page
      .locator('a[href*="/posts/linear-algebra/matrix-decompositions"]')
      .first();
    await expect(decompLink).toBeVisible();

    const inverseLink = page
      .locator('a[href*="/posts/linear-algebra/matrix-inverse"]')
      .first();
    await expect(inverseLink).toBeVisible();
  });

  test("5. CanvasToolbar 视口容器严格包裹与零 UI 遮挡断言", async ({
    page,
  }) => {
    await page.goto("/posts/linear-algebra/permutation-matrices");
    await page.waitForLoadState("domcontentloaded");

    const canvas = page.locator("canvas").first();
    await expect(canvas).toBeVisible();

    const canvasBox = await canvas.boundingBox();
    expect(canvasBox).not.toBeNull();

    // 找到 Canvas 内部的 CanvasToolbar
    const toolbar = page
      .locator("button:has-text('复位')")
      .first()
      .locator("..");
    await expect(toolbar).toBeVisible();

    const toolbarBox = await toolbar.boundingBox();
    expect(toolbarBox).not.toBeNull();

    // 1. 严格断言：工具栏必须位于 3D Canvas 容器区域内部
    if (canvasBox && toolbarBox) {
      expect(toolbarBox.y).toBeGreaterThanOrEqual(canvasBox.y - 10);
      expect(toolbarBox.y + toolbarBox.height).toBeLessThanOrEqual(
        canvasBox.y + canvasBox.height + 10,
      );
      expect(toolbarBox.x + toolbarBox.width).toBeLessThanOrEqual(
        canvasBox.x + canvasBox.width + 10,
      );
    }

    // 2. 严格断言：工具栏不得与顶部的操作按钮产生任何像素级重叠
    const opButton = page.locator("button:has-text('左乘 PA')").first();
    await expect(opButton).toBeVisible();
    const opBox = await opButton.boundingBox();
    expect(opBox).not.toBeNull();

    if (toolbarBox && opBox) {
      // 垂直方向工具栏应位于操作按钮下方（在 Canvas 内部）
      expect(toolbarBox.y).toBeGreaterThan(opBox.y + opBox.height);
    }
  });
});
