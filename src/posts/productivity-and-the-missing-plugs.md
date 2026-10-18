---
title: Productivity and the missing plugs
date: 2026-10-18
summary: Economics says productivity is how a country gets rich, and also that it hurts specific people on the way. What the latest jobs data shows, a small regression I ran on 773 occupations, and why most of the economy isn't wired for AI yet.
read: 8 min
---

The first thing macroeconomics taught me that actually stuck is that, over the long run, almost nothing matters for living standards except productivity. Paul Krugman's version is the one people quote: "in the long run it is almost everything." A country gets richer when an hour of work produces more than it used to. Wages, health and free time follow from that, slowly and unevenly, but they follow.

The cleanest example is farming. In 1900 about 41% of American workers worked in agriculture. By 2000 it was under 2%, and the country ate better than ever. Nobody would undo that, but it wasn't painless either. Millions of people had to find different work, often in different places, and many of them didn't land well. Both halves of that story are true, and I think the honest way to talk about AI and jobs is to hold both at once.

## What the data says so far

The most recent jobs report, for September 2026, came out on October 2. Payrolls grew by 29,000 and unemployment was 4.2%. July was revised down to a loss of 10,000. That's a soft labor market, but a soft month can't tell you why it's soft. Interest rates, tariffs and the business cycle all move the same numbers.

The studies that try to isolate AI find something narrower than the headlines:

- The Stanford Digital Economy Lab's "Canaries in the Coal Mine," revised in August 2026 with payroll data through June, finds no sign of economy-wide displacement. It does find that employment of 22 to 25 year olds in AI-exposed occupations is about 19% below where it would be had it kept pace with less-exposed peers. The gap comes mostly from less hiring, not more firing, and the authors call it descriptive rather than causal.
- The Dallas Fed found the same young-worker pattern in a different survey, and put the effect on overall unemployment at about a tenth of a percentage point at most.
- Yale's Budget Lab has been tracking this since 2025 and, as of its September 2026 update, still finds no clear evidence of broad disruption.
- The New York Fed puts unemployment for recent college graduates at about 5.7% in June 2026, against 4.1% for all workers.

So the fear is real for some people. If you're 23 and trying to get a first job in work that a model can do most of, the door is narrower than it was. For the economy as a whole, the effect is still small enough to argue about.

## A small regression

I wanted to see the pattern myself, so I ran the simplest version I could defend. For 773 occupations, I took the change in employment between May 2022, right before ChatGPT, and May 2025, from the Bureau of Labor Statistics. I paired it with a measure of how exposed each occupation's tasks are to language models, from a 2023 paper by Eloundou, Manning, Mishkin and Rock. Then I regressed employment growth on exposure, exposure squared, and the occupation's median wage.

The squared term is there for a reason. If AI helps with part of a job, it can make the person doing that job more valuable and the occupation grows. If AI can do most of the job, the occupation shrinks. That predicts a hump: growth rising with moderate exposure, then falling at high exposure. A straight line would average those two effects into nothing.

| occupations by exposure | count | avg change in employment |
|---|---|---|
| under 0.1 | 159 | −1.6% |
| 0.1 to 0.3 | 199 | +2.0% |
| 0.3 to 0.5 | 224 | +5.8% |
| 0.5 to 0.6 | 119 | +3.3% |
| 0.6 to 0.8 | 50 | −3.5% |
| over 0.8 | 22 | −12.5% |

(These are changes in log employment, which read as approximate percentages.)

The hump is there. In the regression, exposure has a positive coefficient (0.40, standard error 0.09) and exposure squared a negative one (−0.58, standard error 0.10), so growth peaks at an exposure of about 0.34, almost exactly the median occupation. Moving from the average occupation to one a standard deviation more exposed goes with about 2.4 points slower growth over three years. A straight line with no squared term finds nothing significant at all, which is the averaging problem in action.

The occupations at the far end are the ones you'd guess. Telemarketers, computer programmers, web developers, data entry keyers and medical transcriptionists all shrank. Registered nurses, retail salespeople and medical assistants, in the middle of the exposure range, grew.

Now the part a good econometrics professor would make me say before anything else. The whole regression explains less than 5% of the variation in occupational growth, so almost everything that happened to jobs over those three years was about something else. Several of the shrinking occupations were shrinking before ChatGPT existed: computer programmers fell by about a third between 2019 and 2022, and telemarketers by more than a quarter. Weighting by how many people work in each occupation flattens the curve noticeably. The survey I used isn't designed for comparisons over time, and three years is short. So this is a correlation with a sensible shape, consistent with the complement-versus-substitute story, and not proof of anything.

## The missing plugs

Here's what I think gets lost in most conversations about AI and work. Language models live almost entirely in the digital economy: text, code, spreadsheets, tickets. Most of the economy isn't that. It's warehouses, clinics, construction sites, farms, kitchens and trucks, and in those places the bottleneck isn't intelligence. It's plugs.

There's no clean way yet for a model to see the state of a loading dock, sign for a delivery, carry liability for a decision, pass a building inspection, or plug into the forty-year-old system that runs a hospital's billing. Those processes were designed around people, and redesigning them takes years of unglamorous work in procurement, regulation, integration, sensors and training.

Economists have watched this happen before. Paul David's 1990 paper "The Dynamo and the Computer" pointed out that electric motors took decades to raise factory productivity, because the gains only came once factories were redesigned around them instead of bolting a motor where the steam engine used to be. Brynjolfsson, Rock and Syverson later called it the productivity J-curve: a general-purpose technology first shows up as investment and disruption, and only later as output.

That's where I think we are. The digital part of the economy is moving fast, and young workers in the most exposed jobs are feeling it first. The physical part has barely started, because the pipes from a model to the real world mostly don't exist yet. Building them is some of the most important work of the next decade, and a lot of it will be ordinary jobs.

## Why I'm still an optimist

Embracing productivity has made nearly every generation richer than the one before it, and I don't see a reason AI breaks that. But the gains have never arrived evenly or automatically. The people who carried the cost of the last big transitions were usually the ones with the least say in them, and the countries that came out best were the ones that took the transition seriously: retraining, mobility, a safety net, and patience while the plugs got built.

The data, the regression script and the simulation from [Two labs and a GPU](#/blog/two-labs-and-a-gpu) are in [/data/econ](https://github.com/jadenfix/jadenfix.github.io/tree/main/public/data/econ), with sources.
