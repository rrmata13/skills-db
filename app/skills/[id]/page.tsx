import { prisma } from "@/lib/db";
import { notFound } from "next/navigation";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { Star, ExternalLink, ArrowLeft, Zap } from "lucide-react";
import Link from "next/link";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { CuratePanel } from "./curate-panel";
import type { CurationStatus } from "@/types";

export default async function SkillDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;

  const skill = await prisma.skill.findFirst({
    where: { OR: [{ id }, { slug: id }] },
    include: {
      sourceRepository: true,
      categories: { select: { category: true } },
      tags: { select: { tag: true } },
      capabilities: true,
    },
  });

  if (!skill) notFound();

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      {/* Back link */}
      <Link
        href="/"
        className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground transition-colors"
      >
        <ArrowLeft className="h-3 w-3" />
        Back to skills
      </Link>

      {/* Header */}
      <div className="space-y-4">
        <div className="flex items-start justify-between gap-4">
          <div>
            <h1 className="text-3xl font-bold">{skill.name}</h1>
            <p className="mt-1 text-muted-foreground">
              by{" "}
              <span className="text-foreground font-medium">
                {skill.sourceRepository.author}
              </span>{" "}
              / {skill.sourceRepository.name}
            </p>
          </div>
          <div className="flex items-center gap-1 text-amber-500">
            <Star className="h-5 w-5 fill-current" />
            <span className="text-lg font-semibold">
              {skill.rating.toLocaleString()}
            </span>
          </div>
        </div>

        <p className="text-lg text-muted-foreground">{skill.description}</p>

        <div className="flex flex-wrap gap-2">
          {skill.categories.map((c) => (
            <Badge key={c.category} variant="secondary">
              {c.category}
            </Badge>
          ))}
          {skill.tags.map((t) => (
            <Badge key={t.tag} variant="outline">
              {t.tag}
            </Badge>
          ))}
        </div>

        <div className="flex gap-3">
          {skill.sourceRepository.sourceUrl && (
            <a
              href={skill.sourceRepository.sourceUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1.5 text-sm text-primary hover:underline"
            >
              <ExternalLink className="h-3.5 w-3.5" />
              View on Agent Skills
            </a>
          )}
          {skill.sourceRepository.githubUrl && (
            <a
              href={skill.sourceRepository.githubUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1.5 text-sm text-primary hover:underline"
            >
              <ExternalLink className="h-3.5 w-3.5" />
              GitHub
            </a>
          )}
        </div>
      </div>

      <CuratePanel
        id={skill.id}
        initial={{
          curationStatus: skill.curationStatus as CurationStatus,
          notes: skill.notes,
          installedAt: skill.installedAt ? skill.installedAt.toISOString() : null,
          installedPath: skill.installedPath,
        }}
      />

      <Separator />

      {/* Capabilities */}
      {skill.capabilities.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              <Zap className="h-4 w-4" />
              Capabilities
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid gap-3 sm:grid-cols-2">
              {skill.capabilities.map((cap) => (
                <div
                  key={cap.id}
                  className="rounded-lg border border-border/50 p-3"
                >
                  <p className="text-sm font-medium">{cap.capability}</p>
                  {(cap.inputType || cap.outputType) && (
                    <p className="text-xs text-muted-foreground mt-1">
                      {cap.inputType && (
                        <span>
                          Input: <code className="text-primary">{cap.inputType}</code>
                        </span>
                      )}
                      {cap.inputType && cap.outputType && " → "}
                      {cap.outputType && (
                        <span>
                          Output: <code className="text-primary">{cap.outputType}</code>
                        </span>
                      )}
                    </p>
                  )}
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* README / Long Description */}
      {skill.longDescription && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Documentation</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="prose prose-sm prose-invert max-w-none">
              <ReactMarkdown remarkPlugins={[remarkGfm]}>
                {skill.longDescription}
              </ReactMarkdown>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
