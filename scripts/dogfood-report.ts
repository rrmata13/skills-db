// SOL-1018 Phase 3 — Dogfood report generator.
//
// Reads UserQuery + QueryMatch + SkillUse from the local Prisma DB and prints a
// markdown summary covering:
//   - Total query count + breakdown by queryType
//   - Click-through rate (CTR) per rank position 1-5
//   - Zero-result queries (queries that returned 0 matches — gold-set gap signal)
//   - Top-5 most-clicked slugs (which results does the founder actually use?)
//   - Most-uninstalled slugs (which results did the founder regret installing?)
//
// Run via: `npm run dogfood:report` (after adding to package.json scripts).
// Or directly: `npx tsx scripts/dogfood-report.ts`.
//
// Output goes to stdout as markdown; redirect to a file for archiving:
//   npm run dogfood:report > Skills/dogfood-snapshots/$(date +%Y-%m-%d).md

import { prisma } from "@/lib/db";

interface RankCtr {
  rank: number;
  impressions: number; // how many times a result appeared at this rank
  clicks: number;      // how many times a result at this rank was acted on
  ctr: number;         // clicks / impressions
}

async function main() {
  const allQueries = await prisma.userQuery.findMany({
    include: { tasks: { include: { matches: true } } },
    orderBy: { createdAt: "desc" },
  });

  if (allQueries.length === 0) {
    console.log("# SkillMapper Dogfood Report");
    console.log("");
    console.log("**No queries logged yet.** Run some queries via the match UI to populate this report.");
    return;
  }

  // --- Basic counts ---
  const total = allQueries.length;
  const byType: Record<string, number> = {};
  for (const q of allQueries) {
    byType[q.queryType] = (byType[q.queryType] ?? 0) + 1;
  }

  // --- Zero-result queries ---
  const zeroResultQueries: { rawInput: string; queryType: string; createdAt: Date }[] = [];
  for (const q of allQueries) {
    const totalMatches = q.tasks.reduce((sum, t) => sum + t.matches.length, 0);
    if (totalMatches === 0) {
      zeroResultQueries.push({ rawInput: q.rawInput, queryType: q.queryType, createdAt: q.createdAt });
    }
  }

  // --- Rank-level impressions (which ranks appeared, across all queries) ---
  const impressionsByRank: Record<number, number> = {};
  for (const q of allQueries) {
    for (const t of q.tasks) {
      for (const m of t.matches) {
        if (m.rank > 0 && m.rank <= 25) {
          impressionsByRank[m.rank] = (impressionsByRank[m.rank] ?? 0) + 1;
        }
      }
    }
  }

  // --- Click-through events ---
  const installUses = await prisma.skillUse.findMany({
    where: { useType: "install" },
    orderBy: { createdAt: "desc" },
  });
  const uninstallUses = await prisma.skillUse.findMany({
    where: { useType: "uninstall" },
    orderBy: { createdAt: "desc" },
  });

  // CTR per rank — only counts installs where rank was captured
  const clicksByRank: Record<number, number> = {};
  for (const u of installUses) {
    if (u.rank && u.rank > 0 && u.rank <= 25) {
      clicksByRank[u.rank] = (clicksByRank[u.rank] ?? 0) + 1;
    }
  }

  const ctrRows: RankCtr[] = [];
  for (let rank = 1; rank <= 10; rank++) {
    const imp = impressionsByRank[rank] ?? 0;
    const clk = clicksByRank[rank] ?? 0;
    ctrRows.push({ rank, impressions: imp, clicks: clk, ctr: imp > 0 ? clk / imp : 0 });
  }

  // --- Top installed slugs ---
  const installCountBySlug: Record<string, number> = {};
  const slugById = new Map<string, string>();
  for (const u of installUses) {
    installCountBySlug[u.skillId] = (installCountBySlug[u.skillId] ?? 0) + 1;
  }

  const uninstallCountBySlug: Record<string, number> = {};
  for (const u of uninstallUses) {
    uninstallCountBySlug[u.skillId] = (uninstallCountBySlug[u.skillId] ?? 0) + 1;
  }

  const allTouchedSkillIds = Array.from(
    new Set([...Object.keys(installCountBySlug), ...Object.keys(uninstallCountBySlug)])
  );
  if (allTouchedSkillIds.length > 0) {
    const skills = await prisma.skill.findMany({
      where: { id: { in: allTouchedSkillIds } },
      select: { id: true, slug: true, name: true },
    });
    for (const s of skills) slugById.set(s.id, s.slug);
  }

  // --- Render markdown ---
  const out: string[] = [];
  out.push("# SkillMapper Dogfood Report");
  out.push("");
  out.push(`**Generated:** ${new Date().toISOString()}`);
  out.push(`**Source:** local Prisma DB`);
  out.push("");
  out.push("## Query volume");
  out.push("");
  out.push(`- **Total queries:** ${total}`);
  for (const [t, n] of Object.entries(byType)) {
    out.push(`  - ${t}: ${n}`);
  }
  out.push("");

  out.push("## Click-through rate (CTR) per rank");
  out.push("");
  out.push("Impressions = how many times a result appeared at this rank across all queries.");
  out.push("Clicks = how many times the user installed the result at this rank.");
  out.push("Higher CTR at top ranks = matcher recommends well. Flat CTR across ranks = matcher ordering doesn't carry signal.");
  out.push("");
  out.push("| Rank | Impressions | Installs | CTR |");
  out.push("|---|---|---|---|");
  for (const r of ctrRows) {
    out.push(`| ${r.rank} | ${r.impressions} | ${r.clicks} | ${(r.ctr * 100).toFixed(1)}% |`);
  }
  out.push("");

  out.push("## Zero-result queries");
  out.push("");
  out.push(`**Count:** ${zeroResultQueries.length}`);
  out.push("");
  out.push("These queries returned 0 matches. Likely causes: (1) corpus gap — the relevant skill doesn't exist yet in the DB, or (2) query vocabulary that the matcher's keyword detection can't reach (Sprint 3c semantic embeddings target).");
  out.push("");
  if (zeroResultQueries.length > 0) {
    out.push("| Query | Type | When |");
    out.push("|---|---|---|");
    for (const z of zeroResultQueries.slice(0, 20)) {
      const truncated = z.rawInput.length > 80 ? z.rawInput.slice(0, 77) + "..." : z.rawInput;
      out.push(`| ${truncated.replace(/\|/g, "\\|")} | ${z.queryType} | ${z.createdAt.toISOString()} |`);
    }
    if (zeroResultQueries.length > 20) {
      out.push(`| _... ${zeroResultQueries.length - 20} more ..._ | | |`);
    }
  } else {
    out.push("_None — every query returned at least one match._");
  }
  out.push("");

  out.push("## Top installed slugs (most-clicked from matches)");
  out.push("");
  const topInstalled = Object.entries(installCountBySlug)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 10);
  if (topInstalled.length > 0) {
    out.push("| Rank | Slug | Installs |");
    out.push("|---|---|---|");
    topInstalled.forEach(([id, count], idx) => {
      out.push(`| ${idx + 1} | \`${slugById.get(id) ?? id}\` | ${count} |`);
    });
  } else {
    out.push("_No installs yet._");
  }
  out.push("");

  out.push("## Most-uninstalled slugs (regret signal)");
  out.push("");
  const topUninstalled = Object.entries(uninstallCountBySlug)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 5);
  if (topUninstalled.length > 0) {
    out.push("| Slug | Uninstalls |");
    out.push("|---|---|");
    topUninstalled.forEach(([id, count]) => {
      out.push(`| \`${slugById.get(id) ?? id}\` | ${count} |`);
    });
  } else {
    out.push("_No uninstalls yet._");
  }
  out.push("");

  out.push("## Notes");
  out.push("");
  out.push("- **Disable logging:** set `DOGFOOD_LOG_DISABLED=1` in `.env.local` and restart.");
  out.push("- **Reset data:** `DELETE FROM SkillUse; DELETE FROM QueryMatch; DELETE FROM QueryTask; DELETE FROM UserQuery;` (manual SQL).");
  out.push("- **DB location:** `prisma/dev.db` (SQLite). Per-user, local-only. Gitignored.");
  out.push("- **Scorer version captured per query:** see `userQuery.scorerVersion` — useful for distinguishing pre/post SOL-989 query behavior.");
  out.push("");

  console.log(out.join("\n"));
  await prisma.$disconnect();
}

main().catch((err) => {
  console.error("[dogfood-report] failed:", err);
  prisma.$disconnect();
  process.exit(1);
});
