export const C = {
  void: '#0b0b0a',
  panel: '#121211',
  line: '#252421',
  bone: '#dcd6c8',
  dim: '#8d887c',
  faint: '#58554e',
  phos: '#e8a96a',
  ice: '#c4ccde',
  red: '#ec5c52',
} as const;

export const MINUS = '−';

export function signed(v: number, digits = 1): string {
  const s = Math.abs(v).toFixed(digits);
  return v < 0 ? `${MINUS}${s}` : s;
}

export type Mode = 'filtered' | 'smoothed';
