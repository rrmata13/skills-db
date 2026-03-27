// ========================
// Ingestion Types
// ========================

export interface RawSkillData {
  name: string;
  slug: string;
  description: string;
  longDescription?: string;
  rawContent?: string;
  imageUrl?: string;
  authorName?: string;
  authorUrl?: string;
  repoUrl?: string;
  rating?: number;
  categories?: string[];
  tags?: string[];
  capabilities?: {
    capability: string;
    inputType?: string;
    outputType?: string;
  }[];
  keywords?: string[];
}

export interface SourceAdapterResult {
  source: {
    slug: string;
    name: string;
    author: string;
    sourceUrl: string;
    githubUrl?: string;
    description: string;
    rating: number;
  };
  skills: RawSkillData[];
}

// ========================
// Matching Types
// ========================

export type QueryType = "single_task" | "multi_task" | "plan" | "deliverable";

export interface MatchRequest {
  query: string;
  filters?: {
    categories?: string[];
    repositories?: string[];
    minRating?: number;
    tags?: string[];
  };
  limit?: number;
}

export interface MatchResult {
  skillId: string;
  skillName: string;
  skillSlug: string;
  description: string;
  sourceRepository: string;
  sourceAuthor: string;
  repoUrl?: string;
  imageUrl?: string;
  categories: string[];
  tags: string[];
  score: number;
  lexicalScore: number;
  semanticScore: number;
  ruleScore: number;
  popularityScore: number;
  rating: number;
  rationale: string;
}

export interface TaskMatchResult {
  taskText: string;
  position: number;
  matches: MatchResult[];
}

export interface PlanDecomposition {
  tasks: PlanTask[];
  summary: {
    totalTasks: number;
    uniqueSkillsMatched: number;
    averageConfidence: number;
  };
}

export interface PlanTask {
  text: string;
  position: number;
  parentPosition?: number;
  predecessors: number[];
  matches: MatchResult[];
}

// ========================
// API Response Types
// ========================

export interface ApiResponse<T> {
  data: T | null;
  error: string | null;
  meta?: {
    total?: number;
    page?: number;
    limit?: number;
    queryType?: QueryType;
  };
}

// ========================
// UI Types
// ========================

export interface SkillWithRelations {
  id: string;
  name: string;
  slug: string;
  description: string;
  longDescription?: string | null;
  rawContent?: string | null;
  imageUrl?: string | null;
  authorName?: string | null;
  authorUrl?: string | null;
  repoUrl?: string | null;
  rating: number;
  confidenceBase: number;
  sourceRepository: {
    id: string;
    name: string;
    author: string;
    sourceUrl: string;
  };
  categories: { category: string }[];
  tags: { tag: string }[];
  capabilities: {
    capability: string;
    inputType?: string | null;
    outputType?: string | null;
  }[];
}

export interface CategoryWithCount {
  slug: string;
  name: string;
  description: string;
  count: number;
}
