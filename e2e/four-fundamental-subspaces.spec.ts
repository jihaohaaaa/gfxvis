import { test, expect } from "@playwright/test";

test.describe("Four Fundamental Subspaces 文章与 FourSubspacesDemo 可视化组件 E2E 测试", () => {
  const consoleErrors: string[] = [];

  test.beforeEach(async ({ page }) => {
    consoleErrors.length = 0;
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

  test("页面基础加载、Title、KaTeX数学公式与 Canvas 挂载断言", async ({
    page,
  }) => {
    const response = await page.goto(
      "/posts/linear-algebra/four-fundamental-subspaces",
    );
    expect(response?.status()).toBe(200);

    // 1. Title 断言
    await expect(page).toHaveTitle(/四大基本子空间与正交直和分解/);

    // 2. H1 标题断言
    const heading = page.locator("h1").first();
    await expect(heading).toContainText("四大基本子空间与正交直和分解");

    // 3. KaTeX 公式节点数量断言
    const katexElements = page.locator(".katex");
    const count = await katexElements.count();
    expect(count).toBeGreaterThan(15);

    // 4. FourSubspacesDemo 的 Canvas2D 元素断言
    const canvas = page.locator("canvas").first();
    await canvas.scrollIntoViewIfNeeded();
    await expect(canvas).toBeVisible();
  });

  test("FourSubspacesDemo 矩阵预设切换与子空间维度面板断言", async ({
    page,
  }) => {
    await page.goto("/posts/linear-algebra/four-fundamental-subspaces");

    // 1. 确保 client:visible 岛屿组件进入视口并完成 Hydration
    const canvas = page.locator("canvas").first();
    await canvas.scrollIntoViewIfNeeded();
    await page.waitForTimeout(600);

    // 2. 测试“正交投影矩阵”预设点击
    const projBtn = page.getByRole("button", { name: "正交投影矩阵" });
    await projBtn.click({ force: true });
    await expect(page.getByText("正交投影到方向 (2, 1)")).toBeVisible();

    // 3. 测试“满秩 (2×2 可逆)”预设点击
    const fullBtn = page.getByRole("button", { name: "满秩 (2×2 可逆)" });
    await fullBtn.click({ force: true });
    await expect(page.getByText("rank(A) = 2 (满秩可逆)")).toBeVisible();

    // 4. 测试“秩-1 (退化 1D)”预设点击
    const rank1Btn = page.getByRole("button", { name: "秩-1 (退化 1D)" });
    await rank1Btn.click({ force: true });
    await expect(page.getByText("rank(A) = 1 (秩亏退化)")).toBeVisible();
  });

  test("文章交叉超链接有效性断言", async ({ page }) => {
    await page.goto("/posts/linear-algebra/four-fundamental-subspaces");

    const link = page
      .locator('a[href="/posts/linear-algebra/matrix-rank-column-row-space"]')
      .first();
    await expect(link).toBeVisible();
  });
});
