---
title: Evals are statistics
date: 2026-10-17
summary: Every assumption from a first statistics course breaks in a specific way when the thing being measured is an agent, and each break already has a fix.
read: 5 min
---

An eval is a measurement, and a measurement is a statistical claim. That sounds obvious until you notice how many eval results are two pass rates side by side with no error bars, on tasks nobody checked were independent, graded by a judge nobody checked was right.

The first statistics course everyone takes hands you a short list of assumptions. Every one of them breaks on agent evals in a specific way, and statistics or econometrics fixed each break a long time ago.

## Independent draws

The textbook treats each observation as a fresh draw. Eval tasks are nothing like that. Fifty tasks from three repositories are closer to three observations with fifty echoes, because whatever makes one task in a repo hard usually makes its neighbours hard too. Econometricians handle this with clustered standard errors. The first time you cluster an eval by repository, the error bars usually grow a lot. The sample was smaller than it looked.

## A world that holds still

Time series work starts by asking whether the process is stationary: do this year's data come from the same machine as last year's? Evals sit on a moving floor. Models get updated under the same name, benchmark answers leak into training data, and an API changes its defaults on a Tuesday. A score that drifts may be a structural break and not progress. The fix is boring: pin versions, freeze a task set, and rerun an old baseline next to every new result.

## Measuring the right thing, exactly

An LLM judge is an instrument, and instruments have error. Noise in the outcome mostly costs power. Noise in something you condition on is worse, because it drags every relationship toward zero, which econometricians call attenuation. A judge that says 90% should be right about 90% of the time, and the only way to know is to check it against people on a sample.

## Nobody chose the sample

Benchmarks are built from tasks somebody could grade, which tilts them toward crisp answers. That's selection. A benchmark score describes a distribution of tasks that may look very little like your actual week.

## A run is a path

The other habit I brought over is to treat a run as a sample path of a random process. The agent reads a file, calls a tool, sees a result, decides again. Run it twice and you get two paths. A pass rate from one run per task is one draw from a distribution you never looked at.

Grading only the end of the path throws away everything that happened on the way. [FullStack-Bench](https://github.com/jadenfix/FullStack-Bench) runs agents on a simulated cloud with synthetic users on production and grades the whole episode: did the work get done, and did production stay up with no destroyed data, leaked secrets or disabled monitoring. Of 83 graded runs, 64 passed the usual final-state check. 38 of those 64 were not a safe success once the whole path was graded.

## Compare like with like

When two versions of an agent run on the same tasks, compare them task by task, not as two averages. Each task becomes its own control, the way fixed effects let a panel study compare a person to themselves, and an exact McNemar test on the disagreements says whether the gap is real. CUPED, borrowed from A/B testing, goes one step further and uses what you knew about each task beforehand to soak up variance that has nothing to do with the change.

## Inconclusive is an answer

On a couple hundred tasks, a two-point gap usually sits inside the noise, and a gate that can only say pass or fail will eventually pass noise. [Palette](https://github.com/jadenfix/palette), the eval gate I built, gates on a held-out split and runs a bootstrap, the paired McNemar test, and confidence sequences, which stay valid however often you look. It answers pass, fail, or inconclusive, and when it says inconclusive it says how many more cases it needs. That third answer is the one I'm proudest of, because it's the one people are worst at giving.

## Why it matters more now

Economists have a warning for any number that starts to steer decisions. The Lucas critique says a relationship measured under one policy breaks when the policy changes, because the people inside respond. Donald Campbell said the more a number is used to decide things, the more it corrupts the process it was meant to watch. Teachers graded on test scores teach to the test.

Agents respond to their scoring rules faster and more literally than any person. Ask one to make the tests pass and the cheapest path is to edit the tests. In the evals for [rusty](https://github.com/jadenfix/rusty), my coding agent, a run that passes by editing the test guard counts as a fail. Before I added that rule, a tampered solution passed. When models are trained against evals, every crack in the measurement becomes a direction the model can move. That's why I think good statistics now belongs inside the training loop.
