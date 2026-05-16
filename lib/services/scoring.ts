import { prisma } from "@/lib/db";
import { tokenize } from "./parser";
import { TfIdfVectorizer } from "./embeddings";
import { SCORING_WEIGHTS_NO_SEMANTIC } from "@/lib/constants";
import { MatchResult } from "@/types";

export interface SkillRecord {
  id: string;
  name: string;
  slug: string;
  description: string;
  embeddingText: string | null;
  rating: number;
  imageUrl: string | null;
  repoUrl: string | null;
  sourceRepository: {
    name: string;
    author: string;
  };
  categories: { category: string }[];
  tags: { tag: string }[];
  capabilities: { capability: string }[];
}

// Category keyword mapping for rule-based matching.
// SOL-989 added 4 new categories (analytics, user-research, product-strategy,
// data-science) to close gaps surfaced by SOL-986 cell-A diagnostic. Codex R6
// (2026-05-15) returned GO_WITH_CHANGES; revised keyword lists below applied.
// All keywords ≥4 chars per SOL-990 AI-3 length discipline (no substring noise).
const CATEGORY_KEYWORDS: Record<string, string[]> = {
  coding: ["code", "programming", "develop", "software", "debug", "refactor", "test", "review"],
  "workflow-automation": ["automate", "workflow", "pipeline", "orchestrate", "schedule", "trigger", "process"],
  chatbot: ["chat", "bot", "conversational", "messaging", "telegram", "discord", "slack"],
  memory: ["memory", "remember", "recall", "context", "persist", "state", "history"],
  devops: ["deploy", "ci", "cd", "docker", "kubernetes", "infrastructure", "pipeline", "container"],
  documentation: ["document", "readme", "docs", "guide", "wiki", "knowledge-base"],
  "knowledge-management": ["obsidian", "notes", "vault", "knowledge", "pkm", "zettelkasten", "graph"],
  "cloud-platform": ["cloud", "serverless", "aws", "azure", "gcp", "cloudflare", "edge", "worker"],
  "cli-tooling": ["cli", "command", "terminal", "shell", "tool", "bash", "zsh"],
  "multi-agent": ["agent", "multi-agent", "orchestrat", "coordinate", "parallel"],
  "skills-collection": ["collection", "curated", "awesome", "list", "directory", "marketplace"],
  integration: ["integrat", "connect", "api", "webhook", "plugin", "connector"],
  // SOL-989 additions (Codex R6 GO_WITH_CHANGES applied):
  analytics: ["analytics", "tracking", "measure", "metric", "instrument", "dashboard", "telemetry", "segment"],
  "user-research": ["interview", "research", "discovery", "feedback", "survey", "ethnography", "persona", "journey"],
  // product-strategy: dropped `wedge` (Card-033 vocab leakage), `validate` (collision risk)
  "product-strategy": ["strategy", "hypothesis", "assumption", "experiment", "positioning", "moat"],
  // data-science: dropped single-token `analysis` (too generic per Codex R6)
  "data-science": ["pandas", "jupyter", "dataframe", "statistic", "regression", "ipynb", "numpy"],
};

async function getAllSkills(): Promise<SkillRecord[]> {
  return prisma.skill.findMany({
    include: {
      sourceRepository: { select: { name: true, author: true } },
      categories: { select: { category: true } },
      tags: { select: { tag: true } },
      capabilities: { select: { capability: true } },
    },
  });
}

// SOL-990 AI-1 — Per Codex R5 verdict (SOL-987):
//   Replace bidirectional substring (`nt.includes(qt) || qt.includes(nt)`) with
//   normalized token overlap + ordered phrase/bigram overlap. Allow prefix/stem
//   behavior ONLY when both tokens are length ≥ 4 (never for stop-word fragments
//   or short noise like `ci`/`cd`/`ai`).
//
// SOL-990 AI-2 — Split lexical fields (Codex R5 Q2): a close slug/name phrase
//   should beat many weak description coincidences. Returns numeric match
//   strength so the caller can weight per-(field, match-type), addressing the
//   "5-15 token noise row accumulates lexical floor" problem.

type MatchStrength = 0 | 1 | 2 | 3;
// 0 = no match
// 1 = safe prefix/stem (both tokens length ≥ 4)
// 2 = exact token equality
// 3 = ordered phrase/bigram (strongest)

