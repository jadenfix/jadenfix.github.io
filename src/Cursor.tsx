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
    let last = 0;
    let sc = 1;
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
      const t = e.target instanceof Element ? e.target : null;
      const isHot = !!t?.closest('a, button, [role="tab"], [role="radio"], input, select, label, [data-cursor="hot"]');
      if (isHot !== hot) {
        hot = isHot;
        ring.current!.dataset.hot = hot ? '1' : '';
      }
      wake();
    };
    const leave = () => {
      shown = false;
      dot.current!.style.opacity = '0';
      ring.current!.style.opacity = '0';
    };
    const press = () => {
      down = true;
      wake();
    };
    const release = () => {
      down = false;
      wake();
    };

    // runs only while the ring is still catching up; a resting pointer costs nothing
    const tick = (now: number) => {
      const k = 1 - Math.pow(1 - 0.16, Math.min(4, (now - (last || now - 16.7)) / 16.7));
      last = now;
      rx += (x - rx) * k;
      ry += (y - ry) * k;
      sc += ((down ? 0.8 : 1) - sc) * 0.3;
      dot.current!.style.transform = `translate3d(${x}px, ${y}px, 0)`;
      ring.current!.style.transform = `translate3d(${rx.toFixed(2)}px, ${ry.toFixed(2)}px, 0) scale(${sc.toFixed(3)})`;
      if (Math.abs(x - rx) + Math.abs(y - ry) > 0.1 || Math.abs((down ? 0.8 : 1) - sc) > 0.002) raf = requestAnimationFrame(tick);
      else raf = 0;
    };
    const wake = () => {
      if (!raf) {
        last = 0;
        raf = requestAnimationFrame(tick);
      }
    };
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
