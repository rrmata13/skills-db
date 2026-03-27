"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { SkillGrid } from "@/components/skills/skill-grid";
import { Search, Zap, Database, Layers } from "lucide-react";

interface HomeClientProps {
  skills: {
    id: string;
    name: string;
    slug: string;
    description: string;
    rating: number;
    categories: { category: string }[];
    tags: { tag: string }[];
    sourceRepository: { id: string; name: string; author: string; sourceUrl: string };
  }[];
  stats: {
    skillCount: number;
    sourceCount: number;
  };
}

const EXAMPLE_QUERIES = [
  "build a chatbot for Telegram",
  "automate CI/CD pipeline",
  "manage Obsidian notes with AI",
  "deploy serverless functions",
  "memory system for AI agent",
];

export function HomeClient({ skills, stats }: HomeClientProps) {
  const [query, setQuery] = useState("");
  const router = useRouter();

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    if (query.trim()) {
      router.push(`/match?q=${encodeURIComponent(query.trim())}`);
    }
  };

  return (
    <div className="space-y-12">
      {/* Hero */}
      <section className="text-center pt-8 pb-4">
        <h1 className="text-4xl font-bold tracking-tight sm:text-5xl">
          Find the Right{" "}
          <span className="text-primary">AI Skill</span>
        </h1>
        <p className="mt-4 text-lg text-muted-foreground max-w-2xl mx-auto">
          Search and match AI agent skills to your tasks. Powered by{" "}
          {stats.skillCount} skills from {stats.sourceCount} repositories.
        </p>

        {/* Search */}
        <form
          onSubmit={handleSearch}
          className="mt-8 flex max-w-xl mx-auto gap-2"
        >
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Describe your task..."
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              className="pl-10 h-11"
            />
          </div>
          <Button type="submit" size="lg" className="h-11">
            <Zap className="h-4 w-4 mr-1" />
            Match
          </Button>
        </form>

        {/* Example queries */}
        <div className="mt-4 flex flex-wrap justify-center gap-2">
          <span className="text-xs text-muted-foreground mr-1">Try:</span>
          {EXAMPLE_QUERIES.map((eq) => (
            <button
              key={eq}
              onClick={() => {
                setQuery(eq);
                router.push(`/match?q=${encodeURIComponent(eq)}`);
              }}
              className="text-xs text-muted-foreground hover:text-foreground bg-secondary/50 hover:bg-secondary px-2 py-1 rounded-md transition-colors"
            >
              {eq}
            </button>
          ))}
        </div>
      </section>

      {/* Stats */}
      <section className="grid grid-cols-3 gap-4 max-w-md mx-auto">
        {[
          { icon: Database, label: "Skills", value: stats.skillCount },
          { icon: Layers, label: "Sources", value: stats.sourceCount },
          { icon: Zap, label: "Match Modes", value: 3 },
        ].map(({ icon: Icon, label, value }) => (
          <div
            key={label}
            className="text-center p-4 rounded-lg bg-card border border-border/50"
          >
            <Icon className="h-5 w-5 mx-auto text-muted-foreground mb-1" />
            <p className="text-2xl font-bold">{value}</p>
            <p className="text-xs text-muted-foreground">{label}</p>
          </div>
        ))}
      </section>

      {/* Featured Skills */}
      <section>
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-xl font-semibold">Top Skills</h2>
          <Badge variant="outline" className="text-xs">
            By popularity
          </Badge>
        </div>
        <SkillGrid skills={skills} />
      </section>
    </div>
  );
}
