import { motion } from 'framer-motion';
import { FaGithub, FaLinkedin, FaEnvelope } from 'react-icons/fa';

function ContactPage() {
    return (
        <div className="min-h-screen text-text-primary pt-24 pb-16 px-8">
            <div className="max-w-[1200px] mx-auto">
                {/* Header */}
                <motion.div
                    className="text-center mb-16"
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.6 }}
                >
                    <h1 className="text-[3rem] font-bold m-0 mb-4 text-[#f7fafc] tracking-tight">Contact</h1>
                    <p className="text-lg text-[#cbd5e0] max-w-[600px] mx-auto m-0 font-light">
                        Let's connect.
                    </p>
                </motion.div>

                {/* Contact Cards - Clean Grid */}
                <motion.div
                    className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-16"
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.6, delay: 0.2 }}
                >
                    {/* Email */}
                    <motion.a
                        href="mailto:jadenfix123@gmail.com"
                        className="bg-bg-secondary/50 border border-border-color p-6 clip-corner-br hover:border-[#ff6b6b]/50 transition-all duration-300 no-underline group"
                        whileHover={{ y: -4 }}
                    >
                        <div className="flex items-center gap-4 mb-4">
                            <div className="w-12 h-12 bg-[#ff6b6b]/10 border border-[#ff6b6b]/30 flex items-center justify-center clip-corner-br group-hover:border-[#ff6b6b] transition-colors">
                                <FaEnvelope size={20} color="#ff6b6b" />
                            </div>
                            <div>
                                <h3 className="text-lg font-bold text-text-primary m-0">Email</h3>
                                <p className="text-accent-primary font-mono text-sm m-0">jadenfix123@gmail.com</p>
                            </div>
                        </div>
                    </motion.a>

                    {/* LinkedIn */}
                    <motion.a
                        href="https://linkedin.com/in/jadenfix"
                        target="_blank"
                        rel="noopener noreferrer"
                        className="bg-bg-secondary/50 border border-border-color p-6 clip-corner-br hover:border-[#0077b5]/50 transition-all duration-300 no-underline group"
                        whileHover={{ y: -4 }}
                    >
                        <div className="flex items-center gap-4 mb-4">
                            <div className="w-12 h-12 bg-[#0077b5]/10 border border-[#0077b5]/30 flex items-center justify-center clip-corner-br group-hover:border-[#0077b5] transition-colors">
                                <FaLinkedin size={20} color="#0077b5" />
                            </div>
                            <div>
                                <h3 className="text-lg font-bold text-text-primary m-0">LinkedIn</h3>
                                <p className="text-accent-primary font-mono text-sm m-0">in/jadenfix</p>
                            </div>
                        </div>
                    </motion.a>

                    {/* GitHub */}
                    <motion.a
                        href="https://github.com/jadenfix"
                        target="_blank"
                        rel="noopener noreferrer"
                        className="bg-bg-secondary/50 border border-border-color p-6 clip-corner-br hover:border-[#6e5494]/50 transition-all duration-300 no-underline group"
                        whileHover={{ y: -4 }}
                    >
                        <div className="flex items-center gap-4 mb-4">
                            <div className="w-12 h-12 bg-[#6e5494]/10 border border-[#6e5494]/30 flex items-center justify-center clip-corner-br group-hover:border-[#6e5494] transition-colors">
                                <FaGithub size={20} color="#6e5494" />
                            </div>
                            <div>
                                <h3 className="text-lg font-bold text-text-primary m-0">GitHub</h3>
                                <p className="text-accent-primary font-mono text-sm m-0">@jadenfix</p>
                            </div>
                        </div>
                    </motion.a>
                </motion.div>

                {/* Two Sections */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-8 mb-16">
                    {/* Work */}
                    <motion.div
                        className="bg-bg-secondary/50 border border-border-color p-8 clip-corner-br"
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ duration: 0.5, delay: 0.3 }}
                    >
                        <h3 className="text-xl font-bold mb-4 text-text-primary">Work</h3>
                        <div className="flex items-center gap-3 mb-4">
                            <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse" />
                            <span className="text-text-secondary text-sm">Currently building at</span>
                            <a
                                href="https://www.roe-ai.com"
                                target="_blank"
                                rel="noopener noreferrer"
                                className="text-golden-gate font-bold no-underline hover:underline"
                            >
                                Roe AI
                            </a>
                            <span className="px-2 py-0.5 bg-golden-gate/10 text-golden-gate text-xs font-bold border border-golden-gate/30 clip-corner-br">
                                YC W24
                            </span>
                        </div>
                        <p className="text-text-muted text-sm leading-relaxed">
                            Interested in AI agents, distributed systems, and high-performance infrastructure.
                        </p>
                    </motion.div>

                    {/* Outside */}
                    <motion.div
                        className="bg-bg-secondary/50 border border-border-color p-8 clip-corner-br"
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ duration: 0.5, delay: 0.4 }}
                    >
                        <h3 className="text-xl font-bold mb-4 text-text-primary">Outside</h3>
                        <p className="text-text-secondary text-sm leading-relaxed mb-4">
                            If you want to go backcountry skiing, trail running, or mountain biking in Tahoe or the Sierra, reach out.
                        </p>
                        <p className="text-text-muted text-sm">
                            Always looking for partners for dawn patrols, long days in the mountains, or after-work rides.
                        </p>
                    </motion.div>
                </div>

                {/* CTA */}
                <motion.div
                    className="text-center"
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    transition={{ duration: 0.6, delay: 0.5 }}
                >
                    <motion.a
                        href="mailto:jadenfix123@gmail.com"
                        className="inline-flex items-center gap-2 px-8 py-3 bg-accent-primary/10 border border-accent-primary text-accent-primary font-bold no-underline clip-corner-br"
                        whileHover={{ scale: 1.05 }}
                        whileTap={{ scale: 0.95 }}
                    >
                        <FaEnvelope /> Send a message
                    </motion.a>
                </motion.div>
            </div>
        </div>
    );
}

export default ContactPage;
