import React from "react";
import "../ModernPages.css";

function PredictiveStochasticPage() {
  return (
    <div className="page-container">
      <div className="section">
        <h2 className="section-title">Predictive Stochastic Modeling for Financial Markets</h2>
        
        <section className="section-content">
          <h3 className="section-subtitle">Introduction</h3>
          <p>
            This repository, honored with the <strong>Adam Smith Award</strong>, demonstrates how financial and macroeconomic indicators,
            when integrated with advanced Markov-switching and regression techniques, can improve market prediction in bear markets.
          </p>
          <p>
            Using Bayesian inference, time-series econometrics, and machine learning for forecasting, this work deepens our understanding
            of market downturns.
          </p>
          <p>
            <strong>Read the full thesis:</strong>{" "}
            <a 
              href="https://github.com/jadenfix/Predictive-Stochastic-Modeling-for-Financial-Markets-/blob/main/Predictive_Stochastic_Modeling_for_Financial_Markets.pdf" 
              target="_blank" 
              rel="noopener noreferrer">
              Full Thesis PDF
            </a>
          </p>
        </section>
        
        <section className="section-content">
          <h3 className="section-subtitle">Project Overview</h3>
          <ul>
            <li>✅ Bayesian Markov-Switching Autoregressive Models for regime estimation.</li>
            <li>✅ OLS &amp; Beta Regression modeling for forecasting.</li>
            <li>✅ Feature engineering based on market and macroeconomic indicators.</li>
            <li>✅ Rigorous statistical evaluation across forecasting horizons.</li>
          </ul>
        </section>
        
        <section className="section-content">
          <h3 className="section-subtitle">How to Explore</h3>
          <p>
            - <strong>Code Implementation:</strong>{" "}
            <a 
              href="https://github.com/jadenfix/Predictive-Stochastic-Modeling-for-Financial-Markets-/blob/main/code.R" 
              target="_blank" 
              rel="noopener noreferrer">
              View Code (R)
            </a>
          </p>
          <p>
            - <strong>Dataset:</strong>{" "}
            <a 
              href="https://github.com/jadenfix/Predictive-Stochastic-Modeling-for-Financial-Markets-/blob/main/one45.csv" 
              target="_blank" 
              rel="noopener noreferrer">
              one45.csv
            </a>
          </p>
        </section>
        
        <p className="section-content">
          For more details, visit:{" "}
          <a 
            href="https://github.com/jadenfix/Predictive-Stochastic-Modeling-for-Financial-Markets-" 
            target="_blank" 
            rel="noopener noreferrer">
            Predictive Stochastic Modeling on GitHub
          </a>
        </p>
      </div>
    </div>
  );
}

export default PredictiveStochasticPage;