"""Parity tests: Python matcher.py vs TS production scorer (oracle).

The TS oracle produces ``tools/parity-corpus.json`` containing the corpus,
queries, weight configs, and expected per-component scores + top-10
ordering. This module loads that artifact and exercises ``matcher.py``
against it.

Initial run is expected to FAIL on the four intentional divergences in
matcher.py (tokenizer, lexical normalization, exact match, category).
SOL-849 fixes them in sequence; tests turn green when matcher.py matches
production behavior.

Invoke a single weight config independently:
    python3 -m unittest tools.parity_tests.ProductionWeightsParity -v
    python3 -m unittest tools.parity_tests.ExperimentWeightsParity -v
"""

from __future__ import annotations

import json
import unittest
from pathlib import Path

from tools import matcher

CORPUS_PATH = Path(__file__).parent / "parity-corpus.json"
with CORPUS_PATH.open() as f:
    CORPUS = json.load(f)

SKILLS_BY_SLUG = {s["slug"]: s for s in CORPUS["skills"]}
SKILLS_DEFAULT = list(CORPUS["skills"])
SKILLS_ZERO_RATING = [{**s, "rating": 0} for s in SKILLS_DEFAULT]
QUERIES_BY_ID = {q["id"]: q for q in CORPUS["queries"]}

PLACES = 6


def _corpus_for(query_id: str):
    q = QUERIES_BY_ID[query_id]
    if q["corpus"] == "empty":
        return []
    if q["corpus"] == "zero_rating":
        return SKILLS_ZERO_RATING
    return SKILLS_DEFAULT


class _ParityBase(unittest.TestCase):
    """Shared test logic. Subclasses set ``config_name``."""

    config_name: str = ""

    @classmethod
    def setUpClass(cls):
        if cls is _ParityBase:
            raise unittest.SkipTest("base class")
        super().setUpClass()
        cls.weights = CORPUS["weightConfigs"][cls.config_name]
        cls.expected_block = CORPUS["expected"][cls.config_name]

    def test_parity_per_query(self):
        for expected in self.expected_block:
            query_id = expected["query_id"]
            query = QUERIES_BY_ID[query_id]
            with self.subTest(query_id=query_id, text=query["text"]):
                self._assert_query(query, expected)

    def _assert_query(self, query, expected):
        skills = _corpus_for(query["id"])
        ranked = matcher.score_skills(query["text"], skills, self.weights)
        py_top10 = ranked[:10]
        ts_top10 = expected["top10"]

        py_slugs = [r["slug"] for r in py_top10]
        ts_slugs = [r["slug"] for r in ts_top10]
        self.assertEqual(
            py_slugs,
            ts_slugs,
            msg=self._ordering_msg(query["id"], py_top10, ts_top10),
        )

        ts_by_slug = {r["slug"]: r for r in ts_top10}
        for py_row in py_top10:
            slug = py_row["slug"]
            ts_row = ts_by_slug[slug]
            for component in ("lexical", "category", "popularity", "exactMatch", "total"):
                py_val = py_row[component]
                ts_val = ts_row[component]
                delta = py_val - ts_val
                self.assertAlmostEqual(
                    py_val,
                    ts_val,
                    places=PLACES,
                    msg=(
                        f"[{self.config_name}] query={query['id']!r} slug={slug!r} "
                        f"component={component} ts={ts_val!r} py={py_val!r} delta={delta!r}"
                    ),
                )

    def _ordering_msg(self, query_id, py, ts):
        py_str = ", ".join(f"{r['slug']}({r['total']:.6f})" for r in py)
        ts_str = ", ".join(f"{r['slug']}({r['total']:.6f})" for r in ts)
        return (
            f"[{self.config_name}] top-10 ordering mismatch for {query_id}\n"
            f"  TS: {ts_str}\n"
            f"  PY: {py_str}"
        )


class ProductionWeightsParity(_ParityBase):
    config_name = "production"


class ExperimentWeightsParity(_ParityBase):
    config_name = "experiment"


if __name__ == "__main__":
    unittest.main(verbosity=2)
