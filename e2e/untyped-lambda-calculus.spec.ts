import { test, expect } from "@playwright/test";

test.describe("无类型 λ 演算（UTLC）文章与 LambdaReductionDiagram E2E 测试", () => {
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

  test("1. 页面基础加载、Title、KaTeX 公式与 LambdaReductionDiagram 挂载断言", async ({
    page,
  }) => {
    await page.goto("/posts/type-systems/untyped-lambda-calculus");
    await page.waitForLoadState("domcontentloaded");

    // 检查文章主标题
    const title = page.locator("h1");
    await expect(title).toContainText("无类型 λ 演算（UTLC）");

    // 检查 KaTeX 公式正常渲染且无语法错误
    const katexMath = page.locator(".katex").first();
    await expect(katexMath).toBeVisible();
    await expect(page.locator(".katex-error")).toHaveCount(0);

    // 检查交互探针组件挂载
    const diagram = page
      .locator("text=无类型 λ 演算单步归约与求值策略探针")
      .first();
    await expect(diagram).toBeVisible();
  });

  test("2. 探针单步步进、回退与正规型达成验证", async ({ page }) => {
    await page.goto("/posts/type-systems/untyped-lambda-calculus");
    await page.waitForLoadState("domcontentloaded");

    const diagram = page
      .locator("text=无类型 λ 演算单步归约与求值策略探针")
      .first();
    await diagram.scrollIntoViewIfNeeded();
    await expect(diagram).toBeVisible();

    // 步数计数器初始为 1
    await expect(page.locator("text=步数：1 /").first()).toBeVisible();

    // 点击单步步进
    const nextBtn = page.locator("button:has-text('单步步进 ▶')").first();
    await expect(nextBtn).toBeVisible();
    await nextBtn.click();

    // 步数变为 2
    await expect(page.locator("text=步数：2 /").first()).toBeVisible();

    // 点击单步回退
    const prevBtn = page.locator("button:has-text('◀ 单步回退')").first();
    await expect(prevBtn).toBeVisible();
    await prevBtn.click();
    await expect(page.locator("text=步数：1 /").first()).toBeVisible();

    // 快速步进直到正规型
    while (await nextBtn.isEnabled()) {
      await nextBtn.click();
    }
    await expect(page.locator("text=达成正规型").first()).toBeVisible();
  });

  test("3. 求值策略（Call-by-Name 与 Call-by-Value）切换与惰性短路对比", async ({
    page,
  }) => {
    await page.goto("/posts/type-systems/untyped-lambda-calculus");
    await page.waitForLoadState("domcontentloaded");

    const diagram = page
      .locator("text=无类型 λ 演算单步归约与求值策略探针")
      .first();
    await diagram.scrollIntoViewIfNeeded();
    await expect(diagram).toBeVisible();

    // 默认 Call-by-Name 下策略特征卡片
    await expect(
      page.locator("text=Call-by-Name 正常序").first(),
    ).toBeVisible();

    // 切换至预设 5：死循环发散 Ω 组合子
    const presetBtn = page.locator("button:has-text('5. 死循环发散')").first();
    await expect(presetBtn).toBeVisible();
    await presetBtn.click();

    // 单步步进触发循环检测
    const nextBtn = page.locator("button:has-text('单步步进 ▶')").first();
    await nextBtn.click();

    // 验证检测到发散态
    await expect(page.locator("text=发散").first()).toBeVisible();
  });

  test("4. 自定义表达式解析与自由输入联动", async ({ page }) => {
    await page.goto("/posts/type-systems/untyped-lambda-calculus");
    await page.waitForLoadState("domcontentloaded");

    const input = page
      .locator("input[placeholder*='输入合法 λ 表达式']")
      .first();
    await input.scrollIntoViewIfNeeded();
    await expect(input).toBeVisible();

    // 确保组件已水合且初始步数指示器就绪
    await expect(page.locator("text=步数：1 / 3").first()).toBeVisible();

    // 输入简单表达式 (\x. x) y
    await input.fill("(\\x. x) y");

    // 验证能够成功解析且步数指示器存在并更新为 1 / 2
    await expect(page.locator("text=步数：1 / 2").first()).toBeVisible();
    const nextBtn = page.locator("button:has-text('单步步进 ▶')").first();
    await nextBtn.click();
    await expect(page.locator("text=达成正规型").first()).toBeVisible();
  });

  test("5. CanvasToolbar S/M/L 视口高度切换与复位按钮断言", async ({
    page,
  }) => {
    await page.goto("/posts/type-systems/untyped-lambda-calculus");
    await page.waitForLoadState("domcontentloaded");

    const diagram = page
      .locator("text=无类型 λ 演算单步归约与求值策略探针")
      .first();
    await diagram.scrollIntoViewIfNeeded();
    await expect(diagram).toBeVisible();

    // 查找 CanvasToolbar 中的 S/M/L 按钮
    const btnL = page
      .locator("button[aria-label='大视口高度 (560px)']")
      .first();
    await expect(btnL).toBeVisible();
    await btnL.click();

    const btnS = page
      .locator("button[aria-label='标准视口高度 (300px)']")
      .first();
    await expect(btnS).toBeVisible();
    await btnS.click();

    // 查找复位按钮
    const resetBtn = page.locator("button[aria-label='复位视野']").first();
    await expect(resetBtn).toBeVisible();
    await resetBtn.click();
  });

  test("6. 文章交叉超链接有效性与导航测试", async ({ page }) => {
    await page.goto("/posts/type-systems/untyped-lambda-calculus");
    await page.waitForLoadState("domcontentloaded");

    // 点击指向 Rust 借用检查器的超链接
    const borrowLink = page
      .locator("a[href*='formal-model-of-rust-borrow-checker']")
      .first();
    await expect(borrowLink).toBeVisible();
    await borrowLink.click();
    await page.waitForURL(/formal-model-of-rust-borrow-checker/);
    await expect(page.locator("h1")).toContainText("Rust 借用检查");
  });
});
