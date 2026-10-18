import { useRef } from 'react';
import { useReveal } from './scroll';

const photos = [
  { src: '/media/mem-whiteout.jpg', caption: 'whiteout, donner summit', tall: true },
  { src: '/media/mem-spring.jpg', caption: 'eastern sierra, late light', tall: false },
  { src: '/media/mem-bivy.jpg', caption: 'bivy, 10,000 ft', tall: true },
  { src: '/media/mem-descent.jpg', caption: 'avalanche gulch, shasta', tall: true },
];

function Photo({ p }: { p: (typeof photos)[number] }) {
  const ref = useRef<HTMLElement>(null);
  useReveal(ref);
  return (
    <figure ref={ref} className={`reveal develop group ${p.tall ? '' : 'col-span-2 md:col-span-1'}`}>
      <div className={`relative overflow-hidden border border-line bg-black ${p.tall ? 'aspect-[3/4]' : 'aspect-[3/4] md:aspect-auto md:h-full'}`}>
        <div className="dev-frame absolute inset-0">
          {/* the latent print: grey and underexposed */}
          <img src={p.src} alt="" aria-hidden loading="lazy" className="dev-grey absolute inset-0 h-full w-full object-cover" />
          {/* the print as it develops in */}
          <img src={p.src} alt={p.caption} loading="lazy" className="dev-color absolute inset-0 h-full w-full object-cover" />
        </div>
        {/* darkroom safelight, swelling and fading as the image comes up */}
        <div className="dev-safe pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_at_50%_40%,rgba(232,140,80,0.22),rgba(110,35,15,0.38))]" />
        <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_at_center,transparent_55%,rgba(0,0,0,0.45))]" />
      </div>
      <figcaption className="mt-2 text-[11px] text-faint transition-colors duration-short group-hover:text-dim">{p.caption}</figcaption>
    </figure>
  );
}

/** A few photos, developed slowly: each comes up out of a grey latent image as you reach it. */
export default function Memories() {
  return (
    <div className="grid grid-cols-2 gap-3 sm:gap-4 md:grid-cols-[1fr_1.6fr_1fr_1fr]">
      {photos.map((p) => (
        <Photo key={p.src} p={p} />
      ))}
    </div>
  );
}
