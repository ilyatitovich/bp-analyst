const LETTER_ORDER = ['A', 'B'] as const;

export const CAMELOT_KEYS = [
  '1A',
  '2A',
  '3A',
  '4A',
  '5A',
  '6A',
  '7A',
  '8A',
  '9A',
  '10A',
  '11A',
  '12A',
  '1B',
  '2B',
  '3B',
  '4B',
  '5B',
  '6B',
  '7B',
  '8B',
  '9B',
  '10B',
  '11B',
  '12B',
] as const;

export type CamelotKey = (typeof CAMELOT_KEYS)[number];

/** Beatport-style scale labels (min/maj) in Camelot wheel order. */
export const CAMELOT_TO_SCALE: Record<CamelotKey, string> = {
  '1A': 'G# min',
  '2A': 'Eb min',
  '3A': 'Bb min',
  '4A': 'F min',
  '5A': 'C min',
  '6A': 'G min',
  '7A': 'D min',
  '8A': 'A min',
  '9A': 'E min',
  '10A': 'B min',
  '11A': 'F# min',
  '12A': 'C# min',
  '1B': 'B maj',
  '2B': 'F# maj',
  '3B': 'C# maj',
  '4B': 'Ab maj',
  '5B': 'Eb maj',
  '6B': 'Bb maj',
  '7B': 'F maj',
  '8B': 'C maj',
  '9B': 'G maj',
  '10B': 'D maj',
  '11B': 'A maj',
  '12B': 'E maj',
};

const SCALE_TO_CAMELOT: Record<string, CamelotKey> = {
  'g# min': '1A',
  'ab min': '1A',
  'eb min': '2A',
  'd# min': '2A',
  'bb min': '3A',
  'a# min': '3A',
  'f min': '4A',
  'c min': '5A',
  'g min': '6A',
  'd min': '7A',
  'a min': '8A',
  'e min': '9A',
  'b min': '10A',
  'f# min': '11A',
  'gb min': '11A',
  'c# min': '12A',
  'db min': '12A',
  'b maj': '1B',
  'cb maj': '1B',
  'f# maj': '2B',
  'gb maj': '2B',
  'c# maj': '3B',
  'db maj': '3B',
  'ab maj': '4B',
  'g# maj': '4B',
  'eb maj': '5B',
  'd# maj': '5B',
  'bb maj': '6B',
  'a# maj': '6B',
  'f maj': '7B',
  'c maj': '8B',
  'g maj': '9B',
  'd maj': '10B',
  'a maj': '11B',
  'e maj': '12B',
};

function normalizeAccidental(value: string): string {
  return value.replaceAll('♯', '#').replaceAll('♭', 'b').replaceAll('×', 'x');
}

export function parseScaleName(keyName: string | null | undefined): string | null {
  if (!keyName) return null;
  const normalized = normalizeAccidental(keyName).trim().toLowerCase().replace(/\s+/g, ' ');
  const match = normalized.match(/^([a-g](?:#|b)?)\s*(maj(?:or)?|min(?:or)?)$/i);
  if (!match) return null;
  const tonic = `${match[1][0].toUpperCase()}${match[1].slice(1)}`;
  const quality = match[2].startsWith('maj') ? 'maj' : 'min';
  return `${tonic} ${quality}`;
}

export function scaleToCamelot(keyName: string | null | undefined): CamelotKey | null {
  const parsed = parseScaleName(keyName);
  if (!parsed) return null;
  return SCALE_TO_CAMELOT[parsed.toLowerCase()] ?? null;
}

export function camelotToScale(camelot: string | null | undefined): string | null {
  if (!camelot) return null;
  const key = camelot.toUpperCase() as CamelotKey;
  return CAMELOT_TO_SCALE[key] ?? parseScaleName(camelot);
}

export function isCamelotKey(value: string | null | undefined): value is CamelotKey {
  return Boolean(value && CAMELOT_TO_SCALE[value.toUpperCase() as CamelotKey]);
}

export function resolveCamelot(camelot: string | null | undefined, keyName?: string | null): CamelotKey | null {
  if (camelot && isCamelotKey(camelot)) {
    return camelot.toUpperCase() as CamelotKey;
  }
  return scaleToCamelot(keyName);
}

export function formatTrackKey(
  camelot: string | null | undefined,
  keyName: string | null | undefined,
  notation: 'camelot' | 'scale',
): string | null {
  const resolved = resolveCamelot(camelot, keyName);
  if (notation === 'camelot') return resolved;
  return (resolved ? CAMELOT_TO_SCALE[resolved] : null) ?? parseScaleName(keyName);
}

export function toCamelot(
  camelotNumber: number | null | undefined,
  camelotLetter: string | null | undefined,
): string | null {
  if (!camelotNumber || !camelotLetter) return null;
  const normalizedLetter = camelotLetter.toUpperCase();
  if (!LETTER_ORDER.includes(normalizedLetter as (typeof LETTER_ORDER)[number])) {
    return null;
  }
  return `${camelotNumber}${normalizedLetter}`;
}

export function getCompatibleCamelotKeys(camelot: string | null): string[] {
  if (!camelot) return [];
  const match = camelot.match(/^(\d{1,2})([AB])$/i);
  if (!match) return [];

  const number = Number(match[1]);
  const letter = match[2].toUpperCase() as 'A' | 'B';
  const plus = number === 12 ? 1 : number + 1;
  const minus = number === 1 ? 12 : number - 1;
  const relative = letter === 'A' ? 'B' : 'A';

  return [`${number}${letter}`, `${plus}${letter}`, `${minus}${letter}`, `${number}${relative}`];
}
