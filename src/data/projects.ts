// Projects data - curated and categorized
// Categories: AI & Agents, HPC, Trading & Finance, Research, Extras

export const languageColors: Record<string, string> = {
    "Python": "#3572A5",
    "TypeScript": "#2b7489",
    "JavaScript": "#F7DF1E",
    "C++": "#f34b7d",
    "Jupyter Notebook": "#DA5B0B",
    "Solidity": "#AA6746",
    "Rust": "#dea584",
    "Go": "#00ADD8",
    "Ruby": "#701516",
    "HTML": "#e34c26",
    "CSS": "#563d7c",
    "R": "#198ce7",
    "LaTeX": "#3D6117"
};

export interface Project {
    id: number;
    name: string;
    description: string;
    category: string;
    language: string;
    github: string;
    featured: boolean;
}

export const projects: Project[] = [
    // ==========================================
    // AI & AGENTS
    // ==========================================
    {
        id: 1,
        name: "Roe AI Python SDK",
        github: "https://github.com/Roe-AI/roe-python",
        language: "Python",
        description: "Official Python SDK for Roe AI - typed client for the API with helpers for tracing, retries, and agent orchestration.",
        category: "ai-agents",
        featured: true
    },
    {
        id: 2,
        name: "Vectorless",
        github: "https://github.com/Roe-AI/vectorless",
        language: "TypeScript",
        description: "Roe AI's open-source vector orchestration layer - managing embeddings, tenancy, and routing for AI agents at scale.",
        category: "ai-agents",
        featured: true
    },
    {
        id: 3,
        name: "OrbitAgents",
        github: "https://github.com/jadenfix/OrbitAgents",
        language: "Python",
        description: "AI-native, cloud-native agent platform for AI-powered web search and information agents with microservices and full-stack deployment.",
        category: "ai-agents",
        featured: true
    },
    {
        id: 4,
        name: "1115 Hack",
        github: "https://github.com/jadenfix/1115_hack",
        language: "Python",
        description: "Browser-saving AI agents - constantly evolving sales AI agents for automated web interactions.",
        category: "ai-agents",
        featured: true
    },
    {
        id: 5,
        name: "InvoiceFlowAgent",
        github: "https://github.com/jadenfix/InvoiceFlowAgent",
        language: "Python",
        description: "LLM-driven agent that processes invoice documents, extracts key fields, and validates them step-by-step as a production workflow.",
        category: "ai-agents",
        featured: true
    },
    {
        id: 6,
        name: "Document Parsing Platform",
        github: "https://github.com/jadenfix/document_parsing_product_demo",
        language: "Python",
        description: "Production-ready document processing platform built for manufacturing environments with LLM-powered extraction.",
        category: "ai-agents",
        featured: false
    },
    {
        id: 7,
        name: "EmotiFuse",
        github: "https://github.com/jadenfix/EmotiFuse",
        language: "Python",
        description: "Research-grade audio emotion recognition library combining speech encoders (Wav2Vec), acoustic features, and transformers for tonal voice analysis.",
        category: "ai-agents",
        featured: true
    },
    {
        id: 8,
        name: "Human Voice AI",
        github: "https://github.com/jadenfix/HumanVoiceAI",
        language: "Python",
        description: "End-to-end real-time voice AI agent with emotion-aware speech, TTS/ASR, RL evaluation pipeline, and TypeScript frontend.",
        category: "ai-agents",
        featured: false
    },
    {
        id: 9,
        name: "SmartPayDoc",
        github: "https://github.com/jadenfix/smartpaydoc",
        language: "Python",
        description: "LLM + RAG assistant for Stripe-style payments documentation - answers developer and ops questions over payment flows.",
        category: "ai-agents",
        featured: false
    },
    {
        id: 10,
        name: "Categorization & Semantic Search",
        github: "https://github.com/jadenfix/categorization_embeddings_sementic_search",
        language: "Python",
        description: "Semantic search and embeddings for datasets using OpenAI embeddings API and vector indexes for intelligent categorization.",
        category: "ai-agents",
        featured: false
    },

    // ==========================================
    // HIGH PERFORMANCE COMPUTING
    // ==========================================
    {
        id: 11,
        name: "MiniGPT Engine (C++)",
        github: "https://github.com/jadenfix/MiniGPTEngine-CPP",
        language: "C++",
        description: "High-performance C++ mini-GPT inference engine optimized for Apple Silicon with extensive benchmarking - building my own ChatGPT from scratch.",
        category: "hpc",
        featured: true
    },
    {
        id: 12,
        name: "Financial C++ Engine",
        github: "https://github.com/jadenfix/financial_cpp_copy",
        language: "C++",
        description: "Low-latency C++ trading engine for pricing, simulation, and time-series experiments with HFT-grade performance.",
        category: "hpc",
        featured: true
    },
    {
        id: 13,
        name: "Financial C++ Notebooks",
        github: "https://github.com/jadenfix/financial_cpp",
        language: "Jupyter Notebook",
        description: "Notebooks and experiments around financial modeling in C++, bridged from Python for hybrid development.",
        category: "hpc",
        featured: false
    },

    // ==========================================
    // TRADING & FINANCE
    // ==========================================
    {
        id: 14,
        name: "DRL4MM",
        github: "https://github.com/jadenfix/DRL4MM",
        language: "Python",
        description: "Deep Reinforcement Learning for Market Making - simulator with agent, environment, notebooks, and training utilities for HFT strategies.",
        category: "trading",
        featured: true
    },
    {
        id: 15,
        name: "Python Crypto Trading Engine",
        github: "https://github.com/jadenfix/python_crypto_trading_engine",
        language: "Python",
        description: "Full-featured Python engine for loading historical crypto data and simulating algorithmic trading strategies.",
        category: "trading",
        featured: true
    },
    {
        id: 16,
        name: "Trading Research",
        github: "https://github.com/jadenfix/trading_research",
        language: "Python",
        description: "Research code and configs for systematic trading experiments and backtests across multiple asset classes.",
        category: "trading",
        featured: false
    },
    {
        id: 17,
        name: "Deets",
        github: "https://github.com/jadenfix/deets",
        language: "Rust",
        description: "Cryptocurrency trading platform built from scratch in Rust - CLI and utilities for structured crypto data and trading.",
        category: "trading",
        featured: true
    },
    {
        id: 18,
        name: "XGBitcoin",
        github: "https://github.com/jadenfix/xgbitcoin",
        language: "Python",
        description: "XGBoost-style models and feature engineering for Bitcoin price prediction and trading signal research.",
        category: "trading",
        featured: false
    },
    {
        id: 19,
        name: "ETH Tools",
        github: "https://github.com/jadenfix/eth",
        language: "TypeScript",
        description: "Ethereum gateway project - TypeScript utilities for interacting with Ethereum, on-chain data pulls, and DeFi tooling.",
        category: "trading",
        featured: false
    },
    {
        id: 20,
        name: "MFT Crypto Research",
        github: "https://github.com/jadenfix/mft_crypto_research",
        language: "Jupyter Notebook",
        description: "Mid-frequency trading research notebooks - crypto markets analysis and advanced trading strategies.",
        category: "trading",
        featured: false
    },
    {
        id: 21,
        name: "Trading Website",
        github: "https://github.com/jadenfix/trading_website",
        language: "Jupyter Notebook",
        description: "Trading analytics dashboard and website concept with interactive visualizations.",
        category: "trading",
        featured: false
    },
    {
        id: 22,
        name: "Hackathon - Energy Trading",
        github: "https://github.com/jadenfix/hackathon",
        language: "Python",
        description: "Sophisticated energy trading and optimization platform integrating real-time market data, quantitative forecasting, and intelligent resource allocation.",
        category: "trading",
        featured: true
    },
    {
        id: 23,
        name: "Jane Street Trading Comp",
        github: "https://github.com/jadenfix/JaneStreetTradingComp",
        language: "Python",
        description: "Code and notebooks for Jane Street's trading competition simulations and strategy testing.",
        category: "trading",
        featured: false
    },

    // ==========================================
    // RESEARCH
    // ==========================================
    {
        id: 24,
        name: "Reinforcement Learning",
        github: "https://github.com/jadenfix/rl",
        language: "Python",
        description: "RL-as-a-Service - reinforcement learning note taker and playground for value-based and policy-gradient experiments.",
        category: "research",
        featured: true
    },
    {
        id: 25,
        name: "Stochastic Site",
        github: "https://github.com/jadenfix/stochastic-site",
        language: "Python",
        description: "Site focused on stochastic modeling - static site generator for quantitative content and research publications.",
        category: "research",
        featured: false
    },
    {
        id: 26,
        name: "Causal Machine Learning",
        github: "https://github.com/jadenfix/causal_machinelearning",
        language: "Python",
        description: "Causal inference notebooks - ATE estimation, uplift modeling, and treatment effect models using ML methods.",
        category: "research",
        featured: false
    },
    {
        id: 27,
        name: "Satellite Deep Learning",
        github: "https://github.com/jadenfix/satellite_deeplearning",
        language: "Python",
        description: "Deep learning for satellite imagery - classification and segmentation models for remote sensing data.",
        category: "research",
        featured: false
    },
    {
        id: 28,
        name: "Bayesian Neural Network CIFAR-10",
        github: "https://github.com/jadenfix/Bayesian-Neural-Network-for-CIFAR-10-Image-Classification",
        language: "Python",
        description: "Bayesian and uncertainty-aware neural networks using TensorFlow for CIFAR-10 with predictive uncertainty quantification.",
        category: "research",
        featured: false
    },
    {
        id: 29,
        name: "Supervised Fine Tuning",
        github: "https://github.com/jadenfix/supervised_fine_tuning",
        language: "Python",
        description: "Experiments with supervised fine-tuning of LLMs on task-specific datasets for specialized model adaptation.",
        category: "research",
        featured: true
    },
    {
        id: 30,
        name: "Master's Thesis Cold Runs",
        github: "https://github.com/jadenfix/masters_thesis_cold_runs",
        language: "Jupyter Notebook",
        description: "Early experiments for thesis on forecasting bear markets and financial time-series with stochastic models.",
        category: "research",
        featured: false
    },
    {
        id: 31,
        name: "Predictive Stochastic Modeling",
        github: "https://github.com/jadenfix/Predictive-Stochastic-Modeling-for-Financial-Markets-",
        language: "R",
        description: "Predictive stochastic modeling for financial markets - bear market forecasting research.",
        category: "research",
        featured: false
    },
    {
        id: 32,
        name: "NLP",
        github: "https://github.com/jadenfix/NLP",
        language: "Python",
        description: "Natural language processing notebooks - tokenization, embeddings, sequence models, and transformer experiments.",
        category: "research",
        featured: false
    },
    {
        id: 33,
        name: "Agentic AI with Hugging Face",
        github: "https://github.com/jadenfix/agentic_ai_HF",
        language: "Python",
        description: "Notebooks investigating agentic patterns and orchestration on top of Hugging Face models.",
        category: "research",
        featured: false
    },

    // ==========================================
    // EXTRAS (Websites, Tools, Coursework)
    // ==========================================
    {
        id: 34,
        name: "DreamForge",
        github: "https://github.com/jadenfix/dreamForge",
        language: "TypeScript",
        description: "Website for a VLM company - full-stack platform combining visual language models with LLM reasoning and user feedback.",
        category: "extras",
        featured: false
    },
    {
        id: 35,
        name: "Roe AI Presentation",
        github: "https://github.com/jadenfix/roe-ai-",
        language: "JavaScript",
        description: "React + Vite presentation with Framer Motion - production-quality scroll-based sales deck for Roe AI's merchant-risk product.",
        category: "extras",
        featured: false
    },
    {
        id: 36,
        name: "Ruby Marketplace",
        github: "https://github.com/jadenfix/ruby",
        language: "Ruby",
        description: "Ruby marketplace for trading gems - web application for Ruby community trading.",
        category: "extras",
        featured: false
    },
    {
        id: 37,
        name: "GemHub",
        github: "https://github.com/jadenfix/gemhub",
        language: "JavaScript",
        description: "Hub for surfacing interesting gems and projects as a small web app marketplace.",
        category: "extras",
        featured: false
    },
    {
        id: 38,
        name: "Kiln",
        github: "https://github.com/jadenfix/KILN",
        language: "TypeScript",
        description: "Website for Kiln, the cryptocurrency staking company - experimental TypeScript project.",
        category: "extras",
        featured: false
    },
    {
        id: 39,
        name: "Solana Tools",
        github: "https://github.com/jadenfix/solanatools",
        language: "Python",
        description: "Python utilities for querying Solana, analyzing on-chain data, and building trading/analytics tools.",
        category: "extras",
        featured: false
    },
    {
        id: 40,
        name: "Personal Website",
        github: "https://github.com/jadenfix/jadenfix.github.io",
        language: "JavaScript",
        description: "Source for personal GitHub Pages site.",
        category: "extras",
        featured: false
    }
];

export const categories = [
    { id: 'all', name: 'All Projects' },
    { id: 'ai-agents', name: 'AI & Agents' },
    { id: 'hpc', name: 'High Performance Computing' },
    { id: 'trading', name: 'Trading & Finance' },
    { id: 'research', name: 'Research' },
    { id: 'extras', name: 'Extras' },
];

export const stats = {
    projects: projects.length,
    languages: new Set(projects.map(p => p.language)).size,
    categories: categories.length - 1,
    experience: new Date().getFullYear() - 2020,
};
