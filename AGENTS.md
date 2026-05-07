# AGENTS.md — master template

This is the canonical conventions file for the Solutions-United product portfolio. Every project gets a copy of this at its root. Edit once here, then sweep across projects when the convention changes.

All agents and humans working on any project in this portfolio read `AGENTS.md` first, then `PLAN.md`.

---

## Tool roles

| Tool | Role | Does |
|---|---|---|
| **Claude Code** (Opus) | Orchestrator + doer | Code edits, tests, commits, git, file ops, full-computer control |
| **Claude in Cowork** | Doer + decision surface | Cross-project scans, docs, planning, dashboards, talks to the human |
| **Codex** | Reviewer (default) + narrow doer | Critiques Claude's diffs; writes code only in the OpenAI-API lane |
| **Antigravity (Gemini)** | Integrator | SEO, marketing, Google Workspace, Search Console, Analytics, Ads, long-context corpus ingestion |
| **Perplexity** | Researcher | Citation-heavy research, competitive intel |
| **VS Code** | Human shell | Where the human (Ruben) runs builds, tests, git from the terminal |

**Copilot is not an agent in this portfolio.** Inline autocomplete only, if at all.

## Ownership rules

- Only **one doer** writes to any given file at a time. If Claude and Codex both want to edit, Codex produces a diff review instead.
- **Codex is reviewer-by-default.** Only Codex owns `[codex-doer]` tasks (OpenAI-API integrations, specific lanes explicitly assigned in `PLAN.md`).
- **Antigravity owns Google-ecosystem tasks.** Anything touching Google Workspace, Analytics, Search Console, Ads, or YouTube APIs.
- **Claude owns everything else that isn't tagged otherwise.**

## `PLAN.md` conventions

Every project has a `PLAN.md` at its root, structured as laid out in `/General/PLAN-TEMPLATE.md`. Rules:

1. **Read `PLAN.md` before any non-trivial work.** It's the project's shared whiteboard.
2. **Update as you work, not only at the end.** Move items between sections in real time.
3. **Tag every task** with both *who* and *risk tier*:
   - Who: `[code]` (Claude Code) · `[cowork]` (Claude Cowork) · `[codex]` · `[codex-review]` · `[antigravity]` · `[perplexity]` · `[human]`
   - Tier: `[T0]` fully automated, no review needed · `[T1]` automated but human-checkpointed before ship · `[T2]` human-only (credentials, approvals, money)
4. **Dates are absolute** (e.g. `2026-04-21`). Never "today" / "next week".
5. **Preserve history.** Move completed items to *Completed*; don't delete for weeks.
6. **Don't silently rewrite the plan.** Add `Handoff notes` bullets when you change direction.
7. **Every finished `[code]` task gets a matching `[codex-review]` entry** in *Next up* before it's called done.

## Rubric (top of every `PLAN.md`)

Each project is scored 1–5 on four dimensions from the Agent Factory thesis. The human sets these; agents flag when a score should be re-evaluated.

- **Pain intensity** — how non-discretionary is the spend?
- **Agentic buildability** — how much of this can agents actually do?
- **Distribution wedge** — how clearly can we reach the first 10 buyers?
- **Time to first revenue** — can we be paid within 8 weeks?

Sum ≥ 16 = greenlight · 12–15 = validate further · < 12 = kill or hibernate.

## Phase (top of every `PLAN.md`)

One of: **Brainstorm · Validate · Build · Ship · Operate · Sunset**.

- Only projects in *Build / Ship / Operate* consume active hours.
- *Validate* gets the rubric-score + 3 customer-dev conversations, then passes or kills.
- *Sunset* projects are kept for reference only; no `[code]` or `[cowork]` work queued.

## Kill-by date

Every project has a `Kill-by` date. Default: 8 weeks from creation. If the project hasn't met its phase exit criteria by that date, it moves to *Sunset* or is archived. The human can extend; agents must not.

## Data moat note

One line per project: what proprietary data does this accumulate, and how does that data make the next version better? If nothing, say so — it's a signal to kill.

## Human-only tasks

These never move to agent lanes, no matter how tempting:
- Vision, positioning, pricing
- Customer-development conversations
- High-trust sales calls
- Public voice (launch posts, social, press)
- Credentials, secrets, signing documents
- Final kill / pivot decisions

## Portfolio-load check

Before starting work on a new project, verify on the portfolio dashboard (see `/General/ROLLUP.md`) that no more than **2 projects** are simultaneously in *Build* phase. If full, queue the new project in *Validate* instead.
