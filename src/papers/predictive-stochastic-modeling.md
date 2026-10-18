---
title: Predictive Stochastic Modeling for Financial Markets
date: 2026-10-17
summary: Can you see an S&P 500 bear market coming? In real time, mostly you can see one that has already started.
status: revised edition
---

My undergraduate thesis asked whether market and macroeconomic indicators can forecast bear markets in the S&P 500. This revised edition rebuilds it with a stricter test: every forecast uses only data published by its forecast date, every model is refit as time moves forward, and everything is scored out of sample. It replaces the award version, which had a timing error that let its regime model see the next month's price.

## The setup

The data come straight from Robert Shiller's monthly workbook, January 1871 to June 2026, and one script reproduces every number. A bear market starts with a **20% fall from a peak** in the real price and ends with a 20% rise from the trough. That gives 25 of them, with a median fall of 34.2% over 20 months. The catch: you can only recognize one once the 20% fall has happened, a median of 11 months after the peak.

Forecasts are made every month from January 1960 to May 2026, 1, 3, 6 and 12 months ahead, and scored with the Brier score. The contenders:

- A two-regime **Markov-switching model** of returns, plus a version whose transition probabilities move with inflation, valuation, volatility and drawdowns (TVTP).
- **Logits and probits** on six state variables, from the dividend yield and CAPE to inflation and realized volatility.
- **Elastic nets and gradient boosting**, tuned only on data inside each training window, and **dynamic model averaging**.
- Two baselines: the **unconditional frequency**, and **persistence**, which only knows whether a confirmed bear market is under way right now.

## What I found

The regimes are real. Returns alternate between a calm bull regime (+0.88% a month, lasting about 16.6 months) and a bear regime that loses 1.75% a month with more than twice the volatility and lasts about 5 months.

Forecasting them is harder. At one month the six-predictor logit cuts the Brier score by 25.4% against the base rate; persistence alone gets 17.6%. A textbook Diebold-Mariano test calls that gap significant (p = 0.019), but forecast errors are strongly autocorrelated during long bear markets, and allowing for that pushes p to 0.172. Skill fades fast, too: at 12 months the best model manages 1.4%.

> The information that best predicts a bear market next month is that one has already begun.

## What the modern methods add

Less than you'd hope. TVTP fits better in sample by a likelihood-ratio test (51.0, p < 0.001), though not by BIC, and forecasts no better (8.0% against 9.1% for the plain model at one month). Gradient boosting on the rich predictor set is among the best at one month (26.8%) and far below the base rate at twelve (−32.1%): with a handful of bear markets per training window, it learns episodes, not rules. Dynamic model averaging gets 23.4% without knowing the winner in advance. A Murphy decomposition shows that persistence already has about as much resolution as the logit; the logit mostly wins on calibration.

The formal tests settle it. Hansen's SPA test, which accounts for trying 24 models, gives p = 0.189 at one month and 0.468 across all horizons, and persistence stays in the model confidence set at every horizon.

## Robustness

I tried to break that and couldn't. The paper re-runs everything with 15% and 25% thresholds, nominal prices and rolling 30-year windows (smallest SPA p-value: 0.242), scores 1960 to 1989 and 1990 to 2026 separately, drops the 2007 to 2009 crisis, adds five more predictors, and block-bootstraps the lot. Most of the skill lives after 1990: persistence's one-month skill is 8.0% before and 28.3% after.

## What it means

These models are better at recognizing a bear market than at warning of one, which fits a market where public information about downturns is largely priced in. The figures below show the regimes, every dated bear market, forecast skill with the formal tests, and calibration.
