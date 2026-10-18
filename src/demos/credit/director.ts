/**
 * Geometry of the gate-chain diagram and the imperative clock that plays rollouts through it.
 * The moving point is written straight to the DOM every frame; React only hears about
 * discrete events (a step starting, a rollout being revealed).
 */
import type { Episode, ScorerName, Step } from './engine';
import type { Protocol } from './protocol';

export const H = 176;

export type Pt = { x: number; y: number };
export type Geom = { w: number; y0: number; nodes: Record<string, Pt>; ring: number };

export function geometry(w: number): Geom {
  const pad = w < 480 ? 32 : 60;
  const y0 = 70;
  const dx = (w - 2 * pad) / 4;
  const x = (i: number) => pad + i * dx;
  return {
    w,
    y0,
    ring: 12,
    nodes: {
      start: { x: x(0), y: y0 },
      gate_2: { x: x(1), y: y0 },
      gate_3: { x: x(2), y: y0 },
      gate_4: { x: x(3), y: y0 },
      success: { x: x(4), y: y0 },
      jammed: { x: x(0), y: y0 + 74 },
      failure: { x: x(0) + dx * 0.7, y: y0 + 74 },
    },
  };
}

export type EdgeKind = 'pivot' | 'retreat' | 'force' | 'reset' | 'giveup';
export type EdgeDef = { id: string; from: string; to: string; kind: EdgeKind };

export const EDGES: EdgeDef[] = [
  { id: 'start>gate_2', from: 'start', to: 'gate_2', kind: 'pivot' },
  { id: 'gate_2>gate_3', from: 'gate_2', to: 'gate_3', kind: 'pivot' },
  { id: 'gate_3>gate_4', from: 'gate_3', to: 'gate_4', kind: 'pivot' },
  { id: 'gate_4>success', from: 'gate_4', to: 'success', kind: 'pivot' },
  { id: 'gate_2>start', from: 'gate_2', to: 'start', kind: 'retreat' },
  { id: 'gate_3>gate_2', from: 'gate_3', to: 'gate_2', kind: 'retreat' },
  { id: 'gate_4>gate_3', from: 'gate_4', to: 'gate_3', kind: 'retreat' },
  { id: 'start>jammed', from: 'start', to: 'jammed', kind: 'force' },
  { id: 'jammed>start', from: 'jammed', to: 'start', kind: 'reset' },
  { id: 'jammed>failure', from: 'jammed', to: 'failure', kind: 'giveup' },
];
const EDGE_BY_ID = new Map(EDGES.map((e) => [e.id, e]));

function control(g: Geom, e: EdgeDef): Pt | null {
  const a = g.nodes[e.from];
  const b = g.nodes[e.to];
  if (e.kind === 'retreat') return { x: (a.x + b.x) / 2, y: g.y0 + 38 };
  if (e.kind === 'reset') return { x: a.x - 30, y: (a.y + b.y) / 2 };
  return null;
}

export function edgePath(g: Geom, e: EdgeDef): string {
  const a = g.nodes[e.from];
  const b = g.nodes[e.to];
  const c = control(g, e);
  return c ? `M${a.x},${a.y} Q${c.x},${c.y} ${b.x},${b.y}` : `M${a.x},${a.y} L${b.x},${b.y}`;
}

/** Self-transitions (stalls and failed attempts) orbit the node; everything else follows its edge. */
export function motionKey(s: Step): string {
  return s.to === s.from ? `o:${s.from}` : `${s.from}>${s.to}`;
}

const ease = (u: number) => 0.5 - 0.5 * Math.cos(Math.PI * u);

