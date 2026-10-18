// The day, as colour. The page runs along one spectrum, from noon (paper white)
// through a rose afternoon and a red dusk to midnight (the original black).
// Every token is defined at a handful of named stops and interpolated in
// OKLab, which is perceptually even, so the middle of a blend never goes grey
// or muddy. Pure maths, no DOM: scripts/contrast.mjs runs it in Node to prove
// every text colour clears WCAG AA against the background at every position.

/** colour tokens, as hex at the stops and as sRGB 0..255 triplets once mixed */
export const COLOR_KEYS = [
  'void', // page background
  'panel', // raised surfaces: hovered rows, the command bar, code
  'line', // hairlines and borders
  'bone', // primary text
  'dim', // secondary text, body copy
  'faint', // tertiary text: hints, metadata
  'phos', // the accent
  'ice', // the cool accent
  'shadow', // what shadows are made of
  'edge', // the hairline around the dark instrument screens
  'scan', // the scanlines
  'sel', // selection background
  'selInk', // selection text
  'diskCool', // the hero's accretion disk, outer and cooler
  'diskHot', // the hero's accretion disk, inner and hotter
  'star', // the hero's stars
] as const;
export type ColorKey = (typeof COLOR_KEYS)[number];

export const NUM_KEYS = [
  'grain', // film grain opacity
  'scanA', // scanline opacity
  'shadowA', // shadow strength
  'edgeA', // opacity of that hairline
  'screenShadowA', // their drop shadow
  'ink', // 0: light on dark (emissive), 1: dark ink on paper
] as const;
export type NumKey = (typeof NUM_KEYS)[number];

export type StopDef = { name: string; at: number } & Record<ColorKey, string> & Record<NumKey, number>;
export type RGB = [number, number, number];
export type Palette = { colors: Record<ColorKey, RGB>; nums: Record<NumKey, number> };

/**
 * Position 0 is noon, 1 is midnight; time of day runs linearly between them.
 * Two stops share a position at sunset: that is the one place the text flips
 * from dark ink to light, and the background drops with it, because no
 * background exists that both dark and light text can read on (WCAG's middle
 * grey is unreadable either way). The flip is crossfaded in time, not space.
 */
