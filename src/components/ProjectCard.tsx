import { useEffect, useRef } from 'react';
import { motion } from 'framer-motion';
import { FaGithub, FaExternalLinkAlt } from 'react-icons/fa';
import VanillaTilt from 'vanilla-tilt';
import type { Project } from '../data/projects';
import { languageColors } from '../data/projects';

interface ProjectCardProps {
    project: Project;
    index: number;
}

function ProjectCard({ project, index }: ProjectCardProps) {
    const tiltRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        if (tiltRef.current) {
            VanillaTilt.init(tiltRef.current, {
                max: 5,
                speed: 400,
                glare: true,
                'max-glare': 0.1,
                scale: 1.01,
                perspective: 1000,
            });
        }

        return () => {
            if (tiltRef.current) {
                // @ts-ignore - VanillaTilt adds destroy method
                tiltRef.current.vanillaTilt?.destroy();
            }
        };
    }, []);

    return (
        <motion.div
            ref={tiltRef}
            className="relative bg-bg-secondary border border-border-color clip-corner-br transition-all duration-300 hover:border-accent-primary/40 group h-full"
            initial={{ opacity: 0, y: 30 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, margin: '-50px' }}
            transition={{
                duration: 0.5,
                delay: index * 0.08,
                ease: [0.25, 0.46, 0.45, 0.94]
            }}
        >
            {/* Decorative corner accent */}
            <div className="absolute top-0 left-0 w-8 h-8 border-t-2 border-l-2 border-accent-primary/30 group-hover:border-accent-primary transition-colors duration-300" />
            <div className="absolute bottom-0 right-0 w-8 h-8 border-b-2 border-r-2 border-accent-primary/30 group-hover:border-accent-primary transition-colors duration-300 opacity-0 group-hover:opacity-100" />

            {/* Glow effect on hover */}
            <div className="absolute inset-0 bg-gradient-accent opacity-0 group-hover:opacity-5 blur-2xl transition-opacity duration-500 pointer-events-none" />

            <div className="relative p-6 flex flex-col h-full bg-bg-secondary/90 backdrop-blur-sm">
                <div className="flex justify-between items-start mb-4">
                    <h3 className="text-xl font-bold text-text-primary m-0 group-hover:text-accent-primary transition-colors duration-300 font-mono tracking-tight">{project.name}</h3>
                    {project.featured && (
                        <motion.span
                            className="px-2 py-0.5 text-[10px] uppercase tracking-wider font-bold text-golden-gate border border-golden-gate/50 bg-golden-gate/5"
                            initial={{ scale: 0 }}
                            animate={{ scale: 1 }}
                            transition={{ delay: index * 0.08 + 0.2, type: 'spring' }}
                        >
                            Featured
                        </motion.span>
                    )}
                </div>

                <p className="text-text-secondary text-sm mb-6 flex-grow leading-relaxed font-light">
                    {project.description}
                </p>

                <div className="flex justify-between items-center mt-auto border-t border-border-color pt-4 group-hover:border-accent-primary/20 transition-colors duration-300">
                    <div className="flex items-center gap-2">
                        <span
                            className="w-2 h-2"
                            style={{ backgroundColor: languageColors[project.language] || '#6e7681' }}
                        />
                        <span className="text-xs text-text-muted font-mono uppercase tracking-wider">{project.language}</span>
                    </div>

                    <div className="flex gap-3">
                        <motion.a
                            href={project.github}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="flex items-center justify-center w-8 h-8 text-text-secondary transition-all duration-200 hover:text-accent-primary hover:bg-accent-primary/10 clip-corner-br border border-transparent hover:border-accent-primary/30"
                            whileHover={{ scale: 1.05 }}
                            whileTap={{ scale: 0.95 }}
                            title="View on GitHub"
                        >
                            <FaGithub className="w-4 h-4" />
                        </motion.a>
                        <motion.a
                            href={project.github}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="flex items-center justify-center w-8 h-8 text-text-secondary transition-all duration-200 hover:text-accent-primary hover:bg-accent-primary/10 clip-corner-br border border-transparent hover:border-accent-primary/30"
                            whileHover={{ scale: 1.05 }}
                            whileTap={{ scale: 0.95 }}
                            title="Open Project"
                        >
                            <FaExternalLinkAlt className="w-3 h-3" />
                        </motion.a>
                    </div>
                </div>
            </div>
        </motion.div>
    );
}

export default ProjectCard;
