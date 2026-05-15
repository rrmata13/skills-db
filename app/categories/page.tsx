import { prisma } from "@/lib/db";
import { CATEGORIES } from "@/lib/constants";
import Link from "next/link";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { EmptyState } from "@/components/empty-state";
import { Button } from "@/components/ui/button";
import {
  Code,
  Workflow,
  MessageSquare,
  Brain,
  Cloud,
  FileText,
  BookOpen,
  Server,
  Terminal,
  Users,
  Library,
  Plug,
  Layers,
} from "lucide-react";

const CATEGORY_ICONS: Record<string, React.ElementType> = {
  coding: Code,
  "workflow-automation": Workflow,
  chatbot: MessageSquare,
  memory: Brain,
  devops: Server,
  documentation: FileText,
  "knowledge-management": BookOpen,
  "cloud-platform": Cloud,
  "cli-tooling": Terminal,
  "multi-agent": Users,
  "skills-collection": Library,
  integration: Plug,
};

export default async function CategoriesPage() {
  const categoryCounts = await prisma.skillCategory.groupBy({
    by: ["category"],
    _count: { category: true },
  });

  const countMap = new Map(
    categoryCounts.map((c) => [c.category, c._count.category])
  );

  const categories = CATEGORIES.map((cat) => ({
    ...cat,
    count: countMap.get(cat.slug) || 0,
  }))
    .filter((c) => c.count > 0)
    .sort((a, b) => b.count - a.count);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Browse Categories</h1>
        <p className="text-muted-foreground mt-1">
          Explore {categories.length} categories of AI agent skills
        </p>
      </div>

      {categories.length === 0 ? (
        <EmptyState
          icon={Layers}
          title="No categories yet"
          description="The skills catalog hasn't been populated, so there are no categories to browse. Once skills are ingested, they'll show up here grouped by category."
          action={
            <Link href="/">
              <Button variant="outline" size="sm">
                Back to home
              </Button>
            </Link>
          }
        />
      ) : (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {categories.map((cat) => {
            const Icon = CATEGORY_ICONS[cat.slug] || Plug;
            return (
              <Link key={cat.slug} href={`/?category=${cat.slug}`}>
                <Card className="group hover:border-primary/30 hover:shadow-lg hover:shadow-primary/5 transition-all cursor-pointer">
                  <CardHeader className="pb-2">
                    <div className="flex items-center gap-3">
                      <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-primary/10 text-primary group-hover:bg-primary group-hover:text-primary-foreground transition-colors">
                        <Icon className="h-4 w-4" />
                      </div>
                      <div>
                        <CardTitle className="text-sm">{cat.name}</CardTitle>
                        <p className="text-xs text-muted-foreground">
                          {cat.count} skill{cat.count !== 1 ? "s" : ""}
                        </p>
                      </div>
                    </div>
                  </CardHeader>
                  <CardContent>
                    <p className="text-xs text-muted-foreground line-clamp-2">
                      {cat.description}
                    </p>
                  </CardContent>
                </Card>
              </Link>
            );
          })}
        </div>
      )}
    </div>
  );
}
