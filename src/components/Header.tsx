import { useState, useEffect } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { motion } from 'framer-motion';
import { FaGithub, FaBars, FaTimes } from 'react-icons/fa';

function Header() {
    const [isScrolled, setIsScrolled] = useState(false);
    const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
    const location = useLocation();

    useEffect(() => {
        const handleScroll = () => {
            setIsScrolled(window.scrollY > 50);
        };
        window.addEventListener('scroll', handleScroll);
        return () => window.removeEventListener('scroll', handleScroll);
    }, []);



    return (
        <motion.header
            className={`fixed top-0 left-0 right-0 z-[1000] px-8 py-4 transition-all duration-300 ${isScrolled ? 'bg-bg-primary/90 backdrop-blur-xl border-b border-border-color' : ''
                }`}
            initial={{ y: -100 }}
            animate={{ y: 0 }}
            transition={{ duration: 0.5, ease: 'easeOut' }}
        >
            <div className="max-w-[1400px] mx-auto flex items-center justify-between">
                <Link to="/" className="flex items-center gap-3 no-underline text-text-primary group">
                    <div className="relative flex items-center justify-center w-10 h-10 bg-gradient-golden font-bold text-base text-bg-primary clip-corner-br transition-transform duration-300 group-hover:scale-110">
                        JF
                    </div>
                    <span className="font-semibold text-lg tracking-wide group-hover:text-accent-primary transition-colors duration-300">Jaden Fix</span>
                </Link>

                <nav className={`md:flex md:items-center md:gap-1 ${isMobileMenuOpen
                    ? 'fixed top-0 right-0 w-[280px] h-screen bg-bg-secondary flex flex-col items-start px-8 pt-20 pb-8 gap-2 border-l border-border-color'
                    : 'fixed top-0 -right-full w-[280px] h-screen bg-bg-secondary flex flex-col items-start px-8 pt-20 pb-8 gap-2 border-l border-border-color md:static md:w-auto md:h-auto md:flex-row md:p-0 md:border-0'
                    } transition-all duration-300`}>
                    {['Home', 'Projects', 'Tech Stack', 'About', 'Outside', 'Contact'].map((item) => {
                        const path = item === 'Home' ? '/' : `/${item.toLowerCase().replace(' ', '-')}`;
                        const isActive = location.pathname === path;
                        return (
                            <Link
                                key={item}
                                to={path}
                                className={`relative px-4 py-2 text-sm font-medium transition-all duration-200 md:w-auto w-full no-underline overflow-hidden group ${isActive ? 'text-accent-primary' : 'text-text-secondary hover:text-text-primary'
                                    }`}
                                onClick={() => setIsMobileMenuOpen(false)}
                            >
                                <span className="relative z-10">{item}</span>
                                {isActive && (
                                    <motion.div
                                        layoutId="navbar-indicator"
                                        className="absolute bottom-0 left-0 right-0 h-[2px] bg-accent-primary"
                                        initial={false}
                                        transition={{ type: "spring", stiffness: 500, damping: 30 }}
                                    />
                                )}
                                <div className="absolute inset-0 bg-accent-primary/5 opacity-0 group-hover:opacity-100 transition-opacity duration-300 transform skew-x-12" />
                            </Link>
                        );
                    })}
                    <a
                        href="https://github.com/jadenfix"
                        target="_blank"
                        rel="noopener noreferrer"
                        className="flex items-center justify-center w-9 h-9 ml-0 md:ml-4 mt-4 md:mt-0 text-text-secondary transition-all duration-200 hover:text-text-primary hover:bg-accent-primary/10 clip-corner-br"
                    >
                        <FaGithub className="w-5 h-5" />
                    </a>
                </nav>

                <button
                    className="md:hidden flex items-center justify-center w-10 h-10 bg-transparent border border-border-color text-text-primary cursor-pointer transition-all duration-200 hover:bg-accent-primary/10 hover:border-accent-primary clip-corner-br"
                    onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
                    aria-label="Toggle menu"
                >
                    {isMobileMenuOpen ? <FaTimes /> : <FaBars />}
                </button>
            </div>
        </motion.header>
    );
}

export default Header;
