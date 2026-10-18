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
  green: '#8fb59a',
} as const;

export const BTN =
  'whitespace-nowrap py-1 transition-colors focus-visible:outline focus-visible:outline-1 focus-visible:outline-offset-2 focus-visible:outline-phos';

/** signed number with an ASCII minus */
export const sgn = (v: number, d = 2) => `${v > 0 ? '+' : v < 0 ? '-' : ''}${Math.abs(v).toFixed(d)}`;

export interface PanelApi {
  step: () => void;
  reset: () => void;
}
