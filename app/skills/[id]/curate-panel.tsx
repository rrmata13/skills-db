"use client";

import { useEffect, useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/components/ui/toast";
import {
  Bookmark,
  EyeOff,
  Download,
  Trash2,
  Loader2,
  CheckCircle2,
  AlertTriangle,
} from "lucide-react";
import type { CurationStatus } from "@/types";

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
  id: string;
  initial: {
    curationStatus: CurationStatus;
    notes?: string | null;
    installedAt?: string | Date | null;
    installedPath?: string | null;
  };
}

export function CuratePanel({ id, initial }: Props) {
  const t = useToast();
  const [status, setStatus] = useState<CurationStatus>(initial.curationStatus);
  const [installedAt, setInstalledAt] = useState<string | Date | null>(
    initial.installedAt ?? null
  );
  const [installedPath, setInstalledPath] = useState<string | null>(
    initial.installedPath ?? null
  );
  const [notes, setNotes] = useState(initial.notes || "");
  const [busy, setBusy] = useState<null | "status" | "install" | "uninstall" | "notes">(null);
  const [collisionTarget, setCollisionTarget] = useState<string | null>(null);
  const notesTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => () => {
    if (notesTimer.current) clearTimeout(notesTimer.current);
  }, []);

  async function patchStatus(next: CurationStatus) {
    setBusy("status");
    try {
      const res = await fetch(`/api/curate/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ curationStatus: next }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw data.error;
      }
      setStatus(next);
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
        const res = await fetch(`/api/curate/${id}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ notes: value || null }),
        });
        if (!res.ok) {
          const data = await res.json().catch(() => ({}));
          throw data.error;
        }
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
      const res = await fetch(`/api/curate/${id}/install`, {
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
      setInstalledAt(data.data.installedAt);
      setInstalledPath(data.data.installedPath);
      t.success("Installed", `${data.data.installedPath}`);
    } catch (e) {
      t.error("Install failed", describeError(e));
    } finally {
      setBusy(null);
    }
  }

  async function uninstall() {
    setBusy("uninstall");
    try {
      const res = await fetch(`/api/curate/${id}/uninstall`, { method: "POST" });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw data.error;
      }
      setInstalledAt(null);
      setInstalledPath(null);
      t.success("Uninstalled", "Removed from ~/.claude/skills");
    } catch (e) {
      t.error("Uninstall failed", describeError(e));
    } finally {
      setBusy(null);
    }
  }

  const isFavorited = status === "favorited";
  const isHidden = status === "hidden";
  const isInstalled = !!installedAt;

  return (
    <div className="rounded-lg border border-border/50 p-4 space-y-3">
      <div className="flex items-center justify-between gap-3 flex-wrap">
        <div className="flex items-center gap-2">
          <h2 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">
            Curation
          </h2>
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
        <div className="flex gap-2">
          <Button
            size="sm"
            variant={isFavorited ? "default" : "outline"}
            disabled={busy === "status"}
            onClick={() => patchStatus(isFavorited ? "unreviewed" : "favorited")}
          >
            <Bookmark className={isFavorited ? "h-4 w-4 fill-current mr-1" : "h-4 w-4 mr-1"} />
            {isFavorited ? "Favorited" : "Favorite"}
          </Button>
          <Button
            size="sm"
            variant={isHidden ? "default" : "outline"}
            disabled={busy === "status"}
            onClick={() => patchStatus(isHidden ? "unreviewed" : "hidden")}
          >
            <EyeOff className="h-4 w-4 mr-1" />
            {isHidden ? "Hidden" : "Hide"}
          </Button>
          {isInstalled ? (
            <>
              <Button
                size="sm"
                variant="outline"
                disabled={busy !== null}
                onClick={() => install()}
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
            <Button size="sm" disabled={busy !== null} onClick={() => install()}>
              {busy === "install" ? (
                <Loader2 className="h-4 w-4 animate-spin mr-1" />
              ) : (
                <Download className="h-4 w-4 mr-1" />
              )}
              Install to ~/.claude/skills
            </Button>
          )}
        </div>
      </div>

      {installedPath && (
        <p className="text-xs font-mono text-muted-foreground truncate">
          {installedPath}
        </p>
      )}

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
                This skill dir exists outside SkillMapper. Overwrite anyway?
              </p>
            </div>
          </div>
          <div className="flex gap-2 justify-end">
            <Button size="sm" variant="outline" onClick={() => setCollisionTarget(null)}>
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

      <Textarea
        value={notes}
        onChange={(e) => onNotesChange(e.target.value)}
        placeholder="Personal notes on this skill..."
        className="text-sm"
        rows={3}
      />

    </div>
  );
}
