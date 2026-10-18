"""Export public/data/regimes.json for the regime explorer (src/demos/RegimeExplorer.tsx).

    python3 scripts/export_regimes.py <thesis repo>/v2/output [public/data]

Inputs (all from the rebuilt thesis, v2/output):
  results/panel.csv               real price, dated bear state, real-time bear state (1871-2026)
  results/episodes.csv            the dated bear markets
  results/regime_probabilities.csv  filtered and smoothed MS-AR(1) bear probabilities
  results/bear_forecasts.csv.gz   real-time forecasts (hero model and persistence, h = 1)
  numbers.json                    every scalar shown on the site
"""

from __future__ import annotations

from pathlib import Path

from thesis_common import HORIZONS, args, check, get, nget, numbers, r, read_csv, write, ym

HERE = Path(__file__).resolve().parent

# Model keys -> the labels used in the paper's tables.
LABELS = {
    "logit_all": "Logit: 6 main predictors",
    "logit_ext": "Logit: all 11 predictors",
    "logit_dy": "Logit: dividend yield",
    "uni_drawdown": "Univariate logit: drawdown from 12-month high",
}


def main() -> None:
    src, out = args(HERE.parent / "public" / "data")
    n = numbers(src)
    res = src / "results"

    # ---------------------------------------------------------------- price and bear states
    panel = [row for row in read_csv(res / "panel.csv") if row["real_price"]]
    start = ym(panel[0]["date"])
    end = ym(panel[-1]["date"])
    price = [float(row["real_price"]) for row in panel]
    peak = 0.0
    dd = []
    for p in price:
        peak = max(peak, p)
        dd.append(r(100 * (p / peak - 1), 1))
    bear = "".join(row["bear"] for row in panel)
    bear_now = "".join(row["bear_now"] for row in panel)
    assert set(bear) <= {"0", "1"} and set(bear_now) <= {"0", "1"}
    dates = [ym(row["date"]) for row in panel]

    # ---------------------------------------------------------------- episodes
    eps = []
    for row in read_csv(res / "episodes.csv"):
        eps.append(
            {
                "peak": ym(row["peak"]),
                "trough": ym(row["trough"]),
                "confirmed": ym(row["confirmed"]),
                "months": int(row["months"]),
                "decline": r(float(row["decline_pct"]), 1),
            }
        )
    check("n_bears", len(eps), nget(n, "data.n_bears"))
    # The panel's dated bear state must agree with the episode list.
    for e in eps:
        i0 = dates.index(e["peak"]) + 1
        i1 = dates.index(e["trough"])
        assert bear[i0 : i1 + 1] == "1" * (i1 - i0 + 1), e

    # ---------------------------------------------------------------- regime probabilities
    reg = read_csv(res / "regime_probabilities.csv")
    reg_start = ym(reg[0]["date"])
    assert ym(reg[-1]["date"]) == end
    filtered = [r(float(x["filtered"]), 3) for x in reg]
    smoothed = [r(float(x["smoothed"]), 3) for x in reg]
    # same months as the one-month forecast targets (797, the MS-AR(1) sample)
    check("regime months", len(reg), nget(n, "oos.h1.n"))

    # ---------------------------------------------------------------- hero forecast (h = 1)
    hero_label = get(n, "hero.model")
    hero = next(k for k, v in LABELS.items() if v == hero_label)
    assert int(nget(n, "hero.h")) == 1
    fc = {}
    for row in read_csv(res / "bear_forecasts.csv.gz"):
        if row["horizon"] == "1" and row["model"] in (hero, "persist"):
            fc.setdefault(row["model"], []).append((ym(row["target_date"]), float(row["p"])))
    for k in fc:
        fc[k].sort()
    fc_start = fc[hero][0][0]
    fc_end = fc[hero][-1][0]
    assert [d for d, _ in fc[hero]] == [d for d, _ in fc["persist"]]
    assert fc_end == end

    # ---------------------------------------------------------------- skill by horizon
    skill = []
    for h in HORIZONS:
        best = get(n, f"oos.h{h}.best_key")
        skill.append(
            {
                "h": h,
                "best": best,
                "bestLabel": get(n, f"oos.h{h}.best"),
                "bestBss": nget(n, f"oos.{best}.h{h}.bss"),
                "persistBss": nget(n, f"oos.persist.h{h}.bss"),
                "bestBrier": nget(n, f"oos.{best}.h{h}.brier"),
                "persistBrier": nget(n, f"oos.persist.h{h}.brier"),
                "uncondBrier": nget(n, f"oos.uncond.h{h}.brier"),
                # one-sided Diebold-Mariano against persistence, 23 Bartlett lags
                "pVsPersist": nget(n, f"oos.{best}.h{h}.p_per_long"),
                "n": int(nget(n, f"oos.h{h}.n")),
            }
        )

    summary = {
        "nChallengers": int(nget(n, "design.n_challengers")),
        "nTests": int(nget(n, "oos.n_tests")),
        "nSigConventional": int(nget(n, "oos.n_sig_persist")),
        "nSigLong": int(nget(n, "oos.n_sig_persist_long")),
        "spaH1": nget(n, "spa.h1.p_c"),
        "spaJoint": nget(n, "spa.joint.p_c"),
        "persistInMcs": all(get(n, f"mcs.h{h}.persist_in") == "yes" for h in HORIZONS),
        # Bartlett lags of the autocorrelation-robust Diebold-Mariano test (block length - 1)
        "lags": int(nget(n, "design.block")) - 1,
    }

    data = {
        "meta": {
            "source": "Shiller monthly S&P 500 workbook (ie_data.xls); rebuilt thesis outputs (v2)",
            "priceNote": "real price (deflated by prior-month CPI), monthly average",
            "bearRule": "20% fall from a peak starts a bear market (dated from the month after the peak); 20% rise from the trough ends it",
            "regimeModel": f"two-regime MS-AR(1) on real returns, estimated {reg_start} to {end}",
            "forecastNote": "expanding-window refits; each forecast uses data available at its origin month",
        },
        "start": start,
        "end": end,
        "n": len(price),
        "price": [r(p, 1) for p in price],
        "dd": dd,
        "bear": bear,
        "bearNow": bear_now,
        "episodes": eps,
        "regime": {"start": reg_start, "filtered": filtered, "smoothed": smoothed},
        "forecast": {
            "start": fc_start,
            "end": fc_end,
            "horizon": 1,
            "model": hero,
            "label": hero_label,
            "p": [r(p, 3) for _, p in fc[hero]],
            "persist": [r(p, 3) for _, p in fc["persist"]],
        },
        "skill": skill,
        "summary": summary,
    }
    size = write(out / "regimes.json", data)
    print(f"regimes.json  {size / 1024:.1f} KB  {start} to {end}, {len(eps)} episodes, hero {hero}")


if __name__ == "__main__":
    main()
