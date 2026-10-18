import { useEffect, useRef } from 'react';

// A small amber point with a slower ring that orbits after it. Over anything
// clickable the ring opens into terminal brackets. Fine pointers only; touch
// devices and reduced-motion users keep the system cursor.

export default function Cursor() {
  const dot = useRef<HTMLDivElement>(null);
  const ring = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const fine = window.matchMedia('(pointer: fine)').matches;
    const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    if (!fine || reduce) return;
    document.documentElement.classList.add('custom-cursor');

    let x = -100;
    let y = -100;
    let rx = x;
    let ry = y;
    let hot = false;
    let down = false;
    let raf = 0;
    let shown = false;

    const move = (e: PointerEvent) => {
      x = e.clientX;
      y = e.clientY;
      if (!shown) {
        rx = x;
        ry = y;
        shown = true;
        dot.current!.style.opacity = '1';
        ring.current!.style.opacity = '1';
      }
      const t = e.target as HTMLElement | null;
      const isHot = !!t?.closest('a, button, [role="tab"], [role="radio"], input, select, label, [data-cursor="hot"]');
      if (isHot !== hot) {
        hot = isHot;
        ring.current!.dataset.hot = hot ? '1' : '';
      }
    };
    const leave = () => {
      shown = false;
      dot.current!.style.opacity = '0';
      ring.current!.style.opacity = '0';
    };
    const press = () => (down = true);
    const release = () => (down = false);

    const tick = () => {
      rx += (x - rx) * 0.16;
      ry += (y - ry) * 0.16;
      dot.current!.style.transform = `translate3d(${x}px, ${y}px, 0)`;
      const s = down ? 0.8 : 1;
      ring.current!.style.transform = `translate3d(${rx}px, ${ry}px, 0) scale(${s})`;
      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    window.addEventListener('pointermove', move, { passive: true });
    document.addEventListener('pointerleave', leave);
    window.addEventListener('pointerdown', press);
    window.addEventListener('pointerup', release);
    return () => {
      cancelAnimationFrame(raf);
      document.documentElement.classList.remove('custom-cursor');
      window.removeEventListener('pointermove', move);
      document.removeEventListener('pointerleave', leave);
      window.removeEventListener('pointerdown', press);
      window.removeEventListener('pointerup', release);
    };
  }, []);

  return (
    <>
      <div ref={ring} className="cursor-ring" aria-hidden>
        <span />
        <span />
      </div>
      <div ref={dot} className="cursor-dot" aria-hidden />
    </>
  );
}
