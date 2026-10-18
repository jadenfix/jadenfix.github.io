# What's left after taxes and the essentials, for a two-earner family of four in
# San Francisco (one toddler in childcare, one school-age kid). Approximate:
# 2025 federal and California tax parameters, married filing jointly, standard
# deductions, no itemizing. Costs are COSTS below, each with its source.
import sys

def bracket_tax(x, brackets):
    t, lo = 0.0, 0.0
    for hi, r in brackets:
        if x > lo:
            t += (min(x, hi) - lo) * r
        lo = hi
    return t

FED = [(23850, .10), (96950, .12), (206700, .22), (394600, .24), (501050, .32), (751600, .35), (1e12, .37)]
CA = [(21512, .01), (50998, .02), (80490, .04), (111732, .06), (141732, .08), (723986, .093), (868784, .103), (1447976, .113), (1e12, .123)]

def federal(gross):
    taxable = max(0, gross - 31500)
    t = bracket_tax(taxable, FED)
    t -= 2 * 2200                          # child tax credit, two kids
    eitc = max(0, 7152 - 0.2106 * max(0, gross - 30470))  # 2 kids, MFJ
    return t - eitc                         # can go negative (refund)

def california(gross):
    taxable = max(0, gross - 11080)
    t = bracket_tax(taxable, CA) - 2 * 153 - 2 * 475   # exemption credits (approx.)
    return max(0, t)

def payroll(gross):
    ss = 0.062 * min(gross / 2, 176100) * 2   # two earners, split evenly
    return ss + 0.0145 * gross + 0.012 * gross  # Medicare + CA SDI

# Annual costs, 2026. Sources in README.txt.
RENT = 6020 * 12          # median 2BR, Zumper, July 2026
TODDLER_CARE = 26376      # center-based toddler care, SF
HEALTH = 6850             # worker's share of a family employer plan (KFF 2025 average)
OTHER = 30000             # food, transit, utilities, phones, clothes: an assumption, same for everyone

def childcare(gross):
    # SF Early Learning For All, FY2026-27, family of 4
    if gross <= 178300: return 0                 # free up to 110% AMI
    if gross <= 243150: return 0                 # full tuition credit up to 150% AMI
    if gross <= 324200: return TODDLER_CARE / 2  # 50% credit up to 200% AMI
    return TODDLER_CARE

def calfresh(gross):
    # gross limit 200% FPL = $5,500/month; rough benefit for a family of 4 paying SF rent
    return 1000 if gross / 12 <= 5500 else 0

if __name__ == "__main__":
    print(f"{'gross':>9} {'take-home':>10} {'rent':>8} {'childcare':>9} {'left over':>10}")
    for g in map(float, sys.argv[1:] or [60000, 70000, 120000, 250000]):
        take = g - federal(g) - california(g) - payroll(g)
        left = take + calfresh(g) - RENT - childcare(g) - HEALTH - OTHER
        print(f"{g:9,.0f} {take:10,.0f} {RENT:8,.0f} {childcare(g):9,.0f} {left:10,.0f}")
