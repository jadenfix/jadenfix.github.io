---
title: The Rise of the Forward-Deployed Engineer
date: 2026-10-18
summary: What being close to customers taught me at Roe AI, where the FDE model comes from, and how to balance a useful pilot with a system people can depend on.
read: 5 min
---

At Roe AI, I was extremely client-facing. Discovery, scope, proof of concept and success criteria were part of the engineering work. I had to understand what the customer was trying to accomplish well enough to decide what we should build.

That changed what I paid attention to. The exceptions in a customer's process could matter as much as the happy path. Understanding who handled them, and what made a result trustworthy, changed the architecture.

That is the version of forward-deployed engineering I care about: an engineer who can understand the problem, make technical decisions and stay accountable for the outcome.

## The work has a history

Customer-specific engineering predates the FDE title. Software consulting and systems integration firms have done it for decades; [CGI's history](https://www.cgi.com/en/about-us/cgi-history) is one example. Technical sales is another related tradition. The [BLS description of sales engineers](https://www.bls.gov/ooh/sales/sales-engineers.htm) includes requirements, demonstrations, troubleshooting and product adaptation. The job can require considerable technical depth.

Palantir is an early reference point for the recognizable FDE model. Its [2019 explanation of the role](https://blog.palantir.com/dev-versus-delta-demystifying-engineering-roles-at-palantir-ad44c2a6e87) describes engineers deploying and extending software around customer problems, sometimes contributing changes back to the core product. The model was established well before the current agent wave.

A sales or solutions engineer may prove technical fit with a script or prototype. An FDE may own the implementation through production. The boundary varies by company. Renaming a position changes little if its responsibilities stay the same.

## Why agents made it more visible

During the agent wave, I started noticing FDE roles everywhere. Among the YC startups I followed, agents seemed to dominate. More recently, my attention has shifted toward data, evaluation harnesses and the infrastructure around those agents.

An agent may choose different tools and actions from one run to the next. "Follow our policy" has to become an actual implementation. What evidence is enough to act? Which exceptions need a person? What happens when two systems disagree?

The customer may not have written those rules down, but somebody still has to turn them into behavior you can test. [Sierra's account of agent engineering](https://sierra.ai/blog/meet-the-ai-agent-engineer) describes engineers working with customers to design, build and ship these systems.

Customer work also appears under broader engineering titles. A [Prime Intellect member-of-technical-staff listing](https://jobs.ashbyhq.com/PrimeIntellect/26c41d54-f823-4aac-8fdf-4e78fc760184) includes taking problems from discovery through production with customers. In a small team, that can simply be part of being an engineer.

For data and harness companies, I would look at how much deployment work the product requires. Self-service can reduce custom work; private environments and demanding performance targets can increase it. [Baseten's inference business has an FDE team](https://www.baseten.co/blog/forward-deployed-engineering/).

## Understand enough to make the decision

An FDE needs to follow a request all the way through the system. Suppose a customer asks for "higher accuracy." Which errors matter, how much can they tolerate, and which cases need review? Those answers can change the data, model, interface and operating process.

You can ask specialists for help. You still need to connect their answers well enough to recommend a design, explain the tradeoffs and say what would change your mind.

I also want that work to improve the shared product. When an integration problem recurs across deployments, an FDE should help turn the lesson into a reusable capability. That takes the freedom to propose changes, work with the core team and sometimes ship them.

When interviewing, I'd ask who writes and reviews the code, makes architecture decisions and handles failures after the pilot.

## Zero to one, then one to a hundred

I often see an FDE focused on getting one valuable workflow working while an architect considers the next hundred users. I think of this as zero to one versus one to a hundred. Strong FDEs think about scale, and solutions architects can be excellent at restraint. [AWS's startup solutions architect description](https://www.amazon.jobs/en/jobs/10559416/startup-solutions-architect-early-stage-startups) explicitly emphasizes prototypes, runway and appropriately sized designs.

My preference is to start with [one complete workflow that can prove the business outcome](#/blog/what-a-pilot-has-to-prove). Imagine a pilot that recommends refunds: it can keep a person in the approval loop. A pilot that issues refunds needs to handle duplicate execution from the beginning. Both can be small. The second has made a different promise.

The need for Kubernetes or dynamic scaling should come from the deployment constraints and expected load. Agree on the conditions for expanding: what volume requires more workers, what failures require a different recovery design, and who owns that transition?

## Different strengths, real engineering

A business major who enjoys understanding processes and talking with people may find this work appealing. A systems thinker might prefer infrastructure deployments inside a customer's VPC, where networking, access controls, isolation and observability become central. Both paths require demonstrated technical ability.

Sales engineering, solutions architecture and deployment strategy offer other combinations of customer work and technical judgment. I put the distinctions in [Understanding the Roles](#/blog/understanding-the-roles). They are worth investigating alongside the paths in [Getting into AI from another major](#/blog/getting-into-ai-from-another-major).

For me, the attraction is being close enough to the customer to understand the problem and close enough to the software to do something about it.
