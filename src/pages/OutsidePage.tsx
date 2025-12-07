import { motion, useScroll, useTransform } from 'framer-motion';
import { useState, useRef } from 'react';

const photos = [
    { src: '/images/adventure-snowboard.jpg', label: 'SHASTA DESCENT (7K VERTICAL DESCENT) - AVALANCHE GULCH', category: 'summit' },
    { src: '/images/adventures/alpine-portrait.jpg', label: 'TAHOE BACKCOUNTRY - MOUNT ROSE', category: 'summit' },
    { src: '/images/adventure-van.jpg', label: 'BUNNY FLAT BASECAMP - MOUNT SHASTA', category: 'journey' },
    { src: '/images/adventure-drive.jpg', label: 'WHITEOUT APPROACH - DONNER SUMMIT', category: 'journey' },
    { src: '/images/adventure-bivy.jpg', label: 'BIVY @ 10,000FT - MOUNT SHASTA WEST FACE', category: 'mountain' },
    { src: '/images/adventures/splitboard-summit.jpg', label: 'SUMMIT RIDGE - MOUNT SHASTA', category: 'mountain' },
    { src: '/images/adventures/above-the-clouds.jpg', label: 'ABOVE THE CLOUDS - DONNER LAKE BACKCOUNTRY', category: 'mountain' },
    { src: '/images/adventures/high-sierra-descent.jpg', label: 'BEAR CREEK SPIRE - HIGH SIERRA', category: 'descent' },
    { src: '/images/adventures/backcountry-lines.jpg', label: 'CHILL EARLY SEASON LINES - CASTLE PEAK', category: 'descent' },
    { src: '/images/adventure-water.jpg', label: 'EASTERN SIERRA SOAK - BRIDGEPORT', category: 'reward' },
];

const quotes = [
    { text: "The mountains are calling and I must go.", author: "John Muir" },
    { text: "In every walk with nature one receives far more than he seeks.", author: "John Muir" },
    { text: "The clearest way into the Universe is through a forest wilderness.", author: "John Muir" },
];

