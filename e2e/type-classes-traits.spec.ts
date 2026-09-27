import { expect, test } from "@playwright/test";

test.describe("类型类与特质文章与 TypeClassesTraitsDiagram E2E 测试", () => {
  test("1. 页面基础加载、Title、KaTeX 公式与 TypeClassesTraitsDiagram 挂载断言", async ({
    page,
  }) => {
    await page.goto("/posts/type-systems/type-classes-traits");
    await page.waitForLoadState("domcontentloaded");

    // 验证网页 Title 与大标题
    await expect(page).toHaveTitle(/类型类与特质/);
    const heading = page
      .locator(
        "h1:has-text('类型类与特质：从字典传递到 Rust Trait 与 C++ Concepts')",
      )
      .first();
    await expect(heading).toBeVisible();

    // 验证 KaTeX 数学公式渲染
    const katexEl = page.locator(".katex").first();
    await expect(katexEl).toBeVisible();

    // 验证 TypeClassesTraitsDiagram 交互探针挂载
    const diagramTitle = page
      .locator("h3:has-text('类型类与特质（Type Classes & Traits）交互探针')")
      .first();
    await expect(diagramTitle).toBeVisible();
  });

  test("2. 探针初始状态与包含形式化声明/脱糖卡片断言", async ({ page }) => {
    await page.goto("/posts/type-systems/type-classes-traits");
    await page.waitForLoadState("domcontentloaded");

    // 等待 React Island 水合挂载完成
    const defaultBtn = page
      .locator("button:has-text('1. 经典 Haskell Eq/Show')")
      .first();
    await expect(defaultBtn).toBeVisible();

    const diagram = page
      .locator("h3:has-text('类型类与特质（Type Classes & Traits）交互探针')")
      .first();
    await expect(diagram).toBeVisible();

    // 验证形式化声明与脱糖卡片挂载
    await expect(page.locator("text=类型类形式化声明").first()).toBeVisible();
    await expect(
      page.locator("text=编译器注入字典后（脱糖底层机理）").first(),
    ).toBeVisible();
  });

  test("3. 孤儿规则沙盒切换与 E0117 错误拦截断言", async ({ page }) => {
    await page.goto("/posts/type-systems/type-classes-traits");
    await page.waitForLoadState("domcontentloaded");

    const defaultBtn = page
      .locator("button:has-text('1. 经典 Haskell Eq/Show')")
      .first();
    await expect(defaultBtn).toBeVisible();

    // 切换至“孤儿规则与一致性沙盒”视图
    const coherenceTab = page
      .locator("button:has-text('孤儿规则与一致性沙盒')")
      .first();
    await coherenceTab.click();

    // 点击“违反孤儿规则 (Trigger E0117)”
    const triggerBtn = page
      .locator("button:has-text('违反孤儿规则 (Trigger E0117)')")
      .first();
    await triggerBtn.click();

    // 验证 E0117 报错信息与一致性拦截
    await expect(
      page.locator("text=STATUS: ERROR[E0117]").first(),
    ).toBeVisible();
    await expect(
      page.locator("text=全局一致性（Coherence）被摧毁").first(),
    ).toBeVisible();

    // 再次点击“遵守孤儿规则 (Safe)”切回安全状态
    const safeBtn = page
      .locator("button:has-text('遵守孤儿规则 (Safe)')")
      .first();
    await safeBtn.click();
    await expect(page.locator("text=STATUS: PASSED").first()).toBeVisible();
  });

  test("4. 预设切换联动（Rust 孤儿规则、C++20 Concepts 与 C# 静态抽象）", async ({
    page,
  }) => {
    await page.goto("/posts/type-systems/type-classes-traits");
    await page.waitForLoadState("domcontentloaded");

    const defaultBtn = page
      .locator("button:has-text('1. 经典 Haskell Eq/Show')")
      .first();
    await expect(defaultBtn).toBeVisible();

    // 切换到预设 2：Rust 孤儿规则
    const preset2Btn = page
      .locator("button:has-text('2. Rust 孤儿规则')")
      .first();
    await preset2Btn.click();
    await expect(
      page.getByText("Display (标准库格式化 Trait)").first(),
    ).toBeVisible();

    // 切换到预设 3：C++20 Concepts
    const preset3Btn = page
      .locator("button:has-text('3. C++20 Concepts 概念约束')")
      .first();
    await preset3Btn.click();
    await expect(
      page.locator("text=std::equality_comparable").first(),
    ).toBeVisible();

    // 切换到预设 4：C# 11 静态抽象接口
    const preset4Btn = page
      .locator("button:has-text('4. C# 11 静态抽象接口')")
      .first();
    await preset4Btn.click();
    await expect(page.locator("text=INumber<T>").first()).toBeVisible();
  });

  test("5. 三大视图模式切换（脱糖流程 / 孤儿沙盒 / Rust vs C++）断言", async ({
    page,
  }) => {
    await page.goto("/posts/type-systems/type-classes-traits");
    await page.waitForLoadState("domcontentloaded");

    const defaultBtn = page
      .locator("button:has-text('1. 经典 Haskell Eq/Show')")
      .first();
    await expect(defaultBtn).toBeVisible();

    // 切换至“孤儿规则与一致性沙盒”视图
    const coherenceTab = page
      .locator("button:has-text('孤儿规则与一致性沙盒')")
      .first();
    await coherenceTab.click();
    await expect(
      page.locator("text=多模块生态孤儿规则推演沙盒").first(),
    ).toBeVisible();

    // 切换至“Rust 显式 impl vs C++ Concepts 隐式匹配”视图
    const vsTab = page
      .locator("button:has-text('Rust 显式 impl vs C++ Concepts 隐式匹配')")
      .first();
    await vsTab.click();

    // 验证对决两侧对比挂载
    await expect(
      page.locator("text=Rust: 显式名义实现 (impl Trait for T)").first(),
    ).toBeVisible();
    await expect(
      page.locator("text=C++20: 隐式结构匹配 (Concepts / Requires)").first(),
    ).toBeVisible();
  });

  test("6. CanvasToolbar 复位与底部 CanvasResizer 自适应/双击复位断言", async ({
    page,
  }) => {
    await page.goto("/posts/type-systems/type-classes-traits");
    await page.waitForLoadState("domcontentloaded");

    const defaultBtn = page
      .locator("button:has-text('1. 经典 Haskell Eq/Show')")
      .first();
    await expect(defaultBtn).toBeVisible();

    // 检查底部 CanvasResizer 处于自适应状态
    const resizer = page.getByTestId("canvas-resizer").first();
    await expect(resizer).toBeVisible();
    await expect(resizer).toHaveAttribute("data-mode", "adaptive");

    // 双击底部横条恢复/保持自适应
    await resizer.dblclick();
    await expect(resizer).toHaveAttribute("data-mode", "adaptive");

    // 点击复位视野按钮
    const resetToolbarBtn = page
      .locator("button[aria-label='复位视野']")
      .first();
    await expect(resetToolbarBtn).toBeVisible();
    await resetToolbarBtn.click();

    // 验证切回默认的预设 1 与脱糖视图
    await expect(
      page.locator("button:has-text('1. 经典 Haskell Eq/Show')").first(),
    ).toBeVisible();
    await expect(page.locator("text=类型类形式化声明").first()).toBeVisible();
  });

  test("7. 文章交叉超链接有效性与导航测试", async ({ page }) => {
    await page.goto("/posts/type-systems/type-classes-traits");
    await page.waitForLoadState("domcontentloaded");

    // 验证核心章节二级标题可达
    const h2Section = page
      .locator(
        "h2:has-text('四、系统级双雄的哲学分野：Rust Trait 对决 C++20 Concepts')",
      )
      .first();
    await expect(h2Section).toBeVisible();
    await h2Section.scrollIntoViewIfNeeded();

    // 验证相关标签跳转链接
    const tagLink = page.locator("a[href='/tags/type-systems']").first();
    await expect(tagLink).toBeVisible();
  });
});
