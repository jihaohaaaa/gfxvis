import { expect, test } from "@playwright/test";

test.describe("依值类型论文章与 DependentTypeDiagram E2E 测试", () => {
  test("1. 页面基础加载、Title、KaTeX 公式与 DependentTypeDiagram 挂载断言", async ({
    page,
  }) => {
    await page.goto("/posts/type-systems/dependent-types");
    await page.waitForLoadState("domcontentloaded");

    // 验证网页 Title 与大标题
    await expect(page).toHaveTitle(/依值类型论/);
    const heading = page
      .locator(
        "h1:has-text('依值类型论：从编译期消灭越界到 Rust 与 C++ 常量泛型')",
      )
      .first();
    await expect(heading).toBeVisible();

    // 验证 KaTeX 数学公式渲染
    const katexEl = page.locator(".katex").first();
    await expect(katexEl).toBeVisible();

    // 验证 DependentTypeDiagram 交互探针挂载
    const diagramTitle = page
      .locator("h3:has-text('依值类型论（Dependent Type Theory）交互探针')")
      .first();
    await expect(diagramTitle).toBeVisible();
  });

  test("2. 探针初始状态、形式化签名与 Vect 初始推导断言", async ({ page }) => {
    await page.goto("/posts/type-systems/dependent-types");
    await page.waitForLoadState("domcontentloaded");

    // 等待 React Island 水合挂载完成
    const defaultBtn = page
      .locator("button:has-text('1. 长度索引向量')")
      .first();
    await expect(defaultBtn).toBeVisible();

    // 验证形式化签名与理论徽章
    await expect(
      page.locator("text=形式化签名 (Dependent Type Signature)").first(),
    ).toBeVisible();
    await expect(
      page.locator("text=Π 类型 (Dependent Product)").first(),
    ).toBeVisible();

    // 验证初始状态：append 返回 Vect (5) T
    await expect(
      page.locator("text=✅ 编译通过：返回 Vect (5) T").first(),
    ).toBeVisible();
    await expect(page.locator("text=Vector A [3]:").first()).toBeVisible();
    await expect(page.locator("text=Vector B [2]:").first()).toBeVisible();
  });

  test("3. 向量安全操作模拟与空向量/长度不匹配编译期拦截断言", async ({
    page,
  }) => {
    await page.goto("/posts/type-systems/dependent-types");
    await page.waitForLoadState("domcontentloaded");

    const defaultBtn = page
      .locator("button:has-text('1. 长度索引向量')")
      .first();
    await expect(defaultBtn).toBeVisible();

    // 点击 safe_head 按钮
    const headBtn = page
      .locator("button:has-text('safe_head (取首元)')")
      .first();
    await headBtn.click();
    await expect(
      page.locator("text=✅ 编译通过：Vect 3 ≥ 1").first(),
    ).toBeVisible();

    // 将 Vector A 长度切换为 0
    const len0Btn = page.locator("button[aria-label='向量 A 长度 0']").first();
    await len0Btn.click();

    // 验证编译期拦截空向量报错
    await expect(
      page.locator("text=💥 编译期类型检查拦截：拒绝空向量 Nil").first(),
    ).toBeVisible();

    // 切换至 zipWith 操作
    const zipBtn = page
      .locator("button:has-text('zipWith (等长并合)')")
      .first();
    await zipBtn.click();

    // 验证长度不匹配拦截 (0 != 2)
    await expect(
      page.locator("text=💥 编译期拦截：长度不匹配 (0 ≠ 2)").first(),
    ).toBeVisible();

    // 将 Vector A 长度切换为 2
    const len2Btn = page.locator("button[aria-label='向量 A 长度 2']").first();
    await len2Btn.click();

    // 验证两向量长度一致通过
    await expect(
      page.locator("text=✅ 编译通过：两向量长度精确一致 (2 == 2)").first(),
    ).toBeVisible();
  });

  test("4. 预设场景切换联动（矩阵乘法、格式化推导、命题即类型）", async ({
    page,
  }) => {
    await page.goto("/posts/type-systems/dependent-types");
    await page.waitForLoadState("domcontentloaded");

    const defaultBtn = page
      .locator("button:has-text('1. 长度索引向量')")
      .first();
    await expect(defaultBtn).toBeVisible();

    // 切换到预设 2：矩阵乘法
    const preset2Btn = page
      .locator("button:has-text('2. 矩阵乘法维度检查')")
      .first();
    await preset2Btn.click();
    await expect(page.locator("text=多元 Π 类型约束").first()).toBeVisible();

    // 切换到预设 3：编译期 printf 格式化推导
    const preset3Btn = page
      .locator("button:has-text('3. 编译期 printf 格式化推导')")
      .first();
    await preset3Btn.click();
    await expect(
      page.locator("text=值决定类型 (Value-to-Type)").first(),
    ).toBeVisible();
    await expect(
      page.locator("text=合成目标函数类型 (Synthesized Function Type)").first(),
    ).toBeVisible();

    // 切换到预设 4：命题即类型
    const preset4Btn = page
      .locator("button:has-text('4. 命题即类型与一阶谓词逻辑证明')")
      .first();
    await preset4Btn.click();
    await expect(
      page
        .locator("text=Barendregt Lambda 立方体（The Lambda Cube）全景定位")
        .first(),
    ).toBeVisible();
  });

  test("5. 三大视图模式切换与格式化类型动态合成断言", async ({ page }) => {
    await page.goto("/posts/type-systems/dependent-types");
    await page.waitForLoadState("domcontentloaded");

    const defaultBtn = page
      .locator("button:has-text('1. 长度索引向量')")
      .first();
    await expect(defaultBtn).toBeVisible();

    // 切换至“编译期格式化类型推导”视图
    const formatTab = page
      .locator("button:has-text('编译期格式化类型推导 (值决定类型)')")
      .first();
    await formatTab.click();
    await expect(
      page.locator("text=占位符语义映射表 (Value to Type)").first(),
    ).toBeVisible();

    // 点击示例 1 按钮
    const sample1Btn = page.locator("button:has-text('示例 1')").first();
    await sample1Btn.click();

    // 验证合成出 String -> Int -> String
    await expect(
      page.locator("text=String -> Int -> String").first(),
    ).toBeVisible();

    // 切换至“Barendregt Lambda 立方体全景”视图
    const cubeTab = page
      .locator("button:has-text('Barendregt Lambda 立方体全景')")
      .first();
    await cubeTab.click();
    await expect(
      page.locator("text=λP / CoC (Dependent Types)").first(),
    ).toBeVisible();
    await expect(
      page.locator("text=★ 类型依赖于项 (依值类型)").first(),
    ).toBeVisible();
  });

  test("6. CanvasToolbar 复位与底部 CanvasResizer 自适应/双击复位断言", async ({
    page,
  }) => {
    await page.goto("/posts/type-systems/dependent-types");
    await page.waitForLoadState("domcontentloaded");

    const defaultBtn = page
      .locator("button:has-text('1. 长度索引向量')")
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

    // 验证切回默认预设 1 与 Vect 模拟器
    await expect(
      page.locator("button:has-text('1. 长度索引向量')").first(),
    ).toBeVisible();
    await expect(
      page.locator("text=形式化签名 (Dependent Type Signature)").first(),
    ).toBeVisible();
  });

  test("7. 文章交叉超链接有效性与导航测试", async ({ page }) => {
    await page.goto("/posts/type-systems/dependent-types");
    await page.waitForLoadState("domcontentloaded");

    // 验证核心章节二级标题可达
    const h2Section = page
      .locator(
        "h2:has-text('五、Rust 实践：常量泛型（Const Generics）与类型检查停机困境')",
      )
      .first();
    await expect(h2Section).toBeVisible();
    await h2Section.scrollIntoViewIfNeeded();

    // 验证相关标签跳转链接
    const tagLink = page.locator("a[href='/tags/type-systems']").first();
    await expect(tagLink).toBeVisible();
  });
});
