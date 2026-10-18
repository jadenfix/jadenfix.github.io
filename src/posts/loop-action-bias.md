---
title: Loop-action bias
date: 2026-04-08
summary: Pay every step for how the episode ended and an agent learns that rattling the handle is as good as opening the door. Econometrics has a name for the mistake and the environment already holds the fix.
read: 6 min
---

There's a door in front of an agent. It can try the key, which works three times out of four and otherwise leaves it standing where it was. Or it can rattle the handle, which never works and never fails. Nothing happens either way.

Now train it the simplest way: when an episode ends well, give every step in that episode the same credit. Episodes where the agent eventually got through the door end well whether or not it rattled first. The failed key turn and the rattle both leave the agent in the same spot, both sit inside winning episodes, and both get paid. The rattle has one advantage. It never visibly fails. So the trained policy learns to rattle.

I call this loop-action bias. On a controlled benchmark, a policy trained this way did worse than the prompted model it started from: 0.24 success against 0.79. That benchmark has hand-written verifier signals and stochastic tasks, so treat it as a clean demonstration of the mechanism and not a large-scale LLM training run.

## The econometrics of a rattle

What went wrong has an old name. Training only on how episodes end, and mostly on the ones that ended well, is selecting on the outcome. It's the mistake of studying only companies that succeeded and concluding that whatever they all did, including the useless rituals, caused the success. Inside a winning episode the outcome doesn't vary with the action, so the data can't tell the key from the rattle. There's no derivative to estimate.

The variable that would separate them is sitting right there, left out of the model: did the state change? The fix looks like first differencing, which is one of the first tricks you learn for panel data. Instead of scoring each step by the level of the final outcome, score it by what it changed.

**Branch-aware scoring** adds credit when a verifier signal fires and subtracts it at dead ends. A failed key turn fires nothing, so it stops looking like a successful one, and a rattle that leaves the screen unchanged reads as a stall.

**Hindsight scoring** looks back over the finished episode and gives bonuses to steps it labels pivotal, enabling, or recovery.

Each has a blind spot the other covers. Branch-aware scoring is weakest on enabling tasks, where a stall draws no dead-end penalty (0.857 success). Hindsight fails on cascade tasks, where the stall carries no label at all (0.286). Together they reach 1.00 on every diagnostic task family and on the stochastic benchmark.

## Monte Carlo, but expensive

Outcome-only credit is what reinforcement learning people call a Monte Carlo return. Run the episode to the end, then pay every step the final score. I learned Monte Carlo the economist's way first: write down a model of a stock price or an interest rate, simulate ten thousand paths, average them. It works beautifully because paths are free and you wrote the model yourself.

Agent training breaks both of those comforts. Nobody wrote down the model of the world, and every path costs real minutes and real money, so you get a handful of rollouts per task, not ten thousand. And Monte Carlo value estimates converge by visiting the same state over and over and averaging what followed. An agent's state is the whole transcript so far, which is the only way its process is Markov at all, and a transcript almost never repeats exactly. There's very little to average.

Economists solving dynamic models hit a version of this decades ago, with continuous states you can never revisit exactly. The standard fix is to discretize: bin the state into a small grid and treat it as a Markov chain on the grid. "The same observation three times" is a crude version of that. It throws away the transcript and asks a coarser question, have I been here before, that the data can actually answer.

## Not fooling myself

The obvious risk with any fix like this is overfitting to my own signals. I wrote the verifiers on the controlled benchmark, so of course methods built around them score well there. The guards I used are the ones econometrics and machine learning lean on everywhere.

The diagnostic task families were built to break one method at a time, the way you test a model out of sample instead of on the data that fit it. The two methods were combined because their failures don't overlap, which is the same reason an ensemble beats its members. And on real ALFWorld, which has no hand-written labels, I pulled the signals straight out of the observation text without tuning them on outcomes. "You arrive at" counts as progress, and an inventory change counts as stronger progress. "Nothing happens" on an unchanged screen is a dead end, and the same observation three times is a stall.

The usual training-time tools fit the same picture. The KL penalty that keeps a fine-tuned model near its starting point is shrinkage toward a prior, the same instinct as ridge regression. Early stopping is a held-out set watching over your shoulder.

## What changed on real data

On ALFWorld I measured training signal, not trained policies. Outcome-only credit separated the better action at 13.3% of states for Claude Haiku 4.5 (30% task success) and 3.4% for Qwen2.5-7B (16.7%). Branch-aware scoring separated 34.8% and 31.8%: 2.6x and 9.4x more. The weaker the model, the less outcome-only credit has to work with, because weak models rarely finish and the final score is mostly silence.

## Rattling the handle

I think about this outside of agents more than I expected to. Any group that only hands out credit when the project ships pays the person who reopened the same ticket ten times exactly what it pays the person who closed it. Rattling feels like effort from the inside and looks like effort from the outside. The fix for people is the same as the fix for agents: notice what each step changed, and say out loud when something was a stall.

[Paper](https://github.com/jadenfix/CreditAssignment/blob/main/paper/main.pdf) and [code](https://github.com/jadenfix/CreditAssignment), open source, and it runs on GCP for under $5. There's an interactive version in the [research section](/#research) of the home page.
