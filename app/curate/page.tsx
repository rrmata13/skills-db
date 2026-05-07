"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { CurateSkillCard } from "./skill-card";
import type { SkillWithRelations, CurationStats } from "@/types";

const FILTERS = [
  { value: "all", label: "All" },
  { value: "unreviewed", label: "Unreviewed" },
  { value: "favorited", label: "Favorited" },
  { value: "installed", label: "Installed" },
  { value: "hidden", label: "Hidden" },
] as const;

type FilterValue = (typeof FILTERS)[number]["value"];

export default function CuratePage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const initialStatus = (searchParams.get("status") as FilterValue) || "all";

  const [filter, setFilter] = useState<FilterValue>(initialStatus);
  const [q, setQ] = useState("");
  const [skills, setSkills] = useState<SkillWithRelations[]>([]);
  const [stats, setStats] = useState<CurationStats | null>(null);
  const [loading, setLoading] = useState(false);
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);

  const limit = 24;

  const fetchSkills = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (filter !== "all") params.set("status", filter);
      if (q.trim()) params.set("q", q.trim());
      params.set("page", String(page));
      params.set("limit", String(limit));
      const res = await fetch(`/api/skills?${params}`);
      const data = await res.json();
      setSkills(data.data || []);
      setTotal(data.meta?.total || 0);
    } finally {
      setLoading(false);
    }
  }, [filter, q, page]);

  const fetchStats = useCallback(async () => {
    try {
      const res = await fetch("/api/curate/stats");
      const data = await res.json();
      setStats(data.data);
    } catch {
      /* ignore */
    }
  }, []);

  useEffect(() => {
    fetchSkills();
  }, [fetchSkills]);

  useEffect(() => {
    fetchStats();
  }, [fetchStats]);

  useEffect(() => {
    const next = new URLSearchParams(searchParams.toString());
    if (filter === "all") next.delete("status");
    else next.set("status", filter);
    const qs = next.toString();
    router.replace(qs ? `/curate?${qs}` : "/curate", { scroll: false });
  }, [filter, router, searchParams]);

  function handleSkillUpdated(updated: Partial<SkillWithRelations> & { id: string }) {
    setSkills((prev) => prev.map((s) => (s.id === updated.id ? { ...s, ...updated } : s)));
    fetchStats();
  }

  function handleSkillRemoved(id: string) {
    // Re-fetch the current page in case status filter should drop it now.
    setSkills((prev) => prev.filter((s) => s.id !== id));
    fetchStats();
  }

  const statPills = useMemo(
    () => [
      { label: "Total", value: stats?.total ?? 0 },
      { label: "Unreviewed", value: stats?.unreviewed ?? 0 },
      { label: "Favorited", value: stats?.favorited ?? 0 },
      { label: "Installed", value: stats?.installed ?? 0 },
      { label: "Hidden", value: stats?.hidden ?? 0 },
    ],
    [stats]
  );

  const totalPages = Math.max(1, Math.ceil(total / limit));

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Curate Skills</h1>
        <p className="text-muted-foreground mt-1">
          Favorite, annotate, and install skills into <code>~/.claude/skills</code>.
        </p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-5">
        {statPills.map((p) => (
          <Card key={p.label}>
            <CardContent className="pt-4 text-center">
              <p className="text-xs text-muted-foreground uppercase tracking-wide">
                {p.label}
              </p>
              <p className="text-2xl font-semibold mt-1">{p.value}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Filters */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <Tabs
          value={filter}
          onValueChange={(v) => {
            setFilter(v as FilterValue);
            setPage(1);
          }}
        >
          <TabsList>
            {FILTERS.map((f) => (
              <TabsTrigger key={f.value} value={f.value}>
                {f.label}
              </TabsTrigger>
            ))}
          </TabsList>
        </Tabs>
        <Input
          placeholder="Search skills..."
          value={q}
          onChange={(e) => {
            setQ(e.target.value);
            setPage(1);
          }}
          className="sm:max-w-xs"
        />
      </div>

      {/* List */}
      {loading ? (
        <p className="text-muted-foreground">Loading...</p>
      ) : skills.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center text-muted-foreground">
            No skills match this filter.
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-3">
          {skills.map((skill) => (
            <CurateSkillCard
              key={skill.id}
              skill={skill}
              onUpdated={handleSkillUpdated}
              onRemoved={handleSkillRemoved}
            />
          ))}
        </div>
      )}

      {/* Pagination */}
      {total > limit && (
        <div className="flex items-center justify-between text-sm">
          <p className="text-muted-foreground">
            Page {page} of {totalPages} — {total} skills
          </p>
          <div className="flex gap-2">
            <Button
              variant="outline"
              size="sm"
              disabled={page <= 1}
              onClick={() => setPage((p) => Math.max(1, p - 1))}
            >
              Previous
            </Button>
            <Button
              variant="outline"
              size="sm"
              disabled={page >= totalPages}
              onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
            >
              Next
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
