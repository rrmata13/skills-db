"""Production-equivalent Python port of ``lib/services/scoring.ts``.

This module is the reference Python implementation of the production TS
scorer. Per parity test (`tools/parity_tests.py`), all 27 queries × 2 weight
configurations produce identical top-10 ordering and per-component scores
(within 1e-6) versus the TS oracle in `tools/parity-corpus.json`.

Implementation notes:
    1. Tokenizer uses an explicit ASCII character class (``[^a-zA-Z0-9_\\s-]``)
       to match JavaScript ``\\w`` semantics, which Python's default Unicode
       ``\\w`` would diverge from on inputs like "résumé" or "日本語".
    2. Lexical caps at 1.0 with divisor ``totalWeight * 0.3``, where
       ``totalWeight = len(q_tokens) * 8.5`` (3+2+2+1.5 per query token).
    3. Exact match has no empty-query guard: empty query yields 1.0 for
       skills with empty names and 0.5 for any skill with a non-empty name
       (because "" is a substring of every string).
    4. Category uses ``max`` over all matching categories with tag-overlap
       fallback when the skill doesn't carry the matched category directly.

If you intend to change scoring semantics, change `lib/services/scoring.ts`
first, regenerate `tools/parity-corpus.json` via `tools/parity-runner.ts`,
then update this module to keep the parity gate green.
"""

from __future__ import annotations

import math
import re
from typing import Iterable, Mapping, Sequence

# ---------------------------------------------------------------------------
# Production-equivalent constants (copied verbatim, used where faithful).
# ---------------------------------------------------------------------------

STOP_WORDS: frozenset[str] = frozenset(
    [
        "a", "an", "the", "is", "are", "was", "were", "be", "been", "being",
        "have", "has", "had", "do", "does", "did", "will", "would", "shall",
        "should", "may", "might", "must", "can", "could", "i", "we", "you",
        "he", "she", "it", "they", "me", "us", "him", "her", "them", "my",
        "our", "your", "his", "its", "their", "this", "that", "these", "those",
        "and", "but", "or", "nor", "not", "so", "yet", "both", "either",
        "neither", "each", "every", "all", "any", "few", "more", "most",
        "other", "some", "such", "no", "only", "own", "same", "than", "too",
        "very", "just", "because", "as", "until", "while", "of", "at", "by",
        "for", "with", "about", "against", "between", "through", "during",
        "before", "after", "above", "below", "to", "from", "up", "down",
        "in", "out", "on", "off", "over", "under", "again", "further", "then",
        "once", "here", "there", "when", "where", "why", "how", "what", "which",
        "who", "whom", "if", "into", "also", "want", "need", "like",
    ]
)

CATEGORY_KEYWORDS: Mapping[str, Sequence[str]] = {
    "coding": ["code", "programming", "develop", "software", "debug", "refactor", "test", "review"],
    "workflow-automation": ["automate", "workflow", "pipeline", "orchestrate", "schedule", "trigger", "process"],
    "chatbot": ["chat", "bot", "conversational", "messaging", "telegram", "discord", "slack"],
    "memory": ["memory", "remember", "recall", "context", "persist", "state", "history"],
    "devops": ["deploy", "ci", "cd", "docker", "kubernetes", "infrastructure", "pipeline", "container"],
    "documentation": ["document", "readme", "docs", "guide", "wiki", "knowledge-base"],
    "knowledge-management": ["obsidian", "notes", "vault", "knowledge", "pkm", "zettelkasten", "graph"],
    "cloud-platform": ["cloud", "serverless", "aws", "azure", "gcp", "cloudflare", "edge", "worker"],
    "cli-tooling": ["cli", "command", "terminal", "shell", "tool", "bash", "zsh"],
    "multi-agent": ["agent", "multi-agent", "orchestrat", "coordinate", "parallel"],
    "skills-collection": ["collection", "curated", "awesome", "list", "directory", "marketplace"],
    "integration": ["integrat", "connect", "api", "webhook", "plugin", "connector"],
}

# ---------------------------------------------------------------------------
# Tokenizer (production-equivalent).
# ---------------------------------------------------------------------------
# JS `\w` matches ASCII [A-Za-z0-9_] only; Python `\w` defaults to Unicode and
# would keep characters like "résumé" or "日本語" that production strips. Use
# an explicit ASCII class to preserve JS regex semantics.
_NON_TOKEN_RE = re.compile(r"[^a-zA-Z0-9_\s-]")


def tokenize(text: str) -> list[str]:
    if not text:
        return []
    cleaned = _NON_TOKEN_RE.sub(" ", text.lower())
    return [w for w in cleaned.split() if len(w) > 1 and w not in STOP_WORDS]


# ---------------------------------------------------------------------------
# Skill helpers.
# ---------------------------------------------------------------------------

