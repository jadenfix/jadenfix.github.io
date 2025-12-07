
import { motion } from 'framer-motion';

function BlogPage() {
    return (
        <div className="min-h-screen bg-bg-primary text-text-primary pt-24 pb-16 px-8">
            <div className="max-w-[900px] mx-auto text-center">
                <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.6 }}
                >
                    <div className="mb-8">
                        <div className="w-20 h-20 mx-auto mb-6 bg-gradient-golden rounded-2xl flex items-center justify-center text-bg-primary text-4xl font-bold">
                            📝
                        </div>
                        <h1 className="text-[3rem] font-bold m-0 mb-4 text-[#f7fafc]">Blog</h1>
                        <p className="text-xl text-[#718096] max-w-[600px] mx-auto m-0 mb-12">
                            Insights on AI, autonomous agents, and the future of intelligent systems
                        </p>
                    </div>

                    <div className="p-12 bg-bg-secondary border border-border-color rounded-xl">
                        <div className="w-16 h-16 mx-auto mb-6 bg-accent-primary/10 border border-accent-primary/30 rounded-full flex items-center justify-center">
                            <span className="text-3xl">🚧</span>
                        </div>
                        <h2 className="text-2xl font-bold mb-4 text-[#f7fafc]">Coming Soon</h2>
                        <p className="text-lg text-[#a0aec0] leading-relaxed">
                            I'm currently working on building out this space. Check back soon for articles on AI agent architectures,
                            high-performance computing, and insights from working at the frontier of autonomous systems.
                        </p>
                    </div>
                </motion.div>
            </div>
        </div>
    );
}

export default BlogPage;
