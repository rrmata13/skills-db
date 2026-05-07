import { writeFileSync } from "fs";
import { resolve } from "path";
import { ALL_MOCK_DATA } from "../data/mock-skills";
import {
  SkillRecord,
  computeLexicalScore,
  computeCategoryScore,
  computePopularityScore,
  computeExactMatchBoost,
} from "../lib/services/scoring";
import { SCORING_WEIGHTS_NO_SEMANTIC } from "../lib/constants";
import type { RawSkillData, SourceAdapterResult } from "../types";

type WeightConfig = {
  lexical: number;
  semantic: number;
  category: number;
  popularity: number;
  exactMatch: number;
};

type Query = {
  id: string;
  text: string;
  corpus: "default" | "zero_rating";
};

type ScoreEntry = {
  slug: string;
  lexical: number;
  category: number;
  popularity: number;
  exactMatch: number;
  total: number;
};

type ExpectedQueryResult = {
  query_id: string;
  top10: ScoreEntry[];
};

const SEED = 42;
const TARGET_BASE_COUNT = 251;
const TARGET_SYNTH_COUNT = 500;
const TARGET_TOTAL_COUNT = TARGET_BASE_COUNT + TARGET_SYNTH_COUNT;

const PRODUCTION_WEIGHTS: WeightConfig = SCORING_WEIGHTS_NO_SEMANTIC;
const EXPERIMENT_WEIGHTS: WeightConfig = {
  lexical: 0.55,
  semantic: 0,
  category: 0,
  popularity: 0.12,
  exactMatch: 0.08,
};

