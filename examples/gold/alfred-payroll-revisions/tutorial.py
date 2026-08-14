#!/usr/bin/env python3
"""ALFRED/FRED PAYEMS vintage smoke tutorial.

Named object: PAYEMS on ALFRED (https://alfred.stlouisfed.org/series?seid=PAYEMS)

The naive path uses the *current* vintage month-on-month change and compares it to the
first-release vintage change for the same observation month. Those numbers diverge —
that divergence is the wrong number the naive path ships.
"""

from __future__ import annotations

import json
import os
import sys
import urllib.parse
import urllib.request
from pathlib import Path

# Primary source URL used in code (contract: real URL required).
ALFRED_SERIES_URL = "https://alfred.stlouisfed.org/series?seid=PAYEMS"
FRED_OBS_API = "https://api.stlouisfed.org/fred/series/observations"

# Observation month under study (YYYY-MM-01). Chosen as a documented revision episode.
OBSERVATION_MONTH = "2024-03-01"

# Fixture used when FRED_API_KEY is unset so `python tutorial.py` still smokes offline.
FIXTURE_PATH = Path(__file__).with_name("fixture_payems_vintages.json")


def fetch_observation(api_key: str, vintage_date: str, observation_month: str) -> float:
    """Fetch PAYEMS level for observation_month as of vintage_date (ALFRED realtime)."""
    params = {
        "series_id": "PAYEMS",
        "api_key": api_key,
        "file_type": "json",
        "observation_start": observation_month,
        "observation_end": observation_month,
        "realtime_start": vintage_date,
        "realtime_end": vintage_date,
    }
    url = f"{FRED_OBS_API}?{urllib.parse.urlencode(params)}"
    with urllib.request.urlopen(url, timeout=30) as resp:
        payload = json.loads(resp.read().decode("utf-8"))
    obs = payload.get("observations") or []
    if not obs or obs[0].get("value") in (".", None, ""):
        raise RuntimeError(f"No PAYEMS value for {observation_month=} {vintage_date=}")
    return float(obs[0]["value"])


def load_fixture() -> dict:
    with FIXTURE_PATH.open(encoding="utf-8") as f:
        return json.load(f)


def month_on_month_change(level_t: float, level_t_minus_1: float) -> float:
    return level_t - level_t_minus_1


def smoke() -> int:
    print(f"Named object: PAYEMS — {ALFRED_SERIES_URL}")
    print(f"API surface: {FRED_OBS_API}")

    data = load_fixture()
    # First-release vintage path (correct object for a release-morning surprise).
    first = data["first_release"]
    naive = data["current_vintage_naive"]

    first_delta = month_on_month_change(first["level_t"], first["level_t_minus_1"])
    naive_delta = month_on_month_change(naive["level_t"], naive["level_t_minus_1"])

    # Explicit wrong number produced by the naive path:
    NAIVE_WRONG_PRINT = naive_delta
    CORRECT_FIRST_PRINT = first_delta
    WRONG_BY = NAIVE_WRONG_PRINT - CORRECT_FIRST_PRINT

    print(f"observation_month={data['observation_month']}")
    print(f"CORRECT_FIRST_PRINT (Δ PAYEMS, thousands) = {CORRECT_FIRST_PRINT:.1f}")
    print(f"NAIVE_WRONG_PRINT   (Δ PAYEMS, thousands) = {NAIVE_WRONG_PRINT:.1f}")
    print(f"revision error (naive - first) = {WRONG_BY:.1f}")

    if NAIVE_WRONG_PRINT == CORRECT_FIRST_PRINT:
        print("Unexpected: naive matched first release; fixture may be stale.", file=sys.stderr)
        return 1

    print(
        "Naive path fails with a wrong number: "
        f"it would ship Δ={NAIVE_WRONG_PRINT:.1f} instead of Δ={CORRECT_FIRST_PRINT:.1f}."
    )

    # Optional live check when FRED_API_KEY is present (does not block smoke).
    api_key = os.environ.get("FRED_API_KEY")
    if api_key:
        try:
            live = fetch_observation(api_key, first["vintage_date"], data["observation_month"])
            print(f"Live ALFRED check level_t @ first vintage = {live}")
        except Exception as exc:  # noqa: BLE001 — smoke should report, not crash the lesson
            print(f"Live API check skipped due to error: {exc}", file=sys.stderr)

    return 0


if __name__ == "__main__":
    raise SystemExit(smoke())
