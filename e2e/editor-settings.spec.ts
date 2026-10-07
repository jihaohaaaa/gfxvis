import { expect, test } from "@playwright/test";

test.describe("Monaco Editor 与全站设置中心 E2E 测试", () => {
  test("CodePlayground: Monaco Editor 挂载、只读状态、解锁编辑与执行", async ({
    page,
  }) => {
    const errors: string[] = [];
    page.on("pageerror", (err) => errors.push(err.message));

    await page.goto("/posts/type-systems/simply-typed-lambda-calculus");
    await page.waitForLoadState("domcontentloaded");

    // 1. 定位首个代码机箱
    const playground = page
      .locator('[data-component="code-playground"]')
      .first();
    await expect(playground).toBeVisible();
    await playground.scrollIntoViewIfNeeded();

    // 2. 验证 Monaco Editor 容器挂载
    const editor = playground.locator(".monaco-editor");
    await expect(editor).toBeVisible({ timeout: 15000 });

    // 3. 点击“✏️ 编辑代码”解锁编辑
    const unlockBtn = playground.getByText("✏️ 编辑代码");
    if (await unlockBtn.isVisible()) {
      await unlockBtn.click();
    }

    // 4. 点击“运行代码”并验证服务端执行
    const runBtn = playground.getByRole("button", { name: /运行代码/ });
    await expect(runBtn).toBeVisible();
    await runBtn.click();

    // 5. 等待控制台输出成功返回
    const successTag = playground.locator("text=执行成功");
    await expect(successTag).toBeVisible({ timeout: 15000 });

    expect(errors).toEqual([]);
  });

  test("BorrowConflictDemo: 借用冲突模拟器 Monaco Editor 渲染与编译", async ({
    page,
  }) => {
    const errors: string[] = [];
    page.on("pageerror", (err) => errors.push(err.message));

    await page.goto("/posts/type-systems/formal-model-of-rust-borrow-checker");
    await page.waitForLoadState("domcontentloaded");

    const demo = page.locator("#borrow-conflict-simulator");
    await expect(demo).toBeVisible();
    await demo.scrollIntoViewIfNeeded();

    // 验证其中的 Monaco Editor 实例
    const editor = demo.locator(".monaco-editor");
    await expect(editor).toBeVisible({ timeout: 15000 });

    // 验证 rustc 诊断控制台
    const consoleArea = demo.locator("text=rustc");
    await expect(consoleArea.first()).toBeVisible({ timeout: 15000 });

    expect(errors).toEqual([]);
  });

  test("顶栏设置弹窗: 触发打开、切换设置项与 Esc 关闭", async ({ page }) => {
    await page.goto("/");
    await page.waitForLoadState("domcontentloaded");

    // 1. 点击顶栏齿轮设置按钮
    const settingsBtn = page.locator("#settings-trigger");
    await expect(settingsBtn).toBeVisible();
    await settingsBtn.click();

    // 2. 验证弹窗可见
    const modal = page.locator(
      'div[role="dialog"][aria-label="GFXVis 偏好设置"]',
    );
    await expect(modal).toBeVisible();

    // 3. 验证设置选项卡并点击切换
    const blulocoOption = modal.getByText("Bluloco 高对比");
    await expect(blulocoOption).toBeVisible();
    await blulocoOption.click();

    // 4. 验证 localStorage 发生持久化存储
    const stored = await page.evaluate(() =>
      localStorage.getItem("gfxvis_settings"),
    );
    expect(stored).not.toBeNull();
    const parsed = JSON.parse(stored!);
    expect(parsed.editorTheme).toBe("bluloco");

    // 5. 按 Escape 键关闭弹窗
    await page.keyboard.press("Escape");
    await expect(modal).toBeHidden();
  });

  test("/settings 独立页面: 完整设置视图与恢复默认", async ({ page }) => {
    await page.goto("/settings");
    await page.waitForLoadState("domcontentloaded");

    // 1. 验证页面标题
    await expect(page).toHaveTitle(/偏好设置/);
    const mainTitle = page.getByRole("heading", { name: "全站偏好设置" });
    await expect(mainTitle).toBeVisible();

    // 2. 调节字号为 14px
    const font14 = page.getByText("14px (大字)");
    await expect(font14).toBeVisible();
    await font14.click();

    let stored = await page.evaluate(() =>
      localStorage.getItem("gfxvis_settings"),
    );
    expect(stored).not.toBeNull();
    let parsed = JSON.parse(stored!);
    expect(parsed.editorFontSize).toBe(14);

    // 3. 点击“↺ 恢复默认设置”
    const resetBtn = page.getByText("↺ 恢复默认设置");
    await expect(resetBtn).toBeVisible();
    await resetBtn.click();

    stored = await page.evaluate(() => localStorage.getItem("gfxvis_settings"));
    parsed = JSON.parse(stored!);
    expect(parsed.editorFontSize).toBe(12);
    expect(parsed.editorTheme).toBe("vs-native");
  });

  test("TypeScript LSP: 语义诊断红波浪线与全局类型声明桩", async ({ page }) => {
    const errors: string[] = [];
    page.on("pageerror", (err) => errors.push(err.message));

    await page.goto("/posts/type-systems/simply-typed-lambda-calculus");
    await page.waitForLoadState("domcontentloaded");

    const playground = page
      .locator('[data-component="code-playground"]')
      .first();
    await expect(playground).toBeVisible();
    await playground.scrollIntoViewIfNeeded();

    const editor = playground.locator(".monaco-editor");
    await expect(editor).toBeVisible({ timeout: 15000 });

    // 1. 注入一段故意带有类型错误的代码，验证 tsWorker 能够生成 TS2322 语义错误标记与 squiggly-error
    await page.evaluate(() => {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const model = (window as any).monaco.editor
        .getModels()
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        .find((m: any) => m.uri.path.endsWith(".ts"));
      if (model) {
        model.setValue('const badVal: number = "hello type error";\n');
      }
    });

    // 2. 轮询等待 Monaco TypeScript Worker 进行语义分析并产生诊断 markers
    await expect
      .poll(
        async () => {
          return page.evaluate(() => {
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            const model = (window as any).monaco.editor
              .getModels()
              // eslint-disable-next-line @typescript-eslint/no-explicit-any
              .find((m: any) => m.uri.path.endsWith(".ts"));
            if (!model) return [];
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            const markers = (window as any).monaco.editor.getModelMarkers({
              resource: model.uri,
            });
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            return markers.map((m: any) => m.message);
          });
        },
        { timeout: 15000 },
      )
      .toEqual(
        expect.arrayContaining([
          expect.stringContaining(
            "Type 'string' is not assignable to type 'number'",
          ),
        ]),
      );

    // 3. 验证 DOM 中渲染挂载了对应的红波浪线装饰节点
    await expect(editor.locator(".squiggly-error")).toBeAttached({
      timeout: 5000,
    });

    // 4. 输入符合规范且调用 node/console 声明桩的代码，验证错误标记自动清除归零
    await page.evaluate(() => {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const model = (window as any).monaco.editor
        .getModels()
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        .find((m: any) => m.uri.path.endsWith(".ts"));
      if (model) {
        model.setValue("const val: number = 42;\nconsole.log(val);\n");
      }
    });

    await expect
      .poll(
        async () => {
          return page.evaluate(() => {
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            const model = (window as any).monaco.editor
              .getModels()
              // eslint-disable-next-line @typescript-eslint/no-explicit-any
              .find((m: any) => m.uri.path.endsWith(".ts"));
            if (!model) return 999;
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            const markers = (window as any).monaco.editor.getModelMarkers({
              resource: model.uri,
            });
            // 过滤出 Error 级别诊断 (severity === 8)
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            return markers.filter((m: any) => m.severity === 8).length;
          });
        },
        { timeout: 15000 },
      )
      .toBe(0);

    expect(errors).toEqual([]);
  });

  test("TypeScript LSP: 类型悬浮推导 (Quick Info) 与补全建议 (IntelliSense)", async ({
    page,
  }) => {
    await page.goto("/posts/type-systems/simply-typed-lambda-calculus");
    await page.waitForLoadState("domcontentloaded");

    const playground = page
      .locator('[data-component="code-playground"]')
      .first();
    await expect(playground).toBeVisible();
    await playground.scrollIntoViewIfNeeded();

    const editor = playground.locator(".monaco-editor");
    await expect(editor).toBeVisible({ timeout: 15000 });

    // 1. 设置具有推导类型和方法调用的代码
    await page.evaluate(() => {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const model = (window as any).monaco.editor
        .getModels()
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        .find((m: any) => m.uri.path.endsWith(".ts"));
      if (model) {
        model.setValue(
          "const greeting: string = 'hello';\nconsole.log(greeting);\n",
        );
      }
    });

    // 2. 验证 TypeScript Worker 能够成功返回 Quick Info (悬浮类型推导)
    await expect
      .poll(
        async () => {
          return page.evaluate(async () => {
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            const monaco = (window as any).monaco;
            const model = monaco.editor
              .getModels()
              .find((m: { uri: { path: string } }) =>
                m.uri.path.endsWith(".ts"),
              );
            if (!model) return "";
            try {
              const getWorker = await monaco.typescript.getTypeScriptWorker();
              const worker = await getWorker(model.uri);
              // 位置 6 对应 'greeting'
              const info = await worker.getQuickInfoAtPosition(
                model.uri.toString(),
                6,
              );
              if (!info?.displayParts) return "";
              return info.displayParts
                .map((p: { text: string }) => p.text)
                .join("");
            } catch {
              return "";
            }
          });
        },
        { timeout: 15000 },
      )
      .toContain("const greeting: string");

    // 3. 验证 TypeScript Worker 能够成功为 console. 返回补全建议列表
    await expect
      .poll(
        async () => {
          return page.evaluate(async () => {
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            const monaco = (window as any).monaco;
            const model = monaco.editor
              .getModels()
              .find((m: { uri: { path: string } }) =>
                m.uri.path.endsWith(".ts"),
              );
            if (!model) return [];
            try {
              const getWorker = await monaco.typescript.getTypeScriptWorker();
              const worker = await getWorker(model.uri);
              // 位置 42 对应 'console.' 之后
              const completions = await worker.getCompletionsAtPosition(
                model.uri.toString(),
                42,
              );
              if (!completions?.entries) return [];
              return completions.entries.map((e: { name: string }) => e.name);
            } catch {
              return [];
            }
          });
        },
        { timeout: 15000 },
      )
      .toEqual(expect.arrayContaining(["log", "warn", "error"]));
  });
});
