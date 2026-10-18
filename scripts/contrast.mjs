// Proves the time-of-day theme stays legible everywhere along the slider.
// Run: node --experimental-strip-types scripts/contrast.mjs [positions]
// Samples the spectrum at N evenly spaced positions (default 101, plus every
// stop and both sides of the sunset seam) and checks each text token against
// the page background and the panel. Exits non-zero if any falls short.
import { STOPS, SUNSET, clockAt, contrast, paletteAt, rgbToHex } from '../src/palette.ts';

const N = Number(process.argv[2] ?? 101);
// body text and the accent (used for small labels) need AA, 4.5:1. faint is
// tertiary text (hints, dates, metadata) and is held to 3:1.
const RULES = { bone: 4.5, dim: 4.5, phos: 4.5, ice: 4.5, faint: 3 };

const ps = new Set();
for (let i = 0; i < N; i++) ps.add(i / (N - 1));
for (const s of STOPS) ps.add(s.at);
ps.add(SUNSET - 1e-9);
const positions = [...ps].sort((a, b) => a - b);

const min = {};
let fails = 0;
for (const p of positions) {
  const { colors } = paletteAt(p);
  for (const [k, need] of Object.entries(RULES)) {
    for (const bg of ['void', 'panel']) {
      const c = contrast(colors[k], colors[bg]);
      const key = `${k} on ${bg}`;
      if (!min[key] || c < min[key].c) min[key] = { c, p };
      if (c < need) {
        fails++;
        console.log(`FAIL ${key} ${c.toFixed(2)} < ${need} at p=${p.toFixed(3)} (${clockAt(p)}) ${rgbToHex(colors[k])} on ${rgbToHex(colors[bg])}`);
      }
    }
  }
}

console.log(`${positions.length} positions checked`);
for (const [key, { c, p }] of Object.entries(min)) console.log(`${key.padEnd(16)} min ${c.toFixed(2)} at p=${p.toFixed(3)} (${clockAt(p)})`);
console.log('\nstops:');
for (const s of STOPS) {
  const { colors } = paletteAt(s.at === SUNSET && s.name !== 'sunset' ? s.at - 1e-9 : s.at);
  const row = Object.keys(RULES).map((k) => `${k} ${contrast(colors[k], colors.void).toFixed(2)}`);
  console.log(`${s.name.padEnd(11)} ${clockAt(s.at)} bg ${rgbToHex(colors.void)}  ${row.join('  ')}`);
}
if (fails) {
  console.log(`\n${fails} failures`);
  process.exit(1);
}
