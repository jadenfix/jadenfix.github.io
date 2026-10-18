---
title: Productivity and the missing plugs
date: 2026-10-18
summary: Productivity is how a country gets rich, and it hurts specific people on the way. What the jobs data shows so far, a small regression on 773 occupations, and why most of the economy isn't wired for AI yet.
read: 6 min
---

The first macro lesson that really stuck with me is that over the long run almost nothing matters for living standards except productivity. Paul Krugman's line is the one people quote: in the long run it is "almost everything." A country gets richer when an hour of work produces more than it used to. Wages, health and free time follow, slowly and unevenly, but they follow.

Farming is the cleanest example. In 1900 about 41% of American workers worked in agriculture. By 2000 it was under 2%, and the country ate better than ever. Nobody would undo that. It also wasn't painless: millions of people had to find other work, often somewhere else, and plenty didn't land well. Both halves are true, and I think the honest way to talk about AI and jobs is to hold both.

## What the data says so far

The [September 2026 jobs report](https://www.bls.gov/news.release/archives/empsit_10022026.htm) showed payrolls up 29,000 and unemployment at 4.2%, with July revised to a loss of 10,000. That's a soft labor market, but one month can't tell you why it's soft. Interest rates, tariffs and the cycle all move the same numbers.

Studies that try to isolate AI find something narrower than the headlines:

- [Canaries in the Coal Mine](https://digitaleconomy.stanford.edu/app/uploads/2026/08/Canaries_August2026.pdf), revised in August 2026 with payroll data through June, finds no sign of economy-wide displacement. It does find employment of 22 to 25 year olds in AI-exposed occupations about 19% below where it would be had it kept pace with less-exposed peers, mostly through less hiring rather than more firing. The authors call it descriptive, not causal.
- The [Dallas Fed](https://www.dallasfed.org/research/economics/2026/0106) found the same young-worker pattern in a different survey and put the effect on overall unemployment at a tenth of a point at most.
- [Yale's Budget Lab](https://budgetlab.yale.edu/research/tracking-impact-ai-labor-market), tracking this since 2025, still finds no clear evidence of broad disruption as of September 2026.
- The [New York Fed](https://www.newyorkfed.org/research/college-labor-market) puts unemployment for recent college grads at about 5.7% in June 2026, against 4.1% for all workers.

So the fear is real for some people. If you're 23 and looking for a first job in work a model can mostly do, the door is narrower than it was. For the economy as a whole, the effect is still small enough to argue about.

## A small regression

I wanted to see it myself, so I ran the simplest version I could defend. For 773 occupations I took the change in employment from May 2022, just before ChatGPT, to May 2025, from the [BLS occupational survey](https://www.bls.gov/oes/). I paired it with how exposed each occupation's tasks are to language models, from [Eloundou, Manning, Mishkin and Rock](https://arxiv.org/abs/2303.10130), and regressed growth on exposure, exposure squared, and the occupation's median wage.

The squared term is the whole idea. If AI helps with part of a job, the person doing it gets more valuable and the occupation can grow. If AI can do most of the job, it shrinks. That predicts a hump, and a straight line would average the two into nothing.

| exposure | occupations | change in employment |
|---|---|---|
| under 0.1 | 159 | −1.6% |
| 0.1 to 0.3 | 199 | +2.0% |
| 0.3 to 0.5 | 224 | +5.8% |
| 0.5 to 0.6 | 119 | +3.3% |
| 0.6 to 0.8 | 50 | −3.5% |
| over 0.8 | 22 | −12.5% |

The hump is there. Exposure gets a positive coefficient (0.40, standard error 0.09) and exposure squared a negative one (−0.58, standard error 0.10), so growth peaks at an exposure of about 0.34, almost exactly the median occupation. Going from the average occupation to one a standard deviation more exposed comes with about 2.4 points slower growth over three years. Drop the squared term and the straight line finds nothing significant, which is the averaging problem in action.

The far end holds the jobs you'd guess: telemarketers, computer programmers, web developers, data entry keyers and medical transcriptionists all shrank. Nurses, retail salespeople and medical assistants, in the middle of the range, grew.

Now the caveats any econometrics professor would make me say first. The whole regression explains under 5% of the variation, so nearly everything that happened to jobs was about something else. Some of the shrinking occupations were shrinking before ChatGPT existed: computer programmers fell by about a third from 2019 to 2022, telemarketers by more than a quarter. Weighting by the number of workers flattens the curve. The survey isn't built for comparisons over time, and three years is short. So this is a correlation with a sensible shape, consistent with the complement-versus-substitute story, and not proof of anything.

## The missing plugs

What gets lost in most of these conversations is that language models live almost entirely in the digital economy: text, code, spreadsheets, tickets. Most of the economy is warehouses, clinics, construction sites, farms, kitchens and trucks, and there the bottleneck isn't intelligence. It's plugs.

There's no clean way yet for a model to see the state of a loading dock, sign for a delivery, carry liability for a decision, pass an inspection, or talk to the forty-year-old system that runs a hospital's billing. Those processes were built around people, and rebuilding them takes years of unglamorous work in procurement, regulation, integration, sensors and training.

Economists have seen this before. Paul David's 1990 paper "The Dynamo and the Computer" showed that electric motors took decades to lift factory productivity, because the gains only came once factories were redesigned around them instead of bolting a motor where the steam engine used to be. Brynjolfsson, Rock and Syverson later called it the productivity J-curve: a general-purpose technology shows up first as investment and disruption, and only later as output.

That's where I think we are. The digital economy is moving fast, and young workers in the most exposed jobs feel it first. The physical economy has barely started, because the pipes from a model to the real world mostly don't exist yet. Building them is some of the most important work of the next decade, and a lot of it will be ordinary jobs.

## Why I'm still an optimist

Embracing productivity has made nearly every generation richer than the last, and I don't see why AI breaks that. But the gains have never arrived evenly or on their own. The people who carried the cost of past transitions usually had the least say in them, and the countries that came out best took the transition seriously: retraining, mobility, a safety net, and patience while the plugs got built.

The data, the regression script and the simulation from [Two labs and a GPU](#/blog/two-labs-and-a-gpu) are in [/data/econ](https://github.com/jadenfix/jadenfix.github.io/tree/main/public/data/econ), with sources.
