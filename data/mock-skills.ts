import { SourceAdapterResult } from "@/types";

export const MOCK_DATA: SourceAdapterResult[] = [
  // ===========================
  // SOURCE 1: openclaw/openclaw
  // ===========================
  {
    source: {
      slug: "openclaw-openclaw",
      name: "openclaw",
      author: "openclaw",
      sourceUrl: "https://agent-skills.cc/skills/openclaw-openclaw",
      githubUrl: "https://github.com/openclaw/openclaw",
      description: "Your own personal AI assistant. Any OS. Any Platform. The lobster way.",
      rating: 157597,
    },
    skills: [
      {
        name: "OpenClaw Core",
        slug: "openclaw-core",
        description: "Full-featured personal AI assistant framework supporting multiple OS and platforms with extensible skill system.",
        longDescription: "OpenClaw is an open-source personal AI assistant that runs on any operating system and platform. It provides a comprehensive framework for building AI-powered workflows with support for multiple LLM providers, plugin architecture, and cross-platform deployment. Written in TypeScript, MIT licensed.",
        categories: ["multi-agent", "workflow-automation", "coding"],
        tags: ["ai-assistant", "cross-platform", "extensible", "open-source", "llm", "typescript", "mit"],
        capabilities: [
          { capability: "Multi-LLM support", inputType: "text", outputType: "text" },
          { capability: "Plugin system", inputType: "config", outputType: "action" },
          { capability: "Cross-platform deployment", inputType: "config", outputType: "runtime" },
          { capability: "Skill management", inputType: "skill-id", outputType: "installed-skill" },
        ],
        rating: 157597,
        repoUrl: "https://github.com/openclaw/openclaw",
        imageUrl: "https://github.com/openclaw.png",
        authorName: "openclaw",
      },
      {
        name: "OpenClaw Skills Manager",
        slug: "openclaw-skills-manager",
        description: "Built-in skill discovery and management system for the OpenClaw platform.",
        categories: ["skills-collection", "cli-tooling"],
        tags: ["skill-management", "discovery", "marketplace", "curated"],
        capabilities: [
          { capability: "Skill installation", inputType: "skill-id", outputType: "installed-skill" },
          { capability: "Skill search", inputType: "query", outputType: "skill-list" },
        ],
        rating: 80000,
        authorName: "openclaw",
      },
      {
        name: "OpenClaw Workflow Engine",
        slug: "openclaw-workflow-engine",
        description: "Composable workflow engine for chaining AI tasks with conditional logic and parallel execution.",
        categories: ["workflow-automation", "multi-agent"],
        tags: ["workflow", "orchestration", "parallel", "conditional", "task-chaining"],
        capabilities: [
          { capability: "Task chaining", inputType: "task-list", outputType: "results" },
          { capability: "Parallel execution", inputType: "task-list", outputType: "results" },
          { capability: "Conditional branching", inputType: "condition", outputType: "branch" },
        ],
        rating: 60000,
        authorName: "openclaw",
      },
      {
        name: "OpenClaw MCP Integration",
        slug: "openclaw-mcp-integration",
        description: "Model Context Protocol (MCP) server integration for OpenClaw, enabling tool use and external service connections.",
        categories: ["integration", "multi-agent"],
        tags: ["mcp", "mcp-server", "tools", "protocol", "integration"],
        capabilities: [
          { capability: "MCP server hosting", inputType: "config", outputType: "mcp-server" },
          { capability: "Tool registration", inputType: "tool-definition", outputType: "registered-tool" },
        ],
        rating: 50000,
        authorName: "openclaw",
      },
    ],
  },

  // ============================================
  // SOURCE 2: composiohq/awesome-claude-skills
  // ============================================
  {
    source: {
      slug: "composiohq-awesome-claude-skills",
      name: "awesome-claude-skills",
      author: "ComposioHQ",
      sourceUrl: "https://agent-skills.cc/skills/composiohq-awesome-claude-skills",
      githubUrl: "https://github.com/composiohq/awesome-claude-skills",
      description: "A curated list of awesome Claude Skills, resources, and tools for customizing Claude AI workflows",
      rating: 30904,
    },
    skills: [
      {
        name: "Claude Skills Directory",
        slug: "composio-claude-skills-directory",
        description: "Comprehensive curated directory of Claude Code skills organized by category with installation guides.",
        categories: ["skills-collection", "documentation"],
        tags: ["claude-code", "curated-list", "directory", "skills", "python"],
        capabilities: [
          { capability: "Skill discovery", inputType: "category", outputType: "skill-list" },
          { capability: "Installation guides", inputType: "skill-id", outputType: "instructions" },
        ],
        rating: 30904,
        authorName: "ComposioHQ",
        repoUrl: "https://github.com/composiohq/awesome-claude-skills",
      },
      {
        name: "Deep Research Skill",
        slug: "composio-deep-research",
        description: "Claude Code skill for conducting deep, multi-source research on any topic with structured output.",
        categories: ["coding", "documentation"],
        tags: ["research", "deep-research", "analysis", "claude-code"],
        capabilities: [
          { capability: "Multi-source research", inputType: "topic", outputType: "research-report" },
          { capability: "Structured synthesis", inputType: "sources", outputType: "summary" },
        ],
        rating: 15000,
        authorName: "ComposioHQ",
      },
      {
        name: "Test-Driven Development Skill",
        slug: "composio-tdd",
        description: "Enforces test-driven development workflow in Claude Code — write tests first, then implement.",
        categories: ["coding", "workflow-automation"],
        tags: ["tdd", "testing", "test-driven", "claude-code", "quality"],
        capabilities: [
          { capability: "Test generation", inputType: "requirements", outputType: "test-suite" },
          { capability: "TDD workflow", inputType: "feature-spec", outputType: "tested-code" },
        ],
        rating: 12000,
        authorName: "ComposioHQ",
      },
      {
        name: "Root Cause Tracing Skill",
        slug: "composio-root-cause-tracing",
        description: "Systematic root cause analysis skill for debugging complex issues in codebases.",
        categories: ["coding", "workflow-automation"],
        tags: ["debugging", "root-cause", "analysis", "tracing", "claude-code"],
        capabilities: [
          { capability: "Root cause analysis", inputType: "error-description", outputType: "root-cause" },
          { capability: "Fix suggestion", inputType: "diagnosis", outputType: "fix-plan" },
        ],
        rating: 10000,
        authorName: "ComposioHQ",
      },
      {
        name: "Prompt Engineering Skill",
        slug: "composio-prompt-engineering",
        description: "Expert prompt engineering skill for crafting, testing, and optimizing LLM prompts.",
        categories: ["coding", "documentation"],
        tags: ["prompt-engineering", "llm", "optimization", "claude-code"],
        capabilities: [
          { capability: "Prompt crafting", inputType: "goal", outputType: "optimized-prompt" },
          { capability: "Prompt testing", inputType: "prompt", outputType: "evaluation" },
        ],
        rating: 9000,
        authorName: "ComposioHQ",
      },
      {
        name: "Software Architecture Skill",
        slug: "composio-software-architecture",
        description: "Architecture design and review skill for planning system structure, patterns, and trade-offs.",
        categories: ["coding", "documentation"],
        tags: ["architecture", "design", "patterns", "system-design", "claude-code"],
        capabilities: [
          { capability: "Architecture design", inputType: "requirements", outputType: "architecture-plan" },
          { capability: "Design review", inputType: "codebase", outputType: "review-report" },
        ],
        rating: 8000,
        authorName: "ComposioHQ",
      },
      {
        name: "Subagent-Driven Development",
        slug: "composio-subagent-development",
        description: "Orchestrate multiple Claude Code subagents to work on different parts of a task in parallel.",
        categories: ["multi-agent", "workflow-automation"],
        tags: ["subagent", "parallel", "orchestration", "claude-code"],
        capabilities: [
          { capability: "Task decomposition", inputType: "complex-task", outputType: "subtasks" },
          { capability: "Parallel agent execution", inputType: "subtasks", outputType: "results" },
        ],
        rating: 7000,
        authorName: "ComposioHQ",
      },
    ],
  },

  // ===========================
  // SOURCE 3: astrbotdevs/astrbot
  // ===========================
  {
    source: {
      slug: "astrbotdevs-astrbot",
      name: "astrbot",
      author: "AstrBotDevs",
      sourceUrl: "https://agent-skills.cc/skills/astrbotdevs-astrbot",
      githubUrl: "https://github.com/AstrBotDevs/AstrBot",
      description: "Agentic IM Chatbot infrastructure that integrates lots of IM platforms, LLMs, plugins and AI features.",
      rating: 15529,
    },
    skills: [
      {
        name: "AstrBot IM Platform",
        slug: "astrbot-im-platform",
        description: "Multi-platform chatbot infrastructure supporting Telegram, Discord, Slack, WeChat, and more IM platforms.",
        longDescription: "AstrBot is an agentic IM chatbot infrastructure written in Python (AGPL-3.0). It integrates with multiple instant messaging platforms and LLMs, providing plugin support and AI features out of the box.",
        categories: ["chatbot", "integration"],
        tags: ["telegram", "discord", "slack", "wechat", "chatbot", "multi-platform", "python", "agpl"],
        capabilities: [
          { capability: "Multi-platform messaging", inputType: "message", outputType: "response" },
          { capability: "Plugin system", inputType: "plugin-config", outputType: "feature" },
          { capability: "LLM integration", inputType: "prompt", outputType: "completion" },
        ],
        rating: 15529,
        authorName: "AstrBotDevs",
        repoUrl: "https://github.com/AstrBotDevs/AstrBot",
      },
      {
        name: "AstrBot Plugin SDK",
        slug: "astrbot-plugin-sdk",
        description: "SDK for building custom plugins for the AstrBot chatbot platform with hot-reload support.",
        categories: ["chatbot", "coding"],
        tags: ["sdk", "plugin-development", "hot-reload", "python"],
        capabilities: [
          { capability: "Plugin creation", inputType: "code", outputType: "plugin" },
          { capability: "Hot reload", inputType: "plugin", outputType: "runtime" },
        ],
        rating: 8000,
        authorName: "AstrBotDevs",
      },
      {
        name: "AstrBot AI Features",
        slug: "astrbot-ai-features",
        description: "Built-in AI features for AstrBot including image generation, voice synthesis, and content moderation.",
        categories: ["chatbot", "multi-agent"],
        tags: ["image-generation", "voice", "moderation", "ai-features"],
        capabilities: [
          { capability: "Image generation", inputType: "prompt", outputType: "image" },
          { capability: "Voice synthesis", inputType: "text", outputType: "audio" },
          { capability: "Content moderation", inputType: "text", outputType: "moderation-result" },
        ],
        rating: 6000,
        authorName: "AstrBotDevs",
      },
      {
        name: "AstrBot Deployment Kit",
        slug: "astrbot-deployment-kit",
        description: "Docker-based deployment toolkit for AstrBot with auto-scaling and health monitoring.",
        categories: ["devops", "chatbot"],
        tags: ["docker", "deployment", "monitoring", "auto-scaling"],
        capabilities: [
          { capability: "Docker deployment", inputType: "config", outputType: "container" },
          { capability: "Health monitoring", inputType: "endpoint", outputType: "status" },
        ],
        rating: 4000,
        authorName: "AstrBotDevs",
      },
    ],
  },

  // ===========================
  // SOURCE 4: kepano/obsidian-skills
  // ===========================
  {
    source: {
      slug: "kepano-obsidian-skills",
      name: "obsidian-skills",
      author: "kepano",
      sourceUrl: "https://agent-skills.cc/skills/kepano-obsidian-skills",
      githubUrl: "https://github.com/kepano/obsidian-skills",
      description: "Agent skills for Obsidian",
      rating: 9029,
    },
    skills: [
      {
        name: "Obsidian Note Skills",
        slug: "obsidian-note-skills",
        description: "Agent skills for managing Obsidian vaults — create, edit, search, and organize notes with AI assistance.",
        categories: ["knowledge-management", "documentation"],
        tags: ["obsidian", "notes", "vault", "markdown", "pkm", "mit"],
        capabilities: [
          { capability: "Note creation", inputType: "text", outputType: "note" },
          { capability: "Note search", inputType: "query", outputType: "note-list" },
          { capability: "Vault organization", inputType: "rules", outputType: "organized-vault" },
        ],
        rating: 9029,
        authorName: "kepano",
        repoUrl: "https://github.com/kepano/obsidian-skills",
      },
      {
        name: "Obsidian Canvas Skills",
        slug: "obsidian-canvas-skills",
        description: "AI-powered canvas manipulation skills for creating visual knowledge maps and diagrams in Obsidian.",
        categories: ["knowledge-management", "documentation"],
        tags: ["obsidian", "canvas", "visual", "diagrams", "knowledge-graph"],
        capabilities: [
          { capability: "Canvas creation", inputType: "structure", outputType: "canvas" },
          { capability: "Knowledge mapping", inputType: "notes", outputType: "visual-map" },
        ],
        rating: 5000,
        authorName: "kepano",
      },
      {
        name: "Obsidian Template Skills",
        slug: "obsidian-template-skills",
        description: "Dynamic template generation and management skills for Obsidian using AI-powered content expansion.",
        categories: ["knowledge-management", "workflow-automation"],
        tags: ["obsidian", "templates", "automation", "content-generation"],
        capabilities: [
          { capability: "Template generation", inputType: "schema", outputType: "template" },
          { capability: "Content expansion", inputType: "outline", outputType: "expanded-content" },
        ],
        rating: 4000,
        authorName: "kepano",
      },
      {
        name: "Obsidian Dataview Skills",
        slug: "obsidian-dataview-skills",
        description: "Skills for creating and managing Dataview queries, dashboards, and data-driven notes in Obsidian.",
        categories: ["knowledge-management", "coding"],
        tags: ["obsidian", "dataview", "queries", "dashboards", "data"],
        capabilities: [
          { capability: "Dataview query generation", inputType: "natural-language", outputType: "dataview-query" },
          { capability: "Dashboard creation", inputType: "data-schema", outputType: "dashboard" },
        ],
        rating: 3500,
        authorName: "kepano",
      },
    ],
  },

  // =============================================
  // SOURCE 5: voltagent/awesome-openclaw-skills
  // =============================================
  {
    source: {
      slug: "voltagent-awesome-openclaw-skills",
      name: "awesome-openclaw-skills",
      author: "VoltAgent",
      sourceUrl: "https://agent-skills.cc/skills/voltagent-awesome-openclaw-skills",
      githubUrl: "https://github.com/voltagent/awesome-openclaw-skills",
      description: "The awesome collection of OpenClaw Skills. Formerly known as Moltbot, originally Clawdbot.",
      rating: 7881,
    },
    skills: [
      {
        name: "VoltAgent Skills Collection",
        slug: "voltagent-skills-collection",
        description: "Curated collection of OpenClaw skills covering coding, DevOps, documentation, and productivity workflows.",
        categories: ["skills-collection", "workflow-automation"],
        tags: ["openclaw", "curated", "collection", "productivity", "mit"],
        capabilities: [
          { capability: "Skill discovery", inputType: "category", outputType: "skill-list" },
          { capability: "Workflow templates", inputType: "use-case", outputType: "workflow" },
        ],
        rating: 7881,
        authorName: "VoltAgent",
        repoUrl: "https://github.com/voltagent/awesome-openclaw-skills",
      },
      {
        name: "VoltAgent DevOps Skills",
        slug: "voltagent-devops-skills",
        description: "DevOps-focused skills for CI/CD pipeline management, container orchestration, and infrastructure as code.",
        categories: ["devops", "cloud-platform"],
        tags: ["ci-cd", "docker", "kubernetes", "infrastructure", "deployment"],
        capabilities: [
          { capability: "Pipeline management", inputType: "config", outputType: "pipeline" },
          { capability: "Container orchestration", inputType: "manifest", outputType: "deployment" },
        ],
        rating: 5000,
        authorName: "VoltAgent",
      },
      {
        name: "VoltAgent Code Review Skills",
        slug: "voltagent-code-review",
        description: "Automated code review skills with security scanning, style checking, and improvement suggestions.",
        categories: ["coding", "workflow-automation"],
        tags: ["code-review", "security", "linting", "best-practices"],
        capabilities: [
          { capability: "Code review", inputType: "code-diff", outputType: "review-comments" },
          { capability: "Security scan", inputType: "codebase", outputType: "vulnerability-report" },
        ],
        rating: 4000,
        authorName: "VoltAgent",
      },
    ],
  },

  // ===========================
  // SOURCE 6: cloudflare/moltworker
  // ===========================
  {
    source: {
      slug: "cloudflare-moltworker",
      name: "moltworker",
      author: "cloudflare",
      sourceUrl: "https://agent-skills.cc/skills/cloudflare-moltworker",
      githubUrl: "https://github.com/cloudflare/moltworker",
      description: "Run OpenClaw on Cloudflare Workers",
      rating: 7451,
    },
    skills: [
      {
        name: "MoltWorker Runtime",
        slug: "moltworker-runtime",
        description: "Deploy and run OpenClaw agents on Cloudflare Workers with edge computing and global distribution. Experimental proof of concept.",
        longDescription: "Run OpenClaw (formerly Moltbot, formerly Clawdbot) personal AI assistant in a Cloudflare Sandbox. Written in TypeScript, Apache-2.0 licensed.",
        categories: ["cloud-platform", "devops"],
        tags: ["cloudflare", "workers", "edge-computing", "serverless", "deployment", "typescript", "apache-2"],
        capabilities: [
          { capability: "Edge deployment", inputType: "worker-config", outputType: "deployed-worker" },
          { capability: "Global distribution", inputType: "config", outputType: "cdn-deployment" },
          { capability: "Serverless execution", inputType: "function", outputType: "result" },
        ],
        rating: 7451,
        authorName: "cloudflare",
        repoUrl: "https://github.com/cloudflare/moltworker",
      },
      {
        name: "MoltWorker KV Storage",
        slug: "moltworker-kv-storage",
        description: "Key-value storage integration for MoltWorker agents using Cloudflare KV for persistent state.",
        categories: ["cloud-platform", "memory"],
        tags: ["cloudflare", "kv-storage", "persistence", "state-management"],
        capabilities: [
          { capability: "State persistence", inputType: "key-value", outputType: "stored-state" },
          { capability: "Cache management", inputType: "cache-config", outputType: "cached-data" },
        ],
        rating: 4000,
        authorName: "cloudflare",
      },
      {
        name: "Cloudflare Browser Rendering",
        slug: "cloudflare-browser-rendering",
        description: "Browser rendering and web scraping capabilities powered by Cloudflare's Browser Rendering API.",
        categories: ["cloud-platform", "integration"],
        tags: ["cloudflare", "browser", "rendering", "scraping", "puppeteer"],
        capabilities: [
          { capability: "Browser rendering", inputType: "url", outputType: "rendered-page" },
          { capability: "Web scraping", inputType: "url", outputType: "extracted-data" },
          { capability: "Screenshot capture", inputType: "url", outputType: "screenshot" },
        ],
        rating: 3500,
        authorName: "cloudflare",
      },
    ],
  },

  // =============================================
  // SOURCE 7: travisvn/awesome-claude-skills
  // =============================================
  {
    source: {
      slug: "travisvn-awesome-claude-skills",
      name: "awesome-claude-skills",
      author: "travisvn",
      sourceUrl: "https://agent-skills.cc/skills/travisvn-awesome-claude-skills",
      githubUrl: "https://github.com/travisvn/awesome-claude-skills",
      description: "A curated list of awesome Claude Skills, resources, and tools for customizing Claude AI workflows — particularly Claude Code",
      rating: 6125,
    },
    skills: [
      {
        name: "Travis Claude Skills Guide",
        slug: "travis-claude-skills-guide",
        description: "Comprehensive guide and curated list of Claude Code skills with detailed usage instructions and best practices.",
        categories: ["skills-collection", "documentation"],
        tags: ["claude-code", "guide", "best-practices", "curated-list"],
        capabilities: [
          { capability: "Skill documentation", inputType: "skill-name", outputType: "documentation" },
          { capability: "Best practices guide", inputType: "topic", outputType: "guide" },
        ],
        rating: 6125,
        authorName: "travisvn",
        repoUrl: "https://github.com/travisvn/awesome-claude-skills",
      },
      {
        name: "Claude Code Workflow Skills",
        slug: "claude-code-workflow-skills",
        description: "Pre-configured workflow skills for common Claude Code tasks like code review, refactoring, and testing.",
        categories: ["coding", "workflow-automation"],
        tags: ["claude-code", "code-review", "refactoring", "testing", "workflow"],
        capabilities: [
          { capability: "Code review", inputType: "code", outputType: "review" },
          { capability: "Automated refactoring", inputType: "code", outputType: "refactored-code" },
          { capability: "Test generation", inputType: "code", outputType: "tests" },
        ],
        rating: 4000,
        authorName: "travisvn",
      },
      {
        name: "Web Artifacts Builder",
        slug: "travis-web-artifacts-builder",
        description: "Claude Code skill for building interactive web artifacts — HTML, CSS, JS components with live preview.",
        categories: ["coding", "documentation"],
        tags: ["web", "html", "css", "javascript", "artifacts", "preview"],
        capabilities: [
          { capability: "Web component building", inputType: "description", outputType: "html-artifact" },
          { capability: "Live preview", inputType: "code", outputType: "rendered-preview" },
        ],
        rating: 3500,
        authorName: "travisvn",
      },
      {
        name: "MCP Builder Skill",
        slug: "travis-mcp-builder",
        description: "Skill for scaffolding and building Model Context Protocol (MCP) servers with Claude Code.",
        categories: ["coding", "integration"],
        tags: ["mcp", "mcp-server", "scaffolding", "claude-code"],
        capabilities: [
          { capability: "MCP server scaffolding", inputType: "spec", outputType: "mcp-project" },
          { capability: "Tool definition", inputType: "tool-spec", outputType: "mcp-tool" },
        ],
        rating: 3000,
        authorName: "travisvn",
      },
    ],
  },

  // ===========================
  // SOURCE 8: nevamind/ai-memu
  // ===========================
  {
    source: {
      slug: "nevamind-ai-memu",
      name: "ai-memu",
      author: "NevaMind-AI",
      sourceUrl: "https://agent-skills.cc/skills/nevamind-ai-memu",
      githubUrl: "https://github.com/NevaMind-AI/memU",
      description: "Memory for 24/7 proactive agents like openclaw.",
      rating: 5321,
    },
    skills: [
      {
        name: "memU Memory System",
        slug: "memu-memory-system",
        description: "Persistent memory system for AI agents with semantic search, context recall, and memory consolidation. Written in Python.",
        categories: ["memory", "multi-agent"],
        tags: ["memory", "persistence", "semantic-search", "context", "recall", "python"],
        capabilities: [
          { capability: "Memory storage", inputType: "text", outputType: "stored-memory" },
          { capability: "Semantic recall", inputType: "query", outputType: "relevant-memories" },
          { capability: "Memory consolidation", inputType: "memories", outputType: "consolidated-memory" },
        ],
        rating: 5321,
        authorName: "NevaMind-AI",
        repoUrl: "https://github.com/NevaMind-AI/memU",
      },
      {
        name: "memU Proactive Agent",
        slug: "memu-proactive-agent",
        description: "24/7 proactive agent capability with scheduled tasks, event-driven actions, and autonomous behavior.",
        categories: ["memory", "workflow-automation"],
        tags: ["proactive", "scheduling", "autonomous", "24-7", "event-driven"],
        capabilities: [
          { capability: "Scheduled execution", inputType: "schedule", outputType: "execution-result" },
          { capability: "Event listening", inputType: "event-config", outputType: "triggered-action" },
          { capability: "Autonomous planning", inputType: "goal", outputType: "action-plan" },
        ],
        rating: 3000,
        authorName: "NevaMind-AI",
      },
      {
        name: "memU Context Window",
        slug: "memu-context-window",
        description: "Intelligent context window management that prioritizes the most relevant memories for the current task.",
        categories: ["memory", "coding"],
        tags: ["context", "window", "prioritization", "relevance"],
        capabilities: [
          { capability: "Context prioritization", inputType: "task-context", outputType: "ranked-memories" },
          { capability: "Window optimization", inputType: "token-budget", outputType: "optimized-context" },
        ],
        rating: 2500,
        authorName: "NevaMind-AI",
      },
    ],
  },

  // ===========================
  // SOURCE 9: zhayujie/bot-on-anything
  // ===========================
  {
    source: {
      slug: "zhayujie-bot-on-anything",
      name: "bot-on-anything",
      author: "zhayujie",
      sourceUrl: "https://agent-skills.cc/skills/zhayujie-bot-on-anything",
      githubUrl: "https://github.com/zhayujie/bot-on-anything",
      description: "A large model-based chatbot builder that can quickly integrate AI models (including ChatGPT, Claude, Gemini) into various software applications.",
      rating: 4173,
    },
    skills: [
      {
        name: "Bot-on-Anything Builder",
        slug: "bot-on-anything-builder",
        description: "Rapid chatbot builder for integrating LLMs (ChatGPT, Claude, Gemini) into Telegram, Gmail, Slack, and websites. Written in Python, MIT licensed.",
        categories: ["chatbot", "integration"],
        tags: ["chatbot-builder", "telegram", "gmail", "slack", "website", "llm-integration", "python", "mit"],
        capabilities: [
          { capability: "Chatbot creation", inputType: "config", outputType: "chatbot" },
          { capability: "Multi-model support", inputType: "model-config", outputType: "ai-response" },
          { capability: "Platform deployment", inputType: "platform-config", outputType: "deployed-bot" },
        ],
        rating: 4173,
        authorName: "zhayujie",
        repoUrl: "https://github.com/zhayujie/bot-on-anything",
      },
      {
        name: "Bot-on-Anything Connectors",
        slug: "bot-on-anything-connectors",
        description: "Pre-built connectors for popular platforms: Telegram, Discord, Slack, Gmail, websites, and custom APIs.",
        categories: ["integration", "chatbot"],
        tags: ["connectors", "telegram", "discord", "gmail", "api", "messaging"],
        capabilities: [
          { capability: "Platform connection", inputType: "credentials", outputType: "connected-platform" },
          { capability: "Message routing", inputType: "message", outputType: "routed-response" },
        ],
        rating: 3000,
        authorName: "zhayujie",
      },
      {
        name: "Bot-on-Anything Voice",
        slug: "bot-on-anything-voice",
        description: "Voice interaction module for Bot-on-Anything supporting speech-to-text and text-to-speech across platforms.",
        categories: ["chatbot", "integration"],
        tags: ["voice", "speech-to-text", "text-to-speech", "audio"],
        capabilities: [
          { capability: "Speech recognition", inputType: "audio", outputType: "text" },
          { capability: "Voice synthesis", inputType: "text", outputType: "audio" },
        ],
        rating: 2000,
        authorName: "zhayujie",
      },
    ],
  },

  // ===========================
  // SOURCE 10: x/cmd-x-cmd
  // ===========================
  {
    source: {
      slug: "x-cmd-x-cmd",
      name: "cmd-x-cmd",
      author: "x-cmd",
      sourceUrl: "https://agent-skills.cc/skills/x-cmd-x-cmd",
      githubUrl: "https://github.com/x-cmd/x-cmd",
      description: "Best Buddy for AI Agents like Claude Code. Bootstrap 1000+ command line tools in seconds.",
      rating: 3968,
    },
    skills: [
      {
        name: "X-CMD Tool Bootstrap",
        slug: "x-cmd-tool-bootstrap",
        description: "Bootstrap and manage 1000+ command-line tools instantly without system-wide installation. Written in Shell, AGPL-3.0.",
        categories: ["cli-tooling", "devops"],
        tags: ["cli", "tools", "bootstrap", "package-manager", "portable", "shell", "agpl"],
        capabilities: [
          { capability: "Tool installation", inputType: "tool-name", outputType: "installed-tool" },
          { capability: "Environment setup", inputType: "tool-list", outputType: "configured-env" },
          { capability: "Version management", inputType: "tool-version", outputType: "installed-version" },
        ],
        rating: 3968,
        authorName: "x-cmd",
        repoUrl: "https://github.com/x-cmd/x-cmd",
      },
      {
        name: "X-CMD Shell Enhancements",
        slug: "x-cmd-shell-enhancements",
        description: "Shell productivity enhancements with intelligent completions, aliases, and workflow shortcuts for developers.",
        categories: ["cli-tooling", "coding"],
        tags: ["shell", "completions", "aliases", "productivity", "zsh", "bash"],
        capabilities: [
          { capability: "Shell completion", inputType: "command", outputType: "completions" },
          { capability: "Alias management", inputType: "alias-config", outputType: "configured-aliases" },
        ],
        rating: 2500,
        authorName: "x-cmd",
      },
      {
        name: "X-CMD AI Agent Toolkit",
        slug: "x-cmd-ai-agent-toolkit",
        description: "Command-line toolkit optimized for AI agents with structured output, error handling, and tool composition.",
        categories: ["cli-tooling", "multi-agent"],
        tags: ["ai-agent", "toolkit", "structured-output", "composition"],
        capabilities: [
          { capability: "Structured CLI output", inputType: "command", outputType: "json" },
          { capability: "Tool composition", inputType: "tool-chain", outputType: "composed-result" },
        ],
        rating: 2000,
        authorName: "x-cmd",
      },
    ],
  },
];

