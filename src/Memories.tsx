import { motion } from 'framer-motion';

const photos = [
  { src: '/media/mem-whiteout.jpg', caption: 'whiteout, donner summit', tall: true },
  { src: '/media/mem-spring.jpg', caption: 'eastern sierra, late light', tall: false },
  { src: '/media/mem-bivy.jpg', caption: 'bivy, 10,000 ft', tall: true },
  { src: '/media/mem-descent.jpg', caption: 'avalanche gulch, shasta', tall: true },
];

/** A few photos, developed slowly: they start faded and come back to colour as you reach them. */
export default function Memories() {
  return (
    <div className="grid grid-cols-2 gap-3 sm:gap-4 md:grid-cols-[1fr_1.6fr_1fr_1fr]">
      {photos.map((p, i) => (
        <motion.figure
          key={p.src}
          className={`group ${p.tall ? '' : 'col-span-2 md:col-span-1'}`}
          initial={{ opacity: 0, y: 14 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: '-80px' }}
          transition={{ duration: 1.4, delay: i * 0.15, ease: [0.2, 0.7, 0.2, 1] }}
        >
          <div className={`relative overflow-hidden border border-line bg-black ${p.tall ? 'aspect-[3/4]' : 'aspect-[3/4] md:aspect-auto md:h-full'}`}>
            <motion.img
              src={p.src}
              alt={p.caption}
              loading="lazy"
              className="h-full w-full object-cover"
              initial={{ filter: 'grayscale(1) contrast(0.9) brightness(0.7)', scale: 1.06 }}
              whileInView={{ filter: 'grayscale(0.15) contrast(1) brightness(0.95)', scale: 1 }}
              viewport={{ once: true, margin: '-120px' }}
              transition={{ duration: 2.6, delay: 0.3 + i * 0.15, ease: 'easeOut' }}
            />
            <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_at_center,transparent_55%,rgba(0,0,0,0.45))]" />
          </div>
          <figcaption className="mt-2 text-[11px] text-faint transition-colors group-hover:text-dim">{p.caption}</figcaption>
        </motion.figure>
      ))}
    </div>
  );
}
