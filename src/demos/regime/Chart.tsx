import { useId, useMemo, useRef, useState, type KeyboardEvent, type PointerEvent } from 'react';
import { indexOfYear, yearAt, type Prepared } from './data';
import { useReveal, useTween } from './hooks';
import { areaPath, clampWin, linear, linePath, logExtent, logTicks, yearTicks } from './scales';
import { C, type Mode } from './theme';

type Props = {
  data: Prepared;
  w: number;
  h: number;
  mode: Mode;
  win: [number, number];
  onWin: (w: [number, number] | null) => void;
  hover: number | null;
  onHover: (i: number | null) => void;
  visible: boolean;
  reduce: boolean;
};

const M = { l: 40, r: 10, t: 12 };
const AXIS = 22;
const FC_H = 30;
const REG_H = 44;
const LAB = 17;

function priceTickLabel(v: number): string {
  return v >= 10000 ? `${Math.round(v / 1000)}k` : String(Math.round(v));
}

export default function Chart({ data, w, h, mode, win, onWin, hover, onHover, visible, reduce }: Props) {
  const uid = useId().replace(/:/g, '');
  const n = data.n;
  const animate = visible && !reduce;

  const targetY = useMemo(() => logExtent(data.logPrice, win[0], win[1]), [data.logPrice, win]);
  const [a, b, ylo, yhi] = useTween([win[0], win[1], targetY[0], targetY[1]], 900, animate);
  const [k] = useTween([mode === 'smoothed' ? 1 : 0], 650, animate);
  const reveal = useReveal(visible && w > 0, 2600, reduce);

  // layout
  const plotR = w - M.r;
  const plotW = Math.max(1, plotR - M.l);
  const fcBot = h - AXIS;
  const fcTop = fcBot - FC_H;
  const regBot = fcTop - LAB;
  const regTop = regBot - REG_H;
  const priceBot = regTop - LAB - 4;
  const priceTop = M.t;

  const x = linear(a, b, M.l, plotR);
  const invX = linear(M.l, plotR, a, b);
  const yP = linear(ylo, yhi, priceBot, priceTop);
  const yR = linear(0, 1, regBot, regTop + 2);
  const yF = linear(0, 1, fcBot, fcTop + 2);

  const prob = useMemo(() => {
    const f = data.regime.filtered;
    const s = data.regime.smoothed;
    return f.map((v, i) => v + (s[i] - v) * k);
  }, [data.regime, k]);

  const pricePath = linePath(data.logPrice, 0, a, b, x, yP);
  const probArea = areaPath(prob, data.regOff, a, b, x, yR, regBot);
  const probLine = linePath(prob, data.regOff, a, b, x, yR);
  const fcLine = linePath(data.forecast.p, data.fcOff, a, b, x, yF);
  const perLine = linePath(data.forecast.persist, data.fcOff, a, b, x, yF, true);

  const pTicks = logTicks(ylo, yhi, priceBot - priceTop > 200 ? 4 : 3);
  const yTicks = yearTicks(yearAt(data.start, a), yearAt(data.start, b), plotW);

  const spans = data.spans.filter((s) => s.i1 + 0.5 >= a && s.i0 - 0.5 <= b);
  const hoverSpan = hover == null ? null : data.spans.find((s) => hover >= s.i0 && hover <= s.i1) ?? null;

  // pre-1960 notice in the regime strip
  const regX = Math.max(M.l, Math.min(plotR, x(data.regOff - 0.5)));
  const preW = regX - M.l;

  // interaction
  const svgRef = useRef<SVGSVGElement>(null);
  const [brush, setBrush] = useState<[number, number] | null>(null);
  const idxAt = (clientX: number) => {
    const r = svgRef.current?.getBoundingClientRect();
    if (!r) return null;
    return invX(clientX - r.left);
  };
  const clampIdx = (v: number) => Math.max(0, Math.min(n - 1, Math.round(v)));

  const onDown = (e: PointerEvent<SVGRectElement>) => {
    const v = idxAt(e.clientX);
    if (v == null) return;
    e.preventDefault(); // no focus-scroll jump on tap; keyboard users reach the chart with tab
    onHover(clampIdx(v));
    if (e.pointerType === 'mouse' && e.button === 0) {
      e.currentTarget.setPointerCapture(e.pointerId);
      setBrush([v, v]);
    }
  };
  const onMove = (e: PointerEvent<SVGRectElement>) => {
    const v = idxAt(e.clientX);
    if (v == null) return;
    onHover(clampIdx(v));
    if (brush) setBrush([brush[0], Math.max(-0.5, Math.min(n - 0.5, v))]);
  };
  const onUp = () => {
    if (brush) {
      const [p, q] = brush[0] < brush[1] ? brush : [brush[1], brush[0]];
      if (Math.abs(x(q) - x(p)) > 10) onWin(clampWin(p, q, n));
      setBrush(null);
    }
  };
  const onLeave = (e: PointerEvent<SVGRectElement>) => {
    if (e.pointerType === 'mouse' && !brush) onHover(null);
  };

  const onKey = (e: KeyboardEvent<HTMLDivElement>) => {
    const lo = Math.max(0, Math.ceil(win[0]));
    const hi = Math.min(n - 1, Math.floor(win[1]));
    const cur = hover ?? hi;
    const stepBy = e.shiftKey ? 12 : 1;
    let next: number | null = null;
    switch (e.key) {
      case 'ArrowLeft':
        next = Math.max(0, cur - stepBy);
        break;
      case 'ArrowRight':
        next = Math.min(n - 1, cur + stepBy);
        break;
      case 'Home':
        next = lo;
        break;
      case 'End':
        next = hi;
        break;
      case '+':
      case '=': {
        const span = (win[1] - win[0]) / 2;
        onWin(clampWin(cur - span / 2, cur + span / 2, n));
        e.preventDefault();
        return;
      }
      case '-':
      case '_': {
        const span = (win[1] - win[0]) * 2;
        const c = (win[0] + win[1]) / 2;
        onWin(span >= n ? null : clampWin(c - span / 2, c + span / 2, n));
        e.preventDefault();
        return;
      }
      case 'Escape':
        if (hover != null) onHover(null);
        else onWin(null);
        e.preventDefault();
        return;
      default:
        return;
    }
    e.preventDefault();
    onHover(next);
    // keep the crosshair in view: pan the window when stepping past its edge
    if (next < win[0] || next > win[1]) {
      const span = win[1] - win[0];
      const s = next < win[0] ? next - span * 0.1 : next - span * 0.9;
      onWin(clampWin(s, s + span, n));
    }
  };

  const hx = hover != null ? x(hover) : null;
  const hoverIn = hx != null && hx >= M.l - 0.5 && hx <= plotR + 0.5;
  const revealX = M.l + reveal * plotW;

  if (w <= 0 || h <= 0) return null;

  return (
    <div
      tabIndex={0}
      role="group"
      aria-roledescription="interactive chart"
      aria-label="S&P 500 real price and bear-regime probability. Arrow keys step through months, shift with arrows steps a year, plus and minus zoom, escape resets."
      onKeyDown={onKey}
      className="absolute inset-0 outline-none focus-visible:ring-1 focus-visible:ring-phos/60"
    >
      <svg
        ref={svgRef}
        width={w}
        height={h}
        viewBox={`0 0 ${w} ${h}`}
        className="block select-none"
        role="img"
        aria-label={`Real S&P 500 price on a log scale, ${data.start.slice(0, 4)} to 2023, with ${data.spans.length} dated bear markets shaded; below it the ${mode} bear-regime probability from 1960 and the one-month out-of-sample forecast.`}
        style={{ fontFamily: '"JetBrains Mono", ui-monospace, monospace' }}
      >
        <defs>
          <clipPath id={`clip-${uid}`}>
            <rect x={M.l} y={0} width={Math.max(0, revealX - M.l)} height={h} />
          </clipPath>
          <pattern id={`hatch-${uid}`} width="5" height="5" patternUnits="userSpaceOnUse" patternTransform="rotate(45)">
            <line x1="0" y1="0" x2="0" y2="5" stroke={C.faint} strokeWidth="1" strokeOpacity="0.35" />
          </pattern>
        </defs>

        {/* price gridlines and labels */}
        {pTicks.map((v) => {
          const yy = yP(Math.log10(v));
          return (
            <g key={v}>
              <line x1={M.l} x2={plotR} y1={yy} y2={yy} stroke={C.line} strokeWidth={1} shapeRendering="crispEdges" />
              <text x={M.l - 7} y={yy + 3.5} textAnchor="end" fontSize={10} fill={C.faint}>
                {priceTickLabel(v)}
              </text>
            </g>
          );
        })}

        {/* strip frames */}
        <line x1={M.l} x2={plotR} y1={regBot + 0.5} y2={regBot + 0.5} stroke={C.line} />
        <line x1={M.l} x2={plotR} y1={regTop + 0.5} y2={regTop + 0.5} stroke={C.line} strokeDasharray="1 3" />
        <line x1={M.l} x2={plotR} y1={fcTop + 0.5} y2={fcTop + 0.5} stroke={C.line} strokeDasharray="1 3" />
        <text x={M.l - 7} y={regTop + 6} textAnchor="end" fontSize={9} fill={C.faint}>1</text>
        <text x={M.l - 7} y={regBot + 1} textAnchor="end" fontSize={9} fill={C.faint}>0</text>
        <text x={M.l - 7} y={fcTop + 6} textAnchor="end" fontSize={9} fill={C.faint}>1</text>
        <text x={M.l - 7} y={fcBot + 1} textAnchor="end" fontSize={9} fill={C.faint}>0</text>

        <g clipPath={`url(#clip-${uid})`}>
          {/* dated bear markets */}
          {spans.map((s) => {
            const x0 = Math.max(M.l, x(s.i0 - 0.5));
            const x1 = Math.min(plotR, x(s.i1 + 0.5));
            const on = hoverSpan === s;
            return (
              <g key={s.peak}>
                <rect x={x0} y={priceTop} width={Math.max(0, x1 - x0)} height={fcBot - priceTop} fill={C.red} opacity={on ? 0.14 : 0.075} />
                <line x1={x0} x2={x1} y1={priceTop - 5} y2={priceTop - 5} stroke={C.red} strokeWidth={on ? 2 : 1.25} opacity={on ? 0.95 : 0.6} />
              </g>
            );
          })}

          {/* pre-1960: regime model not fit */}
          {preW > 1 && (
            <>
              <rect x={M.l} y={regTop + 1} width={preW} height={REG_H - 1} fill={`url(#hatch-${uid})`} />
              <rect x={M.l} y={fcTop + 1} width={preW} height={FC_H - 1} fill={`url(#hatch-${uid})`} />
            </>
          )}

          {/* price */}
          <path d={pricePath} fill="none" stroke={C.bone} strokeWidth={1.25} strokeLinejoin="round" />

          {/* regime probability */}
          <path d={probArea} fill={C.phos} opacity={0.16} />
          <path d={probLine} fill="none" stroke={C.phos} strokeWidth={1} strokeLinejoin="round" />

          {/* 1-month forecasts */}
          <path d={perLine} fill="none" stroke={C.ice} strokeWidth={1} opacity={0.55} />
          <path d={fcLine} fill="none" stroke={C.phos} strokeWidth={1} strokeLinejoin="round" />
        </g>

        {preW > 150 && reveal > 0.2 && (
          <text x={M.l + preW / 2} y={regTop + REG_H / 2 + 3} textAnchor="middle" fontSize={9.5} fill={C.dim}>
            regime model starts 1960
          </text>
        )}

        {/* reveal edge */}
        {reveal > 0 && reveal < 1 && (
          <line x1={revealX} x2={revealX} y1={priceTop} y2={fcBot} stroke={C.phos} strokeWidth={1} opacity={0.5 * (1 - reveal)} />
        )}

        {/* strip labels */}
        <text x={M.l} y={regTop - 6} fontSize={10} fill={C.dim}>
          p(bear regime) <tspan fill={C.phos}>{mode === 'filtered' ? 'filtered' : 'smoothed'}</tspan>
        </text>
        <text x={M.l} y={fcTop - 6} fontSize={10} fill={C.dim}>
          1-mo forecast <tspan fill={C.phos}>{w < 440 ? 'model' : data.forecast.label.toLowerCase()}</tspan>
          <tspan fill={C.faint}> / </tspan>
          <tspan fill={C.ice}>persistence</tspan>
        </text>
        <text x={M.l + 6} y={priceTop + 12} fontSize={10} fill={C.faint} stroke={C.void} strokeWidth={4} paintOrder="stroke">
          real price, log scale
        </text>

        {/* time axis */}
        <line x1={M.l} x2={plotR} y1={fcBot + 0.5} y2={fcBot + 0.5} stroke={C.faint} strokeWidth={1} />
        {yTicks.map((yr) => {
          const xx = x(indexOfYear(data.start, yr));
          if (xx < M.l - 0.5 || xx > plotR + 0.5) return null;
          return (
            <g key={yr}>
              <line x1={xx} x2={xx} y1={fcBot} y2={fcBot + 4} stroke={C.faint} shapeRendering="crispEdges" />
              <text x={xx} y={fcBot + 15} textAnchor="middle" fontSize={10} fill={C.dim}>
                {yr}
              </text>
            </g>
          );
        })}

        {/* crosshair */}
        {hoverIn && hover != null && reveal > 0.98 && (
          <g pointerEvents="none">
            <line x1={hx} x2={hx} y1={priceTop - 8} y2={fcBot} stroke={C.bone} strokeOpacity={0.35} strokeWidth={1} />
            <circle cx={hx} cy={yP(data.logPrice[hover])} r={3} fill={C.void} stroke={C.bone} strokeWidth={1.25} />
            {hover >= data.regOff && hover - data.regOff < prob.length && (
              <circle cx={hx} cy={yR(prob[hover - data.regOff])} r={2.5} fill={C.phos} />
            )}
            {hover >= data.fcOff && hover - data.fcOff < data.forecast.p.length && (
              <>
                <circle cx={hx} cy={yF(data.forecast.persist[hover - data.fcOff])} r={2} fill={C.ice} />
                <circle cx={hx} cy={yF(data.forecast.p[hover - data.fcOff])} r={2.5} fill={C.phos} />
              </>
            )}
          </g>
        )}

        {/* brush */}
        {brush && (
          <rect
            x={Math.min(x(brush[0]), x(brush[1]))}
            y={priceTop}
            width={Math.abs(x(brush[1]) - x(brush[0]))}
            height={fcBot - priceTop}
            fill={C.phos}
            fillOpacity={0.07}
            stroke={C.phos}
            strokeOpacity={0.5}
            strokeWidth={1}
            pointerEvents="none"
          />
        )}

        <rect
          x={M.l}
          y={0}
          width={plotW}
          height={fcBot}
          fill="transparent"
          style={{ touchAction: 'pan-y', cursor: 'crosshair' }}
          onPointerDown={onDown}
          onPointerMove={onMove}
          onPointerUp={onUp}
          onPointerCancel={() => setBrush(null)}
          onPointerLeave={onLeave}
          onDoubleClick={() => onWin(null)}
        />
      </svg>
    </div>
  );
}
