import { expect, test } from "@playwright/test";

test.describe("子类型与型变文章与 SubtypingVarianceDiagram E2E 测试", () => {
  test("1. 页面基础加载、Title、KaTeX 公式与 SubtypingVarianceDiagram 挂载断言", async ({
    page,
  }) => {
    await page.goto("/posts/type-systems/subtyping-and-variance");
    await page.waitForLoadState("domcontentloaded");

    // 验证网页 Title 与大标题
    await expect(page).toHaveTitle(/子类型与型变/);
    const heading = page
      .locator("h1:has-text('子类型与型变：从包含规则到生命周期协变')")
      .first();
    await expect(heading).toBeVisible();

    // 验证 KaTeX 数学公式渲染
    const katexEl = page.locator(".katex").first();
    await expect(katexEl).toBeVisible();

    // 验证 SubtypingVarianceDiagram 交互探针挂载
    const diagramTitle = page
      .locator("text=子类型与型变（Subtyping & Variance）交互探针")
      .first();
    await diagramTitle.scrollIntoViewIfNeeded();
    await expect(diagramTitle).toBeVisible();
  });

  test("2. 探针初始状态与包含公理/代码卡片断言", async ({ page }) => {
    await page.goto("/posts/type-systems/subtyping-and-variance");
    await page.waitForLoadState("domcontentloaded");

    const diagram = page
      .locator("text=子类型与型变（Subtyping & Variance）交互探针")
      .first();
    await diagram.scrollIntoViewIfNeeded();
    await expect(diagram).toBeVisible();

    // 默认展示预设 1：函数子类型公理
    await expect(
      page.locator("button:has-text('1. 函数子类型公理')").first(),
    ).toBeVisible();

    // 验证公理与判定卡片挂载
    await expect(page.locator("text=形式化公理规则").first()).toBeVisible();
    await expect(page.locator("text=通过类型检查").first()).toBeVisible();
  });

  test("3. LSP 代换合法与非法切换及判定断言", async ({ page }) => {
    await page.goto("/posts/type-systems/subtyping-and-variance");
    await page.waitForLoadState("domcontentloaded");

    const diagram = page
      .locator("text=子类型与型变（Subtyping & Variance）交互探针")
      .first();
    await diagram.scrollIntoViewIfNeeded();

    // 点击“非法替换”
    const invalidBtn = page.locator("button:has-text('非法替换')").first();
    await invalidBtn.click();

    // 验证非法代换报警状态与原因
    await expect(page.locator("text=拦截类型错误").first()).toBeVisible();
    await expect(page.locator("text=调用方可能传入 Cat").first()).toBeVisible();

    // 再次点击“合法替换”切回安全状态
    const validBtn = page.locator("button:has-text('合法替换')").first();
    await validBtn.click();
    await expect(page.locator("text=通过类型检查").first()).toBeVisible();
  });

  test("4. 预设切换联动（Java 数组灾难与 Rust 生命周期）", async ({ page }) => {
    await page.goto("/posts/type-systems/subtyping-and-variance");
    await page.waitForLoadState("domcontentloaded");

    const diagram = page
      .locator("text=子类型与型变（Subtyping & Variance）交互探针")
      .first();
    await diagram.scrollIntoViewIfNeeded();

    // 切换到预设 6：Java 数组协变灾难
    const preset6Btn = page
      .locator("button:has-text('6. Java 数组协变灾难')")
      .first();
    await preset6Btn.click();

    // 验证预设标题与洞见说明
    await expect(
      page.locator("text=ArrayStoreException").first(),
    ).toBeVisible();

    // 切换到预设 7：Rust 可变引用不变性
    const preset7Btn = page
      .locator("button:has-text('7. Rust 可变引用不变性')")
      .first();
    await preset7Btn.click();

    await expect(
      page.locator("text=彻底消除了悬垂引用（Use-After-Free）").first(),
    ).toBeVisible();
  });

  test("5. 视图切换（极性代数符号计算与内存安全沙盒）断言", async ({
    page,
  }) => {
    await page.goto("/posts/type-systems/subtyping-and-variance");
    await page.waitForLoadState("domcontentloaded");

    const diagram = page
      .locator("text=子类型与型变（Subtyping & Variance）交互探针")
      .first();
    await diagram.scrollIntoViewIfNeeded();

    // 切换至“极性符号代数推导”视图
    const polarityTab = page
      .locator("button:has-text('极性符号代数推导')")
      .first();
    await polarityTab.click();

    // 验证极性分析模块挂载
    await expect(page.locator("text=极性符号运算法则").first()).toBeVisible();
    await expect(page.locator("text=符号相乘推演").first()).toBeVisible();

    // 切换至“内存安全与破坏沙盒”视图
    const safetyTab = page
      .locator("button:has-text('内存安全与破坏沙盒')")
      .first();
    await safetyTab.click();

    // 验证沙盒运行状态与影响分析
    await expect(
      page.locator("text=物理内存安全沙盒与运行时行为").first(),
    ).toBeVisible();
    await expect(page.locator("text=真实影响分析").first()).toBeVisible();
  });

  test("6. CanvasToolbar S/M/L 视口高度切换与复位按钮断言", async ({
    page,
  }) => {
    await page.goto("/posts/type-systems/subtyping-and-variance");
    await page.waitForLoadState("domcontentloaded");

    const diagram = page
      .locator("text=子类型与型变（Subtyping & Variance）交互探针")
      .first();
    await diagram.scrollIntoViewIfNeeded();

    // 测试 S/M/L 按钮
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

    // 先点击非法替换按钮
    const invalidBtn = page.locator("button:has-text('非法替换')").first();
    await invalidBtn.click();
    await expect(page.locator("text=拦截类型错误").first()).toBeVisible();

    // 点击复位视野按钮
    const resetToolbarBtn = page
      .locator("button[aria-label='复位视野']")
      .first();
    await expect(resetToolbarBtn).toBeVisible();
    await resetToolbarBtn.click();

    // 验证切回默认的合法状态
    await expect(page.locator("text=通过类型检查").first()).toBeVisible();
  });

  test("7. 文章交叉超链接有效性与导航测试", async ({ page }) => {
    await page.goto("/posts/type-systems/subtyping-and-variance");
    await page.waitForLoadState("domcontentloaded");

    // 验证核心章节二级标题可达
    const h2Section = page
      .locator("h2:has-text('九、系统级巅峰：Rust 生命周期子类型化与引用安全')")
      .first();
    await expect(h2Section).toBeVisible();
    await h2Section.scrollIntoViewIfNeeded();

    // 验证相关标签跳转链接
    const tagLink = page.locator("a[href='/tags/type-systems']").first();
    await expect(tagLink).toBeVisible();
  });
});
