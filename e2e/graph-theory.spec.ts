import { test, expect } from "@playwright/test";

test.describe("图论基础文章与 GraphTopologyDemo 可视化组件 E2E 测试", () => {
  const POST_URL = "/posts/discrete-math/graph-theory-fundamentals";

  test("1. 页面基础加载、Title、KaTeX 公式与 GraphTopologyDemo 挂载断言", async ({
    page,
  }) => {
    await page.goto(POST_URL);
    await page.waitForLoadState("domcontentloaded");

    // Title 检查
    await expect(page).toHaveTitle(/图论基础与代数图论/);

    // H1 标题检查
    const h1 = page.locator("h1");
    await expect(h1).toContainText("图论基础与代数图论");

    // KaTeX 数学公式渲染断言
    const katexEl = page.locator(".katex").first();
    await expect(katexEl).toBeVisible();

    // 严禁存在 KaTeX 渲染错误
    const katexError = page.locator(".katex-error");
    await expect(katexError).toHaveCount(0);

    // 交互组件挂载检查
    const demo = page.locator("text=无环树 (Tree T₇)").first();
    await expect(demo).toBeVisible();
  });

  test("2. GraphTopologyDemo 预设拓扑切换断言", async ({ page }) => {
    await page.goto(POST_URL);
    await page.waitForLoadState("domcontentloaded");

    // 初始状态：无环树 (Tree T7) -> 7 个顶点, 6 条边
    await expect(page.locator("text=顶点数 |V|").locator("..")).toContainText(
      "7",
    );
    await expect(page.locator("text=边数 |E|").locator("..")).toContainText(
      "6",
    );

    // 切换预设到 二分图 K3,3
    const bipartiteBtn = page
      .locator("button:has-text('二分图 (K₃,₃ 完全二分图)')")
      .first();
    await bipartiteBtn.click();

    // 验证状态更新为 6 个顶点, 9 条边
    await expect(page.locator("text=顶点数 |V|").locator("..")).toContainText(
      "6",
    );
    await expect(page.locator("text=边数 |E|").locator("..")).toContainText(
      "9",
    );

    // 切换预设到 完全图 K5
    const completeBtn = page
      .locator("button:has-text('完全图 (K₅ 五边形超图)')")
      .first();
    await completeBtn.click();
    await expect(page.locator("text=顶点数 |V|").locator("..")).toContainText(
      "5",
    );
    await expect(page.locator("text=边数 |E|").locator("..")).toContainText(
      "10",
    );

    // 切换到有向无环图 DAG
    const dagBtn = page
      .locator("button:has-text('有向无环图 (DAG 渲染管线依赖)')")
      .first();
    await dagBtn.click();
    await expect(
      page.locator("text=有向图（需出入度守恒）").first(),
    ).toBeVisible();
  });

  test("3. GraphTopologyDemo 矩阵视图切换（拉普拉斯 / 邻接 / 度数矩阵）断言", async ({
    page,
  }) => {
    await page.goto(POST_URL);
    await page.waitForLoadState("domcontentloaded");

    // 初始矩阵视图：拉普拉斯矩阵
    const matrixTitle = page
      .locator("text=代数矩阵表示 (Matrix Inspector)")
      .first();
    await expect(matrixTitle).toBeVisible();
    await expect(page.locator("text=拉普拉斯算子性质").first()).toBeVisible();

    // 切换至 邻接矩阵 A
    const adjTab = page.locator("button:has-text('邻接矩阵 A')").first();
    await adjTab.click();
    await expect(page.locator("text=邻接矩阵性质").first()).toBeVisible();

    // 切换至 度数矩阵 D
    const degTab = page.locator("button:has-text('度数矩阵 D')").first();
    await degTab.click();
    await expect(page.locator("text=度数对角矩阵").first()).toBeVisible();
  });

  test("4. CanvasToolbar 视口容器严格包裹与复位操作断言", async ({ page }) => {
    await page.goto(POST_URL);
    await page.waitForLoadState("domcontentloaded");

    // 检查画布内部的 CanvasToolbar
    const toolbar = page.locator("button[aria-label='复位视野']").first();
    await expect(toolbar).toBeVisible();

    // 点击复位按钮，不产生任何异常
    await toolbar.click();
  });

  test("5. 文章双向超链接跳转有效性验证", async ({ page }) => {
    await page.goto(POST_URL);
    await page.waitForLoadState("domcontentloaded");

    // 检查是否有跳转到集合论文章的链接
    const setTheoryLink = page
      .locator(
        'a[href*="/posts/discrete-math/set-theory-relations-and-partitions"]',
      )
      .first();
    await expect(setTheoryLink).toBeVisible();

    // 点击并验证导航成功
    await setTheoryLink.click();
    await page.waitForLoadState("domcontentloaded");
    await expect(page).toHaveURL(/set-theory-relations-and-partitions/);
  });

  test("6. GraphClassificationDiagram 图分类对比探针 Tab 切换与矩阵联动断言", async ({
    page,
  }) => {
    await page.goto(POST_URL);
    await page.waitForLoadState("domcontentloaded");

    // 初始状态：无向简单图
    const classificationTitle = page
      .locator("text=图分类代数与几何对比探针")
      .first();
    await expect(classificationTitle).toBeVisible();
    await expect(
      page.locator("text=无向简单图 拓扑形态").first(),
    ).toBeVisible();

    // 切换至 有向图
    const directedBtn = page
      .locator("button:has-text('有向图 (Digraph)')")
      .first();
    await directedBtn.click();
    await expect(
      page.locator("text=有向图 (Digraph) 拓扑形态").first(),
    ).toBeVisible();
    await expect(page.locator("text=流动与时序").first()).toBeVisible();

    // 切换至 多重图
    const multiBtn = page
      .locator("button:has-text('多重图 (Multigraph)')")
      .first();
    await multiBtn.click();
    await expect(page.locator("text=多重关联").first()).toBeVisible();

    // 切换至 伪图 / 自环
    const pseudoBtn = page.locator("button:has-text('伪图 / 自环')").first();
    await pseudoBtn.click();
    await expect(page.locator("text=自指与退化").first()).toBeVisible();

    // 切换至 带权图
    const weightedBtn = page
      .locator("button:has-text('带权图 (Weighted Graph)')")
      .first();
    await weightedBtn.click();
    await expect(page.locator("text=权重矩阵 W").first()).toBeVisible();
    await expect(page.locator("text=度量物理").first()).toBeVisible();
  });

  test("7. BipartiteColoringDiagram 二分图二染色探针 CapsuleTabs 切换断言", async ({
    page,
  }) => {
    await page.goto(POST_URL);
    await page.waitForLoadState("domcontentloaded");

    const bipartiteTitle = page
      .locator("text=二分图二染色机制与奇环矛盾图解")
      .first();
    await bipartiteTitle.scrollIntoViewIfNeeded();
    await expect(bipartiteTitle).toBeVisible();

    // 初始应为 偶环 C4（无冲突）
    await expect(
      page
        .locator("text=偶数环（长度 4）在红蓝两色交替下完美闭合无冲突")
        .first(),
    ).toBeVisible();

    // 点击切换至 奇环 C3 冲突
    const conflictTab = page
      .locator("button:has-text('奇环 C₃ (对角边冲突)')")
      .first();
    await conflictTab.click();
    await expect(
      page.locator("text=插入对角边后生成奇环").first(),
    ).toBeVisible();

    // 再次点击切换回 偶环 C4
    const evenTab = page
      .locator("button:has-text('偶环 C₄ (合法 2-染色)')")
      .first();
    await evenTab.click();
    await expect(
      page
        .locator("text=偶数环（长度 4）在红蓝两色交替下完美闭合无冲突")
        .first(),
    ).toBeVisible();
  });
});
