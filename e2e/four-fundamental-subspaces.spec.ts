import { test, expect } from "@playwright/test";

test.describe("Four Fundamental Subspaces 文章与 FourSubspacesDemo 可视化组件 E2E 测试", () => {
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

  test("页面基础加载、Title、KaTeX数学公式与 Canvas 挂载断言", async ({
    page,
  }) => {
    await page.goto("/posts/linear-algebra/four-fundamental-subspaces");
    await page.waitForLoadState("domcontentloaded");

    // 1. Title 验证
    await expect(page).toHaveTitle(/四大基本子空间/);

    // 2. 文章主标题 h1 验证
    const h1 = page.locator("article h1").first();
    await expect(h1).toBeVisible();
    await expect(h1).toContainText("四大基本子空间");

    // 3. KaTeX 数学公式渲染检验 (验证页面渲染了 15 个以上的 KaTeX 节点)
    const mathNodes = page.locator(".katex");
    const count = await mathNodes.count();
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

    // 2. 测试“正交投影 (2, 1)”预设点击与正交属性徽章
    const orthoBtn = page.getByRole("button", { name: /正交投影/ });
    await orthoBtn.scrollIntoViewIfNeeded();
    await orthoBtn.click({ force: true });
    await expect(
      page.getByText(/正交投影 \(P²=P, Pᵀ=P\)/).first(),
    ).toBeVisible();

    // 3. 测试“斜投影 ((1,1)→x轴)”预设点击与斜投影徽章
    const obliqueBtn = page.getByRole("button", { name: /斜投影/ }).first();
    await obliqueBtn.scrollIntoViewIfNeeded();
    await obliqueBtn.click({ force: true });
    await expect(page.getByText(/斜投影 \(P²=P, Pᵀ≠P\)/).first()).toBeVisible();

    // 4. 测试“满秩 (2×2 可逆)”预设点击
    const fullBtn = page.getByRole("button", { name: "满秩 (2×2 可逆)" });
    await fullBtn.scrollIntoViewIfNeeded();
    await fullBtn.click({ force: true });
    await expect(page.getByText(/满秩可逆/).first()).toBeVisible();

    // 5. 测试“一般秩-1 (退化)”预设点击
    const rank1Btn = page.getByRole("button", { name: /一般秩-1/ });
    await rank1Btn.scrollIntoViewIfNeeded();
    await rank1Btn.click({ force: true });
    await expect(page.getByText(/非幂等变换 \(P²≠P\)/).first()).toBeVisible();
    await expect(page.getByText(/秩亏退化/).first()).toBeVisible();
  });

  test("文章交叉超链接有效性断言", async ({ page }) => {
    await page.goto("/posts/linear-algebra/four-fundamental-subspaces");

    // 验证指向 /posts/linear-algebra/gram-matrix 的关联阅读超链接
    const link = page
      .locator('a[href="/posts/linear-algebra/gram-matrix"]')
      .first();
    await expect(link).toBeVisible();
  });
});
