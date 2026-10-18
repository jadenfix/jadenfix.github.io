---
title: Predictive Stochastic Modeling for Financial Markets
date: 2026-10-17
summary: Can you see an S&P 500 bear market coming? In real time, mostly you can see one that has already started.
status: revised edition
---

My undergraduate thesis asked a simple question: can market and macroeconomic indicators forecast bear markets in the S&P 500? This revised edition answers it with a stricter test. Every forecast uses only data that was published at the time, every model is refit at every forecast date, and every result is judged out of sample.

## The setup

The data are Robert Shiller's monthly S&P 500 series, 1900 to 2023. I date bear markets with a plain rule on the real (inflation-adjusted) price: a **20% fall from a peak** starts one, a 20% rise from the trough ends it. That gives 21 bear markets since 1900, with a median fall of 35% over about 20 months. The catch is that a bear market is only recognizable once the 20% fall has happened, a median of 9 months after the peak.

On top of that sit three kinds of model:

- A two-regime **Markov-switching model** of monthly returns, which infers whether the market is in a calm or a turbulent state.
- **Logit and probit models** on six state variables: the dividend yield, the CAPE ratio, inflation, the change in the 10-year yield, the past year's return and realized volatility.
- Two baselines that any useful model has to beat: the **unconditional frequency** of bear markets, and **persistence**, which only knows whether a confirmed bear market is under way right now.

Forecasts are made every month from 1960 to 2023 at horizons of 1, 3, 6 and 12 months and scored with the Brier score.

## What I found

The regimes are real. Returns alternate between a calm bull regime (about +0.8% a month, lasting around 18 months on average) and a volatile bear regime (about -1.8% a month with more than twice the volatility, lasting around 5 months).

Forecasting them is another matter. At one month the best models cut the Brier score by about 21% relative to the base rate. Persistence alone gets 19%, and none of the 20 model and horizon pairs beats persistence at the 5% level. Skill fades quickly with the horizon, and at 12 months nothing reliably beats the base rate. The dividend yield holds on longest, with small and imprecise gains out to six months.

> In real time, the information that best predicts a bear market next month is that one has already begun.

## Robustness

I tried to break that conclusion and could not. The paper re-runs the full real-time exercise with 15% and 25% thresholds and with nominal prices, compares five regime specifications including a three-regime model, refits on rolling 30-year windows instead of the full history, scores 1960 to 1989 and 1990 to 2023 separately and without the 2008 crisis, adds five more predictors from the same data, and averages all eleven single-predictor forecasts into a combination. Block-bootstrap intervals show how wide the uncertainty is: the one-month skill of persistence runs from about 7% to 31%.

Two details stand out. Most of the forecastability sits after 1990, when bear markets were confirmed faster. And the one predictor that beats persistence, the drawdown from the 12-month high, wins only at one month and only because it notices the same decline a little sooner.

## What it means

These models are better at recognizing a bear market than at warning of one. That is consistent with a market in which public information about downturns is largely priced in. The figures below show the regimes, every dated bear market, forecast skill by horizon with the robustness checks, and how well calibrated the forecasts are. The full paper and code are linked above.
