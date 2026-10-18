---
title: The simulation question is an eval question
date: 2026-10-18
summary: Can you tell a rendered world from a real one? It's the question I ask about agents every week, run on the strangest data I've touched.
read: 6 min
---

The simulation question is an eval question. Take away the late-night philosophy and it asks what I ask about a coding agent every week: given everything I can observe, can I tell two explanations apart?

## One derivative

I grew up on statistics, then data science, then econometrics, all the way through the advanced sequence in grad school. Squint and all of econometrics is one move. Pick an outcome, like wages or prices or whether a policy worked, and look for one derivative: how much does y move when x moves, with everything else held still?

That works well for an economy, because most of an economy is already numbers. An agent is harder. Some of what it does is countable: the tests passed, it took four minutes, it cost forty cents. The rest is judgment. Did it understand what I meant? Would a teammate want to read this code in a year? Evaluating one is still the same move, the derivative of "does good work" with respect to one change, but most of the craft is holding the world still when the thing you're measuring makes choices.

## When there's nothing to find

The simulation hypothesis is that question stretched as far as it goes. If a render is perfect, the rendered world and the real one produce exactly the same observations. Every test fires with the same probability in both, and the evidence never moves. Statisticians call that a failure of identifiability. Econometricians meet a small version of it constantly, as two variables that always move together so their effects can't be pulled apart.

Most conversations stop there. I think that's where it gets interesting, because a simulator has to be cheap somewhere. Games don't render the room behind you. The field behind this site only sharpens where your cursor is. A simulator of physics might round its probabilities, or let a little information pass between places that aren't supposed to talk. Name the shortcut and the question becomes a measurement: how big would it have to be, and how much data would it take to see? That's an eval with a power analysis, and there's real data to run it on.

## A coin nobody can predict

NIST runs a public randomness beacon. Every minute it publishes 512 bits from hardware, each committed to in advance with a hash so nobody can swap them later. If a renderer were saving effort on randomness, a coin that's supposed to be perfectly fair is the first place I'd look.

Of 131,072 bits, 65,461 came up one: 49.94%. The evidence favours a fair coin by about 400 to 1, which is what fair bits are supposed to do. The more useful number is the frontier. A coin leaning by 0.0087, landing on one 50.87% of the time, would have been caught 95% of the time, and nothing could reliably catch a lean under 0.002. A lean would have meant the hardware we treat as the definition of unpredictable has a favourite side, tilting every key and every randomized trial built on it.

We didn't find one, and now we know how hard we looked. That's the grown-up version of "I didn't see anything": where you looked, and what you would have noticed. Evals almost never report it. Neither do people.

## Two boxes that shouldn't agree

The second data set is the 2015 Delft Bell test, which is easiest to explain as a game. Two boxes 1.3 km apart each get a random question and must answer before any signal could cross between them. They win a round when the answers line up a certain way. Any classical setup, however much it plans beforehand, wins at most 75% of rounds. Entangled quantum boxes can win about 85%. Delft played 245 rounds and won 196.

The paper reports p = 0.039: classical boxes would do this well about 1 time in 25. That holds only if 245 was fixed before anyone looked. Allow stopping whenever the score looks good, which is how almost everyone actually reads data, and the best honest test peaks at 7.78 against a bar of 20. The violation is real, and bigger experiments confirmed it the same year. But these 245 rounds alone can't rule out a classical machine with a small leak, the kind of shortcut that would make the strangest thing in physics a rendering trick.

We all stop while we're ahead. You run a few hundred tasks, the new model looks better, you ship. You step on the scale every morning and believe the morning it dips. Delft puts a price on the habit: a 1-in-25 result under a fixed plan is worth at most about 8 to 1 once you might have stopped early.

## Five bits

My favourite result is the cheapest. Suppose the renderer stores every probability as a fraction over 32, five bits of precision. At the settings real Bell tests use, it scores right inside Delft's measured range, and no amount of data at those settings separates it from physics. Move the settings to 0 and π/4 and it gives itself away, after about a billion rounds each.

Everyone has met this. The student who aces exams because they always ask the same kind of question. The candidate who interviews perfectly. More of the same question never catches it, and a different question catches it right away. In econometrics a bigger sample never rescues a bad instrument, and in evals choosing what to measure matters more than how much of it you measure.

## The papers

The work lives in a claim ledger: every statement has an ID, its assumptions, what it doesn't claim, and a script that re-checks it. Agents proposed results and separate agents tried to break them, and seven survived three independent verifiers each. The ledger keeps the ones that didn't survive too.

- [Pricing a Bell simulator](/papers/pricing-a-bell-simulator.pdf): what precision, memory, leaks and noise cost a renderer, including the five bits and the Delft numbers.
- [How much evidence can a simulator leave?](/papers/evidence-a-simulator-can-leave.pdf): how fast evidence piles up, the beacon frontier, and what survives optional stopping.
- [Identification, evidence caps, and the price of shared randomness](/papers/identifiability-and-randomness-as-resources.pdf): what an observable law can pin down at all, and what a fair coin can buy.

None of this is evidence for or against simulation. Most of life is observational data anyway. You can't rerun a year with one thing changed, and we estimate our own derivatives regardless: the other job, the other city. The habit that keeps those guesses honest is the one I want in every eval. Say what you held fixed, and say what you could have missed.

[The simulation page](#/simulation) runs the instruments on the real data.
