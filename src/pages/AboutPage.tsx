import { motion } from 'framer-motion';
import { FaGraduationCap } from 'react-icons/fa';

function AboutPage() {
    const coreSkills = ['LLMs', 'Python', 'TypeScript', 'Go', 'Rust'];
    const cloudSkills = ['AWS', 'GCP', 'Docker', 'Kubernetes'];
    const aiSkills = ['Machine Learning', 'Deep Learning', 'AI Agents', 'Autonomous Systems'];
    const researchSkills = ['Algorithmic Trading', 'Quantitative Analysis', 'High-Performance Computing', 'Market Microstructure'];

    return (
        <div className="min-h-screen text-text-primary pt-24 pb-16 px-8">
            <div className="max-w-[1400px] mx-auto">
                {/* Header - matching Projects/TechStack style */}
                <motion.div
                    className="text-center mb-16"
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.6 }}
                >
                    <h1 className="text-[3rem] font-bold m-0 mb-4 text-[#f7fafc] tracking-tight">About Me</h1>
                    <p className="text-lg text-[#cbd5e0] max-w-[700px] mx-auto m-0 font-light">
                        Architecting the next generation of autonomous intelligence at the frontier of what's possible.
                    </p>
                </motion.div>

                {/* Main Role Section - Clean card matching Projects style */}
                <motion.div
                    className="mb-16 p-8 bg-bg-secondary/50 border border-border-color clip-corner-br hover:border-accent-primary/30 transition-colors duration-300 relative overflow-hidden"
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.6, delay: 0.2 }}
                >
                    <div className="absolute inset-0 bg-gradient-to-r from-golden-gate/5 to-accent-primary/5 pointer-events-none" />

                    <div className="flex flex-col md:flex-row items-start gap-8 relative z-10">
                        {/* Roe AI Logo/Badge */}
                        <div className="flex-shrink-0">
                            <motion.div
                                className="w-24 h-24 bg-gradient-to-br from-golden-gate to-[#FF8C00] clip-corner-br flex items-center justify-center"
                                whileHover={{ scale: 1.05 }}
                            >
                                <span className="text-4xl font-black text-white">R</span>
                            </motion.div>
                            <div className="mt-2 text-center">
                                <span className="text-xs text-golden-gate font-bold tracking-wider">ROE AI</span>
                                <div className="text-[10px] text-text-muted">YC W24</div>
                            </div>
                        </div>

                        <div className="flex-1">
                            <div className="flex items-center gap-4 mb-4 flex-wrap">
                                <h2 className="text-3xl font-bold text-[#f7fafc] m-0">AI Agent Engineer</h2>
                                <span className="px-3 py-1 bg-green-500/20 text-green-400 text-xs font-bold clip-corner-br border border-green-500/30">
                                    ACTIVE
                                </span>
                            </div>

                            <p className="text-xl text-text-secondary mb-6 leading-relaxed">
                                Building the future at <span className="text-golden-gate font-semibold">Roe AI</span>, where we're
                                pioneering autonomous data agents that transform how enterprises harness their information.
                            </p>

                            <p className="text-text-muted leading-relaxed mb-6">
                                I operate at the intersection of artificial intelligence and high-performance systems, crafting
                                intelligent agents that don't merely process data, but understand context, anticipate needs, and
                                act with purpose. My work spans the full spectrum of autonomous systems, from foundational LLM
                                architectures to production-grade deployments that scale.
                            </p>

                            <div className="flex flex-wrap gap-3">
                                <motion.a
                                    href="https://www.roe-ai.com"
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="px-6 py-2 bg-golden-gate/10 border border-golden-gate/40 text-golden-gate font-bold no-underline clip-corner-br hover:bg-golden-gate/20 transition-colors"
                                    whileHover={{ scale: 1.02 }}
                                    whileTap={{ scale: 0.98 }}
                                >
                                    Visit Roe AI
                                </motion.a>
                            </div>
                        </div>
                    </div>
                </motion.div>

                {/* Two Column Grid: Education + Side Projects */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-8 mb-16">
                    {/* Education */}
                    <motion.div
                        className="p-8 bg-bg-secondary/50 border border-border-color clip-corner-br hover:border-accent-primary/30 transition-colors duration-300"
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ duration: 0.5, delay: 0.3 }}
                    >
                        <h3 className="text-2xl font-bold mb-6 flex items-center gap-3 text-accent-primary">
                            <FaGraduationCap /> Education
                        </h3>
                        <h4 className="text-xl font-bold text-[#f7fafc] m-0 mb-2">California Polytechnic State University</h4>
                        <p className="text-accent-secondary font-medium m-0 mb-4">Master of Science</p>
                        <div className="flex justify-between items-center text-text-muted text-sm">
                            <span>San Luis Obispo, CA</span>
                            <span className="font-mono bg-bg-tertiary px-2 py-1 clip-corner-br">2024 - 2025</span>
                        </div>
                    </motion.div>

                    {/* Side Projects & Research */}
                    <motion.div
                        className="p-8 bg-bg-secondary/50 border border-border-color clip-corner-br hover:border-accent-primary/30 transition-colors duration-300"
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ duration: 0.5, delay: 0.4 }}
                    >
                        <h3 className="text-2xl font-bold mb-6 flex items-center gap-3 text-accent-primary">
                            <span>🔬</span> Research & Side Projects
                        </h3>
                        <p className="text-text-secondary leading-relaxed mb-4">
                            Beyond my core work, I explore the bleeding edge of autonomous systems, market microstructure,
                            and high-frequency computing through independent research and experimental projects.
                        </p>
                        <div className="flex flex-wrap gap-2">
                            {researchSkills.map((skill) => (
                                <span
                                    key={skill}
                                    className="px-3 py-1.5 bg-bg-tertiary border border-border-color clip-corner-br text-xs font-medium text-text-muted"
                                >
                                    {skill}
                                </span>
                            ))}
                        </div>
                    </motion.div>
                </div>

                {/* Skills Section */}
                <motion.div
                    className="mb-8"
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.6, delay: 0.5 }}
                >
                    <div className="flex items-center justify-center gap-4 mb-12">
                        <div className="h-px flex-1 bg-gradient-to-r from-transparent to-accent-primary/30" />
                        <h2 className="text-2xl font-bold text-accent-primary tracking-wide">SKILLS & TECHNOLOGIES</h2>
                        <div className="h-px flex-1 bg-gradient-to-l from-transparent to-accent-primary/30" />
                    </div>
                </motion.div>

                {/* Skills Grid - matching Tech Stack format */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                    {/* Core Stack */}
                    <motion.div
                        className="bg-bg-secondary/50 border border-border-color p-8 clip-corner-br hover:border-accent-primary/30 transition-colors duration-300"
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ duration: 0.5, delay: 0.6 }}
                    >
                        <h3 className="text-2xl font-bold mb-6 flex items-center gap-3 text-golden-gate">
                            <span>💼</span> Core Stack
                        </h3>
                        <div className="flex flex-wrap gap-3">
                            {coreSkills.map((skill) => (
                                <motion.div
                                    key={skill}
                                    className="px-5 py-3 bg-golden-gate/10 border border-golden-gate/40 clip-corner-br font-mono font-semibold text-golden-gate"
                                    whileHover={{ y: -3, borderColor: 'rgba(242, 101, 34, 0.8)' }}
                                >
                                    {skill}
                                </motion.div>
                            ))}
                        </div>
                    </motion.div>

                    {/* Cloud Infrastructure */}
                    <motion.div
                        className="bg-bg-secondary/50 border border-border-color p-8 clip-corner-br hover:border-accent-primary/30 transition-colors duration-300"
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ duration: 0.5, delay: 0.7 }}
                    >
                        <h3 className="text-2xl font-bold mb-6 flex items-center gap-3 text-accent-secondary">
                            <span>☁️</span> Cloud Infrastructure
                        </h3>
                        <div className="flex flex-wrap gap-3">
                            {cloudSkills.map((skill) => (
                                <motion.div
                                    key={skill}
                                    className="px-5 py-3 bg-accent-secondary/10 border border-accent-secondary/40 clip-corner-br font-mono font-semibold text-accent-secondary"
                                    whileHover={{ y: -3, borderColor: 'rgba(78, 205, 196, 0.8)' }}
                                >
                                    {skill}
                                </motion.div>
                            ))}
                        </div>
                    </motion.div>

                    {/* AI & Machine Learning - Full Width */}
                    <motion.div
                        className="md:col-span-2 bg-bg-secondary/50 border border-border-color p-8 clip-corner-br hover:border-accent-primary/30 transition-colors duration-300 relative overflow-hidden"
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ duration: 0.5, delay: 0.8 }}
                    >
                        <div className="absolute inset-0 bg-gradient-to-r from-purple-500/5 to-accent-primary/5 pointer-events-none" />
                        <h3 className="text-2xl font-bold mb-6 flex items-center gap-3 text-accent-primary relative z-10">
                            <span>🧠</span> AI & Machine Learning
                        </h3>
                        <div className="flex flex-wrap gap-3 relative z-10">
                            {aiSkills.map((skill) => (
                                <motion.div
                                    key={skill}
                                    className="px-5 py-3 bg-accent-primary/10 border border-accent-primary/40 clip-corner-br font-semibold text-accent-primary"
                                    whileHover={{ y: -3, borderColor: 'rgba(99, 179, 237, 0.8)' }}
                                >
                                    {skill}
                                </motion.div>
                            ))}
                        </div>
                    </motion.div>
                </div>
            </div>
        </div>
    );
}

export default AboutPage;
