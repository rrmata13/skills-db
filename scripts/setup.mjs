#!/usr/bin/env node
// One-shot setup macro for skills-db (SOL-467 / W2-C).
// Rerunning is safe: every step is idempotent.

import { spawnSync } from "node:child_process";
import { existsSync, copyFileSync, readFileSync, statSync } from "node:fs";
import { resolve, join } from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = resolve(fileURLToPath(import.meta.url), "../..");
const REQUIRED_NODE_MAJOR = 20;
const TOTAL = 8;

function header(num, label) {
  console.log(`\n[${num}/${TOTAL}] ${label}`);
}

function ok(msg) {
  console.log(`      ok: ${msg}`);
}

function warn(msg) {
  console.log(`      warn: ${msg}`);
}

function die(msg, hint) {
  console.error(`\nERROR: ${msg}`);
  if (hint) console.error(`Hint: ${hint}`);
  process.exit(1);
}

function run(cmd, { allowFail = false, hint } = {}) {
  const result = spawnSync(cmd, { shell: true, stdio: "inherit", cwd: ROOT });
  if (result.status !== 0 && !allowFail) die(`Command failed: ${cmd}`, hint);
  return result;
}

// 1: Node version
header(1, "Node version check");
const major = Number(process.versions.node.split(".")[0]);
if (major < REQUIRED_NODE_MAJOR) {
  die(
    `Node ${process.versions.node} is too old (need >= ${REQUIRED_NODE_MAJOR}).`,
    `Install Node ${REQUIRED_NODE_MAJOR}+ (e.g. via nvm: 'nvm install 20 && nvm use 20').`
  );
}
ok(`Node ${process.versions.node}`);

// 2: .env bootstrap
header(2, ".env bootstrap");
const envPath = join(ROOT, ".env");
const envExamplePath = join(ROOT, ".env.example");
if (!existsSync(envPath)) {
  if (!existsSync(envExamplePath)) die(".env.example missing — repo is broken.");
  copyFileSync(envExamplePath, envPath);
  ok("created .env from .env.example");
  warn("if you'll trigger /api/sync/sources, add GITHUB_TOKEN to .env");
  warn("if you'll use EMBEDDING_PROVIDER=openai, add OPENAI_API_KEY to .env");
} else {
  ok(".env exists (not overwriting)");
  const env = readFileSync(envPath, "utf8");
  if (env.includes('OPENAI_API_KEY="sk-..."')) {
    warn("OPENAI_API_KEY still has the placeholder value — replace before using openai provider");
  }
}

// 3: npm install (skip if up to date)
header(3, "npm install");
const nodeModules = join(ROOT, "node_modules");
const lock = join(ROOT, "package-lock.json");
const installedLock = join(ROOT, "node_modules", ".package-lock.json");
let needsInstall = !existsSync(nodeModules);
if (!needsInstall && existsSync(lock) && existsSync(installedLock)) {
  needsInstall = statSync(lock).mtimeMs > statSync(installedLock).mtimeMs;
}
if (needsInstall) {
  run("npm install");
  ok("dependencies installed");
} else {
  ok("dependencies up to date (skipped)");
}

// 4: prisma generate (explicit — don't rely on migrate's side effect)
header(4, "prisma generate");
run("npx prisma generate");
ok("client generated");

// 5: prisma migrate deploy (applies committed migrations, no prompts)
header(5, "prisma migrate deploy");
run("npx prisma migrate deploy");
ok("migrations applied");

// 6: seed (idempotent — seed.ts uses upsert)
header(6, "seed (idempotent via upsert)");
run("npx tsx prisma/seed.ts");
ok("seeded");

// 7: smoke test (non-fatal)
header(7, "smoke test (non-fatal)");
const testResult = run("npm test", { allowFail: true });
if (testResult.status === 0) ok("tests pass");
else warn("tests failed — review output above; setup will continue");

// 8: next steps
header(8, "ready");
console.log(`
  Open the app:
    npm run dev
    http://localhost:3000

  If port 3000 is in use:
    PORT=3001 npm run dev

  Useful follow-ups:
    npm run db:reset          # drop + remigrate + reseed
    python3 -m unittest tools.parity_tests   # Python<>TS scorer parity (0 failures expected)
`);
