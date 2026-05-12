# SkillMapper Beta — Tester Guide

Thanks for testing. This guide is the first five minutes: get the app running, try the two flows that matter most, and tell us what's wrong. We're optimizing for *"what would actually stop me from using this daily"* — be merciless.

## 1. Setup (about 60 seconds)

```bash
git clone https://github.com/rrmata13/skills-db.git
cd skills-db
npm run setup
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

If `npm run setup` is not available yet on the branch you cloned, follow the [README Quick Start](README.md#quick-start) instead and tell us at which step it broke.

Prereq: Node 20 or newer. Run `node --version` if you're not sure.

## 2. Try task matching (about 1 minute)

1. Visit [http://localhost:3000/match](http://localhost:3000/match).
2. In the **Single Task** tab, paste:
   ```
   deploy a docker container to production
   ```
3. Submit.

You should see roughly ten skill recommendations with per-component scores (lexical, category, popularity, exactMatch) and a one-line rationale on each.

**Tell us:**
- Did the top result feel right for the prompt?
- Did anything obviously irrelevant land in the top three?
- Was the score breakdown / rationale legible, or noise?

## 3. Try Curate (about 2 minutes — the most important flow)

Curate installs matched skills as `SKILL.md` files into your local Claude Code workspace (default `~/.claude/skills/`) so they're available next time you run Claude Code.

1. From the match results in step 2, pick two skills you'd actually use.
2. Visit [http://localhost:3000/curate](http://localhost:3000/curate).
3. Select those two skills and click install.
4. Open a fresh Claude Code session (`claude` in a new terminal — important to be fresh so cached state doesn't mask a load failure).
5. Run `/skills` inside that session. The two skills you just installed should be listed.
6. Try a prompt that should trigger one of them. Does Claude load and use the skill?

**Tell us:**
- Did the install request succeed (or did `/curate` error)?
- Did the skill appear in `/skills`?
- Did Claude actually invoke it on a relevant prompt?
- If a skill did not load: copy the slug, the path it was written to, and any error Claude printed. *This is the highest-signal failure we can hear about.*

## 4. What we most want to hear

Rough priority order:

1. **Things that broke.** Anything that errored, hung, crashed, or never returned. Setup, match, curate, `/skills` listing, the skill itself failing to load — all of it.
2. **Curate failures.** A successful install that doesn't load in Claude Code is the single most important bug class. Capture the slug + Claude's error verbatim.
3. **Top-result wrongness.** A clearly-irrelevant skill at rank #1 for a real-world prompt. Copy the prompt and the top three results.
4. **Friction.** Anything that took longer than it should have, was unclear, or made you go read the README mid-flow.
5. **Polish nits.** Empty states that aren't helpful, error messages that don't help, ugly anything. Last priority; save these for the end of your session.

## 5. How to report

Until SOL-547 picks a dedicated feedback channel, file a GitHub issue at [https://github.com/rrmata13/skills-db/issues](https://github.com/rrmata13/skills-db/issues). One issue per finding so triage doesn't get tangled. Include:

- What you did (exact prompt, clicks, or commands)
- What you expected
- What actually happened (copy errors verbatim — don't paraphrase)
- Environment: Node version, OS, browser if it's a UI bug

If you're not sure whether a thing is a bug or a known scope limit, see Section 6 first.

## 6. Known rough edges — don't bother re-reporting

These are tracked already. If you hit them, that's expected.

- **`npm run build` fails on `/curate`.** Pre-existing Suspense-boundary issue. `npm run dev` works fine; only the production build is affected.
- **GitHub anonymous rate limit.** If you trigger `/api/sync/sources` more than ~60 times in an hour without `GITHUB_TOKEN` in your `.env`, it starts failing. Add a personal access token (no scopes required for purely public-repo reads) to raise the cap to 5,000/hour.
- **No fuzzy or typo-tolerant search.** Exact tokens only for now. `kuburnetes` will not match `kubernetes`. On the roadmap.
- **No admin authentication.** `POST /api/sync/sources` is open in dev. We know. Do not expose to the open internet.
- **`npm install` warns about 14 vulnerabilities.** Transitive deps of the Next 15 toolchain. Tracked, doesn't affect local dev. Don't run `npm audit fix --force`.
- **Prisma 7 deprecation warning** on the `package.json#prisma` block. Cosmetic.

## 7. Out of beta scope

These are explicitly *not* under test right now. Reports here will be deferred:

- Embedding-based semantic search (`EMBEDDING_PROVIDER=openai`). Hooked up but not tuned; quality won't be representative.
- PostgreSQL deployment. SQLite only for the beta.
- CSV export, dark mode, skill comparison view, pagination — listed in README Future TODOs.

## 8. What to do when you're done

Reply to whichever channel routed you here ("done") so we know you've finished a session. We'll fold your findings into the next iteration before opening the beta to the next tester.
