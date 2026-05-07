"""Intentionally-divergent Python matcher used to validate the parity harness.

This module reproduces the four known divergences from the legacy port so
that SOL-849 has a real punchlist. Production behavior lives in
``lib/services/scoring.ts``; do not "fix" the divergences here without
updating SOL-849's plan.

Divergences (versus production):
    1. Tokenizer regex ``[a-z0-9]+`` (drops hyphens), legacy stop-word
       subset (~25 words), length filter ``> 2`` (production keeps tokens
       longer than 1 char and preserves hyphens).
    2. Lexical normalization divides by ``len(q_tokens) * 8.5`` with no
       cap at 1 (production caps with ``min(1, score / (totalWeight * 0.3))``).
    3. Exact match returns ``1.0`` for any substring overlap of name/tag
       (production: 1.0 only on equality, 0.5 on substring, 0.7 on tag eq).
    4. Category score is ``sum / count`` of category-keyword matches with
       no tag-overlap fallback (production: ``max`` with tag fallback).

``STOP_WORDS`` and ``CATEGORY_KEYWORDS`` are copied verbatim from
production for documentation; the divergent ``tokenize`` deliberately
uses ``_LEGACY_STOP_WORDS`` instead.
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
# Divergence 1: legacy tokenizer.
# ---------------------------------------------------------------------------

_LEGACY_STOP_WORDS: frozenset[str] = frozenset(
    [
        "the", "and", "of", "to", "with", "is", "a", "an", "in", "on",
        "for", "by", "or", "but", "be", "at", "as", "from", "are",
        "was", "were", "this", "that", "it",
    ]
)

_TOKEN_RE = re.compile(r"[a-z0-9]+")


def tokenize(text: str) -> list[str]:
    if not text:
        return []
    return [
        t for t in _TOKEN_RE.findall(text.lower())
        if len(t) > 2 and t not in _LEGACY_STOP_WORDS
    ]


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
# Divergence 2: lexical without cap, divisor (len(q_tokens) * 8.5).
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
    for qt in q_tokens:
        if any(qt in nt or nt in qt for nt in name_tokens):
            score += 3
        if any(qt in dt or dt in qt for dt in desc_tokens):
            score += 2
        if any(qt in tt or tt in qt for tt in tag_tokens):
            score += 2
        if any(qt in ct or ct in qt for ct in cap_tokens):
            score += 1.5
    return score / (len(q_tokens) * 8.5)


# ---------------------------------------------------------------------------
# Divergence 3: exact match — any substring overlap returns 1.0.
# ---------------------------------------------------------------------------

def compute_exact_match_boost(query: str, skill: Mapping) -> float:
    q = (query or "").lower()
    if not q:
        return 0.0
    name = _name_of(skill).lower()
    if q and (q in name or name in q):
        return 1.0
    for tag in _tag_strings(skill):
        tl = tag.lower()
        if q and (q in tl or tl in q):
            return 1.0
    return 0.0


# ---------------------------------------------------------------------------
# Divergence 4: category — sum/count of matches with no tag fallback.
# ---------------------------------------------------------------------------

def compute_category_score(query: str, skill: Mapping) -> float:
    q = (query or "").lower()
    skill_categories = set(_category_strings(skill))
    matches: list[float] = []
    for category, keywords in CATEGORY_KEYWORDS.items():
        if any(kw in q for kw in keywords):
            matches.append(1.0 if category in skill_categories else 0.0)
    if not matches:
        return 0.0
    return sum(matches) / len(matches)


# ---------------------------------------------------------------------------
# Faithful: popularity (matches production exactly).
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
