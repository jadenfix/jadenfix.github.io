import { useEffect, useState } from 'react';
import { motion } from 'framer-motion';

function CustomCursor() {
    // Disable on mobile for performance - no DOM manipulation needed
    const [isMobile, setIsMobile] = useState(false);

    useEffect(() => {
        const checkMobile = () => {
            setIsMobile(window.innerWidth <= 768);
        };

        checkMobile();
        window.addEventListener('resize', checkMobile);

        return () => window.removeEventListener('resize', checkMobile);
    }, []);

    // Early return for mobile devices - prevents any performance impact
    if (isMobile) {
        return null;
    }

    const [mousePosition, setMousePosition] = useState({ x: -100, y: -100 });
    const [isPointer, setIsPointer] = useState(false);
    const [trail, setTrail] = useState<Array<{ x: number; y: number; id: number }>>([]);

    useEffect(() => {
        let trailId = 0;

        const handleMouseMove = (e: MouseEvent) => {
            const x = e.clientX;
            const y = e.clientY;

            setMousePosition({ x, y });

            // Add trail particle
            setTrail(prev => {
                const newTrail = [...prev, { x, y, id: trailId++ }].slice(-15);
                return newTrail;
            });

            // Check if hovering over interactive element
            const target = e.target as HTMLElement;
            const isInteractive =
                target.tagName === 'A' ||
                target.tagName === 'BUTTON' ||
                !!target.closest('a') ||
                !!target.closest('button');
            setIsPointer(isInteractive);
        };

        window.addEventListener('mousemove', handleMouseMove);

        // Cleanup old trail particles
        const interval = setInterval(() => {
            setTrail(prev => prev.slice(1));
        }, 50);

        return () => {
            window.removeEventListener('mousemove', handleMouseMove);
            clearInterval(interval);
        };
    }, []);

    return (
        <div className="custom-cursor-container">
            {/* Rainbow trail */}
            {trail.map((point, index) => (
                <motion.div
                    key={point.id}
                    className="cursor-trail"
                    initial={{ opacity: 0.8, scale: 1 }}
                    animate={{ opacity: 0, scale: 0.3 }}
                    transition={{ duration: 0.6 }}
                    style={{
                        position: 'fixed',
                        left: point.x,
                        top: point.y,
                        width: 20 - index,
                        height: 20 - index,
                        borderRadius: '50%',
                        background: `hsl(${(index * 24) % 360}, 100%, 60%)`,
                        pointerEvents: 'none',
                        zIndex: 9998,
                        transform: 'translate(-50%, -50%)',
                    }}
                />
            ))}

            {/* Main cursor ring */}
            <motion.div
                className="cursor-ring"
                animate={{
                    x: mousePosition.x - 20,
                    y: mousePosition.y - 20,
                    scale: isPointer ? 1.3 : 1,
                }}
                transition={{ type: 'spring', stiffness: 500, damping: 28 }}
                style={{
                    position: 'fixed',
                    width: 40,
                    height: 40,
                    border: '2.5px solid',
                    borderImage: 'linear-gradient(45deg, #ff6b6b, #4ecdc4, #45b7d1, #96ceb4, #ffeaa7) 1',
                    borderRadius: '50%',
                    pointerEvents: 'none',
                    zIndex: 9999,
                    boxShadow: isPointer
                        ? '0 0 25px rgba(78, 205, 196, 0.8), inset 0 0 15px rgba(78, 205, 196, 0.4)'
                        : '0 0 15px rgba(69, 183, 209, 0.6)',
                }}
            />

            {/* Center dot */}
            <motion.div
                className="cursor-dot"
                animate={{
                    x: mousePosition.x - 3,
                    y: mousePosition.y - 3,
                }}
                transition={{ type: 'spring', stiffness: 800, damping: 40 }}
                style={{
                    position: 'fixed',
                    width: 6,
                    height: 6,
                    borderRadius: '50%',
                    background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
                    pointerEvents: 'none',
                    zIndex: 10000,
                    boxShadow: '0 0 12px rgba(102, 126, 234, 0.8)',
                }}
            />
        </div>
    );
}

export default CustomCursor;
