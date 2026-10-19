---
title: Getting into AI from another major
date: 2026-10-18
summary: Find useful work through the part of your major you enjoy, then build complete projects you can verify and explain. Three projects, fifteen questions and a short path to real experience.
read: 6 min
---

In [Ks all the way down](#/blog/ks-all-the-way-down), I wrote about how early opportunities compound. The practical question is what to do about your next one. If you're in college in the US, especially outside computer science, here's the advice I'd give from my path through quantitative economics and engineering.

Start with a problem your major has taught you to question well. Then learn enough engineering to build something useful around it.

## Find the work inside your major

Go a level deeper than liking programming and math. Which part of your major makes you lose track of time: proofs, experiments, diagnosing a failure or improving an awkward process?

For me, quantitative economics meant proofs, A/B testing and understanding processes that change over time. I find a parallel between financial markets moving through regimes and agent trajectories moving through states. Breaking a run into evidence gathering, actions and recovery helps me locate failures. Controlled comparisons help test their causes. I explore the measurement side in [Evals are statistics](#/blog/evals-are-statistics).

Physics might lead you toward simulation; electrical engineering toward chips or performance. Philosophy might lead you toward qualitative evaluations: defining a good answer, finding contradictions and examining disagreements. That still requires clear rubrics and evidence.

For qualitative evals, show two plausible answers, the distinction your rubric catches and why that distinction matters to the user.

## Check that someone needs it

Read current openings and write down the deliverables that keep appearing: a customer integration, a grader, a reliable job runner. Ask people doing the work which part is still painful. That gives you a project to build and a reason someone might care about it.

| If you enjoy | Work to investigate |
|---|---|
| Making workflows clear and useful | Product engineering |
| Understanding bottlenecks and failures | Systems and infrastructure |
| Learning customer processes and implementing changes | Forward-deployed engineering |
| Designing measurements and questioning results | Evaluation engineering |
| Improving behavior through feedback | RL and post-training |
| Making messy processes repeatable | Technical operations |

A data science degree doesn't limit you to jobs called data scientist. Customer-oriented work also includes technical sales, architecture and deployment strategy; see [Understanding the Roles](#/blog/understanding-the-roles).

## Practice finishing

Practice in focused three-to-five-hour sessions, at school, with a friend or at a hackathon. Use a coding agent to plan, build and verify one complete path. Finish each session with something another person can run and you can explain. Larger projects should span several sessions.

Have a friend run it from the README, then ask them to change one requirement. See whether you can explain which parts need to change and why. A polished demo can hide a lot of missing understanding.

Here is a progression I'd recommend.

## Build one: a service with real behavior

Build a FastAPI ticket app with a minimal interface and SQLite storage. Users can create, view, edit and close tickets. Demonstrate persistence after a restart. Make retries part of the task: repeating a submission must not create a duplicate ticket.

**Answer without AI:**

- Where does authoritative state live, and what survives a crash?
- Can concurrent requests with the same idempotency key create duplicates? What enforces your answer?
- What happens when two people edit the same ticket?
- Which errors should callers retry, and which require changing the request?
- What would real users require: authentication, authorization, backups or monitoring? Why did you leave anything out?

Idempotency means repeating the same intended operation has the same effect. Explain your rules for key reuse, conflicting payloads and concurrency.

## Build two: an inspectable agent workflow

Extend the app so an agent retrieves a support policy and recommends a response for human review. Record intermediate steps. Create cases with explicit expected behavior, including insufficient evidence.

Choose an emphasis: a useful review interface for product, a rubric and comparison for evals, or recovery after a tool failure for systems. Complete that slice.

**Answer without AI:**

- What counts as success? Which checks are deterministic, and which require judgment?
- Where did a failed run first go wrong? What evidence supports your diagnosis?
- Can your grader reward a convincing answer without supporting evidence?
- If execution stops halfway through, what can safely resume or repeat?
- Does the improvement hold on cases kept separate from development?

A systems-focused alternative is a job runner that survives a worker restart, or a profiler for a numerical workload. Make the recovery or performance claim reproducible.

## Build three: coding tasks that can be checked

Build a task generator around an open-source repository. Start with one pinned revision, a clear requested change, behavioral tests and a reference fix. Confirm that the starting version fails the relevant checks and the fix passes in a clean environment.

Add generation and repeated solver runs across later sessions. Hide the reference solution from the solver and keep the grader outside its writable workspace. Give each attempt a fresh sandbox and fixed time and spending limits.

Label tasks easy, medium or hard using repeated attempts by a specified model and harness under the same budget. Show actual counts, such as three passes in ten attempts, alongside uncertainty. Separate setup failures from coding failures. The label can change with the solver or budget.

A recent repository can still contain familiar problems. Track provenance and dates; [LiveCodeBench's use of problem release dates](https://livecodebench.github.io/) is a useful reference.

**Answer without AI:**

- How do you know the task is solvable and the prompt agrees with the tests?
- Could a wrong or hardcoded solution pass? Can the solver tamper with the grader?
- Do low pass rates reflect difficulty, ambiguity or broken infrastructure?
- Which model, tools, budgets and number of attempts produced the label?
- How would more trials change your confidence?

## Close the AI window

Plan mode helps when you understand the plan. Before building, explain the data flow, state, failure modes and completion checks. After building, follow the important code paths yourself.

Then explain the result without AI. Why this design? Which errors do you handle? What did you knowingly leave out? What changes before launch? If you cannot explain a choice simply, reproduce the behavior and learn the missing part.

## Put the work in front of people

Ask friends about public exercises and general interview themes they are allowed to share. Use those for inspiration; keep confidential prompts and proprietary material out of your projects.

Share a short demo, runnable code, verification results and decisions you can defend. I'm a fan of cold applications and approaches. Use warm connections too: classmates, alumni, family friends and university communities. On X and LinkedIn, show what you built and learned. If you're in San Francisco, meet people building things you care about.

Find ambitious people with overlapping goals. Help them, build together and have fun. The [room you spend time in](#/blog/the-bottom-of-the-next-room) can introduce you to work you didn't know existed.

## Prepare for the actual interview

My advice has shifted toward building, debugging and system design. I've been seeing less emphasis on LeetCode-style preparation at the AI startups I follow.

[Sierra's published process](https://sierra.ai/blog/the-ai-native-interview) is one example: plan a product, build with AI tools in two hours, then discuss the implementation and production tradeoffs. It also replaced its coding phone screen with system design.

Check your target company's format. [Anthropic's candidate guidance](https://www.anthropic.com/candidate-ai-guidance), for example, requires independent work unless AI is explicitly allowed. Prepare for the fundamentals and constraints the role actually tests.

Seek real experience early: an internship, paid project, research lab or meaningful open-source contribution. In my view, two weeks with real users, feedback and responsibility can teach more than months of isolated tinkering. Look for those conditions.

Keep the cycle short: find useful work, build a complete slice, verify it, explain it, show someone and repeat.
