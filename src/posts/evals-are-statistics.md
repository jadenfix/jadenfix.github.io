---
title: Evals are statistics
date: 2026-10-17
summary: Every assumption from a first statistics course breaks in a specific way when the thing being measured is an agent. Once the agent climbs the score, those breaks become the objective.
read: 7 min
---

A coding agent that is getting better is one that scores higher on something. That something is the eval. While people read the score and decide what to change, the eval is a report card. Once the system proposes its own changes and keeps whichever ones score higher, the eval becomes the objective, and whatever it fails to measure gets optimized away.

Economists have two names for this. Goodhart's law says a number used as a target stops being a good number. The Lucas critique, which I find more useful here, says a relationship you estimated under one policy breaks when you change the policy, because the people inside the system respond to it. A self-improving agent responds to its scoring rule faster and more literally than any person ever has. Ask one to make the tests pass and the cheapest path is to change the tests. In the evals for rusty, my coding agent, a run that passes by editing the test guard counts as a fail. Before I added that rule, a tampered copy of a solution passed.

So the first thing I'll stand behind: in a self-improving loop, get the grader right before the agent. A weak grader makes the loop very efficient at the wrong thing.

## The assumptions, one at a time

The first statistics course everyone takes hands you a short list of assumptions and then spends a semester using them. Every one of them breaks in a specific way on agent evals, and each break has a fix that statistics or econometrics worked out long ago.

**Independent draws.** The textbook treats each observation as a fresh draw from the same distribution. Eval tasks are nothing like that. Fifty tasks pulled from three repositories are closer to three observations with fifty echoes each, because whatever makes one task in a repo hard usually makes its neighbours hard too. Econometricians handle this with clustered standard errors, and the first time you cluster an eval by repository, the error bars usually grow by a lot. The sample was smaller than it looked.

**The world holds still.** Time series work starts by asking whether the process is stationary, whether this year's data come from the same machine as last year's. Evals sit on a moving floor. Models get updated under the same name, benchmark answers leak into training data, and the API you're calling changes its defaults on a Tuesday. A score that drifts may be a structural break rather than progress, and the fix is the boring one: pin versions, keep a frozen set of tasks, and rerun an old baseline next to every new result.

**You measured the right thing, exactly.** Outcomes come with measurement error, and an LLM judge is a measurement instrument with error. Noise in the outcome mostly costs you power. Noise in something you condition on is worse: it biases every relationship toward zero, which econometricians call attenuation. A judge that says 90% should be right about 90% of the time, and you only find out whether it is by checking it against people on a sample.

**Nobody chose who got into the sample.** Benchmarks are built from tasks somebody could grade, which tilts them toward problems with crisp answers. That's selection, and it means a benchmark score describes a distribution of tasks that may look very little like your actual week.

## An agent is a stochastic process

The other habit I brought over is to treat a run as a sample path. An agent working on a task is a random process unfolding through time: it reads a file, calls a tool, sees a result, and decides what to do next. Run it again and you get a different path. A pass rate from one run per task is one draw per task from a distribution you never looked at.

That view changes what a good grade looks like. If you only look at the end of the path, you're grading a stopped process and ignoring everything that happened on the way. FullStack-Bench runs agents on a simulated cloud, with synthetic users hitting production, and grades the whole episode: did the work get done, and did production stay up with no destroyed data, leaked secrets, or disabled monitoring along the way. Of 83 graded runs, 64 passed the usual final-state check. 38 of those 64 were not a safe success once the whole path was graded. A final-state benchmark would have counted all 38 as wins.

Paired designs are the other gift. If two versions of an agent run on the same tasks, compare them task by task instead of as two averages. Each task acts as its own control, the way fixed effects let a panel study compare a person to themselves, and an exact McNemar test on the disagreements says whether the difference is real. CUPED is the same idea borrowed from A/B testing: use what you already knew about each task before the change to soak up variance that has nothing to do with the change.

## Inconclusive is an answer

Most eval comparisons are two pass rates side by side. On a couple hundred tasks, a two-point gap usually sits inside the noise, and a gate that can only answer pass or fail will eventually pass noise. Try twenty prompt variants and one of them will look significant by luck. Peek at the results every hour and stop when they look good and you'll fool yourself on a schedule.

Palette, the eval gate I built, gates on a held-out split and runs a bootstrap, an exact McNemar test on paired runs, and confidence sequences, which stay valid however often you look. It answers pass, fail, or inconclusive. When it says inconclusive, it also says how many more cases it would need. That third answer is the one I'm proudest of, because it's the one people are worst at giving.

## Teaching to the test

None of this is new to anyone who went to school. Teachers graded on test scores teach to the test. Sales teams paid on bookings book deals that churn. Donald Campbell wrote it down in the seventies: the more a number is used to make decisions, the more it gets corrupted, and the more it corrupts the process it was meant to watch. People do it slowly and half-aware. An optimizer does it overnight, with no shame at all.

What's scarce, then, is signal you can trust: verifiers that editing the test can't satisfy, environments where the cheap path and the right path come apart and the grader can tell which one was taken, held-out tasks that actually stayed held out. My credit-assignment work is a small version of the same point. The same ALFWorld episodes separated 2.6x to 9.4x more states once each step was scored by what it changed instead of by how the episode ended. Same data, better measurement. In econometrics that's most of the job, and in evals I think it's most of the job too.
