import { expect, test } from "@playwright/test";

test.describe("存在类型文章与 ExistentialTypesDiagram E2E 测试", () => {
  test("1. 页面基础加载、Title、KaTeX 公式与 ExistentialTypesDiagram 挂载断言", async ({
    page,
  }) => {
    await page.goto("/posts/type-systems/existential-types");
    await page.waitForLoadState("domcontentloaded");

    // 验证网页 Title 与大标题
    await expect(page).toHaveTitle(/存在类型/);
    const heading = page
      .locator("h1:has-text('存在类型：从信息隐藏到 Trait 对象与类型擦除')")
      .first();
    await expect(heading).toBeVisible();

    // 验证 KaTeX 数学公式渲染
    const katexEl = page.locator(".katex").first();
    await expect(katexEl).toBeVisible();

    // 验证 ExistentialTypesDiagram 交互探针挂载
    const diagramTitle = page
      .locator("text=存在类型（Existential Types）交互探针")
      .first();
    await expect(diagramTitle).toBeAttached();
    await diagramTitle.scrollIntoViewIfNeeded();
    await expect(diagramTitle).toBeVisible();
  });

  test("2. 探针初始状态与包含形式化声明/见证卡片断言", async ({ page }) => {
    await page.goto("/posts/type-systems/existential-types");
    await page.waitForLoadState("domcontentloaded");

    // 等待 React Island 水合挂载完成
    const defaultBtn = page
      .locator("button:has-text('1. 经典计数器 ADT')")
      .first();
    await expect(defaultBtn).toBeVisible();

    const diagram = page
      .locator("h3:has-text('存在类型（Existential Types）交互探针')")
      .first();
    await expect(diagram).toBeVisible();

    // 验证见证类型与安全状态挂载
    await expect(
      page.locator("text=形式化抽象存在类型声明").first(),
    ).toBeVisible();
    await expect(page.locator("text=通过类型检查").first()).toBeVisible();
  });

  test("3. 安全开箱与非法逃逸切换及拦截断言", async ({ page }) => {
    await page.goto("/posts/type-systems/existential-types");
    await page.waitForLoadState("domcontentloaded");

    const defaultBtn = page
      .locator("button:has-text('1. 经典计数器 ADT')")
      .first();
    await expect(defaultBtn).toBeVisible();

    // 点击“尝试非法逃逸 X”
    const escapeBtn = page
      .locator("button:has-text('尝试非法逃逸 X (Type Escape)')")
      .first();
    await escapeBtn.click();

    // 验证非法逃逸报警状态与拦截解释
    await expect(page.locator("text=拦截类型变量逃逸").first()).toBeVisible();
    await expect(page.locator("text=ESCAPE TRAPPED").first()).toBeVisible();
    await expect(page.locator("text=类型安全防线拦截").first()).toBeVisible();

    // 再次点击“合法安全开箱”切回安全状态
    const safeBtn = page
      .locator("button:has-text('合法安全开箱 (X 未逃逸)')")
      .first();
    await safeBtn.click();
    await expect(page.locator("text=通过类型检查").first()).toBeVisible();
  });

  test("4. 预设切换联动（Rust dyn Trait、impl Trait 与 C++ std::function）", async ({
    page,
  }) => {
    await page.goto("/posts/type-systems/existential-types");
    await page.waitForLoadState("domcontentloaded");

    const defaultBtn = page
      .locator("button:has-text('1. 经典计数器 ADT')")
      .first();
    await expect(defaultBtn).toBeVisible();

    // 切换到预设 2：Rust dyn Trait
    const preset2Btn = page
      .locator("button:has-text('2. Rust dyn Trait 动态存在类型')")
      .first();
    await preset2Btn.click();
    await expect(page.locator("text=对象安全").first()).toBeVisible();

    // 切换到预设 3：Rust impl Trait
    const preset3Btn = page
      .locator("button:has-text('3. Rust impl Trait 静态存在类型')")
      .first();
    await preset3Btn.click();
    await expect(page.locator("text=单态化").first()).toBeVisible();

    // 切换到预设 4：C++ std::function
    const preset4Btn = page
      .locator("button:has-text('4. C++ std::function 类型擦除与小对象优化')")
      .first();
    await preset4Btn.click();
    await expect(page.locator("text=小对象优化").first()).toBeVisible();
  });

  test("5. 三大视图模式切换（开箱逃逸 / 物理内存 / 权力天平）断言", async ({
    page,
  }) => {
    await page.goto("/posts/type-systems/existential-types");
    await page.waitForLoadState("domcontentloaded");

    const defaultBtn = page
      .locator("button:has-text('1. 经典计数器 ADT')")
      .first();
    await expect(defaultBtn).toBeVisible();

    // 切换至“物理内存与分发视图”
    const memoryTab = page
      .locator("button:has-text('物理内存与分发视图')")
      .first();
    await memoryTab.click();

    // 验证物理内存空间划分挂载
    await expect(
      page.locator("text=物理内存空间划分与指针拓扑").first(),
    ).toBeVisible();
    await expect(
      page.locator("text=编译器汇编 / 分发微架构剖析").first(),
    ).toBeVisible();

    // 切换至“∀ 与 ∃ 权力天平对比”视图
    const balanceTab = page
      .locator("button:has-text('∀ 与 ∃ 权力天平对比')")
      .first();
    await balanceTab.click();

    // 验证天平两侧对比挂载
    await expect(
      page.locator("text=全称量词 ∀X (Universal Types)").first(),
    ).toBeVisible();
    await expect(
      page.locator("text=存在量词 ∃X (Existential Types)").first(),
    ).toBeVisible();
  });

  test("6. CanvasToolbar 复位与底部 CanvasResizer 自适应/双击复位断言", async ({
    page,
  }) => {
    await page.goto("/posts/type-systems/existential-types");
    await page.waitForLoadState("domcontentloaded");

    const defaultBtn = page
      .locator("button:has-text('1. 经典计数器 ADT')")
      .first();
    await expect(defaultBtn).toBeVisible();

    // 检查底部 CanvasResizer 处于自适应状态
    const resizer = page.getByTestId("canvas-resizer").first();
    await expect(resizer).toBeVisible();
    await expect(resizer).toHaveAttribute("data-mode", "adaptive");

    // 双击底部横条恢复/保持自适应
    await resizer.dblclick();
    await expect(resizer).toHaveAttribute("data-mode", "adaptive");

    // 切换至非法逃逸
    const escapeBtn = page
      .locator("button:has-text('尝试非法逃逸 X (Type Escape)')")
      .first();
    await escapeBtn.click();
    await expect(page.locator("text=拦截类型变量逃逸").first()).toBeVisible();

    // 点击复位视野按钮
    const resetToolbarBtn = page
      .locator("button[aria-label='复位视野']")
      .first();
    await expect(resetToolbarBtn).toBeVisible();
    await resetToolbarBtn.click();

    // 验证切回默认的合法状态与预设 1
    await expect(page.locator("text=通过类型检查").first()).toBeVisible();
    await expect(
      page.locator("button:has-text('1. 经典计数器 ADT')").first(),
    ).toBeVisible();
  });

  test("7. 文章交叉超链接有效性与导航测试", async ({ page }) => {
    await page.goto("/posts/type-systems/existential-types");
    await page.waitForLoadState("domcontentloaded");

    // 验证核心章节二级标题可达
    const h2Section = page
      .locator(
        "h2:has-text('四、Rust 的系统级落地：impl Trait 与 dyn Trait 的终极对决')",
      )
      .first();
    await expect(h2Section).toBeVisible();
    await h2Section.scrollIntoViewIfNeeded();

    // 验证相关标签跳转链接
    const tagLink = page.locator("a[href='/tags/type-systems']").first();
    await expect(tagLink).toBeVisible();
  });
});
