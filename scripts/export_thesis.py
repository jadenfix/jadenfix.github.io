"""Export public/data/thesis/*.json for the paper-page figures (src/demos/thesis/*.tsx).

    python3 scripts/export_thesis.py <thesis repo>/v2/output [public/data]

Writes
  thesis/regimes.json      main MS-AR(1) parameters + histogram of monthly real returns
  thesis/episodes.json     every dated bear market with its drawdown path
  thesis/skill.json        out-of-sample Brier skill, bootstrap intervals, robustness variants,
                           SPA / Reality Check / model confidence set
  thesis/calibration.json  reliability bins of the real-time forecasts

Scalars come from numbers.json (the file the paper is typeset from). Series come from the
results CSVs, and anything recomputed from them (episode medians, Brier scores, bear shares) is
checked against numbers.json first.
"""

from __future__ import annotations

import statistics
from pathlib import Path

from thesis_common import HORIZONS, args, check, get, nget, numbers, r, read_csv, write, ym

HERE = Path(__file__).resolve().parent

LABELS = {
    "persist": "Persistence (real-time state)",
    "ms": "MS-AR(1) filtered probability",
    "tvtp": "TVTP MS-AR(1)",
    "logit_dy": "Logit: dividend yield",
    "logit_all": "Logit: 6 main predictors",
    "enet_rich": "Elastic-net logit, rich set",
    "gbt_rich": "Gradient boosting, rich set",
    "dma_all": "DMA: all models",
}

# Model sets drawn in the skill figure. Every model here has bootstrap intervals in the thesis.
SETS = [
    {"key": "core", "label": "core models", "models": ["persist", "ms", "logit_dy", "logit_all"]},
    {"key": "modern", "label": "new methods", "models": ["persist", "tvtp", "enet_rich", "gbt_rich", "dma_all"]},
]

# Robustness variants (the thesis re-runs only the core models under each).
VARIANTS = [
    ("main", "main"),
    ("real15", "15% threshold"),
    ("real25", "25% threshold"),
    ("nominal20", "nominal prices"),
    ("rolling", "rolling 30y window"),
    ("pre", "targets 1960-1989"),
    ("post", "targets 1990-2026"),
    ("nocrisis", "excluding 2007-2009 crisis"),
]

CAL_MODELS = ["logit_all", "logit_dy", "ms", "tvtp", "gbt_rich", "persist"]
BINS = 10
MIN_COUNT = 5

HIST_LO, HIST_HI, HIST_W = -23, 12, 1


