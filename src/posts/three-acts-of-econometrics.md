---
title: Three acts of econometrics
date: 2026-10-18
summary: Compute decided what economists could ask. First it was scarce, then it was cheap, and now it can read. Evals are the newest chapter of the same story, with the same old ways to fool yourself.
read: 8 min
---

The first large model of the US economy, the Klein-Goldberger model from 1955, had about twenty equations fit to data from 1929 to 1952. Through most of the fifties, the only way to compute anything like it was an electromechanical desk calculator. Every coefficient was hours of somebody cranking.

I think about that when a regression with a few hundred thousand rows and a hundred controls finishes before I've let go of the enter key. The history of econometrics, the way I learned it in grad school, is mostly a history of what compute let people ask. I tell it in three acts. The dates are loose, but the shape isn't.

## Act one: arithmetic is expensive

For a long time, the bottleneck was arithmetic. If each extra variable costs you a day, you choose your variables before you touch the data, and theory does the choosing. You wrote down what a consumer or a firm should do, derived the one or two relationships that mattered, and estimated those. Models were small because they had to be.

As computers spread through universities, and later onto desks, the regressions grew. More variables, longer time series, panels that follow the same people or firms for years. That bought something real. Holding more things constant meant you could get closer to the derivative you actually wanted, the effect of one thing with everything else still.

It also bought a new way to fool yourself. With enough variables, you can try specifications until one says what you hoped. In 1983 Edward Leamer published a paper called "Let's Take the Con out of Econometrics," and the con was exactly that: results that depended on which of many reasonable models the author happened to report. The answer that grew out of the next two decades was to care less about the model and more about the design. Find a lottery, a policy that started on one side of a border and not the other, a cutoff that split otherwise identical people, and let the world run the experiment. Angrist and Pischke called it the credibility revolution in 2010, and in 2021 Card, Angrist and Imbens shared a Nobel for it.

## Act two: data gets big and machines learn

Somewhere around the late 2000s, the data changed character. Clicks, searches, transactions and sensors produced more rows than any economist had planned for, and cheap compute meant you could fit models with thousands of parameters and check them by holding data out. In 2012 a neural network won the ImageNet competition by a margin that ended the argument about whether this stuff worked. In 2014 Hal Varian wrote a paper for economists titled "Big Data: New Tricks for Econometrics," which is about as clear a signal as the field sends.

Machine learning brought a discipline econometrics had underused: judge a model by how it does on data it hasn't seen. Cross-validation, regularization and held-out test sets are all ways of admitting that a model will memorize whatever you let it memorize.

It also brought a confusion that's still with us. Mullainathan and Spiess put it cleanly in 2017: machine learning is built to produce good predictions, ŷ, and econometrics is built to produce good estimates of effects, β̂. A model can predict house prices beautifully while telling you nothing reliable about what an extra bedroom is worth, because it's free to lean on whatever happens to correlate. Prediction answers "what will happen." Policy needs "what happens if we change this," and the second question is harder.

## Act three: the machine can read

The third act started when the two traditions began borrowing each other's best parts. Double machine learning, first posted in 2016, uses flexible ML models for all the messy parts of a problem and keeps the classical machinery for the one derivative you care about. Causal forests, published in 2018, find where an effect is large and where it's small, and they stay honest by fitting the shape on one half of the data and estimating the effect on the other.

The bigger change was in what counts as data. Economists had already shown you could measure growth from satellite photos of lights at night. Then in 2017 came the transformer, and over the following years most of what used to be qualitative became measurable. A central bank statement, a product review, a support ticket, a photo of a storefront and a page of code can all be turned into numbers a regression can use. Things that used to live in the discussion section of a paper became variables.

Agents are the far end of that. An agent's transcript is text, code, tool output and sometimes screenshots, and whether it did good work is partly a number and partly a judgment. For the first time we can model that kind of outcome at scale, predict it, and run experiments on it. Whole fields that only ever had case studies can now have estimates.

## Hill climbing without lying to yourself

The pull right now is to treat prediction as the whole game. A number goes up on a leaderboard, and the number going up feels like knowledge. Prediction has earned its reputation, but once you start climbing a score on purpose you're in Leamer's world again, trying specifications until one looks good. A prompt tweak that wins on a benchmark is a specification search with nicer tooling.

The tools that keep the climb honest already exist, and nearly all of them are some form of not grading your own homework:

- Keep a test set you never look at while tuning, and retire it when you've looked too often. Kaggle competitors learned this the hard way every time the private leaderboard reshuffled the public one.
- Split before you search. Causal forests stay honest by finding structure on one half and measuring on the other, and eval sets can be split the same way.
- Decide what counts as a win before you run anything. Pre-registration was the social version of this fix in economics.
- Ask whether the gain is an effect or a correlation. A change that only helps on tasks that look like your benchmark is a good ŷ with no β̂ behind it.

## The same story, in software

The parallels between economics and software are closer than people in either field usually admit. An A/B test is a randomized trial. A feature flag rolled out to one region first is a natural experiment waiting to be analyzed. A benchmark is an economic indicator, useful exactly until people are paid to move it. GDP got gamed in its own ways long before any model was trained on SWE-bench.

What changed over these three acts was never the core question. It was always how much does y move when x moves, and how sure can I be. What changed is what we're able to call x and y. First it was whatever could be cranked out on a calculator, then whatever a server could hold, and now it's nearly anything a person can read or see. That's thrilling, and it widens the room for fooling yourself at the same rate. I think most of the next few years of AI progress depends on whether we bring the old discipline along into the new room.
