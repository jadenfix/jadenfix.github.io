---
title: A machine quant needs a proof checker
date: 2026-10-19
summary: Models got good at math once every step could be checked. Markets have no checker, so I built one, then measured what actually drives an LLM trading agent. Mostly the prompt.
read: 7 min
---

Frontier models can now solve and prove hard math. The part I find most interesting is why math went first. A proof can be checked. If a step is wrong, the checker catches it, so the model can try wild ideas, throw most of them away and keep the ones that survive. Searching boldly is cheap when being wrong is cheap to detect.

Markets have nothing like that. The noise is enormous, regimes shift under you, and a backtest will happily confirm almost any idea if you try enough of them. A model searching boldly over trading ideas will mostly find the luckiest backtest.

So before asking whether a machine can be a quant, I wanted the checker. And I wanted to know, when an LLM agent trades, how much of what it does comes from the model and how much from everything wrapped around it: the harness, the tools and the prompt.

## The setup

The agent is a portfolio manager for Bitcoin. Each week it picks a number from 0 to 1, a fraction of a volatility envelope it can't exceed: `w_cap = min(1, 40% / forecast vol)`. It has deterministic tools for analog search, pattern scans, a vol outlook and a stress test. Its weekly briefs carry no dates, no prices and no asset name. Costs are 15 bps per side. Every model reply is cached, and a replay-only mode reruns everything bit for bit and fails on any cache miss, so a result can't quietly change under me.

It doesn't run alone. 162 agents share one identical environment: deterministic rules, single models, trend filters, 36 RL grid agents, 40 RL bootstrap agents and 43 LLM instances, 23 on gpt-6-astra and 20 on gpt-5.6-luna. Before trusting any of it I checked the environment itself. An oracle gets a Sharpe of 3.84, so there is something to find. A null of 1,000 random agents has a median Sharpe of −0.11 and a 95th percentile of 0.48 over 2025 to 2026, so that's what luck looks like here. Every agent gets a block-permutation p-value.

Then the factorial. Four toolsets: none, core, full and extended. Four prompts: the base one that says protect capital first, a neutral one, a playbook of ten priors from the literature written in plain English (what people call alpha injection), and an aggressive one. Three harnesses: a single call; a provisional decision, then tools, then a final call; and multi-turn with memory of its own past decisions and outcomes. Two models, low and medium reasoning effort, and independent replicates of the same configuration.

## What the machine did

The forward period runs from 2025-01-01 to 2026-10-17. Bitcoin returned −7.9% a year over it.

No LLM configuration shows timing skill. Zero of 43 have a permutation p below 0.05, and the smallest is 0.30. The best forward Sharpe of any LLM instance is 0.01.

What the agents did do is follow the prompt. Average exposure was 22% under the base prompt, 47% under neutral, 50% under the playbook and 71% under aggressive. A Shapley decomposition of the variance across the 43 instances puts numbers on it:

| factor | share of exposure variance | share of Sharpe variance |
|---|---|---|
| prompt | 90% | 67% |
| model | 1% | 11% |
| tools | 4% | 3% |
| harness | 1% | 3% |

Reasoning effort explains about 0%. Replicates of the exact same configuration leave a luck floor of about 11% of the Sharpe variance, about as much as the choice of model.

That's the main finding. The thing people argue about most, which model, mattered far less than one paragraph of instructions. After the measured knowledge cutoffs, from October 2025 on, the prompt explains 92% of exposure variance and 79% of Sharpe variance, and the model explains 3% of Sharpe.

Two things I expected to help didn't. The playbook moved Sharpe by +0.02 against the neutral prompt, smaller than run-to-run noise, so ten priors in natural language bought nothing. And memory of its own track record didn't help either.

Luck is large outside the LLMs too. 40 RL agents that differ only in which bootstrap resample of the training weeks they saw span forward Sharpe from −0.71 to 1.01. If I'd trained one and shown you the 1.01, it would have looked like a result.

## The model remembers