function mulberry32(seed: number): () => number {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function pick<T>(rng: () => number, items: readonly T[]): T {
  return items[Math.floor(rng() * items.length)];
}

function reshape(raw: RawSkillData, source: SourceAdapterResult["source"]): SkillRecord {
  const tags = Array.from(new Set([...(raw.tags ?? []), ...(raw.keywords ?? [])]));
  return {
    id: raw.slug ?? `${source.slug}-${raw.name.toLowerCase().replace(/\s+/g, "-")}`,
    name: raw.name,
    slug: raw.slug ?? `${source.slug}-${raw.name.toLowerCase().replace(/\s+/g, "-")}`,
    description: raw.description,
    embeddingText: null,
    rating: raw.rating ?? 0,
    imageUrl: raw.imageUrl ?? null,
    repoUrl: raw.repoUrl ?? null,
    sourceRepository: { name: source.name, author: source.author },
    categories: (raw.categories ?? []).map((category) => ({ category })),
    tags: tags.map((tag) => ({ tag })),
    capabilities: (raw.capabilities ?? []).map((c) => ({ capability: c.capability })),
  };
}

function buildBaseCorpus(): SkillRecord[] {
  const seen = new Set<string>();
  const out: SkillRecord[] = [];
  for (const entry of ALL_MOCK_DATA) {
    for (const skill of entry.skills) {
      const reshaped = reshape(skill, entry.source);
      if (seen.has(reshaped.slug)) continue;
      seen.add(reshaped.slug);
      out.push(reshaped);
    }
  }
  if (out.length !== TARGET_BASE_COUNT) {
    throw new Error(
      `Expected ${TARGET_BASE_COUNT} base skills, got ${out.length}. Adjust TARGET_BASE_COUNT or fix data.`
    );
  }
  return out;
}

const REAL_CATEGORIES = [
  "coding",
  "workflow-automation",
  "chatbot",
  "memory",
  "devops",
  "documentation",
  "knowledge-management",
  "cloud-platform",
  "cli-tooling",
  "multi-agent",
  "skills-collection",
  "integration",
] as const;

const NON_STANDARD_CATEGORIES = [
  "metaverse",
  "blockchain-defi",
  "quantum-computing",
  "biotech",
  "edge-iot",
] as const;

const STOP_WORDS_SAMPLE = [
  "the",
  "and",
  "of",
  "to",
  "with",
  "is",
  "a",
  "an",
  "in",
  "on",
  "for",
  "by",
];

const QUERY_TERMS_FOR_OVERLAP = [
  "wedge",
  "icp",
  "pilot",
  "alembic",
  "centaur",
  "compliance",
  "scaffold",
  "elasticity",
  "vercel",
  "deploy",
  "docker",
  "agent",
  "memory",
  "obsidian",
];

const LOREM = `Lorem ipsum dolor sit amet consectetur adipiscing elit sed do eiusmod tempor incididunt ut labore et dolore magna aliqua ut enim ad minim veniam quis nostrud exercitation ullamco laboris nisi ut aliquip ex ea commodo consequat duis aute irure dolor in reprehenderit in voluptate velit esse cillum dolore eu fugiat nulla pariatur excepteur sint occaecat cupidatat non proident sunt in culpa qui officia deserunt mollit anim id est laborum`.split(" ");

function repeat(arr: string[], n: number): string {
  const out: string[] = [];
  while (out.length < n) out.push(...arr);
  return out.slice(0, n).join(" ");
}

function makeBucket(
  rng: () => number,
  start: number,
  count: number,
  shape: (i: number, rng: () => number) => Partial<RawSkillData> & { name: string }
): SkillRecord[] {
  const out: SkillRecord[] = [];
  const fakeSource = { name: "synth", author: "synth" };
  for (let i = 0; i < count; i++) {
    const idx = start + i;
    const id = `synth-${String(idx).padStart(3, "0")}`;
    const partial = shape(idx, rng);
    const tags = Array.from(new Set([...(partial.tags ?? []), ...(partial.keywords ?? [])]));
    out.push({
      id,
      name: partial.name,
      slug: id,
      description: partial.description ?? "",
      embeddingText: null,
      rating: partial.rating ?? 0,
      imageUrl: null,
      repoUrl: null,
      sourceRepository: fakeSource,
      categories: (partial.categories ?? []).map((category) => ({ category })),
      tags: tags.map((tag) => ({ tag })),
      capabilities: (partial.capabilities ?? []).map((c) => ({ capability: c.capability })),
    });
  }
  return out;
}

function buildSynthCorpus(): SkillRecord[] {
  const rng = mulberry32(SEED);
  const out: SkillRecord[] = [];

  // synth-001..080 (80) hyphen-heavy slugs (3-6 hyphens)
  out.push(
    ...makeBucket(rng, 1, 80, (i, r) => {
      const segs = 4 + Math.floor(r() * 4);
      const name = Array.from({ length: segs }, () => pick(r, QUERY_TERMS_FOR_OVERLAP)).join("-");
      return {
        name,
        description: `Hyphen-heavy synthetic skill ${i} for ${name}`,
        categories: [pick(r, REAL_CATEGORIES)],
        tags: [pick(r, QUERY_TERMS_FOR_OVERLAP), pick(r, REAL_CATEGORIES)],
        rating: Math.floor(r() * 5000),
      };
    })
  );

  // synth-081..140 (60) single-word slugs
  out.push(
    ...makeBucket(rng, 81, 60, (i, r) => ({
      name: pick(r, QUERY_TERMS_FOR_OVERLAP),
      description: `Single-word synthetic ${i}`,
      categories: [pick(r, REAL_CATEGORIES)],
      tags: [pick(r, QUERY_TERMS_FOR_OVERLAP)],
      rating: Math.floor(r() * 3000),
    }))
  );

  // synth-141..190 (50) empty description
  out.push(
    ...makeBucket(rng, 141, 50, (_i, r) => ({
      name: `empty-desc-${pick(r, QUERY_TERMS_FOR_OVERLAP)}`,
      description: "",
      categories: [pick(r, REAL_CATEGORIES)],
      tags: [pick(r, QUERY_TERMS_FOR_OVERLAP)],
      rating: Math.floor(r() * 1000),
    }))
  );

  // synth-191..240 (50) very long description (~500 words)
  out.push(
    ...makeBucket(rng, 191, 50, (i, r) => ({
      name: `long-${i}`,
      description: repeat(LOREM, 500),
      categories: [pick(r, REAL_CATEGORIES)],
      tags: [pick(r, QUERY_TERMS_FOR_OVERLAP), pick(r, QUERY_TERMS_FOR_OVERLAP)],
      rating: Math.floor(r() * 8000),
    }))
  );

  // synth-241..280 (40) empty tag array
  out.push(
    ...makeBucket(rng, 241, 40, (i, r) => ({
      name: `notag-${i}`,
      description: `Skill with no tags ${pick(r, QUERY_TERMS_FOR_OVERLAP)}`,
      categories: [pick(r, REAL_CATEGORIES)],
      tags: [],
      rating: Math.floor(r() * 2000),
    }))
  );

  // synth-281..320 (40) 10+ tags
  out.push(
    ...makeBucket(rng, 281, 40, (i, r) => ({
      name: `manytags-${i}`,
      description: `Skill with many tags ${i}`,
      categories: [pick(r, REAL_CATEGORIES)],
      tags: Array.from({ length: 12 }, () => pick(r, QUERY_TERMS_FOR_OVERLAP)),
      rating: Math.floor(r() * 4000),
    }))
  );

  // synth-321..360 (40) mixed-case slugs
  out.push(
    ...makeBucket(rng, 321, 40, (i, r) => {
      const base = `MiXeD-CaSe-${pick(r, QUERY_TERMS_FOR_OVERLAP)}-${i}`;
      return {
        name: base,
        description: `Mixed case test skill ${i}`,
        categories: [pick(r, REAL_CATEGORIES)],
        tags: [pick(r, QUERY_TERMS_FOR_OVERLAP).toUpperCase()],
        rating: Math.floor(r() * 1000),
      };
    })
  );

  // synth-361..400 (40) leading/trailing hyphen
  out.push(
    ...makeBucket(rng, 361, 40, (i, r) => ({
      name: `-leading-trailing-${i}-`,
      description: `Edge hyphen ${pick(r, QUERY_TERMS_FOR_OVERLAP)}`,
      categories: [pick(r, REAL_CATEGORIES)],
      tags: [`-${pick(r, QUERY_TERMS_FOR_OVERLAP)}-`],
      rating: Math.floor(r() * 500),
    }))
  );

  // synth-401..440 (40) stop-word-heavy
  out.push(
    ...makeBucket(rng, 401, 40, (i, r) => {
      const words = Array.from({ length: 6 }, () => pick(r, STOP_WORDS_SAMPLE));
      return {
        name: words.join(" "),
        description: `${words.join(" ")} ${pick(r, QUERY_TERMS_FOR_OVERLAP)}`,
        categories: [pick(r, REAL_CATEGORIES)],
        tags: words.slice(0, 3),
        rating: Math.floor(r() * 200),
      };
    })
  );

  // synth-441..470 (30) non-standard categories
  out.push(
    ...makeBucket(rng, 441, 30, (i, r) => ({
      name: `nonstd-cat-${i}`,
      description: `Non-standard category skill ${pick(r, QUERY_TERMS_FOR_OVERLAP)}`,
      categories: [pick(r, NON_STANDARD_CATEGORIES)],
      tags: [pick(r, QUERY_TERMS_FOR_OVERLAP)],
      rating: Math.floor(r() * 600),
    }))
  );

  // synth-471..500 (30) substring overlap with query terms
  out.push(
    ...makeBucket(rng, 471, 30, (i, r) => {
      const term = pick(r, QUERY_TERMS_FOR_OVERLAP);
      return {
        name: `${term}-skill-${i}`,
        description: `Skill containing ${term} as a substring overlap`,
        categories: [pick(r, REAL_CATEGORIES)],
        tags: [term, `${term}-pro`, `meta-${term}`],
        rating: Math.floor(r() * 1500),
      };
    })
  );

  if (out.length !== TARGET_SYNTH_COUNT) {
    throw new Error(`Expected ${TARGET_SYNTH_COUNT} synth skills, got ${out.length}.`);
  }
  return out;
}

const CARD_033_QUERIES: string[] = [
  "ICP and wedge definition",
  "Data foundation acquisition path for chosen wedge",
  "10-question customer development interview script",
  "Riskiest assumption identification",
  "Lightweight prototype: manual analysis for 3 cooperating prospects",
  "Wedge feature set (5 features max)",
  "Centaur model boundary specification",
  "Compliance + refused-output specification",
  "Project scaffold + CLAUDE.md persistence",
  "Database schema + Alembic migrations",
  "Analysis engine (segmentation, conversion, elasticity, scenarios, recommendations)",
  "Production deployment (Vercel + Fly.io)",
  "Pilot agreement template (attorney-reviewed)",
  "Per-customer accuracy and outcome tracking",
  "Stable beta exit decision",
];

const EDGE_QUERIES: { id: string; text: string; corpus: Query["corpus"] }[] = [
  { id: "edge-01-empty", text: "", corpus: "default" },
  { id: "edge-02-singlechar", text: "a", corpus: "default" },
  { id: "edge-03-allstopwords", text: "the and of to with", corpus: "default" },
  { id: "edge-04-unicode", text: "日本語 émoji 🚀 résumé", corpus: "default" },
  {
    id: "edge-05-200char",
    text:
      "lorem ipsum dolor sit amet consectetur adipiscing elit sed do eiusmod tempor incididunt ut labore et dolore magna aliqua deploy docker container scaffolding analysis engine pilot agreement compliance memory obsidian agent",
    corpus: "default",
  },
  { id: "edge-06-punct", text: "  ...deploy docker!!!  ", corpus: "default" },
  { id: "edge-07-mixedcase", text: "DePLoY DoCkEr ContaINER", corpus: "default" },
  { id: "edge-08-repeated", text: "docker docker docker docker", corpus: "default" },
  { id: "edge-09-numeric", text: "12345 6789 2024", corpus: "default" },
  { id: "edge-10-hyphen", text: "multi-agent-orchestration-tooling", corpus: "default" },
  { id: "edge-11-gibberish", text: "asdfqwer zxcvbnm", corpus: "default" },
  { id: "edge-12-zerorating", text: "deploy docker container", corpus: "zero_rating" },
];

function buildQueries(): Query[] {
  return [
    ...CARD_033_QUERIES.map((text, i) => ({
      id: `card033-${String(i + 1).padStart(2, "0")}`,
      text,
      corpus: "default" as const,
    })),
    ...EDGE_QUERIES,
  ];
}

function combine(weights: WeightConfig, parts: Omit<ScoreEntry, "slug" | "total">): number {
  return (
    weights.lexical * parts.lexical +
    weights.category * parts.category +
    weights.popularity * parts.popularity +
    weights.exactMatch * parts.exactMatch
  );
}

function scoreCorpus(
  query: string,
  skills: SkillRecord[],
  weights: WeightConfig
): ScoreEntry[] {
  const ratings = skills.map((s) => s.rating);
  const maxRating = ratings.length ? Math.max(...ratings) : 0;
  const entries: ScoreEntry[] = skills.map((skill) => {
    const lexical = computeLexicalScore(query, skill);
    const category = computeCategoryScore(query, skill);
    const popularity = computePopularityScore(skill, maxRating);
    const exactMatch = computeExactMatchBoost(query, skill);
    const total = combine(weights, { lexical, category, popularity, exactMatch });
    return { slug: skill.slug, lexical, category, popularity, exactMatch, total };
  });
  entries.sort((a, b) => b.total - a.total);
  return entries;
}

function applyZeroRating(skills: SkillRecord[]): SkillRecord[] {
  return skills.map((s) => ({ ...s, rating: 0 }));
}

function runOracle(skills: SkillRecord[], queries: Query[], weights: WeightConfig) {
  const out: ExpectedQueryResult[] = [];
  for (const q of queries) {
    const corpus = q.corpus === "zero_rating" ? applyZeroRating(skills) : skills;
    const ranked = scoreCorpus(q.text, corpus, weights);
    out.push({ query_id: q.id, top10: ranked.slice(0, 10) });
  }
  return out;
}

function main() {
  const base = buildBaseCorpus();
  const synth = buildSynthCorpus();
  const all = [...base, ...synth].sort((a, b) => (a.slug < b.slug ? -1 : a.slug > b.slug ? 1 : 0));
  if (all.length !== TARGET_TOTAL_COUNT) {
    throw new Error(`Expected ${TARGET_TOTAL_COUNT} total skills, got ${all.length}.`);
  }

  const queries = buildQueries();

  const corpus = {
    schema_version: 1,
    seed: SEED,
    counts: { base: base.length, synth: synth.length, total: all.length },
    weightConfigs: { production: PRODUCTION_WEIGHTS, experiment: EXPERIMENT_WEIGHTS },
    skills: all,
    queries,
    expected: {
      production: runOracle(all, queries, PRODUCTION_WEIGHTS),
      experiment: runOracle(all, queries, EXPERIMENT_WEIGHTS),
    },
  };

  const outPath = resolve(__dirname, "parity-corpus.json");
  writeFileSync(outPath, JSON.stringify(corpus, null, 2) + "\n", "utf8");
  console.log(
    `Wrote ${outPath}: ${all.length} skills, ${queries.length} queries, 2 weight configs.`
  );
}

main();
