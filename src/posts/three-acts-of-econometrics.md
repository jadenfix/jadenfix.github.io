---
title: Three acts of econometrics
date: 2026-10-18
summary: Compute decided what economists could ask. First it was scarce, then it was cheap, and now it can read. A short history, and the old ways of fooling yourself that came along at every step.
read: 6 min
---

The first big model of the US economy, the [Klein-Goldberger model](https://en.wikipedia.org/wiki/Klein%E2%80%93Goldberger_model) from 1955, had about twenty equations fit to data from 1929 to 1952. Through most of the fifties, the only way to compute something like it was an electromechanical desk calculator. Every coefficient was hours of somebody cranking.

I think about that when a regression with a hundred controls finishes before I let go of the enter key. The way I learned it in grad school, the history of econometrics is mostly a history of what compute let people ask. I tell it in three acts. The dates are loose. The shape isn't.

## Act one: arithmetic is expensive

When each extra variable costs a day, you choose your variables before touching the data, and theory does the choosing. You derived what a consumer or a firm should do, then estimated the one or two relationships that mattered. Models were small because they had to be.

As computers spread, the regressions grew: more variables, longer series, panels following the same people for years. Holding more things constant got you closer to the effect you actually wanted. It also handed you a new way to fool yourself. With enough variables you can try specifications until one says what you hoped. In 1983 Edward Leamer called this out in ["Let's Take the Con out of Econometrics"](https://ideas.repec.org/a/aea/aecrev/v73y1983i1p31-43.html).

The answer that grew over the next two decades was to trust the design more than the model. Find a lottery, a policy that stopped at a border, a cutoff that split otherwise identical people, and let the world run the experiment. Angrist and Pischke named it [the credibility revolution](https://www.nber.org/papers/w15794) in 2010, and in 2021 Card, Angrist and Imbens shared a Nobel for it.

## Act two: data gets big and machines learn

Somewhere around the late 2000s the data changed character. Clicks, searches and transactions produced more rows than anyone had planned for, and cheap compute made it possible to fit models with thousands of parameters and check them on data held out. A neural network won ImageNet in 2012 by a margin that ended the argument. In 2014 Hal Varian wrote a paper for economists called ["Big Data: New Tricks for Econometrics"](https://www.aeaweb.org/articles?id=10.1257/jep.28.2.3), which is about as loud as the field gets.

Machine learning brought a discipline econometrics had underused: judge a model on data it hasn't seen. It also brought a confusion that's still with us. [Mullainathan and Spiess](https://www.aeaweb.org/articles?id=10.1257/jep.31.2.87) put it cleanly in 2017. Machine learning is built for good predictions, ŷ. Econometrics is built for good estimates of effects, β̂. A model can predict house prices beautifully and tell you nothing reliable about what an extra bedroom is worth, because it's free to lean on whatever happens to correlate.

## Act three: the machine can read

Then the two traditions started borrowing each other's best parts. [Double machine learning](https://arxiv.org/abs/1608.00060) uses flexible models for the messy parts of a problem and keeps classical machinery for the one effect you care about. [Causal forests](https://arxiv.org/abs/1510.04342) find where an effect is big and where it's small, and stay honest by finding the shape on one half of the data and measuring on the other.

The bigger change was what counts as data. Economists had already [measured growth from satellite photos of lights at night](https://www.aeaweb.org/articles?id=10.1257/aer.102.2.994). After [the transformer](https://arxiv.org/abs/1706.03762) in 2017, most of what used to be qualitative became measurable. A central bank statement, a support ticket, a photo of a storefront and a page of code can all become variables. Things that used to live in a paper's discussion section moved into its tables.

Agents are the far end of that. An agent's transcript is text, code, tool output and screenshots, and whether it did good work is part number, part judgment. We can now predict outcomes like that at scale and run experiments on them. Whole fields that only ever had case studies can have estimates.

## Climbing without lying to yourself

The pull right now is to treat prediction as the whole game. A number goes up on a leaderboard and it feels like knowledge. But climbing a score on purpose puts you right back in Leamer's world, and a prompt tweak that wins on a benchmark is a specification search with nicer tooling.

I learned this one personally. My undergrad thesis tried to see S&P 500 bear markets coming with Markov-switching models, and it won an award. Rebuilding it later, I found a timing error that let the regime model see the next month's price. The [revised edition](#/papers/predictive-stochastic-modeling) uses only data published by each forecast date, and most of the skill that survives turns out to be seeing a bear market that has already started.

The tools that keep a climb honest are all versions of not grading your own homework:

- Keep a test set you never touch while tuning, and retire it once you've looked too often.
- Split before you search, the way causal forests do.
- Decide what counts as a win before you run anything.
- Ask whether a gain is an effect or a correlation. A change that only helps on tasks shaped like your benchmark is a good ŷ with no β̂ behind it.

## The same story in software

An A/B test is a randomized trial. A feature rolled out to one region first is a natural experiment. A benchmark is an economic indicator, useful until people are paid to move it. Across all three acts the question stayed the same and what we could call data kept growing: first whatever fit on a calculator, then whatever a server could hold, now almost anything a person can read or see. The room for fooling yourself grows at the same rate. Whether the old discipline comes along into the new room is, I think, one of the quieter things that decides how the next few years of AI go.