function fieldMatchStrength(qt: string, qtNext: string | undefined, fieldTokens: string[]): MatchStrength {
  // 3 = ordered phrase/bigram (strongest signal — adjacent in same order)
  if (qtNext !== undefined) {
    for (let j = 0; j + 1 < fieldTokens.length; j++) {
      if (fieldTokens[j] === qt && fieldTokens[j + 1] === qtNext) return 3;
    }
  }
  // 2 = exact token equality
  if (fieldTokens.includes(qt)) return 2;
  // 1 = safe prefix/stem — only when BOTH tokens length ≥ 4 (Codex R5)
  if (qt.length >= 4) {
    for (const ft of fieldTokens) {
      if (ft.length >= 4 && (ft.startsWith(qt) || qt.startsWith(ft))) {
        return 1;
      }
    }
  }
  return 0;
}

// SOL-990 AI-2: Per-(field, match-type) weights. Calibrated so:
//   - 1 name phrase (8) strictly beats up to 15 desc-exact tokens (ties at 16, loses at ≥17)
//   - 1 name exact (4) strictly beats up to 7 desc-exact tokens (ties at 8, loses at ≥9)
//   - description phrase (3) still meaningful — close phrases in long descriptions count
//   - description prefix (0.25) heavily damped — protects against 5-15 token noise floor
// All weights are deterministic constants; no per-query tuning. AI-5 keeps the
// production weight stack `SCORING_WEIGHTS_NO_SEMANTIC` frozen — these are
// INTRA-lexical sub-weights, not the top-level lexical/semantic/category mix.
const NAME_PHRASE = 8;
const NAME_EXACT = 4;
const NAME_PREFIX = 2;
const TAG_PHRASE = 4;
const TAG_EXACT = 2;
const TAG_PREFIX = 1;
const CAP_PHRASE = 3;
const CAP_EXACT = 1.5;
const CAP_PREFIX = 0.5;
const DESC_PHRASE = 3;
const DESC_EXACT = 0.5;
const DESC_PREFIX = 0.25;
// Max possible per-token contribution = all fields hitting at phrase strength.
const MAX_PER_TOKEN = NAME_PHRASE + DESC_PHRASE + TAG_PHRASE + CAP_PHRASE; // 18

function scoreFromStrength(strength: MatchStrength, phrase: number, exact: number, prefix: number): number {
  if (strength === 3) return phrase;
  if (strength === 2) return exact;
  if (strength === 1) return prefix;
  return 0;
}

// SOL-990 AI-4 — Per Codex R5 verdict (SOL-987) Q4:
//   "First remove source repo/name from lexical scoring unless it is explicitly
//    modeled as metadata."
//
// Source: SOL-852's inferred-description fetcher appended "From {owner/repo}."
// to slugs without real descriptions. Result: the repo token (e.g., `agents` from
// `wshobson/agents`) bleeds into description tokenization and fires categories
// via the safe-prefix path (e.g., `agents` prefix-matches `agent` keyword →
// multi-agent fires on `architecture-patterns`).
//
// Strip the attribution AT SCORING TIME so no DB migration is needed. The
// original description text is preserved in storage for display/audit purposes.
export function stripSourceAttribution(text: string): string {
  if (!text) return text;
  // Pattern 1: trailing "From {owner}/{repo}." or "From {owner}/{repo}"
  // Pattern 2: trailing "From {owner}." or "From {owner}"
  //
  // R6 review hardening: both patterns require capital `From` (case-sensitive)
  // AND a sentence-start anchor `(^|\.\s*)` so legitimate prose ending in
  // lowercase "from {word}." (e.g. "Inherited from upstream.", "Different from
  // competitors.") is not false-stripped. The captured prefix `$1` is re-injected
  // so the preceding sentence's period is preserved.
  return text
    .replace(/(^|\.\s*)From\s+[\w\-]+\/[\w\-]+\.?\s*$/, "$1")
    .replace(/(^|\.\s*)From\s+[\w\-]+\.?\s*$/, "$1")
    .trim();
}

