import { expect, test } from "@playwright/test";

test.describe("CodePlayground (Monaco Editor) E2E 冒烟测试", () => {
  test("文章加载、Monaco Editor 挂载与代码执行冒烟", async ({ page }) => {
    const errors: string[] = [];
    page.on("pageerror", (err) => errors.push(err.message));

    await page.goto(
      "/posts/type-systems/interactive-polyglot-code-execution-in-articles",
    );
    await page.waitForLoadState("domcontentloaded");

    // 1. 验证标题与 Monaco Editor 挂载
    await expect(page).toHaveTitle(/在技术文章中嵌入可运行的多语言代码/);

    const firstPlayground = page
      .locator('[data-component="code-playground"]')
      .first();
    await expect(firstPlayground).toBeVisible();
    await firstPlayground.scrollIntoViewIfNeeded();
    await expect(firstPlayground.locator(".monaco-editor")).toBeVisible({
      timeout: 15000,
    });

    // 2. 解锁编辑并执行代码
    const unlockBtn = firstPlayground.getByText("✏️ 编辑代码");
    if (await unlockBtn.isVisible()) {
      await unlockBtn.click();
    }

    const runBtn = firstPlayground.getByRole("button", { name: /运行代码/ });
    await expect(runBtn).toBeVisible();
    await runBtn.click();

    // 等待执行结果返回
    const outputConsole = firstPlayground.locator("text=执行成功");
    await expect(outputConsole).toBeVisible({ timeout: 15000 });

    // 3. 验证无运行时未捕获异常
    expect(errors).toEqual([]);
  });

  test("C++ 与 Rust CodePlayground 语法高亮验证", async ({ page }) => {
    const errors: string[] = [];
    page.on("pageerror", (err) => errors.push(err.message));

    await page.goto(
      "/posts/type-systems/interactive-polyglot-code-execution-in-articles",
    );
    await page.evaluate(() => {
      localStorage.setItem(
        "gfxvis_settings",
        JSON.stringify({
          editorTheme: "bluloco",
          editorFontSize: 13,
          editorLineNumbers: true,
          editorMinimap: false,
          editorTabSize: 2,
          siteAppearance: "light",
        }),
      );
    });
    await page.reload();
    await page.waitForLoadState("domcontentloaded");

    // 找到 C++ playground
    const cppPlayground = page
      .locator('[data-component="code-playground"]')
      .filter({ hasText: "现代 C++ Constexpr" });
    await expect(cppPlayground).toBeVisible();
    await cppPlayground.scrollIntoViewIfNeeded();

    const cppEditor = cppPlayground.locator(".monaco-editor");
    await expect(cppEditor).toBeVisible({ timeout: 15000 });

    // 验证 Monaco 内部语言与模型状态
    const debugInfo = await page.evaluate(() => {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const win = window as any;
      const monaco = win.monaco;
      if (!monaco) return { hasCpp: false, hasRust: false, models: [] };
      const models = monaco.editor
        .getModels()
        .map(
          (m: {
            uri: { toString: () => string };
            getLanguageId: () => string;
          }) => ({
            uri: m.uri.toString(),
            lang: m.getLanguageId(),
          }),
        );
      const languages = monaco.languages
        .getLanguages()
        .map((l: { id: string }) => l.id);
      return {
        models,
        hasCpp: languages.includes("cpp"),
        hasRust: languages.includes("rust"),
      };
    });

    expect(debugInfo.hasCpp).toBe(true);
    expect(debugInfo.hasRust).toBe(true);

    // 等待编辑器首行渲染完成
    await expect(
      cppEditor.locator(".view-lines .view-line").first(),
    ).toBeVisible({
      timeout: 15000,
    });

    // 验证 C++ 关键字已被语法高亮着色 (生成专有 .mtk* 类且颜色非全黑)
    await expect
      .poll(
        async () => {
          return cppPlayground.evaluate((el) => {
            const spans = Array.from(
              el.querySelectorAll(".view-lines .view-line span"),
            );
            const includeSpan = spans.find(
              (s) => s.textContent?.trim() === "#include",
            );
            const constexprSpan = spans.find(
              (s) => s.textContent?.trim() === "constexpr",
            );
            return {
              includeClass: includeSpan?.className ?? "",
              includeColor: includeSpan
                ? window.getComputedStyle(includeSpan).color
                : "",
              constexprClass: constexprSpan?.className ?? "",
              constexprColor: constexprSpan
                ? window.getComputedStyle(constexprSpan).color
                : "",
            };
          });
        },
        { timeout: 15000 },
      )
      .toEqual({
        includeClass: expect.stringMatching(/mtk/),
        includeColor: expect.not.stringMatching(/rgb\(0,\s*0,\s*0\)/),
        constexprClass: expect.stringMatching(/mtk/),
        constexprColor: expect.not.stringMatching(/rgb\(0,\s*0,\s*0\)/),
      });

    expect(errors).toEqual([]);
  });
});
