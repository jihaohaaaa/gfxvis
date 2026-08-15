import { test, expect } from "@playwright/test";

test.describe("Inner Product Spaces 文章与 InnerProductSpaceDemo 可视化组件 E2E 测试", () => {
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

    await page.goto("/posts/linear-algebra/inner-product-spaces");
    await page.waitForLoadState("domcontentloaded");
  });

  test.afterEach(() => {
    expect(consoleErrors, "不应产生控制台 JS 异常").toEqual([]);
  });

  test("页面基础加载、Title、KaTeX数学公式与 Canvas 挂载断言", async ({
    page,
  }) => {
    // 1. Title 验证
    await expect(page).toHaveTitle(/内积空间/);

    // 2. 文章主标题 h1 验证
    const h1 = page.locator("article h1").first();
    await expect(h1).toBeVisible();
    await expect(h1).toContainText("内积空间");

    // 3. KaTeX 数学公式渲染检验 (验证页面渲染了 15 个以上的 KaTeX 节点)
    const mathNodes = page.locator(".katex");
    const count = await mathNodes.count();
    expect(count).toBeGreaterThan(15);

    // 4. Canvas 可视化元素挂载断言
    const canvas = page.locator("canvas");
    await expect(canvas).toBeVisible();
  });

  test("InnerProductSpaceDemo 三模式切换与快捷预设断言", async ({ page }) => {
    const canvas = page.locator("canvas");
    await canvas.scrollIntoViewIfNeeded();
    await page.waitForTimeout(600);

    // 1. 断言默认在“加权内积与度规椭圆”模式
    await expect(page.getByText("加权内积定义").first()).toBeVisible();

    // 2. 切换到“函数空间积分内积 ⟨f,g⟩”模式
    const funcTab = page.getByRole("button", {
      name: "函数空间积分内积 ⟨f,g⟩",
    });
    await funcTab.scrollIntoViewIfNeeded();
    await funcTab.click();
    await expect(page.getByText("积分内积结果").first()).toBeVisible();

    // 点击基函数预设“x 与 x²”
    const presetBtn = page.getByRole("button", {
      name: "x 与 x² (奇次与偶次多项式正交)",
    });
    await presetBtn.scrollIntoViewIfNeeded();
    await presetBtn.click();
    await expect(page.getByText("正交函数对 ⟨f,g⟩ = 0").first()).toBeVisible();

    // 3. 切换到“柯西-施瓦茨与平行四边形恒等式”模式
    const theoremTab = page.getByRole("button", {
      name: "柯西-施瓦茨与平行四边形恒等式",
    });
    await theoremTab.scrollIntoViewIfNeeded();
    await theoremTab.click();
    await expect(page.getByText("柯西-施瓦茨不等式").first()).toBeVisible();
    await expect(page.getByText("✓ 不等式成立").first()).toBeVisible();
    await expect(page.getByText("✓ 恒等式精确相等").first()).toBeVisible();
  });

  test("文章交叉超链接有效性断言", async ({ page }) => {
    // 验证指向 /posts/linear-algebra/gram-matrix 的关联阅读超链接
    const link = page
      .locator('a[href="/posts/linear-algebra/gram-matrix"]')
      .first();
    await expect(link).toBeVisible();
  });
});
