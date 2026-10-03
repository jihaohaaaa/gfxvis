import { expect, test } from "@playwright/test";
import { captureIsland } from "./utils/screenshot";

test.describe("仿射空间与仿射映射文章与 Island 交互测试", () => {
  test("页面加载、KaTeX 渲染与仿射交互组件挂载及状态切换", async ({ page }) => {
    const errors: string[] = [];
    page.on("pageerror", (err) => errors.push(err.message));

    await page.goto("/posts/linear-algebra/affine-spaces-and-affine-maps");
    await page.waitForLoadState("domcontentloaded");

    // 1. 验证标题与 KaTeX 渲染
    await expect(page).toHaveTitle(/仿射空间与仿射映射/);
    await expect(page.locator(".katex").first()).toBeVisible();
    await expect(page.locator(".katex-error")).toHaveCount(0);

    // 2. 验证 AffineSpaceDiagram 挂载与截图
    const affineSpaceShell = page
      .locator('[data-instrument-console="CH 01"]')
      .first();
    if ((await affineSpaceShell.count()) > 0) {
      await affineSpaceShell.scrollIntoViewIfNeeded();
      await expect(affineSpaceShell).toBeVisible();

      // 截图 1: AffineSpaceDiagram 初始状态 (点 vs 向量)
      await captureIsland(page, "01-affine-space-point-vs-vector", {
        locator: affineSpaceShell,
        subDir: "affine-spaces",
      });

      // 切换到模式 2 (重心坐标与标架)
      const tab2 = affineSpaceShell
        .locator("button:has-text('2. 仿射标架与重心坐标')")
        .first();
      if ((await tab2.count()) > 0) {
        await tab2.click();
        await captureIsland(page, "02-affine-space-barycentric", {
          locator: affineSpaceShell,
          subDir: "affine-spaces",
        });
      }

      // 切换到模式 3 (齐次化超平面嵌入)
      const tab3 = affineSpaceShell
        .locator("button:has-text('3. 齐次化超平面嵌入')")
        .first();
      if ((await tab3.count()) > 0) {
        await tab3.click();
        await captureIsland(page, "03-affine-space-homogenization", {
          locator: affineSpaceShell,
          subDir: "affine-spaces",
        });
      }
    }

    // 3. 验证 AffineHullConvexRedundancyDemo (CH 02) 挂载与场景切换
    const hullShell = page.locator('[data-instrument-console="CH 02"]').first();
    if ((await hullShell.count()) > 0) {
      await hullShell.scrollIntoViewIfNeeded();
      await expect(hullShell).toBeVisible();

      // 截图 4: R² 三点仿射无关
      await captureIsland(page, "04-affine-hull-r2-three-points", {
        locator: hullShell,
        subDir: "affine-spaces",
      });

      // 切换到 Tab 2: R³ 四点四面体退化
      const r3Tab = hullShell
        .locator("button:has-text('R³ 四点：四面体退化')")
        .first();
      if ((await r3Tab.count()) > 0) {
        await r3Tab.click();
        await captureIsland(page, "05-affine-hull-r3-four-points", {
          locator: hullShell,
          subDir: "affine-spaces",
        });
      }

      // 切换到 Tab 3: R² 四点凸包冗余
      const r2FourTab = hullShell
        .locator("button:has-text('R² 四点：凸包冗余')")
        .first();
      if ((await r2FourTab.count()) > 0) {
        await r2FourTab.click();
        await captureIsland(page, "06-affine-hull-r2-four-redundancy", {
          locator: hullShell,
          subDir: "affine-spaces",
        });
      }
    }

    // 4. 验证无运行时未捕获异常
    expect(errors).toEqual([]);
  });
});
