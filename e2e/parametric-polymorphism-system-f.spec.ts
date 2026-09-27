import { expect, test } from "@playwright/test";

test.describe("参数多态与 System F 文章与 SystemFPolymorphismDiagram E2E 测试", () => {
  test("1. 页面基础加载、Title、KaTeX 公式与 SystemFPolymorphismDiagram 挂载断言", async ({
    page,
  }) => {
    await page.goto("/posts/type-systems/parametric-polymorphism-system-f");
    await page.waitForLoadState("domcontentloaded");

    // 验证网页 Title 与大标题
    await expect(page).toHaveTitle(/参数多态与 System F/);
    const heading = page
      .locator(
        "h1:has-text('参数多态与 System F（二阶 λ 演算）：从全称量化到免费定理')",
      )
      .first();
    await expect(heading).toBeVisible();

    // 验证 KaTeX 数学公式渲染
    const katexEl = page.locator(".katex").first();
    await expect(katexEl).toBeVisible();

    // 验证 SystemFPolymorphismDiagram 交互探针挂载
    const diagramTitle = page
      .locator("text=System F 参数多态与二阶两阶段求值探针")
      .first();
    await diagramTitle.scrollIntoViewIfNeeded();
    await expect(diagramTitle).toBeVisible();
  });

  test("2. 探针初始状态与多态签名卡片断言", async ({ page }) => {
    await page.goto("/posts/type-systems/parametric-polymorphism-system-f");
    await page.waitForLoadState("domcontentloaded");

    const diagram = page
      .locator("text=System F 参数多态与二阶两阶段求值探针")
      .first();
    await diagram.scrollIntoViewIfNeeded();
    await expect(diagram).toBeVisible();

    // 默认展示预设 1：多态恒等子
    await expect(
      page.locator("text=1. 多态恒等子 (Polymorphic Identity)").first(),
    ).toBeVisible();

    // 验证类型签名与源码卡片挂载
    await expect(
      page.locator("text=多态项全称类型签名 (Universal Type)").first(),
    ).toBeVisible();
    await expect(
      page.locator("text=System F 源码实现 (Term)").first(),
    ).toBeVisible();

    // 验证初始步数指示器与未归约初态徽章
    await expect(page.locator("text=未归约初态").first()).toBeVisible();
    await expect(page.locator("text=步数：1 / 3").first()).toBeVisible();
  });

  test("3. 两阶段二阶归约步进流程验证（类型代换 -> 值代换 -> 正规型）", async ({
    page,
  }) => {
    await page.goto("/posts/type-systems/parametric-polymorphism-system-f");
    await page.waitForLoadState("domcontentloaded");

    const diagram = page
      .locator("text=System F 参数多态与二阶两阶段求值探针")
      .first();
    await diagram.scrollIntoViewIfNeeded();

    // 点击“二阶归约步进 ▶”推进至阶段一：类型代换
    const stepBtn = page.locator("button:has-text('二阶归约步进 ▶')").first();
    await stepBtn.click();
    await expect(page.locator("text=类型代换完成").first()).toBeVisible();
    await expect(
      page.locator("text=阶段一：二阶类型 β-归约 (Type Substitution)").first(),
    ).toBeVisible();
    await expect(page.locator("text=步数：2 / 3").first()).toBeVisible();

    // 再次点击步进至阶段二：值代换与达成正规型
    await stepBtn.click();
    await expect(
      page.locator("text=达成正规型 (Normal Form)").first(),
    ).toBeVisible();
    await expect(
      page.locator("text=阶段二：一阶值 β-归约 (Value Substitution)").first(),
    ).toBeVisible();
    await expect(page.locator("text=步数：3 / 3").first()).toBeVisible();

    // 点击“◀ 单步回退”
    const prevBtn = page.locator("button:has-text('◀ 单步回退')").first();
    await prevBtn.click();
    await expect(page.locator("text=类型代换完成").first()).toBeVisible();

    // 点击“⏮ 初始”回到第一步
    const initialBtn = page.locator("button:has-text('⏮ 初始')").first();
    await initialBtn.click();
    await expect(page.locator("text=未归约初态").first()).toBeVisible();
  });

  test("4. 动态具象化类型实参注入切换（Bool / Nat / 自实例化）", async ({
    page,
  }) => {
    await page.goto("/posts/type-systems/parametric-polymorphism-system-f");
    await page.waitForLoadState("domcontentloaded");

    const diagram = page
      .locator("text=System F 参数多态与二阶两阶段求值探针")
      .first();
    await diagram.scrollIntoViewIfNeeded();

    // 切换至 Nat 类型实参
    const natBtn = page.locator("button:has-text('Nat (自然数类型)')").first();
    await natBtn.click();
    await expect(
      page.locator("text=当前实参: [X ↦ Nat]").first(),
    ).toBeVisible();

    // 推进一步，验证类型代换表达式包含 Nat
    const stepBtn = page.locator("button:has-text('二阶归约步进 ▶')").first();
    await stepBtn.click();
    await expect(page.locator("text=类型代换完成").first()).toBeVisible();

    // 切换至自实例化多态类型实参
    const polyIdBtn = page
      .locator("button:has-text('∀Y. Y → Y (自实例化非直谓类型)')")
      .first();
    await polyIdBtn.click();
    await expect(
      page.locator("text=当前实参: [X ↦ ∀Y. Y → Y]").first(),
    ).toBeVisible();
  });

  test("5. 预设定理切换联动与免费定理交换图视图断言", async ({ page }) => {
    await page.goto("/posts/type-systems/parametric-polymorphism-system-f");
    await page.waitForLoadState("domcontentloaded");

    const diagram = page
      .locator("text=System F 参数多态与二阶两阶段求值探针")
      .first();
    await diagram.scrollIntoViewIfNeeded();

    // 切换至预设 2：自应用与非直谓性
    const impredPreset = page
      .locator("button:has-text('2. 自应用与非直谓性')")
      .first();
    await impredPreset.click();
    await expect(page.locator("text=高阶非直谓注入").first()).toBeVisible();

    // 切换至预设 6：免费定理与参数化
    const freePreset = page
      .locator("button:has-text('6. 免费定理与参数化')")
      .first();
    await freePreset.click();
    await expect(page.locator("text=免费定理推导").first()).toBeVisible();

    // 切换视图为“免费定理交换图 (Free Theorems)”
    const freeTab = page.locator("button:has-text('免费定理交换图')").first();
    await freeTab.click();
    await expect(
      page.locator("text=Reynolds 关系参数化定理与自然性交换图").first(),
    ).toBeVisible();
  });

  test("6. CanvasToolbar S/M/L 视口高度切换与复位按钮断言", async ({
    page,
  }) => {
    await page.goto("/posts/type-systems/parametric-polymorphism-system-f");
    await page.waitForLoadState("domcontentloaded");

    const diagram = page
      .locator("text=System F 参数多态与二阶两阶段求值探针")
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

    // 推进一步后通过 Toolbar 上的复位按钮复位
    const stepBtn = page.locator("button:has-text('二阶归约步进 ▶')").first();
    await stepBtn.click();
    await expect(page.locator("text=类型代换完成").first()).toBeVisible();

    const resetToolbarBtn = page
      .locator("button[aria-label='复位视野']")
      .first();
    await expect(resetToolbarBtn).toBeVisible();
    await resetToolbarBtn.click();
    await expect(page.locator("text=未归约初态").first()).toBeVisible();
  });

  test("7. 文章交叉超链接有效性与导航测试", async ({ page }) => {
    await page.goto("/posts/type-systems/parametric-polymorphism-system-f");
    await page.waitForLoadState("domcontentloaded");

    // 验证核心章节二级标题可达
    const h2Section = page
      .locator("h2:has-text('八、Reynolds 关系参数化与“免费定理”')")
      .first();
    await expect(h2Section).toBeVisible();
    await h2Section.scrollIntoViewIfNeeded();

    // 验证相关标签跳转链接
    const tagLink = page.locator("a[href='/tags/type-systems']").first();
    await expect(tagLink).toBeVisible();
  });
});
