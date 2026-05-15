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

def _field_match_strength(qt: str, qt_next: str | None, field_tokens: Sequence[str]) -> int:
    """SOL-990 AI-1 + AI-2 — Python mirror of fieldMatchStrength in scoring.ts.

    Returns numeric match strength so the caller can weight per-(field, type)
    per Codex R5 Q2 (name/slug phrase > scattered description).

    Strength values:
        3 = ordered phrase/bigram (qt, qt_next adjacent in field_tokens)
        2 = exact token equality
        1 = safe prefix/stem — only when BOTH tokens length >= 4
        0 = no match

    Replaces the previous ``qt in ft or ft in qt`` bidirectional substring rule.
    """
    # 3 = ordered phrase/bigram (strongest)
    if qt_next is not None:
        for j in range(len(field_tokens) - 1):
            if field_tokens[j] == qt and field_tokens[j + 1] == qt_next:
                return 3
    # 2 = exact token equality
    if qt in field_tokens:
        return 2
    # 1 = safe prefix/stem (length >= 4 on both sides)
    if len(qt) >= 4:
        for ft in field_tokens:
            if len(ft) >= 4 and (ft.startswith(qt) or qt.startswith(ft)):
                return 1
    return 0


# SOL-990 AI-2: Per-(field, match-type) weights. Mirror of scoring.ts constants.
# DO NOT EDIT independently of scoring.ts — these must stay in sync for parity.
_NAME_PHRASE = 8
_NAME_EXACT = 4
_NAME_PREFIX = 2
_TAG_PHRASE = 4
_TAG_EXACT = 2
_TAG_PREFIX = 1
_CAP_PHRASE = 3
_CAP_EXACT = 1.5
_CAP_PREFIX = 0.5
_DESC_PHRASE = 3
_DESC_EXACT = 0.5
_DESC_PREFIX = 0.25
_MAX_PER_TOKEN = _NAME_PHRASE + _DESC_PHRASE + _TAG_PHRASE + _CAP_PHRASE  # 18


def _score_from_strength(strength: int, phrase: float, exact: float, prefix: float) -> float:
    if strength == 3:
        return phrase
    if strength == 2:
        return exact
    if strength == 1:
        return prefix
    return 0.0


# R6 review hardening: require capital `From` (no re.IGNORECASE) AND a
# sentence-start anchor `(^|\.\s*)` so legitimate prose ending in lowercase
# "from {word}." is not false-stripped. re.ASCII forces `\w` to match
# [A-Za-z0-9_] only, mirroring JS regex `\w` semantics — parity contract.
_SOURCE_ATTR_RE_REPO = re.compile(r"(^|\.\s*)From\s+[\w\-]+/[\w\-]+\.?\s*$", re.ASCII)
_SOURCE_ATTR_RE_OWNER = re.compile(r"(^|\.\s*)From\s+[\w\-]+\.?\s*$", re.ASCII)


def strip_source_attribution(text: str) -> str:
    """SOL-990 AI-4 — Python mirror of stripSourceAttribution in scoring.ts.

    Removes trailing "From owner/repo." or "From owner." attribution text added
    by SOL-852's inferred-description fetcher. Eliminates repo-name bleed into
    lexical scoring per Codex R5 Q4. The captured prefix is re-injected via
    backreference so the preceding sentence's period is preserved.
    """
    if not text:
        return text
    cleaned = _SOURCE_ATTR_RE_REPO.sub(r"\1", text)
    cleaned = _SOURCE_ATTR_RE_OWNER.sub(r"\1", cleaned)
    return cleaned.strip()


def compute_lexical_score(query: str, skill: Mapping) -> float:
    q_tokens = tokenize(query)
    if not q_tokens:
        return 0.0
    name_tokens = tokenize(_name_of(skill))
    desc_tokens = tokenize(strip_source_attribution(_description_of(skill)))  # AI-4
    tag_tokens: list[str] = []
    for t in _tag_strings(skill):
        tag_tokens.extend(tokenize(t))
    cap_tokens: list[str] = []
    for c in _capability_strings(skill):
        cap_tokens.extend(tokenize(c))

    score = 0.0
    total_weight = 0.0
    for i, qt in enumerate(q_tokens):
        qt_next = q_tokens[i + 1] if i + 1 < len(q_tokens) else None

        score += _score_from_strength(
            _field_match_strength(qt, qt_next, name_tokens), _NAME_PHRASE, _NAME_EXACT, _NAME_PREFIX
        )
        score += _score_from_strength(
            _field_match_strength(qt, qt_next, desc_tokens), _DESC_PHRASE, _DESC_EXACT, _DESC_PREFIX
        )
        score += _score_from_strength(
            _field_match_strength(qt, qt_next, tag_tokens), _TAG_PHRASE, _TAG_EXACT, _TAG_PREFIX
        )
        score += _score_from_strength(
            _field_match_strength(qt, qt_next, cap_tokens), _CAP_PHRASE, _CAP_EXACT, _CAP_PREFIX
        )
        total_weight += _MAX_PER_TOKEN

    # Cap divisor 0.3 preserved from pre-AI-2 (Codex R5: "do not lower the ship
    # gate; fix scoring calibration"). The recalibration is in per-field weights.
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

