/**
 * Technique-family dedup helpers.
 * Near-duplicate tutorials (goal-loop clones, PDF-extraction clones) share one family key.
 */

const STOP = new Set([
  "a",
  "an",
  "the",
  "and",
  "or",
  "of",
  "for",
  "to",
  "in",
  "on",
  "with",
  "using",
  "via",
  "from",
  "into",
  "ai",
  "llm",
  "econ",
  "economic",
  "economics",
  "economist",
  "economists",
  "research",
  "tutorial",
  "new",
  "how",
  "based",
]);

/** Known alias map → canonical family. Keys are hyphenated token phrases. */
const FAMILY_ALIASES: Record<string, string> = {
  "goal-loop": "goal-loop",
  "loops-goal": "goal-loop",
  "goal-loops": "goal-loop",
  "claude-goal-loop": "goal-loop",
  "goal-for-economic": "goal-loop",
  "goal-loop-economics": "goal-loop",
  "goal-loop-econ": "goal-loop",
  "structured-pdf": "pdf-structured-extraction",
  "pdf-extraction": "pdf-structured-extraction",
  "structured-pdf-extraction": "pdf-structured-extraction",
  "pdf-mcp": "pdf-structured-extraction",
  "document-extraction": "document-extraction",
  "corporate-governance-document-extraction": "document-extraction",
  "multimodal-chart-extraction": "chart-extraction",
  "chart-extraction": "chart-extraction",
  "hybrid-probabilistic-forecasting": "probabilistic-forecasting",
  "probabilistic-forecasting": "probabilistic-forecasting",
  "llm-randomness-reproducibility": "llm-reproducibility",
  "agentic-economic-modeling": "agentic-modeling",
  "agentic-modeling": "agentic-modeling",
};

export function slugifyTopic(topic: string): string {
  return topic
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .replace(/-+/g, "-");
}

export function tokenizeTechnique(text: string): string[] {
  return slugifyTopic(text)
    .split("-")
    .filter((t) => t.length > 1 && !STOP.has(t));
}

/**
 * Collapse a topic/title/repo slug into a stable technique family id.
 * Used for discovery dedup and near-match publish routing.
 */
export function techniqueFamily(text: string): string {
  const slug = slugifyTopic(text).replace(/^econ-ai-/, "");
  if (FAMILY_ALIASES[slug]) return FAMILY_ALIASES[slug];

  // Prefer longest alias that is a substring of the slug (token-boundary aware).
  let best: { alias: string; family: string } | null = null;
  for (const [alias, family] of Object.entries(FAMILY_ALIASES)) {
    if (slug === alias || slug.includes(alias)) {
      if (!best || alias.length > best.alias.length) {
        best = { alias, family };
      }
    }
  }
  if (best) return best.family;

  const tokens = tokenizeTechnique(slug);
  if (tokens.length === 0) return slug || "unknown";

  // Compact to first 3 informative tokens.
  return tokens.slice(0, 3).join("-");
}

/** Jaccard similarity on technique tokens. */
export function tokenSimilarity(a: string, b: string): number {
  const ta = new Set(tokenizeTechnique(a));
  const tb = new Set(tokenizeTechnique(b));
  if (ta.size === 0 && tb.size === 0) return 1;
  if (ta.size === 0 || tb.size === 0) return 0;
  let inter = 0;
  for (const t of ta) if (tb.has(t)) inter += 1;
  const union = ta.size + tb.size - inter;
  return inter / union;
}

/** True when two topics are the same technique family or near-match slugs. */
export function isNearDuplicate(
  a: string,
  b: string,
  opts: { similarityThreshold?: number } = {},
): boolean {
  const threshold = opts.similarityThreshold ?? 0.5;
  if (techniqueFamily(a) === techniqueFamily(b)) return true;
  return tokenSimilarity(a, b) >= threshold;
}

export function findNearMatch(
  candidate: string,
  existing: readonly string[],
  opts?: { similarityThreshold?: number },
): string | undefined {
  return existing.find((item) => isNearDuplicate(candidate, item, opts));
}
