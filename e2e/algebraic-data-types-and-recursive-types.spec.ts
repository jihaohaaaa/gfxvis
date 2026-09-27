import { expect, test } from "@playwright/test";

test.describe("代数数据类型（ADT）与递归类型文章与 AdtRecursiveTypesDiagram E2E 测试", () => {
  test("1. 页面基础加载、Title、KaTeX 公式与 AdtRecursiveTypesDiagram 挂载断言", async ({
    page,
  }) => {
    await page.goto(
      "/posts/type-systems/algebraic-data-types-and-recursive-types",
    );
    await page.waitForLoadState("domcontentloaded");

    // 验证网页 Title 与大标题
    await expect(page).toHaveTitle(/代数数据类型/);
    const heading = page
      .locator(
        "h1:has-text('代数数据类型（ADT）与递归类型：从类型半环到多项式不动点')",
      )
      .first();
    await expect(heading).toBeVisible();

    // 验证 KaTeX 数学公式渲染
    const katexEl = page.locator(".katex").first();
    await expect(katexEl).toBeVisible();

    // 验证 AdtRecursiveTypesDiagram 交互探针挂载
    const diagramTitle = page
      .locator("text=代数数据类型（ADT）与递归类型交互探针")
      .first();
    await diagramTitle.scrollIntoViewIfNeeded();
    await expect(diagramTitle).toBeVisible();
  });

  test("2. 探针初始状态与多项式方程卡片断言", async ({ page }) => {
    await page.goto(
      "/posts/type-systems/algebraic-data-types-and-recursive-types",
    );
    await page.waitForLoadState("domcontentloaded");

    const diagram = page
      .locator("text=代数数据类型（ADT）与递归类型交互探针")
      .first();
    await diagram.scrollIntoViewIfNeeded();
    await expect(diagram).toBeVisible();

    // 默认展示预设 1：皮亚诺自然数
    await expect(
      page.locator("text=1. 皮亚诺自然数 (Peano Nat)").first(),
    ).toBeVisible();

    // 验证方程与 μ-Type 卡片挂载
    await expect(
      page.locator("text=代数多项式同构方程 (Polynomial Equation)").first(),
    ).toBeVisible();
    await expect(
      page.locator("text=类型级不动点形式化 (μ-Type)").first(),
    ).toBeVisible();

    // 验证初始状态徽章与深度指示器
    await expect(
      page.locator("text=Folded (折叠抽象类型)").first(),
    ).toBeVisible();
    await expect(page.locator("text=深度：0 / 3").first()).toBeVisible();
  });

  test("3. Iso-recursive 展开 (unfold) 与折叠 (fold) 单步操作流程验证", async ({
    page,
  }) => {
    await page.goto(
      "/posts/type-systems/algebraic-data-types-and-recursive-types",
    );
    await page.waitForLoadState("domcontentloaded");

    const diagram = page
      .locator("text=代数数据类型（ADT）与递归类型交互探针")
      .first();
    await diagram.scrollIntoViewIfNeeded();

    // 点击“unfold 单步展开 ▶”
    const unfoldBtn = page
      .locator("button:has-text('unfold 单步展开 ▶')")
      .first();
    await unfoldBtn.click();
    await expect(
      page.locator("text=Unfolded Level 1 (首次解构)").first(),
    ).toBeVisible();
    await expect(page.locator("text=深度：1 / 3").first()).toBeVisible();

    // 再次点击展开至第二层
    await unfoldBtn.click();
    await expect(
      page.locator("text=Unfolded Level 2 (深入解构)").first(),
    ).toBeVisible();
    await expect(page.locator("text=深度：2 / 3").first()).toBeVisible();

    // 点击“fold 折叠包装 ◀”回退一层
    const foldBtn = page.locator("button:has-text('fold 折叠包装 ◀')").first();
    await foldBtn.click();
    await expect(
      page.locator("text=Unfolded Level 1 (首次解构)").first(),
    ).toBeVisible();
    await expect(page.locator("text=深度：1 / 3").first()).toBeVisible();

    // 点击“⏮ 初始 (Folded)”回到初态
    const initialBtn = page
      .locator("button:has-text('⏮ 初始 (Folded)')")
      .first();
    await initialBtn.click();
    await expect(
      page.locator("text=Folded (折叠抽象类型)").first(),
    ).toBeVisible();
    await expect(page.locator("text=深度：0 / 3").first()).toBeVisible();
  });

  test("4. 预设切换联动（递归链表、Y 组合子与二叉树）", async ({ page }) => {
    await page.goto(
      "/posts/type-systems/algebraic-data-types-and-recursive-types",
    );
    await page.waitForLoadState("domcontentloaded");

    const diagram = page
      .locator("text=代数数据类型（ADT）与递归类型交互探针")
      .first();
    await diagram.scrollIntoViewIfNeeded();

    // 切换至预设 2：递归链表
    const listPreset = page
      .locator("button:has-text('2. 递归链表 (Linked List)')")
      .first();
    await listPreset.click();
    await expect(page.locator("text=Folded (抽象列表)").first()).toBeVisible();

    // 切换至预设 4：Y 组合子重现
    const yPreset = page.locator("button:has-text('4. Y 组合子重现')").first();
    await yPreset.click();
    await expect(
      page.locator("text=Folded Parameter (自解构形参)").first(),
    ).toBeVisible();

    // 展开一层验证自应用打字成功
    const unfoldBtn = page
      .locator("button:has-text('unfold 单步展开 ▶')")
      .first();
    await unfoldBtn.click();
    await expect(
      page.locator("text=Unfolded Operator (成功解出函数体)").first(),
    ).toBeVisible();
  });

  test("5. 三大视图模式切换（Iso-recursive / Zipper / Memory）断言", async ({
    page,
  }) => {
    await page.goto(
      "/posts/type-systems/algebraic-data-types-and-recursive-types",
    );
    await page.waitForLoadState("domcontentloaded");

    const diagram = page
      .locator("text=代数数据类型（ADT）与递归类型交互探针")
      .first();
    await diagram.scrollIntoViewIfNeeded();

    // 切换至“类型微积分与 Zipper”视图
    const zipperTab = page
      .locator("button:has-text('类型微积分与 Zipper')")
      .first();
    await zipperTab.click();
    await expect(
      page.locator("text=Huet Zipper 形式导数与光标上下文").first(),
    ).toBeVisible();

    // 切换至“内存布局与 Box 收敛”视图
    const memoryTab = page
      .locator("button:has-text('内存布局与 Box 收敛')")
      .first();
    await memoryTab.click();
    await expect(
      page.locator("text=物理内存连续内联 vs 指针间接层").first(),
    ).toBeVisible();
    await expect(
      page.locator("text=直接连续内联布局 (Direct Inlining)").first(),
    ).toBeVisible();

    // 切回“Iso-recursive 折叠与展开”视图
    const stepperTab = page
      .locator("button:has-text('Iso-recursive 折叠与展开')")
      .first();
    await stepperTab.click();
    await expect(
      page.locator("button:has-text('unfold 单步展开 ▶')").first(),
    ).toBeVisible();
  });

  test("6. CanvasToolbar 复位与底部 CanvasResizer 自适应/双击复位断言", async ({
    page,
  }) => {
    await page.goto(
      "/posts/type-systems/algebraic-data-types-and-recursive-types",
    );
    await page.waitForLoadState("domcontentloaded");

    const diagram = page
      .locator("text=代数数据类型（ADT）与递归类型交互探针")
      .first();
    await diagram.scrollIntoViewIfNeeded();

    // 检查底部 CanvasResizer 处于自适应状态
    const resizer = page.getByTestId("canvas-resizer").first();
    await expect(resizer).toBeVisible();
    await expect(resizer).toHaveAttribute("data-mode", "adaptive");

    // 双击底部横条恢复/保持自适应
    await resizer.dblclick();
    await expect(resizer).toHaveAttribute("data-mode", "adaptive");

    // 展开一步后点击复位视野按钮
    const unfoldBtn = page
      .locator("button:has-text('unfold 单步展开 ▶')")
      .first();
    await unfoldBtn.click();
    await expect(
      page.locator("text=Unfolded Level 1 (首次解构)").first(),
    ).toBeVisible();

    const resetToolbarBtn = page
      .locator("button[aria-label='复位视野']")
      .first();
    await expect(resetToolbarBtn).toBeVisible();
    await resetToolbarBtn.click();
    await expect(
      page.locator("text=Folded (折叠抽象类型)").first(),
    ).toBeVisible();
  });

  test("7. 文章交叉超链接有效性与导航测试", async ({ page }) => {
    await page.goto(
      "/posts/type-systems/algebraic-data-types-and-recursive-types",
    );
    await page.waitForLoadState("domcontentloaded");

    // 验证核心章节二级标题可达
    const h2Section = page
      .locator("h2:has-text('五、图灵完备的回归：为 Y 组合子赋予类型')")
      .first();
    await expect(h2Section).toBeVisible();
    await h2Section.scrollIntoViewIfNeeded();

    // 验证相关标签跳转链接
    const tagLink = page.locator("a[href='/tags/type-systems']").first();
    await expect(tagLink).toBeVisible();
  });
});
