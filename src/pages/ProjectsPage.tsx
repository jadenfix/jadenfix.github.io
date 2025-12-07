import { useState, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import ProjectCard from '../components/ProjectCard';
import { projects, categories } from '../data/projects';

function ProjectsPage() {
    const [activeFilter, setActiveFilter] = useState('all');
    const [searchTerm, setSearchTerm] = useState('');

    const filteredProjects = useMemo(() => {
        let result = [...projects];

        if (activeFilter !== 'all') {
            result = result.filter(p => p.category === activeFilter);
        }

        if (searchTerm) {
            result = result.filter(p =>
                p.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                p.description.toLowerCase().includes(searchTerm.toLowerCase())
            );
        }

        return result;
    }, [activeFilter, searchTerm]);

    return (
        <div className="min-h-screen text-text-primary pt-24 pb-16 px-8">
            <div className="max-w-[1400px] mx-auto">
                <motion.div
                    className="text-center mb-12"
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.6 }}
                >
                    <h1 className="text-[3rem] font-bold m-0 mb-4 text-[#f7fafc] tracking-tight">All Projects</h1>
                    <p className="text-lg text-[#cbd5e0] max-w-[700px] mx-auto m-0 font-light">
                        Explore my complete portfolio of AI agents, high-performance systems, trading algorithms, and research projects
                    </p>
                </motion.div>

                {/* Search Bar */}
                <motion.div
                    className="max-w-[500px] mx-auto mb-8"
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.6, delay: 0.1 }}
                >
                    <div className="relative group">
                        <div className="absolute inset-0 bg-gradient-to-r from-accent-primary/20 to-accent-secondary/20 blur-md opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
                        <input
                            type="text"
                            placeholder="Search projects..."
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                            className="relative w-full px-4 py-3 bg-bg-secondary border border-border-color text-text-primary placeholder-text-muted focus:outline-none focus:border-accent-primary transition-colors duration-200 clip-corner-br"
                        />
                    </div>
                </motion.div>

                {/* Filter Buttons */}
                <motion.div
                    className="flex justify-center gap-3 flex-wrap mb-12"
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.6, delay: 0.2 }}
                >
                    {categories.map((cat) => (
                        <motion.button
                            key={cat.id}
                            className={`px-5 py-2.5 text-sm font-medium cursor-pointer transition-all duration-200 clip-corner-br border ${activeFilter === cat.id
                                ? 'bg-accent-primary/10 border-accent-primary text-accent-primary'
                                : 'bg-bg-secondary/80 border-border-color text-[#a0aec0] hover:border-accent-primary/40 hover:text-[#f7fafc]'
                                }`}
                            onClick={() => setActiveFilter(cat.id)}
                            whileHover={{ scale: 1.05 }}
                            whileTap={{ scale: 0.95 }}
                        >
                            {cat.name}
                        </motion.button>
                    ))}
                </motion.div>

                {/* Projects Grid */}
                <motion.div
                    className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6"
                    layout
                >
                    <AnimatePresence mode="popLayout">
                        {filteredProjects.map((project, index) => (
                            <ProjectCard
                                key={project.id}
                                project={project}
                                index={index}
                            />
                        ))}
                    </AnimatePresence>
                </motion.div>

                {filteredProjects.length === 0 && (
                    <div className="text-center py-20 text-text-muted">
                        No projects found matching your filters.
                    </div>
                )}
            </div>
        </div>
    );
}

export default ProjectsPage;