// ===========================
// DISCOVERED RELATED SKILLS
// (from agent-skills.cc cross-links)
// ===========================
export const DISCOVERED_SKILLS: SourceAdapterResult[] = [
  {
    source: {
      slug: "upstash-context7",
      name: "context7",
      author: "upstash",
      sourceUrl: "https://agent-skills.cc/skills/upstash-context7",
      githubUrl: "https://github.com/upstash/context7",
      description: "Context7 MCP Server — Up-to-date code documentation for LLMs and AI code editors",
      rating: 42032,
    },
    skills: [
      {
        name: "Context7 MCP Server",
        slug: "context7-mcp-server",
        description: "MCP Server providing up-to-date code documentation for LLMs and AI code editors. Ensures AI tools have current library docs.",
        categories: ["documentation", "integration"],
        tags: ["mcp", "mcp-server", "documentation", "llm", "vibe-coding", "typescript", "mit"],
        capabilities: [
          { capability: "Live documentation", inputType: "library-name", outputType: "current-docs" },
          { capability: "Context injection", inputType: "query", outputType: "relevant-docs" },
        ],
        rating: 42032,
        authorName: "upstash",
        repoUrl: "https://github.com/upstash/context7",
      },
    ],
  },
  {
    source: {
      slug: "anthropics-skills",
      name: "skills",
      author: "anthropics",
      sourceUrl: "https://agent-skills.cc/skills/anthropics-skills",
      githubUrl: "https://github.com/anthropics/skills",
      description: "Public repository for Agent Skills",
      rating: 56673,
    },
    skills: [
      {
        name: "Anthropic Official Skills",
        slug: "anthropic-official-skills",
        description: "Official public repository of agent skills from Anthropic for Claude Code and Claude agents.",
        categories: ["skills-collection", "coding"],
        tags: ["anthropic", "official", "claude-code", "agent-skills", "python"],
        capabilities: [
          { capability: "Official skill library", inputType: "skill-name", outputType: "skill-definition" },
          { capability: "Skill templates", inputType: "category", outputType: "skill-template" },
        ],
        rating: 56673,
        authorName: "anthropics",
        repoUrl: "https://github.com/anthropics/skills",
      },
    ],
  },
  {
    source: {
      slug: "anthropics-claude-code",
      name: "claude-code",
      author: "anthropics",
      sourceUrl: "https://agent-skills.cc/skills/anthropics-claude-code",
      githubUrl: "https://github.com/anthropics/claude-code",
      description: "Claude Code is an agentic coding tool that lives in your terminal, understands your codebase, and helps you code faster.",
      rating: 56749,
    },
    skills: [
      {
        name: "Claude Code CLI",
        slug: "claude-code-cli",
        description: "Agentic coding tool that lives in your terminal — understands your codebase, executes routine tasks, explains code, and handles git workflows through natural language.",
        categories: ["coding", "cli-tooling"],
        tags: ["claude-code", "terminal", "agentic", "coding", "git", "shell", "mit"],
        capabilities: [
          { capability: "Code generation", inputType: "natural-language", outputType: "code" },
          { capability: "Codebase understanding", inputType: "codebase", outputType: "explanation" },
          { capability: "Git workflow", inputType: "command", outputType: "git-action" },
        ],
        rating: 56749,
        authorName: "anthropics",
        repoUrl: "https://github.com/anthropics/claude-code",
      },
    ],
  },
  {
    source: {
      slug: "f-awesome-chatgpt-prompts",
      name: "awesome-chatgpt-prompts",
      author: "f",
      sourceUrl: "https://agent-skills.cc/skills/f-awesome-chatgpt-prompts",
      githubUrl: "https://github.com/f/awesome-chatgpt-prompts",
      description: "Share, discover, and collect prompts from the community. Free and open source.",
      rating: 142366,
    },
    skills: [
      {
        name: "Awesome ChatGPT Prompts",
        slug: "awesome-chatgpt-prompts",
        description: "Community-driven prompt collection — share, discover, and collect prompts for ChatGPT, Claude, and other LLMs. Self-hostable with complete privacy.",
        categories: ["skills-collection", "documentation"],
        tags: ["prompts", "chatgpt", "community", "open-source", "typescript", "apache-2", "chatbot", "language"],
        capabilities: [
          { capability: "Prompt discovery", inputType: "category", outputType: "prompt-list" },
          { capability: "Prompt sharing", inputType: "prompt", outputType: "published-prompt" },
        ],
        rating: 142366,
        authorName: "f",
        repoUrl: "https://github.com/f/awesome-chatgpt-prompts",
      },
    ],
  },
  {
    source: {
      slug: "affaan-m-everything-claude-code",
      name: "everything-claude-code",
      author: "affaan-m",
      sourceUrl: "https://agent-skills.cc/skills/affaan-m-everything-claude-code",
      githubUrl: "https://github.com/affaan-m/everything-claude-code",
      description: "Complete Claude Code configuration collection — agents, skills, hooks, commands, rules, MCPs. Battle-tested configs from an Anthropic hackathon winner.",
      rating: 33322,
    },
    skills: [
      {
        name: "Everything Claude Code",
        slug: "everything-claude-code",
        description: "Complete Claude Code configuration collection — agents, skills, hooks, commands, rules, MCPs. Battle-tested configs from an Anthropic hackathon winner.",
        categories: ["skills-collection", "coding"],
        tags: ["claude-code", "config", "agents", "hooks", "mcp", "battle-tested", "javascript", "mit"],
        capabilities: [
          { capability: "Config templates", inputType: "project-type", outputType: "claude-config" },
          { capability: "Agent definitions", inputType: "use-case", outputType: "agent-config" },
          { capability: "Hook setup", inputType: "event", outputType: "hook-config" },
        ],
        rating: 33322,
        authorName: "affaan-m",
        repoUrl: "https://github.com/affaan-m/everything-claude-code",
      },
    ],
  },
  {
    source: {
      slug: "obra-superpowers",
      name: "superpowers",
      author: "obra",
      sourceUrl: "https://agent-skills.cc/skills/obra-superpowers",
      githubUrl: "https://github.com/obra/superpowers",
      description: "An agentic skills framework & software development methodology that works.",
      rating: 45537,
    },
    skills: [
      {
        name: "Superpowers Framework",
        slug: "superpowers-framework",
        description: "Agentic skills framework and software development methodology — a structured approach to building with AI agents that actually works.",
        categories: ["coding", "workflow-automation"],
        tags: ["framework", "methodology", "agentic", "development", "shell", "mit"],
        capabilities: [
          { capability: "Development methodology", inputType: "project-goals", outputType: "methodology-plan" },
          { capability: "Skill composition", inputType: "skill-list", outputType: "composed-workflow" },
        ],
        rating: 45537,
        authorName: "obra",
        repoUrl: "https://github.com/obra/superpowers",
      },
    ],
  },
  {
    source: {
      slug: "ruvnet-claude-flow",
      name: "claude-flow",
      author: "ruvnet",
      sourceUrl: "https://agent-skills.cc/skills/ruvnet-claude-flow",
      githubUrl: "https://github.com/ruvnet/claude-flow",
      description: "The leading agent orchestration platform for Claude. Deploy intelligent multi-agent swarms.",
      rating: 13159,
    },
    skills: [
      {
        name: "Claude Flow Orchestrator",
        slug: "claude-flow-orchestrator",
        description: "Agent orchestration platform for Claude — deploy intelligent multi-agent swarms, coordinate autonomous workflows, with RAG integration and MCP support.",
        categories: ["multi-agent", "workflow-automation"],
        tags: ["orchestration", "multi-agent", "swarm", "rag", "mcp", "autonomous", "typescript"],
        capabilities: [
          { capability: "Multi-agent orchestration", inputType: "agent-config", outputType: "swarm" },
          { capability: "Autonomous workflow", inputType: "goal", outputType: "executed-workflow" },
          { capability: "RAG integration", inputType: "knowledge-base", outputType: "augmented-context" },
        ],
        rating: 13159,
        authorName: "ruvnet",
        repoUrl: "https://github.com/ruvnet/claude-flow",
      },
    ],
  },
  {
    source: {
      slug: "yamadashy-repomix",
      name: "repomix",
      author: "yamadashy",
      sourceUrl: "https://agent-skills.cc/skills/yamadashy-repomix",
      githubUrl: "https://github.com/yamadashy/repomix",
      description: "Repomix packs your entire repository into a single, AI-friendly file. Perfect for feeding your codebase to LLMs.",
      rating: 21222,
    },
    skills: [
      {
        name: "Repomix Codebase Packer",
        slug: "repomix-codebase-packer",
        description: "Packs your entire repository into a single, AI-friendly file — perfect for feeding your codebase to LLMs like Claude, ChatGPT, Gemini, and DeepSeek.",
        categories: ["coding", "cli-tooling"],
        tags: ["codebase", "packing", "llm", "context", "developer-tools", "typescript", "mit"],
        capabilities: [
          { capability: "Repository packing", inputType: "repo-path", outputType: "packed-file" },
          { capability: "Token optimization", inputType: "codebase", outputType: "optimized-context" },
        ],
        rating: 21222,
        authorName: "yamadashy",
        repoUrl: "https://github.com/yamadashy/repomix",
      },
    ],
  },
  {
    source: {
      slug: "campfirein-cipher",
      name: "cipher",
      author: "campfirein",
      sourceUrl: "https://agent-skills.cc/skills/campfirein-cipher",
      githubUrl: "https://github.com/campfirein/cipher",
      description: "Byterover Cipher is an opensource memory layer for coding agents. Compatible with Cursor, Codex, Claude Code, Windsurf, and more.",
      rating: 3436,
    },
    skills: [
      {
        name: "Cipher Memory Layer",
        slug: "cipher-memory-layer",
        description: "Open-source memory layer for coding agents — compatible with Cursor, Codex, Claude Code, Windsurf, Cline, Gemini CLI, Kiro, and more through MCP.",
        categories: ["memory", "coding"],
        tags: ["memory", "coding-agent", "mcp", "cursor", "codex", "vibe-coding", "typescript", "apache-2"],
        capabilities: [
          { capability: "Agent memory", inputType: "context", outputType: "persistent-memory" },
          { capability: "Cross-editor support", inputType: "editor", outputType: "memory-integration" },
        ],
        rating: 3436,
        authorName: "campfirein",
        repoUrl: "https://github.com/campfirein/cipher",
      },
    ],
  },
  {
    source: {
      slug: "x1xhlol-system-prompts-and-models-of-ai-tools",
      name: "system-prompts-and-models-of-ai-tools",
      author: "x1xhlol",
      sourceUrl: "https://agent-skills.cc/skills/x1xhlol-system-prompts-and-models-of-ai-tools",
      githubUrl: "https://github.com/x1xhlol/system-prompts-and-models-of-ai-tools",
      description: "FULL system prompts, internal tools & AI models for Augment Code, Claude Code, Cursor, Devin AI, Windsurf, Replit, v0, and 20+ more AI tools.",
      rating: 108357,
    },
    skills: [
      {
        name: "AI Tools System Prompts Collection",
        slug: "ai-tools-system-prompts",
        description: "Complete collection of system prompts, internal tools, and AI models from 30+ AI coding tools including Claude Code, Cursor, Devin, Windsurf, Replit, v0, and more.",
        categories: ["skills-collection", "documentation"],
        tags: ["system-prompts", "cursor", "devin", "windsurf", "replit", "v0", "lovable", "bolt", "gpl"],
        capabilities: [
          { capability: "Prompt reference", inputType: "tool-name", outputType: "system-prompt" },
          { capability: "Tool comparison", inputType: "tool-list", outputType: "comparison" },
        ],
        rating: 108357,
        authorName: "x1xhlol",
        repoUrl: "https://github.com/x1xhlol/system-prompts-and-models-of-ai-tools",
      },
    ],
  },
  {
    source: {
      slug: "nextlevelbuilder-ui-ux-pro-max-skill",
      name: "ui-ux-pro-max-skill",
      author: "nextlevelbuilder",
      sourceUrl: "https://agent-skills.cc/skills/nextlevelbuilder-ui-ux-pro-max-skill",
      githubUrl: "https://github.com/nextlevelbuilder/ui-ux-pro-max-skill",
      description: "An AI SKILL that provides design intelligence for building professional UI/UX on multiple platforms.",
      rating: 24362,
    },
    skills: [
      {
        name: "UI/UX Pro Max Skill",
        slug: "ui-ux-pro-max-skill",
        description: "AI skill providing design intelligence for building professional UI/UX — dashboard templates, landing pages, mobile UI with React, Tailwind, and more.",
        categories: ["coding", "documentation"],
        tags: ["ui-design", "ux", "react", "tailwindcss", "dashboard", "landing-page", "mobile-ui", "python", "mit"],
        capabilities: [
          { capability: "UI design generation", inputType: "requirements", outputType: "ui-code" },
          { capability: "Design system", inputType: "brand-config", outputType: "component-library" },
          { capability: "Responsive layouts", inputType: "wireframe", outputType: "responsive-code" },
        ],
        rating: 24362,
        authorName: "nextlevelbuilder",
        repoUrl: "https://github.com/nextlevelbuilder/ui-ux-pro-max-skill",
      },
    ],
  },
  {
    source: {
      slug: "mixedbread-ai-mgrep",
      name: "mgrep",
      author: "mixedbread-ai",
      sourceUrl: "https://agent-skills.cc/skills/mixedbread-ai-mgrep",
      githubUrl: "https://github.com/mixedbread-ai/mgrep",
      description: "A calm, CLI-native way to semantically grep everything — code, images, PDFs, and more.",
      rating: 2768,
    },
    skills: [
      {
        name: "mgrep Semantic Search",
        slug: "mgrep-semantic-search",
        description: "CLI-native semantic grep for code, images, PDFs, and more — find what you mean, not just what you type.",
        categories: ["cli-tooling", "coding"],
        tags: ["semantic-search", "grep", "cli", "pdf", "images", "typescript", "apache-2"],
        capabilities: [
          { capability: "Semantic code search", inputType: "natural-language", outputType: "search-results" },
          { capability: "Multi-format search", inputType: "query", outputType: "matched-files" },
        ],
        rating: 2768,
        authorName: "mixedbread-ai",
        repoUrl: "https://github.com/mixedbread-ai/mgrep",
      },
    ],
  },
  {
    source: {
      slug: "wshobson-agents",
      name: "agents",
      author: "wshobson",
      sourceUrl: "https://agent-skills.cc/skills/wshobson-agents",
      githubUrl: "https://github.com/wshobson/agents",
      description: "Intelligent automation and multi-agent orchestration for Claude Code.",
      rating: 27122,
    },
    skills: [
      {
        name: "WSH Agents Orchestration",
        slug: "wsh-agents-orchestration",
        description: "Intelligent automation and multi-agent orchestration for Claude Code — subagents, workflows, and plugin-based skills.",
        categories: ["multi-agent", "workflow-automation"],
        tags: ["orchestration", "subagents", "workflows", "claude-code", "automation", "mit"],
        capabilities: [
          { capability: "Agent orchestration", inputType: "task", outputType: "multi-agent-result" },
          { capability: "Subagent management", inputType: "agent-config", outputType: "managed-agents" },
          { capability: "Workflow automation", inputType: "workflow-def", outputType: "executed-workflow" },
        ],
        rating: 27122,
        authorName: "wshobson",
        repoUrl: "https://github.com/wshobson/agents",
      },
    ],
  },
  {
    source: {
      slug: "mattbx-shadcn-skills",
      name: "shadcn-skills",
      author: "mattbx",
      sourceUrl: "https://agent-skills.cc/skills/mattbx-shadcn-skills",
      githubUrl: "https://github.com/mattbx/shadcn-skills",
      description: "Skills for building better shadcn/ui apps. Discover 1,500+ existing components before building custom.",
      rating: 3000,
    },
    skills: [
      {
        name: "shadcn/ui Skills",
        slug: "shadcn-ui-skills",
        description: "Skills for building better shadcn/ui apps — discover 1,500+ existing components before building custom, review against shadcn patterns and theme styles.",
        categories: ["coding", "documentation"],
        tags: ["shadcn", "ui", "components", "react", "tailwindcss", "mit"],
        capabilities: [
          { capability: "Component discovery", inputType: "ui-need", outputType: "existing-components" },
          { capability: "Pattern review", inputType: "component-code", outputType: "review" },
        ],
        rating: 3000,
        authorName: "mattbx",
        repoUrl: "https://github.com/mattbx/shadcn-skills",
      },
    ],
  },
  {
    source: {
      slug: "rocccccc-hub-ued-copilot",
      name: "ued-copilot",
      author: "Rocccccc-hub",
      sourceUrl: "https://agent-skills.cc/skills/rocccccc-hub-ued-copilot",
      githubUrl: "https://github.com/Rocccccc-hub/ued-copilot",
      description: "AI-powered UI/UX design auditor for Claude Code. Auto-identifies design defects based on Apple HIG, Material Design, Nielsen Heuristics & WCAG.",
      rating: 2500,
    },
    skills: [
      {
        name: "UED Copilot Design Auditor",
        slug: "ued-copilot-design-auditor",
        description: "AI-powered UI/UX design auditor — auto-identifies design defects and provides fixes based on Apple HIG, Material Design, Nielsen Heuristics, and WCAG standards.",
        categories: ["coding", "documentation"],
        tags: ["ui-audit", "ux", "accessibility", "wcag", "material-design", "apple-hig", "mit"],
        capabilities: [
          { capability: "Design audit", inputType: "ui-code", outputType: "audit-report" },
          { capability: "Accessibility check", inputType: "html", outputType: "wcag-report" },
          { capability: "Fix suggestions", inputType: "defects", outputType: "fix-code" },
        ],
        rating: 2500,
        authorName: "Rocccccc-hub",
        repoUrl: "https://github.com/Rocccccc-hub/ued-copilot",
      },
    ],
  },
  {
    source: {
      slug: "flexonze-claude-init",
      name: "claude-init",
      author: "Flexonze",
      sourceUrl: "https://agent-skills.cc/skills/flexonze-claude-init",
      githubUrl: "https://github.com/Flexonze/claude-init",
      description: "Automatically generate Claude Code configs tailored for your project.",
      rating: 2200,
    },
    skills: [
      {
        name: "Claude Init Config Generator",
        slug: "claude-init-config-generator",
        description: "Automatically generate Claude Code configuration files (CLAUDE.md, settings, hooks) tailored for your specific project structure.",
        categories: ["coding", "workflow-automation"],
        tags: ["claude-code", "config", "generator", "project-setup", "shell", "mit"],
        capabilities: [
          { capability: "Config generation", inputType: "project-structure", outputType: "claude-config" },
          { capability: "Project analysis", inputType: "codebase", outputType: "recommended-config" },
        ],
        rating: 2200,
        authorName: "Flexonze",
        repoUrl: "https://github.com/Flexonze/claude-init",
      },
    ],
  },
  {
    source: {
      slug: "peeperfrog-peeperfrog-create",
      name: "peeperfrog-create",
      author: "PeeperFrog",
      sourceUrl: "https://agent-skills.cc/skills/peeperfrog-peeperfrog-create",
      githubUrl: "https://github.com/PeeperFrog/peeperfrog-create",
      description: "MCP servers and Claude Skills for AI image generation and LinkedIn posting.",
      rating: 1800,
    },
    skills: [
      {
        name: "PeeperFrog AI Image & Social",
        slug: "peeperfrog-ai-image-social",
        description: "MCP servers and Claude skills for AI image generation and LinkedIn posting — create visuals and publish to social media from your terminal.",
        categories: ["integration", "workflow-automation"],
        tags: ["image-generation", "linkedin", "social-media", "mcp", "python", "apache-2"],
        capabilities: [
          { capability: "AI image generation", inputType: "prompt", outputType: "image" },
          { capability: "LinkedIn posting", inputType: "content", outputType: "published-post" },
        ],
        rating: 1800,
        authorName: "PeeperFrog",
        repoUrl: "https://github.com/PeeperFrog/peeperfrog-create",
      },
    ],
  },
  {
    source: {
      slug: "rightbrainai-claude-code-skills",
      name: "claude-code-skills",
      author: "RightbrainAI",
      sourceUrl: "https://agent-skills.cc/skills/rightbrainai-claude-code-skills",
      githubUrl: "https://github.com/RightbrainAI/claude-code-skills",
      description: "Official Claude Code skills for Rightbrain AI — create, run, and manage AI tasks.",
      rating: 2100,
    },
    skills: [
      {
        name: "Rightbrain AI Skills",
        slug: "rightbrain-ai-skills",
        description: "Official Claude Code skills for Rightbrain AI — create, run, and manage AI tasks with enterprise-grade reliability.",
        categories: ["coding", "workflow-automation"],
        tags: ["rightbrain", "ai-tasks", "enterprise", "claude-code", "mit"],
        capabilities: [
          { capability: "AI task management", inputType: "task-spec", outputType: "task-result" },
          { capability: "Skill execution", inputType: "skill-config", outputType: "executed-skill" },
        ],
        rating: 2100,
        authorName: "RightbrainAI",
        repoUrl: "https://github.com/RightbrainAI/claude-code-skills",
      },
    ],
  },
  {
    source: {
      slug: "kakermanis-claudeskill-auth0clis",
      name: "ClaudeSkill_Auth0CLIs",
      author: "kakermanis",
      sourceUrl: "https://agent-skills.cc/skills/kakermanis-claudeskill-auth0clis",
      githubUrl: "https://github.com/kakermanis/ClaudeSkill_Auth0CLIs",
      description: "Claude skill for Auth0 CLI, Auth0 Deploy CLI, MCP, and secure credential management with MacOS Passkey.",
      rating: 1500,
    },
    skills: [
      {
        name: "Auth0 CLI Skills",
        slug: "auth0-cli-skills",
        description: "Claude Code skill for Auth0 CLI and Deploy CLI — includes MCP integration and secure credential storage using MacOS Passkey method.",
        categories: ["devops", "integration"],
        tags: ["auth0", "authentication", "cli", "security", "passkey", "shell"],
        capabilities: [
          { capability: "Auth0 management", inputType: "auth0-command", outputType: "auth0-result" },
          { capability: "Credential management", inputType: "credentials", outputType: "secure-storage" },
        ],
        rating: 1500,
        authorName: "kakermanis",
        repoUrl: "https://github.com/kakermanis/ClaudeSkill_Auth0CLIs",
      },
    ],
  },
];

