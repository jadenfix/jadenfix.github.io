---
title: The Verification Bottleneck
date: 2026-10-18
summary: My bet for the late 2020s: generating plausible answers gets cheaper faster than establishing which ones deserve to be used.
read: 5 min
---

If an AI proposed an important new treatment tomorrow, what evidence would convince us to use it?

That question is behind one of my bets for the late 2020s. Models may produce candidate solutions faster than we can establish which ones work. The constraint will depend on the domain: checking a calculation, deciding whether we asked the right question and running an experiment are different jobs.

## Code gives us a head start

In software, we can inspect the implementation, control inputs and run tests. We helped define the system. That gives us an unusually useful starting point.

It still leaves room for a convincing false success. Imagine an inventory service whose tests correctly check that a purchase reserves an item. Two requests arrive together and both reserve the last one. The ordinary tests can pass while the system violates the promise it was supposed to make.

Someone has to turn that promise into a requirement that survives concurrency, retries and failures. Generating more examples of the ordinary purchase won't cover the missing condition.

An agent can also write the implementation and its tests around the same mistaken interpretation. I'd use those tests, but I'd want cases drawn from actual failures and requirements established outside that coding session. A second model can help find omissions. I still want evidence that could contradict both models.

## A huge proof can still be checked

Proof length alone doesn't establish a verification crisis. In September, [Anthropic reported a 13-million-line Lean formalization of Fermat's Last Theorem](https://www.anthropic.com/news/formalizing-fermats-last-theorem). It reported that Lean checked the proof and a comparator matched the final statement to Mathlib's statement of the theorem.

A checker does not need the ingenuity required to invent the proof. Once the statement and assumptions are fixed, mechanical checking can handle work no person would want to review line by line.

There is still a question about what was formalized. [OpenAI's September Navier–Stokes announcement](https://openai.com/index/navier-stokes-solution/) included an analytical writeup and a Lean formalization. [Clay's response](https://www.claymath.org/news/navier-stokes-announcement/) described its evaluation process as deliberately unhurried.

An [October preprint](https://arxiv.org/html/2610.08144v1) argues that parts of the written argument and the formalization differ. Its authors explicitly do not claim that the written proof is incorrect. Their distinction matters: establishing a formal theorem does not automatically validate every intermediate claim in a separate explanation.

My concern is the work around the checker: choosing the statement, inspecting the assumptions and understanding what the result lets us conclude.

## Biology adds another gap

A proof about a biological simulation would establish something about that model under its assumptions. We would still need evidence that those assumptions capture the biology relevant to the proposed treatment.

We can test a treatment without a complete theory of the disease. We need a specific question: which patients, which outcome, compared with what, over what period, and with which harms? [Clinical study design](https://www.fda.gov/patients/drug-development-process/step-3-clinical-research) turns those choices into a protocol. Running and analyzing the study produces evidence.

The measurement itself also needs scrutiny. [The FDA distinguishes clinical outcomes from surrogate endpoints](https://www.fda.gov/drugs/development-resources/surrogate-endpoint-resources-drug-and-biologic-development): a substitute measurement needs evidence connecting it to patient benefit in the relevant setting. Measuring a biomarker precisely and establishing what changing it means are separate achievements.

Calling biology deterministic doesn't give an agent a complete simulator or a cheap checker. Measurements can be noisy, patients differ and important outcomes can take time to appear. A model might help design better experiments. Those experiments still have to establish something about the world.

## What the reward actually verifies

This connects directly to [reinforcement learning with verifiable rewards, or RLVR](https://allenai.org/blog/tulu-3-technical). A verification function supplies the training signal. [DeepSeek-R1-Zero](https://arxiv.org/html/2501.12948v1), for example, used rule-based rewards for mathematical answers and code evaluated against predefined tests.

The usefulness of that loop depends on what the check certifies. Passing coding tests establishes success on those cases. A favorable laboratory measurement establishes something narrower than a treatment helping patients.

RL can learn from noisy rewards; the world does not have to be deterministic. The harder questions are how much evidence each reward contains, how long it takes to obtain and whether optimizing it improves the outcome we actually want.

If an AI discovers a way to improve a proxy while leaving the intended outcome unchanged, more successful optimization can make the reported progress less informative.

## The work I expect to matter

My bet is that choosing and running the next decisive test becomes a larger part of AI work. Which experiment would separate two plausible explanations? Which failure would make us abandon the approach? Can someone reproduce the result without relying on the system's own account of what happened?

That could create valuable work in laboratory automation, evaluation environments and the tools that preserve experimental evidence. I'd judge those tools by whether they help someone make a better decision with less time or uncertainty.

The same issue appears in [a customer pilot](#/blog/what-a-pilot-has-to-prove). Once an eval determines which version ships, it directs engineering effort. A team that rewards faster replies may build something different from a team that measures time saved after review and corrections.

AI can improve verification too; the formal proof example shows that. I'd change my prediction if meaningful empirical validation became cheaper as quickly as generating candidates. Until then, I want to know what a result rules out, what it leaves open and who has checked the part we are about to rely on.
