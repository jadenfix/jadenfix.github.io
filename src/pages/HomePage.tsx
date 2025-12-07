import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { FaGithub, FaLinkedin } from 'react-icons/fa';

function HomePage() {
    const [typedText, setTypedText] = useState('');
    const fullText = 'Building the future of autonomous agents in the Bay Area.';

    useEffect(() => {
        let index = 0;
        const timer = setInterval(() => {
            if (index <= fullText.length) {
                setTypedText(fullText.slice(0, index));
                index++;
            } else {
                clearInterval(timer);
            }
        }, 40);
        return () => clearInterval(timer);
    }, []);

    return (
        <div className="min-h-screen bg-bg-primary text-text-primary">
            {/* EPIC Hero Section with Starfield & Golden Gate Bridge */}
            <section className="relative min-h-screen flex items-center overflow-x-clip">

                {/* Golden Gate Bridge silhouette at bottom */}
                <div className="absolute bottom-0 left-0 right-0 h-1/3 z-10 pointer-events-none">
                    <svg
                        viewBox="0 0 1200 300"
                        className="w-full h-full"
                        preserveAspectRatio="xMidYMax meet"
                    >
                        {/* Bridge structure */}
                        <defs>
                            <linearGradient id="bridgeGradient" x1="0%" y1="0%" x2="0%" y2="100%">
                                <stop offset="0%" stopColor="#C0362C" stopOpacity="0.3" />
                                <stop offset="100%" stopColor="#8B2920" stopOpacity="0.8" />
                            </linearGradient>
                        </defs>

                        {/* Left tower */}
                        <rect x="250" y="100" width="30" height="200" fill="url(#bridgeGradient)" />
                        <rect x="235" y="80" width="60" height="20" fill="url(#bridgeGradient)" />

                        {/* Right tower */}
                        <rect x="920" y="100" width="30" height="200" fill="url(#bridgeGradient)" />
                        <rect x="905" y="80" width="60" height="20" fill="url(#bridgeGradient)" />

                        {/* Cables */}
                        <path
                            d="M 265 80 Q 600 200 935 80"
                            stroke="url(#bridgeGradient)"
                            strokeWidth="3"
                            fill="none"
                            opacity="0.6"
                        />
                        <path
                            d="M 265 80 Q 600 180 935 80"
                            stroke="url(#bridgeGradient)"
                            strokeWidth="2"
                            fill="none"
                            opacity="0.4"
                        />

                        {/* Deck */}
                        <rect x="200" y="180" width="800" height="8" fill="url(#bridgeGradient)" opacity="0.7" />

                        {/* Vertical cables */}
                        {[...Array(20)].map((_, i) => (
                            <line
                                key={i}
                                x1={250 + i * 35}
                                y1={100 + Math.abs(10 - i) * 8}
                                x2={250 + i * 35}
                                y2="180"
                                stroke="url(#bridgeGradient)"
                                strokeWidth="1"
                                opacity="0.3"
                            />
                        ))}
                    </svg>

                    {/* Fog effect */}
                    <div
                        className="absolute bottom-0 left-0 right-0 h-32"
                        style={{
                            background: 'linear-gradient(to top, rgba(13, 17, 23, 0.8), transparent)',
                        }}
                    />
                </div>

                {/* ASYMMETRIC Content - Left Side with Overlays */}
                <div className="relative z-20 w-full px-8 md:px-16 py-24">
                    <div className="max-w-[1400px] mx-auto">
                        <div className="grid md:grid-cols-2 gap-12 items-center">
                            {/* LEFT: Main Content */}
                            <motion.div
                                className="relative"
                                initial={{ opacity: 0, x: -100 }}
                                animate={{ opacity: 1, x: 0 }}
                                transition={{ duration: 1, ease: 'easeOut' }}
                            >
                                {/* Floating YC Badge */}
                                <motion.div
                                    className="absolute -top-12 -left-8 z-10"
                                    animate={{
                                        y: [0, -10, 0],
                                    }}
                                    transition={{ duration: 4, repeat: Infinity }}
                                >
                                    <div
                                        className="px-6 py-3 clip-corner-br flex items-center gap-2"
                                        style={{
                                            background: 'linear-gradient(135deg, #ff6b00, #ff8c00)',
                                            boxShadow: '0 10px 40px rgba(255, 107, 0, 0.6), 0 0 60px rgba(255, 107, 0, 0.3)',
                                        }}
                                    >
                                        <span className="text-2xl font-black text-white">Y</span>
                                        <span className="text-white font-bold">W24</span>
                                    </div>
                                </motion.div>

                                {/* Overlapping card - Role */}
                                <motion.div
                                    className="mb-6 p-6 border-l-4 border-accent-secondary bg-bg-secondary/60 backdrop-blur-md clip-corner-br"
                                    initial={{ scale: 0.9, opacity: 0 }}
                                    animate={{ scale: 1, opacity: 1 }}
                                    transition={{ delay: 0.3, duration: 0.6 }}
                                >
                                    <div className="flex items-center gap-3 mb-2">
                                        <span className="w-2 h-2 bg-green-400 rotate-45 animate-pulse shadow-lg shadow-green-400/50" />
                                        <span className="text-accent-secondary text-sm font-semibold uppercase tracking-wider font-mono">
                                            Live from SF Bay Area
                                        </span>
                                    </div>
                                    <div className="text-2xl font-bold text-golden-gate mb-1 font-mono tracking-tight">
                                        AI Agent Engineer
                                    </div>
                                    <div className="text-text-secondary font-light">
                                        at <span className="text-white font-semibold">Roe AI</span>
                                    </div>
                                </motion.div>

                                {/* Name - HUGE and dramatic */}
                                <motion.h1
                                    className="text-[clamp(3rem,8vw,6rem)] font-black leading-[0.9] mb-6 tracking-tighter"
                                    initial={{ opacity: 0, y: 50 }}
                                    animate={{ opacity: 1, y: 0 }}
                                    transition={{ delay: 0.5, duration: 0.8 }}
                                    style={{
                                        textShadow: '0 0 40px rgba(99, 179, 237, 0.6), 0 0 80px rgba(79, 209, 197, 0.3)',
                                    }}
                                >
                                    <span className="text-white">Jaden</span>
                                    <br />
                                    <span
                                        style={{
                                            background: 'linear-gradient(90deg, #ff6b6b, #4ecdc4, #45b7d1, #96ceb4, #ffeaa7, #ff6b6b)',
                                            backgroundSize: '200% auto',
                                            WebkitBackgroundClip: 'text',
                                            WebkitTextFillColor: 'transparent',
                                            backgroundClip: 'text',
                                            animation: 'gradient-shift 3s linear infinite',
                                            filter: 'drop-shadow(0 0 30px rgba(255, 107, 107, 0.6))',
                                        }}
                                    >
                                        Fix
                                    </span>
                                </motion.h1>

                                {/* Subtitle with typing effect */}
                                <motion.p
                                    className="text-xl md:text-2xl text-text-secondary mb-8 min-h-[2em] font-light border-l-2 border-accent-primary/30 pl-4"
                                    initial={{ opacity: 0 }}
                                    animate={{ opacity: 1 }}
                                    transition={{ delay: 0.8 }}
                                >
                                    {typedText}
                                    <span className="text-accent-primary animate-blink">_</span>
                                </motion.p>

                                {/* CTAs */}
                                <motion.div
                                    className="flex gap-4 flex-wrap"
                                    initial={{ opacity: 0, y: 20 }}
                                    animate={{ opacity: 1, y: 0 }}
                                    transition={{ delay: 1, duration: 0.6 }}
                                >
                                    <motion.a
                                        href="https://github.com/jadenfix"
                                        target="_blank"
                                        rel="noopener noreferrer"
                                        className="px-8 py-4 font-bold text-lg text-white no-underline flex items-center gap-3 clip-corner-br"
                                        style={{
                                            background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
                                            boxShadow: '0 10px 40px rgba(102, 126, 234, 0.4)',
                                        }}
                                        whileHover={{ scale: 1.05, boxShadow: '0 15px 50px rgba(102, 126, 234, 0.6)' }}
                                        whileTap={{ scale: 0.95 }}
                                    >
                                        <FaGithub size={24} /> GitHub
                                    </motion.a>
                                    <motion.a
                                        href="https://linkedin.com/in/jadenfix"
                                        target="_blank"
                                        rel="noopener noreferrer"
                                        className="px-8 py-4 font-bold text-lg text-white no-underline flex items-center gap-3 clip-corner-br"
                                        style={{
                                            background: 'linear-gradient(135deg, #0077b5 0%, #00a0dc 100%)',
                                            boxShadow: '0 10px 40px rgba(0, 119, 181, 0.4)',
                                        }}
                                        whileHover={{ scale: 1.05, boxShadow: '0 15px 50px rgba(0, 119, 181, 0.6)' }}
                                        whileTap={{ scale: 0.95 }}
                                    >
                                        <FaLinkedin size={24} /> LinkedIn
                                    </motion.a>
                                    <motion.a
                                        href="/projects"
                                        className="px-8 py-4 font-bold text-lg text-accent-primary no-underline border border-accent-primary/40 clip-corner-br"
                                        style={{
                                            background: 'rgba(99, 179, 237, 0.1)',
                                            backdropFilter: 'blur(10px)',
                                        }}
                                        whileHover={{
                                            borderColor: 'rgba(99, 179, 237, 1)',
                                            background: 'rgba(99, 179, 237, 0.2)',
                                        }}
                                        whileTap={{ scale: 0.95 }}
                                    >
                                        Explore Projects →
                                    </motion.a>
                                </motion.div>
                            </motion.div>

                            {/* RIGHT: Visual Elements (No Stats) */}
                            <motion.div
                                className="relative hidden md:block h-full min-h-[500px]"
                                initial={{ opacity: 0, x: 100 }}
                                animate={{ opacity: 1, x: 0 }}
                                transition={{ duration: 1, delay: 0.5 }}
                            >
                                {/* Abstract visual elements instead of stats */}
                                <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 w-[400px] h-[400px] bg-gradient-radial from-accent-primary/20 to-transparent blur-3xl animate-pulse-slow" />

                                {/* Geometric decorative elements */}
                                <div className="absolute top-1/4 right-1/4 w-32 h-32 border-2 border-accent-primary/20 rotate-45 animate-float" />
                                <div className="absolute bottom-1/4 left-1/4 w-24 h-24 border-2 border-accent-secondary/20 rotate-12 animate-float-reverse" />
                            </motion.div>
                        </div>
                    </div>
                </div>
                {/* Shooting stars */}
                {[...Array(5)].map((_, i) => (
                    <motion.div
                        key={i}
                        className="absolute w-0.5 h-20 bg-gradient-to-b from-white to-transparent"
                        style={{
                            left: `${Math.random() * 100}%`,
                            top: `${Math.random() * 50}%`,
                            transform: 'rotate(-45deg)',
                        }}
                        initial={{ opacity: 0, x: 0, y: 0 }}
                        animate={{
                            opacity: [0, 1, 0],
                            x: [0, 200],
                            y: [0, 200],
                        }}
                        transition={{
                            duration: 1.5,
                            delay: i * 3,
                            repeat: Infinity,
                            repeatDelay: 10,
                        }}
                    />
                ))}
            </section>
        </div>
    );
}

export default HomePage;
