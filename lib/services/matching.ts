import { classifyInput } from "./classifier";
import { parseMultipleTasks, parsePlan } from "./parser";
import { scoreSkills } from "./scoring";
import { logSingleTaskQuery, logMultiTaskQuery, logPlanQuery } from "./dogfood-logger";
import { MatchResult, TaskMatchResult, PlanDecomposition, QueryType } from "@/types";

// SOL-1018: every match function persists the query + per-match results to the
// local SQLite DB for dogfood analysis. Returns a `dogfoodQueryId` so callers
// (API routes) can attach click-through events later via logSkillUse().
// Persistence is fire-and-forget — failures are logged to console.warn but never
// block the match response.

export async function matchSingleTask(
  query: string,
  filters?: {
    categories?: string[];
    repositories?: string[];
    minRating?: number;
    tags?: string[];
  },
  limit = 5
): Promise<{ results: MatchResult[]; queryType: QueryType; dogfoodQueryId: string | null }> {
  const results = await scoreSkills(query, filters, limit);
  const dogfoodQueryId = await logSingleTaskQuery(query, results);
  return { results, queryType: "single_task", dogfoodQueryId };
}

export async function matchMultipleTasks(
  queries: string[],
  filters?: {
    categories?: string[];
    repositories?: string[];
    minRating?: number;
    tags?: string[];
  },
  limit = 5
): Promise<{ results: TaskMatchResult[]; queryType: QueryType; dogfoodQueryId: string | null }> {
  const results: TaskMatchResult[] = [];

  for (let i = 0; i < queries.length; i++) {
    const taskText = queries[i].trim();
    if (!taskText) continue;

    const matches = await scoreSkills(taskText, filters, limit);
    results.push({
      taskText,
      position: i,
      matches,
    });
  }

  const dogfoodQueryId = await logMultiTaskQuery(queries.join("\n"), results);
  return { results, queryType: "multi_task", dogfoodQueryId };
}

export async function matchPlan(
  planText: string,
  filters?: {
    categories?: string[];
    repositories?: string[];
    minRating?: number;
    tags?: string[];
  },
  limit = 3
): Promise<PlanDecomposition & { dogfoodQueryId: string | null }> {
  const tasks = parsePlan(planText);
  const allSkillIds = new Set<string>();

  const planTasks = await Promise.all(
    tasks.map(async (task) => {
      const matches = await scoreSkills(task.text, filters, limit);
      matches.forEach((m) => allSkillIds.add(m.skillId));
      return {
        text: task.text,
        position: task.position,
        parentPosition: task.parentPosition,
        predecessors: task.predecessors,
        matches,
      };
    })
  );

  const allScores = planTasks.flatMap((t) => t.matches.map((m) => m.score));
  const avgConfidence =
    allScores.length > 0
      ? allScores.reduce((a, b) => a + b, 0) / allScores.length
      : 0;

  const dogfoodQueryId = await logPlanQuery(planText, planTasks);

  return {
    tasks: planTasks,
    summary: {
      totalTasks: planTasks.length,
      uniqueSkillsMatched: allSkillIds.size,
      averageConfidence: Math.round(avgConfidence * 1000) / 1000,
    },
    dogfoodQueryId,
  };
}

export async function matchAuto(
  input: string,
  filters?: {
    categories?: string[];
    repositories?: string[];
    minRating?: number;
    tags?: string[];
  }
): Promise<{
  queryType: QueryType;
  results?: MatchResult[];
  taskResults?: TaskMatchResult[];
  plan?: PlanDecomposition;
}> {
  const queryType = classifyInput(input);

  switch (queryType) {
    case "single_task": {
      const { results } = await matchSingleTask(input, filters);
      return { queryType, results };
    }
    case "multi_task": {
      const tasks = parseMultipleTasks(input);
      const { results } = await matchMultipleTasks(
        tasks.map((t) => t.text),
        filters
      );
      return { queryType, taskResults: results };
    }
    case "plan":
    case "deliverable": {
      const plan = await matchPlan(input, filters);
      return { queryType, plan };
    }
  }
}
