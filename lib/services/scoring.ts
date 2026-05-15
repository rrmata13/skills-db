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

// Category keyword mapping for rule-based matching
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
//   - 1 name phrase (8) beats >15 description-exact tokens (>=8 needed → ≥16 desc tokens)
//   - name exact (4) beats 8 description-exact (=8). Slight desc accumulation OK at exactness.
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

export function computeLexicalScore(query: string, skill: SkillRecord): number {
  const queryTokens = tokenize(query);
  if (queryTokens.length === 0) return 0;

  // Build weighted skill text
  const nameTokens = tokenize(skill.name);
  const descTokens = tokenize(skill.description);
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

export function computeCategoryScore(query: string, skill: SkillRecord): number {
  const queryLower = query.toLowerCase();
  const skillCategories = skill.categories.map((c) => c.category);

  let maxScore = 0;

  for (const [category, keywords] of Object.entries(CATEGORY_KEYWORDS)) {
    const queryMatch = keywords.some((kw) => queryLower.includes(kw));
    if (queryMatch && skillCategories.includes(category)) {
      maxScore = Math.max(maxScore, 1.0);
    } else if (queryMatch) {
      // Check tag overlap
      const skillTags = skill.tags.map((t) => t.tag.toLowerCase());
      const tagOverlap = keywords.filter((kw) =>
        skillTags.some((st) => st.includes(kw))
      ).length;
      maxScore = Math.max(maxScore, Math.min(1, tagOverlap * 0.3));
    }
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