def _name_of(skill: Mapping) -> str:
    return skill.get("name", "")


def _description_of(skill: Mapping) -> str:
    return skill.get("description", "")


def _tag_strings(skill: Mapping) -> list[str]:
    return [t.get("tag", "") for t in skill.get("tags", [])]


def _capability_strings(skill: Mapping) -> list[str]:
    return [c.get("capability", "") for c in skill.get("capabilities", [])]


def _category_strings(skill: Mapping) -> list[str]:
    return [c.get("category", "") for c in skill.get("categories", [])]


# ---------------------------------------------------------------------------
# Lexical (production-equivalent: cap at 1.0, divisor totalWeight * 0.3).
# ---------------------------------------------------------------------------

def compute_lexical_score(query: str, skill: Mapping) -> float:
    q_tokens = tokenize(query)
    if not q_tokens:
        return 0.0
    name_tokens = tokenize(_name_of(skill))
    desc_tokens = tokenize(_description_of(skill))
    tag_tokens: list[str] = []
    for t in _tag_strings(skill):
        tag_tokens.extend(tokenize(t))
    cap_tokens: list[str] = []
    for c in _capability_strings(skill):
        cap_tokens.extend(tokenize(c))

    score = 0.0
    total_weight = 0.0
    for qt in q_tokens:
        if any(qt in nt or nt in qt for nt in name_tokens):
            score += 3
        if any(qt in dt or dt in qt for dt in desc_tokens):
            score += 2
        if any(qt in tt or tt in qt for tt in tag_tokens):
            score += 2
        if any(qt in ct or ct in qt for ct in cap_tokens):
            score += 1.5
        total_weight += 3 + 2 + 2 + 1.5
    return min(1.0, score / (total_weight * 0.3))


# ---------------------------------------------------------------------------
# Exact match (production-equivalent: equality 1.0, substring 0.5, tag eq 0.7).
# ---------------------------------------------------------------------------
# No empty-query guard: production returns 0.5 for every non-empty-name skill
# when query is "" (because "" is a substring of every string), and 1.0 if the
# name is also "". Removing the early-return is what makes edge-01-empty pass.

def compute_exact_match_boost(query: str, skill: Mapping) -> float:
    q = (query or "").lower()
    name = _name_of(skill).lower()
    if name == q:
        return 1.0
    if q in name or name in q:
        return 0.5
    for tag in _tag_strings(skill):
        if tag.lower() == q:
            return 0.7
    return 0.0


# ---------------------------------------------------------------------------
# Category (production-equivalent: max with tag-overlap fallback).
# ---------------------------------------------------------------------------

def compute_category_score(query: str, skill: Mapping) -> float:
    q = (query or "").lower()
    skill_categories = set(_category_strings(skill))
    skill_tags = [t.lower() for t in _tag_strings(skill)]
    max_score = 0.0
    for category, keywords in CATEGORY_KEYWORDS.items():
        query_match = any(kw in q for kw in keywords)
        if not query_match:
            continue
        if category in skill_categories:
            max_score = max(max_score, 1.0)
        else:
            tag_overlap = sum(1 for kw in keywords if any(kw in st for st in skill_tags))
            max_score = max(max_score, min(1.0, tag_overlap * 0.3))
    return max_score


# ---------------------------------------------------------------------------
# Popularity (matches production exactly).
# ---------------------------------------------------------------------------

def compute_popularity_score(skill: Mapping, max_rating: float) -> float:
    if max_rating == 0:
        return 0.0
    return math.log(skill.get("rating", 0) + 1) / math.log(max_rating + 1)


# ---------------------------------------------------------------------------
# Top-level.
# ---------------------------------------------------------------------------

def score_skills(
    query: str,
    skills: Iterable[Mapping],
    weights: Mapping[str, float],
    max_rating: float | None = None,
) -> list[dict]:
    skills_list = list(skills)
    if max_rating is None:
        ratings = [s.get("rating", 0) for s in skills_list]
        max_rating = max(ratings) if ratings else 0
    rows: list[dict] = []
    for skill in skills_list:
        lexical = compute_lexical_score(query, skill)
        category = compute_category_score(query, skill)
        popularity = compute_popularity_score(skill, max_rating)
        exact_match = compute_exact_match_boost(query, skill)
        total = (
            weights.get("lexical", 0) * lexical
            + weights.get("category", 0) * category
            + weights.get("popularity", 0) * popularity
            + weights.get("exactMatch", 0) * exact_match
        )
        rows.append(
            {
                "slug": skill["slug"],
                "lexical": lexical,
                "category": category,
                "popularity": popularity,
                "exactMatch": exact_match,
                "total": total,
            }
        )
    rows.sort(key=lambda r: -r["total"])
    return rows