export function pointAt(g: Geom, s: Step, u: number): Pt {
  const a = g.nodes[s.from];
  if (s.to === s.from) {
    // a petal: out to the ring, once around, and back to the star
    const r = g.ring * Math.sin(Math.PI * u);
    const th = -Math.PI / 2 + 2 * Math.PI * ease(u);
    return { x: a.x + r * Math.cos(th), y: a.y + r * Math.sin(th) };
  }
  const e = EDGE_BY_ID.get(`${s.from}>${s.to}`);
  const b = g.nodes[s.to];
  const t = ease(u);
  const c = e ? control(g, e) : null;
  if (!c) return { x: a.x + (b.x - a.x) * t, y: a.y + (b.y - a.y) * t };
  const m = 1 - t;
  return { x: m * m * a.x + 2 * m * t * c.x + t * t * b.x, y: m * m * a.y + 2 * m * t * c.y + t * t * b.y };
}

export type LogLine = { turn: number; action: string; obs: string; stuck: boolean };

export type DirectorUI = {
  onStep: (log: LogLine, key: string, orbit: boolean) => void;
  onStepEnd: (key: string, collecting: boolean) => void;
  onEpisodeEnd: (reachedSuccess: boolean, exhausted: boolean) => void;
  onReveal: (k: number) => void;
  onReplay: (index: number, total: number) => void;
  onIdle: () => void;
};

type Act = { dur: number; start?: () => void; frame?: (u: number) => void; end?: () => void };

const TRAIL = 6;

export class Director {
  private queue: Act[] = [];
  private cur: Act | null = null;
  private t = 0;
  private raf = 0;
  private last = 0;
  private active = false;
  private next = 0; // next collection rollout to reveal
  private gateSeen = 0;
  private replays: Episode[] | null = null;
  private replayIdx = 0;
  private hist: Pt[] = [];
  private visible = false;
  private bg = 0;
  private dead = false;
  scorer: ScorerName;
  private readonly proto: Protocol;
  private readonly seedIdx: number;
  private readonly ui: DirectorUI;
  private readonly getGeom: () => Geom;
  private readonly getEls: () => { point: SVGGElement | null; trail: (SVGCircleElement | null)[] };

  constructor(
    proto: Protocol,
    seedIdx: number,
    scorer: ScorerName,
    ui: DirectorUI,
    getGeom: () => Geom,
    getEls: () => { point: SVGGElement | null; trail: (SVGCircleElement | null)[] },
  ) {
    this.proto = proto;
    this.seedIdx = seedIdx;
    this.scorer = scorer;
    this.ui = ui;
    this.getGeom = getGeom;
    this.getEls = getEls;
    this.queue.push({ dur: 700 });
    this.background();
  }

  /** Precompute the 15-seed snapshots in small slices so the main thread stays smooth. */
  private background() {
    const tick = () => {
      if (this.dead || this.proto.computed >= 50) return;
      this.proto.work(8);
      this.bg = window.setTimeout(tick, 16);
    };
    this.bg = window.setTimeout(tick, 120);
  }

  setActive(on: boolean) {
    if (on === this.active) return;
    this.active = on;
    if (on) {
      this.last = performance.now();
      this.raf = requestAnimationFrame(this.loop);
    } else cancelAnimationFrame(this.raf);
  }

  setScorer(s: ScorerName) {
    if (s === this.scorer) return;
    this.scorer = s;
    if (this.replays) {
      // restart the replay with the newly selected policy
      this.replays = null;
      this.queue = [];
      this.cur = null;
      this.hide();
      this.queue.push({ dur: 450 });
    }
  }

  destroy() {
    this.dead = true;
    this.active = false;
    cancelAnimationFrame(this.raf);
    window.clearTimeout(this.bg);
  }

  /** Reduced motion: jump straight to the settled state. */
  settle(done: () => void) {
    window.clearTimeout(this.bg);
    const tick = () => {
      if (this.dead) return;
      this.proto.work(12);
      if (this.proto.computed >= 50) done();
      else this.bg = window.setTimeout(tick, 0);
    };
    this.bg = window.setTimeout(tick, 0);
  }

  private loop = (now: number) => {
    const dt = Math.min(64, now - this.last);
    this.last = now;
    this.advance(dt);
    if (this.active) this.raf = requestAnimationFrame(this.loop);
  };

