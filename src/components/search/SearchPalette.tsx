import { useEffect, useRef, useState } from "react";
import {
  applyInArticleHighlights,
  findInArticleMatches,
  isArticlePage,
} from "../../lib/search/dom-highlighter";
import {
  getEffectiveSearchQuery,
  prefetchSearchIndex,
  searchCrossArticles,
} from "../../lib/search/search-client";
import type {
  CrossArticleResult,
  InArticleMatch,
} from "../../lib/search/types";
import KdeTabs, { type KdeTabOption } from "../framework/KdeTabs";
import "./search.css";

type SearchScope = "in-article" | "site-wide";

const CATEGORY_OPTIONS = [
  { id: "all", label: "全部" },
  { id: "linear-algebra", label: "线性代数" },
  { id: "calculus", label: "微积分" },
  { id: "discrete-math", label: "离散数学" },
  { id: "type-systems", label: "类型系统" },
  { id: "visualization", label: "可视化" },
] as const;

const DIACRITIC_MAP: Record<string, string> = {
  a: "[aàáâãäå]",
  e: "[eèéêë]",
  i: "[iìíîï]",
  o: "[oòóôõö]",
  u: "[uùúûü]",
  c: "[cç]",
  n: "[nñ]",
};

function termToDiacriticPattern(term: string): string {
  return term
    .toLowerCase()
    .split("")
    .map(
      (ch) =>
        DIACRITIC_MAP[ch] || (/[.*+?^${}()|[\]\\]/.test(ch) ? "\\" + ch : ch),
    )
    .join("");
}

export function HighlightText({
  text,
  query,
  matchedTerms,
}: {
  text: string;
  query: string;
  matchedTerms?: string[];
}) {
  const trimmed = query.trim();
  const queryTerms = trimmed.split(/\s+/).filter((t) => t.length > 0);

  if (
    !text ||
    (queryTerms.length === 0 && (!matchedTerms || matchedTerms.length === 0))
  ) {
    return <>{text}</>;
  }

  // 1. Direct query terms that match `text` (exact / diacritic match) have highest priority
  const activeTerms: string[] = [];
  const unmatchedQueryTerms: string[] = [];

  for (const qTerm of queryTerms) {
    const pattern = new RegExp(termToDiacriticPattern(qTerm), "i");
    if (pattern.test(text)) {
      activeTerms.push(qTerm);
    } else {
      unmatchedQueryTerms.push(qTerm);
    }
  }

  // 2. For any query term that did not directly match text (e.g. user typo such as "bezeir"),
  // look for typo/fuzzy corrections in `matchedTerms` that DO match text.
  if (unmatchedQueryTerms.length > 0 || activeTerms.length === 0) {
    const validMatched = (matchedTerms || [])
      .flatMap((t) => t.split(/\s+/).filter((x) => x.length > 0))
      .filter((term) => {
        const pattern = new RegExp(termToDiacriticPattern(term), "i");
        return pattern.test(text);
      });

    for (const uTerm of unmatchedQueryTerms) {
      // Pick the matched term closest in length (e.g. "bezeir" (6) -> "bezier" (6))
      const candidates = [...validMatched].sort(
        (a, b) =>
          Math.abs(a.length - uTerm.length) - Math.abs(b.length - uTerm.length),
      );
      if (candidates[0]) {
        activeTerms.push(candidates[0]);
      }
    }

    if (activeTerms.length === 0 && validMatched.length > 0) {
      activeTerms.push(...validMatched);
    }
  }

  if (activeTerms.length === 0) {
    return <>{text}</>;
  }

  // Deduplicate and sort descending by length
  const sortedTerms = Array.from(new Set(activeTerms)).sort(
    (a, b) => b.length - a.length,
  );

  const patterns = sortedTerms.map(termToDiacriticPattern);
  const pattern = new RegExp(`(${patterns.join("|")})`, "gi");
  const parts = text.split(pattern);

  return (
    <>
      {parts.map((part, idx) => {
        const isMatch = patterns.some((p) =>
          new RegExp(`^${p}$`, "i").test(part),
        );
        if (isMatch) {
          return (
            <mark key={idx} className="gfx-palette-highlight">
              {part}
            </mark>
          );
        }
        return <span key={idx}>{part}</span>;
      })}
    </>
  );
}

