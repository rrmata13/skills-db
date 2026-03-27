# SkillMapper

A web app that indexes AI agent skills from external repositories, categorizes them, and matches them to user tasks using a hybrid ranking engine.

## Features

- **Skill Search** -- Browse and search 251 AI skills from 29 source repositories
- **Single Task Matching** -- Describe a task and get ranked skill recommendations with confidence scores
- **Multi-Task Matching** -- Submit multiple tasks and get skill recommendations for each
- **Plan Mapping** -- Paste a project plan and get a sequenced skill application roadmap
- **Category Browsing** -- Explore skills across 12 categories (coding, chatbot, DevOps, etc.)
- **Admin Dashboard** -- Monitor sync status and trigger data refresh from sources
- **Transparent Scoring** -- See exactly why each skill matched (lexical, semantic, category, popularity)
- **Zod Validation** -- All match API inputs validated with strict schemas

## Quick Start

```bash
# Install dependencies
npm install

# Create database and run migrations
npx prisma migrate dev

# Seed with 251 skills from 29 sources (auto-runs via Prisma seed)
# Or manually: npx tsx prisma/seed.ts

# Start dev server
npm run dev
```

Visit [http://localhost:3000](http://localhost:3000)

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Framework | Next.js 15, App Router, TypeScript |
| Styling | Tailwind CSS 4, shadcn/ui |
| Database | SQLite via Prisma (swap to PostgreSQL with one line) |
| Data Fetching | TanStack Query (client), Prisma (server) |
| Matching | In-memory TF-IDF + rule-based scoring |
| Validation | Zod v4 |
| Testing | Jest + ts-jest |

## Architecture

```
app/                    # Next.js pages and API routes
  api/                  # REST API (9 endpoints)
  match/                # Task matching UI
  plan/                 # Plan mapping UI
  skills/[id]/          # Skill detail pages
  categories/           # Category browser
  admin/                # Sync dashboard

lib/
  adapters/             # Source data adapters
    agent-skills-cc.ts  # Scrapes agent-skills.cc (JSON-LD + meta + RSC)
    github-adapter.ts   # Fetches SKILL.md files from GitHub repos
    mock-adapter.ts     # Fallback mock data
  services/
    matching.ts         # Matching engine orchestrator
    scoring.ts          # Weighted scoring (lexical + TF-IDF + rules)
    parser.ts           # Task/plan text parser
    classifier.ts       # Input type classifier
    embeddings.ts       # TF-IDF vectorizer
    ingestion.ts        # Data sync pipeline

data/
  mock-skills.ts        # Base mock data for 10 original sources
  github-skills.ts      # Skills scraped from GitHub repos (anthropics, composio, kepano, cloudflare)
  openclaw-skills.ts    # 67 OpenClaw bundled + extension + agent skills
  composio-skills.ts    # 111 ComposioHQ curated + app automation skills

types/index.ts          # Shared TypeScript types
prisma/schema.prisma    # Database schema (10 models)
```

## Data Sources

### Primary Sources (10)
| Repository | Author | Stars | Skills |
|-----------|--------|-------|--------|
| openclaw/openclaw | openclaw | 157,597 | 71 |
| composiohq/awesome-claude-skills | ComposioHQ | 30,904 | 111 |
| anthropics/skills | anthropics | 56,673 | 18 |
| astrbotdevs/astrbot | AstrBotDevs | 15,529 | 4 |
| kepano/obsidian-skills | kepano | 9,029 | 5 |
| voltagent/awesome-openclaw-skills | VoltAgent | 7,881 | 3 |
| cloudflare/moltworker | cloudflare | 7,451 | 3 |
| travisvn/awesome-claude-skills | travisvn | 6,125 | 4 |
| nevamind/ai-memu | NevaMind-AI | 5,321 | 3 |
| zhayujie/bot-on-anything | zhayujie | 4,173 | 3 |

### Discovered Sources (19 more)
Including: f/awesome-chatgpt-prompts (142K stars), x1xhlol/system-prompts (108K), anthropics/claude-code (57K), obra/superpowers (46K), upstash/context7 (42K), affaan-m/everything-claude-code (33K), wshobson/agents (27K), and more.

## Matching Algorithm

The scoring engine combines multiple signals:

```
finalScore = 0.55 * lexical + 0.25 * category + 0.12 * popularity + 0.08 * exactMatch
```

When an embedding provider is configured:
```
finalScore = 0.30 * lexical + 0.40 * semantic + 0.15 * category + 0.10 * popularity + 0.05 * exactMatch
```

Each skill receives a human-readable rationale explaining the match.

## API Endpoints

| Method | Path | Description |
|--------|------|-------------|
| GET | `/api/health` | Health check |
| GET | `/api/sources` | List source repositories |
| GET | `/api/skills` | Search/filter skills |
| GET | `/api/skills/[id]` | Skill detail |
| GET | `/api/categories` | Categories with counts |
| POST | `/api/match/task` | Match single task (Zod validated) |
| POST | `/api/match/tasks` | Match multiple tasks (Zod validated) |
| POST | `/api/match/plan` | Map plan to skills (Zod validated) |
| POST | `/api/sync/sources` | Trigger data sync |

## Testing

```bash
npm test          # Run all 31 tests
```

Tests cover:
- Text tokenization and stop word removal
- Single/multi task parsing
- Plan decomposition
- Input classification (single_task, multi_task, plan, deliverable)
- TF-IDF vectorization and cosine similarity
- Scoring weight validation

## Environment Variables

```env
DATABASE_URL="file:./dev.db"         # SQLite (default) or PostgreSQL URL
EMBEDDING_PROVIDER="none"            # "none" | "openai"
OPENAI_API_KEY="sk-..."             # Required if EMBEDDING_PROVIDER="openai"
```

## Scripts

```bash
npm run dev         # Start dev server
npm run build       # Production build
npm test            # Run tests
npm run db:migrate  # Run Prisma migrations
npm run db:seed     # Seed database
npm run db:reset    # Reset database
```

## Design Decisions

1. **SQLite for MVP** -- Zero-config, instant dev. One-line swap to PostgreSQL via Prisma.
2. **In-memory TF-IDF** -- With 251 skills, in-memory scoring gives full control and runs instantly. Upgrade path to pgvector for scale.
3. **Rule-based plan decomposition** -- No external API dependencies. LLM-assisted decomposition as future enhancement.
4. **Mock data fallback** -- System works without internet. Real scraper tries agent-skills.cc first, falls back to mock data.
5. **Embedding abstraction** -- TF-IDF now, swap to OpenAI/Gemini via env var later.
6. **Multi-source deduplication** -- Skills from multiple data files are merged by slug, preventing duplicates.

## Future TODOs

- [ ] Real embedding provider integration (OpenAI text-embedding-3-small)
- [ ] PostgreSQL + pgvector migration for scale
- [ ] LLM-assisted plan decomposition
- [ ] CSV export
- [ ] Skill comparison view (side-by-side top 3)
- [ ] Filter sidebar on match/search pages
- [ ] Pagination in skills UI
- [ ] Admin authentication
- [ ] Fuzzy/typo-tolerant search
- [ ] Synonym map for better matching
- [ ] Skill relationship auto-detection and display
- [ ] Dark/light mode toggle
- [ ] Loading skeletons and toast notifications
