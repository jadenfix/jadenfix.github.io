---
title: The Rise of the Forward-Deployed Engineer
date: 2026-10-18
summary: What being close to customers taught me at Roe AI, where the FDE model comes from, and how to balance a useful pilot with a system people can depend on.
read: 5 min
---

At Roe AI, I was extremely client-facing. Discovery, scope, proof of concept and success criteria were part of the engineering work. I had to understand what the customer was trying to accomplish well enough to decide what we should build.

That changed what I paid attention to. A request for automation raises questions about the existing process, its exceptions, the people responsible and what would make a result trustworthy. Those answers affect the architecture. They also determine whether the customer will use what you ship.

That is the version of forward-deployed engineering I care about: an engineer who can understand the problem, make technical decisions and stay accountable for the outcome.

## The work has a history

Customer-specific engineering has older roots in software consulting and systems integration. [CGI's history](https://www.cgi.com/en/about-us/cgi-history), for example, traces its consulting business to 1976 and its expansion into systems integration to its first decade.

Technical sales is another related tradition. Sales engineers help customers evaluate a product, answer technical questions, demonstrate capabilities and work through requirements alongside sales representatives. The [BLS description](https://www.bls.gov/ooh/sales/sales-engineers.htm) also includes troubleshooting and adapting products to customer needs. This can require considerable technical depth.

Palantir is an early reference point for the recognizable FDE model. Its [2019 explanation of the role](https://blog.palantir.com/dev-versus-delta-demystifying-engineering-roles-at-palantir-ad44c2a6e87) describes engineers deploying and extending software around customer problems, sometimes contributing changes back to the core product. The model was established well before the current agent wave.

I think these traditions help explain the confusion around the title. A sales or solutions engineer might build a script or prototype to prove technical fit. An FDE might own the implementation through production. There is overlap, and the boundary varies by company. Renaming a position changes little if its responsibilities stay the same.

## Why agents made it more visible

During the agent wave, I started noticing FDE roles everywhere. Among the YC startups I followed, agents seemed to dominate. More recently, my attention has shifted toward data, evaluation harnesses and the infrastructure around those agents.

The deployment problem makes sense to me. A customer needs its own policies, integrations, permissions and definition of success. A model's general capabilities leave plenty of engineering between a demo and useful operation. [Sierra's account of agent engineering](https://sierra.ai/blog/meet-the-ai-agent-engineer) describes engineers working with customers to design, build and ship those systems.

I also see customer work folded into broader engineering titles. Sierra calls the work agent engineering; a [Prime Intellect member-of-technical-staff listing](https://jobs.ashbyhq.com/PrimeIntellect/26c41d54-f823-4aac-8fdf-4e78fc760184) includes taking problems from discovery through production with customers. In a small team, that can simply be part of being an engineer. The title alone tells you little about the split.

For data and harness companies, I would look at the deployment burden. A standardized, self-serve product may need less custom work. Private environments, difficult integrations and demanding performance targets can require more. [Baseten's inference business has an FDE team](https://www.baseten.co/blog/forward-deployed-engineering/). Infrastructure can make the role deeply technical.

## Understand enough to make the decision

An FDE should have an unusually complete view of the system: the workflow, data, application, model behavior and operating environment. You need to explain consequences to a customer who is deciding whether to depend on it.

You can draw on specialists with deeper knowledge of individual components. The responsibility is to connect their answers, identify uncertainty and make a defensible recommendation. Communication becomes valuable because you understand what you are communicating.

I also want that work to improve the shared product. When an integration problem recurs across deployments, an FDE should help turn the lesson into a reusable capability. That takes the freedom to propose changes, work with the core team and sometimes ship them.

That is also why I would ask about production ownership when interviewing. Who writes and reviews the code? Who makes architecture decisions? Who handles failures after the pilot? Those answers reveal much more than a fashionable title.

## Zero to one, then one to a hundred

A tension I associate with FDE work is getting one valuable workflow working while an architect considers what happens when it expands. The first person may want a narrow pilot. The second may be thinking about throughput, recovery and the next hundred users.

I often think of this as zero to one versus one to a hundred. It describes a difference in immediate priorities. Strong FDEs think about scale, and solutions architects can be excellent at restraint. [AWS's startup solutions architect description](https://www.amazon.jobs/en/jobs/10559416/startup-solutions-architect-early-stage-startups) explicitly emphasizes prototypes, runway and appropriately sized designs.

My preference is to start with the smallest complete workflow that can establish the business outcome. A bounded pilot may not need Kubernetes, dynamic worker scaling or infrastructure for extremely long agent runs. It still needs the permissions, data protection and recovery behavior appropriate to the work it actually performs.

Then agree on the conditions for expanding it. What volume requires more workers? What failure requires a different recovery design? Who owns that transition? Keeping scope small is useful when the constraints and next decisions are explicit.

## Different strengths, real engineering

A business major who enjoys understanding processes and talking with people may find this work appealing. A systems thinker might prefer infrastructure deployments inside a customer's VPC, where networking, access controls, isolation and observability become central. Both paths require demonstrated technical ability.

Sales engineering, solutions architecture and deployment strategy offer other combinations of customer work and technical judgment. I put the distinctions in [Understanding the Roles](#/blog/understanding-the-roles). They are worth investigating alongside the paths in [Getting into AI from another major](#/blog/getting-into-ai-from-another-major).

For me, the attraction is being close enough to the customer to understand the problem and close enough to the software to do something about it.
