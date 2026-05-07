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

  for (const qt of queryTokens) {
    // Name match (highest weight)
    if (nameTokens.some((nt) => nt.includes(qt) || qt.includes(nt))) {
      matchScore += 3;
    }
    // Description match
    if (descTokens.some((dt) => dt.includes(qt) || qt.includes(dt))) {
      matchScore += 2;
    }
    // Tag match
    if (tagTokens.some((tt) => tt.includes(qt) || qt.includes(tt))) {
      matchScore += 2;
    }
    // Capability match
    if (capTokens.some((ct) => ct.includes(qt) || qt.includes(ct))) {
      matchScore += 1.5;
    }
    totalWeight += 3 + 2 + 2 + 1.5;
  }

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