Hiding dates and names doesn't hide the market. Shown anonymised weekly briefs, gpt-5.6-luna named the asset as BTC 81% of the time, and said crypto 100% of the time. It guessed the exact year 24% of the time, against 11% by chance, and got within one year 48% of the time.

I also measured knowledge cutoffs, as the point where each model's recall of month-end Bitcoin prices breaks down: September 2025 for gpt-5.6-luna and July 2025 for gpt-6-astra. So part of any "forward" window can still be memory.

One probe went at this head on. I took the original 2018 to 2026 Astra agent's edge over a static mix with the same average exposure, before and after its cutoff, and compared it with 118 non-LLM agents. The LLM's edge fell 8.4 points a year more than theirs (p = 0.075). That's suggestive, not significant, and there's only one full-history LLM agent, so I hold it loosely.

## The checker

The bigger worry is research itself. A model left alone with a backtester will find whatever the backtester lets it find. So the second half of the project is the checker, built for an autonomous Codex researcher that writes its own signal code.

It works on a point-in-time universe built from every USD coin Coinbase lists, including the ones that faded. Each day the universe is the top 30 by trailing dollar volume. The verifier runs the agent's code in a sandbox, then recomputes every signal on data truncated at random cut dates. If any past value changes when the future is removed, the signal is rejected as look-ahead. That catches cheats a code scan misses, like a z-score that quietly uses the whole sample's mean.

Every experiment is counted, and every result sits next to a noise bar: the Sharpe the best of N zero-skill trials would hit at the current trial count. Every result is also checked against a 1-day delay, doubled costs and known crypto factors. At most 3 ideas can be frozen, each validated once. The final holdout, mid-2024 to 2026, is scored only after the agent declares its pick, and a test proves no holdout number ever reaches it. The control is a random search over the same building blocks with the same budget.

::demo[verifier/CheckerDemo]
how: it plays once when it scrolls in. pause it, step through the beats, or drag N to set the trial count yourself.
reveals: the honest signal's past never moves when the future is deleted, while the cheat's whole history shifts, so it's rejected. a backtest Sharpe that clears the bar at N = 1 is under it by N = 50, and the holdout stays shut until the final pick.

It's running now, and there are no results yet. One observation from the discovery period, and only that: low idiosyncratic volatility ranks coins strongly, but most of that profit sits on the short side in small coins that often can't be shorted. So the checker adds a book that only ever shorts BTC.

## Speed

The critical pieces moved to Rust kernels that match the Python versions to 1e-12. Block-permutation tests got 26× faster, from 18.4 s to 0.70 s for 1,000 permutations. Cross-sectional rank IC got 10× faster and the model confidence set 3.4×. One research trial takes about 0.2 s, against about 8 s for the model call that proposed it, so checking an idea now costs a small fraction of having it.

## Live

A pre-registered weekly paper test started with the Sunday 2026-10-18 close: six frozen Luna configurations plus baselines. The hypotheses were fixed in advance and hashed. H1: the neutral prompt holds more risk than base under every harness. H2: harnesses differ by less than 5 points of exposure. H3: no timing edge, tested as equivalence within ±5% a year. I'll look at 26 and 52 weeks.

So far the honest summary is that the machine hasn't shown it can time Bitcoin. What it has shown is that an LLM agent's behaviour is mostly its prompt, that it knows more about the past than its inputs let on, and that one good backtest says very little. Math came with a checker. Markets need someone to build one.

The code is in [agentdesk](https://github.com/jadenfix/trading/tree/claude/agentic-btc-paper/agentdesk), with the [design notes](https://github.com/jadenfix/trading/blob/claude/agentic-btc-paper/agentdesk/docs/AGENTIC_QUANT.md) and a [novelty check](https://github.com/jadenfix/trading/blob/claude/agentic-btc-paper/agentdesk/docs/NOVELTY.md).

Data: Coinbase Exchange public market data; Deribit public API; Coin Metrics Community data (CC BY-NC 4.0, non-commercial use); the alternative.me Crypto Fear & Greed Index; FRED (DTB3). No Binance data is used. Research only, not investment advice.
