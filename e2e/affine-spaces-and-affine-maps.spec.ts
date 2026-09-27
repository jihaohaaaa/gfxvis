import { expect, test, type Locator, type Page } from "@playwright/test";

async function canvasClientPoint(
  canvas: Locator,
  worldX: number,
  worldY: number,
) {
  const box = await canvas.boundingBox();
  const container = await canvas.locator("xpath=..").boundingBox();
  if (!box || !container) throw new Error("交互画布没有可见边界");
  const drawScale = Math.min(
    (container.width - 48) / 6,
    (container.height - 48) / 6,
  );
  const boundsWidth = (container.width - 48) / drawScale;
  const boundsHeight = (container.height - 48) / drawScale;
  const eventScaleX = (box.width - 48) / boundsWidth;
  const eventScaleY = (box.height - 48) / boundsHeight;
  return {
    x: box.x + box.width / 2 + worldX * eventScaleX,
    y: box.y + box.height / 2 - worldY * eventScaleY,
  };
}

async function waitForEdgeDemoHydration(page: Page) {
  await page.waitForFunction(() => {
    const root = document.querySelector('[data-testid="edge-function-demo"]');
    const island = root?.closest("astro-island");
    return Boolean(
      island &&
      (!island.hasAttribute("ssr") || island.hasAttribute("hydrated")),
    );
  });
}

async function waitForDiagramHydration(page: Page) {
  await page.waitForFunction(() => {
    const root = document.querySelector(
      '[data-testid="affine-space-diagram-console"]',
    );
    const island = root?.closest("astro-island");
    return Boolean(
      island &&
      (!island.hasAttribute("ssr") || island.hasAttribute("hydrated")),
    );
  });
}

async function dragCanvasWorldPoint(
  page: Page,
  canvas: Locator,
  from: { x: number; y: number },
  to: { x: number; y: number },
) {
  const start = await canvasClientPoint(canvas, from.x, from.y);
  const end = await canvasClientPoint(canvas, to.x, to.y);
  await page.mouse.move(start.x, start.y);
  await page.mouse.down();
  await page.mouse.move(end.x, end.y, { steps: 8 });
  await page.mouse.up();
}

async function expectAdaptiveSliderLayout(
  slider: Locator,
  expected: "inline" | "stacked",
) {
  await expect(slider).toHaveAttribute("data-label-mode", "adaptive");
  const labelText = slider.locator(".param-slider__label");
  const value = slider.locator(".param-slider__value");
  await expect(labelText).toHaveCSS("white-space", "nowrap");
  await expect(value).toHaveCSS("white-space", "nowrap");

  const positions = await slider.evaluate((element) => {
    const label = element.querySelector(".param-slider__label");
    const controlsRow = element.querySelector(".param-slider__controls");
    const range = element.querySelector('input[type="range"]');
    const readout = element.querySelector(".param-slider__value");
    if (
      !(label instanceof HTMLElement) ||
      !(controlsRow instanceof HTMLElement) ||
      !(range instanceof HTMLElement) ||
      !(readout instanceof HTMLElement)
    ) {
      throw new Error("自适应滑块应包含标签、滑块和值三部分");
    }

    const labelBox = label.getBoundingClientRect();
    const controlsBox = controlsRow.getBoundingClientRect();
    const rangeBox = range.getBoundingClientRect();
    const readoutBox = readout.getBoundingClientRect();
    return {
      isStacked: controlsBox.top >= labelBox.bottom - 1,
      rangeCenter: rangeBox.top + rangeBox.height / 2,
      readoutCenter: readoutBox.top + readoutBox.height / 2,
    };
  });

  expect(positions.isStacked).toBe(expected === "stacked");
  expect(
    Math.abs(positions.rangeCenter - positions.readoutCenter),
  ).toBeLessThanOrEqual(2);
}

async function verifyAdaptiveSliderWidth(slider: Locator) {
  await slider.evaluate((element) => {
    (element as HTMLElement).style.inlineSize = "28rem";
  });
  await expectAdaptiveSliderLayout(slider, "inline");

  await slider.evaluate((element) => {
    (element as HTMLElement).style.inlineSize = "15rem";
  });
  await expectAdaptiveSliderLayout(slider, "stacked");

  await slider.evaluate((element) => {
    (element as HTMLElement).style.removeProperty("inline-size");
  });
}

