"use client";

import Link from "next/link";
import { cn } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Star, ExternalLink } from "lucide-react";

interface SkillCardProps {
  id: string;
  name: string;
  slug: string;
  description: string;
  rating: number;
  categories: { category: string }[];
  tags: { tag: string }[];
  sourceRepository: {
    name: string;
    author: string;
  };
  score?: number;
  rationale?: string;
  compact?: boolean;
}

export function SkillCard({
  name,
  slug,
  description,
  rating,
  categories,
  tags,
  sourceRepository,
  score,
  rationale,
  compact,
}: SkillCardProps) {
  return (
    <Link href={`/skills/${slug}`}>
      <Card className="group relative overflow-hidden transition-all hover:border-primary/30 hover:shadow-lg hover:shadow-primary/5">
        {score !== undefined && (
          <div className="absolute right-3 top-3">
            <div
              className={cn(
                "flex h-10 w-10 items-center justify-center rounded-full text-xs font-bold",
                score >= 0.7
                  ? "bg-emerald-500/15 text-emerald-500"
                  : score >= 0.4
                    ? "bg-amber-500/15 text-amber-500"
                    : "bg-red-500/15 text-red-500"
              )}
            >
              {Math.round(score * 100)}%
            </div>
          </div>
        )}
        <CardHeader className={compact ? "pb-2" : "pb-3"}>
          <div className="flex items-start gap-2">
            <div className="flex-1 min-w-0">
              <CardTitle className="text-base font-semibold leading-tight group-hover:text-primary transition-colors">
                {name}
              </CardTitle>
              <p className="mt-1 text-xs text-muted-foreground">
                by {sourceRepository.author} / {sourceRepository.name}
              </p>
            </div>
          </div>
        </CardHeader>
        <CardContent className={compact ? "pt-0" : ""}>
          <p className="text-sm text-muted-foreground line-clamp-2 mb-3">
            {description}
          </p>
          {rationale && (
            <p className="text-xs text-primary/80 mb-3 italic line-clamp-2">
              {rationale}
            </p>
          )}
          <div className="flex flex-wrap gap-1 mb-2">
            {categories.slice(0, 2).map((c) => (
              <Badge key={c.category} variant="secondary" className="text-[10px] px-1.5 py-0">
                {c.category}
              </Badge>
            ))}
            {tags.slice(0, 3).map((t) => (
              <Badge key={t.tag} variant="outline" className="text-[10px] px-1.5 py-0">
                {t.tag}
              </Badge>
            ))}
          </div>
          <div className="flex items-center justify-between text-xs text-muted-foreground">
            <div className="flex items-center gap-1">
              <Star className="h-3 w-3 fill-amber-500 text-amber-500" />
              <span>{rating.toLocaleString()}</span>
            </div>
            <ExternalLink className="h-3 w-3 opacity-0 group-hover:opacity-100 transition-opacity" />
          </div>
        </CardContent>
      </Card>
    </Link>
  );
}
