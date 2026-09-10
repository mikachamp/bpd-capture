const UNSAFE_CHARS = /[/\\:*?"<>|]/g;

/**
 * Normalizes a CE number for use both as the DB unique key and as a filesystem
 * directory name, so the two can never disagree about what a CE number is.
 */
export function normalizeCeNumber(raw: string): string {
  return raw.trim().replace(UNSAFE_CHARS, '').toUpperCase();
}

export function isValidCeNumber(raw: string): boolean {
  return normalizeCeNumber(raw).length > 0;
}
