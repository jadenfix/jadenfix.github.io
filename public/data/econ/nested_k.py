# Ks all the way down: income as a chain of splits that multiply.
# At each level you land on the upper or lower arm of a K. The upper arm pays
# g times the lower arm. Income = base * product of the arms you took.
import math, itertools

LEVELS = ["country", "region", "city", "industry", "niche", "company", "role"]

def ladder(g, path):
    # path: string of U/D; income relative to all-D
    return math.prod(g if s == "U" else 1 for s in path)

for g in (1.5, 1.7, 2.0):
    top = g ** len(LEVELS)
    print(f"gap per level {g:.1f}x -> top-of-every-K vs bottom-of-every-K: {top:,.0f}x")

# small widening at every level compounds
a, b = 1.5, 1.7
print(f"each K widens {a}->{b} (+{(b/a-1)*100:.0f}%), the full spread goes {a**7:.0f}x -> {b**7:.0f}x (+{(b**7/a**7-1)*100:.0f}%)")

# where people land: 2^7 = 128 equally likely paths if each split were a coin flip
g = 1.7
dist = {}
for p in itertools.product("UD", repeat=len(LEVELS)):
    k = p.count("U")
    dist[k] = dist.get(k, 0) + 1
print("ups  share_of_people  income_vs_bottom")
for k in sorted(dist):
    print(f"{k:3d}   {dist[k]/128:6.1%}          {g**k:7.1f}x")

# Oakland example: up on the first five Ks, down on city and company
oak = "UUUUDUD"
print("oakland path", oak, f"{ladder(g, oak):.1f}x bottom; vs the top path {ladder(g,'U'*7)/ladder(g,oak):.1f}x below the top")
# the order doesn't matter for the product, but which Ks you can still change does


# Ks aren't coin flips: the upper arm makes the next upper arm likelier.
# q = P(same arm as the last K). q = 0.5 means independent coin flips.
def shares(q, n=len(LEVELS)):
    out = {}
    for p in itertools.product("UD", repeat=n):
        pr = 0.5
        for a, b in zip(p, p[1:]):
            pr *= q if a == b else 1 - q
        k = p.count("U")
        out[k] = out.get(k, 0) + pr
    return out

for q in (0.5, 0.7, 0.85):
    s = shares(q)
    mean = sum(v * g**k for k, v in s.items())
    c = 0
    for k in sorted(s):
        c += s[k]
        if c >= 0.5:
            med = g**k
            break
    print(f"q={q}: all-top {s[7]:.1%} of people, {s[7]*g**7/mean:.0%} of income; "
          f"middle (3-4 ups) {s[3]+s[4]:.0%}; mean {mean:.1f}x, median {med:.1f}x")
