---
title: Getting into AI from another major
date: 2026-10-18
summary: Find the part of your major you actually enjoy, connect it to work a team needs, and build evidence that you can do it. A practical path through projects, coding agents, interviews and the people who help you get started.
read: 9 min
---

In [Ks all the way down](#/blog/ks-all-the-way-down), I wrote about how early opportunities compound. The practical question afterward is what to do about your next one. If you're in college in the US, especially outside computer science, here's the advice I'd give based on my own path through quantitative economics and engineering.

I'd start by finding work you could become unusually useful at, then building evidence that you can do it.

## Find the work inside your major

"I like programming and I'm good at math" gives you a starting point. I'd go a level deeper. Which part of your major makes you lose track of time? Proving something? Designing an experiment? Understanding why a system failed? Making an awkward process easier for someone?

For me, quantitative economics meant proofs, experiments, A/B testing and trying to understand a process that changes over time. In financial markets, the same relationship can behave differently across regimes. You have to ask what state you're in, what information was available, and whether your explanation survives a different period.

I find a parallel in agent trajectories. A long run becomes easier to reason about when I break it into states: gathering information, choosing an action, calling a tool, checking the result, recovering from an error. Where did the run first go wrong? Did the agent lack evidence, misunderstand it, or act on it incorrectly? Would changing that step improve the outcome?

The transfer is an analytical habit. Labeling states helps locate a failure; controlled comparisons help test its cause. Sometimes a timeline and a few clear categories are enough. You can earn the more complicated model later.

Someone who enjoys physics might find that same connection in simulation or numerical computing. An electrical engineer might enjoy chip verification, accelerator tooling or performance work. Someone drawn to philosophy for its careful arguments might enjoy defining what a good model answer means, finding contradictions and designing qualitative evaluations. That last path still needs rigor: clear rubrics, examples and a way to examine disagreement between reviewers.

Ask what attracted you to the subject, then find work that uses it. Your taste becomes useful when you can explain what you're noticing and turn it into a better result.

## Check that someone needs it

Once you have a direction, check demand. Read current openings, look at what teams are shipping, and ask people doing the work what keeps slowing them down. Popularity on X is a lead to investigate. Repeated problems, hiring and customers give you a stronger reason to invest your time.

Read the responsibilities carefully. "AI engineer" can describe very different days:

| If you enjoy | Work to investigate |
|---|---|
| Making a workflow useful and clear | Product engineering: interfaces, feedback and complete features |
| Understanding bottlenecks and failures | Systems or infrastructure: execution, storage, reliability and performance |
| Learning a customer's problem and building in their environment | Forward-deployed engineering: discovery, integration and deployment |
| Designing measurements and questioning results | Evaluation engineering: datasets, graders, experiments and failure analysis |
| Studying how behavior improves through feedback | RL and post-training: environments, rewards, training loops and evaluation |
| Making a messy process repeatable | Technical operations: workflow automation, exception handling and measurement |

These overlap. Software engineering can sit inside all of them. A data science degree doesn't limit your search to jobs called "data scientist," and interest in RL gives you specific foundations to learn, rather than a job title to collect.

## Practice finishing a small piece

I'd practice in focused three-to-five-hour sessions, at school, with a friend or at a hackathon. Use a coding agent. Start with a narrow outcome, work through the plan, build the complete path and verify that it behaves as intended.

End each session with a slice someone else can run and that you can explain. Larger projects can span several sessions.

Here's a progression I'd recommend.

## Build one: a small service with real behavior

Build a FastAPI support-ticket app. A user can create, view, edit and close a ticket through a minimal interface. Store the data in SQLite. Make one complication part of the task: retrying a submission must not create a duplicate ticket.

Demonstrate persistence after a restart and correct behavior when a submission is retried.

**Answer without AI:**

- Where does the authoritative state live, and what survives a crash?
- If two requests carrying the same idempotency key arrive at once, can they create two tickets? What enforces your answer?
- What happens if two people edit the same ticket?
- Which errors should a caller retry, and which require changing the request?
- What would you add before allowing real users in: authentication, authorization, backups, monitoring? Why did you leave it out of this version?

This gives you a concrete reason to understand idempotency: repeating the same intended operation should have the same effect. An idempotency key also needs rules for reuse, conflicting payloads and concurrent requests. Be able to explain the rules you chose.

## Build two: an agent workflow you can inspect

Extend the ticket app so an agent retrieves a support policy, selects relevant evidence and recommends a response. Keep the recommendation for a person to review. Record the intermediate steps and create a small set of cases with explicit expected behavior, including a case with insufficient evidence.

Now your interests can shape the work. Product might mean a better review experience. Evals might mean a careful rubric and a comparison between two approaches. Systems might mean recovering a run after a tool fails. Pick one emphasis and complete it.

**Answer without AI:**

- What counts as success? Which checks are deterministic, and which require judgment?
- Where did a failed run first go wrong? What evidence supports that diagnosis?
- Could your grader reward a convincing answer that lacks the required evidence?
- If execution stops halfway through, what can safely resume or repeat?
- Does your improvement hold on cases you kept separate from development?

If systems is your direction, another version could be a job runner that survives a worker restart, or a profiler for a numerical workload. Explain the recovery or performance claim with a reproducible demonstration. A frontend is useful when it helps someone use or inspect the result.

## Build three: tasks that can be checked

For a more ambitious project, build a coding-task generator around an open-source repository. Start with one task: a pinned revision, a clear bug or requested change, tests for the behavior, and a reference fix. Confirm that the starting version fails the relevant checks and the reference fix passes in a clean environment.

Then add generation and repeated solver runs across later sessions. Keep the reference solution inaccessible to the solver and the grader outside its writable workspace. Run each attempt in a fresh sandbox with fixed time and spending limits. Show the prompt, result and trace.

Estimate easy, medium and hard from repeated attempts by a specified model and harness under the same budget. Show the actual counts, such as three passes in ten attempts, and the uncertainty. Keep setup failures visible and separate from coding failures. Difficulty belongs to that evaluation setup; it can change when the solver or budget changes.

A recent repository is worth exploring, but it can contain familiar code or problems. Keep provenance and dates; [LiveCodeBench's use of problem release dates](https://livecodebench.github.io/) is a useful example of taking that question seriously.

**Answer without AI:**

- How do you know the task is solvable and the prompt agrees with the tests?
- Could a wrong or hardcoded solution pass? Can the solver tamper with the grader?
- Are low pass rates caused by difficulty, ambiguity or broken infrastructure?
- Which model, tools, budgets and number of attempts produced the label?
- What would more trials change about your confidence in that label?

Start with one validated task. Generation and calibration should grow across later sessions.

## Close the AI window and explain it

Plan mode is only useful if you understand the plan. Before building, be able to describe the data flow, where state lives, the main failure modes and how you'll check completion. While reviewing, follow the important code paths yourself.

At the end, close the AI window and walk someone through the result. Why this design? Where does it break? Which errors do you handle, and which do you surface? What did you knowingly leave out? What changes when other people depend on it?

You should be able to answer, "I accepted this failure mode because the prototype has one user; before launch I'd address it this way." Every added component creates work too. Explain why the safeguards you chose fit the problem.

If you can't explain a choice simply, reproduce the behavior and learn the missing part. Eventually, the explanation should be yours.

## Put the work in front of people

For project ideas, ask friends what kinds of work they're encountering in startup interviews. Use public exercises and general themes they're allowed to share. Keep confidential prompts and proprietary material out of it.

Then make your own work easy to inspect: a short demo, a runnable repository, the checks you ran and a few decisions you can defend. A small completed build gives a founder or hiring manager something concrete to discuss with you.

I'm a fan of cold applications and cold approaches. If you're in San Francisco, meet people building things you care about. Use warm connections too: classmates, alumni, siblings' friends, parents' friends and university communities. On X and LinkedIn, share what you built, what broke and what you learned. Give people a specific reason to talk to you.

Seek out ambitious people whose work you respect and whose goals overlap with yours. Build together, help them and have fun doing it. The [room you spend time in](#/blog/the-bottom-of-the-next-room) can introduce you to work you didn't know existed. Friendship and shared work give that connection substance.

## Prepare for the interview you're actually taking

My advice on interview prep has changed over the last few months. In the AI startups I'm paying attention to, I've been seeing less emphasis on LeetCode-style preparation. I'd now put much more time into building, debugging and system design.

[Sierra's published process](https://sierra.ai/blog/the-ai-native-interview) is a concrete example: candidates plan a product, build it with their choice of AI tools in two hours, then discuss the implementation and its path to production. Sierra also replaced its coding phone screen with system design.

Check each company's format. [Anthropic's candidate guidance](https://www.anthropic.com/candidate-ai-guidance), for example, requires independent work in interviews and take-homes unless AI is expressly allowed. Prepare for the coding fundamentals and constraints your target role actually tests.

I'd also try to get real experience early: an internship, a small paid project, a research lab or a meaningful open-source contribution. In my view, two weeks with real users, strong feedback and responsibility can teach you more than months of isolated tinkering. The value comes from those conditions, so look for them in the team you join.

Keep the cycle short: find useful work, build a small complete version, verify it, explain it, show it to someone and repeat.
