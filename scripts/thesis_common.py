"""Shared helpers for the thesis exporters (export_regimes.py, export_thesis.py).

Both scripts read the outputs of the rebuilt thesis (`uv run python thesis.py` in
jadenfix/Predictive-Stochastic-Modeling-for-Financial-Markets-, folder v2/) and write small JSON
files for the site. Every scalar the site displays is taken from `numbers.json`, the same file the
paper is typeset from; the CSVs supply only series (prices, probabilities, forecasts) and anything
computed from them is checked against `numbers.json` before writing.

Standard library only.
"""

from __future__ import annotations

import csv
import gzip
import json
import math
import sys
from pathlib import Path

HORIZONS = [1, 3, 6, 12]


def args(default_out: Path) -> tuple[Path, Path]:
    if len(sys.argv) < 2:
        sys.exit(f"usage: python {Path(sys.argv[0]).name} <thesis v2/output dir> [site public/data dir]")
    src = Path(sys.argv[1]).resolve()
    out = Path(sys.argv[2]).resolve() if len(sys.argv) > 2 else default_out
    if not (src / "numbers.json").exists():
        sys.exit(f"{src} has no numbers.json; point this at v2/output")
    return src, out


def numbers(src: Path) -> dict:
    return json.loads((src / "numbers.json").read_text())


def num(s: str) -> float:
    """A numbers.json string ('−3.2', '1,490', '<0.001', '21.8') as a float.

    '<0.001' becomes 0.0005 so the site can print it back as '< 0.001'.
    """
    t = s.replace("−", "-").replace(",", "").strip()
    if t.startswith("<"):
        return float(t[1:]) / 2
    return float(t)


def get(n: dict, path: str) -> str:
    cur = n
    for k in path.split("."):
        cur = cur[k]
    if not isinstance(cur, str):
        raise TypeError(f"{path} is not a leaf")
    return cur


def nget(n: dict, path: str) -> float:
    return num(get(n, path))


def read_csv(path: Path) -> list[dict]:
    opener = gzip.open if path.suffix == ".gz" else open
    with opener(path, "rt", newline="") as f:
        return list(csv.DictReader(f))


def ym(date: str) -> str:
    """'1960-02-01' -> '1960-02'."""
    return date[:7]


def r(x: float, d: int) -> float:
    """Round half away from zero (matches the thesis' string formatting)."""
    if x is None or (isinstance(x, float) and math.isnan(x)):
        raise ValueError("cannot round NaN")
    q = 10**d
    v = math.floor(abs(x) * q + 0.5) / q
    v = math.copysign(v, x)
    return 0.0 if v == 0 else round(v, d)


def check(label: str, got: float, want: float, tol: float = 1e-9) -> None:
    if abs(got - want) > tol:
        sys.exit(f"mismatch {label}: computed {got}, numbers.json {want}")


def write(path: Path, obj: object) -> int:
    path.parent.mkdir(parents=True, exist_ok=True)
    text = json.dumps(obj, separators=(",", ":"), ensure_ascii=False)
    path.write_text(text)
    return len(text.encode())
