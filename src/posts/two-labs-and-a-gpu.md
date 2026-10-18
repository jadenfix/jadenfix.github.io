---
title: Two labs and a GPU
date: 2026-10-18
summary: A microeconomics exercise with no politics in it. Treat frontier AI as a duopoly, or as rented GPUs, simulate both, and see what sets the price of a token.
read: 7 min
---

Intermediate micro spends a few weeks on market structure. One firm is a monopoly, and it sets the price where the extra revenue from one more sale equals the extra cost. Many identical firms are perfect competition, and the price falls to cost. In between are the cases that make the class interesting: two firms, or a handful, each watching the others.

I've wanted to run frontier AI through that machinery for a while. This is a toy, and it takes no position on whether anyone should be bigger or smaller. It just asks what the textbook would predict.

## Which market is this?

There are two honest ways to describe it.

The first is a tight oligopoly with two leaders. In Menlo Ventures' December 2025 survey of enterprise spending on model APIs, Anthropic had 40%, OpenAI 27% and Google 21%, so the top three held 88% (Menlo is an Anthropic investor, which is worth knowing when you read their numbers). Square those shares and add them up and you get a concentration index above 2,700 before counting anyone else, which is well past the line US merger guidelines use for "highly concentrated."

The second description is that a token is just rented compute. A model answering a question is a GPU running for some fraction of a second, and GPU time looks a lot like a commodity. An H100 rented from a big cloud cost around $7.76 an hour in late 2023 and around $6.26 in late 2025. On marketplaces it was closer to $2. The cost of reaching a fixed level of capability has fallen even faster: a16z estimated about 10x a year, and Epoch AI's estimates run from 9x to 900x a year depending on the benchmark.

And yet the price of the best model hasn't collapsed. GPT-4 launched in March 2023 at $30 per million input tokens and $60 per million output. Today the most capable models from both labs list at $10 and $50. Capability that cost $60 then costs pennies now, but the frontier keeps moving, and the frontier still charges.

So which is it, a duopoly or a commodity? The textbook lets you run both at once.

## The model

Two labs sell models of equal quality. There's also an outside option: an open-weight model served by whoever rents GPUs, priced at roughly cost, 10% above it. Customers pick whichever gives them the most quality for the price, with some taste for variety, which is the standard logit demand from industrial organization. Each lab sets its price knowing the other will respond, and I solve for the prices where neither wants to move, the Bertrand-Nash equilibrium. Serving costs $2 per million tokens to start, and quality is in made-up points.

| scenario | lab price | margin | each lab's share | open share |
|---|---|---|---|---|
| open models 3 points behind | $7.10 | $5.10 | 44% | 12% |
| open models 2 points behind | $6.61 | $4.61 | 38% | 24% |
| open models 1 point behind | $6.04 | $4.04 | 29% | 41% |
| open models at parity | $5.54 | $3.54 | 19% | 62% |

## What falls out

**The margin is the lead.** What the labs can charge above cost is set almost entirely by how far ahead of the open option they are. Close the gap from three points to zero and the margin falls by a third while the labs lose most of their share. Nothing about the labs changed. Their competitor in the commodity market got better.

**Cheaper chips mostly go to customers.** Hold the gap at one point and halve the cost of serving every year for three years:

| year | serving cost | lab price | margin |
|---|---|---|---|
| 0 | $2.00 | $6.04 | $4.04 |
| 1 | $1.00 | $5.02 | $4.02 |
| 2 | $0.50 | $4.51 | $4.01 |
| 3 | $0.25 | $4.26 | $4.01 |

Cost falls by 8x and the price falls by about 30%, because the savings pass straight through and the margin stays put at about $4. In this model, cheaper GPUs make tokens cheaper but don't threaten anyone's margin. Only a narrowing quality gap does.

**A one-point lead is worth a lot.** Give one lab a single extra point of quality, with open models three behind. Its price rises to $8.29, its share to 55%, and its profit by about 53%. That's the textbook reason two firms in this position race as hard as they do. The prize for being slightly better is large and it goes to one firm.

**Two rivals already compete hard.** If the two labs could act as one firm and set a joint price, the profit-maximizing price would be $10.71 instead of $7.10. Rivalry between just two sellers cuts the price by a third. This is the Bertrand insight that surprises people in class: two firms competing on price can be far more competitive than the word "duopoly" suggests, as long as customers can switch.

## What the toy leaves out

Quite a lot. Real customers have switching costs, contracts and tooling built around one provider, which soften competition. Quality isn't one number, so the labs can each lead in different places. Training costs are huge and fixed, which this model ignores completely, and fixed costs are exactly what keep the number of frontier labs small in the first place. The GPU market isn't a clean commodity either: rental prices rebounded by around 40% between late 2025 and early 2026 as demand caught up with supply.

I still find the exercise clarifying. Both descriptions are true at once. A frontier model is a differentiated product in a tight oligopoly, and one step behind the frontier it's a commodity sold by the GPU-hour. The price of a token is the cost of a GPU plus a premium for being ahead, and the premium is worth only as much as the lead.

That's also how I think about my own work. The cheap part of anything gets cheaper every year. What people pay for is the part that's still hard, and that part keeps moving.

The simulation is about forty lines of standard-library Python: [duopoly.py](https://github.com/jadenfix/jadenfix.github.io/blob/main/public/data/econ/duopoly.py). Change the numbers and see what moves.