export const STOPS: StopDef[] = [
  {
    name: 'noon',
    at: 0,
    void: '#fbf8f4',
    panel: '#f2ede6',
    line: '#e2d9cf',
    bone: '#1c1514',
    dim: '#5a504c',
    faint: '#867b75',
    phos: '#b3301d',
    ice: '#3c4870',
    shadow: '#3b1d16',
    edge: '#3b1d16',
    scan: '#3b1d16',
    sel: '#b3301d',
    selInk: '#fbf8f4',
    diskCool: '#c0391f',
    diskHot: '#1c1514',
    star: '#5a504c',
    grain: 0.035,
    scanA: 0.014,
    shadowA: 0.16,
    edgeA: 0.12,
    screenShadowA: 0.32,
    ink: 1,
  },
  {
    name: 'afternoon',
    at: 0.25,
    void: '#f8e7e3',
    panel: '#f0d9d4',
    line: '#e3c2bc',
    bone: '#2a0e11',
    dim: '#653437',
    faint: '#986264',
    phos: '#a51d29',
    ice: '#414676',
    shadow: '#4a0f14',
    edge: '#4a0f14',
    scan: '#4a0f14',
    sel: '#a51d29',
    selInk: '#f8e7e3',
    diskCool: '#b8222e',
    diskHot: '#2a0e11',
    star: '#653437',
    grain: 0.04,
    scanA: 0.018,
    shadowA: 0.2,
    edgeA: 0.14,
    screenShadowA: 0.38,
    ink: 1,
  },
  {
    name: 'late light',
    at: 0.42,
    void: '#eeb0a6',
    panel: '#e8a69c',
    line: '#d48a80',
    bone: '#260609',
    dim: '#53171c',
    faint: '#7a3035',
    phos: '#760a15',
    ice: '#2e2c5c',
    shadow: '#4a0a10',
    edge: '#4a0a10',
    scan: '#4a0a10',
    sel: '#760a15',
    selInk: '#eeb0a6',
    diskCool: '#8a0f1a',
    diskHot: '#260609',
    star: '#53171c',
    grain: 0.045,
    scanA: 0.02,
    shadowA: 0.24,
    edgeA: 0.2,
    screenShadowA: 0.42,
    ink: 1,
  },
  {
    name: 'sunset',
    at: 0.42,
    void: '#8e1b21',
    panel: '#9a232a',
    line: '#b4474c',
    bone: '#fff2ec',
    dim: '#f7cbc3',
    faint: '#e39a92',
    phos: '#ffd48a',
    ice: '#e2e5ff',
    shadow: '#2a0306',
    edge: '#ffffff',
    scan: '#ffffff',
    sel: '#ffd48a',
    selInk: '#5a0a0f',
    diskCool: '#ff9f72',
    diskHot: '#fff6e8',
    star: '#ffd9cf',
    grain: 0.05,
    scanA: 0.022,
    shadowA: 0.5,
    edgeA: 0.12,
    screenShadowA: 0.5,
    ink: 0,
  },
  {
    name: 'dusk',
    at: 0.5,
    void: '#6c1217',
    panel: '#7a191f',
    line: '#953539',
    bone: '#fdeee8',
    dim: '#ecbcb5',
    faint: '#c98882',
    phos: '#ffc779',
    ice: '#d8ddf6',
    shadow: '#1e0204',
    edge: '#ffffff',
    scan: '#ffffff',
    sel: '#ffc779',
    selInk: '#4a080c',
    diskCool: '#f08a5c',
    diskHot: '#fff3e2',
    star: '#f3cfc8',
    grain: 0.05,
    scanA: 0.02,
    shadowA: 0.55,
    edgeA: 0.1,
    screenShadowA: 0.55,
    ink: 0,
  },
  {
    name: 'night',
    at: 0.75,
    void: '#250709',
    panel: '#2f0b0e',
    line: '#4a1b1f',
    bone: '#efdcd5',
    dim: '#b98e89',
    faint: '#8a5f5d',
    phos: '#f29a62',
    ice: '#c9cbe3',
    shadow: '#000000',
    edge: '#ffffff',
    scan: '#ffffff',
    sel: '#f29a62',
    selInk: '#250709',
    diskCool: '#d2563a',
    diskHot: '#ffeedd',
    star: '#d9c4c6',
    grain: 0.05,
    scanA: 0.018,
    shadowA: 0.7,
    edgeA: 0.08,
    screenShadowA: 0.6,
    ink: 0,
  },
  {
    // the original site, untouched except faint, lifted to 3:1
    name: 'midnight',
    at: 1,
    void: '#0b0b0a',
    panel: '#121211',
    line: '#252421',
    bone: '#dcd6c8',
    dim: '#8d887c',
    faint: '#64615a',
    phos: '#e8a96a',
    ice: '#c4ccde',
    shadow: '#000000',
    edge: '#ffffff',
    scan: '#ffffff',
    sel: '#e8a96a',
    selInk: '#0b0b0a',
    diskCool: '#c85c28',
    diskHot: '#fff2d7',
    star: '#c4ccde',
    grain: 0.05,
    scanA: 0.018,
    shadowA: 0.8,
    edgeA: 0,
    screenShadowA: 0,
    ink: 0,
  },
];

export const MIDNIGHT = STOPS[STOPS.length - 1];
/** where the text flips from dark ink to light */
export const SUNSET = STOPS.find((s) => s.name === 'sunset')!.at;

// ------------------------------------------------------------------ colour maths
export type Lab = [number, number, number];

const toLin = (c: number) => (c <= 0.04045 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4));
const fromLin = (c: number) => (c <= 0.0031308 ? 12.92 * c : 1.055 * Math.pow(c, 1 / 2.4) - 0.055);

export function hexToRgb(hex: string): RGB {
  const n = parseInt(hex.slice(1), 16);
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
}

export function rgbToHex([r, g, b]: RGB) {
  return '#' + [r, g, b].map((v) => v.toString(16).padStart(2, '0')).join('');
}

/** sRGB 0..255 to OKLab (Björn Ottosson, 2020) */
export function rgbToLab([R, G, B]: RGB): Lab {
  const r = toLin(R / 255);
  const g = toLin(G / 255);
  const b = toLin(B / 255);
  const l = Math.cbrt(0.4122214708 * r + 0.5363325363 * g + 0.0514459929 * b);
  const m = Math.cbrt(0.2119034982 * r + 0.6806995451 * g + 0.1073969566 * b);
  const s = Math.cbrt(0.0883024619 * r + 0.2817188376 * g + 0.6299787005 * b);
  return [
    0.2104542553 * l + 0.793617785 * m - 0.0040720468 * s,
    1.9779984951 * l - 2.428592205 * m + 0.4505937099 * s,
    0.0259040371 * l + 0.7827717662 * m - 0.808675766 * s,
  ];
}

