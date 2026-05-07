"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/components/ui/toast";
import {
  Bookmark,
  EyeOff,
  Download,
  Trash2,
  Loader2,
  CheckCircle2,
  ExternalLink,
  AlertTriangle,
} from "lucide-react";
import type { SkillWithRelations } from "@/types";

function describeError(err: unknown): string {
  if (err && typeof err === "object" && "kind" in err) {
    const e = err as { kind: string; target?: string; cause?: string };
    if (e.kind === "partial_install")
      return `Partial install: file written to ${e.target} but DB update failed (${e.cause ?? "unknown cause"}). The file was rolled back.`;
    if (e.kind === "invalid_slug") return "This skill's slug is unsafe and cannot be installed.";
    if (e.kind === "not_found") return "Skill not found.";
    if (e.kind === "internal") return e.cause ?? "Internal error";
    return `[${e.kind}] ${e.cause ?? ""}`.trim();
  }
  if (err instanceof Error) return err.message;
  return typeof err === "string" ? err : "Unknown error";
}

interface Props {
  skill: SkillWithRelations;
  onUpdated: (updated: Partial<SkillWithRelations> & { id: string }) => void;
  onRemoved?: (id: string) => void;
}

export function CurateSkillCard({ skill, onUpdated }: Props) {
  const t = useToast();
  const [notes, setNotes] = useState(skill.notes || "");
  const [busy, setBusy] = useState<null | "status" | "install" | "uninstall" | "notes">(null);
  const [collisionTarget, setCollisionTarget] = useState<string | null>(null);
  const notesTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    setNotes(skill.notes || "");
  }, [skill.id, skill.notes]);

  async function patchStatus(next: SkillWithRelations["curationStatus"]) {
    setBusy("status");
    try {
      const res = await fetch(`/api/curate/${skill.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ curationStatus: next }),
      });
      const data = await res.json();
      if (!res.ok) throw data.error;
      onUpdated({ id: skill.id, curationStatus: next });
    } catch (e) {
      t.error("Couldn't update status", describeError(e));
    } finally {
      setBusy(null);
    }
  }

  function onNotesChange(value: string) {
    setNotes(value);
    if (notesTimer.current) clearTimeout(notesTimer.current);
    notesTimer.current = setTimeout(async () => {
      setBusy("notes");
      try {
        const res = await fetch(`/api/curate/${skill.id}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ notes: value || null }),
        });
        if (!res.ok) {
          const data = await res.json().catch(() => ({}));
          throw data.error;
        }
        onUpdated({ id: skill.id, notes: value || null });
      } catch (e) {
        t.error("Couldn't save note", describeError(e));
      } finally {
        setBusy(null);
      }
    }, 600);
  }

  async function install(force = false) {
    setBusy("install");
    try {
      const res = await fetch(`/api/curate/${skill.id}/install`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ force }),
      });
      const data = await res.json();
      if (!res.ok) {
        if (data.error?.kind === "exists_outside_skillmapper") {
          setCollisionTarget(data.error.target);
          return;
        }
        throw data.error;
      }
      setCollisionTarget(null);
      onUpdated({
        id: skill.id,
        installedAt: data.data.installedAt,
        installedPath: data.data.installedPath,
      });
      t.success(
        "Installed",
        `${skill.name} → ${data.data.installedPath}`
      );
    } catch (e) {
      t.error("Install failed", describeError(e));
    } finally {
      setBusy(null);
    }
  }

  async function uninstall() {
    setBusy("uninstall");
    try {
      const res = await fetch(`/api/curate/${skill.id}/uninstall`, {
        method: "POST",
      });
      const data = await res.json();
      if (!res.ok) throw data.error;
      onUpdated({ id: skill.id, installedAt: null, installedPath: null });
      t.success("Uninstalled", `${skill.name} removed from ~/.claude/skills`);
    } catch (e) {
      t.error("Uninstall failed", describeError(e));
    } finally {
      setBusy(null);
    }
  }

  const isFavorited = skill.curationStatus === "favorited";
  const isHidden = skill.curationStatus === "hidden";
  const isInstalled = !!skill.installedAt;

  return (
    <Card className={isHidden ? "opacity-60" : undefined}>
      <CardContent className="py-4 space-y-3">
        <div className="flex items-start justify-between gap-3">
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <Link
                href={`/skills/${skill.slug}`}
                className="text-base font-semibold hover:underline truncate"
              >
                {skill.name}
              </Link>
              {isInstalled && (
                <Badge className="bg-emerald-500/15 text-emerald-500">
                  <CheckCircle2 className="h-3 w-3 mr-1" />
                  Installed
                </Badge>
              )}
              {isFavorited && (
                <Badge className="bg-amber-500/15 text-amber-500">Favorited</Badge>
              )}
              {isHidden && (
                <Badge className="bg-muted text-muted-foreground">Hidden</Badge>
              )}
            </div>
            <p className="text-sm text-muted-foreground mt-1">
              {skill.description}
            </p>
            <div className="flex flex-wrap gap-1.5 mt-2">
              <span className="text-xs text-muted-foreground">
                {skill.sourceRepository.name} · {skill.sourceRepository.author}
              </span>
              {skill.tags.slice(0, 5).map((t) => (
                <Badge key={t.tag} variant="outline" className="text-xs">
                  {t.tag}
                </Badge>
              ))}
              {skill.repoUrl && (
                <a
                  href={skill.repoUrl}
                  target="_blank"
                  rel="noreferrer"
                  className="text-xs text-muted-foreground hover:text-foreground inline-flex items-center gap-1"
                >
                  <ExternalLink className="h-3 w-3" /> source
                </a>
              )}
            </div>
          </div>

          <div className="flex flex-col gap-1.5 shrink-0">
            <Button
              size="sm"
              variant={isFavorited ? "default" : "outline"}
              disabled={busy === "status"}
              onClick={() =>
                patchStatus(isFavorited ? "unreviewed" : "favorited")
              }
              title="Favorite"
            >
              <Bookmark
                className={
                  isFavorited ? "h-4 w-4 fill-current" : "h-4 w-4"
                }
              />
            </Button>
            <Button
              size="sm"
              variant={isHidden ? "default" : "outline"}
              disabled={busy === "status"}
              onClick={() => patchStatus(isHidden ? "unreviewed" : "hidden")}
              title="Hide"
            >
              <EyeOff className="h-4 w-4" />
            </Button>
          </div>
        </div>

        {/* Notes */}
        <Textarea
          value={notes}
          onChange={(e) => onNotesChange(e.target.value)}
          placeholder="Your notes on this skill..."
          className="text-sm min-h-[48px]"
          rows={2}
        />

        {/* Collision dialog inline */}
        {collisionTarget && (
          <div className="rounded-md border border-amber-500/40 bg-amber-500/10 p-3 text-sm space-y-2">
            <div className="flex items-start gap-2">
              <AlertTriangle className="h-4 w-4 text-amber-500 mt-0.5" />
              <div className="flex-1">
                <p className="font-medium">Directory already exists</p>
                <p className="text-muted-foreground text-xs mt-1 font-mono">
                  {collisionTarget}
                </p>
                <p className="text-muted-foreground mt-1">
                  This looks like a skill SkillMapper didn&apos;t install. Overwrite anyway?
                </p>
              </div>
            </div>
            <div className="flex gap-2 justify-end">
              <Button
                size="sm"
                variant="outline"
                onClick={() => setCollisionTarget(null)}
              >
                Cancel
              </Button>
              <Button
                size="sm"
                variant="destructive"
                disabled={busy === "install"}
                onClick={() => install(true)}
              >
                Overwrite
              </Button>
            </div>
          </div>
        )}


        <div className="flex gap-2 justify-end">
          {isInstalled ? (
            <>
              <span className="text-xs text-muted-foreground self-center font-mono truncate max-w-[260px]">
                {skill.installedPath}
              </span>
              <Button
                size="sm"
                variant="outline"
                disabled={busy !== null}
                onClick={() => install()}
                title="Re-install to overwrite with latest content"
              >
                {busy === "install" ? (
                  <Loader2 className="h-4 w-4 animate-spin mr-1" />
                ) : (
                  <Download className="h-4 w-4 mr-1" />
                )}
                Re-install
              </Button>
              <Button
                size="sm"
                variant="destructive"
                disabled={busy !== null}
                onClick={uninstall}
              >
                {busy === "uninstall" ? (
                  <Loader2 className="h-4 w-4 animate-spin mr-1" />
                ) : (
                  <Trash2 className="h-4 w-4 mr-1" />
                )}
                Uninstall
              </Button>
            </>
          ) : (
            <Button
              size="sm"
              disabled={busy !== null}
              onClick={() => install()}
            >
              {busy === "install" ? (
                <Loader2 className="h-4 w-4 animate-spin mr-1" />
              ) : (
                <Download className="h-4 w-4 mr-1" />
              )}
              Install
            </Button>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