test.describe("仿射空间与仿射映射 文章与 AffineSpaceDiagram E2E 测试", () => {
  let consoleErrors: string[] = [];
  let allConsoleLogs: string[] = [];

  test.beforeEach(async ({ page }) => {
    consoleErrors = [];
    allConsoleLogs = [];
    page.on("console", (msg) => {
      allConsoleLogs.push(`[${msg.type()}] ${msg.text()}`);
      if (msg.type() === "error") {
        consoleErrors.push(msg.text());
      }
    });
    page.on("pageerror", (err) => {
      consoleErrors.push(err.message);
    });
  });

  test.afterEach(() => {
    if (allConsoleLogs.length > 0) {
      console.log("Console messages:", allConsoleLogs);
    }
    expect(consoleErrors, "不应产生控制台 JS 异常").toEqual([]);
  });

  test("1. 页面基础加载、Title、KaTeX 公式与 AffineSpaceDiagram 挂载断言", async ({
    page,
  }) => {
    await page.goto("/posts/linear-algebra/affine-spaces-and-affine-maps");
    await page.waitForLoadState("domcontentloaded");

    // 检查文章标题
    const title = page.locator("h1");
    await expect(title).toContainText("仿射空间与仿射映射");

    // 检查 KaTeX 公式正常渲染且无语法错误
    const katexMath = page.locator(".katex").first();
    await expect(katexMath).toBeVisible();
    await expect(page.locator(".katex-error")).toHaveCount(0);

    // 检查 AffineSpaceDiagram 交互组件挂载
    const diagram = page.locator("text=仿射几何公理与代数结构交互探针").first();
    await expect(diagram).toBeVisible();
  });

  test("2. 模式一（点 vs 自由向量）原点滑块与画布直接拖拽断言", async ({
    page,
  }) => {
    await page.goto("/posts/linear-algebra/affine-spaces-and-affine-maps");
    await page.waitForLoadState("domcontentloaded");

    const diagram = page.locator("text=仿射几何公理与代数结构交互探针").first();
    await diagram.scrollIntoViewIfNeeded();
    await expect(diagram).toBeVisible();
    await waitForDiagramHydration(page);

    // 验证模式一默认选中与诊断卡片
    await expect(page.locator("text=代数差值向量").first()).toBeVisible();
    await expect(page.locator("text=观察者原点").first()).toBeVisible();

    // 1. 滑块调节
    const oxSlider = page.locator("input[type='range']").first();
    await expect(oxSlider).toBeVisible();
    await oxSlider.fill("1.4");

    // 2. 画布上直接拖拽原点 O
    const svgOrigin = page.locator("text=O (拖拽原点)").first();
    await expect(svgOrigin).toBeVisible();
    const box = await svgOrigin.boundingBox();
    if (box) {
      await page.mouse.move(box.x + 5, box.y + 5);
      await page.mouse.down();
      await page.mouse.move(box.x + 40, box.y + 30);
      await page.mouse.up();
    }

    // 检查差向量依然保持良好计算
    await expect(page.locator("text=代数差值向量").first()).toBeVisible();
  });

  test("3. 模式二（仿射标架与重心坐标）模式切换、滑块与点拖拽断言", async ({
    page,
  }) => {
    await page.goto("/posts/linear-algebra/affine-spaces-and-affine-maps");
    await page.waitForLoadState("domcontentloaded");

    const diagram = page.locator("text=仿射几何公理与代数结构交互探针").first();
    await diagram.scrollIntoViewIfNeeded();
    await expect(diagram).toBeVisible();
    await waitForDiagramHydration(page);

    // 切换到模式二
    const mode2Btn = page
      .locator("button:has-text('2. 仿射标架与重心坐标')")
      .first();
    await mode2Btn.click();

    // 验证模式二特有诊断卡片
    await expect(page.locator("text=处于凸包内部").first()).toBeVisible();

    // 调节 lambda1 滑块至外部
    const lambda1Slider = page.locator("input[type='range']").first();
    await lambda1Slider.fill("1.2");

    // 验证状态切换为处于凸包外部
    await expect(page.locator("text=处于凸包外部").first()).toBeVisible();
  });

  test("4. 模式三（齐次化超平面嵌入）模式切换与向量/点切换断言", async ({
    page,
  }) => {
    await page.goto("/posts/linear-algebra/affine-spaces-and-affine-maps");
    await page.waitForLoadState("domcontentloaded");

    const diagram = page.locator("text=仿射几何公理与代数结构交互探针").first();
    await diagram.scrollIntoViewIfNeeded();
    await expect(diagram).toBeVisible();
    await waitForDiagramHydration(page);

    // 切换到模式三
    const mode3Btn = page
      .locator("button:has-text('3. 齐次化超平面嵌入')")
      .first();
    await mode3Btn.click();

    // 验证模式三特有内容
    await expect(
      page.locator("text=仿射切片超平面 w = 1").first(),
    ).toBeVisible();

    // 切换到方向向量 (w = 0)
    const vectorBtn = page.locator("button:has-text('方向向量')").first();
    await vectorBtn.click();

    await expect(page.locator("text=平移分量").first()).toBeVisible();
  });

  test("5. CanvasToolbar 复位与底部 CanvasResizer 自适应/双击复位断言", async ({
    page,
  }) => {
    await page.goto("/posts/linear-algebra/affine-spaces-and-affine-maps");
    await page.waitForLoadState("domcontentloaded");

    const diagram = page.locator("text=仿射几何公理与代数结构交互探针").first();
    await diagram.scrollIntoViewIfNeeded();
    await expect(diagram).toBeVisible();

    // 检查底部 CanvasResizer 初始处于自适应状态
    const resizer = page.getByTestId("canvas-resizer").first();
    await expect(resizer).toBeVisible();
    await expect(resizer).toHaveAttribute("data-mode", "adaptive");

    // 双击底部横条依然保持/恢复自适应
    await resizer.dblclick();
    await expect(resizer).toHaveAttribute("data-mode", "adaptive");

    // 查找复位按钮
    const resetBtn = page.locator("button[aria-label='复位视野']").first();
    await expect(resetBtn).toBeVisible();
    await resetBtn.click();
  });

  test("6. 文章交叉超链接有效性与导航测试", async ({ page }) => {
    await page.goto("/posts/linear-algebra/affine-spaces-and-affine-maps");
    await page.waitForLoadState("domcontentloaded");

    // 点击指向抽象向量空间的超链接
    const abstractLink = page
      .locator("a[href*='abstract-vector-spaces-and-linear-maps']")
      .first();
    await expect(abstractLink).toBeVisible();
    await abstractLink.click();
    await page.waitForURL(/abstract-vector-spaces-and-linear-maps/);
    await expect(page.locator("h1")).toContainText("抽象向量空间与线性映射");
  });

  test("7. Edge Function 演示挂载、视图切换与 MSAA 倍率", async ({ page }) => {
    await page.goto("/posts/linear-algebra/affine-spaces-and-affine-maps");
    const demo = page.getByTestId("edge-function-demo");
    await demo.scrollIntoViewIfNeeded();
    await waitForEdgeDemoHydration(page);
    await expect(
      demo.getByRole("heading", {
        name: "Edge Function 与 MSAA 光栅化交互演示",
      }),
    ).toBeVisible();
    await expect(demo.getByTestId("probe-canvas")).toBeVisible();
    await expect(demo.getByTestId("probe-triangle-count")).toHaveText(
      "1 个三角形",
    );
    await expect(demo.getByTestId("probe-determinant")).toHaveText("12.00");

    await demo.getByRole("button", { name: "MSAA 覆盖" }).click();
    await expect(demo.getByTestId("triangle-count")).toContainText("3 / 6");
    await expect(demo.getByTestId("coverage-canvas")).toBeVisible();
    for (const rate of [1, 2, 4, 8, 16]) {
      await demo.getByRole("button", { name: rate + "×", exact: true }).click();
      await expect(demo.getByTestId("msaa-sample-count")).toContainText(
        "每像素 " + rate + " 个样本",
      );
      await expect(demo.getByTestId("pixel-sample-count")).toHaveText(
        rate + " 个样本",
      );
      await expect(demo.getByTestId("pixel-mask-T0")).toContainText(
        new RegExp("0b[01]{" + rate + "}"),
      );
    }
  });

  test("8. 几何探针顶点拖动、坐标同步和退化处理", async ({ page }) => {
    await page.goto("/posts/linear-algebra/affine-spaces-and-affine-maps");
    const demo = page.getByTestId("edge-function-demo");
    await demo.scrollIntoViewIfNeeded();
    await waitForEdgeDemoHydration(page);
    const canvas = demo.getByTestId("probe-canvas");

    const t0Area = demo.getByTestId("probe-determinant");
    await dragCanvasWorldPoint(
      page,
      canvas,
      { x: 2, y: -1 },
      { x: 1.5, y: -0.5 },
    );
    await expect(t0Area).not.toHaveText("12.00");
    await expect(demo.getByTestId("selected-point-label")).toHaveText(
      "顶点 P1",
    );
    const firstVertexX = Number(
      await demo.getByTestId("selected-coordinate-x").inputValue(),
    );
    expect(Math.abs(firstVertexX - 1.5)).toBeLessThan(0.02);

    const areaAfterFirstDrag = await t0Area.textContent();
    await dragCanvasWorldPoint(
      page,
      canvas,
      { x: -2, y: -1 },
      { x: -1.6, y: -0.7 },
    );
    await expect(t0Area).not.toHaveText(areaAfterFirstDrag ?? "");
    const movedVertexX = Number(
      await demo.getByTestId("selected-coordinate-x").inputValue(),
    );
    expect(Math.abs(movedVertexX + 1.6)).toBeLessThan(0.02);

    await page.reload();
    const freshDemo = page.getByTestId("edge-function-demo");
    await freshDemo.scrollIntoViewIfNeeded();
    await waitForEdgeDemoHydration(page);
    const freshCanvas = freshDemo.getByTestId("probe-canvas");
    const freshP1 = await canvasClientPoint(freshCanvas, 2, -1);
    await page.mouse.click(freshP1.x, freshP1.y);
    await expect(freshDemo.getByTestId("selected-point-label")).toHaveText(
      "顶点 P1",
    );
    await freshDemo.getByTestId("selected-coordinate-x").fill("-2");
    await freshDemo.getByTestId("selected-coordinate-y").fill("-1");
    await expect(freshDemo.getByTestId("probe-status")).toHaveText(
      "退化三角形",
    );
    await expect(freshDemo.getByTestId("probe-weight-0")).toHaveText("未定义");
  });

  test("9. 多三角形 MSAA 覆盖、顺序、深度与数量控制", async ({ page }) => {
    await page.goto("/posts/linear-algebra/affine-spaces-and-affine-maps");
    const demo = page.getByTestId("edge-function-demo");
    await demo.scrollIntoViewIfNeeded();
    await waitForEdgeDemoHydration(page);
    await demo.getByRole("button", { name: "MSAA 覆盖" }).click();
    await demo.getByRole("button", { name: "4×", exact: true }).click();

    const canvas = demo.getByTestId("coverage-canvas");
    const centerCell = await canvasClientPoint(canvas, 0.5, 0.5);
    await page.mouse.move(centerCell.x, centerCell.y);
    await expect(demo.getByTestId("pixel-winner-summary")).toContainText("T0");

    await demo.getByRole("button", { name: /^T2 ·/ }).click();
    await demo
      .getByTestId("selected-depth-control")
      .locator("input[type='range']")
      .fill("0.1");
    await expect(demo.getByTestId("pixel-winner-summary")).toContainText("T2");

    await demo.getByRole("button", { name: /^T0 ·/ }).click();
    await demo
      .getByTestId("selected-depth-control")
      .locator("input[type='range']")
      .fill("0.05");
    await expect(demo.getByTestId("pixel-winner-summary")).toContainText("T0");

    const addButton = demo.getByRole("button", { name: "添加三角形" });
    await addButton.click();
    await addButton.click();
    await addButton.click();
    await expect(demo.getByTestId("triangle-count")).toContainText("6 / 6");
    await expect(addButton).toBeDisabled();

    const removeButton = demo.getByRole("button", { name: /删除 T/ });
    for (let count = 0; count < 5; count += 1) {
      await removeButton.click();
    }
    await expect(demo.getByTestId("triangle-count")).toContainText("1 / 6");
    await expect(demo.getByRole("button", { name: /删除 T/ })).toBeDisabled();
  });

  test("10. 点坐标输入、视图状态隔离与探针区域高亮", async ({ page }) => {
    await page.goto("/posts/linear-algebra/affine-spaces-and-affine-maps");
    const demo = page.getByTestId("edge-function-demo");
    await demo.scrollIntoViewIfNeeded();
    await waitForEdgeDemoHydration(page);

    const probeCanvas = demo.getByTestId("probe-canvas");
    const samplePoint = await canvasClientPoint(probeCanvas, 0.25, 0.25);
    await page.mouse.click(samplePoint.x, samplePoint.y);
    await expect(demo.getByTestId("selected-point-label")).toHaveText(
      "采样点 P",
    );

    const probeX = demo.getByTestId("selected-coordinate-x");
    await probeX.fill("4.25");
    await expect(demo.getByTestId("probe-point")).toContainText("4.25");
    await expect(demo.getByTestId("probe-canvas-container")).toHaveAttribute(
      "data-view-x-max",
      "5.25",
    );

    const determinantCard = demo.getByTestId("probe-card-D");
    await determinantCard.click();
    await expect(determinantCard).toHaveAttribute("aria-pressed", "true");
    await expect(demo.getByTestId("probe-highlight-summary")).toContainText(
      "完整三角形边界",
    );
    const edgeCard = demo.getByTestId("probe-card-E0");
    await edgeCard.click();
    await expect(edgeCard).toHaveAttribute("aria-pressed", "true");
    await expect(demo.getByTestId("probe-highlight-summary")).toContainText(
      "平行四边形；箭头放在三角形三边 P1→P2",
    );
    await expect(demo.getByTestId("probe-vector-summary")).toContainText(
      "P₀→P",
    );
    const weightCard = demo.getByTestId("probe-card-lambda2");
    await weightCard.click();
    await expect(weightCard).toHaveAttribute("aria-pressed", "true");
    await expect(demo.getByTestId("probe-highlight-summary")).toContainText(
      "λ2：平行四边形；箭头放在三角形三边 P0→P1",
    );

    await probeX.fill("");
    await probeX.press("Tab");
    await expect(probeX).toHaveValue("4.25");
    await expect(demo.getByTestId("probe-point")).toContainText("4.25");

    await demo.getByRole("button", { name: "MSAA 覆盖" }).click();
    await expect(demo.getByTestId("triangle-count")).toContainText("3 / 6");
    await demo.getByRole("button", { name: "8×", exact: true }).click();
    const coverageCanvas = demo.getByTestId("coverage-canvas");
    const t0p0 = await canvasClientPoint(coverageCanvas, -2, -1);
    await page.mouse.click(t0p0.x, t0p0.y);
    await expect(demo.getByTestId("selected-point-label")).toHaveText(
      "T0 顶点 P0",
    );
    const coverageX = demo.getByTestId("selected-coordinate-x");
    await coverageX.fill("4.25");
    await expect(coverageX).toHaveValue("4.25");
    await expect(demo.getByTestId("coverage-canvas-container")).toHaveAttribute(
      "data-view-x-max",
      "5.25",
    );

    await demo.getByRole("button", { name: "几何探针" }).click();
    await expect(demo.getByTestId("probe-point")).toContainText("4.25");
    await expect(weightCard).toHaveAttribute("aria-pressed", "true");
    await demo.getByRole("button", { name: "MSAA 覆盖" }).click();
    await expect(demo.getByRole("button", { name: "8×" })).toHaveAttribute(
      "aria-selected",
      "true",
    );
    await expect(demo.getByTestId("selected-coordinate-x")).toHaveValue("4.25");
  });

  test("11. 仿射相关与凸包冗余实验（挂载切换、共线退化、四面体高度归零与凸冗余动态判定）", async ({
    page,
  }) => {
    await page.goto("/posts/linear-algebra/affine-spaces-and-affine-maps");
    const demo = page.getByTestId("affine-hull-convex-redundancy-demo");
    await demo.scrollIntoViewIfNeeded();
    await expect(demo).toBeVisible();

    // 1. 验证默认 R² 三点场景与初始状态及公式 KaTeX 自动渲染
    await expect(demo.getByTestId("r2-three-experiment")).toBeVisible();
    await expect(demo.getByTestId("r2-three-affine-dimension")).toHaveText("2");
    await expect(demo.getByTestId("r2-three-status")).toHaveText("仿射无关");
    await expect(demo.getByTestId("r2-three-sample-count")).toHaveText("66");

    // 验证 FormulaCard 与 MetricCard 中的 LaTeX 公式均已由 KaTeX 渲染（无未转译的原始 LaTeX 标记）
    const footer = demo.locator('[data-layout-region="bottom"]');
    await expect(footer.locator(".katex")).not.toHaveCount(0);
    const footerText = await footer.innerText();
    expect(footerText).not.toContain("\\operatorname");
    expect(footerText).not.toContain("\\binom");
    expect(footerText).not.toContain("\\sum");

    // 2. 在 R² 三点场景拖动顶点 P2(0, 1.5) 至 (0, -1.1)，与 P0(-1.4, -1.1) 和 P1(1.4, -1.1) 共线
    const r2ThreeCanvas = demo.getByTestId("r2-three-canvas");
    await dragCanvasWorldPoint(
      page,
      r2ThreeCanvas,
      { x: 0, y: 1.5 },
      { x: 0, y: -1.1 },
    );
    await expect(demo.getByTestId("r2-three-affine-dimension")).toHaveText("1");
    await expect(demo.getByTestId("r2-three-status")).toHaveText("仿射相关");

    // 点击 CanvasToolbar 复位按钮，验证恢复为二维非共线三角形
    const r2ThreeContainer = r2ThreeCanvas.locator("xpath=..");
    await r2ThreeContainer.getByRole("button", { name: "复位视野" }).click();
    await expect(demo.getByTestId("r2-three-affine-dimension")).toHaveText("2");
    await expect(demo.getByTestId("r2-three-status")).toHaveText("仿射无关");

    // 3. 切换至 R³ 四点场景，验证四面体退化与高度调节及 KaTeX 渲染
    await demo.getByRole("button", { name: "R³ 四点：四面体退化" }).click();
    await expect(demo.getByTestId("r3-four-experiment")).toBeVisible();
    await expect(demo.getByTestId("r3-affine-dimension")).toHaveText("3");
    await expect(demo.getByTestId("r3-affine-status")).toHaveText("仿射无关");
    await expect(demo.getByTestId("r3-sample-count")).toHaveText("286");
    const r3FooterText = await footer.innerText();
    expect(r3FooterText).not.toContain("\\operatorname");
    expect(r3FooterText).not.toContain("\\frac");
    expect(r3FooterText).not.toContain("\\det");

    // 将 P3 高度从 1.20 调节至 0，确认四点共面、维数降为 2、体积归零
    const heightSlider = demo
      .getByTestId("tetra-height-control")
      .locator("input[type='range']");
    await heightSlider.fill("0");
    await expect(demo.getByTestId("r3-affine-dimension")).toHaveText("2");
    await expect(demo.getByTestId("r3-affine-status")).toHaveText("仿射相关");
    await expect(demo.getByTestId("r3-tetra-volume")).toHaveText("0.000");

    // 4. 切换至 R² 四点场景，验证凸包冗余与动态拖拽判定及 KaTeX 渲染
    await demo.getByRole("button", { name: "R² 四点：凸包冗余" }).click();
    await expect(demo.getByTestId("r2-four-experiment")).toBeVisible();
    await expect(demo.getByTestId("r2-four-sample-count")).toHaveText("286");
    const r2FourFooterText = await footer.innerText();
    expect(r2FourFooterText).not.toContain("\\operatorname");
    expect(r2FourFooterText).not.toContain("\\setminus");
    expect(r2FourFooterText).not.toContain("\\forall");

    // 预设一：四个凸包顶点（凸四边形）
    await expect(demo.getByTestId("r2-four-hull-vertex-count")).toHaveText("4");
    await expect(demo.getByTestId("r2-four-redundancy-summary")).toHaveText(
      "无凸冗余点：四点都是凸包顶点",
    );
    for (let i = 0; i < 4; i += 1) {
      await expect(demo.getByTestId(`r2-four-point-status-${i}`)).toHaveText(
        `P${i}：凸包顶点`,
      );
    }

    // 预设二：切换至「一个内部冗余点」
    await demo.getByRole("button", { name: "一个内部冗余点" }).click();
    await expect(demo.getByTestId("r2-four-hull-vertex-count")).toHaveText("3");
    await expect(demo.getByTestId("r2-four-redundancy-summary")).toContainText(
      "P3 可由其他三点的凸组合表示",
    );
    await expect(demo.getByTestId("r2-four-point-status-3")).toHaveText(
      "P3：凸冗余",
    );

    // 动态拖拽：将内部点 P3(0, 0) 向外拖出三角形至 (0, -2.2)
    const r2FourCanvas = demo.getByTestId("r2-four-canvas");
    await dragCanvasWorldPoint(
      page,
      r2FourCanvas,
      { x: 0, y: 0 },
      { x: 0, y: -2.2 },
    );
    await expect(demo.getByTestId("r2-four-hull-vertex-count")).toHaveText("4");
    await expect(demo.getByTestId("r2-four-redundancy-summary")).toHaveText(
      "无凸冗余点：四点都是凸包顶点",
    );
    await expect(demo.getByTestId("r2-four-point-status-3")).toHaveText(
      "P3：凸包顶点",
    );
  });

  test("12. 三个仿射演示使用仪器机箱，桌面右侧控制架与窄屏堆叠正常", async ({
    page,
  }) => {
    await page.setViewportSize({ width: 1440, height: 1000 });
    await page.goto("/posts/linear-algebra/affine-spaces-and-affine-maps");

    const consoles = [
      {
        name: "仿射公理探针",
        root: page.getByTestId("affine-space-diagram-console"),
        display: '[data-layout-region="main"]',
        rack: '[data-layout-region="side"]',
        readouts: '[data-layout-region="bottom"]',
      },
      {
        name: "仿射包/凸包实验",
        root: page.getByTestId("affine-hull-convex-redundancy-demo"),
        display: '[data-layout-region="main"]',
        rack: '[data-layout-region="side"]',
        readouts: '[data-layout-region="bottom"]',
      },
      {
        name: "边函数光栅化实验",
        root: page.getByTestId("edge-function-demo"),
        display: '[data-layout-region="main"]',
        rack: '[data-layout-region="side"]',
        readouts: '[data-layout-region="bottom"]',
      },
    ];

    for (const consoleView of consoles) {
      await consoleView.root.scrollIntoViewIfNeeded();
      await expect(consoleView.root).toHaveAttribute(
        "data-instrument-console",
        /^CH 0[1-3]$/,
      );
      const display = consoleView.root.locator(consoleView.display).first();
      const rack = consoleView.root.locator(consoleView.rack).first();
      const readouts = consoleView.root.locator(consoleView.readouts).first();
      const displayBox = await display.boundingBox();
      const rackBox = await rack.boundingBox();
      const readoutsBox = await readouts.boundingBox();
      expect(displayBox).not.toBeNull();
      expect(rackBox).not.toBeNull();
      expect(readoutsBox).not.toBeNull();
      expect(rackBox!.x).toBeGreaterThan(displayBox!.x);
      expect(
        Math.abs(
          displayBox!.y + displayBox!.height - (rackBox!.y + rackBox!.height),
        ),
        `${consoleView.name} 的显示区与控制架底边应对齐`,
      ).toBeLessThanOrEqual(12);
      expect(readoutsBox!.y).toBeGreaterThan(
        Math.max(
          displayBox!.y + displayBox!.height,
          rackBox!.y + rackBox!.height,
        ) - 1,
      );
    }

    const hullFooter = consoles[1]!.root.locator(
      '[data-layout-region="bottom"]',
    );
    const hullFormula = hullFooter.locator("[data-console-panel]").first();
    const hullMetrics = hullFooter.locator('[data-testid="affine-readouts"]');
    const hullFormulaBox = await hullFormula.boundingBox();
    const hullMetricsBox = await hullMetrics.boundingBox();
    expect(hullFormulaBox).not.toBeNull();
    expect(hullMetricsBox).not.toBeNull();
    expect(Math.abs(hullFormulaBox!.y - hullMetricsBox!.y)).toBeLessThanOrEqual(
      2,
    );
    expect(hullMetricsBox!.x).toBeGreaterThan(hullFormulaBox!.x);
    await expect(
      hullFormula.locator("[data-console-formula] .katex").first(),
    ).toHaveCSS("white-space", "nowrap");

    await page.evaluate(() => window.scrollTo(0, 0));
    await page.getByRole("button", { name: "切换浅色/深色主题" }).click();
    await expect(page.locator("html")).toHaveClass(/dark/);
    await page.setViewportSize({ width: 390, height: 844 });

    for (const consoleView of consoles) {
      await consoleView.root.scrollIntoViewIfNeeded();
      const display = consoleView.root.locator(consoleView.display).first();
      const rack = consoleView.root.locator(consoleView.rack).first();
      const readouts = consoleView.root.locator(consoleView.readouts).first();
      const displayBox = await display.boundingBox();
      const rackBox = await rack.boundingBox();
      const readoutsBox = await readouts.boundingBox();
      expect(displayBox).not.toBeNull();
      expect(rackBox).not.toBeNull();
      expect(readoutsBox).not.toBeNull();
      expect(rackBox!.y).toBeGreaterThan(displayBox!.y);
      expect(readoutsBox!.y).toBeGreaterThan(
        Math.max(
          displayBox!.y + displayBox!.height,
          rackBox!.y + rackBox!.height,
        ) - 1,
      );
      const consoleOverflow = await consoleView.root.evaluate(
        (element) => element.scrollWidth - element.clientWidth,
      );
      expect(
        consoleOverflow,
        `${consoleView.name} 的机箱布局不应产生横向溢出`,
      ).toBeLessThanOrEqual(0);
    }

    await verifyAdaptiveSliderWidth(
      consoles[0]!.root
        .locator('.param-slider[data-label-mode="adaptive"]')
        .first(),
    );

    await consoles[1]!.root
      .getByRole("button", { name: "R³ 四点：四面体退化" })
      .click();
    await verifyAdaptiveSliderWidth(
      consoles[1]!.root
        .locator('.param-slider[data-label-mode="adaptive"]')
        .first(),
    );

    await consoles[2]!.root.getByRole("button", { name: "MSAA 覆盖" }).click();
    await verifyAdaptiveSliderWidth(
      consoles[2]!.root
        .locator('.param-slider[data-label-mode="adaptive"]')
        .first(),
    );
    const helpText = consoles[2]!.root.getByTestId("point-editor-hint");
    await expect(helpText).toHaveCSS("white-space", "normal");
    const helpTextLineCount = await helpText.evaluate((element) => {
      const style = getComputedStyle(element);
      const verticalPadding =
        Number.parseFloat(style.paddingTop) +
        Number.parseFloat(style.paddingBottom);
      return (
        (element.getBoundingClientRect().height - verticalPadding) /
        Number.parseFloat(style.lineHeight)
      );
    });
    expect(helpTextLineCount).toBeGreaterThan(1.5);
  });
});
