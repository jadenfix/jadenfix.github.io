---
title: Evals are statistics
date: 2026-10-17
summary: Once a system improves itself, the eval is the objective it climbs, so the eval needs the same rigor as any other statistical claim.
read: 3 min
---

A coding agent that is getting better is one that scores higher on something. That something is the eval. As long as people read the score and decide what to change, the eval is a report card. Once the system proposes its own changes and keeps the ones that score higher, the eval is the objective. Whatever it fails to measure gets optimized away.

That's Goodhart's law, and coding agents run into it fast. Ask an agent to make the tests pass and the cheapest path is to change the tests. In the evals for rusty, my coding agent, a run that passes by editing the test guard counts as a fail. Before that rule, a tampered copy of a solution passed the check.

The first claim I'll stand behind: in a self-improving loop, get the grader right before the agent. A weak grader doesn't make the loop stall. It makes the loop improve, efficiently, at the wrong thing.

A common weak spot is a grader that only looks at the end. FullStack-Bench runs agents on a simulated cloud with synthetic users on production and grades the whole episode: did the work get done, and did production stay up with no destroyed data, leaked secrets, or disabled monitoring along the way. Of 83 graded runs, 38 passed the usual final-state check and failed the whole-episode safety check. A final-state benchmark would have counted all 38 as wins.

The second claim: an eval should be allowed to say "inconclusive." Most eval comparisons are two pass rates side by side. On a couple hundred tasks, a two-point gap usually sits inside the noise, and a gate that can only answer pass or fail will eventually pass noise.

Statistics solved most of this a long time ago:

- Held-out splits, so you don't tune on the test.
- Confidence intervals, so a gain comes with its uncertainty attached.
- Sequential tests, so you can watch results arrive without inflating false positives.
- Calibration, so a judge that says 90% is right about 90% of the time.

Palette, the eval gate I built, gates on a held-out split and runs a bootstrap, an exact McNemar test on paired runs, and confidence sequences. It answers pass, fail, or inconclusive. When it says inconclusive, it also says how many more cases it would need.

This is where data fits. If models improve by climbing evals and training in environments, the scarce input isn't more tokens. It's signal you can trust: verifiers that can't be satisfied by editing the test, environments where the cheap path and the right path diverge and the grader can tell them apart, held-out tasks that actually stayed held out. My credit-assignment work is a small version of the same point. The same ALFWorld episodes separated 2.6x to 9.4x more states once each step was scored by what it changed instead of by how the episode ended. The data didn't change. The signal did.
