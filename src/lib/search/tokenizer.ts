const PUNCTUATION_REGEX =
  /[\p{P}\p{S}\s\u2000-\u206F\u2E00-\u2E7F\\'!"#$%&()*+,\-./:;<=>?@[\]^_`{|}~]/u;

let zhSegmenter: Intl.Segmenter | null = null;
try {
  if (typeof Intl !== "undefined" && "Segmenter" in Intl) {
    zhSegmenter = new Intl.Segmenter("zh-CN", { granularity: "word" });
  }
} catch {
  zhSegmenter = null;
}

/**
 * High-performance multilingual tokenizer tailored for Chinese-English technical terms.
 * Extracts word segments from Intl.Segmenter, and generates overlapping compound n-grams (2~4 chars)
 * for continuous CJK sequences without flooding the index with noisy isolated single characters.
 */
export function tokenizeText(text: string): string[] {
  if (!text) return [];

  const normalized = text.toLowerCase();
  const tokens: string[] = [];

  if (zhSegmenter) {
    for (const segmentObj of zhSegmenter.segment(normalized)) {
      const seg = segmentObj.segment.trim();
      if (!seg || PUNCTUATION_REGEX.test(seg)) {
        continue;
      }
      tokens.push(seg);
    }
  } else {
    const words = normalized.split(PUNCTUATION_REGEX);
    for (const word of words) {
      const trimmed = word.trim();
      if (trimmed) {
        tokens.push(trimmed);
      }
    }
  }

  // Extract consecutive CJK n-grams (lengths 2, 3, 4) to bridge compound technical terms
  // (e.g. bridging Segmenter's split of "特征" + "值" into the unified term "特征值")
  const cjkMatches = normalized.match(/[\p{Script=Han}]+/gu) || [];
  for (const chunk of cjkMatches) {
    const maxLen = Math.min(chunk.length, 4);
    for (let len = 2; len <= maxLen; len++) {
      for (let i = 0; i <= chunk.length - len; i++) {
        tokens.push(chunk.slice(i, i + len));
      }
    }
  }

  return tokens;
}
