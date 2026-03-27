"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ScoreBreakdown } from "./score-breakdown";
import { Star, ExternalLink } from "lucide-react";
import Link from "next/link";
import type { MatchResult } from "@/types";

interface MatchResultsProps {
  results: MatchResult[];
  title?: string;
}

export function MatchResults({ results, title }: MatchResultsProps) {
  if (results.length === 0) {
    return (
      <div className="text-center py-8 text-muted-foreground">
        No matching skills found. Try a different query.
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {title && (
        <h3 className="text-sm font-medium text-muted-foreground">{title}</h3>
      )}
      {results.map((result, idx) => (
        <Card
          key={result.skillId}
          className={
            idx === 0
              ? "border-primary/30 shadow-lg shadow-primary/5"
              : ""
          }
        >
          <CardHeader className="pb-3">
            <div className="flex items-start justify-between gap-3">
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  {idx === 0 && (
                    <Badge className="bg-primary/10 text-primary text-[10px]">
                      Best Match
                    </Badge>
                  )}
                  <span className="text-xs text-muted-foreground">
                    #{idx + 1}
                  </span>
                </div>
                <Link href={`/skills/${result.skillSlug}`}>
                  <CardTitle className="mt-1 text-base hover:text-primary transition-colors cursor-pointer">
                    {result.skillName}
                  </CardTitle>
                </Link>
                <p className="text-xs text-muted-foreground mt-0.5">
                  by {result.sourceAuthor} / {result.sourceRepository}
                </p>
              </div>
              <div
                className={`flex h-12 w-12 items-center justify-center rounded-full text-sm font-bold shrink-0 ${
                  result.score >= 0.7
                    ? "bg-emerald-500/15 text-emerald-500"
                    : result.score >= 0.4
                      ? "bg-amber-500/15 text-amber-500"
                      : "bg-red-500/15 text-red-500"
                }`}
              >
                {Math.round(result.score * 100)}%
              </div>
            </div>
          </CardHeader>
          <CardContent className="space-y-3">
            <p className="text-sm text-muted-foreground">
              {result.description}
            </p>
            <p className="text-xs text-primary/80 italic">{result.rationale}</p>
            <div className="flex flex-wrap gap-1">
              {result.categories.slice(0, 3).map((cat) => (
                <Badge key={cat} variant="secondary" className="text-[10px]">
                  {cat}
                </Badge>
              ))}
              {result.tags.slice(0, 4).map((tag) => (
                <Badge key={tag} variant="outline" className="text-[10px]">
                  {tag}
                </Badge>
              ))}
            </div>
            <ScoreBreakdown
              lexicalScore={result.lexicalScore}
              semanticScore={result.semanticScore}
              ruleScore={result.ruleScore}
              popularityScore={result.popularityScore}
            />
            <div className="flex items-center justify-between text-xs text-muted-foreground pt-1">
              <div className="flex items-center gap-1">
                <Star className="h-3 w-3 fill-amber-500 text-amber-500" />
                <span>
                  {result.rating?.toLocaleString() || "N/A"}
                </span>
              </div>
              {result.repoUrl && (
                <a
                  href={result.repoUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-1 hover:text-foreground"
                  onClick={(e) => e.stopPropagation()}
                >
                  <ExternalLink className="h-3 w-3" />
                  Source
                </a>
              )}
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}
