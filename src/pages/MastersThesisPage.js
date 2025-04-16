import React from "react";
import "../ModernPages.css"; // Adjust path based on your folder structure

function MastersThesisPage() {
  return (
    <div className="page-container">
      <div className="section">
        <h2 className="section-title">
          Integrating Deep Learning, Stochastic Modeling, &amp; Physics-Based Methods
        </h2>
        <p className="section-content">
          <strong>An Interdisciplinary Master's Thesis Project (IN PROGRESS)</strong> by Jaden Fix.
        </p>
        <p className="section-content">
          Cryptocurrency markets are known for their extreme volatility and complex dynamics. This project proposes an integrated
          framework that utilizes:
        </p>
        <ul className="section-content">
          <li>
            <strong>Deep Learning:</strong> LSTM and Transformer architectures for time-series forecasting.
          </li>
          <li>
            <strong>Stochastic Modeling:</strong> Advanced ARIMA and GARCH techniques tailored for heavy-tailed market data.
          </li>
          <li>
            <strong>Physics-Based Methods:</strong> Fractal analysis, the Hurst exponent, and entropy measures to model market complexity.
          </li>
          <li>
            <strong>Sentiment Analysis:</strong> Data from social media (e.g., X/Twitter, Google Trends) to integrate public sentiment.
          </li>
        </ul>
        <h3 className="section-subtitle">Repository Structure</h3>
        <pre>{`
masters_thesis/
├── crypto-agent/
│   ├── init.py
│   ├── data_scraper.py
│   ├── aggregator.py
│   └── README.md
├── models/
│   ├── deep_learning.py
│   ├── stochastic.py
│   └── physics_based.py
├── backtesting/
│   ├── strategy_backtest.ipynb
│   └── performance_evaluation.py
└── docs/
    ├── methodology.md
    └── additional_analysis.md
        `}</pre>
        <h3 className="section-subtitle">Setup & Usage</h3>
        <p className="section-content">
          Requires Python 3.12 and libraries such as Twikit, Pandas, Transformers, and nest_asyncio. Install dependencies:
        </p>
        <pre>{`pip install twikit pandas transformers nest_asyncio`}</pre>
        <p className="section-content">
          For full documentation, please visit the{" "}
          <a 
            href="https://github.com/jadenfix/masters_thesis" 
            target="_blank" 
            rel="noopener noreferrer">
            Masters Thesis on GitHub
          </a>.
        </p>
      </div>
    </div>
  );
}

export default MastersThesisPage;