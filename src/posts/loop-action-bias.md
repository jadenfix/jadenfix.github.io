---
title: Loop-action bias
date: 2026-04-08
summary: Outcome-only credit can teach an agent that stalling is as good as acting, and the environment already has the signal that fixes it.
read: 3 min
---

Most LLM agent training pipelines have a silent bug that makes agents prefer stalling over acting.

I named it "loop-action bias." Here's how it works:

Agent tries to unlock a door. Fails (75% success rate). Stays in same spot.

Agent rattles the door handle. Nothing happens. Stays in same spot.

To outcome-only scoring, these look IDENTICAL. Same state, same episode eventually succeeds.

So the agent learns: rattling = unlocking. Both get credit. But rattling is "safer" (never fails). So the trained policy rattles forever.

Result: trained agent performs WORSE than untrained. 0.24 vs 0.79.

To be precise about that number: it's a policy trained on outcome-only credit against the prompted baseline, on a controlled stochastic benchmark with hand-authored verifier signals. Not a large-scale LLM RL run.

Fix: use the signals the environment already gives you. Room changed? Progress. Same observation 3x? Stalling. That's it.

Tested on real ALFWorld with Claude Haiku + Qwen-7B. Works on both. Open source. (Run it on your own infra, or on GCP for under $5.)

## The longer version

Outcome-only credit gives every step of a winning episode the same reward, so credit follows how the episode ended, not what each step changed.

**Branch-aware scoring** adds credit when a verifier signal fires and subtracts it at dead ends. A failed unlock fires nothing, so it stops looking like a successful one.

**Hindsight scoring** looks back over the finished episode and gives bonuses to steps labeled pivotal, enabling, or recovery.

Each has a blind spot the other covers. Branch-aware is weakest on enabling tasks, where a stall draws no dead-end penalty (0.857 success). Hindsight fails on cascade tasks, where the stall carries no label at all (0.286). Combined, they reach 1.00 on every diagnostic task family and on the stochastic benchmark.

Real ALFWorld has no hand-written labels, so I pulled signals from the observation text: "You arrive at" is progress, an inventory change is stronger progress, "Nothing happens" on an unchanged screen is a dead end, the same observation three times is a stall. There I measured training signal, not trained policies. Outcome-only separated the preferred action at 13.3% of states for Haiku (30% task success) and 3.4% for Qwen2.5-7B (16.7%). Branch-aware separated 34.8% and 31.8%: 2.6x and 9.4x more. The weaker the model, the less outcome-only has to work with.

[Paper](https://github.com/jadenfix/CreditAssignment/blob/main/paper/main.pdf) and [code](https://github.com/jadenfix/CreditAssignment). There's an interactive version in the [research section](/#research) of the home page.
