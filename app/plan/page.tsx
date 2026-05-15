"use client";

import { useState } from "react";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { MatchResults } from "@/components/match/match-results";
import { EmptyState } from "@/components/empty-state";
import {
  Map,
  Loader2,
  Download,
  ChevronDown,
  ChevronRight,
  ClipboardList,
  SearchX,
} from "lucide-react";
import type { PlanDecomposition } from "@/types";

const EXAMPLE_PLAN = `1. Set up a multi-platform chatbot infrastructure
2. Integrate with Telegram, Discord, and Slack
3. Add persistent memory for conversation history
4. Deploy to Cloudflare Workers for global availability
5. Set up CI/CD pipeline for automated deployment
6. Create documentation and usage guides`;

export default function PlanPage() {
  const [planText, setPlanText] = useState("");
  const [result, setResult] = useState<PlanDecomposition | null>(null);
  const [submitted, setSubmitted] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [expandedTasks, setExpandedTasks] = useState<Set<number>>(new Set());

  async function handleMatch() {
    if (!planText.trim()) return;
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/match/plan", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ plan: planText, limit: 3 }),
      });
      const data = await res.json();
      if (data.error) throw new Error(data.error);
      setResult(data.data || null);
      setSubmitted(true);
      if (data.data?.tasks?.length > 0) {
        setExpandedTasks(new Set([0]));
      }
    } catch (e) {
      setResult(null);
      setSubmitted(true);
      setError(e instanceof Error ? e.message : "Failed to map plan. Please try again.");
    }
    setLoading(false);
  }

  function toggleTask(position: number) {
    setExpandedTasks((prev) => {
      const next = new Set(prev);
      if (next.has(position)) {
        next.delete(position);
      } else {
        next.add(position);
      }
      return next;
    });
  }

  function handleExport() {
    if (!result) return;
    const blob = new Blob([JSON.stringify(result, null, 2)], {
      type: "application/json",
    });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "skillmapper-plan.json";
    a.click();
    URL.revokeObjectURL(url);
  }

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Map Plan to Skills</h1>
        <p className="text-muted-foreground mt-1">
          Paste a project plan or deliverable description and get a skill
          application roadmap
        </p>
      </div>

      {error && (
        <div className="rounded-lg border border-red-500/30 bg-red-500/10 px-4 py-3 text-sm text-red-400">
          {error}
        </div>
      )}

      <div className="space-y-3">
        <Textarea
          placeholder="Paste your project plan, task list, or deliverable description..."
          value={planText}
          onChange={(e) => setPlanText(e.target.value)}
          className="min-h-[160px] resize-none font-mono text-sm"
        />
        <div className="flex gap-2">
          <Button onClick={handleMatch} disabled={loading || !planText.trim()}>
            {loading ? (
              <Loader2 className="h-4 w-4 animate-spin mr-1" />
            ) : (
              <Map className="h-4 w-4 mr-1" />
            )}
            Map Plan
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={() => setPlanText(EXAMPLE_PLAN)}
            className="text-xs"
          >
            Load Example
          </Button>
        </div>
      </div>

      {!loading && !submitted && !result && (
        <EmptyState
          icon={ClipboardList}
          title="Paste a plan to map it to skills"
          description={
            <>
              Drop in a numbered task list, deliverable description, or rough
              roadmap. We&rsquo;ll break it into steps and rank skills for each
              one. Use <span className="font-medium text-foreground">Load Example</span>{" "}
              to see what comes out.
            </>
          }
        />
      )}

      {!loading && submitted && !error && result && result.tasks.length === 0 && (
        <EmptyState
          icon={SearchX}
          title="Couldn't extract any tasks"
          description="We couldn't break the input into discrete steps. Try a numbered list or short bullet points (one task per line)."
        />
      )}

      {result && result.tasks.length > 0 && (
        <div className="space-y-6">
          {/* Summary */}
          <div className="grid grid-cols-3 gap-4">
            <Card>
              <CardContent className="pt-4 text-center">
                <p className="text-2xl font-bold">{result.summary.totalTasks}</p>
                <p className="text-xs text-muted-foreground">Tasks Identified</p>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="pt-4 text-center">
                <p className="text-2xl font-bold">
                  {result.summary.uniqueSkillsMatched}
                </p>
                <p className="text-xs text-muted-foreground">Skills Matched</p>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="pt-4 text-center">
                <p className="text-2xl font-bold">
                  {Math.round(result.summary.averageConfidence * 100)}%
                </p>
                <p className="text-xs text-muted-foreground">Avg Confidence</p>
              </CardContent>
            </Card>
          </div>

          {/* Task List */}
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-semibold">Skill Application Plan</h2>
            <Button variant="outline" size="sm" onClick={handleExport}>
              <Download className="h-3.5 w-3.5 mr-1" />
              Export JSON
            </Button>
          </div>

          <div className="space-y-3">
            {result.tasks.map((task, idx) => (
              <Card key={idx} className="overflow-hidden">
                <button
                  onClick={() => toggleTask(idx)}
                  className="w-full text-left"
                >
                  <CardHeader className="pb-2">
                    <div className="flex items-start gap-3">
                      <span className="flex h-7 w-7 items-center justify-center rounded-full bg-primary text-primary-foreground text-xs font-bold shrink-0 mt-0.5">
                        {idx + 1}
                      </span>
                      <div className="flex-1 min-w-0">
                        <CardTitle className="text-sm">{task.text}</CardTitle>
                        <div className="flex items-center gap-2 mt-1">
                          {task.predecessors.length > 0 && (
                            <span className="text-[10px] text-muted-foreground">
                              After: Step{" "}
                              {task.predecessors.map((p) => p + 1).join(", ")}
                            </span>
                          )}
                          {task.matches.length > 0 && (
                            <Badge
                              variant="outline"
                              className="text-[10px] px-1.5 py-0"
                            >
                              {task.matches.length} skill
                              {task.matches.length !== 1 ? "s" : ""} matched
                            </Badge>
                          )}
                          {task.matches[0] && (
                            <Badge
                              className={`text-[10px] px-1.5 py-0 ${
                                task.matches[0].score >= 0.7
                                  ? "bg-emerald-500/15 text-emerald-500"
                                  : task.matches[0].score >= 0.4
                                    ? "bg-amber-500/15 text-amber-500"
                                    : "bg-red-500/15 text-red-500"
                              }`}
                            >
                              {Math.round(task.matches[0].score * 100)}% match
                            </Badge>
                          )}
                        </div>
                      </div>
                      {expandedTasks.has(idx) ? (
                        <ChevronDown className="h-4 w-4 text-muted-foreground shrink-0" />
                      ) : (
                        <ChevronRight className="h-4 w-4 text-muted-foreground shrink-0" />
                      )}
                    </div>
                  </CardHeader>
                </button>
                {expandedTasks.has(idx) && (
                  <CardContent className="pt-0 pl-14">
                    <MatchResults results={task.matches} />
                  </CardContent>
                )}
              </Card>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
