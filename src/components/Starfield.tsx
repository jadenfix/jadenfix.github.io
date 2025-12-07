import { useEffect, useRef } from 'react';

interface StarfieldProps {
    density?: number;
}

function Starfield({ density = 200 }: StarfieldProps) {
    const canvasRef = useRef<HTMLCanvasElement>(null);

    useEffect(() => {
        const canvas = canvasRef.current;
        if (!canvas) return;

        const ctx = canvas.getContext('2d');
        if (!ctx) return;

        const resize = () => {
            canvas.width = window.innerWidth;
            canvas.height = window.innerHeight;
        };
        resize();
        window.addEventListener('resize', resize);

        interface Star {
            x: number;
            y: number;
            z: number;
            px: number;
            py: number;
            size: number;
            brightness: number;
            twinklePhase: number;
        }

        const stars: Star[] = [];

        // Create stars with depth (z-axis for parallax)
        for (let i = 0; i < density; i++) {
            stars.push({
                x: Math.random() * canvas.width - canvas.width / 2,
                y: Math.random() * canvas.height - canvas.height / 2,
                z: Math.random() * 1000,
                px: 0,
                py: 0,
                size: Math.random() * 2 + 0.5,
                brightness: Math.random(),
                twinklePhase: Math.random() * Math.PI * 2,
            });
        }

        let animationTime = 0;
        let mouseX = 0;
        let mouseY = 0;

        const handleMouseMove = (e: MouseEvent) => {
            mouseX = (e.clientX - canvas.width / 2) * 0.01;
            mouseY = (e.clientY - canvas.height / 2) * 0.01;
        };
        window.addEventListener('mousemove', handleMouseMove);

        const animate = () => {
            ctx.fillStyle = 'rgba(5, 10, 20, 0.1)';
            ctx.fillRect(0, 0, canvas.width, canvas.height);

            animationTime += 0.016;

            const centerX = canvas.width / 2;
            const centerY = canvas.height / 2;

            stars.forEach((star) => {
                // Move stars toward viewer (z decreases)
                star.z -= 0.5;

                // Reset star if it goes past the viewer
                if (star.z <= 0) {
                    star.z = 1000;
                    star.x = Math.random() * canvas.width - canvas.width / 2;
                    star.y = Math.random() * canvas.height - canvas.height / 2;
                }

                // Calculate 3D perspective projection
                const perspective = 1000 / star.z;
                const x = centerX + (star.x + mouseX * star.z) * perspective;
                const y = centerY + (star.y + mouseY * star.z) * perspective;

                // Calculate star size based on depth
                const size = star.size * perspective;

                // Twinkling effect
                star.twinklePhase += 0.02 + star.brightness * 0.03;
                const twinkle = Math.sin(star.twinklePhase) * 0.3 + 0.7;

                // Color based on depth (closer stars are brighter/whiter)
                const brightness = Math.min(255, 100 + (1 - star.z / 1000) * 155);
                const alpha = twinkle * (1 - star.z / 1000);

                // Draw star trail
                if (star.px && star.py) {
                    ctx.strokeStyle = `rgba(${brightness}, ${brightness}, ${brightness + 50}, ${alpha * 0.3})`;
                    ctx.lineWidth = size * 0.5;
                    ctx.beginPath();
                    ctx.moveTo(star.px, star.py);
                    ctx.lineTo(x, y);
                    ctx.stroke();
                }

                // Draw star
                const gradient = ctx.createRadialGradient(x, y, 0, x, y, size * 2);
                gradient.addColorStop(0, `rgba(${brightness}, ${brightness}, 255, ${alpha})`);
                gradient.addColorStop(0.5, `rgba(${brightness}, ${brightness}, 255, ${alpha * 0.5})`);
                gradient.addColorStop(1, `rgba(${brightness}, ${brightness}, 255, 0)`);

                ctx.fillStyle = gradient;
                ctx.beginPath();
                ctx.arc(x, y, size * 2, 0, Math.PI * 2);
                ctx.fill();

                // Add glow for brighter stars
                if (star.brightness > 0.7) {
                    ctx.fillStyle = `rgba(150, 200, 255, ${alpha * 0.2})`;
                    ctx.beginPath();
                    ctx.arc(x, y, size * 4, 0, Math.PI * 2);
                    ctx.fill();
                }

                star.px = x;
                star.py = y;
            });

            // Add Milky Way dust clouds
            const gradient = ctx.createLinearGradient(0, 0, canvas.width, canvas.height);
            gradient.addColorStop(0, 'rgba(100, 120, 200, 0.05)');
            gradient.addColorStop(0.5, 'rgba(150, 170, 255, 0.15)');
            gradient.addColorStop(1, 'rgba(100, 120, 200, 0.05)');
            ctx.fillStyle = gradient;
            ctx.fillRect(0, 0, canvas.width, canvas.height);

            requestAnimationFrame(animate);
        };

        animate();

        return () => {
            window.removeEventListener('resize', resize);
            window.removeEventListener('mousemove', handleMouseMove);
        };
    }, [density]);

    return (
        <canvas
            ref={canvasRef}
            className="fixed top-0 left-0 w-full h-full pointer-events-none z-0"
            style={{ background: 'radial-gradient(ellipse at bottom, #1B2735 0%, #090A0F 100%)' }}
        />
    );
}

export default Starfield;
