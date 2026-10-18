---
title: Two labs and a GPU
date: 2026-10-18
summary: A microeconomics exercise with no politics in it. Treat frontier AI as a duopoly and as rented GPUs at the same time, simulate it, and see what actually sets the price of a token.
read: 5 min
---

Intermediate micro spends a few weeks on market structure. One firm is a monopoly and prices where one more sale stops paying. Many identical firms are perfect competition and price at cost. The interesting cases are in between: two firms, or a handful, each watching the others.

I've wanted to run frontier AI through that machinery for a while. This is a toy, and it takes no position on who should be bigger or smaller. It just asks what the textbook predicts.

## Which market is this?

There are two honest descriptions.

One is a tight oligopoly with two leaders. In [Menlo Ventures' December 2025 survey](https://menlovc.com/perspective/2025-the-state-of-generative-ai-in-the-enterprise/) of enterprise spend on model APIs, Anthropic had 40%, OpenAI 27% and Google 21%, so the top three held 88% (Menlo invests in Anthropic, which is worth knowing). Square those shares and add them and you're past 2,700 before counting anyone else, well over the line US merger guidelines call highly concentrated.

The other is that a token is rented compute. A model answering a question is a GPU running for a fraction of a second, and GPU time looks like a commodity. An H100 from a big cloud [cost about $7.76 an hour in late 2023 and $6.26 in late 2025](https://www.silicondata.com/blog/h100-rental-price-over-time), and nearer $2 on marketplaces. The price of a fixed level of capability fell faster still: [a16z](https://a16z.com/llmflation-llm-inference-cost/) estimated about 10x a year, and [Epoch AI](https://epoch.ai/data-insights/llm-inference-price-trends) puts it anywhere from 9x to 900x depending on the benchmark.

Yet the best model never got cheap. GPT-4 launched in March 2023 at $30 per million input tokens and $60 per million output. Today the most capable models from both labs list at $10 and $50. Capability that cost dollars then costs pennies now, but the frontier keeps moving, and the frontier still charges. The textbook lets you hold both descriptions at once.

## The model

Two labs sell equally good models. There's also an outside option: open-weight models served by whoever rents GPUs, priced 10% above cost. Customers pick whatever gives the most quality for the price, with some taste for variety, which is the standard logit demand from industrial organization. Each lab sets its price knowing the other will respond, and I solve for prices where neither wants to move, the Bertrand-Nash equilibrium. Serving starts at $2 per million tokens, and quality is in made-up points.

| scenario | lab price | margin | each lab's share | open share |
|---|---|---|---|---|
| open models 3 points behind | $7.10 | $5.10 | 44% | 12% |
| open models 2 points behind | $6.61 | $4.61 | 38% | 24% |
| open models 1 point behind | $6.04 | $4.04 | 29% | 41% |
| open models at parity | $5.54 | $3.54 | 19% | 62% |

## What falls out

**The margin is the lead.** What the labs can charge above cost is set almost entirely by how far ahead of open models they are. Close the gap from three points to zero and the margin drops by a third while most of the labs' share walks away. Nothing about the labs changed. The commodity got better.

**Cheaper chips go to customers.** Hold the gap at one point and halve serving costs every year:

| year | serving cost | lab price | margin |
|---|---|---|---|
| 0 | $2.00 | $6.04 | $4.04 |
| 1 | $1.00 | $5.02 | $4.02 |
| 2 | $0.50 | $4.51 | $4.01 |
| 3 | $0.25 | $4.26 | $4.01 |

Cost falls 8x and price falls about 30%. The savings pass straight through and the margin sits at about $4. Cheaper GPUs make tokens cheaper without touching anyone's margin. Only a closing gap does that.

**One point of lead is worth a lot.** Give one lab a single extra point, with open models three behind, and its price rises to $8.29, its share to 55%, and its profit by about 53%. That's the textbook reason two firms in this spot race as hard as they do.

**Two rivals already compete hard.** If the labs could act as one firm, the best joint price would be $10.71 instead of $7.10. Rivalry between just two sellers cuts the price by a third. That's the Bertrand surprise from class: two firms competing on price can be far more competitive than "duopoly" sounds, as long as customers can switch.

## What the toy leaves out

Plenty. Switching costs, contracts and tooling soften competition. Quality isn't one number, so each lab can lead somewhere different. Training costs are huge and fixed, which this model ignores, and fixed costs are exactly what keep the number of frontier labs small. GPUs aren't a clean commodity either: rental prices rebounded around 40% between late 2025 and early 2026 as demand caught up.

Still, the picture is clarifying. At the frontier a model is a differentiated product in a tight oligopoly. One step behind, it's a commodity sold by the GPU-hour. The price of a token is the cost of a GPU plus a premium for being ahead, and the premium is worth exactly as much as the lead. I think that's true of most work, too. The cheap part gets cheaper every year, and people pay for the part that's still hard, which keeps moving.

The simulation is about forty lines of standard-library Python: [duopoly.py](https://github.com/jadenfix/jadenfix.github.io/blob/main/public/data/econ/duopoly.py). Change the numbers and see what moves.