export function computeLexicalScore(query: string, skill: SkillRecord): number {
  const queryTokens = tokenize(query);
  if (queryTokens.length === 0) return 0;

  // Build weighted skill text
  const nameTokens = tokenize(skill.name);
  const descTokens = tokenize(stripSourceAttribution(skill.description)); // AI-4
  const tagTokens = skill.tags.flatMap((t) => tokenize(t.tag));
  const capTokens = skill.capabilities.flatMap((c) => tokenize(c.capability));

  let matchScore = 0;
  let totalWeight = 0;

  for (let i = 0; i < queryTokens.length; i++) {
    const qt = queryTokens[i];
    const qtNext = i + 1 < queryTokens.length ? queryTokens[i + 1] : undefined;

    matchScore += scoreFromStrength(
      fieldMatchStrength(qt, qtNext, nameTokens), NAME_PHRASE, NAME_EXACT, NAME_PREFIX
    );
    matchScore += scoreFromStrength(
      fieldMatchStrength(qt, qtNext, descTokens), DESC_PHRASE, DESC_EXACT, DESC_PREFIX
    );
    matchScore += scoreFromStrength(
      fieldMatchStrength(qt, qtNext, tagTokens), TAG_PHRASE, TAG_EXACT, TAG_PREFIX
    );
    matchScore += scoreFromStrength(
      fieldMatchStrength(qt, qtNext, capTokens), CAP_PHRASE, CAP_EXACT, CAP_PREFIX
    );
    totalWeight += MAX_PER_TOKEN;
  }

  // Cap divisor multiplier (0.3) preserved from pre-AI-2 — Codex R5 flagged this
  // as heuristic but said "do not lower the ship gate; fix scoring calibration."
  // The recalibration is the per-field weights above; the 0.3 stays so absolute
  // score magnitudes remain in the same ballpark as pre-AI-2 (single strong name
  // match still saturates near 1.0).
  return Math.min(1, matchScore / (totalWeight * 0.3));
}

function computeSemanticScore(
  queryVector: number[],
  skillVector: number[],
  vectorizer: TfIdfVectorizer
): number {
  return vectorizer.cosineSimilarity(queryVector, skillVector);
}

// SOL-990 AI-3 — Per Codex R5 verdict (SOL-987) Q3:
//   "Add a deterministic query-to-category classifier using broader phrase rules
//    and curated domain synonyms, then optionally back it with embeddings later."
//
// Replaces the inline `keywords.some((kw) => queryLower.includes(kw))` substring
// match at scoring.ts:96-117 with `detectQueryCategories()`. Key rules:
//   - Minimum keyword length ≥ 4 to participate via prefix/stem path
//   - Keywords < 4 chars (ci, cd, ai, bot, etc.) match ONLY via exact token equality
//     — no substring games. Eliminates the SOL-986 false-positive `ci` matching
//     `speCIfication`, `tool` matching generic "AI tool", `bot` matching "robotic",
//     `cd` matching "academic".
//   - Optional CATEGORY_SYNONYMS adds bigram phrase rules — e.g., "unit test" →
//     coding even though neither token alone strongly signals coding.
//
// NO LLM call (per Codex R5 — "smallest revision is not full embeddings everywhere").
// NO substring on short fragments (per Codex R5 Q1).

// Synonym bigrams. SOL-989 (Codex R6 GO_WITH_CHANGES) added 4 new entries:
// analytics, user-research, product-strategy, data-science. Founder may further
// expand in future iterations.
// Each entry: [token1, token2] — must appear adjacent in query (ordered) to fire.
const CATEGORY_SYNONYMS: Record<string, string[][]> = {
  coding: [["unit", "test"], ["code", "review"], ["bug", "fix"], ["pull", "request"], ["lint", "format"]],
  "workflow-automation": [["github", "actions"], ["zapier", "make"], ["cron", "job"]],
  chatbot: [["customer", "support"], ["slack", "thread"]],
  memory: [["short", "term"], ["long", "term"], ["working", "memory"]],
  devops: [["ci", "cd"], ["docker", "compose"], ["kubernetes", "cluster"], ["github", "actions"]],
  documentation: [["api", "docs"], ["read", "me"], ["release", "notes"]],
  "knowledge-management": [["second", "brain"], ["personal", "knowledge"], ["zettel", "kasten"]],
  "cloud-platform": [["aws", "lambda"], ["cloudflare", "workers"], ["serverless", "function"]],
  "cli-tooling": [["command", "line"], ["shell", "script"]],
  "multi-agent": [["multi", "agent"], ["agent", "swarm"], ["agent", "coordination"]],
  "skills-collection": [["awesome", "list"], ["curated", "list"]],
  integration: [["webhook", "url"], ["api", "client"], ["third", "party"]],
  // SOL-989 additions (Codex R6 GO_WITH_CHANGES applied):
  analytics: [["event", "tracking"], ["conversion", "rate"], ["tag", "manager"], ["user", "behavior"], ["product", "metrics"]],
  "user-research": [["user", "research"], ["user", "interview"], ["customer", "interview"], ["user", "feedback"], ["nps", "responses"], ["jobs", "done"]],
  // product-strategy: dropped `["icp", "definition"]` (Card-033 vocab), `["validate", "assumption"]` (validate kw dropped), `["go", "market"]` (replaced with product-launch per Codex)
  "product-strategy": [["product", "strategy"], ["product", "launch"], ["risky", "assumption"], ["product", "hypothesis"]],
  // data-science: dropped `["data", "analysis"]`, `["statistical", "analysis"]` (analysis kw dropped per Codex)
  "data-science": [["jupyter", "notebook"], ["pandas", "dataframe"], ["time", "series"], ["csv", "import"]],
};

