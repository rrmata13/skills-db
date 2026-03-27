"use client";

import { useState, useEffect, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { RefreshCw, Loader2, CheckCircle, XCircle, Clock } from "lucide-react";

interface SourceData {
  id: string;
  slug: string;
  name: string;
  author: string;
  sourceUrl: string;
  rating: number;
  syncStatus: string;
  syncError?: string | null;
  lastSyncedAt?: string | null;
  skillCount: number;
}

interface HealthData {
  status: string;
  database: string;
  skills: number;
  sources: number;
  timestamp: string;
}

export default function AdminPage() {
  const [sources, setSources] = useState<SourceData[]>([]);
  const [health, setHealth] = useState<HealthData | null>(null);
  const [syncing, setSyncing] = useState(false);
  const [syncResult, setSyncResult] = useState<{
    total: number;
    succeeded: number;
    failed: number;
  } | null>(null);

  const fetchData = useCallback(async () => {
    try {
      const [sourcesRes, healthRes] = await Promise.all([
        fetch("/api/sources"),
        fetch("/api/health"),
      ]);
      const sourcesData = await sourcesRes.json();
      const healthData = await healthRes.json();
      setSources(sourcesData.data || []);
      setHealth(healthData.data || null);
    } catch {
      // Fetch failed
    }
  }, []);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  async function handleSync() {
    setSyncing(true);
    setSyncResult(null);
    try {
      const res = await fetch("/api/sync/sources", { method: "POST" });
      const data = await res.json();
      setSyncResult(data.data);
      await fetchData();
    } catch {
      // Sync failed
    }
    setSyncing(false);
  }

  const statusIcon = (status: string) => {
    switch (status) {
      case "SYNCED":
        return <CheckCircle className="h-4 w-4 text-emerald-500" />;
      case "FAILED":
        return <XCircle className="h-4 w-4 text-red-500" />;
      case "SYNCING":
        return <Loader2 className="h-4 w-4 animate-spin text-amber-500" />;
      default:
        return <Clock className="h-4 w-4 text-muted-foreground" />;
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Admin Dashboard</h1>
          <p className="text-muted-foreground mt-1">
            Manage data sources and sync status
          </p>
        </div>
        <Button onClick={handleSync} disabled={syncing}>
          {syncing ? (
            <Loader2 className="h-4 w-4 animate-spin mr-1" />
          ) : (
            <RefreshCw className="h-4 w-4 mr-1" />
          )}
          Sync All Sources
        </Button>
      </div>

      {/* Health */}
      {health && (
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
          <Card>
            <CardContent className="pt-4 text-center">
              <p className="text-sm text-muted-foreground">Status</p>
              <Badge
                className={
                  health.status === "healthy"
                    ? "bg-emerald-500/15 text-emerald-500 mt-1"
                    : "bg-red-500/15 text-red-500 mt-1"
                }
              >
                {health.status}
              </Badge>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-4 text-center">
              <p className="text-sm text-muted-foreground">Database</p>
              <p className="text-lg font-semibold mt-1">{health.database}</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-4 text-center">
              <p className="text-sm text-muted-foreground">Skills</p>
              <p className="text-lg font-semibold mt-1">{health.skills}</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-4 text-center">
              <p className="text-sm text-muted-foreground">Sources</p>
              <p className="text-lg font-semibold mt-1">{health.sources}</p>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Sync Result */}
      {syncResult && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Last Sync Result</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex gap-4 text-sm">
              <span>Total: {syncResult.total}</span>
              <span className="text-emerald-500">
                Succeeded: {syncResult.succeeded}
              </span>
              <span className="text-red-500">
                Failed: {syncResult.failed}
              </span>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Sources Table */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Source Repositories</CardTitle>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Source</TableHead>
                <TableHead>Author</TableHead>
                <TableHead className="text-center">Skills</TableHead>
                <TableHead className="text-center">Rating</TableHead>
                <TableHead className="text-center">Status</TableHead>
                <TableHead>Last Synced</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {sources.map((source) => (
                <TableRow key={source.id}>
                  <TableCell className="font-medium">{source.name}</TableCell>
                  <TableCell className="text-muted-foreground">
                    {source.author}
                  </TableCell>
                  <TableCell className="text-center">
                    {source.skillCount}
                  </TableCell>
                  <TableCell className="text-center">
                    {source.rating.toLocaleString()}
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center justify-center gap-1.5">
                      {statusIcon(source.syncStatus)}
                      <span className="text-xs">{source.syncStatus}</span>
                    </div>
                  </TableCell>
                  <TableCell className="text-xs text-muted-foreground">
                    {source.lastSyncedAt
                      ? new Date(source.lastSyncedAt).toLocaleString()
                      : "Never"}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}
