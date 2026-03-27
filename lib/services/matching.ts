import { classifyInput } from "./classifier";
import { parseMultipleTasks, parsePlan } from "./parser";
import { scoreSkills } from "./scoring";
import { MatchResult, TaskMatchResult, PlanDecomposition, QueryType } from "@/types";

export async function matchSingleTask(
  query: string,
  filters?: {
    categories?: string[];
    repositories?: string[];
    minRating?: number;
    tags?: string[];
  },
  limit = 5
): Promise<{ results: MatchResult[]; queryType: QueryType }> {
  const results = await scoreSkills(query, filters, limit);
  return { results, queryType: "single_task" };
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
): Promise<{ results: TaskMatchResult[]; queryType: QueryType }> {
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

  return { results, queryType: "multi_task" };
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
): Promise<PlanDecomposition> {
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

  return {
    tasks: planTasks,
    summary: {
      totalTasks: planTasks.length,
      uniqueSkillsMatched: allSkillIds.size,
      averageConfidence: Math.round(avgConfidence * 1000) / 1000,
    },
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
