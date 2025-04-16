import React from "react";
import "../ModernPages.css";

function SolanaToolsPage() {
  return (
    <div className="page-container">
      <div className="section">
        <h2 className="section-title">Solana Trading Tools Suite</h2>
        
        <section className="section-content">
          <h3 className="section-subtitle">Overview</h3>
          <p>
            This suite leverages the Solana blockchain for algorithmic trading and portfolio management. The main focus is the
            Solana Trading Bot—an end-to-end system that automates data ingestion, strategy execution, and risk management.
          </p>
        </section>
        
        <section className="section-content">
          <h3 className="section-subtitle">Projects</h3>
          <ul>
            <li>
              <a 
                href="https://github.com/jadenfix/solanatools/tree/main/solana-bot" 
                target="_blank" 
                rel="noopener noreferrer">
                ⚡ Solana Trading Bot
              </a>{" "}
              – Automated trading with real–time data and robust risk management.
            </li>
            <li>
              <a 
                href="https://github.com/jadenfix/solanatools/blob/main/backteststrats.ipynb" 
                target="_blank" 
                rel="noopener noreferrer">
                🧪 Strategy Backtesting Framework
              </a>{" "}
              – Quantitative analysis using RSI momentum and more.
            </li>
            <li>
              <strong>Portfolio Tracker:</strong> A multi–wallet monitoring tool featuring:
              <ul>
                <li>Real–time balance tracking via Solana RPC</li>
                <li>ML–driven risk prediction</li>
                <li>Historical performance simulation</li>
                <li>Dockerized deployment</li>
              </ul>
            </li>
            <li>
              <strong>Trading Platform:</strong> Institutional–grade features including OMS, data aggregation, model tracking, and analytics.
            </li>
          </ul>
        </section>
        
        <section className="section-content">
          <h3 className="section-subtitle">Project Structure</h3>
          <pre>{`
solanatools/
├── solana-bot/            # Main Trading Bot project
├── backteststrats.ipynb   # Strategy Backtesting Notebook
├── solana_portfolio/      # Portfolio Tracker
└── solana_trading_platform/  # Institutional-grade trading infrastructure
          `}</pre>
        </section>
        
        <section className="section-content">
          <h3 className="section-subtitle">Installation & Setup</h3>
          <ol>
            <li>
              Clone the repository: <code>git clone https://github.com/jadenfix/solanatools.git</code>
            </li>
            <li>
              Install dependencies: <code>pip install -r requirements.txt</code>
            </li>
            <li>
              Copy <code>.env.example</code> to <code>.env</code> to configure your environment.
            </li>
          </ol>
        </section>
        
        <p className="section-content">
          For more details, please visit the repository:{" "}
          <a 
            href="https://github.com/jadenfix/solanatools" 
            target="_blank" 
            rel="noopener noreferrer">
            Solana Trading Tools on GitHub
          </a>
        </p>
      </div>
    </div>
  );
}

export default SolanaToolsPage;