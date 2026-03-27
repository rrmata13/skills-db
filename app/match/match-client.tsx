"use client";

import { useState, useEffect } from "react";
import { useSearchParams } from "next/navigation";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { MatchResults } from "@/components/match/match-results";
import { Zap, List, Loader2 } from "lucide-react";
import type { MatchResult, TaskMatchResult } from "@/types";

export function MatchClient() {
  const searchParams = useSearchParams();
  const initialQuery = searchParams.get("q") || "";

  const [singleQuery, setSingleQuery] = useState(initialQuery);
  const [multiQuery, setMultiQuery] = useState("");
  const [singleResults, setSingleResults] = useState<MatchResult[]>([]);
  const [multiResults, setMultiResults] = useState<TaskMatchResult[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState("single");

  useEffect(() => {
    if (initialQuery) {
      handleSingleMatch(initialQuery);
    }
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  async function handleSingleMatch(query?: string) {
    const q = query || singleQuery;
    if (!q.trim()) return;
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/match/task", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ query: q, limit: 10 }),
      });
      const data = await res.json();
      if (data.error) throw new Error(data.error);
      setSingleResults(data.data?.results || []);
    } catch (e) {
      setSingleResults([]);
      setError(e instanceof Error ? e.message : "Failed to match task. Please try again.");
    }
    setLoading(false);
  }

  async function handleMultiMatch() {
    if (!multiQuery.trim()) return;
    setLoading(true);
    setError(null);
    try {
      const queries = multiQuery
        .split("\n")
        .map((l) => l.replace(/^[\d]+[.)]\s*/, "").replace(/^[-*+•]\s*/, "").trim())
        .filter(Boolean);
      const res = await fetch("/api/match/tasks", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ queries, limit: 5 }),
      });
      const data = await res.json();
      if (data.error) throw new Error(data.error);
      setMultiResults(data.data?.results || []);
    } catch (e) {
      setMultiResults([]);
      setError(e instanceof Error ? e.message : "Failed to match tasks. Please try again.");
    }
    setLoading(false);
  }

  return (
    <div className="max-w-3xl mx-auto space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Match Tasks to Skills</h1>
        <p className="text-muted-foreground mt-1">
          Describe your task and find the best matching AI skills
        </p>
      </div>

      {error && (
        <div className="rounded-lg border border-red-500/30 bg-red-500/10 px-4 py-3 text-sm text-red-400">
          {error}
        </div>
      )}

      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList>
          <TabsTrigger value="single" className="gap-1.5">
            <Zap className="h-3.5 w-3.5" />
            Single Task
          </TabsTrigger>
          <TabsTrigger value="multi" className="gap-1.5">
            <List className="h-3.5 w-3.5" />
            Multiple Tasks
          </TabsTrigger>
        </TabsList>

        <TabsContent value="single" className="space-y-4 mt-4">
          <form
            onSubmit={(e) => {
              e.preventDefault();
              handleSingleMatch();
            }}
            className="space-y-3"
          >
            <Textarea
              placeholder="Describe your task... e.g., 'Build a chatbot that works on Telegram and Discord'"
              value={singleQuery}
              onChange={(e) => setSingleQuery(e.target.value)}
              className="min-h-[80px] resize-none"
            />
            <Button type="submit" disabled={loading || !singleQuery.trim()}>
              {loading ? (
                <Loader2 className="h-4 w-4 animate-spin mr-1" />
              ) : (
                <Zap className="h-4 w-4 mr-1" />
              )}
              Find Matching Skills
            </Button>
          </form>

          {singleResults.length > 0 && (
            <MatchResults results={singleResults} title={`Results for: "${singleQuery}"`} />
          )}
        </TabsContent>

        <TabsContent value="multi" className="space-y-4 mt-4">
          <form
            onSubmit={(e) => {
              e.preventDefault();
              handleMultiMatch();
            }}
            className="space-y-3"
          >
            <Textarea
              placeholder={`Enter one task per line:\n- Build a chatbot\n- Set up CI/CD pipeline\n- Create documentation`}
              value={multiQuery}
              onChange={(e) => setMultiQuery(e.target.value)}
              className="min-h-[120px] resize-none font-mono text-sm"
            />
            <Button type="submit" disabled={loading || !multiQuery.trim()}>
              {loading ? (
                <Loader2 className="h-4 w-4 animate-spin mr-1" />
              ) : (
                <List className="h-4 w-4 mr-1" />
              )}
              Match All Tasks
            </Button>
          </form>

          {multiResults.length > 0 && (
            <div className="space-y-8">
              {multiResults.map((task, idx) => (
                <div key={idx}>
                  <div className="flex items-center gap-2 mb-3">
                    <span className="flex h-6 w-6 items-center justify-center rounded-full bg-primary text-primary-foreground text-xs font-bold">
                      {idx + 1}
                    </span>
                    <h3 className="text-sm font-medium">{task.taskText}</h3>
                  </div>
                  <MatchResults results={task.matches} />
                </div>
              ))}
            </div>
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
}
