---
title: The simulation question is an eval question
date: 2026-10-18
summary: I was trained to look for one derivative with everything else held still. Asking whether the world is rendered turned out to be the same exercise, run on the strangest data I've touched.
read: 7 min
---

The simulation question is an eval question. Take away the late-night philosophy and it asks what I ask about a coding agent every week: given everything I can observe, can I tell two explanations apart?

## Where I come from

I grew up on statistics, then data science, then econometrics, which I took all the way through the advanced sequence in grad school. If you squint, all of econometrics is one move. You pick an outcome you care about, like wages, prices, or whether a policy worked, and you go looking for one derivative. How much does y move when x moves, with everything else held still?

"Everything else held still" is the whole game. In a regression you hold things still with controls. In a natural experiment you find a place where the world held them still for you: a lottery, a border, a birthday cutoff. Causal inference is the craft of earning the right to write ∂y/∂x and mean it. Years of it taught me to distrust my own estimates first, and I still think that's the most useful habit I have.

Most of what we try to model in an economy fits that mold, because most of it is already numbers. A coding agent mostly isn't. Some of what it does is countable: the tests passed, it took four minutes, it cost forty cents. The rest is judgment. Did it understand what I meant? Would a teammate want to read this code in a year? Did it find a shortcut that happens to pass? An agent leaves a quantitative trace and does a qualitative act at the same time, and the act is the part we care about.

Evaluating one is still the econometrics move. I want the derivative of "the agent does good work" with respect to one change, a new prompt or a new tool or a new model, with the tasks, the seeds and everything else fixed. Most of eval design is figuring out how to hold the world still when the thing you're measuring makes choices.

## The most extreme case

The simulation hypothesis is that question stretched as far as it goes. Two worlds, one rendered and one not. If the render is perfect, both produce exactly the same observations, and then there is no derivative to find. Every test you could run fires with the same probability in both worlds, and the evidence ratio sits at 1 forever. Statisticians call this a failure of identifiability. Econometricians meet it all the time in a smaller form, as two variables that always move together, so their effects can never be pulled apart.

That's where most conversations about simulation stop. It's also where the interesting part starts, because anyone who has built a simulator knows it has to be cheap somewhere. Games don't render the room behind you. The field behind this site only sharpens where your cursor is. A simulator of physics might round its probabilities, keep a short memory, or let a little information pass between places that aren't supposed to talk. Name the shortcut and the question turns into a measurement: how big would the shortcut have to be, and how much data would it take to see it? That's an eval with a power analysis, and there is real data to run it on.

## A coin nobody can predict

NIST runs a public randomness beacon. Every minute it publishes 512 bits drawn from hardware, and each pulse is committed to in advance with a hash, so nobody can quietly swap the numbers later. If a renderer were saving effort on randomness, a coin that is supposed to be perfectly fair is the first place I'd look.

I took 131,072 of those bits. 65,461 came up one, which is 49.94%. The test for "this coin leans" favours fair by about 400 to 1, which is what genuinely fair bits are supposed to produce.

The more useful number is the frontier. A coin that leaned by 0.0087, landing on one 50.87% of the time, would have been caught 95% of the time. A lean smaller than 0.002 couldn't be caught reliably by anyone with this much data. So the honest summary is: no lean bigger than about nine tenths of a percentage point, and nothing to say about leans smaller than two tenths.

If a lean ever did show up, it would mean the hardware we treat as the definition of unpredictable has a favourite side. That would tilt every cryptographic key and every randomized trial that leans on it. We didn't find one, and now we know how hard we looked.

A null result with a detection limit is the grown-up version of "I didn't see anything." It tells you where the person looked and what they would have noticed. Evals almost never report one, and neither do people.

## Two boxes that shouldn't agree

The second data set is the 2015 Delft Bell test, and the cleanest way I know to explain a Bell test is as a game. Two boxes sit 1.3 km apart. Each gets a random question and has to answer before any signal could cross between them. They win a round when their answers line up in a particular way. Any classical setup, with as much planning beforehand as you like and no talking during, wins at most 75% of rounds. Entangled quantum boxes can win about 85%. Delft played 245 rounds and won 196, which is 80%.

Is 245 rounds enough to say they beat 75%? The paper reports p = 0.039: classical boxes would score this well about 1 time in 25. That number assumes they fixed 245 before anyone looked. If you're allowed to stop whenever the score looks good, which is how almost everyone actually looks at data, you need a test that stays honest under peeking. The best test of that kind, even one picked with hindsight, peaks at 7.78. To claim a result at the usual 5% level it has to reach 20.

The violation itself is real. Other labs ran loophole-free tests the same year with far more rounds. But these 245 rounds alone can't rule out a classical machine with a small leak between the boxes, judged the way you'd judge someone who was allowed to stop while ahead.

If a leak like that could explain Bell tests, the strangest thing physics has ever measured would be a rendering trick: two distant places agreeing because the simulator keeps one shared variable for both.

We all stop while ahead. You run a few hundred tasks, the new model looks better, you ship. You step on the scale every morning and believe the morning it dips. The Delft numbers put a price on that habit: a 1-in-25 result under a fixed plan is worth at most about 8 to 1 once you might have stopped early. I now report both numbers for every eval I care about.

## Five bits

The result I like best is the cheapest one. Suppose the renderer stores every probability as a fraction over 32, so five bits of precision. At the question settings real Bell tests use, a machine like that scores S = 5/2 on the standard Bell score (classical tops out at 2, quantum at about 2.83), which sits right inside Delft's measured range. No amount of data at those settings would separate it from real physics. Ask different questions, with the settings at 0 and π/4, and it gives itself away, after about a billion rounds per setting.

Everyone has met a version of this. The student who aces every exam because the exams always ask the same kind of question. The candidate who interviews perfectly. More of the same question never catches it, and a different question catches it right away. In evals it's the model that passes your benchmark through a shortcut the benchmark never probes. In econometrics a bigger sample never rescues a bad instrument, and choosing what to measure matters more than how much of it you measure.

## How the work got done

The repo is a claim ledger. Every statement has an ID, a type (theorem, model result, finite check, open problem), its assumptions, what it does not claim, and a script that re-checks it. For this round I had agents propose results and separate agents try to break them. Seven results survived three independent verifiers each. Several sketches didn't, and the ledger keeps those too, next to the corrected versions. It's the closest I've come to research where I trust the output more than my own first pass.

## Why I keep coming back to it

Most of life is observational data. You can't rerun a year with one thing changed. We estimate our own derivatives anyway: what if I'd taken the other job, moved to the other city, said the thing I didn't say. The discipline that keeps those guesses honest is the same one that keeps an eval honest. Say what you held fixed. Say what you could have missed.

None of this is evidence for or against simulation. It's a way of asking a question that sounds unanswerable precisely enough that data can answer pieces of it, and that habit is the one I want in every eval I build.

[The simulation page](#/simulation) has the instruments running on the real data, and the three papers.
