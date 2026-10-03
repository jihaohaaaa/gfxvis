import { expect, test } from "@playwright/test";

test.describe("CodePlayground (CodeMirror 6) E2E 冒烟测试", () => {
  test("文章加载、CodeMirror 挂载与代码执行冒烟", async ({ page }) => {
    const errors: string[] = [];
    page.on("pageerror", (err) => errors.push(err.message));

    await page.goto(
      "/posts/type-systems/interactive-polyglot-code-execution-in-articles",
    );
    await page.waitForLoadState("domcontentloaded");

    // 1. 验证标题与 CodeMirror 挂载
    await expect(page).toHaveTitle(/在技术文章中嵌入可运行的多语言代码/);

    const firstPlayground = page.locator("div.my-6").first();
    await expect(firstPlayground).toBeVisible();
    await firstPlayground.scrollIntoViewIfNeeded();
    await expect(firstPlayground.locator(".cm-editor")).toBeVisible();

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
});
