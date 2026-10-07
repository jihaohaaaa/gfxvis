import { useEffect, useState } from "react";
import {
  applyInArticleHighlights,
  clearInArticleHighlights,
  findInArticleMatches,
  isArticlePage,
  nextInArticleMatch,
  prevInArticleMatch,
} from "../../lib/search/dom-highlighter";

export interface MiniNavigatorState {
  visible: boolean;
  query: string;
  total: number;
  current: number;
}

export default function MiniSearchNavigator() {
  const [navState, setNavState] = useState<MiniNavigatorState>({
    visible: false,
    query: "",
    total: 0,
    current: 0,
  });

  // Handle URL ?q= parameter on initial page load or navigation
  useEffect(() => {
    function checkUrlQuery() {
      if (typeof window === "undefined" || !isArticlePage()) return;

      const urlParams = new URLSearchParams(window.location.search);
      const q = urlParams.get("q");
      if (!q || !q.trim()) return;

      const trimmed = q.trim();
      setTimeout(() => {
        const rawHash = window.location.hash.slice(1);
        const decodedHash = rawHash ? decodeURIComponent(rawHash) : "";
        const matches = findInArticleMatches(trimmed);
        if (matches.length > 0) {
          let targetId = 0;
          if (decodedHash) {
            const found = matches.find(
              (m) =>
                m.headingSlug === decodedHash ||
                m.headingSlug.toLowerCase() === decodedHash.toLowerCase(),
            );
            if (found) {
              targetId = found.id;
            }
          }
          const { total, current } = applyInArticleHighlights(
            trimmed,
            targetId,
          );
          if (total > 0) {
            const firstMarkText =
              document.querySelector<HTMLElement>("mark.gfx-search-mark")
                ?.textContent || trimmed;
            setNavState({
              visible: true,
              query: firstMarkText,
              total,
              current,
            });
          }
        }
      }, 120);
    }

    checkUrlQuery();
    window.addEventListener("popstate", checkUrlQuery);
    return () => window.removeEventListener("popstate", checkUrlQuery);
  }, []);

  useEffect(() => {
    function handleActiveEvent(e: Event) {
      const customEvent = e as CustomEvent<{
        query: string;
        total: number;
        current: number;
      }>;
      if (customEvent.detail && customEvent.detail.total > 0) {
        const firstMarkText =
          document.querySelector<HTMLElement>("mark.gfx-search-mark")
            ?.textContent || customEvent.detail.query;
        setNavState({
          visible: true,
          query: firstMarkText,
          total: customEvent.detail.total,
          current: customEvent.detail.current,
        });
      }
    }

    function handleClearEvent() {
      setNavState((prev) => ({ ...prev, visible: false }));
    }

    window.addEventListener("gfx:in-article-search-active", handleActiveEvent);
    window.addEventListener("gfx:in-article-search-clear", handleClearEvent);

    return () => {
      window.removeEventListener(
        "gfx:in-article-search-active",
        handleActiveEvent,
      );
      window.removeEventListener(
        "gfx:in-article-search-clear",
        handleClearEvent,
      );
    };
  }, []);

  useEffect(() => {
    if (!navState.visible) return;

    function handleKeyDown(e: KeyboardEvent) {
      if (e.key === "Escape") {
        handleClose();
      }
    }

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [navState.visible]);

  if (!navState.visible) {
    return null;
  }

  function handleNext() {
    const res = nextInArticleMatch();
    setNavState((prev) => ({
      ...prev,
      current: res.current,
      total: res.total,
    }));
  }

  function handlePrev() {
    const res = prevInArticleMatch();
    setNavState((prev) => ({
      ...prev,
      current: res.current,
      total: res.total,
    }));
  }

  function handleClose() {
    clearInArticleHighlights();
    setNavState((prev) => ({ ...prev, visible: false }));
    if (typeof window !== "undefined") {
      const url = new URL(window.location.href);
      if (url.searchParams.has("q")) {
        url.searchParams.delete("q");
        window.history.replaceState(null, "", url.toString());
      }
    }
    window.dispatchEvent(new CustomEvent("gfx:in-article-search-clear"));
  }

  return (
    <div
      id="mini-search-navigator"
      className="fixed bottom-6 left-1/2 -translate-x-1/2 z-40 flex items-center gap-2 rounded-2xl border border-border/90 bg-surface/95 px-3.5 py-2 text-xs text-ink shadow-2xl backdrop-blur-xl select-none dark:bg-surface/95 dark:border-border/80"
      role="search"
      aria-label="文章内搜索导航"
    >
      <div className="flex items-center gap-1.5 font-medium text-muted">
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
          className="text-accent"
        >
          <circle cx="11" cy="11" r="8" />
          <line x1="21" y1="21" x2="16.65" y2="16.65" />
        </svg>
        <span
          className="max-w-[120px] truncate text-ink font-semibold"
          title={navState.query}
        >
          “{navState.query}”
        </span>
      </div>

      <span className="rounded-md bg-accent/10 px-1.5 py-0.5 font-mono text-[0.7rem] font-bold text-accent">
        {navState.current} / {navState.total}
      </span>

      <div className="flex items-center gap-1 border-l border-border pl-2">
        <button
          type="button"
          onClick={handlePrev}
          title="上一处"
          className="flex h-6 w-6 cursor-pointer items-center justify-center rounded-lg text-muted transition-colors hover:bg-accent/15 hover:text-accent focus:outline-none focus:ring-1 focus:ring-accent"
          aria-label="上一处"
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
            <polyline points="18 15 12 9 6 15" />
          </svg>
        </button>

        <button
          type="button"
          onClick={handleNext}
          title="下一处"
          className="flex h-6 w-6 cursor-pointer items-center justify-center rounded-lg text-muted transition-colors hover:bg-accent/15 hover:text-accent focus:outline-none focus:ring-1 focus:ring-accent"
          aria-label="下一处"
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
            <polyline points="6 9 12 15 18 9" />
          </svg>
        </button>

        <button
          type="button"
          onClick={handleClose}
          title="清除高亮 (Esc)"
          className="ml-1 flex h-6 w-6 cursor-pointer items-center justify-center rounded-lg text-muted transition-colors hover:bg-red-500/15 hover:text-red-500 focus:outline-none focus:ring-1 focus:ring-red-400"
          aria-label="清除高亮"
        >
          <svg
            xmlns="http://www.w3.org/2000/svg"
            width="13"
            height="13"
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
    </div>
  );
}