function OutsidePage() {
    const [activeImage, setActiveImage] = useState<string | null>(null);
    const containerRef = useRef<HTMLDivElement>(null);
    const { scrollYProgress } = useScroll({ target: containerRef });

    const headerY = useTransform(scrollYProgress, [0, 0.3], [0, -50]);
    const headerOpacity = useTransform(scrollYProgress, [0, 0.2], [1, 0]);

    return (
        <div ref={containerRef} className="min-h-screen text-text-primary pt-20 pb-16">
            {/* Header */}
            <motion.div
                className="text-center mb-8 px-4"
                style={{ y: headerY, opacity: headerOpacity }}
            >
                <h1 className="text-[3rem] font-bold m-0 mb-4 text-[#f7fafc] tracking-tight">Outside</h1>
                <p className="text-lg text-[#cbd5e0] max-w-[700px] mx-auto m-0 font-light">
                    Shasta, Sierra, Tahoe, Lassen
                </p>
            </motion.div>

            <div className="max-w-[1800px] mx-auto px-4">

                {/* Section 1: Hero */}
                <motion.div
                    className="grid grid-cols-1 md:grid-cols-2 gap-3 mb-3"
                    initial={{ opacity: 0, y: 40 }}
                    whileInView={{ opacity: 1, y: 0 }}
                    viewport={{ once: true, margin: "-100px" }}
                    transition={{ duration: 0.8 }}
                >
                    <PhotoCard photo={photos[0]} aspectRatio="aspect-[4/3]" onClick={() => setActiveImage(photos[0].src)} />
                    <PhotoCard photo={photos[1]} aspectRatio="aspect-[4/3]" onClick={() => setActiveImage(photos[1].src)} />
                </motion.div>

                {/* Quote Break 1 */}
                <QuoteSection quote={quotes[0]} />

                {/* Section 2: Journey */}
                <motion.div
                    className="grid grid-cols-1 md:grid-cols-3 gap-3 mb-3"
                    initial={{ opacity: 0, y: 40 }}
                    whileInView={{ opacity: 1, y: 0 }}
                    viewport={{ once: true, margin: "-100px" }}
                    transition={{ duration: 0.8, delay: 0.1 }}
                >
                    <div className="md:col-span-2">
                        <PhotoCard photo={photos[2]} aspectRatio="aspect-[16/9]" onClick={() => setActiveImage(photos[2].src)} />
                    </div>
                    <PhotoCard photo={photos[3]} aspectRatio="aspect-[4/5]" onClick={() => setActiveImage(photos[3].src)} />
                </motion.div>

                {/* Quote Break 2 */}
                <QuoteSection quote={quotes[1]} />

                {/* Section 3: Mountain */}
                <motion.div
                    className="grid grid-cols-1 sm:grid-cols-3 gap-3 mb-3"
                    initial={{ opacity: 0, y: 40 }}
                    whileInView={{ opacity: 1, y: 0 }}
                    viewport={{ once: true, margin: "-100px" }}
                    transition={{ duration: 0.8, delay: 0.2 }}
                >
                    <PhotoCard photo={photos[4]} aspectRatio="aspect-[3/4]" onClick={() => setActiveImage(photos[4].src)} />
                    <PhotoCard photo={photos[5]} aspectRatio="aspect-[3/4]" onClick={() => setActiveImage(photos[5].src)} />
                    <PhotoCard photo={photos[6]} aspectRatio="aspect-[3/4]" onClick={() => setActiveImage(photos[6].src)} />
                </motion.div>

                {/* Quote Break 3 */}
                <QuoteSection quote={quotes[2]} />

                {/* Section 4: Rewards */}
                <motion.div
                    className="grid grid-cols-1 md:grid-cols-3 gap-3"
                    initial={{ opacity: 0, y: 40 }}
                    whileInView={{ opacity: 1, y: 0 }}
                    viewport={{ once: true, margin: "-100px" }}
                    transition={{ duration: 0.8, delay: 0.3 }}
                >
                    <PhotoCard photo={photos[7]} aspectRatio="aspect-[4/3]" onClick={() => setActiveImage(photos[7].src)} />
                    <PhotoCard photo={photos[8]} aspectRatio="aspect-[4/3]" onClick={() => setActiveImage(photos[8].src)} />
                    <PhotoCard photo={photos[9]} aspectRatio="aspect-[4/3]" onClick={() => setActiveImage(photos[9].src)} />
                </motion.div>
            </div>

            {/* Enhanced Lightbox */}
            {activeImage && (
                <motion.div
                    className="fixed inset-0 bg-black/95 backdrop-blur-sm z-50 flex items-center justify-center p-4 cursor-pointer"
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    onClick={() => setActiveImage(null)}
                >
                    <motion.img
                        src={activeImage}
                        alt="Full size"
                        className="max-w-full max-h-[90vh] object-contain shadow-2xl
                                  filter brightness-105 contrast-105 saturate-105
                                  image-rendering-high-quality"
                        initial={{ scale: 0.9, opacity: 0 }}
                        animate={{ scale: 1, opacity: 1 }}
                        transition={{ duration: 0.3 }}
                        style={{
                            filter: 'contrast(1.08) brightness(1.05) saturate(1.1)',
                            imageRendering: 'high-quality'
                        }}
                    />
                    <button
                        className="absolute top-6 right-6 text-white/70 hover:text-white text-sm font-mono transition-all duration-200
                                  bg-black/20 hover:bg-black/40 px-3 py-1 rounded border border-white/20 hover:border-white/40"
                        onClick={() => setActiveImage(null)}
                    >
                        CLOSE
                    </button>
                </motion.div>
            )}
        </div>
    );
}

function QuoteSection({ quote }: { quote: { text: string; author: string } }) {
    return (
        <motion.div
            className="py-16 md:py-24 px-8 text-center"
            initial={{ opacity: 0 }}
            whileInView={{ opacity: 1 }}
            viewport={{ once: true, margin: "-50px" }}
            transition={{ duration: 1 }}
        >
            <blockquote className="text-2xl md:text-3xl text-white font-light italic max-w-[800px] mx-auto leading-relaxed drop-shadow-lg">
                "{quote.text}"
            </blockquote>
            <p className="text-white/70 mt-4 text-sm font-mono tracking-wider">
                — {quote.author.toUpperCase()}
            </p>
        </motion.div>
    );
}

function PhotoCard({
    photo,
    aspectRatio,
    onClick
}: {
    photo: { src: string; label: string; category: string };
    aspectRatio: string;
    onClick: () => void;
}) {
    return (
        <motion.div
            className={`relative overflow-hidden clip-corner-br cursor-pointer group ${aspectRatio}`}
            whileHover={{ scale: 1.015 }}
            transition={{ duration: 0.4, ease: "easeOut" }}
            onClick={onClick}
        >
            <img
                src={photo.src}
                alt={photo.label}
                loading="lazy"
                className="absolute inset-0 w-full h-full object-cover transition-all duration-700 group-hover:scale-105
                          filter group-hover:brightness-110 group-hover:contrast-105 group-hover:saturate-110
                          image-rendering-auto md:image-rendering-high-quality"
                style={{
                    filter: 'contrast(1.05) brightness(1.02) saturate(1.03)',
                    imageRendering: 'auto'
                }}
            />
            <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent" />

            <div className="absolute bottom-0 left-0 right-0 p-4">
                <span className="text-white text-xs font-mono tracking-[0.2em] drop-shadow-lg">
                    {photo.label}
                </span>
            </div>

            <div className="absolute inset-0 bg-white/5 opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
        </motion.div>
    );
}

export default OutsidePage;
