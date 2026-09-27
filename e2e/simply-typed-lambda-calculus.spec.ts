import { expect, test } from "@playwright/test";

test.describe("简单类型 λ 演算（STLC）文章与 CurryHowardDiagram E2E 测试", () => {
  test("1. 页面基础加载、Title、KaTeX 公式与 CurryHowardDiagram 挂载断言", async ({
    page,
  }) => {
    await page.goto("/posts/type-systems/simply-typed-lambda-calculus");
    await page.waitForLoadState("domcontentloaded");

    // 验证网页 Title 与大标题
    await expect(page).toHaveTitle(/简单类型 λ 演算/);
    const heading = page
      .locator(
        "h1:has-text('简单类型 λ 演算（STLC）与 Curry–Howard 同构：从类型安全到命题即类型')",
      )
      .first();
    await expect(heading).toBeVisible();

    // 验证 KaTeX 数学公式渲染
    const katexEl = page.locator(".katex").first();
    await expect(katexEl).toBeVisible();

    // 验证 CurryHowardDiagram 交互探针挂载
    const diagramTitle = page
      .locator("text=Curry–Howard 逻辑与计算对偶镜像探针")
      .first();
    await diagramTitle.scrollIntoViewIfNeeded();
    await expect(diagramTitle).toBeVisible();
  });

  test("2. 探针初始状态与定理信息卡片断言", async ({ page }) => {
    await page.goto("/posts/type-systems/simply-typed-lambda-calculus");
    await page.waitForLoadState("domcontentloaded");

    const diagram = page
      .locator("text=Curry–Howard 逻辑与计算对偶镜像探针")
      .first();
    await diagram.scrollIntoViewIfNeeded();
    await expect(diagram).toBeVisible();

    // 默认展示预设 1：恒等律
    await expect(
      page.locator("text=1. 恒等律 (Identity / I 组合子)").first(),
    ).toBeVisible();
    await expect(page.locator("text=✅ 构造性定理").first()).toBeVisible();

    // 验证三大对偶信息卡片挂载
    await expect(
      page.locator("text=逻辑学命题 (Proposition)").first(),
    ).toBeVisible();
    await expect(
      page.locator("text=STLC 类型签名 (Type)").first(),
    ).toBeVisible();
    await expect(
      page.locator("text=证明证据 / λ 项 (Term / Proof)").first(),
    ).toBeVisible();

    // 验证初始推导进度为 1 / 3
    await expect(page.locator("text=1 / 3").first()).toBeVisible();
  });

  test("3. 单步推导、回退与割消除 (Cut Elimination) 流程验证", async ({
    page,
  }) => {
    await page.goto("/posts/type-systems/simply-typed-lambda-calculus");
    await page.waitForLoadState("domcontentloaded");

    const diagram = page
      .locator("text=Curry–Howard 逻辑与计算对偶镜像探针")
      .first();
    await diagram.scrollIntoViewIfNeeded();

    // 确认初始步骤
    await expect(
      page.locator("text=步骤 1：假说引入 / 形参绑定").first(),
    ).toBeVisible();

    // 点击“推导下一步 ▶”
    const nextBtn = page.locator("button:has-text('推导下一步 ▶')").first();
    await nextBtn.click();
    await expect(
      page.locator("text=步骤 2：蕴涵引入 / 函数抽象").first(),
    ).toBeVisible();

    // 再次点击步进至割消除
    await nextBtn.click();
    await expect(
      page.locator("text=步骤 3：割消除 / β-归约化简").first(),
    ).toBeVisible();

    // 点击“◀ 单步回退”
    const prevBtn = page.locator("button:has-text('◀ 单步回退')").first();
    await prevBtn.click();
    await expect(
      page.locator("text=步骤 2：蕴涵引入 / 函数抽象").first(),
    ).toBeVisible();

    // 点击“⏮ 初始”回到第一步
    const resetStepBtn = page.locator("button:has-text('⏮ 初始')").first();
    await resetStepBtn.click();
    await expect(
      page.locator("text=步骤 1：假说引入 / 形参绑定").first(),
    ).toBeVisible();
  });

  test("4. 预设定理切换联动（合取交换律与排中律边界）", async ({ page }) => {
    await page.goto("/posts/type-systems/simply-typed-lambda-calculus");
    await page.waitForLoadState("domcontentloaded");

    const diagram = page
      .locator("text=Curry–Howard 逻辑与计算对偶镜像探针")
      .first();
    await diagram.scrollIntoViewIfNeeded();

    // 切换至预设 4：合取交换律
    const conjPreset = page.locator("button:has-text('4. 合取交换律')").first();
    await expect(conjPreset).toBeVisible();
    await conjPreset.click();

    await expect(
      page
        .locator("text=4. 合取交换律 (Conjunction Symmetry / 积类型)")
        .first(),
    ).toBeVisible();
    await expect(page.locator("text=✅ 构造性定理").first()).toBeVisible();

    // 切换至预设 8：直觉主义边界 (排中律 LEM)
    const lemPreset = page
      .locator("button:has-text('8. 直觉主义边界')")
      .first();
    await expect(lemPreset).toBeVisible();
    await lemPreset.click();

    await expect(page.locator("text=⚠️ 直觉主义边界").first()).toBeVisible();
    await expect(
      page.locator("text=无法在纯 STLC 中构造").first(),
    ).toBeVisible();
  });

  test("5. 视角模式（双重视角、纯逻辑视角、纯程序视角）切换断言", async ({
    page,
  }) => {
    await page.goto("/posts/type-systems/simply-typed-lambda-calculus");
    await page.waitForLoadState("domcontentloaded");

    const diagram = page
      .locator("text=Curry–Howard 逻辑与计算对偶镜像探针")
      .first();
    await diagram.scrollIntoViewIfNeeded();

    const logicBanner = page.locator("text=📜 逻辑世界：自然推导树").first();
    const stlcBanner = page
      .locator("text=💻 程序世界：STLC 类型派生树")
      .first();

    // 默认双重视角下两者均可见
    await expect(logicBanner).toBeVisible();
    await expect(stlcBanner).toBeVisible();

    // 切换至“仅逻辑视角”
    const logicTab = page.locator("button:has-text('仅逻辑视角')").first();
    await logicTab.click();
    await expect(logicBanner).toBeVisible();
    await expect(stlcBanner).toBeHidden();

    // 切换至“仅程序视角”
    const stlcTab = page.locator("button:has-text('仅程序视角')").first();
    await stlcTab.click();
    await expect(stlcBanner).toBeVisible();
    await expect(logicBanner).toBeHidden();

    // 切换回“双重视角联动镜像”
    const dualTab = page.locator("button:has-text('双重视角联动镜像')").first();
    await dualTab.click();
    await expect(logicBanner).toBeVisible();
    await expect(stlcBanner).toBeVisible();
  });

  test("6. CanvasToolbar 复位与底部 CanvasResizer 自适应/双击复位断言", async ({
    page,
  }) => {
    await page.goto("/posts/type-systems/simply-typed-lambda-calculus");
    await page.waitForLoadState("domcontentloaded");

    const diagram = page
      .locator("text=Curry–Howard 逻辑与计算对偶镜像探针")
      .first();
    await diagram.scrollIntoViewIfNeeded();

    // 检查底部 CanvasResizer 处于自适应状态
    const resizer = page.getByTestId("canvas-resizer").first();
    await expect(resizer).toBeVisible();
    await expect(resizer).toHaveAttribute("data-mode", "adaptive");

    // 双击底部横条恢复/保持自适应
    await resizer.dblclick();
    await expect(resizer).toHaveAttribute("data-mode", "adaptive");

    // 测试 Toolbar 复位按钮
    const nextBtn = page.locator("button:has-text('推导下一步 ▶')").first();
    await nextBtn.click();
    await expect(
      page.locator("text=步骤 2：蕴涵引入 / 函数抽象").first(),
    ).toBeVisible();

    const resetToolbarBtn = page
      .locator("button[aria-label='复位视野']")
      .first();
    await expect(resetToolbarBtn).toBeVisible();
    await resetToolbarBtn.click();
    await expect(
      page.locator("text=步骤 1：假说引入 / 形参绑定").first(),
    ).toBeVisible();
  });

  test("7. 文章交叉超链接有效性与导航测试", async ({ page }) => {
    await page.goto("/posts/type-systems/simply-typed-lambda-calculus");
    await page.waitForLoadState("domcontentloaded");

    // 验证侧边目录或正文导航存在且包含主要二级标题
    const h2Section = page
      .locator("h2:has-text('五、理论巅峰：Curry–Howard 同构')")
      .first();
    await expect(h2Section).toBeVisible();
    await h2Section.scrollIntoViewIfNeeded();

    // 验证文章底部的相关标签跳转链接
    const tagLink = page.locator("a[href='/tags/type-systems']").first();
    await expect(tagLink).toBeVisible();
  });
});
