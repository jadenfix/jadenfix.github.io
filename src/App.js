import React from "react";
import { BrowserRouter, Routes, Route, Link } from "react-router-dom";
import { motion } from "framer-motion";
import { FaGithub, FaLinkedin, FaEnvelope, FaCalendarAlt } from "react-icons/fa";

import HomePage from "./pages/HomePage";
import MastersThesisPage from "./pages/MastersThesisPage";
import PredictiveStochasticPage from "./pages/PredictiveStochasticPage";
import SolanaToolsPage from "./pages/SolanaToolsPage";
import NLPPage from "./pages/NLPPage";
import BayesianCNNPage from "./pages/BayesianCNNPage";
import "./App.css";

function Header() {
  return (
    <header className="header">
      <motion.div 
        className="logo"
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.8, ease: "easeOut" }}
      >
        <img
          src="https://avatars.githubusercontent.com/u/163031992?v=4"
          alt="Jaden Fix Avatar"
          className="avatar"
        />
        <h1>Jaden Fix</h1>
        <h2>Data, AI, and Solutions Specialist</h2>
      </motion.div>
      <div className="profile-links">
        <a href="https://github.com/jadenfix" target="_blank" rel="noopener noreferrer" title="GitHub">
          <FaGithub className="profile-icon" />
        </a>
        <a href="https://linkedin.com/in/jadenfix/" target="_blank" rel="noopener noreferrer" title="LinkedIn">
          <FaLinkedin className="profile-icon" />
        </a>
        <a href="mailto:jpfix@calpoly.edu" title="Email">
          <FaEnvelope className="profile-icon" />
        </a>
        <a href="https://calendly.com/jadenfix" target="_blank" rel="noopener noreferrer" title="Schedule a Meeting">
          <FaCalendarAlt className="profile-icon" />
        </a>
      </div>
      <nav className="navbar">
        <ul className="menu">
          <li><Link to="/">Home</Link></li>
          <li><Link to="/masters-thesis">Masters Thesis</Link></li>
          <li><Link to="/predictive-stochastic">Predictive Stochastic</Link></li>
          <li><Link to="/solana-tools">Solana Tools</Link></li>
          <li><Link to="/nlp">NLP</Link></li>
          <li><Link to="/bayesian-cnn">Bayesian CNN</Link></li>
        </ul>
      </nav>
    </header>
  );
}

function App() {
  return (
    <BrowserRouter>
      <div className="app-container">
        <Header />
        <main className="content">
          <Routes>
            <Route path="/" element={<HomePage />} />
            <Route path="/masters-thesis" element={<MastersThesisPage />} />
            <Route path="/predictive-stochastic" element={<PredictiveStochasticPage />} />
            <Route path="/solana-tools" element={<SolanaToolsPage />} />
            <Route path="/nlp" element={<NLPPage />} />
            <Route path="/bayesian-cnn" element={<BayesianCNNPage />} />
          </Routes>
        </main>
        <footer className="footer">
          <p>&copy; {new Date().getFullYear()} Jaden Fix. All rights reserved.</p>
        </footer>
      </div>
    </BrowserRouter>
  );
}

export default App;