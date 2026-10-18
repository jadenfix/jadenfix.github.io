"""Occupation-level regression: change in log employment (OEWS national, May 2022 -> latest)
on GPT exposure (Eloundou, Manning, Mishkin & Rock 2023), its square, and log 2022 median wage.

Usage:
  python -I regress.py OEWS2019.xlsx OEWS2022.xlsx OEWSLATEST.xlsx occ_level.csv OUT.csv [EXPOSURE_COL]

Exposure: occ_level.csv is at O*NET-SOC level (e.g. 15-1252.00); scores are averaged (unweighted)
to 6-digit SOC. OEWS rows whose code is a broad/OEWS-specific aggregate (ending in 0) and has no
exact match get the mean over O*NET occupations sharing the first 6 characters (XX-XXX).
"""
import sys
import numpy as np
import pandas as pd

TOPCODE_2022 = 239200.0  # '#' in May 2022 file = annual wage >= $239,200 (Field Descriptions sheet)


def load_oews(path):
    d = pd.read_excel(path, sheet_name=0, dtype=str)
    d.columns = [c.upper() for c in d.columns]
    d = d[d["O_GROUP"] == "detailed"].copy()
    d["emp"] = pd.to_numeric(d["TOT_EMP"].str.replace(",", ""), errors="coerce")
    return d


def ols_hc1(y, X, names):
    X = np.column_stack([np.ones(len(y)), X])
    names = ["const"] + names
    n, k = X.shape
    XtX_inv = np.linalg.inv(X.T @ X)
    b = XtX_inv @ X.T @ y
    e = y - X @ b
    meat = (X * e[:, None] ** 2).T @ X
    V = XtX_inv @ meat @ XtX_inv * n / (n - k)
    se = np.sqrt(np.diag(V))
    r2 = 1 - (e @ e) / ((y - y.mean()) @ (y - y.mean()))
    return dict(zip(names, b)), dict(zip(names, se)), r2, n, V, names


def report(title, y, Xdf):
    b, se, r2, n, V, names = ols_hc1(y.values, Xdf.values, list(Xdf.columns))
    print(f"\n=== {title} ===  N={n}  R2={r2:.4f}")
    print(f"{'var':<14}{'coef':>10}{'HC1 se':>10}{'t':>8}")
    for k in names:
        print(f"{k:<14}{b[k]:>10.4f}{se[k]:>10.4f}{b[k]/se[k]:>8.2f}")
    return b, se, V, names


def main():
    p19, p22, plat, pexp, out = sys.argv[1:6]
    expcol = sys.argv[6] if len(sys.argv) > 6 else "dv_rating_beta"

    o19, o22, olat = load_oews(p19), load_oews(p22), load_oews(plat)

    # exposure -> 6-digit SOC
    ex = pd.read_csv(pexp)
    ex["soc6"] = ex["O*NET-SOC Code"].str[:7]
    ex6 = ex.groupby("soc6")[expcol].mean()
    ex5 = ex.groupby(ex["soc6"].str[:6])[expcol].mean()

    m = o22[["OCC_CODE", "OCC_TITLE", "emp", "A_MEDIAN"]].rename(columns={"emp": "emp2022"})
    m = m.merge(olat[["OCC_CODE", "emp"]].rename(columns={"emp": "emp_latest"}), on="OCC_CODE", how="inner")
    m = m.merge(o19[["OCC_CODE", "emp"]].rename(columns={"emp": "emp2019"}), on="OCC_CODE", how="left")

    def get_exp(code):
        if code in ex6.index:
            return ex6[code], "exact"
        if code.endswith("0") and code[:6] in ex5.index:
            return ex5[code[:6]], "broad_mean"
        return np.nan, "none"

    r = m["OCC_CODE"].apply(get_exp)
    m["exposure"] = [t[0] for t in r]
    m["exp_match"] = [t[1] for t in r]
    m["wage_topcoded"] = m["A_MEDIAN"].eq("#")
    m["a_median_2022"] = pd.to_numeric(m["A_MEDIAN"].replace("#", TOPCODE_2022), errors="coerce")
    m["dlog_emp_22_latest"] = np.log(m["emp_latest"]) - np.log(m["emp2022"])
    m["dlog_emp_19_22"] = np.log(m["emp2022"]) - np.log(m["emp2019"])
    m["log_wage_2022"] = np.log(m["a_median_2022"])
    m["exposure_sq"] = m["exposure"] ** 2
    m = m.drop(columns=["A_MEDIAN"])
    m.to_csv(out, index=False)

    print(f"exposure column: {expcol}")
    print("OEWS detailed rows: 2019", len(o19), "2022", len(o22), "latest", len(olat), "| 2022&latest merged", len(m))
    print("exposure match:", m["exp_match"].value_counts().to_dict(), "| wage top-coded:", int(m["wage_topcoded"].sum()))

    base = ["exposure", "exposure_sq", "log_wage_2022"]
    s1 = m.dropna(subset=["dlog_emp_22_latest"] + base)
    ex_mean, ex_sd = s1["exposure"].mean(), s1["exposure"].std()
    print(f"exposure in sample: mean={ex_mean:.3f} sd={ex_sd:.3f} min={s1.exposure.min():.3f} max={s1.exposure.max():.3f}")
    print(f"dlog emp 2022->latest: mean={s1.dlog_emp_22_latest.mean():.4f} sd={s1.dlog_emp_22_latest.std():.4f}")

    # Spec 0: linear (for clean 1-SD interpretation)
    b0, se0, _, _ = report("Spec L: linear exposure + log wage", s1["dlog_emp_22_latest"], s1[["exposure", "log_wage_2022"]])
    print(f"  1-SD higher exposure -> {b0['exposure']*ex_sd:+.4f} log points (se {se0['exposure']*ex_sd:.4f})")

    for title, cols, data in [
        ("Spec 1: quadratic exposure + log wage", base, s1),
        ("Spec 2: + pre-period growth 2019->2022", base + ["dlog_emp_19_22"], m.dropna(subset=["dlog_emp_22_latest", "dlog_emp_19_22"] + base)),
    ]:
        b, se, V, names = report(title, data["dlog_emp_22_latest"], data[cols])
        i1, i2 = names.index("exposure"), names.index("exposure_sq")
        # turning point and 1-SD effect evaluated at the sample mean
        tp = -b["exposure"] / (2 * b["exposure_sq"])
        g = np.zeros(len(names)); g[i1] = ex_sd; g[i2] = (ex_mean + ex_sd) ** 2 - ex_mean ** 2
        eff = g @ np.array([b[k] for k in names]); eff_se = np.sqrt(g @ V @ g)
        # joint Wald test of exposure terms
        R = np.zeros((2, len(names))); R[0, i1] = 1; R[1, i2] = 1
        bb = np.array([b[k] for k in names])
        W = (R @ bb) @ np.linalg.inv(R @ V @ R.T) @ (R @ bb)
        print(f"  turning point exposure = {tp:.3f}; mean->mean+1SD effect = {eff:+.4f} (se {eff_se:.4f}); joint Wald chi2(2) = {W:.2f}")


if __name__ == "__main__":
    main()