/** OKLab to sRGB 0..255, clipped to the gamut */
export function labToRgb([L, a, b]: Lab): RGB {
  const l = (L + 0.3963377774 * a + 0.2158037573 * b) ** 3;
  const m = (L - 0.1055613458 * a - 0.0638541728 * b) ** 3;
  const s = (L - 0.0894841775 * a - 1.291485548 * b) ** 3;
  const lin = [
    4.0767416621 * l - 3.3077115913 * m + 0.2309699292 * s,
    -1.2684380046 * l + 2.6097574011 * m - 0.3413193965 * s,
    -0.0041960863 * l - 0.7034186147 * m + 1.707614701 * s,
  ];
  return lin.map((c) => Math.round(255 * Math.min(1, Math.max(0, fromLin(Math.min(1, Math.max(0, c))))))) as RGB;
}

/** WCAG 2 relative luminance */
export function luminance([R, G, B]: RGB) {
  return 0.2126 * toLin(R / 255) + 0.7152 * toLin(G / 255) + 0.0722 * toLin(B / 255);
}

export function contrast(a: RGB, b: RGB) {
  const la = luminance(a);
  const lb = luminance(b);
  return (Math.max(la, lb) + 0.05) / (Math.min(la, lb) + 0.05);
}

// ------------------------------------------------------------------ the spectrum
type LabStop = { at: number; labs: Record<ColorKey, Lab>; nums: Record<NumKey, number> };

const LAB_STOPS: LabStop[] = STOPS.map((s) => ({
  at: s.at,
  labs: Object.fromEntries(COLOR_KEYS.map((k) => [k, rgbToLab(hexToRgb(s[k]))])) as Record<ColorKey, Lab>,
  nums: Object.fromEntries(NUM_KEYS.map((k) => [k, s[k]])) as Record<NumKey, number>,
}));

/** The palette at position p (0 noon … 1 midnight), mixed in OKLab. */
export function labsAt(p: number): { labs: Record<ColorKey, Lab>; nums: Record<NumKey, number> } {
  const x = Math.min(1, Math.max(0, p));
  // the last stop at or before x: at the sunset seam the later (dark) stop wins
  let i = 0;
  while (i < LAB_STOPS.length - 1 && LAB_STOPS[i + 1].at <= x) i++;
  const a = LAB_STOPS[i];
  const b = LAB_STOPS[Math.min(i + 1, LAB_STOPS.length - 1)];
  const t = b.at > a.at ? (x - a.at) / (b.at - a.at) : 0;
  return mixLabs(a, b, t);
}

export function mixLabs(
  a: { labs: Record<ColorKey, Lab>; nums: Record<NumKey, number> },
  b: { labs: Record<ColorKey, Lab>; nums: Record<NumKey, number> },
  t: number,
) {
  const labs = {} as Record<ColorKey, Lab>;
  const nums = {} as Record<NumKey, number>;
  for (const k of COLOR_KEYS) {
    const p = a.labs[k];
    const q = b.labs[k];
    labs[k] = [p[0] + (q[0] - p[0]) * t, p[1] + (q[1] - p[1]) * t, p[2] + (q[2] - p[2]) * t];
  }
  for (const k of NUM_KEYS) nums[k] = a.nums[k] + (b.nums[k] - a.nums[k]) * t;
  return { labs, nums };
}

export function toPalette(m: { labs: Record<ColorKey, Lab>; nums: Record<NumKey, number> }): Palette {
  const colors = {} as Record<ColorKey, RGB>;
  for (const k of COLOR_KEYS) colors[k] = labToRgb(m.labs[k]);
  return { colors, nums: m.nums };
}

export const paletteAt = (p: number) => toPalette(labsAt(p));

// ------------------------------------------------------------------ time of day
/** minutes past midnight at position p: noon (720) to midnight (1440) */
export const minutesAt = (p: number) => 720 + Math.min(1, Math.max(0, p)) * 720;
export const positionAt = (minutes: number) => Math.min(1, Math.max(0, (minutes - 720) / 720));

export function clockAt(p: number) {
  const m = Math.round(minutesAt(p)) % 1440;
  return `${String(Math.floor(m / 60)).padStart(2, '0')}:${String(m % 60).padStart(2, '0')}`;
}

/** the name of the stretch of day at p */
export function partOfDay(p: number) {
  if (p < 0.12) return 'noon';
  if (p < 0.34) return 'afternoon';
  if (p < SUNSET) return 'late light';
  if (p < 0.6) return 'dusk';
  if (p < 0.9) return 'night';
  return 'midnight';
}