import { GITHUB_SKILLS } from "./github-skills";
import { OPENCLAW_SKILLS } from "./openclaw-skills";
import { COMPOSIO_SKILLS } from "./composio-skills";

// Merge all data. Deduplicate by source slug — later entries override earlier ones
function mergeBySourceSlug(datasets: SourceAdapterResult[][]): SourceAdapterResult[] {
  const map = new Map<string, SourceAdapterResult>();
  for (const dataset of datasets) {
    for (const entry of dataset) {
      const existing = map.get(entry.source.slug);
      if (existing) {
        // Merge skills: add new slugs, keep existing
        const existingSlugs = new Set(existing.skills.map(s => s.slug));
        for (const skill of entry.skills) {
          if (!existingSlugs.has(skill.slug)) {
            existing.skills.push(skill);
            existingSlugs.add(skill.slug);
          }
        }
        // Use the higher rating
        if (entry.source.rating > existing.source.rating) {
          existing.source.rating = entry.source.rating;
        }
      } else {
        map.set(entry.source.slug, { ...entry, skills: [...entry.skills] });
      }
    }
  }
  return Array.from(map.values());
}

export const ALL_MOCK_DATA = mergeBySourceSlug([
  MOCK_DATA,
  DISCOVERED_SKILLS,
  GITHUB_SKILLS,
  [OPENCLAW_SKILLS],
  [COMPOSIO_SKILLS],
]);
