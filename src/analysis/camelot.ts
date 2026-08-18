const LETTER_ORDER = ['A', 'B'] as const;

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
