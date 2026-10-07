export interface SearchHeading {
  slug: string;
  text: string;
  depth: number;
}

export interface SearchIndexDoc {
  id: string; // post slug (e.g., "visualization/bezier-to-b-spline")
  slug: string;
  title: string;
  description: string;
  category: string; // e.g. "visualization"
  categoryLabel: string; // e.g. "可视化"
  tags: string[];
  date: string;
  headings: SearchHeading[];
  headingsText: string;
  cleanText: string;
}

export interface MatchingHeading {
  slug: string;
  text: string;
  snippet?: string;
}

export interface CrossArticleResult {
  id: string;
  slug: string;
  title: string;
  description: string;
  category: string;
  categoryLabel: string;
  tags: string[];
  score: number;
  matchingHeadings: MatchingHeading[];
  previewSnippet: string;
  matchedTerms: string[];
}

export interface InArticleMatch {
  id: number;
  headingSlug: string;
  headingText: string;
  snippet: string;
  targetElement: HTMLElement;
}