const RECENT_SEARCHES_KEY = "gfxvis_recent_searches";
const MAX_RECENT_SEARCHES = 6;

function loadRecentSearches(): string[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = localStorage.getItem(RECENT_SEARCHES_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

function persistRecentSearch(keyword: string): string[] {
  if (typeof window === "undefined") return [];
  const trimmed = keyword.trim();
  if (!trimmed) return loadRecentSearches();
  try {
    const prev = loadRecentSearches();
    const updated = [
      trimmed,
      ...prev.filter((k) => k.toLowerCase() !== trimmed.toLowerCase()),
    ].slice(0, MAX_RECENT_SEARCHES);
    localStorage.setItem(RECENT_SEARCHES_KEY, JSON.stringify(updated));
    return updated;
  } catch {
    return [];
  }
}

function removeRecentSearchItem(keyword: string): string[] {
  if (typeof window === "undefined") return [];
  try {
    const prev = loadRecentSearches();
    const updated = prev.filter((k) => k !== keyword);
    localStorage.setItem(RECENT_SEARCHES_KEY, JSON.stringify(updated));
    return updated;
  } catch {
    return [];
  }
}

function clearAllRecentSearches(): void {
  if (typeof window === "undefined") return;
  try {
    localStorage.removeItem(RECENT_SEARCHES_KEY);
  } catch {
    // Ignore storage quota or permission errors
  }
}

export default function SearchPalette() {
  const [isOpen, setIsOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [scope, setScope] = useState<SearchScope>("site-wide");
  const [isArticle, setIsArticle] = useState(false);
  const [category, setCategory] = useState<string>("all");
  const [inArticleResults, setInArticleResults] = useState<InArticleMatch[]>(
    [],
  );
  const [crossResults, setCrossResults] = useState<CrossArticleResult[]>([]);
  const [selectedIndex, setSelectedIndex] = useState(0);
  const [isSearching, setIsSearching] = useState(false);
  const [recentSearches, setRecentSearches] = useState<string[]>([]);

  const inputRef = useRef<HTMLInputElement>(null);
  const listRef = useRef<HTMLDivElement>(null);

  function handleRemoveRecent(e: React.MouseEvent, keyword: string) {
    e.stopPropagation();
    setRecentSearches(removeRecentSearchItem(keyword));
  }

  function handleClearRecent(e: React.MouseEvent) {
    e.stopPropagation();
    clearAllRecentSearches();
    setRecentSearches([]);
  }

  // Setup global event listeners and hotkeys
  useEffect(() => {
    function handleOpenEvent() {
      const onArticle = isArticlePage();
      setIsArticle(onArticle);
      setScope(onArticle ? "in-article" : "site-wide");
      setIsOpen(true);
      prefetchSearchIndex();
    }

    function handleKeyDown(e: KeyboardEvent) {
      // Hotkey: Cmd+K or Ctrl+K
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "k") {
        e.preventDefault();
        if (isOpen) {
          setIsOpen(false);
        } else {
          handleOpenEvent();
        }
        return;
      }

      // Hotkey: Slash (/) when not focusing inputs
      if (
        e.key === "/" &&
        !isOpen &&
        !(
          document.activeElement instanceof HTMLInputElement ||
          document.activeElement instanceof HTMLTextAreaElement ||
          document.activeElement?.getAttribute("contenteditable") === "true"
        )
      ) {
        e.preventDefault();
        handleOpenEvent();
        return;
      }

      // Close on Escape
      if (e.key === "Escape" && isOpen) {
        e.preventDefault();
        setIsOpen(false);
      }
    }

    window.addEventListener("gfx:open-search", handleOpenEvent);
    window.addEventListener("keydown", handleKeyDown);

    return () => {
      window.removeEventListener("gfx:open-search", handleOpenEvent);
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, [isOpen]);

  // Focus input, load recent searches and lock body scroll when opened
  useEffect(() => {
    if (isOpen) {
      setRecentSearches(loadRecentSearches());
      prefetchSearchIndex();
      setTimeout(() => {
        inputRef.current?.focus();
        inputRef.current?.select();
      }, 50);
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "";
      setQuery("");
      setSelectedIndex(0);
    }
  }, [isOpen]);

  // Perform search whenever query, scope, or category changes
  useEffect(() => {
    if (!isOpen) return;
    setSelectedIndex(0);

    const trimmed = query.trim();
    if (!trimmed) {
      setInArticleResults([]);
      setCrossResults([]);
      setIsSearching(false);
      return;
    }

    if (scope === "in-article") {
      const matches = findInArticleMatches(trimmed);
      setInArticleResults(matches);
      setIsSearching(false);
    } else {
      setIsSearching(true);
      const timer = setTimeout(() => {
        searchCrossArticles(trimmed, category)
          .then((res) => {
            setCrossResults(res);
          })
          .catch(() => {
            setCrossResults([]);
          })
          .finally(() => {
            setIsSearching(false);
          });
      }, 80);

      return () => clearTimeout(timer);
    }
  }, [query, scope, category, isOpen]);

  // Keyboard navigation within search results
  function handleInputKeyDown(e: React.KeyboardEvent<HTMLInputElement>) {
    const totalItems =
      scope === "in-article" ? inArticleResults.length : crossResults.length;

    if (e.key === "Tab" && isArticle) {
      e.preventDefault();
      setScope((prev) => (prev === "in-article" ? "site-wide" : "in-article"));
      return;
    }

    if (e.key === "ArrowDown") {
      e.preventDefault();
      if (totalItems > 0) {
        setSelectedIndex((prev) => (prev + 1) % totalItems);
      }
      return;
    }

    if (e.key === "ArrowUp") {
      e.preventDefault();
      if (totalItems > 0) {
        setSelectedIndex((prev) => (prev - 1 + totalItems) % totalItems);
      }
      return;
    }

    if (e.key === "Enter") {
      e.preventDefault();
      if (scope === "in-article") {
        const item = inArticleResults[selectedIndex];
        if (item) {
          selectInArticleItem(item);
        }
      } else {
        const item = crossResults[selectedIndex];
        if (item) {
          const firstHeadingSlug = item.matchingHeadings?.[0]?.slug;
          handleSelectCrossResult(item, firstHeadingSlug);
        }
      }
    }
  }

  // Scroll active item into view inside results list
  useEffect(() => {
    if (!listRef.current) return;
    const activeEl = listRef.current.querySelector<HTMLElement>(
      "[data-selected='true']",
    );
    if (activeEl) {
      activeEl.scrollIntoView({ block: "nearest" });
    }
  }, [selectedIndex]);

  function selectInArticleItem(match: InArticleMatch) {
    setIsOpen(false);
    const trimmed = query.trim();
    if (trimmed) {
      setRecentSearches(persistRecentSearch(trimmed));
    }
    const { total, current } = applyInArticleHighlights(trimmed, match.id);

    if (typeof window !== "undefined") {
      const url = new URL(window.location.href);
      if (trimmed) url.searchParams.set("q", trimmed);
      if (match.headingSlug) url.hash = match.headingSlug;
      window.history.replaceState(null, "", url.toString());
    }

    // Notify mini navigator
    window.dispatchEvent(
      new CustomEvent("gfx:in-article-search-active", {
        detail: {
          query: trimmed,
          total,
          current,
        },
      }),
    );
  }

  function handleSelectCrossResult(
    doc: CrossArticleResult,
    headingSlug?: string,
  ) {
    setIsOpen(false);
    const userQ = query.trim();
    if (userQ) {
      setRecentSearches(persistRecentSearch(userQ));
    }
    const currentPath = window.location.pathname.replace(/\/$/, "");
    const targetPath = `/posts/${doc.slug}`.replace(/\/$/, "");
    const targetHash = headingSlug ? `#${headingSlug}` : "";

    // Use the canonical matched term (e.g. "bezier") when typo occurred ("bezeir"), otherwise preserve verbatim
    const effectiveQuery = getEffectiveSearchQuery(query, doc);

    // If already on the same article page, smoothly locate without full reload
    if (currentPath === targetPath) {
      const url = new URL(window.location.href);
      if (effectiveQuery) url.searchParams.set("q", effectiveQuery);
      if (headingSlug) url.hash = headingSlug;
      window.history.pushState(null, "", url.toString());

      if (headingSlug) {
        const headingEl = document.getElementById(headingSlug);
        if (headingEl) {
          headingEl.scrollIntoView({ behavior: "smooth", block: "start" });
          headingEl.classList.remove("heading-pulse");
          void headingEl.offsetWidth;
          headingEl.classList.add("heading-pulse");
        }
      }

      if (effectiveQuery) {
        const matches = findInArticleMatches(effectiveQuery);
        let targetId = 0;
        if (headingSlug) {
          const found = matches.find((m) => m.headingSlug === headingSlug);
          if (found) targetId = found.id;
        }
        const { total, current } = applyInArticleHighlights(
          effectiveQuery,
          targetId,
        );
        window.dispatchEvent(
          new CustomEvent("gfx:in-article-search-active", {
            detail: { query: effectiveQuery, total, current },
          }),
        );
      }
      return;
    }

    // Cross-page navigation with query and optional heading hash
    const qParam = effectiveQuery
      ? `?q=${encodeURIComponent(effectiveQuery)}`
      : "";
    window.location.href = `/posts/${doc.slug}${qParam}${targetHash}`;
  }

  if (!isOpen) {
    return null;
  }

  const scopeTabs: KdeTabOption<SearchScope>[] = [
    {
      id: "in-article",
      label: "当前文章",
      badge: inArticleResults.length > 0 ? inArticleResults.length : undefined,
    },
    {
      id: "site-wide",
      label: "全站检索",
      badge: crossResults.length > 0 ? crossResults.length : undefined,
    },
  ];

  return (
    <div
      className="fixed inset-0 z-50 flex items-start justify-center p-3 sm:p-6 pt-12 sm:pt-20 bg-black/45 backdrop-blur-sm transition-opacity"
      role="dialog"
      aria-modal="true"
      aria-label="GFXVis 搜索命令面板"
      onClick={() => setIsOpen(false)}
    >
      <div
        className="gfx-search-dialog-panel relative flex w-full max-w-2xl flex-col overflow-hidden rounded-2xl border border-border/90 bg-surface/98 shadow-2xl backdrop-blur-2xl dark:border-border/80 dark:bg-surface/98"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Search Input Bar */}
        <div className="flex items-center gap-3 border-b border-border/80 px-4 py-3 sm:px-5">
          <svg
            xmlns="http://www.w3.org/2000/svg"
            width="18"
            height="18"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2.5"
            strokeLinecap="round"
            strokeLinejoin="round"
            className="shrink-0 text-accent"
          >
            <circle cx="11" cy="11" r="8" />
            <line x1="21" y1="21" x2="16.65" y2="16.65" />
          </svg>

          <input
            ref={inputRef}
            type="search"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onKeyDown={handleInputKeyDown}
            enterKeyHint="search"
            placeholder={
              scope === "in-article"
                ? "在当前文章中检索并高亮定位..."
                : "全站检索 41 篇技术文章、小节与算法..."
            }
            className="flex-1 bg-transparent text-sm sm:text-base text-ink placeholder:text-muted focus:outline-none"
            autoComplete="off"
            spellCheck="false"
          />

          {query && (
            <button
              type="button"
              onClick={() => setQuery("")}
              className="rounded-lg p-1 text-muted transition-colors hover:bg-surface-alt hover:text-ink"
              aria-label="清空输入"
            >
              <svg
                xmlns="http://www.w3.org/2000/svg"
                width="14"
                height="14"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2.5"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <line x1="18" y1="6" x2="6" y2="18" />
                <line x1="6" y1="6" x2="18" y2="18" />
              </svg>
            </button>
          )}

          <button
            type="button"
            onClick={() => setIsOpen(false)}
            className="rounded-lg border border-border/80 px-2 py-0.5 text-xs font-mono text-muted hover:border-accent hover:text-accent transition-colors"
          >
            ESC
          </button>
        </div>

        {/* Scope and Filter Bar */}
        <div className="flex flex-wrap items-center justify-between gap-2 border-b border-border/60 bg-surface-alt/40 px-4 py-2 sm:px-5">
          {isArticle ? (
            <KdeTabs
              options={scopeTabs}
              value={scope}
              onChange={(s) => setScope(s)}
              variant="pill"
              size="xs"
            />
          ) : (
            <span className="text-xs font-medium text-muted">
              🌐 全站 41 篇技术长文
            </span>
          )}

          {scope === "site-wide" && (
            <div className="flex items-center gap-1 overflow-x-auto py-0.5">
              {CATEGORY_OPTIONS.map((cat) => (
                <button
                  key={cat.id}
                  type="button"
                  onClick={() => setCategory(cat.id)}
                  className={`rounded-full px-2.5 py-0.5 text-[0.7rem] font-medium transition-colors ${
                    category === cat.id
                      ? "bg-accent/15 text-accent font-semibold"
                      : "text-muted hover:text-ink hover:bg-surface"
                  }`}
                >
                  {cat.label}
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Search Results Area */}
        <div
          ref={listRef}
          className="flex-1 max-h-[55vh] overflow-y-auto p-3 sm:p-4 space-y-2 select-none"
        >
          {/* In-Article Mode Results */}
          {scope === "in-article" && (
            <>
              {!query.trim() ? (
                <div className="py-6 sm:py-8 px-2 space-y-5 text-sm">
                  {recentSearches.length > 0 && (
                    <div>
                      <div className="flex items-center justify-between px-1 mb-2">
                        <span className="text-xs font-semibold text-muted flex items-center gap-1.5">
                          <svg
                            xmlns="http://www.w3.org/2000/svg"
                            width="13"
                            height="13"
                            viewBox="0 0 24 24"
                            fill="none"
                            stroke="currentColor"
                            strokeWidth="2"
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            className="text-accent"
                          >
                            <circle cx="12" cy="12" r="10" />
                            <polyline points="12 6 12 12 16 14" />
                          </svg>
                          最近搜索
                        </span>
                        <button
                          type="button"
                          onClick={handleClearRecent}
                          className="text-[0.7rem] text-muted hover:text-accent transition-colors"
                        >
                          全部清空
                        </button>
                      </div>
                      <div className="flex flex-wrap gap-1.5">
                        {recentSearches.map((keyword) => (
                          <div
                            key={keyword}
                            className="group inline-flex items-center gap-1 rounded-full border border-border/80 bg-surface/60 px-2.5 py-1 text-xs text-ink hover:border-accent hover:text-accent transition-colors cursor-pointer"
                            onClick={() => setQuery(keyword)}
                          >
                            <span>{keyword}</span>
                            <button
                              type="button"
                              onClick={(e) => handleRemoveRecent(e, keyword)}
                              className="text-muted/60 hover:text-red-500 transition-colors p-0.5 rounded-full ml-0.5"
                              title="删除此条记录"
                              aria-label={`删除历史记录 ${keyword}`}
                            >
                              <svg
                                xmlns="http://www.w3.org/2000/svg"
                                width="11"
                                height="11"
                                viewBox="0 0 24 24"
                                fill="none"
                                stroke="currentColor"
                                strokeWidth="2.5"
                                strokeLinecap="round"
                                strokeLinejoin="round"
                              >
                                <line x1="18" y1="6" x2="6" y2="18" />
                                <line x1="6" y1="6" x2="18" y2="18" />
                              </svg>
                            </button>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  <div className="py-4 text-center text-muted">
                    <div className="text-2xl mb-2">📌</div>
                    输入关键词在当前文章中即时查找并高亮跳转
                    <div className="mt-2 text-xs text-muted/70">
                      可按{" "}
                      <kbd className="rounded border border-border px-1">
                        Tab
                      </kbd>{" "}
                      切换至全站检索
                    </div>
                  </div>
                </div>
              ) : inArticleResults.length === 0 ? (
                <div className="py-12 text-center text-sm text-muted">
                  当前文章未找到与 “
                  <span className="text-ink font-semibold">{query}</span>”
                  匹配的内容
                  <div className="mt-3">
                    <button
                      type="button"
                      onClick={() => setScope("site-wide")}
                      className="rounded-lg border border-accent/40 bg-accent/10 px-3 py-1.5 text-xs font-medium text-accent hover:bg-accent/20 transition-colors"
                    >
                      切换至全站检索（Tab）
                    </button>
                  </div>
                </div>
              ) : (
                <div className="space-y-1.5">
                  <div className="px-2 py-1 text-xs font-semibold text-muted">
                    在当前文章中找到 {inArticleResults.length} 处匹配：
                  </div>
                  {inArticleResults.map((item, idx) => {
                    const isSelected = selectedIndex === idx;
                    return (
                      <div
                        key={item.id}
                        data-selected={isSelected}
                        onClick={() => selectInArticleItem(item)}
                        onMouseEnter={() => setSelectedIndex(idx)}
                        className={`group flex flex-col gap-1 rounded-xl p-3 cursor-pointer transition-all ${
                          isSelected
                            ? "bg-accent/12 border border-accent/35 text-ink shadow-xs"
                            : "hover:bg-surface-alt/70 border border-transparent text-ink"
                        }`}
                      >
                        <div className="flex items-center gap-2">
                          <span className="rounded-md bg-accent/15 px-2 py-0.5 text-xs font-semibold text-accent">
                            <HighlightText
                              text={item.headingText}
                              query={query}
                            />
                          </span>
                          <span className="text-[0.7rem] text-muted font-mono ml-auto">
                            #{idx + 1}
                          </span>
                        </div>
                        <div className="text-xs text-muted leading-relaxed line-clamp-2 pl-1">
                          <HighlightText text={item.snippet} query={query} />
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </>
          )}

          {/* Site-Wide Mode Results */}
          {scope === "site-wide" && (
            <>
              {isSearching ? (
                <div className="py-12 text-center text-sm text-muted">
                  正在检索全站索引...
                </div>
              ) : !query.trim() ? (
                <div className="py-6 sm:py-8 px-2 space-y-5 text-sm">
                  {recentSearches.length > 0 && (
                    <div>
                      <div className="flex items-center justify-between px-1 mb-2">
                        <span className="text-xs font-semibold text-muted flex items-center gap-1.5">
                          <svg
                            xmlns="http://www.w3.org/2000/svg"
                            width="13"
                            height="13"
                            viewBox="0 0 24 24"
                            fill="none"
                            stroke="currentColor"
                            strokeWidth="2"
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            className="text-accent"
                          >
                            <circle cx="12" cy="12" r="10" />
                            <polyline points="12 6 12 12 16 14" />
                          </svg>
                          最近搜索
                        </span>
                        <button
                          type="button"
                          onClick={handleClearRecent}
                          className="text-[0.7rem] text-muted hover:text-accent transition-colors"
                        >
                          全部清空
                        </button>
                      </div>
                      <div className="flex flex-wrap gap-1.5">
                        {recentSearches.map((keyword) => (
                          <div
                            key={keyword}
                            className="group inline-flex items-center gap-1 rounded-full border border-border/80 bg-surface/60 px-2.5 py-1 text-xs text-ink hover:border-accent hover:text-accent transition-colors cursor-pointer"
                            onClick={() => setQuery(keyword)}
                          >
                            <span>{keyword}</span>
                            <button
                              type="button"
                              onClick={(e) => handleRemoveRecent(e, keyword)}
                              className="text-muted/60 hover:text-red-500 transition-colors p-0.5 rounded-full ml-0.5"
                              title="删除此条记录"
                              aria-label={`删除历史记录 ${keyword}`}
                            >
                              <svg
                                xmlns="http://www.w3.org/2000/svg"
                                width="11"
                                height="11"
                                viewBox="0 0 24 24"
                                fill="none"
                                stroke="currentColor"
                                strokeWidth="2.5"
                                strokeLinecap="round"
                                strokeLinejoin="round"
                              >
                                <line x1="18" y1="6" x2="6" y2="18" />
                                <line x1="6" y1="6" x2="18" y2="18" />
                              </svg>
                            </button>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  <div>
                    <div className="px-1 mb-2 text-xs font-semibold text-muted flex items-center gap-1.5">
                      <svg
                        xmlns="http://www.w3.org/2000/svg"
                        width="13"
                        height="13"
                        viewBox="0 0 24 24"
                        fill="none"
                        stroke="currentColor"
                        strokeWidth="2"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        className="text-accent"
                      >
                        <circle cx="12" cy="12" r="10" />
                        <line x1="12" y1="2" x2="12" y2="6" />
                        <line x1="12" y1="18" x2="12" y2="22" />
                        <line x1="4.93" y1="4.93" x2="7.76" y2="7.76" />
                        <line x1="16.24" y1="16.24" x2="19.07" y2="19.07" />
                        <line x1="2" y1="12" x2="6" y2="12" />
                        <line x1="18" y1="12" x2="22" y2="12" />
                        <line x1="4.93" y1="19.07" x2="7.76" y2="16.24" />
                        <line x1="16.24" y1="7.76" x2="19.07" y2="4.93" />
                      </svg>
                      探索推荐
                    </div>
                    <div className="flex flex-wrap gap-2 text-xs">
                      {[
                        "B-Spline",
                        "SVD",
                        "特征值",
                        "投影",
                        "类型系统",
                        "矩阵逆",
                      ].map((keyword) => (
                        <button
                          key={keyword}
                          type="button"
                          onClick={() => setQuery(keyword)}
                          className="rounded-full border border-border/80 bg-surface/40 px-2.5 py-1 text-muted hover:border-accent hover:text-accent hover:bg-surface transition-colors"
                        >
                          {keyword}
                        </button>
                      ))}
                    </div>
                  </div>
                </div>
              ) : crossResults.length === 0 ? (
                <div className="py-12 text-center text-sm text-muted">
                  全站未找到与 “
                  <span className="text-ink font-semibold">{query}</span>”
                  相关的文章
                </div>
              ) : (
                <div className="space-y-2">
                  <div className="px-2 py-1 text-xs font-semibold text-muted">
                    找到 {crossResults.length} 篇相关文章：
                  </div>
                  {crossResults.map((doc, idx) => {
                    const isSelected = selectedIndex === idx;
                    return (
                      <div
                        key={doc.id}
                        data-selected={isSelected}
                        onMouseEnter={() => setSelectedIndex(idx)}
                        className={`group flex flex-col gap-2 rounded-xl p-3.5 border transition-all cursor-pointer ${
                          isSelected
                            ? "bg-accent/10 border-accent/40 shadow-xs"
                            : "border-border/60 bg-surface/40 hover:bg-surface-alt/70 hover:border-border"
                        }`}
                        onClick={() => {
                          const firstHeading = doc.matchingHeadings?.[0]?.slug;
                          handleSelectCrossResult(doc, firstHeading);
                        }}
                      >
                        <div className="flex items-center gap-2">
                          <span className="rounded-md bg-accent/15 px-2 py-0.5 text-xs font-semibold text-accent">
                            {doc.categoryLabel}
                          </span>
                          <h3 className="text-sm font-bold text-ink group-hover:text-accent transition-colors flex-1 truncate">
                            <HighlightText
                              text={doc.title}
                              query={query}
                              matchedTerms={doc.matchedTerms}
                            />
                          </h3>
                        </div>

                        {doc.previewSnippet && (
                          <p className="text-xs text-muted leading-relaxed line-clamp-2 pl-0.5">
                            <HighlightText
                              text={doc.previewSnippet}
                              query={query}
                              matchedTerms={doc.matchedTerms}
                            />
                          </p>
                        )}

                        {/* Matching Headings Pills */}
                        {doc.matchingHeadings &&
                          doc.matchingHeadings.length > 0 && (
                            <div className="flex flex-wrap items-center gap-1.5 pt-1 border-t border-border/40">
                              <span className="text-[0.7rem] text-muted">
                                命中小节:
                              </span>
                              {doc.matchingHeadings.slice(0, 3).map((h) => {
                                const pillQ = getEffectiveSearchQuery(
                                  query,
                                  doc,
                                );
                                return (
                                  <a
                                    key={h.slug}
                                    href={`/posts/${doc.slug}?q=${encodeURIComponent(pillQ)}#${h.slug}`}
                                    onClick={(e) => {
                                      e.preventDefault();
                                      e.stopPropagation();
                                      handleSelectCrossResult(doc, h.slug);
                                    }}
                                    className="rounded-md border border-border/70 bg-surface px-2 py-0.5 text-[0.7rem] font-medium text-ink hover:border-accent hover:text-accent transition-colors"
                                  >
                                    <HighlightText
                                      text={h.text}
                                      query={query}
                                      matchedTerms={doc.matchedTerms}
                                    />
                                  </a>
                                );
                              })}
                              {doc.matchingHeadings.length > 3 && (
                                <span className="text-[0.65rem] text-muted">
                                  +{doc.matchingHeadings.length - 3} 处
                                </span>
                              )}
                            </div>
                          )}
                      </div>
                    );
                  })}
                </div>
              )}
            </>
          )}
        </div>

        {/* Bottom Keyboard Navigation Hints */}
        <div className="flex items-center justify-between border-t border-border/80 bg-surface-alt/50 px-4 py-2.5 text-[0.7rem] text-muted">
          <div className="flex items-center gap-3">
            <span>
              <kbd className="rounded border border-border bg-surface px-1.5 py-0.5 font-mono">
                ↑
              </kbd>
              <kbd className="rounded border border-border bg-surface px-1.5 py-0.5 font-mono ml-0.5">
                ↓
              </kbd>
              <span className="ml-1">选择</span>
            </span>
            <span>
              <kbd className="rounded border border-border bg-surface px-1.5 py-0.5 font-mono">
                Enter
              </kbd>
              <span className="ml-1">跳转</span>
            </span>
            {isArticle && (
              <span>
                <kbd className="rounded border border-border bg-surface px-1.5 py-0.5 font-mono">
                  Tab
                </kbd>
                <span className="ml-1">切换范围</span>
              </span>
            )}
          </div>
          <span>
            <kbd className="rounded border border-border bg-surface px-1.5 py-0.5 font-mono">
              Esc
            </kbd>
            <span className="ml-1">关闭</span>
          </span>
        </div>
      </div>
    </div>
  );
}
