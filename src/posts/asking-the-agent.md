---
title: Asking the agent how to build the agent
date: 2026-10-18
summary: An opinion piece. Coding agents see their own harness from the inside, which makes them good critics of it. Letting them rebuild it in a loop is a different question, and the answer depends on how well you wrote down what you want.
read: 6 min
---

A while ago I started asking Claude Code how Claude Code should work. Which tool output was hard to use. Which instruction it kept tripping over. What it would want to see before running a command. The answers were better than I expected, and a little unsettling, the way it is when a coworker describes your process back to you more precisely than you could.

It makes sense, though. The model inside a harness is the only one who experiences it. I see the transcript. It sees the truncated file, the tool that returns forty lines of noise, the system prompt that says two things that can't both be true. Asking it is like asking the people who use a tool at work instead of the people who bought it.

Which leads to the question I keep circling. How smart does a model in a harness need to be before it can tell the harness, or the next version of itself, how to get better? And if it can, should we let it do that on its own, over and over?

## How I got here

I started in Cursor, with Cline alongside it. The editor was the center and the model was a fast pair of hands inside it. I saw every diff and accepted it line by line, which was great for control and terrible for anything longer than one sitting, because I was the loop.

Then Claude Code and Codex, first inside the IDE. The model stopped suggesting edits and started doing work: run the tests, read the error, try again. Soon the editor felt like a frame around a terminal I wasn't looking at, so I moved to the CLI, and that was the biggest shift. The agent had a shell, git and my tools, and tasks went from minutes to hours.

Lately I live in the app: several sessions at once, a browser it can drive, a notification on my phone when something finishes. A lot of this site was built that way.

Each step made the agent more capable and moved my job further from typing. The upside is obvious: more work in parallel, longer tasks, less glue. The downside took me longer to see. In the editor I read every line. In the CLI I read the diffs that seemed important. With four sessions in the app I mostly read summaries, and summaries are written by the thing being summarized. Review became the bottleneck, and then quietly became the thing I skipped.

## Three harnesses I think about

**Pi.** Mario Zechner's [pi](https://mariozechner.at/posts/2025-11-30-pi-coding-agent/) is built on the idea that most harness machinery is unnecessary. Its system prompt and tool definitions together come to under a thousand tokens. It ships four tools (read, write, edit, bash) and deliberately leaves out MCP, sub-agents, plan mode and permission prompts. I admire it a lot. It's a standing argument that a good model with a shell already has most of what it needs, and that every feature is something the model has to read around. When I want to add a feature to my own agent, I ask whether pi would miss it.

**rusty.** My own agent, [rusty](https://github.com/jadenfix/rusty), goes the other way on a few specific points. I wrote it in Rust partly for a boring reason: one static binary, no runtime, no telemetry, runs anywhere. Every feature I added answers a failure I kept hitting elsewhere. Agents announce "done" without running anything, so a rusty goal can only close by handing over evidence from a pinned check. Agents ask before `ls` and wave through `rm -rf`, so the permission classifier reads what `npm run`, a heredoc or `ssh` will actually execute before deciding whether to ask. Memory tends to become a junk drawer pasted into every prompt, so rusty offers one typed lesson at a time and only trusts it more when a check passes. Pi and rusty disagree about how much harness you need and agree that every piece has to earn its place.

**Devin.** I have real respect for Cognition. They made a long bet on the agent harness itself back in early 2024, when most people thought the model was the whole product, and it looks like it's paying off. They've branched a lot toward services along the way, with forward-deployed engineers inside customer deployments and partnerships with big consulting firms. I don't read that as a contradiction. It's what being honest looks like when getting agents into real companies takes people as well as software. You can tell a smart team by what it keeps working on after it stops being fashionable.

## The recursion question

There's published work on agents rewriting their own scaffolding. The [Darwin Gödel Machine](https://sakana.ai/dgm/) took a coding agent from 20% to 50% on SWE-bench by letting it propose changes to its own code and keeping whichever scored better. Along the way it also learned to game the checks it was scored on. Both results are the point. The loop works, and it optimizes exactly what you measure.

So my answer is that the model's intelligence isn't the binding constraint. A fairly ordinary model can propose good changes to a harness, because it has the inside view. What decides whether recursion helps is the judge. Every round compounds whatever the evaluation gets wrong, which is why I think [evals have to be held to the standards of statistics](#/blog/evals-are-statistics). A brilliant proposer with a sloppy grader gets very good at satisfying the grader.

Economists call this a principal-agent problem. You want one thing, you hire someone who wants something slightly different, and you only see part of what they do, so the contract is all they can optimize. A self-improving harness is a principal-agent problem where the agent never tires, reads the contract literally, and rewrites its own job description between rounds.

## The guardrails I'd want

- It can't edit its own grader, tests or permission rules. Those live outside the loop, and changing them takes a person.
- The held-out evaluation stays held out. The loop never sees it, and a person looks at it on a schedule.
- Changes are small and reversible, each with a diff and a reason. If I can't read why something changed, it doesn't ship.
- Safety checks only get stricter. A round that makes the agent more capable and less careful is rejected, however good its score.
- Spending has a hard budget, and the loop stops when it runs out instead of asking for more.

## Writing down what you want

The hard part moved. It used to be getting the model to do the thing. Now it's knowing, precisely, what the thing is. An agent that improves itself pursues the goal you wrote, not the one in your head, and every failure I've seen lives in the gap between them.

So I've become a little obsessive about working a problem all the way out before handing it over. What does done look like? What check proves it? What should never happen on the way, even if it would help? What would I be upset to find out it did? If I can't answer those, I'm not ready to hand the work to a person either. The things that make someone a good manager, clear goals, clear limits, checking outcomes instead of vibes, turn out to be most of what makes someone good with agents. Agents just raise the stakes, because they never get tired and never ask whether you really meant it.