export function detectQueryCategories(query: string): string[] {
  const queryTokens = tokenize(query);
  if (queryTokens.length === 0) return [];

  const fired = new Set<string>();

  // Path 1: single-keyword matches with length discipline.
  for (const [category, keywords] of Object.entries(CATEGORY_KEYWORDS)) {
    for (const kw of keywords) {
      const kwLower = kw.toLowerCase();
      if (kwLower.length < 4) {
        // Short keywords must match exactly (no substring/prefix games).
        if (queryTokens.includes(kwLower)) {
          fired.add(category);
          break;
        }
        continue;
      }
      // Long keywords: exact OR safe prefix (both tokens length ≥ 4).
      let matched = false;
      for (const qt of queryTokens) {
        if (qt === kwLower) { matched = true; break; }
        if (qt.length >= 4 && (qt.startsWith(kwLower) || kwLower.startsWith(qt))) {
          matched = true; break;
        }
      }
      if (matched) {
        fired.add(category);
        break;
      }
    }
  }

  // Path 2: bigram phrase synonyms (ordered, adjacent in query).
  for (const [category, phrases] of Object.entries(CATEGORY_SYNONYMS)) {
    for (const phrase of phrases) {
      if (phrase.length !== 2) continue; // bigram-only for now; SOL-989 may extend
      const [w1, w2] = phrase.map((w) => w.toLowerCase());
      for (let i = 0; i + 1 < queryTokens.length; i++) {
        if (queryTokens[i] === w1 && queryTokens[i + 1] === w2) {
          fired.add(category);
          break;
        }
      }
      if (fired.has(category)) break;
    }
  }

  return Array.from(fired);
}

export function computeCategoryScore(query: string, skill: SkillRecord): number {
  const queryCategories = detectQueryCategories(query);
  if (queryCategories.length === 0) return 0;

  const skillCategorySet = new Set(skill.categories.map((c) => c.category));
  const skillTagsLower = skill.tags.map((t) => t.tag.toLowerCase());

  let maxScore = 0;
  for (const category of queryCategories) {
    if (skillCategorySet.has(category)) {
      maxScore = Math.max(maxScore, 1.0);
      continue;
    }
    // Tag-overlap fallback — same length discipline as detectQueryCategories.
    // Count category keywords (len ≥ 4) that appear in skill tags via exact or
    // safe-prefix match (no substring on short fragments).
    const keywords = CATEGORY_KEYWORDS[category] ?? [];
    let tagOverlap = 0;
    for (const kw of keywords) {
      if (kw.length < 4) continue; // short kws don't participate in tag fallback
      const kwLower = kw.toLowerCase();
      let hit = false;
      for (const tag of skillTagsLower) {
        const tagTokens = tag.split(/[^a-z0-9]+/).filter((t) => t.length > 1);
        for (const tt of tagTokens) {
          if (tt === kwLower || (tt.length >= 4 && (tt.startsWith(kwLower) || kwLower.startsWith(tt)))) {
            hit = true;
            break;
          }
        }
        if (hit) break;
      }
      if (hit) tagOverlap++;
    }
    maxScore = Math.max(maxScore, Math.min(1, tagOverlap * 0.3));
  }

  return maxScore;
}

export function computePopularityScore(skill: SkillRecord, maxRating: number): number {
  if (maxRating === 0) return 0;
  return Math.log(skill.rating + 1) / Math.log(maxRating + 1);
}

export function computeExactMatchBoost(query: string, skill: SkillRecord): number {
  const queryLower = query.toLowerCase();
  const nameLower = skill.name.toLowerCase();

  if (nameLower === queryLower) return 1.0;
  if (nameLower.includes(queryLower) || queryLower.includes(nameLower)) return 0.5;

  // Check for exact tag match
  if (skill.tags.some((t) => t.tag.toLowerCase() === queryLower)) return 0.7;

  return 0;
}

