import { test, expect } from "@playwright/test";

test.describe("Gram Matrix 文章与 GramMatrixDemo 可视化组件 E2E 测试", () => {
  let consoleErrors: string[] = [];

  test.beforeEach(async ({ page }) => {
    consoleErrors = [];

    // 拦截页面控制台 Error 与全局未捕获异常
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
    const response = await page.goto("/posts/linear-algebra/gram-matrix");
    expect(response?.status()).toBe(200);

    // 1. Title 断言
    await expect(page).toHaveTitle(/Gram 矩阵与几何体积/);

    // 2. H1 标题断言
    const heading = page.locator("article h1").first();
    await expect(heading).toContainText("Gram 矩阵与几何体积");

    // 3. KaTeX 公式节点数量断言
    const katexElements = page.locator(".katex");
    const count = await katexElements.count();
    expect(count).toBeGreaterThan(20);

    // 4. GramMatrixDemo 的 Canvas2D 元素断言
    const canvas = page.locator("canvas").first();
    await canvas.scrollIntoViewIfNeeded();
    await expect(canvas).toBeVisible();
  });

  test("GramMatrixDemo 快捷预设按钮与线性相关退化警示断言", async ({
    page,
  }) => {
    await page.goto("/posts/linear-algebra/gram-matrix");

    // 1. 确保 client:visible 岛屿组件滚动进入视口并完成 Hydration
    const canvas = page.locator("canvas").first();
    await canvas.scrollIntoViewIfNeeded();
    await page.waitForTimeout(600);

    const collinearBtn = page.getByRole("button", { name: "共线 (退化 0°)" });
    await collinearBtn.scrollIntoViewIfNeeded();
    await expect(canvas).toBeVisible();
    await expect(collinearBtn).toBeVisible();

    const warningText = page.getByText(/向量线性相关/).first();

    // 2. 点击“共线 (退化 0°)”，断言退化警示文字出现
    await collinearBtn.click({ force: true });
    await expect(warningText).toBeVisible({ timeout: 5000 });

    // 3. 点击“正交 (90°)”，断言退化警示文字消失
    const orthoBtn = page.getByRole("button", { name: "正交 (90°)" });
    await orthoBtn.scrollIntoViewIfNeeded();
    await orthoBtn.click({ force: true });
    await expect(warningText).not.toBeVisible();

    // 4. 点击“一般独立”，断言退化警示文字依然保持隐藏
    const generalBtn = page.getByRole("button", { name: "一般独立" });
    await generalBtn.scrollIntoViewIfNeeded();
    await generalBtn.click({ force: true });
    await expect(warningText).not.toBeVisible();
  });

  test("文章交叉超链接有效性断言", async ({ page }) => {
    await page.goto("/posts/linear-algebra/gram-matrix");

    // 验证指向 /posts/linear-algebra/projection-operators 的关联阅读超链接
    const link = page
      .locator('a[href="/posts/linear-algebra/projection-operators"]')
      .first();
    await expect(link).toBeVisible();
  });
});
