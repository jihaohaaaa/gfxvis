import { expect, test } from "@playwright/test";

test.describe("GFXVis 搜索系统", () => {
  test("全站跨文章搜索：通过顶栏按钮呼出并搜索关键词，支持小节锚点直达", async ({
    page,
  }) => {
    const errors: string[] = [];
    page.on("pageerror", (err) => errors.push(err.message));

    await page.goto("/");
    await expect(page).toHaveTitle(/GFXVis/);

    // 1. Click header search trigger
    const searchTrigger = page.locator("#search-trigger");
    await expect(searchTrigger).toBeVisible();
    await searchTrigger.click();

    // 2. Search dialog should be visible
    const dialog = page.locator(
      'div[role="dialog"][aria-label="GFXVis 搜索命令面板"]',
    );
    await expect(dialog).toBeVisible();

    // 3. On homepage, in-article scope tabs should not be shown
    const scopeTabs = dialog.locator('button:has-text("当前文章")');
    await expect(scopeTabs).toHaveCount(0);

    // 4. Type search query "B-Spline"
    const input = dialog.locator('input[type="search"]');
    await expect(input).toBeFocused();
    await input.fill("B-Spline");

    // 5. Results should appear
    const resultItem = dialog.locator(
      'div[data-selected]:has-text("从 Bézier 到 B-Spline")',
    );
    await expect(resultItem).toBeVisible({ timeout: 5000 });

    // 6. Verify matching headings exist and are clickable
    const headingPill = resultItem.locator('a[href*="#"]');
    await expect(headingPill.first()).toBeVisible();

    // 7. Click result item to navigate
    await resultItem.click();
    await page.waitForURL(/\/posts\/visualization\/bezier-to-b-spline/);
    await expect(page).toHaveTitle(/从 Bézier 到 B-Spline/);

    expect(errors).toEqual([]);
  });

  test("短字母专有词精准检索：搜索 SVD 不应错误模糊匹配到 std / 类型系统文章", async ({
    page,
  }) => {
    const errors: string[] = [];
    page.on("pageerror", (err) => errors.push(err.message));

    await page.goto("/");
    await page.locator("#search-trigger").click();

    const dialog = page.locator(
      'div[role="dialog"][aria-label="GFXVis 搜索命令面板"]',
    );
    await expect(dialog).toBeVisible();

    const input = dialog.locator('input[type="search"]');
    await input.fill("SVD");

    // Must match singular value decomposition
    await expect(dialog.locator('h3:has-text("奇异值分解")')).toBeVisible({
      timeout: 5000,
    });

    // Must NOT match type-systems articles like dependent-types or existential-types
    await expect(dialog.locator('h3:has-text("依值类型")')).toHaveCount(0);
    await expect(dialog.locator('h3:has-text("存在类型")')).toHaveCount(0);

    expect(errors).toEqual([]);
  });

  test("通用容错阶梯机制：精准词优先无干扰，输入轻微拼写错误的 deteminant 能自动降级命中迹与行列式文章", async ({
    page,
  }) => {
    const errors: string[] = [];
    page.on("pageerror", (err) => errors.push(err.message));

    await page.goto("/");
    await page.locator("#search-trigger").click();

    const dialog = page.locator(
      'div[role="dialog"][aria-label="GFXVis 搜索命令面板"]',
    );
    await expect(dialog).toBeVisible();

    const input = dialog.locator('input[type="search"]');
    // Deliberate typo: deteminant (missing 'r')
    await input.fill("deteminant");

    await expect(dialog.locator('h3:has-text("迹与行列式")')).toBeVisible({
      timeout: 5000,
    });

    expect(errors).toEqual([]);
  });

  test("快捷键与作用域：在文章详情页内呼出，默认聚焦当前文章并支持高亮与迷你伴随条", async ({
    page,
  }) => {
    const errors: string[] = [];
    page.on("pageerror", (err) => errors.push(err.message));

    await page.goto("/posts/visualization/bezier-to-b-spline");
    await expect(page).toHaveTitle(/从 Bézier 到 B-Spline/);
    await expect(page.locator("#search-trigger")).toBeVisible();

    // 1. Open with hotkey (Control+k)
    await page.keyboard.press("Control+k");
    const dialog = page.locator(
      'div[role="dialog"][aria-label="GFXVis 搜索命令面板"]',
    );
    await expect(dialog).toBeVisible();

    // 2. On article page, "当前文章" tab should be present and active
    const inArticleTab = dialog.locator('button:has-text("当前文章")');
    await expect(inArticleTab).toBeVisible();

    // 3. Search for "凸包"
    const input = dialog.locator('input[type="search"]');
    await input.fill("凸包");

    // 4. In-article matches should be listed
    const matchItems = dialog.locator('div[data-selected]:has-text("凸包")');
    await expect(matchItems.first()).toBeVisible({ timeout: 5000 });

    // 5. Click the first match
    await matchItems.first().click();

    // 6. Dialog closes and marks appear on page
    await expect(dialog).not.toBeVisible();

    const marks = page.locator("mark.gfx-search-mark");
    await expect(marks.first()).toBeVisible();

    const activeMark = page.locator("mark.gfx-search-mark-active");
    await expect(activeMark).toBeVisible();

    // 7. Mini search navigator should appear at bottom
    const miniNav = page.locator("#mini-search-navigator");
    await expect(miniNav).toBeVisible();
    await expect(miniNav).toContainText("凸包");

    // 8. Next button increments
    const nextBtn = miniNav.locator('button[title="下一处"]');
    await nextBtn.click();
    await expect(miniNav).toBeVisible();

    // 9. Close button removes marks and navigator
    const closeBtn = miniNav.locator('button[title*="清除高亮"]');
    await closeBtn.click();
    await expect(miniNav).not.toBeVisible();
    await expect(page.locator("mark.gfx-search-mark")).toHaveCount(0);

    expect(errors).toEqual([]);
  });

  test("跨文章携带搜索词跳转与落地高光脉冲动画：从全站搜索点击小节胶囊，跨页直达目标小节并自动触发高光脉冲动画与迷你导航条", async ({
    page,
  }) => {
    const errors: string[] = [];
    page.on("pageerror", (err) => errors.push(err.message));

    await page.goto("/");
    await page.locator("#search-trigger").click();

    const dialog = page.locator(
      'div[role="dialog"][aria-label="GFXVis 搜索命令面板"]',
    );
    await expect(dialog).toBeVisible();

    const input = dialog.locator('input[type="search"]');
    await input.fill("特征值");

    // 1. Verify 《特征值与特征向量的几何意义》 is found and highlighted
    const articleCard = dialog
      .locator('div[data-selected]:has-text("特征值与特征向量")')
      .first();
    await expect(articleCard).toBeVisible({ timeout: 5000 });

    // Verify palette highlight marks exist inside title/pills
    const paletteHighlights = articleCard.locator("mark.gfx-palette-highlight");
    await expect(paletteHighlights.first()).toBeVisible();
    await expect(paletteHighlights.first()).toHaveText("特征值");

    // 2. Click a matching heading pill to deep link
    const headingPill = articleCard.locator('a[href*="#"]');
    await expect(headingPill.first()).toBeVisible();
    await headingPill.first().click();

    // 3. Page navigates to the article with ?q=... and #hash
    await page.waitForURL(
      /\/posts\/linear-algebra\/eigenvalues-and-eigenvectors/,
    );
    await expect(page).toHaveTitle(/特征值与特征向量/);
    expect(page.url()).toContain("q=%E7%89%B9%E5%BE%81%E5%80%BC");

    // 4. In-article highlights should be automatically applied on landing
    const marks = page.locator("mark.gfx-search-mark");
    await expect(marks.first()).toBeVisible({ timeout: 5000 });

    const activeMark = page.locator("mark.gfx-search-mark-active");
    await expect(activeMark).toBeVisible();

    // 5. Mini search navigator should be automatically mounted and show match counts
    const miniNav = page.locator("#mini-search-navigator");
    await expect(miniNav).toBeVisible();
    await expect(miniNav).toContainText("特征值");

    // 6. Close navigator cleans highlights and cleans URL ?q=
    const closeBtn = miniNav.locator('button[title*="清除高亮"]');
    await closeBtn.click();
    await expect(miniNav).not.toBeVisible();
    await expect(page.locator("mark.gfx-search-mark")).toHaveCount(0);
    expect(page.url()).not.toContain("q=");

    expect(errors).toEqual([]);
  });

  test("错字与变音符容错高亮联动：输入错字 bezeir 能召回 Bézier 文章，面板高亮 Bézier 且点击跳转带参落地高亮与脉冲", async ({
    page,
  }) => {
    const errors: string[] = [];
    page.on("pageerror", (err) => errors.push(err.message));

    await page.goto("/");
    await page.locator("#search-trigger").click();

    const dialog = page.locator(
      'div[role="dialog"][aria-label="GFXVis 搜索命令面板"]',
    );
    await expect(dialog).toBeVisible();

    const input = dialog.locator('input[type="search"]');
    // Deliberate typo: bezeir
    await input.fill("bezeir");

    // 1. Result card should appear for Bézier to B-Spline
    const resultItem = dialog.locator(
      'div[data-selected]:has-text("从 Bézier 到 B-Spline")',
    );
    await expect(resultItem).toBeVisible({ timeout: 5000 });

    // 2. Highlighting should match Bézier in title despite user typo bezeir
    const highlight = resultItem.locator("mark.gfx-palette-highlight");
    await expect(highlight.first()).toBeVisible();
    await expect(highlight.first()).toHaveText("Bézier");

    // 3. Matching headings should also be found and highlighted
    const headingPill = resultItem.locator('a[href*="#"]');
    await expect(headingPill.first()).toBeVisible();

    // 4. Click heading pill or card to navigate
    await headingPill.first().click();

    // 5. Lands on target article with effective query
    await page.waitForURL(/\/posts\/visualization\/bezier-to-b-spline/);
    expect(page.url()).toContain("q=bezier");

    // 6. Article text automatically highlights Bézier with active mark and pulse
    const marks = page.locator("mark.gfx-search-mark");
    await expect(marks.first()).toBeVisible({ timeout: 5000 });

    const activeMark = page.locator("mark.gfx-search-mark-active");
    await expect(activeMark).toBeVisible();

    // 7. Mini search navigator appears with clean canonical text
    const miniNav = page.locator("#mini-search-navigator");
    await expect(miniNav).toBeVisible();
    await expect(miniNav).toContainText("Bézier");

    expect(errors).toEqual([]);
  });

  test("搜索历史记录管理：选择结果后记录最近搜索，重新打开可回填与删除", async ({
    page,
  }) => {
    const errors: string[] = [];
    page.on("pageerror", (err) => errors.push(err.message));

    await page.goto("/");

    // 1. Open search dialog and search "投影"
    await page.locator("#search-trigger").click();
    const dialog = page.locator(
      'div[role="dialog"][aria-label="GFXVis 搜索命令面板"]',
    );
    await expect(dialog).toBeVisible();

    const input = dialog.locator('input[type="search"]');
    await input.fill("投影");

    // 2. Click a result
    const resultItem = dialog
      .locator('div[data-selected]:has-text("投影")')
      .first();
    await expect(resultItem).toBeVisible({ timeout: 5000 });
    await resultItem.click();

    // 3. Open search dialog again
    await page.locator("#search-trigger").click();
    await expect(dialog).toBeVisible();

    // 4. "最近搜索" section should be visible with "投影"
    const recentHeading = dialog.locator('span:has-text("最近搜索")');
    await expect(recentHeading).toBeVisible();
    const recentTag = dialog.locator('div.group:has-text("投影")');
    await expect(recentTag).toBeVisible();

    // 5. Click the remove button to delete recent search item
    const removeBtn = recentTag.locator('button[title="删除此条记录"]');
    await removeBtn.click();
    await expect(recentTag).toHaveCount(0);

    expect(errors).toEqual([]);
  });
});
