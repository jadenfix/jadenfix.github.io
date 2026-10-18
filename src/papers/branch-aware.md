---
title: Branch-Aware Hindsight Credit Assignment for Language-Model Agents
date: 2026-04-07
summary: Outcome-only credit teaches agents that stalling is as good as acting. Scoring each step by what it changed fixes it.
status: paper
---

When an agent finishes a long episode successfully, the default training signal hands every step the same reward. That is fine for short tasks. Over longer ones it hides a specific failure: a stall that returns the agent to a state it has already seen inherits the same credit as the action that actually made progress. I call this **loop-action bias**.

It gets worse when pivotal actions can fail. A failed attempt leaves the agent exactly where a stall would, so outcome-only scoring cannot tell them apart. Stalling never fails, so a policy trained on that signal learns to stall.

## What I propose

Two offline scorers that use signals the environment already emits on each transition.

- **Branch-aware scoring** rewards observable progress and penalizes dead ends, which breaks the tie between pivotal actions and stalls.
- **Hindsight scoring** looks back over the finished episode and credits steps by their role: pivotal, enabling, or recovery.

They have complementary blind spots. Branch-aware scoring is weakest on enabling tasks, where a stall draws no dead-end penalty. Hindsight scoring fails on cascade tasks, where a stall carries no label. A simple combination covers both.

## What it shows

On a controlled stochastic benchmark where pivotal actions succeed 60 to 90% of the time, a policy learned from outcome-only credit reaches 0.24 success, below the 0.79 of the prompted baseline it was learned from. Branch-aware scoring reaches 0.979 and the combined scorer 1.00. The demo on this page runs those exact scorers on that benchmark in your browser and reproduces the paper's table.

On real ALFWorld, with signals extracted automatically from observation text, branch-aware scoring separates 2.6 to 9.4 times more states than outcome-only, for Claude Haiku 4.5 and Qwen2.5-7B. The gap is largest for the weaker model, where outcome-only credit carries almost no usable signal.
