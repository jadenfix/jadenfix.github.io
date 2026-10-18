Data and code behind three notes on jadenfix.github.io:
"Two labs and a GPU" (duopoly.py) and "Productivity and the missing plugs"
(regress.py, occ_regression.csv).

occ_regression.csv merges:
  - BLS Occupational Employment and Wage Statistics (OEWS), national files for
    May 2019, May 2022 and May 2025, https://www.bls.gov/oes/ . US government
    work, public domain. BLS notes OEWS is not designed for comparisons over time.
  - Occupation-level GPT exposure scores (dv_rating_beta) from Eloundou, Manning,
    Mishkin & Rock (2023), "GPTs are GPTs",
    https://github.com/openai/GPTs-are-GPTs , used under the MIT License below.

"Ks all the way down" (nested_k.py, sf_budget.py, standard library only):
  nested_k.py   seven nested splits; how per-level gaps and persistence compound
  sf_budget.py  family of four in San Francisco, approximate 2025 tax rules
    rent: Zumper SF median 2BR, July 2026 ($6,020/month)
    childcare: SF toddler center care ($26,376/yr) and SF Early Learning For All
      FY2026-27 tuition credits, https://www.sf.gov/eligibility-for-free-or-low-cost-preschool-and-child-care
    CalFresh gross limit: CDSS, FFY2027 ($5,500/month for 4)
    health: KFF 2025 average worker contribution, family coverage ($6,850)
    everything else: a flat $30,000 assumption
  Income limits: California HCD 2026, https://www.hcd.ca.gov/sites/default/files/docs/grants-and-funding/income-limits-2026.pdf
  Living wage: MIT, SF County, 2 working adults 2 children, https://livingwage.mit.edu/counties/06075

regress.py: python -I regress.py OEWS2019.xlsx OEWS2022.xlsx OEWS2025.xlsx occ_level.csv OUT.csv
duopoly.py: python3 duopoly.py (standard library only)

---- License for the exposure scores ----
MIT License

Copyright (c) 2024 OpenAI

Permission is hereby granted, free of charge, to any person obtaining a copy
of this software and associated documentation files (the "Software"), to deal
in the Software without restriction, including without limitation the rights
to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
copies of the Software, and to permit persons to whom the Software is
furnished to do so, subject to the following conditions:

The above copyright notice and this permission notice shall be included in all
copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE
SOFTWARE.
