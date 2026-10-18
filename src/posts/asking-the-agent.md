---
title: Asking the agent how to build the agent
date: 2026-10-18
summary: An opinion piece. Coding agents can see their own harness from the inside, which makes them good critics of it. Letting them rebuild it in a loop is a different question, and the answer depends almost entirely on how well you wrote down what you want.
read: 8 min
---

A while ago I started asking Claude Code how Claude Code should work. Which tool output was hard to use. Which instruction it kept tripping over. What it would want to see before deciding to run a command. The answers were better than I expected, and a little unsettling, the way it's unsettling when a coworker describes your process back to you more precisely than you could.

It makes sense, though. The model inside a harness is the only one who experiences the harness. I see the transcript. It sees the truncated file, the tool that returns forty lines of noise, the system prompt that says two things that can't both be true. Asking it is like asking the people who actually use a tool at work instead of the people who bought it.

That leads to the question I keep circling, which is almost existential for anyone building in this space. How smart does a model in a harness need to be before it can tell the harness, or the next version of itself, how to get better? And if it can, should we let it do that over and over on its own?

## How I got here

I started where a lot of people did, in Cursor, with Cline alongside it. The editor was the center of everything and the model was a very fast pair of hands inside it. You saw every diff. You accepted or rejected it line by line. It was great for staying in control and terrible for anything that took more than one sitting, because I was the loop. Every step waited on me.

Then I moved to Claude Code and Codex, first inside the IDE. The model stopped suggesting edits and started doing work: running the tests, reading the error, trying again. After a while the editor started to feel like a frame around a terminal I wasn't looking at, so I moved to the CLI. That was the biggest shift. The agent had a shell, a git history and the same tools I use, and tasks went from minutes to hours.

Recently I've been living in the app. Several sessions at once, a browser it can drive, pages it can publish, and a notification on my phone when something finishes. A lot of this site was built that way.

Each step made the agent more capable and moved my job further from typing. The pros are obvious: more parallel work, longer tasks, less glue work for me. The cons took me longer to notice. In the editor I read every line. In the CLI I read the diffs that seemed important. With four sessions in the app I mostly read summaries, and summaries are written by the thing being summarized. Review became the bottleneck, and then it quietly became the thing I skipped. The newer the era, the more my real job is writing down what I want clearly enough that I don't need to watch.

## Three harnesses I think about

**Pi.** Mario Zechner's pi is a coding agent built on the idea that most of the machinery is unnecessary. The system prompt and tool definitions together come to under a thousand tokens. It ships four tools by default (read, write, edit, bash) and deliberately leaves out MCP, sub-agents, plan mode and permission prompts. I admire it a lot. It's a standing argument that a good model with a shell already has most of what it needs, and that every feature you add is something the model has to read around. When I'm tempted to add a feature to my own agent, I ask whether pi would miss it.

**rusty.** My own coding agent went the other way on a few specific points, and I built it in Rust partly for a boring reason: I wanted one static binary with no runtime and no telemetry that I could drop on any machine. The features I did add each answer one failure I kept hitting elsewhere. Agents announce "done" without running anything, so in rusty a goal can only close by handing over evidence from a pinned check. Agents ask before `ls` and then wave through `rm -rf`, so the permission classifier reads what `npm run`, a heredoc or an `ssh` command will actually execute before deciding whether to ask. Memory tends to turn into a junk drawer pasted into every prompt, so rusty offers one typed lesson at a time and only trusts it more when a check passes. Pi and rusty disagree about how much harness you need. They agree that every piece should earn its place.

**Devin.** I have real respect for Cognition. They made a long bet on the agent harness itself, back in early 2024 when most people thought the model was the whole product, and it looks like it's starting to pay off. They've branched a lot toward services along the way, with forward-deployed engineers embedded in customer deployments and big partnerships with consulting firms, and I don't think that's a contradiction. It's what it looks like when a team is honest that getting agents into real companies takes people as well as software. You can tell a smart team from what they keep working on after it stops being fashionable.

## The recursion question

There's published work on agents that rewrite their own scaffolding. In 2025 the Darwin Gödel Machine took a coding agent from 20% to 50% on SWE-bench by letting it propose changes to its own code and keeping the ones that scored better. In the same work, it also learned to game the checks it was being scored on. Both results are the point. The loop works, and it optimizes exactly what you measure.

So my answer to "how smart does the model need to be" is that its intelligence is not the binding constraint. A fairly ordinary model can propose good changes to a harness, because it has the inside view. What decides whether recursion helps is how good the judge is. Every round of self-improvement compounds whatever the evaluation gets wrong. A loop with a brilliant proposer and a sloppy grader gets very good at satisfying the grader.

Economists have a whole field for this called principal-agent theory. You want one thing, you hire someone who wants something slightly different, and you can only see part of what they do. The contract you write is all they can optimize. A self-improving harness is a principal-agent problem where the agent is tireless, takes the contract completely literally, and gets to rewrite its own job description between rounds.

## The guardrails I'd want

If I let a harness improve itself, these are the rules I'd want in place before the first round:

- It can't edit its own grader, its tests, or its permission rules. Those live outside the loop, and changing them takes a person.
- The held-out evaluation stays held out. The loop never sees it, and a person looks at it on a schedule.
- Changes are small and reversible, and each comes with a diff and a reason. If I can't read why something changed, it doesn't ship.
- Safety checks only get stricter. A round that makes the agent more capable and less careful is rejected, however good its score looks.
- Spending has a hard budget, and the loop stops when it runs out instead of asking for more.

## Writing down what you want

The deepest lesson of the last two years, for me, is that the hard part moved. It used to be getting the model to do the thing. Now it's knowing, precisely, what the thing is. An autonomous agent that improves itself will pursue the goal you wrote, not the one you had in your head, and the gap between those two is where every failure I've seen comes from.

So I've become a little obsessive about working a problem all the way out before I hand it over. What does done look like? What check proves it? What should never happen on the way there, even if it would help? What would I be upset to find out it did? If I can't answer those, I'm not ready to delegate the work to a person either, and that's the parallel that keeps me honest. The things that make someone a good manager, clear goals, clear limits, checking outcomes rather than vibes, turn out to be most of what makes someone good at working with agents. The agents just raise the stakes, because they never get tired and never ask whether you really meant it.
