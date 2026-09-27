import { test, expect, type Page } from "@playwright/test";

async function runArticleSample(
  page: Page,
  languageLabel: string,
  expectedOutput: string[],
) {
  await page.goto(
    "/posts/type-systems/interactive-polyglot-code-execution-in-articles",
  );

  const playground = page
    .locator("div.my-6")
    .filter({ hasText: languageLabel })
    .first();
  await expect(playground).toBeVisible();
  await playground.scrollIntoViewIfNeeded();
  await expect(playground.locator(".cm-editor")).toBeVisible();
  await playground.getByRole("button", { name: /运行代码/ }).click();

  await expect(
    playground.getByText("执行成功 (Exit: 0)", { exact: true }),
  ).toBeVisible({ timeout: 15000 });

  const output = playground.locator("pre").last();
  for (const text of expectedOutput) {
    await expect(output).toContainText(text);
  }
  await expect(output).not.toContainText(/ENOENT|环境缺失/);
}

test.describe("CodePlayground (CodeMirror 6) 交互与执行测试", () => {
  let consoleErrors: string[] = [];

  test.beforeEach(async ({ page }) => {
    consoleErrors = [];
    page.on("console", (msg) => {
      if (msg.type() === "error") {
        consoleErrors.push(msg.text());
      }
    });
    page.on("pageerror", (err) => {
      consoleErrors.push(err.message);
    });
  });

  test.afterEach(() => {
    expect(consoleErrors, "页面交互中不应产生未捕获的 JS 异常").toEqual([]);
  });

  test("文章正常加载，CodeMirror 6 成功水合，支持解锁编辑与运行", async ({
    page,
  }) => {
    await page.goto(
      "/posts/type-systems/interactive-polyglot-code-execution-in-articles",
    );
    await page.waitForLoadState("domcontentloaded");

    // 1. 验证标题正常
    await expect(page).toHaveTitle(/在技术文章中嵌入可运行的多语言代码/);

    // 2. 验证页面内存在 CodePlayground 组件并滚动到可视区域触发 client:visible 水合
    const firstPlayground = page.locator("div.my-6").first();
    await expect(firstPlayground).toBeVisible();
    await firstPlayground.scrollIntoViewIfNeeded();

    // 3. 验证 CodeMirror 6 编辑器已挂载并渲染
    const cmEditor = firstPlayground.locator(".cm-editor");
    await expect(cmEditor).toBeVisible();

    // 4. 验证第一个组件为只读模式，带有「只读」标记与「✏️ 编辑代码」按钮
    await expect(firstPlayground.getByText("只读")).toBeVisible();
    const unlockBtn = firstPlayground.getByText("✏️ 编辑代码");
    await expect(unlockBtn).toBeVisible();

    // 点击解锁编辑
    await unlockBtn.click();
    // 解锁后「只读」标签消失
    await expect(firstPlayground.getByText("只读")).toHaveCount(0);

    // 5. 点击运行按钮，测试服务端 Action 执行并返回 stdout
    const runBtn = firstPlayground.getByRole("button", { name: /运行代码/ });
    await expect(runBtn).toBeVisible();
    await runBtn.click();

    // 等待输出控制台渲染
    const outputConsole = firstPlayground.locator("text=执行成功");
    await expect(outputConsole).toBeVisible({ timeout: 10000 });
  });

  test("TypeScript 示例通过本地 TSX CLI 成功运行", async ({ page }) => {
    await runArticleSample(page, "TypeScript (TSX)", [
      "中序升序遍历结果:",
      "5, 17, 23, 42, 67, 89, 100",
    ]);
  });

  test("Rust 示例能探测 rustc 并编译运行", async ({ page }) => {
    await runArticleSample(page, "Rust", ["初始向量:", "模长 = 5"]);
  });

  test("C++ 示例能探测编译器并编译运行", async ({ page }) => {
    await runArticleSample(page, "C++", [
      "10! = 3628800",
      "1^2 + ... + 10^2 = 385",
    ]);
  });

  test("C++ 预处理指令 #include 具有鲜明的高亮着色（红/蓝区分）", async ({
    page,
  }) => {
    await page.goto(
      "/posts/type-systems/interactive-polyglot-code-execution-in-articles",
    );
    await page.waitForLoadState("domcontentloaded");

    // 找到包含 C++ 的 CodePlayground 组件
    const cppPlayground = page
      .locator("div.my-6")
      .filter({
        hasText: "C++",
      })
      .first();
    await expect(cppPlayground).toBeVisible();
    await cppPlayground.scrollIntoViewIfNeeded();

    // 验证 CodeMirror 渲染出的 #include token 带有高亮颜色
    const includeToken = cppPlayground
      .locator(".cm-line span")
      .filter({
        hasText: "#include",
      })
      .first();
    await expect(includeToken).toBeVisible();

    const color = await includeToken.evaluate(
      (el) => window.getComputedStyle(el).color,
    );
    // #d73a49 在 rgb 表现下为 rgb(215, 58, 73)
    expect(color).toBe("rgb(215, 58, 73)");
  });

  test("正文行内代码 <code> 移除反引号伪元素并渲染徽章样式", async ({
    page,
  }) => {
    await page.goto(
      "/posts/type-systems/interactive-polyglot-code-execution-in-articles",
    );
    await page.waitForLoadState("domcontentloaded");

    // 找到正文段落中的 <code>rustc</code>
    const rustcCode = page.locator(".prose code", { hasText: "rustc" }).first();
    await expect(rustcCode).toBeVisible();

    const beforeContent = await rustcCode.evaluate((el) => {
      const style = window.getComputedStyle(el, "::before");
      return style.content;
    });
    // 确保没有反引号 pseudo-element
    expect(beforeContent === "none" || beforeContent === '""').toBe(true);

    const hasBorder = await rustcCode.evaluate((el) => {
      const style = window.getComputedStyle(el);
      return (
        style.borderRadius !== "0px" &&
        style.backgroundColor !== "rgba(0, 0, 0, 0)"
      );
    });
    expect(hasBorder).toBe(true);
  });

  test("借用冲突模拟器 (BorrowConflictDemo) 联动生成 Rust 代码并自动防抖编译", async ({
    page,
  }) => {
    await page.goto("/posts/type-systems/formal-model-of-rust-borrow-checker");
    await page.waitForLoadState("domcontentloaded");

    // 定位借用冲突三维判定模拟器组件
    const demo = page.locator("#borrow-conflict-simulator");
    await expect(demo).toBeVisible();
    await demo.scrollIntoViewIfNeeded();

    // 验证内嵌的 Rust 代码区域和 CodeMirror 已经挂载
    const rustBadge = demo.getByText("Rust", { exact: true });
    await expect(rustBadge).toBeVisible();
    const cmEditor = demo.locator(".cm-editor");
    await expect(cmEditor).toBeVisible();

    // 初始状态（same-var, R vs W, 重叠）必然冲突，等待 500ms 自动编译完成并显示编译拦截
    const conflictResult = demo.locator("text=rustc 借用检查拦截");
    await expect(conflictResult).toBeVisible({ timeout: 10000 });

    // 切换权限 α₂ 为读访问 (R) 消除写冲突
    const readBtn = demo.getByRole("button", { name: /读访问/ }).nth(1);
    await readBtn.click();

    // 等待 500ms 防抖自动编译后转为编译成功
    const successResult = demo.locator("text=rustc 编译成功");
    await expect(successResult).toBeVisible({ timeout: 10000 });
  });
});
