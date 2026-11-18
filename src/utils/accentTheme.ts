import type { AccentColorKey } from '../data/types';

export interface AccentClasses {
  key: AccentColorKey;
  label: string;
  swatchHex: string;
  primaryButton: string;
  hoverBg: string;
  textAccent: string;
}

export const ACCENT_THEMES: Record<AccentColorKey, AccentClasses> = {
  crimson: {
    key: 'crimson',
    label: 'Crimson Red',
    swatchHex: '#dc2626',
    primaryButton: 'bg-red-600 hover:bg-red-700 text-white',
    hoverBg: 'hover:bg-red-600',
    textAccent: 'text-red-600 hover:text-red-700',
  },
  cobalt: {
    key: 'cobalt',
    label: 'Cobalt Blue',
    swatchHex: '#2563eb',
    primaryButton: 'bg-blue-600 hover:bg-blue-700 text-white',
    hoverBg: 'hover:bg-blue-600',
    textAccent: 'text-blue-600 hover:text-blue-700',
  },
  emerald: {
    key: 'emerald',
    label: 'Emerald Green',
    swatchHex: '#059669',
    primaryButton: 'bg-emerald-600 hover:bg-emerald-700 text-white',
    hoverBg: 'hover:bg-emerald-600',
    textAccent: 'text-emerald-600 hover:text-emerald-700',
  },
  amber: {
    key: 'amber',
    label: 'Gold Amber',
    swatchHex: '#d97706',
    primaryButton: 'bg-amber-600 hover:bg-amber-700 text-white',
    hoverBg: 'hover:bg-amber-600',
    textAccent: 'text-amber-600 hover:text-amber-700',
  },
  ink: {
    key: 'ink',
    label: 'Obsidian Ink',
    swatchHex: '#09090b',
    primaryButton: 'bg-zinc-950 hover:bg-zinc-800 text-white',
    hoverBg: 'hover:bg-zinc-800',
    textAccent: 'text-zinc-950 hover:text-zinc-700',
  },
};

export function getAccentTheme(key?: AccentColorKey): AccentClasses {
  if (key && ACCENT_THEMES[key]) return ACCENT_THEMES[key];
  return ACCENT_THEMES.crimson;
}
