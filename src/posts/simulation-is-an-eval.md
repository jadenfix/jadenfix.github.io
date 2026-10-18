---
title: The simulation question is an eval question
date: 2026-10-18
summary: Why I got pulled into asking whether you could tell a world is simulated, and what it taught me about evals.
read: 4 min
---

Most of my week is one question in different clothes: did the agent actually get better, or did the number move? Under it is an older one from statistics. Given what you can observe, can you tell two hypotheses apart at all? That property is called identifiability, and if it fails, no amount of data helps.

The simulation hypothesis is the most extreme case I know. Two worlds, one rendered and one not, that produce exactly the same observations. You can write the answer down in one line: every test has power equal to its size and the Bayes factor is 1. Nothing to find, ever. It’s the same statement as “an eval can’t separate two models whose transcripts have the same distribution,”.

That’s where most conversations about simulation stop. What pulled me in is that it’s also where the interesting part starts. A real simulator would be cheap somewhere. It might round its probabilities, keep a small amount of memory, or leak a little information between places that shouldn’t talk. Once you name the economy, the question becomes how much it costs and how many observations it takes to notice. That’s an eval with a power analysis, and you can do it on real data.

## Two real data sets

The first is NIST’s randomness beacon: 131,072 bits of hardware entropy, each pulse committed in advance by a SHA-512 hash. The test for “this source leans one way” ends at −6.03 nats, mild evidence that it’s fair. The more useful part is the frontier. Any renderer that leaned by 0.0087 or more would have been caught 95% of the time, and nothing at all could reliably catch one that leaned by less than 0.002. A null result with an explicit detection limit is worth a lot more than a shrug, and evals almost never report one.

The second is the 2015 Delft Bell test, 245 trials with electron spins 1.3 km apart. The published p-value is 0.039. That number is only valid if 245 was fixed before anyone looked. If you allow stopping whenever the data look good, the best constant-bet test you could have run, even picked in hindsight, peaks at 7.78 against a bar of 20. The violation is real, but on its own these 245 trials can’t rule out a classical renderer with a small leak under that kind of test.

People peek at evals constantly. You run a few hundred tasks, the new model looks better, you ship. That’s optional stopping, and the Delft numbers show how much of the evidence it eats. It’s a good reason to report anytime-valid numbers next to the fixed-n ones.

## Five bits

The result I like most is the cheapest one. Suppose the renderer stores each probability as a fraction with a 5-bit denominator. On the settings a Bell test actually uses, it can hit S = 5/2, right inside Delft’s interval, and no amount of data on those settings separates it from real physics. Change the settings to 0 and π/4 and it’s identifiable, at around a billion trials per setting.

The eval version is a model that passes your benchmark through a shortcut the benchmark never probes. More items don’t help. Different items do. Choosing what to measure matters more than how much of it you measure.

## How the work got done

The repo is a claim ledger. Every statement has an ID, a type (theorem, model result, finite check, open problem), assumptions, things it does not claim, and a script that re-checks it. For this round I had agents propose results and separate agents try to break them. Seven results survived three independent verifiers each. Several sketches didn’t survive, and the ledger records those too, with the corrected versions. It’s the closest I’ve come to research where I trust the output more than my own first pass.

None of this is evidence for or against simulation. It’s a way of asking a vague question precisely enough that data can answer pieces of it. That habit is the one I want in every eval.

[The simulation page](#/simulation) has the instruments running on the real data, and the three papers.
