
import { FaGithub } from 'react-icons/fa';

function Footer() {
    return (
        <footer className="bg-bg-secondary border-t border-border-color px-8 py-8 mt-auto">
            <div className="max-w-[1400px] mx-auto flex justify-between items-center flex-col md:flex-row gap-4">
                <p className="text-text-muted text-sm m-0">
                    © {new Date().getFullYear()} Jaden Fix. Built with React, Vite & Tailwind.
                </p>

                <div className="flex gap-4">
                    <a
                        href="https://github.com/jadenfix"
                        target="_blank"
                        rel="noopener noreferrer"
                        className="flex items-center justify-center w-9 h-9 text-text-secondary rounded-lg transition-all duration-200 hover:text-accent-primary hover:bg-accent-primary/10"
                    >
                        <FaGithub className="w-[18px] h-[18px]" />
                    </a>
                </div>
            </div>
        </footer>
    );
}

export default Footer;
