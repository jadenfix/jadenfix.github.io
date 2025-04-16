import React, { useState } from 'react';
import './App.css';

function Navbar() {
  const [active, setActive] = useState('about');
  const [showProjects, setShowProjects] = useState(false);
  const [showInterests, setShowInterests] = useState(false);
  const [showConnect, setShowConnect] = useState(false);
  const [showAvailability, setShowAvailability] = useState(false);

  const handleNavClick = (e, sectionId) => {
    e.preventDefault();
    document.getElementById(sectionId)?.scrollIntoView({ behavior: 'smooth' });
    setActive(sectionId);
    // Hide all dropdowns when clicking a non-dropdown link
    setShowProjects(false);
    setShowInterests(false);
    setShowConnect(false);
    setShowAvailability(false);
  };

  const toggleDropdown = (setter) => {
    setter((prev) => !prev);
  };

  return (
    <nav className="navbar">
      <ul>
        <li className={active === 'about' ? 'active' : ''}>
          <a href="#about" onClick={(e) => handleNavClick(e, 'about')}>
            About
          </a>
        </li>
        <li className={active === 'projects' ? 'active' : ''}>
          <a
            href="#projects"
            onClick={(e) => {
              e.preventDefault();
              toggleDropdown(setShowProjects);
            }}
          >
            Projects
          </a>
          {showProjects && (
            <ul className="dropdown">
              <li>
                <a
                  href="https://github.com/jadenfix/masters_thesis"
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  Master's Thesis
                </a>
              </li>
              <li>
                <a
                  href="https://github.com/jadenfix/solanatools"
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  Solana Cryptocurrency Platforms
                </a>
              </li>
              <li>
                <a
                  href="https://github.com/jadenfix/Predictive-Stochastic-Modeling-for-Financial-Markets-"
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  Predictive Stochastic Modeling
                </a>
              </li>
              <li>
                <a
                  href="https://github.com/jadenfix/NLP"
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  NLP Projects
                </a>
              </li>
              <li>
                <a
                  href="https://github.com/jadenfix/Bayesian-Neural-Network-for-CIFAR-10-Image-Classification"
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  Bayesian Neural Network for CIFAR-10
                </a>
              </li>
              <li>
                <a
                  href="https://github.com/jadenfix?tab=repositories"
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  Other Repositories
                </a>
              </li>
            </ul>
          )}
        </li>
        <li className={active === 'interests' ? 'active' : ''}>
          <a
            href="#interests"
            onClick={(e) => {
              e.preventDefault();
              toggleDropdown(setShowInterests);
            }}
          >
            Interests
          </a>
          {showInterests && (
            <ul className="dropdown">
              <li>
                <a
                  href="https://www.strava.com/athletes/14937614"
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  Strava
                </a>
              </li>
            </ul>
          )}
        </li>
        <li className={active === 'connect' ? 'active' : ''}>
          <a
            href="#connect"
            onClick={(e) => {
              e.preventDefault();
              toggleDropdown(setShowConnect);
            }}
          >
            Connect
          </a>
          {showConnect && (
            <ul className="dropdown">
              <li>
                <a href="mailto:jpfix@calpoly.edu">Email</a>
              </li>
              <li>
                <a
                  href="https://linkedin.com/in/jadenfix/"
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  LinkedIn
                </a>
              </li>
              <li>
                <a
                  href="https://github.com/jadenfix"
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  GitHub
                </a>
              </li>
            </ul>
          )}
        </li>
        <li className={active === 'availability' ? 'active' : ''}>
          <a
            href="#availability"
            onClick={(e) => {
              e.preventDefault();
              toggleDropdown(setShowAvailability);
            }}
          >
            Availability
          </a>
          {showAvailability && (
            <ul className="dropdown">
              <li>
                <a
                  href="https://calendly.com/jadenfix"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="availability-button-link"
                >
                  <button className="availability-button">Schedule a Meeting</button>
                </a>
              </li>
            </ul>
          )}
        </li>
      </ul>
    </nav>
  );
}

function App() {
  return (
    <div className="app-container">
      <Navbar />
      <div className="content">
        <header>
          <img
            src="https://avatars.githubusercontent.com/u/163031992?v=4"
            alt="Jaden Fix Avatar"
            className="avatar"
          />
          <h1>Hi, I'm Jaden Fix</h1>
          <h3>Data, AI, and Solutions Specialist</h3>
        </header>

        <section id="about" className="section">
          <h2>About Me</h2>
          <p>
            I’m passionate about exploring the intersection of data science, economics, and blockchain technology.
            I continually expand my expertise in machine learning, stochastic modeling, econometrics, and modern
            software engineering frameworks.
          </p>
        </section>

        <section id="projects" className="section">
          <h2>Projects &amp; Research</h2>
          <p>
            Please use the "Projects" dropdown in the sidebar to view my GitHub repositories.
          </p>
        </section>

        <section id="interests" className="section">
          <h2>Additional Interests</h2>
          <p>
            Please use the "Interests" dropdown in the sidebar to view my Strava profile.
          </p>
        </section>

        <section id="connect" className="section">
          <h2>Let's Connect</h2>
          <p>
            Please use the "Connect" dropdown in the sidebar to send me an email, connect via LinkedIn, or view my GitHub.
          </p>
        </section>
      </div>
    </div>
  );
}

export default App;