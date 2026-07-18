// Validated light-surface data-viz palette (surface #fcfcfb). Categorical slots
// are assigned in this fixed order, never cycled; sequential is one blue ramp.
// UI chrome colors live in tailwind.config.ts — these are for marks only.

export const series = {
  blue: '#2a78d6', // slot 1 — tickets
  green: '#008300', // slot 2 — transcripts
  magenta: '#e87ba4', // slot 3 — deal losses
  yellow: '#eda100',
  aqua: '#1baf7a',
  orange: '#eb6834',
  violet: '#4a3aa7',
  red: '#e34948',
} as const;

// One hue, light→dark, for magnitude encodings (signal strength, waterfall).
export const blueRamp = {
  s250: '#86b6ef',
  s300: '#6da7ec',
  s350: '#5598e7',
  s400: '#3987e5',
  s450: '#2a78d6',
  s500: '#256abf',
  s550: '#1c5cab',
  s650: '#104281',
} as const;

// Reserved status steps — never reused as series colors.
export const status = {
  good: '#0ca30c',
  warning: '#fab219',
  serious: '#ec835a',
  critical: '#d03b3b',
  goodText: '#006300', // success as text on light surface (contrast-safe)
} as const;

export const ink = {
  primary: '#0b0b0b',
  secondary: '#52514e',
  muted: '#898781',
  grid: '#e1e0d9',
  baseline: '#c3c2b7',
  deemphasis: '#c9c7bf', // context-gray marks in emphasis charts
} as const;

export const sourceTypeColor: Record<'tickets' | 'transcripts' | 'deal_losses', string> = {
  tickets: series.blue,
  transcripts: series.green,
  deal_losses: series.magenta,
};

export const sourceTypeLabel: Record<'tickets' | 'transcripts' | 'deal_losses', string> = {
  tickets: 'Support tickets',
  transcripts: 'Interviews',
  deal_losses: 'Deal losses',
};