# SOL-990 AI-3 — Python mirror of detectQueryCategories + computeCategoryScore.
# Replaces the inline ``kw in q`` substring match with length-disciplined keyword
# matching + bigram phrase synonyms. Keywords < 4 chars must match exactly; long
# keywords accept exact + safe-prefix (both tokens length ≥ 4).
#
# Starter synonym bigrams (DO NOT EDIT independently of scoring.ts — these must
# stay in sync for parity). Founder expands in SOL-989.
CATEGORY_SYNONYMS: Mapping[str, Sequence[Sequence[str]]] = {
    "coding": [["unit", "test"], ["code", "review"], ["bug", "fix"], ["pull", "request"], ["lint", "format"]],
    "workflow-automation": [["github", "actions"], ["zapier", "make"], ["cron", "job"]],
    "chatbot": [["customer", "support"], ["slack", "thread"]],
    "memory": [["short", "term"], ["long", "term"], ["working", "memory"]],
    "devops": [["ci", "cd"], ["docker", "compose"], ["kubernetes", "cluster"], ["github", "actions"]],
    "documentation": [["api", "docs"], ["read", "me"], ["release", "notes"]],
    "knowledge-management": [["second", "brain"], ["personal", "knowledge"], ["zettel", "kasten"]],
    "cloud-platform": [["aws", "lambda"], ["cloudflare", "workers"], ["serverless", "function"]],
    "cli-tooling": [["command", "line"], ["shell", "script"]],
    "multi-agent": [["multi", "agent"], ["agent", "swarm"], ["agent", "coordination"]],
    "skills-collection": [["awesome", "list"], ["curated", "list"]],
    "integration": [["webhook", "url"], ["api", "client"], ["third", "party"]],
}


def detect_query_categories(query: str) -> list[str]:
    """SOL-990 AI-3 — Python mirror of detectQueryCategories.

    Returns the list of categories the query activates via:
      1. Single-keyword match with length discipline (short kws exact-only).
      2. Bigram phrase synonyms (ordered, adjacent in query).
    """
    q_tokens = tokenize(query)
    if not q_tokens:
        return []

    fired: set[str] = set()

    # Path 1: single-keyword matches with length discipline.
    for category, keywords in CATEGORY_KEYWORDS.items():
        for kw in keywords:
            kw_lower = kw.lower()
            if len(kw_lower) < 4:
                # Short keywords must match exactly.
                if kw_lower in q_tokens:
                    fired.add(category)
                    break
                continue
            # Long keywords: exact OR safe prefix.
            matched = False
            for qt in q_tokens:
                if qt == kw_lower:
                    matched = True
                    break
                if len(qt) >= 4 and (qt.startswith(kw_lower) or kw_lower.startswith(qt)):
                    matched = True
                    break
            if matched:
                fired.add(category)
                break

    # Path 2: bigram phrase synonyms.
    for category, phrases in CATEGORY_SYNONYMS.items():
        for phrase in phrases:
            if len(phrase) != 2:
                continue
            w1, w2 = phrase[0].lower(), phrase[1].lower()
            for i in range(len(q_tokens) - 1):
                if q_tokens[i] == w1 and q_tokens[i + 1] == w2:
                    fired.add(category)
                    break
            if category in fired:
                break

    return sorted(fired)  # deterministic order for parity


def compute_category_score(query: str, skill: Mapping) -> float:
    query_categories = detect_query_categories(query)
    if not query_categories:
        return 0.0

    skill_category_set = set(_category_strings(skill))
    skill_tags = [t.lower() for t in _tag_strings(skill)]

    max_score = 0.0
    for category in query_categories:
        if category in skill_category_set:
            max_score = max(max_score, 1.0)
            continue
        # Tag-overlap fallback — same length discipline.
        keywords = CATEGORY_KEYWORDS.get(category, [])
        tag_overlap = 0
        for kw in keywords:
            if len(kw) < 4:
                continue  # short kws don't participate in tag fallback
            kw_lower = kw.lower()
            hit = False
            for tag in skill_tags:
                # Split tag on non-alphanumeric to get tokens
                import re as _re
                tag_tokens = [t for t in _re.split(r'[^a-z0-9]+', tag) if len(t) > 1]
                for tt in tag_tokens:
                    if tt == kw_lower or (len(tt) >= 4 and (tt.startswith(kw_lower) or kw_lower.startswith(tt))):
                        hit = True
                        break
                if hit:
                    break
            if hit:
                tag_overlap += 1
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
