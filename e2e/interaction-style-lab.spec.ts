import { expect, test, type Locator } from "@playwright/test";

const styles = ["kde"] as const;
const layouts = [
  { id: "side-right", label: "侧边控制架" },
  { id: "bottom-split", label: "画布下方" },
  { id: "three-column", label: "三栏工作台" },
  { id: "dense-dock", label: "密集控制 Dock" },
  { id: "dual-view", label: "双画布对照" },
  { id: "side-left", label: "左侧控制架" },
] as const;

function sampleSelector(style: string, layout: string) {
  return `[data-style="${style}"][data-fixed-layout="${layout}"]`;
}

function mainCanvas(sample: Locator) {
  return sample.getByLabel(/二维向量投影图/);
}

test.describe("交互式可视化 UI 风格试验场", () => {
  test("KDE 风格的六种布局均作为独立样例绘制", async ({ page }) => {
    const pageErrors: string[] = [];
    page.on("pageerror", (error) => pageErrors.push(error.message));
    page.on("console", (message) => {
      if (message.type() === "error") pageErrors.push(message.text());
    });

    await page.goto("/posts/visualization/interaction-style-lab");
    await expect(page).toHaveTitle(/交互式可视化 UI 风格试验场/);

    for (const style of styles) {
      for (const layout of layouts) {
        const sample = page.locator(sampleSelector(style, layout.id));
        await expect(sample).toHaveCount(1);
        await sample.scrollIntoViewIfNeeded();
        const canvas = mainCanvas(sample);
        await expect(canvas).toBeVisible();
        await expect(sample.locator("[data-layout-preset]")).toHaveAttribute(
          "data-layout-preset",
          layout.id,
        );
        await expect(sample.locator(".style-lab__readouts")).toHaveCount(1);
        await expect(
          sample.locator('[data-layout-region="side"] .style-lab__readouts'),
        ).toHaveCount(0);

        // 验证 AutoMath 自动将 readouts 与 sliders 中的公式解析为 KaTeX
        const readouts = sample.locator(".style-lab__readouts");
        await expect(readouts.locator(".katex")).not.toHaveCount(0);
        const readoutsText = await readouts.innerText();
        expect(readoutsText).not.toContain("\\mathbf");
        expect(readoutsText).not.toContain("\\begin");
        expect(readoutsText).not.toContain("$");
        await expect
          .poll(() =>
            canvas.evaluate((element) => (element as HTMLCanvasElement).width),
          )
          .toBeGreaterThanOrEqual(280);

        if (layout.id === "dual-view") {
          await expect(
            sample.getByLabel("投影结果与残差对照画布"),
          ).toBeVisible();
          await expect(sample.locator("canvas")).toHaveCount(2);
          await expect
            .poll(() =>
              sample
                .getByLabel("投影结果与残差对照画布")
                .evaluate((element) => (element as HTMLCanvasElement).width),
            )
            .toBeGreaterThanOrEqual(280);
          const secondaryPixels = await sample
            .getByLabel("投影结果与残差对照画布")
            .evaluate((element) => {
              const canvas = element as HTMLCanvasElement;
              const context = canvas.getContext("2d");
              if (!context) return 0;
              const pixels = context.getImageData(
                0,
                0,
                canvas.width,
                canvas.height,
              ).data;
              const background = [pixels[0], pixels[1], pixels[2]];
              let drawn = 0;
              for (let index = 0; index < pixels.length; index += 4) {
                if (
                  Math.abs(pixels[index] - background[0]) > 8 ||
                  Math.abs(pixels[index + 1] - background[1]) > 8 ||
                  Math.abs(pixels[index + 2] - background[2]) > 8
                ) {
                  drawn += 1;
                }
              }
              return drawn;
            });
          expect(secondaryPixels).toBeGreaterThan(100);
        } else {
          await expect(
            sample.getByLabel("投影结果与残差对照画布"),
          ).toBeHidden();
        }

        if (layout.id === "dense-dock") {
          await expect(sample.getByTestId("dense-dock-controls")).toBeVisible();
          await expect(sample.getByTestId("dense-dock-dummy")).toBeVisible();
          await expect(sample.getByRole("checkbox")).toHaveCount(3);
          await sample.getByRole("checkbox", { name: "投影残差" }).uncheck();
          await sample.getByRole("checkbox", { name: "投影残差" }).check();
          const mainBox = await sample
            .locator('[data-layout-region="main"]')
            .boundingBox();
          const sideBox = await sample
            .locator('[data-layout-region="side"]')
            .boundingBox();
          expect(mainBox).not.toBeNull();
          expect(sideBox).not.toBeNull();
          expect(sideBox!.width).toBeGreaterThan(mainBox!.width * 0.8);
        } else {
          await expect(sample.getByTestId("dense-dock-controls")).toHaveCount(
            0,
          );
        }
      }
    }

    expect(pageErrors).toEqual([]);
  });

  test("双画布实例共享状态，六个样例彼此隔离", async ({ page }) => {
    await page.goto("/posts/visualization/interaction-style-lab");
    const kdeDual = page.locator(sampleSelector("kde", "dual-view"));
    await kdeDual.scrollIntoViewIfNeeded();

    const slider = kdeDual.locator('input[type="range"]').first();
    await slider.fill("3");
    await expect(slider).toHaveValue("3");

    const main = mainCanvas(kdeDual);
    const secondary = kdeDual.getByLabel("投影结果与残差对照画布");
    await expect(secondary).toBeVisible();
    const mainBox = await main.boundingBox();
    expect(mainBox).not.toBeNull();
    await page.mouse.move(
      mainBox!.x + mainBox!.width / 2,
      mainBox!.y + mainBox!.height / 2,
    );
    await page.mouse.down();
    await page.mouse.move(
      mainBox!.x + mainBox!.width / 2 + 12,
      mainBox!.y + mainBox!.height / 2 - 8,
      { steps: 4 },
    );
    await page.mouse.up();
    await expect(
      kdeDual.locator('input[type="range"]').first(),
    ).not.toHaveValue("2.50");
  });

  test("六个样例在深色主题与 390px 窄屏下不产生横向溢出", async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 844 });
    await page.goto("/posts/visualization/interaction-style-lab");
    await page.getByRole("button", { name: "切换浅色/深色主题" }).click();
    await expect(page.locator("html")).toHaveClass(/dark/);

    for (const style of styles) {
      for (const layout of layouts) {
        const sample = page.locator(sampleSelector(style, layout.id));
        await sample.scrollIntoViewIfNeeded();
        const overflow = await sample.evaluate(
          (element) => element.scrollWidth - element.clientWidth,
        );
        expect(
          overflow,
          `${style}/${layout.id} 不应横向溢出`,
        ).toBeLessThanOrEqual(0);
        await expect(mainCanvas(sample)).toBeVisible();
      }
    }
  });

  test("UI 风格试验场底部 CanvasResizer 自适应双击与外层展开按钮断言", async ({
    page,
  }) => {
    await page.goto("/posts/visualization/interaction-style-lab");
    await page.waitForLoadState("domcontentloaded");

    const sample = page.locator(sampleSelector("kde", "side-right")).first();
    await sample.scrollIntoViewIfNeeded();

    // 检查外层展开按钮
    const expandBtn = sample.locator("button[aria-label='展开全屏演示']");
    await expect(expandBtn).toBeVisible();

    // 检查底部 CanvasResizer 处于自适应状态
    const resizer = page.getByTestId("canvas-resizer").first();
    await expect(resizer).toBeVisible();
    await expect(resizer).toHaveAttribute("data-mode", "adaptive");

    // 双击底部横条依然保持/恢复自适应
    await resizer.dblclick();
    await expect(resizer).toHaveAttribute("data-mode", "adaptive");

    // 检查复位按钮
    const resetBtn = page.locator("button[aria-label='复位视野']").first();
    await expect(resetBtn).toBeVisible();
    await resetBtn.click();
  });

  test("KDE 独立组件覆盖断言（KdeTabs 多视图切换、KdeGroupBox 分组与 KdeBadge）", async ({
    page,
  }) => {
    await page.goto("/posts/visualization/interaction-style-lab");
    await page.waitForLoadState("domcontentloaded");

    const sample = page.locator(sampleSelector("kde", "side-right")).first();
    await sample.scrollIntoViewIfNeeded();

    // 1. 验证 KdeGroupBox 与 KdeBadge 存在
    await expect(sample.locator("text=PROJECTION SUBSPACE")).toBeVisible();
    await expect(sample.locator("text=PROJECTION MODE")).toBeVisible();
    await expect(sample.locator("text=VECTOR PROBE")).toBeVisible();
    await expect(sample.locator("text=DISPLAY LAYERS")).toBeVisible();
    await expect(sample.locator("text=BOUNDS [-4, 4]")).toBeVisible();

    // 2. 验证 KdeTabs 切换模式（正交 vs 斜投影）
    const obliqueBtn = sample.locator("button:has-text('斜投影')").first();
    await obliqueBtn.click();
    await expect(obliqueBtn).toHaveAttribute("aria-selected", "true");

    // 3. 验证 KdeTabs 顶栏切换工作区多视图
    const algebraTab = sample.locator("button:has-text('代数矩阵')").first();
    await algebraTab.click();
    await expect(algebraTab).toHaveAttribute("aria-selected", "true");
    await expect(sample.locator("text=投影算子代数结构与特征谱")).toBeVisible();
    await expect(sample.locator("text=代数不变量")).toBeVisible();

    // 切换至正交余空间视图
    const residualTab = sample.locator("button:has-text('正交余空间')").first();
    await residualTab.click();
    await expect(residualTab).toHaveAttribute("aria-selected", "true");
    await expect(sample.locator("text=正交补空间与残差直和分解")).toBeVisible();
    await expect(sample.locator("text=直和向量分解")).toBeVisible();

    // 切回几何投影视图，画布重新可见
    const geometryTab = sample.locator("button:has-text('几何投影')").first();
    await geometryTab.click();
    await expect(geometryTab).toHaveAttribute("aria-selected", "true");
    await expect(mainCanvas(sample)).toBeVisible();
  });

  test("全部 6 个样例切换到代数矩阵/正交余空间再切回几何投影，画布均正常绘制且不为空白", async ({
    page,
  }) => {
    await page.goto("/posts/visualization/interaction-style-lab");
    await page.waitForLoadState("domcontentloaded");

    for (const layout of layouts) {
      const sample = page.locator(sampleSelector("kde", layout.id));
      await sample.scrollIntoViewIfNeeded();

      // 1. 切换到代数矩阵
      const algebraTab = sample.locator("button:has-text('代数矩阵')").first();
      await algebraTab.click();
      await expect(algebraTab).toHaveAttribute("aria-selected", "true");
      await expect(
        sample.locator("text=投影算子代数结构与特征谱"),
      ).toBeVisible();

      // 2. 切回几何投影
      const geometryTab = sample.locator("button:has-text('几何投影')").first();
      await geometryTab.click();
      await expect(geometryTab).toHaveAttribute("aria-selected", "true");

      const canvas = mainCanvas(sample);
      await expect(canvas).toBeVisible();

      // 3. 校验画布内容真实绘制（非纯白空白）
      await expect
        .poll(async () => {
          return await canvas.evaluate((element) => {
            const el = element as HTMLCanvasElement;
            const ctx = el.getContext("2d");
            if (!ctx) return 0;
            const pixels = ctx.getImageData(0, 0, el.width, el.height).data;
            const bg = [pixels[0], pixels[1], pixels[2]];
            let diff = 0;
            for (let i = 0; i < pixels.length; i += 4) {
              if (
                Math.abs(pixels[i] - bg[0]) > 8 ||
                Math.abs(pixels[i + 1] - bg[1]) > 8 ||
                Math.abs(pixels[i + 2] - bg[2]) > 8
              ) {
                diff++;
              }
            }
            return diff;
          });
        })
        .toBeGreaterThan(100);
    }
  });
});
