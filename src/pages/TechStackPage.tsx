import { motion } from 'framer-motion';
import { FaAws, FaGoogle, FaPython, FaReact, FaDocker, FaNodeJs, FaRust } from 'react-icons/fa';
import { SiTensorflow, SiPytorch, SiTypescript, SiKubernetes, SiTerraform, SiMongodb, SiPostgresql, SiGraphql, SiSolidity } from 'react-icons/si';

// Define tech categories and items
const techCategories = [
    {
        title: 'AI & Machine Learning',
        icon: '🧠',
        skills: [
            { name: 'PyTorch', icon: SiPytorch, color: '#EE4C2C' },
            { name: 'TensorFlow', icon: SiTensorflow, color: '#FF6F00' },
            { name: 'Python', icon: FaPython, color: '#3776AB' },
            { name: 'Hugging Face', icon: null, color: '#FFD21E' }, // No icon in react-icons for HF yet
            { name: 'LangChain', icon: null, color: '#1C3C3C' },
        ]
    },
    {
        title: 'Cloud Infrastructure',
        icon: '☁️',
        skills: [
            { name: 'AWS', icon: FaAws, color: '#FF9900' },
            { name: 'GCP', icon: FaGoogle, color: '#4285F4' },
            { name: 'Docker', icon: FaDocker, color: '#2496ED' },
            { name: 'Kubernetes', icon: SiKubernetes, color: '#326CE5' },
            { name: 'Terraform', icon: SiTerraform, color: '#7B42BC' },
        ]
    },
    {
        title: 'Full Stack Development',
        icon: '💻',
        skills: [
            { name: 'TypeScript', icon: SiTypescript, color: '#3178C6' },
            { name: 'React', icon: FaReact, color: '#61DAFB' },
            { name: 'Node.js', icon: FaNodeJs, color: '#339933' },
            { name: 'PostgreSQL', icon: SiPostgresql, color: '#4169E1' },
            { name: 'MongoDB', icon: SiMongodb, color: '#47A248' },
            { name: 'GraphQL', icon: SiGraphql, color: '#E10098' },
        ]
    },
    {
        title: 'High Performance & Systems',
        icon: '⚡',
        skills: [
            { name: 'Rust', icon: FaRust, color: '#dea584' },
            { name: 'Solidity', icon: SiSolidity, color: '#363636' },
        ]
    }
];

function TechStackPage() {
    return (
        <div className="min-h-screen text-text-primary pt-24 pb-16 px-8">
            <div className="max-w-[1400px] mx-auto">
                <motion.div
                    className="text-center mb-16"
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.6 }}
                >
                    <h1 className="text-[3rem] font-bold m-0 mb-4 text-[#f7fafc] tracking-tight">Technical Arsenal</h1>
                    <p className="text-lg text-[#cbd5e0] max-w-[700px] mx-auto m-0 font-light">
                        A comprehensive overview of the technologies, frameworks, and tools I use to build autonomous agents and high-performance systems.
                    </p>
                </motion.div>

                {/* Cloud Infrastructure Visualization */}
                <motion.div
                    className="mb-20 p-8 bg-bg-secondary border border-border-color clip-corner-br relative overflow-hidden"
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.6, delay: 0.2 }}
                >
                    <div className="absolute inset-0 bg-gradient-to-r from-sf-blue/20 to-sf-teal/20 pointer-events-none" />
                    <h2 className="text-2xl font-bold mb-8 text-center relative z-10 flex items-center justify-center gap-3">
                        <span className="text-3xl">☁️</span> Cloud Infrastructure
                    </h2>

                    <div className="flex justify-center items-center gap-12 flex-wrap relative z-10">
                        <motion.div
                            className="w-32 h-32 bg-[#FF9900]/10 border border-[#FF9900]/30 flex flex-col items-center justify-center gap-2 clip-corner-br"
                            whileHover={{ scale: 1.05, borderColor: '#FF9900' }}
                        >
                            <FaAws size={48} color="#FF9900" />
                            <span className="font-bold">AWS</span>
                        </motion.div>
                        <div className="h-[2px] w-20 bg-gradient-to-r from-[#FF9900] to-[#4285F4] hidden md:block border-t border-dashed border-white/30" />
                        <motion.div
                            className="w-32 h-32 bg-[#4285F4]/10 border border-[#4285F4]/30 flex flex-col items-center justify-center gap-2 clip-corner-br"
                            whileHover={{ scale: 1.05, borderColor: '#4285F4' }}
                        >
                            <FaGoogle size={48} color="#4285F4" />
                            <span className="font-bold">GCP</span>
                        </motion.div>
                    </div>
                </motion.div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                    {techCategories.map((category, catIndex) => (
                        <motion.div
                            key={category.title}
                            className="bg-bg-secondary/50 border border-border-color p-8 clip-corner-br hover:border-accent-primary/30 transition-colors duration-300"
                            initial={{ opacity: 0, y: 20 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ duration: 0.5, delay: 0.3 + catIndex * 0.1 }}
                        >
                            <h3 className="text-2xl font-bold mb-6 flex items-center gap-3 text-accent-primary">
                                <span>{category.icon}</span> {category.title}
                            </h3>

                            <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
                                {category.skills.map((skill) => (
                                    <motion.div
                                        key={skill.name}
                                        className="flex flex-col items-center justify-center p-4 bg-bg-tertiary border border-border-color clip-corner-br hover:bg-bg-tertiary/80 transition-colors cursor-default group"
                                        whileHover={{ y: -5 }}
                                    >
                                        <div className="mb-3 text-3xl group-hover:scale-110 transition-transform duration-200" style={{ color: skill.color }}>
                                            {skill.icon ? <skill.icon /> : <span className="text-xl font-bold">HF</span>}
                                        </div>
                                        <span className="text-sm font-medium text-text-secondary group-hover:text-text-primary transition-colors">{skill.name}</span>
                                    </motion.div>
                                ))}
                            </div>
                        </motion.div>
                    ))}
                </div>
            </div>
        </div>
    );
}

export default TechStackPage;