def regimes(n: dict, res: Path) -> dict:
    panel = read_csv(res / "panel.csv")
    probs = read_csv(res / "regime_probabilities.csv")
    first, last = ym(probs[0]["date"]), ym(probs[-1]["date"])
    rets = [float(x["real_return"]) for x in panel if first <= ym(x["date"]) <= last]
    check("MS-AR(1) months", len(rets), len(probs))
    nb = (HIST_HI - HIST_LO) // HIST_W
    counts = [0] * nb
    for v in rets:
        i = int((v - HIST_LO) // HIST_W)
        if not 0 <= i < nb:
            raise SystemExit(f"return {v:.2f} outside the histogram range; widen HIST_LO/HIST_HI")
        counts[i] += 1
    p_bull, p_bear = nget(n, "ms.p_bull"), nget(n, "ms.p_bear")
    return {
        "model": "MS-AR(1)",
        "sample": f"{first[:4]}-{last[:4]}",
        "nobs": len(rets),
        "bull": {"mean": nget(n, "ms.bull_mean"), "sd": nget(n, "ms.bull_sd")},
        "bear": {"mean": nget(n, "ms.bear_mean"), "sd": nget(n, "ms.bear_sd")},
        "ar": nget(n, "ms.ar"),
        "stay": [p_bull, p_bear],
        "dur": [nget(n, "ms.dur_bull"), nget(n, "ms.dur_bear")],
        # long-run share of months in the bear regime implied by the transition matrix
        "bearShare": r((1 - p_bull) / (2 - p_bull - p_bear), 3),
        "hist": {"lo": HIST_LO, "width": HIST_W, "counts": counts, "n": len(rets)},
        "aucFiltered": nget(n, "ms.auc_filtered_now"),
        "tvtp": {"lr": nget(n, "tvtp.all.lr"), "p": get(n, "tvtp.all.p"), "df": int(nget(n, "tvtp.all.df"))},
    }


def episodes(n: dict, res: Path) -> dict:
    panel = [x for x in read_csv(res / "panel.csv") if x["real_price"]]
    dates = [ym(x["date"]) for x in panel]
    price = [float(x["real_price"]) for x in panel]
    out = []
    for row in read_csv(res / "episodes.csv"):
        peak, trough, conf = ym(row["peak"]), ym(row["trough"]), ym(row["confirmed"])
        months = int(row["months"])
        i0 = dates.index(peak)
        assert dates.index(trough) - i0 == months
        path = []
        for k in range(months + 13):
            if i0 + k >= len(price):
                break
            v = 100 * (price[i0 + k] / price[i0] - 1)
            path.append(r(v, 1))
            if k > months and v >= 0:  # back at the old peak
                break
        decline = r(float(row["decline_pct"]), 1)
        check(f"trough of {peak}", path[months], decline, 0.051)
        out.append({"peak": peak, "trough": trough, "confirmed": conf, "months": months, "decline": decline, "path": path})

    def lag(e: dict) -> int:
        (y0, m0), (y1, m1) = (map(int, e["peak"].split("-")), map(int, e["confirmed"].split("-")))
        return (y1 - y0) * 12 + (m1 - m0)

    check("n_bears", len(out), nget(n, "data.n_bears"))
    check("median decline", -statistics.median(e["decline"] for e in out), nget(n, "data.median_decline"))
    check("median months", statistics.median(e["months"] for e in out), nget(n, "data.median_bear_months"))
    check("median confirm lag", statistics.median(lag(e) for e in out), nget(n, "data.median_confirm_lag"))
    return {
        "start": dates[0],
        "end": dates[-1],
        "rule": get(n, "design.decline"),
        "nSince1960": int(nget(n, "data.n_bears_main")),
        "episodes": out,
    }


def skill(n: dict) -> dict:
    keys = list(dict.fromkeys(k for s in SETS for k in s["models"]))
    models = []
    for k in keys:
        m = {"key": k, "label": LABELS[k], "bss": [], "lo": [], "hi": [], "pPersist": []}
        for h in HORIZONS:
            m["bss"].append(nget(n, f"oos.{k}.h{h}.bss"))
            m["lo"].append(nget(n, f"rob.boot.{k}.h{h}.lo"))
            m["hi"].append(nget(n, f"rob.boot.{k}.h{h}.hi"))
            # one-sided Diebold-Mariano against persistence with 23 Bartlett lags
            m["pPersist"].append(None if k == "persist" else nget(n, f"oos.{k}.h{h}.p_per_long"))
        models.append(m)

    core = SETS[0]["models"]
    variants = []
    for key, label in VARIANTS:
        bss = {k: [nget(n, f"rob.var.{key}.{k}.h{h}.bss") for h in HORIZONS] for k in core}
        if key == "main":
            for k in core:
                for i, h in enumerate(HORIZONS):
                    check(f"main variant {k} h{h}", bss[k][i], nget(n, f"oos.{k}.h{h}.bss"))
        variants.append({"key": key, "label": label, "bss": bss})

    spa = []
    for h in HORIZONS:
        spa.append(
            {
                "h": h,
                "spa": nget(n, f"spa.h{h}.p_c"),
                "rc": nget(n, f"spa.h{h}.p_rc"),
                "mcsPersist": nget(n, f"mcs.h{h}.persist_p"),
                "persistIn": get(n, f"mcs.h{h}.persist_in") == "yes",
                "nIn": int(nget(n, f"mcs.h{h}.n_in")),
                "nModels": int(nget(n, f"mcs.h{h}.n_models")),
            }
        )

    return {
        "horizons": HORIZONS,
        "period": get(n, "oos.period"),
        "block": int(nget(n, "design.block")),
        "reps": int(nget(n, "design.reps")),
        "lags": int(nget(n, "design.block")) - 1,
        "sets": SETS,
        "models": models,
        "variants": variants,
        "inference": {
            "byHorizon": spa,
            "joint": {"n": int(nget(n, "spa.joint.n")), "spa": nget(n, "spa.joint.p_c"), "rc": nget(n, "spa.joint.p_rc")},
            "nTests": int(nget(n, "oos.n_tests")),
            "nSigConventional": int(nget(n, "oos.n_sig_persist")),
            "nSigLong": int(nget(n, "oos.n_sig_persist_long")),
        },
        "nChallengers": int(nget(n, "design.n_challengers")),
    }


def calibration(n: dict, res: Path) -> dict:
    rows: dict[tuple[int, str], list[tuple[float, int]]] = {}
    for x in read_csv(res / "bear_forecasts.csv.gz"):
        if x["model"] in CAL_MODELS:
            rows.setdefault((int(x["horizon"]), x["model"]), []).append((float(x["p"]), int(float(x["y"]))))
    data: dict[str, dict] = {}
    for h in HORIZONS:
        data[str(h)] = {}
        for k in CAL_MODELS:
            fy = rows[(h, k)]
            nn = len(fy)
            brier = sum((f - y) ** 2 for f, y in fy) / nn
            base = sum(y for _, y in fy) / nn
            check(f"n h{h}", nn, nget(n, f"oos.h{h}.n"))
            check(f"brier {k} h{h}", r(brier, 3), nget(n, f"oos.{k}.h{h}.brier"))
            check(f"bear share h{h}", r(100 * base, 1), nget(n, f"oos.h{h}.share"))
            hist = [0] * BINS
            sf = [0.0] * BINS
            sy = [0] * BINS
            for f, y in fy:
                b = min(BINS - 1, int(f * BINS))
                hist[b] += 1
                sf[b] += f
                sy[b] += y
            pts = [
                {"b": b, "f": r(sf[b] / hist[b], 3), "o": r(sy[b] / hist[b], 3), "n": hist[b]}
                for b in range(BINS)
                if hist[b] >= MIN_COUNT
            ]
            data[str(h)][k] = {
                "pts": pts,
                "hist": hist,
                "n": nn,
                "brier": nget(n, f"oos.{k}.h{h}.brier"),
                "base": r(base, 3),
                "share": nget(n, f"oos.h{h}.share"),
            }
    return {
        "horizons": HORIZONS,
        "period": get(n, "oos.period"),
        "models": [{"key": k, "label": LABELS[k]} for k in CAL_MODELS],
        "bins": BINS,
        "minCount": MIN_COUNT,
        "data": data,
    }


def main() -> None:
    src, out = args(HERE.parent / "public" / "data")
    n = numbers(src)
    res = src / "results"
    for name, obj in [
        ("regimes", regimes(n, res)),
        ("episodes", episodes(n, res)),
        ("skill", skill(n)),
        ("calibration", calibration(n, res)),
    ]:
        size = write(out / "thesis" / f"{name}.json", obj)
        print(f"thesis/{name}.json  {size / 1024:.1f} KB")


if __name__ == "__main__":
    main()