function generateRationale(
  query: string,
  skill: SkillRecord,
  scores: { lexical: number; semantic: number; category: number; popularity: number; exactMatch: number }
): string {
  const reasons: string[] = [];

  if (scores.exactMatch > 0.3) {
    reasons.push(`Strong name/tag match with "${skill.name}"`);
  }

  if (scores.lexical > 0.3) {
    const queryTokens = tokenize(query);
    const matchingTags = skill.tags
      .filter((t) => queryTokens.some((qt) => t.tag.toLowerCase().includes(qt)))
      .map((t) => t.tag);
    if (matchingTags.length) {
      reasons.push(`Keyword overlap with tags: ${matchingTags.slice(0, 3).join(", ")}`);
    } else {
      reasons.push("Description matches query keywords");
    }
  }

  if (scores.category > 0.5) {
    reasons.push(`Category match: ${skill.categories.map((c) => c.category).join(", ")}`);
  }

  if (scores.semantic > 0.3) {
    reasons.push("High semantic similarity to query");
  }

  if (scores.popularity > 0.5) {
    reasons.push(`Popular skill (${skill.rating.toLocaleString()} stars)`);
  }

  if (reasons.length === 0) {
    reasons.push("Partial match based on skill capabilities");
  }

  return reasons.join(". ") + ".";
}

export async function scoreSkills(
  query: string,
  filters?: {
    categories?: string[];
    repositories?: string[];
    minRating?: number;
    tags?: string[];
  },
  limit = 10
): Promise<MatchResult[]> {
  let skills = await getAllSkills();

  // Apply filters
  if (filters?.categories?.length) {
    skills = skills.filter((s) =>
      s.categories.some((c) => filters.categories!.includes(c.category))
    );
  }
  if (filters?.repositories?.length) {
    skills = skills.filter((s) =>
      filters.repositories!.includes(s.sourceRepository.name)
    );
  }
  if (filters?.minRating) {
    skills = skills.filter((s) => s.rating >= filters.minRating!);
  }
  if (filters?.tags?.length) {
    skills = skills.filter((s) =>
      s.tags.some((t) => filters.tags!.includes(t.tag))
    );
  }

  if (skills.length === 0) return [];

  // Build TF-IDF vectorizer
  const vectorizer = new TfIdfVectorizer();
  for (const skill of skills) {
    vectorizer.addDocument(skill.embeddingText || skill.description);
  }
  vectorizer.addDocument(query);
  vectorizer.build();

  const queryVector = vectorizer.vectorize(query);
  const maxRating = Math.max(...skills.map((s) => s.rating));

  const weights = SCORING_WEIGHTS_NO_SEMANTIC;

  const results: MatchResult[] = skills.map((skill) => {
    const skillVector = vectorizer.vectorize(
      skill.embeddingText || skill.description
    );

    const lexicalScore = computeLexicalScore(query, skill);
    const semanticScore = computeSemanticScore(queryVector, skillVector, vectorizer);
    const categoryScore = computeCategoryScore(query, skill);
    const popularityScore = computePopularityScore(skill, maxRating);
    const exactMatchBoost = computeExactMatchBoost(query, skill);

    const score =
      weights.lexical * lexicalScore +
      weights.semantic * semanticScore +
      weights.category * categoryScore +
      weights.popularity * popularityScore +
      weights.exactMatch * exactMatchBoost;

    const scores = {
      lexical: lexicalScore,
      semantic: semanticScore,
      category: categoryScore,
      popularity: popularityScore,
      exactMatch: exactMatchBoost,
    };

    return {
      skillId: skill.id,
      skillName: skill.name,
      skillSlug: skill.slug,
      description: skill.description,
      sourceRepository: skill.sourceRepository.name,
      sourceAuthor: skill.sourceRepository.author,
      repoUrl: skill.repoUrl || undefined,
      imageUrl: skill.imageUrl || undefined,
      categories: skill.categories.map((c) => c.category),
      tags: skill.tags.map((t) => t.tag),
      score: Math.round(score * 1000) / 1000,
      lexicalScore: Math.round(lexicalScore * 1000) / 1000,
      semanticScore: Math.round(semanticScore * 1000) / 1000,
      ruleScore: Math.round(categoryScore * 1000) / 1000,
      popularityScore: Math.round(popularityScore * 1000) / 1000,
      rating: skill.rating,
      rationale: generateRationale(query, skill, scores),
    };
  });

  // Sort by score descending
  results.sort((a, b) => b.score - a.score);

  return results.slice(0, limit);
}
