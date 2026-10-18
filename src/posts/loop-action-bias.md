---
title: Loop-action bias
date: 2026-04-08
summary: Pay every step for how the episode ended and an agent learns that rattling the handle is as good as opening the door. Why that happens, and the signal that fixes it.
read: 5 min
---

An agent stands at a locked door. It can try the key, which works three times out of four and otherwise leaves it where it was. Or it can rattle the handle, which never works and never visibly fails.

Train it the simplest way: when an episode ends well, give every step in it the same credit. The failed key turn and the rattle both leave the agent in the same spot, both sit inside episodes that eventually succeed, and both get paid. The rattle has one edge. It never fails. So the trained policy learns to rattle.

I call this loop-action bias. On a controlled benchmark, a policy trained this way did worse than the prompted model it started from, 0.24 success against 0.79. That benchmark uses stochastic tasks and hand-written verifier signals, so read it as a clean demonstration of the mechanism, not a large-scale training run.

## Selecting on the outcome

Econometrics has a name for the mistake. Learning only from how episodes end, mostly from the ones that ended well, is selecting on the outcome: studying only companies that succeeded and concluding that everything they did, useless rituals included, caused the success. Inside a winning episode the outcome doesn't vary with the action, so the key and the rattle look the same.

The variable that separates them was left out of the model: did the state change? The fix is first differencing, one of the first tricks you learn for panel data. Score each step by what it changed instead of by where the episode ended.

**Branch-aware scoring** adds credit when a verifier signal fires and subtracts it at dead ends. A rattle that leaves the screen unchanged reads as a stall.

**Hindsight scoring** looks back over the finished episode and rewards steps it labels pivotal, enabling or recovery.

Each covers the other's blind spot. Branch-aware is weakest on enabling tasks, where a stall draws no dead-end penalty (0.857 success). Hindsight fails on cascade tasks, where the stall carries no label (0.286). Together they reach 1.00 on every diagnostic family and on the stochastic benchmark.

## Monte Carlo, but expensive

Outcome-only credit is what reinforcement learning calls a Monte Carlo return. Economists learn Monte Carlo as: write down a model, simulate ten thousand paths, average them. It works because paths are free and you wrote the model.

Agent training loses both comforts. Nobody wrote down the world, every path costs real minutes and money, and you get a handful of rollouts per task. Worse, Monte Carlo estimates converge by visiting the same state again and again. An agent's state is its whole transcript, which is the only way the process is Markov at all, and transcripts almost never repeat.

Economists solving dynamic models hit this with continuous states you can't revisit exactly, and the standard fix is to bin the state into a grid and treat it as a Markov chain. My undergrad thesis treated the whole stock market as a [two-state chain](#/papers/predictive-stochastic-modeling), bull and bear, which is absurdly coarse and still useful. "The same observation three times" is that kind of grid. It throws away the transcript and asks a coarser question the data can answer: have I been here before?

## Not fooling myself

I wrote the verifiers on the controlled benchmark, so methods built around them would of course look good there. The guards were the usual ones. The diagnostic families were built to break one method at a time, like testing out of sample. The two methods were combined because their failures don't overlap, the same reason an ensemble beats its members. And on real ALFWorld, which has no labels, I read the signals straight from the observation text without tuning them on outcomes: "You arrive at" is progress, an inventory change is stronger progress, "Nothing happens" on an unchanged screen is a dead end, and the same observation three times is a stall.

There I measured training signal, not trained policies. Outcome-only credit separated the better action at 13.3% of states for Claude Haiku 4.5 (30% task success) and 3.4% for Qwen2.5-7B (16.7%). Branch-aware scoring separated 34.8% and 31.8%, which is 2.6x and 9.4x more. Weaker models rarely finish, so for them the final score is mostly silence.

## Rattling the handle

Any team that only hands out credit when the project ships pays the person who reopened the same ticket ten times exactly what it pays the person who closed it. Rattling feels like effort from the inside and looks like effort from the outside. The fix for people is the fix for agents: notice what each step changed, and call a stall a stall.

The [paper](#/papers/branch-aware) has the details, and the [code](https://github.com/jadenfix/CreditAssignment) runs on GCP for under $5. There's an interactive version in the [research section](/#research).
