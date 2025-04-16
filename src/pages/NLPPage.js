import React from "react";
import "../ModernPages.css";

function NLPPage() {
  return (
    <div className="page-container">
      <div className="section">
        <h2 className="section-title">N-Gram Language Model for Next-Word Prediction</h2>
        <p className="section-content">
          This project implements a statistical language model using unigram, bigram, and trigram approaches for next-word prediction.
        </p>
        <h3 className="section-subtitle">Key Features</h3>
        <ul className="section-content">
          <li>Word-level unigram, bigram, and trigram probability estimation</li>
          <li>Smoothing techniques: add-k smoothing and linear interpolation</li>
          <li>Automatic handling of sentence boundaries and low-frequency words (&lt;UNK&gt;)</li>
          <li>Evaluation using perplexity metrics</li>
        </ul>
        <h3 className="section-subtitle">Technical Overview</h3>
        <p className="section-content">
          Frequency tables, caching of probabilities, and scalable code design allow for easy experimentation.
        </p>
        <h3 className="section-subtitle">Workflow</h3>
        <ol className="section-content">
          <li>
            <strong>Data Processing:</strong> Load raw text and tokenize with boundary markers.
          </li>
          <li>
            <strong>Model Training:</strong> Train the model using MLE with smoothing enhancements.
          </li>
          <li>
            <strong>Evaluation:</strong> Measure performance via perplexity on a validation/test set.
          </li>
        </ol>
        <p className="section-content">
          For full details, visit the repository:{" "}
          <a href="https://github.com/jadenfix/NLP" target="_blank" rel="noopener noreferrer">
            https://github.com/jadenfix/NLP
          </a>
        </p>
      </div>
    </div>
  );
}

export default NLPPage;