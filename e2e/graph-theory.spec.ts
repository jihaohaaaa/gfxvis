import { expect, test } from "@playwright/test";

test.describe("图论基础文章与 GraphTopologyDemo E2E 冒烟测试", () => {
  test("页面加载、KaTeX 渲染与图拓扑预设切换", async ({ page }) => {
    const errors: string[] = [];
    page.on("pageerror", (err) => errors.push(err.message));

    await page.goto("/posts/discrete-math/graph-theory-fundamentals");
    await page.waitForLoadState("domcontentloaded");

    // 1. 验证标题与 KaTeX 渲染
    await expect(page).toHaveTitle(/图论基础与代数图论/);
    await expect(page.locator(".katex").first()).toBeVisible();
    await expect(page.locator(".katex-error")).toHaveCount(0);

    // 2. 验证图论拓扑预设切换
    const bipartiteBtn = page
      .locator("button:has-text('二分图 (K₃,₃ 完全二分图)')")
      .first();
    await expect(bipartiteBtn).toBeVisible();
    await bipartiteBtn.click();
    await expect(page.locator("text=顶点数 |V|").locator("..")).toContainText(
      "6",
    );

    // 3. 验证无运行时未捕获异常
    expect(errors).toEqual([]);
  });
});
