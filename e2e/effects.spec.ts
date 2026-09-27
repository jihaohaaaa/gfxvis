import { expect, test } from "@playwright/test";

test.describe("代数效应与效应系统文章与 EffectsDiagram E2E 测试", () => {
  test("1. 页面基础加载、Title、KaTeX 公式与 EffectsDiagram 挂载断言", async ({
    page,
  }) => {
    await page.goto("/posts/type-systems/effects");
    await page.waitForLoadState("domcontentloaded");

    // 验证网页 Title 与大标题
    await expect(page).toHaveTitle(/代数效应与效应系统/);
    const heading = page
      .locator(
        "h1:has-text('代数效应与效应系统：从 React Suspense 到 Rust 染色函数')",
      )
      .first();
    await expect(heading).toBeVisible();

    // 验证 KaTeX 数学公式渲染
    const katexEl = page.locator(".katex").first();
    await expect(katexEl).toBeVisible();

    // 验证 EffectsDiagram 交互探针挂载
    const diagramTitle = page
      .locator("h3:has-text('代数效应与效应系统（Algebraic Effects）交互探针')")
      .first();
    await expect(diagramTitle).toBeVisible();
  });

  test("2. 探针初始状态、形式化签名与首步执行流断言", async ({ page }) => {
    await page.goto("/posts/type-systems/effects");
    await page.waitForLoadState("domcontentloaded");

    // 等待 React Island 水合挂载完成
    const defaultBtn = page
      .locator("button:has-text('1. 经典代数效应')")
      .first();
    await expect(defaultBtn).toBeVisible();

    // 验证形式化签名与效应目标挂载
    await expect(
      page.locator("text=形式化效应签名 (Formal Effect Signature)").first(),
    ).toBeVisible();
    await expect(
      page.locator("text=State<S> & Log (状态与日志效应)").first(),
    ).toBeVisible();

    // 验证步骤 1 状态
    await expect(
      page.locator("text=步骤 1: 业务代码执行，触发 perform").first(),
    ).toBeVisible();
    await expect(
      page.locator("text=⏸️ 执行暂停 (Suspended)").first(),
    ).toBeVisible();
  });

  test("3. 执行流步进交互（下一步/上一步/直接跳步）与状态徽章更新断言", async ({
    page,
  }) => {
    await page.goto("/posts/type-systems/effects");
    await page.waitForLoadState("domcontentloaded");

    const defaultBtn = page
      .locator("button:has-text('1. 经典代数效应')")
      .first();
    await expect(defaultBtn).toBeVisible();

    // 点击“下一步 ▶”
    const nextBtn = page.locator("button:has-text('下一步 ▶')").first();
    await nextBtn.click();

    // 验证步骤 2 状态
    await expect(
      page.locator("text=步骤 2: 运行时沿动态调用栈寻找就近的 Handler").first(),
    ).toBeVisible();
    await expect(
      page.locator("text=🔍 向上分派 (Handler Dispatch)").first(),
    ).toBeVisible();

    // 直接点击步骤 4 按钮
    const step4Btn = page.locator("button[aria-label='执行步进 4']").first();
    await step4Btn.click();

    // 验证步骤 4 状态
    await expect(
      page.locator("text=步骤 4: 业务计算完成，返回最终结果").first(),
    ).toBeVisible();
    await expect(
      page.locator("text=✅ 计算完毕 (Completed)").first(),
    ).toBeVisible();

    // 点击“◀ 上一步”回退到步骤 3
    const prevBtn = page.locator("button:has-text('◀ 上一步')").first();
    await prevBtn.click();
    await expect(
      page.locator("text=步骤 3: 处理器介入并调用 resume 恢复执行").first(),
    ).toBeVisible();
    await expect(
      page.locator("text=▶️ 恢复执行 (Resumed)").first(),
    ).toBeVisible();
  });

  test("4. 预设场景切换联动（React Suspense、Rust 染色、C++20 协程）", async ({
    page,
  }) => {
    await page.goto("/posts/type-systems/effects");
    await page.waitForLoadState("domcontentloaded");

    const defaultBtn = page
      .locator("button:has-text('1. 经典代数效应')")
      .first();
    await expect(defaultBtn).toBeVisible();

    // 切换到预设 2：React Suspense
    const preset2Btn = page
      .locator("button:has-text('2. React Suspense 异步数据获取')")
      .first();
    await preset2Btn.click();
    await expect(
      page.locator("text=AsyncFetch (异步加载效应)").first(),
    ).toBeVisible();

    // 切换到预设 3：Rust 染色函数难题
    const preset3Btn = page
      .locator(
        "button:has-text('3. Rust 染色函数难题与 Keyword Generics 效应多态')",
      )
      .first();
    await preset3Btn.click();
    await expect(
      page.locator("text=Async & Try (Rust 硬编码双效应)").first(),
    ).toBeVisible();

    // 切换到预设 4：C++20 无栈协程
    const preset4Btn = page
      .locator("button:has-text('4. C++20 无栈协程与 promise_type')")
      .first();
    await preset4Btn.click();
    await expect(
      page.locator("text=CoroutinePromise (协程处理器效应)").first(),
    ).toBeVisible();
  });

  test("5. 三大视图模式切换（时序追踪 / React 对照 / 染色函数矩阵）断言", async ({
    page,
  }) => {
    await page.goto("/posts/type-systems/effects");
    await page.waitForLoadState("domcontentloaded");

    const defaultBtn = page
      .locator("button:has-text('1. 经典代数效应')")
      .first();
    await expect(defaultBtn).toBeVisible();

    // 切换至“React Suspense 效应对照”视图
    const suspenseTab = page
      .locator("button:has-text('React Suspense 效应对照')")
      .first();
    await suspenseTab.click();
    await expect(
      page.locator("text=纯粹代数效应 vs React Suspense 的工程世俗化").first(),
    ).toBeVisible();
    await expect(
      page.locator("text=真正的代数效应 (Koka / Eff)").first(),
    ).toBeVisible();
    await expect(
      page.locator("text=React Suspense 实用主义实现").first(),
    ).toBeVisible();

    // 切换至“染色函数与效应多态矩阵”视图
    const colorTab = page
      .locator("button:has-text('染色函数与效应多态矩阵')")
      .first();
    await colorTab.click();
    await expect(
      page
        .locator("text=染色函数难题（Function Color Problem）与效应多态")
        .first(),
    ).toBeVisible();
    await expect(
      page.locator("text=🔵 纯同步调用链 (Blue Stack)").first(),
    ).toBeVisible();
    await expect(
      page.locator("text=🔴 异步传染调用链 (Red Infection)").first(),
    ).toBeVisible();
  });

  test("6. CanvasToolbar 复位与底部 CanvasResizer 自适应/双击复位断言", async ({
    page,
  }) => {
    await page.goto("/posts/type-systems/effects");
    await page.waitForLoadState("domcontentloaded");

    const defaultBtn = page
      .locator("button:has-text('1. 经典代数效应')")
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

    // 验证切回默认的预设 1 与时序追踪视图
    await expect(
      page.locator("button:has-text('1. 经典代数效应')").first(),
    ).toBeVisible();
    await expect(
      page.locator("text=形式化效应签名 (Formal Effect Signature)").first(),
    ).toBeVisible();
  });

  test("7. 文章交叉超链接有效性与导航测试", async ({ page }) => {
    await page.goto("/posts/type-systems/effects");
    await page.waitForLoadState("domcontentloaded");

    // 验证核心章节二级标题可达
    const h2Section = page
      .locator(
        "h2:has-text('五、Rust 实践：染色函数困境与 Keyword Generics 效应多态计划')",
      )
      .first();
    await expect(h2Section).toBeVisible();
    await h2Section.scrollIntoViewIfNeeded();

    // 验证相关标签跳转链接
    const tagLink = page.locator("a[href='/tags/type-systems']").first();
    await expect(tagLink).toBeVisible();
  });
});
