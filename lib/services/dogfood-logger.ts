// SOL-1018 dogfood instrumentation logger.
//
// Captures every match query + per-match results to the local SQLite DB, so the
// founder (and beta users) accumulate real query traffic that the next iteration
// of the matcher can learn from. This is the "Option C" endpoint of the
// SkillMapper Beta Path autonomous plan.
//
// Design choices:
//   - Logging is FIRE-AND-FORGET (try/catch + console.warn on failure). Match
//     latency must NOT be affected by DB hiccups. Worst case: missing rows.
//   - SCORER_VERSION is a const updated by hand on each scorer-contract change
//     (SOL-990, SOL-989, etc.). Future iteration can wire to git SHA at build time.
//   - corpusSha is intentionally null for now. Future iteration: hash skills' updatedAt
//     timestamps or use a dedicated corpus-version table.
//   - LogEntry keys mirror the MatchResult shape so call sites don't need to
//     transform data; logger does the field selection internally.
//   - All logging functions exit early if DOGFOOD_LOG_DISABLED=1 in env (opt-out
//     for beta users who don't want local query logging).

import { prisma } from "@/lib/db";
import type { MatchResult, TaskMatchResult } from "@/types";

// SOL-989: scorer-contract version. Bump whenever scoring.ts changes shape or
// CATEGORY_KEYWORDS / CATEGORY_SYNONYMS change. Used for replay traceability.
export const SCORER_VERSION = "SOL-989-categories-v1";

function isLoggingDisabled(): boolean {
  return process.env.DOGFOOD_LOG_DISABLED === "1";
}

/**
 * Log a single-task query and its match results.
 * Returns the inserted UserQuery.id so callers can attach click-through events.
 * Returns null on any failure (silent — never blocks the match flow).
 */
export async function logSingleTaskQuery(
  rawInput: string,
  results: MatchResult[]
): Promise<string | null> {
  if (isLoggingDisabled()) return null;
  try {
    const userQuery = await prisma.userQuery.create({
      data: {
        rawInput,
        queryType: "single_task",
        scorerVersion: SCORER_VERSION,
        corpusSha: null,
        tasks: {
          create: [
            {
              taskText: rawInput,
              position: 0,
              matches: {
                create: results.map((r, idx) => ({
                  skillId: r.skillId,
                  rank: idx + 1,
                  score: r.score,
                  lexicalScore: r.lexicalScore ?? 0,
                  semanticScore: r.semanticScore ?? 0,
                  ruleScore: r.ruleScore ?? 0,
                  rationale: r.rationale ?? null,
                })),
              },
            },
          ],
        },
      },
      select: { id: true },
    });
    return userQuery.id;
  } catch (err) {
    console.warn("[dogfood-logger] logSingleTaskQuery failed", err);
    return null;
  }
}

/**
 * Log a multi-task query (an array of related tasks scored independently).
 * Persists one UserQuery with N QueryTask rows.
 */
export async function logMultiTaskQuery(
  rawInput: string,
  taskResults: TaskMatchResult[]
): Promise<string | null> {
  if (isLoggingDisabled()) return null;
  try {
    const userQuery = await prisma.userQuery.create({
      data: {
        rawInput,
        queryType: "multi_task",
        scorerVersion: SCORER_VERSION,
        corpusSha: null,
        tasks: {
          create: taskResults.map((tr) => ({
            taskText: tr.taskText,
            position: tr.position,
            matches: {
              create: tr.matches.map((m, idx) => ({
                skillId: m.skillId,
                rank: idx + 1,
                score: m.score,
                lexicalScore: m.lexicalScore ?? 0,
                semanticScore: m.semanticScore ?? 0,
                ruleScore: m.ruleScore ?? 0,
                rationale: m.rationale ?? null,
              })),
            },
          })),
        },
      },
      select: { id: true },
    });
    return userQuery.id;
  } catch (err) {
    console.warn("[dogfood-logger] logMultiTaskQuery failed", err);
    return null;
  }
}

/**
 * Log a plan-decomposition query (each plan-task scored as its own QueryTask).
 */
export async function logPlanQuery(
  rawInput: string,
  planTasks: Array<{ text: string; position: number; matches: MatchResult[] }>
): Promise<string | null> {
  if (isLoggingDisabled()) return null;
  try {
    const userQuery = await prisma.userQuery.create({
      data: {
        rawInput,
        queryType: "plan",
        scorerVersion: SCORER_VERSION,
        corpusSha: null,
        tasks: {
          create: planTasks.map((pt) => ({
            taskText: pt.text,
            position: pt.position,
            matches: {
              create: pt.matches.map((m, idx) => ({
                skillId: m.skillId,
                rank: idx + 1,
                score: m.score,
                lexicalScore: m.lexicalScore ?? 0,
                semanticScore: m.semanticScore ?? 0,
                ruleScore: m.ruleScore ?? 0,
                rationale: m.rationale ?? null,
              })),
            },
          })),
        },
      },
      select: { id: true },
    });
    return userQuery.id;
  } catch (err) {
    console.warn("[dogfood-logger] logPlanQuery failed", err);
    return null;
  }
}

/**
 * Log a click-through event (install, view, copy, uninstall) on a skill.
 *
 * If the use happened in the context of a query, pass userQueryId + optionally
 * queryMatchId so the CTR analysis can attribute the click to a specific rank.
 * Direct browse (no query context) is also valid — just pass skillId.
 */
export async function logSkillUse(args: {
  skillId: string;
  useType: "install" | "view" | "copy" | "uninstall";
  userQueryId?: string | null;
  queryMatchId?: string | null;
  rank?: number | null;
}): Promise<void> {
  if (isLoggingDisabled()) return;
  try {
    await prisma.skillUse.create({
      data: {
        skillId: args.skillId,
        useType: args.useType,
        userQueryId: args.userQueryId ?? null,
        queryMatchId: args.queryMatchId ?? null,
        rank: args.rank ?? null,
      },
    });
  } catch (err) {
    console.warn("[dogfood-logger] logSkillUse failed", err);
  }
}