  private advance(dt: number) {
    let budget = dt;
    while (budget > 0) {
      if (!this.cur) {
        if (!this.queue.length) this.plan();
        this.cur = this.queue.shift()!;
        this.t = 0;
        this.cur.start?.();
      }
      const take = Math.min(budget, this.cur.dur - this.t);
      this.t += take;
      budget -= take;
      this.cur.frame?.(this.cur.dur ? this.t / this.cur.dur : 1);
      if (this.t >= this.cur.dur) {
        const done = this.cur;
        this.cur = null;
        done.end?.();
      }
    }
  }

  private place(p: Pt) {
    const { point, trail } = this.getEls();
    if (!point) return;
    if (!this.visible) {
      this.visible = true;
      point.style.opacity = '1';
      this.hist = [];
    }
    point.setAttribute('transform', `translate(${p.x.toFixed(2)},${p.y.toFixed(2)})`);
    this.hist.push(p);
    if (this.hist.length > TRAIL * 4) this.hist.shift();
    trail.forEach((c, i) => {
      if (!c) return;
      const q = this.hist[this.hist.length - 1 - (i + 1) * 3];
      if (!q) c.setAttribute('opacity', '0');
      else {
        c.setAttribute('cx', q.x.toFixed(2));
        c.setAttribute('cy', q.y.toFixed(2));
        c.setAttribute('opacity', (0.32 * (1 - i / TRAIL)).toFixed(3));
      }
    });
  }

  private hide() {
    const { point, trail } = this.getEls();
    this.visible = false;
    if (point) point.style.opacity = '0';
    trail.forEach((c) => c?.setAttribute('opacity', '0'));
  }

  private plan() {
    if (this.next < 50) return this.planCollect();
    return this.planReplay();
  }

  private reveal(idx: number) {
    this.proto.snapshot(idx + 1);
    this.ui.onReveal(idx + 1);
  }

  private pushEpisode(ep: Episode, stepMs: number, restMs: number, collecting: boolean, after: () => void) {
    this.queue.push({ dur: 260, start: () => this.place(this.getGeom().nodes.start) });
    ep.steps.forEach((s, i) => {
      const orbit = s.to === s.from;
      this.queue.push({
        dur: stepMs * (orbit ? 1.15 : 1),
        start: () =>
          this.ui.onStep({ turn: i + 1, action: s.action, obs: s.obs, stuck: orbit || s.failed }, motionKey(s), orbit),
        frame: (u) => this.place(pointAt(this.getGeom(), s, u)),
        end: () => this.ui.onStepEnd(motionKey(s), collecting),
      });
    });
    const lastStep = ep.steps[ep.steps.length - 1];
    const reached = !!lastStep && lastStep.to === 'success';
    const exhausted = !ep.terminal;
    this.queue.push({
      dur: restMs,
      start: () => this.ui.onEpisodeEnd(reached, exhausted),
      end: () => {
        this.hide();
        after();
      },
    });
  }

  private planCollect() {
    const idx = this.next++;
    const ep = this.proto.episodes[this.seedIdx][idx];
    if (ep.task.family !== 'stoch_gate') {
      // the other three families run offstage; they still feed the tables
      this.queue.push({ dur: 150, end: () => this.reveal(idx) });
      return;
    }
    const j = this.gateSeen++;
    const stepMs = Math.max(170, 780 * Math.pow(0.8, j));
    const restMs = j < 3 ? 900 : 480;
    this.pushEpisode(ep, stepMs, restMs, true, () => this.reveal(idx));
  }

  private planReplay() {
    if (!this.replays) {
      this.replays = this.proto.replay(this.seedIdx, this.scorer);
      this.replayIdx = 0;
      this.queue.push({ dur: 700, start: () => this.ui.onIdle() });
    }
    const eps = this.replays;
    const i = this.replayIdx;
    this.replayIdx = (this.replayIdx + 1) % eps.length;
    this.queue.push({ dur: 10, start: () => this.ui.onReplay(i, eps.length) });
    this.pushEpisode(eps[i], 470, 1300, false, () => {});
  }
}
