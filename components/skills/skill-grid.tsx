"use client";

import { Database } from "lucide-react";
import { SkillCard } from "./skill-card";
import { EmptyState } from "@/components/empty-state";

interface SkillGridProps {
  skills: {
    id: string;
    name: string;
    slug: string;
    description: string;
    rating: number;
    categories: { category: string }[];
    tags: { tag: string }[];
    sourceRepository: { name: string; author: string };
  }[];
}

export function SkillGrid({ skills }: SkillGridProps) {
  if (skills.length === 0) {
    return (
      <EmptyState
        icon={Database}
        title="No skills to show yet"
        description="The skills catalog is empty. Once skills are ingested from upstream repositories, they'll appear here."
      />
    );
  }

  return (
    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
      {skills.map((skill) => (
        <SkillCard key={skill.id} {...skill} />
      ))}
    </div>
  );
}
