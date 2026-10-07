import MiniSearch from "minisearch";
import { tokenizeText } from "./tokenizer";
import type {
  CrossArticleResult,
  MatchingHeading,
  SearchIndexDoc,
} from "./types";

let miniSearchInstance: MiniSearch<SearchIndexDoc> | null = null;
let loadingPromise: Promise<MiniSearch<SearchIndexDoc>> | null = null;

/**
 * Lazily initialize and populate the client-side MiniSearch index.
 */
export async function getSearchEngine(): Promise<MiniSearch<SearchIndexDoc>> {
  if (miniSearchInstance) {
    return miniSearchInstance;
  }

  if (loadingPromise) {
    return loadingPromise;
  }

  loadingPromise = (async () => {
    const res = await fetch("/api/search-index.json");
    if (!res.ok) {
      throw new Error(`Failed to load search index: ${res.status}`);
    }

    const docs: SearchIndexDoc[] = await res.json();

    const ms = new MiniSearch<SearchIndexDoc>({
      fields: ["title", "tags", "headingsText", "description", "cleanText"],
      storeFields: [
        "id",
        "slug",
        "title",
        "description",
        "category",
        "categoryLabel",
        "tags",
        "headings",
        "cleanText",
      ],
      searchOptions: {
        boost: {
          title: 10.0,
          tags: 6.0,
          headingsText: 5.0,
          description: 2.0,
          cleanText: 1.0,
        },
        prefix: true,
        combineWith: "AND",
        fuzzy: (term: string) => (term.length >= 4 ? 0.25 : false),
      },
      tokenize: tokenizeText,
    });

    ms.addAll(docs);
    miniSearchInstance = ms;
    return ms;
  })();

  return loadingPromise;
}

/**
 * Pre-warm the search index when user hovers search button or enters idle state
 */
export function prefetchSearchIndex(): void {
  if (!miniSearchInstance && !loadingPromise && typeof window !== "undefined") {
    getSearchEngine().catch(() => {
      // Ignore prefetch failures
    });
  }
}

export function stripDiacritics(str: string): string {
  return str.normalize("NFD").replace(/\p{Diacritic}/gu, "");
}

/**
 * Resolves the effective query string for highlighting and URL navigation:
 * - If the document directly contains the user's query (allowing for diacritic differences),
 *   the raw user query is preserved verbatim.
 * - If the query did not match directly (e.g. user typo such as "bezeir"), returns the
 *   closest canonical matched term from MiniSearch (e.g. "bezier").
 */
export function getEffectiveSearchQuery(
  rawQuery: string,
  doc: {
    title: string;
    cleanText?: string;
    previewSnippet?: string;
    matchingHeadings?: Array<{ text: string }>;
    matchedTerms?: string[];
  },
): string {
  const trimmed = rawQuery.trim();
  if (!trimmed) return "";

  const strippedQ = stripDiacritics(trimmed.toLowerCase());
  const docHaystack = stripDiacritics(
    [
      doc.title,
      doc.cleanText || doc.previewSnippet || "",
      ...(doc.matchingHeadings || []).map((h) => h.text),
    ]
      .join(" ")
      .toLowerCase(),
  );

  if (docHaystack.includes(strippedQ)) {
    return trimmed;
  }

  if (doc.matchedTerms && doc.matchedTerms.length > 0) {
    const sorted = [...doc.matchedTerms].sort(
      (a, b) =>
        Math.abs(a.length - trimmed.length) -
        Math.abs(b.length - trimmed.length),
    );
    return sorted[0];
  }

  return trimmed;
}

/**
 * Extract a highlighted excerpt snippet around the matched keyword
 */
function extractSnippet(text: string, query: string, radius = 50): string {
  if (!text || !query) return "";
  const lowerText = text.toLowerCase();
  const lowerQ = query.trim().toLowerCase();

  let idx = lowerText.indexOf(lowerQ);
  let termLen = lowerQ.length;

  if (idx === -1) {
    const strippedText = stripDiacritics(lowerText);
    const strippedQ = stripDiacritics(lowerQ);
    idx = strippedText.indexOf(strippedQ);
    termLen = strippedQ.length;
  }

  if (idx === -1) {
    return (
      text.slice(0, radius * 2).trim() + (text.length > radius * 2 ? "..." : "")
    );
  }

  const start = Math.max(0, idx - radius);
  const end = Math.min(text.length, idx + termLen + radius);
  const prefix = start > 0 ? "..." : "";
  const suffix = end < text.length ? "..." : "";

  return prefix + text.slice(start, end).trim() + suffix;
}

/**
 * Search across all articles using a two-pass tiered strategy:
 * 1. Primary pass: Exact and prefix matching for high precision (prevents unrelated fuzzy pollution).
 * 2. Secondary fallback pass: Typo tolerance activated only when exact results are empty.
 */
export async function searchCrossArticles(
  query: string,
  categoryFilter?: string,
): Promise<CrossArticleResult[]> {
  const trimmed = query.trim();
  if (!trimmed) {
    return [];
  }

  const engine = await getSearchEngine();

  // Pass 1: High-precision exact & prefix matching
  let rawResults = engine.search(trimmed, {
    prefix: true,
    fuzzy: false,
    combineWith: "AND",
  });

  // Pass 2: Gracefully fallback to typo tolerance only when no exact matches are found
  // Follows Algolia / Meilisearch standard minWordSizeFor1Typo = 4
  if (rawResults.length === 0) {
    rawResults = engine.search(trimmed, {
      prefix: true,
      fuzzy: (term: string) => (term.length >= 4 ? 0.25 : false),
      combineWith: "AND",
    });
  }

  const filtered =
    categoryFilter && categoryFilter !== "all"
      ? rawResults.filter((r) => r.category === categoryFilter)
      : rawResults;

  const results: CrossArticleResult[] = [];

  for (const r of filtered.slice(0, 20)) {
    const doc = r as unknown as SearchIndexDoc;

    // Find specific matching headings in this post
    const lowerQ = trimmed.toLowerCase();
    const strippedQ = stripDiacritics(lowerQ);
    const matchedTerms = r.terms && r.terms.length > 0 ? r.terms : [trimmed];
    const strippedTerms = matchedTerms.map((t) =>
      stripDiacritics(t.toLowerCase()),
    );

    const matchingHeadings: MatchingHeading[] = [];

    if (doc.headings && Array.isArray(doc.headings)) {
      for (const h of doc.headings) {
        const hLower = h.text.toLowerCase();
        const hStripped = stripDiacritics(hLower);

        const isMatch =
          hLower.includes(lowerQ) ||
          hStripped.includes(strippedQ) ||
          matchedTerms.some((t) => hLower.includes(t.toLowerCase())) ||
          strippedTerms.some((t) => hStripped.includes(t));

        if (isMatch) {
          matchingHeadings.push({
            slug: h.slug,
            text: h.text,
          });
        }
      }
    }

    const effectiveTerm = getEffectiveSearchQuery(trimmed, {
      title: doc.title,
      cleanText: doc.cleanText,
      matchingHeadings,
      matchedTerms,
    });
    const previewSnippet = extractSnippet(doc.cleanText, effectiveTerm);

    results.push({
      id: doc.id,
      slug: doc.slug,
      title: doc.title,
      description: doc.description,
      category: doc.category,
      categoryLabel: doc.categoryLabel,
      tags: doc.tags || [],
      score: r.score,
      matchingHeadings,
      previewSnippet,
      matchedTerms,
    });
  }

  return results;
}
