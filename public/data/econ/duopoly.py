# Toy market for model inference (see README.txt). Logit demand, Bertrand-Nash prices.
# Two frontier labs plus an outside option: open-weight models served on
# rented GPUs at about cost. q = quality, p = price per 1M tokens.
import math

ALPHA = 0.35  # price sensitivity

def shares(p, q, q0, p0):
    u = [qi - ALPHA * pi for qi, pi in zip(q, p)] + [q0 - ALPHA * p0]
    m = max(u); e = [math.exp(x - m) for x in u]; t = sum(e)
    return [x / t for x in e]

def nash(c, q, q0, p0):
    p = [ci + 1 for ci in c]
    for _ in range(3000):
        s = shares(p, q, q0, p0)
        p = [0.5 * pi + 0.5 * (ci + 1 / (ALPHA * (1 - si))) for pi, ci, si in zip(p, c, s)]
    return p, shares(p, q, q0, p0)

def row(name, q, c, q0):
    p0 = c[0] * 1.1
    p, s = nash(c, q, q0, p0)
    prof = [(pi - ci) * si for pi, ci, si in zip(p, c, s)]
    print(f"{name:34s} price {p[0]:5.2f} {p[1]:5.2f} | cost {c[0]:4.2f} | markup {p[0]-c[0]:5.2f} | shares {s[0]:.2f} {s[1]:.2f} open {s[2]:.2f} | profit/1k users {1000*prof[0]:.0f}")

c = [2.0, 2.0]
row("open 3 pts behind", [6, 6], c, 3)
row("open 2 pts behind", [6, 6], c, 4)
row("open 1 pt behind", [6, 6], c, 5)
row("open at parity", [6, 6], c, 6)
for yr in range(4):
    cc = [2.0 * 0.5**yr] * 2
    row(f"1 pt gap, year {yr}", [6, 6], cc, 5)
row("A 1 pt ahead, open 3 behind", [7, 6], c, 3)
row("A 1 pt ahead, open 1 behind", [7, 6], c, 5)
# cartel benchmark
best = None
for i in range(4000):
    pa = 2 + i * 0.01
    s = shares([pa, pa], [6, 6], 3, 2.2)
    pr = (pa - 2) * s[0]
    if best is None or pr > best[0]: best = (pr, pa, s)
print("cartel, open 3 behind: price", round(best[1], 2), "profit/1k", round(1000 * best[0]), "shares", [round(x, 2) for x in best[2]])
